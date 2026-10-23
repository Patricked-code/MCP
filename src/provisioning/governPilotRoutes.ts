import express from 'express';
import type { Request, RequestHandler, Router } from 'express';
import { z } from 'zod';
import { GOUVERN_SHA, GOUVERN_SOURCE } from './governPilot.js';
import type { PilotStage } from './governPilot.js';

export type GovernPilotWebDeps = {
  requireLogin: RequestHandler;
  session: (req: Request) => string;
  sameOrigin: (req: Request) => boolean;
  issueTicket: (purpose:string,binding:string)=>string;
  verifyTicket: (purpose:string,ticket:unknown,binding:string)=>boolean;
  enabled:()=>boolean;
  writeEnabled:()=>boolean;
  read:()=>Promise<{revision:string;sha256:string;bytes:number}|null>;
  stage:()=>Promise<PilotStage>;
};

const Consent = z.object({
  revision: z.literal(GOUVERN_SHA),
  source: z.literal(GOUVERN_SOURCE),
  confirmation: z.literal('DEPLOY_GOUVERN'),
  consent_ticket: z.string().min(1).max(1000)
}).strict();
const PURPOSE = 'governed-grt-snapshot-pilot';
function binding(req:Request, deps:GovernPilotWebDeps):string {
  return JSON.stringify([deps.session(req),GOUVERN_SOURCE,GOUVERN_SHA,'/gouvern']);
}
function escapeHtml(input:string):string {
  return input.replaceAll('&','&amp;').replaceAll('<','&lt;')
    .replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'","&#39;");
}

/**
 * A protected, read-only project landing page. Only a signed existing E3
 * operator consent can stage a private archive in /app/data/gouvern.
 * Never serves or executes raw GRT source, control-plane files or secrets.
 */
export function createGovernPilotRouter(deps:GovernPilotWebDeps):Router {
  const router=express.Router();
  router.get('/gouvern',deps.requireLogin,async(req,res)=>{
    res.setHeader('Cache-Control','no-store');
    res.setHeader('Content-Security-Policy',"default-src 'none'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'");
    const enabled=deps.enabled();
    let snapshot:null|Awaited<ReturnType<typeof deps.read>>=null;
    try { snapshot=await deps.read(); } catch { /* fail closed */ }
    const state=snapshot?'STAGED':enabled?'NOT_STAGED':'DISABLED';
    const form=enabled && deps.writeEnabled() && !snapshot
      ? '<form method="post" action="/gouvern/deploy">'
        +'<input type="hidden" name="source" value="'+escapeHtml(GOUVERN_SOURCE)+'">'
        +'<input type="hidden" name="revision" value="'+GOUVERN_SHA+'">'
        +'<input type="hidden" name="consent_ticket" value="'+escapeHtml(deps.issueTicket(PURPOSE,binding(req,deps)))+'">'
        +'<label><input type="checkbox" required name="confirmation" value="DEPLOY_GOUVERN"> '
        +'J’autorise l’archivage privé de cette révision GitHub sur S1</label>'
        +'<button type="submit">Préparer le snapshot privé</button></form>'
      : '';
    res.type('html').status(200).send('<!doctype html><html lang="fr"><head><meta charset="utf-8">'
      +'<title>Gouvernance — projet pilote</title></head><body>'
      +'<h1>Governed-Repository-Template</h1>'
      +'<p>Source : '+escapeHtml(GOUVERN_SOURCE)+'</p>'
      +'<p>Revision : '+GOUVERN_SHA+'</p>'
      +'<p>État : '+escapeHtml(state)+'</p>'
      +'<p>Archive privée et non exécutable ; aucun fichier brut exposé par cette route.</p>'
      +form+'</body></html>');
  });
  router.post('/gouvern/deploy',deps.requireLogin,async(req,res)=>{
    res.setHeader('Cache-Control','no-store');
    const p=Consent.safeParse(req.body);
    if(!p.success || !deps.enabled() || !deps.writeEnabled()
      || !deps.sameOrigin(req)
      || !deps.verifyTicket(PURPOSE,p.data.consent_ticket,binding(req,deps))) {
      res.status(403).json({status:'BLOCKED',reason:'GRT_WEB_CONSENT_REQUIRED'});return;
    }
    try {
      const result=await deps.stage();
      res.status(result.status==='STAGED'?201:result.status==='NO_OP'?200:
        result.status==='BLOCKED'?403:503).json(result);
    } catch {
      res.status(503).json({status:'FAILED',reason:'GRT_STAGE_UNAVAILABLE'});
    }
  });
  return router;
}
