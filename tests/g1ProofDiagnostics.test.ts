import assert from 'node:assert/strict';
import test from 'node:test';
import { projectG1Evidence } from '../src/deploy/g1Documentation.js';
import { diagnoseG1Unverified, G1_UNVERIFIED_REASONS } from '../src/deploy/g1ProofDiagnostics.js';
import type { LiveStateSnapshot } from '../src/liveState/types.js';

const sha = 'a'.repeat(40), old = 'b'.repeat(40), image='sha256:'+'c'.repeat(64);
const observedAt='2026-11-21T21:00:00.000Z';
const now=Date.parse(observedAt);
function live(): LiveStateSnapshot {
  return {
    repository:'Patricked-code/MCP', schemaVersion:1, stateVersion:1421,
    generatedAt:observedAt, freshness:'CURRENT', ageSeconds:0, maxAgeSeconds:60,
    github:{status:'CURRENT',branch:'main',head:sha},
    s1:{status:'CURRENT',branch:'main',head:sha,originMain:sha,workingTreeClean:true,diffEmpty:true},
    runtime:{status:'CURRENT',containerStatus:'running',health:'healthy',revision:sha,imageId:image},
    documentation:{status:'CURRENT',declaredGithubSha:old,declaredS1Sha:old,drift:true},
    alignment:{global:'RECONCILIATION_REQUIRED',githubVsS1:'ALIGNED',
      runtime:'ALIGNED',documentation:'DOCUMENTATION_DRIFT'},
    contradictions:['DOCUMENTATION_DRIFT'],
    nextAction:'reconcile_canonical_documentation'
  } as LiveStateSnapshot;
}
test('G1 original classification DRIFT is unchanged on a real doc-only mismatch',()=>{
  const state=live();
  const proof=projectG1Evidence(state,sha,now);
  assert.equal(proof.status,'DRIFT');
  assert.deepEqual(diagnoseG1Unverified(state,sha,now),['G1_ALIGNMENT_UNVERIFIED']);
});
test('stale evidence is classified UNVERIFIED with bounded nonsecret diagnostic',()=>{
  const state=live();
  state.generatedAt='2026-11-21T20:00:00.000Z';
  assert.equal(projectG1Evidence(state,sha,now).status,'UNVERIFIED');
  assert.deepEqual(diagnoseG1Unverified(state,sha,now),
    ['G1_LIVESTATE_FRESHNESS_UNVERIFIED']);
});
test('runtime revision mismatch, health and git dirt cannot be presented as doc drift',()=>{
  const state=live();
  state.s1.workingTreeClean=false;
  state.runtime.revision=old;
  state.runtime.health='starting';
  assert.equal(projectG1Evidence(state,sha,now).status,'UNVERIFIED');
  const reasons=diagnoseG1Unverified(state,sha,now);
  assert.ok(reasons.includes('G1_EXACT_SHA_NOT_ALIGNED'));
  assert.ok(reasons.includes('G1_S1_WORKTREE_UNVERIFIED'));
  assert.ok(reasons.includes('G1_RUNTIME_HEALTH_UNVERIFIED'));
});
test('scope mismatch and absent sources fail closed without revealing secrets',()=>{
  const state=live();
  state.repository='UnknownOrg/Repo';
  state.github.status='UNAVAILABLE';
  state.documentation.status='UNAVAILABLE';
  assert.equal(projectG1Evidence(state,sha,now).status,'UNVERIFIED');
  const reasons=diagnoseG1Unverified(state,sha,now);
  assert.ok(reasons.includes('G1_REPOSITORY_UNVERIFIED'));
  assert.ok(reasons.includes('G1_LIVE_SOURCE_UNAVAILABLE'));
  assert.ok(reasons.every(x=>G1_UNVERIFIED_REASONS.includes(x)));
});
test('ambiguous contradictions and missing image proof stay UNVERIFIED',()=>{
  const state=live();
  state.contradictions=['DOCUMENTATION_DRIFT','RUNTIME_UNVERIFIED'];
  state.runtime.imageId=null;
  assert.equal(projectG1Evidence(state,sha,now).status,'UNVERIFIED');
  assert.ok(diagnoseG1Unverified(state,sha,now).includes('G1_DOCUMENTATION_CONTRADICTIONS'));
  state.contradictions=['DOCUMENTATION_DRIFT'];
  assert.ok(diagnoseG1Unverified(state,sha,now).includes('G1_RUNTIME_IMAGE_UNVERIFIED'));
});
test('invalid SHA can never obtain DRIFT, even if other sources seem aligned',()=>{
  const state=live();
  assert.equal(projectG1Evidence(state,'invalid',now).status,'UNVERIFIED');
  assert.ok(diagnoseG1Unverified(state,'invalid',now).includes('G1_INVALID_EXPECTED_SHA'));
});

test('G1 classifies documentary contradictions without emitting arbitrary source details',()=>{
  const state=live();
  state.contradictions=['DOCUMENTATION_DRIFT','CURRENT_STATE_INVENTORY_UNAVAILABLE','AUDIT_BASELINE_EVIDENCE_HEAD_MISMATCH','UNRECOGNIZED_DETAIL'];
  const reasons=diagnoseG1Unverified(state,sha,now);
  assert.equal(projectG1Evidence(state,sha,now).status,'UNVERIFIED');
  assert.ok(reasons.includes('G1_DOCUMENTATION_CONTRADICTIONS'));
  assert.ok(reasons.includes('G1_CONTRADICTION_INVENTORY_UNAVAILABLE'));
  assert.ok(reasons.includes('G1_CONTRADICTION_AUDIT_BASELINE_INVALID'));
  assert.ok(reasons.includes('G1_CONTRADICTION_OTHER'));
  assert.ok(reasons.length<=20);
  assert.ok(reasons.every(x=>G1_UNVERIFIED_REASONS.includes(x)));
  assert.ok(!JSON.stringify(reasons).includes('UNRECOGNIZED_DETAIL'));
});
