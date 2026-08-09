# MCP Live State V1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a native read-only Live State Engine that continuously reconciles GitHub `main`, S1 Git, Docker runtime provenance, and canonical documentation, persists the result atomically, and exposes it through MCP tools.

**Architecture:** Add focused `src/liveState/*` modules inside the existing Node/TypeScript MCP process. Reuse GitHub token access, `runReadOnlyCommand`, bounded runtime attestation, `/app/data`, and the current read-only tool registration path. The engine reconciles at startup and every 60 seconds, degrades explicitly on source failures, and never performs repository/runtime mutations.

**Tech Stack:** Node 20, TypeScript, `node:test`, MCP SDK, existing SSH/GitHub helpers, Docker Compose.

## Global Constraints

- Canonical repository: `Patricked-code/MCP`; canonical branch: `main`.
- No direct push to `main`; work only on `mcp/live-state-v1-20260809` through PR/CI.
- No PostgreSQL, Redis, GitHub App/webhooks, new service, new container, locks, heartbeats, or write-gate work in V1.
- `/app/data/mcp-live-state.json` is runtime-only, mode `0600`, written atomically.
- Read-only collectors must never run pull/reset/clean/checkout/rebase/stash/build/restart/write operations.
- `FULLY_ALIGNED` is illegal unless GitHub, S1, and runtime revision are current and proven equal and no blocking drift exists.
- Existing secret/safety/typecheck/build/docs tests must continue to pass.

---

### Task 1: Pure state model and reconciliation

**Files:**
- Create: `src/liveState/types.ts`
- Create: `src/liveState/reconcile.ts`
- Create: `tests/liveStateReconcile.test.ts`

**Interfaces:**
- Produces `LiveStateObservations`, `LiveStateSnapshot`, `LiveStateGlobalStatus`, `reconcileLiveState(observations, previous, now)` and `applyFreshness(snapshot, now)`.

- [ ] **Step 1: Write failing reconciliation tests** covering aligned GitHub/S1, deployment pending, runtime unverified, runtime deployment pending, documentation drift, unavailable source, stale freshness, and semantic `stateVersion` behavior.
- [ ] **Step 2: Run `npx tsx --test tests/liveStateReconcile.test.ts` and confirm RED.**
- [ ] **Step 3: Implement the minimal pure types/reconciliation logic.** Use deterministic comparisons; semantic version comparison excludes timestamps/freshness/stateVersion.
- [ ] **Step 4: Re-run the test and confirm GREEN.**
- [ ] **Step 5: Commit `feat(live-state): add reconciliation model`.**

### Task 2: Atomic persistent store

**Files:**
- Create: `src/liveState/store.ts`
- Create: `tests/liveStateStore.test.ts`

**Interfaces:**
- Produces `readLiveState()`, `writeLiveState(snapshot)`, and `liveStateFilePath()`.
- Default path `/app/data/mcp-live-state.json`, overridable only by `MCP_LIVE_STATE_FILE` for tests/runtime configuration.

- [ ] **Step 1: Write failing tests** using a temporary directory; verify JSON validity, replacement, preserved final file after multiple writes, and final file mode `0600`.
- [ ] **Step 2: Run the store test and confirm RED.**
- [ ] **Step 3: Implement mkdir `0700`, same-directory temporary write, chmod `0600`, atomic rename, and tolerant read for missing/invalid files.**
- [ ] **Step 4: Re-run and confirm GREEN.**
- [ ] **Step 5: Commit `feat(live-state): add atomic state store`.**

### Task 3: Read-only collectors and runtime provenance

**Files:**
- Modify: `src/github/inventory.ts`
- Create: `src/liveState/collect.ts`
- Modify: `Dockerfile`
- Modify: `docker-compose.yml`
- Modify: `src/tools/selfManagement.ts`
- Create: `tests/liveStateCollectors.test.ts`

**Interfaces:**
- Export from GitHub inventory: `getGithubRepositoryHead(owner, repo, branch)` returning `{ ok, sha, error }` without exposing token material.
- Produce collectors `collectGithubObservation()`, `collectS1Observation()`, `collectRuntimeObservation()`, `collectDocumentationObservation()`.

- [ ] **Step 1: Write failing collector/safety tests.** Assert S1 command contains only read-only Git/status/remotes; runtime collector reuses bounded attestation; GitHub helper returns normalized status; deployment command exports current S1 `git rev-parse HEAD` as `MCP_GIT_REVISION`.
- [ ] **Step 2: Run targeted tests and confirm RED.**
- [ ] **Step 3: Implement the GitHub head helper using the existing token/API primitives in `inventory.ts`, with no token returned or logged.**
- [ ] **Step 4: Implement S1/runtime/documentation collectors with independent try/catch normalization.** Parse bounded `key=value` output only.
- [ ] **Step 5: Add OCI provenance:** Dockerfile `ARG GIT_REVISION=unknown` + safe source/revision labels; Compose build arg `${MCP_GIT_REVISION:-unknown}`; self-management deployment command prefixes `MCP_GIT_REVISION="$(git rev-parse HEAD)"` before `docker compose up -d --build`.
- [ ] **Step 6: Re-run targeted tests and confirm GREEN.**
- [ ] **Step 7: Commit `feat(live-state): collect governed repository state`.**

### Task 4: Engine lifecycle and MCP tools

**Files:**
- Create: `src/liveState/engine.ts`
- Create: `src/tools/liveState.ts`
- Modify: `src/tools/readOnly.ts`
- Modify: `src/server.ts`
- Modify: `package.json`
- Create: `tests/liveStateTools.test.ts`
- Create: `tests/liveStateEngine.test.ts`

**Interfaces:**
- `reconcileNow()` performs one guarded reconciliation and persists it.
- `getCurrentLiveState()` returns persisted/in-memory state with current freshness.
- `startLiveStateEngine()` performs initial reconciliation and creates one non-overlapping 60-second loop.
- MCP tools: `mcp_get_live_state`, `mcp_reconcile_live_state`.

- [ ] **Step 1: Write failing engine/tool registration tests** for both tool names, no write catalog exposure, independent collector failure degradation, non-overlap guard, and current freshness on read.
- [ ] **Step 2: Run targeted tests and confirm RED.**
- [ ] **Step 3: Implement engine dependency injection for tests, singleton production engine, error isolation, persistence, and interval lifecycle.**
- [ ] **Step 4: Register tools through `registerReadOnlyTools`.** Extend `get_project_context` additively with compact Live State summary obtained without forcing reconciliation.
- [ ] **Step 5: Start engine from `startHttpServer()` without making an initial collection failure fatal to server startup.**
- [ ] **Step 6: Add new tests to `test:readonly-safety` package script.**
- [ ] **Step 7: Re-run targeted tests and confirm GREEN.**
- [ ] **Step 8: Commit `feat(live-state): expose governed live state tools`.**

### Task 5: Governance documentation, full validation, PR, and deployment

**Files:**
- Modify: `SUIVI.md`
- Modify: `TASKS.md`
- Modify: `TODO.md`
- Modify: `DECISIONS_LOG.md`
- Modify: `CHANGELOG.md`
- Modify: `PRODUCTION_STATE.json` only with observed/declared facts; never invent runtime proof.

- [ ] **Step 1: Reconcile documented state with verified GitHub facts.** Record PR #37 merged at `d3bcac0cf17608963317a18aa2916a5997916394`; preserve S1/runtime fields as last-observed/unverified when a current connector is unavailable.
- [ ] **Step 2: Declare the Live State V1 task and architecture decision without duplicating the full spec.**
- [ ] **Step 3: Run full validation:** `npm ci`, `npm run test:readonly-safety`, `npm run typecheck`, `npm run build`, `npm run lint:secrets`, `npm run docs:check`, `git diff --check` through GitHub CI/local governed environment available.
- [ ] **Step 4: Audit the complete diff for secrets, unrestricted shell, destructive Git, arbitrary Docker inspect surfaces, and hard-coded main SHA.**
- [ ] **Step 5: Open one draft PR to `main`, wait for CI, fix failures on the same branch, then make ready/merge only with green checks and unchanged expected head SHA.**
- [ ] **Step 6: If and only if S1 connector is available, run current S1 preflight, `mcp_sync_from_github_s1`, verify S1 HEAD equals merge SHA and clean tree, typecheck/build, governed Docker rebuild, health, runtime attestation, and Live State tool checks.**
- [ ] **Step 7: If S1 connector remains unavailable, stop at the merged GitHub state and explicitly report `DEPLOYMENT_PENDING`; never claim deployment.**
- [ ] **Step 8: Update final checkpoint only with evidence actually observed.**
