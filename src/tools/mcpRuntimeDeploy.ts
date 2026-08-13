const MCP_ROOT = '/opt/apps/wealthtech-mcp-ssh-bridge';
const MCP_CONTAINER = 'wealthtech_mcp_ssh_bridge';

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'"'"'`)}'`;
}

export function buildMcpRestartCommand(): string {
  return `set -euo pipefail
cd ${shellQuote(MCP_ROOT)}
MCP_GIT_REVISION="$(git rev-parse HEAD)"
export MCP_GIT_REVISION
wait_for_health() {
  local attempt=0
  while [ "$attempt" -lt 20 ]; do
    if curl --fail --silent --show-error --max-time 5 http://127.0.0.1:8787/health; then
      return 0
    fi
    attempt=$((attempt + 1))
    if [ "$attempt" -lt 20 ]; then sleep 2; fi
  done
  return 1
}

docker compose up -d --build --force-recreate
docker ps --filter name=${MCP_CONTAINER} --format "table {{.Names}}\\t{{.Status}}\\t{{.Ports}}"
wait_for_health`;
}
