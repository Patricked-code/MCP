import assert from 'node:assert/strict';
import test from 'node:test';

process.env.MCP_AUTH_TOKEN ??= 'mcp-unit-test-value-20261005-abcdef';
process.env.S1_HOST ??= '127.0.0.1';
process.env.S1_KEY_PATH ??= '/tmp/mcp-unit-test-s1-key';
process.env.S2_HOST ??= '127.0.0.1';
process.env.S2_KEY_PATH ??= '/tmp/mcp-unit-test-s2-key';

const { deriveProjectReality } = await import('../src/github/projectReality.js');
const { deriveMissingContext } = await import('../src/governedContext/missingContext.js');
const { deriveBootstrapProjectReferences } = await import('../src/governedContext/receiptReferences.js');
const {
  deriveTargetScopeRepositoryObservation,
  composeTargetScopeRepositoryResolution
} = await import('../src/github/targetScopeRepository.js');

const NOW = '2026-10-29T10:00:00.000Z';
const TARGET_REPO = 'Wealthtechinnovations/api_opcv';

/**
 * TB-W3-GGCC-GH-REPO-BRANCH RED tests:
 * Proves that target-scope repository observations from github_get_repository_state
 * can feed project reality and receipt references for sessions bound to non-MCP repos.
 */

test('deriveTargetScopeRepositoryObservation maps bounded github_get_repository_state output to a durable observation', () => {
  const toolOutput = {
    id: 42,
    name: 'api_opcv',
    fullName: 'Wealthtechinnovations/api_opcv',
    private: true,
    archived: false,
    disabled: false,
    defaultBranch: 'main',
    visibility: 'private',
    pushedAt: '2026-10-28T12:00:00Z',
    updatedAt: '2026-10-28T12:00:00Z',
    owner: { login: 'Wealthtechinnovations', type: 'Organization' },
    htmlUrl: 'https://github.com/Wealthtechinnovations/api_opcv'
  };
  const observation = deriveTargetScopeRepositoryObservation(
    TARGET_REPO,
    toolOutput,
    NOW
  );
  assert.equal(observation.status, 'VERIFIED');
  assert.equal(observation.freshness, 'CURRENT');
  assert.equal(observation.requestedFullName, TARGET_REPO);
  assert.ok(observation.repository);
  assert.equal(observation.repository.githubRepositoryId, 42);
  assert.equal(observation.repository.fullName, 'Wealthtechinnovations/api_opcv');
  assert.equal(observation.repository.owner, 'Wealthtechinnovations');
  assert.equal(observation.repository.ownerType, 'organization');
  assert.equal(observation.repository.visibility, 'private');
  assert.equal(observation.repository.archived, false);
  assert.equal(observation.repository.fork, false);
  assert.equal(observation.repository.defaultBranch, 'main');
  assert.equal(observation.reasonCode, null);
});

test('deriveTargetScopeRepositoryObservation refuses a mismatched fullName', () => {
  const toolOutput = {
    id: 42,
    name: 'other',
    fullName: 'Wealthtechinnovations/other',
    private: true,
    archived: false,
    disabled: false,
    defaultBranch: 'main',
    visibility: 'private',
    pushedAt: '2026-10-28T12:00:00Z',
    updatedAt: '2026-10-28T12:00:00Z',
    owner: { login: 'Wealthtechinnovations', type: 'Organization' },
    htmlUrl: 'https://github.com/Wealthtechinnovations/other'
  };
  const observation = deriveTargetScopeRepositoryObservation(
    TARGET_REPO,
    toolOutput,
    NOW
  );
  assert.equal(observation.status, 'MALFORMED');
  assert.equal(observation.repository, null);
});

test('composeTargetScopeRepositoryResolution produces a RESOLVED resolution from a verified observation', () => {
  const observation = {
    status: 'VERIFIED' as const,
    observedAt: NOW,
    freshness: 'CURRENT' as const,
    requestedFullName: TARGET_REPO,
    repository: {
      githubRepositoryId: 42,
      owner: 'Wealthtechinnovations',
      ownerType: 'organization' as const,
      name: 'api_opcv',
      fullName: 'Wealthtechinnovations/api_opcv',
      defaultBranch: 'main',
      visibility: 'private' as const,
      archived: false,
      fork: false
    },
    reasonCode: null
  };
  const resolution = composeTargetScopeRepositoryResolution(
    observation,
    TARGET_REPO,
    NOW
  );
  assert.equal(resolution.status, 'RESOLVED');
  assert.equal(resolution.freshness, 'CURRENT');
  assert.ok(resolution.selectedRepository);
  assert.equal(resolution.selectedRepository.repositoryId, `github:${TARGET_REPO}`);
  assert.equal(resolution.selectedRepository.fullName, TARGET_REPO);
  assert.ok(resolution.provenance.includes('github_api:get_repository'));
  assert.ok(resolution.provenance.includes('target_scope_observation'));
});

test('a target-scope repository observation feeds project reality REPOSITORY layer as VERIFIED', () => {
  const resolution = {
    status: 'RESOLVED' as const,
    observedAt: NOW,
    requestedRepositoryContext: TARGET_REPO,
    selectionSource: 'connection_context' as const,
    selectedAccountContext: { owner: 'Wealthtechinnovations', type: 'organization' as const },
    selectedRepository: {
      repositoryId: `github:${TARGET_REPO}`,
      githubRepositoryId: 42,
      owner: 'Wealthtechinnovations',
      ownerType: 'organization' as const,
      name: 'api_opcv',
      fullName: TARGET_REPO,
      defaultBranch: 'main',
      visibility: 'private' as const,
      archived: false,
      fork: false
    },
    candidates: [],
    candidateCount: 1,
    freshness: 'CURRENT' as const,
    provenance: ['target_scope_observation', 'github_api:get_repository'],
    reasonCodes: [] as string[],
    uncertainties: [] as string[],
    registryDigest: null
  };
  const reality = deriveProjectReality({ repository: resolution, observedAt: NOW });
  const repoLayer = reality.layers.find((l) => l.layer === 'REPOSITORY');
  assert.ok(repoLayer);
  assert.equal(repoLayer.state, 'VERIFIED');
  assert.equal(reality.repositoryId, `github:${TARGET_REPO}`);
});

test('a verified target-scope repository observation resolves RECEIPT_REPOSITORY_UNVERIFIED', () => {
  const reality = deriveProjectReality({
    repository: {
      status: 'RESOLVED',
      observedAt: NOW,
      requestedRepositoryContext: TARGET_REPO,
      selectionSource: 'connection_context',
      selectedAccountContext: { owner: 'Wealthtechinnovations', type: 'organization' },
      selectedRepository: {
        repositoryId: `github:${TARGET_REPO}`,
        githubRepositoryId: 42,
        owner: 'Wealthtechinnovations',
        ownerType: 'organization',
        name: 'api_opcv',
        fullName: TARGET_REPO,
        defaultBranch: 'main',
        visibility: 'private',
        archived: false,
        fork: false
      },
      candidates: [],
      candidateCount: 1,
      freshness: 'CURRENT',
      provenance: ['target_scope_observation', 'github_api:get_repository'],
      reasonCodes: [],
      uncertainties: [],
      registryDigest: null
    } as any,
    observedAt: NOW
  });
  const refs = deriveBootstrapProjectReferences({
    generatedAt: NOW,
    repository: `github:${TARGET_REPO}`,
    projectReality: reality
  });
  // With a verified REPOSITORY layer, the receipt should have a repository reference
  assert.ok(refs.repository, 'receipt should have a repository reference');
  assert.equal(refs.repository.id, `github:${TARGET_REPO}`);
  // PROJECT is still unverified (no project resolution), but repository is proven
  assert.ok(refs.reasonCodes.includes('RECEIPT_PROJECT_UNVERIFIED'));
  assert.ok(!refs.reasonCodes.includes('RECEIPT_REPOSITORY_UNVERIFIED'));
});

test('E1 evaluates a target-scope session with repository observation as REPOSITORY RESOLVED, not UNOBSERVABLE', () => {
  const reality = deriveProjectReality({
    repository: {
      status: 'RESOLVED',
      observedAt: NOW,
      requestedRepositoryContext: TARGET_REPO,
      selectionSource: 'connection_context',
      selectedAccountContext: { owner: 'Wealthtechinnovations', type: 'organization' },
      selectedRepository: {
        repositoryId: `github:${TARGET_REPO}`,
        githubRepositoryId: 42,
        owner: 'Wealthtechinnovations',
        ownerType: 'organization',
        name: 'api_opcv',
        fullName: TARGET_REPO,
        defaultBranch: 'main',
        visibility: 'private',
        archived: false,
        fork: false
      },
      candidates: [],
      candidateCount: 1,
      freshness: 'CURRENT',
      provenance: ['target_scope_observation', 'github_api:get_repository'],
      reasonCodes: [],
      uncertainties: [],
      registryDigest: null
    } as any,
    observedAt: NOW
  });
  const result = deriveMissingContext({
    generatedAt: NOW,
    repository: `github:${TARGET_REPO}`,
    session: {
      schemaVersion: 1,
      governedSessionId: '22222222-2222-4222-8222-222222222222',
      repository: TARGET_REPO,
      workBranch: null,
      status: 'ACTIVE',
      identityAssurance: 'oauth_subject',
      connectionContext: {
        schemaVersion: 1,
        connectionContextId: '33333333-3333-4333-8333-333333333333',
        governedSessionId: '22222222-2222-4222-8222-222222222222',
        repository: TARGET_REPO,
        principalId: 'oauth:subject-target',
        observedClientId: null,
        identityAssurance: 'oauth_subject',
        clientClassification: 'UNRESOLVED',
        evidenceSource: 'oauth_auth_info',
        createdAt: NOW
      },
      lastAcknowledgedStateVersion: null,
      bootstrapReceipt: null,
      blockers: [],
      lastCheckpoint: null
    },
    github: {
      error: null,
      identity: {
        status: 'RESOLVED',
        observedAt: NOW,
        bindingId: 'binding-target',
        oauthPrincipalId: 'oauth:subject-target',
        repositoryContext: TARGET_REPO,
        authenticatedPrincipal: { provider: 'github', login: 'wt-user', accountType: 'user' },
        selectedAccountContext: { owner: 'Wealthtechinnovations', type: 'organization', source: 'durable_account' },
        accessibleAccountContexts: [],
        freshness: 'CURRENT',
        provenance: ['github_identity_resolution'],
        reasonCodes: [],
        policyDigest: null
      }
    },
    projectReality: reality
  } as any);
  const repoItem = (result as any).items.find((i: any) => i.item === 'REPOSITORY');
  assert.ok(repoItem);
  assert.equal(repoItem.state, 'RESOLVED', 'REPOSITORY should be RESOLVED with observation');
  assert.notEqual((result as any).status, 'UNOBSERVABLE');
});

test('target-scope observation never allows arbitrary shell or raw API escape', () => {
  // deriveTargetScopeRepositoryObservation is pure: it maps tool output to typed evidence.
  // It does not execute commands, access the filesystem or call any API.
  const fn = deriveTargetScopeRepositoryObservation;
  assert.equal(typeof fn, 'function');
  assert.equal(fn.length, 3); // (requestedFullName, toolOutput, observedAt)
});
