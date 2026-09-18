# GWC PRE-CODE — MULTI-AGENT COORDINATION POLICY

Revision: `R3-PRECODE-MULTI-AGENT-2`
Repository: `Patricked-code/MCP`
Target online work branch: `claude/ecstatic-edison-v1dyt1`
Scope: **uniquement le programme d’évolution GWC / PRECODE porté par la PR #95**.

## 1. Purpose and boundary

Allow Claude, ChatGPT and other authorized agents to work on the same GWC pre-code program without overwriting one another, duplicating work, losing provenance, creating a second Task Queue, or treating stale evidence as current.

This policy coordinates **only** the branch-local PRECODE evolution program. It is **not** Operational Memory, **not** the Governed Task Queue, **not** a runtime lock service, **not** Live State, **not** a new Session Manager and **not** a new runtime source of truth.

The durable versioned work surface for this program is the GitHub online branch:

`claude/ecstatic-edison-v1dyt1`

No alternate persistent branch may be created for this program. A local workspace may be used only as an ephemeral execution surface after synchronizing the exact online head; it is never authoritative, never a second work stream, and no unpushed local state may be treated as a checkpoint or source of truth.

## 2. Agents are peers; ownership belongs to the current bounded scope

Claude and ChatGPT are equivalent authorized PRECODE executors for this evolution program.

There is no permanent agent-level ownership of the program.

- Claude may observe, verify, review or write.
- ChatGPT may observe, verify, review or write.
- Any authorized agent may become writer when the required PRECODE implementation/artifact is absent, incomplete, stale or needs correction, provided the bounded scope is dependency-satisfied and currently unowned.
- Multiple agents may read/review the same scope concurrently.
- Only one agent may mutate a given collision domain at a time.
- Agent identity never grants permission by itself; every write still obeys repository/governance permissions and PRECODE gates.

If Claude returns after ChatGPT has written, or ChatGPT returns after Claude has written, the returning agent MUST first reconstruct and understand the intervening session chain, commits, evidence and checkpoints before doing any new work.

No agent may assume that work it did not personally perform is invalid or must be replayed.

## 3. Canonical hierarchy of work

Every action in this program must be located in this hierarchy:

```text
PROGRAM
  GWC-R3-PRECODE-EVOLUTION
    ↓
PHASE
  P0 / A1 / A2 / A3 / ... / A14 / PRECODE_GATE
    ↓
WORK ITEM
  GWC-PRE-...
    ↓
SESSION
  one identified Claude / ChatGPT / other authorized agent session
    ↓
ACTION
  OBSERVE / RECONCILE / READ / WRITE / VERIFY / REVIEW / CHECKPOINT
    ↓
EVIDENCE
  exact SHA / file / authority / test / CI / review / finding / decision
    ↓
HANDOFF
  current status + NEXT_ACTION + next eligible owner/scope
```

A session never replaces the work item. A work item never becomes a runtime `TASK-*` merely because an agent is executing it. The hierarchy exists only to make the PRECODE evolution program traceable and resumable.

## 4. Every agent session MUST be identified and traceable

Every participating session must have a durable session identifier before its first mutable PRECODE action.

Recommended identifier form:

`GWC-PRE-SESSION-<UTC_TIMESTAMP>-<AGENT>-<SHORT_START_HEAD>`

Examples:

- `GWC-PRE-SESSION-20260917T063500Z-CLAUDE-85a7bb38`
- `GWC-PRE-SESSION-20260917T071200Z-CHATGPT-1234abcd`

If the provider exposes its own stable session/run URL or ID, record it as `providerSessionRef` in addition to the canonical PRECODE session id. It does not replace the canonical id.

At session start, record durably using existing GitHub/checkpoint surfaces:

```text
SESSION_START
program = GWC-R3-PRECODE-EVOLUTION
sessionId = GWC-PRE-SESSION-...
agent = Claude | ChatGPT | ...
providerSessionRef = <if available>
role = writer | reviewer | observer
branch = claude/ecstatic-edison-v1dyt1
startingHeadSha = <exact online SHA>
pr = #95
phase = <P0/A1/...>
workItemId = <exact GWC-PRE-* or bounded range>
collisionDomain = <scope>
pathsToMutate = [...]
dependenciesObserved = [...]
expectedOutput = ...
startedAt = ...
```

This trace may be a PR checkpoint/comment, an existing canonical-memory phase bundle, SUIVI entry and/or commit metadata as appropriate. Do **not** create a second session registry or session manager.

## 5. Mandatory pre-write online observation

Before **every** write-capable action, the agent must re-observe the GitHub online branch and at minimum:

- PR `#95` state, base SHA, exact head branch and exact head SHA;
- latest commits since the session started;
- latest durable GWC checkpoint / canonical-memory pointer;
- latest PR comments/checkpoints relevant to work ownership;
- current session/work-item ownership traces;
- target work item and dependencies;
- exact files/authorities it intends to mutate.

The online branch head is the coordination clock.

If the observed head differs from the head on which the planned edit was prepared, the edit is stale and MUST NOT be written until the intervening work has been read and reconciled.

## 6. Writer selection when work/code is missing

When a required PRECODE/candidate artifact, design, verifier, documentation element, test, workflow or evolved code implementation does not yet exist, the active authorized agent may implement it on the online branch if all conditions below are true:

1. the work belongs to this GWC/PRECODE evolution program;
2. its dependency gate is satisfied;
3. it is allowed by the current PRECODE boundary;
4. no other active session currently owns the same mutable collision domain;
5. exact online head has been observed;
6. existing authorities/components have been inspected first (`REUSE → WRAP → GENERALIZE → EXTEND → NEW`);
7. the intended scope is recorded in the session trace;
8. candidate GWC code starts only after `GWC-PRE-GATE-01 = PASS_WITH_EVIDENCE`; after that gate, branch-local candidate implementation is allowed and expected, while live integration remains forbidden until `FINAL_PRECODE_VERSION_ACCEPTED`.

Therefore ChatGPT is explicitly allowed to write missing PRECODE work, and Claude is explicitly allowed to return later and continue from that work. The same rule applies in reverse.

## 7. Scope claim — durable coordination trace, not a runtime Task

Before taking a mutable PRECODE scope, the writer must leave a durable trace using existing GitHub/checkpoint surfaces. It must contain at minimum:

```text
sessionId
agent
role = writer
program
phase
workItemId / bounded workItem range
collisionDomain
pathsToMutate
startingHeadSha
observedPrHeadSha
expectedOutput
dependencies
startedAt
```

A PRECODE scope claim:

- does **not** create a `TASK-*`;
- does **not** create a GovernedTaskRecord;
- does **not** acquire a runtime lock;
- does **not** authorize live integration into main/S1/production; branch-local candidate code is authorized separately by the architecture gate;
- only prevents overlapping branch-local PRECODE edits between cooperating sessions.

Use existing PR/checkpoint/canonical-memory/SUIVI surfaces. Do not create a second task registry, work queue, journal, session manager or lock service.

## 8. Collision domains and single-writer rule

The following shared canonical files are single-writer collision domains while an edit is in progress:

- `docs/gwc/ARCHITECTURE_73_CONTRACTS.md`
- `docs/gwc/BLUEPRINTS.md`
- `docs/gwc/PRECODE_EXECUTION_PLAN.txt`
- `docs/gwc/PRECODE_ACTION_TASK_FLOW.txt`
- `docs/gwc/PRECODE_MULTI_AGENT_COORDINATION.md`
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

Two sessions may work in parallel only when all of the following are true:

1. dependency order permits both work items;
2. target paths/collision domains do not overlap;
3. neither consumes an uncommitted output of the other;
4. authority ownership does not conflict;
5. no live/runtime lock or governance rule forbids the work;
6. both started from an exact observed online head;
7. each re-observes the online head immediately before publishing its commit.

If any condition is false or unknown, work is sequential.

## 9. Head-moved rule and mandatory takeover reconciliation

If another session advances the branch while work is being prepared:

```text
HEAD_MOVED
→ STOP WRITE
→ REOBSERVE ONLINE BRANCH
→ IDENTIFY INTERVENING SESSION/COMMIT
→ READ every intervening relevant diff/checkpoint
→ UNDERSTAND what changed and why
→ RECONCILE scope, evidence and NEXT_ACTION
→ preserve valid concurrent work
→ recompute the edit on the new exact head
→ VERIFY
→ only then write
```

A returning agent must not merely pull/rebase mechanically. It must understand the semantic effect of the intervening work on its phase, work item, evidence, findings, decisions, collision domain and next action.

Forbidden responses to a moved head:

- force push;
- reset to the previous head;
- overwrite another session's files from a stale snapshot;
- replay an already valid work item without reconciliation;
- mark stale evidence `PASS_WITH_EVIDENCE`;
- continue from a remembered conversation state without reading durable traces.

## 10. Reviewer / verifier mode

A reviewer/observer may work concurrently with a writer when it performs no mutation in the writer's collision domain.

Reviewer responsibilities:

- independently verify evidence;
- detect stale assumptions, authority drift and hidden regressions;
- confirm or refute `PASS_WITH_EVIDENCE`;
- report findings with exact head/provenance and reviewer session id;
- never silently convert a review finding into a conflicting edit.

When a reviewer identifies a required change in a currently owned collision domain, it records the finding and the current writer integrates it, unless ownership is explicitly transferred after a checkpoint.

## 11. Session checkpoints: every meaningful step must leave evidence

Each writer/reviewer session must checkpoint at meaningful boundaries, at minimum:

- after establishing/revalidating the baseline;
- after each significant work item or bounded group;
- before changing phase;
- before yielding ownership;
- before context exhaustion or voluntary stop;
- after detecting a conflict/blocker;
- after recovering from `HEAD_MOVED`;
- at session end.

Checkpoint format:

```text
SESSION_CHECKPOINT
program
sessionId
agent
providerSessionRef
branch
startingHeadSha
observedHeadSha
phase
workItemId / range
status
actionsCompleted
filesRead
filesChanged
authoritiesObserved
evidenceRefs
checksRun
findingsOpened
findingsResolved
decisionsApplied
invariantsVerified
blockers
openDependencies
collisionDomainOwnership = HELD | RELEASED
NEXT_ACTION
checkpointAt
```

A `PASS_WITH_EVIDENCE` claim without re-readable evidence references is invalid.

## 12. Session handoff and ordered continuation

Before a session yields work to another agent, it must leave a handoff that makes the next step deterministic:

```text
SESSION_HANDOFF
fromSessionId
fromAgent
completedHeadSha
lastCompletedWorkItem
currentPhase
releasedCollisionDomains
openFindings
openDependencies
evidenceStillFreshUntil / reobserveRule
NEXT_ACTION
nextEligibleWorkItem
handoffAt
```

The receiving session MUST:

1. identify itself;
2. read the handoff;
3. reobserve the exact online head;
4. read all commits since the handoff head if any;
5. validate the evidence/freshness needed for `NEXT_ACTION`;
6. continue from the hierarchy, not from conversational memory.

This is how Claude must understand ChatGPT's previous work, and how ChatGPT must understand Claude's previous work.

## 13. Session end

Every session that performed or reviewed meaningful PRECODE work must close durably:

```text
SESSION_END
sessionId
agent
finalObservedHeadSha
completedWorkItems
verifiedWorkItems
remainingOwnedScope = NONE | <explicit>
releasedCollisionDomains
finalStatus
NEXT_ACTION
endedAt
```

A provider session disappearing without `SESSION_END` does not automatically free an ambiguous mutable scope. A new session must reobserve the branch, inspect the last durable checkpoint and determine whether ownership is stale before taking over.

## 14. Evidence chain and provenance

Every material claim should be traceable through the chain:

```text
SESSION
→ WORK ITEM
→ ACTION
→ COMMIT / FILE / AUTHORITY OBSERVATION
→ TEST / CI / REVIEW / FINDING
→ CHECKPOINT
→ STATUS
→ NEXT_ACTION
```

For every mutation, preserve at least:

- authoring session id;
- agent name;
- exact parent/start head;
- resulting commit/head;
- work-item id;
- evidence/check references;
- why the change was necessary;
- which previous evidence it supersedes, if any.

Provider-specific session URLs may be added to commit bodies (for example `Claude-Session:`) but are supporting provenance, not the sole durable trace.

## 15. Canonical operating model

```text
ONE ONLINE BRANCH
ONE CURRENT ONLINE HEAD
ONE CANONICAL GWC ARCHITECTURE
ONE CURRENT CONTINUITY POINTER
ONE ORDERED WORK HIERARCHY
N IDENTIFIED AGENT SESSIONS
N CONCURRENT READERS/REVIEWERS
BUT
ONE WRITER PER MUTABLE COLLISION DOMAIN
```

Writer ownership is **scope-based and temporary**, never permanently assigned to Claude or ChatGPT.

## 16. Online-branch-only rule

For this evolution program:

- all durable writes target `claude/ecstatic-edison-v1dyt1` online;
- no new parallel development branch is created;
- no persistent work is kept only locally;
- every session starts by observing the online head;
- every commit is based on the latest reconciled online head;
- every session handoff names the exact resulting online head;
- GitHub PR #95 remains the common collaboration/history surface until the governed transition says otherwise.

Local execution/checkouts are implementation details only. They never become an independent authority or independent branch of work.

## 17. Candidate-build boundary: code on Claude branch, live integration frozen

This coordination policy governs the **pre-integration evolved candidate build** on `claude/ecstatic-edison-v1dyt1`.

The architecture gate and the final candidate gate have different meanings:

- `GWC_ARCHITECTURE_GATE_PASS` unlocks candidate implementation **on the Claude branch**.
- `FINAL_PRECODE_VERSION_ACCEPTED` unlocks the later real-project integration phase.

Between those gates, agents are expected to progressively build the evolved MCP candidate using the real existing skeleton and existing-first integration:

`REUSE → WRAP → GENERALIZE → EXTEND → NEW`.

Allowed and expected on `claude/ecstatic-edison-v1dyt1` after the architecture gate:

- modify/add `src/**` code required by the candidate;
- add/modify tests and fixtures;
- add backward-compatible types/interfaces/schemas;
- add wrappers, generalizations, extensions and justified new primitives;
- prepare additive migrations/compatibility readers;
- evolve workflows/configuration in candidate form;
- close findings and safety prerequisites in candidate code;
- build GWC-0..GWC-17 progressively in dependency order;
- run RED/GREEN/regression/typecheck/build/docs/security checks;
- maintain complete task/evidence/checkpoint/handoff history.

Still forbidden until `FINAL_PRECODE_VERSION_ACCEPTED`:

- real `TASK-*` / GovernedTaskRecord materialization for candidate build;
- runtime claim or runtime lock acquisition;
- merge/integration into `main`;
- direct S1 mutation;
- production deployment or restart;
- activation of the candidate in the live MCP;
- treating this branch as a second production authority.

The active hierarchy is:

`PROGRAM → ARCHITECTURE/CANDIDATE PHASE → GWC-PRE WORK ITEM → SESSION → ACTION → EVIDENCE → CHECKPOINT → HANDOFF → NEXT_ACTION`.

The candidate-build sequence after architecture is:

`B candidate backlog → C safety/foundations → D/E implementation GWC-0..17 → F candidate acceptance → FINAL_PRECODE_VERSION_ACCEPTED`.

Only after that exit may a separate governed integration cycle reobserve current main/server state, reconcile drift and integrate the already-built candidate into the existing MCP.

### 17.1 Automatic candidate connection and work dispatch

Every authorized AI that connects to `claude/ecstatic-edison-v1dyt1` MUST execute this branch-local bootstrap before candidate work:

1. reobserve the exact online branch HEAD;
2. read `CLAUDE.md`, canonical memory, current bundle, `.mcp/gwc-precode-status.json`, latest checkpoint/handoff and action flow;
3. inspect `candidateCoordination.activeClaims`;
4. if the same candidate session already owns one ACTIVE claim, resume that work item first;
5. otherwise select the next READY work item whose dependencies are DONE and whose collision domains are not occupied by another ACTIVE candidate claim;
6. reobserve HEAD immediately before claiming;
7. persist the bounded claim in `candidateCoordination.activeClaims` on the shared branch;
8. if HEAD moved, do not write the stale claim: apply HEAD_MOVED → REOBSERVE → RECONCILE → REDISPATCH;
9. execute RED → GREEN → regression → evidence;
10. checkpoint/handoff, update canonical memory/NEXT_ACTION and release or transfer the branch-local claim.

The deterministic selection contract is implemented by `dispatchCandidateWork()` in `src/governedContext/candidateContinuity.ts`.

This is a **PRECODE branch coordination projection**, not a second Operational Memory, Task Queue, Governed Session or runtime lock service. No `TASK-*` is created and no live authority is mutated.

### 17.2 New conversation information intake

A connected AI MUST treat new user/conversation information as potential program input, not as disposable chat context.

The AI performs semantic understanding and emits bounded structured insights only. The candidate contract then reconciles each insight against canonical memory and candidate work using `reconcileConversationIntake()`.

Allowed dispositions:

- `DUPLICATE` — already represented; do not duplicate;
- `COMPLEMENT` — enrich the existing canonical fact/requirement and, when actionable, the matching candidate work item;
- `DECISION` — record a new decision with provenance;
- `FINDING` — record a new gap/risk/anomaly and attach or propose work when actionable;
- `TASK` — enrich a matching work item or propose a new candidate work item;
- `MEMORY` — add/enrich bounded canonical memory;
- `CONTRADICTION` — fail closed to `HOLD_FOR_REVIEW`; never silently overwrite an active canonical rule.

Security and non-regression rules:

- raw conversation transcripts are not persisted by this contract;
- only bounded summaries, digests and evidence references may enter branch memory;
- information must be reconciled before it changes memory or backlog;
- no conversation input may directly mutate `main`, S1, production, runtime Task Queue, runtime sessions or locks;
- a new task signal must first be checked for duplicate/continuation/conflict and bound to the existing architecture with `REUSE → WRAP → GENERALIZE → EXTEND → NEW`;
- canonical memory and candidate backlog must be updated together when an accepted insight materially changes the program;
- every resulting change must leave evidence and a new `NEXT_ACTION` when appropriate.

TDD evidence for both foundations: RED CI #1046 at `9f6e14df2939e5e4b062e2861dfd5af507d6b157`; GREEN CI #1048 at `138d392942591f8ba0270757bc5df859fdd4b7cb`.

## 18. Conflict resolution precedence for this program

Within the specific PR #95 PRECODE evolution program, this revision supersedes any older statement that permanently assigns Claude as primary writer or ChatGPT as reviewer-only.

The controlling rule is now:

`ANY AUTHORIZED AGENT MAY WRITE AN ELIGIBLE UNOWNED BOUNDED PRECODE SCOPE; EVERY SESSION IS IDENTIFIED; EVERY HANDOFF IS TRACEABLE; EVERY WRITE IS RECONCILED AGAINST THE LATEST ONLINE HEAD.`

All broader MCP governance, non-regression, authority, security and runtime rules remain unchanged.
