import { G1_MANIFEST, G1_REPOSITORY, prepareG1Candidate, type G1Drift } from './g1Documentation.js';

const SHA=/^[a-f0-9]{40}$/;
const MAX_CANDIDATE_AGE_MS=30*60_000;
type RecordLike=Record<string,any>;
export function validateG1MergeCandidate(input:{
  baseSha:string; headSha:string; branch:string; pr:RecordLike; compare:RecordLike;
  baseManifest:string; candidateManifest:string; freshEvidence:G1Drift; now:number
}):void {
  const {baseSha,headSha,branch,pr,compare,baseManifest,candidateManifest,freshEvidence,now}=input;
  if(!SHA.test(baseSha)||!SHA.test(headSha)||headSha===baseSha||branch!=='mcp/docs-reconcile-'+baseSha||
    pr.state!=='open'||pr.merged!==false||pr.head?.sha!==headSha||pr.head?.ref!==branch||
    pr.head?.repo?.full_name!==G1_REPOSITORY||pr.base?.repo?.full_name!==G1_REPOSITORY||
    pr.base?.ref!=='main'||pr.base?.sha!==baseSha||pr.commits!==1||pr.changed_files!==1||
    compare.status!=='ahead'||compare.ahead_by!==1||compare.behind_by!==0||
    !Array.isArray(compare.files)||compare.files.length!==1||compare.files[0]?.filename!==G1_MANIFEST||
    compare.files[0]?.status!=='modified'||compare.files[0]?.previous_filename!==undefined)
    throw Error('G1_MERGE_CANDIDATE_SCOPE_MISMATCH');
  // A new observation, not the PR's self-declared time, authorizes the repair.
  // Rebuild from the historical timestamp only to prove byte-exact equivalence.
  prepareG1Candidate(baseManifest,freshEvidence,baseSha,now);
  const manifest=JSON.parse(candidateManifest);
  const priorAt=manifest.githubObservedAt;
  const priorVersion=/^G1_GOVERNED_DEPLOY_EXACT_SHA_LIVESTATE_V([0-9]+)_/.exec(manifest.githubObservationBasis??'')?.[1];
  const priorTime=Date.parse(priorAt), freshTime=Date.parse(freshEvidence.observedAt);
  if(typeof priorAt!=='string'||!Number.isFinite(priorTime)||priorTime>freshTime||
    freshTime-priorTime>MAX_CANDIDATE_AGE_MS||!priorVersion||!Number.isSafeInteger(Number(priorVersion))||
    Number(priorVersion)<1||Number(priorVersion)>freshEvidence.stateVersion||
    candidateManifest!==prepareG1Candidate(baseManifest,{...freshEvidence,
      observedAt:priorAt,stateVersion:Number(priorVersion)},baseSha,priorTime))
    throw Error('G1_MERGE_CANDIDATE_BYTES_UNVERIFIED');
}

// No override of repository protections. Require the actual active branch
// rules and the exact configured CI integration, rather than asserting approval.
export function validateG1BranchRules(rules:unknown):number {
  if(!Array.isArray(rules)||!rules.length||rules.length>100)throw Error('G1_MERGE_RULES_UNVERIFIED');
  const reviews=rules.filter(r=>r?.type==='pull_request');
  const checks=rules.filter(r=>r?.type==='required_status_checks');
  if(!reviews.length||!checks.length||reviews.some(r=>{
    const p=r.parameters;
    return !p||p.required_approving_review_count!==0||p.require_code_owner_review!==false||
      p.require_last_push_approval!==false||p.required_review_thread_resolution!==true||
      (p.required_reviewers!==undefined&&(!Array.isArray(p.required_reviewers)||p.required_reviewers.length>0));
  }))throw Error('G1_MERGE_REVIEW_POLICY_REQUIRES_INTERVENTION');
  const required=checks.flatMap(r=>{
    if(r.parameters?.strict_required_status_checks_policy!==true||
      !Array.isArray(r.parameters.required_status_checks)||!r.parameters.required_status_checks.length)
      throw Error('G1_MERGE_STRICT_CI_POLICY_UNVERIFIED');
    return r.parameters.required_status_checks;
  });
  const validate=required.filter(r=>r?.context==='validate');
  const integration=validate[0]?.integration_id;
  if(!validate.length||!Number.isSafeInteger(integration)||integration<1||
    validate.some(r=>r.integration_id!==integration))throw Error('G1_MERGE_VALIDATE_INTEGRATION_UNVERIFIED');
  return integration;
}
export function exactG1CiState(input:{runs:RecordLike;checks:RecordLike;headSha:string;branch:string;integration:number}):'PENDING'|'SUCCESS' {
  const {runs,checks,headSha,branch,integration}=input;
  if(!Array.isArray(runs.workflow_runs)||!Array.isArray(checks.check_runs)||
    !Number.isSafeInteger(runs.total_count)||runs.total_count!==runs.workflow_runs.length||
    !Number.isSafeInteger(checks.total_count)||checks.total_count!==checks.check_runs.length)
    throw Error('G1_MERGE_CI_EVIDENCE_TRUNCATED');
  const exact=runs.workflow_runs.filter(r=>r.head_sha===headSha&&r.head_branch===branch&&r.event==='push'&&r.name==='MCP CI');
  if(!exact.length)return 'PENDING';
  if(exact.length!==runs.workflow_runs.length||exact.some(r=>!Number.isSafeInteger(r.id)))throw Error('G1_MERGE_CI_RUN_SCOPE_UNVERIFIED');
  const latest=[...exact].sort((a,b)=>b.id-a.id)[0]!;
  if(latest.status!=='completed')return 'PENDING';
  if(latest.conclusion!=='success')throw Error('G1_MERGE_CI_FAILED');
  if(checks.check_runs.some(r=>r.status!=='completed'))return 'PENDING';
  if(checks.check_runs.some(r=>r.head_sha!==headSha||!['success','neutral','skipped'].includes(r.conclusion)))
    throw Error('G1_MERGE_CHECK_FAILED_OR_MISMATCHED');
  return checks.check_runs.some(r=>r.name==='validate'&&r.app?.id===integration&&r.conclusion==='success')?'SUCCESS':'PENDING';
}
export function validateG1NativePrState(input:{pr:RecordLike;headSha:string;baseSha:string;branch:string;requireReady:boolean}):'PENDING'|'SUCCESS' {
  const {pr,headSha,baseSha,branch,requireReady}=input;
  if(pr.state!=='OPEN'||pr.isCrossRepository!==false||pr.headRefOid!==headSha||pr.baseRefOid!==baseSha||
    pr.headRefName!==branch||pr.baseRefName!=='main'||typeof pr.isDraft!=='boolean'||
    !Number.isSafeInteger(pr.unresolvedThreads)||pr.unresolvedThreads<0)
    throw Error('G1_MERGE_PR_BINDING_MISMATCH');
  if(pr.unresolvedThreads!==0||!['APPROVED',null].includes(pr.reviewDecision))throw Error('G1_MERGE_REVIEW_BLOCKED');
  if(pr.mergeable==='UNKNOWN')return 'PENDING';
  if(pr.mergeable!=='MERGEABLE')throw Error('G1_MERGE_CONFLICT');
  if(!requireReady)return 'SUCCESS';
  // CLEAN is the native non-bypass verdict; BLOCKED/BEHIND/UNSTABLE are
  // never treated as admissible, even if the application could bypass.
  if(pr.isDraft||pr.mergeStateStatus!=='CLEAN')return 'PENDING';
  return 'SUCCESS';
}
