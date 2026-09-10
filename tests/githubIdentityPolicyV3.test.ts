import assert from 'node:assert/strict';
import test from 'node:test';

import { parseGithubIdentityPolicy } from '../src/github/identityPolicy.js';
import { resolveGithubIdentity, type GithubIdentityResolutionInput } from '../src/github/identityResolution.js';

const NOW = '2026-09-10T01:30:00.000Z';
const POLICY_DIGEST = 'b'.repeat(64);

const V1 = {
  schemaVersion: 1 as const,
  updatedAt: '2026-08-09T09:15:01Z',
  goal: 'link every MCP or Git intervention to governed evidence',
  currentSignals: ['mcp tool called', 'server id'],
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
  requiredSuiviFields: ['date', 'actor', 'tool']
};

const PRINCIPAL_BINDING = {
  bindingId: 'oauth-wealthtech-mcp-admin__patricked-code__patricked-code-mcp',
  oauthPrincipalId: 'oauth:wealthtech-mcp-admin',
  provider: 'github' as const,
  connectionSelector: { owner: 'Patricked-code', type: 'user' as const },
  expectedAuthenticatedLogin: 'Patricked-code',
  context: { repository: 'Patricked-code/MCP' },
  effect: 'IDENTITY_ONLY' as const,
  enabled: true
};

const ROUTING_BINDING = {
  routingBindingId: 'oauth-wealthtech-mcp-admin__route__patricked-code',
  oauthPrincipalId: 'oauth:wealthtech-mcp-admin',
  provider: 'github' as const,
  repositoryOwner: 'Patricked-code',
  connectionSelector: { owner: 'Patricked-code', type: 'user' as const },
  effect: 'ROUTING_ONLY' as const,
  enabled: true
};

const V3 = {
  ...V1,
  schemaVersion: 3 as const,
  githubPrincipalBindings: [PRINCIPAL_BINDING],
  githubRepositoryRoutingBindings: [ROUTING_BINDING]
};

const verifiedConnection = {
  owner: 'Patricked-code',
  type: 'user' as const,
  configuredStatus: 'active',
  authenticationContextId: 'authentication-context-primary',
  principal: {
    status: 'VERIFIED' as const,
    observedAt: NOW,
    freshness: 'CURRENT' as const,
    login: 'Patricked-code',
    githubUserId: 270385782,
    accountType: 'user' as const,
    reasonCode: null
  },
  accountVerified: true
};

test('Identity Policy V3 est strictement V2 plus des bindings ROUTING_ONLY', () => {
  const parsed = parseGithubIdentityPolicy(V3);
  assert.equal(parsed.ok, true);
  if (!parsed.ok || parsed.policy.schemaVersion !== 3) assert.fail('V3 should parse');
  assert.deepEqual(parsed.policy.githubPrincipalBindings, [PRINCIPAL_BINDING]);
  assert.deepEqual(parsed.policy.githubRepositoryRoutingBindings, [ROUTING_BINDING]);
});

test('B1 conserve exactement sa résolution IDENTITY_ONLY avec une policy V3', () => {
  const input = {
    oauthPrincipalId: 'oauth:wealthtech-mcp-admin',
    repositoryContext: 'Patricked-code/MCP',
    policy: V3,
    policyDigest: POLICY_DIGEST,
    policyValid: true,
    connections: [verifiedConnection],
    observedAt: NOW
  } as unknown as GithubIdentityResolutionInput;

  const result = resolveGithubIdentity(input);
  assert.equal(result.status, 'RESOLVED');
  assert.equal(result.bindingId, PRINCIPAL_BINDING.bindingId);
  assert.equal(result.authenticatedPrincipal?.login, 'Patricked-code');
  assert.equal(result.selectedAccountContext?.owner, 'Patricked-code');
  assert.deepEqual(result.reasonCodes, []);
});

test('V3 refuse les wildcards, les effets non ROUTING_ONLY et les versions inconnues', () => {
  assert.equal(parseGithubIdentityPolicy({
    ...V3,
    githubRepositoryRoutingBindings: [{ ...ROUTING_BINDING, repositoryOwner: '*' }]
  }).ok, false);
  assert.equal(parseGithubIdentityPolicy({
    ...V3,
    githubRepositoryRoutingBindings: [{ ...ROUTING_BINDING, effect: 'IDENTITY_ONLY' }]
  }).ok, false);
  assert.equal(parseGithubIdentityPolicy({ ...V3, schemaVersion: 4 }).ok, false);
});
