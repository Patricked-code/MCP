import assert from 'node:assert/strict';
import test from 'node:test';
import { inspectPleskWebTransportLink } from '../src/provisioning/pleskWebTransportLink.js';
import type { SignedWebOauthConsentObservation } from '../src/provisioning/pleskWebOauthBridge.js';
import type { PleskOwnedWebSessionProjection } from '../src/provisioning/pleskOwnedWebSession.js';
import type { SessionRequest } from '../src/operationalMemory/sessionService.js';

const principal='oauth:wealthtech-mcp-admin';
const session='11111111-1111-4111-8111-111111111111';
const consent:SignedWebOauthConsentObservation={
  status:'E3_AND_OAUTH_OBSERVED',principalId:principal,
  targetScope:'resource:plesk:s1:wealthtechinnovations.com',
  consentPurpose:'plesk-create-subdomain',
  governedSessionLinked:false,independentCiReviewVerified:false,
  runtimeWriteAuthorized:false,operationExecuted:false
};
const candidate:PleskOwnedWebSessionProjection={
  status:'UNIQUE_OWNED_CANDIDATE',reason:'CANDIDATE_OBSERVED',
  principalId:principal,taskId:'TASK-20261028-555',sessionId:session,
  expectedHeadSha:'48a529889517aa1c11974802d23acc3f35e0f187',
  governedWebTransportLinked:false,independentCiReviewVerified:false,
  runtimeWriteAuthorized:false,operationExecuted:false
};
const transport:SessionRequest={
  transportSessionId:'server-authenticated-transport',
  identity:{principalId:principal,clientId:null,assurance:'oauth_subject'}
};

test('RED B3a: existing server transport binding may be observed but never authorizes Plesk',()=>{
  const r=inspectPleskWebTransportLink(consent,candidate,transport,{
    lookupBoundSessionId:()=>session
  });
  assert.equal(r.status,'TRANSPORT_BINDING_OBSERVED');
  assert.equal(r.sessionId,session);
  assert.equal(r.runtimeWriteAuthorized,false);
  assert.equal(r.singleUseE3Consumed,false);
  assert.equal(r.independentCiReviewVerified,false);
  assert.equal(r.operationExecuted,false);
});

test('RED B3a: foreign or missing bound transport blocks even with valid E3 and candidate',()=>{
  for(const bound of [null,'other-session']){
    const r=inspectPleskWebTransportLink(consent,candidate,transport,{
      lookupBoundSessionId:()=>bound
    });
    assert.equal(r.status,'BLOCKED');
    assert.equal(r.sessionId,null);
  }
});

test('RED B3a: caller principal, assurance and missing authenticated transport fail closed',()=>{
  for(const bad of [
    {...transport,identity:{...transport.identity,principalId:'oauth:other'}},
    {...transport,identity:{...transport.identity,assurance:'shared_credential' as const}},
    {...transport,transportSessionId:''}
  ]){
    assert.equal(inspectPleskWebTransportLink(consent,candidate,bad,{
      lookupBoundSessionId:()=>session
    }).status,'BLOCKED');
  }
});

test('RED B3a: candidate/consent not attested or lookup failure never grants',()=>{
  const blockedCandidate={...candidate,status:'BLOCKED' as const,sessionId:null};
  assert.equal(inspectPleskWebTransportLink(consent,blockedCandidate,transport,{
    lookupBoundSessionId:()=>session
  }).status,'BLOCKED');
  assert.equal(inspectPleskWebTransportLink({...consent,status:'BLOCKED'},candidate,transport,{
    lookupBoundSessionId:()=>session
  }).status,'BLOCKED');
  const failed=inspectPleskWebTransportLink(consent,candidate,transport,{
    lookupBoundSessionId:()=>{throw Error('SECRET_MUST_NOT_LEAK');}
  });
  assert.equal(failed.status,'BLOCKED');
  assert.doesNotMatch(JSON.stringify(failed),/SECRET_MUST_NOT_LEAK/);
});
