import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const PROGRAM_PATH = 'docs/governance/program-backlog-convergence.json';
const MERGE_SHA = 'd4a98988b6e5327cb1b802a3d2099f634d29b82d';

test('TB-W3-C345-02 is DONE only with exact-head, deploy and read-only attestation evidence', async () => {
  const program = JSON.parse(await readFile(PROGRAM_PATH, 'utf8'));
  const byId = new Map((program.taskBlueprints ?? []).map((entry: any) => [entry.id, entry]));
  const blueprint: any = byId.get('TB-W3-C345-02');
  const evidence = blueprint?.completionEvidence;

  assert.equal(blueprint?.readiness?.state, 'DONE');
  assert.equal(evidence?.pullRequest, 242);
  assert.equal(evidence?.redHeadSha, '1556dfa82cdd330fc530d761da0b49ae7cbcf8a4');
  assert.equal(evidence?.candidateHeadSha, '9baa2da768c7f904a67bf74fe812092111045659');
  assert.equal(evidence?.prCiRunId, 37261237037);
  assert.equal(evidence?.mergeSha, MERGE_SHA);
  assert.equal(evidence?.mainCiRunId, 37261351989);
  assert.equal(evidence?.governedDeployRunId, 37261351824);
  assert.equal(evidence?.governedDeployRuntimeRevision, MERGE_SHA);
  assert.deepEqual(evidence?.contracts, ['GW-05', 'GW-06', 'GW-07', 'GW-08', 'GW-09']);
  for (const probe of ['mcp_git_status', 'docker_status']) {
    const readonly = evidence?.readonlyEvidence?.[probe];
    assert.equal(readonly?.status, 'SUCCESS', probe);
    assert.equal(readonly?.mutationAllowed, false, probe);
    assert.equal(readonly?.workflowSha, MERGE_SHA, probe);
  }
  assert.equal(evidence?.runtimeTasksCreated, 0);
  assert.equal(evidence?.governedSessionsCreated, 0);
  assert.equal(evidence?.runtimeLocksCreated, 0);
  assert.equal(program.w3C345ProjectRealityHandoff?.status, 'PASS_WITH_EVIDENCE');
});

test('C345-02 completion carries its unobserved residuals and releases governance inheritance', async () => {
  const program = JSON.parse(await readFile(PROGRAM_PATH, 'utf8'));
  const byId = new Map((program.taskBlueprints ?? []).map((entry: any) => [entry.id, entry]));
  const handoff = program.w3C345ProjectRealityHandoff;

  // Evidence without an observation authority is never dropped silently.
  const carried = Object.fromEntries((handoff?.notObserved ?? []).map((entry: any) => [entry.evidence, entry.carriedBy]));
  assert.deepEqual(carried, {
    INGRESS_LINK: ['TB-W4-I1-01'],
    TARGET_COMPONENT_EXACT_HEAD: ['TB-W3-GGCC-GIT-READ'],
    DOMAIN_SERVING: ['TB-W4-I1-01']
  });
  const monitor: any = byId.get('TB-W4-I1-01');
  assert.ok(monitor.greenAcceptance.some((line: string) => /INGRESS_OBSERVATION_UNAVAILABLE/.test(line)));
  const gitRead: any = byId.get('TB-W3-GGCC-GIT-READ');
  assert.ok(gitRead.greenAcceptance.some((line: string) => /TargetContext/.test(line)));

  // Every PB-C345 blueprint is DONE: the work item closes and D1 becomes planning-ready.
  const lots = (program.taskBlueprints ?? []).filter((entry: any) => entry.workItemId === 'PB-C345');
  assert.deepEqual(lots.map((entry: any) => entry.id).sort(), ['TB-W3-C3-01', 'TB-W3-C345-02', 'TB-W3-C4-01', 'TB-W3-C5-01']);
  assert.ok(lots.every((entry: any) => entry.readiness.state === 'DONE'));
  const workItem = (program.workItems ?? []).find((entry: any) => entry.id === 'PB-C345');
  assert.equal(workItem?.disposition, 'DONE');
  const inheritance: any = byId.get('TB-W3-D1-01');
  assert.ok(inheritance.dependsOn.every((id: string) => (byId.get(id) as any)?.readiness?.state === 'DONE'));
  assert.ok(['READY', 'DONE'].includes(inheritance.readiness.state));
  const counted = (program.workItems ?? []).filter((entry: any) => entry.disposition === 'DONE').length;
  assert.equal(program.summary?.dispositionCounts?.DONE, counted);
});
