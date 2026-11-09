// Isolated OS process used exclusively by OAuth refresh security regression tests.
// No token values or credentials are ever returned to the parent process or logged.
process.env.MCP_AUTH_TOKEN ??= 'mcp-unit-test-value-20260805-abcdef';
process.env.S1_HOST ??= '127.0.0.1';
process.env.S1_KEY_PATH ??= '/tmp/mcp-unit-test-s1-key';
process.env.S2_HOST ??= '127.0.0.1';
process.env.S2_KEY_PATH ??= '/tmp/mcp-unit-test-s2-key';
process.env.MCP_WEB_BASE_URL ??= 'https://mcp.wealthtechinnovations.com';

const { createOAuthRefreshGrantService } = await import('../../src/oauthRefreshTokens.ts');
const { createOAuthAuthorizationCodeService } = await import('../../src/oauthAuthorizationCodes.ts');

process.on('message', async (message) => {
  if (message?.kind === 'CONSUME_AUTH_CODE') {
    try {
      const svc = createOAuthAuthorizationCodeService({ storePath: message.storePath, lockTimeoutMs: 3000 });
      const result = await svc.consume(message.authorizationCode);
      process.send?.({ kind: 'RESULT', outcome: result ? 'CONSUMED' : 'ALREADY_CONSUMED' });
    } catch {
      process.send?.({ kind: 'RESULT', outcome: 'AUTH_CODE_WORKER_FAILURE' });
    } finally {
      process.disconnect?.();
    }
    return;
  }
  if (message?.kind !== 'ROTATE') return;
  const service = createOAuthRefreshGrantService({
    storePath: message.storePath,
    idleTtlSeconds: 3600,
    absoluteTtlSeconds: 86400,
    lockTimeoutMs: 3000
  });
  try {
    await service.rotate({
      refreshToken: message.refreshToken,
      clientId: 'race-client'
    });
    process.send?.({ kind: 'RESULT', outcome: 'SUCCESS' });
  } catch (error) {
    // Error code only: do not leak token or paths across worker IPC.
    const code = error instanceof Error ? error.message : 'UNKNOWN';
    process.send?.({
      kind: 'RESULT',
      outcome: code.startsWith('OAUTH_REFRESH_') || code.startsWith('OPERATIONAL_STORE_')
        ? code : 'UNEXPECTED_FAILURE'
    });
  } finally {
    process.disconnect?.();
  }
});
process.send?.({ kind: 'READY' });
