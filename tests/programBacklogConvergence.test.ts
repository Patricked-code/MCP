import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { validateProgramBacklogConvergence } from '../scripts/program-backlog-convergence-lib.mjs';

test('program backlog convergence covers every known planning source exactly once', async () => {
  const [projectionRaw, todo, roadmap, gwcRaw, taskRegistryRaw] = await Promise.all([
    readFile('docs/governance/program-backlog-convergence.json', 'utf8'),
    readFile('TODO.md', 'utf8'),
    readFile('ROADMAP.md', 'utf8'),
    readFile('.mcp/gwc-evolution-design.json', 'utf8'),
    readFile('.mcp/task-registry.json', 'utf8')
  ]);

  const projection = JSON.parse(projectionRaw);
  const gwc = JSON.parse(gwcRaw);
  const taskRegistry = JSON.parse(taskRegistryRaw);
  const result = validateProgramBacklogConvergence({
    projection,
    todo,
    roadmap,
    gwc,
    taskRegistry
  });

  assert.equal(result.ok, true, JSON.stringify(result, null, 2));
  assert.deepEqual(result.missingTodo, []);
  assert.deepEqual(result.extraTodo, []);
  assert.deepEqual(result.missingBlueprints, []);
  assert.deepEqual(result.missingFindings, []);
  assert.deepEqual(result.missingDecisions, []);
  assert.deepEqual(result.missingTasks, []);
  assert.deepEqual(result.duplicateSourceKeys, []);
  assert.deepEqual(result.duplicateWorkItemIds, []);
  assert.deepEqual(result.unreferencedWorkItems, []);
  assert.deepEqual(result.unknownDependencies, []);
  assert.deepEqual(result.integrationSlotCollisions, []);
});

test('program backlog convergence is a derived projection and never a second task authority', async () => {
  const projection = JSON.parse(
    await readFile('docs/governance/program-backlog-convergence.json', 'utf8')
  );

  assert.equal(projection.authority.kind, 'DERIVED_NON_EXECUTABLE_PROJECTION');
  assert.equal(projection.authority.createsRuntimeTasks, false);
  assert.equal(projection.authority.replacesTaskQueue, false);
  assert.equal(projection.authority.replacesRoadmap, false);
  assert.equal(projection.authority.replacesTodo, false);
});

test('the universal-agent-coordination program is terminal and preserved as completed provenance', async () => {
  const projection = JSON.parse(
    await readFile('docs/governance/program-backlog-convergence.json', 'utf8')
  );

  const uac = projection.workItems.find((item: any) => item.id === 'PB-UAC');

  assert.ok(uac);
  assert.equal(uac.disposition, 'DONE');
  assert.equal(uac.integrationSlot, 'coordination.universal');
  assert.equal(uac.externalWork?.pullRequest, 154);
  assert.equal(uac.externalWork?.state, 'MERGED_DEPLOYED_ATTESTED');
  assert.equal(uac.externalWork?.mergeCommit, 'ba9acd1cb15942f37aba2b9a0a45b267ec50d5b4');
});

test('program backlog v2 exposes machine-readable waves without becoming a runtime authority', async () => {
  const projection = JSON.parse(
    await readFile('docs/governance/program-backlog-convergence.json', 'utf8')
  );

  assert.equal(projection.schemaVersion, 2);
  assert.equal(projection.executionModel?.kind, 'VERSIONED_PROGRAM_PLAN');
  assert.equal(projection.executionModel?.runtimeTaskAuthority, 'Governed Task Queue');
  assert.equal(projection.executionModel?.automaticRuntimeTaskCreation, false);

  assert.deepEqual(
    projection.executionModel?.waves?.map((wave: any) => wave.id),
    ['W1', 'W2', 'W3', 'W4', 'MAINTENANCE', 'CONDITIONAL']
  );
  assert.equal(projection.executionModel?.waves?.[0]?.title, 'Program State Convergence');
  assert.equal(projection.executionModel?.waves?.[1]?.title, 'GitHub Control Plane READ Complements');
});

test('every executable future lot is represented by a non-authoritative task blueprint', async () => {
  const projection = JSON.parse(
    await readFile('docs/governance/program-backlog-convergence.json', 'utf8')
  );

  const blueprints = projection.taskBlueprints ?? [];
  assert.ok(blueprints.length >= 30);

  const ids = new Set<string>();
  for (const blueprint of blueprints) {
    assert.equal(typeof blueprint.id, 'string');
    assert.equal(ids.has(blueprint.id), false, `duplicate blueprint ${blueprint.id}`);
    ids.add(blueprint.id);

    assert.equal(typeof blueprint.workItemId, 'string');
    assert.equal(typeof blueprint.waveId, 'string');
    assert.equal(typeof blueprint.lotId, 'string');
    assert.equal(typeof blueprint.title, 'string');
    assert.equal(typeof blueprint.objective, 'string');
    assert.equal(typeof blueprint.integrationSlot, 'string');
    assert.ok(Array.isArray(blueprint.dependsOn));
    assert.ok(Array.isArray(blueprint.existingAuthorities));
    assert.ok(Array.isArray(blueprint.resourceScopes));
    assert.ok(Array.isArray(blueprint.collisionDomains));
    assert.ok(Array.isArray(blueprint.redTests));
    assert.ok(Array.isArray(blueprint.greenAcceptance));
    assert.ok(Array.isArray(blueprint.regressionSuites));
    assert.ok(Array.isArray(blueprint.definitionOfDone));
    assert.equal(blueprint.materialization?.createsRuntimeTask, false);
    assert.equal(blueprint.materialization?.mode, 'ON_DEMAND_AFTER_REOBSERVATION');
  }

  const byId = new Map(blueprints.map((blueprint: any) => [blueprint.id, blueprint]));
  for (const blueprint of blueprints) {
    for (const dependency of blueprint.dependsOn) {
      assert.ok(byId.has(dependency), `${blueprint.id} has unknown dependency ${dependency}`);
    }
  }
});

test('the first post-UAC wave is reconciliation and GitHub READ R1 cannot precede it', async () => {
  const projection = JSON.parse(
    await readFile('docs/governance/program-backlog-convergence.json', 'utf8')
  );

  const blueprints = new Map(
    (projection.taskBlueprints ?? []).map((blueprint: any) => [blueprint.id, blueprint])
  );

  const w1 = blueprints.get('TB-W1-01');
  const w2 = blueprints.get('TB-W2-01');

  assert.ok(w1);
  assert.equal(w1.readiness?.state, 'DONE');
  assert.ok(w2);
  assert.equal(w2.readiness?.state, 'BLOCKED');
  assert.ok(w2.dependsOn.includes('TB-W1-07'));
});

test('GitHub READ R1 is already fully programmed and remains read-only', async () => {
  const projection = JSON.parse(
    await readFile('docs/governance/program-backlog-convergence.json', 'utf8')
  );

  const blueprints = projection.taskBlueprints ?? [];
  const ids = new Set(blueprints.map((blueprint: any) => blueprint.id));

  for (const id of ['TB-W2-01', 'TB-W2-02', 'TB-W2-03']) assert.ok(ids.has(id));

  const w2 = blueprints.filter((blueprint: any) => blueprint.waveId === 'W2');
  assert.deepEqual(
    w2.map((blueprint: any) => blueprint.outputCapabilities?.[0]),
    ['github_get_commits', 'github_get_tree', 'github_get_required_checks']
  );
  assert.ok(w2.every((blueprint: any) => blueprint.writeAuthorities.length === 0));
});

test('conditional and deferred work can never become READY without an explicit gate', async () => {
  const projection = JSON.parse(
    await readFile('docs/governance/program-backlog-convergence.json', 'utf8')
  );

  const guarded = (projection.taskBlueprints ?? []).filter(
    (blueprint: any) => ['CONDITIONAL', 'DEFERRED'].includes(blueprint.readiness?.state)
  );

  assert.ok(guarded.length > 0);
  for (const blueprint of guarded) {
    assert.equal(blueprint.readiness?.autoPromotable, false);
    assert.ok(Array.isArray(blueprint.readiness?.requiredExplicitGates));
    assert.ok(blueprint.readiness.requiredExplicitGates.length > 0);
  }
});

test('agent handoff contract requires authority reobservation before task materialization', async () => {
  const projection = JSON.parse(
    await readFile('docs/governance/program-backlog-convergence.json', 'utf8')
  );

  assert.deepEqual(projection.agentHandoffContract?.steps, [
    'READ_AUTHORITIES',
    'REOBSERVE_MAIN',
    'REOBSERVE_RUNTIME_STATE',
    'LOAD_PROGRAM_PLAN',
    'SELECT_READY_BLUEPRINT',
    'CHECK_COLLISIONS',
    'MATERIALIZE_OR_CLAIM_RUNTIME_TASK',
    'EXECUTE_RED_GREEN_REGRESSION_REVIEW',
    'MERGE_EXACT_HEAD',
    'GOVERNED_DEPLOY_IF_REQUIRED',
    'ATTEST',
    'CHECKPOINT_HANDOFF'
  ]);
  assert.equal(projection.agentHandoffContract?.heartbeatCanReleaseOwnership, false);
  assert.equal(projection.agentHandoffContract?.staleCanTriggerTakeover, false);
});


test('TB-W1-01 freezes the exact post-UAC baseline and unlocks only its direct dependents', async () => {
  const projection = JSON.parse(
    await readFile('docs/governance/program-backlog-convergence.json', 'utf8')
  );

  assert.equal(projection.observedMainSha, 'd30b06f4c8b72b4888f32397be207798a56b8bb8');
  assert.equal(projection.reconciliationBaseline?.status, 'FROZEN');
  assert.equal(
    projection.reconciliationBaseline?.observedMainSha,
    'd30b06f4c8b72b4888f32397be207798a56b8bb8'
  );
  assert.equal(projection.reconciliationBaseline?.mainCiRunId, 36032772266);
  assert.equal(projection.reconciliationBaseline?.governedDeployRunId, 36032772198);
  assert.deepEqual(projection.reconciliationBaseline?.historicalOpenPullRequests, [85, 86, 88, 89, 90]);

  const byId = new Map(
    (projection.taskBlueprints ?? []).map((blueprint: any) => [blueprint.id, blueprint])
  );
  assert.equal(byId.get('TB-W1-01')?.readiness?.state, 'DONE');
  assert.equal(byId.get('TB-W1-02')?.readiness?.state, 'READY');
  assert.equal(byId.get('TB-W1-05')?.readiness?.state, 'READY');
  assert.equal(byId.get('TB-W1-03')?.readiness?.state, 'BLOCKED');
  assert.equal(byId.get('TB-W1-04')?.readiness?.state, 'BLOCKED');
  assert.equal(byId.get('TB-W2-01')?.readiness?.state, 'BLOCKED');
});

test('repository agent entrypoint explicitly loads Program Backlog V2 before selecting work', async () => {
  const claude = await readFile('CLAUDE.md', 'utf8');

  assert.match(claude, /Program Backlog V2/);
  assert.match(claude, /docs\/governance\/program-backlog-convergence\.json/);
  assert.match(claude, /SELECT_READY_BLUEPRINT/);
  assert.match(claude, /Governed Task Queue/);
  assert.match(claude, /HEAD_MOVED/);
});


test('TB-W1-02 reconciles all GWC-0..17 as integrated history with residuals routed forward', async () => {
  const [projectionRaw, gwcRaw] = await Promise.all([
    readFile('docs/governance/program-backlog-convergence.json', 'utf8'),
    readFile('.mcp/gwc-blueprints.json', 'utf8')
  ]);
  const projection = JSON.parse(projectionRaw);
  const gwc = JSON.parse(gwcRaw);

  assert.equal(gwc.blueprints.length, 18);
  for (const blueprint of gwc.blueprints) {
    assert.ok(['DONE', 'ABSORBED', 'RESIDUAL', 'SUPERSEDED'].includes(
      blueprint.postIntegrationReconciliation?.disposition
    ), `${blueprint.blueprintId} missing post-integration disposition`);
    assert.equal(blueprint.postIntegrationReconciliation?.historicalCandidateReplayAllowed, false);
    assert.equal(blueprint.postIntegrationReconciliation?.evidence?.pr95Merged, true);
    assert.ok(Array.isArray(blueprint.postIntegrationReconciliation?.residualTaskBlueprints));
  }

  const byId = new Map(gwc.blueprints.map((blueprint: any) => [blueprint.blueprintId, blueprint]));
  assert.deepEqual(
    byId.get('GWC-6')?.postIntegrationReconciliation?.residualTaskBlueprints,
    ['TB-W3-C3-01']
  );
  assert.deepEqual(
    byId.get('GWC-7')?.postIntegrationReconciliation?.residualTaskBlueprints,
    ['TB-W3-C4-01']
  );
  assert.deepEqual(
    byId.get('GWC-8')?.postIntegrationReconciliation?.residualTaskBlueprints,
    ['TB-W3-C5-01']
  );
  assert.ok(
    byId.get('GWC-12')?.postIntegrationReconciliation?.residualTaskBlueprints.includes('TB-W2-01')
  );

  const programById = new Map(
    projection.taskBlueprints.map((blueprint: any) => [blueprint.id, blueprint])
  );
  assert.equal(programById.get('TB-W1-02')?.readiness?.state, 'DONE');
});

test('TB-W1-05 retires the stale bootstrap seed without mutating live runtime authority', async () => {
  const [projectionRaw, registryRaw] = await Promise.all([
    readFile('docs/governance/program-backlog-convergence.json', 'utf8'),
    readFile('.mcp/task-registry.json', 'utf8')
  ]);
  const projection = JSON.parse(projectionRaw);
  const registry = JSON.parse(registryRaw);
  const task = registry.tasks.find((entry: any) => entry.taskId === 'TASK-20260822-001');

  assert.equal(registry.registryVersion, 3);
  assert.ok(task);
  assert.equal(task.status, 'DONE');
  assert.equal(task.nextAction, null);

  const byId = new Map(
    projection.taskBlueprints.map((blueprint: any) => [blueprint.id, blueprint])
  );
  assert.equal(byId.get('TB-W1-05')?.readiness?.state, 'DONE');
  assert.equal(byId.get('TB-W1-03')?.readiness?.state, 'READY');
  assert.equal(byId.get('TB-W1-04')?.readiness?.state, 'READY');
  assert.equal(byId.get('TB-W1-06')?.readiness?.state, 'BLOCKED');
});
