/**
 * GD-U-02D-B3a — read-only authenticated MCP transport-to-governed-session
 * linkage, reusing the EXISTING GovernedSessionService binding index.
 *
 * This is not the E3 web cookie, a one-use consent receipt, a CI/review
 * attestation, a claim, a lock or a write authorization. Never derive the
 * MCP transport ID or OAuth identity from the Plesk browser form.
 * A web cookie alone has NO mapping to a governed MCP transport.
 */
import type { SessionRequest } from '../operationalMemory/sessionService.js';
import type { SignedWebOauthConsentObservation } from './pleskWebOauthBridge.js';
import type { PleskOwnedWebSessionProjection } from './pleskOwnedWebSession.js';

export type PleskWebTransportLinkPorts=Readonly<{
  /** Existing GovernedSessionService.lookupGovernedSessionId only. */
  lookupBoundSessionId:(serverAuthenticatedTransportId:string)=>string|null;
}>;
export type PleskWebTransportLinkObservation=Readonly<{
  status:'TRANSPORT_BINDING_OBSERVED'|'BLOCKED';
  reason:'BOUND_TO_UNIQUE_OWNED_SESSION'|'E3_OR_CANDIDATE_MISSING'
    |'AUTHENTICATED_TRANSPORT_REQUIRED'|'SESSION_BINDING_NOT_ATTESTED'
    |'SOURCE_UNAVAILABLE';
  sessionId:string|null;
  governedWebTransportLinked:boolean;
  singleUseE3Consumed:false;
  independentCiReviewVerified:false;
  runtimeWriteAuthorized:false;
  operationExecuted:false;
}>;
const SHA=/^[0-9a-f]{40}$/;
const SCOPE=/^resource:plesk:(s1|s2):[a-z0-9.-]{4,253}$/;
const blocked=(reason:PleskWebTransportLinkObservation['reason']):PleskWebTransportLinkObservation=>({
  status:'BLOCKED',reason,sessionId:null,governedWebTransportLinked:false,
  singleUseE3Consumed:false,independentCiReviewVerified:false,
  runtimeWriteAuthorized:false,operationExecuted:false
});

/**
 * Pure observation; a matching binding is NOT proof of E3 single-use
 * consumption or an independent security review. Callers must re-read
 * current task/session/lock/live state before any later privileged action.
 */
export function inspectPleskWebTransportLink(
  consent:SignedWebOauthConsentObservation,
  candidate:PleskOwnedWebSessionProjection,
  transport:SessionRequest,
  ports:PleskWebTransportLinkPorts
):PleskWebTransportLinkObservation{
  if(consent?.status!=='E3_AND_OAUTH_OBSERVED'
    ||candidate?.status!=='UNIQUE_OWNED_CANDIDATE'
    ||candidate.reason!=='CANDIDATE_OBSERVED'
    ||!consent.principalId||!candidate.principalId
    ||consent.principalId!==candidate.principalId
    ||!SCOPE.test(consent.targetScope??'')
    ||!candidate.taskId||!candidate.sessionId
    ||!SHA.test(candidate.expectedHeadSha??'')){
    return blocked('E3_OR_CANDIDATE_MISSING');
  }
  if(!transport?.identity
    ||transport.identity.assurance!=='oauth_subject'
    ||transport.identity.principalId!==consent.principalId
    ||typeof transport.transportSessionId!=='string'
    ||transport.transportSessionId.length===0
    ||transport.transportSessionId.length>256
    ||/[\x00-\x1f\x7f]/.test(transport.transportSessionId)){
    return blocked('AUTHENTICATED_TRANSPORT_REQUIRED');
  }
  try{
    const linked=ports.lookupBoundSessionId(transport.transportSessionId);
    if(!linked||linked!==candidate.sessionId)
      return blocked('SESSION_BINDING_NOT_ATTESTED');
    return {
      status:'TRANSPORT_BINDING_OBSERVED',
      reason:'BOUND_TO_UNIQUE_OWNED_SESSION',
      sessionId:linked,
      governedWebTransportLinked:true,
      singleUseE3Consumed:false,
      independentCiReviewVerified:false,
      runtimeWriteAuthorized:false,
      operationExecuted:false
    };
  }catch{return blocked('SOURCE_UNAVAILABLE');}
}

/**
 * Only internal server code holding an authenticated SessionRequest may call
 * this; it must never be registered as a public MCP write tool or take the
 * transport from an HTTP form. No new store or parallel identity manager.
 */
export async function inspectPleskWebTransportLinkFromRuntime(
  consent:SignedWebOauthConsentObservation,
  candidate:PleskOwnedWebSessionProjection,
  trustedTransport:SessionRequest
):Promise<PleskWebTransportLinkObservation>{
  try{
    const {getGovernedSessionToolDependencies}=await import('../tools/governedSessions.js');
    const sessions=getGovernedSessionToolDependencies().sessions;
    return inspectPleskWebTransportLink(consent,candidate,trustedTransport,{
      lookupBoundSessionId:id=>sessions.lookupGovernedSessionId(id)
    });
  }catch{return blocked('SOURCE_UNAVAILABLE');}
}
