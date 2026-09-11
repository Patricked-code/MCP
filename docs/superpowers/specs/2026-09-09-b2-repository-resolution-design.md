# B2 Repository Resolution Design

Status: APPROVED DESIGN — IMPLEMENTATION AUTHORIZED
Date: 2026-09-09
Repository: Patricked-code/MCP
Integration Slot: SLOT-07 — Repository Resolution
Base attestation: efb09ce7eeba85122b01c7fa48d99e967b7cdb7c
Approved design checkpoint: 0c6299c9-9f62-477f-907b-f97eb2ffbe4c
Governed design session: 98e9aee8-20c0-404f-807f-6630ffbb1a1c

## 1. Outcome

B2 resolves the current GitHub repository from already-governed context and live evidence. It returns a bounded, fail-closed, provenance-bearing projection in the existing Governed Context. It neither grants permissions nor resolves project, server, runtime or domain bindings.

For the current historical context, B2 must resolve `Patricked-code/MCP` only when all of the following remain true:

- A2.1 exposes the exact `ConnectionContext.repository` value `Patricked-code/MCP`;
- B1 is `RESOLVED` and `CURRENT` for the current OAuth principal and binding;
- B1 selects the configured account context `Patricked-code` of type `user`;
- the exact repository is observed through the same ephemeral authentication context as the selected B1 connection;
- GitHub returns a fresh, structurally valid repository proof whose canonical owner/name equals the requested context.

The result is evidence, not authorization. GitHub response permissions, GitRegistry access flags and deployment flags are deliberately discarded.

## 2. Scope

### Included

- deterministic resolution from an exact `ConnectionContext` repository when present;
- fallback candidate derivation from the active GitRegistry V1 `repoMappings` only when the exact context is absent;
- future compatibility with the GitRegistry V2 `github:{owner}/{repo}` identifier contract without activating V2;
- exact repository observation through the credential correlation already established by the existing durable-account observation path;
- `RESOLVED`, `NONE`, `AMBIGUOUS` and `UNVERIFIED` outcomes;
- stable reason codes, freshness, provenance, bounded candidates and uncertainty;
- integration into the existing GitHub/Governed Context collector and cache;
- cache-miss and stale-evidence degradation;
- an escaped dashboard projection;
- additive compatibility with historical sessions, ConnectionContext V1, GitRegistry V1/V2 dry-run and tool contracts;
- documentation of SLOT-07 and its boundaries.

### Excluded

- any GitHub permission, grant, role, scope, `allowedAccess`, `deployEnabled`, `mayWrite`, `mayMerge` or `mayDeploy` decision;
- Human Identity or Agent Role;
- project, server, runtime, container or domain resolution;
- mutation, verification or activation of GitRegistry V2;
- use of GitRegistry's legacy default-project fallback;
- repository provisioning or auto-discovery writes;
- a new registry, binding file, store, cache, Session Manager, Operational Memory, task queue, observer or MCP tool;
- generalization of historical session/task/lock/deploy schemas from the literal repository contract; that belongs to B3 or a later approved compatibility lot;
- any change to OAuth, OIDC, Governed Autodeploy, WRITE gate `shadow`, `ENABLE_WRITE_TOOLS`, `allow_write`, 2FA or the GitHub→S1 deployment path;
- direct code writes on S1.

## 3. Authority matrix

| Datum | Authority | B2 use |
|---|---|---|
| OAuth principal | authenticated request and A2.1 ConnectionContext | upstream correlation only |
| GitHub principal/account context | B1 GithubIdentityResolution | upstream selected identity evidence |
| current exact repository hint | A2.1 ConnectionContext V1 | highest-priority candidate when present |
| configured GitHub connections | data/github-accounts.json / existing durable accounts | credential-bearing connection selection |
| credential | existing `/app/secrets/*` storage | used ephemerally, never projected |
| repository existence and canonical metadata | live GitHub API `GET /repos/{owner}/{repo}` | primary live proof |
| already-linked repository candidates | active GitRegistry V1 `repoMappings` | read-only fallback candidates |
| future repository identifier and mappings | GitRegistry V2 contract | identifier compatibility only; no activation/write |
| composed repository resolution | existing GitHub/Governed Context | derived projection only |
| transient reuse | existing GitHub Governed Context cache | only cache |
| chronology/audit | existing Operational Event Journal | sanitized evidence only |
| permissions/effective capabilities | SLOT-11 governance evaluation | explicitly outside B2 |

`.mcp/identity-policy.json` remains B1 selection policy and is not extended for B2. GitRegistry remains repository/project/server/domain mapping authority and never becomes an OAuth-principal binding store.

## 4. Current observed authority state

At specification time:

- GitHub `main`, S1 HEAD, S1 `origin/main` and runtime revision are `efb09ce7eeba85122b01c7fa48d99e967b7cdb7c`;
- Live State is `stateVersion=101`, `CURRENT`, `FULLY_ALIGNED` and contradiction-free;
- S1 is clean and its push remote remains `disabled://mcp-s1-read-only`;
- runtime is running and healthy on image `sha256:2b7001d5aacc3d59a35acc37348c5b0852e53bcd6c9cf1cd321abd194516e139`;
- the Work Queue is revision 98 with eight `DONE` tasks, no current task and no first executable task;
- no B2 branch or PR exists;
- GitHub repository `Patricked-code/MCP` has numeric id `1285534440`, owner `Patricked-code` user id `270385782`, default branch `main`, public visibility and non-archived status;
- the repository API's technical permission fields are observed but excluded from B2.

These values are evidence for task readiness, not static policy. They must be re-read at every mutation/deployment gate.

## 5. Inputs

The pure resolver consumes bounded typed data only:

```typescript
type GithubRepositoryResolutionInput = {
  identity: GithubIdentityResolution;
  requestedRepositoryContext: string | null;
  registry: {
    available: boolean;
    schemaVersion: 1;
    mappings: Array<Pick<RepoMappingEntry, 'githubOwner' | 'githubRepo'>>;
    digest: string | null;
  };
  repositoryObservation: DurableGithubRepositoryObservation | null;
  observedAt: string;
};
```

Input rules:

1. `requestedRepositoryContext` comes only from the visible session's compatible OAuth `ConnectionContext`.
2. B1 must be resolved before B2 can bind a live credential context.
3. Only `githubOwner` and `githubRepo` are read from V1 mappings. `projectKey`, `serverId`, `serverPath`, `allowedAccess` and `deployEnabled` are ignored.
4. The raw GitHub response never enters the public projection.
5. Arrays and strings are bounded before resolution.

## 6. Existing observer extension

The existing durable account path is extended, not duplicated.

`src/tools/durableAccounts.ts` will expose an internal observation-batch abstraction:

```typescript
type DurableGithubObservationBatch = {
  identityObservations: DurableGithubIdentityObservation[];
  observeRepository(
    authenticationContextId: string,
    repository: { owner: string; name: string }
  ): Promise<DurableGithubRepositoryObservation>;
};
```

The batch:

- reads and validates the same configured accounts as today;
- deduplicates each token file within the collection;
- observes `GET /user` and account membership exactly as B1 already requires;
- retains raw tokens only inside an ephemeral closure for the lifetime of that collection;
- maps each token group to its non-secret collection-local `authenticationContextId`;
- permits repository observation only for a known authentication context from that same batch;
- performs an exact bounded `GET /repos/{owner}/{repo}`;
- returns only a sanitized repository observation;
- is never stored, cached, serialized, logged or returned by an MCP tool.

The historical functions `collectDurableGithubIdentityObservations()` and `loadDurableGithubIdentityObservations()` remain compatible wrappers returning only `identityObservations`.

This is a refactor of the existing observer. It is not a second observer, credential registry or cache.

## 7. Repository observation contract

```typescript
type DurableGithubRepositoryObservation = {
  status:
    | 'VERIFIED'
    | 'NOT_FOUND_OR_INVISIBLE'
    | 'AUTH_INVALID'
    | 'PERMISSION_DENIED'
    | 'UNAVAILABLE'
    | 'MALFORMED';
  observedAt: string;
  freshness: 'CURRENT' | 'UNKNOWN';
  requestedFullName: string;
  repository: {
    githubRepositoryId: number;
    owner: string;
    ownerType: 'user' | 'organization';
    name: string;
    fullName: string;
    defaultBranch: string | null;
    visibility: 'public' | 'private' | 'internal' | null;
    archived: boolean;
    fork: boolean;
  } | null;
  reasonCode: GithubRepositoryReasonCode | null;
};
```

Parsing is strict and bounded. A missing/non-positive numeric id, invalid owner/name/full-name relationship, impossible owner type or malformed body produces `MALFORMED`. Missing optional metadata yields `null`; B2 does not invent `main` as a default branch.

Raw fields such as `permissions`, `security_and_analysis`, URLs, clone credentials, webhooks, scopes and arbitrary response keys are not copied.

## 8. Candidate derivation

### Exact context

If `requestedRepositoryContext` is present:

- parse exactly two GitHub-safe path segments `owner/name`;
- reject URLs, additional segments, whitespace-only values, control characters and invalid GitHub identifier characters;
- preserve the input only as a requested hint;
- use it as the sole candidate;
- do not require an existing GitRegistry mapping, because mapping belongs to C1/C2.

### Registry fallback

If no exact context is present and B1 is `RESOLVED/CURRENT`:

- read only active GitRegistry V1 `repoMappings` as configured candidate evidence;
- filter by case-insensitive owner equality with `identity.selectedAccountContext.owner`;
- normalize and deduplicate by case-insensitive `owner/name`;
- sort deterministically by normalized full name;
- expose at most 20 sanitized candidate summaries and a bounded total count;
- zero candidates produces `NONE`;
- more than one candidate produces `AMBIGUOUS` before network selection;
- exactly one candidate proceeds to live proof.

`registry.activeContext` and `resolveMcpGitServerContextFromRegistry()` are forbidden inputs because they can fall back to `mcp_bridge` and mix B2 with project/server resolution.

When GitRegistry V2 is later activated by C1, a separately reviewed adapter may supply equivalent repository candidates. B2 does not activate it now.

## 9. Resolution algorithm

1. Validate the B1 identity projection.
2. If B1 is `AMBIGUOUS`, return B2 `AMBIGUOUS` with `GITHUB_REPOSITORY_IDENTITY_AMBIGUOUS`.
3. If B1 is not `RESOLVED/CURRENT`, return `UNVERIFIED` with `GITHUB_REPOSITORY_IDENTITY_UNVERIFIED`.
4. Require one selected account context and one internal matching identity observation with an authentication-context correlation.
5. Parse an exact ConnectionContext repository when present.
6. If exact context is absent, derive candidates from V1 mappings as specified above.
7. If the candidate owner differs from the B1 selected account owner, return `UNVERIFIED` with `GITHUB_REPOSITORY_ACCOUNT_CONTEXT_MISMATCH`.
8. Observe the exact repository through the selected batch authentication context.
9. Require fresh `VERIFIED` evidence.
10. Compare requested and observed canonical owner/name case-insensitively, while preserving GitHub's observed spelling.
11. Return `RESOLVED` only for one matching live proof.
12. Never infer permissions or downstream mappings.

No candidate list ordering, last-used repository, global default, public visibility or technical GitHub permission may act as an implicit selection rule.

## 10. Output contract

```typescript
type GithubRepositoryStatus = 'RESOLVED' | 'NONE' | 'AMBIGUOUS' | 'UNVERIFIED';

type GithubRepositoryResolution = {
  status: GithubRepositoryStatus;
  observedAt: string;
  requestedRepositoryContext: string | null;
  selectionSource: 'connection_context' | 'git_registry' | null;
  selectedAccountContext: {
    owner: string;
    type: 'user' | 'organization';
  } | null;
  selectedRepository: {
    repositoryId: string;
    githubRepositoryId: number;
    owner: string;
    ownerType: 'user' | 'organization';
    name: string;
    fullName: string;
    defaultBranch: string | null;
    visibility: 'public' | 'private' | 'internal' | null;
    archived: boolean;
    fork: boolean;
  } | null;
  candidates: Array<{
    repositoryId: string;
    fullName: string;
    source: 'git_registry';
  }>;
  candidateCount: number;
  freshness: 'CURRENT' | 'STALE' | 'UNKNOWN';
  provenance: string[];
  reasonCodes: GithubRepositoryReasonCode[];
  uncertainties: GithubRepositoryUncertainty[];
  registryDigest: string | null;
};
```

`repositoryId` is `github:${canonicalOwner}/${canonicalName}`, compatible with the V2 identifier contract. It is not a mapping id.

The output contains no permissions, grants, roles, scopes, secret references, project, server, path, runtime, domain or deployment fields.

## 11. Status and reason codes

| Status | Condition |
|---|---|
| `RESOLVED` | one deterministic candidate, B1 current, same account context, fresh matching live proof |
| `NONE` | B1 current, no exact context and zero compatible registry candidates |
| `AMBIGUOUS` | B1 ambiguous or multiple distinct compatible registry candidates |
| `UNVERIFIED` | malformed, stale, unavailable, contradictory, unauthorized or insufficient proof |

Stable reason codes:

- `GITHUB_REPOSITORY_IDENTITY_AMBIGUOUS`
- `GITHUB_REPOSITORY_IDENTITY_UNVERIFIED`
- `GITHUB_REPOSITORY_AUTHENTICATION_CONTEXT_UNAVAILABLE`
- `GITHUB_REPOSITORY_CONTEXT_INVALID`
- `GITHUB_REPOSITORY_CANDIDATE_NOT_FOUND`
- `GITHUB_REPOSITORY_CANDIDATE_AMBIGUOUS`
- `GITHUB_REPOSITORY_REGISTRY_UNAVAILABLE`
- `GITHUB_REPOSITORY_ACCOUNT_CONTEXT_MISMATCH`
- `GITHUB_REPOSITORY_AUTH_MISSING`
- `GITHUB_REPOSITORY_AUTH_INVALID`
- `GITHUB_REPOSITORY_PERMISSION_DENIED`
- `GITHUB_REPOSITORY_NOT_FOUND_OR_INVISIBLE`
- `GITHUB_REPOSITORY_API_UNAVAILABLE`
- `GITHUB_REPOSITORY_RESPONSE_INVALID`
- `GITHUB_REPOSITORY_EVIDENCE_STALE`
- `GITHUB_REPOSITORY_CACHE_MISS`

Uncertainty `GITHUB_REPOSITORY_VISIBILITY_UNCERTAIN` accompanies a 404-like observation. A 404 is `UNVERIFIED`, never `NONE`, because absence and invisibility cannot be distinguished.

## 12. Cache integration

The existing GitHub Governed Context cache remains the only cache.

The input scope key remains bounded by:

- work branch;
- OAuth principal;
- requested repository context.

The completed cache key is extended with:

- B1 policy digest;
- B1 binding id;
- normalized selected account owner/type;
- B2 registry digest;
- normalized repository candidate/source.

`getCurrent()` remains cache/store-only and performs no file, secret or GitHub access.

On a scope miss it returns a B2 `UNVERIFIED/UNKNOWN` projection with `GITHUB_REPOSITORY_CACHE_MISS`.

On expiry it returns `UNVERIFIED/STALE`, clears `selectedRepository`, keeps only bounded contextual/candidate hints, adds `memory_cache` provenance and emits `GITHUB_REPOSITORY_EVIDENCE_STALE`.

Evidence from another OAuth principal, requested repository, B1 binding, account context or registry candidate digest must never be reused.

## 13. Governed Context and service behavior

`GithubOperationalContext.repositoryResolution?` is optional at the type boundary only so historical fixtures and in-process consumers continue to compile and parse. After B2 deployment, the real collector/service always projects a result when an identity scope is supplied.

The existing service fallback adds `UNVERIFIED/UNKNOWN` repository resolution without throwing. B2 failure degrades the composed freshness for repository-dependent downstream consumers but does not manufacture an authorization verdict.

Existing work-state `GithubReasonCode` values remain separate from B2 reason codes. Permissions remain calculated only by SLOT-11's existing/future governance composition.

The dashboard displays only status, freshness, source, canonical repository id/full name and reason codes, all HTML-escaped.

## 14. Persistence and historical compatibility

- no new persistent file, registry, store, database, cache or volume;
- no modification or backfill of `ConnectionContext` V1;
- no rewrite of governed sessions, receipts, checkpoints, locks, tasks or journal history;
- no GitRegistry V1 write or V2 activation;
- no persistence of repository resolution into Operational Memory;
- optional additive Governed Context field for historical compatibility;
- historical `loadDurableGithubIdentityObservations()` behavior preserved;
- existing 111 MCP tools and 92 protected historical contracts remain exact;
- B3 may later generalize literal repository types under a separate approved task.

## 15. Circularity prevention

The current B1 binding is repository-scoped because A2.1 already proves `Patricked-code/MCP`. B2 confirms that exact context live.

Repository is not a universal B1 prerequisite. A future human-approved account-context binding may omit repository context, allowing B1 to resolve an account first. B2 may then use one unique compatible registry candidate. Zero and multiple candidates remain `NONE` and `AMBIGUOUS` respectively.

The current binding is not widened, globalized or made exclusive to enable this future path.

## 16. Security and least privilege

- B2 observes one exact repository after deterministic candidate selection;
- no repository listing first-match selection;
- no cross-credential or cross-account evidence reuse;
- no token, Authorization header, token-file path or authentication-context id in output/audit/checkpoint;
- no GitHub response `permissions` field copied;
- V1 `allowedAccess` and `deployEnabled` ignored;
- public visibility does not grant authorization;
- B2 does not request an additional GitHub permission;
- ambiguity, missing proof, stale evidence and contradictions fail closed;
- WRITE gate remains `shadow`;
- no direct S1 mutation.

## 17. Observability and audit

The existing governed reconciliation event is enriched with sanitized B2 fields:

- status;
- observedAt/freshness;
- selection source;
- repository id/full name when verified;
- selected account owner/type;
- candidate count;
- reason codes and uncertainties;
- registry digest and provenance.

Cache-only reads do not create network activity or a new audit stream. No secret, permission, raw API body, credential correlation or arbitrary error string is journaled.

## 18. Dependencies and chronology

Upstream:

- A2.1 ConnectionContext, delivered;
- B1 GitHub Identity, delivered and `DONE`;
- configured durable GitHub accounts and existing secret storage;
- existing GitHub connection request helper;
- active GitRegistry V1 read path;
- existing Governed Context collector/cache/service.

Downstream:

- B3 may generalize historical repository literals additively;
- C1/C2 consume `repositoryId` and reconcile GitRegistry V2/project mapping;
- C3/C4/C5 resolve server/runtime/domain;
- D1/D2/D3 inherit governance, calculate capabilities and enrich bootstrap;
- SLOT-11 remains the only permission/effective-capability stage.

Program order remains `A2.1 → B1 → B2 → C1/C2 → C3/C4/C5 → D1/D2/D3`.

## 19. RED-before-GREEN obligations

The implementation must first publish/watch failures for:

1. exact current context resolving to GitHub repository id `1285534440`;
2. case-insensitive input and canonical observed spelling;
3. exact context resolving without a GitRegistry mapping;
4. unique registry candidate resolving only after live proof;
5. multiple candidates producing `AMBIGUOUS` without a network-selected winner;
6. zero candidates producing `NONE`;
7. B1 ambiguity, absence, unverified and stale outcomes propagating fail-closed;
8. missing internal authentication-context correlation failing closed;
9. selected account/candidate owner mismatch failing closed;
10. 404 producing `UNVERIFIED` plus visibility uncertainty;
11. 401, 403, timeout, unavailable and malformed responses producing exact reason codes;
12. duplicate/case-varied mappings deduplicating deterministically;
13. raw permissions and secret-shaped fields absent from output;
14. private/archived/fork metadata preserved without a grant;
15. legacy default-project resolver never participating;
16. cache isolation across principal/repository/binding/account/registry candidate;
17. cache miss and expiry degrading to `UNVERIFIED` and removing selected proof;
18. B1 resolver and durable-account behavior remaining unchanged;
19. ConnectionContext/session/receipt/task historical fixtures remaining readable and stable;
20. GitRegistry V1/V2 dry-run behavior remaining unchanged and write-free;
21. no tool catalogue or protected contract change;
22. dashboard escaping and absence of permission/secret fields.

## 20. Documentation impact

The governed implementation branch must add this specification and its TDD plan, then reconcile:

- `ARCHITECTURE.md`;
- `MCP_CONNECTION_IDENTITY_MODEL.md`;
- `MCP_DURABLE_ACCOUNT_MANAGEMENT.md`;
- `MCP_FUNCTIONAL_CARTOGRAPHY.md` and generated projection if required;
- `MCP_PERMISSIONS_MODEL.md`;
- `ROADMAP.md`, `TODO.md`, `TASKS.md`, `SUIVI.md` according to their canonical roles;
- `CHANGELOG.md` and `DECISIONS_LOG.md`;
- generated Markdown governance inventory.

No `.mcp/repository-binding.yaml`, identity registry or repository registry is introduced.

## 21. Rollback

Before merge, close or correct the governed PR; no production state changes.

After merge, rollback is a governed revert PR followed by the normal GitHub→S1 deployment and fresh Live State attestation. The existing cache expires naturally or is cleared by runtime restart. No schema/data migration or historical backfill requires reversal.

Forward delivery stops if any test detects binding widening, arbitrary selection, permission inference, credential leakage, historical incompatibility, GitRegistry write/activation, tool-contract change, exact-SHA deployment failure or runtime degradation.

## 22. Entry conditions

- human approval of checkpoint `0c6299c9-9f62-477f-907b-f97eb2ffbe4c`;
- fresh GitHub/S1/runtime alignment;
- no prior active/executable task;
- this specification and TDD plan self-reviewed;
- B2 task registered only after the above;
- task claimed and repository/task locks acquired;
- governed branch created from exact observed `main`;
- valid current Bootstrap Receipt.

## 23. Definition of Done

B2 is `DONE` only when:

- current `Patricked-code/MCP` resolves `RESOLVED/CURRENT` with repository id `github:Patricked-code/MCP` and GitHub id `1285534440`;
- all four statuses and stable reason codes are deterministic;
- no arbitrary/default selection exists;
- no permission or downstream mapping is emitted/inferred;
- no new authority, registry, store, cache, observer or tool exists;
- historical sessions/ConnectionContext and GitRegistry V1/V2 remain compatible;
- strict RED/GREEN evidence is recorded;
- full tests, typecheck, build, docs, current-state evidence, secret scan and diff checks pass freshly;
- PR is reviewed at its exact head, required checks pass and all actionable threads are resolved;
- protected exact-head merge succeeds;
- GitHub→S1 deploy attests the merge SHA, healthy runtime and clean/read-only S1;
- Live State is `CURRENT/FULLY_ALIGNED` with no contradiction;
- final checkpoint is created, task reaches `DONE`, locks are released, session is closed and queue is reconciled;
- C1/C2 is not pre-created unless it independently becomes governed and executable.
