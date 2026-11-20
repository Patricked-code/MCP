// Presentation only. Operational handlers, OAuth and authorization remain the authorities.
type Availability = 'AVAILABLE' | 'CONDITIONAL' | 'UNVERIFIED' | 'NOT_SUPPORTED';
type Family = 'Connexion' | 'Dépôts et preuves' | 'Travail gouverné' | 'Événements et compatibilité';
type Entry = Readonly<{
  id: string;
  title: string;
  family: Family;
  availability: Availability;
  transport: string;
  identity: string;
  prerequisite: string;
  steps: readonly string[];
  action?: { href: string; title: string };
}>;

export const admissionCatalogue: readonly Entry[] = [
  {
    id: 'chatgpt', title: 'Connecter ChatGPT', family: 'Connexion', availability: 'CONDITIONAL',
    transport: 'Streamable HTTP sur https://mcp.wealthtechinnovations.com/mcp',
    identity: 'Client ChatGPT et jeton MCP temporaire délivré par OAuth Authorization Code + PKCE S256.',
    prerequisite: 'Un connecteur MCP distant configuré côté ChatGPT et un opérateur autorisé. Les écrans du client dépendent de son environnement.',
    steps: [
      'Configurer l’URL MCP dans ChatGPT et démarrer la connexion depuis le client.',
      'Le client découvre les métadonnées OAuth et initie le flux PKCE. Se connecter sur la page WealthTech, vérifier le client et les droits demandés, puis autoriser ou refuser.',
      'De retour dans ChatGPT, lancer ping. Un transport authentifié n’ouvre ni ne reprend automatiquement un chantier.'
    ],
    action: { href: '/guide/cug-grt/chatgpt', title: 'Ouvrir la fiche ChatGPT' }
  },
  {
    id: 'claude', title: 'Connecter Claude', family: 'Connexion', availability: 'CONDITIONAL',
    transport: 'Client MCP distant compatible Streamable HTTP, sur /mcp.',
    identity: 'OAuth Authorization Code + PKCE, sur le même serveur que pour ChatGPT.',
    prerequisite: 'Le code accepte les alias de ressource du client. La compatibilité de l’interface et la connexion d’une installation réelle restent à vérifier.',
    steps: [
      'Configurer https://mcp.wealthtechinnovations.com/mcp dans le client distant.',
      'Laisser le client conduire OAuth et vérifier le consentement WealthTech. Ne pas réutiliser un code ou une URL de retour d’un autre client.',
      'Confirmer la connexion par ping avant de sélectionner un projet.'
    ],
    action: { href: '/guide/cug-grt/claude', title: 'Ouvrir la fiche Claude' }
  },
  {
    id: 'client-http', title: 'Connecter un autre client MCP', family: 'Connexion', availability: 'AVAILABLE',
    transport: 'Streamable HTTP sur /mcp. GET, POST et DELETE du même transport.',
    identity: 'OAuth compatible PKCE ou Bearer historique selon le client et les règles serveur.',
    prerequisite: 'Client compatible Streamable HTTP et authentification valide. La présence de réponses event-stream sur /mcp ne crée pas une route SSE héritée.',
    steps: ['Configurer https://mcp.wealthtechinnovations.com/mcp.', 'Négocier initialize, puis vérifier ping. L’identifiant de transport ne vaut pas identifiant de session gouvernée.'],
    action: { href: '/guide/cug-grt/client-mcp', title: 'Consulter la fiche du transport' }
  },
  {
    id: 'bearer', title: 'Utiliser le Bearer historique', family: 'Connexion', availability: 'CONDITIONAL',
    transport: 'Streamable HTTP sur /mcp avec en-tête Authorization.',
    identity: 'Jeton partagé historique. Le middleware attribue mcp:read et ne prouve pas un principal individuel.',
    prerequisite: 'Script ou client interne déjà autorisé à utiliser ce secret. Ne pas mettre de jeton dans un lien, un formulaire de cette console ou un journal.',
    steps: ['Utiliser le mécanisme de secrets du client pour l’en-tête Authorization.', 'Vérifier ping. Pour une admission individuelle, choisir la voie OAuth reconnue.'],
    action: { href: '/guide/cug-grt/bearer', title: 'Ouvrir la fiche du Bearer' }
  },
  {
    id: 'codex', title: 'Configurer Codex comme client distant', family: 'Connexion', availability: 'UNVERIFIED',
    transport: 'Interface de client MCP distant lorsqu’elle est disponible.',
    identity: 'OAuth ou configuration serveur reconnue par le client, sans mode Codex distinct sur ce serveur.',
    prerequisite: 'Vérifier la compatibilité Streamable HTTP et le mécanisme d’authentification dans l’environnement Codex concerné.',
    steps: ['Consulter la fiche du transport et tester ping depuis le client effectivement configuré.'],
    action: { href: '/admissions/client-http', title: 'Voir le transport supporté' }
  },
  {
    id: 'web', title: 'Ouvrir la console web', family: 'Connexion', availability: 'AVAILABLE',
    transport: 'Navigateur, /login puis /dashboard.',
    identity: 'Session web WealthTech, distincte d’un transport MCP et d’une installation GitHub App.',
    prerequisite: 'Accès opérateur à la console. Une session web ne valide pas un profil CUG.',
    steps: ['S’authentifier dans la console.', 'Choisir le projet et l’objectif. Les pages protégées appliquent leurs propres contrôles.'],
    action: { href: '/dashboard', title: 'Ouvrir le tableau de bord' }
  },
  {
    id: 'github', title: 'Rattacher un compte GitHub à la console', family: 'Connexion', availability: 'CONDITIONAL',
    transport: 'Interface web existante /github et registre /git.',
    identity: 'Session web et accès GitHub vérifié, distincts du CUG GitHub App.',
    prerequisite: 'Droits réels sur le compte et consentements de la page historique.',
    steps: ['Consulter le statut puis ouvrir la page GitHub existante.', 'Vérifier le compte et les autorisations avant de consentir à une opération.'],
    action: { href: '/github', title: 'Ouvrir la connexion GitHub existante' }
  },
  {
    id: 'cug', title: 'Admettre une identité OAuth CUG', family: 'Dépôts et preuves', availability: 'CONDITIONAL',
    transport: 'MCP authentifié puis lien temporaire vers /repo-template/auth.',
    identity: 'Profil OAuth CUG, même jeton que l’appel d’origine, compte et installation GitHub App vérifiés.',
    prerequisite: 'Entrée CUG activée, profil protégé et installation autorisée. Une configuration ChatGPT OAuth ne suffit pas.',
    steps: ['Appeler mcp_start_governed_request_auth depuis le client habilité.', 'Ouvrir le lien retourné par l’outil et sélectionner uniquement un compte proposé.'],
    action: { href: '/guide/cug-grt/oauth', title: 'Consulter le guide CUG' }
  },
  {
    id: 'grt', title: 'Créer ou reprendre un dossier GRT', family: 'Dépôts et preuves', availability: 'CONDITIONAL',
    transport: 'Admission CUG, questionnaire existant et outils MCP de reprise.',
    identity: 'Dossier corrélé au compte et à l’installation déjà admis.',
    prerequisite: 'Pour une création, consentements distincts et autorisation effective du plan GRT.',
    steps: ['Créer via le questionnaire et le POST /repo-template/auth/submit uniquement après vérifications.', 'Pour une reprise, utiliser le dossier existant. Une transmission ne prouve pas une création.'],
    action: { href: '/guide/cug-grt/grt', title: 'Consulter le guide GRT' }
  },
  {
    id: 'adoption', title: 'Adopter un dépôt GitHub existant', family: 'Dépôts et preuves', availability: 'CONDITIONAL',
    transport: 'Parcours du dépôt Governed-Repository-Template, distinct du POST de création CUG.',
    identity: 'Propriétaire ou opérateur admis sur le dépôt que l’on conserve.',
    prerequisite: 'Le workflow d’adoption est versionné côté GRT. Aucun déclencheur web d’adoption n’est attesté dans cette console MCP.',
    steps: ['Choisir le parcours GRT ADOPT_EXISTING_REPOSITORY et vérifier la cible et sa gouvernance.', 'Ne pas soumettre le formulaire CUG de création pour adopter un dépôt existant.'],
    action: { href: 'https://github.com/chainsolutions-wealthtech/Governed-Repository-Template', title: 'Consulter le dépôt GRT' }
  },
  {
    id: 'grgs', title: 'Lire les checkpoints et preuves GRGS', family: 'Dépôts et preuves', availability: 'CONDITIONAL',
    transport: 'Cockpit CUG admis ou outil mcp_resume_grt_repository_creation.',
    identity: 'Compte et dépôt corrélés au dossier et au transfert GRT.',
    prerequisite: 'Dossier autorisé, preuve de corrélation et autorisations de lecture.',
    steps: ['Consulter le dossier de reprise ou le cockpit de preuves après admission.', 'Distinguer dossier central, dépôt observé, checkpoint local, reçu et classification.'],
    action: { href: '/guide/cug-grt/grgs', title: 'Consulter le guide des preuves' }
  },
  {
    id: 'sessions', title: 'Ouvrir ou reprendre une session gouvernée', family: 'Travail gouverné', availability: 'CONDITIONAL',
    transport: 'Outils MCP mcp_open_governed_session et mcp_resume_governed_session.',
    identity: 'Acteur prouvé, transport courant et périmètre de projet.',
    prerequisite: 'Mécanisme de session activé et garde-fous de rattachement satisfaits.',
    steps: ['Ouvrir ou reprendre explicitement dans le client MCP.', 'Vérifier la session, la cible et le reçu exigé avant les opérations gouvernées.'],
    action: { href: '/guide/cug-grt/continuity', title: 'Consulter le guide de continuité' }
  },
  {
    id: 'e2', title: 'Réconcilier et choisir un chantier E2', family: 'Travail gouverné', availability: 'CONDITIONAL',
    transport: 'Outils MCP E2 existants.',
    identity: 'Acteur et choix du propriétaire bornés au chantier.',
    prerequisite: 'État live réconcilié et autorisation requise. La préparation n’autorise pas une activation.',
    steps: ['Lire mcp_e2_reconcile_preflight et mcp_e2_list_continuities.', 'Vérifier le chantier puis utiliser mcp_e2_select_chantier et, le cas échéant, mcp_e2_recover_continuity.']
  },
  {
    id: 'agents', title: 'Admettre un agent sur une tâche', family: 'Travail gouverné', availability: 'CONDITIONAL',
    transport: 'MCP et file gouvernée, notamment mcp_get_work_queue et mcp_claim_next_governed_task.',
    identity: 'Agent rattaché à une session et à une cible autorisée.',
    prerequisite: 'Tâche qualifiée, propriétaire, dépendances, reçu et garde-fous existants.',
    steps: ['Observer la file et la continuité avant toute prise en charge.', 'Revendication ou lancement uniquement via les outils autorisés, jamais par cette page.'],
    action: { href: '/guide/cug-grt/agents', title: 'Consulter le guide des agents' }
  },
  {
    id: 'provisioning', title: 'Préparer le provisionnement S1', family: 'Travail gouverné', availability: 'CONDITIONAL',
    transport: 'Interface existante /provisioning/project-runtime.',
    identity: 'Session web et, pour l’action, consentement et autorisations spécifiques.',
    prerequisite: 'Cible autorisée, préflight et contrôles de la version déployée.',
    steps: ['Lire les cibles et le statut avant toute opération.', 'Ne pas déduire un droit S1 ou Plesk de l’accès au guide ou de l’admission CUG.'],
    action: { href: '/provisioning/project-runtime', title: 'Ouvrir le parcours existant' }
  },
  {
    id: 'github-first', title: 'Entrer par GitHub-first et retrouver le dossier', family: 'Travail gouverné', availability: 'CONDITIONAL',
    transport: 'Connexion GitHub autorisée, puis réconciliation avec MCP si le service est joignable.',
    identity: 'Identité GitHub observée, distincte d’un principal OAuth MCP.',
    prerequisite: 'Identifier le dépôt et lire les règles d’arrivée. Le choix nouveau ou reprise reste explicite.',
    steps: ['Ouvrir le dépôt, lire les autorités et vérifier la branche.', 'Rapprocher la continuité et les preuves. GitHub seul n’ouvre ni session ni droit MCP.']
  },
  {
    id: 'plesk', title: 'Préparer un sous-domaine Plesk', family: 'Travail gouverné', availability: 'CONDITIONAL',
    transport: 'Interface /provisioning/plesk-subdomain pour une cible complète et précise.',
    identity: 'Session opérateur et consentement lié à la cible. Preuve de liaison MCP OAuth si exigée.',
    prerequisite: 'Autorisation du serveur, préflight et capacité opérateur réellement active.',
    steps: ['Présenter le serveur, le domaine parent, le label et le répertoire dans le parcours gouverné existant.', 'Vérifier le plan avant de confirmer le FQDN. Cette fiche ne fournit aucun lien prérempli vers une écriture.']
  },
  {
    id: 'historique', title: 'Consulter le pilote historique', family: 'Travail gouverné', availability: 'CONDITIONAL',
    transport: 'GET /gouvern et POST /gouvern/deploy pour l’action consentie existante.',
    identity: 'Session opérateur du pilote, pas d’admission OAuth CUG.',
    prerequisite: 'Pilote activé et autorisations d’écriture si une préparation doit être lancée.',
    steps: ['Consulter la page protégée.', 'Une archive du pilote n’est ni un nouveau dépôt GRT ni un provisionnement Plesk.'],
    action: { href: '/gouvern', title: 'Ouvrir le pilote historique' }
  },
  {
    id: 'webhook', title: 'Recevoir un événement GitHub App', family: 'Événements et compatibilité', availability: 'CONDITIONAL',
    transport: 'POST /webhooks/github/cug, événement machine.',
    identity: 'Signature de livraison GitHub App, pas d’identité de connexion utilisateur.',
    prerequisite: 'Réception activée, signature valide et traitement borné au périmètre de l’installation.',
    steps: ['Consulter les preuves d’une livraison réelle via les circuits autorisés.', 'Un reçu ne prouve ni la couverture complète ni l’autorisation de créer.'],
    action: { href: '/guide/cug-grt/events', title: 'Consulter le guide des événements' }
  },
  {
    id: 'oidc-actions', title: 'Attester ou déployer via GitHub Actions', family: 'Événements et compatibilité', availability: 'CONDITIONAL',
    transport: 'Workflow MCP Governed Deploy. Routes existantes /deploy/github/s1/start et /deploy/github/s1/status/:jobId.',
    identity: 'Jeton OIDC GitHub Actions du workflow admis, lié au dépôt, à la référence et à la politique serveur.',
    prerequisite: 'Workflow et SHA autorisés, contrôles CI requis, pas d’usage de la session ou du jeton web.',
    steps: ['Suivre la CI et le workflow sur le SHA exact.', 'Pour une attestation, rapprocher job, révision du runtime et résultat. Le navigateur ne déclenche pas ces routes.']
  },
  {
    id: 'rest', title: 'API REST générique d’admission', family: 'Événements et compatibilité', availability: 'UNVERIFIED',
    transport: 'Aucune API REST générique d’admission ne ressort des routes examinées.',
    identity: 'Les règles des endpoints HTTP existants ne sont pas interchangeables.',
    prerequisite: 'Contrat opérationnel publié et autorisé avant de proposer ce mode comme une entrée.',
    steps: ['Utiliser un endpoint documenté pour son objectif et sa politique propre.']
  },
  {
    id: 'sse-legacy', title: 'SSE hérité sur une route séparée', family: 'Événements et compatibilité', availability: 'NOT_SUPPORTED',
    transport: 'Aucune route SSE héritée distincte montée dans cette version.',
    identity: 'Sans objet pour une route historique absente.',
    prerequisite: 'Client capable d’utiliser le transport Streamable HTTP actuel.',
    steps: ['Utiliser /mcp, dont le transport peut lui-même véhiculer du text/event-stream.']
  },
  {
    id: 'stdio', title: 'Démarrer un serveur MCP local en stdio', family: 'Événements et compatibilité', availability: 'NOT_SUPPORTED',
    transport: 'Le processus de ce dépôt lance un serveur HTTP, pas un transport stdio.',
    identity: 'Le mode stdio de certains autres serveurs ne s’applique pas ici.',
    prerequisite: 'Utiliser un client distant compatible avec ce service.',
    steps: ['Configurer /mcp comme serveur distant.']
  }
];

const labels: Record<Availability, string> = {
  AVAILABLE: 'Surface existante', CONDITIONAL: 'Conditionnel', UNVERIFIED: 'Non vérifié',
  NOT_SUPPORTED: 'Non proposé par ce serveur'
};
const order: readonly Family[] = ['Connexion', 'Dépôts et preuves', 'Travail gouverné', 'Événements et compatibilité'];
export const publicAdmissionIds = new Set(['chatgpt', 'claude', 'bearer']);
export const findAdmission = (id: string) => admissionCatalogue.find(item => item.id === id);

export function admissionCatalogueIndex(publicGuide: boolean) {
  return order.map(family => `<section class="admission-family"><h3>${family}</h3>
    <ul>${admissionCatalogue.filter(entry => entry.family === family).map(entry => `<li>
      <a href="/admissions/${entry.id}">${entry.title}</a> · <strong>${labels[entry.availability]}</strong>${
        publicGuide && publicAdmissionIds.has(entry.id) ? ` · <a href="/guide/cug-grt/${entry.id}">Fiche publique</a>` : ''
      }</li>`).join('')}</ul></section>`).join('');
}

export function admissionDetails(entry: Entry, publicGuide = false) {
  return `<section aria-label="Informations du parcours">
    <p><strong>${labels[entry.availability]}</strong> <code>${entry.availability}</code></p>
    <dl><dt>Transport</dt><dd>${entry.transport}</dd><dt>Identité</dt><dd>${entry.identity}</dd><dt>Prérequis</dt><dd>${entry.prerequisite}</dd></dl>
    <h2>Étapes</h2><ol>${entry.steps.map(step => `<li>${step}</li>`).join('')}</ol>
    <p>Aucune autorisation ni écriture n’est déclenchée depuis cette fiche.</p>
    ${entry.action && !publicGuide ? `<p><a href="${entry.action.href}">${entry.action.title}</a></p>` : ''}
  </section>`;
}
