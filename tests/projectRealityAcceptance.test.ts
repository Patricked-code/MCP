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
const { createGithubOperationalContextCollector } = await import('../src/governedContext/github.js');
const { createGovernedOperationalContextService } = await import('../src/governedContext/service.js');
const { deriveTargetContext } = await import('../src/operationalMemory/targetScope.js');
const { PROJECT_REALITY_LAYERS, deriveProjectReality } = await import('../src/github/projectReality.js');

const NOW = '2026-10-05T04:00:00.000Z';
const SHA = 'a'.repeat(40);
const FRONT_SHA = 'b'.repeat(40);
const REGISTRY_DIGEST = 'd'.repeat(64);
const CANDIDATE_DIGEST = 'c'.repeat(64);
const MCP_REPOSITORY = 'github:Patricked-code/MCP';
const API_REPOSITORY = 'github:Wealthtechinnovations/api_opcv';
const FRONT_REPOSITORY = 'github:Wealthtechinnovations/front_end_opcvm';
const AFRICAFUNDS = 'chainsolutions.africafunds';
const API_MAPPING = 'github:Wealthtechinnovations/api_opcv:s2:africafunds_api';
const FRONT_MAPPING = 'github:Wealthtechinnovations/front_end_opcvm:s2:africafunds_frontend';
const MANAGED = ['s1', 's2'];
const LAYERS = ['REPOSITORY', 'PROJECT', 'SERVER', 'RUNTIME', 'INGRESS', 'DOMAIN'];
const MODULE_PATH = join(process.cwd(), 'src', 'github', 'projectReality.ts');

// The versioned authorities themselves: GitRegistry (V1 migrated in memory) and the server map.
const previousRegistryFile = process.env.MCP_GIT_REGISTRY_FILE;
process.env.MCP_GIT_REGISTRY_FILE = 'data/mcp-git-registry.json';
const REAL_REGISTRY: any = await readGitRegistryProjectEvidence();
if (previousRegistryFile === undefined) delete process.env.MCP_GIT_REGISTRY_FILE;
else process.env.MCP_GIT_REGISTRY_FILE = previousRegistryFile;
const REAL_SERVER_MAP = JSON.parse(await readFile('.mcp/server-map.json', 'utf8'));

function states(reality: any): Record<string, string> {
  return Object.fromEntries(reality.layers.map((layer: any) => [layer.layer, layer.state]));
}

function layer(reality: any, id: string): any {
  return reality.layers.find((entry: any) => entry.layer === id);
}

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

function s2Runtime(repositoryId: string, overrides: Record<string, unknown> = {}): any {
  const front = repositoryId === FRONT_REPOSITORY;
  return {
    status: 'CURRENT',
    observedAt: NOW,
    freshness: 'CURRENT',
    serverId: 's2',
    repositoryId,
    runtimeKind: front ? 'CHECKOUT_ONLY' : 'PASSENGER',
    runtimeId: front ? null : 'africafunds-api',
    revision: front ? FRONT_SHA : SHA,
    evidenceRef: `fixture:runtime:${front ? 'front' : 'api'}`,
    provenance: 'fixture_runtime_observation',
    ...overrides
  };
}

function s2Domains(overrides: Record<string, unknown> = {}): any {
  return {
    available: true,
    freshness: 'CURRENT',
    observedAt: NOW,
    serverId: 's2',
    domains: [{ domain: 'africafunds.chainsolutions.fr', verified: true, evidenceRef: 'fixture:vhost:africafunds' }],
    ...overrides
  };
}

function mcpRuntime(overrides: Record<string, unknown> = {}): any {
  return {
    status: 'CURRENT',
    observedAt: NOW,
    freshness: 'CURRENT',
    serverId: 's1',
    repositoryId: MCP_REPOSITORY,
    runtimeKind: 'DOCKER_COMPOSE',
    runtimeId: 'wealthtech_mcp_ssh_bridge',
    revision: SHA,
    evidenceRef: 'live_state:state_version:42',
    provenance: 'live_state_runtime_observation',
    ...overrides
  };
}

/** repository -> project (GW-06) -> server (GW-07) -> runtime (GW-08) -> domain (GW-09). */
function chain(
  registry: any,
  repositoryId: string,
  options: { repository?: any; observations?: unknown[] | null; domainObservation?: unknown; serverMap?: unknown } = {}
) {
  const repository = options.repository ?? repositoryResolution(repositoryId);
  const project = resolveGithubProject({ repository, registry, observedAt: NOW });
  const server = resolveProjectServer({
    project, registry, serverMap: options.serverMap ?? REAL_SERVER_MAP, managedServerIds: MANAGED, observedAt: NOW
  });
  const runtime = resolveProjectRuntime({
    server, project, registry, observations: options.observations === undefined ? null : options.observations, observedAt: NOW
  });
  const domain = resolveProjectDomain({
    project, server, registry, observation: options.domainObservation === undefined ? null : options.domainObservation, observedAt: NOW
  });
  return { repository, project, server, runtime, domain, observedAt: NOW };
}

function africafunds(repositoryId = API_REPOSITORY, options: Parameters<typeof chain>[2] = {}) {
  return chain(REAL_REGISTRY, repositoryId, {
    observations: [s2Runtime(API_REPOSITORY), s2Runtime(FRONT_REPOSITORY)],
    domainObservation: s2Domains(),
    ...options
  });
}

test('C345-02 composes the multi-repository AfricaFunds project from the versioned registry into one project reality', () => {
  assert.deepEqual([...PROJECT_REALITY_LAYERS], LAYERS);
  const api = africafunds();
  assert.equal(api.runtime.cardinality, 'MULTI_RUNTIME');
  assert.deepEqual(api.runtime.bindings.map((binding: any) => binding.componentId), [API_MAPPING, FRONT_MAPPING]);
  assert.deepEqual(api.domain.surface.map((entry: any) => [entry.role, entry.domain]), [
    ['API', 'africafunds.chainsolutions.fr'],
    ['FRONTEND', 'africafunds.chainsolutions.fr']
  ]);

  const reality = deriveProjectReality(api);
  assert.deepEqual(reality.layers.map((entry: any) => entry.layer), LAYERS);
  assert.deepEqual(reality.layers.map((entry: any) => entry.contract), ['GW-05', 'GW-06', 'GW-07', 'GW-08', null, 'GW-09']);
  assert.deepEqual(states(reality), {
    REPOSITORY: 'VERIFIED', PROJECT: 'VERIFIED', SERVER: 'VERIFIED', RUNTIME: 'VERIFIED', INGRESS: 'UNVERIFIED', DOMAIN: 'VERIFIED'
  });
  // No ingress observation authority exists: the reality is never VERIFIED from declarations.
  assert.equal(reality.status, 'UNVERIFIED');
  assert.equal(reality.firstBlockingLayer, 'INGRESS');
  assert.deepEqual(layer(reality, 'INGRESS').reasonCodes, ['INGRESS_OBSERVATION_UNAVAILABLE']);
  assert.equal(layer(reality, 'INGRESS').resolutionStatus, null);
  assert.deepEqual(reality.contradictions, []);
  assert.equal(reality.repositoryId, API_REPOSITORY);
  assert.equal(reality.projectId, AFRICAFUNDS);
  assert.equal(reality.serverId, 's2');
  assert.equal(reality.observedAt, NOW);
  assert.equal(reality.authorizationInferred, false);
  assert.equal(reality.mutationPerformed, false);
  assert.ok(layer(reality, 'SERVER').provenance.includes('git_registry_v2_candidate_from_v1'));
  assert.ok(layer(reality, 'RUNTIME').provenance.includes('git_registry_project_components'));

  // The second repository of the project composes into the same project reality.
  const front = deriveProjectReality(africafunds(FRONT_REPOSITORY));
  assert.deepEqual(states(front), states(reality));
  assert.equal(front.repositoryId, FRONT_REPOSITORY);
  assert.equal(front.projectId, AFRICAFUNDS);
  assert.equal(front.serverId, 's2');
});

test('C345-02 keeps the residuals of C4/C5 on the real MCP chain: undeclared component, domain and ingress stay UNVERIFIED', () => {
  const mcp = chain(REAL_REGISTRY, MCP_REPOSITORY, { observations: [mcpRuntime()] });
  const reality = deriveProjectReality(mcp);
  assert.deepEqual(states(reality), {
    REPOSITORY: 'VERIFIED', PROJECT: 'VERIFIED', SERVER: 'VERIFIED', RUNTIME: 'UNVERIFIED', INGRESS: 'UNVERIFIED', DOMAIN: 'UNVERIFIED'
  });
  assert.equal(reality.status, 'UNVERIFIED');
  assert.equal(reality.firstBlockingLayer, 'RUNTIME');
  assert.equal(reality.projectId, 'mcp_bridge');
  assert.equal(reality.serverId, 's1');
  // The V1 Patricked-code/MCP mapping declares no component role: no runtime is bound to it.
  assert.deepEqual(layer(reality, 'RUNTIME').reasonCodes, ['RUNTIME_COMPONENT_UNVERIFIED']);
  // mcp.wealthtechinnovations.com is declared, never observed: no domainVerified promotion.
  assert.deepEqual(layer(reality, 'DOMAIN').reasonCodes, ['DOMAIN_OBSERVATION_UNAVAILABLE']);
  assert.deepEqual(layer(reality, 'INGRESS').reasonCodes, ['INGRESS_OBSERVATION_UNAVAILABLE']);

  // A current domain observation proves the declared domain independently of the runtime layer.
  const observed = deriveProjectReality(chain(REAL_REGISTRY, MCP_REPOSITORY, {
    observations: [mcpRuntime()],
    domainObservation: {
      available: true, freshness: 'CURRENT', observedAt: NOW, serverId: 's1',
      domains: [{ domain: 'mcp.wealthtechinnovations.com', verified: true, evidenceRef: 'fixture:vhost:mcp' }]
    }
  }));
  assert.equal(layer(observed, 'DOMAIN').state, 'VERIFIED');
  assert.equal(observed.firstBlockingLayer, 'RUNTIME');
});

test('C345-02 classifies contradictions, stale, ambiguous and absent evidence and keeps them visible', () => {
  const serverMismatch = deriveProjectReality(africafunds(API_REPOSITORY, {
    observations: [s2Runtime(API_REPOSITORY, { serverId: 's1' }), s2Runtime(FRONT_REPOSITORY)]
  }));
  assert.equal(layer(serverMismatch, 'RUNTIME').state, 'CONFLICT');
  assert.equal(serverMismatch.status, 'CONFLICT');
  assert.deepEqual(serverMismatch.contradictions, [{ layer: 'RUNTIME', reasonCode: 'RUNTIME_SERVER_MISMATCH' }]);

  const undeclared = deriveProjectReality(africafunds(API_REPOSITORY, {
    domainObservation: s2Domains({
      domains: [
        ...s2Domains().domains,
        { domain: 'shadow.chainsolutions.fr', verified: true, evidenceRef: 'fixture:vhost:shadow' }
      ]
    })
  }));
  assert.equal(undeclared.status, 'CONFLICT');
  assert.deepEqual(undeclared.contradictions, [{ layer: 'DOMAIN', reasonCode: 'DOMAIN_OBSERVATION_UNDECLARED' }]);

  const unobserved = deriveProjectReality(africafunds(API_REPOSITORY, { domainObservation: s2Domains({ domains: [] }) }));
  assert.deepEqual(unobserved.contradictions, [{ layer: 'DOMAIN', reasonCode: 'DOMAIN_DECLARATION_UNOBSERVED' }]);

  const stale = deriveProjectReality(africafunds(API_REPOSITORY, {
    observations: [s2Runtime(API_REPOSITORY, { freshness: 'STALE' }), s2Runtime(FRONT_REPOSITORY)]
  }));
  assert.equal(layer(stale, 'RUNTIME').state, 'STALE');
  assert.equal(stale.status, 'STALE');
  assert.equal(stale.firstBlockingLayer, 'RUNTIME');
  assert.deepEqual(stale.contradictions, []);

  const ambiguousRegistry = {
    ...REAL_REGISTRY,
    mappings: [
      ...REAL_REGISTRY.mappings,
      { mappingId: 'africafunds-api-duplicate', repositoryId: API_REPOSITORY, projectId: AFRICAFUNDS, projectUid: null, componentRole: 'API' }
    ]
  };
  const ambiguous = deriveProjectReality(chain(ambiguousRegistry, API_REPOSITORY, { domainObservation: s2Domains() }));
  assert.equal(layer(ambiguous, 'PROJECT').state, 'AMBIGUOUS');
  assert.equal(ambiguous.status, 'AMBIGUOUS');
  assert.equal(ambiguous.firstBlockingLayer, 'PROJECT');
  assert.equal(ambiguous.projectId, null);

  const unmapped = deriveProjectReality(chain(REAL_REGISTRY, 'github:Wealthtechinnovations/unmapped'));
  assert.equal(layer(unmapped, 'PROJECT').state, 'NONE');
  assert.equal(unmapped.status, 'NONE');
  assert.equal(unmapped.firstBlockingLayer, 'PROJECT');
  // A chain stopped upstream never verifies, or proves absent, a downstream layer.
  for (const id of ['SERVER', 'RUNTIME', 'DOMAIN']) {
    assert.equal(layer(unmapped, id).state, 'UNVERIFIED', id);
  }
  assert.ok(layer(unmapped, 'SERVER').reasonCodes.includes('PROJECT_REALITY_UPSTREAM_UNVERIFIED'));

  const registryMismatch = deriveProjectReality(africafunds(API_REPOSITORY, {
    repository: repositoryResolution(API_REPOSITORY, { registryDigest: 'e'.repeat(64) })
  }));
  assert.deepEqual(registryMismatch.contradictions, [{ layer: 'PROJECT', reasonCode: 'GITHUB_PROJECT_REGISTRY_MISMATCH' }]);

  const referenceRegistry = {
    ...REAL_REGISTRY,
    mappings: REAL_REGISTRY.mappings.map((mapping: any) => (
      mapping.mappingId === API_MAPPING ? { ...mapping, componentRole: 'FRONTEND' } : mapping
    ))
  };
  const reference = deriveProjectReality(chain(referenceRegistry, API_REPOSITORY));
  assert.deepEqual(reference.contradictions, [{ layer: 'PROJECT', reasonCode: 'GITHUB_PROJECT_REFERENCE_UNVERIFIED' }]);

  const absent = deriveProjectReality({ observedAt: NOW });
  assert.equal(absent.status, 'UNVERIFIED');
  assert.equal(absent.firstBlockingLayer, 'REPOSITORY');
  for (const id of ['REPOSITORY', 'PROJECT', 'SERVER', 'RUNTIME', 'DOMAIN']) {
    assert.deepEqual(layer(absent, id).reasonCodes, ['PROJECT_REALITY_LAYER_UNAVAILABLE'], id);
    assert.equal(layer(absent, id).resolutionStatus, null, id);
  }
  assert.equal(absent.repositoryId, null);
  assert.equal(absent.projectId, null);
  assert.equal(absent.serverId, null);
});

test('C345-02 proves each layer is bound to the layer it composes on, and never verifies past an unproven layer', () => {
  const base = africafunds();
  const crossServer = deriveProjectReality({
    ...base,
    runtime: { ...base.runtime, serverId: 's1', bindings: base.runtime.bindings.map((binding: any) => ({ ...binding, serverId: 's1' })) }
  });
  assert.deepEqual(crossServer.contradictions, [{ layer: 'RUNTIME', reasonCode: 'PROJECT_REALITY_SERVER_BINDING_MISMATCH' }]);

  const crossDomain = deriveProjectReality({ ...base, domain: { ...base.domain, projectId: 'chainsolutions.stablecoin' } });
  assert.deepEqual(crossDomain.contradictions, [{ layer: 'DOMAIN', reasonCode: 'PROJECT_REALITY_DOMAIN_BINDING_MISMATCH' }]);

  const crossProject = deriveProjectReality({ ...base, server: { ...base.server, projectId: 'chainsolutions.stablecoin' } });
  assert.deepEqual(crossProject.contradictions, [{ layer: 'SERVER', reasonCode: 'PROJECT_REALITY_PROJECT_BINDING_MISMATCH' }]);

  const crossRepository = deriveProjectReality({ ...base, repository: repositoryResolution(FRONT_REPOSITORY) });
  assert.deepEqual(crossRepository.contradictions, [{ layer: 'PROJECT', reasonCode: 'PROJECT_REALITY_REPOSITORY_BINDING_MISMATCH' }]);
  assert.equal(crossRepository.projectId, null);

  // Mixed evidence (a stale repository under current downstream resolutions) never verifies downstream.
  const mixed = deriveProjectReality({
    ...base,
    repository: repositoryResolution(API_REPOSITORY, {
      status: 'UNVERIFIED', freshness: 'STALE', selectedRepository: null, reasonCodes: ['GITHUB_REPOSITORY_EVIDENCE_STALE']
    })
  });
  assert.equal(mixed.status, 'STALE');
  assert.equal(mixed.firstBlockingLayer, 'REPOSITORY');
  for (const id of ['PROJECT', 'SERVER', 'RUNTIME', 'DOMAIN']) {
    assert.equal(layer(mixed, id).state, 'UNVERIFIED', id);
    assert.ok(layer(mixed, id).reasonCodes.includes('PROJECT_REALITY_UPSTREAM_UNVERIFIED'), id);
  }
  assert.equal(mixed.repositoryId, null);
  assert.equal(mixed.projectId, null);
  assert.equal(mixed.serverId, null);
});

test('C345-02 accepts a fully proven reality only when runtime and public surface are observed absent', () => {
  const projects = REAL_REGISTRY.domainEvidence.projects.map((entry: any) => (
    entry.projectId === AFRICAFUNDS ? { ...entry, publicDomain: null, publicApi: null } : entry
  ));
  const registry = { ...REAL_REGISTRY, domainEvidence: { ...REAL_REGISTRY.domainEvidence, projects } };
  const noRuntime = (repositoryId: string) => s2Runtime(repositoryId, { runtimeKind: 'NO_RUNTIME', runtimeId: null, revision: null });
  const proven = deriveProjectReality(chain(registry, API_REPOSITORY, {
    observations: [noRuntime(API_REPOSITORY), noRuntime(FRONT_REPOSITORY)],
    domainObservation: s2Domains({ domains: [] })
  }));
  assert.deepEqual(states(proven), {
    REPOSITORY: 'VERIFIED', PROJECT: 'VERIFIED', SERVER: 'VERIFIED', RUNTIME: 'NONE', INGRESS: 'NONE', DOMAIN: 'NONE'
  });
  assert.deepEqual(layer(proven, 'DOMAIN').reasonCodes, ['DOMAIN_NONE_CONFIRMED']);
  assert.deepEqual(layer(proven, 'INGRESS').reasonCodes, ['INGRESS_NONE_WITHOUT_DOMAIN']);
  assert.equal(proven.status, 'VERIFIED');
  assert.equal(proven.firstBlockingLayer, null);
  assert.deepEqual(proven.contradictions, []);
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
const SESSION_ID = '11111111-1111-4111-8111-111111111111';

function session(repository = 'Patricked-code/MCP'): any {
  return {
    schemaVersion: 1,
    governedSessionId: SESSION_ID,
    repository,
    taskScope: 'TB-W3-C345-02',
    workBranch: null,
    agentIdentity: 'claude-code',
    ownerPrincipalId: 'oauth:wealthtech-mcp-admin',
    identityAssurance: 'oauth_subject',
    status: 'ACTIVE',
    createdAt: NOW,
    connectionContext: {
      schemaVersion: 1,
      connectionContextId: '66666666-6666-4666-8666-666666666666',
      governedSessionId: SESSION_ID,
      repository,
      principalId: 'oauth:wealthtech-mcp-admin',
      observedClientId: 'claude-code',
      identityAssurance: 'oauth_subject',
      clientClassification: 'UNRESOLVED',
      evidenceSource: 'oauth_auth_info',
      createdAt: NOW
    },
    lastAcknowledgedStateVersion: null,
    bootstrapReceipt: null,
    blockers: [],
    lastCheckpoint: null
  };
}

function json(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), { status, headers: { 'content-type': 'application/json' } });
}

function mcpRegistry(): any {
  return {
    available: true,
    sourceSchemaVersion: 2,
    digest: REGISTRY_DIGEST,
    candidateDigest: CANDIDATE_DIGEST,
    mappings: [{ mappingId: 'mcp-bridge', repositoryId: MCP_REPOSITORY, projectId: 'wealthtech.mcp', projectUid: null, componentRole: 'MCP_SERVER' }],
    projects: [],
    activationReadiness: [],
    serverBindings: [{
      mappingId: 'mcp-bridge', repositoryId: MCP_REPOSITORY, projectId: 'wealthtech.mcp', projectUid: null, componentRole: 'MCP_SERVER',
      serverId: 's1', serverPath: '/opt/apps/wealthtech-mcp-ssh-bridge', realPath: null, realPathVerified: false, environment: 'production'
    }],
    domainEvidence: {
      projects: [],
      mappings: [{
        mappingId: 'mcp-bridge', repositoryId: MCP_REPOSITORY, projectId: 'wealthtech.mcp', componentRole: 'MCP_SERVER',
        serverId: 's1', domain: 'mcp.wealthtech.test', domainVerified: false
      }]
    }
  };
}

function collector(clock: { now: Date }) {
  return createGithubOperationalContextCollector({
    fetchImpl: async (input: unknown) => {
      const url = String(input);
      if (url.endsWith('/commits/main')) return json({ sha: SHA });
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
    readProjectRegistry: async () => mcpRegistry(),
    readServerMap: async () => REAL_SERVER_MAP,
    managedServerIds: MANAGED,
    readRuntimeObservations: async () => [mcpRuntime({ observedAt: clock.now.toISOString() })],
    readDomainObservation: async (serverId: string | null) => ({
      available: true,
      freshness: 'CURRENT',
      observedAt: clock.now.toISOString(),
      serverId: serverId ?? 's1',
      domains: [{ domain: 'mcp.wealthtech.test', verified: true, evidenceRef: 'fixture:vhost:mcp' }]
    })
  } as never);
}

function service(
  clock: { now: Date },
  github: unknown,
  options: { session?: any; liveState?: any } = {}
) {
  return createGovernedOperationalContextService({
    liveState: { getCurrent: async () => options.liveState ?? null, reconcileNow: async () => options.liveState ?? null },
    github,
    sessions: { getVisibleSession: async () => options.session === undefined ? session() : options.session },
    locks: { listActiveLocks: async () => [] },
    gateMode: 'shadow',
    existingWriteToolsEnabled: false,
    now: () => clock.now
  } as never);
}

const INPUT = { governedSessionId: SESSION_ID, workBranch: null, request: {} } as never;

test('C345-02 projects the project reality in the governed operational context with miss, refresh, hit and stale semantics', async () => {
  const clock = { now: new Date(NOW) };
  const context = service(clock, collector(clock));

  const miss = (await context.getCurrent(INPUT)).projectReality as any;
  assert.equal(miss.status, 'UNVERIFIED');
  assert.equal(miss.firstBlockingLayer, 'REPOSITORY');
  assert.deepEqual(layer(miss, 'REPOSITORY').reasonCodes, ['GITHUB_REPOSITORY_CACHE_MISS']);
  assert.deepEqual(layer(miss, 'RUNTIME').reasonCodes, ['RUNTIME_SERVER_UNVERIFIED']);

  const fresh = (await context.reconcileExplicit(INPUT)).projectReality as any;
  assert.deepEqual(states(fresh), {
    REPOSITORY: 'VERIFIED', PROJECT: 'VERIFIED', SERVER: 'VERIFIED', RUNTIME: 'VERIFIED', INGRESS: 'UNVERIFIED', DOMAIN: 'VERIFIED'
  });
  assert.equal(fresh.status, 'UNVERIFIED');
  assert.equal(fresh.firstBlockingLayer, 'INGRESS');
  assert.equal(fresh.repositoryId, MCP_REPOSITORY);
  assert.equal(fresh.projectId, 'wealthtech.mcp');
  assert.equal(fresh.serverId, 's1');
  assert.ok(layer(fresh, 'RUNTIME').provenance.includes('live_state_runtime_observation'));

  const hit = (await context.getCurrent(INPUT)).projectReality as any;
  assert.deepEqual(states(hit), states(fresh));
  for (const id of ['REPOSITORY', 'PROJECT', 'SERVER', 'RUNTIME', 'DOMAIN']) {
    assert.ok(layer(hit, id).provenance.includes('memory_cache'), id);
  }

  clock.now = new Date('2026-10-05T04:00:02.000Z');
  const stale = (await context.getCurrent(INPUT)).projectReality as any;
  assert.equal(stale.status, 'STALE');
  assert.equal(stale.firstBlockingLayer, 'REPOSITORY');
  for (const id of ['REPOSITORY', 'PROJECT', 'SERVER', 'RUNTIME', 'DOMAIN']) {
    assert.equal(layer(stale, id).state, 'STALE', id);
  }
  assert.equal(stale.repositoryId, null);
  assert.equal(stale.projectId, null);
  assert.equal(stale.serverId, null);
});

test('C345-02 never projects another repository as its own reality, nor proven evidence into the Live TargetContext', async () => {
  const clock = { now: new Date(NOW) };
  // B3.2: a session bound to a target repository the observer does not cover.
  const foreign = (await service(clock, collector(clock), { session: session('Wealthtechinnovations/api_opcv') })
    .reconcileExplicit(INPUT)).projectReality as any;
  assert.equal(foreign.status, 'UNVERIFIED');
  assert.deepEqual(layer(foreign, 'REPOSITORY').reasonCodes, ['GITHUB_REPOSITORY_API_UNAVAILABLE']);
  for (const id of ['PROJECT', 'SERVER', 'RUNTIME', 'DOMAIN']) {
    assert.deepEqual(layer(foreign, id).reasonCodes, ['PROJECT_REALITY_LAYER_UNAVAILABLE'], id);
  }

  const africa = africafunds();
  const registered = REAL_REGISTRY.projects.find((entry: any) => entry.projectId === AFRICAFUNDS);
  const targetContext = deriveTargetContext({
    project: {
      projectId: registered.projectId,
      projectUid: registered.projectUid,
      globalCheckpointRepositoryId: registered.globalCheckpointRepositoryId,
      centralGovernanceRepositoryId: registered.centralGovernanceRepositoryId,
      repositoryComponents: registered.repositoryComponents
    },
    observations: [],
    observedAt: NOW
  });
  const liveState = {
    schemaVersion: 1, stateVersion: 9, generatedAt: NOW, lastReconciledAt: NOW, maxAgeSeconds: 60,
    freshness: 'CURRENT', ageSeconds: 0, repository: 'Patricked-code/MCP',
    github: { status: 'CURRENT', branch: 'main', head: SHA, error: null },
    s1: {
      status: 'CURRENT', path: '/opt/apps/wealthtech-mcp-ssh-bridge', branch: 'main', head: SHA, originMain: SHA,
      workingTreeClean: true, diffEmpty: true, fetchRemote: 'https://github.com/Patricked-code/MCP.git',
      pushRemote: 'disabled://mcp-s1-read-only', error: null
    },
    runtime: {
      status: 'CURRENT', container: 'wealthtech_mcp_ssh_bridge', containerStatus: 'running',
      health: 'healthy', imageId: 'sha256:image', revision: SHA, error: null
    },
    documentation: {
      status: 'CURRENT', activeTask: null, declaredGithubSha: SHA, declaredS1Sha: SHA, drift: false, error: null
    },
    alignment: { githubVsS1: 'ALIGNED', runtime: 'ALIGNED', documentation: 'ALIGNED', global: 'FULLY_ALIGNED' },
    contradictions: [],
    nextAction: null,
    targetContext
  };
  const github = {
    getCurrent: async () => ({
      ...(await collector(clock).reconcileExplicit(null, { oauthPrincipalId: null, repositoryContext: null })),
      repositoryResolution: africa.repository,
      projectResolution: africa.project,
      serverResolution: africa.server,
      runtimeResolution: africa.runtime,
      domainResolution: africa.domain
    })
  };
  const projected = await service(clock, { ...github, reconcileExplicit: github.getCurrent }, { liveState }).getCurrent(INPUT);
  const reality = projected.projectReality as any;
  assert.equal(reality.projectId, AFRICAFUNDS);
  assert.equal(layer(reality, 'RUNTIME').state, 'VERIFIED');
  // The Live TargetContext stays Live State's: a component carries a runtime revision only when the
  // proven runtime layer binds it, and an exact head only from a per-repository head authority (none yet).
  assert.deepEqual(projected.targetContext, targetContext);
  for (const component of projected.targetContext!.components) {
    assert.equal(component.githubHead, null);
    if (component.runtimeRevision !== null) {
      assert.ok(africa.runtime.bindings.some((binding: any) => (
        binding.componentId === component.mappingId && binding.revision === component.runtimeRevision
      )));
    }
    assert.equal(component.freshness, 'UNVERIFIED');
  }
});

test('C345-02 project reality is pure, frozen, deterministic and read-only', async () => {
  const source = await readFile(MODULE_PATH, 'utf8');
  for (const forbidden of [/from '\.\.\/ssh\//, /from 'node:fs/, /node:dns/, /fetch\(/, /child_process/, /writeFile/, /protectedApplications/]) {
    assert.doesNotMatch(source, forbidden);
  }
  const input = africafunds();
  const first = deriveProjectReality(input);
  assert.deepEqual(deriveProjectReality(input), first);
  assert.ok(Object.isFrozen(first));
  assert.ok(Object.isFrozen(first.layers));
  assert.ok(first.layers.every((entry: any) => Object.isFrozen(entry) && Object.isFrozen(entry.reasonCodes)));
  const serialized = JSON.stringify(first);
  for (const forbidden of ['127.0.0.1', 'privateKey', 'mcp-unit-test-s2-key', 'work-state-token']) {
    assert.equal(serialized.includes(forbidden), false, forbidden);
  }
});
