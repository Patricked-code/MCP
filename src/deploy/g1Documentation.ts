import type { LiveStateSnapshot } from '../liveState/types.js';

export const G1_REPOSITORY = 'Patricked-code/MCP';
export const G1_MANIFEST = 'PRODUCTION_STATE.json';
const SHA = /^[0-9a-f]{40}$/;
const IMAGE = /^sha256:[0-9a-f]{64}$/;
export type G1Drift = {
  status: 'DRIFT'; sha: string; observedAt: string; stateVersion: number; imageId: string;
  declaredGithubSha: string; declaredS1Sha: string;
};
export type G1Evidence = G1Drift | { status: 'ALIGNED' | 'UNVERIFIED' };

export function projectG1Evidence(state: LiveStateSnapshot, sha: string, now = Date.now()): G1Evidence {
  const age = now - Date.parse(state.generatedAt);
  if (!SHA.test(sha) || state.repository !== G1_REPOSITORY || state.schemaVersion !== 1
    || state.freshness !== 'CURRENT' || !Number.isFinite(age) || age < 0 || age > 60_000
    || ![state.github, state.s1, state.runtime, state.documentation].every((source) => source.status === 'CURRENT')
    || state.github.branch !== 'main' || state.s1.branch !== 'main'
    || ![state.github.head, state.s1.head, state.s1.originMain, state.runtime.revision].every((head) => head === sha)
    || state.s1.workingTreeClean !== true || state.s1.diffEmpty !== true
    || state.runtime.containerStatus !== 'running' || state.runtime.health !== 'healthy'
    || state.alignment.githubVsS1 !== 'ALIGNED' || state.alignment.runtime !== 'ALIGNED') return { status: 'UNVERIFIED' };
  if (state.alignment.global === 'FULLY_ALIGNED' && state.alignment.documentation === 'ALIGNED'
    && !state.documentation.drift && !state.contradictions.length) return { status: 'ALIGNED' };
  const { declaredGithubSha, declaredS1Sha } = state.documentation;
  if (state.alignment.global !== 'RECONCILIATION_REQUIRED' || state.alignment.documentation !== 'DOCUMENTATION_DRIFT'
    || state.nextAction !== 'reconcile_canonical_documentation' || state.documentation.drift !== true
    || state.contradictions.length !== 1 || state.contradictions[0] !== 'DOCUMENTATION_DRIFT'
    || !declaredGithubSha || !SHA.test(declaredGithubSha) || !declaredS1Sha || !SHA.test(declaredS1Sha)
    || !state.runtime.imageId || !IMAGE.test(state.runtime.imageId)
    || !Number.isSafeInteger(state.stateVersion) || state.stateVersion < 1) return { status: 'UNVERIFIED' };
  return { status: 'DRIFT', sha, observedAt: state.generatedAt, stateVersion: state.stateVersion,
    imageId: state.runtime.imageId, declaredGithubSha, declaredS1Sha };
}

export function prepareG1Candidate(raw: string, evidence: G1Drift, expectedSha: string, now = Date.now()): string {
  const age = now - Date.parse(evidence.observedAt);
  if (evidence.status !== 'DRIFT' || !SHA.test(expectedSha) || evidence.sha !== expectedSha
    || !IMAGE.test(evidence.imageId) || !Number.isFinite(age) || age < -5_000 || age > 60_000
    || !Number.isSafeInteger(evidence.stateVersion) || evidence.stateVersion < 1) throw new Error('g1_invalid_evidence');
  const manifest = JSON.parse(raw);
  if (manifest.repository !== G1_REPOSITORY || manifest.branch !== 'main'
    || manifest.githubCommitFull !== evidence.declaredGithubSha
    || manifest.serverGitState?.lastDirectlyVerifiedCommitFull !== evidence.declaredS1Sha) {
    throw new Error('g1_manifest_baseline_mismatch');
  }
  // Do not treat requires_revalidation as drift that can be cleared by changing a SHA.
  const github = evidence.declaredGithubSha, s1 = evidence.declaredS1Sha;
  if (!SHA.test(github) || !SHA.test(s1) || github === expectedSha || github !== s1
    || manifest.githubState?.currentMainCommit !== github || manifest.serverCommitFull !== s1
    || manifest.serverGitState?.originMain !== s1 || manifest.runtimeState?.currentRuntimeRevision !== s1
    || manifest.serverStateFreshness === 'requires_revalidation'
    || manifest.runtimeStateFreshness === 'requires_revalidation') throw new Error('g1_manifest_baseline_not_simple_sha_drift');
  const stamp = new Date(evidence.observedAt).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  const basis = `G1_GOVERNED_DEPLOY_EXACT_SHA_LIVESTATE_V${evidence.stateVersion}_${stamp}`;
  const fields: Array<[unknown, string, string]> = [
    [manifest, 'githubObservedAt', evidence.observedAt],
    [manifest, 'githubObservationBasis', basis],
    [manifest, 'serverStateFreshness', 'current_exact_sha_readonly_attested_' + stamp],
    [manifest, 'runtimeStateFreshness', 'current_exact_sha_runtime_observed_' + stamp],
    [manifest, 'githubCommitFull', expectedSha],
    [manifest.githubState, 'currentMainCommit', expectedSha],
    [manifest.serverGitState, 'lastDirectlyVerifiedCommitAbbrev', expectedSha.slice(0, 7)],
    [manifest.serverGitState, 'lastDirectlyVerifiedCommitFull', expectedSha],
    [manifest.serverGitState, 'originMain', expectedSha],
    [manifest.serverGitState, 'lastDirectlyVerifiedAt', evidence.observedAt],
    [manifest.serverGitState, 'originMainObservationBasis', basis],
    [manifest.runtimeState, 'imageId', evidence.imageId],
    [manifest.runtimeState, 'currentRuntimeRevision', expectedSha],
    [manifest.runtimeState, 'imageIdFreshness', 'current_live_state_observed_' + stamp],
    [manifest, 'serverCommitFull', expectedSha]
  ];
  if (raw !== JSON.stringify(manifest, null, 2) + '\n') throw new Error('g1_manifest_format_not_canonical');
  for (const [obj, field, value] of fields) {
    const record = obj as Record<string, unknown> | undefined;
    if (!record || typeof record[field] !== 'string') throw new Error('g1_manifest_field_missing');
    record[field] = value;
  }
  return JSON.stringify(manifest, null, 2) + '\n';
}
