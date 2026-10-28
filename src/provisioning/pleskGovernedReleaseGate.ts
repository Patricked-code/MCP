/**
 * GD-U-02D-B3b — independent, fail-closed Plesk release gate.
 *
 * Composes the existing E3/OAuth, owned Task/Session/Lock, authenticated MCP
 * transport binding and observed GitHub PR/CI/review proofs. Does not issue
 * tokens, approve itself, consume web E3 tickets, register MCP tools, run
 * commands, or override the current writeEnabled/authorizeRuntimeWrite guard.
 *
 * Critically, the current E3 ticket verifier checks a signature but does NOT
 * establish single-use consumption linked to the governed session. Therefore
 * this gate remains HOLD even when all other observations pass.
 */
import type { SignedWebOauthConsentObservation } from './pleskWebOauthBridge.js';
import type { PleskOwnedWebSessionProjection } from './pleskOwnedWebSession.js';
import type { PleskWebTransportLinkObservation } from './pleskWebTransportLink.js';
import type { GovernedPleskAuthoritySnapshot } from './governedPleskSubdomainExecutor.js';

export type TrustedPleskReleaseAttestation=Readonly<{
  source:'SERVER_VALIDATED_GITHUB_API';
  at:string;
  repository:string;
  pr:number;
  headSha:string;
  workflowConcludedSuccess:boolean;
  independentReviewApproved:boolean;
  reviewer:string;
  prAuthor:string;
  approvalHeadSha:string;
}>;
export type PleskGovernedReleaseEvidence=Readonly<{
  at:string;
  scope:string;
  principalId:string;
  taskId:string;
  sessionId:string;
  sha:string;
  signedConsent:SignedWebOauthConsentObservation;
  ownedCandidate:PleskOwnedWebSessionProjection;
  transportBinding:PleskWebTransportLinkObservation;
  runtimeAuthority:GovernedPleskAuthoritySnapshot;
}>;
export type PleskGovernedReleasePorts=Readonly<{
  /** Server-side authenticated GitHub provider; never browser-supplied flags. */
  readTrustedReleaseAttestation:()=>Promise<TrustedPleskReleaseAttestation|null>;
}>;
export type PleskGovernedReleaseResult=Readonly<{
  disposition:'HOLD';
  blockers:readonly string[];
  nextSafeAction:'VERIFY_E3_SINGLE_USE_AND_REVIEW';
  trustedGithubObservationPresent:boolean;
  runtimeWriteAuthorized:false;
  operationExecuted:false;
}>;
const SHA=/^[a-f0-9]{40}$/;
const SCOPE=/^resource:plesk:(s1|s2):[a-z0-9.-]{4,253}$/;
const REPO=/^[a-z0-9-]+\/[a-z0-9_.-]+$/i;
const date=(x:string):number=>typeof x==='string'?Date.parse(x):NaN;
function recent(x:string,now:number,maxAge:number):boolean{
  const time=date(x);
  return Number.isFinite(time)&&time<=now&&now-time<=maxAge;
}

export async function assessPleskGovernedRelease(
  evidence:PleskGovernedReleaseEvidence,
  ports:PleskGovernedReleasePorts
):Promise<PleskGovernedReleaseResult>{
  const blockers:string[]=[];
  const now=date(evidence.at);
  const a=evidence.runtimeAuthority;
  const c=evidence.signedConsent;
  const t=evidence.ownedCandidate;
  const link=evidence.transportBinding;
  const plainScope=evidence.scope.startsWith('resource:')
    ?evidence.scope.slice('resource:'.length):'';
  const crossProofValid=Number.isFinite(now)
    &&SCOPE.test(evidence.scope)
    &&SHA.test(evidence.sha)
    &&evidence.taskId.length>0&&evidence.sessionId.length>0
    &&evidence.principalId.startsWith('oauth:')
    &&c.status==='E3_AND_OAUTH_OBSERVED'
    &&c.consentPurpose==='plesk-create-subdomain'
    &&c.principalId===evidence.principalId
    &&c.targetScope===evidence.scope
    &&t.status==='UNIQUE_OWNED_CANDIDATE'
    &&t.reason==='CANDIDATE_OBSERVED'
    &&t.principalId===evidence.principalId
    &&t.taskId===evidence.taskId
    &&t.sessionId===evidence.sessionId
    &&t.expectedHeadSha===evidence.sha
    &&link.status==='TRANSPORT_BINDING_OBSERVED'
    &&link.governedWebTransportLinked===true
    &&link.sessionId===evidence.sessionId
    &&a.source==='EXISTING_GOVERNED_RUNTIME'
    &&a.taskId===evidence.taskId
    &&a.taskStatus==='IN_PROGRESS'
    &&a.taskOwnerSessionId===evidence.sessionId
    &&a.taskResourceScopes.includes(plainScope)
    &&a.sessionId===evidence.sessionId
    &&a.sessionStatus==='ACTIVE'
    &&a.sessionOwnerPrincipalId===evidence.principalId
    &&a.lockScope===evidence.scope
    &&a.lockOwnerSessionId===evidence.sessionId
    &&recent(a.observedAt,now,30_000)
    &&recent(a.sessionLastHeartbeatAt,now,300_000)
    &&Number.isFinite(date(a.lockExpiresAt))
    &&date(a.lockExpiresAt)>now
    &&date(a.lockExpiresAt)-now<=300_000
    &&a.githubMainSha===evidence.sha
    &&a.serverCheckoutSha===evidence.sha
    &&a.runtimeRevisionSha===evidence.sha;
  if(!crossProofValid)blockers.push('CROSS_PROOF_MISMATCH');
  let attestation:TrustedPleskReleaseAttestation|null=null;
  try{attestation=await ports.readTrustedReleaseAttestation();}
  catch{ /* Fail closed; no raw provider errors or tokens returned. */ }
  const attestationValid=attestation?.source==='SERVER_VALIDATED_GITHUB_API'
    &&REPO.test(attestation.repository)
    &&attestation.repository==='Patricked-code/MCP'
    &&attestation.pr===355
    &&attestation.headSha===evidence.sha
    &&attestation.approvalHeadSha===evidence.sha
    &&attestation.workflowConcludedSuccess===true
    &&attestation.independentReviewApproved===true
    &&typeof attestation.reviewer==='string'&&attestation.reviewer.length>0
    &&attestation.reviewer!==attestation.prAuthor
    &&recent(attestation.at,now,300_000);
  if(!attestation)blockers.push('INDEPENDENT_RELEASE_ATTESTATION_MISSING');
  else if(!attestationValid)blockers.push('INDEPENDENT_RELEASE_ATTESTATION_INVALID');

  // Signed ticket verification is NOT an atomic E3 consumption proof.
  // This evidence does not yet exist in the existing Plesk web route.
  // Deliberately never infer it from a form, cookie, checkpoint or lock.
  blockers.push('SINGLE_USE_E3_CONSUMPTION_MISSING');

  return {
    disposition:'HOLD',
    blockers,
    nextSafeAction:'VERIFY_E3_SINGLE_USE_AND_REVIEW',
    trustedGithubObservationPresent:Boolean(attestationValid),
    runtimeWriteAuthorized:false,
    operationExecuted:false
  };
}
