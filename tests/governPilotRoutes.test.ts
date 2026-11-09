import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import type { AddressInfo } from 'node:net';
import {createGovernPilotRouter} from '../src/provisioning/governPilotRoutes.js';
import {GOUVERN_SHA,GOUVERN_SOURCE} from '../src/provisioning/governPilot.js';

async function fixture(f:(base:string,counts:{writes:number},ticket:string)=>Promise<void>, runtimeAuthorized=true){
 const app=express();app.use(express.urlencoded({extended:false}));
 const counts={writes:0};const ticket='signed-govern-pilot-ticket';
 app.use(createGovernPilotRouter({
  requireLogin:(req,res,next)=>{if(req.headers['x-test-login']!=='yes'){res.sendStatus(401);return;}next()},
  session:()=> 'session-1',
  sameOrigin:req=>req.headers['x-test-origin']==='same',
  issueTicket:()=>ticket,
  verifyTicket:(_purpose,value)=>value===ticket,
  enabled:()=>true,writeEnabled:()=>true,
  authorizeRuntimeWrite:async()=>runtimeAuthorized,
  read:async()=>null,
  stage:async()=>{counts.writes++;return{status:'STAGED',reason:'PRIVATE_GITHUB_SNAPSHOT_READY',revision:GOUVERN_SHA}}
 }));
 const srv=app.listen(0,'127.0.0.1');await new Promise<void>(r=>srv.once('listening',()=>r()));
 try{await f('http://127.0.0.1:'+(srv.address() as AddressInfo).port,counts,ticket)}
 finally{await new Promise<void>(r=>srv.close(()=>r()))}
}
test('GRT route RED: unauthenticated GET cannot see private pilot',async()=>fixture(async(base,x)=>{
 const r=await fetch(base+'/gouvern');assert.equal(r.status,401);assert.equal(x.writes,0);
}));
test('GRT route RED: operator receives a safe project page without raw files',async()=>fixture(async(base,x)=>{
 const r=await fetch(base+'/gouvern',{headers:{'x-test-login':'yes'}});
 assert.equal(r.status,200);const s=await r.text();
 assert.match(s,/Governed-Repository-Template/);
 assert.match(s,/consent_ticket/);
 assert.ok(!s.includes('/app/data'));
 assert.ok(!s.includes('.governance/control-plane-state'));
 assert.equal(x.writes,0);
}));
test('GRT route RED: unsigned and wrong-origin deployment attempts cannot write',async()=>fixture(async(base,x,ticket)=>{
 for(const extra of [{consent_ticket:''},{consent_ticket:ticket}]){
  const body=new URLSearchParams({revision:GOUVERN_SHA,source:GOUVERN_SOURCE,confirmation:'DEPLOY_GOUVERN',...extra});
  const r=await fetch(base+'/gouvern/deploy',{method:'POST',headers:{'x-test-login':'yes','content-type':'application/x-www-form-urlencoded'},body});
  assert.equal(r.status,403);assert.equal(x.writes,0);
 }
}));
test('GRT route RED: valid signed same-origin targeted consent stages only pinned source once',async()=>fixture(async(base,x,ticket)=>{
 const body=new URLSearchParams({source:GOUVERN_SOURCE,revision:GOUVERN_SHA,confirmation:'DEPLOY_GOUVERN',consent_ticket:ticket});
 const r=await fetch(base+'/gouvern/deploy',{method:'POST',headers:{'x-test-login':'yes','x-test-origin':'same','content-type':'application/x-www-form-urlencoded'},body});
 assert.equal(r.status,201);assert.equal((await r.json()).status,'STAGED');assert.equal(x.writes,1);
}));

test('GRT runtime RED: valid web consent cannot stage without governed runtime admission',async()=>fixture(async(base,x,ticket)=>{
 const body=new URLSearchParams({source:GOUVERN_SOURCE,revision:GOUVERN_SHA,confirmation:'DEPLOY_GOUVERN',consent_ticket:ticket});
 const r=await fetch(base+'/gouvern/deploy',{method:'POST',headers:{'x-test-login':'yes','x-test-origin':'same','content-type':'application/x-www-form-urlencoded'},body});
 assert.equal(r.status,403);
 assert.equal(x.writes,0);
},false));
