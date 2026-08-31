import assert from 'node:assert/strict';
import { Writable } from 'node:stream';
import test from 'node:test';
import pino from 'pino';

process.env.MCP_AUTH_TOKEN ??= 'mcp-unit-test-value-20260805-abcdef';
process.env.S1_HOST ??= '127.0.0.1';
process.env.S1_KEY_PATH ??= '/tmp/mcp-unit-test-s1-key';
process.env.S2_HOST ??= '127.0.0.1';
process.env.S2_KEY_PATH ??= '/tmp/mcp-unit-test-s2-key';

const { LOGGER_REDACT_PATHS } = await import('../src/logger.js');

test('la politique de logs masque les identifiants OAuth, transport et les URL de requête', () => {
  for (const path of [
    'clientId',
    '*.clientId',
    'client_id',
    '*.client_id',
    'sessionId',
    '*.sessionId',
    'transportSessionId',
    '*.transportSessionId',
    'req.query.client_id',
    'req.url',
    'req.originalUrl'
  ]) {
    assert.equal(LOGGER_REDACT_PATHS.includes(path as never), true, `Chemin de redaction absent: ${path}`);
  }
});

test('Pino ne restitue ni clientId, ni transport session brut, ni query string OAuth', () => {
  let output = '';
  const destination = new Writable({
    write(chunk, _encoding, callback) {
      output += chunk.toString();
      callback();
    }
  });

  const testLogger = pino({
    redact: {
      paths: [...LOGGER_REDACT_PATHS],
      censor: '[REDACTED]'
    }
  }, destination);

  const sensitiveClientId = 'https://client.example/callback?tenant=wealthtech&nonce=private-value';
  const sensitiveSessionId = 'mcp-transport-session-private-123456789';
  const sensitiveUrl = `/oauth/authorize?client_id=${encodeURIComponent(sensitiveClientId)}&state=private-state`;

  testLogger.info({
    clientId: sensitiveClientId,
    sessionId: sensitiveSessionId,
    nested: {
      clientId: sensitiveClientId,
      client_id: sensitiveClientId,
      sessionId: sensitiveSessionId,
      transportSessionId: sensitiveSessionId
    },
    req: {
      url: sensitiveUrl,
      originalUrl: sensitiveUrl,
      query: { client_id: sensitiveClientId }
    }
  }, 'Code OAuth MCP genere');

  const record = JSON.parse(output) as Record<string, any>;
  assert.equal(record.clientId, '[REDACTED]');
  assert.equal(record.sessionId, '[REDACTED]');
  assert.equal(record.nested.clientId, '[REDACTED]');
  assert.equal(record.nested.client_id, '[REDACTED]');
  assert.equal(record.nested.sessionId, '[REDACTED]');
  assert.equal(record.nested.transportSessionId, '[REDACTED]');
  assert.equal(record.req.url, '[REDACTED]');
  assert.equal(record.req.originalUrl, '[REDACTED]');
  assert.equal(record.req.query.client_id, '[REDACTED]');
  assert.equal(output.includes('mcp-transport-session-private'), false);
  assert.equal(output.includes('private-value'), false);
  assert.equal(output.includes('private-state'), false);
  assert.equal(output.includes('client.example'), false);
});
