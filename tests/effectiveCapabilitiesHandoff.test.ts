import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const PROGRAM_PATH = 'docs/governance/program-backlog-convergence.json';
const MERGE_SHA = '1e4b78fd0c7958d4a1b6becc8a9f59f320836e5a';

test('TB-W3-D2-01 is DONE only with exact-head, deploy and read-only attestation evidence', async () => {
  const program = JSON.parse(await readFile(PROGRAM_PATH, 'utf8'));
  const byId = new Map((program.taskBlueprints ?? []).map((entry: any) => [entry.id, entry]));
  const blueprint: any = byId.get('TB-W3-D2-01');
  const evidence = blueprint?.completionEvidence;

  assert.equal(blueprint?.readiness?.state, 'DONE');
  assert.equal(evidence?.pullRequest, 246);
  assert.equal(evidence?.contract, 'GW-11');
  assert.equal(evidence?.projection, 'GovernedOperationalContext.effectiveCapabilities');
  assert.equal(evidence?.redHeadSha, '699aaadffa0ab8dd43a076c9c79c3c089e8b1221');
  assert.equal(evidence?.candidateHeadSha, '28c1e0ca82892c20db731c050f68f1d8be2a50f8');
  assert.equal(evidence?.prCiRunId, 37286750114);
  assert.equal(evidence?.mergeSha, MERGE_SHA);
  assert.equal(evidence?.mainCiRunId, 37286964026);
  assert.equal(evidence?.governedDeployRunId, 37286964083);
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
  assert.equal(program.w3D2EffectiveCapabilitiesHandoff?.status, 'PASS_WITH_EVIDENCE');
});

test('D2 completion carries attested authorization and capability-aware eligibility, and releases its consumers', async () => {
  const program = JSON.parse(await readFile(PROGRAM_PATH, 'utf8'));
  const byId = new Map((program.taskBlueprints ?? []).map((entry: any) => [entry.id, entry]));
  const handoff = program.w3D2EffectiveCapabilitiesHandoff;

  // Evidence and evolutions without an authority are never dropped silently.
  const carried = Object.fromEntries((handoff?.notObserved ?? []).map((entry: any) => [entry.evidence, entry.carriedBy]));
  assert.deepEqual(carried, { AUTHORIZATION_ATTESTATION: ['TB-W3-OAUTH-WRITE-SCOPE-01'] });
  const deferred = Object.fromEntries((handoff?.deferred ?? []).map((entry: any) => [entry.evolution, entry.carriedBy]));
  assert.deepEqual(deferred, { CAPABILITY_AWARE_DISPATCH_ELIGIBILITY: ['TB-W3-OAUTH-WRITE-SCOPE-01'] });
  const oauth: any = byId.get('TB-W3-OAUTH-WRITE-SCOPE-01');
  assert.ok(oauth.greenAcceptance.some((line: string) => /AUTHORIZATION_UNATTESTED/.test(line)));
  assert.ok(oauth.greenAcceptance.some((line: string) => /Capability-aware dispatch eligibility/.test(line)));

  // Every PB-D2 blueprint is DONE: the work item closes and its consumers become planning-ready.
  const lots = (program.taskBlueprints ?? []).filter((entry: any) => entry.workItemId === 'PB-D2');
  assert.deepEqual(lots.map((entry: any) => entry.id), ['TB-W3-D2-01']);
  assert.ok(lots.every((entry: any) => entry.readiness.state === 'DONE'));
  const workItem = (program.workItems ?? []).find((entry: any) => entry.id === 'PB-D2');
  assert.equal(workItem?.disposition, 'DONE');
  for (const id of ['TB-W3-D3-01', 'TB-W3-PRW-01', 'TB-W3-PRW-02']) {
    const consumer: any = byId.get(id);
    assert.ok(consumer.dependsOn.every((dependency: string) => (byId.get(dependency) as any)?.readiness?.state === 'DONE'), id);
    assert.ok(['READY', 'DONE'].includes(consumer.readiness.state), id);
  }
  const counted = (program.workItems ?? []).filter((entry: any) => entry.disposition === 'DONE').length;
  assert.equal(program.summary?.dispositionCounts?.DONE, counted);
});
