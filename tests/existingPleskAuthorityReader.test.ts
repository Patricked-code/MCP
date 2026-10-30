import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { inspectExistingPleskAuthority } from '../src/provisioning/existingPleskAuthorityReader.js';
import type { ExistingPleskAuthorityPorts } from '../src/provisioning/existingPleskAuthorityReader.js';
import { executeGovernedPleskSubdomain, type GovernedPleskSubdomainRequest } from '../src/provisioning/governedPleskSubdomainExecutor.js';
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
  lastHeartbeatAt:at,
  bootstrapReceipt:{governedSessionId:sessionId,stateVersion:1150,expiresAt:'2026-10-28T05:38:00.000Z',status:'ACKNOWLEDGED'}
};
const lockRecord={
  scope:lock,status:'ACTIVE' as const,governedSessionId:sessionId,
  expiresAt:'2026-10-28T05:37:00.000Z'
};
const live={
  freshness:'CURRENT' as const,stateVersion:1150,alignment:{global:'FULLY_ALIGNED' as const},
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

test('GD-U-02D: real owned task+lock still cannot call SSH without signed E3/CI approval',async()=>{
  const observed=await inspectExistingPleskAuthority(request,identity,ports());
  assert.equal(observed.snapshot.source,'EXISTING_GOVERNED_RUNTIME');
  let sshCalls=0;
  const outcome=await executeGovernedPleskSubdomain(request,{
    readExistingAuthority:async()=>observed.snapshot,
    remote:{
      readonly:async()=>{sshCalls++;throw Error('SSH_MUST_NOT_BE_CALLED');},
      guarded:async()=>{sshCalls++;throw Error('SSH_MUST_NOT_BE_CALLED');}
    }
  });
  assert.equal(outcome.status,'BLOCKED');
  assert.equal(outcome.reason,'GOVERNED_ADMISSION_NOT_ATTESTED');
  assert.equal(sshCalls,0);
});

test('GD-U-02D: authority reader must not initialize/seeding Task Queue on its read path',()=>{
  const source=readFileSync('src/provisioning/existingPleskAuthorityReader.ts','utf8');
  assert.doesNotMatch(source,/await\s+taskDeps\.ready\(\)/);
  assert.match(source,/getVisibleTask\(id\)/);
  assert.match(source,/listActiveLocks\(\)/);
  assert.match(source,/getVisibleSession\(id,auth\)/);
});


test('EXTERNAL_GOVERNED_RECOVERY: missing, expired, foreign and stale bootstrap receipts fail closed',async()=>{
  for(const bootstrapReceipt of [
    null,
    {...session.bootstrapReceipt,expiresAt:'2026-10-28T05:34:00.000Z'},
    {...session.bootstrapReceipt,governedSessionId:'22222222-2222-4222-8222-222222222222'},
    {...session.bootstrapReceipt,stateVersion:1149}
  ]){
    const r=await inspectExistingPleskAuthority(request,identity,{
      ...ports(),getSession:async()=>({...session,bootstrapReceipt})
    });
    assert.equal(r.snapshot.source,'UNVERIFIED');
    assert.ok(r.blockers.includes('BOOTSTRAP_RECEIPT_NOT_CURRENT'));
    assert.equal(r.operationExecuted,false);
  }
});

test('EXTERNAL_GOVERNED_RECOVERY: live-state version drift invalidates bootstrap',async()=>{
  const r=await inspectExistingPleskAuthority(request,identity,{
    ...ports(),getLive:async()=>({...live,stateVersion:1151})
  });
  assert.equal(r.snapshot.source,'UNVERIFIED');
  assert.ok(r.blockers.includes('BOOTSTRAP_RECEIPT_NOT_CURRENT'));
});
