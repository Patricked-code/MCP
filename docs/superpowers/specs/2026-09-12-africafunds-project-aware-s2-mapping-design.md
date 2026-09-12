# AfricaFunds Project-Aware S2 Mapping Design

**Governed task:** `TASK-20260910-001`

**Approved design checkpoint:** `6ad95c77-fb4b-4abd-bf3f-3a1db74eb142`

**Execution baseline:** GitHub `main`, S1 HEAD, S1 `origin/main` and runtime revision `fa563c6e21d6fa07bf5b33a58626ceae1cdedc13`; Live State `171`; Bootstrap Receipt `b20599e2-a89a-4bb4-b5c5-c0e859d239a3`.

## 1. Outcome and chronological position

This lot extends the existing GitRegistry authority so one logical application can own several repository/runtime components. It prepares and then records AfricaFunds as project `CS-AFRICAFUNDS-001` / `chainsolutions.africafunds`, composed of the existing API and frontend repositories and their existing S2 checkouts.

The lot follows B2 Repository Resolution. It does not activate the broader C2 project resolver, infer permissions, deploy AfricaFunds, or modify any AfricaFunds repository or S2 checkout.

## 2. Non-negotiable boundaries

- Reuse the single existing GitRegistry V1/V2 implementation. Do not create another registry, store, cache, observer, session manager, task queue, tool catalogue or deployment path.
- Keep GitRegistry V2 dry-run only. This task extends its candidate contract but does not activate V2 persistence.
- Preserve all historical V1 files and V2 candidates. New root fields are optional and absent fields remain absent when read, normalized, written or migrated.
- Keep all existing tools and their input contracts compatible.
- Never infer a WRITE, deploy or other effective capability from a project or repository mapping. Those decisions remain in SLOT-11.
- Do not sync the lagging S2 checkouts, touch the untracked API files, change either AfricaFunds repository, or model historical vhosts as Git repositories.
- Do not combine the separately prepared GitHub Actions to SSH to S1 transport with this task. Authentication of that transport is not mutation authorization.
- No direct S1 code write. Delivery is GitHub branch and PR, CI/review, governed deployment, then exact-SHA Live State attestation.

## 3. Integration Slots and authorities

| Concern | Slot / authority | Treatment in this task |
|---|---|---|
| GitHub identity | SLOT-06 / B1 projection | Upstream evidence only; unchanged |
| Repository identity | SLOT-07 / B2 projection | Upstream evidence only; unchanged |
| Project composition | SLOT-08 / existing GitRegistry | Add optional project records |
| Repo to server/path mapping | SLOT-08 / existing GitRegistry mappings | Add optional project correlation fields |
| Server/runtime/domain evidence | SLOT-08/09 / server map and live observations | Recorded as bounded mapping metadata; no activation |
| Effective permissions | SLOT-11 / existing governance | Explicitly excluded |
| Task, locks, audit and checkpoint | SLOT-14/15/18 / Operational Memory | Existing task/session/locks only |
| Runtime truth | SLOT-09 / Live State, S1 and OCI observations | Attestation only; no direct mutation |

## 4. Two-phase compatibility strategy

### Phase 1 — structural compatibility foundation

Phase 1 adds the optional project structure to the active V1 reader/writer and V2 candidate schema without adding AfricaFunds data.

It must:

1. accept historical V1 registries with no `projects` field;
2. preserve the absence of `projects` across V1 normalization and write, so historical serialized shape does not change gratuitously;
3. accept and preserve an optional bounded V1 `projects` array;
4. add optional `projectId`, `projectUid` and `componentRole` correlation fields to legacy mappings without changing their existing required fields;
5. accept and preserve optional V2 `projects` and mapping correlations;
6. carry projects and correlations through V1-to-V2 dry-run migration;
7. keep the existing candidate and report compatible when no projects exist;
8. validate project identifiers, component references and historical-vhost invariants when project records are present;
9. leave `data/mcp-git-registry.json` unchanged.

Phase 1 is delivered, reviewed, merged, deployed and attested before Phase 2 begins. This sequencing prevents an old runtime from normalizing away a new root field.

### Phase 2 — AfricaFunds mapping

Only after Phase 1 is exact-SHA deployed and `FULLY_ALIGNED`, Phase 2 adds one project record and two proposed read-only component mappings to the existing registry data and reconciles canonical documentation.

## 5. Project record contract

The optional `projects` field is an array of records with this bounded, generic shape:

```typescript
type RegistryProject = {
  projectId: string;
  projectUid: string;
  name: string;
  kind: string;
  productionServerId: string;
  canonicalBranch: string;
  repositoryComponents: Array<{
    repositoryId: string;
    mappingId: string;
    role: string;
  }>;
  globalCheckpointRepositoryId: string;
  centralGovernanceRepositoryId: string;
  stateModel: string;
  stateFields: string[];
  publicDomain: string | null;
  publicApi: string | null;
  historicalVhosts: Array<{
    historicalVhostId: string;
    classification: 'HISTORICAL_VHOST';
    serverId: string;
    serverPath: string;
    domain: string;
    repositoryId: null;
    current: false;
    deploymentSource: false;
  }>;
};
```

The schema is generic enough for later projects, but all strings and arrays are bounded. Project IDs, project UIDs, component repository IDs, component mapping IDs, component roles, state fields and historical-vhost IDs are unique within their applicable scopes. Each component references an existing repository and mapping in a V2 candidate. Historical vhosts cannot reference a repository and cannot become current or a deployment source.

Mapping extensions are optional:

```typescript
type ProjectCorrelation = {
  projectId?: string;
  projectUid?: string;
  componentRole?: string;
};
```

They correlate existing mappings to a project; they do not grant access or activate deployment.

## 6. Phase 2 AfricaFunds record

The approved record is:

- `projectUid`: `CS-AFRICAFUNDS-001`
- `projectId`: `chainsolutions.africafunds`
- kind: `MULTI_REPOSITORY_APPLICATION`
- production server: `S2`
- canonical branch: `claude/code-review-improvements-ikvuj`
- state model: `FUND_STATE`
- independent state fields: `API_SHA`, `FRONTEND_SHA`, `SUIVI_CHECKPOINT`, `PRODUCTION_ATTESTATION`
- global checkpoint and central governance repository: the approved repository reference recorded in Phase 2 after re-observation

Current components:

| Role | GitHub repository | Existing S2 path | Phase 2 posture |
|---|---|---|---|
| API | `Wealthtechinnovations/api_opcv` | `/var/www/vhosts/chainsolutions.fr/africafunds.chainsolutions.fr/api` | proposed, read-only, deploy disabled |
| FRONTEND | `Wealthtechinnovations/front_end_opcvm` | `/var/www/vhosts/chainsolutions.fr/africafunds.chainsolutions.fr/frontend` | proposed, read-only, deploy disabled |

The mappings use `allowedAccess: read`, `deployEnabled: false`; every sensitive V2 capability remains `false`. The observed repository and checkout SHAs are evidence, not values to force onto S2.

Historical vhosts:

| Server path | Classification | Repository | Current | Deployment source |
|---|---|---|---|---|
| `/var/www/vhosts/chainsolutions.fr/api.funds.chainsolutions.fr` | `HISTORICAL_VHOST` | `null` | `false` | `false` |
| `/var/www/vhosts/chainsolutions.fr/Funds.chainsolutions.fr` | `HISTORICAL_VHOST` | `null` | `false` | `false` |

Existing diagnostic tools for these paths remain available for backward compatibility. Their names do not make the paths current project components.

## 7. Inputs, outputs and persistence

Inputs are the existing V1 registry, V2 dry-run candidate, B2-proven repository identities, current server-map evidence and read-only S2/GitHub observations. No secret or raw credential enters the project record.

Phase 1 output is only a backward-compatible code/schema capability plus tests and documentation. Phase 2 output is the additive project/mapping data in the existing `data/mcp-git-registry.json`, plus the corresponding V2 dry-run projection and canonical documentation.

The existing V1 file remains the active persisted registry authority. V2 remains an in-memory validated candidate. No new persistence path is introduced.

## 8. Validation, observability and audit

Phase 1 tests cover:

- historical V1 read/write with no `projects` field;
- optional V1 project preservation through active normalization and write;
- V1-to-V2 preservation of projects and mapping correlations;
- historical V2 candidate acceptance with no projects;
- project uniqueness, component-reference integrity and historical-vhost fail-closed validation;
- unchanged existing GitRegistry V2 and tool-contract regression suites;
- full typecheck, build, documentation, secret and test gates.

Phase 2 tests cover the exact AfricaFunds project, two component mappings, read-only/no-deploy capability posture, two non-Git historical vhosts, independent state fields and dry-run idempotence.

Operational evidence is recorded through the existing PR, CI, review, deployment, Live State and governed checkpoint authorities. Logs and projections must contain identifiers and reason codes only, never credential material.

## 9. Failure and rollback

- Schema or compatibility failure before merge: revert the branch change; active data is untouched.
- Phase 1 runtime regression: revert the Phase 1 merge through a reviewed PR and redeploy the prior exact SHA. Phase 2 must not start.
- Phase 2 data validation failure: do not merge the data change.
- Phase 2 post-deploy regression: revert only the additive project/mapping data through GitHub; do not mutate S2 checkouts.
- Any drift, stale Live State, lock conflict, exact-head mismatch, failed required check or unresolved review thread stops the corresponding mutation gate.

## 10. Definition of Done

Phase 1 is done only when its tests are RED then GREEN, all historical tests pass, the exact reviewed head is merged through GitHub, S1/runtime deploy that exact merge SHA, Live State is current and `FULLY_ALIGNED`, and a governed checkpoint records the evidence.

Phase 2 may then begin under the same governed task and is done only when the approved AfricaFunds mapping is validated, reviewed, merged, deployed and attested exact-SHA without changing either AfricaFunds repository or S2 checkout. Final task completion additionally requires no contradictions, released locks, a final checkpoint, `TASK-20260910-001 = DONE`, closed session and reconciled Work Queue.
