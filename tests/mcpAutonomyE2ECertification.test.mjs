import assert from 'node:assert/strict';
import test from 'node:test';
import { certifyC27AutonomousCycle } from '../scripts/mcp-autonomy-e2e-certification.mjs';

const SHA='b'.repeat(40), PR_SHA='a'.repeat(40);
const SESSION='d40fbb4d-a3a0-4cc4-aa17-43f7b3552b48';
const TASK='TASK-20261107-001';
const RUN='scheduled-chatgpt-executor-001';
const checkpointId='checkpoint-235-c27-run-001';
const selector={
  repository:'Patricked-code/MCP',mandateIssue:235,
  taskId:TASK,governedSessionId:SESSION,agentRunId:RUN,
  pullRequestNumber:401,checkpointId,expectedMergeSha:SHA,
  observedAt:'2026-11-07T15:04:50.000Z'
};
function fixture(){
  return {
    readAgentRun:{
      source:'VERIFIED_EXISTING_AGENT_HOST',provider:'ChatGPT',
      triggerKind:'SCHEDULED',hostRunVerified:true,durable:true,
      status:'COMPLETED',wakeReceiptId:'automation-wake-1',
      executorRunId:RUN,taskId:TASK,governedSessionId:SESSION,
      repository:'Patricked-code/MCP',startedAt:'2026-11-07T15:00:00.000Z'
    },
    readSession:{
      source:'GOVERNED_SESSIONS',repository:'Patricked-code/MCP',
      governedSessionId:SESSION,ownerPrincipalId:'oauth:wealthtech-mcp-admin',
      lastAcknowledgedStateVersion:1200
    },
    readTask:{
      source:'GOVERNED_TASK_QUEUE',repository:'Patricked-code/MCP',
      taskId:TASK,ownerGovernedSessionId:SESSION,status:'DONE',taskRevision:22
    },
    readPullRequest:{
      source:'GITHUB_PULL_REQUEST',number:401,
      repository:'Patricked-code/MCP',baseRef:'main',merged:true,
      headSha:PR_SHA,mergeCommitSha:SHA,
      changedPaths:['scripts/mcp-global-agent-handoff.mjs',
        'tests/mcpGlobalAgentHandoff.test.mjs'],
      mergedAt:'2026-11-07T15:02:00.000Z'
    },
    readPrChecks:{
      source:'GITHUB_PR_CHECKS',headSha:PR_SHA,
      conclusion:'success',requiredChecksPassed:true,
      requiredReviewThreadsResolved:true,branchProtectionSatisfied:true,
      runId:1002,completedAt:'2026-11-07T15:01:00.000Z'
    },
    readMainChecks:{
      source:'GITHUB_MAIN_CHECKS',headSha:SHA,
      conclusion:'success',requiredChecksPassed:true,runId:1003,
      completedAt:'2026-11-07T15:03:00.000Z'
    },
    readGovernedDeploy:{
      source:'MCP_GOVERNED_DEPLOY',headSha:SHA,
      conclusion:'success',actualExactShaDeployStepSucceeded:true,
      runId:1004,completedAt:'2026-11-07T15:04:00.000Z'
    },
    readLiveState:{
      source:'MCP_LIVE_STATE',freshness:'CURRENT',
      globalAlignment:'FULLY_ALIGNED',githubSha:SHA,s1Sha:SHA,runtimeSha:SHA,
      s1Clean:true,containerHealth:'healthy',documentationDrift:false,
      observedAt:'2026-11-07T15:04:20.000Z'
    },
    readCheckpoint:{
      source:'GITHUB_ISSUE_COMMENT',issueNumber:235,
      checkpointId,taskId:TASK,agentRunId:RUN,pullRequestNumber:401,
      mergeSha:SHA,nextAction:'RECOMPUTE_AND_CONTINUE',
      createdAt:'2026-11-07T15:04:30.000Z'
    },
    readNextWork:{
      source:'PROGRAM_BACKLOG_V2',repository:'Patricked-code/MCP',
      observedMainSha:SHA,readinessRecomputed:true,runtimeClaimGrantedByRead:false,
      nextAction:'FIRST_COLLISION_FREE_IN_PROGRAM_ORDER',
      observedAt:'2026-11-07T15:04:40.000Z'
    }
  };
}
function ports(e){
  return Object.fromEntries(Object.entries(e).map(([name,obj])=>[name,async()=>obj]));
}
test('C27 source-backed full chain is accepted only as an E2E cycle, never MCP global completion',async()=>{
  const result=await certifyC27AutonomousCycle(selector,ports(fixture()));
  assert.equal(result.status,'CERTIFIED_C27_AUTONOMOUS_CODE_CYCLE');
  assert.match(result.proofDigest,/^[a-f0-9]{64}$/);
  assert.equal(result.proof.mergeSha,SHA);
  assert.equal(result.proof.agentRunId,RUN);
  assert.equal(result.proof.taskId,TASK);
  assert.equal(result.authorizesExecution,false);
  assert.equal(result.grantsClaim,false);
  assert.equal(result.createsRuntimeTask,false);
  assert.equal(result.globalMcpComplete,false);
});
test('C27 rejects incomplete input or any missing authenticated source',async()=>{
  const empty=await certifyC27AutonomousCycle({...selector,mandateIssue:999},ports(fixture()));
  assert.equal(empty.status,'UNVERIFIED');
  assert.equal(empty.reason,'INVALID_C27_SELECTOR');
  const v=ports(fixture());delete v.readAgentRun;
  const missing=await certifyC27AutonomousCycle(selector,v);
  assert.equal(missing.reason,'REQUIRED_LIVE_EVIDENCE_PORTS_MISSING');
  const offline=ports(fixture());offline.readLiveState=async()=>{throw Error('network down');};
  assert.equal((await certifyC27AutonomousCycle(selector,offline)).reason,'LIVE_EVIDENCE_READ_FAILED');
});
test('C27 fails closed for manual wake, fake agent, unverified host and foreign session',async()=>{
  for(const [patch,expected] of [
    [e=>{e.readAgentRun.triggerKind='MANUAL';},'AUTONOMOUS_WAKE_NOT_OBSERVED'],
    [e=>{e.readAgentRun.provider='Codex';},'UNSUPPORTED_OR_UNATTESTED_CODE_AGENT'],
    [e=>{e.readAgentRun.source='GITHUB_ISSUE_COMMENT';},'VERIFIED_EXISTING_AGENT_HOST_SOURCE_UNATTESTED'],
    [e=>{e.readAgentRun.hostRunVerified=false;},'AUTONOMOUS_WAKE_RECEIPT_UNATTESTED'],
    [e=>{e.readSession.ownerPrincipalId='unproven';},'SESSION_IDENTITY_OR_BOOTSTRAP_UNATTESTED'],
    [e=>{e.readTask.ownerGovernedSessionId='foreign-session';},'CANONICAL_P2_TASK_NOT_COMPLETED_BY_OWNER'],
    [e=>{e.readTask.status='CLAIMED';},'CANONICAL_P2_TASK_NOT_COMPLETED_BY_OWNER'],
    [e=>{e.readAgentRun.taskId='TASK-20261107-002';},'AGENT_TASK_SESSION_BINDING_MISMATCH'],
  ]){
    const e=fixture();patch(e);
    const r=await certifyC27AutonomousCycle(selector,ports(e));
    assert.equal(r.status,'UNVERIFIED');
    assert.equal(r.reason,expected);
  }
});
test('C27 never equates an unmerged PR, a CI without tests or unresolved thread to delivery',async()=>{
  for(const [patch,code] of [
    [e=>{e.readPullRequest.merged=false;},'PROTECTED_PR_MERGE_NOT_ATTESTED'],
    [e=>{e.readPullRequest.mergeCommitSha='c'.repeat(40);},'PROTECTED_PR_MERGE_NOT_ATTESTED'],
    [e=>{e.readPullRequest.changedPaths=['docs/README.md'];},'CODE_AND_REGRESSION_TEST_NOT_ATTESTED'],
    [e=>{e.readPrChecks.conclusion='failure';},'GITHUB_PR_CHECKS_EXACT_HEAD_CI_UNATTESTED'],
    [e=>{e.readMainChecks.headSha=PR_SHA;},'GITHUB_MAIN_CHECKS_EXACT_HEAD_CI_UNATTESTED'],
    [e=>{e.readPrChecks.branchProtectionSatisfied=false;},'REVIEW_OR_MAIN_PROTECTION_UNATTESTED'],
    [e=>{e.readPrChecks.requiredReviewThreadsResolved=false;},'REVIEW_OR_MAIN_PROTECTION_UNATTESTED']
  ]){
    const e=fixture();patch(e);
    assert.equal((await certifyC27AutonomousCycle(selector,ports(e))).reason,code);
  }
});
test('C27 never certifies a workflow success without an exact SHA deploy step and healthy aligned runtime',async()=>{
  for(const [patch,code] of [
    [e=>{e.readGovernedDeploy.actualExactShaDeployStepSucceeded=false;},'GOVERNED_DEPLOY_EXACT_SHA_UNATTESTED'],
    [e=>{e.readGovernedDeploy.headSha='c'.repeat(40);},'GOVERNED_DEPLOY_EXACT_SHA_UNATTESTED'],
    [e=>{e.readLiveState.globalAlignment='PARTIALLY_ALIGNED';},'MAIN_S1_RUNTIME_DOCUMENTATION_NOT_ATTESTED'],
    [e=>{e.readLiveState.runtimeSha=PR_SHA;},'MAIN_S1_RUNTIME_DOCUMENTATION_NOT_ATTESTED'],
    [e=>{e.readLiveState.containerHealth='starting';},'MAIN_S1_RUNTIME_DOCUMENTATION_NOT_ATTESTED'],
    [e=>{e.readLiveState.documentationDrift=true;},'MAIN_S1_RUNTIME_DOCUMENTATION_NOT_ATTESTED'],
    [e=>{e.readLiveState.observedAt='2026-11-07T15:03:00.000Z';},'LIVE_STATE_NOT_FRESH']
  ]){
    const e=fixture();patch(e);
    assert.equal((await certifyC27AutonomousCycle(selector,ports(e))).reason,code);
  }
});
test('C27 requires durable task/run checkpoint, recomputed next work, and causal ordering',async()=>{
  for(const [patch,code] of [
    [e=>{e.readCheckpoint.issueNumber=349;},'CANONICAL_DURABLE_CHECKPOINT_MISSING'],
    [e=>{e.readCheckpoint.agentRunId='another-run';},'CANONICAL_DURABLE_CHECKPOINT_MISSING'],
    [e=>{e.readNextWork.readinessRecomputed=false;},'NEXT_WORK_NOT_REOBSERVED'],
    [e=>{e.readNextWork.runtimeClaimGrantedByRead=true;},'NEXT_WORK_NOT_REOBSERVED'],
    [e=>{e.readCheckpoint.createdAt='2026-11-07T15:03:00.000Z';},'C27_CAUSAL_ORDER_UNATTESTED'],
    [e=>{e.readMainChecks.completedAt='2026-11-07T15:01:00.000Z';},'C27_CAUSAL_ORDER_UNATTESTED'],
    [e=>{e.readNextWork.observedAt='2026-11-07T15:10:00.000Z';},'CHECKPOINT_FUTURE_TO_OBSERVATION']
  ]){
    const e=fixture();patch(e);
    assert.equal((await certifyC27AutonomousCycle(selector,ports(e))).reason,code);
  }
});
test('C27 contract tests are explicitly synthetic; status is not a live certificate by themselves',()=>{
  assert.equal(fixture().readAgentRun.executorRunId,RUN);
  assert.equal(fixture().readAgentRun.source,'VERIFIED_EXISTING_AGENT_HOST');
  assert.equal(fixture().readAgentRun.hostRunVerified,true);
  // Ports above are deliberately injected fixtures. Actual caller MUST
  // replace every function with a fresh connector-backed read before claim.
  assert.notEqual(RUN,'an-attested-current-live-run');
});
