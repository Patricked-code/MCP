import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const SERVER_FILE = new URL('../src/server.ts', import.meta.url);
const SESSION_TOOLS_FILE = new URL('../src/tools/governedSessions.ts', import.meta.url);

test('MCP initialize conserve un transport authentifié sans sélectionner de session gouvernée', async () => {
  const source = await readFile(SERVER_FILE, 'utf8');

  assert.match(source, /onsessioninitialized:\s*\(newSessionId: string\)\s*=>\s*\{/);
  assert.match(source, /transports\[newSessionId\]\s*=\s*transport/);
  assert.doesNotMatch(source, /autoResumeGovernedSessionForTransport/);
  assert.doesNotMatch(source, /autoResumeCompatibleSession/);
  assert.doesNotMatch(source, /sessionRequestFromToolExtra/);
});

test('MCP initialize ne journalise pas l identifiant de transport brut', async () => {
  const source = await readFile(SERVER_FILE, 'utf8');

  assert.doesNotMatch(
    source,
    /logger\.info\(\{\s*sessionId:\s*newSessionId\s*\},\s*['"]MCP session initialisée['"]\)/
  );
  assert.match(source, /reasonCode:\s*['"]mcp_transport_initialized_unbound['"]/);
});

test('les requêtes HTTP ne dépendent plus d un rattachement gouverné implicite', async () => {
  const source = await readFile(SERVER_FILE, 'utf8');

  assert.doesNotMatch(source, /transportBootstraps/);
  assert.match(source, /await\s+transport\.handleRequest\(req,\s*res,\s*req\.body\)/);
  assert.match(source, /await\s+transports\[sessionId\]\.handleRequest\(req,\s*res\)/);
  assert.match(source, /sessions\.unbindTransport\(transport\.sessionId\)/);
});

test('ouverture et reprise gouvernées restent disponibles uniquement sur appel explicite', async () => {
  const source = await readFile(SERVER_FILE, 'utf8');
  const tools = await readFile(SESSION_TOOLS_FILE, 'utf8');

  assert.match(tools, /mcp_open_governed_session/);
  assert.match(tools, /mcp_resume_governed_session/);
  assert.match(source, /mcp_open_governed_session/);
  assert.match(source, /mcp_resume_governed_session/);
  assert.doesNotMatch(source, /governed_session_auto_attached|governed_session_auto_resumed/);
});
