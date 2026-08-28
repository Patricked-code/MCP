import assert from 'node:assert/strict';
import test from 'node:test';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

process.env.MCP_AUTH_TOKEN ??= 'mcp-unit-test-value-20260822-abcdef';
process.env.S1_HOST ??= '127.0.0.1';
process.env.S1_KEY_PATH ??= '/tmp/mcp-unit-test-s1-key';
process.env.S2_HOST ??= '127.0.0.1';
process.env.S2_KEY_PATH ??= '/tmp/mcp-unit-test-s2-key';
process.env.MCP_GOVERNED_SESSIONS_ENABLED ??= 'true';

const { registerGovernedTaskTools } = await import('../src/tools/governedTasks.js');

const SESSION_ID = '11111111-1111-4111-8111-111111111111';
const RECEIPT_ID = '22222222-2222-4222-8222-222222222222';
const EXTRA = {
  sessionId: 'transport-task-tools',
  authInfo: {
    clientId: 'test-client',
    extra: { governedPrincipalId: 'oauth:test', identityAssurance: 'oauth_subject' }
  }
};

function serialLifecycle() {
  let tail = Promise.resolve();
  return {
    run<T>(work: () => Promise<T>): Promise<T> {
      const operation = tail.then(work);
      tail = operation.then(() => undefined, () => undefined);
      return operation;
    }
  };
}

function visibleSession(status = 'ACTIVE') {
  return {
    governedSessionId: SESSION_ID,
    sessionRevision: 3,
    status,
    bootstrapReceipt: {
      bootstrapReceiptId: RECEIPT_ID,
      stateVersion: 9,
      expiresAt: '2099-01-01T00:00:00.000Z'
    }
  };
}

function capture(overrides: Record<string, unknown> = {}) {
  const handlers = new Map<string, (...args: any[]) => Promise<any>>();
  const server = {
    registerTool(name: string, _config: unknown, handler: (...args: any[]) => Promise<any>) {
      handlers.set(name, handler);
    }
  } as unknown as McpServer;
  let mutationCount = 0;
  let readyCount = 0;
  const session = visibleSession();
  registerGovernedTaskTools(server, {
    ready: async () => { readyCount += 1; },
    lifecycle: serialLifecycle(),
    queue: {
      async listVisibleTasks() { return { storeRevision: 4, tasks: [] }; },
      async getVisibleTask() { return null; },
      async reconcileIntent() { mutationCount += 1; return { classification: 'NEW_TASK' }; },
      async claimNextTask() { mutationCount += 1; return null; },
      async transitionTask() { mutationCount += 1; return {}; }
    },
    sessions: {
      async getVisibleSession() { return session; }
    },
    liveState: { async getCurrent() { return { stateVersion: 9 }; } },
    now: () => new Date('2026-08-22T10:00:00.000Z'),
    ...overrides
  } as never);
  return { handlers, mutationCount: () => mutationCount, readyCount: () => readyCount };
}

test('registers queue reads plus three operational mutations', () => {
  const { handlers } = capture();
  assert.deepEqual([...handlers.keys()].sort(), [
    'mcp_claim_next_governed_task',
    'mcp_get_governed_task',
    'mcp_get_work_queue',
    'mcp_reconcile_agent_intent',
    'mcp_transition_governed_task'
  ]);
});

test('queue read tools never initialize or mutate the task store', async () => {
  const { handlers, readyCount } = capture();
  await handlers.get('mcp_get_work_queue')?.({}, EXTRA);
  await handlers.get('mcp_get_governed_task')?.({ taskId: 'TASK-20260822-001' }, EXTRA);
  assert.equal(readyCount(), 0);
});

test('mutation fails before store access when session receipt or revision is stale', async () => {
  const { handlers, mutationCount } = capture({
    sessions: { async getVisibleSession() { return null; } }
  });
  const result = await handlers.get('mcp_reconcile_agent_intent')?.({
    governedSessionId: SESSION_ID,
    expectedSessionRevision: 3,
    expectedBootstrapReceiptId: RECEIPT_ID,
    expectedStateVersion: 9,
    repository: 'Patricked-code/MCP',
    intentKey: 'new-intent', title: 'New intent', summary: 'Bounded summary.',
    priority: 50, dependencies: [], resourceScopes: []
  }, EXTRA);
  assert.equal(result.isError, true);
  assert.match(result.content[0].text, /SESSION_NOT_BOUND/);
  assert.equal(mutationCount(), 0);
});

test('valid receipt allows deterministic intent reconciliation', async () => {
  const { handlers, mutationCount } = capture();
  const result = await handlers.get('mcp_reconcile_agent_intent')?.({
    governedSessionId: SESSION_ID,
    expectedSessionRevision: 3,
    expectedBootstrapReceiptId: RECEIPT_ID,
    expectedStateVersion: 9,
    repository: 'Patricked-code/MCP',
    intentKey: 'new-intent', title: 'New intent', summary: 'Bounded summary.',
    priority: 50, dependencies: [], resourceScopes: []
  }, EXTRA);
  assert.equal(result.isError, undefined);
  assert.match(result.content[0].text, /NEW_TASK/);
  assert.equal(mutationCount(), 1);
});

test('terminal sessions cannot mutate the governed task queue', async () => {
  for (const status of ['CLOSED', 'EXPIRED']) {
    const { handlers, mutationCount } = capture({
      sessions: { async getVisibleSession() { return visibleSession(status); } }
    });
    const common = {
      governedSessionId: SESSION_ID,
      expectedSessionRevision: 3,
      expectedBootstrapReceiptId: RECEIPT_ID,
      expectedStateVersion: 9
    };
    const attempts = [
      ['mcp_reconcile_agent_intent', {
        ...common, repository: 'Patricked-code/MCP', intentKey: 'terminal-intent',
        title: 'Terminal intent', summary: 'Must not mutate.', priority: 50,
        dependencies: [], resourceScopes: []
      }],
      ['mcp_claim_next_governed_task', { ...common, expectedStoreRevision: 4 }],
      ['mcp_transition_governed_task', {
        ...common, taskId: 'TASK-20260822-001', expectedTaskRevision: 1,
        status: 'IN_PROGRESS'
      }]
    ] as const;
    for (const [toolName, input] of attempts) {
      const result = await handlers.get(toolName)?.(input, EXTRA);
      assert.equal(result.isError, true);
      assert.match(result.content[0].text, new RegExp(`SESSION_${status}`));
    }
    assert.equal(mutationCount(), 0);
  }
});

test('task mutation holds the shared lifecycle coordinator through persistence', async () => {
  const lifecycle = serialLifecycle();
  let announceClaim!: () => void;
  let releaseClaim!: () => void;
  const claimStarted = new Promise<void>((resolve) => { announceClaim = resolve; });
  const claimMayFinish = new Promise<void>((resolve) => { releaseClaim = resolve; });
  const { handlers } = capture({
    lifecycle,
    queue: {
      async claimNextTask() {
        announceClaim();
        await claimMayFinish;
        return null;
      }
    }
  });
  const mutation = handlers.get('mcp_claim_next_governed_task')?.({
    governedSessionId: SESSION_ID,
    expectedSessionRevision: 3,
    expectedBootstrapReceiptId: RECEIPT_ID,
    expectedStateVersion: 9,
    expectedStoreRevision: 4
  }, EXTRA);
  await claimStarted;

  let lifecycleMutationRan = false;
  const competingLifecycleMutation = lifecycle.run(async () => {
    lifecycleMutationRan = true;
  });
  await Promise.resolve();
  const ranBeforeTaskPersistenceCompleted = lifecycleMutationRan;

  releaseClaim();
  await mutation;
  await competingLifecycleMutation;
  assert.equal(ranBeforeTaskPersistenceCompleted, false);
  assert.equal(lifecycleMutationRan, true);
});
