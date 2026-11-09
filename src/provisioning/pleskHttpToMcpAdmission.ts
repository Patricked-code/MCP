/**
 * GD-U-02D-B3f — the genuine server-side web-to-MCP admission read path.
 *
 * A web cookie and HTTP Authorization header are NOT an MCP transport session.
 * Only an authenticated SessionRequest created inside the MCP transport
 * handler can be supplied as trustedMcpTransport. Browser-supplied transport
 * IDs, task IDs, claims or lock snapshots are never accepted.
 *
 * This module reads EXISTING E3/OAuth, Task Queue, Session, Lock and Live State
 * authorities. It does not issue credentials, create a second auth store,
 * modify runtime stores, grant Plesk write permission or run SSH commands.
 */
import type { SessionRequest } from '../operationalMemory/sessionService.js';
import type {
  SignedWebOauthConsentRequest,SignedWebOauthConsentObservation
} from './pleskWebOauthBridge.js';
import type { PleskOwnedWebSessionProjection } from './pleskOwnedWebSession.js';
import type { PleskWebTransportLinkObservation } from './pleskWebTransportLink.js';
import type { ExistingPleskAuthorityInspection } from './existingPleskAuthorityReader.js';

export type PleskHttpToMcpAdmissionInput=SignedWebOauthConsentRequest & Readonly<{
  /** Trusted MCP server-side request context; NEVER req.body/header/query. */
  trustedMcpTransport:SessionRequest|null;
}>;
export type PleskHttpToMcpAdmissionPorts=Readonly<{
  inspectSignedOauth:(input:SignedWebOauthConsentRequest)=>Promise<SignedWebOauthConsentObservation>;
  findUniqueOwnedTask:(c:SignedWebOauthConsentObservation)=>Promise<PleskOwnedWebSessionProjection>;
  checkBoundTransport:(
    c:SignedWebOauthConsentObservation,
    owned:PleskOwnedWebSessionProjection,
    transport:SessionRequest
  )=>Promise<PleskWebTransportLinkObservation>;
  checkRuntimeAuthority:(
    c:SignedWebOauthConsentObservation,
    owned:PleskOwnedWebSessionProjection,
    transport:SessionRequest,
    input:PleskHttpToMcpAdmissionInput
  )=>Promise<ExistingPleskAuthorityInspection>;
  now:()=>Date;
  /** Private server-side handoff, never serialized into HTTP response. */
  onVerifiedProof?:(proof:PleskVerifiedMcpAuthorityProof)=>void;
}>;
export type PleskVerifiedMcpAuthorityProof=Readonly<{
  consent:SignedWebOauthConsentObservation;
  candidate:PleskOwnedWebSessionProjection;
  transportLink:PleskWebTransportLinkObservation;
  authority:ExistingPleskAuthorityInspection;
  transport:SessionRequest;
}>;
export type PleskHttpToMcpAdmissionObservation=Readonly<{
  status:'BLOCKED'|'READ_ONLY_PROOFS_OBSERVED';
  reason:'TRUSTED_MCP_TRANSPORT_REQUIRED'|'SIGNED_WEB_OAUTH_NOT_ATTESTED'
    |'OWNED_TASK_OR_LOCK_NOT_ATTESTED'|'MCP_SESSION_BINDING_NOT_ATTESTED'
    |'RUNTIME_SCOPE_NOT_ATTESTED'|'INDEPENDENT_E3_AND_CI_WRITE_GATE_UNAVAILABLE'
    |'TRUSTED_SOURCE_UNAVAILABLE';
  /** Deliberately no task/session IDs or bearer secrets in HTTP result. */
  runtimeWriteAuthorized:false;
  operationExecuted:false;
}>;
const reject=(reason:PleskHttpToMcpAdmissionObservation['reason']):
  PleskHttpToMcpAdmissionObservation=>({
    status:'BLOCKED',reason,runtimeWriteAuthorized:false,operationExecuted:false
  });
const SHA=/^[0-9a-f]{40}$/;
const SCOPE=/^resource:plesk:(s1|s2):[a-z0-9.-]{4,253}$/;
const HEARTBEAT=300_000;
function recent(timestamp:string,now:number,maxAge:number):boolean {
  const when=Date.parse(timestamp);
  return Number.isFinite(when)&&when<=now&&now-when<=maxAge;
}

/**
 * A verified OAuth token alone cannot recover or authenticate the MCP
 * transport binding. In the current HTTP web route no such server-owned
 * transport exists, so the first check denies without querying any stores.
 */
export async function inspectPleskHttpToMcpAdmission(
  input:PleskHttpToMcpAdmissionInput,
  ports:PleskHttpToMcpAdmissionPorts
):Promise<PleskHttpToMcpAdmissionObservation>{
  const t=input?.trustedMcpTransport;
  if(!t||t.identity?.assurance!=='oauth_subject'
    ||!t.identity.principalId?.startsWith('oauth:')
    ||typeof t.transportSessionId!=='string'
    ||t.transportSessionId.length<1||t.transportSessionId.length>256
    ||/[\x00-\x1f\x7f]/.test(t.transportSessionId))
    return reject('TRUSTED_MCP_TRANSPORT_REQUIRED');
  try {
    const consent=await ports.inspectSignedOauth(input);
    if(consent.status!=='E3_AND_OAUTH_OBSERVED'
      ||consent.principalId!==t.identity.principalId
      ||!SCOPE.test(consent.targetScope??'')
      ||consent.targetScope!=='resource:plesk:'+input.target.serverId+':'+input.target.parentDomain)
      return reject('SIGNED_WEB_OAUTH_NOT_ATTESTED');

    const owned=await ports.findUniqueOwnedTask(consent);
    if(owned.status!=='UNIQUE_OWNED_CANDIDATE'
      ||owned.principalId!==consent.principalId
      ||!owned.taskId||!owned.sessionId
      ||!SHA.test(owned.expectedHeadSha??''))
      return reject('OWNED_TASK_OR_LOCK_NOT_ATTESTED');

    const linked=await ports.checkBoundTransport(consent,owned,t);
    if(linked.status!=='TRANSPORT_BINDING_OBSERVED'
      ||!linked.governedWebTransportLinked
      ||linked.sessionId!==owned.sessionId)
      return reject('MCP_SESSION_BINDING_NOT_ATTESTED');

    // Re-read the existing Task Queue, Session, Lock and exact Live State
    // after the transport match, rather than trusting the earlier candidate.
    const inspection=await ports.checkRuntimeAuthority(consent,owned,t,input);
    const a=inspection.snapshot;
    const now=ports.now().getTime();
    const valid=a.source==='EXISTING_GOVERNED_RUNTIME'
      &&a.taskId===owned.taskId &&a.taskStatus==='IN_PROGRESS'
      &&a.taskOwnerSessionId===owned.sessionId
      &&a.sessionId===owned.sessionId &&a.sessionStatus==='ACTIVE'
      &&a.sessionOwnerPrincipalId===consent.principalId
      &&a.lockScope===consent.targetScope
      &&a.lockOwnerSessionId===owned.sessionId
      &&a.taskResourceScopes.includes(consent.targetScope.slice('resource:'.length))
      &&SHA.test(owned.expectedHeadSha!)
      &&a.githubMainSha===owned.expectedHeadSha
      &&a.serverCheckoutSha===owned.expectedHeadSha
      &&a.runtimeRevisionSha===owned.expectedHeadSha
      &&recent(a.observedAt,now,30_000)
      &&recent(a.sessionLastHeartbeatAt,now,HEARTBEAT)
      &&Date.parse(a.lockExpiresAt)>now
      &&Date.parse(a.lockExpiresAt)-now<=HEARTBEAT
      &&inspection.blockers.every(x=>x==='E3_AND_CI_ATTESTATION_UNAVAILABLE');
    if(!valid)return reject('RUNTIME_SCOPE_NOT_ATTESTED');
    // A callback only receives evidence after every existing runtime authority
    // passes. The ordinary observation remains redacted and read-only.
    ports.onVerifiedProof?.({consent,candidate:owned,transportLink:linked,
      authority:inspection,transport:t});

    // E3 single-use consumption, GitHub independent review and exact-head
    // CI are NOT represented by the read-only runtime authority. Never
    // synthesize a "write allowed" decision from this partial observation.
    return {
      status:'READ_ONLY_PROOFS_OBSERVED',
      reason:'INDEPENDENT_E3_AND_CI_WRITE_GATE_UNAVAILABLE',
      runtimeWriteAuthorized:false,
      operationExecuted:false
    };
  }catch {return reject('TRUSTED_SOURCE_UNAVAILABLE');}
}

/**
 * Production runtime connection to the SAME existing services backing
 * OAuth, governed tools and Live State. This is read-only. Server handlers
 * MUST pass an actually authenticated MCP transport, not an HTTP supplied ID.
 */
export async function inspectPleskHttpToMcpAdmissionFromRuntime(
  input:PleskHttpToMcpAdmissionInput,
  onVerifiedProof?:(proof:PleskVerifiedMcpAuthorityProof)=>void
):Promise<PleskHttpToMcpAdmissionObservation>{
  return inspectPleskHttpToMcpAdmission(input,{
    now:()=>new Date(),onVerifiedProof,
    inspectSignedOauth:async i=>{
      const {inspectPleskConsentUsingExistingServerVerifiers}=await import('./pleskWebOauthBridge.js');
      return inspectPleskConsentUsingExistingServerVerifiers(i);
    },
    findUniqueOwnedTask:async c=>{
      const {resolveOwnedPleskWebSessionFromRuntime}=await import('./pleskOwnedWebSession.js');
      return resolveOwnedPleskWebSessionFromRuntime(c);
    },
    checkBoundTransport:async(c,owned,transport)=>{
      const {inspectPleskWebTransportLinkFromRuntime}=await import('./pleskWebTransportLink.js');
      return inspectPleskWebTransportLinkFromRuntime(c,owned,transport);
    },
    checkRuntimeAuthority:async(c,owned,transport,i)=>{
      const {readExistingPleskAuthorityFromRuntime}=await import('./existingPleskAuthorityReader.js');
      return readExistingPleskAuthorityFromRuntime({
        target:{
          ...i.target,
          evidence:{
            parentExists:null,targetExists:null,documentRootExists:null,
            subscriptionAuthorized:null,documentRootSafe:null,
            targetOwnedByProvisioner:null
          }
        },
        policy:{enabled:false,allowedParents:{}},
        expectedTaskId:owned.taskId!,
        expectedSessionId:owned.sessionId!,
        expectedPrincipalId:c.principalId!,
        expectedHeadSha:owned.expectedHeadSha!,
        now:new Date().toISOString()
      },transport);
    }
  });
}
