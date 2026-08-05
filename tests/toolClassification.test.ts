import assert from 'node:assert/strict';
import test from 'node:test';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

process.env.MCP_AUTH_TOKEN ??= 'mcp-unit-test-value-20260805-abcdef';
process.env.S1_HOST ??= '127.0.0.1';
process.env.S1_KEY_PATH ??= '/tmp/mcp-unit-test-s1-key';
process.env.S2_HOST ??= '127.0.0.1';
process.env.S2_KEY_PATH ??= '/tmp/mcp-unit-test-s2-key';
process.env.ENABLE_WRITE_TOOLS ??= 'false';

const {
  registerReadOnlyTools
} = await import('../src/tools/readOnly.js');

const {
  registerScopedReadOnlyTools,
  registerScopedWriteTools
} = await import('../src/tools/writeScoped.js');

const {
  ALL_SCOPED_TOOL_NAMES,
  READ_ONLY_SCOPED_TOOL_NAMES,
  WRITE_SCOPED_TOOL_NAMES,
  assertScopedToolCatalogsAreValid
} = await import('../src/tools/registrationPolicy.js');

function captureTools(register: (server: McpServer) => void): Set<string> {
  const names = new Set<string>();
  const fakeServer = {
    tool(name: string) {
      assert.equal(names.has(name), false, `Outil enregistré deux fois : ${name}`);
      names.add(name);
      return undefined;
    }
  } as unknown as McpServer;

  register(fakeServer);
  return names;
}

test('les catalogues scoped READ et WRITE sont disjoints et complets', () => {
  assert.doesNotThrow(assertScopedToolCatalogsAreValid);

  for (const name of READ_ONLY_SCOPED_TOOL_NAMES) {
    assert.equal(WRITE_SCOPED_TOOL_NAMES.has(name), false, `Outil présent dans READ et WRITE : ${name}`);
  }

  assert.equal(
    ALL_SCOPED_TOOL_NAMES.size,
    READ_ONLY_SCOPED_TOOL_NAMES.size + WRITE_SCOPED_TOOL_NAMES.size
  );
});

test('le registre scoped READ correspond exactement au catalogue READ', () => {
  const names = captureTools(registerScopedReadOnlyTools);
  assert.deepEqual([...names].sort(), [...READ_ONLY_SCOPED_TOOL_NAMES].sort());
});

test('le registre scoped WRITE correspond exactement au catalogue WRITE', () => {
  const names = captureTools(registerScopedWriteTools);
  assert.deepEqual([...names].sort(), [...WRITE_SCOPED_TOOL_NAMES].sort());
});

test('le mode read-only global contient les scoped READ et aucune mutation', () => {
  const names = captureTools(registerReadOnlyTools);

  for (const name of READ_ONLY_SCOPED_TOOL_NAMES) {
    assert.equal(names.has(name), true, `Outil READ absent : ${name}`);
  }

  for (const name of WRITE_SCOPED_TOOL_NAMES) {
    assert.equal(names.has(name), false, `Mutation exposée en mode READ : ${name}`);
  }

  assert.equal(names.has('curl_domain'), true);
  assert.equal(names.has('ping'), true);
});
