"""PR372 V03 P02 evidence: seven linked historical deploy attestations."""
import importlib.util,sqlite3,tempfile,unittest,json
from pathlib import Path
from unittest.mock import patch

ROOT=Path(__file__).resolve().parents[1]
def load(name,relative):
    spec=importlib.util.spec_from_file_location(name,ROOT/relative)
    obj=importlib.util.module_from_spec(spec);spec.loader.exec_module(obj);return obj
base=load("utl_base_for_p02","scripts/build_utl_reconciliation.py")
v03=load("utl_v03_for_p02","scripts/enrich_utl_circuit_matrix.py")
p01=load("utl_p01_for_p02","scripts/attach_utl_workflow_evidence_v03.py")
p02=load("utl_p02","scripts/append_utl_workflow_evidence_v03.py")

class SevenWitnessDeployTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp=tempfile.TemporaryDirectory(prefix="pr372-p02-")
        cls.path=Path(cls.tmp.name)/"pr372.sqlite"
        base.build(cls.path,None);v03.enrich(cls.path,None);p01.attach(cls.path,None)
        cls.report=p02.append(cls.path,Path(cls.tmp.name)/"p02-report.json")
        cls.db=sqlite3.connect(cls.path);cls.db.row_factory=sqlite3.Row

    @classmethod
    def tearDownClass(cls):
        cls.db.close();cls.tmp.cleanup()

    def test_seven_pr_exact_sha_workflow_attestations(self):
        refs=self.db.execute("""SELECT pr_number,main_sha,deploy_workflow_run_id,
            server_job_id FROM utl_v03_workflow_server_attestations ORDER BY pr_number""").fetchall()
        self.assertEqual([x["pr_number"] for x in refs],[259,260,261,263,360,365,367])
        for x in refs:
            self.assertEqual(x["server_job_id"],f"mcp-s1-{x['deploy_workflow_run_id']}-{x['main_sha'][:12]}")
        self.assertEqual(self.report["prior_records_preserved"],[261,365])

    def test_no_utl_or_parent_terminal_success_is_inferred(self):
        self.assertEqual(self.db.execute("SELECT COUNT(*) FROM utl_v03_units").fetchone()[0],0)
        self.assertEqual(self.db.execute("SELECT COUNT(*) FROM utl_v03_parent_acceptance").fetchone()[0],0)
        self.assertEqual(self.db.execute("SELECT COUNT(*) FROM utl_v03_unit_acceptance").fetchone()[0],0)
        self.assertEqual(self.report["independent_s1_history_rechecks"],0)
        self.assertEqual(self.db.execute("SELECT COUNT(*) FROM v_utl_v03_historical_runtime_correlated WHERE strongest_historical_runtime_proof='WORKFLOW_S1_STATUS_ATTESTED'").fetchone()[0],7)

    def test_no_duplicate_append(self):
        with self.assertRaisesRegex(ValueError,"preserved before P02"):
            p02.append(self.path,None)

    def test_modified_p02_job_fails_closed(self):
        data=json.loads(p02.SOURCE.read_text(encoding="utf-8"))
        data["attestations"][0]["server_job_id"]="invalid"
        with tempfile.TemporaryDirectory() as temp:
            file=Path(temp)/"altered.json";file.write_text(json.dumps(data),encoding="utf-8")
            db_path=Path(temp)/"safe.sqlite"
            base.build(db_path,None);v03.enrich(db_path,None);p01.attach(db_path,None)
            with patch.object(p02,"SOURCE",file):
                with self.assertRaisesRegex(ValueError,"Exact-SHA S1 job"):
                    p02.append(db_path,None)
            with sqlite3.connect(db_path) as db:
                self.assertEqual(db.execute("SELECT COUNT(*) FROM utl_v03_workflow_server_attestations").fetchone()[0],2)

if __name__=="__main__":unittest.main()
