import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('the versioned function cartography exactly matches runtime registrations', async () => {
  const result = spawnSync(process.execPath, ['scripts/check-function-cartography.mjs'], {
    cwd: process.cwd(), encoding: 'utf8', env: { ...process.env }
  });
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  const cartography = JSON.parse(await readFile('.mcp/function-cartography.json', 'utf8'));
  assert.equal(cartography.schemaVersion, 2);
  assert.equal(cartography.generatedFrom, 'runtime-registration');
  assert.ok(cartography.registeredToolCount > 92);
  assert.equal(cartography.registeredToolCount, cartography.tools.length);
  assert.equal(cartography.resourceCount, cartography.resources.length);
  assert.match(cartography.catalogueDigest, /^[a-f0-9]{64}$/);
  for (const name of [
    'mcp_get_current_state_inventory', 'mcp_get_work_queue',
    'mcp_reconcile_agent_intent', 'mcp_claim_next_governed_task'
  ]) {
    assert.equal(cartography.tools.some((tool: any) => tool.name === name), true, name);
  }
});
