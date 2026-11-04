# UTL reconciliation — offline evidence database (PR #372)

## Purpose and authority

This branch contains a reproducible **read-only SQLite analytical reconciliation**, anchored to historical PR [#370](https://github.com/Patricked-code/MCP/pull/370) and [#371](https://github.com/Patricked-code/MCP/pull/371). It is **not** an additional MCP operational registry, Task Queue, GitRegistry, lock/session/claim authority, pipeline or deployment mechanism. It neither opens tasks nor grants write privileges.

**Historical cutoff:** 2026-11-03, GitHub main `05dbb66ed81aa4e7443655c89d10c0c390ff0f10`. Newer branches, unmerged PRs and unreachable commits are not part of this historical baseline. Sources are frozen copies of five files, pinned to their original Git blob SHA in `source_manifest_and_links.json`. No API token or network is required for reconstruction.

## Rebuild and validate

From repository root, Python 3.10+ (stdlib only):

```bash
python3 -m unittest discover -s tests -p 'test_utl_reconciliation.py' -v
python3 scripts/build_utl_reconciliation.py \
  --out /tmp/mcp-utl-reconciliation.sqlite \
  --report /tmp/mcp-utl-reconciliation-report.json
```

The existing **MCP CI** pipeline runs these checks and uploads the rebuilt SQLite and JSON report as the `mcp-utl-reconciliation` artifact. It will not overwrite an existing SQLite output. It only reads version-controlled snapshots and writes to its explicit output path.

Input files:
- PR #370 merged-PR CSV (`PR370_MERGED_PRS_20261103.csv`);
- PR #371 merged-PR, CI, governed-deploy, historical-runtime SQL;
- PR #371 all-main-commits SQL partitions P01/P02 (including parent SHA lists);
- PR #371 completeness manifest (counts, bounds and classification).

All five inputs are byte-pinned by original Git blob SHA. A digest mismatch or disagreement of the 186 PR records, SHA, timestamps or sequence stops the build. All 2,151 main-reachable Git commits, the 186 known merge SHA, and CI/deploy counts are checked; `PRAGMA integrity_check` and `foreign_key_check` must pass.

## Database model

Preserved historical tables from PR #371:
`registry_metadata`, `merged_prs`, `workflow_evidence`, `runtime_evidence`, `main_commits`, and original views.

Analytical UTL overlay:
`utl_source_documents`, `utl_mandates`, `utl_work_items`, `utl_circuits`, `utl_item_circuits`, `utl_continuities`, `utl_item_continuities`, `utl_pr_links`, `utl_runtime_observations`, `utl_reconciliation_runs`, `utl_candidate_refs`, and views `v_utl_pr_reconciliation`, `v_utl_work_history`, `v_utl_evidence_gaps`.

The curated work-item links are intentionally narrow:
- PR #261 → task `TB-W3-F-03` (direct PR title witness);
- PR #355 → work `GD-U-01` (direct PR title witness);
- PR #360 → pilot `PILOT-E2-01`, Entry E2 and canonical root `MCP-PILOT-E2-01-CONT-20261030-ROOT-01` (PR title + issue #359).

These are **work-item identifiers**, not newly invented canonical UTL IDs. The tool does not assume that every PR maps to a unique UTL or that title matches certify ownership. Identifiers mentioned elsewhere in commit and PR titles are stored as `CANDIDATE_ONLY`, not authoritative links. The remaining PRs are explicitly surfaced as unresolved.

## Queries

```sql
SELECT * FROM v_utl_pr_reconciliation WHERE pr_number=261;
SELECT * FROM v_utl_work_history WHERE work_item_id='PILOT-E2-01';
SELECT * FROM v_utl_evidence_gaps ORDER BY pr_number,gap_type;
SELECT * FROM main_commits WHERE sha_classification='OTHER_MAIN_REACHABLE_COMMIT_PR_ASSOCIATION_NOT_VERIFIED';
SELECT * FROM utl_candidate_refs WHERE work_item_candidate LIKE 'TB-%';
SELECT * FROM utl_runtime_observations ORDER BY observed_at DESC;
```

## Interpretation

- 186 merge SHAs are known from PR API evidence. The other 1,965 main-reachable commits are **NOT** classified as direct pushes: PR association is not verified.
- 185 CI-main runs, 171 Governed Deploy runs (165 success) are matched in the **PR #371 archived GitHub workflow observations**, not re-queried by this offline build.
- Missing workflow evidence means `NOT_FOUND`, not `FAILED`.
- GitHub workflow success is not runtime S1 attestation. Historical runtime evidence stays at its archived provenance level; PR #261 is owner-reported, not independently re-attested.
- The separate MCP live observation on 2026-11-04 confirms that main/runtime then both reported `05dbb66...`; it **does not** attest intermediate historical production deployments.
- Candidate relationships require validation against canonical Issue, PR, GitHub continuity checkpoints, and existing MCP authorities. They never become new runtime Task/Session/Lock claims.

## Completion boundary / next safe enrichment

After CI checks pass, use the existing E2/GD-U registries, issue checkpoints and Governed Deploy receipts to approve further specific UTL/Task/Continuity relationships, without assuming that a shared label is a one-to-one mapping. Update curated mapping with exact source URL and record why the authority is sufficient. Keep source snapshots intact; a fresh historical export requires a new explicit snapshot and regression audit, not silent replacement.
