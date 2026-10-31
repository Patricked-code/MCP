import assert from 'node:assert/strict';
import test from 'node:test';
import {createHash} from 'node:crypto';
import type {LiveStateSnapshot} from '../src/liveState/types.js';
import type {E2LocalSnapshot,E2ProposalPorts,E2LocalFile} from '../src/governance/e2S1GithubProposal.js';
process.env.MCP_AUTH_TOKEN ??= 'e2-s1-github-proposal-tests';
process.env.S1_HOST ??= '127.0.0.1';
process.env.S1_KEY_PATH ??= '/tmp/s1-test-key';
process.env.S2_HOST ??= '127.0.0.1';
process.env.S2_KEY_PATH ??= '/tmp/s2-test-key';
const {proposeE2S1GithubReview}=await import('../src/governance/e2S1GithubProposal.js');
const S1='1f6961063d27bc85087aab57a8f700fd7729e03f';
const MAIN='7cbc5496e2a3bd28cf1205d7b659429f61ef6cc6';
const TREE='a'.repeat(40),NEWTREE='c'.repeat(40),PROPOSED='d'.repeat(40);
const raw=Buffer.from('export const feature = true;\n','utf8');
const sha=(x:Buffer)=>createHash('sha1').update('blob '+x.length+'\0').update(x).digest('hex');
const BASE=sha(Buffer.from('export const feature = false;\n','utf8'));
const LOCAL=sha(raw);
const PATH='src/config/feature.ts';
const file:E2LocalFile={
 path:PATH,mode:'100644',baseBlob:BASE,localBlob:LOCAL,
 sizeBytes:raw.length,contentBase64:raw.toString('base64'),secretScan:'CLEAR'
};
const local:E2LocalSnapshot={head:S1,origin:S1,files:[file]};
const snapshot={
 repository:'Patricked-code/MCP',freshness:'CURRENT',
 github:{status:'CURRENT',branch:'main',head:MAIN},
 s1:{status:'CURRENT',branch:'main',head:S1,originMain:S1,
  fetchRemote:'git@github.com-mcp-patricked-ro:Patricked-code/MCP.git',
  pushRemote:'disabled://mcp-s1-read-only',workingTreeClean:false,diffEmpty:false}
} as unknown as LiveStateSnapshot;
type MockOptions={collision?:boolean;stale?:boolean;denied?:boolean;file?:E2LocalFile};
function createMock(options:MockOptions={}){
 const operations:string[]=[];
 let branchSha:string|null=null,createdPr:any=null,readCount=0;
 const f=options.file??file;
 const ports:E2ProposalPorts={
  async readS1(){
   readCount++;
   if(options.stale&&readCount===2)return {
    ...local,files:[{...f,localBlob:BASE}]
   };
   return {...local,files:[f]};
  },
  async github(endpoint,opts){
   const method=opts?.method??'GET';
   operations.push(method+' '+endpoint);
   const data=opts?.jsonBody as any;
   const yes=(json:unknown,status=200)=>({ok:true,status,json});
   const no=(status:number)=>({ok:false,status,json:null});
   const ROOT='/repos/Patricked-code/MCP';
   if(endpoint===ROOT+'/branches/main')return yes({commit:{sha:MAIN}});
   if(endpoint===ROOT+'/compare/'+S1+'...'+MAIN')
    return yes({status:'ahead',behind_by:0});
   if(endpoint===ROOT+'/contents/'+f.path+'?ref='+S1)
    return yes({type:'file',sha:BASE});
   if(endpoint===ROOT+'/contents/'+f.path+'?ref='+MAIN)
    return yes({type:'file',sha:options.collision?'e'.repeat(40):BASE});
   if(endpoint===ROOT+'/contents/'+f.path+'?ref='+PROPOSED)
    return yes({type:'file',sha:f.localBlob});
   if(endpoint.startsWith(ROOT+'/git/ref/heads/')&&method==='GET')
    return branchSha?yes({object:{sha:branchSha}}):no(404);
   if(endpoint===ROOT+'/git/commits/'+MAIN)return yes({tree:{sha:TREE}});
   if(endpoint===ROOT+'/git/refs'&&method==='POST'){
    if(options.denied)return no(403);
    branchSha=MAIN;return yes({object:{sha:MAIN}},201);
   }
   if(endpoint===ROOT+'/git/blobs'&&method==='POST')
    return yes({sha:f.localBlob},201);
   if(endpoint===ROOT+'/git/trees'&&method==='POST')
    return yes({sha:NEWTREE},201);
   if(endpoint===ROOT+'/git/commits'&&method==='POST')
    return yes({sha:PROPOSED},201);
   if(endpoint.startsWith(ROOT+'/git/refs/heads/')&&method==='PATCH'){
    assert.equal(data.force,false);branchSha=PROPOSED;return yes({object:{sha:PROPOSED}});
   }
   if(endpoint===ROOT+'/pulls'&&method==='POST'){
    assert.equal(data.base,'main');assert.equal(data.draft,true);
    createdPr={html_url:'https://github.com/Patricked-code/MCP/pull/499',
      head:{sha:PROPOSED}};
    return yes(createdPr,201);
   }
   if(endpoint.startsWith(ROOT+'/pulls?state=open&head='))
    return yes(createdPr?[createdPr]:[]);
   return no(404);
  }
 };
 return {ports,operations,getReadCount:()=>readCount};
}
test('unpublished S1 change creates a single draft PR, no main push or deployment',async()=>{
 const m=createMock();
 const a=await proposeE2S1GithubReview(snapshot,m.ports);
 assert.equal(a.status,'PROPOSAL_OPENED');
 assert.equal(a.url,'https://github.com/Patricked-code/MCP/pull/499');
 assert.equal(a.sha,PROPOSED);
 assert.equal(m.getReadCount(),2);
 assert.ok(m.operations.some(x=>x.includes('POST /repos/Patricked-code/MCP/pulls')));
 assert.ok(!m.operations.some(x=>/PATCH.*(heads\/main|\/merge)/.test(x)));
 const again=await proposeE2S1GithubReview(snapshot,m.ports);
 assert.equal(again.status,'EXISTING_PROPOSAL');
 assert.equal(again.created,false);
 assert.equal(m.operations.filter(x=>x.includes('POST /repos/Patricked-code/MCP/pulls')).length,1);
});
test('simultaneous main edit rejects proposal before any GitHub mutation',async()=>{
 const m=createMock({collision:true});
 await assert.rejects(()=>proposeE2S1GithubReview(snapshot,m.ports),/E2_S1_MAIN_FILE_COLLISION/);
 assert.ok(!m.operations.some(x=>/^(POST|PATCH)/.test(x)));
});
test('local content drift rejects before branch creation',async()=>{
 const m=createMock({stale:true});
 await assert.rejects(()=>proposeE2S1GithubReview(snapshot,m.ports),/E2_S1_UNSAFE_OR_UNVERIFIED_FILE|E2_LOCAL_SNAPSHOT_MOVED/);
 assert.ok(!m.operations.some(x=>/^(POST|PATCH)/.test(x)));
});
test('unsafe path is never read into GitHub API',async()=>{
 const m=createMock({file:{...file,path:'secrets/github_token.txt'}});
 await assert.rejects(()=>proposeE2S1GithubReview(snapshot,m.ports),/E2_S1_UNSAFE_OR_UNVERIFIED_FILE/);
 assert.equal(m.operations.length,0);
});
test('GitHub write permission denial blocks the proposal without main mutation',async()=>{
 const m=createMock({denied:true});
 await assert.rejects(()=>proposeE2S1GithubReview(snapshot,m.ports),/E2_GITHUB_PROPOSAL_API_NOT_AUTHORIZED/);
 assert.ok(!m.operations.some(x=>/PATCH.*heads\/main/.test(x)));
});
