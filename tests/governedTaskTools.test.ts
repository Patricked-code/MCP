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

test('registers queue reads plus four operational mutations', () => {
  const { handlers } = capture();
  assert.deepEqual([...handlers.keys()].sort(), [
    'mcp_claim_next_governed_task',
    'mcp_get_governed_task',
    'mcp_get_work_queue',
    'mcp_materialize_program_blueprint',
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


const TARGET_TASK = 'TASK-20261124-002';
const TARGET_INPUT = {
  governedSessionId: SESSION_ID,
  expectedSessionRevision: 3,
  expectedBootstrapReceiptId: RECEIPT_ID,
  expectedStateVersion: 9,
  expectedStoreRevision: 4,
  targetTask: { taskId: TARGET_TASK, expectedTaskRevision: 1 }
};

function targetedSession(overrides: Record<string, unknown> = {}) {
  const session = visibleSession();
  return {
    ...session, repository: 'Patricked-code/MCP', taskScope: TARGET_TASK,
    identityAssurance: 'oauth_subject', ownerPrincipalId: 'oauth:test',
    lastAcknowledgedStateVersion: 9,
    bootstrapReceipt: {
      ...session.bootstrapReceipt, status: 'ACKNOWLEDGED',
      governedSessionId: SESSION_ID, repository: 'Patricked-code/MCP'
    },
    ...overrides
  };
}

function targetedCapture(options: {
  session?: ReturnType<typeof targetedSession>;
  binding?: string | null;
  repository?: string;
  error?: string;
  absent?: boolean;
} = {}) {
  const calls: { exact: unknown[][]; next: number } = { exact: [], next: 0 };
  const { handlers } = capture({
    sessions: {
      async getVisibleSession() { return options.session ?? targetedSession(); },
      lookupGovernedSessionId() { return options.binding === undefined ? SESSION_ID : options.binding; }
    },
    queue: {
      async getVisibleTask() {
        return options.absent ? null : { taskId: TARGET_TASK, repository: options.repository ?? 'Patricked-code/MCP' };
      },
      async claimNextTask() { calls.next += 1; return null; },
      async claimTaskById(...args: unknown[]) {
        calls.exact.push(args);
        if (options.error) throw new Error(options.error);
        return { taskId: TARGET_TASK, status: 'CLAIMED' };
      }
    }
  });
  return { claim: handlers.get('mcp_claim_next_governed_task')!, calls };
}

test('explicit exact task claim reuses the queue with both CAS revisions and never calls global selection', async () => {
  const { claim, calls } = targetedCapture();
  const result = await claim(TARGET_INPUT, EXTRA);
  assert.equal(result.isError, undefined);
  assert.deepEqual(JSON.parse(result.content[0].text).result, { taskId: TARGET_TASK, status: 'CLAIMED' });
  assert.deepEqual(calls.exact, [[SESSION_ID, TARGET_TASK, 1, 4, { sessionTargetScope: null }]]);
  assert.equal(calls.next, 0);
});

test('legacy claim remains priority/sequence selection without targetTask', async () => {
  const { claim, calls } = targetedCapture();
  const { targetTask: _target, ...legacy } = TARGET_INPUT;
  await claim(legacy, EXTRA);
  assert.equal(calls.next, 1);
  assert.equal(calls.exact.length, 0);
});

test('exact task claim rejects unbound, paused, unrelated scope, principal or repository before mutation', async () => {
  const scenarios = [
    { options: { binding: null }, code: 'TARGET_CLAIM_SESSION_NOT_BOUND' },
    { options: { session: targetedSession({ ownerPrincipalId: 'oauth:other' }) }, code: 'TARGET_CLAIM_SESSION_NOT_BOUND' },
    { options: { session: targetedSession({ identityAssurance: 'shared_credential' }) }, code: 'TARGET_CLAIM_SESSION_NOT_BOUND' },
    { options: { session: targetedSession({ status: 'PAUSED' }) }, code: 'TARGET_CLAIM_SESSION_NOT_ACTIVE' },
    { options: { session: targetedSession({ taskScope: 'TASK-20261124-001' }) }, code: 'TARGET_CLAIM_TASK_SCOPE_MISMATCH' },
    { options: { session: targetedSession({ lastAcknowledgedStateVersion: 8 }) }, code: 'TARGET_CLAIM_BOOTSTRAP_MISMATCH' },
    { options: { repository: 'other/repo' }, code: 'TARGET_CLAIM_REPOSITORY_MISMATCH' },
    { options: { absent: true }, code: 'TASK_NOT_FOUND' }
  ];
  for (const { options, code } of scenarios) {
    const { claim, calls } = targetedCapture(options);
    const result = await claim(TARGET_INPUT, EXTRA);
    assert.equal(result.isError, true, code);
    assert.equal(JSON.parse(result.content[0].text).error.code, code);
    assert.equal(calls.exact.length, 0);
    assert.equal(calls.next, 0);
  }
});

test('exact task claim fails closed on queue CAS, ownership, scope or lock errors', async () => {
  for (const error of ['TASK_STORE_REVISION_MISMATCH', 'TASK_REVISION_MISMATCH', 'TASK_SCOPE_MISMATCH',
    'TASK_OWNED_BY_OTHER_SESSION', 'TASK_SESSION_ALREADY_OWNS_OTHER_TASK', 'TASK_NOT_EXECUTABLE',
    'TASK_RESOURCE_CONFLICT', 'TASK_LOCK_CONFLICT']) {
    const { claim, calls } = targetedCapture({ error });
    const result = await claim(TARGET_INPUT, EXTRA);
    assert.equal(result.isError, true);
    assert.equal(JSON.parse(result.content[0].text).error.code, error);
    assert.equal(calls.exact.length, 1);
    assert.equal(calls.next, 0);
  }
});
