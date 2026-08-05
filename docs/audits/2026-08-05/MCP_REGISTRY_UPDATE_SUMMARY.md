# MCP registry update audit - 2026-08-05

Status: audit and documentation only.
No build, restart, deployment, deletion, purge, reset, clean, pull or merge was executed.

## Verified canonical files

- data/github-accounts.json
- data/mcp-git-registry.json
- .mcp/server-map.json
- .mcp/permissions.json
- .mcp/function-cartography.json
- .mcp/identity-policy.json
- .mcp/branch-governance.json

## Verified persistence

docker-compose.yml mounts:

- ./data:/app/data
- ./secrets:/app/secrets
- ./logs:/app/logs
- ./keys:/app/keys:ro

Registry and account data persist independently of the Docker image.
Secrets remain outside Git under /app/secrets.

## Durable GitHub accounts

Configured accounts:

- chainsolutions-wealthtech: target organization
- Patricked-code: source account
- Wealthtechinnovations: secondary account, pending S2 token synchronization

The durable account tools are read-only and do not display tokens.

## Registry v1 limits

- no discovered/proposed/validated/active/suspended status workflow
- no source/target/active repository distinction
- no recorded realpath verification
- no detailed capabilities per mapping
- no registry rollback
- theoretical paths can be created by auto-discovery
- fallback resolution to mcp_bridge exists
- deployEnabled is too coarse
- frontend has no complete administrative CRUD

## Permanent decisions

1. Auto-discovery remains read-only.
2. A discovered repository is never operational automatically.
3. No server path is trusted before explicit verification.
4. No write action is allowed outside an active mapping.
5. Main and master direct push remain forbidden.
6. Deployment is separate from write access.
7. Quarantine is separate from purge.
8. Destructive operations are disabled by default.
9. No GitHub repository is deleted during domain migration.
10. No Plesk root is deleted.
11. No dirty working tree is cleaned before a forensic snapshot.
12. GitHub, S1 Git and Docker runtime parity must all be verified.

## Target workflow

discovered -> proposed -> path_verified -> validated -> active

A mapping may later become suspended or archived without losing history.

## Frontend target

The MCP frontend must manage:

- durable GitHub accounts
- discovered repositories
- proposed mappings
- active mappings
- capabilities
- domain migrations
- audit history
- MCP server status
- ChatGPT app availability
- GitHub connection status

## Next implementation steps

1. GitRegistry v2 schema
2. non-destructive v1 to v2 migration
3. secure frontend CRUD
4. path, realpath, remote and domain verification
5. capabilities per mapping
6. immutable audit events
7. conversation context rehydration
8. domain migration workflow
9. read/write/deploy/destructive separation
10. non-regression tests

## Current state

- MCP connected: yes
- runtime modified by this audit: no
- documentation local: yes
- Git commit: no
- GitHub push: no
