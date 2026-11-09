import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createC27GithubProofReaders,observeC27GithubDelivery
} from '../scripts/mcp-c27-github-proof-readers.mjs';
import {certifyC27AutonomousCycle} from '../scripts/mcp-autonomy-e2e-certification.mjs';

const REPO='Patricked-code/MCP';
const P='/repos/'+REPO;
const HEAD='a'.repeat(40);
const MERGE='b'.repeat(40);
const branch='mcp/example-c27';
const selector={repository:REPO,pullRequestNumber:381,expectedMergeSha:MERGE};
const when='2026-11-07T15:35:00Z';
function data(){
  const pr={
    number:381,state:'closed',merged:true,merged_at:'2026-11-07T15:30:00Z',
    head:{sha:HEAD,ref:branch},base:{ref:'main',repo:{full_name:REPO}},
    merge_commit_sha:MERGE
  };
  const runs=[
    {id:201,name:'MCP CI',event:'pull_request',status:'completed',
      conclusion:'success',head_sha:HEAD,head_branch:branch,
      repository:{full_name:REPO},updated_at:'2026-11-07T15:25:00Z'},
    {id:202,name:'MCP CI',event:'push',status:'completed',
      conclusion:'success',head_sha:MERGE,head_branch:'main',
      repository:{full_name:REPO},updated_at:'2026-11-07T15:32:00Z'},
    {id:203,name:'MCP Governed Deploy',event:'push',status:'completed',
      conclusion:'success',head_sha:MERGE,head_branch:'main',
      repository:{full_name:REPO},updated_at:when}
  ];
  const jobs=[
    {id:1,name:'validate',head_sha:HEAD,status:'completed',conclusion:'success',steps:[]},
    {id:2,name:'validate',head_sha:MERGE,status:'completed',conclusion:'success',steps:[]},
    {id:3,name:'deploy',head_sha:MERGE,status:'completed',conclusion:'success',
      steps:[{name:'Deploy exact main SHA through MCP',
        status:'completed',conclusion:'success'}]}
  ];
  const responses={
    [P+'/pulls/381']:pr,
    [P+'/pulls/381/files?per_page=100']:[
      {filename:'scripts/mcp-c27-github-proof-readers.mjs'},
      {filename:'tests/mcpC27GithubProofReaders.test.mjs'}
    ],
    [P+'/actions/runs?head_sha='+HEAD+'&per_page=100']:{
      total_count:1,workflow_runs:[runs[0]]
    },
    [P+'/actions/runs?head_sha='+MERGE+'&per_page=100']:{
      total_count:2,workflow_runs:[runs[1],runs[2]]
    },
    [P+'/actions/runs/201/jobs?per_page=100']:{
      total_count:1,jobs:[jobs[0]]
    },
    [P+'/actions/runs/202/jobs?per_page=100']:{
      total_count:1,jobs:[jobs[1]]
    },
    [P+'/actions/runs/203/jobs?per_page=100']:{
      total_count:1,jobs:[jobs[2]]
    }
  };
  return responses;
}
const mock=responses=>async endpoint=>Object.hasOwn(responses,endpoint)
  ?{ok:true,status:200,json:responses[endpoint]}
  :{ok:false,status:404,json:{message:'not found'}};

test('C27 GitHub existing-auth-reader ports prove PR, two CI runs and actual exact SHA deployment step',async()=>{
  const ports=createC27GithubProofReaders({request:mock(data())});
  const [pr,check,main,deploy]=await Promise.all([
    ports.readPullRequest(selector),ports.readPrChecks(selector),
    ports.readMainChecks(selector),ports.readGovernedDeploy(selector)
  ]);
  assert.equal(pr.mergeCommitSha,MERGE);
  assert.equal(pr.headSha,HEAD);
  assert.deepEqual(pr.changedPaths,[
    'scripts/mcp-c27-github-proof-readers.mjs',
    'tests/mcpC27GithubProofReaders.test.mjs'
  ]);
  assert.equal(check.runId,201);
  assert.equal(main.runId,202);
  assert.equal(deploy.runId,203);
  assert.equal(deploy.actualExactShaDeployStepSucceeded,true);
  assert.equal(deploy.runtimeShaObserved,false);
  assert.equal(check.branchProtectionSatisfied,false);
  assert.equal(check.requiredReviewThreadsResolved,false);
  const observed=await observeC27GithubDelivery(selector,ports);
  assert.equal(observed.status,'GITHUB_DELIVERY_REVIEW_GATE_UNVERIFIED');
  assert.equal(observed.c27LiveCertified,false);
  assert.equal(observed.ownerSessionVerified,false);
});
test('C27 reviewer gate never invented; independently verified exact-head gate can be composed',async()=>{
  const readers=createC27GithubProofReaders({
    request:mock(data()),
    readReviewGate:async()=>({
      source:'GITHUB_REVIEW_THREADS_AND_RULESET',
      repository:REPO,number:381,headSha:HEAD,mergeSha:MERGE,
      allPagesFetched:true,allReviewThreadsResolved:true,
      rulesetActive:true,requiredStatusCheck:'validate',
      protectedMergeVerified:true
    })
  });
  const check=await readers.readPrChecks(selector);
  assert.equal(check.branchProtectionSatisfied,true);
  assert.equal(check.requiredReviewThreadsResolved,true);
  const proof=await observeC27GithubDelivery(selector,readers);
  assert.equal(proof.status,'GITHUB_DELIVERY_PROOFS_VERIFIED');
  assert.equal(proof.c27LiveCertified,false);
});
test('C27 missing request port is rejected before GitHub access',()=>{
  assert.throws(()=>createC27GithubProofReaders({}),/EXISTING_GITHUB_READ_PORT_REQUIRED/);
});
test('C27 selector and GitHub PR merge identity fail closed',async()=>{
  for(const change of [
    r=>{r[P+'/pulls/381'].merged=false;},
    r=>{r[P+'/pulls/381'].base.ref='develop';},
    r=>{r[P+'/pulls/381'].merge_commit_sha=HEAD;},
    r=>{r[P+'/pulls/381'].base.repo.full_name='unknown/repo';},
    r=>{r[P+'/pulls/381'].head.sha='notsha';},
  ]){
    const d=data();change(d);
    const o=await observeC27GithubDelivery(selector,
      createC27GithubProofReaders({request:mock(d)}));
    assert.equal(o.status,'UNVERIFIED');
    assert.equal(o.reason,'GITHUB_EVIDENCE_PR_MERGE_OR_IDENTITY_MISMATCH');
  }
  const v=await observeC27GithubDelivery({...selector,repository:'other/repo'},
    createC27GithubProofReaders({request:mock(data())}));
  assert.equal(v.reason,'SELECTOR_INVALID');
});
test('C27 rejects truncated GitHub pagination and 100-file PRs without claiming completeness',async()=>{
  for(const patch of [
    d=>{d[P+'/actions/runs?head_sha='+MERGE+'&per_page=100'].total_count=100;},
    d=>{d[P+'/actions/runs/203/jobs?per_page=100'].total_count=100;},
    d=>{d[P+'/pulls/381/files?per_page=100']=Array(100)
      .fill({filename:'tests/something.test.mjs'});}
  ]){
    const d=data();patch(d);
    const o=await observeC27GithubDelivery(selector,
      createC27GithubProofReaders({request:mock(d)}));
    assert.equal(o.status,'UNVERIFIED');
    assert.ok(['GITHUB_EVIDENCE_PAGINATION_INCOMPLETE',
      'GITHUB_EVIDENCE_PR_FILES_INCOMPLETE'].includes(o.reason),o.reason);
  }
});
test('C27 rejects CI failure, newer failed job, wrong SHA or wrong branch',async()=>{
  for(const patch of [
    d=>{d[P+'/actions/runs?head_sha='+HEAD+'&per_page=100']
      .workflow_runs[0].conclusion='failure';},
    d=>{d[P+'/actions/runs/202/jobs?per_page=100'].jobs[0].head_sha=HEAD;},
    d=>{d[P+'/actions/runs?head_sha='+MERGE+'&per_page=100']
      .workflow_runs[0].head_branch='somewhere-else';},
    d=>{d[P+'/actions/runs/201/jobs?per_page=100'].jobs[0].conclusion='skipped';},
  ]){
    const d=data();patch(d);
    const o=await observeC27GithubDelivery(selector,
      createC27GithubProofReaders({request:mock(d)}));
    assert.equal(o.status,'UNVERIFIED');
  }
});
test('C27 workflow SUCCESS with skipped/wrong/deleted exact deploy step is never certified',async()=>{
  for(const patch of [
    d=>{d[P+'/actions/runs/203/jobs?per_page=100']
      .jobs[0].steps[0].conclusion='skipped';},
    d=>{d[P+'/actions/runs/203/jobs?per_page=100']
      .jobs[0].steps[0].name='No deployment';},
    d=>{d[P+'/actions/runs/203/jobs?per_page=100']
      .jobs[0].head_sha=HEAD;},
    d=>{d[P+'/actions/runs?head_sha='+MERGE+'&per_page=100']
      .workflow_runs[1].event='workflow_dispatch_wrong';},
  ]){
    const d=data();patch(d);
    const o=await observeC27GithubDelivery(selector,
      createC27GithubProofReaders({request:mock(d)}));
    assert.equal(o.status,'UNVERIFIED');
  }
});
test('C27 GitHub proof readers cannot substitute for session, claim, host, runtime and checkpoint authorities',async()=>{
  const github=createC27GithubProofReaders({request:mock(data())});
  const result=await certifyC27AutonomousCycle({
    ...selector,mandateIssue:235,
    taskId:'TASK-20261107-001',
    governedSessionId:'d40fbb4d-a3a0-4cc4-aa17-43f7b3552b48',
    agentRunId:'real-run-1',checkpointId:'checkpoint-235-c27-run-001',
    observedAt:'2026-11-07T15:35:30Z'
  },github);
  assert.equal(result.status,'UNVERIFIED');
  assert.equal(result.reason,'REQUIRED_LIVE_EVIDENCE_PORTS_MISSING');
  assert.equal(result.globalMcpComplete,false);
});
