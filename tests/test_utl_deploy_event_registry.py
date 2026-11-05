"""Read-only regression tests for PR372 deployment registry and evidence distinctions."""
from __future__ import annotations
import importlib.util
import json
import sqlite3
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MODULE = ROOT / "scripts/build_utl_deploy_event_registry.py"
spec = importlib.util.spec_from_file_location("build_utl_deploy_event_registry", MODULE)
reg = importlib.util.module_from_spec(spec)
spec.loader.exec_module(reg)


class DeploymentEventLedgerTests(unittest.TestCase):
    def setUp(self):
        self.db, self.report = reg.build()

    def tearDown(self):
        self.db.close()

    def test_counts_are_not_confused_with_production_changes(self):
        counts = self.report["observed"]
        self.assertEqual(counts, {"merged":186,"deploy":171,"success":165,
                                  "failure":6,"verified_logs":7,"missing":15})
        self.assertEqual(self.report["attestedProductionChanges"], 0)
        self.assertEqual(reg.scalar(self.db, "SELECT COUNT(*) FROM v_production_modification_independently_proven"), 0)

    def test_primary_key_is_event_not_sha(self):
        self.assertEqual(reg.scalar(self.db, "SELECT COUNT(DISTINCT event_key) FROM production_deploy_event"),171)
        self.assertEqual(reg.scalar(self.db, "SELECT COUNT(DISTINCT deploy_run_id) FROM production_deploy_event"),171)
        row=self.db.execute("SELECT pr_number,merged_sha FROM production_deploy_event LIMIT 1").fetchone()
        self.db.execute("""INSERT INTO production_deploy_event
          (event_key,pr_number,deploy_run_id,deploy_workflow_conclusion,merged_sha,evidence_class,
          production_modification_proven,source_blob_sha)
          VALUES ('SYNTHETIC_TEST_ONLY', ?, 999999999999, 'success', ?, 'GITHUB_WORKFLOW_SUCCESS_ONLY',0,'TEST')""",
          (row[0],row[1]))
        self.assertEqual(reg.scalar(self.db,"SELECT COUNT(*) FROM production_deploy_event"),172)
        self.db.execute("DELETE FROM production_deploy_event WHERE event_key='SYNTHETIC_TEST_ONLY'")

    def test_workflow_success_is_not_s1_attestation(self):
        unverified=reg.scalar(self.db, """SELECT COUNT(*) FROM production_deploy_event
           WHERE deploy_workflow_conclusion='success' AND github_job_id IS NULL""")
        self.assertEqual(unverified,158)
        terminal=reg.scalar(self.db, """SELECT COUNT(*) FROM production_deploy_event
           WHERE github_job_id IS NOT NULL AND attested_at_utc IS NOT NULL
           AND server_job_id IS NOT NULL AND native_attestation_id IS NULL""")
        self.assertEqual(terminal,7)
        self.assertEqual(reg.scalar(self.db,"SELECT COUNT(*) FROM production_deploy_event WHERE run_attempt IS NOT NULL"),0)

    def test_exact_main_ci_merge_and_deploy_correlation(self):
        row=self.db.execute("""SELECT e.pr_number,e.merged_sha,e.ci_main_run_id,
          e.deploy_run_id,e.github_job_id,e.server_job_id
          FROM production_deploy_event e WHERE e.pr_number=261""").fetchone()
        self.assertEqual(row, (261,"6576b5287f23566684005adf6032734e2ecdea50",
                               37817792888,37817792904,113450762668,
                               "mcp-s1-37817792904-6576b5287f23"))

    def test_missing_and_failed_are_explicit_not_dropped(self):
        absent=[row[0] for row in self.db.execute("""SELECT p.pr_number FROM merged_prs p
           WHERE NOT EXISTS(SELECT 1 FROM production_deploy_event e WHERE e.pr_number=p.pr_number)
           ORDER BY p.pr_number""")]
        self.assertEqual(len(absent),15)
        failures=[row[0] for row in self.db.execute("""SELECT pr_number FROM production_deploy_event
           WHERE deploy_workflow_conclusion='failure' ORDER BY pr_number""")]
        self.assertEqual(failures,[99,200,202,272,273,274])

    def test_source_drift_and_fabricated_proof_fail_closed(self):
        ledger=json.loads(reg.LEDGER.read_text(encoding="utf-8"))
        with tempfile.TemporaryDirectory() as temp:
            file=Path(temp)/"tampered.json"
            originals=reg.LEDGER
            try:
                altered=json.loads(json.dumps(ledger))
                altered["events"][0]["productionModificationProven"]=True
                file.write_text(json.dumps(altered),encoding="utf-8")
                reg.LEDGER=file
                with self.assertRaises(AssertionError):
                    reg.build()
                altered=json.loads(json.dumps(ledger))
                altered["events"][0]["mergeSha"]="0"*40
                file.write_text(json.dumps(altered),encoding="utf-8")
                with self.assertRaises(AssertionError):
                    reg.build()
            finally:
                reg.LEDGER=originals

if __name__ == "__main__":
    unittest.main()
