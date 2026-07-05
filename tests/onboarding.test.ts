import assert from 'node:assert/strict';
import test from 'node:test';
import { createAgentProfile } from '../src/onboarding/agents.js';
import { createAuditTrace } from '../src/onboarding/audit.js';
import { identifyActor } from '../src/onboarding/identity.js';
import { prepareRepoBootstrap } from '../src/onboarding/index.js';
import { buildOrganizationBootstrapPackage } from '../src/onboarding/organization.js';
import { buildOnboardingQuestions, validateQuestionAnswer } from '../src/onboarding/questions.js';
import { evaluateRights } from '../src/onboarding/rights.js';
import type { GitHubConnectionStatus } from '../src/github/connection.js';
import type { GitRegistry } from '../src/github/registry.js';
import type { RepoFootprint } from '../src/onboarding/types.js';

function emptyRegistry(): GitRegistry {
  return {
    version: 1,
    updatedAt: '2026-07-05T00:00:00.000Z',
    accounts: [],
    repoMappings: [],
    auditEvents: [],
    onboardingSessions: [],
    agentProfiles: []
  };
}

function githubStatus(overrides: Partial<GitHubConnectionStatus> = {}): GitHubConnectionStatus {
  return {
    configured: true,
    connected: false,
    org: 'chainsolutions-wealthtech',
    login: null,
    tokenFile: '/app/secrets/github_token',
    tokenFileExists: false,
    tokenFileMode: null,
    tokenExpiresAt: null,
    oauthScopes: [],
    orgAccessible: false,
    reposVisible: null,
    canReadReposHint: false,
    canWriteReposHint: false,
    canAdminOrgHint: false,
    warnings: [],
    error: null,
    ...overrides
  };
}

test('onboarding blocks unsafe role and direct write choices without master validation', () => {
  const registry = emptyRegistry();
  const actor = identifyActor({ source: 'mcp-web:/git/onboarding', mcpTokenId: 'mcp-web-session' }, registry);
  const rights = evaluateRights(githubStatus(), registry, actor);
  const questions = buildOnboardingQuestions(actor, rights);

  assert.equal(validateQuestionAnswer(questions, 'role_grant', 'C').accepted, false);
  assert.equal(validateQuestionAnswer(questions, 'incomplete_repo_action', 'C').accepted, false);
  assert.equal(validateQuestionAnswer(questions, 'writer_policy', 'C').accepted, false);
});

test('SuperAdmin agent creation is refused without master MCP token validation', () => {
  assert.throws(() => createAgentProfile({
    agentName: 'Unsafe admin',
    agentType: 'superadmin_mcp',
    role: 'Should be blocked',
    actor: 'test'
  }), /master MCP token/);
});

test('repo bootstrap prepares MCP branch files and forbids official branch writes', () => {
  const repo: RepoFootprint = {
    owner: 'chainsolutions-wealthtech',
    name: 'example',
    defaultBranch: 'main',
    visibility: 'private',
    permissions: { canRead: true, canWrite: true, canAdmin: false },
    presentFiles: ['README.md'],
    missingFiles: [
      '.mcp/manifest.json',
      '.mcp/permissions.json',
      '.mcp/agents.json',
      '.mcp/server-map.json',
      '.mcp/onboarding.json',
      'MCP_PROJECT.md',
      'MCP_AGENT_RULES.md',
      'MCP_REPO_INVENTORY.md',
      'MCP_SERVER_MAPPING.md'
    ],
    status: 'partial',
    recommendations: [],
    canCreateOnboardingBranch: true
  };

  const plan = prepareRepoBootstrap(repo);
  assert.equal(plan.branch, 'mcp/onboarding-setup');
  assert.equal(plan.mode, 'branch_pr_required');

  const permissions = plan.files.find((file) => file.path === '.mcp/permissions.json');
  assert.ok(permissions);
  assert.match(permissions.content, /"directMainWrites": false/);
  assert.match(permissions.content, /"mcp\/onboarding-setup"/);
});

test('organization bootstrap package blocks direct integration until target org is accessible', () => {
  const blocked = buildOrganizationBootstrapPackage(githubStatus());
  assert.equal(blocked.organization, 'chainsolutions-wealthtech');
  assert.equal(blocked.directIntegrationMode, 'blocked_until_org_access');
  assert.equal(blocked.accessSignals.targetOrgAccessible, false);
  assert.match(blocked.shortDescription, /GitHub\/MCP/);
  assert.match(blocked.profileRepository, /chainsolutions-wealthtech\/\.github/);

  const ready = buildOrganizationBootstrapPackage(githubStatus({
    connected: true,
    login: 'Patricked-code',
    orgAccessible: true,
    reposVisible: 1,
    canReadReposHint: true,
    canWriteReposHint: true,
    canAdminOrgHint: false
  }));
  assert.equal(ready.directIntegrationMode, 'branch_pr_required');
  assert.equal(ready.accessSignals.canWriteControlledBranches, true);
  assert.equal(ready.directIntegrationBranch, 'mcp/org-profile-bootstrap');
});

test('audit trace redacts secret-like metadata keys', () => {
  const registry = emptyRegistry();
  const actor = identifyActor({ actorName: 'Codex', source: 'codex:test', mcpTokenId: 'mcp-codex' }, registry);
  const status = githubStatus({ connected: true, login: 'Patricked-code', canReadReposHint: true });
  const rights = evaluateRights(status, registry, actor);
  const trace = createAuditTrace({
    actor,
    rights,
    status,
    action: 'unit_test',
    result: 'ok',
    serverLinked: false,
    metadata: {
      token: 'should-not-survive',
      privateKey: 'should-not-survive',
      safe: 'kept'
    }
  });

  assert.deepEqual(trace.metadata, {
    token: '[redacted]',
    privateKey: '[redacted]',
    safe: 'kept'
  });
});
