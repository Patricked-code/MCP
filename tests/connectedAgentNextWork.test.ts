import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

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
import { buildProgramBlueprintIntent } from '../src/governance/programBlueprintMaterialization.js';
import * as readinessLibrary from '../scripts/program-backlog-convergence-lib.mjs';

process.env.MCP_AUTH_TOKEN ??= 'mcp-unit-test-value-20261004-abcdef';
process.env.S1_HOST ??= '127.0.0.1';
process.env.S1_KEY_PATH ??= '/tmp/mcp-unit-test-s1-key';
process.env.S2_HOST ??= '127.0.0.1';
process.env.S2_KEY_PATH ??= '/tmp/mcp-unit-test-s2-key';

const { deriveNextWork } = await import('../src/governance/nextWorkProjection.js');
const { createCurrentStateService } = await import('../src/currentState/service.js');
const { createGovernedOperationalContextService } = await import('../src/governedContext/service.js');

const SESSION = '11111111-1111-4111-8111-111111111111';
const OTHER = '22222222-2222-4222-8222-222222222222';
const THIRD = '33333333-3333-4333-8333-333333333333';
const NOW = '2026-10-04T19:00:00.000Z';
const DIGEST = 'e'.repeat(64);
const MODULE_PATH = path.join(process.cwd(), 'src', 'governance', 'nextWorkProjection.ts');

function task(sequence: number, extra: Record<string, unknown> = {}): any {
  return {
    schemaVersion: 1,
    taskId: `TASK-20261004-${String(sequence).padStart(3, '0')}`,
    repository: 'Patricked-code/MCP',
    intentKey: `task-${sequence}`,
    title: `Task ${sequence}`,
    summary: `Task ${sequence}.`,
    priority: 50,
    sequence,
    status: 'READY',
    dependencies: [],
    resourceScopes: [`resource:task-${sequence}`],
    ownerGovernedSessionId: null,
    workBranch: null,
    pullRequestNumber: null,
    observedHeadSha: null,
    runtimeRevision: null,
    blockers: [],
    nextAction: 'claim_governed_task',
    source: { kind: 'agent', requestDigest: 'a'.repeat(64) },
    createdAt: NOW,
    updatedAt: NOW,
    taskRevision: 1,
    ...extra
  };
}

function seedTask(sequence: number, extra: Record<string, unknown> = {}) {
  const {
    schemaVersion: _v, ownerGovernedSessionId: _o, workBranch: _w, pullRequestNumber: _p, observedHeadSha: _h,
    runtimeRevision: _r, source: _s, createdAt: _c, updatedAt: _u, taskRevision: _t, ...rest
  } = task(sequence, extra);
  return { ...rest, requestDigest: String(sequence % 10).repeat(64) };
}

function blueprint(id: string, extra: Record<string, unknown> = {}) {
  return {
    id,
    waveId: 'W3',
    lotId: `${id}.LOT`,
    title: `Title ${id}`,
    objective: `Objective ${id}.`,
    dependsOn: [],
    collisionDomains: [`domain:${id.toLowerCase()}`],
    githubOnlyPossible: false,
    readiness: { state: 'READY' },
    materialization: { createsRuntimeTask: false, runtimeAuthority: 'Governed Task Queue' },
    ...extra
  };
}

function program(blueprints = [blueprint('TB-T-ONE'), blueprint('TB-T-TWO')]) {
  return {
    projection: { executionModel: { waves: [{ id: 'W3' }] }, taskBlueprints: blueprints },
    digest: DIGEST,
    library: readinessLibrary
  };
}

function next(input: Record<string, unknown> = {}) {
  return deriveNextWork({
    sessionId: SESSION,
    sessionTargetScope: null,
    tasks: [],
    activeLocks: [],
    program: program(),
    ...input
  } as never);
}

async function seededQueue(tasks: Array<Record<string, unknown>>, locks: () => Array<{ scope: string; governedSessionId: string }>) {
  const directory = await mkdtemp(path.join(tmpdir(), 'mcp-next-work-'));
  const store = createAtomicJsonStore({
    filePath: path.join(directory, 'tasks.json'),
    schema: TaskStoreDocumentSchema,
    empty: createEmptyTaskStoreDocument
  });
  const queue = createGovernedTaskQueue(store, () => new Date(NOW), undefined, async () => locks(), async () => [SESSION, OTHER, THIRD]);
  const unsigned: Omit<TaskRegistrySeed, 'registryDigest'> = {
    schemaVersion: 1, registryVersion: 1, generatedAt: NOW, tasks: tasks as never
  };
  await queue.initializeSeed({ ...unsigned, registryDigest: taskRegistryDigest(unsigned) });
  return { directory, queue };
}

function sessionRecord(governedSessionId: string, extra: Record<string, unknown> = {}) {
  return {
    governedSessionId, repository: 'Patricked-code/MCP', status: 'ACTIVE', agentIdentity: 'agent',
    lastHeartbeatAt: NOW, sessionRevision: 1, blockers: [], lockIds: [], lastCheckpoint: null, nextAction: null,
    ...extra
  };
}

function inventoryService(options: {
  tasks: () => Promise<unknown>;
  sessionId?: string | null;
  sessions?: unknown[];
  locks?: unknown[];
  program?: () => Promise<unknown>;
}) {
  return createCurrentStateService({
    liveState: { getCurrent: async () => null },
    tasks: { listVisibleTasks: options.tasks },
    sessions: {
      listVisibleSessions: async () => options.sessions ?? [sessionRecord(SESSION)],
      lookupGovernedSessionId: () => (options.sessionId === undefined ? SESSION : options.sessionId)
    },
    locks: { listActiveLocks: async () => options.locks ?? [] },
    ...(options.program ? { program: options.program } : {}),
    now: () => new Date(NOW)
  } as never);
}

const REQUEST = {
  transportSessionId: 'transport-next-work',
  identity: { principalId: null, clientId: null, assurance: 'shared_credential' }
} as never;

test('next work is a read-only projection: resume owned work first, then claim, then materialize', () => {
  const tasks = Object.freeze([
    Object.freeze(task(1, { status: 'IN_PROGRESS', ownerGovernedSessionId: SESSION })),
    Object.freeze(task(2))
  ]);
  const owned = next({ tasks });
  assert.equal(owned.mode, 'RESUME_OWNED');
  assert.equal(owned.taskId, 'TASK-20261004-001');
  assert.equal(owned.tool, 'mcp_claim_next_governed_task');
  for (const flag of ['authoritative', 'claimsAutomatically', 'createsRuntimeTask'] as const) {
    assert.equal(owned[flag], false, flag);
  }

  const claim = next({ tasks: [task(2)] });
  assert.equal(claim.mode, 'CLAIM_EXISTING');
  assert.equal(claim.taskId, 'TASK-20261004-002');
  assert.equal(claim.tool, 'mcp_claim_next_governed_task');

  const materialize = next();
  assert.equal(materialize.mode, 'MATERIALIZE_BLUEPRINT');
  assert.equal(materialize.blueprintId, 'TB-T-ONE');
  assert.equal(materialize.tool, 'mcp_materialize_program_blueprint');
  assert.equal(materialize.programProjectionDigest, DIGEST);
  assert.equal(materialize.githubOnlyPossible, false);
  assert.equal(materialize.taskId, null);
});

test('a projected blueprint is exactly the intent the materialization tool would build', () => {
  const source = program();
  const projected = next({ program: source });
  const { intent } = buildProgramBlueprintIntent(
    { projection: source.projection, digest: source.digest },
    projected.blueprintId!,
    readinessLibrary as never
  );
  assert.equal(projected.intentKey, intent.intentKey);
  assert.deepEqual(projected.resourceScopes, intent.resourceScopes);

  const drifted = next({
    program: program([blueprint('TB-T-DRIFT', { readiness: { state: 'BLOCKED' } }), blueprint('TB-T-TWO')])
  });
  assert.equal(drifted.blueprintId, 'TB-T-TWO', 'a blueprint the tool would refuse is never projected');
  assert.deepEqual(drifted.skipped, [{ blueprintId: 'TB-T-DRIFT', reasonCode: 'PROGRAM_BLUEPRINT_NOT_READY' }]);
});

test('a locally blocked candidate is skipped when another compatible candidate exists', () => {
  const lockedTask = next({
    tasks: [task(1), task(2)],
    activeLocks: [{ scope: 'resource:task-1', governedSessionId: OTHER }]
  });
  assert.equal(lockedTask.mode, 'CLAIM_EXISTING');
  assert.equal(lockedTask.taskId, 'TASK-20261004-002');
  assert.deepEqual(lockedTask.skipped, [{ taskId: 'TASK-20261004-001', reasonCode: 'TASK_LOCK_CONFLICT' }]);

  const ownLock = next({
    tasks: [task(1), task(2)],
    activeLocks: [{ scope: 'resource:task-1', governedSessionId: SESSION }]
  });
  assert.equal(ownLock.taskId, 'TASK-20261004-001', 'the session own lock is never a conflict');

  const busyScope = next({
    tasks: [task(1, { resourceScopes: ['resource:shared'] }), task(2), task(3, {
      status: 'IN_PROGRESS', ownerGovernedSessionId: OTHER, resourceScopes: ['resource:shared']
    })]
  });
  assert.equal(busyScope.taskId, 'TASK-20261004-002');
  assert.deepEqual(busyScope.skipped, [{ taskId: 'TASK-20261004-001', reasonCode: 'TASK_RESOURCE_CONFLICT' }]);

  const busyDomain = next({
    tasks: [task(9, { status: 'IN_PROGRESS', ownerGovernedSessionId: OTHER, resourceScopes: ['domain:tb-t-one'] })]
  });
  assert.equal(busyDomain.mode, 'MATERIALIZE_BLUEPRINT');
  assert.equal(busyDomain.blueprintId, 'TB-T-TWO');
  assert.deepEqual(busyDomain.skipped, [{ blueprintId: 'TB-T-ONE', reasonCode: 'EQUIVALENT_OR_COLLIDING_TASK_ACTIVE' }]);

  const terminal = next({
    tasks: [task(9, { status: 'DONE', intentKey: 'program:tb-t-one', resourceScopes: ['domain:tb-t-one'] })]
  });
  assert.equal(terminal.blueprintId, 'TB-T-TWO');
  assert.deepEqual(terminal.skipped, [{ blueprintId: 'TB-T-ONE', reasonCode: 'PROGRAM_BLUEPRINT_TASK_TERMINAL' }]);

  const allBlocked = next({
    tasks: [],
    activeLocks: [
      { scope: 'domain:tb-t-one', governedSessionId: OTHER },
      { scope: 'domain:tb-t-two', governedSessionId: OTHER }
    ]
  });
  assert.equal(allBlocked.mode, 'NONE');
  assert.equal(allBlocked.tool, null);
  assert.ok(allBlocked.reasonCodes.includes('NO_COMPATIBLE_WORK'));
  assert.deepEqual(allBlocked.skipped, [
    { blueprintId: 'TB-T-ONE', reasonCode: 'TASK_LOCK_CONFLICT' },
    { blueprintId: 'TB-T-TWO', reasonCode: 'TASK_LOCK_CONFLICT' }
  ]);
});

test('skipped candidates are bounded', () => {
  const tasks = Array.from({ length: 25 }, (_, index) => task(index + 1));
  const projection = next({
    tasks,
    activeLocks: tasks.map((entry) => ({ scope: entry.resourceScopes[0], governedSessionId: OTHER })),
    program: null
  });
  assert.equal(projection.mode, 'NONE');
  assert.equal(projection.skipped.length, 20);
  assert.equal(projection.skippedTruncated, true);
});

test('the projection recomputes deterministically after terminal task evidence', () => {
  const dependent = task(2, { dependencies: ['TASK-20261004-001'] });
  const before = next({ tasks: [task(1, { status: 'VERIFYING', ownerGovernedSessionId: SESSION }), dependent] });
  assert.equal(before.mode, 'RESUME_OWNED');
  const after = next({ tasks: [task(1, { status: 'DONE', ownerGovernedSessionId: SESSION }), dependent] });
  assert.equal(after.mode, 'CLAIM_EXISTING');
  assert.equal(after.taskId, 'TASK-20261004-002');
  assert.deepEqual(after, next({ tasks: [task(1, { status: 'DONE', ownerGovernedSessionId: SESSION }), dependent] }));
});

test('unbound, scoped, non-MCP or program-less sessions never get a materialization suggestion', () => {
  assert.deepEqual(next({ sessionId: null }).reasonCodes, ['SESSION_UNBOUND']);
  assert.equal(next({ sessionId: null }).mode, 'NONE');
  const scoped = next({
    sessionTargetScope: {
      schemaVersion: 1, targetId: 'T-1', projectId: 'p', projectUid: 'T-1',
      components: [{ mappingId: 'm', repositoryId: 'github:Org/repo', role: 'API' }]
    }
  });
  assert.equal(scoped.mode, 'NONE');
  assert.equal(scoped.blueprintId, null);
  assert.ok(scoped.reasonCodes.includes('PROGRAM_BLUEPRINT_REQUIRES_MCP_SESSION'));
  const foreignRepository = next({ sessionRepository: 'ExampleOrg/api' });
  assert.equal(foreignRepository.mode, 'NONE');
  assert.ok(foreignRepository.reasonCodes.includes('PROGRAM_BLUEPRINT_REQUIRES_MCP_SESSION'));
  const unavailable = next({ program: null });
  assert.equal(unavailable.mode, 'NONE');
  assert.ok(unavailable.reasonCodes.includes('PROGRAM_PROJECTION_UNAVAILABLE'));
  const malformed = next({ program: { projection: { taskBlueprints: [null] }, digest: DIGEST, library: readinessLibrary } });
  assert.equal(malformed.mode, 'NONE');
  assert.ok(malformed.reasonCodes.includes('PROGRAM_PROJECTION_UNAVAILABLE'));
  const guarded = next({ program: program([blueprint('TB-T-COND', { readiness: { state: 'CONDITIONAL', autoPromotable: false, requiredExplicitGates: ['EXPLICIT_HUMAN_GATE'] } })]) });
  assert.equal(guarded.mode, 'NONE');
});

test('the projection is a pure function over existing authorities', async () => {
  const source = await readFile(MODULE_PATH, 'utf8');
  for (const forbidden of [/from 'node:fs/, /createAtomicJsonStore/, /\.update\(/, /writeFile/, /reconcileIntent\(/, /claimNextTask\(/]) {
    assert.doesNotMatch(source, forbidden);
  }
});

test('claiming skips a locally blocked first candidate but keeps the historical error when nothing is compatible', async () => {
  let locks = [{ scope: 'resource:task-1', governedSessionId: OTHER }];
  const { directory, queue } = await seededQueue([seedTask(1), seedTask(2)], () => locks);
  try {
    const claimed = await queue.claimNextTask(SESSION, (await queue.listVisibleTasks()).storeRevision);
    assert.equal(claimed?.taskId, 'TASK-20261004-002');
    await assert.rejects(
      queue.claimNextTask(THIRD, (await queue.listVisibleTasks()).storeRevision),
      /TASK_LOCK_CONFLICT/
    );
    locks = [];
    const freed = await queue.claimNextTask(THIRD, (await queue.listVisibleTasks()).storeRevision);
    assert.equal(freed?.taskId, 'TASK-20261004-001');
  } finally {
    await rm(directory, { recursive: true, force: true });
  }

  const shared = await seededQueue([
    seedTask(1, { priority: 90, resourceScopes: ['resource:shared'] }),
    seedTask(2, { priority: 10, resourceScopes: ['resource:shared'] }),
    seedTask(3, { priority: 50 })
  ], () => []);
  try {
    const claimed = await shared.queue.claimNextTask(SESSION, (await shared.queue.listVisibleTasks()).storeRevision);
    assert.equal(claimed?.taskId, 'TASK-20261004-003', 'scope-conflicting candidates are skipped');
    await assert.rejects(
      shared.queue.claimNextTask(OTHER, (await shared.queue.listVisibleTasks()).storeRevision),
      /TASK_RESOURCE_CONFLICT/
    );
  } finally {
    await rm(shared.directory, { recursive: true, force: true });
  }
});

test('the Current-State Inventory carries the next-work projection for the requested session', async () => {
  const empty = async () => ({ schemaVersion: 1, storeRevision: 3, seedRegistryVersion: 1, nextSequence: 2, tasks: [] });
  const inventory = await inventoryService({ tasks: empty, program: async () => program() }).getInventory(REQUEST);
  assert.equal(inventory.nextWork?.mode, 'MATERIALIZE_BLUEPRINT');
  assert.equal(inventory.nextWork?.blueprintId, 'TB-T-ONE');
  assert.ok(inventory.bootstrap.order.includes('mcp_materialize_program_blueprint'));
  assert.ok(
    inventory.bootstrap.order.indexOf('mcp_materialize_program_blueprint')
      < inventory.bootstrap.order.indexOf('mcp_claim_next_governed_task')
  );

  const owned = await inventoryService({
    tasks: async () => ({
      schemaVersion: 1, storeRevision: 4, seedRegistryVersion: 1, nextSequence: 3,
      tasks: [task(1, { status: 'IN_PROGRESS', ownerGovernedSessionId: SESSION }), task(2)]
    }),
    program: async () => program()
  }).getInventory(REQUEST);
  assert.equal(owned.nextWork?.mode, 'RESUME_OWNED');
  assert.equal(owned.nextWork?.taskId, 'TASK-20261004-001');

  const unbound = await inventoryService({ tasks: empty, sessionId: null, program: async () => program() }).getInventory(REQUEST);
  assert.deepEqual(unbound.nextWork?.reasonCodes, ['SESSION_UNBOUND']);

  const failing = await inventoryService({
    tasks: empty,
    program: async () => { throw new Error('ENOENT'); }
  }).getInventory(REQUEST);
  assert.equal(failing.nextWork?.mode, 'NONE');
  assert.ok(failing.nextWork?.reasonCodes.includes('PROGRAM_PROJECTION_UNAVAILABLE'));
});

test('terminal evidence recomputes the next eligible work through the real queue without human distribution', async () => {
  const { directory, queue } = await seededQueue([
    seedTask(1),
    seedTask(2, { dependencies: ['TASK-20261004-001'] })
  ], () => []);
  try {
    const service = inventoryService({ tasks: () => queue.listVisibleTasks(), program: async () => null });
    const first = await service.getInventory(REQUEST);
    assert.equal(first.nextWork?.mode, 'CLAIM_EXISTING');
    assert.equal(first.nextWork?.taskId, 'TASK-20261004-001');

    let current = await queue.claimNextTask(SESSION, first.source.taskStoreRevision);
    assert.equal(current?.taskId, first.nextWork?.taskId);
    assert.equal((await service.getInventory(REQUEST)).nextWork?.mode, 'RESUME_OWNED');

    for (const status of ['IN_PROGRESS', 'REVIEW', 'MERGE_READY', 'DEPLOYING', 'VERIFYING', 'DONE'] as const) {
      current = await queue.transitionTask({
        taskId: current!.taskId, expectedTaskRevision: current!.taskRevision,
        governedSessionId: SESSION, status
      });
    }
    const recomputed = await service.getInventory(REQUEST);
    assert.equal(recomputed.nextWork?.mode, 'CLAIM_EXISTING');
    assert.equal(recomputed.nextWork?.taskId, 'TASK-20261004-002');
    const claimed = await queue.claimNextTask(SESSION, recomputed.source.taskStoreRevision);
    assert.equal(claimed?.taskId, recomputed.nextWork?.taskId);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('the governed context next action follows the next-work projection', async () => {
  const session = {
    schemaVersion: 1, governedSessionId: SESSION, repository: 'Patricked-code/MCP', taskScope: 's',
    workBranch: null, agentIdentity: 'a', ownerPrincipalId: null, identityAssurance: 'declared_only',
    status: 'ACTIVE', createdAt: NOW, resumedAt: null, lastHeartbeatAt: NOW, pausedAt: null, expiredAt: null,
    closedAt: null, currentTransport: null, lastAcknowledgedStateVersion: 4, sessionRevision: 2,
    bootstrapReceipt: {
      schemaVersion: 1, bootstrapReceiptId: '55555555-5555-4555-8555-555555555555', governedSessionId: SESSION,
      agentIdentity: 'a', repository: 'Patricked-code/MCP', governedBranch: null, stateVersion: 4,
      githubHead: null, runtimeRevision: null, catalogueDigest: null, governanceDigest: null, taskRegistryDigest: null,
      createdAt: NOW, expiresAt: '2099-01-01T00:00:00.000Z', status: 'ACKNOWLEDGED', limitations: []
    },
    lastCheckpoint: null, blockers: [], nextAction: null, lockIds: [], resumePolicy: 'resume_secret_required'
  } as any;
  const liveState = {
    schemaVersion: 1, stateVersion: 4, generatedAt: NOW, lastReconciledAt: NOW, maxAgeSeconds: 60,
    freshness: 'CURRENT', ageSeconds: 0, repository: 'Patricked-code/MCP',
    github: { status: 'CURRENT', branch: 'main', head: 'a'.repeat(40) },
    s1: { status: 'CURRENT', path: '/opt', branch: 'main', head: 'a'.repeat(40), originMain: 'a'.repeat(40), workingTreeClean: true, diffEmpty: true, fetchRemote: null, pushRemote: null },
    runtime: { status: 'CURRENT', container: 'c', containerStatus: 'running', health: 'healthy', imageId: null, revision: 'a'.repeat(40) },
    documentation: { status: 'CURRENT', activeTask: null, declaredGithubSha: null, declaredS1Sha: null, drift: false },
    alignment: { githubVsS1: 'ALIGNED', runtime: 'ALIGNED', documentation: 'ALIGNED', global: 'FULLY_ALIGNED' },
    contradictions: [], nextAction: null
  } as any;
  const github = {
    status: 'CURRENT', observedAt: NOW, mainHead: 'a'.repeat(40), workBranch: null, pullRequest: null,
    checks: { status: 'completed', conclusion: 'success', total: 1, failed: 0 },
    reviews: { approvals: 0, changesRequested: 0, unresolvedThreads: 0 },
    ruleset: { name: null, enforcement: null, requiresPullRequest: null, requiredStatusChecks: [], requiresConversationResolution: null },
    error: null
  } as any;
  const contextFor = (nextWork: unknown, firstExecutableTask: unknown = null, currentTask: unknown = null) => createGovernedOperationalContextService({
    liveState: { getCurrent: async () => liveState, reconcileNow: async () => liveState },
    github: { getCurrent: async () => github, collect: async () => github, reconcileExplicit: async () => github },
    sessions: { getVisibleSession: async () => session },
    locks: { listActiveLocks: async () => [] },
    currentState: {
      getInventory: async () => ({
        source: { catalogueDigest: 'b'.repeat(64), inventoryDigest: null },
        governance: { digest: null }, auditBaseline: { valid: true },
        workQueue: { storeRevision: 1, tasks: [] }, currentTask, firstExecutableTask, nextWork, contradictions: []
      })
    },
    gateMode: 'shadow',
    existingWriteToolsEnabled: true,
    now: () => new Date(NOW)
  } as any).getCurrent({ governedSessionId: SESSION, workBranch: null, request: { transportSessionId: 't', identity: { principalId: null, clientId: null, assurance: 'declared_only' } } } as any);

  const materialize = await contextFor({ mode: 'MATERIALIZE_BLUEPRINT', tool: 'mcp_materialize_program_blueprint', blueprintId: 'TB-T-ONE' });
  assert.equal(materialize.nextAction, 'mcp_materialize_program_blueprint');
  const ineligible = await contextFor({ mode: 'NONE', tool: null, reasonCodes: ['NO_COMPATIBLE_WORK'] }, task(5));
  assert.notEqual(ineligible.nextAction, 'mcp_claim_next_governed_task');
  const legacy = await contextFor(undefined, task(5));
  assert.equal(legacy.nextAction, 'mcp_claim_next_governed_task');

  const claimWork = { mode: 'CLAIM_EXISTING', tool: 'mcp_claim_next_governed_task', taskId: 'TASK-20261004-005' };
  const blockedOwned = await contextFor(claimWork, task(5), task(4, {
    status: 'BLOCKED', ownerGovernedSessionId: SESSION, nextAction: 'wait_for_review'
  }));
  assert.equal(blockedOwned.nextAction, 'mcp_claim_next_governed_task', 'owned blocked work never stalls the session');
  const blockedOnly = await contextFor({ mode: 'NONE', tool: null, reasonCodes: ['NO_COMPATIBLE_WORK'] }, null, task(4, {
    status: 'BLOCKED', ownerGovernedSessionId: SESSION, nextAction: 'wait_for_review'
  }));
  assert.equal(blockedOnly.nextAction, 'wait_for_review');
  const activeOwned = await contextFor(claimWork, task(5), task(4, {
    status: 'IN_PROGRESS', ownerGovernedSessionId: SESSION, nextAction: 'open_pull_request'
  }));
  assert.equal(activeOwned.nextAction, 'open_pull_request', 'resumable owned work keeps its own next action');
});
