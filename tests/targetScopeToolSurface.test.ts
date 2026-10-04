import assert from 'node:assert/strict';
import test from 'node:test';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import { narrowTargetScope } from '../src/operationalMemory/targetScope.js';
import { createGovernedSessionService } from '../src/operationalMemory/sessionService.js';
import { createTransportBindings } from '../src/operationalMemory/transportBindings.js';
import {
  ClientToolSurfaceCapabilitySchema,
  createEmptySessionStoreDocument
} from '../src/operationalMemory/types.js';

process.env.MCP_AUTH_TOKEN ??= 'mcp-unit-test-value-20260805-abcdef';
process.env.S1_HOST ??= '127.0.0.1';
process.env.S1_KEY_PATH ??= '/tmp/mcp-unit-test-s1-key';
process.env.S2_HOST ??= '127.0.0.1';
process.env.S2_KEY_PATH ??= '/tmp/mcp-unit-test-s2-key';

const { registerGovernedSessionTools } = await import('../src/tools/governedSessions.js');
const { registerGovernedTaskMutationTools } = await import('../src/tools/governedTasks.js');
const { createGovernedOperationalContextService } = await import('../src/governedContext/service.js');

const NOW = '2026-10-04T17:00:00.000Z';
const SESSION_ID = '11111111-1111-4111-8111-111111111111';
const RECEIPT_ID = '55555555-5555-4555-8555-555555555555';

const TARGET_CONTEXT = {
  schemaVersion: 1,
  status: 'UNVERIFIED',
  targetId: 'EXAMPLE-001',
  projectId: 'example.platform',
  projectUid: 'EXAMPLE-001',
  globalCheckpointRepositoryId: 'github:ExampleOrg/web',
  centralGovernanceRepositoryId: 'github:ExampleOrg/web',
  observedAt: NOW,
  components: [
    {
      mappingId: 'example-api', repositoryId: 'github:ExampleOrg/api', role: 'API',
      githubHead: null, runtimeRevision: null, freshness: 'UNVERIFIED', reasonCodes: ['COMPONENT_OBSERVATION_MISSING']
    },
    {
      mappingId: 'example-web', repositoryId: 'github:ExampleOrg/web', role: 'FRONTEND',
      githubHead: null, runtimeRevision: null, freshness: 'UNVERIFIED', reasonCodes: ['COMPONENT_OBSERVATION_MISSING']
    }
  ]
} as const;

const FULL_SCOPE = {
  schemaVersion: 1 as const,
  targetId: 'EXAMPLE-001',
  projectId: 'example.platform',
  projectUid: 'EXAMPLE-001',
  components: [
    { mappingId: 'example-api', repositoryId: 'github:ExampleOrg/api', role: 'API' },
    { mappingId: 'example-web', repositoryId: 'github:ExampleOrg/web', role: 'FRONTEND' }
  ]
};

const IDENTITY = {
  principalId: 'oauth:wealthtech-mcp-admin',
  clientId: 'b32-client',
  assurance: 'oauth_subject' as const
};

function memoryJsonStore<T>(initial: T) {
  let value = initial;
  return {
    async read() { return value; },
    async update(mutator: (current: T) => T | Promise<T>) {
      value = await mutator(value);
      return value;
    }
  } as any;
}

function sessionService(targetContext: unknown = TARGET_CONTEXT) {
  return createGovernedSessionService({
    store: memoryJsonStore(createEmptySessionStoreDocument()),
    bindings: createTransportBindings(),
    idleTtlSeconds: 3600,
    resumeGraceSeconds: 3600,
    now: () => new Date(NOW),
    getLiveState: async () => ({
      stateVersion: 7,
      ...(targetContext ? { targetContext: targetContext as any } : {})
    })
  });
}

function openInput(overrides: Record<string, unknown> = {}) {
  return {
    repository: 'ExampleOrg/api',
    taskScope: 'b32-scope',
    workBranch: null,
    agentIdentity: 'b32-agent',
    blockers: [],
    nextAction: null,
    ...overrides
  } as any;
}

type Handler = (input: any, extra: any) => Promise<any>;

function captureTools(register: (server: McpServer) => void) {
  const handlers = new Map<string, Handler>();
  const schemas = new Map<string, Record<string, z.ZodTypeAny>>();
  const server = {
    tool(name: string, ...args: unknown[]) {
      handlers.set(name, args.at(-1) as Handler);
      schemas.set(name, args.at(-2) as Record<string, z.ZodTypeAny>);
      return undefined;
    },
    registerTool(name: string, config: { inputSchema: Record<string, z.ZodTypeAny> }, handler: Handler) {
      handlers.set(name, handler);
      schemas.set(name, config.inputSchema);
      return undefined;
    }
  } as unknown as McpServer;
  register(server);
  return { handlers, schemas };
}

function textJson(result: { content: Array<{ type: string; text: string }> }) {
  return JSON.parse(result.content[0]?.text ?? 'null');
}

const EXTRA = {
  sessionId: 'transport-b32',
  authInfo: {
    token: 'redacted',
    clientId: 'b32-client',
    scopes: ['mcp:read'],
    extra: { identityAssurance: 'oauth_subject', governedPrincipalId: 'oauth:wealthtech-mcp-admin' }
  }
};

test('narrowTargetScope keeps an exact component subset of the session scope and refuses outsiders', () => {
  assert.deepEqual(narrowTargetScope(FULL_SCOPE, ['example-web']).components, [
    { mappingId: 'example-web', repositoryId: 'github:ExampleOrg/web', role: 'FRONTEND' }
  ]);
  assert.throws(() => narrowTargetScope(FULL_SCOPE, ['example-db']), /TARGET_SCOPE_COMPONENT_OUTSIDE_SESSION/);
  assert.throws(() => narrowTargetScope(FULL_SCOPE, []), /TARGET_SCOPE_COMPONENT_SET_INVALID/);
});

test('openSession builds the TargetScope server-side from Live State mapping ids, never from an agent scope', async () => {
  const service = sessionService();
  const opened = await service.openSession(
    openInput({ targetMappingIds: ['example-api'] }),
    { transportSessionId: 'b32-open-1', identity: IDENTITY }
  );
  assert.deepEqual(opened.session.targetScope, {
    ...FULL_SCOPE,
    components: [FULL_SCOPE.components[0]]
  });

  const historical = await service.openSession(
    openInput({ repository: 'Patricked-code/MCP' }),
    { transportSessionId: 'b32-open-2', identity: IDENTITY }
  );
  assert.equal(historical.session.targetScope, undefined);

  await assert.rejects(service.openSession(
    openInput({ repository: 'ExampleOrg/web', targetMappingIds: ['example-api'] }),
    { transportSessionId: 'b32-open-3', identity: IDENTITY }
  ), /TARGET_SCOPE_REPOSITORY_MISMATCH/);
  await assert.rejects(service.openSession(
    openInput({ targetMappingIds: ['example-db'] }),
    { transportSessionId: 'b32-open-4', identity: IDENTITY }
  ), /TARGET_SCOPE_COMPONENT_UNKNOWN/);
  await assert.rejects(service.openSession(
    openInput({ targetMappingIds: ['example-api'], targetScope: FULL_SCOPE }),
    { transportSessionId: 'b32-open-5', identity: IDENTITY }
  ), /TARGET_SCOPE_INPUT_AMBIGUOUS/);
  await assert.rejects(sessionService(null).openSession(
    openInput({ targetMappingIds: ['example-api'] }),
    { transportSessionId: 'b32-open-6', identity: IDENTITY }
  ), /TARGET_CONTEXT_UNAVAILABLE/);
});

test('resumeSession rebuilds the scope from the same mapping ids and refuses a different component set', async () => {
  const service = sessionService();
  const opened = await service.openSession(
    openInput({ targetMappingIds: ['example-api', 'example-web'] }),
    { transportSessionId: 'b32-resume-open', identity: IDENTITY }
  );
  await assert.rejects(service.resumeSession({
    governedSessionId: opened.session.governedSessionId,
    resumeSecret: opened.resumeSecret,
    repository: 'ExampleOrg/api',
    targetMappingIds: ['example-api'],
    taskScope: 'b32-scope',
    expectedSessionRevision: opened.session.sessionRevision
  } as any, { transportSessionId: 'b32-resume-a', identity: IDENTITY }), /SESSION_SCOPE_MISMATCH/);

  const resumed = await service.resumeSession({
    governedSessionId: opened.session.governedSessionId,
    resumeSecret: opened.resumeSecret,
    repository: 'ExampleOrg/api',
    targetMappingIds: ['example-web', 'example-api'],
    taskScope: 'b32-scope',
    expectedSessionRevision: opened.session.sessionRevision
  } as any, { transportSessionId: 'b32-resume-b', identity: IDENTITY });
  assert.equal(resumed.governedSessionId, opened.session.governedSessionId);
  assert.deepEqual(resumed.targetScope, FULL_SCOPE);
});

test('client tool attestations may name the MCP repository or a repository inside the session TargetScope only', async () => {
  assert.equal(ClientToolSurfaceCapabilitySchema.safeParse({
    name: 'github.repository.read', callability: 'CALLABLE', source: 'CLIENT_ATTESTATION',
    provider: 'github', repositoryScope: 'ExampleOrg/api'
  }).success, true);

  const service = sessionService();
  const opened = await service.openSession(
    openInput({ targetMappingIds: ['example-api'] }),
    { transportSessionId: 'b32-attest', identity: IDENTITY }
  );
  const request = { transportSessionId: 'b32-attest', identity: IDENTITY };
  const attested = await service.attestClientToolSurface({
    governedSessionId: opened.session.governedSessionId,
    expectedSessionRevision: opened.session.sessionRevision,
    surface: 'chatgpt_connector',
    capabilities: [
      { name: 'github.repository.read', callability: 'CALLABLE', provider: 'github', repositoryScope: 'ExampleOrg/api' },
      { name: 'mcp_get_governed_context', callability: 'CALLABLE', provider: 'wealthtech_mcp', repositoryScope: 'Patricked-code/MCP' }
    ]
  }, request);
  await assert.rejects(service.attestClientToolSurface({
    governedSessionId: opened.session.governedSessionId,
    expectedSessionRevision: attested.sessionRevision,
    surface: 'chatgpt_connector',
    capabilities: [
      { name: 'github.repository.read', callability: 'CALLABLE', provider: 'github', repositoryScope: 'ExampleOrg/web' }
    ]
  }, request), /CLIENT_TOOL_SURFACE_ATTESTATION_INVALID/);
});

test('session tools accept mapping ids, keep the historical MCP default and refuse other repositories without a scope', async () => {
  const opened: any[] = [];
  const resumed: any[] = [];
  const sessions = {
    openSession: async (input: any) => { opened.push(input); return { session: { governedSessionId: SESSION_ID } }; },
    resumeSession: async (input: any) => { resumed.push(input); return { session: { governedSessionId: SESSION_ID } }; }
  } as any;
  const { handlers, schemas } = captureTools((server) => registerGovernedSessionTools(server, { sessions, locks: {} as any }));
  const openSchema = z.object(schemas.get('mcp_open_governed_session')!);
  assert.equal(openSchema.safeParse({
    repository: 'ExampleOrg/api', targetMappingIds: ['example-api'], taskScope: 'x', agentIdentity: 'a'
  }).success, true);
  assert.equal(openSchema.safeParse({ repository: 'not a repository', taskScope: 'x', agentIdentity: 'a' }).success, false);

  const refused = textJson(await handlers.get('mcp_open_governed_session')!({
    repository: 'ExampleOrg/api', taskScope: 'x', workBranch: null, agentIdentity: 'a', blockers: [], nextAction: null
  }, EXTRA));
  assert.deepEqual(refused, { ok: false, error: { code: 'REPOSITORY_OUT_OF_SCOPE' } });
  assert.equal(opened.length, 0);

  textJson(await handlers.get('mcp_open_governed_session')!({
    repository: 'ExampleOrg/api', targetMappingIds: ['example-api'], taskScope: 'x', workBranch: null,
    agentIdentity: 'a', blockers: [], nextAction: null
  }, EXTRA));
  assert.deepEqual(opened[0].targetMappingIds, ['example-api']);
  assert.equal('targetScope' in opened[0], false);

  textJson(await handlers.get('mcp_open_governed_session')!({
    repository: 'Patricked-code/MCP', taskScope: 'x', workBranch: null, agentIdentity: 'a', blockers: [], nextAction: null
  }, EXTRA));
  assert.equal(opened[1].targetMappingIds, undefined);

  const resumeRefused = textJson(await handlers.get('mcp_resume_governed_session')!({
    governedSessionId: SESSION_ID, repository: 'ExampleOrg/api', taskScope: 'x', expectedSessionRevision: 1
  }, EXTRA));
  assert.deepEqual(resumeRefused, { ok: false, error: { code: 'REPOSITORY_OUT_OF_SCOPE' } });
  textJson(await handlers.get('mcp_resume_governed_session')!({
    governedSessionId: SESSION_ID, repository: 'ExampleOrg/api', targetMappingIds: ['example-api'],
    taskScope: 'x', expectedSessionRevision: 1
  }, EXTRA));
  assert.deepEqual(resumed[0].targetMappingIds, ['example-api']);
});

test('lock tool derives component and repository scopes from the session TargetScope, never from the agent', async () => {
  const acquired: any[] = [];
  let visible: any = { governedSessionId: SESSION_ID, repository: 'ExampleOrg/api', targetScope: FULL_SCOPE };
  const sessions = { getVisibleSession: async () => visible } as any;
  const locks = { acquireLock: async (input: any) => { acquired.push(input); return { lockId: 'x' }; } } as any;
  const { handlers, schemas } = captureTools((server) => registerGovernedSessionTools(server, { sessions, locks }));
  const lockSchema = z.object(schemas.get('mcp_acquire_governed_lock')!);
  assert.equal(lockSchema.safeParse({
    governedSessionId: SESSION_ID, expectedSessionRevision: 1, reason: 'r',
    scope: { type: 'component', mappingId: 'example-api' }
  }).success, true);

  const acquire = (scope: unknown) => handlers.get('mcp_acquire_governed_lock')!({
    governedSessionId: SESSION_ID, expectedSessionRevision: 1, reason: 'r', scope
  }, EXTRA).then(textJson);

  assert.equal((await acquire({ type: 'component', mappingId: 'example-api' })).ok, true);
  assert.deepEqual(acquired[0].scope, { type: 'component', targetId: 'EXAMPLE-001', mappingId: 'example-api' });
  assert.deepEqual(acquired[0].targetScope, FULL_SCOPE);

  assert.equal((await acquire({ type: 'repository', key: 'ExampleOrg/web' })).ok, true);
  assert.deepEqual(acquired[1].targetScope, FULL_SCOPE);
  assert.deepEqual(await acquire({ type: 'repository', key: 'Other/Repo' }), {
    ok: false, error: { code: 'LOCK_REPOSITORY_OUT_OF_TARGET_SCOPE' }
  });

  visible = { governedSessionId: SESSION_ID, repository: 'Patricked-code/MCP' };
  assert.deepEqual(await acquire({ type: 'component', mappingId: 'example-api' }), {
    ok: false, error: { code: 'LOCK_COMPONENT_SCOPE_UNBOUND' }
  });
  assert.deepEqual(await acquire({ type: 'repository', key: 'ExampleOrg/api' }), {
    ok: false, error: { code: 'REPOSITORY_OUT_OF_SCOPE' }
  });
  assert.equal((await acquire({ type: 'repository', key: 'Patricked-code/MCP' })).ok, true);
  assert.equal(acquired.at(-1).targetScope, undefined);
});

test('reconcile intent inherits or narrows the session TargetScope and never accepts an agent-built scope', async () => {
  const reconciled: any[] = [];
  let visible: any = {
    governedSessionId: SESSION_ID,
    repository: 'ExampleOrg/api',
    targetScope: FULL_SCOPE,
    status: 'ACTIVE',
    sessionRevision: 3,
    bootstrapReceipt: { bootstrapReceiptId: RECEIPT_ID, stateVersion: 7, expiresAt: '2026-10-04T18:00:00.000Z' }
  };
  const dependencies = {
    queue: { reconcileIntent: async (input: any) => { reconciled.push(input); return { classification: 'NEW_TASK' }; } },
    sessions: { getVisibleSession: async () => visible },
    liveState: { getCurrent: async () => ({ stateVersion: 7 }) },
    lifecycle: { run: async (work: () => Promise<unknown>) => work() },
    ready: async () => undefined,
    now: () => new Date(NOW)
  } as any;
  const { handlers, schemas } = captureTools((server) => registerGovernedTaskMutationTools(server, dependencies));
  const schema = z.object(schemas.get('mcp_reconcile_agent_intent')!);
  assert.equal(schema.safeParse({
    governedSessionId: SESSION_ID, expectedSessionRevision: 3, expectedBootstrapReceiptId: RECEIPT_ID,
    expectedStateVersion: 7, repository: 'ExampleOrg/web', targetMappingIds: ['example-web'],
    intentKey: 'b32:intent', title: 't', summary: 's'
  }).success, true);
  assert.equal('targetScope' in schemas.get('mcp_reconcile_agent_intent')!, false);

  const base = {
    governedSessionId: SESSION_ID, expectedSessionRevision: 3, expectedBootstrapReceiptId: RECEIPT_ID,
    expectedStateVersion: 7, intentKey: 'b32:intent', title: 't', summary: 's', priority: 50,
    dependencies: [], resourceScopes: []
  };
  const reconcile = (input: Record<string, unknown>) => handlers.get('mcp_reconcile_agent_intent')!(
    { ...base, ...input }, EXTRA
  ).then(textJson);

  assert.equal((await reconcile({ repository: 'ExampleOrg/api' })).ok, true);
  assert.deepEqual(reconciled[0].targetScope, FULL_SCOPE);
  assert.equal((await reconcile({ repository: 'ExampleOrg/web', targetMappingIds: ['example-web'] })).ok, true);
  assert.deepEqual(reconciled[1].targetScope.components, [FULL_SCOPE.components[1]]);
  assert.deepEqual(await reconcile({ repository: 'ExampleOrg/web', targetMappingIds: ['example-db'] }), {
    ok: false, error: { code: 'TARGET_SCOPE_COMPONENT_OUTSIDE_SESSION' }
  });

  visible = { ...visible, repository: 'Patricked-code/MCP', targetScope: undefined };
  assert.deepEqual(await reconcile({ repository: 'Patricked-code/MCP', targetMappingIds: ['example-api'] }), {
    ok: false, error: { code: 'TARGET_SCOPE_REQUIRES_SCOPED_SESSION' }
  });
  assert.equal((await reconcile({ repository: 'Patricked-code/MCP' })).ok, true);
  assert.equal(reconciled.at(-1).targetScope, undefined);
});

test('governed context never presents MCP GitHub state as the state of another session repository', async () => {
  let githubCalls = 0;
  const session = {
    schemaVersion: 1,
    governedSessionId: SESSION_ID,
    repository: 'ExampleOrg/api',
    targetScope: FULL_SCOPE,
    taskScope: 'b32-scope',
    workBranch: 'feature/x',
    agentIdentity: 'b32-agent',
    ownerPrincipalId: null,
    identityAssurance: 'declared_only',
    status: 'ACTIVE',
    createdAt: NOW,
    resumedAt: null,
    lastHeartbeatAt: NOW,
    pausedAt: null,
    expiredAt: null,
    closedAt: null,
    currentTransport: null,
    lastAcknowledgedStateVersion: null,
    sessionRevision: 1,
    lastCheckpoint: null,
    blockers: [],
    nextAction: null,
    lockIds: [],
    resumePolicy: 'resume_secret_required'
  } as any;
  const observer = async () => { githubCalls += 1; throw new Error('must not observe'); };
  const service = createGovernedOperationalContextService({
    liveState: { getCurrent: async () => null, reconcileNow: async () => null as any },
    github: { getCurrent: observer, collect: observer, reconcileExplicit: observer } as any,
    sessions: { getVisibleSession: async () => session },
    locks: { listActiveLocks: async () => [] },
    gateMode: 'shadow',
    existingWriteToolsEnabled: true,
    now: () => new Date(NOW)
  } as any);
  const context = await service.getCurrent({
    governedSessionId: SESSION_ID,
    workBranch: null,
    request: { transportSessionId: 'b32-context', identity: IDENTITY }
  } as any);
  assert.equal(githubCalls, 0);
  assert.equal(context.repository, 'ExampleOrg/api');
  assert.equal(context.github.status, 'UNAVAILABLE');
  assert.equal(context.github.error, 'github_target_repository_not_observed');
  assert.deepEqual(context.targetScope, FULL_SCOPE);
});

test('the B3.2 classification records a server-built TargetScope surface and resolved consumers', async () => {
  const { readFile } = await import('node:fs/promises');
  const classification = JSON.parse(
    await readFile('docs/governance/multi-repository-target-scope-20261004.json', 'utf8')
  );
  assert.equal(classification.blueprintId, 'TB-W3-B3-02');
  assert.equal(classification.decisionSource, 'issue:220');
  assert.equal(classification.historicalInventoryKeptImmutable, true);
  assert.equal(classification.toolSurface.targetScopeExposedByAnyTool, true);
  assert.equal(classification.toolSurface.agentSuppliedTargetScopeAccepted, false);
  assert.equal(classification.targetSelection.extensionPath, 'MULTI_PROJECT_LIVE_STATE');
  for (const resolved of classification.resolvedConsumers) {
    assert.equal((await readFile(resolved.path, 'utf8')).includes('Patricked-code/MCP'), false, resolved.path);
  }
  const historical = JSON.parse(
    await readFile('docs/governance/multi-repository-inventory-20261001.json', 'utf8')
  );
  assert.equal(historical.toolSurface.targetScopeExposedByAnyTool, false, 'B3.1 evidence stays immutable');
});
