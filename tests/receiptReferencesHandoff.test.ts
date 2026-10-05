import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const PROGRAM_PATH = 'docs/governance/program-backlog-convergence.json';
const MERGE_SHA = '7c9331695b034dea1c9f1fecfab775ff0e328358';

test('TB-W3-D3-01 is DONE only with exact-head, deploy and read-only attestation evidence', async () => {
  const program = JSON.parse(await readFile(PROGRAM_PATH, 'utf8'));
  const byId = new Map((program.taskBlueprints ?? []).map((entry: any) => [entry.id, entry]));
  const blueprint: any = byId.get('TB-W3-D3-01');
  const evidence = blueprint?.completionEvidence;

  assert.equal(blueprint?.readiness?.state, 'DONE');
  assert.equal(evidence?.pullRequest, 248);
  assert.equal(evidence?.contract, 'GW-12');
  assert.equal(evidence?.projection, 'BootstrapReceipt.references');
  assert.equal(evidence?.redHeadSha, 'fbcb140418968e173168094cf7d5fe75c8bd769c');
  assert.equal(evidence?.candidateHeadSha, '884414ff68b7e4b381f99252cab55f9cdaad7011');
  assert.equal(evidence?.prCiRunId, 37316739836);
  assert.equal(evidence?.mergeSha, MERGE_SHA);
  assert.equal(evidence?.mainCiRunId, 37317001429);
  assert.equal(evidence?.governedDeployRunId, 37317001064);
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
  assert.equal(program.w3D3ReceiptReferencesHandoff?.status, 'PASS_WITH_EVIDENCE');
});

test('D3 completion carries scoped-session references and releases its consumers', async () => {
  const program = JSON.parse(await readFile(PROGRAM_PATH, 'utf8'));
  const byId = new Map((program.taskBlueprints ?? []).map((entry: any) => [entry.id, entry]));
  const handoff = program.w3D3ReceiptReferencesHandoff;

  // Evidence without an observation authority is never dropped silently.
  const carried = Object.fromEntries((handoff?.notObserved ?? []).map((entry: any) => [entry.evidence, entry.carriedBy]));
  assert.deepEqual(carried, { TARGET_SCOPE_RECEIPT_REFERENCES: ['TB-W3-GGCC-GH-REPO-BRANCH'] });
  const repoBranch: any = byId.get('TB-W3-GGCC-GH-REPO-BRANCH');
  assert.ok(repoBranch.greenAcceptance.some((line: string) => /RECEIPT_REPOSITORY_UNVERIFIED/.test(line)));

  // Every PB-D3 blueprint is DONE: the work item closes and its consumers become planning-ready.
  const lots = (program.taskBlueprints ?? []).filter((entry: any) => entry.workItemId === 'PB-D3');
  assert.deepEqual(lots.map((entry: any) => entry.id), ['TB-W3-D3-01']);
  assert.ok(lots.every((entry: any) => entry.readiness.state === 'DONE'));
  const workItem = (program.workItems ?? []).find((entry: any) => entry.id === 'PB-D3');
  assert.equal(workItem?.disposition, 'DONE');
  for (const id of ['TB-W3-E1-01', 'TB-W4-H-01']) {
    const consumer: any = byId.get(id);
    assert.ok(consumer.dependsOn.every((dependency: string) => (byId.get(dependency) as any)?.readiness?.state === 'DONE'), id);
    assert.ok(['READY', 'DONE'].includes(consumer.readiness.state), id);
  }
  const counted = (program.workItems ?? []).filter((entry: any) => entry.disposition === 'DONE').length;
  assert.equal(program.summary?.dispositionCounts?.DONE, counted);
});
