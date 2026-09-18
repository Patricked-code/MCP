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
