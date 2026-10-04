import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const PROGRAM_PATH = 'docs/governance/program-backlog-convergence.json';
const MERGE_SHA = '6df23b91551a97cdf10968c22071036d5942f11b';

test('TB-W3-DISPATCH-03 is DONE only with exact-head, deploy and read-only attestation evidence', async () => {
  const program = JSON.parse(await readFile(PROGRAM_PATH, 'utf8'));
  const byId = new Map((program.taskBlueprints ?? []).map((entry: any) => [entry.id, entry]));
  const blueprint: any = byId.get('TB-W3-DISPATCH-03');
  const evidence = blueprint?.completionEvidence;

  assert.equal(blueprint?.readiness?.state, 'DONE');
  assert.equal(evidence?.pullRequest, 231);
  assert.equal(evidence?.intake, 222);
  assert.equal(evidence?.redHeadSha, '8e772a9976686c63fd8e9382b9dc2896118be1b7');
  assert.equal(evidence?.candidateHeadSha, 'ed100d68e7d8204c5c66761f5efe3c8055f86099');
  assert.equal(evidence?.prCiRunId, 37223273561);
  assert.equal(evidence?.mergeSha, MERGE_SHA);
  assert.equal(evidence?.mainCiRunId, 37223380722);
  assert.equal(evidence?.governedDeployRunId, 37223380611);
  assert.equal(evidence?.governedDeployRuntimeRevision, MERGE_SHA);
  for (const probe of ['mcp_git_status', 'docker_status']) {
    const readonly = evidence?.readonlyEvidence?.[probe];
    assert.equal(readonly?.status, 'SUCCESS', probe);
    assert.equal(readonly?.mutationAllowed, false, probe);
    assert.equal(readonly?.workflowSha, MERGE_SHA, probe);
  }
  assert.equal(evidence?.runtimeTasksCreated, 0);
  assert.equal(evidence?.governedSessionsCreated, 0);
  assert.equal(evidence?.runtimeLocksCreated, 0);
  assert.equal(program.w3DispatchNextWorkHandoff?.status, 'PASS_WITH_EVIDENCE');
});

test('the dispatch loop of intake #222 is complete and its dependents are recomputed', async () => {
  const program = JSON.parse(await readFile(PROGRAM_PATH, 'utf8'));
  const byId = new Map((program.taskBlueprints ?? []).map((entry: any) => [entry.id, entry]));
  for (const id of ['TB-W3-DISPATCH-01', 'TB-W3-DISPATCH-02', 'TB-W3-DISPATCH-03']) {
    assert.equal((byId.get(id) as any)?.readiness?.state, 'DONE', id);
  }
  const workItem = (program.workItems ?? []).find((entry: any) => entry.id === 'PB-DISPATCH');
  assert.equal(workItem?.disposition, 'DONE');
  const intake = (program.programIntakes ?? []).find((entry: any) => entry.issue === 222);
  assert.deepEqual(
    (intake?.progress ?? []).map((entry: any) => [entry.blueprintId, entry.state, entry.pullRequest]),
    [['TB-W3-DISPATCH-01', 'DONE', 227], ['TB-W3-DISPATCH-02', 'DONE', 229], ['TB-W3-DISPATCH-03', 'DONE', 231]]
  );
  const coverage = (program.sourceCoverage?.programIntakes ?? []).find((entry: any) => entry.sourceKey === 'issue:222');
  assert.equal(coverage?.disposition, 'DONE');
  const counted = (program.workItems ?? []).filter((entry: any) => entry.disposition === 'DONE').length;
  assert.equal(program.summary?.dispositionCounts?.DONE, counted);
  assert.equal(program.executionModel?.currentReadyBlueprintIds?.includes('TB-W3-DISPATCH-03'), false);
});
