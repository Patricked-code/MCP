import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
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
import { selectProgramCandidates } from '../scripts/program-backlog-convergence-lib.mjs';

process.env.MCP_AUTH_TOKEN ??= 'mcp-unit-test-value-20261004-abcdef';
process.env.S1_HOST ??= '127.0.0.1';
process.env.S1_KEY_PATH ??= '/tmp/mcp-unit-test-s1-key';
process.env.S2_HOST ??= '127.0.0.1';
process.env.S2_KEY_PATH ??= '/tmp/mcp-unit-test-s2-key';
process.env.MCP_GOVERNED_SESSIONS_ENABLED ??= 'true';

const { registerGovernedTaskMutationTools } = await import('../src/tools/governedTasks.js');
const {
  blueprintIntentKey,
  loadProgramProjection
} = await import('../src/governance/programBlueprintMaterialization.js');

const SESSION_ID = '11111111-1111-4111-8111-111111111111';
const OTHER_SESSION_ID = '33333333-3333-4333-8333-333333333333';
const RECEIPT_ID = '22222222-2222-4222-8222-222222222222';
const NOW = new Date('2026-10-04T18:00:00.000Z');
const DIGEST = 'f'.repeat(64);
const EXTRA = {
  sessionId: 'transport-materialize',
  authInfo: { clientId: 'test-client', extra: { governedPrincipalId: 'oauth:test', identityAssurance: 'oauth_subject' } }
};

function blueprint(id: string, readiness: Record<string, unknown>, extra: Record<string, unknown> = {}) {
  return {
    id,
    workItemId: 'PB-TEST',
    waveId: 'W3',
    lotId: `${id}.LOT`,
    title: `Title of ${id}`,
    objective: `Objective of ${id}: bounded and planning-only.`,
    integrationSlot: 'test.slot',
    integrationStrategy: 'EXTEND',
    dependsOn: [],
    existingAuthorities: ['Governed Task Queue'],
    resourceScopes: [`test:${id.toLowerCase()}`],
    collisionDomains: [`test:${id.toLowerCase()}`],
    readAuthorities: [],
    writeAuthorities: [],
    redTests: [],
    greenAcceptance: [],
    regressionSuites: [],
    definitionOfDone: [],
    readiness,
    materialization: {
      mode: 'ON_DEMAND_AFTER_REOBSERVATION',
      createsRuntimeTask: false,
      runtimeAuthority: 'Governed Task Queue',
      requiresRuntimeAuthorityReobservation: true,
      requiresCollisionCheck: true
    },
    ...extra
  };
}

function projection() {
  return {
    executionModel: { waves: [{ id: 'W3' }], currentReadyBlueprintIds: ['TB-TEST-READY'] },
    taskBlueprints: [
      blueprint('TB-TEST-DONE', { state: 'DONE' }),
      blueprint('TB-TEST-READY', { state: 'READY' }),
      blueprint('TB-TEST-BLOCKED', { state: 'BLOCKED' }, { dependsOn: ['TB-TEST-READY'] }),
      blueprint('TB-TEST-COND', { state: 'CONDITIONAL', autoPromotable: false, requiredExplicitGates: ['EXPLICIT_HUMAN_GATE'] }),
      blueprint('TB-TEST-DEFERRED', { state: 'DEFERRED', autoPromotable: false, requiredExplicitGates: ['CONCRETE_MAINTENANCE_NEED'] }),
      blueprint('TB-TEST-NOSCOPE', { state: 'READY' }, { collisionDomains: [] })
    ]
  };
}

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

function seed(tasks: TaskRegistrySeed['tasks'] = []): TaskRegistrySeed {
  const unsigned: Omit<TaskRegistrySeed, 'registryDigest'> = {
    schemaVersion: 1,
    registryVersion: 1,
    generatedAt: '2026-10-04T00:00:00.000Z',
    tasks
  };
  return { ...unsigned, registryDigest: taskRegistryDigest(unsigned) };
}

async function harness(options: {
  seedTasks?: TaskRegistrySeed['tasks'];
  session?: Record<string, unknown>;
  loadProgram?: () => Promise<unknown>;
} = {}) {
  const directory = await mkdtemp(path.join(tmpdir(), 'mcp-materialize-'));
  const store = createAtomicJsonStore({
    filePath: path.join(directory, 'tasks.json'),
    schema: TaskStoreDocumentSchema,
    empty: createEmptyTaskStoreDocument
  });
  const queue = createGovernedTaskQueue(store, () => NOW, undefined, async () => [], async () => [SESSION_ID]);
  await queue.initializeSeed(seed(options.seedTasks ?? []));
  const session = {
    governedSessionId: SESSION_ID,
    repository: 'Patricked-code/MCP',
    sessionRevision: 3,
    status: 'ACTIVE',
    bootstrapReceipt: { bootstrapReceiptId: RECEIPT_ID, stateVersion: 9, expiresAt: '2099-01-01T00:00:00.000Z' },
    ...options.session
  };
  const handlers = new Map<string, (...args: any[]) => Promise<any>>();
  const server = {
    registerTool(name: string, _config: unknown, handler: (...args: any[]) => Promise<any>) {
      handlers.set(name, handler);
    }
  } as unknown as McpServer;
  registerGovernedTaskMutationTools(server, {
    queue,
    sessions: { async getVisibleSession() { return session; } },
    liveState: { async getCurrent() { return { stateVersion: 9 }; } },
    lifecycle: serialLifecycle(),
    ready: async () => undefined,
    now: () => NOW,
    loadProgram: options.loadProgram ?? (async () => ({ projection: projection(), digest: DIGEST }))
  } as never);
  const materialize = async (programBlueprintId: string) => {
    const result = await handlers.get('mcp_materialize_program_blueprint')!({
      governedSessionId: SESSION_ID,
      expectedSessionRevision: 3,
      expectedBootstrapReceiptId: RECEIPT_ID,
      expectedStateVersion: 9,
      programBlueprintId
    }, EXTRA);
    return JSON.parse(result.content[0].text);
  };
  return { directory, queue, store, materialize, handlers };
}

test('a READY blueprint materializes exactly one unclaimed task bound to its identity and projection', async () => {
  const { directory, queue, materialize } = await harness();
  try {
    const before = await queue.listVisibleTasks();
    const first = await materialize('TB-TEST-READY');
    assert.equal(first.ok, true);
    assert.equal(first.result.classification, 'NEW_TASK');
    assert.deepEqual(first.result.blueprint, {
      blueprintId: 'TB-TEST-READY',
      derivedState: 'READY',
      programProjectionDigest: DIGEST
    });
    const task = first.result.task;
    assert.equal(task.intentKey, 'program:tb-test-ready');
    assert.equal(task.repository, 'Patricked-code/MCP');
    assert.deepEqual(task.resourceScopes, ['test:tb-test-ready']);
    assert.equal(task.status, 'READY');
    assert.equal(task.ownerGovernedSessionId, null, 'materialization never implies a claim');
    assert.match(task.summary, /TB-TEST-READY/);
    assert.match(task.summary, new RegExp(DIGEST.slice(0, 12)));

    const retry = await materialize('TB-TEST-READY');
    assert.equal(retry.result.classification, 'CONTINUATION');
    assert.equal(retry.result.task.taskId, task.taskId);
    const after = await queue.listVisibleTasks();
    assert.equal(after.tasks.length, before.tasks.length + 1);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('concurrent materialization of the same blueprint yields one task', async () => {
  const { directory, queue, materialize } = await harness();
  try {
    const results = await Promise.all([
      materialize('TB-TEST-READY'),
      materialize('TB-TEST-READY'),
      materialize('TB-TEST-READY')
    ]);
    const taskIds = new Set(results.map((entry) => entry.result.task.taskId));
    assert.equal(taskIds.size, 1);
    assert.equal(results.filter((entry) => entry.result.classification === 'NEW_TASK').length, 1);
    assert.equal((await queue.listVisibleTasks()).tasks.length, 1);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('an active equivalent task created before the blueprint path is reused, never duplicated', async () => {
  const { directory, queue, materialize } = await harness({
    seedTasks: [{
      taskId: 'TASK-20261003-001', repository: 'Patricked-code/MCP', intentKey: 'legacy-free-intent',
      title: 'Legacy equivalent', summary: 'Materialized before the blueprint path.', priority: 50, sequence: 1,
      status: 'READY', dependencies: [], resourceScopes: ['test:tb-test-ready'], blockers: [],
      nextAction: 'claim_governed_task', requestDigest: 'a'.repeat(64)
    }]
  });
  try {
    const reused = await materialize('TB-TEST-READY');
    assert.equal(reused.result.classification, 'CONTINUATION');
    assert.equal(reused.result.reasonCode, 'equivalent_active_task');
    assert.equal(reused.result.task.taskId, 'TASK-20261003-001');
    assert.equal((await queue.listVisibleTasks()).tasks.length, 1);

    const claimed = await queue.claimNextTask(OTHER_SESSION_ID, (await queue.listVisibleTasks()).storeRevision);
    assert.equal(claimed?.taskId, 'TASK-20261003-001');
    const foreign = await materialize('TB-TEST-READY');
    assert.equal(foreign.result.classification, 'CONFLICT');
    assert.equal(foreign.result.task.taskId, 'TASK-20261003-001');
    assert.equal((await queue.listVisibleTasks()).tasks.length, 1);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('a terminal task for the same blueprint is a duplicate, not a new task', async () => {
  const { directory, queue, materialize } = await harness({
    seedTasks: [{
      taskId: 'TASK-20261003-002', repository: 'Patricked-code/MCP', intentKey: 'program:tb-test-ready',
      title: 'Done', summary: 'Already delivered.', priority: 50, sequence: 1,
      status: 'DONE', dependencies: [], resourceScopes: ['test:tb-test-ready'], blockers: [],
      nextAction: null, requestDigest: 'b'.repeat(64)
    }]
  });
  try {
    const duplicate = await materialize('TB-TEST-READY');
    assert.equal(duplicate.result.classification, 'DUPLICATE');
    assert.equal(duplicate.result.task.taskId, 'TASK-20261003-002');
    assert.equal((await queue.listVisibleTasks()).tasks.length, 1);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('blocked, guarded, done, unknown, scope-less or unavailable blueprints never materialize', async () => {
  const { directory, queue, materialize } = await harness();
  try {
    const revision = (await queue.listVisibleTasks()).storeRevision;
    for (const [id, code] of [
      ['TB-TEST-BLOCKED', 'PROGRAM_BLUEPRINT_NOT_READY'],
      ['TB-TEST-COND', 'PROGRAM_BLUEPRINT_NOT_READY'],
      ['TB-TEST-DEFERRED', 'PROGRAM_BLUEPRINT_NOT_READY'],
      ['TB-TEST-DONE', 'PROGRAM_BLUEPRINT_NOT_READY'],
      ['TB-TEST-MISSING', 'PROGRAM_BLUEPRINT_UNKNOWN'],
      ['TB-TEST-NOSCOPE', 'PROGRAM_BLUEPRINT_COLLISION_DOMAINS_MISSING']
    ] as const) {
      const refused = await materialize(id);
      assert.deepEqual(refused, { ok: false, error: { code } }, id);
    }
    assert.equal((await queue.listVisibleTasks()).storeRevision, revision);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }

  const unavailable = await harness({ loadProgram: async () => { throw new Error('ENOENT'); } });
  try {
    assert.deepEqual(await unavailable.materialize('TB-TEST-READY'), {
      ok: false, error: { code: 'PROGRAM_PROJECTION_UNAVAILABLE' }
    });
  } finally {
    await rm(unavailable.directory, { recursive: true, force: true });
  }
});

test('only an unscoped, bootstrapped MCP session may materialize program work', async () => {
  const scoped = await harness({
    session: {
      repository: 'ExampleOrg/api',
      targetScope: {
        schemaVersion: 1, targetId: 'EXAMPLE-001', projectId: 'example.platform', projectUid: 'EXAMPLE-001',
        components: [{ mappingId: 'example-api', repositoryId: 'github:ExampleOrg/api', role: 'API' }]
      }
    }
  });
  try {
    assert.deepEqual(await scoped.materialize('TB-TEST-READY'), {
      ok: false, error: { code: 'PROGRAM_BLUEPRINT_REQUIRES_MCP_SESSION' }
    });
  } finally {
    await rm(scoped.directory, { recursive: true, force: true });
  }

  const stale = await harness({ session: { sessionRevision: 4 } });
  try {
    assert.deepEqual(await stale.materialize('TB-TEST-READY'), {
      ok: false, error: { code: 'SESSION_REVISION_MISMATCH' }
    });
    assert.equal((await stale.queue.listVisibleTasks()).tasks.length, 0);
  } finally {
    await rm(stale.directory, { recursive: true, force: true });
  }
});

test('the default loader reads the versioned projection shipped in the image and stays planning-only', async () => {
  const raw = await readFile('docs/governance/program-backlog-convergence.json');
  const loaded: any = await loadProgramProjection();
  assert.equal(loaded.digest, createHash('sha256').update(raw).digest('hex'));
  assert.equal(loaded.projection.authority?.createsRuntimeTasks, false);
  assert.equal(blueprintIntentKey('TB-W3-DISPATCH-01'), 'program:tb-w3-dispatch-01');

  const dockerfile = await readFile('Dockerfile', 'utf8');
  assert.match(dockerfile, /COPY docs\/governance\/program-backlog-convergence\.json \.\/docs\/governance\/program-backlog-convergence\.json/);
  assert.match(dockerfile, /COPY scripts\/program-backlog-convergence-lib\.mjs \.\/scripts\/program-backlog-convergence-lib\.mjs/);

  const candidates = selectProgramCandidates(loaded.projection).candidates;
  if (candidates.length === 0) return;
  const { directory, queue, materialize } = await harness({
    loadProgram: async () => loaded
  });
  try {
    const created = await materialize(candidates[0].id);
    assert.ok(['NEW_TASK', 'CONTINUATION'].includes(created.result.classification));
    assert.equal(created.result.blueprint.programProjectionDigest, loaded.digest);
    assert.equal((await queue.listVisibleTasks()).tasks.length, 1);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
