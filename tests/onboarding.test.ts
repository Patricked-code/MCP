import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { createAgentProfile } from '../src/onboarding/agents.js';
import { createAuditTrace, listOnboardingAudit } from '../src/onboarding/audit.js';
import { identifyActor } from '../src/onboarding/identity.js';
import {
  prepareAndRecordOrganizationProfileBootstrap,
  prepareAndRecordRepoBootstrap,
  prepareRepoBootstrap,
  recordOrganizationSecurityPolicyVerification,
  summarizeSourceRegistry
} from '../src/onboarding/index.js';
import { buildOrganizationBootstrapPackage, prepareOrganizationProfileBootstrap } from '../src/onboarding/organization.js';
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
  assert.equal(blocked.securitySettings.twoFactorRequirement.desiredState, 'disabled');
  assert.equal(blocked.securitySettings.twoFactorRequirement.changeMode, 'manual_owner_settings_required');
  assert.equal(blocked.securitySettings.twoFactorRequirement.currentState, 'unknown_until_org_owner_access');
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
  assert.equal(ready.securitySettings.twoFactorRequirement.currentState, 'requires_owner_verification');
  assert.match(ready.securitySettings.twoFactorRequirement.caveats.join(' '), /GitHub\.com account-level mandatory 2FA/);
});

test('organization profile bootstrap returns public-safe .github profile plan', () => {
  const blocked = prepareOrganizationProfileBootstrap(githubStatus());
  assert.equal(blocked.repository, 'chainsolutions-wealthtech/.github');
  assert.equal(blocked.branch, 'mcp/org-profile-bootstrap');
  assert.equal(blocked.mode, 'blocked_until_org_access');
  assert.ok(blocked.blockedReason);

  const profile = blocked.files.find((file) => file.path === 'profile/README.md');
  assert.ok(profile);
  assert.match(profile.content, /# ChainSolutions WealthTech/);
  assert.match(profile.content, /Aucun token brut dans Git/);
  assert.doesNotMatch(profile.content, /BEGIN (RSA|OPENSSH|PRIVATE) KEY/);

  const ready = prepareOrganizationProfileBootstrap(githubStatus({
    connected: true,
    login: 'Patricked-code',
    orgAccessible: true,
    reposVisible: 1,
    canReadReposHint: true,
    canWriteReposHint: true
  }));
  assert.equal(ready.mode, 'branch_pr_required');
  assert.equal(ready.blockedReason, null);
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

test('bootstrap preparation is audited without generated file contents', async () => {
  const previousRegistryFile = process.env.MCP_GIT_REGISTRY_FILE;
  const tempDir = await mkdtemp(join(tmpdir(), 'mcp-onboarding-'));
  process.env.MCP_GIT_REGISTRY_FILE = join(tempDir, 'registry.json');

  try {
    const repo: RepoFootprint = {
      owner: 'chainsolutions-wealthtech',
      name: 'example',
      defaultBranch: 'main',
      visibility: 'private',
      permissions: { canRead: true, canWrite: false, canAdmin: false },
      presentFiles: [],
      missingFiles: ['.mcp/manifest.json', 'MCP_PROJECT.md'],
      status: 'partial',
      recommendations: [],
      canCreateOnboardingBranch: false
    };

    const organizationResult = await prepareAndRecordOrganizationProfileBootstrap({
      status: githubStatus(),
      registry: emptyRegistry(),
      source: 'unit:test:organization',
      userAgent: 'node-test'
    });
    const repoResult = await prepareAndRecordRepoBootstrap({
      status: githubStatus(),
      registry: organizationResult.registry,
      repo,
      source: 'unit:test:repo',
      userAgent: 'node-test'
    });

    assert.equal(organizationResult.bootstrap.mode, 'blocked_until_org_access');
    assert.equal(repoResult.bootstrap.mode, 'ready_to_copy');
    assert.equal(repoResult.registry.auditEvents.length, 2);

    const [organizationEvent, repoEvent] = repoResult.registry.auditEvents;
    assert.ok(organizationEvent);
    assert.ok(repoEvent);
    assert.equal(organizationEvent.type, 'onboarding.organization_bootstrap_prepared');
    assert.equal(repoEvent.type, 'onboarding.repo_bootstrap_prepared');
    assert.match(organizationEvent.message, /blocked/);
    assert.match(repoEvent.message, /warning/);

    const organizationMetadata = organizationEvent.metadata?.metadata as Record<string, unknown>;
    assert.deepEqual(organizationMetadata.files, ['profile/README.md']);
    assert.equal(organizationMetadata.repository, 'chainsolutions-wealthtech/.github');
    assert.equal(organizationMetadata.twoFactorRequirement, 'disabled');
    assert.equal(organizationMetadata.twoFactorRequirementChangeMode, 'manual_owner_settings_required');
    assert.equal(Object.hasOwn(organizationMetadata, 'content'), false);

    const repoMetadata = repoEvent.metadata?.metadata as Record<string, unknown>;
    assert.deepEqual(repoMetadata.files, ['.mcp/manifest.json', 'MCP_PROJECT.md']);
    assert.equal(Object.hasOwn(repoMetadata, 'content'), false);

    const audit = listOnboardingAudit(repoResult.registry);
    assert.ok(audit[0]);
    assert.ok(audit[1]);
    assert.equal(audit[0].result, 'warning');
    assert.equal(audit[1].result, 'blocked');

    const writtenRegistry = JSON.parse(await readFile(process.env.MCP_GIT_REGISTRY_FILE, 'utf8')) as GitRegistry;
    assert.equal(writtenRegistry.auditEvents.length, 2);
    assert.ok(writtenRegistry.auditEvents[0]);
    assert.equal(writtenRegistry.auditEvents[0].type, 'onboarding.organization_bootstrap_prepared');
  } finally {
    if (previousRegistryFile === undefined) {
      delete process.env.MCP_GIT_REGISTRY_FILE;
    } else {
      process.env.MCP_GIT_REGISTRY_FILE = previousRegistryFile;
    }
    await rm(tempDir, { recursive: true, force: true });
  }
});

test('organization 2FA policy verification is audited as manual owner assertion', async () => {
  const previousRegistryFile = process.env.MCP_GIT_REGISTRY_FILE;
  const tempDir = await mkdtemp(join(tmpdir(), 'mcp-onboarding-'));
  process.env.MCP_GIT_REGISTRY_FILE = join(tempDir, 'registry.json');

  try {
    const result = await recordOrganizationSecurityPolicyVerification({
      status: githubStatus(),
      registry: emptyRegistry(),
      ownerConfirmed: true,
      twoFactorRequirementEnabled: false,
      source: 'unit:test:security-policy',
      userAgent: 'node-test'
    });

    assert.equal(result.policy.organization, 'chainsolutions-wealthtech');
    assert.equal(result.policy.desiredState, 'disabled');
    assert.equal(result.policy.reportedState, 'disabled_by_owner_report');
    assert.equal(result.policy.compliant, true);
    assert.equal(result.registry.auditEvents.length, 1);

    const event = result.registry.auditEvents[0];
    assert.ok(event);
    assert.equal(event.type, 'onboarding.organization_security_policy_verified');
    assert.match(event.message, /ok/);
    const metadata = event.metadata?.metadata as Record<string, unknown>;
    assert.equal(metadata.policy, 'organization_required_2fa');
    assert.equal(metadata.desiredState, 'disabled');
    assert.equal(metadata.reportedState, 'disabled_by_owner_report');
    assert.equal(metadata.compliant, true);
    assert.equal(Object.hasOwn(metadata, 'screenshot'), false);
    assert.equal(Object.hasOwn(metadata, 'recoveryCodes'), false);

    const blocked = await recordOrganizationSecurityPolicyVerification({
      status: githubStatus(),
      registry: result.registry,
      ownerConfirmed: true,
      twoFactorRequirementEnabled: true,
      source: 'unit:test:security-policy',
      userAgent: 'node-test'
    });
    assert.equal(blocked.policy.compliant, false);
    assert.equal(blocked.registry.auditEvents.length, 2);
    assert.match(blocked.registry.auditEvents[1]?.message ?? '', /blocked/);
  } finally {
    if (previousRegistryFile === undefined) {
      delete process.env.MCP_GIT_REGISTRY_FILE;
    } else {
      process.env.MCP_GIT_REGISTRY_FILE = previousRegistryFile;
    }
    await rm(tempDir, { recursive: true, force: true });
  }
});

test('source registry summary keeps ingestion gaps and safety signals visible', () => {
  const summary = summarizeSourceRegistry({
    version: 1,
    generatedAt: '2026-07-05T00:00:00.000Z',
    generator: 'unit',
    purpose: 'unit',
    safety: {
      rawSourceTextStored: false,
      rawSecretsStored: false,
      publicationMode: 'hashes_stats_and_archive_names_only'
    },
    roots: [
      { label: 'workspace-ressources', kind: 'external_workspace', available: true, fileCount: 2 },
      { label: 'downloads-migration-zip', kind: 'external_download', available: false, fileCount: 0 }
    ],
    totals: {},
    documents: [
      {
        sourceId: 'doc-md',
        sourceRoot: 'workspace-ressources',
        sourceRootKind: 'external_workspace',
        sourcePath: 'source.md',
        repoPath: null,
        fileName: 'source.md',
        roles: ['source_corpus'],
        sizeBytes: 10,
        sha256: 'a',
        duplicateOf: null,
        extension: '.md',
        readStatus: 'text_read',
        extraction: { secretSignalCount: 1 }
      },
      {
        sourceId: 'doc-pdf',
        sourceRoot: 'workspace-ressources',
        sourceRootKind: 'external_workspace',
        sourcePath: 'source.pdf',
        repoPath: null,
        fileName: 'source.pdf',
        roles: ['migration'],
        sizeBytes: 20,
        sha256: 'b',
        duplicateOf: 'doc-md',
        extension: '.pdf',
        readStatus: 'binary_indexed',
        extraction: {}
      }
    ]
  });

  assert.equal(summary.sourceFileCount, 2);
  assert.equal(summary.uniqueContentFileCount, 1);
  assert.deepEqual(summary.rootsUnavailable, ['downloads-migration-zip']);
  assert.deepEqual(summary.pdfTextExtractionPending, ['workspace-ressources/source.pdf']);
  assert.deepEqual(summary.filesRequiringSecretReview, ['workspace-ressources/source.md']);
  assert.equal(summary.rawSourceTextStored, false);
  assert.equal(summary.rawSecretsStored, false);
});
