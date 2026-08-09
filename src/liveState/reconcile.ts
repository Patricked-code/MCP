import type {
  LiveStateAlignment,
  LiveStateObservations,
  LiveStateSnapshot
} from './types.js';

const MAX_AGE_SECONDS = 60 as const;

function semanticValue(state: LiveStateSnapshot): string {
  return JSON.stringify({
    repository: state.repository,
    github: state.github,
    s1: state.s1,
    runtime: state.runtime,
    documentation: state.documentation,
    alignment: state.alignment,
    contradictions: state.contradictions,
    nextAction: state.nextAction
  });
}

function buildAlignment(input: LiveStateObservations): {
  alignment: LiveStateAlignment;
  contradictions: string[];
  nextAction: string | null;
} {
  const contradictions: string[] = [];
  const unavailable = [input.github.status, input.s1.status, input.runtime.status, input.documentation.status]
    .some((status) => status === 'UNAVAILABLE' || status === 'STALE');

  const githubVsS1 = input.github.head && input.s1.head
    ? input.github.head === input.s1.head ? 'ALIGNED' : 'DRIFTED'
    : 'UNVERIFIED';

  let runtime: LiveStateAlignment['runtime'] = 'RUNTIME_UNVERIFIED';
  if (input.runtime.revision && input.github.head) {
    runtime = input.runtime.revision === input.github.head ? 'ALIGNED' : 'DRIFTED';
  }

  const documentation = input.documentation.drift ? 'DOCUMENTATION_DRIFT' : 'ALIGNED';

  if (input.s1.workingTreeClean === false) contradictions.push('S1_WORKTREE_DIRTY');
  if (input.s1.diffEmpty === false) contradictions.push('S1_DIFF_NOT_EMPTY');
  if (documentation === 'DOCUMENTATION_DRIFT') contradictions.push('DOCUMENTATION_DRIFT');
  if (githubVsS1 === 'DRIFTED') contradictions.push('GITHUB_S1_DRIFT');
  if (runtime === 'DRIFTED') contradictions.push('RUNTIME_DRIFT');
  if (runtime === 'RUNTIME_UNVERIFIED') contradictions.push('RUNTIME_REVISION_UNVERIFIED');

  let global: LiveStateAlignment['global'];
  let nextAction: string | null;

  if (unavailable || input.runtime.containerStatus !== 'running' || input.runtime.health === 'unhealthy') {
    global = 'DEGRADED';
    nextAction = 'restore_live_state_sources_or_runtime_health';
  } else if (input.s1.workingTreeClean === false || input.s1.diffEmpty === false) {
    global = 'RECONCILIATION_REQUIRED';
    nextAction = 'reconcile_s1_working_tree_before_mutation';
  } else if (githubVsS1 === 'DRIFTED') {
    global = 'DEPLOYMENT_PENDING';
    nextAction = 'governed_sync_github_main_to_s1';
  } else if (runtime === 'DRIFTED') {
    global = 'RUNTIME_DEPLOYMENT_PENDING';
    nextAction = 'rebuild_runtime_from_current_s1_head';
  } else if (documentation === 'DOCUMENTATION_DRIFT') {
    global = 'RECONCILIATION_REQUIRED';
    nextAction = 'reconcile_canonical_documentation';
  } else if (runtime === 'RUNTIME_UNVERIFIED' || githubVsS1 === 'UNVERIFIED') {
    global = 'PARTIALLY_ALIGNED';
    nextAction = runtime === 'RUNTIME_UNVERIFIED'
      ? 'attest_runtime_revision'
      : 'refresh_unverified_git_alignment';
  } else {
    global = 'FULLY_ALIGNED';
    nextAction = null;
  }

  return {
    alignment: { githubVsS1, runtime, documentation, global },
    contradictions,
    nextAction
  };
}

export function reconcileLiveState(
  observations: LiveStateObservations,
  previous: LiveStateSnapshot | null,
  now = new Date()
): LiveStateSnapshot {
  const at = now.toISOString();
  const verdict = buildAlignment(observations);
  const candidate: LiveStateSnapshot = {
    schemaVersion: 1,
    stateVersion: previous?.stateVersion ?? 1,
    generatedAt: at,
    lastReconciledAt: at,
    maxAgeSeconds: MAX_AGE_SECONDS,
    freshness: 'CURRENT',
    ageSeconds: 0,
    ...observations,
    ...verdict
  };

  if (previous && semanticValue(previous) !== semanticValue(candidate)) {
    candidate.stateVersion = previous.stateVersion + 1;
  }

  return candidate;
}

export function applyFreshness(state: LiveStateSnapshot, now = new Date()): LiveStateSnapshot {
  const reconciledAt = Date.parse(state.lastReconciledAt);
  const ageSeconds = Number.isFinite(reconciledAt)
    ? Math.max(0, Math.floor((now.getTime() - reconciledAt) / 1000))
    : state.maxAgeSeconds + 1;

  return {
    ...state,
    ageSeconds,
    freshness: ageSeconds > state.maxAgeSeconds ? 'STALE' : 'CURRENT'
  };
}
