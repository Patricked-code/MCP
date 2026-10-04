import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const PROGRAM_PATH = 'docs/governance/program-backlog-convergence.json';
const MERGE_SHA = '870305fc814773d8fb10f0a4fc2480a74885e46f';

test('TB-W3-DISPATCH-02 is DONE only with exact-head, deploy and read-only attestation evidence', async () => {
  const program = JSON.parse(await readFile(PROGRAM_PATH, 'utf8'));
  const byId = new Map((program.taskBlueprints ?? []).map((entry: any) => [entry.id, entry]));
  const blueprint: any = byId.get('TB-W3-DISPATCH-02');
  const evidence = blueprint?.completionEvidence;

  assert.equal(blueprint?.readiness?.state, 'DONE');
  assert.equal(evidence?.pullRequest, 229);
  assert.equal(evidence?.intake, 222);
  assert.equal(evidence?.redHeadSha, 'fd1bfdd507b0a60954f8bfd2063a7d02561f2c9b');
  assert.equal(evidence?.candidateHeadSha, '95783727c9c18ee48846a02d4a4d1a1b1aad8af3');
  assert.equal(evidence?.prCiRunId, 37221364113);
  assert.equal(evidence?.mergeSha, MERGE_SHA);
  assert.equal(evidence?.mainCiRunId, 37221468356);
  assert.equal(evidence?.governedDeployRunId, 37221468346);
  assert.equal(evidence?.governedDeployRuntimeRevision, MERGE_SHA);
  assert.equal(evidence?.tool, 'mcp_claim_next_governed_task');
  for (const probe of ['mcp_git_status', 'docker_status']) {
    const readonly = evidence?.readonlyEvidence?.[probe];
    assert.equal(readonly?.status, 'SUCCESS', probe);
    assert.equal(readonly?.mutationAllowed, false, probe);
    assert.equal(readonly?.workflowSha, MERGE_SHA, probe);
  }
  assert.equal(evidence?.runtimeTasksCreated, 0);
  assert.equal(evidence?.runtimeLocksCreated, 0);

  assert.equal(program.w3DispatchResumeClaimHandoff?.status, 'PASS_WITH_EVIDENCE');
  const workItem = (program.workItems ?? []).find((entry: any) => entry.id === 'PB-DISPATCH');
  assert.equal(workItem?.disposition, 'PARTIALLY_IMPLEMENTED');
  const counted = (program.workItems ?? []).filter((entry: any) => entry.disposition === 'DONE').length;
  assert.equal(program.summary?.dispositionCounts?.DONE, counted);
  assert.ok(['READY', 'DONE'].includes(byId.get('TB-W3-DISPATCH-03')?.readiness?.state));
});
