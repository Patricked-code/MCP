import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { Router, json } from 'express';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { renderCugAdmission } from './page.js';

export const CUG_APP_ID = '5417646';
const route = '/repo-template/auth';
const login = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9-]{0,38}$/);
const requestId = z.string().regex(/^[A-Za-z0-9_-]{43}$/);
const verifyInput = z.object({ request:requestId, appId:z.literal(CUG_APP_ID) }).strict();
const selectInput = verifyInput.extend({accountId:login});
export type CugAccount = {login:string; installationId:number; probeRepository:string};
export type CugConfig = {clientId:string; subject:string; identityKey:string; accounts:CugAccount[]};
type VerifiedToken = {subject:string; clientId:string; scopes:string[]; expiresAt:number};
type Ports = {
  origin:string;
  getConfig:()=>Promise<CugConfig|null>;
  inspect:(token:string)=>VerifiedToken|null;
  probe:(account:CugAccount)=>Promise<boolean>;
  now?:()=>number;
};
const denied = {status:'AUTHORIZATION_REQUIRED'} as const;
const unavailable = {status:'UNAVAILABLE'} as const;
const mac=(key:string,value:string)=>createHmac('sha256',key).update(value).digest('hex');
const same=(a:string,b:string)=>a.length===b.length && timingSafeEqual(Buffer.from(a),Buffer.from(b));

export function createCugAdmission(ports:Ports) {
  const now=ports.now??Date.now;
  type Attempt = { expiresAt:number; tokenDigest:string; phase:'PENDING'|'VERIFYING'|'VERIFIED'|'SELECTING'; permitted:string[] };
  const attempts=new Map<string,Attempt>();
  const challengeKey=randomBytes(32).toString('hex');
  const tokenDigest=(token:string)=>mac(challengeKey,token);
  const requestKey=(id:string)=>mac(challengeKey,id);
  const safeToken=(token:string)=>/^[!-~]{1,8192}$/.test(token);
  function verifyActor(token:string,config:CugConfig) {
    const actor=safeToken(token)?ports.inspect(token):null;
    return actor && actor.subject===config.subject && actor.clientId===config.clientId &&
      actor.scopes.includes('mcp:read') && actor.expiresAt*1000>now() ? actor : null;
  }
  function sweep() {
    const t=now();
    for (const [id,a] of attempts) if(a.expiresAt<=t) attempts.delete(id);
  }
  function bound(id:string,token:string,phase:Attempt['phase']) {
    if(!requestId.safeParse(id).success||!safeToken(token))return null;
    const a=attempts.get(requestKey(id));
    return a && a.phase===phase && a.expiresAt>now() && same(a.tokenDigest,tokenDigest(token)) ? a:null;
  }
  async function begin(token:string) {
    try {
      const config=await ports.getConfig();
      if(!config)return unavailable;
      const actor=verifyActor(token,config);
      if(!actor)return denied;
      const origin=new URL(ports.origin);
      if(origin.protocol!=='https:'||origin.origin!==ports.origin)return unavailable;
      sweep();
      const digest=tokenDigest(token);
      if(attempts.size>=256||[...attempts.values()].filter(x=>same(x.tokenDigest,digest)).length>=5)return unavailable;
      const id=randomBytes(32).toString('base64url');
      const expiresAt=Math.min(now()+5*60_000,actor.expiresAt*1000);
      attempts.set(requestKey(id),{expiresAt,tokenDigest:digest,phase:'PENDING',permitted:[]});
      const authUrl=new URL(route,origin);
      authUrl.hash='request='+id;
      return {status:'AUTHENTICATION_REQUIRED' as const,authUrl:authUrl.href,expiresAt};
    }catch{return unavailable;}
  }
  async function verify(id:string,appId:string,token:string) {
    const a=bound(id,token,'PENDING');
    if(appId!==CUG_APP_ID||!a)return denied;
    a.phase='VERIFYING';
    try{
      const config=await ports.getConfig();
      if(!config||!verifyActor(token,config))return denied;
      const evidence=await Promise.all(config.accounts.map(async x=>({x,allowed:await ports.probe(x)})));
      if(a.expiresAt<=now()||!verifyActor(token,config))return denied;
      const accounts=evidence.filter(x=>x.allowed).map(({x})=>({login:x.login}));
      a.permitted=accounts.map(x=>x.login);
      a.phase='VERIFIED';
      return {status:'ACCOUNT_SELECTION_REQUIRED' as const,accounts};
    }catch{return unavailable;}
    finally{if(a.phase==='VERIFYING')attempts.delete(requestKey(id));}
  }
  async function select(id:string,accountId:string,token:string) {
    const a=bound(id,token,'VERIFIED');
    if(!a||!a.permitted.includes(accountId))return denied;
    a.phase='SELECTING';
    try{
      const config=await ports.getConfig();
      const actor=config&&verifyActor(token,config);
      const account=config?.accounts.find(x=>x.login===accountId);
      if(!config||!actor||!account||!await ports.probe(account)||a.expiresAt<=now()||!verifyActor(token,config))return denied;
      const scope=JSON.stringify([CUG_APP_ID,actor.subject,actor.clientId,account.login.toLowerCase(),account.installationId]);
      return {status:'AUTHENTICATED' as const, identityId:'ID-'+mac(config.identityKey,'identity:'+scope),
        continuityRootId:'CONT-'+mac(config.identityKey,'continuity:'+scope)};
    }catch{return unavailable;}
    finally{attempts.delete(requestKey(id));}
  }
  return {begin,verify,select};
}

type Admission = ReturnType<typeof createCugAdmission>;
export function createCugRouter(service:Admission, origin:string, enabled:()=>boolean) {
  const router=Router();
  router.use(route,(_req,res,next)=>{
    if(!enabled()){res.sendStatus(404);return;}
    res.set({'Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'});
    next();
  });
  router.get('/repo-template/auth',(_req,res)=>{
    const nonce=randomBytes(18).toString('base64');
    res.set('Content-Security-Policy',`default-src 'none'; script-src 'nonce-${nonce}'; style-src 'nonce-${nonce}'; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'`);
    res.type('html').send(renderCugAdmission(nonce));
  });
  const prepare:import('express').RequestHandler=(req,res,next)=>{
    if(req.header('origin')!==origin){res.status(403).json(denied);return;}
    if(!req.is('application/json')){res.sendStatus(415);return;}
    next();
  };
  const parser=json({limit:'4kb',strict:true});
  const bearer=(value:string|undefined)=>value?.startsWith('Bearer ')?value.slice(7):'';
  router.post('/repo-template/auth/verify',prepare,parser,async(req,res)=>{
    const parsed=verifyInput.safeParse(req.body);
    if(!parsed.success){res.status(400).json(denied);return;}
    const result=await service.verify(parsed.data.request,parsed.data.appId,bearer(req.header('authorization')));
    res.status(result.status==='ACCOUNT_SELECTION_REQUIRED'?200:result.status==='UNAVAILABLE'?503:401).json(result);
  });
  router.post('/repo-template/auth/select',prepare,parser,async(req,res)=>{
    const parsed=selectInput.safeParse(req.body);
    if(!parsed.success){res.status(400).json(denied);return;}
    const result=await service.select(parsed.data.request,parsed.data.accountId,bearer(req.header('authorization')));
    res.status(result.status==='AUTHENTICATED'?200:result.status==='UNAVAILABLE'?503:401).json(result);
  });
  router.use(route,((error:unknown,_req,res,_next)=>{
    const status=(error as {status?:number}|null)?.status;
    res.status(status===413?413:400).json({status:'INVALID_REQUEST'});
  }) satisfies import('express').ErrorRequestHandler);
  return router;
}
export function registerCugAdmissionTool(server:McpServer, service:Pick<Admission,'begin'>) {
  server.registerTool('mcp_start_governed_request_auth',{
    description:'Ouvre l’entrée CUG/GRT sans créer de session, tâche ou dépôt.',
    inputSchema:{},
    annotations:{readOnlyHint:true,destructiveHint:false}
  },async(_input,extra)=>{
    const result=await service.begin(extra.authInfo?.token??'');
    return {
      content:[{type:'text',text:result.status==='AUTHENTICATION_REQUIRED'
        ?'Ouvrir la page d’authentification CUG : '+result.authUrl
        :result.status==='UNAVAILABLE'?'Entrée CUG non configurée ou indisponible.':'Connexion OAuth admise requise.'}],
      structuredContent:{...result},
      isError:result.status!=='AUTHENTICATION_REQUIRED'
    };
  });
}
