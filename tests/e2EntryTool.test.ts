import assert from 'node:assert/strict';
import test from 'node:test';
import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {registerE2PreflightReadOnlyTool} from '../src/tools/e2Entry.js';
const sha='7cbc5496e2a3bd28cf1205d7b659429f61ef6cc6';
test('E2 tool is independent from GWC and requires explicit selection',async()=>{
 let handler:((input:any)=>Promise<any>)|undefined;
 const server={tool(_name:string,_description:string,_schema:unknown,fn:(input:any)=>Promise<any>){
   handler=fn;
 }} as unknown as McpServer;
 let reads=0;
 registerE2PreflightReadOnlyTool(server,{
  async reconcileNow(){
   reads++;
   return {
    repository:'Patricked-code/MCP',freshness:'CURRENT',stateVersion:5,
    generatedAt:'2026-10-31T01:40:00.000Z',ageSeconds:0,maxAgeSeconds:60,
    github:{status:'CURRENT',branch:'main',head:sha},
    s1:{status:'CURRENT',branch:'main',head:sha,originMain:sha,
      workingTreeClean:true,diffEmpty:true,
      fetchRemote:'git@github.com-mcp-patricked-ro:Patricked-code/MCP.git',
      pushRemote:'disabled://mcp-s1-read-only'},
    runtime:{status:'CURRENT',revision:sha,containerStatus:'running',health:'healthy'},
    documentation:{status:'CURRENT',drift:false}
   } as any;
  }
 });
 assert.ok(handler);
 const denied=await handler!({entry_profile:'E1',e2_explicitly_selected:true});
 assert.equal(denied.isError,true);
 assert.equal(reads,0);
 const result=await handler!({
  entry_profile:'EXTERNAL_GOVERNED_RECOVERY',e2_explicitly_selected:true
 });
 const json=JSON.parse(result.content[0].text);
 assert.equal(json.gate,'DISCOVER_GITHUB_CONTINUITIES');
 assert.equal(json.grantsWriteAccess,false);
 assert.equal(reads,1);
});
