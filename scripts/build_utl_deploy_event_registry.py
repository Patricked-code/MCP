#!/usr/bin/env python3
"""PR372: validate/build the archived MCP deployment event register offline.

This is an analytical SQLite export, not an MCP runtime registry or deployment.
PR371 source snapshots are immutable. No network, SSH, GitHub API or tokens.
"""
from __future__ import annotations
import argparse
import hashlib
import json
import sqlite3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / "docs/audits/utl-reconciliation"
ARCHIVE = BASE / "sources/PR371_MERGED_PRS_20261103.sql"
LEDGER = BASE / "PR372_DEPLOYMENT_EVENT_REGISTRY_V01.json"
REQUIRED = {"merged": 186, "deploy": 171, "success": 165, "failure": 6,
            "verified_logs": 7, "missing": 15}
SCHEMA = """
CREATE TABLE production_deploy_event (
 event_key TEXT PRIMARY KEY,
 pr_number INTEGER NOT NULL REFERENCES merged_prs(pr_number),
 deploy_run_id INTEGER NOT NULL UNIQUE,
 deploy_workflow_conclusion TEXT NOT NULL CHECK(deploy_workflow_conclusion IN ('success','failure')),
 merged_sha TEXT NOT NULL CHECK(length(merged_sha)=40),
 ci_main_run_id INTEGER,
 github_job_id INTEGER,
 server_job_id TEXT,
 evidence_class TEXT NOT NULL,
 attested_at_utc TEXT,
 native_attestation_id TEXT,
 production_modification_proven INTEGER NOT NULL CHECK(production_modification_proven IN (0,1)),
 run_attempt INTEGER,
 source_blob_sha TEXT NOT NULL
);
CREATE INDEX idx_deploy_merged_sha ON production_deploy_event(merged_sha);
CREATE INDEX idx_deploy_pr ON production_deploy_event(pr_number);
CREATE VIEW v_deploy_workflow_success AS SELECT * FROM production_deploy_event
 WHERE deploy_workflow_conclusion='success';
CREATE VIEW v_deploy_terminal_log_correlated AS SELECT * FROM production_deploy_event
 WHERE evidence_class='GITHUB_JOB_LOG_TERMINAL_ATTESTED_NOT_INDEPENDENT_S1_RECHECK';
CREATE VIEW v_production_modification_independently_proven AS
 SELECT * FROM production_deploy_event WHERE production_modification_proven=1;
"""

def git_blob_sha(path: Path) -> str:
    content = path.read_bytes()
    return hashlib.sha1(b"blob " + str(len(content)).encode() + b"\0" + content).hexdigest()

def scalar(db: sqlite3.Connection, query: str) -> int:
    return int(db.execute(query).fetchone()[0])

def build() -> tuple[sqlite3.Connection, dict]:
    ledger = json.loads(LEDGER.read_text(encoding="utf-8"))
    assert ledger["schemaVersion"] == 1 and ledger["ownerPr"] == 372
    assert ledger["source"]["blobSha"] == git_blob_sha(ARCHIVE), "Frozen source SHA changed"
    events = ledger["events"]
    assert len(events) == REQUIRED["deploy"]
    db = sqlite3.connect(":memory:")
    db.execute("PRAGMA foreign_keys=ON")
    db.executescript(ARCHIVE.read_text(encoding="utf-8"))
    db.executescript(SCHEMA)
    assert scalar(db, "SELECT COUNT(*) FROM merged_prs") == REQUIRED["merged"]
    assert scalar(db, "SELECT COUNT(*) FROM workflow_evidence WHERE kind='GOVERNED_DEPLOY_MCP'") == REQUIRED["deploy"]
    seen_run_ids = set()
    for item in events:
        run_id = item["deployWorkflowRunId"]
        assert run_id not in seen_run_ids, "Duplicate workflow run ID"
        seen_run_ids.add(run_id)
        row = db.execute("""SELECT p.merge_sha,p.merged_at_utc,ci.run_id,ci.conclusion,
            d.run_id,d.conclusion
            FROM merged_prs p
            LEFT JOIN workflow_evidence ci ON ci.pr_number=p.pr_number AND ci.kind='CI_MAIN'
            JOIN workflow_evidence d ON d.pr_number=p.pr_number AND d.kind='GOVERNED_DEPLOY_MCP'
            WHERE p.pr_number=?""", (item["prNumber"],)).fetchone()
        assert row is not None and list(row) == [
            item["mergeSha"], item["mergedAtUtc"], item["ciMainRunId"],
            item["ciMainConclusion"], item["deployWorkflowRunId"],
            item["deployWorkflowConclusion"]], "Source to event mismatch"
        assert item["eventKey"] == f"LEGACY_PR371_DEPLOY_RUN_{run_id}_ATTEMPT_UNKNOWN"
        assert item["runAttempt"] is None and item["nativeAttestationId"] is None
        assert item["productionModificationProven"] is False
        assert item["independentHistoricalS1Read"] is False
        evidence = item["evidenceClass"]
        if evidence == "GITHUB_JOB_LOG_TERMINAL_ATTESTED_NOT_INDEPENDENT_S1_RECHECK":
            assert item["deployWorkflowConclusion"] == "success"
            assert isinstance(item["githubJobId"], int) and item["githubJobId"] > 0
            assert item["serverJobId"] == f"mcp-s1-{run_id}-{item['mergeSha'][:12]}"
            assert item["terminalLogMessage"] == f"Deployment attested for exact SHA {item['mergeSha']}."
            assert item["jobLogUrl"] and item["serverAttestedAtUtc"]
            assert item["requestedShaFromLog"] == item["mergeSha"]
            assert item["runtimeRevisionFromLog"] == item["mergeSha"]
        else:
            assert item["githubJobId"] is None and item["serverJobId"] is None
            assert evidence == ("GITHUB_WORKFLOW_SUCCESS_ONLY" if item["deployWorkflowConclusion"] == "success" else "WORKFLOW_NOT_SUCCESS")
        db.execute("""INSERT INTO production_deploy_event
         (event_key,pr_number,deploy_run_id,deploy_workflow_conclusion,merged_sha,
          ci_main_run_id,github_job_id,server_job_id,evidence_class,attested_at_utc,
          native_attestation_id,production_modification_proven,run_attempt,source_blob_sha)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
        (item["eventKey"],item["prNumber"],run_id,item["deployWorkflowConclusion"],
         item["mergeSha"],item["ciMainRunId"],item["githubJobId"],item["serverJobId"],
         evidence,item["serverAttestedAtUtc"],None,0,None,ledger["source"]["blobSha"]))
    observed = {
      "merged": scalar(db, "SELECT COUNT(*) FROM merged_prs"),
      "deploy": scalar(db, "SELECT COUNT(*) FROM production_deploy_event"),
      "success": scalar(db, "SELECT COUNT(*) FROM v_deploy_workflow_success"),
      "failure": scalar(db, "SELECT COUNT(*) FROM production_deploy_event WHERE deploy_workflow_conclusion='failure'"),
      "verified_logs": scalar(db, "SELECT COUNT(*) FROM v_deploy_terminal_log_correlated"),
      "missing": scalar(db, """SELECT COUNT(*) FROM merged_prs p WHERE NOT EXISTS
                   (SELECT 1 FROM production_deploy_event d WHERE d.pr_number=p.pr_number)""")
    }
    assert observed == REQUIRED, f"Counts drift: {observed}"
    assert sorted(ledger["missingDeployObservationForMergedPRs"]) == [
      row[0] for row in db.execute("""SELECT p.pr_number FROM merged_prs p
       WHERE NOT EXISTS(SELECT 1 FROM production_deploy_event d WHERE d.pr_number=p.pr_number)
       ORDER BY p.pr_number""")]
    assert scalar(db, "SELECT COUNT(*) FROM v_production_modification_independently_proven") == 0
    assert db.execute("PRAGMA integrity_check").fetchone()[0] == "ok"
    assert db.execute("PRAGMA foreign_key_check").fetchall() == []
    db.commit()  # close the source transaction before sqlite3.Connection.backup()
    return db, {"schemaVersion": 1, "sourceBlobSha": ledger["source"]["blobSha"],
                "observed": observed,
                "proofStatus": "7_GITHUB_JOB_TERMINAL_LOGS_NOT_INDEPENDENT_S1",
                "attestedProductionChanges": 0,
                "scope": "S1_MCP_ARCHIVED_WORKFLOW_RUNS_ONLY"}

def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", type=Path, required=True)
    parser.add_argument("--report", type=Path, required=True)
    args = parser.parse_args()
    if args.out.exists() or args.report.exists():
        raise FileExistsError("Refuse to overwrite existing analytical output")
    db, report = build()
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.report.parent.mkdir(parents=True, exist_ok=True)
    try:
        output = sqlite3.connect(args.out)
        db.backup(output)
        output.close()
        args.report.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    finally:
        db.close()
    print(json.dumps(report, indent=2))

if __name__ == "__main__":
    main()
