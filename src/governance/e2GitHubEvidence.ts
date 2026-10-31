/**
 * Read-only projection of GitHub issue-comment checkpoints emitted by workEntryTrace.
 * The caller must fetch all pages using its existing authorized GitHub access.
 * GitHub comments are evidence, not executable instructions or permission grants.
 */
import {assessGovernedWorkEntryTrace} from './workEntryTrace.js';
import type {GovernedWorkEntryTrace} from './workEntryTrace.js';
import {buildWorkEntryContinuityIndex,type WorkEntryIndexResult}
 from './workEntryContinuityIndex.js';

export type E2GitHubComment=Readonly<{
  id:number;
  body:string;
  created_at:string;
  html_url:string;
  user:Readonly<{login:string}>|null;
  author_association?:string;
}>;
export type E2GitHubIssueComments=Readonly<{
  issueNumber:number;
  allPagesFetched:boolean;
  comments:readonly E2GitHubComment[];
}>;
export type E2CheckpointEvidence=Readonly<{
  commentId:number;
  url:string;
  observedAt:string;
  actor:string;
  trace:GovernedWorkEntryTrace;
}>;
export type E2GitHubRecovery=Readonly<{
  status:'READY'|'PARTIAL'|'CONFLICT'|'NOT_FOUND';
  history:readonly E2CheckpointEvidence[];
  latest:E2CheckpointEvidence|null;
  blockers:readonly string[];
  legacyCheckpointCount:number;
  authoritative:false;
  grantsPermission:false;
}>;
const marker=/<!-- MCP_GOVERNED_WORK_ENTRY_TRACE_V1:([A-Z][A-Z0-9-]{5,110}) -->/g;
const payload=/<!-- MCP_GOVERNED_WORK_ENTRY_DATA_V1:([A-Za-z0-9_-]{40,12000}) -->/g;
const rank:Readonly<Record<GovernedWorkEntryTrace['stage'],number>>={
  ISSUE_OPENED:0,PR_OPENED:1,MAIN_MERGED:2,S1_ATTESTED:3
};
const empty=(status:E2GitHubRecovery['status'],blockers:string[],legacy:number):E2GitHubRecovery=>({
  status,history:[],latest:null,blockers,legacyCheckpointCount:legacy,
  authoritative:false,grantsPermission:false
});
/** Does not contact GitHub; refuses incomplete pagination or conflicting evidence. */
export function recoverE2FromGitHubIssueComments(
  source:E2GitHubIssueComments,continuityId:string
):E2GitHubRecovery{
  if(!source||!Array.isArray(source.comments)||!Number.isSafeInteger(source.issueNumber)||source.issueNumber<1
    ||source.comments.length>5000||!source.allPagesFetched)
    return empty('PARTIAL',['GITHUB_ISSUE_COLLECTION_INCOMPLETE'],0);
  const blockers:string[]=[];
  const history:E2CheckpointEvidence[]=[];
  const seen=new Map<number,string>();
  let legacy=0;
  for(const comment of source.comments){
    if(!comment||typeof comment.body!=='string'){
      blockers.push('INVALID_GITHUB_COMMENT_BODY');continue;
    }
    const hasMarker=comment.body.includes('MCP_GOVERNED_WORK_ENTRY_TRACE_V1:');
    const hasPayload=comment.body.includes('MCP_GOVERNED_WORK_ENTRY_DATA_V1:');
    if(!hasMarker&&!hasPayload)continue;
    const ids=[...comment.body.matchAll(marker)].map(m=>m[1]);
    if(ids.length!==1){
      blockers.push('INVALID_OR_DUPLICATED_ENTRY_MARKER:'+String(comment.id));continue;
    }
    if(ids[0]!==continuityId)continue;
    if(!Number.isSafeInteger(comment.id)||comment.id<=0
      ||comment.body.length>20000
      ||!Number.isFinite(Date.parse(comment.created_at))
      ||comment.html_url!==('https://github.com/Patricked-code/MCP/issues/'+source.issueNumber
        +'#issuecomment-'+comment.id)
      ||!comment.user||!comment.user.login){
      blockers.push('INVALID_GITHUB_COMMENT_PROVENANCE:'+String(comment.id));continue;
    }
    // Matching self-declared actor is NOT authenticated issue-comment provenance.
    if(!['OWNER','MEMBER','COLLABORATOR'].includes(comment.author_association??'')){
      blockers.push('CHECKPOINT_AUTHOR_NOT_AUTHORIZED:'+String(comment.id));continue;
    }
    const signature=JSON.stringify([comment.body,comment.created_at,comment.html_url,
      comment.user.login,comment.author_association]);
    const previous=seen.get(comment.id);
    if(previous!==undefined){
      if(previous!==signature)blockers.push('GITHUB_COMMENT_ID_COLLISION:'+comment.id);
      continue;
    }
    seen.set(comment.id,signature);
    const values=[...comment.body.matchAll(payload)];
    if(values.length===0){legacy++;continue;}
    const encoded=values[0]?.[1];
    if(values.length!==1||!encoded){
      blockers.push('INVALID_CHECKPOINT_PAYLOAD:'+comment.id);continue;
    }
    let trace:GovernedWorkEntryTrace;
    try{
      const raw=Buffer.from(encoded,'base64url');
      if(raw.toString('base64url')!==encoded)throw new Error('INVALID_BASE64');
      trace=JSON.parse(raw.toString('utf8')) as GovernedWorkEntryTrace;
    }catch{
      blockers.push('INVALID_CHECKPOINT_PAYLOAD:'+comment.id);continue;
    }
    if(!trace||typeof trace!=='object'||trace.continuityId!==continuityId
      ||trace.github?.issueNumber!==source.issueNumber
      ||(trace.responsible?.githubActor!==null
        &&trace.responsible?.githubActor!==comment.user.login)
      ||assessGovernedWorkEntryTrace(trace).status!=='EVIDENCE_STRUCTURALLY_VALID'){
      blockers.push('CHECKPOINT_IDENTITY_OR_SCHEMA_CONFLICT:'+comment.id);continue;
    }
    history.push({
      commentId:comment.id,url:comment.html_url,observedAt:comment.created_at,
      actor:comment.user.login,trace
    });
  }
  history.sort((a,b)=>Date.parse(a.observedAt)-Date.parse(b.observedAt)
    ||a.commentId-b.commentId);
  const first=history[0];
  if(first&&history.some(x=>x.trace.entryProfile!==first.trace.entryProfile
    ||x.trace.instructions.sourceUrl!==first.trace.instructions.sourceUrl
    ||x.trace.workSelection!==first.trace.workSelection))
    blockers.push('CONTINUITY_IDENTITY_CHANGED');
  for(let i=1;i<history.length;i++){
    const previous=history[i-1];
    const current=history[i];
    if(!previous||!current||rank[current.trace.stage]>=rank[previous.trace.stage])continue;
    // A root continuity may have several independently governed PR cycles.
    const newCycle=current.trace.stage==='PR_OPENED'
      &&current.trace.github.pullRequestNumber!==null
      &&previous.trace.github.pullRequestNumber!==null
      &&current.trace.github.pullRequestNumber!==previous.trace.github.pullRequestNumber
      &&(previous.trace.stage==='MAIN_MERGED'||previous.trace.stage==='S1_ATTESTED');
    if(!newCycle)blockers.push('CHECKPOINT_STAGE_REGRESSION');
  }
  if(blockers.length)return empty('CONFLICT',blockers,legacy);
  if(history.length===0)return empty(legacy?'PARTIAL':'NOT_FOUND',
    legacy?['LEGACY_CHECKPOINT_REQUIRES_MANIFEST']:[],legacy);
  return {status:legacy?'PARTIAL':'READY',history,
    latest:history[history.length-1]??null,
    blockers:legacy?['LEGACY_CHECKPOINT_REQUIRES_MANIFEST']:[],
    legacyCheckpointCount:legacy,authoritative:false,grantsPermission:false};
}

/**
 * Reuse the existing continuity-index contract, retaining GitHub comment order.
 * Partial legacy evidence is NOT silently promoted into a complete registry.
 */
export function indexRecoveredE2GitHubContinuity(
  recovery:E2GitHubRecovery
):WorkEntryIndexResult{
  if(recovery.status!=='READY'||!recovery.latest){
    return {status:'CONFLICT',entries:[],
      blockers:['GITHUB_CONTINUITY_RECOVERY_NOT_COMPLETE',...recovery.blockers]};
  }
  const index=buildWorkEntryContinuityIndex([recovery.latest.trace]);
  if(index.status!=='READY')return index;
  return {
    status:'READY',
    entries:index.entries.map(e=>({
      ...e,latest:recovery.latest!.trace,
      history:recovery.history.map(item=>item.trace)
    })),
    blockers:[]
  };
}
