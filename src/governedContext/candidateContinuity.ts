import { createHash } from 'node:crypto';

import { z } from 'zod';

const BoundedId = z.string().trim().min(1).max(160);
const BoundedText = z.string().trim().min(1).max(2_000);
const BoundedRef = z.string().trim().min(1).max(500);

export const CandidateWorkItemSchema = z.object({
  workItemId: BoundedId,
  intentKeys: z.array(BoundedId).max(30),
  title: z.string().trim().min(1).max(300),
  status: z.enum(['PENDING', 'READY', 'IN_PROGRESS', 'BLOCKED', 'DONE', 'CANCELLED', 'SUPERSEDED']),
  priority: z.number().int().min(0).max(1_000),
  sequence: z.number().int().nonnegative(),
  dependencies: z.array(BoundedId).max(100),
  collisionDomains: z.array(BoundedId).max(30)
}).strict();
export type CandidateWorkItem = z.infer<typeof CandidateWorkItemSchema>;

export const CandidateWorkClaimSchema = z.object({
  candidateSessionId: BoundedId,
  agentIdentity: BoundedId,
  workItemId: BoundedId,
  collisionDomains: z.array(BoundedId).max(30),
  status: z.enum(['ACTIVE', 'RELEASED'])
}).strict();
export type CandidateWorkClaim = z.infer<typeof CandidateWorkClaimSchema>;

export const CandidateDispatchInputSchema = z.object({
  candidateSessionId: BoundedId,
  agentIdentity: BoundedId,
  workItems: z.array(CandidateWorkItemSchema).max(5_000),
  activeClaims: z.array(CandidateWorkClaimSchema).max(5_000)
}).strict();
export type CandidateDispatchInput = z.infer<typeof CandidateDispatchInputSchema>;

export type CandidateDispatchResult = {
  status: 'CONTINUE' | 'ASSIGN' | 'WAIT' | 'COMPLETE';
  workItem: CandidateWorkItem | null;
  reasonCode:
    | 'existing_candidate_claim'
    | 'next_eligible_candidate_work'
    | 'candidate_program_complete'
    | 'candidate_session_has_multiple_active_claims'
    | 'candidate_collision_domains_busy'
    | 'no_dependency_safe_candidate_work'
    | 'no_ready_candidate_work';
  occupiedCollisionDomains: string[];
};

const TERMINAL_WORK = new Set<CandidateWorkItem['status']>(['DONE', 'CANCELLED', 'SUPERSEDED']);

function unique(values: string[]): string[] {
  return [...new Set(values)].sort();
}

function intersects(left: string[], right: Set<string>): boolean {
  return left.some((value) => right.has(value));
}

export function dispatchCandidateWork(rawInput: CandidateDispatchInput): CandidateDispatchResult {
  const input = CandidateDispatchInputSchema.parse(rawInput);
  const activeOwnClaims = input.activeClaims.filter((claim) => (
    claim.status === 'ACTIVE' && claim.candidateSessionId === input.candidateSessionId
  ));

  if (activeOwnClaims.length > 1) {
    return {
      status: 'WAIT',
      workItem: null,
      reasonCode: 'candidate_session_has_multiple_active_claims',
      occupiedCollisionDomains: unique(activeOwnClaims.flatMap((claim) => claim.collisionDomains))
    };
  }

  if (activeOwnClaims.length === 1) {
    const claimed = input.workItems.find((item) => item.workItemId === activeOwnClaims[0]!.workItemId) ?? null;
    if (claimed && !TERMINAL_WORK.has(claimed.status)) {
      return {
        status: 'CONTINUE',
        workItem: claimed,
        reasonCode: 'existing_candidate_claim',
        occupiedCollisionDomains: unique(activeOwnClaims[0]!.collisionDomains)
      };
    }
  }

  if (input.workItems.length > 0 && input.workItems.every((item) => TERMINAL_WORK.has(item.status))) {
    return {
      status: 'COMPLETE',
      workItem: null,
      reasonCode: 'candidate_program_complete',
      occupiedCollisionDomains: []
    };
  }

  const byId = new Map(input.workItems.map((item) => [item.workItemId, item]));
  const foreignClaims = input.activeClaims.filter((claim) => (
    claim.status === 'ACTIVE' && claim.candidateSessionId !== input.candidateSessionId
  ));
  const occupied = new Set(foreignClaims.flatMap((claim) => claim.collisionDomains));
  const ready = input.workItems.filter((item) => item.status === 'READY');
  const dependencySafe = ready.filter((item) => item.dependencies.every((dependency) => (
    byId.get(dependency)?.status === 'DONE'
  )));
  const collisionSafe = dependencySafe.filter((item) => !intersects(item.collisionDomains, occupied));
  const selected = [...collisionSafe].sort((left, right) => (
    right.priority - left.priority
    || left.sequence - right.sequence
    || left.workItemId.localeCompare(right.workItemId)
  ))[0] ?? null;

  if (selected) {
    return {
      status: 'ASSIGN',
      workItem: selected,
      reasonCode: 'next_eligible_candidate_work',
      occupiedCollisionDomains: [...occupied].sort()
    };
  }

  if (dependencySafe.length > 0 && collisionSafe.length === 0) {
    return {
      status: 'WAIT',
      workItem: null,
      reasonCode: 'candidate_collision_domains_busy',
      occupiedCollisionDomains: [...occupied].sort()
    };
  }

  if (ready.length > 0 && dependencySafe.length === 0) {
    return {
      status: 'WAIT',
      workItem: null,
      reasonCode: 'no_dependency_safe_candidate_work',
      occupiedCollisionDomains: [...occupied].sort()
    };
  }

  return {
    status: 'WAIT',
    workItem: null,
    reasonCode: 'no_ready_candidate_work',
    occupiedCollisionDomains: [...occupied].sort()
  };
}

export const CandidateCanonicalEntrySchema = z.object({
  key: BoundedId,
  kind: z.enum(['FACT', 'REQUIREMENT', 'DECISION', 'FINDING', 'CONSTRAINT']),
  summary: BoundedText,
  status: z.enum(['ACTIVE', 'SUPERSEDED'])
}).strict();
export type CandidateCanonicalEntry = z.infer<typeof CandidateCanonicalEntrySchema>;

export const CandidateConversationInsightSchema = z.object({
  key: BoundedId,
  kind: z.enum(['FACT', 'REQUIREMENT', 'DECISION', 'FINDING', 'TASK_HINT', 'CONSTRAINT']),
  summary: BoundedText,
  relation: z.enum(['INDEPENDENT', 'COMPLEMENTS', 'SUPERSEDES', 'CONTRADICTS']),
  targetKey: BoundedId.optional(),
  actionable: z.boolean(),
  candidateWorkItemId: BoundedId.optional(),
  evidenceRefs: z.array(BoundedRef).max(30)
}).strict();
export type CandidateConversationInsight = z.infer<typeof CandidateConversationInsightSchema>;

export const CandidateConversationIntakeSchema = z.object({
  source: z.object({
    sourceType: z.enum(['chatgpt', 'claude', 'other']),
    sourceId: BoundedId,
    observedAt: z.string().datetime({ offset: true })
  }).strict(),
  insights: z.array(CandidateConversationInsightSchema).max(200)
}).strict();
export type CandidateConversationIntake = z.infer<typeof CandidateConversationIntakeSchema>;

export type CandidateConversationDisposition =
  | 'DUPLICATE'
  | 'COMPLEMENT'
  | 'DECISION'
  | 'FINDING'
  | 'TASK'
  | 'CONTRADICTION'
  | 'MEMORY';

export type CandidateConversationReconciliationItem = {
  key: string;
  digest: string;
  disposition: CandidateConversationDisposition;
  memoryAction:
    | 'NONE'
    | 'ADD_CANONICAL_MEMORY'
    | 'ENRICH_CANONICAL_MEMORY'
    | 'ADD_DECISION'
    | 'ADD_FINDING'
    | 'RECORD_TASK_SIGNAL'
    | 'HOLD_FOR_REVIEW';
  taskAction:
    | 'NONE'
    | 'ENRICH_EXISTING_WORK_ITEM'
    | 'PROPOSE_CANDIDATE_WORK_ITEM'
    | 'HOLD_FOR_REVIEW';
  matchedCanonicalKey: string | null;
  matchedWorkItemId: string | null;
  requiresHumanReview: boolean;
};

export type CandidateConversationReconciliation = {
  source: CandidateConversationIntake['source'];
  items: CandidateConversationReconciliationItem[];
  hasContradiction: boolean;
  proposedWorkItemCount: number;
  canonicalMemoryChangeCount: number;
};

function normalizedText(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLocaleLowerCase('en-US');
}

function digestInsight(insight: CandidateConversationInsight): string {
  const canonical = JSON.stringify({
    key: insight.key,
    kind: insight.kind,
    summary: normalizedText(insight.summary),
    relation: insight.relation,
    targetKey: insight.targetKey ?? null,
    actionable: insight.actionable,
    candidateWorkItemId: insight.candidateWorkItemId ?? null,
    evidenceRefs: [...insight.evidenceRefs].sort()
  });
  return createHash('sha256').update(canonical).digest('hex');
}

function matchingWorkItem(
  insight: CandidateConversationInsight,
  workItems: CandidateWorkItem[]
): CandidateWorkItem | null {
  if (insight.candidateWorkItemId) {
    const explicit = workItems.find((item) => item.workItemId === insight.candidateWorkItemId);
    if (explicit) return explicit;
  }
  const keys = new Set([insight.key, insight.targetKey].filter((value): value is string => Boolean(value)));
  return workItems.find((item) => item.intentKeys.some((intentKey) => keys.has(intentKey))) ?? null;
}

export function reconcileConversationIntake(
  rawIntake: CandidateConversationIntake,
  rawCanonicalEntries: CandidateCanonicalEntry[],
  rawWorkItems: CandidateWorkItem[]
): CandidateConversationReconciliation {
  const intake = CandidateConversationIntakeSchema.parse(rawIntake);
  const canonicalEntries = z.array(CandidateCanonicalEntrySchema).max(10_000).parse(rawCanonicalEntries);
  const workItems = z.array(CandidateWorkItemSchema).max(5_000).parse(rawWorkItems);
  const activeCanonical = canonicalEntries.filter((entry) => entry.status === 'ACTIVE');

  const items = intake.insights.map<CandidateConversationReconciliationItem>((insight) => {
    const sameKey = activeCanonical.find((entry) => entry.key === insight.key) ?? null;
    const target = insight.targetKey
      ? activeCanonical.find((entry) => entry.key === insight.targetKey) ?? null
      : sameKey;
    const duplicate = Boolean(
      sameKey && normalizedText(sameKey.summary) === normalizedText(insight.summary)
    );
    const workItem = matchingWorkItem(insight, workItems);

    if (duplicate) {
      return {
        key: insight.key,
        digest: digestInsight(insight),
        disposition: 'DUPLICATE',
        memoryAction: 'NONE',
        taskAction: 'NONE',
        matchedCanonicalKey: sameKey!.key,
        matchedWorkItemId: workItem?.workItemId ?? null,
        requiresHumanReview: false
      };
    }

    if ((insight.relation === 'CONTRADICTS' || insight.relation === 'SUPERSEDES') && target) {
      return {
        key: insight.key,
        digest: digestInsight(insight),
        disposition: 'CONTRADICTION',
        memoryAction: 'HOLD_FOR_REVIEW',
        taskAction: 'HOLD_FOR_REVIEW',
        matchedCanonicalKey: target.key,
        matchedWorkItemId: workItem?.workItemId ?? null,
        requiresHumanReview: true
      };
    }

    let disposition: CandidateConversationDisposition;
    let memoryAction: CandidateConversationReconciliationItem['memoryAction'];

    if (insight.relation === 'COMPLEMENTS' && target) {
      disposition = 'COMPLEMENT';
      memoryAction = 'ENRICH_CANONICAL_MEMORY';
    } else if (insight.kind === 'DECISION') {
      disposition = 'DECISION';
      memoryAction = 'ADD_DECISION';
    } else if (insight.kind === 'FINDING') {
      disposition = 'FINDING';
      memoryAction = 'ADD_FINDING';
    } else if (insight.kind === 'TASK_HINT') {
      disposition = 'TASK';
      memoryAction = 'RECORD_TASK_SIGNAL';
    } else {
      disposition = 'MEMORY';
      memoryAction = sameKey ? 'ENRICH_CANONICAL_MEMORY' : 'ADD_CANONICAL_MEMORY';
    }

    const taskAction: CandidateConversationReconciliationItem['taskAction'] = (
      workItem && insight.actionable
    )
      ? 'ENRICH_EXISTING_WORK_ITEM'
      : (insight.kind === 'TASK_HINT' || insight.actionable)
        ? 'PROPOSE_CANDIDATE_WORK_ITEM'
        : 'NONE';

    return {
      key: insight.key,
      digest: digestInsight(insight),
      disposition,
      memoryAction,
      taskAction,
      matchedCanonicalKey: target?.key ?? sameKey?.key ?? null,
      matchedWorkItemId: workItem?.workItemId ?? null,
      requiresHumanReview: false
    };
  });

  return {
    source: intake.source,
    items,
    hasContradiction: items.some((item) => item.disposition === 'CONTRADICTION'),
    proposedWorkItemCount: items.filter((item) => item.taskAction === 'PROPOSE_CANDIDATE_WORK_ITEM').length,
    canonicalMemoryChangeCount: items.filter((item) => (
      item.memoryAction !== 'NONE' && item.memoryAction !== 'HOLD_FOR_REVIEW'
    )).length
  };
}


const GitShaSchema = z.string().regex(/^[0-9a-f]{40}$/);
const CandidateProviderSchema = z.enum(['chatgpt', 'claude', 'other']);
const ProviderConversationRefProvenanceSchema = z.enum(['PROVIDED_BY_CLIENT', 'UNAVAILABLE']);
const CandidatePrecodeModeSchema = z.enum([
  'NEW_INFORMATION_INTAKE',
  'CONTINUE_PRECODE_WORK',
  'NEW_INFORMATION_THEN_CONTINUE_PRECODE'
]);

export const CandidateConnectionObservationSchema = z.object({
  repository: z.literal('Patricked-code/MCP'),
  branch: z.literal('claude/ecstatic-edison-v1dyt1'),
  observedHeadSha: GitShaSchema,
  agentIdentity: BoundedId,
  provider: CandidateProviderSchema,
  providerConversationRef: BoundedId.nullable(),
  providerConversationRefProvenance: ProviderConversationRefProvenanceSchema,
  githubActor: BoundedId.nullable(),
  githubConnectionRef: BoundedId.nullable(),
  connectionInstanceRef: BoundedId,
  observedAt: z.string().datetime({ offset: true })
}).strict().superRefine((value, ctx) => {
  if (
    value.providerConversationRefProvenance === 'PROVIDED_BY_CLIENT'
    && value.providerConversationRef === null
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['providerConversationRef'],
      message: 'PROVIDER_CONVERSATION_REF_REQUIRED_WHEN_PROVIDED_BY_CLIENT'
    });
  }
  if (
    value.providerConversationRefProvenance === 'UNAVAILABLE'
    && value.providerConversationRef !== null
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['providerConversationRef'],
      message: 'PROVIDER_CONVERSATION_REF_MUST_BE_NULL_WHEN_UNAVAILABLE'
    });
  }
});
export type CandidateConnectionObservation = z.infer<typeof CandidateConnectionObservationSchema>;

export const CandidateSessionSchema = z.object({
  candidateSessionId: BoundedId,
  agentIdentity: BoundedId,
  provider: CandidateProviderSchema,
  providerConversationRef: BoundedId.nullable(),
  providerConversationRefProvenance: ProviderConversationRefProvenanceSchema,
  githubActor: BoundedId.nullable(),
  githubConnectionRef: BoundedId.nullable(),
  connectionInstanceRef: BoundedId.optional(),
  repository: z.literal('Patricked-code/MCP'),
  branch: z.literal('claude/ecstatic-edison-v1dyt1'),
  startingHeadSha: GitShaSchema,
  lastObservedHeadSha: GitShaSchema,
  createdAt: z.string().datetime({ offset: true }),
  lastSeenAt: z.string().datetime({ offset: true }),
  status: z.enum(['ACTIVE', 'CLOSED'])
}).strict();
export type CandidateSession = z.infer<typeof CandidateSessionSchema>;

export type CandidateSessionResolution = {
  status: 'RESUME' | 'CREATE';
  session: CandidateSession;
  matchedBy: 'provider_conversation_ref' | 'github_connection_ref' | 'connection_instance_ref' | 'new_session';
  runtimeMcpRequired: false;
};

function candidateSessionIdFor(connection: CandidateConnectionObservation): string {
  const strongestRef = connection.providerConversationRef
    ? `provider:${connection.provider}:${connection.providerConversationRef}`
    : connection.githubConnectionRef
      ? `github:${connection.githubConnectionRef}`
      : `connection:${connection.connectionInstanceRef}`;
  const digest = createHash('sha256').update(JSON.stringify({
    repository: connection.repository,
    branch: connection.branch,
    agentIdentity: connection.agentIdentity,
    strongestRef
  })).digest('hex');
  return `candidate-${digest.slice(0, 24)}`;
}

function sessionMatch(
  connection: CandidateConnectionObservation,
  sessions: CandidateSession[]
): { session: CandidateSession; matchedBy: CandidateSessionResolution['matchedBy'] } | null {
  const eligible = sessions.filter((session) => (
    session.status === 'ACTIVE'
    && session.repository === connection.repository
    && session.branch === connection.branch
    && session.agentIdentity === connection.agentIdentity
    && session.provider === connection.provider
  ));

  if (connection.providerConversationRef) {
    const match = eligible.find((session) => (
      session.providerConversationRef === connection.providerConversationRef
      && session.providerConversationRefProvenance === 'PROVIDED_BY_CLIENT'
    ));
    if (match) return { session: match, matchedBy: 'provider_conversation_ref' };
  }

  if (connection.githubConnectionRef) {
    const match = eligible.find((session) => (
      session.githubConnectionRef === connection.githubConnectionRef
    ));
    if (match) return { session: match, matchedBy: 'github_connection_ref' };
  }

  const connectionMatch = eligible.find((session) => (
    session.connectionInstanceRef !== undefined
    && session.connectionInstanceRef === connection.connectionInstanceRef
  ));
  return connectionMatch
    ? { session: connectionMatch, matchedBy: 'connection_instance_ref' }
    : null;
}

export function resolveCandidateSession(
  rawConnection: CandidateConnectionObservation,
  rawSessions: CandidateSession[]
): CandidateSessionResolution {
  const connection = CandidateConnectionObservationSchema.parse(rawConnection);
  const sessions = z.array(CandidateSessionSchema).max(10_000).parse(rawSessions);
  const matched = sessionMatch(connection, sessions);

  if (matched) {
    return {
      status: 'RESUME',
      matchedBy: matched.matchedBy,
      runtimeMcpRequired: false,
      session: CandidateSessionSchema.parse({
        ...matched.session,
        githubActor: connection.githubActor ?? matched.session.githubActor,
        githubConnectionRef: connection.githubConnectionRef ?? matched.session.githubConnectionRef,
        connectionInstanceRef: matched.session.connectionInstanceRef ?? connection.connectionInstanceRef,
        lastObservedHeadSha: connection.observedHeadSha,
        lastSeenAt: connection.observedAt
      })
    };
  }

  return {
    status: 'CREATE',
    matchedBy: 'new_session',
    runtimeMcpRequired: false,
    session: CandidateSessionSchema.parse({
      candidateSessionId: candidateSessionIdFor(connection),
      agentIdentity: connection.agentIdentity,
      provider: connection.provider,
      providerConversationRef: connection.providerConversationRef,
      providerConversationRefProvenance: connection.providerConversationRefProvenance,
      githubActor: connection.githubActor,
      githubConnectionRef: connection.githubConnectionRef,
      connectionInstanceRef: connection.connectionInstanceRef,
      repository: connection.repository,
      branch: connection.branch,
      startingHeadSha: connection.observedHeadSha,
      lastObservedHeadSha: connection.observedHeadSha,
      createdAt: connection.observedAt,
      lastSeenAt: connection.observedAt,
      status: 'ACTIVE'
    })
  };
}

export const CandidateConnectionIntentSchema = z.object({
  declaredMode: CandidatePrecodeModeSchema.nullable(),
  hasMaterialNewInformation: z.boolean(),
  requestsContinuation: z.boolean()
}).strict();
export type CandidateConnectionIntent = z.infer<typeof CandidateConnectionIntentSchema>;

export type CandidateConnectionIntentRoute = {
  mode:
    | 'NEW_INFORMATION_INTAKE'
    | 'CONTINUE_PRECODE_WORK'
    | 'NEW_INFORMATION_THEN_CONTINUE_PRECODE'
    | 'ASK_USER';
  askUser: boolean;
  choices: Array<z.infer<typeof CandidatePrecodeModeSchema>>;
  question: string | null;
  reasonCode:
    | 'explicit_precode_mode'
    | 'material_information_detected'
    | 'continuation_requested'
    | 'information_and_continuation_detected'
    | 'ambiguous_connection_intent';
};

const PRECODE_MODE_CHOICES: Array<z.infer<typeof CandidatePrecodeModeSchema>> = [
  'NEW_INFORMATION_INTAKE',
  'CONTINUE_PRECODE_WORK',
  'NEW_INFORMATION_THEN_CONTINUE_PRECODE'
];

export function routeCandidateConnectionIntent(
  rawIntent: CandidateConnectionIntent
): CandidateConnectionIntentRoute {
  const intent = CandidateConnectionIntentSchema.parse(rawIntent);

  if (intent.declaredMode) {
    return {
      mode: intent.declaredMode,
      askUser: false,
      choices: [],
      question: null,
      reasonCode: 'explicit_precode_mode'
    };
  }

  if (intent.hasMaterialNewInformation && intent.requestsContinuation) {
    return {
      mode: 'NEW_INFORMATION_THEN_CONTINUE_PRECODE',
      askUser: false,
      choices: [],
      question: null,
      reasonCode: 'information_and_continuation_detected'
    };
  }

  if (intent.hasMaterialNewInformation) {
    return {
      mode: 'NEW_INFORMATION_INTAKE',
      askUser: false,
      choices: [],
      question: null,
      reasonCode: 'material_information_detected'
    };
  }

  if (intent.requestsContinuation) {
    return {
      mode: 'CONTINUE_PRECODE_WORK',
      askUser: false,
      choices: [],
      question: null,
      reasonCode: 'continuation_requested'
    };
  }

  return {
    mode: 'ASK_USER',
    askUser: true,
    choices: [...PRECODE_MODE_CHOICES],
    question: 'Que viens-tu faire sur cette branche : apporter de nouvelles informations, poursuivre le travail PRECODE, ou apporter des informations puis poursuivre automatiquement ?',
    reasonCode: 'ambiguous_connection_intent'
  };
}

export const CandidateBootstrapInputSchema = z.object({
  connection: CandidateConnectionObservationSchema,
  intent: CandidateConnectionIntentSchema,
  sessions: z.array(CandidateSessionSchema).max(10_000),
  workItems: z.array(CandidateWorkItemSchema).max(5_000),
  activeClaims: z.array(CandidateWorkClaimSchema).max(5_000)
}).strict();
export type CandidateBootstrapInput = z.infer<typeof CandidateBootstrapInputSchema>;

export type CandidateBootstrapResult = {
  runtimeMcpRequired: false;
  sessionResolution: CandidateSessionResolution;
  intent: CandidateConnectionIntentRoute;
  dispatch: CandidateDispatchResult | null;
  requiresUserChoice: boolean;
};

export function bootstrapCandidateConnection(
  rawInput: CandidateBootstrapInput
): CandidateBootstrapResult {
  const input = CandidateBootstrapInputSchema.parse(rawInput);
  const sessionResolution = resolveCandidateSession(input.connection, input.sessions);
  const intent = routeCandidateConnectionIntent(input.intent);
  const shouldDispatch = (
    intent.mode === 'CONTINUE_PRECODE_WORK'
    || intent.mode === 'NEW_INFORMATION_THEN_CONTINUE_PRECODE'
  );

  return {
    runtimeMcpRequired: false,
    sessionResolution,
    intent,
    dispatch: shouldDispatch
      ? dispatchCandidateWork({
          candidateSessionId: sessionResolution.session.candidateSessionId,
          agentIdentity: sessionResolution.session.agentIdentity,
          workItems: input.workItems,
          activeClaims: input.activeClaims
        })
      : null,
    requiresUserChoice: intent.mode === 'ASK_USER'
  };
}


const Sha256HexSchema = z.string().regex(/^[0-9a-f]{64}$/);
const CandidateIntakeSequenceSchema = z.number().int().positive();

export const CandidateIntakeContinuityCursorSchema = z.object({
  latestIntakeSequence: z.number().int().nonnegative(),
  reconciledThroughSequence: z.number().int().nonnegative(),
  canonicalRevision: z.number().int().nonnegative(),
  backlogRevision: z.number().int().nonnegative(),
  lastReconciliationDigest: Sha256HexSchema.nullable(),
  pendingIntakeIds: z.array(BoundedId).max(10_000)
}).strict().superRefine((value, ctx) => {
  if (value.reconciledThroughSequence > value.latestIntakeSequence) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['reconciledThroughSequence'],
      message: 'RECONCILED_SEQUENCE_CANNOT_EXCEED_LATEST_SEQUENCE'
    });
  }
});
export type CandidateIntakeContinuityCursor = z.infer<typeof CandidateIntakeContinuityCursorSchema>;

export const CandidateIntakeLifecycleStateSchema = z.enum([
  'RECEIVED',
  'STRUCTURED',
  'EVALUATED',
  'RECONCILED',
  'BOUND',
  'APPLIED',
  'ATTESTED',
  'HOLD_FOR_REVIEW',
  'ARCHIVED_NO_EFFECT',
  'REJECTED'
]);
export type CandidateIntakeLifecycleState = z.infer<typeof CandidateIntakeLifecycleStateSchema>;

export const CandidateRegisteredIntakeSchema = z.object({
  intakeId: BoundedId,
  sequence: CandidateIntakeSequenceSchema,
  status: z.literal('RECEIVED'),
  sourceType: z.enum(['chatgpt', 'claude', 'other']),
  sourceId: BoundedId,
  sourceDigest: Sha256HexSchema,
  observedAt: z.string().datetime({ offset: true })
}).strict();
export type CandidateRegisteredIntake = z.infer<typeof CandidateRegisteredIntakeSchema>;

export const CandidateIntakeRegistrationInputSchema = z.object({
  cursor: CandidateIntakeContinuityCursorSchema,
  sourceType: z.enum(['chatgpt', 'claude', 'other']),
  sourceId: BoundedId,
  sourceDigest: Sha256HexSchema,
  observedAt: z.string().datetime({ offset: true })
}).strict();
export type CandidateIntakeRegistrationInput = z.infer<typeof CandidateIntakeRegistrationInputSchema>;

function intakeIdForSequence(sequence: number): string {
  return `NEW_INFORMATION_INTAKE-${String(sequence).padStart(3, '0')}`;
}

export function registerCandidateIntake(rawInput: CandidateIntakeRegistrationInput): {
  intake: CandidateRegisteredIntake;
  cursor: CandidateIntakeContinuityCursor;
} {
  const input = CandidateIntakeRegistrationInputSchema.parse(rawInput);
  const sequence = input.cursor.latestIntakeSequence + 1;
  const intakeId = intakeIdForSequence(sequence);
  const intake = CandidateRegisteredIntakeSchema.parse({
    intakeId,
    sequence,
    status: 'RECEIVED',
    sourceType: input.sourceType,
    sourceId: input.sourceId,
    sourceDigest: input.sourceDigest,
    observedAt: input.observedAt
  });

  return {
    intake,
    cursor: CandidateIntakeContinuityCursorSchema.parse({
      ...input.cursor,
      latestIntakeSequence: sequence,
      pendingIntakeIds: unique([...input.cursor.pendingIntakeIds, intakeId])
    })
  };
}

const CandidateIntakeRelevanceSchema = z.enum(['RELEVANT', 'PARTIAL', 'OUT_OF_SCOPE']);
const CandidateIntakeEvidenceSchema = z.enum(['VERIFIED', 'PLAUSIBLE', 'UNVERIFIED']);
const CandidateIntakeObjectiveAlignmentSchema = z.enum(['ALIGNED', 'PARTIAL', 'MISALIGNED']);
const CandidateIntakeRelationSchema = z.enum([
  'DUPLICATE',
  'COMPLEMENT',
  'EXTENSION',
  'CONTRADICTION',
  'SUPERSESSION',
  'NEW'
]);
const CandidateIntakeArchitecturalFitSchema = z.enum(['FITS', 'FITS_WITH_ADAPTATION', 'CONFLICTS']);
const CandidateIntakeAuthorityFitSchema = z.enum([
  'PRESERVES_EXISTING_AUTHORITIES',
  'REQUIRES_RECONCILIATION',
  'CREATES_PARALLEL_AUTHORITY'
]);
const CandidateIntakeNonRegressionSchema = z.enum(['SAFE', 'REQUIRES_COMPATIBILITY_WORK', 'BREAKING']);
const CandidateIntakeImpactSchema = z.enum(['NONE', 'LOCAL', 'MULTI_CONTRACT', 'PROGRAM_WIDE']);
const CandidateExistingFirstPathSchema = z.enum([
  'REUSE',
  'WRAP',
  'GENERALIZE',
  'EXTEND',
  'NEW',
  'NONE'
]);

export const CandidateIntakeGateFactsSchema = z.object({
  understood: z.boolean(),
  relevance: CandidateIntakeRelevanceSchema,
  evidence: CandidateIntakeEvidenceSchema,
  evidenceRequired: z.boolean(),
  objectiveAlignment: CandidateIntakeObjectiveAlignmentSchema,
  relationToExisting: CandidateIntakeRelationSchema,
  architecturalFit: CandidateIntakeArchitecturalFitSchema,
  authorityFit: CandidateIntakeAuthorityFitSchema,
  nonRegression: CandidateIntakeNonRegressionSchema,
  impact: CandidateIntakeImpactSchema,
  existingFirstPath: CandidateExistingFirstPathSchema
}).strict();
export type CandidateIntakeGateFacts = z.infer<typeof CandidateIntakeGateFactsSchema>;

export const CandidateIntakeGateInputSchema = CandidateIntakeGateFactsSchema.extend({
  intakeId: BoundedId,
  sequence: CandidateIntakeSequenceSchema,
  affectedScopes: z.array(BoundedId).max(200),
  affectedContracts: z.array(BoundedId).max(200),
  affectedBlueprints: z.array(BoundedId).max(200),
  affectedWorkItems: z.array(BoundedId).max(500),
  affectedAuthorities: z.array(BoundedId).max(200)
}).strict();
export type CandidateIntakeGateInput = z.infer<typeof CandidateIntakeGateInputSchema>;

export type CandidateIntakeIntegrationVerdict =
  | 'ACCEPT'
  | 'ACCEPT_WITH_ADAPTATION'
  | 'COMPLEMENT'
  | 'DUPLICATE'
  | 'DEFER'
  | 'HOLD_FOR_REVIEW'
  | 'OUT_OF_SCOPE'
  | 'REJECT';

export type CandidateIntakeGateResult = CandidateIntakeGateInput & {
  verdict: CandidateIntakeIntegrationVerdict;
  shouldIntegrate: boolean;
  reasonCodes: string[];
};

export function evaluateCandidateIntakeGate(rawInput: CandidateIntakeGateInput): CandidateIntakeGateResult {
  const input = CandidateIntakeGateInputSchema.parse(rawInput);
  const result = (
    verdict: CandidateIntakeIntegrationVerdict,
    shouldIntegrate: boolean,
    reasonCodes: string[]
  ): CandidateIntakeGateResult => ({
    ...input,
    verdict,
    shouldIntegrate,
    reasonCodes
  });

  if (!input.understood) {
    return result('HOLD_FOR_REVIEW', false, ['INTAKE_NOT_UNDERSTOOD']);
  }

  if (input.relevance === 'OUT_OF_SCOPE' || input.objectiveAlignment === 'MISALIGNED') {
    return result('OUT_OF_SCOPE', false, [
      input.relevance === 'OUT_OF_SCOPE' ? 'PROGRAM_OUT_OF_SCOPE' : 'OBJECTIVE_MISALIGNED'
    ]);
  }

  if (input.relationToExisting === 'DUPLICATE') {
    return result('DUPLICATE', false, ['EQUIVALENT_CAPABILITY_ALREADY_EXISTS']);
  }

  if (input.authorityFit === 'CREATES_PARALLEL_AUTHORITY') {
    return result('REJECT', false, ['PARALLEL_AUTHORITY']);
  }

  if (input.evidenceRequired && input.evidence === 'UNVERIFIED') {
    return result('DEFER', false, ['EVIDENCE_REQUIRED_UNVERIFIED']);
  }

  if (
    input.relationToExisting === 'CONTRADICTION'
    || input.relationToExisting === 'SUPERSESSION'
  ) {
    return result('HOLD_FOR_REVIEW', false, ['CANONICAL_CONFLICT_REQUIRES_RECONCILIATION']);
  }

  if (input.architecturalFit === 'CONFLICTS') {
    return result('HOLD_FOR_REVIEW', false, ['ARCHITECTURAL_CONFLICT']);
  }

  if (input.nonRegression === 'BREAKING') {
    return result('HOLD_FOR_REVIEW', false, ['BREAKING_CHANGE_REQUIRES_REVIEW']);
  }

  const adaptationRequired = (
    input.relevance === 'PARTIAL'
    || input.objectiveAlignment === 'PARTIAL'
    || input.architecturalFit === 'FITS_WITH_ADAPTATION'
    || input.authorityFit === 'REQUIRES_RECONCILIATION'
    || input.nonRegression === 'REQUIRES_COMPATIBILITY_WORK'
  );

  if (adaptationRequired) {
    return result('ACCEPT_WITH_ADAPTATION', true, ['EXISTING_FIRST_ADAPTATION_REQUIRED']);
  }

  if (input.relationToExisting === 'COMPLEMENT') {
    return result('COMPLEMENT', true, ['COMPLEMENTS_EXISTING_CANONICAL_STATE']);
  }

  return result('ACCEPT', true, ['COHERENCE_GATE_PASS']);
}

const CandidateCanonicalEffectSchema = z.enum(['NONE', 'ADD', 'ENRICH']);
const CandidateBacklogEffectSchema = z.enum([
  'NONE',
  'ENRICH_EXISTING_WORK',
  'PROPOSE_NEW_WORK',
  'MARK_RECONCILE_REQUIRED'
]);

export const CandidateStructuredIntakeSchema = z.object({
  intakeId: BoundedId,
  sequence: CandidateIntakeSequenceSchema,
  gate: CandidateIntakeGateFactsSchema,
  affectedScopes: z.array(BoundedId).max(200),
  affectedContracts: z.array(BoundedId).max(200),
  affectedBlueprints: z.array(BoundedId).max(200),
  affectedWorkItems: z.array(BoundedId).max(500),
  affectedAuthorities: z.array(BoundedId).max(200),
  canonicalEffect: CandidateCanonicalEffectSchema,
  backlogEffect: CandidateBacklogEffectSchema
}).strict();
export type CandidateStructuredIntake = z.infer<typeof CandidateStructuredIntakeSchema>;

export const CandidateIntakeBatchInputSchema = z.object({
  cursor: CandidateIntakeContinuityCursorSchema,
  intakes: z.array(CandidateStructuredIntakeSchema).max(1_000)
}).strict();
export type CandidateIntakeBatchInput = z.infer<typeof CandidateIntakeBatchInputSchema>;

export type CandidateIntakeReconciliationReceipt = {
  fromSequence: number;
  throughSequence: number;
  intakeIds: string[];
  previousCanonicalRevision: number;
  resultingCanonicalRevision: number;
  previousBacklogRevision: number;
  resultingBacklogRevision: number;
  effects: {
    duplicates: string[];
    complements: string[];
    accepted: string[];
    acceptedWithAdaptation: string[];
    deferred: string[];
    heldForReview: string[];
    outOfScope: string[];
    rejected: string[];
    tasksCreated: string[];
    tasksEnriched: string[];
    tasksReconcileRequired: string[];
  };
  digest: string;
};

export type CandidateIntakeBatchResult = {
  status: 'RECONCILED' | 'BLOCKED_GAP' | 'NOOP';
  expectedNextSequence: number;
  cursor: CandidateIntakeContinuityCursor;
  receipt: CandidateIntakeReconciliationReceipt | null;
  evaluations: CandidateIntakeGateResult[];
};

function receiptDigest(receipt: Omit<CandidateIntakeReconciliationReceipt, 'digest'>): string {
  return createHash('sha256').update(JSON.stringify(receipt)).digest('hex');
}

export function reconcileCandidateIntakeBatch(rawInput: CandidateIntakeBatchInput): CandidateIntakeBatchResult {
  const input = CandidateIntakeBatchInputSchema.parse(rawInput);
  const expectedNextSequence = input.cursor.reconciledThroughSequence + 1;
  if (input.intakes.length === 0) {
    return {
      status: 'NOOP',
      expectedNextSequence,
      cursor: input.cursor,
      receipt: null,
      evaluations: []
    };
  }

  const intakes = [...input.intakes].sort((left, right) => (
    left.sequence - right.sequence || left.intakeId.localeCompare(right.intakeId)
  ));

  if (intakes[0]!.sequence !== expectedNextSequence) {
    return {
      status: 'BLOCKED_GAP',
      expectedNextSequence,
      cursor: input.cursor,
      receipt: null,
      evaluations: []
    };
  }

  for (let index = 1; index < intakes.length; index += 1) {
    if (intakes[index]!.sequence !== intakes[index - 1]!.sequence + 1) {
      return {
        status: 'BLOCKED_GAP',
        expectedNextSequence,
        cursor: input.cursor,
        receipt: null,
        evaluations: []
      };
    }
  }

  const evaluations = intakes.map((intake) => evaluateCandidateIntakeGate({
    intakeId: intake.intakeId,
    sequence: intake.sequence,
    ...intake.gate,
    affectedScopes: intake.affectedScopes,
    affectedContracts: intake.affectedContracts,
    affectedBlueprints: intake.affectedBlueprints,
    affectedWorkItems: intake.affectedWorkItems,
    affectedAuthorities: intake.affectedAuthorities
  }));

  const integrated = intakes.filter((intake, index) => evaluations[index]!.shouldIntegrate);
  const canonicalChanged = integrated.some((intake) => intake.canonicalEffect !== 'NONE');
  const backlogChanged = integrated.some((intake) => intake.backlogEffect !== 'NONE');
  const evaluationById = new Map(evaluations.map((evaluation) => [evaluation.intakeId, evaluation]));

  const effects = {
    duplicates: evaluations.filter((e) => e.verdict === 'DUPLICATE').map((e) => e.intakeId),
    complements: evaluations.filter((e) => e.verdict === 'COMPLEMENT').map((e) => e.intakeId),
    accepted: evaluations.filter((e) => e.verdict === 'ACCEPT').map((e) => e.intakeId),
    acceptedWithAdaptation: evaluations.filter((e) => e.verdict === 'ACCEPT_WITH_ADAPTATION').map((e) => e.intakeId),
    deferred: evaluations.filter((e) => e.verdict === 'DEFER').map((e) => e.intakeId),
    heldForReview: evaluations.filter((e) => e.verdict === 'HOLD_FOR_REVIEW').map((e) => e.intakeId),
    outOfScope: evaluations.filter((e) => e.verdict === 'OUT_OF_SCOPE').map((e) => e.intakeId),
    rejected: evaluations.filter((e) => e.verdict === 'REJECT').map((e) => e.intakeId),
    tasksCreated: integrated
      .filter((i) => i.backlogEffect === 'PROPOSE_NEW_WORK')
      .map((i) => i.intakeId),
    tasksEnriched: integrated
      .filter((i) => i.backlogEffect === 'ENRICH_EXISTING_WORK')
      .map((i) => i.intakeId),
    tasksReconcileRequired: integrated
      .filter((i) => i.backlogEffect === 'MARK_RECONCILE_REQUIRED')
      .map((i) => i.intakeId)
  };

  // Keep an explicit read of the map in the deterministic projection so a later
  // extension can bind per-intake effects without changing receipt semantics.
  for (const intake of intakes) {
    if (!evaluationById.has(intake.intakeId)) {
      throw new Error('INTAKE_EVALUATION_MISSING');
    }
  }

  const receiptWithoutDigest: Omit<CandidateIntakeReconciliationReceipt, 'digest'> = {
    fromSequence: intakes[0]!.sequence,
    throughSequence: intakes[intakes.length - 1]!.sequence,
    intakeIds: intakes.map((intake) => intake.intakeId),
    previousCanonicalRevision: input.cursor.canonicalRevision,
    resultingCanonicalRevision: input.cursor.canonicalRevision + (canonicalChanged ? 1 : 0),
    previousBacklogRevision: input.cursor.backlogRevision,
    resultingBacklogRevision: input.cursor.backlogRevision + (backlogChanged ? 1 : 0),
    effects
  };
  const digest = receiptDigest(receiptWithoutDigest);
  const receipt: CandidateIntakeReconciliationReceipt = {
    ...receiptWithoutDigest,
    digest
  };
  const reconciledIds = new Set(receipt.intakeIds);

  const cursor = CandidateIntakeContinuityCursorSchema.parse({
    latestIntakeSequence: Math.max(
      input.cursor.latestIntakeSequence,
      receipt.throughSequence
    ),
    reconciledThroughSequence: receipt.throughSequence,
    canonicalRevision: receipt.resultingCanonicalRevision,
    backlogRevision: receipt.resultingBacklogRevision,
    lastReconciliationDigest: digest,
    pendingIntakeIds: input.cursor.pendingIntakeIds.filter((id) => !reconciledIds.has(id))
  });

  return {
    status: 'RECONCILED',
    expectedNextSequence: cursor.reconciledThroughSequence + 1,
    cursor,
    receipt,
    evaluations
  };
}

export const CandidateKnowledgeImpactSchema = z.object({
  intakeId: BoundedId,
  sequence: CandidateIntakeSequenceSchema,
  affectedWorkItems: z.array(BoundedId).max(500),
  affectedBlueprints: z.array(BoundedId).max(200),
  affectedContracts: z.array(BoundedId).max(200),
  globalImpact: z.boolean().optional()
}).strict();
export type CandidateKnowledgeImpact = z.infer<typeof CandidateKnowledgeImpactSchema>;

export const CandidateKnowledgeFreshnessInputSchema = z.object({
  expectedHeadSha: GitShaSchema,
  currentHeadSha: GitShaSchema,
  expectedCanonicalRevision: z.number().int().nonnegative(),
  currentCanonicalRevision: z.number().int().nonnegative(),
  expectedBacklogRevision: z.number().int().nonnegative(),
  currentBacklogRevision: z.number().int().nonnegative(),
  workItemId: BoundedId,
  changedIntakes: z.array(CandidateKnowledgeImpactSchema).max(1_000)
}).strict();
export type CandidateKnowledgeFreshnessInput = z.infer<typeof CandidateKnowledgeFreshnessInputSchema>;

export type CandidateKnowledgeFreshnessResult = {
  status:
    | 'CURRENT'
    | 'HEAD_MOVED'
    | 'KNOWLEDGE_STALE_NO_LOCAL_IMPACT'
    | 'RECONCILE_REQUIRED';
  mayContinueAfterLogicalRebase: boolean;
  relevantIntakeIds: string[];
  headCurrent: boolean;
  canonicalRevisionCurrent: boolean;
  backlogRevisionCurrent: boolean;
};

export function assessCandidateKnowledgeFreshness(
  rawInput: CandidateKnowledgeFreshnessInput
): CandidateKnowledgeFreshnessResult {
  const input = CandidateKnowledgeFreshnessInputSchema.parse(rawInput);
  const headCurrent = input.expectedHeadSha === input.currentHeadSha;
  const canonicalRevisionCurrent = input.expectedCanonicalRevision === input.currentCanonicalRevision;
  const backlogRevisionCurrent = input.expectedBacklogRevision === input.currentBacklogRevision;

  if (!headCurrent) {
    return {
      status: 'HEAD_MOVED',
      mayContinueAfterLogicalRebase: false,
      relevantIntakeIds: [],
      headCurrent,
      canonicalRevisionCurrent,
      backlogRevisionCurrent
    };
  }

  if (canonicalRevisionCurrent && backlogRevisionCurrent) {
    return {
      status: 'CURRENT',
      mayContinueAfterLogicalRebase: true,
      relevantIntakeIds: [],
      headCurrent,
      canonicalRevisionCurrent,
      backlogRevisionCurrent
    };
  }

  const relevant = input.changedIntakes.filter((impact) => (
    impact.globalImpact === true
    || impact.affectedWorkItems.includes(input.workItemId)
  ));
  const relevantIntakeIds = relevant.map((impact) => impact.intakeId);

  if (relevantIntakeIds.length > 0) {
    return {
      status: 'RECONCILE_REQUIRED',
      mayContinueAfterLogicalRebase: false,
      relevantIntakeIds,
      headCurrent,
      canonicalRevisionCurrent,
      backlogRevisionCurrent
    };
  }

  return {
    status: 'KNOWLEDGE_STALE_NO_LOCAL_IMPACT',
    mayContinueAfterLogicalRebase: true,
    relevantIntakeIds: [],
    headCurrent,
    canonicalRevisionCurrent,
    backlogRevisionCurrent
  };
}

// -----------------------------------------------------------------------------
// NEW_INFORMATION_INTAKE-003 — bounded discovery/liveness/recovery extensions.
// These primitives are deliberately pure projections over existing PRECODE
// authorities. They do not persist heartbeat state, transfer claims, authorize
// writes, execute discovered instructions or create a second session authority.
// -----------------------------------------------------------------------------

export const CandidateDiscoveredIntakeSourceSchema = z.object({
  sourceType: CandidateProviderSchema,
  sourceId: BoundedId,
  sourceDigest: Sha256HexSchema,
  observedAt: z.string().datetime({ offset: true })
}).strict();
export type CandidateDiscoveredIntakeSource = z.infer<typeof CandidateDiscoveredIntakeSourceSchema>;

export const CandidateIntakeDiscoveryInputSchema = z.object({
  registeredIntakes: z.array(CandidateRegisteredIntakeSchema).max(10_000),
  discoveredSources: z.array(CandidateDiscoveredIntakeSourceSchema).max(1_000)
}).strict();
export type CandidateIntakeDiscoveryInput = z.infer<typeof CandidateIntakeDiscoveryInputSchema>;

export type CandidateIntakeDiscoveryResult = Readonly<{
  unseen: readonly CandidateDiscoveredIntakeSource[];
  duplicateSourceIds: readonly string[];
  executesInstructions: false;
}>;

export function discoverCandidateIntakeSources(
  rawInput: CandidateIntakeDiscoveryInput
): CandidateIntakeDiscoveryResult {
  const input = CandidateIntakeDiscoveryInputSchema.parse(rawInput);
  const knownDigests = new Set(input.registeredIntakes.map((entry) => entry.sourceDigest));
  const knownSources = new Set(input.registeredIntakes.map(
    (entry) => `${entry.sourceType}:${entry.sourceId}`
  ));
  const batchDigests = new Set<string>();
  const batchSources = new Set<string>();
  const unseen: CandidateDiscoveredIntakeSource[] = [];
  const duplicates: string[] = [];

  const ordered = [...input.discoveredSources].sort((left, right) => (
    Date.parse(left.observedAt) - Date.parse(right.observedAt)
    || left.sourceId.localeCompare(right.sourceId)
    || left.sourceDigest.localeCompare(right.sourceDigest)
  ));

  for (const source of ordered) {
    const sourceKey = `${source.sourceType}:${source.sourceId}`;
    const duplicate = (
      knownDigests.has(source.sourceDigest)
      || knownSources.has(sourceKey)
      || batchDigests.has(source.sourceDigest)
      || batchSources.has(sourceKey)
    );
    if (duplicate) {
      duplicates.push(source.sourceId);
      continue;
    }
    unseen.push(source);
    batchDigests.add(source.sourceDigest);
    batchSources.add(sourceKey);
  }

  return Object.freeze({
    unseen: Object.freeze(unseen.map((entry) => Object.freeze({ ...entry }))),
    duplicateSourceIds: Object.freeze(unique(duplicates)),
    executesInstructions: false as const
  });
}

export const CANDIDATE_HEARTBEAT_POLICY = Object.freeze({
  schemaVersion: 1 as const,
  emissionIntervalSeconds: 60,
  freshForSeconds: 120,
  markerPrefix: 'GWC_PRECODE_LIVENESS' as const,
  transport: 'PR_TOP_LEVEL_MUTABLE_COMMENT' as const,
  movesBranchHead: false as const,
  versionedPersistence: false as const
});

const CandidateHeartbeatSessionIdSchema = z.string()
  .trim()
  .min(1)
  .max(160)
  .regex(/^[A-Za-z0-9._:-]+$/);

export const CandidateHeartbeatActionSchema = z.enum([
  'REOBSERVING',
  'ANALYZING',
  'EDITING',
  'RUNNING_TESTS',
  'WAITING_CI',
  'SELF_REVIEW',
  'CHECKPOINTING',
  'WAITING_USER',
  'YIELDED',
  'UNKNOWN'
]);
export type CandidateHeartbeatAction = z.infer<typeof CandidateHeartbeatActionSchema>;

export const CandidateHeartbeatSchema = z.object({
  schemaVersion: z.literal(1),
  candidateSessionId: CandidateHeartbeatSessionIdSchema,
  agentIdentity: BoundedId,
  workItemId: BoundedId.nullable(),
  heartbeatSequence: z.number().int().min(1).max(Number.MAX_SAFE_INTEGER),
  emittedAt: z.string().datetime({ offset: true }),
  observedHeadSha: GitShaSchema,
  currentAction: CandidateHeartbeatActionSchema,
  evidenceRef: BoundedRef.optional()
}).strict();
export type CandidateHeartbeat = z.infer<typeof CandidateHeartbeatSchema>;

export function candidateHeartbeatMarker(candidateSessionId: string): string {
  const sessionId = CandidateHeartbeatSessionIdSchema.parse(candidateSessionId);
  return `<!-- ${CANDIDATE_HEARTBEAT_POLICY.markerPrefix}:${sessionId} -->`;
}

export function formatCandidateHeartbeatComment(rawHeartbeat: CandidateHeartbeat): string {
  const heartbeat = CandidateHeartbeatSchema.parse(rawHeartbeat);
  return [
    candidateHeartbeatMarker(heartbeat.candidateSessionId),
    '```json',
    JSON.stringify(heartbeat, null, 2),
    '```'
  ].join('\n');
}

export type CandidateHeartbeatParseResult = Readonly<{
  status: 'VALID' | 'INVALID' | 'NOT_HEARTBEAT';
  reasonCode:
    | 'HEARTBEAT_VALID'
    | 'HEARTBEAT_MARKER_MISSING'
    | 'HEARTBEAT_MARKER_SESSION_MISMATCH'
    | 'HEARTBEAT_JSON_INVALID'
    | 'HEARTBEAT_PAYLOAD_INVALID';
  heartbeat: CandidateHeartbeat | null;
  transient: true;
  movesBranchHead: false;
  authorizationGranted: false;
  claimTransferAllowed: false;
}>;

export function parseCandidateHeartbeatComment(rawBody: string): CandidateHeartbeatParseResult {
  const body = z.string().max(20_000).parse(rawBody);
  const markerMatch = body.match(/<!--\s*GWC_PRECODE_LIVENESS:([A-Za-z0-9._:-]{1,160})\s*-->/);
  const base = {
    transient: true as const,
    movesBranchHead: false as const,
    authorizationGranted: false as const,
    claimTransferAllowed: false as const
  };
  if (!markerMatch) {
    return Object.freeze({
      ...base,
      status: 'NOT_HEARTBEAT' as const,
      reasonCode: 'HEARTBEAT_MARKER_MISSING' as const,
      heartbeat: null
    });
  }

  const markerSessionId = markerMatch[1]!;
  const afterMarker = body.slice((markerMatch.index ?? 0) + markerMatch[0].length).trim();
  const fenced = afterMarker.match(/^```json\s*([\s\S]*?)\s*```/i);
  const jsonText = fenced?.[1]?.trim() ?? afterMarker;

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(jsonText);
  } catch {
    return Object.freeze({
      ...base,
      status: 'INVALID' as const,
      reasonCode: 'HEARTBEAT_JSON_INVALID' as const,
      heartbeat: null
    });
  }

  const parsedHeartbeat = CandidateHeartbeatSchema.safeParse(parsedJson);
  if (!parsedHeartbeat.success) {
    return Object.freeze({
      ...base,
      status: 'INVALID' as const,
      reasonCode: 'HEARTBEAT_PAYLOAD_INVALID' as const,
      heartbeat: null
    });
  }
  if (parsedHeartbeat.data.candidateSessionId !== markerSessionId) {
    return Object.freeze({
      ...base,
      status: 'INVALID' as const,
      reasonCode: 'HEARTBEAT_MARKER_SESSION_MISMATCH' as const,
      heartbeat: null
    });
  }

  return Object.freeze({
    ...base,
    status: 'VALID' as const,
    reasonCode: 'HEARTBEAT_VALID' as const,
    heartbeat: Object.freeze({ ...parsedHeartbeat.data })
  });
}

export const CandidateHeartbeatCommentInputSchema = z.object({
  commentId: z.union([z.number().int().nonnegative(), BoundedId]),
  updatedAt: z.string().datetime({ offset: true }),
  body: z.string().max(20_000)
}).strict();
export type CandidateHeartbeatCommentInput = z.infer<typeof CandidateHeartbeatCommentInputSchema>;

export const CandidateHeartbeatCollectionInputSchema = z.object({
  candidateSessionId: CandidateHeartbeatSessionIdSchema,
  comments: z.array(CandidateHeartbeatCommentInputSchema).max(5_000)
}).strict();
export type CandidateHeartbeatCollectionInput = z.infer<typeof CandidateHeartbeatCollectionInputSchema>;

export type CandidateHeartbeatCollectionResult = Readonly<{
  status: 'FOUND' | 'MISSING' | 'AMBIGUOUS' | 'INVALID';
  reasonCode:
    | 'HEARTBEAT_COMMENT_FOUND'
    | 'HEARTBEAT_COMMENT_MISSING'
    | 'HEARTBEAT_DUPLICATE_COMMENTS'
    | 'HEARTBEAT_COMMENT_INVALID';
  commentId: string | number | null;
  updatedAt: string | null;
  heartbeat: CandidateHeartbeat | null;
  transient: true;
  authorizationGranted: false;
  claimTransferAllowed: false;
  ownershipChanged: false;
}>;

export function collectCandidateHeartbeatComments(
  rawInput: CandidateHeartbeatCollectionInput
): CandidateHeartbeatCollectionResult {
  const input = CandidateHeartbeatCollectionInputSchema.parse(rawInput);
  const expectedMarker = candidateHeartbeatMarker(input.candidateSessionId);
  const matching = input.comments.filter((comment) => comment.body.includes(expectedMarker));
  const base = {
    transient: true as const,
    authorizationGranted: false as const,
    claimTransferAllowed: false as const,
    ownershipChanged: false as const
  };

  if (matching.length === 0) {
    return Object.freeze({
      ...base,
      status: 'MISSING' as const,
      reasonCode: 'HEARTBEAT_COMMENT_MISSING' as const,
      commentId: null,
      updatedAt: null,
      heartbeat: null
    });
  }
  if (matching.length !== 1) {
    return Object.freeze({
      ...base,
      status: 'AMBIGUOUS' as const,
      reasonCode: 'HEARTBEAT_DUPLICATE_COMMENTS' as const,
      commentId: null,
      updatedAt: null,
      heartbeat: null
    });
  }

  const comment = matching[0]!;
  const parsed = parseCandidateHeartbeatComment(comment.body);
  if (parsed.status !== 'VALID' || parsed.heartbeat === null) {
    return Object.freeze({
      ...base,
      status: 'INVALID' as const,
      reasonCode: 'HEARTBEAT_COMMENT_INVALID' as const,
      commentId: comment.commentId,
      updatedAt: comment.updatedAt,
      heartbeat: null
    });
  }

  return Object.freeze({
    ...base,
    status: 'FOUND' as const,
    reasonCode: 'HEARTBEAT_COMMENT_FOUND' as const,
    commentId: comment.commentId,
    updatedAt: comment.updatedAt,
    heartbeat: parsed.heartbeat
  });
}

export const CandidateHeartbeatBindingInputSchema = z.object({
  heartbeat: CandidateHeartbeatSchema,
  candidateSession: CandidateSessionSchema,
  activeClaim: CandidateWorkClaimSchema.nullable(),
  currentHeadSha: GitShaSchema,
  previousHeartbeat: CandidateHeartbeatSchema.nullable()
}).strict();
export type CandidateHeartbeatBindingInput = z.infer<typeof CandidateHeartbeatBindingInputSchema>;

export type CandidateHeartbeatBindingResult = Readonly<{
  status: 'BOUND' | 'BOUND_SESSION_ONLY' | 'INVALID';
  reasonCode:
    | 'HEARTBEAT_BOUND'
    | 'HEARTBEAT_SESSION_BOUND_NO_CLAIM'
    | 'HEARTBEAT_SESSION_INACTIVE'
    | 'HEARTBEAT_SESSION_MISMATCH'
    | 'HEARTBEAT_AGENT_MISMATCH'
    | 'HEARTBEAT_CLAIM_MISMATCH'
    | 'HEARTBEAT_HEAD_MISMATCH'
    | 'HEARTBEAT_SEQUENCE_NOT_MONOTONE'
    | 'HEARTBEAT_TIME_NOT_MONOTONE';
  authorizationGranted: false;
  claimTransferAllowed: false;
  ownershipChanged: false;
}>;

export function validateCandidateHeartbeatBinding(
  rawInput: CandidateHeartbeatBindingInput
): CandidateHeartbeatBindingResult {
  const input = CandidateHeartbeatBindingInputSchema.parse(rawInput);
  const base = {
    authorizationGranted: false as const,
    claimTransferAllowed: false as const,
    ownershipChanged: false as const
  };
  const heartbeat = input.heartbeat;
  const session = input.candidateSession;
  const claim = input.activeClaim;

  if (session.status !== 'ACTIVE') {
    return Object.freeze({ ...base, status: 'INVALID' as const, reasonCode: 'HEARTBEAT_SESSION_INACTIVE' as const });
  }
  if (heartbeat.candidateSessionId !== session.candidateSessionId) {
    return Object.freeze({ ...base, status: 'INVALID' as const, reasonCode: 'HEARTBEAT_SESSION_MISMATCH' as const });
  }
  if (heartbeat.agentIdentity !== session.agentIdentity) {
    return Object.freeze({ ...base, status: 'INVALID' as const, reasonCode: 'HEARTBEAT_AGENT_MISMATCH' as const });
  }
  if (heartbeat.observedHeadSha !== input.currentHeadSha) {
    return Object.freeze({ ...base, status: 'INVALID' as const, reasonCode: 'HEARTBEAT_HEAD_MISMATCH' as const });
  }
  if (input.previousHeartbeat) {
    if (
      input.previousHeartbeat.candidateSessionId !== heartbeat.candidateSessionId
      || heartbeat.heartbeatSequence <= input.previousHeartbeat.heartbeatSequence
    ) {
      return Object.freeze({ ...base, status: 'INVALID' as const, reasonCode: 'HEARTBEAT_SEQUENCE_NOT_MONOTONE' as const });
    }
    if (Date.parse(heartbeat.emittedAt) <= Date.parse(input.previousHeartbeat.emittedAt)) {
      return Object.freeze({ ...base, status: 'INVALID' as const, reasonCode: 'HEARTBEAT_TIME_NOT_MONOTONE' as const });
    }
  }

  if (heartbeat.workItemId === null) {
    if (claim !== null && claim.status === 'ACTIVE') {
      return Object.freeze({ ...base, status: 'INVALID' as const, reasonCode: 'HEARTBEAT_CLAIM_MISMATCH' as const });
    }
    return Object.freeze({
      ...base,
      status: 'BOUND_SESSION_ONLY' as const,
      reasonCode: 'HEARTBEAT_SESSION_BOUND_NO_CLAIM' as const
    });
  }

  if (
    !claim
    || claim.status !== 'ACTIVE'
    || claim.candidateSessionId !== heartbeat.candidateSessionId
    || claim.agentIdentity !== heartbeat.agentIdentity
    || claim.workItemId !== heartbeat.workItemId
  ) {
    return Object.freeze({ ...base, status: 'INVALID' as const, reasonCode: 'HEARTBEAT_CLAIM_MISMATCH' as const });
  }

  return Object.freeze({ ...base, status: 'BOUND' as const, reasonCode: 'HEARTBEAT_BOUND' as const });
}

export const CandidateMinuteLivenessInputSchema = z.object({
  heartbeat: CandidateHeartbeatSchema.nullable(),
  observedAt: z.string().datetime({ offset: true })
}).strict().superRefine((value, ctx) => {
  if (
    value.heartbeat !== null
    && Date.parse(value.heartbeat.emittedAt) > Date.parse(value.observedAt)
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['heartbeat', 'emittedAt'],
      message: 'HEARTBEAT_CANNOT_BE_IN_THE_FUTURE'
    });
  }
});
export type CandidateMinuteLivenessInput = z.infer<typeof CandidateMinuteLivenessInputSchema>;

export type CandidateMinuteLivenessResult = Readonly<{
  status: 'WORKING_CONFIRMED' | 'RECENTLY_ACTIVE' | 'STALE' | 'UNKNOWN' | 'YIELDED';
  heartbeatObservedAt: string | null;
  ageSeconds: number | null;
  currentAction: CandidateHeartbeatAction | null;
  emissionIntervalSeconds: 60;
  freshForSeconds: 120;
  transient: true;
  ownershipChanged: false;
  authorizationGranted: false;
  claimTransferAllowed: false;
}>;

export function assessCandidateMinuteLiveness(
  rawInput: CandidateMinuteLivenessInput
): CandidateMinuteLivenessResult {
  const input = CandidateMinuteLivenessInputSchema.parse(rawInput);
  const heartbeat = input.heartbeat;
  const base = {
    emissionIntervalSeconds: CANDIDATE_HEARTBEAT_POLICY.emissionIntervalSeconds as 60,
    freshForSeconds: CANDIDATE_HEARTBEAT_POLICY.freshForSeconds as 120,
    transient: true as const,
    ownershipChanged: false as const,
    authorizationGranted: false as const,
    claimTransferAllowed: false as const
  };
  if (!heartbeat) {
    return Object.freeze({
      ...base,
      status: 'UNKNOWN' as const,
      heartbeatObservedAt: null,
      ageSeconds: null,
      currentAction: null
    });
  }

  const ageSeconds = Math.floor(
    (Date.parse(input.observedAt) - Date.parse(heartbeat.emittedAt)) / 1_000
  );
  const status: CandidateMinuteLivenessResult['status'] = heartbeat.currentAction === 'YIELDED'
    ? 'YIELDED'
    : ageSeconds <= CANDIDATE_HEARTBEAT_POLICY.emissionIntervalSeconds
      ? 'WORKING_CONFIRMED'
      : ageSeconds <= CANDIDATE_HEARTBEAT_POLICY.freshForSeconds
        ? 'RECENTLY_ACTIVE'
        : 'STALE';

  return Object.freeze({
    ...base,
    status,
    heartbeatObservedAt: heartbeat.emittedAt,
    ageSeconds,
    currentAction: heartbeat.currentAction
  });
}

export const CandidateLivenessInputSchema = z.object({
  candidateSessionId: BoundedId,
  agentIdentity: BoundedId,
  observedHeadSha: GitShaSchema,
  heartbeatObservedAt: z.string().datetime({ offset: true }).nullable(),
  observedAt: z.string().datetime({ offset: true }),
  freshForSeconds: z.number().int().min(1).max(86_400)
}).strict().superRefine((value, ctx) => {
  if (
    value.heartbeatObservedAt !== null
    && Date.parse(value.heartbeatObservedAt) > Date.parse(value.observedAt)
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['heartbeatObservedAt'],
      message: 'HEARTBEAT_CANNOT_BE_IN_THE_FUTURE'
    });
  }
});
export type CandidateLivenessInput = z.infer<typeof CandidateLivenessInputSchema>;

export type CandidateLivenessResult = Readonly<{
  candidateSessionId: string;
  agentIdentity: string;
  observedHeadSha: string;
  status: 'FRESH' | 'STALE' | 'MISSING';
  heartbeatObservedAt: string | null;
  observedAt: string;
  ageSeconds: number | null;
  freshForSeconds: number;
  transient: true;
  ownershipChanged: false;
  authorizationGranted: false;
  claimTransferAllowed: false;
  mayWrite: false;
}>;

export function assessCandidateLiveness(
  rawInput: CandidateLivenessInput
): CandidateLivenessResult {
  const input = CandidateLivenessInputSchema.parse(rawInput);
  const ageSeconds = input.heartbeatObservedAt === null
    ? null
    : Math.floor(
        (Date.parse(input.observedAt) - Date.parse(input.heartbeatObservedAt)) / 1_000
      );
  const status: CandidateLivenessResult['status'] = ageSeconds === null
    ? 'MISSING'
    : ageSeconds <= input.freshForSeconds
      ? 'FRESH'
      : 'STALE';

  return Object.freeze({
    candidateSessionId: input.candidateSessionId,
    agentIdentity: input.agentIdentity,
    observedHeadSha: input.observedHeadSha,
    status,
    heartbeatObservedAt: input.heartbeatObservedAt,
    observedAt: input.observedAt,
    ageSeconds,
    freshForSeconds: input.freshForSeconds,
    transient: true as const,
    ownershipChanged: false as const,
    authorizationGranted: false as const,
    claimTransferAllowed: false as const,
    mayWrite: false as const
  });
}

const CandidateLivenessResultSchema = z.object({
  candidateSessionId: BoundedId,
  agentIdentity: BoundedId,
  observedHeadSha: GitShaSchema,
  status: z.enum(['FRESH', 'STALE', 'MISSING']),
  heartbeatObservedAt: z.string().datetime({ offset: true }).nullable(),
  observedAt: z.string().datetime({ offset: true }),
  ageSeconds: z.number().int().nonnegative().nullable(),
  freshForSeconds: z.number().int().min(1).max(86_400),
  transient: z.literal(true),
  ownershipChanged: z.literal(false),
  authorizationGranted: z.literal(false),
  claimTransferAllowed: z.literal(false),
  mayWrite: z.literal(false)
}).strict();

export const CandidateRecoverySupervisorInputSchema = z.object({
  expectedHeadSha: GitShaSchema,
  currentHeadSha: GitShaSchema,
  workItemId: BoundedId,
  expectedCandidateSessionId: BoundedId,
  activeClaim: CandidateWorkClaimSchema.nullable(),
  checkpoint: z.object({
    status: z.enum(['SUCCESS', 'FAILURE', 'PENDING', 'UNKNOWN']),
    headSha: GitShaSchema.nullable()
  }).strict(),
  liveness: CandidateLivenessResultSchema
}).strict();
export type CandidateRecoverySupervisorInput = z.infer<typeof CandidateRecoverySupervisorInputSchema>;

export type CandidateRecoveryDecision =
  | 'CONTINUE_CURRENT_EXECUTOR'
  | 'START_REPLACEMENT_RECONCILE_ONLY'
  | 'REOBSERVE_REQUIRED'
  | 'WAIT_FOR_CLAIM'
  | 'WAIT_FOR_CHECKPOINT';

export type CandidateRecoverySupervisorResult = Readonly<{
  decision: CandidateRecoveryDecision;
  reasonCode:
    | 'CURRENT_EXECUTOR_LIVE'
    | 'LIVENESS_STALE_RECOVERY_ONLY'
    | 'HEAD_REOBSERVATION_REQUIRED'
    | 'LIVENESS_BINDING_MISMATCH'
    | 'CLAIM_REOBSERVATION_REQUIRED'
    | 'CHECKPOINT_REOBSERVATION_REQUIRED';
  claimTransferAllowed: false;
  ownershipChanged: false;
  authorizationGranted: false;
  requiresReobservationBeforeWrite: boolean;
}>;

export function superviseCandidateRecovery(
  rawInput: CandidateRecoverySupervisorInput
): CandidateRecoverySupervisorResult {
  const input = CandidateRecoverySupervisorInputSchema.parse(rawInput);
  const base = {
    claimTransferAllowed: false as const,
    ownershipChanged: false as const,
    authorizationGranted: false as const
  };

  if (
    input.expectedHeadSha !== input.currentHeadSha
    || input.liveness.observedHeadSha !== input.currentHeadSha
  ) {
    return Object.freeze({
      ...base,
      decision: 'REOBSERVE_REQUIRED' as const,
      reasonCode: 'HEAD_REOBSERVATION_REQUIRED' as const,
      requiresReobservationBeforeWrite: true
    });
  }

  if (input.liveness.candidateSessionId !== input.expectedCandidateSessionId) {
    return Object.freeze({
      ...base,
      decision: 'REOBSERVE_REQUIRED' as const,
      reasonCode: 'LIVENESS_BINDING_MISMATCH' as const,
      requiresReobservationBeforeWrite: true
    });
  }

  const claim = input.activeClaim;
  if (
    !claim
    || claim.status !== 'ACTIVE'
    || claim.workItemId !== input.workItemId
    || claim.candidateSessionId !== input.expectedCandidateSessionId
  ) {
    return Object.freeze({
      ...base,
      decision: 'WAIT_FOR_CLAIM' as const,
      reasonCode: 'CLAIM_REOBSERVATION_REQUIRED' as const,
      requiresReobservationBeforeWrite: true
    });
  }

  if (input.liveness.agentIdentity !== claim.agentIdentity) {
    return Object.freeze({
      ...base,
      decision: 'REOBSERVE_REQUIRED' as const,
      reasonCode: 'LIVENESS_BINDING_MISMATCH' as const,
      requiresReobservationBeforeWrite: true
    });
  }

  if (
    input.checkpoint.status !== 'SUCCESS'
    || input.checkpoint.headSha !== input.currentHeadSha
  ) {
    return Object.freeze({
      ...base,
      decision: 'WAIT_FOR_CHECKPOINT' as const,
      reasonCode: 'CHECKPOINT_REOBSERVATION_REQUIRED' as const,
      requiresReobservationBeforeWrite: true
    });
  }

  if (input.liveness.status === 'FRESH') {
    return Object.freeze({
      ...base,
      decision: 'CONTINUE_CURRENT_EXECUTOR' as const,
      reasonCode: 'CURRENT_EXECUTOR_LIVE' as const,
      requiresReobservationBeforeWrite: false
    });
  }

  return Object.freeze({
    ...base,
    decision: 'START_REPLACEMENT_RECONCILE_ONLY' as const,
    reasonCode: 'LIVENESS_STALE_RECOVERY_ONLY' as const,
    requiresReobservationBeforeWrite: true
  });
}

export const CandidateRecoveryRunnerCapabilitySchema = z.object({
  provider: CandidateProviderSchema,
  verifiedSessionResumeSupported: z.boolean(),
  replacementExecutorSupported: z.boolean()
}).strict();
export type CandidateRecoveryRunnerCapability =
  z.infer<typeof CandidateRecoveryRunnerCapabilitySchema>;

export const CandidateRecoveryRunnerInputSchema = z.object({
  recoveryDecision: z.enum([
    'CONTINUE_CURRENT_EXECUTOR',
    'START_REPLACEMENT_RECONCILE_ONLY',
    'REOBSERVE_REQUIRED',
    'WAIT_FOR_CLAIM',
    'WAIT_FOR_CHECKPOINT'
  ]),
  candidateSession: CandidateSessionSchema,
  expectedHeadSha: GitShaSchema,
  capability: CandidateRecoveryRunnerCapabilitySchema
}).strict();
export type CandidateRecoveryRunnerInput = z.infer<typeof CandidateRecoveryRunnerInputSchema>;

export type CandidateRecoveryRunnerPlan = Readonly<{
  planId: string;
  action:
    | 'NO_ACTION'
    | 'RESUME_VERIFIED_PROVIDER_SESSION'
    | 'START_REPLACEMENT_EXECUTOR'
    | 'REOBSERVE_REQUIRED'
    | 'RUNNER_UNAVAILABLE';
  candidateSessionId: string;
  provider: z.infer<typeof CandidateProviderSchema>;
  providerConversationRef: string | null;
  expectedHeadSha: string;
  executionMode: 'RECONCILE_READ_ONLY';
  authorizationGranted: false;
  claimTransferAllowed: false;
}>;

const CandidateRecoveryRunnerPlanSchema = z.object({
  planId: z.string().regex(/^recovery-[0-9a-f]{24}$/),
  action: z.enum([
    'NO_ACTION',
    'RESUME_VERIFIED_PROVIDER_SESSION',
    'START_REPLACEMENT_EXECUTOR',
    'REOBSERVE_REQUIRED',
    'RUNNER_UNAVAILABLE'
  ]),
  candidateSessionId: BoundedId,
  provider: CandidateProviderSchema,
  providerConversationRef: BoundedId.nullable(),
  expectedHeadSha: GitShaSchema,
  executionMode: z.literal('RECONCILE_READ_ONLY'),
  authorizationGranted: z.literal(false),
  claimTransferAllowed: z.literal(false)
}).strict();

function recoveryPlanId(input: {
  action: CandidateRecoveryRunnerPlan['action'];
  candidateSessionId: string;
  provider: z.infer<typeof CandidateProviderSchema>;
  providerConversationRef: string | null;
  expectedHeadSha: string;
}): string {
  const digest = createHash('sha256').update(JSON.stringify(input)).digest('hex');
  return `recovery-${digest.slice(0, 24)}`;
}

export function planCandidateRecoveryRunner(
  rawInput: CandidateRecoveryRunnerInput
): CandidateRecoveryRunnerPlan {
  const input = CandidateRecoveryRunnerInputSchema.parse(rawInput);
  const sameProvider = input.capability.provider === input.candidateSession.provider;
  const headMatches = input.candidateSession.lastObservedHeadSha === input.expectedHeadSha;

  let action: CandidateRecoveryRunnerPlan['action'] = 'NO_ACTION';
  let providerConversationRef: string | null = null;

  if (!headMatches || input.recoveryDecision === 'REOBSERVE_REQUIRED') {
    action = 'REOBSERVE_REQUIRED';
  } else if (input.recoveryDecision === 'START_REPLACEMENT_RECONCILE_ONLY') {
    const canResumeVerified = (
      sameProvider
      && input.capability.verifiedSessionResumeSupported
      && input.candidateSession.providerConversationRefProvenance === 'PROVIDED_BY_CLIENT'
      && input.candidateSession.providerConversationRef !== null
    );
    if (canResumeVerified) {
      action = 'RESUME_VERIFIED_PROVIDER_SESSION';
      providerConversationRef = input.candidateSession.providerConversationRef;
    } else if (sameProvider && input.capability.replacementExecutorSupported) {
      action = 'START_REPLACEMENT_EXECUTOR';
    } else {
      action = 'RUNNER_UNAVAILABLE';
    }
  }

  const idInput = {
    action,
    candidateSessionId: input.candidateSession.candidateSessionId,
    provider: input.candidateSession.provider,
    providerConversationRef,
    expectedHeadSha: input.expectedHeadSha
  };

  return Object.freeze({
    planId: recoveryPlanId(idInput),
    action,
    candidateSessionId: input.candidateSession.candidateSessionId,
    provider: input.candidateSession.provider,
    providerConversationRef,
    expectedHeadSha: input.expectedHeadSha,
    executionMode: 'RECONCILE_READ_ONLY' as const,
    authorizationGranted: false as const,
    claimTransferAllowed: false as const
  });
}

export const CandidateRecoveryRunnerAcknowledgementSchema = z.object({
  planId: BoundedId,
  candidateSessionId: BoundedId,
  observedHeadSha: GitShaSchema,
  acknowledgedAt: z.string().datetime({ offset: true })
}).strict();
export type CandidateRecoveryRunnerAcknowledgement =
  z.infer<typeof CandidateRecoveryRunnerAcknowledgementSchema>;

export type CandidateRecoveryRunnerAcknowledgementResult = Readonly<{
  status: 'RESUMED' | 'REPLACEMENT_STARTED' | 'UNVERIFIED';
  planId: string;
  candidateSessionId: string;
  observedHeadSha: string;
  acknowledgedAt: string;
  authorizationGranted: false;
  claimTransferAllowed: false;
}>;

export function acknowledgeCandidateRecoveryRunner(
  rawPlan: CandidateRecoveryRunnerPlan,
  rawAcknowledgement: CandidateRecoveryRunnerAcknowledgement
): CandidateRecoveryRunnerAcknowledgementResult {
  const plan = CandidateRecoveryRunnerPlanSchema.parse(rawPlan);
  const acknowledgement = CandidateRecoveryRunnerAcknowledgementSchema.parse(rawAcknowledgement);
  const expectedPlanId = recoveryPlanId({
    action: plan.action,
    candidateSessionId: plan.candidateSessionId,
    provider: plan.provider,
    providerConversationRef: plan.providerConversationRef,
    expectedHeadSha: plan.expectedHeadSha
  });
  const verified = (
    plan.planId === expectedPlanId
    && acknowledgement.planId === plan.planId
    && acknowledgement.candidateSessionId === plan.candidateSessionId
    && acknowledgement.observedHeadSha === plan.expectedHeadSha
  );
  const status: CandidateRecoveryRunnerAcknowledgementResult['status'] = !verified
    ? 'UNVERIFIED'
    : plan.action === 'RESUME_VERIFIED_PROVIDER_SESSION'
      ? 'RESUMED'
      : plan.action === 'START_REPLACEMENT_EXECUTOR'
        ? 'REPLACEMENT_STARTED'
        : 'UNVERIFIED';

  return Object.freeze({
    status,
    planId: plan.planId,
    candidateSessionId: acknowledgement.candidateSessionId,
    observedHeadSha: acknowledgement.observedHeadSha,
    acknowledgedAt: acknowledgement.acknowledgedAt,
    authorizationGranted: false as const,
    claimTransferAllowed: false as const
  });
}
