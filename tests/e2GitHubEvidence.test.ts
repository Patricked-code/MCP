import assert from 'node:assert/strict';
import test from 'node:test';
import {recoverE2FromGitHubIssueComments,type E2GitHubComment}
 from '../src/governance/e2GitHubEvidence.js';
import {renderGovernedWorkEntryCheckpoint,type GovernedWorkEntryTrace}
 from '../src/governance/workEntryTrace.js';

const ID='MCP-PILOT-E2-01-CONT-20261030-ROOT-01';
const issueNumber=359;
const issueUrl='https://github.com/Patricked-code/MCP/issues/359';
const base:GovernedWorkEntryTrace={
 schemaVersion:1,continuityId:ID,repository:'Patricked-code/MCP',
 entryProfile:'EXTERNAL_GOVERNED_RECOVERY',
 workSelection:'OWNER_DIRECTLY_REQUESTED_WORK',explicitOwnerSelection:true,
 instructions:{summary:'Continue E2 governed pilot with GitHub evidence.',sourceUrl:issueUrl},
 responsible:{githubActor:'Patricked-code',internalTaskId:null},
 github:{issueNumber,branch:null,pullRequestNumber:null,headSha:null,mergeSha:null},
 checkpoint:{url:issueUrl,nextAction:'Reconcile before resuming existing work'},
 deployment:{workflowRunUrl:null,runtimeRevisionSha:null},
 stage:'ISSUE_OPENED'
};
const comment=(id:number,trace:GovernedWorkEntryTrace=base):E2GitHubComment=>({
 id,body:renderGovernedWorkEntryCheckpoint(trace),
 created_at:new Date(Date.UTC(2026,9,31,0,0,id)).toISOString(),
 html_url:issueUrl+'#issuecomment-'+id,user:{login:'Patricked-code'}
});
const source=(comments:readonly E2GitHubComment[],allPagesFetched=true)=>({
 issueNumber,comments,allPagesFetched
});
test('machine-readable checkpoint is append-only and remains human-readable',()=>{
 const text=renderGovernedWorkEntryCheckpoint(base);
 assert.match(text,/MCP_GOVERNED_WORK_ENTRY_TRACE_V1/);
 assert.match(text,/MCP_GOVERNED_WORK_ENTRY_DATA_V1/);
 assert.match(text,/NEXT_ACTION/);
});
test('recover existing E2 Continuity ID from authenticated GitHub comment envelope',()=>{
 const result=recoverE2FromGitHubIssueComments(source([comment(1)]),ID);
 assert.equal(result.status,'READY');
 assert.equal(result.latest?.trace.continuityId,ID);
 assert.equal(result.history.length,1);
 assert.equal(result.authoritative,false);
 assert.equal(result.grantsPermission,false);
});
test('duplicated pagination data is idempotent, but changed ID content is rejected',()=>{
 const c=comment(1);
 const dedup=recoverE2FromGitHubIssueComments(source([c,c]),ID);
 assert.equal(dedup.status,'READY');
 assert.equal(dedup.history.length,1);
 const corrupted={...c,body:c.body+'\nCHANGED'};
 assert.equal(recoverE2FromGitHubIssueComments(source([c,corrupted]),ID).status,'CONFLICT');
});
test('multiple checkpoints at the same stage keep append-only chronology',()=>{
 const next={...base,checkpoint:{...base.checkpoint,nextAction:'Continue same stage with new evidence'}};
 const result=recoverE2FromGitHubIssueComments(source([comment(2,next),comment(1)]),ID);
 assert.equal(result.status,'READY');
 assert.equal(result.history.length,2);
 assert.equal(result.latest?.commentId,2);
 assert.equal(result.latest?.trace.checkpoint.nextAction,next.checkpoint.nextAction);
});
test('old human-only GitHub checkpoint is not fabricated into structured history',()=>{
 const c=comment(1);
 const legacy={...c,body:c.body.replace(/<!-- MCP_GOVERNED_WORK_ENTRY_DATA_V1:[^>]* -->/,'')};
 const result=recoverE2FromGitHubIssueComments(source([legacy]),ID);
 assert.equal(result.status,'PARTIAL');
 assert.equal(result.latest,null);
 assert.equal(result.legacyCheckpointCount,1);
 assert.ok(result.blockers.includes('LEGACY_CHECKPOINT_REQUIRES_MANIFEST'));
});
test('partial GitHub pagination blocks authoritative-sounding recovery',()=>{
 assert.equal(recoverE2FromGitHubIssueComments(source([comment(1)],false),ID).status,'PARTIAL');
});
test('wrong GitHub author or issue comment URL is refused',()=>{
 const c=comment(1);
 assert.equal(recoverE2FromGitHubIssueComments(
  source([{...c,user:{login:'forged-actor'}}]),ID).status,'CONFLICT');
 assert.equal(recoverE2FromGitHubIssueComments(
  source([{...c,html_url:'https://github.com/other/issues/359'}]),ID).status,'CONFLICT');
});
test('changing continuity identity or issue is rejected',()=>{
 const malformed={...base,github:{...base.github,issueNumber:360}};
 const c={...comment(1),body:renderGovernedWorkEntryCheckpoint(base)
  .replace('MCP_GOVERNED_WORK_ENTRY_DATA_V1:','MCP_GOVERNED_WORK_ENTRY_DATA_V1:INVALID')};
 assert.equal(recoverE2FromGitHubIssueComments(source([c]),ID).status,'CONFLICT');
 assert.equal(malformed.github.issueNumber,360);
});
test('a regression from PR_OPENED to ISSUE_OPENED is rejected',()=>{
 const promoted:GovernedWorkEntryTrace={...base,stage:'PR_OPENED',
  github:{...base.github,branch:'mcp/e2-governed-test',pullRequestNumber:365,
    headSha:'a'.repeat(40)}};
 const result=recoverE2FromGitHubIssueComments(
  source([comment(1,promoted),comment(2,base)]),ID);
 assert.equal(result.status,'CONFLICT');
 assert.ok(result.blockers.includes('CHECKPOINT_STAGE_REGRESSION'));
});

test('a root continuity can open a second PR after the first PR was governed and deployed',()=>{
 const deployed:GovernedWorkEntryTrace={...base,stage:'S1_ATTESTED',
  github:{...base.github,branch:'mcp/e2-first-cycle',pullRequestNumber:360,
   headSha:'a'.repeat(40),mergeSha:'b'.repeat(40)},
  deployment:{workflowRunUrl:'https://github.com/Patricked-code/MCP/actions/runs/123456',
   runtimeRevisionSha:'b'.repeat(40)}};
 const next:GovernedWorkEntryTrace={...base,stage:'PR_OPENED',
  github:{...base.github,branch:'mcp/e2-second-cycle',pullRequestNumber:365,
   headSha:'c'.repeat(40),mergeSha:null}};
 const result=recoverE2FromGitHubIssueComments(source([comment(1,deployed),comment(2,next)]),ID);
 assert.equal(result.status,'READY');
 assert.equal(result.history.length,2);
 assert.equal(result.latest?.trace.github.pullRequestNumber,365);
});
