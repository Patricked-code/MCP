import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { createAtomicJsonStore } from '../src/operationalMemory/atomicStore.js';
import {
  createGovernedTaskQueue,
  TaskRegistrySeedSchema,
  taskRegistryDigest,
  type TaskRegistrySeed
} from '../src/operationalMemory/taskQueue.js';
import {
  TaskStoreDocumentSchema,
  createEmptyTaskStoreDocument
} from '../src/operationalMemory/types.js';

const SESSION = '11111111-1111-4111-8111-111111111111';
const OTHER_SESSION = '22222222-2222-4222-8222-222222222222';
const NOW = new Date('2026-08-22T10:00:00.000Z');

function seed(): TaskRegistrySeed {
  const unsigned: Omit<TaskRegistrySeed, 'registryDigest'> = {
    schemaVersion: 1,
    registryVersion: 1,
    generatedAt: '2026-08-22T00:00:00.000Z',
    tasks: [
      {
        taskId: 'TASK-20260821-001', repository: 'Patricked-code/MCP', intentKey: 'completed-task',
        title: 'Completed', summary: 'Completed prerequisite.', priority: 50, sequence: 1,
        status: 'DONE', dependencies: [], resourceScopes: [], blockers: [], nextAction: null,
        requestDigest: 'a'.repeat(64)
      },
      {
        taskId: 'TASK-20260822-001', repository: 'Patricked-code/MCP', intentKey: 'existing-ready-task',
        title: 'Existing', summary: 'Existing ready task.', priority: 50, sequence: 2,
        status: 'READY', dependencies: ['TASK-20260821-001'], resourceScopes: ['resource:existing'],
        blockers: [], nextAction: 'claim_governed_task', requestDigest: 'b'.repeat(64)
      }
    ]
  };
  return { ...unsigned, registryDigest: taskRegistryDigest(unsigned) };
}

async function fixture(
  activeLocks: Array<{ scope: string; governedSessionId: string }> = [],
  retainedTaskOwnerSessionIds: string[] = [SESSION],
  audit?: { record(input: { type: string }): Promise<void> }
) {
  const directory = await mkdtemp(path.join(tmpdir(), 'mcp-task-queue-'));
  const store = createAtomicJsonStore({
    filePath: path.join(directory, 'tasks.json'),
    schema: TaskStoreDocumentSchema,
    empty: createEmptyTaskStoreDocument
  });
  const queue = createGovernedTaskQueue(
    store,
    () => NOW,
    audit,
    async () => activeLocks,
    async () => retainedTaskOwnerSessionIds
  );
  await queue.initializeSeed(seed());
  return { directory, store, queue };
}

test('seed is idempotent and a new intent is appended without duplication', async () => {
  const { directory, queue } = await fixture();
  try {
    const once = await queue.listVisibleTasks();
    await queue.initializeSeed(seed());
    const twice = await queue.listVisibleTasks();
    assert.deepEqual(twice, once);

    const input = {
      repository: 'Patricked-code/MCP', intentKey: 'new-request', title: 'New request',
      summary: 'A bounded summary.', priority: 50, dependencies: [], resourceScopes: ['resource:new']
    };
    const created = await queue.reconcileIntent(input, SESSION);
    assert.equal(created.classification, 'NEW_TASK');
    assert.equal(created.task?.sequence, 3);
    assert.equal(created.firstExecutableTask?.taskId, 'TASK-20260822-001');

    const repeated = await queue.reconcileIntent(input, SESSION);
    assert.equal(repeated.classification, 'CONTINUATION');
    assert.equal((await queue.listVisibleTasks()).tasks.length, 3);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('an external active lock blocks another session but never blocks its owner', async () => {
  const { directory, queue } = await fixture([{
    scope: 'resource:new',
    governedSessionId: OTHER_SESSION
  }]);
  try {
    const conflict = await queue.reconcileIntent({
      repository: 'Patricked-code/MCP', intentKey: 'externally-locked', title: 'Locked',
      summary: 'This scope is locked by another session.', priority: 50,
      dependencies: [], resourceScopes: ['resource:new']
    }, SESSION);
    assert.equal(conflict.classification, 'CONFLICT');
    assert.equal(conflict.reasonCode, 'active_lock_scope_conflict');

    const ownerContinuation = await queue.reconcileIntent({
      repository: 'Patricked-code/MCP', intentKey: 'owner-lock', title: 'Owner lock',
      summary: 'The lock owner can enqueue work in its own scope.', priority: 50,
      dependencies: [], resourceScopes: ['resource:new']
    }, OTHER_SESSION);
    assert.equal(ownerContinuation.classification, 'NEW_TASK');
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('dependencies block, active scopes conflict and the earlier ready task is claimed first', async () => {
  const { directory, queue } = await fixture();
  try {
    const blocked = await queue.reconcileIntent({
      repository: 'Patricked-code/MCP', intentKey: 'blocked', title: 'Blocked', summary: 'Blocked intent.',
      priority: 50, dependencies: ['TASK-20990101-001'], resourceScopes: []
    }, SESSION);
    assert.equal(blocked.classification, 'BLOCKED');

    const conflicting = await queue.reconcileIntent({
      repository: 'Patricked-code/MCP', intentKey: 'conflict', title: 'Conflict', summary: 'Conflict intent.',
      priority: 50, dependencies: [], resourceScopes: ['resource:existing']
    }, SESSION);
    assert.equal(conflicting.classification, 'CONFLICT');

    await queue.reconcileIntent({
      repository: 'Patricked-code/MCP', intentKey: 'later', title: 'Later', summary: 'Later task.',
      priority: 50, dependencies: [], resourceScopes: ['resource:later']
    }, SESSION);
    const state = await queue.listVisibleTasks();
    const claimed = await queue.claimNextTask(SESSION, state.storeRevision);
    assert.equal(claimed?.taskId, 'TASK-20260822-001');
    assert.equal(claimed?.ownerGovernedSessionId, SESSION);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('stale revisions and illegal transitions do not mutate the store', async () => {
  const { directory, queue } = await fixture();
  try {
    const state = await queue.listVisibleTasks();
    const claimed = await queue.claimNextTask(SESSION, state.storeRevision);
    assert.ok(claimed);
    const before = await queue.listVisibleTasks();

    await assert.rejects(queue.transitionTask({
      taskId: claimed.taskId, expectedTaskRevision: claimed.taskRevision - 1,
      governedSessionId: SESSION, status: 'IN_PROGRESS'
    }), /TASK_REVISION_MISMATCH/);
    assert.deepEqual(await queue.listVisibleTasks(), before);

    await assert.rejects(queue.transitionTask({
      taskId: claimed.taskId, expectedTaskRevision: claimed.taskRevision,
      governedSessionId: OTHER_SESSION, status: 'IN_PROGRESS'
    }), /TASK_NOT_OWNED_BY_SESSION/);
    await assert.rejects(queue.transitionTask({
      taskId: claimed.taskId, expectedTaskRevision: claimed.taskRevision,
      governedSessionId: SESSION, status: 'DONE'
    }), /TASK_TRANSITION_FORBIDDEN/);
    assert.deepEqual(await queue.listVisibleTasks(), before);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('unfinished tasks are requeued when their owning session is terminal or already pruned', async () => {
  const { directory, queue } = await fixture([], []);
  try {
    const state = await queue.listVisibleTasks();
    const claimed = await queue.claimNextTask(SESSION, state.storeRevision);
    assert.ok(claimed);
    const inProgress = await queue.transitionTask({
      taskId: claimed.taskId,
      expectedTaskRevision: claimed.taskRevision,
      governedSessionId: SESSION,
      status: 'IN_PROGRESS',
      blockers: ['previous owner unavailable'],
      workBranch: 'mcp/fix-mandatory-bootstrap-review-20260822',
      pullRequestNumber: 52,
      observedHeadSha: 'e067af0aedc26ef7a351eea39d6ceb7740684734',
      runtimeRevision: '4d17e972ea04624fc41f90fbb908dc0f70b34430'
    });

    assert.equal(await queue.requeueTerminalSessionTasks(), 1);
    const requeued = await queue.getVisibleTask(inProgress.taskId);
    assert.equal(requeued?.status, 'READY');
    assert.equal(requeued?.ownerGovernedSessionId, null);
    assert.equal(requeued?.nextAction, 'claim_governed_task');
    assert.equal(requeued?.workBranch, 'mcp/fix-mandatory-bootstrap-review-20260822');
    assert.equal(requeued?.pullRequestNumber, 52);
    assert.equal(requeued?.observedHeadSha, 'e067af0aedc26ef7a351eea39d6ceb7740684734');
    assert.equal(requeued?.runtimeRevision, '4d17e972ea04624fc41f90fbb908dc0f70b34430');
    assert.deepEqual(requeued?.blockers, []);
    assert.equal(requeued?.taskRevision, inProgress.taskRevision + 1);
    assert.equal(await queue.requeueTerminalSessionTasks(), 0);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('requeue remains persisted and idempotent when best-effort audit fails', async () => {
  let auditAttempts = 0;
  const { directory, queue } = await fixture([], [], {
    async record() {
      auditAttempts += 1;
      throw new Error('AUDIT_UNAVAILABLE');
    }
  });
  try {
    const state = await queue.listVisibleTasks();
    const claimed = await queue.claimNextTask(SESSION, state.storeRevision);
    assert.ok(claimed);
    auditAttempts = 0;

    assert.equal(await queue.requeueTerminalSessionTasks(), 1);
    assert.equal((await queue.getVisibleTask(claimed.taskId))?.status, 'READY');
    assert.equal(auditAttempts, 1);
    assert.equal(await queue.requeueTerminalSessionTasks(), 0);
    assert.equal(auditAttempts, 1);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('the versioned registry is valid and has an exact digest', async () => {
  const raw = JSON.parse(await readFile('.mcp/task-registry.json', 'utf8')) as TaskRegistrySeed;
  const { registryDigest, ...unsigned } = raw;
  assert.equal(TaskRegistrySeedSchema.safeParse(raw).success, true);
  assert.equal(registryDigest, taskRegistryDigest(unsigned));
});
