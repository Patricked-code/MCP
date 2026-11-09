import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveOwnedPleskWebSession } from '../src/provisioning/pleskOwnedWebSession.js';
import type { SignedWebOauthConsentObservation } from '../src/provisioning/pleskWebOauthBridge.js';

const sha='48a529889517aa1c11974802d23acc3f35e0f187';
const principal='oauth:wealthtech-mcp-admin';
const session='11111111-1111-4111-8111-111111111111';
const task='TASK-20261028-555';
const scope='plesk:s1:wealthtechinnovations.com';
const consent:SignedWebOauthConsentObservation={
  status:'E3_AND_OAUTH_OBSERVED',principalId:principal,
  targetScope:'resource:'+scope,consentPurpose:'plesk-create-subdomain',
  governedSessionLinked:false,independentCiReviewVerified:false,
  runtimeWriteAuthorized:false,operationExecuted:false
};
const candidate={taskId:task,status:'IN_PROGRESS',ownerGovernedSessionId:session,
  resourceScopes:[scope],observedHeadSha:sha};
const ownerSession={governedSessionId:session,status:'ACTIVE',
  ownerPrincipalId:principal,lastHeartbeatAt:'2026-10-28T05:45:00.000Z'};
const ownedLock={scope:'resource:'+scope,governedSessionId:session,
  status:'ACTIVE',expiresAt:'2026-10-28T05:47:00.000Z'};
const live={freshness:'CURRENT',alignment:{global:'FULLY_ALIGNED'},
  github:{status:'CURRENT',head:sha},
  s1:{status:'CURRENT',head:sha},
  runtime:{status:'CURRENT',revision:sha}};
function ports(){
  return{
    now:()=>new Date('2026-10-28T05:45:05.000Z'),
    getTasks:async()=>[candidate],
    getVisibleSessions:async(principalId:string)=>principalId===principal?[ownerSession]:[],
    getLocks:async()=>[ownedLock],
    getLive:async()=>live
  };
}

test('RED: select only unique OAuth-owned task/session+exact Plesk lock, no user-supplied IDs',async()=>{
  const result=await resolveOwnedPleskWebSession(consent,ports());
  assert.equal(result.status,'UNIQUE_OWNED_CANDIDATE');
  assert.equal(result.taskId,task);
  assert.equal(result.sessionId,session);
  assert.equal(result.expectedHeadSha,sha);
  assert.equal(result.principalId,principal);
  assert.equal(result.runtimeWriteAuthorized,false);
  assert.equal(result.operationExecuted,false);
});

test('RED: ambiguous same-principal tasks fail closed, not choose arbitrary first',async()=>{
  const r=await resolveOwnedPleskWebSession(consent,{
    ...ports(),getTasks:async()=>[candidate,{...candidate,taskId:'TASK-20261028-556'}]
  });
  assert.equal(r.status,'BLOCKED');
  assert.equal(r.reason,'TASK_SELECTION_AMBIGUOUS');
  assert.equal(r.taskId,null);
});

test('RED: old or foreign lock, other principal, or wrong resource never selects task',async()=>{
  const bad=[
    {getLocks:async()=>[{...ownedLock,scope:'resource:plesk:s2:wealthtechinnovations.com'}]},
    {getLocks:async()=>[{...ownedLock,governedSessionId:'other-session'}]},
    {getLocks:async()=>[{...ownedLock,expiresAt:'2026-10-28T05:40:00.000Z'}]},
    {getVisibleSessions:async()=>[{...ownerSession,ownerPrincipalId:'oauth:other'}]},
    {getTasks:async()=>[{...candidate,resourceScopes:['plesk:s2:wealthtechinnovations.com']}]}
  ];
  for(const patch of bad){
    const result=await resolveOwnedPleskWebSession(consent,{...ports(),...patch});
    assert.equal(result.status,'BLOCKED',JSON.stringify(patch));
    assert.equal(result.runtimeWriteAuthorized,false);
  }
});

test('RED: stale/unverified live state or task SHA drift block principal match',async()=>{
  for(const patch of [
    {getLive:async()=>({...live,freshness:'STALE'})},
    {getLive:async()=>({...live,runtime:{status:'CURRENT',revision:'f'.repeat(40)}})},
    {getTasks:async()=>[{...candidate,observedHeadSha:'f'.repeat(40)}]}
  ]){
    const result=await resolveOwnedPleskWebSession(consent,{...ports(),...patch});
    assert.equal(result.status,'BLOCKED');
  }
});

test('RED: missing cryptographic E3+OAuth prerequisite, source failure or secret errors never select task',async()=>{
  const bad={...consent,status:'BLOCKED' as const,principalId:null,targetScope:null};
  assert.equal((await resolveOwnedPleskWebSession(bad,ports())).status,'BLOCKED');
  const result=await resolveOwnedPleskWebSession(consent,{
    ...ports(),getTasks:async()=>{throw Error('PRIVATE_TOKEN')}
  });
  assert.equal(result.status,'BLOCKED');
  assert.doesNotMatch(JSON.stringify(result),/PRIVATE_TOKEN/);
});
