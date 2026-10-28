/**
 * GD-U-02D-B2 — resolve a unique Plesk Task + Governed Session by a verified
 * OAuth principal and normalized resource lock from existing MCP stores.
 *
 * No task/session ID is read from a browser form. This is a READ ONLY
 * candidate projection, never a write admission (E3+OAuth is insufficient
 * without a bound real transport and independent CI/review evidence).
 */
import { randomUUID } from 'node:crypto';
import type { SignedWebOauthConsentObservation } from './pleskWebOauthBridge.js';

type Task=Readonly<{
  taskId:string;
  status:string;
  ownerGovernedSessionId:string|null;
  resourceScopes:readonly string[];
  observedHeadSha?:string|null;
}>;
type Session=Readonly<{
  governedSessionId:string;
  status:string;
  ownerPrincipalId:string|null;
  lastHeartbeatAt:string;
}>;
type Lock=Readonly<{
  scope:string;
  governedSessionId:string;
  status:string;
  expiresAt:string;
}>;
type Live=Readonly<{
  freshness:string;
  alignment:Readonly<{global:string}>;
  github:Readonly<{status:string;head:string|null}>;
  s1:Readonly<{status:string;head:string|null}>;
  runtime:Readonly<{status:string;revision:string|null}>;
}>;
export type PleskOwnedWebSessionPorts=Readonly<{
  now:()=>Date;
  getTasks:()=>Promise<readonly Task[]>;
  getVisibleSessions:(principalId:string)=>Promise<readonly Session[]>;
  getLocks:()=>Promise<readonly Lock[]>;
  getLive:()=>Promise<Live|null>;
}>;
export type PleskOwnedWebSessionProjection=Readonly<{
  status:'UNIQUE_OWNED_CANDIDATE'|'BLOCKED';
  reason:'CANDIDATE_OBSERVED'|'E3_OR_OAUTH_NOT_ATTESTED'|'SOURCE_UNAVAILABLE'
    |'LIVE_SHA_NOT_ATTESTED'|'TASK_SELECTION_AMBIGUOUS'
    |'OWNED_RESOURCE_NOT_ATTESTED';
  principalId:string|null;
  taskId:string|null;
  sessionId:string|null;
  expectedHeadSha:string|null;
  governedWebTransportLinked:false;
  independentCiReviewVerified:false;
  runtimeWriteAuthorized:false;
  operationExecuted:false;
}>;
const SHA=/^[0-9a-f]{40}$/;
const NORMALIZED=/^resource:plesk:(s1|s2):[a-z0-9.-]{4,253}$/;
const blocked=(reason:PleskOwnedWebSessionProjection['reason']):PleskOwnedWebSessionProjection=>({
  status:'BLOCKED',reason,principalId:null,taskId:null,sessionId:null,
  expectedHeadSha:null,governedWebTransportLinked:false,
  independentCiReviewVerified:false,runtimeWriteAuthorized:false,
  operationExecuted:false
});
const time=(s:string):number=>typeof s==='string'?Date.parse(s):NaN;
const recent=(s:string,now:number,maxAge:number):boolean=>{
  const parsed=time(s);
  return Number.isFinite(parsed)&&parsed<=now&&now-parsed<=maxAge;
};

export async function resolveOwnedPleskWebSession(
  consent:SignedWebOauthConsentObservation,
  ports:PleskOwnedWebSessionPorts
):Promise<PleskOwnedWebSessionProjection>{
  if(consent?.status!=='E3_AND_OAUTH_OBSERVED'||!consent.principalId
    ||consent.consentPurpose!=='plesk-create-subdomain'
    ||!consent.targetScope||!NORMALIZED.test(consent.targetScope)){
    return blocked('E3_OR_OAUTH_NOT_ATTESTED');
  }
  const principal=consent.principalId;
  const nowMs=ports.now().getTime();
  let tasks:readonly Task[];
  let sessions:readonly Session[];
  let locks:readonly Lock[];
  let live:Live|null;
  try{
    [tasks,sessions,locks,live]=await Promise.all([
      ports.getTasks(),ports.getVisibleSessions(principal),
      ports.getLocks(),ports.getLive()
    ]);
  }catch{return blocked('SOURCE_UNAVAILABLE');}
  if(!live||live.freshness!=='CURRENT'
    ||live.alignment.global!=='FULLY_ALIGNED'
    ||live.github.status!=='CURRENT'
    ||live.s1.status!=='CURRENT'
    ||live.runtime.status!=='CURRENT'
    ||!live.github.head||!SHA.test(live.github.head)
    ||live.s1.head!==live.github.head
    ||live.runtime.revision!==live.github.head)return blocked('LIVE_SHA_NOT_ATTESTED');
  const expectedHeadSha=live.github.head;
  const scope=consent.targetScope.slice('resource:'.length);
  const owned=new Set(sessions.filter(s=>
    s.status==='ACTIVE'&&s.ownerPrincipalId===principal
    &&recent(s.lastHeartbeatAt,nowMs,300_000)
  ).map(s=>s.governedSessionId));
  const validLocks=new Set(locks.filter(lock=>
    lock.status==='ACTIVE' && lock.scope===consent.targetScope
    &&owned.has(lock.governedSessionId)
    &&Number.isFinite(time(lock.expiresAt))
    &&time(lock.expiresAt)>nowMs
    &&time(lock.expiresAt)-nowMs<=300_000
  ).map(lock=>lock.governedSessionId));
  const candidates=tasks.filter(t=>
    t.status==='IN_PROGRESS'
    &&t.ownerGovernedSessionId!==null
    &&owned.has(t.ownerGovernedSessionId)
    &&validLocks.has(t.ownerGovernedSessionId)
    &&t.resourceScopes.includes(scope)
    &&t.observedHeadSha===expectedHeadSha
  );
  if(candidates.length>1)return blocked('TASK_SELECTION_AMBIGUOUS');
  if(candidates.length===0)return blocked('OWNED_RESOURCE_NOT_ATTESTED');
  const winner=candidates[0]!;
  return {
    status:'UNIQUE_OWNED_CANDIDATE',reason:'CANDIDATE_OBSERVED',
    principalId:principal,taskId:winner.taskId,
    sessionId:winner.ownerGovernedSessionId,
    expectedHeadSha,
    governedWebTransportLinked:false,
    independentCiReviewVerified:false,
    runtimeWriteAuthorized:false,
    operationExecuted:false
  };
}

/**
 * Uses the current, persisted TaskQueue/SessionService/LockService/LiveState
 * instances and NO new governance store. The unique transport id is only a
 * read request key; the service's oauth_subject ownership rule still applies.
 * The browser never supplies taskId or governedSessionId.
 */
export async function resolveOwnedPleskWebSessionFromRuntime(
  consent:SignedWebOauthConsentObservation
):Promise<PleskOwnedWebSessionProjection>{
  if(consent.status!=='E3_AND_OAUTH_OBSERVED'||!consent.principalId)
    return blocked('E3_OR_OAUTH_NOT_ATTESTED');
  try{
    const [t,s,e]=await Promise.all([
      import('../tools/governedTasks.js'),
      import('../tools/governedSessions.js'),
      import('../liveState/engine.js')
    ]);
    const queue=t.getGovernedTaskToolDependencies().queue;
    const service=s.getGovernedSessionToolDependencies();
    return resolveOwnedPleskWebSession(consent,{
      now:()=>new Date(),
      getTasks:async()=>(await queue.listVisibleTasks()).tasks,
      getVisibleSessions:principalId=>service.sessions.listVisibleSessions({
        transportSessionId:'plesk-web-e3-observe:'+randomUUID(),
        identity:{principalId,clientId:null,assurance:'oauth_subject'}
      }),
      getLocks:()=>service.locks.listActiveLocks(),
      getLive:()=>e.liveStateEngine.getCurrent()
    });
  }catch{return blocked('SOURCE_UNAVAILABLE');}
}
