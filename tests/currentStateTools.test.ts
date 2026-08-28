import assert from 'node:assert/strict';
import test from 'node:test';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { createCurrentStateService } from '../src/currentState/service.js';

process.env.MCP_AUTH_TOKEN ??= 'mcp-unit-test-value-20260822-abcdef';
process.env.S1_HOST ??= '127.0.0.1';
process.env.S1_KEY_PATH ??= '/tmp/mcp-unit-test-s1-key';
process.env.S2_HOST ??= '127.0.0.1';
process.env.S2_KEY_PATH ??= '/tmp/mcp-unit-test-s2-key';
process.env.MCP_GOVERNED_SESSIONS_ENABLED ??= 'true';

const {
  CURRENT_STATE_RESOURCE_URI,
  registerCurrentStateTools
} = await import('../src/tools/currentState.js');

const EXTRA = {
  sessionId: 'transport-current-state',
  authInfo: {
    clientId: 'test-client',
    extra: { governedPrincipalId: 'oauth:test', identityAssurance: 'oauth_subject' }
  }
};

test('resource and read tool expose the exact same bounded projection', async () => {
  const tools = new Map<string, (...args: any[]) => Promise<any>>();
  const resources = new Map<string, (...args: any[]) => Promise<any>>();
  const server = {
    registerTool(name: string, _config: unknown, handler: (...args: any[]) => Promise<any>) {
      tools.set(name, handler);
    },
    registerResource(name: string, _uri: string, _config: unknown, handler: (...args: any[]) => Promise<any>) {
      resources.set(name, handler);
    }
  } as unknown as McpServer;
  const inventory = {
    schemaVersion: 1, generatedAt: '2026-08-22T10:00:00.000Z',
    repository: 'Patricked-code/MCP', currentTask: null, firstExecutableTask: null
  };
  const observedRequests: unknown[] = [];
  registerCurrentStateTools(server, {
    async getInventory(request: unknown) {
      observedRequests.push(request);
      return inventory as never;
    }
  });

  const toolResult = await tools.get('mcp_get_current_state_inventory')?.({}, EXTRA);
  const resourceResult = await resources.get('wealthtech-current-state-inventory')?.(
    new URL(CURRENT_STATE_RESOURCE_URI), EXTRA
  );
  const toolBody = JSON.parse(toolResult.content[0].text);
  const resourceBody = JSON.parse(resourceResult.contents[0].text);
  assert.deepEqual(toolBody, inventory);
  assert.deepEqual(resourceBody, inventory);
  assert.equal(observedRequests.length, 2);
  assert.equal(JSON.stringify(toolResult).includes('transport-current-state'), false);
});

function currentStateService(tasks: Array<Record<string, unknown>>, requestedSessionId: string) {
  const session = (governedSessionId: string) => ({
    governedSessionId,
    status: 'ACTIVE'
  });
  return createCurrentStateService({
    liveState: { async getCurrent() { return null; } },
    tasks: {
      async listVisibleTasks() {
        return {
          schemaVersion: 1,
          storeRevision: 1,
          seedRegistryVersion: 1,
          nextSequence: tasks.length + 1,
          tasks
        };
      }
    },
    sessions: {
      async listVisibleSessions() {
        return [
          session('11111111-1111-4111-8111-111111111111'),
          session('22222222-2222-4222-8222-222222222222')
        ];
      },
      lookupGovernedSessionId() { return requestedSessionId; }
    },
    catalogue: () => ({ counts: { tools: 1 }, catalogDigest: 'a'.repeat(64) } as never),
    now: () => new Date('2026-08-22T10:00:00.000Z')
  } as never);
}

const CURRENT_STATE_REQUEST = {
  transportSessionId: 'transport-current-state',
  identity: {
    principalId: 'oauth:test',
    clientId: 'test-client',
    assurance: 'oauth_subject' as const
  }
};

test('currentTask belongs to the governed session bound to the requesting transport', async () => {
  const requestedSessionId = '22222222-2222-4222-8222-222222222222';
  const service = currentStateService([
    {
      taskId: 'TASK-20260822-001', sequence: 1, status: 'IN_PROGRESS',
      ownerGovernedSessionId: '11111111-1111-4111-8111-111111111111', dependencies: []
    },
    {
      taskId: 'TASK-20260822-002', sequence: 2, status: 'IN_PROGRESS',
      ownerGovernedSessionId: requestedSessionId, dependencies: []
    }
  ], requestedSessionId);

  const inventory = await service.getInventory(CURRENT_STATE_REQUEST);
  assert.equal(inventory.currentTask?.taskId, 'TASK-20260822-002');
});

test('currentTask excludes a terminal task owned by the requesting session', async () => {
  const requestedSessionId = '22222222-2222-4222-8222-222222222222';
  const service = currentStateService([{
    taskId: 'TASK-20260822-002', sequence: 2, status: 'DONE',
    ownerGovernedSessionId: requestedSessionId, dependencies: []
  }], requestedSessionId);

  const inventory = await service.getInventory(CURRENT_STATE_REQUEST);
  assert.equal(inventory.currentTask, null);
});
