# MCP Live State V1 — Design

## Status

Approved in conversation on 2026-08-09 before implementation. This document materializes the approved design; it does not introduce a second architecture.

## Goal

Add a native, read-only-first Live State Engine to `Patricked-code/MCP` so every MCP client can obtain the same fresh operational view of GitHub `main`, the S1 checkout, the active Docker runtime, and canonical documentation without relying on conversation memory or stale Markdown.

## Existing architecture to extend

The implementation MUST extend the current Node/TypeScript MCP service and reuse:

- the existing Express/MCP process;
- `/app/data`, already mounted persistently by Docker Compose;
- the GitHub registry/storage pattern already present under `src/github/registry.ts`;
- existing SSH read-only execution through `runReadOnlyCommand`;
- existing bounded runtime attestation logic in `src/tools/runtimeAttestation.ts`;
- existing `registerReadOnlyTools` registration path.

No second MCP, new microservice, PostgreSQL, Redis, or new container is introduced in V1.

## Runtime state file

Persist the latest normalized state at:

`/app/data/mcp-live-state.json`

Requirements:

- JSON only;
- mode `0600`;
- parent directory mode `0700` when created by the engine;
- atomic replacement through temp-file write then rename;
- never store secrets, environment variables, SSH private-key material, arbitrary Docker labels, mounts, command lines, or network configuration;
- the runtime state file is not committed to Git.

## State model

The normalized state contains at minimum:

- `schemaVersion`;
- `stateVersion`;
- `generatedAt`;
- `lastReconciledAt`;
- `maxAgeSeconds` = 60;
- `freshness`;
- repository identity;
- GitHub state;
- S1 Git state;
- runtime state;
- documentation state;
- alignment verdicts;
- contradictions;
- `nextAction`.

`stateVersion` changes when the meaningful normalized state changes. A periodic refresh with identical observed state updates freshness timestamps without pretending that a new semantic version of state was created.

## GitHub collector

Read the current canonical branch dynamically. Never hard-code a commit SHA.

Collect at minimum:

- repository `Patricked-code/MCP`;
- branch `main`;
- current remote `main` SHA.

The collector must fail closed: when GitHub cannot be observed, mark that source unavailable/stale rather than preserving an old value as if current.

## S1 collector

Use existing read-only SSH facilities against `/opt/apps/wealthtech-mcp-ssh-bridge`.

Collect at minimum:

- branch;
- HEAD;
- locally known `origin/main`;
- clean/dirty status including untracked files;
- tracked diff empty/non-empty;
- fetch remote;
- push remote.

No pull, reset, clean, checkout, rebase, stash, build, restart, or write is allowed in the collector.

## Runtime collector

Reuse the bounded Docker attestation logic instead of adding unrestricted `docker inspect` surfaces.

Collect at minimum:

- container identity;
- status;
- health;
- image ID;
- OCI revision when explicitly available through the safe allowlist.

If the runtime revision cannot be proven, report `UNVERIFIED`. Never infer it from the S1 checkout.

## Documentation collector

Read only the minimum canonical operational documents needed to identify declared state, especially `SUIVI.md`, `TASKS.md`, `TODO.md`, `DECISIONS_LOG.md`, and `PRODUCTION_STATE.json` when present.

V1 should use deterministic, conservative signals rather than an unrestricted natural-language parser. A disagreement between documented SHA/task status and verified live state becomes `DOCUMENTATION_DRIFT` or `RECONCILIATION_REQUIRED`.

## Reconciliation

Normalize explicit states including:

- `CURRENT`;
- `STALE`;
- `ALIGNED`;
- `PARTIALLY_ALIGNED`;
- `DRIFTED`;
- `RUNTIME_UNVERIFIED`;
- `DOCUMENTATION_DRIFT`;
- `RECONCILIATION_REQUIRED`;
- `DEPLOYMENT_PENDING`;
- `RUNTIME_DEPLOYMENT_PENDING`;
- `FULLY_ALIGNED`;
- `DEGRADED`.

Core rules:

- GitHub SHA = S1 HEAD => Git alignment `ALIGNED`;
- GitHub SHA != S1 HEAD, with both observed => `DEPLOYMENT_PENDING`/drift;
- GitHub = S1 but runtime revision differs => `RUNTIME_DEPLOYMENT_PENDING`;
- runtime revision unavailable => never `FULLY_ALIGNED`;
- dirty S1 checkout => `RECONCILIATION_REQUIRED`;
- unavailable mandatory source => `DEGRADED`;
- stale state older than 60 seconds => `STALE`;
- declared documentation conflicting with verified state => `DOCUMENTATION_DRIFT`.

## Refresh lifecycle

On MCP startup:

1. perform one reconciliation without blocking service startup indefinitely;
2. schedule reconciliation every 60 seconds;
3. prevent overlapping reconciliation runs;
4. catch collector errors independently so one source failure does not crash the MCP process;
5. persist the normalized degraded state when a source fails.

## MCP tools

Expose two read-only tools:

### `mcp_get_live_state`

Return the latest persisted/in-memory normalized state and computed age/freshness. It does not force network or SSH collection.

### `mcp_reconcile_live_state`

Force one read-only reconciliation and return the resulting state.

Both tools must be registered through the existing read-only registration path and must not expose secrets.

## Project context integration

Extend `get_project_context` without removing existing fields. Add a compact Live State summary or pointer containing at least:

- availability;
- state version;
- freshness;
- global alignment;
- active task signal if available;
- next action.

## HTTP surface

V1 may expose a protected JSON route such as `/live-state.json` only if it can reuse the existing web authentication policy cleanly. This route is optional for the first merge; the MCP tools are mandatory.

## Tests

Tests must cover at least:

1. GitHub = S1 => aligned;
2. GitHub != S1 => deployment pending/drift;
3. runtime revision absent => runtime unverified;
4. runtime revision differs => runtime deployment pending;
5. documentation mismatch => documentation drift;
6. unavailable source => degraded, never fully aligned;
7. stale state calculation;
8. state version changes only for meaningful state changes;
9. atomic state persistence and JSON validity;
10. the two MCP tools are registered as read-only;
11. collector failure does not crash reconciliation;
12. no secret-bearing Docker surfaces are added;
13. existing safety/typecheck/build/docs/secrets tests continue to pass.

## Deployment flow

After CI and review:

`GitHub branch -> PR -> merge main -> mcp_sync_from_github_s1 -> verify GitHub main = S1 HEAD -> typecheck/build -> docker compose up -d --build -> health -> runtime attestation -> Live State verification`.

S1 synchronization must use the existing governed fast-forward-only tool. No direct source edit on S1 and no S1 push to GitHub.

## V1 exclusions

Do not implement in this PR unless required to reuse existing functionality:

- PostgreSQL;
- Redis;
- GitHub webhooks/App;
- task/session locks;
- agent heartbeats;
- write gates;
- generalized optimistic concurrency;
- required GitHub Live State check.

These belong to V1.5/V2 after the read-only state engine proves reliable.

## Failure semantics

The engine must prefer explicit uncertainty over false certainty. `FULLY_ALIGNED` is only legal when all required comparable states are current and GitHub, S1, and runtime revision are proven equal and there is no blocking documentation/working-tree drift.

## Rollback

The feature is additive and read-only with respect to GitHub/S1/runtime observation. Rollback is the previous known-good MCP commit/image. The state file under `/app/data` may remain unused after rollback; no rollback depends on restoring secrets or rewriting Git history.
