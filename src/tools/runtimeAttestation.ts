import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { runReadOnlyCommand } from '../ssh/client.js';
import { asText, commandResultToText } from './format.js';

export const MCP_RUNTIME_CONTAINER_NAME = 'wealthtech_mcp_ssh_bridge';

const safeContainerLabelKeys = [
  'com.docker.compose.project',
  'com.docker.compose.service',
  'com.docker.compose.version',
  'org.opencontainers.image.created',
  'org.opencontainers.image.revision',
  'org.opencontainers.image.source',
  'org.opencontainers.image.version'
] as const;

function labelFormat(scope: 'container' | 'image', key: string): string {
  const prefix = scope === 'container' ? 'container_label' : 'image_label';
  return `printf '${prefix}.${key}=%s\\n' "$(docker ${scope === 'container' ? 'inspect --type container' : 'image inspect'} --format '{{index .Config.Labels \"${key}\"}}' "$${scope === 'container' ? 'CONTAINER' : 'IMAGE_ID'}")"`;
}

export function buildMcpRuntimeImageAttestationCommand(): string {
  const containerLabels = safeContainerLabelKeys.map((key) => labelFormat('container', key)).join('\n');
  const imageLabels = safeContainerLabelKeys.map((key) => labelFormat('image', key)).join('\n');

  return `set -euo pipefail
CONTAINER='${MCP_RUNTIME_CONTAINER_NAME}'

docker inspect --type container --format '{{.Id}}' "$CONTAINER" >/dev/null
CONTAINER_ID="$(docker inspect --type container --format '{{.Id}}' "$CONTAINER")"
IMAGE_ID="$(docker inspect --type container --format '{{.Image}}' "$CONTAINER")"

printf 'container_name=%s\\n' "$(docker inspect --type container --format '{{.Name}}' "$CONTAINER")"
printf 'container_id=%s\\n' "$CONTAINER_ID"
printf 'container_created=%s\\n' "$(docker inspect --type container --format '{{.Created}}' "$CONTAINER")"
printf 'container_started_at=%s\\n' "$(docker inspect --type container --format '{{.State.StartedAt}}' "$CONTAINER")"
printf 'container_status=%s\\n' "$(docker inspect --type container --format '{{.State.Status}}' "$CONTAINER")"
printf 'container_health=%s\\n' "$(docker inspect --type container --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "$CONTAINER")"
printf 'container_image_ref=%s\\n' "$(docker inspect --type container --format '{{.Config.Image}}' "$CONTAINER")"
printf 'container_image_id=%s\\n' "$IMAGE_ID"
${containerLabels}

docker image inspect --format '{{.Id}}' "$IMAGE_ID" >/dev/null
printf 'image_id=%s\\n' "$(docker image inspect --format '{{.Id}}' "$IMAGE_ID")"
printf 'image_created=%s\\n' "$(docker image inspect --format '{{.Created}}' "$IMAGE_ID")"
printf 'image_repo_digests=%s\\n' "$(docker image inspect --format '{{json .RepoDigests}}' "$IMAGE_ID")"
printf 'image_repo_tags=%s\\n' "$(docker image inspect --format '{{json .RepoTags}}' "$IMAGE_ID")"
${imageLabels}`;
}

export function registerRuntimeAttestationReadOnlyTools(server: McpServer): void {
  server.tool(
    'mcp_runtime_image_attestation_s1',
    'Retourne une attestation bornée du conteneur et de son image Docker active sur S1, sans environnement, mounts, commandes, réseaux ni labels arbitraires.',
    {},
    async () => {
      const result = await runReadOnlyCommand('s1', buildMcpRuntimeImageAttestationCommand());
      return asText(commandResultToText(result));
    }
  );
}
