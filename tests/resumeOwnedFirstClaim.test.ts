import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { createAtomicJsonStore } from '../src/operationalMemory/atomicStore.js';
import {
  createGovernedTaskQueue,
  taskRegistryDigest,
  type TaskRegistrySeed
} from '../src/operationalMemory/taskQueue.js';
import {
  TaskStoreDocumentSchema,
  createEmptyTaskStoreDocument
} from '../src/operationalMemory/types.js';

process.env.MCP_AUTH_TOKEN ??= 'mcp-unit-test-value-20261004-abcdef';
process.env.S1_HOST ??= '127.0.0.1';
process.env.S1_KEY_PATH ??= '/tmp/mcp-unit-test-s1-key';
process.env.S2_HOST ??= '127.0.0.1';
process.env.S2_KEY_PATH ??= '/tmp/mcp-unit-test-s2-key';
process.env.MCP_GOVERNED_SESSIONS_ENABLED ??= 'true';

const { registerGovernedTaskMutationTools } = await import('../src/tools/governedTasks.js');

const SESSION_A = '11111111-1111-4111-8111-111111111111';
const SESSION_B = '22222222-2222-4222-8222-222222222222';
const NOW = new Date('2026-10-04T18:30:00.000Z');

const SCOPE = {
  schemaVersion: 1 as const,
  targetId: 'EXAMPLE-001',
  projectId: 'example.platform',
  projectUid: 'EXAMPLE-001',
  components: [
    { mappingId: 'example-api', repositoryId: 'github:ExampleOrg/api', role: 'API' },
    { mappingId: 'example-web', repositoryId: 'github:ExampleOrg/web', role: 'FRONTEND' }
  ]
};
const API_ONLY = { ...SCOPE, components: [SCOPE.components[0]!] };

function seedTask(sequence: number, extra: Record<string, unknown> = {}) {
  return {
    taskId: `TASK-20261004-${String(sequence).padStart(3, '0')}`,
    repository: 'Patricked-code/MCP',
    intentKey: `task-${sequence}`,
    title: `Task ${sequence}`,
    summary: `Ready task ${sequence}.`,
    priority: 50,
    sequence,
    status: 'READY',
    dependencies: [],
    resourceScopes: [`resource:task-${sequence}`],
    blockers: [],
    nextAction: 'claim_governed_task',
    requestDigest: String(sequence % 10).repeat(64),
    ...extra
  };
}

async function fixture(tasks: Array<Record<string, unknown>>) {
  const directory = await mkdtemp(path.join(tmpdir(), 'mcp-resume-owned-'));
  const store = createAtomicJsonStore({
    filePath: path.join(directory, 'tasks.json'),
    schema: TaskStoreDocumentSchema,
    empty: createEmptyTaskStoreDocument
  });
  const queue = createGovernedTaskQueue(store, () => NOW, undefined, async () => [], async () => [SESSION_A, SESSION_B]);
  const unsigned: Omit<TaskRegistrySeed, 'registryDigest'> = {
    schemaVersion: 1, registryVersion: 1, generatedAt: '2026-10-04T00:00:00.000Z', tasks: tasks as never
  };
  await queue.initializeSeed({ ...unsigned, registryDigest: taskRegistryDigest(unsigned) });
  return { directory, queue };
}

async function revision(queue: Awaited<ReturnType<typeof fixture>>['queue']) {
  return (await queue.listVisibleTasks()).storeRevision;
}

test('a session resumes the active task it owns before any new claim, without mutating the queue', async () => {
  const { directory, queue } = await fixture([seedTask(1), seedTask(2)]);
  try {
    const first = await queue.claimNextTask(SESSION_A, await revision(queue));
    assert.equal(first?.taskId, 'TASK-20261004-001');
    const before = await queue.listVisibleTasks();

    const resumed = await queue.claimNextTask(SESSION_A, before.storeRevision);
    assert.equal(resumed?.taskId, 'TASK-20261004-001');
    assert.deepEqual(await queue.listVisibleTasks(), before, 'resuming owned work never mutates the queue');

    const inProgress = await queue.transitionTask({
      taskId: first!.taskId, expectedTaskRevision: first!.taskRevision,
      governedSessionId: SESSION_A, status: 'IN_PROGRESS'
    });
    const again = await queue.claimNextTask(SESSION_A, await revision(queue));
    assert.equal(again?.taskId, inProgress.taskId);
    assert.equal(again?.status, 'IN_PROGRESS');
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('another session never steals owned work and claims the next free task instead', async () => {
  const { directory, queue } = await fixture([seedTask(1), seedTask(2)]);
  try {
    const owned = await queue.claimNextTask(SESSION_A, await revision(queue));
    const other = await queue.claimNextTask(SESSION_B, await revision(queue));
    assert.equal(other?.taskId, 'TASK-20261004-002');
    const tasks = (await queue.listVisibleTasks()).tasks;
    assert.equal(tasks.find((task) => task.taskId === owned!.taskId)?.ownerGovernedSessionId, SESSION_A);
    assert.equal(await queue.claimNextTask(SESSION_B, await revision(queue)).then((task) => task?.taskId), 'TASK-20261004-002');
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('an owned BLOCKED task does not prevent the session from claiming new work', async () => {
  const { directory, queue } = await fixture([seedTask(1), seedTask(2)]);
  try {
    const owned = await queue.claimNextTask(SESSION_A, await revision(queue));
    await queue.transitionTask({
      taskId: owned!.taskId, expectedTaskRevision: owned!.taskRevision,
      governedSessionId: SESSION_A, status: 'BLOCKED', blockers: ['waiting on review']
    });
    const next = await queue.claimNextTask(SESSION_A, await revision(queue));
    assert.equal(next?.taskId, 'TASK-20261004-002');
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('eligibility follows the session TargetScope when the caller states it', async () => {
  const { directory, queue } = await fixture([
    seedTask(1, { repository: 'ExampleOrg/api', targetScope: API_ONLY, resourceScopes: ['component:EXAMPLE-001:example-api'] }),
    seedTask(2),
    seedTask(3, {
      repository: 'ExampleOrg/api',
      targetScope: { ...SCOPE, targetId: 'OTHER-001', projectUid: 'OTHER-001' },
      resourceScopes: ['component:OTHER-001:example-api']
    })
  ]);
  try {
    const unscoped = await queue.claimNextTask(SESSION_A, await revision(queue), { sessionTargetScope: null });
    assert.equal(unscoped?.taskId, 'TASK-20261004-002', 'an unscoped session only claims historical tasks');

    const scoped = await queue.claimNextTask(SESSION_B, await revision(queue), { sessionTargetScope: SCOPE });
    assert.equal(scoped?.taskId, 'TASK-20261004-001', 'a scoped session claims only tasks inside its scope');

    const none = await queue.claimNextTask(
      '33333333-3333-4333-8333-333333333333',
      await revision(queue),
      { sessionTargetScope: API_ONLY }
    );
    assert.equal(none, null, 'a task of another target is never eligible');
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('the claim tool passes the session TargetScope and keeps bootstrap checks first', async () => {
  const calls: unknown[][] = [];
  let session: Record<string, unknown> = {
    governedSessionId: SESSION_A,
    repository: 'ExampleOrg/api',
    targetScope: SCOPE,
    sessionRevision: 3,
    status: 'ACTIVE',
    bootstrapReceipt: { bootstrapReceiptId: '55555555-5555-4555-8555-555555555555', stateVersion: 9, expiresAt: '2099-01-01T00:00:00.000Z' }
  };
  const handlers = new Map<string, (...args: any[]) => Promise<any>>();
  const server = {
    registerTool(name: string, _config: unknown, handler: (...args: any[]) => Promise<any>) {
      handlers.set(name, handler);
    }
  } as unknown as McpServer;
  registerGovernedTaskMutationTools(server, {
    queue: {
      async claimNextTask(...args: unknown[]) { calls.push(args); return null; },
      async reconcileIntent() { return {}; },
      async transitionTask() { return {}; }
    },
    sessions: { async getVisibleSession() { return session; } },
    liveState: { async getCurrent() { return { stateVersion: 9 }; } },
    lifecycle: { run: async (work: () => Promise<unknown>) => work() },
    ready: async () => undefined,
    now: () => NOW
  } as never);
  const extra = {
    sessionId: 'transport-claim',
    authInfo: { clientId: 'c', extra: { governedPrincipalId: 'oauth:test', identityAssurance: 'oauth_subject' } }
  };
  const input = {
    governedSessionId: SESSION_A,
    expectedSessionRevision: 3,
    expectedBootstrapReceiptId: '55555555-5555-4555-8555-555555555555',
    expectedStateVersion: 9,
    expectedStoreRevision: 7
  };
  await handlers.get('mcp_claim_next_governed_task')!(input, extra);
  assert.deepEqual(calls[0], [SESSION_A, 7, { sessionTargetScope: SCOPE }]);

  session = { ...session, repository: 'Patricked-code/MCP', targetScope: undefined };
  await handlers.get('mcp_claim_next_governed_task')!(input, extra);
  assert.deepEqual(calls[1], [SESSION_A, 7, { sessionTargetScope: null }]);

  session = { ...session, sessionRevision: 4 };
  const stale = await handlers.get('mcp_claim_next_governed_task')!(input, extra);
  assert.match(stale.content[0].text, /SESSION_REVISION_MISMATCH/);
  assert.equal(calls.length, 2);
});
