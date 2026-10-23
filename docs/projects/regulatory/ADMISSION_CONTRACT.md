# Regulatory — S1 governed admission contract (proposal)

Status: **DESIGN ONLY / NO RUNTIME AUTHORIZATION**. Related: issue #349 and merged PR #350.

## Exact target

- Source: `chainsolutions-wealthtech/Regulatory`, immutable commit SHA required.
- Destination: S1 / Plesk subscription `wealthtechinnovations.com`.
- New subdomain: `regulatory.wealthtechinnovations.com`.
- Plesk subdomain label: `regulatory`; Plesk document-root argument: `/regulatory` (not an application URL prefix).
- Application: Next.js under `/`, Node >=22, no `REGULATORY_BASE_PATH=/regulatory`.
- Source of deployment request: Regulatory `deploy/mcp-target.json`; its `allowAutomaticProvisioning=false` must not be treated as write consent.

## Existing implementation to reuse

`src/provisioning/pleskSite.ts` (pure planner), `pleskExecute.ts` (consented executor), `pleskSshAdapter.ts` (bounded command and fresh preflight), `src/tools/pleskProvisioning.ts` (read-only preview). The current preview transport deliberately rejects guarded writes. Do not bypass this refusal.

## Required runtime gate before any write

1. Reconcile exact GitHub HEAD, deployed MCP image revision, live Task Queue, governed session and lock state.
2. Admit an existing-authority task explicitly scoped to S1, the exact FQDN and Plesk parent; do not self-assign another task or take over an existing session.
3. Verify active authorized session, task claim, collision-free locks, fresh target-specific preflight, server-side allowlist, explicit consent and exact target SHA.
4. Expose a **bounded** Plesk operation only after this gate; never expose arbitrary SSH, broad parent-domain mutation or global `ENABLE_WRITE_TOOLS` as a substitute for authorization.
5. Refuse when the target exists without verified provisioner ownership, when paths are symlinks, when preflight is inconclusive, or when any authority is stale.
6. Postcheck Plesk target, DNS, TLS, reverse proxy, Next.js health and other-vhost invariants; keep a rollback record.

## Acceptance tests (not yet implemented)

- Unauthorized/no task/no session/expired lock/mismatched target => no SSH write.
- Wrong parent, S2 request, sibling domain, symlink, unknown Plesk response => blocked.
- Same target with verified ownership => idempotent no-op; foreign target => blocked.
- Concurrent request and stale revision => one authorized execution maximum.
- Valid authorized request => exactly bounded Plesk argv, fresh preflight and postcheck.
- Build and CI exact PR HEAD; independent review and governed deployment before production.
- Never modify GRT, OAuth PR #207, existing Plesk subscriptions or unrelated vhosts.

## State / next action

This file establishes a narrow, reviewable scope, **not** implementation completion. NEXT_ACTION: implement and test the existing-governance admission adapter on this branch, prove authorization and collision handling, then seek independent review. No provisioning, runtime configuration change or production deployment is authorized by this document.
