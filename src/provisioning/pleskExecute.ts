import { planPleskSubdomain } from './pleskSite.js';
import type { PleskSubdomainEvidence, PleskSubdomainInput, PleskServerId } from './pleskSite.js';

/**
 * The privileged adapter must re-observe the live Plesk subscription and the
 * canonical document root, execute only the bounded argv, and attest the
 * resulting target. No SSH transport or credentials live in this module.
 */
export type PleskCreateDependencies = Readonly<{
  observe: (input: PleskSubdomainInput) => Promise<PleskSubdomainEvidence>;
  create: (serverId: PleskServerId, argv: readonly string[]) => Promise<{ exitCode: number }>;
  verify: (input: PleskSubdomainInput) => Promise<boolean>;
}>;

export type PleskCreationOutcome = Readonly<{
  status: 'CREATED' | 'NO_OP' | 'BLOCKED' | 'FAILED' | 'UNVERIFIED';
  reason: string;
}>;

/** No write without explicit approval, fresh preflight and target verification. */
export async function executePleskSubdomain(
  input: PleskSubdomainInput,
  approval: { allowWrite: boolean; consent: 'CREATE_SUBDOMAIN' | null },
  deps: PleskCreateDependencies
): Promise<PleskCreationOutcome> {
  if (approval.allowWrite !== true || approval.consent !== 'CREATE_SUBDOMAIN') {
    return { status: 'BLOCKED', reason: 'CONSENT_REQUIRED' };
  }

  let evidence: PleskSubdomainEvidence;
  try {
    evidence = await deps.observe(input);
  } catch {
    return { status: 'BLOCKED', reason: 'PREFLIGHT_UNAVAILABLE' };
  }

  const plan = planPleskSubdomain({ ...input, evidence });
  if (plan.decision === 'BLOCKED') {
    return { status: 'BLOCKED', reason: plan.reason };
  }
  if (plan.decision === 'NO_OP') {
    return { status: 'NO_OP', reason: plan.reason };
  }

  // Never authorize execution of anything other than this validated argv.
  if (plan.argv.length !== 9
    || plan.argv[0] !== 'plesk'
    || plan.argv[1] !== 'bin'
    || plan.argv[2] !== 'subdomain'
    || plan.argv[3] !== '--create'
    || plan.argv[5] !== '-domain'
    || plan.argv[7] !== '-www-root') {
    return { status: 'BLOCKED', reason: 'COMMAND_NOT_ALLOWLISTED' };
  }

  try {
    const execution = await deps.create(input.serverId, plan.argv);
    if (execution.exitCode !== 0) {
      return { status: 'FAILED', reason: 'PLESK_CREATE_FAILED' };
    }
  } catch {
    return { status: 'FAILED', reason: 'PLESK_CREATE_FAILED' };
  }

  try {
    return await deps.verify(input)
      ? { status: 'CREATED', reason: 'POST_CREATE_ATTESTED' }
      : { status: 'UNVERIFIED', reason: 'POST_CREATE_NOT_ATTESTED' };
  } catch {
    return { status: 'UNVERIFIED', reason: 'POST_CREATE_UNAVAILABLE' };
  }
}
