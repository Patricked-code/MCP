import assert from 'node:assert/strict';
import test from 'node:test';
import { deriveUniversalResumeAdvice } from '../src/provisioning/universalResumeAdvice.js';
import type { GovernedTaskRecord, GovernedCheckpoint } from '../src/operationalMemory/types.js';
import type { UniversalResumeInput } from '../src/provisioning/universalResumeAdvice.js';

const now='2026-10-28T04:40:00.000Z';
const sha='48a529889517aa1c11974802d23acc3f35e0f187';
const mine='11111111-1111-4111-8111-111111111111';
const other='22222222-2222-4222-8222-222222222222';
const taskId='TASK-20261028-100';
function task(partial:Partial<GovernedTaskRecord>={}):GovernedTaskRecord{
  return {
    schemaVersion:1,taskId,repository:'Patricked-code/MCP',intentKey:'universal-capabilities-resume',
    title:'Universal admin capabilities',summary:'Only this bounded work stream.',
    priority:75,sequence:1,status:'IN_PROGRESS',dependencies:[],
    resourceScopes:['module:universal-capabilities'],ownerGovernedSessionId:mine,
    workBranch:'mcp/universal-github-plesk-server-capabilities-20261028',
    pullRequestNumber:355,observedHeadSha:sha,runtimeRevision:sha,
    blockers:[],nextAction:'Resume',source:{kind:'agent',requestDigest:'a'.repeat(64)},
    createdAt:now,updatedAt:now,taskRevision:3,...partial
  };
}
function checkpoint():GovernedCheckpoint{
  return { checkpointId:'33333333-3333-4333-8333-333333333333',
    governedSessionId:mine,createdAt:now,taskScope:'universal-capabilities',
    workBranch:'mcp/universal-github-plesk-server-capabilities-20261028',
    pullRequestNumber:355,observedHeadSha:sha,acknowledgedStateVersion:10,
    completedAction:'Validated previous slice',resultCode:'CI_GREEN',blockers:[],
    nextAction:'Continue',eventIds:[],sessionRevision:2 };
}
const base=():UniversalResumeInput=>({
  at:now,actorPrincipalId:'oauth:owner',candidateTaskId:null,
  expectedStoreRevision:14,
  store:{storeRevision:14,tasks:[task()]},
  session:{governedSessionId:mine,status:'ACTIVE',ownerPrincipalId:'oauth:owner',
    lastHeartbeatAt:now,lastCheckpoint:checkpoint()},
  activeLocks:[],
  live:{observedAt:now,githubMain:sha,serverCheckout:sha,
    runtimeRevision:sha,stateVersion:14}
});

test('resume advice reuses existing owned task/checkpoint without creating task or claim',()=>{
  const a=deriveUniversalResumeAdvice(base());
  assert.equal(a.decision,'CONTINUE_OWNED_CANDIDATE');
  assert.equal(a.taskId,taskId);
  assert.equal(a.taskRevision,3);
  assert.equal(a.checkpointId,checkpoint().checkpointId);
  assert.equal(a.runtimeWriteAuthorized,false);
  assert.equal(a.taskClaimed,false);
  assert.equal(a.operationExecuted,false);
});

test('foreign session or mismatched identity does not inherit ownership',()=>{
  for(const input of [
    {...base(),actorPrincipalId:'oauth:other'},
    {...base(),session:{...base().session!,ownerPrincipalId:null}},
    {...base(),session:{...base().session!,status:'EXPIRED' as const}},
    {...base(),session:{...base().session!,lastHeartbeatAt:'2026-10-28T03:00:00.000Z'}}
  ]) {
    const a=deriveUniversalResumeAdvice(input);
    assert.equal(a.decision,'HOLD');
    assert.ok(a.reasonCodes.includes('SESSION_NOT_PROVEN_ACTIVE_OWNED'));
  }
});

test('checkpoint must match the exact owner, branch, SHA and state revision',()=>{
  for(const cp of [
    {...checkpoint(),governedSessionId:other},
    {...checkpoint(),workBranch:'other-branch'},
    {...checkpoint(),observedHeadSha:'f'.repeat(40)},
    {...checkpoint(),acknowledgedStateVersion:50},
    {...checkpoint(),blockers:['UNVERIFIED']}
  ]){
    const a=deriveUniversalResumeAdvice({...base(),session:{...base().session!,lastCheckpoint:cp}});
    assert.equal(a.decision,'HOLD');
    assert.ok(a.reasonCodes.includes('CHECKPOINT_INCOMPATIBLE_OR_BLOCKED'));
  }
});

test('store revision drift, runtime SHA mismatch and stale observation block',()=>{
  for(const input of [
    {...base(),expectedStoreRevision:13},
    {...base(),live:{...base().live,runtimeRevision:'f'.repeat(40)}},
    {...base(),live:{...base().live,observedAt:'2026-10-28T00:00:00.000Z'}}
  ]) assert.equal(deriveUniversalResumeAdvice(input).decision,'HOLD');
});

test('a new claim must specify exact eligible task, never auto-pick high priority OAuth',()=>{
  const oauth=task({taskId:'TASK-20260929-001',intentKey:'oauth',
    status:'READY',priority:95,resourceScopes:['connection:oauth'],
    ownerGovernedSessionId:null,workBranch:null,observedHeadSha:null});
  const universal=task({status:'READY',ownerGovernedSessionId:null,workBranch:null,observedHeadSha:null});
  const input={...base(),store:{storeRevision:14,tasks:[oauth,universal]}};
  assert.equal(deriveUniversalResumeAdvice(input).decision,'NO_ELIGIBLE_TASK');
  const p=deriveUniversalResumeAdvice({...input,candidateTaskId:taskId});
  assert.equal(p.decision,'SPECIFIC_CLAIM_REQUIRED');
  assert.equal(p.taskId,taskId);
  assert.equal(p.runtimeWriteAuthorized,false);
  assert.equal(p.taskClaimed,false);
});

test('specific READY task is held if a foreign lock or active scoped work conflicts',()=>{
  const universal=task({status:'READY',ownerGovernedSessionId:null});
  const input={...base(),candidateTaskId:taskId,store:{storeRevision:14,tasks:[universal]}};
  const a=deriveUniversalResumeAdvice({...input,activeLocks:[{scope:'module:universal-capabilities',governedSessionId:other}]});
  assert.equal(a.decision,'NO_ELIGIBLE_TASK');
  const b=deriveUniversalResumeAdvice({...input,store:{storeRevision:14,tasks:[universal,
    task({taskId:'TASK-20261028-101',status:'IN_PROGRESS',ownerGovernedSessionId:other})]}});
  assert.equal(b.decision,'NO_ELIGIBLE_TASK');
});

test('terminal task must not be replayed even with a historical checkpoint',()=>{
  const input=base();
  const a=deriveUniversalResumeAdvice({...input,store:{storeRevision:14,tasks:[task({status:'DONE'})]}});
  assert.equal(a.decision,'NO_ELIGIBLE_TASK');
  assert.equal(a.operationExecuted,false);
});
