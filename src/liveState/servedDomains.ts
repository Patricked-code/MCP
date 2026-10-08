import type { DomainResolutionInput } from '../governedWorkflow/resolvers/domain.js';
import { applyFreshness } from './reconcile.js';
import { LIVE_STATE_SERVER_ID } from './runtimeObservation.js';
import type { LiveStateSnapshot } from './types.js';

/**
 * F-04 (TB-W3-F-04), observe-binding: Live State inventories, read-only, the
 * Plesk vhosts the server it observes serves, and projects them as the C5
 * domain observation (GW-09). A vhost directory proves a binding exists on the
 * server, never DNS nor a certificate. A failed, malformed or unbounded read
 * stays unavailable and never becomes an absence. Nothing is bound or changed.
 */
export const SERVED_DOMAINS_MAX = 1000;
export const SERVED_DOMAINS_COMMAND = `find /var/www/vhosts -mindepth 1 -maxdepth 1 -type d -printf '%f\\n' 2>/dev/null | LC_ALL=C sort | head -n ${SERVED_DOMAINS_MAX + 1}`;

// A host name with at least two labels; Plesk system entries (system, default, chroot, fs, .skel) never match.
const DOMAIN = /^(?=.{4,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;

export type ServedDomainInventory = {
  status: 'CURRENT' | 'UNAVAILABLE';
  observedAt: string;
  domains: string[];
};

export function unavailableServedDomainInventory(observedAt: string): ServedDomainInventory {
  return { status: 'UNAVAILABLE', observedAt, domains: [] };
}

export function parseServedDomainInventory(stdout: string, observedAt: string): ServedDomainInventory {
  if (typeof stdout !== 'string') return unavailableServedDomainInventory(observedAt);
  const entries = stdout.split('\n').map((line) => line.trim()).filter(Boolean);
  if (entries.length > SERVED_DOMAINS_MAX) return unavailableServedDomainInventory(observedAt);
  const domains = new Set<string>();
  for (const entry of entries) {
    const domain = entry.toLowerCase();
    if (DOMAIN.test(domain)) domains.add(domain);
  }
  return { status: 'CURRENT', observedAt, domains: [...domains].sort() };
}

export async function collectServedDomains(input: {
  runReadOnly: (command: string) => Promise<{ code: number | null; stdout: string }>;
  now: () => Date;
}): Promise<ServedDomainInventory> {
  const observedAt = input.now().toISOString();
  try {
    const result = await input.runReadOnly(SERVED_DOMAINS_COMMAND);
    if (result.code !== 0) return unavailableServedDomainInventory(observedAt);
    return parseServedDomainInventory(result.stdout, observedAt);
  } catch {
    return unavailableServedDomainInventory(observedAt);
  }
}

/** The C5 observation of the server Live State observes; null for any other server. */
export function liveStateDomainObservation(
  snapshot: LiveStateSnapshot | null,
  serverId: string | null,
  now = new Date()
): DomainResolutionInput['observation'] | null {
  const inventory = snapshot?.servedDomains;
  if (!snapshot || !inventory || typeof serverId !== 'string') return null;
  if (serverId.toLowerCase() !== LIVE_STATE_SERVER_ID) return null;
  const reconciledAt = Date.parse(snapshot.lastReconciledAt);
  if (!Number.isFinite(reconciledAt)) return null;
  const observedAt = new Date(reconciledAt).toISOString();
  if (inventory.status !== 'CURRENT') {
    return { available: false, freshness: 'UNKNOWN', observedAt, serverId: LIVE_STATE_SERVER_ID, domains: [] };
  }
  const evidenceRef = `live_state:state_version:${Number.isSafeInteger(snapshot.stateVersion) ? snapshot.stateVersion : 'unknown'}:vhost`;
  return {
    available: true,
    freshness: applyFreshness(snapshot, now).freshness === 'STALE' ? 'STALE' : 'CURRENT',
    observedAt,
    serverId: LIVE_STATE_SERVER_ID,
    domains: inventory.domains.slice(0, SERVED_DOMAINS_MAX).map((domain) => ({ domain, verified: true, evidenceRef }))
  };
}

/** The current Live State domain observation, read without a new collection. */
export async function readLiveStateDomainObservation(
  serverId: string | null,
  now: () => Date = () => new Date()
): Promise<DomainResolutionInput['observation'] | null> {
  const { liveStateEngine } = await import('./engine.js');
  return liveStateDomainObservation(await liveStateEngine.getCurrent(), serverId, now());
}
