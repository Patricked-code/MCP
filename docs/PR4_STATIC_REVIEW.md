# PR4_STATIC_REVIEW.md — Static review checkpoint

Date: 2026-07-08
Repository: `Patricked-code/MCP`
Pull request: `#4 Add controlled GitHub MCP tools`
Branch: `mcp/github-tools-implementation`
Base branch: `mcp/migration-governance-setup`

## Purpose

This checkpoint records the direct static review performed after adding controlled GitHub MCP tools. It is intentionally public-safe: no token, secret, `.env`, private server inventory, raw production log, dump, or private key is included.

## Files inspected

- `src/github/mcpTools.ts`
- `src/tools/readOnly.ts`
- `src/tools/writeScoped.ts`
- `tests/githubMcpTools.test.ts`
- `docs/MCP_TOOLS.md`

## Current PR state

- PR is open.
- PR remains draft.
- PR is not merged.
- Base remains `mcp/migration-governance-setup`.
- Head remains `mcp/github-tools-implementation`.
- The PR continues to be a technical child PR for the governance/onboarding PR.

## Confirmed implementation scope

### Read-only GitHub MCP tools

The implementation registers the following read-only tools:

- `github_status`
- `github_list_orgs`
- `github_list_repos`
- `github_repo_status`
- `github_list_prs`
- `github_list_actions`
- `github_audit_permissions`

These tools are intended to return public-safe GitHub state and must not write to GitHub or trigger production operations.

### Scoped-write GitHub MCP tools

The implementation registers the following scoped-write tools behind `ENABLE_WRITE_TOOLS`:

- `github_create_branch`
- `github_commit_files_on_branch`
- `github_open_pr`

These tools are intended to be branch/PR-only tools, limited to controlled `mcp/*` branches.

## Confirmed guardrails from static review

- Direct writes to `main` or `master` are not exposed as a normal workflow.
- Controlled writes require `ENABLE_WRITE_TOOLS`.
- Branch names must match `mcp/*`.
- Paths are rejected when empty, absolute, path-traversing, or containing backslashes.
- Secret-like filenames such as `.env`, private-key extensions and common SSH key names are rejected.
- File count and file size limits are enforced for controlled commits.
- Pull requests default to draft.
- Audit events are written to the MCP/Git registry with metadata redaction.
- Tool errors are returned as public-safe JSON without stack traces.

## Residual hardening items identified

These items do not authorize merge by themselves. They define the next hardening pass before the PR can be considered ready for non-draft review.

### GH-MCP-HARDEN-001 — Add content-level secret scanning before GitHub writes

Current file-path checks block obvious sensitive filenames. The next hardening step should also reject secret-like content in commit messages, PR titles, PR bodies and file contents before data is sent to GitHub.

Minimum patterns to block or redact:

- GitHub classic tokens: `ghp_`, `gho_`, `ghu_`, `ghs_`, `ghr_`
- GitHub fine-grained PATs: `github_pat_`
- private key blocks: `BEGIN RSA PRIVATE KEY`, `BEGIN OPENSSH PRIVATE KEY`, `BEGIN PRIVATE KEY`
- generic bearer-token-like values in user-provided text
- `.env`-style secret assignments such as `TOKEN=`, `SECRET=`, `PASSWORD=`, `PRIVATE_KEY=`

### GH-MCP-HARDEN-002 — Expand sensitive filename deny-list

The current deny-list should be expanded to cover additional common secret paths:

- `.npmrc`
- `.pypirc`
- `.netrc`
- `credentials.json`
- `service-account.json`
- `id_ecdsa`
- `id_dsa`
- `.ssh/config`

### GH-MCP-HARDEN-003 — Add tests for secret-like content rejection

Add tests proving that the commit helper rejects:

- file content containing `github_pat_...`
- file content containing `BEGIN OPENSSH PRIVATE KEY`
- commit message containing a token-like string
- PR title/body containing token-like or private-key-like content

### GH-MCP-HARDEN-004 — Confirm MCP runtime registration after build

After local TypeScript/build validation, confirm through the MCP runtime that `tools/list` includes the new read-only tools and that scoped-write tools appear only when `ENABLE_WRITE_TOOLS=true`.

### GH-MCP-HARDEN-005 — Keep issue #2 open until runtime proof exists

The PR helps unblock GitHub visibility and controlled operations, but it does not by itself resolve the connector/runtime authorization blocker. Issue #2 must remain open until MCP runtime evidence proves that the target organization and repos are visible through MCP tools.

## Required validation before merge

The following commands still need to run in a real checkout with dependencies installed:

```bash
node node_modules/tsx/dist/cli.mjs --test tests/onboarding.test.ts
node node_modules/tsx/dist/cli.mjs --test tests/githubMcpTools.test.ts
node node_modules/typescript/lib/tsc.js --noEmit -p tsconfig.json
node node_modules/typescript/lib/tsc.js -p tsconfig.json
node scripts/check-docs.mjs
node scripts/check-no-secrets.mjs
node scripts/check-public-evidence.mjs
git diff --check
```

## Merge decision

Do not merge PR #4 yet.

The PR must remain draft until:

1. local tests and TypeScript checks pass;
2. the hardening items above are either implemented or explicitly deferred with rationale;
3. MCP runtime `tools/list` confirms correct registration;
4. scoped-write gating is verified with `ENABLE_WRITE_TOOLS=false` and `ENABLE_WRITE_TOOLS=true`;
5. PR #1 and the resume gate remain consistent with blockers #2 and #3.

## Point de reprise

Current next action:

1. Implement the secret-content hardening layer in `src/github/mcpTools.ts`.
2. Extend `tests/githubMcpTools.test.ts` to cover token/private-key-like content.
3. Update `docs/MCP_TOOLS.md` if the deny-list changes.
4. Keep PR #4 draft.
5. Do not merge PR #1 or PR #4.
6. Do not close issue #2 or issue #3.
7. Do not execute production, cleanup, migration, vhost change or service stop.
