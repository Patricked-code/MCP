import assert from 'node:assert/strict';
import test from 'node:test';

import type { GithubIdentityPolicyV3 } from '../src/github/identityPolicy.js';
import { createGithubRepositoryRoutingService } from '../src/github/repositoryRouting.js';

const NOW = new Date('2026-09-10T02:15:00.000Z');

const policy: GithubIdentityPolicyV3 = {
  schemaVersion: 3,
  updatedAt: '2026-09-10T01:00:00Z',
  goal: 'deterministic repository routing',
  currentSignals: ['repository target'],
  limits: [],
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
  githubPrincipalBindings: [],
  githubRepositoryRoutingBindings: [
    {
      routingBindingId: 'route-patricked',
      oauthPrincipalId: 'oauth:wealthtech-mcp-admin',
      provider: 'github',
      repositoryOwner: 'Patricked-code',
      connectionSelector: { owner: 'Patricked-code', type: 'user' },
      effect: 'ROUTING_ONLY',
      enabled: true
    },
    {
      routingBindingId: 'route-chainsolutions',
      oauthPrincipalId: 'oauth:wealthtech-mcp-admin',
      provider: 'github',
      repositoryOwner: 'chainsolutions-wealthtech',
      connectionSelector: { owner: 'chainsolutions-wealthtech', type: 'organization' },
      effect: 'ROUTING_ONLY',
      enabled: true
    },
    {
      routingBindingId: 'route-wealthtech',
      oauthPrincipalId: 'oauth:wealthtech-mcp-admin',
      provider: 'github',
      repositoryOwner: 'Wealthtechinnovations',
      connectionSelector: { owner: 'Wealthtechinnovations', type: 'organization_or_user' },
      effect: 'ROUTING_ONLY',
      enabled: true
    }
  ]
};

const accounts = [
  { owner: 'chainsolutions-wealthtech', type: 'organization', tokenFile: '/app/secrets/github_token', status: 'active' },
  { owner: 'Patricked-code', type: 'user', tokenFile: '/app/secrets/github_token', status: 'active' },
  { owner: 'Wealthtechinnovations', type: 'organization_or_user', tokenFile: '/app/secrets/github_token_wealthtechinnovations', status: 'active' }
];

function identity(owner: string, type: 'user' | 'organization' | 'organization_or_user', index: number) {
  return {
    owner,
    type,
    configuredStatus: 'active',
    authenticationContextId: `ctx-${index}`,
    principal: {
      status: 'VERIFIED' as const,
      observedAt: NOW.toISOString(),
      freshness: 'CURRENT' as const,
      login: type === 'user' ? owner : 'Wealthtechinnovations',
      githubUserId: 94637590,
      accountType: 'user' as const,
      reasonCode: null
    },
    accountVerified: true
  };
}

function dependencies(calls: Array<{ token: string; endpoint: string }>) {
  return {
    now: () => NOW,
    loadPolicy: async () => ({ parse: { ok: true as const, policy }, digest: 'd'.repeat(64) }),
    loadAccounts: async () => accounts,
    readToken: async (path: string) => path.endsWith('wealthtechinnovations') ? 'TOKEN_WEALTHTECH' : 'TOKEN_PRIMARY',
    collectIdentityObservations: async (selected: typeof accounts) => selected.map((entry, index) => identity(
      entry.owner,
      entry.type as 'user' | 'organization' | 'organization_or_user',
      index
    )),
    githubRequest: async (token: string, endpoint: string) => {
      calls.push({ token, endpoint });
      if (endpoint === '/repos/Patricked-code/Stablecoin') {
        return {
          ok: true,
          status: 200,
          json: {
            id: 1227251709,
            full_name: 'Patricked-code/Stablecoin',
            default_branch: 'main',
            archived: false,
            permissions: { pull: true, push: true, maintain: false, admin: false }
          },
          tokenExpiresAt: null,
          oauthScopes: []
        };
      }
      if (endpoint === '/repos/Wealthtechinnovations/STABLECOIN') {
        return {
          ok: true,
          status: 200,
          json: {
            id: 1227253499,
            full_name: 'Wealthtechinnovations/STABLECOIN',
            default_branch: 'main',
            archived: false,
            permissions: { pull: true, push: true, maintain: true, admin: true }
          },
          tokenExpiresAt: null,
          oauthScopes: []
        };
      }
      return { ok: false, status: 404, json: null, tokenExpiresAt: null, oauthScopes: [] };
    },
    loadRegistry: async () => null
  };
}

test('route Patricked-code/Stablecoin avec le credential owner-scoped et le repository exact', async () => {
  const calls: Array<{ token: string; endpoint: string }> = [];
  const service = createGithubRepositoryRoutingService(dependencies(calls));
  const result = await service.resolve({
    oauthPrincipalId: 'oauth:wealthtech-mcp-admin',
    targetRepository: 'Patricked-code/Stablecoin',
    requiredTechnicalAccess: 'write'
  });

  assert.equal(result.status, 'RESOLVED');
  assert.equal(result.repository?.githubRepositoryId, 1227251709);
  assert.equal(result.route?.connectionId, 'github:Patricked-code');
  assert.deepEqual(calls, [{ token: 'TOKEN_PRIMARY', endpoint: '/repos/Patricked-code/Stablecoin' }]);
  const publicJson = JSON.stringify(result);
  assert.equal(publicJson.includes('TOKEN_PRIMARY'), false);
  assert.equal(publicJson.includes('/app/secrets/'), false);
  assert.equal(publicJson.includes('credentialRef'), false);
  assert.equal(result.authorizationEffect, 'NONE');
});

test('route Wealthtechinnovations/STABLECOIN avec son credential distinct sans collision de nom', async () => {
  const calls: Array<{ token: string; endpoint: string }> = [];
  const service = createGithubRepositoryRoutingService(dependencies(calls));
  const result = await service.resolve({
    oauthPrincipalId: 'oauth:wealthtech-mcp-admin',
    targetRepository: 'Wealthtechinnovations/STABLECOIN',
    requiredTechnicalAccess: 'admin'
  });

  assert.equal(result.status, 'RESOLVED');
  assert.equal(result.repository?.githubRepositoryId, 1227253499);
  assert.equal(result.route?.connectionId, 'github:Wealthtechinnovations');
  assert.deepEqual(calls, [{ token: 'TOKEN_WEALTHTECH', endpoint: '/repos/Wealthtechinnovations/STABLECOIN' }]);
});

test('ne sonde aucun autre repository lorsque le repository exact est invisible', async () => {
  const calls: Array<{ token: string; endpoint: string }> = [];
  const deps = dependencies(calls);
  const service = createGithubRepositoryRoutingService({
    ...deps,
    githubRequest: async (token: string, endpoint: string) => {
      calls.push({ token, endpoint });
      return { ok: false, status: 404, json: null, tokenExpiresAt: null, oauthScopes: [] };
    }
  });
  const result = await service.resolve({
    oauthPrincipalId: 'oauth:wealthtech-mcp-admin',
    targetRepository: 'Patricked-code/Stablecoin',
    requiredTechnicalAccess: 'read'
  });

  assert.equal(result.status, 'UNVERIFIED');
  assert.deepEqual(result.reasonCodes, ['GITHUB_REPOSITORY_NOT_VISIBLE']);
  assert.deepEqual(calls, [{ token: 'TOKEN_PRIMARY', endpoint: '/repos/Patricked-code/Stablecoin' }]);
});

test('refuse un tokenFile hors /app/secrets sans effectuer de requête GitHub', async () => {
  const calls: Array<{ token: string; endpoint: string }> = [];
  const deps = dependencies(calls);
  const service = createGithubRepositoryRoutingService({
    ...deps,
    loadAccounts: async () => [{ owner: 'Patricked-code', type: 'user', tokenFile: '/tmp/token', status: 'active' }]
  });
  const result = await service.resolve({
    oauthPrincipalId: 'oauth:wealthtech-mcp-admin',
    targetRepository: 'Patricked-code/Stablecoin',
    requiredTechnicalAccess: 'read'
  });

  assert.equal(result.status, 'UNVERIFIED');
  assert.deepEqual(result.reasonCodes, ['GITHUB_REPOSITORY_ROUTE_CONNECTION_NOT_FOUND']);
  assert.deepEqual(calls, []);
});
