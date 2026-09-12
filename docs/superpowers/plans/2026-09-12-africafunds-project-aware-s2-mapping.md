# AfricaFunds Project-Aware S2 Mapping Implementation Plan

> **Execution rule:** use the existing governed session and task. Follow TDD RED → GREEN → REFACTOR and re-attest live authorities at each delivery gate.

**Goal:** Extend the existing GitRegistry additively so it can represent multi-repository projects, then map AfricaFunds only after the compatibility foundation is deployed and attested.

**Spec:** `docs/superpowers/specs/2026-09-12-africafunds-project-aware-s2-mapping-design.md`

**Approved checkpoint:** `6ad95c77-fb4b-4abd-bf3f-3a1db74eb142`

## Global constraints

- Task: `TASK-20260910-001`; session: `39ff2377-f4c2-4ca2-99ee-beff54a2f2d4`.
- Phase 1 branch: `mcp/africafunds-registry-phase1-20260912`, based on exact `main` `fa563c6e21d6fa07bf5b33a58626ceae1cdedc13`.
- No new registry/store/cache/tool/observer, no direct S1 write, no WRITE-gate change and no permission inference.
- No AfricaFunds data in Phase 1.
- No Phase 2 until Phase 1 is merged, deployed exact-SHA and `FULLY_ALIGNED`.
- Do not sync or mutate AfricaFunds S2 checkouts, untracked API content, repositories or historical vhosts.
- Keep GitHub Actions to SSH to S1 outside this task.

## Phase 1 — structural compatibility

### Task 1: Record the approved boundary

**Files:**

- Create `docs/superpowers/specs/2026-09-12-africafunds-project-aware-s2-mapping-design.md`
- Create `docs/superpowers/plans/2026-09-12-africafunds-project-aware-s2-mapping.md`

- [x] Reconcile Live State `171`, receipt, task rev. `8`, session rev. `9`, Work Queue and exact baseline.
- [x] Renew the two existing task/repository locks by heartbeat; do not reacquire them.
- [x] Verify the local and GitHub branch both start at the exact baseline.
- [x] Persist the approved two-phase design and this plan.

### Task 2: Write RED compatibility tests

**Files:**

- Create `tests/gitRegistryProjectCompatibility.test.ts`
- Modify `package.json` only to add the focused test to the existing read-only safety suite if required by CI routing.

- [ ] Assert historical V1 input without `projects` stays compatible and does not gain the field during active read/write.
- [ ] Assert optional V1 projects and optional mapping correlations survive active read/write.
- [ ] Assert V1 projects and correlations survive V1-to-V2 dry-run migration.
- [ ] Assert historical V2 input without projects remains valid and its old report shape stays compatible.
- [ ] Assert duplicate identifiers, missing component references and invalid historical-vhost flags fail closed.
- [ ] Run `node --import tsx --test tests/gitRegistryProjectCompatibility.test.ts` and record the intended RED.

### Task 3: Implement minimal GREEN support

**Files:**

- Modify `src/github/registry.ts`
- Modify `src/github/registryV2.ts`
- Modify `package.json` only if the new test is not otherwise included by a canonical CI suite.

- [ ] Add bounded shared project/correlation schemas to the existing GitRegistry modules.
- [ ] Preserve `projects` and mapping correlations only when present.
- [ ] Carry the optional structures into the V2 candidate without activating V2.
- [ ] Add uniqueness, component-reference and historical-vhost invariants.
- [ ] Keep dry-run counts/report compatible when `projects` is absent; expose a project count only when present.
- [ ] Run the focused test to GREEN.
- [ ] Run `tests/gitRegistryV2.test.ts` and tool-contract regressions.
- [ ] Refactor only with all focused tests green.

### Task 4: Full Phase 1 verification and delivery

- [ ] Run the canonical typecheck, build, documentation and secret checks.
- [ ] Run the entire test suite using the repository-compatible Node/tsx invocation if the sandbox IPC launcher is unavailable.
- [ ] Inspect the complete diff for accidental permissions, data, secrets, parallel authority or Phase 2 content.
- [ ] Commit and push the exact reviewed Phase 1 head.
- [ ] Open a Phase 1 PR; record task branch/PR at the permitted lifecycle transition.
- [ ] Require exact-head CI success and resolve all review findings.
- [ ] Merge only the reviewed exact head.
- [ ] Wait for the governed GitHub-to-S1 deployment.
- [ ] Reconcile Live State and require GitHub/S1/origin/runtime exact-SHA, clean S1, healthy runtime and `FULLY_ALIGNED`.
- [ ] Create the Phase 1 governed checkpoint. If any condition fails, stop Phase 2.

## Phase 2 — AfricaFunds data mapping

### Task 5: Re-observe and branch from the attested Phase 1 main

- [ ] Reconcile all authorities, task/session revisions, locks and Work Queue.
- [ ] Re-observe both GitHub repository heads and both S2 checkouts without mutation.
- [ ] Confirm historical vhost classifications and current domain/runtime evidence.
- [ ] Create a separate Phase 2 branch from the exact attested Phase 1 merge SHA.

### Task 6: Write RED mapping tests

- [ ] Assert one `CS-AFRICAFUNDS-001` / `chainsolutions.africafunds` project.
- [ ] Assert exactly two current repository components and paths.
- [ ] Assert `allowedAccess=read`, `deployEnabled=false` and all sensitive V2 capabilities false.
- [ ] Assert independent `API_SHA`, `FRONTEND_SHA`, `SUIVI_CHECKPOINT`, `PRODUCTION_ATTESTATION` state fields.
- [ ] Assert both historical vhosts have `repositoryId=null`, `current=false`, `deploymentSource=false`.
- [ ] Assert dry-run validation/idempotence and no tool-contract regression.
- [ ] Run focused tests and record intended RED.

### Task 7: Implement and deliver Phase 2

- [ ] Add only the approved records to the existing registry authority.
- [ ] Reconcile `MCP_FUNCTIONAL_CARTOGRAPHY.md`, `docs/MCP_WRITE_TOOLS.md` and affected canonical documents without creating a parallel roadmap.
- [ ] Run focused then full GREEN/non-regression gates.
- [ ] Review and deliver through a separate exact-head PR.
- [ ] Attest exact GitHub/S1/runtime SHA, healthy runtime, clean S1 and `FULLY_ALIGNED`.

## Closure

- [ ] Create the final governed checkpoint with both phase PRs, SHAs, tests, deployment and Live State evidence.
- [ ] Transition `TASK-20260910-001` to `DONE` only after exact-SHA attestation.
- [ ] Release both existing locks, close the governed session and reconcile the Work Queue.
- [ ] Continue only with the next genuinely executable governed work; the separate SSH transport capability must be reconciled in its own future slot/task.
