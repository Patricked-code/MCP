import assert from 'node:assert/strict';
import { generateKeyPairSync } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createGrtResumeRead, registerGrtResumeTool } from '../src/cug/grtResumeTool.js';

const fixture=JSON.parse(readFileSync(new URL('../capsules/grt-repository-creation/test/grt-fixture.json',import.meta.url),'utf8'));
const project=fixture.before.project_continuity_id;
const target='Patricked-code/fixture';
const now=new Date('2026-11-20T12:00:00Z');
const pem=generateKeyPairSync('rsa',{modulusLength:2048}).privateKey.export({type:'pkcs8',format:'pem'}).toString();
const sha='b'.repeat(40);
const tree='c'.repeat(40);
const enc=(obj:unknown)=>Buffer.from(JSON.stringify(obj)).toString('base64url');
const bot={login:'github-actions[bot]',id:41898282};
type Options = {central?:typeof fixture.before; terminal?:boolean; missing?:boolean; wrongScope?:boolean;
  wrongMarker?:boolean; duplicate?:boolean; noReceipt?:boolean; truncated?:boolean; wrongParent?:boolean};
function fake(opts:Options={}){
  const calls:Array<[string,RequestInit|undefined]>=[];
  const state=opts.terminal?{...fixture.local,status:'LOCAL_HANDOFF_READY',phase:'HANDOFF',handoff:{
    status:'LOCAL_HANDOFF_READY',repository:target,baseline_commit_sha:sha,project_continuity:fixture.local.project_continuity
  }}:fixture.local;
  const local={user:bot,number:9,title:'[Governed Local Entry] Fixture',
    body:'<!-- GRT_PROJECT_REQUEST:GR-000099 -->\n<!-- GOVERNED_LOCAL_ENTRY_STATE:'+enc(state)+' -->'};
  const config={clientId:'oauth-client',subject:'approved',identityKey:'f'.repeat(64),
    accounts:[{login:'Patricked-code',installationId:22,probeRepository:target}],grt:{allowedTarget:target}};
  const read=createGrtResumeRead({
    getConfig:async()=>config,now:()=>now,readPrivateKey:async()=>pem,
    inspect:token=>token==='approved-token'?{clientId:config.clientId,subject:config.subject,scopes:['mcp:read'],
      expiresAt:now.getTime()/1000+600}:null,
    fetchImpl:async (input,init)=>{
      const url=String(input);
      calls.push([url,init]);
      assert.equal(new URL(url).origin,'https://api.github.com');
      assert.equal(init?.redirect,'error');
      if(url.endsWith('/issues/99'))return Response.json({number:99,user:bot,title:'[Governed Request] Fixture',
        body:'<!-- GRT_CUG_CREATE_TARGET:'+(opts.wrongMarker?'other/repo':target.toLowerCase())+' -->\n'+
          '<!-- GOVERNED_REQUEST_STATE:'+enc(opts.central??fixture.after)+' -->'});
      if(url.endsWith('/app/installations/22/access_tokens')){
        assert.equal(init?.method,'POST');
        assert.deepEqual(JSON.parse(String(init.body)),{repositories:['fixture'],permissions:{contents:'read',issues:'read'}});
        return Response.json({token:'ephemeral-fixture',expires_at:'2026-11-20T13:00:00Z',
          permissions:{contents:'read',issues:'read',metadata:'read'}},{status:201});
      }
      assert.equal(new Headers(init?.headers).get('Authorization'),'Bearer ephemeral-fixture');
      if(url.endsWith('/installation/repositories?per_page=2'))return Response.json({total_count:1,repositories:[
        {id:opts.wrongScope?654321:123456,full_name:target,archived:false}]});
      if(url.includes('/issues?'))return Response.json(opts.missing?[]:opts.duplicate?[local,local]:[local]);
      if(url.endsWith('/git/commits/'+sha))return Response.json({sha,parents:[
        {sha:opts.wrongParent?'d'.repeat(40):fixture.local.expected_head_sha}],tree:{sha:tree}});
      if(url.endsWith('/receipt.json?ref='+sha)){
        if(opts.noReceipt)return new Response(null,{status:404});
        const receipt={schema_version:'1.0.0',request_id:state.request_id,repository:target,
          completed_at:now.toISOString(),baseline_subject_head:state.expected_head_sha,project_continuity:state.project_continuity};
        return Response.json({type:'file',path:'.governance/local-entry/receipt.json',encoding:'base64',
          content:Buffer.from(JSON.stringify(receipt)).toString('base64')});
      }
      if(url.endsWith('/git/trees/'+tree+'?recursive=1'))return Response.json({sha:tree,truncated:opts.truncated??false,
        tree:[{path:'README.md',type:'blob'},{path:'docs/PROJECT-1__HANDOFF.md',type:'blob'},
          {path:'docs/old.md',type:'blob'},{path:'asset.png',type:'blob'}]});
      throw Error('unexpected URL '+url);
    }
  });
  return {read,calls};
}

test('the standalone SDK tool accepts only the continuity ID, and missing transport OAuth cannot read',async ()=>{
  const server=new McpServer({name:'fixture',version:'1'});
  const client=new Client({name:'test',version:'1'});
  const [a,b]=InMemoryTransport.createLinkedPair();
  const f=fake();
  try {
    registerGrtResumeTool(server,f.read);
    await server.connect(a);
    await client.connect(b);
    const {tools}=await client.listTools();
    assert.equal(tools[0]?.name,'mcp_resume_grt_repository_creation');
    assert.equal(tools[0]?.annotations?.readOnlyHint,true);
    assert.deepEqual(tools[0]?.inputSchema.required,['projectContinuityId']);
    const denied=await client.callTool({name:'mcp_resume_grt_repository_creation',arguments:{projectContinuityId:project}});
    assert.deepEqual(denied.structuredContent,{status:'UNAVAILABLE'});
    assert.equal(f.calls.length,0);
  }finally{await client.close();await server.close();}
});

test('the central checkpoint is used before handoff without opening local authority or leaking data',async()=>{
  const f=fake({central:fixture.before});
  const result=await f.read('approved-token',project);
  assert.equal(result.status,'READY');
  assert.equal((result as {checkpoint:{authority:string}}).checkpoint.authority,'GRT_CENTRAL');
  assert.equal(f.calls.length,1);
  assert.doesNotMatch(JSON.stringify(result),/secret-canary|ephemeral-fixture|approved-token/);
});

test('requested target, stable repository ID and unique bot issue gate the local resume',async()=>{
  for(const [opts,status,count] of [
    [{wrongMarker:true},'UNAVAILABLE',1],[{wrongScope:true},'BLOCKED',3],[{duplicate:true},'BLOCKED',4],
    [{missing:true},'WAITING_LOCAL',4],[{},'READY',4]
  ] as const){
    const f=fake(opts);
    const result=await f.read('approved-token',project);
    assert.equal(result.status,status);
    assert.equal(f.calls.length,count);
  }
});

test('terminal receipt is pinned to the baseline commit and GRGS is independently fail closed',async()=>{
  for(const [opts,baseline,documentation] of [
    [{},'BASELINE_ATTESTED','CLASSIFIED'],[{noReceipt:true},'NOT_ATTESTED','CLASSIFIED'],
    [{wrongParent:true},'NOT_ATTESTED','NOT_OBSERVED'],[{truncated:true},'BASELINE_ATTESTED','NOT_OBSERVED']
  ] as const){
    const f=fake({terminal:true,...opts});
    const result=await f.read('approved-token',project) as {
      status:string; architecture:{status:string};documentation:{status:string;counts?:Record<string,number>}
    };
    assert.equal(result.status,'HANDOFF');
    assert.equal(result.architecture.status,baseline);
    assert.equal(result.documentation.status,documentation);
    if(documentation==='CLASSIFIED')assert.deepEqual(result.documentation.counts,
      {CONVENTIONAL_EXCEPTION:1,SCOPED_DOCUMENT:1,LEGACY_REVIEW:1});
    assert.ok(f.calls.every(([,init])=>!init?.method||init.method==='POST'));
    assert.equal(f.calls.filter(([,init])=>init?.method==='POST').length,1);
  }
});
