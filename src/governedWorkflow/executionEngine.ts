import { createHash } from 'node:crypto';
import { z } from 'zod';

import type {
  GovernedContractSubstrate,
  GovernedStepId
} from './contractSubstrate.js';

export type EvidenceFreshness = 'CURRENT' | 'STALE' | 'UNAVAILABLE';

export type EffectPlan = Readonly<{
  effectId: string;
  kind: 'RECORD' | 'MUTATE';
  replayClass:
    | 'PURE'
    | 'READ_ONLY'
    | 'IDEMPOTENT_MUTATION'
    | 'NON_REPLAYABLE_MUTATION';
  authorization: 'ALLOW' | 'DENY' | 'UNKNOWN';
  safeNow: boolean;
}>;

export type ReplayClass =
  | 'PURE'
  | 'READ_ONLY'
  | 'IDEMPOTENT_MUTATION'
  | 'NON_REPLAYABLE_MUTATION';

export type EvidenceBinding = Readonly<{
  repository?: string;
  project?: string;
  component?: string;
  branch?: string;
  headSha?: string;
  sessionId?: string;
  taskId?: string;
}>;

export type EvidenceRef = Readonly<{
  authority: string;
  kind: 'OBSERVATION' | 'DERIVATION' | 'ATTESTATION' | 'DECLARATION';
  reference: string;
  observedAt: string;
  freshness: 'CURRENT' | 'STALE' | 'EXPIRED' | 'UNKNOWN';
  digest: string | null;
  binding: EvidenceBinding;
}>;

export type RecoveryAnchor = Readonly<{
  anchorId: string;
  stepId: string;
  observedPostcondition: EvidenceRef;
  binding: EvidenceBinding;
  replayClassOfNextStep: ReplayClass;
  duplicateInvocationRule: 'REOBSERVE_THEN_DECIDE';
}>;

export type ExecutionFrame = Readonly<{
  schemaVersion: 1;
  stepId: string;
  contractVersion: number | null;
  contractRegistryDigest: string;
  graphRegistryDigest: string;
  evidence: Readonly<{
    freshness: EvidenceFreshness;
    observedAt: string;
    digest: string;
    reasonCodes: readonly string[];
  }>;
  routeCandidates: readonly Readonly<{
    to: GovernedStepId;
    kind: 'FORWARD' | 'BACKWARD' | 'SKIP';
    trigger:
      | 'POSTCONDITION_PASS'
      | 'POSTCONDITION_FAIL'
      | 'SKIP_CONDITION'
      | 'REOBSERVE_REQUIRED';
  }>[];
  effectPlan: EffectPlan | null;
  recoveryAnchor: RecoveryAnchor | null;
  frameDigest: string;
}>;

export type ExecutionDisposition =
  | 'ROUTE'
  | 'WAIT_EXTERNAL'
  | 'BLOCK_LOCAL'
  | 'COMPLETE';

export type ExecutionReasonCode =
  | 'POSTCONDITION_PASS_ROUTE'
  | 'EVIDENCE_STALE'
  | 'EVIDENCE_UNAVAILABLE'
  | 'UNKNOWN_STEP_ID'
  | 'ROUTE_CONDITION_REQUIRED'
  | 'NO_PROGRESS_REOBSERVE_REQUIRED'
  | 'NO_ROUTE_AVAILABLE'
  | 'RUNTIME_TERMINAL_REACHED';

export type ShadowExecutionResult = Readonly<{
  disposition: ExecutionDisposition;
  reasonCode: ExecutionReasonCode;
  nextStepId: GovernedStepId | null;
  dispatchMode: 'DISABLED';
  effectDispatched: false;
  frame: ExecutionFrame;
}>;

const EvidenceBindingSchema = z.object({
  repository: z.string().trim().min(1).max(240).optional(),
  project: z.string().trim().min(1).max(240).optional(),
  component: z.string().trim().min(1).max(240).optional(),
  branch: z.string().trim().min(1).max(240).optional(),
  headSha: z.string().regex(/^[0-9a-f]{40}$/).optional(),
  sessionId: z.string().trim().min(1).max(160).optional(),
  taskId: z.string().trim().min(1).max(160).optional()
}).strict();

const EvidenceRefSchema = z.object({
  authority: z.string().trim().min(1).max(120),
  kind: z.enum(['OBSERVATION', 'DERIVATION', 'ATTESTATION', 'DECLARATION']),
  reference: z.string().trim().min(1).max(500),
  observedAt: z.string().datetime({ offset: true }),
  freshness: z.enum(['CURRENT', 'STALE', 'EXPIRED', 'UNKNOWN']),
  digest: z.string().regex(/^[0-9a-f]{64}$/).nullable(),
  binding: EvidenceBindingSchema
}).strict();

const RecoveryAnchorSchema = z.object({
  anchorId: z.string().trim().min(1).max(160),
  stepId: z.string().trim().min(1).max(32),
  observedPostcondition: EvidenceRefSchema,
  binding: EvidenceBindingSchema,
  replayClassOfNextStep: z.enum([
    'PURE',
    'READ_ONLY',
    'IDEMPOTENT_MUTATION',
    'NON_REPLAYABLE_MUTATION'
  ]),
  duplicateInvocationRule: z.literal('REOBSERVE_THEN_DECIDE')
}).strict();

const EvidenceSchema = z.object({
  freshness: z.enum(['CURRENT', 'STALE', 'UNAVAILABLE']),
  observedAt: z.string().datetime({ offset: true }),
  digest: z.string().regex(/^[0-9a-f]{64}$/),
  reasonCodes: z.array(z.string().trim().min(1).max(160)).max(40)
}).strict();

const EvaluateInputSchema = z.object({
  stepId: z.string().trim().min(1).max(32),
  evidence: EvidenceSchema,
  previousFrameDigest: z.string().regex(/^[0-9a-f]{64}$/).nullable()
}).strict();

export type ShadowExecutionInput = z.input<typeof EvaluateInputSchema>;

export type ShadowExecutionEngine = Readonly<{
  evaluate(input: ShadowExecutionInput): ShadowExecutionResult;
}>;

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>)
      .filter(([, entry]) => entry !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => `${JSON.stringify(key)}:${canonical(entry)}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function frameDigest(input: Omit<ExecutionFrame, 'frameDigest'>): string {
  return createHash('sha256').update(canonical(input)).digest('hex');
}

function freezeFrame(input: Omit<ExecutionFrame, 'frameDigest'>): ExecutionFrame {
  const digest = frameDigest(input);
  return Object.freeze({
    ...input,
    evidence: Object.freeze({
      ...input.evidence,
      reasonCodes: Object.freeze([...input.evidence.reasonCodes])
    }),
    routeCandidates: Object.freeze(input.routeCandidates.map((route) => Object.freeze({ ...route }))),
    recoveryAnchor: input.recoveryAnchor
      ? Object.freeze({
          ...input.recoveryAnchor,
          observedPostcondition: Object.freeze({
            ...input.recoveryAnchor.observedPostcondition,
            binding: Object.freeze({ ...input.recoveryAnchor.observedPostcondition.binding })
          }),
          binding: Object.freeze({ ...input.recoveryAnchor.binding })
        })
      : null,
    frameDigest: digest
  });
}

function result(
  frame: ExecutionFrame,
  disposition: ExecutionDisposition,
  reasonCode: ExecutionReasonCode,
  nextStepId: GovernedStepId | null = null
): ShadowExecutionResult {
  return Object.freeze({
    disposition,
    reasonCode,
    nextStepId,
    dispatchMode: 'DISABLED' as const,
    effectDispatched: false as const,
    frame
  });
}

function sameBinding(left: EvidenceBinding, right: EvidenceBinding): boolean {
  return canonical(left) === canonical(right);
}

export function parseRecoveryAnchor(
  rawInput: unknown,
  currentStepId: string
): RecoveryAnchor {
  const parsed = RecoveryAnchorSchema.parse(rawInput);
  if (parsed.stepId === currentStepId) {
    throw new Error('RECOVERY_ANCHOR_CURRENT_STEP_FORBIDDEN');
  }
  if (!sameBinding(parsed.binding, parsed.observedPostcondition.binding)) {
    throw new Error('RECOVERY_ANCHOR_BINDING_MISMATCH');
  }
  return Object.freeze({
    ...parsed,
    observedPostcondition: Object.freeze({
      ...parsed.observedPostcondition,
      binding: Object.freeze({ ...parsed.observedPostcondition.binding })
    }),
    binding: Object.freeze({ ...parsed.binding })
  });
}

export function createShadowExecutionEngine(input: {
  substrate: GovernedContractSubstrate;
}): ShadowExecutionEngine {
  const substrate = input.substrate;

  return Object.freeze({
    evaluate(rawInput) {
      const parsed = EvaluateInputSchema.parse(rawInput);
      const evidence = {
        ...parsed.evidence,
        reasonCodes: [...new Set(parsed.evidence.reasonCodes)].sort()
      };
      const evaluation = substrate.evaluate(parsed.stepId);
      const routes = evaluation.status === 'PASS'
        ? substrate.outgoing(parsed.stepId)
        : [];
      const routeCandidates = routes.map((route) => ({
        to: route.to,
        kind: route.kind,
        trigger: route.trigger
      }));
      const frame = freezeFrame({
        schemaVersion: 1,
        stepId: parsed.stepId,
        contractVersion: evaluation.contractVersion,
        contractRegistryDigest: substrate.contractRegistryDigest,
        graphRegistryDigest: substrate.graphRegistryDigest,
        evidence,
        routeCandidates,
        effectPlan: null,
        recoveryAnchor: null
      });

      if (evaluation.status === 'FAIL') {
        return result(frame, 'BLOCK_LOCAL', 'UNKNOWN_STEP_ID');
      }
      if (evidence.freshness === 'STALE') {
        return result(frame, 'WAIT_EXTERNAL', 'EVIDENCE_STALE');
      }
      if (evidence.freshness === 'UNAVAILABLE') {
        return result(frame, 'WAIT_EXTERNAL', 'EVIDENCE_UNAVAILABLE');
      }
      if (parsed.previousFrameDigest === frame.frameDigest) {
        return result(frame, 'WAIT_EXTERNAL', 'NO_PROGRESS_REOBSERVE_REQUIRED');
      }
      if (parsed.stepId === substrate.runtimeTerminal && routes.length === 0) {
        return result(frame, 'COMPLETE', 'RUNTIME_TERMINAL_REACHED');
      }
      if (routes.length === 1 && routes[0]!.trigger === 'POSTCONDITION_PASS') {
        return result(frame, 'ROUTE', 'POSTCONDITION_PASS_ROUTE', routes[0]!.to);
      }
      if (routes.length > 0) {
        return result(frame, 'WAIT_EXTERNAL', 'ROUTE_CONDITION_REQUIRED');
      }
      return result(frame, 'BLOCK_LOCAL', 'NO_ROUTE_AVAILABLE');
    }
  });
}
