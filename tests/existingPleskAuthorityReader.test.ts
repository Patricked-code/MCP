import assert from 'node:assert/strict';
import test from 'node:test';
import { inspectExistingPleskAuthority } from '../src/provisioning/existingPleskAuthorityReader.js';
import type { ExistingPleskAuthorityPorts } from '../src/provisioning/existingPleskAuthorityReader.js';
import type { GovernedPleskSubdomainRequest } from '../src/provisioning/governedPleskSubdomainExecutor.js';
import type { SessionRequest } from '../src/operationalMemory/sessionService.js';

const sha='48a529889517aa1c11974802d23acc3f35e0f187';
const at='2026-10-28T05:35:00.000Z';
const owner='oauth:wealthtech-mcp-admin';
const sessionId='11111111-1111-4111-8111-111111111111';
const taskId='TASK-20261028-999';
const scope='plesk:s1:wealthtechinnovations.com';
const lock='resource:'+scope;

const request: GovernedPleskSubdomainRequest={
  expectedTaskId:taskId,expectedSessionId:sessionId,expectedPrincipalId:owner,
  expectedHeadSha:sha,now:at,
  target:{
    serverId:'s1',parentDomain:'wealthtechinnovations.com',
    label:'gd-test',documentRoot:'/gd-test',
    evidence:{parentExists:null,targetExists:null,documentRootExists:null,
      subscriptionAuthorized:null,documentRootSafe:null,targetOwnedByProvisioner:null}
  },
  policy:{enabled:true,allowedParents:{s1:['wealthtechinnovations.com']}}
};
const identity:SessionRequest={
  transportSessionId:'transport-123',
  identity:{principalId:owner,clientId:'oauth-client',assurance:'oauth_subject'}
};
const task={
  taskId,repository:'Patricked-code/MCP',status:'IN_PROGRESS' as const,
  ownerGovernedSessionId:sessionId,resourceScopes:[scope],
  observedHeadSha:sha
};
const session={
  governedSessionId:sessionId,status:'ACTIVE' as const,ownerPrincipalId:owner,
  lastHeartbeatAt:at
};
const lockRecord={
  scope:lock,status:'ACTIVE' as const,governedSessionId:sessionId,
  expiresAt:'2026-10-28T05:37:00.000Z'
};
const live={
  freshness:'CURRENT' as const,alignment:{global:'FULLY_ALIGNED' as const},
  github:{status:'CURRENT' as const,head:sha},
  s1:{status:'CURRENT' as const,head:sha},
  runtime:{status:'CURRENT' as const,revision:sha}
};
function ports():ExistingPleskAuthorityPorts {
  return{
    now:()=>new Date(at),
    getTask:async()=>task,
    getSession:async()=>session,
    listLocks:async()=>[lockRecord],
    getLive:async()=>live
  };
}

test('RED: actual Task/Session/Lock sources yield exact normalized resource lock, never invented E3/CI',async()=>{
  const r=await inspectExistingPleskAuthority(request,identity,ports());
  assert.equal(r.snapshot.source,'EXISTING_GOVERNED_RUNTIME');
  assert.equal(r.snapshot.taskId,taskId);
  assert.equal(r.snapshot.taskOwnerSessionId,sessionId);
  assert.equal(r.snapshot.sessionOwnerPrincipalId,owner);
  assert.equal(r.snapshot.lockScope,lock);
  assert.equal(r.snapshot.lockOwnerSessionId,sessionId);
  assert.deepEqual(r.snapshot.taskResourceScopes,[scope]);
  assert.equal(r.snapshot.consent,null);
  assert.equal(r.snapshot.reviewAndCiApproved,false);
  assert.ok(r.blockers.includes('E3_AND_CI_ATTESTATION_UNAVAILABLE'));
  assert.equal(r.operationExecuted,false);
});

test('RED: absent task, session, lock or live state must fail closed',async()=>{
  const base=ports();
  for(const patch of [
    {getTask:async()=>null},
    {getSession:async()=>null},
    {listLocks:async()=>[]},
    {getLive:async()=>null}
  ]){
    const r=await inspectExistingPleskAuthority(request,identity,{...base,...patch});
    assert.equal(r.snapshot.source,'UNVERIFIED');
    assert.ok(r.blockers.length>0);
    assert.equal(r.operationExecuted,false);
  }
});

test('RED: expired / foreign resource locks are NEVER mistaken for target scope',async()=>{
  for(const lockValue of [
    {...lockRecord,scope:'resource:plesk:s2:wealthtechinnovations.com'},
    {...lockRecord,governedSessionId:'22222222-2222-4222-8222-222222222222'},
    {...lockRecord,expiresAt:'2026-10-28T05:30:00.000Z'}
  ]){
    const r=await inspectExistingPleskAuthority(request,identity,{
      ...ports(),listLocks:async()=>[lockValue]
    });
    assert.equal(r.snapshot.source,'UNVERIFIED');
    assert.ok(r.blockers.includes('TARGET_LOCK_NOT_OWNED'));
  }
});

test('RED: transport cannot assert the owner of another principal',async()=>{
  const r=await inspectExistingPleskAuthority(request,{
    ...identity,identity:{...identity.identity,principalId:'oauth:other'}
  },ports());
  assert.equal(r.snapshot.source,'UNVERIFIED');
  assert.ok(r.blockers.includes('PRINCIPAL_NOT_AUTHENTICATED'));
});

test('RED: fresh live-state exact-HEAD alignment is mandatory',async()=>{
  for(const invalid of [
    {...live,runtime:{status:'CURRENT' as const,revision:'f'.repeat(40)}},
    {...live,freshness:'STALE' as const},
    {...live,s1:{status:'STALE' as const,head:sha}}
  ]){
    const r=await inspectExistingPleskAuthority(request,identity,{
      ...ports(),getLive:async()=>invalid
    });
    assert.equal(r.snapshot.source,'UNVERIFIED');
    assert.ok(r.blockers.includes('LIVE_SHA_NOT_ATTESTED'));
  }
});

test('RED: operational store read failures cannot expose exception text',async()=>{
  const r=await inspectExistingPleskAuthority(request,identity,{
    ...ports(),getTask:async()=>{throw Error('SECRET_PLESK_KEY')}
  });
  assert.equal(r.snapshot.source,'UNVERIFIED');
  assert.ok(r.blockers.includes('RUNTIME_SOURCE_UNAVAILABLE'));
  assert.doesNotMatch(JSON.stringify(r),/SECRET_/);
});
