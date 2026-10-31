import assert from 'node:assert/strict';
import test from 'node:test';
import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {registerE2AutomaticActivationTool} from '../src/tools/e2Activation.js';

const SHA='7cbc5496e2a3bd28cf1205d7b659429f61ef6cc6';
const OLD='1f6961063d27bc85087aab57a8f700fd7729e03f';
function observation(dirty:boolean){
 return {
  repository:'Patricked-code/MCP',freshness:'CURRENT',stateVersion:11,
  generatedAt:'2026-10-31T01:00:00.000Z',ageSeconds:0,maxAgeSeconds:60,
  github:{status:'CURRENT',head:SHA,branch:'main'},
  s1:{status:'CURRENT',head:dirty?OLD:SHA,originMain:dirty?OLD:SHA,
   branch:'main',workingTreeClean:!dirty,diffEmpty:!dirty,
   fetchRemote:'git@github.com-mcp-patricked-ro:Patricked-code/MCP.git',
   pushRemote:'disabled://mcp-s1-read-only'},
  runtime:{status:'CURRENT',revision:dirty?OLD:SHA,
   health:'healthy',containerStatus:'running'},
  documentation:{status:'CURRENT',drift:dirty}
 } as any;
}
function capture(dirty:boolean){
 let callback:((input:any)=>Promise<any>)|null=null;
 let registered='',observed=0,repairs=0,receivedAllowWrite:unknown;
 const server={tool(name:string,_description:string,_schema:unknown,fn:(input:any)=>Promise<any>){
  registered=name;callback=fn;
 }} as unknown as McpServer;
 registerE2AutomaticActivationTool(server,{
  async observe(){observed++;return observation(dirty);},
  async reconcile(_snapshot,allowWrite){
   repairs++;receivedAllowWrite=allowWrite;
   return {outcome:'AWAITING_AUTHORITY',reason:'SCOPE_NOT_GRANTED'};
  }
 });
 assert.ok(callback);
 return {
  registered,
  run:(input:any)=>callback!(input),
  calls:()=>({observed,repairs,receivedAllowWrite})
 };
}
const entry={entry_profile:'EXTERNAL_GOVERNED_RECOVERY',
 e2_explicitly_selected:true,allow_write:false};

test('single E2 activation passes directly to work discovery when aligned',async()=>{
 const c=capture(false),r=await c.run(entry),body=JSON.parse(r.content[0].text);
 assert.equal(c.registered,'mcp_e2_activate');
 assert.equal(body.status,'CONTINUE_E2');
 assert.equal(body.reconciliationTriggered,false);
 assert.deepEqual(c.calls(),{observed:1,repairs:0,receivedAllowWrite:undefined});
});
test('E2 activation automatically starts correction on dirty Git without second tool call',async()=>{
 const c=capture(true),r=await c.run({...entry,allow_write:true});
 const body=JSON.parse(r.content[0].text);
 assert.equal(body.reconciliationTriggered,true);
 assert.equal(body.mechanism,'mcp_reconcile_s1_to_main');
 assert.equal(body.status,'RECONCILIATION_BLOCKED');
 assert.equal(body.nextStep,'RECONCILE_BEFORE_WORK');
 assert.deepEqual(c.calls(),{observed:1,repairs:1,receivedAllowWrite:true});
});
test('non-E2 activation never uses the reconciliation port',async()=>{
 const c=capture(true);
 const r=await c.run({...entry,entry_profile:'E1'});
 assert.equal(r.isError,true);
 assert.deepEqual(c.calls(),{observed:0,repairs:0,receivedAllowWrite:undefined});
});
