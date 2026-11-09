import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const PROGRAM_PATH = 'docs/governance/program-backlog-convergence.json';
const MERGE_SHA = '93d631e5dbc61354047f0847b96d23d5cb23ba21';

test('TB-W3-B3-02 is DONE only with exact-head, deploy and read-only attestation evidence', async () => {
  const program = JSON.parse(await readFile(PROGRAM_PATH, 'utf8'));
  const byId = new Map((program.taskBlueprints ?? []).map((entry: any) => [entry.id, entry]));
  const blueprint: any = byId.get('TB-W3-B3-02');
  const evidence = blueprint?.completionEvidence;

  assert.equal(blueprint?.readiness?.state, 'DONE');
  assert.equal(evidence?.pullRequest, 225);
  assert.equal(evidence?.decisionSource, 'issue:220');
  assert.equal(evidence?.redHeadSha, '5f14005b6cb5cb99f3f0dddc30e63730a666c428');
  assert.equal(evidence?.candidateHeadSha, '2d3d6ab4cae9ba65d80bab52066da2f8ddd84f14');
  assert.equal(evidence?.prCiRunId, 37219464215);
  assert.equal(evidence?.mergeSha, MERGE_SHA);
  assert.equal(evidence?.mainCiRunId, 37219562852);
  assert.equal(evidence?.governedDeployRunId, 37219562851);
  assert.equal(evidence?.governedDeployRuntimeRevision, MERGE_SHA);
  for (const probe of ['mcp_git_status', 'docker_status']) {
    const readonly = evidence?.readonlyEvidence?.[probe];
    assert.equal(readonly?.status, 'SUCCESS', probe);
    assert.equal(readonly?.mutationAllowed, false, probe);
    assert.equal(readonly?.workflowSha, MERGE_SHA, probe);
  }
  assert.equal(evidence?.operatorTargetConfiguredOnMain, false);
  assert.equal(evidence?.runtimeTasksCreated, 0);
  assert.equal(evidence?.runtimeLocksCreated, 0);

  assert.equal(program.w3B3TargetScopeHandoff?.status, 'PASS_WITH_EVIDENCE');
  const workItem = (program.workItems ?? []).find((entry: any) => entry.id === 'PB-B3');
  assert.equal(workItem?.disposition, 'DONE');
  const counted = (program.workItems ?? []).filter((entry: any) => entry.disposition === 'DONE').length;
  assert.equal(program.summary?.dispositionCounts?.DONE, counted);

  for (const id of ['TB-W3-DISPATCH-01', 'TB-W3-C3-01', 'TB-W3-GGCC-GIT-READ']) {
    assert.ok(['READY', 'DONE'].includes(byId.get(id)?.readiness?.state), id);
  }
  const intake = (program.programIntakes ?? []).find((entry: any) => entry.issue === 220);
  assert.equal(intake?.completionEvidence?.mergeSha, MERGE_SHA);
});
