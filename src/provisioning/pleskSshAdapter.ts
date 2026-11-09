import { executePleskSubdomain } from './pleskExecute.js';
import { planPleskSubdomain } from './pleskSite.js';
import type { PleskSubdomainInput, PleskSubdomainEvidence, PleskServerId } from './pleskSite.js';
import type { PleskCreationOutcome } from './pleskExecute.js';

/** Controlled transport contract; the production adapter uses existing ssh/client.ts. */
export type PleskRemoteResult = Readonly<{ code: number | null; stdout: string; stderr?: string }>;
export type PleskRemotePort = Readonly<{
  readonly: (server: PleskServerId, command: string) => Promise<PleskRemoteResult>;
  guarded: (server: PleskServerId, command: string) => Promise<PleskRemoteResult>;
}>;
export type PleskPolicy = Readonly<{
  enabled: boolean;
  allowedParents: Readonly<Partial<Record<PleskServerId, readonly string[]>>>;
}>;

function quote(s: string): string {
  return "'" + s.replaceAll("'", "'\\''") + "'";
}

const emptyEvidence = (authorized: boolean): PleskSubdomainEvidence => ({
  parentExists: null,
  targetExists: null,
  documentRootExists: null,
  subscriptionAuthorized: authorized,
  documentRootSafe: null,
  targetOwnedByProvisioner: false
});
const safeSegment = /^[a-z0-9][a-z0-9_-]*$/;
function isAuthorized(input: PleskSubdomainInput, policy: PleskPolicy): boolean {
  return policy.enabled === true
    && (input.serverId === 's1' || input.serverId === 's2')
    && policy.allowedParents[input.serverId]?.includes(input.parentDomain) === true;
}
function verifiedTarget(input: PleskSubdomainInput): boolean {
  // Pure planner validates exact names, path segments, domain and server.
  const syntheticEvidence: PleskSubdomainEvidence = {
    parentExists: true,
    targetExists: false,
    documentRootExists: false,
    subscriptionAuthorized: true,
    documentRootSafe: true,
    targetOwnedByProvisioner: false
  };
  return planPleskSubdomain({ ...input, evidence: syntheticEvidence }).decision === 'READY'
    && input.documentRoot === '/' + input.label
    && input.documentRoot.split('/').slice(1).every((s) => safeSegment.test(s));
}
function absenceReported(result: PleskRemoteResult): boolean {
  return result.code !== 0 && /(?:specified\s+)?subdomain[^\n]{0,200}(?:does not exist|not found)/i.test(
    (result.stderr ?? '') + '\n' + result.stdout
  );
}
async function read(io: PleskRemotePort, server: PleskServerId, command: string): Promise<PleskRemoteResult> {
  return io.readonly(server, command);
}

/**
 * Fresh Plesk subscription + subdomain information, and physical-path probes.
 * Unknown CLI errors are not interpreted as absence. Symlinks fail closed.
 * Only explicit parent-domain allowlists permit even a read probe.
 */
export async function observePleskSubdomain(
  input: PleskSubdomainInput,
  policy: PleskPolicy,
  io: PleskRemotePort
): Promise<PleskSubdomainEvidence> {
  if (!isAuthorized(input, policy) || !verifiedTarget(input)) {
    return emptyEvidence(false);
  }
  const server = input.serverId;
  const root = '/var/www/vhosts/' + input.parentDomain;
  const sitePath = root + input.documentRoot;
  try {
    const subscription = await read(io, server, 'plesk bin subscription --info ' + quote(input.parentDomain));
    // A failed or unauthorized provider call is NOT proof of subscription rights.
    if (subscription.code !== 0) return emptyEvidence(false);

    const subdomain = await read(io, server, 'plesk bin subdomain --info ' + quote(input.label + '.' + input.parentDomain));
    const targetExists = subdomain.code === 0 ? true : absenceReported(subdomain) ? false : null;
    if (targetExists === null) {
      return { ...emptyEvidence(true), parentExists: true };
    }

    const parentDirectory = await read(io, server, 'test -d ' + quote(root));
    const parentSymlink = await read(io, server, 'test -L ' + quote(root));
    const targetSymlink = await read(io, server, 'test -L ' + quote(sitePath));
    const pathExists = await read(io, server, 'test -e ' + quote(sitePath));
    const documentRootSafe = parentDirectory.code === 0
      && parentSymlink.code === 1
      && targetSymlink.code === 1;

    return {
      parentExists: true,
      subscriptionAuthorized: true,
      targetExists,
      documentRootExists: pathExists.code === 0 ? true : pathExists.code === 1 ? false : null,
      documentRootSafe,
      // Ownership requires an independently verified GitRegistry mapping, not CLI presence.
      targetOwnedByProvisioner: false
    };
  } catch {
    return emptyEvidence(false);
  }
}

async function verifyCreated(input: PleskSubdomainInput, io: PleskRemotePort): Promise<boolean> {
  const sitePath = '/var/www/vhosts/' + input.parentDomain + input.documentRoot;
  try {
    const info = await read(io, input.serverId, 'plesk bin subdomain --info ' + quote(input.label + '.' + input.parentDomain));
    const directory = await read(io, input.serverId, 'test -d ' + quote(sitePath));
    const link = await read(io, input.serverId, 'test -L ' + quote(sitePath));
    return info.code === 0 && directory.code === 0 && link.code === 1;
  } catch {
    return false;
  }
}

/** A bounded, consented write; NEVER a general-purpose SSH command executor. */
export async function createPleskSubdomainOnServer(
  input: PleskSubdomainInput,
  policy: PleskPolicy,
  approved: boolean,
  io: PleskRemotePort
): Promise<PleskCreationOutcome> {
  if (!approved || !isAuthorized(input, policy) || !verifiedTarget(input)) {
    return { status: 'BLOCKED', reason: 'TARGET_OR_WRITE_NOT_AUTHORIZED' };
  }

  return executePleskSubdomain(input, { allowWrite: true, consent: 'CREATE_SUBDOMAIN' }, {
    observe: async (target) => observePleskSubdomain(target, policy, io),
    create: async (server, argv) => {
      // This fixed structure is never selected by a caller or a GitHub repository.
      const command = 'plesk bin subdomain --create ' + quote(argv[4]!)
        + ' -domain ' + quote(argv[6]!)
        + ' -www-root ' + quote(argv[8]!);
      const result = await io.guarded(server, command);
      return { exitCode: result.code ?? -1 };
    },
    verify: async (target) => verifyCreated(target, io)
  });
}
