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


test('cold-start audit entrypoints discover the full non-authoritative handoff', async () => {
  const root = await readFile('README.md', 'utf8');
  const agents = await readFile('AGENTS.md', 'utf8');
  const index = await readFile('docs/governance/README.md', 'utf8');
  const memory = await readFile('docs/governance/MASTER_RESUME_MEMORY.md', 'utf8');
  const workblock = await load();

  assert.match(root, /docs\/governance\/README\.md/);
  assert.match(agents, /docs\/governance\/README\.md/);
  for (const reference of [
    'architecture-chronology-issue65-20261009.json',
    'gwb02-review-coverage-manifest-20261015.json',
    'gwb03-pr-review-findings-triage-20261015.json',
    'gwb04-94-blueprint-source-test-trace-20261015.json',
    'governed-audit-continuation-workblock-20261009.json',
    'program-backlog-convergence.json',
    'MASTER_RESUME_MEMORY.md'
  ]) {
    assert.ok(index.includes(reference), 'missing cold-start evidence link: ' + reference);
  }

  assert.match(memory, /snapshot historique/);
  assert.equal(workblock.currentCheckpoint.kind, 'NON_AUTHORITATIVE_AUDIT_CONTINUATION_SNAPSHOT');
  assert.ok(Array.isArray(workblock.checkpointHistory) && workblock.checkpointHistory.length >= 1);
  assert.equal(workblock.currentCheckpoint.auditProgress.GWB02.includes('PR291'), true);
  assert.equal(workblock.currentCheckpoint.auditProgress.GWB04.includes('PR290'), true);
  validateWorkblock(workblock);
});
