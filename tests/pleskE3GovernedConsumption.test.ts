import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { consumeGovernedPleskE3ForExistingRoute } from '../src/provisioning/pleskE3GovernedConsumption.js';
import type { PleskGovernedReleaseEvidence } from '../src/provisioning/pleskGovernedReleaseGate.js';

const at='2026-10-28T07:00:00.000Z';
const now=Date.parse(at);
const main='48a529889517aa1c11974802d23acc3f35e0f187';
const prHead='c'.repeat(40);
const owner='oauth:admin';
const session='11111111-1111-4111-8111-111111111111';
const task='TASK-20261028-555';
const scope='resource:plesk:s1:example.com';
const binding=JSON.stringify(['server-web-session','s1','example.com','sandbox','/sandbox']);
const ticket=String(now+600000)+'.'+'A'.repeat(43);
function evidence():PleskGovernedReleaseEvidence{
 return{
  at,mcpRepository:'Patricked-code/MCP',pullRequestNumber:355,proposedHeadSha:prHead,
  scope,principalId:owner,taskId:task,sessionId:session,sha:main,
  signedConsent:{status:'E3_AND_OAUTH_OBSERVED',principalId:owner,targetScope:scope,
    consentPurpose:'plesk-create-subdomain',governedSessionLinked:false,
    independentCiReviewVerified:false,runtimeWriteAuthorized:false,operationExecuted:false},
  ownedCandidate:{status:'UNIQUE_OWNED_CANDIDATE',reason:'CANDIDATE_OBSERVED',
    principalId:owner,taskId:task,sessionId:session,expectedHeadSha:main,
    governedWebTransportLinked:false,independentCiReviewVerified:false,
    runtimeWriteAuthorized:false,operationExecuted:false},
  transportBinding:{status:'TRANSPORT_BINDING_OBSERVED',reason:'BOUND_TO_UNIQUE_OWNED_SESSION',
    sessionId:session,governedWebTransportLinked:true,singleUseE3Consumed:false,
    independentCiReviewVerified:false,runtimeWriteAuthorized:false,operationExecuted:false},
  runtimeAuthority:{source:'EXISTING_GOVERNED_RUNTIME',observedAt:at,taskId:task,
    taskStatus:'IN_PROGRESS',taskOwnerSessionId:session,
    taskResourceScopes:['plesk:s1:example.com'],sessionId:session,
    sessionStatus:'ACTIVE',sessionOwnerPrincipalId:owner,sessionLastHeartbeatAt:at,
    lockOwnerSessionId:session,lockScope:scope,
    lockExpiresAt:'2026-10-28T07:02:00.000Z',consent:null,
    githubMainSha:main,serverCheckoutSha:main,runtimeRevisionSha:main,
    reviewAndCiApproved:false}
 };
}
async function testDirectory(fn:(dir:string)=>Promise<void>){
 const root=await mkdtemp(join(tmpdir(),'gd-e3-governed-'));
 try{await fn(join(root,'receipt'));}finally{await rm(root,{recursive:true,force:true});}
}
function ports(dir:string,approved:boolean){
 return{
  receiptDirectory:dir,
  now:()=>now,
  verifyTicket:(purpose:string,t:string,b:string)=>purpose==='plesk-create-subdomain'&&t===ticket&&b===binding,
  readTrustedReleaseAttestation:async()=>approved?{
    source:'SERVER_VALIDATED_GITHUB_API' as const,at,repository:'Patricked-code/MCP',
    pr:355,headSha:prHead,workflowConcludedSuccess:true,independentReviewApproved:true,
    reviewer:'security-reviewer',prAuthor:'owner',approvalHeadSha:prHead
  }:null
 };
}
test('RED: missing real independent PR review blocks before consuming E3 receipt',async()=>{
 await testDirectory(async dir=>{
  const r=await consumeGovernedPleskE3ForExistingRoute(evidence(),{
    ticket,binding,scope,principalId:owner,governedSessionId:session,taskId:task
  },ports(dir,false));
  assert.equal(r.status,'BLOCKED');
  assert.equal(r.reason,'RELEASE_PRECONDITIONS_NOT_ATTESTED');
  assert.equal(r.runtimeWriteAuthorized,false);
 });
});
test('RED: all independent preconditions permit one durable E3 consumption, not an SSH grant',async()=>{
 await testDirectory(async dir=>{
  const input={ticket,binding,scope,principalId:owner,governedSessionId:session,taskId:task};
  const first=await consumeGovernedPleskE3ForExistingRoute(evidence(),input,ports(dir,true));
  const replay=await consumeGovernedPleskE3ForExistingRoute(evidence(),input,ports(dir,true));
  assert.equal(first.status,'E3_CONSUMED_PENDING_RUNTIME_GATE');
  assert.equal(first.runtimeWriteAuthorized,false);
  assert.equal(first.operationExecuted,false);
  assert.equal(replay.status,'BLOCKED');
  assert.equal(replay.reason,'E3_CONSUMPTION_DENIED');
 });
});
test('RED: cross-task, foreign principal, or scope mismatch never burns ticket',async()=>{
 await testDirectory(async dir=>{
  for(const mismatch of [
    {taskId:'TASK-20261028-556'},
    {governedSessionId:'22222222-2222-4222-8222-222222222222'},
    {principalId:'oauth:other'},
    {scope:'resource:plesk:s2:example.com'}
  ]){
    const r=await consumeGovernedPleskE3ForExistingRoute(evidence(),{
      ticket,binding,scope,principalId:owner,governedSessionId:session,taskId:task,...mismatch
    },ports(dir,true));
    assert.equal(r.status,'BLOCKED',JSON.stringify(mismatch));
    assert.equal(r.reason,'CROSS_PROOF_MISMATCH');
  }
 });
});
