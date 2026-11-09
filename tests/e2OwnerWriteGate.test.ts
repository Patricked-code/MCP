import assert from 'node:assert/strict';
import test from 'node:test';
import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
process.env.MCP_AUTH_TOKEN ??= 'e2-owner-gate-test-token-only';
process.env.S1_HOST ??= '127.0.0.1';
process.env.S1_KEY_PATH ??= '/tmp/e2-s1-test-key';
process.env.S2_HOST ??= '127.0.0.1';
process.env.S2_KEY_PATH ??= '/tmp/e2-s2-test-key';
process.env.ENABLE_WRITE_TOOLS='false';
const {registerE2OwnerTools}=await import('../src/tools/e2OwnerTools.js');
test('actual E2 owner tool refuses issue and journal writes when server switch is OFF',async()=>{
 let handler:((args:any)=>Promise<any>)|null=null,requests=0,observations=0;
 registerE2OwnerTools({
  tool(name:string,_description:string,_schema:unknown,fn:(args:any)=>Promise<any>){
   assert.equal(name,'mcp_e2_select_chantier');handler=fn;
  }
 } as unknown as McpServer,{
  observe:async()=>{observations++;throw new Error('UNEXPECTED_OBSERVE');},
  journal:{request:async()=>{requests++;throw new Error('UNEXPECTED_GITHUB_REQUEST');}}
 });
 assert.ok(handler);
 const response=await handler!({
  entry_profile:'EXTERNAL_GOVERNED_RECOVERY',e2_explicitly_selected:true,
  entry_id:'E2-12345678-1234-1234-1234-123456789ABC',
  decision:'NEW',mandate:'Nouveau chantier gouverné E2',
  owner_authorized_github_write:true
 });
 const result=JSON.parse(response.content[0].text);
 assert.equal(result.status,'BLOCKED');
 assert.equal(result.reason,'E2_SERVER_WRITE_GATE_DISABLED');
 assert.equal(response.isError,true);
 assert.equal(requests,0);
 assert.equal(observations,0);
});
