/**
 * C26 — bounded adapter for the EXISTING Governed Task Queue and existing code agent.
 *
 * This is NOT a second scheduler, task dispatcher, agent provider, or authority.
 * It cannot be called from the read-only GitHub observer with its artifact alone:
 * the caller must supply fresh Live State and an ACTUAL P2 mutation port bound to
 * the authenticated session. The caller must supply a separately authorized,
 * persistent code-agent execution port. No default port or credentials exist.
 *
 * No issue contents or untrusted event text are treated as execution instructions.
 */
const REPOSITORY='Patricked-code/MCP';
const REF='refs/heads/main';
const SHA=/^[a-f0-9]{40}$/;
const TASK=/^TASK-[0-9]{8}-[0-9]{3,}$/;
const MAX_FRESH_MS=60_000;

function blocked(reason){
  return Object.freeze({
    status:'BLOCKED', reason,
    executorRunId:null,
    runtimeTaskCreatedByAdapter:false,
    parallelQueueCreated:false,
    programDoneAttested:false
  });
}
function object(value){return value!==null&&typeof value==='object'&&!Array.isArray(value);}
function fresh(ts,now){
  if(typeof ts!=='string'||typeof now!=='string')return false;
  const t=Date.parse(ts),n=Date.parse(now);
  return Number.isFinite(t)&&Number.isFinite(n)&&n>=t&&n-t<=MAX_FRESH_MS;
}

/**
 * Planning eligibility is NEVER admission. This function does not claim tasks.
 * It only identifies the exact P2 operation the real authenticated MCP port
 * must revalidate atomically (including CAS, ownership and collision locks).
 */
export function assessC26Handoff(input){
  if(!object(input))return blocked('INPUT_UNAVAILABLE');
  const {at,trigger,liveState,inventory}=input;
  if(trigger?.repository!==REPOSITORY||trigger?.ref!==REF||!SHA.test(trigger?.sha??'')){
    return blocked('TRIGGER_NOT_EXACT_MAIN');
  }
  if(liveState?.freshness!=='CURRENT'||!fresh(liveState?.generatedAt,at))
    return blocked('LIVE_STATE_STALE_OR_UNAVAILABLE');
  const alignment=liveState?.alignment;
  if(alignment?.global!=='FULLY_ALIGNED'||alignment.githubVsS1!=='ALIGNED'
    ||alignment.runtime!=='ALIGNED'||alignment.documentation!=='ALIGNED'){
    return blocked('GLOBAL_RECONCILIATION_REQUIRED');
  }
  if(liveState?.github?.head!==trigger.sha
    ||liveState?.s1?.head!==trigger.sha
    ||liveState?.runtime?.revision!==trigger.sha){
    return blocked('EXACT_MAIN_S1_RUNTIME_SHA_MISMATCH');
  }
  if(inventory?.repository!==REPOSITORY)return blocked('INVENTORY_REPOSITORY_MISMATCH');
  const next=inventory?.nextWork;
  if(next?.schemaVersion!==1
    ||next.projectionKind!=='READ_ONLY_CONNECTED_AGENT_NEXT_WORK'
    ||next.authoritative!==false
    ||next.claimsAutomatically!==false
    ||next.createsRuntimeTask!==false){
    return blocked('EXISTING_NEXTWORK_PROJECTION_REQUIRED');
  }
  if(typeof next.governedSessionId!=='string'||next.governedSessionId.length<8){
    return blocked('GOVERNED_SESSION_UNBOUND');
  }
  // C26 initial scope: an existing executable task only. For an owned task
  // or READY blueprint, defer to the existing P2 materialization/resumption
  // workflow. Never convert those projections into a claim on our own.
  if(!['CLAIM_EXISTING','RESUME_OWNED'].includes(next.mode)
    ||next.tool!=='mcp_claim_next_governed_task'
    ||!TASK.test(next.taskId??'')){
    return blocked('EXISTING_P2_CLAIM_ADMISSION_REQUIRED');
  }
  if(!Array.isArray(next.resourceScopes)||!next.resourceScopes.length
    ||next.resourceScopes.some(s=>typeof s!=='string'||s.length<3||s.length>256)){
    return blocked('TASK_COLLISION_SCOPE_UNAVAILABLE');
  }
  return Object.freeze({
    status:'ELIGIBLE_FOR_EXISTING_P2_ADMISSION',
    repository:REPOSITORY, headSha:trigger.sha,
    taskId:next.taskId,governedSessionId:next.governedSessionId,
    selectionMode:next.mode,
    resourceScopes:Object.freeze([...next.resourceScopes]),
    observedAt:liveState.generatedAt,
    runtimeTaskCreatedByAdapter:false,
    parallelQueueCreated:false,
    programDoneAttested:false
  });
}

/**
 * Exact, injected port calls only:
 *   admitExistingP2: the REAL MCP mcp_claim_next_governed_task with live
 *     bootstrap, task-store revision, CAS and session/lock checks.
 *   executeExistingAgent: the already-authorized code-agent host with a
 *     durable, idempotent task/run binding. NO default implementation.
 * The authenticated P2 tool and the host remain the ONLY authorities.
 */
function recoveryRequired(reason,preflight,claim){
  // Once the existing P2 authority has issued a valid claim, an executor
  // failure must not erase its identity. The next invocation must reobserve
  // the existing queue and resume owned work, never claim a duplicate task.
  return Object.freeze({
    status:'RECOVERY_REQUIRED',reason,
    nextAction:'RESUME_OWNED_VIA_EXISTING_P2',
    taskId:preflight.taskId,
    governedSessionId:preflight.governedSessionId,
    claimedTaskRevision:claim.revision,
    headSha:preflight.headSha,
    executorRunId:null,
    runtimeTaskCreatedByAdapter:false,
    parallelQueueCreated:false,
    programDoneAttested:false
  });
}

export async function deliverC26ViaExistingAuthorities(input,ports={}){
  const preflight=assessC26Handoff(input);
  if(preflight.status!=='ELIGIBLE_FOR_EXISTING_P2_ADMISSION')return preflight;
  if(typeof ports.admitExistingP2!=='function')return blocked('P2_ADMISSION_PORT_UNAVAILABLE');
  // Never claim a task when there is no working agent execution port.
  if(typeof ports.executeExistingAgent!=='function')return blocked('CODE_AGENT_EXECUTOR_PORT_UNAVAILABLE');
  let claim;
  try{claim=await ports.admitExistingP2({
    repository:preflight.repository,headSha:preflight.headSha,
    taskId:preflight.taskId,governedSessionId:preflight.governedSessionId,
    resourceScopes:preflight.resourceScopes
  });}
  catch{return blocked('P2_ADMISSION_FAILED');}
  if(!object(claim)||claim.source!=='mcp_claim_next_governed_task'
    ||!(['CLAIMED',...(preflight.selectionMode==='RESUME_OWNED'?['IN_PROGRESS']:[])].includes(claim.status))
    ||claim.taskId!==preflight.taskId
    ||claim.repository!==preflight.repository
    ||claim.governedSessionId!==preflight.governedSessionId
    ||!Number.isSafeInteger(claim.revision)||claim.revision<=0){
    return blocked('P2_CLAIM_RECEIPT_MISMATCH');
  }
  let delivered;
  try{delivered=await ports.executeExistingAgent({
    repository:preflight.repository,headSha:preflight.headSha,
    taskId:preflight.taskId,governedSessionId:preflight.governedSessionId,
    claimedTaskRevision:claim.revision,resourceScopes:preflight.resourceScopes
  });}
  catch{return recoveryRequired('EXISTING_CODE_AGENT_EXECUTION_FAILED',preflight,claim);}
  if(delivered?.accepted!==true
    ||typeof delivered.executorRunId!=='string'
    ||!/^[a-zA-Z0-9][a-zA-Z0-9_.:-]{2,127}$/.test(delivered.executorRunId)){
    return recoveryRequired('EXISTING_CODE_AGENT_DID_NOT_ACCEPT',preflight,claim);
  }
  // 'DELEGATED' is not 'DONE': CI, review, merge, deploy, runtime and
  // checkpoint must be observed and admitted by their existing authorities.
  return Object.freeze({
    status:'DELEGATED',reason:null,
    executorRunId:delivered.executorRunId,
    taskId:preflight.taskId,
    governedSessionId:preflight.governedSessionId,
    headSha:preflight.headSha,
    runtimeTaskCreatedByAdapter:false,
    parallelQueueCreated:false,
    programDoneAttested:false
  });
}
