import assert from 'node:assert/strict';
import test from 'node:test';

import {
  deriveCapabilityReality,
  deriveGovernanceDecision,
  deriveTaskReality
} from '../src/governance/operationalDecision.js';

const OBSERVED_AT = '2026-08-29T02:00:00.000Z';

test('registered tool remains callability UNKNOWN without transport/client attestation', () => {
  const reality = deriveCapabilityReality({
    toolName: 'mcp_transition_governed_task',
    registered: true,
    authorized: { status: 'TRUE' },
    governanceSafe: true,
    observedAt: OBSERVED_AT,
    provenance: ['runtime_catalogue']
  });

  assert.equal(reality.registered, true);
  assert.deepEqual(reality.callability, { status: 'UNKNOWN', source: 'SERVER' });
  assert.equal(reality.authorized.status, 'TRUE');
  assert.equal(reality.safeNow, false);
  assert.ok(reality.reasonCodes.includes('CALLABILITY_UNATTESTED'));
  assert.deepEqual(reality.provenance, ['runtime_catalogue']);
});

test('client/transport attestation can prove a registered tool is not callable', () => {
  const reality = deriveCapabilityReality({
    toolName: 'mcp_claim_next_governed_task',
    registered: true,
    callability: { status: 'NOT_CALLABLE', source: 'CLIENT_ATTESTATION' },
    authorized: { status: 'TRUE' },
    governanceSafe: true,
    observedAt: OBSERVED_AT,
    provenance: ['runtime_catalogue', 'chatgpt_connector_snapshot']
  });

  assert.equal(reality.callability.status, 'NOT_CALLABLE');
  assert.equal(reality.safeNow, false);
  assert.ok(reality.reasonCodes.includes('CLIENT_OR_TRANSPORT_ACTION_NOT_EXPOSED'));
});

test('task reality reports declared state behind verified operational evidence', () => {
  const reality = deriveTaskReality({
    declaredStatus: 'READY',
    evidence: {
      githubWorkStateAvailable: true,
      pullRequestMerged: true,
      ciExactHeadSuccess: true,
      deploymentExactShaSuccess: true,
      runtimeAligned: true,
      documentationAligned: true
    },
    observedAt: OBSERVED_AT
  });

  assert.equal(reality.observedPhase, 'VERIFIED');
  assert.equal(reality.drift, 'TASK_STATE_BEHIND_REALITY');
  assert.deepEqual(reality.recommendedLifecyclePath, [
    'READY', 'CLAIMED', 'IN_PROGRESS', 'REVIEW', 'MERGE_READY', 'DEPLOYING', 'VERIFYING', 'DONE'
  ]);
});

test('task reality reports declared state ahead when completion evidence is incomplete', () => {
  const reality = deriveTaskReality({
    declaredStatus: 'DONE',
    evidence: {
      githubWorkStateAvailable: true,
      pullRequestMerged: false,
      ciExactHeadSuccess: false,
      deploymentExactShaSuccess: false,
      runtimeAligned: true,
      documentationAligned: true
    },
    observedAt: OBSERVED_AT
  });

  assert.equal(reality.drift, 'TASK_STATE_AHEAD_OF_REALITY');
  assert.notEqual(reality.observedPhase, 'VERIFIED');
});

test('governance decision fails closed only when the operation requires unavailable GitHub evidence', () => {
  const capability = deriveCapabilityReality({
    toolName: 'github.merge',
    registered: true,
    callability: { status: 'CALLABLE', source: 'CLIENT_ATTESTATION' },
    authorized: { status: 'TRUE' },
    governanceSafe: true,
    observedAt: OBSERVED_AT,
    provenance: ['client_attestation']
  });

  const mergeDecision = deriveGovernanceDecision({
    operation: 'github.merge',
    capabilityReality: capability,
    sessionPresent: true,
    bootstrapCurrent: true,
    lockConflicts: 0,
    githubWorkStateAvailable: false,
    requiresGithubWorkState: true,
    requiredEvidence: ['github_work_state'],
    observedAt: OBSERVED_AT
  });
  assert.equal(mergeDecision.mayMutate, false);
  assert.ok(mergeDecision.reasonCodes.includes('GITHUB_WORK_STATE_UNAVAILABLE'));

  const independentDecision = deriveGovernanceDecision({
    operation: 'runtime.read_attestation',
    capabilityReality: capability,
    sessionPresent: true,
    bootstrapCurrent: true,
    lockConflicts: 0,
    githubWorkStateAvailable: false,
    requiresGithubWorkState: false,
    requiredEvidence: [],
    observedAt: OBSERVED_AT
  });
  assert.equal(independentDecision.mayMutate, true);
  assert.equal(independentDecision.reasonCodes.includes('GITHUB_WORK_STATE_UNAVAILABLE'), false);
});
