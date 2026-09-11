# B2 Repository Resolution Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add fail-closed GitHub repository resolution to SLOT-07 while preserving the existing B1 identity, durable-account, Governed Context, GitRegistry, permission, session, task, tool and deployment authorities.

**Architecture:** Add one pure repository-resolution domain module, extend the existing durable-account observer with a collection-local observation batch, then project the result through the existing GitHub Governed Context collector and cache. Exact `ConnectionContext.repository` is preferred; active GitRegistry V1 mappings are fallback candidates only. Live GitHub evidence is required for `RESOLVED`; no repository result grants a capability.

**Tech Stack:** TypeScript, Node.js test runner via `tsx`, Zod-compatible existing validation patterns, existing Governed Context and durable-account services, GitHub REST API, Markdown/JSON governed documentation.

**Spec:** `docs/superpowers/specs/2026-09-09-b2-repository-resolution-design.md`

**Approved Design Checkpoint:** `0c6299c9-9f62-477f-907b-f97eb2ffbe4c`

## Global Constraints

- Base every governed mutation on the freshly attested GitHub `main` SHA and re-read Live State before merge/deploy gates.
- Preserve `ConnectionContext` V1 bytes and historical session/task/checkpoint fixtures.
- Reuse `src/tools/durableAccounts.ts`; do not add a second observer, registry, cache, tool or credential store.
- Keep GitRegistry V1 as read-only candidate evidence; never call its legacy default-project fallback.
- Keep GitRegistry V2 dry-run only; C1 owns activation.
- Keep permissions and Effective Capabilities in SLOT-11. Strip GitHub `permissions`, grants and write/deploy implications from B2.
- Never expose a token, raw credential path, raw GitHub response or raw error body.
- No direct S1 code write. Delivery remains GitHub PR → governed deploy → attestation.
- Use RED → GREEN → REFACTOR for each production behavior and record the exact failing and passing commands.

---

## Task 1: Reconcile Design Approval and Open Governed Execution

**Governance records:** existing session `98e9aee8-20c0-404f-807f-6630ffbb1a1c`, approved checkpoint `0c6299c9-9f62-477f-907b-f97eb2ffbe4c`

- [ ] **Step 1: Re-read current authorities**

  Invoke bridge `ping` immediately before each runtime read, then re-read Live State, Current State, Work Queue, governed sessions and the B2 design session. Re-read GitHub `main`, branches and open PRs. Stop mutations if GitHub/S1/runtime are not exact-SHA aligned or if another conflicting task/lock exists.

- [ ] **Step 2: Review the approved specification and this plan**

  Verify every approved design constraint is represented: SLOT-07 only, exact-context preference, V1 mapping fallback, B1 prerequisite, same authentication-context observation, four fail-closed statuses, no implicit permissions, historical compatibility, bounded evidence, rollback and documentation.

- [ ] **Step 3: Checkpoint the approval**

  Append a governed checkpoint to the existing B2 design session with the user's approval, spec/plan digests, cleared human-approval blocker, exact authority versions and next action `REGISTER_B2_TASK`.

- [ ] **Step 4: Register B2 only if it is now executable**

  Reconcile agent intent into one governed task titled `B2 — GitHub Repository Resolution`, dependent on completed B1, scoped only to B2 code/tests/docs. Do not create downstream B3/C1 tasks.

- [ ] **Step 5: Claim and lock**

  Claim the B2 task in the existing governed session, acquire its task lock and the narrow repository/component locks required by the task. Record returned task/session/store revisions after every mutation.

- [ ] **Step 6: Create the governed branch**

  Create `mcp/b2-repository-resolution-20260909` from the exact current `main` SHA and bind it to the governed task/session. Use an isolated worktree based on the same content; do not reuse the closed B1 branch as delivery history.

---

## Task 2: Persist the Approved Spec and Plan

**Files:**
- Create: `docs/superpowers/specs/2026-09-09-b2-repository-resolution-design.md`
- Create: `docs/superpowers/plans/2026-09-09-b2-repository-resolution.md`

- [ ] **Step 1: Copy reviewed artifacts into the governed branch**

  Preserve the approved checkpoint, base attestation and explicit exclusions in both files.

- [ ] **Step 2: Validate documentation structure**

  Run: `node scripts/check-docs.mjs`

  Expected: PASS, or a precise RED caused only by canonical documentation not yet reconciled in later tasks.

- [ ] **Step 3: Commit the design boundary**

  Commit message: `docs(b2): record approved repository resolution design`

---

## Task 3: Pure Repository Resolver — RED and GREEN

**Files:**
- Create: `src/github/repositoryResolution.ts`
- Create: `tests/githubRepositoryResolution.test.ts`

- [ ] **Step 1: Write RED tests for exact context and status propagation**

  Cover:
  - exact `Patricked-code/MCP` + B1 `RESOLVED/CURRENT` + matching verified live proof → `RESOLVED`;
  - case-insensitive comparison while retaining observed GitHub casing;
  - B1 `AMBIGUOUS` → B2 `AMBIGUOUS`;
  - B1 `NONE`, stale or otherwise unverified → B2 `UNVERIFIED`;
  - candidate owner different from B1 selected account → `UNVERIFIED`;
  - missing authentication-context correlation → `UNVERIFIED`.

  Run: `node --import tsx --test tests/githubRepositoryResolution.test.ts`

  Expected RED: module or exported resolver is missing.

- [ ] **Step 2: Implement the minimal public contracts**

  Define:

  ```typescript
  export type GithubRepositoryStatus =
    | 'RESOLVED'
    | 'NONE'
    | 'AMBIGUOUS'
    | 'UNVERIFIED';

  export type GithubRepositoryFreshness = 'CURRENT' | 'STALE' | 'UNKNOWN';

  export function resolveGithubRepository(
    input: GithubRepositoryResolutionInput
  ): GithubRepositoryResolution;
  ```

  Keep the function pure: no filesystem, network, environment, cache or clock reads.

- [ ] **Step 3: Write RED tests for candidate derivation**

  Cover exact context without a GitRegistry mapping, invalid exact context, registry unavailable, zero fallback candidates (`NONE`), one unique mapping, duplicate/case-variant mappings, multiple mappings (`AMBIGUOUS`), deterministic ordering and candidate bounds.

  Run the same focused test command and confirm the new assertions fail for the intended missing behavior.

- [ ] **Step 4: Implement bounded candidate derivation**

  Parse only `owner/name`. For fallback, consume only V1 mapping `githubOwner` and `githubRepo`; normalize, deduplicate, sort and bound. Do not import or call `resolveMcpGitServerContextFromRegistry()`.

- [ ] **Step 5: Write RED tests for live evidence mapping**

  Cover verified proof, mismatched canonical name, `NOT_FOUND_OR_INVISIBLE`, `AUTH_INVALID`, `PERMISSION_DENIED`, `UNAVAILABLE`, `MALFORMED`, unknown freshness and missing proof. Assert 404-like evidence is `UNVERIFIED`, never `NONE`.

- [ ] **Step 6: Implement fail-closed reason codes and projections**

  Return only bounded repository identity metadata, candidates, provenance, freshness and stable reason codes. Explicitly exclude permissions and raw response fields.

- [ ] **Step 7: Verify focused GREEN**

  Run: `node --import tsx --test tests/githubRepositoryResolution.test.ts`

  Expected: PASS.

- [ ] **Step 8: Commit the pure domain slice**

  Commit message: `feat(b2): add fail-closed repository resolution`

---

## Task 4: Extend the Existing Durable-Account Observer

**Files:**
- Modify: `src/tools/durableAccounts.ts`
- Modify: `tests/githubConnectionObservation.test.ts`

- [ ] **Step 1: Write RED tests for the observation batch**

  Add tests that one collection:
  - deduplicates configured token files;
  - preserves existing identity observation results;
  - correlates each token group to a non-secret collection-local authentication-context id;
  - observes exactly `GET /repos/{owner}/{repo}` through the selected authentication context;
  - rejects an unknown authentication-context id without falling back to another credential;
  - sanitizes 200/401/403/404/timeout/malformed responses;
  - never returns token contents, token paths, response permissions or raw error bodies.

  Run: `node --import tsx --test tests/githubConnectionObservation.test.ts`

  Expected RED: observation-batch API does not exist.

- [ ] **Step 2: Add the batch abstraction inside the existing module**

  Implement:

  ```typescript
  export type DurableGithubObservationBatch = {
    identityObservations: DurableGithubIdentityObservation[];
    observeRepository(
      authenticationContextId: string,
      repository: { owner: string; name: string }
    ): Promise<DurableGithubRepositoryObservation>;
  };

  export async function collectDurableGithubObservationBatch(
    options?: DurableGithubObservationOptions
  ): Promise<DurableGithubObservationBatch>;
  ```

  Reuse the current account parsing, token dedupe and GitHub request implementation. Retain tokens only in an ephemeral closure. Keep historical identity-only collectors as compatible wrappers.

- [ ] **Step 3: Verify focused GREEN and historical B1 tests**

  Run:

  ```bash
  node --import tsx --test \
    tests/githubConnectionObservation.test.ts \
    tests/githubIdentityResolution.test.ts
  ```

  Expected: PASS.

- [ ] **Step 4: Commit the observer refactor**

  Commit message: `refactor(b2): share durable GitHub observations`

---

## Task 5: Integrate B2 into the Existing Governed Context Collector

**Files:**
- Modify: `src/governedContext/types.ts`
- Modify: `src/governedContext/github.ts`
- Modify: `tests/governedContextGithub.test.ts`

- [ ] **Step 1: Write RED collector tests**

  Cover:
  - exact ConnectionContext path;
  - exact context works without a GitRegistry mapping;
  - fallback reads explicit V1 `repoMappings` only;
  - no use of the active/default `mcp_bridge` project fallback;
  - selected B1 authentication context is reused for the exact repository observation;
  - cross-credential fallback is forbidden;
  - B1 outcome propagates fail-closed;
  - repository result contains no permission/grant fields.

  Run: `node --import tsx --test tests/governedContextGithub.test.ts`

  Expected RED: `repositoryResolution` is absent.

- [ ] **Step 2: Extend the existing context type additively**

  Add `repositoryResolution?: GithubRepositoryResolution` to the appropriate existing GitHub operational projection. Keep the property optional so old serialized fixtures and callers remain readable.

- [ ] **Step 3: Integrate one collection batch and the pure resolver**

  In the existing GitHub collector:
  1. collect one observation batch;
  2. resolve B1 from `identityObservations`;
  3. derive the B2 candidate from exact context or explicit V1 mappings;
  4. if eligible, observe exactly one repository with the selected authentication context;
  5. resolve and project B2.

  Do not add another long-lived observer or cache.

- [ ] **Step 4: Extend cache identity and stale semantics**

  Include selected account identity, requested repository context, candidate/registry digest and relevant configuration in the existing cache key. On cache miss return `UNVERIFIED`; on stale evidence set `STALE` and remove `selectedRepository`.

- [ ] **Step 5: Verify focused GREEN**

  Run: `node --import tsx --test tests/governedContextGithub.test.ts`

  Expected: PASS.

- [ ] **Step 6: Commit collector integration**

  Commit message: `feat(b2): project repository identity in governed context`

---

## Task 6: Service, Cache and Dashboard Projection

**Files:**
- Modify: `src/governedContext/service.ts`
- Modify: `src/governedContext/dashboard.ts`
- Modify: `tests/governedContextService.test.ts`
- Modify: `tests/governedDashboard.test.ts`
- Modify if required by existing wiring: `tests/governedContextObserverIntegration.test.ts`

- [ ] **Step 1: Write RED service/cache tests**

  Cover same-key reuse, different repository/account/registry inputs not sharing cached results, cache-only `getCurrent` miss, stale degradation and selected repository removal.

  Run: `node --import tsx --test tests/governedContextService.test.ts`

- [ ] **Step 2: Implement minimal existing-service changes**

  Thread the optional B2 projection and cache identity through current constructors/options. Do not add a new service or cache.

- [ ] **Step 3: Write RED dashboard tests**

  Assert escaped status, repository full name, freshness and reason codes are rendered; raw secrets, permissions, arbitrary API fields and HTML are not.

  Run: `node --import tsx --test tests/governedDashboard.test.ts`

- [ ] **Step 4: Implement the bounded dashboard projection**

  Render identity evidence only. Do not label the result as authorized, writable or deployable.

- [ ] **Step 5: Verify focused GREEN**

  Run:

  ```bash
  node --import tsx --test \
    tests/governedContextService.test.ts \
    tests/governedDashboard.test.ts \
    tests/governedContextObserverIntegration.test.ts
  ```

  Expected: PASS.

- [ ] **Step 6: Commit service and dashboard integration**

  Commit message: `feat(b2): expose governed repository evidence`

---

## Task 7: Canonical Documentation and Cartography

**Files:**
- Modify: `ARCHITECTURE.md`
- Modify: `MCP_CONNECTION_IDENTITY_MODEL.md`
- Modify: `MCP_DURABLE_ACCOUNT_MANAGEMENT.md`
- Modify: `MCP_FUNCTIONAL_CARTOGRAPHY.md`
- Modify if generated/required: `MCP_FUNCTIONAL_CARTOGRAPHY.json`
- Modify: `MCP_PERMISSIONS_MODEL.md`
- Modify: `ROADMAP.md`
- Modify: `TODO.md`
- Modify: `TASKS.md`
- Modify: `SUIVI.md`
- Modify: `CHANGELOG.md`
- Modify: `DECISIONS_LOG.md`

- [ ] **Step 1: Reconcile stable architecture and identity chronology**

  Document B1 GitHub identity → B2 repository identity → C1/C2 project binding. Clarify that a known ConnectionContext repository may filter B2 without making B2 universally depend on B2-created repository context. Preserve the prohibition on `.mcp/identity-registry.json`.

- [ ] **Step 2: Reconcile durable-account and permissions boundaries**

  Explain the ephemeral observation batch and same-authentication-context proof. Explicitly state that GitHub API permission metadata is discarded and SLOT-11 remains the sole Effective Capabilities decision point.

- [ ] **Step 3: Update cartography and canonical work documents**

  Add the new pure function and extensions to the existing components. Mark B2 as current governed work without precreating B3/C1 tasks. Keep the global roadmap chronology intact.

- [ ] **Step 4: Run documentation checks**

  Run:

  ```bash
  npm run docs:check
  npm run cartography:check
  ```

  Expected: PASS.

- [ ] **Step 5: Commit documentation**

  Commit message: `docs(b2): reconcile repository resolution slot`

---

## Task 8: Non-Regression and Security Verification

**Files:** all B2 files and historical regression suites

- [ ] **Step 1: Run focused B2 and upstream suites**

  ```bash
  node --import tsx --test \
    tests/githubRepositoryResolution.test.ts \
    tests/githubConnectionObservation.test.ts \
    tests/githubIdentityResolution.test.ts \
    tests/connectionContext.test.ts \
    tests/governedContextGithub.test.ts \
    tests/governedContextService.test.ts \
    tests/governedDashboard.test.ts \
    tests/governedContextObserverIntegration.test.ts \
    tests/gitRegistryV2.test.ts \
    tests/toolContractRegression.test.ts \
    tests/currentToolCatalog.test.ts
  ```

  Expected: PASS.

- [ ] **Step 2: Prove no permission/tool expansion**

  Check the protected tool contract remains 92 and the runtime catalogue baseline remains unchanged at the attested value unless an independently explained repository change occurred. Search B2 projections for forbidden grant fields.

- [ ] **Step 3: Run full repository verification**

  ```bash
  npm run typecheck
  npm run lint:secrets
  npm run docs:check
  npm run test:readonly-safety
  npm test
  ```

  If `npm test` is not defined in the current authority, run the repository's documented complete Node test command and record that exact substitution. Expected: every commanded suite PASS.

- [ ] **Step 4: Inspect the complete diff**

  Confirm no new registry/store/cache/tool, no schema-breaking required field, no S1 write path, no GitRegistry V2 activation, no permission inference and no secret material.

- [ ] **Step 5: Commit any test-only corrections**

  Commit message: `test(b2): prove repository resolution non-regression`

---

## Task 9: PR, Review, Exact-Head Merge and Runtime Attestation

**Files:** governed metadata and PR evidence

- [ ] **Step 1: Push the exact governed branch and open a draft PR**

  Include task/session ids, spec/plan links, exact RED/GREEN evidence, compatibility guarantees, risks and rollback. Never claim approval from self-review.

- [ ] **Step 2: Reconcile exact-head CI and review**

  Request review, read every check/review/thread, resolve findings through additional tested commits, and update stale PR metadata. Require the exact current head SHA to be green and all required threads resolved.

- [ ] **Step 3: Final verification immediately before merge**

  Re-run or verify fresh typecheck, security, docs, focused tests and full CI on the exact head. Re-read branch protections/ruleset. Ensure Live State still permits a governed merge/deploy sequence.

- [ ] **Step 4: Merge with exact-head guard**

  Merge only the reviewed SHA, using repository-supported strategy. Record merge SHA. Do not merge if head moved.

- [ ] **Step 5: Allow only the governed GitHub→S1 deployment path**

  No direct S1 code mutation. Observe deployment workflow, then re-read S1 HEAD/origin, dirty status, runtime revision, OCI image and health.

- [ ] **Step 6: Reconcile Live State**

  Require GitHub main = S1 HEAD = S1 origin/main = runtime revision at the merge SHA, S1 clean, runtime healthy, Live State `FULLY_ALIGNED`, no documentation drift and no contradictions.

- [ ] **Step 7: Close governed work**

  Transition B2 to `DONE`, append final checkpoint with exact evidence, release locks, close the governed session, reconcile the queue and identify the next executable work without precreating it.

---

## Definition of Done

B2 is done only when:

- the approved design and implementation plan are versioned;
- all four statuses are deterministic and fail-closed;
- exact current context and V1 fallback paths behave as specified;
- live repository proof uses the B1-selected authentication context;
- 404/visibility uncertainty never becomes `NONE`;
- historical B1, ConnectionContext V1, GitRegistry and serialized context fixtures still read;
- no new authority, observer, registry, cache, tool or permission decision exists;
- security, docs, focused, regression and CI checks pass on the exact PR head;
- all review threads are resolved and the exact reviewed head is merged;
- governed deployment yields exact-SHA `FULLY_ALIGNED` runtime state;
- the task is `DONE`, locks released, session closed and queue reconciled.
