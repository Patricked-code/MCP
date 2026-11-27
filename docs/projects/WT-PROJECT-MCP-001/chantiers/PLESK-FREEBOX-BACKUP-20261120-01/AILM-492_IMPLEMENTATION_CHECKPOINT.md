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

## Checkpoint 2026-11-27T00:12Z — additive implementation and local evidence

Code head before this checkpoint: 7fb9282c5575344628af463166b7ade44c089373. Added backupReceipt (strict receipt structure/digest, separate offsite/restore, partial retention reconciliation), capacityProbe (bounded fixed df byte/inode commands via existing read-only SSH transport, alias recognition), and their tests. Local copies matched exact Git blob hashes. Local strict TypeScript compile of the three isolated modules and three test files succeeded (the capacity transport used a disabled local signature-compatible shim; unit tests inject observations, no live SSH was attempted). 32/32 tests passed, including negative cases. Real local GNU df output parsed for bytes and inodes. This is not full repository CI, deployed integration, archive verification or server effect. The first local test invocation failed on resolution of .js imports; fixed local compilation harness and reran all tests. Local test output SHA256 b59e983887caccf4c84d168f2fbd4bf20aa3c4c96d790e720c4dc5cc35c3118e.

GitHub branch/file creation succeeded; issue comment and draft PR creation were denied HTTP 403 ("At least one email address must be verified to do that."). No alternate credential was used to bypass that denial. Main, production and existing scripts were not changed. Automatic intake discovery is confirmed; Program Backlog convergence and continuity registration are still not attested.

NEXT_ACTION: resolve GitHub verified-email gate; open the one PR from this existing branch, run full CI, reconcile canonical intake/continuity with existing owners, then implement the authorized server-side script lifecycle/runner and connect trusted probes/receipts under canonical claims and locks. Independently address the interactive authentication and measured destination capacity of the P0 operational lot. Do not execute or remove anything on the basis of these pure projections.

## Increment — exact archive receipt pairing (E2, PR #493)

Parent: `612ad71f78b0f75188cbe424172302e5d35ad70b`. CI #5163 on parent: SUCCESS; main/runtime previously observed aligned on `776a2713cf22a86b6bccf1849b9554a7cd29aecd`. Existing branch only; no new authority, runtime task, server effect or deletion. Added structural cross-receipt comparison: exact plan, mission, checkpoint, counts, encrypted and raw archive hashes/sizes, private destination equality and chronology; rejects independently valid receipts referring to distinct archives. Tests added for positive and negative cases; exact new HEAD CI is required, not yet attested in this commit. No private operational receipt content published.

NEXT_ACTION: verify exact-head CI, then connect authoritative private evidence adapters and reconcile canonical intake/continuity; retain existing script guards and claims/locks. Pair verification is not physical restoration or retention authorization.

## Increment — script revision evidence (AILM-05)

Parent `2b3aaafc79701aa45cd54e932ea19e0806474088`. Existing provisioning revision admission reused for official main and CI; additional exact successful validate check, strict source path, bounded source read, Git blob identity and SHA-256 verification. No source body returned, no arbitrary execution surface and no installation or permission granted. Six new tests. The candidate still needs exact-head CI and must not be used as runtime authorization. Private PRC17A/B script admission and machine execution remain to be integrated through existing authorities.

NEXT_ACTION: exact-head CI; converge intake, then connect admitted script identity and trusted live observations to the existing governed effect path.

## Follow-up — callable AILM and authenticated cockpit (#495)

Exact base `18fede0ee58bf7689ad90c9118033e1332dc2940`; existing mission and intake #492 unchanged. Commits `4fe3d16c28c942fbae38bef996df317efc7b75ec`, `79e5b67d123a587724a62fa6ddf6ff85bf17a7b3`: common read-only service, typed native tool, authenticated console route, bounded probes, existing cleanup planning reused and Docker tag alias counts; no raw script or private receipt exposed. No new queue or runtime effect authority. CI #5176 identified missing generated function cartography; regenerated candidate digest independently matches CI expected digest. Exact new head CI still required. Freebox capacity remains unobserved, no machine identity/transfer/retention/scheduler connected. NEXT_ACTION: verify exact-head CI and runtime callability; then bind trusted private observations and existing script execution authorities. No physical gain or autonomous effects attested.

## Follow-up — native backup automation observation and PRC17 execution contract

PR #495 initial CI #5178 succeeded; CodeQL flagged incomplete case-insensitive HTML escape assertion. Corrected at `95f538a526d8b924c9dc03d7cff561c1427941f3`; CI #5179 and CodeQL SUCCESS. `80ca70ca65a4b48a98e0bfca1d8f65fc0c75b3ca` adds actual fixed read-only observation of the two historical S2 backup timers and a PRC17 operation-specific dispatch contract reusing maintenance planner and exact receipt pair verification. This contract checks fresh server-clock evidence, same plan, lease, task, session, script digest and fencing identity twice and never retries ambiguous submission or claims completion. Trusted production ports for private evidence, machine identity, worker and lease enforcement are not installed; no public write tool registered. No backup/retention effect, no Freebox capacity or disk gain attested. Preserve original PRC17 scripts and their gates. NEXT_ACTION: verify latest exact-head CI and protected merge/deploy, then bind real private evidence and admitted machine execution; no fabricated consent or free shell.
