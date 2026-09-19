import assert from 'node:assert/strict';
import test from 'node:test';

import {
  BootstrapReceiptSchema,
  GovernedSessionRecordSchema,
  GovernedTaskRecordSchema,
  createEmptyTaskStoreDocument
} from '../src/operationalMemory/types.js';
import { normalizeLockScope } from '../src/operationalMemory/lockService.js';
import { createGovernedTaskQueue } from '../src/operationalMemory/taskQueue.js';
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
