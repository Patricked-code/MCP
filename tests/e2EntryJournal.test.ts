import assert from 'node:assert/strict';
import test from 'node:test';
import type {E2JournalEvent,E2JournalPort} from '../src/governance/e2EntryJournal.js';
process.env.MCP_AUTH_TOKEN ??= 'e2-journal-test-token-only-20261031';
process.env.S1_HOST ??= '127.0.0.1';
process.env.S1_KEY_PATH ??= '/tmp/e2-test-s1-key';
process.env.S2_HOST ??= '127.0.0.1';
process.env.S2_KEY_PATH ??= '/tmp/e2-test-s2-key';
const {appendE2Journal,loadE2Journal,recoverE2JournalEntry,findE2ContinuityInJournal,
 newE2EntryId,serializeE2Journal,parseE2Journal}
 =await import('../src/governance/e2EntryJournal.js');

function fake(){
 const comments:any[]=[];
 const port:E2JournalPort={async request(endpoint,options){
  if(options?.method==='POST'){
   const body=(options.jsonBody as any).body;
   const id=comments.length+100;
   const comment={id,body,created_at:'2026-10-31T02:25:00.000Z',
    user:{login:'Patricked-code'},author_association:'OWNER',
    html_url:'https://github.com/Patricked-code/MCP/issues/359#issuecomment-'+id};
   comments.push(comment);
   return {ok:true,status:201,json:comment};
  }
  // Official GitHub GET is /issues/comments/{id}; /issues/359/comments/{id} is invalid.
  if(endpoint.startsWith('/repos/Patricked-code/MCP/issues/359/comments/'))
   return {ok:false,status:404,json:null};
  const item=/\/comments\/(\d+)$/.exec(endpoint);
  if(item)return {ok:true,status:200,json:comments.find(x=>x.id===Number(item[1]))??null};
  const page=Number(new URL('https://api.github.com'+endpoint).searchParams.get('page')??1);
  return {ok:true,status:200,json:comments.slice((page-1)*100,page*100)};
 }};
 return {port,comments};
}
function event(entryId:string,stage:E2JournalEvent['stage']):E2JournalEvent{
 return {schemaVersion:1,entryId,observedAt:'2026-10-31T02:25:00.000Z',
  profile:'EXTERNAL_GOVERNED_RECOVERY',stage,
  githubMainSha:'7cbc5496e2a3bd28cf1205d7b659429f61ef6cc6',
  s1HeadSha:'1f6961063d27bc85087aab57a8f700fd7729e03f',
  runtimeSha:'1f6961063d27bc85087aab57a8f700fd7729e03f',
  continuityId:null,issueNumber:null,reasonCode:null};
}
test('each E2 entry has a unique ID; every activation and result is stored and replayed by GitHub',async()=>{
 const f=fake(),id=newE2EntryId(),another=newE2EntryId();
 assert.notEqual(id,another);
 for(const stage of ['ACTIVATED','READY_FOR_OWNER'] as const){
  const result=await appendE2Journal(event(id,stage),f.port);
  assert.equal(result.status,'RECORDED');
  assert.match(result.commentUrl!,/#issuecomment-/);
 }
 const result=await appendE2Journal(event(another,'ACTIVATED'),f.port);
 assert.equal(result.status,'RECORDED');
 const collected=await loadE2Journal(f.port);
 assert.equal(collected.status,'READY');
 assert.equal(collected.entries.length,3);
 const recovered=recoverE2JournalEntry(collected,id);
 assert.equal(recovered.status,'READY');
 assert.deepEqual(recovered.history.map(x=>x.stage),['ACTIVATED','READY_FOR_OWNER']);
 assert.equal(recovered.latest?.entryId,id);
});
test('invalid journal payload and unauthorized server responses fail closed',async()=>{
 const id=newE2EntryId(),e=event(id,'ACTIVATED');
 const body=serializeE2Journal(e);
 assert.deepEqual(parseE2Journal(body),e);
 assert.equal(parseE2Journal(body.replace('A','B')),null);
 const unavailable:E2JournalPort={async request(){return {ok:false,status:403,json:null}}};
 assert.equal((await appendE2Journal(e,unavailable)).status,'BLOCKED');
 assert.equal((await loadE2Journal(unavailable)).status,'UNAVAILABLE');
});
test('continuity ID is recovered ONLY from an explicit canonical registry receipt',async()=>{
 const f=fake(),id=newE2EntryId(),continuityId='MCP-E2-CONT-20261031-1234';
 const e={...event(id,'CONTINUITY_REGISTERED' as const),continuityId,issueNumber:428};
 assert.equal((await appendE2Journal(e,f.port)).status,'RECORDED');
 const history=await loadE2Journal(f.port);
 assert.deepEqual(findE2ContinuityInJournal(history,continuityId),{status:'READY',issueNumber:428});
 assert.deepEqual(findE2ContinuityInJournal(history,'MCP-E2-CONT-NOT-FOUND'),{
  status:'NOT_FOUND',issueNumber:null});
});
test('all E2 registrations are append-only: same ID with conflicting issues is refused',async()=>{
 const f=fake(),id=newE2EntryId(),continuityId='MCP-E2-CONT-20261031-1234';
 await appendE2Journal({...event(id,'CONTINUITY_REGISTERED'),continuityId,issueNumber:100},f.port);
 await appendE2Journal({...event(id,'CONTINUITY_REGISTERED'),continuityId,issueNumber:200},f.port);
 assert.equal(findE2ContinuityInJournal(await loadE2Journal(f.port),continuityId).status,
  'CONFLICT');
});
test('invalid or conflicting GitHub journal comments cannot be promoted to successful recovery',async()=>{
 const f=fake();
 f.comments.push({id:101,body:'<!-- MCP_E2_ENTRY_EVENT_V1:INVALID:000000 -->',
  created_at:'2026-10-31T02:25:00Z',user:{login:'Patricked-code'},
  author_association:'OWNER',html_url:'https://github.com/Patricked-code/MCP/issues/359#issuecomment-101'});
 assert.equal((await loadE2Journal(f.port)).status,'CONFLICT');
});

test('journal rejects forged issue comments from unauthorised GitHub actors',async()=>{
 const f=fake(),id=newE2EntryId();
 await appendE2Journal(event(id,'ACTIVATED'),f.port);
 f.comments[0].author_association='NONE';
 const result=await loadE2Journal(f.port);
 assert.equal(result.status,'CONFLICT');
});

test('unrelated issue discussion from a non-authorised contributor is ignored',async()=>{
 const f=fake(),id=newE2EntryId();
 await appendE2Journal(event(id,'ACTIVATED'),f.port);
 f.comments.push({id:101,body:'Unrelated community question, no journal marker',
  created_at:'2026-10-31T02:25:00Z',user:{login:'community-user'},
  author_association:'CONTRIBUTOR',
  html_url:'https://github.com/Patricked-code/MCP/issues/359#issuecomment-101'});
 const r=await loadE2Journal(f.port);
 assert.equal(r.status,'READY');
 assert.equal(r.entries.length,1);
});
