/**
 * Pure policy for the GRT pilot. The authority projections MUST originate
 * from existing Governed Session, Task Queue, Lock Service and bootstrap
 * receipt readers; nothing in this file creates an identity or claim.
 */
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
export function decideGovernPilotRuntimeAdmission(
  _evidence: GovernPilotAuthorityEvidence,
  _now: Date
): GovernPilotAuthorityDecision {
  return { admitted: false, reason: 'GRT_AUTHORITY_NOT_IMPLEMENTED' };
}
