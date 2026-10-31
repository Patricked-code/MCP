import assert from 'node:assert/strict';
import test from 'node:test';
import {assessMcpS1ToMainReconciliation,type McpReconcileObservation}
 from '../src/governance/mcpS1ToMainPolicy.js';
const old='1f6961063d27bc85087aab57a8f700fd7729e03f';
const main='7cbc5496e2a3bd28cf1205d7b659429f61ef6cc6';
const blob='a'.repeat(40);
const base:McpReconcileObservation={
 s1Head:old,githubMainHead:main,runtimeRevision:old,s1Branch:'main',
 s1OriginFetch:'git@github.com-mcp-patricked-ro:Patricked-code/MCP.git',
 s1OriginPush:'disabled://mcp-s1-read-only',
 githubMainAncestorOfS1:false,s1AncestorOfGithubMain:true,
 s1WorkingTreeClean:false,runtimeHealthy:true,
 allChangesEnumerated:true,collisionFree:true,evidenceCurrent:true,
 files:[{path:'data/github-accounts.json',kind:'MODIFIED',localGitBlob:blob,
 approvedMainGitBlob:blob,sizeBytes:450,secretScan:'CLEAR'}]
};
test('approved S1 local content already integrated on main is a safe convergence candidate',()=>{
 const x=assessMcpS1ToMainReconciliation(base);
 assert.equal(x.status,'APPROVED_LOCAL_CONTENT_CANDIDATE');
 assert.equal(x.canAutomaticallyAdvanceS1Git,true);
 assert.equal(x.canAutomaticallyMergeMain,false);
 assert.equal(x.canAutomaticallyDeploy,false);
});
test('many different MCP files supported, not only github-accounts',()=>{
 const x=assessMcpS1ToMainReconciliation({...base,files:[
 {...base.files[0]!,path:'src/github/accountMap.ts'},
 {...base.files[0]!,path:'docs/operations.md'}]});
 assert.equal(x.status,'APPROVED_LOCAL_CONTENT_CANDIDATE');
 assert.equal(x.paths.length,2);
});
test('unpublished legitimate S1 changes can prepare GitHub review without direct main push',()=>{
 const x=assessMcpS1ToMainReconciliation({...base,s1Head:main,
 files:[{...base.files[0]!,path:'src/config/feature.ts',approvedMainGitBlob:'b'.repeat(40)}]});
 assert.equal(x.status,'S1_TO_GITHUB_REVIEW_REQUIRED');
 assert.equal(x.canAutomaticallyPrepareGitHubPR,true);
 assert.equal(x.canAutomaticallyMergeMain,false);
 assert.equal(x.canAutomaticallyAdvanceS1Git,false);
});
test('clean server at old main may auto fast-forward after normal authority checks',()=>{
 const x=assessMcpS1ToMainReconciliation({...base,s1WorkingTreeClean:true,files:[]});
 assert.equal(x.status,'FAST_FORWARD_CANDIDATE');
});
test('equal code, clean worktree and healthy deployed runtime is aligned',()=>{
 const x=assessMcpS1ToMainReconciliation({...base,
 s1Head:main,runtimeRevision:main,s1WorkingTreeClean:true,files:[]});
 assert.equal(x.status,'FULLY_ALIGNED');
});
test('secrets or unknown secret scan fail closed before GitHub upload',()=>{
 for(const secretScan of ['SENSITIVE','UNKNOWN'] as const){
  const x=assessMcpS1ToMainReconciliation({...base,
   files:[{...base.files[0]!,secretScan}]});
  assert.equal(x.status,'BLOCKED');
  assert.equal(x.canAutomaticallyPrepareGitHubPR,false);
 }
});
test('untracked, symlink-like forbidden names and duplicate paths never silently merge',()=>{
 const suspicious=['secrets/token.json','../outside','.git/HEAD','keys/private.pem'];
 for(const path of suspicious){
  assert.equal(assessMcpS1ToMainReconciliation({...base,
    files:[{...base.files[0]!,path}]}).status,'BLOCKED');
 }
 assert.equal(assessMcpS1ToMainReconciliation({...base,
  files:[base.files[0]!,base.files[0]!]}).status,'BLOCKED');
 assert.equal(assessMcpS1ToMainReconciliation({...base,
  files:[{...base.files[0]!,kind:'UNTRACKED'}]}).status,'BLOCKED');
});
test('missing evidence, branch or remote mismatch, collisions and unhealthy runtime fail closed',()=>{
 const changes:Partial<McpReconcileObservation>[]=[
  {evidenceCurrent:false},{allChangesEnumerated:false},{collisionFree:false},
  {s1Branch:'feature'},{s1OriginPush:'git@github.com:Patricked-code/MCP.git'},
  {runtimeHealthy:false},{s1Head:null},{s1WorkingTreeClean:true}
 ];
 for(const change of changes){
  const x=assessMcpS1ToMainReconciliation({...base,...change});
  assert.equal(x.status,'BLOCKED',JSON.stringify(change));
 }
});
