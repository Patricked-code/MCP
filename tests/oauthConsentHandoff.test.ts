import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const PROGRAM_PATH = 'docs/governance/program-backlog-convergence.json';
const MERGE_SHA = '2febc46dda1ddfbe275658957ebfd8c5bdbc7128';

test('TB-W3-OAUTH-CONSENT-01 is DONE only with exact-head, deploy and read-only attestation evidence', async () => {
  const program = JSON.parse(await readFile(PROGRAM_PATH, 'utf8'));
  const blueprint = (program.taskBlueprints ?? []).find(
    (entry: any) => entry.id === 'TB-W3-OAUTH-CONSENT-01'
  );
  const evidence = blueprint?.completionEvidence;

  assert.equal(blueprint?.readiness?.state, 'DONE');
  assert.equal(evidence?.pullRequest, 208);
  assert.equal(evidence?.candidateHeadSha, 'ee78ec1cecea5d21de9f2fbccfdfaa5a53140945');
  assert.equal(evidence?.redHeadSha, 'de1d079bf850f4401dd75d6bdab76442754c0aa5');
  assert.equal(evidence?.prCiRunId, 36905443559);
  assert.equal(evidence?.mergeSha, MERGE_SHA);
  assert.equal(evidence?.mainCiRunId, 36905634628);
  assert.equal(evidence?.governedDeployRunId, 36905634643);
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

  const workItem = (program.workItems ?? []).find((entry: any) => entry.id === 'PB-OAUTH-CONSENT');
  assert.equal(workItem?.disposition, 'DONE');
});
