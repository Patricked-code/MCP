import test from 'node:test';
import assert from 'node:assert/strict';
import {buildWorkEntryContinuityIndex,recoverWorkEntryByContinuityId} from '../src/governance/workEntryContinuityIndex.js';
import type {GovernedWorkEntryTrace} from '../src/governance/workEntryTrace.js';

const issue=359;
const base:GovernedWorkEntryTrace={
 schemaVersion:1,continuityId:'MCP-PILOT-E2-01-CONT-20261030-ROOT-01',
 repository:'Patricked-code/MCP',entryProfile:'EXTERNAL_GOVERNED_RECOVERY',
 workSelection:'OWNER_DIRECTLY_REQUESTED_WORK',explicitOwnerSelection:true,
 instructions:{summary:'Authorized owner-requested pilot entry',sourceUrl:'https://github.com/Patricked-code/MCP/issues/359'},
 responsible:{githubActor:'Patricked-code',internalTaskId:null},
 github:{issueNumber:issue,branch:null,pullRequestNumber:null,headSha:null,mergeSha:null},
 checkpoint:{url:'https://github.com/Patricked-code/MCP/issues/359',nextAction:'Create isolated branch and verify tests'},
 deployment:{workflowRunUrl:null,runtimeRevisionSha:null},stage:'ISSUE_OPENED'
};
test('E2 entry can be indexed and recovered by continuity ID',()=>{
 const index=buildWorkEntryContinuityIndex([base,base]);
 assert.equal(index.status,'READY');
 assert.equal(index.entries.length,1);
 assert.equal(recoverWorkEntryByContinuityId(index,base.continuityId)?.history.length,1);
});
test('unregistered continuity is not fabricated',()=>{
 assert.equal(recoverWorkEntryByContinuityId(buildWorkEntryContinuityIndex([base]),'MISSING'),null);
});
test('same continuity ID with conflicting issue is rejected',()=>{
 const conflict={...base,github:{...base.github,issueNumber:360},
  instructions:{...base.instructions,sourceUrl:'https://github.com/Patricked-code/MCP/issues/360'}};
 const index=buildWorkEntryContinuityIndex([base,conflict]);
 assert.equal(index.status,'CONFLICT');
 assert.equal(recoverWorkEntryByContinuityId(index,base.continuityId),null);
});
test('invalid E2 selection cannot enter the index',()=>{
 const index=buildWorkEntryContinuityIndex([{...base,explicitOwnerSelection:false}]);
 assert.equal(index.status,'CONFLICT');
 assert.equal(index.entries.length,0);
});
