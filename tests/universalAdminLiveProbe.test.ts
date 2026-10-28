import assert from 'node:assert/strict';
import test from 'node:test';
import {
  probeExistingAdminReadCapabilities,
  type DelegatedLiveProbeDependencies
} from '../src/provisioning/universalAdminLiveProbe.js';

const now='2026-10-28T07:00:00.000Z';
const commands: Array<[string,string]>=[];
const urls:string[]=[];
const deps:DelegatedLiveProbeDependencies={
  now:()=>new Date(now),
  githubGet:async endpoint=>{
    urls.push(endpoint);
    return {ok:true,status:200,json:{login:'Patricked-code'}};
  },
  remoteRead:async (server,command)=>{
    commands.push([server,command]);
    return {code:0,stdout:command==='id -u'?'0\n':'Plesk Obsidian 18.0\n',stderr:''};
  }
};
test('RED: actually executes bounded remote and GitHub read-only probes via typed provider ports',async()=>{
  const out=await probeExistingAdminReadCapabilities(deps);
  assert.deepEqual(urls,['/user']);
  assert.deepEqual(commands,[['s1','id -u'],['s1','plesk version'],['s2','id -u'],['s2','plesk version']]);
  assert.equal(out.github.status,'AUTHENTICATED');
  assert.equal(out.github.principal,'Patricked-code');
  assert.equal(out.servers.s1.userIsRootObserved,true);
  assert.equal(out.servers.s2.pleskCliAvailable,true);
  assert.equal(out.liveProviderCallsExecuted,true);
  assert.equal(out.mutationExecuted,false);
  assert.equal(out.adminWriteAuthorized,false);
});

test('RED: failed GitHub and unavailable Plesk do not fabricate admin delegation',async()=>{
  const out=await probeExistingAdminReadCapabilities({
    now:()=>new Date(now),
    githubGet:async()=>({ok:false,status:403,json:null}),
    remoteRead:async()=>({code:127,stdout:'',stderr:'Permission denied'})
  });
  assert.equal(out.github.status,'BLOCKED');
  assert.equal(out.github.principal,null);
  assert.equal(out.servers.s1.userIsRootObserved,false);
  assert.equal(out.servers.s2.pleskCliAvailable,false);
  assert.equal(out.adminWriteAuthorized,false);
  assert.equal(out.mutationExecuted,false);
});

test('RED: secrets, remote stdout and stderr are never returned',async()=>{
  const out=await probeExistingAdminReadCapabilities({
    now:()=>new Date(now),
    githubGet:async()=>({ok:true,status:200,json:{login:'owner',token:'SECRET_TOKEN'}}),
    remoteRead:async()=>({code:0,stdout:'SECRET_PLESK_KEY',stderr:'SECRET_SSH_KEY'})
  });
  const result=JSON.stringify(out);
  assert.doesNotMatch(result,/SECRET_/);
  assert.ok(!out.servers.s1.userIsRootObserved);
});

test('RED: transport failure is a local BLOCKED outcome, not an unhandled runtime exception',async()=>{
  const out=await probeExistingAdminReadCapabilities({
    now:()=>new Date(now),
    githubGet:async()=>{throw new Error('SECRET_FAIL_GITHUB')},
    remoteRead:async()=>{throw new Error('SECRET_FAIL_SSH')}
  });
  assert.equal(out.github.status,'BLOCKED');
  assert.equal(out.servers.s1.status,'BLOCKED');
  assert.equal(out.servers.s2.status,'BLOCKED');
  assert.doesNotMatch(JSON.stringify(out),/SECRET_FAIL/);
});

test('RED: no freeform command or mutation endpoint is accepted',async()=>{
  const out=await probeExistingAdminReadCapabilities(deps);
  assert.deepEqual(out.allowedCommands,['id -u','plesk version']);
  assert.equal(out.github.readOnly,true);
  assert.equal(out.servers.s1.readOnly,true);
});

test('GD-U-02B: configured canonical repository triggers a real scoped permission GET',async()=>{
  const calls:string[]=[];
  const result=await probeExistingAdminReadCapabilities({
    now:()=>new Date(now),
    canonicalRepository:async()=> 'Patricked-code/MCP',
    githubGet:async endpoint=>{
      calls.push(endpoint);
      if(endpoint==='/user') return{ok:true,status:200,json:{login:'Patricked-code'}};
      return{ok:true,status:200,json:{full_name:'Patricked-code/MCP',
        permissions:{pull:true,push:true,admin:true}}};
    },
    remoteRead:async(_server,command)=>({
      code:0,stdout:command==='id -u'?'0':'Plesk version',stderr:''
    })
  });
  assert.deepEqual(calls,['/user','/repos/Patricked-code/MCP']);
  assert.equal(result.githubRepository?.status,'VERIFIED_REPOSITORY_PERMISSIONS');
  assert.equal(result.githubRepository?.adminObserved,true);
  assert.equal(result.githubRepository?.runtimeWriteAuthorized,false);
  assert.equal(result.adminWriteAuthorized,false);
});
