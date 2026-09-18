import assert from 'node:assert/strict';
import test from 'node:test';

import {
  CandidateConversationIntakeSchema,
  dispatchCandidateWork,
  reconcileConversationIntake,
  type CandidateCanonicalEntry,
  type CandidateWorkClaim,
  type CandidateWorkItem
} from '../src/governedContext/candidateContinuity.js';

const workItems: CandidateWorkItem[] = [
  {
    workItemId: 'GWC-PRE-B-01',
    intentKeys: ['candidate-backlog'],
    title: 'Build candidate backlog',
    status: 'DONE',
    priority: 100,
    sequence: 1,
    dependencies: [],
    collisionDomains: ['docs:gwc']
  },
  {
    workItemId: 'GWC-PRE-B-02',
    intentKeys: ['candidate-bindings'],
    title: 'Bind candidate work',
    status: 'READY',
    priority: 90,
    sequence: 2,
    dependencies: ['GWC-PRE-B-01'],
    collisionDomains: ['docs:gwc', 'src:governed-context']
  },
  {
    workItemId: 'GWC-PRE-B-03',
    intentKeys: ['candidate-audit'],
    title: 'Audit candidate backlog',
    status: 'READY',
    priority: 80,
    sequence: 3,
    dependencies: ['GWC-PRE-B-01'],
    collisionDomains: ['tests:gwc']
  }
];

test('candidate dispatcher resumes the same agent before assigning new work', () => {
  const claims: CandidateWorkClaim[] = [{
    candidateSessionId: 'session-a',
    agentIdentity: 'chatgpt',
    workItemId: 'GWC-PRE-B-02',
    collisionDomains: ['docs:gwc', 'src:governed-context'],
    status: 'ACTIVE'
  }];

  const result = dispatchCandidateWork({
    candidateSessionId: 'session-a',
    agentIdentity: 'chatgpt',
    workItems,
    activeClaims: claims
  });

  assert.equal(result.status, 'CONTINUE');
  assert.equal(result.workItem?.workItemId, 'GWC-PRE-B-02');
  assert.equal(result.reasonCode, 'existing_candidate_claim');
});

test('candidate dispatcher skips collision domains and selects the next dependency-safe work item', () => {
  const claims: CandidateWorkClaim[] = [{
    candidateSessionId: 'session-claude',
    agentIdentity: 'claude',
    workItemId: 'GWC-PRE-B-02',
    collisionDomains: ['docs:gwc', 'src:governed-context'],
    status: 'ACTIVE'
  }];

  const result = dispatchCandidateWork({
    candidateSessionId: 'session-chatgpt',
    agentIdentity: 'chatgpt',
    workItems,
    activeClaims: claims
  });

  assert.equal(result.status, 'ASSIGN');
  assert.equal(result.workItem?.workItemId, 'GWC-PRE-B-03');
  assert.equal(result.reasonCode, 'next_eligible_candidate_work');
});

test('candidate dispatcher blocks work whose dependencies are not done', () => {
  const result = dispatchCandidateWork({
    candidateSessionId: 'session-a',
    agentIdentity: 'chatgpt',
    workItems: [{
      ...workItems[1]!,
      dependencies: ['GWC-PRE-MISSING']
    }],
    activeClaims: []
  });

  assert.equal(result.status, 'WAIT');
  assert.equal(result.workItem, null);
  assert.equal(result.reasonCode, 'no_dependency_safe_candidate_work');
});

test('conversation intake classifies duplicate, complement, decision, finding, task and contradiction without mutating authorities', () => {
  const canonicalEntries: CandidateCanonicalEntry[] = [
    {
      key: 'candidate.branch-policy',
      kind: 'CONSTRAINT',
      summary: 'Candidate code stays on the Claude branch until final acceptance.',
      status: 'ACTIVE'
    },
    {
      key: 'candidate.dispatch',
      kind: 'REQUIREMENT',
      summary: 'Agents must resume existing candidate work before new work.',
      status: 'ACTIVE'
    }
  ];

  const result = reconcileConversationIntake({
    source: {
      sourceType: 'chatgpt',
      sourceId: 'conversation-20260919',
      observedAt: '2026-09-19T00:20:00+02:00'
    },
    insights: [
      {
        key: 'candidate.branch-policy',
        kind: 'CONSTRAINT',
        summary: 'Candidate code stays on the Claude branch until final acceptance.',
        relation: 'INDEPENDENT',
        actionable: false,
        evidenceRefs: []
      },
      {
        key: 'candidate.dispatch',
        kind: 'REQUIREMENT',
        summary: 'When one collision domain is occupied, another compatible agent should receive the next eligible candidate work item.',
        relation: 'COMPLEMENTS',
        targetKey: 'candidate.dispatch',
        actionable: true,
        evidenceRefs: []
      },
      {
        key: 'candidate.auto-continuity',
        kind: 'DECISION',
        summary: 'Automatic multi-agent continuity is part of the evolved candidate.',
        relation: 'INDEPENDENT',
        actionable: false,
        evidenceRefs: []
      },
      {
        key: 'candidate.ingestion-gap',
        kind: 'FINDING',
        summary: 'There is no generic automated conversation-to-memory reconciliation engine yet.',
        relation: 'INDEPENDENT',
        actionable: true,
        evidenceRefs: []
      },
      {
        key: 'candidate.conversation-intake',
        kind: 'TASK_HINT',
        summary: 'Add bounded conversation intake reconciliation to Governed Context.',
        relation: 'INDEPENDENT',
        actionable: true,
        evidenceRefs: []
      },
      {
        key: 'candidate.branch-policy-change',
        kind: 'DECISION',
        summary: 'Deploy candidate code directly to production before final acceptance.',
        relation: 'CONTRADICTS',
        targetKey: 'candidate.branch-policy',
        actionable: true,
        evidenceRefs: []
      }
    ]
  }, canonicalEntries, workItems);

  assert.deepEqual(
    result.items.map((entry) => entry.disposition),
    ['DUPLICATE', 'COMPLEMENT', 'DECISION', 'FINDING', 'TASK', 'CONTRADICTION']
  );
  assert.equal(result.items[1]?.memoryAction, 'ENRICH_CANONICAL_MEMORY');
  assert.equal(result.items[1]?.taskAction, 'ENRICH_EXISTING_WORK_ITEM');
  assert.equal(result.items[4]?.taskAction, 'PROPOSE_CANDIDATE_WORK_ITEM');
  assert.equal(result.items[5]?.requiresHumanReview, true);
  assert.equal(result.hasContradiction, true);
});

test('conversation intake schema refuses raw transcript persistence', () => {
  const parsed = CandidateConversationIntakeSchema.safeParse({
    source: {
      sourceType: 'chatgpt',
      sourceId: 'conversation-raw',
      observedAt: '2026-09-19T00:20:00+02:00'
    },
    rawTranscript: 'must not be persisted',
    insights: []
  });

  assert.equal(parsed.success, false);
});
