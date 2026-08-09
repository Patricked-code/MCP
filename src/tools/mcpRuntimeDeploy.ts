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
docker compose up -d --build
sleep 5
docker ps --filter name=${MCP_CONTAINER} --format "table {{.Names}}\\t{{.Status}}\\t{{.Ports}}"
curl -s http://127.0.0.1:8787/health || true`;
}
