import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { resolveGithubIdentity } from '../src/github/identityResolution.js';
import { resolveGithubRepository } from '../src/github/repositoryResolution.js';
import { resolveGithubProject } from '../src/github/projectResolution.js';
import { createGovernedContractSubstrate } from '../src/governedWorkflow/contractSubstrate.js';

const NOW = '2026-09-19T02:46:00Z';
const POLICY_DIGEST = 'a'.repeat(64);

function identityInput() {
  return {
    oauthPrincipalId: 'oauth:example-user',
    repositoryContext: 'ExampleOrg/api',
    policy: {
      schemaVersion: 2,
      updatedAt: '2026-09-19T00:00:00Z',
      goal: 'bind identity evidence',
      currentSignals: ['oauth'],
      limits: ['identity only'],
      s1GithubDeploymentIdentity: {
        id: 'TEST_READ_ONLY',
        type: 'github_deploy_key_ssh',
        repository: 'ExampleOrg/api',
        fetchAlias: 'example-read-only',
        contentsRead: true,
        contentsWrite: false,
        pushUrl: 'disabled://read-only',
        privateKeyReadableByMcp: false
      },
      requiredSuiviFields: ['date'],
      githubPrincipalBindings: [{
        bindingId: 'binding-example',
        oauthPrincipalId: 'oauth:example-user',
        provider: 'github',
        connectionSelector: { owner: 'ExampleOrg', type: 'organization' },
        expectedAuthenticatedLogin: 'example-user',
        context: { repository: 'ExampleOrg/api' },
        effect: 'IDENTITY_ONLY',
        enabled: true
      }]
    },
    policyDigest: POLICY_DIGEST,
    policyValid: true,
    connections: [{
      owner: 'ExampleOrg',
      type: 'organization',
      configuredStatus: 'active',
      authenticationContextId: 'authctx-example',
      principal: {
        status: 'VERIFIED',
        observedAt: NOW,
        freshness: 'CURRENT',
        login: 'example-user',
        githubUserId: 42,
        accountType: 'user',
        reasonCode: null
      },
      accountVerified: true
    }],
    observedAt: NOW
  } as any;
}

function repositoryInput(identity = resolveGithubIdentity(identityInput())) {
  return {
    identity,
    identityAuthenticationContextId: 'authctx-example',
    requestedRepositoryContext: 'ExampleOrg/api',
    registry: {
      available: true,
      schemaVersion: 1,
      mappings: [{ githubOwner: 'ExampleOrg', githubRepo: 'api' }],
      digest: 'registry-v1'
    },
    repositoryObservation: {
      status: 'VERIFIED',
      observedAt: NOW,
      freshness: 'CURRENT',
      requestedFullName: 'ExampleOrg/api',
      repository: {
        githubRepositoryId: 101,
        owner: 'ExampleOrg',
        ownerType: 'organization',
        name: 'api',
        fullName: 'ExampleOrg/api',
        defaultBranch: 'main',
        visibility: 'private',
        archived: false,
        fork: false
      },
      reasonCode: null
    },
    observedAt: NOW
  } as any;
}

function projectInput(repository = resolveGithubRepository(repositoryInput())) {
  return {
    repository,
    registry: {
      available: true,
      sourceSchemaVersion: 1,
      digest: 'registry-v1',
      candidateDigest: 'registry-v2-candidate',
      mappings: [{
        mappingId: 'example-api',
        repositoryId: 'github:ExampleOrg/api',
        projectId: 'example.platform',
        projectUid: 'EXAMPLE-001',
        componentRole: 'API'
      }],
      projects: [{
        projectId: 'example.platform',
        projectUid: 'EXAMPLE-001',
        name: 'Example Platform',
        kind: 'MULTI_REPOSITORY_APPLICATION',
        repositoryComponents: [
          { repositoryId: 'github:ExampleOrg/api', mappingId: 'example-api', role: 'API' },
          { repositoryId: 'github:ExampleOrg/web', mappingId: 'example-web', role: 'FRONTEND' }
        ]
      }],
      activationReadiness: [{
        mappingId: 'example-api',
        status: 'BLOCKED',
        reasonCodes: ['REPOSITORY_CREDENTIAL_UNVERIFIED']
      }]
    },
    observedAt: NOW
  } as any;
}

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

async function adapters() {
  return import('../src/governedWorkflow/resolvers/githubResolvers.js');
}

test('GWC-3 closes the real CI gap by executing githubRepositoryResolution.test.ts', async () => {
  const pkg = JSON.parse(await readFile('package.json', 'utf8'));
  assert.match(pkg.scripts['test:readonly-safety'], /tests\/githubRepositoryResolution\.test\.ts/);
});

test('GW-04 wrapper is exact-parity with resolveGithubIdentity and never infers authorization', async () => {
  const input = identityInput();
  const direct = resolveGithubIdentity(input);
  const { resolveGw04GithubIdentity } = await adapters();
  const wrapped = resolveGw04GithubIdentity(input, await substrate());

  assert.deepEqual(wrapped.payload, direct);
  assert.deepEqual(wrapped.contract, { stepId: 'GW-04', contractVersion: 1 });
  assert.equal(wrapped.status, direct.status);
  assert.equal(wrapped.freshness, direct.freshness);
  assert.deepEqual(wrapped.reasonCodes, direct.reasonCodes);
  assert.deepEqual(wrapped.provenance, direct.provenance);
  assert.equal(wrapped.authorizationInferred, false);
});

test('GW-05 wrapper is exact-parity with resolveGithubRepository including fail-closed freshness', async () => {
  const input = repositoryInput();
  const direct = resolveGithubRepository(input);
  const { resolveGw05Repository } = await adapters();
  const wrapped = resolveGw05Repository(input, await substrate());
  assert.deepEqual(wrapped.payload, direct);
  assert.deepEqual(wrapped.contract, { stepId: 'GW-05', contractVersion: 1 });
  assert.equal(wrapped.freshness, direct.freshness);
  assert.deepEqual(wrapped.reasonCodes, direct.reasonCodes);

  const staleInput = repositoryInput({
    ...resolveGithubIdentity(identityInput()),
    freshness: 'STALE'
  } as any);
  const staleDirect = resolveGithubRepository(staleInput);
  const staleWrapped = resolveGw05Repository(staleInput, await substrate());
  assert.deepEqual(staleWrapped.payload, staleDirect);
  assert.equal(staleWrapped.status, 'UNVERIFIED');
  assert.notEqual(staleWrapped.freshness, 'CURRENT');
});

test('GW-06 wrapper preserves project identity, component role and activation-readiness separation', async () => {
  const input = projectInput();
  const direct = resolveGithubProject(input);
  const { resolveGw06Project } = await adapters();
  const wrapped = resolveGw06Project(input, await substrate());

  assert.deepEqual(wrapped.payload, direct);
  assert.deepEqual(wrapped.contract, { stepId: 'GW-06', contractVersion: 1 });
  assert.equal(wrapped.payload.selectedMapping?.projectUid, 'EXAMPLE-001');
  assert.equal(wrapped.payload.selectedMapping?.componentRole, 'API');
  assert.equal(wrapped.payload.selectedMapping?.activationReadiness, 'BLOCKED');
  assert.equal(wrapped.status, 'RESOLVED');
  assert.equal(wrapped.authorizationInferred, false);
});

test('GWC-3 adapters add only orchestration metadata and no MCP-specific target or permission surface', async () => {
  const { resolveGw04GithubIdentity, resolveGw05Repository, resolveGw06Project } = await adapters();
  const contracts = await substrate();
  const values = [
    resolveGw04GithubIdentity(identityInput(), contracts),
    resolveGw05Repository(repositoryInput(), contracts),
    resolveGw06Project(projectInput(), contracts)
  ];
  for (const value of values) {
    const ownKeys = Object.keys(value).sort();
    assert.deepEqual(ownKeys, [
      'authorizationInferred',
      'contract',
      'freshness',
      'observedAt',
      'payload',
      'provenance',
      'reasonCodes',
      'status'
    ]);
    const metadata = JSON.stringify({ ...value, payload: undefined });
    for (const forbidden of [
      'Patricked-code/MCP',
      'permission',
      'mayWrite',
      'mayDeploy',
      'PROJECT_SHA',
      'credentialRef'
    ]) {
      assert.equal(metadata.includes(forbidden), false, forbidden);
    }
  }
});

function serverInput(overrides: Record<string, unknown> = {}) {
  return {
    project: resolveGithubProject(projectInput()),
    registry: {
      available: true,
      freshness: 'CURRENT',
      digest: 'b'.repeat(64),
      candidateDigest: 'c'.repeat(64),
      mappings: [
        {
          mappingId: 'example-api',
          repositoryId: 'github:ExampleOrg/api',
          projectId: 'example.platform',
          projectUid: 'EXAMPLE-001',
          componentRole: 'API',
          serverId: 'S2',
          serverPath: '/srv/example/api',
          realPath: '/srv/example/api',
          realPathVerified: true,
          environment: 'production'
        },
        {
          mappingId: 'example-web',
          repositoryId: 'github:ExampleOrg/web',
          projectId: 'example.platform',
          projectUid: 'EXAMPLE-001',
          componentRole: 'FRONTEND',
          serverId: 's2',
          serverPath: '/srv/example/web',
          realPath: null,
          realPathVerified: false,
          environment: 'production'
        }
      ]
    },
    canonicalServerIds: ['s1', 's2'],
    serverHint: null,
    observedAt: NOW,
    ...overrides
  } as any;
}

async function serverResolver() {
  return import('../src/governedWorkflow/resolvers/server.js');
}

test('GWC-6 RED: GW-07 canonicalizes registry server aliases only against explicit managed-server ids', async () => {
  const { resolveServer } = await serverResolver();
  const resolved = resolveServer(serverInput());

  assert.equal(resolved.status, 'RESOLVED');
  assert.equal(resolved.selectedServer?.serverId, 's2');
  assert.deepEqual(resolved.selectedServer?.rawServerIds, ['S2', 's2']);
  assert.equal(resolved.selectedServer?.environment, 'production');
  assert.deepEqual(
    resolved.selectedServer?.bindings.map((entry: any) => entry.mappingId),
    ['example-api', 'example-web']
  );
  assert.equal(resolved.candidateCount, 1);
  assert.equal(resolved.registryDigest, 'b'.repeat(64));
  assert.equal(resolved.candidateDigest, 'c'.repeat(64));
  assert.equal(resolved.mutationPerformed, false);
  assert.equal(resolved.sshMutationPerformed, false);
});

test('GWC-6 OD-03 preserves a canonical lowercase server id and raw registry evidence', async () => {
  const { resolveServer } = await serverResolver();
  const resolved = resolveServer(serverInput({
    registry: {
      ...serverInput().registry,
      mappings: [{
        mappingId: 'example-api',
        repositoryId: 'github:ExampleOrg/api',
        projectId: 'example.platform',
        projectUid: 'EXAMPLE-001',
        componentRole: 'API',
        serverId: 's1',
        serverPath: '/srv/example/api',
        realPath: null,
        realPathVerified: false,
        environment: 'production'
      }]
    }
  }));

  assert.equal(resolved.status, 'RESOLVED');
  assert.equal(resolved.selectedServer?.serverId, 's1');
  assert.deepEqual(resolved.selectedServer?.rawServerIds, ['s1']);
});

test('GWC-6 fails closed when a registry server id is not backed by the explicit canonical server set', async () => {
  const { resolveServer } = await serverResolver();
  const resolved = resolveServer(serverInput({
    registry: {
      ...serverInput().registry,
      mappings: [{
        ...serverInput().registry.mappings[0],
        serverId: 'S9'
      }]
    }
  }));

  assert.equal(resolved.status, 'UNVERIFIED');
  assert.equal(resolved.selectedServer, null);
  assert.deepEqual(resolved.reasonCodes, ['SERVER_ID_UNVERIFIED']);
  assert.equal(resolved.authorizationInferred, false);
});

test('GWC-6 returns AMBIGUOUS for multiple canonical server identities and uses a verified hint only to disambiguate', async () => {
  const { resolveServer } = await serverResolver();
  const registry = {
    ...serverInput().registry,
    mappings: [
      serverInput().registry.mappings[0],
      {
        ...serverInput().registry.mappings[1],
        serverId: 's1'
      }
    ]
  };

  const ambiguous = resolveServer(serverInput({ registry }));
  assert.equal(ambiguous.status, 'AMBIGUOUS');
  assert.equal(ambiguous.candidateCount, 2);
  assert.deepEqual(
    ambiguous.candidates.map((entry: any) => entry.serverId),
    ['s1', 's2']
  );

  const hinted = resolveServer(serverInput({ registry, serverHint: 'S2' }));
  assert.equal(hinted.status, 'RESOLVED');
  assert.equal(hinted.selectedServer?.serverId, 's2');
  assert.ok(hinted.provenance.includes('explicit_server_hint'));
});

test('GWC-6 keeps unavailable/stale registry evidence fail-closed and never upgrades freshness', async () => {
  const { resolveServer } = await serverResolver();

  const unavailable = resolveServer(serverInput({
    registry: {
      available: false,
      freshness: 'UNKNOWN',
      digest: null,
      candidateDigest: null,
      mappings: []
    }
  }));
  assert.equal(unavailable.status, 'UNVERIFIED');
  assert.equal(unavailable.freshness, 'UNKNOWN');
  assert.deepEqual(unavailable.reasonCodes, ['SERVER_REGISTRY_UNAVAILABLE']);

  const stale = resolveServer(serverInput({
    registry: {
      ...serverInput().registry,
      freshness: 'STALE'
    }
  }));
  assert.equal(stale.status, 'UNVERIFIED');
  assert.equal(stale.freshness, 'STALE');
  assert.deepEqual(stale.reasonCodes, ['SERVER_EVIDENCE_STALE']);
});

test('GWC-6 rejects a known server hint that is not bound to the resolved project', async () => {
  const { resolveServer } = await serverResolver();
  const resolved = resolveServer(serverInput({
    registry: {
      ...serverInput().registry,
      mappings: [serverInput().registry.mappings[0]]
    },
    serverHint: 's1'
  }));

  assert.equal(resolved.status, 'NONE');
  assert.equal(resolved.selectedServer, null);
  assert.deepEqual(resolved.reasonCodes, ['SERVER_HINT_NOT_BOUND']);
});

test('GW-07 wrapper binds the canonical contract and adds no authorization or mutation semantics', async () => {
  const { resolveGw07Server } = await serverResolver();
  const wrapped = resolveGw07Server(serverInput(), await substrate());

  assert.deepEqual(wrapped.contract, { stepId: 'GW-07', contractVersion: 1 });
  assert.equal(wrapped.status, 'RESOLVED');
  assert.equal(wrapped.payload.selectedServer?.serverId, 's2');
  assert.equal(wrapped.authorizationInferred, false);
  assert.equal(wrapped.mutationPerformed, false);
  assert.equal(wrapped.sshMutationPerformed, false);
  assert.equal(wrapped.replayModel, 'READ_ONLY');
  assert.equal(JSON.stringify(wrapped).includes('privateKey'), false);
  assert.equal(JSON.stringify(wrapped).includes('credentialRef'), false);
});

test('GWC-6 server resolution is deterministic and server paths never become identity', async () => {
  const { resolveServer } = await serverResolver();
  const input = serverInput({
    registry: {
      ...serverInput().registry,
      mappings: [
        {
          ...serverInput().registry.mappings[0],
          serverId: 'S2',
          serverPath: '/different/a',
          realPath: '/canonical/a'
        },
        {
          ...serverInput().registry.mappings[1],
          serverId: 's2',
          serverPath: '/different/b',
          realPath: '/canonical/b'
        }
      ]
    }
  });
  const first = resolveServer(input);
  const second = resolveServer(input);

  assert.deepEqual(first, second);
  assert.equal(first.status, 'RESOLVED');
  assert.equal(first.candidateCount, 1);
  assert.equal(first.selectedServer?.serverId, 's2');
  assert.equal(first.selectedServer?.bindings.length, 2);
});
