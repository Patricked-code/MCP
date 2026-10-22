/**
 * Pure additive Plesk subdomain planner.
 *
 * This function deliberately does not execute SSH commands. It must be given
 * fresh, independently verified Plesk and filesystem observations before
 * a privileged executor can consume the strictly bounded argv.
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

const LABEL = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
const DOMAIN = /^(?=.{4,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;
const ROOT_SEGMENT = '[a-z0-9](?:[a-z0-9_-]{0,61}[a-z0-9])?';
const DOCUMENT_ROOT = new RegExp('^/' + ROOT_SEGMENT + '(?:/' + ROOT_SEGMENT + '){0,3}$');

/**
 * Fail closed on any missing Plesk, subscription or filesystem evidence.
 * A NO_OP is possible only for an existing provisioner-owned subdomain.
 * A READY result describes the official Plesk Linux CLI argument vector
 * and does NOT grant consent or authority to execute it.
 */
export function planPleskSubdomain(input: PleskSubdomainInput): PleskSubdomainPlan {
  const fqdn = String(input.label) + '.' + String(input.parentDomain);
  const blocked = (reason: string): PleskSubdomainPlan =>
    ({ decision: 'BLOCKED', reason, fqdn, argv: [] });

  if ((input.serverId !== 's1' && input.serverId !== 's2')
    || !LABEL.test(input.label)
    || !DOMAIN.test(input.parentDomain)
    || !DOCUMENT_ROOT.test(input.documentRoot)) {
    return blocked('TARGET_INVALID');
  }

  const evidence = input.evidence;
  if (!evidence
    || evidence.parentExists !== true
    || evidence.subscriptionAuthorized !== true
    || evidence.documentRootSafe !== true) {
    return blocked('PREFLIGHT_NOT_ATTESTED');
  }

  if (evidence.targetExists === true) {
    return evidence.targetOwnedByProvisioner === true
      ? { decision: 'NO_OP', reason: 'ALREADY_PROVISIONED', fqdn, argv: [] }
      : blocked('EXISTING_TARGET_NOT_OWNED');
  }

  if (evidence.targetExists !== false || evidence.documentRootExists !== false) {
    return blocked('TARGET_ABSENCE_NOT_PROVEN');
  }

  return {
    decision: 'READY',
    reason: 'NEW_TARGET_READY_FOR_CONSENT',
    fqdn,
    argv: [
      'plesk', 'bin', 'subdomain', '--create', input.label,
      '-domain', input.parentDomain, '-www-root', input.documentRoot
    ]
  };
}
