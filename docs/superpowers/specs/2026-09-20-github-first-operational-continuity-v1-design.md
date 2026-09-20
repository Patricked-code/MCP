# GitHub-first Operational Continuity V1

Date: 2026-09-20

## Objective

Allow an authorized agent connected to GitHub to resume and advance MCP work without requiring an interactive MCP/SSH bridge as a bootstrap prerequisite.

This design generalizes the already-proven PRECODE GitHub-first principle into post-integration operational continuity. It does not remove or weaken Operational Memory, Governed Task Queue, Governed Sessions, Bootstrap Receipts, locks, Live State, runtime governance, exact-head CI, review or deploy gates.

## Core rule

`BRIDGE_IS_CAPABILITY_NOT_BOOTSTRAP_PREREQUISITE`.

A GitHub connection is sufficient to start continuity reconstruction and to perform every GitHub-bounded operation that the current GitHub authorization allows.

The system resolves the next bounded operation before deciding whether runtime access is needed.

## Execution modes

### GITHUB_ONLY

Examples:

- read repository authorities and canonical memory;
- inspect main, branches, commits, PRs, reviews and CI;
- create/update a governed work branch;
- implement code/tests/docs on that branch;
- open and review a PR;
- consume GitHub workflow evidence.

No runtime MCP connection is required merely to know where the project is or to continue GitHub work.

### GITHUB_ACTION_READONLY_EVIDENCE

When fresh server evidence is needed and the protected read-only environment is configured, GitHub can request a bounded probe through `.github/workflows/mcp-readonly-evidence.yml`.

The request envelope is exactly:

```json
{
  "schemaVersion": 1,
  "target": "s1",
  "probe": "mcp_git_status",
  "requestId": "bounded-correlation-id"
}
```

Allowed targets: `s1`, `s2`.

Allowed V1 probes:

- `mcp_git_status` on S1;
- `stablecoin_frontend_git_status` on S2;
- `server_disk`;
- `docker_status`.

The workflow is triggered either manually or by a GitHub issue titled exactly `MCP_READONLY_EVIDENCE_REQUEST`. Issue-triggered requests require the GitHub actor to have `write`, `maintain` or `admin` permission on the repository.

The workflow never accepts a shell command from the request.

### RUNTIME_REQUIRED

Runtime capability is still required for operations whose authority or mutation lives only in the runtime layer, including:

- Operational Memory mutation;
- Governed Task/Session/Lock mutation when no GitHub-native equivalent has been explicitly designed and approved;
- server write/deploy/restart operations;
- runtime tool invocation that has no approved GitHub fallback.

Even in this mode, the agent should finish all safe GitHub work before asking for runtime capability.

## Protected environments

The V1 read-only fallback expects separate GitHub Environments:

- `mcp-s1-readonly`
- `mcp-s2-readonly`

Each environment uses the same secret names, with target-specific values:

- `MCP_READONLY_SSH_HOST`
- `MCP_READONLY_SSH_PORT`
- `MCP_READONLY_SSH_USER`
- `MCP_READONLY_SSH_PRIVATE_KEY`
- `MCP_READONLY_SSH_KNOWN_HOSTS`

No secret value is stored in Git.

If an environment or secret is absent, the workflow fails closed. The resolver then treats the fallback as unavailable; it never invents credentials or silently downgrades host verification.

## SSH safety

The transport requires:

- `BatchMode=yes`;
- `IdentitiesOnly=yes`;
- `StrictHostKeyChecking=yes`;
- a protected `known_hosts` file;
- a closed probe catalogue;
- no `eval`, `scp`, `rsync`, arbitrary shell input, server-to-GitHub push, Git mutation, deploy, restart or direct versioned-code edit.

Raw evidence is stored as a short-lived GitHub artifact with a SHA-256 digest in metadata. Issue comments contain only the evidence handle/run identifier, not raw server output.

## Authority model

This feature changes transport selection, not authority ownership.

The following remain authorities in their current scopes:

- GitHub;
- Governed Task Queue;
- Governed Session;
- Bootstrap Receipt;
- Governed Locks;
- Live State;
- runtime.

A GitHub-only bootstrap may defer unavailable runtime authorities. It may not fabricate their state, mutate them, or claim that a runtime gate passed.

## Compatibility

The historical `bootstrapCandidateConnection()` remains valid PRECODE provenance and is not deleted.

The new post-integration resolver `resolveGithubFirstOperationalBootstrap()` reuses the same principle without reusing PRECODE branch-local session semantics.

The existing `MCP Governed Deploy` workflow is unchanged.

The historical PR #85 design intent is absorbed as an existing-first input: direct GitHub Actions SSH remains additive, initially read-only, and never becomes an automatic server-write transport in V1.

## Activation boundary

Merging this V1 is not enough to make read-only SSH evidence operational. The protected GitHub Environments and their secrets must exist.

Until they are configured:

- GitHub bootstrap still works;
- GitHub repository/PR/CI work still proceeds;
- read-only evidence fallback is reported unavailable;
- runtime access is requested only if the current bounded operation actually needs server evidence.

## Non-regression

The following are explicitly forbidden:

- making MCP/bridge connectivity a prerequisite for repository-only work;
- treating fallback evidence as a Governed Session or Bootstrap Receipt;
- treating a GitHub issue as a Task Queue record;
- using the read-only fallback for server writes;
- bypassing exact-head CI/review/merge/deploy gates;
- weakening the existing runtime governance because GitHub connectivity exists.
