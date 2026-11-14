import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { chmod, lstat, mkdir, mkdtemp, readFile, readdir, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test, { type TestContext } from 'node:test';
import express from 'express';
import { CUG_WEBHOOK_PATH, createCugWebhookReceiptStore, createCugWebhookRouter, readCugWebhookSecret } from '../src/cug/webhook.js';
import { listCugRegister } from '../src/cug/discoveryRegister.js';

const key = 'ab'.repeat(32);
const id = '12345678-1234-1234-1234-123456789abc';
const installation = 987654321;
const sample = {
  action: 'renamed',
  installation: { id: installation, app_id: 5417646 },
  repository: {
    id: 1429189311, name: 'universal-agent-engineering-system',
    owner: { id: 299685687, login: 'chainsolutions-wealthtech', ignored: 'not-persisted' },
    html_url: 'https://github.com/chainsolutions-wealthtech/universal-agent-engineering-system',
    description: 'fixture-raw-value'
  }
};

function sign(raw: string) {
  return 'sha256=' + createHmac('sha256', key).update(raw).digest('hex');
}

async function fixture(t: TestContext) {
  const root = await mkdtemp(join(tmpdir(), 'cug-webhook-'));
  const directory = join(root, 'receipts');
  let enabled = true;
  let configuredId = String(installation);
  let secretAvailable = true;
  let record = createCugWebhookReceiptStore(directory);
  const app = express();
  app.use(createCugWebhookRouter({
    enabled: () => enabled,
    pilotInstallationId: () => configuredId,
    readSecret: async () => {
      if (!secretAvailable) throw Error('unavailable');
      return Buffer.from(key);
    },
    record: (receipt) => record(receipt)
  }));
  app.use(express.json());
  app.get('/health', (_req, res) => res.sendStatus(200));
  app.post('/existing-json', (req, res) => res.json(req.body));
  const server = app.listen(0, '127.0.0.1');
  t.after(async () => {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) => server.close((err) => err ? reject(err) : resolve()));
    await rm(root, { recursive: true, force: true });
  });
  await new Promise<void>((resolve, reject) => server.once('listening', resolve).once('error', reject));
  const address = server.address();
  assert(address && typeof address !== 'string');
  const base = `http://127.0.0.1:${address.port}`;
  return {
    root, directory, base,
    disable: () => { enabled = false; },
    unsetInstallation: () => { configuredId = ''; },
    loseSecret: () => { secretAvailable = false; },
    reopenStore: () => { record = createCugWebhookReceiptStore(directory); },
    post: (raw = JSON.stringify(sample), overrides: Record<string, string> = {}) =>
      fetch(base + CUG_WEBHOOK_PATH, {
        method: 'POST', body: raw,
        headers: {
          'Content-Type': 'application/json',
          'X-GitHub-Event': 'repository',
          'X-GitHub-Delivery': id,
          'X-Hub-Signature-256': sign(raw),
          ...overrides
        }
      })
  };
}

test('opt-in route is inactive without touching storage or existing handlers', async (t) => {
  const f = await fixture(t);
  f.disable();
  assert.equal((await f.post()).status, 404);
  assert.equal((await fetch(f.base + '/health')).status, 200);
  const oldRoute = await fetch(f.base + '/existing-json', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"old":true}'
  });
  assert.deepEqual(await oldRoute.json(), { old: true });
  assert.deepEqual(await readdir(f.root), []);
});

test('rejects absent or invalid signature, invalid delivery ID, malformed JSON and oversized bodies', async (t) => {
  const f = await fixture(t);
  assert.equal((await f.post(undefined, { 'X-Hub-Signature-256': '' })).status, 401);
  assert.equal((await f.post(undefined, { 'X-Hub-Signature-256': sign('different') })).status, 401);
  assert.equal((await f.post(undefined, { 'X-GitHub-Delivery': '../../outside' })).status, 400);
  assert.equal((await f.post('{invalid')).status, 400);
  assert.equal((await f.post(undefined, { 'Content-Type': 'text/plain' })).status, 415);
  assert.equal((await f.post(undefined, { 'Content-Encoding': 'gzip' })).status, 415);
  assert.equal((await f.post(' '.repeat(2 * 1024 * 1024 + 1))).status, 413);
  assert.deepEqual(await readdir(f.root), []);
});

test('acknowledges signed ping and ignores unrelated event, installation, app and repository', async (t) => {
  const f = await fixture(t);
  assert.equal((await f.post('{}', { 'X-GitHub-Event': 'ping' })).status, 204);
  assert.equal((await f.post(undefined, { 'X-GitHub-Event': 'push' })).status, 204);
  assert.equal((await f.post(JSON.stringify({ ...sample, installation: { id: 123 } }))).status, 204);
  assert.equal((await f.post(JSON.stringify({ ...sample, installation: { id: installation, app_id: 42 } }))).status, 204);
  assert.equal((await f.post(JSON.stringify({ ...sample, repository: { id: 123 } }))).status, 204);
  assert.deepEqual(await readdir(f.root), []);
});

test('persists a minimal receipt before acknowledging, deduplicates across restarts and rejects a delivery collision', async (t) => {
  const f = await fixture(t);
  const raw = JSON.stringify(sample, null, 2) + '\n';
  assert.equal((await f.post(raw)).status, 202);
  f.reopenStore();
  assert.equal((await f.post(raw, { 'X-GitHub-Delivery': id.toUpperCase() })).status, 204);
  assert.equal((await f.post(raw, { 'X-GitHub-Event': 'installation' })).status, 409);
  assert.equal((await f.post(JSON.stringify(sample))).status, 409);
  assert.deepEqual(await readdir(f.directory), [id + '.json']);
  const path = join(f.directory, id + '.json');
  const content = await readFile(path, 'utf8');
  const saved = JSON.parse(content);
  assert.deepEqual(Object.keys(saved).sort(), [
    'action', 'deliveryId', 'event', 'installationId', 'observation', 'payloadDigest',
    'receivedAt', 'repositoryId', 'suggestion', 'version'
  ]);
  assert.equal(saved.repositoryId, sample.repository.id);
  assert.equal(saved.event, 'repository');
  assert.equal(saved.action, 'renamed');
  assert.equal(saved.installationId, installation);
  assert.equal(saved.version, 2);
  assert.deepEqual(saved.observation.repository, {
    githubRepositoryId: sample.repository.id, githubOwnerId: sample.repository.owner.id,
    ownerLogin: sample.repository.owner.login, name: sample.repository.name, htmlUrl: sample.repository.html_url
  });
  assert.equal(saved.observation.verification, 'PENDING_GITHUB_API');
  assert.equal(saved.observation.extensions['github.installations.v1'].reportingAppId, 5417646);
  assert.equal(saved.observation.extensions['github.installations.v1'].reportingAppName, 'CUG');
  assert.equal(saved.observation.extensions['github.installations.v1'].coverageOfOtherApps, 'UNVERIFIED');
  assert.deepEqual(saved.suggestion, { kind: 'REFRESH_GITHUB_INVENTORY', status: 'PROPOSED', automaticExecution: false });
  assert(!content.includes('fixture-raw-value'));
  assert(!content.includes('not-persisted'));
  assert.equal((await lstat(path)).mode & 0o777, 0o600);
});

test('concurrent delivery retries produce only one stored receipt', async (t) => {
  const f = await fixture(t);
  const results = await Promise.all(Array.from({ length: 8 }, () => f.post()));
  assert.deepEqual(results.map((response) => response.status).sort(), [202, 204, 204, 204, 204, 204, 204, 204]);
  assert.deepEqual(await readdir(f.directory), [id + '.json']);
});

test('accepts installation lifecycle and repository-scope events without retaining repository lists', async (t) => {
  const f = await fixture(t);
  for (const [index, event] of ['installation', 'installation_repositories'].entries()) {
    assert.equal((await f.post(JSON.stringify({
      action: index === 0 ? 'suspend' : 'added', installation: sample.installation,
      repositories_added: [sample.repository]
    }), { 'X-GitHub-Event': event, 'X-GitHub-Delivery': id.slice(0, -1) + index })).status, 202);
  }
  assert.equal((await readdir(f.directory)).length, 2);
  const page = await listCugRegister(f.directory);
  assert(page.records.every((row) => row.version === 2 && row.observation.repository === null));
});

test('projects incomplete or non-canonical metadata as unknown and keeps an ID-only trace', async (t) => {
  const f = await fixture(t);
  const raw = JSON.stringify({ ...sample, repository: {
    ...sample.repository, html_url: 'https://example.org/secret-path',
    serverPath: '/should/not/be/stored', action: 'provision'
  }});
  assert.equal((await f.post(raw)).status, 202);
  const { records } = await listCugRegister(f.directory);
  assert.equal(records.length, 1);
  const row = records[0]!;
  assert.equal(row.version === 2 && row.observation.repository, null);
  assert(!JSON.stringify(row).includes('secret-path'));
  assert(!JSON.stringify(row).includes('should/not'));
});

test('lists paginated records across versions and preserves v1 replay compatibility', async (t) => {
  const f = await fixture(t);
  assert.deepEqual(await listCugRegister(f.directory), { records: [], nextCursor: null });
  assert.equal((await f.post()).status, 202);
  const path = join(f.directory, id + '.json');
  const saved = JSON.parse(await readFile(path, 'utf8'));
  const { observation: _observation, suggestion: _suggestion, ...legacy } = saved;
  await writeFile(path, JSON.stringify({ ...legacy, version: 1 }));
  f.reopenStore();
  assert.equal((await f.post()).status, 204);
  const id2 = id.slice(0, -1) + 'd';
  assert.equal((await f.post(undefined, { 'X-GitHub-Delivery': id2 })).status, 202);
  const page = await listCugRegister(f.directory, { limit: 1 });
  assert.deepEqual(page.records.map((row) => row.version), [1]);
  assert.equal(page.nextCursor, id);
  const next = await listCugRegister(f.directory, { after: page.nextCursor! });
  assert.deepEqual(next.records.map((row) => row.version), [2]);
  assert.equal(next.nextCursor, null);
  await assert.rejects(listCugRegister(f.directory, { after: '../' }));
  await assert.rejects(listCugRegister(f.directory, { limit: 201 }));
});

test('fails closed if the operator secret, installation ID, or private storage is unavailable', async (t) => {
  const f = await fixture(t);
  await mkdir(f.directory, { mode: 0o755 });
  assert.equal((await f.post()).status, 503);
  await chmod(f.directory, 0o700);
  await symlink(join(f.root, 'other'), join(f.directory, id + '.json'));
  assert.equal((await f.post()).status, 503);
  await rm(f.directory, { recursive: true });
  f.loseSecret();
  assert.equal((await f.post()).status, 503);
  f.unsetInstallation();
  assert.equal((await f.post()).status, 503);
  assert.deepEqual(await readdir(f.root), []);
});

test('secret must be a private, regular, bounded hex-text file', async (t) => {
  const f = await fixture(t);
  const path = join(f.root, 'secret');
  await writeFile(path, key + '\n', { mode: 0o600 });
  assert.deepEqual(await readCugWebhookSecret(path), Buffer.from(key));
  const alias = join(f.root, 'alias');
  await symlink(path, alias);
  await assert.rejects(readCugWebhookSecret(alias));
  await chmod(path, 0o640);
  await assert.rejects(readCugWebhookSecret(path));
  await chmod(path, 0o600);
  await writeFile(path, key + '\n\n');
  await assert.rejects(readCugWebhookSecret(path));
});
