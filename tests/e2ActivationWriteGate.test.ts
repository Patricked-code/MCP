import assert from 'node:assert/strict';
import test from 'node:test';
import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
process.env.MCP_AUTH_TOKEN ??= 'e2-activation-disabled-gate-test-only';
process.env.S1_HOST ??= '127.0.0.1';
process.env.S1_KEY_PATH ??= '/tmp/e2-disabled-s1';
process.env.S2_HOST ??= '127.0.0.1';
process.env.S2_KEY_PATH ??= '/tmp/e2-disabled-s2';
process.env.ENABLE_WRITE_TOOLS='false';
const {registerE2AutomaticActivationTool}=await import('../src/tools/e2Activation.js');
test('E2 activation cannot journal or observe when the server write gate is disabled',async()=>{
 let handler:((x:any)=>Promise<any>)|null=null;
 let records=0,observations=0,repairs=0;
 const server={tool(name:string,_descr:string,_schema:unknown,fn:(x:any)=>Promise<any>){
  assert.equal(name,'mcp_e2_activate');handler=fn;
 }} as unknown as McpServer;
 registerE2AutomaticActivationTool(server,{
  observe:async()=>{observations++;throw new Error('UNEXPECTED_S1_OBSERVATION');},
  reconcile:async()=>{repairs++;throw new Error('UNEXPECTED_REPAIR');},
  record:async()=>{records++;throw new Error('UNEXPECTED_GITHUB_JOURNAL_WRITE');}
 });
 assert.ok(handler);
 const response=await handler!({
  entry_profile:'EXTERNAL_GOVERNED_RECOVERY',
  e2_explicitly_selected:true,allow_write:false
 });
 const payload=JSON.parse(response.content[0].text);
 assert.equal(response.isError,true);
 assert.equal(payload.code,'E2_SERVER_WRITE_GATE_DISABLED');
 assert.equal(payload.status,'RECONCILIATION_BLOCKED');
 assert.equal(records,0);
 assert.equal(observations,0);
 assert.equal(repairs,0);
});
