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

function currentStateService(
  tasks: Array<Record<string, unknown>>,
  requestedSessionId: string | null,
  requestedSessionStatus = 'ACTIVE'
) {
  const session = (governedSessionId: string) => ({
    governedSessionId,
    status: governedSessionId === requestedSessionId ? requestedSessionStatus : 'ACTIVE'
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

test('currentTask excludes every terminal task and unusable or unbound sessions', async () => {
  const requestedSessionId = '22222222-2222-4222-8222-222222222222';
  for (const status of ['DONE', 'CANCELLED', 'SUPERSEDED']) {
    const service = currentStateService([{
      taskId: 'TASK-20260822-002', sequence: 2, status,
      ownerGovernedSessionId: requestedSessionId, dependencies: []
    }], requestedSessionId);
    assert.equal((await service.getInventory(CURRENT_STATE_REQUEST)).currentTask, null);
  }
  for (const sessionStatus of ['CLOSED', 'EXPIRED']) {
    const service = currentStateService([{
      taskId: 'TASK-20260822-002', sequence: 2, status: 'IN_PROGRESS',
      ownerGovernedSessionId: requestedSessionId, dependencies: []
    }], requestedSessionId, sessionStatus);
    assert.equal((await service.getInventory(CURRENT_STATE_REQUEST)).currentTask, null);
  }
  const unbound = currentStateService([{
    taskId: 'TASK-20260822-002', sequence: 2, status: 'IN_PROGRESS',
    ownerGovernedSessionId: requestedSessionId, dependencies: []
  }], null);
  assert.equal((await unbound.getInventory(CURRENT_STATE_REQUEST)).currentTask, null);
});


test('AF-18 current state uses the same deterministic taskId tie-break as the queue', async () => {
  const service = currentStateService([
    {
      taskId: 'TASK-20260822-010', sequence: 3, priority: 50, status: 'READY',
      ownerGovernedSessionId: null, dependencies: []
    },
    {
      taskId: 'TASK-20260822-009', sequence: 3, priority: 50, status: 'READY',
      ownerGovernedSessionId: null, dependencies: []
    }
  ], null);

  const inventory = await service.getInventory(CURRENT_STATE_REQUEST);
  assert.equal(inventory.firstExecutableTask?.taskId, 'TASK-20260822-009');
});


test('UAC-19 current-state inventory composes read-only coordination supervision from existing authorities', async () => {
  const governedSessionId = '88888888-8888-4888-8888-888888888888';
  const activeLockId = '99999999-9999-4999-8999-999999999999';
  const service = createCurrentStateService({
    liveState: { async getCurrent() { return null; } },
    tasks: {
      async listVisibleTasks() {
        return {
          schemaVersion: 1,
          storeRevision: 31,
          seedRegistryVersion: 1,
          nextSequence: 156,
          tasks: [{
            schemaVersion: 1,
            taskId: 'TASK-20260924-156',
            repository: 'Patricked-code/MCP',
            intentKey: 'coordination.universal',
            title: 'Universal coordination supervision',
            summary: 'Expose existing coordination authorities read-only',
            priority: 100,
            sequence: 156,
            status: 'IN_PROGRESS',
            dependencies: [],
            resourceScopes: ['resource:coordination.universal'],
            ownerGovernedSessionId: governedSessionId,
            workBranch: 'mcp/universal-agent-coordination-20260923',
            pullRequestNumber: 154,
            observedHeadSha: 'a'.repeat(40),
            runtimeRevision: null,
            blockers: ['task blocker'],
            nextAction: 'run exact-head CI',
            source: { kind: 'agent', requestDigest: 'b'.repeat(64) },
            createdAt: '2026-09-24T15:00:00Z',
            updatedAt: '2026-09-24T15:05:00Z',
            taskRevision: 24
          }]
        };
      }
    },
    sessions: {
      async listVisibleSessions() {
        return [{
          schemaVersion: 1,
          governedSessionId,
          repository: 'Patricked-code/MCP',
          taskScope: 'coordination.universal',
          workBranch: 'mcp/universal-agent-coordination-20260923',
          agentIdentity: 'chatgpt',
          ownerPrincipalId: 'oauth:test',
          identityAssurance: 'oauth_subject',
          status: 'ACTIVE',
          createdAt: '2026-09-24T15:00:00Z',
          resumedAt: null,
          lastHeartbeatAt: '2026-09-24T15:00:00Z',
          pausedAt: null,
          expiredAt: null,
          closedAt: null,
          currentTransport: null,
          lastAcknowledgedStateVersion: 31,
          bootstrapReceipt: null,
          connectionContext: null,
          sessionRevision: 25,
          lastCheckpoint: {
            checkpointId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
            governedSessionId,
            createdAt: '2026-09-24T15:06:00Z',
            taskScope: 'coordination.universal',
            workBranch: 'mcp/universal-agent-coordination-20260923',
            pullRequestNumber: 154,
            observedHeadSha: 'a'.repeat(40),
            acknowledgedStateVersion: 31,
            completedAction: 'UAC-18 terminal lifecycle audit',
            resultCode: 'PASS',
            blockers: ['checkpoint blocker'],
            nextAction: 'build UAC-19 supervision',
            eventIds: [],
            sessionRevision: 25
          },
          blockers: ['session blocker'],
          nextAction: 'continue UAC',
          lockIds: [activeLockId],
          resumePolicy: 'stable_principal_or_resume_secret'
        }];
      },
      lookupGovernedSessionId() { return governedSessionId; }
    },
    locks: {
      async listActiveLocks() {
        return [{
          schemaVersion: 1,
          lockId: activeLockId,
          scope: 'resource:coordination.universal',
          governedSessionId,
          acquiredAt: '2026-09-24T15:05:00Z',
          expiresAt: '2026-09-24T15:20:00Z',
          renewedAt: '2026-09-24T15:05:00Z',
          reason: 'UAC supervision fixture',
          status: 'ACTIVE',
          lockRevision: 3
        }];
      }
    },
    coordinationLivenessFreshnessSeconds: 120,
    catalogue: () => ({ counts: { tools: 1 }, catalogDigest: 'c'.repeat(64) }),
    now: () => new Date('2026-09-24T15:10:00Z')
  } as never);

  const inventory = await service.getInventory(CURRENT_STATE_REQUEST);
  const coordination = (inventory as any).coordination;
  assert.equal(coordination.projectionKind, 'READ_ONLY_AGENT_COORDINATION_SUPERVISION');
  assert.equal(coordination.authoritative, false);
  assert.equal(coordination.session.governedSessionId, governedSessionId);
  assert.equal(coordination.session.agentIdentity, 'chatgpt');
  assert.equal(coordination.task.taskId, 'TASK-20260924-156');
  assert.equal(coordination.ownership.ownershipState, 'OWNED');
  assert.equal(coordination.ownership.ownerGovernedSessionId, governedSessionId);
  assert.equal(coordination.liveness.liveness, 'STALE');
  assert.equal(coordination.liveness.releaseAllowedByLiveness, false);
  assert.equal(coordination.liveness.transferAllowedByLiveness, false);
  assert.deepEqual(coordination.locks.activeLockIds, [activeLockId]);
  assert.deepEqual(coordination.collisionDomains, ['resource:coordination.universal']);
  assert.equal(coordination.checkpoint.currentStep, 'IN_PROGRESS');
  assert.equal(coordination.checkpoint.nextActions.session, 'continue UAC');
  assert.equal(coordination.checkpoint.nextActions.task, 'run exact-head CI');
  assert.equal(coordination.checkpoint.nextActions.checkpoint, 'build UAC-19 supervision');
  assert.equal(coordination.authorizationInferred, false);
  assert.equal(coordination.mutationPerformed, false);
});
