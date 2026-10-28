/**
 * GD-U-CONTINUITY — additive read-only resume/recovery advice from CURRENT
 * Governed Task Queue, Governed Session and checkpoint contracts.
 * This is a view over existing authorities, NEVER another state store, task
 * dispatcher or claim mechanism. It cannot revive an expired session, reuse
 * another principal's owner lease, approve writes, or mark tasks DONE.
 */
import {
  ownedResumableTask, executableTaskCandidates, taskClaimConflict,
  type ActiveLockProjection
} from '../operationalMemory/taskQueue.js';
import type {
  TaskStoreDocument, GovernedSessionRecord, GovernedCheckpoint
} from '../operationalMemory/types.js';

export type UniversalResumeInput = Readonly<{
  at: string;
  actorPrincipalId: string;
  expectedStoreRevision: number;
  store: Pick<TaskStoreDocument,'storeRevision'|'tasks'>;
  session: Pick<GovernedSessionRecord,
    'governedSessionId'|'status'|'ownerPrincipalId'|'lastHeartbeatAt'|'lastCheckpoint'> | null;
  activeLocks: readonly ActiveLockProjection[];
  live: Readonly<{
    observedAt: string;
    githubMain: string | null;
    serverCheckout: string | null;
    runtimeRevision: string | null;
    stateVersion: number;
  }>;
}>;

export type UniversalResumeAdvice = Readonly<{
  decision: 'HOLD' | 'CONTINUE_OWNED_CANDIDATE' | 'SPECIFIC_CLAIM_REQUIRED' | 'NO_ELIGIBLE_TASK';
  taskId: string | null;
  taskRevision: number | null;
  storeRevision: number;
  reasonCodes: readonly string[];
  nextSafeActions: readonly string[];
  checkpointId: string | null;
  runtimeWriteAuthorized: false;
  taskClaimed: false;
  operationExecuted: false;
}>;

const SHA = /^[a-f0-9]{40}$/;
const UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;
function fresh(observed: string, at: string): boolean {
  if (!UTC.test(at) || !UTC.test(observed)) return false;
  const d = Date.parse(at)-Date.parse(observed);
  return Number.isFinite(d) && d>=0 && d<=300_000;
}
function mainAligned(live: UniversalResumeInput['live']): boolean {
  return SHA.test(live.githubMain??'') && live.githubMain===live.serverCheckout
    && live.githubMain===live.runtimeRevision;
}
function compatibleCheckpoint(task: TaskStoreDocument['tasks'][number], checkpoint: GovernedCheckpoint | null,
    sessionId: string, live: UniversalResumeInput['live']): boolean {
  if (!checkpoint) return false;
  return checkpoint.governedSessionId===sessionId
    && checkpoint.observedHeadSha!==null
    && SHA.test(checkpoint.observedHeadSha)
    && checkpoint.observedHeadSha===task.observedHeadSha
    && checkpoint.workBranch===task.workBranch
    && checkpoint.acknowledgedStateVersion<=live.stateVersion
    && checkpoint.blockers.length===0;
}
export function deriveUniversalResumeAdvice(input: UniversalResumeInput): UniversalResumeAdvice {
  const reasons: string[] = [];
  const base = {
    storeRevision: input.store.storeRevision,
    runtimeWriteAuthorized: false as const,
    taskClaimed: false as const,
    operationExecuted: false as const
  };
  const hold = (taskId: string|null = null,taskRevision:number|null=null,
    checkpointId:string|null=null):UniversalResumeAdvice => ({
    ...base,decision:'HOLD',taskId,taskRevision,reasonCodes:[...new Set(reasons)],
    nextSafeActions:['REOBSERVE_CURRENT_LIVE_STATE','RECONCILE_EXISTING_SESSION_TASK_LOCKS'],
    checkpointId
  });
  if (input.expectedStoreRevision!==input.store.storeRevision) reasons.push('TASK_STORE_REVISION_CHANGED');
  if (!fresh(input.live.observedAt,input.at)||!mainAligned(input.live)) reasons.push('LIVE_STATE_STALE_OR_DRIFTED');
  if (!input.session || input.session.status!=='ACTIVE'
      || input.session.ownerPrincipalId===null
      || input.session.ownerPrincipalId!==input.actorPrincipalId
      || !fresh(input.session.lastHeartbeatAt,input.at)) reasons.push('SESSION_NOT_PROVEN_ACTIVE_OWNED');
  if (reasons.length>0 || !input.session) return hold();

  const session = input.session;
  const own = ownedResumableTask(input.store.tasks,session.governedSessionId);
  if (own) {
    const checkpoint = session.lastCheckpoint;
    if (!compatibleCheckpoint(own,checkpoint,session.governedSessionId,input.live)) {
      reasons.push('CHECKPOINT_INCOMPATIBLE_OR_BLOCKED');
    }
    if (taskClaimConflict(input.store.tasks,own,input.activeLocks,session.governedSessionId)) {
      reasons.push('RESOURCE_COLLISION');
    }
    if (reasons.length>0) return hold(own.taskId,own.taskRevision,checkpoint?.checkpointId??null);
    return {
      ...base,decision:'CONTINUE_OWNED_CANDIDATE',taskId:own.taskId,
      taskRevision:own.taskRevision,reasonCodes:[],checkpointId:checkpoint!.checkpointId,
      nextSafeActions:['REVERIFY_CHECKPOINT_AND_CLAIM_AT_RUNTIME','RESUME_OWN_TASK_ONLY']
    };
  }
  // Always target a specific, collision-free task. Never call claimNextTask
  // without expectedTaskId (could accidentally claim a higher-priority OAuth task).
  const eligible=executableTaskCandidates(input.store.tasks);
  const candidate=eligible.find(t=>!taskClaimConflict(
    input.store.tasks,t,input.activeLocks,session.governedSessionId))??null;
  if (!candidate) return {
    ...base,decision:'NO_ELIGIBLE_TASK',taskId:null,taskRevision:null,
    reasonCodes:['NO_COLLISION_FREE_READY_TASK'],checkpointId:null,
    nextSafeActions:['OBSERVE_EXISTING_PROGRAM_NEXT']
  };
  return {
    ...base,decision:'SPECIFIC_CLAIM_REQUIRED',taskId:candidate.taskId,
    taskRevision:candidate.taskRevision,reasonCodes:[],checkpointId:null,
    nextSafeActions:['VERIFY_TARGET_SCOPE_AND_MANDATE','CALL_EXISTING_TARGETED_CAS_CLAIM_IF_AUTHORIZED']
  };
}
