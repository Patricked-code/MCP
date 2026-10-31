import assert from 'node:assert/strict';
import test from 'node:test';
import {executeMcpS1ReconciliationCycle,type E2AutoReconcilePorts}
 from '../src/governance/mcpS1ReconciliationCycle.js';
import type {McpReconcileObservation} from '../src/governance/mcpS1ToMainPolicy.js';
const old='1f6961063d27bc85087aab57a8f700fd7729e03f';
const main='7cbc5496e2a3bd28cf1205d7b659429f61ef6cc6';
const blob='a'.repeat(40);
const obs:McpReconcileObservation={
 s1Head:old,githubMainHead:main,runtimeRevision:old,s1Branch:'main',
 s1OriginFetch:'git@github.com-mcp-patricked-ro:Patricked-code/MCP.git',
 s1OriginPush:'disabled://mcp-s1-read-only',
 githubMainAncestorOfS1:false,s1AncestorOfGithubMain:true,
 s1WorkingTreeClean:false,runtimeHealthy:true,
 files:[{path:'data/github-accounts.json',kind:'MODIFIED',
  localGitBlob:blob,approvedMainGitBlob:blob,sizeBytes:1000,secretScan:'CLEAR'}],
 allChangesEnumerated:true,collisionFree:true,evidenceCurrent:true
};
function ports(counter:{proposal:number;s1:number;deploy:number}):E2AutoReconcilePorts{
 return {
  async proposeGitHubReview(){counter.proposal++;return {
   issueOrPrUrl:'https://github.com/Patricked-code/MCP/pull/365',
   proposalSha:main,created:false
  };},
  async convergeApprovedS1Files(){counter.s1++;return {
   observedGitHead:main,backupEvidence:'backup-sha-verified'
  };},
  async requestGovernedDeploy(){counter.deploy++;return {
   jobUrl:'https://github.com/Patricked-code/MCP/actions/runs/123',
   accepted:true
  };}
 };
}
const selected={entryProfile:'EXTERNAL_GOVERNED_RECOVERY' as const,explicitlySelected:true};
const no={scopedS1WriteApproved:false,githubProposalApproved:false,
 governedDeployApproved:false};
test('automatic reconciliation requires existing scoped S1 authority',async()=>{
 const c={proposal:0,s1:0,deploy:0};
 const result=await executeMcpS1ReconciliationCycle(selected,obs,no,ports(c));
 assert.equal(result.disposition,'AWAITING_AUTHORITY');
 assert.deepEqual(c,{proposal:0,s1:0,deploy:0});
});
test('with pre-approved scope, exact already-approved S1 content converges without deployment',async()=>{
 const c={proposal:0,s1:0,deploy:0};
 const result=await executeMcpS1ReconciliationCycle(selected,obs,
  {...no,scopedS1WriteApproved:true},ports(c));
 assert.equal(result.disposition,'S1_GIT_CONVERGED');
 assert.equal(result.mayEnterNormalE2,false);
 assert.deepEqual(c,{proposal:0,s1:1,deploy:0});
});
test('unpublished S1 changes propose GitHub PR without ever merging main',async()=>{
 const c={proposal:0,s1:0,deploy:0};
 const modified={...obs,files:[{...obs.files[0]!,approvedMainGitBlob:'b'.repeat(40)}]};
 const result=await executeMcpS1ReconciliationCycle(selected,modified,
  {...no,githubProposalApproved:true},ports(c));
 assert.equal(result.disposition,'PROPOSAL_OPENED');
 assert.equal(result.mayEnterNormalE2,false);
 assert.deepEqual(c,{proposal:1,s1:0,deploy:0});
});
test('untrusted or sensitive S1 content prevents all operations',async()=>{
 const c={proposal:0,s1:0,deploy:0};
 const modified={...obs,files:[{...obs.files[0]!,secretScan:'UNKNOWN' as const}]};
 const result=await executeMcpS1ReconciliationCycle(selected,modified,
  {scopedS1WriteApproved:true,githubProposalApproved:true,governedDeployApproved:true},ports(c));
 assert.equal(result.disposition,'BLOCKED');
 assert.deepEqual(c,{proposal:0,s1:0,deploy:0});
});
test('successful clean GitHub->S1 preflight requests existing Governed Deploy only',async()=>{
 const c={proposal:0,s1:0,deploy:0};
 const clean={...obs,s1WorkingTreeClean:true,files:[]};
 const result=await executeMcpS1ReconciliationCycle(selected,clean,
  {...no,governedDeployApproved:true},ports(c));
 assert.equal(result.disposition,'DEPLOY_REQUESTED');
 assert.deepEqual(c,{proposal:0,s1:0,deploy:1});
});
test('only a newly verified aligned observation unlocks normal E2',async()=>{
 const c={proposal:0,s1:0,deploy:0};
 const aligned={...obs,s1Head:main,runtimeRevision:main,
  s1WorkingTreeClean:true,files:[]};
 const result=await executeMcpS1ReconciliationCycle(selected,aligned,no,ports(c));
 assert.equal(result.disposition,'READY_FOR_OWNER');
 assert.equal(result.mayEnterNormalE2,true);
 assert.deepEqual(c,{proposal:0,s1:0,deploy:0});
});

test('same main Git but stale S1 runtime requires governed redeploy, not a fake alignment',async()=>{
 const c={proposal:0,s1:0,deploy:0};
 const stale={...obs,s1Head:main,s1WorkingTreeClean:true,files:[]};
 const result=await executeMcpS1ReconciliationCycle(selected,stale,
  {...no,governedDeployApproved:true},ports(c));
 assert.equal(result.disposition,'DEPLOY_REQUESTED');
 assert.equal(result.mayEnterNormalE2,false);
 assert.deepEqual(c,{proposal:0,s1:0,deploy:1});
});

test('E1, missing explicit selection, or no profile can NEVER invoke the E2 cycle',async()=>{
 for(const selection of [
  {entryProfile:'E1' as const,explicitlySelected:true},
  {entryProfile:'EXTERNAL_GOVERNED_RECOVERY' as const,explicitlySelected:false},
  {entryProfile:null,explicitlySelected:true}
 ]){
  const c={proposal:0,s1:0,deploy:0};
  const out=await executeMcpS1ReconciliationCycle(selection,obs,{
   scopedS1WriteApproved:true,githubProposalApproved:true,governedDeployApproved:true
  },ports(c));
  assert.equal(out.disposition,'BLOCKED');
  assert.deepEqual(out.decision.blockers,['E2_EXPLICIT_SELECTION_REQUIRED']);
  assert.equal(out.mayEnterNormalE2,false);
  assert.deepEqual(c,{proposal:0,s1:0,deploy:0});
 }
});
