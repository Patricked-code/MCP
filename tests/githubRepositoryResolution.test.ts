import assert from 'node:assert/strict';
import test from 'node:test';

import {
  resolveGithubRepository,
  type DurableGithubRepositoryObservation,
  type GithubRepositoryResolutionInput
} from '../src/github/repositoryResolution.js';
import type { GithubIdentityResolution } from '../src/github/identityResolution.js';

const observedAt = '2026-09-11T17:45:00.000Z';

function identity(
  overrides: Partial<GithubIdentityResolution> = {}
): GithubIdentityResolution {
  return {
    status: 'RESOLVED',
    observedAt,
    bindingId: 'binding-current-mcp',
    oauthPrincipalId: 'oauth:wealthtech-mcp-admin',
    repositoryContext: 'Patricked-code/MCP',
    authenticatedPrincipal: {
      provider: 'github', login: 'Patricked-code', accountType: 'user', githubUserId: 270385782
    },
    selectedAccountContext: {
      owner: 'Patricked-code', type: 'user', source: 'durable_account'
    },
    accessibleAccountContexts: [
      { owner: 'Patricked-code', type: 'user', verified: true }
    ],
    freshness: 'CURRENT',
    provenance: ['identity_policy', 'durable_accounts', 'github_api:get_user'],
    reasonCodes: [],
    policyDigest: 'policy-digest',
    ...overrides
  };
}

function proof(
  overrides: Partial<DurableGithubRepositoryObservation> = {}
): DurableGithubRepositoryObservation {
  return {
    status: 'VERIFIED',
    observedAt,
    freshness: 'CURRENT',
    requestedFullName: 'Patricked-code/MCP',
    repository: {
      githubRepositoryId: 1285534440,
      owner: 'Patricked-code',
      ownerType: 'user',
      name: 'MCP',
      fullName: 'Patricked-code/MCP',
      defaultBranch: 'main',
      visibility: 'public',
      archived: false,
      fork: false
    },
    reasonCode: null,
    ...overrides
  };
}

function input(
  overrides: Partial<GithubRepositoryResolutionInput> = {}
): GithubRepositoryResolutionInput {
  return {
    identity: identity(),
    identityAuthenticationContextId: 'durable-authentication-context-1',
    requestedRepositoryContext: 'Patricked-code/MCP',
    registry: {
      available: true,
      schemaVersion: 1,
      mappings: [],
      digest: 'registry-digest'
    },
    repositoryObservation: proof(),
    observedAt,
    ...overrides
  };
}

test('résout le dépôt exact avec identité B1 courante et preuve live correspondante', () => {
  const result = resolveGithubRepository(input());
  assert.equal(result.status, 'RESOLVED');
  assert.equal(result.selectionSource, 'connection_context');
  assert.deepEqual(result.selectedRepository, {
    repositoryId: 'github:Patricked-code/MCP',
    githubRepositoryId: 1285534440,
    owner: 'Patricked-code',
    ownerType: 'user',
    name: 'MCP',
    fullName: 'Patricked-code/MCP',
    defaultBranch: 'main',
    visibility: 'public',
    archived: false,
    fork: false
  });
  assert.equal(result.freshness, 'CURRENT');
  assert.deepEqual(result.reasonCodes, []);
});

test('compare owner/name sans tenir compte de la casse et conserve la casse GitHub', () => {
  const result = resolveGithubRepository(input({
    requestedRepositoryContext: 'patricked-CODE/mcp'
  }));
  assert.equal(result.status, 'RESOLVED');
  assert.equal(result.selectedRepository?.fullName, 'Patricked-code/MCP');
});

test('propage B1 AMBIGUOUS sans observation repository', () => {
  const result = resolveGithubRepository(input({
    identity: identity({ status: 'AMBIGUOUS', freshness: 'UNKNOWN' }),
    repositoryObservation: null
  }));
  assert.equal(result.status, 'AMBIGUOUS');
  assert.deepEqual(result.reasonCodes, ['GITHUB_REPOSITORY_IDENTITY_AMBIGUOUS']);
});

for (const status of ['NONE', 'UNVERIFIED'] as const) {
  test(`B1 ${status} demeure fail-closed`, () => {
    const result = resolveGithubRepository(input({
      identity: identity({ status, freshness: 'UNKNOWN' }),
      repositoryObservation: null
    }));
    assert.equal(result.status, 'UNVERIFIED');
    assert.deepEqual(result.reasonCodes, ['GITHUB_REPOSITORY_IDENTITY_UNVERIFIED']);
  });
}

test('une identité B1 périmée demeure fail-closed', () => {
  const result = resolveGithubRepository(input({
    identity: identity({ freshness: 'STALE' }), repositoryObservation: null
  }));
  assert.equal(result.status, 'UNVERIFIED');
  assert.deepEqual(result.reasonCodes, ['GITHUB_REPOSITORY_IDENTITY_UNVERIFIED']);
});

test('refuse un candidat appartenant à un autre compte que le contexte B1', () => {
  const result = resolveGithubRepository(input({
    requestedRepositoryContext: 'chainsolutions-wealthtech/MCP',
    repositoryObservation: null
  }));
  assert.equal(result.status, 'UNVERIFIED');
  assert.deepEqual(result.reasonCodes, ['GITHUB_REPOSITORY_ACCOUNT_CONTEXT_MISMATCH']);
});

test('refuse une résolution sans corrélation au contexte authentifié B1', () => {
  const result = resolveGithubRepository(input({
    identityAuthenticationContextId: null, repositoryObservation: null
  }));
  assert.equal(result.status, 'UNVERIFIED');
  assert.deepEqual(result.reasonCodes, ['GITHUB_REPOSITORY_AUTHENTICATION_CONTEXT_UNAVAILABLE']);
});

test('rejette un contexte exact invalide sans tenter le registre', () => {
  const result = resolveGithubRepository(input({
    requestedRepositoryContext: 'https://github.com/Patricked-code/MCP',
    repositoryObservation: null
  }));
  assert.equal(result.status, 'UNVERIFIED');
  assert.deepEqual(result.reasonCodes, ['GITHUB_REPOSITORY_CONTEXT_INVALID']);
});

test('retourne NONE quand aucun contexte exact ni candidat V1 compatible existe', () => {
  const result = resolveGithubRepository(input({
    requestedRepositoryContext: null,
    repositoryObservation: null
  }));
  assert.equal(result.status, 'NONE');
  assert.deepEqual(result.reasonCodes, ['GITHUB_REPOSITORY_CANDIDATE_NOT_FOUND']);
});

test('un registre indisponible ne signifie jamais aucun dépôt', () => {
  const result = resolveGithubRepository(input({
    requestedRepositoryContext: null,
    registry: { available: false, schemaVersion: 1, mappings: [], digest: null },
    repositoryObservation: null
  }));
  assert.equal(result.status, 'UNVERIFIED');
  assert.deepEqual(result.reasonCodes, ['GITHUB_REPOSITORY_REGISTRY_UNAVAILABLE']);
});

test('déduplique et trie les mappings V1, puis résout un candidat unique', () => {
  const result = resolveGithubRepository(input({
    requestedRepositoryContext: null,
    registry: {
      available: true,
      schemaVersion: 1,
      digest: 'registry-digest',
      mappings: [
        { githubOwner: 'Patricked-code', githubRepo: 'mcp' },
        { githubOwner: 'patricked-code', githubRepo: 'MCP' }
      ]
    }
  }));
  assert.equal(result.status, 'RESOLVED');
  assert.equal(result.selectionSource, 'git_registry');
  assert.equal(result.candidateCount, 1);
  assert.deepEqual(result.candidates, [{
    repositoryId: 'github:Patricked-code/mcp',
    fullName: 'Patricked-code/mcp',
    source: 'git_registry'
  }]);
});

test('plusieurs candidats V1 compatibles sont AMBIGUOUS, triés et bornés', () => {
  const mappings = Array.from({ length: 24 }, (_, index) => ({
    githubOwner: index % 2 ? 'patricked-code' : 'Patricked-code',
    githubRepo: `Repo-${String(24 - index).padStart(2, '0')}`
  }));
  const result = resolveGithubRepository(input({
    requestedRepositoryContext: null,
    registry: { available: true, schemaVersion: 1, mappings, digest: 'registry-digest' },
    repositoryObservation: null
  }));
  assert.equal(result.status, 'AMBIGUOUS');
  assert.equal(result.candidateCount, 24);
  assert.equal(result.candidates.length, 20);
  assert.deepEqual(
    result.candidates.map((candidate) => candidate.fullName),
    [...result.candidates.map((candidate) => candidate.fullName)].sort((a, b) => (
      a.toLowerCase().localeCompare(b.toLowerCase())
    ))
  );
});

test('une preuve canonique discordante est invalide', () => {
  const result = resolveGithubRepository(input({
    repositoryObservation: proof({
      repository: {
        ...proof().repository!,
        name: 'Other', fullName: 'Patricked-code/Other'
      }
    })
  }));
  assert.equal(result.status, 'UNVERIFIED');
  assert.deepEqual(result.reasonCodes, ['GITHUB_REPOSITORY_RESPONSE_INVALID']);
});

const failedEvidence = [
  ['NOT_FOUND_OR_INVISIBLE', 'GITHUB_REPOSITORY_NOT_FOUND_OR_INVISIBLE'],
  ['AUTH_INVALID', 'GITHUB_REPOSITORY_AUTH_INVALID'],
  ['PERMISSION_DENIED', 'GITHUB_REPOSITORY_PERMISSION_DENIED'],
  ['UNAVAILABLE', 'GITHUB_REPOSITORY_API_UNAVAILABLE'],
  ['MALFORMED', 'GITHUB_REPOSITORY_RESPONSE_INVALID']
] as const;

for (const [status, reason] of failedEvidence) {
  test(`la preuve ${status} devient UNVERIFIED`, () => {
    const result = resolveGithubRepository(input({
      repositoryObservation: proof({ status, repository: null, reasonCode: reason })
    }));
    assert.equal(result.status, 'UNVERIFIED');
    assert.deepEqual(result.reasonCodes, [reason]);
    if (status === 'NOT_FOUND_OR_INVISIBLE') {
      assert.deepEqual(result.uncertainties, ['GITHUB_REPOSITORY_VISIBILITY_UNCERTAIN']);
    }
  });
}

test('une preuve absente ou de fraîcheur inconnue reste UNVERIFIED', () => {
  assert.equal(resolveGithubRepository(input({ repositoryObservation: null })).status, 'UNVERIFIED');
  const stale = resolveGithubRepository(input({
    repositoryObservation: proof({ freshness: 'UNKNOWN' })
  }));
  assert.equal(stale.status, 'UNVERIFIED');
  assert.deepEqual(stale.reasonCodes, ['GITHUB_REPOSITORY_EVIDENCE_STALE']);
});

test('la projection B2 ne contient aucun champ de permission ou de déploiement', () => {
  const serialized = JSON.stringify(resolveGithubRepository(input()));
  for (const forbidden of ['permissions', 'grants', 'mayWrite', 'mayDeploy', 'deployEnabled']) {
    assert.equal(serialized.includes(forbidden), false);
  }
});
