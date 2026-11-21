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
import { createOperationalAudit } from '../src/operationalMemory/operationalAudit.js';
import type { GovernedCheckpoint } from '../src/operationalMemory/types.js';

// R45 (PR #136 review r4075788768): a checkpoint must release from the pending window only
// the event IDs it actually references, never events appended while it was being created.

const SESSION_A = '11111111-1111-4111-8111-111111111111';
const SESSION_B = '33333333-3333-4333-8333-333333333333';

function checkpoint(governedSessionId: string, eventIds: string[]): GovernedCheckpoint {
  return {
    checkpointId: '22222222-2222-4222-8222-222222222222',
    governedSessionId,
    createdAt: '2026-10-16T20:00:00.000Z',
    taskScope: 'R45-checkpoint-window',
    workBranch: 'claude/r45-checkpoint-window',
    pullRequestNumber: null,
    observedHeadSha: null,
    acknowledgedStateVersion: 1,
    completedAction: 'checkpoint',
    resultCode: 'R45_CHECKPOINT',
    blockers: [],
    nextAction: 'continue',
    eventIds,
    sessionRevision: 2
  };
}

function reconcile(governedSessionId: string, stateVersion: number) {
  return { type: 'reconcile.requested' as const, governedSessionId, stateVersion };
}

async function withJournal(run: (journal: OperationalEventJournal, file: string) => Promise<void>): Promise<void> {
  const directory = await mkdtemp(join(tmpdir(), 'mcp-r45-window-'));
  const file = join(directory, 'events.jsonl');
  try {
    await run(createOperationalEventJournal({
      filePath: file,
      maxBytes: 1_048_576,
      archives: 2,
      now: () => new Date('2026-10-16T20:00:00.000Z')
    }), file);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

function parseLines(content: string): OperationalEvent[] {
  return content.split('\n').filter(Boolean).map((line) => JSON.parse(line) as OperationalEvent);
}

test('R45: an event appended between the snapshot and the checkpoint stays pending for the next checkpoint', async () => {
  await withJournal(async (journal, file) => {
    const audit = createOperationalAudit(journal);
    await audit.record(reconcile(SESSION_A, 1));
    const snapshot = audit.checkpointEventIds?.(SESSION_A) ?? [];
    assert.equal(snapshot.length, 1);

    // createCheckpoint() awaits the session store here; another write of the same session lands meanwhile.
    await audit.record(reconcile(SESSION_A, 2));
    await audit.record({ type: 'checkpoint.created', checkpoint: checkpoint(SESSION_A, snapshot) });

    const events = parseLines(await readFile(file, 'utf8'));
    const late = events[1]!.eventId;
    assert.equal(events[2]!.type, 'checkpoint.created');
    assert.deepEqual(audit.checkpointEventIds?.(SESSION_A), [late]);

    // The next checkpoint references it, and only then is the window empty.
    const next = audit.checkpointEventIds?.(SESSION_A) ?? [];
    await audit.record({ type: 'checkpoint.created', checkpoint: checkpoint(SESSION_A, next) });
    assert.deepEqual(audit.checkpointEventIds?.(SESSION_A), []);
  });
});

test('R45: concurrent records in one process never lose an event the checkpoint did not reference', async () => {
  await withJournal(async (journal) => {
    const audit = createOperationalAudit(journal);
    await audit.record(reconcile(SESSION_A, 1));
    await audit.record(reconcile(SESSION_A, 2));
    const snapshot = audit.checkpointEventIds?.(SESSION_A) ?? [];

    await Promise.all([
      audit.record(reconcile(SESSION_A, 3)),
      audit.record({ type: 'checkpoint.created', checkpoint: checkpoint(SESSION_A, snapshot) }),
      audit.record(reconcile(SESSION_A, 4))
    ]);

    const pending = audit.checkpointEventIds?.(SESSION_A) ?? [];
    assert.equal(pending.length, 2);
    assert.ok(pending.every((eventId) => !snapshot.includes(eventId)));
  });
});

test('R45: pending events keep journal order and duplicate or unknown checkpoint IDs are harmless', async () => {
  await withJournal(async (journal, file) => {
    const audit = createOperationalAudit(journal);
    for (let version = 1; version <= 4; version += 1) await audit.record(reconcile(SESSION_A, version));
    const [first, second, third, fourth] = audit.checkpointEventIds?.(SESSION_A) ?? [];

    await audit.record({
      type: 'checkpoint.created',
      checkpoint: checkpoint(SESSION_A, [second!, second!, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', fourth!])
    });

    assert.deepEqual(audit.checkpointEventIds?.(SESSION_A), [first, third]);
    const events = parseLines(await readFile(file, 'utf8'));
    assert.deepEqual([first, third], [events[0]!.eventId, events[2]!.eventId]);
  });
});

test('R45: a checkpoint that references no event releases nothing', async () => {
  await withJournal(async (journal) => {
    const audit = createOperationalAudit(journal);
    await audit.record(reconcile(SESSION_A, 1));
    const pending = audit.checkpointEventIds?.(SESSION_A) ?? [];

    await audit.record({ type: 'checkpoint.created', checkpoint: checkpoint(SESSION_A, []) });
    assert.deepEqual(audit.checkpointEventIds?.(SESSION_A), pending);
  });
});

test('R45: a checkpoint of one session never releases the window of another', async () => {
  await withJournal(async (journal) => {
    const audit = createOperationalAudit(journal);
    await audit.record(reconcile(SESSION_A, 1));
    await audit.record(reconcile(SESSION_B, 1));
    const windowA = audit.checkpointEventIds?.(SESSION_A) ?? [];
    const windowB = audit.checkpointEventIds?.(SESSION_B) ?? [];

    // Even a checkpoint listing the other session's IDs releases only its own session.
    await audit.record({ type: 'checkpoint.created', checkpoint: checkpoint(SESSION_A, [...windowA, ...windowB]) });
    assert.deepEqual(audit.checkpointEventIds?.(SESSION_A), []);
    assert.deepEqual(audit.checkpointEventIds?.(SESSION_B), windowB);
  });
});

test('R45: a checkpoint whose append fails releases nothing and reports the failure', async () => {
  await withJournal(async (journal) => {
    const failures: string[] = [];
    const failing: OperationalEventJournal = {
      ...journal,
      append: async (event) => {
        if (event.type === 'checkpoint.created') throw new Error('disk full');
        return journal.append(event);
      }
    };
    const audit = createOperationalAudit(failing, (type) => failures.push(type));
    await audit.record(reconcile(SESSION_A, 1));
    const pending = audit.checkpointEventIds?.(SESSION_A) ?? [];

    await audit.record({ type: 'checkpoint.created', checkpoint: checkpoint(SESSION_A, pending) });
    assert.deepEqual(failures, ['checkpoint.created']);
    assert.deepEqual(audit.checkpointEventIds?.(SESSION_A), pending);
  });
});

test('R45: the 64-event window bound still holds and events after the snapshot survive it', async () => {
  await withJournal(async (journal) => {
    const audit = createOperationalAudit(journal);
    for (let version = 1; version <= 70; version += 1) await audit.record(reconcile(SESSION_A, version));
    const snapshot = audit.checkpointEventIds?.(SESSION_A) ?? [];
    assert.equal(snapshot.length, 64);

    await audit.record(reconcile(SESSION_A, 71));
    const late = (audit.checkpointEventIds?.(SESSION_A) ?? []).at(-1)!;
    await audit.record({ type: 'checkpoint.created', checkpoint: checkpoint(SESSION_A, snapshot) });

    assert.deepEqual(audit.checkpointEventIds?.(SESSION_A), [late]);
  });
});
