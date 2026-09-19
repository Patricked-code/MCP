import { z } from 'zod';

import type {
  CapabilityReality,
  GovernanceDecision
} from '../../governance/operationalDecision.js';
import type {
  GovernedContractSubstrate,
  GovernedStepId
} from '../contractSubstrate.js';

const BoundedId = z.string().trim().min(1).max(300);
const TargetContextSchema = z.object({
  targetId: BoundedId,
  repositoryId: BoundedId.nullable().optional(),
  componentId: BoundedId.nullable().optional()
}).strict();
const ObservedAtSchema = z.string().datetime({ offset: true });

export type GovernanceTarget = Readonly<{
  targetId: string;
  repositoryId?: string | null;
  componentId?: string | null;
}>;

export type GovernanceCompositionInput = Readonly<{
  target: GovernanceTarget;
  capabilityReality: CapabilityReality;
  governanceDecision: GovernanceDecision;
  observedAt: string;
}>;

export type GovernanceCompositionStatus = 'SUCCESS' | 'BLOCKED' | 'CONFLICT';

export type GovernanceContext = Readonly<{
  status: GovernanceCompositionStatus;
  observedAt: string;
  target: Readonly<{
    targetId: string;
    repositoryId: string | null;
    componentId: string | null;
  }>;
  operation: string;
  capabilityReality: CapabilityReality;
  governanceDecision: GovernanceDecision;
  mayExecute: boolean;
  reasonCodes: readonly string[];
  requiredEvidence: readonly string[];
  provenance: readonly ['capability_reality', 'governance_decision'];
  authorizationInferred: false;
  mutationPerformed: false;
}>;

export type EffectiveCapability = Readonly<{
  toolName: string;
  callability: CapabilityReality['callability'];
  authorized: CapabilityReality['authorized'];
  safeNow: boolean;
  governanceMayMutate: boolean;
  effective: boolean;
  reasonCodes: readonly string[];
}>;

export type EffectiveCapabilitySet = Readonly<{
  status: GovernanceCompositionStatus;
  observedAt: string;
  target: GovernanceContext['target'];
  capabilities: readonly EffectiveCapability[];
  mayExecute: boolean;
  reasonCodes: readonly string[];
  requiredEvidence: readonly string[];
  provenance: GovernanceContext['provenance'];
  authorizationInferred: false;
  mutationPerformed: false;
}>;

export type GovernanceContractResult<T> = Readonly<{
  contract: Readonly<{
    stepId: GovernedStepId;
    contractVersion: number;
  }>;
  status: GovernanceCompositionStatus;
  observedAt: string;
  provenance: readonly string[];
  reasonCodes: readonly string[];
  payload: T;
  authorizationInferred: false;
  mutationPerformed: false;
  replayModel: 'READ_ONLY';
}>;

function uniqueSorted(values: readonly string[]): string[] {
  return [...new Set(values)].sort();
}

function sameStringSet(left: readonly string[], right: readonly string[]): boolean {
  const a = uniqueSorted(left);
  const b = uniqueSorted(right);
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

function capabilityEquivalent(left: CapabilityReality, right: CapabilityReality): boolean {
  return left.toolName === right.toolName
    && left.registered === right.registered
    && left.callability.status === right.callability.status
    && left.callability.source === right.callability.source
    && left.authorized.status === right.authorized.status
    && left.safeNow === right.safeNow
    && left.observedAt === right.observedAt
    && sameStringSet(left.reasonCodes, right.reasonCodes)
    && sameStringSet(left.requiredEvidence, right.requiredEvidence)
    && sameStringSet(left.provenance, right.provenance);
}

function frozenTarget(input: GovernanceTarget): GovernanceContext['target'] {
  const parsed = TargetContextSchema.parse(input);
  return Object.freeze({
    targetId: parsed.targetId,
    repositoryId: parsed.repositoryId ?? null,
    componentId: parsed.componentId ?? null
  });
}

function conflict(
  input: GovernanceCompositionInput,
  reasonCode: 'OPERATION_BINDING_MISMATCH' | 'CAPABILITY_GOVERNANCE_MISMATCH'
): GovernanceContext {
  const observedAt = ObservedAtSchema.parse(input.observedAt);
  return Object.freeze({
    status: 'CONFLICT' as const,
    observedAt,
    target: frozenTarget(input.target),
    operation: input.governanceDecision.operation,
    capabilityReality: input.capabilityReality,
    governanceDecision: input.governanceDecision,
    mayExecute: false,
    reasonCodes: Object.freeze([reasonCode]),
    requiredEvidence: Object.freeze(uniqueSorted([
      ...input.capabilityReality.requiredEvidence,
      ...input.governanceDecision.requiredEvidence
    ])),
    provenance: Object.freeze(['capability_reality', 'governance_decision'] as const),
    authorizationInferred: false as const,
    mutationPerformed: false as const
  });
}

export function composeGovernanceInheritance(
  input: GovernanceCompositionInput
): GovernanceContext {
  const observedAt = ObservedAtSchema.parse(input.observedAt);
  const target = frozenTarget(input.target);

  if (input.capabilityReality.toolName !== input.governanceDecision.operation) {
    return conflict(input, 'OPERATION_BINDING_MISMATCH');
  }
  if (!capabilityEquivalent(
    input.capabilityReality,
    input.governanceDecision.capabilityReality
  )) {
    return conflict(input, 'CAPABILITY_GOVERNANCE_MISMATCH');
  }

  const mayExecute = Boolean(
    input.capabilityReality.safeNow
    && input.governanceDecision.mayMutate
  );
  const reasonCodes = uniqueSorted([
    ...input.capabilityReality.reasonCodes,
    ...input.governanceDecision.reasonCodes
  ]);
  const requiredEvidence = uniqueSorted([
    ...input.capabilityReality.requiredEvidence,
    ...input.governanceDecision.requiredEvidence
  ]);

  return Object.freeze({
    status: mayExecute ? 'SUCCESS' as const : 'BLOCKED' as const,
    observedAt,
    target,
    operation: input.governanceDecision.operation,
    capabilityReality: input.capabilityReality,
    governanceDecision: input.governanceDecision,
    mayExecute,
    reasonCodes: Object.freeze(reasonCodes),
    requiredEvidence: Object.freeze(requiredEvidence),
    provenance: Object.freeze(['capability_reality', 'governance_decision'] as const),
    authorizationInferred: false as const,
    mutationPerformed: false as const
  });
}

export function deriveEffectiveCapabilitySet(
  context: GovernanceContext
): EffectiveCapabilitySet {
  const capability = context.capabilityReality;
  const entry = Object.freeze({
    toolName: capability.toolName,
    callability: Object.freeze({ ...capability.callability }),
    authorized: Object.freeze({ ...capability.authorized }),
    safeNow: capability.safeNow,
    governanceMayMutate: context.governanceDecision.mayMutate,
    effective: context.mayExecute,
    reasonCodes: Object.freeze([...context.reasonCodes])
  });

  return Object.freeze({
    status: context.status,
    observedAt: context.observedAt,
    target: context.target,
    capabilities: Object.freeze([entry]),
    mayExecute: context.mayExecute,
    reasonCodes: Object.freeze([...context.reasonCodes]),
    requiredEvidence: Object.freeze([...context.requiredEvidence]),
    provenance: context.provenance,
    authorizationInferred: false as const,
    mutationPerformed: false as const
  });
}

function contractResult<T extends {
  status: GovernanceCompositionStatus;
  observedAt: string;
  provenance: readonly string[];
  reasonCodes: readonly string[];
}>(
  stepId: 'GW-10' | 'GW-11',
  payload: T,
  substrate: GovernedContractSubstrate
): GovernanceContractResult<T> {
  const contract = substrate.resolve(stepId);
  if (!contract) throw new Error(`GWC_GOVERNANCE_CONTRACT_MISSING:${stepId}`);

  return Object.freeze({
    contract: Object.freeze({
      stepId: contract.stepId,
      contractVersion: contract.contractVersion
    }),
    status: payload.status,
    observedAt: payload.observedAt,
    provenance: Object.freeze([...payload.provenance]),
    reasonCodes: Object.freeze([...payload.reasonCodes]),
    payload,
    authorizationInferred: false as const,
    mutationPerformed: false as const,
    replayModel: 'READ_ONLY' as const
  });
}

export function resolveGw10GovernanceInheritance(
  input: GovernanceCompositionInput,
  substrate: GovernedContractSubstrate
): GovernanceContractResult<GovernanceContext> {
  return contractResult('GW-10', composeGovernanceInheritance(input), substrate);
}

export function resolveGw11EffectiveCapabilities(
  input: GovernanceCompositionInput,
  substrate: GovernedContractSubstrate
): GovernanceContractResult<EffectiveCapabilitySet> {
  const inherited = composeGovernanceInheritance(input);
  return contractResult('GW-11', deriveEffectiveCapabilitySet(inherited), substrate);
}
