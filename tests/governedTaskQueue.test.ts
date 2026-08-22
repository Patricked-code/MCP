import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { createAtomicJsonStore } from '../src/operationalMemory/atomicStore.js';
import { createGovernedTaskQueueService } from '../src/operationalMemory/taskQueue.js';
import {
  GovernedTaskStoreDocumentSchema,
  createEmptyGovernedTaskStoreDocument,
  type GovernedTaskSeedDocument
} from '../src/operationalMemory/types.js';

const SESSION = '11111111-1111-4111-8111-111111111111';
const NOW = new Date('2026-08-22T12:00:00.000Z');

function seed(): GovernedTaskSeedDocument {
  return {
    schemaVersion: 1,
    registryVersion: 4,
    tasks: [{
      taskId: 'TASK-20260822-001',
      intentKey: 'existing-task',
      title: 'Existing task',
      summary: 'Existing bounded summary',
      priority: 5,
      sequence: 1,
      status: 'READY',
      dependencies: [],
      resourceScopes: ['resource:shared'],
      nextAction: 'claim_existing_task'
    }, {
      taskId: 'TASK-20260822-002',
      intentKey: 'higher-priority-task',
      title: 'Higher priority',
      summary: 'Higher priority bounded summary',
      priority: 0,
      sequence: 2,
      status: 'READY',
      dependencies: [],
      resourceScopes: [],
      nextAction: 'claim_higher_priority_task'
    }]
  };
}

async function service(options?: {
  lockedScopes?: string[];
}) {
  const root = await mkdtemp(join(tmpdir(), 'mcp-governed-task-queue-'));
  const store = createAtomicJsonStore({
    filePath: join(root, 'tasks.json'),
    schema: GovernedTaskStoreDocumentSchema,
    empty: createEmptyGovernedTaskStoreDocument
  });
  const locked = new Set(options?.lockedScopes ?? []);
  return createGovernedTaskQueueService({
    store,
    seed: seed(),
    now: () => NOW,
    isScopeLocked: async (scope) => locked.has(scope)
  });
}

test('initialise le seed une seule fois puis reprend une intention sans doublon', async () => {
  const queue = await service();
  await queue.initialize();
  await queue.initialize();
  const before = await queue.listTasks();
  assert.equal(before.tasks.length, 2);
  assert.equal(before.storeRevision, 1);

  const created = await queue.reconcileIntent({
    repository: 'Patricked-code/MCP',
    intentKey: 'new-bounded-intent',
    title: 'New task',
    summary: 'New bounded summary',
    priority: 5,
    dependencies: [],
    resourceScopes: ['resource:new'],
    requestDigest: 'a'.repeat(64)
  });
  assert.equal(created.classification, 'NEW_TASK');
  assert.equal(created.task.sequence, 3);

  const continued = await queue.reconcileIntent({
    repository: 'Patricked-code/MCP',
    intentKey: 'new-bounded-intent',
    title: 'New task',
    summary: 'New bounded summary',
    priority: 5,
    dependencies: [],
    resourceScopes: ['resource:new'],
    requestDigest: 'a'.repeat(64)
  });
  assert.equal(continued.classification, 'CONTINUATION');
  assert.equal((await queue.listTasks()).tasks.length, 3);
});

test('classe dépendances et conflits puis claim par priorité et séquence', async () => {
  const queue = await service({ lockedScopes: ['resource:locked'] });
  await queue.initialize();

  const blocked = await queue.reconcileIntent({
    repository: 'Patricked-code/MCP', intentKey: 'blocked', title: 'Blocked',
    summary: 'Blocked summary', priority: 5,
    dependencies: ['TASK-20260822-001'], resourceScopes: [], requestDigest: 'b'.repeat(64)
  });
  assert.equal(blocked.classification, 'BLOCKED');
  assert.equal(blocked.task.status, 'BLOCKED');

  const conflict = await queue.reconcileIntent({
    repository: 'Patricked-code/MCP', intentKey: 'conflict', title: 'Conflict',
    summary: 'Conflict summary', priority: 5,
    dependencies: [], resourceScopes: ['resource:locked'], requestDigest: 'c'.repeat(64)
  });
  assert.equal(conflict.classification, 'CONFLICT');
  assert.equal(conflict.task.status, 'CONFLICT');

  const current = await queue.listTasks();
  const claimed = await queue.claimNextTask({
    governedSessionId: SESSION,
    expectedStoreRevision: current.storeRevision
  });
  assert.equal(claimed.task.taskId, 'TASK-20260822-002');
  assert.equal(claimed.task.status, 'CLAIMED');
  assert.equal(claimed.task.governedSessionId, SESSION);
});

test('refuse révision périmée et transition illégale sans écriture partielle', async () => {
  const queue = await service();
  await queue.initialize();
  const current = await queue.listTasks();
  const claimed = await queue.claimNextTask({
    governedSessionId: SESSION,
    expectedStoreRevision: current.storeRevision
  });
  const revision = claimed.task.taskRevision;

  await assert.rejects(
    queue.transitionTask({
      taskId: claimed.task.taskId,
      governedSessionId: SESSION,
      expectedTaskRevision: revision + 1,
      status: 'IN_PROGRESS',
      nextAction: 'implement'
    }),
    /TASK_REVISION_MISMATCH/
  );
  await assert.rejects(
    queue.transitionTask({
      taskId: claimed.task.taskId,
      governedSessionId: SESSION,
      expectedTaskRevision: revision,
      status: 'DONE',
      nextAction: null
    }),
    /TASK_TRANSITION_NOT_ALLOWED/
  );
  const unchanged = await queue.getTask(claimed.task.taskId);
  assert.equal(unchanged.taskRevision, revision);
  assert.equal(unchanged.status, 'CLAIMED');
});
