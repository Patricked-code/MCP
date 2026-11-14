import { constants } from 'node:fs';
import { lstat, open, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { z } from 'zod';
import { CUG_APP_ID } from './admission.js';

export const CUG_DELIVERY_ID = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
export const CUG_PILOT_REPOSITORY_ID = 1429189311;
export const CUG_REGISTER_LIMIT = 10_000;
export const CUG_REGISTER_RECORD_BYTES = 4096;
const id = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);
const login = z.string().regex(/^[a-z0-9][a-z0-9-]{0,38}$/i);
const repositoryName = z.string().regex(/^[a-z0-9_.-]{1,100}$/i).refine((name) => name !== '.' && name !== '..');
const event = z.enum(['repository', 'installation', 'installation_repositories']);
const repo = z.object({
  githubRepositoryId: id,
  githubOwnerId: id.nullable(),
  ownerLogin: login,
  name: repositoryName,
  htmlUrl: z.string().max(200)
}).strict().refine((row) => row.htmlUrl === `https://github.com/${row.ownerLogin}/${row.name}`);

const base = z.object({
  deliveryId: z.string().regex(CUG_DELIVERY_ID),
  event,
  action: z.string().regex(/^[a-z][a-z_]{0,39}$/),
  installationId: id,
  repositoryId: z.literal(CUG_PILOT_REPOSITORY_ID),
  receivedAt: z.iso.datetime(),
  payloadDigest: z.string().regex(/^[0-9a-f]{64}$/)
});

const v1 = base.extend({ version: z.literal(1) }).strict();
const v2 = base.extend({
  version: z.literal(2),
  observation: z.object({
    source: z.literal('github.cug.signed_webhook'),
    verification: z.literal('PENDING_GITHUB_API'),
    repository: repo.nullable(),
    extensions: z.object({
      'github.installations.v1': z.object({
        reportingAppId: z.literal(Number(CUG_APP_ID)),
        reportingAppName: z.literal('CUG'),
        reportingInstallationId: id,
        repositoryCoverage: z.literal('UNVERIFIED'),
        coverageOfOtherApps: z.literal('UNVERIFIED')
      }).strict()
    }).strict()
  }).strict(),
  suggestion: z.object({
    kind: z.literal('REFRESH_GITHUB_INVENTORY'),
    status: z.literal('PROPOSED'),
    automaticExecution: z.literal(false)
  }).strict()
}).strict();

export const cugRegisterRecordSchema = z.discriminatedUnion('version', [v1, v2]).superRefine((row, ctx) => {
  if (row.version === 2 && (row.observation.extensions['github.installations.v1'].reportingInstallationId !== row.installationId
    || (row.observation.repository !== null && (row.event !== 'repository'
      || row.observation.repository.githubRepositoryId !== row.repositoryId)))) {
    ctx.addIssue({ code: 'custom', message: 'CUG_REGISTER_IDENTITY_MISMATCH' });
  }
});

export type CugRegisterRecord = z.infer<typeof cugRegisterRecordSchema>;
type ReceiptCore = z.infer<typeof base>;

export function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown> : undefined;
}

export function makeCugRegisterRecord(receipt: ReceiptCore, repositoryPayload: unknown): CugRegisterRecord {
  const repository = receipt.event === 'repository' ? asRecord(repositoryPayload) : undefined;
  const owner = asRecord(repository?.owner);
  const ownerId = id.safeParse(owner?.id);
  const parsed = repo.safeParse({
    githubRepositoryId: repository?.id,
    githubOwnerId: ownerId.success ? ownerId.data : null,
    ownerLogin: owner?.login,
    name: repository?.name,
    htmlUrl: repository?.html_url
  });
  return cugRegisterRecordSchema.parse({
    ...receipt,
    version: 2,
    observation: {
      source: 'github.cug.signed_webhook',
      verification: 'PENDING_GITHUB_API',
      repository: parsed.success ? parsed.data : null,
      extensions: {
        'github.installations.v1': {
          reportingAppId: Number(CUG_APP_ID),
          reportingAppName: 'CUG',
          reportingInstallationId: receipt.installationId,
          repositoryCoverage: 'UNVERIFIED',
          coverageOfOtherApps: 'UNVERIFIED'
        }
      }
    },
    suggestion: { kind: 'REFRESH_GITHUB_INVENTORY', status: 'PROPOSED', automaticExecution: false }
  });
}

export async function readCugRegisterRecord(path: string, deliveryId: string): Promise<CugRegisterRecord | null> {
  let file;
  try {
    file = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
  try {
    const metadata = await file.stat();
    if (!metadata.isFile() || (metadata.mode & 0o777) !== 0o600
      || metadata.size < 1 || metadata.size > CUG_REGISTER_RECORD_BYTES) {
      throw Error('CUG_REGISTER_RECORD_UNAVAILABLE');
    }
    const bytes = Buffer.alloc(CUG_REGISTER_RECORD_BYTES + 1);
    let size = 0;
    while (size < bytes.length) {
      const { bytesRead } = await file.read(bytes, size, bytes.length - size, null);
      if (!bytesRead) break;
      size += bytesRead;
    }
    if (size !== metadata.size) throw Error('CUG_REGISTER_RECORD_UNAVAILABLE');
    const record = cugRegisterRecordSchema.parse(JSON.parse(bytes.subarray(0, size).toString('utf8')));
    if (record.deliveryId !== deliveryId) throw Error('CUG_REGISTER_IDENTITY_MISMATCH');
    return record;
  } finally {
    await file.close();
  }
}

/** Local, read-only listing. Cursor is the last delivery ID, not a timestamp. */
export async function listCugRegister(
  directory: string,
  options: { after?: string; limit?: number } = {}
): Promise<{ records: CugRegisterRecord[]; nextCursor: string | null }> {
  const { after = '', limit = 50 } = options;
  if ((after !== '' && (!CUG_DELIVERY_ID.test(after) || after !== after.toLowerCase()))
    || !Number.isInteger(limit) || limit < 1 || limit > 200) {
    throw Error('CUG_REGISTER_CURSOR_INVALID');
  }
  let metadata;
  try { metadata = await lstat(directory); } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return { records: [], nextCursor: null };
    throw error;
  }
  if (!metadata.isDirectory() || (metadata.mode & 0o777) !== 0o700) {
    throw Error('CUG_REGISTER_DIRECTORY_UNAVAILABLE');
  }
  const ids = (await readdir(directory)).flatMap((name) => {
    if (!name.endsWith('.json')) return [];
    const id = name.slice(0, -5);
    if (!CUG_DELIVERY_ID.test(id) || id !== id.toLowerCase()) throw Error('CUG_REGISTER_RECORD_UNAVAILABLE');
    return [id];
  });
  if (ids.length > CUG_REGISTER_LIMIT) throw Error('CUG_REGISTER_LIMIT_EXCEEDED');
  const page = ids.sort().filter((id) => id > after).slice(0, limit + 1);
  const records = [];
  for (const id of page.slice(0, limit)) {
    const record = await readCugRegisterRecord(join(directory, id + '.json'), id);
    if (!record) throw Error('CUG_REGISTER_RECORD_UNAVAILABLE');
    records.push(record);
  }
  return { records, nextCursor: page.length > limit ? page[limit - 1]! : null };
}
