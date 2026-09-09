import assert from 'node:assert/strict';
import test from 'node:test';

process.env.MCP_AUTH_TOKEN ??= 'mcp-unit-test-value-20260805-abcdef';
process.env.S1_HOST ??= '127.0.0.1';
process.env.S1_KEY_PATH ??= '/tmp/mcp-unit-test-s1-key';
process.env.S2_HOST ??= '127.0.0.1';
process.env.S2_KEY_PATH ??= '/tmp/mcp-unit-test-s2-key';

const { observeGithubAuthenticatedPrincipal } = await import(
  '../src/github/connection.js'
);
const { collectDurableGithubIdentityObservations } = await import(
  '../src/tools/durableAccounts.js'
);

const NOW = '2026-09-07T21:00:00.000Z';

function json(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'content-type': 'application/json' }
  });
}

test('GET /user produit une preuve de principal GitHub bornée sans secret ni permission', async () => {
  const calls: Array<{ url: string; authorization: string | null }> = [];
  const result = await observeGithubAuthenticatedPrincipal('sensitive-token-never-returned', {
    fetchImpl: async (input, init) => {
      calls.push({
        url: String(input),
        authorization: new Headers(init?.headers).get('authorization')
      });
      return json({ login: 'Patricked-code', id: 270385782, type: 'User' });
    },
    apiBase: 'https://api.github.test',
    allowedHosts: 'api.github.test',
    now: () => new Date(NOW),
    timeoutMs: 1_000
  });

  assert.deepEqual(result, {
    status: 'VERIFIED',
    observedAt: NOW,
    freshness: 'CURRENT',
    login: 'Patricked-code',
    githubUserId: 270385782,
    accountType: 'user',
    reasonCode: null
  });
  assert.equal(calls.length, 1);
  assert.match(calls[0]?.url ?? '', /\/user$/);
  assert.equal(calls[0]?.authorization, 'Bearer sensitive-token-never-returned');
  const serialized = JSON.stringify(result);
  for (const forbidden of ['sensitive-token', 'oauthScopes', 'permissions', 'mayWrite']) {
    assert.equal(serialized.includes(forbidden), false);
  }
});

test('la preuve /user échoue fermé et ne propage pas les erreurs ou réponses sensibles', async () => {
  const result = await observeGithubAuthenticatedPrincipal('another-sensitive-token', {
    fetchImpl: async () => json({ message: 'token another-sensitive-token rejected' }, 401),
    apiBase: 'https://api.github.test',
    allowedHosts: 'api.github.test',
    now: () => new Date(NOW),
    timeoutMs: 1_000
  });

  assert.equal(result.status, 'INVALID');
  assert.equal(result.reasonCode, 'GITHUB_IDENTITY_AUTH_INVALID');
  assert.equal(result.login, null);
  assert.equal(JSON.stringify(result).includes('another-sensitive-token'), false);
});

test('les comptes durables réutilisent une seule observation /user par tokenFile et restent assainis', async () => {
  let principalObservations = 0;
  const observations = await collectDurableGithubIdentityObservations([
    {
      owner: 'Patricked-code', type: 'user', status: 'active',
      tokenFile: '/app/secrets/github_patricked'
    },
    {
      owner: 'chainsolutions-wealthtech', type: 'organization', status: 'active',
      tokenFile: '/app/secrets/github_patricked'
    }
  ], {
    readToken: async () => 'shared-sensitive-token',
    observePrincipal: async () => {
      principalObservations += 1;
      return {
        status: 'VERIFIED' as const,
        observedAt: NOW,
        freshness: 'CURRENT' as const,
        login: 'Patricked-code',
        githubUserId: 270385782,
        accountType: 'user' as const,
        reasonCode: null
      };
    },
    verifyAccountContext: async (_token, owner, type) => (
      type === 'user' ? owner.toLowerCase() === 'patricked-code' : true
    )
  });

  assert.equal(principalObservations, 1);
  assert.deepEqual(observations.map(({ owner, type, accountVerified }) => ({ owner, type, accountVerified })), [
    { owner: 'Patricked-code', type: 'user', accountVerified: true },
    { owner: 'chainsolutions-wealthtech', type: 'organization', accountVerified: true }
  ]);
  const serialized = JSON.stringify(observations);
  assert.equal(serialized.includes('shared-sensitive-token'), false);
  assert.equal(serialized.includes('tokenFile'), false);
  assert.equal(serialized.includes('oauthScopes'), false);
});

test('un profil public d organisation ne prouve jamais l appartenance du principal authentifié', async () => {
  const originalFetch = globalThis.fetch;
  const endpoints: string[] = [];
  globalThis.fetch = (async (input: string | URL | Request) => {
    const endpoint = new URL(String(input)).pathname;
    endpoints.push(endpoint);
    if (endpoint === '/orgs/chainsolutions-wealthtech') {
      return json({ login: 'chainsolutions-wealthtech', type: 'Organization' });
    }
    if (endpoint === '/user/memberships/orgs/chainsolutions-wealthtech') {
      return json({
        state: 'inactive',
        organization: { login: 'chainsolutions-wealthtech', type: 'Organization' }
      });
    }
    return json({ message: 'unexpected endpoint' }, 500);
  }) as typeof fetch;

  try {
    const observations = await collectDurableGithubIdentityObservations([{
      owner: 'chainsolutions-wealthtech', type: 'organization', status: 'active',
      tokenFile: '/app/secrets/github_patricked'
    }], {
      readToken: async () => 'organization-membership-test-token',
      observePrincipal: async () => ({
        status: 'VERIFIED', observedAt: NOW, freshness: 'CURRENT',
        login: 'Patricked-code', githubUserId: 270385782,
        accountType: 'user', reasonCode: null
      })
    });

    assert.equal(observations[0]?.accountVerified, false);
    assert.deepEqual(endpoints, ['/user/memberships/orgs/chainsolutions-wealthtech']);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('une appartenance active et concordante vérifie le contexte organisationnel', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input: string | URL | Request) => {
    const endpoint = new URL(String(input)).pathname;
    return endpoint === '/user/memberships/orgs/chainsolutions-wealthtech'
      ? json({
          state: 'active',
          organization: { login: 'chainsolutions-wealthtech', type: 'Organization' }
        })
      : json({ message: 'unexpected endpoint' }, 500);
  }) as typeof fetch;

  try {
    const observations = await collectDurableGithubIdentityObservations([{
      owner: 'chainsolutions-wealthtech', type: 'organization', status: 'active',
      tokenFile: '/app/secrets/github_patricked'
    }], {
      readToken: async () => 'active-membership-test-token',
      observePrincipal: async () => ({
        status: 'VERIFIED', observedAt: NOW, freshness: 'CURRENT',
        login: 'Patricked-code', githubUserId: 270385782,
        accountType: 'user', reasonCode: null
      })
    });

    assert.equal(observations[0]?.accountVerified, true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('les observations corrèlent sans secret les comptes issus du même credential uniquement', async () => {
  const observations = await collectDurableGithubIdentityObservations([
    {
      owner: 'Patricked-code', type: 'user', status: 'active',
      tokenFile: '/app/secrets/github_primary'
    },
    {
      owner: 'chainsolutions-wealthtech', type: 'organization', status: 'active',
      tokenFile: '/app/secrets/github_primary'
    },
    {
      owner: 'another-context', type: 'organization', status: 'active',
      tokenFile: '/app/secrets/github_other'
    }
  ], {
    readToken: async (path) => path.endsWith('github_primary') ? 'primary-token' : 'other-token',
    observePrincipal: async () => ({
      status: 'VERIFIED', observedAt: NOW, freshness: 'CURRENT',
      login: 'Patricked-code', githubUserId: 270385782,
      accountType: 'user', reasonCode: null
    }),
    verifyAccountContext: async () => true
  });

  assert.equal(typeof observations[0]?.authenticationContextId, 'string');
  assert.equal(observations[0]?.authenticationContextId, observations[1]?.authenticationContextId);
  assert.notEqual(observations[0]?.authenticationContextId, observations[2]?.authenticationContextId);
  const serialized = JSON.stringify(observations);
  for (const forbidden of ['github_primary', 'github_other', 'primary-token', 'other-token']) {
    assert.equal(serialized.includes(forbidden), false);
  }
});

test('un tokenFile hors du secret storage existant est refusé sans lecture', async () => {
  let tokenReads = 0;
  const observations = await collectDurableGithubIdentityObservations([{
    owner: 'Patricked-code', type: 'user', status: 'active', tokenFile: '/tmp/not-authorized'
  }], {
    readToken: async () => { tokenReads += 1; return 'must-not-be-read'; },
    observePrincipal: async () => { throw new Error('must not observe'); },
    verifyAccountContext: async () => false
  });

  assert.equal(tokenReads, 0);
  assert.equal(observations[0]?.principal.status, 'UNAVAILABLE');
  assert.equal(observations[0]?.principal.reasonCode, 'GITHUB_IDENTITY_AUTH_MISSING');
  assert.equal(observations[0]?.accountVerified, false);
});
