/**
 * GD-U-02D-B3d: join the existing independent governed review/CI and
 * task/session/lock/transport proof gate with a single-use signed E3 receipt.
 *
 * This is a server-side security primitive, NOT a parallel E3 issuer,
 * approval engine or MCP write tool. A consumed ticket never authorizes SSH.
 * Runtime admission and actual Plesk execution remain in existing guards.
 */
import {
  assessPleskGovernedRelease,
  type PleskGovernedReleaseEvidence,
  type PleskGovernedReleasePorts
} from './pleskGovernedReleaseGate.js';
import {
  consumeSignedPleskE3Once,
  type PleskE3ConsumptionInput
} from './pleskE3SingleUse.js';

export type PleskGovernedE3Ports=Readonly<PleskGovernedReleasePorts & {
  /** Privately configured server-owned receipt directory. */
  receiptDirectory:string;
  now:()=>number;
  /** Existing signed E3 verifier, not a second issuer or key. */
  verifyTicket:(purpose:string,ticket:string,binding:string,now:number)=>boolean;
}>;
export type PleskGovernedE3Outcome=Readonly<{
  status:'BLOCKED'|'E3_CONSUMED_PENDING_RUNTIME_GATE';
  reason:'CROSS_PROOF_MISMATCH'|'RELEASE_PRECONDITIONS_NOT_ATTESTED'
    |'E3_CONSUMPTION_DENIED'|'RECEIPT_CONSUMED';
  runtimeWriteAuthorized:false;
  operationExecuted:false;
}>;
const blocked=(reason:PleskGovernedE3Outcome['reason']):PleskGovernedE3Outcome=>({
  status:'BLOCKED',reason,runtimeWriteAuthorized:false,operationExecuted:false
});

/**
 * Do not consume a consent before independently verified all other
 * preconditions: consuming early would allow a denial-of-service replay
 * against the human operator. At this stage the only missing release
 * blocker may be the receipt itself.
 */
export async function consumeGovernedPleskE3ForExistingRoute(
  evidence:PleskGovernedReleaseEvidence,
  signed:PleskE3ConsumptionInput,
  ports:PleskGovernedE3Ports
):Promise<PleskGovernedE3Outcome>{
  if(!evidence||!signed||!ports
    ||signed.scope!==evidence.scope
    ||signed.principalId!==evidence.principalId
    ||signed.taskId!==evidence.taskId
    ||signed.governedSessionId!==evidence.sessionId){
    return blocked('CROSS_PROOF_MISMATCH');
  }
  // B3g: evidence.at is an observation timestamp, NOT the trusted clock.
  // The release gate checks snapshot age, heartbeat, lock expiry and review
  // freshness relative to its 'at' field. Use the server-owned clock, and
  // recheck inside the existing single-use consumer immediately before its
  // exclusive-create receipt. This prevents burning a valid E3 ticket on a
  // stale or already-expired governed lock after a slow provider call.
  const releaseStillCurrent=async():Promise<boolean>=>{
    // Fetch the provider before sampling the server clock. Otherwise a
    // freshly issued attestation can look future-dated against the old time.
    let attestation;
    try{attestation=await ports.readTrustedReleaseAttestation();}
    catch{return false;}
    const instant=ports.now();
    if(!Number.isSafeInteger(instant)||instant<0)return false;
    const observed=await assessPleskGovernedRelease({
      ...evidence,at:new Date(instant).toISOString()
    },{
      readTrustedReleaseAttestation:async()=>attestation
    });
    return observed.disposition==='HOLD'
      &&observed.blockers.length===1
      &&observed.blockers[0]==='SINGLE_USE_E3_CONSUMPTION_MISSING'
      &&observed.trustedGithubObservationPresent;
  };
  try{
    if(!await releaseStillCurrent())
      return blocked('RELEASE_PRECONDITIONS_NOT_ATTESTED');
  }catch{return blocked('RELEASE_PRECONDITIONS_NOT_ATTESTED');}
  // A consumed receipt is still not runtime write authorization or SSH.
  // The underlying E3 consumer independently re-verifies HMAC and expiry.
  const outcome=await consumeSignedPleskE3Once(signed,{
    directory:ports.receiptDirectory,
    now:ports.now,
    verifyTicket:ports.verifyTicket,
    verifyPreAdmission:releaseStillCurrent
  });
  if(outcome.status!=='CONSUMED')return blocked('E3_CONSUMPTION_DENIED');
  return {
    status:'E3_CONSUMED_PENDING_RUNTIME_GATE',
    reason:'RECEIPT_CONSUMED',
    runtimeWriteAuthorized:false,
    operationExecuted:false
  };
}
