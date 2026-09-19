import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const { createGovernedContractSubstrate } =
  await import('../src/governedWorkflow/contractSubstrate.js');
const { createShadowExecutionEngine } =
  await import('../src/governedWorkflow/executionEngine.js');

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

const OBSERVED_AT = '2026-09-19T02:30:00Z';
const EVIDENCE_DIGEST = 'a'.repeat(64);

test('GWC-2 builds an ephemeral frame and routes one pure PASS contract without dispatch', async () => {
  const engine = createShadowExecutionEngine({ substrate: await substrate() });
  const result = engine.evaluate({
    stepId: 'GW-01',
    evidence: {
      freshness: 'CURRENT',
      observedAt: OBSERVED_AT,
      digest: EVIDENCE_DIGEST,
      reasonCodes: []
    },
    previousFrameDigest: null
  });

  assert.equal(result.disposition, 'ROUTE');
  assert.equal(result.reasonCode, 'POSTCONDITION_PASS_ROUTE');
  assert.equal(result.nextStepId, 'GW-02');
  assert.equal(result.dispatchMode, 'DISABLED');
  assert.equal(result.effectDispatched, false);
  assert.equal(result.frame.stepId, 'GW-01');
  assert.equal(result.frame.contractVersion, 1);
  assert.equal(result.frame.effectPlan, null);
  assert.equal(result.frame.recoveryAnchor.stepId, 'GW-01');
  assert.equal(result.frame.recoveryAnchor.evidenceDigest, EVIDENCE_DIGEST);
  assert.match(result.frame.frameDigest, /^[0-9a-f]{64}$/);
  assert.equal(Object.isFrozen(result.frame), true);
  assert.equal(Object.isFrozen(result), true);
});

test('GWC-2 waits externally on stale or unavailable evidence and never guesses success', async () => {
  const engine = createShadowExecutionEngine({ substrate: await substrate() });
  for (const freshness of ['STALE', 'UNAVAILABLE'] as const) {
    const result = engine.evaluate({
      stepId: 'GW-01',
      evidence: {
        freshness,
        observedAt: OBSERVED_AT,
        digest: EVIDENCE_DIGEST,
        reasonCodes: [freshness === 'STALE' ? 'evidence_stale' : 'evidence_unavailable']
      },
      previousFrameDigest: null
    });
    assert.equal(result.disposition, 'WAIT_EXTERNAL');
    assert.equal(result.reasonCode, freshness === 'STALE' ? 'EVIDENCE_STALE' : 'EVIDENCE_UNAVAILABLE');
    assert.equal(result.nextStepId, null);
    assert.equal(result.effectDispatched, false);
  }
});

test('GWC-2 blocks an unknown contract locally without action or authority mutation', async () => {
  const engine = createShadowExecutionEngine({ substrate: await substrate() });
  const result = engine.evaluate({
    stepId: 'GW-99',
    evidence: {
      freshness: 'CURRENT',
      observedAt: OBSERVED_AT,
      digest: EVIDENCE_DIGEST,
      reasonCodes: []
    },
    previousFrameDigest: null
  });
  assert.equal(result.disposition, 'BLOCK_LOCAL');
  assert.equal(result.reasonCode, 'UNKNOWN_STEP_ID');
  assert.equal(result.nextStepId, null);
  assert.equal(result.frame.effectPlan, null);
  assert.equal(result.effectDispatched, false);
});

test('GWC-2 does not choose among multiple PASS routes without a contract-local condition proof', async () => {
  const engine = createShadowExecutionEngine({ substrate: await substrate() });
  const result = engine.evaluate({
    stepId: 'GW-02',
    evidence: {
      freshness: 'CURRENT',
      observedAt: OBSERVED_AT,
      digest: EVIDENCE_DIGEST,
      reasonCodes: []
    },
    previousFrameDigest: null
  });
  assert.equal(result.disposition, 'WAIT_EXTERNAL');
  assert.equal(result.reasonCode, 'ROUTE_CONDITION_REQUIRED');
  assert.equal(result.nextStepId, null);
  assert.equal(result.effectDispatched, false);
});

test('GWC-2 no-progress guard stops identical-frame replay until reobservation changes evidence', async () => {
  const engine = createShadowExecutionEngine({ substrate: await substrate() });
  const first = engine.evaluate({
    stepId: 'GW-01',
    evidence: {
      freshness: 'CURRENT',
      observedAt: OBSERVED_AT,
      digest: EVIDENCE_DIGEST,
      reasonCodes: []
    },
    previousFrameDigest: null
  });
  const repeated = engine.evaluate({
    stepId: 'GW-01',
    evidence: {
      freshness: 'CURRENT',
      observedAt: OBSERVED_AT,
      digest: EVIDENCE_DIGEST,
      reasonCodes: []
    },
    previousFrameDigest: first.frame.frameDigest
  });
  assert.equal(repeated.frame.frameDigest, first.frame.frameDigest);
  assert.equal(repeated.disposition, 'WAIT_EXTERNAL');
  assert.equal(repeated.reasonCode, 'NO_PROGRESS_REOBSERVE_REQUIRED');
  assert.equal(repeated.nextStepId, null);
  assert.equal(repeated.effectDispatched, false);

  const reobserved = engine.evaluate({
    stepId: 'GW-01',
    evidence: {
      freshness: 'CURRENT',
      observedAt: '2026-09-19T02:31:00Z',
      digest: 'b'.repeat(64),
      reasonCodes: []
    },
    previousFrameDigest: first.frame.frameDigest
  });
  assert.notEqual(reobserved.frame.frameDigest, first.frame.frameDigest);
  assert.equal(reobserved.disposition, 'ROUTE');
  assert.equal(reobserved.nextStepId, 'GW-02');
});

test('GWC-2 frame remains generic and contains no MCP session/task/runtime ownership', async () => {
  const engine = createShadowExecutionEngine({ substrate: await substrate() });
  const result = engine.evaluate({
    stepId: 'GW-01',
    evidence: {
      freshness: 'CURRENT',
      observedAt: OBSERVED_AT,
      digest: EVIDENCE_DIGEST,
      reasonCodes: []
    },
    previousFrameDigest: null
  });
  const serialized = JSON.stringify(result.frame);
  for (const forbidden of [
    'Patricked-code/MCP',
    'governedSessionId',
    'taskId',
    'storeRevision',
    'runtimeRevision',
    'transportSessionId'
  ]) {
    assert.equal(serialized.includes(forbidden), false, forbidden);
  }
});
