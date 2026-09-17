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
- pr95_head_before_current_checkpoint: 7505a3c3c627909be336f1387eacfd23409c0e3b
- completed_blueprints: GWC-0, GWC-1, GWC-2, GWC-3
- in_progress_blueprint: GWC-4
- not_started_blueprints: GWC-4 through GWC-17
- completed_findings: none
- open_findings: AF-01..AF-30; AF-19 owned by GWC-15; AF-22/AF-30 owned by GWC-14
- resolved_open_decisions: none
- remaining_open_decisions: OD-01..OD-12
- candidate_prs_inspected: discovery complete at blueprint-design level; exact capability reconciliation still required for GWC-12/GWC-14
- transverse_registries_completed: none
- 73_contract_matrix_status: NOT_STARTED
- global_audits_completed: none
- verifier_status: existing R3 verifier only; Detailed Evolution Design checks not yet added
- last_completed_checkpoint: DED-1
- next_exact_action: design GWC-4 Connection/Session/Receipt integration from CURRENT_MAIN authorities

Resume rules:
- reobserve main and PR #95 before any write;
- do not restart GWC-0..GWC-3 unless a new finding or live contradiction invalidates evidence below;
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
