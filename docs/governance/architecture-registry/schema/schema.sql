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
