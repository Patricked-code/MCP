import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const docPath = 'docs/governance/agent-historical-continuity-breadcrumbs-20261016.md';
const read = (path: string) => readFile(path, 'utf8');

test('new agents can navigate from both root entrypoints to historical evidence and back to the existing coordination issue', async () => {
  const [root, agents, guide] = await Promise.all([read('README.md'), read('AGENTS.md'), read(docPath)]);
  for (const entry of [root, agents]) {
    assert.ok(entry.includes(docPath), 'root entrypoint must link the history guide');
  }
  assert.match(guide, /INDEX DE NAVIGATION NON AUTORITAIRE/);
  assert.match(guide, /issues\/235/);
  assert.match(guide, /issue #65/);
  assert.match(guide, /SUIVI\.md/);
  assert.match(guide, /NEXT_ACTION/);
  assert.match(guide, /RESUME_OWNED_FIRST/);
  assert.match(guide, /FIRST_COLLISION_FREE_IN_PROGRAM_ORDER/);
  assert.match(guide, /GLOBAL_MCP_COMPLETE/);
});

test('history guide retains source anchors for the historical chain, and gaps cannot vanish by accident', async () => {
  const guide = await read(docPath);
  const required = [
    'architecture-chronology-issue65-20261009.json',
    'gwb02-review-coverage-manifest-20261015.json',
    'gwb03-pr-review-findings-triage-20261015.json',
    'gwb03-pr261-source-policy-evidence-20261015.json',
    'gwb03-pr267-domain-evidence-20261015.json',
    'gwb04-94-blueprint-source-test-trace-20261015.json',
    'gwb04-ready-ownership-20261015.json',
    'governed-audit-continuation-workblock-20261009.json',
    'mcp-priority-convergence-map-20261015.json',
    'program-backlog-convergence.json',
  ];
  for (const file of required) {
    assert.ok(guide.includes(file), 'missing historical source: ' + file);
    JSON.parse(await read('docs/governance/' + file));
  }
  for (const number of [273, 275, 290, 291, 292, 293, 294, 295, 296, 300, 304, 305]) {
    assert.ok(guide.includes('/pull/' + number), 'missing PR milestone ' + number);
  }
  for (const phrase of ['Commentaires sur commits non vérifiés', 'non certifiés', 'Task Queue', 'AUDIT_CONSOLIDATED', 'GLOBAL_MCP_COMPLETE']) {
    assert.ok(guide.toLowerCase().includes(phrase.toLowerCase()), 'missing coverage boundary: ' + phrase);
  }
  const program = JSON.parse(await read('docs/governance/program-backlog-convergence.json'));
  assert.equal(program.taskBlueprints.length, 94);
  const history = JSON.parse(await read('docs/governance/architecture-chronology-issue65-20261009.json'));
  assert.equal(history.kind, 'NON_AUTHORITATIVE_ARCHITECTURE_CHRONOLOGY_AND_HANDOFF_INDEX');
});
