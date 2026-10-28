import assert from 'node:assert/strict';
import test from 'node:test';
import { observeGithubReviewAndCi } from '../src/github/observeGithubReviewAndCi.js';

const head='c'.repeat(40);
const path='/repos/Patricked-code/MCP';
const pr={state:'open',draft:false,head:{sha:head},user:{login:'developer'}};
const reviews=[{state:'APPROVED',commit_id:head,user:{login:'security-reviewer'},submitted_at:'2026-10-28T06:10:00Z'}];
const runs={workflow_runs:[{name:'MCP CI',head_sha:head,status:'completed',conclusion:'success',event:'pull_request',run_number:450}]};
function client(patch:Record<string,unknown>={}){
  const seen:string[]=[];
  return{seen,request:async(route:string)=>{
    seen.push(route);
    return{ok:true,status:200,json:route.includes('/reviews')?(patch.reviews??reviews)
      :route.includes('/actions/runs')?(patch.runs??runs):(patch.pr??pr)};
  }};
}
test('RED B3c: real GitHub PR, exact-head review and latest CI are independently checked',async()=>{
  const c=client();
  const result=await observeGithubReviewAndCi({
    repository:'Patricked-code/MCP',pullRequestNumber:355,expectedHeadSha:head,
    expectedWorkflow:'MCP CI',now:()=>new Date('2026-10-28T06:15:00Z'),
    request:c.request
  });
  assert.equal(result.status,'PROVIDER_APPROVED');
  assert.equal(result.attestation?.source,'SERVER_VALIDATED_GITHUB_API');
  assert.equal(result.attestation?.independentReviewApproved,true);
  assert.equal(result.attestation?.workflowConcludedSuccess,true);
  assert.deepEqual(c.seen,[path+'/pulls/355',path+'/pulls/355/reviews?per_page=100',
    path+'/actions/runs?head_sha='+head+'&per_page=100']);
  assert.equal(result.runtimeWriteAuthorized,false);
});
test('RED B3c: no reviews, draft, stale approval or failed latest run never authorize',async()=>{
  for(const p of [
    {reviews:[]},
    {pr:{...pr,draft:true}},
    {reviews:[{...reviews[0],commit_id:'f'.repeat(40)}]},
    {reviews:[{...reviews[0],user:{login:'developer'}}]},
    {runs:{workflow_runs:[...runs.workflow_runs,{...runs.workflow_runs[0],conclusion:'failure',run_number:451}]}}
  ]){
    const c=client(p);
    const result=await observeGithubReviewAndCi({
      repository:'Patricked-code/MCP',pullRequestNumber:355,expectedHeadSha:head,
      expectedWorkflow:'MCP CI',now:()=>new Date('2026-10-28T06:15:00Z'),request:c.request
    });
    assert.equal(result.status,'BLOCKED');
    assert.equal(result.runtimeWriteAuthorized,false);
  }
});
test('RED B3c: wrong repository, PR head, unauthorized HTTP and pagination gaps fail closed',async()=>{
  for(const p of [
    {pr:{...pr,head:{sha:'f'.repeat(40)}}},
    {reviews:Array.from({length:100},()=>reviews[0])},
    {runs:{workflow_runs:[]}}
  ]){
    const r=await observeGithubReviewAndCi({
      repository:'Patricked-code/MCP',pullRequestNumber:355,expectedHeadSha:head,
      expectedWorkflow:'MCP CI',now:()=>new Date('2026-10-28T06:15:00Z'),
      request:client(p).request
    });
    assert.equal(r.status,'BLOCKED');
  }
  const c=client();
  const invalid=await observeGithubReviewAndCi({
    repository:'../../other',pullRequestNumber:355,expectedHeadSha:head,
    expectedWorkflow:'MCP CI',now:()=>new Date('2026-10-28T06:15:00Z'),
    request:c.request
  });
  assert.equal(invalid.status,'BLOCKED');
  assert.equal(c.seen.length,0);
});
test('RED B3c: provider exceptions are redacted, no fake approvals',async()=>{
  const r=await observeGithubReviewAndCi({
    repository:'Patricked-code/MCP',pullRequestNumber:355,expectedHeadSha:head,
    expectedWorkflow:'MCP CI',now:()=>new Date('2026-10-28T06:15:00Z'),
    request:async()=>{throw Error('SECRET_TOKEN_LEAK');}
  });
  assert.equal(r.status,'BLOCKED');
  assert.doesNotMatch(JSON.stringify(r),/SECRET_TOKEN_LEAK/);
});
