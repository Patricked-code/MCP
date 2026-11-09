/**
 * GD-U-02D B3j: server-owned HTTP request bridge for the EXISTING Plesk route.
 *
 * The OAuth/MCP pairing, E3 receipt, Task/Session/Lock, exact-head CI/review
 * and final executor come from injected existing services. No second store,
 * consent issuer, credential, SSH client or public write tool.
 *
 * A boolean is NEVER read from a web form. Only the server's prepare,
 * single-use consume and executor callbacks can advance a request.
 */
import type { Request } from 'express';
import type { PleskSubdomainInput } from './pleskSite.js';
import type { PleskCreationOutcome } from './pleskExecute.js';

type Context=Readonly<{
  req:Request;
  pairingProof:string;
  consentTicket:string;
  binding:string;
}>;
type Signed=Readonly<{ticket:string;binding:string}>;
type Prepared<T>=Readonly<{targetKey:string;signed:Signed;proof:T}>;
export type PleskGovernedWebBridgePorts<T>=Readonly<{
  /** Authenticated MCP transport bound to existing Task/Session/Lock only. */
  prepare:(input:PleskSubdomainInput,context:Context)=>Promise<T|null>;
  /** Durable atomic E3 receipt, after independent CI/review and live probes. */
  consume:(proof:T,signed:Signed)=>Promise<boolean>;
  /** Existing governed executor; it MUST re-read authority before SSH. */
  execute:(proof:T,input:PleskSubdomainInput)=>Promise<PleskCreationOutcome>;
}>;
const key=(t:PleskSubdomainInput)=>JSON.stringify([
  t.serverId,t.parentDomain,t.label,t.documentRoot
]);
const blocked=():PleskCreationOutcome=>({
  status:'BLOCKED',reason:'GOVERNED_EXECUTION_NOT_ATTESTED'
});

/** Request identity is the server's Express object, NOT caller-supplied ID. */
export function createPleskGovernedWebExecutionBridge<T>(
  ports:PleskGovernedWebBridgePorts<T>
){
  const prepared=new WeakMap<Request,Prepared<T>>();
  const consumed=new WeakMap<Request,Prepared<T>>();
  return {
    authorizeRuntimeWrite:async(input:PleskSubdomainInput,context?:Context):Promise<boolean>=>{
      if(!context||!context.req||!context.consentTicket||!context.binding)return false;
      // Each admission supersedes old unconsumed state for the same request.
      prepared.delete(context.req);
      consumed.delete(context.req);
      try{
        const proof=await ports.prepare(input,context);
        if(!proof)return false;
        prepared.set(context.req,{targetKey:key(input),proof,
          signed:{ticket:context.consentTicket,binding:context.binding}});
        return true;
      }catch{return false;}
    },
    consumeGovernedConsent:async(
      req:Request,input:PleskSubdomainInput,signed:Signed
    ):Promise<boolean>=>{
      const state=prepared.get(req);
      prepared.delete(req); // one attempt even on invalid E3 or provider failure
      if(!state||state.targetKey!==key(input)
        ||state.signed.ticket!==signed.ticket
        ||state.signed.binding!==signed.binding)return false;
      try{
        if(!await ports.consume(state.proof,signed))return false;
        consumed.set(req,state);
        return true;
      }catch{return false;}
    },
    executeGovernedCreate:async(
      req:Request,input:PleskSubdomainInput
    ):Promise<PleskCreationOutcome>=>{
      const state=consumed.get(req);
      consumed.delete(req); // no replay, even when remote call fails
      if(!state||state.targetKey!==key(input))return blocked();
      try{return await ports.execute(state.proof,input);}
      catch{return blocked();}
    }
  };
}
