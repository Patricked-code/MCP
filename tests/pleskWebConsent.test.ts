import assert from 'node:assert/strict';
import test from 'node:test';
import express from 'express';
import type { AddressInfo } from 'node:net';
import type { PleskRemotePort } from '../src/provisioning/pleskSshAdapter.js';
import { createPleskSubdomainRouter } from '../src/provisioning/pleskWebRoutes.js';

function fixture(runtimeAuthorized = true) {
  const commands:string[]=[];
  const writes:string[]=[];
  let created=false;
  const io:PleskRemotePort={
    readonly:async (_s,cmd)=>{
      commands.push(cmd);
      if(cmd.startsWith('plesk bin subscription'))return {code:0,stdout:'subscription OK'};
      if(cmd.startsWith('plesk bin subdomain --info'))return created?{code:0,stdout:'exists'}:{code:1,stdout:'',stderr:'Error: Specified subdomain does not exist'};
      if(cmd.startsWith('test -L'))return {code:1,stdout:''};
      if(cmd.startsWith('test -e'))return {code:created?0:1,stdout:''};
      if(cmd.startsWith('test -d'))return {code:0,stdout:''};
      throw new Error('unexpected read '+cmd);
    },
    guarded:async (_s,cmd)=>{writes.push(cmd);created=true;return {code:0,stdout:'created'}}
  };
  const app=express();
  app.use(express.urlencoded({extended:false}));
  const session=()=> 'fixed-test-session';
  const issueTicket=(purpose:string,binding:string)=> 'mock.signed.'+Buffer.from(purpose+'|'+binding).toString('base64url');
  const verifyTicket=(purpose:string,ticket:unknown,binding:string)=>ticket===issueTicket(purpose,binding);
  app.use(createPleskSubdomainRouter({
    requireLogin:(_req,_res,next)=>next(),
    session,
    sameOrigin:()=>true,
    issueTicket,verifyTicket,
    policy:()=>({enabled:true,allowedParents:{s2:['chainsolutions.fr']}}),
    io,
    writeEnabled:()=>true,
    authorizeRuntimeWrite: async () => runtimeAuthorized
  }));
  return {app,commands,writes,issueTicket};
}
async function withServer(f:(base:string,x:ReturnType<typeof fixture>)=>Promise<void>,runtimeAuthorized=true){
  const x=fixture(runtimeAuthorized);
  const s=x.app.listen(0,'127.0.0.1');
  await new Promise<void>(resolve=>s.once('listening',()=>resolve()));
  try{await f('http://127.0.0.1:'+(s.address() as AddressInfo).port,x)}finally{await new Promise<void>(resolve=>s.close(()=>resolve()))}
}
const fields={serverId:'s2',parentDomain:'chainsolutions.fr',label:'tdd-safe',documentRoot:'/tdd-safe'};
const query=new URLSearchParams(fields).toString();

test('Plesk web RED: GET previews without writes and issues a signed session-bound ticket',async()=>{
  await withServer(async(base,x)=>{
    const r=await fetch(base+'/provisioning/plesk-subdomain?'+query);
    assert.equal(r.status,200);
    const html=await r.text();
    assert.match(html,/CREATE_SUBDOMAIN/);
    assert.match(html,/consent_ticket/);
    assert.equal(x.writes.length,0);
  });
});

test('Plesk web RED: missing or forged consent blocks mutation',async()=>{
  await withServer(async(base,x)=>{
    const r=await fetch(base+'/provisioning/plesk-subdomain',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({...fields,consent_creation:'CREATE_SUBDOMAIN',confirm_fqdn:'tdd-safe.chainsolutions.fr'})});
    assert.equal(r.status,403);
    assert.equal(x.writes.length,0);
  });
});

test('Plesk web RED: verified consent and exact target executes once',async()=>{
  await withServer(async(base,x)=>{
    const binding=JSON.stringify(['fixed-test-session','s2','chainsolutions.fr','tdd-safe','/tdd-safe']);
    const ticket=x.issueTicket('plesk-create-subdomain',binding);
    const r=await fetch(base+'/provisioning/plesk-subdomain',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({...fields,consent_creation:'CREATE_SUBDOMAIN',confirm_fqdn:'tdd-safe.chainsolutions.fr',consent_ticket:ticket})});
    assert.equal(r.status,201);
    assert.equal(x.writes.length,1);
    const result=await r.json();
    assert.equal(result.status,'CREATED');
  });
});

test('Plesk review RED: consent response prevents framing and caching',async()=>{
 await withServer(async(base)=>{
  const r=await fetch(base+'/provisioning/plesk-subdomain?'+query);
  assert.equal(r.status,200);
  assert.match(r.headers.get('content-security-policy')||'',/frame-ancestors 'none'/);
  assert.equal(r.headers.get('x-frame-options'),'DENY');
  assert.equal(r.headers.get('cache-control'),'no-store');
 });
});
test('Plesk review RED: signed consent cannot bypass absent runtime governance authority',async()=>{
 await withServer(async(base,x)=>{
  const bind=JSON.stringify(['fixed-test-session','s2','chainsolutions.fr','tdd-safe','/tdd-safe']);
  const ticket=x.issueTicket('plesk-create-subdomain',bind);
  const r=await fetch(base+'/provisioning/plesk-subdomain',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({...fields,consent_creation:'CREATE_SUBDOMAIN',confirm_fqdn:'tdd-safe.chainsolutions.fr',consent_ticket:ticket})});
  assert.equal(r.status,403);
  assert.equal(x.writes.length,0);
 },false);
});

test('B3e: existing Plesk router denies a second E3 consumption, with no second SSH write',async()=>{
  const writes:string[]=[];
  let consumed=false;
  const app=express();
  app.use(express.urlencoded({extended:false}));
  const ticket='signed-for-fixture';
  app.use(createPleskSubdomainRouter({
    requireLogin:(_req,_res,next)=>next(),
    session:()=> 'web-session-fixture',
    sameOrigin:()=>true,
    issueTicket:()=>ticket,
    verifyTicket:(_purpose,value)=>value===ticket,
    policy:()=>({enabled:true,allowedParents:{s2:['chainsolutions.fr']}}),
    writeEnabled:()=>true,
    authorizeRuntimeWrite:async()=>true,
    consumeGovernedConsent:async(_req,input,proof)=>{
      assert.equal(input.serverId,'s2');
      assert.equal(proof.ticket,ticket);
      assert.equal(proof.binding,JSON.stringify([
        'web-session-fixture','s2','chainsolutions.fr','tdd-safe','/tdd-safe'
      ]));
      if(consumed)return false;
      consumed=true;
      return true;
    },
    io:{
      readonly:async(_s,command)=>{
        if(command.startsWith('plesk bin subscription'))return {code:0,stdout:'OK'};
        if(command.startsWith('plesk bin subdomain --info'))return {code:1,stdout:'',stderr:'Specified subdomain does not exist'};
        if(command.startsWith('test -L')||command.startsWith('test -e'))return {code:1,stdout:''};
        return {code:0,stdout:''};
      },
      guarded:async(_s,command)=>{writes.push(command);return {code:0,stdout:'OK'};}
    }
  }));
  const server=app.listen(0,'127.0.0.1');
  await new Promise<void>(resolve=>server.once('listening',resolve));
  try{
    const url='http://127.0.0.1:'+(server.address() as AddressInfo).port+'/provisioning/plesk-subdomain';
    const form=new URLSearchParams({...fields,consent_creation:'CREATE_SUBDOMAIN',
      confirm_fqdn:'tdd-safe.chainsolutions.fr',consent_ticket:ticket});
    const first=await fetch(url,{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:form});
    assert.equal(first.status,503); // Plesk postcondition still not attested in this mock.
    const second=await fetch(url,{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:form});
    assert.equal(second.status,403);
    assert.equal((await second.json()).reason,'E3_SINGLE_USE_CONSUMPTION_REQUIRED');
    assert.equal(writes.length,1);
  }finally{await new Promise<void>(resolve=>server.close(()=>resolve()));}
});

test('GD-U B3i P0: paired MCP web creation MUST fail closed if single-use E3 consumer is absent',async()=>{
  const writes:string[]=[];
  const app=express();
  app.use(express.urlencoded({extended:false}));
  app.use(createPleskSubdomainRouter({
    requireLogin:(_req,_res,next)=>next(),
    session:()=> 'paired-session',
    sameOrigin:()=>true,
    issueTicket:()=> 'signed-ticket',
    verifyTicket:()=>true,
    policy:()=>({enabled:true,allowedParents:{s2:['chainsolutions.fr']}}),
    writeEnabled:()=>true,
    requireMcpPairing:true,
    authorizeRuntimeWrite:async()=>true, // simulated valid transport; no E3 consumer!
    io:{
      readonly:async(_s,cmd)=>{
        if(cmd.startsWith('plesk bin subscription'))return{code:0,stdout:'OK'};
        if(cmd.startsWith('plesk bin subdomain --info'))return{code:1,stdout:'',stderr:'Specified subdomain does not exist'};
        if(cmd.startsWith('test -L')||cmd.startsWith('test -e'))return{code:1,stdout:''};
        return{code:0,stdout:''};
      },
      guarded:async(_s,cmd)=>{writes.push(cmd);return{code:0,stdout:'OK'};}
    }
  }));
  const server=app.listen(0,'127.0.0.1');
  await new Promise<void>(resolve=>server.once('listening',resolve));
  try{
    const url='http://127.0.0.1:'+(server.address() as AddressInfo).port+'/provisioning/plesk-subdomain';
    const form=new URLSearchParams({...fields,consent_creation:'CREATE_SUBDOMAIN',
      confirm_fqdn:'tdd-safe.chainsolutions.fr',consent_ticket:'signed-ticket',
      mcp_pair_proof:'mock-transport-binding'});
    const response=await fetch(url,{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:form});
    assert.equal(response.status,403);
    assert.equal((await response.json()).reason,'E3_SINGLE_USE_CONSUMPTION_REQUIRED');
    assert.equal(writes.length,0);
  }finally{await new Promise<void>(resolve=>server.close(()=>resolve()));}
});

test('GD-U B3i P0: unreadable Plesk subscription is NOT evidence of authorization',async()=>{
  const {observePleskSubdomain}=await import('../src/provisioning/pleskSshAdapter.js');
  let readCount=0;
  const io:PleskRemotePort={
    readonly:async(_server,command)=>{
      readCount++;
      assert.match(command,/^plesk bin subscription --info /);
      return{code:13,stdout:'',stderr:'Permission denied'};
    },
    guarded:async()=>{throw Error('no write');}
  };
  const evidence=await observePleskSubdomain({
    serverId:'s2',parentDomain:'chainsolutions.fr',label:'tdd-safe',
    documentRoot:'/tdd-safe',evidence:{
      parentExists:null,targetExists:null,documentRootExists:null,
      subscriptionAuthorized:null,documentRootSafe:null,targetOwnedByProvisioner:null
    }
  },{enabled:true,allowedParents:{s2:['chainsolutions.fr']}},io);
  assert.equal(readCount,1);
  assert.equal(evidence.subscriptionAuthorized,false);
  assert.equal(evidence.parentExists,null);
});
