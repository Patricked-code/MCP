import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { parseGithubIdentityPolicy, type GithubIdentityPolicyV1, type GithubIdentityPolicyV2 } from '../src/github/identityPolicy.js';
import { resolveGithubIdentity, type GithubIdentityResolutionInput } from '../src/github/identityResolution.js';

const NOW = '2026-09-07T19:00:00.000Z';
const POLICY_DIGEST = 'a'.repeat(64);

const V1: GithubIdentityPolicyV1 = {
  schemaVersion: 1,
  updatedAt: '2026-08-09T09:15:01Z',
  goal: 'link every MCP or Git intervention to governed evidence',
  currentSignals: ['mcp tool called', 'server id'],
  limits: ['human identity may require confirmation'],
  s1GithubDeploymentIdentity: {
    id: 'S1_MCP_GITHUB_DEPLOY_READ_ONLY', type: 'github_deploy_key_ssh',
    repository: 'Patricked-code/MCP', fetchAlias: 'github.com-mcp-patricked-ro',
    contentsRead: true, contentsWrite: false, pushUrl: 'disabled://mcp-s1-read-only',
    privateKeyReadableByMcp: false
  },
  requiredSuiviFields: ['date', 'actor', 'tool']
};

const BINDING = {
  bindingId: 'oauth-wealthtech-mcp-admin__patricked-code__patricked-code-mcp',
  oauthPrincipalId: 'oauth:wealthtech-mcp-admin', provider: 'github' as const,
  connectionSelector: { owner: 'Patricked-code', type: 'user' as const },
  expectedAuthenticatedLogin: 'Patricked-code', context: { repository: 'Patricked-code/MCP' },
  effect: 'IDENTITY_ONLY' as const, enabled: true
};

const V2: GithubIdentityPolicyV2 = { ...V1, schemaVersion: 2, githubPrincipalBindings: [BINDING] };

function connection(overrides: Record<string, unknown> = {}) {
  return {
    owner: 'Patricked-code', type: 'user' as const, configuredStatus: 'active',
    principal: {
      status: 'VERIFIED' as const, observedAt: NOW, freshness: 'CURRENT' as const,
      login: 'Patricked-code', githubUserId: 270385782, accountType: 'user' as const,
      reasonCode: null
    },
    accountVerified: true,
    ...overrides
  };
}

function input(overrides: Partial<GithubIdentityResolutionInput> = {}): GithubIdentityResolutionInput {
  return {
    oauthPrincipalId: 'oauth:wealthtech-mcp-admin', repositoryContext: 'Patricked-code/MCP',
    policy: V2, policyDigest: POLICY_DIGEST, policyValid: true,
    connections: [connection(), connection({ owner: 'chainsolutions-wealthtech', type: 'organization', accountVerified: true })],
    observedAt: NOW, ...overrides
  };
}

test('Identity Policy V1 reste lisible avec toute sa sémantique historique', () => {
  const parsed = parseGithubIdentityPolicy(V1);
  assert.equal(parsed.ok, true);
  if (!parsed.ok) assert.fail('V1 should parse');
  assert.deepEqual(parsed.policy, V1);
  assert.equal(parsed.policy.schemaVersion, 1);
  assert.equal('githubPrincipalBindings' in parsed.policy, false);
});

test('Identity Policy V2 est strictement V1 plus githubPrincipalBindings', () => {
  const parsed = parseGithubIdentityPolicy(V2);
  assert.equal(parsed.ok, true);
  if (!parsed.ok || parsed.policy.schemaVersion !== 2) assert.fail('V2 should parse');
  assert.deepEqual(parsed.policy.githubPrincipalBindings, [BINDING]);
  assert.deepEqual(parsed.policy.s1GithubDeploymentIdentity, V1.s1GithubDeploymentIdentity);
  assert.deepEqual(parsed.policy.requiredSuiviFields, V1.requiredSuiviFields);
});

test('Identity Policy V2 refuse la perte d un champ V1 et les versions inconnues', () => {
  const { goal: _goal, ...missingGoal } = V2;
  assert.equal(parseGithubIdentityPolicy(missingGoal).ok, false);
  assert.equal(parseGithubIdentityPolicy({ ...V2, schemaVersion: 3 }).ok, false);
  assert.equal(parseGithubIdentityPolicy({ ...V2, unexpected: true }).ok, false);
});

test('le binding approuvé résout uniquement Patricked-code pour Patricked-code/MCP', () => {
  const result = resolveGithubIdentity(input());
  assert.equal(result.status, 'RESOLVED');
  assert.equal(result.bindingId, BINDING.bindingId);
  assert.equal(result.repositoryContext, 'Patricked-code/MCP');
  assert.deepEqual(result.authenticatedPrincipal, {
    provider: 'github', login: 'Patricked-code', accountType: 'user', githubUserId: 270385782
  });
  assert.deepEqual(result.selectedAccountContext, { owner: 'Patricked-code', type: 'user', source: 'durable_account' });
  assert.deepEqual(result.reasonCodes, []);
});

test('le contexte organisationnel accessible ne remplace jamais le principal GET /user', () => {
  const result = resolveGithubIdentity(input());
  assert.equal(result.authenticatedPrincipal?.login, 'Patricked-code');
  assert.deepEqual(result.accessibleAccountContexts, [
    { owner: 'chainsolutions-wealthtech', type: 'organization', verified: true },
    { owner: 'Patricked-code', type: 'user', verified: true }
  ]);
});

test('un autre repository ou un contexte absent ne globalise jamais le binding', () => {
  const other = resolveGithubIdentity(input({ repositoryContext: 'Patricked-code/Other' }));
  assert.equal(other.status, 'NONE');
  assert.deepEqual(other.reasonCodes, ['GITHUB_IDENTITY_BINDING_NOT_FOUND']);
  const missing = resolveGithubIdentity(input({ repositoryContext: null }));
  assert.equal(missing.status, 'UNVERIFIED');
  assert.deepEqual(missing.reasonCodes, ['GITHUB_IDENTITY_CONTEXT_REQUIRED']);
});

test('zéro binding est NONE et plusieurs bindings sont AMBIGUOUS sans priorité implicite', () => {
  const none = resolveGithubIdentity(input({ oauthPrincipalId: 'oauth:another-principal' }));
  assert.equal(none.status, 'NONE');
  assert.deepEqual(none.reasonCodes, ['GITHUB_IDENTITY_BINDING_NOT_FOUND']);
  const ambiguous = resolveGithubIdentity(input({ policy: {
    ...V2, githubPrincipalBindings: [BINDING, { ...BINDING, bindingId: 'second-binding' }]
  } }));
  assert.equal(ambiguous.status, 'AMBIGUOUS');
  assert.deepEqual(ambiguous.reasonCodes, ['GITHUB_IDENTITY_BINDING_AMBIGUOUS']);
});

test('les connexions absentes ou dupliquées échouent fermé', () => {
  const absent = resolveGithubIdentity(input({ connections: [] }));
  assert.equal(absent.status, 'UNVERIFIED');
  assert.deepEqual(absent.reasonCodes, ['GITHUB_IDENTITY_CONNECTION_NOT_FOUND']);
  const duplicate = resolveGithubIdentity(input({ connections: [connection(), connection()] }));
  assert.equal(duplicate.status, 'AMBIGUOUS');
  assert.deepEqual(duplicate.reasonCodes, ['GITHUB_IDENTITY_CONNECTION_AMBIGUOUS']);
});

test('principal, policy, preuve et fraîcheur insuffisants produisent UNVERIFIED', () => {
  assert.deepEqual(resolveGithubIdentity(input({ oauthPrincipalId: null })).reasonCodes,
    ['GITHUB_IDENTITY_OAUTH_PRINCIPAL_UNAVAILABLE']);
  assert.deepEqual(resolveGithubIdentity(input({ policyValid: false, policy: null })).reasonCodes,
    ['GITHUB_IDENTITY_POLICY_INVALID']);
  assert.deepEqual(resolveGithubIdentity(input({ connections: [connection({ principal: {
    ...connection().principal, status: 'MISSING', login: null, reasonCode: 'GITHUB_IDENTITY_AUTH_MISSING'
  } })] })).reasonCodes, ['GITHUB_IDENTITY_AUTH_MISSING']);
  assert.deepEqual(resolveGithubIdentity(input({ connections: [connection({ principal: {
    ...connection().principal, freshness: 'STALE'
  } })] })).reasonCodes, ['GITHUB_IDENTITY_EVIDENCE_STALE']);
});

test('une contradiction de login reste UNVERIFIED', () => {
  const result = resolveGithubIdentity(input({ connections: [connection({ principal: {
    ...connection().principal, login: 'another-user'
  } })] }));
  assert.equal(result.status, 'UNVERIFIED');
  assert.deepEqual(result.reasonCodes, ['GITHUB_IDENTITY_PRINCIPAL_MISMATCH']);
});

test('un futur compte contextuel coexiste sans casser le binding actuel', () => {
  const future = {
    ...BINDING, bindingId: 'future-chainsolutions-binding',
    connectionSelector: { owner: 'chainsolutions-wealthtech', type: 'organization' as const },
    context: { repository: 'chainsolutions-wealthtech/another-project' }
  };
  const result = resolveGithubIdentity(input({ policy: { ...V2, githubPrincipalBindings: [BINDING, future] } }));
  assert.equal(result.status, 'RESOLVED');
  assert.equal(result.bindingId, BINDING.bindingId);
  assert.equal(result.selectedAccountContext?.owner, 'Patricked-code');
});

test('la projection ne contient ni permission ni secret', () => {
  const raw = JSON.stringify(resolveGithubIdentity(input()));
  for (const forbidden of [
    'permissionsGranted', 'grants', 'mayWrite', 'mayMerge', 'mayDeploy',
    'oauthScopes', 'tokenFile', 'Authorization', 'sensitive-token'
  ]) assert.equal(raw.includes(forbidden), false, `forbidden identity output: ${forbidden}`);
});

test('les identifiants GitHub et le repository sont comparés sans dépendre de la casse', () => {
  const result = resolveGithubIdentity(input({
    repositoryContext: 'patricked-code/mcp',
    connections: [connection({
      owner: 'patricked-code',
      principal: { ...connection().principal, login: 'patricked-CODE' }
    })]
  }));
  assert.equal(result.status, 'RESOLVED');
  assert.equal(result.authenticatedPrincipal?.login, 'patricked-CODE');
});

test('la policy réellement versionnée reste V1 complète, contextuelle et packagée', async () => {
  const raw = await readFile(new URL('../.mcp/identity-policy.json', import.meta.url), 'utf8');
  const parsed = parseGithubIdentityPolicy(JSON.parse(raw));
  assert.equal(parsed.ok, true);
  if (!parsed.ok || parsed.policy.schemaVersion !== 2) assert.fail('versioned V2 policy required');
  assert.equal(parsed.policy.goal, V1.goal.replace(
    'governed evidence',
    'actor, tool, server, project, branch, objective, risk, backup, tests, result and point de reprise'
  ));
  assert.deepEqual(parsed.policy.s1GithubDeploymentIdentity, V1.s1GithubDeploymentIdentity);
  assert.equal(parsed.policy.githubPrincipalBindings.length, 1);
  assert.deepEqual(parsed.policy.githubPrincipalBindings[0], BINDING);
  const dockerfile = await readFile(new URL('../Dockerfile', import.meta.url), 'utf8');
  assert.match(dockerfile, /COPY \.mcp\/identity-policy\.json \.\/\.mcp\/identity-policy\.json/);
});
