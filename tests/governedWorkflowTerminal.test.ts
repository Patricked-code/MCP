import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { createGovernedContractSubstrate } from '../src/governedWorkflow/contractSubstrate.js';

const NOW = '2026-09-19T12:58:00.000Z';
const HEAD = 'a'.repeat(40);
const OTHER_HEAD = 'b'.repeat(40);
const TASK_ID = 'TASK-20260919-960';
const SESSION_ID = '11111111-1111-4111-8111-111111111111';
const OTHER_SESSION_ID = '44444444-4444-4444-8444-444444444444';
const RECEIPT_ID = '22222222-2222-4222-8222-222222222222';
const DOC_CONTENT_BASE64 = Buffer.from('# docs\n', 'utf8').toString('base64');
const DOC_CONTENT_DIGEST = createHash('sha256')
  .update(Buffer.from(DOC_CONTENT_BASE64, 'base64'))
  .digest('hex');
const LOCK_ID = '33333333-3333-4333-8333-333333333333';

async function substrate() {
  const [contractsText, graphText] = await Promise.all([
    readFile('.mcp/gwc-contracts.json', 'utf8'),
    readFile('.mcp/gwc-workflow-graph.json', 'utf8')
  ]);
  const contracts = JSON.parse(contractsText);
  const graph = JSON.parse(graphText);
  return createGovernedContractSubstrate({
    contractsProjection: contracts,
    graphProjection: graph,
    expectedSchemaVersion: 1,
    expectedContractRegistryDigest: contracts.registryDigest,
    expectedGraphRegistryDigest: graph.registryDigest
  });
}

async function terminal() {
  return import('../src/governedWorkflow/terminal/index.js');
}

function docsState(overrides: Record<string, unknown> = {}) {
  return {
    status: 'ALIGNED',
    drift: false,
    observedAt: NOW,
    trackedHeadSha: HEAD,
    ...overrides
  };
}

function liveState(overrides: Record<string, unknown> = {}) {
  return {
    stateVersion: 400,
    freshness: 'CURRENT',
    ageSeconds: 5,
    maxAgeSeconds: 60,
    githubHead: HEAD,
    s1Head: HEAD,
    runtimeRevision: HEAD,
    globalAlignment: 'FULLY_ALIGNED',
    documentationStatus: 'ALIGNED',
    documentationDrift: false,
    contradictions: [],
    observedAt: NOW,
    ...overrides
  };
}

function terminalEvidence(overrides: Record<string, unknown> = {}) {
  return {
    task: {
      taskId: TASK_ID,
      taskRevision: 31,
      status: 'VERIFYING',
      ownerGovernedSessionId: SESSION_ID,
      observedHeadSha: HEAD,
      runtimeRevision: HEAD
    },
    receipt: {
      bootstrapReceiptId: RECEIPT_ID,
      stateVersion: 400,
      runtimeRevision: HEAD
    },
    ci: {
      runId: 1500,
      headSha: HEAD,
      conclusion: 'success'
    },
    deployment: {
      jobId: 'mcp-s1-2500-aaaaaaaaaaaa',
      ciRunId: 1500,
      headSha: HEAD,
      runtimeRevision: HEAD,
      result: 'succeeded'
    },
    review: {
      pullRequestNumber: 196,
      headSha: HEAD,
      approved: true,
      unresolvedThreads: 0
    },
    locks: {
      ownActiveLockCount: 1,
      foreignConflictingLockCount: 0
    },
    ...overrides
  };
}

test('GW-58 decides documentation drift and skips directly to terminal receipt refresh when aligned', async () => {
  const { evaluateGw58DocumentationDrift } = await terminal();
  const contracts = await substrate();

  const aligned = evaluateGw58DocumentationDrift({
    expectedHeadSha: HEAD,
    documentation: docsState()
  }, contracts);
  assert.equal(aligned.status, 'SUCCESS');
  assert.equal(aligned.payload.documentationRequired, false);
  assert.equal(aligned.payload.nextStepId, 'GW-66');

  const drift = evaluateGw58DocumentationDrift({
    expectedHeadSha: HEAD,
    documentation: docsState({ status: 'DRIFT', drift: true })
  }, contracts);
  assert.equal(drift.status, 'SUCCESS');
  assert.equal(drift.payload.documentationRequired, true);
  assert.equal(drift.payload.nextStepId, 'GW-59');
});

test('GW-59 plans the existing GitHub branch capability only when documentation is required', async () => {
  const { planGw59DocumentationBranch } = await terminal();
  const result = planGw59DocumentationBranch({
    repository: 'Patricked-code/MCP',
    baseSha: HEAD,
    branchName: 'docs/task-20260919-960',
    documentationRequired: true
  }, await substrate());
  assert.equal(result.status, 'READY');
  assert.equal(result.effectPlan?.toolName, 'github_create_branch');
  assert.deepEqual(result.effectPlan?.payload, {
    organization: 'Patricked-code',
    repository: 'MCP',
    branch: 'docs/task-20260919-960',
    baseSha: HEAD
  });
  assert.equal(result.payload.nextStepId, 'GW-60');
  assert.equal(result.mutationPerformed, false);
});

test('GW-60 plans reconciliation through the existing GitHub file mutation capability', async () => {
  const { planGw60DocumentationReconciliation } = await terminal();
  const result = planGw60DocumentationReconciliation({
    repository: 'Patricked-code/MCP',
    branchName: 'docs/task-20260919-960',
    baseSha: HEAD,
    message: 'docs: reconcile governed closure',
    changes: [{
      path: 'SUIVI.md',
      contentBase64: DOC_CONTENT_BASE64,
      contentDigest: DOC_CONTENT_DIGEST
    }]
  }, await substrate());
  assert.equal(result.status, 'READY');
  assert.equal(result.effectPlan?.toolName, 'github_create_commit');
  assert.deepEqual(result.effectPlan?.payload, {
    organization: 'Patricked-code',
    repository: 'MCP',
    branch: 'docs/task-20260919-960',
    expectedHeadSha: HEAD,
    message: 'docs: reconcile governed closure',
    files: [{ path: 'SUIVI.md', contentBase64: DOC_CONTENT_BASE64 }]
  });
  assert.equal(result.payload.nextStepId, 'GW-61');
});

test('GW-61 plans a documentation PR through the existing GitHub lifecycle capability', async () => {
  const { planGw61DocumentationPr } = await terminal();
  const result = planGw61DocumentationPr({
    repository: 'Patricked-code/MCP',
    branchName: 'docs/task-20260919-960',
    baseBranch: 'main',
    headSha: HEAD,
    title: 'docs: reconcile governed closure'
  }, await substrate());
  assert.equal(result.status, 'READY');
  assert.equal(result.effectPlan?.toolName, 'github_create_pull_request');
  assert.deepEqual(result.effectPlan?.payload, {
    organization: 'Patricked-code',
    repository: 'MCP',
    title: 'docs: reconcile governed closure',
    head: 'docs/task-20260919-960',
    targetBase: 'main',
    expectedHeadSha: HEAD,
    body: '',
    draft: true
  });
  assert.equal(result.payload.nextStepId, 'GW-62');
});

test('GW-62 accepts CI/review evidence only when it is bound to the exact documentation PR head', async () => {
  const { evaluateGw62DocumentationCiReview } = await terminal();
  const contracts = await substrate();
  const ok = evaluateGw62DocumentationCiReview({
    expectedHeadSha: HEAD,
    evidence: {
      pullRequestNumber: 196,
      headSha: HEAD,
      ciConclusion: 'success',
      reviewsSatisfied: true,
      unresolvedThreads: 0,
      observedAt: NOW
    }
  }, contracts);
  assert.equal(ok.status, 'SUCCESS');
  assert.equal(ok.payload.nextStepId, 'GW-63');

  const stale = evaluateGw62DocumentationCiReview({
    expectedHeadSha: HEAD,
    evidence: {
      pullRequestNumber: 196,
      headSha: OTHER_HEAD,
      ciConclusion: 'success',
      reviewsSatisfied: true,
      unresolvedThreads: 0,
      observedAt: NOW
    }
  }, contracts);
  assert.equal(stale.status, 'CONFLICT');
  assert.deepEqual(stale.reasonCodes, ['DOC_REVIEW_HEAD_MISMATCH']);
});

test('GW-63 plans exact-head merge and refuses stale documentation review proof', async () => {
  const { planGw63DocumentationExactHeadMerge } = await terminal();
  const contracts = await substrate();
  const ok = planGw63DocumentationExactHeadMerge({
    repository: 'Patricked-code/MCP',
    pullRequestNumber: 196,
    expectedHeadSha: HEAD,
    mergeMethod: 'squash',
    reviewProof: { status: 'SUCCESS', headSha: HEAD, pullRequestNumber: 196 }
  }, contracts);
  assert.equal(ok.status, 'READY');
  assert.equal(ok.effectPlan?.toolName, 'github_merge_pull_request');
  assert.deepEqual(ok.effectPlan?.payload, {
    organization: 'Patricked-code',
    repository: 'MCP',
    pullRequestNumber: 196,
    expectedHeadSha: HEAD,
    mergeMethod: 'squash'
  });
  assert.equal(ok.payload.nextStepId, 'GW-64');

  const stale = planGw63DocumentationExactHeadMerge({
    repository: 'Patricked-code/MCP',
    pullRequestNumber: 196,
    expectedHeadSha: HEAD,
    reviewProof: { status: 'SUCCESS', headSha: OTHER_HEAD, pullRequestNumber: 196 }
  }, contracts);
  assert.equal(stale.status, 'BLOCKED');
});

test('GW-64 observes the documentation autodeploy on the exact merged SHA', async () => {
  const { observeGw64DocumentationAutodeploy } = await terminal();
  const result = observeGw64DocumentationAutodeploy({
    expectedHeadSha: HEAD,
    deployment: {
      headSha: HEAD,
      runtimeRevision: HEAD,
      status: 'completed',
      conclusion: 'success',
      observedAt: NOW
    }
  }, await substrate());
  assert.equal(result.status, 'SUCCESS');
  assert.equal(result.payload.nextStepId, 'GW-65');
});

test('GW-65 requires current Live State aligned to the documentation deployment SHA', async () => {
  const { observeGw65DocumentationLiveState } = await terminal();
  const contracts = await substrate();
  const ok = observeGw65DocumentationLiveState({
    expectedHeadSha: HEAD,
    liveState: liveState()
  }, contracts);
  assert.equal(ok.status, 'SUCCESS');
  assert.equal(ok.payload.finalRuntimeSha, HEAD);
  assert.equal(ok.payload.nextStepId, 'GW-66');

  const mismatch = observeGw65DocumentationLiveState({
    expectedHeadSha: HEAD,
    liveState: liveState({ runtimeRevision: OTHER_HEAD })
  }, contracts);
  assert.equal(mismatch.status, 'CONFLICT');
});

test('GW-66 reuses governed-context acknowledgement for a stale terminal receipt', async () => {
  const { planGw66TerminalReceiptRefresh } = await terminal();
  const result = planGw66TerminalReceiptRefresh({
    governedSessionId: SESSION_ID,
    expectedSessionRevision: 20,
    expectedStateVersion: 400,
    receipt: {
      bootstrapReceiptId: RECEIPT_ID,
      stateVersion: 399,
      runtimeRevision: OTHER_HEAD
    },
    finalRuntimeSha: HEAD
  }, await substrate());
  assert.equal(result.status, 'READY');
  assert.equal(result.effectPlan?.toolName, 'mcp_acknowledge_governed_context');
  assert.equal(result.payload.nextStepId, 'GW-67');
});

test('GW-67 plans DEPLOYING to VERIFYING through the existing task transition authority', async () => {
  const { planGw67TaskVerifying } = await terminal();
  const result = planGw67TaskVerifying({
    taskId: TASK_ID,
    expectedTaskRevision: 30,
    governedSessionId: SESSION_ID,
    expectedSessionRevision: 21,
    expectedBootstrapReceiptId: RECEIPT_ID,
    expectedStateVersion: 400,
    observedHeadSha: HEAD,
    runtimeRevision: HEAD,
    currentTaskStatus: 'DEPLOYING'
  }, await substrate());
  assert.equal(result.status, 'READY');
  assert.equal(result.effectPlan?.toolName, 'mcp_transition_governed_task');
  assert.equal(result.effectPlan?.payload.status, 'VERIFYING');
  assert.equal(result.payload.nextStepId, 'GW-68');
});

test('GW-68 is the hard no-false-DONE gate and fails closed on reality mismatch', async () => {
  const { evaluateGw68TerminalVerification } = await terminal();
  const contracts = await substrate();
  const ok = evaluateGw68TerminalVerification({
    taskId: TASK_ID,
    taskStatus: 'VERIFYING',
    governedSessionId: SESSION_ID,
    bootstrapReceiptId: RECEIPT_ID,
    receiptStateVersion: 400,
    expectedHeadSha: HEAD,
    expectedRuntimeRevision: HEAD,
    liveState: liveState(),
    documentation: docsState(),
    terminalEvidence: terminalEvidence()
  }, contracts);
  assert.equal(ok.status, 'SUCCESS');
  assert.equal(ok.payload.terminalVerified, true);
  assert.equal(ok.payload.nextStepId, 'GW-69');

  const falseDone = evaluateGw68TerminalVerification({
    taskId: TASK_ID,
    taskStatus: 'VERIFYING',
    governedSessionId: SESSION_ID,
    bootstrapReceiptId: RECEIPT_ID,
    receiptStateVersion: 400,
    expectedHeadSha: HEAD,
    expectedRuntimeRevision: HEAD,
    liveState: liveState({ runtimeRevision: OTHER_HEAD }),
    documentation: docsState(),
    terminalEvidence: terminalEvidence()
  }, contracts);
  assert.equal(falseDone.status, 'BLOCKED');
  assert.equal(falseDone.payload.terminalVerified, false);
  assert.ok(falseDone.reasonCodes.includes('TERMINAL_REALITY_MISMATCH'));
});

test('GWC-16 self-review: GW-68 rejects cross-bound final evidence and foreign lock conflicts', async () => {
  const { evaluateGw68TerminalVerification } = await terminal();
  const contracts = await substrate();
  const base = {
    taskId: TASK_ID,
    taskStatus: 'VERIFYING',
    governedSessionId: SESSION_ID,
    bootstrapReceiptId: RECEIPT_ID,
    receiptStateVersion: 400,
    expectedHeadSha: HEAD,
    expectedRuntimeRevision: HEAD,
    liveState: liveState(),
    documentation: docsState()
  };

  const crossSession = evaluateGw68TerminalVerification({
    ...base,
    terminalEvidence: terminalEvidence({
      task: {
        taskId: TASK_ID,
        taskRevision: 31,
        status: 'VERIFYING',
        ownerGovernedSessionId: OTHER_SESSION_ID,
        observedHeadSha: HEAD,
        runtimeRevision: HEAD
      }
    })
  }, contracts);
  assert.equal(crossSession.status, 'BLOCKED');
  assert.ok(crossSession.reasonCodes.includes('TERMINAL_TASK_BINDING_MISMATCH'));

  const crossHead = evaluateGw68TerminalVerification({
    ...base,
    terminalEvidence: terminalEvidence({
      review: {
        pullRequestNumber: 196,
        headSha: OTHER_HEAD,
        approved: true,
        unresolvedThreads: 0
      }
    })
  }, contracts);
  assert.equal(crossHead.status, 'BLOCKED');
  assert.ok(crossHead.reasonCodes.includes('TERMINAL_EVIDENCE_HEAD_MISMATCH'));

  const foreignLock = evaluateGw68TerminalVerification({
    ...base,
    terminalEvidence: terminalEvidence({
      locks: { ownActiveLockCount: 1, foreignConflictingLockCount: 1 }
    })
  }, contracts);
  assert.equal(foreignLock.status, 'BLOCKED');
  assert.ok(foreignLock.reasonCodes.includes('TERMINAL_FOREIGN_LOCK_CONFLICT'));
});

test('GW-69 plans DONE only from a successful terminal proof bound to the same task/session/head/state', async () => {
  const { planGw69TaskDone } = await terminal();
  const result = planGw69TaskDone({
    taskId: TASK_ID,
    expectedTaskRevision: 31,
    governedSessionId: SESSION_ID,
    expectedSessionRevision: 22,
    expectedBootstrapReceiptId: RECEIPT_ID,
    expectedStateVersion: 400,
    expectedHeadSha: HEAD,
    terminalVerification: {
      status: 'SUCCESS',
      terminalVerified: true,
      taskId: TASK_ID,
      governedSessionId: SESSION_ID,
      bootstrapReceiptId: RECEIPT_ID,
      stateVersion: 400,
      headSha: HEAD,
      runtimeRevision: HEAD,
      evidenceDigest: 'd'.repeat(64)
    }
  }, await substrate());
  assert.equal(result.status, 'READY');
  assert.equal(result.effectPlan?.toolName, 'mcp_transition_governed_task');
  assert.deepEqual(result.effectPlan?.payload, {
    governedSessionId: SESSION_ID,
    expectedSessionRevision: 22,
    expectedBootstrapReceiptId: RECEIPT_ID,
    expectedStateVersion: 400,
    taskId: TASK_ID,
    expectedTaskRevision: 31,
    status: 'DONE',
    observedHeadSha: HEAD,
    runtimeRevision: HEAD
  });
  assert.equal(result.payload.nextStepId, 'GW-70');
});

test('GW-70 plans the existing governed checkpoint after DONE and before lock release', async () => {
  const { planGw70TerminalCheckpoint } = await terminal();
  const result = planGw70TerminalCheckpoint({
    governedSessionId: SESSION_ID,
    expectedSessionRevision: 23,
    expectedStateVersion: 400,
    taskId: TASK_ID,
    taskStatus: 'DONE',
    observedHeadSha: HEAD,
    pullRequestNumber: 196
  }, await substrate());
  assert.equal(result.status, 'READY');
  assert.equal(result.effectPlan?.toolName, 'mcp_create_governed_checkpoint');
  assert.equal(result.payload.nextStepId, 'GW-71');
});

test('GW-71 releases locks independently of task outcome and only after checkpoint evidence', async () => {
  const { planGw71LockRelease } = await terminal();
  const result = planGw71LockRelease({
    governedSessionId: SESSION_ID,
    checkpointCreated: true,
    taskOutcome: 'FAILED',
    locks: [{ lockId: LOCK_ID, lockRevision: 4, status: 'ACTIVE' }]
  }, await substrate());
  assert.equal(result.status, 'READY');
  assert.equal(result.effectPlans.length, 1);
  assert.equal(result.effectPlans[0]?.toolName, 'mcp_release_governed_lock');
  assert.equal(result.payload.nextStepId, 'GW-72');
});

test('GW-72 preserves closure ordering: close session after locks, then reconcile queue without a second authority', async () => {
  const { planGw72SessionCloseAndQueueReconcile } = await terminal();
  const result = planGw72SessionCloseAndQueueReconcile({
    governedSessionId: SESSION_ID,
    expectedSessionRevision: 24,
    checkpointCreated: true,
    activeLockCount: 0,
    taskId: TASK_ID,
    taskStatus: 'DONE'
  }, await substrate());
  assert.equal(result.status, 'READY');
  assert.equal(result.effectPlans[0]?.toolName, 'mcp_close_governed_session');
  assert.equal(result.payload.queueReconcileAuthority, 'EXISTING_GOVERNED_TASK_QUEUE');
  assert.equal(result.payload.nextStepId, null);
  assert.equal(result.mutationPerformed, false);
});
