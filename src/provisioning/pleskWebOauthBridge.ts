/**
 * GD-U-02D-B: server-side verification of the EXISTING Plesk web E3 ticket
 * joined to an independently verified OAuth mcp:write principal.
 *
 * This is a READ-ONLY precondition. It does not grant Task, Session, Lock,
 * review/CI or SSH authority, and is intentionally not a new consent issuer.
 * The web operator cookie and OAuth transport identity are distinct. Until
 * an authenticated server-side binding exists, no executable Plesk MCP tool
 * may treat this observation as a runtime grant.
 */
import { normalizeLockScope } from '../operationalMemory/lockService.js';
import type { PleskSubdomainInput } from './pleskSite.js';
import type { VerifiedOauthIdentity } from '../oauth.js';

type Target = Pick<PleskSubdomainInput,'serverId'|'parentDomain'|'label'|'documentRoot'>;
export type SignedWebOauthConsentRequest=Readonly<{
  target:Target;
  webSessionBinding:string;
  consentTicket:unknown;
  confirmFqdn:string;
  explicitConsent:unknown;
  sameOrigin:boolean;
  oauthAuthorization:string;
}>;
export type SignedWebOauthConsentPorts=Readonly<{
  /** Existing verifyWebConsentTicket, not a secondary signature secret. */
  verifyTicket:(purpose:string,ticket:unknown,binding:string)=>boolean;
  /** Existing inspectOauthAccessToken(token,'mcp:write'), never a scope hint. */
  inspectToken:(token:string,requiredScope:string)=>VerifiedOauthIdentity|null;
  now:()=>Date;
}>;
export type SignedWebOauthConsentObservation=Readonly<{
  status:'E3_AND_OAUTH_OBSERVED'|'BLOCKED';
  principalId:string|null;
  targetScope:string|null;
  consentPurpose:'plesk-create-subdomain';
  governedSessionLinked:false;
  independentCiReviewVerified:false;
  runtimeWriteAuthorized:false;
  operationExecuted:false;
}>;
const SUBDOMAIN=/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
const DOMAIN=/^(?=.{4,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;
const ROOT=/^\/[a-z0-9][a-z0-9_-]{0,62}$/;
const PRINCIPAL=/^[a-z0-9._:@-]{1,200}$/i;
const PURPOSE='plesk-create-subdomain';
const refused=():SignedWebOauthConsentObservation=>({
  status:'BLOCKED',principalId:null,targetScope:null,
  consentPurpose:PURPOSE,governedSessionLinked:false,
  independentCiReviewVerified:false,runtimeWriteAuthorized:false,
  operationExecuted:false
});

/**
 * The server must supply a validated web session binding. The caller's
 * request body must never choose it; the existing Plesk router derives it
 * from the HTTP-only web cookie after requireLogin.
 */
export function inspectPleskSignedWebOauthConsent(
  input:SignedWebOauthConsentRequest,
  ports:SignedWebOauthConsentPorts
):SignedWebOauthConsentObservation{
  if(!input||!ports||!input.sameOrigin
    ||input.explicitConsent!=='CREATE_SUBDOMAIN'
    ||!input.webSessionBinding||input.webSessionBinding.length>2048
    ||!input.target||!['s1','s2'].includes(input.target.serverId)
    ||!DOMAIN.test(input.target.parentDomain)
    ||!SUBDOMAIN.test(input.target.label)
    ||!ROOT.test(input.target.documentRoot)
    ||input.confirmFqdn!==input.target.label+'.'+input.target.parentDomain){
    return refused();
  }
  const raw=input.oauthAuthorization;
  if(typeof raw!=='string'||raw.length>8192
    ||!/^Bearer [A-Za-z0-9._~+\/-]+={0,2}$/.test(raw)){
    return refused();
  }
  const binding=JSON.stringify([
    input.webSessionBinding,input.target.serverId,input.target.parentDomain,
    input.target.label,input.target.documentRoot
  ]);
  try{
    if(!ports.verifyTicket(PURPOSE,input.consentTicket,binding))return refused();
    const token=raw.slice(7);
    const identity=ports.inspectToken(token,'mcp:write');
    const nowSeconds=Math.floor(ports.now().getTime()/1000);
    if(!identity||!identity.scopes.includes('mcp:write')
      ||!PRINCIPAL.test(identity.subject)
      ||!Number.isFinite(identity.expiresAt)||identity.expiresAt<=nowSeconds){
      return refused();
    }
    return {
      status:'E3_AND_OAUTH_OBSERVED',
      principalId:'oauth:'+identity.subject,
      targetScope:normalizeLockScope({
        type:'resource',
        key:'plesk:'+input.target.serverId+':'+input.target.parentDomain
      }),
      consentPurpose:PURPOSE,
      governedSessionLinked:false,
      independentCiReviewVerified:false,
      runtimeWriteAuthorized:false,
      operationExecuted:false
    };
  }catch{return refused();}
}

/** Wire only to actual existing E3/OAuth cryptographic verifiers. */
export async function inspectPleskConsentUsingExistingServerVerifiers(
  input:SignedWebOauthConsentRequest
):Promise<SignedWebOauthConsentObservation>{
  const {verifyWebConsentTicket,inspectOauthAccessToken}=await import('../oauth.js');
  return inspectPleskSignedWebOauthConsent(input,{
    verifyTicket:verifyWebConsentTicket,
    inspectToken:inspectOauthAccessToken,
    now:()=>new Date()
  });
}
