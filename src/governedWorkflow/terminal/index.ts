import { createHash } from 'node:crypto';
import { z } from 'zod';

import type {
  GovernedContractSubstrate,
  GovernedStepId
} from '../contractSubstrate.js';

const ShaSchema = z.string().regex(/^[0-9a-f]{40}$/);
const DigestSchema = z.string().regex(/^[0-9a-f]{64}$/);
const TimestampSchema = z.string().datetime({ offset: true });
const RepositorySchema = z.string().trim().min(3).max(300)
  .regex(/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/);
const BranchSchema = z.string().trim().min(1).max(255);
const TaskIdSchema = z.string().regex(/^TASK-[0-9]{8}-[0-9]{3,}$/);
const UuidSchema = z.string().uuid();
const RevisionSchema = z.number().int().nonnegative();
const PullRequestSchema = z.number().int().positive().max(2_147_483_647);

type TerminalStepId =
  | 'GW-58' | 'GW-59' | 'GW-60' | 'GW-61' | 'GW-62'
  | 'GW-63' | 'GW-64' | 'GW-65' | 'GW-66' | 'GW-67'
  | 'GW-68' | 'GW-69' | 'GW-70' | 'GW-71' | 'GW-72';

type TerminalStatus =
  | 'READY'
  | 'SUCCESS'
  | 'BLOCKED'
  | 'UNVERIFIED'
  | 'CONFLICT'
  | 'STALE';

export type TerminalContractBinding = Readonly<{
  stepId: GovernedStepId;
  contractVersion: number;
  contractRegistryDigest: string;
  graphRegistryDigest: string;
}>;

export type TerminalEffectPlan = Readonly<{
  effectId: string;
  toolName:
    | 'github_create_branch'
    | 'github_create_or_update_file'
    | 'github_create_pull_request'
    | 'github_merge_pull_request'
    | 'mcp_acknowledge_governed_context'
    | 'mcp_transition_governed_task'
    | 'mcp_create_governed_checkpoint'
    | 'mcp_release_governed_lock'
    | 'mcp_close_governed_session';
  expectedHeadSha: string | null;
  payload: Readonly<Record<string, unknown>>;
  replayClass: 'CONDITIONALLY_IDEMPOTENT' | 'NON_REPLAYABLE_RECOVER_BY_OBSERVATION';
  authorizationRequired: true;
  postconditions: readonly string[];
  recoveryAnchor: string;
}>;

export type TerminalResult<TPayload> = Readonly<{
  contract: TerminalContractBinding;
  status: TerminalStatus;
  reasonCodes: readonly string[];
  payload: TPayload;
  effectPlan: TerminalEffectPlan | null;
  effectPlans: readonly TerminalEffectPlan[];
  authorizationInferred: false;
  mutationPerformed: false;
}>;

const DocumentationStateSchema = z.object({
  status: z.enum(['ALIGNED', 'DRIFT', 'UNAVAILABLE']),
  drift: z.boolean(),
  observedAt: TimestampSchema,
  trackedHeadSha: ShaSchema.nullable()
}).strict();

const LiveStateSchema = z.object({
  stateVersion: RevisionSchema,
  freshness: z.enum(['CURRENT', 'STALE', 'UNKNOWN']),
  ageSeconds: z.number().int().nonnegative(),
  maxAgeSeconds: z.number().int().positive().max(3600),
  githubHead: ShaSchema.nullable(),
  s1Head: ShaSchema.nullable(),
  runtimeRevision: ShaSchema.nullable(),
  globalAlignment: z.string().trim().min(1).max(80),
  documentationStatus: z.enum(['ALIGNED', 'DRIFT', 'UNAVAILABLE']),
  documentationDrift: z.boolean(),
  contradictions: z.array(z.string().trim().min(1).max(240)).max(50),
  observedAt: TimestampSchema
}).strict();

function canonical(value: unknown): string {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value && typeof value === 'object') {
    return '{' + Object.entries(value as Record<string, unknown>)
      .filter(([, entry]) => entry !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => JSON.stringify(key) + ':' + canonical(entry))
      .join(',') + '}';
  }
  return JSON.stringify(value);
}

function digest(value: unknown): string {
  return createHash('sha256').update(canonical(value)).digest('hex');
}

function contract(
  stepId: TerminalStepId,
  substrate: GovernedContractSubstrate
): TerminalContractBinding {
  const resolved = substrate.resolve(stepId);
  if (!resolved) throw new Error('GWC_TERMINAL_CONTRACT_MISSING:' + stepId);
  return Object.freeze({
    stepId: resolved.stepId,
    contractVersion: resolved.contractVersion,
    contractRegistryDigest: substrate.contractRegistryDigest,
    graphRegistryDigest: substrate.graphRegistryDigest
  });
}

function result<TPayload>(input: {
  stepId: TerminalStepId;
  substrate: GovernedContractSubstrate;
  status: TerminalStatus;
  reasonCodes?: readonly string[];
  payload: TPayload;
  effectPlan?: TerminalEffectPlan | null;
  effectPlans?: readonly TerminalEffectPlan[];
}): TerminalResult<TPayload> {
  const plans = input.effectPlans
    ? Object.freeze([...input.effectPlans])
    : input.effectPlan
      ? Object.freeze([input.effectPlan])
      : Object.freeze([] as TerminalEffectPlan[]);
  return Object.freeze({
    contract: contract(input.stepId, input.substrate),
    status: input.status,
    reasonCodes: Object.freeze([...(input.reasonCodes ?? [])]),
    payload: input.payload,
    effectPlan: input.effectPlan ?? plans[0] ?? null,
    effectPlans: plans,
    authorizationInferred: false as const,
    mutationPerformed: false as const
  });
}

function effectPlan(input: {
  stepId: TerminalStepId;
  toolName: TerminalEffectPlan['toolName'];
  expectedHeadSha?: string | null;
  payload: Record<string, unknown>;
  replayClass?: TerminalEffectPlan['replayClass'];
  postconditions: readonly string[];
  recoveryAnchor: string;
}): TerminalEffectPlan {
  const expectedHeadSha = input.expectedHeadSha === undefined || input.expectedHeadSha === null
    ? null
    : ShaSchema.parse(input.expectedHeadSha);
  const payload = Object.freeze({ ...input.payload });
  return Object.freeze({
    effectId: 'terminal:' + input.stepId + ':' + digest({
      toolName: input.toolName,
      expectedHeadSha,
      payload
    }),
    toolName: input.toolName,
    expectedHeadSha,
    payload,
    replayClass: input.replayClass ?? 'CONDITIONALLY_IDEMPOTENT',
    authorizationRequired: true as const,
    postconditions: Object.freeze([...input.postconditions]),
    recoveryAnchor: input.recoveryAnchor
  });
}

export function evaluateGw58DocumentationDrift(
  rawInput: Readonly<{
    expectedHeadSha: string;
    documentation: z.input<typeof DocumentationStateSchema>;
  }>,
  substrate: GovernedContractSubstrate
) {
  const expectedHeadSha = ShaSchema.parse(rawInput.expectedHeadSha);
  const documentation = DocumentationStateSchema.parse(rawInput.documentation);
  const payloadBase = {
    observedAt: documentation.observedAt,
    trackedHeadSha: documentation.trackedHeadSha,
    documentationRequired: false,
    nextStepId: null as 'GW-59' | 'GW-66' | null
  };
  if (documentation.trackedHeadSha !== expectedHeadSha) {
    return result({
      stepId: 'GW-58', substrate, status: 'CONFLICT',
      reasonCodes: ['DOC_STATE_HEAD_MISMATCH'],
      payload: Object.freeze(payloadBase)
    });
  }
  if (documentation.status === 'UNAVAILABLE') {
    return result({
      stepId: 'GW-58', substrate, status: 'UNVERIFIED',
      reasonCodes: ['DOC_STATE_UNAVAILABLE'],
      payload: Object.freeze(payloadBase)
    });
  }
  const driftByStatus = documentation.status === 'DRIFT';
  if (driftByStatus !== documentation.drift) {
    return result({
      stepId: 'GW-58', substrate, status: 'CONFLICT',
      reasonCodes: ['DOC_DRIFT_SIGNAL_CONTRADICTION'],
      payload: Object.freeze(payloadBase)
    });
  }
  return result({
    stepId: 'GW-58', substrate, status: 'SUCCESS',
    payload: Object.freeze({
      ...payloadBase,
      documentationRequired: documentation.drift,
      nextStepId: documentation.drift ? 'GW-59' as const : 'GW-66' as const
    })
  });
}

export function planGw59DocumentationBranch(
  rawInput: Readonly<{
    repository: string;
    baseSha: string;
    branchName: string;
    documentationRequired: boolean;
  }>,
  substrate: GovernedContractSubstrate
) {
  const input = z.object({
    repository: RepositorySchema,
    baseSha: ShaSchema,
    branchName: BranchSchema,
    documentationRequired: z.boolean()
  }).strict().parse(rawInput);
  const payloadBase = {
    repository: input.repository,
    branchName: input.branchName,
    baseSha: input.baseSha,
    nextStepId: null as 'GW-60' | 'GW-66' | null
  };
  if (!input.documentationRequired) {
    return result({
      stepId: 'GW-59', substrate, status: 'SUCCESS',
      payload: Object.freeze({ ...payloadBase, nextStepId: 'GW-66' as const })
    });
  }
  return result({
    stepId: 'GW-59', substrate, status: 'READY',
    payload: Object.freeze({ ...payloadBase, nextStepId: 'GW-60' as const }),
    effectPlan: effectPlan({
      stepId: 'GW-59',
      toolName: 'github_create_branch',
      expectedHeadSha: input.baseSha,
      payload: {
        repository: input.repository,
        branchName: input.branchName,
        baseSha: input.baseSha
      },
      postconditions: [
        'documentation branch exists',
        'documentation branch starts from the exact observed base SHA'
      ],
      recoveryAnchor: 'github-branch:' + input.repository + ':' + input.branchName + ':' + input.baseSha
    })
  });
}

export function planGw60DocumentationReconciliation(
  rawInput: Readonly<{
    repository: string;
    branchName: string;
    baseSha: string;
    changes: readonly Readonly<{ path: string; contentDigest: string }>[];
  }>,
  substrate: GovernedContractSubstrate
) {
  const input = z.object({
    repository: RepositorySchema,
    branchName: BranchSchema,
    baseSha: ShaSchema,
    changes: z.array(z.object({
      path: z.string().trim().min(1).max(500),
      contentDigest: DigestSchema
    }).strict()).min(1).max(200)
  }).strict().parse(rawInput);
  const changes = Object.freeze(input.changes.map((entry) => Object.freeze({ ...entry })));
  return result({
    stepId: 'GW-60', substrate, status: 'READY',
    payload: Object.freeze({
      repository: input.repository,
      branchName: input.branchName,
      baseSha: input.baseSha,
      changeCount: changes.length,
      changes,
      nextStepId: 'GW-61' as const
    }),
    effectPlan: effectPlan({
      stepId: 'GW-60',
      toolName: 'github_create_or_update_file',
      expectedHeadSha: input.baseSha,
      payload: {
        repository: input.repository,
        branchName: input.branchName,
        baseSha: input.baseSha,
        changes
      },
      postconditions: [
        'documentation changes are written only on the documentation branch',
        'documentation governance remains the drift authority'
      ],
      recoveryAnchor: 'docs-reconcile:' + input.repository + ':' + input.branchName + ':' + digest(changes)
    })
  });
}

export function planGw61DocumentationPr(
  rawInput: Readonly<{
    repository: string;
    branchName: string;
    baseBranch: string;
    headSha: string;
    title: string;
  }>,
  substrate: GovernedContractSubstrate
) {
  const input = z.object({
    repository: RepositorySchema,
    branchName: BranchSchema,
    baseBranch: BranchSchema,
    headSha: ShaSchema,
    title: z.string().trim().min(1).max(240)
  }).strict().parse(rawInput);
  return result({
    stepId: 'GW-61', substrate, status: 'READY',
    payload: Object.freeze({
      repository: input.repository,
      branchName: input.branchName,
      headSha: input.headSha,
      nextStepId: 'GW-62' as const
    }),
    effectPlan: effectPlan({
      stepId: 'GW-61',
      toolName: 'github_create_pull_request',
      expectedHeadSha: input.headSha,
      payload: {
        repository: input.repository,
        head: input.branchName,
        base: input.baseBranch,
        expectedHeadSha: input.headSha,
        title: input.title
      },
      postconditions: [
        'documentation pull request targets the intended base branch',
        'pull request head remains bound to the exact documentation SHA'
      ],
      recoveryAnchor: 'docs-pr:' + input.repository + ':' + input.branchName + ':' + input.headSha
    })
  });
}

export function evaluateGw62DocumentationCiReview(
  rawInput: Readonly<{
    expectedHeadSha: string;
    evidence: Readonly<{
      pullRequestNumber: number;
      headSha: string;
      ciConclusion: string | null;
      reviewsSatisfied: boolean;
      unresolvedThreads: number;
      observedAt: string;
    }>;
  }>,
  substrate: GovernedContractSubstrate
) {
  const expectedHeadSha = ShaSchema.parse(rawInput.expectedHeadSha);
  const evidence = z.object({
    pullRequestNumber: PullRequestSchema,
    headSha: ShaSchema,
    ciConclusion: z.string().trim().min(1).max(80).nullable(),
    reviewsSatisfied: z.boolean(),
    unresolvedThreads: z.number().int().nonnegative().max(100_000),
    observedAt: TimestampSchema
  }).strict().parse(rawInput.evidence);
  const payloadBase = {
    pullRequestNumber: evidence.pullRequestNumber,
    headSha: evidence.headSha,
    observedAt: evidence.observedAt,
    nextStepId: null as 'GW-63' | null
  };
  if (evidence.headSha !== expectedHeadSha) {
    return result({
      stepId: 'GW-62', substrate, status: 'CONFLICT',
      reasonCodes: ['DOC_REVIEW_HEAD_MISMATCH'],
      payload: Object.freeze(payloadBase)
    });
  }
  if (evidence.ciConclusion !== 'success') {
    return result({
      stepId: 'GW-62', substrate,
      status: evidence.ciConclusion === null ? 'UNVERIFIED' : 'BLOCKED',
      reasonCodes: [evidence.ciConclusion === null ? 'DOC_CI_PENDING' : 'DOC_CI_NOT_SUCCESSFUL'],
      payload: Object.freeze(payloadBase)
    });
  }
  if (!evidence.reviewsSatisfied || evidence.unresolvedThreads > 0) {
    return result({
      stepId: 'GW-62', substrate, status: 'BLOCKED',
      reasonCodes: [
        ...(!evidence.reviewsSatisfied ? ['DOC_REVIEW_REQUIREMENTS_UNSATISFIED'] : []),
        ...(evidence.unresolvedThreads > 0 ? ['DOC_REVIEW_THREADS_UNRESOLVED'] : [])
      ],
      payload: Object.freeze(payloadBase)
    });
  }
  return result({
    stepId: 'GW-62', substrate, status: 'SUCCESS',
    payload: Object.freeze({ ...payloadBase, nextStepId: 'GW-63' as const })
  });
}

export function planGw63DocumentationExactHeadMerge(
  rawInput: Readonly<{
    repository: string;
    pullRequestNumber: number;
    expectedHeadSha: string;
    reviewProof: Readonly<{
      status: 'SUCCESS' | 'BLOCKED' | 'CONFLICT' | 'UNVERIFIED';
      headSha: string;
      pullRequestNumber: number;
    }>;
  }>,
  substrate: GovernedContractSubstrate
) {
  const input = z.object({
    repository: RepositorySchema,
    pullRequestNumber: PullRequestSchema,
    expectedHeadSha: ShaSchema,
    reviewProof: z.object({
      status: z.enum(['SUCCESS', 'BLOCKED', 'CONFLICT', 'UNVERIFIED']),
      headSha: ShaSchema,
      pullRequestNumber: PullRequestSchema
    }).strict()
  }).strict().parse(rawInput);
  const payloadBase = {
    pullRequestNumber: input.pullRequestNumber,
    headSha: input.expectedHeadSha,
    nextStepId: null as 'GW-64' | null
  };
  if (
    input.reviewProof.status !== 'SUCCESS'
    || input.reviewProof.headSha !== input.expectedHeadSha
    || input.reviewProof.pullRequestNumber !== input.pullRequestNumber
  ) {
    return result({
      stepId: 'GW-63', substrate, status: 'BLOCKED',
      reasonCodes: ['DOC_PREMERGE_PROOF_MISMATCH'],
      payload: Object.freeze(payloadBase)
    });
  }
  return result({
    stepId: 'GW-63', substrate, status: 'READY',
    payload: Object.freeze({ ...payloadBase, nextStepId: 'GW-64' as const }),
    effectPlan: effectPlan({
      stepId: 'GW-63',
      toolName: 'github_merge_pull_request',
      expectedHeadSha: input.expectedHeadSha,
      replayClass: 'NON_REPLAYABLE_RECOVER_BY_OBSERVATION',
      payload: {
        repository: input.repository,
        pullRequestNumber: input.pullRequestNumber,
        expectedHeadSha: input.expectedHeadSha
      },
      postconditions: [
        'merge occurs only for the reviewed exact documentation head',
        'resulting main SHA is re-observed before deployment evidence is accepted'
      ],
      recoveryAnchor: 'docs-merge:' + input.repository + ':pr:' + input.pullRequestNumber + ':' + input.expectedHeadSha
    })
  });
}

export function observeGw64DocumentationAutodeploy(
  rawInput: Readonly<{
    expectedHeadSha: string;
    deployment: Readonly<{
      headSha: string;
      runtimeRevision: string | null;
      status: 'queued' | 'in_progress' | 'completed';
      conclusion: string | null;
      observedAt: string;
    }>;
  }>,
  substrate: GovernedContractSubstrate
) {
  const expectedHeadSha = ShaSchema.parse(rawInput.expectedHeadSha);
  const deployment = z.object({
    headSha: ShaSchema,
    runtimeRevision: ShaSchema.nullable(),
    status: z.enum(['queued', 'in_progress', 'completed']),
    conclusion: z.string().trim().min(1).max(80).nullable(),
    observedAt: TimestampSchema
  }).strict().parse(rawInput.deployment);
  const payloadBase = {
    headSha: deployment.headSha,
    runtimeRevision: deployment.runtimeRevision,
    observedAt: deployment.observedAt,
    nextStepId: null as 'GW-65' | null
  };
  if (deployment.headSha !== expectedHeadSha) {
    return result({
      stepId: 'GW-64', substrate, status: 'CONFLICT',
      reasonCodes: ['DOC_DEPLOY_HEAD_MISMATCH'],
      payload: Object.freeze(payloadBase)
    });
  }
  if (deployment.status !== 'completed') {
    return result({
      stepId: 'GW-64', substrate, status: 'UNVERIFIED',
      reasonCodes: ['DOC_DEPLOY_PENDING'],
      payload: Object.freeze(payloadBase)
    });
  }
  if (deployment.conclusion !== 'success' || deployment.runtimeRevision !== expectedHeadSha) {
    return result({
      stepId: 'GW-64', substrate, status: 'BLOCKED',
      reasonCodes: ['DOC_DEPLOY_NOT_PROVEN'],
      payload: Object.freeze(payloadBase)
    });
  }
  return result({
    stepId: 'GW-64', substrate, status: 'SUCCESS',
    payload: Object.freeze({ ...payloadBase, nextStepId: 'GW-65' as const })
  });
}

export function observeGw65DocumentationLiveState(
  rawInput: Readonly<{
    expectedHeadSha: string;
    liveState: z.input<typeof LiveStateSchema>;
  }>,
  substrate: GovernedContractSubstrate
) {
  const expectedHeadSha = ShaSchema.parse(rawInput.expectedHeadSha);
  const liveState = LiveStateSchema.parse(rawInput.liveState);
  const payloadBase = {
    stateVersion: liveState.stateVersion,
    finalRuntimeSha: liveState.runtimeRevision,
    nextStepId: null as 'GW-66' | null
  };
  if (liveState.freshness !== 'CURRENT' || liveState.ageSeconds > liveState.maxAgeSeconds) {
    return result({
      stepId: 'GW-65', substrate, status: 'STALE',
      reasonCodes: ['LIVE_STATE_STALE'],
      payload: Object.freeze(payloadBase)
    });
  }
  if (
    liveState.githubHead !== expectedHeadSha
    || liveState.s1Head !== expectedHeadSha
    || liveState.runtimeRevision !== expectedHeadSha
    || liveState.globalAlignment !== 'FULLY_ALIGNED'
    || liveState.documentationStatus !== 'ALIGNED'
    || liveState.documentationDrift
    || liveState.contradictions.length > 0
  ) {
    return result({
      stepId: 'GW-65', substrate, status: 'CONFLICT',
      reasonCodes: ['DOC_LIVE_STATE_MISMATCH'],
      payload: Object.freeze(payloadBase)
    });
  }
  return result({
    stepId: 'GW-65', substrate, status: 'SUCCESS',
    payload: Object.freeze({
      ...payloadBase,
      finalRuntimeSha: expectedHeadSha,
      nextStepId: 'GW-66' as const
    })
  });
}

export function planGw66TerminalReceiptRefresh(
  rawInput: Readonly<{
    governedSessionId: string;
    expectedSessionRevision: number;
    expectedStateVersion: number;
    receipt: Readonly<{
      bootstrapReceiptId: string;
      stateVersion: number;
      runtimeRevision: string | null;
    }>;
    finalRuntimeSha: string;
  }>,
  substrate: GovernedContractSubstrate
) {
  const input = z.object({
    governedSessionId: UuidSchema,
    expectedSessionRevision: RevisionSchema,
    expectedStateVersion: RevisionSchema,
    receipt: z.object({
      bootstrapReceiptId: UuidSchema,
      stateVersion: RevisionSchema,
      runtimeRevision: ShaSchema.nullable()
    }).strict(),
    finalRuntimeSha: ShaSchema
  }).strict().parse(rawInput);
  const stale = input.receipt.stateVersion !== input.expectedStateVersion
    || input.receipt.runtimeRevision !== input.finalRuntimeSha;
  const payloadBase = {
    governedSessionId: input.governedSessionId,
    stateVersion: input.expectedStateVersion,
    finalRuntimeSha: input.finalRuntimeSha,
    receiptRefreshRequired: stale,
    nextStepId: 'GW-67' as const
  };
  if (!stale) {
    return result({
      stepId: 'GW-66', substrate, status: 'SUCCESS',
      payload: Object.freeze(payloadBase)
    });
  }
  return result({
    stepId: 'GW-66', substrate, status: 'READY',
    payload: Object.freeze(payloadBase),
    effectPlan: effectPlan({
      stepId: 'GW-66',
      toolName: 'mcp_acknowledge_governed_context',
      expectedHeadSha: input.finalRuntimeSha,
      payload: {
        governedSessionId: input.governedSessionId,
        expectedSessionRevision: input.expectedSessionRevision,
        expectedStateVersion: input.expectedStateVersion
      },
      postconditions: [
        'bootstrap receipt is refreshed by the existing governed session authority',
        'refreshed receipt binds the terminal Live State version'
      ],
      recoveryAnchor: 'terminal-receipt:' + input.governedSessionId + ':state:' + input.expectedStateVersion
    })
  });
}

export function planGw67TaskVerifying(
  rawInput: Readonly<{
    taskId: string;
    expectedTaskRevision: number;
    governedSessionId: string;
    expectedSessionRevision: number;
    expectedBootstrapReceiptId: string;
    expectedStateVersion: number;
    observedHeadSha: string;
    runtimeRevision: string;
    currentTaskStatus: string;
  }>,
  substrate: GovernedContractSubstrate
) {
  const input = z.object({
    taskId: TaskIdSchema,
    expectedTaskRevision: RevisionSchema,
    governedSessionId: UuidSchema,
    expectedSessionRevision: RevisionSchema,
    expectedBootstrapReceiptId: UuidSchema,
    expectedStateVersion: RevisionSchema,
    observedHeadSha: ShaSchema,
    runtimeRevision: ShaSchema,
    currentTaskStatus: z.string().trim().min(1).max(40)
  }).strict().parse(rawInput);
  const payloadBase = {
    taskId: input.taskId,
    targetStatus: 'VERIFYING' as const,
    nextStepId: null as 'GW-68' | null
  };
  if (input.currentTaskStatus !== 'DEPLOYING') {
    return result({
      stepId: 'GW-67', substrate, status: 'BLOCKED',
      reasonCodes: ['TASK_NOT_DEPLOYING'],
      payload: Object.freeze(payloadBase)
    });
  }
  if (input.observedHeadSha !== input.runtimeRevision) {
    return result({
      stepId: 'GW-67', substrate, status: 'CONFLICT',
      reasonCodes: ['VERIFYING_HEAD_RUNTIME_MISMATCH'],
      payload: Object.freeze(payloadBase)
    });
  }
  return result({
    stepId: 'GW-67', substrate, status: 'READY',
    payload: Object.freeze({ ...payloadBase, nextStepId: 'GW-68' as const }),
    effectPlan: effectPlan({
      stepId: 'GW-67',
      toolName: 'mcp_transition_governed_task',
      expectedHeadSha: input.observedHeadSha,
      payload: {
        governedSessionId: input.governedSessionId,
        expectedSessionRevision: input.expectedSessionRevision,
        expectedBootstrapReceiptId: input.expectedBootstrapReceiptId,
        expectedStateVersion: input.expectedStateVersion,
        taskId: input.taskId,
        expectedTaskRevision: input.expectedTaskRevision,
        status: 'VERIFYING',
        observedHeadSha: input.observedHeadSha,
        runtimeRevision: input.runtimeRevision
      },
      postconditions: [
        'task moves from DEPLOYING to VERIFYING',
        'task remains bound to the exact observed runtime revision'
      ],
      recoveryAnchor: 'governed-task:' + input.taskId + ':verifying:' + input.expectedTaskRevision
    })
  });
}

export type TerminalVerificationProof = Readonly<{
  status: 'SUCCESS';
  terminalVerified: true;
  taskId: string;
  governedSessionId: string;
  bootstrapReceiptId: string;
  stateVersion: number;
  headSha: string;
  runtimeRevision: string;
  evidenceDigest: string;
}>;

export function evaluateGw68TerminalVerification(
  rawInput: Readonly<{
    taskId: string;
    taskStatus: string;
    governedSessionId: string;
    bootstrapReceiptId: string;
    receiptStateVersion: number;
    expectedHeadSha: string;
    expectedRuntimeRevision: string;
    liveState: z.input<typeof LiveStateSchema>;
    documentation: z.input<typeof DocumentationStateSchema>;
  }>,
  substrate: GovernedContractSubstrate
) {
  const input = z.object({
    taskId: TaskIdSchema,
    taskStatus: z.string().trim().min(1).max(40),
    governedSessionId: UuidSchema,
    bootstrapReceiptId: UuidSchema,
    receiptStateVersion: RevisionSchema,
    expectedHeadSha: ShaSchema,
    expectedRuntimeRevision: ShaSchema,
    liveState: LiveStateSchema,
    documentation: DocumentationStateSchema
  }).strict().parse(rawInput);
  const proofBase = {
    terminalVerified: false,
    taskId: input.taskId,
    governedSessionId: input.governedSessionId,
    bootstrapReceiptId: input.bootstrapReceiptId,
    stateVersion: input.liveState.stateVersion,
    headSha: input.expectedHeadSha,
    runtimeRevision: input.expectedRuntimeRevision,
    evidenceDigest: digest({
      taskId: input.taskId,
      governedSessionId: input.governedSessionId,
      bootstrapReceiptId: input.bootstrapReceiptId,
      receiptStateVersion: input.receiptStateVersion,
      expectedHeadSha: input.expectedHeadSha,
      expectedRuntimeRevision: input.expectedRuntimeRevision,
      liveState: input.liveState,
      documentation: input.documentation
    }),
    nextStepId: null as 'GW-69' | null
  };
  if (input.taskStatus !== 'VERIFYING') {
    return result({
      stepId: 'GW-68', substrate, status: 'BLOCKED',
      reasonCodes: ['TASK_NOT_VERIFYING'],
      payload: Object.freeze(proofBase)
    });
  }
  if (
    input.liveState.freshness !== 'CURRENT'
    || input.liveState.ageSeconds > input.liveState.maxAgeSeconds
  ) {
    return result({
      stepId: 'GW-68', substrate, status: 'STALE',
      reasonCodes: ['TERMINAL_LIVE_STATE_STALE'],
      payload: Object.freeze(proofBase)
    });
  }
  const realityMismatch = (
    input.receiptStateVersion !== input.liveState.stateVersion
    || input.expectedRuntimeRevision !== input.expectedHeadSha
    || input.liveState.githubHead !== input.expectedHeadSha
    || input.liveState.s1Head !== input.expectedHeadSha
    || input.liveState.runtimeRevision !== input.expectedRuntimeRevision
    || input.liveState.globalAlignment !== 'FULLY_ALIGNED'
    || input.documentation.trackedHeadSha !== input.expectedHeadSha
    || input.documentation.status !== 'ALIGNED'
    || input.documentation.drift
    || input.liveState.documentationStatus !== 'ALIGNED'
    || input.liveState.documentationDrift
    || input.liveState.contradictions.length > 0
  );
  if (realityMismatch) {
    return result({
      stepId: 'GW-68', substrate, status: 'BLOCKED',
      reasonCodes: ['TERMINAL_REALITY_MISMATCH'],
      payload: Object.freeze(proofBase)
    });
  }
  return result({
    stepId: 'GW-68', substrate, status: 'SUCCESS',
    payload: Object.freeze({
      ...proofBase,
      terminalVerified: true as const,
      nextStepId: 'GW-69' as const
    })
  });
}

export function planGw69TaskDone(
  rawInput: Readonly<{
    taskId: string;
    expectedTaskRevision: number;
    governedSessionId: string;
    expectedSessionRevision: number;
    expectedBootstrapReceiptId: string;
    expectedStateVersion: number;
    expectedHeadSha: string;
    terminalVerification: Readonly<{
      status: 'SUCCESS' | 'BLOCKED' | 'STALE' | 'CONFLICT';
      terminalVerified: boolean;
      taskId: string;
      governedSessionId: string;
      bootstrapReceiptId: string;
      stateVersion: number;
      headSha: string;
      runtimeRevision: string;
    }>;
  }>,
  substrate: GovernedContractSubstrate
) {
  const input = z.object({
    taskId: TaskIdSchema,
    expectedTaskRevision: RevisionSchema,
    governedSessionId: UuidSchema,
    expectedSessionRevision: RevisionSchema,
    expectedBootstrapReceiptId: UuidSchema,
    expectedStateVersion: RevisionSchema,
    expectedHeadSha: ShaSchema,
    terminalVerification: z.object({
      status: z.enum(['SUCCESS', 'BLOCKED', 'STALE', 'CONFLICT']),
      terminalVerified: z.boolean(),
      taskId: TaskIdSchema,
      governedSessionId: UuidSchema,
      bootstrapReceiptId: UuidSchema,
      stateVersion: RevisionSchema,
      headSha: ShaSchema,
      runtimeRevision: ShaSchema
    }).strict()
  }).strict().parse(rawInput);
  const verification = input.terminalVerification;
  const payloadBase = {
    taskId: input.taskId,
    targetStatus: 'DONE' as const,
    nextStepId: null as 'GW-70' | null
  };
  const proofMismatch = (
    verification.status !== 'SUCCESS'
    || !verification.terminalVerified
    || verification.taskId !== input.taskId
    || verification.governedSessionId !== input.governedSessionId
    || verification.bootstrapReceiptId !== input.expectedBootstrapReceiptId
    || verification.stateVersion !== input.expectedStateVersion
    || verification.headSha !== input.expectedHeadSha
    || verification.runtimeRevision !== input.expectedHeadSha
  );
  if (proofMismatch) {
    return result({
      stepId: 'GW-69', substrate, status: 'BLOCKED',
      reasonCodes: ['TERMINAL_VERIFICATION_PROOF_MISMATCH'],
      payload: Object.freeze(payloadBase)
    });
  }
  return result({
    stepId: 'GW-69', substrate, status: 'READY',
    payload: Object.freeze({ ...payloadBase, nextStepId: 'GW-70' as const }),
    effectPlan: effectPlan({
      stepId: 'GW-69',
      toolName: 'mcp_transition_governed_task',
      expectedHeadSha: input.expectedHeadSha,
      payload: {
        governedSessionId: input.governedSessionId,
        expectedSessionRevision: input.expectedSessionRevision,
        expectedBootstrapReceiptId: input.expectedBootstrapReceiptId,
        expectedStateVersion: input.expectedStateVersion,
        taskId: input.taskId,
        expectedTaskRevision: input.expectedTaskRevision,
        status: 'DONE',
        observedHeadSha: input.expectedHeadSha,
        runtimeRevision: input.expectedHeadSha,
        terminalVerificationRequired: true
      },
      postconditions: [
        'task reaches DONE only after terminal verification succeeds',
        'DONE remains bound to the exact task, session, receipt, state and runtime SHA'
      ],
      recoveryAnchor: 'governed-task:' + input.taskId + ':done:' + input.expectedTaskRevision + ':' + input.expectedHeadSha
    })
  });
}

export function planGw70TerminalCheckpoint(
  rawInput: Readonly<{
    governedSessionId: string;
    expectedSessionRevision: number;
    expectedStateVersion: number;
    taskId: string;
    taskStatus: string;
    observedHeadSha: string;
    pullRequestNumber: number | null;
  }>,
  substrate: GovernedContractSubstrate
) {
  const input = z.object({
    governedSessionId: UuidSchema,
    expectedSessionRevision: RevisionSchema,
    expectedStateVersion: RevisionSchema,
    taskId: TaskIdSchema,
    taskStatus: z.string().trim().min(1).max(40),
    observedHeadSha: ShaSchema,
    pullRequestNumber: PullRequestSchema.nullable()
  }).strict().parse(rawInput);
  const terminalStatuses = new Set(['DONE', 'BLOCKED', 'CANCELLED', 'SUPERSEDED']);
  const payloadBase = {
    governedSessionId: input.governedSessionId,
    taskId: input.taskId,
    taskStatus: input.taskStatus,
    nextStepId: null as 'GW-71' | null
  };
  if (!terminalStatuses.has(input.taskStatus)) {
    return result({
      stepId: 'GW-70', substrate, status: 'BLOCKED',
      reasonCodes: ['TASK_NOT_TERMINAL_FOR_CHECKPOINT'],
      payload: Object.freeze(payloadBase)
    });
  }
  return result({
    stepId: 'GW-70', substrate, status: 'READY',
    payload: Object.freeze({ ...payloadBase, nextStepId: 'GW-71' as const }),
    effectPlan: effectPlan({
      stepId: 'GW-70',
      toolName: 'mcp_create_governed_checkpoint',
      expectedHeadSha: input.observedHeadSha,
      payload: {
        governedSessionId: input.governedSessionId,
        expectedSessionRevision: input.expectedSessionRevision,
        expectedStateVersion: input.expectedStateVersion,
        completedAction: 'terminal verification and task outcome',
        resultCode: input.taskStatus === 'DONE' ? 'TERMINAL_VERIFIED_DONE' : 'TERMINAL_NON_SUCCESS',
        pullRequestNumber: input.pullRequestNumber,
        observedHeadSha: input.observedHeadSha,
        blockers: input.taskStatus === 'DONE' ? [] : ['TASK_TERMINAL_NON_SUCCESS'],
        nextAction: 'release governed locks'
      },
      postconditions: [
        'terminal checkpoint exists before lock release',
        'checkpoint records the exact task outcome and observed head'
      ],
      recoveryAnchor: 'terminal-checkpoint:' + input.governedSessionId + ':' + input.taskId + ':' + input.expectedStateVersion
    })
  });
}

export function planGw71LockRelease(
  rawInput: Readonly<{
    governedSessionId: string;
    checkpointCreated: boolean;
    taskOutcome: string;
    locks: readonly Readonly<{
      lockId: string;
      lockRevision: number;
      status: 'ACTIVE' | 'RELEASED' | 'EXPIRED';
    }>[];
  }>,
  substrate: GovernedContractSubstrate
) {
  const input = z.object({
    governedSessionId: UuidSchema,
    checkpointCreated: z.boolean(),
    taskOutcome: z.string().trim().min(1).max(80),
    locks: z.array(z.object({
      lockId: UuidSchema,
      lockRevision: RevisionSchema,
      status: z.enum(['ACTIVE', 'RELEASED', 'EXPIRED'])
    }).strict()).max(64)
  }).strict().parse(rawInput);
  const payloadBase = {
    governedSessionId: input.governedSessionId,
    taskOutcome: input.taskOutcome,
    activeLockCount: input.locks.filter((entry) => entry.status === 'ACTIVE').length,
    nextStepId: null as 'GW-72' | null
  };
  if (!input.checkpointCreated) {
    return result({
      stepId: 'GW-71', substrate, status: 'BLOCKED',
      reasonCodes: ['TERMINAL_CHECKPOINT_REQUIRED_BEFORE_LOCK_RELEASE'],
      payload: Object.freeze(payloadBase)
    });
  }
  const plans = input.locks
    .filter((entry) => entry.status === 'ACTIVE')
    .map((entry) => effectPlan({
      stepId: 'GW-71',
      toolName: 'mcp_release_governed_lock',
      payload: {
        governedSessionId: input.governedSessionId,
        lockId: entry.lockId,
        expectedLockRevision: entry.lockRevision
      },
      postconditions: [
        'lock is no longer ACTIVE',
        'lock release is independent of task success or failure'
      ],
      recoveryAnchor: 'governed-lock:' + entry.lockId + ':revision:' + entry.lockRevision
    }));
  return result({
    stepId: 'GW-71',
    substrate,
    status: plans.length > 0 ? 'READY' : 'SUCCESS',
    payload: Object.freeze({ ...payloadBase, nextStepId: 'GW-72' as const }),
    effectPlans: plans
  });
}

export function planGw72SessionCloseAndQueueReconcile(
  rawInput: Readonly<{
    governedSessionId: string;
    expectedSessionRevision: number;
    checkpointCreated: boolean;
    activeLockCount: number;
    taskId: string;
    taskStatus: string;
  }>,
  substrate: GovernedContractSubstrate
) {
  const input = z.object({
    governedSessionId: UuidSchema,
    expectedSessionRevision: RevisionSchema,
    checkpointCreated: z.boolean(),
    activeLockCount: z.number().int().nonnegative().max(64),
    taskId: TaskIdSchema,
    taskStatus: z.string().trim().min(1).max(40)
  }).strict().parse(rawInput);
  const terminalStatuses = new Set(['DONE', 'BLOCKED', 'CANCELLED', 'SUPERSEDED']);
  const payloadBase = {
    governedSessionId: input.governedSessionId,
    taskId: input.taskId,
    queueReconcileAuthority: 'EXISTING_GOVERNED_TASK_QUEUE' as const,
    closureOrder: 'CHECKPOINT__LOCK_RELEASE__SESSION_CLOSE__QUEUE_RECONCILE' as const,
    nextStepId: null
  };
  if (!input.checkpointCreated) {
    return result({
      stepId: 'GW-72', substrate, status: 'BLOCKED',
      reasonCodes: ['TERMINAL_CHECKPOINT_REQUIRED_BEFORE_SESSION_CLOSE'],
      payload: Object.freeze(payloadBase)
    });
  }
  if (input.activeLockCount !== 0) {
    return result({
      stepId: 'GW-72', substrate, status: 'BLOCKED',
      reasonCodes: ['ACTIVE_LOCKS_REMAIN'],
      payload: Object.freeze(payloadBase)
    });
  }
  if (!terminalStatuses.has(input.taskStatus)) {
    return result({
      stepId: 'GW-72', substrate, status: 'BLOCKED',
      reasonCodes: ['TASK_NOT_TERMINAL_FOR_SESSION_CLOSE'],
      payload: Object.freeze(payloadBase)
    });
  }
  const closePlan = effectPlan({
    stepId: 'GW-72',
    toolName: 'mcp_close_governed_session',
    payload: {
      governedSessionId: input.governedSessionId,
      expectedSessionRevision: input.expectedSessionRevision
    },
    postconditions: [
      'governed session is CLOSED',
      'no governed locks remain active for the session',
      'existing governed task queue reconciliation runs after closure'
    ],
    recoveryAnchor: 'governed-session:' + input.governedSessionId + ':close:' + input.expectedSessionRevision
  });
  return result({
    stepId: 'GW-72', substrate, status: 'READY',
    payload: Object.freeze(payloadBase),
    effectPlans: [closePlan]
  });
}
