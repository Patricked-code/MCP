import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';

process.env.MCP_AUTH_TOKEN ??= 'mcp-unit-test-value-20261005-abcdef';
process.env.S1_HOST ??= '127.0.0.1';
process.env.S1_KEY_PATH ??= '/tmp/mcp-unit-test-s1-key';
process.env.S2_HOST ??= '127.0.0.1';
process.env.S2_KEY_PATH ??= '/tmp/mcp-unit-test-s2-key';

const previousRegistryFile = process.env.MCP_GIT_REGISTRY_FILE;
process.env.MCP_GIT_REGISTRY_FILE = 'data/mcp-git-registry.json';
const { readGitRegistry, readGitRegistryProjectEvidence, renderGitSettingsPage } = await import('../src/github/registry.js');
const REAL_EVIDENCE: any = await readGitRegistryProjectEvidence();
const REAL_REGISTRY: any = await readGitRegistry();
if (previousRegistryFile === undefined) delete process.env.MCP_GIT_REGISTRY_FILE;
else process.env.MCP_GIT_REGISTRY_FILE = previousRegistryFile;

const {
  deriveContextCompletion,
  deriveRepositoryMappingCompletion,
  safeWebReturnPath
} = await import('../src/governedContext/contextCompletion.js');
const {
  deriveGithubCredentialCompletion,
  renderGithubConnectionPage,
  validateGithubToken
} = await import('../src/github/connection.js');
const { resolveGithubProject } = await import('../src/github/projectResolution.js');
const { resolveProjectServer } = await import('../src/github/serverResolution.js');
const { createGovernedOperationalContextService } = await import('../src/governedContext/service.js');

const NOW = '2026-10-05T18:30:00.000Z';
const BASE = 'https://mcp.example.test';
const REPOSITORY = 'Patricked-code/MCP';
const SESSION_ID = '11111111-1111-4111-8111-111111111111';
const PRINCIPAL = 'oauth:subject-e2';
const ITEMS = ['OAUTH_IDENTITY', 'GITHUB_IDENTITY', 'REPOSITORY', 'PROJECT_MAPPING', 'SERVER_BINDING'];
const MODULE_PATH = join(process.cwd(), 'src', 'governedContext', 'contextCompletion.ts');
const STATUS_OF: Record<string, string> = {
  AUTOMATIC: 'AUTOMATIC',
  OPERATOR_INPUT: 'INPUT_REQUIRED',
  OPERATOR_CHOICE: 'INPUT_REQUIRED',
  RECONCILIATION: 'RECONCILIATION_REQUIRED',
  UNAVAILABLE: 'UNOBSERVABLE'
};

/** An E1-shaped missing context whose first gap is `gapItem`. */
function missing(
  gapItem: string | null,
  state = 'MISSING',
  completion = 'OPERATOR_INPUT',
  surface: string | null = null,
  reasonCodes: string[] = ['MISSING_CONTEXT_TEST_GAP']
): any {
  let seen = false;
  const items = ITEMS.map((id) => {
    if (seen) {
      return { item: id, state: 'BLOCKED_UPSTREAM', completion: 'AFTER_UPSTREAM', surface: null, reasonCodes: ['MISSING_CONTEXT_UPSTREAM_UNRESOLVED'] };
    }
    if (id === gapItem) {
      seen = true;
      return { item: id, state, completion, surface, reasonCodes };
    }
    return { item: id, state: 'RESOLVED', completion: 'NONE', surface: null, reasonCodes: [] };
  });
  const next = items.find((entry) => entry.item === gapItem) ?? null;
  return {
    status: next ? STATUS_OF[completion] : 'COMPLETE',
    observedAt: NOW,
    items,
    next,
    authorizationInferred: false,
    mutationPerformed: false
  };
}

function step(gap: any, options: { baseUrl?: string | null; repository?: string | null } = {}): any {
  return deriveContextCompletion(gap, {
    baseUrl: options.baseUrl === undefined ? BASE : options.baseUrl,
    repository: options.repository === undefined ? REPOSITORY : options.repository
  });
}

test('E2 turns the E1 gap into one completion step and never asks for anything else', () => {
  const complete = step(missing(null)) as any;
  assert.equal(complete.status, 'COMPLETE');
  assert.deepEqual(complete.step, { action: 'NONE', item: null, ask: null, tool: null, url: null, authority: null, reasonCodes: [] });
  assert.deepEqual(complete.doNotAsk, ITEMS);
  assert.equal(complete.authorizationInferred, false);
  assert.equal(complete.mutationPerformed, false);

  // Automatic gaps are restored through the named tool, without a question.
  const unbound = step(missing('OAUTH_IDENTITY', 'UNOBSERVED', 'AUTOMATIC', 'mcp_open_governed_session', ['MISSING_CONTEXT_SESSION_UNBOUND'])) as any;
  assert.deepEqual(unbound.step, {
    action: 'CALL_TOOL', item: 'OAUTH_IDENTITY', ask: null, tool: 'mcp_open_governed_session', url: null, authority: null,
    reasonCodes: ['MISSING_CONTEXT_SESSION_UNBOUND']
  });
  assert.deepEqual(unbound.doNotAsk, ITEMS.slice(1));
  const reobserve = step(missing('GITHUB_IDENTITY', 'UNOBSERVED', 'AUTOMATIC', 'mcp_reconcile_governed_context')) as any;
  assert.equal(reobserve.step.action, 'CALL_TOOL');
  assert.equal(reobserve.step.tool, 'mcp_reconcile_governed_context');

  // Only the surfaced gap is requested, on the existing web surface E1 names.
  const credential = step(missing('GITHUB_IDENTITY', 'MISSING', 'OPERATOR_INPUT', '/github', ['GITHUB_IDENTITY_AUTH_INVALID'])) as any;
  assert.deepEqual(credential.step, {
    action: 'ASK_OPERATOR', item: 'GITHUB_IDENTITY', ask: 'INPUT', tool: null, url: `${BASE}/github`, authority: null,
    reasonCodes: ['GITHUB_IDENTITY_AUTH_INVALID']
  });
  assert.deepEqual(credential.doNotAsk, ['OAUTH_IDENTITY', 'REPOSITORY', 'PROJECT_MAPPING', 'SERVER_BINDING']);
  const mapping = step(missing('PROJECT_MAPPING', 'MISSING', 'OPERATOR_INPUT', '/git')) as any;
  assert.equal(mapping.step.action, 'ASK_OPERATOR');
  assert.equal(mapping.step.url, `${BASE}/git?repository=Patricked-code%2FMCP`);
  const choice = step(missing('SERVER_BINDING', 'AMBIGUOUS', 'OPERATOR_CHOICE', '/git')) as any;
  assert.equal(choice.step.ask, 'CHOICE');
  assert.equal(choice.status, 'INPUT_REQUIRED');

  // The requested repository is the operator's answer to the session tool, not a web form.
  const repository = step(missing('REPOSITORY', 'AMBIGUOUS', 'OPERATOR_CHOICE', 'mcp_open_governed_session')) as any;
  assert.deepEqual(
    [repository.step.action, repository.step.ask, repository.step.tool, repository.step.url],
    ['ASK_OPERATOR', 'CHOICE', 'mcp_open_governed_session', null]
  );
  // OAuth is started by the client connector: there is no page to send the operator to.
  const oauth = step(missing('OAUTH_IDENTITY', 'MISSING', 'OPERATOR_INPUT', '/oauth/authorize')) as any;
  assert.deepEqual([oauth.step.action, oauth.step.url], ['ASK_OPERATOR', null]);
  const unknown = step(missing('GITHUB_IDENTITY', 'MISSING', 'OPERATOR_INPUT', null)) as any;
  assert.deepEqual([unknown.step.action, unknown.step.url], ['ASK_OPERATOR', null]);
});

test('E2 routes versioned and server authorities, conflicts and unobservable gaps without a form', () => {
  const binding = step(missing('GITHUB_IDENTITY', 'MISSING', 'OPERATOR_INPUT', '.mcp/identity-policy.json')) as any;
  assert.deepEqual(
    [binding.step.action, binding.step.ask, binding.step.authority, binding.step.url, binding.step.tool],
    ['PROPOSE_GOVERNED_CHANGE', 'INPUT', '.mcp/identity-policy.json', null, null]
  );
  const accounts = step(missing('GITHUB_IDENTITY', 'AMBIGUOUS', 'OPERATOR_CHOICE', 'data/github-accounts.json')) as any;
  assert.deepEqual(
    [accounts.step.action, accounts.step.ask, accounts.step.authority],
    ['PROPOSE_GOVERNED_CHANGE', 'CHOICE', 'data/github-accounts.json']
  );
  const conflict = step(missing('SERVER_BINDING', 'CONFLICT', 'RECONCILIATION', null, ['SERVER_REGISTRY_MISMATCH'])) as any;
  assert.deepEqual(
    [conflict.status, conflict.step.action, conflict.step.ask, conflict.step.url],
    ['RECONCILIATION_REQUIRED', 'RECONCILE', null, null]
  );
  assert.deepEqual(conflict.step.reasonCodes, ['SERVER_REGISTRY_MISMATCH']);
  const unobservable = step(missing('GITHUB_IDENTITY', 'UNOBSERVED', 'UNAVAILABLE', null, ['MISSING_CONTEXT_TARGET_REPOSITORY_NOT_OBSERVED'])) as any;
  assert.deepEqual([unobservable.status, unobservable.step.action, unobservable.step.tool], ['UNOBSERVABLE', 'UNAVAILABLE', null]);
});

test('E2 links only to the configured public MCP origin and to a well-formed repository', () => {
  const gap = missing('GITHUB_IDENTITY', 'MISSING', 'OPERATOR_INPUT', '/github');
  assert.equal(step(gap, { baseUrl: `${BASE}/` }).step.url, `${BASE}/github`);
  assert.equal(step(gap, { baseUrl: 'http://127.0.0.1:8787' }).step.url, 'http://127.0.0.1:8787/github');
  for (const baseUrl of [null, '', 'javascript:alert(1)', 'http://mcp.example.test', `${BASE}/path`, `${BASE}?x=1`, 'ftp://mcp.example.test']) {
    assert.equal(step(gap, { baseUrl }).step.url, null, String(baseUrl));
  }
  const mapping = missing('PROJECT_MAPPING', 'MISSING', 'OPERATOR_INPUT', '/git');
  for (const repository of [null, '../etc', 'a b/c', 'owner/repo/extra', 'owner/', '/repo']) {
    assert.equal(step(mapping, { repository }).step.url, `${BASE}/git`, String(repository));
  }
  const completion = step(mapping) as any;
  assert.ok(Object.isFrozen(completion) && Object.isFrozen(completion.step) && Object.isFrozen(completion.doNotAsk));
  assert.ok(Object.isFrozen(completion.step.reasonCodes));
});

function connection(overrides: Record<string, unknown> = {}): any {
  return {
    configured: true,
    connected: false,
    org: 'Patricked-code',
    login: null,
    tokenFile: '/app/secrets/github_token',
    tokenFileExists: true,
    tokenFileMode: '600',
    tokenExpiresAt: null,
    oauthScopes: [],
    orgAccessible: false,
    reposVisible: null,
    canReadReposHint: false,
    canWriteReposHint: false,
    canAdminOrgHint: false,
    warnings: [],
    error: null,
    userCheckStatus: null,
    orgCheckStatus: null,
    ...overrides
  };
}

const CONNECTED = { connected: true, login: 'octo-e2', orgAccessible: true, userCheckStatus: 200, orgCheckStatus: 200 };

test('the GitHub credential is requested only when it is missing, refused or blind to the organization', () => {
  const cases: Array<[string, Record<string, unknown>, string, boolean, string]> = [
    ['no credential', { tokenFileExists: false }, 'MISSING', true, 'COMPLETION_GITHUB_CREDENTIAL_MISSING'],
    ['refused credential', { userCheckStatus: 401, error: 'GitHub user check failed with HTTP 401' }, 'MISSING', true, 'COMPLETION_GITHUB_CREDENTIAL_INVALID'],
    ['organization invisible', { login: 'octo-e2', userCheckStatus: 200, orgCheckStatus: 404 }, 'MISSING', true, 'COMPLETION_GITHUB_ACCOUNT_UNVERIFIED'],
    ['organization forbidden', { login: 'octo-e2', userCheckStatus: 200, orgCheckStatus: 403 }, 'MISSING', true, 'COMPLETION_GITHUB_ACCOUNT_UNVERIFIED'],
    ['GitHub unavailable', { userCheckStatus: 503 }, 'UNOBSERVED', false, 'COMPLETION_GITHUB_UNOBSERVED'],
    ['network failure', { userCheckStatus: null }, 'UNOBSERVED', false, 'COMPLETION_GITHUB_UNOBSERVED'],
    ['organization check failed', { login: 'octo-e2', userCheckStatus: 200, orgCheckStatus: 502 }, 'UNOBSERVED', false, 'COMPLETION_GITHUB_UNOBSERVED'],
    // A status observed before E2 carries no HTTP status: unknown is never asked.
    ['historical status', { userCheckStatus: undefined, orgCheckStatus: undefined }, 'UNOBSERVED', false, 'COMPLETION_GITHUB_UNOBSERVED'],
    ['connected', CONNECTED, 'RESOLVED', false, 'COMPLETION_GITHUB_CREDENTIAL_CONNECTED']
  ];
  for (const [label, overrides, state, ask, reasonCode] of cases) {
    const completion = deriveGithubCredentialCompletion(connection(overrides)) as any;
    assert.deepEqual({ state: completion.state, ask: completion.ask, reasonCode: completion.reasonCode }, { state, ask, reasonCode }, label);
    assert.ok(Object.isFrozen(completion), label);
  }
});

test('the GitHub token check records the HTTP statuses the completion relies on', async () => {
  const originalFetch = globalThis.fetch;
  const respond = (status: number, body: unknown) => new Response(JSON.stringify(body), {
    status, headers: { 'content-type': 'application/json' }
  });
  try {
    globalThis.fetch = (async () => respond(401, { message: 'Bad credentials' })) as typeof fetch;
    const refused = await validateGithubToken('test-token-e2', 'Patricked-code') as any;
    assert.equal(refused.userCheckStatus, 401);
    assert.equal(refused.orgCheckStatus, null);
    assert.equal(deriveGithubCredentialCompletion({ ...refused, tokenFileExists: true }).reasonCode, 'COMPLETION_GITHUB_CREDENTIAL_INVALID');

    globalThis.fetch = (async (input: string | URL | Request) => {
      const url = String(input instanceof Request ? input.url : input);
      return url.endsWith('/user')
        ? respond(200, { login: 'octo-e2', id: 7, type: 'User' })
        : respond(404, { message: 'Not Found' });
    }) as typeof fetch;
    const blind = await validateGithubToken('test-token-e2', 'Patricked-code') as any;
    assert.deepEqual([blind.userCheckStatus, blind.orgCheckStatus], [200, 404]);
    assert.equal(deriveGithubCredentialCompletion({ ...blind, tokenFileExists: true }).reasonCode, 'COMPLETION_GITHUB_ACCOUNT_UNVERIFIED');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('/github restores a valid credential and asks only for a missing one', () => {
  const restored = renderGithubConnectionPage(connection(CONNECTED));
  assert.match(restored, /Rien à fournir/);
  assert.doesNotMatch(restored, /id="github-credential-request"/);
  const details = restored.indexOf('<details');
  const form = restored.indexOf('action="/github/connect"');
  assert.ok(details >= 0 && details < form && form < restored.indexOf('</details>'), 'replacement stays optional');

  const absent = renderGithubConnectionPage(connection({ tokenFileExists: false }));
  assert.match(absent, /À fournir/);
  assert.match(absent, /id="github-credential-request"/);
  assert.doesNotMatch(absent, /<details/);

  const unknown = renderGithubConnectionPage(connection({ userCheckStatus: 503 }));
  assert.match(unknown, /rien n’est demandé/);
  assert.doesNotMatch(unknown, /id="github-credential-request"/);

  // Existing content and form fields are kept.
  for (const page of [restored, absent, unknown]) {
    for (const kept of ['État actuel', 'Vérifier et connecter', 'name="token"', 'name="org"', 'name="mode"']) {
      assert.ok(page.includes(kept), kept);
    }
  }
  const escaped = renderGithubConnectionPage(connection({ ...CONNECTED, org: '<b>x</b>' }));
  assert.ok(!escaped.includes('<b>x</b>'));
});

test('/git shows the mapping of the requested repository and asks only for what is missing', () => {
  const present = deriveRepositoryMappingCompletion('Patricked-code/MCP', REAL_EVIDENCE) as any;
  assert.deepEqual([present.state, present.ask, present.repositoryId, present.candidates.length], ['RESOLVED', false, 'github:Patricked-code/MCP', 1]);
  const absent = deriveRepositoryMappingCompletion('Patricked-code/does-not-exist', REAL_EVIDENCE) as any;
  assert.deepEqual([absent.state, absent.ask, absent.candidates.length], ['MISSING', true, 0]);
  const duplicated = {
    ...REAL_EVIDENCE,
    mappings: [
      ...REAL_EVIDENCE.mappings,
      { ...REAL_EVIDENCE.mappings.find((entry: any) => entry.repositoryId === 'github:Patricked-code/MCP'), mappingId: 'zz-duplicate-e2' }
    ]
  };
  const ambiguous = deriveRepositoryMappingCompletion('patricked-code/mcp', duplicated) as any;
  assert.deepEqual([ambiguous.state, ambiguous.ask, ambiguous.candidates.length], ['AMBIGUOUS', true, 2]);
  const unavailable = deriveRepositoryMappingCompletion('Patricked-code/MCP', { ...REAL_EVIDENCE, available: false }) as any;
  assert.deepEqual([unavailable.state, unavailable.ask], ['UNOBSERVED', false]);
  for (const repository of [null, '', '../etc', 'a b/c', 'owner/repo/extra']) {
    assert.equal((deriveRepositoryMappingCompletion(repository, REAL_EVIDENCE) as any).state, 'NOT_REQUESTED', String(repository));
  }

  const status = connection(CONNECTED);
  const restoredPage = renderGitSettingsPage(status, REAL_REGISTRY, { mapping: present });
  assert.match(restoredPage, /Rien à fournir/);
  assert.ok(restoredPage.includes(present.candidates[0].mappingId));
  const missingPage = renderGitSettingsPage(status, REAL_REGISTRY, { mapping: absent });
  assert.match(missingPage, /Mapping absent/);
  assert.ok(missingPage.includes('Patricked-code/does-not-exist'));
  // The credential form of /git follows the same rule as /github.
  const blindPage = renderGitSettingsPage(connection({ tokenFileExists: false }), REAL_REGISTRY);
  assert.match(blindPage, /id="github-credential-request"/);
  assert.match(restoredPage, /<details/);
  for (const page of [restoredPage, missingPage, blindPage]) {
    for (const kept of ['All repo/server mappings', 'action="/git/connect"', 'name="token"']) assert.ok(page.includes(kept), kept);
  }
});

test('/login returns only to a same-origin path of the MCP surfaces', async () => {
  for (const path of ['/github', '/git?repository=Patricked-code%2FMCP', '/dashboard', '/github/Patricked-code']) {
    assert.equal(safeWebReturnPath(path), path);
  }
  for (const value of ['//elsewhere.example', '/\\elsewhere.example', 'https://elsewhere.example', 'github', '/x\r\nheader', '/x\ty', undefined, 42, `/${'a'.repeat(600)}`]) {
    assert.equal(safeWebReturnPath(value), '/dashboard', JSON.stringify(value));
  }
  const server = await readFile('src/server.ts', 'utf8');
  assert.equal((server.match(/safeWebReturnPath\(/g) ?? []).length >= 2, true);
  assert.doesNotMatch(server, /req\.body\.next\.startsWith\('\/'\)/);
});

test('E2 is pure and the governed service projects the completion step with the public MCP origin', async () => {
  const source = await readFile(MODULE_PATH, 'utf8');
  assert.doesNotMatch(source, /writeFile(Sync)?\(|fetch\(|child_process|process\.env/);
  const wiring = await readFile('src/tools/governedContext.ts', 'utf8');
  assert.match(wiring, /publicBaseUrl:\s*oauthIssuer\(\)/);

  const repositoryResolution: any = {
    status: 'RESOLVED', observedAt: NOW, requestedRepositoryContext: REPOSITORY, selectionSource: 'connection_context',
    selectedAccountContext: { owner: 'Patricked-code', type: 'organization' },
    selectedRepository: {
      repositoryId: 'github:Patricked-code/MCP', githubRepositoryId: 1, owner: 'Patricked-code', ownerType: 'organization',
      name: 'MCP', fullName: REPOSITORY, defaultBranch: 'main', visibility: 'private', archived: false, fork: false
    },
    candidates: [], candidateCount: 1, freshness: 'CURRENT', provenance: ['github_repository_api'],
    reasonCodes: [], uncertainties: [], registryDigest: null
  };
  const projectResolution = resolveGithubProject({ repository: repositoryResolution, registry: REAL_EVIDENCE, observedAt: NOW });
  const serverResolution = resolveProjectServer({
    project: projectResolution, registry: REAL_EVIDENCE,
    serverMap: JSON.parse(await readFile('.mcp/server-map.json', 'utf8')), managedServerIds: ['s1', 's2'], observedAt: NOW
  });
  const identity = (overrides: Record<string, unknown> = {}) => ({
    status: 'RESOLVED', observedAt: NOW, bindingId: 'binding-e2', oauthPrincipalId: PRINCIPAL, repositoryContext: REPOSITORY,
    authenticatedPrincipal: { provider: 'github', login: 'octo-e2', accountType: 'user' },
    selectedAccountContext: { owner: 'Patricked-code', type: 'user', source: 'durable_account' },
    accessibleAccountContexts: [], freshness: 'CURRENT', provenance: ['identity_policy'], reasonCodes: [], policyDigest: null,
    ...overrides
  });
  const github = (identityOverrides: Record<string, unknown> = {}) => ({
    status: 'CURRENT', observedAt: NOW, mainHead: 'a'.repeat(40), workBranch: null, workBranchHead: null, pullRequest: null,
    checks: { status: 'unavailable', conclusion: null, total: 0, failed: 0, headSha: null, exactHead: null, required: [], requiredSatisfied: null },
    reviews: { approvals: 0, changesRequested: 0, unresolvedThreads: null },
    ruleset: { name: null, enforcement: null, requiresPullRequest: null, requiredStatusChecks: [], requiresConversationResolution: null },
    ownership: { pullRequestAuthor: null }, activity: { lastActivityAt: null },
    identity: identity(identityOverrides), repositoryResolution, projectResolution, serverResolution,
    cache: { status: 'REFRESHED', observedAt: NOW, provenance: 'github_api' },
    evidence: {
      main: { freshness: 'CURRENT', observedAt: NOW, provenance: 'github_api' },
      pullRequest: { freshness: 'NOT_APPLICABLE', observedAt: NOW, provenance: 'github_api' },
      checks: { freshness: 'NOT_APPLICABLE', observedAt: NOW, provenance: 'github_api' },
      reviews: { freshness: 'NOT_APPLICABLE', observedAt: NOW, provenance: 'github_api' },
      ruleset: { freshness: 'UNAVAILABLE', observedAt: NOW, provenance: 'github_api' }
    },
    reasonCodes: [], uncertainties: [], error: null
  });
  const session = {
    schemaVersion: 1, governedSessionId: SESSION_ID, repository: REPOSITORY, workBranch: null, status: 'ACTIVE',
    identityAssurance: 'oauth_subject',
    connectionContext: {
      schemaVersion: 1, connectionContextId: '33333333-3333-4333-8333-333333333333', governedSessionId: SESSION_ID,
      repository: REPOSITORY, principalId: PRINCIPAL, observedClientId: null, identityAssurance: 'oauth_subject',
      clientClassification: 'UNRESOLVED', evidenceSource: 'oauth_auth_info', createdAt: NOW
    },
    lastAcknowledgedStateVersion: null, bootstrapReceipt: null, blockers: [], lastCheckpoint: null
  };
  const service = (visible: unknown, observed: unknown) => createGovernedOperationalContextService({
    liveState: { getCurrent: async () => null, reconcileNow: async () => null },
    github: { getCurrent: async () => observed, reconcileExplicit: async () => observed },
    sessions: { getVisibleSession: async () => visible },
    locks: { listActiveLocks: async () => [] },
    gateMode: 'shadow',
    existingWriteToolsEnabled: false,
    now: () => new Date(NOW),
    readBranchGovernance: async () => null,
    publicBaseUrl: BASE
  } as never);
  const input = { governedSessionId: SESSION_ID, workBranch: null, request: {} } as never;

  const complete = (await service(session, github()).getCurrent(input)).contextCompletion as any;
  assert.deepEqual([complete.status, complete.step.action], ['COMPLETE', 'NONE']);
  const anonymous = (await service(null, github()).getCurrent(input)).contextCompletion as any;
  assert.deepEqual([anonymous.step.action, anonymous.step.tool], ['CALL_TOOL', 'mcp_open_governed_session']);
  const refused = (await service(session, github({ status: 'UNVERIFIED', freshness: 'UNKNOWN', authenticatedPrincipal: null, reasonCodes: ['GITHUB_IDENTITY_AUTH_INVALID'] })).getCurrent(input)).contextCompletion as any;
  assert.deepEqual([refused.step.action, refused.step.url], ['ASK_OPERATOR', `${BASE}/github`]);
  const serialized = JSON.stringify(refused);
  for (const forbidden of [PRINCIPAL, 'octo-e2', '33333333-3333-4333-8333-333333333333', 'binding-e2']) {
    assert.equal(serialized.includes(forbidden), false, forbidden);
  }
});
