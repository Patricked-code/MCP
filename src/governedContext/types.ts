import type { LiveStateSnapshot } from '../liveState/types.js';
import type {
  CapabilityReality,
  GovernanceDecision,
  TaskReality
} from '../governance/operationalDecision.js';
import type {
  GovernedCheckpoint,
  GovernedLockRecord,
  GovernedSessionPublicRecord,
  GovernedTaskRecord,
  BootstrapReceipt,
  IdentityAssurance
} from '../operationalMemory/types.js';

export type GithubEvidenceFreshness = 'CURRENT' | 'UNAVAILABLE' | 'NOT_APPLICABLE';
export type GithubEvidenceProvenance = 'github_api' | 'memory_cache';

export type GithubEvidenceObservation = {
  freshness: GithubEvidenceFreshness;
  observedAt: string;
  provenance: GithubEvidenceProvenance;
};

export type GithubOperationalContext = {
  status: 'CURRENT' | 'DEGRADED' | 'UNAVAILABLE';
  observedAt: string;
  mainHead: string | null;
  workBranch: string | null;
  workBranchHead: string | null;
  pullRequest: {
    number: number;
    state: 'open' | 'closed';
    draft: boolean;
    merged: boolean;
    base: string;
    head: string;
    headSha: string;
    author: string | null;
    updatedAt: string;
  } | null;
  checks: {
    status: 'queued' | 'in_progress' | 'completed' | 'unavailable';
    conclusion: string | null;
    total: number;
    failed: number;
    headSha: string | null;
    exactHead: boolean | null;
    required: Array<{
      context: string;
      status: string;
      conclusion: string | null;
    }>;
    requiredSatisfied: boolean | null;
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
  ownership: {
    pullRequestAuthor: string | null;
  };
  activity: {
    lastActivityAt: string | null;
  };
  cache: {
    status: 'MISS' | 'HIT' | 'REFRESHED';
    observedAt: string;
    provenance: GithubEvidenceProvenance;
  };
  evidence: {
    main: GithubEvidenceObservation;
    pullRequest: GithubEvidenceObservation;
    checks: GithubEvidenceObservation;
    reviews: GithubEvidenceObservation;
    ruleset: GithubEvidenceObservation;
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
  bootstrap: {
    required: true;
    status: 'MISSING' | 'CURRENT' | 'STALE' | 'EXPIRED';
    receipt: BootstrapReceipt | null;
    limitations: string[];
  };
  currentState: {
    catalogueDigest: string | null;
    inventoryDigest: string | null;
    governanceDigest: string | null;
    auditBaselineValid: boolean | null;
  };
  workQueue: {
    storeRevision: number | null;
    total: number;
    byStatus: Record<string, number>;
  };
  currentTask: GovernedTaskRecord | null;
  firstExecutableTask: GovernedTaskRecord | null;
  capabilityReality: CapabilityReality[];
  taskReality: TaskReality | null;
  governanceDecision: GovernanceDecision | null;
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
