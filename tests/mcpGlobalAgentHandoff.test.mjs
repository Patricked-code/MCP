import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assessC26Handoff,
  deliverC26ViaExistingAuthorities
} from '../scripts/mcp-global-agent-handoff.mjs';

const SHA = '7d29ad4212efa0bd343d53f400785e5c9cbf07f4';
const SESSION = 'caa50d12-737c-47f9-9ee0-6cf8b763fdbe';
const NOW = '2026-11-06T20:00:00.000Z';
function input() {
  return {
    at: NOW,
    trigger: { repository: 'Patricked-code/MCP', ref: 'refs/heads/main', sha: SHA },
    liveState: {
      generatedAt: NOW,
      alignment: {
        global: 'FULLY_ALIGNED', githubVsS1: 'ALIGNED',
        runtime: 'ALIGNED', documentation: 'ALIGNED'
      },
      github: { head: SHA }, s1: { head: SHA }, runtime: { revision: SHA }
    },
    inventory: {
      repository: 'Patricked-code/MCP',
      nextWork: {
        schemaVersion: 1, projectionKind: 'READ_ONLY_CONNECTED_AGENT_NEXT_WORK',
        authoritative: false, claimsAutomatically: false, createsRuntimeTask: false,
        governedSessionId: SESSION, mode: 'CLAIM_EXISTING',
        tool: 'mcp_claim_next_governed_task', taskId: 'TASK-20260929-001',
        resourceScopes: ['connection:oauth-attempt-correlation']
      }
    }
  };
}

test('C26 rejects drift, stale observations and exact SHA mismatch without invoking P2', async () => {
  for (const patch of [
    x => {x.liveState.alignment.global='RECONCILIATION_REQUIRED';},
    x => {x.liveState.alignment.documentation='DOCUMENTATION_DRIFT';},
    x => {x.liveState.generatedAt='2026-11-06T19:30:00.000Z';},
    x => {x.liveState.runtime.revision='aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';},
    x => {x.trigger.sha='bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';},
  ]) {
    const x=input(); patch(x);
    let actions=0;
    const out=await deliverC26ViaExistingAuthorities(x,{
      admitExistingP2:async()=>{actions++;throw Error('must not admit');},
      executeExistingAgent:async()=>{actions++;throw Error('must not execute');}
    });
    assert.equal(out.status,'BLOCKED');
    assert.equal(actions,0);
  }
});
test('C26 rejects unbound sessions and planning-only or unknown next work', () => {
  for (const patch of [
    x=>{x.inventory.nextWork.governedSessionId=null;},
    x=>{x.inventory.nextWork.mode='MATERIALIZE_BLUEPRINT';},
    x=>{x.inventory.nextWork.mode='NONE';},
    x=>{x.inventory.nextWork.authoritative=true;},
    x=>{x.inventory.nextWork.tool=null;},
  ]) {
    const x=input();patch(x);
    assert.equal(assessC26Handoff(x).status,'BLOCKED');
  }
});
test('C26 refuses a P2 receipt that is not a real bound claim from existing authority', async () => {
  const x=input();
  let deliveries=0;
  const out=await deliverC26ViaExistingAuthorities(x,{
    admitExistingP2:async()=>({
      source:'UNTRUSTED_PLANNING_ONLY',status:'CLAIMED',
      taskId:x.inventory.nextWork.taskId,governedSessionId:SESSION,
      repository:x.trigger.repository,revision:1
    }),
    executeExistingAgent:async()=>{deliveries++;return {accepted:true,executorRunId:'run1'};}
  });
  assert.equal(out.status,'BLOCKED');
  assert.equal(deliveries,0);
});
test('C26 only delegates a claim with exact task, session, repository and nonzero revision', async () => {
  for (const patch of [
    r=>{r.taskId='TASK-20260929-999';},
    r=>{r.governedSessionId='wrong';},
    r=>{r.repository='other/repo';},
    r=>{r.revision=0;},
    r=>{r.status='READY';},
  ]) {
    const x=input();let deliveries=0;
    const receipt={source:'mcp_claim_next_governed_task',status:'CLAIMED',
      taskId:x.inventory.nextWork.taskId,governedSessionId:SESSION,
      repository:x.trigger.repository,revision:1};
    patch(receipt);
    const out=await deliverC26ViaExistingAuthorities(x,{
      admitExistingP2:async()=>receipt,
      executeExistingAgent:async()=>{deliveries++;return {accepted:true,executorRunId:'run1'};}
    });
    assert.equal(out.status,'BLOCKED');
    assert.equal(deliveries,0);
  }
});
test('C26 delegates through real existing P2 and existing code-agent port without claiming independent authority', async () => {
  const x=input();const calls=[];
  const out=await deliverC26ViaExistingAuthorities(x,{
    admitExistingP2:async selection=>{
      calls.push(['P2',selection.taskId]);
      return {source:'mcp_claim_next_governed_task',status:'CLAIMED',
        taskId:selection.taskId,governedSessionId:selection.governedSessionId,
        repository:selection.repository,revision:1};
    },
    executeExistingAgent:async work=>{
      calls.push(['AGENT',work.taskId]);
      return {accepted:true,executorRunId:'verified-executor-run-1'};
    }
  });
  assert.equal(out.status,'DELEGATED');
  assert.equal(out.executorRunId,'verified-executor-run-1');
  assert.deepEqual(calls,[['P2','TASK-20260929-001'],['AGENT','TASK-20260929-001']]);
  assert.equal(out.runtimeTaskCreatedByAdapter,false);
  assert.equal(out.parallelQueueCreated,false);
  assert.equal(out.programDoneAttested,false);
});
test('C26 fails closed when the external code agent is absent or rejects the work', async () => {
  const x=input();
  const receipt={source:'mcp_claim_next_governed_task',status:'CLAIMED',
    taskId:x.inventory.nextWork.taskId,governedSessionId:SESSION,
    repository:x.trigger.repository,revision:1};
  for(const ports of [
    {admitExistingP2:async()=>receipt},
    {admitExistingP2:async()=>receipt,executeExistingAgent:async()=>({accepted:false,reason:'NO_EXECUTOR'})}
  ]){
    const out=await deliverC26ViaExistingAuthorities(x,ports);
    assert.equal(out.status,'BLOCKED');
    assert.equal(out.programDoneAttested,false);
  }
});


test('C26 obeys canonical 60-second Live State freshness and explicit stale state',()=>{
  for(const patch of [
    x=>{x.liveState.freshness='STALE';},
    x=>{x.liveState.generatedAt='2026-11-06T19:58:30.000Z';}
  ]){
    const x=input();patch(x);
    assert.equal(assessC26Handoff(x).status,'BLOCKED');
  }
});

test('C26 after a successful P2 claim preserves recovery binding and resumes owned work',async()=>{
  const x=input();const calls=[];
  const claim={source:'mcp_claim_next_governed_task',status:'CLAIMED',
    taskId:x.inventory.nextWork.taskId,governedSessionId:SESSION,
    repository:x.trigger.repository,revision:7};
  const first=await deliverC26ViaExistingAuthorities(x,{
    admitExistingP2:async()=>{calls.push('claim');return claim;},
    executeExistingAgent:async()=>{calls.push('agent-rejected');return {accepted:false};}
  });
  assert.equal(first.status,'RECOVERY_REQUIRED');
  assert.equal(first.taskId,claim.taskId);
  assert.equal(first.governedSessionId,SESSION);
  assert.equal(first.claimedTaskRevision,7);
  assert.equal(first.nextAction,'RESUME_OWNED_VIA_EXISTING_P2');
  x.inventory.nextWork.mode='RESUME_OWNED';
  const second=await deliverC26ViaExistingAuthorities(x,{
    admitExistingP2:async()=>{calls.push('resume');return claim;},
    executeExistingAgent:async()=>{calls.push('agent-accepted');return {accepted:true,executorRunId:'existing-verified-run-2'};}
  });
  assert.equal(second.status,'DELEGATED');
  assert.deepEqual(calls,['claim','agent-rejected','resume','agent-accepted']);
});
