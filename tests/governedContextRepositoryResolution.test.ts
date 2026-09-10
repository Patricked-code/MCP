import assert from 'node:assert/strict';
import test from 'node:test';

process.env.MCP_AUTH_TOKEN ??= 'mcp-unit-test-value-20260805-abcdef';
process.env.S1_HOST ??= '127.0.0.1';
process.env.S1_KEY_PATH ??= '/tmp/mcp-unit-test-s1-key';
process.env.S2_HOST ??= '127.0.0.1';
process.env.S2_KEY_PATH ??= '/tmp/mcp-unit-test-s2-key';

const { createGovernedOperationalContextService } = await import('../src/governedContext/service.js');

const NOW = '2026-09-10T02:45:00.000Z';
const SESSION_ID = '11111111-1111-4111-8111-111111111111';

const SESSION = {
  governedSessionId: SESSION_ID,
  workBranch: 'mcp/b2-repository-resolution-20260909',
  connectionContext: {
    principalId: 'oauth:wealthtech-mcp-admin',
    repository: 'Patricked-code/MCP',
    identityAssurance: 'oauth_subject',
    evidenceSource: 'oauth_auth_info'
  },
  bootstrapReceipt: null,
  lastAcknowledgedStateVersion: null,
  blockers: [],
  lastCheckpoint: null,
  identityAssurance: 'oauth_subject'
};

const GITHUB = {
  status: 'CURRENT',
  observedAt: NOW,
  mainHead: 'a'.repeat(40),
  workBranch: 'mcp/b2-repository-resolution-20260909',
  workBranchHead: 'b'.repeat(40),
  pullRequest: null,
  checks: {
    status: 'completed', conclusion: 'success', total: 1, failed: 0,
    headSha: 'b'.repeat(40), exactHead: true, required: [], requiredSatisfied: true
  },
  reviews: { approvals: 0, changesRequested: 0, unresolvedThreads: 0 },
  ruleset: {
    name: null, enforcement: null, requiresPullRequest: null,
    requiredStatusChecks: [], requiresConversationResolution: null
  },
  ownership: { pullRequestAuthor: null },
  activity: { lastActivityAt: NOW },
  cache: { status: 'CURRENT', observedAt: NOW, provenance: 'memory_cache' },
  evidence: {},
  reasonCodes: [],
  uncertainties: [],
  error: null
};

const ROUTED = {
  status: 'RESOLVED',
  observedAt: NOW,
  oauthPrincipalId: 'oauth:wealthtech-mcp-admin',
  requestedRepository: 'Patricked-code/Stablecoin',
  requiredTechnicalAccess: 'write',
  repository: {
    fullName: 'Patricked-code/Stablecoin',
    owner: 'Patricked-code',
    name: 'Stablecoin',
    githubRepositoryId: 1227251709,
    registryRepositoryId: 'github:Patricked-code/Stablecoin',
    registryPresence: 'UNREGISTERED',
    defaultBranch: 'main',
    archived: false
  },
  route: {
    routingBindingId: 'route-patricked',
    connectionId: 'github:Patricked-code',
    accountContext: { owner: 'Patricked-code', type: 'user' }
  },
  observedTechnicalAccess: { read: true, write: true, admin: false },
  authorizationEffect: 'NONE',
  freshness: 'CURRENT',
  provenance: ['identity_policy', 'durable_accounts', 'github_api:get_repository'],
  reasonCodes: [],
  policyDigest: 'd'.repeat(64)
};

function request() {
  return {
    transportSessionId: 'transport-current',
    identity: {
      principalId: 'oauth:wealthtech-mcp-admin',
      clientId: 'chatgpt-client',
      assurance: 'oauth_subject'
    }
  };
}

function fixture() {
  const routedInputs: unknown[] = [];
  const service = createGovernedOperationalContextService({
    liveState: {
      getCurrent: async () => null,
      reconcileNow: async () => null
    },
    github: {
      getCurrent: async () => GITHUB,
      reconcileExplicit: async () => GITHUB
    },
    sessions: {
      getVisibleSession: async () => SESSION
    },
    locks: {
      listActiveLocks: async () => []
    },
    repositoryRouting: {
      async resolve(input: unknown) {
        routedInputs.push(input);
        return ROUTED;
      }
    },
    gateMode: 'shadow',
    existingWriteToolsEnabled: true,
    now: () => new Date(NOW)
  } as never);
  return { service, routedInputs };
}

test('une lecture historique sans target_repository ne déclenche jamais B2 et conserve sa forme', async () => {
  const { service, routedInputs } = fixture();
  const result = await service.getCurrent({
    governedSessionId: SESSION_ID,
    workBranch: null,
    request: request()
  });
  assert.equal(routedInputs.length, 0);
  assert.equal(Object.prototype.hasOwnProperty.call(result, 'repositoryResolution'), false);
});

test('la réconciliation explicite projette B2 séparément avec le principal OAuth durable', async () => {
  const { service, routedInputs } = fixture();
  const result = await service.reconcileExplicit({
    governedSessionId: SESSION_ID,
    workBranch: null,
    request: request(),
    targetRepository: 'Patricked-code/Stablecoin',
    requiredGithubAccess: 'write'
  } as never);

  assert.deepEqual(routedInputs, [{
    oauthPrincipalId: 'oauth:wealthtech-mcp-admin',
    targetRepository: 'Patricked-code/Stablecoin',
    requiredTechnicalAccess: 'write'
  }]);
  assert.deepEqual((result as any).repositoryResolution, ROUTED);
  assert.equal((result as any).github.status, 'CURRENT');
});
