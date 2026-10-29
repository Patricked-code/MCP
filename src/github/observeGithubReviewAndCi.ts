/**
 * GD-U-02D-B3c — actual authenticated GitHub PR/review/CI observations.
 * Read-only, exact PR head and current independent approvals only.
 *
 * This is evidence for the EXISTING governed review gate, not a
 * merge decision, privileged grant, Plesk authorization or CI bypass.
 */
import type { TrustedPleskReleaseAttestation } from '../provisioning/pleskGovernedReleaseGate.js';
import type { GitHubJsonResponse } from './connection.js';

type Response=Pick<GitHubJsonResponse,'ok'|'status'|'json'>;
export type GithubReviewCiProbeInput=Readonly<{
  repository:string;
  pullRequestNumber:number;
  expectedHeadSha:string;
  expectedWorkflow:string;
  now:()=>Date;
  request:(endpoint:string)=>Promise<Response>;
}>;
export type GithubReviewCiProbeResult=Readonly<{
  status:'PROVIDER_APPROVED'|'BLOCKED';
  attestation:TrustedPleskReleaseAttestation|null;
  runtimeWriteAuthorized:false;
  operationExecuted:false;
}>;
const SHA=/^[a-f0-9]{40}$/;
const OWNER=/^[a-z0-9](?:[a-z0-9-]{0,38})$/i;
const REPO=/^[a-z0-9_.-]{1,100}$/i;
const blocked=():GithubReviewCiProbeResult=>({
  status:'BLOCKED',attestation:null,runtimeWriteAuthorized:false,
  operationExecuted:false
});
const obj=(value:unknown):Record<string,unknown>|null=>
  value!==null&&typeof value==='object'&&!Array.isArray(value)
    ?value as Record<string,unknown>:null;
const name=(value:unknown):string|null=>{
  const login=obj(value)?.login;
  return typeof login==='string'&&/^[a-z0-9-]{1,39}$/i.test(login)?login:null;
};

export async function observeGithubReviewAndCi(
  input:GithubReviewCiProbeInput
):Promise<GithubReviewCiProbeResult>{
  const parts=input.repository?.split('/')??[];
  if(parts.length!==2||!OWNER.test(parts[0]!)||!REPO.test(parts[1]!)
      ||parts[1]==='.'||parts[1]==='..'
      ||!SHA.test(input.expectedHeadSha)
      ||!Number.isSafeInteger(input.pullRequestNumber)
      ||input.pullRequestNumber<1
      ||!input.expectedWorkflow||input.expectedWorkflow.length>100
      ||!/^[a-zA-Z0-9 _.-]+$/.test(input.expectedWorkflow))return blocked();

  const prefix='/repos/'+parts.map(encodeURIComponent).join('/');
  const prPath=prefix+'/pulls/'+input.pullRequestNumber;
  const reviewsPath=prPath+'/reviews?per_page=100';
  const workflowsPath=prefix+'/actions/runs?head_sha='+input.expectedHeadSha+'&per_page=100';
  try{
    const prResponse=await input.request(prPath);
    const pr=obj(prResponse.json);
    const head=obj(pr?.head);
    const author=name(pr?.user);
    if(!prResponse.ok||prResponse.status!==200
      ||pr?.state!=='open'||pr?.draft!==false
      ||head?.sha!==input.expectedHeadSha||!author)return blocked();

    const reviewsResponse=await input.request(reviewsPath);
    const workflowsResponse=await input.request(workflowsPath);
    const rawReviews=reviewsResponse.json;
    const rawRuns=obj(workflowsResponse.json)?.workflow_runs;
    if(!reviewsResponse.ok||reviewsResponse.status!==200
      ||!workflowsResponse.ok||workflowsResponse.status!==200
      ||!Array.isArray(rawReviews)||rawReviews.length>=100
      ||!Array.isArray(rawRuns)||rawRuns.length>=100)return blocked();

    // Only decisive review states supersede a previous review: later
    // COMMENTED/PENDING states do not revoke an approval, whereas
    // CHANGES_REQUESTED and DISMISSED are decisive. Ties fail closed.
    const latest=new Map<string,{state:string;commit:string;submittedAt:number;actorType:string|null}>();
    // GitHub review timestamps have finite precision. Conflicting states at
    // the same instant are ambiguous, regardless of API array ordering.
    const ambiguousReviewers=new Set<string>();
    for(const item of rawReviews){
      const review=obj(item);
      const reviewer=name(review?.user);
      const actorType=obj(review?.user)?.type;
      const state=review?.state;
      if(state==='COMMENTED'||state==='PENDING')continue;
      const timestamp=Date.parse(String(review?.submitted_at??''));
      if(!reviewer||!Number.isFinite(timestamp)
        ||typeof state!=='string')return blocked();
      const key=reviewer.toLowerCase();
      const old=latest.get(key);
      const commit=String(review?.commit_id??'');
      const type=typeof actorType==='string'?actorType:null;
      if(old&&timestamp===old.submittedAt
        &&(state!==old.state||commit!==old.commit||type!==old.actorType))
        ambiguousReviewers.add(key);
      // A strictly newer review resolves an earlier same-time ambiguity.
      if(old&&timestamp>old.submittedAt)ambiguousReviewers.delete(key);
      if(!old||timestamp>=old.submittedAt)latest.set(key,{
        state,commit,submittedAt:timestamp,actorType:type
      });
    }
    // A distinct reviewer with an outstanding CHANGES_REQUESTED blocks release
    // irrespective of any other successful approval or CI.
    if([...latest.entries()].some(([reviewer,r])=>
      reviewer!==author.toLowerCase()
      &&(r.state==='CHANGES_REQUESTED'||ambiguousReviewers.has(reviewer))
    ))return blocked();

    // A GitHub API review object is not a valid independent approval by itself.
    // Bots, outsiders, and read-only accounts must never satisfy an admin
    // release gate. Reuse GitHub's current effective repository permission.
    const approvedCandidates=[...latest.entries()].filter(([reviewer,r])=>
      reviewer!==author.toLowerCase()
      &&!ambiguousReviewers.has(reviewer)
      &&r.actorType==='User'
      &&r.state==='APPROVED'
      &&r.commit===input.expectedHeadSha
    );
    let approvedReviewer:string|null=null;
    for(const [reviewer] of approvedCandidates){
      const permissionPath=prefix+'/collaborators/'+encodeURIComponent(reviewer)+'/permission';
      const response=await input.request(permissionPath);
      const effectivePermission=obj(response.json)?.permission;
      if(response.ok&&response.status===200
        &&(effectivePermission==='write'
          ||effectivePermission==='maintain'
          ||effectivePermission==='admin')){
        approvedReviewer=reviewer;
        break;
      }
    }
    if(!approvedReviewer)return blocked();

    // Choose latest matching workflow run, never an older successful run
    // after a newer failure on the same PR head.
    const matches=rawRuns.map(item=>obj(item)).filter((x):x is Record<string,unknown>=>x!==null)
      .filter(x=>x.head_sha===input.expectedHeadSha
        &&x.name===input.expectedWorkflow&&x.event==='pull_request'
        // A successful run on the same SHA may belong to a DIFFERENT PR
        // with another merge context. Never trust SHA alone for release.
        &&Array.isArray(x.pull_requests)
        &&x.pull_requests.some((associated:unknown)=>
          obj(associated)?.number===input.pullRequestNumber));
    if(matches.length===0)return blocked();
    const ordered=matches.sort((a,b)=>Number(b.run_number)-Number(a.run_number));
    const latestRun=ordered[0];
    if(!latestRun||!Number.isSafeInteger(latestRun.run_number)
      ||latestRun.status!=='completed'||latestRun.conclusion!=='success')return blocked();

    // TOCTOU: the PR may have changed between the first HEAD read and the
    // review/CI/permission observations. Re-observe its exact HEAD before
    // producing even a read-only attestation.
    const finalPrResponse=await input.request(prPath);
    const finalPr=obj(finalPrResponse.json);
    if(!finalPrResponse.ok||finalPrResponse.status!==200
      ||finalPr?.state!=='open'||finalPr?.draft!==false
      ||obj(finalPr?.head)?.sha!==input.expectedHeadSha
      ||name(finalPr?.user)!==author)return blocked();
    const at=input.now().toISOString();
    return {
      status:'PROVIDER_APPROVED',
      attestation:{
        source:'SERVER_VALIDATED_GITHUB_API',
        at,repository:input.repository,pr:input.pullRequestNumber,
        headSha:input.expectedHeadSha,
        workflowConcludedSuccess:true,
        independentReviewApproved:true,
        reviewer:approvedReviewer,
        prAuthor:author,
        approvalHeadSha:input.expectedHeadSha
      },
      runtimeWriteAuthorized:false,
      operationExecuted:false
    };
  }catch{return blocked();}
}

/** Existing authenticated GitHub connector, no new credentials or tokens. */
export async function observeGithubReviewAndCiUsingExistingCredential(
  args:Omit<GithubReviewCiProbeInput,'request'|'now'>
):Promise<GithubReviewCiProbeResult>{
  const {githubJsonRequestWithServerCredential}=await import('./connection.js');
  return observeGithubReviewAndCi({
    ...args,
    now:()=>new Date(),
    request:path=>githubJsonRequestWithServerCredential(path,{method:'GET',timeoutMs:5_000})
  });
}
