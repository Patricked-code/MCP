import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const PROGRAM_PATH = 'docs/governance/program-backlog-convergence.json';
const MERGE_SHA = '90df50b2497cdc17eb01a60c9223ca06fc715893';

test('TB-W4-G1-01 is DONE only with exact-head, deploy and read-only attestation evidence', async () => {
  const program = JSON.parse(await readFile(PROGRAM_PATH, 'utf8'));
  const byId = new Map((program.taskBlueprints ?? []).map((entry: any) => [entry.id, entry]));
  const blueprint: any = byId.get('TB-W4-G1-01');
  const evidence = blueprint?.completionEvidence;

  assert.equal(blueprint?.readiness?.state, 'DONE');
  assert.equal(evidence?.pullRequest, 213);
  assert.equal(evidence?.redHeadSha, 'a8fad7ce0154ea7dd1ff2a10d2968200a596412b');
  assert.equal(evidence?.candidateHeadSha, '4d8009bbb9ba15fc04902a7ee859e7b7fdcacb46');
  assert.equal(evidence?.prCiRunId, 36909784123);
  assert.equal(evidence?.mergeSha, MERGE_SHA);
  assert.equal(evidence?.mainCiRunId, 36909975085);
  assert.equal(evidence?.governedDeployRunId, 36909975077);
  assert.equal(evidence?.governedDeployRuntimeRevision, MERGE_SHA);

  for (const probe of ['mcp_git_status', 'docker_status']) {
    const readonly = evidence?.readonlyEvidence?.[probe];
    assert.equal(readonly?.status, 'SUCCESS', probe);
    assert.equal(readonly?.mutationAllowed, false, probe);
    assert.equal(readonly?.workflowSha, MERGE_SHA, probe);
  }
  assert.equal(evidence?.runtimeTasksCreated, 0);
  assert.equal(evidence?.runtimeLocksCreated, 0);

  assert.equal(byId.get('TB-W4-G2-01')?.readiness?.state, 'READY');
  assert.equal(program.w4G1PresenceHandoff?.status, 'PASS_WITH_EVIDENCE');
});
