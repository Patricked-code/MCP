import assert from 'node:assert/strict';
import { chmod, lstat, mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test, { type TestContext } from 'node:test';
import { CUG_PILOT_REPOSITORY_ID, makeCugRegisterRecord } from '../src/cug/discoveryRegister.js';
import type { CugPilotInventory } from '../src/cug/pilotInventory.js';
import { configureCugPilotReceiptConsumer, createCugPilotReceiptConsumer, startCugPilotReceiptPolling } from '../src/cug/receiptConsumer.js';
import { createCugWebhookReceiptStore } from '../src/cug/webhook.js';

const installationId = 173915815;
const deliveryId = (prefix: string) => `${prefix}fa8dc2-e47f-11f1-92bf-fd9772b274a6`;
const observedAt = '2026-11-20T01:20:00.000Z';
const inventory: CugPilotInventory = {
  schemaVersion: 1, source: 'GITHUB_API_CUG_INSTALLATION', observedAt,
  repository: {
    githubRepositoryId: CUG_PILOT_REPOSITORY_ID, githubOwnerId: 299685687,
    ownerLogin: 'chainsolutions-wealthtech', name: 'universal-agent-engineering-system',
    htmlUrl: 'https://github.com/chainsolutions-wealthtech/universal-agent-engineering-system',
    defaultBranch: 'main', visibility: 'public', archived: false, fork: false
  },
  apps: { coverage: 'PARTIAL', confirmed: [{ name: 'CUG', appId: 5417646, installationId }], otherApps: 'UNVERIFIED' },
  registryCandidate: { status: 'NO_NAME_MATCH', observedRegistryDigest: 'b'.repeat(64), matchCount: 0,
    serverBinding: 'NOT_VERIFIED', provisioningAuthorized: false }
};

async function fixture(t: TestContext) {
  const root = await mkdtemp(join(tmpdir(), 'cug-consumer-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const receiptDirectory = join(root, 'receipts');
  const inventoryDirectory = join(root, 'inventory');
  const record = createCugWebhookReceiptStore(receiptDirectory);
  const put = async (id: string, installation = installationId) => record(makeCugRegisterRecord({
    deliveryId: id, event: 'repository', action: 'edited', installationId: installation,
    repositoryId: CUG_PILOT_REPOSITORY_ID, receivedAt: observedAt, payloadDigest: 'a'.repeat(64)
  }, { id: 1, name: 'not-a-trusted-repository' }));
  return { put, inventoryDirectory, receiptDirectory, installationId };
}

test('projects a receipt once and restarts without calling GitHub again', async (t) => {
  const fixtureData = await fixture(t);
  const id = deliveryId('aa');
  assert.equal(await fixtureData.put(id), 'stored');
  let calls = 0;
  const deps = { ...fixtureData, collect: async (id: number) => { assert.equal(id, installationId); calls++; return inventory; } };
  assert.equal((await createCugPilotReceiptConsumer(deps).run()).stored, 1);
  assert.equal((await createCugPilotReceiptConsumer(deps).run()).alreadyStored, 1);
  assert.equal(calls, 1);
  assert.equal(await fixtureData.put(id), 'duplicate');
  assert.deepEqual(await readdir(fixtureData.inventoryDirectory), [id + '.json']);
  assert.equal((await lstat(join(fixtureData.inventoryDirectory, id + '.json'))).mode & 0o777, 0o600);
});

test('wraps the scan for earlier arrivals, retries failures, and ignores other installations', async (t) => {
  const f = await fixture(t);
  await f.put(deliveryId('bb'));
  await f.put(deliveryId('ee'));
  await f.put(deliveryId('ff'), installationId + 1);
  let calls = 0;
  const consumer = createCugPilotReceiptConsumer({ ...f, maxRefreshes: 1, collect: async () => {
    if (++calls === 1) throw Error('unavailable');
    return inventory;
  } });
  assert.equal((await consumer.run()).failed, 1);
  await f.put(deliveryId('00'));
  assert.equal((await consumer.run()).stored, 1);
  assert.equal((await consumer.run()).outOfScope, 1);
  assert.equal((await consumer.run()).stored, 1);
  assert.equal((await consumer.run()).stored, 1);
  assert.deepEqual((await readdir(f.inventoryDirectory)).sort(), ['00', 'bb', 'ee'].map(x => deliveryId(x) + '.json'));
});

test('concurrent publication cannot duplicate a result and an invalid checkpoint fails closed', async (t) => {
  const f = await fixture(t);
  const id = deliveryId('ab');
  await f.put(id);
  const deps = { ...f, collect: async () => inventory };
  const results = await Promise.all([createCugPilotReceiptConsumer(deps).run(), createCugPilotReceiptConsumer(deps).run()]);
  assert.equal(results.reduce((sum, result) => sum + result.stored, 0), 1);
  assert.deepEqual(await readdir(f.inventoryDirectory), [id + '.json']);
  const path = join(f.inventoryDirectory, id + '.json');
  await writeFile(path, '{}\n');
  assert.equal((await createCugPilotReceiptConsumer(deps).run()).failed, 1);
  await chmod(path, 0o644);
  assert.equal((await createCugPilotReceiptConsumer(deps).run()).failed, 1);
});

test('distinguishes missing coverage from other failures without publishing an inventory', async (t) => {
  const f = await fixture(t);
  await f.put(deliveryId('aa'));
  const consumer = createCugPilotReceiptConsumer({ ...f, collect: async () => {
    throw Error('CUG_PILOT_INSTALLATION_NOT_ATTESTED');
  } });
  assert.deepEqual(await consumer.run(), { stored: 0, alreadyStored: 0, outOfScope: 0, coverageUnverified: 1, failed: 0 });
  assert.deepEqual(await readdir(f.inventoryDirectory), []);
  assert.equal((await consumer.run()).coverageUnverified, 1);
});

test('starts polling without manual action only when both flags and an installation are configured', async (t) => {
  const f = await fixture(t);
  await f.put(deliveryId('aa'));
  const scope = { enabled: true, webhookEnabled: true, rawInstallationId: String(installationId) };
  let starts = 0;
  let stop: (() => void) | undefined;
  t.after(() => stop?.());
  let resolveCycle!: () => void;
  let rejectCycle!: (error: Error) => void;
  const cycle = new Promise<void>((resolve, reject) => { resolveCycle = resolve; rejectCycle = reject; });
  const start = (id: number) => {
    starts++;
    const consumer = createCugPilotReceiptConsumer({ ...f, installationId: id, collect: async () => inventory });
    stop = startCugPilotReceiptPolling({ run: consumer.run, onSummary: (summary) => {
      if (summary.stored === 1) resolveCycle();
      else rejectCycle(Error('expected automatic publication'));
    }, onError: () => rejectCycle(Error('unexpected polling error')) });
  };
  assert.equal(configureCugPilotReceiptConsumer({ ...scope, enabled: false }, start), 'disabled');
  assert.equal(configureCugPilotReceiptConsumer({ ...scope, webhookEnabled: false }, start), 'invalid');
  assert.equal(configureCugPilotReceiptConsumer({ ...scope, rawInstallationId: '0' }, start), 'invalid');
  assert.equal(starts, 0);
  assert.equal(configureCugPilotReceiptConsumer(scope, start), 'started');
  await cycle;
  assert.equal(starts, 1);
});
