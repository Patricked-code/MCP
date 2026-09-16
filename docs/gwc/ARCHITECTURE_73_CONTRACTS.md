# GWC V1 — Architecture des 73 contrats (corps canonique)

| Champ | Valeur |
| --- | --- |
| Révision | `R3` |
| Baseline canonique | `GWC_73_CONTRACT_DESIGN_SHEETS_CANONICAL_R1` |
| Statut d'architecture | `READY_FOR_GOVERNED_IMPLEMENTATION` |
| `SOURCE` | `GITHUB_LIVE` |
| `REPOSITORY` | `Patricked-code/MCP` |
| `REF` | `main` |
| `OBSERVED_SHA` | `d1f303955c4d368950da2307dda41d826fc85d0a` |
| `OBSERVED_AT` | `2026-09-16T23:23:04Z` |
| `LOCAL_CLONE_USED_FOR_CANONICAL_REVALIDATION` | `NO` |
| Implémentation runtime démarrée | `NO` |

## Portée de ce document

Ce fichier est le **corps canonique** de l'architecture GWC. Il contient exclusivement
l'architecture retenue courante : les 73 Contract Design Sheets au modèle A→BA.

Il ne contient aucune affirmation historique. Une conclusion antérieure, même juste à
l'époque, n'a pas sa place ici : un agent qui récupère un fragment de ce document doit
pouvoir le croire actuel sans vérification supplémentaire.

| Besoin | Fichier |
| --- | --- |
| Protocole agent, amendement | `docs/gwc/README.md` |
| Historique des révisions R1 → R2 → R3 | `docs/gwc/REVISION_HISTORY.md` |
| Affirmations explicitement remplacées | `docs/gwc/DEPRECATED_CLAIMS.md` |
| Archive non canonique de R2 | `docs/gwc/archive/ARCHITECTURE_R2_NON_CANONICAL.md` |
| Blueprints d'implémentation | `docs/gwc/BLUEPRINTS.md` |
| Projection machine des contrats | `.mcp/gwc-contracts.json` |
| Graphe d'exécution machine | `.mcp/gwc-workflow-graph.json` |
| Registre machine des blueprints | `.mcp/gwc-blueprints.json` |

## Frontière d'autorité

La Governed Task Queue existante fournit `initializeSeed`, `firstExecutable`, le claim, le
cycle de vie des Tasks, les priorités, les dépendances, l'ownership et les conflits de
ressources. **Elle n'est pas le GWC Workflow Execution Engine.** Le futur moteur est une
couche d'orchestration distincte qui *compose* les autorités existantes — ContractRegistry,
WorkflowGraph, ExecutionFrame, EvidenceBroker, ContractEvaluator, GovernanceGateComposer,
EffectPlan, ActionDispatcher, PostconditionVerifier, GraphRouter, ResumeResolver,
`WAIT_EXTERNAL`, replay/recovery, protection anti-non-progression et continuation autonome.

Il ne possède aucune autorité métier nouvelle : pas de seconde Task Queue, pas de second
Live State, pas de seconde Operational Memory, pas de magasin durable d'état de workflow en V1.

## Note sur la numérotation

`GW-01`…`GW-73` sont un **espace de noms stable**, jamais une séquence d'exécution. Le graphe
canonique comporte des arêtes à rebours déclarées (`GW-13 → GW-12`, `GW-16 → GW-03`,
`GW-37 → GW-30`, `GW-65 → GW-56`) et des sauts (`GW-29 → GW-32`, `GW-58 → GW-66`). Aucune
règle `to > from` ne doit exister, et `scripts/gwc-verify.mjs` échoue si elle apparaît.

---

Provenance de la baseline canonique :

- Date : 2026-09-17
- Repository de référence : `Patricked-code/MCP`
- GitHub live baseline : `d1f303955c4d368950da2307dda41d826fc85d0a`
- Clone local utilisé : **NO**
- Écriture repo pendant cette matérialisation : **NO**

## Statut

Ce document matérialise la version longue canonique de la conception des 73 contrats GWC.
Il s’appuie sur l’architecture conceptuelle validée: autorités existantes, Contract Registry,
Workflow Graph, Execution Engine reconstructible, EvidenceEnvelope, EffectPlan, RecoveryAnchor,
ResumeResolver, WAIT_EXTERNAL, multi-repository TargetContext et terminal hard gate.

Il ne constitue pas encore une implémentation runtime et ne crée aucune autorité parallèle.

## Invariants globaux

- `NO_DIRECT_S1_VERSIONED_WRITE`
- `NO_UNVERIFIED_PERMISSION`
- `NO_TASK_DUPLICATION`
- `NO_LOCK_BYPASS`
- `NO_STALE_RECEIPT_MUTATION`
- `NO_UNREVIEWED_HEAD_MERGE`
- `NO_FALSE_DONE`
- `NO_SECRET_PROJECTION`
- `NO_PARALLEL_AUTHORITY`
- `NO_IMPLICIT_V2_ACTIVATION`
- `NO_PERMISSION_FROM_IDENTITY_ALONE`
- `NO_RUNTIME_FACT_FROM_GITHUB_ALONE`
- `UNKNOWN_REMAINS_UNKNOWN`
- `OBSERVE_BEFORE_ACTOR_FOR_EXTERNAL_MUTATION`

## Modèle de fiche

Chaque fiche couvre les sections A→BA:
A Identity; B Purpose; C Position; D Chronology; E Inputs; F Information semantics;
G Authorities; H Preconditions; I Micro-state machine; J Algorithm; K Determinism;
L Invariants; M Action model; N Current/Target owner; O Capability/Authorization;
P Locks; Q Concurrency; R Output; S Statuses; T Terminality; U Reason codes;
V Fail-closed; W Evidence; X Freshness; Y Attestation; Z Persistence; AA Privacy;
AB Replay; AC Recovery; AD Security; AE Observability; AF Predecessor interface;
AG Successor interface; AH Skip; AI Reobserve; AJ Reconcile; AK Blocked behavior;
AL Compensation; AM Existing system map; AN Hardcodes/generalization;
AO Future integration slot; AP Tests; AQ Property tests; AR Acceptance;
AS Open questions; AT Findings; AU Task Blueprint mapping; AV Execution semantics;
AW Effect Plan; AX Routing; AY Recovery anchor; AZ Reconstruction; BA Autonomy.


---

# GW-01 — INTENT_CAPTURE

## A — Identity
- **Contract ID:** `GW-01`
- **Canonical name:** `INTENT_CAPTURE`
- **Family:** `A — Intake`
- **Contract version:** `1` (conceptual baseline)
- **Profile(s):** `PURE_TRANSFORM`
- **Architectural status:** `NEW`
- **Integration class:** `NEW`

## B — Purpose
Capturer fidèlement l’intention entrante sans la confondre avec une preuve, une Task, une autorisation ou une mutation.

**Non-responsibilities:** does not steal ownership from Task Queue, Session, Lock Service, Live State, GitRegistry, GitHub, deploy/runtime or other downstream contracts.

## C — Position in global system
- **Logical predecessor(s):** ENTRY
- **Logical successor(s):** GW-02
- **Re-entry:** allowed when authoritative evidence shows this contract’s postcondition is not yet proven.
- **Skip:** only when an explicit deterministic `SKIPPABLE_IF` condition exists.
- **Reobserve/Reconcile:** first-class graph edges, never implicit retries.

## D — Chronological role
- **Transport chronology:** may differ from GW numeric order.
- **Functional chronology:** `GW-01` owns only `INTENT_CAPTURE` responsibility.
- **Runtime chronology:** resolved by Workflow Graph, not `stepId + 1`.

## E — Contract input
rawIntent borné; source bornée; receivedAt valide.

Input fields must be bounded, provenance-aware and typed as hint/claim/evidence/fact; raw secret material is forbidden unless explicitly unavoidable and ephemeral.

## F — Information semantics
Every field is classified as one of:
`RAW_INPUT | HINT | CLAIM | OBSERVATION | EVIDENCE | DERIVED_FACT | AUTHORITATIVE_FACT | DECISION | ATTESTATION`.

No contract upgrades a `HINT` to an authoritative fact without the owning evidence.

## G — Authorities
Uniquement la requête entrante et ses métadonnées bornées.

**Forbidden authority pattern:** no arbitrary Markdown, prompt text, tool availability or remembered state may override the actual owning authority.

## H — Preconditions
- Structural input valid and bounded.
- Required authorities reachable or explicitly `UNAVAILABLE`.
- Required freshness/revision/SHA bindings available.
- No contradictory prerequisite state.
- For mutations: session/receipt/task/locks/governance requirements satisfied.

## I — Internal micro-state machine
1.1 receive → 1.2 preserve raw → 1.3 objective → 1.4 operation type → 1.5..1.12 hints → 1.13 constraints → 1.14 references → 1.15 uncertainties → 1.16 contradictions → 1.17 mutation sensitivity → 1.18 context → 1.19 sufficiency → 1.20 terminal result.

## J — Transformation / decision algorithm
1. Parse/validate bounded input.
2. Determine required authority observations.
3. Refuse guesses for missing facts.
4. Apply contract-local invariants.
5. Produce domain status.
6. Produce engine disposition.
7. For mutations only, produce EffectPlan; never mutate from evaluation code directly.
8. Emit bounded output and evidence references.

## K — Determinism
- **Class:** `PURE_TRANSFORM` with execution semantics `EVALUATE_ONLY`.
- Pure/read-only contracts are deterministic given identical normalized input and identical evidence snapshot.
- Observation-dependent contracts bind result to evidence freshness/revisions.

## L — Invariants
NO_MUTATION; NO_TASK_CREATION; NO_PERMISSION_INFERENCE; NO_REPOSITORY_RESOLUTION; UNKNOWN_REMAINS_UNKNOWN.

Plus all global GWC invariants.

## M — Action model
- **Allowed action kinds:** READ / DERIVE
- **Forbidden:** hidden mutation, authority bypass, stale evidence reuse, arbitrary shell fallback, unbounded projection.

## N — Current execution owner vs target owner
CURRENT: existing subsystem(s) listed in AM. TARGET: same owning authority behind a GWC adapter/contract wrapper.

## O — Capability / authorization model
For any mutation:
`callable ∧ authorized ∧ safeNow ∧ preconditionsSatisfied ∧ concurrencySatisfied = mayExecute`.
A present tool is never permission by itself.

## P — Lock model
Aucun.

## Q — Concurrency model
Independent tasks may proceed in parallel when dependency/resource/lock scopes do not conflict.
Local blockers remain local.
Operational Memory process-local serialization is not treated as distributed locking.

## R — Output contract
- **Canonical output:** `IntentContext`
- Bounded, typed, provenance-aware.
- No secret/raw credential projection.
- Consumers must not over-interpret this output beyond its declared semantics.

## S — Terminal statuses
`INTENT_CAPTURED | INTENT_INCOMPLETE | INTENT_AMBIGUOUS | INTENT_REJECTED`

## T — Terminality formula
Success requires all contract-owned postconditions to be proven from current required evidence.
Missing/stale/conflicting evidence maps to fail-closed statuses, never implicit success.

## U — Reason codes
Contract-specific reason codes must be stable, enumerable, bounded and machine-testable.
Every failure/blocking reason must identify whether it is recoverable by reobserve, reconcile, wait or explicit change.

## V — Fail-closed model
Missing/stale/conflicting required evidence never defaults to success or permission. UNKNOWN remains UNKNOWN.

## W — Evidence model
Aucune autorité externe; provenance de la requête uniquement.

## X — Freshness / staleness
Evidence is bound to relevant `observedAt`, SHA, stateVersion and/or revisions.
A semantic state change invalidates dependent evidence when its contract declares such dependency.

## Y — Attestation model
EPHEMERAL_RESULT_ONLY by default; promote to bounded durable reference only where an existing authority requires durable proof.

## Z — Persistence model
No new GWC store. Persist only through the existing owning authority when the contract is a RECORD/MUTATE step.

## AA — Secret / privacy model
Never persist tokens, resume secrets, raw authorization headers, arbitrary transport IDs, `.env` material or unbounded prompt bodies.
Use digests/bounded projections where persistence is necessary.

## AB — Replay model
`PURE`

## AC — Recovery model
Recovery starts by observing the owning authority.
A mutation is replayed only when its replay class explicitly allows it and the recovery anchor proves it has not already happened.

## AD — Security / threat model
Prevent authority confusion, cross-session/repo/project leakage, stale evidence reuse, duplicate mutation, secret leakage and false attestation.

## AE — Observability
Emit bounded start/result/failure/reason-code observations where useful.
Observability is not authority.

## AF — Interface contract with predecessors
Consumes only the predecessor fields whose semantics are explicitly declared.
Revalidates any field whose freshness/ownership requires it.

## AG — Interface contract with successors
Exports `IntentContext` with explicit semantics; successor may not silently strengthen it.

## AH — Skip contract
No skip unless the graph contains a deterministic condition and proof source.
If skipped, the route and proof are observable.

## AI — Reobserve contract
Reobserve when required evidence is stale, unavailable-but-recoverable, or an external asynchronous condition may have progressed.

## AJ — Reconcile contract
Reconcile only when multiple authorities/state projections are inconsistent.
Reconcile is not the same as refreshing an observation.

## AK — Blocked behavior
Block only the affected Task/contract/resource scope unless an actual global invariant is violated.

## AL — Compensation / rollback
For pure/read-only contracts: not applicable.
For mutations: use existing rollback/compensation only where real; otherwise forward recovery by observation. Never pretend irreversible GitHub effects are rollbackable.

## AM — Existing system mapping
- **Current mapping:** No runtime IntentCapture contract on main; design exists.
- **Classification:** `NEW`
- Existing behavior is preserved and wrapped/generalized before new engines are introduced.

## AN — Current hardcodes / generalization
No target-specific hardcode allowed.

## AO — Future implementation slot
Implement behind a GWC contract module + adapter to existing authority. Exact file placement must follow repository architecture discovered at implementation baseline, not be invented prematurely.

## AP — Test contract
happy path; boundary; NONE/AMBIGUOUS/UNVERIFIED/STALE/CONFLICT as applicable; replay/recovery; security; non-regression; exact binding tests.

## AQ — Property / invariant tests
- Unknown evidence never becomes allow/success.
- Explicit predecessor semantics are preserved.
- No hidden mutation.
- Same normalized input + same evidence ⇒ same semantic result for deterministic profiles.
- Mutation contracts never execute without a valid EffectPlan.

## AR — Acceptance criteria
- Input/output schemas are bounded.
- Owning authorities are explicit.
- Fail-closed paths are tested.
- Replay/recovery behavior is defined.
- No new parallel authority.
- Existing non-regression suite remains green.

## AS — Open questions
OD-01 taille exacte rawIntent; OD-02 enum source; règles finales de normalisation.

## AT — Architectural findings
- Existing implementation class: `NEW`.
- Any discovered hardcode is treated as a generalization target, not silently removed.
- Any mismatch between CURRENT and TARGET is explicit.

## AU — Future Task Blueprint mapping
This contract is implemented by one or more governed implementation tasks from `GWC_IMPLEMENTATION_TASK_BLUEPRINTS_R1.md`; implementation dependencies follow the contract graph and authority dependencies rather than numeric GW order alone.

## AV — Execution semantics
`EVALUATE_ONLY`

## AW — Effect Plan
None.

## AX — Routing table
Primary predecessor: ENTRY. Primary successor: GW-02. Additional skip/reobserve/reconcile/recovery edges must be declared deterministically.

## AY — Recovery anchor
Read-only contracts: input/evidence snapshot bindings.
Mutation contracts: target reference + task/session + relevant branch/PR/SHA/revision/job ID.

## AZ — Reconstruction rule
On process restart, reconstruct from authoritative stores and observations; do not rely on previous assistant text or a GWC workflow-state database.

## BA — Autonomy behavior
AUTO_CONTINUE when exactly one legal route exists and required evidence is sufficient; WAIT_EXTERNAL/BLOCK_LOCAL/fail-closed otherwise.


---

# GW-02 — CONNECTION_BOOTSTRAP

## A — Identity
- **Contract ID:** `GW-02`
- **Canonical name:** `CONNECTION_BOOTSTRAP`
- **Family:** `B — Identity and Target Resolution`
- **Contract version:** `1` (conceptual baseline)
- **Profile(s):** `BOOTSTRAP_OBSERVER`
- **Architectural status:** `REUSE/GENERALIZE`
- **Integration class:** `REUSE/GENERALIZE`

## B — Purpose
Formaliser la responsabilité `CONNECTION_BOOTSTRAP` comme contrat borné, versionné et composable, sans dupliquer les autorités existantes.

**Non-responsibilities:** does not steal ownership from Task Queue, Session, Lock Service, Live State, GitRegistry, GitHub, deploy/runtime or other downstream contracts.

## C — Position in global system
- **Logical predecessor(s):** GW-01
- **Logical successor(s):** GW-03 or GW-16 depending existing session binding
- **Re-entry:** allowed when authoritative evidence shows this contract’s postcondition is not yet proven.
- **Skip:** only when an explicit deterministic `SKIPPABLE_IF` condition exists.
- **Reobserve/Reconcile:** first-class graph edges, never implicit retries.

## D — Chronological role
- **Transport chronology:** may differ from GW numeric order.
- **Functional chronology:** `GW-02` owns only `CONNECTION_BOOTSTRAP` responsibility.
- **Runtime chronology:** resolved by Workflow Graph, not `stepId + 1`.

## E — Contract input
Sorties prouvées des prédécesseurs applicables, contexte cible borné, références d’autorité nécessaires à `CONNECTION_BOOTSTRAP`.

Input fields must be bounded, provenance-aware and typed as hint/claim/evidence/fact; raw secret material is forbidden unless explicitly unavoidable and ephemeral.

## F — Information semantics
Every field is classified as one of:
`RAW_INPUT | HINT | CLAIM | OBSERVATION | EVIDENCE | DERIVED_FACT | AUTHORITATIVE_FACT | DECISION | ATTESTATION`.

No contract upgrades a `HINT` to an authoritative fact without the owning evidence.

## G — Authorities
Autorités existantes correspondant aux faits consommés; aucune nouvelle source de vérité créée par GWC.

**Forbidden authority pattern:** no arbitrary Markdown, prompt text, tool availability or remembered state may override the actual owning authority.

## H — Preconditions
- Structural input valid and bounded.
- Required authorities reachable or explicitly `UNAVAILABLE`.
- Required freshness/revision/SHA bindings available.
- No contradictory prerequisite state.
- For mutations: session/receipt/task/locks/governance requirements satisfied.

## I — Internal micro-state machine
validate bounded input → collect/validate required evidence → evaluate local invariants → derive domain status → derive routing disposition → emit bounded output.

## J — Transformation / decision algorithm
1. Parse/validate bounded input.
2. Determine required authority observations.
3. Refuse guesses for missing facts.
4. Apply contract-local invariants.
5. Produce domain status.
6. Produce engine disposition.
7. For mutations only, produce EffectPlan; never mutate from evaluation code directly.
8. Emit bounded output and evidence references.

## K — Determinism
- **Class:** `BOOTSTRAP_OBSERVER` with execution semantics `OBSERVE_AND_EVALUATE`.
- Pure/read-only contracts are deterministic given identical normalized input and identical evidence snapshot.
- Observation-dependent contracts bind result to evidence freshness/revisions.

## L — Invariants
Global GWC invariants + no over-interpretation of predecessor output + bounded data + fail closed on missing evidence.

Plus all global GWC invariants.

## M — Action model
- **Allowed action kinds:** READ / DERIVE
- **Forbidden:** hidden mutation, authority bypass, stale evidence reuse, arbitrary shell fallback, unbounded projection.

## N — Current execution owner vs target owner
CURRENT: existing subsystem(s) listed in AM. TARGET: same owning authority behind a GWC adapter/contract wrapper.

## O — Capability / authorization model
For any mutation:
`callable ∧ authorized ∧ safeNow ∧ preconditionsSatisfied ∧ concurrencySatisfied = mayExecute`.
A present tool is never permission by itself.

## P — Lock model
No new lock unless EffectPlan declares a collision domain; consume existing Lock Service.

## Q — Concurrency model
Independent tasks may proceed in parallel when dependency/resource/lock scopes do not conflict.
Local blockers remain local.
Operational Memory process-local serialization is not treated as distributed locking.

## R — Output contract
- **Canonical output:** `ConnectionBootstrapResult`
- Bounded, typed, provenance-aware.
- No secret/raw credential projection.
- Consumers must not over-interpret this output beyond its declared semantics.

## S — Terminal statuses
`SUCCESS | NONE | AMBIGUOUS | UNVERIFIED | BLOCKED | CONFLICT | STALE (subset applicable)`

## T — Terminality formula
Success requires all contract-owned postconditions to be proven from current required evidence.
Missing/stale/conflicting evidence maps to fail-closed statuses, never implicit success.

## U — Reason codes
Contract-specific reason codes must be stable, enumerable, bounded and machine-testable.
Every failure/blocking reason must identify whether it is recoverable by reobserve, reconcile, wait or explicit change.

## V — Fail-closed model
Missing/stale/conflicting required evidence never defaults to success or permission. UNKNOWN remains UNKNOWN.

## W — Evidence model
EvidenceEnvelope(s) from the owning authorities with freshness, provenance and relevant SHA/revision binding.

## X — Freshness / staleness
Evidence is bound to relevant `observedAt`, SHA, stateVersion and/or revisions.
A semantic state change invalidates dependent evidence when its contract declares such dependency.

## Y — Attestation model
EPHEMERAL_RESULT_ONLY by default; promote to bounded durable reference only where an existing authority requires durable proof.

## Z — Persistence model
No new GWC store. Persist only through the existing owning authority when the contract is a RECORD/MUTATE step.

## AA — Secret / privacy model
Never persist tokens, resume secrets, raw authorization headers, arbitrary transport IDs, `.env` material or unbounded prompt bodies.
Use digests/bounded projections where persistence is necessary.

## AB — Replay model
`READ_ONLY`

## AC — Recovery model
Recovery starts by observing the owning authority.
A mutation is replayed only when its replay class explicitly allows it and the recovery anchor proves it has not already happened.

## AD — Security / threat model
Prevent authority confusion, cross-session/repo/project leakage, stale evidence reuse, duplicate mutation, secret leakage and false attestation.

## AE — Observability
Emit bounded start/result/failure/reason-code observations where useful.
Observability is not authority.

## AF — Interface contract with predecessors
Consumes only the predecessor fields whose semantics are explicitly declared.
Revalidates any field whose freshness/ownership requires it.

## AG — Interface contract with successors
Exports `ConnectionBootstrapResult` with explicit semantics; successor may not silently strengthen it.

## AH — Skip contract
No skip unless the graph contains a deterministic condition and proof source.
If skipped, the route and proof are observable.

## AI — Reobserve contract
Reobserve when required evidence is stale, unavailable-but-recoverable, or an external asynchronous condition may have progressed.

## AJ — Reconcile contract
Reconcile only when multiple authorities/state projections are inconsistent.
Reconcile is not the same as refreshing an observation.

## AK — Blocked behavior
Block only the affected Task/contract/resource scope unless an actual global invariant is violated.

## AL — Compensation / rollback
For pure/read-only contracts: not applicable.
For mutations: use existing rollback/compensation only where real; otherwise forward recovery by observation. Never pretend irreversible GitHub effects are rollbackable.

## AM — Existing system mapping
- **Current mapping:** src/server.ts bootstrap/auto-resume transport path.
- **Classification:** `REUSE/GENERALIZE`
- Existing behavior is preserved and wrapped/generalized before new engines are introduced.

## AN — Current hardcodes / generalization
MCP/S1/repository literals and single-repository assumptions must move to TargetContext/configuration where applicable; preserve historical MCP behavior backward-compatibly.

## AO — Future implementation slot
Implement behind a GWC contract module + adapter to existing authority. Exact file placement must follow repository architecture discovered at implementation baseline, not be invented prematurely.

## AP — Test contract
happy path; boundary; NONE/AMBIGUOUS/UNVERIFIED/STALE/CONFLICT as applicable; replay/recovery; security; non-regression; exact binding tests.

## AQ — Property / invariant tests
- Unknown evidence never becomes allow/success.
- Explicit predecessor semantics are preserved.
- No hidden mutation.
- Same normalized input + same evidence ⇒ same semantic result for deterministic profiles.
- Mutation contracts never execute without a valid EffectPlan.

## AR — Acceptance criteria
- Input/output schemas are bounded.
- Owning authorities are explicit.
- Fail-closed paths are tested.
- Replay/recovery behavior is defined.
- No new parallel authority.
- Existing non-regression suite remains green.

## AS — Open questions
No blocking open decision beyond profile-specific implementation details; unresolved choices must stay explicit.

## AT — Architectural findings
- Existing implementation class: `REUSE/GENERALIZE`.
- Any discovered hardcode is treated as a generalization target, not silently removed.
- Any mismatch between CURRENT and TARGET is explicit.

## AU — Future Task Blueprint mapping
This contract is implemented by one or more governed implementation tasks from `GWC_IMPLEMENTATION_TASK_BLUEPRINTS_R1.md`; implementation dependencies follow the contract graph and authority dependencies rather than numeric GW order alone.

## AV — Execution semantics
`OBSERVE_AND_EVALUATE`

## AW — Effect Plan
None.

## AX — Routing table
Primary predecessor: GW-01. Primary successor: GW-03 or GW-16 depending existing session binding. Additional skip/reobserve/reconcile/recovery edges must be declared deterministically.

## AY — Recovery anchor
Read-only contracts: input/evidence snapshot bindings.
Mutation contracts: target reference + task/session + relevant branch/PR/SHA/revision/job ID.

## AZ — Reconstruction rule
On process restart, reconstruct from authoritative stores and observations; do not rely on previous assistant text or a GWC workflow-state database.

## BA — Autonomy behavior
AUTO_CONTINUE when exactly one legal route exists and required evidence is sufficient; WAIT_EXTERNAL/BLOCK_LOCAL/fail-closed otherwise.


---

# GW-03 — CONNECTION_CONTEXT

## A — Identity
- **Contract ID:** `GW-03`
- **Canonical name:** `CONNECTION_CONTEXT`
- **Family:** `B — Identity and Target Resolution`
- **Contract version:** `1` (conceptual baseline)
- **Profile(s):** `CONTEXT_PROJECTION`
- **Architectural status:** `REUSE/GENERALIZE`
- **Integration class:** `REUSE/GENERALIZE`

## B — Purpose
Formaliser la responsabilité `CONNECTION_CONTEXT` comme contrat borné, versionné et composable, sans dupliquer les autorités existantes.

**Non-responsibilities:** does not steal ownership from Task Queue, Session, Lock Service, Live State, GitRegistry, GitHub, deploy/runtime or other downstream contracts.

## C — Position in global system
- **Logical predecessor(s):** GW-02 / GW-16
- **Logical successor(s):** GW-04
- **Re-entry:** allowed when authoritative evidence shows this contract’s postcondition is not yet proven.
- **Skip:** only when an explicit deterministic `SKIPPABLE_IF` condition exists.
- **Reobserve/Reconcile:** first-class graph edges, never implicit retries.

## D — Chronological role
- **Transport chronology:** may differ from GW numeric order.
- **Functional chronology:** `GW-03` owns only `CONNECTION_CONTEXT` responsibility.
- **Runtime chronology:** resolved by Workflow Graph, not `stepId + 1`.

## E — Contract input
Sorties prouvées des prédécesseurs applicables, contexte cible borné, références d’autorité nécessaires à `CONNECTION_CONTEXT`.

Input fields must be bounded, provenance-aware and typed as hint/claim/evidence/fact; raw secret material is forbidden unless explicitly unavoidable and ephemeral.

## F — Information semantics
Every field is classified as one of:
`RAW_INPUT | HINT | CLAIM | OBSERVATION | EVIDENCE | DERIVED_FACT | AUTHORITATIVE_FACT | DECISION | ATTESTATION`.

No contract upgrades a `HINT` to an authoritative fact without the owning evidence.

## G — Authorities
Autorités existantes correspondant aux faits consommés; aucune nouvelle source de vérité créée par GWC.

**Forbidden authority pattern:** no arbitrary Markdown, prompt text, tool availability or remembered state may override the actual owning authority.

## H — Preconditions
- Structural input valid and bounded.
- Required authorities reachable or explicitly `UNAVAILABLE`.
- Required freshness/revision/SHA bindings available.
- No contradictory prerequisite state.
- For mutations: session/receipt/task/locks/governance requirements satisfied.

## I — Internal micro-state machine
validate bounded input → collect/validate required evidence → evaluate local invariants → derive domain status → derive routing disposition → emit bounded output.

## J — Transformation / decision algorithm
1. Parse/validate bounded input.
2. Determine required authority observations.
3. Refuse guesses for missing facts.
4. Apply contract-local invariants.
5. Produce domain status.
6. Produce engine disposition.
7. For mutations only, produce EffectPlan; never mutate from evaluation code directly.
8. Emit bounded output and evidence references.

## K — Determinism
- **Class:** `CONTEXT_PROJECTION` with execution semantics `EVALUATE_ONLY / COMPOSED`.
- Pure/read-only contracts are deterministic given identical normalized input and identical evidence snapshot.
- Observation-dependent contracts bind result to evidence freshness/revisions.

## L — Invariants
Global GWC invariants + no over-interpretation of predecessor output + bounded data + fail closed on missing evidence.

Plus all global GWC invariants.

## M — Action model
- **Allowed action kinds:** READ / DERIVE / RECORD bounded projection if existing authority owns it
- **Forbidden:** hidden mutation, authority bypass, stale evidence reuse, arbitrary shell fallback, unbounded projection.

## N — Current execution owner vs target owner
CURRENT: existing subsystem(s) listed in AM. TARGET: same owning authority behind a GWC adapter/contract wrapper.

## O — Capability / authorization model
For any mutation:
`callable ∧ authorized ∧ safeNow ∧ preconditionsSatisfied ∧ concurrencySatisfied = mayExecute`.
A present tool is never permission by itself.

## P — Lock model
No new lock unless EffectPlan declares a collision domain; consume existing Lock Service.

## Q — Concurrency model
Independent tasks may proceed in parallel when dependency/resource/lock scopes do not conflict.
Local blockers remain local.
Operational Memory process-local serialization is not treated as distributed locking.

## R — Output contract
- **Canonical output:** `ConnectionContext`
- Bounded, typed, provenance-aware.
- No secret/raw credential projection.
- Consumers must not over-interpret this output beyond its declared semantics.

## S — Terminal statuses
`SUCCESS | NONE | AMBIGUOUS | UNVERIFIED | BLOCKED | CONFLICT | STALE (subset applicable)`

## T — Terminality formula
Success requires all contract-owned postconditions to be proven from current required evidence.
Missing/stale/conflicting evidence maps to fail-closed statuses, never implicit success.

## U — Reason codes
Contract-specific reason codes must be stable, enumerable, bounded and machine-testable.
Every failure/blocking reason must identify whether it is recoverable by reobserve, reconcile, wait or explicit change.

## V — Fail-closed model
Missing/stale/conflicting required evidence never defaults to success or permission. UNKNOWN remains UNKNOWN.

## W — Evidence model
EvidenceEnvelope(s) from the owning authorities with freshness, provenance and relevant SHA/revision binding.

## X — Freshness / staleness
Evidence is bound to relevant `observedAt`, SHA, stateVersion and/or revisions.
A semantic state change invalidates dependent evidence when its contract declares such dependency.

## Y — Attestation model
EPHEMERAL_RESULT_ONLY by default; promote to bounded durable reference only where an existing authority requires durable proof.

## Z — Persistence model
No new GWC store. Persist only through the existing owning authority when the contract is a RECORD/MUTATE step.

## AA — Secret / privacy model
Never persist tokens, resume secrets, raw authorization headers, arbitrary transport IDs, `.env` material or unbounded prompt bodies.
Use digests/bounded projections where persistence is necessary.

## AB — Replay model
`READ_ONLY`

## AC — Recovery model
Recovery starts by observing the owning authority.
A mutation is replayed only when its replay class explicitly allows it and the recovery anchor proves it has not already happened.

## AD — Security / threat model
Prevent authority confusion, cross-session/repo/project leakage, stale evidence reuse, duplicate mutation, secret leakage and false attestation.

## AE — Observability
Emit bounded start/result/failure/reason-code observations where useful.
Observability is not authority.

## AF — Interface contract with predecessors
Consumes only the predecessor fields whose semantics are explicitly declared.
Revalidates any field whose freshness/ownership requires it.

## AG — Interface contract with successors
Exports `ConnectionContext` with explicit semantics; successor may not silently strengthen it.

## AH — Skip contract
No skip unless the graph contains a deterministic condition and proof source.
If skipped, the route and proof are observable.

## AI — Reobserve contract
Reobserve when required evidence is stale, unavailable-but-recoverable, or an external asynchronous condition may have progressed.

## AJ — Reconcile contract
Reconcile only when multiple authorities/state projections are inconsistent.
Reconcile is not the same as refreshing an observation.

## AK — Blocked behavior
Block only the affected Task/contract/resource scope unless an actual global invariant is violated.

## AL — Compensation / rollback
For pure/read-only contracts: not applicable.
For mutations: use existing rollback/compensation only where real; otherwise forward recovery by observation. Never pretend irreversible GitHub effects are rollbackable.

## AM — Existing system mapping
- **Current mapping:** src/operationalMemory/connectionContext.ts + session records.
- **Classification:** `REUSE/GENERALIZE`
- Existing behavior is preserved and wrapped/generalized before new engines are introduced.

## AN — Current hardcodes / generalization
MCP/S1/repository literals and single-repository assumptions must move to TargetContext/configuration where applicable; preserve historical MCP behavior backward-compatibly.

## AO — Future implementation slot
Implement behind a GWC contract module + adapter to existing authority. Exact file placement must follow repository architecture discovered at implementation baseline, not be invented prematurely.

## AP — Test contract
happy path; boundary; NONE/AMBIGUOUS/UNVERIFIED/STALE/CONFLICT as applicable; replay/recovery; security; non-regression; exact binding tests.

## AQ — Property / invariant tests
- Unknown evidence never becomes allow/success.
- Explicit predecessor semantics are preserved.
- No hidden mutation.
- Same normalized input + same evidence ⇒ same semantic result for deterministic profiles.
- Mutation contracts never execute without a valid EffectPlan.

## AR — Acceptance criteria
- Input/output schemas are bounded.
- Owning authorities are explicit.
- Fail-closed paths are tested.
- Replay/recovery behavior is defined.
- No new parallel authority.
- Existing non-regression suite remains green.

## AS — Open questions
No blocking open decision beyond profile-specific implementation details; unresolved choices must stay explicit.

## AT — Architectural findings
- Existing implementation class: `REUSE/GENERALIZE`.
- Any discovered hardcode is treated as a generalization target, not silently removed.
- Any mismatch between CURRENT and TARGET is explicit.

## AU — Future Task Blueprint mapping
This contract is implemented by one or more governed implementation tasks from `GWC_IMPLEMENTATION_TASK_BLUEPRINTS_R1.md`; implementation dependencies follow the contract graph and authority dependencies rather than numeric GW order alone.

## AV — Execution semantics
`EVALUATE_ONLY / COMPOSED`

## AW — Effect Plan
None.

## AX — Routing table
Primary predecessor: GW-02 / GW-16. Primary successor: GW-04. Additional skip/reobserve/reconcile/recovery edges must be declared deterministically.

## AY — Recovery anchor
Read-only contracts: input/evidence snapshot bindings.
Mutation contracts: target reference + task/session + relevant branch/PR/SHA/revision/job ID.

## AZ — Reconstruction rule
On process restart, reconstruct from authoritative stores and observations; do not rely on previous assistant text or a GWC workflow-state database.

## BA — Autonomy behavior
AUTO_CONTINUE when exactly one legal route exists and required evidence is sufficient; WAIT_EXTERNAL/BLOCK_LOCAL/fail-closed otherwise.


---

# GW-04 — GITHUB_IDENTITY_RESOLUTION

## A — Identity
- **Contract ID:** `GW-04`
- **Canonical name:** `GITHUB_IDENTITY_RESOLUTION`
- **Family:** `B — Identity and Target Resolution`
- **Contract version:** `1` (conceptual baseline)
- **Profile(s):** `RESOLVER`
- **Architectural status:** `REUSE`
- **Integration class:** `REUSE`

## B — Purpose
Formaliser la responsabilité `GITHUB_IDENTITY_RESOLUTION` comme contrat borné, versionné et composable, sans dupliquer les autorités existantes.

**Non-responsibilities:** does not steal ownership from Task Queue, Session, Lock Service, Live State, GitRegistry, GitHub, deploy/runtime or other downstream contracts.

## C — Position in global system
- **Logical predecessor(s):** GW-03
- **Logical successor(s):** GW-05
- **Re-entry:** allowed when authoritative evidence shows this contract’s postcondition is not yet proven.
- **Skip:** only when an explicit deterministic `SKIPPABLE_IF` condition exists.
- **Reobserve/Reconcile:** first-class graph edges, never implicit retries.

## D — Chronological role
- **Transport chronology:** may differ from GW numeric order.
- **Functional chronology:** `GW-04` owns only `GITHUB_IDENTITY_RESOLUTION` responsibility.
- **Runtime chronology:** resolved by Workflow Graph, not `stepId + 1`.

## E — Contract input
Sorties prouvées des prédécesseurs applicables, contexte cible borné, références d’autorité nécessaires à `GITHUB_IDENTITY_RESOLUTION`.

Input fields must be bounded, provenance-aware and typed as hint/claim/evidence/fact; raw secret material is forbidden unless explicitly unavoidable and ephemeral.

## F — Information semantics
Every field is classified as one of:
`RAW_INPUT | HINT | CLAIM | OBSERVATION | EVIDENCE | DERIVED_FACT | AUTHORITATIVE_FACT | DECISION | ATTESTATION`.

No contract upgrades a `HINT` to an authoritative fact without the owning evidence.

## G — Authorities
Autorités existantes correspondant aux faits consommés; aucune nouvelle source de vérité créée par GWC.

**Forbidden authority pattern:** no arbitrary Markdown, prompt text, tool availability or remembered state may override the actual owning authority.

## H — Preconditions
- Structural input valid and bounded.
- Required authorities reachable or explicitly `UNAVAILABLE`.
- Required freshness/revision/SHA bindings available.
- No contradictory prerequisite state.
- For mutations: session/receipt/task/locks/governance requirements satisfied.

## I — Internal micro-state machine
validate bounded input → collect/validate required evidence → evaluate local invariants → derive domain status → derive routing disposition → emit bounded output.

## J — Transformation / decision algorithm
1. Parse/validate bounded input.
2. Determine required authority observations.
3. Refuse guesses for missing facts.
4. Apply contract-local invariants.
5. Produce domain status.
6. Produce engine disposition.
7. For mutations only, produce EffectPlan; never mutate from evaluation code directly.
8. Emit bounded output and evidence references.

## K — Determinism
- **Class:** `RESOLVER` with execution semantics `OBSERVE_AND_EVALUATE`.
- Pure/read-only contracts are deterministic given identical normalized input and identical evidence snapshot.
- Observation-dependent contracts bind result to evidence freshness/revisions.

## L — Invariants
Global GWC invariants + no over-interpretation of predecessor output + bounded data + fail closed on missing evidence.

Plus all global GWC invariants.

## M — Action model
- **Allowed action kinds:** READ / DERIVE
- **Forbidden:** hidden mutation, authority bypass, stale evidence reuse, arbitrary shell fallback, unbounded projection.

## N — Current execution owner vs target owner
CURRENT: existing subsystem(s) listed in AM. TARGET: same owning authority behind a GWC adapter/contract wrapper.

## O — Capability / authorization model
For any mutation:
`callable ∧ authorized ∧ safeNow ∧ preconditionsSatisfied ∧ concurrencySatisfied = mayExecute`.
A present tool is never permission by itself.

## P — Lock model
No new lock unless EffectPlan declares a collision domain; consume existing Lock Service.

## Q — Concurrency model
Independent tasks may proceed in parallel when dependency/resource/lock scopes do not conflict.
Local blockers remain local.
Operational Memory process-local serialization is not treated as distributed locking.

## R — Output contract
- **Canonical output:** `GithubIdentityResolution`
- Bounded, typed, provenance-aware.
- No secret/raw credential projection.
- Consumers must not over-interpret this output beyond its declared semantics.

## S — Terminal statuses
`SUCCESS | NONE | AMBIGUOUS | UNVERIFIED | BLOCKED | CONFLICT | STALE (subset applicable)`

## T — Terminality formula
Success requires all contract-owned postconditions to be proven from current required evidence.
Missing/stale/conflicting evidence maps to fail-closed statuses, never implicit success.

## U — Reason codes
Contract-specific reason codes must be stable, enumerable, bounded and machine-testable.
Every failure/blocking reason must identify whether it is recoverable by reobserve, reconcile, wait or explicit change.

## V — Fail-closed model
Missing/stale/conflicting required evidence never defaults to success or permission. UNKNOWN remains UNKNOWN.

## W — Evidence model
EvidenceEnvelope(s) from the owning authorities with freshness, provenance and relevant SHA/revision binding.

## X — Freshness / staleness
Evidence is bound to relevant `observedAt`, SHA, stateVersion and/or revisions.
A semantic state change invalidates dependent evidence when its contract declares such dependency.

## Y — Attestation model
EPHEMERAL_RESULT_ONLY by default; promote to bounded durable reference only where an existing authority requires durable proof.

## Z — Persistence model
No new GWC store. Persist only through the existing owning authority when the contract is a RECORD/MUTATE step.

## AA — Secret / privacy model
Never persist tokens, resume secrets, raw authorization headers, arbitrary transport IDs, `.env` material or unbounded prompt bodies.
Use digests/bounded projections where persistence is necessary.

## AB — Replay model
`READ_ONLY`

## AC — Recovery model
Recovery starts by observing the owning authority.
A mutation is replayed only when its replay class explicitly allows it and the recovery anchor proves it has not already happened.

## AD — Security / threat model
Prevent authority confusion, cross-session/repo/project leakage, stale evidence reuse, duplicate mutation, secret leakage and false attestation.

## AE — Observability
Emit bounded start/result/failure/reason-code observations where useful.
Observability is not authority.

## AF — Interface contract with predecessors
Consumes only the predecessor fields whose semantics are explicitly declared.
Revalidates any field whose freshness/ownership requires it.

## AG — Interface contract with successors
Exports `GithubIdentityResolution` with explicit semantics; successor may not silently strengthen it.

## AH — Skip contract
No skip unless the graph contains a deterministic condition and proof source.
If skipped, the route and proof are observable.

## AI — Reobserve contract
Reobserve when required evidence is stale, unavailable-but-recoverable, or an external asynchronous condition may have progressed.

## AJ — Reconcile contract
Reconcile only when multiple authorities/state projections are inconsistent.
Reconcile is not the same as refreshing an observation.

## AK — Blocked behavior
Block only the affected Task/contract/resource scope unless an actual global invariant is violated.

## AL — Compensation / rollback
For pure/read-only contracts: not applicable.
For mutations: use existing rollback/compensation only where real; otherwise forward recovery by observation. Never pretend irreversible GitHub effects are rollbackable.

## AM — Existing system mapping
- **Current mapping:** src/github/identityResolution.ts.
- **Classification:** `REUSE`
- Existing behavior is preserved and wrapped/generalized before new engines are introduced.

## AN — Current hardcodes / generalization
MCP/S1/repository literals and single-repository assumptions must move to TargetContext/configuration where applicable; preserve historical MCP behavior backward-compatibly.

## AO — Future implementation slot
Implement behind a GWC contract module + adapter to existing authority. Exact file placement must follow repository architecture discovered at implementation baseline, not be invented prematurely.

## AP — Test contract
happy path; boundary; NONE/AMBIGUOUS/UNVERIFIED/STALE/CONFLICT as applicable; replay/recovery; security; non-regression; exact binding tests.

## AQ — Property / invariant tests
- Unknown evidence never becomes allow/success.
- Explicit predecessor semantics are preserved.
- No hidden mutation.
- Same normalized input + same evidence ⇒ same semantic result for deterministic profiles.
- Mutation contracts never execute without a valid EffectPlan.

## AR — Acceptance criteria
- Input/output schemas are bounded.
- Owning authorities are explicit.
- Fail-closed paths are tested.
- Replay/recovery behavior is defined.
- No new parallel authority.
- Existing non-regression suite remains green.

## AS — Open questions
No blocking open decision beyond profile-specific implementation details; unresolved choices must stay explicit.

## AT — Architectural findings
- Existing implementation class: `REUSE`.
- Any discovered hardcode is treated as a generalization target, not silently removed.
- Any mismatch between CURRENT and TARGET is explicit.

## AU — Future Task Blueprint mapping
This contract is implemented by one or more governed implementation tasks from `GWC_IMPLEMENTATION_TASK_BLUEPRINTS_R1.md`; implementation dependencies follow the contract graph and authority dependencies rather than numeric GW order alone.

## AV — Execution semantics
`OBSERVE_AND_EVALUATE`

## AW — Effect Plan
None.

## AX — Routing table
Primary predecessor: GW-03. Primary successor: GW-05. Additional skip/reobserve/reconcile/recovery edges must be declared deterministically.

## AY — Recovery anchor
Read-only contracts: input/evidence snapshot bindings.
Mutation contracts: target reference + task/session + relevant branch/PR/SHA/revision/job ID.

## AZ — Reconstruction rule
On process restart, reconstruct from authoritative stores and observations; do not rely on previous assistant text or a GWC workflow-state database.

## BA — Autonomy behavior
AUTO_CONTINUE when exactly one legal route exists and required evidence is sufficient; WAIT_EXTERNAL/BLOCK_LOCAL/fail-closed otherwise.


---

# GW-05 — REPOSITORY_RESOLUTION

## A — Identity
- **Contract ID:** `GW-05`
- **Canonical name:** `REPOSITORY_RESOLUTION`
- **Family:** `B — Identity and Target Resolution`
- **Contract version:** `1` (conceptual baseline)
- **Profile(s):** `RESOLVER`
- **Architectural status:** `REUSE/EXTEND`
- **Integration class:** `REUSE/EXTEND`

## B — Purpose
Résoudre un repository GitHub prouvé sans transformer un hint en fait.

**Non-responsibilities:** does not steal ownership from Task Queue, Session, Lock Service, Live State, GitRegistry, GitHub, deploy/runtime or other downstream contracts.

## C — Position in global system
- **Logical predecessor(s):** GW-04
- **Logical successor(s):** GW-06; reobserve/reconcile on ambiguity
- **Re-entry:** allowed when authoritative evidence shows this contract’s postcondition is not yet proven.
- **Skip:** only when an explicit deterministic `SKIPPABLE_IF` condition exists.
- **Reobserve/Reconcile:** first-class graph edges, never implicit retries.

## D — Chronological role
- **Transport chronology:** may differ from GW numeric order.
- **Functional chronology:** `GW-05` owns only `REPOSITORY_RESOLUTION` responsibility.
- **Runtime chronology:** resolved by Workflow Graph, not `stepId + 1`.

## E — Contract input
GW-04 identity resolution; repositoryHint éventuel; GitRegistry candidates; GitHub repository observation.

Input fields must be bounded, provenance-aware and typed as hint/claim/evidence/fact; raw secret material is forbidden unless explicitly unavoidable and ephemeral.

## F — Information semantics
Every field is classified as one of:
`RAW_INPUT | HINT | CLAIM | OBSERVATION | EVIDENCE | DERIVED_FACT | AUTHORITATIVE_FACT | DECISION | ATTESTATION`.

No contract upgrades a `HINT` to an authoritative fact without the owning evidence.

## G — Authorities
GitHub pour l’identité du repository; GitRegistry pour les candidats/mappings.

**Forbidden authority pattern:** no arbitrary Markdown, prompt text, tool availability or remembered state may override the actual owning authority.

## H — Preconditions
- Structural input valid and bounded.
- Required authorities reachable or explicitly `UNAVAILABLE`.
- Required freshness/revision/SHA bindings available.
- No contradictory prerequisite state.
- For mutations: session/receipt/task/locks/governance requirements satisfied.

## I — Internal micro-state machine
validate identity → derive candidate source → normalize → bound/dedupe → verify account context → observe GitHub → check freshness/coherence → cardinality → resolution.

## J — Transformation / decision algorithm
1. Parse/validate bounded input.
2. Determine required authority observations.
3. Refuse guesses for missing facts.
4. Apply contract-local invariants.
5. Produce domain status.
6. Produce engine disposition.
7. For mutations only, produce EffectPlan; never mutate from evaluation code directly.
8. Emit bounded output and evidence references.

## K — Determinism
- **Class:** `RESOLVER` with execution semantics `OBSERVE_AND_EVALUATE`.
- Pure/read-only contracts are deterministic given identical normalized input and identical evidence snapshot.
- Observation-dependent contracts bind result to evidence freshness/revisions.

## L — Invariants
repositoryHint != repositoryId; no permission from identity; bounded candidates; freshness explicit.

Plus all global GWC invariants.

## M — Action model
- **Allowed action kinds:** READ / DERIVE
- **Forbidden:** hidden mutation, authority bypass, stale evidence reuse, arbitrary shell fallback, unbounded projection.

## N — Current execution owner vs target owner
CURRENT: existing subsystem(s) listed in AM. TARGET: same owning authority behind a GWC adapter/contract wrapper.

## O — Capability / authorization model
For any mutation:
`callable ∧ authorized ∧ safeNow ∧ preconditionsSatisfied ∧ concurrencySatisfied = mayExecute`.
A present tool is never permission by itself.

## P — Lock model
Aucun.

## Q — Concurrency model
Independent tasks may proceed in parallel when dependency/resource/lock scopes do not conflict.
Local blockers remain local.
Operational Memory process-local serialization is not treated as distributed locking.

## R — Output contract
- **Canonical output:** `RepositoryResolution`
- Bounded, typed, provenance-aware.
- No secret/raw credential projection.
- Consumers must not over-interpret this output beyond its declared semantics.

## S — Terminal statuses
`RESOLVED | NONE | AMBIGUOUS | UNVERIFIED`

## T — Terminality formula
Success requires all contract-owned postconditions to be proven from current required evidence.
Missing/stale/conflicting evidence maps to fail-closed statuses, never implicit success.

## U — Reason codes
Contract-specific reason codes must be stable, enumerable, bounded and machine-testable.
Every failure/blocking reason must identify whether it is recoverable by reobserve, reconcile, wait or explicit change.

## V — Fail-closed model
Missing/stale/conflicting required evidence never defaults to success or permission. UNKNOWN remains UNKNOWN.

## W — Evidence model
GitHub repository observation + registry digest/provenance.

## X — Freshness / staleness
Evidence is bound to relevant `observedAt`, SHA, stateVersion and/or revisions.
A semantic state change invalidates dependent evidence when its contract declares such dependency.

## Y — Attestation model
EPHEMERAL_RESULT_ONLY by default; promote to bounded durable reference only where an existing authority requires durable proof.

## Z — Persistence model
No new GWC store. Persist only through the existing owning authority when the contract is a RECORD/MUTATE step.

## AA — Secret / privacy model
Never persist tokens, resume secrets, raw authorization headers, arbitrary transport IDs, `.env` material or unbounded prompt bodies.
Use digests/bounded projections where persistence is necessary.

## AB — Replay model
`READ_ONLY`

## AC — Recovery model
Recovery starts by observing the owning authority.
A mutation is replayed only when its replay class explicitly allows it and the recovery anchor proves it has not already happened.

## AD — Security / threat model
Prevent authority confusion, cross-session/repo/project leakage, stale evidence reuse, duplicate mutation, secret leakage and false attestation.

## AE — Observability
Emit bounded start/result/failure/reason-code observations where useful.
Observability is not authority.

## AF — Interface contract with predecessors
Consumes only the predecessor fields whose semantics are explicitly declared.
Revalidates any field whose freshness/ownership requires it.

## AG — Interface contract with successors
Exports `RepositoryResolution` with explicit semantics; successor may not silently strengthen it.

## AH — Skip contract
No skip unless the graph contains a deterministic condition and proof source.
If skipped, the route and proof are observable.

## AI — Reobserve contract
Reobserve when required evidence is stale, unavailable-but-recoverable, or an external asynchronous condition may have progressed.

## AJ — Reconcile contract
Reconcile only when multiple authorities/state projections are inconsistent.
Reconcile is not the same as refreshing an observation.

## AK — Blocked behavior
Block only the affected Task/contract/resource scope unless an actual global invariant is violated.

## AL — Compensation / rollback
For pure/read-only contracts: not applicable.
For mutations: use existing rollback/compensation only where real; otherwise forward recovery by observation. Never pretend irreversible GitHub effects are rollbackable.

## AM — Existing system mapping
- **Current mapping:** src/github/repositoryResolution.ts.
- **Classification:** `REUSE/EXTEND`
- Existing behavior is preserved and wrapped/generalized before new engines are introduced.

## AN — Current hardcodes / generalization
MCP/S1/repository literals and single-repository assumptions must move to TargetContext/configuration where applicable; preserve historical MCP behavior backward-compatibly.

## AO — Future implementation slot
Implement behind a GWC contract module + adapter to existing authority. Exact file placement must follow repository architecture discovered at implementation baseline, not be invented prematurely.

## AP — Test contract
happy path; boundary; NONE/AMBIGUOUS/UNVERIFIED/STALE/CONFLICT as applicable; replay/recovery; security; non-regression; exact binding tests.

## AQ — Property / invariant tests
- Unknown evidence never becomes allow/success.
- Explicit predecessor semantics are preserved.
- No hidden mutation.
- Same normalized input + same evidence ⇒ same semantic result for deterministic profiles.
- Mutation contracts never execute without a valid EffectPlan.

## AR — Acceptance criteria
- Input/output schemas are bounded.
- Owning authorities are explicit.
- Fail-closed paths are tested.
- Replay/recovery behavior is defined.
- No new parallel authority.
- Existing non-regression suite remains green.

## AS — Open questions
Extension B3: autoriser plusieurs repositories candidats convergeant vers le même projet sans forcer un faux unique repository.

## AT — Architectural findings
- Existing implementation class: `REUSE/EXTEND`.
- Any discovered hardcode is treated as a generalization target, not silently removed.
- Any mismatch between CURRENT and TARGET is explicit.

## AU — Future Task Blueprint mapping
This contract is implemented by one or more governed implementation tasks from `GWC_IMPLEMENTATION_TASK_BLUEPRINTS_R1.md`; implementation dependencies follow the contract graph and authority dependencies rather than numeric GW order alone.

## AV — Execution semantics
`OBSERVE_AND_EVALUATE`

## AW — Effect Plan
None.

## AX — Routing table
Primary predecessor: GW-04. Primary successor: GW-06; reobserve/reconcile on ambiguity. Additional skip/reobserve/reconcile/recovery edges must be declared deterministically.

## AY — Recovery anchor
Read-only contracts: input/evidence snapshot bindings.
Mutation contracts: target reference + task/session + relevant branch/PR/SHA/revision/job ID.

## AZ — Reconstruction rule
On process restart, reconstruct from authoritative stores and observations; do not rely on previous assistant text or a GWC workflow-state database.

## BA — Autonomy behavior
AUTO_CONTINUE when exactly one legal route exists and required evidence is sufficient; WAIT_EXTERNAL/BLOCK_LOCAL/fail-closed otherwise.


---

# GW-06 — PROJECT_RESOLUTION

## A — Identity
- **Contract ID:** `GW-06`
- **Canonical name:** `PROJECT_RESOLUTION`
- **Family:** `B — Identity and Target Resolution`
- **Contract version:** `1` (conceptual baseline)
- **Profile(s):** `RESOLVER`
- **Architectural status:** `REUSE/EXTEND`
- **Integration class:** `REUSE/EXTEND`

## B — Purpose
Résoudre le projet logique et préserver ses composants repository, y compris multi-repo.

**Non-responsibilities:** does not steal ownership from Task Queue, Session, Lock Service, Live State, GitRegistry, GitHub, deploy/runtime or other downstream contracts.

## C — Position in global system
- **Logical predecessor(s):** GW-05 / projectHint path
- **Logical successor(s):** GW-07
- **Re-entry:** allowed when authoritative evidence shows this contract’s postcondition is not yet proven.
- **Skip:** only when an explicit deterministic `SKIPPABLE_IF` condition exists.
- **Reobserve/Reconcile:** first-class graph edges, never implicit retries.

## D — Chronological role
- **Transport chronology:** may differ from GW numeric order.
- **Functional chronology:** `GW-06` owns only `PROJECT_RESOLUTION` responsibility.
- **Runtime chronology:** resolved by Workflow Graph, not `stepId + 1`.

## E — Contract input
RepositoryResolution(s), projectHint éventuel, GitRegistry project evidence.

Input fields must be bounded, provenance-aware and typed as hint/claim/evidence/fact; raw secret material is forbidden unless explicitly unavoidable and ephemeral.

## F — Information semantics
Every field is classified as one of:
`RAW_INPUT | HINT | CLAIM | OBSERVATION | EVIDENCE | DERIVED_FACT | AUTHORITATIVE_FACT | DECISION | ATTESTATION`.

No contract upgrades a `HINT` to an authoritative fact without the owning evidence.

## G — Authorities
GitRegistry project/mapping evidence; repository resolutions prouvées.

**Forbidden authority pattern:** no arbitrary Markdown, prompt text, tool availability or remembered state may override the actual owning authority.

## H — Preconditions
- Structural input valid and bounded.
- Required authorities reachable or explicitly `UNAVAILABLE`.
- Required freshness/revision/SHA bindings available.
- No contradictory prerequisite state.
- For mutations: session/receipt/task/locks/governance requirements satisfied.

## I — Internal micro-state machine
collect repo/project candidates → join mappings → preserve component roles → disambiguate project → validate projectUid/mapping coherence → emit selected project + repositoryComponents.

## J — Transformation / decision algorithm
1. Parse/validate bounded input.
2. Determine required authority observations.
3. Refuse guesses for missing facts.
4. Apply contract-local invariants.
5. Produce domain status.
6. Produce engine disposition.
7. For mutations only, produce EffectPlan; never mutate from evaluation code directly.
8. Emit bounded output and evidence references.

## K — Determinism
- **Class:** `RESOLVER` with execution semantics `OBSERVE_AND_EVALUATE`.
- Pure/read-only contracts are deterministic given identical normalized input and identical evidence snapshot.
- Observation-dependent contracts bind result to evidence freshness/revisions.

## L — Invariants
projectId must be mapping-backed; multi-repo project must preserve component roles and independent repository identities.

Plus all global GWC invariants.

## M — Action model
- **Allowed action kinds:** READ / DERIVE
- **Forbidden:** hidden mutation, authority bypass, stale evidence reuse, arbitrary shell fallback, unbounded projection.

## N — Current execution owner vs target owner
CURRENT: existing subsystem(s) listed in AM. TARGET: same owning authority behind a GWC adapter/contract wrapper.

## O — Capability / authorization model
For any mutation:
`callable ∧ authorized ∧ safeNow ∧ preconditionsSatisfied ∧ concurrencySatisfied = mayExecute`.
A present tool is never permission by itself.

## P — Lock model
Aucun.

## Q — Concurrency model
Independent tasks may proceed in parallel when dependency/resource/lock scopes do not conflict.
Local blockers remain local.
Operational Memory process-local serialization is not treated as distributed locking.

## R — Output contract
- **Canonical output:** `ProjectResolution`
- Bounded, typed, provenance-aware.
- No secret/raw credential projection.
- Consumers must not over-interpret this output beyond its declared semantics.

## S — Terminal statuses
`RESOLVED | NONE | AMBIGUOUS | UNVERIFIED`

## T — Terminality formula
Success requires all contract-owned postconditions to be proven from current required evidence.
Missing/stale/conflicting evidence maps to fail-closed statuses, never implicit success.

## U — Reason codes
Contract-specific reason codes must be stable, enumerable, bounded and machine-testable.
Every failure/blocking reason must identify whether it is recoverable by reobserve, reconcile, wait or explicit change.

## V — Fail-closed model
Missing/stale/conflicting required evidence never defaults to success or permission. UNKNOWN remains UNKNOWN.

## W — Evidence model
mappingId, projectId, projectUid, componentRole, registry/candidate digests.

## X — Freshness / staleness
Evidence is bound to relevant `observedAt`, SHA, stateVersion and/or revisions.
A semantic state change invalidates dependent evidence when its contract declares such dependency.

## Y — Attestation model
EPHEMERAL_RESULT_ONLY by default; promote to bounded durable reference only where an existing authority requires durable proof.

## Z — Persistence model
No new GWC store. Persist only through the existing owning authority when the contract is a RECORD/MUTATE step.

## AA — Secret / privacy model
Never persist tokens, resume secrets, raw authorization headers, arbitrary transport IDs, `.env` material or unbounded prompt bodies.
Use digests/bounded projections where persistence is necessary.

## AB — Replay model
`READ_ONLY`

## AC — Recovery model
Recovery starts by observing the owning authority.
A mutation is replayed only when its replay class explicitly allows it and the recovery anchor proves it has not already happened.

## AD — Security / threat model
Prevent authority confusion, cross-session/repo/project leakage, stale evidence reuse, duplicate mutation, secret leakage and false attestation.

## AE — Observability
Emit bounded start/result/failure/reason-code observations where useful.
Observability is not authority.

## AF — Interface contract with predecessors
Consumes only the predecessor fields whose semantics are explicitly declared.
Revalidates any field whose freshness/ownership requires it.

## AG — Interface contract with successors
Exports `ProjectResolution` with explicit semantics; successor may not silently strengthen it.

## AH — Skip contract
No skip unless the graph contains a deterministic condition and proof source.
If skipped, the route and proof are observable.

## AI — Reobserve contract
Reobserve when required evidence is stale, unavailable-but-recoverable, or an external asynchronous condition may have progressed.

## AJ — Reconcile contract
Reconcile only when multiple authorities/state projections are inconsistent.
Reconcile is not the same as refreshing an observation.

## AK — Blocked behavior
Block only the affected Task/contract/resource scope unless an actual global invariant is violated.

## AL — Compensation / rollback
For pure/read-only contracts: not applicable.
For mutations: use existing rollback/compensation only where real; otherwise forward recovery by observation. Never pretend irreversible GitHub effects are rollbackable.

## AM — Existing system mapping
- **Current mapping:** src/github/projectResolution.ts + registry evidence.
- **Classification:** `REUSE/EXTEND`
- Existing behavior is preserved and wrapped/generalized before new engines are introduced.

## AN — Current hardcodes / generalization
MCP/S1/repository literals and single-repository assumptions must move to TargetContext/configuration where applicable; preserve historical MCP behavior backward-compatibly.

## AO — Future implementation slot
Implement behind a GWC contract module + adapter to existing authority. Exact file placement must follow repository architecture discovered at implementation baseline, not be invented prematurely.

## AP — Test contract
happy path; boundary; NONE/AMBIGUOUS/UNVERIFIED/STALE/CONFLICT as applicable; replay/recovery; security; non-regression; exact binding tests.

## AQ — Property / invariant tests
- Unknown evidence never becomes allow/success.
- Explicit predecessor semantics are preserved.
- No hidden mutation.
- Same normalized input + same evidence ⇒ same semantic result for deterministic profiles.
- Mutation contracts never execute without a valid EffectPlan.

## AR — Acceptance criteria
- Input/output schemas are bounded.
- Owning authorities are explicit.
- Fail-closed paths are tested.
- Replay/recovery behavior is defined.
- No new parallel authority.
- Existing non-regression suite remains green.

## AS — Open questions
B3 TargetScope migration pour Session/Task/Receipt.

## AT — Architectural findings
- Existing implementation class: `REUSE/EXTEND`.
- Any discovered hardcode is treated as a generalization target, not silently removed.
- Any mismatch between CURRENT and TARGET is explicit.

## AU — Future Task Blueprint mapping
This contract is implemented by one or more governed implementation tasks from `GWC_IMPLEMENTATION_TASK_BLUEPRINTS_R1.md`; implementation dependencies follow the contract graph and authority dependencies rather than numeric GW order alone.

## AV — Execution semantics
`OBSERVE_AND_EVALUATE`

## AW — Effect Plan
None.

## AX — Routing table
Primary predecessor: GW-05 / projectHint path. Primary successor: GW-07. Additional skip/reobserve/reconcile/recovery edges must be declared deterministically.

## AY — Recovery anchor
Read-only contracts: input/evidence snapshot bindings.
Mutation contracts: target reference + task/session + relevant branch/PR/SHA/revision/job ID.

## AZ — Reconstruction rule
On process restart, reconstruct from authoritative stores and observations; do not rely on previous assistant text or a GWC workflow-state database.

## BA — Autonomy behavior
AUTO_CONTINUE when exactly one legal route exists and required evidence is sufficient; WAIT_EXTERNAL/BLOCK_LOCAL/fail-closed otherwise.


---

# GW-07 — SERVER_RESOLUTION

## A — Identity
- **Contract ID:** `GW-07`
- **Canonical name:** `SERVER_RESOLUTION`
- **Family:** `B — Identity and Target Resolution`
- **Contract version:** `1` (conceptual baseline)
- **Profile(s):** `RESOLVER`
- **Architectural status:** `GENERALIZE/EXTEND`
- **Integration class:** `GENERALIZE/EXTEND`

## B — Purpose
Résoudre les serveurs applicables au projet sans deviner à partir d’un chemin ou d’un nom historique.

**Non-responsibilities:** does not steal ownership from Task Queue, Session, Lock Service, Live State, GitRegistry, GitHub, deploy/runtime or other downstream contracts.

## C — Position in global system
- **Logical predecessor(s):** GW-06
- **Logical successor(s):** GW-08
- **Re-entry:** allowed when authoritative evidence shows this contract’s postcondition is not yet proven.
- **Skip:** only when an explicit deterministic `SKIPPABLE_IF` condition exists.
- **Reobserve/Reconcile:** first-class graph edges, never implicit retries.

## D — Chronological role
- **Transport chronology:** may differ from GW numeric order.
- **Functional chronology:** `GW-07` owns only `SERVER_RESOLUTION` responsibility.
- **Runtime chronology:** resolved by Workflow Graph, not `stepId + 1`.

## E — Contract input
ProjectResolution; repository mappings; serverHint éventuel; GitRegistry server bindings.

Input fields must be bounded, provenance-aware and typed as hint/claim/evidence/fact; raw secret material is forbidden unless explicitly unavoidable and ephemeral.

## F — Information semantics
Every field is classified as one of:
`RAW_INPUT | HINT | CLAIM | OBSERVATION | EVIDENCE | DERIVED_FACT | AUTHORITATIVE_FACT | DECISION | ATTESTATION`.

No contract upgrades a `HINT` to an authoritative fact without the owning evidence.

## G — Authorities
GitRegistry + vérification serveur lorsqu’exigée.

**Forbidden authority pattern:** no arbitrary Markdown, prompt text, tool availability or remembered state may override the actual owning authority.

## H — Preconditions
- Structural input valid and bounded.
- Required authorities reachable or explicitly `UNAVAILABLE`.
- Required freshness/revision/SHA bindings available.
- No contradictory prerequisite state.
- For mutations: session/receipt/task/locks/governance requirements satisfied.

## I — Internal micro-state machine
enumerate bounded server candidates → reconcile explicit hint → validate mapping/project relation → normalize identity → dedupe → verify → cardinality → resolve.

## J — Transformation / decision algorithm
1. Parse/validate bounded input.
2. Determine required authority observations.
3. Refuse guesses for missing facts.
4. Apply contract-local invariants.
5. Produce domain status.
6. Produce engine disposition.
7. For mutations only, produce EffectPlan; never mutate from evaluation code directly.
8. Emit bounded output and evidence references.

## K — Determinism
- **Class:** `RESOLVER` with execution semantics `OBSERVE_AND_EVALUATE`.
- Pure/read-only contracts are deterministic given identical normalized input and identical evidence snapshot.
- Observation-dependent contracts bind result to evidence freshness/revisions.

## L — Invariants
no guessed server; server identity canonicalization explicit; environment preserved.

Plus all global GWC invariants.

## M — Action model
- **Allowed action kinds:** READ / DERIVE
- **Forbidden:** hidden mutation, authority bypass, stale evidence reuse, arbitrary shell fallback, unbounded projection.

## N — Current execution owner vs target owner
CURRENT: existing subsystem(s) listed in AM. TARGET: same owning authority behind a GWC adapter/contract wrapper.

## O — Capability / authorization model
For any mutation:
`callable ∧ authorized ∧ safeNow ∧ preconditionsSatisfied ∧ concurrencySatisfied = mayExecute`.
A present tool is never permission by itself.

## P — Lock model
Aucun.

## Q — Concurrency model
Independent tasks may proceed in parallel when dependency/resource/lock scopes do not conflict.
Local blockers remain local.
Operational Memory process-local serialization is not treated as distributed locking.

## R — Output contract
- **Canonical output:** `ServerResolution`
- Bounded, typed, provenance-aware.
- No secret/raw credential projection.
- Consumers must not over-interpret this output beyond its declared semantics.

## S — Terminal statuses
`RESOLVED | NONE | AMBIGUOUS | UNVERIFIED`

## T — Terminality formula
Success requires all contract-owned postconditions to be proven from current required evidence.
Missing/stale/conflicting evidence maps to fail-closed statuses, never implicit success.

## U — Reason codes
Contract-specific reason codes must be stable, enumerable, bounded and machine-testable.
Every failure/blocking reason must identify whether it is recoverable by reobserve, reconcile, wait or explicit change.

## V — Fail-closed model
Missing/stale/conflicting required evidence never defaults to success or permission. UNKNOWN remains UNKNOWN.

## W — Evidence model
serverId, mappingId, environment, serverPath/realPath verification.

## X — Freshness / staleness
Evidence is bound to relevant `observedAt`, SHA, stateVersion and/or revisions.
A semantic state change invalidates dependent evidence when its contract declares such dependency.

## Y — Attestation model
EPHEMERAL_RESULT_ONLY by default; promote to bounded durable reference only where an existing authority requires durable proof.

## Z — Persistence model
No new GWC store. Persist only through the existing owning authority when the contract is a RECORD/MUTATE step.

## AA — Secret / privacy model
Never persist tokens, resume secrets, raw authorization headers, arbitrary transport IDs, `.env` material or unbounded prompt bodies.
Use digests/bounded projections where persistence is necessary.

## AB — Replay model
`READ_ONLY`

## AC — Recovery model
Recovery starts by observing the owning authority.
A mutation is replayed only when its replay class explicitly allows it and the recovery anchor proves it has not already happened.

## AD — Security / threat model
Prevent authority confusion, cross-session/repo/project leakage, stale evidence reuse, duplicate mutation, secret leakage and false attestation.

## AE — Observability
Emit bounded start/result/failure/reason-code observations where useful.
Observability is not authority.

## AF — Interface contract with predecessors
Consumes only the predecessor fields whose semantics are explicitly declared.
Revalidates any field whose freshness/ownership requires it.

## AG — Interface contract with successors
Exports `ServerResolution` with explicit semantics; successor may not silently strengthen it.

## AH — Skip contract
No skip unless the graph contains a deterministic condition and proof source.
If skipped, the route and proof are observable.

## AI — Reobserve contract
Reobserve when required evidence is stale, unavailable-but-recoverable, or an external asynchronous condition may have progressed.

## AJ — Reconcile contract
Reconcile only when multiple authorities/state projections are inconsistent.
Reconcile is not the same as refreshing an observation.

## AK — Blocked behavior
Block only the affected Task/contract/resource scope unless an actual global invariant is violated.

## AL — Compensation / rollback
For pure/read-only contracts: not applicable.
For mutations: use existing rollback/compensation only where real; otherwise forward recovery by observation. Never pretend irreversible GitHub effects are rollbackable.

## AM — Existing system mapping
- **Current mapping:** GitRegistry serverId/serverPath/realPath data; no universal resolver.
- **Classification:** `GENERALIZE/EXTEND`
- Existing behavior is preserved and wrapped/generalized before new engines are introduced.

## AN — Current hardcodes / generalization
MCP/S1/repository literals and single-repository assumptions must move to TargetContext/configuration where applicable; preserve historical MCP behavior backward-compatibly.

## AO — Future implementation slot
Implement behind a GWC contract module + adapter to existing authority. Exact file placement must follow repository architecture discovered at implementation baseline, not be invented prematurely.

## AP — Test contract
happy path; boundary; NONE/AMBIGUOUS/UNVERIFIED/STALE/CONFLICT as applicable; replay/recovery; security; non-regression; exact binding tests.

## AQ — Property / invariant tests
- Unknown evidence never becomes allow/success.
- Explicit predecessor semantics are preserved.
- No hidden mutation.
- Same normalized input + same evidence ⇒ same semantic result for deterministic profiles.
- Mutation contracts never execute without a valid EffectPlan.

## AR — Acceptance criteria
- Input/output schemas are bounded.
- Owning authorities are explicit.
- Fail-closed paths are tested.
- Replay/recovery behavior is defined.
- No new parallel authority.
- Existing non-regression suite remains green.

## AS — Open questions
OD-03 canonical serverId normalization.

## AT — Architectural findings
- Existing implementation class: `GENERALIZE/EXTEND`.
- Any discovered hardcode is treated as a generalization target, not silently removed.
- Any mismatch between CURRENT and TARGET is explicit.

## AU — Future Task Blueprint mapping
This contract is implemented by one or more governed implementation tasks from `GWC_IMPLEMENTATION_TASK_BLUEPRINTS_R1.md`; implementation dependencies follow the contract graph and authority dependencies rather than numeric GW order alone.

## AV — Execution semantics
`OBSERVE_AND_EVALUATE`

## AW — Effect Plan
None.

## AX — Routing table
Primary predecessor: GW-06. Primary successor: GW-08. Additional skip/reobserve/reconcile/recovery edges must be declared deterministically.

## AY — Recovery anchor
Read-only contracts: input/evidence snapshot bindings.
Mutation contracts: target reference + task/session + relevant branch/PR/SHA/revision/job ID.

## AZ — Reconstruction rule
On process restart, reconstruct from authoritative stores and observations; do not rely on previous assistant text or a GWC workflow-state database.

## BA — Autonomy behavior
AUTO_CONTINUE when exactly one legal route exists and required evidence is sufficient; WAIT_EXTERNAL/BLOCK_LOCAL/fail-closed otherwise.


---

# GW-08 — RUNTIME_RESOLUTION

## A — Identity
- **Contract ID:** `GW-08`
- **Canonical name:** `RUNTIME_RESOLUTION`
- **Family:** `B — Identity and Target Resolution`
- **Contract version:** `1` (conceptual baseline)
- **Profile(s):** `RESOLVER`
- **Architectural status:** `GENERALIZE/EXTEND`
- **Integration class:** `GENERALIZE/EXTEND`

## B — Purpose
Résoudre les runtimes réellement liés au projet/serveur sans hardcode MCP.

**Non-responsibilities:** does not steal ownership from Task Queue, Session, Lock Service, Live State, GitRegistry, GitHub, deploy/runtime or other downstream contracts.

## C — Position in global system
- **Logical predecessor(s):** GW-07
- **Logical successor(s):** GW-09
- **Re-entry:** allowed when authoritative evidence shows this contract’s postcondition is not yet proven.
- **Skip:** only when an explicit deterministic `SKIPPABLE_IF` condition exists.
- **Reobserve/Reconcile:** first-class graph edges, never implicit retries.

## D — Chronological role
- **Transport chronology:** may differ from GW numeric order.
- **Functional chronology:** `GW-08` owns only `RUNTIME_RESOLUTION` responsibility.
- **Runtime chronology:** resolved by Workflow Graph, not `stepId + 1`.

## E — Contract input
ServerResolution; project components; runtime hints; runtime bindings/configuration.

Input fields must be bounded, provenance-aware and typed as hint/claim/evidence/fact; raw secret material is forbidden unless explicitly unavoidable and ephemeral.

## F — Information semantics
Every field is classified as one of:
`RAW_INPUT | HINT | CLAIM | OBSERVATION | EVIDENCE | DERIVED_FACT | AUTHORITATIVE_FACT | DECISION | ATTESTATION`.

No contract upgrades a `HINT` to an authoritative fact without the owning evidence.

## G — Authorities
Runtime binding registry/configuration + runtime observation.

**Forbidden authority pattern:** no arbitrary Markdown, prompt text, tool availability or remembered state may override the actual owning authority.

## H — Preconditions
- Structural input valid and bounded.
- Required authorities reachable or explicitly `UNAVAILABLE`.
- Required freshness/revision/SHA bindings available.
- No contradictory prerequisite state.
- For mutations: session/receipt/task/locks/governance requirements satisfied.

## I — Internal micro-state machine
enumerate candidate bindings → validate server relation → validate component relation → observe runtime when required → dedupe → resolve cardinality.

## J — Transformation / decision algorithm
1. Parse/validate bounded input.
2. Determine required authority observations.
3. Refuse guesses for missing facts.
4. Apply contract-local invariants.
5. Produce domain status.
6. Produce engine disposition.
7. For mutations only, produce EffectPlan; never mutate from evaluation code directly.
8. Emit bounded output and evidence references.

## K — Determinism
- **Class:** `RESOLVER` with execution semantics `OBSERVE_AND_EVALUATE`.
- Pure/read-only contracts are deterministic given identical normalized input and identical evidence snapshot.
- Observation-dependent contracts bind result to evidence freshness/revisions.

## L — Invariants
serverPath != runtime identity; zero/one/many runtimes allowed; runtimeKind explicit.

Plus all global GWC invariants.

## M — Action model
- **Allowed action kinds:** READ / DERIVE
- **Forbidden:** hidden mutation, authority bypass, stale evidence reuse, arbitrary shell fallback, unbounded projection.

## N — Current execution owner vs target owner
CURRENT: existing subsystem(s) listed in AM. TARGET: same owning authority behind a GWC adapter/contract wrapper.

## O — Capability / authorization model
For any mutation:
`callable ∧ authorized ∧ safeNow ∧ preconditionsSatisfied ∧ concurrencySatisfied = mayExecute`.
A present tool is never permission by itself.

## P — Lock model
Aucun.

## Q — Concurrency model
Independent tasks may proceed in parallel when dependency/resource/lock scopes do not conflict.
Local blockers remain local.
Operational Memory process-local serialization is not treated as distributed locking.

## R — Output contract
- **Canonical output:** `RuntimeResolution`
- Bounded, typed, provenance-aware.
- No secret/raw credential projection.
- Consumers must not over-interpret this output beyond its declared semantics.

## S — Terminal statuses
`RESOLVED | NONE | AMBIGUOUS | UNVERIFIED`

## T — Terminality formula
Success requires all contract-owned postconditions to be proven from current required evidence.
Missing/stale/conflicting evidence maps to fail-closed statuses, never implicit success.

## U — Reason codes
Contract-specific reason codes must be stable, enumerable, bounded and machine-testable.
Every failure/blocking reason must identify whether it is recoverable by reobserve, reconcile, wait or explicit change.

## V — Fail-closed model
Missing/stale/conflicting required evidence never defaults to success or permission. UNKNOWN remains UNKNOWN.

## W — Evidence model
runtimeId, runtimeKind, serverId, repository/component relation, observed runtime identity.

## X — Freshness / staleness
Evidence is bound to relevant `observedAt`, SHA, stateVersion and/or revisions.
A semantic state change invalidates dependent evidence when its contract declares such dependency.

## Y — Attestation model
EPHEMERAL_RESULT_ONLY by default; promote to bounded durable reference only where an existing authority requires durable proof.

## Z — Persistence model
No new GWC store. Persist only through the existing owning authority when the contract is a RECORD/MUTATE step.

## AA — Secret / privacy model
Never persist tokens, resume secrets, raw authorization headers, arbitrary transport IDs, `.env` material or unbounded prompt bodies.
Use digests/bounded projections where persistence is necessary.

## AB — Replay model
`READ_ONLY`

## AC — Recovery model
Recovery starts by observing the owning authority.
A mutation is replayed only when its replay class explicitly allows it and the recovery anchor proves it has not already happened.

## AD — Security / threat model
Prevent authority confusion, cross-session/repo/project leakage, stale evidence reuse, duplicate mutation, secret leakage and false attestation.

## AE — Observability
Emit bounded start/result/failure/reason-code observations where useful.
Observability is not authority.

## AF — Interface contract with predecessors
Consumes only the predecessor fields whose semantics are explicitly declared.
Revalidates any field whose freshness/ownership requires it.

## AG — Interface contract with successors
Exports `RuntimeResolution` with explicit semantics; successor may not silently strengthen it.

## AH — Skip contract
No skip unless the graph contains a deterministic condition and proof source.
If skipped, the route and proof are observable.

## AI — Reobserve contract
Reobserve when required evidence is stale, unavailable-but-recoverable, or an external asynchronous condition may have progressed.

## AJ — Reconcile contract
Reconcile only when multiple authorities/state projections are inconsistent.
Reconcile is not the same as refreshing an observation.

## AK — Blocked behavior
Block only the affected Task/contract/resource scope unless an actual global invariant is violated.

## AL — Compensation / rollback
For pure/read-only contracts: not applicable.
For mutations: use existing rollback/compensation only where real; otherwise forward recovery by observation. Never pretend irreversible GitHub effects are rollbackable.

## AM — Existing system mapping
- **Current mapping:** Live State/runtime attestation/deploy code; no universal RuntimeBinding.
- **Classification:** `GENERALIZE/EXTEND`
- Existing behavior is preserved and wrapped/generalized before new engines are introduced.

## AN — Current hardcodes / generalization
MCP/S1/repository literals and single-repository assumptions must move to TargetContext/configuration where applicable; preserve historical MCP behavior backward-compatibly.

## AO — Future implementation slot
Implement behind a GWC contract module + adapter to existing authority. Exact file placement must follow repository architecture discovered at implementation baseline, not be invented prematurely.

## AP — Test contract
happy path; boundary; NONE/AMBIGUOUS/UNVERIFIED/STALE/CONFLICT as applicable; replay/recovery; security; non-regression; exact binding tests.

## AQ — Property / invariant tests
- Unknown evidence never becomes allow/success.
- Explicit predecessor semantics are preserved.
- No hidden mutation.
- Same normalized input + same evidence ⇒ same semantic result for deterministic profiles.
- Mutation contracts never execute without a valid EffectPlan.

## AR — Acceptance criteria
- Input/output schemas are bounded.
- Owning authorities are explicit.
- Fail-closed paths are tested.
- Replay/recovery behavior is defined.
- No new parallel authority.
- Existing non-regression suite remains green.

## AS — Open questions
OD-04 Universal RuntimeBinding schema.

## AT — Architectural findings
- Existing implementation class: `GENERALIZE/EXTEND`.
- Any discovered hardcode is treated as a generalization target, not silently removed.
- Any mismatch between CURRENT and TARGET is explicit.

## AU — Future Task Blueprint mapping
This contract is implemented by one or more governed implementation tasks from `GWC_IMPLEMENTATION_TASK_BLUEPRINTS_R1.md`; implementation dependencies follow the contract graph and authority dependencies rather than numeric GW order alone.

## AV — Execution semantics
`OBSERVE_AND_EVALUATE`

## AW — Effect Plan
None.

## AX — Routing table
Primary predecessor: GW-07. Primary successor: GW-09. Additional skip/reobserve/reconcile/recovery edges must be declared deterministically.

## AY — Recovery anchor
Read-only contracts: input/evidence snapshot bindings.
Mutation contracts: target reference + task/session + relevant branch/PR/SHA/revision/job ID.

## AZ — Reconstruction rule
On process restart, reconstruct from authoritative stores and observations; do not rely on previous assistant text or a GWC workflow-state database.

## BA — Autonomy behavior
AUTO_CONTINUE when exactly one legal route exists and required evidence is sufficient; WAIT_EXTERNAL/BLOCK_LOCAL/fail-closed otherwise.


---

# GW-09 — DOMAIN_RESOLUTION

## A — Identity
- **Contract ID:** `GW-09`
- **Canonical name:** `DOMAIN_RESOLUTION`
- **Family:** `B — Identity and Target Resolution`
- **Contract version:** `1` (conceptual baseline)
- **Profile(s):** `RESOLVER`
- **Architectural status:** `GENERALIZE/EXTEND`
- **Integration class:** `GENERALIZE/EXTEND`

## B — Purpose
Résoudre domaines/endpoints actifs en distinguant publicDomain, publicApi, internal endpoints et historical vhosts.

**Non-responsibilities:** does not steal ownership from Task Queue, Session, Lock Service, Live State, GitRegistry, GitHub, deploy/runtime or other downstream contracts.

## C — Position in global system
- **Logical predecessor(s):** GW-08
- **Logical successor(s):** GW-10
- **Re-entry:** allowed when authoritative evidence shows this contract’s postcondition is not yet proven.
- **Skip:** only when an explicit deterministic `SKIPPABLE_IF` condition exists.
- **Reobserve/Reconcile:** first-class graph edges, never implicit retries.

## D — Chronological role
- **Transport chronology:** may differ from GW numeric order.
- **Functional chronology:** `GW-09` owns only `DOMAIN_RESOLUTION` responsibility.
- **Runtime chronology:** resolved by Workflow Graph, not `stepId + 1`.

## E — Contract input
ProjectResolution; server/runtime resolution; GitRegistry/project domain data.

Input fields must be bounded, provenance-aware and typed as hint/claim/evidence/fact; raw secret material is forbidden unless explicitly unavoidable and ephemeral.

## F — Information semantics
Every field is classified as one of:
`RAW_INPUT | HINT | CLAIM | OBSERVATION | EVIDENCE | DERIVED_FACT | AUTHORITATIVE_FACT | DECISION | ATTESTATION`.

No contract upgrades a `HINT` to an authoritative fact without the owning evidence.

## G — Authorities
GitRegistry/project configuration + applicable domain observation.

**Forbidden authority pattern:** no arbitrary Markdown, prompt text, tool availability or remembered state may override the actual owning authority.

## H — Preconditions
- Structural input valid and bounded.
- Required authorities reachable or explicitly `UNAVAILABLE`.
- Required freshness/revision/SHA bindings available.
- No contradictory prerequisite state.
- For mutations: session/receipt/task/locks/governance requirements satisfied.

## I — Internal micro-state machine
collect classified domain candidates → exclude historical-only from active role → verify if required → preserve roles → resolve list.

## J — Transformation / decision algorithm
1. Parse/validate bounded input.
2. Determine required authority observations.
3. Refuse guesses for missing facts.
4. Apply contract-local invariants.
5. Produce domain status.
6. Produce engine disposition.
7. For mutations only, produce EffectPlan; never mutate from evaluation code directly.
8. Emit bounded output and evidence references.

## K — Determinism
- **Class:** `RESOLVER` with execution semantics `OBSERVE_AND_EVALUATE`.
- Pure/read-only contracts are deterministic given identical normalized input and identical evidence snapshot.
- Observation-dependent contracts bind result to evidence freshness/revisions.

## L — Invariants
historicalVhost never becomes active automatically; NONE is valid for domainless projects.

Plus all global GWC invariants.

## M — Action model
- **Allowed action kinds:** READ / DERIVE
- **Forbidden:** hidden mutation, authority bypass, stale evidence reuse, arbitrary shell fallback, unbounded projection.

## N — Current execution owner vs target owner
CURRENT: existing subsystem(s) listed in AM. TARGET: same owning authority behind a GWC adapter/contract wrapper.

## O — Capability / authorization model
For any mutation:
`callable ∧ authorized ∧ safeNow ∧ preconditionsSatisfied ∧ concurrencySatisfied = mayExecute`.
A present tool is never permission by itself.

## P — Lock model
Aucun.

## Q — Concurrency model
Independent tasks may proceed in parallel when dependency/resource/lock scopes do not conflict.
Local blockers remain local.
Operational Memory process-local serialization is not treated as distributed locking.

## R — Output contract
- **Canonical output:** `DomainResolution`
- Bounded, typed, provenance-aware.
- No secret/raw credential projection.
- Consumers must not over-interpret this output beyond its declared semantics.

## S — Terminal statuses
`RESOLVED | NONE | AMBIGUOUS | UNVERIFIED`

## T — Terminality formula
Success requires all contract-owned postconditions to be proven from current required evidence.
Missing/stale/conflicting evidence maps to fail-closed statuses, never implicit success.

## U — Reason codes
Contract-specific reason codes must be stable, enumerable, bounded and machine-testable.
Every failure/blocking reason must identify whether it is recoverable by reobserve, reconcile, wait or explicit change.

## V — Fail-closed model
Missing/stale/conflicting required evidence never defaults to success or permission. UNKNOWN remains UNKNOWN.

## W — Evidence model
domain role, active/current flags, verification state.

## X — Freshness / staleness
Evidence is bound to relevant `observedAt`, SHA, stateVersion and/or revisions.
A semantic state change invalidates dependent evidence when its contract declares such dependency.

## Y — Attestation model
EPHEMERAL_RESULT_ONLY by default; promote to bounded durable reference only where an existing authority requires durable proof.

## Z — Persistence model
No new GWC store. Persist only through the existing owning authority when the contract is a RECORD/MUTATE step.

## AA — Secret / privacy model
Never persist tokens, resume secrets, raw authorization headers, arbitrary transport IDs, `.env` material or unbounded prompt bodies.
Use digests/bounded projections where persistence is necessary.

## AB — Replay model
`READ_ONLY`

## AC — Recovery model
Recovery starts by observing the owning authority.
A mutation is replayed only when its replay class explicitly allows it and the recovery anchor proves it has not already happened.

## AD — Security / threat model
Prevent authority confusion, cross-session/repo/project leakage, stale evidence reuse, duplicate mutation, secret leakage and false attestation.

## AE — Observability
Emit bounded start/result/failure/reason-code observations where useful.
Observability is not authority.

## AF — Interface contract with predecessors
Consumes only the predecessor fields whose semantics are explicitly declared.
Revalidates any field whose freshness/ownership requires it.

## AG — Interface contract with successors
Exports `DomainResolution` with explicit semantics; successor may not silently strengthen it.

## AH — Skip contract
No skip unless the graph contains a deterministic condition and proof source.
If skipped, the route and proof are observable.

## AI — Reobserve contract
Reobserve when required evidence is stale, unavailable-but-recoverable, or an external asynchronous condition may have progressed.

## AJ — Reconcile contract
Reconcile only when multiple authorities/state projections are inconsistent.
Reconcile is not the same as refreshing an observation.

## AK — Blocked behavior
Block only the affected Task/contract/resource scope unless an actual global invariant is violated.

## AL — Compensation / rollback
For pure/read-only contracts: not applicable.
For mutations: use existing rollback/compensation only where real; otherwise forward recovery by observation. Never pretend irreversible GitHub effects are rollbackable.

## AM — Existing system mapping
- **Current mapping:** GitRegistry project/publicDomain/domain/historicalVhosts.
- **Classification:** `GENERALIZE/EXTEND`
- Existing behavior is preserved and wrapped/generalized before new engines are introduced.

## AN — Current hardcodes / generalization
MCP/S1/repository literals and single-repository assumptions must move to TargetContext/configuration where applicable; preserve historical MCP behavior backward-compatibly.

## AO — Future implementation slot
Implement behind a GWC contract module + adapter to existing authority. Exact file placement must follow repository architecture discovered at implementation baseline, not be invented prematurely.

## AP — Test contract
happy path; boundary; NONE/AMBIGUOUS/UNVERIFIED/STALE/CONFLICT as applicable; replay/recovery; security; non-regression; exact binding tests.

## AQ — Property / invariant tests
- Unknown evidence never becomes allow/success.
- Explicit predecessor semantics are preserved.
- No hidden mutation.
- Same normalized input + same evidence ⇒ same semantic result for deterministic profiles.
- Mutation contracts never execute without a valid EffectPlan.

## AR — Acceptance criteria
- Input/output schemas are bounded.
- Owning authorities are explicit.
- Fail-closed paths are tested.
- Replay/recovery behavior is defined.
- No new parallel authority.
- Existing non-regression suite remains green.

## AS — Open questions
Politique exacte de priorité entre plusieurs domaines actifs valides si un projet en expose plusieurs.

## AT — Architectural findings
- Existing implementation class: `GENERALIZE/EXTEND`.
- Any discovered hardcode is treated as a generalization target, not silently removed.
- Any mismatch between CURRENT and TARGET is explicit.

## AU — Future Task Blueprint mapping
This contract is implemented by one or more governed implementation tasks from `GWC_IMPLEMENTATION_TASK_BLUEPRINTS_R1.md`; implementation dependencies follow the contract graph and authority dependencies rather than numeric GW order alone.

## AV — Execution semantics
`OBSERVE_AND_EVALUATE`

## AW — Effect Plan
None.

## AX — Routing table
Primary predecessor: GW-08. Primary successor: GW-10. Additional skip/reobserve/reconcile/recovery edges must be declared deterministically.

## AY — Recovery anchor
Read-only contracts: input/evidence snapshot bindings.
Mutation contracts: target reference + task/session + relevant branch/PR/SHA/revision/job ID.

## AZ — Reconstruction rule
On process restart, reconstruct from authoritative stores and observations; do not rely on previous assistant text or a GWC workflow-state database.

## BA — Autonomy behavior
AUTO_CONTINUE when exactly one legal route exists and required evidence is sufficient; WAIT_EXTERNAL/BLOCK_LOCAL/fail-closed otherwise.


---

# GW-10 — GOVERNANCE_INHERITANCE

## A — Identity
- **Contract ID:** `GW-10`
- **Canonical name:** `GOVERNANCE_INHERITANCE`
- **Family:** `C — Governance and Capability Composition`
- **Contract version:** `1` (conceptual baseline)
- **Profile(s):** `DERIVER`
- **Architectural status:** `PARTIAL/GENERALIZE`
- **Integration class:** `PARTIAL/GENERALIZE`

## B — Purpose
Formaliser la responsabilité `GOVERNANCE_INHERITANCE` comme contrat borné, versionné et composable, sans dupliquer les autorités existantes.

**Non-responsibilities:** does not steal ownership from Task Queue, Session, Lock Service, Live State, GitRegistry, GitHub, deploy/runtime or other downstream contracts.

## C — Position in global system
- **Logical predecessor(s):** GW-09
- **Logical successor(s):** GW-11
- **Re-entry:** allowed when authoritative evidence shows this contract’s postcondition is not yet proven.
- **Skip:** only when an explicit deterministic `SKIPPABLE_IF` condition exists.
- **Reobserve/Reconcile:** first-class graph edges, never implicit retries.

## D — Chronological role
- **Transport chronology:** may differ from GW numeric order.
- **Functional chronology:** `GW-10` owns only `GOVERNANCE_INHERITANCE` responsibility.
- **Runtime chronology:** resolved by Workflow Graph, not `stepId + 1`.

## E — Contract input
Sorties prouvées des prédécesseurs applicables, contexte cible borné, références d’autorité nécessaires à `GOVERNANCE_INHERITANCE`.

Input fields must be bounded, provenance-aware and typed as hint/claim/evidence/fact; raw secret material is forbidden unless explicitly unavoidable and ephemeral.

## F — Information semantics
Every field is classified as one of:
`RAW_INPUT | HINT | CLAIM | OBSERVATION | EVIDENCE | DERIVED_FACT | AUTHORITATIVE_FACT | DECISION | ATTESTATION`.

No contract upgrades a `HINT` to an authoritative fact without the owning evidence.

## G — Authorities
Autorités existantes correspondant aux faits consommés; aucune nouvelle source de vérité créée par GWC.

**Forbidden authority pattern:** no arbitrary Markdown, prompt text, tool availability or remembered state may override the actual owning authority.

## H — Preconditions
- Structural input valid and bounded.
- Required authorities reachable or explicitly `UNAVAILABLE`.
- Required freshness/revision/SHA bindings available.
- No contradictory prerequisite state.
- For mutations: session/receipt/task/locks/governance requirements satisfied.

## I — Internal micro-state machine
validate bounded input → collect/validate required evidence → evaluate local invariants → derive domain status → derive routing disposition → emit bounded output.

## J — Transformation / decision algorithm
1. Parse/validate bounded input.
2. Determine required authority observations.
3. Refuse guesses for missing facts.
4. Apply contract-local invariants.
5. Produce domain status.
6. Produce engine disposition.
7. For mutations only, produce EffectPlan; never mutate from evaluation code directly.
8. Emit bounded output and evidence references.

## K — Determinism
- **Class:** `DERIVER` with execution semantics `EVALUATE_ONLY`.
- Pure/read-only contracts are deterministic given identical normalized input and identical evidence snapshot.
- Observation-dependent contracts bind result to evidence freshness/revisions.

## L — Invariants
Global GWC invariants + no over-interpretation of predecessor output + bounded data + fail closed on missing evidence.

Plus all global GWC invariants.

## M — Action model
- **Allowed action kinds:** READ / DERIVE
- **Forbidden:** hidden mutation, authority bypass, stale evidence reuse, arbitrary shell fallback, unbounded projection.

## N — Current execution owner vs target owner
CURRENT: existing subsystem(s) listed in AM. TARGET: same owning authority behind a GWC adapter/contract wrapper.

## O — Capability / authorization model
For any mutation:
`callable ∧ authorized ∧ safeNow ∧ preconditionsSatisfied ∧ concurrencySatisfied = mayExecute`.
A present tool is never permission by itself.

## P — Lock model
No new lock unless EffectPlan declares a collision domain; consume existing Lock Service.

## Q — Concurrency model
Independent tasks may proceed in parallel when dependency/resource/lock scopes do not conflict.
Local blockers remain local.
Operational Memory process-local serialization is not treated as distributed locking.

## R — Output contract
- **Canonical output:** `GovernanceContext`
- Bounded, typed, provenance-aware.
- No secret/raw credential projection.
- Consumers must not over-interpret this output beyond its declared semantics.

## S — Terminal statuses
`SUCCESS | NONE | AMBIGUOUS | UNVERIFIED | BLOCKED | CONFLICT | STALE (subset applicable)`

## T — Terminality formula
Success requires all contract-owned postconditions to be proven from current required evidence.
Missing/stale/conflicting evidence maps to fail-closed statuses, never implicit success.

## U — Reason codes
Contract-specific reason codes must be stable, enumerable, bounded and machine-testable.
Every failure/blocking reason must identify whether it is recoverable by reobserve, reconcile, wait or explicit change.

## V — Fail-closed model
Missing/stale/conflicting required evidence never defaults to success or permission. UNKNOWN remains UNKNOWN.

## W — Evidence model
EvidenceEnvelope(s) from the owning authorities with freshness, provenance and relevant SHA/revision binding.

## X — Freshness / staleness
Evidence is bound to relevant `observedAt`, SHA, stateVersion and/or revisions.
A semantic state change invalidates dependent evidence when its contract declares such dependency.

## Y — Attestation model
EPHEMERAL_RESULT_ONLY by default; promote to bounded durable reference only where an existing authority requires durable proof.

## Z — Persistence model
No new GWC store. Persist only through the existing owning authority when the contract is a RECORD/MUTATE step.

## AA — Secret / privacy model
Never persist tokens, resume secrets, raw authorization headers, arbitrary transport IDs, `.env` material or unbounded prompt bodies.
Use digests/bounded projections where persistence is necessary.

## AB — Replay model
`READ_ONLY`

## AC — Recovery model
Recovery starts by observing the owning authority.
A mutation is replayed only when its replay class explicitly allows it and the recovery anchor proves it has not already happened.

## AD — Security / threat model
Prevent authority confusion, cross-session/repo/project leakage, stale evidence reuse, duplicate mutation, secret leakage and false attestation.

## AE — Observability
Emit bounded start/result/failure/reason-code observations where useful.
Observability is not authority.

## AF — Interface contract with predecessors
Consumes only the predecessor fields whose semantics are explicitly declared.
Revalidates any field whose freshness/ownership requires it.

## AG — Interface contract with successors
Exports `GovernanceContext` with explicit semantics; successor may not silently strengthen it.

## AH — Skip contract
No skip unless the graph contains a deterministic condition and proof source.
If skipped, the route and proof are observable.

## AI — Reobserve contract
Reobserve when required evidence is stale, unavailable-but-recoverable, or an external asynchronous condition may have progressed.

## AJ — Reconcile contract
Reconcile only when multiple authorities/state projections are inconsistent.
Reconcile is not the same as refreshing an observation.

## AK — Blocked behavior
Block only the affected Task/contract/resource scope unless an actual global invariant is violated.

## AL — Compensation / rollback
For pure/read-only contracts: not applicable.
For mutations: use existing rollback/compensation only where real; otherwise forward recovery by observation. Never pretend irreversible GitHub effects are rollbackable.

## AM — Existing system mapping
- **Current mapping:** .mcp policies + governance evidence; no universal inheritance engine.
- **Classification:** `PARTIAL/GENERALIZE`
- Existing behavior is preserved and wrapped/generalized before new engines are introduced.

## AN — Current hardcodes / generalization
MCP/S1/repository literals and single-repository assumptions must move to TargetContext/configuration where applicable; preserve historical MCP behavior backward-compatibly.

## AO — Future implementation slot
Implement behind a GWC contract module + adapter to existing authority. Exact file placement must follow repository architecture discovered at implementation baseline, not be invented prematurely.

## AP — Test contract
happy path; boundary; NONE/AMBIGUOUS/UNVERIFIED/STALE/CONFLICT as applicable; replay/recovery; security; non-regression; exact binding tests.

## AQ — Property / invariant tests
- Unknown evidence never becomes allow/success.
- Explicit predecessor semantics are preserved.
- No hidden mutation.
- Same normalized input + same evidence ⇒ same semantic result for deterministic profiles.
- Mutation contracts never execute without a valid EffectPlan.

## AR — Acceptance criteria
- Input/output schemas are bounded.
- Owning authorities are explicit.
- Fail-closed paths are tested.
- Replay/recovery behavior is defined.
- No new parallel authority.
- Existing non-regression suite remains green.

## AS — Open questions
No blocking open decision beyond profile-specific implementation details; unresolved choices must stay explicit.

## AT — Architectural findings
- Existing implementation class: `PARTIAL/GENERALIZE`.
- Any discovered hardcode is treated as a generalization target, not silently removed.
- Any mismatch between CURRENT and TARGET is explicit.

## AU — Future Task Blueprint mapping
This contract is implemented by one or more governed implementation tasks from `GWC_IMPLEMENTATION_TASK_BLUEPRINTS_R1.md`; implementation dependencies follow the contract graph and authority dependencies rather than numeric GW order alone.

## AV — Execution semantics
`EVALUATE_ONLY`

## AW — Effect Plan
None.

## AX — Routing table
Primary predecessor: GW-09. Primary successor: GW-11. Additional skip/reobserve/reconcile/recovery edges must be declared deterministically.

## AY — Recovery anchor
Read-only contracts: input/evidence snapshot bindings.
Mutation contracts: target reference + task/session + relevant branch/PR/SHA/revision/job ID.

## AZ — Reconstruction rule
On process restart, reconstruct from authoritative stores and observations; do not rely on previous assistant text or a GWC workflow-state database.

## BA — Autonomy behavior
AUTO_CONTINUE when exactly one legal route exists and required evidence is sufficient; WAIT_EXTERNAL/BLOCK_LOCAL/fail-closed otherwise.


---

# GW-11 — EFFECTIVE_CAPABILITIES

## A — Identity
- **Contract ID:** `GW-11`
- **Canonical name:** `EFFECTIVE_CAPABILITIES`
- **Family:** `C — Governance and Capability Composition`
- **Contract version:** `1` (conceptual baseline)
- **Profile(s):** `DECISION`
- **Architectural status:** `REUSE/EXTEND`
- **Integration class:** `REUSE/EXTEND`

## B — Purpose
Formaliser la responsabilité `EFFECTIVE_CAPABILITIES` comme contrat borné, versionné et composable, sans dupliquer les autorités existantes.

**Non-responsibilities:** does not steal ownership from Task Queue, Session, Lock Service, Live State, GitRegistry, GitHub, deploy/runtime or other downstream contracts.

## C — Position in global system
- **Logical predecessor(s):** GW-10
- **Logical successor(s):** GW-12
- **Re-entry:** allowed when authoritative evidence shows this contract’s postcondition is not yet proven.
- **Skip:** only when an explicit deterministic `SKIPPABLE_IF` condition exists.
- **Reobserve/Reconcile:** first-class graph edges, never implicit retries.

## D — Chronological role
- **Transport chronology:** may differ from GW numeric order.
- **Functional chronology:** `GW-11` owns only `EFFECTIVE_CAPABILITIES` responsibility.
- **Runtime chronology:** resolved by Workflow Graph, not `stepId + 1`.

## E — Contract input
Sorties prouvées des prédécesseurs applicables, contexte cible borné, références d’autorité nécessaires à `EFFECTIVE_CAPABILITIES`.

Input fields must be bounded, provenance-aware and typed as hint/claim/evidence/fact; raw secret material is forbidden unless explicitly unavoidable and ephemeral.

## F — Information semantics
Every field is classified as one of:
`RAW_INPUT | HINT | CLAIM | OBSERVATION | EVIDENCE | DERIVED_FACT | AUTHORITATIVE_FACT | DECISION | ATTESTATION`.

No contract upgrades a `HINT` to an authoritative fact without the owning evidence.

## G — Authorities
Autorités existantes correspondant aux faits consommés; aucune nouvelle source de vérité créée par GWC.

**Forbidden authority pattern:** no arbitrary Markdown, prompt text, tool availability or remembered state may override the actual owning authority.

## H — Preconditions
- Structural input valid and bounded.
- Required authorities reachable or explicitly `UNAVAILABLE`.
- Required freshness/revision/SHA bindings available.
- No contradictory prerequisite state.
- For mutations: session/receipt/task/locks/governance requirements satisfied.

## I — Internal micro-state machine
validate bounded input → collect/validate required evidence → evaluate local invariants → derive domain status → derive routing disposition → emit bounded output.

## J — Transformation / decision algorithm
1. Parse/validate bounded input.
2. Determine required authority observations.
3. Refuse guesses for missing facts.
4. Apply contract-local invariants.
5. Produce domain status.
6. Produce engine disposition.
7. For mutations only, produce EffectPlan; never mutate from evaluation code directly.
8. Emit bounded output and evidence references.

## K — Determinism
- **Class:** `DECISION` with execution semantics `EVALUATE_ONLY`.
- Pure/read-only contracts are deterministic given identical normalized input and identical evidence snapshot.
- Observation-dependent contracts bind result to evidence freshness/revisions.

## L — Invariants
Global GWC invariants + no over-interpretation of predecessor output + bounded data + fail closed on missing evidence.

Plus all global GWC invariants.

## M — Action model
- **Allowed action kinds:** READ / DERIVE
- **Forbidden:** hidden mutation, authority bypass, stale evidence reuse, arbitrary shell fallback, unbounded projection.

## N — Current execution owner vs target owner
CURRENT: existing subsystem(s) listed in AM. TARGET: same owning authority behind a GWC adapter/contract wrapper.

## O — Capability / authorization model
For any mutation:
`callable ∧ authorized ∧ safeNow ∧ preconditionsSatisfied ∧ concurrencySatisfied = mayExecute`.
A present tool is never permission by itself.

## P — Lock model
No new lock unless EffectPlan declares a collision domain; consume existing Lock Service.

## Q — Concurrency model
Independent tasks may proceed in parallel when dependency/resource/lock scopes do not conflict.
Local blockers remain local.
Operational Memory process-local serialization is not treated as distributed locking.

## R — Output contract
- **Canonical output:** `EffectiveCapabilitySet`
- Bounded, typed, provenance-aware.
- No secret/raw credential projection.
- Consumers must not over-interpret this output beyond its declared semantics.

## S — Terminal statuses
`SUCCESS | NONE | AMBIGUOUS | UNVERIFIED | BLOCKED | CONFLICT | STALE (subset applicable)`

## T — Terminality formula
Success requires all contract-owned postconditions to be proven from current required evidence.
Missing/stale/conflicting evidence maps to fail-closed statuses, never implicit success.

## U — Reason codes
Contract-specific reason codes must be stable, enumerable, bounded and machine-testable.
Every failure/blocking reason must identify whether it is recoverable by reobserve, reconcile, wait or explicit change.

## V — Fail-closed model
Missing/stale/conflicting required evidence never defaults to success or permission. UNKNOWN remains UNKNOWN.

## W — Evidence model
EvidenceEnvelope(s) from the owning authorities with freshness, provenance and relevant SHA/revision binding.

## X — Freshness / staleness
Evidence is bound to relevant `observedAt`, SHA, stateVersion and/or revisions.
A semantic state change invalidates dependent evidence when its contract declares such dependency.

## Y — Attestation model
EPHEMERAL_RESULT_ONLY by default; promote to bounded durable reference only where an existing authority requires durable proof.

## Z — Persistence model
No new GWC store. Persist only through the existing owning authority when the contract is a RECORD/MUTATE step.

## AA — Secret / privacy model
Never persist tokens, resume secrets, raw authorization headers, arbitrary transport IDs, `.env` material or unbounded prompt bodies.
Use digests/bounded projections where persistence is necessary.

## AB — Replay model
`READ_ONLY`

## AC — Recovery model
Recovery starts by observing the owning authority.
A mutation is replayed only when its replay class explicitly allows it and the recovery anchor proves it has not already happened.

## AD — Security / threat model
Prevent authority confusion, cross-session/repo/project leakage, stale evidence reuse, duplicate mutation, secret leakage and false attestation.

## AE — Observability
Emit bounded start/result/failure/reason-code observations where useful.
Observability is not authority.

## AF — Interface contract with predecessors
Consumes only the predecessor fields whose semantics are explicitly declared.
Revalidates any field whose freshness/ownership requires it.

## AG — Interface contract with successors
Exports `EffectiveCapabilitySet` with explicit semantics; successor may not silently strengthen it.

## AH — Skip contract
No skip unless the graph contains a deterministic condition and proof source.
If skipped, the route and proof are observable.

## AI — Reobserve contract
Reobserve when required evidence is stale, unavailable-but-recoverable, or an external asynchronous condition may have progressed.

## AJ — Reconcile contract
Reconcile only when multiple authorities/state projections are inconsistent.
Reconcile is not the same as refreshing an observation.

## AK — Blocked behavior
Block only the affected Task/contract/resource scope unless an actual global invariant is violated.

## AL — Compensation / rollback
For pure/read-only contracts: not applicable.
For mutations: use existing rollback/compensation only where real; otherwise forward recovery by observation. Never pretend irreversible GitHub effects are rollbackable.

## AM — Existing system mapping
- **Current mapping:** src/governance/operationalDecision.ts CapabilityReality/GovernanceDecision.
- **Classification:** `REUSE/EXTEND`
- Existing behavior is preserved and wrapped/generalized before new engines are introduced.

## AN — Current hardcodes / generalization
MCP/S1/repository literals and single-repository assumptions must move to TargetContext/configuration where applicable; preserve historical MCP behavior backward-compatibly.

## AO — Future implementation slot
Implement behind a GWC contract module + adapter to existing authority. Exact file placement must follow repository architecture discovered at implementation baseline, not be invented prematurely.

## AP — Test contract
happy path; boundary; NONE/AMBIGUOUS/UNVERIFIED/STALE/CONFLICT as applicable; replay/recovery; security; non-regression; exact binding tests.

## AQ — Property / invariant tests
- Unknown evidence never becomes allow/success.
- Explicit predecessor semantics are preserved.
- No hidden mutation.
- Same normalized input + same evidence ⇒ same semantic result for deterministic profiles.
- Mutation contracts never execute without a valid EffectPlan.

## AR — Acceptance criteria
- Input/output schemas are bounded.
- Owning authorities are explicit.
- Fail-closed paths are tested.
- Replay/recovery behavior is defined.
- No new parallel authority.
- Existing non-regression suite remains green.

## AS — Open questions
No blocking open decision beyond profile-specific implementation details; unresolved choices must stay explicit.

## AT — Architectural findings
- Existing implementation class: `REUSE/EXTEND`.
- Any discovered hardcode is treated as a generalization target, not silently removed.
- Any mismatch between CURRENT and TARGET is explicit.

## AU — Future Task Blueprint mapping
This contract is implemented by one or more governed implementation tasks from `GWC_IMPLEMENTATION_TASK_BLUEPRINTS_R1.md`; implementation dependencies follow the contract graph and authority dependencies rather than numeric GW order alone.

## AV — Execution semantics
`EVALUATE_ONLY`

## AW — Effect Plan
None.

## AX — Routing table
Primary predecessor: GW-10. Primary successor: GW-12. Additional skip/reobserve/reconcile/recovery edges must be declared deterministically.

## AY — Recovery anchor
Read-only contracts: input/evidence snapshot bindings.
Mutation contracts: target reference + task/session + relevant branch/PR/SHA/revision/job ID.

## AZ — Reconstruction rule
On process restart, reconstruct from authoritative stores and observations; do not rely on previous assistant text or a GWC workflow-state database.

## BA — Autonomy behavior
AUTO_CONTINUE when exactly one legal route exists and required evidence is sufficient; WAIT_EXTERNAL/BLOCK_LOCAL/fail-closed otherwise.


---

# GW-12 — BOOTSTRAP_RECEIPT

## A — Identity
- **Contract ID:** `GW-12`
- **Canonical name:** `BOOTSTRAP_RECEIPT`
- **Family:** `C — Governance and Capability Composition`
- **Contract version:** `1` (conceptual baseline)
- **Profile(s):** `PROJECTION`
- **Architectural status:** `REUSE/GENERALIZE`
- **Integration class:** `REUSE/GENERALIZE`

## B — Purpose
Formaliser la responsabilité `BOOTSTRAP_RECEIPT` comme contrat borné, versionné et composable, sans dupliquer les autorités existantes.

**Non-responsibilities:** does not steal ownership from Task Queue, Session, Lock Service, Live State, GitRegistry, GitHub, deploy/runtime or other downstream contracts.

## C — Position in global system
- **Logical predecessor(s):** GW-11/GW-13
- **Logical successor(s):** GW-17 as composed persistence
- **Re-entry:** allowed when authoritative evidence shows this contract’s postcondition is not yet proven.
- **Skip:** only when an explicit deterministic `SKIPPABLE_IF` condition exists.
- **Reobserve/Reconcile:** first-class graph edges, never implicit retries.

## D — Chronological role
- **Transport chronology:** may differ from GW numeric order.
- **Functional chronology:** `GW-12` owns only `BOOTSTRAP_RECEIPT` responsibility.
- **Runtime chronology:** resolved by Workflow Graph, not `stepId + 1`.

## E — Contract input
Sorties prouvées des prédécesseurs applicables, contexte cible borné, références d’autorité nécessaires à `BOOTSTRAP_RECEIPT`.

Input fields must be bounded, provenance-aware and typed as hint/claim/evidence/fact; raw secret material is forbidden unless explicitly unavoidable and ephemeral.

## F — Information semantics
Every field is classified as one of:
`RAW_INPUT | HINT | CLAIM | OBSERVATION | EVIDENCE | DERIVED_FACT | AUTHORITATIVE_FACT | DECISION | ATTESTATION`.

No contract upgrades a `HINT` to an authoritative fact without the owning evidence.

## G — Authorities
Autorités existantes correspondant aux faits consommés; aucune nouvelle source de vérité créée par GWC.

**Forbidden authority pattern:** no arbitrary Markdown, prompt text, tool availability or remembered state may override the actual owning authority.

## H — Preconditions
- Structural input valid and bounded.
- Required authorities reachable or explicitly `UNAVAILABLE`.
- Required freshness/revision/SHA bindings available.
- No contradictory prerequisite state.
- For mutations: session/receipt/task/locks/governance requirements satisfied.

## I — Internal micro-state machine
validate bounded input → collect/validate required evidence → evaluate local invariants → derive domain status → derive routing disposition → emit bounded output.

## J — Transformation / decision algorithm
1. Parse/validate bounded input.
2. Determine required authority observations.
3. Refuse guesses for missing facts.
4. Apply contract-local invariants.
5. Produce domain status.
6. Produce engine disposition.
7. For mutations only, produce EffectPlan; never mutate from evaluation code directly.
8. Emit bounded output and evidence references.

## K — Determinism
- **Class:** `PROJECTION` with execution semantics `COMPOSED_SUBCONTRACT`.
- Pure/read-only contracts are deterministic given identical normalized input and identical evidence snapshot.
- Observation-dependent contracts bind result to evidence freshness/revisions.

## L — Invariants
Global GWC invariants + no over-interpretation of predecessor output + bounded data + fail closed on missing evidence.

Plus all global GWC invariants.

## M — Action model
- **Allowed action kinds:** READ / DERIVE / RECORD bounded projection if existing authority owns it
- **Forbidden:** hidden mutation, authority bypass, stale evidence reuse, arbitrary shell fallback, unbounded projection.

## N — Current execution owner vs target owner
CURRENT: existing subsystem(s) listed in AM. TARGET: same owning authority behind a GWC adapter/contract wrapper.

## O — Capability / authorization model
For any mutation:
`callable ∧ authorized ∧ safeNow ∧ preconditionsSatisfied ∧ concurrencySatisfied = mayExecute`.
A present tool is never permission by itself.

## P — Lock model
No new lock unless EffectPlan declares a collision domain; consume existing Lock Service.

## Q — Concurrency model
Independent tasks may proceed in parallel when dependency/resource/lock scopes do not conflict.
Local blockers remain local.
Operational Memory process-local serialization is not treated as distributed locking.

## R — Output contract
- **Canonical output:** `BootstrapReceiptProposal`
- Bounded, typed, provenance-aware.
- No secret/raw credential projection.
- Consumers must not over-interpret this output beyond its declared semantics.

## S — Terminal statuses
`SUCCESS | NONE | AMBIGUOUS | UNVERIFIED | BLOCKED | CONFLICT | STALE (subset applicable)`

## T — Terminality formula
Success requires all contract-owned postconditions to be proven from current required evidence.
Missing/stale/conflicting evidence maps to fail-closed statuses, never implicit success.

## U — Reason codes
Contract-specific reason codes must be stable, enumerable, bounded and machine-testable.
Every failure/blocking reason must identify whether it is recoverable by reobserve, reconcile, wait or explicit change.

## V — Fail-closed model
Missing/stale/conflicting required evidence never defaults to success or permission. UNKNOWN remains UNKNOWN.

## W — Evidence model
EvidenceEnvelope(s) from the owning authorities with freshness, provenance and relevant SHA/revision binding.

## X — Freshness / staleness
Evidence is bound to relevant `observedAt`, SHA, stateVersion and/or revisions.
A semantic state change invalidates dependent evidence when its contract declares such dependency.

## Y — Attestation model
EPHEMERAL_RESULT_ONLY by default; promote to bounded durable reference only where an existing authority requires durable proof.

## Z — Persistence model
No new GWC store. Persist only through the existing owning authority when the contract is a RECORD/MUTATE step.

## AA — Secret / privacy model
Never persist tokens, resume secrets, raw authorization headers, arbitrary transport IDs, `.env` material or unbounded prompt bodies.
Use digests/bounded projections where persistence is necessary.

## AB — Replay model
`CONDITIONALLY_IDEMPOTENT unless explicitly NON_REPLAYABLE`

## AC — Recovery model
Recovery starts by observing the owning authority.
A mutation is replayed only when its replay class explicitly allows it and the recovery anchor proves it has not already happened.

## AD — Security / threat model
Prevent authority confusion, cross-session/repo/project leakage, stale evidence reuse, duplicate mutation, secret leakage and false attestation.

## AE — Observability
Emit bounded start/result/failure/reason-code observations where useful.
Observability is not authority.

## AF — Interface contract with predecessors
Consumes only the predecessor fields whose semantics are explicitly declared.
Revalidates any field whose freshness/ownership requires it.

## AG — Interface contract with successors
Exports `BootstrapReceiptProposal` with explicit semantics; successor may not silently strengthen it.

## AH — Skip contract
No skip unless the graph contains a deterministic condition and proof source.
If skipped, the route and proof are observable.

## AI — Reobserve contract
Reobserve when required evidence is stale, unavailable-but-recoverable, or an external asynchronous condition may have progressed.

## AJ — Reconcile contract
Reconcile only when multiple authorities/state projections are inconsistent.
Reconcile is not the same as refreshing an observation.

## AK — Blocked behavior
Block only the affected Task/contract/resource scope unless an actual global invariant is violated.

## AL — Compensation / rollback
For pure/read-only contracts: not applicable.
For mutations: use existing rollback/compensation only where real; otherwise forward recovery by observation. Never pretend irreversible GitHub effects are rollbackable.

## AM — Existing system mapping
- **Current mapping:** BootstrapReceipt schema/sessionService.
- **Classification:** `REUSE/GENERALIZE`
- Existing behavior is preserved and wrapped/generalized before new engines are introduced.

## AN — Current hardcodes / generalization
MCP/S1/repository literals and single-repository assumptions must move to TargetContext/configuration where applicable; preserve historical MCP behavior backward-compatibly.

## AO — Future implementation slot
Implement behind a GWC contract module + adapter to existing authority. Exact file placement must follow repository architecture discovered at implementation baseline, not be invented prematurely.

## AP — Test contract
happy path; boundary; NONE/AMBIGUOUS/UNVERIFIED/STALE/CONFLICT as applicable; replay/recovery; security; non-regression; exact binding tests.

## AQ — Property / invariant tests
- Unknown evidence never becomes allow/success.
- Explicit predecessor semantics are preserved.
- No hidden mutation.
- Same normalized input + same evidence ⇒ same semantic result for deterministic profiles.
- Mutation contracts never execute without a valid EffectPlan.

## AR — Acceptance criteria
- Input/output schemas are bounded.
- Owning authorities are explicit.
- Fail-closed paths are tested.
- Replay/recovery behavior is defined.
- No new parallel authority.
- Existing non-regression suite remains green.

## AS — Open questions
No blocking open decision beyond profile-specific implementation details; unresolved choices must stay explicit.

## AT — Architectural findings
- Existing implementation class: `REUSE/GENERALIZE`.
- Any discovered hardcode is treated as a generalization target, not silently removed.
- Any mismatch between CURRENT and TARGET is explicit.

## AU — Future Task Blueprint mapping
This contract is implemented by one or more governed implementation tasks from `GWC_IMPLEMENTATION_TASK_BLUEPRINTS_R1.md`; implementation dependencies follow the contract graph and authority dependencies rather than numeric GW order alone.

## AV — Execution semantics
`COMPOSED_SUBCONTRACT`

## AW — Effect Plan
None.

## AX — Routing table
Primary predecessor: GW-11/GW-13. Primary successor: GW-17 as composed persistence. Additional skip/reobserve/reconcile/recovery edges must be declared deterministically.

## AY — Recovery anchor
Read-only contracts: input/evidence snapshot bindings.
Mutation contracts: target reference + task/session + relevant branch/PR/SHA/revision/job ID.

## AZ — Reconstruction rule
On process restart, reconstruct from authoritative stores and observations; do not rely on previous assistant text or a GWC workflow-state database.

## BA — Autonomy behavior
AUTO_CONTINUE when exactly one legal route exists and required evidence is sufficient; WAIT_EXTERNAL/BLOCK_LOCAL/fail-closed otherwise.


---

# GW-13 — LIVE_STATE_RECONCILIATION

## A — Identity
- **Contract ID:** `GW-13`
- **Canonical name:** `LIVE_STATE_RECONCILIATION`
- **Family:** `D — Work Orchestration`
- **Contract version:** `1` (conceptual baseline)
- **Profile(s):** `RECONCILER`
- **Architectural status:** `REUSE/GENERALIZE`
- **Integration class:** `REUSE/GENERALIZE`

## B — Purpose
Formaliser la responsabilité `LIVE_STATE_RECONCILIATION` comme contrat borné, versionné et composable, sans dupliquer les autorités existantes.

**Non-responsibilities:** does not steal ownership from Task Queue, Session, Lock Service, Live State, GitRegistry, GitHub, deploy/runtime or other downstream contracts.

## C — Position in global system
- **Logical predecessor(s):** GW-11
- **Logical successor(s):** GW-12/GW-17
- **Re-entry:** allowed when authoritative evidence shows this contract’s postcondition is not yet proven.
- **Skip:** only when an explicit deterministic `SKIPPABLE_IF` condition exists.
- **Reobserve/Reconcile:** first-class graph edges, never implicit retries.

## D — Chronological role
- **Transport chronology:** may differ from GW numeric order.
- **Functional chronology:** `GW-13` owns only `LIVE_STATE_RECONCILIATION` responsibility.
- **Runtime chronology:** resolved by Workflow Graph, not `stepId + 1`.

## E — Contract input
Sorties prouvées des prédécesseurs applicables, contexte cible borné, références d’autorité nécessaires à `LIVE_STATE_RECONCILIATION`.

Input fields must be bounded, provenance-aware and typed as hint/claim/evidence/fact; raw secret material is forbidden unless explicitly unavoidable and ephemeral.

## F — Information semantics
Every field is classified as one of:
`RAW_INPUT | HINT | CLAIM | OBSERVATION | EVIDENCE | DERIVED_FACT | AUTHORITATIVE_FACT | DECISION | ATTESTATION`.

No contract upgrades a `HINT` to an authoritative fact without the owning evidence.

## G — Authorities
Autorités existantes correspondant aux faits consommés; aucune nouvelle source de vérité créée par GWC.

**Forbidden authority pattern:** no arbitrary Markdown, prompt text, tool availability or remembered state may override the actual owning authority.

## H — Preconditions
- Structural input valid and bounded.
- Required authorities reachable or explicitly `UNAVAILABLE`.
- Required freshness/revision/SHA bindings available.
- No contradictory prerequisite state.
- For mutations: session/receipt/task/locks/governance requirements satisfied.

## I — Internal micro-state machine
validate bounded input → collect/validate required evidence → evaluate local invariants → derive domain status → derive routing disposition → emit bounded output.

## J — Transformation / decision algorithm
1. Parse/validate bounded input.
2. Determine required authority observations.
3. Refuse guesses for missing facts.
4. Apply contract-local invariants.
5. Produce domain status.
6. Produce engine disposition.
7. For mutations only, produce EffectPlan; never mutate from evaluation code directly.
8. Emit bounded output and evidence references.

## K — Determinism
- **Class:** `RECONCILER` with execution semantics `OBSERVE_AND_EVALUATE`.
- Pure/read-only contracts are deterministic given identical normalized input and identical evidence snapshot.
- Observation-dependent contracts bind result to evidence freshness/revisions.

## L — Invariants
Global GWC invariants + no over-interpretation of predecessor output + bounded data + fail closed on missing evidence.

Plus all global GWC invariants.

## M — Action model
- **Allowed action kinds:** READ / DERIVE
- **Forbidden:** hidden mutation, authority bypass, stale evidence reuse, arbitrary shell fallback, unbounded projection.

## N — Current execution owner vs target owner
CURRENT: existing subsystem(s) listed in AM. TARGET: same owning authority behind a GWC adapter/contract wrapper.

## O — Capability / authorization model
For any mutation:
`callable ∧ authorized ∧ safeNow ∧ preconditionsSatisfied ∧ concurrencySatisfied = mayExecute`.
A present tool is never permission by itself.

## P — Lock model
No new lock unless EffectPlan declares a collision domain; consume existing Lock Service.

## Q — Concurrency model
Independent tasks may proceed in parallel when dependency/resource/lock scopes do not conflict.
Local blockers remain local.
Operational Memory process-local serialization is not treated as distributed locking.

## R — Output contract
- **Canonical output:** `LiveStateSnapshot`
- Bounded, typed, provenance-aware.
- No secret/raw credential projection.
- Consumers must not over-interpret this output beyond its declared semantics.

## S — Terminal statuses
`SUCCESS | NONE | AMBIGUOUS | UNVERIFIED | BLOCKED | CONFLICT | STALE (subset applicable)`

## T — Terminality formula
Success requires all contract-owned postconditions to be proven from current required evidence.
Missing/stale/conflicting evidence maps to fail-closed statuses, never implicit success.

## U — Reason codes
Contract-specific reason codes must be stable, enumerable, bounded and machine-testable.
Every failure/blocking reason must identify whether it is recoverable by reobserve, reconcile, wait or explicit change.

## V — Fail-closed model
Missing/stale/conflicting required evidence never defaults to success or permission. UNKNOWN remains UNKNOWN.

## W — Evidence model
EvidenceEnvelope(s) from the owning authorities with freshness, provenance and relevant SHA/revision binding.

## X — Freshness / staleness
Evidence is bound to relevant `observedAt`, SHA, stateVersion and/or revisions.
A semantic state change invalidates dependent evidence when its contract declares such dependency.

## Y — Attestation model
EPHEMERAL_RESULT_ONLY by default; promote to bounded durable reference only where an existing authority requires durable proof.

## Z — Persistence model
No new GWC store. Persist only through the existing owning authority when the contract is a RECORD/MUTATE step.

## AA — Secret / privacy model
Never persist tokens, resume secrets, raw authorization headers, arbitrary transport IDs, `.env` material or unbounded prompt bodies.
Use digests/bounded projections where persistence is necessary.

## AB — Replay model
`READ_ONLY`

## AC — Recovery model
Recovery starts by observing the owning authority.
A mutation is replayed only when its replay class explicitly allows it and the recovery anchor proves it has not already happened.

## AD — Security / threat model
Prevent authority confusion, cross-session/repo/project leakage, stale evidence reuse, duplicate mutation, secret leakage and false attestation.

## AE — Observability
Emit bounded start/result/failure/reason-code observations where useful.
Observability is not authority.

## AF — Interface contract with predecessors
Consumes only the predecessor fields whose semantics are explicitly declared.
Revalidates any field whose freshness/ownership requires it.

## AG — Interface contract with successors
Exports `LiveStateSnapshot` with explicit semantics; successor may not silently strengthen it.

## AH — Skip contract
No skip unless the graph contains a deterministic condition and proof source.
If skipped, the route and proof are observable.

## AI — Reobserve contract
Reobserve when required evidence is stale, unavailable-but-recoverable, or an external asynchronous condition may have progressed.

## AJ — Reconcile contract
Reconcile only when multiple authorities/state projections are inconsistent.
Reconcile is not the same as refreshing an observation.

## AK — Blocked behavior
Block only the affected Task/contract/resource scope unless an actual global invariant is violated.

## AL — Compensation / rollback
For pure/read-only contracts: not applicable.
For mutations: use existing rollback/compensation only where real; otherwise forward recovery by observation. Never pretend irreversible GitHub effects are rollbackable.

## AM — Existing system mapping
- **Current mapping:** src/liveState/*.
- **Classification:** `REUSE/GENERALIZE`
- Existing behavior is preserved and wrapped/generalized before new engines are introduced.

## AN — Current hardcodes / generalization
MCP/S1/repository literals and single-repository assumptions must move to TargetContext/configuration where applicable; preserve historical MCP behavior backward-compatibly.

## AO — Future implementation slot
Implement behind a GWC contract module + adapter to existing authority. Exact file placement must follow repository architecture discovered at implementation baseline, not be invented prematurely.

## AP — Test contract
happy path; boundary; NONE/AMBIGUOUS/UNVERIFIED/STALE/CONFLICT as applicable; replay/recovery; security; non-regression; exact binding tests.

## AQ — Property / invariant tests
- Unknown evidence never becomes allow/success.
- Explicit predecessor semantics are preserved.
- No hidden mutation.
- Same normalized input + same evidence ⇒ same semantic result for deterministic profiles.
- Mutation contracts never execute without a valid EffectPlan.

## AR — Acceptance criteria
- Input/output schemas are bounded.
- Owning authorities are explicit.
- Fail-closed paths are tested.
- Replay/recovery behavior is defined.
- No new parallel authority.
- Existing non-regression suite remains green.

## AS — Open questions
No blocking open decision beyond profile-specific implementation details; unresolved choices must stay explicit.

## AT — Architectural findings
- Existing implementation class: `REUSE/GENERALIZE`.
- Any discovered hardcode is treated as a generalization target, not silently removed.
- Any mismatch between CURRENT and TARGET is explicit.

## AU — Future Task Blueprint mapping
This contract is implemented by one or more governed implementation tasks from `GWC_IMPLEMENTATION_TASK_BLUEPRINTS_R1.md`; implementation dependencies follow the contract graph and authority dependencies rather than numeric GW order alone.

## AV — Execution semantics
`OBSERVE_AND_EVALUATE`

## AW — Effect Plan
None.

## AX — Routing table
Primary predecessor: GW-11. Primary successor: GW-12/GW-17. Additional skip/reobserve/reconcile/recovery edges must be declared deterministically.

## AY — Recovery anchor
Read-only contracts: input/evidence snapshot bindings.
Mutation contracts: target reference + task/session + relevant branch/PR/SHA/revision/job ID.

## AZ — Reconstruction rule
On process restart, reconstruct from authoritative stores and observations; do not rely on previous assistant text or a GWC workflow-state database.

## BA — Autonomy behavior
AUTO_CONTINUE when exactly one legal route exists and required evidence is sufficient; WAIT_EXTERNAL/BLOCK_LOCAL/fail-closed otherwise.


---

# GW-14 — EXISTING_TASK_LOOKUP

## A — Identity
- **Contract ID:** `GW-14`
- **Canonical name:** `EXISTING_TASK_LOOKUP`
- **Family:** `D — Work Orchestration`
- **Contract version:** `1` (conceptual baseline)
- **Profile(s):** `OBSERVER`
- **Architectural status:** `REUSE/GENERALIZE`
- **Integration class:** `REUSE/GENERALIZE`

## B — Purpose
Formaliser la responsabilité `EXISTING_TASK_LOOKUP` comme contrat borné, versionné et composable, sans dupliquer les autorités existantes.

**Non-responsibilities:** does not steal ownership from Task Queue, Session, Lock Service, Live State, GitRegistry, GitHub, deploy/runtime or other downstream contracts.

## C — Position in global system
- **Logical predecessor(s):** GW-13
- **Logical successor(s):** GW-15
- **Re-entry:** allowed when authoritative evidence shows this contract’s postcondition is not yet proven.
- **Skip:** only when an explicit deterministic `SKIPPABLE_IF` condition exists.
- **Reobserve/Reconcile:** first-class graph edges, never implicit retries.

## D — Chronological role
- **Transport chronology:** may differ from GW numeric order.
- **Functional chronology:** `GW-14` owns only `EXISTING_TASK_LOOKUP` responsibility.
- **Runtime chronology:** resolved by Workflow Graph, not `stepId + 1`.

## E — Contract input
Sorties prouvées des prédécesseurs applicables, contexte cible borné, références d’autorité nécessaires à `EXISTING_TASK_LOOKUP`.

Input fields must be bounded, provenance-aware and typed as hint/claim/evidence/fact; raw secret material is forbidden unless explicitly unavoidable and ephemeral.

## F — Information semantics
Every field is classified as one of:
`RAW_INPUT | HINT | CLAIM | OBSERVATION | EVIDENCE | DERIVED_FACT | AUTHORITATIVE_FACT | DECISION | ATTESTATION`.

No contract upgrades a `HINT` to an authoritative fact without the owning evidence.

## G — Authorities
Autorités existantes correspondant aux faits consommés; aucune nouvelle source de vérité créée par GWC.

**Forbidden authority pattern:** no arbitrary Markdown, prompt text, tool availability or remembered state may override the actual owning authority.

## H — Preconditions
- Structural input valid and bounded.
- Required authorities reachable or explicitly `UNAVAILABLE`.
- Required freshness/revision/SHA bindings available.
- No contradictory prerequisite state.
- For mutations: session/receipt/task/locks/governance requirements satisfied.

## I — Internal micro-state machine
validate bounded input → collect/validate required evidence → evaluate local invariants → derive domain status → derive routing disposition → emit bounded output.

## J — Transformation / decision algorithm
1. Parse/validate bounded input.
2. Determine required authority observations.
3. Refuse guesses for missing facts.
4. Apply contract-local invariants.
5. Produce domain status.
6. Produce engine disposition.
7. For mutations only, produce EffectPlan; never mutate from evaluation code directly.
8. Emit bounded output and evidence references.

## K — Determinism
- **Class:** `OBSERVER` with execution semantics `EVALUATE_ONLY`.
- Pure/read-only contracts are deterministic given identical normalized input and identical evidence snapshot.
- Observation-dependent contracts bind result to evidence freshness/revisions.

## L — Invariants
Global GWC invariants + no over-interpretation of predecessor output + bounded data + fail closed on missing evidence.

Plus all global GWC invariants.

## M — Action model
- **Allowed action kinds:** READ / DERIVE
- **Forbidden:** hidden mutation, authority bypass, stale evidence reuse, arbitrary shell fallback, unbounded projection.

## N — Current execution owner vs target owner
CURRENT: existing subsystem(s) listed in AM. TARGET: same owning authority behind a GWC adapter/contract wrapper.

## O — Capability / authorization model
For any mutation:
`callable ∧ authorized ∧ safeNow ∧ preconditionsSatisfied ∧ concurrencySatisfied = mayExecute`.
A present tool is never permission by itself.

## P — Lock model
No new lock unless EffectPlan declares a collision domain; consume existing Lock Service.

## Q — Concurrency model
Independent tasks may proceed in parallel when dependency/resource/lock scopes do not conflict.
Local blockers remain local.
Operational Memory process-local serialization is not treated as distributed locking.

## R — Output contract
- **Canonical output:** `ExistingTaskLookup`
- Bounded, typed, provenance-aware.
- No secret/raw credential projection.
- Consumers must not over-interpret this output beyond its declared semantics.

## S — Terminal statuses
`SUCCESS | NONE | AMBIGUOUS | UNVERIFIED | BLOCKED | CONFLICT | STALE (subset applicable)`

## T — Terminality formula
Success requires all contract-owned postconditions to be proven from current required evidence.
Missing/stale/conflicting evidence maps to fail-closed statuses, never implicit success.

## U — Reason codes
Contract-specific reason codes must be stable, enumerable, bounded and machine-testable.
Every failure/blocking reason must identify whether it is recoverable by reobserve, reconcile, wait or explicit change.

## V — Fail-closed model
Missing/stale/conflicting required evidence never defaults to success or permission. UNKNOWN remains UNKNOWN.

## W — Evidence model
EvidenceEnvelope(s) from the owning authorities with freshness, provenance and relevant SHA/revision binding.

## X — Freshness / staleness
Evidence is bound to relevant `observedAt`, SHA, stateVersion and/or revisions.
A semantic state change invalidates dependent evidence when its contract declares such dependency.

## Y — Attestation model
EPHEMERAL_RESULT_ONLY by default; promote to bounded durable reference only where an existing authority requires durable proof.

## Z — Persistence model
No new GWC store. Persist only through the existing owning authority when the contract is a RECORD/MUTATE step.

## AA — Secret / privacy model
Never persist tokens, resume secrets, raw authorization headers, arbitrary transport IDs, `.env` material or unbounded prompt bodies.
Use digests/bounded projections where persistence is necessary.

## AB — Replay model
`READ_ONLY`

## AC — Recovery model
Recovery starts by observing the owning authority.
A mutation is replayed only when its replay class explicitly allows it and the recovery anchor proves it has not already happened.

## AD — Security / threat model
Prevent authority confusion, cross-session/repo/project leakage, stale evidence reuse, duplicate mutation, secret leakage and false attestation.

## AE — Observability
Emit bounded start/result/failure/reason-code observations where useful.
Observability is not authority.

## AF — Interface contract with predecessors
Consumes only the predecessor fields whose semantics are explicitly declared.
Revalidates any field whose freshness/ownership requires it.

## AG — Interface contract with successors
Exports `ExistingTaskLookup` with explicit semantics; successor may not silently strengthen it.

## AH — Skip contract
No skip unless the graph contains a deterministic condition and proof source.
If skipped, the route and proof are observable.

## AI — Reobserve contract
Reobserve when required evidence is stale, unavailable-but-recoverable, or an external asynchronous condition may have progressed.

## AJ — Reconcile contract
Reconcile only when multiple authorities/state projections are inconsistent.
Reconcile is not the same as refreshing an observation.

## AK — Blocked behavior
Block only the affected Task/contract/resource scope unless an actual global invariant is violated.

## AL — Compensation / rollback
For pure/read-only contracts: not applicable.
For mutations: use existing rollback/compensation only where real; otherwise forward recovery by observation. Never pretend irreversible GitHub effects are rollbackable.

## AM — Existing system mapping
- **Current mapping:** Task Queue read surfaces/current state.
- **Classification:** `REUSE/GENERALIZE`
- Existing behavior is preserved and wrapped/generalized before new engines are introduced.

## AN — Current hardcodes / generalization
MCP/S1/repository literals and single-repository assumptions must move to TargetContext/configuration where applicable; preserve historical MCP behavior backward-compatibly.

## AO — Future implementation slot
Implement behind a GWC contract module + adapter to existing authority. Exact file placement must follow repository architecture discovered at implementation baseline, not be invented prematurely.

## AP — Test contract
happy path; boundary; NONE/AMBIGUOUS/UNVERIFIED/STALE/CONFLICT as applicable; replay/recovery; security; non-regression; exact binding tests.

## AQ — Property / invariant tests
- Unknown evidence never becomes allow/success.
- Explicit predecessor semantics are preserved.
- No hidden mutation.
- Same normalized input + same evidence ⇒ same semantic result for deterministic profiles.
- Mutation contracts never execute without a valid EffectPlan.

## AR — Acceptance criteria
- Input/output schemas are bounded.
- Owning authorities are explicit.
- Fail-closed paths are tested.
- Replay/recovery behavior is defined.
- No new parallel authority.
- Existing non-regression suite remains green.

## AS — Open questions
No blocking open decision beyond profile-specific implementation details; unresolved choices must stay explicit.

## AT — Architectural findings
- Existing implementation class: `REUSE/GENERALIZE`.
- Any discovered hardcode is treated as a generalization target, not silently removed.
- Any mismatch between CURRENT and TARGET is explicit.

## AU — Future Task Blueprint mapping
This contract is implemented by one or more governed implementation tasks from `GWC_IMPLEMENTATION_TASK_BLUEPRINTS_R1.md`; implementation dependencies follow the contract graph and authority dependencies rather than numeric GW order alone.

## AV — Execution semantics
`EVALUATE_ONLY`

## AW — Effect Plan
None.

## AX — Routing table
Primary predecessor: GW-13. Primary successor: GW-15. Additional skip/reobserve/reconcile/recovery edges must be declared deterministically.

## AY — Recovery anchor
Read-only contracts: input/evidence snapshot bindings.
Mutation contracts: target reference + task/session + relevant branch/PR/SHA/revision/job ID.

## AZ — Reconstruction rule
On process restart, reconstruct from authoritative stores and observations; do not rely on previous assistant text or a GWC workflow-state database.

## BA — Autonomy behavior
AUTO_CONTINUE when exactly one legal route exists and required evidence is sufficient; WAIT_EXTERNAL/BLOCK_LOCAL/fail-closed otherwise.


---

# GW-15 — TASK_CREATION_IF_REQUIRED

## A — Identity
- **Contract ID:** `GW-15`
- **Canonical name:** `TASK_CREATION_IF_REQUIRED`
- **Family:** `D — Work Orchestration`
- **Contract version:** `1` (conceptual baseline)
- **Profile(s):** `TASK_MUTATION`
- **Architectural status:** `REUSE/GENERALIZE`
- **Integration class:** `REUSE/GENERALIZE`

## B — Purpose
Formaliser la responsabilité `TASK_CREATION_IF_REQUIRED` comme contrat borné, versionné et composable, sans dupliquer les autorités existantes.

**Non-responsibilities:** does not steal ownership from Task Queue, Session, Lock Service, Live State, GitRegistry, GitHub, deploy/runtime or other downstream contracts.

## C — Position in global system
- **Logical predecessor(s):** GW-14
- **Logical successor(s):** GW-16
- **Re-entry:** allowed when authoritative evidence shows this contract’s postcondition is not yet proven.
- **Skip:** only when an explicit deterministic `SKIPPABLE_IF` condition exists.
- **Reobserve/Reconcile:** first-class graph edges, never implicit retries.

## D — Chronological role
- **Transport chronology:** may differ from GW numeric order.
- **Functional chronology:** `GW-15` owns only `TASK_CREATION_IF_REQUIRED` responsibility.
- **Runtime chronology:** resolved by Workflow Graph, not `stepId + 1`.

## E — Contract input
Sorties prouvées des prédécesseurs applicables, contexte cible borné, références d’autorité nécessaires à `TASK_CREATION_IF_REQUIRED`.

Input fields must be bounded, provenance-aware and typed as hint/claim/evidence/fact; raw secret material is forbidden unless explicitly unavoidable and ephemeral.

## F — Information semantics
Every field is classified as one of:
`RAW_INPUT | HINT | CLAIM | OBSERVATION | EVIDENCE | DERIVED_FACT | AUTHORITATIVE_FACT | DECISION | ATTESTATION`.

No contract upgrades a `HINT` to an authoritative fact without the owning evidence.

## G — Authorities
Autorités existantes correspondant aux faits consommés; aucune nouvelle source de vérité créée par GWC.

**Forbidden authority pattern:** no arbitrary Markdown, prompt text, tool availability or remembered state may override the actual owning authority.

## H — Preconditions
- Structural input valid and bounded.
- Required authorities reachable or explicitly `UNAVAILABLE`.
- Required freshness/revision/SHA bindings available.
- No contradictory prerequisite state.
- For mutations: session/receipt/task/locks/governance requirements satisfied.

## I — Internal micro-state machine
validate bounded input → collect/validate required evidence → evaluate local invariants → derive domain status → derive routing disposition → emit bounded output.

## J — Transformation / decision algorithm
1. Parse/validate bounded input.
2. Determine required authority observations.
3. Refuse guesses for missing facts.
4. Apply contract-local invariants.
5. Produce domain status.
6. Produce engine disposition.
7. For mutations only, produce EffectPlan; never mutate from evaluation code directly.
8. Emit bounded output and evidence references.

## K — Determinism
- **Class:** `TASK_MUTATION` with execution semantics `EVALUATE_THEN_MUTATE`.
- Pure/read-only contracts are deterministic given identical normalized input and identical evidence snapshot.
- Observation-dependent contracts bind result to evidence freshness/revisions.

## L — Invariants
Global GWC invariants + no over-interpretation of predecessor output + bounded data + fail closed on missing evidence.

Plus all global GWC invariants.

## M — Action model
- **Allowed action kinds:** READ / DERIVE / RECORD / MUTATE
- **Forbidden:** hidden mutation, authority bypass, stale evidence reuse, arbitrary shell fallback, unbounded projection.

## N — Current execution owner vs target owner
CURRENT: existing subsystem(s) listed in AM. TARGET: same owning authority behind a GWC adapter/contract wrapper.

## O — Capability / authorization model
For any mutation:
`callable ∧ authorized ∧ safeNow ∧ preconditionsSatisfied ∧ concurrencySatisfied = mayExecute`.
A present tool is never permission by itself.

## P — Lock model
No new lock unless EffectPlan declares a collision domain; consume existing Lock Service.

## Q — Concurrency model
Independent tasks may proceed in parallel when dependency/resource/lock scopes do not conflict.
Local blockers remain local.
Operational Memory process-local serialization is not treated as distributed locking.

## R — Output contract
- **Canonical output:** `IntentReconciliation`
- Bounded, typed, provenance-aware.
- No secret/raw credential projection.
- Consumers must not over-interpret this output beyond its declared semantics.

## S — Terminal statuses
`SUCCESS | NONE | AMBIGUOUS | UNVERIFIED | BLOCKED | CONFLICT | STALE (subset applicable)`

## T — Terminality formula
Success requires all contract-owned postconditions to be proven from current required evidence.
Missing/stale/conflicting evidence maps to fail-closed statuses, never implicit success.

## U — Reason codes
Contract-specific reason codes must be stable, enumerable, bounded and machine-testable.
Every failure/blocking reason must identify whether it is recoverable by reobserve, reconcile, wait or explicit change.

## V — Fail-closed model
Missing/stale/conflicting required evidence never defaults to success or permission. UNKNOWN remains UNKNOWN.

## W — Evidence model
EvidenceEnvelope(s) from the owning authorities with freshness, provenance and relevant SHA/revision binding.

## X — Freshness / staleness
Evidence is bound to relevant `observedAt`, SHA, stateVersion and/or revisions.
A semantic state change invalidates dependent evidence when its contract declares such dependency.

## Y — Attestation model
EPHEMERAL_RESULT_ONLY by default; promote to bounded durable reference only where an existing authority requires durable proof.

## Z — Persistence model
No new GWC store. Persist only through the existing owning authority when the contract is a RECORD/MUTATE step.

## AA — Secret / privacy model
Never persist tokens, resume secrets, raw authorization headers, arbitrary transport IDs, `.env` material or unbounded prompt bodies.
Use digests/bounded projections where persistence is necessary.

## AB — Replay model
`CONDITIONALLY_IDEMPOTENT unless explicitly NON_REPLAYABLE`

## AC — Recovery model
Recovery starts by observing the owning authority.
A mutation is replayed only when its replay class explicitly allows it and the recovery anchor proves it has not already happened.

## AD — Security / threat model
Prevent authority confusion, cross-session/repo/project leakage, stale evidence reuse, duplicate mutation, secret leakage and false attestation.

## AE — Observability
Emit bounded start/result/failure/reason-code observations where useful.
Observability is not authority.

## AF — Interface contract with predecessors
Consumes only the predecessor fields whose semantics are explicitly declared.
Revalidates any field whose freshness/ownership requires it.

## AG — Interface contract with successors
Exports `IntentReconciliation` with explicit semantics; successor may not silently strengthen it.

## AH — Skip contract
No skip unless the graph contains a deterministic condition and proof source.
If skipped, the route and proof are observable.

## AI — Reobserve contract
Reobserve when required evidence is stale, unavailable-but-recoverable, or an external asynchronous condition may have progressed.

## AJ — Reconcile contract
Reconcile only when multiple authorities/state projections are inconsistent.
Reconcile is not the same as refreshing an observation.

## AK — Blocked behavior
Block only the affected Task/contract/resource scope unless an actual global invariant is violated.

## AL — Compensation / rollback
For pure/read-only contracts: not applicable.
For mutations: use existing rollback/compensation only where real; otherwise forward recovery by observation. Never pretend irreversible GitHub effects are rollbackable.

## AM — Existing system mapping
- **Current mapping:** taskQueue.reconcileIntent().
- **Classification:** `REUSE/GENERALIZE`
- Existing behavior is preserved and wrapped/generalized before new engines are introduced.

## AN — Current hardcodes / generalization
MCP/S1/repository literals and single-repository assumptions must move to TargetContext/configuration where applicable; preserve historical MCP behavior backward-compatibly.

## AO — Future implementation slot
Implement behind a GWC contract module + adapter to existing authority. Exact file placement must follow repository architecture discovered at implementation baseline, not be invented prematurely.

## AP — Test contract
happy path; boundary; NONE/AMBIGUOUS/UNVERIFIED/STALE/CONFLICT as applicable; replay/recovery; security; non-regression; exact binding tests.

## AQ — Property / invariant tests
- Unknown evidence never becomes allow/success.
- Explicit predecessor semantics are preserved.
- No hidden mutation.
- Same normalized input + same evidence ⇒ same semantic result for deterministic profiles.
- Mutation contracts never execute without a valid EffectPlan.

## AR — Acceptance criteria
- Input/output schemas are bounded.
- Owning authorities are explicit.
- Fail-closed paths are tested.
- Replay/recovery behavior is defined.
- No new parallel authority.
- Existing non-regression suite remains green.

## AS — Open questions
No blocking open decision beyond profile-specific implementation details; unresolved choices must stay explicit.

## AT — Architectural findings
- Existing implementation class: `REUSE/GENERALIZE`.
- Any discovered hardcode is treated as a generalization target, not silently removed.
- Any mismatch between CURRENT and TARGET is explicit.

## AU — Future Task Blueprint mapping
This contract is implemented by one or more governed implementation tasks from `GWC_IMPLEMENTATION_TASK_BLUEPRINTS_R1.md`; implementation dependencies follow the contract graph and authority dependencies rather than numeric GW order alone.

## AV — Execution semantics
`EVALUATE_THEN_MUTATE`

## AW — Effect Plan
Must be represented as an explicit EffectPlan with target authority, expected revisions/SHA, lock requirements, replay class, postconditions and recovery anchor.

## AX — Routing table
Primary predecessor: GW-14. Primary successor: GW-16. Additional skip/reobserve/reconcile/recovery edges must be declared deterministically.

## AY — Recovery anchor
Read-only contracts: input/evidence snapshot bindings.
Mutation contracts: target reference + task/session + relevant branch/PR/SHA/revision/job ID.

## AZ — Reconstruction rule
On process restart, reconstruct from authoritative stores and observations; do not rely on previous assistant text or a GWC workflow-state database.

## BA — Autonomy behavior
AUTO_CONTINUE when exactly one legal route exists and required evidence is sufficient; WAIT_EXTERNAL/BLOCK_LOCAL/fail-closed otherwise.


---

# GW-16 — GOVERNED_SESSION_OPEN_OR_RESUME

## A — Identity
- **Contract ID:** `GW-16`
- **Canonical name:** `GOVERNED_SESSION_OPEN_OR_RESUME`
- **Family:** `D — Work Orchestration`
- **Contract version:** `1` (conceptual baseline)
- **Profile(s):** `SESSION_MUTATION`
- **Architectural status:** `REUSE/GENERALIZE`
- **Integration class:** `REUSE/GENERALIZE`

## B — Purpose
Formaliser la responsabilité `GOVERNED_SESSION_OPEN_OR_RESUME` comme contrat borné, versionné et composable, sans dupliquer les autorités existantes.

**Non-responsibilities:** does not steal ownership from Task Queue, Session, Lock Service, Live State, GitRegistry, GitHub, deploy/runtime or other downstream contracts.

## C — Position in global system
- **Logical predecessor(s):** GW-02 if no compatible session
- **Logical successor(s):** GW-03/GW-17
- **Re-entry:** allowed when authoritative evidence shows this contract’s postcondition is not yet proven.
- **Skip:** only when an explicit deterministic `SKIPPABLE_IF` condition exists.
- **Reobserve/Reconcile:** first-class graph edges, never implicit retries.

## D — Chronological role
- **Transport chronology:** may differ from GW numeric order.
- **Functional chronology:** `GW-16` owns only `GOVERNED_SESSION_OPEN_OR_RESUME` responsibility.
- **Runtime chronology:** resolved by Workflow Graph, not `stepId + 1`.

## E — Contract input
Sorties prouvées des prédécesseurs applicables, contexte cible borné, références d’autorité nécessaires à `GOVERNED_SESSION_OPEN_OR_RESUME`.

Input fields must be bounded, provenance-aware and typed as hint/claim/evidence/fact; raw secret material is forbidden unless explicitly unavoidable and ephemeral.

## F — Information semantics
Every field is classified as one of:
`RAW_INPUT | HINT | CLAIM | OBSERVATION | EVIDENCE | DERIVED_FACT | AUTHORITATIVE_FACT | DECISION | ATTESTATION`.

No contract upgrades a `HINT` to an authoritative fact without the owning evidence.

## G — Authorities
Autorités existantes correspondant aux faits consommés; aucune nouvelle source de vérité créée par GWC.

**Forbidden authority pattern:** no arbitrary Markdown, prompt text, tool availability or remembered state may override the actual owning authority.

## H — Preconditions
- Structural input valid and bounded.
- Required authorities reachable or explicitly `UNAVAILABLE`.
- Required freshness/revision/SHA bindings available.
- No contradictory prerequisite state.
- For mutations: session/receipt/task/locks/governance requirements satisfied.

## I — Internal micro-state machine
validate bounded input → collect/validate required evidence → evaluate local invariants → derive domain status → derive routing disposition → emit bounded output.

## J — Transformation / decision algorithm
1. Parse/validate bounded input.
2. Determine required authority observations.
3. Refuse guesses for missing facts.
4. Apply contract-local invariants.
5. Produce domain status.
6. Produce engine disposition.
7. For mutations only, produce EffectPlan; never mutate from evaluation code directly.
8. Emit bounded output and evidence references.

## K — Determinism
- **Class:** `SESSION_MUTATION` with execution semantics `MUTATE_THEN_VERIFY`.
- Pure/read-only contracts are deterministic given identical normalized input and identical evidence snapshot.
- Observation-dependent contracts bind result to evidence freshness/revisions.

## L — Invariants
Global GWC invariants + no over-interpretation of predecessor output + bounded data + fail closed on missing evidence.

Plus all global GWC invariants.

## M — Action model
- **Allowed action kinds:** READ / DERIVE / RECORD / MUTATE
- **Forbidden:** hidden mutation, authority bypass, stale evidence reuse, arbitrary shell fallback, unbounded projection.

## N — Current execution owner vs target owner
CURRENT: existing subsystem(s) listed in AM. TARGET: same owning authority behind a GWC adapter/contract wrapper.

## O — Capability / authorization model
For any mutation:
`callable ∧ authorized ∧ safeNow ∧ preconditionsSatisfied ∧ concurrencySatisfied = mayExecute`.
A present tool is never permission by itself.

## P — Lock model
No new lock unless EffectPlan declares a collision domain; consume existing Lock Service.

## Q — Concurrency model
Independent tasks may proceed in parallel when dependency/resource/lock scopes do not conflict.
Local blockers remain local.
Operational Memory process-local serialization is not treated as distributed locking.

## R — Output contract
- **Canonical output:** `GovernedSession`
- Bounded, typed, provenance-aware.
- No secret/raw credential projection.
- Consumers must not over-interpret this output beyond its declared semantics.

## S — Terminal statuses
`SUCCESS | NONE | AMBIGUOUS | UNVERIFIED | BLOCKED | CONFLICT | STALE (subset applicable)`

## T — Terminality formula
Success requires all contract-owned postconditions to be proven from current required evidence.
Missing/stale/conflicting evidence maps to fail-closed statuses, never implicit success.

## U — Reason codes
Contract-specific reason codes must be stable, enumerable, bounded and machine-testable.
Every failure/blocking reason must identify whether it is recoverable by reobserve, reconcile, wait or explicit change.

## V — Fail-closed model
Missing/stale/conflicting required evidence never defaults to success or permission. UNKNOWN remains UNKNOWN.

## W — Evidence model
EvidenceEnvelope(s) from the owning authorities with freshness, provenance and relevant SHA/revision binding.

## X — Freshness / staleness
Evidence is bound to relevant `observedAt`, SHA, stateVersion and/or revisions.
A semantic state change invalidates dependent evidence when its contract declares such dependency.

## Y — Attestation model
EPHEMERAL_RESULT_ONLY by default; promote to bounded durable reference only where an existing authority requires durable proof.

## Z — Persistence model
No new GWC store. Persist only through the existing owning authority when the contract is a RECORD/MUTATE step.

## AA — Secret / privacy model
Never persist tokens, resume secrets, raw authorization headers, arbitrary transport IDs, `.env` material or unbounded prompt bodies.
Use digests/bounded projections where persistence is necessary.

## AB — Replay model
`CONDITIONALLY_IDEMPOTENT unless explicitly NON_REPLAYABLE`

## AC — Recovery model
Recovery starts by observing the owning authority.
A mutation is replayed only when its replay class explicitly allows it and the recovery anchor proves it has not already happened.

## AD — Security / threat model
Prevent authority confusion, cross-session/repo/project leakage, stale evidence reuse, duplicate mutation, secret leakage and false attestation.

## AE — Observability
Emit bounded start/result/failure/reason-code observations where useful.
Observability is not authority.

## AF — Interface contract with predecessors
Consumes only the predecessor fields whose semantics are explicitly declared.
Revalidates any field whose freshness/ownership requires it.

## AG — Interface contract with successors
Exports `GovernedSession` with explicit semantics; successor may not silently strengthen it.

## AH — Skip contract
No skip unless the graph contains a deterministic condition and proof source.
If skipped, the route and proof are observable.

## AI — Reobserve contract
Reobserve when required evidence is stale, unavailable-but-recoverable, or an external asynchronous condition may have progressed.

## AJ — Reconcile contract
Reconcile only when multiple authorities/state projections are inconsistent.
Reconcile is not the same as refreshing an observation.

## AK — Blocked behavior
Block only the affected Task/contract/resource scope unless an actual global invariant is violated.

## AL — Compensation / rollback
For pure/read-only contracts: not applicable.
For mutations: use existing rollback/compensation only where real; otherwise forward recovery by observation. Never pretend irreversible GitHub effects are rollbackable.

## AM — Existing system mapping
- **Current mapping:** sessionService open/resume/auto-resume.
- **Classification:** `REUSE/GENERALIZE`
- Existing behavior is preserved and wrapped/generalized before new engines are introduced.

## AN — Current hardcodes / generalization
MCP/S1/repository literals and single-repository assumptions must move to TargetContext/configuration where applicable; preserve historical MCP behavior backward-compatibly.

## AO — Future implementation slot
Implement behind a GWC contract module + adapter to existing authority. Exact file placement must follow repository architecture discovered at implementation baseline, not be invented prematurely.

## AP — Test contract
happy path; boundary; NONE/AMBIGUOUS/UNVERIFIED/STALE/CONFLICT as applicable; replay/recovery; security; non-regression; exact binding tests.

## AQ — Property / invariant tests
- Unknown evidence never becomes allow/success.
- Explicit predecessor semantics are preserved.
- No hidden mutation.
- Same normalized input + same evidence ⇒ same semantic result for deterministic profiles.
- Mutation contracts never execute without a valid EffectPlan.

## AR — Acceptance criteria
- Input/output schemas are bounded.
- Owning authorities are explicit.
- Fail-closed paths are tested.
- Replay/recovery behavior is defined.
- No new parallel authority.
- Existing non-regression suite remains green.

## AS — Open questions
No blocking open decision beyond profile-specific implementation details; unresolved choices must stay explicit.

## AT — Architectural findings
- Existing implementation class: `REUSE/GENERALIZE`.
- Any discovered hardcode is treated as a generalization target, not silently removed.
- Any mismatch between CURRENT and TARGET is explicit.

## AU — Future Task Blueprint mapping
This contract is implemented by one or more governed implementation tasks from `GWC_IMPLEMENTATION_TASK_BLUEPRINTS_R1.md`; implementation dependencies follow the contract graph and authority dependencies rather than numeric GW order alone.

## AV — Execution semantics
`MUTATE_THEN_VERIFY`

## AW — Effect Plan
Must be represented as an explicit EffectPlan with target authority, expected revisions/SHA, lock requirements, replay class, postconditions and recovery anchor.

## AX — Routing table
Primary predecessor: GW-02 if no compatible session. Primary successor: GW-03/GW-17. Additional skip/reobserve/reconcile/recovery edges must be declared deterministically.

## AY — Recovery anchor
Read-only contracts: input/evidence snapshot bindings.
Mutation contracts: target reference + task/session + relevant branch/PR/SHA/revision/job ID.

## AZ — Reconstruction rule
On process restart, reconstruct from authoritative stores and observations; do not rely on previous assistant text or a GWC workflow-state database.

## BA — Autonomy behavior
AUTO_CONTINUE when exactly one legal route exists and required evidence is sufficient; WAIT_EXTERNAL/BLOCK_LOCAL/fail-closed otherwise.


---

# GW-17 — CONTEXT_ACKNOWLEDGEMENT

## A — Identity
- **Contract ID:** `GW-17`
- **Canonical name:** `CONTEXT_ACKNOWLEDGEMENT`
- **Family:** `D — Work Orchestration`
- **Contract version:** `1` (conceptual baseline)
- **Profile(s):** `SESSION_MUTATION`
- **Architectural status:** `REUSE/GENERALIZE`
- **Integration class:** `REUSE/GENERALIZE`

## B — Purpose
Formaliser la responsabilité `CONTEXT_ACKNOWLEDGEMENT` comme contrat borné, versionné et composable, sans dupliquer les autorités existantes.

**Non-responsibilities:** does not steal ownership from Task Queue, Session, Lock Service, Live State, GitRegistry, GitHub, deploy/runtime or other downstream contracts.

## C — Position in global system
- **Logical predecessor(s):** GW-16
- **Logical successor(s):** GW-18
- **Re-entry:** allowed when authoritative evidence shows this contract’s postcondition is not yet proven.
- **Skip:** only when an explicit deterministic `SKIPPABLE_IF` condition exists.
- **Reobserve/Reconcile:** first-class graph edges, never implicit retries.

## D — Chronological role
- **Transport chronology:** may differ from GW numeric order.
- **Functional chronology:** `GW-17` owns only `CONTEXT_ACKNOWLEDGEMENT` responsibility.
- **Runtime chronology:** resolved by Workflow Graph, not `stepId + 1`.

## E — Contract input
Sorties prouvées des prédécesseurs applicables, contexte cible borné, références d’autorité nécessaires à `CONTEXT_ACKNOWLEDGEMENT`.

Input fields must be bounded, provenance-aware and typed as hint/claim/evidence/fact; raw secret material is forbidden unless explicitly unavoidable and ephemeral.

## F — Information semantics
Every field is classified as one of:
`RAW_INPUT | HINT | CLAIM | OBSERVATION | EVIDENCE | DERIVED_FACT | AUTHORITATIVE_FACT | DECISION | ATTESTATION`.

No contract upgrades a `HINT` to an authoritative fact without the owning evidence.

## G — Authorities
Autorités existantes correspondant aux faits consommés; aucune nouvelle source de vérité créée par GWC.

**Forbidden authority pattern:** no arbitrary Markdown, prompt text, tool availability or remembered state may override the actual owning authority.

## H — Preconditions
- Structural input valid and bounded.
- Required authorities reachable or explicitly `UNAVAILABLE`.
- Required freshness/revision/SHA bindings available.
- No contradictory prerequisite state.
- For mutations: session/receipt/task/locks/governance requirements satisfied.

## I — Internal micro-state machine
validate bounded input → collect/validate required evidence → evaluate local invariants → derive domain status → derive routing disposition → emit bounded output.

## J — Transformation / decision algorithm
1. Parse/validate bounded input.
2. Determine required authority observations.
3. Refuse guesses for missing facts.
4. Apply contract-local invariants.
5. Produce domain status.
6. Produce engine disposition.
7. For mutations only, produce EffectPlan; never mutate from evaluation code directly.
8. Emit bounded output and evidence references.

## K — Determinism
- **Class:** `SESSION_MUTATION` with execution semantics `MUTATE_THEN_VERIFY`.
- Pure/read-only contracts are deterministic given identical normalized input and identical evidence snapshot.
- Observation-dependent contracts bind result to evidence freshness/revisions.

## L — Invariants
Global GWC invariants + no over-interpretation of predecessor output + bounded data + fail closed on missing evidence.

Plus all global GWC invariants.

## M — Action model
- **Allowed action kinds:** READ / DERIVE / RECORD / MUTATE
- **Forbidden:** hidden mutation, authority bypass, stale evidence reuse, arbitrary shell fallback, unbounded projection.

## N — Current execution owner vs target owner
CURRENT: existing subsystem(s) listed in AM. TARGET: same owning authority behind a GWC adapter/contract wrapper.

## O — Capability / authorization model
For any mutation:
`callable ∧ authorized ∧ safeNow ∧ preconditionsSatisfied ∧ concurrencySatisfied = mayExecute`.
A present tool is never permission by itself.

## P — Lock model
No new lock unless EffectPlan declares a collision domain; consume existing Lock Service.

## Q — Concurrency model
Independent tasks may proceed in parallel when dependency/resource/lock scopes do not conflict.
Local blockers remain local.
Operational Memory process-local serialization is not treated as distributed locking.

## R — Output contract
- **Canonical output:** `AcknowledgedContext`
- Bounded, typed, provenance-aware.
- No secret/raw credential projection.
- Consumers must not over-interpret this output beyond its declared semantics.

## S — Terminal statuses
`SUCCESS | NONE | AMBIGUOUS | UNVERIFIED | BLOCKED | CONFLICT | STALE (subset applicable)`

## T — Terminality formula
Success requires all contract-owned postconditions to be proven from current required evidence.
Missing/stale/conflicting evidence maps to fail-closed statuses, never implicit success.

## U — Reason codes
Contract-specific reason codes must be stable, enumerable, bounded and machine-testable.
Every failure/blocking reason must identify whether it is recoverable by reobserve, reconcile, wait or explicit change.

## V — Fail-closed model
Missing/stale/conflicting required evidence never defaults to success or permission. UNKNOWN remains UNKNOWN.

## W — Evidence model
EvidenceEnvelope(s) from the owning authorities with freshness, provenance and relevant SHA/revision binding.

## X — Freshness / staleness
Evidence is bound to relevant `observedAt`, SHA, stateVersion and/or revisions.
A semantic state change invalidates dependent evidence when its contract declares such dependency.

## Y — Attestation model
EPHEMERAL_RESULT_ONLY by default; promote to bounded durable reference only where an existing authority requires durable proof.

## Z — Persistence model
No new GWC store. Persist only through the existing owning authority when the contract is a RECORD/MUTATE step.

## AA — Secret / privacy model
Never persist tokens, resume secrets, raw authorization headers, arbitrary transport IDs, `.env` material or unbounded prompt bodies.
Use digests/bounded projections where persistence is necessary.

## AB — Replay model
`CONDITIONALLY_IDEMPOTENT unless explicitly NON_REPLAYABLE`

## AC — Recovery model
Recovery starts by observing the owning authority.
A mutation is replayed only when its replay class explicitly allows it and the recovery anchor proves it has not already happened.

## AD — Security / threat model
Prevent authority confusion, cross-session/repo/project leakage, stale evidence reuse, duplicate mutation, secret leakage and false attestation.

## AE — Observability
Emit bounded start/result/failure/reason-code observations where useful.
Observability is not authority.

## AF — Interface contract with predecessors
Consumes only the predecessor fields whose semantics are explicitly declared.
Revalidates any field whose freshness/ownership requires it.

## AG — Interface contract with successors
Exports `AcknowledgedContext` with explicit semantics; successor may not silently strengthen it.

## AH — Skip contract
No skip unless the graph contains a deterministic condition and proof source.
If skipped, the route and proof are observable.

## AI — Reobserve contract
Reobserve when required evidence is stale, unavailable-but-recoverable, or an external asynchronous condition may have progressed.

## AJ — Reconcile contract
Reconcile only when multiple authorities/state projections are inconsistent.
Reconcile is not the same as refreshing an observation.

## AK — Blocked behavior
Block only the affected Task/contract/resource scope unless an actual global invariant is violated.

## AL — Compensation / rollback
For pure/read-only contracts: not applicable.
For mutations: use existing rollback/compensation only where real; otherwise forward recovery by observation. Never pretend irreversible GitHub effects are rollbackable.

## AM — Existing system mapping
- **Current mapping:** sessionService acknowledgeContext().
- **Classification:** `REUSE/GENERALIZE`
- Existing behavior is preserved and wrapped/generalized before new engines are introduced.

## AN — Current hardcodes / generalization
MCP/S1/repository literals and single-repository assumptions must move to TargetContext/configuration where applicable; preserve historical MCP behavior backward-compatibly.

## AO — Future implementation slot
Implement behind a GWC contract module + adapter to existing authority. Exact file placement must follow repository architecture discovered at implementation baseline, not be invented prematurely.

## AP — Test contract
happy path; boundary; NONE/AMBIGUOUS/UNVERIFIED/STALE/CONFLICT as applicable; replay/recovery; security; non-regression; exact binding tests.

## AQ — Property / invariant tests
- Unknown evidence never becomes allow/success.
- Explicit predecessor semantics are preserved.
- No hidden mutation.
- Same normalized input + same evidence ⇒ same semantic result for deterministic profiles.
- Mutation contracts never execute without a valid EffectPlan.

## AR — Acceptance criteria
- Input/output schemas are bounded.
- Owning authorities are explicit.
- Fail-closed paths are tested.
- Replay/recovery behavior is defined.
- No new parallel authority.
- Existing non-regression suite remains green.

## AS — Open questions
No blocking open decision beyond profile-specific implementation details; unresolved choices must stay explicit.

## AT — Architectural findings
- Existing implementation class: `REUSE/GENERALIZE`.
- Any discovered hardcode is treated as a generalization target, not silently removed.
- Any mismatch between CURRENT and TARGET is explicit.

## AU — Future Task Blueprint mapping
This contract is implemented by one or more governed implementation tasks from `GWC_IMPLEMENTATION_TASK_BLUEPRINTS_R1.md`; implementation dependencies follow the contract graph and authority dependencies rather than numeric GW order alone.

## AV — Execution semantics
`MUTATE_THEN_VERIFY`

## AW — Effect Plan
Must be represented as an explicit EffectPlan with target authority, expected revisions/SHA, lock requirements, replay class, postconditions and recovery anchor.

## AX — Routing table
Primary predecessor: GW-16. Primary successor: GW-18. Additional skip/reobserve/reconcile/recovery edges must be declared deterministically.

## AY — Recovery anchor
Read-only contracts: input/evidence snapshot bindings.
Mutation contracts: target reference + task/session + relevant branch/PR/SHA/revision/job ID.

## AZ — Reconstruction rule
On process restart, reconstruct from authoritative stores and observations; do not rely on previous assistant text or a GWC workflow-state database.

## BA — Autonomy behavior
AUTO_CONTINUE when exactly one legal route exists and required evidence is sufficient; WAIT_EXTERNAL/BLOCK_LOCAL/fail-closed otherwise.


---

# GW-18 — TASK_CLAIM

## A — Identity
- **Contract ID:** `GW-18`
- **Canonical name:** `TASK_CLAIM`
- **Family:** `D — Work Orchestration`
- **Contract version:** `1` (conceptual baseline)
- **Profile(s):** `TASK_MUTATION`
- **Architectural status:** `REUSE`
- **Integration class:** `REUSE`

## B — Purpose
Formaliser la responsabilité `TASK_CLAIM` comme contrat borné, versionné et composable, sans dupliquer les autorités existantes.

**Non-responsibilities:** does not steal ownership from Task Queue, Session, Lock Service, Live State, GitRegistry, GitHub, deploy/runtime or other downstream contracts.

## C — Position in global system
- **Logical predecessor(s):** GW-17
- **Logical successor(s):** GW-19
- **Re-entry:** allowed when authoritative evidence shows this contract’s postcondition is not yet proven.
- **Skip:** only when an explicit deterministic `SKIPPABLE_IF` condition exists.
- **Reobserve/Reconcile:** first-class graph edges, never implicit retries.

## D — Chronological role
- **Transport chronology:** may differ from GW numeric order.
- **Functional chronology:** `GW-18` owns only `TASK_CLAIM` responsibility.
- **Runtime chronology:** resolved by Workflow Graph, not `stepId + 1`.

## E — Contract input
Sorties prouvées des prédécesseurs applicables, contexte cible borné, références d’autorité nécessaires à `TASK_CLAIM`.

Input fields must be bounded, provenance-aware and typed as hint/claim/evidence/fact; raw secret material is forbidden unless explicitly unavoidable and ephemeral.

## F — Information semantics
Every field is classified as one of:
`RAW_INPUT | HINT | CLAIM | OBSERVATION | EVIDENCE | DERIVED_FACT | AUTHORITATIVE_FACT | DECISION | ATTESTATION`.

No contract upgrades a `HINT` to an authoritative fact without the owning evidence.

## G — Authorities
Autorités existantes correspondant aux faits consommés; aucune nouvelle source de vérité créée par GWC.

**Forbidden authority pattern:** no arbitrary Markdown, prompt text, tool availability or remembered state may override the actual owning authority.

## H — Preconditions
- Structural input valid and bounded.
- Required authorities reachable or explicitly `UNAVAILABLE`.
- Required freshness/revision/SHA bindings available.
- No contradictory prerequisite state.
- For mutations: session/receipt/task/locks/governance requirements satisfied.

## I — Internal micro-state machine
validate bounded input → collect/validate required evidence → evaluate local invariants → derive domain status → derive routing disposition → emit bounded output.

## J — Transformation / decision algorithm
1. Parse/validate bounded input.
2. Determine required authority observations.
3. Refuse guesses for missing facts.
4. Apply contract-local invariants.
5. Produce domain status.
6. Produce engine disposition.
7. For mutations only, produce EffectPlan; never mutate from evaluation code directly.
8. Emit bounded output and evidence references.

## K — Determinism
- **Class:** `TASK_MUTATION` with execution semantics `MUTATE_THEN_VERIFY`.
- Pure/read-only contracts are deterministic given identical normalized input and identical evidence snapshot.
- Observation-dependent contracts bind result to evidence freshness/revisions.

## L — Invariants
Global GWC invariants + no over-interpretation of predecessor output + bounded data + fail closed on missing evidence.

Plus all global GWC invariants.

## M — Action model
- **Allowed action kinds:** READ / DERIVE / RECORD / MUTATE
- **Forbidden:** hidden mutation, authority bypass, stale evidence reuse, arbitrary shell fallback, unbounded projection.

## N — Current execution owner vs target owner
CURRENT: existing subsystem(s) listed in AM. TARGET: same owning authority behind a GWC adapter/contract wrapper.

## O — Capability / authorization model
For any mutation:
`callable ∧ authorized ∧ safeNow ∧ preconditionsSatisfied ∧ concurrencySatisfied = mayExecute`.
A present tool is never permission by itself.

## P — Lock model
No new lock unless EffectPlan declares a collision domain; consume existing Lock Service.

## Q — Concurrency model
Independent tasks may proceed in parallel when dependency/resource/lock scopes do not conflict.
Local blockers remain local.
Operational Memory process-local serialization is not treated as distributed locking.

## R — Output contract
- **Canonical output:** `ClaimedTask`
- Bounded, typed, provenance-aware.
- No secret/raw credential projection.
- Consumers must not over-interpret this output beyond its declared semantics.

## S — Terminal statuses
`SUCCESS | NONE | AMBIGUOUS | UNVERIFIED | BLOCKED | CONFLICT | STALE (subset applicable)`

## T — Terminality formula
Success requires all contract-owned postconditions to be proven from current required evidence.
Missing/stale/conflicting evidence maps to fail-closed statuses, never implicit success.

## U — Reason codes
Contract-specific reason codes must be stable, enumerable, bounded and machine-testable.
Every failure/blocking reason must identify whether it is recoverable by reobserve, reconcile, wait or explicit change.

## V — Fail-closed model
Missing/stale/conflicting required evidence never defaults to success or permission. UNKNOWN remains UNKNOWN.

## W — Evidence model
EvidenceEnvelope(s) from the owning authorities with freshness, provenance and relevant SHA/revision binding.

## X — Freshness / staleness
Evidence is bound to relevant `observedAt`, SHA, stateVersion and/or revisions.
A semantic state change invalidates dependent evidence when its contract declares such dependency.

## Y — Attestation model
EPHEMERAL_RESULT_ONLY by default; promote to bounded durable reference only where an existing authority requires durable proof.

## Z — Persistence model
No new GWC store. Persist only through the existing owning authority when the contract is a RECORD/MUTATE step.

## AA — Secret / privacy model
Never persist tokens, resume secrets, raw authorization headers, arbitrary transport IDs, `.env` material or unbounded prompt bodies.
Use digests/bounded projections where persistence is necessary.

## AB — Replay model
`CONDITIONALLY_IDEMPOTENT unless explicitly NON_REPLAYABLE`

## AC — Recovery model
Recovery starts by observing the owning authority.
A mutation is replayed only when its replay class explicitly allows it and the recovery anchor proves it has not already happened.

## AD — Security / threat model
Prevent authority confusion, cross-session/repo/project leakage, stale evidence reuse, duplicate mutation, secret leakage and false attestation.

## AE — Observability
Emit bounded start/result/failure/reason-code observations where useful.
Observability is not authority.

## AF — Interface contract with predecessors
Consumes only the predecessor fields whose semantics are explicitly declared.
Revalidates any field whose freshness/ownership requires it.

## AG — Interface contract with successors
Exports `ClaimedTask` with explicit semantics; successor may not silently strengthen it.

## AH — Skip contract
No skip unless the graph contains a deterministic condition and proof source.
If skipped, the route and proof are observable.

## AI — Reobserve contract
Reobserve when required evidence is stale, unavailable-but-recoverable, or an external asynchronous condition may have progressed.

## AJ — Reconcile contract
Reconcile only when multiple authorities/state projections are inconsistent.
Reconcile is not the same as refreshing an observation.

## AK — Blocked behavior
Block only the affected Task/contract/resource scope unless an actual global invariant is violated.

## AL — Compensation / rollback
For pure/read-only contracts: not applicable.
For mutations: use existing rollback/compensation only where real; otherwise forward recovery by observation. Never pretend irreversible GitHub effects are rollbackable.

## AM — Existing system mapping
- **Current mapping:** taskQueue.claimNextTask().
- **Classification:** `REUSE`
- Existing behavior is preserved and wrapped/generalized before new engines are introduced.

## AN — Current hardcodes / generalization
MCP/S1/repository literals and single-repository assumptions must move to TargetContext/configuration where applicable; preserve historical MCP behavior backward-compatibly.

## AO — Future implementation slot
Implement behind a GWC contract module + adapter to existing authority. Exact file placement must follow repository architecture discovered at implementation baseline, not be invented prematurely.

## AP — Test contract
happy path; boundary; NONE/AMBIGUOUS/UNVERIFIED/STALE/CONFLICT as applicable; replay/recovery; security; non-regression; exact binding tests.

## AQ — Property / invariant tests
- Unknown evidence never becomes allow/success.
- Explicit predecessor semantics are preserved.
- No hidden mutation.
- Same normalized input + same evidence ⇒ same semantic result for deterministic profiles.
- Mutation contracts never execute without a valid EffectPlan.

## AR — Acceptance criteria
- Input/output schemas are bounded.
- Owning authorities are explicit.
- Fail-closed paths are tested.
- Replay/recovery behavior is defined.
- No new parallel authority.
- Existing non-regression suite remains green.

## AS — Open questions
No blocking open decision beyond profile-specific implementation details; unresolved choices must stay explicit.

## AT — Architectural findings
- Existing implementation class: `REUSE`.
- Any discovered hardcode is treated as a generalization target, not silently removed.
- Any mismatch between CURRENT and TARGET is explicit.

## AU — Future Task Blueprint mapping
This contract is implemented by one or more governed implementation tasks from `GWC_IMPLEMENTATION_TASK_BLUEPRINTS_R1.md`; implementation dependencies follow the contract graph and authority dependencies rather than numeric GW order alone.

## AV — Execution semantics
`MUTATE_THEN_VERIFY`

## AW — Effect Plan
Must be represented as an explicit EffectPlan with target authority, expected revisions/SHA, lock requirements, replay class, postconditions and recovery anchor.

## AX — Routing table
Primary predecessor: GW-17. Primary successor: GW-19. Additional skip/reobserve/reconcile/recovery edges must be declared deterministically.

## AY — Recovery anchor
Read-only contracts: input/evidence snapshot bindings.
Mutation contracts: target reference + task/session + relevant branch/PR/SHA/revision/job ID.

## AZ — Reconstruction rule
On process restart, reconstruct from authoritative stores and observations; do not rely on previous assistant text or a GWC workflow-state database.

## BA — Autonomy behavior
AUTO_CONTINUE when exactly one legal route exists and required evidence is sufficient; WAIT_EXTERNAL/BLOCK_LOCAL/fail-closed otherwise.


---

# GW-19 — MINIMAL_LOCK_ACQUISITION

## A — Identity
- **Contract ID:** `GW-19`
- **Canonical name:** `MINIMAL_LOCK_ACQUISITION`
- **Family:** `D — Work Orchestration`
- **Contract version:** `1` (conceptual baseline)
- **Profile(s):** `LOCKING`
- **Architectural status:** `REUSE/EXTEND`
- **Integration class:** `REUSE/EXTEND`

## B — Purpose
Acquérir uniquement le domaine de collision minimal requis par l’EffectPlan.

**Non-responsibilities:** does not steal ownership from Task Queue, Session, Lock Service, Live State, GitRegistry, GitHub, deploy/runtime or other downstream contracts.

## C — Position in global system
- **Logical predecessor(s):** GW-18
- **Logical successor(s):** GW-20
- **Re-entry:** allowed when authoritative evidence shows this contract’s postcondition is not yet proven.
- **Skip:** only when an explicit deterministic `SKIPPABLE_IF` condition exists.
- **Reobserve/Reconcile:** first-class graph edges, never implicit retries.

## D — Chronological role
- **Transport chronology:** may differ from GW numeric order.
- **Functional chronology:** `GW-19` owns only `MINIMAL_LOCK_ACQUISITION` responsibility.
- **Runtime chronology:** resolved by Workflow Graph, not `stepId + 1`.

## E — Contract input
EffectPlan + session + existing active locks.

Input fields must be bounded, provenance-aware and typed as hint/claim/evidence/fact; raw secret material is forbidden unless explicitly unavoidable and ephemeral.

## F — Information semantics
Every field is classified as one of:
`RAW_INPUT | HINT | CLAIM | OBSERVATION | EVIDENCE | DERIVED_FACT | AUTHORITATIVE_FACT | DECISION | ATTESTATION`.

No contract upgrades a `HINT` to an authoritative fact without the owning evidence.

## G — Authorities
Lock Store + Governed Session.

**Forbidden authority pattern:** no arbitrary Markdown, prompt text, tool availability or remembered state may override the actual owning authority.

## H — Preconditions
- Structural input valid and bounded.
- Required authorities reachable or explicitly `UNAVAILABLE`.
- Required freshness/revision/SHA bindings available.
- No contradictory prerequisite state.
- For mutations: session/receipt/task/locks/governance requirements satisfied.

## I — Internal micro-state machine
derive collision domain → derive minimal scopes → inspect own locks → detect foreign conflicts → validate revisions → acquire missing → compensate on partial failure → verify ownership.

## J — Transformation / decision algorithm
1. Parse/validate bounded input.
2. Determine required authority observations.
3. Refuse guesses for missing facts.
4. Apply contract-local invariants.
5. Produce domain status.
6. Produce engine disposition.
7. For mutations only, produce EffectPlan; never mutate from evaluation code directly.
8. Emit bounded output and evidence references.

## K — Determinism
- **Class:** `LOCKING` with execution semantics `MUTATE_THEN_VERIFY`.
- Pure/read-only contracts are deterministic given identical normalized input and identical evidence snapshot.
- Observation-dependent contracts bind result to evidence freshness/revisions.

## L — Invariants
no lock bypass; minimal scope; same-session sufficient lock may be reused; foreign exact-scope conflict blocks locally.

Plus all global GWC invariants.

## M — Action model
- **Allowed action kinds:** READ / DERIVE / RECORD / MUTATE
- **Forbidden:** hidden mutation, authority bypass, stale evidence reuse, arbitrary shell fallback, unbounded projection.

## N — Current execution owner vs target owner
CURRENT: existing subsystem(s) listed in AM. TARGET: same owning authority behind a GWC adapter/contract wrapper.

## O — Capability / authorization model
For any mutation:
`callable ∧ authorized ∧ safeNow ∧ preconditionsSatisfied ∧ concurrencySatisfied = mayExecute`.
A present tool is never permission by itself.

## P — Lock model
repository/task/resource; multi-lock order must be deterministic.

## Q — Concurrency model
Independent tasks may proceed in parallel when dependency/resource/lock scopes do not conflict.
Local blockers remain local.
Operational Memory process-local serialization is not treated as distributed locking.

## R — Output contract
- **Canonical output:** `AcquiredLockSet`
- Bounded, typed, provenance-aware.
- No secret/raw credential projection.
- Consumers must not over-interpret this output beyond its declared semantics.

## S — Terminal statuses
`ACQUIRED | SATISFIED_BY_EXISTING | CONFLICT | STALE | UNVERIFIED`

## T — Terminality formula
Success requires all contract-owned postconditions to be proven from current required evidence.
Missing/stale/conflicting evidence maps to fail-closed statuses, never implicit success.

## U — Reason codes
Contract-specific reason codes must be stable, enumerable, bounded and machine-testable.
Every failure/blocking reason must identify whether it is recoverable by reobserve, reconcile, wait or explicit change.

## V — Fail-closed model
Missing/stale/conflicting required evidence never defaults to success or permission. UNKNOWN remains UNKNOWN.

## W — Evidence model
lockId, scope, owner session, revision, TTL/expiry.

## X — Freshness / staleness
Evidence is bound to relevant `observedAt`, SHA, stateVersion and/or revisions.
A semantic state change invalidates dependent evidence when its contract declares such dependency.

## Y — Attestation model
EPHEMERAL_RESULT_ONLY by default; promote to bounded durable reference only where an existing authority requires durable proof.

## Z — Persistence model
No new GWC store. Persist only through the existing owning authority when the contract is a RECORD/MUTATE step.

## AA — Secret / privacy model
Never persist tokens, resume secrets, raw authorization headers, arbitrary transport IDs, `.env` material or unbounded prompt bodies.
Use digests/bounded projections where persistence is necessary.

## AB — Replay model
`CONDITIONALLY_IDEMPOTENT`

## AC — Recovery model
Recovery starts by observing the owning authority.
A mutation is replayed only when its replay class explicitly allows it and the recovery anchor proves it has not already happened.

## AD — Security / threat model
Prevent authority confusion, cross-session/repo/project leakage, stale evidence reuse, duplicate mutation, secret leakage and false attestation.

## AE — Observability
Emit bounded start/result/failure/reason-code observations where useful.
Observability is not authority.

## AF — Interface contract with predecessors
Consumes only the predecessor fields whose semantics are explicitly declared.
Revalidates any field whose freshness/ownership requires it.

## AG — Interface contract with successors
Exports `AcquiredLockSet` with explicit semantics; successor may not silently strengthen it.

## AH — Skip contract
No skip unless the graph contains a deterministic condition and proof source.
If skipped, the route and proof are observable.

## AI — Reobserve contract
Reobserve when required evidence is stale, unavailable-but-recoverable, or an external asynchronous condition may have progressed.

## AJ — Reconcile contract
Reconcile only when multiple authorities/state projections are inconsistent.
Reconcile is not the same as refreshing an observation.

## AK — Blocked behavior
Block only the affected Task/contract/resource scope unless an actual global invariant is violated.

## AL — Compensation / rollback
For pure/read-only contracts: not applicable.
For mutations: use existing rollback/compensation only where real; otherwise forward recovery by observation. Never pretend irreversible GitHub effects are rollbackable.

## AM — Existing system mapping
- **Current mapping:** lockService.ts.
- **Classification:** `REUSE/EXTEND`
- Existing behavior is preserved and wrapped/generalized before new engines are introduced.

## AN — Current hardcodes / generalization
MCP/S1/repository literals and single-repository assumptions must move to TargetContext/configuration where applicable; preserve historical MCP behavior backward-compatibly.

## AO — Future implementation slot
Implement behind a GWC contract module + adapter to existing authority. Exact file placement must follow repository architecture discovered at implementation baseline, not be invented prematurely.

## AP — Test contract
happy path; boundary; NONE/AMBIGUOUS/UNVERIFIED/STALE/CONFLICT as applicable; replay/recovery; security; non-regression; exact binding tests.

## AQ — Property / invariant tests
- Unknown evidence never becomes allow/success.
- Explicit predecessor semantics are preserved.
- No hidden mutation.
- Same normalized input + same evidence ⇒ same semantic result for deterministic profiles.
- Mutation contracts never execute without a valid EffectPlan.

## AR — Acceptance criteria
- Input/output schemas are bounded.
- Owning authorities are explicit.
- Fail-closed paths are tested.
- Replay/recovery behavior is defined.
- No new parallel authority.
- Existing non-regression suite remains green.

## AS — Open questions
OD-05 multi-lock atomicity/batch policy.

## AT — Architectural findings
- Existing implementation class: `REUSE/EXTEND`.
- Any discovered hardcode is treated as a generalization target, not silently removed.
- Any mismatch between CURRENT and TARGET is explicit.

## AU — Future Task Blueprint mapping
This contract is implemented by one or more governed implementation tasks from `GWC_IMPLEMENTATION_TASK_BLUEPRINTS_R1.md`; implementation dependencies follow the contract graph and authority dependencies rather than numeric GW order alone.

## AV — Execution semantics
`MUTATE_THEN_VERIFY`

## AW — Effect Plan
Must be represented as an explicit EffectPlan with target authority, expected revisions/SHA, lock requirements, replay class, postconditions and recovery anchor.

## AX — Routing table
Primary predecessor: GW-18. Primary successor: GW-20. Additional skip/reobserve/reconcile/recovery edges must be declared deterministically.

## AY — Recovery anchor
Read-only contracts: input/evidence snapshot bindings.
Mutation contracts: target reference + task/session + relevant branch/PR/SHA/revision/job ID.

## AZ — Reconstruction rule
On process restart, reconstruct from authoritative stores and observations; do not rely on previous assistant text or a GWC workflow-state database.

## BA — Autonomy behavior
AUTO_CONTINUE when exactly one legal route exists and required evidence is sufficient; WAIT_EXTERNAL/BLOCK_LOCAL/fail-closed otherwise.


---

# GW-20 — TASK_IN_PROGRESS

## A — Identity
- **Contract ID:** `GW-20`
- **Canonical name:** `TASK_IN_PROGRESS`
- **Family:** `D — Work Orchestration`
- **Contract version:** `1` (conceptual baseline)
- **Profile(s):** `TASK_MUTATION`
- **Architectural status:** `REUSE`
- **Integration class:** `REUSE`

## B — Purpose
Formaliser la responsabilité `TASK_IN_PROGRESS` comme contrat borné, versionné et composable, sans dupliquer les autorités existantes.

**Non-responsibilities:** does not steal ownership from Task Queue, Session, Lock Service, Live State, GitRegistry, GitHub, deploy/runtime or other downstream contracts.

## C — Position in global system
- **Logical predecessor(s):** GW-19
- **Logical successor(s):** GW-21
- **Re-entry:** allowed when authoritative evidence shows this contract’s postcondition is not yet proven.
- **Skip:** only when an explicit deterministic `SKIPPABLE_IF` condition exists.
- **Reobserve/Reconcile:** first-class graph edges, never implicit retries.

## D — Chronological role
- **Transport chronology:** may differ from GW numeric order.
- **Functional chronology:** `GW-20` owns only `TASK_IN_PROGRESS` responsibility.
- **Runtime chronology:** resolved by Workflow Graph, not `stepId + 1`.

## E — Contract input
Sorties prouvées des prédécesseurs applicables, contexte cible borné, références d’autorité nécessaires à `TASK_IN_PROGRESS`.

Input fields must be bounded, provenance-aware and typed as hint/claim/evidence/fact; raw secret material is forbidden unless explicitly unavoidable and ephemeral.

## F — Information semantics
Every field is classified as one of:
`RAW_INPUT | HINT | CLAIM | OBSERVATION | EVIDENCE | DERIVED_FACT | AUTHORITATIVE_FACT | DECISION | ATTESTATION`.

No contract upgrades a `HINT` to an authoritative fact without the owning evidence.

## G — Authorities
Autorités existantes correspondant aux faits consommés; aucune nouvelle source de vérité créée par GWC.

**Forbidden authority pattern:** no arbitrary Markdown, prompt text, tool availability or remembered state may override the actual owning authority.

## H — Preconditions
- Structural input valid and bounded.
- Required authorities reachable or explicitly `UNAVAILABLE`.
- Required freshness/revision/SHA bindings available.
- No contradictory prerequisite state.
- For mutations: session/receipt/task/locks/governance requirements satisfied.

## I — Internal micro-state machine
validate bounded input → collect/validate required evidence → evaluate local invariants → derive domain status → derive routing disposition → emit bounded output.

## J — Transformation / decision algorithm
1. Parse/validate bounded input.
2. Determine required authority observations.
3. Refuse guesses for missing facts.
4. Apply contract-local invariants.
5. Produce domain status.
6. Produce engine disposition.
7. For mutations only, produce EffectPlan; never mutate from evaluation code directly.
8. Emit bounded output and evidence references.

## K — Determinism
- **Class:** `TASK_MUTATION` with execution semantics `MUTATE_THEN_VERIFY`.
- Pure/read-only contracts are deterministic given identical normalized input and identical evidence snapshot.
- Observation-dependent contracts bind result to evidence freshness/revisions.

## L — Invariants
Global GWC invariants + no over-interpretation of predecessor output + bounded data + fail closed on missing evidence.

Plus all global GWC invariants.

## M — Action model
- **Allowed action kinds:** READ / DERIVE / RECORD / MUTATE
- **Forbidden:** hidden mutation, authority bypass, stale evidence reuse, arbitrary shell fallback, unbounded projection.

## N — Current execution owner vs target owner
CURRENT: existing subsystem(s) listed in AM. TARGET: same owning authority behind a GWC adapter/contract wrapper.

## O — Capability / authorization model
For any mutation:
`callable ∧ authorized ∧ safeNow ∧ preconditionsSatisfied ∧ concurrencySatisfied = mayExecute`.
A present tool is never permission by itself.

## P — Lock model
No new lock unless EffectPlan declares a collision domain; consume existing Lock Service.

## Q — Concurrency model
Independent tasks may proceed in parallel when dependency/resource/lock scopes do not conflict.
Local blockers remain local.
Operational Memory process-local serialization is not treated as distributed locking.

## R — Output contract
- **Canonical output:** `InProgressTask`
- Bounded, typed, provenance-aware.
- No secret/raw credential projection.
- Consumers must not over-interpret this output beyond its declared semantics.

## S — Terminal statuses
`SUCCESS | NONE | AMBIGUOUS | UNVERIFIED | BLOCKED | CONFLICT | STALE (subset applicable)`

## T — Terminality formula
Success requires all contract-owned postconditions to be proven from current required evidence.
Missing/stale/conflicting evidence maps to fail-closed statuses, never implicit success.

## U — Reason codes
Contract-specific reason codes must be stable, enumerable, bounded and machine-testable.
Every failure/blocking reason must identify whether it is recoverable by reobserve, reconcile, wait or explicit change.

## V — Fail-closed model
Missing/stale/conflicting required evidence never defaults to success or permission. UNKNOWN remains UNKNOWN.

## W — Evidence model
EvidenceEnvelope(s) from the owning authorities with freshness, provenance and relevant SHA/revision binding.

## X — Freshness / staleness
Evidence is bound to relevant `observedAt`, SHA, stateVersion and/or revisions.
A semantic state change invalidates dependent evidence when its contract declares such dependency.

## Y — Attestation model
EPHEMERAL_RESULT_ONLY by default; promote to bounded durable reference only where an existing authority requires durable proof.

## Z — Persistence model
No new GWC store. Persist only through the existing owning authority when the contract is a RECORD/MUTATE step.

## AA — Secret / privacy model
Never persist tokens, resume secrets, raw authorization headers, arbitrary transport IDs, `.env` material or unbounded prompt bodies.
Use digests/bounded projections where persistence is necessary.

## AB — Replay model
`CONDITIONALLY_IDEMPOTENT unless explicitly NON_REPLAYABLE`

## AC — Recovery model
Recovery starts by observing the owning authority.
A mutation is replayed only when its replay class explicitly allows it and the recovery anchor proves it has not already happened.

## AD — Security / threat model
Prevent authority confusion, cross-session/repo/project leakage, stale evidence reuse, duplicate mutation, secret leakage and false attestation.

## AE — Observability
Emit bounded start/result/failure/reason-code observations where useful.
Observability is not authority.

## AF — Interface contract with predecessors
Consumes only the predecessor fields whose semantics are explicitly declared.
Revalidates any field whose freshness/ownership requires it.

## AG — Interface contract with successors
Exports `InProgressTask` with explicit semantics; successor may not silently strengthen it.

## AH — Skip contract
No skip unless the graph contains a deterministic condition and proof source.
If skipped, the route and proof are observable.

## AI — Reobserve contract
Reobserve when required evidence is stale, unavailable-but-recoverable, or an external asynchronous condition may have progressed.

## AJ — Reconcile contract
Reconcile only when multiple authorities/state projections are inconsistent.
Reconcile is not the same as refreshing an observation.

## AK — Blocked behavior
Block only the affected Task/contract/resource scope unless an actual global invariant is violated.

## AL — Compensation / rollback
For pure/read-only contracts: not applicable.
For mutations: use existing rollback/compensation only where real; otherwise forward recovery by observation. Never pretend irreversible GitHub effects are rollbackable.

## AM — Existing system mapping
- **Current mapping:** taskQueue.transitionTask().
- **Classification:** `REUSE`
- Existing behavior is preserved and wrapped/generalized before new engines are introduced.

## AN — Current hardcodes / generalization
MCP/S1/repository literals and single-repository assumptions must move to TargetContext/configuration where applicable; preserve historical MCP behavior backward-compatibly.

## AO — Future implementation slot
Implement behind a GWC contract module + adapter to existing authority. Exact file placement must follow repository architecture discovered at implementation baseline, not be invented prematurely.

## AP — Test contract
happy path; boundary; NONE/AMBIGUOUS/UNVERIFIED/STALE/CONFLICT as applicable; replay/recovery; security; non-regression; exact binding tests.

## AQ — Property / invariant tests
- Unknown evidence never becomes allow/success.
- Explicit predecessor semantics are preserved.
- No hidden mutation.
- Same normalized input + same evidence ⇒ same semantic result for deterministic profiles.
- Mutation contracts never execute without a valid EffectPlan.

## AR — Acceptance criteria
- Input/output schemas are bounded.
- Owning authorities are explicit.
- Fail-closed paths are tested.
- Replay/recovery behavior is defined.
- No new parallel authority.
- Existing non-regression suite remains green.

## AS — Open questions
No blocking open decision beyond profile-specific implementation details; unresolved choices must stay explicit.

## AT — Architectural findings
- Existing implementation class: `REUSE`.
- Any discovered hardcode is treated as a generalization target, not silently removed.
- Any mismatch between CURRENT and TARGET is explicit.

## AU — Future Task Blueprint mapping
This contract is implemented by one or more governed implementation tasks from `GWC_IMPLEMENTATION_TASK_BLUEPRINTS_R1.md`; implementation dependencies follow the contract graph and authority dependencies rather than numeric GW order alone.

## AV — Execution semantics
`MUTATE_THEN_VERIFY`

## AW — Effect Plan
Must be represented as an explicit EffectPlan with target authority, expected revisions/SHA, lock requirements, replay class, postconditions and recovery anchor.

## AX — Routing table
Primary predecessor: GW-19. Primary successor: GW-21. Additional skip/reobserve/reconcile/recovery edges must be declared deterministically.

## AY — Recovery anchor
Read-only contracts: input/evidence snapshot bindings.
Mutation contracts: target reference + task/session + relevant branch/PR/SHA/revision/job ID.

## AZ — Reconstruction rule
On process restart, reconstruct from authoritative stores and observations; do not rely on previous assistant text or a GWC workflow-state database.

## BA — Autonomy behavior
AUTO_CONTINUE when exactly one legal route exists and required evidence is sufficient; WAIT_EXTERNAL/BLOCK_LOCAL/fail-closed otherwise.


---

# GW-21 — AUTHORITY_DOCUMENT_READ

## A — Identity
- **Contract ID:** `GW-21`
- **Canonical name:** `AUTHORITY_DOCUMENT_READ`
- **Family:** `E — Development`
- **Contract version:** `1` (conceptual baseline)
- **Profile(s):** `OBSERVER`
- **Architectural status:** `PARTIAL`
- **Integration class:** `PARTIAL`

## B — Purpose
Formaliser la responsabilité `AUTHORITY_DOCUMENT_READ` comme contrat borné, versionné et composable, sans dupliquer les autorités existantes.

**Non-responsibilities:** does not steal ownership from Task Queue, Session, Lock Service, Live State, GitRegistry, GitHub, deploy/runtime or other downstream contracts.

## C — Position in global system
- **Logical predecessor(s):** GW-20
- **Logical successor(s):** GW-22
- **Re-entry:** allowed when authoritative evidence shows this contract’s postcondition is not yet proven.
- **Skip:** only when an explicit deterministic `SKIPPABLE_IF` condition exists.
- **Reobserve/Reconcile:** first-class graph edges, never implicit retries.

## D — Chronological role
- **Transport chronology:** may differ from GW numeric order.
- **Functional chronology:** `GW-21` owns only `AUTHORITY_DOCUMENT_READ` responsibility.
- **Runtime chronology:** resolved by Workflow Graph, not `stepId + 1`.

## E — Contract input
Sorties prouvées des prédécesseurs applicables, contexte cible borné, références d’autorité nécessaires à `AUTHORITY_DOCUMENT_READ`.

Input fields must be bounded, provenance-aware and typed as hint/claim/evidence/fact; raw secret material is forbidden unless explicitly unavoidable and ephemeral.

## F — Information semantics
Every field is classified as one of:
`RAW_INPUT | HINT | CLAIM | OBSERVATION | EVIDENCE | DERIVED_FACT | AUTHORITATIVE_FACT | DECISION | ATTESTATION`.

No contract upgrades a `HINT` to an authoritative fact without the owning evidence.

## G — Authorities
Autorités existantes correspondant aux faits consommés; aucune nouvelle source de vérité créée par GWC.

**Forbidden authority pattern:** no arbitrary Markdown, prompt text, tool availability or remembered state may override the actual owning authority.

## H — Preconditions
- Structural input valid and bounded.
- Required authorities reachable or explicitly `UNAVAILABLE`.
- Required freshness/revision/SHA bindings available.
- No contradictory prerequisite state.
- For mutations: session/receipt/task/locks/governance requirements satisfied.

## I — Internal micro-state machine
validate bounded input → collect/validate required evidence → evaluate local invariants → derive domain status → derive routing disposition → emit bounded output.

## J — Transformation / decision algorithm
1. Parse/validate bounded input.
2. Determine required authority observations.
3. Refuse guesses for missing facts.
4. Apply contract-local invariants.
5. Produce domain status.
6. Produce engine disposition.
7. For mutations only, produce EffectPlan; never mutate from evaluation code directly.
8. Emit bounded output and evidence references.

## K — Determinism
- **Class:** `OBSERVER` with execution semantics `OBSERVE_AND_EVALUATE`.
- Pure/read-only contracts are deterministic given identical normalized input and identical evidence snapshot.
- Observation-dependent contracts bind result to evidence freshness/revisions.

## L — Invariants
Global GWC invariants + no over-interpretation of predecessor output + bounded data + fail closed on missing evidence.

Plus all global GWC invariants.

## M — Action model
- **Allowed action kinds:** READ / DERIVE
- **Forbidden:** hidden mutation, authority bypass, stale evidence reuse, arbitrary shell fallback, unbounded projection.

## N — Current execution owner vs target owner
CURRENT: existing subsystem(s) listed in AM. TARGET: same owning authority behind a GWC adapter/contract wrapper.

## O — Capability / authorization model
For any mutation:
`callable ∧ authorized ∧ safeNow ∧ preconditionsSatisfied ∧ concurrencySatisfied = mayExecute`.
A present tool is never permission by itself.

## P — Lock model
No new lock unless EffectPlan declares a collision domain; consume existing Lock Service.

## Q — Concurrency model
Independent tasks may proceed in parallel when dependency/resource/lock scopes do not conflict.
Local blockers remain local.
Operational Memory process-local serialization is not treated as distributed locking.

## R — Output contract
- **Canonical output:** `AuthorityDocumentSet`
- Bounded, typed, provenance-aware.
- No secret/raw credential projection.
- Consumers must not over-interpret this output beyond its declared semantics.

## S — Terminal statuses
`SUCCESS | NONE | AMBIGUOUS | UNVERIFIED | BLOCKED | CONFLICT | STALE (subset applicable)`

## T — Terminality formula
Success requires all contract-owned postconditions to be proven from current required evidence.
Missing/stale/conflicting evidence maps to fail-closed statuses, never implicit success.

## U — Reason codes
Contract-specific reason codes must be stable, enumerable, bounded and machine-testable.
Every failure/blocking reason must identify whether it is recoverable by reobserve, reconcile, wait or explicit change.

## V — Fail-closed model
Missing/stale/conflicting required evidence never defaults to success or permission. UNKNOWN remains UNKNOWN.

## W — Evidence model
EvidenceEnvelope(s) from the owning authorities with freshness, provenance and relevant SHA/revision binding.

## X — Freshness / staleness
Evidence is bound to relevant `observedAt`, SHA, stateVersion and/or revisions.
A semantic state change invalidates dependent evidence when its contract declares such dependency.

## Y — Attestation model
EPHEMERAL_RESULT_ONLY by default; promote to bounded durable reference only where an existing authority requires durable proof.

## Z — Persistence model
No new GWC store. Persist only through the existing owning authority when the contract is a RECORD/MUTATE step.

## AA — Secret / privacy model
Never persist tokens, resume secrets, raw authorization headers, arbitrary transport IDs, `.env` material or unbounded prompt bodies.
Use digests/bounded projections where persistence is necessary.

## AB — Replay model
`READ_ONLY`

## AC — Recovery model
Recovery starts by observing the owning authority.
A mutation is replayed only when its replay class explicitly allows it and the recovery anchor proves it has not already happened.

## AD — Security / threat model
Prevent authority confusion, cross-session/repo/project leakage, stale evidence reuse, duplicate mutation, secret leakage and false attestation.

## AE — Observability
Emit bounded start/result/failure/reason-code observations where useful.
Observability is not authority.

## AF — Interface contract with predecessors
Consumes only the predecessor fields whose semantics are explicitly declared.
Revalidates any field whose freshness/ownership requires it.

## AG — Interface contract with successors
Exports `AuthorityDocumentSet` with explicit semantics; successor may not silently strengthen it.

## AH — Skip contract
No skip unless the graph contains a deterministic condition and proof source.
If skipped, the route and proof are observable.

## AI — Reobserve contract
Reobserve when required evidence is stale, unavailable-but-recoverable, or an external asynchronous condition may have progressed.

## AJ — Reconcile contract
Reconcile only when multiple authorities/state projections are inconsistent.
Reconcile is not the same as refreshing an observation.

## AK — Blocked behavior
Block only the affected Task/contract/resource scope unless an actual global invariant is violated.

## AL — Compensation / rollback
For pure/read-only contracts: not applicable.
For mutations: use existing rollback/compensation only where real; otherwise forward recovery by observation. Never pretend irreversible GitHub effects are rollbackable.

## AM — Existing system mapping
- **Current mapping:** CLAUDE.md/.mcp/docs/current state; procedural today.
- **Classification:** `PARTIAL`
- Existing behavior is preserved and wrapped/generalized before new engines are introduced.

## AN — Current hardcodes / generalization
MCP/S1/repository literals and single-repository assumptions must move to TargetContext/configuration where applicable; preserve historical MCP behavior backward-compatibly.

## AO — Future implementation slot
Implement behind a GWC contract module + adapter to existing authority. Exact file placement must follow repository architecture discovered at implementation baseline, not be invented prematurely.

## AP — Test contract
happy path; boundary; NONE/AMBIGUOUS/UNVERIFIED/STALE/CONFLICT as applicable; replay/recovery; security; non-regression; exact binding tests.

## AQ — Property / invariant tests
- Unknown evidence never becomes allow/success.
- Explicit predecessor semantics are preserved.
- No hidden mutation.
- Same normalized input + same evidence ⇒ same semantic result for deterministic profiles.
- Mutation contracts never execute without a valid EffectPlan.

## AR — Acceptance criteria
- Input/output schemas are bounded.
- Owning authorities are explicit.
- Fail-closed paths are tested.
- Replay/recovery behavior is defined.
- No new parallel authority.
- Existing non-regression suite remains green.

## AS — Open questions
No blocking open decision beyond profile-specific implementation details; unresolved choices must stay explicit.

## AT — Architectural findings
- Existing implementation class: `PARTIAL`.
- Any discovered hardcode is treated as a generalization target, not silently removed.
- Any mismatch between CURRENT and TARGET is explicit.

## AU — Future Task Blueprint mapping
This contract is implemented by one or more governed implementation tasks from `GWC_IMPLEMENTATION_TASK_BLUEPRINTS_R1.md`; implementation dependencies follow the contract graph and authority dependencies rather than numeric GW order alone.

## AV — Execution semantics
`OBSERVE_AND_EVALUATE`

## AW — Effect Plan
None.

## AX — Routing table
Primary predecessor: GW-20. Primary successor: GW-22. Additional skip/reobserve/reconcile/recovery edges must be declared deterministically.

## AY — Recovery anchor
Read-only contracts: input/evidence snapshot bindings.
Mutation contracts: target reference + task/session + relevant branch/PR/SHA/revision/job ID.

## AZ — Reconstruction rule
On process restart, reconstruct from authoritative stores and observations; do not rely on previous assistant text or a GWC workflow-state database.

## BA — Autonomy behavior
AUTO_CONTINUE when exactly one legal route exists and required evidence is sufficient; WAIT_EXTERNAL/BLOCK_LOCAL/fail-closed otherwise.


---

# GW-22 — INTEGRATION_SLOT_RESOLUTION

## A — Identity
- **Contract ID:** `GW-22`
- **Canonical name:** `INTEGRATION_SLOT_RESOLUTION`
- **Family:** `E — Development`
- **Contract version:** `1` (conceptual baseline)
- **Profile(s):** `DERIVER`
- **Architectural status:** `PARTIAL/EXTEND`
- **Integration class:** `PARTIAL/EXTEND`

## B — Purpose
Formaliser la responsabilité `INTEGRATION_SLOT_RESOLUTION` comme contrat borné, versionné et composable, sans dupliquer les autorités existantes.

**Non-responsibilities:** does not steal ownership from Task Queue, Session, Lock Service, Live State, GitRegistry, GitHub, deploy/runtime or other downstream contracts.

## C — Position in global system
- **Logical predecessor(s):** GW-21
- **Logical successor(s):** GW-23
- **Re-entry:** allowed when authoritative evidence shows this contract’s postcondition is not yet proven.
- **Skip:** only when an explicit deterministic `SKIPPABLE_IF` condition exists.
- **Reobserve/Reconcile:** first-class graph edges, never implicit retries.

## D — Chronological role
- **Transport chronology:** may differ from GW numeric order.
- **Functional chronology:** `GW-22` owns only `INTEGRATION_SLOT_RESOLUTION` responsibility.
- **Runtime chronology:** resolved by Workflow Graph, not `stepId + 1`.

## E — Contract input
Sorties prouvées des prédécesseurs applicables, contexte cible borné, références d’autorité nécessaires à `INTEGRATION_SLOT_RESOLUTION`.

Input fields must be bounded, provenance-aware and typed as hint/claim/evidence/fact; raw secret material is forbidden unless explicitly unavoidable and ephemeral.

## F — Information semantics
Every field is classified as one of:
`RAW_INPUT | HINT | CLAIM | OBSERVATION | EVIDENCE | DERIVED_FACT | AUTHORITATIVE_FACT | DECISION | ATTESTATION`.

No contract upgrades a `HINT` to an authoritative fact without the owning evidence.

## G — Authorities
Autorités existantes correspondant aux faits consommés; aucune nouvelle source de vérité créée par GWC.

**Forbidden authority pattern:** no arbitrary Markdown, prompt text, tool availability or remembered state may override the actual owning authority.

## H — Preconditions
- Structural input valid and bounded.
- Required authorities reachable or explicitly `UNAVAILABLE`.
- Required freshness/revision/SHA bindings available.
- No contradictory prerequisite state.
- For mutations: session/receipt/task/locks/governance requirements satisfied.

## I — Internal micro-state machine
validate bounded input → collect/validate required evidence → evaluate local invariants → derive domain status → derive routing disposition → emit bounded output.

## J — Transformation / decision algorithm
1. Parse/validate bounded input.
2. Determine required authority observations.
3. Refuse guesses for missing facts.
4. Apply contract-local invariants.
5. Produce domain status.
6. Produce engine disposition.
7. For mutations only, produce EffectPlan; never mutate from evaluation code directly.
8. Emit bounded output and evidence references.

## K — Determinism
- **Class:** `DERIVER` with execution semantics `EVALUATE_ONLY`.
- Pure/read-only contracts are deterministic given identical normalized input and identical evidence snapshot.
- Observation-dependent contracts bind result to evidence freshness/revisions.

## L — Invariants
Global GWC invariants + no over-interpretation of predecessor output + bounded data + fail closed on missing evidence.

Plus all global GWC invariants.

## M — Action model
- **Allowed action kinds:** READ / DERIVE
- **Forbidden:** hidden mutation, authority bypass, stale evidence reuse, arbitrary shell fallback, unbounded projection.

## N — Current execution owner vs target owner
CURRENT: existing subsystem(s) listed in AM. TARGET: same owning authority behind a GWC adapter/contract wrapper.

## O — Capability / authorization model
For any mutation:
`callable ∧ authorized ∧ safeNow ∧ preconditionsSatisfied ∧ concurrencySatisfied = mayExecute`.
A present tool is never permission by itself.

## P — Lock model
No new lock unless EffectPlan declares a collision domain; consume existing Lock Service.

## Q — Concurrency model
Independent tasks may proceed in parallel when dependency/resource/lock scopes do not conflict.
Local blockers remain local.
Operational Memory process-local serialization is not treated as distributed locking.

## R — Output contract
- **Canonical output:** `IntegrationSlot`
- Bounded, typed, provenance-aware.
- No secret/raw credential projection.
- Consumers must not over-interpret this output beyond its declared semantics.

## S — Terminal statuses
`SUCCESS | NONE | AMBIGUOUS | UNVERIFIED | BLOCKED | CONFLICT | STALE (subset applicable)`

## T — Terminality formula
Success requires all contract-owned postconditions to be proven from current required evidence.
Missing/stale/conflicting evidence maps to fail-closed statuses, never implicit success.

## U — Reason codes
Contract-specific reason codes must be stable, enumerable, bounded and machine-testable.
Every failure/blocking reason must identify whether it is recoverable by reobserve, reconcile, wait or explicit change.

## V — Fail-closed model
Missing/stale/conflicting required evidence never defaults to success or permission. UNKNOWN remains UNKNOWN.

## W — Evidence model
EvidenceEnvelope(s) from the owning authorities with freshness, provenance and relevant SHA/revision binding.

## X — Freshness / staleness
Evidence is bound to relevant `observedAt`, SHA, stateVersion and/or revisions.
A semantic state change invalidates dependent evidence when its contract declares such dependency.

## Y — Attestation model
EPHEMERAL_RESULT_ONLY by default; promote to bounded durable reference only where an existing authority requires durable proof.

## Z — Persistence model
No new GWC store. Persist only through the existing owning authority when the contract is a RECORD/MUTATE step.

## AA — Secret / privacy model
Never persist tokens, resume secrets, raw authorization headers, arbitrary transport IDs, `.env` material or unbounded prompt bodies.
Use digests/bounded projections where persistence is necessary.

## AB — Replay model
`READ_ONLY`

## AC — Recovery model
Recovery starts by observing the owning authority.
A mutation is replayed only when its replay class explicitly allows it and the recovery anchor proves it has not already happened.

## AD — Security / threat model
Prevent authority confusion, cross-session/repo/project leakage, stale evidence reuse, duplicate mutation, secret leakage and false attestation.

## AE — Observability
Emit bounded start/result/failure/reason-code observations where useful.
Observability is not authority.

## AF — Interface contract with predecessors
Consumes only the predecessor fields whose semantics are explicitly declared.
Revalidates any field whose freshness/ownership requires it.

## AG — Interface contract with successors
Exports `IntegrationSlot` with explicit semantics; successor may not silently strengthen it.

## AH — Skip contract
No skip unless the graph contains a deterministic condition and proof source.
If skipped, the route and proof are observable.

## AI — Reobserve contract
Reobserve when required evidence is stale, unavailable-but-recoverable, or an external asynchronous condition may have progressed.

## AJ — Reconcile contract
Reconcile only when multiple authorities/state projections are inconsistent.
Reconcile is not the same as refreshing an observation.

## AK — Blocked behavior
Block only the affected Task/contract/resource scope unless an actual global invariant is violated.

## AL — Compensation / rollback
For pure/read-only contracts: not applicable.
For mutations: use existing rollback/compensation only where real; otherwise forward recovery by observation. Never pretend irreversible GitHub effects are rollbackable.

## AM — Existing system mapping
- **Current mapping:** Current State architecture/modules/imports/routes; no formal slot resolver.
- **Classification:** `PARTIAL/EXTEND`
- Existing behavior is preserved and wrapped/generalized before new engines are introduced.

## AN — Current hardcodes / generalization
MCP/S1/repository literals and single-repository assumptions must move to TargetContext/configuration where applicable; preserve historical MCP behavior backward-compatibly.

## AO — Future implementation slot
Implement behind a GWC contract module + adapter to existing authority. Exact file placement must follow repository architecture discovered at implementation baseline, not be invented prematurely.

## AP — Test contract
happy path; boundary; NONE/AMBIGUOUS/UNVERIFIED/STALE/CONFLICT as applicable; replay/recovery; security; non-regression; exact binding tests.

## AQ — Property / invariant tests
- Unknown evidence never becomes allow/success.
- Explicit predecessor semantics are preserved.
- No hidden mutation.
- Same normalized input + same evidence ⇒ same semantic result for deterministic profiles.
- Mutation contracts never execute without a valid EffectPlan.

## AR — Acceptance criteria
- Input/output schemas are bounded.
- Owning authorities are explicit.
- Fail-closed paths are tested.
- Replay/recovery behavior is defined.
- No new parallel authority.
- Existing non-regression suite remains green.

## AS — Open questions
No blocking open decision beyond profile-specific implementation details; unresolved choices must stay explicit.

## AT — Architectural findings
- Existing implementation class: `PARTIAL/EXTEND`.
- Any discovered hardcode is treated as a generalization target, not silently removed.
- Any mismatch between CURRENT and TARGET is explicit.

## AU — Future Task Blueprint mapping
This contract is implemented by one or more governed implementation tasks from `GWC_IMPLEMENTATION_TASK_BLUEPRINTS_R1.md`; implementation dependencies follow the contract graph and authority dependencies rather than numeric GW order alone.

## AV — Execution semantics
`EVALUATE_ONLY`

## AW — Effect Plan
None.

## AX — Routing table
Primary predecessor: GW-21. Primary successor: GW-23. Additional skip/reobserve/reconcile/recovery edges must be declared deterministically.

## AY — Recovery anchor
Read-only contracts: input/evidence snapshot bindings.
Mutation contracts: target reference + task/session + relevant branch/PR/SHA/revision/job ID.

## AZ — Reconstruction rule
On process restart, reconstruct from authoritative stores and observations; do not rely on previous assistant text or a GWC workflow-state database.

## BA — Autonomy behavior
AUTO_CONTINUE when exactly one legal route exists and required evidence is sufficient; WAIT_EXTERNAL/BLOCK_LOCAL/fail-closed otherwise.


---

# GW-23 — EXACT_GITHUB_BASELINE

## A — Identity
- **Contract ID:** `GW-23`
- **Canonical name:** `EXACT_GITHUB_BASELINE`
- **Family:** `E — Development`
- **Contract version:** `1` (conceptual baseline)
- **Profile(s):** `GIT_OBSERVER`
- **Architectural status:** `PARTIAL/REUSE`
- **Integration class:** `PARTIAL/REUSE`

## B — Purpose
Formaliser la responsabilité `EXACT_GITHUB_BASELINE` comme contrat borné, versionné et composable, sans dupliquer les autorités existantes.

**Non-responsibilities:** does not steal ownership from Task Queue, Session, Lock Service, Live State, GitRegistry, GitHub, deploy/runtime or other downstream contracts.

## C — Position in global system
- **Logical predecessor(s):** GW-22
- **Logical successor(s):** GW-24
- **Re-entry:** allowed when authoritative evidence shows this contract’s postcondition is not yet proven.
- **Skip:** only when an explicit deterministic `SKIPPABLE_IF` condition exists.
- **Reobserve/Reconcile:** first-class graph edges, never implicit retries.

## D — Chronological role
- **Transport chronology:** may differ from GW numeric order.
- **Functional chronology:** `GW-23` owns only `EXACT_GITHUB_BASELINE` responsibility.
- **Runtime chronology:** resolved by Workflow Graph, not `stepId + 1`.

## E — Contract input
Sorties prouvées des prédécesseurs applicables, contexte cible borné, références d’autorité nécessaires à `EXACT_GITHUB_BASELINE`.

Input fields must be bounded, provenance-aware and typed as hint/claim/evidence/fact; raw secret material is forbidden unless explicitly unavoidable and ephemeral.

## F — Information semantics
Every field is classified as one of:
`RAW_INPUT | HINT | CLAIM | OBSERVATION | EVIDENCE | DERIVED_FACT | AUTHORITATIVE_FACT | DECISION | ATTESTATION`.

No contract upgrades a `HINT` to an authoritative fact without the owning evidence.

## G — Authorities
Autorités existantes correspondant aux faits consommés; aucune nouvelle source de vérité créée par GWC.

**Forbidden authority pattern:** no arbitrary Markdown, prompt text, tool availability or remembered state may override the actual owning authority.

## H — Preconditions
- Structural input valid and bounded.
- Required authorities reachable or explicitly `UNAVAILABLE`.
- Required freshness/revision/SHA bindings available.
- No contradictory prerequisite state.
- For mutations: session/receipt/task/locks/governance requirements satisfied.

## I — Internal micro-state machine
validate bounded input → collect/validate required evidence → evaluate local invariants → derive domain status → derive routing disposition → emit bounded output.

## J — Transformation / decision algorithm
1. Parse/validate bounded input.
2. Determine required authority observations.
3. Refuse guesses for missing facts.
4. Apply contract-local invariants.
5. Produce domain status.
6. Produce engine disposition.
7. For mutations only, produce EffectPlan; never mutate from evaluation code directly.
8. Emit bounded output and evidence references.

## K — Determinism
- **Class:** `GIT_OBSERVER` with execution semantics `OBSERVE_AND_EVALUATE`.
- Pure/read-only contracts are deterministic given identical normalized input and identical evidence snapshot.
- Observation-dependent contracts bind result to evidence freshness/revisions.

## L — Invariants
Global GWC invariants + no over-interpretation of predecessor output + bounded data + fail closed on missing evidence.

Plus all global GWC invariants.

## M — Action model
- **Allowed action kinds:** READ / DERIVE
- **Forbidden:** hidden mutation, authority bypass, stale evidence reuse, arbitrary shell fallback, unbounded projection.

## N — Current execution owner vs target owner
CURRENT: existing subsystem(s) listed in AM. TARGET: same owning authority behind a GWC adapter/contract wrapper.

## O — Capability / authorization model
For any mutation:
`callable ∧ authorized ∧ safeNow ∧ preconditionsSatisfied ∧ concurrencySatisfied = mayExecute`.
A present tool is never permission by itself.

## P — Lock model
No new lock unless EffectPlan declares a collision domain; consume existing Lock Service.

## Q — Concurrency model
Independent tasks may proceed in parallel when dependency/resource/lock scopes do not conflict.
Local blockers remain local.
Operational Memory process-local serialization is not treated as distributed locking.

## R — Output contract
- **Canonical output:** `GithubBaseline`
- Bounded, typed, provenance-aware.
- No secret/raw credential projection.
- Consumers must not over-interpret this output beyond its declared semantics.

## S — Terminal statuses
`SUCCESS | NONE | AMBIGUOUS | UNVERIFIED | BLOCKED | CONFLICT | STALE (subset applicable)`

## T — Terminality formula
Success requires all contract-owned postconditions to be proven from current required evidence.
Missing/stale/conflicting evidence maps to fail-closed statuses, never implicit success.

## U — Reason codes
Contract-specific reason codes must be stable, enumerable, bounded and machine-testable.
Every failure/blocking reason must identify whether it is recoverable by reobserve, reconcile, wait or explicit change.

## V — Fail-closed model
Missing/stale/conflicting required evidence never defaults to success or permission. UNKNOWN remains UNKNOWN.

## W — Evidence model
EvidenceEnvelope(s) from the owning authorities with freshness, provenance and relevant SHA/revision binding.

## X — Freshness / staleness
Evidence is bound to relevant `observedAt`, SHA, stateVersion and/or revisions.
A semantic state change invalidates dependent evidence when its contract declares such dependency.

## Y — Attestation model
EPHEMERAL_RESULT_ONLY by default; promote to bounded durable reference only where an existing authority requires durable proof.

## Z — Persistence model
No new GWC store. Persist only through the existing owning authority when the contract is a RECORD/MUTATE step.

## AA — Secret / privacy model
Never persist tokens, resume secrets, raw authorization headers, arbitrary transport IDs, `.env` material or unbounded prompt bodies.
Use digests/bounded projections where persistence is necessary.

## AB — Replay model
`READ_ONLY`

## AC — Recovery model
Recovery starts by observing the owning authority.
A mutation is replayed only when its replay class explicitly allows it and the recovery anchor proves it has not already happened.

## AD — Security / threat model
Prevent authority confusion, cross-session/repo/project leakage, stale evidence reuse, duplicate mutation, secret leakage and false attestation.

## AE — Observability
Emit bounded start/result/failure/reason-code observations where useful.
Observability is not authority.

## AF — Interface contract with predecessors
Consumes only the predecessor fields whose semantics are explicitly declared.
Revalidates any field whose freshness/ownership requires it.

## AG — Interface contract with successors
Exports `GithubBaseline` with explicit semantics; successor may not silently strengthen it.

## AH — Skip contract
No skip unless the graph contains a deterministic condition and proof source.
If skipped, the route and proof are observable.

## AI — Reobserve contract
Reobserve when required evidence is stale, unavailable-but-recoverable, or an external asynchronous condition may have progressed.

## AJ — Reconcile contract
Reconcile only when multiple authorities/state projections are inconsistent.
Reconcile is not the same as refreshing an observation.

## AK — Blocked behavior
Block only the affected Task/contract/resource scope unless an actual global invariant is violated.

## AL — Compensation / rollback
For pure/read-only contracts: not applicable.
For mutations: use existing rollback/compensation only where real; otherwise forward recovery by observation. Never pretend irreversible GitHub effects are rollbackable.

## AM — Existing system mapping
- **Current mapping:** GovernedContext GitHub/Live State observations.
- **Classification:** `PARTIAL/REUSE`
- Existing behavior is preserved and wrapped/generalized before new engines are introduced.

## AN — Current hardcodes / generalization
MCP/S1/repository literals and single-repository assumptions must move to TargetContext/configuration where applicable; preserve historical MCP behavior backward-compatibly.

## AO — Future implementation slot
Implement behind a GWC contract module + adapter to existing authority. Exact file placement must follow repository architecture discovered at implementation baseline, not be invented prematurely.

## AP — Test contract
happy path; boundary; NONE/AMBIGUOUS/UNVERIFIED/STALE/CONFLICT as applicable; replay/recovery; security; non-regression; exact binding tests.

## AQ — Property / invariant tests
- Unknown evidence never becomes allow/success.
- Explicit predecessor semantics are preserved.
- No hidden mutation.
- Same normalized input + same evidence ⇒ same semantic result for deterministic profiles.
- Mutation contracts never execute without a valid EffectPlan.

## AR — Acceptance criteria
- Input/output schemas are bounded.
- Owning authorities are explicit.
- Fail-closed paths are tested.
- Replay/recovery behavior is defined.
- No new parallel authority.
- Existing non-regression suite remains green.

## AS — Open questions
No blocking open decision beyond profile-specific implementation details; unresolved choices must stay explicit.

## AT — Architectural findings
- Existing implementation class: `PARTIAL/REUSE`.
- Any discovered hardcode is treated as a generalization target, not silently removed.
- Any mismatch between CURRENT and TARGET is explicit.

## AU — Future Task Blueprint mapping
This contract is implemented by one or more governed implementation tasks from `GWC_IMPLEMENTATION_TASK_BLUEPRINTS_R1.md`; implementation dependencies follow the contract graph and authority dependencies rather than numeric GW order alone.

## AV — Execution semantics
`OBSERVE_AND_EVALUATE`

## AW — Effect Plan
None.

## AX — Routing table
Primary predecessor: GW-22. Primary successor: GW-24. Additional skip/reobserve/reconcile/recovery edges must be declared deterministically.

## AY — Recovery anchor
Read-only contracts: input/evidence snapshot bindings.
Mutation contracts: target reference + task/session + relevant branch/PR/SHA/revision/job ID.

## AZ — Reconstruction rule
On process restart, reconstruct from authoritative stores and observations; do not rely on previous assistant text or a GWC workflow-state database.

## BA — Autonomy behavior
AUTO_CONTINUE when exactly one legal route exists and required evidence is sufficient; WAIT_EXTERNAL/BLOCK_LOCAL/fail-closed otherwise.


---

# GW-24 — GOVERNED_BRANCH_CREATION

## A — Identity
- **Contract ID:** `GW-24`
- **Canonical name:** `GOVERNED_BRANCH_CREATION`
- **Family:** `E — Development`
- **Contract version:** `1` (conceptual baseline)
- **Profile(s):** `GIT_MUTATION`
- **Architectural status:** `CANDIDATE`
- **Integration class:** `CANDIDATE`

## B — Purpose
Formaliser la responsabilité `GOVERNED_BRANCH_CREATION` comme contrat borné, versionné et composable, sans dupliquer les autorités existantes.

**Non-responsibilities:** does not steal ownership from Task Queue, Session, Lock Service, Live State, GitRegistry, GitHub, deploy/runtime or other downstream contracts.

## C — Position in global system
- **Logical predecessor(s):** GW-23
- **Logical successor(s):** GW-25
- **Re-entry:** allowed when authoritative evidence shows this contract’s postcondition is not yet proven.
- **Skip:** only when an explicit deterministic `SKIPPABLE_IF` condition exists.
- **Reobserve/Reconcile:** first-class graph edges, never implicit retries.

## D — Chronological role
- **Transport chronology:** may differ from GW numeric order.
- **Functional chronology:** `GW-24` owns only `GOVERNED_BRANCH_CREATION` responsibility.
- **Runtime chronology:** resolved by Workflow Graph, not `stepId + 1`.

## E — Contract input
Sorties prouvées des prédécesseurs applicables, contexte cible borné, références d’autorité nécessaires à `GOVERNED_BRANCH_CREATION`.

Input fields must be bounded, provenance-aware and typed as hint/claim/evidence/fact; raw secret material is forbidden unless explicitly unavoidable and ephemeral.

## F — Information semantics
Every field is classified as one of:
`RAW_INPUT | HINT | CLAIM | OBSERVATION | EVIDENCE | DERIVED_FACT | AUTHORITATIVE_FACT | DECISION | ATTESTATION`.

No contract upgrades a `HINT` to an authoritative fact without the owning evidence.

## G — Authorities
Autorités existantes correspondant aux faits consommés; aucune nouvelle source de vérité créée par GWC.

**Forbidden authority pattern:** no arbitrary Markdown, prompt text, tool availability or remembered state may override the actual owning authority.

## H — Preconditions
- Structural input valid and bounded.
- Required authorities reachable or explicitly `UNAVAILABLE`.
- Required freshness/revision/SHA bindings available.
- No contradictory prerequisite state.
- For mutations: session/receipt/task/locks/governance requirements satisfied.

## I — Internal micro-state machine
validate bounded input → collect/validate required evidence → evaluate local invariants → derive domain status → derive routing disposition → emit bounded output.

## J — Transformation / decision algorithm
1. Parse/validate bounded input.
2. Determine required authority observations.
3. Refuse guesses for missing facts.
4. Apply contract-local invariants.
5. Produce domain status.
6. Produce engine disposition.
7. For mutations only, produce EffectPlan; never mutate from evaluation code directly.
8. Emit bounded output and evidence references.

## K — Determinism
- **Class:** `GIT_MUTATION` with execution semantics `MUTATE_THEN_VERIFY`.
- Pure/read-only contracts are deterministic given identical normalized input and identical evidence snapshot.
- Observation-dependent contracts bind result to evidence freshness/revisions.

## L — Invariants
Global GWC invariants + no over-interpretation of predecessor output + bounded data + fail closed on missing evidence.

Plus all global GWC invariants.

## M — Action model
- **Allowed action kinds:** READ / DERIVE / RECORD / MUTATE
- **Forbidden:** hidden mutation, authority bypass, stale evidence reuse, arbitrary shell fallback, unbounded projection.

## N — Current execution owner vs target owner
CURRENT: existing subsystem(s) listed in AM. TARGET: same owning authority behind a GWC adapter/contract wrapper.

## O — Capability / authorization model
For any mutation:
`callable ∧ authorized ∧ safeNow ∧ preconditionsSatisfied ∧ concurrencySatisfied = mayExecute`.
A present tool is never permission by itself.

## P — Lock model
No new lock unless EffectPlan declares a collision domain; consume existing Lock Service.

## Q — Concurrency model
Independent tasks may proceed in parallel when dependency/resource/lock scopes do not conflict.
Local blockers remain local.
Operational Memory process-local serialization is not treated as distributed locking.

## R — Output contract
- **Canonical output:** `BranchMutationResult`
- Bounded, typed, provenance-aware.
- No secret/raw credential projection.
- Consumers must not over-interpret this output beyond its declared semantics.

## S — Terminal statuses
`SUCCESS | NONE | AMBIGUOUS | UNVERIFIED | BLOCKED | CONFLICT | STALE (subset applicable)`

## T — Terminality formula
Success requires all contract-owned postconditions to be proven from current required evidence.
Missing/stale/conflicting evidence maps to fail-closed statuses, never implicit success.

## U — Reason codes
Contract-specific reason codes must be stable, enumerable, bounded and machine-testable.
Every failure/blocking reason must identify whether it is recoverable by reobserve, reconcile, wait or explicit change.

## V — Fail-closed model
Missing/stale/conflicting required evidence never defaults to success or permission. UNKNOWN remains UNKNOWN.

## W — Evidence model
EvidenceEnvelope(s) from the owning authorities with freshness, provenance and relevant SHA/revision binding.

## X — Freshness / staleness
Evidence is bound to relevant `observedAt`, SHA, stateVersion and/or revisions.
A semantic state change invalidates dependent evidence when its contract declares such dependency.

## Y — Attestation model
EPHEMERAL_RESULT_ONLY by default; promote to bounded durable reference only where an existing authority requires durable proof.

## Z — Persistence model
No new GWC store. Persist only through the existing owning authority when the contract is a RECORD/MUTATE step.

## AA — Secret / privacy model
Never persist tokens, resume secrets, raw authorization headers, arbitrary transport IDs, `.env` material or unbounded prompt bodies.
Use digests/bounded projections where persistence is necessary.

## AB — Replay model
`CONDITIONALLY_IDEMPOTENT unless explicitly NON_REPLAYABLE`

## AC — Recovery model
Recovery starts by observing the owning authority.
A mutation is replayed only when its replay class explicitly allows it and the recovery anchor proves it has not already happened.

## AD — Security / threat model
Prevent authority confusion, cross-session/repo/project leakage, stale evidence reuse, duplicate mutation, secret leakage and false attestation.

## AE — Observability
Emit bounded start/result/failure/reason-code observations where useful.
Observability is not authority.

## AF — Interface contract with predecessors
Consumes only the predecessor fields whose semantics are explicitly declared.
Revalidates any field whose freshness/ownership requires it.

## AG — Interface contract with successors
Exports `BranchMutationResult` with explicit semantics; successor may not silently strengthen it.

## AH — Skip contract
No skip unless the graph contains a deterministic condition and proof source.
If skipped, the route and proof are observable.

## AI — Reobserve contract
Reobserve when required evidence is stale, unavailable-but-recoverable, or an external asynchronous condition may have progressed.

## AJ — Reconcile contract
Reconcile only when multiple authorities/state projections are inconsistent.
Reconcile is not the same as refreshing an observation.

## AK — Blocked behavior
Block only the affected Task/contract/resource scope unless an actual global invariant is violated.

## AL — Compensation / rollback
For pure/read-only contracts: not applicable.
For mutations: use existing rollback/compensation only where real; otherwise forward recovery by observation. Never pretend irreversible GitHub effects are rollbackable.

## AM — Existing system mapping
- **Current mapping:** Candidate PR #90 github_create_branch.
- **Classification:** `CANDIDATE`
- Existing behavior is preserved and wrapped/generalized before new engines are introduced.

## AN — Current hardcodes / generalization
MCP/S1/repository literals and single-repository assumptions must move to TargetContext/configuration where applicable; preserve historical MCP behavior backward-compatibly.

## AO — Future implementation slot
Implement behind a GWC contract module + adapter to existing authority. Exact file placement must follow repository architecture discovered at implementation baseline, not be invented prematurely.

## AP — Test contract
happy path; boundary; NONE/AMBIGUOUS/UNVERIFIED/STALE/CONFLICT as applicable; replay/recovery; security; non-regression; exact binding tests.

## AQ — Property / invariant tests
- Unknown evidence never becomes allow/success.
- Explicit predecessor semantics are preserved.
- No hidden mutation.
- Same normalized input + same evidence ⇒ same semantic result for deterministic profiles.
- Mutation contracts never execute without a valid EffectPlan.

## AR — Acceptance criteria
- Input/output schemas are bounded.
- Owning authorities are explicit.
- Fail-closed paths are tested.
- Replay/recovery behavior is defined.
- No new parallel authority.
- Existing non-regression suite remains green.

## AS — Open questions
No blocking open decision beyond profile-specific implementation details; unresolved choices must stay explicit.

## AT — Architectural findings
- Existing implementation class: `CANDIDATE`.
- Any discovered hardcode is treated as a generalization target, not silently removed.
- Any mismatch between CURRENT and TARGET is explicit.

## AU — Future Task Blueprint mapping
This contract is implemented by one or more governed implementation tasks from `GWC_IMPLEMENTATION_TASK_BLUEPRINTS_R1.md`; implementation dependencies follow the contract graph and authority dependencies rather than numeric GW order alone.

## AV — Execution semantics
`MUTATE_THEN_VERIFY`

## AW — Effect Plan
Must be represented as an explicit EffectPlan with target authority, expected revisions/SHA, lock requirements, replay class, postconditions and recovery anchor.

## AX — Routing table
Primary predecessor: GW-23. Primary successor: GW-25. Additional skip/reobserve/reconcile/recovery edges must be declared deterministically.

## AY — Recovery anchor
Read-only contracts: input/evidence snapshot bindings.
Mutation contracts: target reference + task/session + relevant branch/PR/SHA/revision/job ID.

## AZ — Reconstruction rule
On process restart, reconstruct from authoritative stores and observations; do not rely on previous assistant text or a GWC workflow-state database.

## BA — Autonomy behavior
AUTO_CONTINUE when exactly one legal route exists and required evidence is sufficient; WAIT_EXTERNAL/BLOCK_LOCAL/fail-closed otherwise.


---

# GW-25 — TDD_RED_AUTHORING

## A — Identity
- **Contract ID:** `GW-25`
- **Canonical name:** `TDD_RED_AUTHORING`
- **Family:** `E — Development`
- **Contract version:** `1` (conceptual baseline)
- **Profile(s):** `DEV_MUTATION`
- **Architectural status:** `PARTIAL/CANDIDATE`
- **Integration class:** `PARTIAL/CANDIDATE`

## B — Purpose
Formaliser la responsabilité `TDD_RED_AUTHORING` comme contrat borné, versionné et composable, sans dupliquer les autorités existantes.

**Non-responsibilities:** does not steal ownership from Task Queue, Session, Lock Service, Live State, GitRegistry, GitHub, deploy/runtime or other downstream contracts.

## C — Position in global system
- **Logical predecessor(s):** GW-24
- **Logical successor(s):** GW-26
- **Re-entry:** allowed when authoritative evidence shows this contract’s postcondition is not yet proven.
- **Skip:** only when an explicit deterministic `SKIPPABLE_IF` condition exists.
- **Reobserve/Reconcile:** first-class graph edges, never implicit retries.

## D — Chronological role
- **Transport chronology:** may differ from GW numeric order.
- **Functional chronology:** `GW-25` owns only `TDD_RED_AUTHORING` responsibility.
- **Runtime chronology:** resolved by Workflow Graph, not `stepId + 1`.

## E — Contract input
Sorties prouvées des prédécesseurs applicables, contexte cible borné, références d’autorité nécessaires à `TDD_RED_AUTHORING`.

Input fields must be bounded, provenance-aware and typed as hint/claim/evidence/fact; raw secret material is forbidden unless explicitly unavoidable and ephemeral.

## F — Information semantics
Every field is classified as one of:
`RAW_INPUT | HINT | CLAIM | OBSERVATION | EVIDENCE | DERIVED_FACT | AUTHORITATIVE_FACT | DECISION | ATTESTATION`.

No contract upgrades a `HINT` to an authoritative fact without the owning evidence.

## G — Authorities
Autorités existantes correspondant aux faits consommés; aucune nouvelle source de vérité créée par GWC.

**Forbidden authority pattern:** no arbitrary Markdown, prompt text, tool availability or remembered state may override the actual owning authority.

## H — Preconditions
- Structural input valid and bounded.
- Required authorities reachable or explicitly `UNAVAILABLE`.
- Required freshness/revision/SHA bindings available.
- No contradictory prerequisite state.
- For mutations: session/receipt/task/locks/governance requirements satisfied.

## I — Internal micro-state machine
validate bounded input → collect/validate required evidence → evaluate local invariants → derive domain status → derive routing disposition → emit bounded output.

## J — Transformation / decision algorithm
1. Parse/validate bounded input.
2. Determine required authority observations.
3. Refuse guesses for missing facts.
4. Apply contract-local invariants.
5. Produce domain status.
6. Produce engine disposition.
7. For mutations only, produce EffectPlan; never mutate from evaluation code directly.
8. Emit bounded output and evidence references.

## K — Determinism
- **Class:** `DEV_MUTATION` with execution semantics `MUTATE_THEN_VERIFY`.
- Pure/read-only contracts are deterministic given identical normalized input and identical evidence snapshot.
- Observation-dependent contracts bind result to evidence freshness/revisions.

## L — Invariants
Global GWC invariants + no over-interpretation of predecessor output + bounded data + fail closed on missing evidence.

Plus all global GWC invariants.

## M — Action model
- **Allowed action kinds:** READ / DERIVE / RECORD / MUTATE
- **Forbidden:** hidden mutation, authority bypass, stale evidence reuse, arbitrary shell fallback, unbounded projection.

## N — Current execution owner vs target owner
CURRENT: existing subsystem(s) listed in AM. TARGET: same owning authority behind a GWC adapter/contract wrapper.

## O — Capability / authorization model
For any mutation:
`callable ∧ authorized ∧ safeNow ∧ preconditionsSatisfied ∧ concurrencySatisfied = mayExecute`.
A present tool is never permission by itself.

## P — Lock model
No new lock unless EffectPlan declares a collision domain; consume existing Lock Service.

## Q — Concurrency model
Independent tasks may proceed in parallel when dependency/resource/lock scopes do not conflict.
Local blockers remain local.
Operational Memory process-local serialization is not treated as distributed locking.

## R — Output contract
- **Canonical output:** `RedCandidate`
- Bounded, typed, provenance-aware.
- No secret/raw credential projection.
- Consumers must not over-interpret this output beyond its declared semantics.

## S — Terminal statuses
`SUCCESS | NONE | AMBIGUOUS | UNVERIFIED | BLOCKED | CONFLICT | STALE (subset applicable)`

## T — Terminality formula
Success requires all contract-owned postconditions to be proven from current required evidence.
Missing/stale/conflicting evidence maps to fail-closed statuses, never implicit success.

## U — Reason codes
Contract-specific reason codes must be stable, enumerable, bounded and machine-testable.
Every failure/blocking reason must identify whether it is recoverable by reobserve, reconcile, wait or explicit change.

## V — Fail-closed model
Missing/stale/conflicting required evidence never defaults to success or permission. UNKNOWN remains UNKNOWN.

## W — Evidence model
EvidenceEnvelope(s) from the owning authorities with freshness, provenance and relevant SHA/revision binding.

## X — Freshness / staleness
Evidence is bound to relevant `observedAt`, SHA, stateVersion and/or revisions.
A semantic state change invalidates dependent evidence when its contract declares such dependency.

## Y — Attestation model
EPHEMERAL_RESULT_ONLY by default; promote to bounded durable reference only where an existing authority requires durable proof.

## Z — Persistence model
No new GWC store. Persist only through the existing owning authority when the contract is a RECORD/MUTATE step.

## AA — Secret / privacy model
Never persist tokens, resume secrets, raw authorization headers, arbitrary transport IDs, `.env` material or unbounded prompt bodies.
Use digests/bounded projections where persistence is necessary.

## AB — Replay model
`CONDITIONALLY_IDEMPOTENT unless explicitly NON_REPLAYABLE`

## AC — Recovery model
Recovery starts by observing the owning authority.
A mutation is replayed only when its replay class explicitly allows it and the recovery anchor proves it has not already happened.

## AD — Security / threat model
Prevent authority confusion, cross-session/repo/project leakage, stale evidence reuse, duplicate mutation, secret leakage and false attestation.

## AE — Observability
Emit bounded start/result/failure/reason-code observations where useful.
Observability is not authority.

## AF — Interface contract with predecessors
Consumes only the predecessor fields whose semantics are explicitly declared.
Revalidates any field whose freshness/ownership requires it.

## AG — Interface contract with successors
Exports `RedCandidate` with explicit semantics; successor may not silently strengthen it.

## AH — Skip contract
No skip unless the graph contains a deterministic condition and proof source.
If skipped, the route and proof are observable.

## AI — Reobserve contract
Reobserve when required evidence is stale, unavailable-but-recoverable, or an external asynchronous condition may have progressed.

## AJ — Reconcile contract
Reconcile only when multiple authorities/state projections are inconsistent.
Reconcile is not the same as refreshing an observation.

## AK — Blocked behavior
Block only the affected Task/contract/resource scope unless an actual global invariant is violated.

## AL — Compensation / rollback
For pure/read-only contracts: not applicable.
For mutations: use existing rollback/compensation only where real; otherwise forward recovery by observation. Never pretend irreversible GitHub effects are rollbackable.

## AM — Existing system mapping
- **Current mapping:** Existing tests/TDD process; candidate #90 mutation surfaces.
- **Classification:** `PARTIAL/CANDIDATE`
- Existing behavior is preserved and wrapped/generalized before new engines are introduced.

## AN — Current hardcodes / generalization
MCP/S1/repository literals and single-repository assumptions must move to TargetContext/configuration where applicable; preserve historical MCP behavior backward-compatibly.

## AO — Future implementation slot
Implement behind a GWC contract module + adapter to existing authority. Exact file placement must follow repository architecture discovered at implementation baseline, not be invented prematurely.

## AP — Test contract
happy path; boundary; NONE/AMBIGUOUS/UNVERIFIED/STALE/CONFLICT as applicable; replay/recovery; security; non-regression; exact binding tests.

## AQ — Property / invariant tests
- Unknown evidence never becomes allow/success.
- Explicit predecessor semantics are preserved.
- No hidden mutation.
- Same normalized input + same evidence ⇒ same semantic result for deterministic profiles.
- Mutation contracts never execute without a valid EffectPlan.

## AR — Acceptance criteria
- Input/output schemas are bounded.
- Owning authorities are explicit.
- Fail-closed paths are tested.
- Replay/recovery behavior is defined.
- No new parallel authority.
- Existing non-regression suite remains green.

## AS — Open questions
No blocking open decision beyond profile-specific implementation details; unresolved choices must stay explicit.

## AT — Architectural findings
- Existing implementation class: `PARTIAL/CANDIDATE`.
- Any discovered hardcode is treated as a generalization target, not silently removed.
- Any mismatch between CURRENT and TARGET is explicit.

## AU — Future Task Blueprint mapping
This contract is implemented by one or more governed implementation tasks from `GWC_IMPLEMENTATION_TASK_BLUEPRINTS_R1.md`; implementation dependencies follow the contract graph and authority dependencies rather than numeric GW order alone.

## AV — Execution semantics
`MUTATE_THEN_VERIFY`

## AW — Effect Plan
Must be represented as an explicit EffectPlan with target authority, expected revisions/SHA, lock requirements, replay class, postconditions and recovery anchor.

## AX — Routing table
Primary predecessor: GW-24. Primary successor: GW-26. Additional skip/reobserve/reconcile/recovery edges must be declared deterministically.

## AY — Recovery anchor
Read-only contracts: input/evidence snapshot bindings.
Mutation contracts: target reference + task/session + relevant branch/PR/SHA/revision/job ID.

## AZ — Reconstruction rule
On process restart, reconstruct from authoritative stores and observations; do not rely on previous assistant text or a GWC workflow-state database.

## BA — Autonomy behavior
AUTO_CONTINUE when exactly one legal route exists and required evidence is sufficient; WAIT_EXTERNAL/BLOCK_LOCAL/fail-closed otherwise.


---

# GW-26 — TDD_RED_OBSERVATION

## A — Identity
- **Contract ID:** `GW-26`
- **Canonical name:** `TDD_RED_OBSERVATION`
- **Family:** `E — Development`
- **Contract version:** `1` (conceptual baseline)
- **Profile(s):** `TEST_OBSERVER`
- **Architectural status:** `PARTIAL/EXTEND`
- **Integration class:** `PARTIAL/EXTEND`

## B — Purpose
Formaliser la responsabilité `TDD_RED_OBSERVATION` comme contrat borné, versionné et composable, sans dupliquer les autorités existantes.

**Non-responsibilities:** does not steal ownership from Task Queue, Session, Lock Service, Live State, GitRegistry, GitHub, deploy/runtime or other downstream contracts.

## C — Position in global system
- **Logical predecessor(s):** GW-25
- **Logical successor(s):** GW-27
- **Re-entry:** allowed when authoritative evidence shows this contract’s postcondition is not yet proven.
- **Skip:** only when an explicit deterministic `SKIPPABLE_IF` condition exists.
- **Reobserve/Reconcile:** first-class graph edges, never implicit retries.

## D — Chronological role
- **Transport chronology:** may differ from GW numeric order.
- **Functional chronology:** `GW-26` owns only `TDD_RED_OBSERVATION` responsibility.
- **Runtime chronology:** resolved by Workflow Graph, not `stepId + 1`.

## E — Contract input
Sorties prouvées des prédécesseurs applicables, contexte cible borné, références d’autorité nécessaires à `TDD_RED_OBSERVATION`.

Input fields must be bounded, provenance-aware and typed as hint/claim/evidence/fact; raw secret material is forbidden unless explicitly unavoidable and ephemeral.

## F — Information semantics
Every field is classified as one of:
`RAW_INPUT | HINT | CLAIM | OBSERVATION | EVIDENCE | DERIVED_FACT | AUTHORITATIVE_FACT | DECISION | ATTESTATION`.

No contract upgrades a `HINT` to an authoritative fact without the owning evidence.

## G — Authorities
Autorités existantes correspondant aux faits consommés; aucune nouvelle source de vérité créée par GWC.

**Forbidden authority pattern:** no arbitrary Markdown, prompt text, tool availability or remembered state may override the actual owning authority.

## H — Preconditions
- Structural input valid and bounded.
- Required authorities reachable or explicitly `UNAVAILABLE`.
- Required freshness/revision/SHA bindings available.
- No contradictory prerequisite state.
- For mutations: session/receipt/task/locks/governance requirements satisfied.

## I — Internal micro-state machine
validate bounded input → collect/validate required evidence → evaluate local invariants → derive domain status → derive routing disposition → emit bounded output.

## J — Transformation / decision algorithm
1. Parse/validate bounded input.
2. Determine required authority observations.
3. Refuse guesses for missing facts.
4. Apply contract-local invariants.
5. Produce domain status.
6. Produce engine disposition.
7. For mutations only, produce EffectPlan; never mutate from evaluation code directly.
8. Emit bounded output and evidence references.

## K — Determinism
- **Class:** `TEST_OBSERVER` with execution semantics `OBSERVE_AND_EVALUATE`.
- Pure/read-only contracts are deterministic given identical normalized input and identical evidence snapshot.
- Observation-dependent contracts bind result to evidence freshness/revisions.

## L — Invariants
Global GWC invariants + no over-interpretation of predecessor output + bounded data + fail closed on missing evidence.

Plus all global GWC invariants.

## M — Action model
- **Allowed action kinds:** READ / DERIVE
- **Forbidden:** hidden mutation, authority bypass, stale evidence reuse, arbitrary shell fallback, unbounded projection.

## N — Current execution owner vs target owner
CURRENT: existing subsystem(s) listed in AM. TARGET: same owning authority behind a GWC adapter/contract wrapper.

## O — Capability / authorization model
For any mutation:
`callable ∧ authorized ∧ safeNow ∧ preconditionsSatisfied ∧ concurrencySatisfied = mayExecute`.
A present tool is never permission by itself.

## P — Lock model
No new lock unless EffectPlan declares a collision domain; consume existing Lock Service.

## Q — Concurrency model
Independent tasks may proceed in parallel when dependency/resource/lock scopes do not conflict.
Local blockers remain local.
Operational Memory process-local serialization is not treated as distributed locking.

## R — Output contract
- **Canonical output:** `RedProof`
- Bounded, typed, provenance-aware.
- No secret/raw credential projection.
- Consumers must not over-interpret this output beyond its declared semantics.

## S — Terminal statuses
`SUCCESS | NONE | AMBIGUOUS | UNVERIFIED | BLOCKED | CONFLICT | STALE (subset applicable)`

## T — Terminality formula
Success requires all contract-owned postconditions to be proven from current required evidence.
Missing/stale/conflicting evidence maps to fail-closed statuses, never implicit success.

## U — Reason codes
Contract-specific reason codes must be stable, enumerable, bounded and machine-testable.
Every failure/blocking reason must identify whether it is recoverable by reobserve, reconcile, wait or explicit change.

## V — Fail-closed model
Missing/stale/conflicting required evidence never defaults to success or permission. UNKNOWN remains UNKNOWN.

## W — Evidence model
EvidenceEnvelope(s) from the owning authorities with freshness, provenance and relevant SHA/revision binding.

## X — Freshness / staleness
Evidence is bound to relevant `observedAt`, SHA, stateVersion and/or revisions.
A semantic state change invalidates dependent evidence when its contract declares such dependency.

## Y — Attestation model
EPHEMERAL_RESULT_ONLY by default; promote to bounded durable reference only where an existing authority requires durable proof.

## Z — Persistence model
No new GWC store. Persist only through the existing owning authority when the contract is a RECORD/MUTATE step.

## AA — Secret / privacy model
Never persist tokens, resume secrets, raw authorization headers, arbitrary transport IDs, `.env` material or unbounded prompt bodies.
Use digests/bounded projections where persistence is necessary.

## AB — Replay model
`READ_ONLY`

## AC — Recovery model
Recovery starts by observing the owning authority.
A mutation is replayed only when its replay class explicitly allows it and the recovery anchor proves it has not already happened.

## AD — Security / threat model
Prevent authority confusion, cross-session/repo/project leakage, stale evidence reuse, duplicate mutation, secret leakage and false attestation.

## AE — Observability
Emit bounded start/result/failure/reason-code observations where useful.
Observability is not authority.

## AF — Interface contract with predecessors
Consumes only the predecessor fields whose semantics are explicitly declared.
Revalidates any field whose freshness/ownership requires it.

## AG — Interface contract with successors
Exports `RedProof` with explicit semantics; successor may not silently strengthen it.

## AH — Skip contract
No skip unless the graph contains a deterministic condition and proof source.
If skipped, the route and proof are observable.

## AI — Reobserve contract
Reobserve when required evidence is stale, unavailable-but-recoverable, or an external asynchronous condition may have progressed.

## AJ — Reconcile contract
Reconcile only when multiple authorities/state projections are inconsistent.
Reconcile is not the same as refreshing an observation.

## AK — Blocked behavior
Block only the affected Task/contract/resource scope unless an actual global invariant is violated.

## AL — Compensation / rollback
For pure/read-only contracts: not applicable.
For mutations: use existing rollback/compensation only where real; otherwise forward recovery by observation. Never pretend irreversible GitHub effects are rollbackable.

## AM — Existing system mapping
- **Current mapping:** CI/check observation; missing targeted RED proof model.
- **Classification:** `PARTIAL/EXTEND`
- Existing behavior is preserved and wrapped/generalized before new engines are introduced.

## AN — Current hardcodes / generalization
MCP/S1/repository literals and single-repository assumptions must move to TargetContext/configuration where applicable; preserve historical MCP behavior backward-compatibly.

## AO — Future implementation slot
Implement behind a GWC contract module + adapter to existing authority. Exact file placement must follow repository architecture discovered at implementation baseline, not be invented prematurely.

## AP — Test contract
happy path; boundary; NONE/AMBIGUOUS/UNVERIFIED/STALE/CONFLICT as applicable; replay/recovery; security; non-regression; exact binding tests.

## AQ — Property / invariant tests
- Unknown evidence never becomes allow/success.
- Explicit predecessor semantics are preserved.
- No hidden mutation.
- Same normalized input + same evidence ⇒ same semantic result for deterministic profiles.
- Mutation contracts never execute without a valid EffectPlan.

## AR — Acceptance criteria
- Input/output schemas are bounded.
- Owning authorities are explicit.
- Fail-closed paths are tested.
- Replay/recovery behavior is defined.
- No new parallel authority.
- Existing non-regression suite remains green.

## AS — Open questions
No blocking open decision beyond profile-specific implementation details; unresolved choices must stay explicit.

## AT — Architectural findings
- Existing implementation class: `PARTIAL/EXTEND`.
- Any discovered hardcode is treated as a generalization target, not silently removed.
- Any mismatch between CURRENT and TARGET is explicit.

## AU — Future Task Blueprint mapping
This contract is implemented by one or more governed implementation tasks from `GWC_IMPLEMENTATION_TASK_BLUEPRINTS_R1.md`; implementation dependencies follow the contract graph and authority dependencies rather than numeric GW order alone.

## AV — Execution semantics
`OBSERVE_AND_EVALUATE`

## AW — Effect Plan
None.

## AX — Routing table
Primary predecessor: GW-25. Primary successor: GW-27. Additional skip/reobserve/reconcile/recovery edges must be declared deterministically.

## AY — Recovery anchor
Read-only contracts: input/evidence snapshot bindings.
Mutation contracts: target reference + task/session + relevant branch/PR/SHA/revision/job ID.

## AZ — Reconstruction rule
On process restart, reconstruct from authoritative stores and observations; do not rely on previous assistant text or a GWC workflow-state database.

## BA — Autonomy behavior
AUTO_CONTINUE when exactly one legal route exists and required evidence is sufficient; WAIT_EXTERNAL/BLOCK_LOCAL/fail-closed otherwise.


---

# GW-27 — TDD_GREEN_MINIMAL_IMPLEMENTATION

## A — Identity
- **Contract ID:** `GW-27`
- **Canonical name:** `TDD_GREEN_MINIMAL_IMPLEMENTATION`
- **Family:** `E — Development`
- **Contract version:** `1` (conceptual baseline)
- **Profile(s):** `DEV_MUTATION`
- **Architectural status:** `PARTIAL/CANDIDATE`
- **Integration class:** `PARTIAL/CANDIDATE`

## B — Purpose
Formaliser la responsabilité `TDD_GREEN_MINIMAL_IMPLEMENTATION` comme contrat borné, versionné et composable, sans dupliquer les autorités existantes.

**Non-responsibilities:** does not steal ownership from Task Queue, Session, Lock Service, Live State, GitRegistry, GitHub, deploy/runtime or other downstream contracts.

## C — Position in global system
- **Logical predecessor(s):** GW-26
- **Logical successor(s):** GW-28
- **Re-entry:** allowed when authoritative evidence shows this contract’s postcondition is not yet proven.
- **Skip:** only when an explicit deterministic `SKIPPABLE_IF` condition exists.
- **Reobserve/Reconcile:** first-class graph edges, never implicit retries.

## D — Chronological role
- **Transport chronology:** may differ from GW numeric order.
- **Functional chronology:** `GW-27` owns only `TDD_GREEN_MINIMAL_IMPLEMENTATION` responsibility.
- **Runtime chronology:** resolved by Workflow Graph, not `stepId + 1`.

## E — Contract input
Sorties prouvées des prédécesseurs applicables, contexte cible borné, références d’autorité nécessaires à `TDD_GREEN_MINIMAL_IMPLEMENTATION`.

Input fields must be bounded, provenance-aware and typed as hint/claim/evidence/fact; raw secret material is forbidden unless explicitly unavoidable and ephemeral.

## F — Information semantics
Every field is classified as one of:
`RAW_INPUT | HINT | CLAIM | OBSERVATION | EVIDENCE | DERIVED_FACT | AUTHORITATIVE_FACT | DECISION | ATTESTATION`.

No contract upgrades a `HINT` to an authoritative fact without the owning evidence.

## G — Authorities
Autorités existantes correspondant aux faits consommés; aucune nouvelle source de vérité créée par GWC.

**Forbidden authority pattern:** no arbitrary Markdown, prompt text, tool availability or remembered state may override the actual owning authority.

## H — Preconditions
- Structural input valid and bounded.
- Required authorities reachable or explicitly `UNAVAILABLE`.
- Required freshness/revision/SHA bindings available.
- No contradictory prerequisite state.
- For mutations: session/receipt/task/locks/governance requirements satisfied.

## I — Internal micro-state machine
validate bounded input → collect/validate required evidence → evaluate local invariants → derive domain status → derive routing disposition → emit bounded output.

## J — Transformation / decision algorithm
1. Parse/validate bounded input.
2. Determine required authority observations.
3. Refuse guesses for missing facts.
4. Apply contract-local invariants.
5. Produce domain status.
6. Produce engine disposition.
7. For mutations only, produce EffectPlan; never mutate from evaluation code directly.
8. Emit bounded output and evidence references.

## K — Determinism
- **Class:** `DEV_MUTATION` with execution semantics `MUTATE_THEN_VERIFY`.
- Pure/read-only contracts are deterministic given identical normalized input and identical evidence snapshot.
- Observation-dependent contracts bind result to evidence freshness/revisions.

## L — Invariants
Global GWC invariants + no over-interpretation of predecessor output + bounded data + fail closed on missing evidence.

Plus all global GWC invariants.

## M — Action model
- **Allowed action kinds:** READ / DERIVE / RECORD / MUTATE
- **Forbidden:** hidden mutation, authority bypass, stale evidence reuse, arbitrary shell fallback, unbounded projection.

## N — Current execution owner vs target owner
CURRENT: existing subsystem(s) listed in AM. TARGET: same owning authority behind a GWC adapter/contract wrapper.

## O — Capability / authorization model
For any mutation:
`callable ∧ authorized ∧ safeNow ∧ preconditionsSatisfied ∧ concurrencySatisfied = mayExecute`.
A present tool is never permission by itself.

## P — Lock model
No new lock unless EffectPlan declares a collision domain; consume existing Lock Service.

## Q — Concurrency model
Independent tasks may proceed in parallel when dependency/resource/lock scopes do not conflict.
Local blockers remain local.
Operational Memory process-local serialization is not treated as distributed locking.

## R — Output contract
- **Canonical output:** `GreenCandidate`
- Bounded, typed, provenance-aware.
- No secret/raw credential projection.
- Consumers must not over-interpret this output beyond its declared semantics.

## S — Terminal statuses
`SUCCESS | NONE | AMBIGUOUS | UNVERIFIED | BLOCKED | CONFLICT | STALE (subset applicable)`

## T — Terminality formula
Success requires all contract-owned postconditions to be proven from current required evidence.
Missing/stale/conflicting evidence maps to fail-closed statuses, never implicit success.

## U — Reason codes
Contract-specific reason codes must be stable, enumerable, bounded and machine-testable.
Every failure/blocking reason must identify whether it is recoverable by reobserve, reconcile, wait or explicit change.

## V — Fail-closed model
Missing/stale/conflicting required evidence never defaults to success or permission. UNKNOWN remains UNKNOWN.

## W — Evidence model
EvidenceEnvelope(s) from the owning authorities with freshness, provenance and relevant SHA/revision binding.

## X — Freshness / staleness
Evidence is bound to relevant `observedAt`, SHA, stateVersion and/or revisions.
A semantic state change invalidates dependent evidence when its contract declares such dependency.

## Y — Attestation model
EPHEMERAL_RESULT_ONLY by default; promote to bounded durable reference only where an existing authority requires durable proof.

## Z — Persistence model
No new GWC store. Persist only through the existing owning authority when the contract is a RECORD/MUTATE step.

## AA — Secret / privacy model
Never persist tokens, resume secrets, raw authorization headers, arbitrary transport IDs, `.env` material or unbounded prompt bodies.
Use digests/bounded projections where persistence is necessary.

## AB — Replay model
`CONDITIONALLY_IDEMPOTENT unless explicitly NON_REPLAYABLE`

## AC — Recovery model
Recovery starts by observing the owning authority.
A mutation is replayed only when its replay class explicitly allows it and the recovery anchor proves it has not already happened.

## AD — Security / threat model
Prevent authority confusion, cross-session/repo/project leakage, stale evidence reuse, duplicate mutation, secret leakage and false attestation.

## AE — Observability
Emit bounded start/result/failure/reason-code observations where useful.
Observability is not authority.

## AF — Interface contract with predecessors
Consumes only the predecessor fields whose semantics are explicitly declared.
Revalidates any field whose freshness/ownership requires it.

## AG — Interface contract with successors
Exports `GreenCandidate` with explicit semantics; successor may not silently strengthen it.

## AH — Skip contract
No skip unless the graph contains a deterministic condition and proof source.
If skipped, the route and proof are observable.

## AI — Reobserve contract
Reobserve when required evidence is stale, unavailable-but-recoverable, or an external asynchronous condition may have progressed.

## AJ — Reconcile contract
Reconcile only when multiple authorities/state projections are inconsistent.
Reconcile is not the same as refreshing an observation.

## AK — Blocked behavior
Block only the affected Task/contract/resource scope unless an actual global invariant is violated.

## AL — Compensation / rollback
For pure/read-only contracts: not applicable.
For mutations: use existing rollback/compensation only where real; otherwise forward recovery by observation. Never pretend irreversible GitHub effects are rollbackable.

## AM — Existing system mapping
- **Current mapping:** Candidate #90 commit/file mutation surfaces.
- **Classification:** `PARTIAL/CANDIDATE`
- Existing behavior is preserved and wrapped/generalized before new engines are introduced.

## AN — Current hardcodes / generalization
MCP/S1/repository literals and single-repository assumptions must move to TargetContext/configuration where applicable; preserve historical MCP behavior backward-compatibly.

## AO — Future implementation slot
Implement behind a GWC contract module + adapter to existing authority. Exact file placement must follow repository architecture discovered at implementation baseline, not be invented prematurely.

## AP — Test contract
happy path; boundary; NONE/AMBIGUOUS/UNVERIFIED/STALE/CONFLICT as applicable; replay/recovery; security; non-regression; exact binding tests.

## AQ — Property / invariant tests
- Unknown evidence never becomes allow/success.
- Explicit predecessor semantics are preserved.
- No hidden mutation.
- Same normalized input + same evidence ⇒ same semantic result for deterministic profiles.
- Mutation contracts never execute without a valid EffectPlan.

## AR — Acceptance criteria
- Input/output schemas are bounded.
- Owning authorities are explicit.
- Fail-closed paths are tested.
- Replay/recovery behavior is defined.
- No new parallel authority.
- Existing non-regression suite remains green.

## AS — Open questions
No blocking open decision beyond profile-specific implementation details; unresolved choices must stay explicit.

## AT — Architectural findings
- Existing implementation class: `PARTIAL/CANDIDATE`.
- Any discovered hardcode is treated as a generalization target, not silently removed.
- Any mismatch between CURRENT and TARGET is explicit.

## AU — Future Task Blueprint mapping
This contract is implemented by one or more governed implementation tasks from `GWC_IMPLEMENTATION_TASK_BLUEPRINTS_R1.md`; implementation dependencies follow the contract graph and authority dependencies rather than numeric GW order alone.

## AV — Execution semantics
`MUTATE_THEN_VERIFY`

## AW — Effect Plan
Must be represented as an explicit EffectPlan with target authority, expected revisions/SHA, lock requirements, replay class, postconditions and recovery anchor.

## AX — Routing table
Primary predecessor: GW-26. Primary successor: GW-28. Additional skip/reobserve/reconcile/recovery edges must be declared deterministically.

## AY — Recovery anchor
Read-only contracts: input/evidence snapshot bindings.
Mutation contracts: target reference + task/session + relevant branch/PR/SHA/revision/job ID.

## AZ — Reconstruction rule
On process restart, reconstruct from authoritative stores and observations; do not rely on previous assistant text or a GWC workflow-state database.

## BA — Autonomy behavior
AUTO_CONTINUE when exactly one legal route exists and required evidence is sufficient; WAIT_EXTERNAL/BLOCK_LOCAL/fail-closed otherwise.


---

# GW-28 — GREEN_CI

## A — Identity
- **Contract ID:** `GW-28`
- **Canonical name:** `GREEN_CI`
- **Family:** `E — Development`
- **Contract version:** `1` (conceptual baseline)
- **Profile(s):** `CI_OBSERVER`
- **Architectural status:** `REUSE/EXTEND`
- **Integration class:** `REUSE/EXTEND`

## B — Purpose
Formaliser la responsabilité `GREEN_CI` comme contrat borné, versionné et composable, sans dupliquer les autorités existantes.

**Non-responsibilities:** does not steal ownership from Task Queue, Session, Lock Service, Live State, GitRegistry, GitHub, deploy/runtime or other downstream contracts.

## C — Position in global system
- **Logical predecessor(s):** GW-27
- **Logical successor(s):** GW-29
- **Re-entry:** allowed when authoritative evidence shows this contract’s postcondition is not yet proven.
- **Skip:** only when an explicit deterministic `SKIPPABLE_IF` condition exists.
- **Reobserve/Reconcile:** first-class graph edges, never implicit retries.

## D — Chronological role
- **Transport chronology:** may differ from GW numeric order.
- **Functional chronology:** `GW-28` owns only `GREEN_CI` responsibility.
- **Runtime chronology:** resolved by Workflow Graph, not `stepId + 1`.

## E — Contract input
Sorties prouvées des prédécesseurs applicables, contexte cible borné, références d’autorité nécessaires à `GREEN_CI`.

Input fields must be bounded, provenance-aware and typed as hint/claim/evidence/fact; raw secret material is forbidden unless explicitly unavoidable and ephemeral.

## F — Information semantics
Every field is classified as one of:
`RAW_INPUT | HINT | CLAIM | OBSERVATION | EVIDENCE | DERIVED_FACT | AUTHORITATIVE_FACT | DECISION | ATTESTATION`.

No contract upgrades a `HINT` to an authoritative fact without the owning evidence.

## G — Authorities
Autorités existantes correspondant aux faits consommés; aucune nouvelle source de vérité créée par GWC.

**Forbidden authority pattern:** no arbitrary Markdown, prompt text, tool availability or remembered state may override the actual owning authority.

## H — Preconditions
- Structural input valid and bounded.
- Required authorities reachable or explicitly `UNAVAILABLE`.
- Required freshness/revision/SHA bindings available.
- No contradictory prerequisite state.
- For mutations: session/receipt/task/locks/governance requirements satisfied.

## I — Internal micro-state machine
validate bounded input → collect/validate required evidence → evaluate local invariants → derive domain status → derive routing disposition → emit bounded output.

## J — Transformation / decision algorithm
1. Parse/validate bounded input.
2. Determine required authority observations.
3. Refuse guesses for missing facts.
4. Apply contract-local invariants.
5. Produce domain status.
6. Produce engine disposition.
7. For mutations only, produce EffectPlan; never mutate from evaluation code directly.
8. Emit bounded output and evidence references.

## K — Determinism
- **Class:** `CI_OBSERVER` with execution semantics `OBSERVE_AND_EVALUATE`.
- Pure/read-only contracts are deterministic given identical normalized input and identical evidence snapshot.
- Observation-dependent contracts bind result to evidence freshness/revisions.

## L — Invariants
Global GWC invariants + no over-interpretation of predecessor output + bounded data + fail closed on missing evidence.

Plus all global GWC invariants.

## M — Action model
- **Allowed action kinds:** READ / DERIVE
- **Forbidden:** hidden mutation, authority bypass, stale evidence reuse, arbitrary shell fallback, unbounded projection.

## N — Current execution owner vs target owner
CURRENT: existing subsystem(s) listed in AM. TARGET: same owning authority behind a GWC adapter/contract wrapper.

## O — Capability / authorization model
For any mutation:
`callable ∧ authorized ∧ safeNow ∧ preconditionsSatisfied ∧ concurrencySatisfied = mayExecute`.
A present tool is never permission by itself.

## P — Lock model
No new lock unless EffectPlan declares a collision domain; consume existing Lock Service.

## Q — Concurrency model
Independent tasks may proceed in parallel when dependency/resource/lock scopes do not conflict.
Local blockers remain local.
Operational Memory process-local serialization is not treated as distributed locking.

## R — Output contract
- **Canonical output:** `GreenCiProof`
- Bounded, typed, provenance-aware.
- No secret/raw credential projection.
- Consumers must not over-interpret this output beyond its declared semantics.

## S — Terminal statuses
`SUCCESS | NONE | AMBIGUOUS | UNVERIFIED | BLOCKED | CONFLICT | STALE (subset applicable)`

## T — Terminality formula
Success requires all contract-owned postconditions to be proven from current required evidence.
Missing/stale/conflicting evidence maps to fail-closed statuses, never implicit success.

## U — Reason codes
Contract-specific reason codes must be stable, enumerable, bounded and machine-testable.
Every failure/blocking reason must identify whether it is recoverable by reobserve, reconcile, wait or explicit change.

## V — Fail-closed model
Missing/stale/conflicting required evidence never defaults to success or permission. UNKNOWN remains UNKNOWN.

## W — Evidence model
EvidenceEnvelope(s) from the owning authorities with freshness, provenance and relevant SHA/revision binding.

## X — Freshness / staleness
Evidence is bound to relevant `observedAt`, SHA, stateVersion and/or revisions.
A semantic state change invalidates dependent evidence when its contract declares such dependency.

## Y — Attestation model
EPHEMERAL_RESULT_ONLY by default; promote to bounded durable reference only where an existing authority requires durable proof.

## Z — Persistence model
No new GWC store. Persist only through the existing owning authority when the contract is a RECORD/MUTATE step.

## AA — Secret / privacy model
Never persist tokens, resume secrets, raw authorization headers, arbitrary transport IDs, `.env` material or unbounded prompt bodies.
Use digests/bounded projections where persistence is necessary.

## AB — Replay model
`READ_ONLY`

## AC — Recovery model
Recovery starts by observing the owning authority.
A mutation is replayed only when its replay class explicitly allows it and the recovery anchor proves it has not already happened.

## AD — Security / threat model
Prevent authority confusion, cross-session/repo/project leakage, stale evidence reuse, duplicate mutation, secret leakage and false attestation.

## AE — Observability
Emit bounded start/result/failure/reason-code observations where useful.
Observability is not authority.

## AF — Interface contract with predecessors
Consumes only the predecessor fields whose semantics are explicitly declared.
Revalidates any field whose freshness/ownership requires it.

## AG — Interface contract with successors
Exports `GreenCiProof` with explicit semantics; successor may not silently strengthen it.

## AH — Skip contract
No skip unless the graph contains a deterministic condition and proof source.
If skipped, the route and proof are observable.

## AI — Reobserve contract
Reobserve when required evidence is stale, unavailable-but-recoverable, or an external asynchronous condition may have progressed.

## AJ — Reconcile contract
Reconcile only when multiple authorities/state projections are inconsistent.
Reconcile is not the same as refreshing an observation.

## AK — Blocked behavior
Block only the affected Task/contract/resource scope unless an actual global invariant is violated.

## AL — Compensation / rollback
For pure/read-only contracts: not applicable.
For mutations: use existing rollback/compensation only where real; otherwise forward recovery by observation. Never pretend irreversible GitHub effects are rollbackable.

## AM — Existing system mapping
- **Current mapping:** mcp-ci.yml + GitHub checks evidence.
- **Classification:** `REUSE/EXTEND`
- Existing behavior is preserved and wrapped/generalized before new engines are introduced.

## AN — Current hardcodes / generalization
MCP/S1/repository literals and single-repository assumptions must move to TargetContext/configuration where applicable; preserve historical MCP behavior backward-compatibly.

## AO — Future implementation slot
Implement behind a GWC contract module + adapter to existing authority. Exact file placement must follow repository architecture discovered at implementation baseline, not be invented prematurely.

## AP — Test contract
happy path; boundary; NONE/AMBIGUOUS/UNVERIFIED/STALE/CONFLICT as applicable; replay/recovery; security; non-regression; exact binding tests.

## AQ — Property / invariant tests
- Unknown evidence never becomes allow/success.
- Explicit predecessor semantics are preserved.
- No hidden mutation.
- Same normalized input + same evidence ⇒ same semantic result for deterministic profiles.
- Mutation contracts never execute without a valid EffectPlan.

## AR — Acceptance criteria
- Input/output schemas are bounded.
- Owning authorities are explicit.
- Fail-closed paths are tested.
- Replay/recovery behavior is defined.
- No new parallel authority.
- Existing non-regression suite remains green.

## AS — Open questions
No blocking open decision beyond profile-specific implementation details; unresolved choices must stay explicit.

## AT — Architectural findings
- Existing implementation class: `REUSE/EXTEND`.
- Any discovered hardcode is treated as a generalization target, not silently removed.
- Any mismatch between CURRENT and TARGET is explicit.

## AU — Future Task Blueprint mapping
This contract is implemented by one or more governed implementation tasks from `GWC_IMPLEMENTATION_TASK_BLUEPRINTS_R1.md`; implementation dependencies follow the contract graph and authority dependencies rather than numeric GW order alone.

## AV — Execution semantics
`OBSERVE_AND_EVALUATE`

## AW — Effect Plan
None.

## AX — Routing table
Primary predecessor: GW-27. Primary successor: GW-29. Additional skip/reobserve/reconcile/recovery edges must be declared deterministically.

## AY — Recovery anchor
Read-only contracts: input/evidence snapshot bindings.
Mutation contracts: target reference + task/session + relevant branch/PR/SHA/revision/job ID.

## AZ — Reconstruction rule
On process restart, reconstruct from authoritative stores and observations; do not rely on previous assistant text or a GWC workflow-state database.

## BA — Autonomy behavior
AUTO_CONTINUE when exactly one legal route exists and required evidence is sufficient; WAIT_EXTERNAL/BLOCK_LOCAL/fail-closed otherwise.


---

# GW-29 — SELF_REVIEW

## A — Identity
- **Contract ID:** `GW-29`
- **Canonical name:** `SELF_REVIEW`
- **Family:** `E — Development`
- **Contract version:** `1` (conceptual baseline)
- **Profile(s):** `REVIEW_DECISION`
- **Architectural status:** `PARTIAL`
- **Integration class:** `PARTIAL`

## B — Purpose
Formaliser la responsabilité `SELF_REVIEW` comme contrat borné, versionné et composable, sans dupliquer les autorités existantes.

**Non-responsibilities:** does not steal ownership from Task Queue, Session, Lock Service, Live State, GitRegistry, GitHub, deploy/runtime or other downstream contracts.

## C — Position in global system
- **Logical predecessor(s):** GW-28
- **Logical successor(s):** GW-30 if finding; else GW-32
- **Re-entry:** allowed when authoritative evidence shows this contract’s postcondition is not yet proven.
- **Skip:** only when an explicit deterministic `SKIPPABLE_IF` condition exists.
- **Reobserve/Reconcile:** first-class graph edges, never implicit retries.

## D — Chronological role
- **Transport chronology:** may differ from GW numeric order.
- **Functional chronology:** `GW-29` owns only `SELF_REVIEW` responsibility.
- **Runtime chronology:** resolved by Workflow Graph, not `stepId + 1`.

## E — Contract input
Sorties prouvées des prédécesseurs applicables, contexte cible borné, références d’autorité nécessaires à `SELF_REVIEW`.

Input fields must be bounded, provenance-aware and typed as hint/claim/evidence/fact; raw secret material is forbidden unless explicitly unavoidable and ephemeral.

## F — Information semantics
Every field is classified as one of:
`RAW_INPUT | HINT | CLAIM | OBSERVATION | EVIDENCE | DERIVED_FACT | AUTHORITATIVE_FACT | DECISION | ATTESTATION`.

No contract upgrades a `HINT` to an authoritative fact without the owning evidence.

## G — Authorities
Autorités existantes correspondant aux faits consommés; aucune nouvelle source de vérité créée par GWC.

**Forbidden authority pattern:** no arbitrary Markdown, prompt text, tool availability or remembered state may override the actual owning authority.

## H — Preconditions
- Structural input valid and bounded.
- Required authorities reachable or explicitly `UNAVAILABLE`.
- Required freshness/revision/SHA bindings available.
- No contradictory prerequisite state.
- For mutations: session/receipt/task/locks/governance requirements satisfied.

## I — Internal micro-state machine
validate bounded input → collect/validate required evidence → evaluate local invariants → derive domain status → derive routing disposition → emit bounded output.

## J — Transformation / decision algorithm
1. Parse/validate bounded input.
2. Determine required authority observations.
3. Refuse guesses for missing facts.
4. Apply contract-local invariants.
5. Produce domain status.
6. Produce engine disposition.
7. For mutations only, produce EffectPlan; never mutate from evaluation code directly.
8. Emit bounded output and evidence references.

## K — Determinism
- **Class:** `REVIEW_DECISION` with execution semantics `EVALUATE_ONLY`.
- Pure/read-only contracts are deterministic given identical normalized input and identical evidence snapshot.
- Observation-dependent contracts bind result to evidence freshness/revisions.

## L — Invariants
Global GWC invariants + no over-interpretation of predecessor output + bounded data + fail closed on missing evidence.

Plus all global GWC invariants.

## M — Action model
- **Allowed action kinds:** READ / DERIVE
- **Forbidden:** hidden mutation, authority bypass, stale evidence reuse, arbitrary shell fallback, unbounded projection.

## N — Current execution owner vs target owner
CURRENT: existing subsystem(s) listed in AM. TARGET: same owning authority behind a GWC adapter/contract wrapper.

## O — Capability / authorization model
For any mutation:
`callable ∧ authorized ∧ safeNow ∧ preconditionsSatisfied ∧ concurrencySatisfied = mayExecute`.
A present tool is never permission by itself.

## P — Lock model
No new lock unless EffectPlan declares a collision domain; consume existing Lock Service.

## Q — Concurrency model
Independent tasks may proceed in parallel when dependency/resource/lock scopes do not conflict.
Local blockers remain local.
Operational Memory process-local serialization is not treated as distributed locking.

## R — Output contract
- **Canonical output:** `ReviewFindingSet`
- Bounded, typed, provenance-aware.
- No secret/raw credential projection.
- Consumers must not over-interpret this output beyond its declared semantics.

## S — Terminal statuses
`SUCCESS | NONE | AMBIGUOUS | UNVERIFIED | BLOCKED | CONFLICT | STALE (subset applicable)`

## T — Terminality formula
Success requires all contract-owned postconditions to be proven from current required evidence.
Missing/stale/conflicting evidence maps to fail-closed statuses, never implicit success.

## U — Reason codes
Contract-specific reason codes must be stable, enumerable, bounded and machine-testable.
Every failure/blocking reason must identify whether it is recoverable by reobserve, reconcile, wait or explicit change.

## V — Fail-closed model
Missing/stale/conflicting required evidence never defaults to success or permission. UNKNOWN remains UNKNOWN.

## W — Evidence model
EvidenceEnvelope(s) from the owning authorities with freshness, provenance and relevant SHA/revision binding.

## X — Freshness / staleness
Evidence is bound to relevant `observedAt`, SHA, stateVersion and/or revisions.
A semantic state change invalidates dependent evidence when its contract declares such dependency.

## Y — Attestation model
EPHEMERAL_RESULT_ONLY by default; promote to bounded durable reference only where an existing authority requires durable proof.

## Z — Persistence model
No new GWC store. Persist only through the existing owning authority when the contract is a RECORD/MUTATE step.

## AA — Secret / privacy model
Never persist tokens, resume secrets, raw authorization headers, arbitrary transport IDs, `.env` material or unbounded prompt bodies.
Use digests/bounded projections where persistence is necessary.

## AB — Replay model
`READ_ONLY`

## AC — Recovery model
Recovery starts by observing the owning authority.
A mutation is replayed only when its replay class explicitly allows it and the recovery anchor proves it has not already happened.

## AD — Security / threat model
Prevent authority confusion, cross-session/repo/project leakage, stale evidence reuse, duplicate mutation, secret leakage and false attestation.

## AE — Observability
Emit bounded start/result/failure/reason-code observations where useful.
Observability is not authority.

## AF — Interface contract with predecessors
Consumes only the predecessor fields whose semantics are explicitly declared.
Revalidates any field whose freshness/ownership requires it.

## AG — Interface contract with successors
Exports `ReviewFindingSet` with explicit semantics; successor may not silently strengthen it.

## AH — Skip contract
No skip unless the graph contains a deterministic condition and proof source.
If skipped, the route and proof are observable.

## AI — Reobserve contract
Reobserve when required evidence is stale, unavailable-but-recoverable, or an external asynchronous condition may have progressed.

## AJ — Reconcile contract
Reconcile only when multiple authorities/state projections are inconsistent.
Reconcile is not the same as refreshing an observation.

## AK — Blocked behavior
Block only the affected Task/contract/resource scope unless an actual global invariant is violated.

## AL — Compensation / rollback
For pure/read-only contracts: not applicable.
For mutations: use existing rollback/compensation only where real; otherwise forward recovery by observation. Never pretend irreversible GitHub effects are rollbackable.

## AM — Existing system mapping
- **Current mapping:** Existing review practice/diff evidence; no formal contract.
- **Classification:** `PARTIAL`
- Existing behavior is preserved and wrapped/generalized before new engines are introduced.

## AN — Current hardcodes / generalization
MCP/S1/repository literals and single-repository assumptions must move to TargetContext/configuration where applicable; preserve historical MCP behavior backward-compatibly.

## AO — Future implementation slot
Implement behind a GWC contract module + adapter to existing authority. Exact file placement must follow repository architecture discovered at implementation baseline, not be invented prematurely.

## AP — Test contract
happy path; boundary; NONE/AMBIGUOUS/UNVERIFIED/STALE/CONFLICT as applicable; replay/recovery; security; non-regression; exact binding tests.

## AQ — Property / invariant tests
- Unknown evidence never becomes allow/success.
- Explicit predecessor semantics are preserved.
- No hidden mutation.
- Same normalized input + same evidence ⇒ same semantic result for deterministic profiles.
- Mutation contracts never execute without a valid EffectPlan.

## AR — Acceptance criteria
- Input/output schemas are bounded.
- Owning authorities are explicit.
- Fail-closed paths are tested.
- Replay/recovery behavior is defined.
- No new parallel authority.
- Existing non-regression suite remains green.

## AS — Open questions
No blocking open decision beyond profile-specific implementation details; unresolved choices must stay explicit.

## AT — Architectural findings
- Existing implementation class: `PARTIAL`.
- Any discovered hardcode is treated as a generalization target, not silently removed.
- Any mismatch between CURRENT and TARGET is explicit.

## AU — Future Task Blueprint mapping
This contract is implemented by one or more governed implementation tasks from `GWC_IMPLEMENTATION_TASK_BLUEPRINTS_R1.md`; implementation dependencies follow the contract graph and authority dependencies rather than numeric GW order alone.

## AV — Execution semantics
`EVALUATE_ONLY`

## AW — Effect Plan
None.

## AX — Routing table
Primary predecessor: GW-28. Primary successor: GW-30 if finding; else GW-32. Additional skip/reobserve/reconcile/recovery edges must be declared deterministically.

## AY — Recovery anchor
Read-only contracts: input/evidence snapshot bindings.
Mutation contracts: target reference + task/session + relevant branch/PR/SHA/revision/job ID.

## AZ — Reconstruction rule
On process restart, reconstruct from authoritative stores and observations; do not rely on previous assistant text or a GWC workflow-state database.

## BA — Autonomy behavior
AUTO_CONTINUE when exactly one legal route exists and required evidence is sufficient; WAIT_EXTERNAL/BLOCK_LOCAL/fail-closed otherwise.


---

# GW-30 — REGRESSION_RED_IF_FINDING

## A — Identity
- **Contract ID:** `GW-30`
- **Canonical name:** `REGRESSION_RED_IF_FINDING`
- **Family:** `E — Development`
- **Contract version:** `1` (conceptual baseline)
- **Profile(s):** `TEST_MUTATION`
- **Architectural status:** `PARTIAL`
- **Integration class:** `PARTIAL`

## B — Purpose
Formaliser la responsabilité `REGRESSION_RED_IF_FINDING` comme contrat borné, versionné et composable, sans dupliquer les autorités existantes.

**Non-responsibilities:** does not steal ownership from Task Queue, Session, Lock Service, Live State, GitRegistry, GitHub, deploy/runtime or other downstream contracts.

## C — Position in global system
- **Logical predecessor(s):** GW-29
- **Logical successor(s):** GW-31
- **Re-entry:** allowed when authoritative evidence shows this contract’s postcondition is not yet proven.
- **Skip:** only when an explicit deterministic `SKIPPABLE_IF` condition exists.
- **Reobserve/Reconcile:** first-class graph edges, never implicit retries.

## D — Chronological role
- **Transport chronology:** may differ from GW numeric order.
- **Functional chronology:** `GW-30` owns only `REGRESSION_RED_IF_FINDING` responsibility.
- **Runtime chronology:** resolved by Workflow Graph, not `stepId + 1`.

## E — Contract input
Sorties prouvées des prédécesseurs applicables, contexte cible borné, références d’autorité nécessaires à `REGRESSION_RED_IF_FINDING`.

Input fields must be bounded, provenance-aware and typed as hint/claim/evidence/fact; raw secret material is forbidden unless explicitly unavoidable and ephemeral.

## F — Information semantics
Every field is classified as one of:
`RAW_INPUT | HINT | CLAIM | OBSERVATION | EVIDENCE | DERIVED_FACT | AUTHORITATIVE_FACT | DECISION | ATTESTATION`.

No contract upgrades a `HINT` to an authoritative fact without the owning evidence.

## G — Authorities
Autorités existantes correspondant aux faits consommés; aucune nouvelle source de vérité créée par GWC.

**Forbidden authority pattern:** no arbitrary Markdown, prompt text, tool availability or remembered state may override the actual owning authority.

## H — Preconditions
- Structural input valid and bounded.
- Required authorities reachable or explicitly `UNAVAILABLE`.
- Required freshness/revision/SHA bindings available.
- No contradictory prerequisite state.
- For mutations: session/receipt/task/locks/governance requirements satisfied.

## I — Internal micro-state machine
validate bounded input → collect/validate required evidence → evaluate local invariants → derive domain status → derive routing disposition → emit bounded output.

## J — Transformation / decision algorithm
1. Parse/validate bounded input.
2. Determine required authority observations.
3. Refuse guesses for missing facts.
4. Apply contract-local invariants.
5. Produce domain status.
6. Produce engine disposition.
7. For mutations only, produce EffectPlan; never mutate from evaluation code directly.
8. Emit bounded output and evidence references.

## K — Determinism
- **Class:** `TEST_MUTATION` with execution semantics `MUTATE_THEN_VERIFY`.
- Pure/read-only contracts are deterministic given identical normalized input and identical evidence snapshot.
- Observation-dependent contracts bind result to evidence freshness/revisions.

## L — Invariants
Global GWC invariants + no over-interpretation of predecessor output + bounded data + fail closed on missing evidence.

Plus all global GWC invariants.

## M — Action model
- **Allowed action kinds:** READ / DERIVE / RECORD / MUTATE
- **Forbidden:** hidden mutation, authority bypass, stale evidence reuse, arbitrary shell fallback, unbounded projection.

## N — Current execution owner vs target owner
CURRENT: existing subsystem(s) listed in AM. TARGET: same owning authority behind a GWC adapter/contract wrapper.

## O — Capability / authorization model
For any mutation:
`callable ∧ authorized ∧ safeNow ∧ preconditionsSatisfied ∧ concurrencySatisfied = mayExecute`.
A present tool is never permission by itself.

## P — Lock model
No new lock unless EffectPlan declares a collision domain; consume existing Lock Service.

## Q — Concurrency model
Independent tasks may proceed in parallel when dependency/resource/lock scopes do not conflict.
Local blockers remain local.
Operational Memory process-local serialization is not treated as distributed locking.

## R — Output contract
- **Canonical output:** `RegressionRedProof`
- Bounded, typed, provenance-aware.
- No secret/raw credential projection.
- Consumers must not over-interpret this output beyond its declared semantics.

## S — Terminal statuses
`SUCCESS | NONE | AMBIGUOUS | UNVERIFIED | BLOCKED | CONFLICT | STALE (subset applicable)`

## T — Terminality formula
Success requires all contract-owned postconditions to be proven from current required evidence.
Missing/stale/conflicting evidence maps to fail-closed statuses, never implicit success.

## U — Reason codes
Contract-specific reason codes must be stable, enumerable, bounded and machine-testable.
Every failure/blocking reason must identify whether it is recoverable by reobserve, reconcile, wait or explicit change.

## V — Fail-closed model
Missing/stale/conflicting required evidence never defaults to success or permission. UNKNOWN remains UNKNOWN.

## W — Evidence model
EvidenceEnvelope(s) from the owning authorities with freshness, provenance and relevant SHA/revision binding.

## X — Freshness / staleness
Evidence is bound to relevant `observedAt`, SHA, stateVersion and/or revisions.
A semantic state change invalidates dependent evidence when its contract declares such dependency.

## Y — Attestation model
EPHEMERAL_RESULT_ONLY by default; promote to bounded durable reference only where an existing authority requires durable proof.

## Z — Persistence model
No new GWC store. Persist only through the existing owning authority when the contract is a RECORD/MUTATE step.

## AA — Secret / privacy model
Never persist tokens, resume secrets, raw authorization headers, arbitrary transport IDs, `.env` material or unbounded prompt bodies.
Use digests/bounded projections where persistence is necessary.

## AB — Replay model
`CONDITIONALLY_IDEMPOTENT unless explicitly NON_REPLAYABLE`

## AC — Recovery model
Recovery starts by observing the owning authority.
A mutation is replayed only when its replay class explicitly allows it and the recovery anchor proves it has not already happened.

## AD — Security / threat model
Prevent authority confusion, cross-session/repo/project leakage, stale evidence reuse, duplicate mutation, secret leakage and false attestation.

## AE — Observability
Emit bounded start/result/failure/reason-code observations where useful.
Observability is not authority.

## AF — Interface contract with predecessors
Consumes only the predecessor fields whose semantics are explicitly declared.
Revalidates any field whose freshness/ownership requires it.

## AG — Interface contract with successors
Exports `RegressionRedProof` with explicit semantics; successor may not silently strengthen it.

## AH — Skip contract
No skip unless the graph contains a deterministic condition and proof source.
If skipped, the route and proof are observable.

## AI — Reobserve contract
Reobserve when required evidence is stale, unavailable-but-recoverable, or an external asynchronous condition may have progressed.

## AJ — Reconcile contract
Reconcile only when multiple authorities/state projections are inconsistent.
Reconcile is not the same as refreshing an observation.

## AK — Blocked behavior
Block only the affected Task/contract/resource scope unless an actual global invariant is violated.

## AL — Compensation / rollback
For pure/read-only contracts: not applicable.
For mutations: use existing rollback/compensation only where real; otherwise forward recovery by observation. Never pretend irreversible GitHub effects are rollbackable.

## AM — Existing system mapping
- **Current mapping:** Tests exist; no formal regression-red contract.
- **Classification:** `PARTIAL`
- Existing behavior is preserved and wrapped/generalized before new engines are introduced.

## AN — Current hardcodes / generalization
MCP/S1/repository literals and single-repository assumptions must move to TargetContext/configuration where applicable; preserve historical MCP behavior backward-compatibly.

## AO — Future implementation slot
Implement behind a GWC contract module + adapter to existing authority. Exact file placement must follow repository architecture discovered at implementation baseline, not be invented prematurely.

## AP — Test contract
happy path; boundary; NONE/AMBIGUOUS/UNVERIFIED/STALE/CONFLICT as applicable; replay/recovery; security; non-regression; exact binding tests.

## AQ — Property / invariant tests
- Unknown evidence never becomes allow/success.
- Explicit predecessor semantics are preserved.
- No hidden mutation.
- Same normalized input + same evidence ⇒ same semantic result for deterministic profiles.
- Mutation contracts never execute without a valid EffectPlan.

## AR — Acceptance criteria
- Input/output schemas are bounded.
- Owning authorities are explicit.
- Fail-closed paths are tested.
- Replay/recovery behavior is defined.
- No new parallel authority.
- Existing non-regression suite remains green.

## AS — Open questions
No blocking open decision beyond profile-specific implementation details; unresolved choices must stay explicit.

## AT — Architectural findings
- Existing implementation class: `PARTIAL`.
- Any discovered hardcode is treated as a generalization target, not silently removed.
- Any mismatch between CURRENT and TARGET is explicit.

## AU — Future Task Blueprint mapping
This contract is implemented by one or more governed implementation tasks from `GWC_IMPLEMENTATION_TASK_BLUEPRINTS_R1.md`; implementation dependencies follow the contract graph and authority dependencies rather than numeric GW order alone.

## AV — Execution semantics
`MUTATE_THEN_VERIFY`

## AW — Effect Plan
Must be represented as an explicit EffectPlan with target authority, expected revisions/SHA, lock requirements, replay class, postconditions and recovery anchor.

## AX — Routing table
Primary predecessor: GW-29. Primary successor: GW-31. Additional skip/reobserve/reconcile/recovery edges must be declared deterministically.

## AY — Recovery anchor
Read-only contracts: input/evidence snapshot bindings.
Mutation contracts: target reference + task/session + relevant branch/PR/SHA/revision/job ID.

## AZ — Reconstruction rule
On process restart, reconstruct from authoritative stores and observations; do not rely on previous assistant text or a GWC workflow-state database.

## BA — Autonomy behavior
AUTO_CONTINUE when exactly one legal route exists and required evidence is sufficient; WAIT_EXTERNAL/BLOCK_LOCAL/fail-closed otherwise.


---

# GW-31 — REGRESSION_GREEN

## A — Identity
- **Contract ID:** `GW-31`
- **Canonical name:** `REGRESSION_GREEN`
- **Family:** `E — Development`
- **Contract version:** `1` (conceptual baseline)
- **Profile(s):** `DEV_MUTATION`
- **Architectural status:** `PARTIAL`
- **Integration class:** `PARTIAL`

## B — Purpose
Formaliser la responsabilité `REGRESSION_GREEN` comme contrat borné, versionné et composable, sans dupliquer les autorités existantes.

**Non-responsibilities:** does not steal ownership from Task Queue, Session, Lock Service, Live State, GitRegistry, GitHub, deploy/runtime or other downstream contracts.

## C — Position in global system
- **Logical predecessor(s):** GW-30
- **Logical successor(s):** GW-32 then re-review path
- **Re-entry:** allowed when authoritative evidence shows this contract’s postcondition is not yet proven.
- **Skip:** only when an explicit deterministic `SKIPPABLE_IF` condition exists.
- **Reobserve/Reconcile:** first-class graph edges, never implicit retries.

## D — Chronological role
- **Transport chronology:** may differ from GW numeric order.
- **Functional chronology:** `GW-31` owns only `REGRESSION_GREEN` responsibility.
- **Runtime chronology:** resolved by Workflow Graph, not `stepId + 1`.

## E — Contract input
Sorties prouvées des prédécesseurs applicables, contexte cible borné, références d’autorité nécessaires à `REGRESSION_GREEN`.

Input fields must be bounded, provenance-aware and typed as hint/claim/evidence/fact; raw secret material is forbidden unless explicitly unavoidable and ephemeral.

## F — Information semantics
Every field is classified as one of:
`RAW_INPUT | HINT | CLAIM | OBSERVATION | EVIDENCE | DERIVED_FACT | AUTHORITATIVE_FACT | DECISION | ATTESTATION`.

No contract upgrades a `HINT` to an authoritative fact without the owning evidence.

## G — Authorities
Autorités existantes correspondant aux faits consommés; aucune nouvelle source de vérité créée par GWC.

**Forbidden authority pattern:** no arbitrary Markdown, prompt text, tool availability or remembered state may override the actual owning authority.

## H — Preconditions
- Structural input valid and bounded.
- Required authorities reachable or explicitly `UNAVAILABLE`.
- Required freshness/revision/SHA bindings available.
- No contradictory prerequisite state.
- For mutations: session/receipt/task/locks/governance requirements satisfied.

## I — Internal micro-state machine
validate bounded input → collect/validate required evidence → evaluate local invariants → derive domain status → derive routing disposition → emit bounded output.

## J — Transformation / decision algorithm
1. Parse/validate bounded input.
2. Determine required authority observations.
3. Refuse guesses for missing facts.
4. Apply contract-local invariants.
5. Produce domain status.
6. Produce engine disposition.
7. For mutations only, produce EffectPlan; never mutate from evaluation code directly.
8. Emit bounded output and evidence references.

## K — Determinism
- **Class:** `DEV_MUTATION` with execution semantics `MUTATE_THEN_VERIFY`.
- Pure/read-only contracts are deterministic given identical normalized input and identical evidence snapshot.
- Observation-dependent contracts bind result to evidence freshness/revisions.

## L — Invariants
Global GWC invariants + no over-interpretation of predecessor output + bounded data + fail closed on missing evidence.

Plus all global GWC invariants.

## M — Action model
- **Allowed action kinds:** READ / DERIVE / RECORD / MUTATE
- **Forbidden:** hidden mutation, authority bypass, stale evidence reuse, arbitrary shell fallback, unbounded projection.

## N — Current execution owner vs target owner
CURRENT: existing subsystem(s) listed in AM. TARGET: same owning authority behind a GWC adapter/contract wrapper.

## O — Capability / authorization model
For any mutation:
`callable ∧ authorized ∧ safeNow ∧ preconditionsSatisfied ∧ concurrencySatisfied = mayExecute`.
A present tool is never permission by itself.

## P — Lock model
No new lock unless EffectPlan declares a collision domain; consume existing Lock Service.

## Q — Concurrency model
Independent tasks may proceed in parallel when dependency/resource/lock scopes do not conflict.
Local blockers remain local.
Operational Memory process-local serialization is not treated as distributed locking.

## R — Output contract
- **Canonical output:** `RegressionGreenCandidate`
- Bounded, typed, provenance-aware.
- No secret/raw credential projection.
- Consumers must not over-interpret this output beyond its declared semantics.

## S — Terminal statuses
`SUCCESS | NONE | AMBIGUOUS | UNVERIFIED | BLOCKED | CONFLICT | STALE (subset applicable)`

## T — Terminality formula
Success requires all contract-owned postconditions to be proven from current required evidence.
Missing/stale/conflicting evidence maps to fail-closed statuses, never implicit success.

## U — Reason codes
Contract-specific reason codes must be stable, enumerable, bounded and machine-testable.
Every failure/blocking reason must identify whether it is recoverable by reobserve, reconcile, wait or explicit change.

## V — Fail-closed model
Missing/stale/conflicting required evidence never defaults to success or permission. UNKNOWN remains UNKNOWN.

## W — Evidence model
EvidenceEnvelope(s) from the owning authorities with freshness, provenance and relevant SHA/revision binding.

## X — Freshness / staleness
Evidence is bound to relevant `observedAt`, SHA, stateVersion and/or revisions.
A semantic state change invalidates dependent evidence when its contract declares such dependency.

## Y — Attestation model
EPHEMERAL_RESULT_ONLY by default; promote to bounded durable reference only where an existing authority requires durable proof.

## Z — Persistence model
No new GWC store. Persist only through the existing owning authority when the contract is a RECORD/MUTATE step.

## AA — Secret / privacy model
Never persist tokens, resume secrets, raw authorization headers, arbitrary transport IDs, `.env` material or unbounded prompt bodies.
Use digests/bounded projections where persistence is necessary.

## AB — Replay model
`CONDITIONALLY_IDEMPOTENT unless explicitly NON_REPLAYABLE`

## AC — Recovery model
Recovery starts by observing the owning authority.
A mutation is replayed only when its replay class explicitly allows it and the recovery anchor proves it has not already happened.

## AD — Security / threat model
Prevent authority confusion, cross-session/repo/project leakage, stale evidence reuse, duplicate mutation, secret leakage and false attestation.

## AE — Observability
Emit bounded start/result/failure/reason-code observations where useful.
Observability is not authority.

## AF — Interface contract with predecessors
Consumes only the predecessor fields whose semantics are explicitly declared.
Revalidates any field whose freshness/ownership requires it.

## AG — Interface contract with successors
Exports `RegressionGreenCandidate` with explicit semantics; successor may not silently strengthen it.

## AH — Skip contract
No skip unless the graph contains a deterministic condition and proof source.
If skipped, the route and proof are observable.

## AI — Reobserve contract
Reobserve when required evidence is stale, unavailable-but-recoverable, or an external asynchronous condition may have progressed.

## AJ — Reconcile contract
Reconcile only when multiple authorities/state projections are inconsistent.
Reconcile is not the same as refreshing an observation.

## AK — Blocked behavior
Block only the affected Task/contract/resource scope unless an actual global invariant is violated.

## AL — Compensation / rollback
For pure/read-only contracts: not applicable.
For mutations: use existing rollback/compensation only where real; otherwise forward recovery by observation. Never pretend irreversible GitHub effects are rollbackable.

## AM — Existing system mapping
- **Current mapping:** Tests/code mutation process; no formal contract.
- **Classification:** `PARTIAL`
- Existing behavior is preserved and wrapped/generalized before new engines are introduced.

## AN — Current hardcodes / generalization
MCP/S1/repository literals and single-repository assumptions must move to TargetContext/configuration where applicable; preserve historical MCP behavior backward-compatibly.

## AO — Future implementation slot
Implement behind a GWC contract module + adapter to existing authority. Exact file placement must follow repository architecture discovered at implementation baseline, not be invented prematurely.

## AP — Test contract
happy path; boundary; NONE/AMBIGUOUS/UNVERIFIED/STALE/CONFLICT as applicable; replay/recovery; security; non-regression; exact binding tests.

## AQ — Property / invariant tests
- Unknown evidence never becomes allow/success.
- Explicit predecessor semantics are preserved.
- No hidden mutation.
- Same normalized input + same evidence ⇒ same semantic result for deterministic profiles.
- Mutation contracts never execute without a valid EffectPlan.

## AR — Acceptance criteria
- Input/output schemas are bounded.
- Owning authorities are explicit.
- Fail-closed paths are tested.
- Replay/recovery behavior is defined.
- No new parallel authority.
- Existing non-regression suite remains green.

## AS — Open questions
No blocking open decision beyond profile-specific implementation details; unresolved choices must stay explicit.

## AT — Architectural findings
- Existing implementation class: `PARTIAL`.
- Any discovered hardcode is treated as a generalization target, not silently removed.
- Any mismatch between CURRENT and TARGET is explicit.

## AU — Future Task Blueprint mapping
This contract is implemented by one or more governed implementation tasks from `GWC_IMPLEMENTATION_TASK_BLUEPRINTS_R1.md`; implementation dependencies follow the contract graph and authority dependencies rather than numeric GW order alone.

## AV — Execution semantics
`MUTATE_THEN_VERIFY`

## AW — Effect Plan
Must be represented as an explicit EffectPlan with target authority, expected revisions/SHA, lock requirements, replay class, postconditions and recovery anchor.

## AX — Routing table
Primary predecessor: GW-30. Primary successor: GW-32 then re-review path. Additional skip/reobserve/reconcile/recovery edges must be declared deterministically.

## AY — Recovery anchor
Read-only contracts: input/evidence snapshot bindings.
Mutation contracts: target reference + task/session + relevant branch/PR/SHA/revision/job ID.

## AZ — Reconstruction rule
On process restart, reconstruct from authoritative stores and observations; do not rely on previous assistant text or a GWC workflow-state database.

## BA — Autonomy behavior
AUTO_CONTINUE when exactly one legal route exists and required evidence is sufficient; WAIT_EXTERNAL/BLOCK_LOCAL/fail-closed otherwise.


---

# GW-32 — FULL_REGRESSION

## A — Identity
- **Contract ID:** `GW-32`
- **Canonical name:** `FULL_REGRESSION`
- **Family:** `E — Development`
- **Contract version:** `1` (conceptual baseline)
- **Profile(s):** `CI_OBSERVER`
- **Architectural status:** `REUSE`
- **Integration class:** `REUSE`

## B — Purpose
Formaliser la responsabilité `FULL_REGRESSION` comme contrat borné, versionné et composable, sans dupliquer les autorités existantes.

**Non-responsibilities:** does not steal ownership from Task Queue, Session, Lock Service, Live State, GitRegistry, GitHub, deploy/runtime or other downstream contracts.

## C — Position in global system
- **Logical predecessor(s):** GW-31
- **Logical successor(s):** GW-33
- **Re-entry:** allowed when authoritative evidence shows this contract’s postcondition is not yet proven.
- **Skip:** only when an explicit deterministic `SKIPPABLE_IF` condition exists.
- **Reobserve/Reconcile:** first-class graph edges, never implicit retries.

## D — Chronological role
- **Transport chronology:** may differ from GW numeric order.
- **Functional chronology:** `GW-32` owns only `FULL_REGRESSION` responsibility.
- **Runtime chronology:** resolved by Workflow Graph, not `stepId + 1`.

## E — Contract input
Sorties prouvées des prédécesseurs applicables, contexte cible borné, références d’autorité nécessaires à `FULL_REGRESSION`.

Input fields must be bounded, provenance-aware and typed as hint/claim/evidence/fact; raw secret material is forbidden unless explicitly unavoidable and ephemeral.

## F — Information semantics
Every field is classified as one of:
`RAW_INPUT | HINT | CLAIM | OBSERVATION | EVIDENCE | DERIVED_FACT | AUTHORITATIVE_FACT | DECISION | ATTESTATION`.

No contract upgrades a `HINT` to an authoritative fact without the owning evidence.

## G — Authorities
Autorités existantes correspondant aux faits consommés; aucune nouvelle source de vérité créée par GWC.

**Forbidden authority pattern:** no arbitrary Markdown, prompt text, tool availability or remembered state may override the actual owning authority.

## H — Preconditions
- Structural input valid and bounded.
- Required authorities reachable or explicitly `UNAVAILABLE`.
- Required freshness/revision/SHA bindings available.
- No contradictory prerequisite state.
- For mutations: session/receipt/task/locks/governance requirements satisfied.

## I — Internal micro-state machine
validate bounded input → collect/validate required evidence → evaluate local invariants → derive domain status → derive routing disposition → emit bounded output.

## J — Transformation / decision algorithm
1. Parse/validate bounded input.
2. Determine required authority observations.
3. Refuse guesses for missing facts.
4. Apply contract-local invariants.
5. Produce domain status.
6. Produce engine disposition.
7. For mutations only, produce EffectPlan; never mutate from evaluation code directly.
8. Emit bounded output and evidence references.

## K — Determinism
- **Class:** `CI_OBSERVER` with execution semantics `OBSERVE_AND_EVALUATE`.
- Pure/read-only contracts are deterministic given identical normalized input and identical evidence snapshot.
- Observation-dependent contracts bind result to evidence freshness/revisions.

## L — Invariants
Global GWC invariants + no over-interpretation of predecessor output + bounded data + fail closed on missing evidence.

Plus all global GWC invariants.

## M — Action model
- **Allowed action kinds:** READ / DERIVE
- **Forbidden:** hidden mutation, authority bypass, stale evidence reuse, arbitrary shell fallback, unbounded projection.

## N — Current execution owner vs target owner
CURRENT: existing subsystem(s) listed in AM. TARGET: same owning authority behind a GWC adapter/contract wrapper.

## O — Capability / authorization model
For any mutation:
`callable ∧ authorized ∧ safeNow ∧ preconditionsSatisfied ∧ concurrencySatisfied = mayExecute`.
A present tool is never permission by itself.

## P — Lock model
No new lock unless EffectPlan declares a collision domain; consume existing Lock Service.

## Q — Concurrency model
Independent tasks may proceed in parallel when dependency/resource/lock scopes do not conflict.
Local blockers remain local.
Operational Memory process-local serialization is not treated as distributed locking.

## R — Output contract
- **Canonical output:** `FullRegressionProof`
- Bounded, typed, provenance-aware.
- No secret/raw credential projection.
- Consumers must not over-interpret this output beyond its declared semantics.

## S — Terminal statuses
`SUCCESS | NONE | AMBIGUOUS | UNVERIFIED | BLOCKED | CONFLICT | STALE (subset applicable)`

## T — Terminality formula
Success requires all contract-owned postconditions to be proven from current required evidence.
Missing/stale/conflicting evidence maps to fail-closed statuses, never implicit success.

## U — Reason codes
Contract-specific reason codes must be stable, enumerable, bounded and machine-testable.
Every failure/blocking reason must identify whether it is recoverable by reobserve, reconcile, wait or explicit change.

## V — Fail-closed model
Missing/stale/conflicting required evidence never defaults to success or permission. UNKNOWN remains UNKNOWN.

## W — Evidence model
EvidenceEnvelope(s) from the owning authorities with freshness, provenance and relevant SHA/revision binding.

## X — Freshness / staleness
Evidence is bound to relevant `observedAt`, SHA, stateVersion and/or revisions.
A semantic state change invalidates dependent evidence when its contract declares such dependency.

## Y — Attestation model
EPHEMERAL_RESULT_ONLY by default; promote to bounded durable reference only where an existing authority requires durable proof.

## Z — Persistence model
No new GWC store. Persist only through the existing owning authority when the contract is a RECORD/MUTATE step.

## AA — Secret / privacy model
Never persist tokens, resume secrets, raw authorization headers, arbitrary transport IDs, `.env` material or unbounded prompt bodies.
Use digests/bounded projections where persistence is necessary.

## AB — Replay model
`READ_ONLY`

## AC — Recovery model
Recovery starts by observing the owning authority.
A mutation is replayed only when its replay class explicitly allows it and the recovery anchor proves it has not already happened.

## AD — Security / threat model
Prevent authority confusion, cross-session/repo/project leakage, stale evidence reuse, duplicate mutation, secret leakage and false attestation.

## AE — Observability
Emit bounded start/result/failure/reason-code observations where useful.
Observability is not authority.

## AF — Interface contract with predecessors
Consumes only the predecessor fields whose semantics are explicitly declared.
Revalidates any field whose freshness/ownership requires it.

## AG — Interface contract with successors
Exports `FullRegressionProof` with explicit semantics; successor may not silently strengthen it.

## AH — Skip contract
No skip unless the graph contains a deterministic condition and proof source.
If skipped, the route and proof are observable.

## AI — Reobserve contract
Reobserve when required evidence is stale, unavailable-but-recoverable, or an external asynchronous condition may have progressed.

## AJ — Reconcile contract
Reconcile only when multiple authorities/state projections are inconsistent.
Reconcile is not the same as refreshing an observation.

## AK — Blocked behavior
Block only the affected Task/contract/resource scope unless an actual global invariant is violated.

## AL — Compensation / rollback
For pure/read-only contracts: not applicable.
For mutations: use existing rollback/compensation only where real; otherwise forward recovery by observation. Never pretend irreversible GitHub effects are rollbackable.

## AM — Existing system mapping
- **Current mapping:** package scripts + mcp-ci.yml.
- **Classification:** `REUSE`
- Existing behavior is preserved and wrapped/generalized before new engines are introduced.

## AN — Current hardcodes / generalization
MCP/S1/repository literals and single-repository assumptions must move to TargetContext/configuration where applicable; preserve historical MCP behavior backward-compatibly.

## AO — Future implementation slot
Implement behind a GWC contract module + adapter to existing authority. Exact file placement must follow repository architecture discovered at implementation baseline, not be invented prematurely.

## AP — Test contract
happy path; boundary; NONE/AMBIGUOUS/UNVERIFIED/STALE/CONFLICT as applicable; replay/recovery; security; non-regression; exact binding tests.

## AQ — Property / invariant tests
- Unknown evidence never becomes allow/success.
- Explicit predecessor semantics are preserved.
- No hidden mutation.
- Same normalized input + same evidence ⇒ same semantic result for deterministic profiles.
- Mutation contracts never execute without a valid EffectPlan.

## AR — Acceptance criteria
- Input/output schemas are bounded.
- Owning authorities are explicit.
- Fail-closed paths are tested.
- Replay/recovery behavior is defined.
- No new parallel authority.
- Existing non-regression suite remains green.

## AS — Open questions
No blocking open decision beyond profile-specific implementation details; unresolved choices must stay explicit.

## AT — Architectural findings
- Existing implementation class: `REUSE`.
- Any discovered hardcode is treated as a generalization target, not silently removed.
- Any mismatch between CURRENT and TARGET is explicit.

## AU — Future Task Blueprint mapping
This contract is implemented by one or more governed implementation tasks from `GWC_IMPLEMENTATION_TASK_BLUEPRINTS_R1.md`; implementation dependencies follow the contract graph and authority dependencies rather than numeric GW order alone.

## AV — Execution semantics
`OBSERVE_AND_EVALUATE`

## AW — Effect Plan
None.

## AX — Routing table
Primary predecessor: GW-31. Primary successor: GW-33. Additional skip/reobserve/reconcile/recovery edges must be declared deterministically.

## AY — Recovery anchor
Read-only contracts: input/evidence snapshot bindings.
Mutation contracts: target reference + task/session + relevant branch/PR/SHA/revision/job ID.

## AZ — Reconstruction rule
On process restart, reconstruct from authoritative stores and observations; do not rely on previous assistant text or a GWC workflow-state database.

## BA — Autonomy behavior
AUTO_CONTINUE when exactly one legal route exists and required evidence is sufficient; WAIT_EXTERNAL/BLOCK_LOCAL/fail-closed otherwise.


---

# GW-33 — NON_TERMINAL_DOCUMENTATION

## A — Identity
- **Contract ID:** `GW-33`
- **Canonical name:** `NON_TERMINAL_DOCUMENTATION`
- **Family:** `E — Development`
- **Contract version:** `1` (conceptual baseline)
- **Profile(s):** `DOC_MUTATION`
- **Architectural status:** `PARTIAL`
- **Integration class:** `PARTIAL`

## B — Purpose
Formaliser la responsabilité `NON_TERMINAL_DOCUMENTATION` comme contrat borné, versionné et composable, sans dupliquer les autorités existantes.

**Non-responsibilities:** does not steal ownership from Task Queue, Session, Lock Service, Live State, GitRegistry, GitHub, deploy/runtime or other downstream contracts.

## C — Position in global system
- **Logical predecessor(s):** GW-32
- **Logical successor(s):** GW-34
- **Re-entry:** allowed when authoritative evidence shows this contract’s postcondition is not yet proven.
- **Skip:** only when an explicit deterministic `SKIPPABLE_IF` condition exists.
- **Reobserve/Reconcile:** first-class graph edges, never implicit retries.

## D — Chronological role
- **Transport chronology:** may differ from GW numeric order.
- **Functional chronology:** `GW-33` owns only `NON_TERMINAL_DOCUMENTATION` responsibility.
- **Runtime chronology:** resolved by Workflow Graph, not `stepId + 1`.

## E — Contract input
Sorties prouvées des prédécesseurs applicables, contexte cible borné, références d’autorité nécessaires à `NON_TERMINAL_DOCUMENTATION`.

Input fields must be bounded, provenance-aware and typed as hint/claim/evidence/fact; raw secret material is forbidden unless explicitly unavoidable and ephemeral.

## F — Information semantics
Every field is classified as one of:
`RAW_INPUT | HINT | CLAIM | OBSERVATION | EVIDENCE | DERIVED_FACT | AUTHORITATIVE_FACT | DECISION | ATTESTATION`.

No contract upgrades a `HINT` to an authoritative fact without the owning evidence.

## G — Authorities
Autorités existantes correspondant aux faits consommés; aucune nouvelle source de vérité créée par GWC.

**Forbidden authority pattern:** no arbitrary Markdown, prompt text, tool availability or remembered state may override the actual owning authority.

## H — Preconditions
- Structural input valid and bounded.
- Required authorities reachable or explicitly `UNAVAILABLE`.
- Required freshness/revision/SHA bindings available.
- No contradictory prerequisite state.
- For mutations: session/receipt/task/locks/governance requirements satisfied.

## I — Internal micro-state machine
validate bounded input → collect/validate required evidence → evaluate local invariants → derive domain status → derive routing disposition → emit bounded output.

## J — Transformation / decision algorithm
1. Parse/validate bounded input.
2. Determine required authority observations.
3. Refuse guesses for missing facts.
4. Apply contract-local invariants.
5. Produce domain status.
6. Produce engine disposition.
7. For mutations only, produce EffectPlan; never mutate from evaluation code directly.
8. Emit bounded output and evidence references.

## K — Determinism
- **Class:** `DOC_MUTATION` with execution semantics `MUTATE_THEN_VERIFY`.
- Pure/read-only contracts are deterministic given identical normalized input and identical evidence snapshot.
- Observation-dependent contracts bind result to evidence freshness/revisions.

## L — Invariants
Global GWC invariants + no over-interpretation of predecessor output + bounded data + fail closed on missing evidence.

Plus all global GWC invariants.

## M — Action model
- **Allowed action kinds:** READ / DERIVE / RECORD / MUTATE
- **Forbidden:** hidden mutation, authority bypass, stale evidence reuse, arbitrary shell fallback, unbounded projection.

## N — Current execution owner vs target owner
CURRENT: existing subsystem(s) listed in AM. TARGET: same owning authority behind a GWC adapter/contract wrapper.

## O — Capability / authorization model
For any mutation:
`callable ∧ authorized ∧ safeNow ∧ preconditionsSatisfied ∧ concurrencySatisfied = mayExecute`.
A present tool is never permission by itself.

## P — Lock model
No new lock unless EffectPlan declares a collision domain; consume existing Lock Service.

## Q — Concurrency model
Independent tasks may proceed in parallel when dependency/resource/lock scopes do not conflict.
Local blockers remain local.
Operational Memory process-local serialization is not treated as distributed locking.

## R — Output contract
- **Canonical output:** `DocumentationCandidate`
- Bounded, typed, provenance-aware.
- No secret/raw credential projection.
- Consumers must not over-interpret this output beyond its declared semantics.

## S — Terminal statuses
`SUCCESS | NONE | AMBIGUOUS | UNVERIFIED | BLOCKED | CONFLICT | STALE (subset applicable)`

## T — Terminality formula
Success requires all contract-owned postconditions to be proven from current required evidence.
Missing/stale/conflicting evidence maps to fail-closed statuses, never implicit success.

## U — Reason codes
Contract-specific reason codes must be stable, enumerable, bounded and machine-testable.
Every failure/blocking reason must identify whether it is recoverable by reobserve, reconcile, wait or explicit change.

## V — Fail-closed model
Missing/stale/conflicting required evidence never defaults to success or permission. UNKNOWN remains UNKNOWN.

## W — Evidence model
EvidenceEnvelope(s) from the owning authorities with freshness, provenance and relevant SHA/revision binding.

## X — Freshness / staleness
Evidence is bound to relevant `observedAt`, SHA, stateVersion and/or revisions.
A semantic state change invalidates dependent evidence when its contract declares such dependency.

## Y — Attestation model
EPHEMERAL_RESULT_ONLY by default; promote to bounded durable reference only where an existing authority requires durable proof.

## Z — Persistence model
No new GWC store. Persist only through the existing owning authority when the contract is a RECORD/MUTATE step.

## AA — Secret / privacy model
Never persist tokens, resume secrets, raw authorization headers, arbitrary transport IDs, `.env` material or unbounded prompt bodies.
Use digests/bounded projections where persistence is necessary.

## AB — Replay model
`CONDITIONALLY_IDEMPOTENT unless explicitly NON_REPLAYABLE`

## AC — Recovery model
Recovery starts by observing the owning authority.
A mutation is replayed only when its replay class explicitly allows it and the recovery anchor proves it has not already happened.

## AD — Security / threat model
Prevent authority confusion, cross-session/repo/project leakage, stale evidence reuse, duplicate mutation, secret leakage and false attestation.

## AE — Observability
Emit bounded start/result/failure/reason-code observations where useful.
Observability is not authority.

## AF — Interface contract with predecessors
Consumes only the predecessor fields whose semantics are explicitly declared.
Revalidates any field whose freshness/ownership requires it.

## AG — Interface contract with successors
Exports `DocumentationCandidate` with explicit semantics; successor may not silently strengthen it.

## AH — Skip contract
No skip unless the graph contains a deterministic condition and proof source.
If skipped, the route and proof are observable.

## AI — Reobserve contract
Reobserve when required evidence is stale, unavailable-but-recoverable, or an external asynchronous condition may have progressed.

## AJ — Reconcile contract
Reconcile only when multiple authorities/state projections are inconsistent.
Reconcile is not the same as refreshing an observation.

## AK — Blocked behavior
Block only the affected Task/contract/resource scope unless an actual global invariant is violated.

## AL — Compensation / rollback
For pure/read-only contracts: not applicable.
For mutations: use existing rollback/compensation only where real; otherwise forward recovery by observation. Never pretend irreversible GitHub effects are rollbackable.

## AM — Existing system mapping
- **Current mapping:** Documentation governance/process.
- **Classification:** `PARTIAL`
- Existing behavior is preserved and wrapped/generalized before new engines are introduced.

## AN — Current hardcodes / generalization
MCP/S1/repository literals and single-repository assumptions must move to TargetContext/configuration where applicable; preserve historical MCP behavior backward-compatibly.

## AO — Future implementation slot
Implement behind a GWC contract module + adapter to existing authority. Exact file placement must follow repository architecture discovered at implementation baseline, not be invented prematurely.

## AP — Test contract
happy path; boundary; NONE/AMBIGUOUS/UNVERIFIED/STALE/CONFLICT as applicable; replay/recovery; security; non-regression; exact binding tests.

## AQ — Property / invariant tests
- Unknown evidence never becomes allow/success.
- Explicit predecessor semantics are preserved.
- No hidden mutation.
- Same normalized input + same evidence ⇒ same semantic result for deterministic profiles.
- Mutation contracts never execute without a valid EffectPlan.

## AR — Acceptance criteria
- Input/output schemas are bounded.
- Owning authorities are explicit.
- Fail-closed paths are tested.
- Replay/recovery behavior is defined.
- No new parallel authority.
- Existing non-regression suite remains green.

## AS — Open questions
No blocking open decision beyond profile-specific implementation details; unresolved choices must stay explicit.

## AT — Architectural findings
- Existing implementation class: `PARTIAL`.
- Any discovered hardcode is treated as a generalization target, not silently removed.
- Any mismatch between CURRENT and TARGET is explicit.

## AU — Future Task Blueprint mapping
This contract is implemented by one or more governed implementation tasks from `GWC_IMPLEMENTATION_TASK_BLUEPRINTS_R1.md`; implementation dependencies follow the contract graph and authority dependencies rather than numeric GW order alone.

## AV — Execution semantics
`MUTATE_THEN_VERIFY`

## AW — Effect Plan
Must be represented as an explicit EffectPlan with target authority, expected revisions/SHA, lock requirements, replay class, postconditions and recovery anchor.

## AX — Routing table
Primary predecessor: GW-32. Primary successor: GW-34. Additional skip/reobserve/reconcile/recovery edges must be declared deterministically.

## AY — Recovery anchor
Read-only contracts: input/evidence snapshot bindings.
Mutation contracts: target reference + task/session + relevant branch/PR/SHA/revision/job ID.

## AZ — Reconstruction rule
On process restart, reconstruct from authoritative stores and observations; do not rely on previous assistant text or a GWC workflow-state database.

## BA — Autonomy behavior
AUTO_CONTINUE when exactly one legal route exists and required evidence is sufficient; WAIT_EXTERNAL/BLOCK_LOCAL/fail-closed otherwise.


---

# GW-34 — DRAFT_PR

## A — Identity
- **Contract ID:** `GW-34`
- **Canonical name:** `DRAFT_PR`
- **Family:** `F — Review and Merge`
- **Contract version:** `1` (conceptual baseline)
- **Profile(s):** `GIT_MUTATION`
- **Architectural status:** `CANDIDATE`
- **Integration class:** `CANDIDATE`

## B — Purpose
Formaliser la responsabilité `DRAFT_PR` comme contrat borné, versionné et composable, sans dupliquer les autorités existantes.

**Non-responsibilities:** does not steal ownership from Task Queue, Session, Lock Service, Live State, GitRegistry, GitHub, deploy/runtime or other downstream contracts.

## C — Position in global system
- **Logical predecessor(s):** GW-33
- **Logical successor(s):** GW-35
- **Re-entry:** allowed when authoritative evidence shows this contract’s postcondition is not yet proven.
- **Skip:** only when an explicit deterministic `SKIPPABLE_IF` condition exists.
- **Reobserve/Reconcile:** first-class graph edges, never implicit retries.

## D — Chronological role
- **Transport chronology:** may differ from GW numeric order.
- **Functional chronology:** `GW-34` owns only `DRAFT_PR` responsibility.
- **Runtime chronology:** resolved by Workflow Graph, not `stepId + 1`.

## E — Contract input
Sorties prouvées des prédécesseurs applicables, contexte cible borné, références d’autorité nécessaires à `DRAFT_PR`.

Input fields must be bounded, provenance-aware and typed as hint/claim/evidence/fact; raw secret material is forbidden unless explicitly unavoidable and ephemeral.

## F — Information semantics
Every field is classified as one of:
`RAW_INPUT | HINT | CLAIM | OBSERVATION | EVIDENCE | DERIVED_FACT | AUTHORITATIVE_FACT | DECISION | ATTESTATION`.

No contract upgrades a `HINT` to an authoritative fact without the owning evidence.

## G — Authorities
Autorités existantes correspondant aux faits consommés; aucune nouvelle source de vérité créée par GWC.

**Forbidden authority pattern:** no arbitrary Markdown, prompt text, tool availability or remembered state may override the actual owning authority.

## H — Preconditions
- Structural input valid and bounded.
- Required authorities reachable or explicitly `UNAVAILABLE`.
- Required freshness/revision/SHA bindings available.
- No contradictory prerequisite state.
- For mutations: session/receipt/task/locks/governance requirements satisfied.

## I — Internal micro-state machine
validate bounded input → collect/validate required evidence → evaluate local invariants → derive domain status → derive routing disposition → emit bounded output.

## J — Transformation / decision algorithm
1. Parse/validate bounded input.
2. Determine required authority observations.
3. Refuse guesses for missing facts.
4. Apply contract-local invariants.
5. Produce domain status.
6. Produce engine disposition.
7. For mutations only, produce EffectPlan; never mutate from evaluation code directly.
8. Emit bounded output and evidence references.

## K — Determinism
- **Class:** `GIT_MUTATION` with execution semantics `MUTATE_THEN_VERIFY`.
- Pure/read-only contracts are deterministic given identical normalized input and identical evidence snapshot.
- Observation-dependent contracts bind result to evidence freshness/revisions.

## L — Invariants
Global GWC invariants + no over-interpretation of predecessor output + bounded data + fail closed on missing evidence.

Plus all global GWC invariants.

## M — Action model
- **Allowed action kinds:** READ / DERIVE / RECORD / MUTATE
- **Forbidden:** hidden mutation, authority bypass, stale evidence reuse, arbitrary shell fallback, unbounded projection.

## N — Current execution owner vs target owner
CURRENT: existing subsystem(s) listed in AM. TARGET: same owning authority behind a GWC adapter/contract wrapper.

## O — Capability / authorization model
For any mutation:
`callable ∧ authorized ∧ safeNow ∧ preconditionsSatisfied ∧ concurrencySatisfied = mayExecute`.
A present tool is never permission by itself.

## P — Lock model
No new lock unless EffectPlan declares a collision domain; consume existing Lock Service.

## Q — Concurrency model
Independent tasks may proceed in parallel when dependency/resource/lock scopes do not conflict.
Local blockers remain local.
Operational Memory process-local serialization is not treated as distributed locking.

## R — Output contract
- **Canonical output:** `DraftPullRequest`
- Bounded, typed, provenance-aware.
- No secret/raw credential projection.
- Consumers must not over-interpret this output beyond its declared semantics.

## S — Terminal statuses
`SUCCESS | NONE | AMBIGUOUS | UNVERIFIED | BLOCKED | CONFLICT | STALE (subset applicable)`

## T — Terminality formula
Success requires all contract-owned postconditions to be proven from current required evidence.
Missing/stale/conflicting evidence maps to fail-closed statuses, never implicit success.

## U — Reason codes
Contract-specific reason codes must be stable, enumerable, bounded and machine-testable.
Every failure/blocking reason must identify whether it is recoverable by reobserve, reconcile, wait or explicit change.

## V — Fail-closed model
Missing/stale/conflicting required evidence never defaults to success or permission. UNKNOWN remains UNKNOWN.

## W — Evidence model
EvidenceEnvelope(s) from the owning authorities with freshness, provenance and relevant SHA/revision binding.

## X — Freshness / staleness
Evidence is bound to relevant `observedAt`, SHA, stateVersion and/or revisions.
A semantic state change invalidates dependent evidence when its contract declares such dependency.

## Y — Attestation model
EPHEMERAL_RESULT_ONLY by default; promote to bounded durable reference only where an existing authority requires durable proof.

## Z — Persistence model
No new GWC store. Persist only through the existing owning authority when the contract is a RECORD/MUTATE step.

## AA — Secret / privacy model
Never persist tokens, resume secrets, raw authorization headers, arbitrary transport IDs, `.env` material or unbounded prompt bodies.
Use digests/bounded projections where persistence is necessary.

## AB — Replay model
`CONDITIONALLY_IDEMPOTENT unless explicitly NON_REPLAYABLE`

## AC — Recovery model
Recovery starts by observing the owning authority.
A mutation is replayed only when its replay class explicitly allows it and the recovery anchor proves it has not already happened.

## AD — Security / threat model
Prevent authority confusion, cross-session/repo/project leakage, stale evidence reuse, duplicate mutation, secret leakage and false attestation.

## AE — Observability
Emit bounded start/result/failure/reason-code observations where useful.
Observability is not authority.

## AF — Interface contract with predecessors
Consumes only the predecessor fields whose semantics are explicitly declared.
Revalidates any field whose freshness/ownership requires it.

## AG — Interface contract with successors
Exports `DraftPullRequest` with explicit semantics; successor may not silently strengthen it.

## AH — Skip contract
No skip unless the graph contains a deterministic condition and proof source.
If skipped, the route and proof are observable.

## AI — Reobserve contract
Reobserve when required evidence is stale, unavailable-but-recoverable, or an external asynchronous condition may have progressed.

## AJ — Reconcile contract
Reconcile only when multiple authorities/state projections are inconsistent.
Reconcile is not the same as refreshing an observation.

## AK — Blocked behavior
Block only the affected Task/contract/resource scope unless an actual global invariant is violated.

## AL — Compensation / rollback
For pure/read-only contracts: not applicable.
For mutations: use existing rollback/compensation only where real; otherwise forward recovery by observation. Never pretend irreversible GitHub effects are rollbackable.

## AM — Existing system mapping
- **Current mapping:** Candidate PR #90 github_create_pull_request.
- **Classification:** `CANDIDATE`
- Existing behavior is preserved and wrapped/generalized before new engines are introduced.

## AN — Current hardcodes / generalization
MCP/S1/repository literals and single-repository assumptions must move to TargetContext/configuration where applicable; preserve historical MCP behavior backward-compatibly.

## AO — Future implementation slot
Implement behind a GWC contract module + adapter to existing authority. Exact file placement must follow repository architecture discovered at implementation baseline, not be invented prematurely.

## AP — Test contract
happy path; boundary; NONE/AMBIGUOUS/UNVERIFIED/STALE/CONFLICT as applicable; replay/recovery; security; non-regression; exact binding tests.

## AQ — Property / invariant tests
- Unknown evidence never becomes allow/success.
- Explicit predecessor semantics are preserved.
- No hidden mutation.
- Same normalized input + same evidence ⇒ same semantic result for deterministic profiles.
- Mutation contracts never execute without a valid EffectPlan.

## AR — Acceptance criteria
- Input/output schemas are bounded.
- Owning authorities are explicit.
- Fail-closed paths are tested.
- Replay/recovery behavior is defined.
- No new parallel authority.
- Existing non-regression suite remains green.

## AS — Open questions
No blocking open decision beyond profile-specific implementation details; unresolved choices must stay explicit.

## AT — Architectural findings
- Existing implementation class: `CANDIDATE`.
- Any discovered hardcode is treated as a generalization target, not silently removed.
- Any mismatch between CURRENT and TARGET is explicit.

## AU — Future Task Blueprint mapping
This contract is implemented by one or more governed implementation tasks from `GWC_IMPLEMENTATION_TASK_BLUEPRINTS_R1.md`; implementation dependencies follow the contract graph and authority dependencies rather than numeric GW order alone.

## AV — Execution semantics
`MUTATE_THEN_VERIFY`

## AW — Effect Plan
Must be represented as an explicit EffectPlan with target authority, expected revisions/SHA, lock requirements, replay class, postconditions and recovery anchor.

## AX — Routing table
Primary predecessor: GW-33. Primary successor: GW-35. Additional skip/reobserve/reconcile/recovery edges must be declared deterministically.

## AY — Recovery anchor
Read-only contracts: input/evidence snapshot bindings.
Mutation contracts: target reference + task/session + relevant branch/PR/SHA/revision/job ID.

## AZ — Reconstruction rule
On process restart, reconstruct from authoritative stores and observations; do not rely on previous assistant text or a GWC workflow-state database.

## BA — Autonomy behavior
AUTO_CONTINUE when exactly one legal route exists and required evidence is sufficient; WAIT_EXTERNAL/BLOCK_LOCAL/fail-closed otherwise.


---

# GW-35 — EXACT_DIFF_REVIEW

## A — Identity
- **Contract ID:** `GW-35`
- **Canonical name:** `EXACT_DIFF_REVIEW`
- **Family:** `F — Review and Merge`
- **Contract version:** `1` (conceptual baseline)
- **Profile(s):** `GIT_OBSERVER`
- **Architectural status:** `PARTIAL/EXTEND`
- **Integration class:** `PARTIAL/EXTEND`

## B — Purpose
Formaliser la responsabilité `EXACT_DIFF_REVIEW` comme contrat borné, versionné et composable, sans dupliquer les autorités existantes.

**Non-responsibilities:** does not steal ownership from Task Queue, Session, Lock Service, Live State, GitRegistry, GitHub, deploy/runtime or other downstream contracts.

## C — Position in global system
- **Logical predecessor(s):** GW-34
- **Logical successor(s):** GW-36
- **Re-entry:** allowed when authoritative evidence shows this contract’s postcondition is not yet proven.
- **Skip:** only when an explicit deterministic `SKIPPABLE_IF` condition exists.
- **Reobserve/Reconcile:** first-class graph edges, never implicit retries.

## D — Chronological role
- **Transport chronology:** may differ from GW numeric order.
- **Functional chronology:** `GW-35` owns only `EXACT_DIFF_REVIEW` responsibility.
- **Runtime chronology:** resolved by Workflow Graph, not `stepId + 1`.

## E — Contract input
Sorties prouvées des prédécesseurs applicables, contexte cible borné, références d’autorité nécessaires à `EXACT_DIFF_REVIEW`.

Input fields must be bounded, provenance-aware and typed as hint/claim/evidence/fact; raw secret material is forbidden unless explicitly unavoidable and ephemeral.

## F — Information semantics
Every field is classified as one of:
`RAW_INPUT | HINT | CLAIM | OBSERVATION | EVIDENCE | DERIVED_FACT | AUTHORITATIVE_FACT | DECISION | ATTESTATION`.

No contract upgrades a `HINT` to an authoritative fact without the owning evidence.

## G — Authorities
Autorités existantes correspondant aux faits consommés; aucune nouvelle source de vérité créée par GWC.

**Forbidden authority pattern:** no arbitrary Markdown, prompt text, tool availability or remembered state may override the actual owning authority.

## H — Preconditions
- Structural input valid and bounded.
- Required authorities reachable or explicitly `UNAVAILABLE`.
- Required freshness/revision/SHA bindings available.
- No contradictory prerequisite state.
- For mutations: session/receipt/task/locks/governance requirements satisfied.

## I — Internal micro-state machine
validate bounded input → collect/validate required evidence → evaluate local invariants → derive domain status → derive routing disposition → emit bounded output.

## J — Transformation / decision algorithm
1. Parse/validate bounded input.
2. Determine required authority observations.
3. Refuse guesses for missing facts.
4. Apply contract-local invariants.
5. Produce domain status.
6. Produce engine disposition.
7. For mutations only, produce EffectPlan; never mutate from evaluation code directly.
8. Emit bounded output and evidence references.

## K — Determinism
- **Class:** `GIT_OBSERVER` with execution semantics `OBSERVE_AND_EVALUATE`.
- Pure/read-only contracts are deterministic given identical normalized input and identical evidence snapshot.
- Observation-dependent contracts bind result to evidence freshness/revisions.

## L — Invariants
Global GWC invariants + no over-interpretation of predecessor output + bounded data + fail closed on missing evidence.

Plus all global GWC invariants.

## M — Action model
- **Allowed action kinds:** READ / DERIVE
- **Forbidden:** hidden mutation, authority bypass, stale evidence reuse, arbitrary shell fallback, unbounded projection.

## N — Current execution owner vs target owner
CURRENT: existing subsystem(s) listed in AM. TARGET: same owning authority behind a GWC adapter/contract wrapper.

## O — Capability / authorization model
For any mutation:
`callable ∧ authorized ∧ safeNow ∧ preconditionsSatisfied ∧ concurrencySatisfied = mayExecute`.
A present tool is never permission by itself.

## P — Lock model
No new lock unless EffectPlan declares a collision domain; consume existing Lock Service.

## Q — Concurrency model
Independent tasks may proceed in parallel when dependency/resource/lock scopes do not conflict.
Local blockers remain local.
Operational Memory process-local serialization is not treated as distributed locking.

## R — Output contract
- **Canonical output:** `ExactDiffEvidence`
- Bounded, typed, provenance-aware.
- No secret/raw credential projection.
- Consumers must not over-interpret this output beyond its declared semantics.

## S — Terminal statuses
`SUCCESS | NONE | AMBIGUOUS | UNVERIFIED | BLOCKED | CONFLICT | STALE (subset applicable)`

## T — Terminality formula
Success requires all contract-owned postconditions to be proven from current required evidence.
Missing/stale/conflicting evidence maps to fail-closed statuses, never implicit success.

## U — Reason codes
Contract-specific reason codes must be stable, enumerable, bounded and machine-testable.
Every failure/blocking reason must identify whether it is recoverable by reobserve, reconcile, wait or explicit change.

## V — Fail-closed model
Missing/stale/conflicting required evidence never defaults to success or permission. UNKNOWN remains UNKNOWN.

## W — Evidence model
EvidenceEnvelope(s) from the owning authorities with freshness, provenance and relevant SHA/revision binding.

## X — Freshness / staleness
Evidence is bound to relevant `observedAt`, SHA, stateVersion and/or revisions.
A semantic state change invalidates dependent evidence when its contract declares such dependency.

## Y — Attestation model
EPHEMERAL_RESULT_ONLY by default; promote to bounded durable reference only where an existing authority requires durable proof.

## Z — Persistence model
No new GWC store. Persist only through the existing owning authority when the contract is a RECORD/MUTATE step.

## AA — Secret / privacy model
Never persist tokens, resume secrets, raw authorization headers, arbitrary transport IDs, `.env` material or unbounded prompt bodies.
Use digests/bounded projections where persistence is necessary.

## AB — Replay model
`READ_ONLY`

## AC — Recovery model
Recovery starts by observing the owning authority.
A mutation is replayed only when its replay class explicitly allows it and the recovery anchor proves it has not already happened.

## AD — Security / threat model
Prevent authority confusion, cross-session/repo/project leakage, stale evidence reuse, duplicate mutation, secret leakage and false attestation.

## AE — Observability
Emit bounded start/result/failure/reason-code observations where useful.
Observability is not authority.

## AF — Interface contract with predecessors
Consumes only the predecessor fields whose semantics are explicitly declared.
Revalidates any field whose freshness/ownership requires it.

## AG — Interface contract with successors
Exports `ExactDiffEvidence` with explicit semantics; successor may not silently strengthen it.

## AH — Skip contract
No skip unless the graph contains a deterministic condition and proof source.
If skipped, the route and proof are observable.

## AI — Reobserve contract
Reobserve when required evidence is stale, unavailable-but-recoverable, or an external asynchronous condition may have progressed.

## AJ — Reconcile contract
Reconcile only when multiple authorities/state projections are inconsistent.
Reconcile is not the same as refreshing an observation.

## AK — Blocked behavior
Block only the affected Task/contract/resource scope unless an actual global invariant is violated.

## AL — Compensation / rollback
For pure/read-only contracts: not applicable.
For mutations: use existing rollback/compensation only where real; otherwise forward recovery by observation. Never pretend irreversible GitHub effects are rollbackable.

## AM — Existing system mapping
- **Current mapping:** GovernedContext + #89/#90 bounded compare/diff surfaces.
- **Classification:** `PARTIAL/EXTEND`
- Existing behavior is preserved and wrapped/generalized before new engines are introduced.

## AN — Current hardcodes / generalization
MCP/S1/repository literals and single-repository assumptions must move to TargetContext/configuration where applicable; preserve historical MCP behavior backward-compatibly.

## AO — Future implementation slot
Implement behind a GWC contract module + adapter to existing authority. Exact file placement must follow repository architecture discovered at implementation baseline, not be invented prematurely.

## AP — Test contract
happy path; boundary; NONE/AMBIGUOUS/UNVERIFIED/STALE/CONFLICT as applicable; replay/recovery; security; non-regression; exact binding tests.

## AQ — Property / invariant tests
- Unknown evidence never becomes allow/success.
- Explicit predecessor semantics are preserved.
- No hidden mutation.
- Same normalized input + same evidence ⇒ same semantic result for deterministic profiles.
- Mutation contracts never execute without a valid EffectPlan.

## AR — Acceptance criteria
- Input/output schemas are bounded.
- Owning authorities are explicit.
- Fail-closed paths are tested.
- Replay/recovery behavior is defined.
- No new parallel authority.
- Existing non-regression suite remains green.

## AS — Open questions
No blocking open decision beyond profile-specific implementation details; unresolved choices must stay explicit.

## AT — Architectural findings
- Existing implementation class: `PARTIAL/EXTEND`.
- Any discovered hardcode is treated as a generalization target, not silently removed.
- Any mismatch between CURRENT and TARGET is explicit.

## AU — Future Task Blueprint mapping
This contract is implemented by one or more governed implementation tasks from `GWC_IMPLEMENTATION_TASK_BLUEPRINTS_R1.md`; implementation dependencies follow the contract graph and authority dependencies rather than numeric GW order alone.

## AV — Execution semantics
`OBSERVE_AND_EVALUATE`

## AW — Effect Plan
None.

## AX — Routing table
Primary predecessor: GW-34. Primary successor: GW-36. Additional skip/reobserve/reconcile/recovery edges must be declared deterministically.

## AY — Recovery anchor
Read-only contracts: input/evidence snapshot bindings.
Mutation contracts: target reference + task/session + relevant branch/PR/SHA/revision/job ID.

## AZ — Reconstruction rule
On process restart, reconstruct from authoritative stores and observations; do not rely on previous assistant text or a GWC workflow-state database.

## BA — Autonomy behavior
AUTO_CONTINUE when exactly one legal route exists and required evidence is sufficient; WAIT_EXTERNAL/BLOCK_LOCAL/fail-closed otherwise.


---

# GW-36 — RULESET_VERIFICATION

## A — Identity
- **Contract ID:** `GW-36`
- **Canonical name:** `RULESET_VERIFICATION`
- **Family:** `F — Review and Merge`
- **Contract version:** `1` (conceptual baseline)
- **Profile(s):** `GIT_DECISION`
- **Architectural status:** `PARTIAL/EXTEND`
- **Integration class:** `PARTIAL/EXTEND`

## B — Purpose
Formaliser la responsabilité `RULESET_VERIFICATION` comme contrat borné, versionné et composable, sans dupliquer les autorités existantes.

**Non-responsibilities:** does not steal ownership from Task Queue, Session, Lock Service, Live State, GitRegistry, GitHub, deploy/runtime or other downstream contracts.

## C — Position in global system
- **Logical predecessor(s):** GW-35
- **Logical successor(s):** GW-37
- **Re-entry:** allowed when authoritative evidence shows this contract’s postcondition is not yet proven.
- **Skip:** only when an explicit deterministic `SKIPPABLE_IF` condition exists.
- **Reobserve/Reconcile:** first-class graph edges, never implicit retries.

## D — Chronological role
- **Transport chronology:** may differ from GW numeric order.
- **Functional chronology:** `GW-36` owns only `RULESET_VERIFICATION` responsibility.
- **Runtime chronology:** resolved by Workflow Graph, not `stepId + 1`.

## E — Contract input
Sorties prouvées des prédécesseurs applicables, contexte cible borné, références d’autorité nécessaires à `RULESET_VERIFICATION`.

Input fields must be bounded, provenance-aware and typed as hint/claim/evidence/fact; raw secret material is forbidden unless explicitly unavoidable and ephemeral.

## F — Information semantics
Every field is classified as one of:
`RAW_INPUT | HINT | CLAIM | OBSERVATION | EVIDENCE | DERIVED_FACT | AUTHORITATIVE_FACT | DECISION | ATTESTATION`.

No contract upgrades a `HINT` to an authoritative fact without the owning evidence.

## G — Authorities
Autorités existantes correspondant aux faits consommés; aucune nouvelle source de vérité créée par GWC.

**Forbidden authority pattern:** no arbitrary Markdown, prompt text, tool availability or remembered state may override the actual owning authority.

## H — Preconditions
- Structural input valid and bounded.
- Required authorities reachable or explicitly `UNAVAILABLE`.
- Required freshness/revision/SHA bindings available.
- No contradictory prerequisite state.
- For mutations: session/receipt/task/locks/governance requirements satisfied.

## I — Internal micro-state machine
validate bounded input → collect/validate required evidence → evaluate local invariants → derive domain status → derive routing disposition → emit bounded output.

## J — Transformation / decision algorithm
1. Parse/validate bounded input.
2. Determine required authority observations.
3. Refuse guesses for missing facts.
4. Apply contract-local invariants.
5. Produce domain status.
6. Produce engine disposition.
7. For mutations only, produce EffectPlan; never mutate from evaluation code directly.
8. Emit bounded output and evidence references.

## K — Determinism
- **Class:** `GIT_DECISION` with execution semantics `OBSERVE_AND_EVALUATE`.
- Pure/read-only contracts are deterministic given identical normalized input and identical evidence snapshot.
- Observation-dependent contracts bind result to evidence freshness/revisions.

## L — Invariants
Global GWC invariants + no over-interpretation of predecessor output + bounded data + fail closed on missing evidence.

Plus all global GWC invariants.

## M — Action model
- **Allowed action kinds:** READ / DERIVE
- **Forbidden:** hidden mutation, authority bypass, stale evidence reuse, arbitrary shell fallback, unbounded projection.

## N — Current execution owner vs target owner
CURRENT: existing subsystem(s) listed in AM. TARGET: same owning authority behind a GWC adapter/contract wrapper.

## O — Capability / authorization model
For any mutation:
`callable ∧ authorized ∧ safeNow ∧ preconditionsSatisfied ∧ concurrencySatisfied = mayExecute`.
A present tool is never permission by itself.

## P — Lock model
No new lock unless EffectPlan declares a collision domain; consume existing Lock Service.

## Q — Concurrency model
Independent tasks may proceed in parallel when dependency/resource/lock scopes do not conflict.
Local blockers remain local.
Operational Memory process-local serialization is not treated as distributed locking.

## R — Output contract
- **Canonical output:** `RulesetEvidence`
- Bounded, typed, provenance-aware.
- No secret/raw credential projection.
- Consumers must not over-interpret this output beyond its declared semantics.

## S — Terminal statuses
`SUCCESS | NONE | AMBIGUOUS | UNVERIFIED | BLOCKED | CONFLICT | STALE (subset applicable)`

## T — Terminality formula
Success requires all contract-owned postconditions to be proven from current required evidence.
Missing/stale/conflicting evidence maps to fail-closed statuses, never implicit success.

## U — Reason codes
Contract-specific reason codes must be stable, enumerable, bounded and machine-testable.
Every failure/blocking reason must identify whether it is recoverable by reobserve, reconcile, wait or explicit change.

## V — Fail-closed model
Missing/stale/conflicting required evidence never defaults to success or permission. UNKNOWN remains UNKNOWN.

## W — Evidence model
EvidenceEnvelope(s) from the owning authorities with freshness, provenance and relevant SHA/revision binding.

## X — Freshness / staleness
Evidence is bound to relevant `observedAt`, SHA, stateVersion and/or revisions.
A semantic state change invalidates dependent evidence when its contract declares such dependency.

## Y — Attestation model
EPHEMERAL_RESULT_ONLY by default; promote to bounded durable reference only where an existing authority requires durable proof.

## Z — Persistence model
No new GWC store. Persist only through the existing owning authority when the contract is a RECORD/MUTATE step.

## AA — Secret / privacy model
Never persist tokens, resume secrets, raw authorization headers, arbitrary transport IDs, `.env` material or unbounded prompt bodies.
Use digests/bounded projections where persistence is necessary.

## AB — Replay model
`READ_ONLY`

## AC — Recovery model
Recovery starts by observing the owning authority.
A mutation is replayed only when its replay class explicitly allows it and the recovery anchor proves it has not already happened.

## AD — Security / threat model
Prevent authority confusion, cross-session/repo/project leakage, stale evidence reuse, duplicate mutation, secret leakage and false attestation.

## AE — Observability
Emit bounded start/result/failure/reason-code observations where useful.
Observability is not authority.

## AF — Interface contract with predecessors
Consumes only the predecessor fields whose semantics are explicitly declared.
Revalidates any field whose freshness/ownership requires it.

## AG — Interface contract with successors
Exports `RulesetEvidence` with explicit semantics; successor may not silently strengthen it.

## AH — Skip contract
No skip unless the graph contains a deterministic condition and proof source.
If skipped, the route and proof are observable.

## AI — Reobserve contract
Reobserve when required evidence is stale, unavailable-but-recoverable, or an external asynchronous condition may have progressed.

## AJ — Reconcile contract
Reconcile only when multiple authorities/state projections are inconsistent.
Reconcile is not the same as refreshing an observation.

## AK — Blocked behavior
Block only the affected Task/contract/resource scope unless an actual global invariant is violated.

## AL — Compensation / rollback
For pure/read-only contracts: not applicable.
For mutations: use existing rollback/compensation only where real; otherwise forward recovery by observation. Never pretend irreversible GitHub effects are rollbackable.

## AM — Existing system mapping
- **Current mapping:** GitHub ruleset/protection evidence.
- **Classification:** `PARTIAL/EXTEND`
- Existing behavior is preserved and wrapped/generalized before new engines are introduced.

## AN — Current hardcodes / generalization
MCP/S1/repository literals and single-repository assumptions must move to TargetContext/configuration where applicable; preserve historical MCP behavior backward-compatibly.

## AO — Future implementation slot
Implement behind a GWC contract module + adapter to existing authority. Exact file placement must follow repository architecture discovered at implementation baseline, not be invented prematurely.

## AP — Test contract
happy path; boundary; NONE/AMBIGUOUS/UNVERIFIED/STALE/CONFLICT as applicable; replay/recovery; security; non-regression; exact binding tests.

## AQ — Property / invariant tests
- Unknown evidence never becomes allow/success.
- Explicit predecessor semantics are preserved.
- No hidden mutation.
- Same normalized input + same evidence ⇒ same semantic result for deterministic profiles.
- Mutation contracts never execute without a valid EffectPlan.

## AR — Acceptance criteria
- Input/output schemas are bounded.
- Owning authorities are explicit.
- Fail-closed paths are tested.
- Replay/recovery behavior is defined.
- No new parallel authority.
- Existing non-regression suite remains green.

## AS — Open questions
No blocking open decision beyond profile-specific implementation details; unresolved choices must stay explicit.

## AT — Architectural findings
- Existing implementation class: `PARTIAL/EXTEND`.
- Any discovered hardcode is treated as a generalization target, not silently removed.
- Any mismatch between CURRENT and TARGET is explicit.

## AU — Future Task Blueprint mapping
This contract is implemented by one or more governed implementation tasks from `GWC_IMPLEMENTATION_TASK_BLUEPRINTS_R1.md`; implementation dependencies follow the contract graph and authority dependencies rather than numeric GW order alone.

## AV — Execution semantics
`OBSERVE_AND_EVALUATE`

## AW — Effect Plan
None.

## AX — Routing table
Primary predecessor: GW-35. Primary successor: GW-37. Additional skip/reobserve/reconcile/recovery edges must be declared deterministically.

## AY — Recovery anchor
Read-only contracts: input/evidence snapshot bindings.
Mutation contracts: target reference + task/session + relevant branch/PR/SHA/revision/job ID.

## AZ — Reconstruction rule
On process restart, reconstruct from authoritative stores and observations; do not rely on previous assistant text or a GWC workflow-state database.

## BA — Autonomy behavior
AUTO_CONTINUE when exactly one legal route exists and required evidence is sufficient; WAIT_EXTERNAL/BLOCK_LOCAL/fail-closed otherwise.


---

# GW-37 — REVIEW_FINDINGS_RESOLUTION

## A — Identity
- **Contract ID:** `GW-37`
- **Canonical name:** `REVIEW_FINDINGS_RESOLUTION`
- **Family:** `F — Review and Merge`
- **Contract version:** `1` (conceptual baseline)
- **Profile(s):** `REVIEW_MUTATION`
- **Architectural status:** `PARTIAL/CANDIDATE`
- **Integration class:** `PARTIAL/CANDIDATE`

## B — Purpose
Formaliser la responsabilité `REVIEW_FINDINGS_RESOLUTION` comme contrat borné, versionné et composable, sans dupliquer les autorités existantes.

**Non-responsibilities:** does not steal ownership from Task Queue, Session, Lock Service, Live State, GitRegistry, GitHub, deploy/runtime or other downstream contracts.

## C — Position in global system
- **Logical predecessor(s):** GW-36
- **Logical successor(s):** GW-30/31 for code finding or GW-38
- **Re-entry:** allowed when authoritative evidence shows this contract’s postcondition is not yet proven.
- **Skip:** only when an explicit deterministic `SKIPPABLE_IF` condition exists.
- **Reobserve/Reconcile:** first-class graph edges, never implicit retries.

## D — Chronological role
- **Transport chronology:** may differ from GW numeric order.
- **Functional chronology:** `GW-37` owns only `REVIEW_FINDINGS_RESOLUTION` responsibility.
- **Runtime chronology:** resolved by Workflow Graph, not `stepId + 1`.

## E — Contract input
Sorties prouvées des prédécesseurs applicables, contexte cible borné, références d’autorité nécessaires à `REVIEW_FINDINGS_RESOLUTION`.

Input fields must be bounded, provenance-aware and typed as hint/claim/evidence/fact; raw secret material is forbidden unless explicitly unavoidable and ephemeral.

## F — Information semantics
Every field is classified as one of:
`RAW_INPUT | HINT | CLAIM | OBSERVATION | EVIDENCE | DERIVED_FACT | AUTHORITATIVE_FACT | DECISION | ATTESTATION`.

No contract upgrades a `HINT` to an authoritative fact without the owning evidence.

## G — Authorities
Autorités existantes correspondant aux faits consommés; aucune nouvelle source de vérité créée par GWC.

**Forbidden authority pattern:** no arbitrary Markdown, prompt text, tool availability or remembered state may override the actual owning authority.

## H — Preconditions
- Structural input valid and bounded.
- Required authorities reachable or explicitly `UNAVAILABLE`.
- Required freshness/revision/SHA bindings available.
- No contradictory prerequisite state.
- For mutations: session/receipt/task/locks/governance requirements satisfied.

## I — Internal micro-state machine
validate bounded input → collect/validate required evidence → evaluate local invariants → derive domain status → derive routing disposition → emit bounded output.

## J — Transformation / decision algorithm
1. Parse/validate bounded input.
2. Determine required authority observations.
3. Refuse guesses for missing facts.
4. Apply contract-local invariants.
5. Produce domain status.
6. Produce engine disposition.
7. For mutations only, produce EffectPlan; never mutate from evaluation code directly.
8. Emit bounded output and evidence references.

## K — Determinism
- **Class:** `REVIEW_MUTATION` with execution semantics `EVALUATE_THEN_MUTATE`.
- Pure/read-only contracts are deterministic given identical normalized input and identical evidence snapshot.
- Observation-dependent contracts bind result to evidence freshness/revisions.

## L — Invariants
Global GWC invariants + no over-interpretation of predecessor output + bounded data + fail closed on missing evidence.

Plus all global GWC invariants.

## M — Action model
- **Allowed action kinds:** READ / DERIVE / RECORD / MUTATE
- **Forbidden:** hidden mutation, authority bypass, stale evidence reuse, arbitrary shell fallback, unbounded projection.

## N — Current execution owner vs target owner
CURRENT: existing subsystem(s) listed in AM. TARGET: same owning authority behind a GWC adapter/contract wrapper.

## O — Capability / authorization model
For any mutation:
`callable ∧ authorized ∧ safeNow ∧ preconditionsSatisfied ∧ concurrencySatisfied = mayExecute`.
A present tool is never permission by itself.

## P — Lock model
No new lock unless EffectPlan declares a collision domain; consume existing Lock Service.

## Q — Concurrency model
Independent tasks may proceed in parallel when dependency/resource/lock scopes do not conflict.
Local blockers remain local.
Operational Memory process-local serialization is not treated as distributed locking.

## R — Output contract
- **Canonical output:** `FindingsResolution`
- Bounded, typed, provenance-aware.
- No secret/raw credential projection.
- Consumers must not over-interpret this output beyond its declared semantics.

## S — Terminal statuses
`SUCCESS | NONE | AMBIGUOUS | UNVERIFIED | BLOCKED | CONFLICT | STALE (subset applicable)`

## T — Terminality formula
Success requires all contract-owned postconditions to be proven from current required evidence.
Missing/stale/conflicting evidence maps to fail-closed statuses, never implicit success.

## U — Reason codes
Contract-specific reason codes must be stable, enumerable, bounded and machine-testable.
Every failure/blocking reason must identify whether it is recoverable by reobserve, reconcile, wait or explicit change.

## V — Fail-closed model
Missing/stale/conflicting required evidence never defaults to success or permission. UNKNOWN remains UNKNOWN.

## W — Evidence model
EvidenceEnvelope(s) from the owning authorities with freshness, provenance and relevant SHA/revision binding.

## X — Freshness / staleness
Evidence is bound to relevant `observedAt`, SHA, stateVersion and/or revisions.
A semantic state change invalidates dependent evidence when its contract declares such dependency.

## Y — Attestation model
EPHEMERAL_RESULT_ONLY by default; promote to bounded durable reference only where an existing authority requires durable proof.

## Z — Persistence model
No new GWC store. Persist only through the existing owning authority when the contract is a RECORD/MUTATE step.

## AA — Secret / privacy model
Never persist tokens, resume secrets, raw authorization headers, arbitrary transport IDs, `.env` material or unbounded prompt bodies.
Use digests/bounded projections where persistence is necessary.

## AB — Replay model
`CONDITIONALLY_IDEMPOTENT unless explicitly NON_REPLAYABLE`

## AC — Recovery model
Recovery starts by observing the owning authority.
A mutation is replayed only when its replay class explicitly allows it and the recovery anchor proves it has not already happened.

## AD — Security / threat model
Prevent authority confusion, cross-session/repo/project leakage, stale evidence reuse, duplicate mutation, secret leakage and false attestation.

## AE — Observability
Emit bounded start/result/failure/reason-code observations where useful.
Observability is not authority.

## AF — Interface contract with predecessors
Consumes only the predecessor fields whose semantics are explicitly declared.
Revalidates any field whose freshness/ownership requires it.

## AG — Interface contract with successors
Exports `FindingsResolution` with explicit semantics; successor may not silently strengthen it.

## AH — Skip contract
No skip unless the graph contains a deterministic condition and proof source.
If skipped, the route and proof are observable.

## AI — Reobserve contract
Reobserve when required evidence is stale, unavailable-but-recoverable, or an external asynchronous condition may have progressed.

## AJ — Reconcile contract
Reconcile only when multiple authorities/state projections are inconsistent.
Reconcile is not the same as refreshing an observation.

## AK — Blocked behavior
Block only the affected Task/contract/resource scope unless an actual global invariant is violated.

## AL — Compensation / rollback
For pure/read-only contracts: not applicable.
For mutations: use existing rollback/compensation only where real; otherwise forward recovery by observation. Never pretend irreversible GitHub effects are rollbackable.

## AM — Existing system mapping
- **Current mapping:** Candidate #90 thread reply/resolve + review loop.
- **Classification:** `PARTIAL/CANDIDATE`
- Existing behavior is preserved and wrapped/generalized before new engines are introduced.

## AN — Current hardcodes / generalization
MCP/S1/repository literals and single-repository assumptions must move to TargetContext/configuration where applicable; preserve historical MCP behavior backward-compatibly.

## AO — Future implementation slot
Implement behind a GWC contract module + adapter to existing authority. Exact file placement must follow repository architecture discovered at implementation baseline, not be invented prematurely.

## AP — Test contract
happy path; boundary; NONE/AMBIGUOUS/UNVERIFIED/STALE/CONFLICT as applicable; replay/recovery; security; non-regression; exact binding tests.

## AQ — Property / invariant tests
- Unknown evidence never becomes allow/success.
- Explicit predecessor semantics are preserved.
- No hidden mutation.
- Same normalized input + same evidence ⇒ same semantic result for deterministic profiles.
- Mutation contracts never execute without a valid EffectPlan.

## AR — Acceptance criteria
- Input/output schemas are bounded.
- Owning authorities are explicit.
- Fail-closed paths are tested.
- Replay/recovery behavior is defined.
- No new parallel authority.
- Existing non-regression suite remains green.

## AS — Open questions
No blocking open decision beyond profile-specific implementation details; unresolved choices must stay explicit.

## AT — Architectural findings
- Existing implementation class: `PARTIAL/CANDIDATE`.
- Any discovered hardcode is treated as a generalization target, not silently removed.
- Any mismatch between CURRENT and TARGET is explicit.

## AU — Future Task Blueprint mapping
This contract is implemented by one or more governed implementation tasks from `GWC_IMPLEMENTATION_TASK_BLUEPRINTS_R1.md`; implementation dependencies follow the contract graph and authority dependencies rather than numeric GW order alone.

## AV — Execution semantics
`EVALUATE_THEN_MUTATE`

## AW — Effect Plan
Must be represented as an explicit EffectPlan with target authority, expected revisions/SHA, lock requirements, replay class, postconditions and recovery anchor.

## AX — Routing table
Primary predecessor: GW-36. Primary successor: GW-30/31 for code finding or GW-38. Additional skip/reobserve/reconcile/recovery edges must be declared deterministically.

## AY — Recovery anchor
Read-only contracts: input/evidence snapshot bindings.
Mutation contracts: target reference + task/session + relevant branch/PR/SHA/revision/job ID.

## AZ — Reconstruction rule
On process restart, reconstruct from authoritative stores and observations; do not rely on previous assistant text or a GWC workflow-state database.

## BA — Autonomy behavior
AUTO_CONTINUE when exactly one legal route exists and required evidence is sufficient; WAIT_EXTERNAL/BLOCK_LOCAL/fail-closed otherwise.


---

# GW-38 — PR_READY

## A — Identity
- **Contract ID:** `GW-38`
- **Canonical name:** `PR_READY`
- **Family:** `F — Review and Merge`
- **Contract version:** `1` (conceptual baseline)
- **Profile(s):** `GIT_MUTATION`
- **Architectural status:** `CANDIDATE`
- **Integration class:** `CANDIDATE`

## B — Purpose
Formaliser la responsabilité `PR_READY` comme contrat borné, versionné et composable, sans dupliquer les autorités existantes.

**Non-responsibilities:** does not steal ownership from Task Queue, Session, Lock Service, Live State, GitRegistry, GitHub, deploy/runtime or other downstream contracts.

## C — Position in global system
- **Logical predecessor(s):** GW-37
- **Logical successor(s):** GW-39
- **Re-entry:** allowed when authoritative evidence shows this contract’s postcondition is not yet proven.
- **Skip:** only when an explicit deterministic `SKIPPABLE_IF` condition exists.
- **Reobserve/Reconcile:** first-class graph edges, never implicit retries.

## D — Chronological role
- **Transport chronology:** may differ from GW numeric order.
- **Functional chronology:** `GW-38` owns only `PR_READY` responsibility.
- **Runtime chronology:** resolved by Workflow Graph, not `stepId + 1`.

## E — Contract input
Sorties prouvées des prédécesseurs applicables, contexte cible borné, références d’autorité nécessaires à `PR_READY`.

Input fields must be bounded, provenance-aware and typed as hint/claim/evidence/fact; raw secret material is forbidden unless explicitly unavoidable and ephemeral.

## F — Information semantics
Every field is classified as one of:
`RAW_INPUT | HINT | CLAIM | OBSERVATION | EVIDENCE | DERIVED_FACT | AUTHORITATIVE_FACT | DECISION | ATTESTATION`.

No contract upgrades a `HINT` to an authoritative fact without the owning evidence.

## G — Authorities
Autorités existantes correspondant aux faits consommés; aucune nouvelle source de vérité créée par GWC.

**Forbidden authority pattern:** no arbitrary Markdown, prompt text, tool availability or remembered state may override the actual owning authority.

## H — Preconditions
- Structural input valid and bounded.
- Required authorities reachable or explicitly `UNAVAILABLE`.
- Required freshness/revision/SHA bindings available.
- No contradictory prerequisite state.
- For mutations: session/receipt/task/locks/governance requirements satisfied.

## I — Internal micro-state machine
validate bounded input → collect/validate required evidence → evaluate local invariants → derive domain status → derive routing disposition → emit bounded output.

## J — Transformation / decision algorithm
1. Parse/validate bounded input.
2. Determine required authority observations.
3. Refuse guesses for missing facts.
4. Apply contract-local invariants.
5. Produce domain status.
6. Produce engine disposition.
7. For mutations only, produce EffectPlan; never mutate from evaluation code directly.
8. Emit bounded output and evidence references.

## K — Determinism
- **Class:** `GIT_MUTATION` with execution semantics `MUTATE_THEN_VERIFY`.
- Pure/read-only contracts are deterministic given identical normalized input and identical evidence snapshot.
- Observation-dependent contracts bind result to evidence freshness/revisions.

## L — Invariants
Global GWC invariants + no over-interpretation of predecessor output + bounded data + fail closed on missing evidence.

Plus all global GWC invariants.

## M — Action model
- **Allowed action kinds:** READ / DERIVE / RECORD / MUTATE
- **Forbidden:** hidden mutation, authority bypass, stale evidence reuse, arbitrary shell fallback, unbounded projection.

## N — Current execution owner vs target owner
CURRENT: existing subsystem(s) listed in AM. TARGET: same owning authority behind a GWC adapter/contract wrapper.

## O — Capability / authorization model
For any mutation:
`callable ∧ authorized ∧ safeNow ∧ preconditionsSatisfied ∧ concurrencySatisfied = mayExecute`.
A present tool is never permission by itself.

## P — Lock model
No new lock unless EffectPlan declares a collision domain; consume existing Lock Service.

## Q — Concurrency model
Independent tasks may proceed in parallel when dependency/resource/lock scopes do not conflict.
Local blockers remain local.
Operational Memory process-local serialization is not treated as distributed locking.

## R — Output contract
- **Canonical output:** `ReadyPullRequest`
- Bounded, typed, provenance-aware.
- No secret/raw credential projection.
- Consumers must not over-interpret this output beyond its declared semantics.

## S — Terminal statuses
`SUCCESS | NONE | AMBIGUOUS | UNVERIFIED | BLOCKED | CONFLICT | STALE (subset applicable)`

## T — Terminality formula
Success requires all contract-owned postconditions to be proven from current required evidence.
Missing/stale/conflicting evidence maps to fail-closed statuses, never implicit success.

## U — Reason codes
Contract-specific reason codes must be stable, enumerable, bounded and machine-testable.
Every failure/blocking reason must identify whether it is recoverable by reobserve, reconcile, wait or explicit change.

## V — Fail-closed model
Missing/stale/conflicting required evidence never defaults to success or permission. UNKNOWN remains UNKNOWN.

## W — Evidence model
EvidenceEnvelope(s) from the owning authorities with freshness, provenance and relevant SHA/revision binding.

## X — Freshness / staleness
Evidence is bound to relevant `observedAt`, SHA, stateVersion and/or revisions.
A semantic state change invalidates dependent evidence when its contract declares such dependency.

## Y — Attestation model
EPHEMERAL_RESULT_ONLY by default; promote to bounded durable reference only where an existing authority requires durable proof.

## Z — Persistence model
No new GWC store. Persist only through the existing owning authority when the contract is a RECORD/MUTATE step.

## AA — Secret / privacy model
Never persist tokens, resume secrets, raw authorization headers, arbitrary transport IDs, `.env` material or unbounded prompt bodies.
Use digests/bounded projections where persistence is necessary.

## AB — Replay model
`CONDITIONALLY_IDEMPOTENT unless explicitly NON_REPLAYABLE`

## AC — Recovery model
Recovery starts by observing the owning authority.
A mutation is replayed only when its replay class explicitly allows it and the recovery anchor proves it has not already happened.

## AD — Security / threat model
Prevent authority confusion, cross-session/repo/project leakage, stale evidence reuse, duplicate mutation, secret leakage and false attestation.

## AE — Observability
Emit bounded start/result/failure/reason-code observations where useful.
Observability is not authority.

## AF — Interface contract with predecessors
Consumes only the predecessor fields whose semantics are explicitly declared.
Revalidates any field whose freshness/ownership requires it.

## AG — Interface contract with successors
Exports `ReadyPullRequest` with explicit semantics; successor may not silently strengthen it.

## AH — Skip contract
No skip unless the graph contains a deterministic condition and proof source.
If skipped, the route and proof are observable.

## AI — Reobserve contract
Reobserve when required evidence is stale, unavailable-but-recoverable, or an external asynchronous condition may have progressed.

## AJ — Reconcile contract
Reconcile only when multiple authorities/state projections are inconsistent.
Reconcile is not the same as refreshing an observation.

## AK — Blocked behavior
Block only the affected Task/contract/resource scope unless an actual global invariant is violated.

## AL — Compensation / rollback
For pure/read-only contracts: not applicable.
For mutations: use existing rollback/compensation only where real; otherwise forward recovery by observation. Never pretend irreversible GitHub effects are rollbackable.

## AM — Existing system mapping
- **Current mapping:** Candidate #90 github_mark_pr_ready.
- **Classification:** `CANDIDATE`
- Existing behavior is preserved and wrapped/generalized before new engines are introduced.

## AN — Current hardcodes / generalization
MCP/S1/repository literals and single-repository assumptions must move to TargetContext/configuration where applicable; preserve historical MCP behavior backward-compatibly.

## AO — Future implementation slot
Implement behind a GWC contract module + adapter to existing authority. Exact file placement must follow repository architecture discovered at implementation baseline, not be invented prematurely.

## AP — Test contract
happy path; boundary; NONE/AMBIGUOUS/UNVERIFIED/STALE/CONFLICT as applicable; replay/recovery; security; non-regression; exact binding tests.

## AQ — Property / invariant tests
- Unknown evidence never becomes allow/success.
- Explicit predecessor semantics are preserved.
- No hidden mutation.
- Same normalized input + same evidence ⇒ same semantic result for deterministic profiles.
- Mutation contracts never execute without a valid EffectPlan.

## AR — Acceptance criteria
- Input/output schemas are bounded.
- Owning authorities are explicit.
- Fail-closed paths are tested.
- Replay/recovery behavior is defined.
- No new parallel authority.
- Existing non-regression suite remains green.

## AS — Open questions
No blocking open decision beyond profile-specific implementation details; unresolved choices must stay explicit.

## AT — Architectural findings
- Existing implementation class: `CANDIDATE`.
- Any discovered hardcode is treated as a generalization target, not silently removed.
- Any mismatch between CURRENT and TARGET is explicit.

## AU — Future Task Blueprint mapping
This contract is implemented by one or more governed implementation tasks from `GWC_IMPLEMENTATION_TASK_BLUEPRINTS_R1.md`; implementation dependencies follow the contract graph and authority dependencies rather than numeric GW order alone.

## AV — Execution semantics
`MUTATE_THEN_VERIFY`

## AW — Effect Plan
Must be represented as an explicit EffectPlan with target authority, expected revisions/SHA, lock requirements, replay class, postconditions and recovery anchor.

## AX — Routing table
Primary predecessor: GW-37. Primary successor: GW-39. Additional skip/reobserve/reconcile/recovery edges must be declared deterministically.

## AY — Recovery anchor
Read-only contracts: input/evidence snapshot bindings.
Mutation contracts: target reference + task/session + relevant branch/PR/SHA/revision/job ID.

## AZ — Reconstruction rule
On process restart, reconstruct from authoritative stores and observations; do not rely on previous assistant text or a GWC workflow-state database.

## BA — Autonomy behavior
AUTO_CONTINUE when exactly one legal route exists and required evidence is sufficient; WAIT_EXTERNAL/BLOCK_LOCAL/fail-closed otherwise.


---

# GW-39 — TASK_REVIEW

## A — Identity
- **Contract ID:** `GW-39`
- **Canonical name:** `TASK_REVIEW`
- **Family:** `F — Review and Merge`
- **Contract version:** `1` (conceptual baseline)
- **Profile(s):** `TASK_MUTATION`
- **Architectural status:** `REUSE`
- **Integration class:** `REUSE`

## B — Purpose
Formaliser la responsabilité `TASK_REVIEW` comme contrat borné, versionné et composable, sans dupliquer les autorités existantes.

**Non-responsibilities:** does not steal ownership from Task Queue, Session, Lock Service, Live State, GitRegistry, GitHub, deploy/runtime or other downstream contracts.

## C — Position in global system
- **Logical predecessor(s):** GW-38
- **Logical successor(s):** GW-40
- **Re-entry:** allowed when authoritative evidence shows this contract’s postcondition is not yet proven.
- **Skip:** only when an explicit deterministic `SKIPPABLE_IF` condition exists.
- **Reobserve/Reconcile:** first-class graph edges, never implicit retries.

## D — Chronological role
- **Transport chronology:** may differ from GW numeric order.
- **Functional chronology:** `GW-39` owns only `TASK_REVIEW` responsibility.
- **Runtime chronology:** resolved by Workflow Graph, not `stepId + 1`.

## E — Contract input
Sorties prouvées des prédécesseurs applicables, contexte cible borné, références d’autorité nécessaires à `TASK_REVIEW`.

Input fields must be bounded, provenance-aware and typed as hint/claim/evidence/fact; raw secret material is forbidden unless explicitly unavoidable and ephemeral.

## F — Information semantics
Every field is classified as one of:
`RAW_INPUT | HINT | CLAIM | OBSERVATION | EVIDENCE | DERIVED_FACT | AUTHORITATIVE_FACT | DECISION | ATTESTATION`.

No contract upgrades a `HINT` to an authoritative fact without the owning evidence.

## G — Authorities
Autorités existantes correspondant aux faits consommés; aucune nouvelle source de vérité créée par GWC.

**Forbidden authority pattern:** no arbitrary Markdown, prompt text, tool availability or remembered state may override the actual owning authority.

## H — Preconditions
- Structural input valid and bounded.
- Required authorities reachable or explicitly `UNAVAILABLE`.
- Required freshness/revision/SHA bindings available.
- No contradictory prerequisite state.
- For mutations: session/receipt/task/locks/governance requirements satisfied.

## I — Internal micro-state machine
validate bounded input → collect/validate required evidence → evaluate local invariants → derive domain status → derive routing disposition → emit bounded output.

## J — Transformation / decision algorithm
1. Parse/validate bounded input.
2. Determine required authority observations.
3. Refuse guesses for missing facts.
4. Apply contract-local invariants.
5. Produce domain status.
6. Produce engine disposition.
7. For mutations only, produce EffectPlan; never mutate from evaluation code directly.
8. Emit bounded output and evidence references.

## K — Determinism
- **Class:** `TASK_MUTATION` with execution semantics `MUTATE_THEN_VERIFY`.
- Pure/read-only contracts are deterministic given identical normalized input and identical evidence snapshot.
- Observation-dependent contracts bind result to evidence freshness/revisions.

## L — Invariants
Global GWC invariants + no over-interpretation of predecessor output + bounded data + fail closed on missing evidence.

Plus all global GWC invariants.

## M — Action model
- **Allowed action kinds:** READ / DERIVE / RECORD / MUTATE
- **Forbidden:** hidden mutation, authority bypass, stale evidence reuse, arbitrary shell fallback, unbounded projection.

## N — Current execution owner vs target owner
CURRENT: existing subsystem(s) listed in AM. TARGET: same owning authority behind a GWC adapter/contract wrapper.

## O — Capability / authorization model
For any mutation:
`callable ∧ authorized ∧ safeNow ∧ preconditionsSatisfied ∧ concurrencySatisfied = mayExecute`.
A present tool is never permission by itself.

## P — Lock model
No new lock unless EffectPlan declares a collision domain; consume existing Lock Service.

## Q — Concurrency model
Independent tasks may proceed in parallel when dependency/resource/lock scopes do not conflict.
Local blockers remain local.
Operational Memory process-local serialization is not treated as distributed locking.

## R — Output contract
- **Canonical output:** `ReviewTask`
- Bounded, typed, provenance-aware.
- No secret/raw credential projection.
- Consumers must not over-interpret this output beyond its declared semantics.

## S — Terminal statuses
`SUCCESS | NONE | AMBIGUOUS | UNVERIFIED | BLOCKED | CONFLICT | STALE (subset applicable)`

## T — Terminality formula
Success requires all contract-owned postconditions to be proven from current required evidence.
Missing/stale/conflicting evidence maps to fail-closed statuses, never implicit success.

## U — Reason codes
Contract-specific reason codes must be stable, enumerable, bounded and machine-testable.
Every failure/blocking reason must identify whether it is recoverable by reobserve, reconcile, wait or explicit change.

## V — Fail-closed model
Missing/stale/conflicting required evidence never defaults to success or permission. UNKNOWN remains UNKNOWN.

## W — Evidence model
EvidenceEnvelope(s) from the owning authorities with freshness, provenance and relevant SHA/revision binding.

## X — Freshness / staleness
Evidence is bound to relevant `observedAt`, SHA, stateVersion and/or revisions.
A semantic state change invalidates dependent evidence when its contract declares such dependency.

## Y — Attestation model
EPHEMERAL_RESULT_ONLY by default; promote to bounded durable reference only where an existing authority requires durable proof.

## Z — Persistence model
No new GWC store. Persist only through the existing owning authority when the contract is a RECORD/MUTATE step.

## AA — Secret / privacy model
Never persist tokens, resume secrets, raw authorization headers, arbitrary transport IDs, `.env` material or unbounded prompt bodies.
Use digests/bounded projections where persistence is necessary.

## AB — Replay model
`CONDITIONALLY_IDEMPOTENT unless explicitly NON_REPLAYABLE`

## AC — Recovery model
Recovery starts by observing the owning authority.
A mutation is replayed only when its replay class explicitly allows it and the recovery anchor proves it has not already happened.

## AD — Security / threat model
Prevent authority confusion, cross-session/repo/project leakage, stale evidence reuse, duplicate mutation, secret leakage and false attestation.

## AE — Observability
Emit bounded start/result/failure/reason-code observations where useful.
Observability is not authority.

## AF — Interface contract with predecessors
Consumes only the predecessor fields whose semantics are explicitly declared.
Revalidates any field whose freshness/ownership requires it.

## AG — Interface contract with successors
Exports `ReviewTask` with explicit semantics; successor may not silently strengthen it.

## AH — Skip contract
No skip unless the graph contains a deterministic condition and proof source.
If skipped, the route and proof are observable.

## AI — Reobserve contract
Reobserve when required evidence is stale, unavailable-but-recoverable, or an external asynchronous condition may have progressed.

## AJ — Reconcile contract
Reconcile only when multiple authorities/state projections are inconsistent.
Reconcile is not the same as refreshing an observation.

## AK — Blocked behavior
Block only the affected Task/contract/resource scope unless an actual global invariant is violated.

## AL — Compensation / rollback
For pure/read-only contracts: not applicable.
For mutations: use existing rollback/compensation only where real; otherwise forward recovery by observation. Never pretend irreversible GitHub effects are rollbackable.

## AM — Existing system mapping
- **Current mapping:** Task Queue REVIEW transition.
- **Classification:** `REUSE`
- Existing behavior is preserved and wrapped/generalized before new engines are introduced.

## AN — Current hardcodes / generalization
MCP/S1/repository literals and single-repository assumptions must move to TargetContext/configuration where applicable; preserve historical MCP behavior backward-compatibly.

## AO — Future implementation slot
Implement behind a GWC contract module + adapter to existing authority. Exact file placement must follow repository architecture discovered at implementation baseline, not be invented prematurely.

## AP — Test contract
happy path; boundary; NONE/AMBIGUOUS/UNVERIFIED/STALE/CONFLICT as applicable; replay/recovery; security; non-regression; exact binding tests.

## AQ — Property / invariant tests
- Unknown evidence never becomes allow/success.
- Explicit predecessor semantics are preserved.
- No hidden mutation.
- Same normalized input + same evidence ⇒ same semantic result for deterministic profiles.
- Mutation contracts never execute without a valid EffectPlan.

## AR — Acceptance criteria
- Input/output schemas are bounded.
- Owning authorities are explicit.
- Fail-closed paths are tested.
- Replay/recovery behavior is defined.
- No new parallel authority.
- Existing non-regression suite remains green.

## AS — Open questions
No blocking open decision beyond profile-specific implementation details; unresolved choices must stay explicit.

## AT — Architectural findings
- Existing implementation class: `REUSE`.
- Any discovered hardcode is treated as a generalization target, not silently removed.
- Any mismatch between CURRENT and TARGET is explicit.

## AU — Future Task Blueprint mapping
This contract is implemented by one or more governed implementation tasks from `GWC_IMPLEMENTATION_TASK_BLUEPRINTS_R1.md`; implementation dependencies follow the contract graph and authority dependencies rather than numeric GW order alone.

## AV — Execution semantics
`MUTATE_THEN_VERIFY`

## AW — Effect Plan
Must be represented as an explicit EffectPlan with target authority, expected revisions/SHA, lock requirements, replay class, postconditions and recovery anchor.

## AX — Routing table
Primary predecessor: GW-38. Primary successor: GW-40. Additional skip/reobserve/reconcile/recovery edges must be declared deterministically.

## AY — Recovery anchor
Read-only contracts: input/evidence snapshot bindings.
Mutation contracts: target reference + task/session + relevant branch/PR/SHA/revision/job ID.

## AZ — Reconstruction rule
On process restart, reconstruct from authoritative stores and observations; do not rely on previous assistant text or a GWC workflow-state database.

## BA — Autonomy behavior
AUTO_CONTINUE when exactly one legal route exists and required evidence is sufficient; WAIT_EXTERNAL/BLOCK_LOCAL/fail-closed otherwise.


---

# GW-40 — REVIEW_CHECKPOINT

## A — Identity
- **Contract ID:** `GW-40`
- **Canonical name:** `REVIEW_CHECKPOINT`
- **Family:** `F — Review and Merge`
- **Contract version:** `1` (conceptual baseline)
- **Profile(s):** `SESSION_MUTATION`
- **Architectural status:** `REUSE`
- **Integration class:** `REUSE`

## B — Purpose
Formaliser la responsabilité `REVIEW_CHECKPOINT` comme contrat borné, versionné et composable, sans dupliquer les autorités existantes.

**Non-responsibilities:** does not steal ownership from Task Queue, Session, Lock Service, Live State, GitRegistry, GitHub, deploy/runtime or other downstream contracts.

## C — Position in global system
- **Logical predecessor(s):** GW-39
- **Logical successor(s):** GW-41
- **Re-entry:** allowed when authoritative evidence shows this contract’s postcondition is not yet proven.
- **Skip:** only when an explicit deterministic `SKIPPABLE_IF` condition exists.
- **Reobserve/Reconcile:** first-class graph edges, never implicit retries.

## D — Chronological role
- **Transport chronology:** may differ from GW numeric order.
- **Functional chronology:** `GW-40` owns only `REVIEW_CHECKPOINT` responsibility.
- **Runtime chronology:** resolved by Workflow Graph, not `stepId + 1`.

## E — Contract input
Sorties prouvées des prédécesseurs applicables, contexte cible borné, références d’autorité nécessaires à `REVIEW_CHECKPOINT`.

Input fields must be bounded, provenance-aware and typed as hint/claim/evidence/fact; raw secret material is forbidden unless explicitly unavoidable and ephemeral.

## F — Information semantics
Every field is classified as one of:
`RAW_INPUT | HINT | CLAIM | OBSERVATION | EVIDENCE | DERIVED_FACT | AUTHORITATIVE_FACT | DECISION | ATTESTATION`.

No contract upgrades a `HINT` to an authoritative fact without the owning evidence.

## G — Authorities
Autorités existantes correspondant aux faits consommés; aucune nouvelle source de vérité créée par GWC.

**Forbidden authority pattern:** no arbitrary Markdown, prompt text, tool availability or remembered state may override the actual owning authority.

## H — Preconditions
- Structural input valid and bounded.
- Required authorities reachable or explicitly `UNAVAILABLE`.
- Required freshness/revision/SHA bindings available.
- No contradictory prerequisite state.
- For mutations: session/receipt/task/locks/governance requirements satisfied.

## I — Internal micro-state machine
validate bounded input → collect/validate required evidence → evaluate local invariants → derive domain status → derive routing disposition → emit bounded output.

## J — Transformation / decision algorithm
1. Parse/validate bounded input.
2. Determine required authority observations.
3. Refuse guesses for missing facts.
4. Apply contract-local invariants.
5. Produce domain status.
6. Produce engine disposition.
7. For mutations only, produce EffectPlan; never mutate from evaluation code directly.
8. Emit bounded output and evidence references.

## K — Determinism
- **Class:** `SESSION_MUTATION` with execution semantics `MUTATE_THEN_VERIFY`.
- Pure/read-only contracts are deterministic given identical normalized input and identical evidence snapshot.
- Observation-dependent contracts bind result to evidence freshness/revisions.

## L — Invariants
Global GWC invariants + no over-interpretation of predecessor output + bounded data + fail closed on missing evidence.

Plus all global GWC invariants.

## M — Action model
- **Allowed action kinds:** READ / DERIVE / RECORD / MUTATE
- **Forbidden:** hidden mutation, authority bypass, stale evidence reuse, arbitrary shell fallback, unbounded projection.

## N — Current execution owner vs target owner
CURRENT: existing subsystem(s) listed in AM. TARGET: same owning authority behind a GWC adapter/contract wrapper.

## O — Capability / authorization model
For any mutation:
`callable ∧ authorized ∧ safeNow ∧ preconditionsSatisfied ∧ concurrencySatisfied = mayExecute`.
A present tool is never permission by itself.

## P — Lock model
No new lock unless EffectPlan declares a collision domain; consume existing Lock Service.

## Q — Concurrency model
Independent tasks may proceed in parallel when dependency/resource/lock scopes do not conflict.
Local blockers remain local.
Operational Memory process-local serialization is not treated as distributed locking.

## R — Output contract
- **Canonical output:** `ReviewCheckpoint`
- Bounded, typed, provenance-aware.
- No secret/raw credential projection.
- Consumers must not over-interpret this output beyond its declared semantics.

## S — Terminal statuses
`SUCCESS | NONE | AMBIGUOUS | UNVERIFIED | BLOCKED | CONFLICT | STALE (subset applicable)`

## T — Terminality formula
Success requires all contract-owned postconditions to be proven from current required evidence.
Missing/stale/conflicting evidence maps to fail-closed statuses, never implicit success.

## U — Reason codes
Contract-specific reason codes must be stable, enumerable, bounded and machine-testable.
Every failure/blocking reason must identify whether it is recoverable by reobserve, reconcile, wait or explicit change.

## V — Fail-closed model
Missing/stale/conflicting required evidence never defaults to success or permission. UNKNOWN remains UNKNOWN.

## W — Evidence model
EvidenceEnvelope(s) from the owning authorities with freshness, provenance and relevant SHA/revision binding.

## X — Freshness / staleness
Evidence is bound to relevant `observedAt`, SHA, stateVersion and/or revisions.
A semantic state change invalidates dependent evidence when its contract declares such dependency.

## Y — Attestation model
EPHEMERAL_RESULT_ONLY by default; promote to bounded durable reference only where an existing authority requires durable proof.

## Z — Persistence model
No new GWC store. Persist only through the existing owning authority when the contract is a RECORD/MUTATE step.

## AA — Secret / privacy model
Never persist tokens, resume secrets, raw authorization headers, arbitrary transport IDs, `.env` material or unbounded prompt bodies.
Use digests/bounded projections where persistence is necessary.

## AB — Replay model
`CONDITIONALLY_IDEMPOTENT unless explicitly NON_REPLAYABLE`

## AC — Recovery model
Recovery starts by observing the owning authority.
A mutation is replayed only when its replay class explicitly allows it and the recovery anchor proves it has not already happened.

## AD — Security / threat model
Prevent authority confusion, cross-session/repo/project leakage, stale evidence reuse, duplicate mutation, secret leakage and false attestation.

## AE — Observability
Emit bounded start/result/failure/reason-code observations where useful.
Observability is not authority.

## AF — Interface contract with predecessors
Consumes only the predecessor fields whose semantics are explicitly declared.
Revalidates any field whose freshness/ownership requires it.

## AG — Interface contract with successors
Exports `ReviewCheckpoint` with explicit semantics; successor may not silently strengthen it.

## AH — Skip contract
No skip unless the graph contains a deterministic condition and proof source.
If skipped, the route and proof are observable.

## AI — Reobserve contract
Reobserve when required evidence is stale, unavailable-but-recoverable, or an external asynchronous condition may have progressed.

## AJ — Reconcile contract
Reconcile only when multiple authorities/state projections are inconsistent.
Reconcile is not the same as refreshing an observation.

## AK — Blocked behavior
Block only the affected Task/contract/resource scope unless an actual global invariant is violated.

## AL — Compensation / rollback
For pure/read-only contracts: not applicable.
For mutations: use existing rollback/compensation only where real; otherwise forward recovery by observation. Never pretend irreversible GitHub effects are rollbackable.

## AM — Existing system mapping
- **Current mapping:** Governed Session checkpoint.
- **Classification:** `REUSE`
- Existing behavior is preserved and wrapped/generalized before new engines are introduced.

## AN — Current hardcodes / generalization
MCP/S1/repository literals and single-repository assumptions must move to TargetContext/configuration where applicable; preserve historical MCP behavior backward-compatibly.

## AO — Future implementation slot
Implement behind a GWC contract module + adapter to existing authority. Exact file placement must follow repository architecture discovered at implementation baseline, not be invented prematurely.

## AP — Test contract
happy path; boundary; NONE/AMBIGUOUS/UNVERIFIED/STALE/CONFLICT as applicable; replay/recovery; security; non-regression; exact binding tests.

## AQ — Property / invariant tests
- Unknown evidence never becomes allow/success.
- Explicit predecessor semantics are preserved.
- No hidden mutation.
- Same normalized input + same evidence ⇒ same semantic result for deterministic profiles.
- Mutation contracts never execute without a valid EffectPlan.

## AR — Acceptance criteria
- Input/output schemas are bounded.
- Owning authorities are explicit.
- Fail-closed paths are tested.
- Replay/recovery behavior is defined.
- No new parallel authority.
- Existing non-regression suite remains green.

## AS — Open questions
No blocking open decision beyond profile-specific implementation details; unresolved choices must stay explicit.

## AT — Architectural findings
- Existing implementation class: `REUSE`.
- Any discovered hardcode is treated as a generalization target, not silently removed.
- Any mismatch between CURRENT and TARGET is explicit.

## AU — Future Task Blueprint mapping
This contract is implemented by one or more governed implementation tasks from `GWC_IMPLEMENTATION_TASK_BLUEPRINTS_R1.md`; implementation dependencies follow the contract graph and authority dependencies rather than numeric GW order alone.

## AV — Execution semantics
`MUTATE_THEN_VERIFY`

## AW — Effect Plan
Must be represented as an explicit EffectPlan with target authority, expected revisions/SHA, lock requirements, replay class, postconditions and recovery anchor.

## AX — Routing table
Primary predecessor: GW-39. Primary successor: GW-41. Additional skip/reobserve/reconcile/recovery edges must be declared deterministically.

## AY — Recovery anchor
Read-only contracts: input/evidence snapshot bindings.
Mutation contracts: target reference + task/session + relevant branch/PR/SHA/revision/job ID.

## AZ — Reconstruction rule
On process restart, reconstruct from authoritative stores and observations; do not rely on previous assistant text or a GWC workflow-state database.

## BA — Autonomy behavior
AUTO_CONTINUE when exactly one legal route exists and required evidence is sufficient; WAIT_EXTERNAL/BLOCK_LOCAL/fail-closed otherwise.


---

# GW-41 — PREMERGE_REVALIDATION

## A — Identity
- **Contract ID:** `GW-41`
- **Canonical name:** `PREMERGE_REVALIDATION`
- **Family:** `F — Review and Merge`
- **Contract version:** `1` (conceptual baseline)
- **Profile(s):** `CROSS_EVIDENCE_DECISION`
- **Architectural status:** `PARTIAL/EXTEND`
- **Integration class:** `PARTIAL/EXTEND`

## B — Purpose
Produire une preuve pré-merge unique, exacte au head, consommée par GW-43.

**Non-responsibilities:** does not steal ownership from Task Queue, Session, Lock Service, Live State, GitRegistry, GitHub, deploy/runtime or other downstream contracts.

## C — Position in global system
- **Logical predecessor(s):** GW-40
- **Logical successor(s):** GW-42
- **Re-entry:** allowed when authoritative evidence shows this contract’s postcondition is not yet proven.
- **Skip:** only when an explicit deterministic `SKIPPABLE_IF` condition exists.
- **Reobserve/Reconcile:** first-class graph edges, never implicit retries.

## D — Chronological role
- **Transport chronology:** may differ from GW numeric order.
- **Functional chronology:** `GW-41` owns only `PREMERGE_REVALIDATION` responsibility.
- **Runtime chronology:** resolved by Workflow Graph, not `stepId + 1`.

## E — Contract input
PR exact state; ruleset; required checks; reviews; review threads; task/session/receipt.

Input fields must be bounded, provenance-aware and typed as hint/claim/evidence/fact; raw secret material is forbidden unless explicitly unavoidable and ephemeral.

## F — Information semantics
Every field is classified as one of:
`RAW_INPUT | HINT | CLAIM | OBSERVATION | EVIDENCE | DERIVED_FACT | AUTHORITATIVE_FACT | DECISION | ATTESTATION`.

No contract upgrades a `HINT` to an authoritative fact without the owning evidence.

## G — Authorities
GitHub + Operational Memory/Governance Decision.

**Forbidden authority pattern:** no arbitrary Markdown, prompt text, tool availability or remembered state may override the actual owning authority.

## H — Preconditions
- Structural input valid and bounded.
- Required authorities reachable or explicitly `UNAVAILABLE`.
- Required freshness/revision/SHA bindings available.
- No contradictory prerequisite state.
- For mutations: session/receipt/task/locks/governance requirements satisfied.

## I — Internal micro-state machine
reobserve PR head → ruleset → checks → reviews with commitId → threads → mergeability → task/session/receipt → aggregate → emit PremergeProof.

## J — Transformation / decision algorithm
1. Parse/validate bounded input.
2. Determine required authority observations.
3. Refuse guesses for missing facts.
4. Apply contract-local invariants.
5. Produce domain status.
6. Produce engine disposition.
7. For mutations only, produce EffectPlan; never mutate from evaluation code directly.
8. Emit bounded output and evidence references.

## K — Determinism
- **Class:** `CROSS_EVIDENCE_DECISION` with execution semantics `OBSERVE_AND_EVALUATE`.
- Pure/read-only contracts are deterministic given identical normalized input and identical evidence snapshot.
- Observation-dependent contracts bind result to evidence freshness/revisions.

## L — Invariants
review evidence must be head/commit bound when policy requires it; required checks exact-head; unresolved required threads block.

Plus all global GWC invariants.

## M — Action model
- **Allowed action kinds:** READ / DERIVE
- **Forbidden:** hidden mutation, authority bypass, stale evidence reuse, arbitrary shell fallback, unbounded projection.

## N — Current execution owner vs target owner
CURRENT: existing subsystem(s) listed in AM. TARGET: same owning authority behind a GWC adapter/contract wrapper.

## O — Capability / authorization model
For any mutation:
`callable ∧ authorized ∧ safeNow ∧ preconditionsSatisfied ∧ concurrencySatisfied = mayExecute`.
A present tool is never permission by itself.

## P — Lock model
Aucun nouveau lock; consume current lock state.

## Q — Concurrency model
Independent tasks may proceed in parallel when dependency/resource/lock scopes do not conflict.
Local blockers remain local.
Operational Memory process-local serialization is not treated as distributed locking.

## R — Output contract
- **Canonical output:** `PremergeProof`
- Bounded, typed, provenance-aware.
- No secret/raw credential projection.
- Consumers must not over-interpret this output beyond its declared semantics.

## S — Terminal statuses
`READY | BLOCKED | STALE | UNVERIFIED | CONFLICT`

## T — Terminality formula
Success requires all contract-owned postconditions to be proven from current required evidence.
Missing/stale/conflicting evidence maps to fail-closed statuses, never implicit success.

## U — Reason codes
Contract-specific reason codes must be stable, enumerable, bounded and machine-testable.
Every failure/blocking reason must identify whether it is recoverable by reobserve, reconcile, wait or explicit change.

## V — Fail-closed model
Missing/stale/conflicting required evidence never defaults to success or permission. UNKNOWN remains UNKNOWN.

## W — Evidence model
PremergeProof, ReviewEvidence with commitId/headSha, ruleset evidence, checks exact head.

## X — Freshness / staleness
Evidence is bound to relevant `observedAt`, SHA, stateVersion and/or revisions.
A semantic state change invalidates dependent evidence when its contract declares such dependency.

## Y — Attestation model
EPHEMERAL_RESULT_ONLY by default; promote to bounded durable reference only where an existing authority requires durable proof.

## Z — Persistence model
No new GWC store. Persist only through the existing owning authority when the contract is a RECORD/MUTATE step.

## AA — Secret / privacy model
Never persist tokens, resume secrets, raw authorization headers, arbitrary transport IDs, `.env` material or unbounded prompt bodies.
Use digests/bounded projections where persistence is necessary.

## AB — Replay model
`READ_ONLY`

## AC — Recovery model
Recovery starts by observing the owning authority.
A mutation is replayed only when its replay class explicitly allows it and the recovery anchor proves it has not already happened.

## AD — Security / threat model
Prevent authority confusion, cross-session/repo/project leakage, stale evidence reuse, duplicate mutation, secret leakage and false attestation.

## AE — Observability
Emit bounded start/result/failure/reason-code observations where useful.
Observability is not authority.

## AF — Interface contract with predecessors
Consumes only the predecessor fields whose semantics are explicitly declared.
Revalidates any field whose freshness/ownership requires it.

## AG — Interface contract with successors
Exports `PremergeProof` with explicit semantics; successor may not silently strengthen it.

## AH — Skip contract
No skip unless the graph contains a deterministic condition and proof source.
If skipped, the route and proof are observable.

## AI — Reobserve contract
Reobserve when required evidence is stale, unavailable-but-recoverable, or an external asynchronous condition may have progressed.

## AJ — Reconcile contract
Reconcile only when multiple authorities/state projections are inconsistent.
Reconcile is not the same as refreshing an observation.

## AK — Blocked behavior
Block only the affected Task/contract/resource scope unless an actual global invariant is violated.

## AL — Compensation / rollback
For pure/read-only contracts: not applicable.
For mutations: use existing rollback/compensation only where real; otherwise forward recovery by observation. Never pretend irreversible GitHub effects are rollbackable.

## AM — Existing system mapping
- **Current mapping:** GovernedContext + #89 review commitId + #90 review-thread/mergeability surfaces.
- **Classification:** `PARTIAL/EXTEND`
- Existing behavior is preserved and wrapped/generalized before new engines are introduced.

## AN — Current hardcodes / generalization
MCP/S1/repository literals and single-repository assumptions must move to TargetContext/configuration where applicable; preserve historical MCP behavior backward-compatibly.

## AO — Future implementation slot
Implement behind a GWC contract module + adapter to existing authority. Exact file placement must follow repository architecture discovered at implementation baseline, not be invented prematurely.

## AP — Test contract
happy path; boundary; NONE/AMBIGUOUS/UNVERIFIED/STALE/CONFLICT as applicable; replay/recovery; security; non-regression; exact binding tests.

## AQ — Property / invariant tests
- Unknown evidence never becomes allow/success.
- Explicit predecessor semantics are preserved.
- No hidden mutation.
- Same normalized input + same evidence ⇒ same semantic result for deterministic profiles.
- Mutation contracts never execute without a valid EffectPlan.

## AR — Acceptance criteria
- Input/output schemas are bounded.
- Owning authorities are explicit.
- Fail-closed paths are tested.
- Replay/recovery behavior is defined.
- No new parallel authority.
- Existing non-regression suite remains green.

## AS — Open questions
OD-06 exact review freshness/acceptable review binding policy.

## AT — Architectural findings
- Existing implementation class: `PARTIAL/EXTEND`.
- Any discovered hardcode is treated as a generalization target, not silently removed.
- Any mismatch between CURRENT and TARGET is explicit.

## AU — Future Task Blueprint mapping
This contract is implemented by one or more governed implementation tasks from `GWC_IMPLEMENTATION_TASK_BLUEPRINTS_R1.md`; implementation dependencies follow the contract graph and authority dependencies rather than numeric GW order alone.

## AV — Execution semantics
`OBSERVE_AND_EVALUATE`

## AW — Effect Plan
None.

## AX — Routing table
Primary predecessor: GW-40. Primary successor: GW-42. Additional skip/reobserve/reconcile/recovery edges must be declared deterministically.

## AY — Recovery anchor
Read-only contracts: input/evidence snapshot bindings.
Mutation contracts: target reference + task/session + relevant branch/PR/SHA/revision/job ID.

## AZ — Reconstruction rule
On process restart, reconstruct from authoritative stores and observations; do not rely on previous assistant text or a GWC workflow-state database.

## BA — Autonomy behavior
AUTO_CONTINUE when exactly one legal route exists and required evidence is sufficient; WAIT_EXTERNAL/BLOCK_LOCAL/fail-closed otherwise.


---

# GW-42 — TASK_MERGE_READY

## A — Identity
- **Contract ID:** `GW-42`
- **Canonical name:** `TASK_MERGE_READY`
- **Family:** `F — Review and Merge`
- **Contract version:** `1` (conceptual baseline)
- **Profile(s):** `TASK_MUTATION`
- **Architectural status:** `REUSE`
- **Integration class:** `REUSE`

## B — Purpose
Formaliser la responsabilité `TASK_MERGE_READY` comme contrat borné, versionné et composable, sans dupliquer les autorités existantes.

**Non-responsibilities:** does not steal ownership from Task Queue, Session, Lock Service, Live State, GitRegistry, GitHub, deploy/runtime or other downstream contracts.

## C — Position in global system
- **Logical predecessor(s):** GW-41
- **Logical successor(s):** GW-43
- **Re-entry:** allowed when authoritative evidence shows this contract’s postcondition is not yet proven.
- **Skip:** only when an explicit deterministic `SKIPPABLE_IF` condition exists.
- **Reobserve/Reconcile:** first-class graph edges, never implicit retries.

## D — Chronological role
- **Transport chronology:** may differ from GW numeric order.
- **Functional chronology:** `GW-42` owns only `TASK_MERGE_READY` responsibility.
- **Runtime chronology:** resolved by Workflow Graph, not `stepId + 1`.

## E — Contract input
Sorties prouvées des prédécesseurs applicables, contexte cible borné, références d’autorité nécessaires à `TASK_MERGE_READY`.

Input fields must be bounded, provenance-aware and typed as hint/claim/evidence/fact; raw secret material is forbidden unless explicitly unavoidable and ephemeral.

## F — Information semantics
Every field is classified as one of:
`RAW_INPUT | HINT | CLAIM | OBSERVATION | EVIDENCE | DERIVED_FACT | AUTHORITATIVE_FACT | DECISION | ATTESTATION`.

No contract upgrades a `HINT` to an authoritative fact without the owning evidence.

## G — Authorities
Autorités existantes correspondant aux faits consommés; aucune nouvelle source de vérité créée par GWC.

**Forbidden authority pattern:** no arbitrary Markdown, prompt text, tool availability or remembered state may override the actual owning authority.

## H — Preconditions
- Structural input valid and bounded.
- Required authorities reachable or explicitly `UNAVAILABLE`.
- Required freshness/revision/SHA bindings available.
- No contradictory prerequisite state.
- For mutations: session/receipt/task/locks/governance requirements satisfied.

## I — Internal micro-state machine
validate bounded input → collect/validate required evidence → evaluate local invariants → derive domain status → derive routing disposition → emit bounded output.

## J — Transformation / decision algorithm
1. Parse/validate bounded input.
2. Determine required authority observations.
3. Refuse guesses for missing facts.
4. Apply contract-local invariants.
5. Produce domain status.
6. Produce engine disposition.
7. For mutations only, produce EffectPlan; never mutate from evaluation code directly.
8. Emit bounded output and evidence references.

## K — Determinism
- **Class:** `TASK_MUTATION` with execution semantics `MUTATE_THEN_VERIFY`.
- Pure/read-only contracts are deterministic given identical normalized input and identical evidence snapshot.
- Observation-dependent contracts bind result to evidence freshness/revisions.

## L — Invariants
Global GWC invariants + no over-interpretation of predecessor output + bounded data + fail closed on missing evidence.

Plus all global GWC invariants.

## M — Action model
- **Allowed action kinds:** READ / DERIVE / RECORD / MUTATE
- **Forbidden:** hidden mutation, authority bypass, stale evidence reuse, arbitrary shell fallback, unbounded projection.

## N — Current execution owner vs target owner
CURRENT: existing subsystem(s) listed in AM. TARGET: same owning authority behind a GWC adapter/contract wrapper.

## O — Capability / authorization model
For any mutation:
`callable ∧ authorized ∧ safeNow ∧ preconditionsSatisfied ∧ concurrencySatisfied = mayExecute`.
A present tool is never permission by itself.

## P — Lock model
No new lock unless EffectPlan declares a collision domain; consume existing Lock Service.

## Q — Concurrency model
Independent tasks may proceed in parallel when dependency/resource/lock scopes do not conflict.
Local blockers remain local.
Operational Memory process-local serialization is not treated as distributed locking.

## R — Output contract
- **Canonical output:** `MergeReadyTask`
- Bounded, typed, provenance-aware.
- No secret/raw credential projection.
- Consumers must not over-interpret this output beyond its declared semantics.

## S — Terminal statuses
`SUCCESS | NONE | AMBIGUOUS | UNVERIFIED | BLOCKED | CONFLICT | STALE (subset applicable)`

## T — Terminality formula
Success requires all contract-owned postconditions to be proven from current required evidence.
Missing/stale/conflicting evidence maps to fail-closed statuses, never implicit success.

## U — Reason codes
Contract-specific reason codes must be stable, enumerable, bounded and machine-testable.
Every failure/blocking reason must identify whether it is recoverable by reobserve, reconcile, wait or explicit change.

## V — Fail-closed model
Missing/stale/conflicting required evidence never defaults to success or permission. UNKNOWN remains UNKNOWN.

## W — Evidence model
EvidenceEnvelope(s) from the owning authorities with freshness, provenance and relevant SHA/revision binding.

## X — Freshness / staleness
Evidence is bound to relevant `observedAt`, SHA, stateVersion and/or revisions.
A semantic state change invalidates dependent evidence when its contract declares such dependency.

## Y — Attestation model
EPHEMERAL_RESULT_ONLY by default; promote to bounded durable reference only where an existing authority requires durable proof.

## Z — Persistence model
No new GWC store. Persist only through the existing owning authority when the contract is a RECORD/MUTATE step.

## AA — Secret / privacy model
Never persist tokens, resume secrets, raw authorization headers, arbitrary transport IDs, `.env` material or unbounded prompt bodies.
Use digests/bounded projections where persistence is necessary.

## AB — Replay model
`CONDITIONALLY_IDEMPOTENT unless explicitly NON_REPLAYABLE`

## AC — Recovery model
Recovery starts by observing the owning authority.
A mutation is replayed only when its replay class explicitly allows it and the recovery anchor proves it has not already happened.

## AD — Security / threat model
Prevent authority confusion, cross-session/repo/project leakage, stale evidence reuse, duplicate mutation, secret leakage and false attestation.

## AE — Observability
Emit bounded start/result/failure/reason-code observations where useful.
Observability is not authority.

## AF — Interface contract with predecessors
Consumes only the predecessor fields whose semantics are explicitly declared.
Revalidates any field whose freshness/ownership requires it.

## AG — Interface contract with successors
Exports `MergeReadyTask` with explicit semantics; successor may not silently strengthen it.

## AH — Skip contract
No skip unless the graph contains a deterministic condition and proof source.
If skipped, the route and proof are observable.

## AI — Reobserve contract
Reobserve when required evidence is stale, unavailable-but-recoverable, or an external asynchronous condition may have progressed.

## AJ — Reconcile contract
Reconcile only when multiple authorities/state projections are inconsistent.
Reconcile is not the same as refreshing an observation.

## AK — Blocked behavior
Block only the affected Task/contract/resource scope unless an actual global invariant is violated.

## AL — Compensation / rollback
For pure/read-only contracts: not applicable.
For mutations: use existing rollback/compensation only where real; otherwise forward recovery by observation. Never pretend irreversible GitHub effects are rollbackable.

## AM — Existing system mapping
- **Current mapping:** Task Queue MERGE_READY transition.
- **Classification:** `REUSE`
- Existing behavior is preserved and wrapped/generalized before new engines are introduced.

## AN — Current hardcodes / generalization
MCP/S1/repository literals and single-repository assumptions must move to TargetContext/configuration where applicable; preserve historical MCP behavior backward-compatibly.

## AO — Future implementation slot
Implement behind a GWC contract module + adapter to existing authority. Exact file placement must follow repository architecture discovered at implementation baseline, not be invented prematurely.

## AP — Test contract
happy path; boundary; NONE/AMBIGUOUS/UNVERIFIED/STALE/CONFLICT as applicable; replay/recovery; security; non-regression; exact binding tests.

## AQ — Property / invariant tests
- Unknown evidence never becomes allow/success.
- Explicit predecessor semantics are preserved.
- No hidden mutation.
- Same normalized input + same evidence ⇒ same semantic result for deterministic profiles.
- Mutation contracts never execute without a valid EffectPlan.

## AR — Acceptance criteria
- Input/output schemas are bounded.
- Owning authorities are explicit.
- Fail-closed paths are tested.
- Replay/recovery behavior is defined.
- No new parallel authority.
- Existing non-regression suite remains green.

## AS — Open questions
No blocking open decision beyond profile-specific implementation details; unresolved choices must stay explicit.

## AT — Architectural findings
- Existing implementation class: `REUSE`.
- Any discovered hardcode is treated as a generalization target, not silently removed.
- Any mismatch between CURRENT and TARGET is explicit.

## AU — Future Task Blueprint mapping
This contract is implemented by one or more governed implementation tasks from `GWC_IMPLEMENTATION_TASK_BLUEPRINTS_R1.md`; implementation dependencies follow the contract graph and authority dependencies rather than numeric GW order alone.

## AV — Execution semantics
`MUTATE_THEN_VERIFY`

## AW — Effect Plan
Must be represented as an explicit EffectPlan with target authority, expected revisions/SHA, lock requirements, replay class, postconditions and recovery anchor.

## AX — Routing table
Primary predecessor: GW-41. Primary successor: GW-43. Additional skip/reobserve/reconcile/recovery edges must be declared deterministically.

## AY — Recovery anchor
Read-only contracts: input/evidence snapshot bindings.
Mutation contracts: target reference + task/session + relevant branch/PR/SHA/revision/job ID.

## AZ — Reconstruction rule
On process restart, reconstruct from authoritative stores and observations; do not rely on previous assistant text or a GWC workflow-state database.

## BA — Autonomy behavior
AUTO_CONTINUE when exactly one legal route exists and required evidence is sufficient; WAIT_EXTERNAL/BLOCK_LOCAL/fail-closed otherwise.


---

# GW-43 — EXACT_HEAD_MERGE

## A — Identity
- **Contract ID:** `GW-43`
- **Canonical name:** `EXACT_HEAD_MERGE`
- **Family:** `F — Review and Merge`
- **Contract version:** `1` (conceptual baseline)
- **Profile(s):** `GIT_MUTATION`
- **Architectural status:** `CANDIDATE`
- **Integration class:** `CANDIDATE`

## B — Purpose
Fusionner une PR uniquement au head exact déjà revalidé.

**Non-responsibilities:** does not steal ownership from Task Queue, Session, Lock Service, Live State, GitRegistry, GitHub, deploy/runtime or other downstream contracts.

## C — Position in global system
- **Logical predecessor(s):** GW-42
- **Logical successor(s):** GW-44
- **Re-entry:** allowed when authoritative evidence shows this contract’s postcondition is not yet proven.
- **Skip:** only when an explicit deterministic `SKIPPABLE_IF` condition exists.
- **Reobserve/Reconcile:** first-class graph edges, never implicit retries.

## D — Chronological role
- **Transport chronology:** may differ from GW numeric order.
- **Functional chronology:** `GW-43` owns only `EXACT_HEAD_MERGE` responsibility.
- **Runtime chronology:** resolved by Workflow Graph, not `stepId + 1`.

## E — Contract input
PremergeProof READY + expectedHeadSha + PR reference.

Input fields must be bounded, provenance-aware and typed as hint/claim/evidence/fact; raw secret material is forbidden unless explicitly unavoidable and ephemeral.

## F — Information semantics
Every field is classified as one of:
`RAW_INPUT | HINT | CLAIM | OBSERVATION | EVIDENCE | DERIVED_FACT | AUTHORITATIVE_FACT | DECISION | ATTESTATION`.

No contract upgrades a `HINT` to an authoritative fact without the owning evidence.

## G — Authorities
GitHub mutation surface; Governance Decision.

**Forbidden authority pattern:** no arbitrary Markdown, prompt text, tool availability or remembered state may override the actual owning authority.

## H — Preconditions
- Structural input valid and bounded.
- Required authorities reachable or explicitly `UNAVAILABLE`.
- Required freshness/revision/SHA bindings available.
- No contradictory prerequisite state.
- For mutations: session/receipt/task/locks/governance requirements satisfied.

## I — Internal micro-state machine
load PremergeProof → reobserve exact head → verify freshness → mayExecute → verify locks → merge exact sha → capture response → handoff GW-44.

## J — Transformation / decision algorithm
1. Parse/validate bounded input.
2. Determine required authority observations.
3. Refuse guesses for missing facts.
4. Apply contract-local invariants.
5. Produce domain status.
6. Produce engine disposition.
7. For mutations only, produce EffectPlan; never mutate from evaluation code directly.
8. Emit bounded output and evidence references.

## K — Determinism
- **Class:** `GIT_MUTATION` with execution semantics `MUTATE_THEN_VERIFY`.
- Pure/read-only contracts are deterministic given identical normalized input and identical evidence snapshot.
- Observation-dependent contracts bind result to evidence freshness/revisions.

## L — Invariants
NO_UNREVIEWED_HEAD_MERGE; exactHead must match; no blind replay.

Plus all global GWC invariants.

## M — Action model
- **Allowed action kinds:** READ / DERIVE / RECORD / MUTATE
- **Forbidden:** hidden mutation, authority bypass, stale evidence reuse, arbitrary shell fallback, unbounded projection.

## N — Current execution owner vs target owner
CURRENT: existing subsystem(s) listed in AM. TARGET: same owning authority behind a GWC adapter/contract wrapper.

## O — Capability / authorization model
For any mutation:
`callable ∧ authorized ∧ safeNow ∧ preconditionsSatisfied ∧ concurrencySatisfied = mayExecute`.
A present tool is never permission by itself.

## P — Lock model
Repository/resource lock as dictated by EffectPlan.

## Q — Concurrency model
Independent tasks may proceed in parallel when dependency/resource/lock scopes do not conflict.
Local blockers remain local.
Operational Memory process-local serialization is not treated as distributed locking.

## R — Output contract
- **Canonical output:** `MergeEffectResult`
- Bounded, typed, provenance-aware.
- No secret/raw credential projection.
- Consumers must not over-interpret this output beyond its declared semantics.

## S — Terminal statuses
`MERGED | STALE | BLOCKED | CONFLICT | UNVERIFIED`

## T — Terminality formula
Success requires all contract-owned postconditions to be proven from current required evidence.
Missing/stale/conflicting evidence maps to fail-closed statuses, never implicit success.

## U — Reason codes
Contract-specific reason codes must be stable, enumerable, bounded and machine-testable.
Every failure/blocking reason must identify whether it is recoverable by reobserve, reconcile, wait or explicit change.

## V — Fail-closed model
Missing/stale/conflicting required evidence never defaults to success or permission. UNKNOWN remains UNKNOWN.

## W — Evidence model
PR state before mutation; exact expectedHeadSha; GitHub merge result; post-observation.

## X — Freshness / staleness
Evidence is bound to relevant `observedAt`, SHA, stateVersion and/or revisions.
A semantic state change invalidates dependent evidence when its contract declares such dependency.

## Y — Attestation model
EPHEMERAL_RESULT_ONLY by default; promote to bounded durable reference only where an existing authority requires durable proof.

## Z — Persistence model
No new GWC store. Persist only through the existing owning authority when the contract is a RECORD/MUTATE step.

## AA — Secret / privacy model
Never persist tokens, resume secrets, raw authorization headers, arbitrary transport IDs, `.env` material or unbounded prompt bodies.
Use digests/bounded projections where persistence is necessary.

## AB — Replay model
`NON_REPLAYABLE; RECOVERABLE_BY_OBSERVATION`

## AC — Recovery model
Recovery starts by observing the owning authority.
A mutation is replayed only when its replay class explicitly allows it and the recovery anchor proves it has not already happened.

## AD — Security / threat model
Prevent authority confusion, cross-session/repo/project leakage, stale evidence reuse, duplicate mutation, secret leakage and false attestation.

## AE — Observability
Emit bounded start/result/failure/reason-code observations where useful.
Observability is not authority.

## AF — Interface contract with predecessors
Consumes only the predecessor fields whose semantics are explicitly declared.
Revalidates any field whose freshness/ownership requires it.

## AG — Interface contract with successors
Exports `MergeEffectResult` with explicit semantics; successor may not silently strengthen it.

## AH — Skip contract
No skip unless the graph contains a deterministic condition and proof source.
If skipped, the route and proof are observable.

## AI — Reobserve contract
Reobserve when required evidence is stale, unavailable-but-recoverable, or an external asynchronous condition may have progressed.

## AJ — Reconcile contract
Reconcile only when multiple authorities/state projections are inconsistent.
Reconcile is not the same as refreshing an observation.

## AK — Blocked behavior
Block only the affected Task/contract/resource scope unless an actual global invariant is violated.

## AL — Compensation / rollback
For pure/read-only contracts: not applicable.
For mutations: use existing rollback/compensation only where real; otherwise forward recovery by observation. Never pretend irreversible GitHub effects are rollbackable.

## AM — Existing system mapping
- **Current mapping:** Candidate #90 github_merge_pull_request exact-head.
- **Classification:** `CANDIDATE`
- Existing behavior is preserved and wrapped/generalized before new engines are introduced.

## AN — Current hardcodes / generalization
MCP/S1/repository literals and single-repository assumptions must move to TargetContext/configuration where applicable; preserve historical MCP behavior backward-compatibly.

## AO — Future implementation slot
Implement behind a GWC contract module + adapter to existing authority. Exact file placement must follow repository architecture discovered at implementation baseline, not be invented prematurely.

## AP — Test contract
happy path; boundary; NONE/AMBIGUOUS/UNVERIFIED/STALE/CONFLICT as applicable; replay/recovery; security; non-regression; exact binding tests.

## AQ — Property / invariant tests
- Unknown evidence never becomes allow/success.
- Explicit predecessor semantics are preserved.
- No hidden mutation.
- Same normalized input + same evidence ⇒ same semantic result for deterministic profiles.
- Mutation contracts never execute without a valid EffectPlan.

## AR — Acceptance criteria
- Input/output schemas are bounded.
- Owning authorities are explicit.
- Fail-closed paths are tested.
- Replay/recovery behavior is defined.
- No new parallel authority.
- Existing non-regression suite remains green.

## AS — Open questions
Merge method comes from governed policy/task, not hardcoded by GWC.

## AT — Architectural findings
- Existing implementation class: `CANDIDATE`.
- Any discovered hardcode is treated as a generalization target, not silently removed.
- Any mismatch between CURRENT and TARGET is explicit.

## AU — Future Task Blueprint mapping
This contract is implemented by one or more governed implementation tasks from `GWC_IMPLEMENTATION_TASK_BLUEPRINTS_R1.md`; implementation dependencies follow the contract graph and authority dependencies rather than numeric GW order alone.

## AV — Execution semantics
`MUTATE_THEN_VERIFY`

## AW — Effect Plan
Must be represented as an explicit EffectPlan with target authority, expected revisions/SHA, lock requirements, replay class, postconditions and recovery anchor.

## AX — Routing table
Primary predecessor: GW-42. Primary successor: GW-44. Additional skip/reobserve/reconcile/recovery edges must be declared deterministically.

## AY — Recovery anchor
Read-only contracts: input/evidence snapshot bindings.
Mutation contracts: target reference + task/session + relevant branch/PR/SHA/revision/job ID.

## AZ — Reconstruction rule
On process restart, reconstruct from authoritative stores and observations; do not rely on previous assistant text or a GWC workflow-state database.

## BA — Autonomy behavior
AUTO_CONTINUE when exactly one legal route exists and required evidence is sufficient; WAIT_EXTERNAL/BLOCK_LOCAL/fail-closed otherwise.


---

# GW-44 — MAIN_MERGE_COMMIT_OBSERVATION

## A — Identity
- **Contract ID:** `GW-44`
- **Canonical name:** `MAIN_MERGE_COMMIT_OBSERVATION`
- **Family:** `G — Deployment`
- **Contract version:** `1` (conceptual baseline)
- **Profile(s):** `GIT_OBSERVER`
- **Architectural status:** `REUSE`
- **Integration class:** `REUSE`

## B — Purpose
Formaliser la responsabilité `MAIN_MERGE_COMMIT_OBSERVATION` comme contrat borné, versionné et composable, sans dupliquer les autorités existantes.

**Non-responsibilities:** does not steal ownership from Task Queue, Session, Lock Service, Live State, GitRegistry, GitHub, deploy/runtime or other downstream contracts.

## C — Position in global system
- **Logical predecessor(s):** GW-43
- **Logical successor(s):** GW-45
- **Re-entry:** allowed when authoritative evidence shows this contract’s postcondition is not yet proven.
- **Skip:** only when an explicit deterministic `SKIPPABLE_IF` condition exists.
- **Reobserve/Reconcile:** first-class graph edges, never implicit retries.

## D — Chronological role
- **Transport chronology:** may differ from GW numeric order.
- **Functional chronology:** `GW-44` owns only `MAIN_MERGE_COMMIT_OBSERVATION` responsibility.
- **Runtime chronology:** resolved by Workflow Graph, not `stepId + 1`.

## E — Contract input
Sorties prouvées des prédécesseurs applicables, contexte cible borné, références d’autorité nécessaires à `MAIN_MERGE_COMMIT_OBSERVATION`.

Input fields must be bounded, provenance-aware and typed as hint/claim/evidence/fact; raw secret material is forbidden unless explicitly unavoidable and ephemeral.

## F — Information semantics
Every field is classified as one of:
`RAW_INPUT | HINT | CLAIM | OBSERVATION | EVIDENCE | DERIVED_FACT | AUTHORITATIVE_FACT | DECISION | ATTESTATION`.

No contract upgrades a `HINT` to an authoritative fact without the owning evidence.

## G — Authorities
Autorités existantes correspondant aux faits consommés; aucune nouvelle source de vérité créée par GWC.

**Forbidden authority pattern:** no arbitrary Markdown, prompt text, tool availability or remembered state may override the actual owning authority.

## H — Preconditions
- Structural input valid and bounded.
- Required authorities reachable or explicitly `UNAVAILABLE`.
- Required freshness/revision/SHA bindings available.
- No contradictory prerequisite state.
- For mutations: session/receipt/task/locks/governance requirements satisfied.

## I — Internal micro-state machine
validate bounded input → collect/validate required evidence → evaluate local invariants → derive domain status → derive routing disposition → emit bounded output.

## J — Transformation / decision algorithm
1. Parse/validate bounded input.
2. Determine required authority observations.
3. Refuse guesses for missing facts.
4. Apply contract-local invariants.
5. Produce domain status.
6. Produce engine disposition.
7. For mutations only, produce EffectPlan; never mutate from evaluation code directly.
8. Emit bounded output and evidence references.

## K — Determinism
- **Class:** `GIT_OBSERVER` with execution semantics `OBSERVE_AND_EVALUATE`.
- Pure/read-only contracts are deterministic given identical normalized input and identical evidence snapshot.
- Observation-dependent contracts bind result to evidence freshness/revisions.

## L — Invariants
Global GWC invariants + no over-interpretation of predecessor output + bounded data + fail closed on missing evidence.

Plus all global GWC invariants.

## M — Action model
- **Allowed action kinds:** READ / DERIVE
- **Forbidden:** hidden mutation, authority bypass, stale evidence reuse, arbitrary shell fallback, unbounded projection.

## N — Current execution owner vs target owner
CURRENT: existing subsystem(s) listed in AM. TARGET: same owning authority behind a GWC adapter/contract wrapper.

## O — Capability / authorization model
For any mutation:
`callable ∧ authorized ∧ safeNow ∧ preconditionsSatisfied ∧ concurrencySatisfied = mayExecute`.
A present tool is never permission by itself.

## P — Lock model
No new lock unless EffectPlan declares a collision domain; consume existing Lock Service.

## Q — Concurrency model
Independent tasks may proceed in parallel when dependency/resource/lock scopes do not conflict.
Local blockers remain local.
Operational Memory process-local serialization is not treated as distributed locking.

## R — Output contract
- **Canonical output:** `MergeCommitObservation`
- Bounded, typed, provenance-aware.
- No secret/raw credential projection.
- Consumers must not over-interpret this output beyond its declared semantics.

## S — Terminal statuses
`SUCCESS | NONE | AMBIGUOUS | UNVERIFIED | BLOCKED | CONFLICT | STALE (subset applicable)`

## T — Terminality formula
Success requires all contract-owned postconditions to be proven from current required evidence.
Missing/stale/conflicting evidence maps to fail-closed statuses, never implicit success.

## U — Reason codes
Contract-specific reason codes must be stable, enumerable, bounded and machine-testable.
Every failure/blocking reason must identify whether it is recoverable by reobserve, reconcile, wait or explicit change.

## V — Fail-closed model
Missing/stale/conflicting required evidence never defaults to success or permission. UNKNOWN remains UNKNOWN.

## W — Evidence model
EvidenceEnvelope(s) from the owning authorities with freshness, provenance and relevant SHA/revision binding.

## X — Freshness / staleness
Evidence is bound to relevant `observedAt`, SHA, stateVersion and/or revisions.
A semantic state change invalidates dependent evidence when its contract declares such dependency.

## Y — Attestation model
EPHEMERAL_RESULT_ONLY by default; promote to bounded durable reference only where an existing authority requires durable proof.

## Z — Persistence model
No new GWC store. Persist only through the existing owning authority when the contract is a RECORD/MUTATE step.

## AA — Secret / privacy model
Never persist tokens, resume secrets, raw authorization headers, arbitrary transport IDs, `.env` material or unbounded prompt bodies.
Use digests/bounded projections where persistence is necessary.

## AB — Replay model
`READ_ONLY`

## AC — Recovery model
Recovery starts by observing the owning authority.
A mutation is replayed only when its replay class explicitly allows it and the recovery anchor proves it has not already happened.

## AD — Security / threat model
Prevent authority confusion, cross-session/repo/project leakage, stale evidence reuse, duplicate mutation, secret leakage and false attestation.

## AE — Observability
Emit bounded start/result/failure/reason-code observations where useful.
Observability is not authority.

## AF — Interface contract with predecessors
Consumes only the predecessor fields whose semantics are explicitly declared.
Revalidates any field whose freshness/ownership requires it.

## AG — Interface contract with successors
Exports `MergeCommitObservation` with explicit semantics; successor may not silently strengthen it.

## AH — Skip contract
No skip unless the graph contains a deterministic condition and proof source.
If skipped, the route and proof are observable.

## AI — Reobserve contract
Reobserve when required evidence is stale, unavailable-but-recoverable, or an external asynchronous condition may have progressed.

## AJ — Reconcile contract
Reconcile only when multiple authorities/state projections are inconsistent.
Reconcile is not the same as refreshing an observation.

## AK — Blocked behavior
Block only the affected Task/contract/resource scope unless an actual global invariant is violated.

## AL — Compensation / rollback
For pure/read-only contracts: not applicable.
For mutations: use existing rollback/compensation only where real; otherwise forward recovery by observation. Never pretend irreversible GitHub effects are rollbackable.

## AM — Existing system mapping
- **Current mapping:** GitHub main/PR merge observation.
- **Classification:** `REUSE`
- Existing behavior is preserved and wrapped/generalized before new engines are introduced.

## AN — Current hardcodes / generalization
MCP/S1/repository literals and single-repository assumptions must move to TargetContext/configuration where applicable; preserve historical MCP behavior backward-compatibly.

## AO — Future implementation slot
Implement behind a GWC contract module + adapter to existing authority. Exact file placement must follow repository architecture discovered at implementation baseline, not be invented prematurely.

## AP — Test contract
happy path; boundary; NONE/AMBIGUOUS/UNVERIFIED/STALE/CONFLICT as applicable; replay/recovery; security; non-regression; exact binding tests.

## AQ — Property / invariant tests
- Unknown evidence never becomes allow/success.
- Explicit predecessor semantics are preserved.
- No hidden mutation.
- Same normalized input + same evidence ⇒ same semantic result for deterministic profiles.
- Mutation contracts never execute without a valid EffectPlan.

## AR — Acceptance criteria
- Input/output schemas are bounded.
- Owning authorities are explicit.
- Fail-closed paths are tested.
- Replay/recovery behavior is defined.
- No new parallel authority.
- Existing non-regression suite remains green.

## AS — Open questions
No blocking open decision beyond profile-specific implementation details; unresolved choices must stay explicit.

## AT — Architectural findings
- Existing implementation class: `REUSE`.
- Any discovered hardcode is treated as a generalization target, not silently removed.
- Any mismatch between CURRENT and TARGET is explicit.

## AU — Future Task Blueprint mapping
This contract is implemented by one or more governed implementation tasks from `GWC_IMPLEMENTATION_TASK_BLUEPRINTS_R1.md`; implementation dependencies follow the contract graph and authority dependencies rather than numeric GW order alone.

## AV — Execution semantics
`OBSERVE_AND_EVALUATE`

## AW — Effect Plan
None.

## AX — Routing table
Primary predecessor: GW-43. Primary successor: GW-45. Additional skip/reobserve/reconcile/recovery edges must be declared deterministically.

## AY — Recovery anchor
Read-only contracts: input/evidence snapshot bindings.
Mutation contracts: target reference + task/session + relevant branch/PR/SHA/revision/job ID.

## AZ — Reconstruction rule
On process restart, reconstruct from authoritative stores and observations; do not rely on previous assistant text or a GWC workflow-state database.

## BA — Autonomy behavior
AUTO_CONTINUE when exactly one legal route exists and required evidence is sufficient; WAIT_EXTERNAL/BLOCK_LOCAL/fail-closed otherwise.


---

# GW-45 — MAIN_CI

## A — Identity
- **Contract ID:** `GW-45`
- **Canonical name:** `MAIN_CI`
- **Family:** `G — Deployment`
- **Contract version:** `1` (conceptual baseline)
- **Profile(s):** `CI_OBSERVER`
- **Architectural status:** `REUSE/EXTEND`
- **Integration class:** `REUSE/EXTEND`

## B — Purpose
Prouver la CI main du SHA de merge concerné.

**Non-responsibilities:** does not steal ownership from Task Queue, Session, Lock Service, Live State, GitRegistry, GitHub, deploy/runtime or other downstream contracts.

## C — Position in global system
- **Logical predecessor(s):** GW-44
- **Logical successor(s):** GW-46 or WAIT_EXTERNAL
- **Re-entry:** allowed when authoritative evidence shows this contract’s postcondition is not yet proven.
- **Skip:** only when an explicit deterministic `SKIPPABLE_IF` condition exists.
- **Reobserve/Reconcile:** first-class graph edges, never implicit retries.

## D — Chronological role
- **Transport chronology:** may differ from GW numeric order.
- **Functional chronology:** `GW-45` owns only `MAIN_CI` responsibility.
- **Runtime chronology:** resolved by Workflow Graph, not `stepId + 1`.

## E — Contract input
taskMergeSha / main merge observation.

Input fields must be bounded, provenance-aware and typed as hint/claim/evidence/fact; raw secret material is forbidden unless explicitly unavoidable and ephemeral.

## F — Information semantics
Every field is classified as one of:
`RAW_INPUT | HINT | CLAIM | OBSERVATION | EVIDENCE | DERIVED_FACT | AUTHORITATIVE_FACT | DECISION | ATTESTATION`.

No contract upgrades a `HINT` to an authoritative fact without the owning evidence.

## G — Authorities
GitHub Actions/check-runs.

**Forbidden authority pattern:** no arbitrary Markdown, prompt text, tool availability or remembered state may override the actual owning authority.

## H — Preconditions
- Structural input valid and bounded.
- Required authorities reachable or explicitly `UNAVAILABLE`.
- Required freshness/revision/SHA bindings available.
- No contradictory prerequisite state.
- For mutations: session/receipt/task/locks/governance requirements satisfied.

## I — Internal micro-state machine
locate exact-SHA run/checks → verify required contexts → pending/failure/success → bind proof to taskMergeSha.

## J — Transformation / decision algorithm
1. Parse/validate bounded input.
2. Determine required authority observations.
3. Refuse guesses for missing facts.
4. Apply contract-local invariants.
5. Produce domain status.
6. Produce engine disposition.
7. For mutations only, produce EffectPlan; never mutate from evaluation code directly.
8. Emit bounded output and evidence references.

## K — Determinism
- **Class:** `CI_OBSERVER` with execution semantics `OBSERVE_AND_EVALUATE`.
- Pure/read-only contracts are deterministic given identical normalized input and identical evidence snapshot.
- Observation-dependent contracts bind result to evidence freshness/revisions.

## L — Invariants
same-SHA proof; pending means WAIT_EXTERNAL; later unrelated main does not retroactively satisfy older task.

Plus all global GWC invariants.

## M — Action model
- **Allowed action kinds:** READ / DERIVE
- **Forbidden:** hidden mutation, authority bypass, stale evidence reuse, arbitrary shell fallback, unbounded projection.

## N — Current execution owner vs target owner
CURRENT: existing subsystem(s) listed in AM. TARGET: same owning authority behind a GWC adapter/contract wrapper.

## O — Capability / authorization model
For any mutation:
`callable ∧ authorized ∧ safeNow ∧ preconditionsSatisfied ∧ concurrencySatisfied = mayExecute`.
A present tool is never permission by itself.

## P — Lock model
Aucun.

## Q — Concurrency model
Independent tasks may proceed in parallel when dependency/resource/lock scopes do not conflict.
Local blockers remain local.
Operational Memory process-local serialization is not treated as distributed locking.

## R — Output contract
- **Canonical output:** `MainCiProof`
- Bounded, typed, provenance-aware.
- No secret/raw credential projection.
- Consumers must not over-interpret this output beyond its declared semantics.

## S — Terminal statuses
`SUCCESS | PENDING | FAILED | UNVERIFIED | STALE`

## T — Terminality formula
Success requires all contract-owned postconditions to be proven from current required evidence.
Missing/stale/conflicting evidence maps to fail-closed statuses, never implicit success.

## U — Reason codes
Contract-specific reason codes must be stable, enumerable, bounded and machine-testable.
Every failure/blocking reason must identify whether it is recoverable by reobserve, reconcile, wait or explicit change.

## V — Fail-closed model
Missing/stale/conflicting required evidence never defaults to success or permission. UNKNOWN remains UNKNOWN.

## W — Evidence model
workflow run/check IDs, headSha, context, status/conclusion, timestamps.

## X — Freshness / staleness
Evidence is bound to relevant `observedAt`, SHA, stateVersion and/or revisions.
A semantic state change invalidates dependent evidence when its contract declares such dependency.

## Y — Attestation model
EPHEMERAL_RESULT_ONLY by default; promote to bounded durable reference only where an existing authority requires durable proof.

## Z — Persistence model
No new GWC store. Persist only through the existing owning authority when the contract is a RECORD/MUTATE step.

## AA — Secret / privacy model
Never persist tokens, resume secrets, raw authorization headers, arbitrary transport IDs, `.env` material or unbounded prompt bodies.
Use digests/bounded projections where persistence is necessary.

## AB — Replay model
`READ_ONLY`

## AC — Recovery model
Recovery starts by observing the owning authority.
A mutation is replayed only when its replay class explicitly allows it and the recovery anchor proves it has not already happened.

## AD — Security / threat model
Prevent authority confusion, cross-session/repo/project leakage, stale evidence reuse, duplicate mutation, secret leakage and false attestation.

## AE — Observability
Emit bounded start/result/failure/reason-code observations where useful.
Observability is not authority.

## AF — Interface contract with predecessors
Consumes only the predecessor fields whose semantics are explicitly declared.
Revalidates any field whose freshness/ownership requires it.

## AG — Interface contract with successors
Exports `MainCiProof` with explicit semantics; successor may not silently strengthen it.

## AH — Skip contract
No skip unless the graph contains a deterministic condition and proof source.
If skipped, the route and proof are observable.

## AI — Reobserve contract
Reobserve when required evidence is stale, unavailable-but-recoverable, or an external asynchronous condition may have progressed.

## AJ — Reconcile contract
Reconcile only when multiple authorities/state projections are inconsistent.
Reconcile is not the same as refreshing an observation.

## AK — Blocked behavior
Block only the affected Task/contract/resource scope unless an actual global invariant is violated.

## AL — Compensation / rollback
For pure/read-only contracts: not applicable.
For mutations: use existing rollback/compensation only where real; otherwise forward recovery by observation. Never pretend irreversible GitHub effects are rollbackable.

## AM — Existing system mapping
- **Current mapping:** mcp-ci.yml + checks/workflow-runs evidence.
- **Classification:** `REUSE/EXTEND`
- Existing behavior is preserved and wrapped/generalized before new engines are introduced.

## AN — Current hardcodes / generalization
MCP/S1/repository literals and single-repository assumptions must move to TargetContext/configuration where applicable; preserve historical MCP behavior backward-compatibly.

## AO — Future implementation slot
Implement behind a GWC contract module + adapter to existing authority. Exact file placement must follow repository architecture discovered at implementation baseline, not be invented prematurely.

## AP — Test contract
happy path; boundary; NONE/AMBIGUOUS/UNVERIFIED/STALE/CONFLICT as applicable; replay/recovery; security; non-regression; exact binding tests.

## AQ — Property / invariant tests
- Unknown evidence never becomes allow/success.
- Explicit predecessor semantics are preserved.
- No hidden mutation.
- Same normalized input + same evidence ⇒ same semantic result for deterministic profiles.
- Mutation contracts never execute without a valid EffectPlan.

## AR — Acceptance criteria
- Input/output schemas are bounded.
- Owning authorities are explicit.
- Fail-closed paths are tested.
- Replay/recovery behavior is defined.
- No new parallel authority.
- Existing non-regression suite remains green.

## AS — Open questions
AF-19 mechanism to ensure CI-before-deploy acceptance.

## AT — Architectural findings
- Existing implementation class: `REUSE/EXTEND`.
- Any discovered hardcode is treated as a generalization target, not silently removed.
- Any mismatch between CURRENT and TARGET is explicit.

## AU — Future Task Blueprint mapping
This contract is implemented by one or more governed implementation tasks from `GWC_IMPLEMENTATION_TASK_BLUEPRINTS_R1.md`; implementation dependencies follow the contract graph and authority dependencies rather than numeric GW order alone.

## AV — Execution semantics
`OBSERVE_AND_EVALUATE`

## AW — Effect Plan
None.

## AX — Routing table
Primary predecessor: GW-44. Primary successor: GW-46 or WAIT_EXTERNAL. Additional skip/reobserve/reconcile/recovery edges must be declared deterministically.

## AY — Recovery anchor
Read-only contracts: input/evidence snapshot bindings.
Mutation contracts: target reference + task/session + relevant branch/PR/SHA/revision/job ID.

## AZ — Reconstruction rule
On process restart, reconstruct from authoritative stores and observations; do not rely on previous assistant text or a GWC workflow-state database.

## BA — Autonomy behavior
AUTO_CONTINUE when exactly one legal route exists and required evidence is sufficient; WAIT_EXTERNAL/BLOCK_LOCAL/fail-closed otherwise.


---

# GW-46 — GOVERNED_AUTODEPLOY_OBSERVATION

## A — Identity
- **Contract ID:** `GW-46`
- **Canonical name:** `GOVERNED_AUTODEPLOY_OBSERVATION`
- **Family:** `G — Deployment`
- **Contract version:** `1` (conceptual baseline)
- **Profile(s):** `DEPLOY_OBSERVER`
- **Architectural status:** `REUSE/EXTEND`
- **Integration class:** `REUSE/EXTEND`

## B — Purpose
Formaliser la responsabilité `GOVERNED_AUTODEPLOY_OBSERVATION` comme contrat borné, versionné et composable, sans dupliquer les autorités existantes.

**Non-responsibilities:** does not steal ownership from Task Queue, Session, Lock Service, Live State, GitRegistry, GitHub, deploy/runtime or other downstream contracts.

## C — Position in global system
- **Logical predecessor(s):** GW-45
- **Logical successor(s):** GW-47..GW-52 observe same deployment job
- **Re-entry:** allowed when authoritative evidence shows this contract’s postcondition is not yet proven.
- **Skip:** only when an explicit deterministic `SKIPPABLE_IF` condition exists.
- **Reobserve/Reconcile:** first-class graph edges, never implicit retries.

## D — Chronological role
- **Transport chronology:** may differ from GW numeric order.
- **Functional chronology:** `GW-46` owns only `GOVERNED_AUTODEPLOY_OBSERVATION` responsibility.
- **Runtime chronology:** resolved by Workflow Graph, not `stepId + 1`.

## E — Contract input
Sorties prouvées des prédécesseurs applicables, contexte cible borné, références d’autorité nécessaires à `GOVERNED_AUTODEPLOY_OBSERVATION`.

Input fields must be bounded, provenance-aware and typed as hint/claim/evidence/fact; raw secret material is forbidden unless explicitly unavoidable and ephemeral.

## F — Information semantics
Every field is classified as one of:
`RAW_INPUT | HINT | CLAIM | OBSERVATION | EVIDENCE | DERIVED_FACT | AUTHORITATIVE_FACT | DECISION | ATTESTATION`.

No contract upgrades a `HINT` to an authoritative fact without the owning evidence.

## G — Authorities
Autorités existantes correspondant aux faits consommés; aucune nouvelle source de vérité créée par GWC.

**Forbidden authority pattern:** no arbitrary Markdown, prompt text, tool availability or remembered state may override the actual owning authority.

## H — Preconditions
- Structural input valid and bounded.
- Required authorities reachable or explicitly `UNAVAILABLE`.
- Required freshness/revision/SHA bindings available.
- No contradictory prerequisite state.
- For mutations: session/receipt/task/locks/governance requirements satisfied.

## I — Internal micro-state machine
validate bounded input → collect/validate required evidence → evaluate local invariants → derive domain status → derive routing disposition → emit bounded output.

## J — Transformation / decision algorithm
1. Parse/validate bounded input.
2. Determine required authority observations.
3. Refuse guesses for missing facts.
4. Apply contract-local invariants.
5. Produce domain status.
6. Produce engine disposition.
7. For mutations only, produce EffectPlan; never mutate from evaluation code directly.
8. Emit bounded output and evidence references.

## K — Determinism
- **Class:** `DEPLOY_OBSERVER` with execution semantics `OBSERVE_AND_EVALUATE`.
- Pure/read-only contracts are deterministic given identical normalized input and identical evidence snapshot.
- Observation-dependent contracts bind result to evidence freshness/revisions.

## L — Invariants
Global GWC invariants + no over-interpretation of predecessor output + bounded data + fail closed on missing evidence.

Plus all global GWC invariants.

## M — Action model
- **Allowed action kinds:** READ / DERIVE
- **Forbidden:** hidden mutation, authority bypass, stale evidence reuse, arbitrary shell fallback, unbounded projection.

## N — Current execution owner vs target owner
CURRENT: existing subsystem(s) listed in AM. TARGET: same owning authority behind a GWC adapter/contract wrapper.

## O — Capability / authorization model
For any mutation:
`callable ∧ authorized ∧ safeNow ∧ preconditionsSatisfied ∧ concurrencySatisfied = mayExecute`.
A present tool is never permission by itself.

## P — Lock model
No new lock unless EffectPlan declares a collision domain; consume existing Lock Service.

## Q — Concurrency model
Independent tasks may proceed in parallel when dependency/resource/lock scopes do not conflict.
Local blockers remain local.
Operational Memory process-local serialization is not treated as distributed locking.

## R — Output contract
- **Canonical output:** `DeploymentJobObservation`
- Bounded, typed, provenance-aware.
- No secret/raw credential projection.
- Consumers must not over-interpret this output beyond its declared semantics.

## S — Terminal statuses
`SUCCESS | NONE | AMBIGUOUS | UNVERIFIED | BLOCKED | CONFLICT | STALE (subset applicable)`

## T — Terminality formula
Success requires all contract-owned postconditions to be proven from current required evidence.
Missing/stale/conflicting evidence maps to fail-closed statuses, never implicit success.

## U — Reason codes
Contract-specific reason codes must be stable, enumerable, bounded and machine-testable.
Every failure/blocking reason must identify whether it is recoverable by reobserve, reconcile, wait or explicit change.

## V — Fail-closed model
Missing/stale/conflicting required evidence never defaults to success or permission. UNKNOWN remains UNKNOWN.

## W — Evidence model
EvidenceEnvelope(s) from the owning authorities with freshness, provenance and relevant SHA/revision binding.

## X — Freshness / staleness
Evidence is bound to relevant `observedAt`, SHA, stateVersion and/or revisions.
A semantic state change invalidates dependent evidence when its contract declares such dependency.

## Y — Attestation model
EPHEMERAL_RESULT_ONLY by default; promote to bounded durable reference only where an existing authority requires durable proof.

## Z — Persistence model
No new GWC store. Persist only through the existing owning authority when the contract is a RECORD/MUTATE step.

## AA — Secret / privacy model
Never persist tokens, resume secrets, raw authorization headers, arbitrary transport IDs, `.env` material or unbounded prompt bodies.
Use digests/bounded projections where persistence is necessary.

## AB — Replay model
`READ_ONLY`

## AC — Recovery model
Recovery starts by observing the owning authority.
A mutation is replayed only when its replay class explicitly allows it and the recovery anchor proves it has not already happened.

## AD — Security / threat model
Prevent authority confusion, cross-session/repo/project leakage, stale evidence reuse, duplicate mutation, secret leakage and false attestation.

## AE — Observability
Emit bounded start/result/failure/reason-code observations where useful.
Observability is not authority.

## AF — Interface contract with predecessors
Consumes only the predecessor fields whose semantics are explicitly declared.
Revalidates any field whose freshness/ownership requires it.

## AG — Interface contract with successors
Exports `DeploymentJobObservation` with explicit semantics; successor may not silently strengthen it.

## AH — Skip contract
No skip unless the graph contains a deterministic condition and proof source.
If skipped, the route and proof are observable.

## AI — Reobserve contract
Reobserve when required evidence is stale, unavailable-but-recoverable, or an external asynchronous condition may have progressed.

## AJ — Reconcile contract
Reconcile only when multiple authorities/state projections are inconsistent.
Reconcile is not the same as refreshing an observation.

## AK — Blocked behavior
Block only the affected Task/contract/resource scope unless an actual global invariant is violated.

## AL — Compensation / rollback
For pure/read-only contracts: not applicable.
For mutations: use existing rollback/compensation only where real; otherwise forward recovery by observation. Never pretend irreversible GitHub effects are rollbackable.

## AM — Existing system mapping
- **Current mapping:** mcp-deploy.yml + deploy job/status.
- **Classification:** `REUSE/EXTEND`
- Existing behavior is preserved and wrapped/generalized before new engines are introduced.

## AN — Current hardcodes / generalization
MCP/S1/repository literals and single-repository assumptions must move to TargetContext/configuration where applicable; preserve historical MCP behavior backward-compatibly.

## AO — Future implementation slot
Implement behind a GWC contract module + adapter to existing authority. Exact file placement must follow repository architecture discovered at implementation baseline, not be invented prematurely.

## AP — Test contract
happy path; boundary; NONE/AMBIGUOUS/UNVERIFIED/STALE/CONFLICT as applicable; replay/recovery; security; non-regression; exact binding tests.

## AQ — Property / invariant tests
- Unknown evidence never becomes allow/success.
- Explicit predecessor semantics are preserved.
- No hidden mutation.
- Same normalized input + same evidence ⇒ same semantic result for deterministic profiles.
- Mutation contracts never execute without a valid EffectPlan.

## AR — Acceptance criteria
- Input/output schemas are bounded.
- Owning authorities are explicit.
- Fail-closed paths are tested.
- Replay/recovery behavior is defined.
- No new parallel authority.
- Existing non-regression suite remains green.

## AS — Open questions
No blocking open decision beyond profile-specific implementation details; unresolved choices must stay explicit.

## AT — Architectural findings
- Existing implementation class: `REUSE/EXTEND`.
- Any discovered hardcode is treated as a generalization target, not silently removed.
- Any mismatch between CURRENT and TARGET is explicit.

## AU — Future Task Blueprint mapping
This contract is implemented by one or more governed implementation tasks from `GWC_IMPLEMENTATION_TASK_BLUEPRINTS_R1.md`; implementation dependencies follow the contract graph and authority dependencies rather than numeric GW order alone.

## AV — Execution semantics
`OBSERVE_AND_EVALUATE`

## AW — Effect Plan
None.

## AX — Routing table
Primary predecessor: GW-45. Primary successor: GW-47..GW-52 observe same deployment job. Additional skip/reobserve/reconcile/recovery edges must be declared deterministically.

## AY — Recovery anchor
Read-only contracts: input/evidence snapshot bindings.
Mutation contracts: target reference + task/session + relevant branch/PR/SHA/revision/job ID.

## AZ — Reconstruction rule
On process restart, reconstruct from authoritative stores and observations; do not rely on previous assistant text or a GWC workflow-state database.

## BA — Autonomy behavior
AUTO_CONTINUE when exactly one legal route exists and required evidence is sufficient; WAIT_EXTERNAL/BLOCK_LOCAL/fail-closed otherwise.


---

# GW-47 — GITHUB_TO_S1_SYNC_ATTESTATION

## A — Identity
- **Contract ID:** `GW-47`
- **Canonical name:** `GITHUB_TO_S1_SYNC_ATTESTATION`
- **Family:** `G — Deployment`
- **Contract version:** `1` (conceptual baseline)
- **Profile(s):** `DEPLOY_ATTESTATION`
- **Architectural status:** `REUSE/GENERALIZE`
- **Integration class:** `REUSE/GENERALIZE`

## B — Purpose
Formaliser la responsabilité `GITHUB_TO_S1_SYNC_ATTESTATION` comme contrat borné, versionné et composable, sans dupliquer les autorités existantes.

**Non-responsibilities:** does not steal ownership from Task Queue, Session, Lock Service, Live State, GitRegistry, GitHub, deploy/runtime or other downstream contracts.

## C — Position in global system
- **Logical predecessor(s):** GW-46
- **Logical successor(s):** GW-48
- **Re-entry:** allowed when authoritative evidence shows this contract’s postcondition is not yet proven.
- **Skip:** only when an explicit deterministic `SKIPPABLE_IF` condition exists.
- **Reobserve/Reconcile:** first-class graph edges, never implicit retries.

## D — Chronological role
- **Transport chronology:** may differ from GW numeric order.
- **Functional chronology:** `GW-47` owns only `GITHUB_TO_S1_SYNC_ATTESTATION` responsibility.
- **Runtime chronology:** resolved by Workflow Graph, not `stepId + 1`.

## E — Contract input
Sorties prouvées des prédécesseurs applicables, contexte cible borné, références d’autorité nécessaires à `GITHUB_TO_S1_SYNC_ATTESTATION`.

Input fields must be bounded, provenance-aware and typed as hint/claim/evidence/fact; raw secret material is forbidden unless explicitly unavoidable and ephemeral.

## F — Information semantics
Every field is classified as one of:
`RAW_INPUT | HINT | CLAIM | OBSERVATION | EVIDENCE | DERIVED_FACT | AUTHORITATIVE_FACT | DECISION | ATTESTATION`.

No contract upgrades a `HINT` to an authoritative fact without the owning evidence.

## G — Authorities
Autorités existantes correspondant aux faits consommés; aucune nouvelle source de vérité créée par GWC.

**Forbidden authority pattern:** no arbitrary Markdown, prompt text, tool availability or remembered state may override the actual owning authority.

## H — Preconditions
- Structural input valid and bounded.
- Required authorities reachable or explicitly `UNAVAILABLE`.
- Required freshness/revision/SHA bindings available.
- No contradictory prerequisite state.
- For mutations: session/receipt/task/locks/governance requirements satisfied.

## I — Internal micro-state machine
validate bounded input → collect/validate required evidence → evaluate local invariants → derive domain status → derive routing disposition → emit bounded output.

## J — Transformation / decision algorithm
1. Parse/validate bounded input.
2. Determine required authority observations.
3. Refuse guesses for missing facts.
4. Apply contract-local invariants.
5. Produce domain status.
6. Produce engine disposition.
7. For mutations only, produce EffectPlan; never mutate from evaluation code directly.
8. Emit bounded output and evidence references.

## K — Determinism
- **Class:** `DEPLOY_ATTESTATION` with execution semantics `OBSERVE_AND_EVALUATE`.
- Pure/read-only contracts are deterministic given identical normalized input and identical evidence snapshot.
- Observation-dependent contracts bind result to evidence freshness/revisions.

## L — Invariants
Global GWC invariants + no over-interpretation of predecessor output + bounded data + fail closed on missing evidence.

Plus all global GWC invariants.

## M — Action model
- **Allowed action kinds:** READ / DERIVE
- **Forbidden:** hidden mutation, authority bypass, stale evidence reuse, arbitrary shell fallback, unbounded projection.

## N — Current execution owner vs target owner
CURRENT: existing subsystem(s) listed in AM. TARGET: same owning authority behind a GWC adapter/contract wrapper.

## O — Capability / authorization model
For any mutation:
`callable ∧ authorized ∧ safeNow ∧ preconditionsSatisfied ∧ concurrencySatisfied = mayExecute`.
A present tool is never permission by itself.

## P — Lock model
No new lock unless EffectPlan declares a collision domain; consume existing Lock Service.

## Q — Concurrency model
Independent tasks may proceed in parallel when dependency/resource/lock scopes do not conflict.
Local blockers remain local.
Operational Memory process-local serialization is not treated as distributed locking.

## R — Output contract
- **Canonical output:** `SyncAttestation`
- Bounded, typed, provenance-aware.
- No secret/raw credential projection.
- Consumers must not over-interpret this output beyond its declared semantics.

## S — Terminal statuses
`SUCCESS | NONE | AMBIGUOUS | UNVERIFIED | BLOCKED | CONFLICT | STALE (subset applicable)`

## T — Terminality formula
Success requires all contract-owned postconditions to be proven from current required evidence.
Missing/stale/conflicting evidence maps to fail-closed statuses, never implicit success.

## U — Reason codes
Contract-specific reason codes must be stable, enumerable, bounded and machine-testable.
Every failure/blocking reason must identify whether it is recoverable by reobserve, reconcile, wait or explicit change.

## V — Fail-closed model
Missing/stale/conflicting required evidence never defaults to success or permission. UNKNOWN remains UNKNOWN.

## W — Evidence model
EvidenceEnvelope(s) from the owning authorities with freshness, provenance and relevant SHA/revision binding.

## X — Freshness / staleness
Evidence is bound to relevant `observedAt`, SHA, stateVersion and/or revisions.
A semantic state change invalidates dependent evidence when its contract declares such dependency.

## Y — Attestation model
EPHEMERAL_RESULT_ONLY by default; promote to bounded durable reference only where an existing authority requires durable proof.

## Z — Persistence model
No new GWC store. Persist only through the existing owning authority when the contract is a RECORD/MUTATE step.

## AA — Secret / privacy model
Never persist tokens, resume secrets, raw authorization headers, arbitrary transport IDs, `.env` material or unbounded prompt bodies.
Use digests/bounded projections where persistence is necessary.

## AB — Replay model
`READ_ONLY`

## AC — Recovery model
Recovery starts by observing the owning authority.
A mutation is replayed only when its replay class explicitly allows it and the recovery anchor proves it has not already happened.

## AD — Security / threat model
Prevent authority confusion, cross-session/repo/project leakage, stale evidence reuse, duplicate mutation, secret leakage and false attestation.

## AE — Observability
Emit bounded start/result/failure/reason-code observations where useful.
Observability is not authority.

## AF — Interface contract with predecessors
Consumes only the predecessor fields whose semantics are explicitly declared.
Revalidates any field whose freshness/ownership requires it.

## AG — Interface contract with successors
Exports `SyncAttestation` with explicit semantics; successor may not silently strengthen it.

## AH — Skip contract
No skip unless the graph contains a deterministic condition and proof source.
If skipped, the route and proof are observable.

## AI — Reobserve contract
Reobserve when required evidence is stale, unavailable-but-recoverable, or an external asynchronous condition may have progressed.

## AJ — Reconcile contract
Reconcile only when multiple authorities/state projections are inconsistent.
Reconcile is not the same as refreshing an observation.

## AK — Blocked behavior
Block only the affected Task/contract/resource scope unless an actual global invariant is violated.

## AL — Compensation / rollback
For pure/read-only contracts: not applicable.
For mutations: use existing rollback/compensation only where real; otherwise forward recovery by observation. Never pretend irreversible GitHub effects are rollbackable.

## AM — Existing system mapping
- **Current mapping:** src/deploy/s1Deploy.ts exact SHA/FF sync.
- **Classification:** `REUSE/GENERALIZE`
- Existing behavior is preserved and wrapped/generalized before new engines are introduced.

## AN — Current hardcodes / generalization
MCP/S1/repository literals and single-repository assumptions must move to TargetContext/configuration where applicable; preserve historical MCP behavior backward-compatibly.

## AO — Future implementation slot
Implement behind a GWC contract module + adapter to existing authority. Exact file placement must follow repository architecture discovered at implementation baseline, not be invented prematurely.

## AP — Test contract
happy path; boundary; NONE/AMBIGUOUS/UNVERIFIED/STALE/CONFLICT as applicable; replay/recovery; security; non-regression; exact binding tests.

## AQ — Property / invariant tests
- Unknown evidence never becomes allow/success.
- Explicit predecessor semantics are preserved.
- No hidden mutation.
- Same normalized input + same evidence ⇒ same semantic result for deterministic profiles.
- Mutation contracts never execute without a valid EffectPlan.

## AR — Acceptance criteria
- Input/output schemas are bounded.
- Owning authorities are explicit.
- Fail-closed paths are tested.
- Replay/recovery behavior is defined.
- No new parallel authority.
- Existing non-regression suite remains green.

## AS — Open questions
No blocking open decision beyond profile-specific implementation details; unresolved choices must stay explicit.

## AT — Architectural findings
- Existing implementation class: `REUSE/GENERALIZE`.
- Any discovered hardcode is treated as a generalization target, not silently removed.
- Any mismatch between CURRENT and TARGET is explicit.

## AU — Future Task Blueprint mapping
This contract is implemented by one or more governed implementation tasks from `GWC_IMPLEMENTATION_TASK_BLUEPRINTS_R1.md`; implementation dependencies follow the contract graph and authority dependencies rather than numeric GW order alone.

## AV — Execution semantics
`OBSERVE_AND_EVALUATE`

## AW — Effect Plan
None.

## AX — Routing table
Primary predecessor: GW-46. Primary successor: GW-48. Additional skip/reobserve/reconcile/recovery edges must be declared deterministically.

## AY — Recovery anchor
Read-only contracts: input/evidence snapshot bindings.
Mutation contracts: target reference + task/session + relevant branch/PR/SHA/revision/job ID.

## AZ — Reconstruction rule
On process restart, reconstruct from authoritative stores and observations; do not rely on previous assistant text or a GWC workflow-state database.

## BA — Autonomy behavior
AUTO_CONTINUE when exactly one legal route exists and required evidence is sufficient; WAIT_EXTERNAL/BLOCK_LOCAL/fail-closed otherwise.


---

# GW-48 — DEPLOY_TYPECHECK_BUILD

## A — Identity
- **Contract ID:** `GW-48`
- **Canonical name:** `DEPLOY_TYPECHECK_BUILD`
- **Family:** `G — Deployment`
- **Contract version:** `1` (conceptual baseline)
- **Profile(s):** `DEPLOY_CI_ATTESTATION`
- **Architectural status:** `PARTIAL/EXTEND`
- **Integration class:** `PARTIAL/EXTEND`

## B — Purpose
Formaliser la responsabilité `DEPLOY_TYPECHECK_BUILD` comme contrat borné, versionné et composable, sans dupliquer les autorités existantes.

**Non-responsibilities:** does not steal ownership from Task Queue, Session, Lock Service, Live State, GitRegistry, GitHub, deploy/runtime or other downstream contracts.

## C — Position in global system
- **Logical predecessor(s):** GW-47
- **Logical successor(s):** GW-49
- **Re-entry:** allowed when authoritative evidence shows this contract’s postcondition is not yet proven.
- **Skip:** only when an explicit deterministic `SKIPPABLE_IF` condition exists.
- **Reobserve/Reconcile:** first-class graph edges, never implicit retries.

## D — Chronological role
- **Transport chronology:** may differ from GW numeric order.
- **Functional chronology:** `GW-48` owns only `DEPLOY_TYPECHECK_BUILD` responsibility.
- **Runtime chronology:** resolved by Workflow Graph, not `stepId + 1`.

## E — Contract input
Sorties prouvées des prédécesseurs applicables, contexte cible borné, références d’autorité nécessaires à `DEPLOY_TYPECHECK_BUILD`.

Input fields must be bounded, provenance-aware and typed as hint/claim/evidence/fact; raw secret material is forbidden unless explicitly unavoidable and ephemeral.

## F — Information semantics
Every field is classified as one of:
`RAW_INPUT | HINT | CLAIM | OBSERVATION | EVIDENCE | DERIVED_FACT | AUTHORITATIVE_FACT | DECISION | ATTESTATION`.

No contract upgrades a `HINT` to an authoritative fact without the owning evidence.

## G — Authorities
Autorités existantes correspondant aux faits consommés; aucune nouvelle source de vérité créée par GWC.

**Forbidden authority pattern:** no arbitrary Markdown, prompt text, tool availability or remembered state may override the actual owning authority.

## H — Preconditions
- Structural input valid and bounded.
- Required authorities reachable or explicitly `UNAVAILABLE`.
- Required freshness/revision/SHA bindings available.
- No contradictory prerequisite state.
- For mutations: session/receipt/task/locks/governance requirements satisfied.

## I — Internal micro-state machine
validate bounded input → collect/validate required evidence → evaluate local invariants → derive domain status → derive routing disposition → emit bounded output.

## J — Transformation / decision algorithm
1. Parse/validate bounded input.
2. Determine required authority observations.
3. Refuse guesses for missing facts.
4. Apply contract-local invariants.
5. Produce domain status.
6. Produce engine disposition.
7. For mutations only, produce EffectPlan; never mutate from evaluation code directly.
8. Emit bounded output and evidence references.

## K — Determinism
- **Class:** `DEPLOY_CI_ATTESTATION` with execution semantics `OBSERVE_AND_EVALUATE`.
- Pure/read-only contracts are deterministic given identical normalized input and identical evidence snapshot.
- Observation-dependent contracts bind result to evidence freshness/revisions.

## L — Invariants
Global GWC invariants + no over-interpretation of predecessor output + bounded data + fail closed on missing evidence.

Plus all global GWC invariants.

## M — Action model
- **Allowed action kinds:** READ / DERIVE
- **Forbidden:** hidden mutation, authority bypass, stale evidence reuse, arbitrary shell fallback, unbounded projection.

## N — Current execution owner vs target owner
CURRENT: existing subsystem(s) listed in AM. TARGET: same owning authority behind a GWC adapter/contract wrapper.

## O — Capability / authorization model
For any mutation:
`callable ∧ authorized ∧ safeNow ∧ preconditionsSatisfied ∧ concurrencySatisfied = mayExecute`.
A present tool is never permission by itself.

## P — Lock model
No new lock unless EffectPlan declares a collision domain; consume existing Lock Service.

## Q — Concurrency model
Independent tasks may proceed in parallel when dependency/resource/lock scopes do not conflict.
Local blockers remain local.
Operational Memory process-local serialization is not treated as distributed locking.

## R — Output contract
- **Canonical output:** `BuildAttestation`
- Bounded, typed, provenance-aware.
- No secret/raw credential projection.
- Consumers must not over-interpret this output beyond its declared semantics.

## S — Terminal statuses
`SUCCESS | NONE | AMBIGUOUS | UNVERIFIED | BLOCKED | CONFLICT | STALE (subset applicable)`

## T — Terminality formula
Success requires all contract-owned postconditions to be proven from current required evidence.
Missing/stale/conflicting evidence maps to fail-closed statuses, never implicit success.

## U — Reason codes
Contract-specific reason codes must be stable, enumerable, bounded and machine-testable.
Every failure/blocking reason must identify whether it is recoverable by reobserve, reconcile, wait or explicit change.

## V — Fail-closed model
Missing/stale/conflicting required evidence never defaults to success or permission. UNKNOWN remains UNKNOWN.

## W — Evidence model
EvidenceEnvelope(s) from the owning authorities with freshness, provenance and relevant SHA/revision binding.

## X — Freshness / staleness
Evidence is bound to relevant `observedAt`, SHA, stateVersion and/or revisions.
A semantic state change invalidates dependent evidence when its contract declares such dependency.

## Y — Attestation model
EPHEMERAL_RESULT_ONLY by default; promote to bounded durable reference only where an existing authority requires durable proof.

## Z — Persistence model
No new GWC store. Persist only through the existing owning authority when the contract is a RECORD/MUTATE step.

## AA — Secret / privacy model
Never persist tokens, resume secrets, raw authorization headers, arbitrary transport IDs, `.env` material or unbounded prompt bodies.
Use digests/bounded projections where persistence is necessary.

## AB — Replay model
`READ_ONLY`

## AC — Recovery model
Recovery starts by observing the owning authority.
A mutation is replayed only when its replay class explicitly allows it and the recovery anchor proves it has not already happened.

## AD — Security / threat model
Prevent authority confusion, cross-session/repo/project leakage, stale evidence reuse, duplicate mutation, secret leakage and false attestation.

## AE — Observability
Emit bounded start/result/failure/reason-code observations where useful.
Observability is not authority.

## AF — Interface contract with predecessors
Consumes only the predecessor fields whose semantics are explicitly declared.
Revalidates any field whose freshness/ownership requires it.

## AG — Interface contract with successors
Exports `BuildAttestation` with explicit semantics; successor may not silently strengthen it.

## AH — Skip contract
No skip unless the graph contains a deterministic condition and proof source.
If skipped, the route and proof are observable.

## AI — Reobserve contract
Reobserve when required evidence is stale, unavailable-but-recoverable, or an external asynchronous condition may have progressed.

## AJ — Reconcile contract
Reconcile only when multiple authorities/state projections are inconsistent.
Reconcile is not the same as refreshing an observation.

## AK — Blocked behavior
Block only the affected Task/contract/resource scope unless an actual global invariant is violated.

## AL — Compensation / rollback
For pure/read-only contracts: not applicable.
For mutations: use existing rollback/compensation only where real; otherwise forward recovery by observation. Never pretend irreversible GitHub effects are rollbackable.

## AM — Existing system mapping
- **Current mapping:** CI typecheck/build + deploy docker build.
- **Classification:** `PARTIAL/EXTEND`
- Existing behavior is preserved and wrapped/generalized before new engines are introduced.

## AN — Current hardcodes / generalization
MCP/S1/repository literals and single-repository assumptions must move to TargetContext/configuration where applicable; preserve historical MCP behavior backward-compatibly.

## AO — Future implementation slot
Implement behind a GWC contract module + adapter to existing authority. Exact file placement must follow repository architecture discovered at implementation baseline, not be invented prematurely.

## AP — Test contract
happy path; boundary; NONE/AMBIGUOUS/UNVERIFIED/STALE/CONFLICT as applicable; replay/recovery; security; non-regression; exact binding tests.

## AQ — Property / invariant tests
- Unknown evidence never becomes allow/success.
- Explicit predecessor semantics are preserved.
- No hidden mutation.
- Same normalized input + same evidence ⇒ same semantic result for deterministic profiles.
- Mutation contracts never execute without a valid EffectPlan.

## AR — Acceptance criteria
- Input/output schemas are bounded.
- Owning authorities are explicit.
- Fail-closed paths are tested.
- Replay/recovery behavior is defined.
- No new parallel authority.
- Existing non-regression suite remains green.

## AS — Open questions
No blocking open decision beyond profile-specific implementation details; unresolved choices must stay explicit.

## AT — Architectural findings
- Existing implementation class: `PARTIAL/EXTEND`.
- Any discovered hardcode is treated as a generalization target, not silently removed.
- Any mismatch between CURRENT and TARGET is explicit.

## AU — Future Task Blueprint mapping
This contract is implemented by one or more governed implementation tasks from `GWC_IMPLEMENTATION_TASK_BLUEPRINTS_R1.md`; implementation dependencies follow the contract graph and authority dependencies rather than numeric GW order alone.

## AV — Execution semantics
`OBSERVE_AND_EVALUATE`

## AW — Effect Plan
None.

## AX — Routing table
Primary predecessor: GW-47. Primary successor: GW-49. Additional skip/reobserve/reconcile/recovery edges must be declared deterministically.

## AY — Recovery anchor
Read-only contracts: input/evidence snapshot bindings.
Mutation contracts: target reference + task/session + relevant branch/PR/SHA/revision/job ID.

## AZ — Reconstruction rule
On process restart, reconstruct from authoritative stores and observations; do not rely on previous assistant text or a GWC workflow-state database.

## BA — Autonomy behavior
AUTO_CONTINUE when exactly one legal route exists and required evidence is sufficient; WAIT_EXTERNAL/BLOCK_LOCAL/fail-closed otherwise.


---

# GW-49 — RUNTIME_REBUILD_OR_RESTART_ATTESTATION

## A — Identity
- **Contract ID:** `GW-49`
- **Canonical name:** `RUNTIME_REBUILD_OR_RESTART_ATTESTATION`
- **Family:** `G — Deployment`
- **Contract version:** `1` (conceptual baseline)
- **Profile(s):** `RUNTIME_ATTESTATION`
- **Architectural status:** `REUSE/GENERALIZE`
- **Integration class:** `REUSE/GENERALIZE`

## B — Purpose
Formaliser la responsabilité `RUNTIME_REBUILD_OR_RESTART_ATTESTATION` comme contrat borné, versionné et composable, sans dupliquer les autorités existantes.

**Non-responsibilities:** does not steal ownership from Task Queue, Session, Lock Service, Live State, GitRegistry, GitHub, deploy/runtime or other downstream contracts.

## C — Position in global system
- **Logical predecessor(s):** GW-48
- **Logical successor(s):** GW-50
- **Re-entry:** allowed when authoritative evidence shows this contract’s postcondition is not yet proven.
- **Skip:** only when an explicit deterministic `SKIPPABLE_IF` condition exists.
- **Reobserve/Reconcile:** first-class graph edges, never implicit retries.

## D — Chronological role
- **Transport chronology:** may differ from GW numeric order.
- **Functional chronology:** `GW-49` owns only `RUNTIME_REBUILD_OR_RESTART_ATTESTATION` responsibility.
- **Runtime chronology:** resolved by Workflow Graph, not `stepId + 1`.

## E — Contract input
Sorties prouvées des prédécesseurs applicables, contexte cible borné, références d’autorité nécessaires à `RUNTIME_REBUILD_OR_RESTART_ATTESTATION`.

Input fields must be bounded, provenance-aware and typed as hint/claim/evidence/fact; raw secret material is forbidden unless explicitly unavoidable and ephemeral.

## F — Information semantics
Every field is classified as one of:
`RAW_INPUT | HINT | CLAIM | OBSERVATION | EVIDENCE | DERIVED_FACT | AUTHORITATIVE_FACT | DECISION | ATTESTATION`.

No contract upgrades a `HINT` to an authoritative fact without the owning evidence.

## G — Authorities
Autorités existantes correspondant aux faits consommés; aucune nouvelle source de vérité créée par GWC.

**Forbidden authority pattern:** no arbitrary Markdown, prompt text, tool availability or remembered state may override the actual owning authority.

## H — Preconditions
- Structural input valid and bounded.
- Required authorities reachable or explicitly `UNAVAILABLE`.
- Required freshness/revision/SHA bindings available.
- No contradictory prerequisite state.
- For mutations: session/receipt/task/locks/governance requirements satisfied.

## I — Internal micro-state machine
validate bounded input → collect/validate required evidence → evaluate local invariants → derive domain status → derive routing disposition → emit bounded output.

## J — Transformation / decision algorithm
1. Parse/validate bounded input.
2. Determine required authority observations.
3. Refuse guesses for missing facts.
4. Apply contract-local invariants.
5. Produce domain status.
6. Produce engine disposition.
7. For mutations only, produce EffectPlan; never mutate from evaluation code directly.
8. Emit bounded output and evidence references.

## K — Determinism
- **Class:** `RUNTIME_ATTESTATION` with execution semantics `OBSERVE_AND_EVALUATE`.
- Pure/read-only contracts are deterministic given identical normalized input and identical evidence snapshot.
- Observation-dependent contracts bind result to evidence freshness/revisions.

## L — Invariants
Global GWC invariants + no over-interpretation of predecessor output + bounded data + fail closed on missing evidence.

Plus all global GWC invariants.

## M — Action model
- **Allowed action kinds:** READ / DERIVE
- **Forbidden:** hidden mutation, authority bypass, stale evidence reuse, arbitrary shell fallback, unbounded projection.

## N — Current execution owner vs target owner
CURRENT: existing subsystem(s) listed in AM. TARGET: same owning authority behind a GWC adapter/contract wrapper.

## O — Capability / authorization model
For any mutation:
`callable ∧ authorized ∧ safeNow ∧ preconditionsSatisfied ∧ concurrencySatisfied = mayExecute`.
A present tool is never permission by itself.

## P — Lock model
No new lock unless EffectPlan declares a collision domain; consume existing Lock Service.

## Q — Concurrency model
Independent tasks may proceed in parallel when dependency/resource/lock scopes do not conflict.
Local blockers remain local.
Operational Memory process-local serialization is not treated as distributed locking.

## R — Output contract
- **Canonical output:** `RuntimeStartAttestation`
- Bounded, typed, provenance-aware.
- No secret/raw credential projection.
- Consumers must not over-interpret this output beyond its declared semantics.

## S — Terminal statuses
`SUCCESS | NONE | AMBIGUOUS | UNVERIFIED | BLOCKED | CONFLICT | STALE (subset applicable)`

## T — Terminality formula
Success requires all contract-owned postconditions to be proven from current required evidence.
Missing/stale/conflicting evidence maps to fail-closed statuses, never implicit success.

## U — Reason codes
Contract-specific reason codes must be stable, enumerable, bounded and machine-testable.
Every failure/blocking reason must identify whether it is recoverable by reobserve, reconcile, wait or explicit change.

## V — Fail-closed model
Missing/stale/conflicting required evidence never defaults to success or permission. UNKNOWN remains UNKNOWN.

## W — Evidence model
EvidenceEnvelope(s) from the owning authorities with freshness, provenance and relevant SHA/revision binding.

## X — Freshness / staleness
Evidence is bound to relevant `observedAt`, SHA, stateVersion and/or revisions.
A semantic state change invalidates dependent evidence when its contract declares such dependency.

## Y — Attestation model
EPHEMERAL_RESULT_ONLY by default; promote to bounded durable reference only where an existing authority requires durable proof.

## Z — Persistence model
No new GWC store. Persist only through the existing owning authority when the contract is a RECORD/MUTATE step.

## AA — Secret / privacy model
Never persist tokens, resume secrets, raw authorization headers, arbitrary transport IDs, `.env` material or unbounded prompt bodies.
Use digests/bounded projections where persistence is necessary.

## AB — Replay model
`READ_ONLY`

## AC — Recovery model
Recovery starts by observing the owning authority.
A mutation is replayed only when its replay class explicitly allows it and the recovery anchor proves it has not already happened.

## AD — Security / threat model
Prevent authority confusion, cross-session/repo/project leakage, stale evidence reuse, duplicate mutation, secret leakage and false attestation.

## AE — Observability
Emit bounded start/result/failure/reason-code observations where useful.
Observability is not authority.

## AF — Interface contract with predecessors
Consumes only the predecessor fields whose semantics are explicitly declared.
Revalidates any field whose freshness/ownership requires it.

## AG — Interface contract with successors
Exports `RuntimeStartAttestation` with explicit semantics; successor may not silently strengthen it.

## AH — Skip contract
No skip unless the graph contains a deterministic condition and proof source.
If skipped, the route and proof are observable.

## AI — Reobserve contract
Reobserve when required evidence is stale, unavailable-but-recoverable, or an external asynchronous condition may have progressed.

## AJ — Reconcile contract
Reconcile only when multiple authorities/state projections are inconsistent.
Reconcile is not the same as refreshing an observation.

## AK — Blocked behavior
Block only the affected Task/contract/resource scope unless an actual global invariant is violated.

## AL — Compensation / rollback
For pure/read-only contracts: not applicable.
For mutations: use existing rollback/compensation only where real; otherwise forward recovery by observation. Never pretend irreversible GitHub effects are rollbackable.

## AM — Existing system mapping
- **Current mapping:** s1Deploy runtime start/rollback.
- **Classification:** `REUSE/GENERALIZE`
- Existing behavior is preserved and wrapped/generalized before new engines are introduced.

## AN — Current hardcodes / generalization
MCP/S1/repository literals and single-repository assumptions must move to TargetContext/configuration where applicable; preserve historical MCP behavior backward-compatibly.

## AO — Future implementation slot
Implement behind a GWC contract module + adapter to existing authority. Exact file placement must follow repository architecture discovered at implementation baseline, not be invented prematurely.

## AP — Test contract
happy path; boundary; NONE/AMBIGUOUS/UNVERIFIED/STALE/CONFLICT as applicable; replay/recovery; security; non-regression; exact binding tests.

## AQ — Property / invariant tests
- Unknown evidence never becomes allow/success.
- Explicit predecessor semantics are preserved.
- No hidden mutation.
- Same normalized input + same evidence ⇒ same semantic result for deterministic profiles.
- Mutation contracts never execute without a valid EffectPlan.

## AR — Acceptance criteria
- Input/output schemas are bounded.
- Owning authorities are explicit.
- Fail-closed paths are tested.
- Replay/recovery behavior is defined.
- No new parallel authority.
- Existing non-regression suite remains green.

## AS — Open questions
No blocking open decision beyond profile-specific implementation details; unresolved choices must stay explicit.

## AT — Architectural findings
- Existing implementation class: `REUSE/GENERALIZE`.
- Any discovered hardcode is treated as a generalization target, not silently removed.
- Any mismatch between CURRENT and TARGET is explicit.

## AU — Future Task Blueprint mapping
This contract is implemented by one or more governed implementation tasks from `GWC_IMPLEMENTATION_TASK_BLUEPRINTS_R1.md`; implementation dependencies follow the contract graph and authority dependencies rather than numeric GW order alone.

## AV — Execution semantics
`OBSERVE_AND_EVALUATE`

## AW — Effect Plan
None.

## AX — Routing table
Primary predecessor: GW-48. Primary successor: GW-50. Additional skip/reobserve/reconcile/recovery edges must be declared deterministically.

## AY — Recovery anchor
Read-only contracts: input/evidence snapshot bindings.
Mutation contracts: target reference + task/session + relevant branch/PR/SHA/revision/job ID.

## AZ — Reconstruction rule
On process restart, reconstruct from authoritative stores and observations; do not rely on previous assistant text or a GWC workflow-state database.

## BA — Autonomy behavior
AUTO_CONTINUE when exactly one legal route exists and required evidence is sufficient; WAIT_EXTERNAL/BLOCK_LOCAL/fail-closed otherwise.


---

# GW-50 — HEALTH_CHECK

## A — Identity
- **Contract ID:** `GW-50`
- **Canonical name:** `HEALTH_CHECK`
- **Family:** `G — Deployment`
- **Contract version:** `1` (conceptual baseline)
- **Profile(s):** `RUNTIME_OBSERVER`
- **Architectural status:** `REUSE/GENERALIZE`
- **Integration class:** `REUSE/GENERALIZE`

## B — Purpose
Formaliser la responsabilité `HEALTH_CHECK` comme contrat borné, versionné et composable, sans dupliquer les autorités existantes.

**Non-responsibilities:** does not steal ownership from Task Queue, Session, Lock Service, Live State, GitRegistry, GitHub, deploy/runtime or other downstream contracts.

## C — Position in global system
- **Logical predecessor(s):** GW-49
- **Logical successor(s):** GW-51
- **Re-entry:** allowed when authoritative evidence shows this contract’s postcondition is not yet proven.
- **Skip:** only when an explicit deterministic `SKIPPABLE_IF` condition exists.
- **Reobserve/Reconcile:** first-class graph edges, never implicit retries.

## D — Chronological role
- **Transport chronology:** may differ from GW numeric order.
- **Functional chronology:** `GW-50` owns only `HEALTH_CHECK` responsibility.
- **Runtime chronology:** resolved by Workflow Graph, not `stepId + 1`.

## E — Contract input
Sorties prouvées des prédécesseurs applicables, contexte cible borné, références d’autorité nécessaires à `HEALTH_CHECK`.

Input fields must be bounded, provenance-aware and typed as hint/claim/evidence/fact; raw secret material is forbidden unless explicitly unavoidable and ephemeral.

## F — Information semantics
Every field is classified as one of:
`RAW_INPUT | HINT | CLAIM | OBSERVATION | EVIDENCE | DERIVED_FACT | AUTHORITATIVE_FACT | DECISION | ATTESTATION`.

No contract upgrades a `HINT` to an authoritative fact without the owning evidence.

## G — Authorities
Autorités existantes correspondant aux faits consommés; aucune nouvelle source de vérité créée par GWC.

**Forbidden authority pattern:** no arbitrary Markdown, prompt text, tool availability or remembered state may override the actual owning authority.

## H — Preconditions
- Structural input valid and bounded.
- Required authorities reachable or explicitly `UNAVAILABLE`.
- Required freshness/revision/SHA bindings available.
- No contradictory prerequisite state.
- For mutations: session/receipt/task/locks/governance requirements satisfied.

## I — Internal micro-state machine
validate bounded input → collect/validate required evidence → evaluate local invariants → derive domain status → derive routing disposition → emit bounded output.

## J — Transformation / decision algorithm
1. Parse/validate bounded input.
2. Determine required authority observations.
3. Refuse guesses for missing facts.
4. Apply contract-local invariants.
5. Produce domain status.
6. Produce engine disposition.
7. For mutations only, produce EffectPlan; never mutate from evaluation code directly.
8. Emit bounded output and evidence references.

## K — Determinism
- **Class:** `RUNTIME_OBSERVER` with execution semantics `OBSERVE_AND_EVALUATE`.
- Pure/read-only contracts are deterministic given identical normalized input and identical evidence snapshot.
- Observation-dependent contracts bind result to evidence freshness/revisions.

## L — Invariants
Global GWC invariants + no over-interpretation of predecessor output + bounded data + fail closed on missing evidence.

Plus all global GWC invariants.

## M — Action model
- **Allowed action kinds:** READ / DERIVE
- **Forbidden:** hidden mutation, authority bypass, stale evidence reuse, arbitrary shell fallback, unbounded projection.

## N — Current execution owner vs target owner
CURRENT: existing subsystem(s) listed in AM. TARGET: same owning authority behind a GWC adapter/contract wrapper.

## O — Capability / authorization model
For any mutation:
`callable ∧ authorized ∧ safeNow ∧ preconditionsSatisfied ∧ concurrencySatisfied = mayExecute`.
A present tool is never permission by itself.

## P — Lock model
No new lock unless EffectPlan declares a collision domain; consume existing Lock Service.

## Q — Concurrency model
Independent tasks may proceed in parallel when dependency/resource/lock scopes do not conflict.
Local blockers remain local.
Operational Memory process-local serialization is not treated as distributed locking.

## R — Output contract
- **Canonical output:** `HealthProof`
- Bounded, typed, provenance-aware.
- No secret/raw credential projection.
- Consumers must not over-interpret this output beyond its declared semantics.

## S — Terminal statuses
`SUCCESS | NONE | AMBIGUOUS | UNVERIFIED | BLOCKED | CONFLICT | STALE (subset applicable)`

## T — Terminality formula
Success requires all contract-owned postconditions to be proven from current required evidence.
Missing/stale/conflicting evidence maps to fail-closed statuses, never implicit success.

## U — Reason codes
Contract-specific reason codes must be stable, enumerable, bounded and machine-testable.
Every failure/blocking reason must identify whether it is recoverable by reobserve, reconcile, wait or explicit change.

## V — Fail-closed model
Missing/stale/conflicting required evidence never defaults to success or permission. UNKNOWN remains UNKNOWN.

## W — Evidence model
EvidenceEnvelope(s) from the owning authorities with freshness, provenance and relevant SHA/revision binding.

## X — Freshness / staleness
Evidence is bound to relevant `observedAt`, SHA, stateVersion and/or revisions.
A semantic state change invalidates dependent evidence when its contract declares such dependency.

## Y — Attestation model
EPHEMERAL_RESULT_ONLY by default; promote to bounded durable reference only where an existing authority requires durable proof.

## Z — Persistence model
No new GWC store. Persist only through the existing owning authority when the contract is a RECORD/MUTATE step.

## AA — Secret / privacy model
Never persist tokens, resume secrets, raw authorization headers, arbitrary transport IDs, `.env` material or unbounded prompt bodies.
Use digests/bounded projections where persistence is necessary.

## AB — Replay model
`READ_ONLY`

## AC — Recovery model
Recovery starts by observing the owning authority.
A mutation is replayed only when its replay class explicitly allows it and the recovery anchor proves it has not already happened.

## AD — Security / threat model
Prevent authority confusion, cross-session/repo/project leakage, stale evidence reuse, duplicate mutation, secret leakage and false attestation.

## AE — Observability
Emit bounded start/result/failure/reason-code observations where useful.
Observability is not authority.

## AF — Interface contract with predecessors
Consumes only the predecessor fields whose semantics are explicitly declared.
Revalidates any field whose freshness/ownership requires it.

## AG — Interface contract with successors
Exports `HealthProof` with explicit semantics; successor may not silently strengthen it.

## AH — Skip contract
No skip unless the graph contains a deterministic condition and proof source.
If skipped, the route and proof are observable.

## AI — Reobserve contract
Reobserve when required evidence is stale, unavailable-but-recoverable, or an external asynchronous condition may have progressed.

## AJ — Reconcile contract
Reconcile only when multiple authorities/state projections are inconsistent.
Reconcile is not the same as refreshing an observation.

## AK — Blocked behavior
Block only the affected Task/contract/resource scope unless an actual global invariant is violated.

## AL — Compensation / rollback
For pure/read-only contracts: not applicable.
For mutations: use existing rollback/compensation only where real; otherwise forward recovery by observation. Never pretend irreversible GitHub effects are rollbackable.

## AM — Existing system mapping
- **Current mapping:** s1Deploy health/OAuth/MCP auth checks.
- **Classification:** `REUSE/GENERALIZE`
- Existing behavior is preserved and wrapped/generalized before new engines are introduced.

## AN — Current hardcodes / generalization
MCP/S1/repository literals and single-repository assumptions must move to TargetContext/configuration where applicable; preserve historical MCP behavior backward-compatibly.

## AO — Future implementation slot
Implement behind a GWC contract module + adapter to existing authority. Exact file placement must follow repository architecture discovered at implementation baseline, not be invented prematurely.

## AP — Test contract
happy path; boundary; NONE/AMBIGUOUS/UNVERIFIED/STALE/CONFLICT as applicable; replay/recovery; security; non-regression; exact binding tests.

## AQ — Property / invariant tests
- Unknown evidence never becomes allow/success.
- Explicit predecessor semantics are preserved.
- No hidden mutation.
- Same normalized input + same evidence ⇒ same semantic result for deterministic profiles.
- Mutation contracts never execute without a valid EffectPlan.

## AR — Acceptance criteria
- Input/output schemas are bounded.
- Owning authorities are explicit.
- Fail-closed paths are tested.
- Replay/recovery behavior is defined.
- No new parallel authority.
- Existing non-regression suite remains green.

## AS — Open questions
No blocking open decision beyond profile-specific implementation details; unresolved choices must stay explicit.

## AT — Architectural findings
- Existing implementation class: `REUSE/GENERALIZE`.
- Any discovered hardcode is treated as a generalization target, not silently removed.
- Any mismatch between CURRENT and TARGET is explicit.

## AU — Future Task Blueprint mapping
This contract is implemented by one or more governed implementation tasks from `GWC_IMPLEMENTATION_TASK_BLUEPRINTS_R1.md`; implementation dependencies follow the contract graph and authority dependencies rather than numeric GW order alone.

## AV — Execution semantics
`OBSERVE_AND_EVALUATE`

## AW — Effect Plan
None.

## AX — Routing table
Primary predecessor: GW-49. Primary successor: GW-51. Additional skip/reobserve/reconcile/recovery edges must be declared deterministically.

## AY — Recovery anchor
Read-only contracts: input/evidence snapshot bindings.
Mutation contracts: target reference + task/session + relevant branch/PR/SHA/revision/job ID.

## AZ — Reconstruction rule
On process restart, reconstruct from authoritative stores and observations; do not rely on previous assistant text or a GWC workflow-state database.

## BA — Autonomy behavior
AUTO_CONTINUE when exactly one legal route exists and required evidence is sufficient; WAIT_EXTERNAL/BLOCK_LOCAL/fail-closed otherwise.


---

# GW-51 — RUNTIME_IMAGE_ATTESTATION

## A — Identity
- **Contract ID:** `GW-51`
- **Canonical name:** `RUNTIME_IMAGE_ATTESTATION`
- **Family:** `G — Deployment`
- **Contract version:** `1` (conceptual baseline)
- **Profile(s):** `RUNTIME_ATTESTATION`
- **Architectural status:** `REUSE/GENERALIZE`
- **Integration class:** `REUSE/GENERALIZE`

## B — Purpose
Formaliser la responsabilité `RUNTIME_IMAGE_ATTESTATION` comme contrat borné, versionné et composable, sans dupliquer les autorités existantes.

**Non-responsibilities:** does not steal ownership from Task Queue, Session, Lock Service, Live State, GitRegistry, GitHub, deploy/runtime or other downstream contracts.

## C — Position in global system
- **Logical predecessor(s):** GW-50
- **Logical successor(s):** GW-52
- **Re-entry:** allowed when authoritative evidence shows this contract’s postcondition is not yet proven.
- **Skip:** only when an explicit deterministic `SKIPPABLE_IF` condition exists.
- **Reobserve/Reconcile:** first-class graph edges, never implicit retries.

## D — Chronological role
- **Transport chronology:** may differ from GW numeric order.
- **Functional chronology:** `GW-51` owns only `RUNTIME_IMAGE_ATTESTATION` responsibility.
- **Runtime chronology:** resolved by Workflow Graph, not `stepId + 1`.

## E — Contract input
Sorties prouvées des prédécesseurs applicables, contexte cible borné, références d’autorité nécessaires à `RUNTIME_IMAGE_ATTESTATION`.

Input fields must be bounded, provenance-aware and typed as hint/claim/evidence/fact; raw secret material is forbidden unless explicitly unavoidable and ephemeral.

## F — Information semantics
Every field is classified as one of:
`RAW_INPUT | HINT | CLAIM | OBSERVATION | EVIDENCE | DERIVED_FACT | AUTHORITATIVE_FACT | DECISION | ATTESTATION`.

No contract upgrades a `HINT` to an authoritative fact without the owning evidence.

## G — Authorities
Autorités existantes correspondant aux faits consommés; aucune nouvelle source de vérité créée par GWC.

**Forbidden authority pattern:** no arbitrary Markdown, prompt text, tool availability or remembered state may override the actual owning authority.

## H — Preconditions
- Structural input valid and bounded.
- Required authorities reachable or explicitly `UNAVAILABLE`.
- Required freshness/revision/SHA bindings available.
- No contradictory prerequisite state.
- For mutations: session/receipt/task/locks/governance requirements satisfied.

## I — Internal micro-state machine
validate bounded input → collect/validate required evidence → evaluate local invariants → derive domain status → derive routing disposition → emit bounded output.

## J — Transformation / decision algorithm
1. Parse/validate bounded input.
2. Determine required authority observations.
3. Refuse guesses for missing facts.
4. Apply contract-local invariants.
5. Produce domain status.
6. Produce engine disposition.
7. For mutations only, produce EffectPlan; never mutate from evaluation code directly.
8. Emit bounded output and evidence references.

## K — Determinism
- **Class:** `RUNTIME_ATTESTATION` with execution semantics `OBSERVE_AND_EVALUATE`.
- Pure/read-only contracts are deterministic given identical normalized input and identical evidence snapshot.
- Observation-dependent contracts bind result to evidence freshness/revisions.

## L — Invariants
Global GWC invariants + no over-interpretation of predecessor output + bounded data + fail closed on missing evidence.

Plus all global GWC invariants.

## M — Action model
- **Allowed action kinds:** READ / DERIVE
- **Forbidden:** hidden mutation, authority bypass, stale evidence reuse, arbitrary shell fallback, unbounded projection.

## N — Current execution owner vs target owner
CURRENT: existing subsystem(s) listed in AM. TARGET: same owning authority behind a GWC adapter/contract wrapper.

## O — Capability / authorization model
For any mutation:
`callable ∧ authorized ∧ safeNow ∧ preconditionsSatisfied ∧ concurrencySatisfied = mayExecute`.
A present tool is never permission by itself.

## P — Lock model
No new lock unless EffectPlan declares a collision domain; consume existing Lock Service.

## Q — Concurrency model
Independent tasks may proceed in parallel when dependency/resource/lock scopes do not conflict.
Local blockers remain local.
Operational Memory process-local serialization is not treated as distributed locking.

## R — Output contract
- **Canonical output:** `RuntimeImageProof`
- Bounded, typed, provenance-aware.
- No secret/raw credential projection.
- Consumers must not over-interpret this output beyond its declared semantics.

## S — Terminal statuses
`SUCCESS | NONE | AMBIGUOUS | UNVERIFIED | BLOCKED | CONFLICT | STALE (subset applicable)`

## T — Terminality formula
Success requires all contract-owned postconditions to be proven from current required evidence.
Missing/stale/conflicting evidence maps to fail-closed statuses, never implicit success.

## U — Reason codes
Contract-specific reason codes must be stable, enumerable, bounded and machine-testable.
Every failure/blocking reason must identify whether it is recoverable by reobserve, reconcile, wait or explicit change.

## V — Fail-closed model
Missing/stale/conflicting required evidence never defaults to success or permission. UNKNOWN remains UNKNOWN.

## W — Evidence model
EvidenceEnvelope(s) from the owning authorities with freshness, provenance and relevant SHA/revision binding.

## X — Freshness / staleness
Evidence is bound to relevant `observedAt`, SHA, stateVersion and/or revisions.
A semantic state change invalidates dependent evidence when its contract declares such dependency.

## Y — Attestation model
EPHEMERAL_RESULT_ONLY by default; promote to bounded durable reference only where an existing authority requires durable proof.

## Z — Persistence model
No new GWC store. Persist only through the existing owning authority when the contract is a RECORD/MUTATE step.

## AA — Secret / privacy model
Never persist tokens, resume secrets, raw authorization headers, arbitrary transport IDs, `.env` material or unbounded prompt bodies.
Use digests/bounded projections where persistence is necessary.

## AB — Replay model
`READ_ONLY`

## AC — Recovery model
Recovery starts by observing the owning authority.
A mutation is replayed only when its replay class explicitly allows it and the recovery anchor proves it has not already happened.

## AD — Security / threat model
Prevent authority confusion, cross-session/repo/project leakage, stale evidence reuse, duplicate mutation, secret leakage and false attestation.

## AE — Observability
Emit bounded start/result/failure/reason-code observations where useful.
Observability is not authority.

## AF — Interface contract with predecessors
Consumes only the predecessor fields whose semantics are explicitly declared.
Revalidates any field whose freshness/ownership requires it.

## AG — Interface contract with successors
Exports `RuntimeImageProof` with explicit semantics; successor may not silently strengthen it.

## AH — Skip contract
No skip unless the graph contains a deterministic condition and proof source.
If skipped, the route and proof are observable.

## AI — Reobserve contract
Reobserve when required evidence is stale, unavailable-but-recoverable, or an external asynchronous condition may have progressed.

## AJ — Reconcile contract
Reconcile only when multiple authorities/state projections are inconsistent.
Reconcile is not the same as refreshing an observation.

## AK — Blocked behavior
Block only the affected Task/contract/resource scope unless an actual global invariant is violated.

## AL — Compensation / rollback
For pure/read-only contracts: not applicable.
For mutations: use existing rollback/compensation only where real; otherwise forward recovery by observation. Never pretend irreversible GitHub effects are rollbackable.

## AM — Existing system mapping
- **Current mapping:** src/tools/runtimeAttestation.ts.
- **Classification:** `REUSE/GENERALIZE`
- Existing behavior is preserved and wrapped/generalized before new engines are introduced.

## AN — Current hardcodes / generalization
MCP/S1/repository literals and single-repository assumptions must move to TargetContext/configuration where applicable; preserve historical MCP behavior backward-compatibly.

## AO — Future implementation slot
Implement behind a GWC contract module + adapter to existing authority. Exact file placement must follow repository architecture discovered at implementation baseline, not be invented prematurely.

## AP — Test contract
happy path; boundary; NONE/AMBIGUOUS/UNVERIFIED/STALE/CONFLICT as applicable; replay/recovery; security; non-regression; exact binding tests.

## AQ — Property / invariant tests
- Unknown evidence never becomes allow/success.
- Explicit predecessor semantics are preserved.
- No hidden mutation.
- Same normalized input + same evidence ⇒ same semantic result for deterministic profiles.
- Mutation contracts never execute without a valid EffectPlan.

## AR — Acceptance criteria
- Input/output schemas are bounded.
- Owning authorities are explicit.
- Fail-closed paths are tested.
- Replay/recovery behavior is defined.
- No new parallel authority.
- Existing non-regression suite remains green.

## AS — Open questions
No blocking open decision beyond profile-specific implementation details; unresolved choices must stay explicit.

## AT — Architectural findings
- Existing implementation class: `REUSE/GENERALIZE`.
- Any discovered hardcode is treated as a generalization target, not silently removed.
- Any mismatch between CURRENT and TARGET is explicit.

## AU — Future Task Blueprint mapping
This contract is implemented by one or more governed implementation tasks from `GWC_IMPLEMENTATION_TASK_BLUEPRINTS_R1.md`; implementation dependencies follow the contract graph and authority dependencies rather than numeric GW order alone.

## AV — Execution semantics
`OBSERVE_AND_EVALUATE`

## AW — Effect Plan
None.

## AX — Routing table
Primary predecessor: GW-50. Primary successor: GW-52. Additional skip/reobserve/reconcile/recovery edges must be declared deterministically.

## AY — Recovery anchor
Read-only contracts: input/evidence snapshot bindings.
Mutation contracts: target reference + task/session + relevant branch/PR/SHA/revision/job ID.

## AZ — Reconstruction rule
On process restart, reconstruct from authoritative stores and observations; do not rely on previous assistant text or a GWC workflow-state database.

## BA — Autonomy behavior
AUTO_CONTINUE when exactly one legal route exists and required evidence is sufficient; WAIT_EXTERNAL/BLOCK_LOCAL/fail-closed otherwise.


---

# GW-52 — EXACT_SHA_DEPLOYMENT_PROOF

## A — Identity
- **Contract ID:** `GW-52`
- **Canonical name:** `EXACT_SHA_DEPLOYMENT_PROOF`
- **Family:** `G — Deployment`
- **Contract version:** `1` (conceptual baseline)
- **Profile(s):** `CROSS_AUTHORITY_DECISION`
- **Architectural status:** `REUSE/GENERALIZE/EXTEND`
- **Integration class:** `REUSE/GENERALIZE/EXTEND`

## B — Purpose
Prouver que le SHA de déploiement attendu correspond aux faits GitHub/S1/runtime exigés, sans dépendre circulairement de Task.runtimeRevision.

**Non-responsibilities:** does not steal ownership from Task Queue, Session, Lock Service, Live State, GitRegistry, GitHub, deploy/runtime or other downstream contracts.

## C — Position in global system
- **Logical predecessor(s):** GW-47..GW-51
- **Logical successor(s):** GW-53
- **Re-entry:** allowed when authoritative evidence shows this contract’s postcondition is not yet proven.
- **Skip:** only when an explicit deterministic `SKIPPABLE_IF` condition exists.
- **Reobserve/Reconcile:** first-class graph edges, never implicit retries.

## D — Chronological role
- **Transport chronology:** may differ from GW numeric order.
- **Functional chronology:** `GW-52` owns only `EXACT_SHA_DEPLOYMENT_PROOF` responsibility.
- **Runtime chronology:** resolved by Workflow Graph, not `stepId + 1`.

## E — Contract input
expectedDeploymentSha + deployment job evidence + S1/runtime observations.

Input fields must be bounded, provenance-aware and typed as hint/claim/evidence/fact; raw secret material is forbidden unless explicitly unavoidable and ephemeral.

## F — Information semantics
Every field is classified as one of:
`RAW_INPUT | HINT | CLAIM | OBSERVATION | EVIDENCE | DERIVED_FACT | AUTHORITATIVE_FACT | DECISION | ATTESTATION`.

No contract upgrades a `HINT` to an authoritative fact without the owning evidence.

## G — Authorities
GitHub, deploy subsystem, S1 checkout observation, runtime attestation.

**Forbidden authority pattern:** no arbitrary Markdown, prompt text, tool availability or remembered state may override the actual owning authority.

## H — Preconditions
- Structural input valid and bounded.
- Required authorities reachable or explicitly `UNAVAILABLE`.
- Required freshness/revision/SHA bindings available.
- No contradictory prerequisite state.
- For mutations: session/receipt/task/locks/governance requirements satisfied.

## I — Internal micro-state machine
validate expected SHA anchor → collect deploy job → collect S1 → collect runtime → freshness check → equality matrix → health/postconditions → proof.

## J — Transformation / decision algorithm
1. Parse/validate bounded input.
2. Determine required authority observations.
3. Refuse guesses for missing facts.
4. Apply contract-local invariants.
5. Produce domain status.
6. Produce engine disposition.
7. For mutations only, produce EffectPlan; never mutate from evaluation code directly.
8. Emit bounded output and evidence references.

## K — Determinism
- **Class:** `CROSS_AUTHORITY_DECISION` with execution semantics `EVALUATE_ONLY`.
- Pure/read-only contracts are deterministic given identical normalized input and identical evidence snapshot.
- Observation-dependent contracts bind result to evidence freshness/revisions.

## L — Invariants
task.runtimeRevision is not primary input; exact-SHA equality across required authorities; freshness coherent.

Plus all global GWC invariants.

## M — Action model
- **Allowed action kinds:** READ / DERIVE
- **Forbidden:** hidden mutation, authority bypass, stale evidence reuse, arbitrary shell fallback, unbounded projection.

## N — Current execution owner vs target owner
CURRENT: existing subsystem(s) listed in AM. TARGET: same owning authority behind a GWC adapter/contract wrapper.

## O — Capability / authorization model
For any mutation:
`callable ∧ authorized ∧ safeNow ∧ preconditionsSatisfied ∧ concurrencySatisfied = mayExecute`.
A present tool is never permission by itself.

## P — Lock model
Aucun.

## Q — Concurrency model
Independent tasks may proceed in parallel when dependency/resource/lock scopes do not conflict.
Local blockers remain local.
Operational Memory process-local serialization is not treated as distributed locking.

## R — Output contract
- **Canonical output:** `ExactDeploymentProof`
- Bounded, typed, provenance-aware.
- No secret/raw credential projection.
- Consumers must not over-interpret this output beyond its declared semantics.

## S — Terminal statuses
`PROVEN | STALE | UNVERIFIED | CONFLICT`

## T — Terminality formula
Success requires all contract-owned postconditions to be proven from current required evidence.
Missing/stale/conflicting evidence maps to fail-closed statuses, never implicit success.

## U — Reason codes
Contract-specific reason codes must be stable, enumerable, bounded and machine-testable.
Every failure/blocking reason must identify whether it is recoverable by reobserve, reconcile, wait or explicit change.

## V — Fail-closed model
Missing/stale/conflicting required evidence never defaults to success or permission. UNKNOWN remains UNKNOWN.

## W — Evidence model
requestedSha, fetchedSha/S1 HEAD, origin/main if required, OCI revision, health, deploy job result.

## X — Freshness / staleness
Evidence is bound to relevant `observedAt`, SHA, stateVersion and/or revisions.
A semantic state change invalidates dependent evidence when its contract declares such dependency.

## Y — Attestation model
EPHEMERAL_RESULT_ONLY by default; promote to bounded durable reference only where an existing authority requires durable proof.

## Z — Persistence model
No new GWC store. Persist only through the existing owning authority when the contract is a RECORD/MUTATE step.

## AA — Secret / privacy model
Never persist tokens, resume secrets, raw authorization headers, arbitrary transport IDs, `.env` material or unbounded prompt bodies.
Use digests/bounded projections where persistence is necessary.

## AB — Replay model
`READ_ONLY`

## AC — Recovery model
Recovery starts by observing the owning authority.
A mutation is replayed only when its replay class explicitly allows it and the recovery anchor proves it has not already happened.

## AD — Security / threat model
Prevent authority confusion, cross-session/repo/project leakage, stale evidence reuse, duplicate mutation, secret leakage and false attestation.

## AE — Observability
Emit bounded start/result/failure/reason-code observations where useful.
Observability is not authority.

## AF — Interface contract with predecessors
Consumes only the predecessor fields whose semantics are explicitly declared.
Revalidates any field whose freshness/ownership requires it.

## AG — Interface contract with successors
Exports `ExactDeploymentProof` with explicit semantics; successor may not silently strengthen it.

## AH — Skip contract
No skip unless the graph contains a deterministic condition and proof source.
If skipped, the route and proof are observable.

## AI — Reobserve contract
Reobserve when required evidence is stale, unavailable-but-recoverable, or an external asynchronous condition may have progressed.

## AJ — Reconcile contract
Reconcile only when multiple authorities/state projections are inconsistent.
Reconcile is not the same as refreshing an observation.

## AK — Blocked behavior
Block only the affected Task/contract/resource scope unless an actual global invariant is violated.

## AL — Compensation / rollback
For pure/read-only contracts: not applicable.
For mutations: use existing rollback/compensation only where real; otherwise forward recovery by observation. Never pretend irreversible GitHub effects are rollbackable.

## AM — Existing system mapping
- **Current mapping:** Deploy attestation + Live State cross-authority equality.
- **Classification:** `REUSE/GENERALIZE/EXTEND`
- Existing behavior is preserved and wrapped/generalized before new engines are introduced.

## AN — Current hardcodes / generalization
MCP/S1/repository literals and single-repository assumptions must move to TargetContext/configuration where applicable; preserve historical MCP behavior backward-compatibly.

## AO — Future implementation slot
Implement behind a GWC contract module + adapter to existing authority. Exact file placement must follow repository architecture discovered at implementation baseline, not be invented prematurely.

## AP — Test contract
happy path; boundary; NONE/AMBIGUOUS/UNVERIFIED/STALE/CONFLICT as applicable; replay/recovery; security; non-regression; exact binding tests.

## AQ — Property / invariant tests
- Unknown evidence never becomes allow/success.
- Explicit predecessor semantics are preserved.
- No hidden mutation.
- Same normalized input + same evidence ⇒ same semantic result for deterministic profiles.
- Mutation contracts never execute without a valid EffectPlan.

## AR — Acceptance criteria
- Input/output schemas are bounded.
- Owning authorities are explicit.
- Fail-closed paths are tested.
- Replay/recovery behavior is defined.
- No new parallel authority.
- Existing non-regression suite remains green.

## AS — Open questions
OD-12 cross-authority freshness window.

## AT — Architectural findings
- Existing implementation class: `REUSE/GENERALIZE/EXTEND`.
- Any discovered hardcode is treated as a generalization target, not silently removed.
- Any mismatch between CURRENT and TARGET is explicit.

## AU — Future Task Blueprint mapping
This contract is implemented by one or more governed implementation tasks from `GWC_IMPLEMENTATION_TASK_BLUEPRINTS_R1.md`; implementation dependencies follow the contract graph and authority dependencies rather than numeric GW order alone.

## AV — Execution semantics
`EVALUATE_ONLY`

## AW — Effect Plan
None.

## AX — Routing table
Primary predecessor: GW-47..GW-51. Primary successor: GW-53. Additional skip/reobserve/reconcile/recovery edges must be declared deterministically.

## AY — Recovery anchor
Read-only contracts: input/evidence snapshot bindings.
Mutation contracts: target reference + task/session + relevant branch/PR/SHA/revision/job ID.

## AZ — Reconstruction rule
On process restart, reconstruct from authoritative stores and observations; do not rely on previous assistant text or a GWC workflow-state database.

## BA — Autonomy behavior
AUTO_CONTINUE when exactly one legal route exists and required evidence is sufficient; WAIT_EXTERNAL/BLOCK_LOCAL/fail-closed otherwise.


---

# GW-53 — LIVE_STATE_UPDATE

## A — Identity
- **Contract ID:** `GW-53`
- **Canonical name:** `LIVE_STATE_UPDATE`
- **Family:** `G — Deployment`
- **Contract version:** `1` (conceptual baseline)
- **Profile(s):** `RECONCILER`
- **Architectural status:** `REUSE/GENERALIZE`
- **Integration class:** `REUSE/GENERALIZE`

## B — Purpose
Formaliser la responsabilité `LIVE_STATE_UPDATE` comme contrat borné, versionné et composable, sans dupliquer les autorités existantes.

**Non-responsibilities:** does not steal ownership from Task Queue, Session, Lock Service, Live State, GitRegistry, GitHub, deploy/runtime or other downstream contracts.

## C — Position in global system
- **Logical predecessor(s):** GW-52
- **Logical successor(s):** GW-54
- **Re-entry:** allowed when authoritative evidence shows this contract’s postcondition is not yet proven.
- **Skip:** only when an explicit deterministic `SKIPPABLE_IF` condition exists.
- **Reobserve/Reconcile:** first-class graph edges, never implicit retries.

## D — Chronological role
- **Transport chronology:** may differ from GW numeric order.
- **Functional chronology:** `GW-53` owns only `LIVE_STATE_UPDATE` responsibility.
- **Runtime chronology:** resolved by Workflow Graph, not `stepId + 1`.

## E — Contract input
Sorties prouvées des prédécesseurs applicables, contexte cible borné, références d’autorité nécessaires à `LIVE_STATE_UPDATE`.

Input fields must be bounded, provenance-aware and typed as hint/claim/evidence/fact; raw secret material is forbidden unless explicitly unavoidable and ephemeral.

## F — Information semantics
Every field is classified as one of:
`RAW_INPUT | HINT | CLAIM | OBSERVATION | EVIDENCE | DERIVED_FACT | AUTHORITATIVE_FACT | DECISION | ATTESTATION`.

No contract upgrades a `HINT` to an authoritative fact without the owning evidence.

## G — Authorities
Autorités existantes correspondant aux faits consommés; aucune nouvelle source de vérité créée par GWC.

**Forbidden authority pattern:** no arbitrary Markdown, prompt text, tool availability or remembered state may override the actual owning authority.

## H — Preconditions
- Structural input valid and bounded.
- Required authorities reachable or explicitly `UNAVAILABLE`.
- Required freshness/revision/SHA bindings available.
- No contradictory prerequisite state.
- For mutations: session/receipt/task/locks/governance requirements satisfied.

## I — Internal micro-state machine
validate bounded input → collect/validate required evidence → evaluate local invariants → derive domain status → derive routing disposition → emit bounded output.

## J — Transformation / decision algorithm
1. Parse/validate bounded input.
2. Determine required authority observations.
3. Refuse guesses for missing facts.
4. Apply contract-local invariants.
5. Produce domain status.
6. Produce engine disposition.
7. For mutations only, produce EffectPlan; never mutate from evaluation code directly.
8. Emit bounded output and evidence references.

## K — Determinism
- **Class:** `RECONCILER` with execution semantics `OBSERVE_AND_EVALUATE`.
- Pure/read-only contracts are deterministic given identical normalized input and identical evidence snapshot.
- Observation-dependent contracts bind result to evidence freshness/revisions.

## L — Invariants
Global GWC invariants + no over-interpretation of predecessor output + bounded data + fail closed on missing evidence.

Plus all global GWC invariants.

## M — Action model
- **Allowed action kinds:** READ / DERIVE
- **Forbidden:** hidden mutation, authority bypass, stale evidence reuse, arbitrary shell fallback, unbounded projection.

## N — Current execution owner vs target owner
CURRENT: existing subsystem(s) listed in AM. TARGET: same owning authority behind a GWC adapter/contract wrapper.

## O — Capability / authorization model
For any mutation:
`callable ∧ authorized ∧ safeNow ∧ preconditionsSatisfied ∧ concurrencySatisfied = mayExecute`.
A present tool is never permission by itself.

## P — Lock model
No new lock unless EffectPlan declares a collision domain; consume existing Lock Service.

## Q — Concurrency model
Independent tasks may proceed in parallel when dependency/resource/lock scopes do not conflict.
Local blockers remain local.
Operational Memory process-local serialization is not treated as distributed locking.

## R — Output contract
- **Canonical output:** `ReconciledLiveState`
- Bounded, typed, provenance-aware.
- No secret/raw credential projection.
- Consumers must not over-interpret this output beyond its declared semantics.

## S — Terminal statuses
`SUCCESS | NONE | AMBIGUOUS | UNVERIFIED | BLOCKED | CONFLICT | STALE (subset applicable)`

## T — Terminality formula
Success requires all contract-owned postconditions to be proven from current required evidence.
Missing/stale/conflicting evidence maps to fail-closed statuses, never implicit success.

## U — Reason codes
Contract-specific reason codes must be stable, enumerable, bounded and machine-testable.
Every failure/blocking reason must identify whether it is recoverable by reobserve, reconcile, wait or explicit change.

## V — Fail-closed model
Missing/stale/conflicting required evidence never defaults to success or permission. UNKNOWN remains UNKNOWN.

## W — Evidence model
EvidenceEnvelope(s) from the owning authorities with freshness, provenance and relevant SHA/revision binding.

## X — Freshness / staleness
Evidence is bound to relevant `observedAt`, SHA, stateVersion and/or revisions.
A semantic state change invalidates dependent evidence when its contract declares such dependency.

## Y — Attestation model
EPHEMERAL_RESULT_ONLY by default; promote to bounded durable reference only where an existing authority requires durable proof.

## Z — Persistence model
No new GWC store. Persist only through the existing owning authority when the contract is a RECORD/MUTATE step.

## AA — Secret / privacy model
Never persist tokens, resume secrets, raw authorization headers, arbitrary transport IDs, `.env` material or unbounded prompt bodies.
Use digests/bounded projections where persistence is necessary.

## AB — Replay model
`READ_ONLY`

## AC — Recovery model
Recovery starts by observing the owning authority.
A mutation is replayed only when its replay class explicitly allows it and the recovery anchor proves it has not already happened.

## AD — Security / threat model
Prevent authority confusion, cross-session/repo/project leakage, stale evidence reuse, duplicate mutation, secret leakage and false attestation.

## AE — Observability
Emit bounded start/result/failure/reason-code observations where useful.
Observability is not authority.

## AF — Interface contract with predecessors
Consumes only the predecessor fields whose semantics are explicitly declared.
Revalidates any field whose freshness/ownership requires it.

## AG — Interface contract with successors
Exports `ReconciledLiveState` with explicit semantics; successor may not silently strengthen it.

## AH — Skip contract
No skip unless the graph contains a deterministic condition and proof source.
If skipped, the route and proof are observable.

## AI — Reobserve contract
Reobserve when required evidence is stale, unavailable-but-recoverable, or an external asynchronous condition may have progressed.

## AJ — Reconcile contract
Reconcile only when multiple authorities/state projections are inconsistent.
Reconcile is not the same as refreshing an observation.

## AK — Blocked behavior
Block only the affected Task/contract/resource scope unless an actual global invariant is violated.

## AL — Compensation / rollback
For pure/read-only contracts: not applicable.
For mutations: use existing rollback/compensation only where real; otherwise forward recovery by observation. Never pretend irreversible GitHub effects are rollbackable.

## AM — Existing system mapping
- **Current mapping:** Live State reconcileNow/stateVersion.
- **Classification:** `REUSE/GENERALIZE`
- Existing behavior is preserved and wrapped/generalized before new engines are introduced.

## AN — Current hardcodes / generalization
MCP/S1/repository literals and single-repository assumptions must move to TargetContext/configuration where applicable; preserve historical MCP behavior backward-compatibly.

## AO — Future implementation slot
Implement behind a GWC contract module + adapter to existing authority. Exact file placement must follow repository architecture discovered at implementation baseline, not be invented prematurely.

## AP — Test contract
happy path; boundary; NONE/AMBIGUOUS/UNVERIFIED/STALE/CONFLICT as applicable; replay/recovery; security; non-regression; exact binding tests.

## AQ — Property / invariant tests
- Unknown evidence never becomes allow/success.
- Explicit predecessor semantics are preserved.
- No hidden mutation.
- Same normalized input + same evidence ⇒ same semantic result for deterministic profiles.
- Mutation contracts never execute without a valid EffectPlan.

## AR — Acceptance criteria
- Input/output schemas are bounded.
- Owning authorities are explicit.
- Fail-closed paths are tested.
- Replay/recovery behavior is defined.
- No new parallel authority.
- Existing non-regression suite remains green.

## AS — Open questions
No blocking open decision beyond profile-specific implementation details; unresolved choices must stay explicit.

## AT — Architectural findings
- Existing implementation class: `REUSE/GENERALIZE`.
- Any discovered hardcode is treated as a generalization target, not silently removed.
- Any mismatch between CURRENT and TARGET is explicit.

## AU — Future Task Blueprint mapping
This contract is implemented by one or more governed implementation tasks from `GWC_IMPLEMENTATION_TASK_BLUEPRINTS_R1.md`; implementation dependencies follow the contract graph and authority dependencies rather than numeric GW order alone.

## AV — Execution semantics
`OBSERVE_AND_EVALUATE`

## AW — Effect Plan
None.

## AX — Routing table
Primary predecessor: GW-52. Primary successor: GW-54. Additional skip/reobserve/reconcile/recovery edges must be declared deterministically.

## AY — Recovery anchor
Read-only contracts: input/evidence snapshot bindings.
Mutation contracts: target reference + task/session + relevant branch/PR/SHA/revision/job ID.

## AZ — Reconstruction rule
On process restart, reconstruct from authoritative stores and observations; do not rely on previous assistant text or a GWC workflow-state database.

## BA — Autonomy behavior
AUTO_CONTINUE when exactly one legal route exists and required evidence is sufficient; WAIT_EXTERNAL/BLOCK_LOCAL/fail-closed otherwise.


---

# GW-54 — STALE_RECEIPT_DETECTION

## A — Identity
- **Contract ID:** `GW-54`
- **Canonical name:** `STALE_RECEIPT_DETECTION`
- **Family:** `G — Deployment`
- **Contract version:** `1` (conceptual baseline)
- **Profile(s):** `DECISION`
- **Architectural status:** `REUSE`
- **Integration class:** `REUSE`

## B — Purpose
Formaliser la responsabilité `STALE_RECEIPT_DETECTION` comme contrat borné, versionné et composable, sans dupliquer les autorités existantes.

**Non-responsibilities:** does not steal ownership from Task Queue, Session, Lock Service, Live State, GitRegistry, GitHub, deploy/runtime or other downstream contracts.

## C — Position in global system
- **Logical predecessor(s):** GW-53
- **Logical successor(s):** GW-55 if stale else GW-56
- **Re-entry:** allowed when authoritative evidence shows this contract’s postcondition is not yet proven.
- **Skip:** only when an explicit deterministic `SKIPPABLE_IF` condition exists.
- **Reobserve/Reconcile:** first-class graph edges, never implicit retries.

## D — Chronological role
- **Transport chronology:** may differ from GW numeric order.
- **Functional chronology:** `GW-54` owns only `STALE_RECEIPT_DETECTION` responsibility.
- **Runtime chronology:** resolved by Workflow Graph, not `stepId + 1`.

## E — Contract input
Sorties prouvées des prédécesseurs applicables, contexte cible borné, références d’autorité nécessaires à `STALE_RECEIPT_DETECTION`.

Input fields must be bounded, provenance-aware and typed as hint/claim/evidence/fact; raw secret material is forbidden unless explicitly unavoidable and ephemeral.

## F — Information semantics
Every field is classified as one of:
`RAW_INPUT | HINT | CLAIM | OBSERVATION | EVIDENCE | DERIVED_FACT | AUTHORITATIVE_FACT | DECISION | ATTESTATION`.

No contract upgrades a `HINT` to an authoritative fact without the owning evidence.

## G — Authorities
Autorités existantes correspondant aux faits consommés; aucune nouvelle source de vérité créée par GWC.

**Forbidden authority pattern:** no arbitrary Markdown, prompt text, tool availability or remembered state may override the actual owning authority.

## H — Preconditions
- Structural input valid and bounded.
- Required authorities reachable or explicitly `UNAVAILABLE`.
- Required freshness/revision/SHA bindings available.
- No contradictory prerequisite state.
- For mutations: session/receipt/task/locks/governance requirements satisfied.

## I — Internal micro-state machine
validate bounded input → collect/validate required evidence → evaluate local invariants → derive domain status → derive routing disposition → emit bounded output.

## J — Transformation / decision algorithm
1. Parse/validate bounded input.
2. Determine required authority observations.
3. Refuse guesses for missing facts.
4. Apply contract-local invariants.
5. Produce domain status.
6. Produce engine disposition.
7. For mutations only, produce EffectPlan; never mutate from evaluation code directly.
8. Emit bounded output and evidence references.

## K — Determinism
- **Class:** `DECISION` with execution semantics `EVALUATE_ONLY`.
- Pure/read-only contracts are deterministic given identical normalized input and identical evidence snapshot.
- Observation-dependent contracts bind result to evidence freshness/revisions.

## L — Invariants
Global GWC invariants + no over-interpretation of predecessor output + bounded data + fail closed on missing evidence.

Plus all global GWC invariants.

## M — Action model
- **Allowed action kinds:** READ / DERIVE
- **Forbidden:** hidden mutation, authority bypass, stale evidence reuse, arbitrary shell fallback, unbounded projection.

## N — Current execution owner vs target owner
CURRENT: existing subsystem(s) listed in AM. TARGET: same owning authority behind a GWC adapter/contract wrapper.

## O — Capability / authorization model
For any mutation:
`callable ∧ authorized ∧ safeNow ∧ preconditionsSatisfied ∧ concurrencySatisfied = mayExecute`.
A present tool is never permission by itself.

## P — Lock model
No new lock unless EffectPlan declares a collision domain; consume existing Lock Service.

## Q — Concurrency model
Independent tasks may proceed in parallel when dependency/resource/lock scopes do not conflict.
Local blockers remain local.
Operational Memory process-local serialization is not treated as distributed locking.

## R — Output contract
- **Canonical output:** `ReceiptFreshness`
- Bounded, typed, provenance-aware.
- No secret/raw credential projection.
- Consumers must not over-interpret this output beyond its declared semantics.

## S — Terminal statuses
`SUCCESS | NONE | AMBIGUOUS | UNVERIFIED | BLOCKED | CONFLICT | STALE (subset applicable)`

## T — Terminality formula
Success requires all contract-owned postconditions to be proven from current required evidence.
Missing/stale/conflicting evidence maps to fail-closed statuses, never implicit success.

## U — Reason codes
Contract-specific reason codes must be stable, enumerable, bounded and machine-testable.
Every failure/blocking reason must identify whether it is recoverable by reobserve, reconcile, wait or explicit change.

## V — Fail-closed model
Missing/stale/conflicting required evidence never defaults to success or permission. UNKNOWN remains UNKNOWN.

## W — Evidence model
EvidenceEnvelope(s) from the owning authorities with freshness, provenance and relevant SHA/revision binding.

## X — Freshness / staleness
Evidence is bound to relevant `observedAt`, SHA, stateVersion and/or revisions.
A semantic state change invalidates dependent evidence when its contract declares such dependency.

## Y — Attestation model
EPHEMERAL_RESULT_ONLY by default; promote to bounded durable reference only where an existing authority requires durable proof.

## Z — Persistence model
No new GWC store. Persist only through the existing owning authority when the contract is a RECORD/MUTATE step.

## AA — Secret / privacy model
Never persist tokens, resume secrets, raw authorization headers, arbitrary transport IDs, `.env` material or unbounded prompt bodies.
Use digests/bounded projections where persistence is necessary.

## AB — Replay model
`READ_ONLY`

## AC — Recovery model
Recovery starts by observing the owning authority.
A mutation is replayed only when its replay class explicitly allows it and the recovery anchor proves it has not already happened.

## AD — Security / threat model
Prevent authority confusion, cross-session/repo/project leakage, stale evidence reuse, duplicate mutation, secret leakage and false attestation.

## AE — Observability
Emit bounded start/result/failure/reason-code observations where useful.
Observability is not authority.

## AF — Interface contract with predecessors
Consumes only the predecessor fields whose semantics are explicitly declared.
Revalidates any field whose freshness/ownership requires it.

## AG — Interface contract with successors
Exports `ReceiptFreshness` with explicit semantics; successor may not silently strengthen it.

## AH — Skip contract
No skip unless the graph contains a deterministic condition and proof source.
If skipped, the route and proof are observable.

## AI — Reobserve contract
Reobserve when required evidence is stale, unavailable-but-recoverable, or an external asynchronous condition may have progressed.

## AJ — Reconcile contract
Reconcile only when multiple authorities/state projections are inconsistent.
Reconcile is not the same as refreshing an observation.

## AK — Blocked behavior
Block only the affected Task/contract/resource scope unless an actual global invariant is violated.

## AL — Compensation / rollback
For pure/read-only contracts: not applicable.
For mutations: use existing rollback/compensation only where real; otherwise forward recovery by observation. Never pretend irreversible GitHub effects are rollbackable.

## AM — Existing system mapping
- **Current mapping:** BootstrapReceipt vs Live State version checks.
- **Classification:** `REUSE`
- Existing behavior is preserved and wrapped/generalized before new engines are introduced.

## AN — Current hardcodes / generalization
MCP/S1/repository literals and single-repository assumptions must move to TargetContext/configuration where applicable; preserve historical MCP behavior backward-compatibly.

## AO — Future implementation slot
Implement behind a GWC contract module + adapter to existing authority. Exact file placement must follow repository architecture discovered at implementation baseline, not be invented prematurely.

## AP — Test contract
happy path; boundary; NONE/AMBIGUOUS/UNVERIFIED/STALE/CONFLICT as applicable; replay/recovery; security; non-regression; exact binding tests.

## AQ — Property / invariant tests
- Unknown evidence never becomes allow/success.
- Explicit predecessor semantics are preserved.
- No hidden mutation.
- Same normalized input + same evidence ⇒ same semantic result for deterministic profiles.
- Mutation contracts never execute without a valid EffectPlan.

## AR — Acceptance criteria
- Input/output schemas are bounded.
- Owning authorities are explicit.
- Fail-closed paths are tested.
- Replay/recovery behavior is defined.
- No new parallel authority.
- Existing non-regression suite remains green.

## AS — Open questions
No blocking open decision beyond profile-specific implementation details; unresolved choices must stay explicit.

## AT — Architectural findings
- Existing implementation class: `REUSE`.
- Any discovered hardcode is treated as a generalization target, not silently removed.
- Any mismatch between CURRENT and TARGET is explicit.

## AU — Future Task Blueprint mapping
This contract is implemented by one or more governed implementation tasks from `GWC_IMPLEMENTATION_TASK_BLUEPRINTS_R1.md`; implementation dependencies follow the contract graph and authority dependencies rather than numeric GW order alone.

## AV — Execution semantics
`EVALUATE_ONLY`

## AW — Effect Plan
None.

## AX — Routing table
Primary predecessor: GW-53. Primary successor: GW-55 if stale else GW-56. Additional skip/reobserve/reconcile/recovery edges must be declared deterministically.

## AY — Recovery anchor
Read-only contracts: input/evidence snapshot bindings.
Mutation contracts: target reference + task/session + relevant branch/PR/SHA/revision/job ID.

## AZ — Reconstruction rule
On process restart, reconstruct from authoritative stores and observations; do not rely on previous assistant text or a GWC workflow-state database.

## BA — Autonomy behavior
AUTO_CONTINUE when exactly one legal route exists and required evidence is sufficient; WAIT_EXTERNAL/BLOCK_LOCAL/fail-closed otherwise.


---

# GW-55 — RECEIPT_REFRESH

## A — Identity
- **Contract ID:** `GW-55`
- **Canonical name:** `RECEIPT_REFRESH`
- **Family:** `G — Deployment`
- **Contract version:** `1` (conceptual baseline)
- **Profile(s):** `SESSION_MUTATION`
- **Architectural status:** `REUSE`
- **Integration class:** `REUSE`

## B — Purpose
Formaliser la responsabilité `RECEIPT_REFRESH` comme contrat borné, versionné et composable, sans dupliquer les autorités existantes.

**Non-responsibilities:** does not steal ownership from Task Queue, Session, Lock Service, Live State, GitRegistry, GitHub, deploy/runtime or other downstream contracts.

## C — Position in global system
- **Logical predecessor(s):** GW-54
- **Logical successor(s):** GW-56
- **Re-entry:** allowed when authoritative evidence shows this contract’s postcondition is not yet proven.
- **Skip:** only when an explicit deterministic `SKIPPABLE_IF` condition exists.
- **Reobserve/Reconcile:** first-class graph edges, never implicit retries.

## D — Chronological role
- **Transport chronology:** may differ from GW numeric order.
- **Functional chronology:** `GW-55` owns only `RECEIPT_REFRESH` responsibility.
- **Runtime chronology:** resolved by Workflow Graph, not `stepId + 1`.

## E — Contract input
Sorties prouvées des prédécesseurs applicables, contexte cible borné, références d’autorité nécessaires à `RECEIPT_REFRESH`.

Input fields must be bounded, provenance-aware and typed as hint/claim/evidence/fact; raw secret material is forbidden unless explicitly unavoidable and ephemeral.

## F — Information semantics
Every field is classified as one of:
`RAW_INPUT | HINT | CLAIM | OBSERVATION | EVIDENCE | DERIVED_FACT | AUTHORITATIVE_FACT | DECISION | ATTESTATION`.

No contract upgrades a `HINT` to an authoritative fact without the owning evidence.

## G — Authorities
Autorités existantes correspondant aux faits consommés; aucune nouvelle source de vérité créée par GWC.

**Forbidden authority pattern:** no arbitrary Markdown, prompt text, tool availability or remembered state may override the actual owning authority.

## H — Preconditions
- Structural input valid and bounded.
- Required authorities reachable or explicitly `UNAVAILABLE`.
- Required freshness/revision/SHA bindings available.
- No contradictory prerequisite state.
- For mutations: session/receipt/task/locks/governance requirements satisfied.

## I — Internal micro-state machine
validate bounded input → collect/validate required evidence → evaluate local invariants → derive domain status → derive routing disposition → emit bounded output.

## J — Transformation / decision algorithm
1. Parse/validate bounded input.
2. Determine required authority observations.
3. Refuse guesses for missing facts.
4. Apply contract-local invariants.
5. Produce domain status.
6. Produce engine disposition.
7. For mutations only, produce EffectPlan; never mutate from evaluation code directly.
8. Emit bounded output and evidence references.

## K — Determinism
- **Class:** `SESSION_MUTATION` with execution semantics `MUTATE_THEN_VERIFY`.
- Pure/read-only contracts are deterministic given identical normalized input and identical evidence snapshot.
- Observation-dependent contracts bind result to evidence freshness/revisions.

## L — Invariants
Global GWC invariants + no over-interpretation of predecessor output + bounded data + fail closed on missing evidence.

Plus all global GWC invariants.

## M — Action model
- **Allowed action kinds:** READ / DERIVE / RECORD / MUTATE
- **Forbidden:** hidden mutation, authority bypass, stale evidence reuse, arbitrary shell fallback, unbounded projection.

## N — Current execution owner vs target owner
CURRENT: existing subsystem(s) listed in AM. TARGET: same owning authority behind a GWC adapter/contract wrapper.

## O — Capability / authorization model
For any mutation:
`callable ∧ authorized ∧ safeNow ∧ preconditionsSatisfied ∧ concurrencySatisfied = mayExecute`.
A present tool is never permission by itself.

## P — Lock model
No new lock unless EffectPlan declares a collision domain; consume existing Lock Service.

## Q — Concurrency model
Independent tasks may proceed in parallel when dependency/resource/lock scopes do not conflict.
Local blockers remain local.
Operational Memory process-local serialization is not treated as distributed locking.

## R — Output contract
- **Canonical output:** `RefreshedReceipt`
- Bounded, typed, provenance-aware.
- No secret/raw credential projection.
- Consumers must not over-interpret this output beyond its declared semantics.

## S — Terminal statuses
`SUCCESS | NONE | AMBIGUOUS | UNVERIFIED | BLOCKED | CONFLICT | STALE (subset applicable)`

## T — Terminality formula
Success requires all contract-owned postconditions to be proven from current required evidence.
Missing/stale/conflicting evidence maps to fail-closed statuses, never implicit success.

## U — Reason codes
Contract-specific reason codes must be stable, enumerable, bounded and machine-testable.
Every failure/blocking reason must identify whether it is recoverable by reobserve, reconcile, wait or explicit change.

## V — Fail-closed model
Missing/stale/conflicting required evidence never defaults to success or permission. UNKNOWN remains UNKNOWN.

## W — Evidence model
EvidenceEnvelope(s) from the owning authorities with freshness, provenance and relevant SHA/revision binding.

## X — Freshness / staleness
Evidence is bound to relevant `observedAt`, SHA, stateVersion and/or revisions.
A semantic state change invalidates dependent evidence when its contract declares such dependency.

## Y — Attestation model
EPHEMERAL_RESULT_ONLY by default; promote to bounded durable reference only where an existing authority requires durable proof.

## Z — Persistence model
No new GWC store. Persist only through the existing owning authority when the contract is a RECORD/MUTATE step.

## AA — Secret / privacy model
Never persist tokens, resume secrets, raw authorization headers, arbitrary transport IDs, `.env` material or unbounded prompt bodies.
Use digests/bounded projections where persistence is necessary.

## AB — Replay model
`CONDITIONALLY_IDEMPOTENT unless explicitly NON_REPLAYABLE`

## AC — Recovery model
Recovery starts by observing the owning authority.
A mutation is replayed only when its replay class explicitly allows it and the recovery anchor proves it has not already happened.

## AD — Security / threat model
Prevent authority confusion, cross-session/repo/project leakage, stale evidence reuse, duplicate mutation, secret leakage and false attestation.

## AE — Observability
Emit bounded start/result/failure/reason-code observations where useful.
Observability is not authority.

## AF — Interface contract with predecessors
Consumes only the predecessor fields whose semantics are explicitly declared.
Revalidates any field whose freshness/ownership requires it.

## AG — Interface contract with successors
Exports `RefreshedReceipt` with explicit semantics; successor may not silently strengthen it.

## AH — Skip contract
No skip unless the graph contains a deterministic condition and proof source.
If skipped, the route and proof are observable.

## AI — Reobserve contract
Reobserve when required evidence is stale, unavailable-but-recoverable, or an external asynchronous condition may have progressed.

## AJ — Reconcile contract
Reconcile only when multiple authorities/state projections are inconsistent.
Reconcile is not the same as refreshing an observation.

## AK — Blocked behavior
Block only the affected Task/contract/resource scope unless an actual global invariant is violated.

## AL — Compensation / rollback
For pure/read-only contracts: not applicable.
For mutations: use existing rollback/compensation only where real; otherwise forward recovery by observation. Never pretend irreversible GitHub effects are rollbackable.

## AM — Existing system mapping
- **Current mapping:** acknowledgeContext receipt refresh.
- **Classification:** `REUSE`
- Existing behavior is preserved and wrapped/generalized before new engines are introduced.

## AN — Current hardcodes / generalization
MCP/S1/repository literals and single-repository assumptions must move to TargetContext/configuration where applicable; preserve historical MCP behavior backward-compatibly.

## AO — Future implementation slot
Implement behind a GWC contract module + adapter to existing authority. Exact file placement must follow repository architecture discovered at implementation baseline, not be invented prematurely.

## AP — Test contract
happy path; boundary; NONE/AMBIGUOUS/UNVERIFIED/STALE/CONFLICT as applicable; replay/recovery; security; non-regression; exact binding tests.

## AQ — Property / invariant tests
- Unknown evidence never becomes allow/success.
- Explicit predecessor semantics are preserved.
- No hidden mutation.
- Same normalized input + same evidence ⇒ same semantic result for deterministic profiles.
- Mutation contracts never execute without a valid EffectPlan.

## AR — Acceptance criteria
- Input/output schemas are bounded.
- Owning authorities are explicit.
- Fail-closed paths are tested.
- Replay/recovery behavior is defined.
- No new parallel authority.
- Existing non-regression suite remains green.

## AS — Open questions
No blocking open decision beyond profile-specific implementation details; unresolved choices must stay explicit.

## AT — Architectural findings
- Existing implementation class: `REUSE`.
- Any discovered hardcode is treated as a generalization target, not silently removed.
- Any mismatch between CURRENT and TARGET is explicit.

## AU — Future Task Blueprint mapping
This contract is implemented by one or more governed implementation tasks from `GWC_IMPLEMENTATION_TASK_BLUEPRINTS_R1.md`; implementation dependencies follow the contract graph and authority dependencies rather than numeric GW order alone.

## AV — Execution semantics
`MUTATE_THEN_VERIFY`

## AW — Effect Plan
Must be represented as an explicit EffectPlan with target authority, expected revisions/SHA, lock requirements, replay class, postconditions and recovery anchor.

## AX — Routing table
Primary predecessor: GW-54. Primary successor: GW-56. Additional skip/reobserve/reconcile/recovery edges must be declared deterministically.

## AY — Recovery anchor
Read-only contracts: input/evidence snapshot bindings.
Mutation contracts: target reference + task/session + relevant branch/PR/SHA/revision/job ID.

## AZ — Reconstruction rule
On process restart, reconstruct from authoritative stores and observations; do not rely on previous assistant text or a GWC workflow-state database.

## BA — Autonomy behavior
AUTO_CONTINUE when exactly one legal route exists and required evidence is sufficient; WAIT_EXTERNAL/BLOCK_LOCAL/fail-closed otherwise.


---

# GW-56 — TASK_RUNTIME_REVISION_BINDING

## A — Identity
- **Contract ID:** `GW-56`
- **Canonical name:** `TASK_RUNTIME_REVISION_BINDING`
- **Family:** `G — Deployment`
- **Contract version:** `1` (conceptual baseline)
- **Profile(s):** `DERIVER_BINDING`
- **Architectural status:** `PARTIAL`
- **Integration class:** `PARTIAL`

## B — Purpose
Formaliser la responsabilité `TASK_RUNTIME_REVISION_BINDING` comme contrat borné, versionné et composable, sans dupliquer les autorités existantes.

**Non-responsibilities:** does not steal ownership from Task Queue, Session, Lock Service, Live State, GitRegistry, GitHub, deploy/runtime or other downstream contracts.

## C — Position in global system
- **Logical predecessor(s):** GW-55
- **Logical successor(s):** GW-57
- **Re-entry:** allowed when authoritative evidence shows this contract’s postcondition is not yet proven.
- **Skip:** only when an explicit deterministic `SKIPPABLE_IF` condition exists.
- **Reobserve/Reconcile:** first-class graph edges, never implicit retries.

## D — Chronological role
- **Transport chronology:** may differ from GW numeric order.
- **Functional chronology:** `GW-56` owns only `TASK_RUNTIME_REVISION_BINDING` responsibility.
- **Runtime chronology:** resolved by Workflow Graph, not `stepId + 1`.

## E — Contract input
Sorties prouvées des prédécesseurs applicables, contexte cible borné, références d’autorité nécessaires à `TASK_RUNTIME_REVISION_BINDING`.

Input fields must be bounded, provenance-aware and typed as hint/claim/evidence/fact; raw secret material is forbidden unless explicitly unavoidable and ephemeral.

## F — Information semantics
Every field is classified as one of:
`RAW_INPUT | HINT | CLAIM | OBSERVATION | EVIDENCE | DERIVED_FACT | AUTHORITATIVE_FACT | DECISION | ATTESTATION`.

No contract upgrades a `HINT` to an authoritative fact without the owning evidence.

## G — Authorities
Autorités existantes correspondant aux faits consommés; aucune nouvelle source de vérité créée par GWC.

**Forbidden authority pattern:** no arbitrary Markdown, prompt text, tool availability or remembered state may override the actual owning authority.

## H — Preconditions
- Structural input valid and bounded.
- Required authorities reachable or explicitly `UNAVAILABLE`.
- Required freshness/revision/SHA bindings available.
- No contradictory prerequisite state.
- For mutations: session/receipt/task/locks/governance requirements satisfied.

## I — Internal micro-state machine
validate bounded input → collect/validate required evidence → evaluate local invariants → derive domain status → derive routing disposition → emit bounded output.

## J — Transformation / decision algorithm
1. Parse/validate bounded input.
2. Determine required authority observations.
3. Refuse guesses for missing facts.
4. Apply contract-local invariants.
5. Produce domain status.
6. Produce engine disposition.
7. For mutations only, produce EffectPlan; never mutate from evaluation code directly.
8. Emit bounded output and evidence references.

## K — Determinism
- **Class:** `DERIVER_BINDING` with execution semantics `COMPOSED_SUBCONTRACT`.
- Pure/read-only contracts are deterministic given identical normalized input and identical evidence snapshot.
- Observation-dependent contracts bind result to evidence freshness/revisions.

## L — Invariants
Global GWC invariants + no over-interpretation of predecessor output + bounded data + fail closed on missing evidence.

Plus all global GWC invariants.

## M — Action model
- **Allowed action kinds:** READ / DERIVE / RECORD bounded projection if existing authority owns it
- **Forbidden:** hidden mutation, authority bypass, stale evidence reuse, arbitrary shell fallback, unbounded projection.

## N — Current execution owner vs target owner
CURRENT: existing subsystem(s) listed in AM. TARGET: same owning authority behind a GWC adapter/contract wrapper.

## O — Capability / authorization model
For any mutation:
`callable ∧ authorized ∧ safeNow ∧ preconditionsSatisfied ∧ concurrencySatisfied = mayExecute`.
A present tool is never permission by itself.

## P — Lock model
No new lock unless EffectPlan declares a collision domain; consume existing Lock Service.

## Q — Concurrency model
Independent tasks may proceed in parallel when dependency/resource/lock scopes do not conflict.
Local blockers remain local.
Operational Memory process-local serialization is not treated as distributed locking.

## R — Output contract
- **Canonical output:** `RuntimeBindingProposal`
- Bounded, typed, provenance-aware.
- No secret/raw credential projection.
- Consumers must not over-interpret this output beyond its declared semantics.

## S — Terminal statuses
`SUCCESS | NONE | AMBIGUOUS | UNVERIFIED | BLOCKED | CONFLICT | STALE (subset applicable)`

## T — Terminality formula
Success requires all contract-owned postconditions to be proven from current required evidence.
Missing/stale/conflicting evidence maps to fail-closed statuses, never implicit success.

## U — Reason codes
Contract-specific reason codes must be stable, enumerable, bounded and machine-testable.
Every failure/blocking reason must identify whether it is recoverable by reobserve, reconcile, wait or explicit change.

## V — Fail-closed model
Missing/stale/conflicting required evidence never defaults to success or permission. UNKNOWN remains UNKNOWN.

## W — Evidence model
EvidenceEnvelope(s) from the owning authorities with freshness, provenance and relevant SHA/revision binding.

## X — Freshness / staleness
Evidence is bound to relevant `observedAt`, SHA, stateVersion and/or revisions.
A semantic state change invalidates dependent evidence when its contract declares such dependency.

## Y — Attestation model
EPHEMERAL_RESULT_ONLY by default; promote to bounded durable reference only where an existing authority requires durable proof.

## Z — Persistence model
No new GWC store. Persist only through the existing owning authority when the contract is a RECORD/MUTATE step.

## AA — Secret / privacy model
Never persist tokens, resume secrets, raw authorization headers, arbitrary transport IDs, `.env` material or unbounded prompt bodies.
Use digests/bounded projections where persistence is necessary.

## AB — Replay model
`CONDITIONALLY_IDEMPOTENT unless explicitly NON_REPLAYABLE`

## AC — Recovery model
Recovery starts by observing the owning authority.
A mutation is replayed only when its replay class explicitly allows it and the recovery anchor proves it has not already happened.

## AD — Security / threat model
Prevent authority confusion, cross-session/repo/project leakage, stale evidence reuse, duplicate mutation, secret leakage and false attestation.

## AE — Observability
Emit bounded start/result/failure/reason-code observations where useful.
Observability is not authority.

## AF — Interface contract with predecessors
Consumes only the predecessor fields whose semantics are explicitly declared.
Revalidates any field whose freshness/ownership requires it.

## AG — Interface contract with successors
Exports `RuntimeBindingProposal` with explicit semantics; successor may not silently strengthen it.

## AH — Skip contract
No skip unless the graph contains a deterministic condition and proof source.
If skipped, the route and proof are observable.

## AI — Reobserve contract
Reobserve when required evidence is stale, unavailable-but-recoverable, or an external asynchronous condition may have progressed.

## AJ — Reconcile contract
Reconcile only when multiple authorities/state projections are inconsistent.
Reconcile is not the same as refreshing an observation.

## AK — Blocked behavior
Block only the affected Task/contract/resource scope unless an actual global invariant is violated.

## AL — Compensation / rollback
For pure/read-only contracts: not applicable.
For mutations: use existing rollback/compensation only where real; otherwise forward recovery by observation. Never pretend irreversible GitHub effects are rollbackable.

## AM — Existing system mapping
- **Current mapping:** Task runtimeRevision field/transition; binding proof not formalized.
- **Classification:** `PARTIAL`
- Existing behavior is preserved and wrapped/generalized before new engines are introduced.

## AN — Current hardcodes / generalization
MCP/S1/repository literals and single-repository assumptions must move to TargetContext/configuration where applicable; preserve historical MCP behavior backward-compatibly.

## AO — Future implementation slot
Implement behind a GWC contract module + adapter to existing authority. Exact file placement must follow repository architecture discovered at implementation baseline, not be invented prematurely.

## AP — Test contract
happy path; boundary; NONE/AMBIGUOUS/UNVERIFIED/STALE/CONFLICT as applicable; replay/recovery; security; non-regression; exact binding tests.

## AQ — Property / invariant tests
- Unknown evidence never becomes allow/success.
- Explicit predecessor semantics are preserved.
- No hidden mutation.
- Same normalized input + same evidence ⇒ same semantic result for deterministic profiles.
- Mutation contracts never execute without a valid EffectPlan.

## AR — Acceptance criteria
- Input/output schemas are bounded.
- Owning authorities are explicit.
- Fail-closed paths are tested.
- Replay/recovery behavior is defined.
- No new parallel authority.
- Existing non-regression suite remains green.

## AS — Open questions
No blocking open decision beyond profile-specific implementation details; unresolved choices must stay explicit.

## AT — Architectural findings
- Existing implementation class: `PARTIAL`.
- Any discovered hardcode is treated as a generalization target, not silently removed.
- Any mismatch between CURRENT and TARGET is explicit.

## AU — Future Task Blueprint mapping
This contract is implemented by one or more governed implementation tasks from `GWC_IMPLEMENTATION_TASK_BLUEPRINTS_R1.md`; implementation dependencies follow the contract graph and authority dependencies rather than numeric GW order alone.

## AV — Execution semantics
`COMPOSED_SUBCONTRACT`

## AW — Effect Plan
None.

## AX — Routing table
Primary predecessor: GW-55. Primary successor: GW-57. Additional skip/reobserve/reconcile/recovery edges must be declared deterministically.

## AY — Recovery anchor
Read-only contracts: input/evidence snapshot bindings.
Mutation contracts: target reference + task/session + relevant branch/PR/SHA/revision/job ID.

## AZ — Reconstruction rule
On process restart, reconstruct from authoritative stores and observations; do not rely on previous assistant text or a GWC workflow-state database.

## BA — Autonomy behavior
AUTO_CONTINUE when exactly one legal route exists and required evidence is sufficient; WAIT_EXTERNAL/BLOCK_LOCAL/fail-closed otherwise.


---

# GW-57 — TASK_DEPLOYING

## A — Identity
- **Contract ID:** `GW-57`
- **Canonical name:** `TASK_DEPLOYING`
- **Family:** `G — Deployment`
- **Contract version:** `1` (conceptual baseline)
- **Profile(s):** `TASK_MUTATION`
- **Architectural status:** `REUSE`
- **Integration class:** `REUSE`

## B — Purpose
Formaliser la responsabilité `TASK_DEPLOYING` comme contrat borné, versionné et composable, sans dupliquer les autorités existantes.

**Non-responsibilities:** does not steal ownership from Task Queue, Session, Lock Service, Live State, GitRegistry, GitHub, deploy/runtime or other downstream contracts.

## C — Position in global system
- **Logical predecessor(s):** GW-56
- **Logical successor(s):** GW-58
- **Re-entry:** allowed when authoritative evidence shows this contract’s postcondition is not yet proven.
- **Skip:** only when an explicit deterministic `SKIPPABLE_IF` condition exists.
- **Reobserve/Reconcile:** first-class graph edges, never implicit retries.

## D — Chronological role
- **Transport chronology:** may differ from GW numeric order.
- **Functional chronology:** `GW-57` owns only `TASK_DEPLOYING` responsibility.
- **Runtime chronology:** resolved by Workflow Graph, not `stepId + 1`.

## E — Contract input
Sorties prouvées des prédécesseurs applicables, contexte cible borné, références d’autorité nécessaires à `TASK_DEPLOYING`.

Input fields must be bounded, provenance-aware and typed as hint/claim/evidence/fact; raw secret material is forbidden unless explicitly unavoidable and ephemeral.

## F — Information semantics
Every field is classified as one of:
`RAW_INPUT | HINT | CLAIM | OBSERVATION | EVIDENCE | DERIVED_FACT | AUTHORITATIVE_FACT | DECISION | ATTESTATION`.

No contract upgrades a `HINT` to an authoritative fact without the owning evidence.

## G — Authorities
Autorités existantes correspondant aux faits consommés; aucune nouvelle source de vérité créée par GWC.

**Forbidden authority pattern:** no arbitrary Markdown, prompt text, tool availability or remembered state may override the actual owning authority.

## H — Preconditions
- Structural input valid and bounded.
- Required authorities reachable or explicitly `UNAVAILABLE`.
- Required freshness/revision/SHA bindings available.
- No contradictory prerequisite state.
- For mutations: session/receipt/task/locks/governance requirements satisfied.

## I — Internal micro-state machine
validate bounded input → collect/validate required evidence → evaluate local invariants → derive domain status → derive routing disposition → emit bounded output.

## J — Transformation / decision algorithm
1. Parse/validate bounded input.
2. Determine required authority observations.
3. Refuse guesses for missing facts.
4. Apply contract-local invariants.
5. Produce domain status.
6. Produce engine disposition.
7. For mutations only, produce EffectPlan; never mutate from evaluation code directly.
8. Emit bounded output and evidence references.

## K — Determinism
- **Class:** `TASK_MUTATION` with execution semantics `MUTATE_THEN_VERIFY`.
- Pure/read-only contracts are deterministic given identical normalized input and identical evidence snapshot.
- Observation-dependent contracts bind result to evidence freshness/revisions.

## L — Invariants
Global GWC invariants + no over-interpretation of predecessor output + bounded data + fail closed on missing evidence.

Plus all global GWC invariants.

## M — Action model
- **Allowed action kinds:** READ / DERIVE / RECORD / MUTATE
- **Forbidden:** hidden mutation, authority bypass, stale evidence reuse, arbitrary shell fallback, unbounded projection.

## N — Current execution owner vs target owner
CURRENT: existing subsystem(s) listed in AM. TARGET: same owning authority behind a GWC adapter/contract wrapper.

## O — Capability / authorization model
For any mutation:
`callable ∧ authorized ∧ safeNow ∧ preconditionsSatisfied ∧ concurrencySatisfied = mayExecute`.
A present tool is never permission by itself.

## P — Lock model
No new lock unless EffectPlan declares a collision domain; consume existing Lock Service.

## Q — Concurrency model
Independent tasks may proceed in parallel when dependency/resource/lock scopes do not conflict.
Local blockers remain local.
Operational Memory process-local serialization is not treated as distributed locking.

## R — Output contract
- **Canonical output:** `DeployingTask`
- Bounded, typed, provenance-aware.
- No secret/raw credential projection.
- Consumers must not over-interpret this output beyond its declared semantics.

## S — Terminal statuses
`SUCCESS | NONE | AMBIGUOUS | UNVERIFIED | BLOCKED | CONFLICT | STALE (subset applicable)`

## T — Terminality formula
Success requires all contract-owned postconditions to be proven from current required evidence.
Missing/stale/conflicting evidence maps to fail-closed statuses, never implicit success.

## U — Reason codes
Contract-specific reason codes must be stable, enumerable, bounded and machine-testable.
Every failure/blocking reason must identify whether it is recoverable by reobserve, reconcile, wait or explicit change.

## V — Fail-closed model
Missing/stale/conflicting required evidence never defaults to success or permission. UNKNOWN remains UNKNOWN.

## W — Evidence model
EvidenceEnvelope(s) from the owning authorities with freshness, provenance and relevant SHA/revision binding.

## X — Freshness / staleness
Evidence is bound to relevant `observedAt`, SHA, stateVersion and/or revisions.
A semantic state change invalidates dependent evidence when its contract declares such dependency.

## Y — Attestation model
EPHEMERAL_RESULT_ONLY by default; promote to bounded durable reference only where an existing authority requires durable proof.

## Z — Persistence model
No new GWC store. Persist only through the existing owning authority when the contract is a RECORD/MUTATE step.

## AA — Secret / privacy model
Never persist tokens, resume secrets, raw authorization headers, arbitrary transport IDs, `.env` material or unbounded prompt bodies.
Use digests/bounded projections where persistence is necessary.

## AB — Replay model
`CONDITIONALLY_IDEMPOTENT unless explicitly NON_REPLAYABLE`

## AC — Recovery model
Recovery starts by observing the owning authority.
A mutation is replayed only when its replay class explicitly allows it and the recovery anchor proves it has not already happened.

## AD — Security / threat model
Prevent authority confusion, cross-session/repo/project leakage, stale evidence reuse, duplicate mutation, secret leakage and false attestation.

## AE — Observability
Emit bounded start/result/failure/reason-code observations where useful.
Observability is not authority.

## AF — Interface contract with predecessors
Consumes only the predecessor fields whose semantics are explicitly declared.
Revalidates any field whose freshness/ownership requires it.

## AG — Interface contract with successors
Exports `DeployingTask` with explicit semantics; successor may not silently strengthen it.

## AH — Skip contract
No skip unless the graph contains a deterministic condition and proof source.
If skipped, the route and proof are observable.

## AI — Reobserve contract
Reobserve when required evidence is stale, unavailable-but-recoverable, or an external asynchronous condition may have progressed.

## AJ — Reconcile contract
Reconcile only when multiple authorities/state projections are inconsistent.
Reconcile is not the same as refreshing an observation.

## AK — Blocked behavior
Block only the affected Task/contract/resource scope unless an actual global invariant is violated.

## AL — Compensation / rollback
For pure/read-only contracts: not applicable.
For mutations: use existing rollback/compensation only where real; otherwise forward recovery by observation. Never pretend irreversible GitHub effects are rollbackable.

## AM — Existing system mapping
- **Current mapping:** Task Queue DEPLOYING transition.
- **Classification:** `REUSE`
- Existing behavior is preserved and wrapped/generalized before new engines are introduced.

## AN — Current hardcodes / generalization
MCP/S1/repository literals and single-repository assumptions must move to TargetContext/configuration where applicable; preserve historical MCP behavior backward-compatibly.

## AO — Future implementation slot
Implement behind a GWC contract module + adapter to existing authority. Exact file placement must follow repository architecture discovered at implementation baseline, not be invented prematurely.

## AP — Test contract
happy path; boundary; NONE/AMBIGUOUS/UNVERIFIED/STALE/CONFLICT as applicable; replay/recovery; security; non-regression; exact binding tests.

## AQ — Property / invariant tests
- Unknown evidence never becomes allow/success.
- Explicit predecessor semantics are preserved.
- No hidden mutation.
- Same normalized input + same evidence ⇒ same semantic result for deterministic profiles.
- Mutation contracts never execute without a valid EffectPlan.

## AR — Acceptance criteria
- Input/output schemas are bounded.
- Owning authorities are explicit.
- Fail-closed paths are tested.
- Replay/recovery behavior is defined.
- No new parallel authority.
- Existing non-regression suite remains green.

## AS — Open questions
No blocking open decision beyond profile-specific implementation details; unresolved choices must stay explicit.

## AT — Architectural findings
- Existing implementation class: `REUSE`.
- Any discovered hardcode is treated as a generalization target, not silently removed.
- Any mismatch between CURRENT and TARGET is explicit.

## AU — Future Task Blueprint mapping
This contract is implemented by one or more governed implementation tasks from `GWC_IMPLEMENTATION_TASK_BLUEPRINTS_R1.md`; implementation dependencies follow the contract graph and authority dependencies rather than numeric GW order alone.

## AV — Execution semantics
`MUTATE_THEN_VERIFY`

## AW — Effect Plan
Must be represented as an explicit EffectPlan with target authority, expected revisions/SHA, lock requirements, replay class, postconditions and recovery anchor.

## AX — Routing table
Primary predecessor: GW-56. Primary successor: GW-58. Additional skip/reobserve/reconcile/recovery edges must be declared deterministically.

## AY — Recovery anchor
Read-only contracts: input/evidence snapshot bindings.
Mutation contracts: target reference + task/session + relevant branch/PR/SHA/revision/job ID.

## AZ — Reconstruction rule
On process restart, reconstruct from authoritative stores and observations; do not rely on previous assistant text or a GWC workflow-state database.

## BA — Autonomy behavior
AUTO_CONTINUE when exactly one legal route exists and required evidence is sufficient; WAIT_EXTERNAL/BLOCK_LOCAL/fail-closed otherwise.


---

# GW-58 — DOCUMENTATION_DRIFT_DECISION

## A — Identity
- **Contract ID:** `GW-58`
- **Canonical name:** `DOCUMENTATION_DRIFT_DECISION`
- **Family:** `H — Verification and Closure`
- **Contract version:** `1` (conceptual baseline)
- **Profile(s):** `DECISION`
- **Architectural status:** `REUSE/GENERALIZE`
- **Integration class:** `REUSE/GENERALIZE`

## B — Purpose
Formaliser la responsabilité `DOCUMENTATION_DRIFT_DECISION` comme contrat borné, versionné et composable, sans dupliquer les autorités existantes.

**Non-responsibilities:** does not steal ownership from Task Queue, Session, Lock Service, Live State, GitRegistry, GitHub, deploy/runtime or other downstream contracts.

## C — Position in global system
- **Logical predecessor(s):** GW-57
- **Logical successor(s):** GW-59 if drift else GW-66
- **Re-entry:** allowed when authoritative evidence shows this contract’s postcondition is not yet proven.
- **Skip:** only when an explicit deterministic `SKIPPABLE_IF` condition exists.
- **Reobserve/Reconcile:** first-class graph edges, never implicit retries.

## D — Chronological role
- **Transport chronology:** may differ from GW numeric order.
- **Functional chronology:** `GW-58` owns only `DOCUMENTATION_DRIFT_DECISION` responsibility.
- **Runtime chronology:** resolved by Workflow Graph, not `stepId + 1`.

## E — Contract input
Sorties prouvées des prédécesseurs applicables, contexte cible borné, références d’autorité nécessaires à `DOCUMENTATION_DRIFT_DECISION`.

Input fields must be bounded, provenance-aware and typed as hint/claim/evidence/fact; raw secret material is forbidden unless explicitly unavoidable and ephemeral.

## F — Information semantics
Every field is classified as one of:
`RAW_INPUT | HINT | CLAIM | OBSERVATION | EVIDENCE | DERIVED_FACT | AUTHORITATIVE_FACT | DECISION | ATTESTATION`.

No contract upgrades a `HINT` to an authoritative fact without the owning evidence.

## G — Authorities
Autorités existantes correspondant aux faits consommés; aucune nouvelle source de vérité créée par GWC.

**Forbidden authority pattern:** no arbitrary Markdown, prompt text, tool availability or remembered state may override the actual owning authority.

## H — Preconditions
- Structural input valid and bounded.
- Required authorities reachable or explicitly `UNAVAILABLE`.
- Required freshness/revision/SHA bindings available.
- No contradictory prerequisite state.
- For mutations: session/receipt/task/locks/governance requirements satisfied.

## I — Internal micro-state machine
validate bounded input → collect/validate required evidence → evaluate local invariants → derive domain status → derive routing disposition → emit bounded output.

## J — Transformation / decision algorithm
1. Parse/validate bounded input.
2. Determine required authority observations.
3. Refuse guesses for missing facts.
4. Apply contract-local invariants.
5. Produce domain status.
6. Produce engine disposition.
7. For mutations only, produce EffectPlan; never mutate from evaluation code directly.
8. Emit bounded output and evidence references.

## K — Determinism
- **Class:** `DECISION` with execution semantics `EVALUATE_ONLY`.
- Pure/read-only contracts are deterministic given identical normalized input and identical evidence snapshot.
- Observation-dependent contracts bind result to evidence freshness/revisions.

## L — Invariants
Global GWC invariants + no over-interpretation of predecessor output + bounded data + fail closed on missing evidence.

Plus all global GWC invariants.

## M — Action model
- **Allowed action kinds:** READ / DERIVE
- **Forbidden:** hidden mutation, authority bypass, stale evidence reuse, arbitrary shell fallback, unbounded projection.

## N — Current execution owner vs target owner
CURRENT: existing subsystem(s) listed in AM. TARGET: same owning authority behind a GWC adapter/contract wrapper.

## O — Capability / authorization model
For any mutation:
`callable ∧ authorized ∧ safeNow ∧ preconditionsSatisfied ∧ concurrencySatisfied = mayExecute`.
A present tool is never permission by itself.

## P — Lock model
No new lock unless EffectPlan declares a collision domain; consume existing Lock Service.

## Q — Concurrency model
Independent tasks may proceed in parallel when dependency/resource/lock scopes do not conflict.
Local blockers remain local.
Operational Memory process-local serialization is not treated as distributed locking.

## R — Output contract
- **Canonical output:** `DocumentationDriftDecision`
- Bounded, typed, provenance-aware.
- No secret/raw credential projection.
- Consumers must not over-interpret this output beyond its declared semantics.

## S — Terminal statuses
`SUCCESS | NONE | AMBIGUOUS | UNVERIFIED | BLOCKED | CONFLICT | STALE (subset applicable)`

## T — Terminality formula
Success requires all contract-owned postconditions to be proven from current required evidence.
Missing/stale/conflicting evidence maps to fail-closed statuses, never implicit success.

## U — Reason codes
Contract-specific reason codes must be stable, enumerable, bounded and machine-testable.
Every failure/blocking reason must identify whether it is recoverable by reobserve, reconcile, wait or explicit change.

## V — Fail-closed model
Missing/stale/conflicting required evidence never defaults to success or permission. UNKNOWN remains UNKNOWN.

## W — Evidence model
EvidenceEnvelope(s) from the owning authorities with freshness, provenance and relevant SHA/revision binding.

## X — Freshness / staleness
Evidence is bound to relevant `observedAt`, SHA, stateVersion and/or revisions.
A semantic state change invalidates dependent evidence when its contract declares such dependency.

## Y — Attestation model
EPHEMERAL_RESULT_ONLY by default; promote to bounded durable reference only where an existing authority requires durable proof.

## Z — Persistence model
No new GWC store. Persist only through the existing owning authority when the contract is a RECORD/MUTATE step.

## AA — Secret / privacy model
Never persist tokens, resume secrets, raw authorization headers, arbitrary transport IDs, `.env` material or unbounded prompt bodies.
Use digests/bounded projections where persistence is necessary.

## AB — Replay model
`READ_ONLY`

## AC — Recovery model
Recovery starts by observing the owning authority.
A mutation is replayed only when its replay class explicitly allows it and the recovery anchor proves it has not already happened.

## AD — Security / threat model
Prevent authority confusion, cross-session/repo/project leakage, stale evidence reuse, duplicate mutation, secret leakage and false attestation.

## AE — Observability
Emit bounded start/result/failure/reason-code observations where useful.
Observability is not authority.

## AF — Interface contract with predecessors
Consumes only the predecessor fields whose semantics are explicitly declared.
Revalidates any field whose freshness/ownership requires it.

## AG — Interface contract with successors
Exports `DocumentationDriftDecision` with explicit semantics; successor may not silently strengthen it.

## AH — Skip contract
No skip unless the graph contains a deterministic condition and proof source.
If skipped, the route and proof are observable.

## AI — Reobserve contract
Reobserve when required evidence is stale, unavailable-but-recoverable, or an external asynchronous condition may have progressed.

## AJ — Reconcile contract
Reconcile only when multiple authorities/state projections are inconsistent.
Reconcile is not the same as refreshing an observation.

## AK — Blocked behavior
Block only the affected Task/contract/resource scope unless an actual global invariant is violated.

## AL — Compensation / rollback
For pure/read-only contracts: not applicable.
For mutations: use existing rollback/compensation only where real; otherwise forward recovery by observation. Never pretend irreversible GitHub effects are rollbackable.

## AM — Existing system mapping
- **Current mapping:** Live State documentation drift.
- **Classification:** `REUSE/GENERALIZE`
- Existing behavior is preserved and wrapped/generalized before new engines are introduced.

## AN — Current hardcodes / generalization
MCP/S1/repository literals and single-repository assumptions must move to TargetContext/configuration where applicable; preserve historical MCP behavior backward-compatibly.

## AO — Future implementation slot
Implement behind a GWC contract module + adapter to existing authority. Exact file placement must follow repository architecture discovered at implementation baseline, not be invented prematurely.

## AP — Test contract
happy path; boundary; NONE/AMBIGUOUS/UNVERIFIED/STALE/CONFLICT as applicable; replay/recovery; security; non-regression; exact binding tests.

## AQ — Property / invariant tests
- Unknown evidence never becomes allow/success.
- Explicit predecessor semantics are preserved.
- No hidden mutation.
- Same normalized input + same evidence ⇒ same semantic result for deterministic profiles.
- Mutation contracts never execute without a valid EffectPlan.

## AR — Acceptance criteria
- Input/output schemas are bounded.
- Owning authorities are explicit.
- Fail-closed paths are tested.
- Replay/recovery behavior is defined.
- No new parallel authority.
- Existing non-regression suite remains green.

## AS — Open questions
No blocking open decision beyond profile-specific implementation details; unresolved choices must stay explicit.

## AT — Architectural findings
- Existing implementation class: `REUSE/GENERALIZE`.
- Any discovered hardcode is treated as a generalization target, not silently removed.
- Any mismatch between CURRENT and TARGET is explicit.

## AU — Future Task Blueprint mapping
This contract is implemented by one or more governed implementation tasks from `GWC_IMPLEMENTATION_TASK_BLUEPRINTS_R1.md`; implementation dependencies follow the contract graph and authority dependencies rather than numeric GW order alone.

## AV — Execution semantics
`EVALUATE_ONLY`

## AW — Effect Plan
None.

## AX — Routing table
Primary predecessor: GW-57. Primary successor: GW-59 if drift else GW-66. Additional skip/reobserve/reconcile/recovery edges must be declared deterministically.

## AY — Recovery anchor
Read-only contracts: input/evidence snapshot bindings.
Mutation contracts: target reference + task/session + relevant branch/PR/SHA/revision/job ID.

## AZ — Reconstruction rule
On process restart, reconstruct from authoritative stores and observations; do not rely on previous assistant text or a GWC workflow-state database.

## BA — Autonomy behavior
AUTO_CONTINUE when exactly one legal route exists and required evidence is sufficient; WAIT_EXTERNAL/BLOCK_LOCAL/fail-closed otherwise.


---

# GW-59 — DOCUMENTATION_BRANCH_IF_REQUIRED

## A — Identity
- **Contract ID:** `GW-59`
- **Canonical name:** `DOCUMENTATION_BRANCH_IF_REQUIRED`
- **Family:** `H — Verification and Closure`
- **Contract version:** `1` (conceptual baseline)
- **Profile(s):** `GIT_MUTATION`
- **Architectural status:** `CANDIDATE`
- **Integration class:** `CANDIDATE`

## B — Purpose
Formaliser la responsabilité `DOCUMENTATION_BRANCH_IF_REQUIRED` comme contrat borné, versionné et composable, sans dupliquer les autorités existantes.

**Non-responsibilities:** does not steal ownership from Task Queue, Session, Lock Service, Live State, GitRegistry, GitHub, deploy/runtime or other downstream contracts.

## C — Position in global system
- **Logical predecessor(s):** GW-58
- **Logical successor(s):** GW-60
- **Re-entry:** allowed when authoritative evidence shows this contract’s postcondition is not yet proven.
- **Skip:** only when an explicit deterministic `SKIPPABLE_IF` condition exists.
- **Reobserve/Reconcile:** first-class graph edges, never implicit retries.

## D — Chronological role
- **Transport chronology:** may differ from GW numeric order.
- **Functional chronology:** `GW-59` owns only `DOCUMENTATION_BRANCH_IF_REQUIRED` responsibility.
- **Runtime chronology:** resolved by Workflow Graph, not `stepId + 1`.

## E — Contract input
Sorties prouvées des prédécesseurs applicables, contexte cible borné, références d’autorité nécessaires à `DOCUMENTATION_BRANCH_IF_REQUIRED`.

Input fields must be bounded, provenance-aware and typed as hint/claim/evidence/fact; raw secret material is forbidden unless explicitly unavoidable and ephemeral.

## F — Information semantics
Every field is classified as one of:
`RAW_INPUT | HINT | CLAIM | OBSERVATION | EVIDENCE | DERIVED_FACT | AUTHORITATIVE_FACT | DECISION | ATTESTATION`.

No contract upgrades a `HINT` to an authoritative fact without the owning evidence.

## G — Authorities
Autorités existantes correspondant aux faits consommés; aucune nouvelle source de vérité créée par GWC.

**Forbidden authority pattern:** no arbitrary Markdown, prompt text, tool availability or remembered state may override the actual owning authority.

## H — Preconditions
- Structural input valid and bounded.
- Required authorities reachable or explicitly `UNAVAILABLE`.
- Required freshness/revision/SHA bindings available.
- No contradictory prerequisite state.
- For mutations: session/receipt/task/locks/governance requirements satisfied.

## I — Internal micro-state machine
validate bounded input → collect/validate required evidence → evaluate local invariants → derive domain status → derive routing disposition → emit bounded output.

## J — Transformation / decision algorithm
1. Parse/validate bounded input.
2. Determine required authority observations.
3. Refuse guesses for missing facts.
4. Apply contract-local invariants.
5. Produce domain status.
6. Produce engine disposition.
7. For mutations only, produce EffectPlan; never mutate from evaluation code directly.
8. Emit bounded output and evidence references.

## K — Determinism
- **Class:** `GIT_MUTATION` with execution semantics `MUTATE_THEN_VERIFY`.
- Pure/read-only contracts are deterministic given identical normalized input and identical evidence snapshot.
- Observation-dependent contracts bind result to evidence freshness/revisions.

## L — Invariants
Global GWC invariants + no over-interpretation of predecessor output + bounded data + fail closed on missing evidence.

Plus all global GWC invariants.

## M — Action model
- **Allowed action kinds:** READ / DERIVE / RECORD / MUTATE
- **Forbidden:** hidden mutation, authority bypass, stale evidence reuse, arbitrary shell fallback, unbounded projection.

## N — Current execution owner vs target owner
CURRENT: existing subsystem(s) listed in AM. TARGET: same owning authority behind a GWC adapter/contract wrapper.

## O — Capability / authorization model
For any mutation:
`callable ∧ authorized ∧ safeNow ∧ preconditionsSatisfied ∧ concurrencySatisfied = mayExecute`.
A present tool is never permission by itself.

## P — Lock model
No new lock unless EffectPlan declares a collision domain; consume existing Lock Service.

## Q — Concurrency model
Independent tasks may proceed in parallel when dependency/resource/lock scopes do not conflict.
Local blockers remain local.
Operational Memory process-local serialization is not treated as distributed locking.

## R — Output contract
- **Canonical output:** `DocsBranch`
- Bounded, typed, provenance-aware.
- No secret/raw credential projection.
- Consumers must not over-interpret this output beyond its declared semantics.

## S — Terminal statuses
`SUCCESS | NONE | AMBIGUOUS | UNVERIFIED | BLOCKED | CONFLICT | STALE (subset applicable)`

## T — Terminality formula
Success requires all contract-owned postconditions to be proven from current required evidence.
Missing/stale/conflicting evidence maps to fail-closed statuses, never implicit success.

## U — Reason codes
Contract-specific reason codes must be stable, enumerable, bounded and machine-testable.
Every failure/blocking reason must identify whether it is recoverable by reobserve, reconcile, wait or explicit change.

## V — Fail-closed model
Missing/stale/conflicting required evidence never defaults to success or permission. UNKNOWN remains UNKNOWN.

## W — Evidence model
EvidenceEnvelope(s) from the owning authorities with freshness, provenance and relevant SHA/revision binding.

## X — Freshness / staleness
Evidence is bound to relevant `observedAt`, SHA, stateVersion and/or revisions.
A semantic state change invalidates dependent evidence when its contract declares such dependency.

## Y — Attestation model
EPHEMERAL_RESULT_ONLY by default; promote to bounded durable reference only where an existing authority requires durable proof.

## Z — Persistence model
No new GWC store. Persist only through the existing owning authority when the contract is a RECORD/MUTATE step.

## AA — Secret / privacy model
Never persist tokens, resume secrets, raw authorization headers, arbitrary transport IDs, `.env` material or unbounded prompt bodies.
Use digests/bounded projections where persistence is necessary.

## AB — Replay model
`CONDITIONALLY_IDEMPOTENT unless explicitly NON_REPLAYABLE`

## AC — Recovery model
Recovery starts by observing the owning authority.
A mutation is replayed only when its replay class explicitly allows it and the recovery anchor proves it has not already happened.

## AD — Security / threat model
Prevent authority confusion, cross-session/repo/project leakage, stale evidence reuse, duplicate mutation, secret leakage and false attestation.

## AE — Observability
Emit bounded start/result/failure/reason-code observations where useful.
Observability is not authority.

## AF — Interface contract with predecessors
Consumes only the predecessor fields whose semantics are explicitly declared.
Revalidates any field whose freshness/ownership requires it.

## AG — Interface contract with successors
Exports `DocsBranch` with explicit semantics; successor may not silently strengthen it.

## AH — Skip contract
No skip unless the graph contains a deterministic condition and proof source.
If skipped, the route and proof are observable.

## AI — Reobserve contract
Reobserve when required evidence is stale, unavailable-but-recoverable, or an external asynchronous condition may have progressed.

## AJ — Reconcile contract
Reconcile only when multiple authorities/state projections are inconsistent.
Reconcile is not the same as refreshing an observation.

## AK — Blocked behavior
Block only the affected Task/contract/resource scope unless an actual global invariant is violated.

## AL — Compensation / rollback
For pure/read-only contracts: not applicable.
For mutations: use existing rollback/compensation only where real; otherwise forward recovery by observation. Never pretend irreversible GitHub effects are rollbackable.

## AM — Existing system mapping
- **Current mapping:** Candidate #90 branch creation reused for docs.
- **Classification:** `CANDIDATE`
- Existing behavior is preserved and wrapped/generalized before new engines are introduced.

## AN — Current hardcodes / generalization
MCP/S1/repository literals and single-repository assumptions must move to TargetContext/configuration where applicable; preserve historical MCP behavior backward-compatibly.

## AO — Future implementation slot
Implement behind a GWC contract module + adapter to existing authority. Exact file placement must follow repository architecture discovered at implementation baseline, not be invented prematurely.

## AP — Test contract
happy path; boundary; NONE/AMBIGUOUS/UNVERIFIED/STALE/CONFLICT as applicable; replay/recovery; security; non-regression; exact binding tests.

## AQ — Property / invariant tests
- Unknown evidence never becomes allow/success.
- Explicit predecessor semantics are preserved.
- No hidden mutation.
- Same normalized input + same evidence ⇒ same semantic result for deterministic profiles.
- Mutation contracts never execute without a valid EffectPlan.

## AR — Acceptance criteria
- Input/output schemas are bounded.
- Owning authorities are explicit.
- Fail-closed paths are tested.
- Replay/recovery behavior is defined.
- No new parallel authority.
- Existing non-regression suite remains green.

## AS — Open questions
No blocking open decision beyond profile-specific implementation details; unresolved choices must stay explicit.

## AT — Architectural findings
- Existing implementation class: `CANDIDATE`.
- Any discovered hardcode is treated as a generalization target, not silently removed.
- Any mismatch between CURRENT and TARGET is explicit.

## AU — Future Task Blueprint mapping
This contract is implemented by one or more governed implementation tasks from `GWC_IMPLEMENTATION_TASK_BLUEPRINTS_R1.md`; implementation dependencies follow the contract graph and authority dependencies rather than numeric GW order alone.

## AV — Execution semantics
`MUTATE_THEN_VERIFY`

## AW — Effect Plan
Must be represented as an explicit EffectPlan with target authority, expected revisions/SHA, lock requirements, replay class, postconditions and recovery anchor.

## AX — Routing table
Primary predecessor: GW-58. Primary successor: GW-60. Additional skip/reobserve/reconcile/recovery edges must be declared deterministically.

## AY — Recovery anchor
Read-only contracts: input/evidence snapshot bindings.
Mutation contracts: target reference + task/session + relevant branch/PR/SHA/revision/job ID.

## AZ — Reconstruction rule
On process restart, reconstruct from authoritative stores and observations; do not rely on previous assistant text or a GWC workflow-state database.

## BA — Autonomy behavior
AUTO_CONTINUE when exactly one legal route exists and required evidence is sufficient; WAIT_EXTERNAL/BLOCK_LOCAL/fail-closed otherwise.


---

# GW-60 — DOCUMENTATION_RECONCILIATION

## A — Identity
- **Contract ID:** `GW-60`
- **Canonical name:** `DOCUMENTATION_RECONCILIATION`
- **Family:** `H — Verification and Closure`
- **Contract version:** `1` (conceptual baseline)
- **Profile(s):** `DOC_MUTATION`
- **Architectural status:** `PARTIAL/CANDIDATE`
- **Integration class:** `PARTIAL/CANDIDATE`

## B — Purpose
Formaliser la responsabilité `DOCUMENTATION_RECONCILIATION` comme contrat borné, versionné et composable, sans dupliquer les autorités existantes.

**Non-responsibilities:** does not steal ownership from Task Queue, Session, Lock Service, Live State, GitRegistry, GitHub, deploy/runtime or other downstream contracts.

## C — Position in global system
- **Logical predecessor(s):** GW-59
- **Logical successor(s):** GW-61
- **Re-entry:** allowed when authoritative evidence shows this contract’s postcondition is not yet proven.
- **Skip:** only when an explicit deterministic `SKIPPABLE_IF` condition exists.
- **Reobserve/Reconcile:** first-class graph edges, never implicit retries.

## D — Chronological role
- **Transport chronology:** may differ from GW numeric order.
- **Functional chronology:** `GW-60` owns only `DOCUMENTATION_RECONCILIATION` responsibility.
- **Runtime chronology:** resolved by Workflow Graph, not `stepId + 1`.

## E — Contract input
Sorties prouvées des prédécesseurs applicables, contexte cible borné, références d’autorité nécessaires à `DOCUMENTATION_RECONCILIATION`.

Input fields must be bounded, provenance-aware and typed as hint/claim/evidence/fact; raw secret material is forbidden unless explicitly unavoidable and ephemeral.

## F — Information semantics
Every field is classified as one of:
`RAW_INPUT | HINT | CLAIM | OBSERVATION | EVIDENCE | DERIVED_FACT | AUTHORITATIVE_FACT | DECISION | ATTESTATION`.

No contract upgrades a `HINT` to an authoritative fact without the owning evidence.

## G — Authorities
Autorités existantes correspondant aux faits consommés; aucune nouvelle source de vérité créée par GWC.

**Forbidden authority pattern:** no arbitrary Markdown, prompt text, tool availability or remembered state may override the actual owning authority.

## H — Preconditions
- Structural input valid and bounded.
- Required authorities reachable or explicitly `UNAVAILABLE`.
- Required freshness/revision/SHA bindings available.
- No contradictory prerequisite state.
- For mutations: session/receipt/task/locks/governance requirements satisfied.

## I — Internal micro-state machine
validate bounded input → collect/validate required evidence → evaluate local invariants → derive domain status → derive routing disposition → emit bounded output.

## J — Transformation / decision algorithm
1. Parse/validate bounded input.
2. Determine required authority observations.
3. Refuse guesses for missing facts.
4. Apply contract-local invariants.
5. Produce domain status.
6. Produce engine disposition.
7. For mutations only, produce EffectPlan; never mutate from evaluation code directly.
8. Emit bounded output and evidence references.

## K — Determinism
- **Class:** `DOC_MUTATION` with execution semantics `MUTATE_THEN_VERIFY`.
- Pure/read-only contracts are deterministic given identical normalized input and identical evidence snapshot.
- Observation-dependent contracts bind result to evidence freshness/revisions.

## L — Invariants
Global GWC invariants + no over-interpretation of predecessor output + bounded data + fail closed on missing evidence.

Plus all global GWC invariants.

## M — Action model
- **Allowed action kinds:** READ / DERIVE / RECORD / MUTATE
- **Forbidden:** hidden mutation, authority bypass, stale evidence reuse, arbitrary shell fallback, unbounded projection.

## N — Current execution owner vs target owner
CURRENT: existing subsystem(s) listed in AM. TARGET: same owning authority behind a GWC adapter/contract wrapper.

## O — Capability / authorization model
For any mutation:
`callable ∧ authorized ∧ safeNow ∧ preconditionsSatisfied ∧ concurrencySatisfied = mayExecute`.
A present tool is never permission by itself.

## P — Lock model
No new lock unless EffectPlan declares a collision domain; consume existing Lock Service.

## Q — Concurrency model
Independent tasks may proceed in parallel when dependency/resource/lock scopes do not conflict.
Local blockers remain local.
Operational Memory process-local serialization is not treated as distributed locking.

## R — Output contract
- **Canonical output:** `DocsCandidate`
- Bounded, typed, provenance-aware.
- No secret/raw credential projection.
- Consumers must not over-interpret this output beyond its declared semantics.

## S — Terminal statuses
`SUCCESS | NONE | AMBIGUOUS | UNVERIFIED | BLOCKED | CONFLICT | STALE (subset applicable)`

## T — Terminality formula
Success requires all contract-owned postconditions to be proven from current required evidence.
Missing/stale/conflicting evidence maps to fail-closed statuses, never implicit success.

## U — Reason codes
Contract-specific reason codes must be stable, enumerable, bounded and machine-testable.
Every failure/blocking reason must identify whether it is recoverable by reobserve, reconcile, wait or explicit change.

## V — Fail-closed model
Missing/stale/conflicting required evidence never defaults to success or permission. UNKNOWN remains UNKNOWN.

## W — Evidence model
EvidenceEnvelope(s) from the owning authorities with freshness, provenance and relevant SHA/revision binding.

## X — Freshness / staleness
Evidence is bound to relevant `observedAt`, SHA, stateVersion and/or revisions.
A semantic state change invalidates dependent evidence when its contract declares such dependency.

## Y — Attestation model
EPHEMERAL_RESULT_ONLY by default; promote to bounded durable reference only where an existing authority requires durable proof.

## Z — Persistence model
No new GWC store. Persist only through the existing owning authority when the contract is a RECORD/MUTATE step.

## AA — Secret / privacy model
Never persist tokens, resume secrets, raw authorization headers, arbitrary transport IDs, `.env` material or unbounded prompt bodies.
Use digests/bounded projections where persistence is necessary.

## AB — Replay model
`CONDITIONALLY_IDEMPOTENT unless explicitly NON_REPLAYABLE`

## AC — Recovery model
Recovery starts by observing the owning authority.
A mutation is replayed only when its replay class explicitly allows it and the recovery anchor proves it has not already happened.

## AD — Security / threat model
Prevent authority confusion, cross-session/repo/project leakage, stale evidence reuse, duplicate mutation, secret leakage and false attestation.

## AE — Observability
Emit bounded start/result/failure/reason-code observations where useful.
Observability is not authority.

## AF — Interface contract with predecessors
Consumes only the predecessor fields whose semantics are explicitly declared.
Revalidates any field whose freshness/ownership requires it.

## AG — Interface contract with successors
Exports `DocsCandidate` with explicit semantics; successor may not silently strengthen it.

## AH — Skip contract
No skip unless the graph contains a deterministic condition and proof source.
If skipped, the route and proof are observable.

## AI — Reobserve contract
Reobserve when required evidence is stale, unavailable-but-recoverable, or an external asynchronous condition may have progressed.

## AJ — Reconcile contract
Reconcile only when multiple authorities/state projections are inconsistent.
Reconcile is not the same as refreshing an observation.

## AK — Blocked behavior
Block only the affected Task/contract/resource scope unless an actual global invariant is violated.

## AL — Compensation / rollback
For pure/read-only contracts: not applicable.
For mutations: use existing rollback/compensation only where real; otherwise forward recovery by observation. Never pretend irreversible GitHub effects are rollbackable.

## AM — Existing system mapping
- **Current mapping:** Docs governance + candidate GitHub commit surfaces.
- **Classification:** `PARTIAL/CANDIDATE`
- Existing behavior is preserved and wrapped/generalized before new engines are introduced.

## AN — Current hardcodes / generalization
MCP/S1/repository literals and single-repository assumptions must move to TargetContext/configuration where applicable; preserve historical MCP behavior backward-compatibly.

## AO — Future implementation slot
Implement behind a GWC contract module + adapter to existing authority. Exact file placement must follow repository architecture discovered at implementation baseline, not be invented prematurely.

## AP — Test contract
happy path; boundary; NONE/AMBIGUOUS/UNVERIFIED/STALE/CONFLICT as applicable; replay/recovery; security; non-regression; exact binding tests.

## AQ — Property / invariant tests
- Unknown evidence never becomes allow/success.
- Explicit predecessor semantics are preserved.
- No hidden mutation.
- Same normalized input + same evidence ⇒ same semantic result for deterministic profiles.
- Mutation contracts never execute without a valid EffectPlan.

## AR — Acceptance criteria
- Input/output schemas are bounded.
- Owning authorities are explicit.
- Fail-closed paths are tested.
- Replay/recovery behavior is defined.
- No new parallel authority.
- Existing non-regression suite remains green.

## AS — Open questions
No blocking open decision beyond profile-specific implementation details; unresolved choices must stay explicit.

## AT — Architectural findings
- Existing implementation class: `PARTIAL/CANDIDATE`.
- Any discovered hardcode is treated as a generalization target, not silently removed.
- Any mismatch between CURRENT and TARGET is explicit.

## AU — Future Task Blueprint mapping
This contract is implemented by one or more governed implementation tasks from `GWC_IMPLEMENTATION_TASK_BLUEPRINTS_R1.md`; implementation dependencies follow the contract graph and authority dependencies rather than numeric GW order alone.

## AV — Execution semantics
`MUTATE_THEN_VERIFY`

## AW — Effect Plan
Must be represented as an explicit EffectPlan with target authority, expected revisions/SHA, lock requirements, replay class, postconditions and recovery anchor.

## AX — Routing table
Primary predecessor: GW-59. Primary successor: GW-61. Additional skip/reobserve/reconcile/recovery edges must be declared deterministically.

## AY — Recovery anchor
Read-only contracts: input/evidence snapshot bindings.
Mutation contracts: target reference + task/session + relevant branch/PR/SHA/revision/job ID.

## AZ — Reconstruction rule
On process restart, reconstruct from authoritative stores and observations; do not rely on previous assistant text or a GWC workflow-state database.

## BA — Autonomy behavior
AUTO_CONTINUE when exactly one legal route exists and required evidence is sufficient; WAIT_EXTERNAL/BLOCK_LOCAL/fail-closed otherwise.


---

# GW-61 — DOCUMENTATION_PR

## A — Identity
- **Contract ID:** `GW-61`
- **Canonical name:** `DOCUMENTATION_PR`
- **Family:** `H — Verification and Closure`
- **Contract version:** `1` (conceptual baseline)
- **Profile(s):** `GIT_MUTATION`
- **Architectural status:** `CANDIDATE`
- **Integration class:** `CANDIDATE`

## B — Purpose
Formaliser la responsabilité `DOCUMENTATION_PR` comme contrat borné, versionné et composable, sans dupliquer les autorités existantes.

**Non-responsibilities:** does not steal ownership from Task Queue, Session, Lock Service, Live State, GitRegistry, GitHub, deploy/runtime or other downstream contracts.

## C — Position in global system
- **Logical predecessor(s):** GW-60
- **Logical successor(s):** GW-62
- **Re-entry:** allowed when authoritative evidence shows this contract’s postcondition is not yet proven.
- **Skip:** only when an explicit deterministic `SKIPPABLE_IF` condition exists.
- **Reobserve/Reconcile:** first-class graph edges, never implicit retries.

## D — Chronological role
- **Transport chronology:** may differ from GW numeric order.
- **Functional chronology:** `GW-61` owns only `DOCUMENTATION_PR` responsibility.
- **Runtime chronology:** resolved by Workflow Graph, not `stepId + 1`.

## E — Contract input
Sorties prouvées des prédécesseurs applicables, contexte cible borné, références d’autorité nécessaires à `DOCUMENTATION_PR`.

Input fields must be bounded, provenance-aware and typed as hint/claim/evidence/fact; raw secret material is forbidden unless explicitly unavoidable and ephemeral.

## F — Information semantics
Every field is classified as one of:
`RAW_INPUT | HINT | CLAIM | OBSERVATION | EVIDENCE | DERIVED_FACT | AUTHORITATIVE_FACT | DECISION | ATTESTATION`.

No contract upgrades a `HINT` to an authoritative fact without the owning evidence.

## G — Authorities
Autorités existantes correspondant aux faits consommés; aucune nouvelle source de vérité créée par GWC.

**Forbidden authority pattern:** no arbitrary Markdown, prompt text, tool availability or remembered state may override the actual owning authority.

## H — Preconditions
- Structural input valid and bounded.
- Required authorities reachable or explicitly `UNAVAILABLE`.
- Required freshness/revision/SHA bindings available.
- No contradictory prerequisite state.
- For mutations: session/receipt/task/locks/governance requirements satisfied.

## I — Internal micro-state machine
validate bounded input → collect/validate required evidence → evaluate local invariants → derive domain status → derive routing disposition → emit bounded output.

## J — Transformation / decision algorithm
1. Parse/validate bounded input.
2. Determine required authority observations.
3. Refuse guesses for missing facts.
4. Apply contract-local invariants.
5. Produce domain status.
6. Produce engine disposition.
7. For mutations only, produce EffectPlan; never mutate from evaluation code directly.
8. Emit bounded output and evidence references.

## K — Determinism
- **Class:** `GIT_MUTATION` with execution semantics `MUTATE_THEN_VERIFY`.
- Pure/read-only contracts are deterministic given identical normalized input and identical evidence snapshot.
- Observation-dependent contracts bind result to evidence freshness/revisions.

## L — Invariants
Global GWC invariants + no over-interpretation of predecessor output + bounded data + fail closed on missing evidence.

Plus all global GWC invariants.

## M — Action model
- **Allowed action kinds:** READ / DERIVE / RECORD / MUTATE
- **Forbidden:** hidden mutation, authority bypass, stale evidence reuse, arbitrary shell fallback, unbounded projection.

## N — Current execution owner vs target owner
CURRENT: existing subsystem(s) listed in AM. TARGET: same owning authority behind a GWC adapter/contract wrapper.

## O — Capability / authorization model
For any mutation:
`callable ∧ authorized ∧ safeNow ∧ preconditionsSatisfied ∧ concurrencySatisfied = mayExecute`.
A present tool is never permission by itself.

## P — Lock model
No new lock unless EffectPlan declares a collision domain; consume existing Lock Service.

## Q — Concurrency model
Independent tasks may proceed in parallel when dependency/resource/lock scopes do not conflict.
Local blockers remain local.
Operational Memory process-local serialization is not treated as distributed locking.

## R — Output contract
- **Canonical output:** `DocsPullRequest`
- Bounded, typed, provenance-aware.
- No secret/raw credential projection.
- Consumers must not over-interpret this output beyond its declared semantics.

## S — Terminal statuses
`SUCCESS | NONE | AMBIGUOUS | UNVERIFIED | BLOCKED | CONFLICT | STALE (subset applicable)`

## T — Terminality formula
Success requires all contract-owned postconditions to be proven from current required evidence.
Missing/stale/conflicting evidence maps to fail-closed statuses, never implicit success.

## U — Reason codes
Contract-specific reason codes must be stable, enumerable, bounded and machine-testable.
Every failure/blocking reason must identify whether it is recoverable by reobserve, reconcile, wait or explicit change.

## V — Fail-closed model
Missing/stale/conflicting required evidence never defaults to success or permission. UNKNOWN remains UNKNOWN.

## W — Evidence model
EvidenceEnvelope(s) from the owning authorities with freshness, provenance and relevant SHA/revision binding.

## X — Freshness / staleness
Evidence is bound to relevant `observedAt`, SHA, stateVersion and/or revisions.
A semantic state change invalidates dependent evidence when its contract declares such dependency.

## Y — Attestation model
EPHEMERAL_RESULT_ONLY by default; promote to bounded durable reference only where an existing authority requires durable proof.

## Z — Persistence model
No new GWC store. Persist only through the existing owning authority when the contract is a RECORD/MUTATE step.

## AA — Secret / privacy model
Never persist tokens, resume secrets, raw authorization headers, arbitrary transport IDs, `.env` material or unbounded prompt bodies.
Use digests/bounded projections where persistence is necessary.

## AB — Replay model
`CONDITIONALLY_IDEMPOTENT unless explicitly NON_REPLAYABLE`

## AC — Recovery model
Recovery starts by observing the owning authority.
A mutation is replayed only when its replay class explicitly allows it and the recovery anchor proves it has not already happened.

## AD — Security / threat model
Prevent authority confusion, cross-session/repo/project leakage, stale evidence reuse, duplicate mutation, secret leakage and false attestation.

## AE — Observability
Emit bounded start/result/failure/reason-code observations where useful.
Observability is not authority.

## AF — Interface contract with predecessors
Consumes only the predecessor fields whose semantics are explicitly declared.
Revalidates any field whose freshness/ownership requires it.

## AG — Interface contract with successors
Exports `DocsPullRequest` with explicit semantics; successor may not silently strengthen it.

## AH — Skip contract
No skip unless the graph contains a deterministic condition and proof source.
If skipped, the route and proof are observable.

## AI — Reobserve contract
Reobserve when required evidence is stale, unavailable-but-recoverable, or an external asynchronous condition may have progressed.

## AJ — Reconcile contract
Reconcile only when multiple authorities/state projections are inconsistent.
Reconcile is not the same as refreshing an observation.

## AK — Blocked behavior
Block only the affected Task/contract/resource scope unless an actual global invariant is violated.

## AL — Compensation / rollback
For pure/read-only contracts: not applicable.
For mutations: use existing rollback/compensation only where real; otherwise forward recovery by observation. Never pretend irreversible GitHub effects are rollbackable.

## AM — Existing system mapping
- **Current mapping:** Candidate #90 PR creation.
- **Classification:** `CANDIDATE`
- Existing behavior is preserved and wrapped/generalized before new engines are introduced.

## AN — Current hardcodes / generalization
MCP/S1/repository literals and single-repository assumptions must move to TargetContext/configuration where applicable; preserve historical MCP behavior backward-compatibly.

## AO — Future implementation slot
Implement behind a GWC contract module + adapter to existing authority. Exact file placement must follow repository architecture discovered at implementation baseline, not be invented prematurely.

## AP — Test contract
happy path; boundary; NONE/AMBIGUOUS/UNVERIFIED/STALE/CONFLICT as applicable; replay/recovery; security; non-regression; exact binding tests.

## AQ — Property / invariant tests
- Unknown evidence never becomes allow/success.
- Explicit predecessor semantics are preserved.
- No hidden mutation.
- Same normalized input + same evidence ⇒ same semantic result for deterministic profiles.
- Mutation contracts never execute without a valid EffectPlan.

## AR — Acceptance criteria
- Input/output schemas are bounded.
- Owning authorities are explicit.
- Fail-closed paths are tested.
- Replay/recovery behavior is defined.
- No new parallel authority.
- Existing non-regression suite remains green.

## AS — Open questions
No blocking open decision beyond profile-specific implementation details; unresolved choices must stay explicit.

## AT — Architectural findings
- Existing implementation class: `CANDIDATE`.
- Any discovered hardcode is treated as a generalization target, not silently removed.
- Any mismatch between CURRENT and TARGET is explicit.

## AU — Future Task Blueprint mapping
This contract is implemented by one or more governed implementation tasks from `GWC_IMPLEMENTATION_TASK_BLUEPRINTS_R1.md`; implementation dependencies follow the contract graph and authority dependencies rather than numeric GW order alone.

## AV — Execution semantics
`MUTATE_THEN_VERIFY`

## AW — Effect Plan
Must be represented as an explicit EffectPlan with target authority, expected revisions/SHA, lock requirements, replay class, postconditions and recovery anchor.

## AX — Routing table
Primary predecessor: GW-60. Primary successor: GW-62. Additional skip/reobserve/reconcile/recovery edges must be declared deterministically.

## AY — Recovery anchor
Read-only contracts: input/evidence snapshot bindings.
Mutation contracts: target reference + task/session + relevant branch/PR/SHA/revision/job ID.

## AZ — Reconstruction rule
On process restart, reconstruct from authoritative stores and observations; do not rely on previous assistant text or a GWC workflow-state database.

## BA — Autonomy behavior
AUTO_CONTINUE when exactly one legal route exists and required evidence is sufficient; WAIT_EXTERNAL/BLOCK_LOCAL/fail-closed otherwise.


---

# GW-62 — DOCUMENTATION_CI_REVIEW

## A — Identity
- **Contract ID:** `GW-62`
- **Canonical name:** `DOCUMENTATION_CI_REVIEW`
- **Family:** `H — Verification and Closure`
- **Contract version:** `1` (conceptual baseline)
- **Profile(s):** `CI_REVIEW`
- **Architectural status:** `REUSE/EXTEND`
- **Integration class:** `REUSE/EXTEND`

## B — Purpose
Formaliser la responsabilité `DOCUMENTATION_CI_REVIEW` comme contrat borné, versionné et composable, sans dupliquer les autorités existantes.

**Non-responsibilities:** does not steal ownership from Task Queue, Session, Lock Service, Live State, GitRegistry, GitHub, deploy/runtime or other downstream contracts.

## C — Position in global system
- **Logical predecessor(s):** GW-61
- **Logical successor(s):** GW-63
- **Re-entry:** allowed when authoritative evidence shows this contract’s postcondition is not yet proven.
- **Skip:** only when an explicit deterministic `SKIPPABLE_IF` condition exists.
- **Reobserve/Reconcile:** first-class graph edges, never implicit retries.

## D — Chronological role
- **Transport chronology:** may differ from GW numeric order.
- **Functional chronology:** `GW-62` owns only `DOCUMENTATION_CI_REVIEW` responsibility.
- **Runtime chronology:** resolved by Workflow Graph, not `stepId + 1`.

## E — Contract input
Sorties prouvées des prédécesseurs applicables, contexte cible borné, références d’autorité nécessaires à `DOCUMENTATION_CI_REVIEW`.

Input fields must be bounded, provenance-aware and typed as hint/claim/evidence/fact; raw secret material is forbidden unless explicitly unavoidable and ephemeral.

## F — Information semantics
Every field is classified as one of:
`RAW_INPUT | HINT | CLAIM | OBSERVATION | EVIDENCE | DERIVED_FACT | AUTHORITATIVE_FACT | DECISION | ATTESTATION`.

No contract upgrades a `HINT` to an authoritative fact without the owning evidence.

## G — Authorities
Autorités existantes correspondant aux faits consommés; aucune nouvelle source de vérité créée par GWC.

**Forbidden authority pattern:** no arbitrary Markdown, prompt text, tool availability or remembered state may override the actual owning authority.

## H — Preconditions
- Structural input valid and bounded.
- Required authorities reachable or explicitly `UNAVAILABLE`.
- Required freshness/revision/SHA bindings available.
- No contradictory prerequisite state.
- For mutations: session/receipt/task/locks/governance requirements satisfied.

## I — Internal micro-state machine
validate bounded input → collect/validate required evidence → evaluate local invariants → derive domain status → derive routing disposition → emit bounded output.

## J — Transformation / decision algorithm
1. Parse/validate bounded input.
2. Determine required authority observations.
3. Refuse guesses for missing facts.
4. Apply contract-local invariants.
5. Produce domain status.
6. Produce engine disposition.
7. For mutations only, produce EffectPlan; never mutate from evaluation code directly.
8. Emit bounded output and evidence references.

## K — Determinism
- **Class:** `CI_REVIEW` with execution semantics `OBSERVE_AND_EVALUATE`.
- Pure/read-only contracts are deterministic given identical normalized input and identical evidence snapshot.
- Observation-dependent contracts bind result to evidence freshness/revisions.

## L — Invariants
Global GWC invariants + no over-interpretation of predecessor output + bounded data + fail closed on missing evidence.

Plus all global GWC invariants.

## M — Action model
- **Allowed action kinds:** READ / DERIVE
- **Forbidden:** hidden mutation, authority bypass, stale evidence reuse, arbitrary shell fallback, unbounded projection.

## N — Current execution owner vs target owner
CURRENT: existing subsystem(s) listed in AM. TARGET: same owning authority behind a GWC adapter/contract wrapper.

## O — Capability / authorization model
For any mutation:
`callable ∧ authorized ∧ safeNow ∧ preconditionsSatisfied ∧ concurrencySatisfied = mayExecute`.
A present tool is never permission by itself.

## P — Lock model
No new lock unless EffectPlan declares a collision domain; consume existing Lock Service.

## Q — Concurrency model
Independent tasks may proceed in parallel when dependency/resource/lock scopes do not conflict.
Local blockers remain local.
Operational Memory process-local serialization is not treated as distributed locking.

## R — Output contract
- **Canonical output:** `DocsReviewProof`
- Bounded, typed, provenance-aware.
- No secret/raw credential projection.
- Consumers must not over-interpret this output beyond its declared semantics.

## S — Terminal statuses
`SUCCESS | NONE | AMBIGUOUS | UNVERIFIED | BLOCKED | CONFLICT | STALE (subset applicable)`

## T — Terminality formula
Success requires all contract-owned postconditions to be proven from current required evidence.
Missing/stale/conflicting evidence maps to fail-closed statuses, never implicit success.

## U — Reason codes
Contract-specific reason codes must be stable, enumerable, bounded and machine-testable.
Every failure/blocking reason must identify whether it is recoverable by reobserve, reconcile, wait or explicit change.

## V — Fail-closed model
Missing/stale/conflicting required evidence never defaults to success or permission. UNKNOWN remains UNKNOWN.

## W — Evidence model
EvidenceEnvelope(s) from the owning authorities with freshness, provenance and relevant SHA/revision binding.

## X — Freshness / staleness
Evidence is bound to relevant `observedAt`, SHA, stateVersion and/or revisions.
A semantic state change invalidates dependent evidence when its contract declares such dependency.

## Y — Attestation model
EPHEMERAL_RESULT_ONLY by default; promote to bounded durable reference only where an existing authority requires durable proof.

## Z — Persistence model
No new GWC store. Persist only through the existing owning authority when the contract is a RECORD/MUTATE step.

## AA — Secret / privacy model
Never persist tokens, resume secrets, raw authorization headers, arbitrary transport IDs, `.env` material or unbounded prompt bodies.
Use digests/bounded projections where persistence is necessary.

## AB — Replay model
`READ_ONLY`

## AC — Recovery model
Recovery starts by observing the owning authority.
A mutation is replayed only when its replay class explicitly allows it and the recovery anchor proves it has not already happened.

## AD — Security / threat model
Prevent authority confusion, cross-session/repo/project leakage, stale evidence reuse, duplicate mutation, secret leakage and false attestation.

## AE — Observability
Emit bounded start/result/failure/reason-code observations where useful.
Observability is not authority.

## AF — Interface contract with predecessors
Consumes only the predecessor fields whose semantics are explicitly declared.
Revalidates any field whose freshness/ownership requires it.

## AG — Interface contract with successors
Exports `DocsReviewProof` with explicit semantics; successor may not silently strengthen it.

## AH — Skip contract
No skip unless the graph contains a deterministic condition and proof source.
If skipped, the route and proof are observable.

## AI — Reobserve contract
Reobserve when required evidence is stale, unavailable-but-recoverable, or an external asynchronous condition may have progressed.

## AJ — Reconcile contract
Reconcile only when multiple authorities/state projections are inconsistent.
Reconcile is not the same as refreshing an observation.

## AK — Blocked behavior
Block only the affected Task/contract/resource scope unless an actual global invariant is violated.

## AL — Compensation / rollback
For pure/read-only contracts: not applicable.
For mutations: use existing rollback/compensation only where real; otherwise forward recovery by observation. Never pretend irreversible GitHub effects are rollbackable.

## AM — Existing system mapping
- **Current mapping:** CI/review evidence reused with documentation profile.
- **Classification:** `REUSE/EXTEND`
- Existing behavior is preserved and wrapped/generalized before new engines are introduced.

## AN — Current hardcodes / generalization
MCP/S1/repository literals and single-repository assumptions must move to TargetContext/configuration where applicable; preserve historical MCP behavior backward-compatibly.

## AO — Future implementation slot
Implement behind a GWC contract module + adapter to existing authority. Exact file placement must follow repository architecture discovered at implementation baseline, not be invented prematurely.

## AP — Test contract
happy path; boundary; NONE/AMBIGUOUS/UNVERIFIED/STALE/CONFLICT as applicable; replay/recovery; security; non-regression; exact binding tests.

## AQ — Property / invariant tests
- Unknown evidence never becomes allow/success.
- Explicit predecessor semantics are preserved.
- No hidden mutation.
- Same normalized input + same evidence ⇒ same semantic result for deterministic profiles.
- Mutation contracts never execute without a valid EffectPlan.

## AR — Acceptance criteria
- Input/output schemas are bounded.
- Owning authorities are explicit.
- Fail-closed paths are tested.
- Replay/recovery behavior is defined.
- No new parallel authority.
- Existing non-regression suite remains green.

## AS — Open questions
No blocking open decision beyond profile-specific implementation details; unresolved choices must stay explicit.

## AT — Architectural findings
- Existing implementation class: `REUSE/EXTEND`.
- Any discovered hardcode is treated as a generalization target, not silently removed.
- Any mismatch between CURRENT and TARGET is explicit.

## AU — Future Task Blueprint mapping
This contract is implemented by one or more governed implementation tasks from `GWC_IMPLEMENTATION_TASK_BLUEPRINTS_R1.md`; implementation dependencies follow the contract graph and authority dependencies rather than numeric GW order alone.

## AV — Execution semantics
`OBSERVE_AND_EVALUATE`

## AW — Effect Plan
None.

## AX — Routing table
Primary predecessor: GW-61. Primary successor: GW-63. Additional skip/reobserve/reconcile/recovery edges must be declared deterministically.

## AY — Recovery anchor
Read-only contracts: input/evidence snapshot bindings.
Mutation contracts: target reference + task/session + relevant branch/PR/SHA/revision/job ID.

## AZ — Reconstruction rule
On process restart, reconstruct from authoritative stores and observations; do not rely on previous assistant text or a GWC workflow-state database.

## BA — Autonomy behavior
AUTO_CONTINUE when exactly one legal route exists and required evidence is sufficient; WAIT_EXTERNAL/BLOCK_LOCAL/fail-closed otherwise.


---

# GW-63 — DOCUMENTATION_EXACT_HEAD_MERGE

## A — Identity
- **Contract ID:** `GW-63`
- **Canonical name:** `DOCUMENTATION_EXACT_HEAD_MERGE`
- **Family:** `H — Verification and Closure`
- **Contract version:** `1` (conceptual baseline)
- **Profile(s):** `GIT_MUTATION`
- **Architectural status:** `CANDIDATE`
- **Integration class:** `CANDIDATE`

## B — Purpose
Formaliser la responsabilité `DOCUMENTATION_EXACT_HEAD_MERGE` comme contrat borné, versionné et composable, sans dupliquer les autorités existantes.

**Non-responsibilities:** does not steal ownership from Task Queue, Session, Lock Service, Live State, GitRegistry, GitHub, deploy/runtime or other downstream contracts.

## C — Position in global system
- **Logical predecessor(s):** GW-62
- **Logical successor(s):** GW-64
- **Re-entry:** allowed when authoritative evidence shows this contract’s postcondition is not yet proven.
- **Skip:** only when an explicit deterministic `SKIPPABLE_IF` condition exists.
- **Reobserve/Reconcile:** first-class graph edges, never implicit retries.

## D — Chronological role
- **Transport chronology:** may differ from GW numeric order.
- **Functional chronology:** `GW-63` owns only `DOCUMENTATION_EXACT_HEAD_MERGE` responsibility.
- **Runtime chronology:** resolved by Workflow Graph, not `stepId + 1`.

## E — Contract input
Sorties prouvées des prédécesseurs applicables, contexte cible borné, références d’autorité nécessaires à `DOCUMENTATION_EXACT_HEAD_MERGE`.

Input fields must be bounded, provenance-aware and typed as hint/claim/evidence/fact; raw secret material is forbidden unless explicitly unavoidable and ephemeral.

## F — Information semantics
Every field is classified as one of:
`RAW_INPUT | HINT | CLAIM | OBSERVATION | EVIDENCE | DERIVED_FACT | AUTHORITATIVE_FACT | DECISION | ATTESTATION`.

No contract upgrades a `HINT` to an authoritative fact without the owning evidence.

## G — Authorities
Autorités existantes correspondant aux faits consommés; aucune nouvelle source de vérité créée par GWC.

**Forbidden authority pattern:** no arbitrary Markdown, prompt text, tool availability or remembered state may override the actual owning authority.

## H — Preconditions
- Structural input valid and bounded.
- Required authorities reachable or explicitly `UNAVAILABLE`.
- Required freshness/revision/SHA bindings available.
- No contradictory prerequisite state.
- For mutations: session/receipt/task/locks/governance requirements satisfied.

## I — Internal micro-state machine
validate bounded input → collect/validate required evidence → evaluate local invariants → derive domain status → derive routing disposition → emit bounded output.

## J — Transformation / decision algorithm
1. Parse/validate bounded input.
2. Determine required authority observations.
3. Refuse guesses for missing facts.
4. Apply contract-local invariants.
5. Produce domain status.
6. Produce engine disposition.
7. For mutations only, produce EffectPlan; never mutate from evaluation code directly.
8. Emit bounded output and evidence references.

## K — Determinism
- **Class:** `GIT_MUTATION` with execution semantics `MUTATE_THEN_VERIFY`.
- Pure/read-only contracts are deterministic given identical normalized input and identical evidence snapshot.
- Observation-dependent contracts bind result to evidence freshness/revisions.

## L — Invariants
Global GWC invariants + no over-interpretation of predecessor output + bounded data + fail closed on missing evidence.

Plus all global GWC invariants.

## M — Action model
- **Allowed action kinds:** READ / DERIVE / RECORD / MUTATE
- **Forbidden:** hidden mutation, authority bypass, stale evidence reuse, arbitrary shell fallback, unbounded projection.

## N — Current execution owner vs target owner
CURRENT: existing subsystem(s) listed in AM. TARGET: same owning authority behind a GWC adapter/contract wrapper.

## O — Capability / authorization model
For any mutation:
`callable ∧ authorized ∧ safeNow ∧ preconditionsSatisfied ∧ concurrencySatisfied = mayExecute`.
A present tool is never permission by itself.

## P — Lock model
No new lock unless EffectPlan declares a collision domain; consume existing Lock Service.

## Q — Concurrency model
Independent tasks may proceed in parallel when dependency/resource/lock scopes do not conflict.
Local blockers remain local.
Operational Memory process-local serialization is not treated as distributed locking.

## R — Output contract
- **Canonical output:** `DocsMergeResult`
- Bounded, typed, provenance-aware.
- No secret/raw credential projection.
- Consumers must not over-interpret this output beyond its declared semantics.

## S — Terminal statuses
`SUCCESS | NONE | AMBIGUOUS | UNVERIFIED | BLOCKED | CONFLICT | STALE (subset applicable)`

## T — Terminality formula
Success requires all contract-owned postconditions to be proven from current required evidence.
Missing/stale/conflicting evidence maps to fail-closed statuses, never implicit success.

## U — Reason codes
Contract-specific reason codes must be stable, enumerable, bounded and machine-testable.
Every failure/blocking reason must identify whether it is recoverable by reobserve, reconcile, wait or explicit change.

## V — Fail-closed model
Missing/stale/conflicting required evidence never defaults to success or permission. UNKNOWN remains UNKNOWN.

## W — Evidence model
EvidenceEnvelope(s) from the owning authorities with freshness, provenance and relevant SHA/revision binding.

## X — Freshness / staleness
Evidence is bound to relevant `observedAt`, SHA, stateVersion and/or revisions.
A semantic state change invalidates dependent evidence when its contract declares such dependency.

## Y — Attestation model
EPHEMERAL_RESULT_ONLY by default; promote to bounded durable reference only where an existing authority requires durable proof.

## Z — Persistence model
No new GWC store. Persist only through the existing owning authority when the contract is a RECORD/MUTATE step.

## AA — Secret / privacy model
Never persist tokens, resume secrets, raw authorization headers, arbitrary transport IDs, `.env` material or unbounded prompt bodies.
Use digests/bounded projections where persistence is necessary.

## AB — Replay model
`CONDITIONALLY_IDEMPOTENT unless explicitly NON_REPLAYABLE`

## AC — Recovery model
Recovery starts by observing the owning authority.
A mutation is replayed only when its replay class explicitly allows it and the recovery anchor proves it has not already happened.

## AD — Security / threat model
Prevent authority confusion, cross-session/repo/project leakage, stale evidence reuse, duplicate mutation, secret leakage and false attestation.

## AE — Observability
Emit bounded start/result/failure/reason-code observations where useful.
Observability is not authority.

## AF — Interface contract with predecessors
Consumes only the predecessor fields whose semantics are explicitly declared.
Revalidates any field whose freshness/ownership requires it.

## AG — Interface contract with successors
Exports `DocsMergeResult` with explicit semantics; successor may not silently strengthen it.

## AH — Skip contract
No skip unless the graph contains a deterministic condition and proof source.
If skipped, the route and proof are observable.

## AI — Reobserve contract
Reobserve when required evidence is stale, unavailable-but-recoverable, or an external asynchronous condition may have progressed.

## AJ — Reconcile contract
Reconcile only when multiple authorities/state projections are inconsistent.
Reconcile is not the same as refreshing an observation.

## AK — Blocked behavior
Block only the affected Task/contract/resource scope unless an actual global invariant is violated.

## AL — Compensation / rollback
For pure/read-only contracts: not applicable.
For mutations: use existing rollback/compensation only where real; otherwise forward recovery by observation. Never pretend irreversible GitHub effects are rollbackable.

## AM — Existing system mapping
- **Current mapping:** Candidate #90 exact-head merge.
- **Classification:** `CANDIDATE`
- Existing behavior is preserved and wrapped/generalized before new engines are introduced.

## AN — Current hardcodes / generalization
MCP/S1/repository literals and single-repository assumptions must move to TargetContext/configuration where applicable; preserve historical MCP behavior backward-compatibly.

## AO — Future implementation slot
Implement behind a GWC contract module + adapter to existing authority. Exact file placement must follow repository architecture discovered at implementation baseline, not be invented prematurely.

## AP — Test contract
happy path; boundary; NONE/AMBIGUOUS/UNVERIFIED/STALE/CONFLICT as applicable; replay/recovery; security; non-regression; exact binding tests.

## AQ — Property / invariant tests
- Unknown evidence never becomes allow/success.
- Explicit predecessor semantics are preserved.
- No hidden mutation.
- Same normalized input + same evidence ⇒ same semantic result for deterministic profiles.
- Mutation contracts never execute without a valid EffectPlan.

## AR — Acceptance criteria
- Input/output schemas are bounded.
- Owning authorities are explicit.
- Fail-closed paths are tested.
- Replay/recovery behavior is defined.
- No new parallel authority.
- Existing non-regression suite remains green.

## AS — Open questions
No blocking open decision beyond profile-specific implementation details; unresolved choices must stay explicit.

## AT — Architectural findings
- Existing implementation class: `CANDIDATE`.
- Any discovered hardcode is treated as a generalization target, not silently removed.
- Any mismatch between CURRENT and TARGET is explicit.

## AU — Future Task Blueprint mapping
This contract is implemented by one or more governed implementation tasks from `GWC_IMPLEMENTATION_TASK_BLUEPRINTS_R1.md`; implementation dependencies follow the contract graph and authority dependencies rather than numeric GW order alone.

## AV — Execution semantics
`MUTATE_THEN_VERIFY`

## AW — Effect Plan
Must be represented as an explicit EffectPlan with target authority, expected revisions/SHA, lock requirements, replay class, postconditions and recovery anchor.

## AX — Routing table
Primary predecessor: GW-62. Primary successor: GW-64. Additional skip/reobserve/reconcile/recovery edges must be declared deterministically.

## AY — Recovery anchor
Read-only contracts: input/evidence snapshot bindings.
Mutation contracts: target reference + task/session + relevant branch/PR/SHA/revision/job ID.

## AZ — Reconstruction rule
On process restart, reconstruct from authoritative stores and observations; do not rely on previous assistant text or a GWC workflow-state database.

## BA — Autonomy behavior
AUTO_CONTINUE when exactly one legal route exists and required evidence is sufficient; WAIT_EXTERNAL/BLOCK_LOCAL/fail-closed otherwise.


---

# GW-64 — DOCUMENTATION_AUTODEPLOY

## A — Identity
- **Contract ID:** `GW-64`
- **Canonical name:** `DOCUMENTATION_AUTODEPLOY`
- **Family:** `H — Verification and Closure`
- **Contract version:** `1` (conceptual baseline)
- **Profile(s):** `DEPLOY_OBSERVER`
- **Architectural status:** `REUSE/EXTEND`
- **Integration class:** `REUSE/EXTEND`

## B — Purpose
Formaliser la responsabilité `DOCUMENTATION_AUTODEPLOY` comme contrat borné, versionné et composable, sans dupliquer les autorités existantes.

**Non-responsibilities:** does not steal ownership from Task Queue, Session, Lock Service, Live State, GitRegistry, GitHub, deploy/runtime or other downstream contracts.

## C — Position in global system
- **Logical predecessor(s):** GW-63
- **Logical successor(s):** GW-65
- **Re-entry:** allowed when authoritative evidence shows this contract’s postcondition is not yet proven.
- **Skip:** only when an explicit deterministic `SKIPPABLE_IF` condition exists.
- **Reobserve/Reconcile:** first-class graph edges, never implicit retries.

## D — Chronological role
- **Transport chronology:** may differ from GW numeric order.
- **Functional chronology:** `GW-64` owns only `DOCUMENTATION_AUTODEPLOY` responsibility.
- **Runtime chronology:** resolved by Workflow Graph, not `stepId + 1`.

## E — Contract input
Sorties prouvées des prédécesseurs applicables, contexte cible borné, références d’autorité nécessaires à `DOCUMENTATION_AUTODEPLOY`.

Input fields must be bounded, provenance-aware and typed as hint/claim/evidence/fact; raw secret material is forbidden unless explicitly unavoidable and ephemeral.

## F — Information semantics
Every field is classified as one of:
`RAW_INPUT | HINT | CLAIM | OBSERVATION | EVIDENCE | DERIVED_FACT | AUTHORITATIVE_FACT | DECISION | ATTESTATION`.

No contract upgrades a `HINT` to an authoritative fact without the owning evidence.

## G — Authorities
Autorités existantes correspondant aux faits consommés; aucune nouvelle source de vérité créée par GWC.

**Forbidden authority pattern:** no arbitrary Markdown, prompt text, tool availability or remembered state may override the actual owning authority.

## H — Preconditions
- Structural input valid and bounded.
- Required authorities reachable or explicitly `UNAVAILABLE`.
- Required freshness/revision/SHA bindings available.
- No contradictory prerequisite state.
- For mutations: session/receipt/task/locks/governance requirements satisfied.

## I — Internal micro-state machine
validate bounded input → collect/validate required evidence → evaluate local invariants → derive domain status → derive routing disposition → emit bounded output.

## J — Transformation / decision algorithm
1. Parse/validate bounded input.
2. Determine required authority observations.
3. Refuse guesses for missing facts.
4. Apply contract-local invariants.
5. Produce domain status.
6. Produce engine disposition.
7. For mutations only, produce EffectPlan; never mutate from evaluation code directly.
8. Emit bounded output and evidence references.

## K — Determinism
- **Class:** `DEPLOY_OBSERVER` with execution semantics `OBSERVE_AND_EVALUATE`.
- Pure/read-only contracts are deterministic given identical normalized input and identical evidence snapshot.
- Observation-dependent contracts bind result to evidence freshness/revisions.

## L — Invariants
Global GWC invariants + no over-interpretation of predecessor output + bounded data + fail closed on missing evidence.

Plus all global GWC invariants.

## M — Action model
- **Allowed action kinds:** READ / DERIVE
- **Forbidden:** hidden mutation, authority bypass, stale evidence reuse, arbitrary shell fallback, unbounded projection.

## N — Current execution owner vs target owner
CURRENT: existing subsystem(s) listed in AM. TARGET: same owning authority behind a GWC adapter/contract wrapper.

## O — Capability / authorization model
For any mutation:
`callable ∧ authorized ∧ safeNow ∧ preconditionsSatisfied ∧ concurrencySatisfied = mayExecute`.
A present tool is never permission by itself.

## P — Lock model
No new lock unless EffectPlan declares a collision domain; consume existing Lock Service.

## Q — Concurrency model
Independent tasks may proceed in parallel when dependency/resource/lock scopes do not conflict.
Local blockers remain local.
Operational Memory process-local serialization is not treated as distributed locking.

## R — Output contract
- **Canonical output:** `DocsDeployObservation`
- Bounded, typed, provenance-aware.
- No secret/raw credential projection.
- Consumers must not over-interpret this output beyond its declared semantics.

## S — Terminal statuses
`SUCCESS | NONE | AMBIGUOUS | UNVERIFIED | BLOCKED | CONFLICT | STALE (subset applicable)`

## T — Terminality formula
Success requires all contract-owned postconditions to be proven from current required evidence.
Missing/stale/conflicting evidence maps to fail-closed statuses, never implicit success.

## U — Reason codes
Contract-specific reason codes must be stable, enumerable, bounded and machine-testable.
Every failure/blocking reason must identify whether it is recoverable by reobserve, reconcile, wait or explicit change.

## V — Fail-closed model
Missing/stale/conflicting required evidence never defaults to success or permission. UNKNOWN remains UNKNOWN.

## W — Evidence model
EvidenceEnvelope(s) from the owning authorities with freshness, provenance and relevant SHA/revision binding.

## X — Freshness / staleness
Evidence is bound to relevant `observedAt`, SHA, stateVersion and/or revisions.
A semantic state change invalidates dependent evidence when its contract declares such dependency.

## Y — Attestation model
EPHEMERAL_RESULT_ONLY by default; promote to bounded durable reference only where an existing authority requires durable proof.

## Z — Persistence model
No new GWC store. Persist only through the existing owning authority when the contract is a RECORD/MUTATE step.

## AA — Secret / privacy model
Never persist tokens, resume secrets, raw authorization headers, arbitrary transport IDs, `.env` material or unbounded prompt bodies.
Use digests/bounded projections where persistence is necessary.

## AB — Replay model
`READ_ONLY`

## AC — Recovery model
Recovery starts by observing the owning authority.
A mutation is replayed only when its replay class explicitly allows it and the recovery anchor proves it has not already happened.

## AD — Security / threat model
Prevent authority confusion, cross-session/repo/project leakage, stale evidence reuse, duplicate mutation, secret leakage and false attestation.

## AE — Observability
Emit bounded start/result/failure/reason-code observations where useful.
Observability is not authority.

## AF — Interface contract with predecessors
Consumes only the predecessor fields whose semantics are explicitly declared.
Revalidates any field whose freshness/ownership requires it.

## AG — Interface contract with successors
Exports `DocsDeployObservation` with explicit semantics; successor may not silently strengthen it.

## AH — Skip contract
No skip unless the graph contains a deterministic condition and proof source.
If skipped, the route and proof are observable.

## AI — Reobserve contract
Reobserve when required evidence is stale, unavailable-but-recoverable, or an external asynchronous condition may have progressed.

## AJ — Reconcile contract
Reconcile only when multiple authorities/state projections are inconsistent.
Reconcile is not the same as refreshing an observation.

## AK — Blocked behavior
Block only the affected Task/contract/resource scope unless an actual global invariant is violated.

## AL — Compensation / rollback
For pure/read-only contracts: not applicable.
For mutations: use existing rollback/compensation only where real; otherwise forward recovery by observation. Never pretend irreversible GitHub effects are rollbackable.

## AM — Existing system mapping
- **Current mapping:** Existing deploy workflow on main push.
- **Classification:** `REUSE/EXTEND`
- Existing behavior is preserved and wrapped/generalized before new engines are introduced.

## AN — Current hardcodes / generalization
MCP/S1/repository literals and single-repository assumptions must move to TargetContext/configuration where applicable; preserve historical MCP behavior backward-compatibly.

## AO — Future implementation slot
Implement behind a GWC contract module + adapter to existing authority. Exact file placement must follow repository architecture discovered at implementation baseline, not be invented prematurely.

## AP — Test contract
happy path; boundary; NONE/AMBIGUOUS/UNVERIFIED/STALE/CONFLICT as applicable; replay/recovery; security; non-regression; exact binding tests.

## AQ — Property / invariant tests
- Unknown evidence never becomes allow/success.
- Explicit predecessor semantics are preserved.
- No hidden mutation.
- Same normalized input + same evidence ⇒ same semantic result for deterministic profiles.
- Mutation contracts never execute without a valid EffectPlan.

## AR — Acceptance criteria
- Input/output schemas are bounded.
- Owning authorities are explicit.
- Fail-closed paths are tested.
- Replay/recovery behavior is defined.
- No new parallel authority.
- Existing non-regression suite remains green.

## AS — Open questions
No blocking open decision beyond profile-specific implementation details; unresolved choices must stay explicit.

## AT — Architectural findings
- Existing implementation class: `REUSE/EXTEND`.
- Any discovered hardcode is treated as a generalization target, not silently removed.
- Any mismatch between CURRENT and TARGET is explicit.

## AU — Future Task Blueprint mapping
This contract is implemented by one or more governed implementation tasks from `GWC_IMPLEMENTATION_TASK_BLUEPRINTS_R1.md`; implementation dependencies follow the contract graph and authority dependencies rather than numeric GW order alone.

## AV — Execution semantics
`OBSERVE_AND_EVALUATE`

## AW — Effect Plan
None.

## AX — Routing table
Primary predecessor: GW-63. Primary successor: GW-65. Additional skip/reobserve/reconcile/recovery edges must be declared deterministically.

## AY — Recovery anchor
Read-only contracts: input/evidence snapshot bindings.
Mutation contracts: target reference + task/session + relevant branch/PR/SHA/revision/job ID.

## AZ — Reconstruction rule
On process restart, reconstruct from authoritative stores and observations; do not rely on previous assistant text or a GWC workflow-state database.

## BA — Autonomy behavior
AUTO_CONTINUE when exactly one legal route exists and required evidence is sufficient; WAIT_EXTERNAL/BLOCK_LOCAL/fail-closed otherwise.


---

# GW-65 — DOCUMENTATION_LIVE_STATE

## A — Identity
- **Contract ID:** `GW-65`
- **Canonical name:** `DOCUMENTATION_LIVE_STATE`
- **Family:** `H — Verification and Closure`
- **Contract version:** `1` (conceptual baseline)
- **Profile(s):** `RECONCILER`
- **Architectural status:** `REUSE/GENERALIZE`
- **Integration class:** `REUSE/GENERALIZE`

## B — Purpose
Formaliser la responsabilité `DOCUMENTATION_LIVE_STATE` comme contrat borné, versionné et composable, sans dupliquer les autorités existantes.

**Non-responsibilities:** does not steal ownership from Task Queue, Session, Lock Service, Live State, GitRegistry, GitHub, deploy/runtime or other downstream contracts.

## C — Position in global system
- **Logical predecessor(s):** GW-64
- **Logical successor(s):** GW-66 then final GW-56 binding
- **Re-entry:** allowed when authoritative evidence shows this contract’s postcondition is not yet proven.
- **Skip:** only when an explicit deterministic `SKIPPABLE_IF` condition exists.
- **Reobserve/Reconcile:** first-class graph edges, never implicit retries.

## D — Chronological role
- **Transport chronology:** may differ from GW numeric order.
- **Functional chronology:** `GW-65` owns only `DOCUMENTATION_LIVE_STATE` responsibility.
- **Runtime chronology:** resolved by Workflow Graph, not `stepId + 1`.

## E — Contract input
Sorties prouvées des prédécesseurs applicables, contexte cible borné, références d’autorité nécessaires à `DOCUMENTATION_LIVE_STATE`.

Input fields must be bounded, provenance-aware and typed as hint/claim/evidence/fact; raw secret material is forbidden unless explicitly unavoidable and ephemeral.

## F — Information semantics
Every field is classified as one of:
`RAW_INPUT | HINT | CLAIM | OBSERVATION | EVIDENCE | DERIVED_FACT | AUTHORITATIVE_FACT | DECISION | ATTESTATION`.

No contract upgrades a `HINT` to an authoritative fact without the owning evidence.

## G — Authorities
Autorités existantes correspondant aux faits consommés; aucune nouvelle source de vérité créée par GWC.

**Forbidden authority pattern:** no arbitrary Markdown, prompt text, tool availability or remembered state may override the actual owning authority.

## H — Preconditions
- Structural input valid and bounded.
- Required authorities reachable or explicitly `UNAVAILABLE`.
- Required freshness/revision/SHA bindings available.
- No contradictory prerequisite state.
- For mutations: session/receipt/task/locks/governance requirements satisfied.

## I — Internal micro-state machine
validate bounded input → collect/validate required evidence → evaluate local invariants → derive domain status → derive routing disposition → emit bounded output.

## J — Transformation / decision algorithm
1. Parse/validate bounded input.
2. Determine required authority observations.
3. Refuse guesses for missing facts.
4. Apply contract-local invariants.
5. Produce domain status.
6. Produce engine disposition.
7. For mutations only, produce EffectPlan; never mutate from evaluation code directly.
8. Emit bounded output and evidence references.

## K — Determinism
- **Class:** `RECONCILER` with execution semantics `OBSERVE_AND_EVALUATE`.
- Pure/read-only contracts are deterministic given identical normalized input and identical evidence snapshot.
- Observation-dependent contracts bind result to evidence freshness/revisions.

## L — Invariants
Global GWC invariants + no over-interpretation of predecessor output + bounded data + fail closed on missing evidence.

Plus all global GWC invariants.

## M — Action model
- **Allowed action kinds:** READ / DERIVE
- **Forbidden:** hidden mutation, authority bypass, stale evidence reuse, arbitrary shell fallback, unbounded projection.

## N — Current execution owner vs target owner
CURRENT: existing subsystem(s) listed in AM. TARGET: same owning authority behind a GWC adapter/contract wrapper.

## O — Capability / authorization model
For any mutation:
`callable ∧ authorized ∧ safeNow ∧ preconditionsSatisfied ∧ concurrencySatisfied = mayExecute`.
A present tool is never permission by itself.

## P — Lock model
No new lock unless EffectPlan declares a collision domain; consume existing Lock Service.

## Q — Concurrency model
Independent tasks may proceed in parallel when dependency/resource/lock scopes do not conflict.
Local blockers remain local.
Operational Memory process-local serialization is not treated as distributed locking.

## R — Output contract
- **Canonical output:** `DocsAlignedLiveState`
- Bounded, typed, provenance-aware.
- No secret/raw credential projection.
- Consumers must not over-interpret this output beyond its declared semantics.

## S — Terminal statuses
`SUCCESS | NONE | AMBIGUOUS | UNVERIFIED | BLOCKED | CONFLICT | STALE (subset applicable)`

## T — Terminality formula
Success requires all contract-owned postconditions to be proven from current required evidence.
Missing/stale/conflicting evidence maps to fail-closed statuses, never implicit success.

## U — Reason codes
Contract-specific reason codes must be stable, enumerable, bounded and machine-testable.
Every failure/blocking reason must identify whether it is recoverable by reobserve, reconcile, wait or explicit change.

## V — Fail-closed model
Missing/stale/conflicting required evidence never defaults to success or permission. UNKNOWN remains UNKNOWN.

## W — Evidence model
EvidenceEnvelope(s) from the owning authorities with freshness, provenance and relevant SHA/revision binding.

## X — Freshness / staleness
Evidence is bound to relevant `observedAt`, SHA, stateVersion and/or revisions.
A semantic state change invalidates dependent evidence when its contract declares such dependency.

## Y — Attestation model
EPHEMERAL_RESULT_ONLY by default; promote to bounded durable reference only where an existing authority requires durable proof.

## Z — Persistence model
No new GWC store. Persist only through the existing owning authority when the contract is a RECORD/MUTATE step.

## AA — Secret / privacy model
Never persist tokens, resume secrets, raw authorization headers, arbitrary transport IDs, `.env` material or unbounded prompt bodies.
Use digests/bounded projections where persistence is necessary.

## AB — Replay model
`READ_ONLY`

## AC — Recovery model
Recovery starts by observing the owning authority.
A mutation is replayed only when its replay class explicitly allows it and the recovery anchor proves it has not already happened.

## AD — Security / threat model
Prevent authority confusion, cross-session/repo/project leakage, stale evidence reuse, duplicate mutation, secret leakage and false attestation.

## AE — Observability
Emit bounded start/result/failure/reason-code observations where useful.
Observability is not authority.

## AF — Interface contract with predecessors
Consumes only the predecessor fields whose semantics are explicitly declared.
Revalidates any field whose freshness/ownership requires it.

## AG — Interface contract with successors
Exports `DocsAlignedLiveState` with explicit semantics; successor may not silently strengthen it.

## AH — Skip contract
No skip unless the graph contains a deterministic condition and proof source.
If skipped, the route and proof are observable.

## AI — Reobserve contract
Reobserve when required evidence is stale, unavailable-but-recoverable, or an external asynchronous condition may have progressed.

## AJ — Reconcile contract
Reconcile only when multiple authorities/state projections are inconsistent.
Reconcile is not the same as refreshing an observation.

## AK — Blocked behavior
Block only the affected Task/contract/resource scope unless an actual global invariant is violated.

## AL — Compensation / rollback
For pure/read-only contracts: not applicable.
For mutations: use existing rollback/compensation only where real; otherwise forward recovery by observation. Never pretend irreversible GitHub effects are rollbackable.

## AM — Existing system mapping
- **Current mapping:** Live State docs alignment.
- **Classification:** `REUSE/GENERALIZE`
- Existing behavior is preserved and wrapped/generalized before new engines are introduced.

## AN — Current hardcodes / generalization
MCP/S1/repository literals and single-repository assumptions must move to TargetContext/configuration where applicable; preserve historical MCP behavior backward-compatibly.

## AO — Future implementation slot
Implement behind a GWC contract module + adapter to existing authority. Exact file placement must follow repository architecture discovered at implementation baseline, not be invented prematurely.

## AP — Test contract
happy path; boundary; NONE/AMBIGUOUS/UNVERIFIED/STALE/CONFLICT as applicable; replay/recovery; security; non-regression; exact binding tests.

## AQ — Property / invariant tests
- Unknown evidence never becomes allow/success.
- Explicit predecessor semantics are preserved.
- No hidden mutation.
- Same normalized input + same evidence ⇒ same semantic result for deterministic profiles.
- Mutation contracts never execute without a valid EffectPlan.

## AR — Acceptance criteria
- Input/output schemas are bounded.
- Owning authorities are explicit.
- Fail-closed paths are tested.
- Replay/recovery behavior is defined.
- No new parallel authority.
- Existing non-regression suite remains green.

## AS — Open questions
No blocking open decision beyond profile-specific implementation details; unresolved choices must stay explicit.

## AT — Architectural findings
- Existing implementation class: `REUSE/GENERALIZE`.
- Any discovered hardcode is treated as a generalization target, not silently removed.
- Any mismatch between CURRENT and TARGET is explicit.

## AU — Future Task Blueprint mapping
This contract is implemented by one or more governed implementation tasks from `GWC_IMPLEMENTATION_TASK_BLUEPRINTS_R1.md`; implementation dependencies follow the contract graph and authority dependencies rather than numeric GW order alone.

## AV — Execution semantics
`OBSERVE_AND_EVALUATE`

## AW — Effect Plan
None.

## AX — Routing table
Primary predecessor: GW-64. Primary successor: GW-66 then final GW-56 binding. Additional skip/reobserve/reconcile/recovery edges must be declared deterministically.

## AY — Recovery anchor
Read-only contracts: input/evidence snapshot bindings.
Mutation contracts: target reference + task/session + relevant branch/PR/SHA/revision/job ID.

## AZ — Reconstruction rule
On process restart, reconstruct from authoritative stores and observations; do not rely on previous assistant text or a GWC workflow-state database.

## BA — Autonomy behavior
AUTO_CONTINUE when exactly one legal route exists and required evidence is sufficient; WAIT_EXTERNAL/BLOCK_LOCAL/fail-closed otherwise.


---

# GW-66 — TERMINAL_RECEIPT_REFRESH

## A — Identity
- **Contract ID:** `GW-66`
- **Canonical name:** `TERMINAL_RECEIPT_REFRESH`
- **Family:** `H — Verification and Closure`
- **Contract version:** `1` (conceptual baseline)
- **Profile(s):** `SESSION_MUTATION`
- **Architectural status:** `REUSE`
- **Integration class:** `REUSE`

## B — Purpose
Formaliser la responsabilité `TERMINAL_RECEIPT_REFRESH` comme contrat borné, versionné et composable, sans dupliquer les autorités existantes.

**Non-responsibilities:** does not steal ownership from Task Queue, Session, Lock Service, Live State, GitRegistry, GitHub, deploy/runtime or other downstream contracts.

## C — Position in global system
- **Logical predecessor(s):** GW-65
- **Logical successor(s):** GW-67
- **Re-entry:** allowed when authoritative evidence shows this contract’s postcondition is not yet proven.
- **Skip:** only when an explicit deterministic `SKIPPABLE_IF` condition exists.
- **Reobserve/Reconcile:** first-class graph edges, never implicit retries.

## D — Chronological role
- **Transport chronology:** may differ from GW numeric order.
- **Functional chronology:** `GW-66` owns only `TERMINAL_RECEIPT_REFRESH` responsibility.
- **Runtime chronology:** resolved by Workflow Graph, not `stepId + 1`.

## E — Contract input
Sorties prouvées des prédécesseurs applicables, contexte cible borné, références d’autorité nécessaires à `TERMINAL_RECEIPT_REFRESH`.

Input fields must be bounded, provenance-aware and typed as hint/claim/evidence/fact; raw secret material is forbidden unless explicitly unavoidable and ephemeral.

## F — Information semantics
Every field is classified as one of:
`RAW_INPUT | HINT | CLAIM | OBSERVATION | EVIDENCE | DERIVED_FACT | AUTHORITATIVE_FACT | DECISION | ATTESTATION`.

No contract upgrades a `HINT` to an authoritative fact without the owning evidence.

## G — Authorities
Autorités existantes correspondant aux faits consommés; aucune nouvelle source de vérité créée par GWC.

**Forbidden authority pattern:** no arbitrary Markdown, prompt text, tool availability or remembered state may override the actual owning authority.

## H — Preconditions
- Structural input valid and bounded.
- Required authorities reachable or explicitly `UNAVAILABLE`.
- Required freshness/revision/SHA bindings available.
- No contradictory prerequisite state.
- For mutations: session/receipt/task/locks/governance requirements satisfied.

## I — Internal micro-state machine
validate bounded input → collect/validate required evidence → evaluate local invariants → derive domain status → derive routing disposition → emit bounded output.

## J — Transformation / decision algorithm
1. Parse/validate bounded input.
2. Determine required authority observations.
3. Refuse guesses for missing facts.
4. Apply contract-local invariants.
5. Produce domain status.
6. Produce engine disposition.
7. For mutations only, produce EffectPlan; never mutate from evaluation code directly.
8. Emit bounded output and evidence references.

## K — Determinism
- **Class:** `SESSION_MUTATION` with execution semantics `MUTATE_THEN_VERIFY`.
- Pure/read-only contracts are deterministic given identical normalized input and identical evidence snapshot.
- Observation-dependent contracts bind result to evidence freshness/revisions.

## L — Invariants
Global GWC invariants + no over-interpretation of predecessor output + bounded data + fail closed on missing evidence.

Plus all global GWC invariants.

## M — Action model
- **Allowed action kinds:** READ / DERIVE / RECORD / MUTATE
- **Forbidden:** hidden mutation, authority bypass, stale evidence reuse, arbitrary shell fallback, unbounded projection.

## N — Current execution owner vs target owner
CURRENT: existing subsystem(s) listed in AM. TARGET: same owning authority behind a GWC adapter/contract wrapper.

## O — Capability / authorization model
For any mutation:
`callable ∧ authorized ∧ safeNow ∧ preconditionsSatisfied ∧ concurrencySatisfied = mayExecute`.
A present tool is never permission by itself.

## P — Lock model
No new lock unless EffectPlan declares a collision domain; consume existing Lock Service.

## Q — Concurrency model
Independent tasks may proceed in parallel when dependency/resource/lock scopes do not conflict.
Local blockers remain local.
Operational Memory process-local serialization is not treated as distributed locking.

## R — Output contract
- **Canonical output:** `TerminalReceipt`
- Bounded, typed, provenance-aware.
- No secret/raw credential projection.
- Consumers must not over-interpret this output beyond its declared semantics.

## S — Terminal statuses
`SUCCESS | NONE | AMBIGUOUS | UNVERIFIED | BLOCKED | CONFLICT | STALE (subset applicable)`

## T — Terminality formula
Success requires all contract-owned postconditions to be proven from current required evidence.
Missing/stale/conflicting evidence maps to fail-closed statuses, never implicit success.

## U — Reason codes
Contract-specific reason codes must be stable, enumerable, bounded and machine-testable.
Every failure/blocking reason must identify whether it is recoverable by reobserve, reconcile, wait or explicit change.

## V — Fail-closed model
Missing/stale/conflicting required evidence never defaults to success or permission. UNKNOWN remains UNKNOWN.

## W — Evidence model
EvidenceEnvelope(s) from the owning authorities with freshness, provenance and relevant SHA/revision binding.

## X — Freshness / staleness
Evidence is bound to relevant `observedAt`, SHA, stateVersion and/or revisions.
A semantic state change invalidates dependent evidence when its contract declares such dependency.

## Y — Attestation model
EPHEMERAL_RESULT_ONLY by default; promote to bounded durable reference only where an existing authority requires durable proof.

## Z — Persistence model
No new GWC store. Persist only through the existing owning authority when the contract is a RECORD/MUTATE step.

## AA — Secret / privacy model
Never persist tokens, resume secrets, raw authorization headers, arbitrary transport IDs, `.env` material or unbounded prompt bodies.
Use digests/bounded projections where persistence is necessary.

## AB — Replay model
`CONDITIONALLY_IDEMPOTENT unless explicitly NON_REPLAYABLE`

## AC — Recovery model
Recovery starts by observing the owning authority.
A mutation is replayed only when its replay class explicitly allows it and the recovery anchor proves it has not already happened.

## AD — Security / threat model
Prevent authority confusion, cross-session/repo/project leakage, stale evidence reuse, duplicate mutation, secret leakage and false attestation.

## AE — Observability
Emit bounded start/result/failure/reason-code observations where useful.
Observability is not authority.

## AF — Interface contract with predecessors
Consumes only the predecessor fields whose semantics are explicitly declared.
Revalidates any field whose freshness/ownership requires it.

## AG — Interface contract with successors
Exports `TerminalReceipt` with explicit semantics; successor may not silently strengthen it.

## AH — Skip contract
No skip unless the graph contains a deterministic condition and proof source.
If skipped, the route and proof are observable.

## AI — Reobserve contract
Reobserve when required evidence is stale, unavailable-but-recoverable, or an external asynchronous condition may have progressed.

## AJ — Reconcile contract
Reconcile only when multiple authorities/state projections are inconsistent.
Reconcile is not the same as refreshing an observation.

## AK — Blocked behavior
Block only the affected Task/contract/resource scope unless an actual global invariant is violated.

## AL — Compensation / rollback
For pure/read-only contracts: not applicable.
For mutations: use existing rollback/compensation only where real; otherwise forward recovery by observation. Never pretend irreversible GitHub effects are rollbackable.

## AM — Existing system mapping
- **Current mapping:** Receipt freshness/acknowledge reuse.
- **Classification:** `REUSE`
- Existing behavior is preserved and wrapped/generalized before new engines are introduced.

## AN — Current hardcodes / generalization
MCP/S1/repository literals and single-repository assumptions must move to TargetContext/configuration where applicable; preserve historical MCP behavior backward-compatibly.

## AO — Future implementation slot
Implement behind a GWC contract module + adapter to existing authority. Exact file placement must follow repository architecture discovered at implementation baseline, not be invented prematurely.

## AP — Test contract
happy path; boundary; NONE/AMBIGUOUS/UNVERIFIED/STALE/CONFLICT as applicable; replay/recovery; security; non-regression; exact binding tests.

## AQ — Property / invariant tests
- Unknown evidence never becomes allow/success.
- Explicit predecessor semantics are preserved.
- No hidden mutation.
- Same normalized input + same evidence ⇒ same semantic result for deterministic profiles.
- Mutation contracts never execute without a valid EffectPlan.

## AR — Acceptance criteria
- Input/output schemas are bounded.
- Owning authorities are explicit.
- Fail-closed paths are tested.
- Replay/recovery behavior is defined.
- No new parallel authority.
- Existing non-regression suite remains green.

## AS — Open questions
No blocking open decision beyond profile-specific implementation details; unresolved choices must stay explicit.

## AT — Architectural findings
- Existing implementation class: `REUSE`.
- Any discovered hardcode is treated as a generalization target, not silently removed.
- Any mismatch between CURRENT and TARGET is explicit.

## AU — Future Task Blueprint mapping
This contract is implemented by one or more governed implementation tasks from `GWC_IMPLEMENTATION_TASK_BLUEPRINTS_R1.md`; implementation dependencies follow the contract graph and authority dependencies rather than numeric GW order alone.

## AV — Execution semantics
`MUTATE_THEN_VERIFY`

## AW — Effect Plan
Must be represented as an explicit EffectPlan with target authority, expected revisions/SHA, lock requirements, replay class, postconditions and recovery anchor.

## AX — Routing table
Primary predecessor: GW-65. Primary successor: GW-67. Additional skip/reobserve/reconcile/recovery edges must be declared deterministically.

## AY — Recovery anchor
Read-only contracts: input/evidence snapshot bindings.
Mutation contracts: target reference + task/session + relevant branch/PR/SHA/revision/job ID.

## AZ — Reconstruction rule
On process restart, reconstruct from authoritative stores and observations; do not rely on previous assistant text or a GWC workflow-state database.

## BA — Autonomy behavior
AUTO_CONTINUE when exactly one legal route exists and required evidence is sufficient; WAIT_EXTERNAL/BLOCK_LOCAL/fail-closed otherwise.


---

# GW-67 — TASK_VERIFYING

## A — Identity
- **Contract ID:** `GW-67`
- **Canonical name:** `TASK_VERIFYING`
- **Family:** `H — Verification and Closure`
- **Contract version:** `1` (conceptual baseline)
- **Profile(s):** `TASK_MUTATION`
- **Architectural status:** `REUSE`
- **Integration class:** `REUSE`

## B — Purpose
Formaliser la responsabilité `TASK_VERIFYING` comme contrat borné, versionné et composable, sans dupliquer les autorités existantes.

**Non-responsibilities:** does not steal ownership from Task Queue, Session, Lock Service, Live State, GitRegistry, GitHub, deploy/runtime or other downstream contracts.

## C — Position in global system
- **Logical predecessor(s):** GW-66
- **Logical successor(s):** GW-68
- **Re-entry:** allowed when authoritative evidence shows this contract’s postcondition is not yet proven.
- **Skip:** only when an explicit deterministic `SKIPPABLE_IF` condition exists.
- **Reobserve/Reconcile:** first-class graph edges, never implicit retries.

## D — Chronological role
- **Transport chronology:** may differ from GW numeric order.
- **Functional chronology:** `GW-67` owns only `TASK_VERIFYING` responsibility.
- **Runtime chronology:** resolved by Workflow Graph, not `stepId + 1`.

## E — Contract input
Sorties prouvées des prédécesseurs applicables, contexte cible borné, références d’autorité nécessaires à `TASK_VERIFYING`.

Input fields must be bounded, provenance-aware and typed as hint/claim/evidence/fact; raw secret material is forbidden unless explicitly unavoidable and ephemeral.

## F — Information semantics
Every field is classified as one of:
`RAW_INPUT | HINT | CLAIM | OBSERVATION | EVIDENCE | DERIVED_FACT | AUTHORITATIVE_FACT | DECISION | ATTESTATION`.

No contract upgrades a `HINT` to an authoritative fact without the owning evidence.

## G — Authorities
Autorités existantes correspondant aux faits consommés; aucune nouvelle source de vérité créée par GWC.

**Forbidden authority pattern:** no arbitrary Markdown, prompt text, tool availability or remembered state may override the actual owning authority.

## H — Preconditions
- Structural input valid and bounded.
- Required authorities reachable or explicitly `UNAVAILABLE`.
- Required freshness/revision/SHA bindings available.
- No contradictory prerequisite state.
- For mutations: session/receipt/task/locks/governance requirements satisfied.

## I — Internal micro-state machine
validate bounded input → collect/validate required evidence → evaluate local invariants → derive domain status → derive routing disposition → emit bounded output.

## J — Transformation / decision algorithm
1. Parse/validate bounded input.
2. Determine required authority observations.
3. Refuse guesses for missing facts.
4. Apply contract-local invariants.
5. Produce domain status.
6. Produce engine disposition.
7. For mutations only, produce EffectPlan; never mutate from evaluation code directly.
8. Emit bounded output and evidence references.

## K — Determinism
- **Class:** `TASK_MUTATION` with execution semantics `MUTATE_THEN_VERIFY`.
- Pure/read-only contracts are deterministic given identical normalized input and identical evidence snapshot.
- Observation-dependent contracts bind result to evidence freshness/revisions.

## L — Invariants
Global GWC invariants + no over-interpretation of predecessor output + bounded data + fail closed on missing evidence.

Plus all global GWC invariants.

## M — Action model
- **Allowed action kinds:** READ / DERIVE / RECORD / MUTATE
- **Forbidden:** hidden mutation, authority bypass, stale evidence reuse, arbitrary shell fallback, unbounded projection.

## N — Current execution owner vs target owner
CURRENT: existing subsystem(s) listed in AM. TARGET: same owning authority behind a GWC adapter/contract wrapper.

## O — Capability / authorization model
For any mutation:
`callable ∧ authorized ∧ safeNow ∧ preconditionsSatisfied ∧ concurrencySatisfied = mayExecute`.
A present tool is never permission by itself.

## P — Lock model
No new lock unless EffectPlan declares a collision domain; consume existing Lock Service.

## Q — Concurrency model
Independent tasks may proceed in parallel when dependency/resource/lock scopes do not conflict.
Local blockers remain local.
Operational Memory process-local serialization is not treated as distributed locking.

## R — Output contract
- **Canonical output:** `VerifyingTask`
- Bounded, typed, provenance-aware.
- No secret/raw credential projection.
- Consumers must not over-interpret this output beyond its declared semantics.

## S — Terminal statuses
`SUCCESS | NONE | AMBIGUOUS | UNVERIFIED | BLOCKED | CONFLICT | STALE (subset applicable)`

## T — Terminality formula
Success requires all contract-owned postconditions to be proven from current required evidence.
Missing/stale/conflicting evidence maps to fail-closed statuses, never implicit success.

## U — Reason codes
Contract-specific reason codes must be stable, enumerable, bounded and machine-testable.
Every failure/blocking reason must identify whether it is recoverable by reobserve, reconcile, wait or explicit change.

## V — Fail-closed model
Missing/stale/conflicting required evidence never defaults to success or permission. UNKNOWN remains UNKNOWN.

## W — Evidence model
EvidenceEnvelope(s) from the owning authorities with freshness, provenance and relevant SHA/revision binding.

## X — Freshness / staleness
Evidence is bound to relevant `observedAt`, SHA, stateVersion and/or revisions.
A semantic state change invalidates dependent evidence when its contract declares such dependency.

## Y — Attestation model
EPHEMERAL_RESULT_ONLY by default; promote to bounded durable reference only where an existing authority requires durable proof.

## Z — Persistence model
No new GWC store. Persist only through the existing owning authority when the contract is a RECORD/MUTATE step.

## AA — Secret / privacy model
Never persist tokens, resume secrets, raw authorization headers, arbitrary transport IDs, `.env` material or unbounded prompt bodies.
Use digests/bounded projections where persistence is necessary.

## AB — Replay model
`CONDITIONALLY_IDEMPOTENT unless explicitly NON_REPLAYABLE`

## AC — Recovery model
Recovery starts by observing the owning authority.
A mutation is replayed only when its replay class explicitly allows it and the recovery anchor proves it has not already happened.

## AD — Security / threat model
Prevent authority confusion, cross-session/repo/project leakage, stale evidence reuse, duplicate mutation, secret leakage and false attestation.

## AE — Observability
Emit bounded start/result/failure/reason-code observations where useful.
Observability is not authority.

## AF — Interface contract with predecessors
Consumes only the predecessor fields whose semantics are explicitly declared.
Revalidates any field whose freshness/ownership requires it.

## AG — Interface contract with successors
Exports `VerifyingTask` with explicit semantics; successor may not silently strengthen it.

## AH — Skip contract
No skip unless the graph contains a deterministic condition and proof source.
If skipped, the route and proof are observable.

## AI — Reobserve contract
Reobserve when required evidence is stale, unavailable-but-recoverable, or an external asynchronous condition may have progressed.

## AJ — Reconcile contract
Reconcile only when multiple authorities/state projections are inconsistent.
Reconcile is not the same as refreshing an observation.

## AK — Blocked behavior
Block only the affected Task/contract/resource scope unless an actual global invariant is violated.

## AL — Compensation / rollback
For pure/read-only contracts: not applicable.
For mutations: use existing rollback/compensation only where real; otherwise forward recovery by observation. Never pretend irreversible GitHub effects are rollbackable.

## AM — Existing system mapping
- **Current mapping:** Task Queue VERIFYING transition.
- **Classification:** `REUSE`
- Existing behavior is preserved and wrapped/generalized before new engines are introduced.

## AN — Current hardcodes / generalization
MCP/S1/repository literals and single-repository assumptions must move to TargetContext/configuration where applicable; preserve historical MCP behavior backward-compatibly.

## AO — Future implementation slot
Implement behind a GWC contract module + adapter to existing authority. Exact file placement must follow repository architecture discovered at implementation baseline, not be invented prematurely.

## AP — Test contract
happy path; boundary; NONE/AMBIGUOUS/UNVERIFIED/STALE/CONFLICT as applicable; replay/recovery; security; non-regression; exact binding tests.

## AQ — Property / invariant tests
- Unknown evidence never becomes allow/success.
- Explicit predecessor semantics are preserved.
- No hidden mutation.
- Same normalized input + same evidence ⇒ same semantic result for deterministic profiles.
- Mutation contracts never execute without a valid EffectPlan.

## AR — Acceptance criteria
- Input/output schemas are bounded.
- Owning authorities are explicit.
- Fail-closed paths are tested.
- Replay/recovery behavior is defined.
- No new parallel authority.
- Existing non-regression suite remains green.

## AS — Open questions
No blocking open decision beyond profile-specific implementation details; unresolved choices must stay explicit.

## AT — Architectural findings
- Existing implementation class: `REUSE`.
- Any discovered hardcode is treated as a generalization target, not silently removed.
- Any mismatch between CURRENT and TARGET is explicit.

## AU — Future Task Blueprint mapping
This contract is implemented by one or more governed implementation tasks from `GWC_IMPLEMENTATION_TASK_BLUEPRINTS_R1.md`; implementation dependencies follow the contract graph and authority dependencies rather than numeric GW order alone.

## AV — Execution semantics
`MUTATE_THEN_VERIFY`

## AW — Effect Plan
Must be represented as an explicit EffectPlan with target authority, expected revisions/SHA, lock requirements, replay class, postconditions and recovery anchor.

## AX — Routing table
Primary predecessor: GW-66. Primary successor: GW-68. Additional skip/reobserve/reconcile/recovery edges must be declared deterministically.

## AY — Recovery anchor
Read-only contracts: input/evidence snapshot bindings.
Mutation contracts: target reference + task/session + relevant branch/PR/SHA/revision/job ID.

## AZ — Reconstruction rule
On process restart, reconstruct from authoritative stores and observations; do not rely on previous assistant text or a GWC workflow-state database.

## BA — Autonomy behavior
AUTO_CONTINUE when exactly one legal route exists and required evidence is sufficient; WAIT_EXTERNAL/BLOCK_LOCAL/fail-closed otherwise.


---

# GW-68 — TERMINAL_VERIFICATION

## A — Identity
- **Contract ID:** `GW-68`
- **Canonical name:** `TERMINAL_VERIFICATION`
- **Family:** `H — Verification and Closure`
- **Contract version:** `1` (conceptual baseline)
- **Profile(s):** `TERMINAL_DECISION`
- **Architectural status:** `PARTIAL/EXTEND`
- **Integration class:** `PARTIAL/EXTEND`

## B — Purpose
Décider factuellement si une Task VERIFYING peut légalement devenir DONE.

**Non-responsibilities:** does not steal ownership from Task Queue, Session, Lock Service, Live State, GitRegistry, GitHub, deploy/runtime or other downstream contracts.

## C — Position in global system
- **Logical predecessor(s):** GW-67
- **Logical successor(s):** GW-69 only if TERMINAL_VERIFIED
- **Re-entry:** allowed when authoritative evidence shows this contract’s postcondition is not yet proven.
- **Skip:** only when an explicit deterministic `SKIPPABLE_IF` condition exists.
- **Reobserve/Reconcile:** first-class graph edges, never implicit retries.

## D — Chronological role
- **Transport chronology:** may differ from GW numeric order.
- **Functional chronology:** `GW-68` owns only `TERMINAL_VERIFICATION` responsibility.
- **Runtime chronology:** resolved by Workflow Graph, not `stepId + 1`.

## E — Contract input
Task VERIFYING + final runtime binding + CI/deploy/live state/docs/review/receipt evidence.

Input fields must be bounded, provenance-aware and typed as hint/claim/evidence/fact; raw secret material is forbidden unless explicitly unavoidable and ephemeral.

## F — Information semantics
Every field is classified as one of:
`RAW_INPUT | HINT | CLAIM | OBSERVATION | EVIDENCE | DERIVED_FACT | AUTHORITATIVE_FACT | DECISION | ATTESTATION`.

No contract upgrades a `HINT` to an authoritative fact without the owning evidence.

## G — Authorities
Task Queue, GitHub, Live State, runtime/deploy evidence, Operational Memory.

**Forbidden authority pattern:** no arbitrary Markdown, prompt text, tool availability or remembered state may override the actual owning authority.

## H — Preconditions
- Structural input valid and bounded.
- Required authorities reachable or explicitly `UNAVAILABLE`.
- Required freshness/revision/SHA bindings available.
- No contradictory prerequisite state.
- For mutations: session/receipt/task/locks/governance requirements satisfied.

## I — Internal micro-state machine
verify task phase → ownership/session → final runtime binding → final CI/deploy → Live State current/aligned → docs aligned → receipt current → review/merge evidence → contradictions/locks → terminal decision.

## J — Transformation / decision algorithm
1. Parse/validate bounded input.
2. Determine required authority observations.
3. Refuse guesses for missing facts.
4. Apply contract-local invariants.
5. Produce domain status.
6. Produce engine disposition.
7. For mutations only, produce EffectPlan; never mutate from evaluation code directly.
8. Emit bounded output and evidence references.

## K — Determinism
- **Class:** `TERMINAL_DECISION` with execution semantics `EVALUATE_ONLY`.
- Pure/read-only contracts are deterministic given identical normalized input and identical evidence snapshot.
- Observation-dependent contracts bind result to evidence freshness/revisions.

## L — Invariants
NO_FALSE_DONE; own valid locks may still exist; no foreign conflicting lock; all final evidence coherent.

Plus all global GWC invariants.

## M — Action model
- **Allowed action kinds:** READ / DERIVE
- **Forbidden:** hidden mutation, authority bypass, stale evidence reuse, arbitrary shell fallback, unbounded projection.

## N — Current execution owner vs target owner
CURRENT: existing subsystem(s) listed in AM. TARGET: same owning authority behind a GWC adapter/contract wrapper.

## O — Capability / authorization model
For any mutation:
`callable ∧ authorized ∧ safeNow ∧ preconditionsSatisfied ∧ concurrencySatisfied = mayExecute`.
A present tool is never permission by itself.

## P — Lock model
Observe lock coherence only.

## Q — Concurrency model
Independent tasks may proceed in parallel when dependency/resource/lock scopes do not conflict.
Local blockers remain local.
Operational Memory process-local serialization is not treated as distributed locking.

## R — Output contract
- **Canonical output:** `TerminalVerification`
- Bounded, typed, provenance-aware.
- No secret/raw credential projection.
- Consumers must not over-interpret this output beyond its declared semantics.

## S — Terminal statuses
`TERMINAL_VERIFIED | STALE | UNVERIFIED | CONFLICT | BLOCKED`

## T — Terminality formula
Success requires all contract-owned postconditions to be proven from current required evidence.
Missing/stale/conflicting evidence maps to fail-closed statuses, never implicit success.

## U — Reason codes
Contract-specific reason codes must be stable, enumerable, bounded and machine-testable.
Every failure/blocking reason must identify whether it is recoverable by reobserve, reconcile, wait or explicit change.

## V — Fail-closed model
Missing/stale/conflicting required evidence never defaults to success or permission. UNKNOWN remains UNKNOWN.

## W — Evidence model
terminal evidence matrix bound to taskId and final relevant SHA(s).

## X — Freshness / staleness
Evidence is bound to relevant `observedAt`, SHA, stateVersion and/or revisions.
A semantic state change invalidates dependent evidence when its contract declares such dependency.

## Y — Attestation model
EPHEMERAL_RESULT_ONLY by default; promote to bounded durable reference only where an existing authority requires durable proof.

## Z — Persistence model
No new GWC store. Persist only through the existing owning authority when the contract is a RECORD/MUTATE step.

## AA — Secret / privacy model
Never persist tokens, resume secrets, raw authorization headers, arbitrary transport IDs, `.env` material or unbounded prompt bodies.
Use digests/bounded projections where persistence is necessary.

## AB — Replay model
`READ_ONLY / recalculable`

## AC — Recovery model
Recovery starts by observing the owning authority.
A mutation is replayed only when its replay class explicitly allows it and the recovery anchor proves it has not already happened.

## AD — Security / threat model
Prevent authority confusion, cross-session/repo/project leakage, stale evidence reuse, duplicate mutation, secret leakage and false attestation.

## AE — Observability
Emit bounded start/result/failure/reason-code observations where useful.
Observability is not authority.

## AF — Interface contract with predecessors
Consumes only the predecessor fields whose semantics are explicitly declared.
Revalidates any field whose freshness/ownership requires it.

## AG — Interface contract with successors
Exports `TerminalVerification` with explicit semantics; successor may not silently strengthen it.

## AH — Skip contract
No skip unless the graph contains a deterministic condition and proof source.
If skipped, the route and proof are observable.

## AI — Reobserve contract
Reobserve when required evidence is stale, unavailable-but-recoverable, or an external asynchronous condition may have progressed.

## AJ — Reconcile contract
Reconcile only when multiple authorities/state projections are inconsistent.
Reconcile is not the same as refreshing an observation.

## AK — Blocked behavior
Block only the affected Task/contract/resource scope unless an actual global invariant is violated.

## AL — Compensation / rollback
For pure/read-only contracts: not applicable.
For mutations: use existing rollback/compensation only where real; otherwise forward recovery by observation. Never pretend irreversible GitHub effects are rollbackable.

## AM — Existing system mapping
- **Current mapping:** TaskReality/Live State/GovernanceDecision pieces; no unique hard terminal gate.
- **Classification:** `PARTIAL/EXTEND`
- Existing behavior is preserved and wrapped/generalized before new engines are introduced.

## AN — Current hardcodes / generalization
MCP/S1/repository literals and single-repository assumptions must move to TargetContext/configuration where applicable; preserve historical MCP behavior backward-compatibly.

## AO — Future implementation slot
Implement behind a GWC contract module + adapter to existing authority. Exact file placement must follow repository architecture discovered at implementation baseline, not be invented prematurely.

## AP — Test contract
happy path; boundary; NONE/AMBIGUOUS/UNVERIFIED/STALE/CONFLICT as applicable; replay/recovery; security; non-regression; exact binding tests.

## AQ — Property / invariant tests
- Unknown evidence never becomes allow/success.
- Explicit predecessor semantics are preserved.
- No hidden mutation.
- Same normalized input + same evidence ⇒ same semantic result for deterministic profiles.
- Mutation contracts never execute without a valid EffectPlan.

## AR — Acceptance criteria
- Input/output schemas are bounded.
- Owning authorities are explicit.
- Fail-closed paths are tested.
- Replay/recovery behavior is defined.
- No new parallel authority.
- Existing non-regression suite remains green.

## AS — Open questions
Exact terminal evidence matrix may vary by project profile but must be explicit and testable.

## AT — Architectural findings
- Existing implementation class: `PARTIAL/EXTEND`.
- Any discovered hardcode is treated as a generalization target, not silently removed.
- Any mismatch between CURRENT and TARGET is explicit.

## AU — Future Task Blueprint mapping
This contract is implemented by one or more governed implementation tasks from `GWC_IMPLEMENTATION_TASK_BLUEPRINTS_R1.md`; implementation dependencies follow the contract graph and authority dependencies rather than numeric GW order alone.

## AV — Execution semantics
`EVALUATE_ONLY`

## AW — Effect Plan
None.

## AX — Routing table
Primary predecessor: GW-67. Primary successor: GW-69 only if TERMINAL_VERIFIED. Additional skip/reobserve/reconcile/recovery edges must be declared deterministically.

## AY — Recovery anchor
Read-only contracts: input/evidence snapshot bindings.
Mutation contracts: target reference + task/session + relevant branch/PR/SHA/revision/job ID.

## AZ — Reconstruction rule
On process restart, reconstruct from authoritative stores and observations; do not rely on previous assistant text or a GWC workflow-state database.

## BA — Autonomy behavior
AUTO_CONTINUE when exactly one legal route exists and required evidence is sufficient; WAIT_EXTERNAL/BLOCK_LOCAL/fail-closed otherwise.


---

# GW-69 — TASK_DONE

## A — Identity
- **Contract ID:** `GW-69`
- **Canonical name:** `TASK_DONE`
- **Family:** `H — Verification and Closure`
- **Contract version:** `1` (conceptual baseline)
- **Profile(s):** `TASK_MUTATION`
- **Architectural status:** `PARTIAL/REUSE`
- **Integration class:** `PARTIAL/REUSE`

## B — Purpose
Effectuer la mutation VERIFYING→DONE seulement après preuve GW-68.

**Non-responsibilities:** does not steal ownership from Task Queue, Session, Lock Service, Live State, GitRegistry, GitHub, deploy/runtime or other downstream contracts.

## C — Position in global system
- **Logical predecessor(s):** GW-68
- **Logical successor(s):** GW-70
- **Re-entry:** allowed when authoritative evidence shows this contract’s postcondition is not yet proven.
- **Skip:** only when an explicit deterministic `SKIPPABLE_IF` condition exists.
- **Reobserve/Reconcile:** first-class graph edges, never implicit retries.

## D — Chronological role
- **Transport chronology:** may differ from GW numeric order.
- **Functional chronology:** `GW-69` owns only `TASK_DONE` responsibility.
- **Runtime chronology:** resolved by Workflow Graph, not `stepId + 1`.

## E — Contract input
TerminalVerification=TERMINAL_VERIFIED + expected task revision.

Input fields must be bounded, provenance-aware and typed as hint/claim/evidence/fact; raw secret material is forbidden unless explicitly unavoidable and ephemeral.

## F — Information semantics
Every field is classified as one of:
`RAW_INPUT | HINT | CLAIM | OBSERVATION | EVIDENCE | DERIVED_FACT | AUTHORITATIVE_FACT | DECISION | ATTESTATION`.

No contract upgrades a `HINT` to an authoritative fact without the owning evidence.

## G — Authorities
Governed Task Queue.

**Forbidden authority pattern:** no arbitrary Markdown, prompt text, tool availability or remembered state may override the actual owning authority.

## H — Preconditions
- Structural input valid and bounded.
- Required authorities reachable or explicitly `UNAVAILABLE`.
- Required freshness/revision/SHA bindings available.
- No contradictory prerequisite state.
- For mutations: session/receipt/task/locks/governance requirements satisfied.

## I — Internal micro-state machine
validate terminal proof → verify task revision/status → mayExecute → transition DONE → re-read task → verify DONE.

## J — Transformation / decision algorithm
1. Parse/validate bounded input.
2. Determine required authority observations.
3. Refuse guesses for missing facts.
4. Apply contract-local invariants.
5. Produce domain status.
6. Produce engine disposition.
7. For mutations only, produce EffectPlan; never mutate from evaluation code directly.
8. Emit bounded output and evidence references.

## K — Determinism
- **Class:** `TASK_MUTATION` with execution semantics `MUTATE_THEN_VERIFY`.
- Pure/read-only contracts are deterministic given identical normalized input and identical evidence snapshot.
- Observation-dependent contracts bind result to evidence freshness/revisions.

## L — Invariants
GW-68 proof required; no direct DONE bypass.

Plus all global GWC invariants.

## M — Action model
- **Allowed action kinds:** READ / DERIVE / RECORD / MUTATE
- **Forbidden:** hidden mutation, authority bypass, stale evidence reuse, arbitrary shell fallback, unbounded projection.

## N — Current execution owner vs target owner
CURRENT: existing subsystem(s) listed in AM. TARGET: same owning authority behind a GWC adapter/contract wrapper.

## O — Capability / authorization model
For any mutation:
`callable ∧ authorized ∧ safeNow ∧ preconditionsSatisfied ∧ concurrencySatisfied = mayExecute`.
A present tool is never permission by itself.

## P — Lock model
Task/resource locks according to existing task scope.

## Q — Concurrency model
Independent tasks may proceed in parallel when dependency/resource/lock scopes do not conflict.
Local blockers remain local.
Operational Memory process-local serialization is not treated as distributed locking.

## R — Output contract
- **Canonical output:** `DoneTask`
- Bounded, typed, provenance-aware.
- No secret/raw credential projection.
- Consumers must not over-interpret this output beyond its declared semantics.

## S — Terminal statuses
`DONE | STALE | BLOCKED | CONFLICT`

## T — Terminality formula
Success requires all contract-owned postconditions to be proven from current required evidence.
Missing/stale/conflicting evidence maps to fail-closed statuses, never implicit success.

## U — Reason codes
Contract-specific reason codes must be stable, enumerable, bounded and machine-testable.
Every failure/blocking reason must identify whether it is recoverable by reobserve, reconcile, wait or explicit change.

## V — Fail-closed model
Missing/stale/conflicting required evidence never defaults to success or permission. UNKNOWN remains UNKNOWN.

## W — Evidence model
terminal proof reference + task revision + resulting DONE record.

## X — Freshness / staleness
Evidence is bound to relevant `observedAt`, SHA, stateVersion and/or revisions.
A semantic state change invalidates dependent evidence when its contract declares such dependency.

## Y — Attestation model
EPHEMERAL_RESULT_ONLY by default; promote to bounded durable reference only where an existing authority requires durable proof.

## Z — Persistence model
No new GWC store. Persist only through the existing owning authority when the contract is a RECORD/MUTATE step.

## AA — Secret / privacy model
Never persist tokens, resume secrets, raw authorization headers, arbitrary transport IDs, `.env` material or unbounded prompt bodies.
Use digests/bounded projections where persistence is necessary.

## AB — Replay model
`CONDITIONALLY_IDEMPOTENT`

## AC — Recovery model
Recovery starts by observing the owning authority.
A mutation is replayed only when its replay class explicitly allows it and the recovery anchor proves it has not already happened.

## AD — Security / threat model
Prevent authority confusion, cross-session/repo/project leakage, stale evidence reuse, duplicate mutation, secret leakage and false attestation.

## AE — Observability
Emit bounded start/result/failure/reason-code observations where useful.
Observability is not authority.

## AF — Interface contract with predecessors
Consumes only the predecessor fields whose semantics are explicitly declared.
Revalidates any field whose freshness/ownership requires it.

## AG — Interface contract with successors
Exports `DoneTask` with explicit semantics; successor may not silently strengthen it.

## AH — Skip contract
No skip unless the graph contains a deterministic condition and proof source.
If skipped, the route and proof are observable.

## AI — Reobserve contract
Reobserve when required evidence is stale, unavailable-but-recoverable, or an external asynchronous condition may have progressed.

## AJ — Reconcile contract
Reconcile only when multiple authorities/state projections are inconsistent.
Reconcile is not the same as refreshing an observation.

## AK — Blocked behavior
Block only the affected Task/contract/resource scope unless an actual global invariant is violated.

## AL — Compensation / rollback
For pure/read-only contracts: not applicable.
For mutations: use existing rollback/compensation only where real; otherwise forward recovery by observation. Never pretend irreversible GitHub effects are rollbackable.

## AM — Existing system mapping
- **Current mapping:** Task Queue VERIFYING→DONE exists but needs hard terminal proof requirement.
- **Classification:** `PARTIAL/REUSE`
- Existing behavior is preserved and wrapped/generalized before new engines are introduced.

## AN — Current hardcodes / generalization
MCP/S1/repository literals and single-repository assumptions must move to TargetContext/configuration where applicable; preserve historical MCP behavior backward-compatibly.

## AO — Future implementation slot
Implement behind a GWC contract module + adapter to existing authority. Exact file placement must follow repository architecture discovered at implementation baseline, not be invented prematurely.

## AP — Test contract
happy path; boundary; NONE/AMBIGUOUS/UNVERIFIED/STALE/CONFLICT as applicable; replay/recovery; security; non-regression; exact binding tests.

## AQ — Property / invariant tests
- Unknown evidence never becomes allow/success.
- Explicit predecessor semantics are preserved.
- No hidden mutation.
- Same normalized input + same evidence ⇒ same semantic result for deterministic profiles.
- Mutation contracts never execute without a valid EffectPlan.

## AR — Acceptance criteria
- Input/output schemas are bounded.
- Owning authorities are explicit.
- Fail-closed paths are tested.
- Replay/recovery behavior is defined.
- No new parallel authority.
- Existing non-regression suite remains green.

## AS — Open questions
Implementation choice: harden transitionTask or introduce dedicated completeTask operation.

## AT — Architectural findings
- Existing implementation class: `PARTIAL/REUSE`.
- Any discovered hardcode is treated as a generalization target, not silently removed.
- Any mismatch between CURRENT and TARGET is explicit.

## AU — Future Task Blueprint mapping
This contract is implemented by one or more governed implementation tasks from `GWC_IMPLEMENTATION_TASK_BLUEPRINTS_R1.md`; implementation dependencies follow the contract graph and authority dependencies rather than numeric GW order alone.

## AV — Execution semantics
`MUTATE_THEN_VERIFY`

## AW — Effect Plan
Must be represented as an explicit EffectPlan with target authority, expected revisions/SHA, lock requirements, replay class, postconditions and recovery anchor.

## AX — Routing table
Primary predecessor: GW-68. Primary successor: GW-70. Additional skip/reobserve/reconcile/recovery edges must be declared deterministically.

## AY — Recovery anchor
Read-only contracts: input/evidence snapshot bindings.
Mutation contracts: target reference + task/session + relevant branch/PR/SHA/revision/job ID.

## AZ — Reconstruction rule
On process restart, reconstruct from authoritative stores and observations; do not rely on previous assistant text or a GWC workflow-state database.

## BA — Autonomy behavior
AUTO_CONTINUE when exactly one legal route exists and required evidence is sufficient; WAIT_EXTERNAL/BLOCK_LOCAL/fail-closed otherwise.


---

# GW-70 — TERMINAL_CHECKPOINT

## A — Identity
- **Contract ID:** `GW-70`
- **Canonical name:** `TERMINAL_CHECKPOINT`
- **Family:** `H — Verification and Closure`
- **Contract version:** `1` (conceptual baseline)
- **Profile(s):** `SESSION_MUTATION`
- **Architectural status:** `REUSE`
- **Integration class:** `REUSE`

## B — Purpose
Formaliser la responsabilité `TERMINAL_CHECKPOINT` comme contrat borné, versionné et composable, sans dupliquer les autorités existantes.

**Non-responsibilities:** does not steal ownership from Task Queue, Session, Lock Service, Live State, GitRegistry, GitHub, deploy/runtime or other downstream contracts.

## C — Position in global system
- **Logical predecessor(s):** GW-69
- **Logical successor(s):** GW-71
- **Re-entry:** allowed when authoritative evidence shows this contract’s postcondition is not yet proven.
- **Skip:** only when an explicit deterministic `SKIPPABLE_IF` condition exists.
- **Reobserve/Reconcile:** first-class graph edges, never implicit retries.

## D — Chronological role
- **Transport chronology:** may differ from GW numeric order.
- **Functional chronology:** `GW-70` owns only `TERMINAL_CHECKPOINT` responsibility.
- **Runtime chronology:** resolved by Workflow Graph, not `stepId + 1`.

## E — Contract input
Sorties prouvées des prédécesseurs applicables, contexte cible borné, références d’autorité nécessaires à `TERMINAL_CHECKPOINT`.

Input fields must be bounded, provenance-aware and typed as hint/claim/evidence/fact; raw secret material is forbidden unless explicitly unavoidable and ephemeral.

## F — Information semantics
Every field is classified as one of:
`RAW_INPUT | HINT | CLAIM | OBSERVATION | EVIDENCE | DERIVED_FACT | AUTHORITATIVE_FACT | DECISION | ATTESTATION`.

No contract upgrades a `HINT` to an authoritative fact without the owning evidence.

## G — Authorities
Autorités existantes correspondant aux faits consommés; aucune nouvelle source de vérité créée par GWC.

**Forbidden authority pattern:** no arbitrary Markdown, prompt text, tool availability or remembered state may override the actual owning authority.

## H — Preconditions
- Structural input valid and bounded.
- Required authorities reachable or explicitly `UNAVAILABLE`.
- Required freshness/revision/SHA bindings available.
- No contradictory prerequisite state.
- For mutations: session/receipt/task/locks/governance requirements satisfied.

## I — Internal micro-state machine
validate bounded input → collect/validate required evidence → evaluate local invariants → derive domain status → derive routing disposition → emit bounded output.

## J — Transformation / decision algorithm
1. Parse/validate bounded input.
2. Determine required authority observations.
3. Refuse guesses for missing facts.
4. Apply contract-local invariants.
5. Produce domain status.
6. Produce engine disposition.
7. For mutations only, produce EffectPlan; never mutate from evaluation code directly.
8. Emit bounded output and evidence references.

## K — Determinism
- **Class:** `SESSION_MUTATION` with execution semantics `MUTATE_THEN_VERIFY`.
- Pure/read-only contracts are deterministic given identical normalized input and identical evidence snapshot.
- Observation-dependent contracts bind result to evidence freshness/revisions.

## L — Invariants
Global GWC invariants + no over-interpretation of predecessor output + bounded data + fail closed on missing evidence.

Plus all global GWC invariants.

## M — Action model
- **Allowed action kinds:** READ / DERIVE / RECORD / MUTATE
- **Forbidden:** hidden mutation, authority bypass, stale evidence reuse, arbitrary shell fallback, unbounded projection.

## N — Current execution owner vs target owner
CURRENT: existing subsystem(s) listed in AM. TARGET: same owning authority behind a GWC adapter/contract wrapper.

## O — Capability / authorization model
For any mutation:
`callable ∧ authorized ∧ safeNow ∧ preconditionsSatisfied ∧ concurrencySatisfied = mayExecute`.
A present tool is never permission by itself.

## P — Lock model
No new lock unless EffectPlan declares a collision domain; consume existing Lock Service.

## Q — Concurrency model
Independent tasks may proceed in parallel when dependency/resource/lock scopes do not conflict.
Local blockers remain local.
Operational Memory process-local serialization is not treated as distributed locking.

## R — Output contract
- **Canonical output:** `TerminalCheckpoint`
- Bounded, typed, provenance-aware.
- No secret/raw credential projection.
- Consumers must not over-interpret this output beyond its declared semantics.

## S — Terminal statuses
`SUCCESS | NONE | AMBIGUOUS | UNVERIFIED | BLOCKED | CONFLICT | STALE (subset applicable)`

## T — Terminality formula
Success requires all contract-owned postconditions to be proven from current required evidence.
Missing/stale/conflicting evidence maps to fail-closed statuses, never implicit success.

## U — Reason codes
Contract-specific reason codes must be stable, enumerable, bounded and machine-testable.
Every failure/blocking reason must identify whether it is recoverable by reobserve, reconcile, wait or explicit change.

## V — Fail-closed model
Missing/stale/conflicting required evidence never defaults to success or permission. UNKNOWN remains UNKNOWN.

## W — Evidence model
EvidenceEnvelope(s) from the owning authorities with freshness, provenance and relevant SHA/revision binding.

## X — Freshness / staleness
Evidence is bound to relevant `observedAt`, SHA, stateVersion and/or revisions.
A semantic state change invalidates dependent evidence when its contract declares such dependency.

## Y — Attestation model
EPHEMERAL_RESULT_ONLY by default; promote to bounded durable reference only where an existing authority requires durable proof.

## Z — Persistence model
No new GWC store. Persist only through the existing owning authority when the contract is a RECORD/MUTATE step.

## AA — Secret / privacy model
Never persist tokens, resume secrets, raw authorization headers, arbitrary transport IDs, `.env` material or unbounded prompt bodies.
Use digests/bounded projections where persistence is necessary.

## AB — Replay model
`CONDITIONALLY_IDEMPOTENT unless explicitly NON_REPLAYABLE`

## AC — Recovery model
Recovery starts by observing the owning authority.
A mutation is replayed only when its replay class explicitly allows it and the recovery anchor proves it has not already happened.

## AD — Security / threat model
Prevent authority confusion, cross-session/repo/project leakage, stale evidence reuse, duplicate mutation, secret leakage and false attestation.

## AE — Observability
Emit bounded start/result/failure/reason-code observations where useful.
Observability is not authority.

## AF — Interface contract with predecessors
Consumes only the predecessor fields whose semantics are explicitly declared.
Revalidates any field whose freshness/ownership requires it.

## AG — Interface contract with successors
Exports `TerminalCheckpoint` with explicit semantics; successor may not silently strengthen it.

## AH — Skip contract
No skip unless the graph contains a deterministic condition and proof source.
If skipped, the route and proof are observable.

## AI — Reobserve contract
Reobserve when required evidence is stale, unavailable-but-recoverable, or an external asynchronous condition may have progressed.

## AJ — Reconcile contract
Reconcile only when multiple authorities/state projections are inconsistent.
Reconcile is not the same as refreshing an observation.

## AK — Blocked behavior
Block only the affected Task/contract/resource scope unless an actual global invariant is violated.

## AL — Compensation / rollback
For pure/read-only contracts: not applicable.
For mutations: use existing rollback/compensation only where real; otherwise forward recovery by observation. Never pretend irreversible GitHub effects are rollbackable.

## AM — Existing system mapping
- **Current mapping:** Governed Session checkpoint.
- **Classification:** `REUSE`
- Existing behavior is preserved and wrapped/generalized before new engines are introduced.

## AN — Current hardcodes / generalization
MCP/S1/repository literals and single-repository assumptions must move to TargetContext/configuration where applicable; preserve historical MCP behavior backward-compatibly.

## AO — Future implementation slot
Implement behind a GWC contract module + adapter to existing authority. Exact file placement must follow repository architecture discovered at implementation baseline, not be invented prematurely.

## AP — Test contract
happy path; boundary; NONE/AMBIGUOUS/UNVERIFIED/STALE/CONFLICT as applicable; replay/recovery; security; non-regression; exact binding tests.

## AQ — Property / invariant tests
- Unknown evidence never becomes allow/success.
- Explicit predecessor semantics are preserved.
- No hidden mutation.
- Same normalized input + same evidence ⇒ same semantic result for deterministic profiles.
- Mutation contracts never execute without a valid EffectPlan.

## AR — Acceptance criteria
- Input/output schemas are bounded.
- Owning authorities are explicit.
- Fail-closed paths are tested.
- Replay/recovery behavior is defined.
- No new parallel authority.
- Existing non-regression suite remains green.

## AS — Open questions
No blocking open decision beyond profile-specific implementation details; unresolved choices must stay explicit.

## AT — Architectural findings
- Existing implementation class: `REUSE`.
- Any discovered hardcode is treated as a generalization target, not silently removed.
- Any mismatch between CURRENT and TARGET is explicit.

## AU — Future Task Blueprint mapping
This contract is implemented by one or more governed implementation tasks from `GWC_IMPLEMENTATION_TASK_BLUEPRINTS_R1.md`; implementation dependencies follow the contract graph and authority dependencies rather than numeric GW order alone.

## AV — Execution semantics
`MUTATE_THEN_VERIFY`

## AW — Effect Plan
Must be represented as an explicit EffectPlan with target authority, expected revisions/SHA, lock requirements, replay class, postconditions and recovery anchor.

## AX — Routing table
Primary predecessor: GW-69. Primary successor: GW-71. Additional skip/reobserve/reconcile/recovery edges must be declared deterministically.

## AY — Recovery anchor
Read-only contracts: input/evidence snapshot bindings.
Mutation contracts: target reference + task/session + relevant branch/PR/SHA/revision/job ID.

## AZ — Reconstruction rule
On process restart, reconstruct from authoritative stores and observations; do not rely on previous assistant text or a GWC workflow-state database.

## BA — Autonomy behavior
AUTO_CONTINUE when exactly one legal route exists and required evidence is sufficient; WAIT_EXTERNAL/BLOCK_LOCAL/fail-closed otherwise.


---

# GW-71 — LOCK_RELEASE

## A — Identity
- **Contract ID:** `GW-71`
- **Canonical name:** `LOCK_RELEASE`
- **Family:** `H — Verification and Closure`
- **Contract version:** `1` (conceptual baseline)
- **Profile(s):** `LOCK_MUTATION`
- **Architectural status:** `REUSE`
- **Integration class:** `REUSE`

## B — Purpose
Formaliser la responsabilité `LOCK_RELEASE` comme contrat borné, versionné et composable, sans dupliquer les autorités existantes.

**Non-responsibilities:** does not steal ownership from Task Queue, Session, Lock Service, Live State, GitRegistry, GitHub, deploy/runtime or other downstream contracts.

## C — Position in global system
- **Logical predecessor(s):** GW-70
- **Logical successor(s):** GW-72
- **Re-entry:** allowed when authoritative evidence shows this contract’s postcondition is not yet proven.
- **Skip:** only when an explicit deterministic `SKIPPABLE_IF` condition exists.
- **Reobserve/Reconcile:** first-class graph edges, never implicit retries.

## D — Chronological role
- **Transport chronology:** may differ from GW numeric order.
- **Functional chronology:** `GW-71` owns only `LOCK_RELEASE` responsibility.
- **Runtime chronology:** resolved by Workflow Graph, not `stepId + 1`.

## E — Contract input
Sorties prouvées des prédécesseurs applicables, contexte cible borné, références d’autorité nécessaires à `LOCK_RELEASE`.

Input fields must be bounded, provenance-aware and typed as hint/claim/evidence/fact; raw secret material is forbidden unless explicitly unavoidable and ephemeral.

## F — Information semantics
Every field is classified as one of:
`RAW_INPUT | HINT | CLAIM | OBSERVATION | EVIDENCE | DERIVED_FACT | AUTHORITATIVE_FACT | DECISION | ATTESTATION`.

No contract upgrades a `HINT` to an authoritative fact without the owning evidence.

## G — Authorities
Autorités existantes correspondant aux faits consommés; aucune nouvelle source de vérité créée par GWC.

**Forbidden authority pattern:** no arbitrary Markdown, prompt text, tool availability or remembered state may override the actual owning authority.

## H — Preconditions
- Structural input valid and bounded.
- Required authorities reachable or explicitly `UNAVAILABLE`.
- Required freshness/revision/SHA bindings available.
- No contradictory prerequisite state.
- For mutations: session/receipt/task/locks/governance requirements satisfied.

## I — Internal micro-state machine
validate bounded input → collect/validate required evidence → evaluate local invariants → derive domain status → derive routing disposition → emit bounded output.

## J — Transformation / decision algorithm
1. Parse/validate bounded input.
2. Determine required authority observations.
3. Refuse guesses for missing facts.
4. Apply contract-local invariants.
5. Produce domain status.
6. Produce engine disposition.
7. For mutations only, produce EffectPlan; never mutate from evaluation code directly.
8. Emit bounded output and evidence references.

## K — Determinism
- **Class:** `LOCK_MUTATION` with execution semantics `MUTATE_THEN_VERIFY`.
- Pure/read-only contracts are deterministic given identical normalized input and identical evidence snapshot.
- Observation-dependent contracts bind result to evidence freshness/revisions.

## L — Invariants
Global GWC invariants + no over-interpretation of predecessor output + bounded data + fail closed on missing evidence.

Plus all global GWC invariants.

## M — Action model
- **Allowed action kinds:** READ / DERIVE / RECORD / MUTATE
- **Forbidden:** hidden mutation, authority bypass, stale evidence reuse, arbitrary shell fallback, unbounded projection.

## N — Current execution owner vs target owner
CURRENT: existing subsystem(s) listed in AM. TARGET: same owning authority behind a GWC adapter/contract wrapper.

## O — Capability / authorization model
For any mutation:
`callable ∧ authorized ∧ safeNow ∧ preconditionsSatisfied ∧ concurrencySatisfied = mayExecute`.
A present tool is never permission by itself.

## P — Lock model
No new lock unless EffectPlan declares a collision domain; consume existing Lock Service.

## Q — Concurrency model
Independent tasks may proceed in parallel when dependency/resource/lock scopes do not conflict.
Local blockers remain local.
Operational Memory process-local serialization is not treated as distributed locking.

## R — Output contract
- **Canonical output:** `LockReleaseProof`
- Bounded, typed, provenance-aware.
- No secret/raw credential projection.
- Consumers must not over-interpret this output beyond its declared semantics.

## S — Terminal statuses
`SUCCESS | NONE | AMBIGUOUS | UNVERIFIED | BLOCKED | CONFLICT | STALE (subset applicable)`

## T — Terminality formula
Success requires all contract-owned postconditions to be proven from current required evidence.
Missing/stale/conflicting evidence maps to fail-closed statuses, never implicit success.

## U — Reason codes
Contract-specific reason codes must be stable, enumerable, bounded and machine-testable.
Every failure/blocking reason must identify whether it is recoverable by reobserve, reconcile, wait or explicit change.

## V — Fail-closed model
Missing/stale/conflicting required evidence never defaults to success or permission. UNKNOWN remains UNKNOWN.

## W — Evidence model
EvidenceEnvelope(s) from the owning authorities with freshness, provenance and relevant SHA/revision binding.

## X — Freshness / staleness
Evidence is bound to relevant `observedAt`, SHA, stateVersion and/or revisions.
A semantic state change invalidates dependent evidence when its contract declares such dependency.

## Y — Attestation model
EPHEMERAL_RESULT_ONLY by default; promote to bounded durable reference only where an existing authority requires durable proof.

## Z — Persistence model
No new GWC store. Persist only through the existing owning authority when the contract is a RECORD/MUTATE step.

## AA — Secret / privacy model
Never persist tokens, resume secrets, raw authorization headers, arbitrary transport IDs, `.env` material or unbounded prompt bodies.
Use digests/bounded projections where persistence is necessary.

## AB — Replay model
`CONDITIONALLY_IDEMPOTENT unless explicitly NON_REPLAYABLE`

## AC — Recovery model
Recovery starts by observing the owning authority.
A mutation is replayed only when its replay class explicitly allows it and the recovery anchor proves it has not already happened.

## AD — Security / threat model
Prevent authority confusion, cross-session/repo/project leakage, stale evidence reuse, duplicate mutation, secret leakage and false attestation.

## AE — Observability
Emit bounded start/result/failure/reason-code observations where useful.
Observability is not authority.

## AF — Interface contract with predecessors
Consumes only the predecessor fields whose semantics are explicitly declared.
Revalidates any field whose freshness/ownership requires it.

## AG — Interface contract with successors
Exports `LockReleaseProof` with explicit semantics; successor may not silently strengthen it.

## AH — Skip contract
No skip unless the graph contains a deterministic condition and proof source.
If skipped, the route and proof are observable.

## AI — Reobserve contract
Reobserve when required evidence is stale, unavailable-but-recoverable, or an external asynchronous condition may have progressed.

## AJ — Reconcile contract
Reconcile only when multiple authorities/state projections are inconsistent.
Reconcile is not the same as refreshing an observation.

## AK — Blocked behavior
Block only the affected Task/contract/resource scope unless an actual global invariant is violated.

## AL — Compensation / rollback
For pure/read-only contracts: not applicable.
For mutations: use existing rollback/compensation only where real; otherwise forward recovery by observation. Never pretend irreversible GitHub effects are rollbackable.

## AM — Existing system mapping
- **Current mapping:** Lock Service release + closeSession cleanup fallback.
- **Classification:** `REUSE`
- Existing behavior is preserved and wrapped/generalized before new engines are introduced.

## AN — Current hardcodes / generalization
MCP/S1/repository literals and single-repository assumptions must move to TargetContext/configuration where applicable; preserve historical MCP behavior backward-compatibly.

## AO — Future implementation slot
Implement behind a GWC contract module + adapter to existing authority. Exact file placement must follow repository architecture discovered at implementation baseline, not be invented prematurely.

## AP — Test contract
happy path; boundary; NONE/AMBIGUOUS/UNVERIFIED/STALE/CONFLICT as applicable; replay/recovery; security; non-regression; exact binding tests.

## AQ — Property / invariant tests
- Unknown evidence never becomes allow/success.
- Explicit predecessor semantics are preserved.
- No hidden mutation.
- Same normalized input + same evidence ⇒ same semantic result for deterministic profiles.
- Mutation contracts never execute without a valid EffectPlan.

## AR — Acceptance criteria
- Input/output schemas are bounded.
- Owning authorities are explicit.
- Fail-closed paths are tested.
- Replay/recovery behavior is defined.
- No new parallel authority.
- Existing non-regression suite remains green.

## AS — Open questions
No blocking open decision beyond profile-specific implementation details; unresolved choices must stay explicit.

## AT — Architectural findings
- Existing implementation class: `REUSE`.
- Any discovered hardcode is treated as a generalization target, not silently removed.
- Any mismatch between CURRENT and TARGET is explicit.

## AU — Future Task Blueprint mapping
This contract is implemented by one or more governed implementation tasks from `GWC_IMPLEMENTATION_TASK_BLUEPRINTS_R1.md`; implementation dependencies follow the contract graph and authority dependencies rather than numeric GW order alone.

## AV — Execution semantics
`MUTATE_THEN_VERIFY`

## AW — Effect Plan
Must be represented as an explicit EffectPlan with target authority, expected revisions/SHA, lock requirements, replay class, postconditions and recovery anchor.

## AX — Routing table
Primary predecessor: GW-70. Primary successor: GW-72. Additional skip/reobserve/reconcile/recovery edges must be declared deterministically.

## AY — Recovery anchor
Read-only contracts: input/evidence snapshot bindings.
Mutation contracts: target reference + task/session + relevant branch/PR/SHA/revision/job ID.

## AZ — Reconstruction rule
On process restart, reconstruct from authoritative stores and observations; do not rely on previous assistant text or a GWC workflow-state database.

## BA — Autonomy behavior
AUTO_CONTINUE when exactly one legal route exists and required evidence is sufficient; WAIT_EXTERNAL/BLOCK_LOCAL/fail-closed otherwise.


---

# GW-72 — SESSION_CLOSE_AND_QUEUE_RECONCILE

## A — Identity
- **Contract ID:** `GW-72`
- **Canonical name:** `SESSION_CLOSE_AND_QUEUE_RECONCILE`
- **Family:** `H — Verification and Closure`
- **Contract version:** `1` (conceptual baseline)
- **Profile(s):** `SESSION_TASK_ORCHESTRATION`
- **Architectural status:** `PARTIAL/REUSE`
- **Integration class:** `PARTIAL/REUSE`

## B — Purpose
Formaliser la responsabilité `SESSION_CLOSE_AND_QUEUE_RECONCILE` comme contrat borné, versionné et composable, sans dupliquer les autorités existantes.

**Non-responsibilities:** does not steal ownership from Task Queue, Session, Lock Service, Live State, GitRegistry, GitHub, deploy/runtime or other downstream contracts.

## C — Position in global system
- **Logical predecessor(s):** GW-71
- **Logical successor(s):** next queued task resume cycle or idle
- **Re-entry:** allowed when authoritative evidence shows this contract’s postcondition is not yet proven.
- **Skip:** only when an explicit deterministic `SKIPPABLE_IF` condition exists.
- **Reobserve/Reconcile:** first-class graph edges, never implicit retries.

## D — Chronological role
- **Transport chronology:** may differ from GW numeric order.
- **Functional chronology:** `GW-72` owns only `SESSION_CLOSE_AND_QUEUE_RECONCILE` responsibility.
- **Runtime chronology:** resolved by Workflow Graph, not `stepId + 1`.

## E — Contract input
Sorties prouvées des prédécesseurs applicables, contexte cible borné, références d’autorité nécessaires à `SESSION_CLOSE_AND_QUEUE_RECONCILE`.

Input fields must be bounded, provenance-aware and typed as hint/claim/evidence/fact; raw secret material is forbidden unless explicitly unavoidable and ephemeral.

## F — Information semantics
Every field is classified as one of:
`RAW_INPUT | HINT | CLAIM | OBSERVATION | EVIDENCE | DERIVED_FACT | AUTHORITATIVE_FACT | DECISION | ATTESTATION`.

No contract upgrades a `HINT` to an authoritative fact without the owning evidence.

## G — Authorities
Autorités existantes correspondant aux faits consommés; aucune nouvelle source de vérité créée par GWC.

**Forbidden authority pattern:** no arbitrary Markdown, prompt text, tool availability or remembered state may override the actual owning authority.

## H — Preconditions
- Structural input valid and bounded.
- Required authorities reachable or explicitly `UNAVAILABLE`.
- Required freshness/revision/SHA bindings available.
- No contradictory prerequisite state.
- For mutations: session/receipt/task/locks/governance requirements satisfied.

## I — Internal micro-state machine
validate bounded input → collect/validate required evidence → evaluate local invariants → derive domain status → derive routing disposition → emit bounded output.

## J — Transformation / decision algorithm
1. Parse/validate bounded input.
2. Determine required authority observations.
3. Refuse guesses for missing facts.
4. Apply contract-local invariants.
5. Produce domain status.
6. Produce engine disposition.
7. For mutations only, produce EffectPlan; never mutate from evaluation code directly.
8. Emit bounded output and evidence references.

## K — Determinism
- **Class:** `SESSION_TASK_ORCHESTRATION` with execution semantics `MUTATE_THEN_VERIFY`.
- Pure/read-only contracts are deterministic given identical normalized input and identical evidence snapshot.
- Observation-dependent contracts bind result to evidence freshness/revisions.

## L — Invariants
Global GWC invariants + no over-interpretation of predecessor output + bounded data + fail closed on missing evidence.

Plus all global GWC invariants.

## M — Action model
- **Allowed action kinds:** READ / DERIVE / RECORD / MUTATE
- **Forbidden:** hidden mutation, authority bypass, stale evidence reuse, arbitrary shell fallback, unbounded projection.

## N — Current execution owner vs target owner
CURRENT: existing subsystem(s) listed in AM. TARGET: same owning authority behind a GWC adapter/contract wrapper.

## O — Capability / authorization model
For any mutation:
`callable ∧ authorized ∧ safeNow ∧ preconditionsSatisfied ∧ concurrencySatisfied = mayExecute`.
A present tool is never permission by itself.

## P — Lock model
No new lock unless EffectPlan declares a collision domain; consume existing Lock Service.

## Q — Concurrency model
Independent tasks may proceed in parallel when dependency/resource/lock scopes do not conflict.
Local blockers remain local.
Operational Memory process-local serialization is not treated as distributed locking.

## R — Output contract
- **Canonical output:** `ClosureAndNextWork`
- Bounded, typed, provenance-aware.
- No secret/raw credential projection.
- Consumers must not over-interpret this output beyond its declared semantics.

## S — Terminal statuses
`SUCCESS | NONE | AMBIGUOUS | UNVERIFIED | BLOCKED | CONFLICT | STALE (subset applicable)`

## T — Terminality formula
Success requires all contract-owned postconditions to be proven from current required evidence.
Missing/stale/conflicting evidence maps to fail-closed statuses, never implicit success.

## U — Reason codes
Contract-specific reason codes must be stable, enumerable, bounded and machine-testable.
Every failure/blocking reason must identify whether it is recoverable by reobserve, reconcile, wait or explicit change.

## V — Fail-closed model
Missing/stale/conflicting required evidence never defaults to success or permission. UNKNOWN remains UNKNOWN.

## W — Evidence model
EvidenceEnvelope(s) from the owning authorities with freshness, provenance and relevant SHA/revision binding.

## X — Freshness / staleness
Evidence is bound to relevant `observedAt`, SHA, stateVersion and/or revisions.
A semantic state change invalidates dependent evidence when its contract declares such dependency.

## Y — Attestation model
EPHEMERAL_RESULT_ONLY by default; promote to bounded durable reference only where an existing authority requires durable proof.

## Z — Persistence model
No new GWC store. Persist only through the existing owning authority when the contract is a RECORD/MUTATE step.

## AA — Secret / privacy model
Never persist tokens, resume secrets, raw authorization headers, arbitrary transport IDs, `.env` material or unbounded prompt bodies.
Use digests/bounded projections where persistence is necessary.

## AB — Replay model
`CONDITIONALLY_IDEMPOTENT unless explicitly NON_REPLAYABLE`

## AC — Recovery model
Recovery starts by observing the owning authority.
A mutation is replayed only when its replay class explicitly allows it and the recovery anchor proves it has not already happened.

## AD — Security / threat model
Prevent authority confusion, cross-session/repo/project leakage, stale evidence reuse, duplicate mutation, secret leakage and false attestation.

## AE — Observability
Emit bounded start/result/failure/reason-code observations where useful.
Observability is not authority.

## AF — Interface contract with predecessors
Consumes only the predecessor fields whose semantics are explicitly declared.
Revalidates any field whose freshness/ownership requires it.

## AG — Interface contract with successors
Exports `ClosureAndNextWork` with explicit semantics; successor may not silently strengthen it.

## AH — Skip contract
No skip unless the graph contains a deterministic condition and proof source.
If skipped, the route and proof are observable.

## AI — Reobserve contract
Reobserve when required evidence is stale, unavailable-but-recoverable, or an external asynchronous condition may have progressed.

## AJ — Reconcile contract
Reconcile only when multiple authorities/state projections are inconsistent.
Reconcile is not the same as refreshing an observation.

## AK — Blocked behavior
Block only the affected Task/contract/resource scope unless an actual global invariant is violated.

## AL — Compensation / rollback
For pure/read-only contracts: not applicable.
For mutations: use existing rollback/compensation only where real; otherwise forward recovery by observation. Never pretend irreversible GitHub effects are rollbackable.

## AM — Existing system mapping
- **Current mapping:** Session close + queue/requeue/firstExecutable primitives.
- **Classification:** `PARTIAL/REUSE`
- Existing behavior is preserved and wrapped/generalized before new engines are introduced.

## AN — Current hardcodes / generalization
MCP/S1/repository literals and single-repository assumptions must move to TargetContext/configuration where applicable; preserve historical MCP behavior backward-compatibly.

## AO — Future implementation slot
Implement behind a GWC contract module + adapter to existing authority. Exact file placement must follow repository architecture discovered at implementation baseline, not be invented prematurely.

## AP — Test contract
happy path; boundary; NONE/AMBIGUOUS/UNVERIFIED/STALE/CONFLICT as applicable; replay/recovery; security; non-regression; exact binding tests.

## AQ — Property / invariant tests
- Unknown evidence never becomes allow/success.
- Explicit predecessor semantics are preserved.
- No hidden mutation.
- Same normalized input + same evidence ⇒ same semantic result for deterministic profiles.
- Mutation contracts never execute without a valid EffectPlan.

## AR — Acceptance criteria
- Input/output schemas are bounded.
- Owning authorities are explicit.
- Fail-closed paths are tested.
- Replay/recovery behavior is defined.
- No new parallel authority.
- Existing non-regression suite remains green.

## AS — Open questions
No blocking open decision beyond profile-specific implementation details; unresolved choices must stay explicit.

## AT — Architectural findings
- Existing implementation class: `PARTIAL/REUSE`.
- Any discovered hardcode is treated as a generalization target, not silently removed.
- Any mismatch between CURRENT and TARGET is explicit.

## AU — Future Task Blueprint mapping
This contract is implemented by one or more governed implementation tasks from `GWC_IMPLEMENTATION_TASK_BLUEPRINTS_R1.md`; implementation dependencies follow the contract graph and authority dependencies rather than numeric GW order alone.

## AV — Execution semantics
`MUTATE_THEN_VERIFY`

## AW — Effect Plan
Must be represented as an explicit EffectPlan with target authority, expected revisions/SHA, lock requirements, replay class, postconditions and recovery anchor.

## AX — Routing table
Primary predecessor: GW-71. Primary successor: next queued task resume cycle or idle. Additional skip/reobserve/reconcile/recovery edges must be declared deterministically.

## AY — Recovery anchor
Read-only contracts: input/evidence snapshot bindings.
Mutation contracts: target reference + task/session + relevant branch/PR/SHA/revision/job ID.

## AZ — Reconstruction rule
On process restart, reconstruct from authoritative stores and observations; do not rely on previous assistant text or a GWC workflow-state database.

## BA — Autonomy behavior
AUTO_CONTINUE when exactly one legal route exists and required evidence is sufficient; WAIT_EXTERNAL/BLOCK_LOCAL/fail-closed otherwise.


---

# GW-73 — UNIVERSAL_ACCEPTANCE

## A — Identity
- **Contract ID:** `GW-73`
- **Canonical name:** `UNIVERSAL_ACCEPTANCE`
- **Family:** `I — Universal Acceptance`
- **Contract version:** `1` (conceptual baseline)
- **Profile(s):** `ACCEPTANCE`
- **Architectural status:** `NEW`
- **Integration class:** `NEW`

## B — Purpose
Prouver l’universalité du système et l’absence de hardcodes historiques cachés.

**Non-responsibilities:** does not steal ownership from Task Queue, Session, Lock Service, Live State, GitRegistry, GitHub, deploy/runtime or other downstream contracts.

## C — Position in global system
- **Logical predecessor(s):** global implemented system
- **Logical successor(s):** TERMINAL acceptance report
- **Re-entry:** allowed when authoritative evidence shows this contract’s postcondition is not yet proven.
- **Skip:** only when an explicit deterministic `SKIPPABLE_IF` condition exists.
- **Reobserve/Reconcile:** first-class graph edges, never implicit retries.

## D — Chronological role
- **Transport chronology:** may differ from GW numeric order.
- **Functional chronology:** `GW-73` owns only `UNIVERSAL_ACCEPTANCE` responsibility.
- **Runtime chronology:** resolved by Workflow Graph, not `stepId + 1`.

## E — Contract input
Complete implemented contract registry, graph, adapters and project scenario matrix.

Input fields must be bounded, provenance-aware and typed as hint/claim/evidence/fact; raw secret material is forbidden unless explicitly unavoidable and ephemeral.

## F — Information semantics
Every field is classified as one of:
`RAW_INPUT | HINT | CLAIM | OBSERVATION | EVIDENCE | DERIVED_FACT | AUTHORITATIVE_FACT | DECISION | ATTESTATION`.

No contract upgrades a `HINT` to an authoritative fact without the owning evidence.

## G — Authorities
All relevant authorities per scenario.

**Forbidden authority pattern:** no arbitrary Markdown, prompt text, tool availability or remembered state may override the actual owning authority.

## H — Preconditions
- Structural input valid and bounded.
- Required authorities reachable or explicitly `UNAVAILABLE`.
- Required freshness/revision/SHA bindings available.
- No contradictory prerequisite state.
- For mutations: session/receipt/task/locks/governance requirements satisfied.

## I — Internal micro-state machine
run scenario matrix → validate expected legal routes/fail-closed outcomes → anti-hardcode scan → recovery tests → multi-repo tests → acceptance verdict.

## J — Transformation / decision algorithm
1. Parse/validate bounded input.
2. Determine required authority observations.
3. Refuse guesses for missing facts.
4. Apply contract-local invariants.
5. Produce domain status.
6. Produce engine disposition.
7. For mutations only, produce EffectPlan; never mutate from evaluation code directly.
8. Emit bounded output and evidence references.

## K — Determinism
- **Class:** `ACCEPTANCE` with execution semantics `EVALUATE_ONLY`.
- Pure/read-only contracts are deterministic given identical normalized input and identical evidence snapshot.
- Observation-dependent contracts bind result to evidence freshness/revisions.

## L — Invariants
MCP is one configured target, not workflow logic; multi-repo state must preserve independent SHAs.

Plus all global GWC invariants.

## M — Action model
- **Allowed action kinds:** READ / DERIVE
- **Forbidden:** hidden mutation, authority bypass, stale evidence reuse, arbitrary shell fallback, unbounded projection.

## N — Current execution owner vs target owner
CURRENT: existing subsystem(s) listed in AM. TARGET: same owning authority behind a GWC adapter/contract wrapper.

## O — Capability / authorization model
For any mutation:
`callable ∧ authorized ∧ safeNow ∧ preconditionsSatisfied ∧ concurrencySatisfied = mayExecute`.
A present tool is never permission by itself.

## P — Lock model
Scenario-specific.

## Q — Concurrency model
Independent tasks may proceed in parallel when dependency/resource/lock scopes do not conflict.
Local blockers remain local.
Operational Memory process-local serialization is not treated as distributed locking.

## R — Output contract
- **Canonical output:** `UniversalAcceptanceReport`
- Bounded, typed, provenance-aware.
- No secret/raw credential projection.
- Consumers must not over-interpret this output beyond its declared semantics.

## S — Terminal statuses
`ACCEPTED | FAILED | UNVERIFIED`

## T — Terminality formula
Success requires all contract-owned postconditions to be proven from current required evidence.
Missing/stale/conflicting evidence maps to fail-closed statuses, never implicit success.

## U — Reason codes
Contract-specific reason codes must be stable, enumerable, bounded and machine-testable.
Every failure/blocking reason must identify whether it is recoverable by reobserve, reconcile, wait or explicit change.

## V — Fail-closed model
Missing/stale/conflicting required evidence never defaults to success or permission. UNKNOWN remains UNKNOWN.

## W — Evidence model
Acceptance report across single-repo, multi-repo, no-domain, no-runtime, stale, lock, crash/recovery, Stablecoin and AfricaFunds-like cases.

## X — Freshness / staleness
Evidence is bound to relevant `observedAt`, SHA, stateVersion and/or revisions.
A semantic state change invalidates dependent evidence when its contract declares such dependency.

## Y — Attestation model
EPHEMERAL_RESULT_ONLY by default; promote to bounded durable reference only where an existing authority requires durable proof.

## Z — Persistence model
No new GWC store. Persist only through the existing owning authority when the contract is a RECORD/MUTATE step.

## AA — Secret / privacy model
Never persist tokens, resume secrets, raw authorization headers, arbitrary transport IDs, `.env` material or unbounded prompt bodies.
Use digests/bounded projections where persistence is necessary.

## AB — Replay model
`READ_ONLY acceptance suite except isolated governed fixture mutations.`

## AC — Recovery model
Recovery starts by observing the owning authority.
A mutation is replayed only when its replay class explicitly allows it and the recovery anchor proves it has not already happened.

## AD — Security / threat model
Prevent authority confusion, cross-session/repo/project leakage, stale evidence reuse, duplicate mutation, secret leakage and false attestation.

## AE — Observability
Emit bounded start/result/failure/reason-code observations where useful.
Observability is not authority.

## AF — Interface contract with predecessors
Consumes only the predecessor fields whose semantics are explicitly declared.
Revalidates any field whose freshness/ownership requires it.

## AG — Interface contract with successors
Exports `UniversalAcceptanceReport` with explicit semantics; successor may not silently strengthen it.

## AH — Skip contract
No skip unless the graph contains a deterministic condition and proof source.
If skipped, the route and proof are observable.

## AI — Reobserve contract
Reobserve when required evidence is stale, unavailable-but-recoverable, or an external asynchronous condition may have progressed.

## AJ — Reconcile contract
Reconcile only when multiple authorities/state projections are inconsistent.
Reconcile is not the same as refreshing an observation.

## AK — Blocked behavior
Block only the affected Task/contract/resource scope unless an actual global invariant is violated.

## AL — Compensation / rollback
For pure/read-only contracts: not applicable.
For mutations: use existing rollback/compensation only where real; otherwise forward recovery by observation. Never pretend irreversible GitHub effects are rollbackable.

## AM — Existing system mapping
- **Current mapping:** No complete engine; acceptance is new.
- **Classification:** `NEW`
- Existing behavior is preserved and wrapped/generalized before new engines are introduced.

## AN — Current hardcodes / generalization
No target-specific hardcode allowed.

## AO — Future implementation slot
Implement behind a GWC contract module + adapter to existing authority. Exact file placement must follow repository architecture discovered at implementation baseline, not be invented prematurely.

## AP — Test contract
happy path; boundary; NONE/AMBIGUOUS/UNVERIFIED/STALE/CONFLICT as applicable; replay/recovery; security; non-regression; exact binding tests.

## AQ — Property / invariant tests
- Unknown evidence never becomes allow/success.
- Explicit predecessor semantics are preserved.
- No hidden mutation.
- Same normalized input + same evidence ⇒ same semantic result for deterministic profiles.
- Mutation contracts never execute without a valid EffectPlan.

## AR — Acceptance criteria
- Input/output schemas are bounded.
- Owning authorities are explicit.
- Fail-closed paths are tested.
- Replay/recovery behavior is defined.
- No new parallel authority.
- Existing non-regression suite remains green.

## AS — Open questions
Exact non-production acceptance fixtures and test environments to be selected at implementation time.

## AT — Architectural findings
- Existing implementation class: `NEW`.
- Any discovered hardcode is treated as a generalization target, not silently removed.
- Any mismatch between CURRENT and TARGET is explicit.

## AU — Future Task Blueprint mapping
This contract is implemented by one or more governed implementation tasks from `GWC_IMPLEMENTATION_TASK_BLUEPRINTS_R1.md`; implementation dependencies follow the contract graph and authority dependencies rather than numeric GW order alone.

## AV — Execution semantics
`EVALUATE_ONLY`

## AW — Effect Plan
None.

## AX — Routing table
Primary predecessor: global implemented system. Primary successor: TERMINAL acceptance report. Additional skip/reobserve/reconcile/recovery edges must be declared deterministically.

## AY — Recovery anchor
Read-only contracts: input/evidence snapshot bindings.
Mutation contracts: target reference + task/session + relevant branch/PR/SHA/revision/job ID.

## AZ — Reconstruction rule
On process restart, reconstruct from authoritative stores and observations; do not rely on previous assistant text or a GWC workflow-state database.

## BA — Autonomy behavior
AUTO_CONTINUE when exactly one legal route exists and required evidence is sufficient; WAIT_EXTERNAL/BLOCK_LOCAL/fail-closed otherwise.
