import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { captureToolContracts, type CapturedToolContract } from './helpers/captureToolContracts.js';

process.env.MCP_AUTH_TOKEN ??= 'mcp-unit-test-value-20260805-abcdef';
process.env.S1_HOST ??= '127.0.0.1';
process.env.S1_KEY_PATH ??= '/tmp/mcp-unit-test-s1-key';
process.env.S2_HOST ??= '127.0.0.1';
process.env.S2_KEY_PATH ??= '/tmp/mcp-unit-test-s2-key';
process.env.ENABLE_WRITE_TOOLS ??= 'false';

const { registerReadOnlyTools } = await import('../src/tools/readOnly.js');
const { registerScopedWriteTools } = await import('../src/tools/writeScoped.js');

type ToolContracts = Record<string, CapturedToolContract>;

test('les noms, descriptions et schémas des outils historiques restent compatibles', async () => {
  const fixture = JSON.parse(
    await readFile('tests/fixtures/existing-tool-contracts-v1.json', 'utf8')
  ) as ToolContracts;
  const actual = {
    ...captureToolContracts(registerReadOnlyTools),
    ...captureToolContracts(registerScopedWriteTools)
  };

  assert.ok(Object.keys(fixture).length > 0, 'Le fixture historique ne doit pas être vide.');
  for (const [name, expectedContract] of Object.entries(fixture)) {
    assert.ok(actual[name], `Outil historique supprimé ou renommé : ${name}`);
    assert.deepEqual(actual[name], expectedContract, `Contrat historique modifié : ${name}`);
  }
});
