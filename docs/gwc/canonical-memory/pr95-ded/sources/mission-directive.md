# Current mission directive — normative summary

The current mission is ONLY:

EXISTING SYSTEM
→ DETAILED EVOLUTION DESIGN GWC-0..GWC-17

on PR #95 and its existing branch.

The addendum 0 BIS / 0 TER supersedes incompatible prior instructions.

Current prohibitions:
- no AF-19 implementation;
- no AF-19 RED;
- no new Task;
- no new branch;
- no new PR;
- no Task claim;
- no lock acquisition;
- no merge of PR #95;
- no deployment;
- no server mutation;
- no GWC runtime implementation.

Existing-first decision order:
REUSE → WRAP → GENERALIZE → EXTEND → NEW.

GitHub live is authoritative for versioned GitHub state only.
Runtime/operational facts remain owned by their actual authorities.
Historical memory never replaces live approval or inaccessible runtime authority.

Future Task materialization:
Blueprint / Detailed Evolution Design
→ live Governed Task Queue reconciliation
→ CONTINUATION / DUPLICATE / CONFLICT / BLOCKED / OUT_OF_SCOPE / NEW_TASK
→ create a Task only if classification = NEW_TASK.

Terminal design verdict:
DETAILED_EVOLUTION_DESIGN_READY_FOR_TASK_RECONCILIATION
or DETAILED_EVOLUTION_DESIGN_PARTIALLY_READY.

## GWC finality — continuity reference

The concrete finality of the GWC program is to evolve the existing MCP additively, not replace it.

The MCP already contains substantial governed capabilities and authorities, including GitRegistry, Governed Task Queue, Governed Sessions, Operational Memory, Bootstrap Receipts, Lock Service, Live State, Current State, Governed Context, Capability Reality, Governance Decision, GitHub observations, candidate GitHub Control Plane work, S1/S2 operations, deploy worker, runtime attestation, health checks, checkpoints, CI and exact-SHA mechanisms.

The main gap is not that these capabilities do not exist. The gap is that they do not yet form one universal, contractual, end-to-end governed workflow.

Target lifecycle:

INTENT
→ IDENTITY
→ REPOSITORY
→ PROJECT
→ SERVER
→ RUNTIME
→ DOMAIN
→ GOVERNANCE
→ EFFECTIVE CAPABILITIES
→ TASK
→ SESSION
→ LOCK
→ DEVELOPMENT
→ REVIEW
→ MERGE
→ DEPLOY
→ EXACT-SHA PROOF
→ TERMINAL VERIFICATION
→ DONE

The evolution model is additive:

EXISTING MCP
+ wrappers/adapters where needed
+ backward-compatible generalization where needed
+ minimal extensions where needed
+ new primitives only when no legitimate existing owner can carry the responsibility
+ GWC contracts / graph / orchestration
= EVOLVED MCP

GWC must adapt to the MCP, not force the MCP to be replaced by a parallel system.

GWC ENGINE = ORCHESTRATOR OF AUTHORITIES, NOT A NEW MASTER AUTHORITY.

Existing owners remain owners of their facts and mutations. GWC must not create a second Task Queue, Live State, Session Engine, Lock Service, GitRegistry, Operational Memory, GitHub client/control plane, deployment authority or runtime authority.

The orchestration model is:

user intent
→ deterministic orchestration engine
→ consult existing authorities
→ evaluate the current contract
→ determine the next legitimate action
→ invoke the appropriate existing primitive
→ re-observe
→ verify the postcondition
→ advance through the graph

The universal target is to remove historical assumptions such as a single Patricked-code/MCP repository, S1-only execution, one repository, one runtime or one domain. The target model must support:

1 logical project
→ 1..N repository components
→ independent SHAs per component
→ 0..N runtimes
→ 0..N domains/endpoints
→ project-specific authorities, permissions and governance

A multi-repository project must never be collapsed into one PROJECT_SHA.

The end-state is that a newly connected agent should not need a long manually reconstructed prompt to know what to do. From an intent and live authorities, the MCP+GWC system must be able to determine:
- where it is;
- what it is allowed to do;
- what work already exists;
- which Task applies;
- which Session must be resumed;
- which locks are required;
- where a change belongs;
- which evidence is missing;
- the exact next legitimate action;
- how to verify the result;
- how to resume after interruption;
- how to reach DONE without bypassing existing authorities.

This finality is a continuity and design constraint. It is not live approval for mutation, implementation, merge or deployment.
