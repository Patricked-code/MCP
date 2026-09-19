import assert from 'node:assert/strict';
import test from 'node:test';

const {
  RAW_INTENT_MAX_BYTES,
  captureIntent
} = await import('../src/governedWorkflow/intentCapture.js');

const RECEIVED_AT = '2026-09-19T02:20:00Z';

test('GWC-1 captures bounded intent deterministically without classifying or authorizing it', () => {
  const input = {
    rawIntent: '  Continue   the PRECODE work\nwithout replaying completed work.  ',
    source: 'chatgpt' as const,
    receivedAt: RECEIVED_AT
  };
  const before = JSON.stringify(input);
  const first = captureIntent(input);
  const second = captureIntent({ ...input });

  assert.deepEqual(first, second);
  assert.equal(JSON.stringify(input), before);
  assert.equal(first.status, 'INTENT_CAPTURED');
  assert.equal(first.reasonCode, null);
  assert.equal(first.normalizedIntent, 'Continue the PRECODE work without replaying completed work.');
  assert.equal(first.source, 'chatgpt');
  assert.equal(first.receivedAt, RECEIVED_AT);
  assert.match(first.intentDigest!, /^[0-9a-f]{64}$/);
  assert.equal(first.authorizationInferred, false);
  assert.equal(Object.isFrozen(first), true);

  const keys = new Set(Object.keys(first));
  for (const forbidden of ['classification', 'taskId', 'repository', 'branch', 'capability', 'permission']) {
    assert.equal(keys.has(forbidden), false, forbidden);
  }
});

test('GWC-1 resolves OD-01 at 16,384 UTF-8 bytes and rejects overflow without truncation', () => {
  assert.equal(RAW_INTENT_MAX_BYTES, 16_384);
  const exact = 'a'.repeat(RAW_INTENT_MAX_BYTES);
  const accepted = captureIntent({
    rawIntent: exact,
    source: 'other',
    receivedAt: RECEIVED_AT
  });
  assert.equal(accepted.status, 'INTENT_CAPTURED');
  assert.equal(accepted.normalizedIntent, exact);
  assert.equal(accepted.rawIntentBytes, RAW_INTENT_MAX_BYTES);

  const rejected = captureIntent({
    rawIntent: exact + 'a',
    source: 'other',
    receivedAt: RECEIVED_AT
  });
  assert.deepEqual(rejected, {
    status: 'INTENT_REJECTED',
    reasonCode: 'RAW_INTENT_TOO_LARGE',
    normalizedIntent: null,
    source: 'other',
    receivedAt: RECEIVED_AT,
    rawIntentBytes: RAW_INTENT_MAX_BYTES + 1,
    intentDigest: null,
    authorizationInferred: false
  });
});

test('GWC-1 measures the raw bound in UTF-8 bytes rather than JavaScript characters', () => {
  const multiByte = 'é'.repeat(RAW_INTENT_MAX_BYTES / 2);
  assert.equal(Buffer.byteLength(multiByte, 'utf8'), RAW_INTENT_MAX_BYTES);
  assert.equal(captureIntent({
    rawIntent: multiByte,
    source: 'claude',
    receivedAt: RECEIVED_AT
  }).status, 'INTENT_CAPTURED');

  assert.equal(captureIntent({
    rawIntent: multiByte + 'é',
    source: 'claude',
    receivedAt: RECEIVED_AT
  }).reasonCode, 'RAW_INTENT_TOO_LARGE');
});

test('GWC-1 resolves OD-02 with the existing chatgpt|claude|other source vocabulary', () => {
  for (const source of ['chatgpt', 'claude', 'other'] as const) {
    const result = captureIntent({ rawIntent: 'continue', source, receivedAt: RECEIVED_AT });
    assert.equal(result.status, 'INTENT_CAPTURED');
    assert.equal(result.source, source);
  }
  const rejected = captureIntent({
    rawIntent: 'continue',
    source: 'unknown-provider',
    receivedAt: RECEIVED_AT
  });
  assert.equal(rejected.status, 'INTENT_REJECTED');
  assert.equal(rejected.reasonCode, 'SOURCE_UNSUPPORTED');
  assert.equal(rejected.authorizationInferred, false);
});

test('GWC-1 fails closed for empty intent or invalid receivedAt before any downstream mutation', () => {
  assert.deepEqual(captureIntent({
    rawIntent: '  \n\t ',
    source: 'chatgpt',
    receivedAt: RECEIVED_AT
  }), {
    status: 'INTENT_INCOMPLETE',
    reasonCode: 'RAW_INTENT_EMPTY',
    normalizedIntent: null,
    source: 'chatgpt',
    receivedAt: RECEIVED_AT,
    rawIntentBytes: 5,
    intentDigest: null,
    authorizationInferred: false
  });

  const badTime = captureIntent({
    rawIntent: 'continue',
    source: 'chatgpt',
    receivedAt: 'yesterday'
  });
  assert.equal(badTime.status, 'INTENT_REJECTED');
  assert.equal(badTime.reasonCode, 'RECEIVED_AT_INVALID');
  assert.equal(badTime.authorizationInferred, false);
});

test('GWC-1 normalization is bounded and semantic-only; whitespace variants bind identically', () => {
  const left = captureIntent({
    rawIntent: 'Continue\nPRECODE',
    source: 'other',
    receivedAt: RECEIVED_AT
  });
  const right = captureIntent({
    rawIntent: '  Continue   PRECODE  ',
    source: 'other',
    receivedAt: RECEIVED_AT
  });
  assert.equal(left.normalizedIntent, 'Continue PRECODE');
  assert.equal(right.normalizedIntent, 'Continue PRECODE');
  assert.equal(left.intentDigest, right.intentDigest);
});
