import { Router, type RequestHandler } from 'express';
import { consoleDocument, consoleStyleHash } from './consoleUi.js';
import { AILM_SCOPES, AILM_OPERATIONS, isAilmScope, isAilmOperation, runInfrastructureLifecycle } from '../infrastructureLifecycle/service.js';

function escapeHtml(value:string):string {
  return value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
}
export function createInfrastructureLifecycleRouter(requireLogin:RequestHandler,run=runInfrastructureLifecycle) {
  const router=Router();
  router.get('/infrastructure-maintenance',requireLogin,async (req,res)=>{
    res.set({'Cache-Control':'private, no-store','Content-Security-Policy':`default-src 'none'; style-src ${consoleStyleHash}; form-action 'self'; frame-ancestors 'none'; base-uri 'none'`,'Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'});
    const scope=req.query.scope??'all',operation=req.query.operation??'status';
    if(!isAilmScope(scope)||!isAilmOperation(operation)){
      res.status(400).type('text').send('Périmètre ou opération invalide.');return;
    }
    try {
      const result=await run(scope,operation);
      const opts=(values:readonly string[],selected:string)=>values.map(v=>`<option value="${v}"${v===selected?' selected':''}>${v}</option>`).join('');
      res.type('html').send(consoleDocument('Infrastructure &amp; maintenance · WealthTech MCP',
        `<h1>Infrastructure &amp; maintenance</h1><p class="wt-copy">AILM — même parcours de lecture que les agents MCP. Aucun transfert, nettoyage ou changement de politique exécuté.</p>
        <section class="wt-card"><form method="get" action="/infrastructure-maintenance"><label for="scope">Périmètre</label><select id="scope" name="scope">${opts(AILM_SCOPES,scope)}</select><label for="operation">Opération</label><select id="operation" name="operation">${opts(AILM_OPERATIONS,operation)}</select><button type="submit">Observer</button></form></section>
        <section class="wt-card"><h2>Résultat et preuves</h2><pre>${escapeHtml(JSON.stringify(result,null,2))}</pre></section>
        <section class="wt-notice"><h2>Programmation et exécution</h2><p>Non raccordées. Les opérations sensibles restent soumises aux autorités MCP existantes ; aucun formulaire ne peut accorder des droits.</p></section>`));
    } catch {res.status(503).type('text').send('Observation AILM indisponible.');}
  });
  return router;
}
