import assert from 'node:assert/strict';
import test from 'node:test';
// @ts-ignore -- ESM report scripts
import { deriveLoopbackCandidate,materializeLoopbackCandidate } from '../scripts/documentary-loopback.mjs';
// @ts-ignore -- ESM report scripts
import { observeLoopbackCheckpoint } from '../scripts/documentary-hierarchy.mjs';

const oldSha='a'.repeat(40),head='b'.repeat(40),jobId='mcp-s1-123-'+head.slice(0,12);
const fence=String.fromCharCode(96).repeat(3);
const raw='# SUIVI\n\nAncien journal intact.\n\n## POINT DE REPRISE COURANT\n\nHistorique conservé.\n'+fence+'loopback-checkpoint\n'+JSON.stringify({
  schemaVersion:1,scope:'REPOSITORY_NAVIGATION',observedAt:'2026-11-24T07:00:00.000Z',
  observedMainSha:oldSha,continuityId:'WORK-01',proofIssue:441,observationStatus:'REOBSERVE_REQUIRED',
  nextAction:'REOBSERVE_GITHUB_S1_RUNTIME_AND_CONTINUITY'
})+'\n'+fence+'\n';
const at='2026-11-24T08:00:00.000Z';
const report={headSha:head,g1Status:'ALIGNED',status:'DOCUMENTARY_CLOSURE_PENDING',
  reasons:['SEMANTIC_AND_RUNTIME_REGISTRY_COVERAGE_UNVERIFIED'],
  liveAuthorities:{headSha:head,bound:true,matchedCount:6,checks:Array.from({length:6},()=>({status:'MATCHED'})),
    differences:[],runtimeObservation:{status:'OBSERVED',sha:head,jobId,stableRead:true,conflicts:[],
      evidenceDigest:'c'.repeat(64),stateVersion:1534,observedAt:at}}};
const input={raw,headSha:head,checkpointChanges:[{code:'M',path:'src/deploy/g1Documentation.ts',previousPath:null}],
  report,expectedJobId:jobId,now:Date.parse(at)+1000};

test('exact deploy evidence generates a deterministic candidate, preserves history and navigation ownership',()=>{
  const candidate=deriveLoopbackCandidate(input);
  assert.equal(candidate.status,'CANDIDATE_READY');
  assert.deepEqual(deriveLoopbackCandidate(input),candidate);
  assert.equal(candidate.automaticPublicationAuthorized,false);
  assert.equal(candidate.closureAttested,false);
  const body=materializeLoopbackCandidate(raw,candidate,head);
  assert.ok(body.startsWith(raw.replace('## POINT DE REPRISE COURANT','## POINT DE REPRISE HISTORIQUE — 2026-11-24T07:00:00.000Z')));
  assert.match(body,/DOCUMENTARY_CLOSURE_PENDING/);
  const next=observeLoopbackCheckpoint(body);
  assert.equal(next.status,'PRESENT');
  assert.equal(next.declared.observedMainSha,head);
  assert.equal(next.declared.continuityId,'WORK-01');
  assert.equal(next.declared.proofIssue,441);
  assert.equal(next.proofStatus,'DECLARED_REOBSERVE_REQUIRED');
  assert.throws(()=>materializeLoopbackCandidate(raw+'changed',candidate,head),/BASE_MISMATCH/);
  assert.throws(()=>materializeLoopbackCandidate(raw,candidate,oldSha),/BASE_MISMATCH/);
  assert.throws(()=>materializeLoopbackCandidate(raw,{...candidate,patch:{...candidate.patch,appendSection:candidate.patch.appendSection+'x'}},head),/CONTENT_MISMATCH/);
});

test('does not generate another update on reattestation of SUIVI or G1 alone',()=>{
  assert.equal(deriveLoopbackCandidate({...input,checkpointChanges:[]}).status,'NO_CHANGE');
  assert.equal(deriveLoopbackCandidate({...input,checkpointChanges:[
    {code:'M',path:'SUIVI.md',previousPath:null},{code:'M',path:'PRODUCTION_STATE.json',previousPath:null}
  ]}).status,'NO_CHANGE');
  assert.equal(deriveLoopbackCandidate({...input,checkpointChanges:[
    {code:'R100',path:'docs/other.md',previousPath:'SUIVI.md'}
  ]}).reason,'LOOPBACK_CANONICAL_PATH_CHANGE_UNVERIFIED');
});

test('refuses drift, stale or wrong proof, conflicting source and malformed checkpoint',()=>{
  assert.equal(deriveLoopbackCandidate({...input,report:{...report,g1Status:'DRIFT'}}).status,'PENDING');
  assert.equal(deriveLoopbackCandidate({...input,expectedJobId:'mcp-s1-999-'+head.slice(0,12)}).status,'BLOCKED_OR_UNVERIFIED');
  assert.equal(deriveLoopbackCandidate({...input,now:Date.parse(at)+900001}).status,'BLOCKED_OR_UNVERIFIED');
  assert.equal(deriveLoopbackCandidate({...input,report:{...report,liveAuthorities:{...report.liveAuthorities,matchedCount:5}}}).status,'BLOCKED_OR_UNVERIFIED');
  assert.equal(deriveLoopbackCandidate({...input,raw:raw+raw}).status,'BLOCKED_OR_UNVERIFIED');
  assert.equal(deriveLoopbackCandidate({...input,report:{...report,reasons:['untrusted\n## heading']}}).status,'BLOCKED_OR_UNVERIFIED');
  const blocked=deriveLoopbackCandidate({...input,report:{...report,status:'DOCUMENTARY_CLOSURE_BLOCKED'}});
  assert.equal(blocked.status,'CANDIDATE_READY');
  assert.equal(blocked.closureAttested,false);
});
