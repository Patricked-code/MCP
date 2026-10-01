import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const PROGRAM_PATH = 'docs/governance/program-backlog-convergence.json';
const MERGE_SHA = 'e21320990a4e8534f4c261b3bec6021417b4efb6';

test('TB-W4-G2-01 is DONE only with exact-head, deploy and read-only attestation evidence', async () => {
  const program = JSON.parse(await readFile(PROGRAM_PATH, 'utf8'));
  const byId = new Map((program.taskBlueprints ?? []).map((entry: any) => [entry.id, entry]));
  const blueprint: any = byId.get('TB-W4-G2-01');
  const evidence = blueprint?.completionEvidence;

  assert.equal(blueprint?.readiness?.state, 'DONE');
  assert.equal(evidence?.pullRequest, 215);
  assert.equal(evidence?.redHeadSha, 'b543c9e3f320b7df37b7c1ebf396b8f18de2fcf3');
  assert.equal(evidence?.candidateHeadSha, '15320ecc925aae36fafd56ee19d6a16cd6ad3a82');
  assert.equal(evidence?.prCiRunId, 36938833569);
  assert.equal(evidence?.mergeSha, MERGE_SHA);
  assert.equal(evidence?.mainCiRunId, 36938973433);
  assert.equal(evidence?.governedDeployRunId, 36938973474);
  assert.equal(evidence?.governedDeployRuntimeRevision, MERGE_SHA);

  for (const probe of ['mcp_git_status', 'docker_status']) {
    const readonly = evidence?.readonlyEvidence?.[probe];
    assert.equal(readonly?.status, 'SUCCESS', probe);
    assert.equal(readonly?.mutationAllowed, false, probe);
    assert.equal(readonly?.workflowSha, MERGE_SHA, probe);
  }
  assert.equal(evidence?.runtimeTasksCreated, 0);
  assert.equal(evidence?.runtimeLocksCreated, 0);

  assert.ok(['READY', 'DONE'].includes(byId.get('TB-W4-G3-01')?.readiness?.state));
  assert.equal(program.w4G2PresenceHandoff?.status, 'PASS_WITH_EVIDENCE');

  const workItem = (program.workItems ?? []).find((entry: any) => entry.id === 'PB-G12');
  assert.equal(workItem?.disposition, 'DONE');
  const counted = (program.workItems ?? []).filter((entry: any) => entry.disposition === 'DONE').length;
  assert.equal(program.summary?.dispositionCounts?.DONE, counted);
});
