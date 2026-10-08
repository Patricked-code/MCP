import { domainToASCII, domainToUnicode } from 'node:url';
import type { ServerId } from '../config/servers.js';
import type { DomainResolutionInput } from '../governedWorkflow/resolvers/domain.js';
import type { GitRegistryDomainEvidence } from '../github/registry.js';
import type { LiveStateSnapshot } from './types.js';

/**
 * F-04 (TB-W3-F-04), observe-binding: Live State inventories, read-only, the
 * names each managed server's Plesk actively serves and projects them as the
 * C5 domain observation (GW-09). Plesk's own records are read rather than its
 * directories: a suspended or disabled site keeps its files, and an alias has
 * none. Only active web hosting or forwarding and active web aliases count. A
 * failed, malformed or unbounded read stays unavailable and never becomes an
 * absence. A served name proves a binding on the server, never DNS nor a
 * certificate. Nothing is bound or changed.
 */
export const SERVED_DOMAINS_MAX = 1000;
// Plesk status 0 is active, for the domain and for its subscription (webspace);
// htype 'none' is a domain without web service. An alias is served only while its domain is.
export const SERVED_DOMAINS_COMMAND = "plesk db -Ne \"SELECT d.name FROM domains d WHERE d.status = 0 AND d.webspace_status = 0 AND d.htype <> 'none' UNION SELECT a.name FROM domain_aliases a JOIN domains d ON d.id = a.dom_id WHERE a.status = 0 AND a.web = 'true' AND d.status = 0 AND d.webspace_status = 0 AND d.htype <> 'none'\"";
export const SERVED_DOMAIN_SERVERS: readonly ServerId[] = ['s1', 's2'];

// Plesk keeps names in their ASCII (Punycode) form; a TLD may itself be Punycode.
const DOMAIN = /^(?=.{4,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+(?:[a-z]{2,63}|xn--[a-z0-9-]{1,59})$/;

/** A Punycode label must be real IDNA: it converts to Unicode and back unchanged. */
function validDomain(domain: string): boolean {
  if (!DOMAIN.test(domain)) return false;
  if (!domain.split('.').some((label) => label.startsWith('xn--'))) return true;
  const unicode = domainToUnicode(domain);
  return unicode !== '' && domainToASCII(unicode) === domain;
}

export type ServedDomainInventory = {
  status: 'CURRENT' | 'UNAVAILABLE';
  observedAt: string;
  domains: string[];
};

export type ServedDomainInventories = Partial<Record<ServerId, ServedDomainInventory>>;

export function unavailableServedDomainInventory(observedAt: string): ServedDomainInventory {
  return { status: 'UNAVAILABLE', observedAt, domains: [] };
}

/**
 * Every entry must be exactly a domain, checked before any normalization:
 * anything else (padding, an empty name, a truncation marker) is unavailable.
 * A wildcard subdomain (`*.<domain>`) is deliberately excluded: it configures a
 * wildcard, not one served name.
 */
export function parseServedDomainInventory(stdout: string, observedAt: string): ServedDomainInventory {
  if (typeof stdout !== 'string') return unavailableServedDomainInventory(observedAt);
  const entries = stdout === '' ? [] : stdout.split('\n');
  if (entries.length > 0 && entries[entries.length - 1] === '') entries.pop();
  if (entries.length > SERVED_DOMAINS_MAX) return unavailableServedDomainInventory(observedAt);
  const domains = new Set<string>();
  for (const entry of entries) {
    const wildcard = entry.startsWith('*.');
    const domain = (wildcard ? entry.slice(2) : entry).toLowerCase();
    if (!validDomain(domain)) return unavailableServedDomainInventory(observedAt);
    if (!wildcard) domains.add(domain);
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

/** One inventory per managed server; a server that fails stays unavailable alone. */
export async function collectServedDomainInventories(input: {
  runReadOnly: (serverId: ServerId, command: string) => Promise<{ code: number | null; stdout: string }>;
  now: () => Date;
}): Promise<ServedDomainInventories> {
  const entries = await Promise.all(SERVED_DOMAIN_SERVERS.map(async (serverId) => [
    serverId,
    await collectServedDomains({ runReadOnly: (command) => input.runReadOnly(serverId, command), now: input.now })
  ] as const));
  return Object.fromEntries(entries);
}

/** The C5 observation of one managed server, unscoped; null when Live State holds none for it. */
export function liveStateDomainObservation(
  snapshot: LiveStateSnapshot | null,
  serverId: string | null,
  now = new Date()
): DomainResolutionInput['observation'] | null {
  if (!snapshot || typeof serverId !== 'string') return null;
  const id = serverId.toLowerCase();
  if (!(SERVED_DOMAIN_SERVERS as readonly string[]).includes(id)) return null;
  const inventory = snapshot.servedDomains?.[id as ServerId];
  if (!inventory) return null;
  // Each server's inventory ages from its own read, not from the snapshot that carries it.
  const readAt = Date.parse(inventory.observedAt);
  if (!Number.isFinite(readAt)) return null;
  const observedAt = new Date(readAt).toISOString();
  if (inventory.status !== 'CURRENT') {
    return { available: false, freshness: 'UNKNOWN', observedAt, serverId: id, domains: [] };
  }
  const maxAgeSeconds = Number.isFinite(snapshot.maxAgeSeconds) ? snapshot.maxAgeSeconds : 60;
  const stale = (now.getTime() - readAt) / 1000 > maxAgeSeconds;
  const evidenceRef = `live_state:state_version:${Number.isSafeInteger(snapshot.stateVersion) ? snapshot.stateVersion : 'unknown'}:vhost`;
  return {
    available: true,
    freshness: stale ? 'STALE' : 'CURRENT',
    observedAt,
    serverId: id,
    domains: inventory.domains.slice(0, SERVED_DOMAINS_MAX).map((domain) => ({ domain, verified: true, evidenceRef }))
  };
}

function normalize(domain: string): string {
  return domain.trim().toLowerCase().replace(/\.$/, '');
}

/** The domains GitRegistry declares for one project on one server. */
export function declaredProjectDomains(
  registry: GitRegistryDomainEvidence,
  projectId: string,
  serverId: string
): Set<string> {
  const domains = new Set<string>();
  for (const project of registry.projects) {
    if (project.projectId !== projectId) continue;
    if (project.publicDomain) domains.add(normalize(project.publicDomain));
    if (project.publicApi) {
      try {
        domains.add(normalize(new URL(project.publicApi).hostname));
      } catch {
        // An invalid API URL declares nothing here; the resolver reports it.
      }
    }
  }
  for (const mapping of registry.mappings) {
    if (mapping.projectId === projectId && mapping.serverId.toLowerCase() === serverId.toLowerCase() && mapping.domain) {
      domains.add(normalize(mapping.domain));
    }
  }
  return domains;
}

/**
 * A shared server serves other projects' domains too: the observation the
 * resolver compares with one project's declarations is the part about that
 * project's declared domains, so another tenant never reads as undeclared.
 * The inventory carries no ownership, so a project that declares no domain
 * gets no observation: an absence there would be assumed, not observed.
 */
export function scopeDomainObservation(observation: unknown, declared: ReadonlySet<string>): unknown {
  const record = observation && typeof observation === 'object' && !Array.isArray(observation)
    ? observation as { domains?: unknown }
    : null;
  if (!record || !Array.isArray(record.domains)) return observation;
  if (declared.size === 0) return { ...record, available: false, freshness: 'UNKNOWN', domains: [] };
  return {
    ...record,
    domains: record.domains.filter((entry) => (
      entry && typeof entry === 'object' && typeof (entry as { domain?: unknown }).domain === 'string'
      && declared.has(normalize((entry as { domain: string }).domain))
    ))
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
