import express from 'express';
import type { Request, RequestHandler, Router } from 'express';
import { z } from 'zod';
import { planPleskSubdomain, type PleskSubdomainInput } from './pleskSite.js';
import { observePleskSubdomain, createPleskSubdomainOnServer } from './pleskSshAdapter.js';
import type { PleskPolicy, PleskRemotePort } from './pleskSshAdapter.js';

export type PleskWebDependencies = {
  requireLogin: RequestHandler;
  session: (req: Request) => string;
  sameOrigin: (req: Request) => boolean;
  issueTicket: (purpose: string, binding: string) => string;
  verifyTicket: (purpose: string, ticket: unknown, binding: string) => boolean;
  policy: () => PleskPolicy;
  io: PleskRemotePort;
  writeEnabled: () => boolean;
  authorizeRuntimeWrite: (input: PleskSubdomainInput) => Promise<boolean>;
  /**
   * Optional additive B3e single-use E3 consumption gate, evaluated AFTER
   * existing signed E3 and live governed runtime authority checks, BEFORE SSH.
   * The actual server must supply an authenticated request-bound verifier,
   * never a boolean from the request body.
   */
  consumeGovernedConsent?: (req: Request, input: PleskSubdomainInput,
    signed: Readonly<{ ticket: string; binding: string }>) => Promise<boolean>;
};

const PURPOSE = 'plesk-create-subdomain';
const PATH = '/provisioning/plesk-subdomain';
const Params = z.object({
  serverId: z.enum(['s1','s2']),
  parentDomain: z.string().min(4).max(253),
  label: z.string().min(1).max(63),
  documentRoot: z.string().min(2).max(150)
}).strict();
const ConsentForm = Params.extend({
  consent_ticket: z.string().min(1).max(500),
  confirm_fqdn: z.string().min(4).max(320),
  consent_creation: z.literal('CREATE_SUBDOMAIN')
}).strict();

function escapeHtml(text: string): string {
  return text.replaceAll('&','&amp;').replaceAll('<','&lt;')
    .replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'","&#39;");
}
function toInput(p: z.infer<typeof Params>): PleskSubdomainInput {
  return { ...p, evidence: {
    parentExists: null, targetExists: null, documentRootExists: null,
    subscriptionAuthorized: null, documentRootSafe: null, targetOwnedByProvisioner: null
  } };
}
function binding(req: Request, p: z.infer<typeof Params>, deps: PleskWebDependencies): string {
  return JSON.stringify([deps.session(req),p.serverId,p.parentDomain,p.label,p.documentRoot]);
}

/**
 * Additive E3 consent boundary. Login, signed purpose/session/target ticket,
 * same-origin provenance and exact target confirmation are independent guards.
 * No MCP tool flag or API credential alone authorizes creating a vhost.
 */
export function createPleskSubdomainRouter(deps: PleskWebDependencies): Router {
  const router = express.Router();
  router.get('/provisioning/plesk-subdomain', deps.requireLogin, async (req, res) => {
    res.setHeader('Cache-Control','no-store');
    res.setHeader('X-Frame-Options','DENY');
    res.setHeader('Content-Security-Policy',"default-src 'none'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'");
    const request = Params.safeParse(req.query);
    if (!request.success) { res.status(400).send('INVALID_PLESK_TARGET'); return; }
    const p = request.data;
    const fqdn = p.label + '.' + p.parentDomain;
    try {
      const policy = deps.policy();
      const evidence = await observePleskSubdomain(toInput(p), policy, deps.io);
      const plan = planPleskSubdomain({ ...toInput(p), evidence });
      const form = plan.decision !== 'READY' ? '' : (() => {
        const ticket = deps.issueTicket(PURPOSE, binding(req, p, deps));
        const hidden = Object.entries(p).map(([key,value]) =>
          '<input type="hidden" name="'+key+'" value="'+escapeHtml(String(value))+'" />').join('');
        return '<form method="post" action="'+PATH+'">'
          +hidden
          +'<input type="hidden" name="consent_ticket" value="'+escapeHtml(ticket)+'" />'
          +'<input type="hidden" name="confirm_fqdn" value="'+escapeHtml(fqdn)+'" />'
          +'<label><input type="checkbox" name="consent_creation" value="CREATE_SUBDOMAIN" required /> '
          +'Je confirme la création de '+escapeHtml(fqdn)+'</label>'
          +'<button type="submit">Créer le sous-domaine</button></form>';
      })();
      res.type('html').send('<!doctype html><html lang="fr"><head><meta charset="utf-8">'
        +'<title>Provisionnement Plesk</title></head><body><h1>'+escapeHtml(fqdn)+'</h1>'
        +'<p>Plan: '+escapeHtml(plan.decision)+' ; '+escapeHtml(plan.reason)+'</p>'
        +form+'</body></html>');
    } catch {
      res.status(503).send('PLESK_PREFLIGHT_UNAVAILABLE');
    }
  });
  router.post('/provisioning/plesk-subdomain', deps.requireLogin, async (req, res) => {
    const parsed = ConsentForm.safeParse(req.body);
    if (!parsed.success) { res.status(403).json({status:'BLOCKED',reason:'CONSENT_INVALID'}); return; }
    const {consent_ticket,confirm_fqdn,consent_creation: _consentCreation,...p} = parsed.data;
    const fqdn = p.label + '.' + p.parentDomain;
    if (!deps.sameOrigin(req)
      || !deps.verifyTicket(PURPOSE,consent_ticket,binding(req,p,deps))
      || confirm_fqdn !== fqdn || !deps.writeEnabled()) {
      res.status(403).json({status:'BLOCKED',reason:'CONSENT_OR_WRITE_NOT_ALLOWED'});
      return;
    }
    try {
      // E3 web consent is necessary but never grants runtime authority by itself.
      // A fresh governed session/claim/lock check must explicitly authorize this target.
      if (!await deps.authorizeRuntimeWrite(toInput(p))) {
        res.status(403).json({status:'BLOCKED',reason:'GOVERNED_RUNTIME_AUTHORITY_REQUIRED'});
        return;
      }
      // B3e: when the trusted server installs a durable one-use E3 consumer,
      // reject replays before the existing Plesk executor sees any write.
      // No consumer is installed in production yet; authorizeRuntimeWrite
      // remains fail-closed there.
      if (deps.consumeGovernedConsent
        && !await deps.consumeGovernedConsent(req,toInput(p),{
          ticket:consent_ticket,binding:binding(req,p,deps)
        })) {
        res.status(403).json({status:'BLOCKED',reason:'E3_SINGLE_USE_CONSUMPTION_REQUIRED'});
        return;
      }
      const outcome = await createPleskSubdomainOnServer(toInput(p),deps.policy(),true,deps.io);
      const code = outcome.status === 'CREATED' ? 201 : outcome.status === 'NO_OP' ? 200
        : outcome.status === 'BLOCKED' ? 403 : 503;
      res.status(code).json({ fqdn, serverId:p.serverId,...outcome });
    } catch {
      res.status(503).json({status:'FAILED',reason:'PLESK_OPERATION_UNAVAILABLE'});
    }
  });
  return router;
}
