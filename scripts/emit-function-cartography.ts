process.env.MCP_AUTH_TOKEN ??= 'cartography-build-only-not-a-runtime-secret';
process.env.S1_HOST ??= '127.0.0.1';
process.env.S1_KEY_PATH ??= '/tmp/cartography-s1-unused';
process.env.S2_HOST ??= '127.0.0.1';
process.env.S2_KEY_PATH ??= '/tmp/cartography-s2-unused';
process.env.ENABLE_WRITE_TOOLS = 'true';
process.env.MCP_GOVERNED_SESSIONS_ENABLED = 'true';

const [{ buildMcpServer }, { getCurrentToolCatalog }] = await Promise.all([
  import('../src/server.js'),
  import('../src/currentState/toolCatalog.js')
]);

buildMcpServer();
const catalogue = getCurrentToolCatalog();
const result = {
  schemaVersion: 2,
  generatedFrom: 'runtime-registration',
  catalogueVersion: 1,
  catalogueDigest: catalogue.catalogDigest,
  registeredToolCount: catalogue.counts.tools,
  readOnlyToolCount: catalogue.counts.read,
  writeToolCount: catalogue.writeToolCount,
  resourceCount: catalogue.counts.resources,
  tools: catalogue.tools,
  resources: catalogue.resources
};

process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
