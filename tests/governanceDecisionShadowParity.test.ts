import assert from 'node:assert/strict';
import test from 'node:test';

process.env.MCP_AUTH_TOKEN ??= 'mcp-unit-test-value-20260805-abcdef';
process.env.S1_HOST ??= '127.0.0.1';
process.env.S1_KEY_PATH ??= '/tmp/mcp-unit-test-s1-key';
process.env.S2_HOST ??= '127.0.0.1';
process.env.S2_KEY_PATH ??= '/tmp/mcp-unit-test-s2-key';

const { deriveGovernancePreconditionReasons } = await import('../src/governance/operationalDecision.js');
const { deriveShadowWriteDecision } = await import('../src/governance/scopedWriteGate.js');

const SESSION_ID = '11111111-1111-4111-8111-111111111111';

type Case = {
  expectedReason: string;
  expectedVerdict: string;
  input: Parameters<typeof deriveGovernancePreconditionReasons>[0];
};

const cases: Case[] = [
  {
    expectedReason: 'SESSION_UNBOUND',
    expectedVerdict: 'session_unbound',
    input: { sessionPresent: false, currentStateVersion: 9, currentFreshness: 'CURRENT', acknowledgedStateVersion: null, activeLockConflicts: 0 }
  },
  {
    expectedReason: 'CONTEXT_UNACKNOWLEDGED',
    expectedVerdict: 'context_unacknowledged',
    input: { sessionPresent: true, currentStateVersion: 9, currentFreshness: 'CURRENT', acknowledgedStateVersion: null, activeLockConflicts: 0 }
  },
  {
    expectedReason: 'STATE_VERSION_STALE',
    expectedVerdict: 'state_version_stale',
    input: { sessionPresent: true, currentStateVersion: 10, currentFreshness: 'CURRENT', acknowledgedStateVersion: 9, activeLockConflicts: 0 }
  },
  {
    expectedReason: 'LOCK_CONFLICT',
    expectedVerdict: 'lock_conflict',
    input: { sessionPresent: true, currentStateVersion: 9, currentFreshness: 'CURRENT', acknowledgedStateVersion: 9, activeLockConflicts: 1 }
  },
  {
    expectedReason: 'BOOTSTRAP_RECEIPT_MISSING',
    expectedVerdict: 'bootstrap_receipt_missing',
    input: { sessionPresent: true, currentStateVersion: 9, currentFreshness: 'CURRENT', acknowledgedStateVersion: 9, activeLockConflicts: 0, bootstrapReceiptStatus: 'MISSING' }
  },
  {
    expectedReason: 'BOOTSTRAP_RECEIPT_STALE',
    expectedVerdict: 'bootstrap_receipt_stale',
    input: { sessionPresent: true, currentStateVersion: 9, currentFreshness: 'CURRENT', acknowledgedStateVersion: 9, activeLockConflicts: 0, bootstrapReceiptStatus: 'STALE' }
  },
  {
    expectedReason: 'TASK_UNCLAIMED',
    expectedVerdict: 'task_unclaimed',
    input: { sessionPresent: true, currentStateVersion: 9, currentFreshness: 'CURRENT', acknowledgedStateVersion: 9, activeLockConflicts: 0, bootstrapReceiptStatus: 'CURRENT', currentTaskStatus: null }
  },
  {
    expectedReason: 'AUDIT_BASELINE_INVALID',
    expectedVerdict: 'audit_baseline_invalid',
    input: { sessionPresent: true, currentStateVersion: 9, currentFreshness: 'CURRENT', acknowledgedStateVersion: 9, activeLockConflicts: 0, bootstrapReceiptStatus: 'CURRENT', currentTaskStatus: 'IN_PROGRESS', auditBaselineValid: false }
  }
];

test('shared governance preconditions preserve the ordered legacy shadow verdicts', () => {
  for (const entry of cases) {
    const reasons = deriveGovernancePreconditionReasons(entry.input);
    assert.equal(reasons[0], entry.expectedReason);
    const shadow = deriveShadowWriteDecision({
      mode: 'shadow',
      toolName: 'parity_tool',
      governedSessionId: entry.input.sessionPresent ? SESSION_ID : null,
      currentStateVersion: entry.input.currentStateVersion,
      currentFreshness: entry.input.currentFreshness,
      acknowledgedStateVersion: entry.input.acknowledgedStateVersion,
      activeLockConflicts: entry.input.activeLockConflicts,
      bootstrapReceiptStatus: entry.input.bootstrapReceiptStatus,
      currentTaskStatus: entry.input.currentTaskStatus,
      auditBaselineValid: entry.input.auditBaselineValid
    });
    assert.equal(shadow.verdict, entry.expectedVerdict);
  }
});

test('shared governance preconditions are empty when shadow is ready', () => {
  const input = {
    sessionPresent: true,
    currentStateVersion: 9,
    currentFreshness: 'CURRENT' as const,
    acknowledgedStateVersion: 9,
    activeLockConflicts: 0,
    bootstrapReceiptStatus: 'CURRENT' as const,
    currentTaskStatus: 'IN_PROGRESS',
    auditBaselineValid: true
  };
  assert.deepEqual(deriveGovernancePreconditionReasons(input), []);
  const shadow = deriveShadowWriteDecision({
    mode: 'shadow',
    toolName: 'parity_tool',
    governedSessionId: SESSION_ID,
    currentStateVersion: 9,
    currentFreshness: 'CURRENT',
    acknowledgedStateVersion: 9,
    activeLockConflicts: 0,
    bootstrapReceiptStatus: 'CURRENT',
    currentTaskStatus: 'IN_PROGRESS',
    auditBaselineValid: true
  });
  assert.equal(shadow.verdict, 'shadow_ready');
  assert.equal(shadow.wouldBlock, false);
});
