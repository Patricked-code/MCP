import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const path = 'docs/governance/mcp-priority-convergence-map-20261015.json';
async function loadJson(file: string): Promise<any> {
  return JSON.parse(await readFile(file, 'utf8'));
}

test('priority map is a complete ordered DAG and never a second Task Queue', async () => {
  const map = await loadJson(path);
  assert.equal(map.kind, 'NON_AUTHORITATIVE_PROGRAM_NAVIGATION_AND_HANDOFF_MAP');
  assert.equal(map.repository, 'Patricked-code/MCP');
  assert.equal(map.stages.length, 15);
  assert.equal(map.workflowModel.runtimeAuthority, 'GOVERNED_TASK_QUEUE_ONLY');
  assert.ok(map.executionInvariants.includes('NO_SECOND_TASK_QUEUE_OR_DISPATCHER'));
  assert.ok(map.executionInvariants.includes('READ_EXISTING_OWNED_TASK_FIRST'));
  assert.ok(map.executionInvariants.includes('FIRST_COLLISION_FREE_IN_PROGRAM_ORDER'));

  const knownStages = new Map<string, number>();
  map.stages.forEach((stage: any, i: number) => {
    assert.equal(stage.id, 'PCM-' + String(i).padStart(2, '0'));
    assert.equal(stage.order, i);
    assert.equal(knownStages.has(stage.id), false);
    knownStages.set(stage.id, i);
    for (const field of ['goal', 'scope', 'mode', 'snapshotState']) {
      assert.ok(typeof stage[field] === 'string' && stage[field].length > 0);
    }
    for (const field of ['dependsOn', 'mapsTo', 'actions', 'exitCriteria', 'evidence']) {
      assert.ok(Array.isArray(stage[field]) && stage[field].length > 0 || field === 'dependsOn' && i === 0 && stage[field].length === 0);
    }
    assert.equal(Object.hasOwn(stage, 'owner'), false, 'no fake task ownership');
    assert.equal(Object.hasOwn(stage, 'runtimeTaskId'), false, 'no invented task id');
  });
  map.stages.forEach((stage: any) => {
    assert.equal(new Set(stage.dependsOn).size, stage.dependsOn.length);
    for (const dependency of stage.dependsOn) {
      assert.ok(knownStages.has(dependency));
      assert.ok(knownStages.get(dependency)! < stage.order, 'dependencies must precede dependent phase');
    }
  });
  assert.deepEqual(map.stages.find((s: any) => s.id === 'PCM-09').dependsOn, ['PCM-00'],
    'do not make closure of the audit an artificial global blocker to collision-free work');
});

test('priority map references every existing blueprint in Program Backlog V2 exactly once in planning order', async () => {
  const map = await loadJson(path);
  const backlog = await loadJson('docs/governance/program-backlog-convergence.json');
  const original = backlog.taskBlueprints.map((item: any) => item.id);
  const snapshot = map.planningSnapshot.allBlueprintsInExistingProgramOrder;
  assert.equal(map.planningSnapshot.snapshotType, 'READ_ONLY_COPY_OF_PROGRAM_BACKLOG_ORDER_NOT_RUNTIME_QUEUE');
  assert.equal(snapshot.length, backlog.taskBlueprints.length);
  assert.equal(map.planningSnapshot.total, snapshot.length);
  assert.deepEqual(snapshot.map((item: any) => item.id), original);
  assert.equal(new Set(original).size, original.length);
  assert.deepEqual(snapshot.map((item: any) => item.programOrdinal), original.map((_: string, i: number) => i));
  const known = new Set(original);
  for (const stage of map.stages) {
    for (const id of stage.blueprints) assert.ok(known.has(id), 'unknown mapped blueprint ' + id);
  }
  const readyAtSnapshot = snapshot.filter((item: any) => item.planningStateAsObserved === 'READY').map((item: any) => item.id);
  assert.deepEqual(map.planningSnapshot.readyCandidateIdsInProgramOrder, readyAtSnapshot);
  assert.equal(snapshot.some((item: any) => !Array.isArray(item.collisionDomains)), false);
});

test('GWB anchors, entrypoints and owner/collision handoff remain discoverable on cold start', async () => {
  const map = await loadJson(path);
  const workblock = await loadJson('docs/governance/governed-audit-continuation-workblock-20261009.json');
  const allowed = new Set(workblock.tasks.map((item: any) => item.id));
  for (const stage of map.stages) {
    for (const id of stage.mapsTo) assert.ok(allowed.has(id), 'unknown GWB task ' + id);
  }
  for (const doc of ['README.md', 'AGENTS.md', 'CLAUDE.md', 'TASKS.md', 'docs/governance/README.md']) {
    const content = await readFile(doc, 'utf8');
    assert.ok(content.includes('mcp-priority-convergence-map-20261015.json'),
      'missing mandatory priority-map link in ' + doc);
  }
  const protocol = map.agentArrivalProtocol;
  assert.match(protocol.onCollision, /STOP_MUTATION/);
  assert.match(protocol.onHeadMoved, /STOP_WRITE/);
  assert.match(protocol.onOAuthFailure, /do not bypass consent/i);
  assert.ok(map.reconciliationCheckpointContract.mustContain.includes('nextAction'));
  assert.ok(map.reconciliationCheckpointContract.mustContain.includes('exactGitSha'));
  assert.match(map.globalStopRule, /terminal acceptance/i);
  assert.match(map.sharedCoordination.durableGitHubChannel, /issues\/235$/);
  assert.match(map.sharedCoordination.runtimeTruth, /Governed Task Queue/);
  assert.match(map.sharedCoordination.traceabilityBoundary, /not a push notification bus/);
  assert.ok(map.sharedCoordination.presenceProtocol.length >= 5);
});
