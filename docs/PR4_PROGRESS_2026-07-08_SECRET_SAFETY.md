# PR4_PROGRESS_2026-07-08_SECRET_SAFETY.md

Repository: `Patricked-code/MCP`
PR: `#4 Add controlled GitHub MCP tools`
Branch: `mcp/github-tools-implementation`
Base: `mcp/migration-governance-setup`

## Status

This file records the next direct continuation step after the first static review checkpoint.

PR #4 remains open, draft and unmerged. It remains a technical child PR for PR #1.

## Work completed in this step

### 1. Error class isolation

Created:

- `src/github/errors.ts`

Purpose:

- isolate `GitHubToolError` outside `mcpTools.ts`;
- avoid a circular dependency between `mcpTools.ts` and the secret-safety module;
- keep `GitHubToolError` re-exported by `mcpTools.ts` for existing tests and consumers.

### 2. Secret-safety module wired into GitHub MCP writes

Updated:

- `src/github/secretSafety.ts`
- `src/github/mcpTools.ts`

Purpose:

- reject unsafe commit messages before GitHub write calls;
- reject unsafe pull request titles and bodies before PR creation;
- reject unsafe file contents before blob creation;
- reject additional sensitive filenames and paths;
- use a shared signal detector for audit metadata redaction.

### 3. Tests expanded

Updated:

- `tests/githubMcpTools.test.ts`

New test coverage includes:

- branch scope validation;
- unsafe path validation;
- sensitive filename rejection;
- sensitive content rejection before API writes;
- commit message safety checks;
- pull request title/body safety checks;
- public-safe error formatting;
- audit metadata redaction.

### 4. Documentation updated

Updated:

- `docs/MCP_TOOLS.md`

The documentation now states that secret-safety is integrated into the controlled GitHub write helpers.

## Current PR metadata snapshot

At the time of this progress note:

- PR #4 is open.
- PR #4 is draft.
- PR #4 is not merged.
- PR #4 is mergeable according to the GitHub connector.
- Head branch: `mcp/github-tools-implementation`.
- Base branch: `mcp/migration-governance-setup`.
- Head SHA observed: `96032a9858ee5f97a8550f2a968cfa7d59bf7421`.
- Compared with base, the branch is ahead by 14 commits and behind by 0.

## Validation still required

These checks still need to run in a real checkout with dependencies installed:

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

No workflow run or combined status check was found for the current head SHA through the connector at this step.

## Do not do yet

- Do not merge PR #4.
- Do not merge PR #1.
- Do not close issue #2.
- Do not close issue #3.
- Do not deploy.
- Do not run server cleanup.
- Do not run migration.
- Do not change vhosts.
- Do not stop production services.

## Next action

Continue with a registration and runtime-readiness review:

1. inspect `src/tools/readOnly.ts` registration of read-only GitHub tools;
2. inspect `src/tools/writeScoped.ts` registration and gating of scoped-write GitHub tools;
3. verify that write tools remain gated by `ENABLE_WRITE_TOOLS`;
4. prepare the next checkpoint for runtime `tools/list` validation once build/typecheck has passed;
5. keep PR #4 draft.
