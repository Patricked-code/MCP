import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const { deriveProvisioningCapabilities } = await import('../src/governance/provisioningContracts.js');

const PROGRAM_PATH = 'docs/governance/program-backlog-convergence.json';
const POLICY_PATH = '.mcp/provisioning-contracts.json';
const MERGE_SHA = 'd34899b7ed72d7345af1d8ce88cdbe06fe8a7ad1';

test('TB-W3-F-01 is DONE only with exact-head, deploy and read-only attestation evidence', async () => {
  const program = JSON.parse(await readFile(PROGRAM_PATH, 'utf8'));
  const byId = new Map((program.taskBlueprints ?? []).map((entry: any) => [entry.id, entry]));
  const blueprint: any = byId.get('TB-W3-F-01');
  const evidence = blueprint?.completionEvidence;

  assert.equal(blueprint?.readiness?.state, 'DONE');
  assert.equal(evidence?.pullRequest, 257);
  assert.equal(evidence?.policy, POLICY_PATH);
  assert.equal(evidence?.redHeadSha, '5d8b93c71dc1cc4f54402e396d4ae77cac1ffcdd');
  assert.equal(evidence?.redCiRunId, 37389622528);
  assert.equal(evidence?.candidateHeadSha, 'fe7b3024b5f00bc946b1bd6886edd1d24e3597f3');
  assert.equal(evidence?.prCiRunId, 37390269900);
  assert.equal(evidence?.testCount, 941);
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
  assert.equal(program.w3F01ProvisioningHandoff?.status, 'PASS_WITH_EVIDENCE');
  assert.equal(program.w3F01ProvisioningHandoff?.observedMainSha, MERGE_SHA);
});

test('F.0 hands its contracts to the provisioning lots and releases those it unblocks', async () => {
  const program = JSON.parse(await readFile(PROGRAM_PATH, 'utf8'));
  const policy = JSON.parse(await readFile(POLICY_PATH, 'utf8'));
  const byId = new Map((program.taskBlueprints ?? []).map((entry: any) => [entry.id, entry]));
  const handoff = program.w3F01ProvisioningHandoff;

  // Every lot that adds, composes, proves or renders provisioning consumes the F.0 contracts.
  for (const id of ['TB-W3-ADMIN-01', 'TB-W3-F-02', 'TB-W3-F-03', 'TB-W3-F-04', 'TB-W3-F-05', 'TB-W4-K-10']) {
    const consumer: any = byId.get(id);
    assert.ok(consumer.greenAcceptance.some((line: string) => line.includes(POLICY_PATH)), id);
  }

  // Lots whose dependencies are now DONE become planning-ready; repository provisioning waits for its primitive.
  for (const id of ['TB-W3-ADMIN-01', 'TB-W3-F-03', 'TB-W3-F-04']) {
    const released: any = byId.get(id);
    assert.ok(released.dependsOn.every((dependency: string) => (byId.get(dependency) as any)?.readiness?.state === 'DONE'), id);
    assert.ok(['READY', 'DONE'].includes(released.readiness.state), id);
  }
  const repository: any = byId.get('TB-W3-F-02');
  if ((byId.get('TB-W3-ADMIN-01') as any).readiness.state !== 'DONE') assert.equal(repository.readiness.state, 'BLOCKED');

  // Every gap of the policy stays carried by the handoff; none is dropped.
  const policyCarriers = new Set(policy.contracts.flatMap((contract: any) => (
    contract.steps.flatMap((step: any) => step.gap?.carriedBy ?? [])
  )));
  const handedCarriers = new Set((handoff?.deferred ?? []).flatMap((entry: any) => entry.carriedBy));
  for (const carrier of policyCarriers) assert.ok(handedCarriers.has(carrier), carrier);
  // A carrier leaves the policy only by delivering its primitive: F.2 resolves the project runtime contract.
  const runtime: any = deriveProvisioningCapabilities(policy).find((entry: any) => entry.resourceType === 'PROJECT_RUNTIME');
  const resolved = [...handedCarriers].filter((carrier) => !policyCarriers.has(carrier)).sort();
  assert.deepEqual(resolved, runtime.state === 'PROVISIONABLE' ? ['TB-W3-F-03'] : []);
  assert.ok((handoff?.knownLimitations ?? []).some((line: string) => /classified/.test(line)));

  // F.0 delivers contracts, not provisioning: PB-F stays partially implemented until every lot is DONE.
  const lots = (program.taskBlueprints ?? []).filter((entry: any) => entry.workItemId === 'PB-F');
  const workItem = (program.workItems ?? []).find((entry: any) => entry.id === 'PB-F');
  const closed = lots.every((entry: any) => entry.readiness.state === 'DONE');
  assert.equal(workItem?.disposition, closed ? 'DONE' : 'PARTIALLY_IMPLEMENTED');
  for (const disposition of Object.keys(program.summary?.dispositionCounts ?? {})) {
    const counted = (program.workItems ?? []).filter((entry: any) => entry.disposition === disposition).length;
    assert.equal(program.summary.dispositionCounts[disposition], counted, disposition);
  }
});
