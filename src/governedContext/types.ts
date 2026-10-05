import type { LiveStateSnapshot } from '../liveState/types.js';
import type { GithubIdentityResolution } from '../github/identityResolution.js';
import type { GithubRepositoryResolution } from '../github/repositoryResolution.js';
import type { GithubProjectResolution } from '../github/projectResolution.js';
import type { ProjectReality } from '../github/projectReality.js';
import type { ProjectGovernanceInheritance } from '../governedWorkflow/governance/projectInheritance.js';
import type { DomainResolution } from '../governedWorkflow/resolvers/domain.js';
import type { RuntimeResolution } from '../governedWorkflow/resolvers/runtime.js';
import type { ServerResolution } from '../governedWorkflow/resolvers/server.js';
import type {
  CapabilityReality,
  GovernanceDecision,
  TaskReality
} from '../governance/operationalDecision.js';
import type { ClientEvidence } from '../operationalMemory/connectionContext.js';
import type { ClientPresence } from '../operationalMemory/clientPresence.js';
import type { ToolSurfaceProjection } from '../governance/toolSurfaceAttestation.js';
import type {
  GovernedCheckpoint,
  GovernedLockRecord,
  GovernedSessionPublicRecord,
  GovernedTaskRecord,
  BootstrapReceipt,
  IdentityAssurance
} from '../operationalMemory/types.js';
import type { GovernedRepositoryTarget } from '../operationalMemory/sessionService.js';
import type { TargetContext, TargetScope } from '../operationalMemory/targetScope.js';

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
    /** Commit shared by the effective review evidence when GitHub exposes one exact binding. */
    headSha?: string | null;
    /** True only when the effective review evidence is bound to the current pull-request head. */
    exactHead?: boolean | null;
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
  /** Always projected by the governed service; optional only for historical in-process consumers. */
  identity?: GithubIdentityResolution;
  /** Always projected with an identity scope after B2; optional for historical consumers. */
  repositoryResolution?: GithubRepositoryResolution;
  /** Always projected with an identity scope after C2; optional for historical consumers. */
  projectResolution?: GithubProjectResolution;
  /** C3: GW-07 server resolution, projected with an identity scope after C3. */
  serverResolution?: ServerResolution;
  /** C4: GW-08 runtime resolution chained after the server resolution. */
  runtimeResolution?: RuntimeResolution;
  /** C5: GW-09 domain resolution chained after the project and server resolutions. */
  domainResolution?: DomainResolution;
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
  repository: GovernedRepositoryTarget;
  governedBranch: string;
  targetContext: TargetContext | null;
  targetScope: TargetScope | null;
  liveState: LiveStateSnapshot | null;
  github: GithubOperationalContext;
  /**
   * C345-02: repository -> project -> server -> runtime -> ingress -> domain
   * composed from the GitHub context resolutions. Always projected by the
   * governed service; optional for historical in-process consumers.
   */
  projectReality?: ProjectReality;
  /**
   * D1: branch, pull-request, test, deploy, lock and write constraints the
   * proven project scope inherits from existing authorities. Always projected
   * by the governed service; optional for historical in-process consumers.
   */
  governanceInheritance?: ProjectGovernanceInheritance;
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
    /** Always projected by the governed service after A2.2.2; optional for historical consumers. */
    clientEvidence?: ClientEvidence;
    clientPresence?: ClientPresence;
    toolSurface?: ToolSurfaceProjection;
  };
};
