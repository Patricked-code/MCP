import assert from 'node:assert/strict';
import test from 'node:test';
import type { Request } from 'express';
import { createPleskGovernedWebExecutionBridge } from '../src/provisioning/pleskGovernedWebExecutionBridge.js';
import type { PleskSubdomainInput } from '../src/provisioning/pleskSite.js';
const target:PleskSubdomainInput={
 serverId:'s1',parentDomain:'example.com',label:'sandbox',documentRoot:'/sandbox',
 evidence:{parentExists:null,targetExists:null,documentRootExists:null,
  subscriptionAuthorized:null,documentRootSafe:null,targetOwnedByProvisioner:null}
};
function fixture(){
 const events:string[]=[];
 const bridge=createPleskGovernedWebExecutionBridge({
  prepare:async(_target,ctx)=>{events.push('prepare');return {ticket:ctx.consentTicket};},
  consume:async(_proof,signed)=>{events.push('consume');return signed.ticket==='signed-e3';},
  execute:async()=>{events.push('governed-executor');return{status:'CREATED',reason:'POST_CREATE_ATTESTED'};}
 });
 return {bridge,events};
}
function ctx(req:Request){
 return {req,pairingProof:'trusted-mcp-pairing',consentTicket:'signed-e3',binding:'server-bound'};
}
test('B3j RED: authenticated bridge completes only prepare→E3 once→governed executor',async()=>{
 const {bridge,events}=fixture();
 const req={} as Request;
 assert.equal(await bridge.authorizeRuntimeWrite(target,ctx(req)),true);
 assert.equal(await bridge.consumeGovernedConsent(req,target,{ticket:'signed-e3',binding:'server-bound'}),true);
 const done=await bridge.executeGovernedCreate(req,target);
 assert.equal(done.status,'CREATED');
 assert.deepEqual(events,['prepare','consume','governed-executor']);
 const retry=await bridge.executeGovernedCreate(req,target);
 assert.equal(retry.status,'BLOCKED');
 assert.deepEqual(events,['prepare','consume','governed-executor']);
});
test('B3j RED: no authenticated prepare means E3 cannot be consumed',async()=>{
 const {bridge,events}=fixture();
 const req={} as Request;
 assert.equal(await bridge.consumeGovernedConsent(req,target,{ticket:'signed-e3',binding:'server-bound'}),false);
 assert.equal((await bridge.executeGovernedCreate(req,target)).status,'BLOCKED');
 assert.deepEqual(events,[]);
});
test('B3j RED: changed target or ticket blocks and never invokes SSH',async()=>{
 const {bridge,events}=fixture();
 const req={} as Request;
 assert.equal(await bridge.authorizeRuntimeWrite(target,ctx(req)),true);
 assert.equal(await bridge.consumeGovernedConsent(req,{...target,label:'other'},{
  ticket:'signed-e3',binding:'server-bound'}),false);
 assert.equal((await bridge.executeGovernedCreate(req,target)).status,'BLOCKED');
 assert.deepEqual(events,['prepare']);
});
test('B3j RED: failed E3 consumption cannot be retried via same request',async()=>{
 const {bridge,events}=fixture();
 const req={} as Request;
 assert.equal(await bridge.authorizeRuntimeWrite(target,ctx(req)),true);
 assert.equal(await bridge.consumeGovernedConsent(req,target,{ticket:'bad',binding:'server-bound'}),false);
 assert.equal(await bridge.consumeGovernedConsent(req,target,{ticket:'signed-e3',binding:'server-bound'}),false);
 assert.equal((await bridge.executeGovernedCreate(req,target)).status,'BLOCKED');
 assert.deepEqual(events,['prepare']);
});
test('B3j RED: executor failure never reuses consumed proof or leaks secret',async()=>{
 const bridge=createPleskGovernedWebExecutionBridge({
  prepare:async()=>({privateToken:'DONT_LEAK'}),
  consume:async()=>true,
  execute:async()=>{throw Error('DONT_LEAK');}
 });
 const req={} as Request;
 assert.equal(await bridge.authorizeRuntimeWrite(target,ctx(req)),true);
 assert.equal(await bridge.consumeGovernedConsent(req,target,{ticket:'signed-e3',binding:'server-bound'}),true);
 const out=await bridge.executeGovernedCreate(req,target);
 assert.equal(out.status,'BLOCKED');
 assert.doesNotMatch(JSON.stringify(out),/DONT_LEAK/);
 assert.equal((await bridge.executeGovernedCreate(req,target)).status,'BLOCKED');
});
