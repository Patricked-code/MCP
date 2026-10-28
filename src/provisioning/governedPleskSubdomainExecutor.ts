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
function admitted(req:GovernedPleskSubdomainRequest,a:GovernedPleskAuthoritySnapshot):boolean{
  const expectedScope='plesk:'+req.target.serverId+':'+req.target.parentDomain;
  const age=ageMs(a.observedAt,req.now);
  const heartbeat=ageMs(a.sessionLastHeartbeatAt,req.now);
  const expiry=ageMs(a.lockExpiresAt,req.now);
  return a.source==='EXISTING_GOVERNED_RUNTIME'
    && a.taskId===req.expectedTaskId
    && a.taskStatus==='IN_PROGRESS'
    && a.taskOwnerSessionId===req.expectedSessionId
    && a.taskResourceScopes.includes(expectedScope)
    && a.sessionId===req.expectedSessionId
    && a.sessionStatus==='ACTIVE'
    && a.sessionOwnerPrincipalId===req.expectedPrincipalId
    && a.lockScope===expectedScope
    && a.lockOwnerSessionId===req.expectedSessionId
    && a.consent==='CREATE_SUBDOMAIN'
    && a.reviewAndCiApproved===true
    && SHA.test(req.expectedHeadSha)
    && a.githubMainSha===req.expectedHeadSha
    && a.serverCheckoutSha===req.expectedHeadSha
    && a.runtimeRevisionSha===req.expectedHeadSha
    && age!==null && age>=0 && age<=30_000
    && heartbeat!==null && heartbeat>=0 && heartbeat<=300_000
    && expiry!==null && expiry<0 && expiry>=-300_000;
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
  if(!authority||!admitted(req,authority))return blocked('GOVERNED_ADMISSION_NOT_ATTESTED');
  // Reuse the original TDD Plesk adapter's fresh subscription/path observation,
  // fixed argv, narrowly consented guarded call and post-create reobservation.
  const result=await createPleskSubdomainOnServer(req.target,req.policy,true,deps.remote);
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
