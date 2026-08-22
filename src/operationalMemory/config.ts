import { env } from '../config/env.js';

export const DEFAULT_GOVERNED_SESSION_STORE_PATH = '/app/data/mcp-governed-sessions.json';
export const DEFAULT_GOVERNED_LOCK_STORE_PATH = '/app/data/mcp-governed-locks.json';
export const DEFAULT_OPERATIONAL_EVENT_JOURNAL_PATH = '/app/data/mcp-operational-events.jsonl';
export const DEFAULT_GOVERNED_TASK_STORE_PATH = '/app/data/mcp-governed-tasks.json';

export const operationalMemoryConfig = Object.freeze({
  enabled: env.MCP_GOVERNED_SESSIONS_ENABLED,
  sessionIdleTtlSeconds: env.MCP_GOVERNED_SESSION_IDLE_TTL_SECONDS,
  sessionResumeGraceSeconds: env.MCP_GOVERNED_SESSION_RESUME_GRACE_SECONDS,
  lockDefaultTtlSeconds: env.MCP_GOVERNED_LOCK_DEFAULT_TTL_SECONDS,
  lockMaxTtlSeconds: env.MCP_GOVERNED_LOCK_MAX_TTL_SECONDS,
  writeGateMode: env.MCP_WRITE_GATE_MODE,
  eventMaxBytes: env.MCP_OPERATIONAL_EVENT_MAX_BYTES,
  eventArchives: env.MCP_OPERATIONAL_EVENT_ARCHIVES,
  sessionStorePath: DEFAULT_GOVERNED_SESSION_STORE_PATH,
  lockStorePath: DEFAULT_GOVERNED_LOCK_STORE_PATH,
  taskStorePath: DEFAULT_GOVERNED_TASK_STORE_PATH,
  eventJournalPath: DEFAULT_OPERATIONAL_EVENT_JOURNAL_PATH
});

export type OperationalMemoryConfig = typeof operationalMemoryConfig;
