/**
 * Generic MCP S1 ↔ GitHub main reconciliation policy (E2).
 *
 * Existing authority remains GitHub-first. Local changes are classified before
 * any write. The safe converged case is an exact byte match to already-approved
 * main; unpublished S1 changes are promoted to a proposed GitHub review workflow
 * without permitting direct pushes, automatic protected-branch merges or uploads
 * of secrets. No new MCP task, claim, lock, or deploy authority is granted.
 */
export type McpS1FileChange=Readonly<{
  path:string;
  kind:'MODIFIED'|'ADDED'|'DELETED'|'RENAMED'|'UNTRACKED'|'UNKNOWN';
  localGitBlob:string|null;
  approvedMainGitBlob:string|null;
  sizeBytes:number|null;
  secretScan:'CLEAR'|'SENSITIVE'|'UNKNOWN';
}>;
export type McpReconcileObservation=Readonly<{
  s1Head:string|null;
  s1OriginMainSha:string|null;
  githubMainHead:string|null;
  runtimeRevision:string|null;
  s1Branch:string;
  s1OriginFetch:string;
  s1OriginPush:string;
  githubMainAncestorOfS1:boolean|null;
  s1AncestorOfGithubMain:boolean|null;
  s1WorkingTreeClean:boolean|null;
  runtimeHealthy:boolean|null;
  documentationAligned:boolean|null;
  files:readonly McpS1FileChange[];
  allChangesEnumerated:boolean;
  collisionFree:boolean;
  evidenceCurrent:boolean;
}>;
export type McpReconcileDecision=Readonly<{
  status:'FULLY_ALIGNED'|'FAST_FORWARD_CANDIDATE'|'RUNTIME_REDEPLOY_CANDIDATE'|
    'APPROVED_LOCAL_CONTENT_CANDIDATE'|'S1_TO_GITHUB_REVIEW_REQUIRED'|'BLOCKED';
  blockers:readonly string[];
  paths:readonly string[];
  canAutomaticallyPrepareGitHubPR:boolean;
  canAutomaticallyAdvanceS1Git:boolean;
  canAutomaticallyMergeMain:false;
  canAutomaticallyDeploy:false;
}>;
const SHA=/^[0-9a-f]{40}$/;
const FETCH_REMOTE='git@github.com-mcp-patricked-ro:Patricked-code/MCP.git';
const PUSH_REMOTE='disabled://mcp-s1-read-only';
const RESERVED=/(^|\/)(?:\.git|\.mcp_backups|node_modules|dist|build|coverage|keys|secrets|\.env(?:\.|$))|(?:\.pem|\.p8|\.key|\.crt|\.p12|\.sql|\.dump)$/i;
const safe=(path:string)=>path.length>0&&path.length<=260
  &&!path.startsWith('/')&&!path.includes('..')
  &&!path.includes('\\')&&!/[\x00-\x1f]/.test(path)
  &&!RESERVED.test(path);
const result=(status:McpReconcileDecision['status'],blockers:string[],paths:string[],
  prepare:boolean,advance:boolean):McpReconcileDecision=>({
  status,blockers,paths,canAutomaticallyPrepareGitHubPR:prepare,
  canAutomaticallyAdvanceS1Git:advance,
  canAutomaticallyMergeMain:false,canAutomaticallyDeploy:false
});
export function assessMcpS1ToMainReconciliation(
  observation:McpReconcileObservation
):McpReconcileDecision{
  const b:string[]=[];
  const paths:string[]=[];
  if(!observation.evidenceCurrent||!observation.allChangesEnumerated)
    b.push('EVIDENCE_INCOMPLETE_OR_STALE');
  if(!observation.collisionFree)b.push('CONCURRENT_GOVERNED_OPERATION');
  if(!SHA.test(observation.githubMainHead??'')
    ||!SHA.test(observation.s1OriginMainSha??'')
    ||!SHA.test(observation.s1Head??'')
    ||!SHA.test(observation.runtimeRevision??''))b.push('REVISION_UNVERIFIED');
  if(observation.s1Branch!=='main'
    ||observation.s1OriginFetch!==FETCH_REMOTE
    ||observation.s1OriginPush!==PUSH_REMOTE)b.push('GIT_IDENTITY_MISMATCH');
  if(observation.runtimeHealthy!==true)b.push('MCP_RUNTIME_NOT_HEALTHY');
  if(observation.documentationAligned!==true)b.push('MCP_DOCUMENTATION_NOT_RECONCILED');
  if(observation.files.length>100)b.push('TOO_MANY_LOCAL_CHANGES');
  const unique=new Set<string>();
  for(const file of observation.files){
    if(!safe(file.path)||unique.has(file.path))b.push('UNSAFE_OR_DUPLICATE_PATH');
    unique.add(file.path);paths.push(file.path);
    if(file.secretScan!=='CLEAR')b.push('SENSITIVE_OR_UNVERIFIED_CONTENT');
    if(file.sizeBytes===null||file.sizeBytes>1_000_000||file.sizeBytes<0)
      b.push('UNBOUNDED_FILE');
  }
  if(observation.files.length===0&&observation.s1WorkingTreeClean===false)
    b.push('WORKTREE_DIRTY_WITHOUT_INVENTORY');
  if(observation.s1WorkingTreeClean===true&&observation.files.length!==0)
    b.push('WORKTREE_INVENTORY_CONFLICT');
  if(b.length)return result('BLOCKED',[...new Set(b)],paths,false,false);

  const sameHead=observation.s1Head===observation.githubMainHead;
  if(observation.s1OriginMainSha!==observation.s1Head)
    return result('BLOCKED',['S1_ORIGIN_MAIN_DRIFT'],paths,false,false);
  if(sameHead&&observation.s1WorkingTreeClean===true
    &&observation.runtimeRevision===observation.s1Head)
    return result('FULLY_ALIGNED',[],[],false,false);
  if(sameHead&&observation.s1WorkingTreeClean===true
    &&observation.runtimeRevision!==observation.githubMainHead)
    return result('RUNTIME_REDEPLOY_CANDIDATE',[],[],false,false);
  if(!sameHead&&observation.s1AncestorOfGithubMain===true
    &&observation.s1WorkingTreeClean===true)
    return result('FAST_FORWARD_CANDIDATE',[],[],false,true);
  const allApproved=observation.files.length>0&&
    observation.files.every(f=>f.kind==='MODIFIED'&&
      SHA.test(f.localGitBlob??'')&&f.localGitBlob===f.approvedMainGitBlob);
  if(!sameHead&&observation.s1AncestorOfGithubMain===true&&allApproved)
    return result('APPROVED_LOCAL_CONTENT_CANDIDATE',[],paths,false,true);
  if(observation.files.length>0
    &&(sameHead||observation.s1AncestorOfGithubMain===true)
    &&observation.githubMainAncestorOfS1!==true
    &&observation.files.every(f=>
      f.kind==='MODIFIED'||f.kind==='ADDED'||f.kind==='DELETED'||f.kind==='RENAMED'))
    return result('S1_TO_GITHUB_REVIEW_REQUIRED',[],paths,true,false);
  return result('BLOCKED',['UNSUPPORTED_OR_DIVERGED_GIT_STATE'],paths,false,false);
}
