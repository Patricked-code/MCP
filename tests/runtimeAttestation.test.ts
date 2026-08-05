import assert from 'node:assert/strict';
import test from 'node:test';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

process.env.MCP_AUTH_TOKEN ??= 'mcp-unit-test-value-20260805-abcdef';
process.env.S1_HOST ??= '127.0.0.1';
process.env.S1_KEY_PATH ??= '/tmp/mcp-unit-test-s1-key';
process.env.S2_HOST ??= '127.0.0.1';
process.env.S2_KEY_PATH ??= '/tmp/mcp-unit-test-s2-key';

const { assertReadOnlyCommand } = await import('../src/ssh/safety.js');
const {
  MCP_RUNTIME_CONTAINER_NAME,
  buildMcpRuntimeImageAttestationCommand,
  registerRuntimeAttestationReadOnlyTools
} = await import('../src/tools/runtimeAttestation.js');

function captureTools(register: (server: McpServer) => void): Set<string> {
  const names = new Set<string>();
  const fakeServer = {
    tool(name: string) {
      assert.equal(names.has(name), false, `Outil enregistré deux fois : ${name}`);
      names.add(name);
      return undefined;
    }
  } as unknown as McpServer;

  register(fakeServer);
  return names;
}

test('l’attestation cible uniquement le conteneur MCP fixe', () => {
  assert.equal(MCP_RUNTIME_CONTAINER_NAME, 'wealthtech_mcp_ssh_bridge');
  const names = captureTools(registerRuntimeAttestationReadOnlyTools);
  assert.deepEqual([...names], ['mcp_runtime_image_attestation_s1']);
});

test('la commande Docker est compatible avec la politique read-only', () => {
  const command = buildMcpRuntimeImageAttestationCommand();
  assert.doesNotThrow(() => assertReadOnlyCommand(command));
  assert.match(command, /docker inspect --type container/);
  assert.match(command, /docker image inspect/);
  assert.match(command, /wealthtech_mcp_ssh_bridge/);
});

test('chaque inspection Docker utilise une sortie formatée', () => {
  const command = buildMcpRuntimeImageAttestationCommand();
  assert.equal(command.includes('docker inspect --type container "$CONTAINER"'), false);
  assert.equal(command.includes('docker image inspect "$IMAGE_ID"'), false);

  for (const line of command.split('\n').filter((value) => value.includes('docker ') && value.includes('inspect'))) {
    assert.equal(line.includes('--format'), true, `Inspection Docker non formatée : ${line}`);
  }
});

test('la sortie Docker exclut les surfaces sensibles ou non bornées', () => {
  const command = buildMcpRuntimeImageAttestationCommand();
  const forbidden = [
    '.Config.Env',
    '.Mounts',
    '.HostConfig',
    '.NetworkSettings',
    '.Config.Cmd',
    '.Config.Entrypoint',
    '.Path',
    '.Args',
    'docker exec',
    'docker logs',
    'docker stop',
    'docker restart',
    'docker compose',
    'systemctl',
    'pm2',
    'rm ',
    'cp ',
    'tee ',
    'cat '
  ];

  for (const fragment of forbidden) {
    assert.equal(command.includes(fragment), false, `Surface interdite présente : ${fragment}`);
  }

  assert.equal(command.includes('{{json .Config.Labels}}'), false);
  assert.equal(command.includes('{{json .}}'), false);
});

test('les métadonnées de provenance attendues sont explicitement sélectionnées', () => {
  const command = buildMcpRuntimeImageAttestationCommand();
  for (const field of [
    'container_id=',
    'container_created=',
    'container_started_at=',
    'container_status=',
    'container_health=',
    'container_image_ref=',
    'container_image_id=',
    'image_id=',
    'image_created=',
    'image_repo_digests=',
    'image_repo_tags=',
    'org.opencontainers.image.revision',
    'org.opencontainers.image.source',
    'org.opencontainers.image.version'
  ]) {
    assert.equal(command.includes(field), true, `Métadonnée attendue absente : ${field}`);
  }
});
