export type CallabilityStatus = 'CALLABLE' | 'NOT_CALLABLE' | 'UNKNOWN';
export type CallabilitySource = 'SERVER' | 'TRANSPORT' | 'CLIENT_ATTESTATION';
export type TriStateStatus = 'TRUE' | 'FALSE' | 'UNKNOWN';

export type CapabilityReality = {
  toolName: string;
  registered: boolean;
  callability: {
    status: CallabilityStatus;
    source: CallabilitySource;
  };
  authorized: {
    status: TriStateStatus;
  };
  safeNow: boolean;
  reasonCodes: string[];
  requiredEvidence: string[];
  observedAt: string;
  provenance: string[];
};

export type CapabilityRealityInput = {
  toolName: string;
  registered: boolean;
  callability?: CapabilityReality['callability'];
  authorized?: CapabilityReality['authorized'];
  governanceSafe: boolean;
  observedAt: string;
  provenance?: string[];
};

type RegisteredToolProjection = {
  name: string;
};

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

export function deriveCapabilityReality(input: CapabilityRealityInput): CapabilityReality {
  const callability = input.callability ?? {
    status: 'UNKNOWN' as const,
    source: 'SERVER' as const
  };
  const authorized = input.authorized ?? { status: 'UNKNOWN' as const };
  const reasonCodes: string[] = [];
  const requiredEvidence: string[] = [];

  if (!input.registered) reasonCodes.push('TOOL_NOT_REGISTERED');
  if (callability.status === 'UNKNOWN') {
    reasonCodes.push('CALLABILITY_UNATTESTED');
    requiredEvidence.push('callability_attestation');
  } else if (callability.status === 'NOT_CALLABLE') {
    reasonCodes.push('CLIENT_OR_TRANSPORT_ACTION_NOT_EXPOSED');
  }
  if (authorized.status === 'UNKNOWN') {
    reasonCodes.push('AUTHORIZATION_UNATTESTED');
    requiredEvidence.push('authorization_attestation');
  } else if (authorized.status === 'FALSE') {
    reasonCodes.push('ACTION_NOT_AUTHORIZED');
  }
  if (!input.governanceSafe) reasonCodes.push('GOVERNANCE_PRECONDITIONS_NOT_SATISFIED');

  const safeNow = Boolean(
    input.registered
    && callability.status === 'CALLABLE'
    && authorized.status === 'TRUE'
    && input.governanceSafe
  );

  return {
    toolName: input.toolName,
    registered: input.registered,
    callability,
    authorized,
    safeNow,
    reasonCodes: unique(reasonCodes),
    requiredEvidence: unique(requiredEvidence),
    observedAt: input.observedAt,
    provenance: unique(input.provenance ?? [])
  };
}

export function projectRegisteredCapabilityRealities(
  tools: RegisteredToolProjection[],
  observedAt: string
): CapabilityReality[] {
  return [...tools]
    .sort((left, right) => left.name.localeCompare(right.name))
    .map((tool) => deriveCapabilityReality({
      toolName: tool.name,
      registered: true,
      governanceSafe: true,
      observedAt,
      provenance: ['runtime_catalogue']
    }));
}

export type TaskObservedPhase =
  | 'UNKNOWN'
  | 'DISCOVERED'
  | 'IN_PROGRESS'
  | 'REVIEW'
  | 'MERGE_READY'
  | 'DEPLOYING'
  | 'VERIFYING'
  | 'VERIFIED';

export type TaskRealityDrift =
  | 'ALIGNED'
  | 'TASK_STATE_BEHIND_REALITY'
  | 'TASK_STATE_AHEAD_OF_REALITY'
  | 'EVIDENCE_UNAVAILABLE';

export type TaskRealityEvidence = {
  githubWorkStateAvailable: boolean;
  pullRequestMerged: boolean;
  ciExactHeadSuccess: boolean;
  deploymentExactShaSuccess: boolean;
  runtimeAligned: boolean;
  documentationAligned: boolean;
};

export type TaskReality = {
  declaredStatus: string;
  observedPhase: TaskObservedPhase;
  drift: TaskRealityDrift;
  evidence: TaskRealityEvidence;
  recommendedLifecyclePath: string[];
  observedAt: string;
};

const LIFECYCLE_PATH = [
  'READY',
  'CLAIMED',
  'IN_PROGRESS',
  'REVIEW',
  'MERGE_READY',
  'DEPLOYING',
  'VERIFYING',
  'DONE'
] as const;

const DECLARED_RANK: Record<string, number> = {
  DISCOVERED: 0,
  READY: 1,
  CLAIMED: 2,
  IN_PROGRESS: 3,
  REVIEW: 4,
  MERGE_READY: 5,
  DEPLOYING: 6,
  VERIFYING: 7,
  DONE: 8
};

const OBSERVED_RANK: Record<TaskObservedPhase, number> = {
  UNKNOWN: -1,
  DISCOVERED: 0,
  IN_PROGRESS: 3,
  REVIEW: 4,
  MERGE_READY: 5,
  DEPLOYING: 6,
  VERIFYING: 7,
  VERIFIED: 8
};

function observedTaskPhase(evidence: TaskRealityEvidence): TaskObservedPhase {
  if (!evidence.githubWorkStateAvailable) return 'UNKNOWN';
  if (
    evidence.pullRequestMerged
    && evidence.ciExactHeadSuccess
    && evidence.deploymentExactShaSuccess
    && evidence.runtimeAligned
    && evidence.documentationAligned
  ) return 'VERIFIED';
  if (evidence.deploymentExactShaSuccess) {
    return evidence.runtimeAligned && evidence.documentationAligned ? 'VERIFYING' : 'DEPLOYING';
  }
  if (evidence.pullRequestMerged && evidence.ciExactHeadSuccess) return 'MERGE_READY';
  if (evidence.ciExactHeadSuccess) return 'REVIEW';
  if (evidence.pullRequestMerged) return 'REVIEW';
  return 'IN_PROGRESS';
}

export function deriveTaskReality(input: {
  declaredStatus: string;
  evidence: TaskRealityEvidence;
  observedAt: string;
}): TaskReality {
  const observedPhase = observedTaskPhase(input.evidence);
  const declaredRank = DECLARED_RANK[input.declaredStatus] ?? -1;
  const observedRank = OBSERVED_RANK[observedPhase];
  let drift: TaskRealityDrift;
  if (!input.evidence.githubWorkStateAvailable) drift = 'EVIDENCE_UNAVAILABLE';
  else if (declaredRank < observedRank) drift = 'TASK_STATE_BEHIND_REALITY';
  else if (declaredRank > observedRank) drift = 'TASK_STATE_AHEAD_OF_REALITY';
  else drift = 'ALIGNED';

  return {
    declaredStatus: input.declaredStatus,
    observedPhase,
    drift,
    evidence: input.evidence,
    recommendedLifecyclePath: drift === 'ALIGNED' || drift === 'EVIDENCE_UNAVAILABLE'
      ? []
      : [...LIFECYCLE_PATH],
    observedAt: input.observedAt
  };
}

export type GovernanceDecisionTask = {
  taskId: string;
  status: string;
} | null;

export type GovernanceDecisionSession = {
  governedSessionId: string;
  status: string;
} | null;

export type GovernanceDecision = {
  operation: string;
  task: GovernanceDecisionTask;
  taskReality: TaskReality | null;
  session: GovernanceDecisionSession;
  owner: string | null;
  bootstrap: {
    status: string;
    stateVersion: number | null;
  } | null;
  dependencies: string[];
  resourceScopes: string[];
  locks: {
    activeConflictCount: number;
  };
  githubWorkState: {
    status: string;
    error: string | null;
    mainHead: string | null;
    workBranch: string | null;
    workBranchHead: string | null;
  } | null;
  runtimeState: {
    status: string;
    revision: string | null;
    health: string | null;
  } | null;
  capabilityReality: CapabilityReality;
  requiredEvidence: string[];
  blockers: string[];
  nextSafeAction: string | null;
  mayMutate: boolean;
  reasonCodes: string[];
  observedAt: string;
};

export function deriveGovernanceDecision(input: {
  operation: string;
  capabilityReality: CapabilityReality;
  sessionPresent: boolean;
  bootstrapCurrent: boolean;
  lockConflicts: number;
  githubWorkStateAvailable: boolean;
  requiresGithubWorkState: boolean;
  requiredEvidence: string[];
  observedAt: string;
  task?: GovernanceDecisionTask;
  taskReality?: TaskReality | null;
  session?: GovernanceDecisionSession;
  owner?: string | null;
  bootstrap?: GovernanceDecision['bootstrap'];
  dependencies?: string[];
  resourceScopes?: string[];
  githubWorkState?: GovernanceDecision['githubWorkState'];
  runtimeState?: GovernanceDecision['runtimeState'];
}): GovernanceDecision {
  const reasons: string[] = [];
  if (!input.capabilityReality.safeNow) reasons.push(...input.capabilityReality.reasonCodes);
  if (!input.sessionPresent) reasons.push('SESSION_UNBOUND');
  if (!input.bootstrapCurrent) reasons.push('BOOTSTRAP_NOT_CURRENT');
  if (input.lockConflicts > 0) reasons.push('LOCK_CONFLICT');
  if (input.requiresGithubWorkState && !input.githubWorkStateAvailable) {
    reasons.push('GITHUB_WORK_STATE_UNAVAILABLE');
  }
  const reasonCodes = unique(reasons);
  const blockers = [...reasonCodes];
  const mayMutate = reasonCodes.length === 0;

  return {
    operation: input.operation,
    task: input.task ?? null,
    taskReality: input.taskReality ?? null,
    session: input.session ?? null,
    owner: input.owner ?? null,
    bootstrap: input.bootstrap ?? null,
    dependencies: unique(input.dependencies ?? []),
    resourceScopes: unique(input.resourceScopes ?? []),
    locks: { activeConflictCount: input.lockConflicts },
    githubWorkState: input.githubWorkState ?? null,
    runtimeState: input.runtimeState ?? null,
    capabilityReality: input.capabilityReality,
    requiredEvidence: unique([
      ...input.requiredEvidence,
      ...input.capabilityReality.requiredEvidence
    ]),
    blockers,
    nextSafeAction: mayMutate ? input.operation : null,
    mayMutate,
    reasonCodes,
    observedAt: input.observedAt
  };
}
