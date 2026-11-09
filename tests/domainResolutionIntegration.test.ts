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
const { resolveProjectServer } = await import('../src/github/serverResolution.js');
const {
  resolveProjectDomain,
  unavailableDomainObservation
} = await import('../src/github/domainResolution.js');
const { createGithubOperationalContextCollector } = await import('../src/governedContext/github.js');

const NOW = '2026-10-04T23:40:00.000Z';
const REGISTRY_DIGEST = 'd'.repeat(64);
const CANDIDATE_DIGEST = 'c'.repeat(64);
const API_REPOSITORY = 'github:Wealthtechinnovations/api_opcv';
const FRONT_REPOSITORY = 'github:Wealthtechinnovations/front_end_opcvm';
const SERVER_MAP = {
  schemaVersion: 1,
  servers: {
    S1: { role: 'mcp_host_and_destination', mainPath: '/opt/apps/wealthtech-mcp-ssh-bridge', targetProjectIds: [] },
    S2: { role: 'source_migration_server', protectedApplications: ['africafunds.chainsolutions.fr', 'legacy.example.test'] }
  }
};
const MANAGED = ['s1', 's2'];
const MODULE_PATH = join(process.cwd(), 'src', 'github', 'domainResolution.ts');

const HISTORICAL = {
  historicalVhostId: 's2-funds',
  classification: 'HISTORICAL_VHOST',
  serverId: 'S2',
  serverPath: '/var/www/vhosts/chainsolutions.fr/Funds.chainsolutions.fr',
  domain: 'funds.chainsolutions.fr',
  repositoryId: null,
  current: false,
  deploymentSource: false
};

function project(overrides: Record<string, unknown> = {}): any {
  return {
    status: 'RESOLVED',
    observedAt: NOW,
    repositoryId: API_REPOSITORY,
    selectedMapping: {
      mappingId: 'africafunds-api',
      repositoryId: API_REPOSITORY,
      projectId: 'chainsolutions.africafunds',
      projectUid: null,
      componentRole: 'API',
      activationReadiness: 'BLOCKED',
      activationReasonCodes: ['MAPPING_PATH_UNVERIFIED']
    },
    selectedProject: { projectId: 'chainsolutions.africafunds', projectUid: 'uid-af', name: 'AfricaFunds', kind: 'product' },
    candidates: [{ mappingId: 'africafunds-api', projectId: 'chainsolutions.africafunds' }],
    candidateCount: 1,
    freshness: 'CURRENT',
    provenance: ['github_repository_resolution', 'git_registry_v2_candidate'],
    reasonCodes: [],
    registryDigest: REGISTRY_DIGEST,
    candidateDigest: CANDIDATE_DIGEST,
    ...overrides
  };
}

function domainProject(overrides: Record<string, unknown> = {}) {
  return {
    projectId: 'chainsolutions.africafunds',
    publicDomain: 'africafunds.chainsolutions.fr',
    publicApi: 'https://africafunds.chainsolutions.fr/api',
    historicalVhosts: [HISTORICAL],
    ...overrides
  };
}

function domainMapping(overrides: Record<string, unknown> = {}) {
  return {
    mappingId: 'africafunds-api',
    repositoryId: API_REPOSITORY,
    projectId: 'chainsolutions.africafunds',
    componentRole: 'API',
    serverId: 'S2',
    domain: null,
    domainVerified: false,
    ...overrides
  };
}

function binding(overrides: Record<string, unknown> = {}) {
  return {
    mappingId: 'africafunds-api',
    repositoryId: API_REPOSITORY,
    projectId: 'chainsolutions.africafunds',
    projectUid: null,
    componentRole: 'API',
    serverId: 'S2',
    serverPath: '/var/www/vhosts/chainsolutions.fr/africafunds.chainsolutions.fr/api',
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
      mappingId: 'africafunds-api',
      repositoryId: API_REPOSITORY,
      projectId: 'chainsolutions.africafunds',
      projectUid: null,
      componentRole: 'API'
    }],
    projects: [],
    activationReadiness: [],
    serverBindings: [binding()],
    domainEvidence: {
      projects: [domainProject()],
      mappings: [
        domainMapping(),
        domainMapping({ mappingId: 'africafunds-front', repositoryId: FRONT_REPOSITORY, componentRole: 'FRONTEND' })
      ]
    },
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
    available: true,
    freshness: 'CURRENT',
    observedAt: NOW,
    serverId: 's2',
    domains: [{ domain: 'africafunds.chainsolutions.fr', verified: true, evidenceRef: 'fixture:vhost:africafunds' }],
    ...overrides
  };
}

function resolve(overrides: Record<string, unknown> = {}) {
  return resolveProjectDomain({
    project: project(),
    server: server(),
    registry: registry(),
    observation: observation(),
    observedAt: NOW,
    ...overrides
  } as never);
}

test('C5 GitRegistry project evidence carries bounded domain declarations and historical vhosts', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'mcp-c5-registry-'));
  const file = join(directory, 'registry.json');
  const previous = process.env.MCP_GIT_REGISTRY_FILE;
  await writeFile(file, JSON.stringify({
    version: 1,
    updatedAt: NOW,
    accounts: [],
    repoMappings: [{
      id: 'africafunds-api', githubOwner: 'Wealthtechinnovations', githubRepo: 'api_opcv', projectKey: 'chainsolutions.africafunds',
      projectId: 'chainsolutions.africafunds', componentRole: 'API', serverId: 'S2',
      serverPath: '/var/www/vhosts/chainsolutions.fr/africafunds.chainsolutions.fr/api', officialBranch: 'main', allowedAccess: 'read', deployEnabled: false
    }],
    auditEvents: [],
    projects: [{
      projectId: 'chainsolutions.africafunds', projectUid: 'uid-af', name: 'AfricaFunds', kind: 'product', productionServerId: 'S2',
      canonicalBranch: 'main', repositoryComponents: [{ repositoryId: API_REPOSITORY, mappingId: 'africafunds-api', role: 'API' }],
      globalCheckpointRepositoryId: API_REPOSITORY, centralGovernanceRepositoryId: API_REPOSITORY, stateModel: 'checkpoint',
      stateFields: ['status'], publicDomain: 'africafunds.chainsolutions.fr', publicApi: 'https://africafunds.chainsolutions.fr/api',
      historicalVhosts: [HISTORICAL]
    }]
  }), 'utf8');
  process.env.MCP_GIT_REGISTRY_FILE = file;
  try {
    const evidence = await readGitRegistryProjectEvidence();
    assert.equal(evidence.available, true);
    assert.deepEqual(evidence.domainEvidence?.projects, [domainProject()]);
    assert.deepEqual(evidence.domainEvidence?.mappings, [domainMapping()]);
    process.env.MCP_GIT_REGISTRY_FILE = join(directory, 'missing.json');
    assert.deepEqual((await readGitRegistryProjectEvidence()).domainEvidence, { projects: [], mappings: [] });
  } finally {
    if (previous === undefined) delete process.env.MCP_GIT_REGISTRY_FILE;
    else process.env.MCP_GIT_REGISTRY_FILE = previous;
    await rm(directory, { recursive: true, force: true });
  }
});

test('C5 resolves the project domain surface through GW-09 after C2/C3 from declarations and current observation', () => {
  const resolved = resolve();
  assert.equal(resolved.status, 'RESOLVED');
  assert.equal(resolved.projectId, 'chainsolutions.africafunds');
  assert.equal(resolved.serverId, 's2');
  assert.deepEqual(resolved.surface.map((entry: any) => [entry.role, entry.domain, entry.endpoint]), [
    ['API', 'africafunds.chainsolutions.fr', 'https://africafunds.chainsolutions.fr/api'],
    ['FRONTEND', 'africafunds.chainsolutions.fr', 'https://africafunds.chainsolutions.fr']
  ]);
  assert.deepEqual(resolved.excludedHistoricalVhosts, ['funds.chainsolutions.fr']);
  for (const provenance of ['project_resolution', 'server_resolution', 'git_registry_domain_data', 'domain_observation']) {
    assert.ok(resolved.provenance.includes(provenance), provenance);
  }
  assert.equal(resolved.authorizationInferred, false);
  assert.equal(resolved.mutationPerformed, false);
  assert.equal(resolved.vhostMutationPerformed, false);

  const v1 = resolve({ registry: registry({ sourceSchemaVersion: 1 }) });
  assert.ok(v1.provenance.includes('git_registry_v2_candidate_from_v1'));
});

test('C5 without a domain observation authority stays UNVERIFIED, never NONE', () => {
  const absent = resolve({ observation: null });
  assert.equal(absent.status, 'UNVERIFIED');
  assert.deepEqual(absent.reasonCodes, ['DOMAIN_OBSERVATION_UNAVAILABLE']);
  assert.deepEqual(absent.surface, []);

  const unavailable = unavailableDomainObservation('s2', NOW);
  assert.equal(unavailable.available, false);
  assert.equal(unavailable.freshness, 'UNKNOWN');
  assert.deepEqual(unavailable.domains, []);
});

test('C5 fails closed on project, server, registry, stale, contradictory or malformed evidence', () => {
  assert.deepEqual(resolve({ project: project({ status: 'NONE', selectedMapping: null, selectedProject: null }) }).reasonCodes, ['DOMAIN_PROJECT_NONE']);
  assert.equal(resolve({ project: project({ status: 'AMBIGUOUS', selectedMapping: null, selectedProject: null }) }).status, 'AMBIGUOUS');
  assert.deepEqual(resolve({ project: project({ freshness: 'STALE' }) }).reasonCodes, ['DOMAIN_PROJECT_UNVERIFIED']);

  const noServer = resolve({ server: server({ project: project({ status: 'NONE', selectedMapping: null, selectedProject: null }) }), observation: null });
  assert.deepEqual(noServer.reasonCodes, ['DOMAIN_SERVER_UNVERIFIED']);

  assert.deepEqual(resolve({ registry: registry({ available: false }) }).reasonCodes, ['DOMAIN_REGISTRY_UNAVAILABLE']);
  assert.deepEqual(resolve({ registry: registry({ domainEvidence: undefined }) }).reasonCodes, ['DOMAIN_REGISTRY_UNAVAILABLE']);
  const badRegistry = resolve({ registry: registry({ domainEvidence: { projects: [domainProject({ publicApi: 'not a url' })], mappings: [] } }) });
  assert.deepEqual(badRegistry.reasonCodes, ['DOMAIN_REGISTRY_UNAVAILABLE']);

  const stale = resolve({ observation: observation({ freshness: 'STALE' }) });
  assert.equal(stale.freshness, 'STALE');
  assert.deepEqual(stale.reasonCodes, ['DOMAIN_EVIDENCE_STALE']);

  assert.deepEqual(resolve({ observation: observation({ serverId: 's1' }) }).reasonCodes, ['DOMAIN_SERVER_MISMATCH']);
  assert.deepEqual(resolve({
    observation: observation({ domains: [...observation().domains, { domain: 'other.example.test', verified: true, evidenceRef: 'fixture:vhost:other' }] })
  }).reasonCodes, ['DOMAIN_OBSERVATION_UNDECLARED']);
  assert.deepEqual(resolve({ observation: observation({ domains: [] }) }).reasonCodes, ['DOMAIN_DECLARATION_UNOBSERVED']);
  assert.deepEqual(resolve({
    observation: observation({ domains: [{ domain: 'africafunds.chainsolutions.fr', verified: false, evidenceRef: 'fixture:vhost:africafunds' }] })
  }).reasonCodes, ['DOMAIN_OBSERVATION_UNVERIFIED']);

  const historicalConflict = resolve({
    registry: registry({ domainEvidence: { projects: [domainProject({ publicDomain: 'funds.chainsolutions.fr', publicApi: null })], mappings: [] } })
  });
  assert.deepEqual(historicalConflict.reasonCodes, ['DOMAIN_HISTORICAL_DECLARATION_CONFLICT']);

  for (const malformed of [
    observation({ domains: [{ domain: 'x'.repeat(300), verified: true, evidenceRef: 'fixture' }] }),
    observation({ observedAt: 'yesterday' }),
    observation({ extra: true }),
    'not an observation'
  ]) {
    const result = resolve({ observation: malformed });
    assert.equal(result.status, 'UNVERIFIED', JSON.stringify(malformed));
    assert.deepEqual(result.reasonCodes, ['DOMAIN_OBSERVATION_UNAVAILABLE']);
    assert.deepEqual(result.surface, []);
  }
});

test('C5 composition is read-only and never treats protected domains as the domain model', async () => {
  const source = await readFile(MODULE_PATH, 'utf8');
  for (const forbidden of [/from '\.\.\/ssh\//, /from 'node:fs/, /node:dns/, /fetch\(/, /config\/servers/, /writeFile/, /child_process/, /protectedApplications/]) {
    assert.doesNotMatch(source, forbidden);
  }
  // A project with no declaration and no observation authority is never resolved from a safety list.
  const domainless = resolve({
    registry: registry({ domainEvidence: { projects: [domainProject({ publicDomain: null, publicApi: null, historicalVhosts: [] })], mappings: [domainMapping()] } }),
    observation: null
  });
  assert.equal(domainless.status, 'UNVERIFIED');
  assert.deepEqual(domainless.reasonCodes, ['DOMAIN_OBSERVATION_UNAVAILABLE']);
  const serialized = JSON.stringify(resolve());
  for (const forbidden of ['127.0.0.1', 'privateKey', 'username', 'mcp-unit-test-s2-key', 'legacy.example.test']) {
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
const MCP_REPOSITORY = 'github:Patricked-code/MCP';

function json(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), { status, headers: { 'content-type': 'application/json' } });
}

function mcpRegistry(): any {
  return {
    available: true,
    sourceSchemaVersion: 2,
    digest: REGISTRY_DIGEST,
    candidateDigest: CANDIDATE_DIGEST,
    mappings: [{ mappingId: 'mcp-bridge', repositoryId: MCP_REPOSITORY, projectId: 'wealthtech.mcp', projectUid: null, componentRole: null }],
    projects: [],
    activationReadiness: [],
    serverBindings: [{
      mappingId: 'mcp-bridge', repositoryId: MCP_REPOSITORY, projectId: 'wealthtech.mcp', projectUid: null, componentRole: null,
      serverId: 's1', serverPath: '/opt/apps/wealthtech-mcp-ssh-bridge', realPath: null, realPathVerified: false, environment: 'production'
    }],
    domainEvidence: {
      projects: [],
      mappings: [{
        mappingId: 'mcp-bridge', repositoryId: MCP_REPOSITORY, projectId: 'wealthtech.mcp', componentRole: null,
        serverId: 's1', domain: 'mcp.wealthtech.test', domainVerified: false
      }]
    }
  };
}

function collector(clock: { now: Date }, readDomainObservation?: (serverId: string | null) => Promise<unknown>) {
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
    readProjectRegistry: async () => mcpRegistry(),
    readServerMap: async () => SERVER_MAP,
    managedServerIds: MANAGED,
    readRuntimeObservations: async () => [],
    ...(readDomainObservation ? { readDomainObservation } : {})
  } as never);
}

test('C5 chains GW-09 after C3 in the governed GitHub context, with miss, hit, stale and absent-authority semantics', async () => {
  const clock = { now: new Date(NOW) };
  const github = collector(clock, async (serverId) => ({
    available: true,
    freshness: 'CURRENT',
    observedAt: clock.now.toISOString(),
    serverId: serverId ?? 's1',
    domains: [{ domain: 'mcp.wealthtech.test', verified: true, evidenceRef: 'fixture:vhost:mcp' }]
  }));

  const miss = await github.getCurrent(null, IDENTITY_SCOPE);
  assert.equal(miss.domainResolution?.status, 'UNVERIFIED');
  assert.deepEqual(miss.domainResolution?.reasonCodes, ['DOMAIN_PROJECT_UNVERIFIED']);
  assert.deepEqual(miss.domainResolution?.provenance, ['memory_cache']);

  const fresh = await github.reconcileExplicit(null, IDENTITY_SCOPE);
  assert.equal(fresh.serverResolution?.status, 'RESOLVED');
  assert.equal(fresh.domainResolution?.status, 'RESOLVED');
  assert.deepEqual(fresh.domainResolution?.surface.map((entry: any) => [entry.role, entry.domain]), [['OTHER', 'mcp.wealthtech.test']]);

  const hit = await github.getCurrent(null, IDENTITY_SCOPE);
  assert.equal(hit.cache.status, 'HIT');
  assert.ok(hit.domainResolution?.provenance.includes('memory_cache'));

  clock.now = new Date('2026-10-04T23:40:02.000Z');
  const stale = await github.getCurrent(null, IDENTITY_SCOPE);
  assert.equal(stale.domainResolution?.status, 'UNVERIFIED');
  assert.equal(stale.domainResolution?.freshness, 'STALE');
  assert.deepEqual(stale.domainResolution?.surface, []);
  assert.deepEqual(stale.domainResolution?.reasonCodes, ['DOMAIN_EVIDENCE_STALE']);

  const withoutAuthority = await collector({ now: new Date(NOW) }).reconcileExplicit(null, IDENTITY_SCOPE);
  assert.equal(withoutAuthority.domainResolution?.status, 'UNVERIFIED');
  assert.deepEqual(withoutAuthority.domainResolution?.reasonCodes, ['DOMAIN_OBSERVATION_UNAVAILABLE']);

  const failing = await collector({ now: new Date(NOW) }, async () => { throw new Error('observer down'); }).reconcileExplicit(null, IDENTITY_SCOPE);
  assert.deepEqual(failing.domainResolution?.reasonCodes, ['DOMAIN_OBSERVATION_UNAVAILABLE']);
});
