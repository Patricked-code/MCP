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


---

## Detailed Evolution Design — recovery index

This section is the resumable design checkpoint for the current DETAILED EVOLUTION DESIGN mission. It is a documentation projection only: it does not create runtime Tasks, Sessions, locks, workflow state, or authority.

DETAILED_EVOLUTION_PROGRESS

- baseline_main: d1f303955c4d368950da2307dda41d826fc85d0a
- pr95_head_before_current_checkpoint: 715393a549e9fae09021b073a50d243007a09346
- completed_blueprints: GWC-0 through GWC-17 (18 of 18)
- in_progress_blueprint: none
- not_started_blueprints: none
- completed_findings: AF-28 (graph incoherence, corrected in R3) and AF-34 (declarative pre-code gate, corrected on both faces)
- open_findings: AF-01..AF-33; AF-19 owned by GWC-15; AF-22/AF-30 owned by GWC-14; AF-29 by GWC-15; AF-31 by GWC-13; AF-32 by GWC-9; AF-33 by GWC-0 (AF-34 corrected and AF-35 resolved at source, see below)
- resolved_open_decisions: none — seven narrowed by evidence (OD-01, OD-02, OD-04, OD-06, OD-07, OD-10), five fully open
- remaining_open_decisions: OD-01..OD-12, all owned, none blocking task reconciliation
- candidate_prs_inspected: #85, #86, #88, #89, #90 observed GITHUB_LIVE at 2026-09-17T03:47Z; dispositions recorded in GWC-12; none merged
- transverse_registries_completed: R1..R13 (13 of 13)
- 73_contract_matrix_status: COMPLETE — generated from .mcp/gwc-contracts.json, 73 rows, 14 owning blueprints
- global_audits_completed: A1 interface, A2 authority, A3 mutation/concurrency, A4 graph/universality (4 of 4)
- verifier_status: extended — Detailed Evolution Design completeness checked by scripts/gwc-verify.mjs
- last_completed_checkpoint: DED-2
- next_exact_action: none within this mission; the design is complete and its verdict is recorded below

Resume rules:
- reobserve main and PR #95 before any write;
- do not restart a completed blueprint unless a new finding or live contradiction invalidates its evidence;
- do not infer runtime Task state from this document;
- do not implement AF-19 or any runtime GWC behavior during this mission;
- preserve CURRENT_MAIN, PR95_DESIGN, and CANDIDATE_OTHER_PR provenance.

### GWC-0 — Contract substrate — Detailed Evolution Design

STATUS: DETAILED_DESIGN_COMPLETE_WITH_OPEN_DECISIONS

CONTRACTS COVERED: infrastructure substrate for GW-01..GW-73; no business contract ownership.

PURPOSE: provide the future engine with typed contract identity, deterministic registry/graph consumption, bounded evaluation results, invariant checks, and version/digest binding without becoming a business authority.

CURRENT_MAIN IMPLEMENTATION:
- canonical design facts already exist in docs/gwc/ARCHITECTURE_73_CONTRACTS.md, .mcp/gwc-contracts.json, .mcp/gwc-workflow-graph.json and .mcp/gwc-blueprints.json;
- scripts/gwc-verify.mjs deterministically checks these design projections;
- there is no runtime ContractRegistry, GovernedStepId, GWC evaluator or GWC persistence layer.

CANDIDATE IMPLEMENTATION: none is needed to establish substrate ownership. PRs #88/#89/#90 concern the Git/GitHub control plane and are later consumers, not owners of the contract substrate.

CURRENT AUTHORITIES: the GWC files above own only versioned design facts. Operational Memory, Task Queue, Lock Service, GitRegistry, Live State, GitHub, S1/runtime, Capability Reality and Governance Decision retain their runtime/business facts.

CURRENT FILES / SYMBOLS:
- .mcp/gwc-contracts.json
- .mcp/gwc-workflow-graph.json
- .mcp/gwc-blueprints.json
- scripts/gwc-verify.mjs
- src/operationalMemory/taskQueue.ts canonical() is existing deterministic serialization, but is private Task Queue behavior and must not silently become a new global authority.

CURRENT TYPES / SCHEMAS: design JSON has structural schemas; no runtime TypeScript GWC contract types exist.

CURRENT CALL GRAPH: design-only GWC Markdown/JSON -> scripts/gwc-verify.mjs -> CI gwc:verify. No runtime GWC call graph exists.

CURRENT TEST COVERAGE: exact-head CI already runs gwc:verify and verifies 73 contracts, runtime reachability, graph projections, 18 blueprints, finding ownership and absence of Task promotion.

CURRENT HARD-CODES: blueprint src/governedWorkflow paths are design targets, not evidence of runtime ownership. Contract/graph schema version is 1.

CURRENT LIMITATIONS: no runtime contract registry/evaluator and no incompatible-version migration rule.

EXACT GAP: no runtime orchestration primitive can resolve a stable GW id while proving the contract/graph version and digest used.

INTEGRATION CLASSIFICATION: NEW for orchestration-only runtime types/registry/evaluator; REUSE for canonical projections and current verifier invariants.

REUSED AS-IS: GW-01..GW-73 namespace, canonical definitions, machine graph, blueprint mapping and verifier invariants.

WRAPPED: versioned design projections through a bounded immutable runtime adapter.

GENERALIZED: canonicalization/digest behavior only through an explicitly shared utility if Task Queue digest semantics remain byte-compatible.

EXTENDED: gwc:verify later checks Detailed Evolution Design completeness where deterministic.

NEW PRIMITIVES: typed GovernedStepId, contract evaluation/result model, immutable ContractRegistry/graph reader and global invariants are justified because no current runtime component owns contract orchestration. Exact file split remains TO_BE_RESOLVED_FROM_EXISTING_ARCHITECTURE.

INTEGRATION SLOT: orchestration layer between GWC-2 and existing authorities; never inside Task Queue or Operational Memory stores.

UPSTREAM DEPENDENCIES: canonical contract/graph projections and digests.

DOWNSTREAM CONSUMERS: GWC-1, GWC-2 and all later wrappers.

DATA MODEL / SCHEMA / PERSISTENCE IMPACT: additive ephemeral runtime types only; no durable GWC workflow state and no existing Task/Session/Lock migration.

AUTHORITY IMPACT: none.

SECURITY / PRIVACY: fail closed on unknown id, malformed registry, incompatible version or digest mismatch; no credentials, prompts or secret material.

CONCURRENCY / LOCK: registry immutable per ExecutionFrame; no lock needed in GWC-0.

REPLAY / RECOVERY: deterministic, side-effect free; recovery comes from authorities plus contract/graph version, never Event Journal replay.

BACKWARD COMPATIBILITY: no existing runtime path changes in first substrate delivery.

MIGRATION STRATEGY: additive version support; incompatible changes stay governed by OD-09; no reinterpretation of historical attestations.

EXPECTED EXISTING FILES TO CHANGE: design/verifier plus exact runtime integration owner once resolved.

EXPECTED NEW FILES: orchestration modules only if no existing owner can host them; filenames deliberately not frozen.

EXPECTED TYPES / FUNCTIONS: stable step id, contract definition projection, evaluation result, bounded reason codes, immutable registry lookup and invariant evaluation.

EXPECTED MCP / WORKFLOW CHANGES: none required except deterministic CI checks if new projections are added.

EXPECTED TEST FILES: contract registry/evaluator and verifier regression tests.

RED TEST PLAN: unknown id, incompatible version and digest mismatch must currently fail because no runtime substrate exists, without touching authorities.

GREEN MINIMAL PLAN: immutable load/evaluate only; no dispatcher and no persistence.

REGRESSION SURFACE: GWC digests, Task Registry digest behavior, CI gwc:verify and historical stores.

PROPERTY / FAIL-CLOSED: unique 73 ids, immutable registry, only known graph ids, unknown versions fail closed, evaluation never mutates authority inputs.

OBSERVABILITY / ATTESTATION: bounded contract id/version/digest/result metadata only; future attestation references evidence but does not replace authority.

ROLLBACK / FORWARD RECOVERY: remove the orchestration consumer without migrating existing authorities; forward recovery by adding supported version.

OPEN DECISIONS: OD-09.

DECISIONS RESOLVABLE FROM EXISTING AUTHORITIES: no durable GWC store; ids are namespace, not chronology; GW-73 is outside the nominal runtime graph.

DEFINITION OF DONE: substrate exposes/evaluates canonical contract/graph deterministically without owning business facts or persisting workflow position.

FUTURE TASK MATERIALIZATION GUIDANCE: REQUIRES LIVE TASK QUEUE RECONCILIATION.

### GWC-1 — GW-01 Intent Capture — Detailed Evolution Design

STATUS: DETAILED_DESIGN_COMPLETE_WITH_OPEN_DECISIONS

CONTRACTS COVERED: GW-01 INTENT_CAPTURE.

PURPOSE: produce a pure bounded representation of incoming intent before Task Queue classification or mutation.

CURRENT_MAIN IMPLEMENTATION: src/operationalMemory/taskQueue.ts reconcileIntent() already owns CONTINUATION, NEW_TASK, DUPLICATE, CONFLICT, BLOCKED and OUT_OF_SCOPE plus dependency/scope conflict checks and optional Task creation. It receives a structured intent and can persist, so it cannot own pure GW-01.

CURRENT AUTHORITIES: raw request/connection input is external; Task Queue remains classification/lifecycle authority.

CURRENT FILES / SYMBOLS: ReconcileIntentInput, IntentClassification, boundedIntentDigest() and reconcileIntent() in src/operationalMemory/taskQueue.ts.

CURRENT TYPES / SCHEMAS: repository, optional taskId, intentKey, title, summary, priority, dependencies and resourceScopes; no canonical bounded rawIntent/source schema.

CURRENT CALL GRAPH: MCP task tool -> reconcileIntent() -> classification/conflict/dependency logic -> optional Task persistence. Future GW-01 must run before this path.

CURRENT TEST COVERAGE: Task Queue classification/mutation is tested; no property suite for pure raw intent capture exists.

CURRENT HARD-CODES: repository currently literal Patricked-code/MCP.

CURRENT LIMITATIONS: raw request bound and source enum are not canonical; capture and classification must remain separate.

EXACT GAP: no pure deterministic API accepts bounded raw input plus provenance and returns normalized intent without classification or mutation.

INTEGRATION CLASSIFICATION: NEW pure adapter at GW-01; REUSE Task Queue downstream.

REUSED / WRAPPED: keep Task Queue classification names and semantics; hand normalized intent downstream only after later contract preconditions.

GENERALIZED / EXTENDED: future targeting compatible with TargetScope; add capture-specific bounded reason codes, not Task Queue conflict semantics.

NEW PRIMITIVES: a pure IntentCapture type/function is justified because reconcileIntent() can mutate and owns a later responsibility.

INTEGRATION SLOT: upstream of Task Queue and task/session mutation.

UPSTREAM / DOWNSTREAM: client/user request and connection provenance -> GW-01 -> bootstrap/router -> Task lookup/create.

DATA MODEL / SCHEMA / PERSISTENCE: ephemeral bounded input/output only; no Task migration and no persistence.

AUTHORITY / SECURITY / PRIVACY: no authority transfer; reject oversized/invalid input; user request never implies permission; do not persist raw prompts/secrets.

CONCURRENCY / LOCK / REPLAY: pure deterministic function; no lock; same input/source gives same normalized result.

FAILURE / RECOVERY: invalid capture stops before mutation.

BACKWARD COMPATIBILITY / MIGRATION: introduce in shadow/evaluate-only mode; current Task Queue callers remain valid until wrapped.

EXPECTED FILES / TYPES / FUNCTIONS: one orchestration-owned pure module may be justified; bounded raw intent, source enum, normalized intent and reason codes; parse/normalize/digest only.

EXPECTED MCP / WORKFLOW CHANGES: none initially.

EXPECTED TESTS: bounds/property tests plus proof of zero Task mutation.

RED / GREEN: RED proves pure capture missing; GREEN implements only parse/normalize, never classification, capability or branch choice.

REGRESSION SURFACE: Task Queue IntentClassification, request digest behavior and historical Task creation.

PROPERTY / FAIL-CLOSED: deterministic, bounded, no mutation, validated source, request does not authorize.

OBSERVABILITY / ATTESTATION: bounded status/reason/digest; no attestation beyond capture result.

ROLLBACK: remove shadow consumer with no data migration.

OPEN DECISIONS: OD-01 rawIntent bound and OD-02 source enum.

DECISIONS RESOLVABLE FROM EXISTING AUTHORITIES: Task Queue keeps classification and GW-01 stays pure.

DEFINITION OF DONE: bounded deterministic capture exists with no classification/mutation and legacy Task Queue behavior unchanged.

FUTURE TASK MATERIALIZATION GUIDANCE: REQUIRES LIVE TASK QUEUE RECONCILIATION.

### GWC-2 — Execution Engine Skeleton — Detailed Evolution Design

STATUS: DETAILED_DESIGN_COMPLETE_WITH_OPEN_DECISIONS

PURPOSE: orchestrate contract evaluation, graph routing, effects, waiting, reobservation and resume while remaining above existing authorities.

CURRENT_MAIN IMPLEMENTATION:
- createGovernedOperationalContextService() already composes Live State, GitHub, Session, locks, Current State, Capability Reality, Task Reality and Governance Decision and derives projected nextAction;
- createCurrentStateService() composes Live State, sessions, Task Queue and catalogue;
- TaskLifecycleCoordinator only serializes lifecycle calls in-process;
- OperationalEventJournal is append-only audit with process-local sequence, not recovery state;
- no universal workflow engine exists.

CURRENT AUTHORITIES: all composed services and their underlying owners; GWC-2 owns orchestration only.

CURRENT FILES / SYMBOLS:
- src/governedContext/service.ts createGovernedOperationalContextService
- src/currentState/service.ts createCurrentStateService
- src/operationalMemory/taskLifecycleCoordinator.ts createTaskLifecycleCoordinator
- src/operationalMemory/eventJournal.ts
- src/operationalMemory/atomicStore.ts

CURRENT TYPES / SCHEMAS: GovernedOperationalContext, CurrentStateInventory and existing authority records/projections. No ExecutionFrame, EffectPlan, routing disposition or RecoveryAnchor type exists.

CURRENT CALL GRAPH: current reads compose authorities and derive projections; mutations remain service/tool-specific. No graph-driven evaluator/planner/dispatcher/postcondition loop.

CURRENT TEST COVERAGE: context/current-state/task/session/lock/audit paths have tests; engine loop, WAIT_EXTERNAL, recovery and no-progress tests do not exist.

CURRENT HARD-CODES: current Session/Task/Current State schemas are MCP repository-specific; the engine must not repeat them.

CURRENT LIMITATIONS: nextAction is projection, not authority; TaskLifecycleCoordinator is not a workflow engine; Event Journal cannot reconstruct authority state.

EXACT GAP: no component performs OBSERVE -> EVALUATE -> PLAN -> AUTHORIZE -> ACT -> REOBSERVE -> VERIFY -> ROUTE/WAIT/RESUME across GWC.

INTEGRATION CLASSIFICATION: NEW orchestration skeleton plus REUSE/WRAP existing authority readers, Governance Decision, Capability Reality, Task Queue, locks and mutations.

REUSED AS-IS: authority ownership and callable != authorized != safeNow semantics.

WRAPPED / GENERALIZED / EXTENDED: wrap reads/mutations with exact pre/postconditions; consume nextAction only as evidence; add bounded engine observability without persisting a workflow cursor.

NEW PRIMITIVES: ephemeral ExecutionFrame, EvidenceBroker, ContractEvaluator, GovernanceGateComposer, EffectPlan, ActionDispatcher, PostconditionVerifier, GraphRouter, ResumeResolver, WAIT_EXTERNAL and no-progress guard. No existing component owns cross-authority orchestration.

INTEGRATION SLOT: above existing services and below request entry; never in Operational Memory persistence.

UPSTREAM / DOWNSTREAM: GWC-0/1 plus authority readers -> engine -> GWC-3..17 adapters.

DATA MODEL / SCHEMA / PERSISTENCE: ephemeral execution/effect/recovery metadata only; no durable workflow state.

AUTHORITY / SECURITY / PRIVACY: engine consumes facts only; dispatcher refuses effects without current authorization, safeNow, evidence and locks; UNKNOWN fails closed; frames store bounded references/digests, not secrets.

CONCURRENCY / LOCK: tolerate revision changes between observe and act; reobserve TOCTOU; never treat process-local queues as distributed locks; use existing Lock Service.

REPLAY / RECOVERY: RECORD effects may replay; MUTATE effects require replay class, postcondition observation and RecoveryAnchor; never replay solely from Event Journal.

FAILURE: CI/review/deploy async states route to WAIT_EXTERNAL rather than replaying previous mutations.

BACKWARD COMPATIBILITY / MIGRATION: shadow engine first; compare planned routes/effects with existing behavior before enforce/dispatch activation.

EXPECTED EXISTING FILES TO CHANGE: integration adapters only where necessary; do not move owners.

EXPECTED NEW FILES / TYPES / SERVICES: orchestration-only modules, ExecutionFrame, evidence semantics, dispositions, fail-closed results, EffectPlan and RecoveryAnchor; exact split remains unfrozen.

EXPECTED MCP / WORKFLOW CHANGES: none initially.

EXPECTED TESTS: routing/evaluation/effect planning/replay/no-progress plus parity against current projections.

RED / GREEN: RED proves missing cross-authority orchestration; minimal GREEN builds a frame, evaluates one contract and chooses a disposition with dispatcher still shadow/disabled.

REGRESSION SURFACE: Governed Context nextAction, Task Queue classification, Session/Lock semantics, Event Journal audit and global shadow write gate.

PROPERTY / FAIL-CLOSED: no authority takeover, bounded no-progress, UNKNOWN never mutates, local blocker stays local, no implicit replay.

OBSERVABILITY / ATTESTATION: contract id, disposition, freshness, effect id, reason codes and postcondition; invocation success is never attestation.

ROLLBACK / FORWARD RECOVERY: recovery anchors and reobservation before retry/compensation.

OPEN DECISIONS: engine consumes results of OD-05, OD-08 and OD-09 but does not own those policies.

DECISIONS RESOLVABLE FROM EXISTING AUTHORITIES: ExecutionFrame ephemeral; Event Journal audit-only; TaskLifecycleCoordinator is not the engine; no durable workflow DB.

DEFINITION OF DONE: shadow engine reconstructs/evaluates/routes from current authorities with no new business authority or durable workflow cursor.

FUTURE TASK MATERIALIZATION GUIDANCE: REQUIRES LIVE TASK QUEUE RECONCILIATION.

### GWC-3 — Wrap existing B1/B2/C2 — Detailed Evolution Design

STATUS: DETAILED_DESIGN_COMPLETE_WITH_OPEN_DECISIONS

CONTRACTS COVERED: GW-04 GITHUB_IDENTITY_RESOLUTION, GW-05 REPOSITORY_RESOLUTION, GW-06 PROJECT_RESOLUTION.

PURPOSE: adapt already-delivered B1/B2/C2 into GWC contracts without changing authority, fail-closed statuses or compatibility.

CURRENT_MAIN IMPLEMENTATION:
- resolveGithubIdentity() and resolveGithubRepository() already implement RESOLVED, NONE, AMBIGUOUS and UNVERIFIED with freshness and bounded reason codes;
- resolveGithubProject() already maps repositoryId -> mappingId -> projectId, preserves activation-readiness separation, returns projectUid/componentRole, validates project-component consistency, and preserves historical MCP mapping-only behavior;
- GitRegistry V2 already models repositoryComponents.

CURRENT AUTHORITIES: GitHub authenticated evidence and Identity Policy for B1; GitHub observation plus GitRegistry evidence/fallback for B2; GitRegistry project/mapping evidence for C2.

CURRENT FILES / SYMBOLS:
- src/github/identityResolution.ts resolveGithubIdentity
- src/github/repositoryResolution.ts resolveGithubRepository
- src/github/projectResolution.ts resolveGithubProject
- src/github/registryV2.ts RegistryProjectSchema and GitRegistryV2Schema

CURRENT TYPES / SCHEMAS: identity/repository/project status, freshness and reason codes; RegistryProjectSchema has projectId, projectUid and repositoryComponents; mappings already include optional projectUid and componentRole.

CURRENT CALL GRAPH: Governed Context GitHub collection/resolution -> B1 -> B2 -> C2/project evidence; future GWC contracts wrap results and add only orchestration metadata.

CURRENT TEST COVERAGE:
- githubIdentityResolution, githubProjectResolution, gitRegistryV2 and gitRegistryProjectCompatibility are included in test:readonly-safety;
- tests/githubRepositoryResolution.test.ts exists but is not currently in test:readonly-safety, which is a real CI coverage gap.

CURRENT HARD-CODES: current repository resolution/schema surfaces still contain Patricked-code/MCP literals. GWC adapters must not add more MCP-only target hardcodes.

CURRENT LIMITATIONS: resolver results focus on one active repository; multi-repository project identity already exists in GitRegistry V2, while propagation through Session/Task/Receipt/TargetScope belongs to GWC-10.

EXACT GAP: no GWC adapter binds B1/B2/C2 observations to contract id/version/evidence semantics while preserving current status/reason behavior.

INTEGRATION CLASSIFICATION: REUSE/WRAP; GENERALIZE only through GWC-10 downstream target scope.

REUSED AS-IS: resolver algorithms, statuses, freshness, reason codes, registry validation and historical MCP compatibility.

WRAPPED: thin contract adapters returning GWC evidence metadata plus unchanged resolver payload.

GENERALIZED: downstream output must support N repository components and never flatten an AfricaFunds-like project into one PROJECT_SHA.

EXTENDED: CI should include repository-resolution tests or explicitly prove equivalent coverage.

NEW PRIMITIVES: no new identity, repository or project resolver; only orchestration adapters are justified.

INTEGRATION SLOT: immediately around current resolver calls in the future EvidenceBroker/ContractEvaluator.

UPSTREAM / DOWNSTREAM: GWC-2 + current connection/GitHub evidence -> GW-04/05/06 wrappers -> GWC-6/7/8, GWC-9 and GWC-10.

DATA MODEL / SCHEMA / PERSISTENCE: no authority schema change in GWC-3; additive adapter result only; no persistence.

AUTHORITY / SECURITY / PRIVACY: existing GitHub/GitRegistry owners remain; preserve AMBIGUOUS/UNVERIFIED fail-closed; identity/project never imply permission; outputs remain sanitized.

CONCURRENCY / LOCK / REPLAY: freshness-bound read-only evaluation; no new lock; deterministic for fixed evidence.

FAILURE / RECOVERY: degraded evidence keeps existing resolver reason codes and routes engine to reobserve/reconcile.

BACKWARD COMPATIBILITY: preserve Patricked-code/MCP -> mcp_bridge mapping-only path; GitRegistry V2 activation readiness remains separate from C2 identity.

MIGRATION STRATEGY: shadow/parity wrappers; compare wrapper output against current resolver output before engine routing depends on it.

EXPECTED EXISTING FILES TO CHANGE: integration callers/tests only unless a proven seam is missing; avoid resolver semantic changes.

EXPECTED NEW FILES / TYPES / FUNCTIONS: optional orchestration adapters carrying contract id/version, freshness and evidence refs; call existing resolver and project result.

EXPECTED MCP / WORKFLOW CHANGES: no new MCP tools; likely CI profile extension for the missing repository-resolution suite.

EXPECTED TESTS: parity tests plus CI coverage for githubRepositoryResolution.

RED / GREEN: RED proves adapter/CI coverage gap while existing resolver tests stay green; GREEN adds thin adapters and coverage with zero semantic resolver change.

REGRESSION SURFACE: B1/B2/C2 status/reasons/freshness, GitRegistry V1/V2 compatibility, activation-readiness separation and MCP mapping-only behavior.

PROPERTY / FAIL-CLOSED: wrapper preserves payload, never upgrades stale evidence, never derives authorization, preserves independent repository components.

OBSERVABILITY / ATTESTATION: expose contract/result/freshness/reason/evidence refs only; resolver output alone never authorizes mutation.

ROLLBACK: disable wrappers and retain current resolver call path; no data migration.

OPEN DECISIONS: TargetScope propagation is owned by GWC-10 with OD-10/OD-11.

DECISIONS RESOLVABLE FROM EXISTING AUTHORITIES: multi-repository project model already exists in GitRegistry V2; no second project registry is needed.

DEFINITION OF DONE: GW-04/05/06 wrappers preserve current behavior exactly, stay multi-repository-compatible downstream and introduce no resolver/registry authority.

FUTURE TASK MATERIALIZATION GUIDANCE: REQUIRES LIVE TASK QUEUE RECONCILIATION.

### GWC-4 — Connection/Session/Receipt integration — Detailed Evolution Design

STATUS: DETAILED_DESIGN_COMPLETE_WITH_OPEN_DECISIONS

CONTRACTS COVERED: GW-02 CONNECTION_BOOTSTRAP, GW-03 CONNECTION_CONTEXT, GW-12 BOOTSTRAP_RECEIPT, GW-16 GOVERNED_SESSION_OPEN_OR_RESUME, GW-17 CONTEXT_ACKNOWLEDGEMENT.

PURPOSE: bind the five connection/session/receipt contracts to the already-delivered Governed Session authority without creating a second session engine, a second receipt or a second transport binding.

CURRENT_MAIN IMPLEMENTATION:
- createConnectionContext() already produces a validated ConnectionContext from a bounded Zod schema;
- createGovernedSessionService() already implements openSession, resumeSession, autoResumeCompatibleSession, heartbeat, acknowledgeContext, createCheckpoint, pauseSession, closeSession, transport lookup/unbind and idle expiry;
- acknowledgeContext already takes expectedStateVersion and every mutating method already takes expectedSessionRevision, so optimistic concurrency exists;
- resumeProof.ts already implements createResumeSecret/hashResumeSecret/verifyResumeSecret, so resume is already proof-bound;
- GovernedOperationalContext already exposes bootstrap.status MISSING/CURRENT/STALE/EXPIRED with a BootstrapReceipt and explicit limitations[].

CANDIDATE IMPLEMENTATION: none. PRs #85/#86/#88/#89/#90 add transport, project and GitHub control-plane surface; none of them owns session, receipt or acknowledgement.

CURRENT AUTHORITIES: Governed Session Service owns session lifecycle, revision and transport binding; Operational Memory store owns persistence and stateVersion; Bootstrap Receipt owns connection freshness. GWC adds no authority over any of them.

CURRENT FILES / SYMBOLS:
- src/operationalMemory/connectionContext.ts ConnectionContextSchema, createConnectionContext
- src/operationalMemory/sessionService.ts GovernedSessionService, createGovernedSessionService, AutoResumeCompatibleSessionInput, CreateCheckpointInput
- src/operationalMemory/resumeProof.ts createResumeSecret, hashResumeSecret, verifyResumeSecret
- src/operationalMemory/transportBindings.ts
- src/governedContext/types.ts GovernedOperationalContext.bootstrap

CURRENT TYPES / SCHEMAS: ConnectionContextSchema; OpenSessionInput/Result; ResumeSessionInput; AutoResumeCompatibleSessionResult with ATTACHED/RESUMED/NONE/AMBIGUOUS; SessionRevisionInput; CreateCheckpointInput carrying completedAction, resultCode, pullRequestNumber, observedHeadSha, blockers and nextAction.

CURRENT CALL GRAPH: transport request -> connection context -> governed session open/resume -> governed context assembly -> acknowledgement -> checkpoint. Future GW-02/03/12/16/17 wrappers observe this path and add contract metadata only.

CURRENT TEST COVERAGE: governedSessionService, governedConnectionBootstrap, serverGovernedConnectionBootstrap, connectionContext, connectionContextBindingCleanup, governedSessionTools and operationalMemoryStore are all in test:readonly-safety.

CURRENT HARD-CODES: AutoResumeCompatibleSessionInput is declared as { repository: 'Patricked-code/MCP' } — a TypeScript literal type, not a parameter. GovernedOperationalContext declares repository: 'Patricked-code/MCP' and governedBranch: 'main' as literal types. These are real single-target hardcodes inside the session/context surface.

CURRENT LIMITATIONS: auto-resume compatibility is expressible for exactly one repository; a session cannot express a multi-component target; AMBIGUOUS is returned but the disambiguating evidence is not carried in the result.

EXACT GAP: no contract-level wrapper binds GW-02/03/12/16/17 to the session authority while proving which contract and graph version produced the acknowledgement, and the literal repository type blocks GWC-10 before any GWC code is written.

INTEGRATION CLASSIFICATION: REUSE/GENERALIZE — matching the canonical classification of GW-02, GW-03, GW-12, GW-16 and GW-17.

REUSED AS-IS: session lifecycle, optimistic revision control, resume proof, transport binding/unbinding, idle expiry, checkpoint creation and bootstrap freshness states.

WRAPPED: contract adapters returning the unchanged session/receipt payload plus contract id, contract version and evidence references.

GENERALIZED: the literal 'Patricked-code/MCP' repository type widens to a target identifier supplied by GW-05/GW-06, keeping the current value as the sole populated instance until GWC-10 lands. This is a type generalization, not a behavior change.

EXTENDED: acknowledgement records which contract/graph digest was acknowledged, so a later resume can detect that the acknowledged design version changed.

NEW PRIMITIVES: none. A second session store, a second receipt or a second acknowledgement path is explicitly rejected.

INTEGRATION SLOT: inside the future EvidenceBroker around existing session service calls; never inside sessionService.ts state transitions.

UPSTREAM / DOWNSTREAM: GWC-2 engine + GWC-3 identity evidence -> GW-02/03/12/16/17 wrappers -> GWC-5 task/lock wrappers, GWC-9 capability composition and GWC-10 target scope.

DATA MODEL / SCHEMA / PERSISTENCE: no session/receipt schema change in GWC-4; the repository literal widening is a compile-time type change with an identical runtime value; persisted records are untouched.

AUTHORITY / SECURITY / PRIVACY: session service remains sole session authority; resume secrets stay hashed and never enter contract evidence; acknowledgement never grants capability; bootstrap MISSING/EXPIRED stays fail-closed.

CONCURRENCY / LOCK / REPLAY: existing expectedSessionRevision / expectedStateVersion remain the only concurrency control; GWC-4 adds no lock; wrappers are pure given a fixed session snapshot.

FAILURE / RECOVERY: AMBIGUOUS, NONE, STALE and EXPIRED keep their current meaning and route the engine to reobserve, never to assume a session.

BACKWARD COMPATIBILITY: existing single-repository sessions stay readable and resumable; no stored record is rewritten; transport lookup keys are unchanged.

MIGRATION STRATEGY: widen the type first with the current value as the only inhabitant, prove parity, then let GWC-10 populate other targets. No data migration in GWC-4.

EXPECTED EXISTING FILES TO CHANGE: sessionService.ts and governedContext/types.ts type declarations only, for the literal widening; no state machine edit.

EXPECTED NEW FILES / TYPES / FUNCTIONS: connection/session/receipt contract adapters carrying contract id, version, digest and evidence refs.

EXPECTED MCP / WORKFLOW CHANGES: no new MCP tool; the existing governed session tools stay the only session surface.

EXPECTED TESTS: parity tests proving wrapper output equals current session output; a type-level test proving the widened repository type still accepts the current value; an acknowledgement-digest regression test.

RED / GREEN: RED proves no contract wrapper exists and that the literal type rejects a second target, while every current session test stays green; GREEN adds adapters and the widened type with zero lifecycle change.

REGRESSION SURFACE: session open/resume/auto-resume, revision conflicts, transport binding cleanup, idle expiry, checkpoint shape, bootstrap freshness and the governed dashboard.

PROPERTY / FAIL-CLOSED: a wrapper never creates, resumes or mutates a session by itself; never upgrades an EXPIRED receipt; never resolves AMBIGUOUS silently; never weakens a revision precondition.

OBSERVABILITY / ATTESTATION: expose contract id/version/digest, session id, revision and receipt freshness only; never the resume secret.

ROLLBACK: drop the adapters and keep the current call path; the widened type stays harmless because its only inhabitant is the current value.

OPEN DECISIONS: OD-08 Operational Memory singleton versus distributed concurrency; OD-10 TargetScope migration for Session/Task/Receipt.

DECISIONS RESOLVABLE FROM EXISTING AUTHORITIES: no second session engine is needed, optimistic concurrency already exists and resume proof already exists; acknowledgement remains a session-owned mutation.

DEFINITION OF DONE: the five contracts evaluate against the existing session authority with unchanged behavior, the repository literal no longer blocks a second target, and no new session state is persisted.

FUTURE TASK MATERIALIZATION GUIDANCE: REQUIRES LIVE TASK QUEUE RECONCILIATION.

### GWC-5 — Task/Lock orchestration wrappers — Detailed Evolution Design

STATUS: DETAILED_DESIGN_COMPLETE_WITH_OPEN_DECISIONS

CONTRACTS COVERED: GW-13 LIVE_STATE_RECONCILIATION, GW-14 EXISTING_TASK_LOOKUP, GW-15 TASK_CREATION_IF_REQUIRED, GW-18 TASK_CLAIM, GW-19 MINIMAL_LOCK_ACQUISITION, GW-20 TASK_IN_PROGRESS.

PURPOSE: express the task and lock contracts as orchestration over the existing Governed Task Queue and Governed Lock Service, which remain the only scheduling, classification, claim and mutual-exclusion authorities.

CURRENT_MAIN IMPLEMENTATION:
- taskQueue.ts already implements initializeSeed, firstExecutable, claim, lifecycle transitions, priorities, dependencies, ownership and resource-conflict detection;
- ALLOWED_TRANSITIONS is an explicit map and contains no self-transition;
- runtimeRevision is carried only by transitionTask, so there is no evidence-only patch path today;
- canonical() and taskRegistryDigest() already provide deterministic serialization and digesting;
- reconcileIntent already returns OUT_OF_SCOPE for a repository other than the governed one;
- lockService.ts already implements acquireLock, releaseLock, releaseLocksForSession, renewLocksForHeartbeat, expireLocks, reconcileSessionLockIds and listActiveLocks, with TTL and session binding;
- liveState reconcile/engine/store/collectors already exist and are covered by CI.

CANDIDATE IMPLEMENTATION: none owns task or lock semantics.

CURRENT AUTHORITIES: Governed Task Queue owns task identity, classification, lifecycle and conflicts; Governed Lock Service owns lock grant, TTL, renewal and release; Live State owns observed reality. GWC-5 introduces no competing authority and no second queue.

CURRENT FILES / SYMBOLS:
- src/operationalMemory/taskQueue.ts ALLOWED_TRANSITIONS, canonical, taskRegistryDigest, initializeSeed, firstExecutable, transitionTask, reconcileIntent
- src/operationalMemory/lockService.ts LockScopeInput, AcquireLockInput, GovernedLockService, createGovernedLockService
- src/operationalMemory/taskLifecycleCoordinator.ts
- src/liveState/reconcile.ts, engine.ts, store.ts, collect.ts

CURRENT TYPES / SCHEMAS: LockScopeInput is a union of { type: 'repository'; key: 'Patricked-code/MCP' }, { type: 'task'; key: string } and { type: 'resource'; key: string }; AcquireLockInput carries exactly one scope, an optional ttlSeconds and a reason.

CURRENT CALL GRAPH: live state reconcile -> task lookup/creation -> claim -> lock acquisition -> IN_PROGRESS transition. The GWC engine wraps each step and never reorders it.

CURRENT TEST COVERAGE: governedTaskQueue, governedLocks, governedTaskTools, taskLifecycle-related suites, liveStateReconcile/Store/Collectors/Engine/Tools and unifiedOperationalWorkState are in test:readonly-safety.

CURRENT HARD-CODES: the repository lock scope key is the literal 'Patricked-code/MCP'. reconcileIntent treats any other repository as OUT_OF_SCOPE. Both are real single-target constraints in the concurrency layer.

CURRENT LIMITATIONS: acquireLock grants exactly one scope per call, so a step needing N locks must perform N non-atomic acquisitions and can deadlock or partially acquire; there is no evidence-only task patch, so recording evidence requires a lifecycle transition; ownership is single-repository.

EXACT GAP: no contract-level planner expresses the minimal lock set of a step and acquires it atomically, and no contract wrapper binds task/lock observations to contract identity without mutating the queue.

INTEGRATION CLASSIFICATION: REUSE for GW-14/GW-18/GW-20; REUSE/GENERALIZE for GW-13/GW-15; REUSE/EXTEND for GW-19 where minimal-set planning and atomic multi-acquisition are the only genuinely missing behavior.

REUSED AS-IS: transition map, claim protocol, dependency and priority resolution, conflict detection, TTL, renewal on heartbeat, release on session close and live-state reconciliation.

WRAPPED: contract adapters over lookup, creation, claim and IN_PROGRESS that return the unchanged queue payload with contract metadata.

GENERALIZED: the repository lock scope key widens from a literal to a target identifier, and reconcileIntent's OUT_OF_SCOPE stays the correct answer until GWC-10 defines a multi-repository target.

EXTENDED: a minimal-lock planner computes the lock set a step requires before any acquisition, and an atomic multi-lock acquisition primitive is added inside the existing Lock Service rather than beside it.

NEW PRIMITIVES: none for task state. The only new element is the lock-set planner, and its acquisition must be implemented inside lockService.ts so that no second lock system exists.

INTEGRATION SLOT: the EffectPlan stage of the engine, immediately before any queue or lock mutation; never inside the transition map.

UPSTREAM / DOWNSTREAM: GWC-2 engine + GWC-4 session -> GW-13/14/15/18/19/20 -> GWC-9 capability composition, GWC-10 target scope and every later mutating family.

DATA MODEL / SCHEMA / PERSISTENCE: no task record schema change in GWC-5; atomic multi-lock acquisition may need an additional store operation, which must remain inside the existing atomicStore contract.

AUTHORITY / SECURITY / PRIVACY: the queue stays the only source of task truth; a wrapper never invents a task id; locks never confer capability; reasons stay bounded and sanitized.

CONCURRENCY / LOCK / REPLAY: this blueprint is the concurrency-critical one. Partial acquisition must fail closed and release what it took; ordering must be deterministic to avoid deadlock; replay must never re-grant a lock that a later session owns.

FAILURE / RECOVERY: on conflict, stale revision or unavailable lock, the engine routes to reobserve/reconcile and never forces a transition. Expired locks are recovered by the existing expireLocks path.

BACKWARD COMPATIBILITY: existing single-scope acquireLock calls keep working unchanged; the planner is additive; historical task records stay readable.

MIGRATION STRATEGY: ship the planner in observation mode first — compute the lock set and compare it against what the current code actually acquires — before letting it drive acquisition.

EXPECTED EXISTING FILES TO CHANGE: lockService.ts for atomic multi-acquisition; type declarations for the widened scope key; no change to ALLOWED_TRANSITIONS.

EXPECTED NEW FILES / TYPES / FUNCTIONS: lock-set planner and task/lock contract adapters.

EXPECTED MCP / WORKFLOW CHANGES: no new MCP tool. The three existing governed task mutation tools stay the only task write surface.

EXPECTED TESTS: deterministic lock ordering, partial-acquisition rollback, deadlock avoidance between two competing plans, planner-versus-actual parity, and unchanged transition behavior.

RED / GREEN: RED proves that acquiring two locks today is non-atomic and can leave a partial grant, while all current queue/lock tests stay green; GREEN adds atomic acquisition and the planner without touching the lifecycle.

REGRESSION SURFACE: ALLOWED_TRANSITIONS, claim/ownership, taskRegistryDigest byte-compatibility, lock TTL and renewal, release on session close, reconcileSessionLockIds and live-state reconciliation.

PROPERTY / FAIL-CLOSED: no partial lock set is ever observable as success; a planner never acquires a lock it did not plan; a wrapper never transitions a task; OUT_OF_SCOPE is never silently upgraded.

OBSERVABILITY / ATTESTATION: expose contract id/version, task id, task status, planned and granted lock scopes and reasons; never internal store paths.

ROLLBACK: disable the planner and return to single-scope acquisition; no data migration, since no task or lock schema changed.

OPEN DECISIONS: OD-05 atomic multi-lock acquisition policy; OD-08 Operational Memory singleton versus distributed concurrency; OD-11 multi-repository task ownership representation.

DECISIONS RESOLVABLE FROM EXISTING AUTHORITIES: the Task Queue is not the GWC engine; no second queue, no second lock system and no durable GWC workflow position are required; the absence of a task in .mcp/task-registry.json is not evidence about the runtime queue.

DEFINITION OF DONE: the six contracts evaluate over the existing queue and lock authorities, a step's minimal lock set is acquired atomically or not at all, and no lifecycle semantics changed.

FUTURE TASK MATERIALIZATION GUIDANCE: REQUIRES LIVE TASK QUEUE RECONCILIATION.

### GWC-6 — Server Resolver C3 — Detailed Evolution Design

STATUS: DETAILED_DESIGN_COMPLETE_WITH_OPEN_DECISIONS

CONTRACTS COVERED: GW-07 SERVER_RESOLUTION.

PURPOSE: resolve a canonical server identity from existing evidence, with the same status/fail-closed discipline as B1/B2/C2, without adding a third server representation.

CURRENT_MAIN IMPLEMENTATION:
- src/config/servers.ts declares type ServerId = 's1' | 's2' and a managedServers record giving each server a label, host, port, username, privateKeyPath and protectedDomains, all sourced from env;
- GitRegistry V2 mappings carry serverId and serverPath, plus realPath, realPathVerified and remoteVerified;
- SSH access is bounded by src/ssh/client.ts, safety.ts and writeSafety.ts.

CANDIDATE IMPLEMENTATION: PR #86 adds a governed S2 project checkout with mapping CS-STABLECOIN-001, which exercises the existing server surface but introduces no server resolver.

CURRENT AUTHORITIES: environment configuration owns connection parameters; GitRegistry V2 owns the mapping between a project component and a server path; SSH observation owns what is actually present on a server. There is no single authority that answers "which server does this target resolve to, and is that proven".

CURRENT FILES / SYMBOLS:
- src/config/servers.ts ServerId, ManagedServerConfig, managedServers
- src/github/registryV2.ts RegistryMappingSchema serverId, serverPath, realPath, realPathVerified, remoteVerified
- src/ssh/client.ts, src/ssh/safety.ts, src/ssh/writeSafety.ts

CURRENT TYPES / SCHEMAS: ServerId is a closed two-value TypeScript union; RegistryMappingSchema.serverId is an open z.string().min(1). Nothing cross-validates the two, so a registry mapping can name a server that managedServers does not know.

CURRENT CALL GRAPH: tool -> managedServers[serverId] -> SSH client -> bounded command. Registry serverId is read separately for evidence and never reconciled against managedServers at load time.

CURRENT TEST COVERAGE: readOnlySafety, gitRegistryV2 and gitRegistryProjectCompatibility cover SSH bounding and registry validation, but no test asserts that every registry serverId is a known managed server.

CURRENT HARD-CODES: ServerId = 's1' | 's2' is a closed MCP-estate enum. protectedDomains are literal lists. These are legitimate for the current estate but must not be copied into the GWC resolver.

CURRENT LIMITATIONS: no canonical normalization of a server identifier, no proof that a registry serverId is resolvable, and no UNVERIFIED/AMBIGUOUS status vocabulary for servers comparable to B1/B2/C2.

EXACT GAP: a governed step can read a serverId but cannot obtain a resolution result stating RESOLVED, NONE, AMBIGUOUS or UNVERIFIED with freshness and bounded reason codes, and cannot prove that the registry and the configuration agree.

INTEGRATION CLASSIFICATION: GENERALIZE/EXTEND — matching the canonical classification of GW-07. NEW is rejected: the raw material already exists in two places and must be reconciled, not re-invented.

REUSED AS-IS: managedServers connection parameters, SSH bounding, registry serverId/serverPath/realPath evidence and the B1/B2/C2 status vocabulary.

WRAPPED: a resolver returning the existing evidence plus a resolution status.

GENERALIZED: the closed ServerId union becomes a canonical server identifier the resolver normalizes, so a project on a server outside the current estate is representable. The current two servers remain the only populated instances.

EXTENDED: a load-time or resolve-time consistency check proving every referenced serverId is a known managed server, failing closed with UNVERIFIED rather than throwing.

NEW PRIMITIVES: none beyond the resolver itself. No second server registry, no second SSH transport, no second connection parameter source.

INTEGRATION SLOT: alongside the existing B2/C2 resolvers, consumed by the EvidenceBroker; never inside managedServers or the SSH client.

UPSTREAM / DOWNSTREAM: GWC-3 project resolution -> GW-07 -> GWC-7 runtime resolution, GWC-8 domain resolution and GWC-15 deployment evidence.

DATA MODEL / SCHEMA / PERSISTENCE: no registry schema change required in GWC-6; if serverId gains a normalization rule it must stay backward-compatible with every stored mapping.

AUTHORITY / SECURITY / PRIVACY: resolution never widens SSH reach; host, username and key path never appear in resolver output; resolving a server never authorizes a command on it.

CONCURRENCY / LOCK / REPLAY: read-only and deterministic for a fixed registry revision and configuration; no lock.

FAILURE / RECOVERY: an unknown or unresolvable serverId yields UNVERIFIED with a bounded reason, never a guessed server.

BACKWARD COMPATIBILITY: every stored mapping with serverId 's1' or 's2' must resolve exactly as today; normalization must be the identity function on existing values.

MIGRATION STRATEGY: introduce normalization in observation mode and assert identity on all stored mappings before any consumer depends on it.

EXPECTED EXISTING FILES TO CHANGE: none semantically; possibly a widened ServerId type declaration.

EXPECTED NEW FILES / TYPES / FUNCTIONS: a server resolution module returning status, canonical server identifier, path evidence, verification flags, freshness and reason codes.

EXPECTED MCP / WORKFLOW CHANGES: none; existing per-server tools stay as they are.

EXPECTED TESTS: normalization identity on every stored mapping, unknown serverId yields UNVERIFIED, registry/configuration disagreement is detected, and no SSH call is made during resolution.

RED / GREEN: RED proves a registry mapping naming an unknown server is currently accepted without any resolution signal; GREEN adds the resolver and the consistency check with zero change to SSH behavior.

REGRESSION SURFACE: registry V1/V2 compatibility, SSH tool bounding, per-server tool routing and mapping validation counters.

PROPERTY / FAIL-CLOSED: never invent a server, never resolve from a domain alone, never treat serverPath as proof that realPath was verified, never emit connection secrets.

OBSERVABILITY / ATTESTATION: expose canonical server identifier, status, verification flags, freshness and reasons only.

ROLLBACK: remove the resolver; managedServers and the registry are untouched.

OPEN DECISIONS: OD-03 canonical serverId normalization.

DECISIONS RESOLVABLE FROM EXISTING AUTHORITIES: server evidence already exists in configuration and registry; realPathVerified and remoteVerified already distinguish declared from verified, and that distinction must be preserved rather than collapsed.

DEFINITION OF DONE: GW-07 returns a bounded resolution status for any target, proves registry/configuration agreement, preserves the declared-versus-verified distinction and adds no new estate hardcode.

FUTURE TASK MATERIALIZATION GUIDANCE: REQUIRES LIVE TASK QUEUE RECONCILIATION.

### GWC-7 — Runtime Resolver C4 — Detailed Evolution Design

STATUS: DETAILED_DESIGN_COMPLETE_WITH_OPEN_DECISIONS

CONTRACTS COVERED: GW-08 RUNTIME_RESOLUTION.

PURPOSE: give a governed step a typed answer to "how does this target actually run", using runtime evidence that already exists, without hardcoding the MCP container or any single runtime technology.

CURRENT_MAIN IMPLEMENTATION:
- runtime observation exists only as bounded MCP tools: docker_status_s1, docker_status_s2, pm2_status_s1, pm2_status_s2 and mcp_runtime_image_attestation_s1;
- src/liveState/collect.ts, engine.ts, store.ts and reconcile.ts already collect and reconcile observed runtime facts;
- the S1 deploy worker records runtime_revision and health_ok/oauth_ok/mcp_auth_ok in its attestation;
- GitRegistry V2 mappings already carry healthChecks: string[] and rollbackMethod: string | null.

CANDIDATE IMPLEMENTATION: PR #86 exercises a Passenger restart path on S2 through tmp/restart.txt and a Next.js build, which is direct evidence that the estate already contains a runtime kind that is neither Docker nor PM2. It adds no runtime model.

CURRENT AUTHORITIES: the server itself, observed through SSH, owns runtime truth; Live State owns the reconciled projection; GitRegistry owns the declared health checks and rollback method. There is no authority that types a runtime.

CURRENT FILES / SYMBOLS:
- src/liveState/collect.ts, src/liveState/engine.ts, src/liveState/types.ts, src/liveState/reconcile.ts
- src/tools/runtimeAttestation.ts, src/tools/readOnly.ts docker/pm2 status tools
- src/deploy/s1Deploy.ts runtime_revision, health_ok, oauth_ok, mcp_auth_ok
- src/github/registryV2.ts healthChecks, rollbackMethod

CURRENT TYPES / SCHEMAS: healthChecks and rollbackMethod are typed; there is no runtime kind enum, no service or container identity, no port, no reverse-proxy binding and no multi-runtime representation. The statement "registryV2 has no runtime model" is only correct in that narrow sense and is stated precisely here.

CURRENT CALL GRAPH: tool -> SSH -> docker/pm2 output -> textual status; live state collectors -> reconcile -> snapshot. No typed runtime object is produced anywhere.

CURRENT TEST COVERAGE: runtimeAttestation, liveStateCollectors, liveStateEngine, liveStateReconcile, liveStateStore and liveStateTools are in test:readonly-safety; none asserts a runtime kind model because none exists.

CURRENT HARD-CODES: runtime observation tools are named per server and per technology (docker_status_s1, pm2_status_s2); mcp_runtime_image_attestation_s1 is MCP- and S1-specific. GWC-7 must not add another such binding.

CURRENT LIMITATIONS: a target whose runtime is Passenger, systemd or a plain checkout has no representation; a target with several runtimes cannot be described; a target with no runtime at all is indistinguishable from an unobserved one.

EXACT GAP: no typed RuntimeBinding exists, so a deployment contract cannot state which runtime it restarted, which one it attested, or that a target legitimately has none.

INTEGRATION CLASSIFICATION: GENERALIZE/EXTEND — matching the canonical classification of GW-08.

REUSED AS-IS: existing docker/pm2/image-attestation observation, live state collection and reconciliation, declared healthChecks and rollbackMethod.

WRAPPED: existing observations become typed RuntimeBinding evidence rather than free text.

GENERALIZED: the RuntimeBinding model must cover, at minimum, NO_RUNTIME, CHECKOUT_ONLY, DOCKER, DOCKER_COMPOSE, SYSTEMD, PROCESS_MANAGER (PM2 and equivalents) and PASSENGER, and must express SINGLE_RUNTIME and MULTI_RUNTIME. Every one of these kinds is present or directly implied by the current estate; none is speculative.

EXTENDED: the deployment attestation later references the resolved RuntimeBinding so that "restarted" and "attested" name the same runtime.

NEW PRIMITIVES: the RuntimeBinding type itself. It is justified because no current component types a runtime, and it is deliberately declared as evidence, not as an executor: GWC-7 resolves, it never restarts.

INTEGRATION SLOT: after GW-07 server resolution, consumed by GWC-15 deployment contracts; never inside the SSH tools.

UPSTREAM / DOWNSTREAM: GWC-6 -> GW-08 -> GWC-15 GW-49/GW-50/GW-51/GW-52 and GWC-16 final runtime binding.

DATA MODEL / SCHEMA / PERSISTENCE: an additive optional runtime descriptor on the registry mapping is the natural home, but it must remain optional so every stored mapping stays valid. No durable GWC runtime store.

AUTHORITY / SECURITY / PRIVACY: the server remains runtime authority; a declared runtime never overrides an observed one; resolution never restarts, rebuilds or mutates anything; command output stays sanitized.

CONCURRENCY / LOCK / REPLAY: observation is point-in-time and must carry freshness; a RuntimeBinding is never replayed as current without revalidation.

FAILURE / RECOVERY: unobservable runtime yields UNVERIFIED, never NO_RUNTIME. Conflating "not observed" with "none" is the single most dangerous failure mode of this contract and must be tested explicitly.

BACKWARD COMPATIBILITY: existing mappings without a runtime descriptor stay valid and resolve to UNVERIFIED rather than failing.

MIGRATION STRATEGY: additive optional field; populate from observation; never backfill a runtime kind from a guess.

EXPECTED EXISTING FILES TO CHANGE: liveState types for the typed projection; registryV2 only if the optional descriptor is added there.

EXPECTED NEW FILES / TYPES / FUNCTIONS: RuntimeBinding schema and a runtime resolution module mapping existing observations onto it.

EXPECTED MCP / WORKFLOW CHANGES: no new MCP tool required; existing per-server observation tools remain the evidence source.

EXPECTED TESTS: each runtime kind maps from realistic observation output; unobserved runtime yields UNVERIFIED and never NO_RUNTIME; a multi-runtime target is representable; no restart occurs during resolution; MCP and Stablecoin both resolve without MCP-specific branching.

RED / GREEN: RED proves a Passenger or checkout-only target cannot be described today; GREEN adds the model and the mapping with no change to observation tools.

REGRESSION SURFACE: live state snapshot shape, runtime attestation tool output, deploy status parsing and registry mapping validity.

PROPERTY / FAIL-CLOSED: never infer a runtime from a repository language or a domain; never treat a declared healthCheck as evidence the runtime is up; never assume one runtime per target.

OBSERVABILITY / ATTESTATION: expose runtime kind, identity, revision, freshness and reasons; never raw shell output.

ROLLBACK: drop the resolver and the optional descriptor; observation tools and live state are untouched.

OPEN DECISIONS: OD-04 RuntimeBinding schema.

DECISIONS RESOLVABLE FROM EXISTING AUTHORITIES: runtime kinds must be drawn from the observed estate; "no runtime" is a legitimate resolution and must not be an error; the resolver must never be the restarter.

DEFINITION OF DONE: GW-08 returns a typed, freshness-bound RuntimeBinding for MCP, for a Passenger project and for a checkout-only project, with no MCP or S1 hardcode and no restart performed.

FUTURE TASK MATERIALIZATION GUIDANCE: REQUIRES LIVE TASK QUEUE RECONCILIATION.

### GWC-8 — Domain Resolver C5 — Detailed Evolution Design

STATUS: DETAILED_DESIGN_COMPLETE_WITH_OPEN_DECISIONS

CONTRACTS COVERED: GW-09 DOMAIN_RESOLUTION.

PURPOSE: resolve the public surface of a target from the three domain representations that already exist, while keeping "this target has no public domain" a valid, first-class answer.

CURRENT_MAIN IMPLEMENTATION:
- GitRegistry V2 mappings carry domain: string | null and domainVerified: boolean;
- RegistryProjectSchema carries publicDomain, publicApi and historicalVhosts, so the project level already separates the current public surface from retired vhosts;
- managedServers declares protectedDomains per server as literal lists (eleven for S1, nine for S2);
- bounded tools list_domains_s1, list_domains_s2 and curl_domain already observe and probe domains.

CANDIDATE IMPLEMENTATION: PR #86 adds frontend/auth/api health checks for a Stablecoin domain on S2, confirming that a project's public surface is already multi-endpoint in practice. It adds no resolver.

CURRENT AUTHORITIES: the server and its vhost configuration own what is actually served; GitRegistry owns the declared domain and the historical vhosts; protectedDomains owns a safety list. No authority reconciles them.

CURRENT FILES / SYMBOLS:
- src/github/registryV2.ts RegistryMappingSchema domain, domainVerified; RegistryProjectSchema publicDomain, publicApi, historicalVhosts
- src/config/servers.ts managedServers protectedDomains
- src/tools/readOnly.ts list_domains_s1, list_domains_s2, curl_domain

CURRENT TYPES / SCHEMAS: domain is nullable at mapping level; publicDomain/publicApi/historicalVhosts exist at project level; protectedDomains is a plain string array. Three representations, no common type and no cross-validation.

CURRENT CALL GRAPH: tool -> SSH vhost listing or HTTP probe -> textual result; registry read -> declared domain. The declared and the observed are never joined.

CURRENT TEST COVERAGE: gitRegistryV2, gitRegistryProjectCompatibility and readOnlySafety cover schema validity and tool bounding; no test joins declared domain to observed vhost.

CURRENT HARD-CODES: protectedDomains are literal estate lists. They are a safety mechanism and must stay, but the resolver must not treat them as the domain model.

CURRENT LIMITATIONS: a project with no public domain is indistinguishable from one whose domain was never recorded; a historical vhost can be mistaken for a current one outside the project record; there is no domain role vocabulary separating a frontend host from an API host.

EXACT GAP: no resolver returns the current public surface of a target with roles, verification status and explicit exclusion of historical vhosts, and no contract can state NONE as a proven answer.

INTEGRATION CLASSIFICATION: GENERALIZE/EXTEND — matching the canonical classification of GW-09.

REUSED AS-IS: declared domain and domainVerified, project publicDomain/publicApi/historicalVhosts, protectedDomains safety semantics and the existing observation tools.

WRAPPED: declared and observed domain evidence returned together with a single resolution status.

GENERALIZED: a domain role vocabulary covering at least FRONTEND, API and NONE, so that a project with a frontend and an API host is described without inventing a second registry; publicApi already implies this split.

EXTENDED: explicit exclusion of historicalVhosts from the resolved current surface, with the excluded entries reported rather than silently dropped.

NEW PRIMITIVES: none beyond the resolver and the role vocabulary. No second domain registry and no new probing tool.

INTEGRATION SLOT: after GW-05/GW-06 and GW-07, consumed by GWC-15 health-check contracts.

UPSTREAM / DOWNSTREAM: GWC-3 and GWC-6 -> GW-09 -> GWC-15 GW-50 health check and GWC-16 terminal verification.

DATA MODEL / SCHEMA / PERSISTENCE: no schema change is strictly required; a role annotation, if added, must be optional so stored records stay valid.

AUTHORITY / SECURITY / PRIVACY: resolution never mutates a vhost; protectedDomains keeps its blocking role unchanged; a resolved domain never authorizes a write; probe output stays sanitized.

CONCURRENCY / LOCK / REPLAY: read-only, freshness-bound, no lock; a stale probe is never presented as current.

FAILURE / RECOVERY: unobservable domain yields UNVERIFIED; a project genuinely without a public surface yields NONE. These two must never collapse into one another.

BACKWARD COMPATIBILITY: mappings with domain null keep resolving without error; historicalVhosts keeps its current meaning; protectedDomains behavior is untouched.

MIGRATION STRATEGY: additive, observation-first; no backfill of a role from a domain name pattern.

EXPECTED EXISTING FILES TO CHANGE: none semantically; optionally an added optional role annotation.

EXPECTED NEW FILES / TYPES / FUNCTIONS: a domain resolution module returning status, current surface with roles, excluded historical vhosts, verification flags, freshness and reasons.

EXPECTED MCP / WORKFLOW CHANGES: none; list_domains and curl_domain remain the observation surface.

EXPECTED TESTS: NONE is distinguishable from UNVERIFIED; historical vhosts are excluded and reported; a frontend plus API project resolves both roles; a protected domain is never mutated during resolution.

RED / GREEN: RED proves a project without a public domain cannot currently be distinguished from an unrecorded one; GREEN adds the resolver with no change to probing or protection.

REGRESSION SURFACE: registry validity, protectedDomains enforcement, domain listing tools and health-check inputs.

PROPERTY / FAIL-CLOSED: never derive a domain from a repository name, never promote a historical vhost, never treat a successful probe of one role as proof for another.

OBSERVABILITY / ATTESTATION: expose roles, statuses, verification flags, exclusions, freshness and reasons.

ROLLBACK: remove the resolver; all three current representations remain as they are.

OPEN DECISIONS: none specific to GW-09; the role vocabulary is resolvable from publicDomain/publicApi and must be fixed by acceptance tests rather than left open.

DECISIONS RESOLVABLE FROM EXISTING AUTHORITIES: historical vhosts are already separated at project level and that separation is authoritative; domain NONE is valid; protectedDomains is a safety list, not the domain model.

DEFINITION OF DONE: GW-09 resolves the current public surface with roles for a multi-endpoint project, returns a proven NONE where applicable, excludes historical vhosts explicitly and adds no new estate hardcode.

FUTURE TASK MATERIALIZATION GUIDANCE: REQUIRES LIVE TASK QUEUE RECONCILIATION.

### GWC-9 — Governance inheritance and effective capabilities — Detailed Evolution Design

STATUS: DETAILED_DESIGN_COMPLETE_WITH_OPEN_DECISIONS

CONTRACTS COVERED: GW-10 GOVERNANCE_INHERITANCE, GW-11 EFFECTIVE_CAPABILITIES.

PURPOSE: compose the governance and capability facts that already exist into an effective decision for a step, without creating a second governance decision engine or a second capability reality.

CURRENT_MAIN IMPLEMENTATION:
- deriveCapabilityReality() and projectRegisteredCapabilityRealities() already produce CapabilityReality with CallabilityStatus CALLABLE/NOT_CALLABLE/UNKNOWN and CallabilitySource SERVER/TRANSPORT/CLIENT_ATTESTATION;
- deriveGovernancePreconditionReasons() already produces bounded precondition reasons;
- deriveTaskReality() already produces TaskReality with observed phase, drift and evidence;
- deriveGovernanceDecision() already composes task, session and capability facts into a GovernanceDecision;
- deriveShadowWriteDecision() and decorateScopedWriteServer() already implement a shadow write gate with verdict and wouldBlock;
- GovernedOperationalContext already exposes capabilityReality[], governanceDecision and gate.mode 'off' | 'shadow'.

CANDIDATE IMPLEMENTATION: PRs #88/#89/#90 each add write surface behind ENABLE_WRITE_TOOLS and a shadow_ready hard gate. They extend what must be governed; they do not own the governance decision.

CURRENT AUTHORITIES: Capability Reality owns what is actually callable; Governance Decision owns the composed verdict; the Scoped Write Gate owns whether a write may proceed. GWC-9 composes; it decides nothing new.

CURRENT FILES / SYMBOLS:
- src/governance/operationalDecision.ts CapabilityReality, deriveCapabilityReality, projectRegisteredCapabilityRealities, deriveGovernancePreconditionReasons, TaskReality, deriveTaskReality, GovernanceDecision, deriveGovernanceDecision
- src/governance/scopedWriteGate.ts ShadowWriteDecision, deriveShadowWriteDecision, decorateScopedWriteServer, getDefaultScopedWriteGateDependencies
- src/tools/registrationPolicy.ts, src/server.ts registration surfaces
- src/governedContext/service.ts, dashboard.ts

CURRENT TYPES / SCHEMAS: tri-state statuses are already the norm — CallabilityStatus and TriStateStatus both carry UNKNOWN — which is exactly the fail-closed vocabulary GW-10/GW-11 require.

CURRENT CALL GRAPH: registration catalog -> capability reality -> governance precondition reasons -> task reality -> governance decision -> governed context -> shadow write gate at call time.

CURRENT TEST COVERAGE: governanceDecisionShadowParity, operationalDecisionEdgeCases, scopedWriteGate, governedDashboard, currentToolCatalog, functionCartography and clientToolSurfaceAttestation are in test:readonly-safety.

CURRENT HARD-CODES: the gate mode vocabulary is 'off' | 'shadow'; there is no enforcing mode yet, which is a deliberate current state and not a defect.

CURRENT LIMITATIONS: the registration surfaces are uneven. The cartography at CURRENT_MAIN records 111 registered tools split as 68 read, 40 scoped-write and 3 operational-write. Only the 40 scoped-write tools pass through decorateScopedWriteServer; the 3 operational-write tools — the governed task mutations — are registered on the registration catalog only and therefore traverse no write gate, not even in shadow mode. This is recorded as finding AF-32.

EXACT GAP: no contract composes inherited governance with effective capability for a specific step and target, and one registration surface escapes the gate entirely, so "effective capability" cannot currently be stated truthfully for every mutation.

INTEGRATION CLASSIFICATION: PARTIAL/GENERALIZE for GW-10 and REUSE/EXTEND for GW-11, matching the canonical classification.

REUSED AS-IS: capability derivation, precondition reasons, task reality, governance decision composition, shadow verdict and tri-state vocabulary.

WRAPPED: a step-scoped effective-capability query returning the existing decision plus the contract it was evaluated for.

GENERALIZED: composition becomes target-scoped rather than implicitly global, so GWC-10 can ask the same question per repository component.

EXTENDED: AF-32 is closed by routing the operational-write surface through the same gate, in shadow mode first, so that every mutation is observable before any mode becomes enforcing.

NEW PRIMITIVES: none. A second governance decision engine and a second capability reality are explicitly rejected.

INTEGRATION SLOT: the GovernanceGateComposer stage of the engine, reading the existing derivations; never a reimplementation of them.

UPSTREAM / DOWNSTREAM: GWC-3, GWC-4 and GWC-5 -> GW-10/GW-11 -> every mutating contract from family E onward, and GWC-10 for per-component composition.

DATA MODEL / SCHEMA / PERSISTENCE: no schema change; composition is derived and ephemeral.

AUTHORITY / SECURITY / PRIVACY: this is the security-critical blueprint. UNKNOWN must never be read as permitted; a client attestation must never outrank a server observation; composing two permissive facts must never manufacture a permission neither grants.

CONCURRENCY / LOCK / REPLAY: pure given a fixed snapshot; no lock; a composed decision is bound to the snapshot freshness and is never replayed as current.

FAILURE / RECOVERY: any missing input yields UNKNOWN and blocks; degraded capability evidence blocks rather than downgrades.

BACKWARD COMPATIBILITY: gate.mode stays 'off' | 'shadow'; routing the operational-write surface through the gate in shadow mode changes no outcome, only observability.

MIGRATION STRATEGY: shadow parity first — record what the gate would have decided for the three operational-write tools and prove it matches current behavior before any enforcement is contemplated.

EXPECTED EXISTING FILES TO CHANGE: src/server.ts registration of the governed task mutation tools, to add the gate decoration alongside the existing catalog decoration.

EXPECTED NEW FILES / TYPES / FUNCTIONS: a step-scoped effective-capability composer.

EXPECTED MCP / WORKFLOW CHANGES: no new tool; the cartography surface counters change when the operational-write surface is decorated, so the cartography digest must be regenerated with the repository tooling.

EXPECTED TESTS: UNKNOWN never composes to permitted; client attestation never outranks server observation; the three operational-write tools produce a shadow decision; cartography counters and digest stay consistent.

RED / GREEN: RED proves a governed task mutation currently traverses no write gate; GREEN decorates that surface in shadow mode with an unchanged outcome.

REGRESSION SURFACE: registration catalog, cartography counters and digest, shadow parity tests, governed dashboard and every write tool's call path.

PROPERTY / FAIL-CLOSED: composition is monotonically restrictive — it can only remove capability, never add it.

OBSERVABILITY / ATTESTATION: expose the composed verdict, its inputs, their sources and freshness, and the contract it was evaluated for.

ROLLBACK: remove the composer and the added decoration; the existing derivations are untouched.

OPEN DECISIONS: none blocking. The enforcing gate mode is deliberately out of scope for GWC-9 and belongs to a later governed decision.

DECISIONS RESOLVABLE FROM EXISTING AUTHORITIES: tri-state fail-closed vocabulary already exists and is authoritative; the shadow gate is the right mechanism and must be reused rather than duplicated.

DEFINITION OF DONE: GW-10 and GW-11 answer per step and per target from existing derivations only, every registered mutation traverses the gate at least in shadow mode, and no composition can widen capability.

FUTURE TASK MATERIALIZATION GUIDANCE: REQUIRES LIVE TASK QUEUE RECONCILIATION.

### GWC-10 — B3 Multi-repository TargetScope — Detailed Evolution Design

STATUS: DETAILED_DESIGN_COMPLETE_WITH_OPEN_DECISIONS

CONTRACTS COVERED: no contract is directly attached. This is the infrastructure lot that makes families B through H expressible for a project made of several repositories.

PURPOSE: let one governed project own several repository components with independent SHAs, without flattening them into a single PROJECT_SHA and without creating a second project registry.

CURRENT_MAIN IMPLEMENTATION:
- RegistryProjectSchema already declares repositoryComponents as an array of { repositoryId, mappingId, role } with a minimum of one and a maximum of twenty;
- the same schema already declares projectUid, globalCheckpointRepositoryId and centralGovernanceRepositoryId;
- RegistryMappingSchema already declares optional projectUid and componentRole;
- resolveGithubProject() already returns projectUid and componentRole and validates project-component consistency.

The multi-repository model therefore already exists in GitRegistry V2. Any statement that it must be created is false and is recorded as such.

CANDIDATE IMPLEMENTATION: none adds a target scope. PR #86 adds a second project on S2 and explicitly leaves its backend repository as LIVE_DISCOVERY_REQUIRED rather than inventing one, which is the correct behavior and should be preserved.

CURRENT AUTHORITIES: GitRegistry V2 owns the project/component model. Operational Memory owns session, task and lock records. Live State owns observed reality. GWC-10 changes none of these owners.

CURRENT FILES / SYMBOLS:
- src/github/registryV2.ts RegistryProjectSchema repositoryComponents, projectUid, globalCheckpointRepositoryId, centralGovernanceRepositoryId; RegistryMappingSchema projectUid, componentRole
- src/github/projectResolution.ts resolveGithubProject
- src/operationalMemory/sessionService.ts AutoResumeCompatibleSessionInput
- src/operationalMemory/lockService.ts LockScopeInput
- src/operationalMemory/taskQueue.ts reconcileIntent
- src/governedContext/types.ts GovernedOperationalContext

CURRENT TYPES / SCHEMAS: the registry is already multi-repository; the operational layer is not. Four literal single-target types block it, and all four are verified at CURRENT_MAIN: AutoResumeCompatibleSessionInput.repository is the literal 'Patricked-code/MCP'; LockScopeInput's repository variant has key typed as the literal 'Patricked-code/MCP'; GovernedOperationalContext declares repository as that same literal and governedBranch as the literal 'main'; reconcileIntent returns OUT_OF_SCOPE for any other repository.

CURRENT CALL GRAPH: registry project/component evidence reaches the resolvers, but stops at the operational boundary because session, lock and context types cannot carry it.

CURRENT TEST COVERAGE: gitRegistryV2 and gitRegistryProjectCompatibility cover the component model; githubProjectResolution covers component roles. No test covers a session, task, lock or receipt spanning two components, because no type allows it.

CURRENT HARD-CODES: the four literals above are the complete, verified list of blockers at the operational boundary.

CURRENT LIMITATIONS: a task cannot state which component it targets; a lock cannot be scoped to one component; a receipt cannot carry per-component SHAs; auto-resume compatibility cannot be expressed for a project rather than a repository.

EXACT GAP: there is no TargetContext type carrying a project, its components, their roles and their independent SHAs, and no TargetScope by which a session, task, lock or receipt can name a subset of components.

INTEGRATION CLASSIFICATION: GENERALIZE — the model exists and must be propagated, not rebuilt. NEW is rejected for the project model and accepted only for the TargetContext/TargetScope types themselves, which have no current owner.

REUSED AS-IS: repositoryComponents, projectUid, componentRole, global checkpoint and central governance repository designations, and the existing project-component consistency validation.

WRAPPED: resolver output becomes a TargetContext without changing the resolver.

GENERALIZED: the four literal types widen to carry a target identifier. The current value remains the only populated instance until a second project is governed.

EXTENDED: session, task, lock and receipt records gain an optional TargetScope, so a record without one keeps its exact current meaning.

NEW PRIMITIVES: TargetContext and TargetScope only. No second project registry, no second operational memory, no second live state.

INTEGRATION SLOT: between the resolvers and the operational authorities; never inside GitRegistry.

UPSTREAM / DOWNSTREAM: GWC-3 through GWC-9 -> TargetContext/TargetScope -> GWC-11 onward and GWC-17 universal acceptance.

DATA MODEL / SCHEMA / PERSISTENCE: strictly additive and optional. A stored session, task, lock or receipt without a TargetScope must remain valid and must be interpreted exactly as today — as the single current repository. This is the single most important compatibility rule of the whole programme.

AUTHORITY / SECURITY / PRIVACY: a target scope never grants capability; a component's capability must be evaluated per component; one component's approval never authorizes another's mutation.

CONCURRENCY / LOCK / REPLAY: per-component lock scopes are the point of the change — two components of one project must be lockable independently, or the minimal collision domain principle is lost.

FAILURE / RECOVERY: an unresolvable component yields UNVERIFIED for that component only and must not invalidate the others.

BACKWARD COMPATIBILITY: every historical single-repository record stays readable and resumable with no migration and no rewrite. OUT_OF_SCOPE stays the correct answer for a repository outside the governed target.

MIGRATION STRATEGY: additive optional fields; absence means the current single target; never backfill a TargetScope onto a historical record.

EXPECTED EXISTING FILES TO CHANGE: the four literal type declarations, plus optional field additions on the operational record types.

EXPECTED NEW FILES / TYPES / FUNCTIONS: TargetContext and TargetScope schemas and their derivation from resolver output.

EXPECTED MCP / WORKFLOW CHANGES: no new tool; existing tools keep their current target until a second project is governed.

EXPECTED TESTS: a two-component project keeps independent SHAs; a lock on one component leaves the other free; a historical record without a TargetScope is read unchanged; a component that fails to resolve does not poison the others; no PROJECT_SHA is ever synthesized.

RED / GREEN: RED proves a two-component project cannot be represented in a session, task or lock today; GREEN adds the optional scope with every existing record unchanged.

REGRESSION SURFACE: session open/resume, task claim and ownership, lock scoping, receipt shape, live state reconciliation, registry compatibility and the governed dashboard.

PROPERTY / FAIL-CLOSED: never synthesize a single project SHA; never widen a lock from one component to the project; never treat a missing TargetScope as "all components".

OBSERVABILITY / ATTESTATION: expose project uid, component ids, roles and per-component SHAs and freshness.

ROLLBACK: ignore the optional scope; every record remains valid because the field was never required.

OPEN DECISIONS: OD-10 TargetScope migration for Session/Task/Receipt; OD-11 multi-repository task ownership representation.

DECISIONS RESOLVABLE FROM EXISTING AUTHORITIES: the project/component model exists and is authoritative; a project may legitimately have a component whose repository is not yet discovered, and that must stay representable rather than invented.

DEFINITION OF DONE: a project with several repository components is expressible end to end with independent SHAs and independent locks, every historical record is unchanged, and no second registry exists.

FUTURE TASK MATERIALIZATION GUIDANCE: REQUIRES LIVE TASK QUEUE RECONCILIATION.

### GWC-11 — Authority docs / Integration slot / baseline — Detailed Evolution Design

STATUS: DETAILED_DESIGN_COMPLETE_WITH_OPEN_DECISIONS

CONTRACTS COVERED: GW-21 AUTHORITY_DOCUMENT_READ, GW-22 INTEGRATION_SLOT_RESOLUTION, GW-23 EXACT_GITHUB_BASELINE.

PURPOSE: make "which documents are authoritative", "where does this change belong" and "what is the exact baseline" evaluable facts rather than conventions.

CURRENT_MAIN IMPLEMENTATION:
- scripts/check-docs.mjs enforces the presence of mandatory documentation;
- scripts/check-doc-governance.mjs enforces an exact Markdown inventory against docs/governance/markdown-inventory.json, currently 214 tracked files, and fails on drift, count drift, unclassified paths or category drift;
- doc-governance-lib.mjs declares CANONICAL_ROOT_DOCUMENTS — SUIVI.md, TASKS.md, TODO.md, DECISIONS_LOG.md, CHANGELOG.md, DEPLOYMENT_PRODUCTION.md and MCP_ANTI_DISPERSION_GOVERNANCE.md — so an authoritative document set already exists and is enforced;
- extractCanonicalState() and validateRequiredCanonicalStates() already enforce a shared canonical-state block across required documents, keyed on repository, branch, s1Root, fetchRemote, pushRemote and container;
- scripts/check-function-cartography.mjs enforces that the documented tool cartography matches runtime registrations;
- governedContext already exposes catalogueDigest, inventoryDigest, governanceDigest and auditBaselineValid;
- the GitHub evidence block already carries checks.headSha and checks.exactHead, so exact-head baseline observation already exists for checks.

CANDIDATE IMPLEMENTATION: PR #85 is a documentation-only candidate registering a transport plan; it is evidence that the authority-document path is already used deliberately for planning without runtime effect.

CURRENT AUTHORITIES: the documentation governance scripts own inventory and canonical-state consistency; the cartography script owns tool-surface truth; GitHub owns the baseline SHA. GWC-11 formalizes their roles; it does not replace them.

CURRENT FILES / SYMBOLS:
- scripts/check-docs.mjs, scripts/check-doc-governance.mjs, scripts/doc-governance-lib.mjs, scripts/generate-doc-governance-baseline.mjs, scripts/check-function-cartography.mjs
- docs/governance/markdown-inventory.json
- src/currentState/service.ts, src/currentState/toolCatalog.ts
- src/governedContext/github.ts, src/governedContext/types.ts currentState digests

CURRENT TYPES / SCHEMAS: the inventory has an explicit schemaVersion, trackedCount, categories and entries; the canonical-state block has a fixed key list; the cartography has catalogueVersion and catalogueDigest.

CURRENT CALL GRAPH: CI docs:check -> presence, inventory, canonical state, cartography. At runtime, governed context exposes the digests but does not evaluate authority-document currency per step.

CURRENT TEST COVERAGE: docGovernance (12 tests) runs as its own CI step; currentStateEvidence, currentStateTools, currentToolCatalog and functionCartography are in test:readonly-safety.

CURRENT HARD-CODES: CANONICAL_ROOT_DOCUMENTS and CANONICAL_KEYS are literal lists, and the canonical keys are MCP-estate specific (s1Root, container). GWC-11 must not extend that literalism into the contract layer.

CURRENT LIMITATIONS: authority-document currency is enforced only in CI, not as a step precondition; there is no integration-slot concept at all; the exact baseline is observed for checks but is not a first-class contract output.

EXACT GAP: a governed step cannot assert "I read the authoritative documents at this digest", "this change belongs in this existing slot" or "my baseline is this exact SHA" as evaluable, attestable facts.

INTEGRATION CLASSIFICATION: PARTIAL for GW-21, PARTIAL/EXTEND for GW-22 and PARTIAL/REUSE for GW-23, matching the canonical classification.

REUSED AS-IS: the inventory mechanism, canonical-state validation, cartography digest and GitHub baseline observation.

WRAPPED: the existing digests become contract outputs bound to a step.

GENERALIZED: the canonical document set and the canonical key list become project-scoped rather than estate-literal, so a second project can declare its own authority documents without editing MCP's list.

EXTENDED: an integration-slot resolution that answers, from the existing file and cartography inventories, whether a proposed change has an existing owner — which is the mechanism that makes the REUSE-before-NEW rule enforceable rather than advisory.

NEW PRIMITIVES: the integration-slot resolver only. No second inventory and no second cartography.

INTEGRATION SLOT: the engine's precondition stage, before any branch or code contract.

UPSTREAM / DOWNSTREAM: GWC-2 and GWC-10 -> GW-21/22/23 -> GWC-12 and all of families E through H.

DATA MODEL / SCHEMA / PERSISTENCE: no new persistence; digests and baseline SHAs are carried in ephemeral evidence.

AUTHORITY / SECURITY / PRIVACY: reading an authority document never grants capability; a stale digest blocks rather than warns; no document content is attested verbatim, only its digest.

CONCURRENCY / LOCK / REPLAY: read-only; the baseline SHA must be re-observed, never replayed from a previous step.

FAILURE / RECOVERY: missing or drifted documentation yields a blocking precondition with the existing reason vocabulary.

BACKWARD COMPATIBILITY: the current canonical document list and canonical keys remain valid as the MCP project's own declaration.

MIGRATION STRATEGY: declare the current literals as the MCP instance of a project-scoped set, prove byte-identical behavior, then allow a second project to declare its own.

EXPECTED EXISTING FILES TO CHANGE: doc-governance-lib.mjs to accept a project-scoped declaration while defaulting to the current literals.

EXPECTED NEW FILES / TYPES / FUNCTIONS: authority-document evidence, integration-slot resolution and exact-baseline contract outputs.

EXPECTED MCP / WORKFLOW CHANGES: no new tool; docs:check stays the CI enforcement point.

EXPECTED TESTS: the current canonical set produces identical results under the project-scoped declaration; a drifted inventory blocks; an integration slot with an existing owner is found; a baseline replayed from a previous step is rejected.

RED / GREEN: RED proves a step can currently proceed without asserting which authority-document digest it read; GREEN adds the assertions with no change to CI outcomes.

REGRESSION SURFACE: docs:check, the 12 governance tests, cartography digest, current-state evidence and the governed dashboard.

PROPERTY / FAIL-CLOSED: no step proceeds on an unknown digest; an integration slot is never invented when one exists; a baseline is never inherited across steps.

OBSERVABILITY / ATTESTATION: expose document digests, inventory counts, cartography digest and baseline SHA with freshness.

ROLLBACK: drop the contract outputs; CI enforcement is unchanged.

OPEN DECISIONS: none blocking; the project-scoped declaration is resolvable from the existing literals plus acceptance tests.

DECISIONS RESOLVABLE FROM EXISTING AUTHORITIES: an authoritative document set already exists and is enforced; the cartography is already the tool-surface authority; exact-head observation already exists for checks and must be reused rather than reinvented.

DEFINITION OF DONE: GW-21, GW-22 and GW-23 produce evaluable, attestable outputs; the canonical set is project-scoped with identical MCP behavior; and the REUSE-before-NEW rule becomes machine-checkable.

FUTURE TASK MATERIALIZATION GUIDANCE: REQUIRES LIVE TASK QUEUE RECONCILIATION.

### GWC-12 — GitHub Control Plane reconciliation — Detailed Evolution Design

STATUS: DETAILED_DESIGN_COMPLETE_WITH_OPEN_DECISIONS

CONTRACTS COVERED: no contract is directly attached. This lot decides the disposition of the existing candidate pull requests before any contract depends on a GitHub control plane.

PURPOSE: reconcile the stacked candidate GitHub capability with current main, so that families E through H can rely on bounded GitHub adapters instead of being blocked behind a stale stack.

OBSERVATION:

```
SOURCE      = GITHUB_LIVE
REPOSITORY  = Patricked-code/MCP
OBSERVED_AT = 2026-09-17T03:47Z
MAIN_SHA    = d1f303955c4d368950da2307dda41d826fc85d0a
```

| PR | Branch | Head | Base | State | Mergeability | Size |
| --- | --- | --- | --- | --- | --- | --- |
| `#85` | `mcp/plan-governed-actions-ssh-transport-20260914` | `490d5859` | `main@555a51d0` | open, draft | `dirty` | +89, 4 files |
| `#86` | `mcp/stablecoin-s2-governed-ssh-20260915` | `5f54b78c` | `main@555a51d0` | open, draft | `dirty` | +308 −29, 10 files |
| `#88` | `mcp/github-admin-repository-create-20260915` | `d5eb87c4` | `main@555a51d0` | open, draft | `dirty` | +671 −12, 14 files |
| `#89` | `mcp/git-github-control-plane-foundation-20260915` | `5bc82c17` | `#88@d5eb87c4` | open, draft | `clean` | +3056 −273, 13 files |
| `#90` | `mcp/github-lifecycle-control-20260915` | `b18f419a` | `#89@5bc82c17` | open, draft | `clean` | +2501 −103, 14 files |

Every one of the five was cut from `main@555a51d0`, which is no longer main. `#85`, `#86` and `#88` are already in conflict with current main. `#89` and `#90` report `clean` only because each is based on its parent branch, not on main: the stack's real base is `#88`, and `#88` is dirty, so the whole stack is transitively stale.

CURRENT_MAIN IMPLEMENTATION: bounded GitHub observation exists in src/github/connection.ts, inventory.ts, authorizationDiagnostics.ts, identityResolution.ts, repositoryResolution.ts, projectResolution.ts and src/governedContext/github.ts. There is no GitHub write surface on main beyond the deploy path.

CANDIDATE IMPLEMENTATION:
- `#88` adds one bounded organization repository creation, private and empty only, behind ENABLE_WRITE_TOOLS and a shadow_ready hard gate;
- `#89` adds a 170-capability manifest with a fail-closed parser and twelve bounded READ tools; candidate cartography 124 tools, 80 READ, 44 WRITE, digest `9372de56c4b806df00bf6d84b362ee8577820e6f91457b529143f9d576ba557a`;
- `#90` adds six READ and twelve WRITE lifecycle tools, with merge blocked on stale head, draft, already-merged, explicitly non-mergeable or non-green checks; candidate cartography 142 tools, 86 READ, 56 WRITE, digest `c3568d8a8854168c3fa1cd139c711512542832330153f382a8b061745b7a0128`.

CURRENT_MAIN cartography for comparison: 111 registered tools, 68 read, 43 write, 2 resources, digest `cfd5f18490f25ce79b4afbda36a9eda48453a7098237f73b39aa804a4cd43aad`. The stack would therefore change the runtime tool surface by 31 tools and invalidate the current cartography digest.

CURRENT AUTHORITIES: GitHub owns versioned repository state; the cartography owns the registered tool surface; the Scoped Write Gate owns whether a write may proceed. A merged candidate does not become an authority by being merged.

EXACT GAP: families E through H need bounded GitHub read and exact-head write adapters. That capability exists only in a stale stack whose base no longer exists as main, and no contract may depend on it until its disposition is decided.

INTEGRATION CLASSIFICATION: REUSE of the candidate capability where it survives reconciliation; the decision itself is a disposition, not an implementation.

DISPOSITION OPTIONS, with their consequences:
- rebase or re-cut the stack onto current main, preserving the TDD evidence recorded in each PR body — highest fidelity, highest effort, and the only option that keeps the recorded RED/GREEN chain meaningful;
- re-derive only the capabilities a contract actually needs, as fresh work on current main — smallest surface, but discards the recorded evidence and risks re-introducing what `#89`'s manifest already classified;
- close the stack and treat the manifest as design input only — lowest risk, and loses 5557 added lines of already-CI-proven work;
- keep the stack open and unreferenced — the current de facto state, which is the only option that is not a decision and must not be chosen by default.

This disposition is not resolvable from design evidence alone. It is a governed decision and is recorded as such.

`#85` and `#86` are separable from the stack: neither is a control-plane dependency. `#85` is documentation-only. `#86` is a bounded S2 project capability whose value to this programme is as GWC-7 and GWC-17 evidence — it demonstrates a Passenger runtime and a second project — rather than as a control-plane prerequisite.

DATA MODEL / SCHEMA / PERSISTENCE: merging any candidate changes the cartography digest and therefore the current-state evidence baseline; that regeneration must use the repository tooling.

AUTHORITY / SECURITY / PRIVACY: `#89` explicitly forbids free Git shell, force-push, reset --hard, clean -fdx, destructive reflog, raw GitHub API, repository deletion, arbitrary publication and secret-value reads. Those prohibitions must survive any reconciliation unchanged. The manifest is explicitly not an authorization and does not replace the Governed Task Queue.

CONCURRENCY / LOCK / REPLAY: reconciling a stacked branch must not rewrite history on a branch someone else holds; a merge commit preserves existing checkouts.

FAILURE / RECOVERY: if reconciliation proves infeasible, the correct outcome is to record that and narrow the dependent contracts, not to merge a stale stack.

BACKWARD COMPATIBILITY: the current 111-tool surface and its digest are the compatibility reference; any change must be a deliberate, documented cartography regeneration.

EXPECTED TESTS: candidate tools remain behind ENABLE_WRITE_TOOLS and the shadow gate after reconciliation; the forbidden-capability list is still enforced; cartography counters and digest match the registered surface.

REGRESSION SURFACE: registered tool surface, cartography digest, current-state evidence, write gate coverage and documentation governance.

PROPERTY / FAIL-CLOSED: never merge the stack to unblock a contract; never treat a candidate PR as evidence of runtime capability; never let a manifest entry imply a permission.

OPEN DECISIONS: the disposition itself. It requires a live governed decision and, for merge, live Task Queue reconciliation.

DECISIONS RESOLVABLE FROM EXISTING AUTHORITIES: the stack is stale against current main; `#88` is already in conflict; `#89` and `#90` are clean only relative to their parents; no contract may depend on unmerged candidate capability.

DEFINITION OF DONE: each of `#85`, `#86`, `#88`, `#89` and `#90` has an explicit recorded disposition, and every family E through H contract states which GitHub capability it needs and whether that capability exists on main today.

FUTURE TASK MATERIALIZATION GUIDANCE: REQUIRES LIVE TASK QUEUE RECONCILIATION.

### GWC-13 — Development workflow contracts — Detailed Evolution Design

STATUS: DETAILED_DESIGN_COMPLETE_WITH_OPEN_DECISIONS

CONTRACTS COVERED: GW-24 GOVERNED_BRANCH_CREATION, GW-25 TDD_RED_AUTHORING, GW-26 TDD_RED_OBSERVATION, GW-27 TDD_GREEN_MINIMAL_IMPLEMENTATION, GW-28 GREEN_CI, GW-29 SELF_REVIEW, GW-30 REGRESSION_RED_IF_FINDING, GW-31 REGRESSION_GREEN, GW-32 FULL_REGRESSION, GW-33 NON_TERMINAL_DOCUMENTATION.

PURPOSE: make the development loop evaluable, and in particular make a RED observation prove the intended failure rather than any failure.

CURRENT_MAIN IMPLEMENTATION:
- .github/workflows/mcp-ci.yml job validate runs, in order: Checkout, Prepare and Upload autodeploy governance candidates, Setup Node, Install, Typecheck, Build, Docs check, Governance tests, GWC dossier check, Secret scan, Read-only safety tests, Whitespace diff check;
- the validation profile is expressed in package.json as typecheck, build, docs:check, gwc:verify, test:governance, test:readonly-safety and lint:secrets;
- test:readonly-safety enumerates its suites as an explicit file list;
- branch governance is declared in .mcp/branch-governance.json and in CLAUDE.md: no direct push to main, MCP branches under mcp/*, draft PR required.

CANDIDATE IMPLEMENTATION: `#90` adds governed branch creation and update with force=false and default-branch deletion refused. GW-24 is classified CANDIDATE precisely because that capability exists only there.

CURRENT AUTHORITIES: CI owns the pass/fail verdict for a SHA; the package scripts own the validation profile; branch governance policy owns naming and push rules.

CURRENT FILES / SYMBOLS: .github/workflows/mcp-ci.yml, package.json scripts, .mcp/branch-governance.json, scripts/check-*.mjs.

CURRENT TYPES / SCHEMAS: the validation profile is a set of npm script names, not a typed object; a contract cannot currently name "the profile that must pass for this project".

CURRENT CALL GRAPH: push or pull_request -> validate job -> ordered steps -> conclusion on an exact head SHA.

CURRENT TEST COVERAGE: 57 test files exist. 55 are referenced by a package.json script and therefore executed in CI. Two are referenced by no script and are executed nowhere: tests/githubRegistryEvidence.test.ts and tests/githubRepositoryResolution.test.ts. This is recorded as finding AF-31 and is a real, verified coverage gap, not a theoretical one.

CURRENT HARD-CODES: the test file list is enumerated literally in package.json, which is why a new test file is silently excluded unless someone edits that list. That enumeration is the mechanical cause of AF-31.

CURRENT LIMITATIONS: a RED run is observed only as a failed CI conclusion; nothing distinguishes "failed for the intended reason" from "failed because a module was missing, a lockfile drifted or an unrelated step broke". The candidate PR bodies already record intended RED reasons in prose — `#88` records ERR_MODULE_NOT_FOUND, `#89` records missing modules and manifest — which shows the need is real and currently met only by human narration.

EXACT GAP: no contract binds an expected failure signature to a RED observation, and no typed validation profile exists that a second project could declare.

INTEGRATION CLASSIFICATION: CANDIDATE for GW-24; PARTIAL/CANDIDATE for GW-25 and GW-27; PARTIAL/EXTEND for GW-26; REUSE/EXTEND for GW-28; PARTIAL for GW-29, GW-30, GW-31 and GW-33; REUSE for GW-32.

REUSED AS-IS: the CI job, its step order, the existing scripts and the branch governance rules.

WRAPPED: a CI run conclusion on an exact head becomes typed contract evidence.

GENERALIZED: the validation profile becomes a declared, project-scoped object rather than a literal script list, which is also the structural fix for AF-31 — discovery replaces enumeration.

EXTENDED: GW-26 gains an expected-failure signature so a RED observation must match the intended reason; GW-30 reuses the same mechanism for a regression RED.

NEW PRIMITIVES: the expected-failure signature and the typed validation profile. Both are justified: no current component types either.

INTEGRATION SLOT: around the existing CI observation path in governedContext/github.ts; never a second CI system.

UPSTREAM / DOWNSTREAM: GWC-11 and GWC-12 -> GW-24..GW-33 -> GWC-14 review and merge.

DATA MODEL / SCHEMA / PERSISTENCE: the validation profile is declared data; RED/GREEN observations are ephemeral evidence bound to a SHA.

AUTHORITY / SECURITY / PRIVACY: CI remains the sole verdict authority; a contract never declares GREEN without a CI conclusion on the exact SHA; failure output must be bounded and sanitized before it becomes a signature.

CONCURRENCY / LOCK / REPLAY: a CI conclusion is bound to one SHA and must never be replayed onto another — the same discipline AF-19 makes non-negotiable for deployment.

FAILURE / RECOVERY: a RED that fails for an unintended reason is not a valid RED and must route back to authoring, not forward to GREEN.

BACKWARD COMPATIBILITY: the current profile must be expressible in the new declaration with an identical step set and identical outcomes.

MIGRATION STRATEGY: declare the current profile, prove identical CI results, then replace the literal test enumeration with discovery so AF-31 cannot recur.

EXPECTED EXISTING FILES TO CHANGE: package.json for the test profile, and .github/workflows/mcp-ci.yml only if the profile declaration requires it.

EXPECTED NEW FILES / TYPES / FUNCTIONS: validation profile schema, expected-failure signature and CI observation adapter.

EXPECTED MCP / WORKFLOW CHANGES: a CI step may be added to prove that every test file is covered by the profile.

EXPECTED TESTS: the two uncovered test files become covered and pass; an unintended RED is rejected as a valid RED; a GREEN claimed on a different SHA is rejected; the declared profile reproduces the current step set exactly.

RED / GREEN: RED proves two test files are executed nowhere and that a RED observation cannot currently be qualified; GREEN adds discovery-based coverage and the signature, with the existing CI outcome unchanged.

REGRESSION SURFACE: the whole CI profile, the 343-test read-only safety suite, the 12 governance tests, the whitespace check and the branch governance rules.

PROPERTY / FAIL-CLOSED: no GREEN without an exact-SHA CI conclusion; no RED accepted without a matching signature; no test file silently outside the profile.

OBSERVABILITY / ATTESTATION: expose run id, head SHA, conclusion, profile identity and the matched failure signature.

ROLLBACK: keep the literal profile; the signature becomes advisory.

OPEN DECISIONS: none blocking. The expected-failure signature format is resolvable from the failure reasons already recorded in the candidate PR bodies plus acceptance tests.

DECISIONS RESOLVABLE FROM EXISTING AUTHORITIES: CI is the verdict authority; the profile is already effectively declared in package.json; enumeration is the cause of AF-31 and discovery is its structural fix.

DEFINITION OF DONE: the ten contracts evaluate against the existing CI, a RED must prove its intended failure, the validation profile is declared and project-scoped, and no test file sits outside it.

FUTURE TASK MATERIALIZATION GUIDANCE: REQUIRES LIVE TASK QUEUE RECONCILIATION.

### GWC-14 — Review / merge contracts — Detailed Evolution Design

STATUS: DETAILED_DESIGN_COMPLETE_WITH_OPEN_DECISIONS

CONTRACTS COVERED: GW-34 DRAFT_PR, GW-35 EXACT_DIFF_REVIEW, GW-36 RULESET_VERIFICATION, GW-37 REVIEW_FINDINGS_RESOLUTION, GW-38 PR_READY, GW-39 TASK_REVIEW, GW-40 REVIEW_CHECKPOINT, GW-41 PREMERGE_REVALIDATION, GW-42 TASK_MERGE_READY, GW-43 EXACT_HEAD_MERGE.

FINDINGS OWNED: AF-22 and AF-30, carried by GW-35, GW-38, GW-41 and GW-43.

PURPOSE: bind review evidence to an exact commit, so that an approval can never be counted for a head it was not given on.

CURRENT_MAIN IMPLEMENTATION: src/governedContext/github.ts already assembles a bounded GitHub evidence block, and src/governedContext/types.ts declares its shape. That declaration is where AF-22 and AF-30 are visible in the code rather than in prose:

- the checks block declares status, conclusion, total, failed, `headSha`, `exactHead`, a required[] array and requiredSatisfied — so check evidence is already SHA-bound and already carries an explicit exact-head flag;
- the reviews block declares exactly three fields: approvals, changesRequested and unresolvedThreads. It carries no headSha and no exactHead.

An approval given on an earlier head is therefore indistinguishable from one given on the current head. That is AF-22 and AF-30, stated from the type declaration rather than inferred.

The ruleset block already carries name, enforcement, requiresPullRequest, requiredStatusChecks, requiresConversationResolution and requiredApprovingReviewCount, so GW-36 has its evidence source. The evidence sub-block already tracks provenance per observation — main, pullRequest, checks, reviews and ruleset — so freshness per source already exists.

CANDIDATE IMPLEMENTATION: PR `#90` adds github_get_review_threads, github_get_mergeability, github_get_required_checks and github_merge_pull_request, with merge blocked on a stale head, a draft PR, an already-merged PR, an explicitly non-mergeable PR or non-green checks. GW-34, GW-38 and GW-43 are classified CANDIDATE because that capability exists only there, and its availability depends on the GWC-12 disposition.

CURRENT AUTHORITIES: GitHub owns reviews, checks, rulesets and mergeability. The governed context owns the bounded projection. No GWC component becomes a review authority.

CURRENT FILES / SYMBOLS: src/governedContext/github.ts, src/governedContext/types.ts GithubOperationalContext checks/reviews/ruleset/evidence, src/governedContext/service.ts.

CURRENT CALL GRAPH: governed context collection -> GitHub observation -> bounded projection -> governance decision. Review counts enter that projection without a commit binding.

CURRENT TEST COVERAGE: governedContextGithub, githubOperationalRealityErrors, pr55ReviewRegressions and pr55ReviewApprovalRegression are in test:readonly-safety — so review projection is tested, but no test can assert commit binding because the type carries none.

CURRENT HARD-CODES: the evidence block is shaped for one pull request on one repository.

CURRENT LIMITATIONS: unresolvedThreads is nullable, so "no unresolved threads" and "unknown" are already distinguished, which is the right discipline and must be extended to the commit binding rather than replaced.

EXACT GAP: review evidence has no commit binding and no freshness window, so GW-41 premerge revalidation cannot prove that the approvals it counted apply to the head it is about to merge.

INTEGRATION CLASSIFICATION: PARTIAL/EXTEND for GW-35, GW-36 and GW-41; CANDIDATE for GW-34, GW-38 and GW-43; PARTIAL/CANDIDATE for GW-37; REUSE for GW-39, GW-40 and GW-42.

REUSED AS-IS: the bounded projection, per-source provenance, the nullable-unknown discipline and the ruleset evidence.

WRAPPED: review and ruleset observations become contract evidence bound to a step.

GENERALIZED: nothing needs generalizing here; the shape is already right for checks.

EXTENDED: the reviews block gains headSha and exactHead, mirroring the checks block exactly. This is the fix for AF-22 and AF-30, and it is deliberately the smallest possible change: the correct shape already exists ten lines above in the same type, so this is a REUSE of an existing pattern, not a new design.

NEW PRIMITIVES: none for evidence shape. A PremergeProof aggregate is justified only if it composes existing evidence without re-observing it.

INTEGRATION SLOT: src/governedContext/github.ts review collection, beside the existing check collection that already resolves headSha and exactHead.

UPSTREAM / DOWNSTREAM: GWC-12 and GWC-13 -> GW-34..GW-43 -> GWC-15 deployment.

DATA MODEL / SCHEMA / PERSISTENCE: additive optional fields on the reviews block. Historical consumers that ignore them keep working; the fields must be nullable so an unobtainable binding is UNKNOWN rather than false.

AUTHORITY / SECURITY / PRIVACY: this is an integrity-critical blueprint. An approval must never be counted for a head it was not given on; a resolved thread on an old head must not be presented as resolved on a new one; a ruleset read must never be cached across a head change.

CONCURRENCY / LOCK / REPLAY: review evidence must be re-observed at premerge; a replayed approval count is exactly the defect AF-22 and AF-30 describe.

FAILURE / RECOVERY: an unobtainable commit binding yields exactAt = null and blocks the merge contract rather than downgrading it.

BACKWARD COMPATIBILITY: existing consumers of the three review fields are unaffected; the added fields are optional and nullable.

MIGRATION STRATEGY: add the fields in observation mode, measure how often an approval is on a non-exact head, then make GW-41 depend on them.

EXPECTED EXISTING FILES TO CHANGE: src/governedContext/types.ts reviews block and src/governedContext/github.ts review collection.

EXPECTED NEW FILES / TYPES / FUNCTIONS: PremergeProof composing checks, reviews, ruleset and mergeability at one exact head.

EXPECTED MCP / WORKFLOW CHANGES: none on main; the merge capability itself depends on the GWC-12 disposition.

EXPECTED TESTS: an approval on an older head yields exactHead false; a premerge proof assembled from two different heads is rejected; unresolvedThreads null still blocks; requiredApprovingReviewCount is honored; an approval dismissed by a new push is not counted.

RED / GREEN: RED proves that an approval on a superseded head is currently counted as satisfying the requirement; GREEN adds the binding and makes GW-41 reject it. This is the second safety prerequisite of the programme and its RED is the direct analogue of AF-19's.

REGRESSION SURFACE: governed context assembly, the pr55 review regression suites, governance decision inputs and the governed dashboard.

PROPERTY / FAIL-CLOSED: approvals, resolved threads and check conclusions used in one decision must all bind to the same exact head, or the decision blocks.

OBSERVABILITY / ATTESTATION: expose head SHA, exact-head flag, counts, provenance and freshness for every review input.

ROLLBACK: the added fields become unread; current behavior returns.

OPEN DECISIONS: OD-06 ReviewEvidence freshness and commit-binding policy.

DECISIONS RESOLVABLE FROM EXISTING AUTHORITIES: the checks block already proves the correct shape and must be mirrored; nullable-unknown is already the house discipline; GitHub remains the review authority.

DEFINITION OF DONE: review evidence carries a commit binding, a premerge proof is assembled at a single exact head, and an approval on a superseded head can no longer satisfy a merge contract.

FUTURE TASK MATERIALIZATION GUIDANCE: REQUIRES LIVE TASK QUEUE RECONCILIATION.

### GWC-15 — Deployment / exact-SHA evidence — Detailed Evolution Design

STATUS: DETAILED_DESIGN_COMPLETE_WITH_OPEN_DECISIONS

CONTRACTS COVERED: GW-44 MAIN_MERGE_COMMIT_OBSERVATION, GW-45 MAIN_CI, GW-46 GOVERNED_AUTODEPLOY_OBSERVATION, GW-47 GITHUB_TO_S1_SYNC_ATTESTATION, GW-48 DEPLOY_TYPECHECK_BUILD, GW-49 RUNTIME_REBUILD_OR_RESTART_ATTESTATION, GW-50 HEALTH_CHECK, GW-51 RUNTIME_IMAGE_ATTESTATION, GW-52 EXACT_SHA_DEPLOYMENT_PROOF, GW-53 LIVE_STATE_UPDATE, GW-54 STALE_RECEIPT_DETECTION, GW-55 RECEIPT_REFRESH, GW-56 TASK_RUNTIME_REVISION_BINDING, GW-57 TASK_DEPLOYING.

FINDINGS OWNED: AF-19, carried by GW-45 and GW-46. AF-08 is carried by GW-56.

PURPOSE: guarantee that a deployment of a main SHA cannot begin before CI success is proven for that same exact SHA, without weakening the OIDC trust boundary that currently binds a deployment to its commit.

#### AF-19 — the defect, stated from live evidence

```
SOURCE      = GITHUB_LIVE
REPOSITORY  = Patricked-code/MCP
OBSERVED_AT = 2026-09-17
```

- the required check for PR `#94` validated its head `590cc5a1`;
- the squash merge produced a different commit, `d1f3039`, which no check had ever validated;
- MCP CI run 956 on `d1f3039` ran from 04:05:55 to 04:06:47;
- MCP Governed Deploy run 43 started at 04:05:55 and finished at 04:06:26 — twenty-one seconds before the CI of the commit it deployed had concluded.

A repository ruleset cannot fix this. A ruleset gates the merge; the deployed commit is created by the merge. The validated SHA and the deployed SHA are different commits by construction whenever the merge strategy rewrites history.

#### Current implementation, and where the slot already exists

.github/workflows/mcp-deploy.yml triggers on `workflow_dispatch` and `push` to main, with `permissions: contents: read` and `id-token: write`. It has three steps: a checkout, a step with `id: gate` that resolves `enabled`, and the deploy step guarded by `if: steps.gate.outputs.enabled == 'true'`.

The gate step is the integration slot, and it already exists. It currently decides from exactly two inputs: `GITHUB_EVENT_NAME` — `workflow_dispatch` is always enabled — and `pushEnabled` read from `.mcp/autodeploy-policy.json` with a schemaVersion check. It never consults CI for `$GITHUB_SHA`. AF-19 is precisely the absence of that third input.

What already works and must be reused rather than rebuilt:
- the workflow already polls deployment status in a bounded loop, sixty attempts at ten-second intervals, so a wait pattern already exists in this workflow;
- `validate_start` already asserts that the returned jobId equals `mcp-s1-<run_id>-<sha[0:12]>` and that requestedSha equals `$GITHUB_SHA`;
- `validate_status` already asserts, for a succeeded job, that `phase === 'attested'`, `runtimeRevision === sha`, `rollbackStatus === 'not_needed'`, and that healthOk, oauthOk and mcpAuthOk are all true;
- the S1 worker runs under flock, writes an atomic attestation, and rolls back on failure;
- the deploy step name `Deploy exact main SHA through MCP` is asserted by tests/deployWorkflowShell.test.ts and must not be renamed.

Post-deployment exact-SHA proof is therefore already strong. The gap is entirely pre-deployment.

#### The OIDC trust boundary, and why it decides the answer

src/deploy/githubOidc.ts freezes GITHUB_OIDC_POLICY with `allowedEvents = ['push', 'workflow_dispatch']`, `ref = 'refs/heads/main'` and `workflowRef = 'Patricked-code/MCP/.github/workflows/mcp-deploy.yml@refs/heads/main'`. validateClaims() rejects any other event with `oidc_event_not_allowed`, any other ref with `oidc_ref_invalid`, any other workflow_ref with `oidc_workflow_invalid`, and — decisively — requires `tokenSha === requestedSha`, failing with `oidc_sha_mismatch` otherwise.

That last check is what makes the current design trustworthy: the server does not take the client's word for which SHA is being deployed, it requires GitHub's own signed token to say the same SHA.

#### AF-19 remediation options

`A — trigger the deploy workflow on workflow_run completion of MCP CI.`
REJECTED ON EVIDENCE. It breaks the trust boundary twice. The OIDC token's `event_name` claim would be `workflow_run`, which is not in `allowedEvents`, so every request fails with `oidc_event_not_allowed`. And for a `workflow_run`-triggered run the token's `sha` and `ref` claims describe the head of the branch the workflow file was read from, not `workflow_run.head_sha`, so `tokenSha !== requestedSha` and the request also fails with `oidc_sha_mismatch`. Adopting A would require widening `allowedEvents` and loosening the SHA binding — that is, dismantling the exact protection AF-19 exists to strengthen. This option was preferred in an earlier analysis on the grounds of apparent simplicity; reading githubOidc.ts in full invalidated that preference, and the correction is recorded here so it is not repeated.

`B — extend the existing gate step to require CI success for github.sha.`
OIDC-COMPATIBLE with no policy change: the event stays `push`, the ref stays `refs/heads/main`, the workflow_ref is unchanged and the token's `sha` claim still equals the deployed SHA. The gate step already exists and already computes `enabled`, so the change is additive in the slot designed for it: resolve the CI conclusion for `$GITHUB_SHA`, require success, and set `enabled=false` otherwise. Costs: the workflow needs a read permission it does not currently hold — `checks: read` or `actions: read` — and the gate needs a bounded wait, because on a push the CI run for that SHA is typically still in progress. The wait must fail closed on timeout, and the deploy step's `if` guard already provides the enforcement point.

`C — enforce the gate server-side in /deploy/github/s1/start.`
OIDC-COMPATIBLE with no policy change. The endpoint already verifies the token and the requested SHA; it would additionally require proven CI success for that SHA before enqueueing. This is the strongest placement, because it cannot be bypassed by editing a workflow, and because the check then lives with the authority that actually performs the deployment. Costs: MCP needs GitHub read access at deploy time, and an unreachable GitHub must resolve to UNVERIFIED and refuse — never to a permissive default.

`D — make CI a job dependency inside the deploy workflow.`
OIDC-COMPATIBLE with no policy change: same event, same ref, same workflow_ref, same SHA. It gives the strongest chronology guarantee, because the dependency is enforced by the runner within a single run on a single commit. Costs: the validation profile must be reachable from the deploy workflow — as a reusable workflow rather than a copy — and what "MCP CI on main" means changes, which touches GWC-13's profile declaration.

`B` and `C` are complementary rather than alternative: `B` prevents the request, `C` refuses it. `C` alone is bypass-resistant; `B` alone is cheap and local. `D` is the cleanest chronology but the largest restructuring.

The evidence eliminates `A` definitively. It does not by itself select among `B`, `C` and `D`, because that choice changes deploy-time permissions and the deployment authority's own responsibilities. OD-07 therefore remains an OPEN DECISION, now narrowed to three OIDC-compatible options with their costs stated.

CURRENT AUTHORITIES: GitHub Actions owns the CI verdict; the OIDC issuer owns the commit binding; the MCP deploy endpoint owns admission; the S1 worker owns the deployment and its attestation; Live State owns observed runtime reality.

CURRENT FILES / SYMBOLS: .github/workflows/mcp-deploy.yml gate and deploy steps; src/deploy/githubOidc.ts GITHUB_OIDC_POLICY, validateClaims, verifyGithubOidcToken; src/deploy/routes.ts createGithubDeployRouter; src/deploy/s1Deploy.ts buildS1DeployJobId, buildS1DeployWorkerScript, buildS1DeployLaunchCommand, parseS1DeployStatus; .mcp/autodeploy-policy.json.

CURRENT TEST COVERAGE: githubOidc, s1Deploy, deployRoutes, serverDeployRegistration, deployWorkflow and deployWorkflowShell are in test:readonly-safety. The shell test asserts the deploy step name.

CURRENT LIMITATIONS beyond AF-19: the attestation written by the S1 worker has schema_version, job_id, requested_sha, previous_git_sha, runtime_revision, result, phase, rollback_status, health_ok, oauth_ok, mcp_auth_ok and ended_at. It carries no attestationId, and result, phase and rollback_status are written as unbounded strings — that is AF-29. It also carries no reference to the CI evidence for requested_sha, which is the same gap as AF-19 seen from the attestation side: even after the fix, the attestation would not record which CI run authorized the deployment.

EXACT GAP: no contract requires CI success for the exact SHA before deployment admission, and the deployment attestation does not record the CI evidence that authorized it.

INTEGRATION CLASSIFICATION: REUSE/EXTEND for GW-45 and GW-46; REUSE/GENERALIZE for GW-47, GW-49, GW-50, GW-51 and GW-53; REUSE/GENERALIZE/EXTEND for GW-52; PARTIAL/EXTEND for GW-48; REUSE for GW-44, GW-54, GW-55 and GW-57; PARTIAL for GW-56.

REUSED AS-IS: the OIDC policy and its SHA binding, the job id derivation, the status polling loop, the flock-protected worker, the atomic attestation write, the rollback path and the post-deploy assertions.

WRAPPED: the CI conclusion for a SHA becomes typed contract evidence consumed by GW-45.

GENERALIZED: sync, restart, health check and image attestation must accept the GWC-7 RuntimeBinding, so a Passenger or checkout-only target is deployable by the same contracts. GW-56 is a DERIVE contract whose runtime revision binding must be atomic with GW-57, as corrected in the canonical design.

EXTENDED: the admission gate, wherever OD-07 places it; and an attestation that records the CI run id and conclusion that authorized the deployment, closing AF-19 on the evidence side as well as the control side.

NEW PRIMITIVES: none for deployment mechanics. Only the CI-evidence type and the admission predicate.

INTEGRATION SLOT: the existing `gate` step for option B; createGithubDeployRouter's start handler for option C; the workflow job graph for option D.

UPSTREAM / DOWNSTREAM: GWC-14 premerge proof -> GW-44..GW-57 -> GWC-16 documentation and closure.

DATA MODEL / SCHEMA / PERSISTENCE: the attestation schema gains attestationId and a CI evidence reference, and bounds result, phase and rollback_status to enumerations. schema_version must be incremented and historical attestations must remain readable under version 1 — never reinterpreted.

AUTHORITY / SECURITY / PRIVACY: the OIDC boundary must not be weakened. No option may widen allowedEvents or relax `tokenSha === requestedSha`. An unreachable CI verdict is UNVERIFIED and must refuse, never permit.

CONCURRENCY / LOCK / REPLAY: flock stays the deployment mutual exclusion. A CI conclusion must never be replayed from a different SHA — that is the defect itself. A rapid second push while a deployment is in flight must be handled by the existing lock, not by a new one.

FAILURE / RECOVERY: gate timeout fails closed; a failed deployment rolls back through the existing path; a refused admission leaves the runtime untouched.

BACKWARD COMPATIBILITY: `workflow_dispatch` currently bypasses the policy gate unconditionally. Whether an explicit manual deployment may also bypass the CI gate is part of OD-07 and must be decided, not inherited silently.

MIGRATION STRATEGY: land the gate in observation mode first — record what it would have decided for recent pushes, including the `d1f3039` case — then enforce.

EXPECTED EXISTING FILES TO CHANGE: .github/workflows/mcp-deploy.yml gate step and permissions for option B; src/deploy/routes.ts for option C; src/deploy/s1Deploy.ts for the attestation fields.

EXPECTED NEW FILES / TYPES / FUNCTIONS: CI evidence type, admission predicate and the bounded attestation enumerations.

EXPECTED MCP / WORKFLOW CHANGES: a workflow permission addition under option B; no new MCP tool.

EXPECTED TESTS: a deployment requested for a SHA whose CI has not concluded is refused; a deployment requested for a SHA whose CI failed is refused; the `d1f3039` chronology is reproduced and refused; the OIDC policy still rejects `workflow_run`; the deploy step name is unchanged; a version-1 attestation is still readable; result, phase and rollback_status reject an out-of-enum value.

RED / GREEN: RED reproduces AF-19 — a deployment admitted for a SHA with no concluded CI — and must fail for exactly that reason and no other. GREEN adds the admission gate. This is the programme's first safety prerequisite, and its implementation is explicitly out of scope for the present design mission.

REGRESSION SURFACE: the OIDC suite, deploy routes, deploy workflow shell assertions, S1 worker script generation, status parsing, live state update and receipt refresh.

PROPERTY / FAIL-CLOSED: no deployment without a proven CI success on the identical forty-character SHA; no CI verdict transferred between commits; no permissive default on an unreachable verdict.

OBSERVABILITY / ATTESTATION: the attestation must name the CI run that authorized the deployment, so that the authorization is auditable after the fact and not merely enforced in the moment.

ROLLBACK: disable the gate through the existing policy file; the deployment path returns to its current behavior, and the defect returns with it — which is why the gate must default to enforcing once landed.

OPEN DECISIONS: OD-07 AF-19 enforcement mechanism, narrowed to B, C and D with A eliminated on evidence; OD-12 inter-authority freshness window for GW-52.

DECISIONS RESOLVABLE FROM EXISTING AUTHORITIES: a ruleset cannot solve AF-19; the post-deploy exact-SHA proof already exists and must be reused; the gate step is the existing integration slot; `workflow_run` is incompatible with the current OIDC policy.

DEFINITION OF DONE: no deployment of a main SHA can begin without proven CI success for that identical SHA; the OIDC boundary is unchanged or stronger; the attestation records its authorizing CI evidence; and the `d1f3039` scenario is covered by a regression test.

FUTURE TASK MATERIALIZATION GUIDANCE: REQUIRES LIVE TASK QUEUE RECONCILIATION.

### GWC-16 — Documentation and closure — Detailed Evolution Design

STATUS: DETAILED_DESIGN_COMPLETE_WITH_OPEN_DECISIONS

CONTRACTS COVERED: GW-58 DOCUMENTATION_DRIFT_DECISION, GW-59 DOCUMENTATION_BRANCH_IF_REQUIRED, GW-60 DOCUMENTATION_RECONCILIATION, GW-61 DOCUMENTATION_PR, GW-62 DOCUMENTATION_CI_REVIEW, GW-63 DOCUMENTATION_EXACT_HEAD_MERGE, GW-64 DOCUMENTATION_AUTODEPLOY, GW-65 DOCUMENTATION_LIVE_STATE, GW-66 TERMINAL_RECEIPT_REFRESH, GW-67 TASK_VERIFYING, GW-68 TERMINAL_VERIFICATION, GW-69 TASK_DONE, GW-70 TERMINAL_CHECKPOINT, GW-71 LOCK_RELEASE, GW-72 SESSION_CLOSE_AND_QUEUE_RECONCILE.

FINDINGS OWNED: AF-07, carried by GW-68 and GW-69 — no false DONE.

PURPOSE: close a governed unit of work honestly, including the case where the documentation change is itself deployed and therefore becomes the final runtime SHA.

CURRENT_MAIN IMPLEMENTATION:
- documentation governance is already enforced in CI: presence, exact inventory, canonical-state consistency and cartography alignment;
- the inventory is exact rather than advisory, which is why adding a Markdown file without updating docs/governance/markdown-inventory.json fails the build — a drift this branch encountered and corrected;
- createCheckpoint already exists on the session service and already carries completedAction, resultCode, pullRequestNumber, observedHeadSha, blockers and nextAction, so GW-70 has a real implementation to reuse;
- releaseLocksForSession and closeSession already exist, so GW-71 and GW-72 reuse existing behavior;
- reconcileIntent already exists on the task queue for the queue-reconciliation half of GW-72;
- bootstrap receipt states MISSING/CURRENT/STALE/EXPIRED already support GW-66;
- liveState reconcile/engine/store already support GW-65.

CANDIDATE IMPLEMENTATION: `#90` supplies branch creation, documentation PR and exact-head merge, which is why GW-59, GW-61 and GW-63 are classified CANDIDATE. Their availability depends on the GWC-12 disposition.

CURRENT AUTHORITIES: documentation governance scripts own drift detection; the session service owns checkpoints and closure; the lock service owns release; the task queue owns reconciliation; Live State owns observed reality.

CURRENT FILES / SYMBOLS: scripts/check-docs.mjs, scripts/check-doc-governance.mjs, docs/governance/markdown-inventory.json, src/operationalMemory/sessionService.ts createCheckpoint/closeSession, src/operationalMemory/lockService.ts releaseLocksForSession, src/operationalMemory/taskQueue.ts reconcileIntent, src/liveState/*.

CURRENT TEST COVERAGE: docGovernance covers documentation invariants; governedSessionService, governedLocks and governedTaskQueue cover closure mechanics; liveState suites cover reconciliation.

CURRENT LIMITATIONS: drift is detected in CI, but no contract decides whether a given change requires a documentation update; terminal verification is not a distinct evaluable step, so DONE can currently be asserted from process completion rather than from verified reality — which is AF-07.

EXACT GAP: there is no terminal verification contract that re-observes reality after the documentation deployment and gates DONE on it, and no contract handles the recursion where the documentation change is itself the last deployed SHA.

INTEGRATION CLASSIFICATION: REUSE/GENERALIZE for GW-58 and GW-65; CANDIDATE for GW-59, GW-61 and GW-63; PARTIAL/CANDIDATE for GW-60; REUSE/EXTEND for GW-62 and GW-64; REUSE for GW-66, GW-67, GW-70 and GW-71; PARTIAL/EXTEND for GW-68; PARTIAL/REUSE for GW-69 and GW-72.

REUSED AS-IS: documentation governance enforcement, checkpoint creation, lock release, session closure, queue reconciliation and receipt refresh.

WRAPPED: drift detection output becomes a contract decision input.

GENERALIZED: the documentation authority set becomes project-scoped through GWC-11, so a second project closes against its own documents.

EXTENDED: a terminal verification step that re-observes GitHub, runtime and live state after the documentation deployment and blocks DONE on any mismatch.

NEW PRIMITIVES: the terminal verification predicate only.

INTEGRATION SLOT: after GWC-15 deployment, before the existing closure calls; never inside closeSession.

UPSTREAM / DOWNSTREAM: GWC-15 -> GW-58..GW-72 -> GWC-17 universal acceptance.

DATA MODEL / SCHEMA / PERSISTENCE: no new persistence; the checkpoint record already carries the needed fields.

AUTHORITY / SECURITY / PRIVACY: DONE must be derived from verified reality, never from process completion. Releasing a lock must not depend on the task's outcome — a failed task must still release.

CONCURRENCY / LOCK / REPLAY: closure ordering matters — verify, then checkpoint, then release locks, then close the session, then reconcile the queue. Releasing before checkpointing would lose the record if closure failed.

FAILURE / RECOVERY: a failed terminal verification blocks DONE and keeps the task in VERIFYING with a blocker, rather than silently regressing to IN_PROGRESS.

BACKWARD COMPATIBILITY: the current checkpoint shape and closure semantics are unchanged.

MIGRATION STRATEGY: terminal verification lands in observation mode, recording what it would have blocked, before it gates DONE.

EXPECTED EXISTING FILES TO CHANGE: none for closure mechanics; documentation contracts consume the existing scripts.

EXPECTED NEW FILES / TYPES / FUNCTIONS: drift decision, terminal verification predicate and a documentation-recursion guard.

EXPECTED MCP / WORKFLOW CHANGES: none beyond what GWC-12 decides.

EXPECTED TESTS: DONE is refused when runtime and GitHub disagree; a documentation-only deployment that becomes the final runtime SHA terminates without infinite recursion; locks are released even when the task failed; closure ordering is enforced; an unchanged-documentation case skips the branch contracts without failing.

RED / GREEN: RED proves DONE can currently be asserted without re-observing reality; GREEN adds terminal verification with no change to checkpoint or closure mechanics.

REGRESSION SURFACE: documentation governance, checkpoint shape, lock release on session close, session expiry, queue reconciliation and live state.

PROPERTY / FAIL-CLOSED: no DONE without verified reality; no lock retained past closure; no unbounded documentation recursion.

OBSERVABILITY / ATTESTATION: expose the verification inputs, their freshness and the blocking reason when DONE is refused.

ROLLBACK: terminal verification returns to observation mode; closure mechanics are untouched.

OPEN DECISIONS: none blocking. The recursion bound is resolvable — a documentation deployment that changes no tracked behavior terminates by definition once drift is zero.

DECISIONS RESOLVABLE FROM EXISTING AUTHORITIES: checkpoint, lock release, session closure and queue reconciliation all already exist and must be reused; documentation drift is already exactly detectable.

DEFINITION OF DONE: DONE is gated on verified reality, the documentation recursion terminates, and closure reuses the existing session, lock and queue authorities without adding a second closure path.

FUTURE TASK MATERIALIZATION GUIDANCE: REQUIRES LIVE TASK QUEUE RECONCILIATION.

### GWC-17 — Universal Acceptance — Detailed Evolution Design

STATUS: DETAILED_DESIGN_COMPLETE_WITH_OPEN_DECISIONS

CONTRACTS COVERED: GW-73 UNIVERSAL_ACCEPTANCE.

PURPOSE: prove that the engine is genuinely universal — that it governs a project it was not written for — and that no MCP-specific assumption survived.

POSITION IN THE GRAPH: GW-73 is deliberately outside the runtime workflow graph. Its declared predecessor is the globally implemented system and its successor is a terminal acceptance report. It evaluates the system as a whole, not a step of each governed task, and .mcp/gwc-workflow-graph.json records it under outOfRuntimeGraph with that reason rather than as an unreachable terminal.

CURRENT_MAIN IMPLEMENTATION: none. GW-73 is the only contract besides GW-01 classified NEW, and correctly so: there is no acceptance harness today.

CANDIDATE IMPLEMENTATION: `#86` is the most valuable input to this blueprint. It governs Stablecoin on S2 with a Passenger runtime, a Next.js build, frontend/auth/api health checks and a GitRegistry V1 mapping, and it deliberately leaves the backend repository as LIVE_DISCOVERY_REQUIRED rather than inventing one. That is a second project, a second server, a second runtime kind and an honestly incomplete component — exactly the acceptance material this blueprint needs.

CURRENT AUTHORITIES: unchanged. Acceptance observes; it governs nothing.

CURRENT TEST COVERAGE: no universal acceptance suite exists. The 343-test read-only safety suite and the 12 governance tests are MCP-specific by construction and cannot serve this purpose.

CURRENT HARD-CODES: this blueprint's whole purpose is to detect them. The verified inventory at CURRENT_MAIN is: ServerId = 's1' | 's2'; managedServers protectedDomains literals; AutoResumeCompatibleSessionInput.repository as a literal; LockScopeInput's repository key as a literal; GovernedOperationalContext repository and governedBranch as literals; reconcileIntent's OUT_OF_SCOPE rule; CANONICAL_ROOT_DOCUMENTS and CANONICAL_KEYS; the literal test enumeration in package.json; and the per-server, per-technology observation tool names. Each is legitimate today; each must be either generalized by GWC-3 through GWC-11 or explicitly declared as an MCP instance value.

EXACT GAP: nothing proves the engine works for a project other than MCP, and nothing prevents a future contributor from reintroducing an MCP assumption.

INTEGRATION CLASSIFICATION: NEW, and justified — an acceptance harness has no existing owner by definition.

REUSED AS-IS: every contract under test, plus the existing registry, resolver and operational authorities as the harness's fixtures.

GENERALIZED: nothing. This blueprint consumes generalization; it does not perform it.

EXTENDED: the harness becomes a CI step once it is stable, so a regression in universality fails the build rather than being discovered later.

NEW PRIMITIVES: the acceptance harness and its scenario fixtures.

INTEGRATION SLOT: tests only. The harness must not be importable by runtime code, so it cannot become a hidden dependency.

UPSTREAM / DOWNSTREAM: GWC-10 and GWC-16 -> GW-73 -> terminal acceptance report.

DATA MODEL / SCHEMA / PERSISTENCE: fixtures only; no production data and no persistence.

AUTHORITY / SECURITY / PRIVACY: the harness must never touch a real server, a real deployment or a real task queue. Fixtures must contain no credentials and no real host data.

CONCURRENCY / LOCK / REPLAY: recovery scenarios are part of the acceptance surface — a crash between claim and lock, between lock and mutation, and between deployment and attestation must each be covered.

FAILURE / RECOVERY: a failing acceptance scenario is a design defect in the contract it exercises, not a defect in the harness. It must name the contract.

BACKWARD COMPATIBILITY: the harness must run against the historical single-repository model as well as a multi-component one, proving GWC-10's compatibility rule rather than assuming it.

MIGRATION STRATEGY: start with the MCP scenario to establish the baseline, then add Stablecoin, then a synthetic multi-component project. Adding scenarios must never require editing a contract.

EXPECTED EXISTING FILES TO CHANGE: package.json to register the suite, and the CI workflow once it is stable.

EXPECTED NEW FILES / TYPES / FUNCTIONS: the harness, its scenario fixtures and an anti-hardcode assertion that fails when a governed path references a literal repository, server or domain.

EXPECTED MCP / WORKFLOW CHANGES: one CI step once stable — and that step must be discovered by the GWC-13 validation profile rather than enumerated, so AF-31 does not recur here.

EXPECTED TESTS: MCP governs end to end; Stablecoin governs end to end with a Passenger runtime and no MCP branching; a multi-component project keeps independent SHAs and independent locks; a component that cannot be resolved does not poison the others; the three recovery scenarios resume correctly; the anti-hardcode assertion fails on a deliberately reintroduced literal.

RED / GREEN: RED proves a second project cannot be governed today; GREEN is reached only when every scenario passes without a single MCP-specific branch.

REGRESSION SURFACE: every contract, since acceptance is the whole-system gate.

PROPERTY / FAIL-CLOSED: a scenario that cannot run is a failure, never a skip. A skipped acceptance scenario is indistinguishable from an unimplemented one and must be treated as red.

OBSERVABILITY / ATTESTATION: the terminal acceptance report names each scenario, the contracts it exercised and its verdict.

ROLLBACK: the harness can be removed without affecting runtime, since nothing imports it.

OPEN DECISIONS: none of its own. GW-73 inherits the resolution of every open decision it exercises, which is precisely why it is last.

DECISIONS RESOLVABLE FROM EXISTING AUTHORITIES: a second real project already exists as a candidate and should be the second scenario rather than a synthetic one; GW-73 is a system gate, not a per-task step.

DEFINITION OF DONE: two real projects and one synthetic multi-component project are governed end to end by the same contracts, with no MCP-specific branching, all recovery scenarios passing, and the anti-hardcode assertion enforced.

FUTURE TASK MATERIALIZATION GUIDANCE: REQUIRES LIVE TASK QUEUE RECONCILIATION.

---

## Detailed Evolution Design — transverse registries

These thirteen registries are the cross-blueprint view of the same design. They exist so that a
contradiction between two blueprints is visible in one place rather than discoverable only by
reading all eighteen. Every row is grounded in `CURRENT_MAIN` evidence unless it is explicitly
marked as a design target.

### R1 — Authority registry

No blueprint creates an authority. Each row names the existing owner of a fact and the blueprints
that consume it.

| Authority | Owner at `CURRENT_MAIN` | Owns | Consumed by |
| --- | --- | --- | --- |
| Governed Session | `src/operationalMemory/sessionService.ts` | session lifecycle, revision, transport binding, checkpoint | `GWC-4`, `GWC-16` |
| Governed Task Queue | `src/operationalMemory/taskQueue.ts` | task identity, classification, lifecycle, dependencies, conflicts | `GWC-5`, `GWC-16` |
| Governed Lock Service | `src/operationalMemory/lockService.ts` | lock grant, TTL, renewal, release | `GWC-5`, `GWC-16` |
| Bootstrap Receipt | governed context `bootstrap` | connection freshness | `GWC-4`, `GWC-15`, `GWC-16` |
| GitRegistry V2 | `src/github/registryV2.ts` | project, components, mappings, server paths, domains | `GWC-3`, `GWC-6`, `GWC-8`, `GWC-10` |
| GitHub identity / repository / project | `src/github/*Resolution.ts` | identity, repository, project resolution | `GWC-3` |
| Capability Reality | `src/governance/operationalDecision.ts` | what is actually callable | `GWC-9` |
| Governance Decision | `src/governance/operationalDecision.ts` | composed verdict | `GWC-9` |
| Scoped Write Gate | `src/governance/scopedWriteGate.ts` | whether a write may proceed | `GWC-9` |
| Live State | `src/liveState/*` | observed reality | `GWC-5`, `GWC-15`, `GWC-16` |
| Documentation governance | `scripts/check-doc*.mjs` | authority documents, exact inventory | `GWC-11`, `GWC-16` |
| Function cartography | `scripts/check-function-cartography.mjs` | registered tool surface | `GWC-9`, `GWC-11`, `GWC-12` |
| GitHub Actions CI | `.github/workflows/mcp-ci.yml` | pass/fail verdict per SHA | `GWC-13`, `GWC-15` |
| GitHub OIDC | `src/deploy/githubOidc.ts` | commit binding of a deploy request | `GWC-15` |
| S1 deploy worker | `src/deploy/s1Deploy.ts` | deployment execution and attestation | `GWC-15` |
| GitHub | remote | versioned repository state, reviews, checks, rulesets | `GWC-12`, `GWC-14`, `GWC-15` |
| Server via SSH | `src/ssh/*` | runtime truth | `GWC-6`, `GWC-7`, `GWC-8` |

Audit result: no blueprint claims an authority in this table, and no two blueprints claim the same
new authority. `GWC-9` composes but never decides anew; `GWC-5` plans locks but the Lock Service
still grants them; `GWC-7` resolves a runtime but never restarts it.

### R2 — Data contract registry

| Data contract | State | Owner blueprint | Compatibility rule |
| --- | --- | --- | --- |
| `ConnectionContextSchema` | exists | `GWC-4` | unchanged |
| session / task / lock records | exist | `GWC-4`, `GWC-5` | `TargetScope` added optional only |
| `RegistryProjectSchema` | exists, already multi-repository | `GWC-10` | unchanged |
| `RegistryMappingSchema` | exists | `GWC-6`, `GWC-7`, `GWC-8` | optional runtime descriptor and role only |
| `GithubOperationalContext.checks` | exists, SHA-bound | `GWC-14` | reference shape, unchanged |
| `GithubOperationalContext.reviews` | exists, **not** SHA-bound | `GWC-14` | gains nullable `headSha` / `exactHead` |
| `S1DeployStatus` | exists | `GWC-15` | unchanged |
| deploy attestation JSON | exists, `schema_version: 1` | `GWC-15` | v2 additive; v1 stays readable, never reinterpreted |
| `markdown-inventory.json` | exists, `schemaVersion: 1` | `GWC-11` | exact inventory, regenerated by repository tooling |
| `.mcp/gwc-*.json` | exists, design-only | `GWC-0` | version and digest bound |
| `GovernedStepId` | design target | `GWC-0` | new, orchestration-only |
| `RuntimeBinding` | design target | `GWC-7` | new, optional on mapping |
| `TargetContext` / `TargetScope` | design target | `GWC-10` | new, optional everywhere |
| validation profile | design target | `GWC-13` | declared, replaces literal enumeration |
| `PremergeProof` | design target | `GWC-14` | composes, never re-observes |

### R3 — Reason code registry

The repository already uses bounded reason codes with an explicit unknown. That discipline is
inherited, not invented.

| Family | Examples at `CURRENT_MAIN` | Rule for new codes |
| --- | --- | --- |
| OIDC | `oidc_event_not_allowed`, `oidc_sha_mismatch`, `oidc_expired`, `oidc_ref_invalid` | frozen; no new code may weaken a check |
| deploy | `deploy_sha_invalid`, `deploy_run_id_invalid`, `deploy_job_id_invalid` | extend only |
| documentation | `markdown_inventory_drift`, `markdown_count_drift`, `canonical_structure_mismatch` | extend only |
| resolver status | `RESOLVED`, `NONE`, `AMBIGUOUS`, `UNVERIFIED` | reused verbatim by `GW-07`, `GW-08`, `GW-09` |
| callability | `CALLABLE`, `NOT_CALLABLE`, `UNKNOWN` | reused verbatim by `GW-10`, `GW-11` |
| production state | `github_s1_sha_mismatch`, `runtime_revision_not_attested` | extend only |

Invariant: every status vocabulary carries an explicit unknown, and an unknown never composes to
permitted. New codes are additive, bounded and sanitized; none may be free text.

### R4 — Evidence registry

| Evidence | Source | Freshness carrier at `CURRENT_MAIN` | Gap |
| --- | --- | --- | --- |
| identity / repository / project | GitHub + registry | resolver freshness fields | none |
| server | config + registry | `realPathVerified`, `remoteVerified` | no resolution status — `GWC-6` |
| runtime | SSH observation | live state snapshot time | not typed — `GWC-7` |
| domain | registry + probe | `domainVerified` | declared and observed not joined — `GWC-8` |
| checks | GitHub | `headSha`, `exactHead`, `evidence.checks` provenance | none |
| reviews | GitHub | `evidence.reviews` provenance only | **no commit binding — AF-22 / AF-30** |
| ruleset | GitHub | `evidence.ruleset` provenance | none |
| CI verdict for a SHA | GitHub Actions | run conclusion | **not consulted before deploy — AF-19** |
| deployment | S1 attestation | `ended_at` | no `attestationId`, no CI reference — AF-29 |
| live state | collectors | snapshot time | none |
| documentation | CI scripts | digests | not a step precondition — `GWC-11` |

### R5 — Attestation registry

| Attestation | Exists | Bound to | Required change |
| --- | --- | --- | --- |
| deploy attestation JSON | yes | `requested_sha`, `runtime_revision` | add `attestationId`, add authorizing CI reference, bound `result` / `phase` / `rollback_status` to enums, bump `schema_version` |
| runtime image attestation | yes, S1-specific | image identity | generalize through `RuntimeBinding` |
| client tool surface attestation | yes | catalogue digest | unchanged |
| checkpoint | yes | session, `observedHeadSha` | unchanged |
| terminal acceptance report | design target | whole system | new, `GWC-17` |

Invariant: an attestation records what was proven and by which authority. It never replaces the
authority, and a historical attestation is never reinterpreted under a newer schema.

### R6 — Mutation registry

Every mutation in the programme, with the gate it passes through.

| Mutation | Authority | Gate at `CURRENT_MAIN` | Blueprint |
| --- | --- | --- | --- |
| open / resume / close session | session service | session revision precondition | `GWC-4` |
| acknowledge context | session service | `expectedStateVersion` | `GWC-4` |
| create checkpoint | session service | session revision | `GWC-16` |
| create / transition / claim task | task queue | `ALLOWED_TRANSITIONS` + ownership | `GWC-5` |
| acquire / release lock | lock service | session binding + TTL | `GWC-5` |
| GitHub branch / commit / PR / merge | candidate only | `ENABLE_WRITE_TOOLS` + shadow gate | `GWC-12`, `GWC-14` |
| deploy a SHA | deploy endpoint + S1 worker | OIDC + policy gate + flock | `GWC-15` |
| scoped write tools (40) | per tool | `decorateScopedWriteServer` | `GWC-9` |
| governed task mutations (3) | task queue | **no write gate — AF-32** | `GWC-9` |

The cartography at `CURRENT_MAIN` records 111 registered tools as 68 `read`, 40 `scoped-write` and
3 `operational-write`. Only the 40 traverse the gate. Closing that to 43 is `GWC-9`'s extension.

### R7 — Lock registry

| Scope | Shape at `CURRENT_MAIN` | Target |
| --- | --- | --- |
| repository | `{ type: 'repository'; key: 'Patricked-code/MCP' }` — literal | target identifier |
| task | `{ type: 'task'; key: string }` | unchanged |
| resource | `{ type: 'resource'; key: string }` | unchanged, per-component keys |

`acquireLock` grants exactly one scope per call. A step needing several locks therefore acquires
them one at a time, which can leave a partial grant. Atomic multi-acquisition is the only genuinely
new lock behavior in the programme and belongs inside `lockService.ts` — `OD-05`.

Minimal collision domain: no blueprint takes a repository-wide lock. Two components of one project
must be lockable independently or `GWC-10` is defeated.

### R8 — Replay and recovery registry

| Element | Replay model | Recovery source |
| --- | --- | --- |
| `ExecutionFrame` | ephemeral, never persisted | rebuilt from authorities |
| contract evaluation | pure for fixed evidence | re-evaluate |
| session | persisted, revision-guarded | session service |
| task | persisted, transition-guarded | task queue |
| lock | persisted, TTL-guarded | `expireLocks`, `reconcileSessionLockIds` |
| CI verdict | **never replayable across SHAs** | re-observe |
| review evidence | **never replayable across heads** | re-observe — AF-22 / AF-30 |
| deployment attestation | immutable record | read, never re-derive |
| live state | snapshot | re-collect |

Invariant: recovery comes from the authorities plus the contract and graph version, never from an
event-journal replay of workflow position. There is no durable GWC workflow state store.

### R9 — Security registry

| Rule | Enforced at `CURRENT_MAIN` | Blueprint that must not weaken it |
| --- | --- | --- |
| OIDC `allowedEvents` = push, workflow_dispatch | `githubOidc.ts` | `GWC-15` |
| OIDC `tokenSha === requestedSha` | `validateClaims` | `GWC-15` |
| OIDC ref and workflow_ref pinned to main | `validateClaims` | `GWC-15` |
| no free Git shell, no raw GitHub API | candidate `#89` invariants | `GWC-12` |
| no force-push, no reset --hard, no clean -fdx | candidate `#89` invariants | `GWC-12` |
| writes require `ENABLE_WRITE_TOOLS` | `src/server.ts` | `GWC-9`, `GWC-12` |
| protected domains | `managedServers` | `GWC-8` |
| no secrets in Git | `lint:secrets` | all |
| unknown never composes to permitted | tri-state vocabularies | `GWC-9` |
| approval bound to exact head | **absent** | `GWC-14` closes it |
| CI proven before deploy | **absent** | `GWC-15` closes it |

### R10 — Transition and graph registry

| Property | Value |
| --- | --- |
| contracts | 73 |
| runtime graph members | 72 |
| outside runtime graph | `GW-73`, with recorded reason |
| entry | `GW-01` |
| runtime terminal | `GW-72` |
| edges | 91 — 70 forward, 5 backward, 16 skip |
| reachability | 72 / 72 from `GW-01` |
| orphans / dead ends | 0 |
| id semantics | stable namespace, not execution order |

No blueprint adds, removes, renumbers or merges a contract, and none adds a graph edge. The graph is
a design projection verified by `scripts/gwc-verify.mjs`, not a runtime store.

### R11 — Existing primitive reuse registry

The REUSE-before-NEW rule, made auditable. Every primitive a blueprint would otherwise have invented.

| Would-be new primitive | Existing primitive reused instead | Blueprint |
| --- | --- | --- |
| session engine | `createGovernedSessionService` | `GWC-4` |
| resume proof | `createResumeSecret` / `verifyResumeSecret` | `GWC-4` |
| optimistic concurrency | `expectedSessionRevision`, `expectedStateVersion` | `GWC-4`, `GWC-5` |
| task queue | `taskQueue.ts` with `ALLOWED_TRANSITIONS` | `GWC-5` |
| deterministic digest | `canonical()`, `taskRegistryDigest()` | `GWC-0`, `GWC-5` |
| lock system | `lockService.ts` | `GWC-5` |
| project registry | `RegistryProjectSchema.repositoryComponents` | `GWC-10` |
| resolver status vocabulary | `RESOLVED` / `NONE` / `AMBIGUOUS` / `UNVERIFIED` | `GWC-6`, `GWC-7`, `GWC-8` |
| capability model | `deriveCapabilityReality` | `GWC-9` |
| governance decision | `deriveGovernanceDecision` | `GWC-9` |
| write gate | `decorateScopedWriteServer` | `GWC-9` |
| SHA-bound evidence shape | `checks.headSha` / `checks.exactHead` | `GWC-14` |
| exact-SHA deployment proof | `validate_status` assertions | `GWC-15` |
| deployment mutual exclusion | `flock` in the S1 worker | `GWC-15` |
| deployment gate slot | the existing `gate` step | `GWC-15` |
| checkpoint | `createCheckpoint` | `GWC-16` |
| closure | `releaseLocksForSession`, `closeSession`, `reconcileIntent` | `GWC-16` |
| documentation inventory | `markdown-inventory.json` | `GWC-11`, `GWC-16` |
| second project fixture | candidate `#86` Stablecoin | `GWC-17` |

### R12 — Generalization registry

Every literal that must widen, and the value that must remain valid afterwards.

| Literal at `CURRENT_MAIN` | Location | Widens to | Current value stays valid |
| --- | --- | --- | --- |
| `repository: 'Patricked-code/MCP'` | `AutoResumeCompatibleSessionInput` | target identifier | yes |
| `key: 'Patricked-code/MCP'` | `LockScopeInput` repository variant | target identifier | yes |
| `repository`, `governedBranch: 'main'` | `GovernedOperationalContext` | target + canonical branch | yes |
| `OUT_OF_SCOPE` for other repositories | `reconcileIntent` | target-aware | yes, until a second target |
| `ServerId = 's1' \| 's2'` | `config/servers.ts` | canonical server identifier | yes, identity normalization |
| `protectedDomains` literals | `config/servers.ts` | stays a safety list | yes, unchanged |
| `CANONICAL_ROOT_DOCUMENTS` | `doc-governance-lib.mjs` | project-scoped declaration | yes |
| `CANONICAL_KEYS` | `doc-governance-lib.mjs` | project-scoped declaration | yes |
| test file enumeration | `package.json` | discovered validation profile | yes, same set |
| runtime observation per technology | tools | `RuntimeBinding` kinds | yes |

Rule `NO_NEW_MCP_TARGET_HARDCODE` applies to `GWC-3` through `GWC-9`: none of those blueprints may
add a literal repository, server, domain or container identifier to a governed path.

### R13 — Migration and backward compatibility registry

| Change | Kind | Compatibility rule |
| --- | --- | --- |
| widened literal types | compile-time | identical runtime value; no stored data touched |
| `TargetScope` on session / task / receipt | additive optional | absence means the current single target; never backfilled |
| runtime descriptor on mapping | additive optional | absence means `UNVERIFIED`, never `NO_RUNTIME` |
| `headSha` / `exactHead` on reviews | additive nullable | absence means unknown, which blocks |
| attestation `schema_version` 1 → 2 | versioned | v1 readable as written; never reinterpreted |
| contract / graph version | versioned | incompatible version fails closed — `OD-09` |
| cartography digest | regenerated | only by repository tooling, never by hand |
| markdown inventory | regenerated | only by `generate-doc-governance-baseline.mjs` |
| validation profile | replacement | must reproduce the current step set exactly before replacing it |

Single most important rule of the programme: a stored session, task, lock or receipt written before
this evolution must remain valid, readable and resumable with no migration step.

## Detailed Evolution Design — modèles de preuve, d'attestation et de reprise

Ces quatre modèles sont exigés par les phases `A7` et `A8` du flux pré-code. Ils manquaient au
dossier : la conception les nommait sans les spécifier. Ils sont typés ici, au niveau conception,
sans aucune implémentation runtime.

### M1 — `EvidenceRef` (exigé par `A7-01`)

Une preuve n'est utilisable que si l'on sait **qui** l'a produite, **quand**, et **à quoi** elle est liée.

| Champ | Type | Règle |
| --- | --- | --- |
| `authority` | identifiant d'autorité de `R1` | obligatoire ; jamais un document, jamais un agent |
| `kind` | `OBSERVATION` · `DERIVATION` · `ATTESTATION` · `DECLARATION` | `DECLARATION` ne peut jamais satisfaire seule une précondition de mutation |
| `reference` | référence relisible — SHA, run id, chemin + ancre, id d'enregistrement | doit être re-lisible depuis l'autorité citée, pas depuis une copie |
| `observedAt` | horodatage UTC | obligatoire |
| `freshness` | `CURRENT` · `STALE` · `EXPIRED` · `UNKNOWN` | `UNKNOWN` se comporte comme `STALE` |
| `digest` | sha256 du contenu observé, ou `null` | `null` uniquement si l'autorité n'expose aucun contenu digestible |
| `binding` | `{ repository?, project?, component?, branch?, headSha?, sessionId?, taskId? }` | toute liaison connue doit être portée ; une liaison absente ne vaut pas liaison satisfaite |

Invariants. Une `EvidenceRef` sans `authority` ou sans `observedAt` est invalide. Une preuve `STALE`,
`EXPIRED` ou `UNKNOWN` ne peut autoriser aucune mutation. Une preuve dont le `binding.headSha` diffère
du head courant est `STALE` par construction — c'est la forme générale d'`AF-19`, d'`AF-22` et
d'`AF-30`.

### M2 — `StepAttestation` (exigé par `A7-02`)

Ce qu'un pas de workflow laisse derrière lui. Complète `AF-29`, qui constatait l'incomplétude de
l'attestation de déploiement existante.

| Champ | Type | Règle |
| --- | --- | --- |
| `attestationId` | identifiant unique | obligatoire — son absence est précisément `AF-29` |
| `stepId` | `GW-01`…`GW-73` | doit exister au registre des contrats |
| `contractVersion` · `graphVersion` | entiers | l'attestation est liée à la version de conception qui l'a produite |
| `inputDigest` · `outputDigest` | sha256 ou `null` | `null` admis pour un pas sans entrée ou sans sortie digestible |
| `status` | `PASS` · `FAIL` · `BLOCKED` · `CONFLICT` · `SKIPPED` · `WAIT_EXTERNAL` | énumération fermée |
| `authorities` | `EvidenceRef[]` | au moins une pour tout pas non `PURE` |
| `reasonCodes` | codes bornés de `R3` | jamais de texte libre |
| `freshness` | reprise de la preuve la moins fraîche citée | une attestation n'est jamais plus fraîche que sa preuve la plus périmée |
| `binding` | identique à `EvidenceRef.binding` | une attestation portant une liaison autre que celle du pas est rejetée |
| `endedAt` | horodatage UTC | obligatoire |

Invariants. Une attestation n'est pas une autorisation : elle enregistre ce qui a été prouvé, jamais
ce qui est permis. Une attestation historique n'est jamais réinterprétée sous une version de contrat
plus récente. `SKIPPED` exige un motif de saut déclaré au graphe (`M5`).

### M3 — classes de rejeu (exigé par `A8-03`)

Tout contrat porte exactement une classe.

| Classe | Définition | Règle de rejeu |
| --- | --- | --- |
| `PURE` | transformation déterministe, aucune lecture d'autorité | rejouable sans condition |
| `READ_ONLY` | observe une autorité, ne mute rien | rejouable, mais la fraîcheur doit être ré-établie |
| `IDEMPOTENT_MUTATION` | mute, et un second passage sur le même état converge vers le même résultat | rejouable seulement après réobservation de la postcondition |
| `NON_REPLAYABLE_MUTATION` | mute de façon non convergente — merge, déploiement, création de Task, acquisition de lock | **jamais rejouée** ; une reprise passe obligatoirement par `M4` |

Invariant. Aucune mutation n'est rejouée sur la seule foi du journal d'événements. Le déploiement
exact-SHA et le merge exact-head sont `NON_REPLAYABLE_MUTATION` par construction.

### M4 — `RecoveryAnchor` (exigé par `A8-04`)

Le point depuis lequel une reprise est légitime après interruption.

| Champ | Type | Règle |
| --- | --- | --- |
| `anchorId` | identifiant unique | obligatoire |
| `stepId` | dernier pas dont la postcondition a été **observée**, pas seulement tentée | jamais le pas en cours |
| `observedPostcondition` | `EvidenceRef` | obligatoire — une ancre sans preuve de postcondition est invalide |
| `binding` | identique à `M1` | une ancre ne traverse ni session, ni tâche, ni cible |
| `replayClassOfNextStep` | valeur de `M3` | détermine si la reprise peut ré-exécuter ou doit réobserver |
| `duplicateInvocationRule` | `REOBSERVE_THEN_DECIDE` | une invocation dupliquée n'est jamais présumée sans effet |

Invariants. Reprendre consiste à réobserver depuis l'ancre, jamais à rejouer depuis un journal. Une
ancre dont le `binding.headSha` ne correspond plus impose `STOP → REOBSERVE → RECONCILE`. Devant une
invocation potentiellement dupliquée d'une `NON_REPLAYABLE_MUTATION`, la seule issue admise est de
réobserver l'autorité pour savoir si la mutation a eu lieu — jamais de la retenter.

### M5 — précondition d'arête (exigé par `A5-01`)

Chaque arête du graphe porte une précondition typée, projetée dans `.mcp/gwc-workflow-graph.json`.

| Champ | Type | Règle |
| --- | --- | --- |
| `trigger` | `POSTCONDITION_PASS` · `POSTCONDITION_FAIL` · `SKIP_CONDITION` · `REOBSERVE_REQUIRED` | énumération fermée |
| `precondition` | expression lisible portant sur le statut du pas source | obligatoire, jamais vide |

Invariant. Aucune transition implicite : une arête sans `trigger` ni `precondition` est refusée par
`scripts/gwc-verify.mjs`.

---

## Detailed Evolution Design — matrice centrale des 73 contrats

Projection exacte de `.mcp/gwc-contracts.json`. Chaque contrat a exactement un blueprint
propriétaire, et chaque blueprint propriétaire a une fiche Detailed Evolution Design ci-dessus.
La colonne `Graphe` distingue les 72 contrats du graphe runtime de `GW-73`, hors graphe runtime.

| Contrat | Nom canonique | Famille | Classification | Blueprint | Findings | Graphe |
| --- | --- | --- | --- | --- | --- | --- |
| `GW-01` | INTENT_CAPTURE | A | `NEW` | `GWC-1` | — | runtime |
| `GW-02` | CONNECTION_BOOTSTRAP | B | `REUSE/GENERALIZE` | `GWC-4` | — | runtime |
| `GW-03` | CONNECTION_CONTEXT | B | `REUSE/GENERALIZE` | `GWC-4` | — | runtime |
| `GW-04` | GITHUB_IDENTITY_RESOLUTION | B | `REUSE` | `GWC-3` | — | runtime |
| `GW-05` | REPOSITORY_RESOLUTION | B | `REUSE/EXTEND` | `GWC-3` | — | runtime |
| `GW-06` | PROJECT_RESOLUTION | B | `REUSE/EXTEND` | `GWC-3` | — | runtime |
| `GW-07` | SERVER_RESOLUTION | B | `GENERALIZE/EXTEND` | `GWC-6` | — | runtime |
| `GW-08` | RUNTIME_RESOLUTION | B | `GENERALIZE/EXTEND` | `GWC-7` | — | runtime |
| `GW-09` | DOMAIN_RESOLUTION | B | `GENERALIZE/EXTEND` | `GWC-8` | — | runtime |
| `GW-10` | GOVERNANCE_INHERITANCE | C | `PARTIAL/GENERALIZE` | `GWC-9` | — | runtime |
| `GW-11` | EFFECTIVE_CAPABILITIES | C | `REUSE/EXTEND` | `GWC-9` | — | runtime |
| `GW-12` | BOOTSTRAP_RECEIPT | C | `REUSE/GENERALIZE` | `GWC-4` | — | runtime |
| `GW-13` | LIVE_STATE_RECONCILIATION | D | `REUSE/GENERALIZE` | `GWC-5` | — | runtime |
| `GW-14` | EXISTING_TASK_LOOKUP | D | `REUSE/GENERALIZE` | `GWC-5` | — | runtime |
| `GW-15` | TASK_CREATION_IF_REQUIRED | D | `REUSE/GENERALIZE` | `GWC-5` | — | runtime |
| `GW-16` | GOVERNED_SESSION_OPEN_OR_RESUME | D | `REUSE/GENERALIZE` | `GWC-4` | — | runtime |
| `GW-17` | CONTEXT_ACKNOWLEDGEMENT | D | `REUSE/GENERALIZE` | `GWC-4` | — | runtime |
| `GW-18` | TASK_CLAIM | D | `REUSE` | `GWC-5` | — | runtime |
| `GW-19` | MINIMAL_LOCK_ACQUISITION | D | `REUSE/EXTEND` | `GWC-5` | — | runtime |
| `GW-20` | TASK_IN_PROGRESS | D | `REUSE` | `GWC-5` | — | runtime |
| `GW-21` | AUTHORITY_DOCUMENT_READ | E | `PARTIAL` | `GWC-11` | — | runtime |
| `GW-22` | INTEGRATION_SLOT_RESOLUTION | E | `PARTIAL/EXTEND` | `GWC-11` | — | runtime |
| `GW-23` | EXACT_GITHUB_BASELINE | E | `PARTIAL/REUSE` | `GWC-11` | — | runtime |
| `GW-24` | GOVERNED_BRANCH_CREATION | E | `CANDIDATE` | `GWC-13` | — | runtime |
| `GW-25` | TDD_RED_AUTHORING | E | `PARTIAL/CANDIDATE` | `GWC-13` | — | runtime |
| `GW-26` | TDD_RED_OBSERVATION | E | `PARTIAL/EXTEND` | `GWC-13` | — | runtime |
| `GW-27` | TDD_GREEN_MINIMAL_IMPLEMENTATION | E | `PARTIAL/CANDIDATE` | `GWC-13` | — | runtime |
| `GW-28` | GREEN_CI | E | `REUSE/EXTEND` | `GWC-13` | — | runtime |
| `GW-29` | SELF_REVIEW | E | `PARTIAL` | `GWC-13` | — | runtime |
| `GW-30` | REGRESSION_RED_IF_FINDING | E | `PARTIAL` | `GWC-13` | — | runtime |
| `GW-31` | REGRESSION_GREEN | E | `PARTIAL` | `GWC-13` | — | runtime |
| `GW-32` | FULL_REGRESSION | E | `REUSE` | `GWC-13` | — | runtime |
| `GW-33` | NON_TERMINAL_DOCUMENTATION | E | `PARTIAL` | `GWC-13` | — | runtime |
| `GW-34` | DRAFT_PR | F | `CANDIDATE` | `GWC-14` | — | runtime |
| `GW-35` | EXACT_DIFF_REVIEW | F | `PARTIAL/EXTEND` | `GWC-14` | `AF-22`, `AF-30` | runtime |
| `GW-36` | RULESET_VERIFICATION | F | `PARTIAL/EXTEND` | `GWC-14` | — | runtime |
| `GW-37` | REVIEW_FINDINGS_RESOLUTION | F | `PARTIAL/CANDIDATE` | `GWC-14` | — | runtime |
| `GW-38` | PR_READY | F | `CANDIDATE` | `GWC-14` | `AF-22`, `AF-30` | runtime |
| `GW-39` | TASK_REVIEW | F | `REUSE` | `GWC-14` | — | runtime |
| `GW-40` | REVIEW_CHECKPOINT | F | `REUSE` | `GWC-14` | — | runtime |
| `GW-41` | PREMERGE_REVALIDATION | F | `PARTIAL/EXTEND` | `GWC-14` | `AF-22`, `AF-30` | runtime |
| `GW-42` | TASK_MERGE_READY | F | `REUSE` | `GWC-14` | — | runtime |
| `GW-43` | EXACT_HEAD_MERGE | F | `CANDIDATE` | `GWC-14` | `AF-22`, `AF-30` | runtime |
| `GW-44` | MAIN_MERGE_COMMIT_OBSERVATION | G | `REUSE` | `GWC-15` | — | runtime |
| `GW-45` | MAIN_CI | G | `REUSE/EXTEND` | `GWC-15` | `AF-19` | runtime |
| `GW-46` | GOVERNED_AUTODEPLOY_OBSERVATION | G | `REUSE/EXTEND` | `GWC-15` | `AF-19` | runtime |
| `GW-47` | GITHUB_TO_S1_SYNC_ATTESTATION | G | `REUSE/GENERALIZE` | `GWC-15` | — | runtime |
| `GW-48` | DEPLOY_TYPECHECK_BUILD | G | `PARTIAL/EXTEND` | `GWC-15` | — | runtime |
| `GW-49` | RUNTIME_REBUILD_OR_RESTART_ATTESTATION | G | `REUSE/GENERALIZE` | `GWC-15` | — | runtime |
| `GW-50` | HEALTH_CHECK | G | `REUSE/GENERALIZE` | `GWC-15` | — | runtime |
| `GW-51` | RUNTIME_IMAGE_ATTESTATION | G | `REUSE/GENERALIZE` | `GWC-15` | — | runtime |
| `GW-52` | EXACT_SHA_DEPLOYMENT_PROOF | G | `REUSE/GENERALIZE/EXTEND` | `GWC-15` | — | runtime |
| `GW-53` | LIVE_STATE_UPDATE | G | `REUSE/GENERALIZE` | `GWC-15` | — | runtime |
| `GW-54` | STALE_RECEIPT_DETECTION | G | `REUSE` | `GWC-15` | — | runtime |
| `GW-55` | RECEIPT_REFRESH | G | `REUSE` | `GWC-15` | — | runtime |
| `GW-56` | TASK_RUNTIME_REVISION_BINDING | G | `PARTIAL` | `GWC-15` | `AF-08` | runtime |
| `GW-57` | TASK_DEPLOYING | G | `REUSE` | `GWC-15` | — | runtime |
| `GW-58` | DOCUMENTATION_DRIFT_DECISION | H | `REUSE/GENERALIZE` | `GWC-16` | — | runtime |
| `GW-59` | DOCUMENTATION_BRANCH_IF_REQUIRED | H | `CANDIDATE` | `GWC-16` | — | runtime |
| `GW-60` | DOCUMENTATION_RECONCILIATION | H | `PARTIAL/CANDIDATE` | `GWC-16` | — | runtime |
| `GW-61` | DOCUMENTATION_PR | H | `CANDIDATE` | `GWC-16` | — | runtime |
| `GW-62` | DOCUMENTATION_CI_REVIEW | H | `REUSE/EXTEND` | `GWC-16` | — | runtime |
| `GW-63` | DOCUMENTATION_EXACT_HEAD_MERGE | H | `CANDIDATE` | `GWC-16` | — | runtime |
| `GW-64` | DOCUMENTATION_AUTODEPLOY | H | `REUSE/EXTEND` | `GWC-16` | — | runtime |
| `GW-65` | DOCUMENTATION_LIVE_STATE | H | `REUSE/GENERALIZE` | `GWC-16` | — | runtime |
| `GW-66` | TERMINAL_RECEIPT_REFRESH | H | `REUSE` | `GWC-16` | — | runtime |
| `GW-67` | TASK_VERIFYING | H | `REUSE` | `GWC-16` | — | runtime |
| `GW-68` | TERMINAL_VERIFICATION | H | `PARTIAL/EXTEND` | `GWC-16` | `AF-07` | runtime |
| `GW-69` | TASK_DONE | H | `PARTIAL/REUSE` | `GWC-16` | `AF-07` | runtime |
| `GW-70` | TERMINAL_CHECKPOINT | H | `REUSE` | `GWC-16` | — | runtime |
| `GW-71` | LOCK_RELEASE | H | `REUSE` | `GWC-16` | — | runtime |
| `GW-72` | SESSION_CLOSE_AND_QUEUE_RECONCILE | H | `PARTIAL/REUSE` | `GWC-16` | — | runtime |
| `GW-73` | UNIVERSAL_ACCEPTANCE | I | `NEW` | `GWC-17` | — | hors runtime |

### Compteurs de la matrice

| Mesure | Valeur |
| --- | --- |
| Contrats | 73 |
| Membres du graphe runtime | 72 |
| Hors graphe runtime | 1 |
| Contrats portant au moins un finding | 9 |
| Blueprints propriétaires distincts | 14 |
| Classifications distinctes | 12 |

Répartition par blueprint : `GWC-1` 1 · `GWC-3` 3 · `GWC-4` 5 · `GWC-5` 6 · `GWC-6` 1 · `GWC-7` 1 · `GWC-8` 1 · `GWC-9` 2 · `GWC-11` 3 · `GWC-13` 10 · `GWC-14` 10 · `GWC-15` 14 · `GWC-16` 15 · `GWC-17` 1.

Répartition par classification : `REUSE/GENERALIZE` 15 · `REUSE` 15 · `REUSE/EXTEND` 9 · `PARTIAL/EXTEND` 7 · `CANDIDATE` 7 · `PARTIAL` 6 · `PARTIAL/CANDIDATE` 4 · `GENERALIZE/EXTEND` 3 · `PARTIAL/REUSE` 3 · `NEW` 2 · `PARTIAL/GENERALIZE` 1 · `REUSE/GENERALIZE/EXTEND` 1.

Seuls `GW-01` et `GW-73` sont classés `NEW`. Les 71 autres contrats réutilisent, enveloppent,
généralisent ou étendent un élément existant, ou dépendent d'un candidat déjà écrit. C'est la
mesure quantitative de la règle `REUSE → WRAP → GENERALIZE → EXTEND → NEW`.

---

## Detailed Evolution Design — traitement des décisions ouvertes

Une décision ouverte n'est pas une permission de deviner. Chaque ligne indique ce que les preuves
`CURRENT_MAIN` permettent déjà de trancher et ce qui reste à décider. `NARROWED` signifie que les
preuves éliminent des options sans désigner la bonne.

| ID | Sujet | Propriétaire | État après cette conception | Ce que les preuves établissent | Ce qui reste à décider |
| --- | --- | --- | --- | --- | --- |
| `OD-01` | borne du `rawIntent` de `GW-01` | `GWC-1` | `NARROWED` | le dépôt borne déjà ses entrées — `TOKEN_MAX_BYTES` 16 384, corps JSON limité à 4 Ko sur `/deploy/github/s1/start`, bornes `max()` sur les schémas Zod | la valeur exacte et son comportement au dépassement : rejet ou troncature attestée |
| `OD-02` | énumération des sources de `GW-01` | `GWC-1` | `NARROWED` | `CallabilitySource` montre la forme attendue : énumération fermée et bornée | la liste exacte des sources d'intention admises |
| `OD-03` | normalisation du `serverId` canonique | `GWC-6` | `OPEN` | deux représentations coexistent — union fermée `'s1' \| 's2'` et `z.string().min(1)` libre au registre — et rien ne les réconcilie | la règle de normalisation, sous contrainte d'être l'identité sur toutes les valeurs stockées |
| `OD-04` | schéma `RuntimeBinding` | `GWC-7` | `NARROWED` | les types de runtime observables dans le parc sont Docker, PM2, Passenger, checkout simple et absence de runtime ; `healthChecks` et `rollbackMethod` existent déjà au registre | la forme exacte du schéma et son emplacement — champ optionnel du mapping ou projection Live State |
| `OD-05` | acquisition atomique multi-locks | `GWC-5` | `OPEN` | `acquireLock` n'accorde qu'une portée par appel, donc une acquisition multiple est aujourd'hui non atomique | l'ordre déterministe, le comportement en acquisition partielle et l'emplacement — obligatoirement dans `lockService.ts` |
| `OD-06` | fraîcheur et liaison au commit de `ReviewEvidence` | `GWC-14` | `NARROWED` | le bloc `checks` porte déjà `headSha` et `exactHead` : la forme correcte existe dans le même type, dix lignes plus haut | la fenêtre de fraîcheur, et le sort d'une approbation dont le head a changé sans nouveau push |
| `OD-07` | mécanisme d'application d'`AF-19` | `GWC-15` | `OPEN`, options réduites | l'option `workflow_run` est **éliminée sur preuve** : `allowedEvents` la rejette (`oidc_event_not_allowed`) et la revendication `sha` du jeton ne serait pas le SHA déployé (`oidc_sha_mismatch`). Trois options restent compatibles avec la politique OIDC sans la modifier | choisir entre `B` étape `gate` existante, `C` point d'admission serveur et `D` dépendance de job ; et trancher si `workflow_dispatch` contourne aussi la porte CI |
| `OD-08` | Operational Memory singleton contre concurrence distribuée | `GWC-4`, `GWC-5` | `OPEN` | le contrôle optimiste par révision existe déjà et fonctionne pour un processus | le modèle de concurrence visé, avant que `GWC-10` ne multiplie les cibles |
| `OD-09` | migration de version Contract/Graph incompatible | `GWC-0` | `OPEN` | `schemaVersion: 1` et un digest de registre existent déjà ; l'échec fermé sur version inconnue est la règle retenue | la politique de migration elle-même, et le sort des attestations émises sous une version antérieure |
| `OD-10` | migration `TargetScope` pour Session/Task/Receipt | `GWC-10` | `NARROWED` | la règle de compatibilité est établie : champ additif optionnel, absence signifiant la cible unique actuelle, aucun rétro-remplissage | le placement exact du champ sur chacun des trois types |
| `OD-11` | représentation de l'ownership de Task multi-repository | `GWC-10` | `OPEN` | `repositoryComponents` et `componentRole` existent déjà au registre et suffisent à décrire la cible | comment une Task possède un sous-ensemble de composants, et ce qu'ownership signifie quand deux composants avancent séparément |
| `OD-12` | fenêtre de fraîcheur inter-autorités de `GW-52` | `GWC-15` | `OPEN` | `validate_status` exige déjà `runtimeRevision === sha` et trois contrôles de santé vrais : la preuve exacte existe, mais sans fenêtre déclarée entre les autorités qui la composent | la fenêtre maximale admise entre l'observation GitHub, l'attestation S1 et le Live State |

Aucune décision ouverte n'est tranchée par cette conception. Sept sont réduites par les preuves, cinq
restent entières. Aucune ne bloque la réconciliation de tâches : chacune appartient à un blueprint
identifié et sera tranchée par la tâche qui l'implémente, avec des tests d'acceptance explicites.

---

## Detailed Evolution Design — registre des findings

### Provenance des findings

Un point de rigueur doit être posé avant le registre. La série `AF-01` à `AF-30` est définie dans
`docs/gwc/archive/ARCHITECTURE_R2_NON_CANONICAL.md`, document **archivé et explicitement non
canonique**. Le corps canonique `docs/gwc/ARCHITECTURE_73_CONTRACTS.md` ne contient qu'**une seule**
occurrence de la chaîne `AF-`, à propos d'`AF-19`.

Conséquence vérifiée, et nouvelle : les affectations de findings portées par
`.mcp/gwc-contracts.json` ne se résolvent pas toutes vers une définition versionnée cohérente.

| Affectation dans le registre machine | Définition dans l'archive R2 | Cohérent |
| --- | --- | --- |
| `AF-19` sur `GW-45`, `GW-46` | « les check-runs de `main` ne sont jamais collectés » — affecte `GW-45`, `GW-46` | oui |
| `AF-22` sur `GW-35`, `GW-38`, `GW-41`, `GW-43` | « `parseReviews` ne lit pas `review.commit_id` » — affecte `GW-35`, `GW-38`, `GW-43` | oui, `GW-41` ajouté à juste titre |
| `AF-30` sur `GW-35`, `GW-38`, `GW-41`, `GW-43` | « la famille revue n'a ni enforcement ni évidence » | oui |
| `AF-07` sur `GW-68`, `GW-69` | « collision de nommage `safeNow` / `mayExecute` / `mayMutate` » — affecte **tous** les contrats | **non** |
| `AF-08` sur `GW-56` | « `LiveStateGlobalStatus` existe déjà » — affecte `GW-13`, `GW-53` | **non** |

Les définitions archivées d'`AF-07` et d'`AF-08` ne décrivent pas les contrats auxquels le registre
machine les rattache. Deux explications sont possibles — les fiches canoniques `R1` portent leur
propre numérotation, distincte de la série `R2` ; ou les affectations ont été dérivées sans
recoupement. Les preuves disponibles ne permettent pas de trancher, et aucune définition n'est
inventée ici pour réconcilier l'écart. Il est enregistré sous `AF-33`.

Règle retenue : un finding n'est actionnable que si sa définition est versionnée et vérifiable.
Trois le sont pleinement — `AF-19`, `AF-22` et `AF-30` — parce que cette conception les rétablit
depuis des preuves `CURRENT_MAIN` indépendantes de l'archive.

### Findings dont la définition est établie sur preuve `CURRENT_MAIN`

| ID | Défaut | Preuve exacte | Propriétaire | Priorité |
| --- | --- | --- | --- | --- |
| `AF-19` | un SHA de `main` peut être déployé avant la conclusion de sa propre CI | run de déploiement 43 terminé à 04:06:26 pour `d1f3039`, CI 956 du même SHA conclue à 04:06:47 ; l'étape `gate` ne consulte jamais la CI de `$GITHUB_SHA` | `GWC-15` | 1 |
| `AF-22` | une approbation donnée sur un head antérieur compte pour le head courant | `GithubOperationalContext.reviews` déclare `approvals`, `changesRequested`, `unresolvedThreads` et **aucun** `headSha` ni `exactHead`, alors que `checks` déclare les deux | `GWC-14` | 2 |
| `AF-30` | la famille revue n'a ni liaison de preuve ni point d'application | même déclaration de type ; `GW-41` ne peut prouver que les approbations comptées portent sur le head à fusionner | `GWC-14` | 2 |
| `AF-29` | l'attestation de déploiement est incomplète | l'écriture `write_attestation` ne produit aucun `attestationId` et écrit `result`, `phase` et `rollback_status` en chaînes non bornées | `GWC-15` | 3 |
| `AF-31` | deux fichiers de tests ne sont exécutés nulle part | 57 fichiers `tests/*.test.ts`, 55 référencés par un script `package.json` ; `githubRegistryEvidence.test.ts` et `githubRepositoryResolution.test.ts` ne le sont par aucun, donc ne s'exécutent dans aucune étape CI | `GWC-13` | 3 |
| `AF-32` | trois mutations gouvernées ne traversent aucune porte d'écriture | la cartographie enregistre 111 outils en 68 `read`, 40 `scoped-write` et 3 `operational-write` ; seuls les 40 passent par `decorateScopedWriteServer` | `GWC-9` | 2 |
| `AF-33` | un identifiant de finding du registre machine ne se résout pas vers une définition versionnée cohérente | `AF-07` rattaché à `GW-68`/`GW-69` et `AF-08` à `GW-56`, alors que les seules définitions versionnées décrivent d'autres contrats | `GWC-0` | 3 |
| `AF-34` | le gate pre-code déclare 14/14 phases d'architecture satisfaites, alors que quatre conditions de sortie ne sont pas vérifiables sur le head exact | `.mcp/gwc-precode-gate.json` porte `architecturePhases.satisfied = 14` ; la vérification du head `58d71959` donne 10/14 — `A5-01` 0/91 arêtes portant trigger/precondition, `A7-01`/`A7-02` aucun modèle `EvidenceRef` ni `StepAttestation` typé, `A8-03`/`A8-04` classes de rejeu et `RecoveryAnchor` non définies, `A11-01` 15/19 scénarios nommés couverts | `GWC-0` | 1 — bloque le gate |
| `AF-35` | la Governed Task Queue et Live State se contredisent sur l'état de `TASK-20260915-001` | la file déclarait `DEPLOYING` avec blocker `DOCUMENTATION_DRIFT` à `46d576e5` ; Live State `stateVersion 246` déclarait `documentation: ALIGNED`, `global: FULLY_ALIGNED` et 0 contradiction à `d1f30395`, plus récent. **Résolu à la source le 2026-09-17T20:27Z** : l'agent propriétaire a acquitté `stateVersion 246`, porté la tâche à `DONE` avec blockers vides (`taskRevision 12`) puis fermé sa session `499b2ea3`. Les deux autorités concordent, réobservé le 2026-09-18T17:08Z | `GWC-5` | **résolu** |

`AF-31`, `AF-32` et `AF-33` sont découverts par la conception d'évolution ; `AF-34` et `AF-35` sont
découverts par l'exécution du flux pré-code. Aucun n'existait dans un document antérieur.

`AF-34` est la démonstration que la règle absolue du flux tient : « une affirmation documentaire
`COMPLETE` ne suffit pas par elle-même ». Le gate se déclarait complet ; la vérification contre le head
exact l'a réfuté.

**`AF-34` est corrigé**, sur ses deux faces. L'instance : les six conditions de sortie manquantes
(`A5-01`, `A7-01`, `A7-02`, `A8-03`, `A8-04`, `A11-01`) ont été comblées par conception, et les 14
phases sont désormais `PASS_WITH_EVIDENCE` avec références de preuve relisibles. La cause : le
vérificateur pre-code ne contrôlait que les compteurs déclarés du gate ; il recoupe maintenant ces
compteurs contre `.mcp/gwc-precode-status.json`, refuse un `PASS_WITH_EVIDENCE` sans preuve, refuse un
verdict de gate qui contredit le décompte des phases, et exige le head exact observé. Un gate ne peut
donc plus se déclarer complet sans l'être.

### Findings hérités de l'archive R2

Ces vingt-six findings sont enregistrés avec leur propriétaire architectural. Leur définition reste
celle de l'archive et n'est pas recopiée ici : la recopier dans le corps canonique lui donnerait un
statut canonique qu'elle n'a pas. Ils sont marqués `DEFINITION_SOURCE = ARCHIVE_R2_NON_CANONICAL`.

| Thème | Findings | Propriétaire architectural |
| --- | --- | --- |
| littéraux mono-cible | `AF-01`, `AF-02`, `AF-03` | `GWC-10`, avec application dans `GWC-4` et `GWC-5` |
| observation mono-cible | `AF-04`, `AF-05` | `GWC-10` |
| politique OIDC mono-projet | `AF-06` | `GWC-15`, jamais par assouplissement |
| collision de canonicalisation JSON | `AF-21` | `GWC-0` |
| collision de nommage `safeNow` / `mayExecute` | `AF-07` | `GWC-16` selon le registre machine, `GWC-9` selon la définition archivée — écart enregistré sous `AF-33` |
| statut global déjà existant | `AF-08` | `GWC-5` — aucun second statut global |
| détection de drift fragile | `AF-09` | `GWC-16` |
| raisons de précondition et fraîcheur | `AF-10`, `AF-11` | `GWC-9`, `GWC-4` |
| modèle d'attestation existant à copier | `AF-12` | `GWC-0` — finding positif |
| acceptance sans cible non-MCP | `AF-13` | `GWC-17` |
| bascule GitRegistry V1 vers V2 | `AF-14` | `GWC-3` |
| actes cognitifs sans preuve MCP | `AF-15`, `AF-16` | `GWC-13` |
| seed contre documentation | `AF-17` | `GWC-5` |
| deux `firstExecutable` divergents | `AF-18` | `GWC-5` |
| plages d'IDs par famille | `AF-20` | `GWC-0` — résolu par le registre |
| `eventIds` de checkpoint vide | `AF-23` | `GWC-16` |
| transitions manquantes ou asymétriques | `AF-24`, `AF-27` | `GWC-5` |
| lock MCP sans prise sur GitHub | `AF-25` | `GWC-14` |
| deux systèmes de verrouillage | `AF-26` | `GWC-15` — projeter `flock` comme preuve, ne pas fusionner |
| incohérence de graphe | `AF-28` | `GWC-0` — **corrigé** en `R3` |

`AF-28` est le seul finding hérité déjà corrigé : le graphe a été reconstruit comme union exacte des
deux directions de routage, 91 arêtes, 72 contrats runtime tous atteignables depuis `GW-01`.

### Couverture

| Mesure | Valeur |
| --- | --- |
| Findings enregistrés | 35 — `AF-01` à `AF-35` |
| Série héritée `AF-01` à `AF-30` | 30 |
| dont définition rétablie sur preuve `CURRENT_MAIN` ici | 4 — `AF-19`, `AF-22`, `AF-29`, `AF-30` |
| dont définition restée `ARCHIVE_R2_NON_CANONICAL` | 26 |
| Découverts par la conception d'évolution | 3 — `AF-31`, `AF-32`, `AF-33` |
| Découverts par l'exécution du flux pré-code | 2 — `AF-34` (gate déclaratif), `AF-35` (Task Queue contre Live State) |
| Corrigés à ce jour | 2 — `AF-28` (graphe), `AF-34` (gate déclaratif) |
| Résolus à la source par un autre agent | 1 — `AF-35`, par clôture de `TASK-20260915-001` et de la session `499b2ea3` |
| Sans propriétaire architectural | 0 |

Chaque finding a un blueprint propriétaire. Aucun n'est orphelin.

---

## Detailed Evolution Design — audits globaux

Quatre audits transversaux, exécutés sur l'ensemble des dix-huit blueprints. Un audit qui ne trouve
rien n'est pas un audit : chacun énonce ce qu'il a cherché et ce qu'il a trouvé.

### A1 — Audit d'interface

Question : deux blueprints exposent-ils la même chose sous deux noms, ou le même nom sous deux
sémantiques ?

| Constat | Verdict |
| --- | --- |
| `GWC-3` et `GWC-6`/`GWC-7`/`GWC-8` produisent tous des résolutions | cohérent — même vocabulaire `RESOLVED` / `NONE` / `AMBIGUOUS` / `UNVERIFIED`, réutilisé et non redéfini |
| `GWC-0` canonicalisation et `GWC-5` `canonical()` du Task Queue | **risque réel** — trois canonicalisations JSON coexistent déjà (`AF-21`). `GWC-0` ne doit partager la sienne que si elle est octet-compatible avec `taskRegistryDigest()`, sinon deux digests désigneront la même valeur |
| `mayExecute` de `GWC-9` contre `safeNow` et `mayMutate` existants | **risque réel** — `AF-07`. `GWC-9` compose et ne redéfinit pas ; tout nouveau nom doit être distinct de ceux d'`operationalDecision.ts`. Le registre machine rattache pourtant `AF-07` à `GW-68`/`GW-69`, donc à `GWC-16` : l'écart est enregistré sous `AF-33` et n'est pas résolu par hypothèse |
| `TargetScope` de `GWC-10` contre `LockScopeInput` de `GWC-5` | homonymie à éviter — ce sont deux notions différentes, portée de cible et portée de verrou |
| `ExecutionFrame` de `GWC-2` contre session de `GWC-4` | disjoints — la frame est éphémère, la session est persistée |
| `RuntimeBinding` de `GWC-7` contre `runtimeRevision` existant | complémentaires — l'un décrit comment ça tourne, l'autre quelle révision tourne |

Résultat : deux collisions réelles, toutes deux déjà enregistrées comme findings, toutes deux
assignées. Aucune collision non traitée.

### A2 — Audit d'autorité

Question : un blueprint crée-t-il une autorité, en duplique-t-il une, ou en contourne-t-il une ?

| Contrôle | Résultat |
| --- | --- |
| second moteur de session | aucun — `GWC-4` enveloppe `createGovernedSessionService` |
| seconde file de tâches | aucune — `GWC-5` enveloppe `taskQueue.ts` |
| second système de verrous | aucun — l'acquisition atomique est explicitement placée **dans** `lockService.ts` |
| second registre de projets | aucun — `GWC-10` réutilise `repositoryComponents` |
| second moteur de décision de gouvernance | aucun — `GWC-9` compose `deriveGovernanceDecision` |
| second Live State | aucun — `GWC-7` et `GWC-15` consomment les collecteurs existants |
| second plan de contrôle GitHub | aucun — `GWC-12` réconcilie des candidats existants |
| second moteur de déploiement | aucun — `GWC-15` étend l'étape `gate` existante |
| store durable d'état de workflow GWC | aucun — `ExecutionFrame` est éphémère par conception |
| contournement d'autorité | **un seul trouvé** — `AF-32` : trois mutations enregistrées ne traversent aucune porte d'écriture. Ce n'est pas un blueprint qui contourne, c'est l'état actuel, et `GWC-9` le referme |

Résultat : aucune autorité créée ni dupliquée par la conception. Un contournement préexistant
découvert et assigné.

### A3 — Audit de mutation et de concurrence

Question : chaque mutation est-elle protégée, et deux travaux indépendants peuvent-ils progresser ?

| Contrôle | Résultat |
| --- | --- |
| toute mutation a une précondition | oui pour session, tâche et verrou ; **non** pour les trois mutations `operational-write` quant à la porte d'écriture — `AF-32` |
| acquisition multi-verrous | **non atomique aujourd'hui** — `acquireLock` n'accorde qu'une portée par appel. `OD-05`, seule nouveauté réelle de concurrence du programme |
| domaine de collision minimal | respecté — aucun blueprint ne prend de verrou à l'échelle du dépôt ; `GWC-10` exige des verrous par composant |
| exclusion mutuelle de déploiement | `flock` existe et est conservé ; `AF-26` note qu'il ignore le Lock Service gouverné, et la conception retient de le projeter comme preuve plutôt que de fusionner les deux |
| verdict CI rejoué d'un SHA à l'autre | interdit ; c'est exactement `AF-19` |
| preuve de revue rejouée d'un head à l'autre | interdit ; c'est exactement `AF-22` et `AF-30` |
| ordre de clôture | imposé — vérifier, checkpoint, libérer les verrous, fermer la session, réconcilier la file |
| libération de verrou conditionnée au succès | interdite — une tâche en échec libère aussi |

Résultat : une lacune de protection (`AF-32`), une lacune d'atomicité (`OD-05`), les deux assignées.
Le principe de domaine de collision minimal tient sur les dix-huit blueprints.

### A4 — Audit de graphe et d'universalité

Question : le graphe reste-t-il intact, et la conception fonctionne-t-elle hors de MCP ?

| Contrôle | Résultat |
| --- | --- |
| contrats ajoutés, retirés, renumérotés ou fusionnés | aucun — 73 avant, 73 après |
| arêtes ajoutées ou retirées | aucune — 91 arêtes inchangées |
| atteignabilité | 72 / 72 depuis `GW-01`, terminal `GW-72`, `GW-73` hors graphe runtime avec motif |
| chaque contrat a un blueprint propriétaire | oui, exactement un — 14 blueprints portent des contrats, 4 sont des lots d'infrastructure |
| chaque blueprint a une fiche de conception détaillée | oui, 18 sur 18 |
| ordre des identifiants confondu avec l'ordre d'exécution | non — les identifiants sont un espace de noms stable |
| littéraux mono-cible restants | 10, tous inventoriés en `R12`, tous assignés |
| `NO_NEW_MCP_TARGET_HARDCODE` sur `GWC-3` à `GWC-9` | respecté — aucune de ces sept fiches n'introduit de littéral de cible |
| seconde cible réelle disponible pour l'acceptance | oui — le candidat `#86` fournit un second projet, un second serveur et un runtime Passenger |
| dépendance de l'universalité à un candidat non fusionné | **oui, réelle** — `GWC-17` s'appuie sur `#86`, et `GWC-13`, `GWC-14`, `GWC-16` dépendent de capacités qui n'existent que dans la pile `#88`/`#89`/`#90`, dont la disposition est ouverte |

Résultat : graphe intact et couverture complète. Une dépendance réelle de la conception envers des
candidats non fusionnés, concentrée dans `GWC-12`, qui est précisément le blueprint chargé d'en
décider. Sept contrats sont classés `CANDIDATE` pour cette raison, et c'est la principale raison pour
laquelle le verdict final n'est pas inconditionnel.

---

## Phase C3 — réconciliation de la pile `#85` / `#86` / `#88` / `#89` / `#90`

Exécution de `GWC-PRE-C3` du flux pré-code : *« For each capability: still needed? already
implemented? duplicate? stale? GWC-compatible? correct owner/blueprint? Disposition must be
KEEP / REWORK / SPLIT / SUPERSEDE / CLOSE / DEFER. No blind stale-stack merge. »*

`GWC-12` énonçait les options stratégiques de la pile et les laissait à une décision gouvernée.
C3 pose une question différente et plus fine : **capacité par capacité**, laquelle est encore
nécessaire, et à qui. La disposition stratégique reste gouvernée ; l'analyse ci-dessous la rend
informée plutôt qu'arbitraire.

### Observation

```
SOURCE      = GITHUB_LIVE
REPOSITORY  = Patricked-code/MCP
OBSERVED_AT = 2026-09-18T05:45Z
MAIN_SHA    = d1f303955c4d368950da2307dda41d826fc85d0a
```

Les cinq candidates sont **inchangées** depuis les 2026-09-14/15 : mêmes heads exacts qu'à
l'observation du 2026-09-17T03:47Z enregistrée par `GWC-12`. Aucune n'a été rebasée, reprise ou
fermée entre-temps. Les conclusions de `GWC-12` sur leur fraîcheur restent donc courantes, et non
simplement héritées.

### Ce que `main` porte réellement aujourd'hui

`main@d1f30395` enregistre **111 outils**, dont **6** préfixés `github_` :
`github_account_inventory`, `github_durable_accounts_inventory`, `github_durable_accounts_status`,
`github_org_inventory`, `github_pr_authorization_diagnostic`, `github_registry_v2_dry_run`.

Tous relèvent de l'inventaire ou du diagnostic. **Aucune capacité de contrôle GitHub — branche,
commit, fichier, pull request, review, merge — n'existe sur `main`.** La réponse à « already
implemented? » est donc *non* pour l'intégralité des capacités candidates, sans exception.

### Le fait décisif : la dépendance bloquante se réduit à quatre outils

Sur les 73 contrats, **7 sont classés `CANDIDATE`** — la capacité n'existe que dans la pile — et
**4 sont `PARTIAL/CANDIDATE`** — `main` en porte une partie.

| Contrat bloqué | Blueprint | Capacité requise | PR |
| --- | --- | --- | --- |
| `GW-24` `GOVERNED_BRANCH_CREATION` | `GWC-13` | `github_create_branch` | `#90` |
| `GW-34` `DRAFT_PR` | `GWC-14` | `github_create_pull_request` | `#90` |
| `GW-38` `PR_READY` | `GWC-14` | `github_mark_pr_ready` | `#90` |
| `GW-43` `EXACT_HEAD_MERGE` | `GWC-14` | `github_merge_pull_request` | `#90` |
| `GW-59` `DOCUMENTATION_BRANCH_IF_REQUIRED` | `GWC-16` | `github_create_branch` (réemploi) | `#90` |
| `GW-61` `DOCUMENTATION_PR` | `GWC-16` | `github_create_pull_request` (réemploi) | `#90` |
| `GW-63` `DOCUMENTATION_EXACT_HEAD_MERGE` | `GWC-16` | `github_merge_pull_request` (réemploi) | `#90` |

Les sept contrats bloqués se ramènent à **quatre outils distincts**, tous dans `#90` :
`github_create_branch`, `github_create_pull_request`, `github_mark_pr_ready`,
`github_merge_pull_request`.

C'est la mesure qui manquait. La pile pèse plus de 5 500 lignes ajoutées sur trois PR empilées ;
ce qui bloque réellement l'architecture GWC en représente une fraction. Et `#88`, **racine** de la
pile et seule des trois à être en conflit direct avec `main`, n'est requise par **aucun** des 73
contrats : la staleness de toute la pile est enracinée dans une PR dont GWC n'a pas besoin.

### Disposition par capacité

| # | Capacité | Encore nécessaire ? | Sur `main` ? | Doublon ? | Stale ? | GWC-compatible ? | Propriétaire | Disposition |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `C-88.1` | `github_create_repository` — création d'un dépôt d'organisation, privé, vide | **non** — aucun des 73 contrats ne crée de dépôt | non | non | oui, `dirty` contre `main` | oui — bornée, `ENABLE_WRITE_TOOLS` + gate `shadow_ready` | aucun blueprint ; `GWC-12` porte la disposition | `DEFER` |
| `C-89.1` | manifeste `.mcp/git-github-capabilities.json`, 170 capacités + parser fail-closed | comme **entrée de conception** oui ; comme runtime, non | non | **oui, partiellement** — recouvre la cartographie de fonctions, qui est déjà l'autorité de la surface enregistrée | oui | à condition de ne jamais devenir une seconde autorité | entrée de conception pour `GWC-0` et `GWC-9` | `SUPERSEDE` |
| `C-89.2` | 12 outils READ bornés — dont `rulesets`, `PR reviews`, `commit checks`, `compare refs` | **oui, partiellement** — `rulesets` comble une lacune d'observabilité réelle ; `reviews`/`checks` alimentent `GW-35` et `GW-41` | non | non — complémentaires des outils d'inventaire de `main` | oui | oui — READ seul, fail-closed | `GWC-11`, `GWC-12` | `SPLIT` |
| `C-90.1` | `github_create_branch`, `github_create_pull_request`, `github_mark_pr_ready`, `github_merge_pull_request` | **oui — seul blocage réel des 7 contrats `CANDIDATE`** | non | non | oui, transitivement via `#89` → `#88` | oui — le garde de merge (head stale, draft, déjà mergé, non mergeable, checks non verts) est exactement la postcondition de `GW-43` | `GWC-13`, `GWC-14`, `GWC-16` | `SPLIT` — priorité haute |
| `C-90.2` | `github_get_review_threads`, `github_reply_review_thread`, `github_resolve_review_thread`, `github_create_commit`, `github_create_or_update_file` | **oui** — `GW-37` pour les threads, `GW-25`/`GW-27` pour la mutation de fichiers | non | non | oui | oui | `GWC-13`, `GWC-14` | `SPLIT` |
| `C-90.3` | `github_delete_branch`, `github_delete_file`, `github_request_review`, `github_update_pull_request`, `github_get_tree`, `github_get_commits`, `github_get_commit_diff`, `github_get_mergeability`, `github_get_required_checks` | **non cité** par un contrat à ce jour ; `mergeability`/`required_checks` redeviendront utiles à `GW-41` | non | non | oui | oui | `GWC-14` | `DEFER` |
| `C-85.1` | plan `Governed Actions → SSH Transport V1`, documentation seule | non — aucun contrat n'en dépend | sans objet | non | oui, `dirty` | sans objet — aucun code | hors périmètre GWC | `DEFER` |
| `C-86.1` | projet S2 `stablecoin_frontend` borné, sync et deploy gouvernés | non comme prérequis ; **oui comme preuve** — un second projet et un runtime Passenger servent `GWC-7` et `GWC-17` | non | non | oui, `dirty` | oui | preuve pour `GWC-7`, `GWC-17` | `DEFER` |

Aucune capacité ne reçoit `KEEP` : toutes sont stale contre `main` courant, donc aucune n'est
fusionnable en l'état. Aucune ne reçoit `CLOSE` : la fermeture d'une PR d'autrui n'est pas une
disposition que cette session peut exécuter, et la preuve TDD enregistrée dans chacune garde de la
valeur.

**Complétude de la partition, vérifiée.** Une table de disposition qui oublie une capacité ne vaut
rien. `#90` déclare 18 outils — 6 `READ`, 12 `WRITE`. Les groupes `C-90.1`, `C-90.2` et `C-90.3` en
comptent 4, 5 et 9, soit 18. Aucun doublon, aucun manquant, aucun outil étranger à la PR. La
répartition `WRITE` est exactement 4 + 4 + 4 = 12. La partition est donc **exacte et exhaustive**,
et non un échantillon commode.

### Contrainte d'ordonnancement dérivée, non négociable

`AF-32` établit que **trois** mutations gouvernées de `main` ne traversent aujourd'hui aucune porte
d'écriture. `#90` ajoute **douze** outils `WRITE`. Faire atterrir une surface d'écriture candidate
avant que `GWC-9` n'ait refermé `AF-32` élargirait un trou existant d'un facteur quatre, au lieu de
le combler.

Donc : **`GWC-9` précède l'atterrissage de tout `SPLIT` portant du `WRITE`.** Le `SPLIT` `C-89.2`,
qui est READ seul, n'est pas soumis à cette contrainte. Ce n'est pas une préférence de séquencement,
c'est une conséquence directe d'un finding enregistré.

### Ce que C3 établit, et ce qu'il ne tranche pas

Établi sur preuve : aucune capacité candidate n'existe sur `main` ; la dépendance bloquante se
réduit à quatre outils de `#90` ; `#88` n'est requise par aucun contrat alors qu'elle enracine la
staleness de la pile ; le manifeste de `#89` recouperait la cartographie et ne doit pas devenir une
seconde autorité ; `GWC-9` doit précéder toute surface `WRITE`.

Non tranché, et délibérément : **exécuter** un `SPLIT` est une matérialisation de tâche, donc
soumis à la Phase B, qui est `BLOCKED`. C3 produit une disposition, pas un merge. Aucune PR n'est
fusionnée, rebasée, fermée ni modifiée par cette analyse.

## Detailed Evolution Design — verdict terminal

```
VERDICT = DETAILED_EVOLUTION_DESIGN_READY_FOR_TASK_RECONCILIATION
```

### Ce qui est complet

| Livrable | État |
| --- | --- |
| Fiches de conception détaillée | 18 sur 18, `GWC-0` à `GWC-17` |
| Contrats rattachés | 73 sur 73, chacun à exactement un blueprint |
| Registres transverses | 13 sur 13, `R1` à `R13` |
| Matrice centrale des contrats | générée depuis `.mcp/gwc-contracts.json` |
| Audits globaux | 4 sur 4, `A1` à `A4` |
| Findings | 35 enregistrés, 35 rattachés, 0 orphelin |
| Décisions ouvertes | 12 enregistrées, 12 rattachées, 7 réduites par les preuves |
| Réconciliation de la pile candidate | `GWC-PRE-C3` exécutée, 8 capacités disposées |
| Projection machine | `.mcp/gwc-evolution-design.json` |
| Vérificateur | étendu, et prouvé mordant sur 13 défauts distincts |

### Ce qui reste ouvert, et pourquoi cela ne bloque pas la réconciliation

Trois réserves sont énoncées explicitement plutôt que dissimulées derrière le verdict.

**Sept contrats dépendent de capacités non fusionnées.** `GW-24`, `GW-34`, `GW-38`, `GW-43`, `GW-59`,
`GW-61` et `GW-63` sont classés `CANDIDATE` parce que la capacité correspondante n'existe que dans la
pile `#88` → `#89` → `#90`, observée stale contre `main` et dont `#88` est déjà en conflit. Cela ne
bloque pas la réconciliation : `GWC-12` est précisément le blueprint chargé de trancher la
disposition, et il est réconciliable tel quel.

> **Réserve réduite le 2026-09-18 par `GWC-PRE-C3`.** La réconciliation capacité par capacité
> établit que ces sept contrats ne dépendent que de **quatre outils** de `#90` —
> `github_create_branch`, `github_create_pull_request`, `github_mark_pr_ready`,
> `github_merge_pull_request` — et que `#88`, racine de la staleness de la pile, n'est requise par
> aucun des 73 contrats. Les huit capacités portent désormais une disposition bornée. Voir
> *Phase C3 — réconciliation de la pile*. La réserve subsiste — rien n'est fusionné — mais elle
> n'est plus indéterminée.

**Les définitions d'`AF-01` à `AF-27` ne sont versionnées que dans une archive non canonique.** La
conséquence exacte — deux affectations du registre machine ne se résolvent pas vers une définition
cohérente — est enregistrée sous `AF-33` et rattachée à `GWC-0`. Aucune définition n'a été inventée
pour combler l'écart.

**L'état de la Governed Task Queue runtime n'est pas observable depuis cette mission.** C'est la
raison pour laquelle les dix-huit fiches portent toutes
`FUTURE TASK MATERIALIZATION GUIDANCE = REQUIRES LIVE TASK QUEUE RECONCILIATION` et aucune
`NEW_TASK`. L'absence d'une entrée dans `.mcp/task-registry.json` n'est pas une preuve sur la file
runtime, et n'a jamais été traitée comme telle.

> **Réserve levée le 2026-09-17 par la Phase B.** Le MCP WealthTech est devenu atteignable et les
> autorités runtime ont été réellement observées — Task Queue `storeRevision 188`, Live State
> `stateVersion 246`, 25 sessions, aucun lock détenu. La réconciliation a eu lieu ; son résultat est
> `BLOCKED` sur un `CONFLICT` nommé, `TASK-20260915-001`, enregistré sous `AF-35`. Les dix-huit
> fiches gardent leur `REQUIRES LIVE TASK QUEUE RECONCILIATION`, non plus faute d'observation mais
> parce que la première tâche exécutable précède les nouvelles. Voir le bloc `phaseB` de
> `.mcp/gwc-precode-status.json`.
>
> **Blocage levé le 2026-09-18, réobservé à 17:08Z.** L'agent propriétaire a pris la voie (a) :
> `TASK-20260915-001` est `DONE`, blockers vides, `taskRevision 12`, et la session `499b2ea3` est
> `CLOSED` après acquittement du `stateVersion 246`. La file porte `storeRevision 190`, 15 tâches,
> **12 `DONE` + 3 `SUPERSEDED`, aucune non terminale**, et **zéro session `ACTIVE`**. `AF-35` est
> résolu à la source : les deux autorités concordent. La classification devient
> **`GWC-0` à `GWC-17` → `NEW_TASK`**, seule classification autorisant la création d'un
> `GovernedTaskRecord`.
>
> `NEW_TASK` rend la matérialisation **admissible, pas automatique**. Créer une Governed Task exige
> une governed session et un Bootstrap Receipt — hors du périmètre de cette session — et
> `TASK BLUEPRINT ≠ GovernedTaskRecord` interdit de créer les dix-huit en bloc. L'ordre prescrit
> reste celui de la Phase E, et la contrainte C3 tient : `GWC-9` précède tout `SPLIT` portant du
> `WRITE`. `RUNTIME_TASKS_CREATED` reste **0**.

### Frontières respectées

```
RUNTIME_TASKS_CREATED            = 0
TASK_CLAIMED                     = 0
LOCKS_ACQUIRED                   = 0
TASK_SEED_PROMOTED               = NO
GWC_RUNTIME_IMPLEMENTATION       = NOT_STARTED
AF19_IMPLEMENTATION              = NOT_STARTED
SRC_BEHAVIOR_CHANGED             = NO
NEW_BRANCH_CREATED               = NO
NEW_PR_CREATED                   = NO
PR95_MERGED                      = NO
PR_85_86_88_89_90_MERGED         = NO
DEPLOYMENT_PERFORMED             = NO
SERVER_MUTATED                   = NO
DURABLE_GWC_WORKFLOW_STATE_STORE = NONE
SECOND_AUTHORITY_CREATED         = NONE
```

### Suite

La réconciliation de tâches est l'étape suivante et appartient à la Governed Task Queue vivante, pas
à ce document. Pour chaque blueprint, elle doit produire une classification parmi `CONTINUATION`,
`DUPLICATE`, `CONFLICT`, `BLOCKED`, `OUT_OF_SCOPE` et `NEW_TASK`, et ne créer une tâche que dans le
dernier cas. L'ordre d'attaque recommandé reste celui des prérequis de sûreté : `AF-19` par `GWC-15`,
puis `AF-22`/`AF-30` par `GWC-14`, puis la disposition de la pile par `GWC-12`.
