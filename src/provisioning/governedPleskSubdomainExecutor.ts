/**
 * GD-U-02C — REAL bounded Plesk subdomain creation adapter.
 *
 * Reuses the existing executePleskSubdomain / pleskSshAdapter; NEVER defines
 * a parallel Plesk provisioning engine, Session, Task Queue or lock authority.
 * The caller must wire readExistingAuthority to the existing trusted MCP
 * session/task/lock/CI/E3 store (not a client-supplied boolean). This module
 * has no public MCP write tool registration until that binding is admitted.
 */
import { createPleskSubdomainOnServer, type PleskPolicy, type PleskRemotePort } from './pleskSshAdapter.js';
import { planPleskSubdomain, type PleskSubdomainInput } from './pleskSite.js';
import type { PleskCreationOutcome } from './pleskExecute.js';
import { normalizeLockScope } from '../operationalMemory/lockService.js';

type SessionStatus='ACTIVE'|'PAUSED'|'CLOSED'|'EXPIRED';
type TaskStatus='CLAIMED'|'IN_PROGRESS'|'READY'|'BLOCKED'|'DONE';

export type GovernedPleskAuthoritySnapshot=Readonly<{
  source:'EXISTING_GOVERNED_RUNTIME'|'UNVERIFIED';
  observedAt:string;
  taskId:string;
  taskStatus:TaskStatus;
  taskOwnerSessionId:string|null;
  taskResourceScopes:readonly string[];
  sessionId:string;
  sessionStatus:SessionStatus;
  sessionOwnerPrincipalId:string|null;
  sessionLastHeartbeatAt:string;
  lockOwnerSessionId:string|null;
  lockScope:string;
  lockExpiresAt:string;
  /** Observed only from the existing authenticated governed session and Live State. */
  bootstrapReceiptId?:string|null;
  bootstrapReceiptExpiresAt?:string|null;
  bootstrapReceiptStateVersion?:number|null;
  liveStateVersion?:number|null;
  sessionRevision?:number|null;
  consent:'CREATE_SUBDOMAIN'|null;
  githubMainSha:string|null;
  serverCheckoutSha:string|null;
  runtimeRevisionSha:string|null;
  reviewAndCiApproved:boolean;
}>;

export type GovernedPleskSubdomainRequest=Readonly<{
  target:PleskSubdomainInput;
  policy:PleskPolicy;
  expectedTaskId:string;
  expectedSessionId:string;
  expectedPrincipalId:string;
  expectedHeadSha:string;
  now:string;
}>;
export type GovernedPleskSubdomainDependencies=Readonly<{
  /** MUST re-read existing MCP runtime authorities, never a client payload. */
  readExistingAuthority:()=>Promise<GovernedPleskAuthoritySnapshot>;
  remote:PleskRemotePort;
  /** Server-owned monotonic-enough wall-clock observation; never from req.now. */
  now?:()=>number;
}>;
export type GovernedPleskSubdomainOutcome=PleskCreationOutcome&Readonly<{
  operation:'PLESK_SUBDOMAIN_CREATE';
  executionPath:'EXISTING_PLESK_SSH_ADAPTER';
}>;
const SHA=/^[a-f0-9]{40}$/;
const UTC=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;
function ageMs(time:string,now:string):number|null{
  if(!UTC.test(time)||!UTC.test(now))return null;
  const diff=Date.parse(now)-Date.parse(time);
  return Number.isFinite(diff)?diff:null;
}
/** The optional clock is injected by trusted server wiring or deterministic tests. */
function trustedInstant(deps:GovernedPleskSubdomainDependencies):string|null{
  try{
    const millis=(deps.now??Date.now)();
    if(!Number.isSafeInteger(millis)||millis<0||millis>8_640_000_000_000_000)return null;
    const time=new Date(millis);
    return Number.isFinite(time.getTime())?time.toISOString():null;
  }catch{return null;}
}
function admitted(req:GovernedPleskSubdomainRequest,a:GovernedPleskAuthoritySnapshot,serverNow:string):boolean{
  const expectedScope='plesk:'+req.target.serverId+':'+req.target.parentDomain;
  const expectedLockScope=normalizeLockScope({type:'resource',key:expectedScope});
  const age=ageMs(a.observedAt,serverNow);
  const heartbeat=ageMs(a.sessionLastHeartbeatAt,serverNow);
  const expiry=ageMs(a.lockExpiresAt,serverNow);
  const bootstrapExpiry=ageMs(a.bootstrapReceiptExpiresAt??'',serverNow);
  return a.source==='EXISTING_GOVERNED_RUNTIME'
    && a.taskId===req.expectedTaskId
    && a.taskStatus==='IN_PROGRESS'
    && a.taskOwnerSessionId===req.expectedSessionId
    && a.taskResourceScopes.includes(expectedScope)
    && a.sessionId===req.expectedSessionId
    && a.sessionStatus==='ACTIVE'
    && a.sessionOwnerPrincipalId===req.expectedPrincipalId
    && a.lockScope===expectedLockScope
    && a.lockOwnerSessionId===req.expectedSessionId
    && a.consent==='CREATE_SUBDOMAIN'
    && a.reviewAndCiApproved===true
    && SHA.test(req.expectedHeadSha)
    && a.githubMainSha===req.expectedHeadSha
    && a.serverCheckoutSha===req.expectedHeadSha
    && a.runtimeRevisionSha===req.expectedHeadSha
    && age!==null && age>=0 && age<=30_000
    && heartbeat!==null && heartbeat>=0 && heartbeat<=300_000
    && expiry!==null && expiry<0 && expiry>=-300_000
    // Never rely only on an earlier read of the bootstrap: its original
    // identity, runtime version and expiry must be present at the last gate.
    && typeof a.bootstrapReceiptId==='string'
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(a.bootstrapReceiptId)
    && Number.isSafeInteger(a.sessionRevision) && (a.sessionRevision??0)>0
    && Number.isSafeInteger(a.bootstrapReceiptStateVersion)
    && a.bootstrapReceiptStateVersion===a.liveStateVersion
    && bootstrapExpiry!==null && bootstrapExpiry<0;
}
const blocked=(reason:string):GovernedPleskSubdomainOutcome=>({
  status:'BLOCKED',reason,
  operation:'PLESK_SUBDOMAIN_CREATE',
  executionPath:'EXISTING_PLESK_SSH_ADAPTER'
});

/**
 * This IS an executable operation against the injected real SSH port once
 * the independent existing MCP authority verifier admits the exact action.
 * It does not activate itself, mint an admin token or register a new tool.
 */
export async function executeGovernedPleskSubdomain(
  req:GovernedPleskSubdomainRequest,
  deps:GovernedPleskSubdomainDependencies
):Promise<GovernedPleskSubdomainOutcome>{
  if(!req || !deps || typeof deps.readExistingAuthority!=='function'
    || !deps.remote || !SHA.test(req.expectedHeadSha||''))return blocked('REQUEST_INVALID');
  // Use existing planner for immutable target validation before touching SSH.
  const synthetic = {
    parentExists:true,targetExists:false,documentRootExists:false,
    subscriptionAuthorized:true,documentRootSafe:true,targetOwnedByProvisioner:false
  } as const;
  const plan=planPleskSubdomain({...req.target,evidence:synthetic});
  if(plan.decision!=='READY'||!req.policy.enabled
    ||req.policy.allowedParents[req.target.serverId]?.includes(req.target.parentDomain)!==true){
    return blocked('TARGET_OR_POLICY_NOT_ALLOWED');
  }
  let authority:GovernedPleskAuthoritySnapshot;
  try{authority=await deps.readExistingAuthority();}
  catch{return blocked('GOVERNED_AUTHORITY_UNAVAILABLE');}
  // A request's timestamp is NOT authority. Sample the server clock only
  // after the asynchronous authoritative read, avoiding future-dated snapshots.
  const observedNow=trustedInstant(deps);
  if(!authority||!observedNow||!admitted(req,authority,observedNow))
    return blocked('GOVERNED_ADMISSION_NOT_ATTESTED');

  // The existing adapter performs an asynchronous SSH preflight. Re-read the
  // same Task/Session/Lock/CI authority and trusted clock at the last bounded
  // guarded-write boundary, not only before the preflight. No new authority.
  let deniedBeforeWrite=false;
  const guardedRemote:PleskRemotePort={
    ...deps.remote,
    guarded:async(serverId,command)=>{
      let latest:GovernedPleskAuthoritySnapshot;
      try{latest=await deps.readExistingAuthority();}
      catch{
        deniedBeforeWrite=true;
        return {code:1,stdout:'',stderr:''};
      }
      const executionNow=trustedInstant(deps);
      if(!latest||!executionNow||!admitted(req,latest,executionNow)
        ||latest.bootstrapReceiptId!==authority.bootstrapReceiptId
        ||(latest.sessionRevision??0)<(authority.sessionRevision??0)){
        deniedBeforeWrite=true;
        return {code:1,stdout:'',stderr:''};
      }
      // No awaited operation between last clock/authority check and call.
      return deps.remote.guarded(serverId,command);
    }
  };
  const result=await createPleskSubdomainOnServer(req.target,req.policy,true,guardedRemote);
  if(deniedBeforeWrite)return blocked('GOVERNED_AUTHORITY_EXPIRED_BEFORE_WRITE');
  return {...result,operation:'PLESK_SUBDOMAIN_CREATE',executionPath:'EXISTING_PLESK_SSH_ADAPTER'};
}

/**
 * The ONLY production SSH transport offered here is bound to one exact
 * Plesk target: no remote command supplied by the external caller can mutate
 * anything else. The implementation reuses ssh/client and its safety checks.
 */
function buildExistingPleskSshExecutionPort(target:PleskSubdomainInput):PleskRemotePort{
  const synthetic={
    parentExists:true,targetExists:false,documentRootExists:false,
    subscriptionAuthorized:true,documentRootSafe:true,targetOwnedByProvisioner:false
  } as const;
  const plan=planPleskSubdomain({...target,evidence:synthetic});
  if(plan.decision!=='READY'||target.documentRoot!=='/'+target.label){
    throw new Error('PLESK_GOVERNED_TARGET_INVALID');
  }
  const expected="plesk bin subdomain --create '"+target.label
    +"' -domain '"+target.parentDomain
    +"' -www-root '"+target.documentRoot+"'";
  return {
    readonly:async (server,command)=>{
      if(server!==target.serverId)throw new Error('PLESK_GOVERNED_SERVER_MISMATCH');
      const {runReadOnlyCommand}=await import('../ssh/client.js');
      const r=await runReadOnlyCommand(server,command,5_000,4_096);
      return {code:r.code,stdout:r.stdout,stderr:r.stderr};
    },
    guarded:async (server,command)=>{
      if(server!==target.serverId||command!==expected)
        throw new Error('PLESK_GOVERNED_COMMAND_NOT_ALLOWLISTED');
      const {runGuardedCommand}=await import('../ssh/client.js');
      const r=await runGuardedCommand(server,command,{
        intent:'GD-U-02C_EXACT_TARGET_PLESK_SUBDOMAIN_CREATE',
        timeoutMs:30_000,maxOutputBytes:4_096
      });
      return {code:r.code,stdout:r.stdout,stderr:r.stderr};
    }
  };
}

/**
 * The public production entry never exports an unguarded privileged SSH
 * handle. All remote mutations are behind verified runtime admission.
 * No direct server execution occurs without admission from existing MCP stores.
 */
export async function executeGovernedPleskSubdomainOnExistingSsh(
  req:GovernedPleskSubdomainRequest,
  readExistingAuthority:()=>Promise<GovernedPleskAuthoritySnapshot>
):Promise<GovernedPleskSubdomainOutcome>{
  // Validate the exact intended SSH target before even constructing the port.
  const port=buildExistingPleskSshExecutionPort(req.target);
  return executeGovernedPleskSubdomain(req,{
    readExistingAuthority,
    remote:port
  });
}

/** A pure helper for contract tests; it NEVER performs an SSH request. */
export function isAllowlistedPleskCreateCommand(
  target:PleskSubdomainInput,
  server:string,
  command:string
):boolean {
  const synthetic={
    parentExists:true,targetExists:false,documentRootExists:false,
    subscriptionAuthorized:true,documentRootSafe:true,targetOwnedByProvisioner:false
  } as const;
  if(planPleskSubdomain({...target,evidence:synthetic}).decision!=='READY'
    ||target.documentRoot!=='/'+target.label)return false;
  return server===target.serverId
    && command==="plesk bin subdomain --create '"+target.label
      +"' -domain '"+target.parentDomain
      +"' -www-root '"+target.documentRoot+"'";
}
