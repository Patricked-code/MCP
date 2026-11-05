"""UTL historical reconciliation tests: no network, no live MCP mutation."""
import importlib.util
import json
import sqlite3
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("utl_builder", ROOT / "scripts/build_utl_reconciliation.py")
builder = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(builder)

class UtlReconciliationTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.TemporaryDirectory(prefix="utl-reconciliation-")
        cls.db_path = Path(cls.tmp.name) / "evidence.sqlite"
        cls.report_path = Path(cls.tmp.name) / "report.json"
        cls.report = builder.build(cls.db_path,cls.report_path)
        cls.db = sqlite3.connect(cls.db_path)
        cls.db.row_factory = sqlite3.Row
        cls.db.execute("PRAGMA foreign_keys=ON")

    @classmethod
    def tearDownClass(cls):
        cls.db.close()
        cls.tmp.cleanup()

    def test_full_merged_pr_snapshot(self):
        self.assertEqual(self.report["counts"]["merged"], 186)
        self.assertEqual(self.report["counts"]["main_commits"], 2151)
        self.assertEqual(self.report["counts"]["ci"], 185)
        self.assertEqual(self.report["counts"]["deploy"], 171)
        self.assertEqual(self.report["counts"]["ci_success"], 185)
        self.assertEqual(self.report["counts"]["deploy_success"], 165)

    def test_provenance_and_sha_uniqueness(self):
        self.assertEqual(self.db.execute("SELECT COUNT(DISTINCT commit_sha) FROM main_commits").fetchone()[0], 2151)
        self.assertEqual(self.db.execute("SELECT COUNT(*) FROM utl_source_documents").fetchone()[0], 5)
        self.assertEqual(self.db.execute("SELECT COUNT(*) FROM main_commits WHERE sha_classification='KNOWN_MERGED_PR_SHA'").fetchone()[0], 186)
        self.assertEqual(self.report["other_main_commits_without_verified_pr_association"], 1965)
        self.assertEqual(self.report["foreign_key_errors"], 0)
        self.assertEqual(self.report["integrity"], "ok")
        self.assertTrue(self.report["root_zero_parent_null_normalized"])
        root=self.db.execute("SELECT parent_count,parent_sha_list FROM main_commits WHERE history_position_newest_first=2151").fetchone()
        self.assertEqual(root["parent_count"],0)
        self.assertEqual(root["parent_sha_list"],"")

    def test_261_exact_evidence_but_runtime_not_inferred(self):
        pr=self.db.execute("SELECT * FROM v_utl_pr_reconciliation WHERE pr_number=261").fetchone()
        self.assertEqual(pr["merge_sha"], "6576b5287f23566684005adf6032734e2ecdea50")
        self.assertEqual(pr["ci_main_run_id"], 37817792888)
        self.assertEqual(pr["governed_deploy_run_id"], 37817792904)
        self.assertEqual(pr["linked_work_items"], "TB-W3-F-03")
        self.assertNotEqual(pr["historical_runtime_status"], "SOURCE_ATTESTED")
        self.assertNotEqual(pr["reconciliation_status"], "SOURCE_ATTESTED")

    def test_e2_root_continuity_preserved(self):
        row=self.db.execute("SELECT continuity_ids,circuits,pr_number FROM v_utl_work_history WHERE work_item_id='PILOT-E2-01'").fetchone()
        self.assertEqual(row["continuity_ids"], "MCP-PILOT-E2-01-CONT-20261030-ROOT-01")
        self.assertEqual(row["circuits"], "EXTERNAL_GOVERNED_RECOVERY")
        self.assertEqual(row["pr_number"], 360)

    def test_unverified_prs_never_assigned_fake_utl(self):
        self.assertEqual(self.db.execute("SELECT COUNT(*) FROM v_utl_pr_reconciliation").fetchone()[0], 186)
        self.assertEqual(self.report["verified_pr_work_links"], 3)
        self.assertEqual(self.report["unresolved_pr_utl_links"], 183)
        self.assertTrue(self.db.execute("SELECT COUNT(*) FROM utl_candidate_refs").fetchone()[0]>0)
        self.assertEqual(self.db.execute("SELECT COUNT(*) FROM utl_candidate_refs WHERE verification_status!='CANDIDATE_ONLY'").fetchone()[0],0)

    def test_missing_workflow_not_failure(self):
        row=self.db.execute("SELECT * FROM v_utl_pr_reconciliation WHERE pr_number=6").fetchone()
        self.assertIsNone(row["ci_main_run_id"])
        self.assertIsNone(row["governed_deploy_run_id"])
        self.assertIn(row["reconciliation_status"], ("UTL_MAPPING_NOT_ATTESTED","EVIDENCE_INCOMPLETE"))
        self.assertEqual(self.db.execute("SELECT COUNT(*) FROM v_utl_evidence_gaps WHERE pr_number=6 AND gap_type='CI_MAIN_NOT_FOUND'").fetchone()[0],1)

    def test_current_runtime_does_not_attest_historical_deploy(self):
        live=self.db.execute("SELECT * FROM utl_runtime_observations").fetchone()
        self.assertEqual(live["alignment"], "FULLY_ALIGNED")
        self.assertEqual(live["runtime_sha"], live["github_main_sha"])
        self.assertEqual(self.report["historical_runtime_not_source_attested"], 186)

    def test_git_blob_tampering_detected(self):
        seed=json.loads(builder.MANIFEST.read_text(encoding="utf-8"))
        with patch.object(builder, "git_blob_sha", return_value="0"*40):
            with self.assertRaisesRegex(ValueError,"Source blob SHA mismatch"):
                builder.validate_sources(seed)

    def test_no_implicit_overwrite(self):
        with self.assertRaises(FileExistsError):
            builder.build(self.db_path, None)

if __name__=="__main__":
    unittest.main()
