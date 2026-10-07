import express from 'express';
import type { Request, RequestHandler, Response, Router } from 'express';

import {
  PROVISIONING_CONSENT_PURPOSE,
  decideProvisioningConsent,
  provisioningConsentBinding,
  renderProvisioningConsentFields
} from './consent.js';
import type { ProjectRuntimeProvisioningPlan } from './projectRuntime.js';
import type { ProjectRuntimeExecution } from './runtimeExecutor.js';
import type { ProjectRuntimeProvisioningTarget } from './wiring.js';

/**
 * F.2 (TB-W3-F-03), increment 3: the consented provisioning surface, on the
 * existing Express exposure and behind the web login. The plan page observes
 * and plans without executing anything. A submission runs the executor only
 * with the consents the server decides from a same-origin form, a ticket bound
 * to the session and to the exact target, and explicit values: the web
 * session alone never authorizes a provisioning. A long job answers that it
 * runs on; its outcome is on the status page and in its attestation.
 */
const PAGE_PATH = '/provisioning/project-runtime';
const STATUS_PATH = '/provisioning/project-runtime/status';
const DEFAULT_RESPONSE_WAIT_MS = 25_000;
const MAX_FIELD_LENGTH = 300;

export type ProvisioningRequest = Readonly<{ serverId: 'S1'; projectId: string; mappingId: string; revision: string }>;

export type ProjectRuntimeProvisioningRouteDependencies = {
  requireLogin: RequestHandler;
  /** The web session a consent ticket is bound to. */
  consentSession: (req: Request) => string;
  isSameOrigin: (req: Request) => boolean;
  issueTicket: (purpose: string, binding: string) => string;
  verifyTicket: (purpose: string, ticket: unknown, binding: string) => boolean;
  listTargets: () => Promise<readonly ProjectRuntimeProvisioningTarget[]>;
  preview: (request: ProvisioningRequest) => Promise<ProjectRuntimeProvisioningPlan>;
  execute: (input: {
    request: ProvisioningRequest;
    consent: { creation: boolean; activation: boolean };
  }) => Promise<ProjectRuntimeExecution>;
  /** How long a submission waits for its job before answering that it runs on. */
  responseWaitMs?: number;
  now?: () => Date;
};

const DECISIONS: Record<ProjectRuntimeProvisioningPlan['decision'], string> = {
  BLOCKED: 'bloqué : rien ne sera créé ni activé. Une preuve manquante n’est jamais une absence.',
  NO_OP: 'déjà en place : le même composant tourne à cette révision. Rien à faire.',
  CONSENT_REQUIRED: 'en attente de votre consentement explicite.',
  READY: 'prêt.'
};

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function code(value: unknown): string {
  return `<code>${escapeHtml(value)}</code>`;
}

function codes(values: readonly string[]): string {
  return values.length > 0 ? values.map(code).join(', ') : 'aucune';
}

function secure(res: Response): void {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'"
  );
}

function page(title: string, body: string): string {
  return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${escapeHtml(title)}</title>
</head>
<body style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;background:#f9fafb;margin:0;color:#111827">
  <main style="max-width:960px;margin:32px auto;background:#fff;border:1px solid #e5e7eb;border-radius:16px;padding:28px">
    <p><a href="/dashboard">Dashboard</a> · <a href="${PAGE_PATH}">Provisioning</a> · <a href="${STATUS_PATH}">Statut</a></p>
    <h1>${escapeHtml(title)}</h1>
    ${body}
  </main>
</body>
</html>`;
}

function field(source: Record<string, unknown>, name: string): string | null {
  const value = source[name];
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed && trimmed.length <= MAX_FIELD_LENGTH ? trimmed : null;
}

/** The exact target a form names; the planner validates it further. */
function requestFrom(source: unknown): ProvisioningRequest | null {
  const record = source && typeof source === 'object' ? source as Record<string, unknown> : {};
  const projectId = field(record, 'projectId');
  const mappingId = field(record, 'mappingId');
  const revision = field(record, 'revision');
  if (!projectId || !mappingId || !revision) return null;
  return Object.freeze({ serverId: 'S1' as const, projectId, mappingId, revision: revision.toLowerCase() });
}

async function renderTargets(deps: ProjectRuntimeProvisioningRouteDependencies): Promise<string> {
  const intro = '<p>Provisionne le runtime d’un composant d’un projet cible de S1, seulement s’il est réellement absent. Rien n’est exécuté sans votre consentement explicite.</p>';
  let targets: readonly ProjectRuntimeProvisioningTarget[];
  try {
    targets = await deps.listTargets();
  } catch {
    return `${intro}<p><strong>UNKNOWN</strong> : les cibles sont illisibles. Aucun provisioning n’est possible tant qu’elles ne sont pas relues.</p>`;
  }
  if (targets.length === 0) {
    return `${intro}<p>Aucune cible : aucun projet n’est configuré dans ${code('.mcp/server-map.json')} (${code('servers.S1.targetProjectIds')}, modifié uniquement par une pull request revue) avec un composant dont le chemin S1 déclaré dans GitRegistry est sous ${code('/opt/apps')}.</p>`;
  }
  const rows = targets.map((target) => `<tr>
        <td>${code(target.projectId)}</td>
        <td>${code(target.mappingId)}</td>
        <td>${code(target.repositoryId)}</td>
        <td>${code(target.serverPath)}</td>
        <td><form method="get" action="${PAGE_PATH}">
          <input type="hidden" name="projectId" value="${escapeHtml(target.projectId)}" />
          <input type="hidden" name="mappingId" value="${escapeHtml(target.mappingId)}" />
          <input name="revision" required pattern="[0-9a-f]{40}" placeholder="SHA exact (40 caractères)" />
          <button type="submit">Planifier</button>
        </form></td>
      </tr>`).join('\n');
  return `${intro}
    <table style="border-collapse:collapse" cellpadding="6">
      <thead><tr><th>Projet</th><th>Mapping</th><th>Dépôt</th><th>Chemin S1</th><th>Révision</th></tr></thead>
      <tbody>
      ${rows}
      </tbody>
    </table>
    <p>La révision doit appartenir à l’historique revu de la branche par défaut, avec une CI ni en échec ni en cours ; elle est revérifiée juste avant toute écriture.</p>`;
}

function renderPlan(plan: ProjectRuntimeProvisioningPlan, request: ProvisioningRequest, ticket: string | null): string {
  const target = plan.target;
  const targetPart = target
    ? `<p>Cible : dépôt ${code(target.repositoryId)} à la révision ${code(target.revision)}, composant ${code(target.mappingId)} du projet ${code(target.projectId)}, chemin ${code(target.serverPath)} sur S1, projet Compose ${code(target.composeProject)}.</p>
    <p>Gouvernance héritée : sauvegarde ${plan.governance?.backupRequired ? 'requise' : 'non requise'}, méthode de retour ${code(plan.governance?.rollbackMethod ?? 'non déclarée')}.</p>`
    : '<p>Cible non résolue.</p>';
  const steps = plan.steps.map((step) => `<tr><td>${code(step.id)}</td><td>${code(step.state)}</td></tr>`).join('');
  const form = plan.decision === 'CONSENT_REQUIRED' && ticket
    ? `<form method="post" action="${PAGE_PATH}">
      <input type="hidden" name="projectId" value="${escapeHtml(request.projectId)}" />
      <input type="hidden" name="mappingId" value="${escapeHtml(request.mappingId)}" />
      <input type="hidden" name="revision" value="${escapeHtml(request.revision)}" />
      ${renderProvisioningConsentFields({ ticket, plan })}
      <p>Avant toute écriture, le serveur relit la cible, l’inventaire et la révision. Le mode écriture du serveur (${code('ENABLE_WRITE_TOOLS')}) reste requis et n’est jamais un consentement.</p>
      <button type="submit">Provisionner</button>
    </form>`
    : '';
  return `<p>Décision : <strong>${escapeHtml(plan.decision)}</strong> : ${DECISIONS[plan.decision]}</p>
    <p>Raisons : ${codes(plan.reasonCodes)}</p>
    ${targetPart}
    <table style="border-collapse:collapse" cellpadding="6"><thead><tr><th>Étape</th><th>État</th></tr></thead><tbody>${steps}</tbody></table>
    ${form}`;
}

function renderExecution(execution: ProjectRuntimeExecution): string {
  const target = execution.target;
  const job = execution.jobId
    ? `${code(execution.jobId)}, attesté dans ${code(`data/provisioning/${execution.jobId}/attestation.json`)}`
    : 'aucun : refusé avant toute écriture';
  const findings = execution.findings.length > 0
    ? `<p>Constats sur le modèle Compose : ${codes(execution.findings.map((finding) => `${finding.code}:${finding.service ?? '-'}`))}</p>`
    : '';
  return `<p>Résultat : <strong>${escapeHtml(execution.result)}</strong>${execution.mode ? ` (mode ${code(execution.mode)})` : ''}</p>
    <p>Job : ${job}</p>
    <p>Raisons : ${codes(execution.reasonCodes)}</p>
    ${findings}
    <p>Rollback : ${code(execution.rollback)}</p>
    ${target ? `<p>Cible : ${code(`${target.repositoryId}@${target.revision}`)} dans ${code(target.serverPath)} sur S1 (projet Compose ${code(target.composeProject)}).</p>` : ''}`;
}

function statusOf(execution: ProjectRuntimeExecution): number {
  if (execution.result === 'SUCCEEDED' || execution.result === 'NO_OP') return 200;
  if (execution.result === 'REFUSED' || execution.result === 'BLOCKED') return 409;
  return 502;
}

function unavailableExecution(): ProjectRuntimeExecution {
  return Object.freeze({
    result: 'FAILED' as const,
    jobId: null,
    mode: null,
    target: null,
    reasonCodes: Object.freeze(['PROVISIONING_UNAVAILABLE']),
    findings: Object.freeze([]),
    rollback: 'NOT_NEEDED' as const,
    authorizationInferred: false as const
  });
}

/** The job's outcome if it settles within the wait, null when it runs on. */
async function within<T>(job: Promise<T>, waitMs: number): Promise<T | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<null>((resolve) => {
    timer = setTimeout(() => resolve(null), waitMs);
    timer.unref?.();
  });
  try {
    return await Promise.race([job, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

export function createProjectRuntimeProvisioningRouter(deps: ProjectRuntimeProvisioningRouteDependencies): Router {
  const router = express.Router();
  const now = deps.now ?? (() => new Date());
  const waitMs = deps.responseWaitMs ?? DEFAULT_RESPONSE_WAIT_MS;
  let running: { request: ProvisioningRequest; startedAt: string } | null = null;
  let last: { execution: ProjectRuntimeExecution; finishedAt: string } | null = null;
  const binding = (req: Request, request: ProvisioningRequest) => provisioningConsentBinding(deps.consentSession(req), request);

  router.get('/provisioning/project-runtime/status', deps.requireLogin, (_req, res) => {
    secure(res);
    const current = running
      ? `<p>État : <strong>RUNNING</strong> depuis ${code(running.startedAt)} : composant ${code(running.request.mappingId)} à la révision ${code(running.request.revision)}.</p>`
      : '<p>Aucun provisioning en cours dans ce processus.</p>';
    const outcome = last
      ? `<h2>Dernier résultat</h2>${renderExecution(last.execution)}<p>Terminé à ${code(last.finishedAt)}.</p>`
      : '<p>Aucun résultat depuis le démarrage de ce processus ; chaque job reste attesté dans son dossier de données.</p>';
    res.status(200).type('html').send(page('Statut du provisioning', `${current}\n${outcome}`));
  });

  router.get('/provisioning/project-runtime', deps.requireLogin, async (req, res) => {
    secure(res);
    const request = requestFrom(req.query);
    if (!request) {
      res.status(200).type('html').send(page('Provisioning d’un runtime de projet', await renderTargets(deps)));
      return;
    }
    let plan: ProjectRuntimeProvisioningPlan;
    try {
      plan = await deps.preview(request);
    } catch {
      res.status(503).type('html').send(page('Provisioning d’un runtime de projet', '<p><strong>UNKNOWN</strong> : l’observation est indisponible, aucun plan n’est établi.</p>'));
      return;
    }
    const ticket = plan.decision === 'CONSENT_REQUIRED'
      ? deps.issueTicket(PROVISIONING_CONSENT_PURPOSE, binding(req, request))
      : null;
    res.status(200).type('html').send(page('Plan de provisioning', renderPlan(plan, request, ticket)));
  });

  router.post('/provisioning/project-runtime', deps.requireLogin, express.urlencoded({ extended: false, limit: '16kb' }), async (req, res) => {
    secure(res);
    const body = req.body && typeof req.body === 'object' ? req.body as Record<string, unknown> : {};
    const request = requestFrom(body);
    // Consent is decided here, before any GitHub call or write, and never inferred.
    const consent = decideProvisioningConsent({
      sameOrigin: deps.isSameOrigin(req),
      ticketValid: request !== null && deps.verifyTicket(PROVISIONING_CONSENT_PURPOSE, body.consent_ticket, binding(req, request)),
      creationConsent: body.consent_creation,
      activationConsent: body.consent_activation
    });
    if (!request || !consent.allowed) {
      res.status(403).type('html').send(page('Consentement refusé', `<p>Aucun provisioning n’a été lancé : ${code(consent.reasonCode)}.</p><p><a href="${PAGE_PATH}">Revenir au plan</a> pour rendre un nouveau consentement.</p>`));
      return;
    }
    if (running) {
      res.status(409).type('html').send(page('Provisioning en cours', `<p>Un provisioning est déjà en cours : rien n’a été lancé. <a href="${STATUS_PATH}">Voir le statut</a>.</p>`));
      return;
    }
    running = { request, startedAt: now().toISOString() };
    const job = deps.execute({ request, consent: { creation: consent.creation, activation: consent.activation } })
      .catch(() => unavailableExecution())
      .then((execution) => {
        last = { execution, finishedAt: now().toISOString() };
        running = null;
        return execution;
      });
    const execution = await within(job, waitMs);
    if (!execution) {
      res.status(202).type('html').send(page('Provisioning en cours', `<p>Le provisioning continue sur S1 ; son résultat sera sur la <a href="${STATUS_PATH}">page de statut</a> et dans l’attestation du job.</p>`));
      return;
    }
    res.status(statusOf(execution)).type('html').send(page('Provisioning d’un runtime de projet', renderExecution(execution)));
  });

  return router;
}
