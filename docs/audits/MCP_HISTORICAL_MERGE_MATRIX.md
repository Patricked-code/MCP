# MCP — Historical merge-to-UTL reconciliation matrix

## Controlling context

Repository: `Patricked-code/MCP`; baseline GitHub `main` as of 2026-11-03: `05dbb66ed81aa4e7443655c89d10c0c390ff0f10`.

This audit is **analytical and read-only**. It does not establish current or historical runtime permissions, ownership, or deployment attestation.

## Provenance and reconciliation layers

1. **PR #370**: independent CSV listing 186 PRs merged into main, with GitHub-supplied `merge_commit_sha`, title, date and URLs.
2. **PR #371**: 186 merged PRs, 2,151 commits reachable from main, 185 linked CI-main runs, 171 linked Governed Deploy workflow runs (165 success), plus provenance-aware historical runtime states.
3. **PR #372**: frozen, Git-blob-pinned copies of five source files; SQLite reconstruction; UTL/mandate/task/circuit/continuity relational overlay; source checks, data-quality views, and tests.

The repository retains its original `docs/audits/MCP_MERGE_MATRIX_RECENT_100.csv` solely as an *early working sample*, **not** the exhaustive historical source. The audit replaces its inferences with PR #370/#371 authoritative snapshot identifiers. No commit is assigned a PR merely from a title or date.

## Rebuild

```bash
python3 -m unittest discover -s tests -p 'test_utl_reconciliation.py' -v
python3 scripts/build_utl_reconciliation.py --out /tmp/mcp-utl-reconciliation.sqlite --report /tmp/mcp-utl-reconciliation-report.json
```

The existing MCP CI workflow validates the rebuild and uploads the SQLite database and JSON report when successful. See `docs/audits/UTL_RECONCILIATION_DATABASE.md` for table names, queries and exact semantic boundaries.

## Evidence gaps deliberately visible

- Unverified work-item / UTL links remain `UTL_LINK_UNRESOLVED`; title mentions are candidates only.
- A missing CI or Governed Deploy observation is **not** an execution failure.
- A completed Governed Deploy workflow is **not** proof of the exact historical runtime SHA.
- Among 2,151 main-reachable commits, only 186 are independently matched to PR `merge_commit_sha`; the other 1,965 are not classified as direct pushes.
- Current S1/main alignment is recorded in a separate live-observation table and does not retrospectively attest every old deployment.

## Example with exact source data

PR #261: task `TB-W3-F-03`, Merge SHA `6576b5287f23566684005adf6032734e2ecdea50`, CI main `37817792888`, Governed Deploy `37817792904`. Historical runtime SHA is **owner-reported**, not independently re-attested in the imported archive.

## Governance

No writes to `main` or S1; no second Task Queue, Session/Claim/Lock authority or new production pipeline; no automatic merge. Review the exact PR #372 head, successful CI and applicable governed approvals before any subsequent integration.
