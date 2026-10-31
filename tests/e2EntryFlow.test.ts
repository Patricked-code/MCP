import assert from 'node:assert/strict';
import test from 'node:test';
import {reconcileE2Entry,routeE2OwnerChoice,type E2LiveSnapshot} from '../src/governance/e2EntryFlow.js';
import {buildWorkEntryContinuityIndex} from '../src/governance/workEntryContinuityIndex.js';
import type {GovernedWorkEntryTrace} from '../src/governance/workEntryTrace.js';
import {previewExternalGovernedRecoveryAfterE2Reconciliation,
 type ExternalGovernedRecoveryInput
} from '../src/governedContext/githubFirstOperationalContinuity.js';

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
 generatedAt:'2026-10-31T00:01:21.672Z',ageSeconds:2,maxAgeSeconds:60,
 github:{status:'CURRENT',head:sha},
 s1:{status:'CURRENT',head:sha,originMain:sha,workingTreeClean:true},
 runtime:{status:'CURRENT',revision:sha,containerStatus:'running',health:'healthy'},
 documentation:{status:'CURRENT',drift:false,declaredGithubSha:sha,
  declaredS1Sha:sha}
};
test('E2 asks owner only after a fully reconciled S1, main, runtime, and docs',()=>{
 const result=reconcileE2Entry(snapshot,index,'2026-10-31T00:01:23.000Z');
 assert.equal(result.decision,'ASK_OWNER');
 assert.equal(result.alignment,'ALIGNED');
 assert.equal(result.candidates[0]?.continuityId,continuityId);
 assert.deepEqual(result.warnings,[]);
 assert.equal(result.grantsWriteAccess,false);
});
test('E2 continues existing continuity ID without creating a new chantier',()=>{
 const observed=reconcileE2Entry(snapshot,index,'2026-10-31T00:01:23.000Z');
 const routed=routeE2OwnerChoice(observed,{kind:'CONTINUE',continuityId});
 assert.equal(routed.decision,'RESUME_EXISTING');
 assert.equal(routed.continuityId,continuityId);
 assert.equal(routed.grantsWriteAccess,false);
});
test('E2 new mandate is only sent to duplicate review, never automatically created',()=>{
 const observed=reconcileE2Entry(snapshot,index,'2026-10-31T00:01:23.000Z');
 const routed=routeE2OwnerChoice(observed,{kind:'NEW',mandate:'Build a new controlled E2 workflow'});
 assert.equal(routed.decision,'REVIEW_NEW_WORK_FOR_DUPLICATES');
 assert.equal(routed.continuityId,null);
 assert.equal(routed.grantsWriteAccess,false);
 assert.equal(routeE2OwnerChoice(observed,{kind:'NEW',mandate:' '}).decision,'BLOCKED');
});
test('unknown continuity cannot silently be converted into new work',()=>{
 const routed=routeE2OwnerChoice(reconcileE2Entry(snapshot,index,'2026-10-31T00:01:23.000Z'),
  {kind:'CONTINUE',continuityId:'MCP-NONEXISTENT-CONT-0000'});
 assert.equal(routed.decision,'BLOCKED');
 assert.deepEqual(routed.blockers,['UNKNOWN_OR_AMBIGUOUS_CONTINUITY']);
});
test('GitHub and S1 SHA mismatch blocks owner routing',()=>{
 const bad={...snapshot,s1:{...snapshot.s1,head:'a'.repeat(40)}};
 const observed=reconcileE2Entry(bad,index,'2026-10-31T00:01:23.000Z');
 assert.equal(observed.alignment,'DIVERGED');
 assert.equal(observed.decision,'BLOCKED');
 assert.equal(observed.question,null);
 assert.equal(routeE2OwnerChoice(observed,{kind:'CONTINUE',continuityId}).decision,'BLOCKED');
});
test('unverified runtime blocks owner routing, no claim of alignment',()=>{
 const bad={...snapshot,runtime:{...snapshot.runtime,revision:null,status:'UNKNOWN'}};
 const result=reconcileE2Entry(bad,index,'2026-10-31T00:01:23.000Z');
 assert.equal(result.alignment,'UNVERIFIED');
 assert.equal(result.decision,'BLOCKED');
 assert.ok(result.blockers.includes('MISSING_EXACT_HEAD_EVIDENCE'));
});
test('unhealthy MCP runtime prevents reconciliation success',()=>{
 const bad={...snapshot,runtime:{...snapshot.runtime,health:'unhealthy'}};
 assert.equal(reconcileE2Entry(bad,index,'2026-10-31T00:01:23.000Z').decision,'BLOCKED');
});
test('stale or incorrect repository evidence is refused',()=>{
 assert.equal(reconcileE2Entry({...snapshot,freshness:'STALE'},index,'2026-10-31T00:01:23.000Z').decision,'BLOCKED');
 assert.equal(reconcileE2Entry({...snapshot,repository:'another/repository'},index,'2026-10-31T00:01:23.000Z').decision,'BLOCKED');
});
test('conflicting continuity evidence blocks owner routing',()=>{
 const conflicting={...trace,github:{...trace.github,issueNumber:360},
  instructions:{...trace.instructions,sourceUrl:'https://github.com/Patricked-code/MCP/issues/360'}};
 const conflicted=buildWorkEntryContinuityIndex([trace,conflicting]);
 assert.equal(reconcileE2Entry(snapshot,conflicted,'2026-10-31T00:01:23.000Z').decision,'BLOCKED');
});

test('nominal CURRENT flag with expired observation is rejected',()=>{
 const result=reconcileE2Entry(snapshot,index,'2026-10-31T00:04:00.000Z');
 assert.equal(result.decision,'BLOCKED');
 assert.ok(result.blockers.includes('STALE_OR_WRONG_REPOSITORY'));
});

const branchSha='b'.repeat(40);
const previewInput:ExternalGovernedRecoveryInput={
 profile:'EXTERNAL_GOVERNED_RECOVERY',ownerSelected:true,collisionFreeObserved:true,
 expectedMainSha:sha,observedMainSha:sha,
 expectedBranchSha:branchSha,observedBranchSha:branchSha,
 github:{githubConnected:true,repository:'Patricked-code/MCP',observedHeadSha:branchSha,
  needs:{repositoryRead:true,repositoryWrite:false,serverReadEvidence:false,
   serverWrite:false,operationalMemoryMutation:false,runtimeToolInvocation:false},
  fallback:{readonlyEvidenceWorkflowAvailable:false,readonlyEvidenceEnvironmentConfigured:false}}
};
test('existing external recovery profile is reused only after E2 reconciliation and owner choice',()=>{
 const result=previewExternalGovernedRecoveryAfterE2Reconciliation(
  previewInput,snapshot,index,{kind:'CONTINUE',continuityId},'2026-10-31T00:01:23.000Z');
 assert.equal(result.state,'GITHUB_WORK_CANDIDATE');
 assert.equal(result.existingPreview?.state,'GITHUB_WORK_CANDIDATE');
 assert.equal(result.ownerRoute.continuityId,continuityId);
 assert.equal(result.newTaskOrSessionCreated,false);
 assert.equal(result.deployGranted,false);
});
test('new E2 work goes through duplicate review before legacy engineering preview',()=>{
 const result=previewExternalGovernedRecoveryAfterE2Reconciliation(
  previewInput,snapshot,index,{kind:'NEW',mandate:'New bounded MCP enhancement requested by owner'},
  '2026-10-31T00:01:23.000Z');
 assert.equal(result.state,'E2_DUPLICATE_REVIEW_REQUIRED');
 assert.equal(result.existingPreview,null);
 assert.equal(result.githubWriteGranted,false);
});
test('E2 entry fails closed if owner did not select the profile',()=>{
 const result=previewExternalGovernedRecoveryAfterE2Reconciliation(
  {...previewInput,ownerSelected:false},snapshot,index,
  {kind:'CONTINUE',continuityId},'2026-10-31T00:01:23.000Z');
 assert.equal(result.state,'EXPLICIT_SELECTION_REQUIRED');
 assert.equal(result.existingPreview,null);
});
test('E2 entry cannot preview legacy execution for diverged main and S1',()=>{
 const changed={...snapshot,s1:{...snapshot.s1,head:'a'.repeat(40)}};
 const result=previewExternalGovernedRecoveryAfterE2Reconciliation(
  previewInput,changed,index,{kind:'CONTINUE',continuityId},'2026-10-31T00:01:23.000Z');
 assert.equal(result.state,'E2_RECONCILIATION_OR_CHOICE_BLOCKED');
 assert.equal(result.existingPreview,null);
});

test('selected continuity cannot be resumed with a different PR head SHA',()=>{
 const prTrace:GovernedWorkEntryTrace={...trace,stage:'PR_OPENED',
  github:{...trace.github,branch:'mcp/e2-bound-head',pullRequestNumber:365,
   headSha:'a'.repeat(40),mergeSha:null}};
 const selected=buildWorkEntryContinuityIndex([prTrace]);
 const result=previewExternalGovernedRecoveryAfterE2Reconciliation(
  previewInput,snapshot,selected,{kind:'CONTINUE',continuityId},
  '2026-10-31T00:01:23.000Z');
 assert.equal(result.state,'E2_SELECTED_GITHUB_EVIDENCE_DRIFT');
 assert.equal(result.existingPreview,null);
});
test('GitHub main SHA in recovery profile must match reconciled live state',()=>{
 const inconsistent={...previewInput,expectedMainSha:'a'.repeat(40),
  observedMainSha:'a'.repeat(40)};
 const result=previewExternalGovernedRecoveryAfterE2Reconciliation(
  inconsistent,snapshot,index,{kind:'CONTINUE',continuityId},
  '2026-10-31T00:01:23.000Z');
 assert.equal(result.state,'E2_SELECTED_GITHUB_EVIDENCE_DRIFT');
 assert.equal(result.deployGranted,false);
});

test('E2 blocks normal owner routing when S1 worktree differs despite matching commit SHAs',()=>{
 const dirty={...snapshot,s1:{...snapshot.s1,workingTreeClean:false}};
 const observed=reconcileE2Entry(dirty,index,'2026-10-31T00:01:23.000Z');
 assert.equal(observed.alignment,'DIVERGED');
 assert.equal(observed.decision,'BLOCKED');
 assert.ok(observed.blockers.includes('S1_WORKTREE_NOT_CLEAN'));
 assert.equal(observed.question,null);
 assert.equal(routeE2OwnerChoice(observed,{kind:'CONTINUE',continuityId}).decision,'BLOCKED');
});
test('E2 blocks normal owner routing on outdated canonical deployment documentation',()=>{
 const drift={...snapshot,documentation:{...snapshot.documentation,drift:true}};
 const observed=reconcileE2Entry(drift,index,'2026-10-31T00:01:23.000Z');
 assert.equal(observed.alignment,'DIVERGED');
 assert.equal(observed.decision,'BLOCKED');
 assert.ok(observed.blockers.includes('MCP_DOCUMENTATION_DRIFT_OR_UNKNOWN'));
 assert.equal(routeE2OwnerChoice(observed,{kind:'NEW',mandate:'New MCP work'}).decision,'BLOCKED');
});

test('E2 remains compatible with a runtime lacking a Docker healthcheck',()=>{
 const s={...snapshot,runtime:{...snapshot.runtime,health:'none' as const}};
 assert.equal(reconcileE2Entry(s,index,'2026-10-31T00:01:23.000Z').decision,'ASK_OWNER');
});
