import assert from 'node:assert/strict';
import test from 'node:test';

import type { GithubIdentityPolicyV3 } from '../src/github/identityPolicy.js';
import {
  resolveGithubRepository,
  type GithubRepositoryResolutionInput,
  type GithubRepositoryRouteObservation
} from '../src/github/repositoryResolution.js';

const NOW = '2026-09-10T02:00:00.000Z';
const DIGEST = 'c'.repeat(64);

const BASE_POLICY = {
  schemaVersion: 3 as const,
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
      provider: 'github' as const,
      repositoryOwner: 'Patricked-code',
      connectionSelector: { owner: 'Patricked-code', type: 'user' as const },
      effect: 'ROUTING_ONLY' as const,
      enabled: true
    },
    {
      routingBindingId: 'route-chainsolutions',
      oauthPrincipalId: 'oauth:wealthtech-mcp-admin',
      provider: 'github' as const,
      repositoryOwner: 'chainsolutions-wealthtech',
      connectionSelector: { owner: 'chainsolutions-wealthtech', type: 'organization' as const },
      effect: 'ROUTING_ONLY' as const,
      enabled: true
    },
    {
      routingBindingId: 'route-wealthtech',
      oauthPrincipalId: 'oauth:wealthtech-mcp-admin',
      provider: 'github' as const,
      repositoryOwner: 'Wealthtechinnovations',
      connectionSelector: { owner: 'Wealthtechinnovations', type: 'organization_or_user' as const },
      effect: 'ROUTING_ONLY' as const,
      enabled: true
    }
  ]
} satisfies GithubIdentityPolicyV3;

function route(options: {
  connectionId?: string;
  owner?: string;
  type?: GithubRepositoryRouteObservation['type'];
  id?: number;
  fullName?: string;
  permissions?: { pull?: boolean; push?: boolean; maintain?: boolean; admin?: boolean };
  archived?: boolean;
  accountVerified?: boolean;
  freshness?: GithubRepositoryRouteObservation['repository']['freshness'];
  status?: GithubRepositoryRouteObservation['repository']['status'];
} = {}): GithubRepositoryRouteObservation {
  return {
    connectionId: options.connectionId ?? 'github:Patricked-code',
    owner: options.owner ?? 'Patricked-code',
    type: options.type ?? 'user',
    configuredStatus: 'active',
    accountVerified: options.accountVerified ?? true,
    authenticationContextId: 'internal-context-must-not-project',
    repository: {
      status: options.status ?? 'VERIFIED',
      observedAt: NOW,
      freshness: options.freshness ?? 'CURRENT',
      githubRepositoryId: options.id ?? 1227251709,
      fullName: options.fullName ?? 'Patricked-code/Stablecoin',
      defaultBranch: 'main',
      archived: options.archived ?? false,
      permissions: options.permissions ?? { pull: true, push: true, maintain: false, admin: false }
    }
  };
}

function input(overrides: Partial<GithubRepositoryResolutionInput> = {}): GithubRepositoryResolutionInput {
  return {
    oauthPrincipalId: 'oauth:wealthtech-mcp-admin',
    targetRepository: 'Patricked-code/Stablecoin',
    requiredTechnicalAccess: 'read',
    policy: BASE_POLICY,
    policyDigest: DIGEST,
    policyValid: true,
    routes: [route()],
    registry: null,
    observedAt: NOW,
    ...overrides
  };
}

test('résout Patricked-code/Stablecoin par sa route exacte sans accorder une autorisation', () => {
  const result = resolveGithubRepository(input({ requiredTechnicalAccess: 'write' }));
  assert.equal(result.status, 'RESOLVED');
  assert.equal(result.repository?.fullName, 'Patricked-code/Stablecoin');
  assert.equal(result.repository?.githubRepositoryId, 1227251709);
  assert.equal(result.route?.routingBindingId, 'route-patricked');
  assert.equal(result.route?.connectionId, 'github:Patricked-code');
  assert.equal(result.observedTechnicalAccess?.write, true);
  assert.equal(result.authorizationEffect, 'NONE');
});

test('les repositories Stablecoin de propriétaires différents ne sont jamais interchangeables', () => {
  const wrongSameNameRoute = route({
    connectionId: 'github:Wealthtechinnovations',
    owner: 'Wealthtechinnovations',
    type: 'organization_or_user',
    id: 1227253499,
    fullName: 'Wealthtechinnovations/STABLECOIN'
  });
  const result = resolveGithubRepository(input({ routes: [wrongSameNameRoute] }));
  assert.equal(result.status, 'UNVERIFIED');
  assert.deepEqual(result.reasonCodes, ['GITHUB_REPOSITORY_ROUTE_CONNECTION_NOT_FOUND']);
  assert.equal(result.repository, null);
});

test('un nom de repository sans owner est refusé avant tout routage', () => {
  const result = resolveGithubRepository(input({ targetRepository: 'Stablecoin' }));
  assert.equal(result.status, 'UNVERIFIED');
  assert.deepEqual(result.reasonCodes, ['GITHUB_REPOSITORY_TARGET_INVALID']);
});

test('zéro binding est NONE et plusieurs bindings applicables sont AMBIGUOUS', () => {
  const none = resolveGithubRepository(input({ targetRepository: 'Unknown/Stablecoin' }));
  assert.equal(none.status, 'NONE');
  assert.deepEqual(none.reasonCodes, ['GITHUB_REPOSITORY_ROUTING_BINDING_NOT_FOUND']);

  const duplicatePolicy: GithubIdentityPolicyV3 = {
    ...BASE_POLICY,
    githubRepositoryRoutingBindings: [
      ...BASE_POLICY.githubRepositoryRoutingBindings,
      { ...BASE_POLICY.githubRepositoryRoutingBindings[0]!, routingBindingId: 'route-patricked-duplicate' }
    ]
  };
  const ambiguous = resolveGithubRepository(input({ policy: duplicatePolicy }));
  assert.equal(ambiguous.status, 'AMBIGUOUS');
  assert.deepEqual(ambiguous.reasonCodes, ['GITHUB_REPOSITORY_ROUTING_BINDING_AMBIGUOUS']);
});

test('connexion durable absente ou dupliquée échoue fermé', () => {
  const absent = resolveGithubRepository(input({ routes: [] }));
  assert.equal(absent.status, 'UNVERIFIED');
  assert.deepEqual(absent.reasonCodes, ['GITHUB_REPOSITORY_ROUTE_CONNECTION_NOT_FOUND']);

  const duplicate = resolveGithubRepository(input({ routes: [route(), route({ connectionId: 'github:Patricked-code:2' })] }));
  assert.equal(duplicate.status, 'AMBIGUOUS');
  assert.deepEqual(duplicate.reasonCodes, ['GITHUB_REPOSITORY_ROUTE_CONNECTION_AMBIGUOUS']);
});

test('read, write et admin utilisent uniquement la preuve technique live demandée', () => {
  assert.equal(resolveGithubRepository(input({
    requiredTechnicalAccess: 'read',
    routes: [route({ permissions: { pull: true, push: false, maintain: false, admin: false } })]
  })).status, 'RESOLVED');

  const noWrite = resolveGithubRepository(input({
    requiredTechnicalAccess: 'write',
    routes: [route({ permissions: { pull: true, push: false, maintain: false, admin: false } })]
  }));
  assert.equal(noWrite.status, 'UNVERIFIED');
  assert.deepEqual(noWrite.reasonCodes, ['GITHUB_REPOSITORY_TECHNICAL_ACCESS_INSUFFICIENT']);

  assert.equal(resolveGithubRepository(input({
    requiredTechnicalAccess: 'write',
    routes: [route({ permissions: { pull: true, push: false, maintain: true, admin: false } })]
  })).status, 'RESOLVED');

  const noAdmin = resolveGithubRepository(input({
    requiredTechnicalAccess: 'admin',
    routes: [route({ permissions: { pull: true, push: true, maintain: true, admin: false } })]
  }));
  assert.equal(noAdmin.status, 'UNVERIFIED');
  assert.deepEqual(noAdmin.reasonCodes, ['GITHUB_REPOSITORY_TECHNICAL_ACCESS_INSUFFICIENT']);

  assert.equal(resolveGithubRepository(input({
    requiredTechnicalAccess: 'admin',
    routes: [route({ permissions: { pull: true, push: true, maintain: true, admin: true } })]
  })).status, 'RESOLVED');
});

test('un repository archivé peut être lu mais jamais résolu pour write ou admin', () => {
  assert.equal(resolveGithubRepository(input({
    requiredTechnicalAccess: 'read', routes: [route({ archived: true })]
  })).status, 'RESOLVED');

  for (const requiredTechnicalAccess of ['write', 'admin'] as const) {
    const result = resolveGithubRepository(input({
      requiredTechnicalAccess, routes: [route({ archived: true })]
    }));
    assert.equal(result.status, 'UNVERIFIED');
    assert.deepEqual(result.reasonCodes, ['GITHUB_REPOSITORY_ARCHIVED_FOR_WRITE']);
  }
});

test('une preuve stale, un contexte non vérifié ou une identité repo discordante échoue fermé', () => {
  const stale = resolveGithubRepository(input({ routes: [route({ freshness: 'STALE' })] }));
  assert.equal(stale.status, 'UNVERIFIED');
  assert.deepEqual(stale.reasonCodes, ['GITHUB_REPOSITORY_EVIDENCE_STALE']);

  const unverified = resolveGithubRepository(input({ routes: [route({ accountVerified: false })] }));
  assert.equal(unverified.status, 'UNVERIFIED');
  assert.deepEqual(unverified.reasonCodes, ['GITHUB_REPOSITORY_ACCOUNT_CONTEXT_UNVERIFIED']);

  const mismatch = resolveGithubRepository(input({ routes: [route({ fullName: 'Patricked-code/Other' })] }));
  assert.equal(mismatch.status, 'UNVERIFIED');
  assert.deepEqual(mismatch.reasonCodes, ['GITHUB_REPOSITORY_IDENTITY_MISMATCH']);
});

test('un repository live non enregistré reste résolvable UNREGISTERED sans mutation de registry', () => {
  const registry = {
    schemaVersion: 2 as const,
    updatedAt: NOW,
    connections: [], repositories: [], mappings: [], migrations: [], auditEvents: [], activeContext: null
  };
  const before = JSON.stringify(registry);
  const result = resolveGithubRepository(input({ registry }));
  assert.equal(result.status, 'RESOLVED');
  assert.equal(result.repository?.registryPresence, 'UNREGISTERED');
  assert.equal(JSON.stringify(registry), before);
});

test('la projection publique ne contient ni secret, ni credentialRef, ni contexte auth interne', () => {
  const result = resolveGithubRepository(input());
  const serialized = JSON.stringify(result);
  assert.equal(serialized.includes('tokenFile'), false);
  assert.equal(serialized.includes('credentialRef'), false);
  assert.equal(serialized.includes('authenticationContextId'), false);
  assert.equal(serialized.includes('internal-context-must-not-project'), false);
});
