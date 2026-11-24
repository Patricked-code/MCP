import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { projectG1Evidence, prepareG1Candidate } from '../src/deploy/g1Documentation.js';
import type { LiveStateSnapshot } from '../src/liveState/types.js';

const sha = 'a'.repeat(40);
const old = 'b'.repeat(40);
const image = 'sha256:' + 'c'.repeat(64);
function live() {
  const status = 'CURRENT';
  return {
    repository: 'Patricked-code/MCP', schemaVersion: 1, stateVersion: 5,
    generatedAt: new Date().toISOString(), freshness: status, ageSeconds: 0, maxAgeSeconds: 60,
    github: { status, branch: 'main', head: sha },
    s1: { status, branch: 'main', head: sha, originMain: sha, workingTreeClean: true, diffEmpty: true },
    runtime: { status, revision: sha, imageId: image, containerStatus: 'running', health: 'healthy' },
    documentation: { status, declaredGithubSha: old, declaredS1Sha: old, drift: true },
    alignment: { global: 'RECONCILIATION_REQUIRED', githubVsS1: 'ALIGNED', runtime: 'ALIGNED', documentation: 'DOCUMENTATION_DRIFT' },
    contradictions: ['DOCUMENTATION_DRIFT'], nextAction: 'reconcile_canonical_documentation'
  } as LiveStateSnapshot;
}
test('G1 only projects attestable document-only drift and refuses stale or mismatched evidence', () => {
  assert.equal(projectG1Evidence(live(), sha).status, 'DRIFT');
  for (const altered of [
    { ...live(), generatedAt: '2020-01-01T00:00:00Z' },
    { ...live(), s1: { ...live().s1, diffEmpty: false } },
    { ...live(), contradictions: ['DOCUMENTATION_DRIFT', 'OTHER'] },
    { ...live(), runtime: { ...live().runtime, revision: old } }
  ]) assert.equal(projectG1Evidence(altered, sha).status, 'UNVERIFIED');
  assert.equal(projectG1Evidence({
    ...live(), documentation: { ...live().documentation, drift: false }, contradictions: [],
    alignment: { ...live().alignment, global: 'FULLY_ALIGNED', documentation: 'ALIGNED' }
  }, sha).status, 'ALIGNED');
});
test('candidate updates the same 15 observations as #400 and preserves historic fields', () => {
  const manifest = readFileSync('PRODUCTION_STATE.json', 'utf8');
  const historical = JSON.parse(manifest);
  const evidence = projectG1Evidence(live(), sha);
  assert.equal(evidence.status, 'DRIFT');
  if (evidence.status !== 'DRIFT') throw new Error('expected drift');
  assert.throws(() => prepareG1Candidate(manifest, evidence, sha), /baseline/);
  evidence.declaredGithubSha = historical.githubCommitFull;
  evidence.declaredS1Sha = historical.serverGitState.lastDirectlyVerifiedCommitFull;
  const candidate = prepareG1Candidate(manifest, evidence, sha);
  const normalized = JSON.parse(candidate);
  assert.equal(normalized.githubCommitFull, sha);
  assert.equal(normalized.runtimeState.imageId, image);
  assert.deepEqual(normalized.liveState, historical.liveState);
  assert.deepEqual(normalized.requiredRules, historical.requiredRules);
  const originalLines = manifest.split('\n');
  const candidateLines = candidate.split('\n');
  assert.equal(originalLines.length, candidateLines.length);
  assert.equal(originalLines.filter((line, i) => line !== candidateLines[i]).length, 15);
});

test('G1 binds existing live inventory and catalogue digests to the exact attested SHA without certifying all runtime stores',()=>{
  const state=live();
  const d='d'.repeat(64);
  state.inventory={status:'CURRENT',evidenceHead:sha,sourceDigest:d,documentation:{digest:d},governance:{digest:d},
    testSuiteDigest:d,contradictions:[]} as unknown as NonNullable<LiveStateSnapshot['inventory']>;
  state.governance={status:'CURRENT',digest:d,contradictions:[]} as unknown as NonNullable<LiveStateSnapshot['governance']>;
  state.auditBaseline={status:'CURRENT',evidenceHead:sha,runtimeRevision:sha,valid:true,invalidReasons:[],sourceDigest:d,
    governanceDigest:d,testSuiteDigest:d,catalogueDigest:d} as NonNullable<LiveStateSnapshot['auditBaseline']>;
  state.capabilities={status:'CURRENT',catalogueDigest:d,registeredToolCount:160,contradictions:[]} as unknown as NonNullable<LiveStateSnapshot['capabilities']>;
  const proof=projectG1Evidence(state,sha);
  assert.equal(proof.status,'DRIFT');
  if(proof.status!=='DRIFT') throw Error('expected drift');
  assert.equal(proof.authorityEvidence?.sha,sha);
  assert.equal(proof.authorityEvidence?.toolCount,160);
  assert.equal(proof.authorityEvidence?.inventoryDigest,d);
  state.inventory.evidenceHead=old;
  const unbound=projectG1Evidence(state,sha);
  assert.equal(unbound.status,'DRIFT');
  if(unbound.status==='DRIFT') assert.equal(unbound.authorityEvidence,undefined);
});
