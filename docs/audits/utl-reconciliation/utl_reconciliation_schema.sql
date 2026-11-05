-- Analytical UTL reconciliation overlay. No MCP operational authority is recreated.
-- Load upstream PR #371 SQL snapshots BEFORE this file.
PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS utl_source_documents (
 source_id TEXT PRIMARY KEY,
 upstream_pr INTEGER NOT NULL CHECK(upstream_pr IN (370,371)),
 source_url TEXT NOT NULL,
 local_path TEXT NOT NULL UNIQUE,
 git_blob_sha TEXT NOT NULL UNIQUE CHECK(length(git_blob_sha)=40),
 purpose TEXT NOT NULL,
 verification_level TEXT NOT NULL CHECK(verification_level IN ('SOURCE_VERIFIED','HISTORICAL_REPORTED'))
);
CREATE TABLE IF NOT EXISTS utl_mandates (
 mandate_id TEXT PRIMARY KEY,
 mandate_type TEXT NOT NULL CHECK(mandate_type IN ('PROGRAM','PROJECT','INCIDENT','OTHER')),
 label TEXT NOT NULL,
 canonical_issue INTEGER,
 evidence_url TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS utl_work_items (
 work_item_id TEXT PRIMARY KEY,
 work_type TEXT NOT NULL CHECK(work_type IN ('UTL','TASK','CHANTIER','INTERVENTION')),
 label TEXT NOT NULL,
 mandate_id TEXT REFERENCES utl_mandates(mandate_id),
 evidence_url TEXT NOT NULL,
 evidence_level TEXT NOT NULL CHECK(evidence_level IN ('SOURCE_DOCUMENTED','OWNER_REPORTED','UNVERIFIED'))
);
CREATE TABLE IF NOT EXISTS utl_circuits (
 circuit_id TEXT PRIMARY KEY,
 entry_profile TEXT NOT NULL CHECK(entry_profile IN ('E1','E2','UNDETERMINED')),
 description TEXT NOT NULL,
 evidence_url TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS utl_item_circuits (
 work_item_id TEXT NOT NULL REFERENCES utl_work_items(work_item_id),
 circuit_id TEXT NOT NULL REFERENCES utl_circuits(circuit_id),
 evidence_url TEXT NOT NULL,
 PRIMARY KEY(work_item_id,circuit_id)
);
CREATE TABLE IF NOT EXISTS utl_continuities (
 continuity_id TEXT PRIMARY KEY,
 root_id TEXT REFERENCES utl_continuities(continuity_id),
 evidence_url TEXT NOT NULL,
 evidence_level TEXT NOT NULL CHECK(evidence_level IN ('SOURCE_DOCUMENTED','OWNER_REPORTED','UNVERIFIED'))
);
CREATE TABLE IF NOT EXISTS utl_item_continuities (
 work_item_id TEXT NOT NULL REFERENCES utl_work_items(work_item_id),
 continuity_id TEXT NOT NULL REFERENCES utl_continuities(continuity_id),
 evidence_url TEXT NOT NULL,
 PRIMARY KEY(work_item_id,continuity_id)
);
CREATE TABLE IF NOT EXISTS utl_pr_links (
 pr_number INTEGER NOT NULL REFERENCES merged_prs(pr_number),
 work_item_id TEXT NOT NULL REFERENCES utl_work_items(work_item_id),
 relation TEXT NOT NULL CHECK(relation IN ('IMPLEMENTATION','CORRECTION','DOCUMENTATION','RELATED')),
 evidence_url TEXT NOT NULL,
 evidence_level TEXT NOT NULL CHECK(evidence_level IN ('SOURCE_DOCUMENTED','OWNER_REPORTED','UNVERIFIED')),
 PRIMARY KEY(pr_number,work_item_id,relation)
);
CREATE TABLE IF NOT EXISTS utl_runtime_observations (
 observation_id INTEGER PRIMARY KEY,
 observed_at TEXT NOT NULL,
 environment TEXT NOT NULL,
 github_main_sha TEXT NOT NULL CHECK(length(github_main_sha)=40),
 runtime_sha TEXT NOT NULL CHECK(length(runtime_sha)=40),
 alignment TEXT NOT NULL CHECK(alignment IN ('FULLY_ALIGNED','DIVERGENCE','NON_VERIFIABLE')),
 state_version INTEGER,
 evidence_origin TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS utl_reconciliation_runs (
 snapshot_id TEXT PRIMARY KEY,
 imported_at TEXT NOT NULL,
 source_main_sha TEXT NOT NULL,
 merge_pr_count INTEGER NOT NULL,
 main_commit_count INTEGER NOT NULL,
 main_ci_count INTEGER NOT NULL,
 deploy_count INTEGER NOT NULL,
 validation TEXT NOT NULL CHECK(validation='PASS')
);
CREATE INDEX IF NOT EXISTS idx_utl_pr_links_work_item ON utl_pr_links(work_item_id);
CREATE INDEX IF NOT EXISTS idx_utl_work_items_mandate ON utl_work_items(mandate_id);

-- Each PR is visible even if the linked UTL, task or continuity is unknown.
CREATE VIEW IF NOT EXISTS v_utl_pr_reconciliation AS
SELECT p.pr_number,p.merged_at_utc,p.merge_sha,p.title,p.pr_url,
 ci.run_id AS ci_main_run_id,ci.conclusion AS ci_conclusion,
 gd.run_id AS governed_deploy_run_id,gd.conclusion AS deploy_conclusion,
 rt.evidence_status AS historical_runtime_status,rt.runtime_sha AS historical_runtime_sha,
 (SELECT group_concat(DISTINCT link.work_item_id) FROM utl_pr_links link WHERE link.pr_number=p.pr_number AND link.evidence_level='SOURCE_DOCUMENTED') AS linked_work_items,
 CASE
   WHEN NOT EXISTS(SELECT 1 FROM utl_pr_links link WHERE link.pr_number=p.pr_number AND link.evidence_level='SOURCE_DOCUMENTED')
   THEN 'UTL_MAPPING_NOT_ATTESTED'
   WHEN ci.run_id IS NULL OR gd.run_id IS NULL OR rt.evidence_status IS NULL OR rt.evidence_status!='SOURCE_ATTESTED'
   THEN 'EVIDENCE_INCOMPLETE'
   ELSE 'SOURCE_ATTESTED'
 END AS reconciliation_status
FROM merged_prs p
LEFT JOIN workflow_evidence ci ON ci.pr_number=p.pr_number AND ci.kind='CI_MAIN'
LEFT JOIN workflow_evidence gd ON gd.pr_number=p.pr_number AND gd.kind='GOVERNED_DEPLOY_MCP'
LEFT JOIN runtime_evidence rt ON rt.pr_number=p.pr_number;

CREATE VIEW IF NOT EXISTS v_utl_work_history AS
SELECT i.work_item_id,i.work_type,i.label,i.mandate_id,
 l.pr_number,l.relation,l.evidence_level,p.merge_sha,p.merged_at_utc,
 (SELECT group_concat(DISTINCT ic.continuity_id) FROM utl_item_continuities ic WHERE ic.work_item_id=i.work_item_id) AS continuity_ids,
 (SELECT group_concat(DISTINCT ec.circuit_id) FROM utl_item_circuits ec WHERE ec.work_item_id=i.work_item_id) AS circuits
FROM utl_work_items i LEFT JOIN utl_pr_links l ON l.work_item_id=i.work_item_id
LEFT JOIN merged_prs p ON p.pr_number=l.pr_number;

-- Absence of a matched observation does NOT mean the operation failed.
CREATE VIEW IF NOT EXISTS v_utl_evidence_gaps AS
SELECT pr_number, 'UTL_LINK_UNRESOLVED' AS gap_type,'MISSING_RELATION' AS evidence_state
FROM v_utl_pr_reconciliation WHERE linked_work_items IS NULL
UNION ALL SELECT pr_number,'CI_MAIN_NOT_FOUND','MISSING_OBSERVATION'
FROM v_utl_pr_reconciliation WHERE ci_main_run_id IS NULL
UNION ALL SELECT pr_number,'DEPLOY_NOT_FOUND','MISSING_OBSERVATION'
FROM v_utl_pr_reconciliation WHERE governed_deploy_run_id IS NULL
UNION ALL SELECT pr_number,'HISTORICAL_RUNTIME_NOT_SOURCE_ATTESTED','NOT_ATTESTED'
FROM v_utl_pr_reconciliation WHERE historical_runtime_status IS NULL OR historical_runtime_status!='SOURCE_ATTESTED';
