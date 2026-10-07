import type { ProjectReality } from '../../github/projectReality.js';
import type { GithubProjectResolution } from '../../github/projectResolution.js';
import type { BranchGovernanceEvidence } from '../../governance/branchGovernance.js';
import type { GovernedLockRecord } from '../../operationalMemory/types.js';

/**
 * D1 (TB-W3-D1-01, GW-10): the governance a proven project scope inherits from
 * the authorities that already own it:
 * - the GitRegistry mapping's declared governance;
 * - the GitHub ruleset observed for that repository only;
 * - the versioned MCP branch governance policy;
 * - the Governed Lock Service;
 * - the scoped WRITE gate.
 * Nothing is copied into a store; each rule names the authorities that
 * determined it. The strictest constraint wins: one forbidding authority
 * suffices, silence never permits, stale or unobserved evidence is UNKNOWN.
 * Without a proven project scope nothing is inherited.
 * Pure and read-only: no authorization is derived.
 */
export type GovernanceAuthority =
  | 'GIT_REGISTRY_MAPPING'
  | 'GITHUB_RULESET'
  | 'MCP_BRANCH_GOVERNANCE'
  | 'GOVERNED_LOCK_SERVICE'
  | 'SCOPED_WRITE_GATE';

const AUTHORITY_ORDER: readonly GovernanceAuthority[] = [
  'GIT_REGISTRY_MAPPING',
  'GITHUB_RULESET',
  'MCP_BRANCH_GOVERNANCE',
  'GOVERNED_LOCK_SERVICE',
  'SCOPED_WRITE_GATE'
];

export type InheritedRuleId =
  | 'OFFICIAL_BRANCH'
  | 'DIRECT_PUSH_TO_OFFICIAL_BRANCH'
  | 'BRANCH_PREFIXES'
  | 'PULL_REQUEST'
  | 'DRAFT_PULL_REQUEST'
  | 'REQUIRED_STATUS_CHECKS'
  | 'REQUIRED_APPROVALS'
  | 'CONVERSATION_RESOLUTION'
  | 'DEPLOY'
  | 'BACKUP_BEFORE_DEPLOY'
  | 'WRITE_FILES'
  | 'CREATE_BRANCH'
  | 'COMMIT'
  | 'PUSH_BRANCH'
  | 'WRITE_TOOLS'
  | 'PROJECT_LOCKS'
  | 'CLEAN_WORKTREE';
export type InheritedRuleCategory =
  | 'BRANCH' | 'PULL_REQUEST' | 'CHECKS' | 'REVIEW' | 'DEPLOY' | 'WRITE' | 'LOCK' | 'WORKTREE';
export type InheritedRuleEffect = 'REQUIRE' | 'FORBID' | 'PERMIT' | 'UNKNOWN';
export type InheritedRuleValue = string | number | boolean | readonly string[] | null;

export type InheritedRule = Readonly<{
  ruleId: InheritedRuleId;
  category: InheritedRuleCategory;
  effect: InheritedRuleEffect;
  value: InheritedRuleValue;
  /** Authorities whose current evidence determined the effect; empty when UNKNOWN. */
  authorities: readonly GovernanceAuthority[];
  reasonCodes: readonly string[];
}>;

export type GovernanceSourceState = 'CURRENT' | 'STALE' | 'UNAVAILABLE' | 'NOT_OBSERVED';

export type GovernanceSource = Readonly<{
  authority: GovernanceAuthority;
  state: GovernanceSourceState;
  observedAt: string | null;
  reference: string | null;
  provenance: readonly string[];
  reasonCodes: readonly string[];
}>;

export type ProjectGovernanceScope = Readonly<{
  projectId: string;
  repositoryId: string;
  mappingId: string;
  componentRole: string | null;
  /** Null unless the server layer of the project reality is VERIFIED. */
  serverId: string | null;
}>;

export type ProjectGovernanceContradiction = Readonly<{
  ruleId: InheritedRuleId;
  reasonCode: string;
}>;

export type ProjectGovernanceInheritance = Readonly<{
  status: 'INHERITED' | 'PARTIAL' | 'UNVERIFIED' | 'CONFLICT';
  observedAt: string;
  scope: ProjectGovernanceScope | null;
  rules: readonly InheritedRule[];
  sources: readonly GovernanceSource[];
  contradictions: readonly ProjectGovernanceContradiction[];
  reasonCodes: readonly string[];
  authorizationInferred: false;
  mutationPerformed: false;
}>;

/** The ruleset the GitHub observer reports for the one repository it observes. */
export type ObservedRuleset = Readonly<{
  repositoryId: string;
  freshness: 'CURRENT' | 'STALE' | 'UNAVAILABLE' | 'NOT_APPLICABLE';
  observedAt: string;
  value: Readonly<{
    name: string | null;
    requiresPullRequest: boolean | null;
    requiredStatusChecks: readonly string[];
    requiresConversationResolution: boolean | null;
    requiredApprovingReviewCount?: number | null;
  }>;
}>;

export type ProjectGovernanceInheritanceSource = {
  projectReality: ProjectReality | null | undefined;
  project: GithubProjectResolution | null | undefined;
  ruleset: ObservedRuleset | null;
  policy: BranchGovernanceEvidence;
  /** Active locks of the Governed Lock Service; null when it cannot be read. */
  locks: readonly GovernedLockRecord[] | null;
  governedSessionId: string | null;
  gate: Readonly<{ mode: 'off' | 'shadow'; existingWriteToolsEnabled: boolean }>;
  observedAt: string;
};

/** Mapping statuses from which the registry lets a deployment proceed. */
const DEPLOYABLE_STATUSES: ReadonlySet<string> = new Set(['validated', 'active']);
const MAX_LIST = 50;

function uniqueSorted(values: readonly string[]): readonly string[] {
  return Object.freeze([...new Set(values)].sort().slice(0, MAX_LIST));
}

function ordered(authorities: readonly GovernanceAuthority[]): readonly GovernanceAuthority[] {
  return Object.freeze(AUTHORITY_ORDER.filter((authority) => authorities.includes(authority)));
}

function repositoryKey(value: string): string {
  return value.trim().replace(/^github:/i, '').toLowerCase();
}

/**
 * Whether a lock or task scope covers a project component: its repository,
 * or a component scope of its mapping. Shared by D1 and the F.2 provisioning
 * executor, which re-reads the coordination authorities before any write.
 */
export function scopeCoversProjectComponent(
  scope: string,
  component: Readonly<{ repositoryId: string; mappingId: string }>
): boolean {
  return scope.toLowerCase() === `repository:${repositoryKey(component.repositoryId)}`
    || (scope.startsWith('component:') && scope.endsWith(`:${component.mappingId}`));
}

export type RegistryDeployDecision = Readonly<{
  effect: 'PERMIT' | 'FORBID' | 'UNKNOWN';
  reasonCode: string | null;
}>;

/**
 * The GitRegistry's verdict on deploying a mapping: its declared deploy
 * capability, a deployable status, a READY activation and a proven server.
 * Shared by D1 and the F.2 provisioning plan, so a mapping the registry does
 * not let deploy is never provisioned. Silence never permits.
 */
export function registryDeployDecision(input: {
  governance: Readonly<{ status: string; capabilities: Readonly<{ deploy?: boolean }> }> | null | undefined;
  activation: string | null | undefined;
  serverVerified: boolean;
}): RegistryDeployDecision {
  const decide = (effect: RegistryDeployDecision['effect'], reasonCode: string | null) => Object.freeze({ effect, reasonCode });
  const governance = input.governance;
  if (!governance) return decide('UNKNOWN', 'GOVERNANCE_MAPPING_UNDECLARED');
  if (!governance.capabilities.deploy) return decide('FORBID', 'GOVERNANCE_DEPLOY_CAPABILITY_DISABLED');
  if (!DEPLOYABLE_STATUSES.has(governance.status)) return decide('FORBID', 'GOVERNANCE_MAPPING_NOT_ACTIVE');
  if (input.activation === 'BLOCKED') return decide('FORBID', 'GOVERNANCE_ACTIVATION_BLOCKED');
  if (input.activation !== 'READY') return decide('UNKNOWN', 'GOVERNANCE_ACTIVATION_UNKNOWN');
  if (!input.serverVerified) return decide('UNKNOWN', 'GOVERNANCE_SERVER_UNVERIFIED');
  return decide('PERMIT', null);
}

function frozenValue(value: InheritedRuleValue): InheritedRuleValue {
  return Array.isArray(value) ? Object.freeze([...value]) : value;
}

function rule(
  ruleId: InheritedRuleId,
  category: InheritedRuleCategory,
  effect: InheritedRuleEffect,
  value: InheritedRuleValue,
  authorities: readonly GovernanceAuthority[],
  reasonCodes: readonly string[] = []
): InheritedRule {
  return Object.freeze({
    ruleId,
    category,
    effect,
    value: frozenValue(value),
    authorities: effect === 'UNKNOWN' ? Object.freeze([]) : ordered(authorities),
    reasonCodes: uniqueSorted(reasonCodes)
  });
}

function unknown(ruleId: InheritedRuleId, category: InheritedRuleCategory, reasonCodes: readonly string[]): InheritedRule {
  return rule(ruleId, category, 'UNKNOWN', null, [], reasonCodes);
}

function source(
  authority: GovernanceAuthority,
  state: GovernanceSourceState,
  details: { observedAt?: string | null; reference?: string | null; provenance?: readonly string[]; reasonCodes?: readonly string[] } = {}
): GovernanceSource {
  return Object.freeze({
    authority,
    state,
    observedAt: details.observedAt ?? null,
    reference: details.reference ?? null,
    provenance: Object.freeze([...(details.provenance ?? [])]),
    reasonCodes: uniqueSorted(details.reasonCodes ?? [])
  });
}

type Vote = { authority: GovernanceAuthority; strict: boolean };

/** One strict vote decides; otherwise the speaking authorities permit; silence is UNKNOWN. */
function strictest(
  ruleId: InheritedRuleId,
  category: InheritedRuleCategory,
  votes: readonly Vote[],
  strictEffect: 'REQUIRE' | 'FORBID',
  value: InheritedRuleValue,
  silentReasons: readonly string[]
): InheritedRule {
  if (votes.length === 0) return unknown(ruleId, category, silentReasons);
  const strict = votes.filter((vote) => vote.strict);
  return strict.length > 0
    ? rule(ruleId, category, strictEffect, value, strict.map((vote) => vote.authority))
    : rule(ruleId, category, 'PERMIT', value, votes.map((vote) => vote.authority));
}

function unverified(observedAt: string): ProjectGovernanceInheritance {
  return Object.freeze({
    status: 'UNVERIFIED' as const,
    observedAt,
    scope: null,
    rules: Object.freeze([]),
    sources: Object.freeze([]),
    contradictions: Object.freeze([]),
    reasonCodes: Object.freeze(['GOVERNANCE_SCOPE_UNVERIFIED']),
    authorizationInferred: false as const,
    mutationPerformed: false as const
  });
}

export function deriveProjectGovernanceInheritance(
  input: ProjectGovernanceInheritanceSource
): ProjectGovernanceInheritance {
  const reality = input.projectReality;
  const mapping = input.project?.selectedMapping ?? null;
  // The scope is the proven project reality, bound to the mapping it resolved.
  if (
    !reality?.projectId
    || !reality.repositoryId
    || !mapping
    || mapping.projectId !== reality.projectId
    || repositoryKey(mapping.repositoryId) !== repositoryKey(reality.repositoryId)
  ) {
    return unverified(input.observedAt);
  }
  const scope: ProjectGovernanceScope = Object.freeze({
    projectId: reality.projectId,
    repositoryId: reality.repositoryId,
    mappingId: mapping.mappingId,
    componentRole: mapping.componentRole,
    serverId: reality.serverId
  });

  const governance = mapping.governance ?? null;
  const mappingReason = 'GOVERNANCE_MAPPING_UNDECLARED';
  const mappingSource = governance
    ? source('GIT_REGISTRY_MAPPING', 'CURRENT', {
        observedAt: input.project?.observedAt ?? null,
        reference: `${mapping.mappingId}@${input.project?.registryDigest ?? 'unknown'}`,
        provenance: [
          'git_registry_mapping_governance',
          ...(governance.candidateFromV1 ? ['git_registry_v2_candidate_from_v1'] : [])
        ]
      })
    : source('GIT_REGISTRY_MAPPING', 'UNAVAILABLE', { reasonCodes: [mappingReason] });

  const observed = input.ruleset;
  let rulesetState: GovernanceSourceState;
  let rulesetReason: string | null = null;
  if (!observed) {
    rulesetState = 'UNAVAILABLE';
    rulesetReason = 'GOVERNANCE_RULESET_UNAVAILABLE';
  } else if (repositoryKey(observed.repositoryId) !== repositoryKey(scope.repositoryId)) {
    // The observed ruleset belongs to another repository: never lent to this one.
    rulesetState = 'NOT_OBSERVED';
    rulesetReason = 'GOVERNANCE_RULESET_NOT_OBSERVED';
  } else if (observed.freshness === 'CURRENT') {
    rulesetState = 'CURRENT';
  } else if (observed.freshness === 'STALE') {
    rulesetState = 'STALE';
    rulesetReason = 'GOVERNANCE_RULESET_STALE';
  } else {
    rulesetState = 'UNAVAILABLE';
    rulesetReason = 'GOVERNANCE_RULESET_UNAVAILABLE';
  }
  const ruleset = rulesetState === 'CURRENT' ? observed!.value : null;
  const rulesetSource = source('GITHUB_RULESET', rulesetState, {
    observedAt: observed?.observedAt ?? null,
    reference: rulesetState === 'NOT_OBSERVED' ? null : observed?.value.name ?? null,
    provenance: rulesetState === 'NOT_OBSERVED' ? [] : ['github_ruleset'],
    reasonCodes: rulesetReason ? [rulesetReason] : []
  });
  const rulesetSilence = rulesetReason ?? 'GOVERNANCE_RULESET_FIELD_UNKNOWN';

  const policy = input.policy.status === 'CURRENT' ? input.policy.policy : null;
  const policyReason = input.policy.reasonCode ?? 'GOVERNANCE_POLICY_UNAVAILABLE';
  const policySource = policy
    ? source('MCP_BRANCH_GOVERNANCE', 'CURRENT', {
        reference: input.policy.reference,
        provenance: ['mcp_branch_governance']
      })
    : source('MCP_BRANCH_GOVERNANCE', 'UNAVAILABLE', { reasonCodes: [policyReason] });

  const lockSource = input.locks
    ? source('GOVERNED_LOCK_SERVICE', 'CURRENT', { observedAt: input.observedAt, provenance: ['governed_lock_service'] })
    : source('GOVERNED_LOCK_SERVICE', 'UNAVAILABLE', { reasonCodes: ['GOVERNANCE_LOCKS_UNAVAILABLE'] });
  const gateSource = source('SCOPED_WRITE_GATE', 'CURRENT', {
    observedAt: input.observedAt,
    reference: input.gate.mode,
    provenance: ['scoped_write_gate']
  });

  const rules: InheritedRule[] = [];
  const contradictions: ProjectGovernanceContradiction[] = [];

  // Branch: the mapping names its official branch; main-branch authorities speak only for main.
  const officialBranch = governance?.officialBranch ?? null;
  const onMain = officialBranch === 'main';
  rules.push(governance
    ? rule('OFFICIAL_BRANCH', 'BRANCH', 'REQUIRE', officialBranch, ['GIT_REGISTRY_MAPPING'])
    : unknown('OFFICIAL_BRANCH', 'BRANCH', [mappingReason]));
  const directPush: Vote[] = [
    ...(governance ? [{ authority: 'GIT_REGISTRY_MAPPING' as const, strict: governance.directMainPush === false }] : []),
    ...(onMain && typeof ruleset?.requiresPullRequest === 'boolean'
      ? [{ authority: 'GITHUB_RULESET' as const, strict: ruleset.requiresPullRequest }]
      : []),
    ...(onMain && policy ? [{ authority: 'MCP_BRANCH_GOVERNANCE' as const, strict: !policy.mainDirectPushAllowed }] : [])
  ];
  rules.push(strictest('DIRECT_PUSH_TO_OFFICIAL_BRANCH', 'BRANCH', directPush, 'FORBID', officialBranch, [mappingReason]));

  const prefixLists: Array<{ authority: GovernanceAuthority; prefixes: readonly string[] }> = [
    ...(governance ? [{ authority: 'GIT_REGISTRY_MAPPING' as const, prefixes: governance.allowedBranchPrefixes }] : []),
    ...(policy ? [{ authority: 'MCP_BRANCH_GOVERNANCE' as const, prefixes: policy.allowedPrefixes }] : [])
  ];
  if (prefixLists.length === 0) {
    rules.push(unknown('BRANCH_PREFIXES', 'BRANCH', [mappingReason, policyReason]));
  } else {
    const allowed = prefixLists
      .map((entry) => entry.prefixes)
      .reduce((left, right) => left.filter((prefix) => right.includes(prefix)));
    const authorities = prefixLists.map((entry) => entry.authority);
    if (allowed.length === 0) {
      rules.push(rule('BRANCH_PREFIXES', 'BRANCH', 'FORBID', [], authorities, ['GOVERNANCE_BRANCH_PREFIXES_DISJOINT']));
      if (prefixLists.length > 1) {
        contradictions.push(Object.freeze({ ruleId: 'BRANCH_PREFIXES' as const, reasonCode: 'GOVERNANCE_BRANCH_PREFIXES_DISJOINT' }));
      }
    } else {
      rules.push(rule('BRANCH_PREFIXES', 'BRANCH', 'REQUIRE', uniqueSorted(allowed), authorities));
    }
  }

  // Pull request, checks and review.
  const pullRequest: Vote[] = [
    ...(typeof ruleset?.requiresPullRequest === 'boolean'
      ? [{ authority: 'GITHUB_RULESET' as const, strict: ruleset.requiresPullRequest }]
      : []),
    ...(policy ? [{ authority: 'MCP_BRANCH_GOVERNANCE' as const, strict: policy.pullRequestRequired }] : [])
  ];
  rules.push(strictest(
    'PULL_REQUEST', 'PULL_REQUEST', pullRequest, 'REQUIRE',
    pullRequest.some((vote) => vote.strict), [policyReason, rulesetSilence]
  ));
  rules.push(policy
    ? rule('DRAFT_PULL_REQUEST', 'PULL_REQUEST', policy.draftPrByDefault ? 'REQUIRE' : 'PERMIT', policy.draftPrByDefault, ['MCP_BRANCH_GOVERNANCE'])
    : unknown('DRAFT_PULL_REQUEST', 'PULL_REQUEST', [policyReason]));
  if (ruleset) {
    const checks = uniqueSorted(ruleset.requiredStatusChecks);
    rules.push(rule('REQUIRED_STATUS_CHECKS', 'CHECKS', checks.length > 0 ? 'REQUIRE' : 'PERMIT', checks, ['GITHUB_RULESET']));
    const approvals = ruleset.requiredApprovingReviewCount ?? 0;
    rules.push(rule('REQUIRED_APPROVALS', 'REVIEW', approvals > 0 ? 'REQUIRE' : 'PERMIT', approvals, ['GITHUB_RULESET']));
    rules.push(typeof ruleset.requiresConversationResolution === 'boolean'
      ? rule(
          'CONVERSATION_RESOLUTION', 'REVIEW', ruleset.requiresConversationResolution ? 'REQUIRE' : 'PERMIT',
          ruleset.requiresConversationResolution, ['GITHUB_RULESET']
        )
      : unknown('CONVERSATION_RESOLUTION', 'REVIEW', ['GOVERNANCE_RULESET_FIELD_UNKNOWN']));
  } else {
    rules.push(unknown('REQUIRED_STATUS_CHECKS', 'CHECKS', [rulesetSilence]));
    rules.push(unknown('REQUIRED_APPROVALS', 'REVIEW', [rulesetSilence]));
    rules.push(unknown('CONVERSATION_RESOLUTION', 'REVIEW', [rulesetSilence]));
  }

  // Deployment from the registry mapping, on a proven server only.
  if (!governance) {
    rules.push(unknown('DEPLOY', 'DEPLOY', [mappingReason]));
    rules.push(unknown('BACKUP_BEFORE_DEPLOY', 'DEPLOY', [mappingReason]));
  } else {
    const deploy = registryDeployDecision({
      governance,
      activation: mapping.activationReadiness,
      serverVerified: Boolean(scope.serverId)
    });
    if (deploy.effect === 'UNKNOWN') {
      rules.push(unknown('DEPLOY', 'DEPLOY', [deploy.reasonCode!]));
    } else {
      rules.push(rule('DEPLOY', 'DEPLOY', deploy.effect, governance.status, ['GIT_REGISTRY_MAPPING'], deploy.reasonCode ? [deploy.reasonCode] : []));
    }
    rules.push(rule(
      'BACKUP_BEFORE_DEPLOY', 'DEPLOY', governance.backupRequired ? 'REQUIRE' : 'PERMIT',
      governance.backupRequired, ['GIT_REGISTRY_MAPPING']
    ));
  }

  // Write: the mapping's declared capabilities, then the WRITE gate.
  const capabilities: Array<[InheritedRuleId, boolean | undefined]> = [
    ['WRITE_FILES', governance?.capabilities.writeFiles],
    ['CREATE_BRANCH', governance?.capabilities.createBranch],
    ['COMMIT', governance?.capabilities.commit],
    ['PUSH_BRANCH', governance?.capabilities.pushBranch]
  ];
  for (const [ruleId, enabled] of capabilities) {
    rules.push(typeof enabled === 'boolean'
      ? rule(ruleId, 'WRITE', enabled ? 'PERMIT' : 'FORBID', enabled, ['GIT_REGISTRY_MAPPING'])
      : unknown(ruleId, 'WRITE', [mappingReason]));
  }
  rules.push(input.gate.existingWriteToolsEnabled
    ? rule('WRITE_TOOLS', 'WRITE', 'PERMIT', input.gate.mode, ['SCOPED_WRITE_GATE'])
    : rule('WRITE_TOOLS', 'WRITE', 'FORBID', input.gate.mode, ['SCOPED_WRITE_GATE'], ['GOVERNANCE_WRITE_TOOLS_DISABLED']));

  // Locks: only another session's active locks on this project scope constrain it.
  if (!input.locks) {
    rules.push(unknown('PROJECT_LOCKS', 'LOCK', ['GOVERNANCE_LOCKS_UNAVAILABLE']));
  } else {
    const held = input.locks.filter((lock) => (
      lock.status === 'ACTIVE'
      && lock.governedSessionId !== input.governedSessionId
      && (scopeCoversProjectComponent(lock.scope, scope) || lock.targetScope?.projectId === scope.projectId)
    )).map((lock) => lock.scope);
    rules.push(held.length > 0
      ? rule('PROJECT_LOCKS', 'LOCK', 'FORBID', uniqueSorted(held), ['GOVERNED_LOCK_SERVICE'], ['GOVERNANCE_PROJECT_LOCKED'])
      : rule('PROJECT_LOCKS', 'LOCK', 'PERMIT', [], ['GOVERNED_LOCK_SERVICE']));
  }

  rules.push(policy
    ? rule('CLEAN_WORKTREE', 'WORKTREE', 'REQUIRE', policy.dirtyCountRule, ['MCP_BRANCH_GOVERNANCE'])
    : unknown('CLEAN_WORKTREE', 'WORKTREE', [policyReason]));

  const sources = [mappingSource, rulesetSource, policySource, lockSource, gateSource];
  return Object.freeze({
    status: contradictions.length > 0
      ? 'CONFLICT' as const
      : rules.some((entry) => entry.effect === 'UNKNOWN') ? 'PARTIAL' as const : 'INHERITED' as const,
    observedAt: input.observedAt,
    scope,
    rules: Object.freeze(rules),
    sources: Object.freeze(sources),
    contradictions: Object.freeze(contradictions),
    reasonCodes: uniqueSorted([
      ...sources.flatMap((entry) => entry.reasonCodes),
      ...contradictions.map((entry) => entry.reasonCode)
    ]),
    authorizationInferred: false as const,
    mutationPerformed: false as const
  });
}
