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
4. lire `docs/gwc/PRECODE_ACTION_TASK_FLOW.txt` et sa projection `.mcp/gwc-precode-action-flow.json` avant toute implémentation runtime GWC ;
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
5. vérifier que les SHA, PR, locks, session, Task Queue et Live State nécessaires sont toujours cohérents ;
6. reprendre directement depuis `NEXT_ACTION` si la preuve reste courante ;
7. sinon marquer la preuve `STALE`/`CONFLICT` et réconcilier avant de poursuivre ;
8. ne jamais rejouer une étape déjà `PASS_WITH_EVIDENCE` encore valide.

### 9.5 Arrêts autorisés

L’agent ne s’arrête que pour un blocker gouverné réel non résoluble depuis les autorités disponibles : permission réellement manquante, ambiguïté non déductible, lock incompatible, conflit d’autorités, dépendance indisponible, secret requis absent, risque destructif/irréversible, gate de sécurité bloquant ou décision humaine explicitement requise par la gouvernance.

Une fin de sous-tâche, un test vert, un commit ou un changement de phase ne sont pas des raisons d’attendre une nouvelle instruction utilisateur lorsque la prochaine action est déductible.

### 9.6 Coordination multi-agent sur une branche GWC partagée

Lorsque plusieurs agents (par exemple Claude et ChatGPT) interviennent sur la même branche, ils doivent appliquer `docs/gwc/PRECODE_MULTI_AGENT_COORDINATION.md`.

Règles minimales obligatoires :

- Claude est le writer PRECODE principal par défaut ; ChatGPT est reviewer/verifier indépendant par défaut ;
- un second agent ne devient writer que sur un scope borné, dependency-satisfied et réellement disjoint ;
- un seul writer par collision domain mutable ;
- relecture du head exact immédiatement avant chaque écriture ;
- si `HEAD_MOVED`, aucune écriture préparée sur l’ancien head n’est publiée avant réobservation et réconciliation ;
- aucun force-push, reset ou écrasement de travail concurrent ;
- tout scope mutable doit laisser une trace durable avec agent, work item, paths, starting head et NEXT_ACTION ;
- les PRECODE scope claims ne sont jamais des `TASK-*`, Governed Tasks ou runtime locks ;
- les fichiers canoniques partagés sont séquentiels par défaut ; le parallélisme n’est permis que pour des scopes/paths/autorités sans collision démontrée.


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

Mise à jour : 2026-09-17T08:30:00+02:00
