/**
 * Additive Plesk provisioning boundary. This module intentionally exposes
 * a pure plan: no SSH, no filesystem writes, and no implicit privileges.
 * A caller may execute argv only after fresh Plesk observations and consent.
 */
export type PleskServerId = 's1' | 's2';

export type PleskSubdomainEvidence = Readonly<{
  parentExists: boolean | null;
  targetExists: boolean | null;
  documentRootExists: boolean | null;
  subscriptionAuthorized: boolean | null;
  documentRootSafe: boolean | null;
  targetOwnedByProvisioner: boolean | null;
}>;

export type PleskSubdomainInput = Readonly<{
  serverId: PleskServerId;
  parentDomain: string;
  label: string;
  documentRoot: string;
  evidence: PleskSubdomainEvidence;
}>;

export type PleskSubdomainPlan = Readonly<{
  decision: 'READY' | 'BLOCKED' | 'NO_OP';
  reason: string;
  fqdn: string;
  argv: readonly string[];
}>;

/** RED baseline: the new functionality has not been implemented yet. */
export function planPleskSubdomain(input: PleskSubdomainInput): PleskSubdomainPlan {
  return {
    decision: 'BLOCKED',
    reason: 'NOT_IMPLEMENTED',
    fqdn: input.label + '.' + input.parentDomain,
    argv: []
  };
}
