import assert from 'node:assert/strict';
import test from 'node:test';

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import {
  decorateRegistrationCatalogServer,
  getCurrentToolCatalog,
  resetToolCatalogForTests
} from '../src/currentState/toolCatalog.js';

process.env.MCP_AUTH_TOKEN ??= 'mcp-unit-test-value-20260805-abcdef';
process.env.S1_HOST ??= '127.0.0.1';
process.env.S1_KEY_PATH ??= '/tmp/mcp-unit-test-s1-key';
process.env.S2_HOST ??= '127.0.0.1';
process.env.S2_KEY_PATH ??= '/tmp/mcp-unit-test-s2-key';
process.env.ENABLE_WRITE_TOOLS = 'true';
process.env.MCP_GOVERNED_SESSIONS_ENABLED = 'true';

function fakeServer() {
  const returns = {
    tool: { kind: 'legacy-tool-return' },
    registerTool: { kind: 'registered-tool-return' },
    registerResource: { kind: 'registered-resource-return' }
  };
  const calls: Array<{ method: string; args: unknown[] }> = [];
  const server = {
    tool(...args: unknown[]) {
      calls.push({ method: 'tool', args });
      return returns.tool;
    },
    registerTool(...args: unknown[]) {
      calls.push({ method: 'registerTool', args });
      return returns.registerTool;
    },
    registerResource(...args: unknown[]) {
      calls.push({ method: 'registerResource', args });
      return returns.registerResource;
    }
  } as unknown as McpServer;
  return { server, calls, returns };
}

test.beforeEach(() => resetToolCatalogForTests());

test('capture les registrations SDK sans modifier leurs retours et produit un catalogue déterministe', () => {
  const { server, calls, returns } = fakeServer();
  const read = decorateRegistrationCatalogServer(server, 'read');
  const write = decorateRegistrationCatalogServer(server, 'scoped-write');
  const legacyHandler = async () => ({ content: [] });
  const registeredHandler = async () => ({ content: [] });
  const resourceHandler = async () => ({ contents: [] });

  const legacyReturn = read.tool(
    'z_legacy',
    'Legacy read tool',
    { value: z.string().min(1) },
    legacyHandler
  );
  const registeredReturn = write.registerTool(
    'a_registered',
    {
      title: 'Registered write tool',
      description: 'Registered description',
      inputSchema: { count: z.number().int().min(1) },
      annotations: { readOnlyHint: false, destructiveHint: true }
    },
    registeredHandler
  );
  const resourceReturn = read.registerResource(
    'wealthtech-current',
    'mcp://wealthtech/current',
    {
      title: 'Current state',
      description: 'Current resource',
      mimeType: 'application/json',
      annotations: { audience: ['assistant'], priority: 1 }
    },
    resourceHandler
  );

  assert.equal(legacyReturn, returns.tool);
  assert.equal(registeredReturn, returns.registerTool);
  assert.equal(resourceReturn, returns.registerResource);
  assert.deepEqual(calls.map(({ method }) => method), ['tool', 'registerTool', 'registerResource']);
  assert.equal(calls[0]?.args.at(-1), legacyHandler);
  assert.equal(calls[1]?.args.at(-1), registeredHandler);
  assert.equal(calls[2]?.args.at(-1), resourceHandler);

  const first = getCurrentToolCatalog();
  const second = getCurrentToolCatalog();
  assert.deepEqual(first, second);
  assert.equal(first.schemaVersion, 1);
  assert.equal(first.catalogueVersion, 1);
  assert.equal(first.registeredToolCount, 2);
  assert.equal(first.readOnlyToolCount, 1);
  assert.equal(first.writeToolCount, 1);
  assert.equal(first.resourceCount, 1);
  assert.deepEqual(first.tools.map(({ name }) => name), ['a_registered', 'z_legacy']);
  assert.equal(first.tools[0]?.surface, 'scoped-write');
  assert.deepEqual(first.tools[0]?.annotations, {
    readOnlyHint: false,
    destructiveHint: true
  });
  assert.equal(first.tools[1]?.surface, 'read');
  assert.equal(first.tools[1]?.inputSchema.type, 'object');
  assert.match(first.tools[0]?.contractDigest ?? '', /^[0-9a-f]{64}$/);
  assert.match(first.resources[0]?.contractDigest ?? '', /^[0-9a-f]{64}$/);
  assert.match(first.catalogueDigest, /^[0-9a-f]{64}$/);
  assert.deepEqual(first.resources[0], {
    name: 'wealthtech-current',
    uri: 'mcp://wealthtech/current',
    title: 'Current state',
    description: 'Current resource',
    mimeType: 'application/json',
    audience: ['assistant'],
    priority: 1,
    contractDigest: first.resources[0]?.contractDigest
  });
});

test('déduplique un contrat identique et refuse un contrat divergent', () => {
  const { server } = fakeServer();
  const read = decorateRegistrationCatalogServer(server, 'read');
  const handler = async () => ({ content: [] });

  read.tool('same_tool', 'Same', {}, handler);
  read.tool('same_tool', 'Same', {}, handler);
  assert.equal(getCurrentToolCatalog().registeredToolCount, 1);

  assert.throws(
    () => read.tool('same_tool', 'Different', {}, handler),
    /CURRENT_TOOL_CATALOG_CONFLICT:same_tool/
  );
  assert.equal(getCurrentToolCatalog().registeredToolCount, 1);
});

test('buildMcpServer classe les registrations réelles sans changer la surface historique', async () => {
  const { buildMcpServer } = await import('../src/server.js');
  resetToolCatalogForTests();

  buildMcpServer();

  const catalog = getCurrentToolCatalog();
  assert.ok(catalog.registeredToolCount >= 92);
  assert.ok(catalog.readOnlyToolCount > 0);
  assert.ok(catalog.writeToolCount > 0);
  assert.equal(
    catalog.resources.some(({ uri }) => uri === 'mcp://wealthtech/governed-context/current'),
    true
  );
});
