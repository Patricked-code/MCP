import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const PROGRAM_PATH = 'docs/governance/program-backlog-convergence.json';
const MERGE_SHA = '4dcc90d4296e380574acd0da68001b586992d5b5';

test('TB-W3-E1-01 is DONE only with exact-head, deploy and read-only attestation evidence', async () => {
  const program = JSON.parse(await readFile(PROGRAM_PATH, 'utf8'));
  const byId = new Map((program.taskBlueprints ?? []).map((entry: any) => [entry.id, entry]));
  const blueprint: any = byId.get('TB-W3-E1-01');
  const evidence = blueprint?.completionEvidence;

  assert.equal(blueprint?.readiness?.state, 'DONE');
  assert.equal(evidence?.pullRequest, 251);
  assert.equal(evidence?.projection, 'GovernedOperationalContext.missingContext');
  assert.equal(evidence?.redHeadSha, 'b08dca3bec321eac3c8713433a37b8d366d6aadf');
  assert.equal(evidence?.redCiRunId, 37320386619);
  assert.equal(evidence?.candidateHeadSha, '33803ec191dbbe92fca726017cb7ffc1b2c9f3d6');
  assert.equal(evidence?.prCiRunId, 37321306246);
  assert.equal(evidence?.testCount, 917);
  assert.equal(evidence?.mergeSha, MERGE_SHA);
  assert.equal(evidence?.mainCiRunId, 37321550003);
  assert.equal(evidence?.governedDeployRunId, 37321550025);
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
  assert.equal(program.w3E1MissingContextHandoff?.status, 'PASS_WITH_EVIDENCE');
  assert.equal(program.w3E1MissingContextHandoff?.observedMainSha, MERGE_SHA);
});

test('E1 completion carries scoped-session inputs and hands the gap to the guided completion', async () => {
  const program = JSON.parse(await readFile(PROGRAM_PATH, 'utf8'));
  const byId = new Map((program.taskBlueprints ?? []).map((entry: any) => [entry.id, entry]));
  const handoff = program.w3E1MissingContextHandoff;

  // Evidence without an observation authority is never dropped silently.
  const carried = Object.fromEntries((handoff?.notObserved ?? []).map((entry: any) => [entry.evidence, entry.carriedBy]));
  assert.deepEqual(carried, { TARGET_SCOPE_MISSING_CONTEXT: ['TB-W3-GGCC-GH-REPO-BRANCH'] });
  const repoBranch: any = byId.get('TB-W3-GGCC-GH-REPO-BRANCH');
  assert.ok(repoBranch.greenAcceptance.some((line: string) => /UNOBSERVABLE/.test(line) && /TB-W3-E1-01/.test(line)));
  const deferred = Object.fromEntries((handoff?.deferred ?? []).map((entry: any) => [entry.capability, entry.carriedBy]));
  assert.deepEqual(deferred, { GUIDED_COMPLETION_AND_EXPLICIT_CONSENT: ['TB-W3-E2-01', 'TB-W3-E3-01'] });

  // E2 consumes the detection: it asks only for the surfaced gap, never for known context.
  const wizard: any = byId.get('TB-W3-E2-01');
  assert.ok(wizard.greenAcceptance.some((line: string) => /missingContext/.test(line) && /BLOCKED_UPSTREAM/.test(line)));
  assert.ok(wizard.dependsOn.every((dependency: string) => (byId.get(dependency) as any)?.readiness?.state === 'DONE'));
  assert.ok(['READY', 'DONE'].includes(wizard.readiness.state));
  // E3 waits for E2: it stays BLOCKED until the guided completion is DONE.
  const consent: any = byId.get('TB-W3-E3-01');
  assert.deepEqual(consent.dependsOn, ['TB-W3-E2-01']);
  if (wizard.readiness.state !== 'DONE') assert.equal(consent.readiness.state, 'BLOCKED');

  // PB-E is partially implemented until E2 and E3 are DONE, then closes.
  const workItem = (program.workItems ?? []).find((entry: any) => entry.id === 'PB-E');
  const closed = wizard.readiness.state === 'DONE' && consent.readiness.state === 'DONE';
  assert.equal(workItem?.disposition, closed ? 'DONE' : 'PARTIALLY_IMPLEMENTED');
  const counted = (program.workItems ?? []).filter((entry: any) => entry.disposition === 'PARTIALLY_IMPLEMENTED').length;
  assert.equal(program.summary?.dispositionCounts?.PARTIALLY_IMPLEMENTED, counted);
  assert.equal(program.summary?.dispositionCounts?.DONE, (program.workItems ?? []).filter((entry: any) => entry.disposition === 'DONE').length);
});
