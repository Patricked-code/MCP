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

// The historical versioned catalogue remains the standalone profile. The
// HTTP server always supplies the pairing dependency (startHttpServer).
// Build the actual registration surface with an inert dependency: no OAuth
// session, token, network request or Plesk operation is executed.
const profile = process.argv.slice(2);
if (profile.length === 0) {
  buildMcpServer();
} else if (profile.length === 1 && profile[0] === '--http-runtime') {
  const { createPleskWebTransportPairing } = await import('../src/provisioning/pleskWebTransportPairing.js');
  buildMcpServer(createPleskWebTransportPairing({
    now: () => 0, lookupSessionId: () => null, inspectOauth: () => null
  }));
} else {
  throw Error('FUNCTION_CARTOGRAPHY_PROFILE_INVALID');
}
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
