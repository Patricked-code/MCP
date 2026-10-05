import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const PROGRAM_PATH = 'docs/governance/program-backlog-convergence.json';
const MERGE_SHA = '61b90a1eca532b088ec213b7ae6ad9e2241eece4';

test('TB-W3-E3-01 is DONE only with exact-head, deploy and read-only attestation evidence', async () => {
  const program = JSON.parse(await readFile(PROGRAM_PATH, 'utf8'));
  const byId = new Map((program.taskBlueprints ?? []).map((entry: any) => [entry.id, entry]));
  const blueprint: any = byId.get('TB-W3-E3-01');
  const evidence = blueprint?.completionEvidence;

  assert.equal(blueprint?.readiness?.state, 'DONE');
  assert.equal(evidence?.pullRequest, 255);
  assert.deepEqual(evidence?.surfaces, ['/github/connect', '/git/connect']);
  assert.deepEqual(evidence?.consents, ['REPLACE_GITHUB_CREDENTIAL', 'ADD_DISCOVERED_MAPPINGS']);
  assert.equal(evidence?.redHeadSha, '3444400f3f1b0acf4201402c84e9f59b1003e2d7');
  assert.equal(evidence?.redCiRunId, 37359005082);
  assert.equal(evidence?.candidateHeadSha, '855e2954a912d98ad136f5ab0c6e229eda6c56a5');
  assert.equal(evidence?.prCiRunId, 37359371129);
  assert.equal(evidence?.testCount, 935);
  assert.equal(evidence?.mergeSha, MERGE_SHA);
  assert.equal(evidence?.governedDeployRuntimeRevision, MERGE_SHA);
  assert.ok(Number.isSafeInteger(evidence?.mainCiRunId));
  assert.ok(Number.isSafeInteger(evidence?.governedDeployRunId));
  for (const probe of ['mcp_git_status', 'docker_status']) {
    const readonly = evidence?.readonlyEvidence?.[probe];
    assert.equal(readonly?.status, 'SUCCESS', probe);
    assert.equal(readonly?.mutationAllowed, false, probe);
    assert.equal(readonly?.workflowSha, MERGE_SHA, probe);
  }
  assert.equal(evidence?.runtimeTasksCreated, 0);
  assert.equal(evidence?.governedSessionsCreated, 0);
  assert.equal(evidence?.runtimeLocksCreated, 0);
  assert.equal(program.w3E3ConsentHandoff?.status, 'PASS_WITH_EVIDENCE');
  assert.equal(program.w3E3ConsentHandoff?.observedMainSha, MERGE_SHA);
});

test('E3 completes PB-E, hands its consent to provisioning and releases its consumers', async () => {
  const program = JSON.parse(await readFile(PROGRAM_PATH, 'utf8'));
  const byId = new Map((program.taskBlueprints ?? []).map((entry: any) => [entry.id, entry]));

  // Every PB-E blueprint is DONE: the work item closes.
  const lots = (program.taskBlueprints ?? []).filter((entry: any) => entry.workItemId === 'PB-E');
  assert.deepEqual(lots.map((entry: any) => entry.id), ['TB-W3-E1-01', 'TB-W3-E2-01', 'TB-W3-E3-01']);
  assert.ok(lots.every((entry: any) => entry.readiness.state === 'DONE'));
  const workItem = (program.workItems ?? []).find((entry: any) => entry.id === 'PB-E');
  assert.equal(workItem?.disposition, 'DONE');
  const counted = (program.workItems ?? []).filter((entry: any) => entry.disposition === 'DONE').length;
  assert.equal(program.summary?.dispositionCounts?.DONE, counted);

  // Provisioning reuses the E3 consent; consumers whose dependencies are DONE become planning-ready.
  const provisioning: any = byId.get('TB-W3-F-01');
  assert.ok(provisioning.greenAcceptance.some((line: string) => /reuses the E3 consent/.test(line)));
  for (const id of ['TB-W3-F-01', 'TB-W3-GGCC-GH-RULESETS', 'TB-W3-GGCC-GH-WEBHOOKS', 'TB-W3-GGCC-GH-ENV-VARS-SECRETS', 'TB-W3-GGCC-GH-ORG']) {
    const consumer: any = byId.get(id);
    assert.ok(consumer.dependsOn.every((dependency: string) => (byId.get(dependency) as any)?.readiness?.state === 'DONE'), id);
    assert.ok(['READY', 'DONE'].includes(consumer.readiness.state), id);
  }
  assert.ok((program.w3E3ConsentHandoff?.knownLimitations ?? []).some((line: string) => /10-minute/.test(line)));
});
