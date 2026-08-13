import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import { captureToolContracts } from './helpers/captureToolContracts.js';

process.env.MCP_AUTH_TOKEN ??= 'mcp-unit-test-value-20260805-abcdef';
process.env.S1_HOST ??= '127.0.0.1';
process.env.S1_KEY_PATH ??= '/tmp/mcp-unit-test-s1-key';
process.env.S2_HOST ??= '127.0.0.1';
process.env.S2_KEY_PATH ??= '/tmp/mcp-unit-test-s2-key';
process.env.ENABLE_WRITE_TOOLS ??= 'false';

const {
  decorateScopedWriteServer,
  deriveShadowWriteDecision
} = await import('../src/governance/scopedWriteGate.js');
const { registerScopedWriteTools } = await import('../src/tools/writeScoped.js');
const { WRITE_SCOPED_TOOL_NAMES } = await import('../src/tools/registrationPolicy.js');

const EXTRA = {
  sessionId: 'transport-raw-shadow',
  authInfo: {
    token: 'must-never-be-recorded',
    clientId: 'chatgpt-client',
    scopes: ['mcp:read'],
    extra: {
      governedPrincipalId: 'oauth:wealthtech-mcp-admin',
      identityAssurance: 'oauth_subject'
    }
  }
};

type Registration = {
  kind: 'tool' | 'registerTool';
  name: string;
  args: unknown[];
  callback: (...args: any[]) => Promise<any>;
};

function fakeServer() {
  const registrations: Registration[] = [];
  const server = {
    marker: 'preserved',
    tool(name: string, ...args: unknown[]) {
      registrations.push({
        kind: 'tool',
        name,
        args: args.slice(0, -1),
        callback: args.at(-1) as Registration['callback']
      });
      return { registered: name };
    },
    registerTool(name: string, config: unknown, callback: Registration['callback']) {
      registrations.push({ kind: 'registerTool', name, args: [config], callback });
      return { registered: name };
    }
  } as unknown as McpServer;
  return { server, registrations };
}

function dependencies(options: {
  mode?: 'off' | 'shadow';
  evaluate?: () => any;
  record?: (decision: any, outcome: string) => Promise<void>;
} = {}) {
  const decisions: Array<{ decision: any; outcome: string }> = [];
  let evaluates = 0;
  let reconciles = 0;
  return {
    value: {
      mode: options.mode ?? 'shadow',
      async evaluate() {
        evaluates += 1;
        return options.evaluate?.() ?? deriveShadowWriteDecision({
          mode: 'shadow',
          toolName: 'ignored-by-decorator',
          governedSessionId: '11111111-1111-4111-8111-111111111111',
          currentStateVersion: 9,
          currentFreshness: 'CURRENT',
          acknowledgedStateVersion: 9,
          activeLockConflicts: 0
        });
      },
      async record(decision: any, outcome: string) {
        decisions.push({ decision, outcome });
        await options.record?.(decision, outcome);
      },
      requestReconcile() { reconciles += 1; }
    },
    counts: () => ({ evaluates, reconciles }),
    decisions
  };
}

async function settleBeforeShadowDeadline<T>(promise: Promise<T>) {
  const timedOut = Symbol('shadow observation blocked historical handler');
  return Promise.race([
    promise.then(
      (value) => ({ status: 'fulfilled' as const, value }),
      (error) => ({ status: 'rejected' as const, error })
    ),
    new Promise<typeof timedOut>((resolve) => {
      setTimeout(() => resolve(timedOut), 100);
    })
  ]);
}

test('succès: schéma/annotations/arité et référence résultat restent exacts, handler appelé une fois', async () => {
  const fake = fakeServer();
  const deps = dependencies();
  const decorated = decorateScopedWriteServer(fake.server, deps.value);
  const schema = { allow_write: z.boolean() };
  const annotations = { readOnlyHint: false, destructiveHint: true };
  const resultReference = { content: [{ type: 'text', text: 'same-reference' }] };
  let originalCalls = 0;
  async function original(_input: unknown, _extra: unknown) {
    originalCalls += 1;
    return resultReference;
  }

  const registrationResult = (decorated as any).tool(
    'test_shadow_tool',
    'description exacte',
    schema,
    annotations,
    original
  );
  const registered = fake.registrations[0]!;
  assert.deepEqual(registrationResult, { registered: 'test_shadow_tool' });
  assert.equal((decorated as any).marker, 'preserved');
  assert.equal(registered.args[0], 'description exacte');
  assert.equal(registered.args[1], schema);
  assert.equal(registered.args[2], annotations);
  assert.equal(registered.callback.length, original.length);

  const actual = await registered.callback({ allow_write: true }, EXTRA);
  assert.equal(actual, resultReference);
  assert.equal(originalCalls, 1);
  assert.deepEqual(deps.counts(), { evaluates: 1, reconciles: 1 });
  assert.equal(deps.decisions.length, 1);
  assert.equal(deps.decisions[0]?.decision.toolName, 'test_shadow_tool');
  assert.equal(deps.decisions[0]?.outcome, 'succeeded');
});

test('Error et AbortError ressortent comme la même instance, sans reconcile et avec outcome exact', async () => {
  for (const error of [
    new Error('historical failure'),
    new DOMException('cancelled', 'AbortError')
  ]) {
    const fake = fakeServer();
    const deps = dependencies();
    const decorated = decorateScopedWriteServer(fake.server, deps.value);
    let calls = 0;
    async function original() {
      calls += 1;
      throw error;
    }
    (decorated as any).registerTool('registered_shadow_tool', {
      description: 'same config',
      inputSchema: {}
    }, original);
    const registered = fake.registrations[0]!;
    assert.equal(registered.callback.length, original.length);
    await assert.rejects(
      registered.callback({}, EXTRA),
      (actual) => actual === error
    );
    assert.equal(calls, 1);
    assert.deepEqual(deps.counts(), { evaluates: 1, reconciles: 0 });
    assert.equal(deps.decisions[0]?.outcome,
      error.name === 'AbortError' ? 'cancelled' : 'failed');
  }
});

test('une erreur evaluator/journal reste sans effet sur le résultat historique', async () => {
  for (const variant of ['evaluate', 'record'] as const) {
    const fake = fakeServer();
    const deps = dependencies({
      evaluate: variant === 'evaluate'
        ? () => { throw new Error('sensitive evaluator failure'); }
        : undefined,
      record: variant === 'record'
        ? async () => { throw new Error('sensitive journal failure'); }
        : undefined
    });
    const decorated = decorateScopedWriteServer(fake.server, deps.value);
    const result = { variant };
    let calls = 0;
    async function original() { calls += 1; return result; }
    (decorated as any).tool(`tool_${variant}`, {}, original);
    assert.equal(await fake.registrations[0]?.callback({}, EXTRA), result);
    assert.equal(calls, 1);
    assert.equal(deps.counts().reconciles, 1);
  }
});

test('un evaluator shadow qui ne répond jamais ne retarde ni le résultat ni reconcile', async () => {
  const fake = fakeServer();
  const never = new Promise<never>(() => undefined);
  const deps = dependencies({ evaluate: () => never });
  const decorated = decorateScopedWriteServer(fake.server, deps.value);
  const historicalResult = { status: 'historical-success' };
  (decorated as any).tool('never_resolving_evaluator', {}, async () => historicalResult);

  const settled = await settleBeforeShadowDeadline(
    fake.registrations[0]!.callback({}, EXTRA)
  );

  assert.notEqual(typeof settled, 'symbol');
  if (typeof settled === 'symbol') return;
  assert.equal(settled.status, 'fulfilled');
  if (settled.status === 'fulfilled') assert.equal(settled.value, historicalResult);
  assert.deepEqual(deps.counts(), { evaluates: 1, reconciles: 1 });
});

test('un journal shadow qui ne répond jamais ne retarde pas la même erreur historique', async () => {
  const fake = fakeServer();
  const never = new Promise<never>(() => undefined);
  const deps = dependencies({ record: () => never });
  const decorated = decorateScopedWriteServer(fake.server, deps.value);
  const historicalError = new Error('same historical error');
  (decorated as any).tool('never_resolving_journal', {}, async () => {
    throw historicalError;
  });

  const settled = await settleBeforeShadowDeadline(
    fake.registrations[0]!.callback({}, EXTRA)
  );

  assert.notEqual(typeof settled, 'symbol');
  if (typeof settled === 'symbol') return;
  assert.equal(settled.status, 'rejected');
  if (settled.status === 'rejected') assert.equal(settled.error, historicalError);
  assert.deepEqual(deps.counts(), { evaluates: 1, reconciles: 0 });
});

test('off reste silencieux; tous les verdicts shadow restent non bloquants', async () => {
  const offFake = fakeServer();
  const offDeps = dependencies({ mode: 'off' });
  const offDecorated = decorateScopedWriteServer(offFake.server, offDeps.value);
  const offResult = { mode: 'off' };
  (offDecorated as any).tool('off_tool', {}, async () => offResult);
  assert.equal(await offFake.registrations[0]?.callback({}, EXTRA), offResult);
  assert.deepEqual(offDeps.counts(), { evaluates: 0, reconciles: 0 });
  assert.deepEqual(offDeps.decisions, []);

  const cases = [
    {
      expected: 'session_unbound',
      input: { governedSessionId: null, currentStateVersion: 9, currentFreshness: 'CURRENT', acknowledgedStateVersion: null, activeLockConflicts: 0 }
    },
    {
      expected: 'context_unacknowledged',
      input: { governedSessionId: '11111111-1111-4111-8111-111111111111', currentStateVersion: 9, currentFreshness: 'CURRENT', acknowledgedStateVersion: null, activeLockConflicts: 0 }
    },
    {
      expected: 'state_version_stale',
      input: { governedSessionId: '11111111-1111-4111-8111-111111111111', currentStateVersion: 10, currentFreshness: 'CURRENT', acknowledgedStateVersion: 9, activeLockConflicts: 0 }
    },
    {
      expected: 'lock_conflict',
      input: { governedSessionId: '11111111-1111-4111-8111-111111111111', currentStateVersion: 9, currentFreshness: 'CURRENT', acknowledgedStateVersion: 9, activeLockConflicts: 1 }
    }
  ] as const;
  for (const entry of cases) {
    const fake = fakeServer();
    const decision = deriveShadowWriteDecision({
      mode: 'shadow',
      toolName: 'ignored',
      ...entry.input
    });
    assert.equal(decision.verdict, entry.expected);
    const deps = dependencies({ evaluate: () => decision });
    const decorated = decorateScopedWriteServer(fake.server, deps.value);
    const result = { verdict: entry.expected };
    (decorated as any).tool(`tool_${entry.expected}`, {}, async () => result);
    assert.equal(await fake.registrations[0]?.callback({}, EXTRA), result);
    assert.equal(deps.decisions[0]?.decision.verdict, entry.expected);
  }
});

test('les contrats historiques restent exacts quand registerScopedWriteTools reçoit le décorateur', async () => {
  const fixture = JSON.parse(
    await readFile('tests/fixtures/existing-tool-contracts-v1.json', 'utf8')
  ) as Record<string, unknown>;
  const deps = dependencies();
  const actual = captureToolContracts((server) => registerScopedWriteTools(
    decorateScopedWriteServer(server, deps.value)
  ));

  for (const name of WRITE_SCOPED_TOOL_NAMES) {
    assert.ok(actual[name], `Outil WRITE décoré absent : ${name}`);
    assert.deepEqual(actual[name], fixture[name], `Contrat WRITE décoré modifié : ${name}`);
  }
  assert.deepEqual(deps.counts(), { evaluates: 0, reconciles: 0 });
  assert.deepEqual(deps.decisions, []);
});
