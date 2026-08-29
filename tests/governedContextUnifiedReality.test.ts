import assert from 'node:assert/strict';
import test from 'node:test';

import type { LiveStateSnapshot } from '../src/liveState/types.js';
import type { GovernedSessionPublicRecord, GovernedTaskRecord } from '../src/operationalMemory/types.js';

process.env.MCP_AUTH_TOKEN ??= 'mcp-unit-test-value-20260805-abcdef';
process.env.S1_HOST ??= '127.0.0.1';
process.env.S1_KEY_PATH ??= '/tmp/mcp-unit-test-s1-key';
process.env.S2_HOST ??= '127.0.0.1';
process.env.S2_KEY_PATH ??= '/tmp/mcp-unit-test-s2-key';

const { createGovernedOperationalContextService } = await import('../src/governedContext/service.js');

const NOW = '2026-08-29T02:10:00.000Z';
const SESSION_ID = '11111111-1111-4111-8111-111111111111';
const MAIN_SHA = 'a'.repeat(40);
const PR_HEAD_SHA = 'b'.repeat(40);
const BRANCH = 'mcp/unified-operational-work-state-20260829';

const LIVE_STATE: LiveStateSnapshot = {
  schemaVersion: 1,
  stateVersion: 45,
  generatedAt: NOW,
  lastReconciledAt: NOW,
  maxAgeSeconds: 60,
  freshness: 'CURRENT',
  ageSeconds: 0,
  repository: 'Patricked-code/MCP',
  github: { status: 'CURRENT', branch: 'main', head: MAIN_SHA, error: null },
  s1: {
    status: 'CURRENT', path: '/opt/apps/wealthtech-mcp-ssh-bridge', branch: 'main',
    head: MAIN_SHA, originMain: MAIN_SHA, workingTreeClean: true, diffEmpty: true,
    fetchRemote: 'git@github.com-mcp-patricked-ro:Patricked-code/MCP.git',
    pushRemote: 'disabled://mcp-s1-read-only', error: null
  },
  runtime: {
    status: 'CURRENT', container: 'wealthtech_mcp_ssh_bridge', containerStatus: 'running',
    health: 'healthy', imageId: 'sha256:image', revision: MAIN_SHA, error: null
  },
  documentation: {
    status: 'CURRENT', activeTask: 'TASK-20260829-001', declaredGithubSha: MAIN_SHA,
    declaredS1Sha: MAIN_SHA, drift: false, error: null
  },
  alignment: {
    githubVsS1: 'ALIGNED', runtime: 'ALIGNED', documentation: 'ALIGNED', global: 'FULLY_ALIGNED'
  },
  contradictions: [],
  nextAction: null
};

const SESSION: GovernedSessionPublicRecord = {
  schemaVersion: 1,
  governedSessionId: SESSION_ID,
  repository: 'Patricked-code/MCP',
  taskScope: 'Unified Operational Work State',
  workBranch: BRANCH,
  agentIdentity: 'codex-work-mode',
  ownerPrincipalId: 'oauth:wealthtech-mcp-admin',
  identityAssurance: 'oauth_subject',
  status: 'ACTIVE',
  createdAt: NOW,
  resumedAt: NOW,
  lastHeartbeatAt: NOW,
  pausedAt: null,
  expiredAt: null,
  closedAt: null,
  currentTransport: null,
  lastAcknowledgedStateVersion: 45,
  bootstrapReceipt: {
    schemaVersion: 1,
    bootstrapReceiptId: '55555555-5555-4555-8555-555555555555',
    governedSessionId: SESSION_ID,
    agentIdentity: 'codex-work-mode',
    repository: 'Patricked-code/MCP',
    governedBranch: BRANCH,
    stateVersion: 45,
    githubHead: MAIN_SHA,
    runtimeRevision: MAIN_SHA,
    catalogueDigest: 'c'.repeat(64),
    governanceDigest: 'd'.repeat(64),
    taskRegistryDigest: 'e'.repeat(64),
    createdAt: NOW,
    expiresAt: '2026-08-30T02:10:00.000Z',
    status: 'ACKNOWLEDGED',
    limitations: []
  },
  sessionRevision: 1,
  lastCheckpoint: null,
  blockers: [],
  nextAction: null,
  lockIds: [],
  resumePolicy: 'stable_principal_or_resume_secret'
};

const TASK: GovernedTaskRecord = {
  schemaVersion: 1,
  taskId: 'TASK-20260829-001',
  repository: 'Patricked-code/MCP',
  intentKey: 'mandatory-agent-bootstrap:unified-operational-work-state',
  title: 'Unified Operational Work State',
  summary: 'Unify operational evidence without a parallel orchestrator.',
  priority: 80,
  sequence: 3,
  status: 'READY',
  dependencies: [],
  resourceScopes: ['repository:Patricked-code/MCP'],
  ownerGovernedSessionId: null,
  workBranch: BRANCH,
  pullRequestNumber: 55,
  observedHeadSha: MAIN_SHA,
  runtimeRevision: MAIN_SHA,
  blockers: [],
  nextAction: 'mcp_transition_governed_task',
  source: { kind: 'agent', requestDigest: 'f'.repeat(64) },
  createdAt: NOW,
  updatedAt: NOW,
  taskRevision: 1
};

const GITHUB = {
  status: 'CURRENT' as const,
  observedAt: NOW,
  mainHead: MAIN_SHA,
  workBranch: BRANCH,
  workBranchHead: PR_HEAD_SHA,
  pullRequest: {
    number: 55,
    state: 'closed' as const,
    draft: false,
    merged: true,
    base: 'main',
    head: BRANCH,
    headSha: PR_HEAD_SHA,
    author: 'Patricked-code',
    updatedAt: NOW
  },
  checks: {
    status: 'completed' as const,
    conclusion: 'success',
    total: 1,
    failed: 0,
    headSha: PR_HEAD_SHA,
    exactHead: true,
    required: [{ context: 'validate', status: 'completed', conclusion: 'success' }],
    requiredSatisfied: true
  },
  reviews: { approvals: 1, changesRequested: 0, unresolvedThreads: 0 },
  ruleset: {
    name: 'main-protection', enforcement: 'active', requiresPullRequest: true,
    requiredStatusChecks: ['validate'], requiresConversationResolution: true
  },
  ownership: { pullRequestAuthor: 'Patricked-code' },
  activity: { lastActivityAt: NOW },
  cache: { status: 'REFRESHED' as const, observedAt: NOW, provenance: 'github_api' as const },
  evidence: {
    main: { freshness: 'CURRENT' as const, observedAt: NOW, provenance: 'github_api' as const },
    pullRequest: { freshness: 'CURRENT' as const, observedAt: NOW, provenance: 'github_api' as const },
    checks: { freshness: 'CURRENT' as const, observedAt: NOW, provenance: 'github_api' as const },
    reviews: { freshness: 'CURRENT' as const, observedAt: NOW, provenance: 'github_api' as const },
    ruleset: { freshness: 'CURRENT' as const, observedAt: NOW, provenance: 'github_api' as const }
  },
  error: null
};

const CATALOGUE = {
  schemaVersion: 1 as const,
  catalogueVersion: 1 as const,
  generatedAt: NOW,
  counts: { tools: 1, resources: 0, read: 0, operationalWrite: 1, scopedWrite: 0 },
  catalogueDigest: 'c'.repeat(64),
  catalogDigest: 'c'.repeat(64),
  registeredToolCount: 1,
  readOnlyToolCount: 0,
  operationalWriteToolCount: 1,
  writeToolCount: 1,
  resourceCount: 0,
  tools: [{
    name: 'mcp_transition_governed_task',
    title: null,
    description: null,
    surface: 'operational-write' as const,
    annotations: { readOnlyHint: false, destructiveHint: false },
    inputSchema: {},
    contractDigest: '1'.repeat(64)
  }],
  resources: []
};

test('Governed Context exposes capability/task reality without mutating the task store', async () => {
  const service = createGovernedOperationalContextService({
    liveState: { getCurrent: async () => LIVE_STATE, reconcileNow: async () => LIVE_STATE },
    github: { getCurrent: async () => GITHUB, reconcileExplicit: async () => GITHUB },
    sessions: { getVisibleSession: async () => SESSION },
    locks: { listActiveLocks: async () => [] },
    currentState: {
      getInventory: async () => ({
        schemaVersion: 1,
        generatedAt: NOW,
        repository: 'Patricked-code/MCP',
        source: {
          liveStateVersion: 45,
          githubHead: MAIN_SHA,
          runtimeRevision: MAIN_SHA,
          inventoryDigest: '2'.repeat(64),
          catalogueDigest: CATALOGUE.catalogueDigest,
          taskStoreRevision: 11
        },
        liveState: LIVE_STATE,
        catalogue: CATALOGUE,
        architecture: null,
        governance: null,
        auditBaseline: null,
        sessions: [SESSION],
        workQueue: {
          schemaVersion: 1,
          storeRevision: 11,
          seedRegistryVersion: 1,
          nextSequence: 4,
          tasks: [TASK]
        },
        currentTask: TASK,
        firstExecutableTask: TASK,
        bootstrap: { required: true, order: [], limitations: [] },
        contradictions: []
      })
    },
    gateMode: 'shadow',
    existingWriteToolsEnabled: true,
    now: () => new Date(NOW)
  });

  const result = await service.getCurrent({
    governedSessionId: SESSION_ID,
    workBranch: BRANCH,
    request: {
      transportSessionId: 'transport-test',
      identity: {
        principalId: 'oauth:wealthtech-mcp-admin',
        clientId: 'chatgpt-client',
        assurance: 'oauth_subject'
      }
    }
  });

  const unified = result as any;
  const transitionCapability = unified.capabilityReality.find(
    (entry: any) => entry.toolName === 'mcp_transition_governed_task'
  );
  assert.equal(transitionCapability.registered, true);
  assert.equal(transitionCapability.callability.status, 'UNKNOWN');
  assert.equal(transitionCapability.authorized.status, 'UNKNOWN');
  assert.equal(transitionCapability.safeNow, false);
  assert.ok(transitionCapability.reasonCodes.includes('CALLABILITY_UNATTESTED'));

  assert.equal(unified.taskReality.declaredStatus, 'READY');
  assert.equal(unified.taskReality.observedPhase, 'VERIFIED');
  assert.equal(unified.taskReality.drift, 'TASK_STATE_BEHIND_REALITY');
  assert.equal(TASK.status, 'READY');
  assert.equal(TASK.taskRevision, 1);

  assert.equal(unified.governanceDecision.operation, 'mcp_transition_governed_task');
  assert.equal(unified.governanceDecision.task.taskId, TASK.taskId);
  assert.equal(unified.governanceDecision.session.governedSessionId, SESSION_ID);
  assert.equal(unified.governanceDecision.mayMutate, false);
  assert.ok(unified.governanceDecision.reasonCodes.includes('CALLABILITY_UNATTESTED'));
  assert.ok(unified.governanceDecision.reasonCodes.includes('AUTHORIZATION_UNATTESTED'));
  assert.equal(unified.governanceDecision.taskReality.drift, 'TASK_STATE_BEHIND_REALITY');
});
