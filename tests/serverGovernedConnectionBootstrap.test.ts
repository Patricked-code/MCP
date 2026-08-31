import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const SERVER_FILE = new URL('../src/server.ts', import.meta.url);

test('MCP initialize déclenche automatiquement la reprise gouvernée avec l identité authentifiée et le nouveau transport', async () => {
  const source = await readFile(SERVER_FILE, 'utf8');

  assert.match(source, /sessionRequestFromToolExtra/);
  assert.match(source, /autoResumeCompatibleSession/);
  assert.match(source, /repository:\s*['"]Patricked-code\/MCP['"]/);
  assert.match(source, /autoResumeGovernedSessionForTransport\(newSessionId,\s*authInfo\)/);
  assert.match(source, /sessionRequestFromToolExtra\(\{\s*sessionId:\s*transportSessionId,\s*authInfo\s*\}\)/s);
});

test('MCP initialize ne journalise plus explicitement l identifiant de transport brut', async () => {
  const source = await readFile(SERVER_FILE, 'utf8');

  assert.doesNotMatch(
    source,
    /logger\.info\(\{\s*sessionId:\s*newSessionId\s*\},\s*['"]MCP session initialisée['"]\)/
  );
});

test('les requêtes suivantes attendent la tentative de binding gouverné du transport', async () => {
  const source = await readFile(SERVER_FILE, 'utf8');

  assert.match(source, /transportBootstraps/);
  assert.match(source, /transportBootstraps\[newSessionId\]\s*=/);
  assert.match(source, /await\s+transportBootstraps\[sessionId\]/);
  assert.match(source, /delete\s+transportBootstraps\[transport\.sessionId\]/);
});

test('MCP initialize distingue une attache éphémère sans révision d une reprise durable', async () => {
  const source = await readFile(SERVER_FILE, 'utf8');

  assert.match(source, /result\.status\s*===\s*['"]ATTACHED['"]/);
  assert.match(source, /governed_session_auto_attached/);
});
