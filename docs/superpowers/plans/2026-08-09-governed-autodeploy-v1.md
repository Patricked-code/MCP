# MCP Governed Autodeploy V1 — Implementation Plan

**Base:** `main@cd80665837c1bbf692728d9fbb2c614bb1cb7734`

**Branch:** `mcp/governed-autodeploy-v1-20260809`

**Rule:** never write directly to `main`; every implementation block uses RED → GREEN → full CI and preserves existing read-only/write separation.

## Task 1 — Strengthen Markdown governance

Files:
- create `scripts/check-doc-governance.mjs`
- create `tests/docGovernance.test.ts`
- create `docs/governance/README.md`
- create tracked Markdown baseline/classification file after inventory generation
- modify `package.json`
- modify `.github/workflows/mcp-ci.yml`

Steps:
1. add failing tests proving unclassified/new/missing Markdown and conflicting canonical-state values fail;
2. implement deterministic Git-tracked Markdown enumeration and classification rules;
3. keep runtime-only Markdown as a separate current-attestation surface;
4. add semantic canonical-state verification for active documents;
5. add the new checker to `docs:check` or a dedicated CI step;
6. prove RED/GREEN and full CI.

## Task 2 — GitHub OIDC verifier

Files:
- create `src/deploy/githubOidc.ts`
- create `tests/githubOidc.test.ts`

Steps:
1. write failing RSA/JWT tests for valid token, bad signature, expired token, wrong issuer/audience/repository/id/owner/ref/workflow/event/SHA and unsupported algorithm;
2. implement bounded JWT parsing, GitHub JWKS lookup and RS256 verification with fixed trust policy;
3. ensure environment variables cannot weaken trust constants;
4. add tests to the safety suite and prove full CI.

## Task 3 — S1 governed deployment job

Files:
- create `src/deploy/s1Deploy.ts`
- create `tests/s1Deploy.test.ts`
- modify Compose only as required to support candidate/rollback image selection without a parallel service

Steps:
1. write failing tests requiring `flock`, clean tree, exact remotes, disabled push, exact `FETCH_HEAD == requested SHA`, fast-forward only, candidate revision, health/OAuth checks, attestation and rollback;
2. add negative assertions forbidding destructive Git and caller-controlled shell/path fragments;
3. implement deterministic job id/status path and detached launch command;
4. implement bounded status parsing and strict schema;
5. prove targeted and full CI.

## Task 4 — OIDC-only HTTP deployment API

Files:
- create `src/deploy/routes.ts`
- create `tests/deployRoutes.test.ts`
- minimally modify `src/server.ts`

Steps:
1. write failing route/authorization tests;
2. register `POST /deploy/github/s1/start` and `GET /deploy/github/s1/status/:jobId`;
3. ensure existing MCP bearer/web session does not substitute for GitHub OIDC;
4. bind requested SHA to verified OIDC SHA and return `202` only after detached job launch;
5. prove temporary runtime restart does not weaken auth semantics;
6. full CI.

## Task 5 — GitHub Actions deployment workflow

Files:
- create `.github/workflows/mcp-deploy.yml`
- create `tests/deployWorkflow.test.ts`

Steps:
1. static tests require `contents: read`, `id-token: write`, exact SHA usage, bounded polling and no SSH/private key secret;
2. implement `workflow_dispatch` bootstrap path and gated `push` path;
3. request a fresh OIDC token for start/poll operations;
4. fail unless final attestation SHA equals `github.sha` and status is success;
5. full CI.

## Task 6 — Governance state and PR

Files:
- update `TASKS.md`, `SUIVI.md`, `TODO.md`, `DECISIONS_LOG.md`, `CHANGELOG.md`, `ACTIVITY_LOG.md`, `PRODUCTION_STATE.json`

Steps:
1. record PR #38 merge `cd80665837c1bbf692728d9fbb2c614bb1cb7734` as GitHub fact;
2. keep current S1/runtime as `requires_revalidation` unless freshly observed;
3. audit complete branch diff for secrets, destructive Git, unrestricted shell, duplicate deploy paths and invented runtime claims;
4. open one draft PR; fix failures on the same branch;
5. merge only a fresh green, unchanged head SHA.

## Task 7 — One-time bootstrap and end-to-end activation

Only when the S1 connector is invocable:
1. preflight `/opt/apps/wealthtech-mcp-ssh-bridge`: branch, HEAD, status, diff, fetch remote, push remote, Docker state;
2. refuse to continue on any unexpected drift;
3. guarded fast-forward S1 to the merged autodeploy SHA;
4. typecheck/build;
5. governed MCP Docker rebuild/restart;
6. health + OAuth + runtime revision attestation;
7. invoke the manual deployment workflow against the exact current `main` SHA;
8. prove GitHub main = S1 HEAD = OCI revision = deployment attestation;
9. activate automatic push deployment;
10. validate with a harmless governed follow-up merge;
11. only then mark the six project objectives completed.

If S1 remains unavailable, stop at `DEPLOYMENT_PENDING`; never claim Tasks 7/automatic attestation complete.