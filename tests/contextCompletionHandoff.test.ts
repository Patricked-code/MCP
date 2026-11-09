import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const PROGRAM_PATH = 'docs/governance/program-backlog-convergence.json';
const MERGE_SHA = 'e51e9958b211186560b2054595fe7bc3fc564d19';

test('TB-W3-E2-01 is DONE only with exact-head, deploy and read-only attestation evidence', async () => {
  const program = JSON.parse(await readFile(PROGRAM_PATH, 'utf8'));
  const byId = new Map((program.taskBlueprints ?? []).map((entry: any) => [entry.id, entry]));
  const blueprint: any = byId.get('TB-W3-E2-01');
  const evidence = blueprint?.completionEvidence;

  assert.equal(blueprint?.readiness?.state, 'DONE');
  assert.equal(evidence?.pullRequest, 253);
  assert.equal(evidence?.projection, 'GovernedOperationalContext.contextCompletion');
  assert.deepEqual(evidence?.surfaces, ['/login', '/git', '/github']);
  assert.equal(evidence?.redHeadSha, 'a5e018614be21ed1db348c6ecb0eee2bcae45f54');
  assert.equal(evidence?.redCiRunId, 37356773083);
  assert.equal(evidence?.candidateHeadSha, 'ec6f47342d9b7bd7b5c83f56478f112c6bb795b6');
  assert.equal(evidence?.prCiRunId, 37357705265);
  assert.equal(evidence?.testCount, 928);
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
  assert.equal(program.w3E2ContextCompletionHandoff?.status, 'PASS_WITH_EVIDENCE');
  assert.equal(program.w3E2ContextCompletionHandoff?.observedMainSha, MERGE_SHA);
});

test('E2 completion hands creations and mutations to explicit consent and releases E3', async () => {
  const program = JSON.parse(await readFile(PROGRAM_PATH, 'utf8'));
  const byId = new Map((program.taskBlueprints ?? []).map((entry: any) => [entry.id, entry]));
  const handoff = program.w3E2ContextCompletionHandoff;

  // E2 creates nothing: consent for any creation or mutation is carried, never dropped.
  const deferred = Object.fromEntries((handoff?.deferred ?? []).map((entry: any) => [entry.capability, entry.carriedBy]));
  assert.deepEqual(deferred, { EXPLICIT_CONSENT_BEFORE_CREATION_OR_MUTATION: ['TB-W3-E3-01'] });
  assert.ok((handoff?.knownLimitations ?? []).some((line: string) => /no principal/.test(line)));

  const consent: any = byId.get('TB-W3-E3-01');
  assert.ok(consent.greenAcceptance.some((line: string) => /E2 completion/.test(line) && /explicit consent/.test(line)));
  assert.ok(consent.dependsOn.every((dependency: string) => (byId.get(dependency) as any)?.readiness?.state === 'DONE'));
  assert.ok(['READY', 'DONE'].includes(consent.readiness.state));

  // PB-E stays partially implemented until E3 is DONE, then closes.
  const workItem = (program.workItems ?? []).find((entry: any) => entry.id === 'PB-E');
  assert.equal(workItem?.disposition, consent.readiness.state === 'DONE' ? 'DONE' : 'PARTIALLY_IMPLEMENTED');
  assert.match(workItem?.nextAction ?? '', /E3/);
  const counted = (program.workItems ?? []).filter((entry: any) => entry.disposition === 'DONE').length;
  assert.equal(program.summary?.dispositionCounts?.DONE, counted);
});
