import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const PROGRAM_PATH = 'docs/governance/program-backlog-convergence.json';
const MERGE_SHA = '02f2da91741da4ff36eea3f138b00155ff49bad7';

test('TB-W4-G3-01 is DONE only with exact-head, deploy and read-only attestation evidence', async () => {
  const program = JSON.parse(await readFile(PROGRAM_PATH, 'utf8'));
  const byId = new Map((program.taskBlueprints ?? []).map((entry: any) => [entry.id, entry]));
  const blueprint: any = byId.get('TB-W4-G3-01');
  const evidence = blueprint?.completionEvidence;

  assert.equal(blueprint?.readiness?.state, 'DONE');
  assert.equal(evidence?.pullRequest, 218);
  assert.equal(evidence?.redHeadSha, '3d457e21751fc22288787e704cc2f650ae935d2d');
  assert.equal(evidence?.candidateHeadSha, '603bd4810902402da408aa4ffb736a814da26cb5');
  assert.equal(evidence?.prCiRunId, 36941087506);
  assert.equal(evidence?.mergeSha, MERGE_SHA);
  assert.equal(evidence?.mainCiRunId, 36941224841);
  assert.equal(evidence?.governedDeployRunId, 36941224817);
  assert.equal(evidence?.governedDeployRuntimeRevision, MERGE_SHA);

  for (const probe of ['mcp_git_status', 'docker_status']) {
    const readonly = evidence?.readonlyEvidence?.[probe];
    assert.equal(readonly?.status, 'SUCCESS', probe);
    assert.equal(readonly?.mutationAllowed, false, probe);
    assert.equal(readonly?.workflowSha, MERGE_SHA, probe);
    assert.ok(Number.isSafeInteger(readonly?.runId) && readonly.runId > 0, probe);
  }
  assert.equal(evidence?.runtimeTasksCreated, 0);
  assert.equal(evidence?.runtimeLocksCreated, 0);
  assert.equal(program.w4G3ToolSurfaceHandoff?.status, 'PASS_WITH_EVIDENCE');

  const workItem = (program.workItems ?? []).find((entry: any) => entry.id === 'PB-G3');
  assert.equal(workItem?.disposition, 'DONE');
  const counted = (program.workItems ?? []).filter((entry: any) => entry.disposition === 'DONE').length;
  assert.equal(program.summary?.dispositionCounts?.DONE, counted);
});
