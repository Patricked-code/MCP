#!/usr/bin/env python3
"""Append five more strictly corroborated GitHub→S1 attestations to PR372.

Runs only on the existing historical evidence SQLite already enriched by
the original v03 two-record attacher. Does not overwrite previous records,
poll production, create UTLs, grant runtime permission or update Task Queue.
"""
from __future__ import annotations
import argparse,json,sqlite3
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/"docs/audits/utl-reconciliation/utl_v03_verified_workflow_attestations_P02.json"
EXPECTED={259,260,263,360,367}

def append(db_path:Path,report_path:Path|None=None):
    data=json.loads(SOURCE.read_text(encoding="utf-8"))
    cases=data.get("attestations",[])
    if data.get("schemaVersion")!=1 or len(cases)!=5 or {x["pr_number"] for x in cases}!=EXPECTED:
        raise ValueError("Unexpected P02 witness set")
    db=sqlite3.connect(str(db_path))
    db.row_factory=sqlite3.Row;db.execute("PRAGMA foreign_keys=ON")
    try:
        old=list(db.execute("SELECT pr_number FROM utl_v03_workflow_server_attestations ORDER BY pr_number"))
        if [x[0] for x in old]!=[261,365]:
            raise ValueError("Original two attested witnesses must be preserved before P02")
        for item in cases:
            pr=item["pr_number"];sha=item["main_sha"]
            info=db.execute("SELECT merge_sha FROM merged_prs WHERE pr_number=?",(pr,)).fetchone()
            if not info or info["merge_sha"]!=sha or len(sha)!=40:
                raise ValueError(f"PR #{pr} does not have the exact merge SHA in archived main")
            rows={x["kind"]:x for x in db.execute("SELECT kind,run_id,conclusion FROM workflow_evidence WHERE pr_number=?",(pr,))}
            if any(kind not in rows or rows[kind]["run_id"]!=item[key] or rows[kind]["conclusion"]!="success"
                   for kind,key in [("CI_MAIN","ci_main_run_id"),("GOVERNED_DEPLOY_MCP","deploy_workflow_run_id")]):
                raise ValueError(f"PR #{pr} CI/deploy reference mismatch")
            run=item["deploy_workflow_run_id"]
            if item["server_job_id"]!=f"mcp-s1-{run}-{sha[:12]}" or item["admission_kind"]!="push_ci_gate":
                raise ValueError("Exact-SHA S1 job correlation failed")
            if item["attestation_phrase"]!=f"Deployment attested for exact SHA {sha}.":
                raise ValueError("Attestation phrase must be exact GitHub log result")
            if item["log_url"]!=f"https://github.com/Patricked-code/MCP/actions/runs/{run}/job/{item['github_job_id']}":
                raise ValueError("GitHub workflow provenance URL mismatch")
            if item["accepted_at_utc"]>=item["attested_at_utc"]:
                raise ValueError("Impossible historical attestation order")
            if db.execute("""SELECT COUNT(*) FROM utl_v03_witness_prs
                  WHERE witness_id=? AND pr_number=?""",(item["witness_id"],pr)).fetchone()[0]!=1:
                raise ValueError("Witness continuity parent missing")
        with db:
            for item in cases:
                db.execute("""INSERT INTO utl_v03_workflow_server_attestations
                 (witness_id,pr_number,main_sha,ci_main_run_id,deploy_workflow_run_id,
                 github_job_id,server_job_id,admission_kind,accepted_at_utc,attested_at_utc,
                 attestation_phrase,workflow_log_url,provenance_class)
                 VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                 (item["witness_id"],item["pr_number"],item["main_sha"],
                  item["ci_main_run_id"],item["deploy_workflow_run_id"],item["github_job_id"],
                  item["server_job_id"],item["admission_kind"],item["accepted_at_utc"],
                  item["attested_at_utc"],item["attestation_phrase"],item["log_url"],
                  data["provenanceClass"]))
        entries=list(db.execute("""SELECT pr_number, strongest_historical_runtime_proof
             FROM v_utl_v03_historical_runtime_correlated ORDER BY pr_number"""))
        if len(entries)!=7 or [x["pr_number"] for x in entries]!=[259,260,261,263,360,365,367]:
            raise ValueError("Correlated witness graph is incomplete")
        if any(row["strongest_historical_runtime_proof"]!="WORKFLOW_S1_STATUS_ATTESTED" for row in entries):
            raise ValueError("Unexpected evidence downgrade for historical witness")
        if db.execute("PRAGMA foreign_key_check").fetchall() or db.execute("PRAGMA integrity_check").fetchone()[0]!="ok":
            raise ValueError("Relational evidence integrity failure")
        report={"pr":372,"source":str(SOURCE.relative_to(ROOT)),
            "prior_records_preserved":[261,365],"added_records":sorted(EXPECTED),
            "total_historical_witness_deployment_attestations":7,
            "canonical_utl_instances_created":0,"independent_s1_history_rechecks":0,
            "runtime_claim":"WORKFLOW_S1_STATUS_ATTESTED_NOT_INDEPENDENT_RUNTIME_RECHECK",
            "sqlite_integrity":"ok"}
        if report_path:
            report_path.parent.mkdir(parents=True,exist_ok=True)
            report_path.write_text(json.dumps(report,indent=2,ensure_ascii=False)+"\n",encoding="utf-8")
        return report
    finally:db.close()

if __name__=="__main__":
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--db",type=Path,required=True)
    parser.add_argument("--report",type=Path,required=True)
    args=parser.parse_args()
    print(json.dumps(append(args.db,args.report),indent=2,ensure_ascii=False))
