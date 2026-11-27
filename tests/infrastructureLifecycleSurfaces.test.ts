import assert from 'node:assert/strict';
import test from 'node:test';
import { once } from 'node:events';
import express from 'express';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { registerInfrastructureLifecycleTool } from '../src/tools/infrastructureLifecycle.js';
import { createInfrastructureLifecycleRouter } from '../src/web/infrastructureLifecycle.js';
import { runInfrastructureLifecycle } from '../src/infrastructureLifecycle/service.js';

test('AILM registers one typed read-only MCP tool and status matches shared service',async()=>{
  let config:any,handler:any,name:string|undefined;
  const server={registerTool(n:string,c:unknown,h:unknown){name=n;config=c;handler=h;}} as unknown as McpServer;
  registerInfrastructureLifecycleTool(server);
  assert.equal(name,'mcp_infrastructure_lifecycle');
  assert.equal(config.annotations.readOnlyHint,true);
  assert.equal(config.annotations.destructiveHint,false);
  const schema=z.object(config.inputSchema);
  assert.ok(schema.safeParse({scope:'s1',operation:'audit'}).success);
  assert.equal(schema.safeParse({scope:'s1',operation:'execute'}).success,false);
  const result=JSON.parse((await handler({scope:'all',operation:'status'})).content[0].text);
  const expected=await runInfrastructureLifecycle('all','status');
  assert.deepEqual({...result,observedAt:null},{...expected,observedAt:null});
});
test('AILM cockpit requires existing login, validates scope, escapes results and exposes no POST',async()=>{
  const app=express();let calls=0;
  app.use(createInfrastructureLifecycleRouter((req,res,next)=>{
    if(req.headers.cookie==='fixture=valid')next();else res.sendStatus(401);
  },async(scope,op)=>{
    calls++;const value=await runInfrastructureLifecycle(scope,op);
    return {...value,limitations:['<ScRiPt>alert(1)</ScRiPt>','<script>alert(1)</script>']};
  }));
  const server=app.listen(0,'127.0.0.1');
  try{
    await once(server,'listening');const addr=server.address();if(!addr||typeof addr==='string')throw Error('fixture');
    const url='http://127.0.0.1:'+addr.port+'/infrastructure-maintenance',headers={cookie:'fixture=valid'};
    assert.equal((await fetch(url)).status,401);assert.equal(calls,0);
    assert.equal((await fetch(url+'?operation=execute',{headers})).status,400);
    assert.equal((await fetch(url+'?scope=/etc',{headers})).status,400);
    assert.equal((await fetch(url,{headers,method:'POST'})).status,404);assert.equal(calls,0);
    const response=await fetch(url,{headers});assert.equal(response.status,200);assert.equal(calls,1);
    assert.match(response.headers.get('cache-control')??'',/no-store/);
    const html=await response.text();assert.match(html,/&lt;script&gt;/);assert.ok(html.includes('&lt;ScRiPt&gt;'));assert.equal(html.toLowerCase().includes('<script'),false);
    assert.match(html,/Programmation et exécution/);
  }finally{await new Promise<void>((resolve,reject)=>server.close(e=>e?reject(e):resolve()));}
});
