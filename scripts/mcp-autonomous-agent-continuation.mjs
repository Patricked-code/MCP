/**
 * C26: idempotent, source-attested admission for an ALREADY connected code
 * agent. Compose the existing read-only nextWork projection and P2 adapter.
 * This module never owns a queue, agent session, lock, credential or runner.
 *
 * Ports must be supplied by the authenticated MCP client/agent host.
 * GitHub Actions read-only continuation artifacts are NOT those ports.
 */
import { createHash } from 'node:crypto';
import {
  assessC26Handoff,
  deliverC26ViaExistingAuthorities
} from './mcp-global-agent-handoff.mjs';

const RUN_ID=/^[a-zA-Z0-9][a-zA-Z0-9_.:-]{2,127}$/;
const TERMINAL=new Set(['DONE','CANCELLED','SUPERSEDED','FAILED']);
function stop(reason){
  return Object.freeze({
    status:'BLOCKED',reason,
    createdQueue:false,claimedTask:false,startedExecutor:false,
    certifiedC27:false
  });
}
function object(x){return x!==null&&typeof x==='object'&&!Array.isArray(x);}
function same(a,b){return a===b&&typeof a==='string'&&a.length>0;}
function stableKey(p){
  // Stable across retry and HEAD changes: a moved HEAD is still blocked by
  // assessC26Handoff until the real client reconciles it.
  const value=['C26-EXISTING-HOST-V1',p.repository,p.governedSessionId,p.taskId].join('\n');
  return 'c26-'+createHash('sha256').update(value).digest('hex');
}
function validOwnP2(state,p){
  if(!object(state)||state.source!=='GOVERNED_TASK_QUEUE'
    ||!same(state.taskId,p.taskId)
    ||!same(state.governedSessionId,p.governedSessionId)
    ||!Number.isSafeInteger(state.taskRevision)||state.taskRevision<1
    ||!same(state.repository,p.repository)
    ||!Array.isArray(state.resourceScopes)
    ||state.resourceScopes.length!==p.resourceScopes.length
    ||!state.resourceScopes.every(s=>p.resourceScopes.includes(s))
    ||state.foreignLockConflict!==false
    ||TERMINAL.has(state.status)){
    return false;
  }
  if(p.selectionMode==='RESUME_OWNED'){
    return ['CLAIMED','IN_PROGRESS','REVIEW','MERGE_READY','DEPLOYING','VERIFYING'].includes(state.status)
      &&state.ownerGovernedSessionId===p.governedSessionId;
  }
  return state.status==='READY'&&state.ownerGovernedSessionId===null;
}
/**
 * Inspect ONLY the session bound to the CALLER'S authenticated transport.
 * The caller must supply the existing MCP session service's own-session read
 * port, not a list lookup keyed by an agent-selected governedSessionId.
 * A GitHub Actions artifact, declared identity, or task projection cannot
 * substitute for this record. The existing P2 mutation remains authoritative.
 */
function validateOwnBoundSession(session,p,observedAt){
  if(!object(session)||session.source!=='GOVERNED_SESSIONS'
    ||session.governedSessionId!==p.governedSessionId
    ||session.repository!==p.repository
    ||session.status!=='ACTIVE'
    ||session.identityAssurance!=='oauth_subject'
    ||typeof session.ownerPrincipalId!=='string'
    ||!session.ownerPrincipalId.startsWith('oauth:')
    ||!Number.isSafeInteger(session.sessionRevision)
    ||session.sessionRevision<1
    ||!object(session.currentTransport)
    ||!/^[0-9a-f]{64}$/.test(session.currentTransport.fingerprint??'')){
    return false;
  }
  const context=session.connectionContext,receipt=session.bootstrapReceipt;
  if(!object(context)||context.governedSessionId!==p.governedSessionId
    ||context.repository!==p.repository
    ||context.principalId!==session.ownerPrincipalId
    ||context.identityAssurance!=='oauth_subject'
    ||context.evidenceSource!=='oauth_auth_info'
    ||!object(receipt)||receipt.status!=='ACKNOWLEDGED'
    ||receipt.governedSessionId!==p.governedSessionId
    ||receipt.repository!==p.repository
    ||receipt.githubHead!==p.headSha
    ||receipt.runtimeRevision!==p.headSha
    ||!Number.isSafeInteger(receipt.stateVersion)
    ||receipt.stateVersion<1
    ||!Number.isSafeInteger(session.lastAcknowledgedStateVersion)
    ||session.lastAcknowledgedStateVersion<receipt.stateVersion){
    return false;
  }
  const now=Date.parse(observedAt);
  const validFrom=Date.parse(receipt.createdAt??'');
  const validUntil=Date.parse(receipt.expiresAt??'');
  return Number.isFinite(now)&&Number.isFinite(validFrom)
    &&Number.isFinite(validUntil)
    &&validFrom<=now&&now<validUntil;
}

function verifiedRun(host,p,key){
  return object(host)
    &&host.source==='EXISTING_AGENT_HOST'
    &&host.idempotencyKey===key
    &&host.taskId===p.taskId
    &&host.governedSessionId===p.governedSessionId
    &&host.repository===p.repository
    &&host.headSha===p.headSha
    &&RUN_ID.test(host.executorRunId??'')
    &&['ACCEPTED','RUNNING','COMPLETED'].includes(host.status)
    &&host.durable===true;
}

/**
 * The host lookup and the host startOrResume MUST use the same atomic,
 * persistent idempotency key. If that guarantee is not available, C26 blocks.
 * A previous accepted run is only resumed when the actual P2 authority still
 * identifies THIS session as owner. No heartbeat-based ownership transfer.
 */
export async function continueC26WithExistingHost(input,ports={}){
  const p=assessC26Handoff(input);
  if(p.status!=='ELIGIBLE_FOR_EXISTING_P2_ADMISSION')return p;
  if(typeof ports.readOwnP2State!=='function')return stop('EXISTING_P2_READ_PORT_UNAVAILABLE');
  if(typeof ports.lookupExistingAgentRun!=='function')return stop('DURABLE_HOST_LOOKUP_UNAVAILABLE');
  if(typeof ports.startOrResumeExistingAgent!=='function'
    ||ports.atomicIdempotentHost!==true){
    return stop('ATOMIC_DURABLE_AGENT_HOST_UNAVAILABLE');
  }
  // Missing or foreign transport identity is a hard stop BEFORE P2 and host
  // observations. Never accept inventory.nextWork.governedSessionId as proof
  // that THIS code agent owns that governed session.
  if(typeof ports.readBoundAgentSession!=='function'){
    return stop('OWN_TRANSPORT_BOUND_SESSION_READER_UNAVAILABLE');
  }
  let ownSession;
  try{ownSession=await ports.readBoundAgentSession();}
  catch{return stop('OWN_TRANSPORT_SESSION_OBSERVATION_UNAVAILABLE');}
  if(!validateOwnBoundSession(ownSession,p,input.at)){
    return stop('OWN_TRANSPORT_SESSION_OR_BOOTSTRAP_CONFLICT');
  }
  const key=stableKey(p);
  let state,host;
  try{
    // Calls read the existing task and host; neither creates or claims work.
    state=await ports.readOwnP2State({taskId:p.taskId,governedSessionId:p.governedSessionId});
    host=await ports.lookupExistingAgentRun({idempotencyKey:key,taskId:p.taskId});
  }catch{return stop('P2_OR_HOST_OBSERVATION_UNAVAILABLE');}
  if(!validOwnP2(state,p))return stop('P2_TASK_OR_OWNERSHIP_CHANGED');
  if(host!==null&&host!==undefined){
    if(!verifiedRun(host,p,key))return stop('DURABLE_EXECUTOR_BINDING_CONFLICT');
    if(p.selectionMode!=='RESUME_OWNED'
      ||state.ownerGovernedSessionId!==p.governedSessionId){
      return stop('EXISTING_EXECUTOR_WITHOUT_OWNED_P2_TASK');
    }
    return Object.freeze({
      status:'RESUMED_EXISTING_AGENT_RUN',
      executorRunId:host.executorRunId,
      idempotencyKey:key,taskId:p.taskId,headSha:p.headSha,
      createdQueue:false,claimedTask:false,startedExecutor:false,
      certifiedC27:false
    });
  }
  // Do not claim a second P2 task if an owned task was already selected.
  // The REAL P2 tool must be invoked through the injected admission port.
  if(typeof ports.admitExistingP2!=='function')return stop('EXISTING_P2_MUTATION_PORT_UNAVAILABLE');
  const delegated=await deliverC26ViaExistingAuthorities(input,{
    admitExistingP2:ports.admitExistingP2,
    executeExistingAgent:async request=>{
      const result=await ports.startOrResumeExistingAgent({
        ...request,idempotencyKey:key,
        atomicIdempotencyRequired:true
      });
      if(!object(result)||result.idempotencyKey!==key
        ||result.source!=='EXISTING_AGENT_HOST'||result.durable!==true
        ||result.accepted!==true||!RUN_ID.test(result.executorRunId??'')){
        // The existing P2 claim remains owned; never silently claim a
        // replacement on a retry.
        return {accepted:false};
      }
      return {accepted:true,executorRunId:result.executorRunId};
    }
  });
  if(delegated.status==='DELEGATED'){
    return Object.freeze({...delegated,idempotencyKey:key,
      createdQueue:false,claimedTask:true,startedExecutor:true,
      certifiedC27:false});
  }
  return Object.freeze({...delegated,idempotencyKey:key,
    createdQueue:false,claimedTask:delegated.status==='RECOVERY_REQUIRED',
    startedExecutor:false,certifiedC27:false});
}
