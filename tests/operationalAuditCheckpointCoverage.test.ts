import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import {
  createOperationalEventJournal,
  type OperationalEvent,
  type OperationalEventJournal
} from '../src/operationalMemory/eventJournal.js';
import { createOperationalAudit, type OperationalAuditInput } from '../src/operationalMemory/operationalAudit.js';
import type { GovernedCheckpoint } from '../src/operationalMemory/types.js';

// S1 (#313 coverage invariant, PR #320 review 6457424074): the window links at most the last
// 64 event IDs, so the audit must also keep the range those IDs belong to. The range starts at
// the oldest session event no checkpoint has linked yet, survives the 64-ID bound, and counts
// every session event the window recorded from that start through the newest one.

const SESSION_A = '12121212-1212-4121-8121-121212121212';
const SESSION_B = '34343434-3434-4343-8343-343434343434';
const FINGERPRINT = 'e'.repeat(64);

function checkpoint(governedSessionId: string, eventIds: string[]): GovernedCheckpoint {
  return {
    checkpointId: '56565656-5656-4565-8565-565656565656',
    governedSessionId,
    createdAt: '2026-10-28T01:00:00.000Z',
    taskScope: 'S1-checkpoint-coverage',
    workBranch: 'claude/trusting-ride-knf5tu',
    pullRequestNumber: 319,
    observedHeadSha: null,
    acknowledgedStateVersion: 1,
    completedAction: 'checkpoint',
    resultCode: 'S1_CHECKPOINT',
    blockers: [],
    nextAction: 'continue',
    eventIds,
    sessionRevision: 2
  };
}

function reconcile(governedSessionId: string, stateVersion: number): OperationalAuditInput {
  return { type: 'reconcile.requested', governedSessionId, stateVersion };
}

async function withJournal(run: (journal: OperationalEventJournal, file: string) => Promise<void>): Promise<void> {
  const directory = await mkdtemp(join(tmpdir(), 'mcp-s1-coverage-'));
  const file = join(directory, 'events.jsonl');
  try {
    await run(createOperationalEventJournal({
      filePath: file,
      maxBytes: 4_194_304,
      archives: 2,
      now: () => new Date('2026-10-28T01:00:00.000Z')
    }), file);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

async function sessionEventIds(file: string, governedSessionId: string): Promise<string[]> {
  return (await readFile(file, 'utf8'))
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line) as OperationalEvent)
    .filter((event) => event.governedSessionId === governedSessionId && event.type !== 'checkpoint.created')
    .map((event) => event.eventId);
}

const EMPTY = { eventIds: [], firstEventId: null, lastEventId: null, eventCount: 0 };

test('S1: 70 events before a checkpoint form one range although only the last 64 IDs are linked', async () => {
  await withJournal(async (journal, file) => {
    const audit = createOperationalAudit(journal);
    for (let version = 1; version <= 70; version += 1) await audit.record(reconcile(SESSION_A, version));
    const ids = await sessionEventIds(file, SESSION_A);

    assert.deepEqual(audit.checkpointCoverage?.(SESSION_A), {
      eventIds: ids.slice(6),
      firstEventId: ids[0],
      lastEventId: ids[69],
      eventCount: 70
    });
    assert.deepEqual(audit.checkpointEventIds?.(SESSION_A), ids.slice(6));
  });
});

test('S1: with exactly 64 events the range and the linked IDs coincide', async () => {
  await withJournal(async (journal, file) => {
    const audit = createOperationalAudit(journal);
    for (let version = 1; version <= 64; version += 1) await audit.record(reconcile(SESSION_A, version));
    const ids = await sessionEventIds(file, SESSION_A);

    assert.deepEqual(audit.checkpointCoverage?.(SESSION_A), {
      eventIds: ids,
      firstEventId: ids[0],
      lastEventId: ids[63],
      eventCount: 64
    });
  });
});

test('S1: a checkpoint moves the range to the event appended after its snapshot (R45 race)', async () => {
  await withJournal(async (journal, file) => {
    const audit = createOperationalAudit(journal);
    await audit.record(reconcile(SESSION_A, 1));
    const snapshot = audit.checkpointEventIds?.(SESSION_A) ?? [];
    await audit.record(reconcile(SESSION_A, 2));
    await audit.record({ type: 'checkpoint.created', checkpoint: checkpoint(SESSION_A, snapshot) });
    const late = (await sessionEventIds(file, SESSION_A))[1]!;

    assert.deepEqual(audit.checkpointCoverage?.(SESSION_A), {
      eventIds: [late], firstEventId: late, lastEventId: late, eventCount: 1
    });
  });
});

test('S1: a checkpoint that links its whole window leaves an empty range anchored at the last event', async () => {
  await withJournal(async (journal, file) => {
    const failures: string[] = [];
    const audit = createOperationalAudit(journal, (type) => failures.push(type));
    assert.deepEqual(audit.checkpointCoverage?.(SESSION_A), EMPTY);
    for (let version = 1; version <= 3; version += 1) await audit.record(reconcile(SESSION_A, version));
    const snapshot = audit.checkpointEventIds?.(SESSION_A) ?? [];
    await audit.record({ type: 'checkpoint.created', checkpoint: checkpoint(SESSION_A, snapshot) });
    const ids = await sessionEventIds(file, SESSION_A);

    // #313 6459995666: a checkpoint with no new event must not lose the replay anchor.
    const anchored = { eventIds: [], firstEventId: null, lastEventId: ids[2], eventCount: 0 };
    assert.deepEqual(audit.checkpointCoverage?.(SESSION_A), anchored);
    await audit.record({ type: 'checkpoint.created', checkpoint: checkpoint(SESSION_A, []) });
    assert.deepEqual(audit.checkpointCoverage?.(SESSION_A), anchored);
    assert.deepEqual(failures, []);
  });
});

test('S1: one event between a full snapshot and its checkpoint does not keep the linked start', async () => {
  await withJournal(async (journal, file) => {
    const audit = createOperationalAudit(journal);
    for (let version = 1; version <= 64; version += 1) await audit.record(reconcile(SESSION_A, version));
    const snapshot = audit.checkpointEventIds?.(SESSION_A) ?? [];
    // #313 6460741647: event 65 pushes event 1 out of the 64-ID projection before the marker.
    await audit.record(reconcile(SESSION_A, 65));
    await audit.record({ type: 'checkpoint.created', checkpoint: checkpoint(SESSION_A, snapshot) });
    const ids = await sessionEventIds(file, SESSION_A);

    assert.deepEqual(audit.checkpointCoverage?.(SESSION_A), {
      eventIds: [ids[64]], firstEventId: ids[64], lastEventId: ids[64], eventCount: 1
    });
  });
});

test('S1: up to 64 events between a full snapshot and its checkpoint keep the range exact', async () => {
  await withJournal(async (journal, file) => {
    const audit = createOperationalAudit(journal);
    for (let version = 1; version <= 64; version += 1) await audit.record(reconcile(SESSION_A, version));
    const snapshot = audit.checkpointEventIds?.(SESSION_A) ?? [];
    for (let version = 65; version <= 128; version += 1) await audit.record(reconcile(SESSION_A, version));
    await audit.record({ type: 'checkpoint.created', checkpoint: checkpoint(SESSION_A, snapshot) });
    const ids = await sessionEventIds(file, SESSION_A);

    assert.deepEqual(audit.checkpointCoverage?.(SESSION_A), {
      eventIds: ids.slice(64), firstEventId: ids[64], lastEventId: ids[127], eventCount: 64
    });
  });
});

test('S1: after a saturated checkpoint the next range still starts at the first event never linked', async () => {
  await withJournal(async (journal, file) => {
    const audit = createOperationalAudit(journal);
    for (let version = 1; version <= 70; version += 1) await audit.record(reconcile(SESSION_A, version));
    const snapshot = audit.checkpointEventIds?.(SESSION_A) ?? [];
    await audit.record({ type: 'checkpoint.created', checkpoint: checkpoint(SESSION_A, snapshot) });
    await audit.record(reconcile(SESSION_A, 71));
    await audit.record(reconcile(SESSION_A, 72));
    const ids = await sessionEventIds(file, SESSION_A);

    // The checkpoint linked events 7 to 70 only: events 1 to 6 stay inside the next range.
    assert.deepEqual(audit.checkpointCoverage?.(SESSION_A), {
      eventIds: ids.slice(70),
      firstEventId: ids[0],
      lastEventId: ids[71],
      eventCount: 72
    });
  });
});

test('S1: more than 64 events between the snapshot and the checkpoint keep a conservative range start', async () => {
  await withJournal(async (journal, file) => {
    const audit = createOperationalAudit(journal);
    for (let version = 1; version <= 64; version += 1) await audit.record(reconcile(SESSION_A, version));
    const snapshot = audit.checkpointEventIds?.(SESSION_A) ?? [];
    for (let version = 65; version <= 134; version += 1) await audit.record(reconcile(SESSION_A, version));
    await audit.record({ type: 'checkpoint.created', checkpoint: checkpoint(SESSION_A, snapshot) });
    const ids = await sessionEventIds(file, SESSION_A);

    // Events 65 to 70 left the 64-ID window before the checkpoint arrived and were never linked.
    // More than 64 events left it, so the audit no longer knows which ones the checkpoint linked:
    // the range keeps its start and also spans events 1 to 64, already linked, rather than lose any.
    assert.deepEqual(audit.checkpointEventIds?.(SESSION_A), ids.slice(70));
    assert.deepEqual(audit.checkpointCoverage?.(SESSION_A), {
      eventIds: ids.slice(70),
      firstEventId: ids[0],
      lastEventId: ids[133],
      eventCount: 134
    });
  });
});

test('S1: a checkpoint that skips the oldest pending event keeps the range start', async () => {
  await withJournal(async (journal) => {
    const audit = createOperationalAudit(journal);
    for (let version = 1; version <= 4; version += 1) await audit.record(reconcile(SESSION_A, version));
    const [first, second, third, fourth] = audit.checkpointEventIds?.(SESSION_A) ?? [];
    await audit.record({ type: 'checkpoint.created', checkpoint: checkpoint(SESSION_A, [second!, fourth!]) });

    assert.deepEqual(audit.checkpointCoverage?.(SESSION_A), {
      eventIds: [first, third], firstEventId: first, lastEventId: fourth, eventCount: 4
    });
  });
});

test('S1: each session counts only its own events', async () => {
  await withJournal(async (journal, file) => {
    const audit = createOperationalAudit(journal);
    for (let version = 1; version <= 5; version += 1) {
      await audit.record(reconcile(SESSION_A, version));
      await audit.record(reconcile(SESSION_B, version));
    }
    const idsA = await sessionEventIds(file, SESSION_A);
    const idsB = await sessionEventIds(file, SESSION_B);

    assert.deepEqual(audit.checkpointCoverage?.(SESSION_A), {
      eventIds: idsA, firstEventId: idsA[0], lastEventId: idsA[4], eventCount: 5
    });
    assert.deepEqual(audit.checkpointCoverage?.(SESSION_B), {
      eventIds: idsB, firstEventId: idsB[0], lastEventId: idsB[4], eventCount: 5
    });
  });
});

test('S1: closing a session drops its range together with its window (R46)', async () => {
  await withJournal(async (journal) => {
    const audit = createOperationalAudit(journal);
    for (let version = 1; version <= 70; version += 1) await audit.record(reconcile(SESSION_A, version));
    await audit.record({
      type: 'session.closed',
      session: { governedSessionId: SESSION_A, status: 'CLOSED', sessionRevision: 5 } as unknown as
        Extract<OperationalAuditInput, { type: 'session.closed' }>['session'],
      reasonCode: 'closed_by_owner'
    });
    await audit.record({
      type: 'transport.unbound', governedSessionId: SESSION_A, fingerprint: FINGERPRINT, sessionRevision: 5, reasonCode: 'session_closed'
    });

    assert.deepEqual(audit.checkpointCoverage?.(SESSION_A), EMPTY);
  });
});

test('S1: an event whose journal append fails does not enter the range', async () => {
  await withJournal(async (journal, file) => {
    let failNext = false;
    const failing: OperationalEventJournal = {
      ...journal,
      append: async (event) => {
        if (failNext) {
          failNext = false;
          throw new Error('journal unavailable');
        }
        return journal.append(event);
      }
    };
    const audit = createOperationalAudit(failing, () => undefined);
    await audit.record(reconcile(SESSION_A, 1));
    failNext = true;
    await audit.record(reconcile(SESSION_A, 2));
    await audit.record(reconcile(SESSION_A, 3));
    const ids = await sessionEventIds(file, SESSION_A);

    assert.equal(ids.length, 2);
    assert.deepEqual(audit.checkpointCoverage?.(SESSION_A), {
      eventIds: ids, firstEventId: ids[0], lastEventId: ids[1], eventCount: 2
    });
  });
});
