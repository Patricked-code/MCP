import assert from 'node:assert/strict';
import test from 'node:test';
import {
  inspectPleskSignedWebOauthConsent
} from '../src/provisioning/pleskWebOauthBridge.js';

const at='2026-10-28T05:45:00.000Z';
const target={serverId:'s1' as const,parentDomain:'wealthtechinnovations.com',
  label:'gd-pilot',documentRoot:'/gd-pilot'};
const cookie='SERVER_SIDE_VALIDATED_WEB_SESSION';
const ticket='signed.ticket';
const bind=JSON.stringify([cookie,target.serverId,target.parentDomain,target.label,target.documentRoot]);

function deps(){
  const calls:string[]=[];
  return{
    calls,
    verifyTicket:(purpose:string,value:unknown,binding:string)=>{
      calls.push('T:'+purpose);
      return purpose==='plesk-create-subdomain'&&value===ticket&&binding===bind;
    },
    inspectToken:(value:string,scope:string)=>{
      calls.push('O:'+scope);
      return value==='VALID_OAUTH_TOKEN'&&scope==='mcp:write'
        ?{subject:'wealthtech-mcp-admin',clientId:'chatgpt-client',scopes:['mcp:read','mcp:write'],expiresAt:Date.parse(at)/1000+300}
        :null;
    },
    now:()=>new Date(at)
  };
}

test('RED: signed existing web E3 + real mcp:write OAuth observation is a precondition, NOT Plesk write admission',()=>{
  const d=deps();
  const r=inspectPleskSignedWebOauthConsent({
    target,webSessionBinding:cookie,consentTicket:ticket,
    confirmFqdn:'gd-pilot.wealthtechinnovations.com',explicitConsent:'CREATE_SUBDOMAIN',
    sameOrigin:true,oauthAuthorization:'Bearer VALID_OAUTH_TOKEN'
  },d);
  assert.equal(r.status,'E3_AND_OAUTH_OBSERVED');
  assert.equal(r.principalId,'oauth:wealthtech-mcp-admin');
  assert.equal(r.targetScope,'resource:plesk:s1:wealthtechinnovations.com');
  assert.equal(r.runtimeWriteAuthorized,false);
  assert.equal(r.governedSessionLinked,false);
  assert.equal(r.operationExecuted,false);
  assert.deepEqual(d.calls,['T:plesk-create-subdomain','O:mcp:write']);
});

test('RED: malicious, expired or absent OAuth token never attests ownership',()=>{
  for(const header of ['', 'Basic VALID_OAUTH_TOKEN', 'Bearer BAD', 'Bearer VALID_OAUTH_TOKEN extra']){
    const d=deps();
    const r=inspectPleskSignedWebOauthConsent({
      target,webSessionBinding:cookie,consentTicket:ticket,
      confirmFqdn:'gd-pilot.wealthtechinnovations.com',explicitConsent:'CREATE_SUBDOMAIN',
      sameOrigin:true,oauthAuthorization:header
    },d);
    assert.equal(r.status,'BLOCKED');
    assert.equal(r.principalId,null);
    assert.equal(r.runtimeWriteAuthorized,false);
  }
});

test('RED: cross-origin, unconfirmed, missing consent or mismatched web ticket always block',()=>{
  const good={
    target,webSessionBinding:cookie,consentTicket:ticket,
    confirmFqdn:'gd-pilot.wealthtechinnovations.com',explicitConsent:'CREATE_SUBDOMAIN',
    sameOrigin:true,oauthAuthorization:'Bearer VALID_OAUTH_TOKEN'
  } as const;
  for(const patch of [
    {sameOrigin:false},
    {confirmFqdn:'different.wealthtechinnovations.com'},
    {explicitConsent:null},
    {consentTicket:'forged'},
    {webSessionBinding:'other-session'}
  ]){
    const r=inspectPleskSignedWebOauthConsent({...good,...patch},deps());
    assert.equal(r.status,'BLOCKED',JSON.stringify(patch));
  }
});

test('RED: E3+OAuth metadata never returns token, ticket or web cookie even on errors',()=>{
  const result=inspectPleskSignedWebOauthConsent({
    target,webSessionBinding:cookie,consentTicket:ticket,
    confirmFqdn:'gd-pilot.wealthtechinnovations.com',explicitConsent:'CREATE_SUBDOMAIN',
    sameOrigin:true,oauthAuthorization:'Bearer VALID_OAUTH_TOKEN'
  },{
    ...deps(),
    verifyTicket:()=>{throw Error('LEAK_PRIVATE_TICKET')}
  });
  assert.equal(result.status,'BLOCKED');
  assert.doesNotMatch(JSON.stringify(result),/VALID_OAUTH_TOKEN|SERVER_SIDE_VALIDATED|signed\.ticket|LEAK_PRIVATE_TICKET/);
});

test('RED: authorized identity must have write scope, not read-only token',()=>{
  const d=deps();
  const result=inspectPleskSignedWebOauthConsent({
    target,webSessionBinding:cookie,consentTicket:ticket,
    confirmFqdn:'gd-pilot.wealthtechinnovations.com',explicitConsent:'CREATE_SUBDOMAIN',
    sameOrigin:true,oauthAuthorization:'Bearer VALID_OAUTH_TOKEN'
  },{...d,inspectToken:()=>({subject:'wealthtech-mcp-admin',clientId:'client',
    scopes:['mcp:read'],expiresAt:Date.parse(at)/1000+1000})});
  assert.equal(result.status,'BLOCKED');
  assert.equal(result.runtimeWriteAuthorized,false);
});
