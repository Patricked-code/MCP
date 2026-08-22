import { collectLiveStateObservations } from './collect.js';
import { applyFreshness, reconcileLiveState } from './reconcile.js';
import { readLiveState, writeLiveState } from './store.js';
import type { LiveStateObservations, LiveStateSnapshot } from './types.js';
import { unavailableCurrentStateEvidence } from './collect.js';

const REPOSITORY = 'Patricked-code/MCP';
const MCP_ROOT = '/opt/apps/wealthtech-mcp-ssh-bridge';
const MCP_CONTAINER = 'wealthtech_mcp_ssh_bridge';
const REFRESH_INTERVAL_MS = 60_000;

type Schedule = (callback: () => void, milliseconds: number) => NodeJS.Timeout;

export type LiveStateEngineDependencies = {
  collect: () => Promise<LiveStateObservations>;
  read: () => Promise<LiveStateSnapshot | null>;
  write: (snapshot: LiveStateSnapshot) => Promise<void>;
  now?: () => Date;
  schedule?: Schedule;
};

export type LiveStateEngine = {
  reconcileNow: () => Promise<LiveStateSnapshot>;
  getCurrent: () => Promise<LiveStateSnapshot | null>;
  start: () => void;
};

function unavailableObservations(): LiveStateObservations {
  const inventory = unavailableCurrentStateEvidence('live_state_collection_failed');
  return {
    repository: REPOSITORY,
    github: {
      status: 'UNAVAILABLE',
      branch: 'main',
      head: null,
      error: 'live_state_collection_failed'
    },
    s1: {
      status: 'UNAVAILABLE',
      path: MCP_ROOT,
      branch: null,
      head: null,
      originMain: null,
      workingTreeClean: null,
      diffEmpty: null,
      fetchRemote: null,
      pushRemote: null,
      error: 'live_state_collection_failed'
    },
    runtime: {
      status: 'UNAVAILABLE',
      container: MCP_CONTAINER,
      containerStatus: null,
      health: null,
      imageId: null,
      revision: null,
      error: 'live_state_collection_failed'
    },
    documentation: {
      status: 'UNAVAILABLE',
      activeTask: null,
      declaredGithubSha: null,
      declaredS1Sha: null,
      drift: false,
      error: 'live_state_collection_failed'
    },
    capabilities: {
      status: 'UNAVAILABLE', catalogueVersion: 1, catalogueDigest: null,
      registeredToolCount: 0, readOnlyToolCount: 0, writeToolCount: 0, resourceCount: 0,
      tools: [], resources: [], generatedAt: new Date(0).toISOString(),
      contradictions: ['RUNTIME_CATALOG_UNAVAILABLE'], error: 'live_state_collection_failed'
    },
    governance: {
      status: 'UNAVAILABLE', digest: null, files: [], taskRegistry: null,
      contradictions: ['GOVERNANCE_EVIDENCE_UNAVAILABLE'], error: 'live_state_collection_failed'
    },
    auditBaseline: {
      status: 'UNAVAILABLE', evidenceHead: null, runtimeRevision: null,
      testSuiteDigest: null, sourceDigest: null, catalogueDigest: null, governanceDigest: null,
      valid: false, invalidReasons: ['LIVE_STATE_COLLECTION_FAILED'], error: 'live_state_collection_failed'
    },
    inventory
  };
}

export function createLiveStateEngine(dependencies: LiveStateEngineDependencies): LiveStateEngine {
  const now = dependencies.now ?? (() => new Date());
  const schedule = dependencies.schedule ?? ((callback, milliseconds) => setInterval(callback, milliseconds));
  let current: LiveStateSnapshot | null = null;
  let inFlight: Promise<LiveStateSnapshot> | null = null;
  let started = false;

  async function reconcileWork(): Promise<LiveStateSnapshot> {
    const previous = current ?? await dependencies.read();
    let observations: LiveStateObservations;

    try {
      observations = await dependencies.collect();
    } catch {
      observations = unavailableObservations();
    }

    const snapshot = reconcileLiveState(observations, previous, now());
    await dependencies.write(snapshot);
    current = snapshot;
    return snapshot;
  }

  function reconcileNow(): Promise<LiveStateSnapshot> {
    if (inFlight) return inFlight;
    inFlight = reconcileWork().finally(() => {
      inFlight = null;
    });
    return inFlight;
  }

  async function getCurrent(): Promise<LiveStateSnapshot | null> {
    if (!current) current = await dependencies.read();
    return current ? applyFreshness(current, now()) : null;
  }

  function start(): void {
    if (started) return;
    started = true;

    void reconcileNow().catch(() => undefined);
    const timer = schedule(() => {
      void reconcileNow().catch(() => undefined);
    }, REFRESH_INTERVAL_MS);
    timer.unref?.();
  }

  return { reconcileNow, getCurrent, start };
}

export const liveStateEngine = createLiveStateEngine({
  collect: collectLiveStateObservations,
  read: readLiveState,
  write: writeLiveState
});

export function startLiveStateEngine(): void {
  liveStateEngine.start();
}
