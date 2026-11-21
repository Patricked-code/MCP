# WT-MCP-REGISTRY-RESOLUTION-20261121-01 — Plan d'intégration technique, de codage, tests et mise en production

> **Mission : résolution du problème des registres**  
> Dépôt initial : `Patricked-code/MCP`, entrée GitHub-first / E2.  
> **Type** : plan d'implémentation **non autoritaire**, à exécuter en incréments gouvernés.  
> Créé le 2026-11-21 ; première base : `main@5bc5e2b4c0b2aa176c1f6131826afbea7af2f164`.  
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
