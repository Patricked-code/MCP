# B1 GitHub Identity Resolution Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan.

**Goal:** Resolve a verified GitHub user identity for the current governed OAuth principal and repository context without granting permissions, widening the binding, changing historical sessions, or introducing a parallel authority.

**Architecture:** Extend the versioned identity policy additively, refactor the existing GitHub connection and durable-account observation paths into shared secret-free observations, and attach a pure deterministic identity resolution to the existing GitHub/Governed Context observation and cache. The existing cache remains the only cache; the existing durable accounts remain connection authority; GitHub GET /user remains live principal proof.

**Tech Stack:** TypeScript ESM, Node.js 20+, Zod, node:test, GitHub REST API, existing Governed Context, existing Operational Memory, existing GitHub Actions and governed deploy workflow.

**Specification:** `docs/superpowers/specs/2026-09-07-b1-github-identity-resolution-design.md`

**Global constraints:** strict RED-before-GREEN; no direct push to main; no direct S1 code write; no new registry/store/session manager/cache/tool; WRITE gate remains shadow; no permission or secret in B1 output; exact-head review and deployment attestation required.

## Phase 0 — Governed readiness

### Task 0.1: Reobserve and bind the approved design

**Authority operations:**

- Read GitHub main, open PRs, rulesets and the B1 branch.
- Read Live State, Current State, Work Queue and the existing B1 design session.
- Resume the existing design session, acknowledge the current state and checkpoint the human design approval.
- Verify no earlier active or executable task exists.

**Expected evidence:** GitHub/S1/runtime exact SHA, current stateVersion and receipt, queue storeRevision, sessionRevision, no conflicting lock.

### Task 0.2: Verify isolated baseline

**Files:** no repository mutation.

**Commands:**

1. `npm install`
2. `npm run typecheck`
3. `npm run build`
4. `node --import tsx --test tests/*.test.ts`
5. `npm run lint:secrets`
6. `git diff --check`

The local runtime may reject the tsx CLI IPC socket. In that environment, `node --import tsx --test` is the equivalent test runner and must be used locally; GitHub CI must still run the canonical npm scripts.

## Phase 1 — Policy and pure resolver, strict RED/GREEN

### Task 1.1: Add failing policy and resolver contracts

**Files:**

- Create: `tests/githubIdentityResolution.test.ts`
- Modify: `package.json` to include the new test file in `test:readonly-safety`

**RED tests:**

- V1 parses with all legacy fields unchanged and has no bindings.
- additive V2 parses only when every V1 field remains present.
- V2 missing any legacy field is rejected.
- unknown versions and unrecognized keys are rejected.
- the approved binding resolves only for `oauth:wealthtech-mcp-admin` plus `Patricked-code/MCP`, one `Patricked-code` user connection and a fresh matching `/user` proof.
- no binding produces `NONE`.
- multiple applicable bindings and multiple matching connections produce `AMBIGUOUS`.
- missing OAuth principal, required repository context, configured connection, verified account context, authentication proof, current evidence, API availability or expected login produce `UNVERIFIED` with the specified reason code.
- an accessible organization remains separate from the authenticated user.
- the returned object contains no permission or secret-shaped fields.
- future bindings for another repository/account coexist without changing the current result.

**RED command:**

`node --import tsx --test tests/githubIdentityResolution.test.ts`

**Expected RED:** module-not-found for the not-yet-created policy/resolver modules, while the historical 284-test baseline remains independently green.

Commit only tests and test-runner registration. Open a draft PR after task claim/locks so GitHub CI records the exact failing test head.

### Task 1.2: Implement Identity Policy V1/V2 parser

**Files:**

- Create: `src/github/identityPolicy.ts`

**Implementation contract:**

- Define strict Zod schemas for the full existing V1 shape.
- Define V2 by extending that complete shape with `githubPrincipalBindings`.
- Validate bindingId, OAuth principal, provider, owner/type selector, expected login, optional repository context, `IDENTITY_ONLY` effect and enabled flag.
- Export a discriminated V1/V2 type and a non-throwing parse result for runtime fail-closed handling.
- Export a loader that reads one bounded UTF-8 policy file and computes SHA-256 from the exact bytes.
- Do not normalize V1 into V2 and do not invent bindings.
- Bound the file size, array lengths and all strings.

### Task 1.3: Implement the stateless resolver

**Files:**

- Create: `src/github/identityResolution.ts`

**Implementation contract:**

- Export `resolveGithubIdentity(input)` as a pure synchronous function.
- Do no file, network, secret, cache or store access.
- Apply exact principal matching, repository context constraints and case-insensitive GitHub login comparison.
- Never use first-match or configured account order as precedence.
- Return only identity fields, freshness, provenance, policy digest and stable reason codes.
- Never return scopes, grants, `mayWrite`, `mayMerge`, `mayDeploy`, role, human identity, secret path or token.

**GREEN command:**

`node --import tsx --test tests/githubIdentityResolution.test.ts`

**Expected GREEN:** all pure policy and resolution cases pass.

## Phase 2 — Shared observations and existing-cache integration

### Task 2.1: Add failing shared-observation integration tests

**Files:**

- Modify: `tests/governedContextGithub.test.ts`
- Modify: `tests/governedContextService.test.ts`
- Modify: `tests/governedDashboard.test.ts`
- Create: `tests/githubConnectionObservation.test.ts`
- Modify: `package.json` to include the new connection test.

**RED tests:**

- one shared `/user` observation yields a bounded authenticated principal and never returns the token;
- a public organization profile never verifies an organization context; only an active owner-matching authenticated membership does;
- same-credential observations share one ephemeral non-secret correlation while different credentials remain isolated;
- the resolved projection includes only account contexts correlated to the selected credential and never exposes the correlation;
- the durable account status path uses that shared observer and preserves its historical text contract;
- explicit Governed Context reconciliation attaches the B1 identity result;
- cache-only get never performs a GitHub request on a new key;
- cache entries are isolated across principal, repository, policy digest/binding and work branch;
- stale cached identity evidence is marked stale and cannot remain RESOLVED;
- a service context without a compatible OAuth ConnectionContext yields fail-closed identity evidence, not a throw;
- dashboard renders status/login/account context with HTML escaping and no permissions or secrets.

**RED command:**

`node --import tsx --test tests/githubConnectionObservation.test.ts tests/governedContextGithub.test.ts tests/governedContextService.test.ts tests/governedDashboard.test.ts`

### Task 2.2: Refactor the existing GitHub connection observer

**Files:**

- Modify: `src/github/connection.ts`
- Modify: `src/tools/durableAccounts.ts`

**Implementation contract:**

- Extract the current bounded GitHub JSON request behavior into a shared internal/exported helper.
- Add `observeGithubAuthenticatedPrincipal` around GET /user.
- Preserve `validateGithubToken`, `getGithubConnectionStatus`, token saving and web page behavior.
- Export a sanitized durable account descriptor/observation path from the existing durable accounts module.
- Reuse the same `/user` observer for durable account tools and B1.
- Deduplicate identical token-file observations only within one collection call; do not create a durable cache.
- Continue to restrict token paths to `/app/secrets/*`.
- Distinguish the authenticated user from an accessible organization context.
- Verify an organization context through active `GET /user/memberships/orgs/{owner}` evidence; `GET /orgs/{owner}` alone is never sufficient.
- Assign one ephemeral non-secret authentication-context identifier per token-file group during a collection, never persist or project it, and fail closed when correlation is unavailable.

### Task 2.3: Integrate B1 into the existing GitHub collector/cache

**Files:**

- Modify: `src/governedContext/types.ts`
- Modify: `src/governedContext/github.ts`
- Modify: `src/governedContext/service.ts`
- Modify: `src/tools/governedContext.ts`
- Modify: `src/governedContext/dashboard.ts`

**Implementation contract:**

- Add the identity projection to `GithubOperationalContext` so one existing GitHub observer owns both work-state and identity observation.
- Extend collector calls with an optional identity scope derived only from the visible session's OAuth ConnectionContext.
- Load and validate policy plus durable account observations only during collect/reconcile, never by creating a second collector.
- Keep `getCurrent` cache/store-only; it returns MISS/UNVERIFIED for an unseen bounded key.
- Build the single cache key from normalized work branch, OAuth principal, repository context, policy digest and applicable binding identifier.
- Convert cached CURRENT identity evidence to STALE and fail closed when the cache expires.
- Preserve every existing GitHub work-state field and reason code.
- Add identity to fallback and degraded contexts.
- Compose identity without changing governance permission calculations.
- Filter accessible account contexts to the authentication context of the selected durable connection.
- Add a minimal escaped dashboard projection.

### Task 2.4: Package the versioned policy with the runtime

**Files:**

- Modify: `Dockerfile`
- Modify: `.mcp/identity-policy.json`

**Implementation contract:**

- Copy `.mcp/identity-policy.json` into `/app/.mcp/identity-policy.json` in the same image that contains the resolver.
- Change `schemaVersion` from 1 to 2.
- Preserve `updatedAt`, `goal`, `currentSignals`, `limits`, `s1GithubDeploymentIdentity` and `requiredSuiviFields` semantically.
- Add only the approved contextual binding.
- Do not add a credential, permission, global default or priority.

**GREEN commands:**

1. `npm run typecheck`
2. `npm run build`
3. `node --import tsx --test tests/githubIdentityResolution.test.ts tests/githubConnectionObservation.test.ts tests/governedContextGithub.test.ts tests/governedContextService.test.ts tests/governedDashboard.test.ts`

## Phase 3 — Historical non-regression and canonical documentation

### Task 3.1: Protect historical session and tool contracts

**Files:**

- Modify only if a real gap is found: `tests/connectionContext.test.ts`
- Modify only if a real gap is found: `tests/governedSessionService.test.ts`
- Keep unchanged: `src/operationalMemory/connectionContext.ts`
- Keep unchanged: `src/operationalMemory/types.ts`
- Keep unchanged: `tests/fixtures/existing-tool-contracts-v1.json`

**Assertions:**

- ConnectionContext stays schemaVersion 1.
- historical session documents without GitHub identity still parse byte-for-byte.
- no resolved identity is persisted into Operational Memory.
- existing 111 tools and 92 protected contracts remain exact.
- WRITE gate behavior remains shadow and no capability is inferred from B1.

### Task 3.2: Reconcile stable documentation

**Files:**

- Modify: `MCP_CONNECTION_IDENTITY_MODEL.md`
- Modify: `ARCHITECTURE.md`
- Modify: `MCP_DURABLE_ACCOUNT_MANAGEMENT.md`
- Modify: `MCP_PERMISSIONS_MODEL.md`
- Modify: `MCP_FUNCTIONAL_CARTOGRAPHY.md`
- Modify as generated/required: `.mcp/function-cartography.json`
- Modify: `CHANGELOG.md`
- Modify: `DECISIONS_LOG.md`
- Modify: `SUIVI.md`
- Modify according to lifecycle only: `ROADMAP.md`, `TODO.md`, `TASKS.md`
- Regenerate: `docs/governance/markdown-inventory-v1.json`

**Content requirements:**

- remove and explicitly supersede the obsolete `.mcp/identity-registry.json` instruction;
- document policy versus configured connection versus secret versus live proof versus derived projection;
- document GitHub user versus organization context;
- state that permissions remain SLOT-11 and none are granted by B1;
- retain the global B1→B2→C→D chronology;
- record the task and PR as dynamic authority references, not a second runtime store.

**Commands:**

1. `npm run cartography:write`
2. `node scripts/generate-doc-governance-baseline.mjs`
3. `npm run docs:check`
4. `npm run current-state:evidence`

## Phase 4 — Complete verification, review and delivery

### Task 4.1: Run fresh full verification

**Commands:**

1. `npm run typecheck`
2. `npm run build`
3. `node --import tsx --test tests/*.test.ts`
4. `npm run test:governance` in GitHub CI canonical environment
5. `npm run test:readonly-safety` in GitHub CI canonical environment
6. `npm run docs:check`
7. `npm run current-state:evidence`
8. `npm run lint:secrets`
9. `git diff --check`
10. `git status --short --branch`

Record exact counts and the tested HEAD. Never claim success from an earlier run.

### Task 4.2: Governed review

**GitHub operations:**

- Keep the PR draft while RED or implementation is incomplete.
- Update the PR body with task/session, scope, authorities, RED/GREEN SHAs, tests, exclusions, rollback and exact current head.
- Self-review the full diff against the approved spec.
- Request/use available independent GitHub review; do not treat author self-approval as independent approval.
- Resolve every actionable thread only after the correcting commit is present.
- Mark ready only when full verification is green.
- Read required checks and reviews again from GitHub.
- Transition the Governed Task to REVIEW then MERGE_READY only with exact-head evidence.

### Task 4.3: Exact-head merge and deploy

**Preconditions:**

- protect-main active;
- required `validate` check successful on the exact PR head;
- no unresolved review thread or blocking review;
- PR head unchanged since verification;
- task/session/locks/receipt current;
- no main divergence that invalidates review.

**Actions:**

- merge with `expected_head_sha` and the repository's allowed method;
- record the returned merge SHA;
- observe GitHub main before deployment;
- let the governed GitHub→S1 workflow deploy the exact main SHA;
- never write code directly to S1;
- poll bounded workflow/runtime authorities rather than assuming completion.

### Task 4.4: Attest and close

**Required evidence:**

- GitHub main = S1 HEAD = S1 origin/main = runtime OCI revision = exact merge SHA;
- S1 clean and diff empty;
- runtime running and healthy;
- Live State CURRENT, `FULLY_ALIGNED`, no contradictions;
- tool catalogue and historical contracts unchanged;
- identity projection RESOLVED for current OAuth principal and `Patricked-code/MCP` with no permissions.

**Governed lifecycle:**

- transition task to DEPLOYING, then VERIFYING, then DONE only with evidence;
- create final canonical checkpoint;
- release repository/task locks;
- close the Governed Session;
- reconcile the queue;
- continue only with the next genuinely executable task; do not pre-create B2.

## Rollback conditions

Stop forward delivery and prepare a governed rollback if any of the following occurs:

- the binding applies outside `Patricked-code/MCP`;
- multiple accounts resolve arbitrarily;
- GET /user and expected login contradict;
- any permission/capability is inferred from B1;
- any secret or secret path leaks into output, logs or tests;
- Identity Policy V1 becomes unreadable;
- a historical session schema changes;
- tool contracts or WRITE gate change;
- deployment cannot attest exact SHA or runtime health;
- Live State cannot reach `FULLY_ALIGNED` without contradiction.

Rollback is an exact governed revert/PR/deploy to the prior known-good main SHA. No data migration or destructive backfill is part of B1.
