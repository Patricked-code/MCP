import assert from 'node:assert/strict';
import test from 'node:test';
import { observeGithubReviewAndCi } from '../src/github/observeGithubReviewAndCi.js';

const head='c'.repeat(40);
const path='/repos/Patricked-code/MCP';
const pr={state:'open',draft:false,head:{sha:head},user:{login:'developer'}};
const reviews=[{state:'APPROVED',commit_id:head,user:{login:'security-reviewer',type:'User'},submitted_at:'2026-10-28T06:10:00Z'}];
const runs={workflow_runs:[{name:'MCP CI',head_sha:head,status:'completed',conclusion:'success',event:'pull_request',run_number:450}]};
function client(patch:Record<string,unknown>={}){
  const seen:string[]=[];
  return{seen,request:async(route:string)=>{
    seen.push(route);
    return{ok:true,status:200,json:route.includes('/collaborators/')?{permission:'write'}
      :route.includes('/reviews')?(patch.reviews??reviews)
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
    path+'/actions/runs?head_sha='+head+'&per_page=100',
    path+'/collaborators/security-reviewer/permission',path+'/pulls/355']);
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

test('RED B3h: a bot-approved review with a plausible login is never independent human approval',async()=>{
  const result=await observeGithubReviewAndCi({
    repository:'Patricked-code/MCP',pullRequestNumber:355,expectedHeadSha:head,
    expectedWorkflow:'MCP CI',now:()=>new Date('2026-10-28T06:15:00Z'),
    request:async route=>({
      ok:true,status:200,
      json:route.includes('/reviews')
        ?[{...reviews[0],user:{login:'security-reviewer',type:'Bot'}}]
        :route.includes('/actions/runs')?runs:pr
    })
  });
  assert.equal(result.status,'BLOCKED');
  assert.equal(result.runtimeWriteAuthorized,false);
});

test('RED B3h: outsider with read-only reviewer permission is not an independent approver',async()=>{
  const calls:string[]=[];
  const result=await observeGithubReviewAndCi({
    repository:'Patricked-code/MCP',pullRequestNumber:355,expectedHeadSha:head,
    expectedWorkflow:'MCP CI',now:()=>new Date('2026-10-28T06:15:00Z'),
    request:async route=>{
      calls.push(route);
      return {ok:true,status:200,json:
        route.includes('/collaborators/')
          ?{permission:'read'}
          :route.includes('/reviews')?[{...reviews[0],user:{login:'security-reviewer',type:'User'}}]
          :route.includes('/actions/runs')?runs:pr};
    }
  });
  assert.equal(result.status,'BLOCKED');
  assert.ok(calls.includes(path+'/collaborators/security-reviewer/permission'));
  assert.equal(result.attestation,null);
});

test('RED B3h: changing PR HEAD after review/CI checks invalidates attestation',async()=>{
  let prReads=0;
  const r=await observeGithubReviewAndCi({
    repository:'Patricked-code/MCP',pullRequestNumber:355,expectedHeadSha:head,
    expectedWorkflow:'MCP CI',now:()=>new Date('2026-10-28T06:15:00Z'),
    request:async route=>{
      if(route.includes('/pulls/355')&&!route.includes('/reviews')){
        prReads++;
        return {ok:true,status:200,json:prReads===1?pr:{...pr,head:{sha:'f'.repeat(40)}}};
      }
      if(route.includes('/collaborators/'))return {ok:true,status:200,json:{permission:'write'}};
      return {ok:true,status:200,json:route.includes('/reviews')
        ?[{...reviews[0],user:{login:'security-reviewer',type:'User'}}]:runs};
    }
  });
  assert.equal(prReads,2);
  assert.equal(r.status,'BLOCKED');
  assert.equal(r.runtimeWriteAuthorized,false);
});

test('B3h: no confirmed human type, unknown GitHub permission, and provider denial fail closed',async()=>{
 for(const sample of [
   {reviewUser:{login:'security-reviewer'},permission:'write'},
   {reviewUser:{login:'security-reviewer',type:'User'},permission:'triage'},
   {reviewUser:{login:'security-reviewer',type:'User'},permission:'read'},
   {reviewUser:{login:'security-reviewer',type:'User'},permission:'none'}
 ]){
   const r=await observeGithubReviewAndCi({
     repository:'Patricked-code/MCP',pullRequestNumber:355,expectedHeadSha:head,
     expectedWorkflow:'MCP CI',now:()=>new Date('2026-10-28T06:15:00Z'),
     request:async route=>({ok:true,status:200,json:
       route.includes('/collaborators/')?{permission:sample.permission}
         :route.includes('/reviews')?[{...reviews[0],user:sample.reviewUser}]
         :route.includes('/actions/runs')?runs:pr})
   });
   assert.equal(r.status,'BLOCKED',JSON.stringify(sample));
   assert.equal(r.attestation,null);
 }
 const denied=await observeGithubReviewAndCi({
   repository:'Patricked-code/MCP',pullRequestNumber:355,expectedHeadSha:head,
   expectedWorkflow:'MCP CI',now:()=>new Date('2026-10-28T06:15:00Z'),
   request:async route=>route.includes('/collaborators/')
    ?{ok:false,status:403,json:null}
    :{ok:true,status:200,json:route.includes('/reviews')?reviews:route.includes('/actions/runs')?runs:pr}
 });
 assert.equal(denied.status,'BLOCKED');
});

test('B3h: current maintain/admin reviewer permissions are valid as read-only observations',async()=>{
 for(const permission of ['maintain','admin'] as const){
   const r=await observeGithubReviewAndCi({
     repository:'Patricked-code/MCP',pullRequestNumber:355,expectedHeadSha:head,
     expectedWorkflow:'MCP CI',now:()=>new Date('2026-10-28T06:15:00Z'),
     request:async route=>({ok:true,status:200,json:route.includes('/collaborators/')
       ?{permission}:route.includes('/reviews')?reviews:route.includes('/actions/runs')?runs:pr})
   });
   assert.equal(r.status,'PROVIDER_APPROVED');
   assert.equal(r.runtimeWriteAuthorized,false);
 }
});

// B3i: GitHub timestamps can collide at one-second precision. The order of
// equally dated contradictory reviews must never decide a privileged gate.
test('RED B3i: conflicting reviews at the same instant cannot be approved by array ordering',async()=>{
  const approved={...reviews[0],id:8001};
  const revoked={...reviews[0],id:8002,state:'CHANGES_REQUESTED'};
  for(const pair of [[revoked,approved],[approved,revoked]]){
    const c=client({reviews:pair});
    const result=await observeGithubReviewAndCi({
      repository:'Patricked-code/MCP',pullRequestNumber:355,expectedHeadSha:head,
      expectedWorkflow:'MCP CI',now:()=>new Date('2026-10-28T06:15:00Z'),request:c.request
    });
    assert.equal(result.status,'BLOCKED');
    assert.equal(result.attestation,null);
    assert.equal(result.runtimeWriteAuthorized,false);
  }
});


test('FINDING-06: an outstanding CHANGES_REQUESTED from a second reviewer blocks even if another approved',async()=>{
  const denied=await observeGithubReviewAndCi({
    repository:'Patricked-code/MCP',pullRequestNumber:355,expectedHeadSha:head,
    expectedWorkflow:'MCP CI',now:()=>new Date('2026-10-28T06:15:00Z'),
    request:client({reviews:[...reviews,{
      state:'CHANGES_REQUESTED',commit_id:head,user:{login:'reviewer-two',type:'User'},
      submitted_at:'2026-10-28T06:11:00Z'
    }]}).request
  });
  assert.equal(denied.status,'BLOCKED');
  assert.equal(denied.attestation,null);
});
test('OUTDATED REVIEW REGRESSION: a later COMMENTED review does not revoke an existing approval',async()=>{
 const r=await observeGithubReviewAndCi({
   repository:'Patricked-code/MCP',pullRequestNumber:355,expectedHeadSha:head,
   expectedWorkflow:'MCP CI',now:()=>new Date('2026-10-28T06:15:00Z'),
   request:client({reviews:[...reviews,{...reviews[0],state:'COMMENTED',submitted_at:'2026-10-28T06:12:00Z'}]}).request
 });
 assert.equal(r.status,'PROVIDER_APPROVED');
});
