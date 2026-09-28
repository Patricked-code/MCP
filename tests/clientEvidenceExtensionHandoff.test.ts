import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const PROGRAM_PATH = 'docs/governance/program-backlog-convergence.json';

async function program() {
  return JSON.parse(await readFile(PROGRAM_PATH, 'utf8'));
}

test('TB-W3-A22-02 is DONE only with exact-head, deploy and read-only attestation evidence', async () => {
  const projection = await program();
  const byId = new Map(
    (projection.taskBlueprints ?? []).map((entry: any) => [entry.id, entry])
  );
  const blueprint = byId.get('TB-W3-A22-02');
  const evidence = blueprint?.completionEvidence;

  assert.equal(blueprint?.readiness?.state, 'DONE');
  assert.equal(evidence?.pullRequest, 194);
  assert.equal(evidence?.candidateHeadSha, 'a63198fa4525e5489d01142480bb300f42804e50');
  assert.equal(evidence?.redHeadSha, '6b8b84c346eaeb73c9862a4efaf90f2a0ddeaa36');
  assert.equal(evidence?.redCiRunId, 36292027817);
  assert.deepEqual(evidence?.greenCiRunIds, [36292162709, 36292300342]);
  assert.equal(evidence?.mergeSha, '70ee280c89d5ca3747f762a89287923dde320add');
  assert.equal(evidence?.mainCiRunId, 36292779495);
  assert.equal(evidence?.governedDeployRunId, 36292779401);
  assert.equal(evidence?.governedDeployRuntimeRevision, evidence?.mergeSha);

  for (const probe of ['mcp_git_status', 'docker_status']) {
    const readonly = evidence?.readonlyEvidence?.[probe];
    assert.equal(readonly?.target, 's1', probe);
    assert.equal(readonly?.status, 'SUCCESS', probe);
    assert.equal(readonly?.mutationAllowed, false, probe);
    assert.equal(readonly?.workflowSha, evidence?.mergeSha, probe);
    assert.ok(Number.isSafeInteger(readonly?.runId) && readonly.runId > 0, probe);
  }

  assert.equal(evidence?.persistedFormatChanged, false);
  assert.equal(evidence?.runtimeTasksCreated, 0);
  assert.equal(evidence?.governedSessionsCreated, 0);
  assert.equal(evidence?.runtimeLocksCreated, 0);

  const workItem = (projection.workItems ?? []).find((entry: any) => entry.id === 'PB-A2.2');
  assert.equal(workItem?.disposition, 'DONE');
});

test('A2.2.2 completion re-evaluates only its direct dependent and keeps W3 current', async () => {
  const projection = await program();
  const byId = new Map(
    (projection.taskBlueprints ?? []).map((entry: any) => [entry.id, entry])
  );

  assert.deepEqual(byId.get('TB-W4-G1-01')?.dependsOn, ['TB-W3-A22-02']);
  assert.equal(byId.get('TB-W4-G1-01')?.readiness?.state, 'READY');
  for (const id of ['TB-W3-A3-01', 'TB-W3-B3-01', 'TB-W3-C1-01', 'TB-W4-G1-01']) {
    assert.ok(
      ['READY', 'DONE'].includes(byId.get(id)?.readiness?.state),
      `${id} should remain acquired or planning-ready after the historical A2.2.2 handoff`
    );
  }
  assert.equal(projection.executionModel?.currentWave, 'W3');
  assert.equal(
    (projection.sourceCoverage?.todoUnchecked ?? []).some(
      (entry: any) => entry.coveredBy === 'PB-A2.2'
    ),
    false
  );
});

test('A2.2 planning surfaces are closed coherently without rewriting history', async () => {
  const [todo, tasks, roadmap, suivi] = await Promise.all([
    readFile('TODO.md', 'utf8'),
    readFile('TASKS.md', 'utf8'),
    readFile('ROADMAP.md', 'utf8'),
    readFile('SUIVI.md', 'utf8')
  ]);

  assert.match(todo, /\| `PB-A2\.2` \| `DONE` \|/);
  assert.doesNotMatch(todo, /- \[ \] classifier l'identité cliente/);
  assert.doesNotMatch(todo, /- \[ \] garder A2\.2 non bloquant/);
  assert.match(tasks, /\[x\] A2\.2 \/ `TB-W3-A22-02`/);
  assert.match(roadmap, /A2\.2\.2 .*DONE/);
  assert.match(suivi, /A2\.2\.2 .*DONE/);
});
