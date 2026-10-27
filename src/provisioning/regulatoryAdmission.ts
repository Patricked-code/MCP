import { createPleskSubdomainOnServer } from './pleskSshAdapter.js';
import type { PleskPolicy, PleskRemotePort } from './pleskSshAdapter.js';
import type { PleskSubdomainInput } from './pleskSite.js';
import type { PleskCreationOutcome } from './pleskExecute.js';

/**
 * Target-specific, fail-closed admission seam. The caller MUST supply evidence
 * from the existing live governed Task/Session/Lock authorities; this module
 * deliberately cannot manufacture a session, task, lock or approval.
 *
 * Until an authoritative server-side resolver is wired, caller-provided booleans
 * are not evidence. All execution remains blocked, including forged positives.
 * This is not registered as a remotely callable MCP write tool.
 */
export type RegulatoryAdmission = Readonly<{
  repository: 'chainsolutions-wealthtech/Regulatory';
  commitSha: string;
  taskId: string;
  sessionId: string;
  taskClaimedBySession: boolean;
  sessionActive: boolean;
  scopeAuthorized: boolean;
  locksHeld: boolean;
  revisionsFresh: boolean;
  explicitConsent: boolean;
}>;

/**
 * Deliberately deny all caller-supplied admissions. A boolean asserted by a
 * caller is not proof of a governed claim, lock, revision or consent.
 * Replace this only with an authority-backed, fresh, server-side verification.
 */
export function isRegulatoryAdmissionValid(
  _target: PleskSubdomainInput,
  _admission: RegulatoryAdmission | null
): boolean {
  return false;
}

export async function executeRegulatoryPleskAdmission(
  target: PleskSubdomainInput,
  admission: RegulatoryAdmission | null,
  policy: PleskPolicy,
  io: PleskRemotePort
): Promise<PleskCreationOutcome> {
  if (!isRegulatoryAdmissionValid(target, admission)) {
    return { status: 'BLOCKED', reason: 'REGULATORY_GOVERNED_ADMISSION_REQUIRED' };
  }
  return createPleskSubdomainOnServer(target, policy, true, io);
}
