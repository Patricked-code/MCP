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
