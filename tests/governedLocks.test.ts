import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
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

async function fixture(audit?: { record(input: { type: string }): Promise<void> }) {
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
  let releaseLocksForSession = (_governedSessionId: string): Promise<unknown> => (
    Promise.resolve([])
  );
  const sessionOptions = {
    store: sessionStore,
    bindings,
    idleTtlSeconds: 86_400,
    resumeGraceSeconds: 604_800,
    now: () => currentTime,
    getLiveState: async () => ({ stateVersion: 9 }),
    renewLocksForHeartbeat: (governedSessionId: string, at: Date) => (
      renewLocks?.(governedSessionId, at) ?? Promise.resolve([])
    ),
    releaseLocksForSession: (governedSessionId: string) => (
      releaseLocksForSession(governedSessionId)
    )
  };
  const sessions = createGovernedSessionService(sessionOptions);
  const locks = createGovernedLockService({
    store: lockStore,
    sessionStore,
    bindings,
    defaultTtlSeconds: 300,
    maxTtlSeconds: 1_800,
    now: () => currentTime,
    audit
  });
  renewLocks = locks.renewLocksForHeartbeat;
  releaseLocksForSession = (governedSessionId) => (
    (locks as typeof locks & {
      releaseLocksForSession(id: string): Promise<unknown>;
    }).releaseLocksForSession(governedSessionId)
  );

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

test('le cycle des locks émet acquis, conflit, renouvelé, libéré et expiré', async () => {
  const eventTypes: string[] = [];
  const f = await fixture({
    async record(input) { eventTypes.push(input.type); }
  });
  try {
    const first = await f.open('TASK-20260813-004', 'transport-A');
    const acquired = await f.locks.acquireLock({
      governedSessionId: first.session.governedSessionId,
      expectedSessionRevision: first.session.sessionRevision,
      scope: { type: 'task', key: 'TASK-20260813-004' },
      reason: 'audit lifecycle'
    }, { transportSessionId: 'transport-A', identity: IDENTITY });
    const second = await f.open('TASK-20260813-005', 'transport-B');
    await assert.rejects(f.locks.acquireLock({
      governedSessionId: second.session.governedSessionId,
      expectedSessionRevision: second.session.sessionRevision,
      scope: { type: 'task', key: 'TASK-20260813-004' },
      reason: 'audit conflict'
    }, { transportSessionId: 'transport-B', identity: IDENTITY }), /LOCK_CONFLICT/);

    const firstAfterAcquire = await f.sessions.getVisibleSession(
      first.session.governedSessionId,
      { transportSessionId: 'transport-A', identity: IDENTITY }
    );
    f.setNow('2026-08-13T08:01:00.000Z');
    await f.sessions.heartbeat({
      governedSessionId: first.session.governedSessionId,
      expectedSessionRevision: firstAfterAcquire?.sessionRevision ?? -1
    }, { transportSessionId: 'transport-A', identity: IDENTITY });
    const renewed = (await f.locks.listActiveLocks())[0]!;
    await f.locks.releaseLock({
      governedSessionId: first.session.governedSessionId,
      lockId: acquired.lockId,
      expectedLockRevision: renewed.lockRevision
    }, { transportSessionId: 'transport-A', identity: IDENTITY });

    const firstAfterRelease = await f.sessions.getVisibleSession(
      first.session.governedSessionId,
      { transportSessionId: 'transport-A', identity: IDENTITY }
    );
    await f.locks.acquireLock({
      governedSessionId: first.session.governedSessionId,
      expectedSessionRevision: firstAfterRelease?.sessionRevision ?? -1,
      scope: { type: 'resource', key: 'src/operationalMemory/lockService.ts' },
      ttlSeconds: 30,
      reason: 'audit expiration'
    }, { transportSessionId: 'transport-A', identity: IDENTITY });
    f.setNow('2026-08-13T08:01:31.000Z');
    await f.locks.expireLocks();

    assert.deepEqual(eventTypes, [
      'lock.acquired',
      'lock.conflicted',
      'lock.renewed',
      'lock.released',
      'lock.acquired',
      'lock.expired'
    ]);
  } finally {
    await rm(f.directory, { recursive: true, force: true });
  }
});

test('la réconciliation répare un lockId de session après panne inter-fichiers', async () => {
  const f = await fixture();
  try {
    const opened = await f.open('TASK-20260813-004', 'transport-A');
    const acquired = await f.locks.acquireLock({
      governedSessionId: opened.session.governedSessionId,
      expectedSessionRevision: opened.session.sessionRevision,
      scope: { type: 'repository', key: 'Patricked-code/MCP' },
      reason: 'failure injection'
    }, { transportSessionId: 'transport-A', identity: IDENTITY });

    let failNextUpdate = true;
    const failingSessionStore: typeof f.sessionStore = {
      read: () => f.sessionStore.read(),
      update(mutator) {
        if (failNextUpdate) {
          failNextUpdate = false;
          return Promise.reject(new Error('INJECTED_SESSION_WRITE_FAILURE'));
        }
        return f.sessionStore.update(mutator);
      }
    };
    const recoveringLocks = createGovernedLockService({
      store: f.lockStore,
      sessionStore: failingSessionStore,
      bindings: f.bindings,
      defaultTtlSeconds: 300,
      maxTtlSeconds: 1_800,
      now: () => new Date('2026-08-13T08:00:00.000Z')
    });

    await assert.rejects(recoveringLocks.releaseLock({
      governedSessionId: opened.session.governedSessionId,
      lockId: acquired.lockId,
      expectedLockRevision: acquired.lockRevision
    }, { transportSessionId: 'transport-A', identity: IDENTITY }),
    /INJECTED_SESSION_WRITE_FAILURE/);
    assert.equal((await f.lockStore.read()).locks[0]?.status, 'RELEASED');
    assert.deepEqual((await f.sessionStore.read()).sessions[0]?.lockIds, [acquired.lockId]);

    assert.equal(await recoveringLocks.reconcileSessionLockIds(), 1);
    assert.deepEqual((await f.sessionStore.read()).sessions[0]?.lockIds, []);
    assert.deepEqual(await recoveringLocks.listActiveLocks(), []);
  } finally {
    await rm(f.directory, { recursive: true, force: true });
  }
});


test('acquire conserve les locks actifs et purge deterministiquement le plus ancien lock inactif au plafond', async () => {
  const f = await fixture();
  try {
    const opened = await f.open('TASK-20260813-004', 'transport-retention');
    const inactiveLocks = Array.from({ length: 2_000 }, (_, index) => {
      const acquiredAt = new Date(Date.UTC(2026, 0, 1, 0, 0, index)).toISOString();
      return {
        schemaVersion: 1 as const,
        lockId: randomUUID(),
        scope: `resource:history/${index}`,
        governedSessionId: opened.session.governedSessionId,
        acquiredAt,
        expiresAt: acquiredAt,
        renewedAt: acquiredAt,
        reason: 'historical terminal lock',
        status: 'RELEASED' as const,
        lockRevision: 2
      };
    });
    const oldestInactiveId = inactiveLocks[0]!.lockId;
    await f.lockStore.update(() => ({
      schemaVersion: 1,
      storeRevision: 1,
      locks: inactiveLocks
    }));

    const acquired = await f.locks.acquireLock({
      governedSessionId: opened.session.governedSessionId,
      expectedSessionRevision: opened.session.sessionRevision,
      scope: { type: 'repository', key: 'Patricked-code/MCP' },
      reason: 'retention boundary'
    }, { transportSessionId: 'transport-retention', identity: IDENTITY });
    const persisted = await f.lockStore.read();

    assert.equal(persisted.locks.length, 2_000);
    assert.equal(
      persisted.locks.some((lock) => lock.lockId === acquired.lockId && lock.status === 'ACTIVE'),
      true
    );
    assert.equal(persisted.locks.some((lock) => lock.lockId === oldestInactiveId), false);
  } finally {
    await rm(f.directory, { recursive: true, force: true });
  }
});

test('acquire echoue explicitement lorsque le plafond est entierement occupe par des locks actifs', async () => {
  const f = await fixture();
  try {
    const opened = await f.open('TASK-20260813-004', 'transport-capacity');
    const acquiredAt = '2026-08-13T08:00:00.000Z';
    await f.lockStore.update(() => ({
      schemaVersion: 1,
      storeRevision: 1,
      locks: Array.from({ length: 2_000 }, (_, index) => ({
        schemaVersion: 1 as const,
        lockId: randomUUID(),
        scope: `resource:active/${index}`,
        governedSessionId: opened.session.governedSessionId,
        acquiredAt,
        expiresAt: '2026-08-13T08:30:00.000Z',
        renewedAt: acquiredAt,
        reason: 'active capacity',
        status: 'ACTIVE' as const,
        lockRevision: 1
      }))
    }));

    await assert.rejects(f.locks.acquireLock({
      governedSessionId: opened.session.governedSessionId,
      expectedSessionRevision: opened.session.sessionRevision,
      scope: { type: 'repository', key: 'Patricked-code/MCP' },
      reason: 'capacity rejected'
    }, { transportSessionId: 'transport-capacity', identity: IDENTITY }),
    /LOCK_STORE_CAPACITY_EXCEEDED/);
    assert.equal((await f.lockStore.read()).locks.length, 2_000);
  } finally {
    await rm(f.directory, { recursive: true, force: true });
  }
});

test('close libere les locks actifs, vide la projection et rend le scope immediatement disponible', async () => {
  const f = await fixture();
  try {
    const first = await f.open('TASK-20260813-004', 'transport-close-A');
    const acquired = await f.locks.acquireLock({
      governedSessionId: first.session.governedSessionId,
      expectedSessionRevision: first.session.sessionRevision,
      scope: { type: 'repository', key: 'Patricked-code/MCP' },
      reason: 'close lifecycle'
    }, { transportSessionId: 'transport-close-A', identity: IDENTITY });
    const afterAcquire = await f.sessions.getVisibleSession(
      first.session.governedSessionId,
      { transportSessionId: 'transport-close-A', identity: IDENTITY }
    );

    const closed = await f.sessions.closeSession({
      governedSessionId: first.session.governedSessionId,
      expectedSessionRevision: afterAcquire?.sessionRevision ?? -1
    }, { transportSessionId: 'transport-close-A', identity: IDENTITY });

    assert.equal(closed.status, 'CLOSED');
    assert.deepEqual(closed.lockIds, []);
    assert.deepEqual(await f.locks.listActiveLocks(), []);
    assert.equal(
      (await f.lockStore.read()).locks.find((lock) => lock.lockId === acquired.lockId)?.status,
      'RELEASED'
    );

    const second = await f.open('TASK-20260813-005', 'transport-close-B');
    const reacquired = await f.locks.acquireLock({
      governedSessionId: second.session.governedSessionId,
      expectedSessionRevision: second.session.sessionRevision,
      scope: { type: 'repository', key: 'Patricked-code/MCP' },
      reason: 'scope available after close'
    }, { transportSessionId: 'transport-close-B', identity: IDENTITY });
    assert.equal(reacquired.status, 'ACTIVE');
  } finally {
    await rm(f.directory, { recursive: true, force: true });
  }
});

test('close reste fail-closed si les locks sont liberes mais que la transition de session echoue', async () => {
  const f = await fixture();
  try {
    const opened = await f.open('TASK-20260813-004', 'transport-close-failure');
    const acquired = await f.locks.acquireLock({
      governedSessionId: opened.session.governedSessionId,
      expectedSessionRevision: opened.session.sessionRevision,
      scope: { type: 'repository', key: 'Patricked-code/MCP' },
      reason: 'partial failure'
    }, { transportSessionId: 'transport-close-failure', identity: IDENTITY });
    const afterAcquire = await f.sessions.getVisibleSession(
      opened.session.governedSessionId,
      { transportSessionId: 'transport-close-failure', identity: IDENTITY }
    );
    const closingOptions = {
      store: f.sessionStore,
      bindings: f.bindings,
      idleTtlSeconds: 86_400,
      resumeGraceSeconds: 604_800,
      now: () => new Date('2026-08-13T08:01:00.000Z'),
      async releaseLocksForSession(governedSessionId: string) {
        await f.lockStore.update((document) => ({
          ...document,
          storeRevision: document.storeRevision + 1,
          locks: document.locks.map((lock) => (
            lock.governedSessionId === governedSessionId && lock.status === 'ACTIVE'
              ? { ...lock, status: 'RELEASED' as const, lockRevision: lock.lockRevision + 1 }
              : lock
          ))
        }));
        throw new Error('INJECTED_POST_LOCK_RELEASE_FAILURE');
      }
    };
    const closingService = createGovernedSessionService(closingOptions);

    await assert.rejects(closingService.closeSession({
      governedSessionId: opened.session.governedSessionId,
      expectedSessionRevision: afterAcquire?.sessionRevision ?? -1
    }, { transportSessionId: 'transport-close-failure', identity: IDENTITY }),
    /INJECTED_POST_LOCK_RELEASE_FAILURE/);

    assert.equal(
      (await f.sessionStore.read()).sessions[0]?.status,
      'OPEN'
    );
    assert.equal(
      (await f.lockStore.read()).locks.find((lock) => lock.lockId === acquired.lockId)?.status,
      'RELEASED'
    );
    assert.deepEqual((await f.sessionStore.read()).sessions[0]?.lockIds, [acquired.lockId]);
    assert.equal(await f.locks.reconcileSessionLockIds(), 1);
    const reconciled = await f.sessions.getVisibleSession(
      opened.session.governedSessionId,
      { transportSessionId: 'transport-close-failure', identity: IDENTITY }
    );
    const closed = await f.sessions.closeSession({
      governedSessionId: opened.session.governedSessionId,
      expectedSessionRevision: reconciled?.sessionRevision ?? -1
    }, { transportSessionId: 'transport-close-failure', identity: IDENTITY });
    assert.equal(closed.status, 'CLOSED');
    assert.deepEqual(closed.lockIds, []);
  } finally {
    await rm(f.directory, { recursive: true, force: true });
  }
});

test('acquire traite un lock ACTIVE au TTL ecoule comme supprimable au plafond', async () => {
  const f = await fixture();
  try {
    const opened = await f.open('TASK-20260813-004', 'transport-elapsed-capacity');
    const elapsedLockId = randomUUID();
    const acquiredAt = '2026-08-13T07:00:00.000Z';
    const unexpired = Array.from({ length: 1_999 }, (_, index) => ({
      schemaVersion: 1 as const,
      lockId: randomUUID(),
      scope: `resource:active-unexpired/${index}`,
      governedSessionId: opened.session.governedSessionId,
      acquiredAt,
      expiresAt: '2026-08-13T08:30:00.000Z',
      renewedAt: acquiredAt,
      reason: 'unexpired active capacity',
      status: 'ACTIVE' as const,
      lockRevision: 1
    }));
    await f.lockStore.update(() => ({
      schemaVersion: 1,
      storeRevision: 1,
      locks: [{
        ...unexpired[0]!,
        lockId: elapsedLockId,
        scope: 'resource:elapsed-active',
        expiresAt: '2026-08-13T07:59:59.000Z'
      }, ...unexpired]
    }));

    const acquired = await f.locks.acquireLock({
      governedSessionId: opened.session.governedSessionId,
      expectedSessionRevision: opened.session.sessionRevision,
      scope: { type: 'repository', key: 'Patricked-code/MCP' },
      reason: 'elapsed capacity replacement'
    }, { transportSessionId: 'transport-elapsed-capacity', identity: IDENTITY });
    const persisted = await f.lockStore.read();

    assert.equal(persisted.locks.length, 2_000);
    assert.equal(persisted.locks.some((lock) => lock.lockId === elapsedLockId), false);
    assert.equal(persisted.locks.some((lock) => lock.lockId === acquired.lockId), true);
  } finally {
    await rm(f.directory, { recursive: true, force: true });
  }
});
