# B1 GitHub Identity Resolution Design

Status: APPROVED
Date: 2026-09-07
Repository: Patricked-code/MCP
Integration Slot: SLOT-06 — GitHub Identity
Base attestation: aa57b07cd3ba514df7b1ceb8cc60ab1587e15620
Design checkpoint: 9c53948e-ed57-4112-a8b5-a2a95ae6e8df
Governed design session: 72017a9c-f31c-4cde-acac-64d8e001f168

## 1. Outcome

B1 resolves which authenticated GitHub principal is selected for the current governed OAuth principal and current proven context. It produces a fail-closed, evidence-bearing identity projection. It does not grant permissions, resolve a repository, create a human identity, assign an agent role, or create a new persistence authority.

The approved initial binding selects the GitHub user account context Patricked-code only when:

- OAuth principal is oauth:wealthtech-mcp-admin;
- provider is github;
- the already-proven repository context is Patricked-code/MCP;
- exactly one enabled policy binding applies;
- exactly one configured durable GitHub connection matches owner Patricked-code and type user;
- a fresh GitHub GET /user observation authenticates login Patricked-code.

This binding is contextual, reversible and non-exclusive. It does not prevent future bindings for chainsolutions-wealthtech or any other GitHub account, organization, repository or context.

## 2. Scope and exclusions

### In scope

- additive Identity Policy V2 parsing and validation;
- versioned contextual GitHub principal bindings;
- reuse of configured durable GitHub connections;
- shared, secret-free authenticated-principal observations derived from GitHub GET /user;
- a deterministic, stateless resolver;
- a derived GitHub Identity projection in Governed Context;
- fail-closed RESOLVED, NONE, AMBIGUOUS and UNVERIFIED outcomes;
- provenance, freshness and stable reason codes;
- audit-safe structured observations;
- compatibility with Identity Policy V1 and historical governed sessions;
- correction of the obsolete identity-registry documentation.

### Explicitly excluded

- permissions, grants, mayWrite, mayMerge, mayDeploy or Effective Capabilities;
- repository discovery or selection as a universal prerequisite;
- project, server, runtime or domain binding;
- Human Identity resolution;
- Agent Role assignment;
- credential creation, rotation, copying or exposure;
- a new registry, database, session manager, Operational Memory, Live State, cache or GitHub observer;
- any change from WRITE gate shadow to enforce;
- any direct write on S1;
- any automatic global fallback from a repository-scoped binding.

B2 owns Repository Resolution. C1/C2 own GitRegistry V2 and project binding. C3/C4/C5 own server/runtime/domain. SLOT-11 owns Effective Capabilities.

## 3. Authority matrix

| Datum | Authority | B1 use |
|---|---|---|
| OAuth principal | existing authenticated request / ConnectionContext | input only |
| contextual binding policy | .mcp/identity-policy.json | selection rule |
| configured GitHub connections | data/github-accounts.json and existing durable-account mechanisms | candidate connections |
| GitHub credential | existing secret storage under /app/secrets | used only by existing observer, never returned |
| authenticated GitHub user | live GitHub API GET /user | primary identity proof |
| accessible organization context | live GitHub organization API | contextual account evidence, never the authenticated principal |
| repository/project/server/runtime/domain mapping | GitRegistry / GitRegistry V2 | not mutated and not reused as OAuth binding authority |
| composed GitHub Identity | Governed Context / Identity Block | derived projection only |
| chronological evidence | existing Event Journal / governed observability | secret-free audit |
| permissions | existing governance and SLOT-11 capability evaluation | out of B1 scope |

No row introduces a second authority for an existing datum.

## 4. Identity Policy V2

Identity Policy V2 is strictly additive:

Identity Policy V2 = complete Identity Policy V1 semantics + githubPrincipalBindings.

All existing top-level fields remain required and retain their meaning:

- schemaVersion;
- updatedAt;
- goal;
- currentSignals;
- limits;
- s1GithubDeploymentIdentity;
- requiredSuiviFields.

V1 remains readable. V2 adds:

~~~json
{
  "githubPrincipalBindings": [
    {
      "bindingId": "oauth-wealthtech-mcp-admin__patricked-code__patricked-code-mcp",
      "oauthPrincipalId": "oauth:wealthtech-mcp-admin",
      "provider": "github",
      "connectionSelector": {
        "owner": "Patricked-code",
        "type": "user"
      },
      "expectedAuthenticatedLogin": "Patricked-code",
      "context": {
        "repository": "Patricked-code/MCP"
      },
      "effect": "IDENTITY_ONLY",
      "enabled": true
    }
  ]
}
~~~

Rules:

1. There is no implicit ordering, priority or first-match behavior.
2. Every applicable binding participates in ambiguity detection.
3. An absent repository context never widens a repository-scoped binding.
4. Unknown schema versions and structurally incomplete V2 policies are invalid.
5. Invalid policy produces UNVERIFIED; it never falls back heuristically.
6. No destructive backfill or historical session rewrite occurs.
7. Policy and resolver code are deployed together and can be rolled back together.

## 5. Inputs

The resolver consumes only bounded, typed inputs:

- OAuth principal identifier from the current authenticated ConnectionContext;
- optional proven repository context from ConnectionContext;
- parsed Identity Policy V1 or V2;
- configured durable GitHub connection descriptors without credentials;
- fresh or explicitly stale GitHub principal observations from the existing observation layer;
- observation time and configured freshness threshold.

Repository is a contextual filter when already proven. It is not a universal B1 prerequisite. This prevents a B1↔B2 circular dependency.

## 6. Reused components and extension points

| Component | Existing responsibility | B1 change |
|---|---|---|
| src/github/connection.ts | token lookup/validation, GET /user, optional organization check | expose/reuse a shared secret-free authenticated-principal observation |
| src/tools/durableAccounts.ts | iterate configured accounts and report status | call the shared principal observer instead of duplicating GET /user semantics |
| src/github/inventory.ts | repository inventory and legacy registry interactions | unchanged; not the B1 resolver |
| src/github/authorizationDiagnostics.ts | repository and pull-request authorization diagnostics | unchanged; remains capability evidence outside B1 |
| src/github/registry.ts and registryV2.ts | repository/project/server/runtime/domain mapping | unchanged as binding authorities |
| src/governedContext/github.ts | GitHub work-state observation and existing bounded cache | integrate identity observation and reuse one cache; no second cache |
| src/governedContext/service.ts | compose Governed Context | add derived GitHub Identity |
| src/governedContext/types.ts | context contracts | add backward-compatible optional identity projection |
| src/operationalMemory/connectionContext.ts and src/operationalMemory/types.ts | ConnectionContext V1 and historical session records | no schema change |
| existing dashboard | display governed projections | optional additive display only; no new identity store |
| Dockerfile | build the executable runtime image | copy the versioned identity policy into /app/.mcp beside the existing task registry |

A new src/github/identityResolution.ts is permitted only as a stateless pure resolver. It performs no I/O, network access, secret access, persistence or caching.

The existing GitHub cache must be isolated by the bounded identity and repository inputs. A branch-only key is insufficient once identity varies. The key must include the applicable principal, repository context and selected binding material in addition to branch/work-state context, while preserving the existing time-to-live and fallback behavior.

## 7. GitHub proof semantics

GET /user proves the authenticated GitHub user principal. For the current credential it proves login Patricked-code.

An organization such as chainsolutions-wealthtech that is accessible with the same credential is an accessible organization/account context. It is not the authenticated login and must never replace authenticatedPrincipal.login.

The secret reference may be used by the existing connection layer, but neither its path nor its raw value belongs in the B1 output, logs, checkpoints, tests or Governed Context.

## 8. Resolution algorithm

1. Validate the policy without altering V1 fields.
2. Read OAuth principal and optional repository context from ConnectionContext.
3. Select enabled github bindings matching oauthPrincipalId.
4. Apply each binding context as a constraint:
   - a repository-scoped binding matches only the same proven repository;
   - missing required context is not treated as a global match.
5. If no binding applies, return NONE, unless bindings require missing current context, in which case return UNVERIFIED with GITHUB_IDENTITY_CONTEXT_REQUIRED.
6. If more than one binding applies, return AMBIGUOUS.
7. Match the single binding's connectionSelector against configured durable connections.
8. If no connection matches, return UNVERIFIED.
9. If more than one connection matches, return AMBIGUOUS.
10. Require a fresh successful authenticated-principal observation for that connection.
11. Compare GET /user login to expectedAuthenticatedLogin using GitHub login case-insensitive equality while preserving the observed spelling.
12. A mismatch or unavailable/invalid/stale proof returns UNVERIFIED.
13. A single fully proved match returns RESOLVED.
14. Do not infer or emit permissions.

## 9. Output contract

The derived result contains only identity evidence:

~~~typescript
type GithubIdentityStatus = "RESOLVED" | "NONE" | "AMBIGUOUS" | "UNVERIFIED";

interface GithubIdentityResolution {
  status: GithubIdentityStatus;
  observedAt: string;
  bindingId: string | null;
  oauthPrincipalId: string | null;
  repositoryContext: string | null;
  authenticatedPrincipal: {
    provider: "github";
    login: string;
    accountType: "user";
    githubUserId?: number;
  } | null;
  selectedAccountContext: {
    owner: string;
    type: "user" | "organization";
    source: "durable_account";
  } | null;
  accessibleAccountContexts: Array<{
    owner: string;
    type: "user" | "organization";
    verified: boolean;
  }>;
  freshness: "CURRENT" | "STALE" | "UNKNOWN";
  provenance: string[];
  reasonCodes: GithubIdentityReasonCode[];
  policyDigest: string | null;
}
~~~

The contract must not contain permission fields, Effective Capabilities, Human Identity or Agent Role.

## 10. Status and reason codes

| Status | Meaning |
|---|---|
| RESOLVED | exactly one applicable binding, one configured connection and one fresh matching GET /user proof |
| NONE | no binding exists for the current principal/context and no required context is missing |
| AMBIGUOUS | multiple bindings or multiple configured connections remain after deterministic filtering |
| UNVERIFIED | a binding is expected but policy, context, configuration, credential, API proof, freshness or login verification is insufficient or contradictory |

Stable reason codes:

- GITHUB_IDENTITY_BINDING_NOT_FOUND
- GITHUB_IDENTITY_BINDING_AMBIGUOUS
- GITHUB_IDENTITY_CONNECTION_NOT_FOUND
- GITHUB_IDENTITY_CONNECTION_AMBIGUOUS
- GITHUB_IDENTITY_OAUTH_PRINCIPAL_UNAVAILABLE
- GITHUB_IDENTITY_CONTEXT_REQUIRED
- GITHUB_IDENTITY_AUTH_MISSING
- GITHUB_IDENTITY_AUTH_INVALID
- GITHUB_IDENTITY_PRINCIPAL_MISMATCH
- GITHUB_IDENTITY_EVIDENCE_STALE
- GITHUB_IDENTITY_API_UNAVAILABLE
- GITHUB_IDENTITY_POLICY_INVALID

NONE is not permission denial or approval. UNVERIFIED and AMBIGUOUS are fail-closed identity outcomes. Downstream consumers may require RESOLVED but B1 itself grants nothing.

## 11. Persistence and compatibility

- Identity Policy V2 persists only the approved selection rule.
- Dockerfile packages .mcp/identity-policy.json into the runtime image at /app/.mcp/identity-policy.json; no writable volume or parallel runtime registry is introduced.
- Existing durable-account storage remains the connection authority.
- Existing secret storage remains the credential authority.
- Resolution output is derived at observation time and is not written into historical governed sessions.
- ConnectionContext remains schemaVersion 1 and byte-compatible.
- Old sessions, receipts, checkpoints, task records and events remain readable.
- V1 policy produces a valid NONE/UNVERIFIED result according to inputs and never crashes.
- No migration guesses a GitHub identity for historical data.
- Optional additions to Governed Context preserve old consumers.

## 12. Observability and audit

Every observation is secret-free and bounded. The existing governed observability path records:

- status;
- reason codes;
- bindingId when applicable;
- OAuth principal identifier already authorized for governance;
- repository context when proven;
- authenticated GitHub login and non-secret user id when verified;
- selected configured account owner/type;
- freshness, timestamp and provenance;
- policy digest;
- contradiction summaries.

It never records a token, Authorization header, credential body, raw secret path, raw transport identifier or implicit permission.

## 13. Dependencies and chronology

Upstream:

- A2.1 ConnectionContext delivered;
- authenticated OAuth principal available;
- existing durable GitHub accounts;
- existing GitHub connection observer;
- approved context-specific binding decision.

B1 may use A2.1's exact repository as an optional contextual filter. It does not wait for B2 when the context is already proven.

Downstream:

- B2 Repository Resolution can consume authenticatedPrincipal and selectedAccountContext;
- C1/C2 can reconcile repository/project mapping through GitRegistry V2;
- C3/C4/C5 can resolve server/runtime/domain;
- SLOT-11 can compute Effective Capabilities using identity evidence plus governance and live authorization evidence.

## 14. Security invariants

- least privilege: binding effect is IDENTITY_ONLY;
- no new GitHub permission is requested or granted;
- no token is exposed, copied or persisted;
- no organization is misrepresented as the authenticated user;
- no repository-scoped binding becomes global;
- ambiguity and missing proof fail closed;
- invalid configuration never triggers heuristic fallback;
- WRITE gate remains shadow;
- S1 remains read-only for code;
- no new authority, cache or observer is created.

## 15. Test obligations

Strict RED-before-GREEN tests must cover:

1. Identity Policy V1 remains readable with exact legacy semantics.
2. V2 requires the complete V1 structure and accepts additive githubPrincipalBindings.
3. V2 missing a V1 field is rejected.
4. Current approved principal/repository/account resolves to Patricked-code.
5. The current binding does not apply to another repository or absent repository context.
6. Future distinct repository/account bindings coexist without breaking the current binding.
7. No binding returns NONE.
8. Multiple applicable bindings return AMBIGUOUS.
9. Missing and duplicate configured connections fail closed.
10. Missing OAuth principal and required context return UNVERIFIED.
11. Missing/invalid credential proof, API unavailability and stale evidence return UNVERIFIED.
12. Authenticated login mismatch returns UNVERIFIED.
13. Authenticated user and accessible organization remain distinct.
14. Output contains no permissions or secrets.
15. Existing GitHub cache does not reuse observations across different principal/repository/binding keys.
16. Existing durable account status and connection diagnostics retain their behavior through shared observation.
17. ConnectionContext V1 and historical session/receipt/task fixtures remain unchanged and readable.
18. Existing A1 identity outcomes, GitRegistry V2, WRITE gate, deployment and tool contracts do not regress.
19. The historical 111-tool catalogue and its 92 protected tool contracts remain unchanged.

## 16. Documentation reconciliation

The implementation lot must update:

- MCP_CONNECTION_IDENTITY_MODEL.md, removing the obsolete instruction to create .mcp/identity-registry.json;
- ARCHITECTURE.md for the stable SLOT-06 authority relationship;
- MCP_DURABLE_ACCOUNT_MANAGEMENT.md for connection versus authenticated-principal evidence;
- MCP_PERMISSIONS_MODEL.md to state explicitly that B1 grants no permission;
- MCP_FUNCTIONAL_CARTOGRAPHY.md and its governed JSON projection when required by the docs checker;
- .mcp/identity-policy.json to additive V2;
- Dockerfile so the governed policy used by the resolver is part of the same exact-SHA OCI artifact;
- SUIVI.md, DECISIONS_LOG.md and CHANGELOG.md at governed lifecycle checkpoints;
- ROADMAP.md, TODO.md and TASKS.md only according to their existing canonical roles.

No new roadmap or task system is created.

## 17. Rollback

Rollback is a governed revert of the exact merged B1 commit followed by normal deployment and attestation to the prior known-good SHA. Because the policy extension and resolver deploy together and no session migration occurs, rollback restores the prior resolver/policy behavior without data conversion.

A policy validation failure in a running candidate must yield UNVERIFIED. It must not silently downgrade to a broad or guessed binding.

## 18. Entry conditions

All are required before implementation:

- this design approved by the human;
- specification reviewed for A–G constraints;
- TDD plan complete with exact files and test order;
- GitHub/S1/runtime authorities reobserved;
- no earlier executable task;
- Governed Task created only after it is executable;
- task claimed and repository/task locks acquired;
- current bootstrap receipt valid;
- isolated work branch created from exact observed main.

## 19. Definition of Done

B1 is DONE only when:

- the approved binding resolves Patricked-code for Patricked-code/MCP and nowhere broader;
- Identity Policy V2 is strictly additive and V1 remains readable;
- all four statuses and reason codes behave deterministically;
- GitHub user and accessible organization are distinct;
- no permission or secret is emitted or inferred;
- no parallel registry, store, cache, observer or governance authority exists;
- historical sessions and ConnectionContext remain compatible;
- strict RED and GREEN evidence exists;
- typecheck, build, governance, read-only safety, docs, current-state evidence and secret lint all pass;
- PR findings and review threads are resolved;
- merge uses exact-head verification under protect-main;
- GitHub→S1 governed deployment completes;
- GitHub, S1 and runtime report the exact merged SHA;
- Live State is CURRENT and FULLY_ALIGNED with no contradictions;
- the Governed Task is DONE, locks are released, checkpoint is written and the queue is reconciled.
