import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
const json = async (path: string): Promise<any> => JSON.parse(await readFile(path, 'utf8'));

test('GWB04 18 READY remains program-ordered planning evidence, not a Task Queue or claim', async () => {
  const backlog = await json('docs/governance/program-backlog-convergence.json');
  const audit = await json('docs/governance/gwb04-ready-ownership-20261015.json');
  const original = backlog.taskBlueprints.map((v: any, i: number) => ({ ...v, ordinal: i })).filter((v: any) => v.readiness?.state === 'READY');
  assert.equal(audit.kind, 'GWB04_18_READY_BLUEPRINTS_WORK_OWNERSHIP_RECONCILIATION_NON_AUTHORITATIVE');
  assert.equal(original.length, 18);
  assert.equal(audit.readyInExistingProgramOrder.length, original.length);
  assert.deepEqual(audit.readyInExistingProgramOrder.map((z: any) => z.id), original.map((z: any) => z.id));
  // This GWB04 snapshot predates the additive A3.3 OAuth blueprint. Its 18
  // READY items and historical ordinals must remain unchanged; the newer
  // BLOCKED candidate contributes no READY/claim or runtime permission.
  const a33Ordinal = backlog.taskBlueprints.findIndex((item: any) => item.id === 'TB-W3-A3-03');
  assert.equal(a33Ordinal, 14);
  assert.equal(backlog.taskBlueprints[a33Ordinal].readiness?.state, 'BLOCKED');
  assert.equal(backlog.taskBlueprints.length, 95);
  assert.deepEqual(
    audit.readyInExistingProgramOrder.map((z: any) => z.programOrdinal),
    original.map((z: any) => z.ordinal - (z.ordinal > a33Ordinal ? 1 : 0))
  );
  assert.equal(audit.readyInExistingProgramOrder.every((z: any) => z.readinessClaim === 'PLANNING_READY_NOT_PERMISSION'), true);
  assert.equal(audit.readyInExistingProgramOrder.every((z: any) => z.backendRuntimeCertified === false && z.currentCodeAndAssertionsVerified === false), true);
  assert.equal(audit.scope.ownershipClaimedByThisReport, 0);
  assert.equal(audit.runtimeSnapshot.activeSessions, 0);
  assert.equal(audit.runtimeSnapshot.activeLocks, 0);
  assert.equal(audit.runtimeSnapshot.mutationsAllowed, false);
  assert.equal(audit.readyInExistingProgramOrder.find((z: any) => z.id === 'TB-W3-A3-02')?.executableRuntimeTaskId, 'TASK-20260929-001');
  for (const item of audit.readyInExistingProgramOrder) {
    assert.deepEqual(item.dependsOn, original.find((x: any) => x.id === item.id)?.dependsOn);
    assert.ok(item.openPRCandidateOverlaps.every((p: any) => p.relationship === 'CANDIDATE_SCOPE_OVERLAP_ONLY_NOT_RUNTIME_OWNER'));
  }
});
