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


test('FINDING-01: package manifest is found from both source and Docker dist/src module layouts',async()=>{
  const {mkdtemp,mkdir,writeFile,rm}=await import('node:fs/promises');
  const {tmpdir}=await import('node:os');
  const {join}=await import('node:path');
  const {pathToFileURL}=await import('node:url');
  const {readCanonicalRepositoryFromModuleManifest}=await import('../src/provisioning/universalAdminLiveProbe.js');
  const root=await mkdtemp(join(tmpdir(),'gd-u-layout-'));
  try{
    const manifest=join(root,'package.json');
    await writeFile(manifest,JSON.stringify({mcpValidationProfile:{repository:'Patricked-code/MCP'}}));
    for(const modulePath of ['src/provisioning/universalAdminLiveProbe.js',
      'dist/src/provisioning/universalAdminLiveProbe.js']){
      const absolute=join(root,modulePath);
      await mkdir(join(absolute,'..'),{recursive:true});
      const observed=await readCanonicalRepositoryFromModuleManifest(pathToFileURL(absolute).href);
      assert.equal(observed,'Patricked-code/MCP',modulePath);
    }
  }finally{await rm(root,{recursive:true,force:true});}
});

test('GD-U B3j: existing project context probe reads allowlisted Plesk subscriptions, without admin grant',async()=>{
  const commands:string[]=[];
  const out=await probeExistingAdminReadCapabilities({
    now:()=>new Date(now),
    githubGet:async()=>({ok:false,status:403,json:null}),
    canonicalRepository:async()=>null,
    allowedParents:async()=>({s1:['wealthtechinnovations.com'],s2:['chainsolutions.fr']}),
    remoteRead:async(server,command)=>{
      commands.push(server+':'+command);
      return{code:0,stdout:command==='id -u'?'0': 'Plesk subscription info',stderr:''};
    }
  });
  assert.deepEqual(commands.filter(x=>x.includes('subscription --info')),[ 
    "s1:plesk bin subscription --info 'wealthtechinnovations.com'",
    "s2:plesk bin subscription --info 'chainsolutions.fr'"
  ]);
  assert.equal(out.pleskSubscriptions.status,'CHECKED');
  assert.equal(out.pleskSubscriptions.observations.length,2);
  assert.ok(out.pleskSubscriptions.observations.every(x=>x.readPermissionObserved));
  assert.equal(out.pleskSubscriptions.pleskAdminWritePermissionVerified,false);
  assert.equal(out.adminWriteAuthorized,false);
});
test('GD-U B3j: invalid subscription configuration fails closed, without SSH diagnostic leak',async()=>{
  const out=await probeExistingAdminReadCapabilities({
    now:()=>new Date(now),
    githubGet:async()=>({ok:false,status:403,json:null}),
    canonicalRepository:async()=>null,
    allowedParents:async()=>({s1:["wealthtechinnovations.com'; command"]}),
    remoteRead:async(_,command)=>{
      if(command.includes('subscription'))throw Error('SECRET');
      return{code:0,stdout:command==='id -u'?'0':'Plesk',stderr:''};
    }
  });
  assert.equal(out.pleskSubscriptions.status,'BLOCKED');
  assert.deepEqual(out.pleskSubscriptions.observations,[]);
  assert.doesNotMatch(JSON.stringify(out),/SECRET/);
});
