import type { GithubIdentityResolution } from '../../github/identityResolution.js';
import type { ProjectReality, ProjectRealityLayerId } from '../../github/projectReality.js';
import type { GithubMappingGovernance, GithubProjectResolution } from '../../github/projectResolution.js';
import type { RegistryCapabilities } from '../../github/registryV2.js';
import { deriveGovernancePreconditionReasons } from '../../governance/operationalDecision.js';
import type { IdentityAssurance } from '../../operationalMemory/types.js';
import type {
  InheritedRuleId,
  ProjectGovernanceInheritance,
  ProjectGovernanceScope
} from './projectInheritance.js';

/**
 * D2 (TB-W3-D2-01, GW-11, SLOT-11): the effective capabilities of a proven
 * project scope. One entry per capability class of the GitRegistry vocabulary,
 * each the fail-closed intersection of the evidence and governance that
 * already exist:
 * - DECLARED: the capability the mapping declares, once the mapping is validated;
 * - IDENTITY: the OAuth subject of the session and its current GitHub identity;
 * - TARGET: the project reality layers the capability acts on;
 * - GITHUB: the current GitHub work state of this repository, for repository mutations;
 * - GOVERNANCE: the rules the scope inherits (D1);
 * - PRECONDITIONS: the governance preconditions the scoped WRITE gate observes;
 * - AUTHORIZATION: attested authorization, which no authority provides yet.
 * A dimension that is not proven never permits: technical capability, identity,
 * registry declarations and tool presence never imply authorization.
 * Pure and read-only: no permission engine, no enforcement, no mutation.
 */
export type ProjectCapabilityId = keyof RegistryCapabilities;
export type ProjectCapabilityClass = 'READ' | 'WRITE' | 'PRODUCTION_EFFECT' | 'DESTRUCTIVE';
/** What the capability acts on: the repository, or the deployed component on its server. */
export type ProjectCapabilityBinding = 'REPOSITORY' | 'SERVER';
export type CapabilityDimension =
  | 'DECLARED'
  | 'IDENTITY'
  | 'TARGET'
  | 'GITHUB'
  | 'GOVERNANCE'
  | 'PRECONDITIONS'
  | 'AUTHORIZATION';
export type CapabilityDimensionState = 'SATISFIED' | 'UNSATISFIED' | 'UNKNOWN' | 'NOT_REQUIRED';
/** BLOCKED: a dimension is proven unsatisfied. UNVERIFIED: none is, but one is unknown. */
export type ProjectCapabilityStatus = 'EFFECTIVE' | 'BLOCKED' | 'UNVERIFIED';

export type ProjectEffectiveCapability = Readonly<{
  capabilityId: ProjectCapabilityId;
  operationClass: ProjectCapabilityClass;
  binding: ProjectCapabilityBinding;
  status: ProjectCapabilityStatus;
  effective: boolean;
  dimensions: Readonly<Record<CapabilityDimension, CapabilityDimensionState>>;
  /** Inherited rules of the governance dimension that are forbidding or unknown. */
  blockingRules: readonly InheritedRuleId[];
  /** Inherited rules (REQUIRE, FORBID or UNKNOWN) an execution must honour; never a permission. */
  obligations: readonly InheritedRuleId[];
  reasonCodes: readonly string[];
  requiredEvidence: readonly string[];
}>;

export type ProjectEffectiveCapabilities = Readonly<{
  status: 'PROJECTED' | 'UNVERIFIED' | 'CONFLICT';
  observedAt: string;
  scope: ProjectGovernanceScope | null;
  capabilities: readonly ProjectEffectiveCapability[];
  effectiveCapabilityIds: readonly ProjectCapabilityId[];
  reasonCodes: readonly string[];
  authorizationInferred: false;
  mutationPerformed: false;
}>;

/** The inputs of the scoped WRITE gate verdict; null lock conflicts mean the locks are unreadable. */
export type ProjectCapabilityPreconditions = Readonly<{
  sessionPresent: boolean;
  currentStateVersion: number | null;
  currentFreshness: 'CURRENT' | 'STALE' | null;
  acknowledgedStateVersion: number | null;
  activeLockConflicts: number | null;
  bootstrapReceiptStatus: 'MISSING' | 'CURRENT' | 'STALE' | 'EXPIRED' | null;
  currentTaskStatus: string | null;
  auditBaselineValid: boolean | null;
}>;

export type ProjectEffectiveCapabilitiesSource = {
  projectReality: ProjectReality | null | undefined;
  governanceInheritance: ProjectGovernanceInheritance | null | undefined;
  project: GithubProjectResolution | null | undefined;
  identity: Readonly<{
    /** Identity assurance of the governed session; null without a session. */
    assurance: IdentityAssurance | null;
    /** OAuth principal of the session connection context. */
    principalId: string | null;
    github: GithubIdentityResolution | null | undefined;
  }>;
  /** The repository the governed GitHub observer covers, and its work-state status. */
  github: Readonly<{
    repositoryId: string | null;
    status: 'CURRENT' | 'DEGRADED' | 'UNAVAILABLE';
  }>;
  preconditions: ProjectCapabilityPreconditions;
  observedAt: string;
};

type CapabilityProfile = Readonly<{
  operationClass: ProjectCapabilityClass;
  binding: ProjectCapabilityBinding;
  /** Inherited rules that decide the governance dimension; none for reads. */
  rules: readonly InheritedRuleId[];
  obligations: readonly InheritedRuleId[];
}>;

const MUTATION_RULES: readonly InheritedRuleId[] = ['WRITE_TOOLS', 'PROJECT_LOCKS'];
const BRANCH_OBLIGATIONS: readonly InheritedRuleId[] = ['DIRECT_PUSH_TO_OFFICIAL_BRANCH', 'BRANCH_PREFIXES'];
const INTEGRATION_OBLIGATIONS: readonly InheritedRuleId[] = [
  'PULL_REQUEST',
  'DRAFT_PULL_REQUEST',
  'REQUIRED_STATUS_CHECKS',
  'REQUIRED_APPROVALS',
  'CONVERSATION_RESOLUTION'
];

function profile(
  operationClass: ProjectCapabilityClass,
  binding: ProjectCapabilityBinding,
  rules: readonly InheritedRuleId[] = [],
  obligations: readonly InheritedRuleId[] = []
): CapabilityProfile {
  return Object.freeze({
    operationClass,
    binding,
    rules: Object.freeze([...rules]),
    obligations: Object.freeze([...obligations])
  });
}

// Every class of the GitRegistry vocabulary, in its order. The dirty-worktree
// rule of the branch policy forbids deploy and cleanup, hence CLEAN_WORKTREE.
const CATALOGUE: Readonly<Record<ProjectCapabilityId, CapabilityProfile>> = Object.freeze({
  inventory: profile('READ', 'REPOSITORY'),
  readFiles: profile('READ', 'REPOSITORY'),
  searchCode: profile('READ', 'REPOSITORY'),
  readLogs: profile('READ', 'SERVER'),
  gitStatus: profile('READ', 'SERVER'),
  writeFiles: profile('WRITE', 'REPOSITORY', ['WRITE_FILES', ...MUTATION_RULES], BRANCH_OBLIGATIONS),
  createBranch: profile('WRITE', 'REPOSITORY', ['CREATE_BRANCH', 'BRANCH_PREFIXES', ...MUTATION_RULES], ['BRANCH_PREFIXES']),
  commit: profile('WRITE', 'REPOSITORY', ['COMMIT', ...MUTATION_RULES], BRANCH_OBLIGATIONS),
  pushBranch: profile(
    'WRITE', 'REPOSITORY', ['PUSH_BRANCH', 'BRANCH_PREFIXES', ...MUTATION_RULES],
    [...BRANCH_OBLIGATIONS, ...INTEGRATION_OBLIGATIONS]
  ),
  build: profile('WRITE', 'SERVER', MUTATION_RULES),
  deploy: profile(
    'PRODUCTION_EFFECT', 'SERVER', ['DEPLOY', ...MUTATION_RULES],
    ['BACKUP_BEFORE_DEPLOY', 'REQUIRED_STATUS_CHECKS', 'CLEAN_WORKTREE']
  ),
  rollback: profile('PRODUCTION_EFFECT', 'SERVER', MUTATION_RULES, ['CLEAN_WORKTREE']),
  quarantine: profile('WRITE', 'SERVER', MUTATION_RULES, ['CLEAN_WORKTREE']),
  purge: profile('DESTRUCTIVE', 'SERVER', MUTATION_RULES, ['CLEAN_WORKTREE'])
});
const CAPABILITY_IDS = Object.freeze(Object.keys(CATALOGUE) as ProjectCapabilityId[]);

/** The registry makes capabilities explicit only once a mapping is validated. */
const DECLARING_MAPPING_STATUSES: ReadonlySet<string> = new Set(['validated', 'active']);
const TARGET_LAYERS: Readonly<Record<ProjectCapabilityBinding, readonly ProjectRealityLayerId[]>> = Object.freeze({
  REPOSITORY: Object.freeze(['REPOSITORY', 'PROJECT'] as const),
  SERVER: Object.freeze(['REPOSITORY', 'PROJECT', 'SERVER'] as const)
});
const MAX_LIST = 50;

type Assessment = Readonly<{
  state: CapabilityDimensionState;
  reasons: readonly string[];
  evidence: readonly string[];
}>;

const SATISFIED: Assessment = Object.freeze({ state: 'SATISFIED', reasons: [], evidence: [] });
const NOT_REQUIRED: Assessment = Object.freeze({ state: 'NOT_REQUIRED', reasons: [], evidence: [] });

function unsatisfied(...reasons: string[]): Assessment {
  return Object.freeze({ state: 'UNSATISFIED', reasons, evidence: [] });
}

function unknown(evidence: string, ...reasons: string[]): Assessment {
  return Object.freeze({ state: 'UNKNOWN', reasons, evidence: [evidence] });
}

/** A proven negative decides; otherwise any unknown part keeps the dimension unknown. */
function combine(parts: readonly Assessment[]): Assessment {
  if (parts.length === 0) return SATISFIED;
  const state: CapabilityDimensionState = parts.some((part) => part.state === 'UNSATISFIED')
    ? 'UNSATISFIED'
    : parts.some((part) => part.state === 'UNKNOWN') ? 'UNKNOWN' : 'SATISFIED';
  return Object.freeze({
    state,
    reasons: parts.flatMap((part) => part.reasons),
    evidence: parts.flatMap((part) => part.evidence)
  });
}

function uniqueSorted<T extends string>(values: readonly T[]): readonly T[] {
  return Object.freeze([...new Set(values)].sort().slice(0, MAX_LIST));
}

function repositoryKey(value: string | null | undefined): string | null {
  return value ? value.trim().replace(/^github:/i, '').toLowerCase() : null;
}

function assessIdentity(identity: ProjectEffectiveCapabilitiesSource['identity']): Assessment {
  const parts: Assessment[] = [];
  if (identity.assurance === null) {
    parts.push(unknown('oauth_subject_identity', 'CAPABILITY_IDENTITY_UNBOUND'));
  } else if (identity.assurance !== 'oauth_subject') {
    parts.push(unsatisfied('CAPABILITY_IDENTITY_ASSURANCE_INSUFFICIENT'));
  } else if (!identity.principalId) {
    parts.push(unknown('oauth_subject_identity', 'CAPABILITY_IDENTITY_UNBOUND'));
  }
  const github = identity.github;
  if (!github || github.status === 'UNVERIFIED' || (github.status === 'RESOLVED' && github.freshness !== 'CURRENT')) {
    parts.push(unknown('github_identity_resolution', 'CAPABILITY_GITHUB_IDENTITY_UNVERIFIED'));
  } else if (github.status !== 'RESOLVED') {
    parts.push(unsatisfied('CAPABILITY_GITHUB_IDENTITY_UNRESOLVED'));
  } else if (identity.principalId && github.oauthPrincipalId !== identity.principalId) {
    // The GitHub identity resolved for another principal never speaks for this one.
    parts.push(unsatisfied('CAPABILITY_IDENTITY_PRINCIPAL_MISMATCH'));
  }
  return combine(parts);
}

function assessDeclared(capabilityId: ProjectCapabilityId, governance: GithubMappingGovernance | null): Assessment {
  if (!governance) return unknown('git_registry_capability_declaration', 'GOVERNANCE_MAPPING_UNDECLARED');
  if (governance.capabilities[capabilityId] !== true) return unsatisfied('CAPABILITY_NOT_DECLARED');
  if (governance.candidateFromV1 || !DECLARING_MAPPING_STATUSES.has(governance.status)) {
    return unknown('git_registry_capability_declaration', 'CAPABILITY_DECLARATION_UNVALIDATED');
  }
  return SATISFIED;
}

function assessTarget(binding: ProjectCapabilityBinding, reality: ProjectReality): Assessment {
  return combine(TARGET_LAYERS[binding].map((layerId) => {
    const state = reality.layers.find((layer) => layer.layer === layerId)?.state;
    if (state === 'VERIFIED') return SATISFIED;
    if (state === 'CONFLICT' || state === 'NONE') return unsatisfied(`CAPABILITY_TARGET_${layerId}_${state}`);
    return unknown('project_reality', `CAPABILITY_TARGET_${layerId}_UNVERIFIED`);
  }));
}

function assessGithub(
  profileEntry: CapabilityProfile,
  github: ProjectEffectiveCapabilitiesSource['github'],
  scope: ProjectGovernanceScope
): Assessment {
  if (profileEntry.operationClass === 'READ' || profileEntry.binding !== 'REPOSITORY') return NOT_REQUIRED;
  // The observer's work state belongs to its own repository: never lent to another one.
  if (repositoryKey(github.repositoryId) !== repositoryKey(scope.repositoryId)) {
    return unknown('github_work_state', 'CAPABILITY_GITHUB_NOT_OBSERVED');
  }
  return github.status === 'CURRENT' ? SATISFIED : unknown('github_work_state', 'CAPABILITY_GITHUB_UNAVAILABLE');
}

function assessGovernance(
  profileEntry: CapabilityProfile,
  inheritance: ProjectGovernanceInheritance
): { assessment: Assessment; blockingRules: readonly InheritedRuleId[] } {
  if (profileEntry.rules.length === 0) return { assessment: NOT_REQUIRED, blockingRules: Object.freeze([]) };
  const blockingRules: InheritedRuleId[] = [];
  const parts = profileEntry.rules.map((ruleId): Assessment => {
    const rule = inheritance.rules.find((entry) => entry.ruleId === ruleId);
    if (!rule || rule.effect === 'UNKNOWN') {
      blockingRules.push(ruleId);
      return unknown('governance_inheritance', 'CAPABILITY_GOVERNANCE_UNKNOWN', ...(rule?.reasonCodes ?? []));
    }
    if (rule.effect === 'FORBID') {
      blockingRules.push(ruleId);
      return unsatisfied('CAPABILITY_FORBIDDEN_BY_GOVERNANCE', ...rule.reasonCodes);
    }
    return SATISFIED;
  });
  return { assessment: combine(parts), blockingRules: uniqueSorted(blockingRules) };
}

function obligationsOf(profileEntry: CapabilityProfile, inheritance: ProjectGovernanceInheritance): readonly InheritedRuleId[] {
  return uniqueSorted(profileEntry.obligations.filter((ruleId) => (
    inheritance.rules.find((entry) => entry.ruleId === ruleId)?.effect !== 'PERMIT'
  )));
}

/** The same derivation as the scoped WRITE gate verdict: reproduced, never changed. */
function assessPreconditions(preconditions: ProjectCapabilityPreconditions): Assessment {
  const reasons = deriveGovernancePreconditionReasons({
    ...preconditions,
    activeLockConflicts: preconditions.activeLockConflicts ?? 0
  });
  if (reasons.length > 0) return unsatisfied(...reasons);
  if (preconditions.activeLockConflicts === null) {
    return unknown('governed_lock_service', 'GOVERNANCE_LOCKS_UNAVAILABLE');
  }
  return SATISFIED;
}

const AUTHORIZATION: Assessment = Object.freeze({
  state: 'UNKNOWN',
  reasons: ['AUTHORIZATION_UNATTESTED'],
  evidence: ['authorization_attestation']
});

function unverified(observedAt: string): ProjectEffectiveCapabilities {
  return Object.freeze({
    status: 'UNVERIFIED' as const,
    observedAt,
    scope: null,
    capabilities: Object.freeze([]),
    effectiveCapabilityIds: Object.freeze([]),
    reasonCodes: Object.freeze(['CAPABILITY_SCOPE_UNVERIFIED']),
    authorizationInferred: false as const,
    mutationPerformed: false as const
  });
}

export function deriveProjectEffectiveCapabilities(
  input: ProjectEffectiveCapabilitiesSource
): ProjectEffectiveCapabilities {
  const reality = input.projectReality;
  const inheritance = input.governanceInheritance;
  const scope = inheritance?.status === 'UNVERIFIED' ? null : inheritance?.scope ?? null;
  // Only the scope proven by the project reality and inherited by D1 has capabilities.
  if (
    !reality
    || !inheritance
    || !scope
    || reality.projectId !== scope.projectId
    || repositoryKey(reality.repositoryId) !== repositoryKey(scope.repositoryId)
  ) {
    return unverified(input.observedAt);
  }
  const mapping = input.project?.selectedMapping ?? null;
  const governance = mapping
    && mapping.mappingId === scope.mappingId
    && repositoryKey(mapping.repositoryId) === repositoryKey(scope.repositoryId)
    ? mapping.governance ?? null
    : null;
  const identity = assessIdentity(input.identity);
  const preconditions = assessPreconditions(input.preconditions);

  const capabilities = CAPABILITY_IDS.map((capabilityId): ProjectEffectiveCapability => {
    const entry = CATALOGUE[capabilityId];
    const read = entry.operationClass === 'READ';
    const governanceAssessment = assessGovernance(entry, inheritance);
    const parts: Record<CapabilityDimension, Assessment> = {
      DECLARED: assessDeclared(capabilityId, governance),
      IDENTITY: identity,
      TARGET: assessTarget(entry.binding, reality),
      GITHUB: assessGithub(entry, input.github, scope),
      GOVERNANCE: governanceAssessment.assessment,
      PRECONDITIONS: read ? NOT_REQUIRED : preconditions,
      AUTHORIZATION
    };
    const assessments = Object.values(parts);
    const status: ProjectCapabilityStatus = assessments.some((part) => part.state === 'UNSATISFIED')
      ? 'BLOCKED'
      : assessments.some((part) => part.state === 'UNKNOWN') ? 'UNVERIFIED' : 'EFFECTIVE';
    return Object.freeze({
      capabilityId,
      operationClass: entry.operationClass,
      binding: entry.binding,
      status,
      effective: status === 'EFFECTIVE',
      dimensions: Object.freeze(Object.fromEntries(
        Object.entries(parts).map(([dimension, part]) => [dimension, part.state])
      ) as Record<CapabilityDimension, CapabilityDimensionState>),
      blockingRules: governanceAssessment.blockingRules,
      obligations: obligationsOf(entry, inheritance),
      reasonCodes: uniqueSorted(assessments.flatMap((part) => part.reasons)),
      requiredEvidence: uniqueSorted(assessments.flatMap((part) => part.evidence))
    });
  });

  const conflict = inheritance.status === 'CONFLICT' || reality.status === 'CONFLICT';
  return Object.freeze({
    status: conflict ? 'CONFLICT' as const : 'PROJECTED' as const,
    observedAt: input.observedAt,
    scope,
    capabilities: Object.freeze(capabilities),
    effectiveCapabilityIds: Object.freeze(
      capabilities.filter((capability) => capability.effective).map((capability) => capability.capabilityId)
    ),
    reasonCodes: uniqueSorted([
      ...inheritance.contradictions.map((contradiction) => contradiction.reasonCode),
      ...reality.contradictions.map((contradiction) => contradiction.reasonCode),
      ...capabilities.flatMap((capability) => capability.reasonCodes)
    ]),
    authorizationInferred: false as const,
    mutationPerformed: false as const
  });
}
