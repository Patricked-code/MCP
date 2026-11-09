import assert from 'node:assert/strict';
import { createHash, createHmac } from 'node:crypto';
import { fork } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

process.env.MCP_AUTH_TOKEN ??= 'mcp-unit-test-value-20260805-abcdef';
process.env.S1_HOST ??= '127.0.0.1';
process.env.S1_KEY_PATH ??= '/tmp/mcp-unit-test-s1-key';
process.env.S2_HOST ??= '127.0.0.1';
process.env.S2_KEY_PATH ??= '/tmp/mcp-unit-test-s2-key';
process.env.MCP_WEB_BASE_URL ??= 'https://mcp.wealthtechinnovations.com';

const { inspectOauthAccessToken } = await import('../src/oauth.js');
const { createOAuthRefreshGrantService } = await import('../src/oauthRefreshTokens.js');
const { createOAuthAuthorizationCodeService } = await import('../src/oauthAuthorizationCodes.js');

function base64Url(value: string): string {
  return Buffer.from(value).toString('base64url');
}

function signedAccessToken(overrides: Record<string, unknown> = {}): string {
  const now = Math.floor(Date.now() / 1_000);
  const header = base64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = base64Url(JSON.stringify({
    typ: 'wealthtech-mcp-oauth',
    iss: 'https://mcp.wealthtechinnovations.com',
    aud: 'https://mcp.wealthtechinnovations.com',
    resource: 'https://mcp.wealthtechinnovations.com',
    sub: 'wealthtech-mcp-admin',
    client_id: 'chatgpt-client',
    scope: 'mcp:read offline_access',
    iat: now,
    exp: now + 3_600,
    jti: 'durable-auth-test',
    oauth_attempt_ref: 'oa_abcdefghijklmnopqrstuv',
    grant_id: '11111111-1111-4111-8111-111111111111',
    ...overrides
  }));
  const input = `${header}.${body}`;
  const signature = createHmac('sha256', process.env.MCP_AUTH_TOKEN!).update(input).digest('base64url');
  return `${input}.${signature}`;
}

test('A3.2 projette des références OAuth bornées sans exposer de token brut', () => {
  const identity = inspectOauthAccessToken(signedAccessToken(), 'mcp:read');
  assert.deepEqual(identity, {
    subject: 'wealthtech-mcp-admin',
    clientId: 'chatgpt-client',
    scopes: ['mcp:read', 'offline_access'],
    expiresAt: identity?.expiresAt,
    oauthAttemptRef: 'oa_abcdefghijklmnopqrstuv',
    oauthGrantId: '11111111-1111-4111-8111-111111111111'
  });
  assert.equal(Object.hasOwn(identity ?? {}, 'token'), false);
  assert.equal(Object.hasOwn(identity ?? {}, 'refreshToken'), false);
});

test('refresh token durable: rotation, hash-only persistence et replay revocation', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'mcp-oauth-refresh-'));
  const storePath = path.join(directory, 'refresh-grants.json');
  let now = new Date('2026-09-30T00:00:00.000Z');

  try {
    const service = createOAuthRefreshGrantService({
      storePath,
      idleTtlSeconds: 30 * 24 * 60 * 60,
      absoluteTtlSeconds: 90 * 24 * 60 * 60,
      now: () => now
    });

    const issued = await service.issue({
      subject: 'wealthtech-mcp-admin',
      clientId: 'chatgpt-client',
      resource: 'https://mcp.wealthtechinnovations.com',
      scopes: ['mcp:read', 'offline_access'],
      oauthAttemptRef: 'oa_abcdefghijklmnopqrstuv'
    });

    assert.match(issued.refreshToken, /^mcp_rt1\.[0-9a-f-]{36}\.0\.[A-Za-z0-9_-]{32,}$/);
    assert.match(issued.grantId, /^[0-9a-f-]{36}$/);

    const persistedAfterIssue = await readFile(storePath, 'utf8');
    assert.equal(persistedAfterIssue.includes(issued.refreshToken), false);
    assert.equal(persistedAfterIssue.includes(createHash('sha256').update(issued.refreshToken).digest('hex')), true);

    now = new Date('2026-09-30T01:00:00.000Z');
    const rotated = await service.rotate({
      refreshToken: issued.refreshToken,
      clientId: 'chatgpt-client',
      resource: 'https://mcp.wealthtechinnovations.com'
    });

    assert.equal(rotated.grantId, issued.grantId);
    assert.equal(rotated.oauthAttemptRef, 'oa_abcdefghijklmnopqrstuv');
    assert.deepEqual(rotated.scopes, ['mcp:read', 'offline_access']);
    assert.notEqual(rotated.refreshToken, issued.refreshToken);
    assert.match(rotated.refreshToken, /^mcp_rt1\.[0-9a-f-]{36}\.1\.[A-Za-z0-9_-]{32,}$/);

    await assert.rejects(
      service.rotate({
        refreshToken: issued.refreshToken,
        clientId: 'chatgpt-client',
        resource: 'https://mcp.wealthtechinnovations.com'
      }),
      /OAUTH_REFRESH_TOKEN_REPLAY/
    );

    await assert.rejects(
      service.rotate({
        refreshToken: rotated.refreshToken,
        clientId: 'chatgpt-client',
        resource: 'https://mcp.wealthtechinnovations.com'
      }),
      /OAUTH_REFRESH_GRANT_REVOKED/
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('two independent refresh grant services cannot both consume one generation', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'mcp-oauth-race-'));
  const storePath = path.join(directory, 'refresh-grants.json');
  const createService = () => createOAuthRefreshGrantService({
    storePath,
    idleTtlSeconds: 3600,
    absoluteTtlSeconds: 86400,
    lockTimeoutMs: 1000
  });
  try {
    const issuer = createService();
    const issued = await issuer.issue({
      subject: 'oauth-race-test',
      clientId: 'race-client',
      resource: 'https://mcp.wealthtechinnovations.com',
      scopes: ['mcp:read', 'offline_access'],
      oauthAttemptRef: 'oa_abcdefghijklmnopqrstuv'
    });
    const a = createService();
    const b = createService();
    const results = await Promise.allSettled([
      a.rotate({ refreshToken: issued.refreshToken, clientId: 'race-client' }),
      b.rotate({ refreshToken: issued.refreshToken, clientId: 'race-client' })
    ]);
    assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1,
      'one refresh generation must never be accepted twice');
    assert.equal(results.filter((result) => result.status === 'rejected').length, 1);
    const persisted = JSON.parse(await readFile(storePath, 'utf8'));
    assert.equal(persisted.grants.length, 1);
    assert.equal(persisted.grants[0].currentGeneration, 1);
    assert.equal(persisted.grants[0].revokedAt !== null, true,
      'a replayed predecessor revokes the entire existing family');
    assert.equal(persisted.grants[0].revokeReason, 'replay_detected');
    const successor = results.find((result) => result.status === 'fulfilled');
    if (!successor || successor.status !== 'fulfilled') throw new Error('NO_SUCCESSOR');
    await assert.rejects(
      createService().rotate({ refreshToken: successor.value.refreshToken, clientId: 'race-client' }),
      /OAUTH_REFRESH_GRANT_REVOKED/
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('two OS processes never both accept the same refresh generation', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'mcp-oauth-multiprocess-'));
  const storePath = path.join(directory, 'refresh-grants.json');
  const issuer = createOAuthRefreshGrantService({
    storePath, idleTtlSeconds: 3600, absoluteTtlSeconds: 86400
  });
  const workers: ReturnType<typeof fork>[] = [];
  try {
    const issued = await issuer.issue({
      subject: 'oauth-multiprocess-test',
      clientId: 'race-client',
      resource: 'https://mcp.wealthtechinnovations.com',
      scopes: ['mcp:read', 'offline_access'],
      oauthAttemptRef: 'oa_abcdefghijklmnopqrstuv'
    });
    const createWorker = () => {
      const child = fork(new URL('./fixtures/oauthRefreshTransactionWorker.mjs', import.meta.url), [], {
        execArgv: ['--import', 'tsx'],
        silent: true
      });
      workers.push(child);
      let readyResolve!: () => void;
      let readyReject!: (reason?: unknown) => void;
      let resultResolve!: (result: string) => void;
      let resultReject!: (reason?: unknown) => void;
      const ready = new Promise<void>((resolve, reject) => {
        readyResolve = resolve;
        readyReject = reject;
      });
      const result = new Promise<string>((resolve, reject) => {
        resultResolve = resolve;
        resultReject = reject;
      });
      // Attach rejection handlers immediately to avoid an unhandled rejection
      // if a worker exits before the test awaits the result.
      void result.catch(() => undefined);
      let done = false;
      const timer = setTimeout(() => {
        if (done) return;
        done = true;
        child.kill();
        const error = new Error('OAUTH_TEST_WORKER_TIMEOUT');
        readyReject(error);
        resultReject(error);
      }, 15000);
      child.on('message', (message: { kind?: string; outcome?: string }) => {
        if (message.kind === 'READY') readyResolve();
        if (message.kind === 'RESULT' && !done) {
          done = true;
          clearTimeout(timer);
          resultResolve(message.outcome ?? 'MISSING_OUTCOME');
        }
      });
      child.once('error', (error) => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        readyReject(error);
        resultReject(error);
      });
      child.once('exit', (code) => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        const error = new Error(`OAUTH_TEST_WORKER_EXIT_${code}`);
        readyReject(error);
        resultReject(error);
      });
      return { child, ready, result };
    };
    const first = createWorker();
    const second = createWorker();
    await Promise.all([first.ready, second.ready]);
    // Both processes begin the read-modify-write using their own store
    // instances, against the same mounted JSON file and transaction lock.
    first.child.send({ kind: 'ROTATE', storePath, refreshToken: issued.refreshToken });
    second.child.send({ kind: 'ROTATE', storePath, refreshToken: issued.refreshToken });
    const outcomes = await Promise.all([first.result, second.result]);
    assert.deepEqual(outcomes.sort(), ['OAUTH_REFRESH_TOKEN_REPLAY', 'SUCCESS']);
    const stored = JSON.parse(await readFile(storePath, 'utf8'));
    assert.equal(stored.grants[0].currentGeneration, 1);
    assert.equal(stored.grants[0].revokeReason, 'replay_detected');
    assert.equal(stored.storeRevision, 3, 'issue, single rotation, then replay revocation');
  } finally {
    for (const child of workers) child.kill();
    await rm(directory, { recursive: true, force: true });
  }
});

test('interrupted refresh transaction remains fail-closed, then orderly restart uses persisted revision', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'mcp-oauth-restart-'));
  const storePath = path.join(directory, 'refresh-grants.json');
  const lockPath = `${storePath}.transaction-lock`;
  const createService = () => createOAuthRefreshGrantService({
    storePath,
    idleTtlSeconds: 3600,
    absoluteTtlSeconds: 86400,
    lockTimeoutMs: 100
  });
  try {
    const issued = await createService().issue({
      subject: 'oauth-restart-test',
      clientId: 'restart-client',
      resource: 'https://mcp.wealthtechinnovations.com',
      scopes: ['mcp:read', 'offline_access'],
      oauthAttemptRef: 'oa_abcdefghijklmnopqrstuv'
    });
    await mkdir(lockPath, { mode: 0o700 }); // simulate a lock left by a crashed owner
    await assert.rejects(
      createService().rotate({ refreshToken: issued.refreshToken, clientId: 'restart-client' }),
      /OPERATIONAL_STORE_LOCK_TIMEOUT/,
      'never bypass an unverified lock after a crash'
    );
    assert.equal(JSON.parse(await readFile(storePath, 'utf8')).grants[0].currentGeneration, 0);
    await rm(lockPath, { recursive: true });
    const rotated = await createService().rotate({
      refreshToken: issued.refreshToken, clientId: 'restart-client'
    });
    assert.equal(JSON.parse(await readFile(storePath, 'utf8')).grants[0].currentGeneration, 1);
    const restarted = createService();
    const again = await restarted.rotate({ refreshToken: rotated.refreshToken, clientId: 'restart-client' });
    assert.equal(JSON.parse(await readFile(storePath, 'utf8')).grants[0].currentGeneration, 2);
    assert.notEqual(again.refreshToken, rotated.refreshToken);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('durable OAuth authorization codes store only their hash and are consumed exactly once', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'mcp-oauth-codes-durable-'));
  const storePath = path.join(directory, 'codes.json');
  const record = {
    clientId: 'https://client.example/oauth-client',
    redirectUri: 'https://client.example/callback',
    scope: 'mcp:read',
    resource: 'https://mcp.wealthtechinnovations.com',
    codeChallenge: 'A'.repeat(43),
    codeChallengeMethod: 'S256' as const,
    subject: 'wealthtech-mcp-admin',
    oauthAttemptRef: 'oa_abcdefghijklmnopqrstuv',
    expiresAt: Date.now() + 300000
  };
  const service = () => createOAuthAuthorizationCodeService({ storePath });
  try {
    const rawCode = await service().issue(record);
    assert.match(rawCode, /^[A-Za-z0-9_-]{43}$/);
    const persisted = await readFile(storePath, 'utf8');
    assert.equal(persisted.includes(rawCode), false);
    assert.equal(persisted.includes(createHash('sha256').update(rawCode).digest('hex')), true);
    // A fresh instance after a restart sees the same durable record.
    const twoIndependentReaders = await Promise.all([
      service().consume(rawCode),
      service().consume(rawCode)
    ]);
    assert.equal(twoIndependentReaders.filter(Boolean).length, 1);
    assert.deepEqual(twoIndependentReaders.find(Boolean), record);
    assert.equal(await service().consume(rawCode), null);
    const state = JSON.parse(await readFile(storePath, 'utf8'));
    assert.equal(state.codes.length, 0);
    assert.equal(state.storeRevision, 2, 'issue and single consumption');
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('expired OAuth authorization codes never resume after restart or exchange', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'mcp-oauth-codes-expiry-'));
  const storePath = path.join(directory, 'codes.json');
  let now = Date.parse('2026-11-09T00:00:00Z');
  const service = () => createOAuthAuthorizationCodeService({ storePath, now: () => now });
  try {
    const rawCode = await service().issue({
      clientId: 'client', redirectUri: 'https://client.example/callback',
      scope: 'mcp:read', resource: 'https://mcp.wealthtechinnovations.com',
      codeChallenge: 'B'.repeat(43), codeChallengeMethod: 'S256',
      subject: 'wealthtech-mcp-admin',
      oauthAttemptRef: 'oa_abcdefghijklmnopqrstuv',
      expiresAt: now + 60_000
    });
    now += 61_000;
    assert.equal(await service().consume(rawCode), null);
    assert.equal(await service().consume(rawCode), null);
    assert.equal(JSON.parse(await readFile(storePath, 'utf8')).codes.length, 0);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('le serveur OAuth annonce refresh_token et offline_access de façon additive', async () => {
  const source = await readFile(new URL('../src/oauth.ts', import.meta.url), 'utf8');

  assert.match(source, /grant_types_supported:[^\n]*authorization_code[^\n]*refresh_token/s);
  assert.match(source, /SUPPORTED_SCOPES[^\n]*offline_access/s);
  assert.match(source, /grantType\s*===\s*['"]refresh_token['"]/);
  assert.match(source, /refresh_token/);
  assert.match(source, /offline_access/);
});


test('A3.3 est un complément bloqué derrière A3.2 et ne crée aucune autorité runtime', async () => {
  const program = JSON.parse(
    await readFile(new URL('../docs/governance/program-backlog-convergence.json', import.meta.url), 'utf8')
  );
  const a32 = (program.taskBlueprints ?? []).find((entry: any) => entry.id === 'TB-W3-A3-02');
  const a33 = (program.taskBlueprints ?? []).find((entry: any) => entry.id === 'TB-W3-A3-03');

  assert.equal(a32?.readiness?.state, 'READY');
  assert.ok(a33);
  assert.deepEqual(a33.dependsOn, ['TB-W3-A3-02']);
  assert.equal(a33.readiness?.state, 'BLOCKED');
  assert.equal(a33.integrationStrategy, 'EXTEND');
  assert.equal(a33.materialization?.createsRuntimeTask, false);
  assert.equal(program.executionModel?.currentReadyBlueprintIds?.includes('TB-W3-A3-03'), false);

  const intake = (program.programIntakes ?? []).find(
    (entry: any) => entry.id === 'INTAKE-OAUTH-REFRESH-20260930'
  );
  assert.equal(intake?.createsParallelProgram, false);
  assert.equal(intake?.createsRuntimeTasks, false);
  assert.deepEqual(intake?.targetBlueprintIds, ['TB-W3-A3-02', 'TB-W3-A3-03']);
});
