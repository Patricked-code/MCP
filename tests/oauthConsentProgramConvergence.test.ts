import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const PROGRAM_PATH = 'docs/governance/program-backlog-convergence.json';

test('owner-directed OAuth authorization consent converges into the existing Program Backlog', async () => {
  const program = JSON.parse(await readFile(PROGRAM_PATH, 'utf8'));
  const workItem = (program.workItems ?? []).find((entry: any) => entry.id === 'PB-OAUTH-CONSENT');
  const blueprint = (program.taskBlueprints ?? []).find(
    (entry: any) => entry.id === 'TB-W3-OAUTH-CONSENT-01'
  );
  const intake = (program.programIntakes ?? []).find(
    (entry: any) => entry.id === 'INTAKE-OAUTH-CONSENT-20260930'
  );

  assert.equal(workItem?.integrationSlot, 'connection.oauth-authorization-consent');
  assert.equal(blueprint?.workItemId, 'PB-OAUTH-CONSENT');
  assert.equal(blueprint?.waveId, 'W3');
  assert.deepEqual(blueprint?.collisionDomains, ['connection:oauth-authorization-consent']);
  assert.notDeepEqual(blueprint?.collisionDomains, ['connection:oauth-attempt-correlation']);
  assert.equal(blueprint?.runtimeRequired, true);
  assert.equal(blueprint?.materialization?.createsRuntimeTask, false);
  assert.deepEqual(blueprint?.writeAuthorities, []);
  assert.equal(intake?.createsParallelProgram, false);
  assert.equal(intake?.createsRuntimeTasks, false);
  assert.deepEqual(intake?.targetBlueprintIds, ['TB-W3-OAUTH-CONSENT-01']);
  assert.ok(
    (program.sourceCoverage?.programIntakes ?? []).some(
      (entry: any) => entry.coveredBy === 'PB-OAUTH-CONSENT'
    )
  );
});
