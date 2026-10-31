import assert from 'node:assert/strict';
import test from 'node:test';
import {reconcileE2Entry,routeE2OwnerChoice,type E2LiveSnapshot} from '../src/governance/e2EntryFlow.js';
import {buildWorkEntryContinuityIndex} from '../src/governance/workEntryContinuityIndex.js';
import type {GovernedWorkEntryTrace} from '../src/governance/workEntryTrace.js';

const sha='1f6961063d27bc85087aab57a8f700fd7729e03f';
const continuityId='MCP-PILOT-E2-01-CONT-20261030-ROOT-01';
const trace:GovernedWorkEntryTrace={
 schemaVersion:1,continuityId,repository:'Patricked-code/MCP',
 entryProfile:'EXTERNAL_GOVERNED_RECOVERY',
 workSelection:'OWNER_DIRECTLY_REQUESTED_WORK',
 explicitOwnerSelection:true,
 instructions:{summary:'Resume existing E2 pilot from its canonical issue.',
  sourceUrl:'https://github.com/Patricked-code/MCP/issues/359'},
 responsible:{githubActor:'Patricked-code',internalTaskId:null},
 github:{issueNumber:359,branch:null,pullRequestNumber:null,headSha:null,mergeSha:null},
 checkpoint:{url:'https://github.com/Patricked-code/MCP/issues/359',
   nextAction:'Resume the existing PR after exact reconciliation'},
 deployment:{workflowRunUrl:null,runtimeRevisionSha:null},stage:'ISSUE_OPENED'
};
const index=buildWorkEntryContinuityIndex([trace]);
const snapshot:E2LiveSnapshot={
 repository:'Patricked-code/MCP',freshness:'CURRENT',
 generatedAt:'2026-10-31T00:01:21.672Z',
 github:{status:'CURRENT',head:sha},
 s1:{status:'CURRENT',head:sha,originMain:sha,workingTreeClean:false},
 runtime:{status:'CURRENT',revision:sha,containerStatus:'running',health:'healthy'},
 documentation:{status:'CURRENT',drift:true,declaredGithubSha:'ba9acd1cb15942f37aba2b9a0a45b267ec50d5b4',
  declaredS1Sha:'ba9acd1cb15942f37aba2b9a0a45b267ec50d5b4'}
};
test('E2 observes exact main/S1/runtime, warns on drift, then asks the owner',()=>{
 const result=reconcileE2Entry(snapshot,index);
 assert.equal(result.decision,'ASK_OWNER');
 assert.equal(result.alignment,'ALIGNED');
 assert.equal(result.candidates[0]?.continuityId,continuityId);
 assert.deepEqual(result.warnings,['S1_WORKTREE_NOT_CLEAN','MCP_DOCUMENTATION_DRIFT_OR_UNKNOWN']);
 assert.equal(result.grantsWriteAccess,false);
});
test('E2 continues existing continuity ID without creating a new chantier',()=>{
 const observed=reconcileE2Entry(snapshot,index);
 const routed=routeE2OwnerChoice(observed,{kind:'CONTINUE',continuityId});
 assert.equal(routed.decision,'RESUME_EXISTING');
 assert.equal(routed.continuityId,continuityId);
 assert.equal(routed.grantsWriteAccess,false);
});
test('E2 new mandate is only sent to duplicate review, never automatically created',()=>{
 const observed=reconcileE2Entry(snapshot,index);
 const routed=routeE2OwnerChoice(observed,{kind:'NEW',mandate:'Build a new controlled E2 workflow'});
 assert.equal(routed.decision,'REVIEW_NEW_WORK_FOR_DUPLICATES');
 assert.equal(routed.continuityId,null);
 assert.equal(routed.grantsWriteAccess,false);
 assert.equal(routeE2OwnerChoice(observed,{kind:'NEW',mandate:' '}).decision,'BLOCKED');
});
test('unknown continuity cannot silently be converted into new work',()=>{
 const routed=routeE2OwnerChoice(reconcileE2Entry(snapshot,index),
  {kind:'CONTINUE',continuityId:'MCP-NONEXISTENT-CONT-0000'});
 assert.equal(routed.decision,'BLOCKED');
 assert.deepEqual(routed.blockers,['UNKNOWN_OR_AMBIGUOUS_CONTINUITY']);
});
test('GitHub and S1 SHA mismatch blocks owner routing',()=>{
 const bad={...snapshot,s1:{...snapshot.s1,head:'a'.repeat(40)}};
 const observed=reconcileE2Entry(bad,index);
 assert.equal(observed.alignment,'DIVERGED');
 assert.equal(observed.decision,'BLOCKED');
 assert.equal(observed.question,null);
 assert.equal(routeE2OwnerChoice(observed,{kind:'CONTINUE',continuityId}).decision,'BLOCKED');
});
test('unverified runtime blocks owner routing, no claim of alignment',()=>{
 const bad={...snapshot,runtime:{...snapshot.runtime,revision:null,status:'UNKNOWN'}};
 const result=reconcileE2Entry(bad,index);
 assert.equal(result.alignment,'UNVERIFIED');
 assert.equal(result.decision,'BLOCKED');
 assert.ok(result.blockers.includes('MISSING_EXACT_HEAD_EVIDENCE'));
});
test('unhealthy MCP runtime prevents reconciliation success',()=>{
 const bad={...snapshot,runtime:{...snapshot.runtime,health:'unhealthy'}};
 assert.equal(reconcileE2Entry(bad,index).decision,'BLOCKED');
});
test('stale or incorrect repository evidence is refused',()=>{
 assert.equal(reconcileE2Entry({...snapshot,freshness:'STALE'},index).decision,'BLOCKED');
 assert.equal(reconcileE2Entry({...snapshot,repository:'another/repository'},index).decision,'BLOCKED');
});
test('conflicting continuity evidence blocks owner routing',()=>{
 const conflicting={...trace,github:{...trace.github,issueNumber:360},
  instructions:{...trace.instructions,sourceUrl:'https://github.com/Patricked-code/MCP/issues/360'}};
 const conflicted=buildWorkEntryContinuityIndex([trace,conflicting]);
 assert.equal(reconcileE2Entry(snapshot,conflicted).decision,'BLOCKED');
});
