import { createHash } from 'node:crypto';
import { z } from 'zod';

import type { GithubOperationalContext } from '../../governedContext/types.js';
import type {
  GovernedContractSubstrate,
  GovernedStepId
} from '../contractSubstrate.js';

const RepositorySchema = z.string().trim().min(3).max(300)
  .regex(/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/);
const RefSchema = z.string().trim().min(1).max(255);
const ShaSchema = z.string().regex(/^[0-9a-f]{40}$/);
const TimestampSchema = z.string().datetime({ offset: true });
const TitleSchema = z.string().trim().min(1).max(240);
const TextSchema = z.string().trim().min(1).max(500);
const PathSchema = z.string().trim().min(1).max(500);
const TaskIdSchema = z.string().regex(/^TASK-[0-9]{8}-[0-9]{3,}$/);
const UuidSchema = z.string().uuid();
const RevisionSchema = z.number().int().nonnegative();

const ReviewFindingSchema = z.object({
  findingId: z.string().trim().min(1).max(160),
  category: z.enum(['CODE', 'TEST', 'DOCUMENTATION', 'SECURITY', 'OTHER']),
  summary: TextSchema
}).strict();

const ExactDiffEvidenceSchema = z.object({
  observedAt: TimestampSchema,
  headSha: ShaSchema,
  baseSha: ShaSchema,
  changedFiles: z.array(PathSchema).max(1_000),
  additions: z.number().int().nonnegative(),
  deletions: z.number().int().nonnegative(),
  truncated: z.boolean()
}).strict();

type ReviewStepId =
  | 'GW-34' | 'GW-35' | 'GW-36' | 'GW-37' | 'GW-38'
  | 'GW-39' | 'GW-40' | 'GW-41' | 'GW-42' | 'GW-43';

type ReviewStatus = 'READY' | 'SUCCESS' | 'BLOCKED' | 'UNVERIFIED' | 'CONFLICT';

export type ReviewContractBinding = Readonly<{
  stepId: GovernedStepId;
  contractVersion: number;
  contractRegistryDigest: string;
  graphRegistryDigest: string;
}>;

export type ReviewEffectPlan = Readonly<{
  effectId: string;
  toolName:
    | 'github_create_pull_request'
    | 'github_mark_pr_ready'
    | 'mcp_transition_governed_task'
    | 'mcp_create_governed_checkpoint'
    | 'github_merge_pull_request';
  expectedHeadSha: string;
  payload: Readonly<Record<string, unknown>>;
  replayClass: 'CONDITIONALLY_IDEMPOTENT' | 'NON_REPLAYABLE_RECOVER_BY_OBSERVATION';
  authorizationRequired: true;
  postconditions: readonly string[];
  recoveryAnchor: string;
}>;

export type ReviewResult<TPayload> = Readonly<{
  contract: ReviewContractBinding;
  status: ReviewStatus;
  reasonCodes: readonly string[];
  payload: TPayload;
  effectPlan: ReviewEffectPlan | null;
  authorizationInferred: false;
  mutationPerformed: false;
}>;

export type ExactDiffReviewPayload = Readonly<{
  evidence: Readonly<Omit<z.infer<typeof ExactDiffEvidenceSchema>, 'changedFiles'> & {
    changedFiles: readonly string[];
  }>;
  exactHead: boolean;
  nextStepId: 'GW-36' | null;
}>;

export type RulesetVerificationPayload = Readonly<{
  rulesetName: string | null;
  enforcement: string | null;
  requiresPullRequest: boolean;
  requiredStatusChecks: readonly string[];
  requiresConversationResolution: boolean;
  requiredApprovingReviewCount: number;
  nextStepId: 'GW-37' | null;
}>;

export type FindingsResolutionPayload = Readonly<{
  headSha: string;
  findings: readonly Readonly<z.infer<typeof ReviewFindingSchema>>[];
  unresolvedRequiredThreads: number;
  nextStepId: 'GW-30' | 'GW-38' | null;
}>;

export type PremergeProof = Readonly<{
  status: 'READY' | 'BLOCKED';
  repository: string | null;
  headSha: string;
  pullRequestNumber: number | null;
  observedAt: string;
  rulesetName: string | null;
  requiredApprovalCount: number;
  approvals: number;
  checksExactHead: boolean | null;
  reviewsExactHead: boolean | null;
  unresolvedThreads: number | null;
  taskStatus: string;
  checkpointHeadSha: string;
  evidenceDigest: string;
  nextStepId: 'GW-42' | null;
}>;

export type PremergeProofResult = ReviewResult<PremergeProof>;

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>)
      .filter(([, entry]) => entry !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => `${JSON.stringify(key)}:${canonical(entry)}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

function digest(value: unknown): string {
  return createHash('sha256').update(canonical(value)).digest('hex');
}

function contract(stepId: ReviewStepId, substrate: GovernedContractSubstrate): ReviewContractBinding {
  const resolved = substrate.resolve(stepId);
  if (!resolved) throw new Error(`GWC_REVIEW_CONTRACT_MISSING:${stepId}`);
  return Object.freeze({
    stepId: resolved.stepId,
    contractVersion: resolved.contractVersion,
    contractRegistryDigest: substrate.contractRegistryDigest,
    graphRegistryDigest: substrate.graphRegistryDigest
  });
}

function result<TPayload>(input: {
  stepId: ReviewStepId;
  substrate: GovernedContractSubstrate;
  status: ReviewStatus;
  reasonCodes?: readonly string[];
  payload: TPayload;
  effectPlan?: ReviewEffectPlan | null;
}): ReviewResult<TPayload> {
  return Object.freeze({
    contract: contract(input.stepId, input.substrate),
    status: input.status,
    reasonCodes: Object.freeze([...(input.reasonCodes ?? [])]),
    payload: input.payload,
    effectPlan: input.effectPlan ?? null,
    authorizationInferred: false as const,
    mutationPerformed: false as const
  });
}

function effectPlan(input: {
  stepId: ReviewStepId;
  toolName: ReviewEffectPlan['toolName'];
  expectedHeadSha: string;
  payload: Record<string, unknown>;
  replayClass?: ReviewEffectPlan['replayClass'];
  postconditions: readonly string[];
  recoveryAnchor: string;
}): ReviewEffectPlan {
  const expectedHeadSha = ShaSchema.parse(input.expectedHeadSha);
  const payload = Object.freeze({ ...input.payload });
  return Object.freeze({
    effectId: `review:${input.stepId}:${digest({
      toolName: input.toolName,
      expectedHeadSha,
      payload
    }).slice(0, 24)}`,
    toolName: input.toolName,
    expectedHeadSha,
    payload,
    replayClass: input.replayClass ?? 'CONDITIONALLY_IDEMPOTENT',
    authorizationRequired: true as const,
    postconditions: Object.freeze([...input.postconditions]),
    recoveryAnchor: input.recoveryAnchor
  });
}

export function planGw34DraftPr(
  rawInput: Readonly<{
    repository: string;
    sourceBranch: string;
    baseBranch: string;
    expectedHeadSha: string;
    title: string;
  }>,
  substrate: GovernedContractSubstrate
): ReviewResult<Readonly<{
  repository: string;
  sourceBranch: string;
  baseBranch: string;
  expectedHeadSha: string;
  nextStepId: 'GW-35';
}>> {
  const input = z.object({
    repository: RepositorySchema,
    sourceBranch: RefSchema,
    baseBranch: RefSchema,
    expectedHeadSha: ShaSchema,
    title: TitleSchema
  }).strict().parse(rawInput);
  const plan = effectPlan({
    stepId: 'GW-34',
    toolName: 'github_create_pull_request',
    expectedHeadSha: input.expectedHeadSha,
    payload: {
      repository: input.repository,
      sourceBranch: input.sourceBranch,
      baseBranch: input.baseBranch,
      title: input.title
    },
    postconditions: [
      'draft pull request exists',
      'pull request head equals expectedHeadSha'
    ],
    recoveryAnchor: `github-pr:${input.repository}:${input.sourceBranch}:${input.expectedHeadSha}`
  });
  return result({
    stepId: 'GW-34',
    substrate,
    status: 'READY',
    payload: Object.freeze({
      repository: input.repository,
      sourceBranch: input.sourceBranch,
      baseBranch: input.baseBranch,
      expectedHeadSha: input.expectedHeadSha,
      nextStepId: 'GW-35' as const
    }),
    effectPlan: plan
  });
}

export function observeGw35ExactDiffReview(
  rawInput: Readonly<{
    expectedHeadSha: string;
    evidence: z.infer<typeof ExactDiffEvidenceSchema>;
  }>,
  substrate: GovernedContractSubstrate
): ReviewResult<ExactDiffReviewPayload> {
  const input = z.object({
    expectedHeadSha: ShaSchema,
    evidence: ExactDiffEvidenceSchema
  }).strict().parse(rawInput);
  const exactHead = input.evidence.headSha === input.expectedHeadSha;
  const payload: ExactDiffReviewPayload = Object.freeze({
    evidence: Object.freeze({
      ...input.evidence,
      changedFiles: Object.freeze([...input.evidence.changedFiles])
    }),
    exactHead,
    nextStepId: exactHead && !input.evidence.truncated ? 'GW-36' : null
  });
  if (!exactHead) {
    return result({
      stepId: 'GW-35',
      substrate,
      status: 'CONFLICT',
      reasonCodes: ['DIFF_HEAD_MISMATCH'],
      payload
    });
  }
  if (input.evidence.truncated) {
    return result({
      stepId: 'GW-35',
      substrate,
      status: 'BLOCKED',
      reasonCodes: ['DIFF_EVIDENCE_TRUNCATED'],
      payload
    });
  }
  return result({
    stepId: 'GW-35',
    substrate,
    status: 'SUCCESS',
    payload
  });
}

export function observeGw36RulesetVerification(
  input: Readonly<{
    expectedHeadSha: string;
    github: GithubOperationalContext;
  }>,
  substrate: GovernedContractSubstrate
): ReviewResult<RulesetVerificationPayload> {
  const expectedHeadSha = ShaSchema.parse(input.expectedHeadSha);
  const github = input.github;
  const ruleset = github.ruleset;
  const payload: RulesetVerificationPayload = Object.freeze({
    rulesetName: ruleset.name,
    enforcement: ruleset.enforcement,
    requiresPullRequest: ruleset.requiresPullRequest === true,
    requiredStatusChecks: Object.freeze([...ruleset.requiredStatusChecks]),
    requiresConversationResolution: ruleset.requiresConversationResolution === true,
    requiredApprovingReviewCount: ruleset.requiredApprovingReviewCount ?? 0,
    nextStepId: null
  });
  if (!github.pullRequest || github.pullRequest.headSha !== expectedHeadSha) {
    return result({
      stepId: 'GW-36',
      substrate,
      status: 'CONFLICT',
      reasonCodes: ['GITHUB_PR_HEAD_MISMATCH'],
      payload
    });
  }
  if (github.evidence.ruleset.freshness !== 'CURRENT') {
    return result({
      stepId: 'GW-36',
      substrate,
      status: 'BLOCKED',
      reasonCodes: ['RULESET_EVIDENCE_NOT_CURRENT'],
      payload
    });
  }
  return result({
    stepId: 'GW-36',
    substrate,
    status: 'SUCCESS',
    payload: Object.freeze({ ...payload, nextStepId: 'GW-37' as const })
  });
}

export function evaluateGw37ReviewFindings(
  rawInput: Readonly<{
    expectedHeadSha: string;
    findings: readonly z.infer<typeof ReviewFindingSchema>[];
    unresolvedRequiredThreads: number;
  }>,
  substrate: GovernedContractSubstrate
): ReviewResult<FindingsResolutionPayload> {
  const input = z.object({
    expectedHeadSha: ShaSchema,
    findings: z.array(ReviewFindingSchema).max(100),
    unresolvedRequiredThreads: z.number().int().nonnegative().max(10_000)
  }).strict().parse(rawInput);
  const findings = Object.freeze(input.findings.map((finding) => Object.freeze({ ...finding })));
  const hasCodeFinding = findings.some((finding) => finding.category === 'CODE');
  const payload = (nextStepId: FindingsResolutionPayload['nextStepId']): FindingsResolutionPayload =>
    Object.freeze({
      headSha: input.expectedHeadSha,
      findings,
      unresolvedRequiredThreads: input.unresolvedRequiredThreads,
      nextStepId
    });
  if (hasCodeFinding) {
    return result({
      stepId: 'GW-37',
      substrate,
      status: 'SUCCESS',
      payload: payload('GW-30')
    });
  }
  if (input.unresolvedRequiredThreads > 0) {
    return result({
      stepId: 'GW-37',
      substrate,
      status: 'BLOCKED',
      reasonCodes: ['REVIEW_THREADS_UNRESOLVED'],
      payload: payload(null)
    });
  }
  if (findings.length > 0) {
    return result({
      stepId: 'GW-37',
      substrate,
      status: 'BLOCKED',
      reasonCodes: ['REVIEW_FINDINGS_UNRESOLVED'],
      payload: payload(null)
    });
  }
  return result({
    stepId: 'GW-37',
    substrate,
    status: 'SUCCESS',
    payload: payload('GW-38')
  });
}

export function planGw38PrReady(
  rawInput: Readonly<{
    repository: string;
    pullRequestNumber: number;
    expectedHeadSha: string;
    review: {
      headSha: string;
      exactHead: boolean;
      blockingFindings: number;
      unresolvedRequiredThreads: number;
    };
  }>,
  substrate: GovernedContractSubstrate
): ReviewResult<Readonly<{
  pullRequestNumber: number;
  headSha: string;
  nextStepId: 'GW-39' | null;
}>> {
  const input = z.object({
    repository: RepositorySchema,
    pullRequestNumber: z.number().int().positive(),
    expectedHeadSha: ShaSchema,
    review: z.object({
      headSha: ShaSchema,
      exactHead: z.boolean(),
      blockingFindings: z.number().int().nonnegative(),
      unresolvedRequiredThreads: z.number().int().nonnegative()
    }).strict()
  }).strict().parse(rawInput);
  const payload = Object.freeze({
    pullRequestNumber: input.pullRequestNumber,
    headSha: input.expectedHeadSha,
    nextStepId: null as 'GW-39' | null
  });
  if (input.review.headSha !== input.expectedHeadSha || !input.review.exactHead) {
    return result({
      stepId: 'GW-38',
      substrate,
      status: 'CONFLICT',
      reasonCodes: ['REVIEW_HEAD_MISMATCH'],
      payload
    });
  }
  if (input.review.blockingFindings > 0 || input.review.unresolvedRequiredThreads > 0) {
    return result({
      stepId: 'GW-38',
      substrate,
      status: 'BLOCKED',
      reasonCodes: ['REVIEW_NOT_CLEAN'],
      payload
    });
  }
  return result({
    stepId: 'GW-38',
    substrate,
    status: 'READY',
    payload: Object.freeze({ ...payload, nextStepId: 'GW-39' as const }),
    effectPlan: effectPlan({
      stepId: 'GW-38',
      toolName: 'github_mark_pr_ready',
      expectedHeadSha: input.expectedHeadSha,
      payload: {
        repository: input.repository,
        pullRequestNumber: input.pullRequestNumber
      },
      postconditions: [
        'pull request is not draft',
        'pull request head remains expectedHeadSha'
      ],
      recoveryAnchor: `github-pr:${input.repository}:${input.pullRequestNumber}:${input.expectedHeadSha}`
    })
  });
}

type TaskTransitionInput = Readonly<{
  taskId: string;
  expectedTaskRevision: number;
  governedSessionId: string;
  expectedSessionRevision: number;
  expectedBootstrapReceiptId: string;
  expectedStateVersion: number;
  expectedHeadSha: string;
}>;

function planTaskTransition<TStatus extends 'REVIEW' | 'MERGE_READY'>(
  stepId: TStatus extends 'REVIEW' ? 'GW-39' : 'GW-42',
  rawInput: TaskTransitionInput,
  status: TStatus,
  substrate: GovernedContractSubstrate
): ReviewResult<Readonly<{
  taskId: string;
  headSha: string;
  targetStatus: TStatus;
  nextStepId: TStatus extends 'REVIEW' ? 'GW-40' : 'GW-43';
}>> {
  const input = z.object({
    taskId: TaskIdSchema,
    expectedTaskRevision: RevisionSchema,
    governedSessionId: UuidSchema,
    expectedSessionRevision: RevisionSchema,
    expectedBootstrapReceiptId: UuidSchema,
    expectedStateVersion: RevisionSchema,
    expectedHeadSha: ShaSchema
  }).strict().parse(rawInput);
  const nextStepId = (status === 'REVIEW' ? 'GW-40' : 'GW-43') as
    TStatus extends 'REVIEW' ? 'GW-40' : 'GW-43';
  return result({
    stepId,
    substrate,
    status: 'READY',
    payload: Object.freeze({
      taskId: input.taskId,
      headSha: input.expectedHeadSha,
      targetStatus: status,
      nextStepId
    }),
    effectPlan: effectPlan({
      stepId,
      toolName: 'mcp_transition_governed_task',
      expectedHeadSha: input.expectedHeadSha,
      payload: {
        governedSessionId: input.governedSessionId,
        expectedSessionRevision: input.expectedSessionRevision,
        expectedBootstrapReceiptId: input.expectedBootstrapReceiptId,
        expectedStateVersion: input.expectedStateVersion,
        taskId: input.taskId,
        expectedTaskRevision: input.expectedTaskRevision,
        status,
        observedHeadSha: input.expectedHeadSha
      },
      postconditions: [
        `task status is ${status}`,
        'task observedHeadSha equals expectedHeadSha'
      ],
      recoveryAnchor: `governed-task:${input.taskId}:revision:${input.expectedTaskRevision}`
    })
  });
}

export function planGw39TaskReview(
  input: TaskTransitionInput,
  substrate: GovernedContractSubstrate
) {
  return planTaskTransition('GW-39', input, 'REVIEW', substrate);
}

export function planGw40ReviewCheckpoint(
  rawInput: Readonly<{
    governedSessionId: string;
    expectedSessionRevision: number;
    expectedStateVersion?: number;
    pullRequestNumber?: number | null;
    expectedHeadSha: string;
    nextAction: string;
  }>,
  substrate: GovernedContractSubstrate
): ReviewResult<Readonly<{
  headSha: string;
  nextStepId: 'GW-41';
  runtimeStateVersionRequired: boolean;
}>> {
  const input = z.object({
    governedSessionId: UuidSchema,
    expectedSessionRevision: RevisionSchema,
    expectedStateVersion: RevisionSchema.optional(),
    pullRequestNumber: z.number().int().positive().nullable().optional(),
    expectedHeadSha: ShaSchema,
    nextAction: TextSchema
  }).strict().parse(rawInput);
  return result({
    stepId: 'GW-40',
    substrate,
    status: 'READY',
    payload: Object.freeze({
      headSha: input.expectedHeadSha,
      nextStepId: 'GW-41' as const,
      runtimeStateVersionRequired: input.expectedStateVersion === undefined
    }),
    effectPlan: effectPlan({
      stepId: 'GW-40',
      toolName: 'mcp_create_governed_checkpoint',
      expectedHeadSha: input.expectedHeadSha,
      payload: {
        governedSessionId: input.governedSessionId,
        expectedSessionRevision: input.expectedSessionRevision,
        expectedStateVersion: input.expectedStateVersion ?? null,
        completedAction: 'review checkpoint',
        resultCode: 'REVIEW_READY',
        pullRequestNumber: input.pullRequestNumber ?? null,
        observedHeadSha: input.expectedHeadSha,
        blockers: [],
        nextAction: input.nextAction
      },
      postconditions: [
        'checkpoint observedHeadSha equals expectedHeadSha',
        'session revision advances after execution'
      ],
      recoveryAnchor: `governed-session:${input.governedSessionId}:revision:${input.expectedSessionRevision}`
    })
  });
}

function premergeReasons(
  expectedHeadSha: string,
  github: GithubOperationalContext,
  taskStatus: string,
  checkpointHeadSha: string
): string[] {
  const reasons: string[] = [];
  const push = (value: string) => {
    if (!reasons.includes(value)) reasons.push(value);
  };
  const pr = github.pullRequest;
  if (github.status !== 'CURRENT') push('GITHUB_CONTEXT_NOT_CURRENT');
  if (!pr) {
    push('PR_EVIDENCE_UNAVAILABLE');
  } else {
    if (pr.headSha !== expectedHeadSha || github.workBranchHead !== expectedHeadSha) {
      push('PR_HEAD_MISMATCH');
    }
    if (pr.state !== 'open' || pr.merged) push('PR_NOT_OPEN');
    if (pr.draft) push('PR_STILL_DRAFT');
  }
  for (const [surface, evidence] of [
    ['PR', github.evidence.pullRequest],
    ['CHECKS', github.evidence.checks],
    ['REVIEWS', github.evidence.reviews],
    ['RULESET', github.evidence.ruleset]
  ] as const) {
    if (evidence.freshness !== 'CURRENT') push(`${surface}_EVIDENCE_NOT_CURRENT`);
  }

  const requiredChecks = github.ruleset.requiredStatusChecks.length > 0;
  if (requiredChecks) {
    if (github.checks.headSha !== expectedHeadSha || github.checks.exactHead !== true) {
      push('CHECKS_HEAD_MISMATCH');
    }
    if (github.checks.requiredSatisfied !== true) push('REQUIRED_CHECKS_NOT_SATISFIED');
  }

  const requiredApprovals = github.ruleset.requiredApprovingReviewCount ?? 0;
  if (requiredApprovals > 0) {
    if (github.reviews.headSha !== expectedHeadSha || github.reviews.exactHead !== true) {
      push('REVIEW_HEAD_MISMATCH');
    }
    if (github.reviews.approvals < requiredApprovals) push('REQUIRED_APPROVALS_MISSING');
  }
  if (github.reviews.changesRequested > 0) push('CHANGES_REQUESTED');
  if (
    github.ruleset.requiresConversationResolution === true
    && (github.reviews.unresolvedThreads === null || github.reviews.unresolvedThreads > 0)
  ) {
    push('REQUIRED_THREADS_UNRESOLVED');
  }
  if (taskStatus !== 'REVIEW') push('TASK_NOT_IN_REVIEW');
  if (checkpointHeadSha !== expectedHeadSha) push('CHECKPOINT_HEAD_MISMATCH');
  return reasons;
}

export function composeGw41PremergeProof(
  rawInput: Readonly<{
    expectedHeadSha: string;
    github: GithubOperationalContext;
    taskStatus: string;
    checkpointHeadSha: string;
  }>,
  substrate: GovernedContractSubstrate
): PremergeProofResult {
  const expectedHeadSha = ShaSchema.parse(rawInput.expectedHeadSha);
  const checkpointHeadSha = ShaSchema.parse(rawInput.checkpointHeadSha);
  const taskStatus = z.string().trim().min(1).max(80).parse(rawInput.taskStatus);
  const github = rawInput.github;
  const reasons = premergeReasons(expectedHeadSha, github, taskStatus, checkpointHeadSha);
  const ready = reasons.length === 0;
  const repository = (
    github.repositoryResolution?.status === 'RESOLVED'
    && github.repositoryResolution.freshness === 'CURRENT'
  )
    ? github.repositoryResolution.selectedRepository?.fullName ?? null
    : null;
  const proofBase = {
    status: ready ? 'READY' as const : 'BLOCKED' as const,
    repository,
    headSha: expectedHeadSha,
    pullRequestNumber: github.pullRequest?.number ?? null,
    observedAt: github.observedAt,
    rulesetName: github.ruleset.name,
    requiredApprovalCount: github.ruleset.requiredApprovingReviewCount ?? 0,
    approvals: github.reviews.approvals,
    checksExactHead: github.checks.exactHead,
    reviewsExactHead: github.reviews.exactHead ?? null,
    unresolvedThreads: github.reviews.unresolvedThreads,
    taskStatus,
    checkpointHeadSha
  };
  const evidenceDigest = digest({
    repository,
    expectedHeadSha,
    pullRequest: github.pullRequest,
    checks: github.checks,
    reviews: github.reviews,
    ruleset: github.ruleset,
    evidence: github.evidence,
    taskStatus,
    checkpointHeadSha
  });
  const payload: PremergeProof = Object.freeze({
    ...proofBase,
    evidenceDigest,
    nextStepId: ready ? 'GW-42' : null
  });
  return result({
    stepId: 'GW-41',
    substrate,
    status: ready ? 'SUCCESS' : 'BLOCKED',
    reasonCodes: reasons,
    payload
  });
}

function premergeProofReasons(
  expectedHeadSha: string,
  proof: PremergeProofResult,
  expectedPullRequestNumber?: number,
  expectedRepository?: string
): string[] {
  if (proof.contract.stepId !== 'GW-41') return ['PREMERGE_PROOF_CONTRACT_MISMATCH'];
  if (proof.status !== 'SUCCESS' || proof.payload.status !== 'READY') {
    return ['PREMERGE_PROOF_NOT_READY'];
  }
  if (proof.payload.headSha !== expectedHeadSha) return ['PREMERGE_PROOF_HEAD_MISMATCH'];
  if (
    expectedPullRequestNumber !== undefined
    && proof.payload.pullRequestNumber !== expectedPullRequestNumber
  ) {
    return ['PREMERGE_PROOF_PR_MISMATCH'];
  }
  if (
    expectedRepository !== undefined
    && proof.payload.repository?.toLowerCase() !== expectedRepository.toLowerCase()
  ) {
    return ['PREMERGE_PROOF_REPOSITORY_MISMATCH'];
  }
  return [];
}

export function planGw42TaskMergeReady(
  rawInput: TaskTransitionInput & Readonly<{ premergeProof: PremergeProofResult }>,
  substrate: GovernedContractSubstrate
): ReviewResult<Readonly<{
  taskId: string;
  headSha: string;
  targetStatus: 'MERGE_READY';
  nextStepId: 'GW-43' | null;
}>> {
  const expectedHeadSha = ShaSchema.parse(rawInput.expectedHeadSha);
  const reasons = premergeProofReasons(expectedHeadSha, rawInput.premergeProof);
  if (reasons.length > 0) {
    return result({
      stepId: 'GW-42',
      substrate,
      status: 'BLOCKED',
      reasonCodes: reasons,
      payload: Object.freeze({
        taskId: rawInput.taskId,
        headSha: expectedHeadSha,
        targetStatus: 'MERGE_READY' as const,
        nextStepId: null
      })
    });
  }
  const planned = planTaskTransition('GW-42', {
    taskId: rawInput.taskId,
    expectedTaskRevision: rawInput.expectedTaskRevision,
    governedSessionId: rawInput.governedSessionId,
    expectedSessionRevision: rawInput.expectedSessionRevision,
    expectedBootstrapReceiptId: rawInput.expectedBootstrapReceiptId,
    expectedStateVersion: rawInput.expectedStateVersion,
    expectedHeadSha: rawInput.expectedHeadSha
  }, 'MERGE_READY', substrate);
  return planned;
}

export function planGw43ExactHeadMerge(
  rawInput: Readonly<{
    repository: string;
    pullRequestNumber: number;
    expectedHeadSha: string;
    premergeProof: PremergeProofResult;
  }>,
  substrate: GovernedContractSubstrate
): ReviewResult<Readonly<{
  repository: string;
  pullRequestNumber: number;
  headSha: string;
  nextStepId: 'GW-44' | null;
}>> {
  const input = z.object({
    repository: RepositorySchema,
    pullRequestNumber: z.number().int().positive(),
    expectedHeadSha: ShaSchema
  }).strict().parse({
    repository: rawInput.repository,
    pullRequestNumber: rawInput.pullRequestNumber,
    expectedHeadSha: rawInput.expectedHeadSha
  });
  const reasons = premergeProofReasons(
    input.expectedHeadSha,
    rawInput.premergeProof,
    input.pullRequestNumber,
    input.repository
  );
  const payload = Object.freeze({
    repository: input.repository,
    pullRequestNumber: input.pullRequestNumber,
    headSha: input.expectedHeadSha,
    nextStepId: null as 'GW-44' | null
  });
  if (reasons.length > 0) {
    return result({
      stepId: 'GW-43',
      substrate,
      status: 'BLOCKED',
      reasonCodes: reasons,
      payload
    });
  }
  return result({
    stepId: 'GW-43',
    substrate,
    status: 'READY',
    payload: Object.freeze({ ...payload, nextStepId: 'GW-44' as const }),
    effectPlan: effectPlan({
      stepId: 'GW-43',
      toolName: 'github_merge_pull_request',
      expectedHeadSha: input.expectedHeadSha,
      payload: {
        repository: input.repository,
        pullRequestNumber: input.pullRequestNumber,
        expectedHeadSha: input.expectedHeadSha
      },
      replayClass: 'NON_REPLAYABLE_RECOVER_BY_OBSERVATION',
      postconditions: [
        'merge result is observed from GitHub',
        'merged commit is attributable to the exact reviewed head'
      ],
      recoveryAnchor: `github-pr:${input.repository}:${input.pullRequestNumber}:merge:${input.expectedHeadSha}`
    })
  });
}
