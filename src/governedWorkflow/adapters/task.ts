import { createHash } from 'node:crypto';

import type { LiveStateSnapshot } from '../../liveState/types.js';
import {
  normalizeLockScope,
  type LockScopeInput
} from '../../operationalMemory/lockService.js';
import type { GovernedTaskQueue } from '../../operationalMemory/taskQueue.js';
import type {
  GovernedLockRecord,
  GovernedTaskRecord
} from '../../operationalMemory/types.js';
import type {
  GovernedContractSubstrate,
  GovernedStepId
} from '../contractSubstrate.js';
import type { EvidenceRef } from '../executionEngine.js';

export type MinimalLockPlan = Readonly<{
  normalizedScopes: readonly string[];
  scopeCount: number;
  mutationPerformed: false;
}>;

export type TaskReconciliationResult =
  Awaited<ReturnType<GovernedTaskQueue['reconcileIntent']>>;

export type TaskContractBinding = Readonly<{
  stepId: GovernedStepId;
  contractVersion: number;
  contractRegistryDigest: string;
  graphRegistryDigest: string;
}>;

export type TaskContractObservation<TStatus extends string, TPayload> = Readonly<{
  contract: TaskContractBinding;
  status: TStatus;
  freshness: 'CURRENT' | 'STALE' | 'EXPIRED' | 'UNKNOWN';
  reasonCodes: readonly string[];
  evidenceRefs: readonly EvidenceRef[];
  payload: TPayload;
  authorizationInferred: false;
  mutationPerformed: false;
}>;

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

function binding(
  stepId: GovernedStepId,
  substrate: GovernedContractSubstrate
): TaskContractBinding {
  const contract = substrate.resolve(stepId);
  if (!contract) throw new Error(`GWC_TASK_CONTRACT_MISSING:${stepId}`);
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
  contract: TaskContractBinding;
  status: TStatus;
  freshness: TaskContractObservation<TStatus, TPayload>['freshness'];
  reasonCodes?: readonly string[];
  evidenceRefs?: readonly EvidenceRef[];
  payload: TPayload;
}): TaskContractObservation<TStatus, TPayload> {
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

function taskEvidence(task: GovernedTaskRecord): EvidenceRef {
  return {
    authority: 'Governed Task Queue',
    kind: 'OBSERVATION',
    reference: `governed-task:${task.taskId}:revision:${task.taskRevision}`,
    observedAt: task.updatedAt,
    freshness: 'CURRENT',
    digest: digest(task),
    binding: {
      repository: task.repository,
      taskId: task.taskId,
      ...(task.workBranch ? { branch: task.workBranch } : {}),
      ...(task.observedHeadSha ? { headSha: task.observedHeadSha } : {}),
      ...(task.ownerGovernedSessionId
        ? { sessionId: task.ownerGovernedSessionId }
        : {})
    }
  };
}

function lockEvidence(lock: GovernedLockRecord): EvidenceRef {
  const repository = lock.scope.startsWith('repository:')
    ? lock.scope.slice('repository:'.length)
    : null;
  const taskId = lock.scope.startsWith('task:')
    ? lock.scope.slice('task:'.length)
    : null;
  return {
    authority: 'Governed Lock Service',
    kind: 'OBSERVATION',
    reference: `governed-lock:${lock.lockId}:revision:${lock.lockRevision}`,
    observedAt: lock.renewedAt,
    freshness: lock.status === 'ACTIVE' ? 'CURRENT' : 'EXPIRED',
    digest: digest(lock),
    binding: {
      ...(repository ? { repository } : {}),
      ...(taskId ? { taskId } : {}),
      sessionId: lock.governedSessionId
    }
  };
}

export function planMinimalLockSet(scopes: readonly LockScopeInput[]): MinimalLockPlan {
  if (!Array.isArray(scopes) || scopes.length < 1 || scopes.length > 64) {
    throw new Error('LOCK_SCOPE_SET_INVALID');
  }
  const normalizedScopes = Object.freeze(
    [...new Set(scopes.map(normalizeLockScope))].sort()
  );
  if (normalizedScopes.length < 1 || normalizedScopes.length > 64) {
    throw new Error('LOCK_SCOPE_SET_INVALID');
  }
  return Object.freeze({
    normalizedScopes,
    scopeCount: normalizedScopes.length,
    mutationPerformed: false as const
  });
}

export function wrapGw13LiveStateReconciliation(
  snapshot: LiveStateSnapshot,
  substrate: GovernedContractSubstrate
): TaskContractObservation<LiveStateSnapshot['freshness'], LiveStateSnapshot> {
  return observation({
    contract: binding('GW-13', substrate),
    status: snapshot.freshness,
    freshness: snapshot.freshness === 'CURRENT'
      ? 'CURRENT'
      : snapshot.freshness === 'STALE'
        ? 'STALE'
        : 'UNKNOWN',
    reasonCodes: snapshot.contradictions,
    evidenceRefs: [{
      authority: 'Live State',
      kind: 'OBSERVATION',
      reference: `live-state:version:${snapshot.stateVersion}`,
      observedAt: snapshot.lastReconciledAt,
      freshness: snapshot.freshness === 'CURRENT'
        ? 'CURRENT'
        : snapshot.freshness === 'STALE'
          ? 'STALE'
          : 'UNKNOWN',
      digest: digest(snapshot),
      binding: {
        repository: snapshot.repository,
        branch: snapshot.github.branch,
        ...(snapshot.github.head ? { headSha: snapshot.github.head } : {})
      }
    }],
    payload: snapshot
  });
}

export function wrapGw14ExistingTaskLookup(
  task: GovernedTaskRecord | null,
  substrate: GovernedContractSubstrate
): TaskContractObservation<'FOUND' | 'NOT_FOUND', GovernedTaskRecord | null> {
  return observation({
    contract: binding('GW-14', substrate),
    status: task ? 'FOUND' : 'NOT_FOUND',
    freshness: task ? 'CURRENT' : 'UNKNOWN',
    reasonCodes: task ? [] : ['TASK_NOT_FOUND'],
    evidenceRefs: task ? [taskEvidence(task)] : [],
    payload: task
  });
}

export function wrapGw15TaskCreationIfRequired(
  result: TaskReconciliationResult,
  substrate: GovernedContractSubstrate
): TaskContractObservation<TaskReconciliationResult['classification'], TaskReconciliationResult> {
  return observation({
    contract: binding('GW-15', substrate),
    status: result.classification,
    freshness: 'CURRENT',
    reasonCodes: [result.reasonCode],
    evidenceRefs: result.task ? [taskEvidence(result.task)] : [],
    payload: result
  });
}

export function wrapGw18TaskClaim(
  task: GovernedTaskRecord | null,
  substrate: GovernedContractSubstrate
): TaskContractObservation<'CLAIMED' | 'NO_EXECUTABLE_TASK', GovernedTaskRecord | null> {
  return observation({
    contract: binding('GW-18', substrate),
    status: task ? 'CLAIMED' : 'NO_EXECUTABLE_TASK',
    freshness: task ? 'CURRENT' : 'UNKNOWN',
    reasonCodes: task ? [] : ['NO_EXECUTABLE_TASK'],
    evidenceRefs: task ? [taskEvidence(task)] : [],
    payload: task
  });
}

export function wrapGw19MinimalLockAcquisition(
  input: Readonly<{
    plan: MinimalLockPlan;
    grantedLocks: readonly GovernedLockRecord[];
  }>,
  substrate: GovernedContractSubstrate
): TaskContractObservation<'PLANNED_ONLY' | 'GRANTED' | 'MISMATCH', typeof input> {
  const grantedScopes = [...new Set(input.grantedLocks.map((lock) => lock.scope))].sort();
  const expectedScopes = [...input.plan.normalizedScopes];
  const same = canonical(grantedScopes) === canonical(expectedScopes);
  const status = input.grantedLocks.length === 0
    ? 'PLANNED_ONLY'
    : same
      ? 'GRANTED'
      : 'MISMATCH';
  return observation({
    contract: binding('GW-19', substrate),
    status,
    freshness: status === 'MISMATCH' ? 'UNKNOWN' : 'CURRENT',
    reasonCodes: status === 'MISMATCH' ? ['LOCK_PLAN_GRANT_MISMATCH'] : [],
    evidenceRefs: input.grantedLocks.map(lockEvidence),
    payload: input
  });
}

export function wrapGw20TaskInProgress(
  task: GovernedTaskRecord,
  substrate: GovernedContractSubstrate
): TaskContractObservation<'IN_PROGRESS' | 'NOT_IN_PROGRESS', GovernedTaskRecord> {
  return observation({
    contract: binding('GW-20', substrate),
    status: task.status === 'IN_PROGRESS' ? 'IN_PROGRESS' : 'NOT_IN_PROGRESS',
    freshness: 'CURRENT',
    reasonCodes: task.status === 'IN_PROGRESS' ? [] : ['TASK_NOT_IN_PROGRESS'],
    evidenceRefs: [taskEvidence(task)],
    payload: task
  });
}


export type AgentCoordinationTaskProjection = Readonly<{
  authority: 'Governed Task Queue';
  taskId: string;
  repository: string;
  status: GovernedTaskRecord['status'];
  currentPhase: GovernedTaskRecord['status'];
  ownerGovernedSessionId: string | null;
  resourceScopes: readonly string[];
  workBranch: string | null;
  pullRequestNumber: number | null;
  observedHeadSha: string | null;
  taskRevision: number;
  authorizationInferred: false;
  mutationPerformed: false;
  claimTransferAllowed: false;
}>;

export function projectGovernedTaskForCoordination(
  task: GovernedTaskRecord
): AgentCoordinationTaskProjection {
  return Object.freeze({
    authority: 'Governed Task Queue',
    taskId: task.taskId,
    repository: task.repository,
    status: task.status,
    currentPhase: task.status,
    ownerGovernedSessionId: task.ownerGovernedSessionId,
    resourceScopes: Object.freeze([...task.resourceScopes]),
    workBranch: task.workBranch,
    pullRequestNumber: task.pullRequestNumber,
    observedHeadSha: task.observedHeadSha,
    taskRevision: task.taskRevision,
    authorizationInferred: false,
    mutationPerformed: false,
    claimTransferAllowed: false
  });
}


export type AgentCoordinationTaskClaimProjection = Readonly<{
  authority: 'Governed Task Queue';
  taskId: string;
  taskStatus: GovernedTaskRecord['status'];
  ownershipState: 'OWNED' | 'UNOWNED';
  ownerGovernedSessionId: string | null;
  collisionDomains: readonly string[];
  claimId: null;
  releaseInferred: false;
  transferAllowed: false;
  takeoverAllowed: false;
  authorizationInferred: false;
  mutationPerformed: false;
}>;

export function projectGovernedTaskClaimForCoordination(
  task: GovernedTaskRecord
): AgentCoordinationTaskClaimProjection {
  return Object.freeze({
    authority: 'Governed Task Queue',
    taskId: task.taskId,
    taskStatus: task.status,
    ownershipState: task.ownerGovernedSessionId ? 'OWNED' : 'UNOWNED',
    ownerGovernedSessionId: task.ownerGovernedSessionId,
    collisionDomains: Object.freeze([...new Set(task.resourceScopes)].sort()),
    claimId: null,
    releaseInferred: false,
    transferAllowed: false,
    takeoverAllowed: false,
    authorizationInferred: false,
    mutationPerformed: false
  });
}
