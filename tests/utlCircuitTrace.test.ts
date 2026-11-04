import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assessUtlPlan,assessDOut,assessLOut,assessUtlOut,assessTOut,
  type TInContract,type UtlPlanUnit,type UtlPlanContract,
  type DOutContract,type LOutContract,type UtlOutContract
} from '../src/governance/utlCircuitTrace.js';
import type {GovernedWorkEntryTrace} from '../src/governance/workEntryTrace.js';

const sha='b'.repeat(40);
const entry:GovernedWorkEntryTrace={
 schemaVersion:1,continuityId:'MCP-PILOT-E2-01-CONT-20261030-ROOT-01',
 repository:'Patricked-code/MCP',
 entryProfile:'EXTERNAL_GOVERNED_RECOVERY',
 workSelection:'OWNER_DIRECTLY_REQUESTED_WORK',explicitOwnerSelection:true,
 instructions:{summary:'Review the owner-authorized E2 UTL matrix.',
  sourceUrl:'https://github.com/Patricked-code/MCP/issues/359'},
 responsible:{githubActor:'Patricked-code',internalTaskId:null},
 github:{issueNumber:359,branch:null,pullRequestNumber:null,headSha:null,mergeSha:null},
 checkpoint:{url:'https://github.com/Patricked-code/MCP/issues/359',
   nextAction:'Verify the exact evidence before future work.'},
 deployment:{workflowRunUrl:null,runtimeRevisionSha:null},
 stage:'ISSUE_OPENED'
};
const parent:TInContract={
 parentWorkRef:'GITHUB-ISSUE-359',workEntry:entry,
 parentAdmissionEvidenceUrl:'https://github.com/Patricked-code/MCP/issues/359',
 objective:'Verify bounded work and keep owner E2 continuity.',
 acceptanceCriteria:['All required unit results and global parent criteria are evidenced.'],
 nextAction:'Inspect branch and existing owner scope without creating tasks.'
};
const unit:UtlPlanUnit={
 utlRef:'SYNTHETIC-TEST-UTL-01',parentWorkRef:parent.parentWorkRef,
 continuityId:entry.continuityId,objective:'Verify exact SHA correlation.',
 requirementRefs:['REQ-01'],acceptanceCriteria:['Compare exact SHA and checks.'],
 dependsOnUtlRefs:[],collisionDomains:['docs/audits/utl-reconciliation'],
 scope:'Only a read-only synthetic test fixture.',deployRequired:true,
 evidenceUrl:'https://github.com/Patricked-code/MCP/issues/359'
};
const plan:UtlPlanContract={parent,units:[unit],alreadySatisfiedEvidenceUrl:null};
const dOut:DOutContract={
 utlRef:unit.utlRef,prNumber:360,prHeadSha:'a'.repeat(40),
 prCiRunId:10,prCiConclusion:'success',
 independentReviewUrl:'https://github.com/Patricked-code/MCP/pull/360',
 mergeCommitSha:sha,mergedAtUtc:'2026-10-30T06:07:05Z'
};
const lOut:LOutContract={
 utlRef:unit.utlRef,mainSha:sha,ciMainRunId:41012207735,
 ciMainConclusion:'success',deployWorkflowRunId:41012207646,
 deployWorkflowConclusion:'success',
 serverJobId:'mcp-s1-41012207646-'+sha.slice(0,12),requestedSha:sha,
 runtimeRevision:sha,serverStatus:'succeeded',phase:'attested',
 healthOk:true,oauthOk:true,mcpAuthOk:true,rollbackStatus:'not_needed',
 attestationUrl:'https://github.com/Patricked-code/MCP/actions/runs/41012207646',
 observedAtUtc:'2026-10-30T06:10:00Z'
};
const unitOut:UtlOutContract={
 unit,development:dOut,delivery:lOut,
 unitAcceptanceUrl:'https://github.com/Patricked-code/MCP/issues/359',
 attestedMainSha:sha
};

test('UTL_PLAN is valid as evidence projection but never grants admission or claims',()=>{
 const status=assessUtlPlan(plan);
 assert.equal(status.status,'EVIDENCE_PRESENT_NOT_AUTHORIZATION');
 assert.equal(status.grantsWritePermission,false);
 assert.equal(status.createsRuntimeTask,false);
 assert.equal(status.closesParent,false);
});
test('E2 owner record cannot acquire fake E1 internal task ID',()=>{
 const invalid:UtlPlanContract={...plan,parent:{...parent,workEntry:{
   ...entry,responsible:{...entry.responsible,internalTaskId:'TASK-FAKE'}
 }}};
 assert.equal(assessUtlPlan(invalid).status,'BLOCKED');
 assert.ok(assessUtlPlan(invalid).blockers.includes('PARENT_E1_E2_ENTRY_NOT_VERIFIED'));
});
test('UTL plan requires unique names, same parent and continuity',()=>{
 assert.ok(assessUtlPlan({...plan,units:[unit,unit]}).blockers.includes('DUPLICATE_OR_INVALID_UTL_REFERENCE'));
 assert.ok(assessUtlPlan({...plan,units:[{...unit,parentWorkRef:'UNKNOWN'}]}).blockers.includes('UTL_PARENT_CONTINUITY_MISMATCH'));
});
test('UTL dependency graphs fail closed on cycles and missing edges',()=>{
 const u2:UtlPlanUnit={...unit,utlRef:'SYNTHETIC-TEST-UTL-02',dependsOnUtlRefs:[unit.utlRef]};
 const u1={...unit,dependsOnUtlRefs:[u2.utlRef]};
 assert.ok(assessUtlPlan({...plan,units:[u1,u2]}).blockers.includes('CYCLIC_UTL_DEPENDENCIES'));
 assert.ok(assessUtlPlan({...plan,units:[{...unit,dependsOnUtlRefs:['UNKNOWN']}]}).blockers.includes('MISSING_UTL_DEPENDENCY'));
});
test('D_OUT demands PR CI and independent review, not just a merge message',()=>{
 assert.equal(assessDOut(dOut).status,'EVIDENCE_PRESENT_NOT_AUTHORIZATION');
 assert.equal(dOut.prHeadSha===dOut.mergeCommitSha,false);
 assert.ok(assessDOut({...dOut,independentReviewUrl:null}).blockers.includes('INDEPENDENT_REVIEW_MISSING'));
 assert.ok(assessDOut({...dOut,prCiConclusion:'failure'}).blockers.includes('PR_CI_NOT_SUCCESS'));
});
test('L_OUT enforces exact SHA, server job, health, auth and rollback evidence',()=>{
 assert.equal(assessLOut(lOut).status,'EVIDENCE_PRESENT_NOT_AUTHORIZATION');
 assert.equal(assessLOut({...lOut,runtimeRevision:'c'.repeat(40)}).status,'BLOCKED');
 assert.ok(assessLOut({...lOut,serverJobId:'fake'}).blockers.includes('SERVER_JOB_RUN_SHA_MISMATCH'));
 assert.ok(assessLOut({...lOut,healthOk:null}).blockers.includes('SERVER_HEALTH_ROLLBACK_ATTESTATION_MISSING'));
 assert.ok(assessLOut({...lOut,attestationUrl:null}).blockers.includes('ATTESTATION_PROVENANCE_OR_TIME_MISSING'));
});
test('UTL_OUT requires L_OUT when unit deployment is required',()=>{
 assert.equal(assessUtlOut(unitOut).status,'EVIDENCE_PRESENT_NOT_AUTHORIZATION');
 assert.ok(assessUtlOut({...unitOut,delivery:null}).blockers.includes('REQUIRED_L_OUT_MISSING'));
});
test('T_OUT requires global acceptance even after a unit has correct evidence',()=>{
 const result=assessTOut({plan,unitOutcomes:[unitOut],finalMainSha:sha,
     finalIntegrationAcceptanceUrl:null,
     checkpointUrl:'https://github.com/Patricked-code/MCP/issues/359'});
 assert.ok(result.blockers.includes('PARENT_FINAL_INTEGRATION_AND_CHECKPOINT_MISSING'));
 assert.equal(result.closesParent,false);
});
test('full simulated T_OUT is not equivalent to closing real MCP P2 task',()=>{
 const status=assessTOut({plan,unitOutcomes:[unitOut],finalMainSha:sha,
   finalIntegrationAcceptanceUrl:'https://github.com/Patricked-code/MCP/issues/359',
   checkpointUrl:'https://github.com/Patricked-code/MCP/issues/359'});
 assert.equal(status.status,'EVIDENCE_PRESENT_NOT_AUTHORIZATION');
 assert.equal(status.closesParent,false);
});
test('zero UTL plan must prove already satisfied before parent completion',()=>{
 const empty:UtlPlanContract={parent,units:[],alreadySatisfiedEvidenceUrl:null};
 assert.ok(assessUtlPlan(empty).blockers.includes('ZERO_UTL_ALREADY_SATISFIED_EVIDENCE_MISSING'));
 const proven={...empty,alreadySatisfiedEvidenceUrl:'https://github.com/Patricked-code/MCP/issues/359'};
 assert.equal(assessUtlPlan(proven).status,'EVIDENCE_PRESENT_NOT_AUTHORIZATION');
});
