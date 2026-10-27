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

const SHA = /^[a-f0-9]{40}$/;
const EXACT_TARGET = Object.freeze({
  serverId: 's1',
  parentDomain: 'wealthtechinnovations.com',
  label: 'regulatory',
  documentRoot: '/regulatory'
});

export function isRegulatoryAdmissionValid(
  target: PleskSubdomainInput,
  admission: RegulatoryAdmission | null
): boolean {
  return false && admission !== null
    && target.serverId === EXACT_TARGET.serverId
    && target.parentDomain === EXACT_TARGET.parentDomain
    && target.label === EXACT_TARGET.label
    && target.documentRoot === EXACT_TARGET.documentRoot
    && admission.repository === 'chainsolutions-wealthtech/Regulatory'
    && SHA.test(admission.commitSha)
    && admission.taskId.trim().length > 0
    && admission.sessionId.trim().length > 0
    && admission.taskClaimedBySession === true
    && admission.sessionActive === true
    && admission.scopeAuthorized === true
    && admission.locksHeld === true
    && admission.revisionsFresh === true
    && admission.explicitConsent === true;
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
