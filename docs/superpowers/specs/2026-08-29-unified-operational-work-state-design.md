# Unified Operational Work State — Design

## Goal

Evolve the existing Mandatory Agent Bootstrap & Work Orchestration V1 components into one coherent operational projection that lets an incoming agent observe work reality before acting, without introducing a second orchestrator and without changing the WRITE gate from `shadow` to `enforce`.

## Existing components to extend

- Live State V1
- Current State
- `GithubOperationalContext`
- `GovernedOperationalContext`
- Operational Memory and Task Queue
- Governed Sessions, Bootstrap Receipts, Checkpoints and Locks
- `deriveShadowWriteDecision()` / scoped WRITE gate
- existing dashboard, audit journal and generated inventories

GitHub remains the mutation source of truth: branch → PR → CI → exact-head merge → Autodeploy exact-SHA → S1/runtime. S1 remains read-only toward GitHub.

## Capability Reality

Represent registration separately from external usability:

```ts
type CapabilityReality = {
  toolName: string;
  registered: boolean;
  callability: {
    status: 'CALLABLE' | 'NOT_CALLABLE' | 'UNKNOWN';
    source: 'SERVER' | 'TRANSPORT' | 'CLIENT_ATTESTATION';
  };
  authorized: { status: 'TRUE' | 'FALSE' | 'UNKNOWN' };
  safeNow: boolean;
  reasonCodes: string[];
  requiredEvidence: string[];
  observedAt: string;
  provenance: string[];
};
```

Server registration never proves client callability. In the absence of a bounded transport/client observation, registered tools are `callability=UNKNOWN`, `safeNow=false`, reason `CALLABILITY_UNATTESTED`. A negative callability value requires an observation capable of seeing the relevant client/transport surface.

## Task Reality

Compare the declared task lifecycle with bounded GitHub/runtime/documentation evidence. The projection can report:

- `ALIGNED`
- `TASK_STATE_BEHIND_REALITY`
- `TASK_STATE_AHEAD_OF_REALITY`
- `EVIDENCE_UNAVAILABLE`

It may recommend an official lifecycle path, but never mutates the Task Store itself.

## GitHub Work State

Extend the existing GitHub collector, preserving current fields, with additive bounded evidence:

- work-branch head SHA;
- required check observations and exact-head match;
- per-area freshness/provenance;
- PR author/ownership and last activity;
- explicit cache observation (`HIT`, `MISS`, `REFRESHED`);
- explicit `github_cache_miss` when no cached observation exists.

Unavailable GitHub work evidence only fails closed operations that actually require it.

## Governance Decision / Observer Before Actor

A single pure decision model is contextual to an operation and contains task/taskReality, session/owner/bootstrap, dependencies/resource scopes/locks, GitHub/runtime state, capability reality, required evidence, blockers, next safe action, `mayMutate` and reason codes.

There is no global indiscriminate `safeNow` switch. `github.merge` may be unsafe because GitHub evidence is unavailable while an unrelated read or operation can remain unaffected.

## Shadow integration

`deriveShadowWriteDecision()` remains backward compatible and non-blocking. Its existing checks (session, stateVersion/freshness, acknowledged state, locks, bootstrap, task claim, audit baseline) are mapped through the shared Governance Decision kernel. Historical verdict names and handler behavior remain unchanged.

## Metrics / enforce-ready

Journal bounded observations for missing/stale bootstrap, unclaimed tasks, lock conflicts, `github_cache_miss`, GitHub unavailable, callability unknown/not callable, authorization failures/unknown, `safeNow=false`, task state drift and stale ownership. Produce enforce-ready evidence only. No code path may activate `enforce` in this task.

## Compatibility constraints

- existing tool names and schemas remain compatible;
- `ENABLE_WRITE_TOOLS=false` and `allow_write=false` retain precedence;
- OAuth, GitHub OIDC and Autodeploy contracts are unchanged;
- shadow remains non-blocking;
- old Live State, sessions, checkpoints and locks remain readable;
- no direct S1 mutation or S1→GitHub push;
- no second work queue, Live State V2 or parallel onboarding/orchestration engine.
