#!/usr/bin/env python3
"""Append exact-SHA GitHub Actions attestations to PR372's offline SQLite.

This is a strictly bounded historical evidence projection, not a new server
poll or any live runtime authority. Receipts come from inspected GitHub
Actions deploy job logs and are cross-checked with the frozen PR371 registry.
"""
from __future__ import annotations
import argparse
import json
import re
import sqlite3
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/"docs/audits/utl-reconciliation/utl_v03_verified_workflow_attestations.json"
RUNS={261:(37817792888,37817792904),365:(41170431672,41170431660)}
SHA=re.compile(r"^[0-9a-f]{40}$")

def attach(db_path:Path,report_path:Path|None=None):
    record=json.loads(SOURCE.read_text(encoding="utf-8"))
    if record.get("schemaVersion")!=1 or len(record.get("attestations",[]))!=2:
        raise ValueError("Unexpected source manifest shape")
    if {r["pr_number"] for r in record["attestations"]}!={261,365}:
        raise ValueError("Only two inspected historical workflow witnesses allowed")
    db=sqlite3.connect(str(db_path))
    db.row_factory=sqlite3.Row
    db.execute("PRAGMA foreign_keys=ON")
    try:
        count=db.execute("""SELECT COUNT(*) FROM sqlite_master
           WHERE type='table' AND name='utl_v03_workflow_server_attestations'""").fetchone()[0]
        if count!=1:
            raise ValueError("Apply UTL v03 SQL enrichment before workflow attestation")
        if db.execute("SELECT COUNT(*) FROM utl_v03_workflow_server_attestations").fetchone()[0]:
            raise ValueError("Workflow attestation layer already populated; no silent rewrite")
        for item in record["attestations"]:
            p=item["pr_number"];merge=db.execute("SELECT merge_sha FROM merged_prs WHERE pr_number=?",(p,)).fetchone()
            if merge is None or item["main_sha"]!=merge["merge_sha"] or not SHA.fullmatch(item["main_sha"]):
                raise ValueError(f"PR #{p} SHA differs from archived GitHub merge")
            ci=db.execute("""SELECT run_id,conclusion FROM workflow_evidence
                 WHERE pr_number=? AND kind='CI_MAIN'""",(p,)).fetchone()
            dep=db.execute("""SELECT run_id,conclusion FROM workflow_evidence
                 WHERE pr_number=? AND kind='GOVERNED_DEPLOY_MCP'""",(p,)).fetchone()
            if not ci or not dep or (ci["run_id"],dep["run_id"])!=RUNS[p] or (
                  ci["conclusion"]!="success" or dep["conclusion"]!="success"):
                raise ValueError(f"PR #{p} CI/Deploy proof mismatch")
            if (item["ci_main_run_id"],item["deploy_workflow_run_id"])!=RUNS[p]:
                raise ValueError(f"PR #{p} provenance run IDs mismatch")
            expected_job=f"mcp-s1-{item['deploy_workflow_run_id']}-{item['main_sha'][:12]}"
            if item["server_job_id"]!=expected_job:
                raise ValueError("S1 server job ID not correlated with exact SHA/run")
            if item["attestation_phrase"]!=f"Deployment attested for exact SHA {item['main_sha']}.":
                raise ValueError("Sanitized GitHub workflow attestation phrase mismatch")
            if item["log_url"]!=f"https://github.com/Patricked-code/MCP/actions/runs/{item['deploy_workflow_run_id']}/job/{item['github_job_id']}":
                raise ValueError("GitHub workflow log URL inconsistent")
            if item["accepted_at_utc"]>=item["attested_at_utc"]:
                raise ValueError("Workflow attestation must follow job acceptance")
            edge=db.execute("SELECT COUNT(*) FROM utl_v03_witness_prs WHERE witness_id=? AND pr_number=?",
                            (item["witness_id"],p)).fetchone()[0]
            if edge!=1:
                raise ValueError("Historical attestation has no related witness PR")
        with db:
            for item in record["attestations"]:
                db.execute("""INSERT INTO utl_v03_workflow_server_attestations
                  (witness_id,pr_number,main_sha,ci_main_run_id,deploy_workflow_run_id,
                   github_job_id,server_job_id,admission_kind,accepted_at_utc,
                   attested_at_utc,attestation_phrase,workflow_log_url,provenance_class)
                   VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                   (item["witness_id"],item["pr_number"],item["main_sha"],
                    item["ci_main_run_id"],item["deploy_workflow_run_id"],
                    item["github_job_id"],item["server_job_id"],item["admission_kind"],
                    item["accepted_at_utc"],item["attested_at_utc"],
                    item["attestation_phrase"],item["log_url"],record["provenanceClass"]))
        witnesses=db.execute("""SELECT pr_number,main_sha,server_job_id,
                   workflow_log_url,provenance_class FROM utl_v03_workflow_server_attestations
                   ORDER BY pr_number""").fetchall()
        statuses=db.execute("""SELECT pr_number,strongest_historical_runtime_proof
              FROM v_utl_v03_historical_runtime_correlated
              WHERE pr_number IN (261,365) ORDER BY pr_number""").fetchall()
        if len(witnesses)!=2 or len(statuses)!=2 or any(
            x["strongest_historical_runtime_proof"]!="WORKFLOW_S1_STATUS_ATTESTED" for x in statuses):
            raise ValueError("Workflow attestation graph failed validation")
        foreign=db.execute("PRAGMA foreign_key_check").fetchall()
        if foreign or db.execute("PRAGMA integrity_check").fetchone()[0]!="ok":
            raise ValueError("SQLite evidence graph integrity failure")
        report={
            "pr_number":372,
            "evidence_class":record["provenanceClass"],
            "source_file":str(SOURCE.relative_to(ROOT)),
            "workflow_attested_prs":[x["pr_number"] for x in witnesses],
            "workflow_attested_count":len(witnesses),
            "independent_s1_runtime_rechecks":0,
            "created_canonical_utls":0,
            "foreign_key_errors":0,
            "integrity":"ok",
            "disclaimer":"GitHub job logs observed real S1 status checks and attested exact SHA; they are not new independent S1 observations nor UTL_OUT/T_OUT."
        }
        if report_path:
            report_path.parent.mkdir(parents=True,exist_ok=True)
            report_path.write_text(json.dumps(report,indent=2,ensure_ascii=False)+"\n",encoding="utf-8")
        return report
    finally:
        db.close()

def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("--db",type=Path,required=True)
    p.add_argument("--report",type=Path,required=True)
    x=p.parse_args()
    print(json.dumps(attach(x.db,x.report),indent=2,ensure_ascii=False))

if __name__=="__main__":
    main()
