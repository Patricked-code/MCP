import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const PROGRAM_PATH = 'docs/governance/program-backlog-convergence.json';
const MERGE_SHA = 'c5fc1d78ea4213791fa38ba67f3fcf4b7ed535d0';

test('TB-W3-DISPATCH-01 is DONE only with exact-head, deploy and read-only attestation evidence', async () => {
  const program = JSON.parse(await readFile(PROGRAM_PATH, 'utf8'));
  const byId = new Map((program.taskBlueprints ?? []).map((entry: any) => [entry.id, entry]));
  const blueprint: any = byId.get('TB-W3-DISPATCH-01');
  const evidence = blueprint?.completionEvidence;

  assert.equal(blueprint?.readiness?.state, 'DONE');
  assert.equal(evidence?.pullRequest, 227);
  assert.equal(evidence?.intake, 222);
  assert.equal(evidence?.redHeadSha, '63ebe385c263dd8b1e6720a7bd3f325833271b5d');
  assert.equal(evidence?.candidateHeadSha, '66bd5b768296217a195fc5119e3b778e87a2f348');
  assert.equal(evidence?.prCiRunId, 37220630483);
  assert.equal(evidence?.mergeSha, MERGE_SHA);
  assert.equal(evidence?.mainCiRunId, 37220729943);
  assert.equal(evidence?.governedDeployRunId, 37220729894);
  assert.equal(evidence?.governedDeployRuntimeRevision, MERGE_SHA);
  assert.equal(evidence?.tool, 'mcp_materialize_program_blueprint');
  for (const probe of ['mcp_git_status', 'docker_status']) {
    const readonly = evidence?.readonlyEvidence?.[probe];
    assert.equal(readonly?.status, 'SUCCESS', probe);
    assert.equal(readonly?.mutationAllowed, false, probe);
    assert.equal(readonly?.workflowSha, MERGE_SHA, probe);
  }
  assert.equal(evidence?.runtimeTasksCreated, 0);
  assert.equal(evidence?.runtimeLocksCreated, 0);

  assert.equal(program.w3DispatchMaterializationHandoff?.status, 'PASS_WITH_EVIDENCE');
  const workItem = (program.workItems ?? []).find((entry: any) => entry.id === 'PB-DISPATCH');
  assert.ok(['PARTIALLY_IMPLEMENTED', 'DONE'].includes(workItem?.disposition));
  const counted = (program.workItems ?? []).filter((entry: any) => entry.disposition === 'DONE').length;
  assert.equal(program.summary?.dispositionCounts?.DONE, counted);
  assert.ok(['READY', 'DONE'].includes(byId.get('TB-W3-DISPATCH-02')?.readiness?.state));
});
