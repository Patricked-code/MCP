import { createHash, randomBytes } from 'node:crypto';

import { z } from 'zod';

import { createAtomicJsonStore } from './operationalMemory/atomicStore.js';

/**
 * Existing OAuth authorization-code authority, backed by the same durable
 * operational JSON-store primitive as the refresh grants. The raw code is never
 * persisted. This is NOT a session, identity, Task Queue or Governed Lock.
 *
 * All OAuth server processes MUST share the same local POSIX data volume.
 * Stale transaction-lock directories fail closed until operator recovery.
 */
export const DEFAULT_OAUTH_AUTHORIZATION_CODE_STORE_PATH = '/app/data/mcp-oauth-authorization-codes.json';
const MAX_AUTHORIZATION_CODES = 2_000;
const CodeHashSchema = z.string().regex(/^[0-9a-f]{64}$/);

export const OAuthAuthorizationCodeRecordSchema = z.object({
  codeHash: CodeHashSchema,
  clientId: z.string().trim().min(1).max(1024),
  redirectUri: z.string().url(),
  scope: z.string().trim().min(1).max(1280),
  resource: z.string().url(),
  codeChallenge: z.string().trim().min(1).max(256),
  codeChallengeMethod: z.literal('S256'),
  subject: z.string().trim().min(1).max(256),
  oauthAttemptRef: z.string().regex(/^oa_[A-Za-z0-9_-]{22,64}$/),
  expiresAt: z.number().int().nonnegative()
}).strict();

export type OAuthAuthorizationCodeRecord = Omit<
  z.infer<typeof OAuthAuthorizationCodeRecordSchema>, 'codeHash'
>;
const StoreSchema = z.object({
  schemaVersion: z.literal(1),
  storeRevision: z.number().int().nonnegative(),
  codes: z.array(OAuthAuthorizationCodeRecordSchema).max(MAX_AUTHORIZATION_CODES)
}).strict();
type StoreDocument = z.infer<typeof StoreSchema>;

export type OAuthAuthorizationCodeService = {
  issue(record: OAuthAuthorizationCodeRecord): Promise<string>;
  consume(code: string): Promise<OAuthAuthorizationCodeRecord | null>;
};

export function createOAuthAuthorizationCodeService(options: {
  storePath: string;
  now?: () => number;
  lockTimeoutMs?: number;
  randomBytes?: (size: number) => Buffer;
}): OAuthAuthorizationCodeService {
  const now = options.now ?? Date.now;
  const bytes = options.randomBytes ?? randomBytes;
  const store = createAtomicJsonStore<StoreDocument>({
    filePath: options.storePath,
    schema: StoreSchema,
    empty: () => ({ schemaVersion: 1, storeRevision: 0, codes: [] }),
    interprocessLock: true,
    durableWrites: true,
    lockTimeoutMs: options.lockTimeoutMs
  });
  return {
    async issue(record) {
      const code = bytes(32).toString('base64url');
      const codeHash = createHash('sha256').update(code).digest('hex');
      const entry = OAuthAuthorizationCodeRecordSchema.parse({ ...record, codeHash });
      await store.update((current) => {
        const codes = current.codes.filter((item) => item.expiresAt > now());
        if (codes.length >= MAX_AUTHORIZATION_CODES) {
          throw new Error('OAUTH_AUTH_CODE_STORE_CAPACITY_EXCEEDED');
        }
        if (codes.some((item) => item.codeHash === codeHash)) {
          throw new Error('OAUTH_AUTH_CODE_COLLISION');
        }
        return {
          ...current,
          storeRevision: current.storeRevision + 1,
          codes: [...codes, entry]
        };
      });
      return code;
    },
    async consume(code) {
      // A 32-byte random code is always 43 base64url characters.
      if (!/^[A-Za-z0-9_-]{43}$/.test(code)) return null;
      const codeHash = createHash('sha256').update(code).digest('hex');
      let consumed: OAuthAuthorizationCodeRecord | null = null;
      await store.update((current) => {
        const index = current.codes.findIndex((item) => item.codeHash === codeHash);
        if (index < 0) return current;
        const record = current.codes[index]!;
        // Consume before checking client, resource, redirect or PKCE, preserving
        // the existing one-attempt-only semantics even for an invalid request.
        if (record.expiresAt > now()) {
          const { codeHash: _hash, ...safeRecord } = record;
          consumed = safeRecord;
        }
        const codes = current.codes.filter((_, i) => i !== index);
        return { ...current, storeRevision: current.storeRevision + 1, codes };
      });
      return consumed;
    }
  };
}

let sharedService: OAuthAuthorizationCodeService | null = null;

export function getDefaultOAuthAuthorizationCodeService(): OAuthAuthorizationCodeService {
  sharedService ??= createOAuthAuthorizationCodeService({
    storePath: process.env.MCP_OAUTH_CODE_STORE_PATH || DEFAULT_OAUTH_AUTHORIZATION_CODE_STORE_PATH
  });
  return sharedService;
}
