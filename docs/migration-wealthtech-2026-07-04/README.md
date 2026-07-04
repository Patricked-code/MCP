# WealthTech migration resources - 2026-07-04

This directory is the sanitized entry point for the WealthTech migration resource pack reviewed from the local Codex workspace on 2026-07-04.

## MCP write status

- GitHub MCP connector authenticated as `Patricked-code`.
- GitHub App installation is active on the `Patricked-code` user account.
- Repository write access to `Patricked-code/MCP` is confirmed by this file creation.
- No GitHub organization installation is currently visible from this connector session.

## Local resource read status

Local resources were inventoried and text-extracted before creating this index.

- Total local files processed: 56
- Extraction errors: 0
- Unique SHA-256 payloads: 30
- Duplicate groups detected: document master PDF, aggregated source Markdown, branch deployment CSV, audit archive, audit CSV/TXT folder copies, migration PDFs, Claude recurring task PDF, and complete deliverable ZIP.

## Main themes found

The resources describe a WealthTech consolidation and migration program with these main tracks:

- MCP as a controlled bridge and future GitOps Guardian.
- S1/S2 migration governance with strict protection rules for live domains and services.
- Persistent Loop Engineering memory so AI agents and human operators can resume without restarting analysis.
- Repository, branch, pull request, and deployment alignment between GitHub and server checkouts.
- A target architecture based on a unified WealthTech ecosystem, modular frontend/backend, controlled secrets, audit logs, Docker-first operations, Redis, and future analytics/Kubernetes capacity.

## Immediate integration direction

Recommended next step is to keep this public repository limited to sanitized documentation and MCP code. Raw audit exports, server inventories, ZIPs, PDFs, credentials, IPs, and operational paths should be moved only to a private repository or a protected storage location.

Suggested repository layout for future integration:

```text
docs/migration-wealthtech-2026-07-04/
  README.md
  sanitized-summary.md
  resource-manifest-sanitized.json
  decisions.md
  next-actions.md
```

## Guardrails

- Do not publish secrets or tokens.
- Do not publish raw server inventories to a public repository.
- Do not merge Claude/Codex branches without comparing them against live deployment state.
- Do not treat dirty server worktrees as deployable until audited.
- Keep the current recovery point documented after each significant intervention.
