# Unified Operational Work State Implementation Plan

> **For agentic workers:** Execute inline task-by-task with strict TDD; do not bypass governed lifecycle or GitHub→PR→CI→Autodeploy.

**Goal:** Add Capability Reality, Task Reality and per-operation Governance Decision to the existing V1 orchestration while enriching GitHub Work State and keeping shadow non-blocking.

**Architecture:** Add one pure governance-decision module consumed by Governed Context and the existing shadow gate. Extend the existing GitHub context and Current State projections additively. Task Reality remains observational and recommends only official lifecycle transitions.

**Tech Stack:** TypeScript, Node 20, `node:test`, MCP SDK, existing Operational Memory / Live State / GitHub collectors.

**Spec:** `docs/superpowers/specs/2026-08-29-unified-operational-work-state-design.md`

## Global constraints

- Reuse existing Live State, Current State, Governed Context, Task Queue, sessions, locks, receipts, checkpoints and shadow gate.
- Never create a second orchestrator, work queue or Live State V2.
- GitHub is source of mutation; S1 remains read-only toward GitHub.
- Preserve historical tool contracts and non-blocking shadow behavior.
- No `shadow → enforce` change.

### Task 1 — Pure Reality/Decision Kernel

**Files:**
- Create `src/governance/operationalDecision.ts`
- Create/extend `tests/unifiedOperationalWorkState.test.ts`

- [ ] Write failing tests for registered-but-unattested callability, client-attested NOT_CALLABLE, task behind/ahead reality, operation-specific fail-closed and deterministic reason codes.
- [ ] Run the branch CI and verify RED is caused by the missing kernel.
- [ ] Implement minimal pure types/functions to satisfy the tests.
- [ ] Re-run CI and keep all existing suites green.

### Task 2 — GitHub Work State Evidence

**Files:**
- Modify `src/governedContext/types.ts`
- Modify `src/governedContext/github.ts`
- Extend `tests/unifiedOperationalWorkState.test.ts` and existing GitHub context tests as needed.

- [ ] Add failing tests for explicit cache MISS/HIT/REFRESHED, work-branch SHA, PR owner/activity, required-check detail/provenance and exact-head matching.
- [ ] Verify RED.
- [ ] Extend the existing collector only; keep existing fields and errors compatible.
- [ ] Verify GREEN including stale/unavailable behavior.

### Task 3 — Governed Context Projection

**Files:**
- Modify `src/governedContext/types.ts`
- Modify `src/governedContext/service.ts`
- Modify `src/currentState/service.ts` only where additive projection is needed.
- Extend `tests/unifiedOperationalWorkState.test.ts` / `tests/governedContextService.test.ts`.

- [ ] Add failing tests showing Capability Reality defaults to UNKNOWN without attestation, Task Reality is observational, and Governance Decision is per-operation.
- [ ] Verify RED.
- [ ] Compose the new projections without changing existing nextAction/gate contracts.
- [ ] Verify GREEN.

### Task 4 — Shadow Reuse

**Files:**
- Modify `src/governance/scopedWriteGate.ts`
- Extend `tests/scopedWriteGate.test.ts` and unified tests.

- [ ] Add failing parity tests: the same observation produces the same reason in Governance Decision and the legacy shadow verdict.
- [ ] Verify RED.
- [ ] Delegate legacy shadow derivation through the common kernel while retaining verdict names and non-blocking callback semantics.
- [ ] Verify GREEN and historical regression tests.

### Task 5 — Observability and Documentation

**Files:**
- Modify existing dashboard/audit projection only where needed.
- Update canonical docs (`SUIVI.md`, `TASKS.md`, `CHANGELOG.md`, `CODE_REVIEW.md`, `DECISIONS_LOG.md`, `ACTIVITY_LOG.md`, `TODO.md`) with bounded facts.

- [ ] Add/extend tests for bounded metrics and no-secret journal data.
- [ ] Verify all test suites, typecheck, build, docs/governance and secret scan.
- [ ] Record enforce-ready observations only; leave mode `shadow`.

### Task 6 — Governed Delivery

- [ ] Confirm branch is based on the locked exact main SHA.
- [ ] Open Draft PR.
- [ ] Require CI `validate` on exact head.
- [ ] Read reviews and unresolved threads; fix regressions and re-run exact-head CI.
- [ ] Merge with `expected_head_sha` only when clean.
- [ ] Observe Governed Autodeploy on the actual merge SHA.
- [ ] Attest GitHub main = S1 HEAD = S1 origin/main = OCI/runtime revision, healthy, clean, push-disabled.
- [ ] Reconcile Live State, Current State and Task Reality.
- [ ] Transition task through official lifecycle to DONE, checkpoint, release locks, close governed session.
- [ ] Produce shadow observation / enforce-ready report; do not enable enforce.
