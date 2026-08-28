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

test('captures complete sorted contracts after successful SDK registration without changing returns', () => {
  const { server, calls, returns } = fakeServer();
  const read = decorateRegistrationCatalogServer(server, 'read');
  const operational = decorateRegistrationCatalogServer(server, 'operational-write');
  const write = decorateRegistrationCatalogServer(server, 'scoped-write');
  const handler = async () => ({ content: [] });
  const resourceHandler = async () => ({ contents: [] });

  assert.equal(read.tool('z_legacy', 'Legacy read tool', { value: z.string().min(1) }, handler), returns.tool);
  assert.equal(operational.registerTool('b_operational', {
    title: 'Operational task tool',
    description: 'Operational description',
    inputSchema: { stateVersion: z.number().int() },
    annotations: { readOnlyHint: false, destructiveHint: false }
  }, handler), returns.registerTool);
  assert.equal(write.registerTool('a_registered', {
    title: 'Registered write tool',
    description: 'Registered description',
    inputSchema: { count: z.number().int().min(1) },
    annotations: { readOnlyHint: false, destructiveHint: true }
  }, handler), returns.registerTool);
  assert.equal(read.registerResource('wealthtech-current', 'mcp://wealthtech/current', {
    title: 'Current state',
    description: 'Current resource',
    mimeType: 'application/json',
    annotations: { audience: ['assistant'], priority: 1 }
  }, resourceHandler), returns.registerResource);

  assert.deepEqual(calls.map(({ method }) => method), ['tool', 'registerTool', 'registerTool', 'registerResource']);
  const first = getCurrentToolCatalog();
  const second = getCurrentToolCatalog();
  assert.deepEqual(first, second);
  assert.deepEqual(first.counts, {
    tools: 3,
    resources: 1,
    read: 1,
    operationalWrite: 1,
    scopedWrite: 1
  });
  assert.equal(first.registeredToolCount, 3);
  assert.equal(first.readOnlyToolCount, 1);
  assert.equal(first.operationalWriteToolCount, 1);
  assert.equal(first.writeToolCount, 2);
  assert.deepEqual(first.tools.map(({ name }) => name), ['a_registered', 'b_operational', 'z_legacy']);
  assert.deepEqual(first.tools[0]?.annotations, { readOnlyHint: false, destructiveHint: true });
  assert.equal(first.tools[1]?.title, 'Operational task tool');
  assert.equal(first.tools[2]?.inputSchema.type, 'object');
  assert.deepEqual(first.resources[0], {
    name: 'wealthtech-current',
    uri: 'mcp://wealthtech/current',
    title: 'Current state',
    description: 'Current resource',
    mimeType: 'application/json',
    audience: ['assistant'],
    priority: 1,
    surface: 'read',
    contractDigest: first.resources[0]?.contractDigest
  });
  assert.match(first.catalogueDigest, /^[0-9a-f]{64}$/);
  assert.equal(first.catalogDigest, first.catalogueDigest);
});

test('deduplicates identical contracts and fails closed on a conflicting one', () => {
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

test('does not record a registration rejected by the SDK', () => {
  const rejected = new Error('sdk_registration_rejected');
  const server = {
    tool() { throw rejected; }
  } as unknown as McpServer;
  const decorated = decorateRegistrationCatalogServer(server, 'read');

  assert.throws(() => decorated.tool('rejected', 'Rejected', {}, async () => ({ content: [] })), rejected);
  assert.equal(getCurrentToolCatalog().registeredToolCount, 0);
});

test('catalogue digest is stable and excludes observation time', () => {
  const { server } = fakeServer();
  decorateRegistrationCatalogServer(server, 'read')
    .tool('stable', 'Stable', {}, async () => ({ content: [] }));
  const first = getCurrentToolCatalog();
  const second = getCurrentToolCatalog();
  assert.equal(first.catalogueDigest, second.catalogueDigest);
  assert.equal(first.generatedAt, second.generatedAt);
});

test('buildMcpServer classifies the complete real registration surface', async () => {
  const { buildMcpServer } = await import('../src/server.js');
  resetToolCatalogForTests();

  buildMcpServer();

  const catalog = getCurrentToolCatalog();
  assert.ok(catalog.registeredToolCount >= 92);
  assert.ok(catalog.readOnlyToolCount > 0);
  assert.ok(catalog.operationalWriteToolCount > 0);
  assert.ok(catalog.writeToolCount > catalog.operationalWriteToolCount);
  assert.equal(
    catalog.resources.some(({ uri }) => uri === 'mcp://wealthtech/governed-context/current'),
    true
  );
  assert.equal(
    catalog.resources.some(({ uri }) => uri === 'mcp://wealthtech/current-state/inventory'),
    true
  );
  const surfaceByTool = new Map(catalog.tools.map((tool) => [tool.name, tool.surface]));
  assert.equal(surfaceByTool.get('mcp_get_work_queue'), 'read');
  assert.equal(surfaceByTool.get('mcp_get_governed_task'), 'read');
  assert.equal(surfaceByTool.get('mcp_reconcile_agent_intent'), 'operational-write');
  assert.equal(surfaceByTool.get('mcp_claim_next_governed_task'), 'operational-write');
  assert.equal(surfaceByTool.get('mcp_transition_governed_task'), 'operational-write');
});
