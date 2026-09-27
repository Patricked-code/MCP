import assert from 'node:assert/strict';
import test from 'node:test';

import * as connectionContextModule from '../src/operationalMemory/connectionContext.js';
import {
  ConnectionContextSchema,
  createConnectionContext,
  type ConnectionContext
} from '../src/operationalMemory/connectionContext.js';
import type { RequestIdentity } from '../src/operationalMemory/sessionService.js';

const GOVERNED_SESSION_ID = '11111111-1111-4111-8111-111111111111';
const CONNECTION_CONTEXT_ID = '22222222-2222-4222-8222-222222222222';
const CREATED_AT = '2026-09-27T08:00:00.000Z';

const OAUTH_IDENTITY: RequestIdentity = {
  principalId: 'oauth:user:123',
  clientId: 'chatgpt-client',
  assurance: 'oauth_subject'
};

const FORBIDDEN_INFERENCES = [
  'CLIENT_CLASS_FROM_CLIENT_ID_ONLY',
  'CONVERSATION_FROM_TRANSPORT_SESSION',
  'WORKSPACE_FROM_REPOSITORY'
];

type ClientEvidenceApi = {
  deriveClientEvidence: (context: ConnectionContext | null | undefined) => any;
  ClientEvidenceSchema: { parse(value: unknown): any; safeParse(value: unknown): { success: boolean } };
};

function a22Api(): ClientEvidenceApi {
  const exported = connectionContextModule as Record<string, unknown>;
  assert.equal(
    typeof exported.deriveClientEvidence,
    'function',
    'A2.2.2 must derive bounded client evidence from the existing ConnectionContext authority'
  );
  assert.equal(
    typeof (exported.ClientEvidenceSchema as { safeParse?: unknown } | undefined)?.safeParse,
    'function',
    'A2.2.2 must publish a closed ClientEvidence schema'
  );
  return exported as unknown as ClientEvidenceApi;
}

function oauthContext(identity: RequestIdentity = OAUTH_IDENTITY): ConnectionContext {
  const context = createConnectionContext({
    governedSessionId: GOVERNED_SESSION_ID,
    repository: 'Patricked-code/MCP',
    requestIdentity: identity,
    now: () => new Date(CREATED_AT),
    randomUUID: () => CONNECTION_CONTEXT_ID
  });
  assert.ok(context);
  return context;
}

function unknownEvidence(reasonCode: string) {
  return {
    schemaVersion: 1,
    source: 'connection_context',
    connectionContextId: null,
    observedAt: null,
    principal: { status: 'UNKNOWN', reasonCode },
    oauthClientId: { observed: false, opaque: true, classificationAuthority: false },
    clientClassification: {
      status: 'UNKNOWN',
      reasonCode: 'UNKNOWN_UNTIL_VERIFIABLE_CLIENT_EVIDENCE'
    },
    conversationReference: {
      status: 'UNKNOWN',
      reasonCode: 'CONVERSATION_REFERENCE_NOT_SUPPLIED'
    },
    workspaceReference: {
      status: 'UNKNOWN',
      reasonCode: 'WORKSPACE_REFERENCE_NOT_SUPPLIED'
    },
    forbiddenInferences: FORBIDDEN_INFERENCES,
    blocksOauthPrincipalResolution: false
  };
}

test('A2.2.2 projects the verified OAuth principal and keeps unproven client evidence UNKNOWN', () => {
  const { deriveClientEvidence, ClientEvidenceSchema } = a22Api();
  const evidence = deriveClientEvidence(oauthContext());

  assert.deepEqual(evidence, {
    schemaVersion: 1,
    source: 'connection_context',
    connectionContextId: CONNECTION_CONTEXT_ID,
    observedAt: CREATED_AT,
    principal: {
      status: 'VERIFIED',
      assurance: 'oauth_subject',
      evidenceSource: 'oauth_auth_info'
    },
    oauthClientId: { observed: true, opaque: true, classificationAuthority: false },
    clientClassification: {
      status: 'UNKNOWN',
      reasonCode: 'UNKNOWN_UNTIL_VERIFIABLE_CLIENT_EVIDENCE'
    },
    conversationReference: {
      status: 'UNKNOWN',
      reasonCode: 'CONVERSATION_REFERENCE_NOT_SUPPLIED'
    },
    workspaceReference: {
      status: 'UNKNOWN',
      reasonCode: 'WORKSPACE_REFERENCE_NOT_SUPPLIED'
    },
    forbiddenInferences: FORBIDDEN_INFERENCES,
    blocksOauthPrincipalResolution: false
  });
  assert.deepEqual(ClientEvidenceSchema.parse(evidence), evidence);
});

test('A2.2.2 never classifies a client, conversation or workspace from an opaque clientId', () => {
  const { deriveClientEvidence } = a22Api();

  for (const clientId of ['chatgpt', 'openai-mcp', 'claude', 'claude-ai', 'Claude Code', 'codex']) {
    const evidence = deriveClientEvidence(oauthContext({ ...OAUTH_IDENTITY, clientId }));
    const serialized = JSON.stringify(evidence);

    assert.equal(evidence.clientClassification.status, 'UNKNOWN');
    assert.equal(evidence.conversationReference.status, 'UNKNOWN');
    assert.equal(evidence.workspaceReference.status, 'UNKNOWN');
    assert.equal(evidence.oauthClientId.observed, true);
    assert.equal(evidence.oauthClientId.classificationAuthority, false);
    assert.equal(serialized.includes(clientId), false, `raw clientId ${clientId} must not be echoed`);
    assert.equal(serialized.includes(OAUTH_IDENTITY.principalId!), false);
  }
});

test('A2.2.2 keeps an absent OAuth clientId as unobserved instead of inventing one', () => {
  const { deriveClientEvidence } = a22Api();
  const evidence = deriveClientEvidence(oauthContext({ ...OAUTH_IDENTITY, clientId: null }));

  assert.equal(evidence.principal.status, 'VERIFIED');
  assert.deepEqual(evidence.oauthClientId, {
    observed: false,
    opaque: true,
    classificationAuthority: false
  });
});

test('A2.2.2 fails closed to UNKNOWN for historical, shared-credential and invalid contexts', () => {
  const { deriveClientEvidence, ClientEvidenceSchema } = a22Api();

  assert.deepEqual(deriveClientEvidence(undefined), unknownEvidence('CONNECTION_CONTEXT_ABSENT'));
  assert.deepEqual(deriveClientEvidence(null), unknownEvidence('CONNECTION_CONTEXT_ABSENT'));

  const tampered = {
    ...oauthContext(),
    identityAssurance: 'declared_only',
    clientClassification: 'chatgpt'
  } as unknown as ConnectionContext;
  const invalid = deriveClientEvidence(tampered);
  assert.deepEqual(invalid, unknownEvidence('CONNECTION_CONTEXT_INVALID'));
  assert.deepEqual(ClientEvidenceSchema.parse(invalid), invalid);
});

test('A2.2.2 evidence schema cannot represent an unproven classification or reference', () => {
  const { deriveClientEvidence, ClientEvidenceSchema } = a22Api();
  const evidence = deriveClientEvidence(oauthContext());

  const rejected = [
    { ...evidence, clientClassification: { status: 'VERIFIED', value: 'chatgpt' } },
    { ...evidence, clientClassification: { status: 'UNKNOWN', reasonCode: 'CLIENT_ID_MATCHED' } },
    {
      ...evidence,
      conversationReference: { status: 'SUPPLIED', reference: 'conversation-123' }
    },
    {
      ...evidence,
      workspaceReference: { status: 'SUPPLIED', reference: 'workspace-123' }
    },
    {
      ...evidence,
      principal: { status: 'VERIFIED', assurance: 'declared_only', evidenceSource: 'tool_input' }
    },
    { ...evidence, blocksOauthPrincipalResolution: true },
    { ...evidence, forbiddenInferences: FORBIDDEN_INFERENCES.slice(1) },
    { ...evidence, observedClientId: 'chatgpt-client' },
    { ...evidence, principal: { status: 'UNKNOWN', reasonCode: 'CONNECTION_CONTEXT_ABSENT' } },
    { ...unknownEvidence('CONNECTION_CONTEXT_ABSENT'), oauthClientId: {
      observed: true,
      opaque: true,
      classificationAuthority: false
    } }
  ];

  for (const candidate of rejected) {
    assert.equal(
      ClientEvidenceSchema.safeParse(candidate).success,
      false,
      JSON.stringify(candidate)
    );
  }
});

test('A2.2.2 derivation is deterministic and never mutates the persisted context', () => {
  const { deriveClientEvidence } = a22Api();
  const context = Object.freeze(oauthContext());
  const before = JSON.stringify(context);

  assert.deepEqual(deriveClientEvidence(context), deriveClientEvidence(context));
  assert.equal(JSON.stringify(context), before);
});

test('persisted ConnectionContext keeps only proven fields and refuses unproven client references', () => {
  const context = oauthContext();

  for (const extension of [
    { conversationRef: 'conversation-123' },
    { workspaceRef: 'workspace-123' },
    { clientEvidence: { conversationReference: { status: 'SUPPLIED' } } },
    { providerConversationRef: 'conversation-123' }
  ]) {
    assert.equal(ConnectionContextSchema.safeParse({ ...context, ...extension }).success, false);
  }
  assert.equal(
    ConnectionContextSchema.safeParse({ ...context, clientClassification: 'chatgpt' }).success,
    false
  );

  const identityWithReferenceHints = {
    ...OAUTH_IDENTITY,
    conversationId: 'conversation-hint',
    conversationRef: 'conversation-hint',
    workspaceId: 'workspace-hint',
    workspaceRef: 'workspace-hint',
    mcpSessionId: 'transport-hint'
  } as RequestIdentity & Record<string, unknown>;
  const persisted = oauthContext(identityWithReferenceHints);
  const serialized = JSON.stringify(persisted);

  assert.equal(serialized.includes('conversation-hint'), false);
  assert.equal(serialized.includes('workspace-hint'), false);
  assert.equal(serialized.includes('transport-hint'), false);
  assert.deepEqual(persisted, context);
});
