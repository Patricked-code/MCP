# GWC — affirmations remplacées

Ce fichier existe pour une seule raison : **un agent qui récupère un fragment d'une ancienne
révision ne doit jamais croire qu'il lit l'état courant.** Chaque ligne ci-dessous a été
affirmée puis remplacée. Aucune n'est valide aujourd'hui.

Le corps canonique est `docs/gwc/ARCHITECTURE_73_CONTRACTS.md` (révision `R3`). L'archive
non canonique de R2 est `docs/gwc/archive/ARCHITECTURE_R2_NON_CANONICAL.md`.

## DC-01 — « Le moteur que vous décrivez existe déjà »

| | |
| --- | --- |
| Affirmé en | R2, réponse de session |
| Statut | **FAUX en l'état** |
| Remplacé par | La Governed Task Queue existe et fournit `initializeSeed`, `firstExecutable`, le claim, le cycle de vie, les priorités, les dépendances, l'ownership et les conflits de ressources. Elle **n'est pas** le GWC Workflow Execution Engine. |

Le moteur reste à construire comme couche d'orchestration distincte composant les autorités
existantes : `ContractRegistry`, `WorkflowGraph`, `ExecutionFrame`, `EvidenceBroker`,
`ContractEvaluator`, `GovernanceGateComposer`, `EffectPlan`, `ActionDispatcher`,
`PostconditionVerifier`, `GraphRouter`, `ResumeResolver`, `WAIT_EXTERNAL`, replay/recovery,
protection anti-non-progression, continuation autonome. Il ne détient aucune autorité métier
nouvelle. Blueprint porteur : `GWC-2`.

## DC-02 — Statut `AWAITING_HUMAN_RATIFICATION`

| | |
| --- | --- |
| Affirmé en | R2, `docs/gwc/README.md` et `.mcp/gwc-contracts.json` |
| Statut | **OBSOLÈTE** |
| Remplacé par | `READY_FOR_GOVERNED_IMPLEMENTATION` |

La phase conceptuelle est validée. La validation humaine était une étape de programme, pas un
état d'architecture persistant.

## DC-03 — `TASK-20260916-001 — Ratification humaine de l'architecture`

| | |
| --- | --- |
| Affirmé en | R2, `.mcp/gwc-task-seed.json` |
| Statut | **SUPPRIMÉ** |
| Remplacé par | rien — aucune Governed Task de ratification humaine ne doit exister |

Aucun human gate générique ne doit être créé. Les seules interruptions futures viennent
d'autorités réelles : permission réellement requise, capacité absente, ambiguïté, conflit,
évidence périmée, lock, politique explicite.

## DC-04 — `.mcp/gwc-task-seed.json` comme backlog candidat

| | |
| --- | --- |
| Affirmé en | R2 |
| Statut | **SUPPRIMÉ du dépôt** |
| Remplacé par | `.mcp/gwc-blueprints.json` — registre de blueprints |

`TASK BLUEPRINT ≠ GovernedTaskRecord`. Le modèle correct est :

```text
architecture → blueprints → réconciliation avec la Task Queue live
             → NEW_TASK uniquement → Task runtime
```

Un blueprint peut produire **0, 1 ou N** Governed Tasks selon la réalité live observée au
moment de la matérialisation. L'équation « 1 blueprint = 1 Task » est fausse.

## DC-05 — Graphe `GW-17 → GW-12`

| | |
| --- | --- |
| Affirmé en | R2, section R2.1 |
| Statut | **REMPLACÉ** |
| Remplacé par | le routage canonique `GW-13 → GW-12` et `GW-12 → GW-17` |

L'intuition de R2 était correcte sur le fond — les identifiants ne sont pas une séquence — mais
l'arête exacte ne l'était pas. Le graphe canonique déclare 5 arêtes à rebours — `GW-13 → GW-12`,
`GW-16 → GW-03`, `GW-37 → GW-30`, `GW-37 → GW-31`, `GW-65 → GW-56` — et 16 sauts. La règle
générale demeure : **aucune contrainte `to > from`**.

## DC-06 — Portée `repository:Patricked-code/MCP` sur toutes les tâches

| | |
| --- | --- |
| Affirmé en | R2, `docs/gwc/BACKLOG.md` — « c'est l'anti-dispersion voulue » |
| Statut | **REMPLACÉ** |
| Remplacé par | domaine de collision minimal, par blueprint |

Sérialiser tout le programme derrière une portée globale n'est pas de l'anti-dispersion, c'est
une perte de parallélisme. Principe retenu : `MINIMAL COLLISION DOMAIN` et
`LOCAL BLOCKER REMAINS LOCAL`. Deux travaux indépendants doivent progresser si leurs
dépendances sont satisfaites et leurs portées et locks disjoints. Une portée globale exige
désormais un champ `globalScopeJustification`, contrôlé par `scripts/gwc-verify.mjs`.

## DC-07 — Table des familles « à ratifier »

| | |
| --- | --- |
| Affirmé en | R2 |
| Statut | **RÉSOLU** |
| Remplacé par | les familles portées par la section A de chaque fiche canonique |

Les familles ne sont plus une dérivation à trancher : elles sont déclarées contrat par contrat
dans le corps canonique et projetées telles quelles dans `.mcp/gwc-contracts.json`.

## DC-08 — Classifications R2 des contrats

| | |
| --- | --- |
| Affirmé en | R2 (`maturity` `AI/INW/P/MH/DNI/DB`, `integrationStrategy`, champs `r2Note`) |
| Statut | **REMPLACÉ** |
| Remplacé par | `integrationClassification` et `executionSemantics` des fiches canoniques |

Les reclassifications R2 de C3/C4/C5/D3 et de `GW-56` restent historiquement justes, mais la
classification qui fait foi est celle du corps canonique.

## DC-09 — Conclusions dérivées d'un clone local

| | |
| --- | --- |
| Affirmé en | R1 et R2 (`LOCAL_CLONE_USED = yes`) |
| Statut | **INSUFFISANT pour certification** |
| Remplacé par | revalidation depuis `GITHUB_LIVE` au ref et SHA exacts |

Une donnée live inaccessible n'est jamais compensée par le clone. Elle s'écrit `À VÉRIFIER`.

## DC-10 — Modèle implicite à un seul SHA par projet

| | |
| --- | --- |
| Affirmé implicitement en | R1 et R2 |
| Statut | **REMPLACÉ** |
| Remplacé par | `GWC-10 — B3 Multi-repository TargetScope` |

Un projet peut porter 0, 1 ou N repositories, 0, 1 ou N runtimes, plusieurs endpoints et
plusieurs SHAs indépendants. Cas d'acceptance de référence : le SHA de l'API AfricaFunds
diffère de celui du frontend AfricaFunds. Réduire cela à un `PROJECT_SHA` unique est interdit.

## DC-11 — Câblage de `gwc:verify` en CI « fait partie du LOT 0 »

| | |
| --- | --- |
| Affirmé en | R2 |
| Statut | **PRÉCISÉ** |
| Remplacé par | le câblage CI reste à décider ; `GWC-0` porte le substrat contractuel, pas la politique CI |

Le script reste exécutable manuellement (`npm run gwc:verify`) et par tout agent.

## DC-12 — Graphe matérialisé depuis les seuls `successors`

| | |
| --- | --- |
| Affirmé en | R3, première matérialisation de `.mcp/gwc-workflow-graph.json` |
| Statut | **DÉFECTUEUX** |
| Remplacé par | union exacte des deux sens de routage déclarés par les fiches |

Le générateur ne dérivait les arêtes que du champ `successors` de chaque fiche. Six arêtes ne
sont déclarées que du côté `predecessors` — `GW-11 → GW-13`, `GW-13 → GW-14` et
`GW-47`…`GW-50 → GW-52` — et leur omission rendait `GW-13`, `GW-14` et `GW-15` inatteignables
depuis `GW-01` : 69 contrats sur 73 seulement. Les notations de plage `GW-aa..GW-bb` et les
raccourcis `GW-aa/bb` n'étaient pas non plus développés, d'où la divergence observée autour de
`GW-30`, `GW-32` et `GW-52`.

Défaut relevé par un audit GitHub live indépendant au head `29c46f3c`, reproduit puis corrigé.
`scripts/gwc-verify.mjs` contrôle désormais l'atteignabilité réelle : retirer la seule arête
`GW-11 → GW-13` fait échouer le vérificateur.

## DC-13 — `terminal = GW-73`

| | |
| --- | --- |
| Affirmé en | R3, première matérialisation du graphe |
| Statut | **REMPLACÉ** |
| Remplacé par | `runtimeTerminal = GW-72` et `outOfRuntimeGraph = ["GW-73"]` |

`GW-73 UNIVERSAL_ACCEPTANCE` était déclaré terminal alors qu'aucun chemin canonique n'y menait.
C'est sa sémantique réelle qui l'interdit : sa fiche déclare pour prédécesseur « global
implemented system » et pour successeur « TERMINAL acceptance report ». Il évalue le système
implémenté dans son ensemble et n'est pas une étape terminale de chaque Task runtime. Il est
donc explicitement hors graphe runtime, avec motif et ancres, plutôt que terminal inaccessible.

Le terminal du graphe runtime est `GW-72`, dont le successeur déclaré est « next queued task
resume cycle or idle ».

## DC-14 — `graph.predecessors` / `graph.successors` dans le registre

| | |
| --- | --- |
| Affirmé en | R3, première matérialisation de `.mcp/gwc-contracts.json` |
| Statut | **SUPPRIMÉ** |
| Remplacé par | `graphProjection.incoming` / `graphProjection.outgoing` et `canonicalRouting` |

Ces champs génériques étaient dérivés du seul texte de fiche et contredisaient le graphe
canonique sur `GW-13`, `GW-14`, `GW-16`, `GW-17`, `GW-30`, `GW-32`, `GW-52`, `GW-56` et
`GW-66`. Une seule sémantique est désormais retenue :

- `graphProjection` est une **projection exacte** de `.mcp/gwc-workflow-graph.json`, vérifiée
  arête par arête ;
- `canonicalRouting.predecessorText` et `successorText` conservent le texte libre de la
  section C des fiches, explicitement étiqueté comme prose de traçabilité et jamais comme
  source de graphe.
