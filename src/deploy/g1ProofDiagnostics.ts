/**
 * G1 proof diagnostics — bounded reasons for UNVERIFIED after a deployment.
 * Never changes projectG1Evidence's classification, releases, permissions,
 * task ownership, documentation authority or deployment gate.
 *
 * The existing G1 evidence remains authoritative. Diagnostics only explain
 * why it could not be established from a fresh Live State observation.
 */
import type { LiveStateSnapshot } from '../liveState/types.js';

const SHA = /^[0-9a-f]{40}$/;
const IMAGE = /^sha256:[0-9a-f]{64}$/;
export const G1_UNVERIFIED_REASONS = [
  'G1_INVALID_EXPECTED_SHA',
  'G1_REPOSITORY_UNVERIFIED',
  'G1_LIVESTATE_FRESHNESS_UNVERIFIED',
  'G1_LIVE_SOURCE_UNAVAILABLE',
  'G1_BRANCH_SCOPE_UNVERIFIED',
  'G1_EXACT_SHA_NOT_ALIGNED',
  'G1_S1_WORKTREE_UNVERIFIED',
  'G1_RUNTIME_HEALTH_UNVERIFIED',
  'G1_ALIGNMENT_UNVERIFIED',
  'G1_DOCUMENTATION_CONTRADICTIONS',
  'G1_DOCUMENTATION_BASELINE_UNVERIFIED',
  'G1_RUNTIME_IMAGE_UNVERIFIED',
  'G1_LIVESTATE_VERSION_UNVERIFIED'
] as const;
export type G1UnverifiedReason = typeof G1_UNVERIFIED_REASONS[number];

/** Used only after G1 returned UNVERIFIED, never as an alternative verdict. */
export function diagnoseG1Unverified(
  state: LiveStateSnapshot, expectedSha: string, now = Date.now()
): readonly G1UnverifiedReason[] {
  const reasons: G1UnverifiedReason[] = [];
  const note = (reason: G1UnverifiedReason) => {
    if (!reasons.includes(reason)) reasons.push(reason);
  };
  if (!SHA.test(expectedSha)) note('G1_INVALID_EXPECTED_SHA');
  if (state.repository !== 'Patricked-code/MCP' || state.schemaVersion !== 1) {
    note('G1_REPOSITORY_UNVERIFIED');
  }
  const age = now - Date.parse(state.generatedAt);
  if (state.freshness !== 'CURRENT' || !Number.isFinite(age) || age < 0 || age > 60_000) {
    note('G1_LIVESTATE_FRESHNESS_UNVERIFIED');
  }
  if (![state.github, state.s1, state.runtime, state.documentation].every(x => x?.status === 'CURRENT')) {
    note('G1_LIVE_SOURCE_UNAVAILABLE');
  }
  if (state.github.branch !== 'main' || state.s1.branch !== 'main') {
    note('G1_BRANCH_SCOPE_UNVERIFIED');
  }
  if (![state.github.head, state.s1.head, state.s1.originMain, state.runtime.revision]
    .every(x => x === expectedSha)) note('G1_EXACT_SHA_NOT_ALIGNED');
  if (state.s1.workingTreeClean !== true || state.s1.diffEmpty !== true) {
    note('G1_S1_WORKTREE_UNVERIFIED');
  }
  if (state.runtime.containerStatus !== 'running' || state.runtime.health !== 'healthy') {
    note('G1_RUNTIME_HEALTH_UNVERIFIED');
  }
  if (state.alignment.githubVsS1 !== 'ALIGNED' || state.alignment.runtime !== 'ALIGNED') {
    note('G1_ALIGNMENT_UNVERIFIED');
  }
  const isAligned = state.alignment.global === 'FULLY_ALIGNED'
    && state.alignment.documentation === 'ALIGNED'
    && state.documentation.drift === false
    && state.contradictions.length === 0;
  const isDocumentDrift = state.alignment.global === 'RECONCILIATION_REQUIRED'
    && state.alignment.documentation === 'DOCUMENTATION_DRIFT'
    && state.nextAction === 'reconcile_canonical_documentation'
    && state.documentation.drift === true
    && state.contradictions.length === 1
    && state.contradictions[0] === 'DOCUMENTATION_DRIFT';

  if (!isAligned && !isDocumentDrift) note('G1_DOCUMENTATION_CONTRADICTIONS');
  if (isDocumentDrift) {
    if (!state.documentation.declaredGithubSha || !SHA.test(state.documentation.declaredGithubSha)
      || !state.documentation.declaredS1Sha || !SHA.test(state.documentation.declaredS1Sha)) {
      note('G1_DOCUMENTATION_BASELINE_UNVERIFIED');
    }
    if (!state.runtime.imageId || !IMAGE.test(state.runtime.imageId)) {
      note('G1_RUNTIME_IMAGE_UNVERIFIED');
    }
    if (!Number.isSafeInteger(state.stateVersion) || state.stateVersion < 1) {
      note('G1_LIVESTATE_VERSION_UNVERIFIED');
    }
  }
  // Defensive fail-closed reason: no unverified result should be unexplained.
  if (reasons.length === 0) note('G1_ALIGNMENT_UNVERIFIED');
  return Object.freeze(reasons);
}
