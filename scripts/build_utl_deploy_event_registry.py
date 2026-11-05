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
FILE_CROSSWALK = BASE / "PR372_S1_ATTESTATION_FILE_ID_CROSSWALK_172_V01.json"
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

ATTESTATION_FILE_SCHEMA = """
CREATE TABLE s1_attestation_file_candidates (
 file_index_id TEXT PRIMARY KEY,
 github_run_id INTEGER NOT NULL UNIQUE,
 github_run_url TEXT NOT NULL,
 github_run_event TEXT NOT NULL CHECK(github_run_event IN ('push','workflow_dispatch')),
 github_run_conclusion TEXT NOT NULL CHECK(github_run_conclusion IN ('success','failure')),
 github_job_id INTEGER,
 s1_job_id TEXT NOT NULL UNIQUE,
 expected_attestation_path TEXT NOT NULL UNIQUE,
 expected_status_path TEXT NOT NULL UNIQUE,
 expected_schema_v2_attestation_id TEXT NOT NULL UNIQUE,
 native_attestation_id TEXT,
 native_file_sha256 TEXT,
 github_artifact_id INTEGER,
 historic_event_key TEXT REFERENCES production_deploy_event(event_key),
 merge_sha TEXT NOT NULL CHECK(length(merge_sha)=40),
 file_exists_verified INTEGER,
 file_schema_version INTEGER,
 job_terminal_log_verified INTEGER NOT NULL CHECK(job_terminal_log_verified IN (0,1)),
 run_attempt INTEGER,
 CHECK (file_exists_verified IS NULL OR file_exists_verified IN (0,1)),
 CHECK (file_schema_version IS NULL OR file_schema_version IN (1,2)),
 CHECK (github_artifact_id IS NULL OR github_artifact_id>0)
);
CREATE VIEW v_attestation_file_id_to_github_deploy AS
 SELECT a.file_index_id,a.github_run_id,a.github_job_id,a.s1_job_id,
        a.expected_schema_v2_attestation_id,a.native_attestation_id,
        a.expected_attestation_path,a.file_exists_verified,
        a.historic_event_key,e.pr_number,e.ci_main_run_id,
        a.github_run_conclusion,a.job_terminal_log_verified
 FROM s1_attestation_file_candidates a
 LEFT JOIN production_deploy_event e ON e.event_key=a.historic_event_key;
CREATE VIEW v_independently_verified_attestation_files AS
 SELECT * FROM s1_attestation_file_candidates WHERE file_exists_verified=1 AND native_file_sha256 IS NOT NULL;
"""

def register_attestation_file_candidates(db: sqlite3.Connection, historical_ledger: dict) -> dict:
    """Join the 172 GitHub run identities; candidate paths never certify physical files."""
    crosswalk = json.loads(FILE_CROSSWALK.read_text(encoding="utf-8"))
    assert crosswalk["ownerPr"] == 372 and crosswalk["schemaVersion"] == 1
    assert crosswalk["source"]["historicalRegistryBlobSha"] == git_blob_sha(LEDGER)
    entries = crosswalk["entries"]
    assert len(entries) == 172
    db.executescript(ATTESTATION_FILE_SCHEMA)
    seen = set()
    for record in entries:
        run_id = record["githubRunId"]
        sha = record["linkedMergeSha"]
        job = f"mcp-s1-{run_id}-{sha[:12]}"
        assert record["indexId"] == f"S1-ATTESTATION-CANDIDATE-RUN-{run_id}"
        assert record["s1JobId"] == job
        assert record["expectedAttestationIdIfSchemaV2"] == "s1-deploy-" + job
        assert record["expectedAttestationPath"] == f"/opt/apps/wealthtech-mcp-deploy/jobs/{job}/attestation.json"
        assert record["expectedStatusPath"] == f"/opt/apps/wealthtech-mcp-deploy/jobs/{job}/status.state"
        assert record["nativeAttestationIdReadFromFile"] is None
        assert record["s1FileExistsIndependentlyVerified"] is None
        assert record["nativeFileContentSha256"] is None
        assert record["githubActionsArtifactId"] is None
        assert record["githubRunConclusion"] in ("success", "failure")
        assert record["githubRunEvent"] in ("push", "workflow_dispatch")
        assert run_id not in seen
        seen.add(run_id)
        event_key = record["historicRegistryEventKey"]
        if event_key is None:
            assert run_id == 31655087215 and record["githubRunEvent"] == "workflow_dispatch"
            assert record["githubRunConclusion"] == "success" and record["linkedHistoricalPrNumber"] is None
        else:
            assert record["githubRunEvent"] == "push"
            match = db.execute("SELECT pr_number,merged_sha,deploy_run_id FROM production_deploy_event WHERE event_key=?", (event_key,)).fetchone()
            assert match is not None and match == (record["linkedHistoricalPrNumber"], sha, run_id)
        db.execute("""INSERT INTO s1_attestation_file_candidates
           (file_index_id,github_run_id,github_run_url,github_run_event,github_run_conclusion,
            github_job_id,s1_job_id,expected_attestation_path,expected_status_path,
            expected_schema_v2_attestation_id,native_attestation_id,native_file_sha256,
            github_artifact_id,historic_event_key,merge_sha,file_exists_verified,
            file_schema_version,job_terminal_log_verified,run_attempt)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
           (record["indexId"],run_id,record["githubRunUrl"],record["githubRunEvent"],
            record["githubRunConclusion"],record["githubJobId"],job,
            record["expectedAttestationPath"],record["expectedStatusPath"],
            record["expectedAttestationIdIfSchemaV2"],None,None,None,
            event_key,sha,None,None,int(record["githubWorkflowTerminalLogVerified"]),
            record["githubRunAttempt"]))
    actual = {
      "github_runs": scalar(db, "SELECT COUNT(*) FROM s1_attestation_file_candidates"),
      "push": scalar(db, "SELECT COUNT(*) FROM s1_attestation_file_candidates WHERE github_run_event='push'"),
      "manual": scalar(db, "SELECT COUNT(*) FROM s1_attestation_file_candidates WHERE github_run_event='workflow_dispatch'"),
      "success": scalar(db, "SELECT COUNT(*) FROM s1_attestation_file_candidates WHERE github_run_conclusion='success'"),
      "failure": scalar(db, "SELECT COUNT(*) FROM s1_attestation_file_candidates WHERE github_run_conclusion='failure'"),
      "server_log_terminal_verified": scalar(db, "SELECT COUNT(*) FROM s1_attestation_file_candidates WHERE job_terminal_log_verified=1"),
      "files_physically_verified": scalar(db, "SELECT COUNT(*) FROM v_independently_verified_attestation_files"),
      "source_archive_join_count": scalar(db, "SELECT COUNT(*) FROM s1_attestation_file_candidates WHERE historic_event_key IS NOT NULL")
    }
    expected = {"github_runs":172,"push":171,"manual":1,"success":166,"failure":6,
                "server_log_terminal_verified":8,"files_physically_verified":0,"source_archive_join_count":171}
    assert actual == expected, f"Run / attestation path crosswalk mismatch: {actual}"
    return actual

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
    file_index_counts = register_attestation_file_candidates(db, ledger)
    assert db.execute("PRAGMA integrity_check").fetchone()[0] == "ok"
    assert db.execute("PRAGMA foreign_key_check").fetchall() == []
    db.commit()  # close the source transaction before sqlite3.Connection.backup()
    return db, {"schemaVersion": 1, "sourceBlobSha": ledger["source"]["blobSha"],
                "observed": observed,
                "s1AttestationFileCandidateIndex": file_index_counts,
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
