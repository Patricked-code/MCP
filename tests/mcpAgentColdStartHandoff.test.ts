import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const directive = 'issuecomment-6203867094';
const exactPr300Sha = 'cc31ce12bea236b4cfb31d99ecee700c543f0c17';

test('new agent cold start discovers one existing shared handoff without asserting runtime authority', async () => {
  for (const path of ['README.md', 'AGENTS.md', 'CLAUDE.md', 'docs/governance/README.md']) {
    const source = await readFile(path, 'utf8');
    assert.ok(source.includes(directive), 'missing shared issue checkpoint in ' + path);
  }
  const agents = await readFile('AGENTS.md', 'utf8');
  for (const required of [
    'RESUME_OWNED_FIRST',
    'FIRST_COLLISION_FREE_IN_PROGRAM_ORDER',
    'TB-W4-H-01',
    'TB-W4-K-01',
    'HEAD_MOVED',
    'GITHUB',
    'OIDC',
    'GLOBAL_MCP_COMPLETE'
  ]) {
    assert.ok(agents.includes(required), 'cold-start missing ' + required);
  }
  assert.ok(agents.includes(exactPr300Sha));
  assert.match(agents, /ne prouve aucun claim runtime/i);
  assert.match(agents, /pas.*bus temps réel/i);
  const index = await readFile('docs/governance/README.md', 'utf8');
  assert.ok(index.includes('gwb04-ready-ownership-20261015.json'));
  const matrix = JSON.parse(await readFile('docs/governance/gwb04-ready-ownership-20261015.json', 'utf8'));
  assert.equal(matrix.scope.totalReady, 18);
  assert.equal(matrix.scope.ownershipClaimedByThisReport, 0);
  assert.ok(matrix.readyInExistingProgramOrder.every((x: any) => x.backendRuntimeCertified === false));
});
