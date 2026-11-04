#!/usr/bin/env python3
"""Build an offline, provenance-pinned MCP UTL reconciliation SQLite evidence read model.

Only files checked into this branch are read; no API, server, token or runtime
authority is used. It deliberately does NOT create MCP Task Queue / sessions.
"""
from __future__ import annotations
import argparse
import csv
import hashlib
import json
import re
import sqlite3
from pathlib import Path
from datetime import datetime, timezone

ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = ROOT / "docs/audits/utl-reconciliation"
MANIFEST = SOURCE_DIR / "source_manifest_and_links.json"
SCHEMA = SOURCE_DIR / "utl_reconciliation_schema.sql"
SOURCE_SQL = ("PR371_MERGED_PRS_20261103.sql", "PR371_MAIN_COMMITS_P01.sql", "PR371_MAIN_COMMITS_P02.sql")
REQUIRED_PR_COUNTS = {"merged": 186, "main_commits": 2151, "ci": 185, "deploy": 171, "ci_success": 185, "deploy_success": 165}
PATTERN = re.compile(r"\b(?:TB-[A-Z0-9]+(?:-[A-Z0-9]+){1,5}|TASK-\d{8}-\d{3,}|GD-U-[A-Z0-9-]{2,}|PILOT-E2-01)\b", re.IGNORECASE)

def scalar(db: sqlite3.Connection, statement: str):
    return db.execute(statement).fetchone()[0]

def git_blob_sha(path: Path):
    raw = path.read_bytes()
    return hashlib.sha1(b"blob " + str(len(raw)).encode() + b"\0" + raw).hexdigest()

def validate_sources(seed: dict):
    expected = {s["source_id"]: s for s in seed["source_documents"]}
    if len(expected) != 5 or len(seed["source_documents"]) != 5:
        raise ValueError("Expected five distinct source files")
    for entry in expected.values():
        path = ROOT / entry["local_path"]
        if not path.resolve().is_relative_to(SOURCE_DIR.resolve()):
            raise ValueError("Source must be under docs/audits/utl-reconciliation")
        digest = git_blob_sha(path)
        if digest != entry["git_blob_sha"]:
            raise ValueError(f"Source blob SHA mismatch: {path} (got {digest})")
    return expected

def verify_history(db: sqlite3.Connection, manifest: dict):
    expected_counts = {
        "merged": scalar(db, "SELECT COUNT(*) FROM merged_prs"),
        "main_commits": scalar(db, "SELECT COUNT(*) FROM main_commits"),
        "ci": scalar(db, "SELECT COUNT(*) FROM workflow_evidence WHERE kind='CI_MAIN'"),
        "deploy": scalar(db, "SELECT COUNT(*) FROM workflow_evidence WHERE kind='GOVERNED_DEPLOY_MCP'"),
        "ci_success": scalar(db, "SELECT COUNT(*) FROM workflow_evidence WHERE kind='CI_MAIN' AND lower(conclusion)='success'"),
        "deploy_success": scalar(db, "SELECT COUNT(*) FROM workflow_evidence WHERE kind='GOVERNED_DEPLOY_MCP' AND lower(conclusion)='success'"),
    }
    if expected_counts != REQUIRED_PR_COUNTS:
        raise ValueError(f"Historical inventory counts drift: {expected_counts}")
    history_counts = manifest["counts"]
    if history_counts["totalCommits"] != expected_counts["main_commits"] or history_counts["knownMergedPrShas"] != expected_counts["merged"]:
        raise ValueError("Upstream PR371 manifest count mismatch")
    if history_counts["otherMainReachableShasPrAssociationUnknown"] != 1965:
        raise ValueError("Upstream unknown-association commit count drift")
    if scalar(db, "SELECT COUNT(*) FROM main_commits WHERE sha_classification='KNOWN_MERGED_PR_SHA'") != 186:
        raise ValueError("Expected 186 known merged PR commit SHAs")
    if scalar(db, "SELECT COUNT(*) FROM main_commits c JOIN merged_prs p ON c.commit_sha=p.merge_sha AND c.merge_pr_number=p.pr_number") != 186:
        raise ValueError("Missing merge SHA from main commit history")
    if scalar(db, "SELECT COUNT(*) FROM main_commits WHERE sha_classification='OTHER_MAIN_REACHABLE_COMMIT_PR_ASSOCIATION_NOT_VERIFIED'") != 1965:
        raise ValueError("Unknown main-reachable commit classification drift")
    if scalar(db, "SELECT COUNT(*) FROM main_commits WHERE merge_pr_number IS NULL") != 1965:
        raise ValueError("Unexpected commit/PR attribution; do not assume direct commits")
    if scalar(db, "SELECT COUNT(*) FROM (SELECT commit_sha FROM main_commits GROUP BY commit_sha HAVING COUNT(*)>1)") != 0:
        raise ValueError("Duplicate main commit SHA")
    for c in db.execute("SELECT commit_sha,parent_count,parent_sha_list FROM main_commits"):
        parent_list = [x for x in (c["parent_sha_list"] or "").split(";") if x]
        if len(parent_list) != c["parent_count"]:
            raise ValueError(f"Parent-count mismatch for {c['commit_sha']}")
    base_sha = manifest["mainShaAtSnapshot"]
    if scalar(db, "SELECT commit_sha FROM main_commits WHERE history_position_newest_first=1") != base_sha:
        raise ValueError("Main snapshot SHA mismatch")
    return expected_counts

def verify_pr370(db: sqlite3.Connection):
    path = SOURCE_DIR / "sources/PR370_MERGED_PRS_20261103.csv"
    with path.open(newline="", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))
    if len(rows) != 186:
        raise ValueError(f"PR #370 records drift: {len(rows)}")
    for row in rows:
        saved = db.execute("SELECT merge_sha,merged_at_utc,sequence_number FROM merged_prs WHERE pr_number=?", (int(row["pr_number"]),)).fetchone()
        if saved is None or saved["merge_sha"] != row["merge_commit_sha"] or saved["merged_at_utc"] != row["merged_at_utc"] or saved["sequence_number"] != int(row["order"]):
            raise ValueError(f"PR #370 / #371 contradiction for #{row['pr_number']}")
    if len({r["merge_commit_sha"] for r in rows}) != 186:
        raise ValueError("PR370 merged SHA duplicate")

def insert_curated(db: sqlite3.Connection, seed: dict):
    for s in seed["source_documents"]:
        url = f"https://github.com/Patricked-code/MCP/blob/pull/{s['upstream_pr']}/head/{s['original_path']}"
        db.execute("INSERT INTO utl_source_documents VALUES (?,?,?,?,?,?,?)",
          (s["source_id"],s["upstream_pr"],url,s["local_path"],s["git_blob_sha"],s["purpose"],"SOURCE_VERIFIED"))
    for m in seed["mandates"]:
        db.execute("INSERT INTO utl_mandates VALUES (?,?,?,?,?)", (m["mandate_id"],m["mandate_type"],m["label"],m["canonical_issue"],m["evidence_url"]))
    for item in seed["work_items"]:
        db.execute("INSERT INTO utl_work_items VALUES (?,?,?,?,?,?)",
           (item["work_item_id"],item["work_type"],item["label"],item["mandate_id"],item["evidence_url"],item["evidence_level"]))
    for item in seed["circuits"]:
        db.execute("INSERT INTO utl_circuits VALUES (?,?,?,?)",
          (item["circuit_id"],item["entry_profile"],item["description"],item["evidence_url"]))
    for item in seed["item_circuits"]:
        db.execute("INSERT INTO utl_item_circuits VALUES (?,?,?)",
           (item["work_item_id"],item["circuit_id"],item["evidence_url"]))
    for item in seed["continuities"]:
        db.execute("INSERT INTO utl_continuities VALUES (?,?,?,?)",
          (item["continuity_id"],item["root_id"],item["evidence_url"],item["evidence_level"]))
    for item in seed["item_continuities"]:
        db.execute("INSERT INTO utl_item_continuities VALUES (?,?,?)",
          (item["work_item_id"],item["continuity_id"],item["evidence_url"]))
    for link in seed["pr_links"]:
        row = db.execute("SELECT title FROM merged_prs WHERE pr_number=?", (link["pr_number"],)).fetchone()
        if row is None or link["work_item_id"].lower() not in row["title"].lower():
            raise ValueError(f"PR link lacks explicit title anchor for #{link['pr_number']}")
        db.execute("INSERT INTO utl_pr_links VALUES (?,?,?,?,?)",
          (link["pr_number"],link["work_item_id"],link["relation"],link["evidence_url"],link["evidence_level"]))
    observation = seed["runtime_observation"]
    db.execute("INSERT INTO utl_runtime_observations (observed_at,environment,github_main_sha,runtime_sha,alignment,state_version,evidence_origin) VALUES (?,?,?,?,?,?,?)",
      (observation["observed_at"],observation["environment"],observation["github_main_sha"],observation["runtime_sha"],observation["alignment"],observation["state_version"],observation["evidence_origin"]))

def insert_candidates(db: sqlite3.Connection):
    db.executescript("""
    CREATE TABLE IF NOT EXISTS utl_candidate_refs(
      source_kind TEXT NOT NULL CHECK(source_kind IN ('PR_TITLE','COMMIT_TITLE')),
      source_ref TEXT NOT NULL,
      work_item_candidate TEXT NOT NULL,
      verification_status TEXT NOT NULL DEFAULT 'CANDIDATE_ONLY'
        CHECK(verification_status='CANDIDATE_ONLY'),
      PRIMARY KEY(source_kind,source_ref,work_item_candidate)
    );
    """)
    for row in db.execute("SELECT pr_number,title FROM merged_prs").fetchall():
        for identifier in set(m.group().upper() for m in PATTERN.finditer(row["title"])):
            db.execute("INSERT OR IGNORE INTO utl_candidate_refs(source_kind,source_ref,work_item_candidate) VALUES (?,?,?)",
              ("PR_TITLE",str(row["pr_number"]),identifier))
    for row in db.execute("SELECT commit_sha,message_subject FROM main_commits").fetchall():
        for identifier in set(m.group().upper() for m in PATTERN.finditer(row["message_subject"])):
            db.execute("INSERT OR IGNORE INTO utl_candidate_refs(source_kind,source_ref,work_item_candidate) VALUES (?,?,?)",
              ("COMMIT_TITLE",row["commit_sha"],identifier))

def build(output: Path, report_path: Path | None):
    seed = json.loads(MANIFEST.read_text(encoding="utf-8"))
    sources = validate_sources(seed)
    historic_manifest = json.loads((SOURCE_DIR/"sources/PR371_MANIFEST_20261103.json").read_text(encoding="utf-8"))
    if historic_manifest["mainShaAtSnapshot"] != seed["baseline_main_sha"]:
        raise ValueError("Source main baseline changed")
    db = sqlite3.connect(":memory:")
    db.row_factory = sqlite3.Row
    db.execute("PRAGMA foreign_keys=ON")
    try:
        for name in SOURCE_SQL:
            db.executescript((SOURCE_DIR/"sources"/name).read_text(encoding="utf-8"))
        counts = verify_history(db, historic_manifest)
        verify_pr370(db)
        db.executescript(SCHEMA.read_text(encoding="utf-8"))
        with db:
            insert_curated(db,seed)
            insert_candidates(db)
            db.execute("INSERT INTO utl_reconciliation_runs VALUES (?,?,?,?,?,?,?,?)",
                (seed["snapshot_date"],datetime.now(timezone.utc).isoformat(),seed["baseline_main_sha"],counts["merged"],counts["main_commits"],counts["ci"],counts["deploy"],"PASS"))
        foreign_key_issues = db.execute("PRAGMA foreign_key_check").fetchall()
        if foreign_key_issues:
            raise ValueError(f"Foreign key errors: {len(foreign_key_issues)}")
        if scalar(db,"PRAGMA integrity_check") != "ok":
            raise ValueError("SQLite integrity check failed")
        report = {
            "snapshot":seed["snapshot_date"],"main_sha":seed["baseline_main_sha"],
            "source_blobs":{key:s["git_blob_sha"] for key,s in sources.items()},
            "counts":counts,
            "other_main_commits_without_verified_pr_association":1965,
            "curated_work_items":scalar(db,"SELECT COUNT(*) FROM utl_work_items"),
            "verified_pr_work_links":scalar(db,"SELECT COUNT(*) FROM utl_pr_links WHERE evidence_level='SOURCE_DOCUMENTED'"),
            "candidate_reference_mentions":scalar(db,"SELECT COUNT(*) FROM utl_candidate_refs"),
            "unresolved_pr_utl_links":scalar(db,"SELECT COUNT(*) FROM v_utl_evidence_gaps WHERE gap_type='UTL_LINK_UNRESOLVED'"),
            "ci_missing_observations":scalar(db,"SELECT COUNT(*) FROM v_utl_evidence_gaps WHERE gap_type='CI_MAIN_NOT_FOUND'"),
            "deploy_missing_observations":scalar(db,"SELECT COUNT(*) FROM v_utl_evidence_gaps WHERE gap_type='DEPLOY_NOT_FOUND'"),
            "historical_runtime_not_source_attested":scalar(db,"SELECT COUNT(*) FROM v_utl_evidence_gaps WHERE gap_type='HISTORICAL_RUNTIME_NOT_SOURCE_ATTESTED'"),
            "foreign_key_errors":len(foreign_key_issues),"integrity":"ok",
            "notes":["No historical runtime attestation inferred from workflow success.",
                     "No unlabeled main-reachable commit classified as direct push.",
                     "No canonical UTL identity invented; explicit mentions remain candidates unless curated."]
        }
        output.parent.mkdir(parents=True,exist_ok=True)
        if output.exists():
            raise FileExistsError(f"Output exists; refuse overwrite: {output}")
        target = sqlite3.connect(str(output))
        try:
            db.backup(target)
        finally:
            target.close()
        if report_path:
            report_path.parent.mkdir(parents=True,exist_ok=True)
            report_path.write_text(json.dumps(report,indent=2,ensure_ascii=False)+"\n",encoding="utf-8")
        return report
    finally:
        db.close()

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--out",type=Path,default=Path("artifacts/utl-reconciliation.sqlite"))
    parser.add_argument("--report",type=Path,default=Path("artifacts/utl-reconciliation-report.json"))
    args = parser.parse_args()
    print(json.dumps(build(args.out,args.report),indent=2,ensure_ascii=False))

if __name__ == "__main__":
    main()
