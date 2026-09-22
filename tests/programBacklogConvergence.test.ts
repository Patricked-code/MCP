import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { validateProgramBacklogConvergence } from '../scripts/program-backlog-convergence-lib.mjs';

test('program backlog convergence covers every known planning source exactly once', async () => {
  const [projectionRaw, todo, roadmap, gwcRaw] = await Promise.all([
    readFile('docs/governance/program-backlog-convergence.json', 'utf8'),
    readFile('TODO.md', 'utf8'),
    readFile('ROADMAP.md', 'utf8'),
    readFile('.mcp/gwc-evolution-design.json', 'utf8')
  ]);

  const projection = JSON.parse(projectionRaw);
  const gwc = JSON.parse(gwcRaw);
  const result = validateProgramBacklogConvergence({
    projection,
    todo,
    roadmap,
    gwc
  });

  assert.equal(result.ok, true, JSON.stringify(result, null, 2));
  assert.deepEqual(result.missingTodo, []);
  assert.deepEqual(result.extraTodo, []);
  assert.deepEqual(result.missingBlueprints, []);
  assert.deepEqual(result.missingFindings, []);
  assert.deepEqual(result.missingDecisions, []);
  assert.deepEqual(result.duplicateSourceKeys, []);
  assert.deepEqual(result.duplicateWorkItemIds, []);
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

test('the currently active universal-agent-coordination program is represented, not duplicated', async () => {
  const projection = JSON.parse(
    await readFile('docs/governance/program-backlog-convergence.json', 'utf8')
  );

  const active = projection.workItems.filter((item: any) => item.disposition === 'ACTIVE');
  const uac = active.find((item: any) => item.id === 'PB-UAC');

  assert.ok(uac);
  assert.equal(uac.externalWork?.pullRequest, 154);
  assert.equal(uac.integrationSlot, 'coordination.universal');
  assert.equal(uac.implementationMode, 'REUSE_WRAP_GENERALIZE_EXTEND');
});
