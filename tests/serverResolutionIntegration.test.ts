import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

process.env.MCP_AUTH_TOKEN ??= 'mcp-unit-test-value-20261004-abcdef';
process.env.S1_HOST ??= '127.0.0.1';
process.env.S1_KEY_PATH ??= '/tmp/mcp-unit-test-s1-key';
process.env.S2_HOST ??= '127.0.0.1';
process.env.S2_KEY_PATH ??= '/tmp/mcp-unit-test-s2-key';

const { readGitRegistryProjectEvidence } = await import('../src/github/registry.js');
const { resolveServer } = await import('../src/governedWorkflow/resolvers/server.js');
const { resolveProjectServer } = await import('../src/github/serverResolution.js');
const { createGithubOperationalContextCollector } = await import('../src/governedContext/github.js');

const NOW = '2026-10-04T19:30:00.000Z';
const REGISTRY_DIGEST = 'd'.repeat(64);
const CANDIDATE_DIGEST = 'c'.repeat(64);
const MCP_PATH = '/opt/apps/wealthtech-mcp-ssh-bridge';
const SERVER_MAP = {
  schemaVersion: 1,
  servers: {
    S1: { role: 'mcp_host_and_destination', mainPath: MCP_PATH, targetProjectIds: [] },
    S2: { role: 'source_migration_server', protectedApplications: [] }
  }
};
const MANAGED = ['s1', 's2'];
const MODULE_PATH = join(process.cwd(), 'src', 'github', 'serverResolution.ts');

function project(overrides: Record<string, unknown> = {}): any {
  return {
    status: 'RESOLVED',
    observedAt: NOW,
    repositoryId: 'github:Patricked-code/MCP',
    selectedMapping: {
      mappingId: 'mcp-bridge',
      repositoryId: 'github:Patricked-code/MCP',
      projectId: 'wealthtech.mcp',
      projectUid: null,
      componentRole: null,
      activationReadiness: 'BLOCKED',
      activationReasonCodes: ['MAPPING_PATH_UNVERIFIED']
    },
    selectedProject: { projectId: 'wealthtech.mcp', projectUid: null, name: null, kind: null },
    candidates: [{ mappingId: 'mcp-bridge', projectId: 'wealthtech.mcp' }],
    candidateCount: 1,
    freshness: 'CURRENT',
    provenance: ['github_repository_resolution', 'git_registry_v2_candidate'],
    reasonCodes: [],
    registryDigest: REGISTRY_DIGEST,
    candidateDigest: CANDIDATE_DIGEST,
    ...overrides
  };
}

function binding(overrides: Record<string, unknown> = {}) {
  return {
    mappingId: 'mcp-bridge',
    repositoryId: 'github:Patricked-code/MCP',
    projectId: 'wealthtech.mcp',
    projectUid: null,
    componentRole: null,
    serverId: 's1',
    serverPath: MCP_PATH,
    realPath: null,
    realPathVerified: false,
    environment: 'production',
    ...overrides
  };
}

function registry(overrides: Record<string, unknown> = {}): any {
  return {
    available: true,
    sourceSchemaVersion: 1,
    digest: REGISTRY_DIGEST,
    candidateDigest: CANDIDATE_DIGEST,
    mappings: [{
      mappingId: 'mcp-bridge',
      repositoryId: 'github:Patricked-code/MCP',
      projectId: 'wealthtech.mcp',
      projectUid: null,
      componentRole: null
    }],
    projects: [],
    activationReadiness: [],
    serverBindings: [binding()],
    ...overrides
  };
}

function resolve(overrides: Record<string, unknown> = {}) {
  return resolveProjectServer({
    project: project(),
    registry: registry(),
    serverMap: SERVER_MAP,
    managedServerIds: MANAGED,
    observedAt: NOW,
    ...overrides
  } as never);
}

test('C3 GitRegistry project evidence carries bounded server bindings with declared versus verified paths', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'mcp-c3-registry-'));
  const file = join(directory, 'registry.json');
  const previous = process.env.MCP_GIT_REGISTRY_FILE;
  await writeFile(file, JSON.stringify({
    version: 1,
    updatedAt: NOW,
    accounts: [],
    repoMappings: [{
      id: 'mcp-bridge', githubOwner: 'Patricked-code', githubRepo: 'MCP', projectKey: 'mcp_bridge',
      serverId: 's1', serverPath: MCP_PATH, officialBranch: 'main', allowedAccess: 'read', deployEnabled: false
    }],
    auditEvents: []
  }), 'utf8');
  process.env.MCP_GIT_REGISTRY_FILE = file;
  try {
    const evidence = await readGitRegistryProjectEvidence();
    assert.equal(evidence.available, true);
    assert.deepEqual(evidence.serverBindings, [{
      mappingId: 'mcp-bridge',
      repositoryId: 'github:Patricked-code/MCP',
      projectId: 'mcp_bridge',
      projectUid: null,
      componentRole: null,
      serverId: 's1',
      serverPath: MCP_PATH,
      realPath: null,
      realPathVerified: false,
      environment: 'production'
    }]);
    process.env.MCP_GIT_REGISTRY_FILE = join(directory, 'missing.json');
    assert.deepEqual((await readGitRegistryProjectEvidence()).serverBindings, []);
  } finally {
    if (previous === undefined) delete process.env.MCP_GIT_REGISTRY_FILE;
    else process.env.MCP_GIT_REGISTRY_FILE = previous;
    await rm(directory, { recursive: true, force: true });
  }
});

test('C3 resolves the project server through GW-07 with the identity normalization of stored server ids', () => {
  const resolved = resolve();
  assert.equal(resolved.status, 'RESOLVED');
  assert.equal(resolved.selectedServer?.serverId, 's1');
  assert.deepEqual(resolved.selectedServer?.rawServerIds, ['s1']);
  assert.equal(resolved.selectedServer?.environment, 'production');
  assert.deepEqual(resolved.selectedServer?.bindings.map((entry: any) => [entry.mappingId, entry.serverPath, entry.realPath, entry.realPathVerified]), [
    ['mcp-bridge', MCP_PATH, null, false]
  ]);
  assert.deepEqual(resolved.canonicalServerIds, ['s1', 's2']);
  assert.equal(resolved.projectMappingId, 'mcp-bridge');
  for (const provenance of ['github_project_resolution', 'git_registry_server_binding', 'canonical_server_identity_set', 'git_registry_v2_candidate_from_v1']) {
    assert.ok(resolved.provenance.includes(provenance), provenance);
  }
  assert.equal(resolved.authorizationInferred, false);
  assert.equal(resolved.mutationPerformed, false);
  assert.equal(resolved.sshMutationPerformed, false);

  const caseVariant = resolve({ registry: registry({ serverBindings: [binding({ serverId: 'S1' })] }) });
  assert.equal(caseVariant.selectedServer?.serverId, 's1');
  assert.deepEqual(caseVariant.selectedServer?.rawServerIds, ['S1']);

  const verified = resolve({
    registry: registry({ sourceSchemaVersion: 2, serverBindings: [binding({ realPath: MCP_PATH, realPathVerified: true })] })
  });
  assert.equal(verified.selectedServer?.bindings[0]?.realPathVerified, true);
  assert.equal(verified.provenance.includes('git_registry_v2_candidate_from_v1'), false);
});

test('C3 detects registry/configuration disagreement and never guesses a server', () => {
  const onlyS1 = { schemaVersion: 1, servers: { S1: SERVER_MAP.servers.S1 } };
  const s2Project = resolve({ serverMap: onlyS1, registry: registry({ serverBindings: [binding({ serverId: 's2' })] }) });
  assert.equal(s2Project.status, 'UNVERIFIED');
  assert.deepEqual(s2Project.reasonCodes, ['SERVER_ID_UNVERIFIED']);
  assert.equal(s2Project.selectedServer, null);

  const unknownServer = resolve({ registry: registry({ serverBindings: [binding({ serverId: 's9' })] }) });
  assert.deepEqual(unknownServer.reasonCodes, ['SERVER_ID_UNVERIFIED']);

  for (const serverMap of [null, {}, { servers: {} }, { servers: [] }]) {
    const invalid = resolve({ serverMap });
    assert.equal(invalid.status, 'UNVERIFIED');
    assert.deepEqual(invalid.reasonCodes, ['SERVER_CANONICAL_ID_SET_INVALID']);
  }
  const unmanaged = resolve({ managedServerIds: [] });
  assert.deepEqual(unmanaged.reasonCodes, ['SERVER_CANONICAL_ID_SET_INVALID']);

  const twoServers = resolve({
    registry: registry({
      serverBindings: [binding(), binding({ mappingId: 'mcp-mirror', repositoryId: 'github:Patricked-code/MCP-mirror', serverId: 's2', serverPath: '/srv/mirror' })]
    })
  });
  assert.equal(twoServers.status, 'AMBIGUOUS');
  assert.deepEqual(twoServers.reasonCodes, ['SERVER_BINDING_AMBIGUOUS']);
  assert.deepEqual(twoServers.candidates.map((candidate: any) => candidate.serverId), ['s1', 's2']);
});

test('C3 fails closed on missing, invalid or stale upstream evidence without throwing', () => {
  const historical = resolve({ registry: registry({ serverBindings: undefined }) });
  assert.deepEqual(historical.reasonCodes, ['SERVER_REGISTRY_UNAVAILABLE']);
  const relativePath = resolve({ registry: registry({ serverBindings: [binding({ serverPath: 'relative/path' })] }) });
  assert.equal(relativePath.status, 'UNVERIFIED');
  assert.deepEqual(relativePath.reasonCodes, ['SERVER_REGISTRY_UNAVAILABLE']);
  const unavailable = resolve({ registry: registry({ available: false, digest: null, candidateDigest: null, serverBindings: [] }) });
  assert.deepEqual(unavailable.reasonCodes, ['SERVER_REGISTRY_UNAVAILABLE']);

  assert.deepEqual(resolve({ project: project({ status: 'NONE', selectedMapping: null, selectedProject: null }) }).reasonCodes, ['SERVER_PROJECT_NONE']);
  assert.deepEqual(resolve({ project: project({ status: 'AMBIGUOUS', selectedMapping: null, selectedProject: null }) }).reasonCodes, ['SERVER_PROJECT_AMBIGUOUS']);
  assert.deepEqual(resolve({ project: project({ freshness: 'STALE' }) }).reasonCodes, ['SERVER_PROJECT_UNVERIFIED']);
  const oversized = resolve({ project: project({ selectedMapping: { ...project().selectedMapping, mappingId: 'x'.repeat(400) } }) });
  assert.equal(oversized.status, 'UNVERIFIED');
  assert.equal(oversized.selectedServer, null);

  const empty = resolveServer({
    project: project(),
    registry: { available: true, freshness: 'CURRENT', digest: REGISTRY_DIGEST, candidateDigest: CANDIDATE_DIGEST, mappings: [binding()] },
    canonicalServerIds: [],
    serverHint: null,
    observedAt: NOW
  } as never);
  assert.equal(empty.status, 'UNVERIFIED');
  assert.deepEqual(empty.reasonCodes, ['SERVER_CANONICAL_ID_SET_INVALID']);
});

test('C3 composition is read-only: no SSH, no store, no connection material in its output', async () => {
  const source = await readFile(MODULE_PATH, 'utf8');
  for (const forbidden of [/from '\.\.\/ssh\//, /from 'node:fs/, /config\/servers/, /writeFile/, /child_process/]) {
    assert.doesNotMatch(source, forbidden);
  }
  const serialized = JSON.stringify(resolve());
  for (const forbidden of ['127.0.0.1', 'privateKey', 'username', 'mcp-unit-test-s1-key']) {
    assert.equal(serialized.includes(forbidden), false, forbidden);
  }
});

const IDENTITY_POLICY = {
  schemaVersion: 2 as const,
  updatedAt: '2026-08-09T09:15:01Z',
  goal: 'link every MCP or Git intervention to governed evidence',
  currentSignals: ['mcp tool called'],
  limits: ['human identity may require confirmation'],
  s1GithubDeploymentIdentity: {
    id: 'S1_MCP_GITHUB_DEPLOY_READ_ONLY',
    type: 'github_deploy_key_ssh',
    repository: 'Patricked-code/MCP',
    fetchAlias: 'github.com-mcp-patricked-ro',
    contentsRead: true,
    contentsWrite: false,
    pushUrl: 'disabled://mcp-s1-read-only',
    privateKeyReadableByMcp: false
  },
  requiredSuiviFields: ['date'],
  githubPrincipalBindings: [{
    bindingId: 'oauth-wealthtech-mcp-admin__patricked-code__patricked-code-mcp',
    oauthPrincipalId: 'oauth:wealthtech-mcp-admin',
    provider: 'github' as const,
    connectionSelector: { owner: 'Patricked-code', type: 'user' as const },
    expectedAuthenticatedLogin: 'Patricked-code',
    context: { repository: 'Patricked-code/MCP' },
    effect: 'IDENTITY_ONLY' as const,
    enabled: true
  }]
};
const IDENTITY_SCOPE = { oauthPrincipalId: 'oauth:wealthtech-mcp-admin', repositoryContext: 'Patricked-code/MCP' };

function json(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), { status, headers: { 'content-type': 'application/json' } });
}

function collector(clock: { now: Date }) {
  return createGithubOperationalContextCollector({
    fetchImpl: async (input: unknown) => {
      const url = String(input);
      if (url.endsWith('/commits/main')) return json({ sha: 'a'.repeat(40) });
      if (url.includes('/rulesets?')) return json([]);
      return json({ message: 'unexpected endpoint' }, 500);
    },
    readToken: async () => 'work-state-token',
    apiBase: 'https://api.github.test',
    allowedHosts: 'api.github.test',
    now: () => clock.now,
    cacheTtlMs: 1_000,
    loadIdentityPolicy: async () => ({ parse: { ok: true as const, policy: IDENTITY_POLICY }, digest: 'policy-digest' }),
    collectObservationBatch: async () => ({
      identityObservations: [{
        owner: 'Patricked-code',
        type: 'user' as const,
        configuredStatus: 'active',
        authenticationContextId: 'authentication-context-primary',
        accountVerified: true,
        principal: {
          status: 'VERIFIED' as const, observedAt: clock.now.toISOString(), freshness: 'CURRENT' as const,
          login: 'Patricked-code', githubUserId: 270385782, accountType: 'user' as const, reasonCode: null
        }
      }],
      observeRepository: async () => ({
        status: 'VERIFIED' as const,
        observedAt: clock.now.toISOString(),
        freshness: 'CURRENT' as const,
        requestedFullName: 'Patricked-code/MCP',
        repository: {
          githubRepositoryId: 1285534440, owner: 'Patricked-code', ownerType: 'user' as const, name: 'MCP',
          fullName: 'Patricked-code/MCP', defaultBranch: 'main', visibility: 'public' as const, archived: false, fork: false
        },
        reasonCode: null
      })
    }),
    readRepositoryRegistry: async () => ({
      available: true, schemaVersion: 1 as const, mappings: [{ githubOwner: 'Patricked-code', githubRepo: 'MCP' }], digest: REGISTRY_DIGEST
    }),
    readProjectRegistry: async () => registry(),
    readServerMap: async () => SERVER_MAP,
    managedServerIds: MANAGED
  } as never);
}

test('C3 chains GW-07 after the C2 project resolution in the governed GitHub context, with miss, hit and stale semantics', async () => {
  const clock = { now: new Date(NOW) };
  const github = collector(clock);

  const miss = await github.getCurrent(null, IDENTITY_SCOPE);
  assert.equal(miss.serverResolution?.status, 'UNVERIFIED');
  assert.deepEqual(miss.serverResolution?.reasonCodes, ['SERVER_PROJECT_UNVERIFIED']);
  assert.deepEqual(miss.serverResolution?.provenance, ['memory_cache']);

  const fresh = await github.reconcileExplicit(null, IDENTITY_SCOPE);
  assert.equal(fresh.projectResolution?.status, 'RESOLVED');
  assert.equal(fresh.serverResolution?.status, 'RESOLVED');
  assert.equal(fresh.serverResolution?.selectedServer?.serverId, 's1');
  assert.equal(fresh.serverResolution?.selectedServer?.bindings[0]?.serverPath, MCP_PATH);

  const hit = await github.getCurrent(null, IDENTITY_SCOPE);
  assert.equal(hit.cache.status, 'HIT');
  assert.equal(hit.serverResolution?.status, 'RESOLVED');
  assert.ok(hit.serverResolution?.provenance.includes('memory_cache'));

  clock.now = new Date('2026-10-04T19:30:02.000Z');
  const stale = await github.getCurrent(null, IDENTITY_SCOPE);
  assert.equal(stale.serverResolution?.status, 'UNVERIFIED');
  assert.equal(stale.serverResolution?.freshness, 'STALE');
  assert.equal(stale.serverResolution?.selectedServer, null);
  assert.deepEqual(stale.serverResolution?.candidates, []);
  assert.deepEqual(stale.serverResolution?.reasonCodes, ['SERVER_EVIDENCE_STALE']);
  assert.equal(stale.serverResolution?.observedAt, fresh.serverResolution?.observedAt);
});
