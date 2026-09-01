import assert from 'node:assert/strict';
import test from 'node:test';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { GovernedLockService } from '../src/operationalMemory/lockService.js';
import type { GovernedSessionService } from '../src/operationalMemory/sessionService.js';

process.env.MCP_AUTH_TOKEN ??= 'mcp-unit-test-value-20260805-abcdef';
process.env.S1_HOST ??= '127.0.0.1';
process.env.S1_KEY_PATH ??= '/tmp/mcp-unit-test-s1-key';
process.env.S2_HOST ??= '127.0.0.1';
process.env.S2_KEY_PATH ??= '/tmp/mcp-unit-test-s2-key';

const { registerGovernedSessionTools } = await import('../src/tools/governedSessions.js');

type Handler = (input: any, extra: any) => Promise<any>;

const SESSION_ID = '11111111-1111-4111-8111-111111111111';
const PUBLIC_SESSION = {
  schemaVersion: 1,
  governedSessionId: SESSION_ID,
  repository: 'Patricked-code/MCP',
  taskScope: 'TASK-20260813-008',
  workBranch: 'mcp/session-continuity-v1-20260813',
  agentIdentity: 'codex-work-mode',
  ownerPrincipalId: 'oauth:wealthtech-mcp-admin',
  identityAssurance: 'oauth_subject',
  status: 'OPEN',
  createdAt: '2026-08-13T08:00:00.000Z',
  resumedAt: null,
  lastHeartbeatAt: '2026-08-13T08:00:00.000Z',
  pausedAt: null,
  expiredAt: null,
  closedAt: null,
  currentTransport: {
    fingerprint: 'a'.repeat(64),
    boundAt: '2026-08-13T08:00:00.000Z',
    lastSeenAt: '2026-08-13T08:00:00.000Z'
  },
  lastAcknowledgedStateVersion: null,
  connectionContext: {
    schemaVersion: 1,
    connectionContextId: '22222222-2222-4222-8222-222222222222',
    governedSessionId: SESSION_ID,
    repository: 'Patricked-code/MCP',
    principalId: 'oauth:wealthtech-mcp-admin',
    observedClientId: 'chatgpt-client',
    identityAssurance: 'oauth_subject',
    clientClassification: 'UNRESOLVED',
    evidenceSource: 'oauth_auth_info',
    createdAt: '2026-08-13T08:00:00.000Z'
  },
  sessionRevision: 1,
  lastCheckpoint: null,
  blockers: [],
  nextAction: null,
  lockIds: [],
  resumePolicy: 'stable_principal_or_resume_secret'
} as const;

function capture(dependencies: {
  sessions: GovernedSessionService;
  locks: GovernedLockService;
}) {
  const handlers = new Map<string, Handler>();
  const server = {
    tool(name: string, ...args: unknown[]) {
      handlers.set(name, args.at(-1) as Handler);
      return undefined;
    }
  } as unknown as McpServer;
  registerGovernedSessionTools(server, dependencies);
  return handlers;
}

function textJson(result: { content: Array<{ type: string; text: string }> }) {
  return JSON.parse(result.content[0]?.text ?? 'null');
}

function extra(transportSessionId = 'transport-raw-A') {
  return {
    sessionId: transportSessionId,
    authInfo: {
      token: 'must-never-be-returned',
      clientId: 'chatgpt-client',
      scopes: ['mcp:read'],
      expiresAt: 1_800_000_000,
      extra: {
        governedPrincipalId: 'oauth:wealthtech-mcp-admin',
        identityAssurance: 'oauth_subject'
      }
    }
  };
}

test('les onze outils additifs sont enregistrés indépendamment des outils WRITE historiques', () => {
  const dependencies = {
    sessions: {} as GovernedSessionService,
    locks: {} as GovernedLockService
  };
  const names = [...capture(dependencies).keys()].sort();
  assert.deepEqual(names, [
    'mcp_acknowledge_governed_context',
    'mcp_acquire_governed_lock',
    'mcp_close_governed_session',
    'mcp_create_governed_checkpoint',
    'mcp_get_governed_session',
    'mcp_governed_session_heartbeat',
    'mcp_list_governed_sessions',
    'mcp_open_governed_session',
    'mcp_pause_governed_session',
    'mcp_release_governed_lock',
    'mcp_resume_governed_session'
  ]);
});

test('open utilise le transport courant seulement comme liaison et ne le retourne jamais', async () => {
  let observedRequest: unknown = null;
  const sessions = {
    async openSession(_input: unknown, request: unknown) {
      observedRequest = request;
      return { session: PUBLIC_SESSION, resumeSecret: 'resume-secret-public-once' };
    }
  } as unknown as GovernedSessionService;
  const handler = capture({ sessions, locks: {} as GovernedLockService })
    .get('mcp_open_governed_session');
  const result = await handler?.({
    repository: 'Patricked-code/MCP',
    taskScope: 'TASK-20260813-008',
    workBranch: 'mcp/session-continuity-v1-20260813',
    agentIdentity: 'codex-work-mode',
    blockers: [],
    nextAction: null
  }, extra());
  const body = textJson(result);

  assert.deepEqual(observedRequest, {
    transportSessionId: 'transport-raw-A',
    identity: {
      principalId: 'oauth:wealthtech-mcp-admin',
      clientId: 'chatgpt-client',
      assurance: 'oauth_subject'
    }
  });
  assert.equal(body.ok, true);
  assert.equal(body.result.session.governedSessionId, SESSION_ID);
  assert.equal(body.result.resumeSecret, 'resume-secret-public-once');
  assert.equal(JSON.stringify(result).includes('transport-raw-A'), false);
  assert.equal(JSON.stringify(result).includes('must-never-be-returned'), false);
  assert.equal(JSON.stringify(result).includes('MCP-Session-Id'), false);
});

test('resume et heartbeat gardent governedSessionId; une révision invalide est structurée', async () => {
  const sessions = {
    async resumeSession() {
      return { ...PUBLIC_SESSION, status: 'ACTIVE', sessionRevision: 2 };
    },
    async heartbeat() {
      throw new Error('SESSION_REVISION_MISMATCH');
    }
  } as unknown as GovernedSessionService;
  const handlers = capture({ sessions, locks: {} as GovernedLockService });
  const resumed = textJson(await handlers.get('mcp_resume_governed_session')?.({
    governedSessionId: SESSION_ID,
    resumeSecret: 'resume-secret-public-once',
    repository: 'Patricked-code/MCP',
    taskScope: 'TASK-20260813-008',
    expectedSessionRevision: 1
  }, extra('transport-raw-B')));
  assert.equal(resumed.result.governedSessionId, SESSION_ID);
  assert.equal(JSON.stringify(resumed).includes('transport-raw-B'), false);

  const failed = await handlers.get('mcp_governed_session_heartbeat')?.({
    governedSessionId: SESSION_ID,
    expectedSessionRevision: 1
  }, extra('transport-raw-B'));
  assert.equal(failed.isError, true);
  assert.deepEqual(textJson(failed), {
    ok: false,
    error: { code: 'SESSION_REVISION_MISMATCH' }
  });
});


test('existing open, get, list and resume surfaces expose only the sanitized connection context', async () => {
  const sessions = {
    async openSession() {
      return { session: PUBLIC_SESSION, resumeSecret: 'resume-secret-public-once' };
    },
    async getVisibleSession() {
      return PUBLIC_SESSION;
    },
    async listVisibleSessions() {
      return [PUBLIC_SESSION];
    },
    async resumeSession() {
      return { ...PUBLIC_SESSION, status: 'ACTIVE', sessionRevision: 2 };
    }
  } as unknown as GovernedSessionService;
  const handlers = capture({ sessions, locks: {} as GovernedLockService });

  const opened = textJson(await handlers.get('mcp_open_governed_session')?.({
    repository: 'Patricked-code/MCP',
    taskScope: 'TASK-20260813-008',
    workBranch: 'mcp/session-continuity-v1-20260813',
    agentIdentity: 'codex-work-mode',
    blockers: [],
    nextAction: null
  }, extra()));
  const fetchedSession = textJson(await handlers.get('mcp_get_governed_session')?.({
    governedSessionId: SESSION_ID
  }, extra()));
  const listed = textJson(await handlers.get('mcp_list_governed_sessions')?.({}, extra()));
  const resumed = textJson(await handlers.get('mcp_resume_governed_session')?.({
    governedSessionId: SESSION_ID,
    repository: 'Patricked-code/MCP',
    taskScope: 'TASK-20260813-008',
    expectedSessionRevision: 1
  }, extra('transport-raw-B')));

  const expectedContext = PUBLIC_SESSION.connectionContext;
  assert.deepEqual(opened.result.session.connectionContext, expectedContext);
  assert.deepEqual(fetchedSession.result.connectionContext, expectedContext);
  assert.deepEqual(listed.result[0].connectionContext, expectedContext);
  assert.deepEqual(resumed.result.connectionContext, expectedContext);

  for (const result of [opened, fetchedSession, listed, resumed]) {
    const serialized = JSON.stringify(result);
    assert.equal(serialized.includes('must-never-be-returned'), false);
    assert.equal(serialized.includes('transport-raw-A'), false);
    assert.equal(serialized.includes('transport-raw-B'), false);
    assert.equal(serialized.includes('resumeSecretHash'), false);
  }
});
