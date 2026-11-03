import assert from 'node:assert/strict';
import test from 'node:test';
// E2 discovery uses the existing credential module; tests must initialize the
// same bounded environment as other MCP governance integration tests.
process.env.MCP_AUTH_TOKEN ??= 'e2-g2-test-token-only-20261103';
process.env.S1_HOST ??= '127.0.0.1';
process.env.S1_KEY_PATH ??= '/tmp/e2-g2-unused-s1';
process.env.S2_HOST ??= '127.0.0.1';
process.env.S2_KEY_PATH ??= '/tmp/e2-g2-unused-s2';
const {discoverE2CanonicalRoots,extractE2CanonicalIssueRoot,
  extractE2CanonicalCommentRoot}=await import('../src/governance/e2CanonicalDiscovery.js');
import type {E2JournalPort} from '../src/governance/e2EntryJournal.js';

const pilot='MCP-PILOT-E2-01-CONT-20261030-ROOT-01';
const gdu='GD-U-CONT-20261030-ROOT-01';
const issue359={
  number:359,title:'PILOT-E2-01',body:
    '**Continuity ID canonique :** `'+pilot+'`\n'
      +'**Entrée explicitement sélectionnée :** EXTERNAL_GOVERNED_RECOVERY'
};
const issue349={
  number:349,title:'Provisionnement S1/S2',body:
    'Objectif — extension additive du MCP, création d’applications, GitHub et Plesk.'
};
const adopted={
  id:6512723639,issue_url:'https://api.github.com/repos/Patricked-code/MCP/issues/349',
  author_association:'OWNER',body:
   '## Décision de continuité documentaire — racine unique adoptée pour le chantier #349\n'
    +'**Identifiant retenu : `'+gdu+'`.**\n'
    +'Continuité fille : GD-U-02D-CONT-20261029-B3I-ROOT-01.'
};
type Fixture={
 issues?:unknown[];comments?:unknown[];errorOn?:'issues'|'comments';
};
function fixture(input:Fixture={}):E2JournalPort{
 const issueRows=input.issues??[issue359,issue349];
 const comments=input.comments??[adopted];
 return {async request(endpoint){
  if(endpoint.startsWith('/repos/Patricked-code/MCP/issues/359/comments?'))
   return {ok:true,status:200,json:[]};
  if(endpoint.startsWith('/repos/Patricked-code/MCP/issues?state=all')){
   if(input.errorOn==='issues')return {ok:false,status:503,json:null};
   const page=Number(new URL('https://api.github.com'+endpoint).searchParams.get('page')??1);
   return {ok:true,status:200,json:page===1?issueRows:[]};
  }
  if(endpoint.startsWith('/repos/Patricked-code/MCP/issues/comments?')){
   if(input.errorOn==='comments')return {ok:false,status:503,json:null};
   const page=Number(new URL('https://api.github.com'+endpoint).searchParams.get('page')??1);
   return {ok:true,status:200,json:page===1?comments:[]};
  }
  return {ok:false,status:404,json:null};
 }};
}
test('G2 discovers GD-U root from adopted issue comment, not just E2-labelled issue bodies',async()=>{
 const result=await discoverE2CanonicalRoots(fixture());
 assert.equal(result.status,'READY');
 assert.equal(result.grantsPermission,false);
 assert.deepEqual(result.continuities.map(x=>[x.continuityId,x.issueNumber]),[
  [gdu,349],[pilot,359]
 ]);
 assert.equal(result.continuities[0]?.source,'HISTORICAL_GITHUB_COMMENT');
});
test('G2 does not invent a new root from child IDs, proposals or incidental links',()=>{
 assert.equal(extractE2CanonicalIssueRoot(issue349.body),null);
 assert.equal(extractE2CanonicalCommentRoot(
  'Index proposé : `'+gdu+'`. Continuité fille GD-U-02D-CONT-20261029-B3I-ROOT-01.'
 ),null);
 assert.equal(extractE2CanonicalCommentRoot(adopted.body),gdu);
 assert.equal(extractE2CanonicalIssueRoot(issue359.body),pilot);
});
test('G2 refuses a canonical root collision between separate GitHub issues',async()=>{
 const changed={...issue359,body:'**Continuity ID canonique :** `'+gdu+'`'};
 const result=await discoverE2CanonicalRoots(fixture({issues:[issue349,changed]}));
 assert.equal(result.status,'CONFLICT');
 assert.equal(result.reason,'E2_CANONICAL_ROOT_CONFLICT');
});
test('G2 returns PARTIAL, never READY, if comment history cannot be fetched',async()=>{
 const result=await discoverE2CanonicalRoots(fixture({errorOn:'comments'}));
 assert.equal(result.status,'PARTIAL');
 assert.equal(result.reason,'E2_COMMENT_SCAN_INCOMPLETE');
 assert.equal(result.grantsPermission,false);
});
test('G2 returns PARTIAL if the issue scan fails',async()=>{
 const result=await discoverE2CanonicalRoots(fixture({errorOn:'issues'}));
 assert.equal(result.status,'PARTIAL');
 assert.equal(result.reason,'E2_ISSUE_SCAN_INCOMPLETE');
});
test('G2 ignores untrusted adoption comments and refuses missing parent evidence',async()=>{
 const untrusted={...adopted,author_association:'NONE'};
 const ignored=await discoverE2CanonicalRoots(fixture({comments:[untrusted]}));
 assert.equal(ignored.status,'READY');
 assert.deepEqual(ignored.continuities.map(x=>x.continuityId),[pilot]);
 const missingParent=await discoverE2CanonicalRoots(fixture({issues:[issue359]}));
 assert.equal(missingParent.status,'PARTIAL');
 assert.equal(missingParent.reason,'E2_COMMENT_PARENT_ISSUE_NOT_VERIFIED');
});
