import assert from 'node:assert/strict';
import test from 'node:test';
import type {AddressInfo} from 'node:net';
import express from 'express';
import {createPleskSubdomainRouter} from '../src/provisioning/pleskWebRoutes.js';
import {createPleskWebTransportPairing} from '../src/provisioning/pleskWebTransportPairing.js';

test('B3i: original signed E3 HTTP route requires a one-use authenticated MCP transport pairing',async()=>{
 const target={serverId:'s1' as const,parentDomain:'example.com',
   label:'pilot',documentRoot:'/pilot'};
 const validSession='11111111-1111-4111-8111-111111111111';
 const request={transportSessionId:'server-authenticated-transport',
   identity:{assurance:'oauth_subject' as const,principalId:'oauth:admin',clientId:'mcp-client'}};
 let writes=0,checks=0,links=0;
 const current=Date.parse('2026-10-29T19:00:00.000Z');
 const pairing=createPleskWebTransportPairing({
   now:()=>current,
   lookupSessionId:id=>id===request.transportSessionId?validSession:null,
   inspectOauth:token=>token==='VERIFIED_MCP_TOKEN'?{
     subject:'admin',clientId:'mcp-client',scopes:['mcp:write','mcp:read'],
     expiresAt:Math.floor((current+600000)/1000)
   }:null
 });
 const webSession='signed-web-cookie-fixture';
 const ticket='e3-valid-ticket';
 const app=express();
 app.use(express.urlencoded({extended:false}));
 app.use(createPleskSubdomainRouter({
   requireLogin:(_req,_res,next)=>next(),
   session:()=>webSession,
   sameOrigin:()=>true,
   issueTicket:()=>ticket,
   verifyTicket:(_purpose,value,binding)=>value===ticket&&binding===JSON.stringify([
     webSession,target.serverId,target.parentDomain,target.label,target.documentRoot
   ]),
   policy:()=>({enabled:true,allowedParents:{s1:['example.com']}}),
   writeEnabled:()=>true,
   requireMcpPairing:true,
   authorizeRuntimeWrite:async(_target,context)=>{
     checks++;
     assert.ok(context);
     const link=pairing.redeem({
       proof:context!.pairingProof,target,webSessionBinding:webSession
     });
     if(link){
       links++;
       assert.equal(link.governedSessionId,validSession);
       assert.equal(link.transport.transportSessionId,request.transportSessionId);
     }
     // B3f's read-only result is a HOLD, not permission to invoke Plesk.
     return false;
   },
   consumeGovernedConsent:async()=>false,
   io:{
     readonly:async()=>({code:1,stdout:'',stderr:''}),
     guarded:async()=>{writes++;return {code:0,stdout:'WRONG'};}
   }
 }));
 const server=app.listen(0,'127.0.0.1');
 await new Promise<void>(resolve=>server.once('listening',resolve));
 try{
   const base='http://127.0.0.1:'+(server.address() as AddressInfo).port;
   const url=base+'/provisioning/plesk-subdomain';
   const preview=await fetch(url+'?'+new URLSearchParams(target));
   assert.equal(preview.status,200);
   // Preflight can legitimately be unavailable in a read-only mock, but
   // the actual production form is required to show the pairing field
   // whenever Plesk returns READY. Verify the router source in CI separately.
   const issue=pairing.issue({transport:request,oauthToken:'VERIFIED_MCP_TOKEN',target});
   assert.equal(issue.status,'ISSUED');
   const body=new URLSearchParams({...target,consent_ticket:ticket,
     consent_creation:'CREATE_SUBDOMAIN',confirm_fqdn:'pilot.example.com'});
   const without=await fetch(url,{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body});
   assert.equal(without.status,403);
   assert.equal(checks,0);
   body.set('mcp_pair_proof',issue.proof??'');
   const signed=await fetch(url,{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body});
   assert.equal(signed.status,403);
   assert.equal(links,1);
   assert.equal((await signed.json()).reason,'GOVERNED_RUNTIME_AUTHORITY_REQUIRED');
   const replay=await fetch(url,{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body});
   assert.equal(replay.status,403);
   assert.equal(links,1);
   assert.equal(writes,0);
 }finally{await new Promise<void>(resolve=>server.close(()=>resolve()));}
});
