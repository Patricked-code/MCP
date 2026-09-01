import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ConnectionContextSchema,
  createConnectionContext
} from '../src/operationalMemory/connectionContext.js';
import type { RequestIdentity } from '../src/operationalMemory/sessionService.js';

const GOVERNED_SESSION_ID = '11111111-1111-4111-8111-111111111111';
const CONNECTION_CONTEXT_ID = '22222222-2222-4222-8222-222222222222';
const CREATED_AT = '2026-09-01T00:30:00.000Z';

const OAUTH_IDENTITY: RequestIdentity = {
  principalId: 'oauth:user:123',
  clientId: 'chatgpt-client',
  assurance: 'oauth_subject'
};

test('creates a bounded sanitized context from an OAuth request identity', () => {
  const context = createConnectionContext({
    governedSessionId: GOVERNED_SESSION_ID,
    repository: 'Patricked-code/MCP',
    requestIdentity: OAUTH_IDENTITY,
    now: () => new Date(CREATED_AT),
    randomUUID: () => CONNECTION_CONTEXT_ID
  });

  assert.deepEqual(context, {
    schemaVersion: 1,
    connectionContextId: CONNECTION_CONTEXT_ID,
    governedSessionId: GOVERNED_SESSION_ID,
    repository: 'Patricked-code/MCP',
    principalId: 'oauth:user:123',
    observedClientId: 'chatgpt-client',
    identityAssurance: 'oauth_subject',
    clientClassification: 'UNRESOLVED',
    evidenceSource: 'oauth_auth_info',
    createdAt: CREATED_AT
  });
  assert.deepEqual(ConnectionContextSchema.parse(context), context);
});

test('does not create a connection context for shared credentials', () => {
  const sharedIdentity: RequestIdentity = {
    principalId: null,
    clientId: 'shared-mcp-client',
    assurance: 'shared_credential'
  };

  assert.equal(createConnectionContext({
    governedSessionId: GOVERNED_SESSION_ID,
    repository: 'Patricked-code/MCP',
    requestIdentity: sharedIdentity,
    now: () => new Date(CREATED_AT),
    randomUUID: () => CONNECTION_CONTEXT_ID
  }), null);
});

test('allows an unresolved OAuth client id without inventing one', () => {
  const context = createConnectionContext({
    governedSessionId: GOVERNED_SESSION_ID,
    repository: 'Patricked-code/MCP',
    requestIdentity: {
      principalId: 'oauth:user:123',
      clientId: null,
      assurance: 'oauth_subject'
    },
    now: () => new Date(CREATED_AT),
    randomUUID: () => CONNECTION_CONTEXT_ID
  });

  assert.equal(context?.observedClientId, null);
});

test('rejects malformed identity and governed identifiers', () => {
  assert.throws(() => createConnectionContext({
    governedSessionId: 'not-a-uuid',
    repository: 'Patricked-code/MCP',
    requestIdentity: OAUTH_IDENTITY,
    now: () => new Date(CREATED_AT),
    randomUUID: () => CONNECTION_CONTEXT_ID
  }));

  assert.throws(() => createConnectionContext({
    governedSessionId: GOVERNED_SESSION_ID,
    repository: 'Patricked-code/MCP',
    requestIdentity: {
      principalId: 'declared:user:123',
      clientId: 'chatgpt-client',
      assurance: 'oauth_subject'
    },
    now: () => new Date(CREATED_AT),
    randomUUID: () => CONNECTION_CONTEXT_ID
  }));

  assert.throws(() => createConnectionContext({
    governedSessionId: GOVERNED_SESSION_ID,
    repository: 'Patricked-code/MCP',
    requestIdentity: {
      principalId: 'oauth:user:123',
      clientId: 'x'.repeat(257),
      assurance: 'oauth_subject'
    },
    now: () => new Date(CREATED_AT),
    randomUUID: () => CONNECTION_CONTEXT_ID
  }));
});

test('copies only allowlisted identity evidence and never secret-shaped metadata', () => {
  const identityWithUntrustedMetadata = {
    ...OAUTH_IDENTITY,
    token: 'must-not-persist',
    authorization: 'Bearer must-not-persist',
    transportSessionId: 'raw-transport-id',
    resumeSecret: 'must-not-persist'
  } as RequestIdentity & Record<string, unknown>;

  const context = createConnectionContext({
    governedSessionId: GOVERNED_SESSION_ID,
    repository: 'Patricked-code/MCP',
    requestIdentity: identityWithUntrustedMetadata,
    now: () => new Date(CREATED_AT),
    randomUUID: () => CONNECTION_CONTEXT_ID
  });
  const serialized = JSON.stringify(context);

  assert.equal(serialized.includes('must-not-persist'), false);
  assert.equal(serialized.includes('raw-transport-id'), false);
  assert.deepEqual(Object.keys(context ?? {}).sort(), [
    'clientClassification',
    'connectionContextId',
    'createdAt',
    'evidenceSource',
    'governedSessionId',
    'identityAssurance',
    'observedClientId',
    'principalId',
    'repository',
    'schemaVersion'
  ]);
});
