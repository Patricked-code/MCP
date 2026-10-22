import type { PleskSubdomainEvidence, PleskSubdomainInput, PleskServerId } from './pleskSite.js';

export type PleskCreateDependencies = Readonly<{
  observe: (input: PleskSubdomainInput) => Promise<PleskSubdomainEvidence>;
  create: (serverId: PleskServerId, argv: readonly string[]) => Promise<{ exitCode: number }>;
  verify: (input: PleskSubdomainInput) => Promise<boolean>;
}>;

export type PleskCreationOutcome = Readonly<{
  status: 'CREATED' | 'NO_OP' | 'BLOCKED' | 'FAILED' | 'UNVERIFIED';
  reason: string;
}>;

/** RED executable-boundary baseline: no SSH command is issued. */
export async function executePleskSubdomain(
  _input: PleskSubdomainInput,
  _approval: { allowWrite: boolean; consent: 'CREATE_SUBDOMAIN' | null },
  _deps: PleskCreateDependencies
): Promise<PleskCreationOutcome> {
  return { status: 'BLOCKED', reason: 'NOT_IMPLEMENTED' };
}
