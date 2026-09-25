#!/usr/bin/env bash
set -euo pipefail

REPOSITORY="${1:-}"
ORIGINAL="${SSH_ORIGINAL_COMMAND:-}"

case "$REPOSITORY" in
  *"/"*) ;;
  *) printf '%s\n' 'repository_ssh_gateway_invalid_repository' >&2; exit 64 ;;
esac

case "$ORIGINAL" in
  ping|project-context|list-domains-s1|list-domains-s2|docker-status-s1|docker-status-s2|write-tools-context) ;;
  *) printf '%s\n' 'repository_ssh_command_not_allowed' >&2; exit 65 ;;
esac

cd /opt/apps/wealthtech-mcp-ssh-bridge
exec node dist/ssh/repositoryGatewayCli.js "$REPOSITORY" "$ORIGINAL"
