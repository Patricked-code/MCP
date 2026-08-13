import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { createAtomicJsonStore } from '../src/operationalMemory/atomicStore.js';
import { createGovernedLockService } from '../src/operationalMemory/lockService.js';
import { createGovernedSessionService } from '../src/operationalMemory/sessionService.js';
import { createTransportBindings } from '../src/operationalMemory/transportBindings.js';
import {
  LockStoreDocumentSchema,
  SessionStoreDocumentSchema,
  createEmptyLockStoreDocument,
  createEmptySessionStoreDocument
} from '../src/operationalMemory/types.js';

const IDENTITY = {
  principalId: 'oauth:user:locks',
  clientId: 'chatgpt-client',
  assurance: 'oauth_subject' as const
};

async function fixture() {
  const directory = await mkdtemp(join(tmpdir(), 'mcp-governed-locks-'));
  const sessionFile = join(directory, 'sessions.json');
  const lockFile = join(directory, 'locks.json');
  const sessionStore = createAtomicJsonStore({
    filePath: sessionFile,
    schema: SessionStoreDocumentSchema,
    empty: createEmptySessionStoreDocument
  });
  const lockStore = createAtomicJsonStore({
    filePath: lockFile,
    schema: LockStoreDocumentSchema,
    empty: createEmptyLockStoreDocument
  });
  const bindings = createTransportBindings();
  let currentTime = new Date('2026-08-13T08:00:00.000Z');
  let renewLocks: ((governedSessionId: string, at: Date) => Promise<unknown>) | null = null;
  const sessions = createGovernedSessionService({
    store: sessionStore,
    bindings,
    idleTtlSeconds: 86_400,
    resumeGraceSeconds: 604_800,
    now: () => currentTime,
    getLiveState: async () => ({ stateVersion: 9 }),
    renewLocksForHeartbeat: (governedSessionId, at) => renewLocks?.(governedSessionId, at)
      ?? Promise.resolve([])
  });
  const locks = createGovernedLockService({
    store: lockStore,
    sessionStore,
    bindings,
    defaultTtlSeconds: 300,
    maxTtlSeconds: 1_800,
    now: () => currentTime
  });
  renewLocks = locks.renewLocksForHeartbeat;

  async function open(taskScope: string, transportSessionId: string) {
    return sessions.openSession({
      repository: 'Patricked-code/MCP',
      taskScope,
      workBranch: 'mcp/session-continuity-v1-20260813',
      agentIdentity: 'codex-work-mode',
      blockers: [],
      nextAction: null
    }, { transportSessionId, identity: IDENTITY });
  }

  return {
    directory,
    sessionFile,
    lockFile,
    sessionStore,
    lockStore,
    bindings,
    sessions,
    locks,
    open,
    setNow(value: string) { currentTime = new Date(value); }
  };
}

test('acquisition normalise le scope et un conflit ne modifie aucun store', async () => {
  const f = await fixture();
  try {
    const first = await f.open('TASK-20260813-004', 'transport-A');
    const acquired = await f.locks.acquireLock({
      governedSessionId: first.session.governedSessionId,
      expectedSessionRevision: first.session.sessionRevision,
      scope: { type: 'task', key: 'TASK-20260813-004' },
      reason: 'Task 7 RED'
    }, { transportSessionId: 'transport-A', identity: IDENTITY });
    assert.equal(acquired.scope, 'task:TASK-20260813-004');
    assert.equal(acquired.status, 'ACTIVE');
    assert.equal(acquired.expiresAt, '2026-08-13T08:05:00.000Z');

    const second = await f.open('TASK-20260813-005', 'transport-B');
    const lockBefore = await readFile(f.lockFile);
    const sessionBefore = await readFile(f.sessionFile);
    await assert.rejects(f.locks.acquireLock({
      governedSessionId: second.session.governedSessionId,
      expectedSessionRevision: second.session.sessionRevision,
      scope: { type: 'task', key: 'TASK-20260813-004' },
      reason: 'conflict'
    }, { transportSessionId: 'transport-B', identity: IDENTITY }),
    new RegExp(`LOCK_CONFLICT:${first.session.governedSessionId}`));
    assert.deepEqual(await readFile(f.lockFile), lockBefore);
    assert.deepEqual(await readFile(f.sessionFile), sessionBefore);
  } finally {
    await rm(f.directory, { recursive: true, force: true });
  }
});

test('heartbeat renouvelle les locks et la libération est idempotente', async () => {
  const f = await fixture();
  try {
    const opened = await f.open('TASK-20260813-004', 'transport-A');
    const lock = await f.locks.acquireLock({
      governedSessionId: opened.session.governedSessionId,
      expectedSessionRevision: opened.session.sessionRevision,
      scope: { type: 'repository', key: 'Patricked-code/MCP' },
      ttlSeconds: 300,
      reason: 'exclusive change'
    }, { transportSessionId: 'transport-A', identity: IDENTITY });
    const currentSession = await f.sessions.getVisibleSession(
      opened.session.governedSessionId,
      { transportSessionId: 'transport-A', identity: IDENTITY }
    );

    f.setNow('2026-08-13T08:01:00.000Z');
    await f.sessions.heartbeat({
      governedSessionId: opened.session.governedSessionId,
      expectedSessionRevision: currentSession?.sessionRevision ?? -1
    }, { transportSessionId: 'transport-A', identity: IDENTITY });
    const renewed = (await f.locks.listActiveLocks())[0];
    assert.equal(renewed?.expiresAt, '2026-08-13T08:06:00.000Z');
    assert.equal(renewed?.lockRevision, lock.lockRevision + 1);

    const released = await f.locks.releaseLock({
      governedSessionId: opened.session.governedSessionId,
      lockId: lock.lockId,
      expectedLockRevision: renewed?.lockRevision ?? -1
    }, { transportSessionId: 'transport-A', identity: IDENTITY });
    assert.equal(released.status, 'RELEASED');
    const lockStoreAfterRelease = await readFile(f.lockFile);
    const sessionStoreAfterRelease = await readFile(f.sessionFile);
    assert.deepEqual(await f.locks.releaseLock({
      governedSessionId: opened.session.governedSessionId,
      lockId: lock.lockId,
      expectedLockRevision: lock.lockRevision
    }, { transportSessionId: 'transport-A', identity: IDENTITY }), released);
    assert.deepEqual(await readFile(f.lockFile), lockStoreAfterRelease);
    assert.deepEqual(await readFile(f.sessionFile), sessionStoreAfterRelease);
  } finally {
    await rm(f.directory, { recursive: true, force: true });
  }
});

test('un lock expiré reste non actif après redémarrage simulé', async () => {
  const f = await fixture();
  try {
    const opened = await f.open('TASK-20260813-004', 'transport-A');
    await f.locks.acquireLock({
      governedSessionId: opened.session.governedSessionId,
      expectedSessionRevision: opened.session.sessionRevision,
      scope: { type: 'resource', key: 'src/operationalMemory/lockService.ts' },
      ttlSeconds: 30,
      reason: 'bounded resource lock'
    }, { transportSessionId: 'transport-A', identity: IDENTITY });
    f.setNow('2026-08-13T08:00:31.000Z');

    const restarted = createGovernedLockService({
      store: f.lockStore,
      sessionStore: f.sessionStore,
      bindings: f.bindings,
      defaultTtlSeconds: 300,
      maxTtlSeconds: 1_800,
      now: () => new Date('2026-08-13T08:00:31.000Z')
    });
    assert.equal(await restarted.expireLocks(), 1);
    assert.deepEqual(await restarted.listActiveLocks(), []);
    assert.equal((await f.lockStore.read()).locks[0]?.status, 'EXPIRED');
    assert.equal(await restarted.expireLocks(), 0);
  } finally {
    await rm(f.directory, { recursive: true, force: true });
  }
});

test('les scopes ambigus et TTL hors bornes sont refusés', async () => {
  const f = await fixture();
  try {
    const opened = await f.open('TASK-20260813-004', 'transport-A');
    const invalidInputs = [
      { scope: { type: 'task', key: 'free-form' }, ttlSeconds: 300 },
      { scope: { type: 'resource', key: '../secret' }, ttlSeconds: 300 },
      { scope: { type: 'resource', key: '/absolute' }, ttlSeconds: 300 },
      { scope: { type: 'repository', key: 'Patricked-code/MCP' }, ttlSeconds: 1_801 }
    ] as const;
    for (const invalid of invalidInputs) {
      await assert.rejects(f.locks.acquireLock({
        governedSessionId: opened.session.governedSessionId,
        expectedSessionRevision: opened.session.sessionRevision,
        scope: invalid.scope,
        ttlSeconds: invalid.ttlSeconds,
        reason: 'invalid'
      }, { transportSessionId: 'transport-A', identity: IDENTITY }),
      /LOCK_SCOPE_INVALID|LOCK_TTL_INVALID/);
    }
  } finally {
    await rm(f.directory, { recursive: true, force: true });
  }
});
