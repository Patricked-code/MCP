/**
 * C27 — GitHub live-evidence reader ports for the EXISTING C27 certifier.
 *
 * Uses the existing authenticated GitHub JSON request interface. No token,
 * network credential, queue, agent, lock or new execution authority.
 * Separate MCP/agent-host/checkpoint readers remain mandatory.
 *
 * All GitHub APIs are read-only. A successful CI workflow does NOT imply a
 * completed deployment; reuse the existing C25 exact-job-step verifier.
 */
import { verifyGovernedDeployRun } from './mcp-postdeploy-run-proof.mjs';

const REPO='Patricked-code/MCP';
const PREFIX='/repos/'+REPO;
const SHA=/^[a-f0-9]{40}$/;
const MAX=100;
const RUN=/^[1-9][0-9]*$/;
const fail=(reason)=>{throw new Error(reason);};
const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const validSelector=s=>object(s)
  &&s.repository===REPO&&Number.isSafeInteger(s.pullRequestNumber)
  &&s.pullRequestNumber>0&&SHA.test(s.expectedMergeSha??'');
const date=s=>typeof s==='string'&&Number.isFinite(Date.parse(s));
const bounded=(arr,total)=>{
  if(!Array.isArray(arr)||arr.length>=MAX
    ||!Number.isSafeInteger(total)||total<0||total>=MAX){
    fail('GITHUB_EVIDENCE_PAGINATION_INCOMPLETE');
  }
  return arr;
};

export function createC27GithubProofReaders({request,readReviewGate}={}){
  if(typeof request!=='function')fail('EXISTING_GITHUB_READ_PORT_REQUIRED');
  // readReviewGate is optional. Without an independently observed ruleset and
  // all review threads, no PR protection/independent review is attested.
  async function get(endpoint){
    if(typeof endpoint!=='string'||!endpoint.startsWith(PREFIX+'/')
      ||endpoint.includes('..')||endpoint.includes('#')){
      fail('GITHUB_EVIDENCE_INVALID_ENDPOINT');
    }
    let response;
    try{response=await request(endpoint);}catch{fail('GITHUB_EVIDENCE_REQUEST_UNAVAILABLE');}
    if(response?.ok!==true||response?.status!==200||!object(response.json)&&!Array.isArray(response.json)){
      fail('GITHUB_EVIDENCE_HTTP_UNAVAILABLE');
    }
    return response.json;
  }
  async function prRaw(s){
    if(!validSelector(s))fail('GITHUB_EVIDENCE_SELECTOR_INVALID');
    const v=await get(PREFIX+'/pulls/'+s.pullRequestNumber);
    if(v.number!==s.pullRequestNumber||v.state!=='closed'||v.merged!==true
      ||v.base?.ref!=='main'||v.base?.repo?.full_name!==REPO
      ||!SHA.test(v.head?.sha??'')||v.merge_commit_sha!==s.expectedMergeSha
      ||!date(v.merged_at)||typeof v.head?.ref!=='string'){
      fail('GITHUB_EVIDENCE_PR_MERGE_OR_IDENTITY_MISMATCH');
    }
    return v;
  }
  async function githubRun(sha,name,event,branch){
    if(!SHA.test(sha))fail('GITHUB_EVIDENCE_SHA_INVALID');
    const list=await get(PREFIX+'/actions/runs?head_sha='+sha+'&per_page=100');
    const all=bounded(list.workflow_runs,list.total_count);
    const eligible=all.filter(x=>x&&x.name===name&&x.event===event
      &&x.head_sha===sha&&x.head_branch===branch
      &&x.repository?.full_name===REPO&&Number.isSafeInteger(x.id)&&x.id>0)
      .sort((a,b)=>b.id-a.id);
    const best=eligible[0];
    if(!best||best.status!=='completed'||best.conclusion!=='success'
      ||!date(best.updated_at)){
      fail('GITHUB_EVIDENCE_WORKFLOW_NOT_SUCCESSFUL_EXACT_SHA');
    }
    return best;
  }
  async function jobList(run){
    const list=await get(PREFIX+'/actions/runs/'+run.id+'/jobs?per_page=100');
    return bounded(list.jobs,list.total_count);
  }
  async function verifiedJob(run,name,sha){
    const jobs=await jobList(run);
    const matches=jobs.filter(x=>x.name===name&&x.head_sha===sha);
    if(matches.length!==1||matches[0].status!=='completed'
      ||matches[0].conclusion!=='success'
      ||!Number.isSafeInteger(matches[0].id)||matches[0].id<=0){
      fail('GITHUB_EVIDENCE_REQUIRED_JOB_FAILED_OR_AMBIGUOUS');
    }
    return {job:matches[0],jobs};
  }
  async function readPullRequest(s){
    const pr=await prRaw(s);
    const files=await get(PREFIX+'/pulls/'+s.pullRequestNumber+'/files?per_page=100');
    // The GitHub REST list endpoint has no total_count: full 100-page is
    // ambiguous, so fail closed instead of silently dropping another page.
    if(!Array.isArray(files)||files.length===0||files.length>=MAX
      ||files.some(f=>!object(f)||typeof f.filename!=='string'
        ||f.filename.length>500)){
      fail('GITHUB_EVIDENCE_PR_FILES_INCOMPLETE');
    }
    return Object.freeze({
      source:'GITHUB_PULL_REQUEST',number:pr.number,repository:REPO,
      baseRef:'main',headRef:pr.head.ref,merged:true,
      headSha:pr.head.sha,mergeCommitSha:pr.merge_commit_sha,
      mergedAt:pr.merged_at,changedPaths:files.map(f=>f.filename)
    });
  }
  async function readPrChecks(s){
    const pr=await prRaw(s);
    const run=await githubRun(pr.head.sha,'MCP CI','pull_request',pr.head.ref);
    await verifiedJob(run,'validate',pr.head.sha);
    let review=false,protection=false;
    if(typeof readReviewGate==='function'){
      let gate;
      try{gate=await readReviewGate({repository:REPO,number:pr.number,
        headSha:pr.head.sha,mergeSha:s.expectedMergeSha});}
      catch{gate=null;}
      review=gate?.source==='GITHUB_REVIEW_THREADS_AND_RULESET'
        &&gate.repository===REPO&&gate.number===pr.number
        &&gate.headSha===pr.head.sha&&gate.mergeSha===s.expectedMergeSha
        &&gate.allPagesFetched===true&&gate.allReviewThreadsResolved===true;
      protection=review&&gate.rulesetActive===true
        &&gate.requiredStatusCheck==='validate'
        &&gate.protectedMergeVerified===true;
    }
    return Object.freeze({
      source:'GITHUB_PR_CHECKS',headSha:pr.head.sha,
      conclusion:'success',requiredChecksPassed:true,
      runId:run.id,completedAt:run.updated_at,
      requiredReviewThreadsResolved:review,
      branchProtectionSatisfied:protection,
      providerRunUrl:run.html_url??null
    });
  }
  async function readMainChecks(s){
    if(!validSelector(s))fail('GITHUB_EVIDENCE_SELECTOR_INVALID');
    const run=await githubRun(s.expectedMergeSha,'MCP CI','push','main');
    await verifiedJob(run,'validate',s.expectedMergeSha);
    return Object.freeze({
      source:'GITHUB_MAIN_CHECKS',headSha:s.expectedMergeSha,
      conclusion:'success',requiredChecksPassed:true,
      runId:run.id,completedAt:run.updated_at,
      providerRunUrl:run.html_url??null
    });
  }
  async function readGovernedDeploy(s){
    if(!validSelector(s))fail('GITHUB_EVIDENCE_SELECTOR_INVALID');
    const run=await githubRun(s.expectedMergeSha,'MCP Governed Deploy','push','main');
    const jobs=await jobList(run);
    const proof=verifyGovernedDeployRun({
      repository:REPO,githubSha:s.expectedMergeSha,
      event:{workflow_run:run},jobs:{jobs}
    });
    if(proof.verified!==true||proof.sourceSha!==s.expectedMergeSha
      ||proof.sourceRunId!==run.id){
      fail('GITHUB_EVIDENCE_DEPLOY_EXACT_STEP_UNVERIFIED');
    }
    return Object.freeze({
      source:'MCP_GOVERNED_DEPLOY',headSha:s.expectedMergeSha,
      conclusion:'success',actualExactShaDeployStepSucceeded:true,
      runId:run.id,completedAt:run.updated_at,
      providerRunUrl:run.html_url??null,
      runtimeShaObserved:false // GitHub proof alone never attests runtime.
    });
  }
  return Object.freeze({readPullRequest,readPrChecks,readMainChecks,
    readGovernedDeploy});
}

/** Bounded preflight; NEVER equivalent to C27 terminal certification. */
export async function observeC27GithubDelivery(selector,ports){
  if(!validSelector(selector))return {status:'UNVERIFIED',reason:'SELECTOR_INVALID'};
  if(!ports||['readPullRequest','readPrChecks','readMainChecks',
    'readGovernedDeploy'].some(k=>typeof ports[k]!=='function')){
    return {status:'UNVERIFIED',reason:'GITHUB_READERS_UNAVAILABLE'};
  }
  try{
    const [pr,prChecks,mainChecks,deploy]=await Promise.all([
      ports.readPullRequest(selector),ports.readPrChecks(selector),
      ports.readMainChecks(selector),ports.readGovernedDeploy(selector)
    ]);
    return Object.freeze({
      status:prChecks.branchProtectionSatisfied&&prChecks.requiredReviewThreadsResolved
        ?'GITHUB_DELIVERY_PROOFS_VERIFIED'
        :'GITHUB_DELIVERY_REVIEW_GATE_UNVERIFIED',
      repository:REPO,prNumber:pr.number,
      headSha:pr.headSha,mergeSha:selector.expectedMergeSha,
      prCiRunId:prChecks.runId,mainCiRunId:mainChecks.runId,
      deployRunId:deploy.runId,
      githubOnly:true,ownerSessionVerified:false,
      agentWakeVerified:false,runtimeShaVerified:false,
      c27LiveCertified:false,globalMcpComplete:false
    });
  }catch(e){
    return Object.freeze({status:'UNVERIFIED',
      reason:e instanceof Error&&/^[A-Z0-9_]{5,90}$/.test(e.message)
        ?e.message:'GITHUB_EVIDENCE_UNAVAILABLE',
      githubOnly:true,c27LiveCertified:false,globalMcpComplete:false
    });
  }
}
