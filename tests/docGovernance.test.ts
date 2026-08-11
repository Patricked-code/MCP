import assert from 'node:assert/strict';
import test from 'node:test';

import {
  classifyMarkdownPath,
  compareMarkdownInventory,
  extractCanonicalState,
  validateCanonicalStates,
  validateRequiredCanonicalStates,
  validateMarkdownBaseline
} from '../scripts/doc-governance-lib.mjs';

const canonical = {
  repository: 'Patricked-code/MCP',
  branch: 'main',
  s1Root: '/opt/apps/wealthtech-mcp-ssh-bridge',
  fetchRemote: 'git@github.com-mcp-patricked-ro:Patricked-code/MCP.git',
  pushRemote: 'disabled://mcp-s1-read-only',
  container: 'wealthtech_mcp_ssh_bridge'
};

test('chaque chemin Markdown reçoit une catégorie gouvernée déterministe', () => {
  assert.equal(classifyMarkdownPath('SUIVI.md'), 'canonical');
  assert.equal(classifyMarkdownPath('TASKS.md'), 'canonical');
  assert.equal(classifyMarkdownPath('docs/history/OLD.md'), 'history');
  assert.equal(classifyMarkdownPath('docs/superpowers/plans/plan.md'), 'engineering-plan');
  assert.equal(classifyMarkdownPath('docs/SECURITY.md'), 'documentation');
  assert.equal(classifyMarkdownPath('Migration/archive/note.md'), 'migration-history');
  assert.equal(classifyMarkdownPath('memory/README.md'), 'memory');
  assert.equal(classifyMarkdownPath('wealthtech_project_memory/memory/README.md'), 'runtime-mirror-tracked');
  assert.equal(classifyMarkdownPath('vendor/unknown.md'), null);
});

test('l’inventaire exact signale ajouts, disparitions et chemins non classifiés', () => {
  const expected = ['SUIVI.md', 'TASKS.md', 'docs/SECURITY.md'];
  const actual = ['SUIVI.md', 'docs/SECURITY.md', 'vendor/unknown.md'];
  const result = compareMarkdownInventory(expected, actual);

  assert.deepEqual(result.missing, ['TASKS.md']);
  assert.deepEqual(result.added, ['vendor/unknown.md']);
  assert.deepEqual(result.unclassified, ['vendor/unknown.md']);
  assert.equal(result.ok, false);
});

test('un inventaire identique et entièrement classifié est valide', () => {
  const paths = ['SUIVI.md', 'TASKS.md', 'docs/SECURITY.md'];
  const result = compareMarkdownInventory(paths, paths);
  assert.equal(result.ok, true);
  assert.deepEqual(result.missing, []);
  assert.deepEqual(result.added, []);
  assert.deepEqual(result.unclassified, []);
});

test('la baseline refuse une catégorie différente de la classification déterministe', () => {
  const result = validateMarkdownBaseline(
    [
      { path: 'SUIVI.md', category: 'root-documentation' },
      { path: 'docs/SECURITY.md', category: 'documentation' }
    ],
    ['SUIVI.md', 'docs/SECURITY.md']
  );

  assert.equal(result.ok, false);
  assert.deepEqual(result.categoryDrift, [
    { path: 'SUIVI.md', expected: 'root-documentation', actual: 'canonical' }
  ]);
});

test('canonical-state extrait un objet JSON borné', () => {
  const markdown = `# Etat\n\n\`\`\`canonical-state\n${JSON.stringify(canonical, null, 2)}\n\`\`\`\n`;
  assert.deepEqual(extractCanonicalState(markdown), canonical);
});

test('les documents actifs doivent publier exactement le même canonical-state', () => {
  const result = validateCanonicalStates([
    { path: 'SUIVI.md', state: canonical },
    { path: 'TASKS.md', state: canonical },
    { path: 'DEPLOYMENT_PRODUCTION.md', state: canonical }
  ]);
  assert.equal(result.ok, true);
  assert.deepEqual(result.conflicts, []);
});

test('une contradiction sémantique est refusée et attribuée au document fautif', () => {
  const result = validateCanonicalStates([
    { path: 'SUIVI.md', state: canonical },
    { path: 'TASKS.md', state: { ...canonical, branch: 'legacy' } }
  ]);

  assert.equal(result.ok, false);
  assert.deepEqual(result.conflicts, [
    { path: 'TASKS.md', key: 'branch', expected: 'main', actual: 'legacy' }
  ]);
});

test('les autorités sémantiques manquantes ou sans canonical-state sont refusées', () => {
  const required = [
    'SUIVI.md',
    'TASKS.md',
    'TODO.md',
    'DEPLOYMENT_PRODUCTION.md',
    'MCP_ANTI_DISPERSION_GOVERNANCE.md'
  ];
  const result = validateRequiredCanonicalStates(required, [
    { path: 'SUIVI.md', state: canonical },
    { path: 'TASKS.md', state: canonical },
    { path: 'TODO.md', state: null },
    { path: 'DEPLOYMENT_PRODUCTION.md', state: canonical }
  ]);

  assert.equal(result.ok, false);
  assert.deepEqual(result.missing, ['MCP_ANTI_DISPERSION_GOVERNANCE.md']);
  assert.deepEqual(result.withoutState, ['TODO.md']);
});

test('les cinq autorités présentes et cohérentes sont valides', () => {
  const required = [
    'SUIVI.md',
    'TASKS.md',
    'TODO.md',
    'DEPLOYMENT_PRODUCTION.md',
    'MCP_ANTI_DISPERSION_GOVERNANCE.md'
  ];
  const result = validateRequiredCanonicalStates(
    required,
    required.map((path) => ({ path, state: canonical }))
  );

  assert.equal(result.ok, true);
  assert.deepEqual(result.missing, []);
  assert.deepEqual(result.withoutState, []);
  assert.deepEqual(result.conflicts, []);
});
