# Mandatory Agent Bootstrap & Work Orchestration V1 — Design intégré

- Date : 2026-08-22
- Dépôt : `Patricked-code/MCP`
- Branche gouvernée : `mcp/mandatory-agent-bootstrap-v1-20260822`
- Baseline verrouillée : `main`, S1 et runtime au SHA `78dade5e103c2ac73727f44c571f99384d6b8798`
- Tâche : `TASK-20260822-001`
- Statut : conception issue du document utilisateur approuvé et concrétisée contre le code `main`
- Livraison : additive, TDD RED→GREEN, Draft PR, exact-head, CI, revue, merge, Autodeploy exact-SHA et attestation

## 1. Objectif

Chaque nouvelle connexion doit fournir un point d’entrée opérationnel qui permet à un agent de :

1. vérifier le bridge et l’état GitHub/S1/runtime ;
2. recevoir la cartographie courante des outils, ressources, modules, routes, relations, documents, audits, politiques et preuves ;
3. retrouver la tâche, la session, le checkpoint, les locks et la prochaine action ;
4. rapprocher le nouveau prompt des tâches existantes ;
5. ajouter une nouvelle tâche en fin de file lorsqu’elle n’existe pas ;
6. réclamer d’abord la première tâche antérieure exécutable ;
7. produire un receipt prouvant le contexte acquitté ;
8. conserver le WRITE gate historique en `shadow` pendant cette livraison.

L’objectif n’est pas de remplacer Live State, Governed Context ou Operational Memory. Il est de les faire évoluer afin qu’ils composent cette capacité transversalement.

## 2. Invariants intangibles

La livraison préserve :

- GitHub comme source versionnée et S1 comme source exécutée ;
- Live State V1, sa réconciliation 60 secondes, son store et son `stateVersion` ;
- Governed Context comme vue composée de l’agent ;
- Governed Sessions, checkpoints, locks, atomic store, journal et maintenance ;
- GitHub OIDC, Autodeploy exact-SHA, fast-forward only, attestation OCI et rollback ;
- `protect-main`, la Draft PR et la garde exact-head ;
- les 92 contrats historiques et les 105 outils observés avant cette évolution ;
- `ENABLE_WRITE_TOOLS`, `allow_write` et le WRITE gate `shadow` ;
- les routes OAuth, MCP, health, dashboard et déploiement existantes ;
- l’absence de secret, prompt complet, transport brut ou sortie brute dans les stores ;
- l’exclusion de la 2FA GitHub.

Aucun second Live State, système de sessions, moteur de locks, journal, dashboard ou registre d’autorité n’est créé.

## 3. Sources de vérité et projections

| Domaine | Autorité | Projection nouvelle ou enrichie |
|---|---|---|
| Git, PR, CI, reviews | GitHub | Governed Context |
| S1, Docker, OCI | S1/runtime | Live State |
| Alignement | Live State V1 | sections de preuve d’inventaire |
| Outils réellement enregistrés | appels `tool`/`registerTool` du serveur | catalogue dérivé en mémoire |
| Ressources MCP | appels `registerResource` | catalogue dérivé en mémoire |
| Modules, imports et routes | arbre Git suivi au SHA observé | preuve d’architecture dérivée |
| Documents et audits | inventaire Markdown + Git | preuve documentaire dérivée |
| Politiques `.mcp` | fichiers versionnés | digests, présence et contradictions |
| Sessions et checkpoints | store existant | bootstrap receipt dans la session |
| Tâches opérationnelles | Task Registry versionné + task store runtime | Work Queue |
| Chronologie machine | journal JSONL existant | nouveaux événements allowlistés |
| Vue agent | Governed Context | Current-State Inventory composé |

Les digests et inventaires sont des preuves dérivées. Ils ne peuvent pas modifier leurs autorités.

## 4. Catalogue dérivé des registrations

Le serveur reçoit un décorateur d’observation qui intercepte uniquement l’enregistrement des outils et ressources, puis délègue exactement au SDK.

Pour chaque outil, la projection conserve :

- nom ;
- description ;
- surface `read` ou `scoped-write` ;
- annotations read-only/destructive ;
- schéma JSON d’entrée canonique ;
- digest du contrat.

Pour chaque ressource : nom, URI, titre, type MIME, audience et priorité.

Le catalogue expose :

- `catalogueVersion` ;
- `catalogueDigest` ;
- `registeredToolCount` ;
- `readOnlyToolCount` ;
- `writeToolCount` ;
- `resourceCount` ;
- la liste triée complète ;
- `generatedAt` ;
- la conformité avec `.mcp/function-cartography.json`.

La cartographie versionnée est générée depuis cette même registration et la CI refuse toute dérive. Une liste manuelle de 34 outils ne demeure pas une autorité.

## 5. Preuve d’architecture et de documentation

Un script read-only versionné, exécuté dans le clone S1 observé, produit une preuve JSON bornée :

- HEAD Git ;
- fichiers `src/**/*.ts` suivis ;
- relations d’import relatives entre modules ;
- routes Express littérales ;
- documents Markdown suivis et catégories ;
- documents sous `docs/audits/` et `docs/history/` ;
- fichiers `.mcp` attendus, présence et SHA-256 ;
- digests de gouvernance, architecture, documentation et tests ;
- état du Task Registry ;
- contradictions structurées.

Le script n’écrit rien, n’ouvre aucun réseau et ne lit aucun secret. Live State conserve la preuve et ses digests. La vue Current-State peut restituer la carte complète sans relancer un audit manuel.

## 6. Enrichissement Live State

Le snapshot V1 reçoit trois sections additives :

### `capabilities`

Catalogue runtime, digests, comptes READ/WRITE/resources, statut de cartographie et contradictions.

### `governance`

Digests des politiques, fichiers requis, statut onboarding, version du Task Registry et contradictions.

### `auditBaseline`

HEAD de preuve, révision runtime, digest des tests, dernière preuve CI/déploiement documentée, digests catalogue/gouvernance, validité et causes d’invalidation.

### `inventory`

Architecture, routes, relations, documents et audits dérivés du SHA observé.

Ces sections participent à la valeur sémantique du Live State. Un digest ou une contradiction modifié incrémente `stateVersion`; un simple timestamp ne l’incrémente pas.

## 7. Task Registry et Work Queue

### 7.1 Registre versionné

`.mcp/task-registry.json` contient le backlog canonique initial, son `registryVersion` et un digest. Le fichier n’est pas le store runtime : il sert de seed versionné et de preuve documentaire.

### 7.2 Store runtime

Operational Memory reçoit `mcp-governed-tasks.json` via le même atomic store, les mêmes permissions, validations, sérialisations et règles de corruption fail-closed.

Une tâche porte au minimum :

- `taskId` ;
- `intentKey` stable ;
- titre et résumé borné ;
- séquence FIFO et priorité ;
- statut ;
- dépendances et scopes de ressources ;
- session propriétaire éventuelle ;
- branches/PR/SHA/runtime corrélés ;
- blockers et prochaine action ;
- provenance et digest de demande ;
- `taskRevision`.

États :

`DISCOVERED → READY → CLAIMED → IN_PROGRESS → REVIEW → MERGE_READY → DEPLOYING → VERIFYING → DONE`

États latéraux : `BLOCKED`, `CONFLICT`, `CANCELLED`, `SUPERSEDED`.

Les transitions sont allowlistées et protégées par révision optimiste.

### 7.3 Ordre d’exécution

`claimNextTask` sélectionne la plus ancienne tâche exécutable par priorité puis séquence. Une nouvelle instruction ajoutée à la queue ne saute donc pas les tâches antérieures prêtes. Une dépendance non `DONE` produit `BLOCKED`; un scope détenu par une autre tâche active produit `CONFLICT`.

## 8. Réconciliation de l’intention

Le runtime ne prétend pas comprendre seul un prompt illimité. L’agent fournit une projection bornée : `intentKey`, titre, résumé, Task ID éventuel, dépendances et scopes.

Le service classe de façon déterministe :

- `CONTINUATION` : même Task ID ou même intent actif et session compatible ;
- `NEW_TASK` : aucun équivalent ni conflit ;
- `DUPLICATE` : équivalent déjà terminal ou déjà représenté ;
- `CONFLICT` : ressource détenue par une autre tâche active ;
- `BLOCKED` : dépendance non terminée ;
- `OUT_OF_SCOPE` : repository ou structure refusée.

Seul `NEW_TASK` ajoute une tâche. La sortie contient la file et la tâche qui doit être réclamée en premier.

## 9. Bootstrap receipt

L’acquittement existant de contexte crée aussi un receipt sanitizé dans la governed session :

- `bootstrapReceiptId` ;
- session, agent et repository ;
- branche gouvernée ;
- `stateVersion` ;
- GitHub HEAD et runtime revision ;
- digests catalogue, gouvernance et Task Registry ;
- horodatage, expiration et statut ;
- limitations de preuve.

Le receipt ne contient ni prompt, token, transport, secret de reprise ni données brutes. Un changement de `stateVersion` le rend `STALE` dans la projection sans supprimer la preuve historique.

## 10. Governed Context et Current-State Inventory

Governed Context reste l’agrégateur. Il ajoute :

- projection du catalogue et de l’inventaire ;
- receipt et statut bootstrap ;
- résumé de queue ;
- tâche réclamée et première tâche exécutable ;
- gouvernance applicable ;
- contradictions d’inventaire ;
- prochaine action ordonnée.

La ressource existante reste compatible. Une nouvelle ressource et un outil read-only exposent la vue complète :

- `mcp://wealthtech/current-state/inventory` ;
- `mcp_get_current_state_inventory`.

Les objets historiques conservent leurs champs. Les ajouts sont purement additifs.

## 11. Surfaces MCP additives

- `mcp_get_current_state_inventory` — lecture composée complète ;
- `mcp_get_work_queue` — queue visible ;
- `mcp_get_governed_task` — tâche visible ;
- `mcp_reconcile_agent_intent` — classification et ajout éventuel ;
- `mcp_claim_next_governed_task` — réclame la première tâche exécutable ;
- `mcp_transition_governed_task` — transition allowlistée et corrélation.

Les trois mutations de tâche écrivent uniquement dans Operational Memory. Elles restent séparées des outils WRITE historiques et exigent session, receipt et révisions attendues.

## 12. Instructions de connexion

Les instructions MCP deviennent :

1. appeler `ping` ;
2. appeler `mcp_reconcile_governed_context` ;
3. lire `mcp_get_current_state_inventory` ;
4. reprendre ou ouvrir une governed session ;
5. acquitter le `stateVersion` et obtenir le receipt ;
6. projeter puis réconcilier le nouveau prompt ;
7. réclamer la première tâche exécutable ;
8. respecter locks, CI, reviews, déploiement et attestation ;
9. checkpoint/pause/close selon le résultat.

`.mcp/onboarding.json` décrit cette procédure réelle et ne déclare plus des routes HTTP absentes.

## 13. Journal et audit

Le journal existant accepte uniquement des métadonnées bornées pour :

- `bootstrap.acknowledged` ;
- `intent.reconciled` ;
- `task.discovered` ;
- `task.claimed` ;
- `task.transitioned` ;
- `task.blocked` ;
- `task.completed` ;
- `catalogue.drift_detected` ;
- `governance.drift_detected`.

Les résumés de prompt ne sont jamais journalisés. Seuls Task ID, classification, statuts, revisions et digests sont autorisés.

## 14. WRITE gate shadow

Le gate conserve le handler historique appelé exactement une fois et ajoute des verdicts d’observation :

- `bootstrap_unacknowledged` ;
- `task_unbound` ;
- `task_not_executable` ;
- `audit_baseline_stale`.

Tous restent non bloquants en V1. Le passage à un mode d’enforcement est hors périmètre et exigera une décision humaine et une PR séparées.

## 15. Dashboard

La section existante ajoute : catalogue, ressources, architecture, routes, digests, statut onboarding, receipt, queue, tâche courante, baseline d’audit, divergences et verdict shadow. Toutes les chaînes sont échappées et les listes bornées.

## 16. Sécurité, disponibilité et limites

- aucune nouvelle dépendance externe ;
- tailles et nombres maximaux dans chaque schéma ;
- permissions `0700/0600` et writes atomiques ;
- aucun réseau dans le générateur d’inventaire ;
- aucun SSH sur chaque outil ordinaire : la preuve passe par Live State et son intervalle ;
- aucune baisse de disponibilité si l’inventaire est indisponible : section dégradée, MCP vivant ;
- aucune donnée arbitraire persistée ;
- aucune modification OIDC/deploy/2FA ;
- aucune activation d’enforcement.

## 17. Tests et critères de succès

La livraison exige :

- RED observé avant chaque implémentation ;
- catalogue complet dérivé et dérive CI détectée ;
- preuve d’architecture déterministe et bornée ;
- `stateVersion` sensible aux digests, pas aux dates ;
- migration compatible des stores existants ;
- queue FIFO, dépendances, conflits et transitions testés ;
- receipt généré sans secret ;
- intention classifiée sans double création ;
- tools/resources et instructions testés sur un faux serveur réel ;
- gate shadow non bloquant ;
- dashboard sanitizé ;
- 92 contrats historiques inchangés ;
- baseline 12 tests governance et 188 tests read-only conservée puis étendue ;
- typecheck, build, docs, secrets et diff check verts ;
- aucun diff dans `.github/workflows/mcp-deploy.yml`, `src/deploy`, OIDC ou 2FA ;
- Draft PR, CI exacte, revue sans finding important, merge exact-head ;
- Autodeploy exact-SHA, S1 propre, OCI/runtime healthy et Live State aligné ;
- checkpoint final, lock libéré et session fermée.

## 18. Rollback

Le rollback fonctionnel est le retour au SHA précédent via le mécanisme Autodeploy existant. Les nouveaux fichiers de store sont additifs et ignorés par l’ancien runtime. Aucun ancien store n’est supprimé ou migré destructivement. La cartographie versionnée peut être régénérée depuis les registrations du SHA restauré.

## 19. Hors périmètre

- enforcement bloquant des outils historiques ;
- suppression ou nettoyage de branches ;
- migration Node 24 ;
- activation/migration Registry V2 ;
- actions d’administration GitHub nouvelles ;
- modification de 2FA ;
- nouveau cockpit séparé ;
- base de données externe ou moteur de recherche sémantique.
