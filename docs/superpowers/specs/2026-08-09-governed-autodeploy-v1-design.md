# MCP Governed Autodeploy V1 — Design

## Goal

Finish the governed alignment chain so that, after the one-time bootstrap of the deploy endpoint, a validated merge on `main` can drive GitHub → S1 → Docker automatically while preserving the repository, runtime, documentation and rollback invariants already established in `Patricked-code/MCP`.

The completion condition is evidence-based, never inferred:

```text
GitHub main SHA
= S1 HEAD
= deployment requested SHA
= Docker OCI revision
= deployment attestation SHA
```

and the runtime health/OAuth checks must be successful.

## Existing foundations to reuse

- `main` is protected and development uses branch → CI → PR → merge.
- S1 fetch identity is expected to be `git@github.com-mcp-patricked-ro:Patricked-code/MCP.git`.
- S1 push URL is expected to be `disabled://mcp-s1-read-only`.
- `mcp_sync_from_github_s1` already performs guarded fast-forward synchronization.
- scoped WRITE tools require `ENABLE_WRITE_TOOLS` and `allow_write=true`.
- bounded Docker runtime attestation already exists.
- Live State V1 now observes GitHub, S1, Docker and documentation and forbids `FULLY_ALIGNED` without current proof.

No second MCP, no direct GitHub→SSH channel and no new long-lived deployment credential are introduced.

## Scope

### A. Markdown governance

The current `docs:check` only verifies the presence of a small required-file list. V1 replaces this weak check with two independent controls:

1. tracked Markdown inventory: every Git-tracked `.md` path must belong to an explicit generated baseline and classification;
2. semantic canonical-state checks: active governance documents must agree on repository, branch, S1 root, required fetch remote, disabled push remote, container name and deployment state.

Historical documents remain history and are not rewritten merely to match current state. Runtime-only Markdown remains a separately attested S1 surface; if S1 cannot be queried, its current completeness is `requires_revalidation`, never silently assumed.

### B. GitHub OIDC trust boundary

GitHub Actions authenticates to the MCP with a short-lived GitHub OIDC token. The MCP verifies:

- issuer `https://token.actions.githubusercontent.com`;
- audience dedicated to the MCP deployment endpoint;
- repository `Patricked-code/MCP`;
- repository id `1285534440`;
- owner `Patricked-code` and owner id `270385782`;
- ref `refs/heads/main`;
- event `push` or explicit governed `workflow_dispatch`;
- exact deployment workflow reference;
- token expiry and `nbf` when present;
- requested SHA equals the token claim SHA.

Trust constants are code/policy constants and are not overrideable by environment variables. JWKS is fetched only over HTTPS from GitHub's token issuer with bounded timeout and `kid` selection. Only RS256 is accepted.

### C. S1 deployment job

The authenticated start endpoint creates a deterministic bounded job id from GitHub run id + requested SHA, then launches one detached S1 job. The job:

1. acquires an exclusive `flock`;
2. verifies S1 path, branch, clean working tree, read-only fetch remote and disabled push URL;
3. fetches `main` with hooks disabled;
4. requires `FETCH_HEAD` to equal the requested SHA exactly;
5. permits only fast-forward from current HEAD to requested SHA;
6. records the previous Git SHA and previous Docker image reference before mutation;
7. fast-forwards S1 to the exact requested SHA;
8. builds the candidate image with `org.opencontainers.image.revision=<requested SHA>`;
9. starts the candidate using Compose;
10. executes bounded health, OAuth metadata and unauthenticated MCP checks;
11. verifies Docker OCI revision equals the requested SHA;
12. writes a machine-readable attestation atomically.

No `reset --hard`, `clean`, force checkout, rebase, arbitrary shell input or S1→GitHub push is allowed.

### D. Rollback

Before replacing the running image, the currently running image id/reference is captured. If candidate startup or any mandatory check fails, the job restores the previous image/reference through the same Compose service, waits for health, records rollback result, and terminates failed.

Rollback never rewrites Git history. A failed deployment may leave S1 Git fast-forwarded while Docker is rolled back; Live State must then report runtime deployment pending / reconciliation required rather than fake alignment.

### E. HTTP API

Two OIDC-only routes are added:

- `POST /deploy/github/s1/start` — validates OIDC + bounded payload and starts the job;
- `GET /deploy/github/s1/status/:jobId` — validates a fresh OIDC token and returns only the bounded parsed attestation/status for the matching job.

The existing web-session and MCP bearer authentication do not authorize these deployment routes.

### F. GitHub Actions

A dedicated `.github/workflows/mcp-deploy.yml` requests `id-token: write` and `contents: read` only. It:

1. uses the exact `github.sha`;
2. requests the dedicated OIDC audience;
3. starts the deployment;
4. polls with newly obtained OIDC tokens so temporary MCP restarts are tolerated;
5. fails unless the returned attestation is successful and references the exact SHA.

The workflow supports `workflow_dispatch` for the bootstrap/verification run. Automatic `push` execution is gated until the deploy endpoint has been bootstrapped and attested on S1; after activation, every validated merge to `main` follows this path.

### G. Documentation and evidence

`SUIVI.md`, `TASKS.md`, `TODO.md`, `DECISIONS_LOG.md`, `CHANGELOG.md`, `ACTIVITY_LOG.md` and `PRODUCTION_STATE.json` are updated only with observed facts. The final six completion flags cannot be set until the live S1/Docker attestation succeeds.

## Failure model

- OIDC invalid → 401/403, no S1 command executed.
- SHA mismatch → reject before job creation.
- dirty S1 / wrong branch / wrong remotes / divergence → fail closed before mutation.
- lock busy → return deterministic busy state; no overlapping deploy.
- build/start/check failure → rollback candidate runtime, attest failure.
- MCP unavailable during restart → GitHub poll retries with fresh OIDC token.
- S1 connector unavailable during bootstrap → GitHub code may be merged, but deployment remains `DEPLOYMENT_PENDING` and automation is not claimed complete.

## Security invariants

- no direct commits to `main`;
- no long-lived GitHub Actions SSH secret;
- no S1→GitHub push path;
- no caller-controlled filesystem path;
- no caller-controlled shell fragment;
- no secret values in logs or attestations;
- exact SHA binding from GitHub OIDC claim through S1 and Docker;
- CI must remain green for typecheck, build, docs, secret scan, safety tests and diff check.

## Rollout

1. merge code behind the governed PR path;
2. if S1 connector is available, preflight current production and fast-forward S1 to the merge SHA through the existing guarded tool;
3. typecheck/build/restart the MCP once to bootstrap the new endpoint;
4. attest endpoint/runtime;
5. run `mcp-deploy.yml` manually for the current `main` SHA as an end-to-end no-drift deployment test;
6. activate automatic `push` deployment only after that proof;
7. perform a harmless subsequent governed merge and prove automatic GitHub → S1 → Docker alignment.

Until step 7 succeeds, the process is not described as fully automatic or fully attested.