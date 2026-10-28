/**
 * GD-U-02D — authoritative READ of current MCP task, session, lock and
 * Live State. This is not a new session store, lock store or consent store.
 *
 * No Plesk write is possible from this module. Existing E3/CI admission
 * has no durable Plesk-specific grant in these stores, so it is ALWAYS
 * reported as absent. An actual trusted E3 verifier must be integrated
 * and independently reviewed before any write tool is registered.
 */
import { normalizeLockScope } from '../operationalMemory/lockService.js';
import type { SessionRequest } from '../operationalMemory/sessionService.js';
import type {
  GovernedPleskAuthoritySnapshot, GovernedPleskSubdomainRequest
} from './governedPleskSubdomainExecutor.js';

type TaskView = Readonly<{
  taskId:string;
  status:string;
  ownerGovernedSessionId:string|null;
  resourceScopes:readonly string[];
  observedHeadSha?:string|null;
}>;
type SessionView = Readonly<{
  governedSessionId:string;
  status:string;
  ownerPrincipalId:string|null;
  lastHeartbeatAt:string;
}>;
type LockView = Readonly<{
  status:string;
  scope:string;
  governedSessionId:string;
  expiresAt:string;
}>;
type LiveView = Readonly<{
  freshness:string;
  alignment:Readonly<{global:string}>;
  github:Readonly<{status:string;head:string|null}>;
  s1:Readonly<{status:string;head:string|null}>;
  runtime:Readonly<{status:string;revision:string|null}>;
}>;
export type ExistingPleskAuthorityPorts=Readonly<{
  now:()=>Date;
  getTask:(id:string)=>Promise<TaskView|null>;
  getSession:(id:string,request:SessionRequest)=>Promise<SessionView|null>;
  listLocks:()=>Promise<readonly LockView[]>;
  getLive:()=>Promise<LiveView|null>;
}>;
export type ExistingPleskAuthorityInspection=Readonly<{
  snapshot:GovernedPleskAuthoritySnapshot;
  blockers:readonly string[];
  operationExecuted:false;
}>;
const SHA=/^[a-f0-9]{40}$/;
const validMs=(timestamp:string):number=>typeof timestamp==='string'?Date.parse(timestamp):NaN;
const within=(timestamp:string,nowMs:number,limitMs:number):boolean=>{
  const t=validMs(timestamp);
  return Number.isFinite(t) && nowMs>=t && nowMs-t<=limitMs;
};
/**
 * Read current authoritative sources without accepting client-supplied task
 * snapshots, locks, consent, review results or owner identities.
 */
export async function inspectExistingPleskAuthority(
  request:GovernedPleskSubdomainRequest,
  transport:SessionRequest,
  ports:ExistingPleskAuthorityPorts
):Promise<ExistingPleskAuthorityInspection> {
  const at=ports.now().toISOString();
  const nowMs=Date.parse(at);
  const key='plesk:'+request.target.serverId+':'+request.target.parentDomain;
  const normalized=normalizeLockScope({type:'resource',key});
  const blockers:string[]=[];
  const identity=transport.identity;
  if(!identity || identity.assurance!=='oauth_subject'
    || identity.principalId!==request.expectedPrincipalId
    || !request.expectedPrincipalId)blockers.push('PRINCIPAL_NOT_AUTHENTICATED');
  if(!SHA.test(request.expectedHeadSha) || !within(request.now,nowMs,30_000)){
    blockers.push('REQUEST_TIMESTAMP_OR_HEAD_INVALID');
  }

  let task:TaskView|null=null;
  let session:SessionView|null=null;
  let locks:readonly LockView[]=[];
  let live:LiveView|null=null;
  try {
    [task,session,locks,live]=await Promise.all([
      ports.getTask(request.expectedTaskId),
      ports.getSession(request.expectedSessionId,transport),
      ports.listLocks(),
      ports.getLive()
    ]);
  }catch {
    blockers.push('RUNTIME_SOURCE_UNAVAILABLE');
  }

  if(!task || task.taskId!==request.expectedTaskId
    || task.status!=='IN_PROGRESS'
    || task.ownerGovernedSessionId!==request.expectedSessionId
    || !task.resourceScopes.includes(key)
    || task.observedHeadSha!==request.expectedHeadSha){
    blockers.push('TASK_OWNER_NOT_ATTESTED');
  }
  if(!session || session.governedSessionId!==request.expectedSessionId
    || session.status!=='ACTIVE'
    || session.ownerPrincipalId!==request.expectedPrincipalId
    || !within(session.lastHeartbeatAt,nowMs,300_000)){
    blockers.push('SESSION_OWNER_NOT_ATTESTED');
  }
  const targetLock=locks.find(l=>l.scope===normalized && l.status==='ACTIVE'
    && l.governedSessionId===request.expectedSessionId
    && Number.isFinite(validMs(l.expiresAt))
    && validMs(l.expiresAt)>nowMs && validMs(l.expiresAt)-nowMs<=300_000);
  if(!targetLock)blockers.push('TARGET_LOCK_NOT_OWNED');
  // The service already normalizes current-state freshness; never accept
  // matching SHAs from a stale/UNVERIFIED observation.
  const liveCurrent=live?.freshness==='CURRENT'
    && live.alignment.global==='FULLY_ALIGNED'
    && live.github.status==='CURRENT'
    && live.s1.status==='CURRENT'
    && live.runtime.status==='CURRENT'
    && live.github.head===request.expectedHeadSha
    && live.s1.head===request.expectedHeadSha
    && live.runtime.revision===request.expectedHeadSha;
  if(!liveCurrent)blockers.push('LIVE_SHA_NOT_ATTESTED');

  // No Plesk-specific E3+CI grant in current Task/Session/Lock data schema:
  // fail closed. A historical checkpoint is NOT consent or independent review.
  blockers.push('E3_AND_CI_ATTESTATION_UNAVAILABLE');
  const sourcesVerified=blockers.every(x=>x==='E3_AND_CI_ATTESTATION_UNAVAILABLE');
  const snapshot:GovernedPleskAuthoritySnapshot={
    source:sourcesVerified?'EXISTING_GOVERNED_RUNTIME':'UNVERIFIED',
    observedAt:at,
    taskId:task?.taskId??request.expectedTaskId,
    taskStatus:task?.status==='IN_PROGRESS'?'IN_PROGRESS':'BLOCKED',
    taskOwnerSessionId:task?.ownerGovernedSessionId??null,
    taskResourceScopes:task?.resourceScopes??[],
    sessionId:session?.governedSessionId??request.expectedSessionId,
    sessionStatus:session?.status==='ACTIVE'?'ACTIVE':'PAUSED',
    sessionOwnerPrincipalId:session?.ownerPrincipalId??null,
    sessionLastHeartbeatAt:session?.lastHeartbeatAt??'',
    lockOwnerSessionId:targetLock?.governedSessionId??null,
    lockScope:normalized,
    lockExpiresAt:targetLock?.expiresAt??'',
    consent:null,
    githubMainSha:liveCurrent?live?.github.head??null:null,
    serverCheckoutSha:liveCurrent?live?.s1.head??null:null,
    runtimeRevisionSha:liveCurrent?live?.runtime.revision??null:null,
    reviewAndCiApproved:false
  };
  return {snapshot,blockers,operationExecuted:false};
}

/**
 * Actual runtime read connection: uses the SAME dependencies currently backing
 * the MCP tools. The MCP server must construct the authenticated transport
 * SessionRequest, never accept it from a public tool input.
 */
export async function readExistingPleskAuthorityFromRuntime(
  request:GovernedPleskSubdomainRequest,
  transport:SessionRequest
):Promise<ExistingPleskAuthorityInspection> {
  const [tasks,operational,engine]=await Promise.all([
    import('../tools/governedTasks.js'),
    import('../tools/governedSessions.js'),
    import('../liveState/engine.js')
  ]);
  const taskDeps=tasks.getGovernedTaskToolDependencies();
  const sessionDeps=operational.getGovernedSessionToolDependencies();
  // Pure observation: do not initialize/seed the Task Queue on an admission
  // read. Missing records must block; reads must never mutate existing stores.
  return inspectExistingPleskAuthority(request,transport,{
    now:()=>new Date(),
    getTask:id=>taskDeps.queue.getVisibleTask(id),
    getSession:(id,auth)=>sessionDeps.sessions.getVisibleSession(id,auth),
    listLocks:()=>sessionDeps.locks.listActiveLocks(),
    getLive:()=>engine.liveStateEngine.getCurrent()
  });
}
