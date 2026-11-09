import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const PROGRAM_PATH = 'docs/governance/program-backlog-convergence.json';
const MERGE_SHA = '4654c9edb57e37806eb9783f2b5d863301b50d01';

test('TB-W3-C4-01 is DONE only with exact-head, deploy and read-only attestation evidence', async () => {
  const program = JSON.parse(await readFile(PROGRAM_PATH, 'utf8'));
  const byId = new Map((program.taskBlueprints ?? []).map((entry: any) => [entry.id, entry]));
  const blueprint: any = byId.get('TB-W3-C4-01');
  const evidence = blueprint?.completionEvidence;

  assert.equal(blueprint?.readiness?.state, 'DONE');
  assert.equal(evidence?.pullRequest, 238);
  assert.equal(evidence?.redHeadSha, '5957c6977d7bbb5b825bc27590399b45f85416bb');
  assert.equal(evidence?.candidateHeadSha, '130a839d94eeacd521b9dde41ac75fba19c9215f');
  assert.equal(evidence?.prCiRunId, 37242618489);
  assert.equal(evidence?.mergeSha, MERGE_SHA);
  assert.equal(evidence?.mainCiRunId, 37242741995);
  assert.equal(evidence?.governedDeployRunId, 37242742016);
  assert.equal(evidence?.governedDeployRuntimeRevision, MERGE_SHA);
  assert.equal(evidence?.contract, 'GW-08');
  for (const probe of ['mcp_git_status', 'docker_status']) {
    const readonly = evidence?.readonlyEvidence?.[probe];
    assert.equal(readonly?.status, 'SUCCESS', probe);
    assert.equal(readonly?.mutationAllowed, false, probe);
    assert.equal(readonly?.workflowSha, MERGE_SHA, probe);
  }
  assert.equal(evidence?.runtimeTasksCreated, 0);
  assert.equal(evidence?.governedSessionsCreated, 0);
  assert.equal(evidence?.runtimeLocksCreated, 0);
  assert.equal(program.w3C4RuntimeResolutionHandoff?.status, 'PASS_WITH_EVIDENCE');
});

test('C4 completion carries its unobserved ingress residual into the project reality acceptance', async () => {
  const program = JSON.parse(await readFile(PROGRAM_PATH, 'utf8'));
  const byId = new Map((program.taskBlueprints ?? []).map((entry: any) => [entry.id, entry]));
  const handoff = program.w3C4RuntimeResolutionHandoff;

  // Ports and reverse proxy have no runtime observation authority: never dropped silently.
  assert.deepEqual(handoff?.notObserved?.map((entry: any) => entry.evidence), ['PORT_BINDINGS', 'REVERSE_PROXY']);
  for (const entry of handoff.notObserved) assert.equal(entry.carriedBy, 'TB-W3-C345-02');
  const acceptance: any = byId.get('TB-W3-C345-02');
  assert.ok(acceptance.greenAcceptance.some((line: string) => /reverse proxy/i.test(line) && /port/i.test(line)));
  assert.ok(['BLOCKED', 'READY', 'DONE'].includes(acceptance.readiness.state));

  const workItem = (program.workItems ?? []).find((entry: any) => entry.id === 'PB-C345');
  assert.ok(['PARTIALLY_IMPLEMENTED', 'DONE'].includes(workItem?.disposition));
  assert.ok(['READY', 'DONE'].includes((byId.get('TB-W3-C5-01') as any)?.readiness?.state));
  const e2eDependenciesDone = acceptance.dependsOn.every((id: string) => (byId.get(id) as any)?.readiness?.state === 'DONE');
  assert.ok(e2eDependenciesDone || acceptance.readiness.state === 'BLOCKED');
  const counted = (program.workItems ?? []).filter((entry: any) => entry.disposition === 'DONE').length;
  assert.equal(program.summary?.dispositionCounts?.DONE, counted);
});
