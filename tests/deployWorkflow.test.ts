import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const WORKFLOW = new URL('../.github/workflows/mcp-deploy.yml', import.meta.url);
const POLICY = new URL('../.mcp/autodeploy-policy.json', import.meta.url);

async function workflowSource(): Promise<string> {
  return readFile(WORKFLOW, 'utf8');
}

async function policy(): Promise<{ schemaVersion?: unknown; pushEnabled?: unknown }> {
  return JSON.parse(await readFile(POLICY, 'utf8')) as { schemaVersion?: unknown; pushEnabled?: unknown };
}

test('la politique bootstrap est versionnée et désactive le push automatique initial', async () => {
  assert.deepEqual(await policy(), { schemaVersion: 1, pushEnabled: false });
});

test('le workflow possède uniquement les permissions minimales OIDC + lecture', async () => {
  const source = await workflowSource();

  assert.match(source, /permissions:\s*\n\s+contents:\s*read\s*\n\s+id-token:\s*write/);
  assert.doesNotMatch(source, /contents:\s*write|packages:\s*write|actions:\s*write|pull-requests:\s*write|issues:\s*write/);
  assert.match(source, /actions\/checkout@v4/);
  assert.match(source, /persist-credentials:\s*false/);
});

test('workflow_dispatch est toujours disponible et push main est gouverné par la politique versionnée', async () => {
  const source = await workflowSource();

  assert.match(source, /workflow_dispatch:/);
  assert.match(source, /push:\s*\n\s+branches:\s*\n\s+- main/);
  assert.match(source, /\.mcp\/autodeploy-policy\.json/);
  assert.match(source, /GITHUB_EVENT_NAME/);
  assert.match(source, /workflow_dispatch/);
  assert.match(source, /pushEnabled/);
  assert.match(source, /if:\s*steps\.gate\.outputs\.enabled == 'true'/);
});

test('le workflow demande un OIDC GitHub frais avec audience fixe sans secret SSH', async () => {
  const source = await workflowSource();

  assert.match(source, /ACTIONS_ID_TOKEN_REQUEST_URL/);
  assert.match(source, /ACTIONS_ID_TOKEN_REQUEST_TOKEN/);
  assert.match(source, /https:\/\/mcp\.wealthtechinnovations\.com\/deploy\/github\/s1/);
  assert.match(source, /get_oidc\(\)/);
  assert.match(source, /::add-mask::/);
  assert.doesNotMatch(source, /secrets\.|ssh\s|scp\s|id_rsa|private[_ -]?key/i);
});

test('le démarrage lie exactement GITHUB_SHA et GITHUB_RUN_ID au job attendu', async () => {
  const source = await workflowSource();

  assert.match(source, /GITHUB_SHA/);
  assert.match(source, /GITHUB_RUN_ID/);
  assert.match(source, /\/deploy\/github\/s1\/start/);
  assert.match(source, /requestedSha/);
  assert.match(source, /mcp-s1-/);
  assert.match(source, /slice\(0,\s*12\)/);
  assert.doesNotMatch(source, /git rev-parse HEAD|github\.event\.after/);
});

test('le polling redemande un OIDC à chaque tentative et est strictement borné', async () => {
  const source = await workflowSource();

  assert.match(source, /for attempt in \$\(seq 1 60\)/);
  assert.match(source, /sleep 10/);
  const loopIndex = source.indexOf('for attempt in $(seq 1 60)');
  assert.ok(loopIndex >= 0);
  const loop = source.slice(loopIndex);
  assert.match(loop, /OIDC_TOKEN="\$\(get_oidc\)"/);
  assert.match(loop, /\/deploy\/github\/s1\/status\//);
});

test('le succès exige attestation exacte du SHA et tous les contrôles runtime', async () => {
  const source = await workflowSource();

  assert.match(source, /runtimeRevision/);
  assert.match(source, /healthOk/);
  assert.match(source, /oauthOk/);
  assert.match(source, /mcpAuthOk/);
  assert.match(source, /rollbackStatus/);
  assert.match(source, /attested/);
  assert.match(source, /GITHUB_SHA/);
  assert.match(source, /process\.exit\(1\)/);
});

test('le workflow est borné globalement et ne journalise pas les réponses OIDC', async () => {
  const source = await workflowSource();

  assert.match(source, /timeout-minutes:\s*15/);
  assert.match(source, /--max-time\s+10/);
  assert.doesNotMatch(source, /set -x|echo\s+\$OIDC_TOKEN|printenv/);
});
