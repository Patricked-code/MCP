import assert from 'node:assert/strict';
import test from 'node:test';
// @ts-ignore -- ESM report scripts
import { deriveLoopbackCandidate,materializeLoopbackCandidate } from '../scripts/documentary-loopback.mjs';
// @ts-ignore -- ESM report scripts
import { observeLoopbackCheckpoint } from '../scripts/documentary-hierarchy.mjs';
// @ts-ignore -- standalone ESM report script
import { compareLiveAuthorities } from '../scripts/mcp-documentary-closure.mjs';

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

test('inventory component diagnostics explain differences but never weaken exact sourceDigest comparison',()=>{
  const now=Date.parse(at),d='d'.repeat(64),other='e'.repeat(64);
  const existingEvidence={ok:true,evidenceHead:head,sourceDigest:d,documentationDigest:d,governanceDigest:d,
    testSuiteDigest:d,catalogueDigest:d,toolCount:160,architectureDigest:d,sourceGeneratedAt:at};
  const g1={status:'ALIGNED',authorityEvidence:{schemaVersion:1,sha:head,observedAt:at,stateVersion:5,
    inventoryDigest:other,documentationDigest:d,governanceDigest:d,testSuiteDigest:d,catalogueDigest:d,toolCount:160,
    architectureDigest:other,sourceGeneratedAt:at}};
  const r=compareLiveAuthorities({headSha:head,g1,existingEvidence,now});
  assert.equal(r.matchedCount,5);assert.equal(r.differences[0].field,'inventoryDigest');
  assert.deepEqual(r.inventoryDiagnostics.map((x:{field:string,status:string})=>[x.field,x.status]),
    [['architectureDigest','CONFLICT'],['sourceGeneratedAt','MATCHED']]);
  const missing=compareLiveAuthorities({headSha:head,g1:{...g1,authorityEvidence:{...g1.authorityEvidence,architectureDigest:undefined}},existingEvidence,now});
  assert.equal(missing.matchedCount,5);
  assert.equal(missing.inventoryDiagnostics[0].status,'UNVERIFIED');
});

test('publication preflight independently derives exact bytes without granting write authority',async()=>{
  // @ts-ignore -- ESM report script
  const module=await import('../scripts/documentary-loopback.mjs');
  assert.equal(typeof module.prepareLoopbackPublicationCandidate,'function');
  const candidate=deriveLoopbackCandidate(input);
  const trustedReport={...report,schemaVersion:1,repository:'Patricked-code/MCP',
    technicalDeploymentIndependent:true,closureAttested:false,mutationPerformed:false,
    observedAt:at,loopbackCandidate:candidate};
  const args={...input,report:trustedReport,currentMainSha:head};
  const prepared=module.prepareLoopbackPublicationCandidate(args);
  assert.equal(prepared.status,'CANDIDATE_READY');
  assert.equal(prepared.content,materializeLoopbackCandidate(raw,candidate,head));
  assert.equal(prepared.automaticPublicationAuthorized,false);
  assert.equal(prepared.mutationPerformed,false);
  assert.equal(prepared.closureAttested,false);
  const tampered={...candidate,patch:{...candidate.patch,appendSection:candidate.patch.appendSection+'\nInjected prose\n'}};
  const crypto=await import('node:crypto');
  tampered.candidateContentDigest=crypto.createHash('sha256').update(prepared.content+'\nInjected prose\n').digest('hex');
  assert.throws(()=>module.prepareLoopbackPublicationCandidate({...args,
    report:{...trustedReport,loopbackCandidate:tampered}}),/LOOPBACK_PUBLICATION_CANDIDATE_MISMATCH/);
  assert.throws(()=>module.prepareLoopbackPublicationCandidate({...args,currentMainSha:oldSha}),/LOOPBACK_PUBLICATION_BASE_UNVERIFIED/);
  assert.throws(()=>module.prepareLoopbackPublicationCandidate({...args,
    report:{...trustedReport,repository:'other/MCP'}}),/LOOPBACK_PUBLICATION_REPORT_UNVERIFIED/);
  assert.throws(()=>module.prepareLoopbackPublicationCandidate({...args,now:Date.parse(at)+900001}),/LOOPBACK_PUBLICATION_REPORT_UNVERIFIED/);
  const noChanges={...args,checkpointChanges:[]};
  const noChangeCandidate=deriveLoopbackCandidate(noChanges);
  const unchanged=module.prepareLoopbackPublicationCandidate({...noChanges,
    report:{...trustedReport,loopbackCandidate:noChangeCandidate}});
  assert.equal(unchanged.status,'NO_CHANGE');
  assert.equal(unchanged.content,null);
  assert.equal(unchanged.automaticPublicationAuthorized,false);
});
