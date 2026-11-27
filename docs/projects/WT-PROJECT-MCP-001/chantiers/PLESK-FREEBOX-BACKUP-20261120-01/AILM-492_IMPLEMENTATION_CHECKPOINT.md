# AILM #492 — First implementation checkpoint

Continuity: PLESK-FREEBOX-BACKUP-20261120-01. Intake: [#492](https://github.com/Patricked-code/MCP/issues/492); automatic discovery [receipt](https://github.com/Patricked-code/MCP/issues/492#issuecomment-7206112014). This file is a work checkpoint, not a continuity index, task, permission, claim, lock, lease or policy admission.

Baseline: main/runtime 776a2713cf22a86b6bccf1849b9554a7cd29aecd, live state 1646, healthy, FULLY_ALIGNED, observed 2026-11-27T00:05Z. Rejoin continuity returned NOT_FOUND / PROJECT_BINDING_NOT_ATTESTED. The owner asked for direct implementation, reuse of existing scripts, locks, governance and continuity. GitHub-first external entry is used for this isolated additive candidate; no production action or runtime task is claimed.

## Increment
- New pure planning module and tests; no command or I/O, no new exposed tool, no production permission.
- Mirrors the first Docker lot's existing capacity guards and protected UTC window; does not replace script guards.
- Resume a verified archive rather than re-export; reconcile ambiguous effects; never promote an observation to authorization.
- Requires fresh authoritative probes and matching plan/receipt digest. A boolean in this internal contract is not itself proof; the eventual adapter must derive it from trusted receipts and live probes, not caller assertions.
- Existing cleanupPlan and S2 leaf quarantine remain unchanged.

## Remaining integration (not delivered by this PR)
Canonical Program Backlog intake convergence and continuity registration, collision ownership, actual capacity probes (including destination), trusted receipt adapter, exact script manifest/version admission, constrained machine identity, noninteractive script variants, durable worker using canonical claims/leases/fencing and locks, native MCP tools and cockpit, isolated real restoration and deployment verification. No existing root password should be stored, no free shell, no global prune, no secret or private operational manifest in Git.

NEXT_ACTION: reconcile intake and continuity through existing authorities; then wire trusted observation and receipt adapters and a bounded executor for the existing backup/restore/retention path. Treat a partial transfer or retention start as reconciliation, never repeat a destructive effect. Do not mark the operational lot done without actual restore and measured cleanup evidence.
