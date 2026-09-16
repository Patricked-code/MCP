# GWC — blueprints d'implémentation

Vue lisible de `.mcp/gwc-blueprints.json`. Le JSON fait foi ; ce document en est la projection.

Baseline canonique : `GWC_IMPLEMENTATION_TASK_BLUEPRINTS_R1`. Statut d'architecture : `READY_FOR_GOVERNED_IMPLEMENTATION`.

## Un blueprint n'est pas une Task

`TASK BLUEPRINT ≠ GovernedTaskRecord`. Le chemin est :

```text
architecture
  → blueprints (ce document)
    → réconciliation avec la Governed Task Queue live
      → classification NEW_TASK uniquement
        → Task runtime
```

Un futur materializer peut produire **0, 1 ou plusieurs** Governed Tasks à partir d'un même
blueprint, selon la réalité live observée. Ne jamais supposer `1 blueprint = 1 Task`.

Ces blueprints ne sont chargés par aucun code. Seul `.mcp/task-registry.json` est lu par
`initializeSeed()`, et il ne contient aucun blueprint GWC. État courant :
`promotedToTaskQueue = false`, `runtimeTasksCreated = 0`.

## Prérequis de sûreté

Ces prérequis ont une priorité d'implémentation plus précoce que la position de leur
propriétaire architectural dans le graphe. La propriété architecturale reste inchangée.

| Ordre | Finding | Propriétaire architectural | Motif |
| --- | --- | --- | --- |
| 1 | `AF-19` | `GWC-15` | Le SHA de squash déployé n’est pas le SHA validé par le check requis ; faiblesse vivante de l’autodeploy main. |
| 2 | `AF-22+AF-30` | `GWC-14` | ReviewEvidence non liée au head exact ; intégrité de preuve requise avant toute mutation de merge gouvernée. |
| 3 | `PR-STACK` | `GWC-12` | Réconciliation #88/#89/#90 et disposition #85/#86 avant de dépendre du GitHub Control Plane. |

## Vue d'ensemble

| Blueprint | Titre | Dépend de | Contrats | Findings |
| --- | --- | --- | --- | --- |
| `GWC-0` | Contract substrate | — | — | — |
| `GWC-1` | GW-01 Intent Capture | `GWC-0` | 1 contrats | — |
| `GWC-2` | Execution Engine Skeleton | `GWC-0`, `GWC-1` | — | — |
| `GWC-3` | Wrap existing B1/B2/C2 | `GWC-2` | 3 contrats | — |
| `GWC-4` | Connection/Session/Receipt integration | `GWC-2`, `GWC-3` | 5 contrats | — |
| `GWC-5` | Task/Lock orchestration wrappers | `GWC-2`, `GWC-4` | 6 contrats | — |
| `GWC-6` | Server Resolver C3 | `GWC-3` | 1 contrats | — |
| `GWC-7` | Runtime Resolver C4 | `GWC-6` | 1 contrats | — |
| `GWC-8` | Domain Resolver C5 | `GWC-3`, `GWC-6` | 1 contrats | — |
| `GWC-9` | Governance inheritance and effective capabilities | `GWC-3`, `GWC-4`, `GWC-5` | 2 contrats | — |
| `GWC-10` | B3 Multi-repository TargetScope | `GWC-3`, `GWC-4`, `GWC-5`, `GWC-6`, `GWC-7`, `GWC-8`, `GWC-9` | — | — |
| `GWC-11` | Authority docs / Integration slot / baseline | `GWC-2`, `GWC-10` | 3 contrats | — |
| `GWC-12` | GitHub Control Plane reconciliation | `GWC-11` | — | — |
| `GWC-13` | Development workflow contracts | `GWC-11`, `GWC-12` | 10 contrats | — |
| `GWC-14` | Review / merge contracts | `GWC-12`, `GWC-13` | 10 contrats | `AF-22`, `AF-30` |
| `GWC-15` | Deployment / exact-SHA evidence | `GWC-14` | 14 contrats | `AF-19` |
| `GWC-16` | Documentation and closure | `GWC-15` | 15 contrats | `AF-07` |
| `GWC-17` | Universal Acceptance | `GWC-10`, `GWC-16` | 1 contrats | — |

## Portées de ressource

Principe retenu : `MINIMAL COLLISION DOMAIN` et `LOCAL BLOCKER REMAINS LOCAL`. Aucun blueprint
ne porte la portée globale `repository:Patricked-code/MCP` : deux travaux indépendants doivent
pouvoir progresser si leurs dépendances sont satisfaites et leurs portées et locks disjoints.
Une portée globale exigerait un champ `globalScopeJustification`, contrôlé par
`scripts/gwc-verify.mjs`.

## Graphe de dépendances

```text
GWC-0
├─ GWC-1
│  └─ GWC-2
│     ├─ GWC-3
│     │  ├─ GWC-6
│     │  │  └─ GWC-7
│     │  └─ GWC-8
│     ├─ GWC-4
│     └─ GWC-5
│
├─ GWC-9  (après 3/4/5)
│
└─ GWC-10 (après 3..9)
      │
      └─ GWC-11
          └─ GWC-12
              └─ GWC-13
                  └─ GWC-14
                      └─ GWC-15
                          └─ GWC-16
                              └─ GWC-17
```

## Détail des blueprints

### GWC-0 — Contract substrate

No runtime behavior change.

| Champ | Valeur |
| --- | --- |
| Dépendances | aucune |
| Portées de ressource | `path:src/governedWorkflow`, `path:tests/governedWorkflow` |
| Contrats portés | aucun contrat directement rattaché (lot d'infrastructure) |
| Findings | — |
| Matérialisation | `BLUEPRINT_ONLY` |

**Portée.** GW-01..GW-73 registry; shared types; graph validation; global invariants

### GWC-1 — GW-01 Intent Capture

Pure deterministic, zero side effects.

| Champ | Valeur |
| --- | --- |
| Dépendances | `GWC-0` |
| Portées de ressource | `path:src/governedWorkflow/intentCapture` |
| Contrats portés | `GW-01` |
| Findings | — |
| Matérialisation | `BLUEPRINT_ONLY` |

**Portée.** GW-01 pure parser/normalizer; bounded source/input schema; property tests

### GWC-2 — Execution Engine Skeleton

Shadow/observation first; no global takeover.

| Champ | Valeur |
| --- | --- |
| Dépendances | `GWC-0`, `GWC-1` |
| Portées de ressource | `path:src/governedWorkflow/engine` |
| Contrats portés | aucun contrat directement rattaché (lot d'infrastructure) |
| Findings | — |
| Matérialisation | `BLUEPRINT_ONLY` |

**Portée.** ExecutionFrame; ContractRegistry; WorkflowGraph; EvidenceBroker interface; GraphRouter; ResumeResolver; WAIT_EXTERNAL; no-progress guard

### GWC-3 — Wrap existing B1/B2/C2

Reuse existing resolvers; no semantic regression.

| Champ | Valeur |
| --- | --- |
| Dépendances | `GWC-2` |
| Portées de ressource | `path:src/governedWorkflow/resolvers/identity` |
| Contrats portés | `GW-04`, `GW-05`, `GW-06` |
| Findings | — |
| Matérialisation | `BLUEPRINT_ONLY` |

**Portée.** GW-04; GW-05; GW-06; resolver adapters; multi-repo-compatible outputs

### GWC-4 — Connection/Session/Receipt integration

Preserve auto-resume; no second session authority.

| Champ | Valeur |
| --- | --- |
| Dépendances | `GWC-2`, `GWC-3` |
| Portées de ressource | `path:src/governedWorkflow/adapters/session`, `path:src/operationalMemory/sessionService.ts` |
| Contrats portés | `GW-02`, `GW-03`, `GW-12`, `GW-16`, `GW-17` |
| Findings | — |
| Matérialisation | `BLUEPRINT_ONLY` |

**Portée.** GW-02; GW-03; GW-12; GW-16; GW-17; contract/graph digest binding

### GWC-5 — Task/Lock orchestration wrappers

Task Queue remains scheduler/classification authority.

| Champ | Valeur |
| --- | --- |
| Dépendances | `GWC-2`, `GWC-4` |
| Portées de ressource | `path:src/governedWorkflow/adapters/task`, `path:src/operationalMemory/taskQueue.ts`, `path:src/operationalMemory/lockService.ts` |
| Contrats portés | `GW-13`, `GW-14`, `GW-15`, `GW-18`, `GW-19`, `GW-20` |
| Findings | — |
| Matérialisation | `BLUEPRINT_ONLY` |

**Portée.** GW-13..GW-20; minimal-lock planning; EffectPlan integration

### GWC-6 — Server Resolver C3

Resolve OD-03 with tests.

| Champ | Valeur |
| --- | --- |
| Dépendances | `GWC-3` |
| Portées de ressource | `path:src/governedWorkflow/resolvers/server` |
| Contrats portés | `GW-07` |
| Findings | — |
| Matérialisation | `BLUEPRINT_ONLY` |

**Portée.** GW-07; server identity/canonicalization; GitRegistry evidence

### GWC-7 — Runtime Resolver C4

Resolve OD-04; no MCP container hardcode.

| Champ | Valeur |
| --- | --- |
| Dépendances | `GWC-6` |
| Portées de ressource | `path:src/governedWorkflow/resolvers/runtime` |
| Contrats portés | `GW-08` |
| Findings | — |
| Matérialisation | `BLUEPRINT_ONLY` |

**Portée.** GW-08; RuntimeBinding schema; runtime adapters

### GWC-8 — Domain Resolver C5

Domain NONE remains valid.

| Champ | Valeur |
| --- | --- |
| Dépendances | `GWC-3`, `GWC-6` |
| Portées de ressource | `path:src/governedWorkflow/resolvers/domain` |
| Contrats portés | `GW-09` |
| Findings | — |
| Matérialisation | `BLUEPRINT_ONLY` |

**Portée.** GW-09; domain roles; historical vhost exclusion

### GWC-9 — Governance inheritance and effective capabilities

Compose, do not duplicate CapabilityReality/GovernanceDecision.

| Champ | Valeur |
| --- | --- |
| Dépendances | `GWC-3`, `GWC-4`, `GWC-5` |
| Portées de ressource | `path:src/governedWorkflow/governance`, `path:src/governedContext` |
| Contrats portés | `GW-10`, `GW-11` |
| Findings | — |
| Matérialisation | `BLUEPRINT_ONLY` |

**Portée.** GW-10; GW-11; receipt enrichment

### GWC-10 — B3 Multi-repository TargetScope

Historical single-repo records stay readable.

| Champ | Valeur |
| --- | --- |
| Dépendances | `GWC-3`, `GWC-4`, `GWC-5`, `GWC-6`, `GWC-7`, `GWC-8`, `GWC-9` |
| Portées de ressource | `path:src/operationalMemory`, `path:src/governedContext`, `path:src/liveState` |
| Contrats portés | aucun contrat directement rattaché (lot d'infrastructure) |
| Findings | — |
| Matérialisation | `BLUEPRINT_ONLY` |

**Portée.** TargetContext; TargetScope additive migration; Session/Task/Receipt compatibility; project component roles; independent SHAs

### GWC-11 — Authority docs / Integration slot / baseline

Formalize authority-document roles and exact baseline.

| Champ | Valeur |
| --- | --- |
| Dépendances | `GWC-2`, `GWC-10` |
| Portées de ressource | `path:src/governedWorkflow/authority` |
| Contrats portés | `GW-21`, `GW-22`, `GW-23` |
| Findings | — |
| Matérialisation | `BLUEPRINT_ONLY` |

**Portée.** GW-21; GW-22; GW-23

### GWC-12 — GitHub Control Plane reconciliation

Do not merge stale PR stack blindly.

| Champ | Valeur |
| --- | --- |
| Dépendances | `GWC-11` |
| Portées de ressource | `github:pull-requests`, `path:src/github` |
| Contrats portés | aucun contrat directement rattaché (lot d'infrastructure) |
| Findings | — |
| Matérialisation | `BLUEPRINT_ONLY` |

**Portée.** Reconcile PR #88/#89/#90 with current main; bounded read adapters; exact-head write adapters

### GWC-13 — Development workflow contracts

RED must prove intended failure, not arbitrary CI failure.

| Champ | Valeur |
| --- | --- |
| Dépendances | `GWC-11`, `GWC-12` |
| Portées de ressource | `path:src/governedWorkflow/development` |
| Contrats portés | `GW-24`, `GW-25`, `GW-26`, `GW-27`, `GW-28`, `GW-29`, `GW-30`, `GW-31`, `GW-32`, `GW-33` |
| Findings | — |
| Matérialisation | `BLUEPRINT_ONLY` |

**Portée.** GW-24..GW-33; TDD RED proof; GREEN; self-review; regression loop; project validation profile

### GWC-14 — Review / merge contracts

Resolve AF-22 and AF-30.

| Champ | Valeur |
| --- | --- |
| Dépendances | `GWC-12`, `GWC-13` |
| Portées de ressource | `path:src/governedContext/github.ts`, `path:src/governedWorkflow/review` |
| Contrats portés | `GW-34`, `GW-35`, `GW-36`, `GW-37`, `GW-38`, `GW-39`, `GW-40`, `GW-41`, `GW-42`, `GW-43` |
| Findings | `AF-22`, `AF-30` |
| Matérialisation | `BLUEPRINT_ONLY` |

**Portée.** GW-34..GW-43; ReviewEvidence commit binding; PremergeProof; exact-head merge

### GWC-15 — Deployment / exact-SHA evidence

Resolve AF-19 and OD-12.

| Champ | Valeur |
| --- | --- |
| Dépendances | `GWC-14` |
| Portées de ressource | `path:.github/workflows`, `path:src/deploy`, `path:src/governedWorkflow/deploy` |
| Contrats portés | `GW-44`, `GW-45`, `GW-46`, `GW-47`, `GW-48`, `GW-49`, `GW-50`, `GW-51`, `GW-52`, `GW-53`, `GW-54`, `GW-55`, `GW-56`, `GW-57` |
| Findings | `AF-19` |
| Matérialisation | `BLUEPRINT_ONLY` |

**Portée.** GW-44..GW-57; CI evidence; same deployment job anchor; exact deployment proof; runtime binding

### GWC-16 — Documentation and closure

No false DONE; docs-only deploy may become final runtime SHA.

| Champ | Valeur |
| --- | --- |
| Dépendances | `GWC-15` |
| Portées de ressource | `path:src/governedWorkflow/terminal`, `path:docs` |
| Contrats portés | `GW-58`, `GW-59`, `GW-60`, `GW-61`, `GW-62`, `GW-63`, `GW-64`, `GW-65`, `GW-66`, `GW-67`, `GW-68`, `GW-69`, `GW-70`, `GW-71`, `GW-72` |
| Findings | `AF-07` |
| Matérialisation | `BLUEPRINT_ONLY` |

**Portée.** GW-58..GW-72; docs branch path; final runtime binding; terminal verification; hard DONE gate; checkpoint/lock/session closure

### GWC-17 — Universal Acceptance

Must pass without MCP-specific workflow logic.

| Champ | Valeur |
| --- | --- |
| Dépendances | `GWC-10`, `GWC-16` |
| Portées de ressource | `path:tests/governedWorkflowUniversalAcceptance` |
| Contrats portés | `GW-73` |
| Findings | — |
| Matérialisation | `BLUEPRINT_ONLY` |

**Portée.** GW-73; MCP; Stablecoin; multi-repo/AfricaFunds-like model; recovery scenarios; anti-hardcode acceptance


## Décisions ouvertes à résoudre en tâche

Une décision ouverte n'est pas une permission de deviner. La tâche qui l'implémente doit la
résoudre depuis les contraintes existantes et des tests d'acceptance explicites.

`OD-01` borne du rawIntent GW-01 · `OD-02` enum source GW-01 · `OD-03` normalisation du serverId
canonique · `OD-04` schéma RuntimeBinding · `OD-05` politique d'acquisition atomique multi-locks ·
`OD-06` politique de fraîcheur et de liaison au commit de ReviewEvidence · `OD-07` mécanisme
technique d'application d'AF-19 · `OD-08` Operational Memory singleton contre concurrence
distribuée · `OD-09` migration de version Contract/Graph incompatible · `OD-10` migration
TargetScope pour Session/Task/Receipt · `OD-11` représentation de l'ownership de Task
multi-repository · `OD-12` fenêtre de fraîcheur inter-autorités GW-52.
