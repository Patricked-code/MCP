# Universal Agent Coordination — execution plan

Status: ACTIVE — PR #154  
Baseline: `main@cda7610e1dcd5bc56511f0b42f372f68058ca2fb`  
Branch: `mcp/universal-agent-coordination-20260923`

## Mission

Generalize the existing heartbeat/claim/session coordination model across governed post-integration work without creating a parallel authority. The coordination surface is a read-only projection over existing authorities.

## Non-negotiable invariants

- Governed Session remains the session authority.
- Governed Task Queue remains the task authority.
- Existing claim/lock authorities remain authoritative for ownership and exclusion.
- Heartbeat is liveness evidence only: `STALE != RELEASED`, `UNKNOWN != RELEASED`.
- Timeout alone never transfers ownership.
- No automatic claim takeover.
- No second queue, session store, lock service, claim store, or memory authority.
- GitHub-first remains preferred; bridge/runtime exposure is requested only for a proven runtime-only need with no approved fallback.
- No direct S1 write.
- Exact-head observation before mutation and exact-head CI/review before merge.
- Historical PRECODE sessions/claims remain provenance and compatibility inputs, never resurrected as current execution merely because they exist.

## Work breakdown

| ID | Work | State | Completion evidence |
|---|---|---|---|
| UAC-01 | Inventory existing session/task/claim/lock/heartbeat/GitHub authorities and adapters | IN_PROGRESS | source-to-authority map; no duplicate authority |
| UAC-02 | Universal read-only coordination contract | GREEN | `agentCoordination.ts` + tests; CI #1739 SUCCESS |
| UAC-03 | Governed Session adapter | TODO | active/expired/closed session projected without mutation |
| UAC-04 | Governed Task Queue adapter | TODO | task identity/status/current phase projected |
| UAC-05 | Claim + collision-domain adapter | TODO | ownership projected; collisions visible; no takeover |
| UAC-06 | Heartbeat/liveness adapter | TODO | FRESH/STALE/UNKNOWN derived from authoritative evidence |
| UAC-07 | Lock projection | TODO | held locks/collision scopes observable read-only |
| UAC-08 | GitHub execution binding | TODO | repository/branch/exact HEAD/PR/checks bound to snapshot |
| UAC-09 | Checkpoint + NEXT_ACTION projection | TODO | current step/blockers/next action visible |
| UAC-10 | GitHub-first read-only exposure | TODO | snapshot obtainable without interactive bridge when fallback exists |
| UAC-11 | Historical PRECODE compatibility adapter | TODO | old candidate sessions/claims readable but not reactivated |
| UAC-12 | Multi-agent collision E2E | TODO | second writer blocked/routed safely |
| UAC-13 | Stale heartbeat E2E | TODO | stale agent retains claim until authoritative release/recovery |
| UAC-14 | Unknown heartbeat E2E | TODO | fail-closed; no ownership inference |
| UAC-15 | Reconnect/resume E2E | TODO | same agent resumes compatible task/claim |
| UAC-16 | HEAD_MOVED reconciliation E2E | TODO | stale execution reconciles before further mutation |
| UAC-17 | Crash/checkpoint recovery E2E | TODO | no duplicate mutation; deterministic resume |
| UAC-18 | Normal terminal closure E2E | TODO | task/session/claim/locks close consistently |
| UAC-19 | Read-only supervision view | TODO | answer who/what/where/liveness/collision/NEXT_ACTION from evidence |
| UAC-20 | Governance/docs/cartography reconciliation | TODO | CLAUDE/SUIVI/CHANGELOG/decision or registry updates as applicable |
| UAC-21 | Full non-regression validation | TODO | typecheck/build/docs/governance/GWC/secrets/tests all green |
| UAC-22 | Exact-head review and merge readiness | TODO | no unresolved blocking findings; exact-head gates green |
| UAC-23 | Post-merge governed deploy and attestation | TODO | GitHub/main/S1/runtime exact-SHA alignment where required |
| UAC-24 | Terminal handoff/closure | TODO | Live State/current documentation reconciled; no orphan claim/lock |

## Supervision loop

For every material step:

1. Reobserve `main`, PR #154 head, CI/review and changed scope.
2. Reobserve only the runtime authorities required by the bounded operation.
3. Check active claims, liveness and collision domains before any write.
4. If HEAD moved, reconcile before continuing.
5. If another writer owns an overlapping collision domain, do not take over; route/wait/reconcile.
6. Execute the smallest existing-first change.
7. Run RED -> GREEN where behavior changes.
8. Reobserve exact-head CI and review.
9. Update the checkpoint/NEXT_ACTION.
10. Never infer release, ownership transfer, runtime health, or deployment from absence of evidence.

## Definition of done

The program is complete only when a governed agent doing mutating work can be observed as:
`identity -> session -> task -> claim -> collision domains -> heartbeat/liveness -> locks -> GitHub HEAD -> checkpoint -> NEXT_ACTION`,
with fail-closed ownership semantics, multi-agent tests, GitHub-first read-only supervision, full regression gates, merge/deploy attestation where required, and terminal cleanup.
