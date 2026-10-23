import assert from 'node:assert/strict';
import test from 'node:test';
import express from 'express';
import type { AddressInfo } from 'node:net';
import type { PleskRemotePort } from '../src/provisioning/pleskSshAdapter.js';
import { createPleskSubdomainRouter } from '../src/provisioning/pleskWebRoutes.js';

function fixture() {
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
    writeEnabled:()=>true
  }));
  return {app,commands,writes,issueTicket};
}
async function withServer(f:(base:string,x:ReturnType<typeof fixture>)=>Promise<void>){
  const x=fixture();
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
