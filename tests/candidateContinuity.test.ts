import assert from 'node:assert/strict';
import test from 'node:test';

import {
  CandidateConversationIntakeSchema,
  assessCandidateKnowledgeFreshness,
  bootstrapCandidateConnection,
  dispatchCandidateWork,
  evaluateCandidateIntakeGate,
  reconcileCandidateIntakeBatch,
  reconcileConversationIntake,
  registerCandidateIntake,
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


test('intake registration is monotone and does not persist raw conversation content', () => {
  const result = registerCandidateIntake({
    cursor: {
      latestIntakeSequence: 2,
      reconciledThroughSequence: 0,
      canonicalRevision: 55,
      backlogRevision: 17,
      lastReconciliationDigest: null,
      pendingIntakeIds: [
        'NEW_INFORMATION_INTAKE-001',
        'NEW_INFORMATION_INTAKE-002'
      ]
    },
    sourceType: 'chatgpt',
    sourceId: 'conversation-current',
    sourceDigest: 'a'.repeat(64),
    observedAt: '2026-09-19T01:45:00+02:00'
  });

  assert.equal(result.intake.intakeId, 'NEW_INFORMATION_INTAKE-003');
  assert.equal(result.intake.sequence, 3);
  assert.equal(result.intake.status, 'RECEIVED');
  assert.equal(result.cursor.latestIntakeSequence, 3);
  assert.deepEqual(result.cursor.pendingIntakeIds, [
    'NEW_INFORMATION_INTAKE-001',
    'NEW_INFORMATION_INTAKE-002',
    'NEW_INFORMATION_INTAKE-003'
  ]);
  assert.equal('rawTranscript' in result.intake, false);
});

test('coherence gate rejects a parallel authority even when the idea is technically possible', () => {
  const evaluated = evaluateCandidateIntakeGate({
    intakeId: 'NEW_INFORMATION_INTAKE-003',
    sequence: 3,
    understood: true,
    relevance: 'RELEVANT',
    evidence: 'VERIFIED',
    evidenceRequired: false,
    objectiveAlignment: 'ALIGNED',
    relationToExisting: 'NEW',
    architecturalFit: 'CONFLICTS',
    authorityFit: 'CREATES_PARALLEL_AUTHORITY',
    nonRegression: 'BREAKING',
    impact: 'PROGRAM_WIDE',
    existingFirstPath: 'NEW',
    affectedScopes: ['candidate-work'],
    affectedContracts: [],
    affectedBlueprints: [],
    affectedWorkItems: [],
    affectedAuthorities: ['Governed Task Queue']
  });

  assert.equal(evaluated.verdict, 'REJECT');
  assert.equal(evaluated.shouldIntegrate, false);
  assert.ok(evaluated.reasonCodes.includes('PARALLEL_AUTHORITY'));
});

test('coherence gate accepts an additive existing-first evolution with adaptation', () => {
  const evaluated = evaluateCandidateIntakeGate({
    intakeId: 'NEW_INFORMATION_INTAKE-004',
    sequence: 4,
    understood: true,
    relevance: 'RELEVANT',
    evidence: 'PLAUSIBLE',
    evidenceRequired: false,
    objectiveAlignment: 'ALIGNED',
    relationToExisting: 'COMPLEMENT',
    architecturalFit: 'FITS_WITH_ADAPTATION',
    authorityFit: 'PRESERVES_EXISTING_AUTHORITIES',
    nonRegression: 'REQUIRES_COMPATIBILITY_WORK',
    impact: 'MULTI_CONTRACT',
    existingFirstPath: 'EXTEND',
    affectedScopes: ['candidate-continuity'],
    affectedContracts: ['GW-35', 'GW-36'],
    affectedBlueprints: ['GWC-14'],
    affectedWorkItems: ['GWC-PRE-E-GWC-14'],
    affectedAuthorities: []
  });

  assert.equal(evaluated.verdict, 'ACCEPT_WITH_ADAPTATION');
  assert.equal(evaluated.shouldIntegrate, true);
  assert.ok(evaluated.reasonCodes.includes('EXISTING_FIRST_ADAPTATION_REQUIRED'));
});

test('coherence gate defers an evidence-required unverified factual intake', () => {
  const evaluated = evaluateCandidateIntakeGate({
    intakeId: 'NEW_INFORMATION_INTAKE-005',
    sequence: 5,
    understood: true,
    relevance: 'RELEVANT',
    evidence: 'UNVERIFIED',
    evidenceRequired: true,
    objectiveAlignment: 'ALIGNED',
    relationToExisting: 'NEW',
    architecturalFit: 'FITS',
    authorityFit: 'PRESERVES_EXISTING_AUTHORITIES',
    nonRegression: 'SAFE',
    impact: 'LOCAL',
    existingFirstPath: 'EXTEND',
    affectedScopes: ['candidate-continuity'],
    affectedContracts: [],
    affectedBlueprints: [],
    affectedWorkItems: [],
    affectedAuthorities: []
  });

  assert.equal(evaluated.verdict, 'DEFER');
  assert.equal(evaluated.shouldIntegrate, false);
  assert.ok(evaluated.reasonCodes.includes('EVIDENCE_REQUIRED_UNVERIFIED'));
});

test('coherence gate keeps duplicates out of canonical and backlog revisions', () => {
  const evaluated = evaluateCandidateIntakeGate({
    intakeId: 'NEW_INFORMATION_INTAKE-006',
    sequence: 6,
    understood: true,
    relevance: 'RELEVANT',
    evidence: 'VERIFIED',
    evidenceRequired: false,
    objectiveAlignment: 'ALIGNED',
    relationToExisting: 'DUPLICATE',
    architecturalFit: 'FITS',
    authorityFit: 'PRESERVES_EXISTING_AUTHORITIES',
    nonRegression: 'SAFE',
    impact: 'NONE',
    existingFirstPath: 'REUSE',
    affectedScopes: [],
    affectedContracts: [],
    affectedBlueprints: [],
    affectedWorkItems: [],
    affectedAuthorities: []
  });

  assert.equal(evaluated.verdict, 'DUPLICATE');
  assert.equal(evaluated.shouldIntegrate, false);
});

test('intake batch reconciliation advances only a contiguous delta and produces an auditable receipt', () => {
  const result = reconcileCandidateIntakeBatch({
    cursor: {
      latestIntakeSequence: 2,
      reconciledThroughSequence: 0,
      canonicalRevision: 55,
      backlogRevision: 17,
      lastReconciliationDigest: null,
      pendingIntakeIds: [
        'NEW_INFORMATION_INTAKE-001',
        'NEW_INFORMATION_INTAKE-002'
      ]
    },
    intakes: [
      {
        intakeId: 'NEW_INFORMATION_INTAKE-001',
        sequence: 1,
        gate: {
          understood: true,
          relevance: 'RELEVANT',
          evidence: 'PLAUSIBLE',
          evidenceRequired: false,
          objectiveAlignment: 'ALIGNED',
          relationToExisting: 'COMPLEMENT',
          architecturalFit: 'FITS_WITH_ADAPTATION',
          authorityFit: 'PRESERVES_EXISTING_AUTHORITIES',
          nonRegression: 'REQUIRES_COMPATIBILITY_WORK',
          impact: 'MULTI_CONTRACT',
          existingFirstPath: 'EXTEND'
        },
        affectedScopes: ['gwc-architecture'],
        affectedContracts: ['GW-01', 'GW-02'],
        affectedBlueprints: ['GWC-0'],
        affectedWorkItems: ['GWC-PRE-B-01'],
        affectedAuthorities: [],
        canonicalEffect: 'ENRICH',
        backlogEffect: 'ENRICH_EXISTING_WORK'
      },
      {
        intakeId: 'NEW_INFORMATION_INTAKE-002',
        sequence: 2,
        gate: {
          understood: true,
          relevance: 'RELEVANT',
          evidence: 'VERIFIED',
          evidenceRequired: false,
          objectiveAlignment: 'ALIGNED',
          relationToExisting: 'COMPLEMENT',
          architecturalFit: 'FITS_WITH_ADAPTATION',
          authorityFit: 'PRESERVES_EXISTING_AUTHORITIES',
          nonRegression: 'SAFE',
          impact: 'MULTI_CONTRACT',
          existingFirstPath: 'GENERALIZE'
        },
        affectedScopes: ['candidate-backlog'],
        affectedContracts: [],
        affectedBlueprints: ['GWC-0', 'GWC-14'],
        affectedWorkItems: ['GWC-PRE-B-01', 'GWC-PRE-B-02', 'GWC-PRE-B-03'],
        affectedAuthorities: [],
        canonicalEffect: 'ENRICH',
        backlogEffect: 'ENRICH_EXISTING_WORK'
      }
    ]
  });

  assert.equal(result.status, 'RECONCILED');
  assert.equal(result.cursor.reconciledThroughSequence, 2);
  assert.equal(result.cursor.canonicalRevision, 56);
  assert.equal(result.cursor.backlogRevision, 18);
  assert.deepEqual(result.cursor.pendingIntakeIds, []);
  assert.equal(result.receipt.fromSequence, 1);
  assert.equal(result.receipt.throughSequence, 2);
  assert.deepEqual(result.receipt.intakeIds, [
    'NEW_INFORMATION_INTAKE-001',
    'NEW_INFORMATION_INTAKE-002'
  ]);
  assert.equal(result.receipt.previousCanonicalRevision, 55);
  assert.equal(result.receipt.resultingCanonicalRevision, 56);
  assert.equal(result.receipt.previousBacklogRevision, 17);
  assert.equal(result.receipt.resultingBacklogRevision, 18);
  assert.match(result.receipt.digest, /^[0-9a-f]{64}$/);
});

test('intake reconciliation fails closed on a sequence gap', () => {
  const result = reconcileCandidateIntakeBatch({
    cursor: {
      latestIntakeSequence: 3,
      reconciledThroughSequence: 0,
      canonicalRevision: 55,
      backlogRevision: 17,
      lastReconciliationDigest: null,
      pendingIntakeIds: [
        'NEW_INFORMATION_INTAKE-001',
        'NEW_INFORMATION_INTAKE-002',
        'NEW_INFORMATION_INTAKE-003'
      ]
    },
    intakes: [
      {
        intakeId: 'NEW_INFORMATION_INTAKE-002',
        sequence: 2,
        gate: {
          understood: true,
          relevance: 'RELEVANT',
          evidence: 'VERIFIED',
          evidenceRequired: false,
          objectiveAlignment: 'ALIGNED',
          relationToExisting: 'NEW',
          architecturalFit: 'FITS',
          authorityFit: 'PRESERVES_EXISTING_AUTHORITIES',
          nonRegression: 'SAFE',
          impact: 'LOCAL',
          existingFirstPath: 'EXTEND'
        },
        affectedScopes: [],
        affectedContracts: [],
        affectedBlueprints: [],
        affectedWorkItems: [],
        affectedAuthorities: [],
        canonicalEffect: 'ADD',
        backlogEffect: 'NONE'
      }
    ]
  });

  assert.equal(result.status, 'BLOCKED_GAP');
  assert.equal(result.expectedNextSequence, 1);
  assert.equal(result.cursor.reconciledThroughSequence, 0);
  assert.equal(result.receipt, null);
});

test('knowledge freshness is local: unrelated intake delta does not globally block independent work', () => {
  const result = assessCandidateKnowledgeFreshness({
    expectedHeadSha: 'f'.repeat(40),
    currentHeadSha: 'f'.repeat(40),
    expectedCanonicalRevision: 55,
    currentCanonicalRevision: 56,
    expectedBacklogRevision: 17,
    currentBacklogRevision: 18,
    workItemId: 'GWC-PRE-E-GWC-7',
    changedIntakes: [{
      intakeId: 'NEW_INFORMATION_INTAKE-010',
      sequence: 10,
      affectedWorkItems: ['GWC-PRE-E-GWC-14'],
      affectedBlueprints: ['GWC-14'],
      affectedContracts: ['GW-35']
    }]
  });

  assert.equal(result.status, 'KNOWLEDGE_STALE_NO_LOCAL_IMPACT');
  assert.equal(result.mayContinueAfterLogicalRebase, true);
  assert.deepEqual(result.relevantIntakeIds, []);
});

test('knowledge freshness requires reconciliation when the delta affects the claimed work item', () => {
  const result = assessCandidateKnowledgeFreshness({
    expectedHeadSha: 'f'.repeat(40),
    currentHeadSha: 'f'.repeat(40),
    expectedCanonicalRevision: 55,
    currentCanonicalRevision: 56,
    expectedBacklogRevision: 17,
    currentBacklogRevision: 18,
    workItemId: 'GWC-PRE-E-GWC-14',
    changedIntakes: [{
      intakeId: 'NEW_INFORMATION_INTAKE-010',
      sequence: 10,
      affectedWorkItems: ['GWC-PRE-E-GWC-14'],
      affectedBlueprints: ['GWC-14'],
      affectedContracts: ['GW-35']
    }]
  });

  assert.equal(result.status, 'RECONCILE_REQUIRED');
  assert.equal(result.mayContinueAfterLogicalRebase, false);
  assert.deepEqual(result.relevantIntakeIds, ['NEW_INFORMATION_INTAKE-010']);
});

test('HEAD_MOVED remains higher priority than knowledge-revision reconciliation', () => {
  const result = assessCandidateKnowledgeFreshness({
    expectedHeadSha: '1'.repeat(40),
    currentHeadSha: '2'.repeat(40),
    expectedCanonicalRevision: 55,
    currentCanonicalRevision: 56,
    expectedBacklogRevision: 17,
    currentBacklogRevision: 18,
    workItemId: 'GWC-PRE-E-GWC-14',
    changedIntakes: []
  });

  assert.equal(result.status, 'HEAD_MOVED');
  assert.equal(result.mayContinueAfterLogicalRebase, false);
});

test('intake discovery deduplicates bounded sources before registration and never carries executable/raw content', async () => {
  const { discoverCandidateIntakeSources } = await import('../src/governedContext/candidateContinuity.js');

  const result = discoverCandidateIntakeSources({
    registeredIntakes: [{
      intakeId: 'NEW_INFORMATION_INTAKE-003',
      sequence: 3,
      status: 'RECEIVED',
      sourceType: 'chatgpt',
      sourceId: 'github-pr95-comment-5738570504',
      sourceDigest: 'a'.repeat(64),
      observedAt: '2026-09-19T02:56:49Z'
    }],
    discoveredSources: [
      {
        sourceType: 'chatgpt',
        sourceId: 'github-pr95-comment-5738570504',
        sourceDigest: 'a'.repeat(64),
        observedAt: '2026-09-19T02:56:49Z'
      },
      {
        sourceType: 'claude',
        sourceId: 'github-pr95-comment-5739000001',
        sourceDigest: 'b'.repeat(64),
        observedAt: '2026-09-19T03:40:00Z'
      },
      {
        sourceType: 'other',
        sourceId: 'duplicate-by-digest',
        sourceDigest: 'b'.repeat(64),
        observedAt: '2026-09-19T03:41:00Z'
      }
    ]
  });

  assert.equal(result.unseen.length, 1);
  assert.equal(result.unseen[0]?.sourceId, 'github-pr95-comment-5739000001');
  assert.deepEqual(result.duplicateSourceIds, [
    'duplicate-by-digest',
    'github-pr95-comment-5738570504'
  ]);
  assert.equal(JSON.stringify(result).includes('rawTranscript'), false);
  assert.equal(JSON.stringify(result).includes('instruction'), false);
  assert.equal(result.executesInstructions, false);
});

test('candidate liveness is transient telemetry and stale heartbeat never changes ownership or authorization', async () => {
  const { assessCandidateLiveness } = await import('../src/governedContext/candidateContinuity.js');

  const stale = assessCandidateLiveness({
    candidateSessionId: 'candidate-liveness-a',
    agentIdentity: 'chatgpt',
    observedHeadSha: '1'.repeat(40),
    heartbeatObservedAt: '2026-09-19T03:00:00Z',
    observedAt: '2026-09-19T03:10:01Z',
    freshForSeconds: 300
  });
  assert.equal(stale.status, 'STALE');
  assert.equal(stale.transient, true);
  assert.equal(stale.ownershipChanged, false);
  assert.equal(stale.authorizationGranted, false);
  assert.equal(stale.claimTransferAllowed, false);
  assert.equal(stale.mayWrite, false);

  const missing = assessCandidateLiveness({
    candidateSessionId: 'candidate-liveness-a',
    agentIdentity: 'chatgpt',
    observedHeadSha: '1'.repeat(40),
    heartbeatObservedAt: null,
    observedAt: '2026-09-19T03:10:01Z',
    freshForSeconds: 300
  });
  assert.equal(missing.status, 'MISSING');
  assert.equal(missing.claimTransferAllowed, false);
});

test('recovery supervisor reobserves head claim checkpoint and liveness; timeout alone never transfers a claim', async () => {
  const {
    assessCandidateLiveness,
    superviseCandidateRecovery
  } = await import('../src/governedContext/candidateContinuity.js');

  const liveness = assessCandidateLiveness({
    candidateSessionId: 'candidate-supervised',
    agentIdentity: 'chatgpt',
    observedHeadSha: '2'.repeat(40),
    heartbeatObservedAt: '2026-09-19T03:00:00Z',
    observedAt: '2026-09-19T03:10:01Z',
    freshForSeconds: 300
  });
  const claim = {
    candidateSessionId: 'candidate-supervised',
    agentIdentity: 'chatgpt',
    workItemId: 'GWC-PRE-E-GWC-4',
    collisionDomains: ['path:src/governedContext/candidateContinuity.ts'],
    status: 'ACTIVE' as const
  };

  const recovery = superviseCandidateRecovery({
    expectedHeadSha: '2'.repeat(40),
    currentHeadSha: '2'.repeat(40),
    workItemId: 'GWC-PRE-E-GWC-4',
    expectedCandidateSessionId: 'candidate-supervised',
    activeClaim: claim,
    checkpoint: {
      status: 'SUCCESS',
      headSha: '2'.repeat(40)
    },
    liveness
  });
  assert.equal(recovery.decision, 'START_REPLACEMENT_RECONCILE_ONLY');
  assert.equal(recovery.claimTransferAllowed, false);
  assert.equal(recovery.ownershipChanged, false);
  assert.equal(recovery.authorizationGranted, false);
  assert.equal(recovery.requiresReobservationBeforeWrite, true);

  const moved = superviseCandidateRecovery({
    expectedHeadSha: '2'.repeat(40),
    currentHeadSha: '3'.repeat(40),
    workItemId: 'GWC-PRE-E-GWC-4',
    expectedCandidateSessionId: 'candidate-supervised',
    activeClaim: claim,
    checkpoint: {
      status: 'SUCCESS',
      headSha: '2'.repeat(40)
    },
    liveness
  });
  assert.equal(moved.decision, 'REOBSERVE_REQUIRED');
  assert.equal(moved.claimTransferAllowed, false);
});

test('recovery runner resumes only a verified same-provider session and never invents provider identity', async () => {
  const {
    planCandidateRecoveryRunner
  } = await import('../src/governedContext/candidateContinuity.js');

  const verified = planCandidateRecoveryRunner({
    recoveryDecision: 'START_REPLACEMENT_RECONCILE_ONLY',
    candidateSession: {
      candidateSessionId: 'candidate-runner-a',
      agentIdentity: 'chatgpt',
      provider: 'chatgpt',
      providerConversationRef: 'chatgpt-conversation-real-7',
      providerConversationRefProvenance: 'PROVIDED_BY_CLIENT',
      githubActor: 'Patricked-code',
      githubConnectionRef: 'github-connection-runner-a',
      connectionInstanceRef: 'connection-runner-a',
      repository: 'Patricked-code/MCP',
      branch: 'claude/ecstatic-edison-v1dyt1',
      startingHeadSha: '4'.repeat(40),
      lastObservedHeadSha: '4'.repeat(40),
      createdAt: '2026-09-19T03:00:00Z',
      lastSeenAt: '2026-09-19T03:05:00Z',
      status: 'ACTIVE'
    },
    expectedHeadSha: '4'.repeat(40),
    capability: {
      provider: 'chatgpt',
      verifiedSessionResumeSupported: true,
      replacementExecutorSupported: true
    }
  });
  assert.equal(verified.action, 'RESUME_VERIFIED_PROVIDER_SESSION');
  assert.equal(verified.providerConversationRef, 'chatgpt-conversation-real-7');
  assert.equal(verified.executionMode, 'RECONCILE_READ_ONLY');
  assert.equal(verified.authorizationGranted, false);

  const unavailable = planCandidateRecoveryRunner({
    recoveryDecision: 'START_REPLACEMENT_RECONCILE_ONLY',
    candidateSession: {
      candidateSessionId: 'candidate-runner-b',
      agentIdentity: 'claude',
      provider: 'claude',
      providerConversationRef: null,
      providerConversationRefProvenance: 'UNAVAILABLE',
      githubActor: null,
      githubConnectionRef: null,
      connectionInstanceRef: 'connection-runner-b',
      repository: 'Patricked-code/MCP',
      branch: 'claude/ecstatic-edison-v1dyt1',
      startingHeadSha: '5'.repeat(40),
      lastObservedHeadSha: '5'.repeat(40),
      createdAt: '2026-09-19T03:00:00Z',
      lastSeenAt: '2026-09-19T03:05:00Z',
      status: 'ACTIVE'
    },
    expectedHeadSha: '5'.repeat(40),
    capability: {
      provider: 'claude',
      verifiedSessionResumeSupported: false,
      replacementExecutorSupported: false
    }
  });
  assert.equal(unavailable.action, 'RUNNER_UNAVAILABLE');
  assert.equal(unavailable.providerConversationRef, null);
  assert.equal(JSON.stringify(unavailable).includes('secret'), false);
});

test('replacement runner plan is reconcile-only and deterministic to prevent restart storms', async () => {
  const { planCandidateRecoveryRunner } = await import('../src/governedContext/candidateContinuity.js');
  const input = {
    recoveryDecision: 'START_REPLACEMENT_RECONCILE_ONLY' as const,
    candidateSession: {
      candidateSessionId: 'candidate-runner-c',
      agentIdentity: 'other-agent',
      provider: 'other' as const,
      providerConversationRef: null,
      providerConversationRefProvenance: 'UNAVAILABLE' as const,
      githubActor: null,
      githubConnectionRef: 'github-runner-c',
      connectionInstanceRef: 'connection-runner-c',
      repository: 'Patricked-code/MCP' as const,
      branch: 'claude/ecstatic-edison-v1dyt1' as const,
      startingHeadSha: '6'.repeat(40),
      lastObservedHeadSha: '6'.repeat(40),
      createdAt: '2026-09-19T03:00:00Z',
      lastSeenAt: '2026-09-19T03:05:00Z',
      status: 'ACTIVE' as const
    },
    expectedHeadSha: '6'.repeat(40),
    capability: {
      provider: 'other' as const,
      verifiedSessionResumeSupported: false,
      replacementExecutorSupported: true
    }
  };
  const first = planCandidateRecoveryRunner(input);
  const second = planCandidateRecoveryRunner(input);
  assert.equal(first.action, 'START_REPLACEMENT_EXECUTOR');
  assert.equal(first.executionMode, 'RECONCILE_READ_ONLY');
  assert.equal(first.planId, second.planId);
  assert.match(first.planId, /^recovery-[0-9a-f]{24}$/);
  assert.equal(first.authorizationGranted, false);
});

test('runner plan is never RESUMED until a matching acknowledgement is observed', async () => {
  const {
    acknowledgeCandidateRecoveryRunner,
    planCandidateRecoveryRunner
  } = await import('../src/governedContext/candidateContinuity.js');

  const plan = planCandidateRecoveryRunner({
    recoveryDecision: 'START_REPLACEMENT_RECONCILE_ONLY',
    candidateSession: {
      candidateSessionId: 'candidate-runner-ack',
      agentIdentity: 'chatgpt',
      provider: 'chatgpt',
      providerConversationRef: 'chatgpt-conversation-ack',
      providerConversationRefProvenance: 'PROVIDED_BY_CLIENT',
      githubActor: 'Patricked-code',
      githubConnectionRef: 'github-runner-ack',
      connectionInstanceRef: 'connection-runner-ack',
      repository: 'Patricked-code/MCP',
      branch: 'claude/ecstatic-edison-v1dyt1',
      startingHeadSha: '7'.repeat(40),
      lastObservedHeadSha: '7'.repeat(40),
      createdAt: '2026-09-19T03:00:00Z',
      lastSeenAt: '2026-09-19T03:05:00Z',
      status: 'ACTIVE'
    },
    expectedHeadSha: '7'.repeat(40),
    capability: {
      provider: 'chatgpt',
      verifiedSessionResumeSupported: true,
      replacementExecutorSupported: true
    }
  });
  assert.equal('status' in plan && (plan as { status?: string }).status === 'RESUMED', false);

  const mismatch = acknowledgeCandidateRecoveryRunner(plan, {
    planId: plan.planId,
    candidateSessionId: 'candidate-wrong',
    observedHeadSha: '7'.repeat(40),
    acknowledgedAt: '2026-09-19T03:12:00Z'
  });
  assert.equal(mismatch.status, 'UNVERIFIED');
  assert.equal(mismatch.authorizationGranted, false);

  const acknowledged = acknowledgeCandidateRecoveryRunner(plan, {
    planId: plan.planId,
    candidateSessionId: 'candidate-runner-ack',
    observedHeadSha: '7'.repeat(40),
    acknowledgedAt: '2026-09-19T03:12:00Z'
  });
  assert.equal(acknowledged.status, 'RESUMED');
  assert.equal(acknowledged.authorizationGranted, false);
  assert.equal(acknowledged.claimTransferAllowed, false);
});

test('recovery supervisor rejects liveness telemetry bound to another candidate session', async () => {
  const {
    assessCandidateLiveness,
    superviseCandidateRecovery
  } = await import('../src/governedContext/candidateContinuity.js');

  const liveness = assessCandidateLiveness({
    candidateSessionId: 'candidate-other-session',
    agentIdentity: 'chatgpt',
    observedHeadSha: '8'.repeat(40),
    heartbeatObservedAt: '2026-09-19T03:09:00Z',
    observedAt: '2026-09-19T03:10:00Z',
    freshForSeconds: 300
  });

  const recovery = superviseCandidateRecovery({
    expectedHeadSha: '8'.repeat(40),
    currentHeadSha: '8'.repeat(40),
    workItemId: 'GWC-PRE-E-GWC-4',
    expectedCandidateSessionId: 'candidate-expected-session',
    activeClaim: {
      candidateSessionId: 'candidate-expected-session',
      agentIdentity: 'chatgpt',
      workItemId: 'GWC-PRE-E-GWC-4',
      collisionDomains: ['path:src/governedContext/candidateContinuity.ts'],
      status: 'ACTIVE'
    },
    checkpoint: {
      status: 'SUCCESS',
      headSha: '8'.repeat(40)
    },
    liveness
  });

  assert.equal(recovery.decision, 'REOBSERVE_REQUIRED');
  assert.equal(recovery.reasonCode, 'LIVENESS_BINDING_MISMATCH');
  assert.equal(recovery.claimTransferAllowed, false);
  assert.equal(recovery.authorizationGranted, false);
  assert.equal(recovery.requiresReobservationBeforeWrite, true);
});

test('runner acknowledgement rejects a plan whose bounded recovery envelope was tampered after planning', async () => {
  const {
    acknowledgeCandidateRecoveryRunner,
    planCandidateRecoveryRunner
  } = await import('../src/governedContext/candidateContinuity.js');

  const plan = planCandidateRecoveryRunner({
    recoveryDecision: 'START_REPLACEMENT_RECONCILE_ONLY',
    candidateSession: {
      candidateSessionId: 'candidate-runner-integrity',
      agentIdentity: 'other-agent',
      provider: 'other',
      providerConversationRef: null,
      providerConversationRefProvenance: 'UNAVAILABLE',
      githubActor: null,
      githubConnectionRef: 'github-runner-integrity',
      connectionInstanceRef: 'connection-runner-integrity',
      repository: 'Patricked-code/MCP',
      branch: 'claude/ecstatic-edison-v1dyt1',
      startingHeadSha: '9'.repeat(40),
      lastObservedHeadSha: '9'.repeat(40),
      createdAt: '2026-09-19T03:00:00Z',
      lastSeenAt: '2026-09-19T03:05:00Z',
      status: 'ACTIVE'
    },
    expectedHeadSha: '9'.repeat(40),
    capability: {
      provider: 'other',
      verifiedSessionResumeSupported: false,
      replacementExecutorSupported: true
    }
  });
  assert.equal(plan.action, 'START_REPLACEMENT_EXECUTOR');

  const tampered = {
    ...plan,
    action: 'RESUME_VERIFIED_PROVIDER_SESSION' as const,
    providerConversationRef: 'invented-provider-ref'
  };
  const acknowledgement = acknowledgeCandidateRecoveryRunner(tampered, {
    planId: tampered.planId,
    candidateSessionId: tampered.candidateSessionId,
    observedHeadSha: tampered.expectedHeadSha,
    acknowledgedAt: '2026-09-19T03:12:00Z'
  });

  assert.equal(acknowledgement.status, 'UNVERIFIED');
  assert.equal(acknowledgement.authorizationGranted, false);
  assert.equal(acknowledgement.claimTransferAllowed, false);
});
