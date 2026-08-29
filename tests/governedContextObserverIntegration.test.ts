import assert from 'node:assert/strict';
import test from 'node:test';

process.env.MCP_AUTH_TOKEN ??= 'mcp-unit-test-value-20260805-abcdef';
process.env.S1_HOST ??= '127.0.0.1';
process.env.S1_KEY_PATH ??= '/tmp/mcp-unit-test-s1-key';
process.env.S2_HOST ??= '127.0.0.1';
process.env.S2_KEY_PATH ??= '/tmp/mcp-unit-test-s2-key';

const { createGovernedOperationalContextService } = await import(
  '../src/governedContext/service.js'
);

const NOW = '2026-08-29T03:30:00.000Z';
const SESSION_ID = '11111111-1111-4111-8111-111111111111';
const BRANCH = 'mcp/unified-operational-work-state-20260829';
const SHA = 'a'.repeat(40);

function liveState() {
  return {
    schemaVersion: 1, stateVersion: 45, generatedAt: NOW, lastReconciledAt: NOW,
    maxAgeSeconds: 60, freshness: 'CURRENT', ageSeconds: 0,
    repository: 'Patricked-code/MCP',
    github: { status: 'CURRENT', branch: 'main', head: SHA, error: null },
    s1: {
      status: 'CURRENT', path: '/opt/apps/wealthtech-mcp-ssh-bridge', branch: 'main',
      head: SHA, originMain: SHA, workingTreeClean: true, diffEmpty: true,
      fetchRemote: 'https://github.com/Patricked-code/MCP.git',
      pushRemote: 'disabled://mcp-s1-read-only', error: null
    },
    runtime: {
      status: 'CURRENT', container: 'wealthtech_mcp_ssh_bridge', containerStatus: 'running',
      health: 'healthy', imageId: 'sha256:image', revision: SHA, error: null
    },
    documentation: {
      status: 'CURRENT', activeTask: 'TASK-20260829-001', declaredGithubSha: SHA,
      declaredS1Sha: SHA, drift: false, error: null
    },
    alignment: {
      githubVsS1: 'ALIGNED', runtime: 'ALIGNED', documentation: 'ALIGNED', global: 'FULLY_ALIGNED'
    },
    contradictions: [], nextAction: null
  } as any;
}

function session() {
  return {
    schemaVersion: 1, governedSessionId: SESSION_ID, repository: 'Patricked-code/MCP',
    taskScope: 'Unified Operational Work State intake and governed orchestration evolution',
    workBranch: null, agentIdentity: 'codex-work-mode', ownerPrincipalId: 'oauth:owner',
    identityAssurance: 'oauth_subject', status: 'ACTIVE', createdAt: NOW, resumedAt: NOW,
    lastHeartbeatAt: NOW, pausedAt: null, expiredAt: null, closedAt: null, currentTransport: null,
    lastAcknowledgedStateVersion: 45,
    bootstrapReceipt: {
      schemaVersion: 1, bootstrapReceiptId: '55555555-5555-4555-8555-555555555555',
      governedSessionId: SESSION_ID, agentIdentity: 'codex-work-mode', repository: 'Patricked-code/MCP',
      governedBranch: null, stateVersion: 45, githubHead: SHA, runtimeRevision: SHA,
      catalogueDigest: 'b'.repeat(64), governanceDigest: 'c'.repeat(64), taskRegistryDigest: 'd'.repeat(64),
      createdAt: NOW, expiresAt: '2026-08-30T03:30:00.000Z', status: 'ACKNOWLEDGED', limitations: []
    },
    sessionRevision: 12, lastCheckpoint: null, blockers: [], nextAction: null, lockIds: [],
    resumePolicy: 'stable_principal_or_resume_secret'
  } as any;
}

function githubContext(workBranch: string | null) {
  return {
    status: 'DEGRADED', observedAt: NOW, mainHead: SHA, workBranch,
    workBranchHead: 'b'.repeat(40), pullRequest: null,
    checks: {
      status: 'completed', conclusion: 'failure', total: 1, failed: 1,
      headSha: 'b'.repeat(40), exactHead: true,
      required: [{ context: 'validate', status: 'completed', conclusion: 'failure' }],
      requiredSatisfied: false
    },
    reviews: { approvals: 0, changesRequested: 0, unresolvedThreads: 0 },
    ruleset: {
      name: 'main-protection', enforcement: 'active', requiresPullRequest: true,
      requiredStatusChecks: ['validate'], requiresConversationResolution: true
    },
    ownership: { pullRequestAuthor: 'owner' }, activity: { lastActivityAt: NOW },
    cache: { status: 'REFRESHED', observedAt: NOW, provenance: 'github_api' },
    evidence: {
      main: { freshness: 'CURRENT', observedAt: NOW, provenance: 'github_api' },
      pullRequest: { freshness: 'CURRENT', observedAt: NOW, provenance: 'github_api' },
      checks: { freshness: 'CURRENT', observedAt: NOW, provenance: 'github_api' },
      reviews: { freshness: 'CURRENT', observedAt: NOW, provenance: 'github_api' },
      ruleset: { freshness: 'CURRENT', observedAt: NOW, provenance: 'github_api' }
    },
    reasonCodes: ['GITHUB_REQUIRED_CHECKS_FAILED'], uncertainties: [], error: 'github_checks_failed'
  } as any;
}

test('branchless intake session observes task branch and propagates operation evidence into one decision', async () => {
  let observedWorkBranch: string | null | undefined;
  const currentTask = {
    taskId: 'TASK-20260829-001', intentKey: 'mandatory-agent-bootstrap:unified-operational-work-state',
    title: 'Unified Operational Work State', summary: 'test', repository: 'Patricked-code/MCP',
    priority: 90, sequence: 3, status: 'IN_PROGRESS',
    ownerGovernedSessionId: SESSION_ID, dependencies: ['TASK-20260822-001'],
    resourceScopes: ['repo:Patricked-code/MCP'], workBranch: BRANCH, pullRequestNumber: null,
    observedHeadSha: null, runtimeRevision: null, blockers: [], nextAction: 'github.merge',
    createdAt: NOW, updatedAt: NOW, taskRevision: 4
  };
  const dependency = { ...currentTask, taskId: 'TASK-20260822-001', status: 'DONE', ownerGovernedSessionId: null };
  const service = createGovernedOperationalContextService({
    liveState: {
      getCurrent: async () => liveState(),
      reconcileNow: async () => liveState()
    },
    github: {
      getCurrent: async (workBranch) => {
        observedWorkBranch = workBranch;
        return githubContext(workBranch);
      },
      reconcileExplicit: async (workBranch) => githubContext(workBranch)
    },
    sessions: { getVisibleSession: async () => session() },
    locks: { listActiveLocks: async () => [] },
    currentState: {
      getInventory: async () => ({
        source: { catalogueDigest: 'b'.repeat(64), inventoryDigest: 'e'.repeat(64) },
        governance: { digest: 'c'.repeat(64) }, auditBaseline: { valid: true },
        workQueue: { storeRevision: 14, tasks: [dependency, currentTask] },
        currentTask, firstExecutableTask: null, contradictions: [], catalogue: { tools: [] }
      })
    },
    gateMode: 'shadow', existingWriteToolsEnabled: true, now: () => new Date(NOW)
  } as any);

  const context = await service.getCurrent({
    governedSessionId: SESSION_ID,
    workBranch: null,
    request: {
      transportSessionId: 'transport-A',
      identity: { principalId: 'oauth:owner', clientId: 'client', assurance: 'oauth_subject' }
    }
  } as any);

  assert.equal(observedWorkBranch, BRANCH);
  assert.equal(context.github.workBranch, BRANCH);
  assert.equal(context.governanceDecision?.operation, 'github.merge');
  assert.equal(context.governanceDecision?.owner, SESSION_ID);
  assert.deepEqual(context.governanceDecision?.dependencies, ['TASK-20260822-001']);
  assert.equal(context.governanceDecision?.runtimeState?.revision, SHA);
  assert.equal(context.governanceDecision?.reasonCodes.includes('OWNER_MISMATCH'), false);
  assert.equal(context.governanceDecision?.reasonCodes.includes('DEPENDENCY_INCOMPLETE'), false);
  assert.equal(context.governanceDecision?.reasonCodes.includes('RUNTIME_SHA_MISMATCH'), false);
  assert.equal(context.governanceDecision?.reasonCodes.includes('GITHUB_REQUIRED_CHECKS_FAILED'), true);
  assert.equal(context.governanceDecision?.mayMutate, false);
});
