-- PR #372: append-only contract + causal evidence overlay (v03).
-- Must be loaded AFTER the existing PR #370/#371 and PR #372 read-only model.
-- Existing tables are neither dropped nor altered. All new tables are analytical
-- evidence views; they are not runtime authorities, P2 tasks or UTL dispatchers.
PRAGMA foreign_keys=ON;

CREATE TABLE IF NOT EXISTS utl_v03_contract_types (
 contract_type TEXT PRIMARY KEY CHECK(contract_type IN
  ('T_IN','UTL_PLAN','D_IN','D_OUT','L_IN','L_OUT','UTL_OUT','T_OUT')),
 source_document TEXT NOT NULL,
 contract_description TEXT NOT NULL,
 canonical_execution_status TEXT NOT NULL DEFAULT 'PREPARATORY'
   CHECK(canonical_execution_status IN ('PREPARATORY','SOURCE_DOCUMENTED'))
);

CREATE TABLE IF NOT EXISTS utl_v03_parents (
 parent_work_ref TEXT PRIMARY KEY,
 work_entry TEXT NOT NULL CHECK(work_entry IN ('E1','E2','UNDETERMINED')),
 parent_kind TEXT NOT NULL CHECK(parent_kind IN ('INTERNAL_TASK','EXTERNAL_ISSUE','BLUEPRINT','OTHER')),
 continuity_id TEXT REFERENCES utl_continuities(continuity_id),
 mandate_ref TEXT,
 program_ref TEXT,
 work_item_ref TEXT,
 wave_ref TEXT,
 lot_ref TEXT,
 blueprint_ref TEXT,
 authority_reference_url TEXT NOT NULL,
 provenance TEXT NOT NULL CHECK(provenance IN
  ('AUTHORITATIVE_REFERENCE','DOCUMENTED_HISTORICAL','PROPOSED')),
 CHECK (work_entry!='E2' OR parent_kind!='INTERNAL_TASK')
);

CREATE TABLE IF NOT EXISTS utl_v03_parent_requirements (
 parent_work_ref TEXT NOT NULL REFERENCES utl_v03_parents(parent_work_ref),
 requirement_ref TEXT NOT NULL,
 acceptance_criterion TEXT NOT NULL,
 source_url TEXT NOT NULL,
 PRIMARY KEY(parent_work_ref, requirement_ref)
);

-- Only create an UTL row after a REAL stable reference has been emitted and
-- linked to the correct existing continuity / task authority.
CREATE TABLE IF NOT EXISTS utl_v03_units (
 utl_ref TEXT PRIMARY KEY CHECK(length(trim(utl_ref))>0),
 parent_work_ref TEXT NOT NULL REFERENCES utl_v03_parents(parent_work_ref),
 continuity_id TEXT NOT NULL REFERENCES utl_continuities(continuity_id),
 current_revision INTEGER NOT NULL DEFAULT 1 CHECK(current_revision>0),
 objective TEXT NOT NULL,
 scope_description TEXT NOT NULL,
 deploy_required INTEGER NOT NULL CHECK(deploy_required IN (0,1)),
 source_url TEXT NOT NULL,
 provenance TEXT NOT NULL CHECK(provenance IN ('SOURCE_DOCUMENTED','PROPOSED')),
 CHECK (length(trim(objective))>0),
 CHECK (length(trim(scope_description))>0)
);

CREATE TABLE IF NOT EXISTS utl_v03_unit_versions (
 utl_ref TEXT NOT NULL REFERENCES utl_v03_units(utl_ref),
 revision INTEGER NOT NULL CHECK(revision>0),
 requirement_refs_json TEXT NOT NULL CHECK(json_valid(requirement_refs_json)),
 acceptance_criteria_json TEXT NOT NULL CHECK(json_valid(acceptance_criteria_json)),
 test_plan_json TEXT NOT NULL CHECK(json_valid(test_plan_json)),
 collision_domains_json TEXT NOT NULL CHECK(json_valid(collision_domains_json)),
 non_regression_json TEXT NOT NULL CHECK(json_valid(non_regression_json)),
 recovery_plan_json TEXT NOT NULL CHECK(json_valid(recovery_plan_json)),
 checkpoint_ref TEXT,
 next_action TEXT NOT NULL,
 evidence_url TEXT NOT NULL,
 PRIMARY KEY(utl_ref,revision)
);

CREATE TABLE IF NOT EXISTS utl_v03_dependencies (
 utl_ref TEXT NOT NULL REFERENCES utl_v03_units(utl_ref),
 prerequisite_utl_ref TEXT NOT NULL REFERENCES utl_v03_units(utl_ref),
 dependency_type TEXT NOT NULL CHECK(dependency_type IN ('BLOCKING','ORDERING','COMPATIBILITY')),
 evidence_url TEXT NOT NULL,
 CHECK(utl_ref<>prerequisite_utl_ref),
 PRIMARY KEY(utl_ref,prerequisite_utl_ref,dependency_type)
);

CREATE TABLE IF NOT EXISTS utl_v03_contract_receipts (
 receipt_id TEXT PRIMARY KEY,
 contract_type TEXT NOT NULL REFERENCES utl_v03_contract_types(contract_type),
 parent_work_ref TEXT NOT NULL REFERENCES utl_v03_parents(parent_work_ref),
 utl_ref TEXT REFERENCES utl_v03_units(utl_ref),
 revision INTEGER NOT NULL CHECK(revision>0),
 receipt_status TEXT NOT NULL CHECK(receipt_status IN
  ('DOCUMENTED','CANDIDATE','BLOCKED','ATTESTED')),
 payload_json TEXT NOT NULL CHECK(json_valid(payload_json)),
 evidence_url TEXT NOT NULL,
 observed_at_utc TEXT NOT NULL,
 authority_class TEXT NOT NULL CHECK(authority_class IN
  ('AUTHORITATIVE_GITHUB','AUTHORITATIVE_MCP','OWNER_DOCUMENT','ANALYTICAL_PROJECTION')),
 CHECK (
  (contract_type IN ('T_IN','UTL_PLAN','T_OUT') AND utl_ref IS NULL)
  OR (contract_type IN ('D_IN','D_OUT','L_IN','L_OUT','UTL_OUT') AND utl_ref IS NOT NULL)
 )
);
CREATE INDEX IF NOT EXISTS idx_utl_v03_contract_parent ON utl_v03_contract_receipts(parent_work_ref,contract_type);
CREATE INDEX IF NOT EXISTS idx_utl_v03_contract_utl ON utl_v03_contract_receipts(utl_ref,contract_type);

-- PR CI and main CI are different evidence types, SHA is always explicit.
CREATE TABLE IF NOT EXISTS utl_v03_development_evidence (
 development_id TEXT PRIMARY KEY,
 utl_ref TEXT NOT NULL REFERENCES utl_v03_units(utl_ref),
 pr_number INTEGER REFERENCES merged_prs(pr_number),
 branch_name TEXT,
 branch_head_sha TEXT,
 pr_head_sha TEXT,
 pr_ci_run_id INTEGER,
 review_url TEXT,
 merged_sha TEXT,
 merged_at_utc TEXT,
 evidence_url TEXT NOT NULL,
 CHECK(branch_head_sha IS NULL OR length(branch_head_sha)=40),
 CHECK(pr_head_sha IS NULL OR length(pr_head_sha)=40),
 CHECK(merged_sha IS NULL OR length(merged_sha)=40)
);

-- Multiple deploy workflow runs or retries are permitted for one UTL / SHA.
-- A workflow success cannot by itself mark a server deployment as attested.
CREATE TABLE IF NOT EXISTS utl_v03_delivery_evidence (
 delivery_id TEXT PRIMARY KEY,
 utl_ref TEXT NOT NULL REFERENCES utl_v03_units(utl_ref),
 development_id TEXT REFERENCES utl_v03_development_evidence(development_id),
 main_sha TEXT NOT NULL CHECK(length(main_sha)=40),
 ci_main_run_id INTEGER,
 deploy_workflow_run_id INTEGER,
 admission_kind TEXT CHECK(admission_kind IN ('push_ci_gate','workflow_dispatch_manual')),
 deploy_job_id TEXT,
 requested_sha TEXT,
 runtime_revision TEXT,
 phase TEXT,
 health_ok INTEGER CHECK(health_ok IN (0,1) OR health_ok IS NULL),
 oauth_ok INTEGER CHECK(oauth_ok IN (0,1) OR oauth_ok IS NULL),
 mcp_auth_ok INTEGER CHECK(mcp_auth_ok IN (0,1) OR mcp_auth_ok IS NULL),
 rollback_status TEXT,
 verified_at_utc TEXT,
 attestation_url TEXT,
 attestation_status TEXT NOT NULL CHECK(attestation_status IN
  ('UNKNOWN','BLOCKED','FAILED','SOURCE_ATTESTED')),
 CHECK(requested_sha IS NULL OR length(requested_sha)=40),
 CHECK(runtime_revision IS NULL OR length(runtime_revision)=40),
 CHECK(attestation_status!='SOURCE_ATTESTED'
    OR (requested_sha=main_sha AND runtime_revision=main_sha
      AND phase='attested' AND health_ok=1 AND oauth_ok=1 AND mcp_auth_ok=1
      AND verified_at_utc IS NOT NULL AND attestation_url IS NOT NULL
      AND ci_main_run_id IS NOT NULL AND deploy_workflow_run_id IS NOT NULL
      AND deploy_job_id IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS idx_utl_v03_delivery_sha ON utl_v03_delivery_evidence(main_sha);

CREATE TABLE IF NOT EXISTS utl_v03_unit_acceptance (
 utl_ref TEXT NOT NULL REFERENCES utl_v03_units(utl_ref),
 revision INTEGER NOT NULL,
 status TEXT NOT NULL CHECK(status IN ('CANDIDATE','BLOCKED','ATTESTED')),
 criteria_coverage_url TEXT,
 integration_sha TEXT,
 checkpoint_url TEXT,
 observed_at_utc TEXT NOT NULL,
 source_url TEXT NOT NULL,
 CHECK(status!='ATTESTED' OR
  (criteria_coverage_url IS NOT NULL AND integration_sha IS NOT NULL AND checkpoint_url IS NOT NULL)),
 PRIMARY KEY(utl_ref,revision)
);

CREATE TABLE IF NOT EXISTS utl_v03_parent_acceptance (
 parent_work_ref TEXT PRIMARY KEY REFERENCES utl_v03_parents(parent_work_ref),
 state TEXT NOT NULL CHECK(state IN ('INCOMPLETE','BLOCKED','ATTESTED')),
 final_main_sha TEXT,
 global_acceptance_evidence_url TEXT,
 checkpoint_url TEXT,
 observed_at_utc TEXT NOT NULL,
 CHECK(state!='ATTESTED' OR (final_main_sha IS NOT NULL AND
  global_acceptance_evidence_url IS NOT NULL AND checkpoint_url IS NOT NULL))
);

-- Historical cases from the owner's v03 are witness relationships, NOT canonical UTL rows.
CREATE TABLE IF NOT EXISTS utl_v03_historical_witnesses (
 witness_id TEXT PRIMARY KEY,
 parent_work_ref TEXT REFERENCES utl_v03_parents(parent_work_ref),
 witness_kind TEXT NOT NULL CHECK(witness_kind IN ('E2_CONTINUITY','BLUEPRINT_MULTI_INCREMENT')),
 canonical_utl_ref TEXT REFERENCES utl_v03_units(utl_ref),
 owner_document_path TEXT NOT NULL,
 source_url TEXT NOT NULL,
 evidence_class TEXT NOT NULL CHECK(evidence_class IN ('HISTORICAL_DOCUMENTED','SOURCE_ATTESTED')),
 CHECK(canonical_utl_ref IS NULL OR evidence_class='SOURCE_ATTESTED')
);
CREATE TABLE IF NOT EXISTS utl_v03_witness_prs (
 witness_id TEXT NOT NULL REFERENCES utl_v03_historical_witnesses(witness_id),
 pr_number INTEGER NOT NULL REFERENCES merged_prs(pr_number),
 relation TEXT NOT NULL CHECK(relation IN ('INCREMENT','IMPLEMENTATION','RECONCILIATION','CLOSURE_DOCUMENTATION')),
 source_url TEXT NOT NULL,
 attribution_level TEXT NOT NULL CHECK(attribution_level IN ('OWNER_DOCUMENTED','SOURCE_DOCUMENTED')),
 PRIMARY KEY(witness_id,pr_number)
);
CREATE TABLE IF NOT EXISTS utl_v03_witness_runtime_reports (
 witness_id TEXT NOT NULL REFERENCES utl_v03_historical_witnesses(witness_id),
 pr_number INTEGER NOT NULL REFERENCES merged_prs(pr_number),
 reported_runtime_sha TEXT NOT NULL CHECK(length(reported_runtime_sha)=40),
 evidence_level TEXT NOT NULL CHECK(evidence_level IN ('OWNER_DOCUMENTED','SOURCE_ATTESTED')),
 source_document_path TEXT NOT NULL,
 PRIMARY KEY(witness_id,pr_number),
 CHECK(evidence_level='OWNER_DOCUMENTED')
);

CREATE VIEW IF NOT EXISTS v_utl_v03_historical_witness_matrix AS
SELECT w.witness_id, w.witness_kind,w.canonical_utl_ref,
 p.parent_work_ref,p.work_entry,p.program_ref,p.work_item_ref,p.wave_ref,p.lot_ref,p.blueprint_ref,
 link.pr_number,link.relation,link.attribution_level,
 prs.merge_sha,prs.merged_at_utc,
 ci.run_id AS ci_main_run_id,ci.conclusion AS ci_conclusion,
 dep.run_id AS governed_deploy_run_id,dep.conclusion AS deploy_conclusion,
 rt.evidence_status AS archive_runtime_status,rt.runtime_sha AS archive_runtime_sha,
 rr.reported_runtime_sha AS owner_documented_runtime_sha,
 CASE WHEN rt.evidence_status='SOURCE_ATTESTED' THEN 'SOURCE_ATTESTED'
      WHEN rr.reported_runtime_sha IS NOT NULL THEN 'OWNER_REPORTED_NOT_REATTESTED'
      ELSE 'HISTORICAL_RUNTIME_NOT_ATTESTED' END AS effective_runtime_proof
FROM utl_v03_historical_witnesses w
LEFT JOIN utl_v03_parents p ON p.parent_work_ref=w.parent_work_ref
JOIN utl_v03_witness_prs link ON link.witness_id=w.witness_id
JOIN merged_prs prs ON prs.pr_number=link.pr_number
LEFT JOIN workflow_evidence ci ON ci.pr_number=prs.pr_number AND ci.kind='CI_MAIN'
LEFT JOIN workflow_evidence dep ON dep.pr_number=prs.pr_number AND dep.kind='GOVERNED_DEPLOY_MCP'
LEFT JOIN runtime_evidence rt ON rt.pr_number=prs.pr_number
LEFT JOIN utl_v03_witness_runtime_reports rr ON rr.witness_id=w.witness_id AND rr.pr_number=prs.pr_number;

-- Even if every UTL is attested, T_OUT needs its own global acceptance.
CREATE VIEW IF NOT EXISTS v_utl_v03_parent_gate AS
SELECT p.parent_work_ref,p.work_entry,p.continuity_id,
 COUNT(DISTINCT u.utl_ref) AS actual_utl_count,
 COUNT(DISTINCT CASE WHEN a.status='ATTESTED' THEN u.utl_ref END) AS attested_utl_count,
 pa.state AS recorded_parent_state,
 CASE
   WHEN pa.state='ATTESTED'
    AND NOT EXISTS (SELECT 1 FROM utl_v03_units unit
      WHERE unit.parent_work_ref=p.parent_work_ref
      AND NOT EXISTS (SELECT 1 FROM utl_v03_unit_acceptance accept
        WHERE accept.utl_ref=unit.utl_ref AND accept.status='ATTESTED'))
   THEN 'PARENT_ATTESTED_RECORDED'
   ELSE 'PARENT_NOT_ATTESTED' END AS projection_status
FROM utl_v03_parents p
LEFT JOIN utl_v03_units u ON u.parent_work_ref=p.parent_work_ref
LEFT JOIN utl_v03_unit_acceptance a ON a.utl_ref=u.utl_ref AND a.status='ATTESTED'
LEFT JOIN utl_v03_parent_acceptance pa ON pa.parent_work_ref=p.parent_work_ref
GROUP BY p.parent_work_ref,p.work_entry,p.continuity_id,pa.state;
