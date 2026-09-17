# GWC PRE-CODE — MULTI-AGENT COORDINATION POLICY

Revision: `R3-PRECODE-MULTI-AGENT-1`
Repository: `Patricked-code/MCP`
Target work branch: `claude/ecstatic-edison-v1dyt1`

## 1. Purpose

Allow Claude, ChatGPT and other authorized agents to work on the same GWC pre-code branch without overwriting one another, duplicating work, creating a second Task Queue, or treating stale evidence as current.

This policy coordinates branch-local PRECODE work only. It is **not** Operational Memory, **not** the Governed Task Queue, **not** a runtime lock service, **not** Live State, and **not** a new source of truth for runtime governance.

## 2. Default roles

- `Claude` = primary PRECODE executor/writer by default.
- `ChatGPT` = independent observer/verifier/reviewer by default.
- Any secondary agent may become a writer only for an explicitly bounded, dependency-satisfied and disjoint scope.
- Multiple agents may read and review the same scope concurrently.
- Only one agent may mutate a given collision domain at a time.

The default role separation may be changed by an explicit user instruction or by a durable checkpoint that assigns a disjoint scope, but it must never be inferred from mere tool availability.

## 3. Mandatory pre-write observation

Before **every** write-capable action, the agent must re-observe at minimum:

- PR `#95` state, base SHA, head branch and exact head SHA;
- the latest durable GWC checkpoint / canonical-memory pointer;
- latest PR comments/checkpoints relevant to work ownership;
- the target work item and its dependencies;
- the exact files/authorities it intends to mutate.

If the observed head differs from the head on which the planned edit was prepared, the edit is stale and MUST NOT be written until it is reconciled.

## 4. Scope claim — durable trace, not a runtime Task

Before taking a mutable PRECODE scope, the writer must leave a durable trace using existing GitHub/checkpoint surfaces. The trace must contain:

```text
agent
role = writer | reviewer
workItemId / bounded workItem range
collisionDomain
pathsToMutate
startingHeadSha
observedPrHeadSha
expectedOutput
startedAt
```

A PRECODE scope claim:

- does **not** create a `TASK-*`;
- does **not** create a GovernedTaskRecord;
- does **not** acquire a runtime lock;
- does **not** authorize runtime code;
- only prevents overlapping branch-local PRECODE edits between cooperating agents.

Use existing PR/checkpoint/canonical-memory/SUIVI surfaces for the trace. Do not create a second task registry, work queue, journal, session manager or lock service for this purpose.

## 5. Collision domains and single-writer rule

The following shared canonical files are single-writer collision domains while an edit is in progress:

- `docs/gwc/ARCHITECTURE_73_CONTRACTS.md`
- `docs/gwc/BLUEPRINTS.md`
- `docs/gwc/PRECODE_EXECUTION_PLAN.txt`
- `docs/gwc/PRECODE_ACTION_TASK_FLOW.txt`
- `docs/gwc/canonical-memory/current.json`
- `.mcp/gwc-contracts.json`
- `.mcp/gwc-workflow-graph.json`
- `.mcp/gwc-blueprints.json`
- `.mcp/gwc-evolution-design.json`
- `.mcp/gwc-precode-gate.json`
- `.mcp/gwc-precode-action-flow.json`
- `CLAUDE.md`
- `SUIVI.md`
- `CHANGELOG.md`
- `DECISIONS_LOG.md`

Two agents may work in parallel only when all of the following are true:

1. dependency order permits both work items;
2. target paths/collision domains do not overlap;
3. neither task consumes an uncommitted output of the other;
4. authority ownership does not conflict;
5. no live/runtime lock or governance rule forbids the work;
6. both started from an exact observed head;
7. each agent will re-observe the head immediately before publishing its commit.

If any condition is false or unknown, work is sequential.

## 6. Head-moved rule

If another agent advances the branch while an edit is being prepared:

```text
HEAD_MOVED
→ STOP WRITE
→ REOBSERVE
→ READ the intervening commit(s)
→ RECONCILE scope and evidence
→ preserve valid concurrent work
→ recompute the edit on the new exact head
→ VERIFY
→ only then write
```

Forbidden responses to a moved head:

- force push;
- reset to the previous head;
- overwrite the other agent's files from a stale snapshot;
- replay an already valid work item without reconciliation;
- mark stale evidence `PASS_WITH_EVIDENCE`.

## 7. Reviewer mode

A reviewer/observer may work concurrently with a writer when it performs no mutation in the writer's collision domain.

Reviewer responsibilities:

- independently verify evidence;
- detect stale assumptions, authority drift and hidden regressions;
- confirm or refute `PASS_WITH_EVIDENCE`;
- report findings with exact head/provenance;
- never silently convert a review finding into a conflicting edit.

When a reviewer identifies a required change in a currently owned collision domain, it records the finding and the current writer integrates it, unless ownership is explicitly transferred after a checkpoint.

## 8. Secondary-writer mode

ChatGPT or another agent may become writer for a disjoint PRECODE lot only after:

1. re-observing the exact current head;
2. checking current claims/checkpoints;
3. selecting a dependency-satisfied scope with no overlapping collision domain;
4. leaving the durable scope claim;
5. performing only that bounded work;
6. publishing evidence/checkpoint on completion.

The agent must not opportunistically expand its scope because adjacent work appears convenient.

## 9. Completion and handoff

Every writer completion must record at least:

```text
agent
workItemId
startingHeadSha
completedHeadSha
status
filesChanged
evidenceRefs
checksRun
findings
openDependencies
NEXT_ACTION
completedAt
```

`PASS_WITH_EVIDENCE` is valid only when the evidence can be re-read and is bound to the completed exact head or to an explicitly fresh live authority.

After completion, the agent releases branch-local ownership of that collision domain by recording the checkpoint/handoff. It must then either continue to the next eligible work item or leave an exact `NEXT_ACTION` if a real blocker stops the path.

## 10. Canonical operating model

```text
ONE BRANCH
ONE CURRENT HEAD
ONE CANONICAL GWC ARCHITECTURE
ONE CURRENT CONTINUITY POINTER
N AGENTS MAY OBSERVE/REVIEW
BUT
ONE WRITER PER MUTABLE COLLISION DOMAIN
```

Default GWC PRECODE collaboration model:

```text
CLAUDE  = primary executor / writer
CHATGPT = independent verifier / reviewer

ChatGPT writer mode = allowed only for explicitly disjoint claimed scope
```

## 11. Runtime boundary remains frozen

This coordination policy does not change the PRECODE gate:

- no GWC runtime implementation before `GWC-PRE-GATE-01 = PASS_WITH_EVIDENCE`;
- no artificial `TASK-*` creation from PRECODE work items;
- no runtime claim/lock/deploy/server mutation from this policy;
- Phase B live Task Queue reconciliation remains the only bridge to real Governed Tasks.
