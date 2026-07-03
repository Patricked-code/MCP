# LOOP_ENGINEERING_WEALTHTECH_PLAYBOOK_COMPLET_20260702

Date UTC : 2026-07-02T16:42:39.939990+00:00
Mode : document de pilotage consolide, aucune action production executee.

## 1. Mission
Ce playbook transforme toutes les memoires, prompts, reponses compilees, rapports, documents Word, fichiers locaux et etats serveur disponibles en plan operationnel durable pour l ecosysteme WealthTech. Il doit etre lu avant toute nouvelle boucle.

Objectif final : construire un ecosysteme WealthTech unifie, documente, auditable et evolutif, en preservant la production, en evitant les regressions, en gardant une memoire persistante et en permettant a Codex/agents/humains de reprendre exactement au bon endroit.

## 2. Sources et statut
| ID | Source | Chemins | Statut |
|---|---|---|---|
| S-MEM | Memoire serveur/canonique | `/root/wealthtech_project_memory/memory/`<br>`/opt/apps/wealthtech-mcp-ssh-bridge/memory/` | lu et integre |
| S-DOCX-LOOP | Loop Engineering Instructions.docx | `C:/Users/.../Downloads/Loop Engineering Instructions.docx`<br>`memory/LOOP_ENGINEERING_INSTRUCTIONS_DOCX_EXTRACT_20260702.md` | 669 paragraphes extraits |
| S-REPORTS | Rapports A/A2/A3 et inventaires | `/root/wealthtech_project_memory/reports/`<br>`/root/wealthtech_project_memory/state/` | lus et integres |
| S-DOCS-AGENTS | Docs et agents serveur | `/root/wealthtech_project_memory/docs/`<br>`/root/wealthtech_project_memory/agents/` | 20 docs + 9 agents lus |
| S-LEGACY | Rapports legacy et inventaires locaux | `/root/wealthtech_audit_reports/`<br>`outputs/`<br>`work/*.tsv|*.txt` | 4 rapports, 16 raw, 144 observations HTTP, 6 locaux integres |
| S-CHAIN | Sources site ChainSolutions | `instrucion brut site web wealthtech.txt`<br>`Chatgpt creation site chainsolutions.docx` | besoin SSR/SEO extrait, 688 paragraphes |
| S-WORKSPACE | Workspace local WealthTech | `Documents/GLOBAL (1)/wealthtech-workspace` | 14 markdown + 4 scripts indexes |
| S-EXTERNAL | Conversation ChatGPT partagee | `https://chatgpt.com/share/6a448c60-5794-83ed-8558-f1f4871748e5` | referencee, transcript brut non accessible sans export |

## 3. Regles absolues
- Lire memoire, point de reprise et fichiers metier avant action lourde.
- Ne jamais supprimer sans inventaire, matrice et validation explicite.
- Ne jamais modifier les domaines proteges S2 ni supprimer les originaux Stablecoin S2.
- Ne jamais afficher/copier/pousser secrets, .env, tokens, cles, dumps ou backups sensibles.
- Ne jamais build/restart/migrer/transactionner/push Git sans validation si impact possible.
- Toujours tester apres modification, puis documenter et mettre a jour le point de reprise.
- Si contradiction documentaire: noter la contradiction, choisir la source la plus recente/probante, documenter la decision.
- Les sources historiques ne remplacent pas un audit courant avant action production.

## 4. Etat courant prouve
- S1 `crazy-mendel` accessible via SSH direct: `root@212.227.212.33`.
- S2 `priceless-mayer` accessible via cle MCP depuis S1: `root@217.160.249.254`.
- Depot MCP: `/opt/apps/wealthtech-mcp-ssh-bridge`, GitHub main aligne au commit precedent `cfaa9cd...`; nouveaux fichiers 20260702 non commit/push.
- Memoire canonique active: `/opt/apps/wealthtech-mcp-ssh-bridge/memory/`; copie serveur: `/root/wealthtech_project_memory/memory/`.
- Synchronisation automatique peut ecraser la copie serveur tant que les ajouts 20260702 ne sont pas pousses sur GitHub.
- Site principal WealthTech courant: `wealthtechinnovations.com` sur S1, docroot `/var/www/vhosts/wealthtechinnovations.com/httpdocs/production/.nuxt`, stack Nuxt/Vue build production.
- Alias associe a confirmer: `wealthtechinnovation.com` vers `/var/www/vhosts/wealthtechinnovation.com/httpdocs/wti_test/.nuxt`.
- S2 porte FundAfrica/OPCVM/Stablecoin/ChainSolutions et doit etre traite comme source sensible.
- Conversation ChatGPT externe partagee referencee mais transcript brut non accessible sans export/copie authentifiee.

## 5. Ordre de reprise standard
1. Lire `LOOPBACK_WEALTHTECH_CURRENT.md` puis `SUIVI_MEMORY.md`.
2. Lire ce playbook complet et le fichier d integration correspondant au track vise.
3. Verifier Git MCP et si les fichiers 20260702 sont persistants sur GitHub.
4. Verifier S1/S2 en lecture seule.
5. Identifier track, objectif, domaine, serveur, application et risques.
6. Produire ou relire plan de boucle avec tests/rollback/livrables.
7. Executer uniquement l action validee.
8. Tester, documenter, mettre a jour et preparer la boucle suivante.

## 6. Roadmap multi-tracks
### F0 - Persistance memoire MCP/GitHub
- Priorite : 0
- Objectif : Rendre durables les fichiers de memoire 20260702 dans GitHub pour eviter que la synchronisation automatique ne les ecrase.
- Preconditions : Validation explicite commit/push utilisateur; git diff --check OK; scan secrets cible OK; review de la liste des fichiers stages
- Actions :
  - stager uniquement memory/*.md et manifest lies au Loop Engineering
  - executer check-docs.mjs
  - executer check-no-secrets cible; documenter faux positifs globaux .env/keys existants
  - commit chore(memory): consolidate WealthTech loop engineering playbook
  - push origin main
  - creer rapport push hors depot
  - mettre a jour loop_state.json
- Livrables : commit GitHub MCP; rapport /root/wealthtech_project_memory/reports/mcp_memory_playbook_push_*.md; loop_state phase memory_playbook_pushed
- Gates : ne pas inclure keys/ ou .env; ne pas inclure wealthtech_project_memory/memory secondaire; pas de push sans validation explicite

### A4 - Refonte/preproduction site principal WealthTech
- Priorite : 1
- Objectif : Preparer la refonte de wealthtechinnovations.com sans casser la production actuelle Nuxt/Vue.
- Preconditions : A/A2/A3 lus; docroot production connu; alias wealthtechinnovation.com compris; aucun build/restart prod
- Actions :
  - definir preproduction V2 ou dossier non expose
  - cartographier assets/contenus existants
  - decider stack cible
  - definir SEO/pages/modules a relier
  - proposer plan rollback
  - preparer tests HTTP/HTTPS/visuels
- Livrables : AUDIT_SITE_PRINCIPAL_WEALTHTECH_A4_STRATEGIE_*.md; state/site_principal_refonte_strategy_a4.json; matrice prod/preprod/alias
- Gates : aucun changement docroot prod; aucun restart Apache/Nginx/Plesk; aucune modification DNS sans validation

### B1 - Stablecoin E-WARI 6BI-B
- Priorite : 2
- Objectif : Auditer les regles metier wallet/relayer/abonnement/roles/commission/quota sans transaction.
- Preconditions : route vraie /profil/wallet/; ignorer /profil/portefeuille/; handoff stablecoin lu; aucun secret affiche
- Actions :
  - auditer frontend wallet
  - auditer API metaTransfer
  - cartographier roles/autorisations/abonnements
  - verifier commissions/quota/plafonds
  - verifier logs sans valeurs sensibles
  - produire decision pre-transaction
- Livrables : rapport 6BI-B; state/stablecoin_6bib_audit.json; liste risques avant transaction utilisateur
- Gates : aucune transaction blockchain; aucun affichage .env/tokens; ne jamais supprimer originaux S2

### C1 - FundAfrica / OPCVM / Chainsolutions metier
- Priorite : 3
- Objectif : Auditer FundAfrica/OPCVM, workers, bases, pdfsvc/xlsconv et dependances sans regression.
- Preconditions : S2 accessible; PM2/Docker lus seulement; domains chainsolutions proteges
- Actions :
  - mapper api-monolith/fundafrique-frontend/workers
  - identifier bases/tables sans dump sensible
  - mapper services pdf/xls
  - tester endpoints publics non destructifs
  - lister risques et chemins de migration future
- Livrables : rapport OPCVM/FundAfrica C1; state/fundafrica_opcvm_audit.json
- Gates : aucun restart PM2/Docker; aucune migration base; ne pas casser chainsolutions.fr

### E1 - Matrice nettoyage S1/S2
- Priorite : 4
- Objectif : Preparer le nettoyage serveur sans supprimer, avec tailles, dependances, classification et validation.
- Preconditions : inventaires S1/S2 a jour; domaines proteges connus; mesure disque avant
- Actions :
  - lister tailles backups/logs/caches/node_modules/builds
  - lier chaque dossier a domaine/process/base
  - classer garder/migrer/supprimer_plus_tard/doute
  - prioriser risques disque S2
  - preparer rollback/sauvegarde si necessaire
- Livrables : MATRICE_NETTOYAGE_S1_S2_E1_*.md; state/cleanup_matrix_e1.json
- Gates : aucun rm/mv; validation explicite avant nettoyage; si doute classer doute

### D1 - Migration WealthTech S2 -> S1 V2
- Priorite : 5
- Objectif : Preparer migration wealthtech.chainsolutions.fr vers V2.wealthtechinnovations.com apres A4/E1.
- Preconditions : source et destination verifiees; backup/GitHub sans secrets; destination prete; plan rollback
- Actions :
  - inventaire source complet
  - git status/remote
  - creer .env.example
  - push code sans secrets si valide
  - preparer destination
  - tester preprod
  - documenter migration
- Livrables : plan migration D1; repo GitHub ou rapport si repo absent; tests preprod
- Gates : pas de modification source S2 protegee; pas de secret GitHub; pas de cutover sans validation

### G1 - Architecture ecosysteme unifie
- Priorite : 6
- Objectif : Consolider les modules WealthTech en architecture cible modulaire sans fusion brutale.
- Preconditions : A/B/C/D inventories suffisants; bases cartographiees; risques connus
- Actions :
  - definir modules backend
  - definir modele donnees commun
  - decider Redis/ClickHouse/workers
  - definir observabilite/audit logs
  - definir trajectoire Docker puis Kubernetes futur
- Livrables : ARCHITECTURE_CIBLE_WEALTHTECH_G1.md; DATABASE_TARGET_MODEL_G1.md; DOCKER_COMPOSE_TARGET_G1.md
- Gates : pas de fusion base sans audit; Kubernetes reporte; compatibilite modules existants

### H1 - Site corporate ChainSolutions
- Priorite : 7
- Objectif : Transformer le besoin ChainSolutions SSR/SEO-first en backlog et architecture avant implementation.
- Preconditions : clarifier si chainsolutions.fr prod actuelle doit etre conservee; ne pas casser domaines S2 proteges; valider stack/deploiement Google Cloud
- Actions :
  - rediger backlog pages/SEO/admin/blog/contact
  - definir modele donnees messages/articles/admin
  - definir sitemap/robots/schema.org
  - definir design system premium
  - planifier integration aux apps existantes
- Livrables : SPEC_SITE_CHAINSOLUTIONS_H1.md; BACKLOG_SITE_CHAINSOLUTIONS_H1.json; architecture Next.js SSR
- Gates : ne pas confondre avec wealthtechinnovations.com; pas de modification chainsolutions.fr sans validation; contenu riche par page obligatoire

### I1 - Inventaire GitHub global
- Priorite : 8
- Objectif : Synchroniser comptes/repositories GitHub, roles reels et liens aux projets serveur.
- Preconditions : choix acces GitHub: bridge gh ou connecteur GitHub; aucun secret; read-only initial
- Actions :
  - lister owner/repos
  - classer theme/statut
  - mapper repo->prod->domaine
  - identifier repos sans docs
  - preparer commits documentation par repo si valide
- Livrables : GITHUB_REPOSITORIES.md complete; PROJECTS_MAPPING.md complete; state/github_inventory.json
- Gates : pas de push sans validation; pas de clone en production; pas de token stocke

## 7. Decision de priorite actuelle
1. Priorite technique urgente: demander validation commit/push MCP des memoires 20260702 pour eviter l ecrasement par la synchronisation automatique.
2. Priorite produit apres persistance: A4 refonte/preproduction `wealthtechinnovations.com` sans toucher la production.
3. Audits metier a lancer ensuite ou en parallele documentaire: B1 Stablecoin 6BI-B, C1 FundAfrica/OPCVM.
4. Nettoyage: E1 matrice uniquement, aucune suppression.
5. Migrations: D1 apres A4/E1 et validation.

## 8. Matrice source -> track
- Loop Engineering Word -> Tous tracks, surtout F0/A4/E1/D1
- Memoires Stablecoin/Handoff/PROMPT_6BI_B -> B1
- PROMPT_OPCVM et rapports S2 -> C1
- A/A2/A3 -> A4
- Rapports legacy + TSV Niakra -> E1, A4, mapping historique
- Site ChainSolutions docx/txt -> H1
- Workspace local -> F0, I1, gouvernance globale

## 9. Definition de done par boucle
- rapport Markdown non vide
- etat JSON valide si utile
- tests cites avec resultats
- risques restants listes
- point de reprise mis a jour
- aucune action interdite hors validation
- Git status documente si repo implique
- prochaine action claire

## 10. Gaps restants
- transcript brut de la conversation ChatGPT externe non importe
- nouveaux fichiers memoire non commit/push
- inventaire GitHub global encore non realise dans ce cycle
- implementation/refonte/nettoyage/migration non demarres volontairement

<!-- TRACEABILITY_MATRIX_20260702_START -->
## Matrice de tracabilite - 2026-07-02

Nouvelle source de reprise : `memory/MATRICE_TRACABILITE_SOURCES_EXIGENCES_TRACKS_20260702.md`.

Cette matrice relie chaque source lue aux exigences consolidees et aux tracks F0/A4/B1/C1/E1/D1/G1/H1/I1. Elle doit etre utilisee pour verifier qu une action est couverte par une exigence et une preuve documentaire.

Limites maintenues : transcript brut ChatGPT externe manquant; memoires 20260702 non commit/push.
<!-- TRACEABILITY_MATRIX_20260702_END -->

<!-- FINAL_COMPLETION_AUDIT_20260702_START -->
## Audit final completude / readiness commit - 2026-07-02

Livrable : `memory/AUDIT_FINAL_COMPLETUDE_ET_READY_COMMIT_MCP_20260702.md`.

Verdict : les sources disponibles sont lues et integrees dans le Loop Engineering. Reste non prouve uniquement le transcript brut de la conversation ChatGPT externe, qui exige un export/copie authentifiee. Les fichiers 20260702 sont prets pour commit/push MCP mais exigent validation explicite.

Prochaine action sure : valider ou refuser le commit/push MCP des fichiers `memory/` listes dans l audit final.
<!-- FINAL_COMPLETION_AUDIT_20260702_END -->

<!-- CHATGPT_IMPORT_OAUTH_20260702_START -->
## Import conversation externe et OAuth MCP - 2026-07-02

Nouveaux livrables :
- `memory/GUIDE_IMPORT_CONVERSATION_CHATGPT_EXTERNE_20260702.md`
- `memory/INTEGRATION_OAUTH_CHATGPT_CLAUDE_GITHUB_MCP_20260702.md`

Decision : le transcript brut de la conversation ChatGPT partagee reste le seul contenu manquant. Son import exige un export/copie authentifiee et un scan secrets avant integration. Le document OAuth MCP confirme que l integration ChatGPT avancee necessiterait OAuth 2.1 futur; le MCP actuel reste en Bearer token statique/read-only-first.
<!-- CHATGPT_IMPORT_OAUTH_20260702_END -->

<!-- ROOT_ONLY_MEMORY_PLAYBOOK_ADDENDUM_20260702_START -->
## Addendum - Memoire /root-only importee

La boucle doit maintenant considerer comme sources canoniques les 5 fichiers anciennement presents seulement dans `/root/wealthtech_project_memory/memory/`. Impact principal : le track B1 Stablecoin doit couvrir explicitement WITTI Finances, dossier BCEAO/monnaie electronique, livre blanc, architecture, wallet, smart contract et OPCVM tokenises. Le track F0 doit maintenir la regle : secrets uniquement dans `.env` serveur, jamais dans GitHub.
<!-- ROOT_ONLY_MEMORY_PLAYBOOK_ADDENDUM_20260702_END -->
