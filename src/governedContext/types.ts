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

export type GithubEvidenceFreshness = 'CURRENT' | 'STALE' | 'UNAVAILABLE' | 'NOT_APPLICABLE';
export type GithubEvidenceProvenance = 'github_api' | 'memory_cache';

export type GithubReasonCode =
  | 'GITHUB_CACHE_MISS'
  | 'GITHUB_SURFACE_NOT_EXPOSED'
  | 'GITHUB_AUTH_MISSING'
  | 'GITHUB_AUTH_INVALID'
  | 'GITHUB_PERMISSION_DENIED'
  | 'GITHUB_NOT_FOUND_OR_INVISIBLE'
  | 'GITHUB_TIMEOUT'
  | 'GITHUB_STALE'
  | 'GITHUB_HEAD_MISMATCH'
  | 'GITHUB_REQUIRED_CHECKS_PENDING'
  | 'GITHUB_REQUIRED_CHECKS_FAILED'
  | 'GITHUB_REVIEW_BLOCKING'
  | 'GITHUB_WORK_STATE_UNAVAILABLE';

export type GithubOperationalUncertainty = 'GITHUB_VISIBILITY_UNCERTAIN';

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
    requiredApprovingReviewCount?: number | null;
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
  reasonCodes: GithubReasonCode[];
  uncertainties: GithubOperationalUncertainty[];
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
