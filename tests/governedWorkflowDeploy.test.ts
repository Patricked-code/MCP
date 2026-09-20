import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { createGovernedContractSubstrate } from '../src/governedWorkflow/contractSubstrate.js';

const NOW = '2026-09-19T10:55:00.000Z';
const OLD = '2026-09-19T09:00:00.000Z';
const HEAD = 'a'.repeat(40);
const OTHER_HEAD = 'b'.repeat(40);
const TASK_ID = 'TASK-20260919-950';
const SESSION_ID = '11111111-1111-4111-8111-111111111111';
const RECEIPT_ID = '22222222-2222-4222-8222-222222222222';

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

async function deployment() {
  return import('../src/governedWorkflow/deploy/index.js');
}

function mainCi(overrides: Record<string, unknown> = {}) {
  return {
    runId: 1500,
    workflow: 'MCP CI',
    event: 'push',
    headSha: HEAD,
    status: 'completed',
    conclusion: 'success',
    observedAt: OLD,
    ...overrides
  };
}

function deployRun(overrides: Record<string, unknown> = {}) {
  return {
    runId: 2500,
    jobId: 'mcp-s1-2500-aaaaaaaaaaaa',
    workflow: 'MCP Governed Deploy',
    event: 'push',
    headSha: HEAD,
    status: 'completed',
    conclusion: 'success',
    observedAt: NOW,
    ...overrides
  };
}

function attestation(overrides: Record<string, unknown> = {}) {
  return {
    schemaVersion: 2,
    attestationId: 's1:2500:aaaaaaaaaaaa',
    jobId: 'mcp-s1-2500-aaaaaaaaaaaa',
    requestedSha: HEAD,
    previousGitSha: OTHER_HEAD,
    runtimeRevision: HEAD,
    result: 'succeeded',
    phase: 'attested',
    rollbackStatus: 'not_needed',
    healthOk: true,
    oauthOk: true,
    mcpAuthOk: true,
    admission: {
      kind: 'push_ci_gate',
      ciRunId: 1500,
      ciHeadSha: HEAD,
      ciConclusion: 'success'
    },
    endedAt: NOW,
    ...overrides
  };
}

function liveState(overrides: Record<string, unknown> = {}) {
  return {
    stateVersion: 300,
    generatedAt: NOW,
    lastReconciledAt: NOW,
    maxAgeSeconds: 60,
    freshness: 'CURRENT',
    ageSeconds: 5,
    githubHead: HEAD,
    s1Head: HEAD,
    runtimeRevision: HEAD,
    globalAlignment: 'FULLY_ALIGNED',
    contradictions: [],
    ...overrides
  };
}

test('GW-44 observes the exact main merge commit and rejects a different main head', async () => {
  const { observeGw44MainMergeCommit } = await deployment();
  const contracts = await substrate();
  const ok = observeGw44MainMergeCommit({
    repository: 'Patricked-code/MCP',
    expectedMergeSha: HEAD,
    mainHeadSha: HEAD,
    observedAt: NOW
  }, contracts);
  assert.equal(ok.status, 'SUCCESS');
  assert.equal(ok.payload.nextStepId, 'GW-45');

  const stale = observeGw44MainMergeCommit({
    repository: 'Patricked-code/MCP',
    expectedMergeSha: HEAD,
    mainHeadSha: OTHER_HEAD,
    observedAt: NOW
  }, contracts);
  assert.equal(stale.status, 'CONFLICT');
  assert.deepEqual(stale.reasonCodes, ['MAIN_HEAD_MISMATCH']);
});

test('GW-45 requires successful MCP CI on the identical main SHA and treats pending as external wait', async () => {
  const { observeGw45MainCi } = await deployment();
  const contracts = await substrate();
  const ok = observeGw45MainCi({ expectedHeadSha: HEAD, ci: mainCi() }, contracts);
  assert.equal(ok.status, 'SUCCESS');
  assert.equal(ok.payload.runId, 1500);
  assert.equal(ok.payload.nextStepId, 'GW-46');

  const pending = observeGw45MainCi({
    expectedHeadSha: HEAD,
    ci: mainCi({ status: 'in_progress', conclusion: null })
  }, contracts);
  assert.equal(pending.status, 'UNVERIFIED');
  assert.deepEqual(pending.reasonCodes, ['MAIN_CI_PENDING']);

  const wrong = observeGw45MainCi({
    expectedHeadSha: HEAD,
    ci: mainCi({ headSha: OTHER_HEAD })
  }, contracts);
  assert.equal(wrong.status, 'CONFLICT');
  assert.deepEqual(wrong.reasonCodes, ['MAIN_CI_HEAD_MISMATCH']);
});

test('GW-46 observes the governed deploy run only after exact-SHA CI success', async () => {
  const { observeGw45MainCi, observeGw46GovernedAutodeploy } = await deployment();
  const contracts = await substrate();
  const ciProof = observeGw45MainCi({ expectedHeadSha: HEAD, ci: mainCi() }, contracts);
  const result = observeGw46GovernedAutodeploy({
    expectedHeadSha: HEAD,
    ciProof,
    deploy: deployRun()
  }, contracts);
  assert.equal(result.status, 'SUCCESS');
  assert.equal(result.payload.jobId, 'mcp-s1-2500-aaaaaaaaaaaa');
  assert.deepEqual(result.payload.nextStepIds, ['GW-47', 'GW-48', 'GW-49', 'GW-50', 'GW-51', 'GW-52']);
});

test('GW-47 proves GitHub-to-S1 synchronization from the exact deployment attestation', async () => {
  const { observeGw47GithubToS1Sync } = await deployment();
  const result = observeGw47GithubToS1Sync({
    expectedHeadSha: HEAD,
    attestation: attestation()
  }, await substrate());
  assert.equal(result.status, 'SUCCESS');
  assert.equal(result.payload.requestedSha, HEAD);
  assert.equal(result.payload.nextStepId, 'GW-48');
});

test('GW-48 accepts build evidence only from the same deployment job and exact SHA', async () => {
  const { observeGw48DeployBuild } = await deployment();
  const result = observeGw48DeployBuild({
    expectedHeadSha: HEAD,
    expectedJobId: 'mcp-s1-2500-aaaaaaaaaaaa',
    evidence: {
      jobId: 'mcp-s1-2500-aaaaaaaaaaaa',
      requestedSha: HEAD,
      buildOk: true,
      observedAt: NOW
    }
  }, await substrate());
  assert.equal(result.status, 'SUCCESS');
  assert.equal(result.payload.nextStepId, 'GW-49');
});

test('GW-49 runtime start evidence is exact-job and exact-SHA bound', async () => {
  const { observeGw49RuntimeStart } = await deployment();
  const result = observeGw49RuntimeStart({
    expectedHeadSha: HEAD,
    expectedJobId: 'mcp-s1-2500-aaaaaaaaaaaa',
    evidence: {
      jobId: 'mcp-s1-2500-aaaaaaaaaaaa',
      requestedSha: HEAD,
      runtimeStarted: true,
      observedAt: NOW
    }
  }, await substrate());
  assert.equal(result.status, 'SUCCESS');
  assert.equal(result.payload.nextStepId, 'GW-50');
});

test('GW-50 requires health, OAuth and MCP authentication checks from the same deployment', async () => {
  const { observeGw50Health } = await deployment();
  const result = observeGw50Health({
    expectedHeadSha: HEAD,
    attestation: attestation()
  }, await substrate());
  assert.equal(result.status, 'SUCCESS');
  assert.equal(result.payload.healthOk, true);
  assert.equal(result.payload.nextStepId, 'GW-51');
});

test('GW-51 requires the running image/runtime revision to equal the deployment SHA', async () => {
  const { observeGw51RuntimeImage } = await deployment();
  const result = observeGw51RuntimeImage({
    expectedHeadSha: HEAD,
    expectedJobId: 'mcp-s1-2500-aaaaaaaaaaaa',
    runtimeRevision: HEAD,
    observedAt: NOW
  }, await substrate());
  assert.equal(result.status, 'SUCCESS');
  assert.equal(result.payload.runtimeRevision, HEAD);
  assert.equal(result.payload.nextStepId, 'GW-52');
});

test('GW-52 composes immutable exact-SHA evidence with Live State own freshness policy', async () => {
  const {
    observeGw45MainCi,
    observeGw47GithubToS1Sync,
    observeGw48DeployBuild,
    observeGw49RuntimeStart,
    observeGw50Health,
    observeGw51RuntimeImage,
    composeGw52ExactDeploymentProof
  } = await deployment();
  const contracts = await substrate();
  const proof = composeGw52ExactDeploymentProof({
    expectedHeadSha: HEAD,
    ciProof: observeGw45MainCi({ expectedHeadSha: HEAD, ci: mainCi({ observedAt: OLD }) }, contracts),
    syncProof: observeGw47GithubToS1Sync({ expectedHeadSha: HEAD, attestation: attestation() }, contracts),
    buildProof: observeGw48DeployBuild({
      expectedHeadSha: HEAD,
      expectedJobId: 'mcp-s1-2500-aaaaaaaaaaaa',
      evidence: { jobId: 'mcp-s1-2500-aaaaaaaaaaaa', requestedSha: HEAD, buildOk: true, observedAt: NOW }
    }, contracts),
    runtimeStartProof: observeGw49RuntimeStart({
      expectedHeadSha: HEAD,
      expectedJobId: 'mcp-s1-2500-aaaaaaaaaaaa',
      evidence: { jobId: 'mcp-s1-2500-aaaaaaaaaaaa', requestedSha: HEAD, runtimeStarted: true, observedAt: NOW }
    }, contracts),
    healthProof: observeGw50Health({ expectedHeadSha: HEAD, attestation: attestation() }, contracts),
    imageProof: observeGw51RuntimeImage({
      expectedHeadSha: HEAD,
      expectedJobId: 'mcp-s1-2500-aaaaaaaaaaaa',
      runtimeRevision: HEAD,
      observedAt: NOW
    }, contracts),
    liveState: liveState()
  }, contracts);
  assert.equal(proof.status, 'SUCCESS');
  assert.equal(proof.payload.runtimeRevision, HEAD);
  assert.equal(proof.payload.nextStepId, 'GW-53');

  const stale = composeGw52ExactDeploymentProof({
    expectedHeadSha: HEAD,
    ciProof: observeGw45MainCi({ expectedHeadSha: HEAD, ci: mainCi({ observedAt: OLD }) }, contracts),
    syncProof: observeGw47GithubToS1Sync({ expectedHeadSha: HEAD, attestation: attestation() }, contracts),
    buildProof: observeGw48DeployBuild({
      expectedHeadSha: HEAD,
      expectedJobId: 'mcp-s1-2500-aaaaaaaaaaaa',
      evidence: { jobId: 'mcp-s1-2500-aaaaaaaaaaaa', requestedSha: HEAD, buildOk: true, observedAt: NOW }
    }, contracts),
    runtimeStartProof: observeGw49RuntimeStart({
      expectedHeadSha: HEAD,
      expectedJobId: 'mcp-s1-2500-aaaaaaaaaaaa',
      evidence: { jobId: 'mcp-s1-2500-aaaaaaaaaaaa', requestedSha: HEAD, runtimeStarted: true, observedAt: NOW }
    }, contracts),
    healthProof: observeGw50Health({ expectedHeadSha: HEAD, attestation: attestation() }, contracts),
    imageProof: observeGw51RuntimeImage({
      expectedHeadSha: HEAD,
      expectedJobId: 'mcp-s1-2500-aaaaaaaaaaaa',
      runtimeRevision: HEAD,
      observedAt: NOW
    }, contracts),
    liveState: liveState({ freshness: 'STALE', ageSeconds: 61 })
  }, contracts);
  assert.equal(stale.status, 'STALE');
  assert.deepEqual(stale.reasonCodes, ['LIVE_STATE_STALE']);
});

test('GW-53 requires a reconciled current Live State that reflects the exact deployment proof', async () => {
  const { observeGw53LiveStateUpdate } = await deployment();
  const result = observeGw53LiveStateUpdate({
    expectedHeadSha: HEAD,
    exactDeploymentProof: {
      status: 'SUCCESS',
      headSha: HEAD,
      runtimeRevision: HEAD,
      stateVersion: 300
    },
    liveState: liveState()
  }, await substrate());
  assert.equal(result.status, 'SUCCESS');
  assert.equal(result.payload.stateVersion, 300);
  assert.equal(result.payload.nextStepId, 'GW-54');
});

test('GW-54 routes stale bootstrap receipts to refresh and current receipts directly to runtime binding', async () => {
  const { evaluateGw54ReceiptFreshness } = await deployment();
  const contracts = await substrate();
  const stale = evaluateGw54ReceiptFreshness({
    receipt: { bootstrapReceiptId: RECEIPT_ID, stateVersion: 299, runtimeRevision: OTHER_HEAD },
    liveState: liveState()
  }, contracts);
  assert.equal(stale.status, 'STALE');
  assert.equal(stale.payload.nextStepId, 'GW-55');

  const current = evaluateGw54ReceiptFreshness({
    receipt: { bootstrapReceiptId: RECEIPT_ID, stateVersion: 300, runtimeRevision: HEAD },
    liveState: liveState()
  }, contracts);
  assert.equal(current.status, 'SUCCESS');
  assert.equal(current.payload.nextStepId, 'GW-56');
});

test('GW-55 plans the existing governed-context acknowledgement instead of inventing a receipt authority', async () => {
  const { planGw55ReceiptRefresh } = await deployment();
  const result = planGw55ReceiptRefresh({
    governedSessionId: SESSION_ID,
    expectedSessionRevision: 9,
    expectedStateVersion: 300,
    receiptFreshness: {
      status: 'STALE',
      currentStateVersion: 300,
      receiptStateVersion: 299
    }
  }, await substrate());
  assert.equal(result.status, 'READY');
  assert.equal(result.effectPlan?.toolName, 'mcp_acknowledge_governed_context');
  assert.equal(result.effectPlan?.payload.expectedStateVersion, 300);
});

test('GW-56 derives an exact runtime binding only from current receipt and deployment proof', async () => {
  const { deriveGw56TaskRuntimeRevisionBinding } = await deployment();
  const result = deriveGw56TaskRuntimeRevisionBinding({
    taskId: TASK_ID,
    expectedTaskRevision: 12,
    governedSessionId: SESSION_ID,
    expectedSessionRevision: 10,
    bootstrapReceiptId: RECEIPT_ID,
    receiptStateVersion: 300,
    liveStateVersion: 300,
    deploymentHeadSha: HEAD,
    runtimeRevision: HEAD
  }, await substrate());
  assert.equal(result.status, 'SUCCESS');
  assert.equal(result.payload.runtimeRevision, HEAD);
  assert.equal(result.payload.nextStepId, 'GW-57');
  assert.equal(result.effectPlan, null);
});

test('GW-57 plans DEPLOYING and runtimeRevision as one governed Task transition', async () => {
  const { planGw57TaskDeploying } = await deployment();
  const result = planGw57TaskDeploying({
    taskId: TASK_ID,
    expectedTaskRevision: 12,
    governedSessionId: SESSION_ID,
    expectedSessionRevision: 10,
    expectedBootstrapReceiptId: RECEIPT_ID,
    expectedStateVersion: 300,
    binding: {
      taskId: TASK_ID,
      taskRevision: 12,
      governedSessionId: SESSION_ID,
      sessionRevision: 10,
      bootstrapReceiptId: RECEIPT_ID,
      stateVersion: 300,
      runtimeRevision: HEAD
    }
  }, await substrate());
  assert.equal(result.status, 'READY');
  assert.equal(result.effectPlan?.toolName, 'mcp_transition_governed_task');
  assert.equal(result.effectPlan?.payload.status, 'DEPLOYING');
  assert.equal(result.effectPlan?.payload.runtimeRevision, HEAD);
  assert.equal(result.payload.nextStepId, 'GW-58');
});


test('GWC-15 self-review: GW-52 rejects same-SHA evidence mixed across deployment jobs', async () => {
  const {
    observeGw45MainCi,
    observeGw47GithubToS1Sync,
    observeGw48DeployBuild,
    observeGw49RuntimeStart,
    observeGw50Health,
    observeGw51RuntimeImage,
    composeGw52ExactDeploymentProof
  } = await deployment();
  const contracts = await substrate();
  const otherJob = 'mcp-s1-2501-aaaaaaaaaaaa';

  const mixed = composeGw52ExactDeploymentProof({
    expectedHeadSha: HEAD,
    ciProof: observeGw45MainCi({ expectedHeadSha: HEAD, ci: mainCi() }, contracts),
    syncProof: observeGw47GithubToS1Sync({
      expectedHeadSha: HEAD,
      attestation: attestation({ jobId: otherJob })
    }, contracts),
    buildProof: observeGw48DeployBuild({
      expectedHeadSha: HEAD,
      expectedJobId: 'mcp-s1-2500-aaaaaaaaaaaa',
      evidence: {
        jobId: 'mcp-s1-2500-aaaaaaaaaaaa',
        requestedSha: HEAD,
        buildOk: true,
        observedAt: NOW
      }
    }, contracts),
    runtimeStartProof: observeGw49RuntimeStart({
      expectedHeadSha: HEAD,
      expectedJobId: 'mcp-s1-2500-aaaaaaaaaaaa',
      evidence: {
        jobId: 'mcp-s1-2500-aaaaaaaaaaaa',
        requestedSha: HEAD,
        runtimeStarted: true,
        observedAt: NOW
      }
    }, contracts),
    healthProof: observeGw50Health({ expectedHeadSha: HEAD, attestation: attestation() }, contracts),
    imageProof: observeGw51RuntimeImage({
      expectedHeadSha: HEAD,
      expectedJobId: 'mcp-s1-2500-aaaaaaaaaaaa',
      runtimeRevision: HEAD,
      observedAt: NOW
    }, contracts),
    liveState: liveState()
  }, contracts);

  assert.equal(mixed.status, 'CONFLICT');
  assert.deepEqual(mixed.reasonCodes, ['DEPLOYMENT_JOB_MISMATCH']);
});

test('GWC-15 self-review: GW-52 binds attested CI run to the exact GW-45 MainCiProof', async () => {
  const {
    observeGw45MainCi,
    observeGw47GithubToS1Sync,
    observeGw48DeployBuild,
    observeGw49RuntimeStart,
    observeGw50Health,
    observeGw51RuntimeImage,
    composeGw52ExactDeploymentProof
  } = await deployment();
  const contracts = await substrate();

  const wrongCiAttestation = attestation({
    admission: {
      kind: 'push_ci_gate',
      ciRunId: 1501,
      ciHeadSha: HEAD,
      ciConclusion: 'success'
    }
  });

  const mixed = composeGw52ExactDeploymentProof({
    expectedHeadSha: HEAD,
    ciProof: observeGw45MainCi({ expectedHeadSha: HEAD, ci: mainCi({ runId: 1500 }) }, contracts),
    syncProof: observeGw47GithubToS1Sync({
      expectedHeadSha: HEAD,
      attestation: wrongCiAttestation
    }, contracts),
    buildProof: observeGw48DeployBuild({
      expectedHeadSha: HEAD,
      expectedJobId: 'mcp-s1-2500-aaaaaaaaaaaa',
      evidence: {
        jobId: 'mcp-s1-2500-aaaaaaaaaaaa',
        requestedSha: HEAD,
        buildOk: true,
        observedAt: NOW
      }
    }, contracts),
    runtimeStartProof: observeGw49RuntimeStart({
      expectedHeadSha: HEAD,
      expectedJobId: 'mcp-s1-2500-aaaaaaaaaaaa',
      evidence: {
        jobId: 'mcp-s1-2500-aaaaaaaaaaaa',
        requestedSha: HEAD,
        runtimeStarted: true,
        observedAt: NOW
      }
    }, contracts),
    healthProof: observeGw50Health({ expectedHeadSha: HEAD, attestation: wrongCiAttestation }, contracts),
    imageProof: observeGw51RuntimeImage({
      expectedHeadSha: HEAD,
      expectedJobId: 'mcp-s1-2500-aaaaaaaaaaaa',
      runtimeRevision: HEAD,
      observedAt: NOW
    }, contracts),
    liveState: liveState()
  }, contracts);

  assert.equal(mixed.status, 'CONFLICT');
  assert.deepEqual(mixed.reasonCodes, ['DEPLOYMENT_CI_RUN_MISMATCH']);
});
