import assert from 'node:assert/strict';
import test from 'node:test';
import type {E2OwnerPort} from '../src/governance/e2OwnerLifecycle.js';
import type {E2JournalEvent,E2JournalPort} from '../src/governance/e2EntryJournal.js';
process.env.MCP_AUTH_TOKEN ??= 'e2-journal-test-token-only-20261031';
process.env.S1_HOST ??= '127.0.0.1';
process.env.S1_KEY_PATH ??= '/tmp/e2-test-s1-key';
process.env.S2_HOST ??= '127.0.0.1';
process.env.S2_KEY_PATH ??= '/tmp/e2-test-s2-key';
const {routeE2OwnerChoice}=await import('../src/governance/e2OwnerLifecycle.js');
const {appendE2Journal,newE2EntryId}=await import('../src/governance/e2EntryJournal.js');
const sha='7cbc5496e2a3bd28cf1205d7b659429f61ef6cc6';
const local={
 repository:'Patricked-code/MCP',freshness:'CURRENT',stateVersion:42,
 generatedAt:'2026-10-31T02:20:00.000Z',ageSeconds:0,maxAgeSeconds:60,
 github:{status:'CURRENT',head:sha,branch:'main'},
 s1:{status:'CURRENT',head:sha,originMain:sha,branch:'main',
  fetchRemote:'git@github.com-mcp-patricked-ro:Patricked-code/MCP.git',
  pushRemote:'disabled://mcp-s1-read-only',workingTreeClean:true,diffEmpty:true},
 runtime:{status:'CURRENT',revision:sha,health:'healthy',containerStatus:'running'},
 documentation:{status:'CURRENT',drift:false}
} as any;
function fixture(){
 const comments:any[]=[],issues:any[]=[];
 let sequence=100,duplicate=false,healthy=true;
 const journal:E2JournalPort={async request(endpoint,opts){
  if(endpoint==='/repos/Patricked-code/MCP/issues'&&opts?.method==='POST'){
   const input=opts.jsonBody as any;
   const result={number:++sequence,title:input.title,body:input.body};
   issues.push(result);return {ok:true,status:201,json:result};
  }
  if(endpoint.startsWith('/repos/Patricked-code/MCP/issues?')){
   return {ok:true,status:200,json:duplicate?[{
    number:99,title:'Nouveau module MCP E2'
   }]:issues};
  }
  if(endpoint.startsWith('/repos/Patricked-code/MCP/issues/359/comments')){
   if(opts?.method==='POST'){
    const c={id:++sequence,body:(opts.jsonBody as any).body,
     created_at:'2026-10-31T02:25:00.000Z',
     html_url:'https://github.com/Patricked-code/MCP/issues/359#issuecomment-'+sequence};
    comments.push(c);return {ok:true,status:201,json:c};
   }
   const match=/\/comments\/(\d+)$/.exec(endpoint);
   if(match)return {ok:true,status:200,
    json:comments.find(x=>x.id===Number(match[1]))??null};
   const page=Number(new URL('https://api.github.com'+endpoint).searchParams.get('page')??1);
   return {ok:true,status:200,json:comments.slice((page-1)*100,page*100)};
  }
  const m=/\/issues\/(\d+)$/.exec(endpoint);
  if(m){
   const row=issues.find(x=>x.number===Number(m[1]));
   return {ok:!!row,status:row?200:404,json:row??null};
  }
  return {ok:false,status:404,json:null};
 }};
 const port:E2OwnerPort={journal,observe:async()=>healthy?local:{
  ...local,s1:{...local.s1,workingTreeClean:false}
 }};
 return {journal,port,comments,issues,setDuplicate:(v:boolean)=>{duplicate=v;},
  setHealthy:(v:boolean)=>{healthy=v;}};
}
function event(entryId:string,stage:'ACTIVATED'|'READY_FOR_OWNER'):E2JournalEvent{
 return {schemaVersion:1,entryId,observedAt:'2026-10-31T02:24:00.000Z',
  profile:'EXTERNAL_GOVERNED_RECOVERY',stage,
  githubMainSha:sha,s1HeadSha:sha,runtimeSha:sha,
  continuityId:null,issueNumber:null,reasonCode:null};
}
async function activate(f:ReturnType<typeof fixture>){
 const entryId=newE2EntryId();
 for(const stage of ['ACTIVATED','READY_FOR_OWNER'] as const)
  assert.equal((await appendE2Journal(event(entryId,stage),f.journal)).status,'RECORDED');
 return entryId;
}
test('E2 owner NEW -> check duplicates -> issue+Continuity ID -> registry -> RESUME by ID',async()=>{
 const f=fixture(),entryId=await activate(f);
 const result=await routeE2OwnerChoice({
  entryId,kind:'NEW',mandate:'Nouveau module MCP E2'
 },f.port);
 assert.equal(result.status,'READY_NEW');
 assert.match(result.continuityId!,/^MCP-E2-CONT-/);
 assert.equal(result.issueNumber,f.issues[0]?.number);
 assert.ok(f.issues[0]?.body.includes(result.continuityId));
 const second=await activate(f);
 const resumed=await routeE2OwnerChoice({
  entryId:second,kind:'RESUME',continuityId:result.continuityId!
 },f.port);
 assert.equal(resumed.status,'READY_RESUME');
 assert.equal(resumed.continuityId,result.continuityId);
 assert.equal(resumed.issueNumber,result.issueNumber);
 assert.equal(f.issues.length,1);
});
test('new mandate matching an issue is NOT duplicated',async()=>{
 const f=fixture(),entryId=await activate(f);f.setDuplicate(true);
 const result=await routeE2OwnerChoice({
  entryId,kind:'NEW',mandate:'Nouveau module MCP E2'
 },f.port);
 assert.equal(result.status,'DUPLICATE_FOUND');
 assert.equal(f.issues.length,0);
});
test('owner cannot choose work before E2 alignment or without activation receipt',async()=>{
 const f=fixture(),entryId=await activate(f);f.setHealthy(false);
 const result=await routeE2OwnerChoice({
  entryId,kind:'NEW',mandate:'Nouveau module MCP E2'
 },f.port);
 assert.equal(result.status,'BLOCKED');
 assert.equal(result.reason,'E2_ALIGNMENT_NO_LONGER_CURRENT');
 assert.equal(f.issues.length,0);
 const wrong=await routeE2OwnerChoice({
  entryId:newE2EntryId(),kind:'NEW',mandate:'Nouveau module MCP E2'
 },f.port);
 assert.equal(wrong.status,'BLOCKED');
 assert.equal(f.issues.length,0);
});
test('unknown existing Continuity ID is not inferred or fabricated',async()=>{
 const f=fixture(),entryId=await activate(f);
 const result=await routeE2OwnerChoice({
  entryId,kind:'RESUME',continuityId:'MCP-E2-CONT-20261031-NOTFOUND'
 },f.port);
 assert.equal(result.status,'BLOCKED');
 assert.equal(result.reason,'E2_CONTINUITY_ID_NOT_INDEXED');
});
