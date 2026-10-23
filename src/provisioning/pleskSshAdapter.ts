import type { PleskSubdomainInput, PleskSubdomainEvidence, PleskServerId } from './pleskSite.js';
import type { PleskCreationOutcome } from './pleskExecute.js';

export type PleskRemoteResult = Readonly<{ code: number | null; stdout: string; stderr?: string }>;
export type PleskRemotePort = Readonly<{
  readonly: (server: PleskServerId, command: string) => Promise<PleskRemoteResult>;
  guarded: (server: PleskServerId, command: string) => Promise<PleskRemoteResult>;
}>;
export type PleskPolicy = Readonly<{ enabled: boolean; allowedParents: Readonly<Partial<Record<PleskServerId, readonly string[]>>> }>;
export async function observePleskSubdomain(_input: PleskSubdomainInput, _policy: PleskPolicy, _io: PleskRemotePort): Promise<PleskSubdomainEvidence> {
  return { parentExists: null, targetExists: null, documentRootExists: null, subscriptionAuthorized: null, documentRootSafe: null, targetOwnedByProvisioner: null };
}
export async function createPleskSubdomainOnServer(_input: PleskSubdomainInput, _policy: PleskPolicy, _approved: boolean, _io: PleskRemotePort): Promise<PleskCreationOutcome> {
  return { status: 'BLOCKED', reason: 'NOT_IMPLEMENTED' };
}
