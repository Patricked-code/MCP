import assert from 'node:assert/strict';
import { constants } from 'node:fs';
import { mkdtemp, rm, writeFile, readFile, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { createOperationalEventJournal } from '../src/operationalMemory/eventJournal.js';
import { readSessionJournalPage, readSessionEventsSince } from '../src/operationalMemory/eventJournalReader.js';
import { createOperationalAudit } from '../src/operationalMemory/operationalAudit.js';
import type { GovernedCheckpoint } from '../src/operationalMemory/types.js';

const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';

async function fixture(maxBytes = 100_000, archives = 3) {
  const directory = await mkdtemp(join(tmpdir(), 'mcp-bus-journal-reader-'));
  const filePath = join(directory, 'events.jsonl');
  const writer = createOperationalEventJournal({ filePath, maxBytes, archives });
  return {
    writer, filePath, archives, directory,
    cleanup: () => rm(directory, { recursive: true, force: true }),
    options: (session = A) => ({ filePath, archives, governedSessionId: session, maxSegmentBytes: 1024 * 1024 })
  };
}

test('RED BUS replay: cursor is eventId, filtered by session, ordered and bounded across sessions', async () => {
  const f = await fixture();
  try {
    const anchor = await f.writer.append({ type: 'session.opened', governedSessionId: A, metadata: { status: 'ACTIVE' } });
    await f.writer.append({ type: 'session.opened', governedSessionId: B, metadata: { status: 'ACTIVE' } });
    const first = await f.writer.append({ type: 'session.heartbeat', governedSessionId: A, metadata: { status: 'ACTIVE' } });
    await f.writer.append({ type: 'session.heartbeat', governedSessionId: B, metadata: { status: 'ACTIVE' } });
    const second = await f.writer.append({ type: 'session.paused', governedSessionId: A, metadata: { status: 'PAUSED' } });
    const page = await readSessionJournalPage({ ...f.options(), afterEventId: anchor.eventId, maxEvents: 1 });
    assert.deepEqual(page, { status: 'OK', eventIds: [first.eventId], nextCursor: first.eventId, hasMore: true, complete: false });
    const next = await readSessionJournalPage({ ...f.options(), afterEventId: page.nextCursor!, maxEvents: 1 });
    assert.deepEqual(next, { status: 'OK', eventIds: [second.eventId], nextCursor: second.eventId, hasMore: false, complete: true });
  } finally { await f.cleanup(); }
});

test('RED BUS replay: missing cursor and cross-session cursor fail closed without event leakage', async () => {
  const f = await fixture();
  try {
    const event = await f.writer.append({ type: 'session.opened', governedSessionId: B, metadata: { status: 'OPEN' } });
    assert.deepEqual(await readSessionJournalPage({ ...f.options(), afterEventId: event.eventId }), {
      status: 'CURSOR_UNAVAILABLE', eventIds: [], nextCursor: null, hasMore: false, complete: false
    });
    assert.deepEqual(await readSessionJournalPage({ ...f.options(), afterEventId: '99999999-9999-4999-8999-999999999999' }), {
      status: 'CURSOR_UNAVAILABLE', eventIds: [], nextCursor: null, hasMore: false, complete: false
    });
  } finally { await f.cleanup(); }
});

test('RED BUS replay: R44 interface replays only session events after last retained checkpoint', async () => {
  const f = await fixture();
  try {
    await f.writer.append({ type: 'session.opened', governedSessionId: A, metadata: { status: 'ACTIVE' } });
    const checkpoint = await f.writer.append({ type: 'checkpoint.created', governedSessionId: A, metadata: { checkpointId: B } });
    const one = await f.writer.append({ type: 'session.heartbeat', governedSessionId: A, metadata: { status: 'ACTIVE' } });
    await f.writer.append({ type: 'session.heartbeat', governedSessionId: B, metadata: { status: 'ACTIVE' } });
    const two = await f.writer.append({ type: 'task.discovered', governedSessionId: A, metadata: { taskId: 'TASK-20261016-001' } });
    const page = await readSessionJournalPage({ ...f.options(), afterEventId: checkpoint.eventId });
    assert.deepEqual(page.eventIds, [one.eventId, two.eventId]);
    assert.deepEqual(await readSessionEventsSince(f.options(), 'LAST_CHECKPOINT', [checkpoint.eventId]), { eventIds: [one.eventId, two.eventId], complete: true, reason: 'OK' });
  } finally { await f.cleanup(); }
});

test('RED BUS replay: R44 never silently fabricates a complete window without retained checkpoint', async () => {
  const f = await fixture();
  try {
    await f.writer.append({ type: 'session.opened', governedSessionId: A, metadata: { status: 'OPEN' } });
    assert.deepEqual(await readSessionEventsSince(f.options(), 'LAST_CHECKPOINT', []), {
      eventIds: [], complete: false, reason: 'CURSOR_UNAVAILABLE'
    });
  } finally { await f.cleanup(); }
});

test('RED BUS replay: rotation discards old cursors and reports unavailability instead of skipped events', async () => {
  const f = await fixture(300, 2);
  try {
    const anchor = await f.writer.append({ type: 'session.opened', governedSessionId: A, metadata: { status: 'ACTIVE' } });
    for (let i = 0; i < 15; i++) {
      await f.writer.append({ type: 'session.heartbeat', governedSessionId: A, metadata: { sessionRevision: i } });
    }
    assert.deepEqual(await readSessionJournalPage({ ...f.options(), afterEventId: anchor.eventId }), {
      status: 'CURSOR_UNAVAILABLE', eventIds: [], nextCursor: null, hasMore: false, complete: false
    });
  } finally { await f.cleanup(); }
});

test('RED BUS replay: symlink journal is rejected (no symlink traversal)', async () => {
  const f = await fixture();
  try {
    const target = join(f.directory, 'target.jsonl');
    await writeFile(target, '[]\n', { mode: 0o600 });
    await symlink(target, f.filePath);
    await assert.rejects(readSessionJournalPage({ ...f.options(), afterEventId: A }), /SYMLINK|UNSAFE_JOURNAL/);
  } finally { await f.cleanup(); }
});

test('RED BUS replay: corrupt JSONL is rejected, never interpreted as empty or complete', async () => {
  const f = await fixture();
  try {
    await writeFile(f.filePath, '{not valid}\n', { mode: 0o600 });
    await assert.rejects(readSessionJournalPage({ ...f.options(), afterEventId: A }), /CORRUPT|INVALID/);
  } finally { await f.cleanup(); }
});

test('RED BUS replay: a partial checkpoint window beyond 64 returns an explicit incomplete status', async () => {
  const f = await fixture(100_000);
  try {
    await f.writer.append({ type: 'checkpoint.created', governedSessionId: A, metadata: { checkpointId: B } });
    for (let i = 0; i < 66; i++) {
      await f.writer.append({ type: 'session.heartbeat', governedSessionId: A, metadata: { sessionRevision: i } });
    }
    assert.deepEqual(await readSessionEventsSince(f.options(), 'LAST_CHECKPOINT', []), {
      eventIds: [], complete: false, reason: 'CURSOR_UNAVAILABLE'
    });
  } finally { await f.cleanup(); }
});

test('RED BUS replay: reject a segment larger than its strict read bound', async () => {
  const f = await fixture(100_000);
  try {
    const anchor = await f.writer.append({ type: 'session.opened', governedSessionId: A, metadata: { status: 'OPEN' } });
    await assert.rejects(readSessionJournalPage({ ...f.options(), afterEventId: anchor.eventId, maxSegmentBytes: 5 }), /BOUNDED|LIMIT/);
  } finally { await f.cleanup(); }
});


test('BUS replay accepts valid segments above 1 MiB, matching default production writer limits', async () => {
  const f = await fixture(10_485_760, 5);
  try {
    const records = Array.from({ length: 10_000 }, (_, i) => JSON.stringify({
      schemaVersion: 1,
      eventId: '77777777-7777-4777-8777-' + String(i).padStart(12, '0'),
      processSequence: i + 1,
      occurredAt: '2026-10-16T20:00:00.000Z',
      type: 'context.read',
      governedSessionId: A,
      metadata: { stateVersion: i }
    }) + '\n').join('');
    assert.ok(Buffer.byteLength(records) > 1024 * 1024);
    await writeFile(f.filePath, records, { mode: 0o600 });
    const page = await readSessionJournalPage({
      filePath: f.filePath, archives: 5, governedSessionId: A,
      afterEventId: '77777777-7777-4777-8777-000000000000', maxEvents: 2
    });
    assert.equal(page.status, 'OK');
    assert.deepEqual(page.eventIds, [
      '77777777-7777-4777-8777-000000000001',
      '77777777-7777-4777-8777-000000000002'
    ]);
    assert.equal(page.hasMore, true);
    assert.equal(page.complete, false);
  } finally { await f.cleanup(); }
});

test('BUS replay refuses an archive symlink rather than following its contents', async () => {
  const f = await fixture();
  try {
    const anchor = await f.writer.append({
      type: 'session.opened', governedSessionId: A, metadata: { status: 'OPEN' }
    });
    const target = join(f.directory, 'older.jsonl');
    await writeFile(target, 'not a trusted archive\n', { mode: 0o600 });
    await symlink(target, f.filePath + '.1');
    await assert.rejects(
      readSessionJournalPage({ ...f.options(), afterEventId: anchor.eventId }),
      /SYMLINK|UNSAFE_JOURNAL/
    );
  } finally { await f.cleanup(); }
});

test('BUS replay rejects an archived-only window lacking its active journal', async () => {
  const f = await fixture();
  try {
    const anchor = await f.writer.append({
      type: 'session.opened', governedSessionId: A, metadata: { status: 'OPEN' }
    });
    const snapshot = await readFile(f.filePath);
    await writeFile(f.filePath + '.1', snapshot, { mode: 0o600 });
    await rm(f.filePath);
    await assert.rejects(
      readSessionJournalPage({ ...f.options(), afterEventId: anchor.eventId }),
      /SEGMENT_GAP/
    );
  } finally { await f.cleanup(); }
});


test('R44 RED: persisted snapshot boundary recovers e2 appended before physical checkpoint marker', async () => {
  const f = await fixture();
  try {
    const e1 = await f.writer.append({ type: 'reconcile.requested', governedSessionId: A, metadata: { stateVersion: 1 } });
    // A real checkpoint first persists eventIds=[e1], while more events may be appended.
    const e2 = await f.writer.append({ type: 'reconcile.requested', governedSessionId: A, metadata: { stateVersion: 2 } });
    await f.writer.append({ type: 'checkpoint.created', governedSessionId: A, metadata: { checkpointId: B, eventCount: 1 } });
    // A new reader after process restart must recover e2, not declare empty/complete.
    assert.deepEqual(await readSessionEventsSince(f.options(), 'LAST_CHECKPOINT', [e1.eventId]), {
      eventIds: [e2.eventId], complete: true, reason: 'OK'
    });
  } finally { await f.cleanup(); }
});

test('R44 RED: snapshot reconstruction works even if checkpoint marker append failed', async () => {
  const f = await fixture();
  try {
    const e1 = await f.writer.append({ type: 'reconcile.requested', governedSessionId: A, metadata: { stateVersion: 1 } });
    const e2 = await f.writer.append({ type: 'reconcile.requested', governedSessionId: A, metadata: { stateVersion: 2 } });
    assert.deepEqual(await readSessionEventsSince(f.options(), 'LAST_CHECKPOINT', [e1.eventId]), {
      eventIds: [e2.eventId], complete: true, reason: 'OK'
    });
  } finally { await f.cleanup(); }
});

test('R44 RED: no persisted snapshot boundary or a partial retained anchor fails closed', async () => {
  const f = await fixture();
  try {
    const e1 = await f.writer.append({ type: 'reconcile.requested', governedSessionId: A, metadata: { stateVersion: 1 } });
    assert.deepEqual(await readSessionEventsSince(f.options(), 'LAST_CHECKPOINT'), {
      eventIds: [], complete: false, reason: 'CURSOR_UNAVAILABLE'
    });
    assert.deepEqual(await readSessionEventsSince(f.options(), 'LAST_CHECKPOINT', []), {
      eventIds: [], complete: false, reason: 'CURSOR_UNAVAILABLE'
    });
    assert.deepEqual(await readSessionEventsSince(f.options(), 'LAST_CHECKPOINT', [
      '99999999-9999-4999-8999-999999999999', e1.eventId
    ]), { eventIds: [], complete: false, reason: 'CURSOR_UNAVAILABLE' });
  } finally { await f.cleanup(); }
});

test('BUS RED: reject event type outside the canonical writer allowlist', async () => {
  const f = await fixture();
  try {
    const e1 = await f.writer.append({ type: 'session.opened', governedSessionId: A, metadata: { status: 'OPEN' } });
    const broken = { ...e1, eventId: '99999999-9999-4999-8999-999999999999', type: 'session.heartbeet' };
    await writeFile(f.filePath, JSON.stringify(e1) + '\n' + JSON.stringify(broken) + '\n', { mode: 0o600 });
    await assert.rejects(readSessionJournalPage({ ...f.options(), afterEventId: e1.eventId }), /CORRUPT_SCHEMA/);
  } finally { await f.cleanup(); }
});


test('R44 integration: real OperationalAudit snapshot e1, event e2, checkpoint marker, restart and recover e2', async () => {
  const f = await fixture();
  try {
    const audit = createOperationalAudit(f.writer);
    await audit.record({ type: 'reconcile.requested', governedSessionId: A, stateVersion: 1 });
    const lastCheckpointEventIds = audit.checkpointEventIds?.(A) ?? [];
    assert.equal(lastCheckpointEventIds.length, 1);
    // The real sessionService.createCheckpoint contract persists this snapshot
    // before it later appends checkpoint.created through the audit.
    await audit.record({ type: 'reconcile.requested', governedSessionId: A, stateVersion: 2 });
    const checkpoint: GovernedCheckpoint = {
      checkpointId: B,
      governedSessionId: A,
      createdAt: '2026-10-17T00:00:00.000Z',
      taskScope: 'BUS-R44-TEST',
      workBranch: 'mcp/bus-existing-event-journal-replay-20261016',
      pullRequestNumber: 320,
      observedHeadSha: null,
      acknowledgedStateVersion: 1,
      completedAction: 'snapshot',
      resultCode: 'R44_TEST',
      blockers: [],
      nextAction: 'recover',
      eventIds: lastCheckpointEventIds,
      sessionRevision: 2
    };
    await audit.record({ type: 'checkpoint.created', checkpoint });
    // A fresh audit reader after restart has no pending in-memory window.
    const restarted = createOperationalAudit(f.writer);
    assert.deepEqual(restarted.checkpointEventIds?.(A), []);
    const raw = (await readFile(f.filePath, 'utf8')).trim().split('\n').map(l => JSON.parse(l));
    assert.deepEqual(await readSessionEventsSince(f.options(), 'LAST_CHECKPOINT', checkpoint.eventIds), {
      eventIds: [raw[1].eventId], complete: true, reason: 'OK'
    });
  } finally { await f.cleanup(); }
});


test('BUS replay rejects metadata not permitted for its canonical event type', async () => {
  const f = await fixture();
  try {
    const first = await f.writer.append({
      type: 'session.opened', governedSessionId: A, metadata: { status: 'ACTIVE' }
    });
    const malformed = {
      schemaVersion: 1,
      eventId: '99999999-9999-4999-8999-999999999999',
      processSequence: 2,
      occurredAt: '2026-10-17T01:00:00.000Z',
      type: 'session.heartbeat',
      governedSessionId: A,
      metadata: { bogus: 1 }
    };
    await writeFile(f.filePath, (await readFile(f.filePath, 'utf8')) + JSON.stringify(malformed) + '\n', { mode: 0o600 });
    await assert.rejects(
      readSessionJournalPage({ ...f.options(), afterEventId: first.eventId }),
      /BUS_JOURNAL_CORRUPT_SCHEMA/
    );
  } finally { await f.cleanup(); }
});
