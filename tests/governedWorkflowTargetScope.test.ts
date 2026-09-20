import assert from 'node:assert/strict';
import test from 'node:test';

import {
  BootstrapReceiptSchema,
  GovernedSessionRecordSchema,
  GovernedTaskRecordSchema,
  LockStoreDocumentSchema,
  SessionStoreDocumentSchema,
  createEmptyLockStoreDocument,
  createEmptySessionStoreDocument,
  createEmptyTaskStoreDocument
} from '../src/operationalMemory/types.js';
import { createGovernedLockService, normalizeLockScope } from '../src/operationalMemory/lockService.js';
import { createGovernedSessionService } from '../src/operationalMemory/sessionService.js';
import { createGovernedTaskQueue } from '../src/operationalMemory/taskQueue.js';
import { createTransportBindings } from '../src/operationalMemory/transportBindings.js';
import { reconcileLiveState } from '../src/liveState/reconcile.js';

const SHA_A = 'a'.repeat(40);
const SHA_B = 'b'.repeat(40);
const SHA_C = 'c'.repeat(40);
const SHA_D = 'd'.repeat(40);

function explicitScope() {
  return {
    schemaVersion: 1,
    targetId: 'EXAMPLE-001',
    projectId: 'example.platform',
    projectUid: 'EXAMPLE-001',
    components: [
      {
        mappingId: 'example-api',
        repositoryId: 'github:ExampleOrg/api',
        role: 'API'
      },
      {
        mappingId: 'example-web',
        repositoryId: 'github:ExampleOrg/web',
        role: 'FRONTEND'
      }
    ]
  };
}

function legacySession() {
  return {
    schemaVersion: 1,
    governedSessionId: '11111111-1111-4111-8111-111111111111',
    repository: 'Patricked-code/MCP',
    taskScope: 'legacy-task',
    workBranch: null,
    agentIdentity: 'ChatGPT',
    ownerPrincipalId: null,
    identityAssurance: 'declared_only',
    resumeSecretHash: 'a'.repeat(64),
    status: 'ACTIVE',
    createdAt: '2026-09-19T07:40:00.000Z',
    resumedAt: null,
    lastHeartbeatAt: '2026-09-19T07:40:00.000Z',
    pausedAt: null,
    expiredAt: null,
    closedAt: null,
    currentTransport: null,
    lastAcknowledgedStateVersion: null,
    bootstrapReceipt: null,
    connectionContext: null,
    clientToolSurfaceAttestation: null,
    sessionRevision: 1,
    lastCheckpoint: null,
    blockers: [],
    nextAction: null,
    lockIds: [],
    resumePolicy: 'stable_principal_or_resume_secret'
  };
}

function legacyTask() {
  return {
    schemaVersion: 1,
    taskId: 'TASK-20260919-999',
    repository: 'Patricked-code/MCP',
    intentKey: 'legacy-target-scope-test',
    title: 'Legacy target scope test',
    summary: 'Historical record must stay readable.',
    priority: 50,
    sequence: 1,
    status: 'READY',
    dependencies: [],
    resourceScopes: ['path:src/example'],
    ownerGovernedSessionId: null,
    workBranch: null,
    pullRequestNumber: null,
    observedHeadSha: null,
    runtimeRevision: null,
    blockers: [],
    nextAction: 'claim_governed_task',
    source: { kind: 'agent', requestDigest: 'e'.repeat(64) },
    createdAt: '2026-09-19T07:40:00.000Z',
    updatedAt: '2026-09-19T07:40:00.000Z',
    taskRevision: 1
  };
}

function legacyReceipt() {
  return {
    schemaVersion: 1,
    bootstrapReceiptId: '22222222-2222-4222-8222-222222222222',
    governedSessionId: '11111111-1111-4111-8111-111111111111',
    agentIdentity: 'ChatGPT',
    repository: 'Patricked-code/MCP',
    governedBranch: null,
    stateVersion: 9,
    githubHead: SHA_A,
    runtimeRevision: SHA_A,
    catalogueDigest: null,
    governanceDigest: null,
    taskRegistryDigest: null,
    createdAt: '2026-09-19T07:40:00.000Z',
    expiresAt: '2026-09-19T08:40:00.000Z',
    status: 'ACKNOWLEDGED',
    limitations: []
  };
}

function liveObservations(targetContext?: unknown) {
  return {
    repository: 'Patricked-code/MCP',
    github: { status: 'CURRENT', branch: 'main', head: SHA_A },
    s1: {
      status: 'CURRENT',
      path: '/opt/apps/wealthtech-mcp-ssh-bridge',
      branch: 'main',
      head: SHA_A,
      originMain: SHA_A,
      workingTreeClean: true,
      diffEmpty: true,
      fetchRemote: 'origin',
      pushRemote: null
    },
    runtime: {
      status: 'CURRENT',
      container: 'wealthtech_mcp_ssh_bridge',
      containerStatus: 'running',
      health: 'healthy',
      imageId: 'sha256:test',
      revision: SHA_A
    },
    documentation: {
      status: 'CURRENT',
      activeTask: null,
      declaredGithubSha: SHA_A,
      declaredS1Sha: SHA_A,
      drift: false
    },
    ...(targetContext ? { targetContext } : {})
  } as any;
}

function memoryTaskStore() {
  let value = createEmptyTaskStoreDocument();
  return {
    async read() { return value; },
    async update(mutator: any) {
      value = await mutator(value);
      return value;
    }
  } as any;
}

test('GWC-10 RED: TargetContext preserves independent component SHAs and does not synthesize PROJECT_SHA', async () => {
  const { deriveTargetContext } = await import('../src/operationalMemory/targetScope.js');
  const context = deriveTargetContext({
    project: {
      projectId: 'example.platform',
      projectUid: 'EXAMPLE-001',
      globalCheckpointRepositoryId: 'github:ExampleOrg/web',
      centralGovernanceRepositoryId: 'github:ExampleOrg/web',
      repositoryComponents: [
        { repositoryId: 'github:ExampleOrg/web', mappingId: 'example-web', role: 'FRONTEND' },
        { repositoryId: 'github:ExampleOrg/api', mappingId: 'example-api', role: 'API' }
      ]
    },
    observations: [
      {
        mappingId: 'example-web',
        repositoryId: 'github:ExampleOrg/web',
        githubHead: SHA_A,
        runtimeRevision: SHA_B,
        freshness: 'CURRENT'
      },
      {
        mappingId: 'example-api',
        repositoryId: 'github:ExampleOrg/api',
        githubHead: SHA_C,
        runtimeRevision: SHA_D,
        freshness: 'CURRENT'
      }
    ],
    observedAt: '2026-09-19T07:40:00.000Z'
  });

  assert.equal(context.status, 'RESOLVED');
  assert.equal(context.targetId, 'EXAMPLE-001');
  assert.deepEqual(
    context.components.map((entry: any) => ({
      mappingId: entry.mappingId,
      role: entry.role,
      githubHead: entry.githubHead,
      runtimeRevision: entry.runtimeRevision
    })),
    [
      { mappingId: 'example-api', role: 'API', githubHead: SHA_C, runtimeRevision: SHA_D },
      { mappingId: 'example-web', role: 'FRONTEND', githubHead: SHA_A, runtimeRevision: SHA_B }
    ]
  );
  assert.equal('projectSha' in context, false);
  assert.equal(JSON.stringify(context).includes('PROJECT_SHA'), false);
});

test('GWC-10 unresolved component stays local and does not poison resolved sibling', async () => {
  const { deriveTargetContext } = await import('../src/operationalMemory/targetScope.js');
  const context = deriveTargetContext({
    project: {
      projectId: 'example.platform',
      projectUid: 'EXAMPLE-001',
      globalCheckpointRepositoryId: 'github:ExampleOrg/web',
      centralGovernanceRepositoryId: 'github:ExampleOrg/web',
      repositoryComponents: [
        { repositoryId: 'github:ExampleOrg/web', mappingId: 'example-web', role: 'FRONTEND' },
        { repositoryId: 'github:ExampleOrg/api', mappingId: 'example-api', role: 'API' }
      ]
    },
    observations: [
      {
        mappingId: 'example-web',
        repositoryId: 'github:ExampleOrg/web',
        githubHead: SHA_A,
        runtimeRevision: SHA_B,
        freshness: 'CURRENT'
      }
    ],
    observedAt: '2026-09-19T07:40:00.000Z'
  });

  assert.equal(context.status, 'PARTIAL');
  assert.deepEqual(
    context.components.map((entry: any) => [entry.mappingId, entry.freshness]),
    [['example-api', 'UNVERIFIED'], ['example-web', 'CURRENT']]
  );
});

test('GWC-10 TargetScope names an exact component subset and carries no SHA authority', async () => {
  const { TargetContextSchema, createTargetScope } = await import('../src/operationalMemory/targetScope.js');
  const context = TargetContextSchema.parse({
    schemaVersion: 1,
    status: 'RESOLVED',
    targetId: 'EXAMPLE-001',
    projectId: 'example.platform',
    projectUid: 'EXAMPLE-001',
    globalCheckpointRepositoryId: 'github:ExampleOrg/web',
    centralGovernanceRepositoryId: 'github:ExampleOrg/web',
    observedAt: '2026-09-19T07:40:00.000Z',
    components: [
      {
        mappingId: 'example-api',
        repositoryId: 'github:ExampleOrg/api',
        role: 'API',
        githubHead: SHA_C,
        runtimeRevision: SHA_D,
        freshness: 'CURRENT',
        reasonCodes: []
      },
      {
        mappingId: 'example-web',
        repositoryId: 'github:ExampleOrg/web',
        role: 'FRONTEND',
        githubHead: SHA_A,
        runtimeRevision: SHA_B,
        freshness: 'CURRENT',
        reasonCodes: []
      }
    ]
  });
  const scope = createTargetScope(context, ['example-api']);

  assert.deepEqual(scope.components, [{
    mappingId: 'example-api',
    repositoryId: 'github:ExampleOrg/api',
    role: 'API'
  }]);
  assert.equal(JSON.stringify(scope).includes(SHA_C), false);
  assert.equal(JSON.stringify(scope).includes(SHA_D), false);
});

test('GWC-10 historical Session/Task/Receipt records remain byte-semantic compatible without TargetScope', () => {
  const session = GovernedSessionRecordSchema.parse(legacySession());
  const task = GovernedTaskRecordSchema.parse(legacyTask());
  const receipt = BootstrapReceiptSchema.parse(legacyReceipt());

  assert.equal(Object.prototype.hasOwnProperty.call(session, 'targetScope'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(task, 'targetScope'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(receipt, 'targetScope'), false);
});

test('GWC-10 schemas accept additive explicit TargetScope without changing schemaVersion 1', () => {
  const targetScope = explicitScope();
  const session = GovernedSessionRecordSchema.parse({ ...legacySession(), targetScope });
  const task = GovernedTaskRecordSchema.parse({ ...legacyTask(), targetScope });
  const receipt = BootstrapReceiptSchema.parse({ ...legacyReceipt(), targetScope });

  assert.equal(session.schemaVersion, 1);
  assert.equal(task.schemaVersion, 1);
  assert.equal(receipt.schemaVersion, 1);
  assert.deepEqual(session.targetScope, targetScope);
  assert.deepEqual(task.targetScope, targetScope);
  assert.deepEqual(receipt.targetScope, targetScope);
});

test('GWC-10 missing TargetScope means legacy single repository, never all project components', async () => {
  const { describeRecordTargetScope } = await import('../src/operationalMemory/targetScope.js');
  assert.deepEqual(
    describeRecordTargetScope(undefined, 'Patricked-code/MCP'),
    { mode: 'LEGACY_SINGLE_REPOSITORY', repository: 'Patricked-code/MCP' }
  );
  const explicit = describeRecordTargetScope(explicitScope(), 'Patricked-code/MCP');
  assert.equal(explicit.mode, 'EXPLICIT');
  assert.equal(explicit.scope.components.length, 2);
});

test('GWC-10 component lock scopes are independent and never widen to project scope', () => {
  const api = normalizeLockScope({
    type: 'component',
    targetId: 'EXAMPLE-001',
    mappingId: 'example-api'
  } as any);
  const web = normalizeLockScope({
    type: 'component',
    targetId: 'EXAMPLE-001',
    mappingId: 'example-web'
  } as any);

  assert.equal(api, 'component:EXAMPLE-001:example-api');
  assert.equal(web, 'component:EXAMPLE-001:example-web');
  assert.notEqual(api, web);
  assert.equal(api.startsWith('repository:'), false);
});

test('GWC-10 reconcileIntent accepts a non-legacy component only when explicitly bound by TargetScope', async () => {
  const queue = createGovernedTaskQueue(memoryTaskStore(), () => new Date('2026-09-19T07:40:00.000Z'));
  const result = await queue.reconcileIntent({
    repository: 'ExampleOrg/api',
    targetScope: explicitScope(),
    intentKey: 'example-api-change',
    title: 'Change API component',
    summary: 'Bounded multi-repository component change.',
    priority: 50,
    dependencies: [],
    resourceScopes: ['component:EXAMPLE-001:example-api']
  } as any, '11111111-1111-4111-8111-111111111111');

  assert.equal(result.classification, 'NEW_TASK');
  assert.equal(result.task?.repository, 'ExampleOrg/api');
  assert.deepEqual(result.task?.targetScope, explicitScope());
});

test('GWC-10 reconcileIntent preserves historical OUT_OF_SCOPE without an explicit TargetScope', async () => {
  const queue = createGovernedTaskQueue(memoryTaskStore(), () => new Date('2026-09-19T07:40:00.000Z'));
  const result = await queue.reconcileIntent({
    repository: 'ExampleOrg/api',
    intentKey: 'example-api-change',
    title: 'Change API component',
    summary: 'No explicit governed target scope.',
    priority: 50,
    dependencies: [],
    resourceScopes: ['component:EXAMPLE-001:example-api']
  }, '11111111-1111-4111-8111-111111111111');

  assert.equal(result.classification, 'OUT_OF_SCOPE');
});

test('GWC-10 Live State treats TargetContext changes as semantic state changes', () => {
  const firstContext = {
    schemaVersion: 1,
    status: 'RESOLVED',
    targetId: 'EXAMPLE-001',
    projectId: 'example.platform',
    projectUid: 'EXAMPLE-001',
    globalCheckpointRepositoryId: 'github:ExampleOrg/web',
    centralGovernanceRepositoryId: 'github:ExampleOrg/web',
    observedAt: '2026-09-19T07:40:00.000Z',
    components: [{
      mappingId: 'example-api',
      repositoryId: 'github:ExampleOrg/api',
      role: 'API',
      githubHead: SHA_C,
      runtimeRevision: SHA_D,
      freshness: 'CURRENT',
      reasonCodes: []
    }]
  };
  const first = reconcileLiveState(
    liveObservations(firstContext),
    null,
    new Date('2026-09-19T07:40:00.000Z')
  );
  const second = reconcileLiveState(
    liveObservations({
      ...firstContext,
      components: [{ ...firstContext.components[0], githubHead: SHA_A }]
    }),
    first,
    new Date('2026-09-19T07:40:01.000Z')
  );

  assert.equal(first.stateVersion, 1);
  assert.equal(second.stateVersion, 2);
  assert.equal((second as any).targetContext.components[0].githubHead, SHA_A);
});


function explicitSingleComponentScope(mappingId: 'example-api' | 'example-web') {
  const component = mappingId === 'example-api'
    ? { mappingId, repositoryId: 'github:ExampleOrg/api', role: 'API' }
    : { mappingId, repositoryId: 'github:ExampleOrg/web', role: 'FRONTEND' };
  return {
    schemaVersion: 1,
    targetId: 'EXAMPLE-001',
    projectId: 'example.platform',
    projectUid: 'EXAMPLE-001',
    components: [component]
  };
}

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

function fullTargetContext(observedAt = '2026-09-19T07:40:00.000Z') {
  return {
    schemaVersion: 1,
    status: 'RESOLVED',
    targetId: 'EXAMPLE-001',
    projectId: 'example.platform',
    projectUid: 'EXAMPLE-001',
    globalCheckpointRepositoryId: 'github:ExampleOrg/web',
    centralGovernanceRepositoryId: 'github:ExampleOrg/web',
    observedAt,
    components: [
      {
        mappingId: 'example-api',
        repositoryId: 'github:ExampleOrg/api',
        role: 'API',
        githubHead: SHA_C,
        runtimeRevision: SHA_D,
        freshness: 'CURRENT',
        reasonCodes: []
      },
      {
        mappingId: 'example-web',
        repositoryId: 'github:ExampleOrg/web',
        role: 'FRONTEND',
        githubHead: SHA_A,
        runtimeRevision: SHA_B,
        freshness: 'CURRENT',
        reasonCodes: []
      }
    ]
  } as const;
}

test('GWC-10 self-review: TargetScope equality is component-order independent', async () => {
  const { targetScopeEquals } = await import('../src/operationalMemory/targetScope.js');
  const forward = explicitScope();
  const reversed = { ...forward, components: [...forward.components].reverse() };

  assert.equal(targetScopeEquals(forward, reversed), true);
});

test('GWC-10 self-review: identical intent on disjoint component scopes stays independently representable', async () => {
  const store = memoryTaskStore();
  const queue = createGovernedTaskQueue(store, () => new Date('2026-09-19T07:40:00.000Z'));
  const common = {
    intentKey: 'example-shared-intent',
    title: 'Shared logical change',
    summary: 'Same intent key on different components must not collapse ownership.',
    priority: 50,
    dependencies: []
  };

  const api = await queue.reconcileIntent({
    repository: 'ExampleOrg/api',
    targetScope: explicitSingleComponentScope('example-api'),
    ...common,
    resourceScopes: ['component:EXAMPLE-001:example-api']
  } as any, '11111111-1111-4111-8111-111111111111');
  const web = await queue.reconcileIntent({
    repository: 'ExampleOrg/web',
    targetScope: explicitSingleComponentScope('example-web'),
    ...common,
    resourceScopes: ['component:EXAMPLE-001:example-web']
  } as any, '22222222-2222-4222-8222-222222222222');

  assert.equal(api.classification, 'NEW_TASK');
  assert.equal(web.classification, 'NEW_TASK');
  assert.notEqual(api.task?.taskId, web.task?.taskId);
  assert.deepEqual(api.task?.targetScope, explicitSingleComponentScope('example-api'));
  assert.deepEqual(web.task?.targetScope, explicitSingleComponentScope('example-web'));
});

test('GWC-10 self-review: component locks on disjoint scopes coexist across sessions', async () => {
  const sessionStore = memoryJsonStore(createEmptySessionStoreDocument());
  const lockStore = memoryJsonStore(createEmptyLockStoreDocument());
  const bindings = createTransportBindings();
  const sessions = createGovernedSessionService({
    store: sessionStore,
    bindings,
    idleTtlSeconds: 3600,
    resumeGraceSeconds: 3600,
    now: () => new Date('2026-09-19T07:40:00.000Z')
  });
  const locks = createGovernedLockService({
    store: lockStore,
    sessionStore,
    bindings,
    defaultTtlSeconds: 300,
    maxTtlSeconds: 1800,
    now: () => new Date('2026-09-19T07:40:00.000Z')
  });
  const identity = {
    principalId: null,
    clientId: 'gwc10-self-review',
    assurance: 'declared_only' as const
  };

  const api = await sessions.openSession({
    repository: 'ExampleOrg/api',
    targetScope: explicitSingleComponentScope('example-api'),
    taskScope: 'api-scope',
    workBranch: 'gwc10/api',
    agentIdentity: 'gwc10-api',
    blockers: [],
    nextAction: null
  }, { transportSessionId: 'gwc10-api-transport', identity });
  const web = await sessions.openSession({
    repository: 'ExampleOrg/web',
    targetScope: explicitSingleComponentScope('example-web'),
    taskScope: 'web-scope',
    workBranch: 'gwc10/web',
    agentIdentity: 'gwc10-web',
    blockers: [],
    nextAction: null
  }, { transportSessionId: 'gwc10-web-transport', identity });

  const apiLock = await locks.acquireLock({
    governedSessionId: api.session.governedSessionId,
    expectedSessionRevision: api.session.sessionRevision,
    targetScope: explicitSingleComponentScope('example-api'),
    scope: { type: 'component', targetId: 'EXAMPLE-001', mappingId: 'example-api' },
    reason: 'api change'
  }, { transportSessionId: 'gwc10-api-transport', identity });
  const webLock = await locks.acquireLock({
    governedSessionId: web.session.governedSessionId,
    expectedSessionRevision: web.session.sessionRevision,
    targetScope: explicitSingleComponentScope('example-web'),
    scope: { type: 'component', targetId: 'EXAMPLE-001', mappingId: 'example-web' },
    reason: 'web change'
  }, { transportSessionId: 'gwc10-web-transport', identity });

  assert.equal(apiLock.scope, 'component:EXAMPLE-001:example-api');
  assert.equal(webLock.scope, 'component:EXAMPLE-001:example-web');
  assert.equal((await locks.listActiveLocks()).length, 2);
});

test('GWC-10 self-review: multi-component receipt keeps per-component SHAs and leaves legacy SHA fields null', async () => {
  const sessionStore = memoryJsonStore(createEmptySessionStoreDocument());
  const bindings = createTransportBindings();
  const sessions = createGovernedSessionService({
    store: sessionStore,
    bindings,
    idleTtlSeconds: 3600,
    resumeGraceSeconds: 3600,
    now: () => new Date('2026-09-19T07:40:00.000Z'),
    getLiveState: async () => ({
      stateVersion: 7,
      targetContext: fullTargetContext(),
      github: { head: SHA_A },
      runtime: { revision: SHA_B }
    })
  });
  const identity = {
    principalId: null,
    clientId: 'gwc10-receipt',
    assurance: 'declared_only' as const
  };
  const opened = await sessions.openSession({
    repository: 'ExampleOrg/api',
    targetScope: explicitScope(),
    taskScope: 'multi-component',
    workBranch: 'gwc10/multi',
    agentIdentity: 'gwc10',
    blockers: [],
    nextAction: null
  }, { transportSessionId: 'gwc10-receipt-transport', identity });

  const acknowledged = await sessions.acknowledgeContext({
    governedSessionId: opened.session.governedSessionId,
    expectedSessionRevision: opened.session.sessionRevision,
    expectedStateVersion: 7
  }, { transportSessionId: 'gwc10-receipt-transport', identity });

  assert.equal(acknowledged.bootstrapReceipt?.githubHead, null);
  assert.equal(acknowledged.bootstrapReceipt?.runtimeRevision, null);
  assert.deepEqual(
    acknowledged.bootstrapReceipt?.targetContext?.components.map((component: any) => [
      component.mappingId,
      component.githubHead,
      component.runtimeRevision
    ]),
    [
      ['example-api', SHA_C, SHA_D],
      ['example-web', SHA_A, SHA_B]
    ]
  );
  assert.equal(JSON.stringify(acknowledged.bootstrapReceipt).includes('projectSha'), false);
});

test('GWC-10 self-review: TargetContext observedAt alone does not advance Live State version', () => {
  const first = reconcileLiveState(
    liveObservations(fullTargetContext('2026-09-19T07:40:00.000Z')),
    null,
    new Date('2026-09-19T07:40:00.000Z')
  );
  const second = reconcileLiveState(
    liveObservations(fullTargetContext('2026-09-19T07:41:00.000Z')),
    first,
    new Date('2026-09-19T07:41:00.000Z')
  );

  assert.equal(first.stateVersion, 1);
  assert.equal(second.stateVersion, 1);
});
