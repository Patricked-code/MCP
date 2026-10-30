import assert from 'node:assert/strict';
import test from 'node:test';
import { previewExternalGovernedRecovery, type ExternalGovernedRecoveryInput } from '../src/governedContext/githubFirstOperationalContinuity.js';

const sha = 'a'.repeat(40);
function selected(): ExternalGovernedRecoveryInput {
  return {
    profile: 'EXTERNAL_GOVERNED_RECOVERY',
    ownerSelected: true,
    collisionFreeObserved: true,
    expectedMainSha: sha,
    observedMainSha: sha,
    expectedBranchSha: sha,
    observedBranchSha: sha,
    github: {
      githubConnected: true,
      repository: 'Patricked-code/MCP',
      observedHeadSha: sha,
      needs: {
        repositoryRead: true,
        repositoryWrite: true,
        serverReadEvidence: false,
        serverWrite: false,
        operationalMemoryMutation: false,
        runtimeToolInvocation: false
      },
      fallback: {
        readonlyEvidenceWorkflowAvailable: false,
        readonlyEvidenceEnvironmentConfigured: false
      }
    }
  };
}
test('explicit profile selection permits a GitHub-only candidate without MCP task admission', () => {
  const r = previewExternalGovernedRecovery(selected());
  assert.equal(r.state, 'GITHUB_WORK_CANDIDATE');
  assert.equal(r.transport, 'GITHUB_ONLY');
  assert.equal(r.advisoryOnly, true);
  assert.equal(r.newTaskOrSessionCreated, false);
  assert.equal(r.githubWriteGranted, false);
  assert.equal(r.serverWriteGranted, false);
  assert.equal(r.deployGranted, false);
  assert.equal(r.workflowTriggered, false);
});
test('selection is blocked on lack of owner request or unresolved collision', () => {
  const b = selected();
  assert.equal(previewExternalGovernedRecovery({ ...b, ownerSelected: false }).state, 'EXPLICIT_SELECTION_REQUIRED');
  assert.equal(previewExternalGovernedRecovery({ ...b, collisionFreeObserved: false }).state, 'COLLISION_UNRESOLVED');
  assert.equal(previewExternalGovernedRecovery({ ...b, github: { ...b.github, githubConnected: false } }).state, 'GITHUB_CONNECTION_REQUIRED');
});
test('exact main, work branch and asserted head SHAs must all match', () => {
  const b = selected();
  assert.equal(previewExternalGovernedRecovery({ ...b, observedMainSha: 'b'.repeat(40) }).state, 'HEAD_DRIFT_STOP_WRITE');
  assert.equal(previewExternalGovernedRecovery({ ...b, observedBranchSha: 'b'.repeat(40) }).state, 'HEAD_DRIFT_STOP_WRITE');
  assert.equal(previewExternalGovernedRecovery({ ...b, github: { ...b.github, observedHeadSha: 'b'.repeat(40) } }).state, 'HEAD_DRIFT_STOP_WRITE');
});
test('OIDC evidence cannot authorize server write, which still requires runtime authority', () => {
  const b = selected();
  const observation = previewExternalGovernedRecovery({
    ...b,
    github: {
      ...b.github,
      needs: { ...b.github.needs, serverReadEvidence: true },
      fallback: { readonlyEvidenceWorkflowAvailable: true, readonlyEvidenceEnvironmentConfigured: true }
    }
  });
  assert.equal(observation.state, 'OIDC_EVIDENCE_CANDIDATE');
  assert.equal(observation.transport, 'GITHUB_ACTION_READONLY_EVIDENCE');
  assert.equal(observation.serverWriteGranted, false);
  const privileged = previewExternalGovernedRecovery({
    ...b,
    github: { ...b.github, needs: { ...b.github.needs, serverWrite: true } }
  });
  assert.equal(privileged.state, 'RUNTIME_AUTHORITY_REQUIRED');
  assert.equal(privileged.transport, 'RUNTIME_REQUIRED');
  assert.equal(privileged.serverWriteGranted, false);
});
test('unknown profile and malformed SHA are rejected', () => {
  const b = selected();
  assert.throws(() => previewExternalGovernedRecovery({ ...b, profile: 'WRONG' as 'EXTERNAL_GOVERNED_RECOVERY' }));
  assert.throws(() => previewExternalGovernedRecovery({ ...b, expectedMainSha: 'bad' }));
});
