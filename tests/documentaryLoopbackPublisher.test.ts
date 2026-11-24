import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
// @ts-ignore -- standalone ESM workflow script
import { verifyTrustedLoopbackRun,decodeBoundLoopbackReport,inspectLoopbackPublication } from '../scripts/documentary-loopback-publisher.mjs';
// @ts-ignore -- standalone ESM report script
import { deriveLoopbackCandidate } from '../scripts/documentary-loopback.mjs';

const repo='Patricked-code/MCP',workflow='.github/workflows/mcp-deploy.yml';
const head='b'.repeat(40),old='a'.repeat(40),at='2026-11-24T08:00:00.000Z',now=Date.parse(at)+1000;
const env={GITHUB_ACTIONS:'true',GITHUB_REPOSITORY:repo,GITHUB_REF:'refs/heads/main',
  GITHUB_WORKFLOW_REF:repo+'/'+workflow+'@refs/heads/main',GITHUB_WORKFLOW_SHA:head,
  GITHUB_SHA:head,GITHUB_RUN_ID:'123',GITHUB_RUN_ATTEMPT:'2',GITHUB_EVENT_NAME:'push'};
const run={id:123,run_attempt:2,head_sha:head,head_branch:'main',path:workflow,event:'push',
  repository:{full_name:repo},head_repository:{full_name:repo},status:'in_progress'};
const jobId='mcp-s1-123-'+head.slice(0,12),fence=String.fromCharCode(96).repeat(3);
const raw='# SUIVI\n\n## POINT DE REPRISE COURANT\n'+fence+'loopback-checkpoint\n'+JSON.stringify({
  schemaVersion:1,scope:'REPOSITORY_NAVIGATION',observedAt:'2026-11-24T07:00:00.000Z',
  observedMainSha:old,continuityId:'WORK-01',proofIssue:441,observationStatus:'REOBSERVE_REQUIRED',
  nextAction:'REOBSERVE_GITHUB_S1_RUNTIME_AND_CONTINUITY'})+'\n'+fence+'\n';
const report={schemaVersion:1,repository:repo,headSha:head,observedAt:at,
  technicalDeploymentIndependent:true,closureAttested:false,mutationPerformed:false,g1Status:'ALIGNED',
  status:'DOCUMENTARY_CLOSURE_PENDING',reasons:['SEMANTIC_AND_RUNTIME_REGISTRY_COVERAGE_UNVERIFIED'],
  liveAuthorities:{headSha:head,bound:true,matchedCount:6,checks:Array.from({length:6},()=>({status:'MATCHED'})),
    differences:[],runtimeObservation:{status:'OBSERVED',sha:head,jobId,stableRead:true,conflicts:[],
      evidenceDigest:'c'.repeat(64),stateVersion:1534,observedAt:at}}};
const changes=[{code:'M',path:'src/deploy/g1Documentation.ts',previousPath:null}];
function fixture(checkpointChanges=changes) {
  const loopbackCandidate=deriveLoopbackCandidate({raw,headSha:head,checkpointChanges,report,expectedJobId:jobId,now});
  const reportBytes=Buffer.from(JSON.stringify({...report,loopbackCandidate}));
  return {env:{...env,LOOPBACK_REPORT_DIGEST:createHash('sha256').update(reportBytes).digest('hex')},
    run,reportBytes,currentMainSha:head,checkoutSha:head,raw,checkpointChanges,now};
}

test('same-run binding requires canonical workflow, repo, main, SHA and exact attempt',()=>{
  assert.deepEqual(verifyTrustedLoopbackRun(env,run),{headSha:head,runId:'123',runAttempt:'2',expectedJobId:jobId});
  for(const changed of [{run_attempt:1},{id:124},{head_sha:old},{path:'.github/workflows/other.yml'},
    {head_repository:{full_name:'fork/MCP'}},{head_branch:'feature'},{status:'completed'}])
    assert.throws(()=>verifyTrustedLoopbackRun(env,{...run,...changed}),/RUN_PROVENANCE_UNVERIFIED/);
  for(const changed of [{GITHUB_ACTIONS:'false'},{GITHUB_WORKFLOW_SHA:old},{GITHUB_EVENT_NAME:'pull_request'},
    {GITHUB_REF:'refs/pull/1/merge'},{GITHUB_WORKFLOW_REF:repo+'/'+workflow+'@refs/heads/feature'}])
    assert.throws(()=>verifyTrustedLoopbackRun({...env,...changed},run),/RUN_CONTEXT_UNVERIFIED/);
});
test('report is bound to exact bytes and valid UTF-8 JSON',()=>{
  const input=fixture();
  assert.equal(decodeBoundLoopbackReport(input.reportBytes,input.env.LOOPBACK_REPORT_DIGEST).headSha,head);
  assert.throws(()=>decodeBoundLoopbackReport(Buffer.concat([input.reportBytes,Buffer.from(' ')]),
    input.env.LOOPBACK_REPORT_DIGEST),/REPORT_BYTES_UNVERIFIED/);
  const malformed=Buffer.from([255]),digest=createHash('sha256').update(malformed).digest('hex');
  assert.throws(()=>decodeBoundLoopbackReport(malformed,digest),/REPORT_JSON_UNVERIFIED/);
});
test('admission recomputes exact candidate, rejects drift and returns no write authority',()=>{
  const input=fixture(),result=inspectLoopbackPublication(input);
  assert.equal(result.status,'CANDIDATE_READY');
  assert.match(result.candidateContentDigest,/^[a-f0-9]{64}$/);
  assert.equal(result.mutationPerformed,false);assert.equal(result.automaticPublicationAuthorized,false);
  assert.equal(result.closureAttested,false);
  assert.throws(()=>inspectLoopbackPublication({...input,currentMainSha:old}),/RUN_HEAD_UNVERIFIED/);
  assert.throws(()=>inspectLoopbackPublication({...input,checkoutSha:old}),/RUN_HEAD_UNVERIFIED/);
  assert.throws(()=>inspectLoopbackPublication({...input,checkpointChanges:[]}),/CANDIDATE_MISMATCH/);
  assert.throws(()=>inspectLoopbackPublication({...input,now:Date.parse(at)+900001}),/REPORT_UNVERIFIED/);
  const unchanged=inspectLoopbackPublication(fixture([]));
  assert.equal(unchanged.status,'NO_CHANGE');assert.equal(unchanged.candidateContentDigest,null);
});
