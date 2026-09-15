# Governed Workflow Contract V1 — Design

Date: 2026-09-15
Repository: `Patricked-code/MCP`
Status: design approved in principle by the user; implementation must remain additive, backward-compatible and governed.

## 1. Goal

Define a formal Governed Workflow Contract (GWC) that turns the existing MCP governance workflow into a composable state machine made of bounded step contracts.

GWC MUST reuse and compose the existing authorities. It MUST NOT create a second:

- Live State;
- Operational Memory;
- Governed Task Queue;
- Governed Session engine;
- lock engine;
- GitRegistry / Project Binding registry;
- Current State service;
- audit/event journal;
- GitHub→S1 deployment path;
- Bootstrap Receipt authority.

GWC is an orchestration and contract layer over existing authorities, not a replacement authority.

## 2. Core principle

Each workflow step is a governed contract, not a prompt convention.

A step has:

- stable `stepId`;
- version;
- bounded input schema;
- bounded output schema;
- authorities;
- preconditions;
- invariants;
- allowed actions;
- forbidden actions;
- evidence requirements;
- fail-closed statuses;
- postconditions;
- allowed next steps;
- optional skip/reobserve/reconcile branches.

The general form is:

```text
INPUT
↓
PRECONDITIONS
↓
AUTHORITIES
↓
INVARIANTS
↓
CALLABLE?
↓
AUTHORIZED?
↓
SAFE_NOW?
↓
PRECONDITIONS_SATISFIED?
↓
ALLOWED ACTION
↓
VERIFY POSTCONDITIONS
↓
STEP ATTESTATION
↓
NEXT STATE
```

No step may infer an authority owned by a later step.

## 3. Global invariants

These invariants apply to all steps:

```text
NO_DIRECT_S1_VERSIONED_WRITE
NO_UNVERIFIED_PERMISSION
NO_TASK_DUPLICATION
NO_LOCK_BYPASS
NO_STALE_RECEIPT_MUTATION
NO_UNREVIEWED_HEAD_MERGE
NO_FALSE_DONE
NO_SECRET_PROJECTION
NO_PARALLEL_AUTHORITY
NO_IMPLICIT_V2_ACTIVATION
NO_PERMISSION_FROM_IDENTITY_ALONE
NO_RUNTIME_FACT_FROM_GITHUB_ALONE
```

The existing WRITE gate remains `shadow` unless a distinct governed decision changes it. GWC V1 does not switch it to enforcement.

## 4. Standard step contract

Conceptual TypeScript shape:

```ts
type GovernedStepContract<I, O> = {
  stepId: GovernedStepId;
  version: 1;

  inputSchema: unknown;
  outputSchema: unknown;

  authorities: readonly AuthorityRef[];
  preconditions: readonly ConditionRef[];
  invariants: readonly InvariantRef[];

  allowedActions: readonly ActionKind[];
  forbiddenActions: readonly ActionKind[];

  evaluate(input: I, evidence: StepEvidence): StepEvaluation<O>;
  verify(output: O, evidence: StepEvidence): StepVerification;

  successStates: readonly StepStatus[];
  failureStates: readonly StepStatus[];
  nextSteps: readonly GovernedStepId[];
};
```

Action kinds are normalized to:

```text
READ
DERIVE
RECORD
MUTATE
```

The presence of a technical tool never implies `MUTATE` is permitted.

## 5. Standard evaluation dimensions

Every step that can lead to mutation must evaluate separately:

```text
callable
authorized
safeNow
preconditionsSatisfied
```

Only:

```text
callable
&& authorized
&& safeNow
&& preconditionsSatisfied
```

may yield `mayExecute=true`.

This composes existing Capability Reality / governance decisions; it does not replace them.

## 6. Standard fail-closed vocabulary

Shared statuses:

```text
SUCCESS
NONE
AMBIGUOUS
UNVERIFIED
BLOCKED
CONFLICT
STALE
OUT_OF_SCOPE
REJECTED
```

Each step exposes only the subset meaningful to its contract.

Unknown evidence never becomes a guessed value.

## 7. Step attestation

A successful or fail-closed evaluation may produce a bounded attestation:

```ts
type GovernedStepAttestation = {
  schemaVersion: 1;
  stepId: GovernedStepId;
  contractVersion: 1;

  inputDigest: string;
  outputDigest: string;

  status: StepStatus;
  observedAt: string;
  expiresAt?: string | null;

  authoritiesUsed: AuthorityRef[];
  evidenceRefs: EvidenceRef[];
  reasonCodes: string[];

  previousStepAttestationId?: string | null;

  governedSessionId?: string | null;
  taskId?: string | null;

  result: unknown;
};
```

Attestations MUST be sanitized and bounded. No token, secret, raw transport credential, resume secret or arbitrary prompt body is persisted.

The chain is logical, not a blockchain and not a new source of truth:

```text
STEP N attestation
→ reference/digest
STEP N+1 attestation
```

Operational Memory / Live State / GitHub / existing stores remain the authorities for the facts they own.

## 8. Workflow graph, not a rigid line

The workflow is a directed graph with bounded branches.

Example:

```text
STEP X
├─ SUCCESS    → STEP X+1
├─ AMBIGUOUS  → RESOLUTION_REQUIRED
├─ STALE      → REOBSERVE
├─ CONFLICT   → RECONCILE
└─ BLOCKED    → BLOCKED
```

A step can be skippable only if its contract declares a deterministic `SKIPPABLE_IF` condition.

Example:

```text
DOCUMENTATION_DRIFT?
├─ false → VERIFYING
└─ true  → DOC_RECONCILIATION → VERIFYING
```

## 9. Families

### Family A — Intake

Receives and structures a request without mutation.

### Family B — Identity and target resolution

Resolves connection, identity, repository, project, server, runtime and domain.

### Family C — Governance and capability composition

Loads inherited governance and computes effective capabilities / receipt enrichment.

### Family D — Work orchestration

Reconciles intent against the existing queue, session, dependencies and locks.

### Family E — Development

Reads authorities, identifies the integration slot, establishes baseline, branch and TDD.

### Family F — Review and merge

Validates exact-head CI, review, rulesets and merge eligibility.

### Family G — Deployment

Observes governed autodeploy, S1 synchronization, build, runtime, health and exact-SHA.

### Family H — Verification and closure

Reconciles Live State, documentation, VERIFYING/DONE, checkpoints, locks and session closure.

### Family I — Universal acceptance

Tests the whole chain on a repository/project other than the historical MCP path, including Stablecoin acceptance without hardcoding.

## 10. Canonical 73-step registry

The stable registry is:

1. `GW-01 INTENT_CAPTURE`
2. `GW-02 CONNECTION_BOOTSTRAP`
3. `GW-03 CONNECTION_CONTEXT`
4. `GW-04 GITHUB_IDENTITY_RESOLUTION`
5. `GW-05 REPOSITORY_RESOLUTION`
6. `GW-06 PROJECT_RESOLUTION`
7. `GW-07 SERVER_RESOLUTION`
8. `GW-08 RUNTIME_RESOLUTION`
9. `GW-09 DOMAIN_RESOLUTION`
10. `GW-10 GOVERNANCE_INHERITANCE`
11. `GW-11 EFFECTIVE_CAPABILITIES`
12. `GW-12 BOOTSTRAP_RECEIPT`
13. `GW-13 LIVE_STATE_RECONCILIATION`
14. `GW-14 EXISTING_TASK_LOOKUP`
15. `GW-15 TASK_CREATION_IF_REQUIRED`
16. `GW-16 GOVERNED_SESSION_OPEN_OR_RESUME`
17. `GW-17 CONTEXT_ACKNOWLEDGEMENT`
18. `GW-18 TASK_CLAIM`
19. `GW-19 MINIMAL_LOCK_ACQUISITION`
20. `GW-20 TASK_IN_PROGRESS`
21. `GW-21 AUTHORITY_DOCUMENT_READ`
22. `GW-22 INTEGRATION_SLOT_RESOLUTION`
23. `GW-23 EXACT_GITHUB_BASELINE`
24. `GW-24 GOVERNED_BRANCH_CREATION`
25. `GW-25 TDD_RED_AUTHORING`
26. `GW-26 TDD_RED_OBSERVATION`
27. `GW-27 TDD_GREEN_MINIMAL_IMPLEMENTATION`
28. `GW-28 GREEN_CI`
29. `GW-29 SELF_REVIEW`
30. `GW-30 REGRESSION_RED_IF_FINDING`
31. `GW-31 REGRESSION_GREEN`
32. `GW-32 FULL_REGRESSION`
33. `GW-33 NON_TERMINAL_DOCUMENTATION`
34. `GW-34 DRAFT_PR`
35. `GW-35 EXACT_DIFF_REVIEW`
36. `GW-36 RULESET_VERIFICATION`
37. `GW-37 REVIEW_FINDINGS_RESOLUTION`
38. `GW-38 PR_READY`
39. `GW-39 TASK_REVIEW`
40. `GW-40 REVIEW_CHECKPOINT`
41. `GW-41 PREMERGE_REVALIDATION`
42. `GW-42 TASK_MERGE_READY`
43. `GW-43 EXACT_HEAD_MERGE`
44. `GW-44 MAIN_MERGE_COMMIT_OBSERVATION`
45. `GW-45 MAIN_CI`
46. `GW-46 GOVERNED_AUTODEPLOY_OBSERVATION`
47. `GW-47 GITHUB_TO_S1_SYNC_ATTESTATION`
48. `GW-48 DEPLOY_TYPECHECK_BUILD`
49. `GW-49 RUNTIME_REBUILD_OR_RESTART_ATTESTATION`
50. `GW-50 HEALTH_CHECK`
51. `GW-51 RUNTIME_IMAGE_ATTESTATION`
52. `GW-52 EXACT_SHA_DEPLOYMENT_PROOF`
53. `GW-53 LIVE_STATE_UPDATE`
54. `GW-54 STALE_RECEIPT_DETECTION`
55. `GW-55 RECEIPT_REFRESH`
56. `GW-56 TASK_RUNTIME_REVISION_BINDING`
57. `GW-57 TASK_DEPLOYING`
58. `GW-58 DOCUMENTATION_DRIFT_DECISION`
59. `GW-59 DOCUMENTATION_BRANCH_IF_REQUIRED`
60. `GW-60 DOCUMENTATION_RECONCILIATION`
61. `GW-61 DOCUMENTATION_PR`
62. `GW-62 DOCUMENTATION_CI_REVIEW`
63. `GW-63 DOCUMENTATION_EXACT_HEAD_MERGE`
64. `GW-64 DOCUMENTATION_AUTODEPLOY`
65. `GW-65 DOCUMENTATION_LIVE_STATE`
66. `GW-66 TERMINAL_RECEIPT_REFRESH`
67. `GW-67 TASK_VERIFYING`
68. `GW-68 TERMINAL_VERIFICATION`
69. `GW-69 TASK_DONE`
70. `GW-70 TERMINAL_CHECKPOINT`
71. `GW-71 LOCK_RELEASE`
72. `GW-72 SESSION_CLOSE_AND_QUEUE_RECONCILE`
73. `GW-73 UNIVERSAL_ACCEPTANCE`

This registry is a contract namespace, not a claim that all steps are already implemented.

## 11. GW-01 — Intent Capture Contract

GW-01 is the first new executable contract to implement.

### Input

```ts
type IntentCaptureInput = {
  rawIntent: string;
  source: string;
  receivedAt: string;
};
```

### Output

```ts
type IntentContext = {
  schemaVersion: 1;
  rawIntent: string;
  objective: string | null;

  operationType:
    | 'OBSERVE'
    | 'AUDIT'
    | 'CONTINUE'
    | 'FIX'
    | 'MODIFY'
    | 'REVIEW'
    | 'DOCUMENT'
    | 'DEPLOY'
    | 'CLOSE'
    | 'PROVISION'
    | 'UNKNOWN';

  repositoryHint: string | null;
  projectHint: string | null;
  taskHint: string | null;
  pullRequestHint: number | null;
  branchHint: string | null;
  shaHint: string | null;
  serverHint: string | null;
  domainHint: string | null;

  constraints: string[];
  references: string[];
  uncertainties: string[];
  contradictions: string[];

  mutationIntent: 'READ' | 'POTENTIAL_WRITE';

  receivedAt: string;
  source: string;
};
```

### Authorities

Only the incoming request and bounded source metadata.

GW-01 does not query GitHub, Live State, Operational Memory or server runtime in order to decide what the user said. Those authorities are consumed by later steps.

### Preconditions

- raw request exists;
- source exists;
- timestamp is valid;
- request size is bounded.

### Invariants

```text
NO_MUTATION
NO_TASK_CREATION
NO_TASK_CLAIM
NO_LOCK
NO_BRANCH
NO_COMMIT
NO_PR
NO_DEPLOY
NO_PERMISSION_INFERENCE
NO_REPOSITORY_RESOLUTION
NO_PROJECT_RESOLUTION
NO_SERVER_RESOLUTION
NO_SECRET_PERSISTENCE
```

### Allowed actions

```text
READ raw request
DERIVE objective
DERIVE provisional operation type
DERIVE explicit hints
DERIVE explicit constraints
DERIVE explicit references
DERIVE uncertainties
DERIVE contradictions
DERIVE READ/POTENTIAL_WRITE
RECORD bounded IntentContext when an existing governed store explicitly owns that projection
```

GWC V1 does not create a new persistent Intent store merely for GW-01.

### Statuses

```text
INTENT_CAPTURED
INTENT_INCOMPLETE
INTENT_AMBIGUOUS
INTENT_REJECTED
```

These statuses MUST NOT be confused with Governed Task Queue intent classification:

```text
CONTINUATION
NEW_TASK
DUPLICATE
CONFLICT
BLOCKED
OUT_OF_SCOPE
```

The latter remains owned by `mcp_reconcile_agent_intent` / Task Queue.

### Fundamental invariant

```text
INTENT
!= EVIDENCE
!= TASK
!= AUTHORIZATION
!= MUTATION
```

### Exit condition

GW-01 succeeds when the request is faithfully represented, all explicit hints and constraints are retained, unknowns remain unknown, contradictions are explicit and no side effect has occurred.

Next step: `GW-02 CONNECTION_BOOTSTRAP`.

## 12. Integration strategy

GWC V1 MUST be implemented incrementally.

### Increment 0 — contract substrate

Add only:

- stable step ID registry;
- generic contract types;
- generic evaluation result / attestation schemas;
- transition graph validation;
- global invariant declarations.

No behavior change.

### Increment 1 — GW-01

Add pure deterministic Intent Capture contract and tests.

It MUST NOT yet intercept every MCP request.

### Increment 2 — observation integration

Project GW-01 output into the existing governed bootstrap / intent reconciliation path without creating a second queue or second session authority.

### Increment 3 — wrap already-existing implemented steps

Map existing B1, B2, C2, session, task, lock, CI/merge/deploy/verification behavior to stable GWC step IDs without rewriting those engines.

### Increment 4 — implement missing universal resolver steps

C3, C4, C5, D1, D2, D3 and B3 remain separate governed functional tasks.

### Increment 5 — universal acceptance

Execute GW-73 against a non-MCP project such as Stablecoin with no repository-specific hardcode.

## 13. Non-goals of GWC V1

GWC V1 does not:

- activate GitRegistry V2;
- change C1 readiness semantics;
- switch the global WRITE gate to enforce;
- introduce a workflow database;
- replace Task Queue lifecycle;
- replace Governed Session;
- replace locks;
- replace Capability Reality;
- provision repositories, servers, runtimes or domains;
- hardcode Stablecoin;
- make C3/C4/C5 magically resolved before their own contracts exist.

## 14. TDD and rollout

Every executable increment follows:

```text
main exact SHA
→ governed branch
→ RED
→ observe RED
→ minimal GREEN
→ full regression
→ docs
→ Draft PR
→ exact-head CI/review
→ Ready
→ exact-head merge
→ governed autodeploy
→ Live State
→ documentation reconciliation if needed
→ VERIFYING
→ DONE
```

The design document itself does not create or close an Operational Memory task.

## 15. Acceptance criteria for the architecture

The design is acceptable when:

- it composes existing authorities rather than replacing them;
- the 73 IDs are stable and versionable;
- GW-01 cannot mutate external state;
- task intent classification remains owned by the Task Queue;
- GWC does not imply permission from tool availability;
- historical MCP behavior remains valid;
- missing C3/C4/C5/D1/D2/D3 work remains explicitly visible rather than faked;
- universal acceptance remains the final proof, not a hardcoded shortcut.
