import assert from 'node:assert/strict';
import test from 'node:test';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

process.env.MCP_AUTH_TOKEN ??= 'mcp-unit-test-value-20260805-abcdef';
process.env.S1_HOST ??= '127.0.0.1';
process.env.S1_KEY_PATH ??= '/tmp/mcp-unit-test-s1-key';
process.env.S2_HOST ??= '127.0.0.1';
process.env.S2_KEY_PATH ??= '/tmp/mcp-unit-test-s2-key';
process.env.MCP_GOVERNED_SESSIONS_ENABLED ??= 'true';

const {
  GOVERNED_CONTEXT_INSTRUCTIONS,
  GOVERNED_CONTEXT_RESOURCE_URI,
  registerGovernedContextTools
} = await import('../src/tools/governedContext.js');
const { buildMcpServer } = await import('../src/server.js');

type ToolHandler = (input: unknown, extra: unknown) => Promise<any>;
type ResourceHandler = (uri: URL, extra: unknown) => Promise<any>;

const CONTEXT = {
  schemaVersion: 1,
  generatedAt: '2026-08-13T08:00:00.000Z',
  freshness: 'CURRENT',
  repository: 'Patricked-code/MCP',
  governedBranch: 'main',
  liveState: { stateVersion: 9 },
  github: { status: 'CURRENT' },
  session: { governedSessionId: '11111111-1111-4111-8111-111111111111' },
  activeLocks: [],
  lastCheckpoint: null,
  blockers: [],
  nextAction: null,
  gate: {
    mode: 'shadow',
    existingWriteToolsEnabled: false,
    decision: 'shadow_observed'
  },
  proof: {
    identityAssurance: 'oauth_subject',
    runtimeRealtimeAvailable: true,
    limitations: []
  }
};

function extra() {
  return {
    sessionId: 'transport-raw-current',
    authInfo: {
      token: 'must-never-be-returned',
      clientId: 'chatgpt-client',
      scopes: ['mcp:read'],
      extra: {
        governedPrincipalId: 'oauth:wealthtech-mcp-admin',
        identityAssurance: 'oauth_subject'
      }
    }
  };
}

function capture() {
  const resources = new Map<string, {
    uri: string;
    config: Record<string, any>;
    handler: ResourceHandler;
  }>();
  const tools = new Map<string, {
    config: Record<string, any>;
    handler: ToolHandler;
  }>();
  const server = {
    registerResource(
      name: string,
      uri: string,
      config: Record<string, any>,
      handler: ResourceHandler
    ) {
      resources.set(name, { uri, config, handler });
      return undefined;
    },
    registerTool(name: string, config: Record<string, any>, handler: ToolHandler) {
      tools.set(name, { config, handler });
      return undefined;
    }
  } as unknown as McpServer;
  let getCalls = 0;
  let reconcileCalls = 0;
  const observedInputs: unknown[] = [];
  registerGovernedContextTools(server, {
    context: {
      async getCurrent(input: unknown) {
        getCalls += 1;
        observedInputs.push(input);
        return CONTEXT;
      },
      async reconcileExplicit(input: unknown) {
        reconcileCalls += 1;
        observedInputs.push(input);
        return CONTEXT;
      }
    },
    sessions: {
      lookupGovernedSessionId(transportSessionId: string | undefined) {
        assert.equal(transportSessionId, 'transport-raw-current');
        return '11111111-1111-4111-8111-111111111111';
      }
    }
  } as never);
  return {
    resources,
    tools,
    counts: () => ({ getCalls, reconcileCalls }),
    observedInputs
  };
}

function textJson(result: { content: Array<{ text: string }> }) {
  return JSON.parse(result.content[0]?.text ?? 'null');
}

test('enregistre la ressource et les deux outils avec métadonnées MCP exactes', () => {
  const captured = capture();
  const resource = captured.resources.get('wealthtech-governed-context-current');
  assert.equal(resource?.uri, GOVERNED_CONTEXT_RESOURCE_URI);
  assert.deepEqual(resource?.config, {
    title: 'WealthTech Governed Operational Context',
    description: 'Contexte opérationnel gouverné courant, composé depuis Live State, GitHub et la session durable.',
    mimeType: 'application/json',
    annotations: { audience: ['assistant'], priority: 1 }
  });
  assert.deepEqual([...captured.tools.keys()].sort(), [
    'mcp_get_governed_context',
    'mcp_reconcile_governed_context'
  ]);
  for (const tool of captured.tools.values()) {
    assert.deepEqual(tool.config.annotations, {
      readOnlyHint: true,
      destructiveHint: false
    });
  }
});

test('la ressource et get exposent la même projection essentielle sans transport ni token', async () => {
  const captured = capture();
  const resource = captured.resources.get('wealthtech-governed-context-current');
  const resourceResult = await resource?.handler(new URL(GOVERNED_CONTEXT_RESOURCE_URI), extra());
  const resourceBody = JSON.parse(resourceResult.contents[0].text);
  const toolResult = await captured.tools.get('mcp_get_governed_context')?.handler({}, extra());
  const toolBody = textJson(toolResult);

  assert.deepEqual(toolBody, resourceBody);
  assert.equal(toolBody.repository, 'Patricked-code/MCP');
  assert.equal(toolBody.liveState.stateVersion, 9);
  assert.equal(toolBody.session.governedSessionId, CONTEXT.session.governedSessionId);
  assert.equal(JSON.stringify(toolResult).includes('transport-raw-current'), false);
  assert.equal(JSON.stringify(toolResult).includes('must-never-be-returned'), false);
  assert.deepEqual(captured.counts(), { getCalls: 2, reconcileCalls: 0 });
  assert.equal((captured.observedInputs[0] as any).governedSessionId,
    CONTEXT.session.governedSessionId);
});

test('un client sans support resources obtient le contexte et peut demander le refresh explicite', async () => {
  const captured = capture();
  const getResult = textJson(await captured.tools.get('mcp_get_governed_context')?.handler({}, extra()));
  const reconcileResult = textJson(await captured.tools
    .get('mcp_reconcile_governed_context')?.handler({}, extra()));
  assert.deepEqual(getResult, CONTEXT);
  assert.deepEqual(reconcileResult, CONTEXT);
  assert.deepEqual(captured.counts(), { getCalls: 1, reconcileCalls: 1 });
});

test('buildMcpServer publie les instructions gouvernées dans l’initialisation réelle', () => {
  const server = buildMcpServer();
  assert.equal((server.server as unknown as { _instructions?: string })._instructions,
    GOVERNED_CONTEXT_INSTRUCTIONS);
  assert.equal(GOVERNED_CONTEXT_INSTRUCTIONS, [
    'Avant une mutation gouvernée, lire mcp://wealthtech/governed-context/current.',
    'Ouvrir ou reprendre une governed session; MCP-Session-Id reste un transport temporaire.',
    'Acquitter le stateVersion courant avant checkpoint.',
    'Le WRITE gate V1 est shadow et ne remplace ni ENABLE_WRITE_TOOLS ni allow_write.'
  ].join('\n'));
});
