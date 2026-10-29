/**
 * GD-U-02D-B3i: short-lived, one-use proof of possession of an ACTUAL
 * authenticated OAuth MCP transport for the existing Plesk E3 web form.
 *
 * NOT a session registry, Task Queue, lock service, OAuth issuer, Plesk
 * admission or a privileged grant. Existing GovernedSessionService is the
 * only binding authority. A browser supplies an unpredictable pairing proof,
 * never a trusted transport ID, session ID, principal or lock snapshot.
 *
 * Process-local only: restart / alternate host means DENY, never fallback.
 */
import {createHash,randomBytes} from 'node:crypto';
import type {SessionRequest} from '../operationalMemory/sessionService.js';
import type {VerifiedOauthIdentity} from '../oauth.js';

export type PleskPairingTarget=Readonly<{
  serverId:'s1'|'s2';parentDomain:string;label:string;documentRoot:string;
}>;
export type PleskPairingPorts=Readonly<{
  now:()=>number;
  lookupSessionId:(authenticatedTransportSessionId:string)=>string|null;
  inspectOauth:(token:string,requiredScope:'mcp:write')=>VerifiedOauthIdentity|null;
}>;
type RecordEntry=Readonly<{
  targetKey:string;expiresAt:number;governedSessionId:string;
  transport:SessionRequest;oauthToken:string;
}>;
export type PleskPairingIssue=Readonly<{
  status:'ISSUED'|'BLOCKED';
  proof?:string;expiresAt?:number;
  runtimeWriteAuthorized:false;
}>;
export type PleskPairingLink=Readonly<{
  governedSessionId:string;
  /** This value originated from the authenticated MCP ToolExtra, NEVER HTTP. */
  transport:SessionRequest;
  /** Server-private, read by the existing OAuth signature verifier only. */
  oauthAuthorization:string;
}>;
const DOMAIN=/^(?=.{4,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;
const LABEL=/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PROOF=/^[A-Za-z0-9_-]{43}$/;
const TTL=180_000;
const LIMIT=64;
const hash=(x:string)=>createHash('sha256').update('gd-u-b3i-mcp-transport-pair:v1\n'+x).digest('hex');
const targetKey=(t:PleskPairingTarget)=>JSON.stringify([
  t.serverId,t.parentDomain,t.label,t.documentRoot
]);
function valid(t:PleskPairingTarget):boolean{
 return !!t&&(t.serverId==='s1'||t.serverId==='s2')
  &&typeof t.parentDomain==='string'&&DOMAIN.test(t.parentDomain)
  &&typeof t.label==='string'&&LABEL.test(t.label)
  &&typeof t.documentRoot==='string'&&t.documentRoot==='/'+t.label;
}
const blocked=():PleskPairingIssue=>({status:'BLOCKED',runtimeWriteAuthorized:false});

export function createPleskWebTransportPairing(ports:PleskPairingPorts){
  const entries=new Map<string,RecordEntry>();
  function prune(now:number):void{
    for(const [key,value] of entries){
      if(value.expiresAt<=now)entries.delete(key);
    }
  }
  return {
    /**
     * Call ONLY from an authenticated /mcp tool callback using
     * sessionRequestFromToolExtra(extra), and extra.authInfo.token, not any
     * identifier or bearer value supplied by the browser.
     */
    issue(input:Readonly<{
      transport:SessionRequest;oauthToken:string;target:PleskPairingTarget;
    }>):PleskPairingIssue{
      try{
        const now=ports.now();
        const t=input.transport;
        if(!Number.isSafeInteger(now)||!valid(input.target)
          ||t?.identity?.assurance!=='oauth_subject'
          ||!t.identity.principalId?.startsWith('oauth:')
          ||!t.identity.clientId
          ||typeof t.transportSessionId!=='string'||t.transportSessionId.length<1
          ||typeof input.oauthToken!=='string'||input.oauthToken.length>8192){
          return blocked();
        }
        const verified=ports.inspectOauth(input.oauthToken,'mcp:write');
        if(!verified||!verified.scopes.includes('mcp:write')
          ||verified.expiresAt<=Math.floor(now/1000)
          ||t.identity.principalId!=='oauth:'+verified.subject
          ||t.identity.clientId!==verified.clientId)return blocked();
        const sessionId=ports.lookupSessionId(t.transportSessionId);
        if(!sessionId||!UUID.test(sessionId))return blocked();
        prune(now);
        if(entries.size>=LIMIT)return blocked();
        const proof=randomBytes(32).toString('base64url');
        const key=hash(proof);
        entries.set(key,{transport:{
          transportSessionId:t.transportSessionId,
          identity:{...t.identity}
        },oauthToken:input.oauthToken,governedSessionId:sessionId,
          targetKey:targetKey(input.target),expiresAt:Math.min(now+TTL,verified.expiresAt*1000)});
        return {status:'ISSUED',proof,expiresAt:Math.min(now+TTL,verified.expiresAt*1000),
          runtimeWriteAuthorized:false};
      }catch{return blocked();}
    },
    /**
     * Browser's proof is merely a one-use challenge response. The server
     * MUST independently authenticate the web cookie, verify E3 signature,
     * same-origin and exact target before calling. This never grants SSH.
     */
    redeem(input:Readonly<{
      proof:string;target:PleskPairingTarget;webSessionBinding:string;
    }>):PleskPairingLink|null{
      try{
        const now=ports.now();
        if(!Number.isSafeInteger(now)||!valid(input.target)
          ||typeof input.webSessionBinding!=='string'
          ||input.webSessionBinding.length<6||input.webSessionBinding.length>2048
          ||typeof input.proof!=='string'||!PROOF.test(input.proof))return null;
        prune(now);
        const key=hash(input.proof);
        const entry=entries.get(key);
        if(!entry)return null;
        // Single-use claim is synchronous: no async interleaving/replay.
        entries.delete(key);
        if(entry.expiresAt<=now||entry.targetKey!==targetKey(input.target)
          ||ports.lookupSessionId(entry.transport.transportSessionId)!==entry.governedSessionId)
          return null;
        const verified=ports.inspectOauth(entry.oauthToken,'mcp:write');
        if(!verified||!verified.scopes.includes('mcp:write')
          ||verified.expiresAt<=Math.floor(now/1000)
          ||'oauth:'+verified.subject!==entry.transport.identity.principalId
          ||verified.clientId!==entry.transport.identity.clientId)return null;
        return {
          governedSessionId:entry.governedSessionId,
          transport:entry.transport,
          oauthAuthorization:'Bearer '+entry.oauthToken
        };
      }catch{return null;}
    }
  };
}
export type PleskWebTransportPairing=ReturnType<typeof createPleskWebTransportPairing>;
