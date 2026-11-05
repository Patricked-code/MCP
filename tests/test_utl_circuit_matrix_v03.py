"""Additive PR372 V0.3 contract regression tests; all test objects rollback."""
import importlib.util
import json
import sqlite3
import tempfile
import unittest
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
def module(name,relative):
    spec=importlib.util.spec_from_file_location(name,ROOT/relative)
    result=importlib.util.module_from_spec(spec)
    spec.loader.exec_module(result)
    return result
base=module("utl_base_build","scripts/build_utl_reconciliation.py")
extension=module("utl_v03_extend","scripts/enrich_utl_circuit_matrix.py")
rules=module("utl_v03_rules","scripts/utl_contract_rules.py")
SHA="6576b5287f23566684005adf6032734e2ecdea50"

class TestUtlV03CircuitMatrix(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp=tempfile.TemporaryDirectory(prefix="pr372-v03-")
        cls.db_path=Path(cls.temp.name)/"utl.sqlite"
        cls.base_report=base.build(cls.db_path,None)
        cls.v03_report=extension.enrich(cls.db_path,Path(cls.temp.name)/"v03-report.json")
        cls.db=sqlite3.connect(cls.db_path)
        cls.db.row_factory=sqlite3.Row
        cls.db.execute("PRAGMA foreign_keys=ON")

    @classmethod
    def tearDownClass(cls):
        cls.db.close()
        cls.temp.cleanup()

    def test_previous_historical_baseline_preserved(self):
        self.assertEqual(self.db.execute("SELECT COUNT(*) FROM merged_prs").fetchone()[0],186)
        self.assertEqual(self.db.execute("SELECT COUNT(*) FROM main_commits").fetchone()[0],2151)
        self.assertEqual(self.db.execute("SELECT COUNT(*) FROM workflow_evidence WHERE kind='CI_MAIN'").fetchone()[0],185)
        self.assertEqual(self.db.execute("SELECT COUNT(*) FROM workflow_evidence WHERE kind='GOVERNED_DEPLOY_MCP'").fetchone()[0],171)
        self.assertEqual(self.db.execute("PRAGMA integrity_check").fetchone()[0],"ok")
        self.assertEqual(self.db.execute("PRAGMA foreign_key_check").fetchall(),[])

    def test_scope_lock_preserves_original_15_files(self):
        cfg=json.loads(extension.LOCK.read_text(encoding="utf-8"))
        self.assertEqual(cfg["prNumber"],372)
        self.assertEqual(len(cfg["baselineChangedPaths"]),15)
        for item in cfg["baselineChangedPaths"]:
            self.assertTrue((ROOT/item).is_file(),item)
        self.assertTrue(cfg["governance"]["noNewPrForThisWork"])
        self.assertTrue(cfg["governance"]["additiveExtensionsOnly"])

    def test_v03_is_additive_to_v02_and_hashes_are_recorded(self):
        first=extension.SOURCES["v02"].read_text(encoding="utf-8")
        second=extension.SOURCES["v03"].read_text(encoding="utf-8")
        self.assertTrue(second.startswith(first))
        rows=self.db.execute("SELECT * FROM utl_v03_contract_sources").fetchall()
        self.assertEqual(len(rows),2)
        self.assertTrue(all(len(row["sha256"])==64 for row in rows))

    def test_all_eight_contracts_exist_but_are_preparatory(self):
        x=self.db.execute("SELECT contract_type,canonical_execution_status FROM utl_v03_contract_types").fetchall()
        self.assertEqual({y["contract_type"] for y in x},set(extension.CONTRACT_ORDER))
        self.assertEqual({y["canonical_execution_status"] for y in x},{"PREPARATORY"})

    def test_e2_pilot_365_reconciled_without_fictitious_utl(self):
        row=self.db.execute("""SELECT * FROM v_utl_v03_historical_witness_matrix
                 WHERE witness_id='WITNESS-E2-PILOT-359' AND pr_number=365""").fetchone()
        self.assertEqual(row["parent_work_ref"],"GITHUB-ISSUE-359")
        self.assertEqual(row["work_entry"],"E2")
        self.assertIsNone(row["canonical_utl_ref"])
        self.assertEqual(row["merge_sha"],"fbbacfb53e43dada95b969f39eef03efb6f08dcb")
        self.assertEqual(row["ci_main_run_id"],41170431672)
        self.assertEqual(row["governed_deploy_run_id"],41170431660)
        self.assertEqual(row["effective_runtime_proof"],"OWNER_REPORTED_NOT_REATTESTED")

    def test_e2_pilot_is_not_gdu_chantier(self):
        row=self.db.execute("""SELECT parent_work_ref,continuity_id,work_entry FROM utl_v03_parents
                    WHERE parent_work_ref='GITHUB-ISSUE-359'""").fetchone()
        self.assertEqual(row["continuity_id"],"MCP-PILOT-E2-01-CONT-20261030-ROOT-01")
        self.assertNotEqual(row["parent_work_ref"],"GITHUB-ISSUE-349")
        self.assertEqual(row["work_entry"],"E2")
        prs=[x[0] for x in self.db.execute("""SELECT pr_number FROM utl_v03_witness_prs
                    WHERE witness_id='WITNESS-E2-PILOT-359' ORDER BY pr_number""").fetchall()]
        self.assertEqual(prs,[360,365,367])

    def test_tb_w3_f03_programme_and_multi_increment_history(self):
        row=self.db.execute("SELECT * FROM utl_v03_parents WHERE parent_work_ref='BLUEPRINT-TB-W3-F-03'").fetchone()
        self.assertEqual((row["program_ref"],row["work_item_ref"],row["wave_ref"],row["lot_ref"]),
            ("program-backlog-convergence-v2-20260924","PB-F","W3","F.2"))
        self.assertEqual(row["work_entry"],"UNDETERMINED")
        history=self.db.execute("""SELECT pr_number,relation,ci_main_run_id,governed_deploy_run_id
            FROM v_utl_v03_historical_witness_matrix WHERE witness_id='WITNESS-TB-W3-F-03'
            ORDER BY pr_number""").fetchall()
        self.assertEqual([x["pr_number"] for x in history],[259,260,261,263])
        self.assertTrue(all(x["ci_main_run_id"] and x["governed_deploy_run_id"] for x in history))
        self.assertEqual(history[-1]["relation"],"CLOSURE_DOCUMENTATION")

    def test_previous_pr_links_enriched_not_replaced(self):
        rows=self.db.execute("SELECT pr_number FROM utl_pr_links WHERE work_item_id='TB-W3-F-03' ORDER BY pr_number").fetchall()
        self.assertEqual([x[0] for x in rows],[259,260,261,263])
        self.assertEqual(self.v03_report["counts"]["explicit_work_item_pr_links"],6)
        self.assertEqual(self.db.execute("SELECT COUNT(*) FROM utl_pr_links WHERE work_item_id='PILOT-E2-01'").fetchone()[0],1)

    def test_no_canonical_utl_or_runtime_proof_fabricated(self):
        for table in ("utl_v03_units","utl_v03_unit_acceptance","utl_v03_parent_acceptance",
                      "utl_v03_delivery_evidence","utl_v03_contract_receipts"):
            self.assertEqual(self.db.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0],0)
        self.assertEqual(self.db.execute("SELECT COUNT(*) FROM v_utl_v03_parent_gate_strict WHERE strict_projection='PARENT_EVIDENCE_PRESENT'").fetchone()[0],0)
        self.assertEqual(self.v03_report["counts"]["canonical_utl_refs"],0)

    def test_invalid_e2_fake_task_blocked_by_schema(self):
        self.db.execute("SAVEPOINT v03_test_fake_task")
        try:
            with self.assertRaises(sqlite3.IntegrityError):
                self.db.execute("""INSERT INTO utl_v03_parents
                 (parent_work_ref,work_entry,parent_kind,authority_reference_url,provenance)
                 VALUES ('TEST-ONLY-E2','E2','INTERNAL_TASK','https://github.com/Patricked-code/MCP/issues/359','PROPOSED')""")
        finally:
            self.db.execute("ROLLBACK TO v03_test_fake_task")
            self.db.execute("RELEASE v03_test_fake_task")

    def test_dependency_cycle_rejected_before_any_runtime_action(self):
        self.db.execute("SAVEPOINT v03_test_cycle")
        try:
            for ref in ("TEST-UTL-A","TEST-UTL-B"):
                self.db.execute("""INSERT INTO utl_v03_units
                    (utl_ref,parent_work_ref,continuity_id,objective,scope_description,deploy_required,source_url,provenance)
                    VALUES (?,?,?,?,?,?,?,?)""",(ref,"GITHUB-ISSUE-359",
                    "MCP-PILOT-E2-01-CONT-20261030-ROOT-01","test-only","test-only",0,
                    "https://github.com/Patricked-code/MCP/issues/359","PROPOSED"))
            self.db.execute("""INSERT INTO utl_v03_dependencies VALUES
                ('TEST-UTL-A','TEST-UTL-B','BLOCKING','https://github.com/Patricked-code/MCP/issues/359')""")
            self.db.execute("""INSERT INTO utl_v03_dependencies VALUES
                ('TEST-UTL-B','TEST-UTL-A','BLOCKING','https://github.com/Patricked-code/MCP/issues/359')""")
            with self.assertRaisesRegex(ValueError,"dependency cycle"):
                extension.validate_dependency_dag(self.db)
        finally:
            self.db.execute("ROLLBACK TO v03_test_cycle")
            self.db.execute("RELEASE v03_test_cycle")
        self.assertEqual(self.db.execute("SELECT COUNT(*) FROM utl_v03_units").fetchone()[0],0)

    def test_readiness_cannot_authorize_e2_or_forge_e1_claim(self):
        good=dict(utl_ref="TEST-ONLY",parent_work_ref="GITHUB-ISSUE-359",
          continuity_id="MCP-PILOT-E2-01-CONT-20261030-ROOT-01",
          parent_authorized=True,unit_defined=True,dependencies_attested=True,
          owner_allowed_for_operation=True,no_collision=True,main_reobserved=True,
          safe_intermediate_delivery=True,scope_bounded=True,acceptance_criteria_documented=True,
          entry_profile="E2",explicit_owner_selection=True,runtime_write_required=False)
        result=rules.project_unit_readiness(good)
        self.assertEqual(result["status"],"CANDIDATE_READY_FOR_AUTHORITY_RECHECK")
        self.assertFalse(result["grants_runtime_permission"])
        self.assertFalse(result["automatically_creates_task_or_claim"])
        self.assertIn("E2_FAKE_INTERNAL_TASK_FORBIDDEN",
           rules.project_unit_readiness({**good,"invented_internal_task_ref":"FAKE-TASK"})["blockers"])
        self.assertIn("E1_CANONICAL_TASK_REQUIRED",
           rules.project_unit_readiness({**good,"entry_profile":"E1"})["blockers"])

    def test_workflow_success_alone_never_attests_server(self):
        result=rules.project_delivery_attestation(dict(main_sha=SHA,
            requested_sha=SHA,runtime_revision=SHA,ci_main_conclusion="success",
            deployment_workflow_conclusion="success"))
        self.assertEqual(result["status"],"NOT_SOURCE_ATTESTED")
        self.assertIn("INDEPENDENT_RUNTIME_RECEIPT_MISSING",result["blockers"])

    def test_exact_server_attestation_contract(self):
        complete=dict(main_sha=SHA,requested_sha=SHA,runtime_revision=SHA,
          ci_main_conclusion="success",deployment_workflow_conclusion="success",
          server_status="succeeded",phase="attested",health_ok=True,oauth_ok=True,
          mcp_auth_ok=True,deploy_workflow_run_id=37817792904,
          deploy_job_id="mcp-s1-37817792904-"+SHA[:12],
          independent_runtime_receipt_url="https://example.org/illustrative-not-real",
          verified_at_utc="2026-10-08T17:50:00Z",rollback_status="not_needed")
        self.assertEqual(rules.project_delivery_attestation(complete)["status"],"SOURCE_ATTESTED")
        self.assertEqual(rules.project_delivery_attestation({**complete,"runtime_revision":"a"*40})["status"],"NOT_SOURCE_ATTESTED")
        self.assertIn("DEPLOY_JOB_RUN_SHA_CORRELATION_INVALID",
          rules.project_delivery_attestation({**complete,"deploy_job_id":"wrong"})["blockers"])

    def test_parent_needs_global_criteria_even_if_units_attested(self):
        minimal=dict(required_utl_refs=["TEST-A","TEST-B"],attested_utl_refs=["TEST-A","TEST-B"],
          final_integrated_sha=SHA,parent_work_ref="TEST-PARENT",
          continuity_id="MCP-PILOT-E2-01-CONT-20261030-ROOT-01")
        self.assertEqual(rules.project_parent_closure(minimal)["status"],"PARENT_NOT_ATTESTED")
        ready={**minimal,"global_parent_acceptance_evidence_url":"https://example.org/illustrative",
          "parent_checkpoint_url":"https://example.org/checkpoint"}
        self.assertEqual(rules.project_parent_closure(ready)["status"],"CANDIDATE_PARENT_EVIDENCE_COMPLETE")
        self.assertFalse(rules.project_parent_closure(ready)["closes_runtime_task"])

    def test_zero_utl_parent_requires_already_satisfied_proof(self):
        without=dict(required_utl_refs=[],attested_utl_refs=[],final_integrated_sha=SHA,
          global_parent_acceptance_evidence_url="https://example.org/example",
          parent_checkpoint_url="https://example.org/example",
          parent_work_ref="TEST",continuity_id="TEST")
        self.assertEqual(rules.project_parent_closure(without)["status"],"PARENT_NOT_ATTESTED")
        self.assertEqual(rules.project_parent_closure({**without,
          "already_satisfied_evidence_url":"https://example.org/illustrative"})["status"],
          "CANDIDATE_PARENT_EVIDENCE_COMPLETE")

if __name__=="__main__":
    unittest.main()
