import { createHash, randomUUID } from 'node:crypto';
import { constants } from 'node:fs';
import { link, mkdir, open, unlink, type FileHandle } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { CUG_APP_ID } from './admission.js';
import { CUG_PILOT_REPOSITORY_ID, asRecord, listCugRegisterDeliveryIds,
  readCugRegisterRecord, type CugRegisterRecord } from './discoveryRegister.js';
import type { CugPilotInventory } from './pilotInventory.js';

const MAX_RESULT_BYTES = 8192;
const SCAN_LIMIT = 100;
const REFRESH_LIMIT = 4;
const POLL_MS = 60_000;

export type CugPilotReceiptSummary = {
  stored: number; alreadyStored: number; outOfScope: number; coverageUnverified: number; failed: number;
};

type Dependencies = {
  receiptDirectory: string;
  inventoryDirectory: string;
  installationId: number;
  collect: (installationId: number) => Promise<CugPilotInventory>;
  maxRefreshes?: number;
};

function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

function checkInventory(input: unknown, receipt: CugRegisterRecord): void {
  const inventory = asRecord(input);
  const apps = asRecord(inventory?.apps);
  const confirmed = Array.isArray(apps?.confirmed) && apps.confirmed.length === 1
    ? asRecord(apps.confirmed[0]) : undefined;
  const candidate = asRecord(inventory?.registryCandidate);
  if (inventory?.schemaVersion !== 1 || inventory.source !== 'GITHUB_API_CUG_INSTALLATION'
    || asRecord(inventory.repository)?.githubRepositoryId !== receipt.repositoryId
    || confirmed?.appId !== Number(CUG_APP_ID) || confirmed.installationId !== receipt.installationId
    || candidate?.provisioningAuthorized !== false || candidate.serverBinding !== 'NOT_VERIFIED') {
    throw Error('CUG_RECEIPT_INVENTORY_IDENTITY_MISMATCH');
  }
}

async function openPrivateDirectory(directory: string): Promise<FileHandle> {
  const dir = await open(directory, constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW);
  try {
    if (((await dir.stat()).mode & 0o777) !== 0o700) throw Error('CUG_RECEIPT_INVENTORY_DIRECTORY_UNAVAILABLE');
    return dir;
  } catch (error) {
    await dir.close();
    throw error;
  }
}

async function hasOutcome(path: string, receipt: CugRegisterRecord): Promise<boolean> {
  let file: FileHandle;
  try { file = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false; throw error; }
  try {
    const stat = await file.stat();
    if (!stat.isFile() || (stat.mode & 0o777) !== 0o600 || stat.size < 1 || stat.size > MAX_RESULT_BYTES) {
      throw Error('CUG_RECEIPT_INVENTORY_UNAVAILABLE');
    }
    const bytes = Buffer.alloc(stat.size + 1);
    let size = 0;
    while (size < bytes.length) {
      const { bytesRead } = await file.read(bytes, size, bytes.length - size, null);
      if (!bytesRead) break;
      size += bytesRead;
    }
    if (size !== stat.size) throw Error('CUG_RECEIPT_INVENTORY_UNAVAILABLE');
    const result = asRecord(JSON.parse(bytes.subarray(0, size).toString('utf8')));
    if (result?.schemaVersion !== 1 || result.deliveryId !== receipt.deliveryId
      || result.payloadDigest !== receipt.payloadDigest || result.installationId !== receipt.installationId
      || result.inventoryDigest !== sha256(JSON.stringify(result.inventory) ?? '')) {
      throw Error('CUG_RECEIPT_INVENTORY_CONFLICT');
    }
    checkInventory(result.inventory, receipt);
    return true;
  } finally { await file.close(); }
}

async function syncDirectory(directory: string, dir: FileHandle): Promise<void> {
  await dir.sync();
  const parent = await open(dirname(directory), constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW);
  try { await parent.sync(); } finally { await parent.close(); }
}

async function storeOutcome(directory: string, path: string, dir: FileHandle, receipt: CugRegisterRecord,
  inventory: CugPilotInventory): Promise<'stored' | 'alreadyStored'> {
  checkInventory(inventory, receipt);
  const serialized = JSON.stringify({ schemaVersion: 1, deliveryId: receipt.deliveryId, payloadDigest: receipt.payloadDigest,
    installationId: receipt.installationId, inventoryDigest: sha256(JSON.stringify(inventory)), inventory }) + '\n';
  if (Buffer.byteLength(serialized) > MAX_RESULT_BYTES) throw Error('CUG_RECEIPT_INVENTORY_LIMIT');
  const stage = join(directory, '.' + randomUUID() + '.pending');
  const file = await open(stage, 'wx', 0o600);
  try {
    try { await file.writeFile(serialized, 'utf8'); await file.sync(); } finally { await file.close(); }
    let result: 'stored' | 'alreadyStored' = 'stored';
    try { await link(stage, path); } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST' || !(await hasOutcome(path, receipt))) throw error;
      result = 'alreadyStored';
    }
    await syncDirectory(directory, dir);
    return result;
  } finally { await unlink(stage).catch(() => {}); }
}

/** A cursor controls fairness within a run, never durable progress across runs. */
export function createCugPilotReceiptConsumer(deps: Dependencies) {
  const maxRefreshes = deps.maxRefreshes ?? REFRESH_LIMIT;
  if (!Number.isSafeInteger(deps.installationId) || deps.installationId < 1
    || !Number.isInteger(maxRefreshes) || maxRefreshes < 1 || maxRefreshes > REFRESH_LIMIT) {
    throw Error('CUG_RECEIPT_CONSUMER_SCOPE_INVALID');
  }
  let after = '';
  let running: Promise<CugPilotReceiptSummary> | undefined;
  const cycle = async () => {
    const summary = { stored: 0, alreadyStored: 0, outOfScope: 0, coverageUnverified: 0, failed: 0 };
    const page = await listCugRegisterDeliveryIds(deps.receiptDirectory, { after, limit: SCAN_LIMIT });
    let attempted = 0;
    let dir: FileHandle | undefined;
    let existing = 0;
    try {
      for (const id of page.deliveryIds) {
        after = id;
        try {
          const receipt = await readCugRegisterRecord(join(deps.receiptDirectory, id + '.json'), id);
          if (!receipt) throw Error('CUG_RECEIPT_INVENTORY_INPUT_MISSING');
          if (receipt.installationId !== deps.installationId || receipt.repositoryId !== CUG_PILOT_REPOSITORY_ID) {
            summary.outOfScope++;
            continue;
          }
          if (!dir) {
            await mkdir(deps.inventoryDirectory, { mode: 0o700 }).catch((error: NodeJS.ErrnoException) => {
              if (error.code !== 'EEXIST') throw error;
            });
            dir = await openPrivateDirectory(deps.inventoryDirectory);
          }
          const path = join(deps.inventoryDirectory, id + '.json');
          if (await hasOutcome(path, receipt)) {
            existing++;
          } else {
            attempted++;
            let inventory: CugPilotInventory;
            try {
              inventory = await deps.collect(receipt.installationId);
            } catch (error) {
              if (error instanceof Error && (error.message === 'CUG_PILOT_INSTALLATION_NOT_ATTESTED'
                || error.message === 'GITHUB_APP_INSTALLATION_TOKEN_REFUSED')) summary.coverageUnverified++;
              else summary.failed++;
              if (attempted === maxRefreshes) break;
              continue;
            }
            summary[await storeOutcome(deps.inventoryDirectory, path, dir, receipt, inventory)]++;
          }
        } catch { summary.failed++; }
        if (attempted === maxRefreshes) break;
      }
      if (existing && dir) await syncDirectory(deps.inventoryDirectory, dir);
      summary.alreadyStored += existing;
      if (page.deliveryIds.length === 0 || after === page.deliveryIds.at(-1)) after = page.nextCursor ?? '';
      return summary;
    } finally { await dir?.close(); }
  };
  return { run: () => (running ??= cycle().finally(() => { running = undefined; })) };
}

export function startCugPilotReceiptPolling(input: {
  run: () => Promise<CugPilotReceiptSummary>;
  onSummary: (summary: CugPilotReceiptSummary) => void;
  onError: () => void;
}): () => void {
  let active = false;
  const tick = () => {
    if (active) return;
    active = true;
    void Promise.resolve().then(input.run).then(input.onSummary).catch(() => {
      try { input.onError(); } catch { /* reporting must not stop subsequent polls */ }
    }).finally(() => { active = false; });
  };
  const timer = setInterval(tick, POLL_MS);
  timer.unref();
  tick();
  return () => clearInterval(timer);
}

/** No configuration can broaden the pilot repository beyond the existing collector. */
export function configureCugPilotReceiptConsumer(input: {
  enabled: boolean;
  webhookEnabled: boolean;
  rawInstallationId: string;
}, start: (installationId: number) => void): 'disabled' | 'invalid' | 'started' {
  if (!input.enabled) return 'disabled';
  const installationId = Number(input.rawInstallationId);
  if (!input.webhookEnabled || !/^[1-9][0-9]*$/.test(input.rawInstallationId) || !Number.isSafeInteger(installationId)) {
    return 'invalid';
  }
  start(installationId);
  return 'started';
}
