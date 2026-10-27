import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const { captureIntent } = await import('../src/governedWorkflow/intentCapture.js');
const { createGovernedContractSubstrate } = await import('../src/governedWorkflow/contractSubstrate.js');
const { createShadowExecutionEngine } = await import('../src/governedWorkflow/executionEngine.js');
const { dispatchCandidateWork } = await import('../src/governedContext/candidateContinuity.js');
const {
  evaluateGw58DocumentationDrift,
  planGw66TerminalReceiptRefresh,
  planGw67TaskVerifying,
  evaluateGw68TerminalVerification,
  planGw69TaskDone,
  planGw70TerminalCheckpoint,
  planGw71LockRelease,
  planGw72SessionCloseAndQueueReconcile
} = await import('../src/governedWorkflow/terminal/index.js');

async function loadCanonicalSubstrate() {
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

const FAKE_SHA = 'a'.repeat(40);
const FAKE_DIGEST = 'b'.repeat(64);
const FAKE_UUID = '00000000-0000-4000-8000-000000000001';
const FAKE_UUID_2 = '00000000-0000-4000-8000-000000000002';
const FAKE_LOCK_UUID = '00000000-0000-4000-8000-000000000003';
const FAKE_TASK_ID = 'TASK-20261027-001';
const NOW = '2026-10-27T12:00:00+00:00';

test('GWC-PRE-F-02: full candidate happy path — Intent through terminal DONE', async (t) => {

  await t.test('Step 1: captureIntent produces INTENT_CAPTURED', () => {
    const result = captureIntent({
      rawIntent: 'Deploy wealthtech portfolio rebalancing module',
      source: 'claude',
      receivedAt: NOW
    });
    assert.equal(result.status, 'INTENT_CAPTURED');
    assert.equal(result.reasonCode, null);
    assert.equal(result.authorizationInferred, false);
    assert.ok(result.normalizedIntent);
    assert.ok(result.intentDigest);
    assert.equal(result.source, 'claude');
  });

  await t.test('Step 2: createGovernedContractSubstrate loads 73 contracts', async () => {
    const substrate = await loadCanonicalSubstrate();
    assert.equal(substrate.contractCount, 73);
    assert.equal(substrate.entry, 'GW-01');
    assert.equal(substrate.runtimeTerminal, 'GW-72');
    assert.ok(substrate.contractRegistryDigest);
    assert.ok(substrate.graphRegistryDigest);
    const gw01 = substrate.resolve('GW-01');
    assert.ok(gw01);
    assert.equal(gw01.stepId, 'GW-01');
  });

  await t.test('Step 3: createShadowExecutionEngine evaluates steps', async () => {
    const substrate = await loadCanonicalSubstrate();
    const engine = createShadowExecutionEngine({ substrate });
    const frame = engine.evaluate({
      stepId: 'GW-01',
      evidence: {
        freshness: 'CURRENT',
        observedAt: NOW,
        digest: FAKE_DIGEST,
        reasonCodes: []
      },
      previousFrameDigest: null
    });
    assert.ok(['ROUTE', 'WAIT_EXTERNAL', 'COMPLETE'].includes(frame.disposition));
    assert.ok(frame.frame);
    assert.equal(frame.frame.schemaVersion, 1);
    assert.equal(frame.frame.stepId, 'GW-01');
    assert.equal(frame.effectDispatched, false);
    assert.equal(frame.dispatchMode, 'DISABLED');
  });

  await t.test('Step 4: dispatchCandidateWork assigns eligible work', () => {
    const result = dispatchCandidateWork({
      candidateSessionId: 'session-happy-path',
      agentIdentity: 'claude-test',
      workItems: [
        {
          workItemId: 'WI-001',
          intentKeys: ['deploy-rebalancing'],
          title: 'Deploy rebalancing module',
          status: 'DONE',
          priority: 100,
          sequence: 0,
          dependencies: [],
          collisionDomains: ['deploy']
        },
        {
          workItemId: 'WI-002',
          intentKeys: ['verify-rebalancing'],
          title: 'Verify rebalancing module',
          status: 'READY',
          priority: 90,
          sequence: 1,
          dependencies: ['WI-001'],
          collisionDomains: ['verify']
        }
      ],
      activeClaims: []
    });
    assert.equal(result.status, 'ASSIGN');
    assert.ok(result.workItem);
    assert.equal(result.workItem.workItemId, 'WI-002');
    assert.equal(result.reasonCode, 'next_eligible_candidate_work');
  });

  await t.test('Step 5: GW-58 evaluates documentation drift (no drift → skip to GW-66)', async () => {
    const substrate = await loadCanonicalSubstrate();
    const gw58 = evaluateGw58DocumentationDrift({
      expectedHeadSha: FAKE_SHA,
      documentation: {
        status: 'ALIGNED',
        drift: false,
        observedAt: NOW,
        trackedHeadSha: FAKE_SHA
      }
    }, substrate);
    assert.equal(gw58.status, 'SUCCESS');
    assert.equal(gw58.contract.stepId, 'GW-58');
    assert.equal(gw58.authorizationInferred, false);
    assert.equal(gw58.mutationPerformed, false);
    assert.equal(gw58.payload.documentationRequired, false);
    assert.equal(gw58.payload.nextStepId, 'GW-66');
  });

  await t.test('Step 6: GW-66 plans receipt refresh', async () => {
    const substrate = await loadCanonicalSubstrate();
    const gw66 = planGw66TerminalReceiptRefresh({
      governedSessionId: FAKE_UUID,
      expectedSessionRevision: 1,
      expectedStateVersion: 1,
      receipt: {
        bootstrapReceiptId: FAKE_UUID_2,
        stateVersion: 1,
        runtimeRevision: FAKE_SHA
      },
      finalRuntimeSha: FAKE_SHA
    }, substrate);
    assert.equal(gw66.contract.stepId, 'GW-66');
    assert.equal(gw66.status, 'SUCCESS');
    assert.equal(gw66.authorizationInferred, false);
    assert.equal(gw66.mutationPerformed, false);
    assert.equal(gw66.payload.receiptRefreshRequired, false);
    assert.equal(gw66.payload.nextStepId, 'GW-67');
  });

  await t.test('Step 7: GW-67 plans task verifying (from DEPLOYING)', async () => {
    const substrate = await loadCanonicalSubstrate();
    const gw67 = planGw67TaskVerifying({
      taskId: FAKE_TASK_ID,
      expectedTaskRevision: 1,
      governedSessionId: FAKE_UUID,
      expectedSessionRevision: 1,
      expectedBootstrapReceiptId: FAKE_UUID_2,
      expectedStateVersion: 1,
      observedHeadSha: FAKE_SHA,
      runtimeRevision: FAKE_SHA,
      currentTaskStatus: 'DEPLOYING'
    }, substrate);
    assert.equal(gw67.contract.stepId, 'GW-67');
    assert.equal(gw67.status, 'READY');
    assert.equal(gw67.authorizationInferred, false);
    assert.equal(gw67.mutationPerformed, false);
    assert.equal(gw67.payload.targetStatus, 'VERIFYING');
    assert.equal(gw67.payload.nextStepId, 'GW-68');
    assert.ok(gw67.effectPlan);
    assert.equal(gw67.effectPlan.toolName, 'mcp_transition_governed_task');
  });

  await t.test('Step 8: GW-68 evaluates terminal verification', async () => {
    const substrate = await loadCanonicalSubstrate();
    const gw68 = evaluateGw68TerminalVerification({
      taskId: FAKE_TASK_ID,
      taskStatus: 'VERIFYING',
      governedSessionId: FAKE_UUID,
      bootstrapReceiptId: FAKE_UUID_2,
      receiptStateVersion: 1,
      expectedHeadSha: FAKE_SHA,
      expectedRuntimeRevision: FAKE_SHA,
      liveState: {
        stateVersion: 1,
        freshness: 'CURRENT',
        ageSeconds: 10,
        maxAgeSeconds: 300,
        githubHead: FAKE_SHA,
        s1Head: FAKE_SHA,
        runtimeRevision: FAKE_SHA,
        globalAlignment: 'FULLY_ALIGNED',
        documentationStatus: 'ALIGNED',
        documentationDrift: false,
        contradictions: [],
        observedAt: NOW
      },
      documentation: {
        status: 'ALIGNED',
        drift: false,
        observedAt: NOW,
        trackedHeadSha: FAKE_SHA
      },
      terminalEvidence: {
        task: {
          taskId: FAKE_TASK_ID,
          taskRevision: 2,
          status: 'VERIFYING',
          ownerGovernedSessionId: FAKE_UUID,
          observedHeadSha: FAKE_SHA,
          runtimeRevision: FAKE_SHA
        },
        receipt: {
          bootstrapReceiptId: FAKE_UUID_2,
          stateVersion: 1,
          runtimeRevision: FAKE_SHA
        },
        ci: {
          runId: 1000,
          headSha: FAKE_SHA,
          conclusion: 'success'
        },
        deployment: {
          jobId: 'deploy-001',
          ciRunId: 1000,
          headSha: FAKE_SHA,
          runtimeRevision: FAKE_SHA,
          result: 'succeeded'
        },
        review: {
          pullRequestNumber: 95,
          headSha: FAKE_SHA,
          approved: true,
          unresolvedThreads: 0
        },
        locks: {
          ownActiveLockCount: 1,
          foreignConflictingLockCount: 0
        }
      }
    }, substrate);
    assert.equal(gw68.contract.stepId, 'GW-68');
    assert.equal(gw68.status, 'SUCCESS');
    assert.equal(gw68.payload.terminalVerified, true);
    assert.equal(gw68.payload.nextStepId, 'GW-69');
    assert.equal(gw68.authorizationInferred, false);
    assert.equal(gw68.mutationPerformed, false);
  });

  await t.test('Step 9: GW-69 plans task DONE after successful verification', async () => {
    const substrate = await loadCanonicalSubstrate();
    const evidenceDigest = createHash('sha256').update('test-evidence').digest('hex');
    const gw69 = planGw69TaskDone({
      taskId: FAKE_TASK_ID,
      expectedTaskRevision: 3,
      governedSessionId: FAKE_UUID,
      expectedSessionRevision: 2,
      expectedBootstrapReceiptId: FAKE_UUID_2,
      expectedStateVersion: 1,
      expectedHeadSha: FAKE_SHA,
      terminalVerification: {
        status: 'SUCCESS',
        terminalVerified: true,
        taskId: FAKE_TASK_ID,
        governedSessionId: FAKE_UUID,
        bootstrapReceiptId: FAKE_UUID_2,
        stateVersion: 1,
        headSha: FAKE_SHA,
        runtimeRevision: FAKE_SHA,
        evidenceDigest
      }
    }, substrate);
    assert.equal(gw69.contract.stepId, 'GW-69');
    assert.equal(gw69.status, 'READY');
    assert.equal(gw69.payload.targetStatus, 'DONE');
    assert.equal(gw69.payload.nextStepId, 'GW-70');
    assert.ok(gw69.effectPlan);
    assert.equal(gw69.effectPlan.toolName, 'mcp_transition_governed_task');
    assert.equal(gw69.authorizationInferred, false);
    assert.equal(gw69.mutationPerformed, false);
  });

  await t.test('Step 10: GW-70 plans terminal checkpoint', async () => {
    const substrate = await loadCanonicalSubstrate();
    const gw70 = planGw70TerminalCheckpoint({
      governedSessionId: FAKE_UUID,
      expectedSessionRevision: 3,
      expectedStateVersion: 1,
      taskId: FAKE_TASK_ID,
      taskStatus: 'DONE',
      observedHeadSha: FAKE_SHA,
      pullRequestNumber: 95
    }, substrate);
    assert.equal(gw70.contract.stepId, 'GW-70');
    assert.equal(gw70.status, 'READY');
    assert.equal(gw70.payload.nextStepId, 'GW-71');
    assert.ok(gw70.effectPlan);
    assert.equal(gw70.effectPlan.toolName, 'mcp_create_governed_checkpoint');
    assert.equal(gw70.authorizationInferred, false);
    assert.equal(gw70.mutationPerformed, false);
  });

  await t.test('Step 11: GW-71 plans lock release', async () => {
    const substrate = await loadCanonicalSubstrate();
    const gw71 = planGw71LockRelease({
      governedSessionId: FAKE_UUID,
      checkpointCreated: true,
      taskOutcome: 'DONE',
      locks: [
        {
          lockId: FAKE_LOCK_UUID,
          lockRevision: 1,
          status: 'ACTIVE'
        }
      ]
    }, substrate);
    assert.equal(gw71.contract.stepId, 'GW-71');
    assert.equal(gw71.status, 'READY');
    assert.equal(gw71.payload.activeLockCount, 1);
    assert.equal(gw71.payload.nextStepId, 'GW-72');
    assert.equal(gw71.effectPlans.length, 1);
    assert.equal(gw71.effectPlans[0].toolName, 'mcp_release_governed_lock');
    assert.equal(gw71.authorizationInferred, false);
    assert.equal(gw71.mutationPerformed, false);
  });

  await t.test('Step 12: GW-72 plans session close and queue reconcile — DONE', async () => {
    const substrate = await loadCanonicalSubstrate();
    const gw72 = planGw72SessionCloseAndQueueReconcile({
      governedSessionId: FAKE_UUID,
      expectedSessionRevision: 4,
      checkpointCreated: true,
      activeLockCount: 0,
      taskId: FAKE_TASK_ID,
      taskStatus: 'DONE'
    }, substrate);
    assert.equal(gw72.contract.stepId, 'GW-72');
    assert.equal(gw72.status, 'READY');
    assert.ok(gw72.effectPlan);
    assert.equal(gw72.effectPlan.toolName, 'mcp_close_governed_session');
    assert.equal(gw72.authorizationInferred, false);
    assert.equal(gw72.mutationPerformed, false);
  });

  await t.test('Step 13: dispatchCandidateWork returns COMPLETE when all items DONE', () => {
    const result = dispatchCandidateWork({
      candidateSessionId: 'session-happy-path',
      agentIdentity: 'claude-test',
      workItems: [
        {
          workItemId: 'WI-001',
          intentKeys: ['deploy-rebalancing'],
          title: 'Deploy rebalancing module',
          status: 'DONE',
          priority: 100,
          sequence: 0,
          dependencies: [],
          collisionDomains: ['deploy']
        },
        {
          workItemId: 'WI-002',
          intentKeys: ['verify-rebalancing'],
          title: 'Verify rebalancing module',
          status: 'DONE',
          priority: 90,
          sequence: 1,
          dependencies: ['WI-001'],
          collisionDomains: ['verify']
        }
      ],
      activeClaims: []
    });
    assert.equal(result.status, 'COMPLETE');
    assert.equal(result.reasonCode, 'candidate_program_complete');
    assert.equal(result.workItem, null);
  });
});
