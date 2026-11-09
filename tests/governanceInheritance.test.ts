import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
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
const { createGovernedOperationalContextService } = await import('../src/governedContext/service.js');
const {
  parseBranchGovernancePolicy,
  readBranchGovernancePolicy
} = await import('../src/governance/branchGovernance.js');
const { deriveProjectGovernanceInheritance } = await import('../src/governedWorkflow/governance/projectInheritance.js');

const NOW = '2026-10-05T05:00:00.000Z';
const SESSION_ID = '11111111-1111-4111-8111-111111111111';
const FOREIGN_SESSION_ID = '22222222-2222-4222-8222-222222222222';
const MCP_REPOSITORY = 'github:Patricked-code/MCP';
const API_REPOSITORY = 'github:Wealthtechinnovations/api_opcv';
const AFRICAFUNDS = 'chainsolutions.africafunds';
const AF_BRANCH = 'claude/code-review-improvements-ikvuj';
const API_MAPPING = 'github:Wealthtechinnovations/api_opcv:s2:africafunds_api';
const MANAGED = ['s1', 's2'];
const MODULE_PATH = join(process.cwd(), 'src', 'governedWorkflow', 'governance', 'projectInheritance.ts');

const previousRegistryFile = process.env.MCP_GIT_REGISTRY_FILE;
process.env.MCP_GIT_REGISTRY_FILE = 'data/mcp-git-registry.json';
const REAL_REGISTRY: any = await readGitRegistryProjectEvidence();
if (previousRegistryFile === undefined) delete process.env.MCP_GIT_REGISTRY_FILE;
else process.env.MCP_GIT_REGISTRY_FILE = previousRegistryFile;
const REAL_SERVER_MAP = JSON.parse(await readFile('.mcp/server-map.json', 'utf8'));
const REAL_POLICY = JSON.parse(await readFile('.mcp/branch-governance.json', 'utf8'));

function repositoryResolution(repositoryId: string, overrides: Record<string, unknown> = {}): any {
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
    registryDigest: null,
    ...overrides
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
  return { project, projectReality };
}

function ruleset(overrides: Record<string, unknown> = {}): any {
  return {
    repositoryId: MCP_REPOSITORY,
    freshness: 'CURRENT',
    observedAt: NOW,
    value: {
      name: 'main-protection',
      enforcement: 'active',
      requiresPullRequest: true,
      requiredStatusChecks: ['validate'],
      requiresConversationResolution: true,
      requiredApprovingReviewCount: 0
    },
    ...overrides
  };
}

function inherit(overrides: Record<string, unknown> = {}, base = chain(REAL_REGISTRY, MCP_REPOSITORY)) {
  return deriveProjectGovernanceInheritance({
    projectReality: base.projectReality,
    project: base.project,
    ruleset: ruleset(),
    policy: parseBranchGovernancePolicy(REAL_POLICY),
    locks: [],
    governedSessionId: SESSION_ID,
    gate: { mode: 'shadow', existingWriteToolsEnabled: true },
    observedAt: NOW,
    ...overrides
  } as never);
}

function rule(inheritance: any, ruleId: string): any {
  return inheritance.rules.find((entry: any) => entry.ruleId === ruleId);
}

function effects(inheritance: any): Record<string, string> {
  return Object.fromEntries(inheritance.rules.map((entry: any) => [entry.ruleId, entry.effect]));
}

function lock(scope: string, overrides: Record<string, unknown> = {}): any {
  return {
    schemaVersion: 1,
    lockId: `lock-${scope.replace(/[^a-z0-9]/gi, '-')}`.slice(0, 60),
    scope,
    governedSessionId: FOREIGN_SESSION_ID,
    acquiredAt: NOW,
    expiresAt: '2026-10-05T06:00:00.000Z',
    renewedAt: NOW,
    reason: 'fixture',
    status: 'ACTIVE',
    lockRevision: 1,
    ...overrides
  };
}

test('D1 GitRegistry evidence carries the declared governance of each mapping, bound to the selected mapping', () => {
  const declared = REAL_REGISTRY.governanceEvidence?.mappings ?? [];
  const mcp = declared.find((entry: any) => entry.mappingId === 'mcp-s1-production');
  assert.equal(mcp?.repositoryId, MCP_REPOSITORY);
  assert.equal(mcp?.officialBranch, 'main');
  assert.deepEqual(mcp?.allowedBranchPrefixes, ['mcp/', 'claude/', 'codex/']);
  assert.equal(mcp?.directMainPush, false);
  assert.equal(mcp?.status, 'migration_pending');
  assert.equal(mcp?.capabilities?.deploy, false);
  assert.equal(mcp?.capabilities?.writeFiles, false);
  assert.equal(mcp?.backupRequired, true);
  const api = declared.find((entry: any) => entry.mappingId === API_MAPPING);
  assert.equal(api?.officialBranch, AF_BRANCH);
  assert.equal(api?.status, 'proposed');

  const { project } = chain(REAL_REGISTRY, MCP_REPOSITORY);
  assert.equal(project.selectedMapping?.governance?.officialBranch, 'main');
  // Historical registry evidence without governance declarations keeps the selected mapping unchanged.
  const legacy = chain({ ...REAL_REGISTRY, governanceEvidence: undefined }, MCP_REPOSITORY);
  assert.equal(legacy.project.status, 'RESOLVED');
  assert.equal(legacy.project.selectedMapping?.governance, undefined);
});

test('D1 reads the MCP branch governance policy bounded and fail-closed, and ships it in the runtime image', async () => {
  const parsed = parseBranchGovernancePolicy(REAL_POLICY);
  assert.equal(parsed.status, 'CURRENT');
  assert.equal(parsed.policy?.pullRequestRequired, true);
  assert.equal(parsed.policy?.draftPrByDefault, true);
  assert.equal(parsed.policy?.mainDirectPushAllowed, false);
  assert.deepEqual(parsed.policy?.allowedPrefixes, ['mcp/', 'claude/', 'codex/']);
  assert.match(parsed.policy?.dirtyCountRule ?? '', /no_merge/);
  assert.match(parsed.reference ?? '', /^\.mcp\/branch-governance\.json@/);

  assert.deepEqual(parseBranchGovernancePolicy(null), { status: 'UNAVAILABLE', policy: null, reference: null, reasonCode: 'GOVERNANCE_POLICY_UNAVAILABLE' });
  for (const invalid of [{ ...REAL_POLICY, pullRequestRequired: 'yes' }, { ...REAL_POLICY, allowedPrefixes: 'mcp/' }, 'policy', []]) {
    const result = parseBranchGovernancePolicy(invalid);
    assert.equal(result.status, 'UNAVAILABLE', JSON.stringify(invalid));
    assert.equal(result.reasonCode, 'GOVERNANCE_POLICY_INVALID');
  }

  const directory = await mkdtemp(join(tmpdir(), 'mcp-d1-policy-'));
  try {
    assert.equal(await readBranchGovernancePolicy(join(directory, 'missing.json')), null);
    const oversized = join(directory, 'oversized.json');
    await writeFile(oversized, JSON.stringify({ padding: 'x'.repeat(70_000) }), 'utf8');
    await assert.rejects(readBranchGovernancePolicy(oversized));
    const malformed = join(directory, 'malformed.json');
    await writeFile(malformed, '{', 'utf8');
    await assert.rejects(readBranchGovernancePolicy(malformed));
    assert.deepEqual(await readBranchGovernancePolicy('.mcp/branch-governance.json'), REAL_POLICY);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
  const dockerfile = await readFile('Dockerfile', 'utf8');
  assert.match(dockerfile, /COPY \.mcp\/branch-governance\.json \.\/\.mcp\/branch-governance\.json/);
});

test('D1 inherits the MCP project constraints from the existing authorities on the proven project scope', () => {
  const inheritance = inherit();
  assert.equal(inheritance.status, 'INHERITED');
  assert.deepEqual(inheritance.scope, {
    projectId: 'mcp_bridge',
    repositoryId: MCP_REPOSITORY,
    mappingId: 'mcp-s1-production',
    componentRole: null,
    serverId: 's1'
  });
  assert.deepEqual(effects(inheritance), {
    OFFICIAL_BRANCH: 'REQUIRE',
    DIRECT_PUSH_TO_OFFICIAL_BRANCH: 'FORBID',
    BRANCH_PREFIXES: 'REQUIRE',
    PULL_REQUEST: 'REQUIRE',
    DRAFT_PULL_REQUEST: 'REQUIRE',
    REQUIRED_STATUS_CHECKS: 'REQUIRE',
    REQUIRED_APPROVALS: 'PERMIT',
    CONVERSATION_RESOLUTION: 'REQUIRE',
    DEPLOY: 'FORBID',
    BACKUP_BEFORE_DEPLOY: 'REQUIRE',
    WRITE_FILES: 'FORBID',
    CREATE_BRANCH: 'FORBID',
    COMMIT: 'FORBID',
    PUSH_BRANCH: 'FORBID',
    WRITE_TOOLS: 'PERMIT',
    PROJECT_LOCKS: 'PERMIT',
    CLEAN_WORKTREE: 'REQUIRE'
  });
  assert.equal(rule(inheritance, 'OFFICIAL_BRANCH').value, 'main');
  assert.deepEqual(rule(inheritance, 'DIRECT_PUSH_TO_OFFICIAL_BRANCH').authorities, [
    'GIT_REGISTRY_MAPPING', 'GITHUB_RULESET', 'MCP_BRANCH_GOVERNANCE'
  ]);
  assert.deepEqual(rule(inheritance, 'BRANCH_PREFIXES').value, ['claude/', 'codex/', 'mcp/']);
  assert.deepEqual(rule(inheritance, 'PULL_REQUEST').authorities, ['GITHUB_RULESET', 'MCP_BRANCH_GOVERNANCE']);
  assert.deepEqual(rule(inheritance, 'REQUIRED_STATUS_CHECKS').value, ['validate']);
  assert.equal(rule(inheritance, 'REQUIRED_APPROVALS').value, 0);
  assert.equal(rule(inheritance, 'WRITE_TOOLS').value, 'shadow');
  // The migrated V1 mapping keeps its candidate provenance; nothing is copied into a store.
  const mapping = inheritance.sources.find((source: any) => source.authority === 'GIT_REGISTRY_MAPPING');
  assert.equal(mapping?.state, 'CURRENT');
  assert.match(mapping?.reference ?? '', /^mcp-s1-production@[0-9a-f]{64}$/);
  assert.ok(mapping?.provenance.includes('git_registry_v2_candidate_from_v1'));
  assert.deepEqual(inheritance.contradictions, []);
  assert.equal(inheritance.authorizationInferred, false);
  assert.equal(inheritance.mutationPerformed, false);
});

test('D1 inheritance is project-scoped: another project inherits its own branch and only the evidence observed for it', () => {
  const africa = inherit({}, chain(REAL_REGISTRY, API_REPOSITORY));
  assert.equal(africa.scope?.projectId, AFRICAFUNDS);
  assert.equal(africa.scope?.mappingId, API_MAPPING);
  assert.equal(africa.scope?.serverId, 's2');
  assert.equal(rule(africa, 'OFFICIAL_BRANCH').value, AF_BRANCH);
  // The observed ruleset belongs to Patricked-code/MCP only: it is never lent to another repository.
  for (const ruleId of ['REQUIRED_STATUS_CHECKS', 'REQUIRED_APPROVALS', 'CONVERSATION_RESOLUTION']) {
    assert.equal(rule(africa, ruleId).effect, 'UNKNOWN', ruleId);
    assert.ok(rule(africa, ruleId).reasonCodes.includes('GOVERNANCE_RULESET_NOT_OBSERVED'), ruleId);
  }
  assert.equal(rule(africa, 'PULL_REQUEST').effect, 'REQUIRE');
  assert.deepEqual(rule(africa, 'PULL_REQUEST').authorities, ['MCP_BRANCH_GOVERNANCE']);
  // The main-branch policy does not speak for an official branch other than main.
  assert.deepEqual(rule(africa, 'DIRECT_PUSH_TO_OFFICIAL_BRANCH').authorities, ['GIT_REGISTRY_MAPPING']);
  assert.equal(africa.sources.find((source: any) => source.authority === 'GITHUB_RULESET')?.state, 'NOT_OBSERVED');
  assert.equal(africa.status, 'PARTIAL');

  // No proven project scope: nothing is inherited, never a global default.
  const unproven = inherit({ projectReality: deriveProjectReality({ observedAt: NOW }) });
  assert.equal(unproven.status, 'UNVERIFIED');
  assert.equal(unproven.scope, null);
  assert.deepEqual(unproven.rules, []);
  assert.deepEqual(unproven.reasonCodes, ['GOVERNANCE_SCOPE_UNVERIFIED']);
});

test('D1 composition never widens a permission and fails closed on stale or missing authorities', () => {
  const stale = inherit({ ruleset: ruleset({ freshness: 'STALE' }) });
  assert.equal(rule(stale, 'REQUIRED_STATUS_CHECKS').effect, 'UNKNOWN');
  assert.ok(rule(stale, 'REQUIRED_STATUS_CHECKS').reasonCodes.includes('GOVERNANCE_RULESET_STALE'));
  assert.equal(rule(stale, 'PULL_REQUEST').effect, 'REQUIRE');
  assert.equal(stale.status, 'PARTIAL');

  const noPolicy = inherit({ policy: parseBranchGovernancePolicy(null), ruleset: ruleset({ freshness: 'UNAVAILABLE' }) });
  assert.equal(rule(noPolicy, 'PULL_REQUEST').effect, 'UNKNOWN');
  assert.equal(rule(noPolicy, 'DRAFT_PULL_REQUEST').effect, 'UNKNOWN');
  assert.equal(rule(noPolicy, 'CLEAN_WORKTREE').effect, 'UNKNOWN');
  // One authority that forbids is enough; silence elsewhere never permits.
  assert.equal(rule(noPolicy, 'DIRECT_PUSH_TO_OFFICIAL_BRANCH').effect, 'FORBID');

  const undeclared = inherit({}, chain({ ...REAL_REGISTRY, governanceEvidence: undefined }, MCP_REPOSITORY));
  for (const ruleId of ['OFFICIAL_BRANCH', 'DEPLOY', 'BACKUP_BEFORE_DEPLOY', 'WRITE_FILES', 'CREATE_BRANCH', 'COMMIT', 'PUSH_BRANCH']) {
    assert.equal(rule(undeclared, ruleId).effect, 'UNKNOWN', ruleId);
  }
  assert.equal(rule(undeclared, 'DIRECT_PUSH_TO_OFFICIAL_BRANCH').effect, 'UNKNOWN');
  assert.equal(undeclared.status, 'PARTIAL');

  const base = chain(REAL_REGISTRY, MCP_REPOSITORY);
  const withMapping = (governance: Record<string, unknown>, activation = 'READY') => ({
    ...base.project,
    selectedMapping: {
      ...base.project.selectedMapping,
      activationReadiness: activation,
      governance: { ...base.project.selectedMapping.governance, ...governance }
    }
  });
  const deployable = { status: 'active', capabilities: { ...base.project.selectedMapping.governance.capabilities, deploy: true } };
  assert.equal(rule(inherit({ project: withMapping(deployable) }), 'DEPLOY').effect, 'PERMIT');
  assert.equal(rule(inherit({ project: withMapping(deployable, 'BLOCKED') }), 'DEPLOY').effect, 'FORBID');
  assert.equal(rule(inherit({ project: withMapping({ ...deployable, status: 'proposed' }) }), 'DEPLOY').effect, 'FORBID');
  assert.equal(rule(inherit({ project: withMapping(deployable, 'UNKNOWN') }), 'DEPLOY').effect, 'UNKNOWN');
  // A deployment target is inherited only on a proven server.
  const noServer = inherit({
    project: withMapping(deployable),
    projectReality: { ...base.projectReality, serverId: null }
  });
  assert.equal(rule(noServer, 'DEPLOY').effect, 'UNKNOWN');
  assert.ok(rule(noServer, 'DEPLOY').reasonCodes.includes('GOVERNANCE_SERVER_UNVERIFIED'));

  const disjoint = inherit({ project: withMapping({ allowedBranchPrefixes: ['feature/'] }) });
  assert.equal(rule(disjoint, 'BRANCH_PREFIXES').effect, 'FORBID');
  assert.equal(disjoint.status, 'CONFLICT');
  assert.deepEqual(disjoint.contradictions, [{ ruleId: 'BRANCH_PREFIXES', reasonCode: 'GOVERNANCE_BRANCH_PREFIXES_DISJOINT' }]);

  assert.equal(rule(inherit({ gate: { mode: 'off', existingWriteToolsEnabled: false } }), 'WRITE_TOOLS').effect, 'FORBID');
});

test('D1 inherits only the locks of its own project scope', () => {
  assert.equal(rule(inherit({ locks: null }), 'PROJECT_LOCKS').effect, 'UNKNOWN');
  const foreignRepository = inherit({ locks: [lock('repository:Patricked-code/MCP')] });
  assert.equal(rule(foreignRepository, 'PROJECT_LOCKS').effect, 'FORBID');
  assert.deepEqual(rule(foreignRepository, 'PROJECT_LOCKS').value, ['repository:Patricked-code/MCP']);
  assert.equal(rule(inherit({ locks: [lock('repository:patricked-code/mcp')] }), 'PROJECT_LOCKS').effect, 'FORBID');
  assert.equal(rule(inherit({ locks: [lock('component:mcp_bridge:mcp-s1-production')] }), 'PROJECT_LOCKS').effect, 'FORBID');
  assert.equal(rule(inherit({
    locks: [lock('resource:anything', { targetScope: { schemaVersion: 1, targetId: 'mcp_bridge', projectId: 'mcp_bridge', projectUid: null, components: [{ mappingId: 'mcp-s1-production', repositoryId: MCP_REPOSITORY, role: 'MCP' }] } })]
  }), 'PROJECT_LOCKS').effect, 'FORBID');
  // Locks of this session, released locks and other projects' locks do not constrain this scope.
  assert.equal(rule(inherit({ locks: [lock('repository:Patricked-code/MCP', { governedSessionId: SESSION_ID })] }), 'PROJECT_LOCKS').effect, 'PERMIT');
  assert.equal(rule(inherit({ locks: [lock('repository:Patricked-code/MCP', { status: 'RELEASED' })] }), 'PROJECT_LOCKS').effect, 'PERMIT');
  assert.equal(rule(inherit({ locks: [lock('repository:Patricked-code/Stablecoin')] }), 'PROJECT_LOCKS').effect, 'PERMIT');
});

test('D1 projects the inherited governance in the governed operational context', async () => {
  const base = chain(REAL_REGISTRY, MCP_REPOSITORY);
  const resolutions = {
    repositoryResolution: repositoryResolution(MCP_REPOSITORY),
    projectResolution: base.project,
    serverResolution: resolveProjectServer({
      project: base.project, registry: REAL_REGISTRY, serverMap: REAL_SERVER_MAP, managedServerIds: MANAGED, observedAt: NOW
    })
  };
  const github = {
    status: 'CURRENT',
    observedAt: NOW,
    mainHead: 'a'.repeat(40),
    workBranch: null,
    workBranchHead: null,
    pullRequest: null,
    checks: { status: 'unavailable', conclusion: null, total: 0, failed: 0, headSha: null, exactHead: null, required: [], requiredSatisfied: null },
    reviews: { approvals: 0, changesRequested: 0, unresolvedThreads: null },
    ruleset: ruleset().value,
    ownership: { pullRequestAuthor: null },
    activity: { lastActivityAt: null },
    ...resolutions,
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
    lastAcknowledgedStateVersion: null, bootstrapReceipt: null, blockers: [], lastCheckpoint: null
  });
  const service = (options: { session?: unknown; readBranchGovernance?: () => Promise<unknown>; locks?: unknown[] } = {}) => (
    createGovernedOperationalContextService({
      liveState: { getCurrent: async () => null, reconcileNow: async () => null },
      github: { getCurrent: async () => github, reconcileExplicit: async () => github },
      sessions: { getVisibleSession: async () => options.session === undefined ? session() : options.session },
      locks: { listActiveLocks: async () => options.locks ?? [] },
      gateMode: 'shadow',
      existingWriteToolsEnabled: false,
      now: () => new Date(NOW),
      ...(options.readBranchGovernance ? { readBranchGovernance: options.readBranchGovernance } : {})
    } as never)
  );
  const input = { governedSessionId: SESSION_ID, workBranch: null, request: {} } as never;

  const projected = (await service({ readBranchGovernance: async () => REAL_POLICY }).getCurrent(input)).governanceInheritance as any;
  assert.equal(projected.scope?.projectId, 'mcp_bridge');
  assert.equal(rule(projected, 'PULL_REQUEST').effect, 'REQUIRE');
  assert.deepEqual(rule(projected, 'REQUIRED_STATUS_CHECKS').value, ['validate']);
  // The service's own write gate and lock authority are inherited, not reinvented.
  assert.equal(rule(projected, 'WRITE_TOOLS').effect, 'FORBID');
  assert.equal(rule(projected, 'PROJECT_LOCKS').effect, 'PERMIT');

  const locked = (await service({
    readBranchGovernance: async () => REAL_POLICY,
    locks: [lock('repository:Patricked-code/MCP')]
  }).getCurrent(input)).governanceInheritance as any;
  assert.equal(rule(locked, 'PROJECT_LOCKS').effect, 'FORBID');
  // A project lock beyond the bounded lock projection of the context still forbids.
  const crowded = (await service({
    readBranchGovernance: async () => REAL_POLICY,
    locks: [
      ...Array.from({ length: 120 }, (_, index) => lock(`resource:elsewhere-${index}`)),
      lock('repository:Patricked-code/MCP')
    ]
  }).getCurrent(input)).governanceInheritance as any;
  assert.equal(rule(crowded, 'PROJECT_LOCKS').effect, 'FORBID');

  const unreadable = (await service({ readBranchGovernance: async () => { throw new Error('unreadable'); } }).getCurrent(input)).governanceInheritance as any;
  assert.equal(unreadable.sources.find((source: any) => source.authority === 'MCP_BRANCH_GOVERNANCE')?.state, 'UNAVAILABLE');
  assert.equal(rule(unreadable, 'DRAFT_PULL_REQUEST').effect, 'UNKNOWN');

  // The default reader is the versioned policy file.
  const defaulted = (await service().getCurrent(input)).governanceInheritance as any;
  assert.equal(defaulted.sources.find((source: any) => source.authority === 'MCP_BRANCH_GOVERNANCE')?.state, 'CURRENT');

  // B3.2: a session bound to an unobserved repository inherits nothing.
  const foreign = (await service({ session: session('Wealthtechinnovations/api_opcv') }).getCurrent(input)).governanceInheritance as any;
  assert.equal(foreign.status, 'UNVERIFIED');
  assert.deepEqual(foreign.rules, []);
});

test('D1 inheritance is pure, frozen, deterministic and read-only', async () => {
  const source = await readFile(MODULE_PATH, 'utf8');
  // File writes, not the registry's declared writeFiles capability flag.
  for (const forbidden of [/from 'node:fs/, /writeFile(Sync)?\(/, /child_process/, /fetch\(/, /from '\.\.\/\.\.\/ssh\//]) {
    assert.doesNotMatch(source, forbidden);
  }
  const first = inherit();
  assert.deepEqual(inherit(), first);
  assert.ok(Object.isFrozen(first));
  assert.ok(Object.isFrozen(first.rules));
  assert.ok(first.rules.every((entry: any) => Object.isFrozen(entry) && Object.isFrozen(entry.authorities)));
  assert.deepEqual(first.rules.map((entry: any) => entry.ruleId), [
    'OFFICIAL_BRANCH', 'DIRECT_PUSH_TO_OFFICIAL_BRANCH', 'BRANCH_PREFIXES', 'PULL_REQUEST', 'DRAFT_PULL_REQUEST',
    'REQUIRED_STATUS_CHECKS', 'REQUIRED_APPROVALS', 'CONVERSATION_RESOLUTION', 'DEPLOY', 'BACKUP_BEFORE_DEPLOY',
    'WRITE_FILES', 'CREATE_BRANCH', 'COMMIT', 'PUSH_BRANCH', 'WRITE_TOOLS', 'PROJECT_LOCKS', 'CLEAN_WORKTREE'
  ]);
});
