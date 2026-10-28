import assert from 'node:assert/strict';
import test from 'node:test';
import { assessPleskGovernedRelease } from '../src/provisioning/pleskGovernedReleaseGate.js';
import type { PleskGovernedReleaseEvidence } from '../src/provisioning/pleskGovernedReleaseGate.js';

const sha='48a529889517aa1c11974802d23acc3f35e0f187';
const now='2026-10-28T06:15:00.000Z';
const scope='resource:plesk:s1:wealthtechinnovations.com';
const principal='oauth:wealthtech-mcp-admin';
const session='11111111-1111-4111-8111-111111111111';
const task='TASK-20261028-555';
function evidence():PleskGovernedReleaseEvidence {
  return {
    at:now,mcpRepository:'Patricked-code/MCP',pullRequestNumber:355,
    proposedHeadSha:'c'.repeat(40),
    scope,principalId:principal,sessionId:session,taskId:task,
    sha,
    signedConsent:{status:'E3_AND_OAUTH_OBSERVED',principalId:principal,
      targetScope:scope,consentPurpose:'plesk-create-subdomain',
      governedSessionLinked:false,independentCiReviewVerified:false,
      runtimeWriteAuthorized:false,operationExecuted:false},
    ownedCandidate:{status:'UNIQUE_OWNED_CANDIDATE',reason:'CANDIDATE_OBSERVED',
      principalId:principal,taskId:task,sessionId:session,expectedHeadSha:sha,
      governedWebTransportLinked:false,independentCiReviewVerified:false,
      runtimeWriteAuthorized:false,operationExecuted:false},
    transportBinding:{status:'TRANSPORT_BINDING_OBSERVED',reason:'BOUND_TO_UNIQUE_OWNED_SESSION',
      sessionId:session,governedWebTransportLinked:true,singleUseE3Consumed:false,
      independentCiReviewVerified:false,runtimeWriteAuthorized:false,operationExecuted:false},
    runtimeAuthority:{source:'EXISTING_GOVERNED_RUNTIME',observedAt:now,
      taskId:task,taskStatus:'IN_PROGRESS',taskOwnerSessionId:session,
      taskResourceScopes:['plesk:s1:wealthtechinnovations.com'],
      sessionId:session,sessionStatus:'ACTIVE',sessionOwnerPrincipalId:principal,
      sessionLastHeartbeatAt:now,lockOwnerSessionId:session,lockScope:scope,
      lockExpiresAt:'2026-10-28T06:17:00.000Z',consent:null,
      githubMainSha:sha,serverCheckoutSha:sha,runtimeRevisionSha:sha,
      reviewAndCiApproved:false}
  };
}
test('RED B3b: all existing E3/OAuth/Task/Lock/transport proofs still BLOCK until independent attestation', async()=>{
  const r=await assessPleskGovernedRelease(evidence(),{
    readTrustedReleaseAttestation:async()=>null
  });
  assert.equal(r.disposition,'HOLD');
  assert.ok(r.blockers.includes('INDEPENDENT_RELEASE_ATTESTATION_MISSING'));
  assert.ok(r.blockers.includes('SINGLE_USE_E3_CONSUMPTION_MISSING'));
  assert.equal(r.runtimeWriteAuthorized,false);
  assert.equal(r.operationExecuted,false);
});

test('RED B3b: even plausible trusted CI/review evidence cannot claim E3 consumed', async()=>{
  const x=evidence();
  const r=await assessPleskGovernedRelease(x,{
    readTrustedReleaseAttestation:async()=>({
      source:'SERVER_VALIDATED_GITHUB_API',
      at:now,repository:'Patricked-code/MCP',pr:355,headSha:'c'.repeat(40),
      workflowConcludedSuccess:true,independentReviewApproved:true,
      reviewer:'security-reviewer',prAuthor:'maintainer',
      approvalHeadSha:'c'.repeat(40)
    })
  });
  assert.equal(r.disposition,'HOLD');
  assert.ok(r.blockers.includes('SINGLE_USE_E3_CONSUMPTION_MISSING'));
  assert.equal(r.runtimeWriteAuthorized,false);
});

test('RED B3b: stale, foreign or failed approval evidence must never be treated as approval',async()=>{
  for(const invalid of [
    {headSha:'f'.repeat(40)},
    {workflowConcludedSuccess:false},
    {independentReviewApproved:false},
    {reviewer:'maintainer',prAuthor:'maintainer'},
    {at:'2026-10-28T05:30:00.000Z'},
    {repository:'someone/else'}
  ]){
    const r=await assessPleskGovernedRelease(evidence(),{
      readTrustedReleaseAttestation:async()=>({
        source:'SERVER_VALIDATED_GITHUB_API' as const,at:now,
        repository:'Patricked-code/MCP',pr:355,headSha:sha,
        workflowConcludedSuccess:true,independentReviewApproved:true,
        reviewer:'security-reviewer',prAuthor:'maintainer',
        approvalHeadSha:sha,...invalid
      })
    });
    assert.equal(r.disposition,'HOLD');
    assert.ok(r.blockers.includes('INDEPENDENT_RELEASE_ATTESTATION_INVALID'));
  }
});

test('RED B3b: different task, principal, scope, transport or SHA cannot cross-authorize',async()=>{
  for(const x of [
    {...evidence(),taskId:'TASK-OTHER'},
    {...evidence(),scope:'resource:plesk:s2:wealthtechinnovations.com'},
    {...evidence(),transportBinding:{...evidence().transportBinding,status:'BLOCKED' as const}},
    {...evidence(),ownedCandidate:{...evidence().ownedCandidate,sessionId:'different'}},
    {...evidence(),runtimeAuthority:{...evidence().runtimeAuthority,runtimeRevisionSha:'f'.repeat(40)}}
  ]){
    const r=await assessPleskGovernedRelease(x,{readTrustedReleaseAttestation:async()=>null});
    assert.equal(r.disposition,'HOLD');
    assert.ok(r.blockers.includes('CROSS_PROOF_MISMATCH'));
  }
});

test('RED B3b: provider failure never leaks exceptions or returns executable authority',async()=>{
  const r=await assessPleskGovernedRelease(evidence(),{
    readTrustedReleaseAttestation:async()=>{throw Error('SECRET_API_KEY')}
  });
  assert.equal(r.disposition,'HOLD');
  assert.equal(r.runtimeWriteAuthorized,false);
  assert.doesNotMatch(JSON.stringify(r),/SECRET_API_KEY/);
});
