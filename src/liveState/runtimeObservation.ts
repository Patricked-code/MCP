import type { ServerRuntimeObservation } from '../github/runtimeResolution.js';
import { provisionedRuntimeObservations } from '../provisioning/projectRuntime.js';
import { applyFreshness } from './reconcile.js';
import type { LiveStateSnapshot } from './types.js';

/**
 * C4 (TB-W3-C4-01): Live State observes the MCP's own runtime on the managed
 * server it reads. This adapter projects that observation, unchanged, as one
 * bounded server runtime observation for the GW-08 composition: the
 * observation stays the runtime truth (OD-04), its freshness is Live State's
 * and nothing is collected, restarted or stored here.
 */
export const LIVE_STATE_SERVER_ID = 's1';

const REPOSITORY_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_.-]{0,99}\/[A-Za-z0-9_.-]{1,100}$/;
const CONTAINER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_.-]{0,127}$/;
const SHA_PATTERN = /^[0-9a-f]{40}$/i;

export function liveStateRuntimeObservation(
  snapshot: LiveStateSnapshot | null,
  now = new Date()
): ServerRuntimeObservation | null {
  const runtime = snapshot?.runtime;
  if (!snapshot || !runtime) return null;
  if (typeof snapshot.repository !== 'string' || !REPOSITORY_PATTERN.test(snapshot.repository)) return null;
  if (typeof runtime.container !== 'string' || !CONTAINER_PATTERN.test(runtime.container)) return null;
  const reconciledAt = Date.parse(snapshot.lastReconciledAt);
  if (!Number.isFinite(reconciledAt)) return null;

  const stale = runtime.status === 'STALE' || applyFreshness(snapshot, now).freshness === 'STALE';
  const status = runtime.status === 'UNAVAILABLE' ? 'UNAVAILABLE' : stale ? 'STALE' : 'CURRENT';
  // A snapshot older than the compose-label parser has not observed the kind.
  if (runtime.composeProject === undefined && status !== 'UNAVAILABLE') return null;
  return {
    status,
    observedAt: new Date(reconciledAt).toISOString(),
    freshness: status === 'UNAVAILABLE' ? 'UNKNOWN' : status,
    serverId: LIVE_STATE_SERVER_ID,
    repositoryId: `github:${snapshot.repository}`,
    // Live State observes a Docker container; its compose label refines the kind.
    runtimeKind: runtime.composeProject ? 'DOCKER_COMPOSE' : 'DOCKER',
    runtimeId: runtime.container,
    revision: typeof runtime.revision === 'string' && SHA_PATTERN.test(runtime.revision) ? runtime.revision : null,
    evidenceRef: `live_state:state_version:${Number.isSafeInteger(snapshot.stateVersion) ? snapshot.stateVersion : 'unknown'}`,
    provenance: 'live_state_runtime_observation'
  };
}

/**
 * F.2 (TB-W3-F-03): the MCP's own runtime observation, then the provisioned
 * runtimes of the configured target, with the snapshot's freshness. A
 * provisioned absence is never claimed for the repository Live State observes.
 */
export function liveStateRuntimeObservations(
  snapshot: LiveStateSnapshot | null,
  now = new Date()
): ServerRuntimeObservation[] {
  const own = liveStateRuntimeObservation(snapshot, now);
  const inventory = snapshot?.provisionedRuntimes;
  if (!snapshot || !inventory) return own ? [own] : [];
  const freshness = applyFreshness(snapshot, now).freshness === 'STALE' ? 'STALE' : 'CURRENT';
  const evidenceRef = `live_state:state_version:${Number.isSafeInteger(snapshot.stateVersion) ? snapshot.stateVersion : 'unknown'}`;
  const ownRepository = own?.repositoryId.toLowerCase();
  const provisioned = provisionedRuntimeObservations(inventory, freshness, evidenceRef)
    .filter((observation) => observation.repositoryId.toLowerCase() !== ownRepository);
  return [...(own ? [own] : []), ...provisioned];
}

/** The current Live State runtime observations, read without a new collection. */
export async function readLiveStateRuntimeObservations(
  now: () => Date = () => new Date()
): Promise<ServerRuntimeObservation[]> {
  const { liveStateEngine } = await import('./engine.js');
  return liveStateRuntimeObservations(await liveStateEngine.getCurrent(), now());
}
