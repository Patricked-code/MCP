# CLAUDE.md — Porte d’entrée Claude Code

## 1. Rôle du fichier

Ce fichier indique à Claude Code comment intervenir sur le dépôt MCP sans régression, sans action aveugle et sans écriture de secrets.

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

- Cohérence avec `docs/CLAUDE.md` si ce fichier existe.
- Cohérence avec `memory/CLAUDE.md` si ce fichier existe.
- Cohérence avec les fichiers `.mcp/*.json`.
- Cohérence avec le dépôt GitHub `Patricked-code/MCP`.
- Cohérence avec le serveur `/opt/apps/wealthtech-mcp-ssh-bridge`.

## 6. Mise à jour

Ce fichier doit être enrichi au fur et à mesure de l’intégration des projets, de l’audit des dépôts, des changements d’agents et des décisions humaines.

## 7. Historique

- 2026-07-09 : création racine par écriture contrôlée MCP, sans secret, sans suppression et sans modification applicative.


## 7.1 Programme maître post-UAC — Program Backlog V2

Pour toute nouvelle connexion/reprise sur `main` après UAC, l'agent doit charger le programme courant avant de choisir une implémentation :

1. lire `CLAUDE.md` puis le début courant de `SUIVI.md` ;
2. lire `docs/governance/program-backlog-convergence.json` (**Program Backlog V2**) ;
3. réobserver GitHub `main`, PR/branches actives et les autorités runtime réellement nécessaires ;
4. appliquer `SELECT_READY_BLUEPRINT` uniquement sur un blueprint dont `readiness.state = READY` ;
5. recontrôler dépendances, collision domains, Governed Task Queue, Governed Session et Governed Lock Service avant toute matérialisation/claim runtime ;
6. ne jamais transformer un Task Blueprint en permission : `createsRuntimeTask=false` reste invariant ;
7. si le HEAD a bougé, appliquer `HEAD_MOVED → STOP_WRITE → REOBSERVE → RECONCILE → VERIFY → WRITE` ;
8. laisser preuves, checkpoint et `NEXT_ACTION` afin que le prochain agent reprenne depuis le dépôt, sans dépendre de la conversation précédente.

Un blueprint `DONE` ne se rejoue pas tant que sa preuve reste valide. Un blueprint `BLOCKED`, `DEFERRED` ou `CONDITIONAL` ne devient jamais exécutable par simple initiative de l'agent. La **Governed Task Queue** reste l'unique autorité de tâche runtime.

## 8. GWC — architecture et mémoire canonique de continuité

Pour toute intervention liée à GWC, au Universal Resolver, aux 73 contrats, aux blueprints GWC ou à leur future matérialisation en Governed Tasks :

1. lire `docs/gwc/README.md` ;
2. lire `docs/gwc/canonical-memory/current.json` pour résoudre le bundle de continuité courant ;
3. vérifier le bundle sélectionné avec un Canonical Memory Verifier compatible avant d’en projeter les claims ;
4. lire `docs/gwc/PRECODE_EXECUTION_PLAN.txt`, `docs/gwc/PRECODE_ACTION_TASK_FLOW.txt` et sa projection `.mcp/gwc-precode-action-flow.json` avant toute construction candidate GWC ;
5. lire `docs/gwc/PRECODE_MULTI_AGENT_COORDINATION.md` avant toute écriture sur une branche GWC partagée par plusieurs agents ;
6. lire ensuite les projections `.mcp/gwc-contracts.json`, `.mcp/gwc-workflow-graph.json`, `.mcp/gwc-blueprints.json` et `.mcp/gwc-evolution-design.json` selon le besoin ;
7. réobserver les autorités live applicables avant toute mutation.

La mémoire canonique GWC fournit de la **continuité et de la provenance**, jamais une approbation live. Un claim `historical_authority` ne remplace ni GitHub live, ni la Governed Task Queue, ni la Governed Session, ni le Bootstrap Receipt, ni les locks, ni Live State, ni le runtime. Un ancien bundle reste immuable ; une phase plus récente est portée par un nouveau bundle et le pointeur `current.json`.

## 9. GWC — continuité autonome et traces durables obligatoires

La continuité ne doit jamais dépendre de la mémoire de la conversation, de la session Claude en cours, d’un affichage terminal ou d’un résumé non versionné. Tout agent doit laisser assez de traces durables pour qu’un autre agent puisse reprendre exactement, sans refaire les travaux validés et sans deviner le prochain pas.

### 9.1 Boucle autonome obligatoire

Tant qu’aucun blocker gouverné réel n’exige une décision humaine non déductible, l’agent doit exécuter la boucle suivante sans demander « dois-je continuer ? » :

`OBSERVE → FIND NEXT ELIGIBLE WORK ITEM → EXECUTE → VERIFY → RECORD EVIDENCE → CHECKPOINT → REOBSERVE IF NEEDED → FIND NEXT ELIGIBLE WORK ITEM`.

Pour GWC pré-code, le prochain élément est le premier `GWC-PRE-*` dont les dépendances sont satisfaites et qui n’est pas `PASS_WITH_EVIDENCE`. Une preuve historique ne devient pas automatiquement courante : elle doit être revalidée contre le head exact et l’autorité propriétaire avant réutilisation.

### 9.2 Checkpoint durable minimal obligatoire

Après chaque work item significatif, et obligatoirement avant toute interruption volontaire, changement de phase, fermeture de session ou risque de perte de contexte, laisser une trace durable contenant au minimum :

- `workItemId` / `taskId` lorsqu’une vraie Governed Task existe ;
- repository, branche et `HEAD_SHA` exacts ;
- base SHA / PR / head PR lorsqu’applicables ;
- phase et statut courant (`PENDING`, `IN_PROGRESS`, `PASS_WITH_EVIDENCE`, `BLOCKED`, `CONFLICT`, `STALE`, `N/A`) ;
- ce qui était attendu ;
- ce qui a réellement été observé ou produit ;
- fichiers lus/modifiés et artefacts concernés ;
- autorités consultées ;
- preuves et références vérifiables ;
- commandes/tests/checks exécutés et résultats ;
- findings découverts ou résolus ;
- décisions appliquées et leur source ;
- invariants vérifiés ;
- blocker exact et reason code s’il existe ;
- dépendances encore ouvertes ;
- `NEXT_ACTION` unique et exécutable ;
- date/heure d’observation et fraîcheur pertinente.

Un statut `PASS_WITH_EVIDENCE` sans références de preuve relisibles est invalide. Un statut `DONE` sans conditions terminales réobservées est interdit.

### 9.3 Où tracer

Utiliser les autorités et projections existantes, jamais un second système parallèle :

- `docs/gwc/canonical-memory/current.json` : pointeur de continuité vers le bundle courant ;
- bundle canonique GWC : checkpoint durable de phase lorsque la phase courante change ;
- `SUIVI.md` : progression, état de reprise, résultats, blockers et prochaine action ;
- `CHANGELOG.md` : changements versionnés réellement introduits ;
- `DECISIONS_LOG.md` : décisions d’architecture/gouvernance effectivement prises ;
- Governed Task Queue / Operational Memory : uniquement pour les vraies Governed Tasks runtime, jamais pour fabriquer artificiellement les blueprints ou `GWC-PRE-*` ;
- PR/commits/checks : preuves GitHub exact-head et historique de modification.

Ne jamais créer un store, journal, Task Queue ou mémoire parallèle uniquement pour cette continuité.

### 9.4 Reprise par un nouvel agent

À toute reprise, l’agent doit :

1. lire `CLAUDE.md` ;
2. résoudre `docs/gwc/canonical-memory/current.json` ;
3. lire le checkpoint courant et `SUIVI.md` ;
4. réobserver GitHub et les autorités live applicables ;
5. vérifier le SHA/PR/head GitHub exact et les preuves nécessaires au work item ; Task Queue, runtime locks, Governed Session et Live State ne sont requis que lorsqu'une preuve historique/live spécifique est réellement nécessaire, jamais comme moteur du candidate build ;
6. reprendre directement depuis `NEXT_ACTION` si la preuve reste courante ;
7. sinon marquer la preuve `STALE`/`CONFLICT` et réconcilier avant de poursuivre ;
8. ne jamais rejouer une étape déjà `PASS_WITH_EVIDENCE` encore valide.

### 9.4.1 PRECODE — preuves sans OAuth/bridge

Pendant `PREINTEGRATION_EVOLVED_CANDIDATE_BUILD`, l'OAuth du serveur MCP et `wealthtech_ssh_bridge` ne sont pas des dépendances requises pour progresser.

Ordre de preuve :

1. audits et historiques versionnés (`docs/audits/**`, `docs/history/**`, canonical-memory) ;
2. GitHub live et artefacts CI exact-head ;
3. futur miroir serveur read-only publié dans GitHub, indépendant du MCP/OAuth, uniquement si une preuve fraîche strictement nécessaire manque.

Le miroir serveur read-only doit utiliser une identité à moindre privilège/forced-command, uniquement des commandes d'audit allowlistées et redacted, produire un artefact avec `observedAt`, digests et fraîcheur, et ne jamais disposer d'une surface de mutation, restart, deploy, Task claim ou lock.

Si la preuve nécessaire n'existe pas ou est périmée : `UNKNOWN` / `STALE`. Ne jamais ouvrir une Governed Session runtime simplement pour débloquer un work item PRECODE.

### 9.5 Arrêts autorisés

L’agent ne s’arrête que pour un blocker gouverné réel non résoluble depuis les autorités disponibles : permission réellement manquante, ambiguïté non déductible, lock incompatible, conflit d’autorités, dépendance indisponible, secret requis absent, risque destructif/irréversible, gate de sécurité bloquant ou décision humaine explicitement requise par la gouvernance.

Une fin de sous-tâche, un test vert, un commit ou un changement de phase ne sont pas des raisons d’attendre une nouvelle instruction utilisateur lorsque la prochaine action est déductible.

### 9.6 Coordination multi-agent — programme GWC/PRECODE PR #95 uniquement

Pour le programme d’évolution GWC/PRECODE porté par la PR #95 et la branche en ligne `claude/ecstatic-edison-v1dyt1`, appliquer obligatoirement `docs/gwc/PRECODE_MULTI_AGENT_COORDINATION.md`.

Règles minimales obligatoires :

- Claude, ChatGPT et les autres agents autorisés sont des exécutants pairs pour ce programme ; aucun agent n’est propriétaire permanent du chantier ;
- l’ownership est temporaire, borné au `workItemId` / collision domain / session active ;
- ChatGPT peut écrire lorsqu’un élément PRECODE attendu est absent, incomplet, stale ou à corriger, si le scope est libre et dependency-satisfied ; Claude peut faire exactement de même ;
- tout agent qui revient après le travail d’un autre doit lire et comprendre les sessions, commits, diffs, preuves, findings, checkpoints et handoffs intervenus avant toute nouvelle écriture ;
- chaque session est identifiée par un `GWC-PRE-SESSION-*` durable et, si disponible, son `providerSessionRef` ;
- chaque action s’inscrit dans la hiérarchie `PROGRAM → PHASE → WORK ITEM → SESSION → ACTION → EVIDENCE → HANDOFF` ;
- un seul writer par collision domain mutable ; plusieurs reviewers/readers sont permis ;
- le head exact de la branche GitHub en ligne doit être relu immédiatement avant toute écriture ;
- si `HEAD_MOVED`, arrêter l’écriture, lire le travail intervenu, le comprendre, réconcilier puis seulement reprendre ;
- aucun force-push, reset ou écrasement de travail concurrent ;
- chaque session laisse `SESSION_START`, checkpoints significatifs, `SESSION_HANDOFF` si transfert et `SESSION_END` quand elle se termine normalement ;
- tout checkpoint/handoff porte les preuves, head exact, statut, findings, dépendances et `NEXT_ACTION` ;
- les PRECODE scope/session traces ne sont jamais des `TASK-*`, Governed Tasks, runtime locks ou nouvelles autorités ;
- toutes les écritures durables de ce programme ciblent la branche GitHub en ligne `claude/ecstatic-edison-v1dyt1` ; aucune branche de développement parallèle n’est créée ; un workspace local éventuel est seulement une surface d’exécution éphémère synchronisée sur le head en ligne et ne constitue jamais une autorité ;
- `GWC-PRE-GATE-01 = PASS_WITH_EVIDENCE` autorise et déclenche la **construction candidate sur la branche Claude** : code `src/**`, tests, workflows, scripts, types, migrations additives, wrappers, extensions et généralisations sont permis et attendus ;
- les phases B/C/D/E/F sont les phases actives de construction candidate : backlog complet → safety/foundations → implémentation branch-local GWC-0..17 → acceptance candidate ;
- les work items PRECODE/candidate ne deviennent jamais automatiquement des `TASK-*`, Governed Tasks ou runtime locks ;
- `main`, S1, production, déploiement et activation live restent gelés jusqu'à `FINAL_PRECODE_VERSION_ACCEPTED` ;
- après `FINAL_PRECODE_VERSION_ACCEPTED`, un cycle d'intégration séparé réobserve l'état réel, réconcilie le drift puis intègre la candidate déjà construite selon la gouvernance alors courante.

Dans ce périmètre précis, toute ancienne règle attribuant Claude comme writer principal permanent ou ChatGPT comme reviewer-only est remplacée par l’ownership temporaire par scope/session décrit ci-dessus.

---

### 9.7 Distinction candidate vs projet réel

Pour PR #95, `claude/ecstatic-edison-v1dyt1` est une **branche candidate complète**, pas une branche de documentation uniquement.

Après le gate d'architecture, l'agent doit progressivement y construire la version évoluée à partir du squelette existant, en préservant l'existant et en appliquant `REUSE → WRAP → GENERALIZE → EXTEND → NEW`.

Cette autorisation porte sur le contenu de la branche candidate. Elle ne constitue jamais une autorisation de merge `main`, écriture S1, déploiement, restart, runtime Task, runtime lock ou activation live.

La condition terminale du candidate build est `FINAL_PRECODE_VERSION_ACCEPTED` / `EVOLVED_CANDIDATE_READY_FOR_INTEGRATION`.

### 9.8 Bootstrap automatique PRECODE GitHub-first, multi-agent et informations de conversation

Pour PR #95 / `claude/ecstatic-edison-v1dyt1`, la connexion PRECODE se fait **directement via GitHub et les artefacts versionnés de la branche**. Le MCP runtime n'est pas une dépendance du candidate build.

Toute nouvelle IA autorisée (Claude, ChatGPT ou autre agent compatible) doit, dès sa connexion/reprise :

1. observer le repository, la branche et le HEAD GitHub exact ;
2. lire la mémoire canonique, le bundle courant, le status PRECODE et le dernier checkpoint/handoff ;
3. collecter uniquement les identifiants réellement exposés par le client/GitHub ;
4. résoudre ou créer une `candidateSessionId` branch-local ;
5. ne jamais inventer un véritable identifiant de conversation ChatGPT/Claude : si absent, conserver `providerConversationRef=null` avec provenance `UNAVAILABLE` ;
6. déterminer le mode PRECODE :
   - `NEW_INFORMATION_INTAKE`,
   - `CONTINUE_PRECODE_WORK`,
   - `NEW_INFORMATION_THEN_CONTINUE_PRECODE` ;
7. si le mode est déductible du message, ne pas poser de question redondante ;
8. si le message dit seulement « connecte-toi » et que l'intention reste ambiguë, demander exactement si l'utilisateur vient :
   - apporter de nouvelles informations,
   - poursuivre le travail PRECODE,
   - ou apporter des informations puis poursuivre automatiquement ;
9. analyser les nouvelles informations présentes dans la conversation lorsque le mode le requiert ;
10. ne projeter que des insights bornés et structurés — jamais persister le transcript brut par ce mécanisme ;
11. réconcilier ces insights avec la mémoire canonique et les work items candidate ;
12. classer chaque insight en `DUPLICATE / COMPLEMENT / DECISION / FINDING / TASK / CONTRADICTION / MEMORY` ;
13. appliquer les enrichissements non conflictuels à la mémoire/backlog avec provenance ;
14. mettre toute contradiction/supersession en `HOLD_FOR_REVIEW` au lieu d'écraser silencieusement une règle active ;
15. pour les modes de continuation, reprendre le claim candidate actif de cette session s'il existe, sinon sélectionner le prochain work item READY dont les dépendances sont DONE et les collision domains libres ;
16. reobserver le HEAD avant d'enregistrer session/claim ; si le HEAD a bougé, appliquer `HEAD_MOVED → REOBSERVE → RECONCILE → REDISPATCH` ;
17. exécuter `RED → GREEN → régression → preuves → checkpoint/handoff` ;
18. mettre à jour la mémoire canonique et `NEXT_ACTION` après tout changement significatif.

Implémentation candidate : `src/governedContext/candidateContinuity.ts`.
Entrée logique : `bootstrapCandidateConnection()`.
Projection branch-local : `.mcp/gwc-precode-status.json > candidateCoordination / githubFirstCandidateBootstrap`.
Tests : `tests/candidateContinuity.test.ts`.

Compatibilité : les anciennes candidate sessions dépourvues de `connectionInstanceRef` restent lisibles et sont enrichies au prochain resume.

Cette capacité ne crée aucune seconde Task Queue, aucune seconde Operational Memory, aucune Governed Session runtime et aucun runtime lock. Elle ne donne aucune autorisation de merge `main`, écriture S1, déploiement ou activation live avant `FINAL_PRECODE_VERSION_ACCEPTED`.

### 9.9 Continuité incrémentale des nouvelles informations et Coherence Gate

Sur `claude/ecstatic-edison-v1dyt1`, une nouvelle information n'est jamais une nouvelle règle par défaut.

Avant toute adoption dans la mémoire canonique ou le backlog candidate, appliquer obligatoirement :

`NEW_INFORMATION_INTAKE → STRUCTURATION → QUALITY/EVIDENCE → OBJECTIVE ALIGNMENT → EXISTING SEARCH → ARCHITECTURE FIT → AUTHORITY FIT → NON-REGRESSION → IMPACT → INTEGRATION VERDICT → RECONCILIATION RECEIPT`.

Règles obligatoires :

- numéroter les intakes de manière monotone `NEW_INFORMATION_INTAKE-NNN` ;
- conserver seulement la provenance/digest/insights bornés, jamais le transcript brut par ce mécanisme ;
- maintenir le cursor `latestIntakeSequence / reconciledThroughSequence / canonicalRevision / backlogRevision / pendingIntakeIds / lastReconciliationDigest` dans les projections PRECODE existantes ;
- ne réconcilier qu'un delta contigu ; un trou de séquence échoue fermé ;
- utiliser uniquement les verdicts `ACCEPT / ACCEPT_WITH_ADAPTATION / COMPLEMENT / DUPLICATE / DEFER / HOLD_FOR_REVIEW / OUT_OF_SCOPE / REJECT` ;
- `PARALLEL_AUTHORITY => REJECT` ;
- contradiction/supersession/breaking change => `HOLD_FOR_REVIEW`, jamais écrasement silencieux ;
- information factuelle exigeant une preuve et restant `UNVERIFIED` => `DEFER` ;
- rechercher d'abord un work item existant compatible et l'enrichir/réconcilier avant de proposer un nouveau work item ;
- chaque lot réconcilié doit produire un receipt digesté avec séquences, intakes, revisions avant/après et effets ;
- canonicalRevision/backlogRevision ne changent que si des effets acceptés modifient réellement leurs projections ;
- avant toute écriture candidate, valider `HEAD_SHA + canonicalRevision + backlogRevision` ;
- `HEAD_MOVED` garde la priorité et impose la réconciliation Git complète ;
- un drift de connaissance ne bloque que les work items affectés : `LOCAL_BLOCKER != GLOBAL_STOP` ;
- un agent dont le scope n'est pas touché peut rafraîchir sa révision logique et continuer ;
- un work item touché passe `RECONCILE_REQUIRED` avant nouvelle écriture ;
- les agents travaillent depuis l'état réconcilié, jamais directement depuis un intake brut ;
- préserver la séparation `INTAKE != CANONICAL MEMORY != CANDIDATE WORK ITEM != RUNTIME TASK`.

État initial de ce mécanisme : `latestIntakeSequence=2`, `reconciledThroughSequence=0`, `canonicalRevision=1`, `backlogRevision=0`, pending `#001/#002`. Ces deux bundles existaient déjà avec `canonicalAdoptionPerformed=false` et restent donc à évaluer/reconcilier sous ce gate avant consommation par `GWC-PRE-B-01`.

Implémentation candidate :
- `registerCandidateIntake()`
- `evaluateCandidateIntakeGate()`
- `reconcileCandidateIntakeBatch()`
- `assessCandidateKnowledgeFreshness()`

Preuves : RED CI #1080 `c63beb0...`, GREEN CI #1081 `f288d3e...`.

## Règle permanente — double présence, non-régression et amélioration continue

GitHub est la source versionnée.

Le serveur MCP est la source exécutée.

Les deux doivent toujours être vérifiés ensemble avant et après toute intervention.

Exception bornée PR #95 : pendant le **candidate build branch-only**, aucune connexion serveur live n'est requise pour chaque modification. Utiliser d'abord les audits/versioned evidence/GitHub ; le serveur réel est réobservé au moment de l'intégration ou lorsqu'une preuve live précise est indispensable.

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

Mise à jour : 2026-09-17T08:40:00+02:00

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

### Client-surface preservation rule

This rule is permanent and applies post-integration and during recovery:

- Keep the `@GitHub` surface exposed and usable by default.
- Do **not** ask the user to expose or switch to `wealthtech_ssh_bridge` merely because a direct runtime tool is absent from the client, its schema is stale, or a server fact is needed.
- Before requesting the bridge, exhaust the approved GitHub-first paths applicable to the exact operation: `GITHUB_ONLY`, then the dedicated GitHub Actions/OIDC fallback (`GITHUB_ACTION_READONLY_EVIDENCE` or an approved bounded-write workflow).
- In clients where exposing `wealthtech_ssh_bridge` can evict or hide the `@GitHub` surface, preserving GitHub is mandatory whenever GitHub or an approved fallback can complete the operation.
- A client-surface switch is never a substitute for the existing GitHub fallback.
- Request bridge exposure only when all three are true: the exact operation is identified, it genuinely requires live runtime authority, and no approved GitHub fallback exists for that operation.
- If bridge use becomes genuinely necessary, keep its scope limited to the live-only evidence/action and do not reinterpret that temporary capability as the new bootstrap path.
- Never alternate GitHub ↔ bridge simply to chase tool availability; prefer continuity of the GitHub control plane and fail closed on unavailable live-only evidence.

Canonical machine policy: `.mcp/github-first-operational-policy.json`.
Design: `docs/superpowers/specs/2026-09-20-github-first-operational-continuity-v1-design.md`.
