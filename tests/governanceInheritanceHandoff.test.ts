import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const PROGRAM_PATH = 'docs/governance/program-backlog-convergence.json';
const MERGE_SHA = '87109f4153cea8d208c861e7ba456e617e3e4d24';

test('TB-W3-D1-01 is DONE only with exact-head, deploy and read-only attestation evidence', async () => {
  const program = JSON.parse(await readFile(PROGRAM_PATH, 'utf8'));
  const byId = new Map((program.taskBlueprints ?? []).map((entry: any) => [entry.id, entry]));
  const blueprint: any = byId.get('TB-W3-D1-01');
  const evidence = blueprint?.completionEvidence;

  assert.equal(blueprint?.readiness?.state, 'DONE');
  assert.equal(evidence?.pullRequest, 244);
  assert.equal(evidence?.contract, 'GW-10');
  assert.equal(evidence?.projection, 'GovernedOperationalContext.governanceInheritance');
  assert.equal(evidence?.redHeadSha, '15c0f88dd623f8d2af0918dc4c6edbbe0bcb5235');
  assert.equal(evidence?.candidateHeadSha, '57a5ef852c9412a8bb3447f3991b8921be7c8abf');
  assert.equal(evidence?.mergeSha, MERGE_SHA);
  assert.equal(evidence?.mainCiRunId, 37284001092);
  assert.equal(evidence?.governedDeployRunId, 37284001114);
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
  assert.equal(program.w3D1GovernanceInheritanceHandoff?.status, 'PASS_WITH_EVIDENCE');
});

test('D1 completion carries its unobserved residuals and releases effective capabilities', async () => {
  const program = JSON.parse(await readFile(PROGRAM_PATH, 'utf8'));
  const byId = new Map((program.taskBlueprints ?? []).map((entry: any) => [entry.id, entry]));
  const handoff = program.w3D1GovernanceInheritanceHandoff;

  // Governance without an observation authority is never dropped silently.
  const carried = Object.fromEntries((handoff?.notObserved ?? []).map((entry: any) => [entry.evidence, entry.carriedBy]));
  assert.deepEqual(carried, {
    TARGET_REPOSITORY_RULESETS: ['TB-W3-GGCC-GH-RULESETS'],
    GOVERNED_DEPLOY_CHANNEL: ['TB-W3-GGCC-GH-RELEASES-DEPLOYMENTS']
  });
  const rulesets: any = byId.get('TB-W3-GGCC-GH-RULESETS');
  assert.ok(rulesets.greenAcceptance.some((line: string) => /GOVERNANCE_RULESET_NOT_OBSERVED/.test(line)));
  const deployments: any = byId.get('TB-W3-GGCC-GH-RELEASES-DEPLOYMENTS');
  assert.ok(deployments.greenAcceptance.some((line: string) => /Governed Deploy/.test(line)));

  // Every PB-D1 blueprint is DONE: the work item closes and D2 becomes planning-ready.
  const lots = (program.taskBlueprints ?? []).filter((entry: any) => entry.workItemId === 'PB-D1');
  assert.deepEqual(lots.map((entry: any) => entry.id), ['TB-W3-D1-01']);
  assert.ok(lots.every((entry: any) => entry.readiness.state === 'DONE'));
  const workItem = (program.workItems ?? []).find((entry: any) => entry.id === 'PB-D1');
  assert.equal(workItem?.disposition, 'DONE');
  const capabilities: any = byId.get('TB-W3-D2-01');
  assert.ok(capabilities.dependsOn.every((id: string) => (byId.get(id) as any)?.readiness?.state === 'DONE'));
  assert.ok(['READY', 'DONE'].includes(capabilities.readiness.state));
  const counted = (program.workItems ?? []).filter((entry: any) => entry.disposition === 'DONE').length;
  assert.equal(program.summary?.dispositionCounts?.DONE, counted);
});
