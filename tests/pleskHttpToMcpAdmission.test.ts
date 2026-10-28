import assert from 'node:assert/strict';
import test from 'node:test';
import { inspectPleskHttpToMcpAdmission } from '../src/provisioning/pleskHttpToMcpAdmission.js';
import type { PleskHttpToMcpAdmissionPorts } from '../src/provisioning/pleskHttpToMcpAdmission.js';
import type { SessionRequest } from '../src/operationalMemory/sessionService.js';
import type { SignedWebOauthConsentObservation } from '../src/provisioning/pleskWebOauthBridge.js';
import type { PleskOwnedWebSessionProjection } from '../src/provisioning/pleskOwnedWebSession.js';

const p='oauth:operator';
const sessionId='11111111-1111-4111-8111-111111111111';
const taskId='TASK-20261028-555';
const sha='48a529889517aa1c11974802d23acc3f35e0f187';
const target={serverId:'s1' as const,parentDomain:'example.com',label:'pilot',documentRoot:'/pilot'};
const input={
  webSessionBinding:'existing-server-validated-web-cookie',
  target,consentTicket:'existing-signed-e3',
  confirmFqdn:'pilot.example.com',explicitConsent:'CREATE_SUBDOMAIN',
  sameOrigin:true,oauthAuthorization:'Bearer server-authenticated-oauth',
  trustedMcpTransport:null as SessionRequest|null
};
const transport:SessionRequest={
  transportSessionId:'mcp-server-owned-transport-id',
  identity:{principalId:p,clientId:'trusted-client',assurance:'oauth_subject'}
};
const consent:SignedWebOauthConsentObservation={
  status:'E3_AND_OAUTH_OBSERVED',principalId:p,
  targetScope:'resource:plesk:s1:example.com',consentPurpose:'plesk-create-subdomain',
  governedSessionLinked:false,independentCiReviewVerified:false,
  runtimeWriteAuthorized:false,operationExecuted:false
};
const candidate:PleskOwnedWebSessionProjection={
  status:'UNIQUE_OWNED_CANDIDATE',reason:'CANDIDATE_OBSERVED',principalId:p,
  taskId,sessionId,expectedHeadSha:sha,
  governedWebTransportLinked:false,independentCiReviewVerified:false,
  runtimeWriteAuthorized:false,operationExecuted:false
};
function ports(){
  const calls:string[]=[];
  const adapter:PleskHttpToMcpAdmissionPorts={
    inspectSignedOauth:async()=>{calls.push('signed');return consent;},
    findUniqueOwnedTask:async()=>{calls.push('task');return candidate;},
    checkBoundTransport:async()=>{calls.push('transport');return {
      status:'TRANSPORT_BINDING_OBSERVED',reason:'BOUND_TO_UNIQUE_OWNED_SESSION',
      sessionId,governedWebTransportLinked:true,singleUseE3Consumed:false,
      independentCiReviewVerified:false,runtimeWriteAuthorized:false,operationExecuted:false
    };},
    checkRuntimeAuthority:async()=>{calls.push('authority');return {
      snapshot:{
        source:'EXISTING_GOVERNED_RUNTIME',observedAt:'2026-10-28T06:40:00Z',
        taskId,taskStatus:'IN_PROGRESS',taskOwnerSessionId:sessionId,
        taskResourceScopes:['plesk:s1:example.com'],sessionId,sessionStatus:'ACTIVE',
        sessionOwnerPrincipalId:p,sessionLastHeartbeatAt:'2026-10-28T06:40:00Z',
        lockOwnerSessionId:sessionId,lockScope:'resource:plesk:s1:example.com',
        lockExpiresAt:'2026-10-28T06:42:00Z',consent:null,githubMainSha:sha,
        serverCheckoutSha:sha,runtimeRevisionSha:sha,reviewAndCiApproved:false
      },blockers:['E3_AND_CI_ATTESTATION_UNAVAILABLE'],operationExecuted:false
    };},
    now:()=>new Date('2026-10-28T06:40:05Z')
  };
  return{adapter,calls};
}
test('RED B3f: validated web cookie plus bearer MUST NOT impersonate an MCP transport',async()=>{
 const x=ports();
 const result=await inspectPleskHttpToMcpAdmission(input,x.adapter);
 assert.equal(result.status,'BLOCKED');
 assert.equal(result.reason,'TRUSTED_MCP_TRANSPORT_REQUIRED');
 assert.equal(result.runtimeWriteAuthorized,false);
 assert.equal(result.operationExecuted,false);
 assert.deepEqual(x.calls,[]);
});
test('RED B3f: authenticated server-supplied transport combines real stages but still never claims write',async()=>{
 const x=ports();
 const result=await inspectPleskHttpToMcpAdmission({...input,trustedMcpTransport:transport},x.adapter);
 assert.equal(result.status,'READ_ONLY_PROOFS_OBSERVED');
 assert.equal(result.reason,'INDEPENDENT_E3_AND_CI_WRITE_GATE_UNAVAILABLE');
 assert.equal(result.runtimeWriteAuthorized,false);
 assert.deepEqual(x.calls,['signed','task','transport','authority']);
});
test('RED B3f: wrong principal, task/session, or foreign transport cannot cross the gate',async()=>{
 const x=ports();
 for(const bad of [
  {...input,trustedMcpTransport:{...transport,identity:{...transport.identity,principalId:'oauth:other'}}},
  {...input,trustedMcpTransport:{...transport,transportSessionId:''}},
  {...input,trustedMcpTransport:{...transport,identity:{...transport.identity,assurance:'shared_credential' as const}}}
 ]){
  const r=await inspectPleskHttpToMcpAdmission(bad,x.adapter);
  assert.equal(r.status,'BLOCKED');
  assert.equal(r.runtimeWriteAuthorized,false);
 }
});
test('RED B3f: false cryptographic proof and thrown provider errors fail closed without leaks',async()=>{
 const x=ports();
 const denied=await inspectPleskHttpToMcpAdmission({...input,trustedMcpTransport:transport},{
   ...x.adapter,inspectSignedOauth:async()=>({...consent,status:'BLOCKED',principalId:null,targetScope:null})
 });
 assert.equal(denied.reason,'SIGNED_WEB_OAUTH_NOT_ATTESTED');
 const failed=await inspectPleskHttpToMcpAdmission({...input,trustedMcpTransport:transport},{
   ...x.adapter,findUniqueOwnedTask:async()=>{throw Error('PRIVATE_API_TOKEN');}
 });
 assert.equal(failed.status,'BLOCKED');
 assert.doesNotMatch(JSON.stringify(failed),/PRIVATE_API_TOKEN/);
});
test('RED B3f: real store returns no bound session or malformed candidate, no write',async()=>{
 const x=ports();
 const denied=await inspectPleskHttpToMcpAdmission({...input,trustedMcpTransport:transport},{
  ...x.adapter,checkBoundTransport:async()=>({
   status:'BLOCKED',reason:'SESSION_BINDING_NOT_ATTESTED',
   sessionId:null,governedWebTransportLinked:false,singleUseE3Consumed:false,
   independentCiReviewVerified:false,runtimeWriteAuthorized:false,operationExecuted:false
  })
 });
 assert.equal(denied.reason,'MCP_SESSION_BINDING_NOT_ATTESTED');
 assert.equal(denied.runtimeWriteAuthorized,false);
});
