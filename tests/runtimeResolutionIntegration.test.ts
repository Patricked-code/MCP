import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';

process.env.MCP_AUTH_TOKEN ??= 'mcp-unit-test-value-20261004-abcdef';
process.env.S1_HOST ??= '127.0.0.1';
process.env.S1_KEY_PATH ??= '/tmp/mcp-unit-test-s1-key';
process.env.S2_HOST ??= '127.0.0.1';
process.env.S2_KEY_PATH ??= '/tmp/mcp-unit-test-s2-key';

const { parseRuntimeObservation } = await import('../src/liveState/collect.js');
const {
  LIVE_STATE_SERVER_ID,
  liveStateRuntimeObservation
} = await import('../src/liveState/runtimeObservation.js');
const {
  projectRuntimeComponents,
  resolveProjectRuntime,
  unverifiedRuntimeResolution
} = await import('../src/github/runtimeResolution.js');
const { resolveProjectServer } = await import('../src/github/serverResolution.js');
const { createGithubOperationalContextCollector } = await import('../src/governedContext/github.js');

const NOW = '2026-10-04T23:10:00.000Z';
const SHA = 'b'.repeat(40);
const REGISTRY_DIGEST = 'd'.repeat(64);
const CANDIDATE_DIGEST = 'c'.repeat(64);
const MCP_PATH = '/opt/apps/wealthtech-mcp-ssh-bridge';
const MCP_REPOSITORY = 'github:Patricked-code/MCP';
const CONTAINER = 'wealthtech_mcp_ssh_bridge';
const SERVER_MAP = {
  schemaVersion: 1,
  servers: {
    S1: { role: 'mcp_host_and_destination', mainPath: MCP_PATH, targetProjectIds: [] },
    S2: { role: 'source_migration_server', protectedApplications: [] }
  }
};
const MANAGED = ['s1', 's2'];
const MODULE_PATH = join(process.cwd(), 'src', 'github', 'runtimeResolution.ts');
const ADAPTER_PATH = join(process.cwd(), 'src', 'liveState', 'runtimeObservation.ts');

function project(overrides: Record<string, unknown> = {}): any {
  return {
    status: 'RESOLVED',
    observedAt: NOW,
    repositoryId: MCP_REPOSITORY,
    selectedMapping: {
      mappingId: 'mcp-bridge',
      repositoryId: MCP_REPOSITORY,
      projectId: 'wealthtech.mcp',
      projectUid: null,
      componentRole: null,
      activationReadiness: 'BLOCKED',
      activationReasonCodes: ['MAPPING_PATH_UNVERIFIED']
    },
    selectedProject: { projectId: 'wealthtech.mcp', projectUid: 'uid-mcp', name: 'MCP', kind: 'platform' },
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

function registryProject(overrides: Record<string, unknown> = {}) {
  return {
    projectId: 'wealthtech.mcp',
    projectUid: 'uid-mcp',
    name: 'MCP',
    kind: 'platform',
    globalCheckpointRepositoryId: MCP_REPOSITORY,
    centralGovernanceRepositoryId: MCP_REPOSITORY,
    repositoryComponents: [{ repositoryId: MCP_REPOSITORY, mappingId: 'mcp-bridge', role: 'MCP_SERVER' }],
    ...overrides
  };
}

function binding(overrides: Record<string, unknown> = {}) {
  return {
    mappingId: 'mcp-bridge',
    repositoryId: MCP_REPOSITORY,
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
    sourceSchemaVersion: 2,
    digest: REGISTRY_DIGEST,
    candidateDigest: CANDIDATE_DIGEST,
    mappings: [{
      mappingId: 'mcp-bridge',
      repositoryId: MCP_REPOSITORY,
      projectId: 'wealthtech.mcp',
      projectUid: null,
      componentRole: null
    }],
    projects: [registryProject()],
    activationReadiness: [],
    serverBindings: [binding()],
    ...overrides
  };
}

function server(overrides: Record<string, unknown> = {}) {
  return resolveProjectServer({
    project: project(),
    registry: registry(),
    serverMap: SERVER_MAP,
    managedServerIds: MANAGED,
    observedAt: NOW,
    ...overrides
  } as never);
}

function observation(overrides: Record<string, unknown> = {}): any {
  return {
    status: 'CURRENT',
    observedAt: NOW,
    freshness: 'CURRENT',
    serverId: 's1',
    repositoryId: MCP_REPOSITORY,
    runtimeKind: 'DOCKER_COMPOSE',
    runtimeId: CONTAINER,
    revision: SHA,
    evidenceRef: 'live_state:state_version:42',
    provenance: 'live_state_runtime_observation',
    ...overrides
  };
}

function resolve(overrides: Record<string, unknown> = {}) {
  return resolveProjectRuntime({
    server: server(),
    project: project(),
    registry: registry(),
    observations: [observation()],
    observedAt: NOW,
    ...overrides
  } as never);
}

function snapshot(overrides: Record<string, unknown> = {}, runtime: Record<string, unknown> = {}): any {
  return {
    schemaVersion: 1,
    stateVersion: 42,
    generatedAt: '2026-10-04T23:09:30.000Z',
    lastReconciledAt: '2026-10-04T23:09:30.000Z',
    maxAgeSeconds: 60,
    freshness: 'CURRENT',
    ageSeconds: 0,
    repository: 'Patricked-code/MCP',
    runtime: {
      status: 'CURRENT',
      container: CONTAINER,
      containerStatus: 'running',
      health: 'healthy',
      imageId: 'sha256:image',
      revision: SHA,
      composeProject: 'wealthtech-mcp',
      ...runtime
    },
    ...overrides
  };
}

test('C4 Live State keeps the bounded compose project label of the observed runtime', () => {
  const runtime = parseRuntimeObservation([
    `container_name=/${CONTAINER}`,
    'container_status=running',
    'container_health=healthy',
    'container_image_id=sha256:image',
    'container_label.com.docker.compose.project=wealthtech-mcp',
    `container_label.org.opencontainers.image.revision=${SHA}`
  ].join('\n'));
  assert.equal(runtime.composeProject, 'wealthtech-mcp');

  for (const value of ['<no value>', '', 'bad project;rm', 'x'.repeat(200)]) {
    const parsed = parseRuntimeObservation(`container_name=/${CONTAINER}\ncontainer_label.com.docker.compose.project=${value}`);
    assert.equal(parsed.composeProject, null, JSON.stringify(value));
  }
});

test('C4 Live State projects its runtime as a bounded server observation, never as fresh when stale', () => {
  const now = new Date(NOW);
  const current = liveStateRuntimeObservation(snapshot(), now);
  assert.deepEqual(current, {
    status: 'CURRENT',
    observedAt: '2026-10-04T23:09:30.000Z',
    freshness: 'CURRENT',
    serverId: LIVE_STATE_SERVER_ID,
    repositoryId: MCP_REPOSITORY,
    runtimeKind: 'DOCKER_COMPOSE',
    runtimeId: CONTAINER,
    revision: SHA,
    evidenceRef: 'live_state:state_version:42',
    provenance: 'live_state_runtime_observation'
  });
  assert.equal(LIVE_STATE_SERVER_ID, 's1');

  assert.equal(liveStateRuntimeObservation(snapshot({}, { composeProject: null }), now)?.runtimeKind, 'DOCKER');
  assert.equal(liveStateRuntimeObservation(snapshot({}, { composeProject: undefined }), now)?.runtimeKind, 'DOCKER');

  const stale = liveStateRuntimeObservation(snapshot({ lastReconciledAt: '2026-10-04T23:08:00.000Z' }), now);
  assert.equal(stale?.status, 'STALE');
  assert.equal(stale?.freshness, 'STALE');

  const unavailable = liveStateRuntimeObservation(snapshot({}, { status: 'UNAVAILABLE', revision: null }), now);
  assert.equal(unavailable?.status, 'UNAVAILABLE');
  assert.equal(unavailable?.freshness, 'UNKNOWN');

  assert.equal(liveStateRuntimeObservation(null, now), null);
  assert.equal(liveStateRuntimeObservation(snapshot({ repository: '' }), now), null);
  assert.equal(liveStateRuntimeObservation(snapshot({}, { container: 'x'.repeat(400) }), now), null);
  assert.equal(liveStateRuntimeObservation(snapshot({}, { revision: 'not-a-sha' }), now)?.revision, null);
});

test('C4 derives runtime components only from GitRegistry evidence, never from guesses', () => {
  assert.deepEqual(projectRuntimeComponents(project(), registry()), [
    { componentId: 'mcp-bridge', repositoryId: MCP_REPOSITORY, componentRole: 'MCP_SERVER' }
  ]);
  // Without a registry project, only a mapping that declares its role is a component.
  assert.deepEqual(
    projectRuntimeComponents(
      project({ selectedMapping: { ...project().selectedMapping, componentRole: 'API' } }),
      registry({ projects: [] })
    ),
    [{ componentId: 'mcp-bridge', repositoryId: MCP_REPOSITORY, componentRole: 'API' }]
  );
  assert.equal(projectRuntimeComponents(project(), registry({ projects: [] })), null);
  assert.equal(
    projectRuntimeComponents(project(), registry({ projects: [registryProject(), registryProject()] })),
    null
  );
});

test('C4 resolves the project runtime through GW-08 after C3 with bounded Live State evidence', () => {
  const resolved = resolve();
  assert.equal(resolved.status, 'RESOLVED');
  assert.equal(resolved.serverId, 's1');
  assert.equal(resolved.cardinality, 'SINGLE_RUNTIME');
  assert.equal(resolved.freshness, 'CURRENT');
  assert.deepEqual(resolved.bindings, [{
    serverId: 's1',
    componentId: 'mcp-bridge',
    repositoryId: MCP_REPOSITORY,
    componentRole: 'MCP_SERVER',
    runtimeKind: 'DOCKER_COMPOSE',
    runtimeId: CONTAINER,
    revision: SHA,
    observedAt: NOW,
    freshness: 'CURRENT',
    evidenceRef: 'live_state:state_version:42'
  }]);
  for (const provenance of ['server_resolution', 'runtime_observation', 'git_registry_project_components', 'live_state_runtime_observation']) {
    assert.ok(resolved.provenance.includes(provenance), provenance);
  }
  // GitRegistry V2 carries no runtime declaration: nothing is cross-checked or invented.
  assert.equal(resolved.provenance.includes('runtime_declaration_cross_check'), false);
  assert.equal(resolved.authorizationInferred, false);
  assert.equal(resolved.mutationPerformed, false);
  assert.equal(resolved.runtimeMutationPerformed, false);

  // A runtime observed for another repository is not this project's runtime.
  const unrelated = resolve({ observations: [observation({ repositoryId: 'github:Other/Repo' })] });
  assert.equal(unrelated.status, 'UNVERIFIED');
  assert.deepEqual(unrelated.reasonCodes, ['RUNTIME_OBSERVATION_MISSING']);
  assert.notEqual(unrelated.cardinality, 'NO_RUNTIME');

  const v1 = resolve({ registry: registry({ sourceSchemaVersion: 1 }) });
  assert.ok(v1.provenance.includes('git_registry_v2_candidate_from_v1'));
});

test('C4 fails closed on unverified server, unprovable components, stale, unavailable or contradictory evidence', () => {
  const noServer = resolve({ server: server({ project: project({ status: 'NONE', selectedMapping: null, selectedProject: null }) }) });
  assert.equal(noServer.status, 'UNVERIFIED');
  assert.deepEqual(noServer.reasonCodes, ['RUNTIME_SERVER_UNVERIFIED']);
  assert.deepEqual(noServer.bindings, []);

  const noComponent = resolve({ registry: registry({ projects: [] }) });
  assert.equal(noComponent.status, 'UNVERIFIED');
  assert.deepEqual(noComponent.reasonCodes, ['RUNTIME_COMPONENT_UNVERIFIED']);
  assert.equal(noComponent.serverId, 's1');

  const sharedRepository = resolve({
    registry: registry({
      projects: [registryProject({
        repositoryComponents: [
          { repositoryId: MCP_REPOSITORY, mappingId: 'mcp-bridge', role: 'MCP_SERVER' },
          { repositoryId: MCP_REPOSITORY, mappingId: 'mcp-docs', role: 'DOCS' }
        ]
      })]
    })
  });
  assert.equal(sharedRepository.status, 'UNVERIFIED');
  assert.deepEqual(sharedRepository.reasonCodes, ['RUNTIME_COMPONENT_UNVERIFIED']);

  const missing = resolve({ observations: [] });
  assert.deepEqual(missing.reasonCodes, ['RUNTIME_OBSERVATION_MISSING']);
  assert.notEqual(missing.cardinality, 'NO_RUNTIME');

  const authorityDown = resolve({ observations: null });
  assert.deepEqual(authorityDown.reasonCodes, ['RUNTIME_OBSERVATION_UNAVAILABLE']);

  const stale = resolve({ observations: [observation({ status: 'STALE', freshness: 'STALE' })] });
  assert.equal(stale.status, 'UNVERIFIED');
  assert.equal(stale.freshness, 'STALE');
  assert.deepEqual(stale.reasonCodes, ['RUNTIME_EVIDENCE_STALE']);

  const unavailable = resolve({ observations: [observation({ status: 'UNAVAILABLE', freshness: 'UNKNOWN' })] });
  assert.deepEqual(unavailable.reasonCodes, ['RUNTIME_OBSERVATION_UNAVAILABLE']);

  // The registry places the project on s2 while its runtime is observed on s1.
  const mismatch = resolve({
    server: server({ registry: registry({ serverBindings: [binding({ serverId: 's2', serverPath: '/srv/mcp' })] }) })
  });
  assert.equal(mismatch.status, 'UNVERIFIED');
  assert.deepEqual(mismatch.reasonCodes, ['RUNTIME_SERVER_MISMATCH']);

  for (const invalid of [
    observation({ runtimeId: 'x'.repeat(400) }),
    observation({ revision: 'not-a-sha' }),
    observation({ runtimeKind: 'KUBERNETES' }),
    observation({ observedAt: 'yesterday' })
  ]) {
    const result = resolve({ observations: [invalid] });
    assert.equal(result.status, 'UNVERIFIED', JSON.stringify(invalid));
    assert.deepEqual(result.reasonCodes, ['RUNTIME_OBSERVATION_UNAVAILABLE']);
    assert.deepEqual(result.bindings, []);
  }

  const cacheMiss = unverifiedRuntimeResolution({
    observedAt: NOW,
    reasonCode: 'RUNTIME_SERVER_UNVERIFIED',
    provenance: ['memory_cache']
  });
  assert.equal(cacheMiss.status, 'UNVERIFIED');
  assert.equal(cacheMiss.cardinality, 'UNKNOWN');
  assert.deepEqual(cacheMiss.provenance, ['memory_cache']);
});

test('C4 composition is read-only: no SSH, no store, no restart and no connection material', async () => {
  for (const path of [MODULE_PATH, ADAPTER_PATH]) {
    const source = await readFile(path, 'utf8');
    for (const forbidden of [/from '\.\.\/ssh\//, /from 'node:fs/, /config\/servers/, /writeFile/, /child_process/, /docker (inspect|ps|compose|exec|restart|run)/]) {
      assert.doesNotMatch(source, forbidden, `${path}: ${forbidden}`);
    }
  }
  const serialized = JSON.stringify(resolve());
  for (const forbidden of ['127.0.0.1', 'privateKey', 'username', 'mcp-unit-test-s1-key', 'healthy', 'sha256:image']) {
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

function collector(clock: { now: Date }, readRuntimeObservations: () => Promise<unknown>) {
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
    managedServerIds: MANAGED,
    readRuntimeObservations
  } as never);
}

test('C4 chains GW-08 after C3 in the governed GitHub context, with miss, hit, stale and unavailable semantics', async () => {
  const clock = { now: new Date(NOW) };
  const github = collector(clock, async () => [observation({ observedAt: clock.now.toISOString() })]);

  const miss = await github.getCurrent(null, IDENTITY_SCOPE);
  assert.equal(miss.runtimeResolution?.status, 'UNVERIFIED');
  assert.deepEqual(miss.runtimeResolution?.reasonCodes, ['RUNTIME_SERVER_UNVERIFIED']);
  assert.deepEqual(miss.runtimeResolution?.provenance, ['memory_cache']);

  const fresh = await github.reconcileExplicit(null, IDENTITY_SCOPE);
  assert.equal(fresh.serverResolution?.status, 'RESOLVED');
  assert.equal(fresh.runtimeResolution?.status, 'RESOLVED');
  assert.equal(fresh.runtimeResolution?.cardinality, 'SINGLE_RUNTIME');
  assert.equal(fresh.runtimeResolution?.bindings[0]?.runtimeKind, 'DOCKER_COMPOSE');
  assert.equal(fresh.runtimeResolution?.bindings[0]?.runtimeId, CONTAINER);

  const hit = await github.getCurrent(null, IDENTITY_SCOPE);
  assert.equal(hit.cache.status, 'HIT');
  assert.equal(hit.runtimeResolution?.status, 'RESOLVED');
  assert.ok(hit.runtimeResolution?.provenance.includes('memory_cache'));

  clock.now = new Date('2026-10-04T23:10:02.000Z');
  const stale = await github.getCurrent(null, IDENTITY_SCOPE);
  assert.equal(stale.runtimeResolution?.status, 'UNVERIFIED');
  assert.equal(stale.runtimeResolution?.freshness, 'STALE');
  assert.deepEqual(stale.runtimeResolution?.bindings, []);
  assert.equal(stale.runtimeResolution?.cardinality, 'UNKNOWN');
  assert.deepEqual(stale.runtimeResolution?.reasonCodes, ['RUNTIME_EVIDENCE_STALE']);

  const failing = collector({ now: new Date(NOW) }, async () => { throw new Error('live state unreadable'); });
  const down = await failing.reconcileExplicit(null, IDENTITY_SCOPE);
  assert.equal(down.serverResolution?.status, 'RESOLVED');
  assert.equal(down.runtimeResolution?.status, 'UNVERIFIED');
  assert.deepEqual(down.runtimeResolution?.reasonCodes, ['RUNTIME_OBSERVATION_UNAVAILABLE']);
});
