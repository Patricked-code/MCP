"""PR372 V03 evidence: verify real workflow server-job receipts, no fabricated UTL."""
import importlib.util
import json
import sqlite3
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

ROOT=Path(__file__).resolve().parents[1]
def load(key,path):
    spec=importlib.util.spec_from_file_location(key,ROOT/path)
    obj=importlib.util.module_from_spec(spec)
    spec.loader.exec_module(obj)
    return obj
base=load("utl_base","scripts/build_utl_reconciliation.py")
v03=load("utl_overlay","scripts/enrich_utl_circuit_matrix.py")
attach=load("utl_attach","scripts/attach_utl_workflow_evidence_v03.py")

class UtlWorkflowAttestationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.work=tempfile.TemporaryDirectory(prefix="utl-pr372-workflow-")
        cls.dbpath=Path(cls.work.name)/"pr372.sqlite"
        base.build(cls.dbpath,None)
        v03.enrich(cls.dbpath,None)
        cls.report=attach.attach(cls.dbpath,Path(cls.work.name)/"report.json")
        cls.db=sqlite3.connect(cls.dbpath)
        cls.db.row_factory=sqlite3.Row
        cls.db.execute("PRAGMA foreign_keys=ON")

    @classmethod
    def tearDownClass(cls):
        cls.db.close()
        cls.work.cleanup()

    def test_two_exact_sha_attestations_with_real_job_ids(self):
        values=self.db.execute("""SELECT pr_number,main_sha,ci_main_run_id,
           deploy_workflow_run_id,github_job_id,server_job_id
           FROM utl_v03_workflow_server_attestations ORDER BY pr_number""").fetchall()
        self.assertEqual(len(values),2)
        self.assertEqual((values[0]["pr_number"],values[0]["ci_main_run_id"],
                          values[0]["deploy_workflow_run_id"],values[0]["github_job_id"]),
            (261,37817792888,37817792904,113450762668))
        self.assertEqual((values[1]["pr_number"],values[1]["ci_main_run_id"],
                          values[1]["deploy_workflow_run_id"],values[1]["github_job_id"]),
            (365,41170431672,41170431660,124447019576))
        for item in values:
            self.assertEqual(item["server_job_id"],
                f"mcp-s1-{item['deploy_workflow_run_id']}-{item['main_sha'][:12]}")

    def test_history_marks_workflow_attestation_without_canonical_utl(self):
        rows=self.db.execute("""SELECT pr_number,strongest_historical_runtime_proof
                FROM v_utl_v03_historical_runtime_correlated
                WHERE pr_number IN (261,365) ORDER BY pr_number""").fetchall()
        self.assertEqual([r["strongest_historical_runtime_proof"] for r in rows],
                         ["WORKFLOW_S1_STATUS_ATTESTED"]*2)
        self.assertEqual(self.db.execute("SELECT COUNT(*) FROM utl_v03_units").fetchone()[0],0)
        self.assertEqual(self.db.execute("SELECT COUNT(*) FROM utl_v03_unit_acceptance").fetchone()[0],0)
        self.assertEqual(self.db.execute("SELECT COUNT(*) FROM utl_v03_parent_acceptance").fetchone()[0],0)
        self.assertEqual(self.report["independent_s1_runtime_rechecks"],0)

    def test_other_history_is_not_upgraded_by_proximity(self):
        row=self.db.execute("""SELECT strongest_historical_runtime_proof
               FROM v_utl_v03_historical_runtime_correlated WHERE pr_number=260""").fetchone()
        self.assertEqual(row[0],"HISTORICAL_RUNTIME_NOT_ATTESTED")
        self.assertEqual(self.db.execute("SELECT COUNT(*) FROM merged_prs").fetchone()[0],186)
        self.assertEqual(self.db.execute("SELECT COUNT(*) FROM main_commits").fetchone()[0],2151)

    def test_refuse_reapplication_without_rebuild(self):
        with self.assertRaisesRegex(ValueError,"already populated"):
            attach.attach(self.dbpath,None)

    def test_tampered_server_job_id_fail_closed(self):
        original=json.loads(attach.SOURCE.read_text(encoding="utf-8"))
        original["attestations"][0]["server_job_id"]="mcp-s1-unverified"
        with tempfile.TemporaryDirectory() as temporary:
            altered=Path(temporary)/"altered.json"
            altered.write_text(json.dumps(original),encoding="utf-8")
            original_db=Path(temporary)/"original.sqlite"
            base.build(original_db,None)
            v03.enrich(original_db,None)
            with patch.object(attach,"SOURCE",altered):
                with self.assertRaisesRegex(ValueError,"S1 server job ID"):
                    attach.attach(original_db,None)
            with sqlite3.connect(original_db) as db:
                self.assertEqual(db.execute("SELECT COUNT(*) FROM utl_v03_workflow_server_attestations").fetchone()[0],0)

    def test_provenance_url_is_explicit_run_job(self):
        for row in self.db.execute("""SELECT * FROM utl_v03_workflow_server_attestations"""):
            self.assertEqual(row["workflow_log_url"],
                f"https://github.com/Patricked-code/MCP/actions/runs/{row['deploy_workflow_run_id']}/job/{row['github_job_id']}")
        self.assertEqual(self.db.execute("PRAGMA foreign_key_check").fetchall(),[])
        self.assertEqual(self.db.execute("PRAGMA integrity_check").fetchone()[0],"ok")

if __name__=="__main__":
    unittest.main()
