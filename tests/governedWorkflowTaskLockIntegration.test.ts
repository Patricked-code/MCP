import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
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
  principalId: 'oauth:user:gwc5',
  clientId: 'chatgpt-client',
  assurance: 'oauth_subject' as const
};
const NOW = '2026-09-19T03:15:00.000Z';

async function fixture() {
  const directory = await mkdtemp(join(tmpdir(), 'mcp-gwc5-locks-'));
  const sessionStore = createAtomicJsonStore({
    filePath: join(directory, 'sessions.json'),
    schema: SessionStoreDocumentSchema,
    empty: createEmptySessionStoreDocument
  });
  const lockStore = createAtomicJsonStore({
    filePath: join(directory, 'locks.json'),
    schema: LockStoreDocumentSchema,
    empty: createEmptyLockStoreDocument
  });
  const bindings = createTransportBindings();
  const sessions = createGovernedSessionService({
    store: sessionStore,
    bindings,
    idleTtlSeconds: 86_400,
    resumeGraceSeconds: 604_800,
    now: () => new Date(NOW)
  });
  const locks = createGovernedLockService({
    store: lockStore,
    sessionStore,
    bindings,
    defaultTtlSeconds: 300,
    maxTtlSeconds: 1_800,
    now: () => new Date(NOW)
  });

  async function open(taskScope: string, transportSessionId: string) {
    return sessions.openSession({
      repository: 'Patricked-code/MCP',
      taskScope,
      workBranch: 'claude/ecstatic-edison-v1dyt1',
      agentIdentity: 'chatgpt',
      blockers: [],
      nextAction: null
    }, { transportSessionId, identity: IDENTITY });
  }

  return { directory, sessionStore, lockStore, bindings, sessions, locks, open };
}

test('GWC-5 RED proof: sequential two-lock intent can leave the first grant active after the second conflicts', async () => {
  const f = await fixture();
  try {
    const ownerA = await f.open('TASK-20260919-501', 'transport-gwc5-A');
    const ownerB = await f.open('TASK-20260919-502', 'transport-gwc5-B');

    await f.locks.acquireLock({
      governedSessionId: ownerB.session.governedSessionId,
      expectedSessionRevision: ownerB.session.sessionRevision,
      scope: { type: 'resource', key: 'resource/beta' },
      reason: 'competing owner'
    }, { transportSessionId: 'transport-gwc5-B', identity: IDENTITY });

    await f.locks.acquireLock({
      governedSessionId: ownerA.session.governedSessionId,
      expectedSessionRevision: ownerA.session.sessionRevision,
      scope: { type: 'resource', key: 'resource/alpha' },
      reason: 'first half of intended pair'
    }, { transportSessionId: 'transport-gwc5-A', identity: IDENTITY });

    const aAfterFirst = await f.sessions.getVisibleSession(
      ownerA.session.governedSessionId,
      { transportSessionId: 'transport-gwc5-A', identity: IDENTITY }
    );
    await assert.rejects(f.locks.acquireLock({
      governedSessionId: ownerA.session.governedSessionId,
      expectedSessionRevision: aAfterFirst?.sessionRevision ?? -1,
      scope: { type: 'resource', key: 'resource/beta' },
      reason: 'second half conflicts'
    }, { transportSessionId: 'transport-gwc5-A', identity: IDENTITY }), /LOCK_CONFLICT/);

    const active = await f.locks.listActiveLocks();
    assert.equal(active.some(lock => (
      lock.governedSessionId === ownerA.session.governedSessionId
      && lock.scope === 'resource:resource/alpha'
    )), true);
    assert.equal(active.some(lock => (
      lock.governedSessionId === ownerA.session.governedSessionId
      && lock.scope === 'resource:resource/beta'
    )), false);
  } finally {
    await rm(f.directory, { recursive: true, force: true });
  }
});

test('GWC-5 atomic multi-lock acquisition grants all planned scopes or none on conflict', async () => {
  const f = await fixture();
  try {
    const ownerA = await f.open('TASK-20260919-503', 'transport-gwc5-atomic-A');
    const ownerB = await f.open('TASK-20260919-504', 'transport-gwc5-atomic-B');

    await f.locks.acquireLock({
      governedSessionId: ownerB.session.governedSessionId,
      expectedSessionRevision: ownerB.session.sessionRevision,
      scope: { type: 'resource', key: 'resource/beta' },
      reason: 'competing owner'
    }, { transportSessionId: 'transport-gwc5-atomic-B', identity: IDENTITY });

    const atomic = f.locks as typeof f.locks & {
      acquireLocksAtomically(input: {
        governedSessionId: string;
        expectedSessionRevision: number;
        scopes: Array<
          | { type: 'repository'; key: string }
          | { type: 'task'; key: string }
          | { type: 'resource'; key: string }
        >;
        reason: string;
      }, request: {
        transportSessionId: string;
        identity: typeof IDENTITY;
      }): Promise<Array<{ scope: string; governedSessionId: string; status: string }>>;
    };

    await assert.rejects(atomic.acquireLocksAtomically({
      governedSessionId: ownerA.session.governedSessionId,
      expectedSessionRevision: ownerA.session.sessionRevision,
      scopes: [
        { type: 'resource', key: 'resource/alpha' },
        { type: 'resource', key: 'resource/beta' }
      ],
      reason: 'atomic pair'
    }, { transportSessionId: 'transport-gwc5-atomic-A', identity: IDENTITY }), /LOCK_CONFLICT/);

    const active = await f.locks.listActiveLocks();
    assert.equal(active.filter(lock => lock.governedSessionId === ownerA.session.governedSessionId).length, 0);
    assert.deepEqual(
      active.filter(lock => lock.governedSessionId === ownerB.session.governedSessionId).map(lock => lock.scope),
      ['resource:resource/beta']
    );
  } finally {
    await rm(f.directory, { recursive: true, force: true });
  }
});

test('GWC-5 atomic acquisition deduplicates and orders at most one session revision for the whole set', async () => {
  const f = await fixture();
  try {
    const opened = await f.open('TASK-20260919-505', 'transport-gwc5-order');
    const atomic = f.locks as any;
    const granted = await atomic.acquireLocksAtomically({
      governedSessionId: opened.session.governedSessionId,
      expectedSessionRevision: opened.session.sessionRevision,
      scopes: [
        { type: 'resource', key: 'zeta/path' },
        { type: 'resource', key: 'alpha/path' },
        { type: 'resource', key: 'zeta/path' }
      ],
      reason: 'deterministic plan'
    }, { transportSessionId: 'transport-gwc5-order', identity: IDENTITY });

    assert.deepEqual(granted.map((lock: { scope: string }) => lock.scope), [
      'resource:alpha/path',
      'resource:zeta/path'
    ]);
    const visible = await f.sessions.getVisibleSession(
      opened.session.governedSessionId,
      { transportSessionId: 'transport-gwc5-order', identity: IDENTITY }
    );
    assert.equal(visible?.sessionRevision, opened.session.sessionRevision + 1);
    assert.deepEqual(visible?.lockIds, granted.map((lock: { lockId: string }) => lock.lockId));
  } finally {
    await rm(f.directory, { recursive: true, force: true });
  }
});

test('GWC-5 competing atomic plans cannot deadlock or split ownership across the same scope set', async () => {
  const f = await fixture();
  try {
    const first = await f.open('TASK-20260919-506', 'transport-gwc5-race-A');
    const second = await f.open('TASK-20260919-507', 'transport-gwc5-race-B');
    const atomic = f.locks as any;

    const [left, right] = await Promise.allSettled([
      atomic.acquireLocksAtomically({
        governedSessionId: first.session.governedSessionId,
        expectedSessionRevision: first.session.sessionRevision,
        scopes: [
          { type: 'resource', key: 'race/a' },
          { type: 'resource', key: 'race/b' }
        ],
        reason: 'race left'
      }, { transportSessionId: 'transport-gwc5-race-A', identity: IDENTITY }),
      atomic.acquireLocksAtomically({
        governedSessionId: second.session.governedSessionId,
        expectedSessionRevision: second.session.sessionRevision,
        scopes: [
          { type: 'resource', key: 'race/b' },
          { type: 'resource', key: 'race/a' }
        ],
        reason: 'race right'
      }, { transportSessionId: 'transport-gwc5-race-B', identity: IDENTITY })
    ]);

    assert.equal([left.status, right.status].filter(status => status === 'fulfilled').length, 1);
    assert.equal([left.status, right.status].filter(status => status === 'rejected').length, 1);
    const active = await f.locks.listActiveLocks();
    assert.deepEqual(active.map(lock => lock.scope).sort(), ['resource:race/a', 'resource:race/b']);
    assert.equal(new Set(active.map(lock => lock.governedSessionId)).size, 1);
  } finally {
    await rm(f.directory, { recursive: true, force: true });
  }
});

test('GWC-5 fails closed when a same-session active lock is not yet projected into the session record', async () => {
  const f = await fixture();
  try {
    const opened = await f.open('TASK-20260919-510', 'transport-gwc5-unsettled');
    await f.lockStore.update((document) => ({
      ...document,
      storeRevision: document.storeRevision + 1,
      locks: [...document.locks, {
        schemaVersion: 1,
        lockId: '44444444-4444-4444-8444-444444444444',
        scope: 'resource:unsettled/path',
        governedSessionId: opened.session.governedSessionId,
        acquiredAt: NOW,
        expiresAt: '2026-09-19T03:20:00.000Z',
        renewedAt: NOW,
        reason: 'simulated inter-store in-flight grant',
        status: 'ACTIVE',
        lockRevision: 1
      }]
    }));

    const atomic = f.locks as any;
    await assert.rejects(atomic.acquireLocksAtomically({
      governedSessionId: opened.session.governedSessionId,
      expectedSessionRevision: opened.session.sessionRevision,
      scopes: [{ type: 'resource', key: 'unsettled/path' }],
      reason: 'must not reuse unsettled grant'
    }, { transportSessionId: 'transport-gwc5-unsettled', identity: IDENTITY }),
    /LOCK_SESSION_PROJECTION_UNSETTLED/);

    assert.deepEqual((await f.sessionStore.read()).sessions[0]?.lockIds, []);
    assert.equal((await f.lockStore.read()).locks[0]?.status, 'ACTIVE');
  } finally {
    await rm(f.directory, { recursive: true, force: true });
  }
});

test('GWC-5 cross-store failure compensates the whole newly-created lock set', async () => {
  const f = await fixture();
  try {
    const opened = await f.open('TASK-20260919-508', 'transport-gwc5-compensate');
    let failNextUpdate = true;
    const failingSessionStore: typeof f.sessionStore = {
      read: () => f.sessionStore.read(),
      update(mutator) {
        if (failNextUpdate) {
          failNextUpdate = false;
          return Promise.reject(new Error('INJECTED_MULTI_SESSION_WRITE_FAILURE'));
        }
        return f.sessionStore.update(mutator);
      }
    };
    const locks = createGovernedLockService({
      store: f.lockStore,
      sessionStore: failingSessionStore,
      bindings: f.bindings,
      defaultTtlSeconds: 300,
      maxTtlSeconds: 1_800,
      now: () => new Date(NOW)
    }) as any;

    await assert.rejects(locks.acquireLocksAtomically({
      governedSessionId: opened.session.governedSessionId,
      expectedSessionRevision: opened.session.sessionRevision,
      scopes: [
        { type: 'resource', key: 'compensate/a' },
        { type: 'resource', key: 'compensate/b' }
      ],
      reason: 'compensate all'
    }, { transportSessionId: 'transport-gwc5-compensate', identity: IDENTITY }),
    /INJECTED_MULTI_SESSION_WRITE_FAILURE/);

    assert.deepEqual(await locks.listActiveLocks(), []);
    const records = (await f.lockStore.read()).locks.filter(
      lock => lock.governedSessionId === opened.session.governedSessionId
    );
    assert.equal(records.length, 2);
    assert.equal(records.every(lock => lock.status === 'RELEASED'), true);
    assert.deepEqual((await f.sessionStore.read()).sessions[0]?.lockIds, []);
  } finally {
    await rm(f.directory, { recursive: true, force: true });
  }
});

test('GWC-5 lock planner is pure, bounded, deterministic and uses the existing lock normalizer', async () => {
  const { planMinimalLockSet } =
    await import('../src/governedWorkflow/adapters/task.js');
  const plan = planMinimalLockSet([
    { type: 'resource', key: 'z/path' },
    { type: 'task', key: 'TASK-20260919-509' },
    { type: 'resource', key: 'a/path' },
    { type: 'resource', key: 'z/path' }
  ]);

  assert.deepEqual(plan.normalizedScopes, [
    'resource:a/path',
    'resource:z/path',
    'task:TASK-20260919-509'
  ]);
  assert.equal(plan.scopeCount, 3);
  assert.equal(plan.mutationPerformed, false);
  assert.equal(Object.isFrozen(plan), true);
});

test('GWC-5 repository lock input type is future-target compatible but runtime grant remains fail-closed before GWC-10', async () => {
  const source = await import('../src/operationalMemory/lockService.js');
  assert.throws(
    () => source.normalizeLockScope({ type: 'repository', key: 'ExampleOrg/api' }),
    /LOCK_SCOPE_INVALID/
  );
  assert.equal(
    source.normalizeLockScope({ type: 'repository', key: 'Patricked-code/MCP' }),
    'repository:Patricked-code/MCP'
  );
});

test('GWC-5 lock EvidenceRef projects repository/task bindings already encoded in lock scope', async () => {
  const { wrapGw19MinimalLockAcquisition } =
    await import('../src/governedWorkflow/adapters/task.js');
  const contractsText = JSON.parse(await (await import('node:fs/promises')).readFile('.mcp/gwc-contracts.json', 'utf8'));
  const graphText = JSON.parse(await (await import('node:fs/promises')).readFile('.mcp/gwc-workflow-graph.json', 'utf8'));
  const { createGovernedContractSubstrate } = await import('../src/governedWorkflow/contractSubstrate.js');
  const substrate = createGovernedContractSubstrate({
    contractsProjection: contractsText,
    graphProjection: graphText,
    expectedSchemaVersion: 1,
    expectedContractRegistryDigest: contractsText.registryDigest,
    expectedGraphRegistryDigest: graphText.registryDigest
  });

  const plan = {
    normalizedScopes: Object.freeze([
      'repository:Patricked-code/MCP',
      'task:TASK-20260919-511'
    ]),
    scopeCount: 2,
    mutationPerformed: false as const
  };
  const base = {
    schemaVersion: 1 as const,
    governedSessionId: '55555555-5555-4555-8555-555555555555',
    acquiredAt: NOW,
    expiresAt: '2026-09-19T03:20:00.000Z',
    renewedAt: NOW,
    reason: 'binding proof',
    status: 'ACTIVE' as const,
    lockRevision: 1
  };
  const wrapped = wrapGw19MinimalLockAcquisition({
    plan,
    grantedLocks: [
      { ...base, lockId: '66666666-6666-4666-8666-666666666666', scope: 'repository:Patricked-code/MCP' },
      { ...base, lockId: '77777777-7777-4777-8777-777777777777', scope: 'task:TASK-20260919-511' }
    ]
  }, substrate);

  assert.equal(wrapped.status, 'GRANTED');
  assert.equal(wrapped.evidenceRefs[0]?.binding.repository, 'Patricked-code/MCP');
  assert.equal(wrapped.evidenceRefs[1]?.binding.taskId, 'TASK-20260919-511');
  assert.equal(wrapped.evidenceRefs.every(evidence => evidence.binding.sessionId === base.governedSessionId), true);
});

test('GWC-5 task wrappers remain observation-only and preserve OUT_OF_SCOPE verbatim', async () => {
  const {
    wrapGw15TaskCreationIfRequired,
    wrapGw19MinimalLockAcquisition
  } = await import('../src/governedWorkflow/adapters/task.js');
  const contractsText = JSON.parse(await (await import('node:fs/promises')).readFile('.mcp/gwc-contracts.json', 'utf8'));
  const graphText = JSON.parse(await (await import('node:fs/promises')).readFile('.mcp/gwc-workflow-graph.json', 'utf8'));
  const { createGovernedContractSubstrate } = await import('../src/governedWorkflow/contractSubstrate.js');
  const substrate = createGovernedContractSubstrate({
    contractsProjection: contractsText,
    graphProjection: graphText,
    expectedSchemaVersion: 1,
    expectedContractRegistryDigest: contractsText.registryDigest,
    expectedGraphRegistryDigest: graphText.registryDigest
  });

  const outOfScope = {
    classification: 'OUT_OF_SCOPE' as const,
    task: null,
    firstExecutableTask: null,
    storeRevision: 7,
    reasonCode: 'repository_out_of_scope'
  };
  const wrapped = wrapGw15TaskCreationIfRequired(outOfScope, substrate);
  assert.equal(wrapped.status, 'OUT_OF_SCOPE');
  assert.deepEqual(wrapped.payload, outOfScope);
  assert.equal(wrapped.mutationPerformed, false);
  assert.equal(wrapped.authorizationInferred, false);

  const planned = {
    normalizedScopes: Object.freeze(['resource:a/path']),
    scopeCount: 1,
    mutationPerformed: false as const
  };
  const lockObservation = wrapGw19MinimalLockAcquisition({
    plan: planned,
    grantedLocks: []
  }, substrate);
  assert.equal(lockObservation.status, 'PLANNED_ONLY');
  assert.equal(lockObservation.mutationPerformed, false);
});
