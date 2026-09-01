# Governed Connection Context Minimal — Implementation Plan

> **For Codex:** Execute this plan task by task using strict RED → GREEN TDD. Do not broaden the lot. Preserve every historical governed-session contract.

**Goal:** Add a durable, optional and sanitized `ConnectionContext` to the existing Governed Session so an OAuth-authenticated MCP connection keeps a stable logical connection identity without creating a parallel authority.

**Architecture:** The existing Operational Memory Governed Session remains the sole durable authority. A pure factory derives a versioned context from the already-sanitized `RequestIdentity` and the existing governed-session ID. Session creation stores it once; attach, resume and transport rebinding preserve it byte-for-byte. Legacy records without the field remain valid.

**Tech Stack:** TypeScript ESM, Zod, Node test runner through `tsx --test`, existing Operational Memory JSON store, GitHub Actions, governed GitHub → S1 deployment.

**Governed scope:** `TASK-20260901-001`, Draft PR #67, branch `mcp/project-context-resolution-20260901`, baseline `main@184107d5705248427d322922077d18f51e133c15`.

---

## Permanent invariants

1. Do not create a second Session Manager, Operational Memory store, identity registry, Live State engine, audit journal or deployment path.
2. Do not change `auth.ts`, OAuth routing, `server.ts`, GitRegistry V1/V2, Governed Context resolution, Bootstrap Receipt or WRITE gate semantics in this lot.
3. Do not persist bearer tokens, authorization headers, raw transport IDs, resume secrets, cookies, secrets or arbitrary client metadata.
4. Existing records without `connectionContext` must parse and behave exactly as before.
5. Existing `ATTACHED`, `RESUMED`, `NONE` and `AMBIGUOUS` outcomes must remain possible and unchanged.
6. A created context ID is stable across attach, resume, heartbeat, checkpoint and transport rebinding.
7. Shared-credential sessions receive `connectionContext: null`; OAuth-subject sessions receive a populated context.
8. Every production change must be preceded by a focused failing test whose failure is caused by the missing behavior.
9. No direct S1 write. Delivery remains GitHub PR → protected merge → governed deploy → exact-SHA reconciliation.

## Required final data contract

```ts
export const ConnectionContextSchema = z.object({
  schemaVersion: z.literal(1),
  connectionContextId: z.string().uuid(),
  governedSessionId: z.string().uuid(),
  repository: z.literal('Patricked-code/MCP'),
  principalId: z.string().trim().min(1).max(256).startsWith('oauth:'),
  observedClientId: z.string().trim().min(1).max(256).nullable(),
  identityAssurance: z.literal('oauth_subject'),
  clientClassification: z.literal('UNRESOLVED'),
  evidenceSource: z.literal('oauth_auth_info'),
  createdAt: z.string().datetime({ offset: true }),
});

export type ConnectionContext = z.infer<typeof ConnectionContextSchema>;
```

The Governed Session record adds:

```ts
connectionContext: ConnectionContextSchema.nullable().optional()
```

`optional()` is mandatory for historical compatibility. New sessions write the field explicitly: object for OAuth subject, `null` for shared credential.

---

### Task 1: Add the pure Connection Context contract and factory

**Files:**
- Create: `tests/connectionContext.test.ts`
- Create: `src/operationalMemory/connectionContext.ts`
- Modify: `src/operationalMemory/types.ts`

**Step 1: Write the focused failing contract tests**

Add tests that assert:

- an OAuth-subject `RequestIdentity` creates a schema-valid context;
- the supplied `governedSessionId` is copied exactly;
- `principalId` and `observedClientId` come only from the sanitized request identity;
- classification is initially `UNRESOLVED`;
- evidence is `oauth_auth_info`;
- a generated context ID is a UUID;
- a shared-credential identity returns `null`;
- malformed principal/client values are rejected by the schema;
- arbitrary extra fields and secret-shaped inputs are not copied into output.

Use deterministic dependency injection for UUID/time if the existing test conventions allow it; otherwise assert formats without freezing implementation details.

**Step 2: Run the focused RED test**

Run:

```bash
npx tsx --test tests/connectionContext.test.ts
```

Expected: FAIL because the module/schema/factory does not exist.

Record the failing command and error in the PR/checkpoint evidence before production code is added.

**Step 3: Implement the minimal contract**

Create `src/operationalMemory/connectionContext.ts` with:

- `ConnectionContextSchema`;
- inferred `ConnectionContext` type;
- a narrow factory such as `createConnectionContext({ governedSessionId, repository, requestIdentity, now?, randomUUID? })`;
- an explicit `null` return for identities whose assurance is not `oauth_subject`;
- construction from an allowlist only.

In `types.ts`, import the schema and add the optional nullable field to the existing Governed Session schema. Avoid circular imports: the context module may import only the request-identity type/schema source that does not depend on the session record.

**Step 4: Run the focused GREEN test**

Run:

```bash
npx tsx --test tests/connectionContext.test.ts
```

Expected: PASS.

**Step 5: Run immediate contract regression tests**

Run:

```bash
npx tsx --test tests/mcpAuthContext.test.ts tests/operationalMemoryStore.test.ts
npm run typecheck
```

Expected: PASS with no changed OAuth or historical-store behavior.

**Step 6: Commit atomically**

Commit message:

```text
feat(governance): define minimal connection context
```

---

### Task 2: Persist the context only when opening an existing Governed Session

**Files:**
- Modify: `tests/governedSessionService.test.ts`
- Modify: `src/operationalMemory/sessionService.ts`
- Modify only if required by the existing request contract: `src/operationalMemory/types.ts`

**Step 1: Write focused failing creation tests**

Add tests proving:

- a newly opened OAuth-subject session has a populated `connectionContext`;
- `connectionContext.governedSessionId === governedSession.governedSessionId`;
- repository, principal, client and assurance match the existing sanitized inputs;
- a newly opened shared-credential session stores `connectionContext: null`;
- a historical session fixture that omits the field still loads successfully;
- creating the context does not change task scope, work branch, transport binding, receipt state or session revision semantics.

**Step 2: Run the focused RED test**

Run:

```bash
npx tsx --test tests/governedSessionService.test.ts
```

Expected: FAIL only on the new Connection Context assertions.

**Step 3: Implement the minimal creation hook**

In the existing `openSession` flow:

1. generate the governed-session ID using the existing mechanism;
2. pass that ID and the existing sanitized `request.identity` to the pure factory;
3. persist the returned object or `null` in the same Governed Session record;
4. leave all other fields and revision/event semantics unchanged.

Do not compute the context in auth middleware, server routing, the tool layer or a second store.

**Step 4: Run focused GREEN tests**

Run:

```bash
npx tsx --test tests/governedSessionService.test.ts tests/connectionContext.test.ts
```

Expected: PASS.

**Step 5: Run store and event regression tests**

Run:

```bash
npx tsx --test tests/operationalMemoryStore.test.ts tests/operationalEventJournal.test.ts tests/governedLocks.test.ts
npm run typecheck
```

Expected: PASS.

**Step 6: Commit atomically**

Commit message:

```text
feat(governance): bind connection context to governed session
```

---

### Task 3: Preserve context across attach, resume and transport rebinding

**Files:**
- Modify: `tests/governedSessionService.test.ts`
- Modify only if a failing test exposes an actual defect: `src/operationalMemory/sessionService.ts`
- Modify: `tests/governedConnectionBootstrap.test.ts`
- Modify: `tests/serverGovernedConnectionBootstrap.test.ts`

**Step 1: Add identity-stability tests**

For a session created with OAuth-subject assurance, capture the original `connectionContext` and prove it is identical after:

- idempotent open/attach on the same transport;
- automatic governed-session attach;
- explicit resume on a new legitimate transport;
- heartbeat;
- checkpoint creation;
- pause then resume.

Assert the `connectionContextId` and `createdAt` do not change.

**Step 2: Add historical compatibility tests**

Add mandatory tests proving a legacy session record with no `connectionContext`:

- parses successfully;
- can still attach/resume under the existing rules;
- is not silently assigned a new context during resume;
- produces the same historical outcome codes.

This prevents a read path from becoming a hidden migration path.

**Step 3: Add outcome-regression tests**

In governed bootstrap tests, assert that the new optional field does not alter:

- `ATTACHED`;
- `RESUMED`;
- `NONE`;
- `AMBIGUOUS`;
- repository and principal mismatch rejections;
- transport ambiguity protection.

**Step 4: Run the RED tests**

Run:

```bash
npx tsx --test tests/governedSessionService.test.ts tests/governedConnectionBootstrap.test.ts tests/serverGovernedConnectionBootstrap.test.ts
```

Expected: any failure must correspond to missing preservation/exposure behavior. If all new preservation tests already pass because the implementation is correctly additive, document that no production change is required for this task and do not manufacture one.

**Step 5: Apply only the minimal repair, if required**

If a test exposes context replacement or schema stripping, change only the exact session record copy/update expression responsible. Do not add backfill, migration or resolution logic.

**Step 6: Run GREEN and adjacent regressions**

Run:

```bash
npx tsx --test tests/governedSessionService.test.ts tests/governedConnectionBootstrap.test.ts tests/serverGovernedConnectionBootstrap.test.ts tests/governedSessionTools.test.ts tests/mcpAuthContext.test.ts
npm run typecheck
```

Expected: PASS.

**Step 7: Commit atomically**

Commit tests even if production code was unnecessary:

```text
test(governance): preserve connection context across session continuity
```

---

### Task 4: Verify exposed session surfaces without creating a new tool

**Files:**
- Modify: `tests/governedSessionTools.test.ts`
- Modify only if schema serialization strips the field: the existing governed-session tool serialization file already responsible for returning session records

**Step 1: Write focused exposure tests**

Prove the existing open/get/list/resume session surfaces return the optional context from the governed-session record and never return new secret-bearing fields.

Do not create a `get_connection_context` tool or endpoint.

**Step 2: Run RED**

Run:

```bash
npx tsx --test tests/governedSessionTools.test.ts
```

Expected: FAIL only if an existing response schema strips the new field. If it already passes through the session schema, document the absence of required production changes.

**Step 3: Implement only if required**

Adjust only the existing response schema/serialization. Reuse `GovernedSessionRecordSchema` or `ConnectionContextSchema`; do not duplicate the contract.

**Step 4: Run GREEN and redaction checks**

Run:

```bash
npx tsx --test tests/governedSessionTools.test.ts tests/oauthLogRedaction.test.ts tests/toolContractRegression.test.ts
npm run lint:secrets
```

Expected: PASS.

**Step 5: Commit atomically**

```text
test(governance): expose sanitized context through session surfaces
```

Use `fix(governance): ...` only if production serialization code was genuinely required.

---

### Task 5: Full verification and documentation reconciliation

**Files:**
- Modify: `SUIVI.md`
- Modify: `CHANGELOG.md`
- Modify: `DECISIONS_LOG.md`
- Modify only if inventory checks require it: generated function/tool cartography governed by existing scripts
- Do not modify: `ROADMAP.md`, `TODO.md`, `TASKS.md` unless their own governance checks prove a concrete stale statement

**Step 1: Run the complete verification set**

Run on the exact branch head:

```bash
npm run typecheck
npm run build
npm run docs:check
npm run lint:secrets
npm run test:governance
npm run test:readonly-safety
git diff --check
```

Expected: all PASS.

**Step 2: Inspect the complete base-to-head diff**

Verify:

- no deletion or renaming outside approved scope;
- no changes to OAuth/server/GitRegistry/receipt/WRITE gate/deploy/runtime files;
- no tokens, headers, secrets or raw transport IDs;
- all new persisted fields are optional for historical records;
- no duplicate authority was introduced;
- every test change asserts a real contract.

**Step 3: Update trace documents**

Record:

- exact task, branch, PR and head SHA;
- files changed;
- RED evidence and GREEN evidence;
- compatibility tests;
- explicit exclusions that remain future lots;
- current next action.

Documentation must not freeze dynamic main/runtime state as if it were permanent.

**Step 4: Re-run documentation and secret checks**

Run:

```bash
npm run docs:check
npm run lint:secrets
git diff --check
```

Expected: PASS.

**Step 5: Commit documentation**

```text
docs(governance): attest connection context implementation
```

---

### Task 6: Independent review, CI and exact-head delivery

**Step 1: Request independent code review**

Review against:

- the approved design;
- this implementation plan;
- `NO_REGRESSION_POLICY.md`;
- existing session/Operational Memory contracts;
- security/redaction requirements;
- actual base-to-head diff.

Address findings by returning to RED → GREEN. Never dismiss a finding without evidence.

**Step 2: Push and wait for exact-head CI**

Confirm PR #67 head SHA, then require all protected checks to pass on that exact SHA. A successful run on an older SHA is not evidence.

**Step 3: Convert Draft PR only after all gates pass**

The PR may become ready only when:

- implementation matches the approved design;
- all tests/checks pass on exact head;
- review findings are resolved;
- the diff remains within scope;
- governed checkpoint is updated.

**Step 4: Merge through the protected GitHub workflow**

Never push directly to `main`. Use the repository’s approved merge method and retain PR history.

**Step 5: Governed deployment and reconciliation**

After merge:

1. wait for the normal GitHub → S1 governed deployment;
2. verify GitHub main, S1 main and runtime revision equal the merge SHA;
3. verify S1 working tree is clean;
4. verify runtime healthy;
5. reconcile Live State;
6. require `FULLY_ALIGNED`;
7. verify no documentation drift;
8. transition `TASK-20260901-001` to DONE only with exact evidence;
9. release locks and close the governed session.

---

## Stop conditions

Stop and checkpoint instead of broadening the work if any of the following occurs:

- an existing contract must be broken to proceed;
- a migration/backfill becomes necessary;
- GitHub identity or repository resolution is needed;
- a second authority/store/tool appears necessary;
- authentication/server/receipt/WRITE gate/deployment code must change;
- historical sessions cannot remain valid;
- CI/review detects unrelated regression;
- GitHub, S1 or runtime loses alignment;
- governed authorization returns `mayMutate=false` for the actual requested mutation surface.

The next functional lot begins only after this lot is merged, deployed, reconciled and attested.
