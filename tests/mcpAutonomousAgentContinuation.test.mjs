import assert from 'node:assert/strict';
import test from 'node:test';
import { continueC26WithExistingHost } from '../scripts/mcp-autonomous-agent-continuation.mjs';

const SHA='1a053eb366dfe0c3f567f46a3bd544a079491197';
const SESSION='d40fbb4d-a3a0-4cc4-aa17-43f7b3552b48';
const TASK='TASK-20261107-001';
const NOW='2026-11-07T15:10:00.000Z';
function fixture(mode='CLAIM_EXISTING'){
  const scopes=['orchestration:agent-execution-c26'];
  const input={
    at:NOW,
    trigger:{repository:'Patricked-code/MCP',ref:'refs/heads/main',sha:SHA},
    liveState:{freshness:'CURRENT',generatedAt:NOW,
      alignment:{global:'FULLY_ALIGNED',githubVsS1:'ALIGNED',
        runtime:'ALIGNED',documentation:'ALIGNED'},
      github:{head:SHA},s1:{head:SHA},runtime:{revision:SHA}},
    inventory:{repository:'Patricked-code/MCP',nextWork:{
      schemaVersion:1,projectionKind:'READ_ONLY_CONNECTED_AGENT_NEXT_WORK',
      authoritative:false,claimsAutomatically:false,createsRuntimeTask:false,
      governedSessionId:SESSION,mode,tool:'mcp_claim_next_governed_task',
      taskId:TASK,resourceScopes:scopes
    }}
  };
  const p2={
    source:'GOVERNED_TASK_QUEUE',repository:'Patricked-code/MCP',
    taskId:TASK,governedSessionId:SESSION,taskRevision:4,
    status:mode==='CLAIM_EXISTING'?'READY':'IN_PROGRESS',
    ownerGovernedSessionId:mode==='CLAIM_EXISTING'?null:SESSION,
    resourceScopes:scopes,foreignLockConflict:false
  };
  const claim={source:'mcp_claim_next_governed_task',
    status:mode==='CLAIM_EXISTING'?'CLAIMED':'IN_PROGRESS',
    taskId:TASK,governedSessionId:SESSION,
    repository:'Patricked-code/MCP',revision:5};
  return {input,p2,claim};
}
function boundSession(f){
  const {input}=f;
  const sid=input.inventory.nextWork.governedSessionId;
  return {
    source:'GOVERNED_SESSIONS',governedSessionId:sid,
    repository:'Patricked-code/MCP',status:'ACTIVE',
    identityAssurance:'oauth_subject',
    ownerPrincipalId:'oauth:test-agent-principal',
    sessionRevision:12,lastAcknowledgedStateVersion:1200,
    currentTransport:{fingerprint:'d'.repeat(64),
      boundAt:NOW,lastSeenAt:NOW},
    connectionContext:{
      governedSessionId:sid,repository:'Patricked-code/MCP',
      principalId:'oauth:test-agent-principal',
      identityAssurance:'oauth_subject',evidenceSource:'oauth_auth_info'
    },
    bootstrapReceipt:{
      status:'ACKNOWLEDGED',governedSessionId:sid,
      repository:'Patricked-code/MCP',githubHead:SHA,
      runtimeRevision:SHA,stateVersion:1199,
      createdAt:'2026-11-07T15:09:00.000Z',
      expiresAt:'2026-11-07T15:15:00.000Z'
    }
  };
}
function ports(f,overrides={}){
  return {
    atomicIdempotentHost:true,
    readBoundAgentSession:async()=>boundSession(f),
    readOwnP2State:async()=>f.p2,
    lookupExistingAgentRun:async()=>null,
    admitExistingP2:async()=>f.claim,
    startOrResumeExistingAgent:async work=>({
      source:'EXISTING_AGENT_HOST',idempotencyKey:work.idempotencyKey,
      durable:true,accepted:true,executorRunId:'host-run-0001'
    }),
    ...overrides
  };
}

test('C26 dispatches through exactly the existing P2 and durable agent host',async()=>{
  const f=fixture();const calls=[];
  const p=ports(f,{
    readBoundAgentSession:async()=>{calls.push('read-session');return boundSession(f);},
    readOwnP2State:async()=>{calls.push('read-p2');return f.p2;},
    lookupExistingAgentRun:async()=>{calls.push('read-host');return null;},
    admitExistingP2:async()=>{calls.push('claim-p2');return f.claim;},
    startOrResumeExistingAgent:async work=>{
      calls.push('host-dispatch');
      assert.match(work.idempotencyKey,/^c26-[a-f0-9]{64}$/);
      assert.equal(work.atomicIdempotencyRequired,true);
      return {source:'EXISTING_AGENT_HOST',durable:true,accepted:true,
        idempotencyKey:work.idempotencyKey,executorRunId:'host-run-0001'};
    }
  });
  const x=await continueC26WithExistingHost(f.input,p);
  assert.equal(x.status,'DELEGATED');
  assert.deepEqual(calls,['read-session','read-p2','read-host','claim-p2','host-dispatch']);
  assert.equal(x.createdQueue,false);
  assert.equal(x.certifiedC27,false);
  assert.equal(x.executorRunId,'host-run-0001');
});

test('C26 reuses a real owned existing host run without a second P2 claim',async()=>{
  const f=fixture('RESUME_OWNED');let hostKey;let calledClaim=0;
  const p=ports(f,{
    lookupExistingAgentRun:async ({idempotencyKey})=>{
      hostKey=idempotencyKey;
      return {source:'EXISTING_AGENT_HOST',idempotencyKey,
        taskId:TASK,governedSessionId:SESSION,
        repository:'Patricked-code/MCP',headSha:SHA,
        executorRunId:'host-run-0001',status:'RUNNING',durable:true};
    },
    admitExistingP2:async()=>{calledClaim++;throw Error('duplicate');},
    startOrResumeExistingAgent:async()=>{throw Error('duplicate agent');}
  });
  const x=await continueC26WithExistingHost(f.input,p);
  assert.equal(x.status,'RESUMED_EXISTING_AGENT_RUN');
  assert.equal(x.idempotencyKey,hostKey);
  assert.equal(calledClaim,0);
  assert.equal(x.claimedTask,false);
  assert.equal(x.startedExecutor,false);
});

test('C26 does not materialize/claim on stale, drifted or forged planning snapshots',async()=>{
  for(const mutate of [
    f=>{f.input.liveState.generatedAt='2026-11-07T15:08:00.000Z';},
    f=>{f.input.liveState.alignment.global='RECONCILIATION_REQUIRED';},
    f=>{f.input.liveState.runtime.revision='b'.repeat(40);},
    f=>{f.input.inventory.nextWork.mode='MATERIALIZE_BLUEPRINT';},
    f=>{f.input.trigger.repository='other/repo';},
    f=>{f.input.inventory.nextWork.governedSessionId=null;}
  ]){
    const f=fixture();mutate(f);let reads=0;
    const result=await continueC26WithExistingHost(f.input,ports(f,{
      readOwnP2State:async()=>{reads++;return f.p2;}
    }));
    assert.equal(result.status,'BLOCKED');
    assert.equal(reads,0);
  }
});

test('C26 denies foreign ownership, active foreign locks and a missing durable host',async()=>{
  for(const patch of [
    f=>{f.p2.status='IN_PROGRESS';f.p2.ownerGovernedSessionId='other-session';},
    f=>{f.p2.foreignLockConflict=true;},
    f=>{f.p2.resourceScopes=['other-scope'];},
    f=>{f.p2.source='UNTRUSTED';}
  ]){
    const f=fixture();patch(f);
    const result=await continueC26WithExistingHost(f.input,ports(f));
    assert.equal(result.status,'BLOCKED');
    assert.equal(result.reason,'P2_TASK_OR_OWNERSHIP_CHANGED');
  }
  const f=fixture();
  assert.equal((await continueC26WithExistingHost(f.input,
    ports(f,{atomicIdempotentHost:false}))).reason,
  'ATOMIC_DURABLE_AGENT_HOST_UNAVAILABLE');
});

test('C26 refuses conflicting historical host run and never steals it',async()=>{
  const f=fixture('RESUME_OWNED');let writes=0;
  const p=ports(f,{
    lookupExistingAgentRun:async ({idempotencyKey})=>({
      source:'EXISTING_AGENT_HOST',idempotencyKey,
      taskId:'TASK-20261107-999',governedSessionId:SESSION,
      repository:'Patricked-code/MCP',headSha:SHA,
      executorRunId:'foreign-run',durable:true,status:'RUNNING'
    }),
    admitExistingP2:async()=>{writes++;return f.claim;}
  });
  const out=await continueC26WithExistingHost(f.input,p);
  assert.equal(out.status,'BLOCKED');
  assert.equal(out.reason,'DURABLE_EXECUTOR_BINDING_CONFLICT');
  assert.equal(writes,0);
});

test('C26 preserves owned-task recovery after host failure or unverified host receipt',async()=>{
  const f=fixture();
  for(const response of [
    {accepted:false},
    {accepted:true,idempotencyKey:'wrong',source:'EXISTING_AGENT_HOST',
      durable:true,executorRunId:'host-run-0001'},
    {accepted:true,idempotencyKey:'any',source:'UNTRUSTED',
      durable:true,executorRunId:'host-run-0001'}
  ]){
    const out=await continueC26WithExistingHost(f.input,
      ports(f,{startOrResumeExistingAgent:async work=>({
        ...response,
        idempotencyKey:response.idempotencyKey==='any'?work.idempotencyKey:response.idempotencyKey
      })}));
    assert.equal(out.status,'RECOVERY_REQUIRED');
    assert.equal(out.taskId,TASK);
    assert.equal(out.nextAction,'RESUME_OWNED_VIA_EXISTING_P2');
    assert.equal(out.certifiedC27,false);
  }
});


test('C26 refuses Regulatory/foreign bound transport before any P2 read, claim or host lookup',async()=>{
  const f=fixture();let accessed=0;
  const foreign=boundSession(f);
  foreign.governedSessionId='caa50d12-737c-47f9-9ee0-6cf8b763fdbe';
  const result=await continueC26WithExistingHost(f.input,ports(f,{
    readBoundAgentSession:async()=>foreign,
    readOwnP2State:async()=>{accessed++;return f.p2;},
    lookupExistingAgentRun:async()=>{accessed++;return null;},
    admitExistingP2:async()=>{accessed++;return f.claim;}
  }));
  assert.equal(result.status,'BLOCKED');
  assert.equal(result.reason,'OWN_TRANSPORT_SESSION_OR_BOOTSTRAP_CONFLICT');
  assert.equal(accessed,0);
});

test('C26 requires an actual readable own session; it never derives ownership from nextWork',async()=>{
  const f=fixture();let reads=0;
  for(const changes of [
    {readBoundAgentSession:undefined},
    {readBoundAgentSession:async()=>{throw Error('MCP_TRANSPORT_UNAVAILABLE');}},
    {readBoundAgentSession:async()=>null}
  ]){
    const result=await continueC26WithExistingHost(f.input,ports(f,{
      ...changes,readOwnP2State:async()=>{reads++;return f.p2;}
    }));
    assert.equal(result.status,'BLOCKED');
    assert.equal(result.claimedTask,false);
  }
  assert.equal(reads,0);
});

test('C26 rejects expired/mismatched Bootstrap Receipt and unverified OAuth',async()=>{
  for(const mutate of [
    x=>{x.bootstrapReceipt.status='ISSUED';},
    x=>{x.bootstrapReceipt.expiresAt='2026-11-07T15:09:30.000Z';},
    x=>{x.bootstrapReceipt.githubHead='b'.repeat(40);},
    x=>{x.bootstrapReceipt.runtimeRevision='b'.repeat(40);},
    x=>{x.bootstrapReceipt.stateVersion=1300;},
    x=>{x.ownerPrincipalId='oauth:other-agent';},
    x=>{x.identityAssurance='shared_credential';},
    x=>{x.connectionContext.evidenceSource='declared_only';},
    x=>{x.currentTransport=null;},
    x=>{x.status='PAUSED';},
    x=>{x.bootstrapReceipt.governedSessionId='other-session';}
  ]){
    const f=fixture(),session=boundSession(f);mutate(session);
    let reads=0;
    const result=await continueC26WithExistingHost(f.input,ports(f,{
      readBoundAgentSession:async()=>session,
      readOwnP2State:async()=>{reads++;return f.p2;}
    }));
    assert.equal(result.status,'BLOCKED');
    assert.equal(result.reason,'OWN_TRANSPORT_SESSION_OR_BOOTSTRAP_CONFLICT');
    assert.equal(reads,0);
  }
});

test('C26 cannot double-start a runner when two callers race over the same key',async()=>{
  const f=fixture();
  const started=new Map();
  let starts=0;
  const p=ports(f,{
    startOrResumeExistingAgent:async work=>{
      if(!started.has(work.idempotencyKey)){
        started.set(work.idempotencyKey,'shared-host-run');
        starts++;
      }
      return {source:'EXISTING_AGENT_HOST',durable:true,accepted:true,
        idempotencyKey:work.idempotencyKey,
        executorRunId:started.get(work.idempotencyKey)};
    }
  });
  const [a,b]=await Promise.all([
    continueC26WithExistingHost(f.input,p),
    continueC26WithExistingHost(f.input,p)
  ]);
  assert.equal(a.status,'DELEGATED');
  assert.equal(b.status,'DELEGATED');
  assert.equal(a.executorRunId,b.executorRunId);
  assert.equal(starts,1);
});
