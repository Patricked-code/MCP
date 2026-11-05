# MCP — Contrat séquentiel UTL → Développement → Déploiement → Attestation

**Version documentaire :** 0.2 — 03/11/2026 (extension ascendante Tâche → UTL)  
**Nature :** spécification fonctionnelle préparatoire, **non implémentation** et **non nouvelle autorité runtime**.  
**Dépôt de référence :** `Patricked-code/MCP`  
**Continuité de travail E2 à laquelle rattacher après validation :** `MCP-PILOT-E2-01-CONT-20261030-ROOT-01` (issue #359).  
**Règle :** conserver E1 et E2 comme portes d'entrée distinctes ; conserver les mécanismes existants de Task Queue, session, claim, CI, PR, fusion et Governed Deploy MCP ; éviter toute régression et tout doublon.

## 0. Notions et invariants

- **Mandat N :** exigences, décisions et instructions du propriétaire, avec historique.
- **Programme et P1 :** structuration du mandat en Work Items, Waves/Lots, blueprints et travaux admissibles. Les plans `READY` n'accordent pas un claim runtime.
- **Tâche / travail admissible :** unité de résultat fonctionnel global pouvant nécessiter **une ou plusieurs UTL**.
- **UTL :** unité technique cohérente, bornée, réalisable et attestable, **identifiée par une référence de corrélation**, sans prétendre qu'un objet `UTL` ou un outil `mcp_start_utl` existe aujourd'hui dans le MCP.
- **Circuit D — développement :** branche (ou reprise de branche), code, tests, commits, PR, CI, revue et fusion gouvernée dans `main`. Sortie : identité et preuves du commit fusionné.
- **Circuit L — livraison/déploiement :** CI `main` du commit exact, admission, OIDC, demande de job S1, suivi, attestation. Sortie : preuve d'un runtime conforme ou état d'échec attesté.
- **Cycle unitaire UTL :** admission d'UTL → circuit D → circuit L → attestation UTL → retour au parent.
- **P2 :** capacité existante de traitement gouverné des tâches, pouvant traiter successivement plusieurs UTL ; les circuits D/L ne le remplacent pas.
- **Cardinalité :** une tâche peut comporter 1..n UTL ; une UTL peut subir 1..n commits et itérations de CI/revue ; une PR peut être reprise ; le nombre de PR/déploiements physiques n'est pas figé arbitrairement ; chaque attestation doit désigner la révision effectivement vérifiée.

### Invariant de causalité

`UTL admise → développement validé → fusion main → CI main réussie pour SHA → déploiement autorisé → runtime attesté`.

**Nuance du workflow existant :** l'événement `push` vers `main` lance le workflow de déploiement et la CI `main` ; l'étape *d'écriture vers S1* est bloquée tant que l'admission `push_ci_gate` n'a pas constaté une CI `main` réussie sur `GITHUB_SHA`. Ne pas confondre démarrage du workflow et déploiement effectif.

## 1. Matrice d'identification et de filiation (modèle de corrélation proposé)

| Champ logique | Obligatoire | Provenance / autorité | Sens / condition |
|---|---|---|---|
| `continuity_id` | Oui | Dossier canonique du chantier | Relie l'UTL à l'historique du bon chantier ; ne jamais réattribuer une autre racine lors d'une reprise. |
| `mandate_ref` / `mandate_revision` | Si E2 N existe | Mandat N / sa provenance | Exigence(s) et version(s) du mandat motivant la modification. |
| `program_ref` | Oui, si programme | Program Backlog/chantier existant | Programme auquel le travail contribue ; ne crée pas de deuxième backlog. |
| `work_item_ref` | Si applicable | Programme | Grand ensemble de travaux. |
| `wave_ref` / `lot_ref` | Si applicable | Programme | Ordonnancement ; le lien est typé, pas nécessairement une arborescence rigide. |
| `blueprint_ref` | Si applicable | Task Blueprint existant | Spécification du travail et critères d'acceptation. |
| `parent_work_ref` | Oui | E1 : Task ID/queue ; E2 : issue/mandat/travail GitHub autorisé | Parent qui porte le résultat global ; **E2 n'exige pas un faux Task ID E1**. |
| `utl_ref` | Oui (corrélation) | À inscrire dans le canal canonique existant après décision | Référence stable pour relier branche, PR, commit, CI, déploiement et attestation ; **aucun nouveau registre autoritatif implicite**. |
| `parent_requirement_refs` | Oui | Mandat et critères | Ce que l'UTL doit satisfaire. |
| `sibling_utl_refs` / `depends_on_utl_refs` | Selon cas | Découpage de la tâche | Dépendances et ordre des UTL, sans doublons. |
| `scope` / `collision_domains` | Oui | Gouvernance existante et analyse | Fichiers, modules, ressources et domaine exact de mutation ; contrôle anti-collision. |
| `owner_proof` / `admission_proof` | Oui lors d'une écriture | GitHub et autorités runtime applicables | Identité et autorisation effectivement constatées ; pas de claim fictif. |
| `acceptance_criteria` / `test_evidence_targets` | Oui | Exigences et analyse | Conditions mesurables de succès et preuves exigées. |
| `next_action` | Oui, à chaque checkpoint | Canal de continuité existant | Une action de reprise concrète, sans état inventé. |

### Relations à préserver

- `Mandat 1 → n exigences`, `Programme 1 → n Work Items`, `Work Item ↔ Waves/Lots/Blueprints` (liens typés), `Tâche 1 → n UTL`, `UTL → branche(s)/PR/commits`, `commit main → CI main + Governed Deploy`, `Deploy Job → attestation runtime`.
- La hiérarchie ci-dessus est un **graphe de provenance**, pas une nouvelle base transactionnelle.
- Le parent ne passe à `DONE` que si ses UTL nécessaires et **ses propres critères d'acceptation globaux** sont attestés.

## 2. Comment constituer une UTL — procédure séquentielle U0

| Ordre | Opération | Entrée requise | Résultat / condition de passage |
|---|---|---|---|
| U0-01 | **Recevoir le travail parent** | `continuity_id`, tâche ou travail admissible, périmètre, objectif | Parent identifié et récupéré, pas de création automatique d'une nouvelle racine. |
| U0-02 | **Réobserver** | GitHub `main`, PR/branches, code, tests, Task Queue/session/locks **si applicables** | État exact, SHA de référence, preuves fraîches et ownership réel. |
| U0-03 | **Établir les écarts** | Exigences du parent et réalité technique | Capacités acquises, manques, risques et dépendances ; réutilisation en priorité. |
| U0-04 | **Décomposer techniquement** | Résultat global du parent | 1..n unités **cohérentes et vérifiables**, chacune dotée d'un résultat autonome ; ordre de dépendances explicite. |
| U0-05 | **Définir chaque UTL** | Périmètre de l'unité | Objectif, livrable, fichiers/capacités, exclusions, tests, critères, rollback applicable, preuve terminale. |
| U0-06 | **Rattacher les identifiants** | Références canoniques disponibles | `continuity_id`, parent, blueprint/mandat si disponibles, `utl_ref`, liens entre unités. |
| U0-07 | **Qualifier l'admissibilité** | Dépendances, collisions, droits, outils et session autorisée si exigée | UTL prête **uniquement lorsque** aucune interdiction réelle ne subsiste ; blocage attesté sinon. |
| U0-08 | **Sélectionner et déclencher** | UTL admissible + source d'autorité valable | Remise de son contrat d'entrée au circuit D ; réutilisation de la branche/PR existante ou création autorisée. |

**Principe de déclenchement :** ce n'est **pas** la génération d'un `utl_ref` qui lance du code ; c'est la **décision d'exécution autorisée** de son périmètre. En E1, les contrôles Task/Session/Claim/Lock s'appliquent. En E2, les opérations GitHub autorisées peuvent suivre la voie externe GitHub-first **sans admission fictive de Task Queue**, tandis que les écritures runtime continuent d'exiger leurs autorités.

## 3. Contrat d'ENTRÉE du circuit de développement (D_IN)

| Champ | Origine | Nécessité |
|---|---|---|
| `utl_ref`, `parent_work_ref`, `continuity_id` | U0 | Filiation et reprise. |
| `repository` | U0 | Dépôt autorisé, ici `Patricked-code/MCP`. |
| `objective`, `scope`, `exclusions` | U0 | Délimitation du travail et non-régression. |
| `acceptance_criteria`, `test_plan` | U0 | Conditions de validation. |
| `dependencies`, `collision_domains` | U0 | Protection du travail concurrent. |
| `base_main_sha` | Observation GitHub live | SHA exact de la référence initiale. |
| `existing_branch_or_pr` | Observation GitHub live | Reprendre ce qui existe si autorisé, sinon préparer une branche. |
| `owner_and_permission_evidence` | Autorité existante | Condition d'écriture effective. |
| `rollback_or_recovery_plan` | Analyse de risque | Traitement explicite si applicable. |

## 4. Circuit D — développement, du déclenchement à la sortie

| Étape | Action | Identifiant produit / preuve | Échec / boucle |
|---|---|---|---|
| D-01 | Accepter `D_IN`; vérifier droits, collisions, HEAD, indépendance | Préflight daté et SHA de base | Refuser/attendre si inadmissible. |
| D-02 | Reprendre ou créer branche gouvernée | `branch_name`, `branch_head_sha` | Si conflit, réobserver ; ne pas dupliquer une PR déjà possédée. |
| D-03 | Établir les tests attendus et RED lorsque pertinent | Références de tests et résultat initial observable | Ne pas inventer RED. |
| D-04 | Développer additivement, réutiliser l'existant | Diff et commits proposés | Modifier le code et retester si tests échoués. |
| D-05 | Exécuter GREEN, non-régression, sécurité, documentation | Résultats de tests sur le code courant | Boucle D-04 ↔ D-05. |
| D-06 | Commit et push sur la branche | `branch_commit_sha` | Si HEAD déplacé : STOP_WRITE, reobserve, reconcile. |
| D-07 | Ouvrir ou actualiser la PR, initialement Draft si applicable | `pr_number`, `pr_url`, `pr_head_sha` | Reprendre la même PR. |
| D-08 | Obtenir CI GitHub sur SHA exact (`mcp-ci.yml`) | `pr_ci_run_id`, `ci_conclusion` | Nouveau commit → nouvelle CI, ne pas réutiliser une ancienne CI. |
| D-09 | Revue indépendante exigée et correction des observations | Décisions de revue, discussions, SHA revu | Nouvelle correction → D-04, D-08 et revue actualisée. |
| D-10 | Vérifier règles de branche, SHA, autorisation de fusion | Attestation de pré-fusion | Sinon blocage et correction. |
| D-11 | Fusion gouvernée dans `main` | `merge_commit_sha` et PR `merged` | Pas de passage à L sans fusion réelle. |
| D-12 | Émettre `D_OUT` vers le suivi de livraison | PR, `merge_commit_sha`, preuves de contrôles | Journaliser statut, sans présumer le déploiement. |

**Sortie exacte D_OUT :** `utl_ref`, `repository`, `pr_number`, `pr_head_sha`, `pr_ci_run_id`, `review_evidence`, `merge_commit_sha`, `merged_at`, `development_status=MERGED` (état fonctionnel, pas statut ajouté à la Task Queue). Le `pr_head_sha` peut différer du `merge_commit_sha` : une fusion GitHub peut créer un commit de merge/squash. **Le SHA de sortie vers le déploiement est le SHA intégré dans `main`, pas automatiquement le SHA de la PR.**

## 5. Contrat d'ENTRÉE du circuit de déploiement (L_IN)

| Champ | Réel / attendu | Autorité |
|---|---|---|
| `repository` et `branch` | `Patricked-code/MCP`, `main` | GitHub |
| `main_sha` | `GITHUB_SHA` issu du `push` sur `main` | GitHub Events |
| `pr_number` / `merge_commit_sha` | Corrélation D_OUT | GitHub |
| `ci_main_run_id` | CI `MCP CI` `success` sur le **même SHA** | GitHub Actions |
| `deployment_workflow` | `.github/workflows/mcp-deploy.yml` | Version GitHub du workflow |
| `auto_deploy_policy` | `.mcp/autodeploy-policy.json` avec `pushEnabled=true` pour le chemin auto | Politique versionnée |
| `admission_kind` | `push_ci_gate` (auto) ou `workflow_dispatch_manual` (manuel) | Workflow déployé |
| `deploy_workflow_run_id` | `GITHUB_RUN_ID` | GitHub Actions |
| `oidc_identity` | Jeton OIDC à audience serveur bornée, jamais sauvegardé en mémoire | GitHub OIDC |

## 6. Circuit L — déploiement, du déclenchement au résultat

| Étape | Action réellement prévue par le workflow | Entrée → sortie |
|---|---|---|
| L-01 | Après fusion, GitHub émet `push` sur `main`. | `GITHUB_SHA` → déclenchement CI `main` et `MCP Governed Deploy`. |
| L-02 | Le workflow vérifie `pushEnabled` et recherche la CI `MCP CI` `push` réussie sur ce `GITHUB_SHA`. | SHA + CI → `ciRunId`, admission `push_ci_gate`, sinon pas d'écriture serveur. |
| L-03 | GitHub Actions obtient un jeton OIDC ciblé. | Identité de run autorisée → jeton temporaire. |
| L-04 | `POST /deploy/github/s1/start` (sha, admission auto et CI). | Réponse `jobId`, `requestedSha`, `status=queued`. |
| L-05 | Valider que `jobId` vaut `mcp-s1-<GITHUB_RUN_ID>-<SHA12>` et que le SHA correspond. | Reçu de job contrôlé. |
| L-06 | Suivre `GET /deploy/github/s1/status/{jobId}?sha={GITHUB_SHA}`. | États `queued`, `running`, `failed`, `succeeded`. |
| L-07 | En cas de `succeeded`, contrôler la phase et l'identité du runtime. | `phase=attested`, `runtimeRevision=GITHUB_SHA`, `healthOk=true`, `oauthOk=true`, `mcpAuthOk=true`, `rollbackStatus=not_needed`. |
| L-08 | Recouper les preuves nécessaires de `main`, S1 et runtime, ainsi que la fonctionnalité livrée. | Attestation complète ; tout manque → `UNKNOWN`/`BLOCKED` et non succès supposé. |
| L-09 | Joindre les résultats au chantier et à l'UTL dans le canal existant ; checkpoint durable. | `L_OUT` + référence de preuves + `NEXT_ACTION`. |

**Déclencheur automatique réel :** `on.push.branches: [main]`, avec politique `pushEnabled:true`. Un workflow `workflow_dispatch` existe aussi, **mais ne constitue pas une voie de contournement des autorisations ou des preuves**.

**Sortie L_OUT :** `utl_ref` (corrélation documentaire), `main_sha`, `ci_main_run_id`, `deploy_workflow_run_id`, `deploy_job_id`, `requested_sha`, `runtime_revision`, `deployment_status`, `phase`, `health_ok`, `oauth_ok`, `mcp_auth_ok`, `rollback_status`, `evidence_links`, `verified_at`, `next_action`.

## 7. Matrice de jonction D → L → UTL

| Champ de sortie du développement | Champ d'entrée / de sortie du déploiement | Relation à prouver |
|---|---|---|
| `D_OUT.merge_commit_sha` | `L_IN.main_sha` | SHA du changement intégré ; vérifier le SHA de push réellement candidat au déploiement. |
| `D_OUT.pr_number` | `L_OUT.evidence_links` | La livraison se rattache à la bonne PR, et non à un run sans parent. |
| `D_OUT.pr_ci_run_id` | `L_IN.ci_main_run_id` | **Deux CI distinctes** : CI de PR puis CI de main, sur les SHA correspondants. |
| `L_IN.main_sha` | `L_OUT.requested_sha` | Identité du commit demandé au serveur. |
| `L_OUT.requested_sha` | `L_OUT.runtime_revision` | Égalité exigée au succès. |
| `L_IN.deploy_workflow_run_id` | `L_OUT.deploy_job_id` | `jobId = mcp-s1-<run_id>-<sha12>` selon le contrat actuel. |
| `UTL.acceptance_criteria` | Preuves de tests et attestations | Succès du déploiement **et** satisfaction des critères techniques de l'UTL. |
| `UTL.parent_work_ref` | Checkpoint de tâche/chantier | Relever la progression du parent sans transformer une UTL en Task Queue parallèle. |

**Attention aux évolutions concurrentes de `main` :** si une autre PR modifie `main` entre les étapes, on réobserve ; ne jamais déclarer que le SHA de PR, le SHA fusionné et le SHA effectivement déployé sont interchangeables. Le workflow automatise une révision exacte ; l'UTL doit conserver la preuve que **son code et ses critères** sont couverts par la révision attestée.

## 8. La machine de décision conceptuelle, sans créer une machine d'états runtime

```text
Parent admissible
   |
   v
[U0 Constituer / découper / qualifier 1..n UTL]
   |
   +-- Inadmissible --> BLOCKED + motif + NEXT_ACTION
   |
   v
[UTL admissible et autorisée]
   |
   v
[D Circuit développement]
   |   Branche → Tests → Code → Commit/push → PR → CI → Revue
   |   ^                                |         |
   |   +----------- CORRECTION <--------+---------+
   v
[Fusion autorisée dans main = D_OUT]
   |
   +-- push main --> workflows CI main et Deploy démarrés
                        |
                        v
                    [CI main success SHA exact ?]
                        |Non: pas d'écriture vers S1
                        v
                   [L Circuit déploiement]
                    OIDC → POST start → jobId → polling status
                        |                  |
                        |failed/timeout     |succeeded + attested
                        v                  v
                   BLOCKED/RECOVERY     Vérification
                                           |
                                           v
                                     L_OUT + checkpoint
                                           |
                                           v
                                     UTL attestée
                                           |
                                           v
                                Autre UTL du même parent ?
                                  Oui → U0/select
                                  Non → validation globale du parent
                                           |
                                           v
                                   P1/programme recalculés
```

## 9. Où l'automatisation existe, où elle manque

| Événement | État constaté | Ce qui ne doit pas être présumé |
|---|---|---|
| Réconciliation programme, readiness, Task Queue et claim E1 | Mécanismes MCP déjà présents | Un blueprint `READY` n'est pas un claim ou une tâche créée automatiquement. |
| Décomposition explicite d'une tâche en UTL et maintien d'un `utl_ref` durable | **Contrat fonctionnel proposé à raccorder**, non objet runtime prouvé | Ne pas présenter `UTL` comme un nouveau dispatcher, une nouvelle Queue ou un outil existant. |
| Création de branche et PR | Capacités GitHub sous admission et permissions existantes | Les créations ne sont pas déclenchées par la seule écriture d'un Markdown. |
| CI sur PR et `push main` | Automatique via `mcp-ci.yml` | La CI et la revue ne sont pas identiques. |
| Déploiement après `push main` | Workflow `mcp-deploy.yml` déclenché automatiquement, `pushEnabled:true` dans la politique consultée | Le **job serveur** attend la CI main admissible ; un run GitHub démarré n'est pas un déploiement réussi. |
| Résultat de déploiement | `jobId`, polling et contrôles d'attestation du workflow existant | `success` d'un autre SHA ou absence de contrôle fonctionnel ne clôt pas automatiquement l'UTL. |
| Répercussion UTL → parent → programme → mandat | **Chaîne de corrélation à garantir et prouver** | Ne pas réécrire l'état de P1/P2 sans preuve ni nouvelle autorité. |

## 10. Plan de raccordement minimal, sans régression

1. Inventorier la réalité du code existant : Program Backlog, blueprints/readiness, sessions/claims/locks, gestion des branches et PR, `mcp-ci.yml`, `mcp-deploy.yml`, checkpoints.
2. Vérifier quelles références d'UTL/parent/scope peuvent déjà être transportées dans les issues, PR et checkpoints ; ne créer qu'une représentation dérivée si nécessaire.
3. Définir le contrat U0 de préparation et sélection d'une UTL, sans ajouter de permission ou de deuxième Task Queue.
4. Raccorder U0 à l'admission GitHub ou runtime appropriée, en respectant la différence E1/E2.
5. Collecter `D_OUT` depuis la PR et le merge SHA réels ; ne pas simuler `MERGED`.
6. Corréler `D_OUT` à `L_IN/L_OUT` par SHA et run IDs ; ne pas réimplémenter `mcp-deploy.yml`.
7. Enregistrer les preuves dans la continuité existante ; recalculer les unités restantes et la tâche parente.
8. Tester branche inexistante/existante, CI rouge, revue bloquante, HEAD déplacé, CI main manquante, déploiement failed/timeout, successful attested, reprise multi-conversation, absence de faux claim E2 et anti-collision.
9. Chaque modification du MCP elle-même passe par les règles de développement, PR, CI, revue, fusion, déploiement et attestation déjà en place.

## Sources versionnées vérifiées

- [Politique des branches](https://github.com/Patricked-code/MCP/blob/main/.mcp/branch-governance.json)
- [MCP CI](https://github.com/Patricked-code/MCP/blob/main/.github/workflows/mcp-ci.yml)
- [MCP Governed Deploy](https://github.com/Patricked-code/MCP/blob/main/.github/workflows/mcp-deploy.yml)
- [Politique auto-déploiement](https://github.com/Patricked-code/MCP/blob/main/.mcp/autodeploy-policy.json)
- [Program Backlog V2](https://github.com/Patricked-code/MCP/blob/main/docs/governance/program-backlog-convergence.json)
- [Runbook commun E1/E2](https://github.com/Patricked-code/MCP/blob/main/docs/runbooks/GITHUB_FIRST_GOVERNED_RECOVERY.md)

**Statut du présent document :** contrat préparatoire consigné localement, sans modification de GitHub, S1 ou du runtime MCP. Il devra être adopté dans le canal canonique existant si le propriétaire le valide.


---

# Extension V0.2 — De la tâche admissible aux UTL exécutables

## 11. Invariant de l'étage parent

**L'admissibilité d'une tâche** (résultat global à atteindre) ne signifie **ni** que chacune de ses UTL est immédiatement exécutable, **ni** qu'une tâche de runtime a été réclamée. Il faut distinguer trois frontières :

1. **Admissibilité du travail parent** : besoin précis, critères, dépendances de programme satisfaites, autorité de prise en charge.
2. **Constitution des UTL** : analyse technique du parent et des écarts réels ; découverte de 1..n changements cohérents, testables et livrables ; liens de dépendance et preuves attendues.
3. **Admission d'une UTL particulière** : dépendances propres satisfaites, propriétaire autorisé, absence de collision, état Git/runtimes réconcilié ; le circuit D peut démarrer.

Une tâche peut être *admissible* alors que seule l'UTL-01 est *exécutable* et que UTL-02/03 attendent leurs dépendances. Une tâche E1 peut nécessiter session/claim runtime. Un travail E2 GitHub-only autorisé n'exige pas qu'on invente une Governed Task E1.

## 12. Production de la tâche admissible : séquence P1 → P2

| Code | Action séquentielle | Entrée | Résultat vérifiable | Autorité / garde-fou |
|---|---|---|---|---|
| T-01 | Recevoir/identifier un mandat ou une demande gouvernée | Mandat, Continuity ID/issue canonique | Exigences, portée, source, décisions | Aucune permission déduite du texte du mandat |
| T-02 | Observer la situation actuelle | GitHub main HEAD, code, PR, runtime/docs si pertinents | Baseline et travaux existants | Ne pas traiter un vieux snapshot comme actuel |
| T-03 | Réconcilier et identifier les écarts | Exigences ↔ capacités existantes | Travail restant, réutilisation prioritaire | REUSE → WRAP → GENERALIZE → EXTEND → NEW |
| T-04 | Structurer le programme | Programme, Work Items, Waves/Lots | Position et dépendances du besoin | Reuse Program Backlog V2, pas de nouveau backlog concurrent |
| T-05 | Spécifier le blueprint | Objectif technique/fonctionnel | Objectif, dépendances, tests et DoD | Le blueprint est un objet de planification |
| T-06 | Recalculer le readiness | Dépendances, preuves DONE, collisions, priorités | READY / DEFERRED / BLOCKED selon projection réelle | READY ne signifie pas runtime Task ni claim |
| T-07 | Vérifier admissibilité de prise en charge | Session/authority E1 OU voie E2 GitHub autorisée | Admission/réservation appropriée au périmètre | E1 : Task/Session/Claim/Lock applicables ; E2 : ne pas en inventer |
| T-08 | Remettre le travail à P2 | Contrat parent T_IN et preuves d'admission | Travail parent pris en charge | P2 existant ; ne pas construire second scheduler |
| T-09 | Déterminer si développement nécessaire | Objectif parent vs acquis | 0 UTL (déjà satisfait) ou 1..n UTL | Ne pas créer artificiellement d'UTL |

**Cas 0 UTL** : si la tâche est déjà satisfaite et attestée par preuves suffisantes, le parent suit la procédure de validation/fermeture appropriée, sans nouveau commit ni déploiement fictif.

## 13. Matrice de constitution de la tâche parente — T_IN

| Champ conceptuel | Règle | Provenance |
|---|---|---|
| `parent_work_ref` | Identifiant stable du travail parent, ancré dans l'autorité existante | E1 Task ID réel ou E2 issue/chantier autorisé |
| `continuity_id` | Identifiant de reprise de SON chantier | Issue canonique, registre de continuité existant |
| `mandate_refs` | Exigences justifiant le parent, si mandat formalisé | N / instruction de propriétaire |
| `program_ref`, `work_item_ref`, `wave_ref`, `lot_ref`, `blueprint_ref` | Liens typés si applicables | Program Backlog existant |
| `parent_objective` | Résultat global demandé | Critères d'acceptation du parent |
| `parent_acceptance` | Critères observables, incluant comportement intégré | Blueprint/mandat |
| `existing_state_evidence` | Baseline SHA, références code, état runtime pertinent | GitHub et preuves live |
| `missing_delta` | Ensemble des changements réellement nécessaires | Analyse d'écart |
| `constraints` | Non-régression, sécurité, séparation E1/E2, domaine | Gouvernance |
| `ownership_and_admission` | Preuve des permissions et du claim seulement si requis | GitHub / autorités runtime existantes |
| `parent_status`, `next_action` | Avancement avec preuve, sans status fictif | Checkpoint canonique |

Le modèle de filiation doit autoriser des références nulles/non applicables ; **ne jamais fabriquer un Task ID, Blueprint ID ou session absents**.

## 14. Algorithme de constitution des UTL à partir de la tâche

| Code | Traitement | Résultat | Test de passage |
|---|---|---|---|
| U-C01 | Accepter T_IN / vérifier admission du parent | Parent exact | Périmètre valide |
| U-C02 | Inventorier les preuves actuelles par exigence | Matrice besoin ↔ capacités acquises | Tout le scope couvert |
| U-C03 | Déterminer le delta résiduel | Besoins non satisfaits, aucun doublon | Chaque delta justifié |
| U-C04 | Grouper les deltas cohérents techniquement | UTL candidates 1..n | Résultat testable et livrable |
| U-C05 | Pour chaque UTL, formaliser l'objet de sortie | Objectif, scope, critères, tests | Définition de réussite claire |
| U-C06 | Définir les dépendances et conflits | Graphe DAG des UTL, collision domains | Pas de cycle de dépendances |
| U-C07 | Définir l'ordre et les règles de mise en production | Livraison sûre des unités intermédiaires | Pas de déploiement intermédiaire dangereux |
| U-C08 | Relier UTL ↔ parent ↔ exigences | Références locales stables et provenance | Aucun enfant orphelin |
| U-C09 | Enregistrer le plan versionné dans la continuité existante | UTL candidates et evidence/next action | Pas de nouvelle queue autoritaire |
| U-C10 | Réobserver readiness par UTL | Ensemble admissible / en attente / bloqué | Preuves fraîches, pas de statut supposé |
| U-C11 | Sélectionner une UTL exécutable | UTL retenue et motif du choix | Autorité + dépendances + collisions |
| U-C12 | Émettre D_IN vers circuit développement | Référence UTL, SHA et scope borné | Démarrage autorisé de D-01 |

Il est permis d'**affiner progressivement** les UTL quand les résultats techniques le justifient, avec historique de version et liens de remplacement. Le plan initial de N unités n'est pas un nombre intangible.

### Définition de granularité d'une UTL

- Une UTL **résout un écart précis**, peut être testée et dispose d'un critère de fin vérifiable.
- Sa livraison par branche/PR et (si requis) déploiement doit constituer une étape sûre du système ; si deux modifications ne sont pas livrables indépendamment, les grouper ou prévoir un mécanisme de compatibilité/feature flag vérifié.
- Les corrections internes, plusieurs commits, retries de CI ou revue ne sont **pas** de nouvelles UTL.
- Une UTL n'est pas systématiquement une nouvelle branche : réutiliser la branche/PR propriétaire légitime si elle existe.
- Les UTL peuvent être parallèles **seulement** si les domaines de collision, dépendances, autorisations, intégrations dans main et déploiements sont correctement contrôlés.

## 15. Matrice technique de chaque UTL (UTL_CANDIDATE)

| Famille | Champs | Condition |
|---|---|---|
| Identité | `utl_ref`, `parent_work_ref`, `continuity_id` | Unicité et origine vérifiables ; références de corrélation, pas nouvelle DB |
| Couverture | `requirement_refs`, `acceptance_coverage`, `scope` | Chaque UTL contribue à au moins un critère parent |
| Delta | `gap_evidence`, `reuse_decision`, `expected_change` | Ne pas reconstruire l'existant |
| Livrable | `expected_output`, `test_plan`, `acceptance_criteria` | Preuve terminale définie avant code |
| Exclusions | `out_of_scope`, `non_regression_suites` | Périmètre et compatibilité |
| Dépendances | `depends_on_utl_refs`, `dependency_type` | Ordonnancement et DAG sans boucle |
| Collision | `collision_domains`, `target_paths` | Fichiers, API, autorisations, serveur |
| Livraison | `deploy_required`, `intermediate_release_safety`, `recovery_plan` | Peut être déployée indépendamment sans casse |
| Admission | `owner_evidence`, `permission_evidence`, `session_claim_if_required` | Pas de sélection sur simple souhait |
| Exécution | `base_main_sha`, `branch_ref`, `pr_number`, `pr_ci_run_id`, `review_evidence`, `merge_sha` | Reconstituer D_OUT |
| Déploiement | `main_ci_run_id`, `deploy_run_id`, `deploy_job_id`, `runtime_sha`, `attestation_ref` | Reconstituer L_OUT |
| Continuité | `utl_status_projection`, `block_reason`, `checkpoint_ref`, `next_action` | Traçabilité et reprise ; pas un statut Task Queue ajouté |

## 16. Sélection et déclenchement : conditions séquentielles

**Conditions nécessaires d'une UTL sélectionnable** :

```
parent_authorized
AND unit_defined
AND unit_not_already_satisfied
AND dependencies_satisfied_with_evidence
AND owner_allowed_for_operation
AND no_collision_with_other_work
AND main_branch_and_runtime_baseline_reobserved_as_needed
AND suitable_delivery_safety
AND required_runtime_authority_present_for_runtime_writes
```

**Règle d'ordre** : d'abord `RESUME_OWNED_FIRST` pour une UTL réellement possédée et inachevée, ensuite une UTL sans collision et prête, selon l'ordre gouverné du programme (`FIRST_COLLISION_FREE_IN_PROGRAM_ORDER` pour sélection des tâches programme). **Cet ordre de sélection *au sein d'une tâche*, pour les UTL, est un contrat cible à raccorder et non une fonction de sélection UTL déjà attestée dans le MCP.**

Séquence du sélecteur : (1) relecture de T_IN et des preuves ; (2) recalcul des préconditions UTL ; (3) priorité à la reprise possédée ; (4) exclusion des UTL bloquées, déjà attestées ou en collision ; (5) choix admissible justifié ; (6) checkpoint de décision/ownership ; (7) émission de D_IN avec SHA et préflight. À défaut de candidate sûre, `BLOCKED/WAITING` expliqué avec `NEXT_ACTION`, pas de branche créée en anticipation.

## 17. Boucle d'exécution des UTL et clôture du parent

```
Tâche/travail parent admis (T_IN)
     |
     v
Constitution d'un plan des UTL 1..n (U-C01..U-C09)
     |
     v
Recalcul des UTL exécutables / choix (U-C10..U-C12)
     |  ^
     |  | nouvelles preuves et décisions
     v  |
Circuit D : branche → code → tests → PR → CI → revue → fusion main (D_OUT)
     |
     v
Circuit L : main CI → OIDC → job S1 → runtime → attestation (L_OUT)
     |
     v
Relever preuves de l'UTL, checkpoint et nouvelle observation
     |
     +--> UTL suivante admissible ? — Oui → retour au sélecteur
     |
     +--> Non, reste une UTL bloquée ? — Oui → BLOCKED/WAITING avec NEXT_ACTION
     |
     +--> Non, toutes UTL requises attestées ? — Oui → tests globaux parent
                                                   |
                                                   v
                                         critères parent satisfaits ?
                                         Oui → clôture tâche + checkpoint
                                         Non → delta résiduel → ajuster les UTL
                                                   |
                                                   v
                                         retour au sélecteur
```

Chaque attestation d'une UTL est **un fait versionné**. Si une UTL ultérieure déplace main ou change l'intégration, les conclusions de compatibilité globale doivent être réévaluées sur le SHA final ; aucune ancienne attestation n'est utilisée pour certifier sans vérification l'état présent. Les UTL indépendantes peuvent se construire en parallèle mais les fusions/déploiements sont corrélés par SHA et soumis à anti-collision.

**Clôture du parent** : (i) couverture prouvée de tous les critères du parent, (ii) intégration des UTL nécessaires, (iii) validation du système intégré sur l'état final, (iv) absence de blocage, (v) attestation et checkpoint, (vi) remontée vers le programme P1 sans modifier artificiellement la Task Queue.

## 18. Nature d'implémentation et invariants E1/E2

- **Déjà en place et vérifié dans le code :** backlog/blueprints et readiness de planification ; Task Queue/Claim/Session/Lock en E1 quand applicables ; branche/PR/CI ; workflow `mcp-deploy.yml` et sa récupération du statut du job serveur.
- **À vérifier/raccorder, non présenté comme existant :** représentation stable de 1..n UTL sous un parent, versionnement du découpage, sélecteur UTL, émission D_IN, collecte D_OUT/L_OUT vers parent et rebouclage automatiquement après chaque attestation.
- **Aucun système concurrent :** pas de nouveau P2, Task Queue ou moteur de déploiement ; le modèle UTL est une décomposition/traçabilité gouvernée du travail sous l'autorité P2, avec réutilisation maximale de GitHub et des checkpoints.
- **Entrées distinctes :** E1 interne exige sa prise en charge runtime appropriée ; E2 GitHub-first, pour les opérations autorisées, peut démarrer sans Task Queue artificielle. Les écritures runtime restent soumises aux permissions réelles et aux contrôles E3/OAuth/OIDC.
- **Parcours de bout en bout exigible :** n'affirmer une automatisation intégrale que si une vraie tâche parent a produit plusieurs UTL, que la sélection, les branches/PR, les fusions, les déploiements et les attestations ont été observés, et que la tâche parente a réellement été clôturée. Sinon, contrat préparatoire uniquement.

**Statut de cette extension :** conception du circuit parent/UTL ajoutée dans un fichier local, sans modification de GitHub, runtime S1, Task Queue ou pipeline de déploiement.

---

# Extension V0.3 — Registre de corrélation des identifiants Tâche / UTL / Développement / Déploiement

**Date de consolidation :** 2026-11-03. **Statut :** proposition de matrice de traçabilité, non modification du MCP, non implémentation runtime. Repose sur l'inspection en lecture seule de `src/governance/workEntryTrace.ts`, `docs/governance/program-backlog-convergence.json`, `.github/workflows/mcp-deploy.yml`, et des traces GitHub PR #261/#263/#365.

## 19. Toutes les familles d'identifiants

| Famille | Champs | Source | Réel ou modèle |
|---|---|---|---|
| Entrée | `entryProfile`, `workSelection`, `explicitOwnerSelection`, `instructions.sourceUrl` | `GovernedWorkEntryTrace` | Réels dans le code |
| Continuité | `continuityId`, `github.issueNumber`, `checkpoint.url`, `checkpoint.nextAction` | `GovernedWorkEntryTrace` | Réels dans le code |
| Travail interne E1 | `responsible.internalTaskId` (`TASK-*`), identifiant de Governed Session et preuves de Claim/Lock seulement si l'autorité les émet | Task Queue / Session / Locks | État runtime et références réels si observés, pas de génération fictive |
| Travail externe E2 | `parent_work_ref` liant issue/mandat/choix propriétaire | Rapprochement du contexte E2 | Corrélation cible, pas `TASK-*` obligatoire |
| Programme | `projectionId`/`program_ref`, `workItemId`, `waveId`, `lotId`, `blueprint.id`, `dependsOn`, `readiness.state` | Program Backlog V2 | Réels dans le backlog (les liens au mandat sont conditionnels) |
| Tâche | `parent_work_ref`, `continuity_id`, `blueprint_ref`, exigences et DoD, preuves d'admission, `taskStoreRevision` si autorité runtime | P1/P2 | Mixte : références existantes et contrat de corrélation |
| Plan d'UTL | `utl_ref`, `parent_work_ref`, `depends_on_utl_refs`, `collision_domains`, `acceptance_criteria`, `deploy_required` | Plan des UTL dans continuité existante | Contrat cible, aucun objet UTL autonome certifié |
| Développement | `base_main_sha`, `branch_name`, `branch_head_sha`, `pr_number`, `pr_head_sha`, `pr_ci_run_id`, références de revue, `merge_commit_sha` | GitHub | Réels une fois créés/observés |
| Déploiement | `GITHUB_SHA`, `ci_main_run_id`, `deploy_workflow_run_id` (`GITHUB_RUN_ID`), `deploy_job_id`, `requestedSha`, `runtimeRevision` | MCP CI, GitHub Actions, MCP Deploy | Réels et vérifiables |
| Santé et production | `phase`, `status`, `healthOk`, `oauthOk`, `mcpAuthOk`, `rollbackStatus`, `runtime_image_id`, `observed_at` | Governed Deploy + Live State | Réels quand attestés |
| Résultat | `attestation_ref`, `checkpoint_ref`, `NEXT_ACTION`, preuve de couverture des critères parent | Issue/PR/checkpoints et backlog existants | Corrélation cible vers références réelles |

## 20. Contrats et passage de contrôle

| Contrat | Identifiants minimaux | Porte d'entrée/sortie |
|---|---|---|
| `T_IN` | `continuityId`, identifiant de parent (`TASK-*` E1 ou issue/travail E2), `blueprintRef` si applicable, objectif, droits prouvés | Travail gouverné pris en charge |
| `UTL_PLAN` | `parent_work_ref`, `utl_ref[]`, dépendances, critères, collisions, preuves d'écarts | Une ou plusieurs UTL proposées, ou aucune si déjà satisfait |
| `D_IN` | `utl_ref`, parent, `base_main_sha`, périmètre, admission, dépendances | Développement autorisé |
| `D_OUT` | `utl_ref`, `pr_number`, `pr_head_sha`, `pr_ci_run_id`, revue, `merge_commit_sha` | Fusion réelle dans `main` |
| `L_IN` | `main_sha=GITHUB_SHA`, `ci_main_run_id`, admission `push_ci_gate`, `deploy_workflow_run_id` | Workflow déclenché après push main, écriture soumise à CI success |
| `L_OUT` | `deploy_job_id`, `requestedSha`, `runtimeRevision`, `status/phase`, santé, preuve de rollback, URL de run | Déploiement attesté ou échec documenté |
| `UTL_OUT` | `utl_ref`, `D_OUT`, `L_OUT` si déploiement requis, critères UTL vérifiés | Unité complète ou bloquée |
| `T_OUT` | parent, ensemble des UTL et preuves, intégration finale, critères globaux, checkpoint | Tâche achevée ou reprise gouvernée |

**Règles d'égalité** : la révision de production attestée vérifie `GITHUB_SHA = requestedSha = runtimeRevision`. `pr_head_sha` n'est pas nécessairement égal à `merge_commit_sha` (merge/squash). Les identifiants des workflows et des jobs sont distincts des SHA. Les déploiements successifs du même SHA et les retries doivent avoir des identités de run conservées ; pas de déclaration de succès sans preuve.

## 21. Champs E1/E2 officiellement présents

`GovernedWorkEntryTrace` (dans `src/governance/workEntryTrace.ts`) :

```text
schemaVersion
continuityId
repository
entryProfile = INITIAL_GOVERNED_ENTRY | EXTERNAL_GOVERNED_RECOVERY
workSelection = INTERNAL_MCP_TASK_ASSIGNMENT | OWNER_DIRECTLY_REQUESTED_WORK | AGENT_IDENTIFIED_WORK_WITHIN_EXISTING_OWNER_MANDATE
explicitOwnerSelection
instructions.summary
instructions.sourceUrl
responsible.githubActor
responsible.internalTaskId  # E1 uniquement ; n'est pas un claim
github.issueNumber
github.branch
github.pullRequestNumber
github.headSha
github.mergeSha
checkpoint.url
checkpoint.nextAction
deployment.workflowRunUrl
deployment.runtimeRevisionSha
stage = ISSUE_OPENED | PR_OPENED | MAIN_MERGED | S1_ATTESTED
```

**Important** : ce composant est un contrat de preuve `read-only`, pas un dispatcher ni une autorisation. Il exige une tâche interne référencée pour E1, mais interdit une tâche interne fictive pour E2. Il requiert, pour l'étape `S1_ATTESTED`, un run de déploiement référencé et une `runtimeRevisionSha` égale au `github.mergeSha`.

## 22. Instances réelles comme témoins de la matrice

### 22.1 Travail E2 PR #365

- Continuité : `MCP-PILOT-E2-01-CONT-20261030-ROOT-01`.
- Issue canonique : `#359`.
- Pull Request : `#365`.
- SHA intégré : `fbbacfb53e43dada95b969f39eef03efb6f08dcb`.
- CI main : `41170431672`.
- GitHub workflow Governed Deploy : `41170431660`.
- SHA runtime historiquement attesté : `fbbacfb53e43dada95b969f39eef03efb6f08dcb`.
- La PR #365 n'est pas marquée officiellement UTL : aucune `utl_ref` réelle attribuée ici.
- Preuves : https://github.com/Patricked-code/MCP/pull/365 et https://github.com/Patricked-code/MCP/pull/367.

### 22.2 Travail issu de PB-F, blueprint `TB-W3-F-03`

- Programme : `program-backlog-convergence-v2-20260924`.
- Work Item : `PB-F` ; Wave : `W3` ; Lot : `F.2`.
- Blueprint : `TB-W3-F-03` ; PR incrémentales : `#259`, `#260`, `#261` ; clôture documentaire : `#263`.
- Fusion PR finale : `6576b5287f23566684005adf6032734e2ecdea50`.
- CI main : `37817792888` ; Governed Deploy : `37817792904`.
- Runtime historiquement attesté : `6576b5287f23566684005adf6032734e2ecdea50`.
- `runtimeTasksCreated: 0` dans les preuves documentées ; **ne pas affirmer qu'un ID `TASK-*` fut créé pour ce travail**.
- Ces incréments sont analogues aux UTL, **pas des objets UTL runtime historiques**.
- Preuves : https://github.com/Patricked-code/MCP/pull/259 ; /260 ; /261 ; /263 et le backlog versionné.

## 23. Invariants de stockage et de traçabilité

1. Réutiliser les identifiants émis par chaque autorité, ne jamais les remplacer par des chaînes inventées.
2. Conserver une seule continuité canonique par chantier, mais plusieurs tâches/UTL/PR/runs liés ; ne pas confondre la continuité E2 pilote #359 avec le chantier GD-U #349.
3. Ne pas créer de deuxième Task Queue, claim, session, lock, pipeline de déploiement ou registre autoritatif UTL concurrent.
4. Toute UTL peut être corrigée sur sa PR avant fusion ; les retries ne créent pas automatiquement de nouvelle UTL.
5. Conserver les preuves de chaque fusion et déploiement exact SHA et du résultat global du parent.
6. Lier les observations du runtime à une date ; un runtime actuel ne prouve pas qu'il a exécuté chaque SHA historique successif.
7. `UTL_OUT` et `T_OUT` sont des noms de contrats conceptuels, pas des structures métier déjà intégrées au code MCP.
