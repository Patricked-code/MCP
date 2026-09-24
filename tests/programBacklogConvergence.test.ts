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
  assert.equal(w1.readiness?.state, 'READY');
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
