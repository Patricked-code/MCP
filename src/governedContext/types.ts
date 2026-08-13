import type { LiveStateSnapshot } from '../liveState/types.js';
import type {
  GovernedCheckpoint,
  GovernedLockRecord,
  GovernedSessionPublicRecord,
  IdentityAssurance
} from '../operationalMemory/types.js';

export type GithubOperationalContext = {
  status: 'CURRENT' | 'DEGRADED' | 'UNAVAILABLE';
  observedAt: string;
  mainHead: string | null;
  workBranch: string | null;
  pullRequest: {
    number: number;
    state: 'open' | 'closed';
    draft: boolean;
    merged: boolean;
    base: string;
    head: string;
    headSha: string;
    updatedAt: string;
  } | null;
  checks: {
    status: 'queued' | 'in_progress' | 'completed' | 'unavailable';
    conclusion: string | null;
    total: number;
    failed: number;
  };
  reviews: {
    approvals: number;
    changesRequested: number;
    unresolvedThreads: number | null;
  };
  ruleset: {
    name: string | null;
    enforcement: string | null;
    requiresPullRequest: boolean | null;
    requiredStatusChecks: string[];
    requiresConversationResolution: boolean | null;
  };
  error: string | null;
};

export type PublicGovernedSession = GovernedSessionPublicRecord;
export type PublicGovernedLock = GovernedLockRecord;

export type GovernedOperationalContext = {
  schemaVersion: 1;
  generatedAt: string;
  freshness: 'CURRENT' | 'STALE' | 'DEGRADED';
  repository: 'Patricked-code/MCP';
  governedBranch: 'main';
  liveState: LiveStateSnapshot | null;
  github: GithubOperationalContext;
  session: PublicGovernedSession | null;
  activeLocks: PublicGovernedLock[];
  lastCheckpoint: GovernedCheckpoint | null;
  blockers: string[];
  nextAction: string | null;
  gate: {
    mode: 'off' | 'shadow';
    existingWriteToolsEnabled: boolean;
    decision:
      | 'read_only'
      | 'shadow_observed'
      | 'session_unbound'
      | 'context_unacknowledged'
      | 'lock_conflict';
  };
  proof: {
    identityAssurance: IdentityAssurance | null;
    runtimeRealtimeAvailable: boolean;
    limitations: string[];
  };
};
