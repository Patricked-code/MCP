-- Schema SQLite dérivé; aucune seconde autorité runtime. La source durable est le snapshot Git.
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS observations (
  snapshot_id TEXT PRIMARY KEY, repository TEXT NOT NULL, observed_at TEXT NOT NULL,
  baseline_main_sha TEXT NOT NULL, branch_count INTEGER NOT NULL,
  files_main_count INTEGER NOT NULL, folders_main_count INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS branches (
  snapshot_id TEXT NOT NULL REFERENCES observations(snapshot_id),
  name TEXT NOT NULL, head_sha TEXT NOT NULL, protected INTEGER NOT NULL,
  prefix TEXT NOT NULL, head_url TEXT NOT NULL, PRIMARY KEY(snapshot_id,name)
);
CREATE INDEX IF NOT EXISTS idx_branches_sha ON branches(head_sha);
CREATE INDEX IF NOT EXISTS idx_branches_prefix ON branches(prefix);
CREATE TABLE IF NOT EXISTS files (
  snapshot_id TEXT NOT NULL REFERENCES observations(snapshot_id),
  branch_name TEXT NOT NULL, path TEXT NOT NULL, blob_sha TEXT NOT NULL,
  size_bytes INTEGER, git_mode TEXT, classification_status TEXT NOT NULL,
  PRIMARY KEY(snapshot_id,branch_name,path)
);
CREATE INDEX IF NOT EXISTS idx_files_blob ON files(blob_sha);
CREATE INDEX IF NOT EXISTS idx_files_path ON files(path);
CREATE TABLE IF NOT EXISTS components (
  snapshot_id TEXT NOT NULL REFERENCES observations(snapshot_id),
  component_id TEXT NOT NULL, name TEXT NOT NULL, kind TEXT NOT NULL,
  purpose TEXT, runtime_status TEXT, PRIMARY KEY(snapshot_id,component_id)
);
CREATE TABLE IF NOT EXISTS relations (
  snapshot_id TEXT NOT NULL REFERENCES observations(snapshot_id),
  relation_id TEXT NOT NULL, source_id TEXT NOT NULL, predicate TEXT NOT NULL,
  target_id TEXT NOT NULL, status TEXT NOT NULL, evidence_id TEXT,
  PRIMARY KEY(snapshot_id,relation_id)
);
CREATE INDEX IF NOT EXISTS idx_relations_source ON relations(source_id);
CREATE INDEX IF NOT EXISTS idx_relations_target ON relations(target_id);
CREATE TABLE IF NOT EXISTS sources (
  snapshot_id TEXT NOT NULL REFERENCES observations(snapshot_id),
  source_id TEXT NOT NULL, kind TEXT NOT NULL, uri TEXT NOT NULL, source_commit_sha TEXT,
  source_role TEXT NOT NULL, PRIMARY KEY(snapshot_id,source_id)
);
CREATE TABLE IF NOT EXISTS checkpoints (
  checkpoint_id TEXT PRIMARY KEY, snapshot_id TEXT NOT NULL REFERENCES observations(snapshot_id),
  recorded_at TEXT NOT NULL, status TEXT NOT NULL, next_action TEXT NOT NULL,
  evidence_json TEXT NOT NULL
);

-- Additive technical-format projection (not authority, not functional role).
CREATE TABLE IF NOT EXISTS file_technical_formats (
  snapshot_id TEXT NOT NULL,
  branch_name TEXT NOT NULL,
  path TEXT NOT NULL,
  blob_sha TEXT NOT NULL,
  format_type TEXT NOT NULL,
  technical_family TEXT NOT NULL,
  detected_by TEXT NOT NULL,
  signature_validation TEXT NOT NULL,
  functional_role_status TEXT NOT NULL,
  PRIMARY KEY(snapshot_id, branch_name, path),
  FOREIGN KEY(snapshot_id, branch_name, path)
    REFERENCES files(snapshot_id, branch_name, path)
);
CREATE INDEX IF NOT EXISTS idx_technical_formats_type ON file_technical_formats(format_type);

-- Views for historical per-branch technical inventories. All queries must be scoped
-- to a snapshot_id: branch names alone are not immutable Git identities.
CREATE VIEW IF NOT EXISTS v_branch_file_format_counts AS
SELECT f.snapshot_id AS snapshot_id, f.branch_name AS branch_name,
       t.format_type AS format_type, COUNT(*) AS file_count
FROM files AS f
JOIN file_technical_formats AS t
  ON f.snapshot_id=t.snapshot_id AND f.branch_name=t.branch_name AND f.path=t.path
GROUP BY f.snapshot_id,f.branch_name,t.format_type;

CREATE VIEW IF NOT EXISTS v_file_versions_across_branches AS
SELECT snapshot_id,path,COUNT(DISTINCT branch_name) AS branch_count,
       COUNT(DISTINCT blob_sha) AS version_count
FROM files
GROUP BY snapshot_id,path;

CREATE VIEW IF NOT EXISTS v_identical_content_across_branches AS
SELECT snapshot_id,blob_sha,COUNT(*) AS appearances,
       COUNT(DISTINCT branch_name) AS branch_count
FROM files
GROUP BY snapshot_id,blob_sha;

-- Additive documentary projection of main directory Git tree objects.
CREATE TABLE IF NOT EXISTS directories (
 snapshot_id TEXT NOT NULL REFERENCES observations(snapshot_id),
 branch_name TEXT NOT NULL, path TEXT NOT NULL, parent_path TEXT,
 commit_sha TEXT NOT NULL, tree_sha TEXT NOT NULL, git_mode TEXT NOT NULL,
 depth INTEGER NOT NULL, direct_files INTEGER NOT NULL, direct_directories INTEGER NOT NULL,
 descendant_files INTEGER NOT NULL, descendant_directories INTEGER NOT NULL,
 PRIMARY KEY(snapshot_id,branch_name,path)
);
CREATE INDEX IF NOT EXISTS idx_directory_tree_sha ON directories(tree_sha);
CREATE INDEX IF NOT EXISTS idx_directory_parent ON directories(snapshot_id,branch_name,parent_path);

-- Evidence-backed file-reference graph, documentary projection only.
CREATE TABLE IF NOT EXISTS verified_file_relations (
 snapshot_id TEXT NOT NULL, branch_name TEXT NOT NULL,
 relation_id TEXT NOT NULL, source_path TEXT NOT NULL,
 target_path TEXT NOT NULL, predicate TEXT NOT NULL,
 source_blob_sha TEXT NOT NULL, target_blob_sha TEXT NOT NULL,
 evidence_line INTEGER NOT NULL, status TEXT NOT NULL,
 PRIMARY KEY(snapshot_id, branch_name, relation_id),
 FOREIGN KEY(snapshot_id,branch_name,source_path)
   REFERENCES files(snapshot_id,branch_name,path),
 FOREIGN KEY(snapshot_id,branch_name,target_path)
   REFERENCES files(snapshot_id,branch_name,path)
);
CREATE INDEX IF NOT EXISTS idx_verified_file_relations_target
 ON verified_file_relations(snapshot_id,branch_name,target_path);
CREATE VIEW IF NOT EXISTS v_verified_direct_dependents AS
 SELECT snapshot_id,branch_name,target_path AS changed_file,
        source_path AS referencing_file,predicate,evidence_line,status
 FROM verified_file_relations;

-- Historical Git subtree reuse; no functional or runtime claims.
CREATE VIEW IF NOT EXISTS v_directory_versions_across_branches AS
SELECT snapshot_id, path, COUNT(DISTINCT branch_name) AS branch_count,
       COUNT(DISTINCT tree_sha) AS version_count
FROM directories
GROUP BY snapshot_id, path;
CREATE VIEW IF NOT EXISTS v_shared_subtree_content AS
SELECT snapshot_id, tree_sha, COUNT(*) AS appearances,
       COUNT(DISTINCT branch_name) AS branch_count
FROM directories
GROUP BY snapshot_id, tree_sha;

-- Source-role declarations are evidence-bound projections, not execution authority.
CREATE TABLE IF NOT EXISTS source_file_roles (
 snapshot_id TEXT NOT NULL,branch_name TEXT NOT NULL,
 path TEXT NOT NULL,blob_sha TEXT NOT NULL,role TEXT NOT NULL,
 status TEXT NOT NULL,evidence_line INTEGER NOT NULL,
 PRIMARY KEY(snapshot_id,branch_name,path,role),
 FOREIGN KEY(snapshot_id,branch_name,path) REFERENCES files(snapshot_id,branch_name,path)
);
CREATE INDEX IF NOT EXISTS idx_source_file_roles_role ON source_file_roles(role);
CREATE VIEW IF NOT EXISTS v_source_file_role_lookup AS
 SELECT snapshot_id,branch_name,path,role,status,evidence_line
 FROM source_file_roles;
