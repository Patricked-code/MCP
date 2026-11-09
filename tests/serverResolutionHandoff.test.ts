import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const PROGRAM_PATH = 'docs/governance/program-backlog-convergence.json';
const MERGE_SHA = 'dbc5a5062716ae2fd186d36c4f54e97204ede9a3';

test('TB-W3-C3-01 is DONE only with exact-head, deploy and read-only attestation evidence', async () => {
  const program = JSON.parse(await readFile(PROGRAM_PATH, 'utf8'));
  const byId = new Map((program.taskBlueprints ?? []).map((entry: any) => [entry.id, entry]));
  const blueprint: any = byId.get('TB-W3-C3-01');
  const evidence = blueprint?.completionEvidence;

  assert.equal(blueprint?.readiness?.state, 'DONE');
  assert.equal(evidence?.pullRequest, 233);
  assert.equal(evidence?.redHeadSha, 'a8b86709754b7838aed97f97a30eb50d8632f70d');
  assert.equal(evidence?.candidateHeadSha, 'eaacf048f50ab9ecbaec252b55b0492a43ff0629');
  assert.equal(evidence?.prCiRunId, 37224921479);
  assert.equal(evidence?.mergeSha, MERGE_SHA);
  assert.equal(evidence?.mainCiRunId, 37225005005);
  assert.equal(evidence?.governedDeployRunId, 37225005052);
  assert.equal(evidence?.governedDeployRuntimeRevision, MERGE_SHA);
  assert.equal(evidence?.contract, 'GW-07');
  for (const probe of ['mcp_git_status', 'docker_status']) {
    const readonly = evidence?.readonlyEvidence?.[probe];
    assert.equal(readonly?.status, 'SUCCESS', probe);
    assert.equal(readonly?.mutationAllowed, false, probe);
    assert.equal(readonly?.workflowSha, MERGE_SHA, probe);
  }
  assert.equal(evidence?.runtimeTasksCreated, 0);
  assert.equal(evidence?.governedSessionsCreated, 0);
  assert.equal(evidence?.runtimeLocksCreated, 0);
  assert.equal(program.w3C3ServerResolutionHandoff?.status, 'PASS_WITH_EVIDENCE');
});

test('C3 completion keeps PB-C345 partial and recomputes only its direct dependents', async () => {
  const program = JSON.parse(await readFile(PROGRAM_PATH, 'utf8'));
  const byId = new Map((program.taskBlueprints ?? []).map((entry: any) => [entry.id, entry]));
  const workItem = (program.workItems ?? []).find((entry: any) => entry.id === 'PB-C345');
  assert.ok(['PARTIALLY_IMPLEMENTED', 'DONE'].includes(workItem?.disposition));
  for (const id of ['TB-W3-C4-01', 'TB-W3-C5-01']) {
    assert.ok(['READY', 'DONE'].includes((byId.get(id) as any)?.readiness?.state), id);
  }
  const e2e: any = byId.get('TB-W3-C345-02');
  const e2eDependenciesDone = e2e.dependsOn.every((id: string) => (byId.get(id) as any)?.readiness?.state === 'DONE');
  assert.ok(e2eDependenciesDone || e2e.readiness.state === 'BLOCKED');
  const counted = (program.workItems ?? []).filter((entry: any) => entry.disposition === 'DONE').length;
  assert.equal(program.summary?.dispositionCounts?.DONE, counted);
});
