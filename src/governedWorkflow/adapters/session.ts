import { createHash } from 'node:crypto';

import type { ConnectionContext } from '../../operationalMemory/connectionContext.js';
import type {
  AutoResumeCompatibleSessionResult
} from '../../operationalMemory/sessionService.js';
import type {
  BootstrapReceipt,
  GovernedSessionPublicRecord
} from '../../operationalMemory/types.js';
import type { GovernedOperationalContext } from '../../governedContext/types.js';
import type {
  GovernedContractSubstrate,
  GovernedStepId
} from '../contractSubstrate.js';
import type { EvidenceRef } from '../executionEngine.js';

export type SessionContractBinding = Readonly<{
  stepId: GovernedStepId;
  contractVersion: number;
  contractRegistryDigest: string;
  graphRegistryDigest: string;
}>;

export type SessionContractObservation<TStatus extends string, TPayload> = Readonly<{
  contract: SessionContractBinding;
  status: TStatus;
  freshness: 'CURRENT' | 'STALE' | 'EXPIRED' | 'UNKNOWN';
  reasonCodes: readonly string[];
  evidenceRefs: readonly EvidenceRef[];
  payload: TPayload;
  authorizationInferred: false;
  mutationPerformed: false;
}>;

export type SessionOpenOrResumeObservation =
  | AutoResumeCompatibleSessionResult
  | Readonly<{ status: 'OPENED'; session: GovernedSessionPublicRecord }>;

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

function contentDigest(value: unknown): string {
  return createHash('sha256').update(canonical(value)).digest('hex');
}

function binding(
  stepId: GovernedStepId,
  substrate: GovernedContractSubstrate
): SessionContractBinding {
  const contract = substrate.resolve(stepId);
  if (!contract) throw new Error(`GWC_SESSION_CONTRACT_MISSING:${stepId}`);
  return Object.freeze({
    stepId: contract.stepId,
    contractVersion: contract.contractVersion,
    contractRegistryDigest: substrate.contractRegistryDigest,
    graphRegistryDigest: substrate.graphRegistryDigest
  });
}

function freezeEvidence(refs: readonly EvidenceRef[]): readonly EvidenceRef[] {
  return Object.freeze(refs.map((ref) => Object.freeze({
    ...ref,
    binding: Object.freeze({ ...ref.binding })
  })));
}

function observation<TStatus extends string, TPayload>(input: {
  contract: SessionContractBinding;
  status: TStatus;
  freshness: SessionContractObservation<TStatus, TPayload>['freshness'];
  reasonCodes?: readonly string[];
  evidenceRefs?: readonly EvidenceRef[];
  payload: TPayload;
}): SessionContractObservation<TStatus, TPayload> {
  return Object.freeze({
    contract: input.contract,
    status: input.status,
    freshness: input.freshness,
    reasonCodes: Object.freeze([...(input.reasonCodes ?? [])]),
    evidenceRefs: freezeEvidence(input.evidenceRefs ?? []),
    payload: input.payload,
    authorizationInferred: false as const,
    mutationPerformed: false as const
  });
}

function bootstrapFreshness(
  status: GovernedOperationalContext['bootstrap']['status']
): 'CURRENT' | 'STALE' | 'EXPIRED' | 'UNKNOWN' {
  if (status === 'CURRENT') return 'CURRENT';
  if (status === 'STALE') return 'STALE';
  if (status === 'EXPIRED') return 'EXPIRED';
  return 'UNKNOWN';
}

function receiptEvidence(
  receipt: BootstrapReceipt,
  freshness: EvidenceRef['freshness']
): EvidenceRef {
  return {
    authority: 'Bootstrap Receipt',
    kind: 'OBSERVATION',
    reference: `bootstrap-receipt:${receipt.bootstrapReceiptId}`,
    observedAt: receipt.createdAt,
    freshness,
    digest: contentDigest(receipt),
    binding: {
      repository: receipt.repository,
      ...(receipt.governedBranch ? { branch: receipt.governedBranch } : {}),
      ...(receipt.githubHead ? { headSha: receipt.githubHead } : {}),
      sessionId: receipt.governedSessionId
    }
  };
}

function sessionEvidence(
  session: GovernedSessionPublicRecord,
  freshness: EvidenceRef['freshness'] = 'CURRENT'
): EvidenceRef {
  return {
    authority: 'Governed Session',
    kind: 'OBSERVATION',
    reference: `governed-session:${session.governedSessionId}:revision:${session.sessionRevision}`,
    observedAt: session.lastHeartbeatAt,
    freshness,
    digest: contentDigest(session),
    binding: {
      repository: session.repository,
      ...(session.workBranch ? { branch: session.workBranch } : {}),
      ...(session.bootstrapReceipt?.githubHead
        ? { headSha: session.bootstrapReceipt.githubHead }
        : {}),
      sessionId: session.governedSessionId
    }
  };
}

export function wrapGw02ConnectionBootstrap(
  bootstrap: GovernedOperationalContext['bootstrap'],
  substrate: GovernedContractSubstrate
): SessionContractObservation<
  GovernedOperationalContext['bootstrap']['status'],
  GovernedOperationalContext['bootstrap']
> {
  const freshness = bootstrapFreshness(bootstrap.status);
  const evidenceRefs = bootstrap.receipt
    ? [receiptEvidence(bootstrap.receipt, freshness)]
    : [];
  return observation({
    contract: binding('GW-02', substrate),
    status: bootstrap.status,
    freshness,
    reasonCodes: bootstrap.limitations,
    evidenceRefs,
    payload: bootstrap
  });
}

export function wrapGw03ConnectionContext(
  context: ConnectionContext | null,
  substrate: GovernedContractSubstrate
): SessionContractObservation<'PRESENT' | 'ABSENT', ConnectionContext | null> {
  if (!context) {
    return observation({
      contract: binding('GW-03', substrate),
      status: 'ABSENT',
      freshness: 'UNKNOWN',
      reasonCodes: ['CONNECTION_CONTEXT_ABSENT'],
      payload: null
    });
  }

  const evidence: EvidenceRef = {
    authority: 'Governed Session',
    kind: 'OBSERVATION',
    reference: `governed-session:${context.governedSessionId}:connection-context:${context.connectionContextId}`,
    observedAt: context.createdAt,
    freshness: 'CURRENT',
    digest: contentDigest(context),
    binding: {
      repository: context.repository,
      sessionId: context.governedSessionId
    }
  };
  return observation({
    contract: binding('GW-03', substrate),
    status: 'PRESENT',
    freshness: 'CURRENT',
    evidenceRefs: [evidence],
    payload: context
  });
}

export function wrapGw12BootstrapReceipt(
  bootstrap: GovernedOperationalContext['bootstrap'],
  substrate: GovernedContractSubstrate
): SessionContractObservation<
  GovernedOperationalContext['bootstrap']['status'],
  BootstrapReceipt | null
> {
  const freshness = bootstrapFreshness(bootstrap.status);
  return observation({
    contract: binding('GW-12', substrate),
    status: bootstrap.status,
    freshness,
    reasonCodes: bootstrap.limitations,
    evidenceRefs: bootstrap.receipt
      ? [receiptEvidence(bootstrap.receipt, freshness)]
      : [],
    payload: bootstrap.receipt
  });
}

export function wrapGw16SessionOpenOrResume(
  result: SessionOpenOrResumeObservation,
  substrate: GovernedContractSubstrate
): SessionContractObservation<
  SessionOpenOrResumeObservation['status'],
  SessionOpenOrResumeObservation
> {
  const session = 'session' in result ? result.session : null;
  return observation({
    contract: binding('GW-16', substrate),
    status: result.status,
    freshness: session ? 'CURRENT' : 'UNKNOWN',
    evidenceRefs: session ? [sessionEvidence(session)] : [],
    payload: result
  });
}

export function wrapGw17ContextAcknowledgement(
  session: GovernedSessionPublicRecord,
  expectedStateVersion: number,
  substrate: GovernedContractSubstrate
): SessionContractObservation<'ACKNOWLEDGED' | 'UNVERIFIED', GovernedSessionPublicRecord> {
  const receipt = session.bootstrapReceipt ?? null;
  const matches = session.lastAcknowledgedStateVersion === expectedStateVersion
    && receipt?.stateVersion === expectedStateVersion;

  return observation({
    contract: binding('GW-17', substrate),
    status: matches ? 'ACKNOWLEDGED' : 'UNVERIFIED',
    freshness: matches ? 'CURRENT' : 'UNKNOWN',
    reasonCodes: matches ? [] : ['ACKNOWLEDGEMENT_STATE_VERSION_MISMATCH'],
    evidenceRefs: [
      sessionEvidence(session, matches ? 'CURRENT' : 'UNKNOWN'),
      ...(receipt
        ? [receiptEvidence(receipt, matches ? 'CURRENT' : 'UNKNOWN')]
        : [])
    ],
    payload: session
  });
}
