# WT-MCP-REGISTRY-RESOLUTION-20261121-01 — Plan d'intégration technique, de codage, tests et mise en production

> **Mission : résolution du problème des registres**\
> Dépôt initial : `Patricked-code/MCP`, entrée GitHub-first / E2.\
> **Type** : plan d'implémentation **non autoritaire**, à exécuter en incréments gouvernés.\
> Créé le 2026-11-21 ; première base : `main@5bc5e2b4c0b2aa176c1f6131826afbea7af2f164`.\
> **ATTENTION : E2 préflight** `BLOCKED/E2_DOCUMENTATION_DRIFT` à 2026-11-21T17:59Z ; pas de travail ordinaire ni de mutation runtime avant correction/revue. G1 correction existante : PR #429. Ce plan ne déclare aucun correctif exécuté.

## 0. Séquence universelle, sans régression ni autorité concurrente

`INTAKE → READ EXISTING → VERIFY G1/E2 → CLASSIFY AUTHORITY → MAP DEPENDENCIES → PLAN → TEST RED → ADDITIVE CODE → TEST GREEN → CI EXACT HEAD → INDEPENDENT REVIEW → GOVERNED MERGE → GOVERNED DEPLOY → ATTEST LIVE → DOCUMENT/CHECKPOINT → RECONCILE REGISTRIES`.

- **Ownership** : chaque branche, PR, fichier de travail, chantier et cible a un owner visible ; ne pas écraser le travail d'autres agents.
- **Interdits** : deuxième GitRegistry ou Task Queue ; promotion d'un reçu webhook en droit ; écriture implicite sur autres dépôts ; suppression ou migration destructrice ; secrets dans les documents ; `main` direct.
- **Déploiement MCP** vérifié dans `.github/workflows/mcp-deploy.yml` : GitHub Actions → OIDC → endpoint MCP → S1 / Docker Compose, **pas Kubernetes**. Kubernetes serait une migration indépendante, avec plan et preuves propres.
- **Chemin de travail** : PR #430 docs-only P01, suivie de PR additives fonctionnelles *après* résolution de G1, clôture de P01 et anti-collision. Toutes liées au même ID de continuité.
- **Source de vérité** : GitHub code et issues, GitRegistry/Project Binding pour mappings, Operational Memory pour travail et checkpoints, Governed Session/Lock pour ownership, CUG receipts pour événements, GRT pour admission, Live State pour runtime. L'index de fédération est entièrement **recalculable**.

## 1. Préflight et audit — P01/P02

| ID | Action et emplacement de preuve | Critère de sortie |
| --- | --- | --- |
| RG-001 | Confirmer `Patricked-code/MCP`, SHA GitHub main, S1 HEAD/origin, OCI revision, worktree, live state | Observation horodatée, distincte des anciens SHA |
| RG-002 | Comparer PR #429 (G1, PRODUCTION_STATE.json seulement), CI, revues et HEAD exact ; appliquer le circuit de fusion gouverné existant si réellement admissible | `DOCUMENTATION_DRIFT` disparaît et E2 préflight retourne ADMISSIBLE, sans contournement |
| RG-003 | Lire AGENTS/GPT/CLAUDE/SOURCE_OF_TRUTH, runbook E2, SUIVI/TODO/TASKS et PR en cours | Matrice d'autorités/collisions, versionnée |
| RG-004 | Diagnostiquer `GITHUB_CONTROL_ORG_NOT_ALLOWED` : `src/tools/githubControlPlaneRead.ts` et `src/tools/githubLifecycle.ts` utilisent `assertOrg(organization, configuredOrg)`; `configuredOrg = env.GITHUB_ORG`. Côté comptes durables, target owner = `chainsolutions-wealthtech`, alors que l'appel était `Patricked-code`. | Confirmer la configuration active exacte ; préserver l'allowlist et séparer identité du client, org cible et repo propriétaire. Aucun élargissement permissif |
| RG-005 | Énumérer/dédupliquer 17+31+25 dépôts accessibles, IDs GitHub stables, branches, visibilité, installation CUG, auth effective | Compteur unique + COVERED/PARTIAL/UNKNOWN ; aucun repo promu automatiquement |
| RG-006 | Lire GitRegistry V1/V2, `.mcp/server-map.json`, Project Binding, sessions, Program Backlog, TODO/TASKS de chaque repo **en lecture seule** | Relations vérifiables, statuts NONE/AMBIGUOUS/UNVERIFIED, chemins S1/S2 en preuve |
| RG-007 | Qualifier PR #389 (UID `WT-PROJECT-MCP-001` candidat), PR #401–#425 et autres travaux actifs | Aucun doublon de projet, autorité ni PR |

## 2. Projections et identifiants fédérés — P03

| ID | Action | Critère |
| --- | --- | --- |
| RG-008 | Introduire un **type de projection pure**, dans un nouveau module proche de `src/github/projectReality.ts`, pas un store | EntityRef : type, sourceAuthority, stableId, observedAt, sourceVersion/SHA, verificationState, evidenceRef |
| RG-009 | Définir des liens de provenance (project↔repo↔subproject↔workstream↔continuity↔task↔session↔blueprint↔PR↔checkpoint) | Relations typées, source horodatée, vérifiées, inconnues conservées |
| RG-010 | Normaliser par **ID GitHub stable** / ID source, pas par nom, conserver alias et anciens IDs | Rename/transfer sans changement d'identité ; collisions -> CONFLICT |
| RG-011 | Construire une projection par composition des **lecteurs existants** (GitRegistry, Operational Memory, Program Backlog, GitHub, CUG), bornée/paginée | Aucun droit de mutation ni copie autoritaire ; déclencheur de rafraîchissement contrôlé |
| RG-012 | Contrat d'accès du project scope et masquage, pagination/filtre/cursor stables | Aucun accès à un autre tenant/compte ; UNKNOWN != DENIED ni ALLOWED |

## 3. CUG → GitRegistry → intention → Governed Queue — P04/P05/P06

| ID | Action et positionnement | Critère |
| --- | --- | --- |
| RG-013 | Réutiliser `src/cug/webhook.ts` et `discoveryRegister.ts` (signature+receipt+idempotence), **sans modifier la sémantique 202/204/409/503** | Tous tests webhook historiques verts |
| RG-014 | Composer le consommateur existant `src/cug/receiptConsumer.ts` et le collecteur B2 ; observation GitHub fraîche sous l'installation CUG autorisée | Aucun signal non vérifié ne devient repository attesté |
| RG-015 | Rapprocher projet avec `src/github/registry.ts`, `registryV2.ts`, `projectResolution.ts`, `projectReality.ts` | Un mapping exact confirmé ou attente classifiée ; pas de création d'un deuxième registre |
| RG-016 | Admettre une *intention stable* d'après événement + scope + type + version/source, via l'autorité `mcp_reconcile_agent_intent` existante uniquement après authentification/session/permissions | Les événements informatifs restent observations ; les événements admissibles produisent au plus une tâche |
| RG-017 | Créer des références `deliveryId → projectId → intentKey → taskId` dans **la projection**, sans écrire directement les registres historiques | Rejouement identique 0 duplication ; mismatch -> CONFLICT |
| RG-018 | Raccorder `src/operationalMemory/taskQueue.ts` et `src/tools/governedTasks.ts` via interface autorisée, pas d'insertion arbitraire | `DISCOVERED/READY` selon règles existantes, aucun claim/lock/merge automatique |
| RG-019 | Afficher la tâche et sa provenance dans le suivi propre au projet/chantier, par projection et mise à jour contrôlée suivant la politique documentaire | TODO/TASKS par entité, pas de synchronisation réécrivant le texte d'autrui |
| RG-020 | Rattrapage/retry/partial failure/backpressure/renames et statut observé | Pas de reçu perdu, reprise idempotente, aucune mutation par événement mal formé |

## 4. Cibles multi-dépôts, norme documentaire — P07

| ID | Action | Critère |
| --- | --- | --- |
| RG-021 | Qualifier chaque TargetMappingId, GitRegistry V2 readiness et les IDs de projets par GitHub/serveur/credentials/rollback | Aucun `targetProjectIds` inventé, pas d'activation sur simple nom |
| RG-022 | Configurer `.mcp/server-map.json` **progressivement**, cible par cible, dans des PR séparées après preuve de scope, sans élargir l'admission globale | Cibles visibles mais jamais exécutables sans permissions |
| RG-023 | Brancher GRT/GRGS à l'admission documentaire et indexer README/AGENTS/CLAUDE/SUIVI/ROADMAP/TODO/TASKS/DECISIONS/ARCHITECTURE/CONTINUITY de chaque projet | Les fichiers restent dans leur repo et conservent leur autorité |
| RG-024 | Relier les travaux UAES/Loop aux intentions et dépendances **sans écriture dans leurs dépôts** dans cette mission initiale | Interopérabilité en lecture, pas d'usurpation d'agent |

## 5. Frontend cockpit — P08

| ID | Action | Critère |
| --- | --- | --- |
| RG-025 | Retrouver et réutiliser console existante dans `src/server.ts`, `src/web/consoleUi.ts`, `src/cug/page.ts`, capsule GRT | Navigation existante intacte ; pas de seconde SPA parallèle |
| RG-026 | Ajouter une page de cockpit *autorisée* alimentée seulement par la projection fédérée, avec filtres Global/Projet/Dépôt/Chantier | Résultats paginés, couverture et fraîcheur visibles ; accès refusé hors scope |
| RG-027 | Fiches projet affichant identité, composants, doc, dépendances, memory/checkpoints, tasks/PR/CI/deploy | Provenance chaque champ ; liens vers autorités existantes |
| RG-028 | Historique de tâches complet (READY/BLOCKED/CONFLICT/DONE/CANCELLED/SUPERSEDED), successeurs uniquement attestés | 21 tâches MCP historiques inchangées ; pas de disparition des états terminaux |
| RG-029 | Accessibilité clavier/ARIA, états vides, erreurs, redaction et XSS, consentement | Tests UI/contrôle d'accès/anti-fuite |

## 6. Vérification et production — P09

| ID | Étape | Obligation |
| --- | --- | --- |
| RG-030 | Tests RED puis GREEN unitaires et intégration | doubles livraisons, conflits d'IDs, droits, reprises, race/crash, old tasks, non-régression CUG |
| RG-031 | `npm run typecheck`, `npm run docs:check`, tests de sécurité/CI en workflows GitHub | Aucun échec nouveau, tous scripts requis verts |
| RG-032 | PR(s) incrémentales depuis branche propre ; revue indépendante sur HEAD exact, pas de collision avec #389/429 ou CUG concurrents | Preuves de diff, GH checks, règles de branche |
| RG-033 | Fusion gouvernée **uniquement si tous les gates passent** ; `main` CI, `MCP Governed Deploy` via OIDC, attestation runtime | GitHub/S1/OCI/runtime exact SHA healthy, rollback prêt |
| RG-034 | Reconciliation documentaire de fin, Live State, GitRegistry projection, sessions/checkpoints, cockpit | `FULLY_ALIGNED` attesté + couverture par projet, aucun drift |
| RG-035 | Clôture de mission et mémoire canonique rattachée à `WT-MCP-REGISTRY-RESOLUTION-20261121-01` | Verdict preuves PASS/BLOCKED, liste exhaustive des livrables, NEXT_ACTION=null seulement si mission réellement finie |

## 7. Premier diagnostic P02 confirmé dans le code (lecture seule)

- `src/tools/githubControlPlaneRead.ts` : `configuredOrg: env.GITHUB_ORG`, contrôle `assertOrg` exact.
- `src/tools/githubLifecycle.ts` : même garde `assertOrg` et WRITE gate distinct.
- `github_durable_accounts_status` a montré `defaultTargetOwner=chainsolutions-wealthtech` et le login authentifié `Patricked-code`.
- L'appel direct `github_get_repository_state({organization:"Patricked-code",repository:"MCP"})` du bridge a retourné `GITHUB_CONTROL_ORG_NOT_ALLOWED`. **Le refus est cohérent avec la garde configurée** ; ce n'est pas une preuve d'absence d'accès GitHub direct, déjà confirmé. Il faut contrôler l'instance/env avant d'envisager une évolution multi-org sécurisée ; ne jamais remplacer l'allowlist par `*`.
- La PR indépendante #429 corrige `PRODUCTION_STATE.json` sur base exacte `5bc5e2b4...`; CI MCP #44742423754 **success** sur son HEAD `b42aad9d...`; au moment de l'audit, `list_pull_request_reviews` a retourné **aucune revue**, donc PAS de merge automatique et PAS de prétendue correction G1.
- Le préflight `mcp_e2_reconcile_preflight` renvoie `BLOCKED`, `E2_DOCUMENTATION_DRIFT`, `canStartOrdinaryWork=false`. **Ordre absolu : G1 corrigé et réattesté → P01 review → P03 code**, jamais l'inverse.

## 8. Gestion de la continuité

À chaque reprise `WT-MCP-REGISTRY-RESOLUTION-20261121-01` :
1. Lire `__MISSION.md`, `__COVERAGE_AUDIT.md`, ce plan, `__DECISIONS.md`, `__CONTINUITY.md`.
2. Réobserver G1 préflight, PR #429, PR #430, HEAD/main/S1/runtime, autres propriétaires.
3. Choisir **la première tâche RG non attestée admissible** et enregistrer preuves avant de passer à la suivante.
4. Aucun statut fictif, aucun nouveau Task ID runtime sans queue autoritative.
5. Mettre à jour continuité à chaque jalon, append-only dans les autorités en place.

**NEXT_ACTION CURRENT** : obtenir la revue indépendante sur la PR #429, appliquer seulement ensuite la fusion/deploy existants si gates et propriétaire permettent, réattester G1, puis reprendre le plan à RG-003 et RG-005. Les auditeurs peuvent continuer des lectures sans mutation en attendant.

---

## 9. Extension approuvée : usine logicielle gouvernée 24/7 — 2026-11-21 (P10–P17)

**Mandat additionnel du propriétaire :** élargir cette MÊME mission à une usine de développement durable sur serveur. ChatGPT devient un client facultatif, jamais le heartbeat ni le runtime de l'usine. Ce chantier reste rattaché à `WT-MCP-REGISTRY-RESOLUTION-20261121-01`, à la fédération des registres et aux PR existantes. Le présent addendum est **PLANIFIÉ, NON ENCORE DÉPLOYÉ** ; il n'attribue aucun mandat d'agent ni autorité d'exécution.

### Chaîne cible et séparation des rôles

`GitHub/CUG/Insights/Codebase/Runtime observations → attestations de couverture → GitRegistry/ProjectReality + cartographie+architecture existantes → analyse d'écart → propositions et plans → TODO/TASKS du chantier (documents) → admission gouvernée P2/Task Queue (autorité) → sélection dépendances+locks+session → worker codeur isolé → tests+revue indépendante → PR+GitHub ruleset → merge autorisé → Governed Deploy OIDC → Live State/G1 → checkpoints → prochaine tâche admissible`.

**L'« analyste / architecte » ne code pas à l'aveugle :** il produit d'abord une fiche d'existant sourcée (repo + commit + composants + API + dépendances + contraintes + collisions), une analyse d'impact, les alternatives et les tests nécessaires. Le « planificateur » place les unités de travail dans le graphe des dépendances et publie les changements de TODO/ROADMAP après validation documentaire. Le « codeur » n'agit que sur un périmètre déjà admis, avec une session/lock réelle, et le « réviseur » indépendant vérifie le diff/test exact. Le « vérificateur » atteste CI, déploiement, runtime et doc. Les rôles peuvent utiliser différents LLM/agents, mais **ne partagent pas implicitement identité ou permissions**.

### P10 — GitHub Insights et sécurité supply chain comme CAPTEURS, pas autorités

| ID | Ordre et travail | Preuve et non-régression |
| --- | --- | --- |
| RG-036 | Inventaire lecture seule des réglages **réels** par dépôt : Dependency graph, Dependabot alerts/security updates, code scanning/CodeQL, secret scanning/push protection, rulesets, vérifications requises, actions/workflows, App CUG installation ; état `ENABLED/DISABLED/INACCESSIBLE/UNKNOWN/NOT_APPLICABLE` avec observation et source | Aucun « activé » déduit d'un onglet GitHub ou d'un simple fichier ; HTTP 403/404 = échec de visibilité distinct de fonction désactivée |
| RG-037 | Exporter à la demande le SBOM SPDX via l'API GitHub `GET /repos/{owner}/{repo}/dependency-graph/sbom`, collecter les manifestes/lockfiles et leurs SHA ; observer les alertes et versions vulnérables si les droits existent | Bornes, pagination, horodatage, hash, provenance ; ni dépendance cachée inventée ni exposition de secret |
| RG-038 | Relever PR/reviews/checks, workflows, runs, Actions, règles de branche, releases, forks/parent, activité/réseau et graphes de contributeurs si autorisés ; distinguer métriques de développement et dépendances de code | `fork` n'est pas un projet CUG admis ; l'absence de permission `Administration:read` pour le trafic est signalée sans escalade |
| RG-039 | Construire une projection `GithubInsightEvidence` par dépôt sous les mêmes règles d'accès de GitRegistry/CUG, sans second store d'autorité ; réindexation incrémentale par événements CUG + contrôles programmés | Traçabilité exacte source→projet→composant→risque, idempotence des événements, vue par dépôt/projet, cache recalculable, aucun nouveau Task runtime sans admission |

Références de vérification : GitHub Docs « dependency graph », « export SBOM », « dependency submission API », « Dependabot », « code scanning », « REST metrics / traffic », « protected branches / rulesets ». **Activation des fonctions GitHub uniquement dépôt par dépôt, après mesure des permissions et conservation des protections existantes** ; pas de script global « enable all » aveugle.

### P11 — compréhension structurée du code et des dépendances

| ID | Travail | Critère |
| --- | --- | --- |
| RG-040 | Générer une **carte du dépôt à SHA exact** : manifeste, exports publics, imports, modules, migrations, API routes, files de données, workers/cron, tests, pipelines, infra, Docker/Compose, secrets *référencés sans les lire* ; importer l'architecture documentaire existante | Carte des composants sourcée avec statut `OBSERVED/DECLARED/UNVERIFIED/CONFLICT`; pas d'exécution de code non fiable pendant l'inventaire |
| RG-041 | Rapprocher trois graphes **distincts** : dépendances logicielles (packages/API), dépendances fonctionnelles (services et flux), dépendances de tâches (P2/Loop/UAES), avec distance/impact, risques de rupture et ownership | Pas de confusion `package dépend de package` et `Task A dépend de Task B` ; impact et priorité explicables |
| RG-042 | Obliger une fiche de changement `current-state / delta / placement / tests RED / rollback / preuve` avant lot de code ; route vers validation d'architecture lorsqu'une dépendance inconnue ou externe est touchée | Le codeur ne réécrit pas la cartographie en source de vérité sans revue ; pas de suppression de comportement historique |

### P12 — planification gouvernée et exécution continue

| ID | Travail | Critère |
| --- | --- | --- |
| RG-043 | Réutiliser `src/operationalMemory/taskQueue.ts`, sessions, locks, event journal, `scripts/mcp-autonomous-agent-continuation.mjs` (C26) et `scripts/mcp-autonomy-e2e-certification.mjs` (C27) comme contrats d'admission, de continuation et de certification ; ne pas inventer une autorité parallèle | Session transport réellement liée, bootstrap et exact-SHA, P2 task, lock, preuve d'ownership ; un prochain travail READY n'accorde pas un claim |
| RG-044 | Réaliser une passerelle CUG `observation vérifiée → candidat de plan → scope GitRegistry → admission via outil P2 autorisé → tâche durable` ; corréler deliveryId/intentKey/taskId dans la projection fédérée, jamais par une écriture directe de Task Queue | Rejeu identique = pas de doublon ; conflit de scope/identité = aucune tâche ; travaux d'autres dépôts jamais admis sans droits |
| RG-045 | Ordonnanceur déterministe `READY / dépendances DONE / priorité / collision / quota` basé sur l'autorité P2 ; aucun intervalle d'agent ne remplace l'ownership ; si aucune tâche admissible, attendre un événement sans occuper le CPU | Pas de double claim, de starvation silencieuse, de boucle infinie sur BLOCKED, de transfert sur simple heartbeat expiré |

### P13 — worker durable sur S1 (indépendant de ChatGPT)

| ID | Travail | Critère |
| --- | --- | --- |
| RG-046 | Inventorier la capacité S1 (CPU/RAM/disque/quotas/réseau, backup, secret store, isolation des conteneurs), l'architecture Docker Compose actuelle et les mécanismes de redémarrage/supervision déjà présents ; prévoir un **service distinct isolé** sans toucher au runtime MCP existant | Dimensionnement, rollback, secrets séparés et impact zéro sur les applications S1 ; aucun déploiement Kubernetes présumé |
| RG-047 | Développer un **adaptateur d'hôte d'agent** (pas de moteur concurrent) pour C26 : provider LLM configuré en secret, identité authentifiée, workspace éphémère, branche dédiée, I/O bornées, budgets temps/coût, journaux redigés, annulation contrôlée, séparation architecture/code/review | Aucun token ChatGPT nécessaire ; host n'usurpe pas session MCP, aucun accès SSH root ou clone large non autorisé, réponse C26 refusée si ports absents |
| RG-048 | Runner durable supervisé via Compose/systemd existant : restart, health/readiness, signaux, ordonnanceur événementiel, reprise après crash, état persistant minimal lié aux autorités (exécution/idempotence, pas de seconde queue), contention/fencing, DLQ de diagnostics, metrics et alertes | Tests panne/restart/replay/lock + validation d'un redémarrage réel du service ; `24/7 ACTIVE` seulement après une attestation de runtime réel et une endurance observée |

### P14 — usine de livraison, contrôle qualité et sécurité

| ID | Travail | Critère |
| --- | --- | --- |
| RG-049 | Générer des PR additives par tâche avec tests RED/GREEN, impact explicite, code review bot indépendant sur SHA exact ; compléter CodeQL, Dependency Review, Dependabot, secret scanning si disponibles sans casser les contrôles existants | Aucune auto-approbation fictive, aucune PR non revue fusionnée, tout changement lié à Task et Evidence |
| RG-050 | Activer **auto-merge conditionnel** seulement si rulesets réels le permettent : approvals exigés, CI success, fils résolus, source HEAD à jour, droits de l'App explicitement attestés | Aucune modification des protections de branche pour accélérer la chaîne ; refus = bloqueur observable, pas bypass |
| RG-051 | Après fusion, réutiliser `.github/workflows/mcp-deploy.yml` (OIDC→S1 Docker Compose), vérifier exact SHA GitHub/S1/runtime/health, faire G1 documentaire, produire rollback et C27 puis reprendre la tâche suivante | `FULLY_ALIGNED` prouvé, non inféré ; Kubernetes seulement après mission de migration dédiée |

### P15/P16 — cockpit de la fabrique et supervision fédérée

| ID | Travail | Critère |
| --- | --- | --- |
| RG-052 | Étendre le cockpit fédéré existant : **Factory / Projects / Workstreams / Tasks / Insights / Security / Dependencies / Agents / Runs / Deploy / Continuity**, vues globales et par scope | Chaque objet avec source, horodatage, degré de preuve, liens vers registre détenteur ; historiques DONE/CANCELLED/SUPERSEDED consultables |
| RG-053 | Panneaux de contrôle : worker health, dernier heartbeat, backlog bloqué, latence d'événement, tentatives/reprises, CI, revues, vulnérabilités, couverture CUG et permissions GitHub ; alertes et journal d'incident | Un worker absent ou sans attestation apparaît `UNKNOWN/STOPPED`, jamais « en cours » par supposition |
| RG-054 | Rattacher checkpoints à TODO/TASKS/SUIVI/MÉMOIRE **dans chaque dépôt propriétaire**, par PR documentaire gouvernée ; le cockpit n'est qu'une projection | Pas de gros registre manuel ni de modification de dépôts sans admission/installation réelle |

### P17 — pilote, endurance et décision de généralisation

| ID | Travail | Critère |
| --- | --- | --- |
| RG-055 | Pilote unique MCP en staging isolé : réception d'un événement, analyse de code et de dépendances, plan/Task P2, code et tests, revue, PR, merge/deploy autorisés, checkpoint C27, redémarrage forcé, rejeu, négatifs de permissions, rollback | Chaîne bout-en-bout **réellement attestée** avec traces exactes ; pas une simulation ni un workflow Actions isolé |
| RG-056 | Endurance observée (au moins 72 h de redémarrages/supervision et charges contrôlées), audits de coût/latence/récupération et bornes de permissions ; ensuite activation progressive par installation CUG vérifiée | Attestation de haute disponibilité du **service observé**, sans promesse de disponibilité absolue ou programmation sans tâches ; aucun autre dépôt modifié avant admission |

### Conditions transversales de reprise et d'ordre

1. **G1 et E2** : le correctif documentaire #434 a sa propre vie ; le journal E2 sur issue #359 a un 403 serveur distinct. Aucune permission ou déclenchement de tâche ne peut être déduit d'une CI verte ou de l'accès GitHub du connecteur ChatGPT.
2. Les PR #432 (cockpit), #435 (candidats CUG) et #430 (dossier) sont **concurrentes** : observer leur dernier SHA, propriétaire et fil de revue avant toute mutation. Ne pas les fusionner « en masse ».
3. Les RG-036…RG-042 d'observation/analyse peuvent être développées en lecture pendant les validations des PR existantes. **RG-043…RG-056 n'activent aucun agent de production** tant que les garanties de session, runtime, ownership, quota et rollback ne sont pas réunies.
4. La fréquence horaire de ChatGPT est seulement une **reprise de supervision**. Le véritable travail permanent est la boucle d'un service durable, event-driven et supervisé ; une veille sans tâche READY est un comportement correct.
5. Le « traitement non-stop » signifie **enchaîner automatiquement toute tâche admissible et sûre** après l'attestation précédente. Une revue obligatoire, un credential refusé ou un conflit réel restent des barrières techniques à réparer, non des invitations à contourner la gouvernance.
6. **NEXT_ACTION du volet usine** : tester l'état réel des fonctionnalités Insights par dépôt, classifier la couverture CUG, vérifier l'hôte existant de C26 (aucun runtime opérationnel ne doit être présumé), puis produire les composants de lecture et le pilote de worker isolé avec tests négatifs. Garder l'autorité de tâche dans P2 et la source de vérité documentaire dans chaque projet.

## 10. Raffinement après lecture complète du document « Loop Engineering.docx » (2026-11-21)

Ce document source rassemble deux développements et un mandat candidat. L'exigence d'**ingestion sans dispersion** est conservée au niveau du plan RG. La lecture détaillée, les correspondances de dix phases et quinze opérations, les onze familles de documents, les deux graphes, les ports C26, les critères de certification et les preuves réelles sont inscrits dans [`WT-MCP-REGISTRY-RESOLUTION-20261121-01__SOURCE_READING_LOOP_ENGINEERING_20261121.md`](./WT-MCP-REGISTRY-RESOLUTION-20261121-01__SOURCE_READING_LOOP_ENGINEERING_20261121.md). **Ce n'est pas une nouvelle série RG-057+** : les exigences augmentent les critères RG-036…056 déjà ouverts.

- **RG-036…039** : deux familles d'Insights ; huit observations techniques + schéma provenance ; 403/404 ne signifie pas DISABLED, SHA/id de dépôt obligatoires. PR #436 = **contrat pur non encore déployé**.
- **RG-040…042** : les *deux graphes* architecture↔programme restent distincts ; classification DUPLICATE/COMPLEMENT/DECISION/FINDING/TASK/CONTRADICTION/MEMORY/OUT_OF_SCOPE et positionnement de la demande dans un lot historique **avant** le code. Dossier `current state → impact → placement → proposed delta → tests/rollback`.
- **RG-043…045** : `program:readiness/next` et FIRST_COLLISION_FREE_IN_PROGRAM_ORDER ne sont pas une Task Queue ni un claim. C26 requiert `readOwnP2State`, `lookupExistingAgentRun`, `startOrResumeExistingAgent`, `readBoundAgentSession`, `admitExistingP2`, `atomicIdempotentHost` : tous les ports doivent être réels, transport/session propre.
- **RG-046…048** : cible UAES U02; avant tout Docker worker, ressources/backup/restauration/permissions/secrets/isolation attestées ; un process Docker actif ne prouve ni un agent codant ni une plateforme sans panne.
- **RG-049…051** : quatre preuves distinctes commit PR, merge main, run Deploy, observation live, puis G1. Une review automatisée n'autorise jamais à contourner les rulesets.
- **RG-052…054** : 11 familles documentaires hiérarchiques, index de preuves, états cockpit IDLE/RUNNING/WAITING_CI/WAITING_REVIEW/BLOCKED/RECOVERING/FAILED/COMPLETED, supervision **externe** au worker.
- **RG-055…056** : certification C27 sur sources réelles après panne/reprise, négatifs d'ownership, exact SHA, endurance et extension par installation CUG attestée.

### Sous-chantier exécuteur, sans concurrence

L'identifiant `WT-MCP-AUTONOMY-24X7-20261121-01`, proposé et non créé dans le DOCX, est **créé ici exclusivement comme dossier documentaire enfant** sous `subchantiers/`. Son [mandat](./subchantiers/WT-MCP-AUTONOMY-24X7-20261121-01/WT-MCP-AUTONOMY-24X7-20261121-01__MANDATE.md) et ses [TASKS](./subchantiers/WT-MCP-AUTONOMY-24X7-20261121-01/WT-MCP-AUTONOMY-24X7-20261121-01__TASKS.md) sont des vues de RG-043…056. **La Governed Task Queue reste l'unique autorité de tâche.** Le dépôt UAES conserve la propriété de son exécuteur et ne sera pas écrit par cette PR MCP.

### Critère transversal de dette zéro

Ne jamais marquer `DONE` tant qu'une intention n'a pas son résultat, sa preuve et son statut exact ; garder `BRANCH_ONLY` pour les commits non mergés, `MERGED_MAIN` pour le code non attesté sur runtime, `DEPLOYED_WITH_DRIFT` pour un runtime healthy avec G1 documentaire décalé, et `CERTIFIED` uniquement après C27 et reprise réelle. Une tâche ChatGPT horaire est un filet de suivi et ne constitue pas une attestation 24/7.
