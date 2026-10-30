# AGENTS.md — Registre synthétique des agents

## Mode selectable de reprise externe (documentaire, non exécutoire)

Sur demande explicite du propriétaire, l'agent peut sélectionner le profil `EXTERNAL_GOVERNED_RECOVERY` défini dans [la politique GitHub-first](.mcp/github-first-operational-policy.json). Lire alors le [runbook de bifurcation externe](docs/runbooks/GITHUB_FIRST_GOVERNED_RECOVERY.md) **après** l'INTAKE, le HEAD exact et la vérification des propriétaires/collision domains. Le profil ne crée **aucun** claim, session, lock, permission, droit de déploiement ou dispatcher ; la CI, les revues, les permissions E3/OAuth/OIDC et Governed Deploy demeurent obligatoires. Réutiliser la même issue/PR lorsque le périmètre le permet, sinon arrêter l'écriture et réconcilier. Ne jamais déclencher automatiquement ce mode du seul fait qu'une connexion MCP échoue.

## Fil d'Ariane audit obligatoire — mémoire historique sans perte

À chaque arrivée, reprise, fin de lot et handoff, lire et maintenir par **liens de preuves** le [fil d'Ariane historique MCP](docs/governance/agent-historical-continuity-breadcrumbs-20261016.md). Ce document n'est pas une mémoire concurrente : il pointe la chronologie issue #65+, GWB-02/03/04, les quinze jalons PCM, les 94 blueprints du backlog et les checkpoints du bus documentaire existant #235. **Chaque intervenant laisse origine/parent, baseline datée et SHA, faits et états non prouvés, décisions/écarts, propriétaire réellement vérifié et collision domain, preuves exact-head, `NEXT_ACTION` et critère d'acceptation.** Conserver les anciens checkpoints comme historiques en les reliant à leurs successeurs. Ne jamais marquer `AUDIT_CONSOLIDATED` ou `GLOBAL_MCP_COMPLETE` sans couvertures et preuves requises ; ne pas déclarer exécuté ce qui est seulement planifié. Ne pas modifier les documents partagés dans une PR parallèle sur le même périmètre : réconcilier d'abord le HEAD et les domaines de collision.

## Protocole vérifiable d'entrée et de reprise — INTAKE du 16 octobre 2026

**Application à toute arrivée et à toute reprise autorisée, quelle que soit la plateforme de l'agent.** Lire la [directive déposée dans l'issue maîtresse #235](https://github.com/Patricked-code/MCP/issues/235#issuecomment-6203867094) avant de commencer un nouveau lot. Ce protocole précise les instructions déjà présentes ; il n'ajoute aucune autorité, file, rôle runtime ou permission.

1. **READ** — lire `README.md`, `CLAUDE.md`, `AGENTS.md`, le début courant de `SUIVI.md`, `docs/governance/README.md`, la carte PCM-00..14, le Program Backlog V2, le workblock GWB-00..09 et les derniers checkpoints de l'issue #235 ; ne jamais considérer `MASTER_RESUME_MEMORY.md` ou une ancienne projection comme état actuel.
2. **REOBSERVE** — relever la date/heure d'observation, le HEAD exact de `main`, les PR/branches actives, la CI, le Governed Deploy et les décisions applicables. Vérifier le périmètre du mandat ; distinguer les éléments `DONE` prouvés, `READY` de planification, `UNKNOWN` et `BLOCKED`.
3. **CONTINUITY CHECK** — reconnaître la PR #300 comme fusionnée dans `main@cc31ce12bea236b4cfb31d99ecee700c543f0c17`, CI #38812707495 et Deploy #38812707629 réussis sur cet exact SHA au 15/10/2026 ; cette preuve est historique et ne certifie ni le nouvel HEAD ni la fin du programme. Point de reprise documenté : PCM-03/GWB-04, validation comportementale `TB-W4-H-01`, puis `TB-W4-K-01`, puis autres candidats `READY` admissibles, en consultant `docs/governance/gwb04-ready-ownership-20261015.json`. Ne pas rejouer une étape déjà prouvée.
4. **OWNERSHIP / COLLISIONS** — privilégier `RESUME_OWNED_FIRST` (uniquement sa propre Task/PR réellement détenue), sinon `FIRST_COLLISION_FREE_IN_PROGRAM_ORDER`. Vérifier les dépendances, scopes et collision domains ; préserver l'ownership de la PR OAuth #207, de la pile #88→#89→#90 et des issues F-03 #262 / F-04 #268. Une PR candidate ou un blueprint `READY` ne prouve aucun claim runtime.
5. **TRANSPORT** — respecter `.mcp/github-first-operational-policy.json` : GitHub direct d'abord, puis GitHub Actions/OIDC en lecture seule si une preuve serveur est nécessaire, puis workflow de write borné existant seulement avec autorisation ; bridge runtime uniquement si une capacité nécessaire n'a aucun fallback approuvé. Ne pas forcer OAuth interactif en présence d'un fallback, désactiver les contrôles de consentement, ni modifier directement S1/S2.
6. **RUNTIME GATE** — pour toute opération sur les autorités runtime, obtenir et vérifier sa propre session gouvernée/lease, bootstrap receipt et droits réels, puis réobserver les révisions de Task Queue/Locks et utiliser le claim CAS existant. Le snapshot OIDC #301/#302/#303 du 16/10 à 00h35 CEST (0 ACTIVE, 2 EXPIRED, 2 READY sans owner, 0 locks) est historique et n'autorise aucune reprise de session ni takeover.
7. **CHECKPOINT / NEXT** — après chaque étape significative, enregistrer dans les canaux existants (PR/issue de lot, #235, `SUIVI.md`, `CHANGELOG.md`, `DECISIONS_LOG.md` si applicable) le scope, l'identité ou la session **uniquement si attestée**, les SHA exacts, les preuves, les tests, les résultats CI/Deploy, les réserves et un unique `NEXT_ACTION`. Si le HEAD a changé : `HEAD_MOVED → STOP_WRITE → REOBSERVE → RECONCILE → VERIFY`.
8. **CONTINUE** — reprendre les tâches éligibles et indépendantes sans bloquer tout le programme à cause d'un lot local. Un commentaire GitHub est un journal partagé consultable, **pas** un bus temps réel : aucun ACK, réveil ou adoption par une conversation déjà ouverte n'est présumé. Ne déclarer `GLOBAL_MCP_COMPLETE` qu'après les acceptations terminales backend, clients et cockpit.

**Contrôle de reprise à froid :** un agent accédant uniquement au dépôt doit pouvoir produire avant exécution `observedAt / exactHead / confirmedCompleted / unfinishedWork / ownedWork / collisionDomains / runtimeAuthority / NEXT_ACTION / evidenceLinks`. Une information inconnue reste `UNKNOWN` ; un accès documentaire ne devient jamais un droit runtime. Aucun nouveau dispatcher, Task Queue ou gate artificielle.

## Carte de priorité obligatoire pour les agents entrants

Lire la [carte de convergence PCM-00..14](docs/governance/mcp-priority-convergence-map-20261015.json) et l'[index gouverné](docs/governance/README.md) **avant de proposer une nouvelle tâche, branche ou implémentation**. Les 94 blueprints y figurent comme un snapshot en ordre de planification ; seul `program:next` et la Governed Task Queue live déterminent ce qui est aujourd'hui exécutable. Priorité à la propre Task déjà possédée ; aucune reprise du claim d'un autre agent. Signaler son scope/Task/PR et ses dépendances dans les canaux de gouvernance existants, vérifier les collisions puis checkpoint avec `NEXT_ACTION` après chaque étape. Les agents avec tâches indépendantes peuvent travailler simultanément. Aucune nouvelle file, identité, permission ou gate humaine n'est créée par cette carte.



## Reprise de l'audit / handoff inter-agents (2026-10-15)

Tout nouvel agent autorisé doit lire `CLAUDE.md`, `SUIVI.md` (premier checkpoint), puis l'[index de reprise](docs/governance/README.md), le Program Backlog V2, le workblock GWB-00..09 et l'issue maîtresse [#235](https://github.com/Patricked-code/MCP/issues/235). **Cette lecture permet de retrouver le plan sans dépendre d'une session ChatGPT**, mais ne constitue ni une identité runtime ni une permission de mutation.

Avant de commencer : comparer les références documentaires au `main` live, reconstituer les PR et les preuves, privilégier le travail possédé par sa session puis `FIRST_COLLISION_FREE_IN_PROGRAM_ORDER`; vérifier les autorités Task Queue, Session, Claim et Lock uniquement lorsqu'elles sont nécessaires. Le calcul read-only `nextWork` ne claim ni ne matérialise automatiquement. Un agent sans accès GitHub ou sans autorisation ne peut pas récupérer ces documents par hypothèse.

Chaque modification laisse un commit/PR, un contrôle CI et, selon le périmètre, `SUIVI.md`, `CHANGELOG.md`, `DECISIONS_LOG.md`, les checkpoints et l'attestation de déploiement ; **ne jamais inventer une trace absente** ni exposer de secrets. Un événement de lecture ne crée pas à lui seul une preuve runtime.


## 1. Rôle du fichier

Ce fichier liste les agents humains/IA/MCP, leurs responsabilités et leurs limites d’action.

## 2. Contexte MCP

Projet : WealthTech MCP SSH Bridge
Dépôt GitHub attendu : Patricked-code/MCP
Branche officielle : main
Chemin serveur validé : /opt/apps/wealthtech-mcp-ssh-bridge

Règles transversales :
- ne jamais coder à l’aveugle ;
- lire SUIVI.md et les fichiers de mémoire avant action ;
- ne jamais écrire de secrets, tokens, mots de passe, clés privées ou .env dans Git ;
- ne jamais écraser un fichier existant sans lecture préalable ;
- ne jamais supprimer sans inventaire ;
- documenter toute action importante dans SUIVI.md, CHANGELOG.md et DECISIONS_LOG.md ;
- conserver la logique parent/enfant : racine MCP globale, puis docs/projects/<projet>/ pour chaque projet intégré.


## 3. Fonctionnement attendu

Ce fichier doit être utilisé comme une pièce de mémoire opérationnelle. Il doit informer, contraindre, guider et tracer. Il ne doit pas être vide et ne doit pas servir de simple placeholder.

## 4. Règles applicables

- Lire ce fichier avec `SUIVI.md` avant les actions liées à son périmètre.
- Conserver les informations existantes lorsqu’un équivalent existe dans `docs/` ou `memory/`.
- Ne jamais transformer une hypothèse en certitude.
- Écrire `À vérifier` lorsqu’une donnée n’a pas été confirmée.
- Lier les tâches exécutables à `TASKS.md`.
- Lier les décisions à `DECISIONS_LOG.md`.
- Lier les changements visibles à `CHANGELOG.md`.

## 5. Informations à vérifier

- Cohérence avec `docs/AGENTS.md` si ce fichier existe.
- Cohérence avec `memory/AGENTS.md` si ce fichier existe.
- Cohérence avec les fichiers `.mcp/*.json`.
- Cohérence avec le dépôt GitHub `Patricked-code/MCP`.
- Cohérence avec le serveur `/opt/apps/wealthtech-mcp-ssh-bridge`.

## 6. Mise à jour

Ce fichier doit être enrichi au fur et à mesure de l’intégration des projets, de l’audit des dépôts, des changements d’agents et des décisions humaines.

## 7. Historique

- 2026-07-09 : création racine par écriture contrôlée MCP, sans secret, sans suppression et sans modification applicative.

## 7.1 Program Backlog V2 — continuité automatique commune à tous les agents

Tout agent humain ou IA qui reprend le dépôt charge `docs/governance/program-backlog-convergence.json`, exécute `npm run program:readiness` puis consulte `npm run program:next`. La sélection planning suit `FIRST_COLLISION_FREE_IN_PROGRAM_ORDER`; les autorités runtime et UAC restent obligatoires avant tout claim ou write.

Boucle commune : `OBSERVE → RECOMPUTE_READINESS → SELECT → CHECK_COLLISIONS → MATERIALIZE/CLAIM → EXECUTE → VERIFY → CHECKPOINT → RECOMPUTE`. Tant qu'un prochain lot est dependency-safe, collision-safe et ne requiert aucune gate humaine, l'agent continue sans demander une confirmation de routine.

Le moteur de readiness est une projection Git versionnée : il ne crée pas de Task, ne claim rien, ne libère aucun ownership, ne contourne aucun lock et ne transforme jamais un `DEFERRED`/`CONDITIONAL` en `READY`.

## 8. GWC — architecture et mémoire canonique de continuité

Pour toute intervention liée à GWC, au Universal Resolver, aux 73 contrats, aux blueprints GWC ou à leur future matérialisation en Governed Tasks :

1. lire `docs/gwc/README.md` ;
2. lire `docs/gwc/canonical-memory/current.json` pour résoudre le bundle de continuité courant ;
3. vérifier le bundle sélectionné avec un Canonical Memory Verifier compatible avant d’en projeter les claims ;
4. lire ensuite les projections `.mcp/gwc-contracts.json`, `.mcp/gwc-workflow-graph.json`, `.mcp/gwc-blueprints.json` et `.mcp/gwc-evolution-design.json` selon le besoin ;
5. réobserver les autorités live applicables avant toute mutation.

La mémoire canonique GWC fournit de la **continuité et de la provenance**, jamais une approbation live. Un claim `historical_authority` ne remplace ni GitHub live, ni la Governed Task Queue, ni la Governed Session, ni le Bootstrap Receipt, ni les locks, ni Live State, ni le runtime. Un ancien bundle reste immuable ; une phase plus récente est portée par un nouveau bundle et le pointeur `current.json`.


---

## Règle permanente — double présence, non-régression et amélioration continue

GitHub est la source versionnée.

Le serveur MCP est la source exécutée.

Les deux doivent toujours être vérifiés ensemble avant et après toute intervention.

Aucune IA ne doit supposer que GitHub et le serveur sont synchronisés sans vérification.

Toute intervention humaine, IA ou automatisée doit respecter :

- non-régression obligatoire ;
- amélioration continue obligatoire ;
- aucune suppression destructive sans sauvegarde, justification et validation ;
- aucun secret dans GitHub ;
- vérification GitHub + serveur avant modification ;
- documentation dans `SUIVI.md` après modification ;
- vérification service, logs et endpoints après déploiement.

---

<!-- MCP-GOVERNANCE-MANUAL-REFERENCE -->

## Référence MCP anti-dispersion et manuel complet

Cette documentation renvoie aux fichiers de gouvernance ajoutés :

- MCP_ANTI_DISPERSION_GOVERNANCE.md
- MCP_FUNCTIONS_AND_TOOLS_MANUAL.md
- MCP_FUNCTIONAL_CARTOGRAPHY.md
- MCP_CONNECTION_IDENTITY_MODEL.md
- MCP_INTELLIGENT_USAGE_MODE.md
- .mcp/branch-governance.json
- .mcp/function-cartography.json
- .mcp/identity-policy.json

Règles permanentes :

- pas de travail isolé ;
- pas de push direct sur main ;
- branches MCP sous mcp/* ;
- PR draft obligatoire pour changement significatif ;
- double vérification GitHub vers serveur ;
- documentation dans SUIVI.md ;
- DirtyCount à zéro avant pull, merge, deploy, migration ou nettoyage ;
- non-régression obligatoire.

Mise à jour : 2026-07-09T20:08:09Z

## GitHub-first operational continuity

Current post-integration bootstrap rule:

- GitHub connectivity is sufficient to reconstruct continuity and continue all GitHub-bounded work.
- Do not request or require `wealthtech_ssh_bridge`, a Governed Session, Task Queue mutation, locks or Live State merely to know where the project is or to perform repository/branch/PR/CI/review work.
- Read `.mcp/github-first-operational-policy.json` and resolve the next bounded operation with `resolveGithubFirstOperationalBootstrap()`.
- Use `GITHUB_ONLY` when GitHub is sufficient.
- Use `GITHUB_ACTION_READONLY_EVIDENCE` when fresh server evidence is required and the protected read-only fallback is configured.
- Escalate to `RUNTIME_REQUIRED` only for the exact operation that genuinely needs runtime authority, Operational Memory mutation, server write, or a runtime capability without an approved GitHub fallback.
- Existing runtime authorities remain authoritative in their scopes; GitHub-first defers them when irrelevant and never fabricates their state.
- The read-only fallback never authorizes pull, deploy, restart, arbitrary shell, server-to-GitHub push or direct server-side versioned-code edits.

Canonical machine policy: `.mcp/github-first-operational-policy.json`.
Design: `docs/superpowers/specs/2026-09-20-github-first-operational-continuity-v1-design.md`.
