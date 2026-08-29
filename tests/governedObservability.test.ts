import assert from 'node:assert/strict';
import test from 'node:test';

import {
  deriveGovernedObservability,
  renderGovernedContextDashboardSection
} from '../src/governedContext/dashboard.js';
import type { GovernedOperationalContext } from '../src/governedContext/types.js';

const NOW = '2026-08-29T03:20:00.000Z';

function context(): GovernedOperationalContext {
  const capabilityReality = [
    {
      toolName: 'github.merge', registered: true,
      callability: { status: 'CALLABLE' as const, source: 'CLIENT_ATTESTATION' as const },
      authorized: { status: 'TRUE' as const }, safeNow: true,
      reasonCodes: [], requiredEvidence: [], observedAt: NOW,
      provenance: ['client_attestation']
    },
    {
      toolName: 'mcp_transition_governed_task', registered: true,
      callability: { status: 'UNKNOWN' as const, source: 'SERVER' as const },
      authorized: { status: 'UNKNOWN' as const }, safeNow: false,
      reasonCodes: ['CALLABILITY_UNATTESTED', 'AUTHORIZATION_UNATTESTED'],
      requiredEvidence: ['callability_attestation', 'authorization_attestation'],
      observedAt: NOW, provenance: ['runtime_catalogue']
    },
    {
      toolName: 'github.create_pull_request', registered: true,
      callability: { status: 'NOT_CALLABLE' as const, source: 'CLIENT_ATTESTATION' as const },
      authorized: { status: 'TRUE' as const }, safeNow: false,
      reasonCodes: ['CLIENT_OR_TRANSPORT_ACTION_NOT_EXPOSED'], requiredEvidence: [],
      observedAt: NOW, provenance: ['client_attestation']
    }
  ];
  const taskReality = {
    declaredStatus: 'IN_PROGRESS', observedPhase: 'VERIFIED' as const,
    drift: 'TASK_STATE_BEHIND_REALITY' as const,
    evidence: {
      githubWorkStateAvailable: true, pullRequestMerged: true, ciExactHeadSuccess: true,
      deploymentExactShaSuccess: true, runtimeAligned: true, documentationAligned: true
    },
    contradictions: [], recommendedLifecyclePath: ['VERIFYING', 'DONE'], observedAt: NOW
  };
  return {
    schemaVersion: 1,
    generatedAt: NOW,
    freshness: 'CURRENT',
    repository: 'Patricked-code/MCP',
    governedBranch: 'main',
    liveState: null,
    github: {
      status: 'CURRENT', observedAt: NOW, mainHead: 'a'.repeat(40),
      workBranch: 'mcp/unified-operational-work-state-20260829', workBranchHead: 'b'.repeat(40),
      pullRequest: null,
      checks: {
        status: 'completed', conclusion: 'success', total: 1, failed: 0,
        headSha: 'b'.repeat(40), exactHead: true,
        required: [{ context: 'validate', status: 'completed', conclusion: 'success' }],
        requiredSatisfied: true
      },
      reviews: { approvals: 0, changesRequested: 1, unresolvedThreads: 1 },
      ruleset: {
        name: 'main-protection', enforcement: 'active', requiresPullRequest: true,
        requiredStatusChecks: ['validate'], requiresConversationResolution: true
      },
      ownership: { pullRequestAuthor: null },
      activity: { lastActivityAt: NOW },
      cache: { status: 'REFRESHED', observedAt: NOW, provenance: 'github_api' },
      evidence: {
        main: { freshness: 'CURRENT', observedAt: NOW, provenance: 'github_api' },
        pullRequest: { freshness: 'CURRENT', observedAt: NOW, provenance: 'github_api' },
        checks: { freshness: 'CURRENT', observedAt: NOW, provenance: 'github_api' },
        reviews: { freshness: 'CURRENT', observedAt: NOW, provenance: 'github_api' },
        ruleset: { freshness: 'CURRENT', observedAt: NOW, provenance: 'github_api' }
      },
      reasonCodes: ['GITHUB_REVIEW_BLOCKING'], uncertainties: [], error: null
    },
    session: null,
    bootstrap: { required: true, status: 'CURRENT', receipt: null, limitations: [] },
    currentState: {
      catalogueDigest: null, inventoryDigest: null, governanceDigest: null, auditBaselineValid: true
    },
    workQueue: { storeRevision: 14, total: 3, byStatus: { DONE: 2, IN_PROGRESS: 1 } },
    currentTask: null,
    firstExecutableTask: null,
    capabilityReality,
    taskReality,
    governanceDecision: {
      operation: 'github.merge', task: null, taskReality, session: null, owner: null,
      bootstrap: { status: 'CURRENT', stateVersion: 45 }, dependencies: [], resourceScopes: [],
      locks: { activeConflictCount: 0 },
      githubWorkState: {
        status: 'CURRENT', error: null, mainHead: 'a'.repeat(40),
        workBranch: 'mcp/unified-operational-work-state-20260829', workBranchHead: 'b'.repeat(40)
      },
      runtimeState: { status: 'CURRENT', revision: 'a'.repeat(40), health: 'healthy' },
      capabilityReality: capabilityReality[0]!, requiredEvidence: ['github_work_state'],
      blockers: ['GITHUB_REVIEW_BLOCKING'], nextSafeAction: null, mayMutate: false,
      reasonCodes: ['GITHUB_REVIEW_BLOCKING'], observedAt: NOW
    },
    activeLocks: [],
    lastCheckpoint: null,
    blockers: [],
    nextAction: 'address_github_review',
    gate: { mode: 'shadow', existingWriteToolsEnabled: true, decision: 'shadow_observed' },
    proof: { identityAssurance: null, runtimeRealtimeAvailable: true, limitations: [] }
  };
}

test('observability derives bounded capability task GitHub and governance metrics from current context', () => {
  const projection = deriveGovernedObservability(context());
  assert.deepEqual(projection.capabilities, {
    total: 3,
    callable: 1,
    notCallable: 1,
    unknown: 1,
    authorizationFalse: 0,
    authorizationUnknown: 1,
    safeNowFalse: 2
  });
  assert.equal(projection.taskRealityDrift, 'TASK_STATE_BEHIND_REALITY');
  assert.equal(projection.mayMutate, false);
  assert.deepEqual(projection.githubReasonCodes, ['GITHUB_REVIEW_BLOCKING']);
  assert.deepEqual(projection.governanceReasonCodes, ['GITHUB_REVIEW_BLOCKING']);
  assert.equal(projection.shadowMode, 'shadow');
  assert.equal(projection.shadowDecision, 'shadow_observed');
});

test('dashboard renders the same bounded reality projection without new collectors', () => {
  const html = renderGovernedContextDashboardSection(context());
  assert.match(html, /Capability Reality/);
  assert.match(html, /CALLABLE[^0-9]*1/);
  assert.match(html, /NOT_CALLABLE[^0-9]*1/);
  assert.match(html, /UNKNOWN[^0-9]*1/);
  assert.match(html, /TASK_STATE_BEHIND_REALITY/);
  assert.match(html, /mayMutate[^<]*<[^>]+>false/);
  assert.match(html, /GITHUB_REVIEW_BLOCKING/);
  assert.match(html, /shadow_observed/);
});
