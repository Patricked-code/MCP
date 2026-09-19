import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { resolveGithubIdentity } from '../src/github/identityResolution.js';
import { resolveGithubRepository } from '../src/github/repositoryResolution.js';
import { resolveGithubProject } from '../src/github/projectResolution.js';

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
  const wrapped = resolveGw04GithubIdentity(input);

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
  const wrapped = resolveGw05Repository(input);
  assert.deepEqual(wrapped.payload, direct);
  assert.deepEqual(wrapped.contract, { stepId: 'GW-05', contractVersion: 1 });
  assert.equal(wrapped.freshness, direct.freshness);
  assert.deepEqual(wrapped.reasonCodes, direct.reasonCodes);

  const staleInput = repositoryInput({
    ...resolveGithubIdentity(identityInput()),
    freshness: 'STALE'
  } as any);
  const staleDirect = resolveGithubRepository(staleInput);
  const staleWrapped = resolveGw05Repository(staleInput);
  assert.deepEqual(staleWrapped.payload, staleDirect);
  assert.equal(staleWrapped.status, 'UNVERIFIED');
  assert.notEqual(staleWrapped.freshness, 'CURRENT');
});

test('GW-06 wrapper preserves project identity, component role and activation-readiness separation', async () => {
  const input = projectInput();
  const direct = resolveGithubProject(input);
  const { resolveGw06Project } = await adapters();
  const wrapped = resolveGw06Project(input);

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
  const values = [
    resolveGw04GithubIdentity(identityInput()),
    resolveGw05Repository(repositoryInput()),
    resolveGw06Project(projectInput())
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
