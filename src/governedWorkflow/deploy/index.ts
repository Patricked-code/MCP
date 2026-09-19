import { createHash } from 'node:crypto';
import { z } from 'zod';

import type {
  GovernedContractSubstrate,
  GovernedStepId
} from '../contractSubstrate.js';

const ShaSchema = z.string().regex(/^[0-9a-f]{40}$/);
const TimestampSchema = z.string().datetime({ offset: true });
const RepositorySchema = z.string().trim().min(3).max(300)
  .regex(/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/);
const TaskIdSchema = z.string().regex(/^TASK-[0-9]{8}-[0-9]{3,}$/);
const UuidSchema = z.string().uuid();
const RevisionSchema = z.number().int().nonnegative();
const JobIdSchema = z.string().trim().min(1).max(160);
const AttestationIdSchema = z.string().trim().min(1).max(200);

type DeploymentStepId =
  | 'GW-44' | 'GW-45' | 'GW-46' | 'GW-47' | 'GW-48' | 'GW-49' | 'GW-50'
  | 'GW-51' | 'GW-52' | 'GW-53' | 'GW-54' | 'GW-55' | 'GW-56' | 'GW-57';

type DeploymentStatus =
  | 'READY'
  | 'SUCCESS'
  | 'BLOCKED'
  | 'UNVERIFIED'
  | 'CONFLICT'
  | 'STALE';

export type DeploymentContractBinding = Readonly<{
  stepId: GovernedStepId;
  contractVersion: number;
  contractRegistryDigest: string;
  graphRegistryDigest: string;
}>;

export type DeploymentEffectPlan = Readonly<{
  effectId: string;
  toolName: 'mcp_acknowledge_governed_context' | 'mcp_transition_governed_task';
  expectedHeadSha: string | null;
  payload: Readonly<Record<string, unknown>>;
  replayClass: 'CONDITIONALLY_IDEMPOTENT';
  authorizationRequired: true;
  postconditions: readonly string[];
  recoveryAnchor: string;
}>;

export type DeploymentResult<TPayload> = Readonly<{
  contract: DeploymentContractBinding;
  status: DeploymentStatus;
  reasonCodes: readonly string[];
  payload: TPayload;
  effectPlan: DeploymentEffectPlan | null;
  authorizationInferred: false;
  mutationPerformed: false;
}>;

const MainCiSchema = z.object({
  runId: z.number().int().positive(),
  workflow: z.literal('MCP CI'),
  event: z.enum(['push', 'workflow_dispatch']),
  headSha: ShaSchema,
  status: z.enum(['queued', 'in_progress', 'completed']),
  conclusion: z.string().trim().min(1).max(80).nullable(),
  observedAt: TimestampSchema
}).strict();

const DeployRunSchema = z.object({
  runId: z.number().int().positive(),
  jobId: JobIdSchema,
  workflow: z.literal('MCP Governed Deploy'),
  event: z.enum(['push', 'workflow_dispatch']),
  headSha: ShaSchema,
  status: z.enum(['queued', 'in_progress', 'completed']),
  conclusion: z.string().trim().min(1).max(80).nullable(),
  observedAt: TimestampSchema
}).strict();

const DeploymentAttestationSchema = z.object({
  schemaVersion: z.union([z.literal(1), z.literal(2)]),
  attestationId: AttestationIdSchema.optional(),
  jobId: JobIdSchema,
  requestedSha: ShaSchema,
  previousGitSha: ShaSchema,
  runtimeRevision: ShaSchema,
  result: z.enum(['succeeded', 'failed']),
  phase: z.enum([
    'locked', 'preflight', 'fetch', 'fast_forward', 'build', 'start',
    'health', 'oauth', 'mcp_auth', 'attested', 'rollback'
  ]),
  rollbackStatus: z.enum(['not_needed', 'succeeded', 'failed']),
  healthOk: z.boolean(),
  oauthOk: z.boolean(),
  mcpAuthOk: z.boolean(),
  ci: z.object({
    runId: z.number().int().positive(),
    workflow: z.literal('MCP CI'),
    event: z.enum(['push', 'workflow_dispatch']),
    headSha: ShaSchema,
    conclusion: z.literal('success')
  }).strict().optional(),
  endedAt: TimestampSchema
}).strict();

const BuildEvidenceSchema = z.object({
  jobId: JobIdSchema,
  requestedSha: ShaSchema,
  buildOk: z.boolean(),
  observedAt: TimestampSchema
}).strict();

const RuntimeStartEvidenceSchema = z.object({
  jobId: JobIdSchema,
  requestedSha: ShaSchema,
  runtimeStarted: z.boolean(),
  observedAt: TimestampSchema
}).strict();

const LiveStateProjectionSchema = z.object({
  stateVersion: RevisionSchema,
  generatedAt: TimestampSchema,
  lastReconciledAt: TimestampSchema,
  maxAgeSeconds: z.number().int().positive().max(3600),
  freshness: z.enum(['CURRENT', 'STALE', 'UNKNOWN']),
  ageSeconds: z.number().int().nonnegative(),
  githubHead: ShaSchema.nullable(),
  s1Head: ShaSchema.nullable(),
  runtimeRevision: ShaSchema.nullable(),
  globalAlignment: z.string().trim().min(1).max(80),
  contradictions: z.array(z.string().trim().min(1).max(240)).max(50)
}).strict();

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

function contract(
  stepId: DeploymentStepId,
  substrate: GovernedContractSubstrate
): DeploymentContractBinding {
  const resolved = substrate.resolve(stepId);
  if (!resolved) throw new Error(`GWC_DEPLOYMENT_CONTRACT_MISSING:${stepId}`);
  return Object.freeze({
    stepId: resolved.stepId,
    contractVersion: resolved.contractVersion,
    contractRegistryDigest: substrate.contractRegistryDigest,
    graphRegistryDigest: substrate.graphRegistryDigest
  });
}

function result<TPayload>(input: {
  stepId: DeploymentStepId;
  substrate: GovernedContractSubstrate;
  status: DeploymentStatus;
  reasonCodes?: readonly string[];
  payload: TPayload;
  effectPlan?: DeploymentEffectPlan | null;
}): DeploymentResult<TPayload> {
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
  stepId: 'GW-55' | 'GW-57';
  toolName: DeploymentEffectPlan['toolName'];
  expectedHeadSha?: string | null;
  payload: Record<string, unknown>;
  postconditions: readonly string[];
  recoveryAnchor: string;
}): DeploymentEffectPlan {
  const expectedHeadSha = input.expectedHeadSha === undefined || input.expectedHeadSha === null
    ? null
    : ShaSchema.parse(input.expectedHeadSha);
  const payload = Object.freeze({ ...input.payload });
  return Object.freeze({
    effectId: `deploy:${input.stepId}:${digest({
      toolName: input.toolName,
      expectedHeadSha,
      payload
    }).slice(0, 24)}`,
    toolName: input.toolName,
    expectedHeadSha,
    payload,
    replayClass: 'CONDITIONALLY_IDEMPOTENT' as const,
    authorizationRequired: true as const,
    postconditions: Object.freeze([...input.postconditions]),
    recoveryAnchor: input.recoveryAnchor
  });
}

export function observeGw44MainMergeCommit(
  rawInput: Readonly<{
    repository: string;
    expectedMergeSha: string;
    mainHeadSha: string;
    observedAt: string;
  }>,
  substrate: GovernedContractSubstrate
) {
  const input = z.object({
    repository: RepositorySchema,
    expectedMergeSha: ShaSchema,
    mainHeadSha: ShaSchema,
    observedAt: TimestampSchema
  }).strict().parse(rawInput);
  const exact = input.mainHeadSha === input.expectedMergeSha;
  const payload = Object.freeze({
    repository: input.repository,
    headSha: input.mainHeadSha,
    observedAt: input.observedAt,
    exact,
    nextStepId: exact ? 'GW-45' as const : null
  });
  return result({
    stepId: 'GW-44',
    substrate,
    status: exact ? 'SUCCESS' : 'CONFLICT',
    reasonCodes: exact ? [] : ['MAIN_HEAD_MISMATCH'],
    payload
  });
}

export function observeGw45MainCi(
  rawInput: Readonly<{
    expectedHeadSha: string;
    ci: z.input<typeof MainCiSchema>;
  }>,
  substrate: GovernedContractSubstrate
) {
  const expectedHeadSha = ShaSchema.parse(rawInput.expectedHeadSha);
  const ci = MainCiSchema.parse(rawInput.ci);
  const payload = Object.freeze({
    runId: ci.runId,
    headSha: ci.headSha,
    observedAt: ci.observedAt,
    workflow: ci.workflow,
    event: ci.event,
    conclusion: ci.conclusion,
    nextStepId: null as 'GW-46' | null
  });
  if (ci.headSha !== expectedHeadSha) {
    return result({
      stepId: 'GW-45', substrate, status: 'CONFLICT',
      reasonCodes: ['MAIN_CI_HEAD_MISMATCH'], payload
    });
  }
  if (ci.status !== 'completed') {
    return result({
      stepId: 'GW-45', substrate, status: 'UNVERIFIED',
      reasonCodes: ['MAIN_CI_PENDING'], payload
    });
  }
  if (ci.conclusion !== 'success') {
    return result({
      stepId: 'GW-45', substrate, status: 'BLOCKED',
      reasonCodes: ['MAIN_CI_NOT_SUCCESS'], payload
    });
  }
  return result({
    stepId: 'GW-45', substrate, status: 'SUCCESS',
    payload: Object.freeze({ ...payload, nextStepId: 'GW-46' as const })
  });
}

export function observeGw46GovernedAutodeploy(
  rawInput: Readonly<{
    expectedHeadSha: string;
    ciProof: DeploymentResult<Readonly<Record<string, unknown>>>;
    deploy: z.input<typeof DeployRunSchema>;
  }>,
  substrate: GovernedContractSubstrate
) {
  const expectedHeadSha = ShaSchema.parse(rawInput.expectedHeadSha);
  const deploy = DeployRunSchema.parse(rawInput.deploy);
  const ciHead = (rawInput.ciProof.payload as { headSha?: unknown }).headSha;
  const ciRunId = (rawInput.ciProof.payload as { runId?: unknown }).runId;
  const ciValid = rawInput.ciProof.contract.stepId === 'GW-45'
    && rawInput.ciProof.status === 'SUCCESS'
    && ciHead === expectedHeadSha;
  const payload = Object.freeze({
    deployRunId: deploy.runId,
    jobId: deploy.jobId,
    headSha: deploy.headSha,
    observedAt: deploy.observedAt,
    ciRunId: typeof ciRunId === 'number' ? ciRunId : null,
    nextStepIds: Object.freeze([] as string[])
  });
  if (!ciValid) {
    return result({
      stepId: 'GW-46', substrate, status: 'BLOCKED',
      reasonCodes: ['EXACT_SHA_CI_PROOF_REQUIRED'], payload
    });
  }
  if (deploy.headSha !== expectedHeadSha) {
    return result({
      stepId: 'GW-46', substrate, status: 'CONFLICT',
      reasonCodes: ['DEPLOY_RUN_HEAD_MISMATCH'], payload
    });
  }
  if (deploy.status === 'completed' && deploy.conclusion !== 'success') {
    return result({
      stepId: 'GW-46', substrate, status: 'BLOCKED',
      reasonCodes: ['DEPLOY_RUN_FAILED'], payload
    });
  }
  return result({
    stepId: 'GW-46', substrate, status: 'SUCCESS',
    payload: Object.freeze({
      ...payload,
      nextStepIds: Object.freeze(['GW-47', 'GW-48', 'GW-49', 'GW-50', 'GW-51', 'GW-52'] as const)
    })
  });
}

export function observeGw47GithubToS1Sync(
  rawInput: Readonly<{
    expectedHeadSha: string;
    attestation: z.input<typeof DeploymentAttestationSchema>;
  }>,
  substrate: GovernedContractSubstrate
) {
  const expectedHeadSha = ShaSchema.parse(rawInput.expectedHeadSha);
  const attestation = DeploymentAttestationSchema.parse(rawInput.attestation);
  const payload = Object.freeze({
    jobId: attestation.jobId,
    attestationId: attestation.attestationId ?? null,
    requestedSha: attestation.requestedSha,
    previousGitSha: attestation.previousGitSha,
    endedAt: attestation.endedAt,
    nextStepId: null as 'GW-48' | null
  });
  if (attestation.requestedSha !== expectedHeadSha) {
    return result({
      stepId: 'GW-47', substrate, status: 'CONFLICT',
      reasonCodes: ['SYNC_SHA_MISMATCH'], payload
    });
  }
  if (attestation.result !== 'succeeded' || attestation.phase !== 'attested') {
    return result({
      stepId: 'GW-47', substrate, status: 'BLOCKED',
      reasonCodes: ['SYNC_ATTESTATION_NOT_SUCCESS'], payload
    });
  }
  return result({
    stepId: 'GW-47', substrate, status: 'SUCCESS',
    payload: Object.freeze({ ...payload, nextStepId: 'GW-48' as const })
  });
}

export function observeGw48DeployBuild(
  rawInput: Readonly<{
    expectedHeadSha: string;
    expectedJobId: string;
    evidence: z.input<typeof BuildEvidenceSchema>;
  }>,
  substrate: GovernedContractSubstrate
) {
  const expectedHeadSha = ShaSchema.parse(rawInput.expectedHeadSha);
  const expectedJobId = JobIdSchema.parse(rawInput.expectedJobId);
  const evidence = BuildEvidenceSchema.parse(rawInput.evidence);
  const payload = Object.freeze({
    jobId: evidence.jobId,
    requestedSha: evidence.requestedSha,
    buildOk: evidence.buildOk,
    observedAt: evidence.observedAt,
    nextStepId: null as 'GW-49' | null
  });
  if (evidence.jobId !== expectedJobId) {
    return result({
      stepId: 'GW-48', substrate, status: 'CONFLICT',
      reasonCodes: ['BUILD_JOB_MISMATCH'], payload
    });
  }
  if (evidence.requestedSha !== expectedHeadSha) {
    return result({
      stepId: 'GW-48', substrate, status: 'CONFLICT',
      reasonCodes: ['BUILD_SHA_MISMATCH'], payload
    });
  }
  if (!evidence.buildOk) {
    return result({
      stepId: 'GW-48', substrate, status: 'BLOCKED',
      reasonCodes: ['DEPLOY_BUILD_NOT_PROVEN'], payload
    });
  }
  return result({
    stepId: 'GW-48', substrate, status: 'SUCCESS',
    payload: Object.freeze({ ...payload, nextStepId: 'GW-49' as const })
  });
}

export function observeGw49RuntimeStart(
  rawInput: Readonly<{
    expectedHeadSha: string;
    expectedJobId: string;
    evidence: z.input<typeof RuntimeStartEvidenceSchema>;
  }>,
  substrate: GovernedContractSubstrate
) {
  const expectedHeadSha = ShaSchema.parse(rawInput.expectedHeadSha);
  const expectedJobId = JobIdSchema.parse(rawInput.expectedJobId);
  const evidence = RuntimeStartEvidenceSchema.parse(rawInput.evidence);
  const payload = Object.freeze({
    jobId: evidence.jobId,
    requestedSha: evidence.requestedSha,
    runtimeStarted: evidence.runtimeStarted,
    observedAt: evidence.observedAt,
    nextStepId: null as 'GW-50' | null
  });
  if (evidence.jobId !== expectedJobId) {
    return result({
      stepId: 'GW-49', substrate, status: 'CONFLICT',
      reasonCodes: ['RUNTIME_START_JOB_MISMATCH'], payload
    });
  }
  if (evidence.requestedSha !== expectedHeadSha) {
    return result({
      stepId: 'GW-49', substrate, status: 'CONFLICT',
      reasonCodes: ['RUNTIME_START_SHA_MISMATCH'], payload
    });
  }
  if (!evidence.runtimeStarted) {
    return result({
      stepId: 'GW-49', substrate, status: 'BLOCKED',
      reasonCodes: ['RUNTIME_START_NOT_PROVEN'], payload
    });
  }
  return result({
    stepId: 'GW-49', substrate, status: 'SUCCESS',
    payload: Object.freeze({ ...payload, nextStepId: 'GW-50' as const })
  });
}

export function observeGw50Health(
  rawInput: Readonly<{
    expectedHeadSha: string;
    attestation: z.input<typeof DeploymentAttestationSchema>;
  }>,
  substrate: GovernedContractSubstrate
) {
  const expectedHeadSha = ShaSchema.parse(rawInput.expectedHeadSha);
  const attestation = DeploymentAttestationSchema.parse(rawInput.attestation);
  const payload = Object.freeze({
    jobId: attestation.jobId,
    requestedSha: attestation.requestedSha,
    healthOk: attestation.healthOk,
    oauthOk: attestation.oauthOk,
    mcpAuthOk: attestation.mcpAuthOk,
    endedAt: attestation.endedAt,
    nextStepId: null as 'GW-51' | null
  });
  if (attestation.requestedSha !== expectedHeadSha) {
    return result({
      stepId: 'GW-50', substrate, status: 'CONFLICT',
      reasonCodes: ['HEALTH_SHA_MISMATCH'], payload
    });
  }
  if (!attestation.healthOk || !attestation.oauthOk || !attestation.mcpAuthOk) {
    return result({
      stepId: 'GW-50', substrate, status: 'BLOCKED',
      reasonCodes: ['HEALTH_ATTESTATION_INCOMPLETE'], payload
    });
  }
  return result({
    stepId: 'GW-50', substrate, status: 'SUCCESS',
    payload: Object.freeze({ ...payload, nextStepId: 'GW-51' as const })
  });
}

export function observeGw51RuntimeImage(
  rawInput: Readonly<{
    expectedHeadSha: string;
    expectedJobId: string;
    runtimeRevision: string;
    observedAt: string;
  }>,
  substrate: GovernedContractSubstrate
) {
  const input = z.object({
    expectedHeadSha: ShaSchema,
    expectedJobId: JobIdSchema,
    runtimeRevision: ShaSchema,
    observedAt: TimestampSchema
  }).strict().parse(rawInput);
  const exact = input.runtimeRevision === input.expectedHeadSha;
  const payload = Object.freeze({
    jobId: input.expectedJobId,
    runtimeRevision: input.runtimeRevision,
    observedAt: input.observedAt,
    exactHead: exact,
    nextStepId: exact ? 'GW-52' as const : null
  });
  return result({
    stepId: 'GW-51',
    substrate,
    status: exact ? 'SUCCESS' : 'CONFLICT',
    reasonCodes: exact ? [] : ['RUNTIME_IMAGE_SHA_MISMATCH'],
    payload
  });
}

function proofHead(
  proof: DeploymentResult<Readonly<Record<string, unknown>>>,
  stepId: DeploymentStepId,
  field: 'headSha' | 'requestedSha' | 'runtimeRevision'
): string | null {
  if (proof.contract.stepId !== stepId || proof.status !== 'SUCCESS') return null;
  const value = (proof.payload as Record<string, unknown>)[field];
  return typeof value === 'string' ? value : null;
}

export function composeGw52ExactDeploymentProof(
  rawInput: Readonly<{
    expectedHeadSha: string;
    ciProof: DeploymentResult<Readonly<Record<string, unknown>>>;
    syncProof: DeploymentResult<Readonly<Record<string, unknown>>>;
    buildProof: DeploymentResult<Readonly<Record<string, unknown>>>;
    runtimeStartProof: DeploymentResult<Readonly<Record<string, unknown>>>;
    healthProof: DeploymentResult<Readonly<Record<string, unknown>>>;
    imageProof: DeploymentResult<Readonly<Record<string, unknown>>>;
    liveState: z.input<typeof LiveStateProjectionSchema>;
  }>,
  substrate: GovernedContractSubstrate
) {
  const expectedHeadSha = ShaSchema.parse(rawInput.expectedHeadSha);
  const liveState = LiveStateProjectionSchema.parse(rawInput.liveState);
  const proofChecks = [
    proofHead(rawInput.ciProof, 'GW-45', 'headSha'),
    proofHead(rawInput.syncProof, 'GW-47', 'requestedSha'),
    proofHead(rawInput.buildProof, 'GW-48', 'requestedSha'),
    proofHead(rawInput.runtimeStartProof, 'GW-49', 'requestedSha'),
    proofHead(rawInput.healthProof, 'GW-50', 'requestedSha'),
    proofHead(rawInput.imageProof, 'GW-51', 'runtimeRevision')
  ];
  const payloadBase = {
    headSha: expectedHeadSha,
    runtimeRevision: liveState.runtimeRevision,
    stateVersion: liveState.stateVersion,
    evidenceDigest: digest({
      expectedHeadSha,
      proofs: rawInput,
      liveState
    }),
    nextStepId: null as 'GW-53' | null
  };
  if (proofChecks.some((value) => value !== expectedHeadSha)) {
    return result({
      stepId: 'GW-52', substrate, status: 'CONFLICT',
      reasonCodes: ['EXACT_SHA_PROOF_MISMATCH'],
      payload: Object.freeze(payloadBase)
    });
  }
  if (liveState.freshness !== 'CURRENT' || liveState.ageSeconds > liveState.maxAgeSeconds) {
    return result({
      stepId: 'GW-52', substrate, status: 'STALE',
      reasonCodes: ['LIVE_STATE_STALE'],
      payload: Object.freeze(payloadBase)
    });
  }
  if (
    liveState.githubHead !== expectedHeadSha
    || liveState.s1Head !== expectedHeadSha
    || liveState.runtimeRevision !== expectedHeadSha
    || liveState.globalAlignment !== 'FULLY_ALIGNED'
    || liveState.contradictions.length > 0
  ) {
    return result({
      stepId: 'GW-52', substrate, status: 'CONFLICT',
      reasonCodes: ['LIVE_STATE_DEPLOYMENT_MISMATCH'],
      payload: Object.freeze(payloadBase)
    });
  }
  return result({
    stepId: 'GW-52', substrate, status: 'SUCCESS',
    payload: Object.freeze({ ...payloadBase, runtimeRevision: expectedHeadSha, nextStepId: 'GW-53' as const })
  });
}

export function observeGw53LiveStateUpdate(
  rawInput: Readonly<{
    expectedHeadSha: string;
    exactDeploymentProof: Readonly<{
      status: 'SUCCESS';
      headSha: string;
      runtimeRevision: string;
      stateVersion: number;
    }>;
    liveState: z.input<typeof LiveStateProjectionSchema>;
  }>,
  substrate: GovernedContractSubstrate
) {
  const expectedHeadSha = ShaSchema.parse(rawInput.expectedHeadSha);
  const proof = z.object({
    status: z.literal('SUCCESS'),
    headSha: ShaSchema,
    runtimeRevision: ShaSchema,
    stateVersion: RevisionSchema
  }).strict().parse(rawInput.exactDeploymentProof);
  const liveState = LiveStateProjectionSchema.parse(rawInput.liveState);
  const payload = Object.freeze({
    stateVersion: liveState.stateVersion,
    runtimeRevision: liveState.runtimeRevision,
    nextStepId: null as 'GW-54' | null
  });
  if (proof.headSha !== expectedHeadSha || proof.runtimeRevision !== expectedHeadSha) {
    return result({
      stepId: 'GW-53', substrate, status: 'CONFLICT',
      reasonCodes: ['DEPLOYMENT_PROOF_HEAD_MISMATCH'], payload
    });
  }
  if (liveState.freshness !== 'CURRENT' || liveState.ageSeconds > liveState.maxAgeSeconds) {
    return result({
      stepId: 'GW-53', substrate, status: 'STALE',
      reasonCodes: ['LIVE_STATE_STALE'], payload
    });
  }
  if (
    liveState.stateVersion < proof.stateVersion
    || liveState.githubHead !== expectedHeadSha
    || liveState.s1Head !== expectedHeadSha
    || liveState.runtimeRevision !== expectedHeadSha
    || liveState.globalAlignment !== 'FULLY_ALIGNED'
    || liveState.contradictions.length > 0
  ) {
    return result({
      stepId: 'GW-53', substrate, status: 'CONFLICT',
      reasonCodes: ['LIVE_STATE_UPDATE_NOT_PROVEN'], payload
    });
  }
  return result({
    stepId: 'GW-53', substrate, status: 'SUCCESS',
    payload: Object.freeze({ ...payload, nextStepId: 'GW-54' as const })
  });
}

export function evaluateGw54ReceiptFreshness(
  rawInput: Readonly<{
    receipt: Readonly<{
      bootstrapReceiptId: string;
      stateVersion: number;
      runtimeRevision: string | null;
    }>;
    liveState: z.input<typeof LiveStateProjectionSchema>;
  }>,
  substrate: GovernedContractSubstrate
) {
  const receipt = z.object({
    bootstrapReceiptId: UuidSchema,
    stateVersion: RevisionSchema,
    runtimeRevision: ShaSchema.nullable()
  }).strict().parse(rawInput.receipt);
  const liveState = LiveStateProjectionSchema.parse(rawInput.liveState);
  const payloadBase = {
    bootstrapReceiptId: receipt.bootstrapReceiptId,
    receiptStateVersion: receipt.stateVersion,
    currentStateVersion: liveState.stateVersion,
    receiptRuntimeRevision: receipt.runtimeRevision,
    currentRuntimeRevision: liveState.runtimeRevision,
    nextStepId: null as 'GW-55' | 'GW-56' | null
  };
  if (receipt.stateVersion > liveState.stateVersion) {
    return result({
      stepId: 'GW-54', substrate, status: 'CONFLICT',
      reasonCodes: ['LIVE_STATE_BEHIND_RECEIPT'],
      payload: Object.freeze(payloadBase)
    });
  }
  const stale = receipt.stateVersion < liveState.stateVersion
    || receipt.runtimeRevision !== liveState.runtimeRevision;
  return result({
    stepId: 'GW-54',
    substrate,
    status: stale ? 'STALE' : 'SUCCESS',
    reasonCodes: stale ? ['BOOTSTRAP_RECEIPT_STALE'] : [],
    payload: Object.freeze({
      ...payloadBase,
      nextStepId: stale ? 'GW-55' as const : 'GW-56' as const
    })
  });
}

export function planGw55ReceiptRefresh(
  rawInput: Readonly<{
    governedSessionId: string;
    expectedSessionRevision: number;
    expectedStateVersion: number;
    receiptFreshness: Readonly<{
      status: 'STALE' | 'SUCCESS' | 'CONFLICT';
      currentStateVersion: number;
      receiptStateVersion: number;
    }>;
  }>,
  substrate: GovernedContractSubstrate
) {
  const input = z.object({
    governedSessionId: UuidSchema,
    expectedSessionRevision: RevisionSchema,
    expectedStateVersion: RevisionSchema,
    receiptFreshness: z.object({
      status: z.enum(['STALE', 'SUCCESS', 'CONFLICT']),
      currentStateVersion: RevisionSchema,
      receiptStateVersion: RevisionSchema
    }).strict()
  }).strict().parse(rawInput);
  const payload = Object.freeze({
    governedSessionId: input.governedSessionId,
    targetStateVersion: input.expectedStateVersion,
    nextStepId: null as 'GW-56' | null
  });
  if (
    input.receiptFreshness.status !== 'STALE'
    || input.receiptFreshness.currentStateVersion !== input.expectedStateVersion
  ) {
    return result({
      stepId: 'GW-55', substrate, status: 'BLOCKED',
      reasonCodes: ['STALE_RECEIPT_REFRESH_REQUIRED'], payload
    });
  }
  return result({
    stepId: 'GW-55', substrate, status: 'READY',
    payload: Object.freeze({ ...payload, nextStepId: 'GW-56' as const }),
    effectPlan: effectPlan({
      stepId: 'GW-55',
      toolName: 'mcp_acknowledge_governed_context',
      payload: {
        governedSessionId: input.governedSessionId,
        expectedSessionRevision: input.expectedSessionRevision,
        expectedStateVersion: input.expectedStateVersion
      },
      postconditions: [
        'session acknowledges expectedStateVersion',
        'bootstrap receipt is refreshed by the existing session authority'
      ],
      recoveryAnchor: `governed-session:${input.governedSessionId}:state:${input.expectedStateVersion}`
    })
  });
}

export type RuntimeBindingProposal = Readonly<{
  taskId: string;
  taskRevision: number;
  governedSessionId: string;
  sessionRevision: number;
  bootstrapReceiptId: string;
  stateVersion: number;
  runtimeRevision: string;
}>;

export function deriveGw56TaskRuntimeRevisionBinding(
  rawInput: RuntimeBindingProposal & Readonly<{
    expectedTaskRevision: number;
    expectedSessionRevision: number;
    receiptStateVersion: number;
    liveStateVersion: number;
    deploymentHeadSha: string;
  }>,
  substrate: GovernedContractSubstrate
) {
  const input = z.object({
    taskId: TaskIdSchema,
    expectedTaskRevision: RevisionSchema,
    governedSessionId: UuidSchema,
    expectedSessionRevision: RevisionSchema,
    bootstrapReceiptId: UuidSchema,
    receiptStateVersion: RevisionSchema,
    liveStateVersion: RevisionSchema,
    deploymentHeadSha: ShaSchema,
    runtimeRevision: ShaSchema
  }).strict().parse(rawInput);
  const payload: RuntimeBindingProposal & { nextStepId: 'GW-57' | null } = Object.freeze({
    taskId: input.taskId,
    taskRevision: input.expectedTaskRevision,
    governedSessionId: input.governedSessionId,
    sessionRevision: input.expectedSessionRevision,
    bootstrapReceiptId: input.bootstrapReceiptId,
    stateVersion: input.liveStateVersion,
    runtimeRevision: input.runtimeRevision,
    nextStepId: null
  });
  if (input.receiptStateVersion !== input.liveStateVersion) {
    return result({
      stepId: 'GW-56', substrate, status: 'STALE',
      reasonCodes: ['RECEIPT_STATE_VERSION_STALE'], payload
    });
  }
  if (input.deploymentHeadSha !== input.runtimeRevision) {
    return result({
      stepId: 'GW-56', substrate, status: 'CONFLICT',
      reasonCodes: ['RUNTIME_REVISION_DEPLOYMENT_MISMATCH'], payload
    });
  }
  return result({
    stepId: 'GW-56', substrate, status: 'SUCCESS',
    payload: Object.freeze({ ...payload, nextStepId: 'GW-57' as const })
  });
}

export function planGw57TaskDeploying(
  rawInput: Readonly<{
    taskId: string;
    expectedTaskRevision: number;
    governedSessionId: string;
    expectedSessionRevision: number;
    expectedBootstrapReceiptId: string;
    expectedStateVersion: number;
    binding: RuntimeBindingProposal;
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
    binding: z.object({
      taskId: TaskIdSchema,
      taskRevision: RevisionSchema,
      governedSessionId: UuidSchema,
      sessionRevision: RevisionSchema,
      bootstrapReceiptId: UuidSchema,
      stateVersion: RevisionSchema,
      runtimeRevision: ShaSchema
    }).strict()
  }).strict().parse(rawInput);
  const b = input.binding;
  const payloadBase = {
    taskId: input.taskId,
    runtimeRevision: b.runtimeRevision,
    targetStatus: 'DEPLOYING' as const,
    nextStepId: null as 'GW-58' | null
  };
  if (b.taskId !== input.taskId || b.taskRevision !== input.expectedTaskRevision) {
    return result({
      stepId: 'GW-57', substrate, status: 'BLOCKED',
      reasonCodes: ['RUNTIME_BINDING_TASK_MISMATCH'],
      payload: Object.freeze(payloadBase)
    });
  }
  if (
    b.governedSessionId !== input.governedSessionId
    || b.sessionRevision !== input.expectedSessionRevision
  ) {
    return result({
      stepId: 'GW-57', substrate, status: 'BLOCKED',
      reasonCodes: ['RUNTIME_BINDING_SESSION_MISMATCH'],
      payload: Object.freeze(payloadBase)
    });
  }
  if (
    b.bootstrapReceiptId !== input.expectedBootstrapReceiptId
    || b.stateVersion !== input.expectedStateVersion
  ) {
    return result({
      stepId: 'GW-57', substrate, status: 'BLOCKED',
      reasonCodes: ['RUNTIME_BINDING_RECEIPT_MISMATCH'],
      payload: Object.freeze(payloadBase)
    });
  }
  return result({
    stepId: 'GW-57', substrate, status: 'READY',
    payload: Object.freeze({ ...payloadBase, nextStepId: 'GW-58' as const }),
    effectPlan: effectPlan({
      stepId: 'GW-57',
      toolName: 'mcp_transition_governed_task',
      expectedHeadSha: b.runtimeRevision,
      payload: {
        governedSessionId: input.governedSessionId,
        expectedSessionRevision: input.expectedSessionRevision,
        expectedBootstrapReceiptId: input.expectedBootstrapReceiptId,
        expectedStateVersion: input.expectedStateVersion,
        taskId: input.taskId,
        expectedTaskRevision: input.expectedTaskRevision,
        status: 'DEPLOYING',
        observedHeadSha: b.runtimeRevision,
        runtimeRevision: b.runtimeRevision
      },
      postconditions: [
        'task status is DEPLOYING',
        'task runtimeRevision equals the exact deployed SHA in the same transition'
      ],
      recoveryAnchor: `governed-task:${input.taskId}:revision:${input.expectedTaskRevision}:runtime:${b.runtimeRevision}`
    })
  });
}
