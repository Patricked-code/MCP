# Universal Agent Coordination — execution plan

Status: ACTIVE — PR #154
Baseline reconciled: `main@84bbe9b1684f5f6be73eaf2d6aa21063fb62697a` via non-destructive merge commit `c967a068a683033580b091405a5e8b7a837d4ecb`
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

## UAC-01 — source-to-authority map

This inventory is descriptive and read-only. It identifies the existing owner for each coordination fact so later UAC adapters compose existing authorities instead of creating a second authority.

| Coordination surface | Existing authority / source | Existing projection or adapter to reuse | UAC rule |
|---|---|---|---|
| Governed session / agent identity | `src/operationalMemory/types.ts#GovernedSessionRecordSchema` and `src/operationalMemory/sessionService.ts` | `src/governedWorkflow/adapters/session.ts` (`sessionEvidence`, GW-16/GW-17 wrappers) | Governed Session remains the session authority; UAC only projects it. |
| Heartbeat / liveness | `GovernedSessionRecord.lastHeartbeatAt` updated through `GovernedSessionService.heartbeat()` | Session evidence already carries `lastHeartbeatAt`; historical PRECODE heartbeat helpers in `candidateContinuity.ts` are compatibility evidence only | Heartbeat proves liveness only. `STALE`/`UNKNOWN` never releases, transfers or fabricates ownership. |
| Task identity / status | `GovernedTaskRecord` + `GovernedTaskQueue` in `src/operationalMemory/taskQueue.ts` | `src/governedWorkflow/adapters/task.ts` GW-14/GW-15/GW-18/GW-20 wrappers | Governed Task Queue remains the task authority. |
| Claim / ownership | `GovernedTaskRecord.status` + `ownerGovernedSessionId`; mutation through `claimNextTask()` / governed transitions | GW-18 task-claim wrapper | There is no separate claim store to create. UAC claim fields must be derived from the authoritative task record and must never be transferred from heartbeat age. |
| Collision domains | `GovernedTaskRecord.resourceScopes`, `activeScopeConflict()`, active lock scopes | `reconcileIntent()`, `claimNextTask()`, `planMinimalLockSet()` | Collision detection precedes mutation; overlapping foreign ownership fails closed. |
| Governed locks | `GovernedLockRecord` + `src/operationalMemory/lockService.ts` | `src/governedWorkflow/adapters/task.ts` lock evidence / GW-19 wrapper | Governed Lock Service remains authoritative. Lock expiry/release is not claim release. |
| GitHub execution binding | GitHub live state collected through `src/governedContext/github.ts` | `GithubOperationalContext` + `src/governedContext/githubFirstOperationalContinuity.ts` | Repository, branch, PR, exact HEAD, checks/reviews and freshness stay GitHub-first; stale/mismatched HEAD fails closed. |
| Checkpoint / blockers / NEXT_ACTION | `GovernedSessionRecord.lastCheckpoint`, `blockers`, `nextAction`; `GovernedCheckpoint`; task `blockers/nextAction` | `GovernedSessionService.createCheckpoint()` and existing read projections | UAC exposes the current checkpoint only; it does not create a checkpoint authority. |
| Bootstrap / state evidence | Bootstrap Receipt and Live State | Existing session/task wrappers (GW-12/GW-13) | Evidence can constrain a projection but never substitutes for task/session/claim/lock authority. |
| Historical PRECODE continuity | Immutable canonical-memory / `.mcp/gwc-precode-status.json`; transient candidate heartbeat helpers | `src/governedContext/candidateContinuity.ts` | Historical sessions/claims/heartbeats are provenance/compatibility inputs only and are never reactivated as current execution. |

### UAC-01 findings

- **UAC-01-F1 — no standalone claim authority:** the current read-only snapshot uses the label `Claim` in its authority list, but the repository source of truth is the Governed Task Queue record (`status + ownerGovernedSessionId`). UAC-05 must normalize this without introducing a claim store.
- **UAC-01-F2 — lock authority naming:** the repository names the owner `Governed Lock Service`; UAC-07 must project that existing authority precisely rather than imply a new lock surface.
- **UAC-01-F3 — PRECODE heartbeat is historical:** candidate PR-comment heartbeat code is retained only for UAC-11 compatibility; current post-integration liveness must come from current governed-session evidence or remain `UNKNOWN`.
- **UAC-01-F4 — GitHub freshness is already modeled:** `GithubOperationalContext` exposes exact-head/check/review freshness and must be reused by UAC-08/UAC-10 rather than rebuilt.

## Work breakdown

| ID | Work | State | Completion evidence |
|---|---|---|---|
| UAC-01 | Inventory existing session/task/claim/lock/heartbeat/GitHub authorities and adapters | GREEN | source-to-authority map above; no duplicate authority; exact-head CI required |
| UAC-02 | Universal read-only coordination contract | GREEN | `agentCoordination.ts` + tests; CI #1739 SUCCESS |
| UAC-03 | Governed Session adapter | GREEN | all governed lifecycle states projected without mutation or ownership inference |
| UAC-04 | Governed Task Queue adapter | GREEN | authoritative task identity/status/phase/owner/scopes projected without mutation |
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
