import assert from 'node:assert/strict';
import test from 'node:test';

import {
  CandidateConversationIntakeSchema,
  bootstrapCandidateConnection,
  dispatchCandidateWork,
  reconcileConversationIntake,
  resolveCandidateSession,
  routeCandidateConnectionIntent,
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
    intentKeys: ['candidate-bindings', 'candidate.dispatch'],
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


test('GitHub-first candidate bootstrap resumes a branch-local session from an observed provider conversation reference without MCP runtime', () => {
  const existingSessions = [{
    candidateSessionId: 'candidate-session-existing',
    agentIdentity: 'chatgpt',
    provider: 'chatgpt' as const,
    providerConversationRef: 'chatgpt-conversation-123',
    providerConversationRefProvenance: 'PROVIDED_BY_CLIENT' as const,
    githubActor: 'Patricked-code',
    githubConnectionRef: null,
    repository: 'Patricked-code/MCP' as const,
    branch: 'claude/ecstatic-edison-v1dyt1' as const,
    startingHeadSha: 'a'.repeat(40),
    lastObservedHeadSha: 'b'.repeat(40),
    createdAt: '2026-09-19T00:00:00+02:00',
    lastSeenAt: '2026-09-19T00:10:00+02:00',
    status: 'ACTIVE' as const
  }];

  const result = resolveCandidateSession({
    repository: 'Patricked-code/MCP',
    branch: 'claude/ecstatic-edison-v1dyt1',
    observedHeadSha: 'c'.repeat(40),
    agentIdentity: 'chatgpt',
    provider: 'chatgpt',
    providerConversationRef: 'chatgpt-conversation-123',
    providerConversationRefProvenance: 'PROVIDED_BY_CLIENT',
    githubActor: 'Patricked-code',
    githubConnectionRef: null,
    connectionInstanceRef: 'connection-local-1',
    observedAt: '2026-09-19T00:30:00+02:00'
  }, existingSessions);

  assert.equal(result.status, 'RESUME');
  assert.equal(result.session.candidateSessionId, 'candidate-session-existing');
  assert.equal(result.session.lastObservedHeadSha, 'c'.repeat(40));
  assert.equal(result.runtimeMcpRequired, false);
});

test('GitHub-first candidate bootstrap never invents a provider conversation id when the client did not expose one', () => {
  const result = resolveCandidateSession({
    repository: 'Patricked-code/MCP',
    branch: 'claude/ecstatic-edison-v1dyt1',
    observedHeadSha: 'd'.repeat(40),
    agentIdentity: 'claude',
    provider: 'claude',
    providerConversationRef: null,
    providerConversationRefProvenance: 'UNAVAILABLE',
    githubActor: 'Patricked-code',
    githubConnectionRef: 'github-agent-connection-77',
    connectionInstanceRef: 'connection-local-77',
    observedAt: '2026-09-19T00:31:00+02:00'
  }, []);

  assert.equal(result.status, 'CREATE');
  assert.equal(result.session.providerConversationRef, null);
  assert.equal(result.session.providerConversationRefProvenance, 'UNAVAILABLE');
  assert.match(result.session.candidateSessionId, /^candidate-/);
  assert.equal(result.runtimeMcpRequired, false);
});

test('candidate intent router automatically selects information, continuation or both and asks only when ambiguous', () => {
  assert.equal(routeCandidateConnectionIntent({
    declaredMode: null,
    hasMaterialNewInformation: true,
    requestsContinuation: false
  }).mode, 'NEW_INFORMATION_INTAKE');

  assert.equal(routeCandidateConnectionIntent({
    declaredMode: null,
    hasMaterialNewInformation: false,
    requestsContinuation: true
  }).mode, 'CONTINUE_PRECODE_WORK');

  assert.equal(routeCandidateConnectionIntent({
    declaredMode: null,
    hasMaterialNewInformation: true,
    requestsContinuation: true
  }).mode, 'NEW_INFORMATION_THEN_CONTINUE_PRECODE');

  const ambiguous = routeCandidateConnectionIntent({
    declaredMode: null,
    hasMaterialNewInformation: false,
    requestsContinuation: false
  });
  assert.equal(ambiguous.mode, 'ASK_USER');
  assert.deepEqual(ambiguous.choices, [
    'NEW_INFORMATION_INTAKE',
    'CONTINUE_PRECODE_WORK',
    'NEW_INFORMATION_THEN_CONTINUE_PRECODE'
  ]);
});

test('explicit PRECODE mode is authoritative and does not require a redundant question', () => {
  const routed = routeCandidateConnectionIntent({
    declaredMode: 'CONTINUE_PRECODE_WORK',
    hasMaterialNewInformation: false,
    requestsContinuation: false
  });

  assert.equal(routed.mode, 'CONTINUE_PRECODE_WORK');
  assert.equal(routed.askUser, false);
});

test('GitHub-first bootstrap composes session resolution, intent routing and work dispatch without runtime authorities', () => {
  const result = bootstrapCandidateConnection({
    connection: {
      repository: 'Patricked-code/MCP',
      branch: 'claude/ecstatic-edison-v1dyt1',
      observedHeadSha: 'e'.repeat(40),
      agentIdentity: 'chatgpt',
      provider: 'chatgpt',
      providerConversationRef: null,
      providerConversationRefProvenance: 'UNAVAILABLE',
      githubActor: 'Patricked-code',
      githubConnectionRef: 'github-connection-88',
      connectionInstanceRef: 'connection-local-88',
      observedAt: '2026-09-19T00:32:00+02:00'
    },
    intent: {
      declaredMode: 'CONTINUE_PRECODE_WORK',
      hasMaterialNewInformation: false,
      requestsContinuation: true
    },
    sessions: [],
    workItems: [{
      workItemId: 'GWC-PRE-B-01',
      intentKeys: ['candidate-backlog'],
      title: 'Build candidate backlog',
      status: 'READY',
      priority: 100,
      sequence: 1,
      dependencies: [],
      collisionDomains: ['docs:gwc']
    }],
    activeClaims: []
  });

  assert.equal(result.runtimeMcpRequired, false);
  assert.equal(result.intent.mode, 'CONTINUE_PRECODE_WORK');
  assert.equal(result.dispatch?.status, 'ASSIGN');
  assert.equal(result.dispatch?.workItem?.workItemId, 'GWC-PRE-B-01');
  assert.equal(result.requiresUserChoice, false);
});
