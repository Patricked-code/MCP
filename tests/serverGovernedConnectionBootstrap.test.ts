import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const SERVER_FILE = new URL('../src/server.ts', import.meta.url);

test('MCP initialize déclenche automatiquement la reprise gouvernée avec l identité authentifiée et le nouveau transport', async () => {
  const source = await readFile(SERVER_FILE, 'utf8');

  assert.match(source, /sessionRequestFromToolExtra/);
  assert.match(source, /autoResumeCompatibleSession/);
  assert.match(source, /repository:\s*['"]Patricked-code\/MCP['"]/);
  assert.match(source, /sessionId:\s*newSessionId/);
  assert.match(source, /authInfo/);
});

test('MCP initialize ne journalise plus explicitement l identifiant de transport brut', async () => {
  const source = await readFile(SERVER_FILE, 'utf8');

  assert.doesNotMatch(
    source,
    /logger\.info\(\{\s*sessionId:\s*newSessionId\s*\},\s*['"]MCP session initialisée['"]\)/
  );
});
