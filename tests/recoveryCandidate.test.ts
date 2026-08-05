import assert from 'node:assert/strict';
import test from 'node:test';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

process.env.MCP_AUTH_TOKEN ??= 'mcp-unit-test-value-20260805-abcdef';
process.env.S1_HOST ??= '127.0.0.1';
process.env.S1_KEY_PATH ??= '/tmp/mcp-unit-test-s1-key';
process.env.S2_HOST ??= '127.0.0.1';
process.env.S2_KEY_PATH ??= '/tmp/mcp-unit-test-s2-key';
process.env.ENABLE_WRITE_TOOLS ??= 'false';

const { assertNoCatastrophicCommand } = await import('../src/ssh/writeSafety.js');
const {
  MAX_SAFE_UNTRACKED_BYTES,
  MCP_ACTIVE_ROOT,
  MCP_CANONICAL_REMOTE,
  MCP_RECOVERY_ROOT,
  MIN_RECOVERY_FREE_RESERVE_BYTES,
  buildMcpRecoveryCandidatePreparationCommand,
  registerRecoveryCandidateWriteTools
} = await import('../src/tools/recoveryCandidate.js');

const EXPECTED_SHA = '5c349ef7d20eba128a09bac3d4fcae779a48b3f7';

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

test('la préparation est un outil WRITE unique et explicite', () => {
  const names = captureTools(registerRecoveryCandidateWriteTools);
  assert.deepEqual([...names], ['mcp_prepare_recovery_candidate_s1']);
});

test('un SHA complet est obligatoire', () => {
  assert.throws(
    () => buildMcpRecoveryCandidatePreparationCommand('5c349ef7'),
    /SHA Git complet/
  );
});

test('la commande utilise uniquement les chemins et le remote canoniques', () => {
  const command = buildMcpRecoveryCandidatePreparationCommand(EXPECTED_SHA);
  assert.equal(MCP_ACTIVE_ROOT, '/opt/apps/wealthtech-mcp-ssh-bridge');
  assert.equal(MCP_RECOVERY_ROOT, '/opt/apps/wealthtech-mcp-recovery');
  assert.equal(MCP_CANONICAL_REMOTE, 'https://github.com/Patricked-code/MCP.git');
  assert.equal(command.includes(MCP_ACTIVE_ROOT), true);
  assert.equal(command.includes(MCP_RECOVERY_ROOT), true);
  assert.equal(command.includes(MCP_CANONICAL_REMOTE), true);
  assert.equal(command.includes(EXPECTED_SHA), true);
  assert.match(command, /git ls-remote .* refs\/heads\/main/);
});

test('les racines de récupération symboliques sont refusées', () => {
  const command = buildMcpRecoveryCandidatePreparationCommand(EXPECTED_SHA);
  assert.equal(command.includes('test ! -L "$RECOVERY_ROOT"'), true);
  assert.equal(command.includes('test ! -L "$RECOVERY_ROOT/snapshots"'), true);
  assert.equal(command.includes('test ! -L "$RECOVERY_ROOT/candidates"'), true);
});

test('le snapshot forensique et son manifeste sont obligatoires', () => {
  const command = buildMcpRecoveryCandidatePreparationCommand(EXPECTED_SHA);
  for (const fragment of [
    'status --porcelain=v2 --branch',
    'bundle create',
    'diff --binary HEAD',
    'safe-untracked.list0',
    'safe-untracked.tar.gz',
    'safe-untracked-bytes.txt',
    'available-bytes-before-archive.txt',
    'docker-attestation.txt',
    'SHA256SUMS',
    'manifest_sha256=',
    'chmod -R go-rwx'
  ]) {
    assert.equal(command.includes(fragment), true, `Étape de snapshot absente : ${fragment}`);
  }
});

test('les secrets, archives, dumps et artefacts générés sont exclus', () => {
  const command = buildMcpRecoveryCandidatePreparationCommand(EXPECTED_SHA);
  for (const fragment of [
    '.env',
    'secrets/*',
    'keys/*',
    'node_modules/*',
    'dist/*',
    'build/*',
    'coverage/*',
    'logs/*',
    '*.pem',
    '*.key',
    '*.sql',
    '*.dump',
    '*.sqlite',
    '*.db',
    '*.zip',
    '*.tar',
    '*.tar.gz',
    '*.tgz',
    '*.bak',
    '*.old'
  ]) {
    assert.equal(command.includes(fragment), true, `Exclusion absente : ${fragment}`);
  }
});

test('la taille et la réserve disque sont bornées avant archivage', () => {
  const command = buildMcpRecoveryCandidatePreparationCommand(EXPECTED_SHA);
  assert.equal(MAX_SAFE_UNTRACKED_BYTES, 2_147_483_648);
  assert.equal(MIN_RECOVERY_FREE_RESERVE_BYTES, 1_073_741_824);
  assert.equal(command.includes(`MAX_SAFE_UNTRACKED_BYTES=${MAX_SAFE_UNTRACKED_BYTES}`), true);
  assert.equal(command.includes(`MIN_FREE_RESERVE_BYTES=${MIN_RECOVERY_FREE_RESERVE_BYTES}`), true);
  assert.match(command, /du --bytes --total --files0-from/);
  assert.match(command, /df -PB1/);
  assert.match(command, /exit 24/);
  assert.match(command, /exit 25/);
  assert.ok(command.indexOf('if [ "$SAFE_BYTES" -gt') < command.indexOf('tar -C "$ACTIVE_ROOT"'));
});

test('le clone candidat est indépendant et verrouillé sur le SHA demandé', () => {
  const command = buildMcpRecoveryCandidatePreparationCommand(EXPECTED_SHA);
  assert.match(command, /git -C "\$CANDIDATE_ROOT" init/);
  assert.match(command, /remote add origin "\$CANONICAL_REMOTE"/);
  assert.match(command, /fetch --depth=1 origin main/);
  assert.match(command, /checkout --detach "\$EXPECTED_MAIN_SHA"/);
  assert.match(command, /test -z .*status --porcelain/);
});

test('aucun raccourci destructif ou action de production n’est présent', () => {
  const command = buildMcpRecoveryCandidatePreparationCommand(EXPECTED_SHA);
  assert.doesNotThrow(() => assertNoCatastrophicCommand(command));

  for (const fragment of [
    'git reset',
    'git clean',
    'git stash',
    'git pull',
    'git -C "$ACTIVE_ROOT" checkout',
    'npm install',
    'npm ci',
    'npm run build',
    'docker compose',
    'docker stop',
    'docker restart',
    'systemctl',
    'pm2',
    'rm ',
    'mv '
  ]) {
    assert.equal(command.includes(fragment), false, `Raccourci interdit présent : ${fragment}`);
  }

  assert.equal(command.includes('production_modified=false'), true);
  assert.equal(command.includes('candidate_validated=false'), true);
});

test('l’attestation Docker embarquée reste bornée', () => {
  const command = buildMcpRecoveryCandidatePreparationCommand(EXPECTED_SHA);
  assert.equal(command.includes('.Config.Env'), false);
  assert.equal(command.includes('.Mounts'), false);
  assert.equal(command.includes('.HostConfig'), false);
  assert.equal(command.includes('{{json .Config.Labels}}'), false);
  assert.equal(command.includes('docker logs'), false);
  assert.match(command, /docker inspect --type container --format/);
  assert.match(command, /docker image inspect --format/);
});
