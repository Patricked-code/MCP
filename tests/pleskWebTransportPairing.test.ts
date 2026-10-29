import assert from 'node:assert/strict';
import test from 'node:test';
import {createPleskWebTransportPairing} from '../src/provisioning/pleskWebTransportPairing.js';
import type {SessionRequest} from '../src/operationalMemory/sessionService.js';

const at=Date.parse('2026-10-29T19:40:00.000Z');
const target={serverId:'s1' as const,parentDomain:'wealthtechinnovations.com',label:'gd-test',documentRoot:'/gd-test'};
const transport:SessionRequest={transportSessionId:'mcp-verified-session-37',identity:{
  principalId:'oauth:admin',clientId:'trusted-mcp-client',assurance:'oauth_subject'
}};
const session='11111111-1111-4111-8111-111111111111';
function fixture(){
  let time=at;
  let sessionId:string|null=session;
  const pairing=createPleskWebTransportPairing({
    now:()=>time,
    lookupSessionId:()=>sessionId,
    inspectOauth:token=>token==='VALID_SCOPED_MCP_JWT'?{
      subject:'admin',clientId:'trusted-mcp-client',
      scopes:['mcp:read','mcp:write'],expiresAt:Math.floor((at+600_000)/1000)
    }:null
  });
  return{pairing,advance:(ms:number)=>time+=ms,unbind:()=>{sessionId=null}};
}
test('B3i RED: a genuine OAuth MCP transport can prove exact ownership to the web route once',()=>{
  const {pairing}=fixture();
  const issued=pairing.issue({transport,oauthToken:'VALID_SCOPED_MCP_JWT',target});
  assert.equal(issued.status,'ISSUED');
  assert.match(issued.proof??'',/^[A-Za-z0-9_-]{43}$/);
  const linked=pairing.redeem({proof:issued.proof??'',target,webSessionBinding:'signed-server-web-session'});
  assert.equal(linked?.governedSessionId,session);
  assert.deepEqual(linked?.transport,transport);
  assert.equal(linked?.oauthAuthorization,'Bearer VALID_SCOPED_MCP_JWT');
  assert.equal(pairing.redeem({proof:issued.proof??'',target,webSessionBinding:'signed-server-web-session'}),null);
});
test('B3i RED: no web cookie, foreign server/domain/label/root or forged token is admitted',()=>{
  const {pairing}=fixture();
  for(const changed of [
    {serverId:'s2' as const}, {parentDomain:'other.example'},
    {label:'other'}, {documentRoot:'/other'}
  ]){
    const attempt=pairing.issue({transport,oauthToken:'VALID_SCOPED_MCP_JWT',target});
    assert.equal(pairing.redeem({proof:attempt.proof??'',target:{...target,...changed},
      webSessionBinding:'valid-web-cookie'}),null);
  }
  const valid=pairing.issue({transport,oauthToken:'VALID_SCOPED_MCP_JWT',target});
  assert.equal(pairing.redeem({proof:valid.proof??'',target,webSessionBinding:''}),null);
  assert.equal(pairing.redeem({proof:'A'.repeat(43),target,webSessionBinding:'valid-web-cookie'}),null);
  assert.ok(pairing.redeem({proof:valid.proof??'',target,webSessionBinding:'valid-web-cookie'}));
});
test('B3i RED: no MCP OAuth identity, no bound governed session, no write scope cannot issue',()=>{
  const {pairing,unbind}=fixture();
  for(const item of [
    {transport:{...transport,identity:{...transport.identity,assurance:'shared_credential' as const}}},
    {transport:{...transport,identity:{...transport.identity,principalId:'oauth:other'}}},
    {oauthToken:'FORGED'}
  ]){
    const result=pairing.issue({transport,oauthToken:'VALID_SCOPED_MCP_JWT',target,...item});
    assert.equal(result.status,'BLOCKED');
  }
  unbind();
  assert.equal(pairing.issue({transport,oauthToken:'VALID_SCOPED_MCP_JWT',target}).status,'BLOCKED');
});
test('B3i RED: expiry and transport unbinding reject a previously issued pairing',()=>{
  const a=fixture();
  const token=a.pairing.issue({transport,oauthToken:'VALID_SCOPED_MCP_JWT',target}).proof??'';
  a.advance(180_001);
  assert.equal(a.pairing.redeem({proof:token,target,webSessionBinding:'valid-cookie'}),null);
  const b=fixture();
  const second=b.pairing.issue({transport,oauthToken:'VALID_SCOPED_MCP_JWT',target}).proof??'';
  b.unbind();
  assert.equal(b.pairing.redeem({proof:second,target,webSessionBinding:'valid-cookie'}),null);
});
test('B3i RED: issuer and verifier never reflect secrets into public blocked results',()=>{
  const {pairing}=fixture();
  const response=pairing.issue({transport,oauthToken:'FORGED_SECRET_KEY',target});
  assert.equal(response.status,'BLOCKED');
  assert.doesNotMatch(JSON.stringify(response),/FORGED_SECRET_KEY/);
});
