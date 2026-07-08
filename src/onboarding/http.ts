import express from 'express';
import { getGithubConnectionStatus } from '../github/connection.js';
import { readGitRegistry, writeGitRegistry } from '../github/registry.js';
import { appendOnboardingAuditEvent, createOnboardingAuditEvent } from './audit.js';
import { getDefaultAgentProfiles } from './agents.js';
import { identifyActor } from './identity.js';
import { getDefaultOnboardingQuestions } from './questions.js';
import { summarizeGithubRights } from './rights.js';

type WebGuard = (req: express.Request, res: express.Response, next: express.NextFunction) => void;

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function renderOnboardingPage(snapshot: unknown): string {
  const json = JSON.stringify(snapshot, null, 2);
  return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>MCP — Onboarding</title>
  <style>
    body { font-family: system-ui, -apple-system, Segoe UI, sans-serif; margin: 32px; color: #111827; line-height: 1.45; }
    a { color: #1d4ed8; }
    .card { border: 1px solid #d1d5db; border-radius: 14px; padding: 18px; background: #fff; margin: 16px 0; }
    button { margin-top: 12px; padding: 10px 16px; border: 0; border-radius: 8px; background: #111827; color: white; font-weight: 800; cursor: pointer; }
    select, input { padding: 10px; border: 1px solid #d1d5db; border-radius: 8px; min-width: 260px; }
    pre { background: #f3f4f6; padding: 14px; border-radius: 10px; overflow: auto; }
  </style>
</head>
<body>
  <h1>MCP — Onboarding Engine</h1>
  <p><a href="/dashboard">Dashboard</a> · <a href="/git">Paramétrage Git</a> · <a href="/git/accounts">Comptes</a> · <a href="/git/repos">Repos</a> · <a href="/git/agents">Agents</a> · <a href="/git/audit">Audit</a></p>

  <section class="card">
    <h2>Première question obligatoire</h2>
    <form method="post" action="/git/onboarding/start">
      <label>Qui êtes-vous ?</label>
      <select name="actor">
        <option value="ChatGPT">ChatGPT</option>
        <option value="ConfigCloud">ConfigCloud</option>
        <option value="Autre agent / service">Autre agent / service</option>
      </select>
      <button type="submit">Démarrer l’onboarding</button>
    </form>
  </section>

  <section class="card">
    <h2>État courant</h2>
    <pre>${escapeHtml(json)}</pre>
  </section>
</body>
</html>`;
}

function wantsHtml(req: express.Request): boolean {
  return Boolean(req.accepts(['html', 'json']) === 'html');
}

async function onboardingSnapshot(actorInput?: unknown) {
  const status = await getGithubConnectionStatus();
  const registry = await readGitRegistry();
  const knownActorIds = registry.auditEvents.map((event) => event.actor);
  const actor = identifyActor({ actor: actorInput ?? 'ChatGPT', source: 'web', knownActorIds });
  const rights = summarizeGithubRights(status);
  const questions = getDefaultOnboardingQuestions();
  const agents = getDefaultAgentProfiles();
  const nextActions = [
    'Identifier l’acteur : ChatGPT, ConfigCloud ou autre agent/service.',
    'Vérifier les droits GitHub disponibles.',
    'Lister les comptes et repositories visibles.',
    'Détecter les fichiers MCP manquants.',
    'Proposer un bootstrap sur branche MCP uniquement.',
    'Créer une trace d’audit sans secret.'
  ];

  return { actor, status, rights, questions, agents, nextActions };
}

export function registerOnboardingRoutes(app: express.Express, requireWebLogin: WebGuard): void {
  app.get('/git/onboarding', requireWebLogin, async (req, res) => {
    const snapshot = await onboardingSnapshot(req.query.actor);
    if (wantsHtml(req)) {
      res.type('html').send(renderOnboardingPage(snapshot));
      return;
    }
    res.json(snapshot);
  });

  app.post('/git/onboarding/start', requireWebLogin, async (req, res) => {
    const actorInput = typeof req.body.actor === 'string' ? req.body.actor : 'unknown';
    const registry = await readGitRegistry();
    const snapshot = await onboardingSnapshot(actorInput);
    const nextRegistry = appendOnboardingAuditEvent(
      registry,
      createOnboardingAuditEvent({
        actorId: snapshot.actor.actorId,
        actorName: snapshot.actor.actorName,
        actorType: snapshot.actor.actorType,
        githubLogin: snapshot.status.login,
        githubOrg: snapshot.status.org,
        action: 'onboarding.started',
        result: 'success',
        metadata: { source: 'web', firstConnection: snapshot.actor.firstConnection }
      })
    );
    await writeGitRegistry(nextRegistry);

    if (wantsHtml(req)) {
      res.redirect(`/git/onboarding?actor=${encodeURIComponent(actorInput)}`);
      return;
    }
    res.json(snapshot);
  });

  app.post('/git/onboarding/answer', requireWebLogin, async (req, res) => {
    const registry = await readGitRegistry();
    const questionId = typeof req.body.questionId === 'string' ? req.body.questionId : 'unknown';
    const answer = typeof req.body.answer === 'string' ? req.body.answer : 'unknown';
    const actorInput = typeof req.body.actor === 'string' ? req.body.actor : 'unknown';
    const snapshot = await onboardingSnapshot(actorInput);
    const nextRegistry = appendOnboardingAuditEvent(
      registry,
      createOnboardingAuditEvent({
        actorId: snapshot.actor.actorId,
        actorName: snapshot.actor.actorName,
        actorType: snapshot.actor.actorType,
        githubLogin: snapshot.status.login,
        githubOrg: snapshot.status.org,
        action: 'onboarding.answer.recorded',
        result: 'success',
        metadata: { questionId, answer }
      })
    );
    await writeGitRegistry(nextRegistry);
    res.json({ ok: true, questionId, answer, nextQuestions: snapshot.questions });
  });

  app.get('/git/accounts', requireWebLogin, async (_req, res) => {
    const registry = await readGitRegistry();
    res.json({ accounts: registry.accounts });
  });

  app.get('/git/accounts/:account', requireWebLogin, async (req, res) => {
    const registry = await readGitRegistry();
    const account = String(req.params.account ?? '').toLowerCase();
    const found = registry.accounts.filter((entry) => entry.login.toLowerCase() === account || entry.id.toLowerCase() === account);
    res.json({ account, matches: found });
  });

  app.get('/git/repos', requireWebLogin, async (_req, res) => {
    const registry = await readGitRegistry();
    res.json({ repoMappings: registry.repoMappings, note: 'V1: listing GitHub live à brancher sur le client GitHub interne.' });
  });

  app.get('/git/repos/:owner/:repo', requireWebLogin, async (req, res) => {
    const registry = await readGitRegistry();
    const owner = String(req.params.owner ?? '');
    const repo = String(req.params.repo ?? '');
    const mapping = registry.repoMappings.find((entry) => entry.githubOwner === owner && entry.githubRepo === repo) ?? null;
    res.json({ owner, repo, mapping });
  });

  app.post('/git/repos/:owner/:repo/bootstrap', requireWebLogin, async (req, res) => {
    const owner = String(req.params.owner ?? '');
    const repo = String(req.params.repo ?? '');
    const registry = await readGitRegistry();
    const snapshot = await onboardingSnapshot(req.body.actor);
    const nextRegistry = appendOnboardingAuditEvent(
      registry,
      createOnboardingAuditEvent({
        actorId: snapshot.actor.actorId,
        actorName: snapshot.actor.actorName,
        actorType: snapshot.actor.actorType,
        githubLogin: snapshot.status.login,
        githubOrg: snapshot.status.org,
        repo: `${owner}/${repo}`,
        action: 'repo.bootstrap.requested',
        result: 'warning',
        warnings: ['V1 prépare la demande ; écriture Git réelle à implémenter sur branche MCP.']
      })
    );
    await writeGitRegistry(nextRegistry);
    res.json({ ok: true, owner, repo, mode: 'proposal_only', message: 'Bootstrap enregistré en audit. Écriture Git réelle non exécutée en V1.' });
  });

  app.get('/git/agents', requireWebLogin, async (_req, res) => {
    res.json({ agents: getDefaultAgentProfiles() });
  });

  app.post('/git/agents/create', requireWebLogin, async (req, res) => {
    const registry = await readGitRegistry();
    const actorInput = typeof req.body.actor === 'string' ? req.body.actor : 'unknown';
    const snapshot = await onboardingSnapshot(actorInput);
    const nextRegistry = appendOnboardingAuditEvent(
      registry,
      createOnboardingAuditEvent({
        actorId: snapshot.actor.actorId,
        actorName: snapshot.actor.actorName,
        actorType: snapshot.actor.actorType,
        githubLogin: snapshot.status.login,
        githubOrg: snapshot.status.org,
        action: 'agent.create.requested',
        result: 'warning',
        warnings: ['V1 expose les profils par défaut ; persistance des agents personnalisés à finaliser.'],
        metadata: { requestedAgent: req.body.agentName ?? null }
      })
    );
    await writeGitRegistry(nextRegistry);
    res.json({ ok: true, message: 'Demande de création agent enregistrée en audit.', agents: snapshot.agents });
  });

  app.get('/git/audit', requireWebLogin, async (req, res) => {
    const registry = await readGitRegistry();
    const auditEvents = registry.auditEvents.slice(-100).reverse();
    if (wantsHtml(req)) {
      const rows = auditEvents.map((event) => `<li><strong>${escapeHtml(event.at)}</strong> — ${escapeHtml(event.type)} — ${escapeHtml(event.actor)} — ${escapeHtml(event.message)}</li>`).join('');
      res.type('html').send(`<!doctype html><html lang="fr"><head><meta charset="utf-8" /><title>MCP Audit</title></head><body><h1>MCP Audit</h1><p><a href="/git/onboarding">Onboarding</a> · <a href="/git">Paramétrage Git</a></p><ul>${rows || '<li>Aucun événement.</li>'}</ul></body></html>`);
      return;
    }
    res.json({ auditEvents });
  });
}
