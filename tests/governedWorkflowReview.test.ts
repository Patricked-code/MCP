import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import type { GithubOperationalContext } from '../src/governedContext/types.js';
import { createGovernedContractSubstrate } from '../src/governedWorkflow/contractSubstrate.js';

const NOW = '2026-09-19T09:53:00.000Z';
const HEAD = 'a'.repeat(40);
const OLD_HEAD = 'b'.repeat(40);
const SESSION_ID = '11111111-1111-4111-8111-111111111111';
const RECEIPT_ID = '22222222-2222-4222-8222-222222222222';

async function substrate() {
  const [contractsText, graphText] = await Promise.all([
    readFile('.mcp/gwc-contracts.json', 'utf8'),
    readFile('.mcp/gwc-workflow-graph.json', 'utf8')
  ]);
  const contracts = JSON.parse(contractsText);
  const graph = JSON.parse(graphText);
  return createGovernedContractSubstrate({
    contractsProjection: contracts,
    graphProjection: graph,
    expectedSchemaVersion: 1,
    expectedContractRegistryDigest: contracts.registryDigest,
    expectedGraphRegistryDigest: graph.registryDigest
  });
}

async function review() {
  return import('../src/governedWorkflow/review/index.js');
}

function githubContext(overrides: Partial<GithubOperationalContext> = {}): GithubOperationalContext {
  return {
    status: 'CURRENT',
    observedAt: NOW,
    mainHead: 'c'.repeat(40),
    workBranch: 'claude/example',
    workBranchHead: HEAD,
    pullRequest: {
      number: 95,
      state: 'open',
      draft: false,
      merged: false,
      base: 'main',
      head: 'claude/example',
      headSha: HEAD,
      author: 'agent',
      updatedAt: NOW
    },
    checks: {
      status: 'completed',
      conclusion: 'success',
      total: 1,
      failed: 0,
      headSha: HEAD,
      exactHead: true,
      required: [{ context: 'MCP CI', status: 'completed', conclusion: 'success' }],
      requiredSatisfied: true
    },
    reviews: {
      approvals: 1,
      changesRequested: 0,
      unresolvedThreads: 0,
      headSha: HEAD,
      exactHead: true
    },
    ruleset: {
      name: 'main-protection',
      enforcement: 'active',
      requiresPullRequest: true,
      requiredStatusChecks: ['MCP CI'],
      requiresConversationResolution: true,
      requiredApprovingReviewCount: 1
    },
    ownership: { pullRequestAuthor: 'agent' },
    activity: { lastActivityAt: NOW },
    cache: { status: 'REFRESHED', observedAt: NOW, provenance: 'github_api' },
    evidence: {
      main: { freshness: 'CURRENT', observedAt: NOW, provenance: 'github_api' },
      pullRequest: { freshness: 'CURRENT', observedAt: NOW, provenance: 'github_api' },
      checks: { freshness: 'CURRENT', observedAt: NOW, provenance: 'github_api' },
      reviews: { freshness: 'CURRENT', observedAt: NOW, provenance: 'github_api' },
      ruleset: { freshness: 'CURRENT', observedAt: NOW, provenance: 'github_api' }
    },
    reasonCodes: [],
    uncertainties: [],
    error: null,
    ...overrides
  };
}

test('GW-34 plans draft PR through the existing GWC-12 lifecycle tool and never mutates', async () => {
  const { planGw34DraftPr } = await review();
  const result = planGw34DraftPr({
    repository: 'Patricked-code/MCP',
    sourceBranch: 'claude/example',
    baseBranch: 'main',
    expectedHeadSha: HEAD,
    title: 'GWC-14 candidate'
  }, await substrate());
  assert.equal(result.contract.stepId, 'GW-34');
  assert.equal(result.status, 'READY');
  assert.equal(result.effectPlan?.toolName, 'github_create_pull_request');
  assert.equal(result.effectPlan?.expectedHeadSha, HEAD);
  assert.equal(result.authorizationInferred, false);
  assert.equal(result.mutationPerformed, false);
});

test('GW-35 exact diff review rejects stale diff evidence and accepts the exact head', async () => {
  const { observeGw35ExactDiffReview } = await review();
  const contracts = await substrate();
  const pass = observeGw35ExactDiffReview({
    expectedHeadSha: HEAD,
    evidence: {
      observedAt: NOW,
      headSha: HEAD,
      baseSha: 'c'.repeat(40),
      changedFiles: ['src/a.ts'],
      additions: 3,
      deletions: 1,
      truncated: false
    }
  }, contracts);
  assert.equal(pass.status, 'SUCCESS');
  assert.equal(pass.payload.exactHead, true);
  assert.equal(pass.payload.nextStepId, 'GW-36');

  const stale = observeGw35ExactDiffReview({
    expectedHeadSha: HEAD,
    evidence: { ...pass.payload.evidence, headSha: OLD_HEAD }
  }, contracts);
  assert.equal(stale.status, 'CONFLICT');
  assert.deepEqual(stale.reasonCodes, ['DIFF_HEAD_MISMATCH']);
});

test('GW-36 ruleset verification preserves GitHub as authority and fails closed on stale evidence', async () => {
  const { observeGw36RulesetVerification } = await review();
  const contracts = await substrate();
  const pass = observeGw36RulesetVerification({
    expectedHeadSha: HEAD,
    github: githubContext()
  }, contracts);
  assert.equal(pass.status, 'SUCCESS');
  assert.equal(pass.payload.requiredApprovingReviewCount, 1);
  assert.equal(pass.payload.nextStepId, 'GW-37');

  const stale = githubContext({
    evidence: {
      ...githubContext().evidence,
      ruleset: { freshness: 'STALE', observedAt: NOW, provenance: 'github_api' }
    }
  });
  const blocked = observeGw36RulesetVerification({ expectedHeadSha: HEAD, github: stale }, contracts);
  assert.equal(blocked.status, 'BLOCKED');
  assert.deepEqual(blocked.reasonCodes, ['RULESET_EVIDENCE_NOT_CURRENT']);
});

test('GW-37 routes code findings back to GW-30 and clean review forward to GW-38', async () => {
  const { evaluateGw37ReviewFindings } = await review();
  const contracts = await substrate();
  const codeFinding = evaluateGw37ReviewFindings({
    expectedHeadSha: HEAD,
    findings: [{ findingId: 'REV-1', category: 'CODE', summary: 'fix required' }],
    unresolvedRequiredThreads: 0
  }, contracts);
  assert.equal(codeFinding.status, 'SUCCESS');
  assert.equal(codeFinding.payload.nextStepId, 'GW-30');

  const clean = evaluateGw37ReviewFindings({
    expectedHeadSha: HEAD,
    findings: [],
    unresolvedRequiredThreads: 0
  }, contracts);
  assert.equal(clean.status, 'SUCCESS');
  assert.equal(clean.payload.nextStepId, 'GW-38');
});

test('GW-38 plans PR ready only for clean exact-head review evidence', async () => {
  const { planGw38PrReady } = await review();
  const result = planGw38PrReady({
    repository: 'Patricked-code/MCP',
    pullRequestNumber: 95,
    expectedHeadSha: HEAD,
    review: { headSha: HEAD, exactHead: true, blockingFindings: 0, unresolvedRequiredThreads: 0 }
  }, await substrate());
  assert.equal(result.status, 'READY');
  assert.equal(result.effectPlan?.toolName, 'github_mark_pr_ready');
  assert.equal(result.effectPlan?.expectedHeadSha, HEAD);
});

test('GW-39 reuses the governed task transition authority for REVIEW', async () => {
  const { planGw39TaskReview } = await review();
  const result = planGw39TaskReview({
    taskId: 'TASK-20260919-900',
    expectedTaskRevision: 7,
    governedSessionId: SESSION_ID,
    expectedSessionRevision: 4,
    expectedBootstrapReceiptId: RECEIPT_ID,
    expectedStateVersion: 12,
    expectedHeadSha: HEAD
  }, await substrate());
  assert.equal(result.status, 'READY');
  assert.equal(result.effectPlan?.toolName, 'mcp_transition_governed_task');
  assert.equal(result.effectPlan?.payload.status, 'REVIEW');
});

test('GW-40 reuses governed session checkpoint authority and binds the reviewed head', async () => {
  const { planGw40ReviewCheckpoint } = await review();
  const result = planGw40ReviewCheckpoint({
    governedSessionId: SESSION_ID,
    expectedSessionRevision: 4,
    expectedHeadSha: HEAD,
    nextAction: 'premerge revalidation'
  }, await substrate());
  assert.equal(result.status, 'READY');
  assert.equal(result.effectPlan?.toolName, 'mcp_create_governed_checkpoint');
  assert.equal(result.effectPlan?.expectedHeadSha, HEAD);
});

test('GW-41 composes one PremergeProof and rejects stale review/check evidence', async () => {
  const { composeGw41PremergeProof } = await review();
  const contracts = await substrate();
  const ready = composeGw41PremergeProof({
    expectedHeadSha: HEAD,
    github: githubContext(),
    taskStatus: 'REVIEW',
    checkpointHeadSha: HEAD
  }, contracts);
  assert.equal(ready.contract.stepId, 'GW-41');
  assert.equal(ready.status, 'SUCCESS');
  assert.equal(ready.payload.status, 'READY');
  assert.equal(ready.payload.headSha, HEAD);
  assert.equal(ready.payload.reviewsExactHead, true);
  assert.equal(ready.payload.checksExactHead, true);
  assert.equal(ready.payload.nextStepId, 'GW-42');

  const stale = composeGw41PremergeProof({
    expectedHeadSha: HEAD,
    github: githubContext({
      reviews: { ...githubContext().reviews, headSha: OLD_HEAD, exactHead: false }
    }),
    taskStatus: 'REVIEW',
    checkpointHeadSha: HEAD
  }, contracts);
  assert.equal(stale.status, 'BLOCKED');
  assert.ok(stale.reasonCodes.includes('REVIEW_HEAD_MISMATCH'));
});

test('GW-42 plans MERGE_READY only from a READY PremergeProof at the same head', async () => {
  const { composeGw41PremergeProof, planGw42TaskMergeReady } = await review();
  const contracts = await substrate();
  const proof = composeGw41PremergeProof({
    expectedHeadSha: HEAD,
    github: githubContext(),
    taskStatus: 'REVIEW',
    checkpointHeadSha: HEAD
  }, contracts);
  const result = planGw42TaskMergeReady({
    taskId: 'TASK-20260919-900',
    expectedTaskRevision: 8,
    governedSessionId: SESSION_ID,
    expectedSessionRevision: 5,
    expectedBootstrapReceiptId: RECEIPT_ID,
    expectedStateVersion: 13,
    expectedHeadSha: HEAD,
    premergeProof: proof
  }, contracts);
  assert.equal(result.status, 'READY');
  assert.equal(result.effectPlan?.toolName, 'mcp_transition_governed_task');
  assert.equal(result.effectPlan?.payload.status, 'MERGE_READY');
});

test('GW-43 exact-head merge is non-replayable and refuses a proof from another head', async () => {
  const { composeGw41PremergeProof, planGw43ExactHeadMerge } = await review();
  const contracts = await substrate();
  const proof = composeGw41PremergeProof({
    expectedHeadSha: HEAD,
    github: githubContext(),
    taskStatus: 'REVIEW',
    checkpointHeadSha: HEAD
  }, contracts);
  const ready = planGw43ExactHeadMerge({
    repository: 'Patricked-code/MCP',
    pullRequestNumber: 95,
    expectedHeadSha: HEAD,
    premergeProof: proof
  }, contracts);
  assert.equal(ready.status, 'READY');
  assert.equal(ready.effectPlan?.toolName, 'github_merge_pull_request');
  assert.equal(ready.effectPlan?.replayClass, 'NON_REPLAYABLE_RECOVER_BY_OBSERVATION');

  const stale = planGw43ExactHeadMerge({
    repository: 'Patricked-code/MCP',
    pullRequestNumber: 95,
    expectedHeadSha: OLD_HEAD,
    premergeProof: proof
  }, contracts);
  assert.equal(stale.status, 'BLOCKED');
  assert.deepEqual(stale.reasonCodes, ['PREMERGE_PROOF_HEAD_MISMATCH']);
  assert.equal(stale.effectPlan, null);
});
