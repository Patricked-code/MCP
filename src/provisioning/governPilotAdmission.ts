/**
 * Bounded decision policy for the existing MCP Governed Session, Governed
 * Task Queue and Lock Service. It mints no session, claim, receipt or lock.
 * The caller MUST obtain its projections from the authoritative services.
 */
export const GRT_PILOT_RESOURCE_SCOPE = 'repository:chainsolutions-wealthtech/Governed-Repository-Template';
export type GovernPilotAuthorityEvidence = {
  complete: boolean;
  observedStateVersion: number;
  webPrincipalId: string;
  session: null | {
    governedSessionId: string;
    ownerPrincipalId: string;
    status: string;
    lastAcknowledgedStateVersion: number;
    bootstrapReceiptVerified: boolean;
    expiresAt: string;
  };
  tasks: Array<{
    taskId: string;
    status: string;
    ownerGovernedSessionId: string | null;
    resourceScopes: string[];
  }>;
  locks: Array<{
    scope: string;
    governedSessionId: string;
    expiresAt: string;
  }>;
};
export type GovernPilotAuthorityDecision = Readonly<{
  admitted: boolean;
  reason: string;
}>;
const deny = (reason: string): GovernPilotAuthorityDecision => ({admitted:false,reason});
const live = (timestamp:string, now:number):boolean => {
  const exp=Date.parse(timestamp);
  return Number.isFinite(exp) && exp>now && exp<=now + 24*60*60*1000;
};
export function decideGovernPilotRuntimeAdmission(
  evidence: GovernPilotAuthorityEvidence,
  now: Date
): GovernPilotAuthorityDecision {
  if(!evidence.complete || !Number.isSafeInteger(evidence.observedStateVersion)
    || evidence.observedStateVersion<1) return deny('GRT_COORDINATION_UNAVAILABLE');
  const session=evidence.session;
  const at=now.getTime();
  if(!session || !session.governedSessionId || session.status!=='ACTIVE'
    || !evidence.webPrincipalId || session.ownerPrincipalId!==evidence.webPrincipalId
    || !session.bootstrapReceiptVerified || !live(session.expiresAt,at)
    || session.lastAcknowledgedStateVersion!==evidence.observedStateVersion) {
    return deny('GRT_SESSION_AUTHORITY_UNAVAILABLE');
  }
  const claims=evidence.tasks.filter(t=>t.resourceScopes.includes(GRT_PILOT_RESOURCE_SCOPE)
    && ['CLAIMED','IN_PROGRESS','REVIEW','MERGE_READY','DEPLOYING','VERIFYING'].includes(t.status));
  if(claims.length!==1 || claims[0]?.ownerGovernedSessionId!==session.governedSessionId) {
    return deny('GRT_EXCLUSIVE_CLAIM_REQUIRED');
  }
  const active=evidence.locks.filter(lock=>lock.scope===GRT_PILOT_RESOURCE_SCOPE && live(lock.expiresAt,at));
  if(active.length!==1 || active[0]?.governedSessionId!==session.governedSessionId) {
    return deny('GRT_EXCLUSIVE_LOCK_REQUIRED');
  }
  return {admitted:true,reason:'GRT_GOVERNED_RUNTIME_ADMITTED'};
}
