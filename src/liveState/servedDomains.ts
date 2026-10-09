import { domainToASCII, domainToUnicode } from 'node:url';
import type { ServerId } from '../config/servers.js';
import type { DomainResolutionInput } from '../governedWorkflow/resolvers/domain.js';
import type { GitRegistryServerBindingEvidence } from '../github/registry.js';
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
// Each name comes with its subscription's main domain, which names its /var/www/vhosts root.
// The result is capped one row over the bound, so an oversized inventory is detected, never streamed.
const SUBSCRIPTION = 'IF(d.webspace_id = 0, d.name, w.name)';
// A hosted row is served only with its active web service record bound to an IP address,
// joined as Plesk's own domain/IP inventory does; an inconsistent row is not.
const WEB_SERVICE = "SELECT 1 FROM DomainServices s JOIN IpAddressesCollections c ON c.ipCollectionId = s.ipCollectionId JOIN IP_Addresses i ON i.id = c.ipAddressId WHERE s.dom_id = d.id AND s.type = 'web' AND s.status = 0";
const ACTIVE = `d.status = 0 AND d.webspace_status = 0 AND d.htype <> 'none' AND EXISTS (${WEB_SERVICE})`;
const OWNER = 'LEFT JOIN domains w ON w.id = d.webspace_id';
export const SERVED_DOMAINS_COMMAND = `plesk db -Ne "SELECT name, subscription FROM (SELECT d.name AS name, ${SUBSCRIPTION} AS subscription FROM domains d ${OWNER} WHERE ${ACTIVE} UNION SELECT a.name, ${SUBSCRIPTION} FROM domain_aliases a JOIN domains d ON d.id = a.dom_id ${OWNER} WHERE a.status = 0 AND a.web = 'true' AND ${ACTIVE}) served LIMIT ${SERVED_DOMAINS_MAX + 1}"`;
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
  /** The main domain of the Plesk subscription serving each name. */
  subscriptions: Record<string, string>;
};

export type ServedDomainInventories = Partial<Record<ServerId, ServedDomainInventory>>;

export function unavailableServedDomainInventory(observedAt: string): ServedDomainInventory {
  return { status: 'UNAVAILABLE', observedAt, domains: [], subscriptions: {} };
}

/**
 * Every row must be exactly `<domain>\t<subscription main domain>`, checked before any
 * normalization: anything else (padding, an empty name, a truncation marker)
 * is unavailable. A wildcard subdomain (`*.<domain>`) is deliberately
 * excluded: it configures a wildcard, not one served name.
 */
export function parseServedDomainInventory(stdout: string, observedAt: string): ServedDomainInventory {
  if (typeof stdout !== 'string') return unavailableServedDomainInventory(observedAt);
  const rows = stdout === '' ? [] : stdout.split('\n');
  if (rows.length > 0 && rows[rows.length - 1] === '') rows.pop();
  if (rows.length > SERVED_DOMAINS_MAX) return unavailableServedDomainInventory(observedAt);
  const subscriptions = new Map<string, string>();
  for (const row of rows) {
    const columns = row.split('\t');
    if (columns.length !== 2 || !validDomain(columns[1]!)) return unavailableServedDomainInventory(observedAt);
    const entry = columns[0]!;
    const wildcard = entry.startsWith('*.');
    const domain = (wildcard ? entry.slice(2) : entry).toLowerCase();
    if (!validDomain(domain)) return unavailableServedDomainInventory(observedAt);
    if (wildcard) continue;
    const previous = subscriptions.get(domain);
    if (previous !== undefined && previous !== columns[1]) return unavailableServedDomainInventory(observedAt);
    subscriptions.set(domain, columns[1]!);
  }
  const domains = [...subscriptions.keys()].sort();
  return { status: 'CURRENT', observedAt, domains, subscriptions: Object.fromEntries(domains.map((domain) => [domain, subscriptions.get(domain)!])) };
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

const VHOSTS_ROOT = /^\/var\/www\/vhosts\/([^/]+)(?:\/|$)/;

/**
 * The Plesk subscriptions GitRegistry binds to one project on one server: a
 * verified `realPath` (`realPathVerified=true`) names its subscription root,
 * `/var/www/vhosts/<main domain>`. A declared `serverPath` alone is not
 * evidence, and neither is a name the project declares. A subscription bound
 * to more than one registry project cannot be split by this inventory, so it
 * is reported as shared and makes the observation unavailable.
 */
export function projectSubscriptions(
  bindings: readonly GitRegistryServerBindingEvidence[],
  projectId: string,
  serverId: string
): { owned: Set<string>; shared: boolean } {
  const owners = new Map<string, Set<string>>();
  for (const binding of bindings) {
    if (binding.serverId.toLowerCase() !== serverId.toLowerCase()) continue;
    if (binding.realPathVerified !== true || typeof binding.realPath !== 'string') continue;
    // A verified realPath still needs a canonical, unambiguous vhost boundary.
    // Do not infer ownership from paths containing traversal, empty segments or
    // URL-encoded separators; the registry may originate outside the server.
    const pathParts = binding.realPath.split('/');
    if (!binding.realPath.startsWith('/var/www/vhosts/')
      || pathParts.some((part, index) => index > 0 && (
        part === '.' || part === '..' || part.includes('\\') || /%(?:2e|2f|5c)/i.test(part)
        || (part === '' && index !== pathParts.length - 1)
      ))) continue;
    const root = VHOSTS_ROOT.exec(binding.realPath);
    const subscription = root?.[1]?.toLowerCase();
    if (!subscription || !validDomain(subscription)) continue;
    const projects = owners.get(subscription) ?? new Set<string>();
    projects.add(binding.projectId);
    owners.set(subscription, projects);
  }
  const owned = new Set<string>();
  let shared = false;
  for (const [subscription, projects] of owners) {
    if (!projects.has(projectId)) continue;
    owned.add(subscription);
    if (projects.size > 1) shared = true;
  }
  return { owned, shared };
}

/**
 * A shared server serves other projects too. The observation the resolver
 * compares with one project's declarations is every active name of the Plesk
 * subscriptions GitRegistry binds to that project: another subscription never
 * reads as undeclared, while an undeclared name of the project's own
 * subscription still does. Without such a binding, with a subscription
 * shared by several projects, or for a name without a subscription,
 * ownership is unknown and nothing is observed.
 */
export function scopeDomainObservation(
  observation: DomainResolutionInput['observation'] | null,
  inventory: ServedDomainInventory | undefined,
  ownership: { owned: ReadonlySet<string>; shared: boolean }
): DomainResolutionInput['observation'] | null {
  if (!observation || !observation.available) return observation;
  const unavailable = { ...observation, available: false, freshness: 'UNKNOWN' as const, domains: [] };
  const { owned } = ownership;
  if (!inventory || owned.size === 0 || ownership.shared) return unavailable;
  const domains = [];
  for (const entry of observation.domains) {
    const subscription = inventory.subscriptions[entry.domain];
    if (subscription === undefined) return unavailable;
    if (owned.has(subscription)) domains.push(entry);
  }
  return { ...observation, domains };
}

/** The current Live State domain observation, read without a new collection. */
export async function readLiveStateDomainObservation(
  serverId: string | null,
  now: () => Date = () => new Date()
): Promise<DomainResolutionInput['observation'] | null> {
  const { liveStateEngine } = await import('./engine.js');
  return liveStateDomainObservation(await liveStateEngine.getCurrent(), serverId, now());
}

/** The current Live State domain observation of one project's subscriptions. */
export async function readLiveStateProjectDomainObservation(
  serverId: string | null,
  ownership: { owned: ReadonlySet<string>; shared: boolean },
  now: () => Date = () => new Date()
): Promise<DomainResolutionInput['observation'] | null> {
  const { liveStateEngine } = await import('./engine.js');
  const snapshot = await liveStateEngine.getCurrent();
  const observation = liveStateDomainObservation(snapshot, serverId, now());
  const inventory = serverId ? snapshot?.servedDomains?.[serverId.toLowerCase() as ServerId] : undefined;
  return scopeDomainObservation(observation, inventory, ownership);
}
