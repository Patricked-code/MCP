import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';

process.env.MCP_AUTH_TOKEN ??= 'mcp-unit-test-value-20261005-abcdef';
process.env.S1_HOST ??= '127.0.0.1';
process.env.S1_KEY_PATH ??= '/tmp/mcp-unit-test-s1-key';
process.env.S2_HOST ??= '127.0.0.1';
process.env.S2_KEY_PATH ??= '/tmp/mcp-unit-test-s2-key';

const { readGitRegistryProjectEvidence } = await import('../src/github/registry.js');
const { resolveGithubProject } = await import('../src/github/projectResolution.js');
const { resolveProjectServer } = await import('../src/github/serverResolution.js');
const { resolveProjectRuntime } = await import('../src/github/runtimeResolution.js');
const { resolveProjectDomain } = await import('../src/github/domainResolution.js');
const { deriveProjectReality } = await import('../src/github/projectReality.js');
const { parseBranchGovernancePolicy } = await import('../src/governance/branchGovernance.js');
const { deriveShadowWriteDecision } = await import('../src/governance/scopedWriteGate.js');
const { deriveProjectGovernanceInheritance } = await import('../src/governedWorkflow/governance/projectInheritance.js');
const { deriveProjectEffectiveCapabilities } = await import('../src/governedWorkflow/governance/projectCapabilities.js');
const { createGovernedOperationalContextService } = await import('../src/governedContext/service.js');

const NOW = '2026-10-05T09:00:00.000Z';
const SESSION_ID = '11111111-1111-4111-8111-111111111111';
const FOREIGN_SESSION_ID = '22222222-2222-4222-8222-222222222222';
const PRINCIPAL = 'oauth:subject-d2';
const MCP_REPOSITORY = 'github:Patricked-code/MCP';
const API_REPOSITORY = 'github:Wealthtechinnovations/api_opcv';
const MANAGED = ['s1', 's2'];
const MODULE_PATH = join(process.cwd(), 'src', 'governedWorkflow', 'governance', 'projectCapabilities.ts');
const CAPABILITY_IDS = [
  'inventory', 'readFiles', 'searchCode', 'readLogs', 'gitStatus',
  'writeFiles', 'createBranch', 'commit', 'pushBranch',
  'build', 'deploy', 'rollback', 'quarantine', 'purge'
];
const READS = ['inventory', 'readFiles', 'searchCode', 'readLogs', 'gitStatus'];
const REPOSITORY_WRITES = ['writeFiles', 'createBranch', 'commit', 'pushBranch'];
const SERVER_BOUND = ['readLogs', 'gitStatus', 'build', 'deploy', 'rollback', 'quarantine', 'purge'];
const MUTATIONS = CAPABILITY_IDS.filter((id) => !READS.includes(id));

const previousRegistryFile = process.env.MCP_GIT_REGISTRY_FILE;
process.env.MCP_GIT_REGISTRY_FILE = 'data/mcp-git-registry.json';
const REAL_REGISTRY: any = await readGitRegistryProjectEvidence();
if (previousRegistryFile === undefined) delete process.env.MCP_GIT_REGISTRY_FILE;
else process.env.MCP_GIT_REGISTRY_FILE = previousRegistryFile;
const REAL_SERVER_MAP = JSON.parse(await readFile('.mcp/server-map.json', 'utf8'));
const REAL_POLICY = JSON.parse(await readFile('.mcp/branch-governance.json', 'utf8'));

function repositoryResolution(repositoryId: string): any {
  const fullName = repositoryId.replace(/^github:/, '');
  const [owner, name] = fullName.split('/');
  return {
    status: 'RESOLVED',
    observedAt: NOW,
    requestedRepositoryContext: fullName,
    selectionSource: 'connection_context',
    selectedAccountContext: { owner, type: 'organization' },
    selectedRepository: {
      repositoryId, githubRepositoryId: 1, owner, ownerType: 'organization', name, fullName,
      defaultBranch: 'main', visibility: 'private', archived: false, fork: false
    },
    candidates: [],
    candidateCount: 1,
    freshness: 'CURRENT',
    provenance: ['github_identity_resolution', 'github_repository_api'],
    reasonCodes: [],
    uncertainties: [],
    registryDigest: null
  };
}

function chain(registry: any, repositoryId: string) {
  const repository = repositoryResolution(repositoryId);
  const project = resolveGithubProject({ repository, registry, observedAt: NOW });
  const server = resolveProjectServer({
    project, registry, serverMap: REAL_SERVER_MAP, managedServerIds: MANAGED, observedAt: NOW
  });
  const runtime = resolveProjectRuntime({ server, project, registry, observations: null, observedAt: NOW });
  const domain = resolveProjectDomain({ project, server, registry, observation: null, observedAt: NOW });
  const projectReality = deriveProjectReality({ repository, project, server, runtime, domain, observedAt: NOW });
  return { repository, project, server, projectReality };
}

/** The MCP scope with a validated mapping that declares every capability. */
function declaredEverything(base = chain(REAL_REGISTRY, MCP_REPOSITORY), governance: Record<string, unknown> = {}) {
  const declared = base.project.selectedMapping.governance;
  return {
    ...base,
    project: {
      ...base.project,
      selectedMapping: {
        ...base.project.selectedMapping,
        activationReadiness: 'READY',
        governance: {
          ...declared,
          status: 'active',
          candidateFromV1: false,
          capabilities: Object.fromEntries(Object.keys(declared.capabilities).map((key) => [key, true])),
          ...governance
        }
      }
    }
  };
}

function githubIdentity(overrides: Record<string, unknown> = {}): any {
  return {
    status: 'RESOLVED',
    observedAt: NOW,
    bindingId: 'binding-d2',
    oauthPrincipalId: PRINCIPAL,
    repositoryContext: 'Patricked-code/MCP',
    authenticatedPrincipal: { provider: 'github', login: 'patricked', accountType: 'user' },
    selectedAccountContext: { owner: 'Patricked-code', type: 'user', source: 'durable_account' },
    accessibleAccountContexts: [],
    freshness: 'CURRENT',
    provenance: ['github_identity_resolution'],
    reasonCodes: [],
    policyDigest: null,
    ...overrides
  };
}

function preconditions(overrides: Record<string, unknown> = {}): any {
  return {
    sessionPresent: true,
    currentStateVersion: 7,
    currentFreshness: 'CURRENT',
    acknowledgedStateVersion: 7,
    activeLockConflicts: 0,
    bootstrapReceiptStatus: 'CURRENT',
    currentTaskStatus: 'IN_PROGRESS',
    auditBaselineValid: true,
    ...overrides
  };
}

function lock(scope: string, overrides: Record<string, unknown> = {}): any {
  return {
    schemaVersion: 1,
    lockId: `lock-${scope.replace(/[^a-z0-9]/gi, '-')}`.slice(0, 60),
    scope,
    governedSessionId: FOREIGN_SESSION_ID,
    acquiredAt: NOW,
    expiresAt: '2026-10-05T10:00:00.000Z',
    renewedAt: NOW,
    reason: 'fixture',
    status: 'ACTIVE',
    lockRevision: 1,
    ...overrides
  };
}

function inherit(base: any, overrides: Record<string, unknown> = {}) {
  return deriveProjectGovernanceInheritance({
    projectReality: base.projectReality,
    project: base.project,
    ruleset: {
      repositoryId: MCP_REPOSITORY,
      freshness: 'CURRENT',
      observedAt: NOW,
      value: {
        name: 'main-protection',
        requiresPullRequest: true,
        requiredStatusChecks: ['validate'],
        requiresConversationResolution: true,
        requiredApprovingReviewCount: 0
      }
    },
    policy: parseBranchGovernancePolicy(REAL_POLICY),
    locks: [],
    governedSessionId: SESSION_ID,
    gate: { mode: 'shadow', existingWriteToolsEnabled: true },
    observedAt: NOW,
    ...overrides
  } as never);
}

function derive(base: any = chain(REAL_REGISTRY, MCP_REPOSITORY), overrides: Record<string, unknown> = {}, inheritance: Record<string, unknown> = {}) {
  return deriveProjectEffectiveCapabilities({
    projectReality: base.projectReality,
    governanceInheritance: inherit(base, inheritance),
    project: base.project,
    identity: { assurance: 'oauth_subject', principalId: PRINCIPAL, github: githubIdentity() },
    github: { repositoryId: MCP_REPOSITORY, status: 'CURRENT' },
    preconditions: preconditions(),
    observedAt: NOW,
    ...overrides
  } as never) as any;
}

function capability(set: any, capabilityId: string): any {
  return set.capabilities.find((entry: any) => entry.capabilityId === capabilityId);
}

function statuses(set: any): Record<string, string> {
  return Object.fromEntries(set.capabilities.map((entry: any) => [entry.capabilityId, entry.status]));
}

test('D2 projects the effective capabilities of the proven MCP scope and infers no authorization', () => {
  const set = derive();
  assert.equal(set.status, 'PROJECTED');
  assert.deepEqual(set.scope, {
    projectId: 'mcp_bridge',
    repositoryId: MCP_REPOSITORY,
    mappingId: 'mcp-s1-production',
    componentRole: null,
    serverId: 's1'
  });
  // One entry per capability the GitRegistry vocabulary declares, in its order.
  assert.deepEqual(set.capabilities.map((entry: any) => entry.capabilityId), CAPABILITY_IDS);
  assert.deepEqual(statuses(set), {
    inventory: 'UNVERIFIED',
    readFiles: 'UNVERIFIED',
    searchCode: 'UNVERIFIED',
    readLogs: 'BLOCKED',
    gitStatus: 'UNVERIFIED',
    writeFiles: 'BLOCKED',
    createBranch: 'BLOCKED',
    commit: 'BLOCKED',
    pushBranch: 'BLOCKED',
    build: 'BLOCKED',
    deploy: 'BLOCKED',
    rollback: 'BLOCKED',
    quarantine: 'BLOCKED',
    purge: 'BLOCKED'
  });
  // The migrated V1 mapping is a candidate: its declared reads are not validated yet.
  const inventory = capability(set, 'inventory');
  assert.equal(inventory.operationClass, 'READ');
  assert.equal(inventory.binding, 'REPOSITORY');
  assert.deepEqual(inventory.dimensions, {
    DECLARED: 'UNKNOWN',
    IDENTITY: 'SATISFIED',
    TARGET: 'SATISFIED',
    GITHUB: 'NOT_REQUIRED',
    GOVERNANCE: 'NOT_REQUIRED',
    PRECONDITIONS: 'NOT_REQUIRED',
    AUTHORIZATION: 'UNKNOWN'
  });
  assert.deepEqual(inventory.reasonCodes, ['AUTHORIZATION_UNATTESTED', 'CAPABILITY_DECLARATION_UNVALIDATED']);
  assert.deepEqual(capability(set, 'readLogs').reasonCodes, ['AUTHORIZATION_UNATTESTED', 'CAPABILITY_NOT_DECLARED']);

  // Mutations the registry does not declare are blocked, with the inherited rule that forbids them.
  const writeFiles = capability(set, 'writeFiles');
  assert.equal(writeFiles.dimensions.DECLARED, 'UNSATISFIED');
  assert.equal(writeFiles.dimensions.GOVERNANCE, 'UNSATISFIED');
  assert.deepEqual(writeFiles.blockingRules, ['WRITE_FILES']);
  assert.ok(writeFiles.reasonCodes.includes('CAPABILITY_FORBIDDEN_BY_GOVERNANCE'));
  const deploy = capability(set, 'deploy');
  assert.equal(deploy.operationClass, 'PRODUCTION_EFFECT');
  assert.deepEqual(deploy.blockingRules, ['DEPLOY']);
  assert.ok(deploy.reasonCodes.includes('GOVERNANCE_DEPLOY_CAPABILITY_DISABLED'));
  assert.deepEqual(deploy.obligations, ['BACKUP_BEFORE_DEPLOY', 'CLEAN_WORKTREE', 'REQUIRED_STATUS_CHECKS']);
  assert.equal(capability(set, 'purge').operationClass, 'DESTRUCTIVE');

  for (const entry of set.capabilities) {
    assert.equal(entry.effective, false, entry.capabilityId);
    assert.equal(entry.dimensions.AUTHORIZATION, 'UNKNOWN', entry.capabilityId);
    assert.ok(entry.requiredEvidence.includes('authorization_attestation'), entry.capabilityId);
  }
  assert.deepEqual(set.effectiveCapabilityIds, []);
  assert.equal(set.authorizationInferred, false);
  assert.equal(set.mutationPerformed, false);
});

test('D2 technical capability never implies authorization, even when every other authority agrees', () => {
  const set = derive(declaredEverything());
  assert.equal(set.status, 'PROJECTED');
  for (const entry of set.capabilities) {
    const id = entry.capabilityId;
    assert.equal(entry.status, 'UNVERIFIED', id);
    assert.equal(entry.effective, false, id);
    assert.deepEqual(entry.reasonCodes, ['AUTHORIZATION_UNATTESTED'], id);
    assert.deepEqual(entry.requiredEvidence, ['authorization_attestation'], id);
    assert.deepEqual(entry.blockingRules, [], id);
    assert.deepEqual(entry.dimensions, {
      DECLARED: 'SATISFIED',
      IDENTITY: 'SATISFIED',
      TARGET: 'SATISFIED',
      GITHUB: REPOSITORY_WRITES.includes(id) ? 'SATISFIED' : 'NOT_REQUIRED',
      GOVERNANCE: READS.includes(id) ? 'NOT_REQUIRED' : 'SATISFIED',
      PRECONDITIONS: READS.includes(id) ? 'NOT_REQUIRED' : 'SATISFIED',
      AUTHORIZATION: 'UNKNOWN'
    }, id);
  }
  assert.deepEqual(set.effectiveCapabilityIds, []);
  // Obligations are inherited constraints to honour, never permissions.
  assert.deepEqual(capability(set, 'pushBranch').obligations, [
    'BRANCH_PREFIXES', 'CONVERSATION_RESOLUTION', 'DIRECT_PUSH_TO_OFFICIAL_BRANCH', 'DRAFT_PULL_REQUEST',
    'PULL_REQUEST', 'REQUIRED_STATUS_CHECKS'
  ]);
  assert.deepEqual(capability(set, 'createBranch').obligations, ['BRANCH_PREFIXES']);
});

test('D2 every dimension restricts on its own and unknown evidence never permits', () => {
  const base = declaredEverything();

  // Identity: OAuth subject and a current GitHub identity bound to the same principal.
  const unbound = derive(base, { identity: { assurance: null, principalId: null, github: githubIdentity() } });
  for (const id of CAPABILITY_IDS) assert.equal(capability(unbound, id).dimensions.IDENTITY, 'UNKNOWN', id);
  assert.ok(capability(unbound, 'inventory').reasonCodes.includes('CAPABILITY_IDENTITY_UNBOUND'));
  const shared = derive(base, { identity: { assurance: 'shared_credential', principalId: null, github: githubIdentity() } });
  assert.equal(capability(shared, 'inventory').status, 'BLOCKED');
  assert.ok(capability(shared, 'inventory').reasonCodes.includes('CAPABILITY_IDENTITY_ASSURANCE_INSUFFICIENT'));
  const stale = derive(base, { identity: { assurance: 'oauth_subject', principalId: PRINCIPAL, github: githubIdentity({ freshness: 'STALE' }) } });
  assert.equal(capability(stale, 'commit').dimensions.IDENTITY, 'UNKNOWN');
  assert.ok(capability(stale, 'commit').reasonCodes.includes('CAPABILITY_GITHUB_IDENTITY_UNVERIFIED'));
  const ambiguous = derive(base, { identity: { assurance: 'oauth_subject', principalId: PRINCIPAL, github: githubIdentity({ status: 'AMBIGUOUS' }) } });
  assert.equal(capability(ambiguous, 'commit').dimensions.IDENTITY, 'UNSATISFIED');
  assert.ok(capability(ambiguous, 'commit').reasonCodes.includes('CAPABILITY_GITHUB_IDENTITY_UNRESOLVED'));
  const otherPrincipal = derive(base, { identity: { assurance: 'oauth_subject', principalId: 'oauth:someone-else', github: githubIdentity() } });
  assert.equal(capability(otherPrincipal, 'readFiles').dimensions.IDENTITY, 'UNSATISFIED');
  assert.ok(capability(otherPrincipal, 'readFiles').reasonCodes.includes('CAPABILITY_IDENTITY_PRINCIPAL_MISMATCH'));

  // Target: server-bound capabilities need a verified server layer; repository-bound ones do not.
  const noServer = derive({
    ...base,
    projectReality: {
      ...base.projectReality,
      layers: base.projectReality.layers.map((layer: any) => (layer.layer === 'SERVER' ? { ...layer, state: 'UNVERIFIED' } : layer))
    }
  });
  for (const id of SERVER_BOUND) {
    assert.equal(capability(noServer, id).dimensions.TARGET, 'UNKNOWN', id);
    assert.ok(capability(noServer, id).reasonCodes.includes('CAPABILITY_TARGET_SERVER_UNVERIFIED'), id);
  }
  for (const id of ['inventory', 'readFiles', 'searchCode', ...REPOSITORY_WRITES]) {
    assert.equal(capability(noServer, id).dimensions.TARGET, 'SATISFIED', id);
  }

  // GitHub: repository mutations need a current work state observed for this repository.
  const degraded = derive(base, { github: { repositoryId: MCP_REPOSITORY, status: 'DEGRADED' } });
  for (const id of REPOSITORY_WRITES) {
    assert.equal(capability(degraded, id).dimensions.GITHUB, 'UNKNOWN', id);
    assert.ok(capability(degraded, id).reasonCodes.includes('CAPABILITY_GITHUB_UNAVAILABLE'), id);
  }
  assert.equal(capability(degraded, 'deploy').dimensions.GITHUB, 'NOT_REQUIRED');
  const otherRepository = derive(base, { github: { repositoryId: API_REPOSITORY, status: 'CURRENT' } });
  assert.ok(capability(otherRepository, 'commit').reasonCodes.includes('CAPABILITY_GITHUB_NOT_OBSERVED'));

  // Governance: the D1 rules decide, one forbidding authority is enough.
  const writeToolsOff = derive(base, {}, { gate: { mode: 'shadow', existingWriteToolsEnabled: false } });
  for (const id of MUTATIONS) {
    assert.equal(capability(writeToolsOff, id).dimensions.GOVERNANCE, 'UNSATISFIED', id);
    assert.ok(capability(writeToolsOff, id).blockingRules.includes('WRITE_TOOLS'), id);
    assert.ok(capability(writeToolsOff, id).reasonCodes.includes('GOVERNANCE_WRITE_TOOLS_DISABLED'), id);
  }
  for (const id of READS) assert.equal(capability(writeToolsOff, id).dimensions.GOVERNANCE, 'NOT_REQUIRED', id);
  const locked = derive(base, {}, { locks: [lock('repository:Patricked-code/MCP')] });
  assert.ok(capability(locked, 'deploy').blockingRules.includes('PROJECT_LOCKS'));
  assert.ok(capability(locked, 'deploy').reasonCodes.includes('GOVERNANCE_PROJECT_LOCKED'));
  const locksUnknown = derive(base, {}, { locks: null });
  assert.equal(capability(locksUnknown, 'build').dimensions.GOVERNANCE, 'UNKNOWN');
  assert.equal(capability(locksUnknown, 'build').status, 'UNVERIFIED');

  // Preconditions: the governance preconditions observed by the scoped WRITE gate.
  const unclaimed = derive(base, { preconditions: preconditions({ currentTaskStatus: null }) });
  for (const id of MUTATIONS) {
    assert.equal(capability(unclaimed, id).dimensions.PRECONDITIONS, 'UNSATISFIED', id);
    assert.ok(capability(unclaimed, id).reasonCodes.includes('TASK_UNCLAIMED'), id);
  }
  for (const id of READS) assert.equal(capability(unclaimed, id).dimensions.PRECONDITIONS, 'NOT_REQUIRED', id);
  const staleReceipt = derive(base, { preconditions: preconditions({ bootstrapReceiptStatus: 'STALE' }) });
  assert.ok(capability(staleReceipt, 'commit').reasonCodes.includes('BOOTSTRAP_RECEIPT_STALE'));
  const locksUnavailable = derive(base, { preconditions: preconditions({ activeLockConflicts: null }) });
  assert.equal(capability(locksUnavailable, 'commit').dimensions.PRECONDITIONS, 'UNKNOWN');

  // Declared: only a validated mapping declares; a false declaration always blocks.
  const proposed = derive(declaredEverything(undefined, { status: 'proposed' }));
  for (const id of CAPABILITY_IDS) assert.equal(capability(proposed, id).dimensions.DECLARED, 'UNKNOWN', id);
  const noPurge = derive(declaredEverything(undefined, {
    capabilities: { ...Object.fromEntries(CAPABILITY_IDS.map((id) => [id, true])), purge: false }
  }));
  assert.equal(capability(noPurge, 'purge').status, 'BLOCKED');
  assert.ok(capability(noPurge, 'purge').reasonCodes.includes('CAPABILITY_NOT_DECLARED'));
  const undeclared = derive({ ...base, project: { ...base.project, selectedMapping: { ...base.project.selectedMapping, governance: undefined } } });
  assert.equal(capability(undeclared, 'inventory').dimensions.DECLARED, 'UNKNOWN');
  assert.ok(capability(undeclared, 'inventory').reasonCodes.includes('GOVERNANCE_MAPPING_UNDECLARED'));
});

test('D2 preconditions reproduce the scoped WRITE gate verdict without changing the shadow gate', async () => {
  const base = declaredEverything();
  const cases = [
    preconditions(),
    preconditions({ sessionPresent: false }),
    preconditions({ acknowledgedStateVersion: null }),
    preconditions({ acknowledgedStateVersion: 6 }),
    preconditions({ currentFreshness: 'STALE' }),
    preconditions({ activeLockConflicts: 2 }),
    preconditions({ bootstrapReceiptStatus: 'MISSING' }),
    preconditions({ bootstrapReceiptStatus: 'EXPIRED' }),
    preconditions({ currentTaskStatus: null }),
    preconditions({ auditBaselineValid: false })
  ];
  for (const input of cases) {
    const verdict = deriveShadowWriteDecision({
      mode: 'shadow',
      toolName: 'github_create_commit',
      governedSessionId: input.sessionPresent ? SESSION_ID : null,
      currentStateVersion: input.currentStateVersion,
      currentFreshness: input.currentFreshness,
      acknowledgedStateVersion: input.acknowledgedStateVersion,
      activeLockConflicts: input.activeLockConflicts,
      bootstrapReceiptStatus: input.bootstrapReceiptStatus,
      currentTaskStatus: input.currentTaskStatus,
      auditBaselineValid: input.auditBaselineValid
    });
    const commit = capability(derive(base, { preconditions: input }), 'commit');
    assert.equal(
      commit.dimensions.PRECONDITIONS === 'SATISFIED',
      verdict.verdict === 'shadow_ready',
      JSON.stringify(input)
    );
    if (verdict.verdict !== 'shadow_ready') {
      assert.ok(commit.reasonCodes.includes(verdict.verdict.toUpperCase()), `${verdict.verdict} ${JSON.stringify(input)}`);
    }
  }
  // The gate stays shadow and observational: D2 neither imports nor decorates it.
  const source = await readFile(MODULE_PATH, 'utf8');
  assert.doesNotMatch(source, /scopedWriteGate|decorateScopedWriteServer/);
});

test('D2 derives nothing without a proven scope and surfaces governance conflicts', () => {
  const unproven = deriveProjectEffectiveCapabilities({
    projectReality: deriveProjectReality({ observedAt: NOW }),
    governanceInheritance: inherit({ ...chain(REAL_REGISTRY, MCP_REPOSITORY), projectReality: deriveProjectReality({ observedAt: NOW }) }),
    project: null,
    identity: { assurance: 'oauth_subject', principalId: PRINCIPAL, github: githubIdentity() },
    github: { repositoryId: MCP_REPOSITORY, status: 'CURRENT' },
    preconditions: preconditions(),
    observedAt: NOW
  } as never) as any;
  assert.equal(unproven.status, 'UNVERIFIED');
  assert.equal(unproven.scope, null);
  assert.deepEqual(unproven.capabilities, []);
  assert.deepEqual(unproven.effectiveCapabilityIds, []);
  assert.deepEqual(unproven.reasonCodes, ['CAPABILITY_SCOPE_UNVERIFIED']);

  const missing = deriveProjectEffectiveCapabilities({
    projectReality: null,
    governanceInheritance: null,
    project: null,
    identity: { assurance: null, principalId: null, github: null },
    github: { repositoryId: null, status: 'UNAVAILABLE' },
    preconditions: preconditions({ sessionPresent: false }),
    observedAt: NOW
  } as never) as any;
  assert.equal(missing.status, 'UNVERIFIED');

  // Another project gets its own capabilities; MCP GitHub evidence is never lent to it.
  const africa = derive(declaredEverything(chain(REAL_REGISTRY, API_REPOSITORY)), {
    identity: { assurance: 'oauth_subject', principalId: PRINCIPAL, github: githubIdentity({ repositoryContext: 'Wealthtechinnovations/api_opcv' }) }
  });
  assert.equal(africa.scope?.projectId, 'chainsolutions.africafunds');
  for (const id of REPOSITORY_WRITES) {
    assert.ok(capability(africa, id).reasonCodes.includes('CAPABILITY_GITHUB_NOT_OBSERVED'), id);
  }

  // Disjoint branch prefixes are a governance conflict: branch creation and push are blocked.
  const disjoint = derive(declaredEverything(undefined, { allowedBranchPrefixes: ['feature/'] }));
  assert.equal(disjoint.status, 'CONFLICT');
  for (const id of ['createBranch', 'pushBranch']) {
    assert.equal(capability(disjoint, id).status, 'BLOCKED', id);
    assert.ok(capability(disjoint, id).blockingRules.includes('BRANCH_PREFIXES'), id);
  }
  assert.ok(disjoint.reasonCodes.includes('GOVERNANCE_BRANCH_PREFIXES_DISJOINT'));
});

test('D2 composition is pure, bounded and frozen', async () => {
  const set = derive(declaredEverything());
  assert.ok(Object.isFrozen(set));
  assert.ok(Object.isFrozen(set.capabilities));
  assert.ok(set.capabilities.every((entry: any) => Object.isFrozen(entry) && Object.isFrozen(entry.dimensions)));
  assert.equal(set.capabilities.length, CAPABILITY_IDS.length);
  assert.ok(set.reasonCodes.length <= 50);
  const source = await readFile(MODULE_PATH, 'utf8');
  assert.doesNotMatch(source, /writeFile(Sync)?\(|fetch\(|child_process|process\.env/);
});

test('D2 projects the effective capabilities in the governed operational context', async () => {
  const base = chain(REAL_REGISTRY, MCP_REPOSITORY);
  const github = {
    status: 'CURRENT',
    observedAt: NOW,
    mainHead: 'a'.repeat(40),
    workBranch: null,
    workBranchHead: null,
    pullRequest: null,
    checks: { status: 'unavailable', conclusion: null, total: 0, failed: 0, headSha: null, exactHead: null, required: [], requiredSatisfied: null },
    reviews: { approvals: 0, changesRequested: 0, unresolvedThreads: null },
    ruleset: { name: 'main-protection', enforcement: 'active', requiresPullRequest: true, requiredStatusChecks: ['validate'], requiresConversationResolution: true },
    ownership: { pullRequestAuthor: null },
    activity: { lastActivityAt: null },
    identity: githubIdentity(),
    repositoryResolution: base.repository,
    projectResolution: base.project,
    serverResolution: base.server,
    cache: { status: 'REFRESHED', observedAt: NOW, provenance: 'github_api' },
    evidence: {
      main: { freshness: 'CURRENT', observedAt: NOW, provenance: 'github_api' },
      pullRequest: { freshness: 'NOT_APPLICABLE', observedAt: NOW, provenance: 'github_api' },
      checks: { freshness: 'NOT_APPLICABLE', observedAt: NOW, provenance: 'github_api' },
      reviews: { freshness: 'NOT_APPLICABLE', observedAt: NOW, provenance: 'github_api' },
      ruleset: { freshness: 'CURRENT', observedAt: NOW, provenance: 'github_api' }
    },
    reasonCodes: [],
    uncertainties: [],
    error: null
  };
  const session = (repository = 'Patricked-code/MCP') => ({
    schemaVersion: 1, governedSessionId: SESSION_ID, repository, workBranch: null, status: 'ACTIVE',
    identityAssurance: 'oauth_subject',
    connectionContext: {
      schemaVersion: 1,
      connectionContextId: '33333333-3333-4333-8333-333333333333',
      governedSessionId: SESSION_ID,
      repository,
      principalId: PRINCIPAL,
      observedClientId: null,
      identityAssurance: 'oauth_subject',
      clientClassification: 'UNRESOLVED',
      evidenceSource: 'oauth_auth_info',
      createdAt: NOW
    },
    lastAcknowledgedStateVersion: null, bootstrapReceipt: null, blockers: [], lastCheckpoint: null
  });
  const service = (options: { session?: unknown; locks?: unknown[] } = {}) => (
    createGovernedOperationalContextService({
      liveState: { getCurrent: async () => null, reconcileNow: async () => null },
      github: { getCurrent: async () => github, reconcileExplicit: async () => github },
      sessions: { getVisibleSession: async () => options.session === undefined ? session() : options.session },
      locks: { listActiveLocks: async () => options.locks ?? [] },
      gateMode: 'shadow',
      existingWriteToolsEnabled: false,
      now: () => new Date(NOW),
      readBranchGovernance: async () => REAL_POLICY
    } as never)
  );
  const input = { governedSessionId: SESSION_ID, workBranch: null, request: {} } as never;

  const context = await service().getCurrent(input);
  const projected = context.effectiveCapabilities as any;
  assert.equal(projected.status, 'PROJECTED');
  assert.equal(projected.scope?.projectId, 'mcp_bridge');
  assert.deepEqual(projected.capabilities.map((entry: any) => entry.capabilityId), CAPABILITY_IDS);
  assert.equal(capability(projected, 'inventory').dimensions.IDENTITY, 'SATISFIED');
  // The service's own WRITE gate, receipt and task state restrict every mutation.
  for (const id of MUTATIONS) {
    assert.ok(capability(projected, id).blockingRules.includes('WRITE_TOOLS'), id);
    assert.ok(capability(projected, id).reasonCodes.includes('BOOTSTRAP_RECEIPT_MISSING'), id);
    assert.ok(capability(projected, id).reasonCodes.includes('TASK_UNCLAIMED'), id);
  }
  assert.deepEqual(projected.effectiveCapabilityIds, []);
  // The historical gate projection is unchanged: still shadow and observational.
  assert.deepEqual(context.gate, { mode: 'shadow', existingWriteToolsEnabled: false, decision: 'shadow_observed' });

  // Every active lock is read, beyond the bounded lock projection of the context.
  const crowded = (await service({
    locks: [
      ...Array.from({ length: 120 }, (_, index) => lock(`resource:elsewhere-${index}`)),
      lock('repository:Patricked-code/MCP')
    ]
  }).getCurrent(input)).effectiveCapabilities as any;
  assert.ok(capability(crowded, 'commit').reasonCodes.includes('LOCK_CONFLICT'));
  assert.ok(capability(crowded, 'commit').blockingRules.includes('PROJECT_LOCKS'));

  // Without a session nothing identifies the principal.
  const anonymous = (await service({ session: null }).getCurrent(input)).effectiveCapabilities as any;
  assert.equal(capability(anonymous, 'readFiles').dimensions.IDENTITY, 'UNKNOWN');

  // B3.2: a session bound to an unobserved repository gets no capability.
  const foreign = (await service({ session: session('Wealthtechinnovations/api_opcv') }).getCurrent(input)).effectiveCapabilities as any;
  assert.equal(foreign.status, 'UNVERIFIED');
  assert.deepEqual(foreign.capabilities, []);
});
