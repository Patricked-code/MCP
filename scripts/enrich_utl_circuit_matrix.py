#!/usr/bin/env python3
"""PR372 additive UTL v03 enrichment: analytical evidence only; no runtime writes.

Input is the already built offline database from build_utl_reconciliation.py.
No MCP Task Queue, Session, Claim, Lock, GitHub API, server, or deployment
action is performed. Keep pre-existing tables and source snapshots unchanged.
"""
from __future__ import annotations
import argparse
import hashlib
import json
import sqlite3
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
DIR=ROOT/"docs/audits/utl-reconciliation"
MODEL=DIR/"utl_v03_historical_witnesses.json"
SCHEMA=DIR/"utl_circuit_extension_v03.sql"
LOCK=DIR/"PR372_ADDITIVE_CONTINUITY_LOCK.json"
SOURCES={
  "v02":DIR/"reference/MCP_UTL_circuits_matrices_2026-11-03_v02.md",
  "v03":DIR/"reference/MCP_UTL_circuits_matrices_2026-11-03_v03.md"
}
WORKFLOW_RUNS={
  261:(37817792888,37817792904),
  365:(41170431672,41170431660)
}
CONTRACT_ORDER=("T_IN","UTL_PLAN","D_IN","D_OUT","L_IN","L_OUT","UTL_OUT","T_OUT")

def scalar(db,sql,parameters=()):
    return db.execute(sql,parameters).fetchone()[0]

def verify_contracts(model:dict):
    lock=json.loads(LOCK.read_text(encoding="utf-8"))
    if lock["prNumber"]!=372 or lock["headBranch"]!="audit/mcp-historical-merge-traceability-20261103":
        raise ValueError("PR #372 continuity lock invalid")
    if not all(lock["governance"][key] for key in (
        "noNewPrForThisWork","noDeletionOfPriorArtifacts",
        "sourceSnapshotsImmutable","noSecondTaskQueueOrDispatcher",
        "utlRefOnlyFromCanonicalEvidence","externalE2NoFakeInternalTask")):
        raise ValueError("PR372 governance has been weakened")
    for path in lock["baselineChangedPaths"]:
        if not (ROOT/path).is_file():
            raise ValueError("A pre-existing PR372 artifact disappeared: "+path)
    v02=SOURCES["v02"].read_text(encoding="utf-8")
    v03=SOURCES["v03"].read_text(encoding="utf-8")
    if not v03.startswith(v02) or "# Extension V0.3" not in v03:
        raise ValueError("Owner v03 must extend v02 without deleting v02 content")
    if model["contractVersion"]!="V0.3":
        raise ValueError("Unknown UTL contract version")
    if tuple(x[0] for x in model["contract_types"])!=CONTRACT_ORDER:
        raise ValueError("Incomplete T_IN..T_OUT contract list")
    for marker in ("parent_work_ref","utl_ref","D_IN","D_OUT","L_IN","L_OUT",
                   "UTL_OUT","T_OUT","TB-W3-F-03","PR #365"):
        if marker not in v03:
            raise ValueError("Owner contract missing invariant "+marker)
    return lock,{k:{"path":str(v.relative_to(ROOT)),
        "sha256":hashlib.sha256(v.read_bytes()).hexdigest(),
        "lines":len(v.read_text(encoding="utf-8").splitlines())} for k,v in SOURCES.items()}

def validate_blueprint(model):
    current=json.loads((ROOT/"docs/governance/program-backlog-convergence.json").read_text(encoding="utf-8"))
    found=[]
    def walk(node):
        if isinstance(node,dict):
            if node.get("id")=="TB-W3-F-03":
                found.append(node)
            for value in node.values():walk(value)
        elif isinstance(node,list):
            for value in node:walk(value)
    walk(current)
    if len(found)!=1:
        raise ValueError("Canonical blueprint TB-W3-F-03 not uniquely found")
    bp=found[0]
    reference=next(x for x in model["parents"] if x["parent_work_ref"]=="BLUEPRINT-TB-W3-F-03")
    for expected,actual in (("workItemId","work_item_ref"),("waveId","wave_ref"),("lotId","lot_ref")):
        if bp.get(expected)!=reference.get(actual):
            raise ValueError("Canonical backlog mismatch: "+expected)
    if current.get("projectionId")!=reference["program_ref"]:
        raise ValueError("Program projection ID mismatch")

def assert_historical_facts(db,model):
    if scalar(db,"SELECT COUNT(*) FROM merged_prs")!=186:
        raise ValueError("PR #370/#371 baseline count changed")
    if scalar(db,"SELECT COUNT(*) FROM main_commits")!=2151:
        raise ValueError("PR #371 main commit count changed")
    if scalar(db,"SELECT COUNT(*) FROM utl_source_documents")!=5:
        raise ValueError("Frozen source count changed")
    for pr,(expected_ci,expected_deploy) in WORKFLOW_RUNS.items():
        row=db.execute("""
            SELECT m.merge_sha,ci.run_id AS ci_run,dp.run_id AS deploy_run
            FROM merged_prs m
            LEFT JOIN workflow_evidence ci ON ci.pr_number=m.pr_number AND ci.kind='CI_MAIN'
            LEFT JOIN workflow_evidence dp ON dp.pr_number=m.pr_number AND dp.kind='GOVERNED_DEPLOY_MCP'
            WHERE m.pr_number=?""",(pr,)).fetchone()
        if row is None or (row["ci_run"],row["deploy_run"])!=(expected_ci,expected_deploy):
            raise ValueError(f"PR #{pr} workflow corroboration mismatch")
    for witness in model["witnesses"]:
        for entry in witness["pull_requests"]:
            row=db.execute("SELECT title,pr_url FROM merged_prs WHERE pr_number=?",(entry["pr_number"],)).fetchone()
            if row is None or row["pr_url"]!=f"https://github.com/Patricked-code/MCP/pull/{entry['pr_number']}":
                raise ValueError("PR witness not present in frozen source: "+str(entry["pr_number"]))
            if witness["witness_kind"]=="BLUEPRINT_MULTI_INCREMENT" and "TB-W3-F-03" not in row["title"]:
                raise ValueError("Blueprint witness has no canonical PR-title proof")
    for report in model["reported_runtime"]:
        merge_sha=db.execute("SELECT merge_sha FROM merged_prs WHERE pr_number=?",(report["pr_number"],)).fetchone()[0]
        if merge_sha!=report["reported_runtime_sha"]:
            raise ValueError("Owner-reported runtime revision does not match the recorded merge SHA")

def validate_dependency_dag(db):
    edges=list(db.execute("SELECT utl_ref,prerequisite_utl_ref FROM utl_v03_dependencies"))
    graph={}
    for dependent,prerequisite in edges:
        graph.setdefault(dependent,set()).add(prerequisite)
    busy=set();done=set()
    def visit(node):
        if node in busy:
            raise ValueError("UTL dependency cycle")
        if node in done:return
        busy.add(node)
        for nxt in graph.get(node,()):visit(nxt)
        busy.remove(node);done.add(node)
    for key in graph:visit(key)

def enrich(db_path:Path,report_path:Path|None=None):
    if not db_path.is_file():
        raise FileNotFoundError("Build original PR372 SQLite before v03 enrichment")
    model=json.loads(MODEL.read_text(encoding="utf-8"))
    _, source_hashes=verify_contracts(model)
    validate_blueprint(model)
    db=sqlite3.connect(str(db_path))
    db.row_factory=sqlite3.Row
    db.execute("PRAGMA foreign_keys=ON")
    try:
        assert_historical_facts(db,model)
        if scalar(db,"SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='utl_v03_contract_types'"):
            raise ValueError("V03 extension already applied; refuse silent overwrite")
        db.executescript(SCHEMA.read_text(encoding="utf-8"))
        with db:
            for role,entry in source_hashes.items():
                db.execute("INSERT INTO utl_v03_contract_sources VALUES (?,?,?,?,?)",
                    (entry["path"],"MCP_UTL_circuits_matrices_2026-11-03_"+role+"(1).md",
                    entry["sha256"],"PREPARATORY_V02" if role=="v02" else "EXTENSION_V03",entry["lines"]))
            for kind,description in model["contract_types"]:
                db.execute("INSERT INTO utl_v03_contract_types VALUES (?,?,?,?)",
                    (kind,model["documentSourcePath"],description,"PREPARATORY"))
            for parent in model["parents"]:
                db.execute("""INSERT INTO utl_v03_parents
                  (parent_work_ref,work_entry,parent_kind,continuity_id,mandate_ref,program_ref,
                   work_item_ref,wave_ref,lot_ref,blueprint_ref,authority_reference_url,provenance)
                   VALUES (?,?,?,?,?,?,?,?,?,?,?,?)""",
                    tuple(parent.get(k) for k in ("parent_work_ref","work_entry","parent_kind","continuity_id",
                    "mandate_ref","program_ref","work_item_ref","wave_ref","lot_ref","blueprint_ref",
                    "authority_reference_url","provenance")))
            for w in model["witnesses"]:
                db.execute("INSERT INTO utl_v03_historical_witnesses VALUES (?,?,?,?,?,?,?)",
                    tuple(w.get(k) for k in ("witness_id","parent_work_ref","witness_kind","canonical_utl_ref",
                                             "owner_document_path","source_url","evidence_class")))
                for e in w["pull_requests"]:
                    number=e["pr_number"]
                    db.execute("INSERT INTO utl_v03_witness_prs VALUES (?,?,?,?,?)",
                        (w["witness_id"],number,e["relation"],
                         f"https://github.com/Patricked-code/MCP/pull/{number}",e["attribution_level"]))
                    # Supplement existing PR372 analytical work links only when the PR itself
                    # names the exact blueprint. Never infer a canonical UTL from this.
                    if w["witness_kind"]=="BLUEPRINT_MULTI_INCREMENT" and number in (259,260,263):
                        db.execute("""INSERT OR IGNORE INTO utl_pr_links
                            (pr_number,work_item_id,relation,evidence_url,evidence_level)
                            VALUES (?,?,?,?,?)""",(number,"TB-W3-F-03",
                            "IMPLEMENTATION" if number in (259,260) else "DOCUMENTATION",
                            f"https://github.com/Patricked-code/MCP/pull/{number}","SOURCE_DOCUMENTED"))
            for item in model["reported_runtime"]:
                db.execute("INSERT INTO utl_v03_witness_runtime_reports VALUES (?,?,?,?,?)",
                    tuple(item[k] for k in ("witness_id","pr_number","reported_runtime_sha",
                                             "evidence_level","source_document_path")))
        validate_dependency_dag(db)
        foreign=db.execute("PRAGMA foreign_key_check").fetchall()
        integrity=scalar(db,"PRAGMA integrity_check")
        if foreign or integrity!="ok":
            raise ValueError(f"V03 SQL integrity failed: {len(foreign)} foreign errors, {integrity}")
        numbers={
            "historical_prs":scalar(db,"SELECT COUNT(*) FROM merged_prs"),
            "historical_commits":scalar(db,"SELECT COUNT(*) FROM main_commits"),
            "contract_types":scalar(db,"SELECT COUNT(*) FROM utl_v03_contract_types"),
            "parents":scalar(db,"SELECT COUNT(*) FROM utl_v03_parents"),
            "historical_witnesses":scalar(db,"SELECT COUNT(*) FROM utl_v03_historical_witnesses"),
            "witness_pr_relations":scalar(db,"SELECT COUNT(*) FROM utl_v03_witness_prs"),
            "owner_documented_runtime_reports":scalar(db,"SELECT COUNT(*) FROM utl_v03_witness_runtime_reports"),
            "explicit_work_item_pr_links":scalar(db,"SELECT COUNT(*) FROM utl_pr_links WHERE evidence_level='SOURCE_DOCUMENTED'"),
            "canonical_utl_refs":scalar(db,"SELECT COUNT(*) FROM utl_v03_units"),
            "real_utl_d_out_receipts":scalar(db,"SELECT COUNT(*) FROM utl_v03_contract_receipts WHERE contract_type='D_OUT'"),
            "real_utl_l_out_receipts":scalar(db,"SELECT COUNT(*) FROM utl_v03_contract_receipts WHERE contract_type='L_OUT'"),
            "real_utl_out_receipts":scalar(db,"SELECT COUNT(*) FROM utl_v03_contract_receipts WHERE contract_type='UTL_OUT'"),
            "real_task_out_receipts":scalar(db,"SELECT COUNT(*) FROM utl_v03_contract_receipts WHERE contract_type='T_OUT'"),
            "witness_ci_main_found":scalar(db,"SELECT COUNT(*) FROM v_utl_v03_historical_witness_matrix WHERE ci_main_run_id IS NOT NULL"),
            "witness_deploy_found":scalar(db,"SELECT COUNT(*) FROM v_utl_v03_historical_witness_matrix WHERE governed_deploy_run_id IS NOT NULL"),
            "historical_pr_unmapped_to_documented_work":scalar(db,"SELECT COUNT(*) FROM v_utl_evidence_gaps WHERE gap_type='UTL_LINK_UNRESOLVED'")
        }
        expected={"contract_types":8,"parents":2,"historical_witnesses":2,
                  "witness_pr_relations":7,"owner_documented_runtime_reports":2,
                  "explicit_work_item_pr_links":6,"canonical_utl_refs":0,
                  "witness_ci_main_found":7,"witness_deploy_found":7}
        for key,value in expected.items():
            if numbers[key]!=value:
                raise ValueError(f"Expected {key}={value}, received {numbers[key]}")
        report={
           "pr":372,"contract":"V0.3","snapshot_main_sha":model["immutableHistoricalSnapshot"],
           "owner_document_hashes":source_hashes,"counts":numbers,
           "integrity":"ok","foreign_key_errors":len(foreign),
           "scope":"HISTORICAL_CAUSAL_EVIDENCE_NOT_RUNTIME_EXECUTION",
           "no_real_utl_created":True,
           "remaining_gaps":[
              "Recover actual existing UTL identities and P2 parent admission receipts before any production UTL mapping.",
              "Recover PR-head CI and review provenance for individual units, not only CI-main history.",
              "Recover S1 deploy job IDs and exact runtime health attestation receipts by SHA.",
              "Collect verified UTL_OUT and parent-global T_OUT without fabricating runtime status.",
              "Do not promote candidate title mentions or v03 historical analogues to canonical units."
           ]}
        if report_path:
            report_path.parent.mkdir(parents=True,exist_ok=True)
            report_path.write_text(json.dumps(report,indent=2,ensure_ascii=False)+"\n",encoding="utf-8")
        return report
    finally:
        db.close()

def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("--db",required=True,type=Path)
    p.add_argument("--report",required=True,type=Path)
    a=p.parse_args()
    print(json.dumps(enrich(a.db,a.report),indent=2,ensure_ascii=False))

if __name__=="__main__":
    main()
