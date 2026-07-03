# LOOP_ENGINEERING_WEALTHTECH_MASTER_PLAN_20260702

Ce plan consolide les memoires, prompts, rapports A/A2/A3, le document Word `Loop Engineering Instructions.docx`, la piece jointe terminal et les etats JSON disponibles au 2026-07-02.

## Objectif final
Construire un ecosysteme WealthTech unifie, documente, auditable et evolutif, sans recommencer de zero a chaque session IA. La boucle doit permettre de consolider le site principal, les modules metier, les migrations S2 vers S1, la securite, GitHub, Docker, les bases, Stablecoin, OPCVM/FundAfrica et les futures evolutions microservices.

## Regles absolues
- Lire la memoire avant toute action lourde.
- Ne jamais supprimer sans inventaire et validation explicite.
- Ne jamais modifier les domaines proteges S2.
- Ne jamais supprimer les originaux Stablecoin sur S2.
- Ne jamais pousser de secrets, .env, dumps, backups ou node_modules sur GitHub.
- Ne jamais envoyer de transaction blockchain sans validation explicite.
- Ne pas build, restart, migrer, nettoyer ou pousser Git sans validation explicite quand le risque est non nul.
- Toujours tester et documenter apres intervention.
- Toujours maintenir le point de reprise courant.
- En cas de contradiction documentaire, documenter la contradiction puis proposer une decision avant action.

## Serveurs
### S1 - crazy-mendel
- Acces: `root@212.227.212.33`
- Role: serveur principal, destination des migrations, cible de consolidation et nettoyage prudent
- Domaines a conserver: `niakara.com`, `www.niakara.com`, `api.niakara.com`, `wealthtechinnovations.com`, `api.wealthtechinnovations.com`, `stablecoin.wealthtechinnovations.com`, `api.stablecoin.wealthtechinnovations.com`, `blockchain.wealthtechinnovations.com`, `tokenfactory.wealthtechinnovations.com`, `wealthtechinnovation.com`, `berebytours.com`
- Constats actuels:
  - Site principal recommande: wealthtechinnovations.com
  - Docroot actif detecte: /var/www/vhosts/wealthtechinnovations.com/httpdocs/production/.nuxt
  - Stack actuelle du site principal: Nuxt/Vue production build
  - Alias a confirmer: wealthtechinnovation.com -> /var/www/vhosts/wealthtechinnovation.com/httpdocs/wti_test/.nuxt
  - MCP wealthtech_ssh_bridge actif dans /opt/apps/wealthtech-mcp-ssh-bridge
  - api-niakara separe: /var/www/vhosts/niakara.com/api.niakara.com/server.js

### S2 - priceless-mayer
- Acces: `root@217.160.249.254`
- Role: serveur source, applications metier, migrations et nettoyage selectif sous protection stricte
- Domaines proteges: `africafunds.chainsolutions.fr`, `api.africafunds.chainsolutions.fr`, `api.stablecoin.chainsolutions.fr`, `stablecoin.chainsolutions.fr`, `brvm.chainsolutions.fr`, `bvmac.chainsolutions.fr`, `chainsolutions.fr`, `Funds.chainsolutions.fr`, `api.funds.chainsolutions.fr`
- Constats actuels:
  - FundAfrica/OPCVM porte par PM2 api-monolith, fundafrique-frontend et workers
  - Stablecoin S2 et relayer OpenZeppelin sont sensibles et ne doivent pas etre supprimes
  - Certains conteneurs sont unhealthy/restarting et doivent etre audites sans restart
  - Chainsolutions/FundAfrica/Stablecoin sont des applications metier liees, pas le site institutionnel principal

## Migrations prevues
| Source S2 | Destination S1 | Type |
|---|---|---|
| `wealthtech.chainsolutions.fr` | `V2.wealthtechinnovations.com` | migration WealthTech v2 |
| `evote.chainsolutions.fr` | `evote.wealthtechinnovations.com` | migration EVOTE frontend |
| `api.evote.chainsolutions.fr` | `api.evote.wealthtechinnovations.com` | migration EVOTE API |
| `itic4fima.chainsolutions.fr` | `evaluations.wealthtechinnovations.com` | migration formation/evaluations |
| `api.itic4fima.chainsolutions.fr` | `api.evaluations.wealthtechinnovations.com` | migration API formation/evaluations |
| `stablecoin.chainsolutions.fr` | `stablecoin.wealthtechinnovations.com` | copie Stablecoin uniquement, originaux S2 intouchables |
| `api.stablecoin.chainsolutions.fr` | `api.stablecoin.wealthtechinnovations.com` | copie API Stablecoin uniquement, originaux S2 intouchables |

## Nettoyage futur
- Nettoyage S1/S2 autorise seulement apres inventaire, matrice de decision, sauvegarde si necessaire, tests et validation explicite.
- En cas de doute: classer `doute/a_auditer_avant_decision`, ne pas supprimer.
- Candidats S2 apres inventaire: `api.pccet.wealthtechinnovations.ci`, `api.wealthtechinnovations.ci`, `evote.wealthtechinnovations.ci`, `pccet.wealthtechinnovations.ci`, `wealthtechinnovations.ci`, `opcvm.chainsolutions.fr`, `backups fantokenafrica.club/api/lysfc`, `iso20022.chainsolutions.fr`, `mutualfunds.chainsolutions.fr`, `robot.funds.chainsolutions.fr`, `api-mutualfunds.chainsolutions.fr`
- Candidats S1 apres inventaire: anciens domaines/sous-domaines non conserves, anciens builds, node_modules inutiles, caches/logs volumineux, archives/dumps/backups Plesk inutiles, anciennes apps Passenger, anciens processus PM2, projets non documentes

## Ordre de lecture obligatoire avant action
Lire en priorite les fichiers suivants quand ils existent dans le projet ou la memoire centrale:
`GPT.md`, `SUIVI.md`, `README.md`, `README_DEV.md`, `ROADMAP.md`, `TODO.md`, `TASKS.md`, `CODE_REVIEW.md`, `CHANGELOG.md`, `DEPLOYMENT_PRODUCTION.md`, `ARCHITECTURE.md`, `DATABASE.md`, `DOCKER.md`, `KUBERNETES_FUTURE.md`, `SECURITY.md`, `MONITORING.md`, `BACKUP_RESTORE.md`, `MIGRATION.md`, `AGENTS_ARCHITECTURE.md`, `AI_SKILLS.md`
Puis relire `# POINT DE REPRISE COURANT` dans `SUIVI.md` ou `SUIVI_MEMORY.md`.

## Boucle standard
1. Initialisation memoire
2. Comprehension objectif/serveur/domaine/module
3. Inventaire technique
4. Analyse des risques
5. Plan action avec tests et rollback
6. Execution controlee minimale
7. Tests non-regression
8. Documentation
9. Validation
10. Preparation reprise

## Tracks de travail
### Track A - Infrastructure S1/S2 et site principal
- Etat: A, A2, A3 realises en lecture seule
- Prochaine action: A4: strategie de refonte/preproduction pour wealthtechinnovations.com sans casser la production
- Gates: pas de modification prod; plan rollback; tests HTTP/HTTPS; cartographie docroot/vhosts/PM2/Docker

### Track B - Stablecoin E-WARI / 6BI-B
- Etat: memoire et handoff disponibles; transaction technique minimale deja validee dans le passe
- Prochaine action: audit metier pre-transaction Wallet / Relayer / Abonnement / Role / Commission, sans transaction
- Gates: route vraie /profil/wallet/; ignorer /profil/portefeuille/; aucune transaction; aucun secret affiche

### Track C - OPCVM / FundAfrica / Chainsolutions
- Etat: applications S2 identifiees et sensibles
- Prochaine action: audit non regressif des workflows FundAfrica/OPCVM, workers, bases et services pdf/xls
- Gates: aucun restart PM2/Docker; pas de migration avant inventaire bases; ne pas casser chainsolutions.fr

### Track D - Migrations vers S1
- Etat: sources/destinations definies, pas encore executees
- Prochaine action: preparer boucle migration WealthTech vers V2.wealthtechinnovations.com apres A4
- Gates: backup code; GitHub sans secrets; .env.example; tests destination; rollback

### Track E - Nettoyage serveur
- Etat: candidats listes, action reportee
- Prochaine action: produire matrice suppression/conservation avec tailles et dependances avant validation utilisateur
- Gates: mesure disque avant/apres; classification garder/migrer/supprimer/doute; validation explicite

### Track F - Memoire, GitHub et audit trail
- Etat: MCP pousse sur GitHub au commit cfaa9cd; sync memoire auto active
- Prochaine action: commit/push des nouveaux fichiers de consolidation uniquement apres validation utilisateur
- Gates: git diff --check; check-docs; check-no-secrets; rapport push hors depot

### Track G - Architecture cible unifiee
- Etat: doctrine definie dans DOCX et memoires
- Prochaine action: formaliser modules auth/users/kyc/wallet/stablecoin/payments/blockchain/tokenfactory/evote/training/reporting/audit/admin
- Gates: pas de fusion base sans audit; Redis/ClickHouse/Docker progressifs; Kubernetes seulement plus tard

## Prochaines boucles recommandees
1. A4 - Strategie de refonte preproduction site principal: rapport A4 + plan de preproduction V2 + tests de non-regression prod.
2. B1 - Audit metier Stablecoin 6BI-B sans transaction: rapport 6BI-B roles/abonnements/commissions/quotas/relayer.
3. C1 - Audit FundAfrica/OPCVM sans regression: cartographie PM2/workers/bases/services pdfsvc/xlsconv.
4. E1 - Matrice nettoyage S1/S2 avant validation: liste tailles/dependances/classification, aucune suppression.
5. D1 - Preparation migration WealthTech vers V2: plan migration, GitHub, .env.example, rollback, tests.

## Architecture cible
- Frontend commun, modules harmonises et design system progressif.
- Backend Node.js modulaire: auth, users, organizations, kyc, wallet, stablecoin, payments, blockchain, tokenfactory, evote, training, evaluations, notifications, reporting, audit, admin.
- Base commune ou etendue apres audit: users, roles, permissions, kyc_profiles, wallets, wallet_transactions, stablecoin_mint/burn/transfers, payment_orders, blockchain_transactions, smart_contracts, evote, training, audit_logs, settings.
- Redis pour queues/cache/workers; ClickHouse pour analytics/logs/reporting; Docker Compose d abord; Kubernetes seulement plus tard.

## Etat actuel integre
- MCP GitHub synchronise: commit `cfaa9cd91032c3a95a03a2a3870f0b7cb396a36a`.
- Rapport Track A: `/root/wealthtech_project_memory/reports/AUDIT_GLOBAL_S1_S2_TRACK_A_20260701_095456.md`.
- Rapport A2: `/root/wealthtech_project_memory/reports/AUDIT_SITE_PRINCIPAL_WEALTHTECH_A2_20260701_100358.md`.
- Rapport A3: `/root/wealthtech_project_memory/reports/AUDIT_SITE_PRINCIPAL_WEALTHTECH_A3_20260702_053646.md`.
- Etat machine inventaire: `/root/wealthtech_project_memory/state/app_inventory_s1_s2.json`.
- Etat site principal: `/root/wealthtech_project_memory/state/site_principal_map.json` et `/root/wealthtech_project_memory/state/site_principal_refonte_a3.json`.

## Gaps restants
- Import brut de la conversation externe ChatGPT partagee non realise: la page publique affiche seulement l interface de connexion dans cet environnement.
- Plusieurs fichiers de memoire sont compiles; ils doivent etre traites comme memoire operationnelle, pas comme archive exhaustive mot-a-mot.
- La refonte du site principal n a pas encore commence; seule la cartographie technique pre-refonte est faite.
- Aucun nettoyage ni migration effective ne doit demarrer avant matrice et validation.

## Definition de fin de boucle
Chaque boucle doit laisser un rapport, un etat machine si utile, un point de reprise clair, les tests effectues, les risques restants et la prochaine action. Si GitHub est implique, aucun push sans check secrets et validation explicite.

<!-- DOCS_AGENTS_INTEGRATION_20260702_START -->
## Integration docs/agents - 2026-07-02

Sources complementaires lues : `/root/wealthtech_project_memory/docs/` et `/root/wealthtech_project_memory/agents/`.

Conclusions :
- Les fichiers docs/ et agents/ existent et confirment les regles fondamentales : inventaire avant suppression, protection S2, pas de secrets, tests, documentation, point de reprise.
- Beaucoup de fichiers docs/agents sont encore generiques; ils servent de structure a enrichir a chaque boucle.
- `docs/SUIVI.md`, `docs/TASKS.md` et `docs/TODO.md` indiquent historiquement le nettoyage S2 et la migration WealthTech, mais les audits A/A2/A3 plus recents placent A4 comme prochaine boucle la plus coherente pour preparer la refonte du site principal sans casser la production.
- Le nettoyage S2 reste un risque operationnel important et doit etre traite par E1 matrice de nettoyage, sans suppression directe.

Decision de priorite : La priorite courante reste A4 refonte/preproduction du site principal, car A/A2/A3 ont etabli le contexte actuel et la production doit etre protegee avant refonte. Le nettoyage S2 reste important mais doit passer par E1 matrice tailles/dependances/validation, sans suppression directe.

Livrables complementaires :
- `memory/INTEGRATION_DOCS_AGENTS_LOOP_ENGINEERING_20260702.md`
- `memory/AUDIT_COMPLETUDE_OBJECTIF_LOOP_ENGINEERING_20260702.md`
- `/root/wealthtech_project_memory/state/loop_engineering_completion_audit_20260702.json`
<!-- DOCS_AGENTS_INTEGRATION_20260702_END -->

<!-- LEGACY_LOCAL_INTEGRATION_20260702_START -->
## Integration rapports legacy et locaux - 2026-07-02

Sources ajoutees : anciens rapports `/root/wealthtech_audit_reports/audit_20260701_*`, fichiers bruts HTTP/SSH/MCP, rapports locaux `outputs/` et inventaires TSV/TXT du workspace.

Conclusions :
- Les rapports legacy confirment les domaines S1 a conserver, les domaines S2 proteges, les migrations prevues et la doctrine non destructive.
- Les observations HTTP legacy sont utiles comme historique, mais les audits A/A2/A3 restent plus recents pour le site principal.
- Le rapport local Niakra documente des actions historiques sur `niakara.com`/`api.niakara.com` et des desactivations Passenger sur domaines vides/casses; cela doit etre traite comme historique, pas comme consigne de suppression.
- Les inventaires TSV locaux recensent 78 domaines/applications et appuient la future matrice E1 de nettoyage, sans suppression automatique.

Livrable : `memory/INTEGRATION_RAPPORTS_LEGACY_ET_LOCAUX_20260702.md`.
<!-- LEGACY_LOCAL_INTEGRATION_20260702_END -->

<!-- LOCAL_CHAINSOLUTIONS_SITE_20260702_START -->
## Sources locales site ChainSolutions - 2026-07-02

Sources ajoutees : `instrucion brut site web wealthtech.txt`, `Chatgpt creation site chainsolutions.docx`, template `CODEX_WEALTHTECH.md`, bootstrap workspace non destructif et index du script `lancer_audit_wealthtech_mcp.ps1`.

Apport :
- Definition d un futur site corporate `chainsolutions.fr` SSR/SEO-first en Next.js, distinct de `wealthtechinnovations.com`.
- Pages dediees pour BRVM Research PRO, Profil Investisseur UEMOA, Simulateur Epargne, Parcours Epargnant UEMOA, Funds/OPCVM Afrique.
- Formulaire contact, stockage base, notification email, panel superadmin, blog administrable.
- Exigences SEO : sitemap, robots, canonical `https://chainsolutions.fr`, schema.org, contenus riches par page.
- Track ajoute : H - Site corporate ChainSolutions, a planifier sans toucher les domaines S2 proteges.

Livrable : `memory/INTEGRATION_SOURCES_LOCALES_SITE_CHAINSOLUTIONS_20260702.md`.
<!-- LOCAL_CHAINSOLUTIONS_SITE_20260702_END -->

<!-- LOCAL_WORKSPACE_CONTROL_20260702_START -->
## Workspace local WealthTech - 2026-07-02

Sources ajoutees : documents Markdown du workspace local `wealthtech-workspace` et scripts MCP locaux indexes par lignes clefs.

Apport :
- Centre de pilotage non destructif avec cible future `/opt/wealthtech-workspace` et `/opt/server-projects-inventory`.
- Phases : pre-vol, inventaire GitHub, scan serveur, clones controles, mapping global, documentation/reprise.
- Regles securite confirmees : pas de suppression, pas de modification `.env`/Plesk/Docker/BDD/prod sans validation, pas de Git destructif/push non valide.
- Politique secrets : ne lister que les noms de variables, jamais les valeurs.
- Contradiction resolue : le workspace local indiquait bridge non connecte dans une ancienne session; l etat courant verifie ici confirme S1/S2 accessibles.

Livrable : `memory/INTEGRATION_WORKSPACE_LOCAL_WEALTHTECH_20260702.md`.
<!-- LOCAL_WORKSPACE_CONTROL_20260702_END -->

<!-- COMPLETE_PLAYBOOK_20260702_START -->
## Playbook complet - 2026-07-02

Le plan operationnel complet est maintenant dans `memory/LOOP_ENGINEERING_WEALTHTECH_PLAYBOOK_COMPLET_20260702.md`.

Decision de reprise :
1. Stabiliser la memoire par commit/push MCP apres validation explicite.
2. Lancer A4 refonte/preproduction `wealthtechinnovations.com` sans toucher la production.
3. Continuer les audits B1 Stablecoin 6BI-B, C1 FundAfrica/OPCVM, puis E1 matrice nettoyage.

Ce playbook devient la source de pilotage a lire apres `LOOPBACK_WEALTHTECH_CURRENT.md` et `SUIVI_MEMORY.md`.
<!-- COMPLETE_PLAYBOOK_20260702_END -->

<!-- TRACEABILITY_MATRIX_20260702_START -->
## Matrice de tracabilite - 2026-07-02

Nouvelle source de reprise : `memory/MATRICE_TRACABILITE_SOURCES_EXIGENCES_TRACKS_20260702.md`.

Cette matrice relie chaque source lue aux exigences consolidees et aux tracks F0/A4/B1/C1/E1/D1/G1/H1/I1. Elle doit etre utilisee pour verifier qu une action est couverte par une exigence et une preuve documentaire.

Limites maintenues : transcript brut ChatGPT externe manquant; memoires 20260702 non commit/push.
<!-- TRACEABILITY_MATRIX_20260702_END -->
