import assert from 'node:assert/strict';
import test from 'node:test';

import {
  deriveCapabilityReality,
  deriveGovernanceDecision,
  deriveTaskReality
} from '../src/governance/operationalDecision.js';

const OBSERVED_AT = '2026-08-29T03:00:00.000Z';

test('registered and explicitly exposed capability becomes CALLABLE', () => {
  const reality = deriveCapabilityReality({
    toolName: 'mcp_transition_governed_task',
    registered: true,
    callability: { status: 'CALLABLE', source: 'CLIENT_ATTESTATION' },
    authorized: { status: 'TRUE' },
    governanceSafe: true,
    observedAt: OBSERVED_AT,
    provenance: ['runtime_catalogue', 'client_attestation']
  });
  assert.equal(reality.callability.status, 'CALLABLE');
  assert.equal(reality.safeNow, true);
  assert.deepEqual(reality.reasonCodes, []);
});

test('Task Reality distinguishes incomplete evidence', () => {
  const reality = deriveTaskReality({
    declaredStatus: 'IN_PROGRESS',
    evidence: {
      githubWorkStateAvailable: true,
      pullRequestMerged: false,
      ciExactHeadSuccess: false,
      deploymentExactShaSuccess: false,
      runtimeAligned: true,
      documentationAligned: true
    },
    evidenceComplete: false,
    observedAt: OBSERVED_AT
  });
  assert.equal(reality.drift, 'REALITY_INCOMPLETE');
});

test('Task Reality distinguishes contradictory evidence', () => {
  const reality = deriveTaskReality({
    declaredStatus: 'DEPLOYING',
    evidence: {
      githubWorkStateAvailable: true,
      pullRequestMerged: false,
      ciExactHeadSuccess: true,
      deploymentExactShaSuccess: true,
      runtimeAligned: false,
      documentationAligned: true
    },
    contradictions: ['deployment_without_merged_pr', 'runtime_sha_mismatch'],
    observedAt: OBSERVED_AT
  });
  assert.equal(reality.drift, 'REALITY_CONTRADICTORY');
  assert.deepEqual(reality.contradictions, ['deployment_without_merged_pr', 'runtime_sha_mismatch']);
});

test('Observer Before Actor accounts for owner dependency GitHub and runtime evidence', () => {
  const capability = deriveCapabilityReality({
    toolName: 'github.merge',
    registered: true,
    callability: { status: 'CALLABLE', source: 'CLIENT_ATTESTATION' },
    authorized: { status: 'TRUE' },
    governanceSafe: true,
    observedAt: OBSERVED_AT
  });
  const decision = deriveGovernanceDecision({
    operation: 'github.merge',
    capabilityReality: capability,
    sessionPresent: true,
    bootstrapCurrent: true,
    lockConflicts: 0,
    githubWorkStateAvailable: true,
    requiresGithubWorkState: true,
    githubReasonCodes: ['GITHUB_REQUIRED_CHECKS_PENDING', 'GITHUB_REVIEW_BLOCKING'],
    ownerMatches: false,
    dependenciesSatisfied: false,
    runtimeAligned: false,
    requiresRuntimeAlignment: true,
    requiredEvidence: ['github_work_state', 'runtime_alignment'],
    observedAt: OBSERVED_AT
  });
  assert.equal(decision.mayMutate, false);
  assert.ok(decision.reasonCodes.includes('WRONG_OWNER_OR_SESSION'));
  assert.ok(decision.reasonCodes.includes('DEPENDENCY_NOT_DONE'));
  assert.ok(decision.reasonCodes.includes('GITHUB_REQUIRED_CHECKS_PENDING'));
  assert.ok(decision.reasonCodes.includes('GITHUB_REVIEW_BLOCKING'));
  assert.ok(decision.reasonCodes.includes('RUNTIME_SHA_MISMATCH'));
});

test('GitHub failure evidence does not block an operation that does not require GitHub', () => {
  const capability = deriveCapabilityReality({
    toolName: 'runtime.read_attestation',
    registered: true,
    callability: { status: 'CALLABLE', source: 'CLIENT_ATTESTATION' },
    authorized: { status: 'TRUE' },
    governanceSafe: true,
    observedAt: OBSERVED_AT
  });
  const decision = deriveGovernanceDecision({
    operation: 'runtime.read_attestation',
    capabilityReality: capability,
    sessionPresent: true,
    bootstrapCurrent: true,
    lockConflicts: 0,
    githubWorkStateAvailable: false,
    requiresGithubWorkState: false,
    githubReasonCodes: ['GITHUB_AUTH_INVALID'],
    ownerMatches: true,
    dependenciesSatisfied: true,
    runtimeAligned: true,
    requiresRuntimeAlignment: false,
    requiredEvidence: [],
    observedAt: OBSERVED_AT
  });
  assert.equal(decision.mayMutate, true);
  assert.equal(decision.reasonCodes.includes('GITHUB_AUTH_INVALID'), false);
});
