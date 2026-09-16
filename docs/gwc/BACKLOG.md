# GWC — backlog candidat

Vue lisible de `.mcp/gwc-task-seed.json`. Le fichier JSON fait foi ; ce document est sa projection.

Statut : `AWAITING_HUMAN_RATIFICATION`. Ces 18 tâches ne sont **pas** chargées par le runtime. Elles ne deviennent exécutables qu'après la procédure de promotion décrite plus bas.

## Vue d'ensemble

| Tâche | Titre | Priorité | Dépend de |
| --- | --- | --- | --- |
| `TASK-20260916-001` | Ratification humaine de l’architecture GWC R2 | 95 | — |
| `TASK-20260916-002` | AF-19 — lier le déploiement à la CI du SHA déployé | 92 | `TASK-20260916-001` |
| `TASK-20260916-003` | AF-22 et AF-30 — preuve de revue liée au head exact | 90 | `TASK-20260916-001` |
| `TASK-20260916-004` | Disposition gouvernée des PR ouvertes #85 #86 #88 #89 #90 | 85 | `TASK-20260916-001` |
| `TASK-20260916-005` | LOT 0 — substrat contractuel GWC, sans comportement métier | 80 | `TASK-20260916-004` |
| `TASK-20260916-006` | LOT 1 — GW-01 Intent Capture pur | 78 | `TASK-20260916-005` |
| `TASK-20260916-007` | LOT 2 — wrappers des autorités déjà implémentées | 75 | `TASK-20260916-006` |
| `TASK-20260916-008` | LOT 3 — B3-A identité de dépôt et de cible | 72 | `TASK-20260916-007` |
| `TASK-20260916-009` | LOT 4 — C3 résolution de serveur, par généralisation | 70 | `TASK-20260916-008` |
| `TASK-20260916-010` | LOT 5 — C5 résolution de domaine, par généralisation | 68 | `TASK-20260916-008` |
| `TASK-20260916-011` | LOT 6 — C4 contrat d’évidence runtime | 66 | `TASK-20260916-009`<br/>`TASK-20260916-010` |
| `TASK-20260916-012` | LOT 7 — D1 héritage, D2 capacités effectives, D3 receipt enrichi | 64 | `TASK-20260916-011` |
| `TASK-20260916-013` | LOT 8 — B3-B Live State et contexte réellement multi-cibles | 62 | `TASK-20260916-012` |
| `TASK-20260916-014` | LOT 9 — GW-21 à GW-45 sur le Control Plane réconcilié | 60 | `TASK-20260916-013` |
| `TASK-20260916-015` | LOT 10 — GW-46 à GW-67 déploiement et observation | 58 | `TASK-20260916-014` |
| `TASK-20260916-016` | LOT 11 — GW-68 vérification terminale, gate dur | 56 | `TASK-20260916-015` |
| `TASK-20260916-017` | LOT 12 — GW-69 à GW-72 DONE, checkpoint, locks, clôture | 54 | `TASK-20260916-016` |
| `TASK-20260916-018` | LOT 13 — GW-73 acceptance universelle sur cible non-MCP | 52 | `TASK-20260916-017` |

L'ordre d'exécution n'est pas donné par le numéro mais par le graphe de dépendances. `firstExecutable()` ne retient qu'une tâche `READY` dont toutes les dépendances sont `DONE`, puis trie par priorité décroissante, séquence croissante et identifiant.

Toutes les tâches portent la portée `repository:Patricked-code/MCP`. `activeScopeConflict()` empêche donc deux tâches GWC d'être actives simultanément : c'est l'anti-dispersion voulue, pas un effet de bord.

## Procédure de promotion

À n'exécuter qu'après ratification humaine de l'architecture (`TASK-20260916-001`).

1. Vérifier que `node scripts/gwc-verify.mjs` passe.
2. Fusionner les tâches de `.mcp/gwc-task-seed.json` dans le tableau `tasks` de `.mcp/task-registry.json`, sans retirer ni renuméroter les tâches existantes.
3. Incrémenter `registryVersion` et mettre `generatedAt` à la date de promotion.
4. Recalculer `registryDigest` avec la même sérialisation canonique que `taskRegistryDigest()`.
5. Vérifier qu'aucun `taskId` ni `intentKey` n'entre en collision avec l'existant.
6. Ouvrir une pull request draft, laisser la CI valider, puis suivre le chemin de merge et de déploiement exact-SHA habituel.
7. Au démarrage suivant, `initializeSeed()` charge les tâches. Un agent gouverné peut alors ouvrir sa session, acquitter le contexte, obtenir son receipt, réclamer la première tâche exécutable et travailler.

`initializeSeed()` est idempotent sur les identifiants déjà présents : la promotion ajoute, elle n'écrase pas l'état d'une tâche déjà en cours.

## Détail des tâches

### TASK-20260916-001 — Ratification humaine de l’architecture GWC R2

Ratifier la table des familles, le graphe d’exécution corrigé et les findings AF-01 à AF-30 consignés dans docs/gwc/. Aucune implémentation GWC ne commence avant cette ratification.

| Champ | Valeur |
| --- | --- |
| `intentKey` | `gwc:ratify-architecture-r2` |
| Priorité / séquence | 95 / 1 |
| Dépendances | aucune |
| Portées de ressource | `repository:Patricked-code/MCP`, `docs/gwc` |

**Action attendue.** Lire docs/gwc/README.md puis ARCHITECTURE_73_CONTRACTS.md. Ratifier ou amender la table des familles et le graphe corrigé, puis consigner la décision dans DECISIONS_LOG.md et passer cette tâche à DONE.

### TASK-20260916-002 — AF-19 — lier le déploiement à la CI du SHA déployé

Le SHA de squash déployé n’est pas le SHA validé par le check requis, et mcp-deploy.yml part en parallèle de mcp-ci.yml sur push:main. Conditionner le déploiement à la conclusion des checks du SHA effectivement déployé.

| Champ | Valeur |
| --- | --- |
| `intentKey` | `gwc:af19-deploy-requires-ci-of-deployed-sha` |
| Priorité / séquence | 92 / 2 |
| Dépendances | `TASK-20260916-001` |
| Portées de ressource | `repository:Patricked-code/MCP`, `.github/workflows` |

**Action attendue.** RED : test prouvant qu’un déploiement peut partir sans preuve CI du SHA déployé. GREEN : workflow_run sur MCP CI ou garde explicite sur le head déployé. Vérifier qu’aucun déploiement ne démarre avant conclusion des checks du même SHA.

### TASK-20260916-003 — AF-22 et AF-30 — preuve de revue liée au head exact

parseReviews ignore review.commit_id : une approbation sur un ancien SHA compte pour le head courant. parseUnresolvedThreads a le même angle mort. La famille F ne peut pas consommer ces preuves en l’état.

| Champ | Valeur |
| --- | --- |
| `intentKey` | `gwc:af22-review-evidence-sha-bound` |
| Priorité / séquence | 90 / 3 |
| Dépendances | `TASK-20260916-001` |
| Portées de ressource | `repository:Patricked-code/MCP`, `src/governedContext/github.ts` |

**Action attendue.** RED : test avec une approbation portant un commit_id antérieur au head. GREEN : ne compter une approbation que si review.commit_id égale le head exact observé ; exposer la distinction dans GithubOperationalContext.

### TASK-20260916-004 — Disposition gouvernée des PR ouvertes #85 #86 #88 #89 #90

Les cinq PR ouvertes partent d’un main ancien. #88 → #89 → #90 portent le GitHub Control Plane dont les contrats GW-23 à GW-45 dépendent. Statuer avant d’écrire GWC-0 pour ne pas créer un second client GitHub.

| Champ | Valeur |
| --- | --- |
| `intentKey` | `gwc:disposition-open-pr-stack` |
| Priorité / séquence | 85 / 4 |
| Dépendances | `TASK-20260916-001` |
| Portées de ressource | `repository:Patricked-code/MCP`, `pull-requests` |

**Action attendue.** Auditer #88 contre le main exact, puis réconcilier #89 et #90 dans cet ordre. Décider merge, rebase, close ou supersede pour #85 et #86. Consigner chaque décision dans DECISIONS_LOG.md.

### TASK-20260916-005 — LOT 0 — substrat contractuel GWC, sans comportement métier

Créer src/governedWorkflow/ avec ids.ts, types.ts, invariants.ts, graph.ts et attestation.ts. Aucun store, aucune autorité, aucun changement de comportement runtime.

| Champ | Valeur |
| --- | --- |
| `intentKey` | `gwc:lot0-contract-substrate` |
| Priorité / séquence | 80 / 5 |
| Dépendances | `TASK-20260916-004` |
| Portées de ressource | `repository:Patricked-code/MCP`, `src/governedWorkflow` |

**Action attendue.** RED puis GREEN sur tests/governedWorkflowContract.test.ts : 73 IDs uniques, 9 familles, 12 invariants, graphe sans contrainte to>from, transition GW-17→GW-12 acceptée, attestationId présent, projection persistable sans payload métier.

### TASK-20260916-006 — LOT 1 — GW-01 Intent Capture pur

Premier comportement GWC réel : capture déterministe de l’intention, sans I/O, sans mutation, sans création de tâche, sans inférence de permission. rawIntent n’est jamais persisté.

| Champ | Valeur |
| --- | --- |
| `intentKey` | `gwc:lot1-gw01-intent-capture` |
| Priorité / séquence | 78 / 6 |
| Dépendances | `TASK-20260916-005` |
| Portées de ressource | `repository:Patricked-code/MCP`, `src/governedWorkflow/intentCapture.ts` |

**Action attendue.** N’extraire un hint que sur référence explicite et non ambiguë (repository, TASK-…, PR, SHA 40 hex, serveur) ; sinon UNKNOWN. L’attestation persistable ne contient que digests, références bornées et reasonCodes.

### TASK-20260916-007 — LOT 2 — wrappers des autorités déjà implémentées

Poser les IDs GW-02 à GW-06 et GW-13 à GW-20 autour de Session, Task Queue, Locks, Live State, Capability Reality et Governance Decision, sans réécrire leur comportement.

| Champ | Valeur |
| --- | --- |
| `intentKey` | `gwc:lot2-wrap-existing-authorities` |
| Priorité / séquence | 75 / 7 |
| Dépendances | `TASK-20260916-006` |
| Portées de ressource | `repository:Patricked-code/MCP`, `src/governedWorkflow/wrappers` |

**Action attendue.** Respecter le graphe R2.1 : GW-13 puis GW-14 lookup read-only, GW-16, GW-17, GW-12, puis GW-15 si aucune tâche. Les trois mutations de Task Queue n’étant derrière aucun gate, chaque wrapper porte ses propres préconditions.

### TASK-20260916-008 — LOT 3 — B3-A identité de dépôt et de cible

Introduire un RepositoryId partagé et généraliser additivement ConnectionContext, GovernedSession, BootstrapReceipt, GovernedTask et ClientToolSurfaceCapability. Aucune migration destructive, aucun backfill.

| Champ | Valeur |
| --- | --- |
| `intentKey` | `gwc:lot3-b3a-repository-identity` |
| Priorité / séquence | 72 / 8 |
| Dépendances | `TASK-20260916-007` |
| Portées de ressource | `repository:Patricked-code/MCP`, `src/operationalMemory` |

**Action attendue.** Les données historiques portant le littéral Patricked-code/MCP restent lisibles. Un mismatch entre repository résolu et repository de session donne CONFLICT, jamais une réaffectation silencieuse.

### TASK-20260916-009 — LOT 4 — C3 résolution de serveur, par généralisation

Construire resolveServer() au-dessus de GitRegistry, .mcp/server-map.json et Live State. Nouveau resolver ne signifie pas nouvelle autorité : aucune donnée n’est recopiée hors du registre.

| Champ | Valeur |
| --- | --- |
| `intentKey` | `gwc:lot4-c3-server-resolution` |
| Priorité / séquence | 70 / 9 |
| Dépendances | `TASK-20260916-008` |
| Portées de ressource | `repository:Patricked-code/MCP`, `src/governedWorkflow/resolvers` |

**Action attendue.** Exiger la convergence mapping.serverId = project.productionServerId = identité connue du server-map. Toute divergence donne CONFLICT ou UNVERIFIED, jamais un premier résultat arbitraire.

### TASK-20260916-010 — LOT 5 — C5 résolution de domaine, par généralisation

Construire resolveDomain() sur mapping.domain, mapping.domainVerified, project.publicDomain et historicalVhosts. Aucun Domain Registry supplémentaire.

| Champ | Valeur |
| --- | --- |
| `intentKey` | `gwc:lot5-c5-domain-resolution` |
| Priorité / séquence | 68 / 10 |
| Dépendances | `TASK-20260916-008` |
| Portées de ressource | `repository:Patricked-code/MCP`, `src/governedWorkflow/resolvers` |

**Action attendue.** GW-09 définit un contrat de convergence entre domaine déclaré, domaine du mapping et évidence observée, et non une priorité arbitraire entre sources.

### TASK-20260916-011 — LOT 6 — C4 contrat d’évidence runtime

GitRegistry V2 n’a aucun modèle universel de runtime. Définir un contrat d’évidence séparé exploitant les primitives read-only existantes, sans deviner le runtime depuis le nom du projet.

| Champ | Valeur |
| --- | --- |
| `intentKey` | `gwc:lot6-c4-runtime-evidence` |
| Priorité / séquence | 66 / 11 |
| Dépendances | `TASK-20260916-009`, `TASK-20260916-010` |
| Portées de ressource | `repository:Patricked-code/MCP`, `src/governedWorkflow/resolvers` |

**Action attendue.** Type de runtime, identité de conteneur ou de service et relation au reverse proxy doivent être prouvés par observation. Aucune inférence à partir du nom de projet n’est acceptable.

### TASK-20260916-012 — LOT 7 — D1 héritage, D2 capacités effectives, D3 receipt enrichi

Projeter l’héritage de gouvernance par digest et provenance, intersecter les capacités en fail-closed, et étendre le BootstrapReceipt existant pour le rendre project-aware.

| Champ | Valeur |
| --- | --- |
| `intentKey` | `gwc:lot7-d1-d2-d3` |
| Priorité / séquence | 64 / 12 |
| Dépendances | `TASK-20260916-011` |
| Portées de ressource | `repository:Patricked-code/MCP`, `src/governedContext`, `src/governance` |

**Action attendue.** ClientToolSurfaceAttestation n’a aucun producteur aujourd’hui : le défaut reste CALLABILITY UNKNOWN, AUTHORIZED UNKNOWN, safeNow false. Un outil enregistré n’est jamais une autorisation.

### TASK-20260916-013 — LOT 8 — B3-B Live State et contexte réellement multi-cibles

Conserver une autorité Live State unique avec des projections par cible à stateVersion indépendants, pour qu’un changement sur un projet ne périme pas le receipt d’un autre.

| Champ | Valeur |
| --- | --- |
| `intentKey` | `gwc:lot8-b3b-multi-target-live-state` |
| Priorité / séquence | 62 / 13 |
| Dépendances | `TASK-20260916-012` |
| Portées de ressource | `repository:Patricked-code/MCP`, `src/liveState`, `src/governedContext` |

**Action attendue.** Ne jamais remplacer la cible par le dernier projet demandé : deux agents sur deux projets se voleraient mutuellement le Live State. Aucun second moteur concurrent.

### TASK-20260916-014 — LOT 9 — GW-21 à GW-45 sur le Control Plane réconcilié

Envelopper la surface GitHub issue de la pile réconciliée pour les contrats de développement, de revue et de merge. Ne pas réimplémenter branche, commit, PR, reviews ni merge.

| Champ | Valeur |
| --- | --- |
| `intentKey` | `gwc:lot9-gw21-gw45-github-wrappers` |
| Priorité / séquence | 60 / 14 |
| Dépendances | `TASK-20260916-013` |
| Portées de ressource | `repository:Patricked-code/MCP`, `src/governedWorkflow/github` |

**Action attendue.** Toute attestation de revue est liée au head exact et tout merge passe par expected_head_sha. GITHUB_ORG global doit devenir un contexte GitHub résolu et autorisé, jamais une permission globale.

### TASK-20260916-015 — LOT 10 — GW-46 à GW-67 déploiement et observation

Abstraire ResolvedDeploymentTarget puis adaptateurs par projet. Le pipeline MCP historique devient le premier adaptateur compatible, il n’est pas remplacé.

| Champ | Valeur |
| --- | --- |
| `intentKey` | `gwc:lot10-gw46-gw67-deployment` |
| Priorité / séquence | 58 / 15 |
| Dépendances | `TASK-20260916-014` |
| Portées de ressource | `repository:Patricked-code/MCP`, `src/deploy`, `src/governedWorkflow/deploy` |

**Action attendue.** Un fait runtime ne se déduit jamais de GitHub seul. L’attestation exact-SHA et la vérification du runtime restent des observations indépendantes.

### TASK-20260916-016 — LOT 11 — GW-68 vérification terminale, gate dur

Composer la preuve terminale : merge exact head, CI main verte, déploiement exact-SHA, runtime sain et à la bonne révision, documentation alignée, Live State frais, receipt courant, aucune contradiction.

| Champ | Valeur |
| --- | --- |
| `intentKey` | `gwc:lot11-gw68-terminal-verification` |
| Priorité / séquence | 56 / 16 |
| Dépendances | `TASK-20260916-015` |
| Portées de ressource | `repository:Patricked-code/MCP`, `src/governedWorkflow/terminal` |

**Action attendue.** VERIFIED seulement si tout converge. Ne pas réécrire la Task Queue : GW-68 produit une attestation que GW-69 exigera.

### TASK-20260916-017 — LOT 12 — GW-69 à GW-72 DONE, checkpoint, locks, clôture

Le wrapper GW-69 refuse la transition VERIFYING vers DONE si l’attestation GW-68 est absente, périmée, ou porte une autre tâche, session, dépôt ou révision runtime.

| Champ | Valeur |
| --- | --- |
| `intentKey` | `gwc:lot12-gw69-gw72-closure` |
| Priorité / séquence | 54 / 17 |
| Dépendances | `TASK-20260916-016` |
| Portées de ressource | `repository:Patricked-code/MCP`, `src/governedWorkflow/terminal`, `src/operationalMemory` |

**Action attendue.** Supprime le faux DONE structurellement possible aujourd’hui. GW-72 orchestre fermeture de session et réconciliation de la file sans fusionner leurs stores.

### TASK-20260916-018 — LOT 13 — GW-73 acceptance universelle sur cible non-MCP

Prouver que le même chemin traite un dépôt et un projet non-MCP de bout en bout sans rencontrer Patricked-code/MCP, wealthtech_mcp_ssh_bridge, /opt/apps/wealthtech-mcp-ssh-bridge ni mcp.wealthtechinnovations.com dans le moteur générique.

| Champ | Valeur |
| --- | --- |
| `intentKey` | `gwc:lot13-gw73-universal-acceptance` |
| Priorité / séquence | 52 / 18 |
| Dépendances | `TASK-20260916-017` |
| Portées de ressource | `repository:Patricked-code/MCP`, `tests/governedWorkflowUniversalAcceptance.test.ts` |

**Action attendue.** Stablecoin ne sert que de fixture de scénario. Aucune condition de code du type if project === Stablecoin n’est acceptable dans le moteur GWC.
