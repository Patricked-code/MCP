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

function capture(overrides: Record<string, unknown> = {}) {
  const handlers = new Map<string, (...args: any[]) => Promise<any>>();
  const server = {
    registerTool(name: string, _config: unknown, handler: (...args: any[]) => Promise<any>) {
      handlers.set(name, handler);
    }
  } as unknown as McpServer;
  let mutationCount = 0;
  const session = {
    governedSessionId: SESSION_ID,
    sessionRevision: 3,
    bootstrapReceipt: {
      bootstrapReceiptId: RECEIPT_ID,
      stateVersion: 9,
      expiresAt: '2099-01-01T00:00:00.000Z'
    }
  };
  registerGovernedTaskTools(server, {
    ready: async () => undefined,
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
  return { handlers, mutationCount: () => mutationCount };
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
