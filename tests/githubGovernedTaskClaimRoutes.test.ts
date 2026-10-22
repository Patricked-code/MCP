import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createServer } from 'node:http';
import express from 'express';
import { createGithubGovernedTaskClaimRouter } from '../src/governance/githubGovernedTaskClaimRoutes.js';

const SHA = '78884dc65627dcdc4ec61ab66ab16fc976a316b6';
const TASK = 'TASK-20260929-001';

async function invoke(options: {
  payload?: unknown;
  auth?: string;
  enabled?: boolean;
  verified?: boolean;
  principal?: string | null;
  sessions?: unknown[];
  document?: unknown;
  liveState?: unknown;
  onClaim?: () => Promise<unknown>;
}) {
  const called = { verified: 0, resolved: 0, claimed: 0 };
  const app = express();
  app.use(createGithubGovernedTaskClaimRouter({
    verifyOidc: async () => { called.verified++; if (options.verified === false) throw Error('invalid'); return { sha: SHA }; },
    sessions: { listVisibleSessions: async () => (options.sessions ?? []) as never },
    queue: {
      listVisibleTasks: async () => (options.document ?? { storeRevision: 1, tasks: [] }) as never,
      claimTaskById: async () => { called.claimed++; return (options.onClaim ? await options.onClaim() : { taskId: TASK, status: 'CLAIMED', taskRevision: 2 }) as never; }
    },
    lifecycle: { run: async work => work() },
    ready: async () => undefined,
    currentState: async () => (options.liveState ?? { stateVersion: 5 }) as never,
    writeEnabled: () => options.enabled ?? true,
    resolveAuthorizedPrincipal: async () => { called.resolved++; return options.principal ?? null; }
  }));
  const server = createServer(app);
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const address = server.address();
    if (!address || typeof address === 'string') throw Error('missing address');
    const response = await fetch('http://127.0.0.1:' + address.port + '/governance/github/task-claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: options.auth ?? 'Bearer valid-token' },
      body: JSON.stringify(options.payload ?? { sha: SHA, taskId: TASK })
    });
    return { status: response.status, body: await response.json() as Record<string, unknown>, called };
  } finally {
    await new Promise<void>((resolve, reject) => server.close(err => err ? reject(err) : resolve()));
  }
}

const session = {
  governedSessionId: '8319205d-e015-4c1f-8c03-fc4dbe5ef161',
  repository: 'Patricked-code/MCP',
  identityAssurance: 'oauth_subject',
  status: 'ACTIVE',
  agentIdentity: 'original-agent',
  taskScope: TASK,
  blockers: [],
  bootstrapReceipt: {
    bootstrapReceiptId: 'eaca272a-0f04-441f-9ecc-2dc4d730b5d4',
    governedSessionId: '8319205d-e015-4c1f-8c03-fc4dbe5ef161',
    repository: 'Patricked-code/MCP',
    agentIdentity: 'original-agent',
    status: 'ACKNOWLEDGED',
    stateVersion: 5,
    githubHead: SHA,
    expiresAt: '2099-01-01T00:00:00.000Z'
  }
};

test('rejects session ID or scope supplied by caller', async () => {
  const r = await invoke({ payload: { sha: SHA, taskId: TASK, governedSessionId: session.governedSessionId } });
  assert.equal(r.status, 400);
  assert.equal(r.called.verified, 0);
});

test('rejects wrong task and malformed authorization before cryptography', async () => {
  assert.equal((await invoke({ payload: { sha: SHA, taskId: 'TASK-20260101-999' } })).status, 400);
  assert.equal((await invoke({ auth: 'token invalid' })).status, 400);
});

test('rejects when mutation disabled and OIDC verification fails', async () => {
  assert.equal((await invoke({ enabled: false })).status, 503);
  const r = await invoke({ verified: false });
  assert.equal(r.status, 401);
  assert.equal(r.called.claimed, 0);
});

test('rejects missing server authorization even with valid cryptographic identity', async () => {
  const r = await invoke({ sessions: [session] });
  assert.equal(r.status, 403);
  assert.equal(r.called.claimed, 0);
});

test('rejects ambiguous, stale and scope-mismatched sessions', async () => {
  const doc = { storeRevision: 1, tasks: [{ taskId: TASK, taskRevision: 1, repository: 'Patricked-code/MCP', intentKey: TASK }] };
  assert.equal((await invoke({ principal: 'oauth:verified', sessions: [session, session], document: doc })).status, 409);
  assert.equal((await invoke({ principal: 'oauth:verified', sessions: [session], document: doc, liveState: { stateVersion: 6 } })).status, 409);
  assert.equal((await invoke({ principal: 'oauth:verified', sessions: [{ ...session, taskScope: 'different-scope' }], document: doc })).status, 409);
});

test('calls existing exact-ID CAS primitive only after all server-side checks', async () => {
  const doc = { storeRevision: 9, tasks: [{ taskId: TASK, taskRevision: 7, repository: 'Patricked-code/MCP', intentKey: TASK }] };
  const r = await invoke({ principal: 'oauth:verified', sessions: [session], document: doc });
  assert.equal(r.status, 200);
  assert.equal(r.called.claimed, 1);
  assert.equal(r.body.taskId, TASK);
});

test('propagates claim conflicts as bounded denial without leaking stores', async () => {
  const doc = { storeRevision: 9, tasks: [{ taskId: TASK, taskRevision: 7, repository: 'Patricked-code/MCP', intentKey: TASK }] };
  const r = await invoke({ principal: 'oauth:verified', sessions: [session], document: doc, onClaim: async () => { throw Error('TASK_STORE_REVISION_MISMATCH'); } });
  assert.equal(r.status, 409);
  assert.deepEqual(r.body, { error: 'governed_claim_not_admitted' });
});
