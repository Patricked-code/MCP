import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { createGovernedContractSubstrate } from '../src/governedWorkflow/contractSubstrate.js';

const NOW = '2026-09-19T06:52:00Z';

async function substrate() {
  const [contractsText, graphText] = await Promise.all([
    readFile('.mcp/gwc-contracts.json', 'utf8'),
    readFile('.mcp/gwc-workflow-graph.json', 'utf8')
  ]);
  const contracts = JSON.parse(contractsText);
  const graph = JSON.parse(graphText);
  return createGovernedContractSubstrate({
    contractsProjection: contracts,
    graphProjection: graph,
    expectedSchemaVersion: 1,
    expectedContractRegistryDigest: contracts.registryDigest,
    expectedGraphRegistryDigest: graph.registryDigest
  });
}

async function domainResolver() {
  return import('../src/governedWorkflow/resolvers/domain.js');
}

function projectResolution(overrides: Record<string, unknown> = {}) {
  return {
    status: 'RESOLVED',
    observedAt: NOW,
    repositoryId: 'github:ExampleOrg/web',
    selectedMapping: {
      mappingId: 'example-web',
      repositoryId: 'github:ExampleOrg/web',
      projectId: 'example.platform',
      projectUid: 'EXAMPLE-001',
      componentRole: 'FRONTEND',
      activationReadiness: 'READY',
      activationReasonCodes: []
    },
    selectedProject: {
      projectId: 'example.platform',
      projectUid: 'EXAMPLE-001',
      name: 'Example Platform',
      kind: 'MULTI_REPOSITORY_APPLICATION'
    },
    candidates: [{ mappingId: 'example-web', projectId: 'example.platform' }],
    candidateCount: 1,
    freshness: 'CURRENT',
    provenance: ['github_repository_resolution', 'git_registry_v2_candidate'],
    reasonCodes: [],
    registryDigest: 'b'.repeat(64),
    candidateDigest: 'c'.repeat(64),
    ...overrides
  } as any;
}

function serverResolution(overrides: Record<string, unknown> = {}) {
  return {
    status: 'RESOLVED',
    observedAt: NOW,
    projectId: 'example.platform',
    selectedServer: {
      serverId: 's2',
      rawServerIds: ['S2', 's2'],
      environment: 'production',
      bindings: []
    },
    candidates: [],
    candidateCount: 1,
    freshness: 'CURRENT',
    provenance: ['github_project_resolution', 'git_registry_server_binding'],
    reasonCodes: [],
    registryDigest: 'b'.repeat(64),
    candidateDigest: 'c'.repeat(64),
    projectMappingId: 'example-web',
    canonicalServerIds: ['s1', 's2'],
    authorizationInferred: false,
    mutationPerformed: false,
    sshMutationPerformed: false,
    ...overrides
  } as any;
}

function registryEvidence(overrides: Record<string, unknown> = {}) {
  return {
    available: true,
    freshness: 'CURRENT',
    digest: 'b'.repeat(64),
    candidateDigest: 'c'.repeat(64),
    projects: [{
      projectId: 'example.platform',
      publicDomain: 'app.example.com',
      publicApi: 'https://api.example.com/v1',
      historicalVhosts: [{
        historicalVhostId: 'example-old',
        classification: 'HISTORICAL_VHOST',
        serverId: 'S2',
        serverPath: '/srv/legacy/example',
        domain: 'old.example.com',
        repositoryId: null,
        current: false,
        deploymentSource: false
      }]
    }],
    mappings: [
      {
        mappingId: 'example-web',
        repositoryId: 'github:ExampleOrg/web',
        projectId: 'example.platform',
        componentRole: 'FRONTEND',
        serverId: 'S2',
        domain: 'app.example.com',
        domainVerified: true
      },
      {
        mappingId: 'example-api',
        repositoryId: 'github:ExampleOrg/api',
        projectId: 'example.platform',
        componentRole: 'API',
        serverId: 'S2',
        domain: 'api.example.com',
        domainVerified: true
      }
    ],
    ...overrides
  } as any;
}

function observation(overrides: Record<string, unknown> = {}) {
  return {
    available: true,
    freshness: 'CURRENT',
    observedAt: NOW,
    serverId: 's2',
    domains: [
      { domain: 'app.example.com', verified: true, evidenceRef: 'vhost:app' },
      { domain: 'api.example.com', verified: true, evidenceRef: 'vhost:api' }
    ],
    ...overrides
  } as any;
}

function input(overrides: Record<string, unknown> = {}) {
  return {
    project: projectResolution(),
    server: serverResolution(),
    registry: registryEvidence(),
    observation: observation(),
    observedAt: NOW,
    ...overrides
  } as any;
}

test('GWC-8 RED: resolves current FRONTEND and API surface from project declarations plus current observation', async () => {
  const { resolveDomain } = await domainResolver();
  const resolved = resolveDomain(input());

  assert.equal(resolved.status, 'RESOLVED');
  assert.equal(resolved.freshness, 'CURRENT');
  assert.deepEqual(
    resolved.surface.map((entry: any) => ({
      role: entry.role,
      domain: entry.domain,
      endpoint: entry.endpoint,
      verified: entry.verified
    })),
    [
      {
        role: 'API',
        domain: 'api.example.com',
        endpoint: 'https://api.example.com/v1',
        verified: true
      },
      {
        role: 'FRONTEND',
        domain: 'app.example.com',
        endpoint: 'https://app.example.com',
        verified: true
      }
    ]
  );
  assert.equal(resolved.authorizationInferred, false);
  assert.equal(resolved.mutationPerformed, false);
  assert.equal(resolved.vhostMutationPerformed, false);
});

test('GWC-8 returns proven NONE only when current authority and observation both prove no public surface', async () => {
  const { resolveDomain } = await domainResolver();
  const resolved = resolveDomain(input({
    registry: registryEvidence({
      projects: [{
        projectId: 'example.platform',
        publicDomain: null,
        publicApi: null,
        historicalVhosts: []
      }],
      mappings: [
        {
          mappingId: 'example-web',
          repositoryId: 'github:ExampleOrg/web',
          projectId: 'example.platform',
          componentRole: 'FRONTEND',
          serverId: 'S2',
          domain: null,
          domainVerified: false
        }
      ]
    }),
    observation: observation({ domains: [] })
  }));

  assert.equal(resolved.status, 'NONE');
  assert.equal(resolved.freshness, 'CURRENT');
  assert.deepEqual(resolved.surface, []);
  assert.deepEqual(resolved.reasonCodes, ['DOMAIN_NONE_CONFIRMED']);
});

test('GWC-8 missing observation stays UNVERIFIED and never becomes NONE', async () => {
  const { resolveDomain } = await domainResolver();
  const resolved = resolveDomain(input({
    registry: registryEvidence({
      projects: [{
        projectId: 'example.platform',
        publicDomain: null,
        publicApi: null,
        historicalVhosts: []
      }],
      mappings: []
    }),
    observation: {
      available: false,
      freshness: 'UNKNOWN',
      observedAt: NOW,
      serverId: 's2',
      domains: []
    }
  }));

  assert.equal(resolved.status, 'UNVERIFIED');
  assert.notEqual(resolved.status, 'NONE');
  assert.deepEqual(resolved.reasonCodes, ['DOMAIN_OBSERVATION_UNAVAILABLE']);
});

test('GWC-8 stale domain evidence fails closed and preserves STALE freshness', async () => {
  const { resolveDomain } = await domainResolver();
  const resolved = resolveDomain(input({
    observation: observation({ freshness: 'STALE' })
  }));

  assert.equal(resolved.status, 'UNVERIFIED');
  assert.equal(resolved.freshness, 'STALE');
  assert.deepEqual(resolved.reasonCodes, ['DOMAIN_EVIDENCE_STALE']);
});

test('GWC-8 excludes historical vhosts from the active surface and reports them explicitly', async () => {
  const { resolveDomain } = await domainResolver();
  const resolved = resolveDomain(input({
    observation: observation({
      domains: [
        { domain: 'app.example.com', verified: true, evidenceRef: 'vhost:app' },
        { domain: 'api.example.com', verified: true, evidenceRef: 'vhost:api' },
        { domain: 'old.example.com', verified: true, evidenceRef: 'vhost:old' }
      ]
    })
  }));

  assert.equal(resolved.status, 'RESOLVED');
  assert.deepEqual(resolved.excludedHistoricalVhosts, ['old.example.com']);
  assert.equal(resolved.surface.some((entry: any) => entry.domain === 'old.example.com'), false);
});

test('GWC-8 rejects a current observed domain that is not declared by the resolved project', async () => {
  const { resolveDomain } = await domainResolver();
  const resolved = resolveDomain(input({
    observation: observation({
      domains: [
        { domain: 'app.example.com', verified: true, evidenceRef: 'vhost:app' },
        { domain: 'api.example.com', verified: true, evidenceRef: 'vhost:api' },
        { domain: 'unknown.example.com', verified: true, evidenceRef: 'vhost:unknown' }
      ]
    })
  }));

  assert.equal(resolved.status, 'UNVERIFIED');
  assert.deepEqual(resolved.reasonCodes, ['DOMAIN_OBSERVATION_UNDECLARED']);
});

test('GWC-8 returns AMBIGUOUS when one role has conflicting active declarations', async () => {
  const { resolveDomain } = await domainResolver();
  const resolved = resolveDomain(input({
    registry: registryEvidence({
      projects: [{
        projectId: 'example.platform',
        publicDomain: 'app.example.com',
        publicApi: null,
        historicalVhosts: []
      }],
      mappings: [
        {
          mappingId: 'example-web',
          repositoryId: 'github:ExampleOrg/web',
          projectId: 'example.platform',
          componentRole: 'FRONTEND',
          serverId: 'S2',
          domain: 'www.example.com',
          domainVerified: true
        }
      ]
    }),
    observation: observation({
      domains: [
        { domain: 'app.example.com', verified: true, evidenceRef: 'vhost:app' },
        { domain: 'www.example.com', verified: true, evidenceRef: 'vhost:www' }
      ]
    })
  }));

  assert.equal(resolved.status, 'AMBIGUOUS');
  assert.deepEqual(resolved.reasonCodes, ['DOMAIN_ROLE_AMBIGUOUS']);
});

test('GWC-8 binds domain observation to the resolved server', async () => {
  const { resolveDomain } = await domainResolver();
  const resolved = resolveDomain(input({
    observation: observation({ serverId: 's1' })
  }));

  assert.equal(resolved.status, 'UNVERIFIED');
  assert.deepEqual(resolved.reasonCodes, ['DOMAIN_SERVER_MISMATCH']);
});

test('GW-09 wrapper binds canonical contract metadata and adds no authorization or mutation semantics', async () => {
  const { resolveGw09Domain } = await domainResolver();
  const wrapped = resolveGw09Domain(input(), await substrate());

  assert.deepEqual(wrapped.contract, { stepId: 'GW-09', contractVersion: 1 });
  assert.equal(wrapped.status, 'RESOLVED');
  assert.equal(wrapped.payload.surface.length, 2);
  assert.equal(wrapped.authorizationInferred, false);
  assert.equal(wrapped.mutationPerformed, false);
  assert.equal(wrapped.vhostMutationPerformed, false);
  assert.equal(wrapped.replayModel, 'READ_ONLY');
});

test('GWC-8 domain resolution is deterministic and never promotes historical/protected naming into identity', async () => {
  const { resolveDomain } = await domainResolver();
  const first = resolveDomain(input());
  const second = resolveDomain(input());
  assert.deepEqual(second, first);
  const serialized = JSON.stringify(first);
  assert.equal(serialized.includes('/srv/legacy/example'), false);
  assert.equal(serialized.includes('protectedDomains'), false);
});
