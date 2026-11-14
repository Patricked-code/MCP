import assert from 'node:assert/strict';
import test from 'node:test';
import express from 'express';
import { createCugAdmission, createCugRouter } from '../src/cug/admission.js';

const origin = 'https://mcp.example.test';
const accounts = [{ login: 'allowed', installationId: 1, probeRepository: 'allowed/probe' },{ login: 'other', installationId: 2, probeRepository: 'other/probe' }];
const config = { clientId: 'client-1', subject: 'admin-subject', identityKey: 'a'.repeat(64), accounts };
const credential = 'fixture-access-one';
const actor = { subject: config.subject, clientId: config.clientId, scopes: ['mcp:read'], expiresAt: 1_900_000_000 };
function fixture() {
  let available = true;
  let now = 1_800_000_000_000;
  const probed: string[] = [];
  const service = createCugAdmission({ origin, getConfig: async () => config, now: () => now,
    inspect: token => token === credential || token === 'fixture-access-two' ? actor : null,
    probe: async account => { probed.push(account.login); return available && account.login === 'allowed'; } });
  return { service, probed, revoke: () => { available = false; }, expire: () => { now += 301_000; } };
}
const request = (authUrl: string) => new URLSearchParams(new URL(authUrl).hash.slice(1)).get('request')!;

test('the sessionless tool issues a fragment-bound challenge only for an individually admitted OAuth client', async () => {
  const { service } = fixture();
  assert.equal((await service.begin('shared-fixture')).status, 'AUTHORIZATION_REQUIRED');
  const result = await service.begin(credential);
  assert.equal(result.status, 'AUTHENTICATION_REQUIRED');
  if (result.status !== 'AUTHENTICATION_REQUIRED') return assert.fail();
  assert.equal(new URL(result.authUrl).search, '');
  assert.match(request(result.authUrl), /^[A-Za-z0-9_-]{43}$/);
  assert.doesNotMatch(JSON.stringify(result), /fixture-access|sessionId/);
});
test('verification is bound to the exact OAuth token, filters installations and never grants an account without recheck', async () => {
  const f = fixture();
  const started = await f.service.begin(credential);
  if(started.status !== 'AUTHENTICATION_REQUIRED') return assert.fail();
  const ref=request(started.authUrl);
  assert.equal((await f.service.verify(ref, '5417646','fixture-access-two')).status,'AUTHORIZATION_REQUIRED');
  assert.deepEqual(f.probed,[]);
  const result=await f.service.verify(ref,'5417646',credential);
  assert.deepEqual(result,{status:'ACCOUNT_SELECTION_REQUIRED',accounts:[{login:'allowed'}]});
  assert.equal((await f.service.select(ref,'other',credential)).status,'AUTHORIZATION_REQUIRED');
  f.revoke();
  assert.equal((await f.service.select(ref,'allowed',credential)).status,'AUTHORIZATION_REQUIRED');
});
test('selection returns the same canonical identity on a new successful admission and consumes each challenge',async()=>{
  const f=fixture();
  async function admit(){
    const started=await f.service.begin(credential);
    if(started.status!=='AUTHENTICATION_REQUIRED')return assert.fail();
    const ref=request(started.authUrl);
    assert.equal((await f.service.verify(ref,'5417646',credential)).status,'ACCOUNT_SELECTION_REQUIRED');
    const result=await f.service.select(ref,'allowed',credential);
    assert.equal(result.status,'AUTHENTICATED');
    assert.equal((await f.service.select(ref,'allowed',credential)).status,'AUTHORIZATION_REQUIRED');
    return result;
  }
  assert.deepEqual(await admit(),await admit());
});
test('the dedicated Express page has two fields and rejects foreign origin and expired requests', async()=>{
  const f=fixture();
  const app=express();
  app.use(createCugRouter(f.service,origin,()=>true));
  const server=app.listen(0,'127.0.0.1');
  try {
    await new Promise<void>(resolve=>server.once('listening',resolve));
    const address=server.address();
    if(!address||typeof address==='string')return assert.fail();
    const url='http://127.0.0.1:'+address.port;
    const page=await fetch(url+'/repo-template/auth');
    assert.equal(page.status,200);
    assert.equal(page.headers.get('cache-control'),'no-store');
    const html=await page.text();
    assert.equal([...html.matchAll(/<input\b/g)].length,2);
    assert.match(html,/Bearer/);
    assert.doesNotMatch(html,/Client ID/);
    const started=await f.service.begin(credential);
    if(started.status!=='AUTHENTICATION_REQUIRED')return assert.fail();
    f.expire();
    const post=(from:string)=>fetch(url+'/repo-template/auth/verify',{method:'POST',headers:{origin:from,'content-type':'application/json',authorization:'Bearer '+credential},body:JSON.stringify({appId:'5417646',request:request(started.authUrl)})});
    assert.equal((await post('https://other.example')).status,403);
    assert.equal((await post(origin)).status,401);
  } finally { await new Promise<void>((resolve,reject)=>server.close(error=>error?reject(error):resolve())); }
});

test('disabled CUG leaves the historical route reachable and hides both CUG methods',async()=>{
  const f=fixture();
  const app=express();
  app.use(createCugRouter(f.service,origin,()=>false));
  app.get('/gouvern',(_req,res)=>res.status(200).send('existing route'));
  const server=app.listen(0,'127.0.0.1');
  try {
    await new Promise<void>(resolve=>server.once('listening',resolve));
    const address=server.address();
    if(!address||typeof address==='string')return assert.fail();
    const url='http://127.0.0.1:'+address.port;
    assert.equal(await (await fetch(url+'/gouvern')).text(),'existing route');
    assert.equal((await fetch(url+'/repo-template/auth')).status,404);
    assert.equal((await fetch(url+'/repo-template/auth/verify',{method:'POST'})).status,404);
  } finally { await new Promise<void>((resolve,reject)=>server.close(error=>error?reject(error):resolve())); }
});

test('an MCP sessionless client calls the actual tool registration without creating a governed session', async()=>{
  const [{McpServer},{StreamableHTTPServerTransport},{Client},{StreamableHTTPClientTransport},{registerCugAdmissionTool}]=await Promise.all([
    import('@modelcontextprotocol/sdk/server/mcp.js'),
    import('@modelcontextprotocol/sdk/server/streamableHttp.js'),
    import('@modelcontextprotocol/sdk/client/index.js'),
    import('@modelcontextprotocol/sdk/client/streamableHttp.js'),
    import('../src/cug/admission.js'),
  ]);
  const f=fixture();
  const app=express();
  app.use(express.json());
  const mcp=new McpServer({name:'cug-integration-fixture',version:'1.0.0'});
  registerCugAdmissionTool(mcp,f.service);
  const transport=new StreamableHTTPServerTransport({sessionIdGenerator:()=> 'cug-test-transport'});
  await mcp.connect(transport);
  app.get('/mcp',(_req,res)=>res.sendStatus(405));
  app.delete('/mcp',async(req,res)=>{await transport.handleRequest(req,res);});
  app.post('/mcp',async(req,res)=>{
    if(req.header('authorization')==='Bearer '+credential) Object.assign(req,{auth:{token:credential,clientId:'client-1',scopes:['mcp:read']}});
    await transport.handleRequest(req,res,req.body);
  });
  const server=app.listen(0,'127.0.0.1');
  const client=new Client({name:'fixture-client',version:'1.0.0'});
  try{
    await new Promise<void>(resolve=>server.once('listening',resolve));
    const address=server.address();
    if(!address||typeof address==='string')return assert.fail();
    await client.connect(new StreamableHTTPClientTransport(new URL('http://127.0.0.1:'+address.port+'/mcp'),{
      requestInit:{headers:{Authorization:'Bearer '+credential}}
    }));
    assert.deepEqual((await client.listTools()).tools.map(x=>x.name),['mcp_start_governed_request_auth']);
    const result=await client.callTool({name:'mcp_start_governed_request_auth',arguments:{}});
    assert.equal(result.structuredContent?.status,'AUTHENTICATION_REQUIRED');
    assert.match(String(result.structuredContent?.authUrl), /^https:\/\/mcp\.example\.test\/repo-template\/auth#request=/);
    assert.deepEqual(f.probed,[]);
  }finally{
    await client.close();
    await mcp.close();
    await new Promise<void>((resolve,reject)=>server.close(error=>error?reject(error):resolve()));
  }
});
