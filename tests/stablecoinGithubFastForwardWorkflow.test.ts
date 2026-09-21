import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const workflow = await readFile(
  new URL('../.github/workflows/stablecoin-fast-forward.yml', import.meta.url),
  'utf8'
);

test('Stablecoin fast-forward is GitHub-authorized, OIDC-only and payload-bounded', () => {
  assert.match(workflow, /issues:\s*[\s\S]*?opened/);
  assert.match(workflow, /MCP_STABLECOIN_FAST_FORWARD_REQUEST/);
  assert.match(workflow, /collaborators\/\$\{REQUEST_ACTOR\}\/permission/);
  assert.match(workflow, /admin\|maintain\|write/);
  assert.match(workflow, /id-token:\s*write/);
  assert.match(workflow, /deploy\/github\/stablecoin\/s2\/fast-forward/);
  assert.match(workflow, /expectedServerSha/);
  assert.match(workflow, /targetSha/);
  assert.match(workflow, /requestId/);
  assert.doesNotMatch(workflow, /command|ssh|private_key|known_hosts/i);
});

test('Stablecoin fast-forward workflow never builds or restarts the application', () => {
  const forbidden = [
    /npm\s+(install|ci|run\s+build)/i,
    /touch\s+tmp\/restart\.txt/i,
    /pm2\s+restart/i,
    /docker\s+compose/i,
    /systemctl\s+restart/i,
    /git\s+reset/i,
    /git\s+rebase/i,
    /git\s+stash/i
  ];
  for (const pattern of forbidden) assert.doesNotMatch(workflow, pattern);
});
