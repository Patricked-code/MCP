# B2 Repository Resolution & Multi-Account GitHub Routing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Resolve an exact target GitHub repository and deterministically select the correct durable GitHub account/credential route across Patricked-code, chainsolutions-wealthtech and Wealthtechinnovations without granting authorization or confusing same-named repositories.

**Architecture:** Extend the existing Identity Policy additively to V3 with `ROUTING_ONLY` owner-scoped bindings while keeping B1 V1/V2/V3-compatible. Add a pure repository resolver plus an I/O routing service that reuses durable account configuration, existing GitHub credential observation and GitRegistry V2 derivation. Project B2 separately into Governed Context only on explicit reconciliation with a target repository; do not alter the existing control-plane GitHub work-state collector or create a second cache.

**Tech Stack:** TypeScript ESM, Node.js >=20, Zod, Node test runner via `tsx --test`, GitHub REST API helpers already present in the repository.

**Spec:** `docs/superpowers/specs/2026-09-10-b2-repository-resolution-design.md`

## Global Constraints

- Reuse branch `mcp/b2-repository-resolution-20260909`; create no second B2 branch.
- Never push directly to `main`; PR required and Draft by default.
- Preserve B1 `IDENTITY_ONLY` semantics and the contextual `Patricked-code/MCP` binding.
- Route by exact `owner/name` plus live numeric GitHub repository id; never by bare/similar repository name.
- `ROUTING_ONLY` is technical route selection, never an Effective Capability.
- Do not expose token, token path, Authorization header, raw credential reference or ephemeral authentication-context id.
- Do not rewrite `data/mcp-git-registry.json`; consume the existing V2 in-memory derivation.
- Do not change WRITE gate mode, deployment workflow, S1 read-only identity, session model, locks or project/server/domain bindings.
- Strict RED-before-GREEN for every behavior change.

---

### Task 1: Identity Policy V3 without B1 regression

**Files:**
- Modify: `src/github/identityPolicy.ts`
- Modify: `src/github/identityResolution.ts`
- Modify: `tests/githubIdentityResolution.test.ts`

**Interfaces:**
- Consumes: existing `GithubIdentityPolicyV1`, `GithubIdentityPolicyV2`, `GithubPrincipalBinding`.
- Produces: `GithubIdentityPolicyV3`, `GithubRepositoryRoutingBinding`, and B1 resolver support for V3 using unchanged `githubPrincipalBindings` semantics.

- [ ] **Step 1: Write failing tests** proving V3 is V2 plus `githubRepositoryRoutingBindings`, malformed/unknown policies fail closed, and B1 resolves the existing `Patricked-code/MCP` identity unchanged under V3.
- [ ] **Step 2: Push the RED-only commit** and verify MCP CI fails for the new V3 contract rather than an unrelated baseline failure.
- [ ] **Step 3: Implement the minimal V3 schemas/types** with strict owner-scoped `ROUTING_ONLY` bindings; keep V1/V2 parse paths intact.
- [ ] **Step 4: Update B1 resolver** so policies with schemaVersion 2 or 3 use the same `githubPrincipalBindings` path.
- [ ] **Step 5: Verify targeted tests and full CI return GREEN.**
- [ ] **Step 6: Commit GREEN independently.**

### Task 2: Pure B2 repository resolver

**Files:**
- Create: `src/github/repositoryResolution.ts`
- Create: `tests/githubRepositoryResolution.test.ts`
- Modify: `package.json` to include the new test in `test:readonly-safety`.

**Interfaces:**
- Consumes: `GithubIdentityPolicy`, optional `GitRegistryV2`, exact target repository, OAuth principal, required technical access and secret-free route observations.
- Produces: `resolveGithubRepository(input): GithubRepositoryResolution` with `RESOLVED | NONE | AMBIGUOUS | UNVERIFIED`, stable reason codes and no secret-bearing fields.

- [ ] **Step 1: Write RED tests** for exact repository parsing, owner routing, same-name repository separation, missing/duplicate bindings, missing/duplicate connections, technical read/write/admin predicates, archived-write refusal, registry registered/unregistered projection and secret-free output.
- [ ] **Step 2: Push RED and observe expected CI failure** because `repositoryResolution.ts` does not yet exist.
- [ ] **Step 3: Implement the minimal pure resolver** with case-insensitive owner/full-name comparisons, positive numeric repository id requirement and no heuristic fallback.
- [ ] **Step 4: Verify new targeted tests plus B1 tests GREEN.**
- [ ] **Step 5: Commit GREEN independently.**

### Task 3: Live multi-credential route observation service

**Files:**
- Create: `src/github/repositoryRouting.ts`
- Modify: `src/tools/durableAccounts.ts` only if a reusable account loader is required; do not duplicate credential authority.
- Extend: `tests/githubRepositoryResolution.test.ts`

**Interfaces:**
- Consumes: `.mcp/identity-policy.json`, `data/github-accounts.json`, existing secret files, `observeGithubAuthenticatedPrincipal`, `githubJsonRequest`, and `migrateGitRegistryToV2`.
- Produces: `createGithubRepositoryRoutingService().resolve(...)` returning only public `GithubRepositoryResolution`; raw credentials never leave the service.

- [ ] **Step 1: Add RED service tests with injected dependencies** proving the selected route probes only the exact repository and keeps credentials out of output.
- [ ] **Step 2: Prove separate credentials can route separate owners** and that the same-name Stablecoin repositories remain distinct.
- [ ] **Step 3: Implement bounded config loading and credential use** restricted to `/app/secrets/*`, reusing existing GitHub observation semantics.
- [ ] **Step 4: Parse only bounded repository evidence** (`id`, `full_name`, `default_branch`, `archived`, `permissions`).
- [ ] **Step 5: Verify targeted and full CI GREEN.**
- [ ] **Step 6: Commit GREEN independently.**

### Task 4: Governed Context integration without replacing control-plane GitHub state

**Files:**
- Modify: `src/governedContext/types.ts`
- Modify: `src/governedContext/service.ts`
- Modify: `src/tools/governedContext.ts`
- Modify: `tests/governedContextService.test.ts`
- Modify: `tests/governedContextTools.test.ts`

**Interfaces:**
- Consumes: `GithubRepositoryRoutingService` and optional explicit `target_repository` / `required_github_access` supplied only to `mcp_reconcile_governed_context`.
- Produces: optional top-level `repositoryResolution` in `GovernedOperationalContext`; existing `github` remains the work-state observation for `Patricked-code/MCP`.

- [ ] **Step 1: Add RED tests** proving historical calls with no target are unchanged and explicit reconciliation adds a separate B2 projection.
- [ ] **Step 2: Implement optional input fields** on `GovernedContextInput` without making them mandatory for old callers.
- [ ] **Step 3: Wire `createGithubRepositoryRoutingService()` into the existing context dependency composition.**
- [ ] **Step 4: Add optional bounded tool inputs only to `mcp_reconcile_governed_context`; keep the resource and `mcp_get_governed_context` cache semantics unchanged.**
- [ ] **Step 5: Verify all Governed Context tests and full CI GREEN.**
- [ ] **Step 6: Commit GREEN independently.**

### Task 5: Versioned routing policy and regression closure

**Files:**
- Modify: `.mcp/identity-policy.json`
- Modify: `tests/githubIdentityResolution.test.ts`
- Modify if generated governance requires it: `.mcp/function-cartography.json`

**Interfaces:**
- Consumes: V3 schema from Task 1.
- Produces: three explicit owner-scoped `ROUTING_ONLY` bindings for `oauth:wealthtech-mcp-admin`.

- [ ] **Step 1: Add the three versioned routing bindings** for Patricked-code, chainsolutions-wealthtech and Wealthtechinnovations; no wildcard.
- [ ] **Step 2: Update versioned-policy tests** to require V3 and preserve the original B1 principal binding byte-for-byte in meaning.
- [ ] **Step 3: Run/observe `typecheck`, `build`, docs checks, governance tests, secret scan, full read-only safety suite and whitespace check.**
- [ ] **Step 4: If function cartography reports drift, regenerate/update only the canonical generated cartography and re-run checks.**
- [ ] **Step 5: Commit only verified closure changes.**

### Task 6: Persistent state, Draft PR and exact-head verification

**Files:**
- Modify additively: `SUIVI.md`, `TASKS.md`, `TODO.md`, `ROADMAP.md`, `CHANGELOG.md`, `DECISIONS_LOG.md` only where their existing roles require B2 projection.

**Interfaces:**
- Consumes: exact commits/CI evidence from Tasks 1-5 and the pre-existing B2 branch.
- Produces: deterministic agent-independent resume state and a Draft PR; does not fabricate runtime task/lock/session state.

- [ ] **Step 1: Reconcile documentary state additively** with exact SHAs, RED/GREEN evidence, exclusions, current external runtime-state limitation and next action.
- [ ] **Step 2: Verify documentation checks and full CI on the exact head.**
- [ ] **Step 3: Open a Draft PR from `mcp/b2-repository-resolution-20260909` to `main`.**
- [ ] **Step 4: Re-read PR head, required checks, reviews/threads and compare against `main`.**
- [ ] **Step 5: Do not merge unless the repository governance gates and runtime task/session/lock authorities are observable and satisfied.**
- [ ] **Step 6: Persist the exact point of reprise if merge/deploy remains gated externally.**
