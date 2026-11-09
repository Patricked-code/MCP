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
const { deriveProjectReality } = await import('../src/github/projectReality.js');
const { deriveMissingContext } = await import('../src/governedContext/missingContext.js');
const { createGovernedOperationalContextService } = await import('../src/governedContext/service.js');

const NOW = '2026-10-05T14:00:00.000Z';
const SESSION_ID = '11111111-1111-4111-8111-111111111111';
const PRINCIPAL = 'oauth:subject-e1';
const MCP_REPOSITORY = 'github:Patricked-code/MCP';
const MANAGED = ['s1', 's2'];
const ITEMS = ['OAUTH_IDENTITY', 'GITHUB_IDENTITY', 'REPOSITORY', 'PROJECT_MAPPING', 'SERVER_BINDING'];
const MODULE_PATH = join(process.cwd(), 'src', 'governedContext', 'missingContext.ts');

const previousRegistryFile = process.env.MCP_GIT_REGISTRY_FILE;
process.env.MCP_GIT_REGISTRY_FILE = 'data/mcp-git-registry.json';
const REAL_REGISTRY: any = await readGitRegistryProjectEvidence();
if (previousRegistryFile === undefined) delete process.env.MCP_GIT_REGISTRY_FILE;
else process.env.MCP_GIT_REGISTRY_FILE = previousRegistryFile;
const REAL_SERVER_MAP = JSON.parse(await readFile('.mcp/server-map.json', 'utf8'));

function repositoryResolution(): any {
  return {
    status: 'RESOLVED',
    observedAt: NOW,
    requestedRepositoryContext: 'Patricked-code/MCP',
    selectionSource: 'connection_context',
    selectedAccountContext: { owner: 'Patricked-code', type: 'organization' },
    selectedRepository: {
      repositoryId: MCP_REPOSITORY, githubRepositoryId: 1, owner: 'Patricked-code', ownerType: 'organization',
      name: 'MCP', fullName: 'Patricked-code/MCP', defaultBranch: 'main', visibility: 'private', archived: false, fork: false
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

function chain() {
  const repository = repositoryResolution();
  const project = resolveGithubProject({ repository, registry: REAL_REGISTRY, observedAt: NOW });
  const server = resolveProjectServer({
    project, registry: REAL_REGISTRY, serverMap: REAL_SERVER_MAP, managedServerIds: MANAGED, observedAt: NOW
  });
  return { repository, project, server, projectReality: deriveProjectReality({ repository, project, server, observedAt: NOW }) };
}

function withLayer(reality: any, layerId: string, state: string, reasonCodes: string[]) {
  return {
    ...reality,
    layers: reality.layers.map((layer: any) => (layer.layer === layerId ? { ...layer, state, reasonCodes } : layer))
  };
}

function githubIdentity(overrides: Record<string, unknown> = {}): any {
  return {
    status: 'RESOLVED',
    observedAt: NOW,
    bindingId: 'binding-e1',
    oauthPrincipalId: PRINCIPAL,
    repositoryContext: 'Patricked-code/MCP',
    authenticatedPrincipal: { provider: 'github', login: 'secret-login-e1', accountType: 'user' },
    selectedAccountContext: { owner: 'Patricked-code', type: 'user', source: 'durable_account' },
    accessibleAccountContexts: [],
    freshness: 'CURRENT',
    provenance: ['github_identity_resolution'],
    reasonCodes: [],
    policyDigest: null,
    ...overrides
  };
}

function session(overrides: Record<string, unknown> = {}): any {
  return {
    schemaVersion: 1,
    governedSessionId: SESSION_ID,
    repository: 'Patricked-code/MCP',
    workBranch: null,
    status: 'ACTIVE',
    identityAssurance: 'oauth_subject',
    connectionContext: {
      schemaVersion: 1,
      connectionContextId: '33333333-3333-4333-8333-333333333333',
      governedSessionId: SESSION_ID,
      repository: 'Patricked-code/MCP',
      principalId: PRINCIPAL,
      observedClientId: null,
      identityAssurance: 'oauth_subject',
      clientClassification: 'UNRESOLVED',
      evidenceSource: 'oauth_auth_info',
      createdAt: NOW
    },
    lastAcknowledgedStateVersion: null,
    bootstrapReceipt: null,
    blockers: [],
    lastCheckpoint: null,
    ...overrides
  };
}

function context(overrides: { session?: any; identity?: any; reality?: any; error?: string | null; repository?: string } = {}): any {
  return {
    generatedAt: NOW,
    repository: overrides.repository ?? 'Patricked-code/MCP',
    session: overrides.session === undefined ? session() : overrides.session,
    github: {
      status: 'CURRENT',
      error: overrides.error ?? null,
      identity: overrides.identity === undefined ? githubIdentity() : overrides.identity
    },
    projectReality: overrides.reality === undefined ? chain().projectReality : overrides.reality
  };
}

function item(missing: any, id: string): any {
  return missing.items.find((entry: any) => entry.item === id);
}

test('E1 reports a complete context when every mandatory input is proven', () => {
  const missing = deriveMissingContext(context()) as any;
  assert.equal(missing.status, 'COMPLETE');
  assert.deepEqual(missing.items.map((entry: any) => entry.item), ITEMS);
  for (const entry of missing.items) {
    assert.equal(entry.state, 'RESOLVED', entry.item);
    assert.equal(entry.completion, 'NONE', entry.item);
    assert.equal(entry.surface, null, entry.item);
    assert.deepEqual(entry.reasonCodes, [], entry.item);
  }
  assert.equal(missing.next, null);
  assert.equal(missing.observedAt, NOW);
  assert.equal(missing.authorizationInferred, false);
  assert.equal(missing.mutationPerformed, false);
});

test('E1 surfaces only the first unresolved input and never asks for known or downstream context', () => {
  // Without a governed session, opening one is an automatic step, not a question.
  const unbound = deriveMissingContext(context({ session: null })) as any;
  assert.equal(unbound.status, 'AUTOMATIC');
  assert.deepEqual(item(unbound, 'OAUTH_IDENTITY'), {
    item: 'OAUTH_IDENTITY',
    state: 'UNOBSERVED',
    completion: 'AUTOMATIC',
    surface: 'mcp_open_governed_session',
    reasonCodes: ['MISSING_CONTEXT_SESSION_UNBOUND']
  });
  for (const id of ITEMS.slice(1)) {
    assert.deepEqual(item(unbound, id), {
      item: id,
      state: 'BLOCKED_UPSTREAM',
      completion: 'AFTER_UPSTREAM',
      surface: null,
      reasonCodes: ['MISSING_CONTEXT_UPSTREAM_UNRESOLVED']
    }, id);
  }
  assert.deepEqual(unbound.next, item(unbound, 'OAUTH_IDENTITY'));

  // A shared credential cannot be completed by the agent: the client connects through OAuth.
  const shared = deriveMissingContext(context({ session: session({ identityAssurance: 'shared_credential', connectionContext: null }) })) as any;
  assert.equal(shared.status, 'INPUT_REQUIRED');
  assert.deepEqual(item(shared, 'OAUTH_IDENTITY'), {
    item: 'OAUTH_IDENTITY',
    state: 'MISSING',
    completion: 'OPERATOR_INPUT',
    surface: '/oauth/authorize',
    reasonCodes: ['MISSING_CONTEXT_OAUTH_IDENTITY_REQUIRED']
  });

  // An OAuth session opened without a bound connection context is re-opened automatically.
  const legacy = deriveMissingContext(context({ session: session({ connectionContext: null }) })) as any;
  assert.equal(legacy.status, 'AUTOMATIC');
  assert.deepEqual(item(legacy, 'OAUTH_IDENTITY'), {
    item: 'OAUTH_IDENTITY',
    state: 'UNOBSERVED',
    completion: 'AUTOMATIC',
    surface: 'mcp_open_governed_session',
    reasonCodes: ['MISSING_CONTEXT_CONNECTION_CONTEXT_UNBOUND']
  });

  // Known context stays resolved: a missing mapping asks only for the mapping.
  const reality = withLayer(chain().projectReality, 'PROJECT', 'NONE', ['GITHUB_PROJECT_MAPPING_NOT_FOUND']);
  const noMapping = deriveMissingContext(context({ reality })) as any;
  assert.equal(noMapping.status, 'INPUT_REQUIRED');
  for (const id of ['OAUTH_IDENTITY', 'GITHUB_IDENTITY', 'REPOSITORY']) assert.equal(item(noMapping, id).state, 'RESOLVED', id);
  assert.deepEqual(item(noMapping, 'PROJECT_MAPPING'), {
    item: 'PROJECT_MAPPING',
    state: 'MISSING',
    completion: 'OPERATOR_INPUT',
    surface: '/git',
    reasonCodes: ['GITHUB_PROJECT_MAPPING_NOT_FOUND']
  });
  assert.equal(item(noMapping, 'SERVER_BINDING').state, 'BLOCKED_UPSTREAM');
  assert.equal(noMapping.next?.item, 'PROJECT_MAPPING');
});

test('E1 points every GitHub identity gap at the authority that owns it', () => {
  const cases: Array<[string, any, string, string, string | null]> = [
    ['binding not found', githubIdentity({ status: 'NONE', reasonCodes: ['GITHUB_IDENTITY_BINDING_NOT_FOUND'] }), 'MISSING', 'OPERATOR_INPUT', '.mcp/identity-policy.json'],
    ['several bindings', githubIdentity({ status: 'AMBIGUOUS', reasonCodes: ['GITHUB_IDENTITY_BINDING_AMBIGUOUS'] }), 'AMBIGUOUS', 'OPERATOR_CHOICE', '.mcp/identity-policy.json'],
    ['connection not configured', githubIdentity({ status: 'UNVERIFIED', reasonCodes: ['GITHUB_IDENTITY_CONNECTION_NOT_FOUND'] }), 'MISSING', 'OPERATOR_INPUT', 'data/github-accounts.json'],
    ['several connections', githubIdentity({ status: 'AMBIGUOUS', reasonCodes: ['GITHUB_IDENTITY_CONNECTION_AMBIGUOUS'] }), 'AMBIGUOUS', 'OPERATOR_CHOICE', 'data/github-accounts.json'],
    ['connection unusable', githubIdentity({ status: 'UNVERIFIED', reasonCodes: ['GITHUB_IDENTITY_AUTHENTICATION_CONTEXT_UNAVAILABLE'] }), 'MISSING', 'OPERATOR_INPUT', 'data/github-accounts.json'],
    ['credential missing', githubIdentity({ status: 'UNVERIFIED', reasonCodes: ['GITHUB_IDENTITY_AUTH_MISSING'] }), 'MISSING', 'OPERATOR_INPUT', '/github'],
    ['credential invalid', githubIdentity({ status: 'UNVERIFIED', reasonCodes: ['GITHUB_IDENTITY_AUTH_INVALID'] }), 'MISSING', 'OPERATOR_INPUT', '/github'],
    ['account unverified', githubIdentity({ status: 'UNVERIFIED', reasonCodes: ['GITHUB_IDENTITY_ACCOUNT_CONTEXT_UNVERIFIED'] }), 'MISSING', 'OPERATOR_INPUT', '/github'],
    ['other principal', githubIdentity({ status: 'UNVERIFIED', reasonCodes: ['GITHUB_IDENTITY_PRINCIPAL_MISMATCH'] }), 'CONFLICT', 'RECONCILIATION', null],
    ['policy invalid', githubIdentity({ status: 'UNVERIFIED', reasonCodes: ['GITHUB_IDENTITY_POLICY_INVALID'] }), 'CONFLICT', 'RECONCILIATION', null],
    ['api unavailable', githubIdentity({ status: 'UNVERIFIED', reasonCodes: ['GITHUB_IDENTITY_API_UNAVAILABLE'] }), 'UNOBSERVED', 'AUTOMATIC', 'mcp_reconcile_governed_context'],
    ['stale evidence', githubIdentity({ status: 'UNVERIFIED', reasonCodes: ['GITHUB_IDENTITY_EVIDENCE_STALE'] }), 'UNOBSERVED', 'AUTOMATIC', 'mcp_reconcile_governed_context'],
    ['stale resolution', githubIdentity({ freshness: 'STALE' }), 'UNOBSERVED', 'AUTOMATIC', 'mcp_reconcile_governed_context'],
    ['no resolution', null, 'UNOBSERVED', 'AUTOMATIC', 'mcp_reconcile_governed_context']
  ];
  for (const [label, identity, state, completion, surface] of cases) {
    const missing = deriveMissingContext(context({ identity })) as any;
    const entry = item(missing, 'GITHUB_IDENTITY');
    assert.equal(entry.state, state, label);
    assert.equal(entry.completion, completion, label);
    assert.equal(entry.surface, surface, label);
    assert.ok(entry.reasonCodes.length > 0, label);
    assert.equal(item(missing, 'OAUTH_IDENTITY').state, 'RESOLVED', label);
    assert.equal(item(missing, 'REPOSITORY').state, 'BLOCKED_UPSTREAM', label);
    assert.deepEqual(missing.next, entry, label);
  }
  // A resolved identity whose evidence went stale says so with the resolver's own code.
  const stale = item(deriveMissingContext(context({ identity: githubIdentity({ freshness: 'STALE' }) })), 'GITHUB_IDENTITY');
  assert.deepEqual(stale.reasonCodes, ['GITHUB_IDENTITY_EVIDENCE_STALE']);
});

test('E1 distinguishes missing data, choices, conflicts and evidence that re-observation restores', () => {
  const base = chain().projectReality;
  const layerCases: Array<[string, string, string, string[], string, string, string | null]> = [
    ['repository not supplied', 'REPOSITORY', 'NONE', ['GITHUB_REPOSITORY_CANDIDATE_NOT_FOUND'], 'MISSING', 'OPERATOR_INPUT', 'mcp_open_governed_session'],
    ['repository candidates', 'REPOSITORY', 'AMBIGUOUS', ['GITHUB_REPOSITORY_CANDIDATE_AMBIGUOUS'], 'AMBIGUOUS', 'OPERATOR_CHOICE', 'mcp_open_governed_session'],
    ['repository invisible', 'REPOSITORY', 'UNVERIFIED', ['GITHUB_REPOSITORY_NOT_FOUND_OR_INVISIBLE'], 'MISSING', 'OPERATOR_INPUT', '/github'],
    ['repository permission', 'REPOSITORY', 'UNVERIFIED', ['GITHUB_REPOSITORY_PERMISSION_DENIED'], 'MISSING', 'OPERATOR_INPUT', '/github'],
    ['repository credential', 'REPOSITORY', 'UNVERIFIED', ['GITHUB_REPOSITORY_AUTH_INVALID'], 'MISSING', 'OPERATOR_INPUT', '/github'],
    ['repository account', 'REPOSITORY', 'CONFLICT', ['GITHUB_REPOSITORY_ACCOUNT_CONTEXT_MISMATCH'], 'CONFLICT', 'RECONCILIATION', null],
    ['repository stale', 'REPOSITORY', 'STALE', ['GITHUB_REPOSITORY_EVIDENCE_STALE'], 'UNOBSERVED', 'AUTOMATIC', 'mcp_reconcile_governed_context'],
    ['mapping ambiguous', 'PROJECT', 'AMBIGUOUS', ['GITHUB_PROJECT_MAPPING_AMBIGUOUS'], 'AMBIGUOUS', 'OPERATOR_CHOICE', '/git'],
    ['mapping conflict', 'PROJECT', 'CONFLICT', ['GITHUB_PROJECT_REGISTRY_MISMATCH'], 'CONFLICT', 'RECONCILIATION', null],
    ['registry unavailable', 'PROJECT', 'UNVERIFIED', ['GITHUB_PROJECT_REGISTRY_UNAVAILABLE'], 'UNOBSERVED', 'AUTOMATIC', 'mcp_reconcile_governed_context'],
    ['server unbound', 'SERVER', 'NONE', ['SERVER_HINT_NOT_BOUND'], 'MISSING', 'OPERATOR_INPUT', '/git'],
    ['server ambiguous', 'SERVER', 'AMBIGUOUS', ['SERVER_BINDING_AMBIGUOUS'], 'AMBIGUOUS', 'OPERATOR_CHOICE', '/git'],
    ['server conflict', 'SERVER', 'CONFLICT', ['SERVER_REGISTRY_MISMATCH'], 'CONFLICT', 'RECONCILIATION', null],
    // Authorities that disagree are reconciled, never re-observed in a loop or asked again.
    ['server identity undeclared', 'SERVER', 'UNVERIFIED', ['SERVER_ID_UNVERIFIED'], 'CONFLICT', 'RECONCILIATION', null],
    ['server mapping mismatch', 'SERVER', 'UNVERIFIED', ['SERVER_PROJECT_MAPPING_MISMATCH'], 'CONFLICT', 'RECONCILIATION', null]
  ];
  const itemOf: Record<string, string> = { REPOSITORY: 'REPOSITORY', PROJECT: 'PROJECT_MAPPING', SERVER: 'SERVER_BINDING' };
  for (const [label, layer, layerState, reasonCodes, state, completion, surface] of layerCases) {
    const missing = deriveMissingContext(context({ reality: withLayer(base, layer, layerState, reasonCodes) })) as any;
    const entry = item(missing, itemOf[layer]!);
    assert.equal(entry.state, state, label);
    assert.equal(entry.completion, completion, label);
    assert.equal(entry.surface, surface, label);
    assert.deepEqual(entry.reasonCodes, reasonCodes, label);
    assert.deepEqual(missing.next, entry, label);
  }

  const conflict = deriveMissingContext(context({ reality: withLayer(base, 'SERVER', 'CONFLICT', ['SERVER_REGISTRY_MISMATCH']) })) as any;
  assert.equal(conflict.status, 'RECONCILIATION_REQUIRED');
  const choice = deriveMissingContext(context({ reality: withLayer(base, 'SERVER', 'AMBIGUOUS', ['SERVER_BINDING_AMBIGUOUS']) })) as any;
  assert.equal(choice.status, 'INPUT_REQUIRED');
  const automatic = deriveMissingContext(context({ reality: withLayer(base, 'PROJECT', 'UNVERIFIED', ['GITHUB_PROJECT_REGISTRY_UNAVAILABLE']) })) as any;
  assert.equal(automatic.status, 'AUTOMATIC');

  // The reality of another repository never speaks for the session repository.
  const foreign = deriveMissingContext(context({ repository: 'Patricked-code/Other' })) as any;
  assert.equal(foreign.status, 'RECONCILIATION_REQUIRED');
  assert.deepEqual(item(foreign, 'REPOSITORY'), {
    item: 'REPOSITORY',
    state: 'CONFLICT',
    completion: 'RECONCILIATION',
    surface: null,
    reasonCodes: ['MISSING_CONTEXT_REPOSITORY_BINDING_MISMATCH']
  });

  // A context without a composed project reality is re-observed, not asked.
  const unprojected = deriveMissingContext({ ...context(), projectReality: undefined }) as any;
  assert.equal(unprojected.status, 'AUTOMATIC');
  assert.deepEqual(item(unprojected, 'REPOSITORY'), {
    item: 'REPOSITORY',
    state: 'UNOBSERVED',
    completion: 'AUTOMATIC',
    surface: 'mcp_reconcile_governed_context',
    reasonCodes: ['MISSING_CONTEXT_PROJECT_REALITY_UNAVAILABLE']
  });
});

test('E1 never pretends re-observation can reach an unobserved target repository', () => {
  const scoped = deriveMissingContext(context({
    repository: 'Wealthtechinnovations/api_opcv',
    session: session({ repository: 'Wealthtechinnovations/api_opcv' }),
    identity: githubIdentity({ status: 'UNVERIFIED', reasonCodes: ['GITHUB_IDENTITY_API_UNAVAILABLE'] }),
    error: 'github_target_repository_not_observed'
  })) as any;
  assert.equal(scoped.status, 'UNOBSERVABLE');
  assert.deepEqual(item(scoped, 'GITHUB_IDENTITY'), {
    item: 'GITHUB_IDENTITY',
    state: 'UNOBSERVED',
    completion: 'UNAVAILABLE',
    surface: null,
    reasonCodes: ['MISSING_CONTEXT_TARGET_REPOSITORY_NOT_OBSERVED']
  });
  assert.equal(item(scoped, 'REPOSITORY').state, 'BLOCKED_UPSTREAM');
});

test('E1 is pure, frozen and carries no identity value', async () => {
  const input = context({ identity: githubIdentity({ status: 'NONE', reasonCodes: ['GITHUB_IDENTITY_BINDING_NOT_FOUND'] }) });
  const before = JSON.stringify(input);
  const missing = deriveMissingContext(input) as any;
  assert.equal(JSON.stringify(input), before);
  assert.ok(Object.isFrozen(missing));
  assert.ok(Object.isFrozen(missing.items));
  assert.ok(missing.items.every((entry: any) => Object.isFrozen(entry) && Object.isFrozen(entry.reasonCodes)));
  const serialized = JSON.stringify(deriveMissingContext(context()));
  for (const forbidden of [PRINCIPAL, 'secret-login-e1', '33333333-3333-4333-8333-333333333333', 'binding-e1']) {
    assert.equal(serialized.includes(forbidden), false, forbidden);
    assert.equal(JSON.stringify(missing).includes(forbidden), false, forbidden);
  }
  // Only reason codes travel: a value that is not a code never reaches the projection.
  const leaked = deriveMissingContext(context({
    reality: withLayer(chain().projectReality, 'PROJECT', 'NONE', ['GITHUB_PROJECT_MAPPING_NOT_FOUND', 'secret-login-e1'])
  })) as any;
  assert.deepEqual(item(leaked, 'PROJECT_MAPPING').reasonCodes, ['GITHUB_PROJECT_MAPPING_NOT_FOUND']);
  const source = await readFile(MODULE_PATH, 'utf8');
  assert.doesNotMatch(source, /writeFile(Sync)?\(|fetch\(|child_process|process\.env/);
});

test('E1 projects the missing context in the governed operational context', async () => {
  const base = chain();
  const github = {
    status: 'CURRENT',
    observedAt: NOW,
    mainHead: 'a'.repeat(40),
    workBranch: null,
    workBranchHead: null,
    pullRequest: null,
    checks: { status: 'unavailable', conclusion: null, total: 0, failed: 0, headSha: null, exactHead: null, required: [], requiredSatisfied: null },
    reviews: { approvals: 0, changesRequested: 0, unresolvedThreads: null },
    ruleset: { name: null, enforcement: null, requiresPullRequest: null, requiredStatusChecks: [], requiresConversationResolution: null },
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
      ruleset: { freshness: 'UNAVAILABLE', observedAt: NOW, provenance: 'github_api' }
    },
    reasonCodes: [],
    uncertainties: [],
    error: null
  };
  const scopes: any[] = [];
  const service = (visible: unknown) => createGovernedOperationalContextService({
    liveState: { getCurrent: async () => null, reconcileNow: async () => null },
    github: {
      getCurrent: async (_branch: unknown, scope: unknown) => { scopes.push(scope); return github; },
      reconcileExplicit: async (_branch: unknown, scope: unknown) => { scopes.push(scope); return github; }
    },
    sessions: { getVisibleSession: async () => visible },
    locks: { listActiveLocks: async () => [] },
    gateMode: 'shadow',
    existingWriteToolsEnabled: false,
    now: () => new Date(NOW),
    readBranchGovernance: async () => null
  } as never);
  const input = { governedSessionId: SESSION_ID, workBranch: null, request: {} } as never;

  const complete = (await service(session()).getCurrent(input)).missingContext as any;
  assert.equal(complete.status, 'COMPLETE');
  assert.equal(complete.next, null);
  assert.equal(scopes.at(-1)?.oauthPrincipalId, PRINCIPAL);

  const anonymous = (await service(null).getCurrent(input)).missingContext as any;
  assert.equal(anonymous.status, 'AUTOMATIC');
  assert.equal(anonymous.next?.item, 'OAUTH_IDENTITY');

  // E1 and the GitHub identity scope agree on which sessions carry an OAuth identity.
  const shared = (await service(session({ identityAssurance: 'shared_credential', connectionContext: null })).getCurrent(input)).missingContext as any;
  assert.equal(scopes.at(-1)?.oauthPrincipalId, null);
  assert.equal(item(shared, 'OAUTH_IDENTITY').state, 'MISSING');
  assert.equal(shared.next?.item, 'OAUTH_IDENTITY');
});
