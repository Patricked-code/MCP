import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { createOperationalEventJournal, type OperationalEventJournal } from '../src/operationalMemory/eventJournal.js';
import { createOperationalAudit, type OperationalAuditInput } from '../src/operationalMemory/operationalAudit.js';

// R46 (PR #136 review r4075788775): a closed session can never create another checkpoint, so its
// pending window must be evicted instead of living for the whole process.

const SESSION_A = '44444444-4444-4444-8444-444444444444';
const SESSION_B = '55555555-5555-4555-8555-555555555555';
const FINGERPRINT = 'f'.repeat(64);

type SessionInput = Extract<OperationalAuditInput, { type: 'session.closed' }>['session'];

function session(governedSessionId: string, status: string, sessionRevision: number): SessionInput {
  return { governedSessionId, status, sessionRevision } as unknown as SessionInput;
}

function reconcile(governedSessionId: string, stateVersion: number): OperationalAuditInput {
  return { type: 'reconcile.requested', governedSessionId, stateVersion };
}

function closeSequence(governedSessionId: string): OperationalAuditInput[] {
  // The order of closeSession(): session.closed, then the unbind of its former transport.
  return [
    { type: 'session.closed', session: session(governedSessionId, 'CLOSED', 5), reasonCode: 'closed_by_owner' },
    { type: 'transport.unbound', governedSessionId, fingerprint: FINGERPRINT, sessionRevision: 5, reasonCode: 'session_closed' }
  ];
}

async function withJournal(run: (journal: OperationalEventJournal) => Promise<void>): Promise<void> {
  const directory = await mkdtemp(join(tmpdir(), 'mcp-r46-eviction-'));
  try {
    await run(createOperationalEventJournal({
      filePath: join(directory, 'events.jsonl'),
      maxBytes: 4_194_304,
      archives: 2,
      now: () => new Date('2026-10-16T21:00:00.000Z')
    }));
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

test('R46: closing a session evicts its window, including the unbind of its former transport', async () => {
  await withJournal(async (journal) => {
    const audit = createOperationalAudit(journal);
    await audit.record(reconcile(SESSION_A, 1));
    for (const input of closeSequence(SESSION_A)) await audit.record(input);

    assert.deepEqual(audit.checkpointEventIds?.(SESSION_A), []);
  });
});

test('R46: closing one session leaves the window of another intact', async () => {
  await withJournal(async (journal) => {
    const audit = createOperationalAudit(journal);
    await audit.record(reconcile(SESSION_A, 1));
    await audit.record(reconcile(SESSION_B, 1));
    const windowB = audit.checkpointEventIds?.(SESSION_B) ?? [];
    for (const input of closeSequence(SESSION_A)) await audit.record(input);

    assert.deepEqual(audit.checkpointEventIds?.(SESSION_B), windowB);
  });
});

test('R46: an expired session keeps its window, since it may still be resumed and checkpointed', async () => {
  await withJournal(async (journal) => {
    const audit = createOperationalAudit(journal);
    await audit.record(reconcile(SESSION_A, 1));
    await audit.record({ type: 'session.expired', session: session(SESSION_A, 'EXPIRED', 3), reasonCode: 'idle_ttl' });
    await audit.record({
      type: 'transport.unbound', governedSessionId: SESSION_A, fingerprint: FINGERPRINT, sessionRevision: 3, reasonCode: 'session_expired'
    });
    // Work after the resume joins the same window, so the next checkpoint links the whole span.
    await audit.record(reconcile(SESSION_A, 2));

    assert.equal(audit.checkpointEventIds?.(SESSION_A).length, 4);
  });
});

test('R46: many sessions that open, work and close leave no window behind', async () => {
  await withJournal(async (journal) => {
    const audit = createOperationalAudit(journal);
    const ids = Array.from({ length: 200 }, (_, index) => `66666666-6666-4666-8666-${String(index).padStart(12, '0')}`);
    for (const id of ids) {
      await audit.record(reconcile(id, 1));
      for (const input of closeSequence(id)) await audit.record(input);
    }

    assert.ok(ids.every((id) => (audit.checkpointEventIds?.(id) ?? []).length === 0));
  });
});

function failingOn(journal: OperationalEventJournal, failing: ReadonlySet<string>): OperationalEventJournal {
  return {
    ...journal,
    append: async (event) => {
      if (failing.has(event.type)) throw new Error('journal unavailable');
      return journal.append(event);
    }
  };
}

test('R46: a close whose journal append fails still evicts the window, since the session is closed in its store', async () => {
  await withJournal(async (journal) => {
    const failures: string[] = [];
    const audit = createOperationalAudit(failingOn(journal, new Set(['session.closed'])), (type) => failures.push(type));
    await audit.record(reconcile(SESSION_A, 1));
    // A session closed without a bound transport: closeSession() records no unbind after it.
    await audit.record(closeSequence(SESSION_A)[0]!);

    assert.deepEqual(failures, ['session.closed']);
    assert.deepEqual(audit.checkpointEventIds?.(SESSION_A), []);
  });
});

test('R46: an expiry whose journal append fails keeps the window of the still resumable session', async () => {
  await withJournal(async (journal) => {
    const failures: string[] = [];
    const audit = createOperationalAudit(failingOn(journal, new Set(['session.expired'])), (type) => failures.push(type));
    await audit.record(reconcile(SESSION_A, 1));
    const window = audit.checkpointEventIds?.(SESSION_A) ?? [];
    await audit.record({ type: 'session.expired', session: session(SESSION_A, 'EXPIRED', 3), reasonCode: 'idle_ttl' });

    assert.deepEqual(failures, ['session.expired']);
    assert.deepEqual(audit.checkpointEventIds?.(SESSION_A), window);
  });
});
