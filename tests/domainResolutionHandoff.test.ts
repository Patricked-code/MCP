import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const PROGRAM_PATH = 'docs/governance/program-backlog-convergence.json';
const MERGE_SHA = '9131bd8c2983377a62afbdb559bc3cf2392f1b5d';

test('TB-W3-C5-01 is DONE only with exact-head, deploy and read-only attestation evidence', async () => {
  const program = JSON.parse(await readFile(PROGRAM_PATH, 'utf8'));
  const byId = new Map((program.taskBlueprints ?? []).map((entry: any) => [entry.id, entry]));
  const blueprint: any = byId.get('TB-W3-C5-01');
  const evidence = blueprint?.completionEvidence;

  assert.equal(blueprint?.readiness?.state, 'DONE');
  assert.equal(evidence?.pullRequest, 240);
  assert.equal(evidence?.redHeadSha, 'b02b58e03b8c6ad6f7cf91cb102d43678f74aa83');
  assert.equal(evidence?.candidateHeadSha, '12dda80aa3bbb6f3097a9aa1be3a4f5ba8b932ba');
  assert.equal(evidence?.prCiRunId, 37259206625);
  assert.equal(evidence?.mergeSha, MERGE_SHA);
  assert.equal(evidence?.mainCiRunId, 37259332125);
  assert.equal(evidence?.governedDeployRunId, 37259332214);
  assert.equal(evidence?.governedDeployRuntimeRevision, MERGE_SHA);
  assert.equal(evidence?.contract, 'GW-09');
  for (const probe of ['mcp_git_status', 'docker_status']) {
    const readonly = evidence?.readonlyEvidence?.[probe];
    assert.equal(readonly?.status, 'SUCCESS', probe);
    assert.equal(readonly?.mutationAllowed, false, probe);
    assert.equal(readonly?.workflowSha, MERGE_SHA, probe);
  }
  assert.equal(evidence?.runtimeTasksCreated, 0);
  assert.equal(evidence?.governedSessionsCreated, 0);
  assert.equal(evidence?.runtimeLocksCreated, 0);
  assert.equal(program.w3C5DomainResolutionHandoff?.status, 'PASS_WITH_EVIDENCE');
});

test('C5 completion carries its unobserved domain residual and releases the project reality acceptance', async () => {
  const program = JSON.parse(await readFile(PROGRAM_PATH, 'utf8'));
  const byId = new Map((program.taskBlueprints ?? []).map((entry: any) => [entry.id, entry]));
  const handoff = program.w3C5DomainResolutionHandoff;

  // No domain observation authority exists in the runtime: never dropped silently.
  assert.deepEqual(handoff?.notObserved?.map((entry: any) => entry.evidence), ['DOMAIN_SERVING']);
  for (const entry of handoff.notObserved) {
    assert.deepEqual(entry.carriedBy, ['TB-W3-C345-02', 'TB-W4-I1-01']);
  }
  const acceptance: any = byId.get('TB-W3-C345-02');
  assert.ok(acceptance.greenAcceptance.some((line: string) => /domain observation/i.test(line)));
  // Both dependencies are DONE once C5 closes: the acceptance becomes planning-ready.
  assert.ok(acceptance.dependsOn.every((id: string) => (byId.get(id) as any)?.readiness?.state === 'DONE'));
  assert.ok(['READY', 'DONE'].includes(acceptance.readiness.state));

  const workItem = (program.workItems ?? []).find((entry: any) => entry.id === 'PB-C345');
  assert.ok(['PARTIALLY_IMPLEMENTED', 'DONE'].includes(workItem?.disposition));
  const counted = (program.workItems ?? []).filter((entry: any) => entry.disposition === 'DONE').length;
  assert.equal(program.summary?.dispositionCounts?.DONE, counted);
});
