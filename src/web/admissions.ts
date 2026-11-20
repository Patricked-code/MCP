import { Router, type RequestHandler } from 'express';
import { admissionCatalogueIndex, admissionDetails, findAdmission } from './admissionCatalogue.js';
import { consoleDocument, consoleStyleHash } from './consoleUi.js';

const paths = [
  {
    slug: 'cug', number: '01', className: 'wt-cug', title: 'Admission CUG',
    description: 'Vérifier une identité OAuth MCP, une installation GitHub App et un compte autorisé.',
    seal: 'Authentification OAuth · compte et installation vérifiés',
    steps: [
      ['Démarrer', 'Appeler <code>mcp_start_governed_request_auth</code> depuis un client OAuth autorisé. Le serveur délivre un lien temporaire, lié au même jeton OAuth. Sa référence est dans le fragment et aucun choix de slug ou de paramètre GET ne peut remplacer cette preuve.'],
      ['Vérifier', 'Le <code>GET /repo-template/auth</code> affiche la page. Les requêtes <code>POST /repo-template/auth/verify</code> et <code>POST /repo-template/auth/select</code> vérifient la demande, l’origine, le jeton et le compte.'],
      ['Continuer', 'Ouvrir le questionnaire de création ou le suivi de reprise que le serveur autorise. La session du tableau de bord ne remplace pas le jeton OAuth CUG.']
    ],
    next: '<a href="/admissions/grt">Voir le parcours GRT</a>'
  },
  {
    slug: 'grt', number: '02', className: 'wt-grt', title: 'Dépôt gouverné GRT',
    description: 'Distinguer une demande de création de dépôt et la reprise d’un dossier identifié.',
    seal: 'Consentements distincts · suivi central puis dossier local',
    steps: [
      ['Créer', 'Pour une nouvelle demande, ouvrir l’admission CUG sans référence de reprise. Après vérification, remplir le questionnaire puis confirmer séparément la publication du dossier et la demande de création. Le <code>POST /repo-template/auth/submit</code> vérifie ces éléments. Une demande transmise ne prouve pas la création du dépôt.'],
      ['Suivre', 'Le <code>GET /repo-template/auth/status</code> consulte le point de reprise central dans le contexte de l’admission. Après une réception incertaine, vérifier le statut avant toute nouvelle soumission.'],
      ['Reprendre', 'Pour retrouver un dossier central, ouvrir une reprise dans <code>mcp_start_governed_request_auth</code> avec <code>projectContinuityId</code> ou <code>resumeRepositoryName</code>. Pour consulter les preuves, appeler <code>mcp_resume_grt_repository_creation</code> avec l’identifiant de continuité depuis le client autorisé. La lecture locale et la synthèse GRGS dépendent des preuves du transfert. Cette page ne charge aucun dossier.']
    ],
    next: '<a href="/admissions/cug">Voir les prérequis de l’admission CUG</a>'
  },
  {
    slug: 'historique', number: '03', className: 'wt-pilot', title: 'Admission historique',
    description: 'Retrouver le parcours existant du pilote Governed Repository Template sur S1.',
    seal: 'Session opérateur · périmètre pilote préconfiguré',
    steps: [
      ['Consulter', 'Le <code>GET /gouvern</code> affiche l’état du pilote avec la session web. Il ne déclenche pas l’opération.'],
      ['Préparer', 'Le formulaire historique est disponible uniquement si le pilote est activé, si l’écriture est autorisée et si l’archive n’est pas déjà présente. Le <code>POST /gouvern/deploy</code> conserve ses contrôles et son consentement propres.'],
      ['Vérifier le résultat', 'L’archive du pilote ne crée pas à elle seule un dépôt GRT ni un chantier CUG. Le provisionnement Plesk dispose de son propre parcours.']
    ],
    next: '<a href="/gouvern">Ouvrir le pilote historique</a>'
  }
] as const;

export function createAdmissionsRouter(requireWebLogin: RequestHandler, cugEntryEnabled: () => boolean) {
  const router = Router();
  const secure: RequestHandler = (_req, res, next) => {
    res.set({
      'Cache-Control': 'no-store',
      'Content-Security-Policy': `default-src 'none'; style-src ${consoleStyleHash}; form-action 'none'; frame-ancestors 'none'; base-uri 'none'`,
      'Referrer-Policy': 'no-referrer',
      'X-Content-Type-Options': 'nosniff'
    });
    next();
  };
  router.get('/admissions', secure, requireWebLogin, (_req, res) => {
    const cards = paths.map(p => `<article class="wt-card ${p.className}"><span class="wt-step" aria-hidden="true">${p.number}</span>
      <h2>${p.title}</h2><p>${p.description}</p><p class="wt-meta">${p.seal}</p>
      <a class="wt-action" href="/admissions/${p.slug}">Voir le parcours <span aria-hidden="true">&nbsp;→</span></a></article>`).join('');
    res.type('html').send(consoleDocument('Parcours d’admission · WealthTech MCP',
      `<h1>Parcours d’admission</h1><p class="wt-copy">Choisissez votre objectif. Une connexion, une admission à un dépôt et une prise en charge de chantier n’accordent pas les mêmes droits.</p>
      <nav class="wt-links" aria-label="Connecter un client"><a href="/admissions/chatgpt">Connecter ChatGPT</a><a href="/admissions/claude">Connecter Claude</a><a href="/admissions/client-http">Autre client MCP</a></nav>
      <div class="wt-grid">${cards}</div><h2>Catalogue des connexions et parcours</h2><div class="wt-grid">${admissionCatalogueIndex(false)}</div><nav class="wt-links" aria-label="Ressources"><a href="/provisioning/project-runtime">Provisionnement</a><a href="/guide/cug-grt">Guide des routes</a></nav>
      <aside class="wt-notice"><strong>La navigation ne délivre aucun droit.</strong><p>Ces pages expliquent le parcours. Elles ne créent pas de dépôt, ne délivrent pas de jeton et n’ouvrent pas de session MCP.</p></aside>`));
  });
  const detail = (p: typeof paths[number]): RequestHandler => (_req, res) => {
    const state = p.slug === 'cug'
      ? `<aside class="wt-notice"><strong>${cugEntryEnabled() ? 'Route d’admission activée' : 'Route d’admission indisponible'}</strong><p>Cette indication ne vérifie ni l’installation CUG, ni le profil OAuth, ni les droits sur un dépôt.</p></aside>`
      : '';
    res.type('html').send(consoleDocument(p.title + ' · WealthTech MCP',
      `<a href="/admissions">← Tous les parcours</a><h1>${p.title}</h1><p class="wt-copy">${p.description}</p>${state}
      <ol class="wt-grid wt-flow" role="list">${p.steps.map(([title, description], index) => `<li class="wt-card"><span class="wt-step" aria-hidden="true">${index + 1}</span><h2>${title}</h2><p>${description}</p></li>`).join('')}</ol>
      <div class="wt-links">${p.next}<a href="/guide/cug-grt">Consulter le guide</a></div>`));
  };
  router.get('/admissions/cug', secure, requireWebLogin, detail(paths[0]));
  router.get('/admissions/grt', secure, requireWebLogin, detail(paths[1]));
  router.get('/admissions/historique', secure, requireWebLogin, detail(paths[2]));
  router.get('/admissions/:catalogId', (req, _res, next) => {
    const id = req.params.catalogId;
    if (typeof id === 'string' && findAdmission(id)) next();
    else next('route');
  }, secure, requireWebLogin, (req, res, next) => {
    const id = req.params.catalogId;
    const entry = typeof id === 'string' ? findAdmission(id) : undefined;
    if (!entry) { next(); return; }
    res.type('html').send(consoleDocument(entry.title + ' · WealthTech MCP',
      `<a href="/admissions">← Tous les parcours</a><h1>${entry.title}</h1>${admissionDetails(entry)}`));
  });
  return router;
}
