import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

// This document is an audit handoff, NOT a second Task Queue or a runtime authority.
const file = 'docs/governance/governed-audit-continuation-workblock-20261009.json';

async function load() {
  return JSON.parse(await readFile(file, 'utf8'));
}

function validateWorkblock(workblock: any) {
  assert.equal(workblock.kind, 'NON_AUTHORITATIVE_GOVERNED_WORKBLOCK_PROJECTION');
  assert.equal(workblock.policy?.authority.includes('never creates or claims Tasks'), true);
  assert.equal(workblock.policy?.selection, 'FIRST_COLLISION_FREE_IN_PROGRAM_ORDER');
  assert.ok(Array.isArray(workblock.tasks) && workblock.tasks.length > 0);

  const positions = new Map<string, number>();
  for (const [index, task] of workblock.tasks.entries()) {
    assert.equal(task.ordinal, index, 'ordinal must reflect the declared order');
    assert.match(task.id, /^GWB-\d{2}$/);
    assert.equal(positions.has(task.id), false, 'duplicate workblock ID');
    positions.set(task.id, index);
    assert.equal(task.status, 'PLANNED_NOT_RUNTIME_TASK');
    assert.equal(task.owner, 'UNASSIGNED');
  }

  for (const task of workblock.tasks) {
    assert.ok(Array.isArray(task.dependsOn));
    assert.equal(new Set(task.dependsOn).size, task.dependsOn.length, 'duplicate dependency');
    for (const dependency of task.dependsOn) {
      assert.ok(positions.has(dependency), 'unknown dependency: ' + dependency);
      assert.ok(positions.get(dependency)! < positions.get(task.id)!, 'dependency must precede dependent');
    }
  }
}

test('governed audit handoff is an ordered, valid, non-authoritative projection', async () => {
  validateWorkblock(await load());
});

test('unknown, duplicate, self and forward dependencies fail closed', async () => {
  const source = await load();
  for (const dependency of ['GWB-UNKNOWN', 'GWB-01', 'GWB-09']) {
    const candidate = structuredClone(source);
    candidate.tasks[1].dependsOn = [dependency];
    assert.throws(() => validateWorkblock(candidate));
  }
  const duplicate = structuredClone(source);
  duplicate.tasks[2].dependsOn = ['GWB-01', 'GWB-01'];
  assert.throws(() => validateWorkblock(duplicate));
  const repeatedId = structuredClone(source);
  repeatedId.tasks[2].id = 'GWB-01';
  assert.throws(() => validateWorkblock(repeatedId));
});

test('workblock cannot be promoted into a runtime task authority', async () => {
  const candidate = await load();
  candidate.kind = 'GOVERNED_TASK_QUEUE';
  assert.throws(() => validateWorkblock(candidate));
  const claimed = await load();
  claimed.tasks[0].owner = 'invented-agent';
  assert.throws(() => validateWorkblock(claimed));
});
