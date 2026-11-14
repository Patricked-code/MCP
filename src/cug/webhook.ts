import { createHash, createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { constants } from 'node:fs';
import { link, lstat, mkdir, open, readdir, unlink } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import express, { type ErrorRequestHandler, type RequestHandler } from 'express';
import { CUG_APP_ID } from './admission.js';
import { asRecord, CUG_DELIVERY_ID as DELIVERY_ID, CUG_PILOT_REPOSITORY_ID as PILOT_REPOSITORY_ID,
  CUG_REGISTER_LIMIT as MAX_RECEIPTS, cugRegisterRecordSchema, makeCugRegisterRecord,
  readCugRegisterRecord, type CugRegisterRecord } from './discoveryRegister.js';

export const CUG_WEBHOOK_PATH = '/webhooks/github/cug';
const SIGNATURE = /^sha256=[0-9a-f]{64}$/;
const ACTION = /^[a-z][a-z_]{0,39}$/;
const EVENTS = ['repository', 'installation', 'installation_repositories'] as const;
type Result = 'stored' | 'duplicate' | 'conflict';
type Dependencies = {
  enabled: () => boolean;
  pilotInstallationId: () => string;
  readSecret: () => Promise<Buffer>;
  record: (receipt: CugRegisterRecord) => Promise<Result>;
};

export async function readCugWebhookSecret(path: string): Promise<Buffer> {
  const file = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
  try {
    const metadata = await file.stat();
    if (!metadata.isFile() || (metadata.mode & 0o777) !== 0o600 || ![64, 65, 66].includes(metadata.size)) {
      throw Error('CUG_WEBHOOK_SECRET_UNAVAILABLE');
    }
    const raw = Buffer.alloc(67);
    let size = 0;
    while (size < raw.length) {
      const { bytesRead } = await file.read(raw, size, raw.length - size, null);
      if (bytesRead === 0) break;
      size += bytesRead;
    }
    const match = /^([0-9a-f]{64})(?:\r?\n)?$/.exec(raw.subarray(0, size).toString('latin1'));
    if (size !== metadata.size || !match?.[1]) throw Error('CUG_WEBHOOK_SECRET_UNAVAILABLE');
    // GitHub uses the configured text, not the bytes represented by its hex digits.
    return Buffer.from(match[1], 'ascii');
  } finally {
    await file.close();
  }
}

export function createCugWebhookReceiptStore(directory: string): Dependencies['record'] {
  // One writer per MCP process. A no-overwrite hard link also protects the
  // delivery key across restarts or concurrent processes sharing the volume.
  let pending = 0;
  let tail: Promise<unknown> = Promise.resolve();
  return (receipt) => {
    if (!cugRegisterRecordSchema.safeParse(receipt).success
      || receipt.deliveryId !== receipt.deliveryId.toLowerCase() || pending >= 32) {
      return Promise.reject(Error('CUG_WEBHOOK_RECEIPT_STORE_UNAVAILABLE'));
    }
    pending++;
    const work = tail.then(async (): Promise<Result> => {
      try {
        await mkdir(directory, { mode: 0o700 });
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
      }
      const metadata = await lstat(directory);
      if (!metadata.isDirectory() || (metadata.mode & 0o777) !== 0o700) {
        throw Error('CUG_WEBHOOK_RECEIPT_STORE_UNAVAILABLE');
      }
      const target = join(directory, `${receipt.deliveryId}.json`);
      const staging = join(directory, `.${randomUUID()}.pending`);
      const dir = await open(directory, constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW);
      const syncReceipt = async () => {
        await dir.sync();
        const parent = await open(dirname(directory), constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW);
        try { await parent.sync(); } finally { await parent.close(); }
      };
      const existing = async (): Promise<Result | undefined> => {
        const saved = await readCugRegisterRecord(target, receipt.deliveryId);
        if (!saved) return undefined;
        await syncReceipt();
        return saved.payloadDigest === receipt.payloadDigest && saved.event === receipt.event
          && saved.action === receipt.action && saved.installationId === receipt.installationId
          && saved.repositoryId === receipt.repositoryId ? 'duplicate' : 'conflict';
      };
      try {
        const previous = await existing();
        if (previous) return previous;
        if ((await readdir(directory)).length >= MAX_RECEIPTS) {
          throw Error('CUG_WEBHOOK_RECEIPT_STORE_FULL');
        }
        const file = await open(staging, 'wx', 0o600);
        try {
          try {
            await file.writeFile(JSON.stringify(receipt) + '\n', 'utf8');
            await file.sync();
          } finally {
            await file.close();
          }
          try {
            await link(staging, target);
          } catch (error) {
            if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
            const concurrent = await existing();
            if (!concurrent) throw error;
            return concurrent;
          }
          await syncReceipt();
          return 'stored';
        } finally {
          await unlink(staging).catch(() => {});
        }
      } finally {
        await dir.close();
      }
    }).finally(() => { pending--; });
    tail = work.catch(() => {});
    return work;
  };
}

export function createCugWebhookRouter(deps: Dependencies) {
  const router = express.Router({ caseSensitive: true, strict: true });
  const rawBody = express.raw({ type: 'application/json', inflate: false, limit: '2mb' });
  const bodyError: ErrorRequestHandler = (error, _req, res, _next) => {
    const status = (error as { status?: number }).status;
    res.sendStatus(status === 413 || status === 415 ? status : 400);
  };
  const guard: RequestHandler = (req, res, next) => {
    if (!deps.enabled()) { res.sendStatus(404); return; }
    if (!SIGNATURE.test(req.get('X-Hub-Signature-256') ?? '')) { res.sendStatus(401); return; }
    if (!DELIVERY_ID.test(req.get('X-GitHub-Delivery') ?? '')) { res.sendStatus(400); return; }
    if (!req.is('application/json')) { res.sendStatus(415); return; }
    next();
  };
  const receive: RequestHandler = async (req, res) => {
    if (!Buffer.isBuffer(req.body)) { res.sendStatus(400); return; }
    try {
      const configuredId = deps.pilotInstallationId();
      const installationId = Number(configuredId);
      if (!/^[1-9][0-9]*$/.test(configuredId) || !Number.isSafeInteger(installationId)) {
        res.sendStatus(503);
        return;
      }
      const secret = await deps.readSecret();
      let expected: Buffer;
      try {
        expected = createHmac('sha256', secret).update(req.body).digest();
      } finally {
        secret.fill(0);
      }
      const actual = Buffer.from(req.get('X-Hub-Signature-256')!.slice(7), 'hex');
      if (!timingSafeEqual(actual, expected)) { res.sendStatus(401); return; }
      const name = req.get('X-GitHub-Event');
      if (!name) { res.sendStatus(400); return; }
      if (name === 'ping') { res.sendStatus(204); return; }
      const event = EVENTS.find((allowed) => allowed === name);
      if (!event) { res.sendStatus(204); return; }
      let payload: Record<string, unknown> | undefined;
      try { payload = asRecord(JSON.parse(req.body.toString('utf8'))); } catch { /* invalid JSON */ }
      if (!payload || typeof payload.action !== 'string' || !ACTION.test(payload.action)) {
        res.sendStatus(400);
        return;
      }
      const installation = asRecord(payload.installation);
      if (installation?.id !== installationId
        || (installation.app_id !== undefined && installation.app_id !== Number(CUG_APP_ID))
        || (event === 'repository' && asRecord(payload.repository)?.id !== PILOT_REPOSITORY_ID)) {
        res.sendStatus(204);
        return;
      }
      const result = await deps.record(makeCugRegisterRecord({
        deliveryId: req.get('X-GitHub-Delivery')!.toLowerCase(),
        event,
        action: payload.action,
        installationId,
        repositoryId: PILOT_REPOSITORY_ID,
        receivedAt: new Date().toISOString(),
        payloadDigest: createHash('sha256').update(req.body).digest('hex')
      }, payload.repository));
      res.sendStatus(result === 'stored' ? 202 : result === 'duplicate' ? 204 : 409);
    } catch {
      // Never expose or log the request body, headers, secret or a filesystem path.
      res.sendStatus(503);
    }
  };
  router.post(CUG_WEBHOOK_PATH, guard, rawBody, receive, bodyError);
  return router;
}
