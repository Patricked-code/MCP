# Mémoire maître de reprise — MCP WealthTech

Lecture intégrale observée le 2026-10-02 sur `main@52f6129d519ba637e0073443275f0f5e74cb5fbd` (599 fichiers suivis) ; section 1 mise à jour le 2026-10-04 après la clôture de DISPATCH-03.

> Ce document est une **projection de reprise**. Il n'a aucune autorité. Il oriente la lecture et ne remplace aucune source. En cas d'écart, la source citée l'emporte, et l'état live doit toujours être réobservé : GitHub, S1, Live State, Task Queue, sessions et locks. Les mentions « À vérifier » désignent des données non confirmées par cette lecture.

## 1. Où en est le projet (état au 2026-10-04, après DISPATCH-03)

| Élément | Valeur | Source |
|---|---|---|
| Programme courant | Program Backlog V2 (`program-backlog-convergence-v2-20260924`) | `docs/governance/program-backlog-convergence.json` |
| Blueprints | 81 au total : 24 DONE, 3 READY, 5 CONDITIONAL, 42 BLOCKED, 7 DEFERRED | `npm run program:readiness` |
| Work items | 17 DONE sur 39 | même fichier, `summary.dispositionCounts` |
| Candidats READY | `TB-W3-A3-02` (A3.2), `TB-W3-C3-01`, `TB-W3-GGCC-GIT-READ` | `npm run program:next` |
| Mode de continuité GWC | `POST_INTEGRATION_OPERATIONAL_CONTINUITY` (bundle `post-integration-terminal-handoff-20260920`) | `docs/gwc/canonical-memory/current.json` |
| Dernier lot livré | DISPATCH-03 — projection next-work (PR #231 → `6df23b9`) ; boucle de dispatch #222 complète (`PB-DISPATCH` DONE) | `SUIVI.md` |

Points de reprise :

1. **`TB-W3-C3-01` — prochain lot.** Server Resolution (`PB-C345`) : réutiliser le résolveur serveur GWC pour une réalité projet bornée (S1/S2/realPath) à partir de GitRegistry V2, `.mcp/server-map.json` et des preuves live.
2. **Boucle de dispatch (#222) complète.** Une session connectée lit `nextWork` dans le Current-State Inventory (reprise, claim compatible ou blueprint READY sans collision) et suit `nextAction` ; rien n'est réclamé ni créé automatiquement.
3. **A3.2 (`TB-W3-A3-02`) — READY, blocker local.** Il faut réclamer `TASK-20260929-001` dans la Governed Task Queue ; le travail est porté par la PR draft #207. Seule une session runtime peut faire ce claim.
4. **B3.2 est DONE**, mais aucune cible n'est configurée sur `main` (`.mcp/server-map.json > servers.S1.targetProjectIds: []`). Configurer une cible = une PR revue sur ce fichier, puis Governed Deploy.
5. **`mcp:write`** : lot technique `TB-W3-OAUTH-WRITE-SCOPE-01` après A3.2 — ce n'est pas une décision propriétaire (#221).

Règle de reprise : relire les issues ouvertes `[PROGRAM INTAKE]` avant toute sélection (`REOBSERVE_PROGRAM_INTAKES`), et ne jamais créer de gate humaine pour un choix technique déductible (`CLAUDE.md` §7.3).

NEXT_ACTION unique : `FIRST_COLLISION_FREE_IN_PROGRAM_ORDER` → `TB-W3-C3-01`.

## 2. Autorités actuelles (qui fait foi)

Ces autorités sont fixées dans `ARCHITECTURE.md` et `CLAUDE.md`.

| Domaine | Autorité | Remarque |
|---|---|---|
| Code, branches, PR, CI, review | GitHub `Patricked-code/MCP` | La branche officielle est `main`, sans push direct |
| Checkout et runtime | S1 / Docker, `/opt/apps/wealthtech-mcp-ssh-bridge` | Accès en lecture via OIDC (`mcp-readonly-evidence.yml`) |
| Alignement au SHA exact | Live State (`src/liveState/`) | — |
| Sessions, checkpoints, locks, receipts | Operational Memory (`src/operationalMemory/`) | — |
| Tâches runtime | Governed Task Queue | C'est la seule autorité de tâche. Un blueprint n'est jamais une Task |
| Contrats d'outils actuels | Enregistrements MCP réels | La cartographie compte 136 outils (`.mcp/function-cartography.json`) |
| Règles machine | `.mcp/*.json` | — |
| Liaison OAuth→GitHub | `.mcp/identity-policy.json` | — |
| Comptes GitHub configurés | `data/github-accounts.json` | Ne contient que des chemins de fichiers de jetons, aucun secret |
| Registre Git des projets | `data/mcp-git-registry.json` (projets `chainsolutions.africafunds`, `chainsolutions.stablecoin`) | Version S1 de GitRegistry V2 |
| Mode de bootstrap | GitHub-first (`.mcp/github-first-operational-policy.json`) | `GITHUB_ONLY`, puis `GITHUB_ACTION_READONLY_EVIDENCE`, puis `RUNTIME_REQUIRED` seulement pour l'opération exacte |
| Journal humain canonique | `SUIVI.md` (le plus récent en tête), `CHANGELOG.md`, `DECISIONS_LOG.md`, `TASKS.md`, `TODO.md`, `DEPLOYMENT_PRODUCTION.md`, `MCP_ANTI_DISPERSION_GOVERNANCE.md` | Catégorie `canonical` dans `markdown-inventory.json` |

Invariants permanents :

- Aucun secret dans Git, aucun contournement TLS.
- Le fallback read-only n'autorise jamais d'écriture serveur.
- Aucune autorité ni aucun store parallèle.
- Le heartbeat sert seulement à la liveness : un état STALE ou UNKNOWN ne libère jamais rien, et aucune reprise de propriété n'est automatique.
- Les claims PRECODE historiques ne sont jamais ressuscités.
- La gate WRITE fonctionne en mode shadow.
- Une attestation client n'autorise jamais rien. C'est le cas de `mcp_attest_client_tool_surface` comme de la présence client.

## 3. Projections (dérivées, non exécutables)

- `docs/governance/program-backlog-convergence.json` : la readiness est dérivée par `scripts/program-backlog-convergence-lib.mjs`. La règle de sélection est `FIRST_COLLISION_FREE_IN_PROGRAM_ORDER`, et `createsRuntimeTask` vaut toujours `false`.
- `docs/governance/*-inventory-*.json` sont des inventaires datés :
  - preuves client du 2026-09-25 ;
  - convergence des capacités Git/GitHub du 2026-09-25 ;
  - corrélation OAuth du 2026-09-28 ;
  - multi-dépôt du 2026-10-01.
- `docs/governance/markdown-inventory.json` contient la classification documentaire validée par `npm run docs:check`.
- `.mcp/function-cartography.json` est généré par `npm run cartography:write`.
- `.mcp/gwc-*.json` sont des projections GWC. Leur contenu PRECODE est historique, voir la section 4.
- `PRODUCTION_STATE.json` est **périmé**. Il a été observé à `ba9acd1` le 2026-09-24 et n'a pas été mis à jour depuis. Réobserver via OIDC.
- `proof.clientPresence` et `proof.toolSurface` dans le contexte gouverné sont des projections avec `authoritative=false`.

## 4. Provenance historique (chronologie)

| Période | Jalon | Traces |
|---|---|---|
| 2026-07-01 → 07-08 | Création du squelette `wealthtech_ssh_bridge`, mémoire des conversations, migration, organisation `chainsolutions-wealthtech` | `memory/`, `Migration/`, `docs/reports/`, `docs/migration-wealthtech-2026-07-04/` |
| 2026-08-05 | Récupération et audits des fondations, GitRegistry V2, redaction OAuth P1 | `docs/audits/2026-08-05/`, `docs/history/SUIVI_PRE_FOUNDATIONS_20260805.md` |
| 2026-08-09 | Live State V1 et Governed Autodeploy V1 | `docs/superpowers/{specs,plans}/2026-08-09-*` |
| 2026-08-13 | Governed Session / Operational Memory V1 | `…2026-08-13-*` |
| 2026-08-22 | Bootstrap agent obligatoire et orchestration du travail | `…2026-08-22-*` |
| 2026-08-29 | Unified Work State | `SUIVI.md`, `DECISIONS_LOG.md` |
| 2026-09-01 | Governed Connection Context | `…2026-09-01-*` |
| 2026-09-07 / 09 | B1 identité GitHub, B2 résolution de dépôt | `…2026-09-07-*`, `…2026-09-09-*` |
| 2026-09-12 / 13 | AfricaFunds : mapping S2 project-aware | `…2026-09-12-*` |
| 2026-09-15 | Spécification GWC V1 (Governed Workflow Contract) | `…2026-09-15-*` |
| 2026-09-16 → 20 | Programme GWC PRECODE sur la PR #95 (`claude/ecstatic-edison-v1dyt1`) : 73 contrats, blueprints GWC-0..17, intakes 001–004, intégration le 09-20 | `docs/gwc/**` (42 bundles canoniques) |
| 2026-09-20 / 21 | Continuité GitHub-first et règle de préservation de `@GitHub` | `…2026-09-20-*`, `CLAUDE.md` |
| 2026-09-22 | Réconciliation des findings AF et des anciennes PR | `docs/audits/2026-09-22-*` |
| 2026-09-23 / 24 | UAC (Universal Agent Coordination) : 24 work items, PR #154 déployée à `ba9acd1` | `docs/governance/universal-agent-coordination-plan.md` |
| 2026-09-24 | Program Backlog V2 : vagues W1–W4, MAINTENANCE, CONDITIONAL | `program-backlog-convergence.json` |
| 2026-09-25 → 10-01 | Lots W1/W2, A2.2, A3.1, A3.2 (probes runtime OIDC, PR #200), incident TLS expiré (#201, rétabli selon la PR #207 avec le Deploy #87), consentement OAuth, SSH dépôt, B3.1, C1.1, G1, G2, G3 | `SUIVI.md`, `CHANGELOG.md` |

L'historique du programme PRECODE GWC est clos :

- `FINAL_PRECODE_VERSION_ACCEPTED` est atteint.
- L'intégration au 09-20 a été faite.
- Les `GWC-PRE-*` ne se rejouent plus et ne se dispatchent plus.
- La macro-décomposition T00–T204 est conservée uniquement pour la traçabilité.

## 5. Contenu superseded ou périmé (ne pas suivre comme état courant)

| Contenu | Pourquoi | Remplacé par |
|---|---|---|
| `docs/{SUIVI,CHANGELOG,TASKS,TODO,ROADMAP,ARCHITECTURE,…}.md` (20 doublons des documents racine) | Instantanés de juillet, différents des versions racine (par exemple `docs/SUIVI.md` fait 345 lignes contre 1 339 à la racine) | Les documents racine canoniques |
| `docs/gwc/archive/ARCHITECTURE_R2_NON_CANONICAL.md` | Explicitement non canonique | `docs/gwc/ARCHITECTURE_73_CONTRACTS.md` |
| `docs/gwc/DEPRECATED_CLAIMS.md` (DC-01…) | Liste des claims révoqués | — |
| Mention « R4-CANDIDATE / Travail courant GWC-PRE-B-01 » dans `docs/gwc/README.md`, et règles §9.6–9.9 de `CLAUDE.md` sur la PR #95 | Historique PRECODE | `current.json` (mode post-intégration) et Program Backlog V2 |
| `docs/audits/2026-08-05/MCP_REGISTRY_UPDATE_WORKFLOW.corrupted-original.md` | Original corrompu, conservé comme preuve | La version `MCP_REGISTRY_UPDATE_WORKFLOW.md` |
| `ACTIVITY_LOG.md` | S'arrête au 2026-08-28 | `SUIVI.md` |
| `PRODUCTION_STATE.json` | Figé à `ba9acd1` | Probes OIDC et Live State |
| `.mcp/agents.json` (`requiresHumanApproval=true`, `canDeploy=false`) | En conflit apparent avec le Governed Deploy automatique sur `main`. **À vérifier** | `.mcp/autodeploy-policy.json`, `DEPLOYMENT_PRODUCTION.md` |
| En-têtes de sections de `TODO.md` (34 cases ouvertes, 102 cochées) | Sections datées, dont certaines sont dépassées | Program Backlog V2 |
| `memory/*` « point de reprise courant » (`LOOPBACK_WEALTHTECH_CURRENT.md`, `memory/SUIVI.md`) | État de juillet 2026 (les dates de dernier commit au 09-12 sont des retouches de masse) | `SUIVI.md` racine |

## 6. Code et tests (cartographie)

- `src/` contient 103 fichiers, organisés ainsi :
  - entrées : `server.ts`, `index.ts`, `auth.ts`, `oauth.ts` ;
  - modules : `config/`, `currentState/`, `deploy/` (OIDC et déploiement S1), `evidence/` (probes read-only), `github/` (identité, dépôt, projet, registre V2) ;
  - `governance/` : décision opérationnelle, gate d'écriture scopée, attestation de surface d'outils ;
  - `governedContext/` : continuité candidate, GitHub-first, coordination d'agents ;
  - `governedWorkflow/` : GWC-0..17, avec moteur, résolveurs, deploy, review et terminal ;
  - `liveState/`, `operationalMemory/` (sessions, locks, file de tâches, journal, présence client, TargetScope) ;
  - `ssh/` : passerelle et CA dépôt ;
  - `stablecoin/` : fast-forward borné ;
  - `tools/` : 25 modules d'enregistrement MCP, dont les outils scopés legacy funds, vhosts, nigeria et sadiaaf.
- `tests/` contient 107 fichiers à la racine, plus `fixtures/` et `helpers/`. La dernière suite locale connue est verte à 785/785, au lot G3.
- `scripts/` contient les gates de documentation, de gouvernance, de secrets et de cartographie, la readiness du programme, les vérificateurs GWC, la synchronisation et la passerelle SSH. Les fichiers `amf_registry_native_export.txt` et `brvmdata_amf_push.txt` sont des scripts de données de marché.
- `.github/workflows` contient cinq workflows :
  - `mcp-ci.yml` (push et PR) ;
  - `mcp-deploy.yml` (Governed Deploy) ;
  - `mcp-readonly-evidence.yml` (OIDC read-only) ;
  - `repository-ssh-ca-bootstrap.yml` ;
  - `stablecoin-fast-forward.yml`.

## 7. Projets spécifiques

| Projet | Statut dans ce dépôt | Où lire |
|---|---|---|
| MCP WealthTech (`wealthtech_ssh_bridge`) | Projet principal et actif | Racine, `src/`, `docs/governance/` |
| AfricaFunds / FundAfrica / OPCVM | Projet applicatif enregistré (`chainsolutions.africafunds`), mapping S2 | `docs/superpowers/*/2026-09-12-*`, `memory/WEALTHTECH_PROJECT_MEMORY.md`, `memory/PROMPT_AUDIT_OPCVM_SANS_REGRESSION.md`, outils `legacyFundsScoped` |
| Stablecoin E-WARI / KOREE | Projet enregistré (`chainsolutions.stablecoin`). Le deploy est CONDITIONAL (`TB-COND-STABLECOIN-DEPLOY`) | `memory/*STABLECOIN_EWARI*`, `memory/CONVERSATION_PART_03_*`, `src/stablecoin/`, `stablecoin-fast-forward.yml` |
| sadiaaf | Outils scopés de lecture et de déploiement | `src/tools/sadiaaf*.ts` |
| Nigeria, vhosts legacy | Outils scopés | `src/tools/nigeriaScoped.ts`, `legacyVhostsScoped.ts` |
| AMF / BRVM / BVMAC (registre de fonds, données de marché) | Outils et scripts de données. Les détails métier sont **à vérifier** | `src/tools/amfRegistry.ts`, `scripts/*amf*` |
| Openfunds | Mentionné seulement dans la mémoire de juillet. **À vérifier** | `memory/` |
| Loop Engineering (programme de méthode, juillet) | Historique | `memory/LOOP_ENGINEERING_*`, `LOOP_ENGINEERING.md` |
| Governed-Repository-Template / `Patricked-code/Ekyc` | Consommateur externe (intake #201) | `SUIVI.md` du 2026-09-29 |

## 8. Couverture de la lecture

| Zone | Fichiers | Classement |
|---|---|---|
| Racine | 65 | Canonique (7), documentation racine (50), état et configuration |
| `.mcp/` | 18 | Règles machine et projections |
| `docs/governance/` | 8 | Projections courantes et plan UAC |
| `docs/gwc/` | 105 | Provenance historique, avec `current.json` comme pointeur courant |
| `docs/audits`, `superpowers`, `reports`, `runbooks`, `history` | 47 | Provenance et spécifications. Les runbooks restent applicables |
| `docs/*.md` | 26 | Superseded, voir la section 5 |
| `memory/`, `wealthtech_project_memory/`, `Migration/` | 79 | Provenance de juillet. Miroir runtime suivi |
| `src/`, `tests/`, `scripts/`, workflows, `data/`, `.devcontainer/` | Le reste | Code actif |
