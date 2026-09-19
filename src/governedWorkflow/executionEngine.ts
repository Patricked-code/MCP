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

export type RecoveryAnchor = Readonly<{
  stepId: string;
  evidenceDigest: string;
  observedAt: string;
  contractRegistryDigest: string;
  graphRegistryDigest: string;
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
  recoveryAnchor: RecoveryAnchor;
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
    recoveryAnchor: Object.freeze({ ...input.recoveryAnchor }),
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
        recoveryAnchor: {
          stepId: parsed.stepId,
          evidenceDigest: evidence.digest,
          observedAt: evidence.observedAt,
          contractRegistryDigest: substrate.contractRegistryDigest,
          graphRegistryDigest: substrate.graphRegistryDigest
        }
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
