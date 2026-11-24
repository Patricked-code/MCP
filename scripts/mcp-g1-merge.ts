// Trusted main checkout only, after the existing G1 publication job.
// No PR code is checked out or executed. No admin override or force-push.
import { execFileSync } from 'node:child_process';
import { readFile, appendFile } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';
import { G1_MANIFEST,G1_REPOSITORY,findG1OpenCorrection,type G1Drift } from '../src/deploy/g1Documentation.js';
import { GITHUB_OIDC_POLICY } from '../src/deploy/githubOidc.js';
import { validateG1MergeCandidate,validateG1BranchRules,exactG1CiState,validateG1NativePrState } from '../src/deploy/g1MergeAdmission.js';
import { createGovernedContractSubstrate } from '../src/governedWorkflow/contractSubstrate.js';
import { evaluateGw62DocumentationCiReview,planGw63DocumentationExactHeadMerge } from '../src/governedWorkflow/terminal/index.js';

const sha=process.env.GITHUB_SHA??'', runId=process.env.GITHUB_RUN_ID??'';
const readToken=process.env.G1_READ_TOKEN, writeToken=process.env.G1_GITHUB_TOKEN;
if(process.env.GITHUB_REPOSITORY!==G1_REPOSITORY||process.env.GITHUB_REF!=='refs/heads/main'||
  !/^[0-9a-f]{40}$/.test(sha)||!/^[0-9]{1,30}$/.test(runId)||!readToken||!writeToken||
  execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8',timeout:5000}).trim()!==sha)
  throw Error('G1_MERGE_EXECUTION_CONTEXT_INVALID');
const root='/repos/'+G1_REPOSITORY,branch='mcp/docs-reconcile-'+sha,jobId='mcp-s1-'+runId+'-'+sha.slice(0,12);
const [owner,name]=G1_REPOSITORY.split('/');
const MAX_RESPONSE=4*1024*1024, deadline=Date.now()+9*60_000;
async function json(url:string,init:RequestInit,limit=MAX_RESPONSE) {
  const response=await fetch(url,{...init,redirect:'error',signal:AbortSignal.timeout(15000)});
  if(!response.ok)throw Error('G1_MERGE_HTTP_'+response.status);
  const reader=response.body?.getReader();
  if(!reader)throw Error('G1_MERGE_RESPONSE_MISSING');
  const chunks:Uint8Array[]=[];let size=0;
  try {
    while(true){const next=await reader.read();if(next.done)break;size+=next.value.byteLength;
      if(size>limit)throw Error('G1_MERGE_RESPONSE_LIMIT');chunks.push(next.value);}
  } finally {await reader.cancel().catch(()=>undefined);}
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}
async function api(path:string,method='GET',body?:unknown,write=false) {
  if(!path.startsWith(root+'/')&&path!=='/graphql')throw Error('G1_MERGE_API_PATH_INVALID');
  return json('https://api.github.com'+path,{method,headers:{Authorization:'Bearer '+(write?writeToken:readToken),
    Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','Content-Type':'application/json'},
    body:body===undefined?undefined:JSON.stringify(body)});
}
async function graph(query:string,variables:unknown,write=false) {
  const body=await api('/graphql','POST',{query,variables},write);
  if(body.errors||!body.data)throw Error('G1_MERGE_GRAPHQL_UNVERIFIED');
  return body.data;
}
async function assertMain() {
  if((await api(root+'/git/ref/heads/main')).object?.sha!==sha)throw Error('G1_MERGE_MAIN_MOVED');
}
async function fresh():Promise<G1Drift> {
  const endpoint=process.env.ACTIONS_ID_TOKEN_REQUEST_URL, requestToken=process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN;
  if(!endpoint||!requestToken)throw Error('G1_MERGE_OIDC_CONTEXT_MISSING');
  const url=new URL(endpoint);
  if(url.protocol!=='https:'||url.username||url.password||
    !(url.hostname==='actions.githubusercontent.com'||url.hostname.endsWith('.actions.githubusercontent.com')))
    throw Error('G1_MERGE_OIDC_HOST_INVALID');
  url.searchParams.set('audience',GITHUB_OIDC_POLICY.audience);
  const token=await json(url.toString(),{headers:{Authorization:'bearer '+requestToken}},32768);
  if(typeof token.value!=='string'||token.value.length<32||token.value.length>16384)throw Error('G1_MERGE_OIDC_UNVERIFIED');
  const status=await json(GITHUB_OIDC_POLICY.audience+'/status/'+jobId+'?sha='+sha+'&g1=1',
    {headers:{Authorization:'Bearer '+token.value}},32768);
  const g=status.g1;
  if(status.jobId!==jobId||status.requestedSha!==sha||status.runtimeRevision!==sha||status.status!=='succeeded'||
    status.phase!=='attested'||status.rollbackStatus!=='not_needed'||status.healthOk!==true||status.oauthOk!==true||
    status.mcpAuthOk!==true||g?.status!=='DRIFT'||g.sha!==sha)throw Error('G1_MERGE_FRESH_DRIFT_UNVERIFIED');
  return g;
}
async function readNative(number:number) {
  let cursor:string|null=null,base:any=null,unresolvedThreads=0;
  for(let page=0;page<5;page++){
    const data=await graph('query($owner:String!,$name:String!,$number:Int!,$cursor:String){repository(owner:$owner,name:$name){pullRequest(number:$number){id number state isDraft isCrossRepository headRefOid baseRefOid headRefName baseRefName mergeable mergeStateStatus reviewDecision reviewThreads(first:100,after:$cursor){nodes{isResolved} pageInfo{hasNextPage endCursor}}}}}',
      {owner,name,number,cursor});
    const pr=data.repository?.pullRequest, threads=pr?.reviewThreads;
    if(!pr||pr.number!==number||typeof pr.id!=='string'||!Array.isArray(threads?.nodes)||threads.nodes.length>100||
      threads.nodes.some((t:any)=>typeof t?.isResolved!=='boolean'))throw Error('G1_MERGE_THREAD_EVIDENCE_UNVERIFIED');
    if(base&&(base.headRefOid!==pr.headRefOid||base.baseRefOid!==pr.baseRefOid||base.reviewDecision!==pr.reviewDecision||
      base.isDraft!==pr.isDraft||base.state!==pr.state))throw Error('G1_MERGE_PR_CHANGED_DURING_READ');
    base=pr;unresolvedThreads+=threads.nodes.filter((t:any)=>!t.isResolved).length;
    if(threads.pageInfo?.hasNextPage===false)return {...base,unresolvedThreads};
    if(threads.pageInfo?.hasNextPage!==true||typeof threads.pageInfo.endCursor!=='string'||threads.pageInfo.endCursor===cursor)
      throw Error('G1_MERGE_THREAD_PAGINATION_INVALID');
    cursor=threads.pageInfo.endCursor;
  }
  throw Error('G1_MERGE_THREAD_PAGINATION_LIMIT');
}

async function main() {
  await assertMain();
  const candidates=await api(root+'/pulls?state=open&base=main&head='+encodeURIComponent(owner+':'+branch)+'&per_page=100');
  if(!Array.isArray(candidates)||candidates.length!==1||!Number.isSafeInteger(candidates[0]?.number))
    throw Error('G1_MERGE_NATIVE_CORRECTION_UNRESOLVED');
  const number:number=candidates[0].number, initial=await api(root+'/pulls/'+number);
  const head:string=initial.head?.sha;
  if(!/^[0-9a-f]{40}$/.test(head??''))throw Error('G1_MERGE_HEAD_INVALID');
  const baseline=await readFile(G1_MANIFEST,'utf8');
  const committed=await api(root+'/contents/'+G1_MANIFEST+'?ref='+head);
  if(committed.encoding!=='base64'||typeof committed.content!=='string'||committed.content.length>2*1024*1024)
    throw Error('G1_MERGE_CANDIDATE_CONTENT_UNVERIFIED');
  const candidate=Buffer.from(committed.content,'base64').toString('utf8');
  const compare=await api(root+'/compare/'+sha+'...'+head);
  async function verifyCandidate(){
    await assertMain();
    const current=await api(root+'/pulls/'+number);
    const evidence=await fresh();
    validateG1MergeCandidate({baseSha:sha,headSha:head,branch,pr:current,compare,
      baseManifest:baseline,candidateManifest:candidate,freshEvidence:evidence,now:Date.now()});
  }
  await verifyCandidate();
  const integration=validateG1BranchRules(await api(root+'/rules/branches/main'));
  async function ci() {
    const [runs,checks]=await Promise.all([
      api(root+'/actions/workflows/mcp-ci.yml/runs?head_sha='+head+'&event=push&per_page=100'),
      api(root+'/commits/'+head+'/check-runs?per_page=100&filter=all')
    ]);
    return exactG1CiState({runs,checks,headSha:head,branch,integration});
  }
  // Bounded polling of the existing exact-head CI, not a second CI workflow.
  let native:any=null;
  for(let attempt=0;attempt<48&&Date.now()<deadline;attempt++) {
    await assertMain();
    if(await ci()==='SUCCESS'){
      native=await readNative(number);
      if(validateG1NativePrState({pr:native,headSha:head,baseSha:sha,branch,requireReady:false})==='SUCCESS')break;
    }
    native=null;await delay(10000);
  }
  if(!native)throw Error('G1_MERGE_CI_PENDING');
  if(await findG1OpenCorrection(path=>api(path),number)!==null)throw Error('G1_MERGE_COMPETING_CORRECTION');
  await verifyCandidate();
  if(native.isDraft) {
    const ready=await graph('mutation($id:ID!){markPullRequestReadyForReview(input:{pullRequestId:$id}){pullRequest{id isDraft headRefOid}}}',
      {id:native.id},true);
    const pr=ready.markPullRequestReadyForReview?.pullRequest;
    if(pr?.id!==native.id||pr.isDraft!==false||pr.headRefOid!==head)throw Error('G1_MERGE_READY_UNVERIFIED');
  }
  native=null;
  for(let attempt=0;attempt<12&&Date.now()<deadline;attempt++){
    await assertMain();
    if(await ci()==='SUCCESS'){
      const pr=await readNative(number);
      if(validateG1NativePrState({pr,headSha:head,baseSha:sha,branch,requireReady:true})==='SUCCESS'){native=pr;break;}
    }
    await delay(5000);
  }
  if(!native)throw Error('G1_MERGE_NATIVE_GATE_NOT_CLEAN');
  if(await findG1OpenCorrection(path=>api(path),number)!==null)throw Error('G1_MERGE_COMPETING_CORRECTION');
  await verifyCandidate();
  if(validateG1BranchRules(await api(root+'/rules/branches/main'))!==integration||await ci()!=='SUCCESS')
    throw Error('G1_MERGE_GATE_CHANGED');
  const final=await readNative(number);
  if(validateG1NativePrState({pr:final,headSha:head,baseSha:sha,branch,requireReady:true})!=='SUCCESS')
    throw Error('G1_MERGE_NATIVE_GATE_CHANGED');
  const [contractsProjection,graphProjection]=await Promise.all(
    ['.mcp/gwc-contracts.json','.mcp/gwc-workflow-graph.json'].map(async path=>JSON.parse(await readFile(path,'utf8'))));
  const substrate=createGovernedContractSubstrate({contractsProjection,graphProjection,expectedSchemaVersion:1,
    expectedContractRegistryDigest:contractsProjection.registryDigest,expectedGraphRegistryDigest:graphProjection.registryDigest});
  // reviewsSatisfied derives from native CLEAN + zero unresolved threads and
  // the verified branch policy, never from fabricated human approval.
  const review=evaluateGw62DocumentationCiReview({expectedHeadSha:head,evidence:{pullRequestNumber:number,headSha:head,
    ciConclusion:'success',reviewsSatisfied:true,unresolvedThreads:final.unresolvedThreads,observedAt:new Date().toISOString()}},substrate);
  if(review.status!=='SUCCESS')throw Error('G1_MERGE_GW62_REJECTED');
  const plan=planGw63DocumentationExactHeadMerge({repository:G1_REPOSITORY,pullRequestNumber:number,expectedHeadSha:head,
    mergeMethod:'squash',reviewProof:{status:'SUCCESS',headSha:head,pullRequestNumber:number}},substrate);
  if(plan.status!=='READY'||plan.effectPlan?.toolName!=='github_merge_pull_request'||plan.effectPlan.expectedHeadSha!==head)
    throw Error('G1_MERGE_GW63_REJECTED');
  await assertMain();
  const merged=await api(root+'/pulls/'+number+'/merge','PUT',{sha:head,merge_method:'squash'},true);
  if(merged.merged!==true||!/^[0-9a-f]{40}$/.test(merged.sha??''))throw Error('G1_MERGE_RESPONSE_UNVERIFIED');
  // Mutation is never replayed on ambiguous response. Read the resulting
  // main separately; the ordinary push Governed Deploy owns reattestation.
  const observed=(await api(root+'/git/ref/heads/main')).object?.sha;
  if(observed!==merged.sha)throw Error('G1_MERGE_READBACK_PENDING');
  const receipt={status:'MERGED_AWAITING_GOVERNED_DEPLOY',pr:number,headSha:head,baseSha:sha,mergeSha:merged.sha};
  console.log(JSON.stringify(receipt));
  if(process.env.GITHUB_STEP_SUMMARY)await appendFile(process.env.GITHUB_STEP_SUMMARY,
    '\n### G1 exact-head correction merged; reattestation pending\n\nPR #'+number+'; merge SHA '+merged.sha+'\n');
}
try {await main();} catch(e) {
  const code=e instanceof Error&&/^G1_MERGE_[A-Z0-9_]{2,100}$/.test(e.message)?e.message:'G1_MERGE_UNVERIFIED';
  if(process.env.GITHUB_STEP_SUMMARY)await appendFile(process.env.GITHUB_STEP_SUMMARY,
    '\n### G1 native merge blocked or readback pending\n\n'+code+'\n');
  console.error(code);process.exitCode=1;
}
