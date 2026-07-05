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
  summarizeBlockerResolutionRunbook,
  summarizeArchiveTextAudit,
  summarizePdfTextAudit,
  summarizeExecutionTaskIndex,
  summarizeObjectiveTraceabilityIndex,
  summarizeServerInventoryCardIndex,
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

test('PDF text audit summary exposes direct and archived PDF coverage', () => {
  const summary = summarizePdfTextAudit({
    version: 1,
    generatedAt: '2026-07-05T00:00:00.000Z',
    generator: 'unit',
    sourceRegistry: 'Migration/index/SOURCE_REGISTRY.json',
    purpose: 'unit',
    safety: {
      rawPdfTextStored: false,
      rawSecretsStored: false,
      publicationMode: 'hashes_counts_page_stats_and_keyword_counts_only'
    },
    totals: {
      pdfDocumentCount: 3,
      uniquePdfContentCount: 2,
      duplicatePdfDocumentCount: 1,
      textReadDocumentCount: 2,
      errorDocumentCount: 0,
      secretSignalDocumentCount: 0,
      totalPagesExtracted: 10,
      totalWordsExtracted: 2000,
      totalCharsExtracted: 12000,
      byStatus: {
        pdf_text_read: 2,
        pdf_duplicate: 1
      },
      bySourceKind: {
        registry_pdf: 1,
        archive_pdf_entry: 2
      },
      keywordTotals: {
        MCP: 4,
        GitHub: 2
      }
    },
    documents: []
  });

  assert.equal(summary.pdfDocumentCount, 3);
  assert.equal(summary.registryPdfCount, 1);
  assert.equal(summary.archivePdfEntryCount, 2);
  assert.equal(summary.totalPagesExtracted, 10);
  assert.equal(summary.keywordTotals.MCP, 4);
  assert.equal(summary.rawPdfTextStored, false);
  assert.equal(summary.rawSecretsStored, false);
});

test('archive text audit summary exposes ZIP text coverage without raw text', () => {
  const summary = summarizeArchiveTextAudit({
    version: 1,
    generatedAt: '2026-07-05T00:00:00.000Z',
    generator: 'unit',
    sourceRegistry: {
      path: 'Migration/index/SOURCE_REGISTRY.json'
    },
    purpose: 'unit',
    safety: {
      rawArchiveTextStored: false,
      rawSecretsStored: false,
      publicationMode: 'archive_entry_hashes_stats_keywords_and_status_only'
    },
    totals: {
      archiveDocumentCount: 2,
      archiveDocumentsScanned: 2,
      archiveDocumentsMissing: 0,
      archiveEntryCount: 5,
      uniqueArchiveEntryCount: 4,
      duplicateArchiveEntryCount: 1,
      textEntryCount: 2,
      textReadEntryCount: 2,
      pdfDelegatedEntryCount: 1,
      nestedZipEntryCount: 1,
      binaryIndexedEntryCount: 1,
      errorEntryCount: 0,
      secretSignalEntryCount: 0,
      totalWordsExtracted: 1200,
      totalCharsExtracted: 7800,
      byStatus: {
        archive_text_read: 2,
        archive_pdf_delegated_to_pdf_audit: 1,
        archive_nested_zip_indexed: 1,
        archive_duplicate: 1
      },
      byExtension: {
        '.md': 1,
        '.csv': 1,
        '.pdf': 1,
        '.zip': 1,
        '.txt': 1
      }
    },
    archives: [],
    entries: [
      {
        archiveEntryAuditId: 'entry-1',
        sourceRoot: 'workspace-ressources',
        sourcePath: 'source.zip',
        sourceId: 'source-zip',
        archivePath: 'doc.md',
        archivePathSha256: 'hash',
        archiveDepth: 0,
        fileName: 'doc.md',
        extension: '.md',
        sizeBytes: 100,
        sha256: 'sha',
        duplicateOf: null,
        archiveTextAuditStatus: 'archive_text_read',
        extraction: {
          rawArchiveTextStored: false
        }
      },
      {
        archiveEntryAuditId: 'entry-2',
        sourceRoot: 'workspace-ressources',
        sourcePath: 'source.zip',
        sourceId: 'source-zip',
        archivePath: 'table.csv',
        archivePathSha256: 'hash-2',
        archiveDepth: 0,
        fileName: 'table.csv',
        extension: '.csv',
        sizeBytes: 120,
        sha256: 'sha-2',
        duplicateOf: null,
        archiveTextAuditStatus: 'archive_text_read',
        extraction: {
          rawArchiveTextStored: false
        }
      },
      {
        archiveEntryAuditId: 'entry-3',
        sourceRoot: 'workspace-ressources',
        sourcePath: 'source.zip',
        sourceId: 'source-zip',
        archivePath: 'doc.pdf',
        archivePathSha256: 'hash-3',
        archiveDepth: 0,
        fileName: 'doc.pdf',
        extension: '.pdf',
        sizeBytes: 400,
        sha256: 'sha-3',
        duplicateOf: null,
        archiveTextAuditStatus: 'archive_pdf_delegated_to_pdf_audit',
        extraction: {
          rawArchiveTextStored: false
        }
      },
      {
        archiveEntryAuditId: 'entry-4',
        sourceRoot: 'workspace-ressources',
        sourcePath: 'source.zip',
        sourceId: 'source-zip',
        archivePath: 'nested.zip',
        archivePathSha256: 'hash-4',
        archiveDepth: 0,
        fileName: 'nested.zip',
        extension: '.zip',
        sizeBytes: 300,
        sha256: 'sha-4',
        duplicateOf: null,
        archiveTextAuditStatus: 'archive_nested_zip_indexed',
        extraction: {
          rawArchiveTextStored: false
        }
      },
      {
        archiveEntryAuditId: 'entry-5',
        sourceRoot: 'workspace-ressources',
        sourcePath: 'source.zip',
        sourceId: 'source-zip',
        archivePath: 'duplicate.txt',
        archivePathSha256: 'hash-5',
        archiveDepth: 1,
        fileName: 'duplicate.txt',
        extension: '.txt',
        sizeBytes: 100,
        sha256: 'sha',
        duplicateOf: 'entry-1',
        archiveTextAuditStatus: 'archive_duplicate',
        extraction: {
          rawArchiveTextStored: false
        }
      }
    ]
  });

  assert.equal(summary.archiveDocumentCount, 2);
  assert.equal(summary.archiveEntryCount, 5);
  assert.equal(summary.uniqueArchiveEntryCount, 4);
  assert.equal(summary.duplicateArchiveEntryCount, 1);
  assert.equal(summary.textReadEntryCount, 2);
  assert.equal(summary.pdfDelegatedEntryCount, 1);
  assert.equal(summary.nestedZipEntryCount, 1);
  assert.equal(summary.secretSignalEntryCount, 0);
  assert.equal(summary.totalWordsExtracted, 1200);
  assert.equal(summary.byStatus.archive_text_read, 2);
  assert.equal(summary.rawArchiveTextStored, false);
  assert.equal(summary.rawSecretsStored, false);
});

test('objective traceability summary keeps partial goals visible', () => {
  const summary = summarizeObjectiveTraceabilityIndex({
    version: 1,
    generatedAt: '2026-07-05T00:00:00.000Z',
    generator: 'unit',
    purpose: 'unit',
    safety: {
      rawSourceTextStored: false,
      rawPdfTextStored: false,
      rawSecretsStored: false,
      publicationMode: 'objective_status_counts_evidence_paths_and_hashes_only'
    },
    inputs: {},
    summary: {
      objectiveCount: 2,
      statusCounts: {
        implemented_for_current_pr_flow: 1,
        partial_external_connector_authorization_required: 1
      },
      blockedObjectiveCount: 1,
      objectivesWithMissingCurrentEvidence: []
    },
    objectives: [
      {
        id: 'branch_pr_only_workflow',
        title: 'Branch workflow',
        understanding: 'Use branch workflow.',
        status: 'implemented_for_current_pr_flow',
        sourceSignals: {
          sourceHitCount: 3,
          totalPatternHits: 12,
          textUnitsScanned: 5,
          secretSignalSourceCount: 0
        },
        topEvidenceSources: [],
        currentEvidence: [],
        missingCurrentEvidence: [],
        blockers: [],
        nextActions: []
      },
      {
        id: 'connect_chainsolutions_wealthtech_to_mcp',
        title: 'Connector',
        understanding: 'Authorize target org.',
        status: 'partial_external_connector_authorization_required',
        sourceSignals: {
          sourceHitCount: 4,
          totalPatternHits: 20,
          textUnitsScanned: 5,
          secretSignalSourceCount: 0
        },
        topEvidenceSources: [],
        currentEvidence: [],
        missingCurrentEvidence: [],
        blockers: ['connector authorization required'],
        nextActions: []
      }
    ],
    globalBlockers: [
      {
        id: 'github_connector_not_authorized_on_target_org',
        description: 'Connector authorization required.',
        blocks: ['connect_chainsolutions_wealthtech_to_mcp']
      }
    ],
    nextExecutionOrder: []
  });

  assert.equal(summary.objectiveCount, 2);
  assert.equal(summary.blockedObjectiveCount, 1);
  assert.equal(summary.globalBlockerCount, 1);
  assert.deepEqual(summary.partialOrBlockedObjectiveIds, ['connect_chainsolutions_wealthtech_to_mcp']);
  assert.equal(summary.totalSourceSignals, 7);
  assert.equal(summary.totalPatternHits, 32);
  assert.equal(summary.rawSourceTextStored, false);
  assert.equal(summary.rawPdfTextStored, false);
  assert.equal(summary.rawSecretsStored, false);
});

test('execution task summary keeps ready and blocked work explicit', () => {
  const summary = summarizeExecutionTaskIndex({
    version: 1,
    generatedAt: '2026-07-05T00:00:00.000Z',
    generator: 'unit',
    purpose: 'unit',
    safety: {
      rawSourceTextStored: false,
      rawPdfTextStored: false,
      rawSecretsStored: false,
      productionActionExecuted: false,
      publicationMode: 'task_status_dependencies_gates_and_evidence_paths_only'
    },
    inputs: {},
    summary: {
      taskCount: 3,
      readyTaskCount: 1,
      blockedTaskCount: 1,
      statusCounts: {
        ready_recurring_gate: 1,
        blocked_external_authorization: 1,
        pending_operator_review: 1
      },
      kindCounts: {
        quality_gate: 1,
        external_github_app_action: 1,
        planning_to_delivery: 1
      },
      readyTaskIds: ['execute_no_regression_gate'],
      blockedTaskIds: ['authorize_github_connector_on_chainsolutions'],
      globalBlockerIds: ['github_connector_not_authorized_on_target_org']
    },
    tasks: [
      {
        id: 'execute_no_regression_gate',
        title: 'Gate',
        objectiveIds: ['no_regression_and_safety'],
        status: 'ready_recurring_gate',
        kind: 'quality_gate',
        dependsOn: [],
        blockedBy: [],
        entryCriteria: [],
        actions: [],
        expectedEvidence: [],
        verificationCommands: [],
        objectiveEvidence: [],
        missingObjectiveIds: [],
        noRegressionGateRequired: true
      },
      {
        id: 'authorize_github_connector_on_chainsolutions',
        title: 'Connector',
        objectiveIds: ['connect_chainsolutions_wealthtech_to_mcp'],
        status: 'blocked_external_authorization',
        kind: 'external_github_app_action',
        dependsOn: [],
        blockedBy: ['github_connector_not_authorized_on_target_org'],
        entryCriteria: [],
        actions: [],
        expectedEvidence: [],
        verificationCommands: [],
        objectiveEvidence: [],
        missingObjectiveIds: [],
        noRegressionGateRequired: true
      },
      {
        id: 'promote_approved_tasks_to_prs_or_issues',
        title: 'Promote',
        objectiveIds: ['apply_documented_requirements'],
        status: 'pending_operator_review',
        kind: 'planning_to_delivery',
        dependsOn: [],
        blockedBy: [],
        entryCriteria: [],
        actions: [],
        expectedEvidence: [],
        verificationCommands: [],
        objectiveEvidence: [],
        missingObjectiveIds: [],
        noRegressionGateRequired: true
      }
    ],
    globalBlockers: [
      {
        id: 'github_connector_not_authorized_on_target_org',
        description: 'Connector authorization required.',
        blocks: ['connect_chainsolutions_wealthtech_to_mcp']
      }
    ],
    noRegressionGate: {
      requiredFor: 'unit',
      commands: ['test', 'typecheck']
    },
    nextRecommendedTaskIds: ['execute_no_regression_gate']
  });

  assert.equal(summary.taskCount, 3);
  assert.equal(summary.readyTaskCount, 1);
  assert.equal(summary.blockedTaskCount, 1);
  assert.equal(summary.pendingTaskCount, 1);
  assert.equal(summary.globalBlockerCount, 1);
  assert.deepEqual(summary.readyTaskIds, ['execute_no_regression_gate']);
  assert.deepEqual(summary.blockedTaskIds, ['authorize_github_connector_on_chainsolutions']);
  assert.equal(summary.noRegressionCommandCount, 2);
  assert.equal(summary.productionActionExecuted, false);
  assert.equal(summary.rawSecretsStored, false);
});

test('server inventory card summary keeps production action blocked', () => {
  const summary = summarizeServerInventoryCardIndex({
    version: 1,
    generatedAt: '2026-07-05T00:00:00.000Z',
    generator: 'unit',
    purpose: 'unit',
    safety: {
      rawServerInventoryStored: false,
      rawSecretsStored: false,
      productionActionExecuted: false,
      publicationMode: 'templates_domains_public_safe_fields_and_gates_only'
    },
    inputs: {},
    summary: {
      cardCount: 2,
      readyCardCount: 2,
      blockedCardCount: 1,
      byStatus: {
        template_ready_private_inventory_required: 1,
        ready_recurring_gate: 1
      },
      byScope: {
        S1: 1,
        S1_S2: 1
      },
      readyCardIds: ['s1_preservation_inventory', 'server_no_regression_gate'],
      blockedCardIds: ['s1_preservation_inventory'],
      protectedDomainCount: 11,
      cleanupCandidateCount: 1,
      backupReviewCandidateCount: 0
    },
    cards: []
  });

  assert.equal(summary.cardCount, 0);
  assert.equal(summary.readyCardCount, 2);
  assert.equal(summary.blockedCardCount, 1);
  assert.deepEqual(summary.scopes, ['S1', 'S1_S2']);
  assert.equal(summary.protectedDomainCount, 11);
  assert.equal(summary.rawServerInventoryStored, false);
  assert.equal(summary.rawSecretsStored, false);
  assert.equal(summary.productionActionExecuted, false);
});

test('blocker resolution summary keeps external and private blockers explicit', () => {
  const summary = summarizeBlockerResolutionRunbook({
    version: 1,
    generatedAt: '2026-07-05T00:00:00.000Z',
    generator: 'unit',
    purpose: 'unit',
    safety: {
      rawSourceTextStored: false,
      rawPdfTextStored: false,
      rawServerInventoryStored: false,
      rawSecretsStored: false,
      productionActionExecuted: false,
      publicationMode: 'blocker_steps_acceptance_criteria_and_verification_only'
    },
    inputs: {},
    summary: {
      blockerCount: 2,
      externalActionBlockerCount: 1,
      privateInventoryBlockerCount: 1,
      blockedTaskCount: 4,
      blockedObjectiveCount: 4,
      blockedServerCardCount: 4,
      blockerIds: [
        'github_connector_not_authorized_on_target_org',
        'production_actions_require_private_inventory_and_approval'
      ]
    },
    blockers: [
      {
        id: 'github_connector_not_authorized_on_target_org',
        title: 'Connector GitHub non autorise sur chainsolutions-wealthtech',
        ownerRoleRequired: 'GitHub organization owner',
        resolutionStatus: 'blocked_external_authorization',
        resolutionSteps: [],
        acceptanceCriteria: [],
        verificationCommands: [],
        blockedObjectives: [],
        blockedTasks: [],
        blockedServerCards: []
      },
      {
        id: 'production_actions_require_private_inventory_and_approval',
        title: 'Actions serveur bloquees avant inventaire prive et accord operateur',
        ownerRoleRequired: 'Production operator',
        resolutionStatus: 'blocked_private_inventory_and_operator_approval',
        resolutionSteps: [],
        acceptanceCriteria: [],
        verificationCommands: [],
        blockedObjectives: [],
        blockedTasks: [],
        blockedServerCards: []
      }
    ],
    resumeCommandsAfterResolution: ['test', 'typecheck']
  });

  assert.equal(summary.blockerCount, 2);
  assert.equal(summary.externalActionBlockerCount, 1);
  assert.equal(summary.privateInventoryBlockerCount, 1);
  assert.deepEqual(summary.blockerIds, [
    'github_connector_not_authorized_on_target_org',
    'production_actions_require_private_inventory_and_approval'
  ]);
  assert.equal(summary.blockedTaskCount, 4);
  assert.equal(summary.blockedServerCardCount, 4);
  assert.equal(summary.resumeCommandCount, 2);
  assert.equal(summary.rawServerInventoryStored, false);
  assert.equal(summary.rawSecretsStored, false);
  assert.equal(summary.productionActionExecuted, false);
});
