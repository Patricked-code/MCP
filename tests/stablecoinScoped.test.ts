import assert from 'node:assert/strict';
import test from 'node:test';

process.env.MCP_AUTH_TOKEN ??= 'stablecoin-test-token-0123456789abcdef';
process.env.S1_HOST ??= '127.0.0.1';
process.env.S1_KEY_PATH ??= '/tmp/stablecoin-test-s1-key';
process.env.S2_HOST ??= '127.0.0.1';
process.env.S2_KEY_PATH ??= '/tmp/stablecoin-test-s2-key';

const {
  buildDeployCommand,
  buildGitPullCommand
} = await import('../src/tools/writeScoped.js');

test('Stablecoin S2 sync is fail-closed and fast-forward only', () => {
  const command = buildGitPullCommand('stablecoin_frontend');

  assert.match(command, /stablecoin\.chainsolutions\.fr\/stablecoin/);
  assert.match(command, /git remote get-url github/);
  assert.match(command, /Patricked-code\/Stablecoin\.git/);
  assert.match(command, /test "\$CURRENT_BRANCH" = "main"/);
  assert.match(command, /git ls-remote github refs\/heads\/main/);
  assert.match(command, /git fetch github main/);
  assert.match(command, /git merge --ff-only "\$REMOTE_SHA"/);
  assert.match(command, /git merge-base --is-ancestor/);

  assert.doesNotMatch(command, /git pull --rebase origin/);
  assert.doesNotMatch(command, /git stash/);
  assert.doesNotMatch(command, /git reset --hard/);
});

test('Stablecoin S2 deploy uses documented build and Passenger restart', () => {
  const command = buildDeployCommand('stablecoin_frontend');

  assert.match(command, /NODE_OPTIONS=--openssl-legacy-provider npm run build/);
  assert.match(command, /touch tmp\/restart\.txt/);
  assert.match(command, /https:\/\/stablecoin\.chainsolutions\.fr\//);
  assert.match(command, /https:\/\/stablecoin\.chainsolutions\.fr\/auth\/authentication\//);
  assert.match(command, /https:\/\/stablecoin\.chainsolutions\.fr\/api\/login\//);
  assert.match(command, /LOGIN_CODE/);
  assert.match(command, /rm -f tmp\/restart\.txt/);

  assert.doesNotMatch(command, /pm2 restart/);
  assert.doesNotMatch(command, /docker compose/);
});
