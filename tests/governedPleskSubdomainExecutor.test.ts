import assert from 'node:assert/strict';
import test from 'node:test';
import { executeGovernedPleskSubdomain } from '../src/provisioning/governedPleskSubdomainExecutor.js';
import type { PleskSubdomainInput } from '../src/provisioning/pleskSite.js';
import type { PleskRemotePort } from '../src/provisioning/pleskSshAdapter.js';
import type { GovernedPleskAuthoritySnapshot } from '../src/provisioning/governedPleskSubdomainExecutor.js';

const now='2026-10-28T07:30:00.000Z';
const sha='48a529889517aa1c11974802d23acc3f35e0f187';
const task='TASK-20261028-555';
const session='11111111-1111-4111-8111-111111111111';
const root='/var/www/vhosts/wealthtechinnovations.com';
const request: PleskSubdomainInput={
  serverId:'s1',parentDomain:'wealthtechinnovations.com',
  label:'test-gd',documentRoot:'/test-gd',
  evidence:{parentExists:null,targetExists:null,documentRootExists:null,
    subscriptionAuthorized:null,documentRootSafe:null,targetOwnedByProvisioner:null}
};
const policy={enabled:true,allowedParents:{s1:['wealthtechinnovations.com'],s2:[]}};
const authority = ():GovernedPleskAuthoritySnapshot=>({
  source:'EXISTING_GOVERNED_RUNTIME',
  observedAt:now,
  taskId:task,taskStatus:'IN_PROGRESS',taskOwnerSessionId:session,
  taskResourceScopes:['plesk:s1:wealthtechinnovations.com'],
  sessionId:session,sessionStatus:'ACTIVE',sessionOwnerPrincipalId:'oauth:admin',
  sessionLastHeartbeatAt:now,
  lockOwnerSessionId:session,lockScope:'plesk:s1:wealthtechinnovations.com',
  lockExpiresAt:'2026-10-28T07:32:00.000Z',
  consent:'CREATE_SUBDOMAIN',
  githubMainSha:sha,serverCheckoutSha:sha,runtimeRevisionSha:sha,
  reviewAndCiApproved:true
});
const input={target:request,expectedTaskId:task,expectedSessionId:session,
  expectedPrincipalId:'oauth:admin',expectedHeadSha:sha,now,
  policy};
function remote(){
  const calls:string[]=[];
  const io:PleskRemotePort={
    readonly:async(_server,command)=>{
      calls.push('R:'+command);
      if(command.startsWith('plesk bin subscription --info')) return{code:0,stdout:'subscription',stderr:''};
      if(command.startsWith('plesk bin subdomain --info')) return{
        code:1,stdout:'',stderr:'Specified subdomain does not exist'
      };
      if(command==='test -d '+JSON.stringify(root)) return{code:0,stdout:''};
      // Quoted source paths use single quotes.
      if(command.startsWith('test -d ') && command.includes(root)) return{code:0,stdout:''};
      if(command.startsWith('test -L ')) return{code:1,stdout:''};
      if(command.startsWith('test -e ')) return{code:1,stdout:''};
      return{code:1,stdout:'',stderr:'unknown command'};
    },
    guarded:async(_server,command)=>{
      calls.push('W:'+command);
      return{code:0,stdout:'',stderr:''};
    }
  };
  return{io,calls};
}

test('RED: a verified own session/task/lock/consent and exact HEAD admits the existing bounded Plesk executor',async()=>{
  const {io,calls}=remote();
  // Post-create verification will fail (no target reported), never falsely claim CREATED.
  const out=await executeGovernedPleskSubdomain(input,{
    readExistingAuthority:async()=>authority(),remote:io
  });
  assert.equal(out.status,'UNVERIFIED');
  assert.equal(out.reason,'POST_CREATE_NOT_ATTESTED');
  assert.equal(calls.filter(c=>c.startsWith('W:')).length,1);
  assert.ok(calls.some(c=>c.startsWith('W:plesk bin subdomain --create')));
  assert.equal(out.operation,'PLESK_SUBDOMAIN_CREATE');
});

test('RED: no owner or exact session admission means no SSH write',async()=>{
  for(const change of [
    {source:'UNVERIFIED' as const},
    {taskOwnerSessionId:'other-session'},
    {sessionStatus:'PAUSED' as const},
    {sessionOwnerPrincipalId:'another-principal'},
    {taskStatus:'READY' as const},
    {taskResourceScopes:['other:scope']},
    {lockScope:'other:scope'},
    {lockOwnerSessionId:'other-session'},
    {lockExpiresAt:'2026-10-28T07:00:00.000Z'},
    {consent:null},
    {reviewAndCiApproved:false},
    {githubMainSha:'f'.repeat(40)},
    {runtimeRevisionSha:'f'.repeat(40)},
    {observedAt:'2026-10-28T05:00:00.000Z'}
  ]){
    const {io,calls}=remote();
    const out=await executeGovernedPleskSubdomain(input,{
      readExistingAuthority:async()=>({...authority(),...change}),remote:io
    });
    assert.equal(out.status,'BLOCKED',JSON.stringify(change));
    assert.equal(calls.filter(c=>c.startsWith('W:')).length,0);
  }
});

test('RED: true but caller-supplied consent never bypasses a failed trusted authority read',async()=>{
  const {io,calls}=remote();
  const out=await executeGovernedPleskSubdomain(input,{
    readExistingAuthority:async()=>{throw new Error('private credential');},remote:io
  });
  assert.equal(out.status,'BLOCKED');
  assert.equal(out.reason,'GOVERNED_AUTHORITY_UNAVAILABLE');
  assert.equal(calls.length,0);
  assert.doesNotMatch(JSON.stringify(out),/private credential/);
});

test('RED: unlisted parent/disabled policy forbids any server command even on privileged identity',async()=>{
  for(const pol of [{...policy,enabled:false},{...policy,allowedParents:{s1:[],s2:[]}}]){
    const {io,calls}=remote();
    const out=await executeGovernedPleskSubdomain({...input,policy:pol},{
      readExistingAuthority:async()=>authority(),remote:io
    });
    assert.equal(out.status,'BLOCKED');
    assert.equal(calls.filter(x=>x.startsWith('W:')).length,0);
  }
});

test('RED: no generalized shell, no cross-server or cross-account authorization',async()=>{
  for(const changed of [
    {...input,target:{...request,serverId:'s2' as const}},
    {...input,target:{...request,parentDomain:'other.example.com'}},
    {...input,target:{...request,label:'bad;command'}}
  ]){
    const {io,calls}=remote();
    const out=await executeGovernedPleskSubdomain(changed,{
      readExistingAuthority:async()=>authority(),remote:io
    });
    assert.equal(out.status,'BLOCKED');
    assert.ok(!calls.some(x=>x.startsWith('W:')));
  }
});
