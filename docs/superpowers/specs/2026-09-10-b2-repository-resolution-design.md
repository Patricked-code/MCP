# B2 Repository Resolution & Multi-Account GitHub Routing Design

Status: APPROVED / RECONCILED
Date: 2026-09-10
Repository: Patricked-code/MCP
Integration Slot: SLOT-07 — Repository Resolution
Governed branch: mcp/b2-repository-resolution-20260909
Base at reconciliation: efb09ce7eeba85122b01c7fa48d99e967b7cdb7c
Prior approved design checkpoint: 0c6299c9-9f62-477f-907b-f97eb2ffbe4c
Additive requirement: automatic deterministic routing across Patricked-code, chainsolutions-wealthtech and Wealthtechinnovations without changing repositories by name similarity.

## 1. Outcome

B2 resolves the exact GitHub repository requested by the governed operation and selects the one durable GitHub connection route that is technically capable of observing that same repository for the required technical access level. It is fail-closed, repository-ID aware, multi-account aware and secret-free in all public projections.

B2 does not grant authorization. A technically eligible route is only evidence for downstream Effective Capabilities, the WRITE gate, locks, branch governance and project governance. Any downstream layer may still refuse the action.

The design fixes the class of failure where a conversation or client has several installed GitHub accounts but an arbitrary default principal is used. Repository routing is based on the exact requested repository and explicitly allowed durable routes, not on whichever GitHub account happens to be active globally.

## 2. Reconciliation with work already in progress

The work is not restarted.

- B1 GitHub Identity Resolution is functionally delivered and documented through PR #73 and PR #74.
- `main` is currently `efb09ce7eeba85122b01c7fa48d99e967b7cdb7c` at this reconciliation point.
- Existing branch `mcp/b2-repository-resolution-20260909` already exists and points to the same base SHA.
- No second B2 branch is created.
- No second registry, session manager, cache, credential store or route database is introduced.
- The prior approved B2/SLOT-07 checkpoint is retained as the design origin; this document adds the explicit multi-account routing requirement approved on 2026-09-10.

Runtime task/session/lock state remains authoritative in Operational Memory and the Governed Task Queue. This document does not invent a runtime task identifier.

## 3. Scope

### In scope

- exact repository parsing and normalization from `owner/name`;
- stable repository identity using both canonical `github:owner/name` and the numeric GitHub repository id observed live;
- additive Identity Policy V3 for repository-routing rules while preserving V1 and V2;
- `ROUTING_ONLY` policy bindings, separate from B1 `IDENTITY_ONLY` bindings;
- three initial owner-scoped route bindings for Patricked-code, chainsolutions-wealthtech and Wealthtechinnovations;
- live per-credential repository observation against `/repos/{owner}/{repo}`;
- deterministic selection of the durable connection for `read`, `write` or `admin` technical access;
- reuse of `data/github-accounts.json`, existing secret storage, existing GitHub connection helpers and GitRegistry V2 derivation;
- B2 public projection with status, reason codes, route identity, repository identity, technical-access evidence, freshness and provenance;
- optional Governed Context projection and read-only resolver tool input so an agent can resolve a target repository before acting;
- strict TDD and regression coverage.

### Explicitly excluded

- global wildcard account routing;
- automatic fallback to a different repository with the same name;
- copying or exposing a token, token path, Authorization header or raw credential reference in public output;
- changing the B1 `Patricked-code/MCP` binding into a global binding;
- granting `mayWrite`, `mayMerge`, `mayDeploy` or any Effective Capability;
- changing WRITE gate mode from `shadow`;
- bypassing branch/PR governance;
- creating or mutating GitRegistry mappings merely because a repository was resolved;
- project/server/runtime/domain resolution, owned by C1-C5;
- direct S1 writes;
- direct push to `main`.

## 4. Authority matrix

| Datum | Authority | B2 use |
|---|---|---|
| OAuth principal | authenticated request / ConnectionContext | identifies which routing bindings may apply |
| B1 GitHub identity | existing B1 resolver / Governed Context | upstream identity evidence; not rewritten by B2 |
| routing policy | `.mcp/identity-policy.json` | explicit `ROUTING_ONLY` allow-list by repository owner and durable connection selector |
| configured durable GitHub accounts | `data/github-accounts.json` | connection and internal credential reference authority |
| credential secret | existing `/app/secrets/*` storage | used internally only for live probes |
| live repository identity | GitHub `GET /repos/{owner}/{repo}` | numeric repository id, canonical full name, visibility and technical permission evidence |
| repository/project/server mapping | GitRegistry V2 derived from the existing registry | optional recognition/mapping evidence; never rewritten by B2 |
| effective authorization | existing governance / SLOT-11 Effective Capabilities | downstream; B2 grants nothing |
| chronological evidence | existing governed observability / audit | secret-free resolution evidence |

## 5. Identity Policy V3

V3 is strictly additive:

`Identity Policy V3 = complete V2 semantics + githubRepositoryRoutingBindings`.

V1 and V2 remain valid and readable. B1 must continue to use `githubPrincipalBindings` unchanged for V2 and V3.

A routing binding has this bounded shape:

```json
{
  "routingBindingId": "oauth-wealthtech-mcp-admin__route__patricked-code",
  "oauthPrincipalId": "oauth:wealthtech-mcp-admin",
  "provider": "github",
  "repositoryOwner": "Patricked-code",
  "connectionSelector": {
    "owner": "Patricked-code",
    "type": "user"
  },
  "effect": "ROUTING_ONLY",
  "enabled": true
}
```

Initial bindings are owner-scoped, not repository-name wildcards:

- `Patricked-code/*` → durable context `Patricked-code`;
- `chainsolutions-wealthtech/*` → durable context `chainsolutions-wealthtech`;
- `Wealthtechinnovations/*` → durable context `Wealthtechinnovations`.

The Wealthtechinnovations selector may use `organization_or_user` while its durable configuration remains intentionally noncommittal; live GitHub evidence determines whether the actual authenticated principal/account context is valid.

Rules:

1. No implicit first-match priority.
2. Zero matching routing bindings returns `NONE`.
3. More than one matching enabled routing binding for the same principal and repository owner returns `AMBIGUOUS`.
4. Repository owner matching is case-insensitive while observed spelling is preserved.
5. No wildcard `*` owner is accepted by the schema.
6. V3 does not alter any B1 `IDENTITY_ONLY` effect.
7. Invalid V3 fails closed and never falls back to heuristic account selection.

## 6. Repository identity

The requested repository must be an exact bounded `owner/name` value. B2 does not route by bare repository name.

For every successful live observation B2 records two non-secret identifiers:

- logical registry identity: `github:<observed-full-name>`;
- GitHub immutable numeric repository id from the API response.

This prevents confusion between, for example:

- `Patricked-code/Stablecoin`;
- `Wealthtechinnovations/STABLECOIN`;
- `chainsolutions-wealthtech/Stablecoin`.

Same or similar names never imply the same repository. Fallback is permitted only among credentials that prove access to the same exact requested repository and the same observed numeric repository id.

## 7. Technical access levels

B2 accepts one required technical level:

- `read`: a successful live repository observation is sufficient;
- `write`: live repository permissions must show `push`, `maintain` or `admin`;
- `admin`: live repository permissions must show `admin`.

These are technical route-selection predicates only.

`technical write observed = true` does not imply `governance write authorized = true`.

## 8. Route candidate collection

The existing durable-account file and secret storage are reused.

For each enabled routing binding matching the OAuth principal and repository owner:

1. locate matching configured durable account(s);
2. reject missing or duplicate configured matches;
3. read the credential only through the existing secret-path boundary;
4. authenticate/verify the account context using the existing GitHub observation semantics;
5. query the exact requested repository with that credential;
6. capture only bounded non-secret evidence needed by the pure resolver;
7. discard raw token material before projection.

The live route observation contains an internal opaque credential-context correlation only for mixing-prevention. That value is never persisted or returned publicly.

## 9. Resolution algorithm

1. Validate Identity Policy V1/V2/V3.
2. Require a valid current OAuth principal.
3. Parse the exact requested `owner/name` repository.
4. Select enabled V3 `ROUTING_ONLY` bindings matching OAuth principal and exact repository owner.
5. Zero bindings → `NONE / GITHUB_REPOSITORY_ROUTING_BINDING_NOT_FOUND`.
6. Multiple bindings → `AMBIGUOUS / GITHUB_REPOSITORY_ROUTING_BINDING_AMBIGUOUS`.
7. Resolve the binding to exactly one durable configured connection.
8. Missing connection → `UNVERIFIED / GITHUB_REPOSITORY_ROUTE_CONNECTION_NOT_FOUND`.
9. Duplicate connection → `AMBIGUOUS / GITHUB_REPOSITORY_ROUTE_CONNECTION_AMBIGUOUS`.
10. Require live verified account context for that credential.
11. Probe `/repos/{owner}/{repo}` with the selected credential.
12. Require the response `full_name` to match the requested repository case-insensitively and a positive integer GitHub repository id.
13. If GitRegistry V2 already recognizes the same repository, preserve that relationship as evidence. If not, return `UNREGISTERED` without mutating the registry.
14. Evaluate the requested technical access level from live repository permission evidence.
15. If technical access is insufficient, return `UNVERIFIED`; do not try a different repository.
16. If exactly one valid route remains, return `RESOLVED`.
17. Public output strips token material, secret paths, raw credential refs and ephemeral credential-context ids.
18. Downstream authorization still runs independently.

## 10. Public result contract

```typescript
type GithubRepositoryResolutionStatus = 'RESOLVED' | 'NONE' | 'AMBIGUOUS' | 'UNVERIFIED';
type GithubTechnicalAccess = 'read' | 'write' | 'admin';

type GithubRepositoryResolution = {
  status: GithubRepositoryResolutionStatus;
  observedAt: string;
  oauthPrincipalId: string | null;
  requestedRepository: string | null;
  requiredTechnicalAccess: GithubTechnicalAccess;
  repository: {
    fullName: string;
    owner: string;
    name: string;
    githubRepositoryId: number;
    registryRepositoryId: string;
    registryPresence: 'REGISTERED' | 'UNREGISTERED';
    defaultBranch: string | null;
    archived: boolean;
  } | null;
  route: {
    routingBindingId: string;
    connectionId: string;
    accountContext: {
      owner: string;
      type: 'user' | 'organization' | 'organization_or_user';
    };
  } | null;
  observedTechnicalAccess: {
    read: boolean;
    write: boolean;
    admin: boolean;
  } | null;
  authorizationEffect: 'NONE';
  freshness: 'CURRENT' | 'STALE' | 'UNKNOWN';
  provenance: string[];
  reasonCodes: GithubRepositoryReasonCode[];
  policyDigest: string | null;
};
```

Forbidden public fields include `token`, `tokenFile`, `credentialRef`, `Authorization`, raw headers and ephemeral authentication-context identifiers.

## 11. Stable reason codes

- `GITHUB_REPOSITORY_POLICY_INVALID`
- `GITHUB_REPOSITORY_OAUTH_PRINCIPAL_UNAVAILABLE`
- `GITHUB_REPOSITORY_TARGET_REQUIRED`
- `GITHUB_REPOSITORY_TARGET_INVALID`
- `GITHUB_REPOSITORY_ROUTING_BINDING_NOT_FOUND`
- `GITHUB_REPOSITORY_ROUTING_BINDING_AMBIGUOUS`
- `GITHUB_REPOSITORY_ROUTE_CONNECTION_NOT_FOUND`
- `GITHUB_REPOSITORY_ROUTE_CONNECTION_AMBIGUOUS`
- `GITHUB_REPOSITORY_ACCOUNT_CONTEXT_UNVERIFIED`
- `GITHUB_REPOSITORY_NOT_VISIBLE`
- `GITHUB_REPOSITORY_API_UNAVAILABLE`
- `GITHUB_REPOSITORY_IDENTITY_MISMATCH`
- `GITHUB_REPOSITORY_TECHNICAL_ACCESS_INSUFFICIENT`
- `GITHUB_REPOSITORY_ARCHIVED_FOR_WRITE`
- `GITHUB_REPOSITORY_EVIDENCE_STALE`

## 12. Governed Context integration

The existing `github` object remains the control-plane work-state observation for `Patricked-code/MCP`; it is not repurposed for arbitrary target repositories.

B2 adds a separate optional repository-resolution projection to `GovernedOperationalContext`. Historical consumers that do not send a target repository continue to receive the old structure plus an optional/neutral B2 field.

The read-only MCP context tools may accept optional bounded inputs:

- `target_repository`;
- `required_github_access` (`read`, `write`, `admin`).

No existing call is required to provide them.

## 13. Non-regression invariants

- B1 V1/V2 behavior remains byte-compatible at the contract level.
- Existing B1 `Patricked-code/MCP` resolution remains `RESOLVED` with no permission fields.
- Existing GitHub work-state cache remains isolated by its existing identity scope.
- GitRegistry V1 source remains unchanged; V2 remains an in-memory/dry-run derived authority until its own governed activation path.
- `data/github-accounts.json` remains the durable account configuration authority.
- No secret is added to Git.
- No existing tool name is removed or renamed.
- No existing schema-required field becomes mandatory for historical sessions.
- Existing `main` protections, PR flow and S1 read-only deployment identity remain unchanged.

## 14. TDD obligations

RED-before-GREEN coverage must prove at least:

1. Identity Policy V1 still parses exactly.
2. Identity Policy V2 still parses exactly.
3. V3 requires complete V2 semantics plus routing bindings.
4. B1 identity resolution works unchanged with a V3 policy.
5. Unknown versions and malformed routing bindings fail closed.
6. Exact `Patricked-code/Stablecoin` resolves only through its permitted route.
7. `Wealthtechinnovations/STABLECOIN` is a distinct repository from `Patricked-code/Stablecoin`.
8. Bare `Stablecoin` is rejected.
9. Missing routing binding returns NONE.
10. Duplicate routing bindings return AMBIGUOUS.
11. Missing/duplicate durable connections fail closed.
12. Repository 404/403/unavailable evidence fails closed.
13. Numeric repository id and observed full name must be valid and consistent.
14. `read` can resolve on a visible repository.
15. `write` requires live push/maintain/admin evidence.
16. `admin` requires live admin evidence.
17. Archived repositories cannot resolve for write/admin.
18. An unregistered but live exact repository can resolve as `UNREGISTERED` without registry mutation.
19. Output contains no secret paths, credential refs or authorization grants.
20. Existing full suite, typecheck, build, docs, secrets and whitespace checks remain green after GREEN.

## 15. Delivery and rollback

Delivery sequence:

`design → plan → RED commit → observed failing CI for the new contract → GREEN implementation → full CI → review → Draft PR → exact-head review → protected merge → GitHub→S1 deploy → runtime/Live State reconciliation`.

No direct S1 code write is allowed.

Before merge, rollback is branch/commit reversal. After merge, rollback is a governed revert PR followed by the normal GitHub→S1 deployment path. No data migration is required for B2 because the historical GitRegistry source is not rewritten.
