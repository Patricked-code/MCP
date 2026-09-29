import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';

import { z } from 'zod';

import { env } from './config/env.js';
import { createAtomicJsonStore } from './operationalMemory/atomicStore.js';

export const DEFAULT_OAUTH_REFRESH_GRANT_STORE_PATH = '/app/data/mcp-oauth-refresh-grants.json';
const MAX_OAUTH_REFRESH_GRANTS = 2_000;
const RefreshTokenHashSchema = z.string().regex(/^[0-9a-f]{64}$/);
const OAuthAttemptRefSchema = z.string().regex(/^oa_[A-Za-z0-9_-]{22,64}$/);
const OAuthScopeSchema = z.string().trim().min(1).max(80).regex(/^[A-Za-z0-9:._/-]+$/);

export const OAuthRefreshGrantRecordSchema = z.object({
  schemaVersion: z.literal(1),
  grantId: z.string().uuid(),
  familyId: z.string().uuid(),
  subject: z.string().trim().min(1).max(256),
  clientId: z.string().trim().min(1).max(256),
  resource: z.string().url(),
  scopes: z.array(OAuthScopeSchema).min(1).max(16),
  oauthAttemptRef: OAuthAttemptRefSchema,
  currentGeneration: z.number().int().nonnegative(),
  currentTokenHash: RefreshTokenHashSchema,
  createdAt: z.string().datetime({ offset: true }),
  lastUsedAt: z.string().datetime({ offset: true }),
  idleExpiresAt: z.string().datetime({ offset: true }),
  absoluteExpiresAt: z.string().datetime({ offset: true }),
  revokedAt: z.string().datetime({ offset: true }).nullable(),
  revokeReason: z.enum(['replay_detected', 'expired']).nullable()
}).strict().superRefine((record, context) => {
  const created = Date.parse(record.createdAt);
  const idle = Date.parse(record.idleExpiresAt);
  const absolute = Date.parse(record.absoluteExpiresAt);
  if (idle > absolute || absolute <= created) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['idleExpiresAt'],
      message: 'refresh grant expirations must be bounded by absolute expiry'
    });
  }
  if ((record.revokedAt === null) !== (record.revokeReason === null)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['revokedAt'],
      message: 'revokedAt and revokeReason must be set together'
    });
  }
});

export type OAuthRefreshGrantRecord = z.infer<typeof OAuthRefreshGrantRecordSchema>;

export const OAuthRefreshGrantStoreDocumentSchema = z.object({
  schemaVersion: z.literal(1),
  storeRevision: z.number().int().nonnegative(),
  grants: z.array(OAuthRefreshGrantRecordSchema).max(MAX_OAUTH_REFRESH_GRANTS)
}).strict();

export type OAuthRefreshGrantStoreDocument = z.infer<typeof OAuthRefreshGrantStoreDocumentSchema>;

export function createEmptyOAuthRefreshGrantStoreDocument(): OAuthRefreshGrantStoreDocument {
  return { schemaVersion: 1, storeRevision: 0, grants: [] };
}

export type OAuthRefreshGrantService = {
  issue(input: {
    subject: string;
    clientId: string;
    resource: string;
    scopes: string[];
    oauthAttemptRef: string;
    grantId?: string;
  }): Promise<{
    grantId: string;
    refreshToken: string;
    oauthAttemptRef: string;
    scopes: string[];
    absoluteExpiresAt: string;
  }>;
  rotate(input: {
    refreshToken: string;
    clientId?: string;
    resource?: string;
  }): Promise<{
    grantId: string;
    refreshToken: string;
    subject: string;
    clientId: string;
    resource: string;
    scopes: string[];
    oauthAttemptRef: string;
    absoluteExpiresAt: string;
  }>;
};

type OAuthRefreshGrantServiceOptions = {
  storePath: string;
  idleTtlSeconds: number;
  absoluteTtlSeconds: number;
  now?: () => Date;
  randomUUID?: () => string;
  randomBytes?: (size: number) => Buffer;
};

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function hashMatches(token: string, expectedHash: string): boolean {
  const actual = Buffer.from(hashToken(token), 'hex');
  const expected = Buffer.from(expectedHash, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function uniqueScopes(scopes: string[]): string[] {
  return [...new Set(scopes)].sort();
}

function makeRefreshToken(
  familyId: string,
  generation: number,
  bytes: (size: number) => Buffer
): string {
  return `mcp_rt1.${familyId}.${generation}.${bytes(32).toString('base64url')}`;
}

function parseRefreshToken(token: string): {
  familyId: string;
  generation: number;
} {
  const match = /^mcp_rt1\.([0-9a-f-]{36})\.([0-9]+)\.([A-Za-z0-9_-]{32,})$/.exec(token);
  if (!match) throw new Error('OAUTH_REFRESH_TOKEN_INVALID');
  const generation = Number(match[2]);
  if (!Number.isSafeInteger(generation) || generation < 0) {
    throw new Error('OAUTH_REFRESH_TOKEN_INVALID');
  }
  return { familyId: match[1]!, generation };
}

function boundedIdleExpiry(at: Date, idleTtlSeconds: number, absoluteExpiresAt: string): string {
  const idleMs = at.getTime() + idleTtlSeconds * 1_000;
  const absoluteMs = Date.parse(absoluteExpiresAt);
  return new Date(Math.min(idleMs, absoluteMs)).toISOString();
}

export function createOAuthRefreshGrantService(
  options: OAuthRefreshGrantServiceOptions
): OAuthRefreshGrantService {
  if (
    !Number.isSafeInteger(options.idleTtlSeconds)
    || !Number.isSafeInteger(options.absoluteTtlSeconds)
    || options.idleTtlSeconds <= 0
    || options.absoluteTtlSeconds <= 0
    || options.idleTtlSeconds > options.absoluteTtlSeconds
  ) {
    throw new Error('OAUTH_REFRESH_TTL_INVALID');
  }

  const now = options.now ?? (() => new Date());
  const uuid = options.randomUUID ?? randomUUID;
  const bytes = options.randomBytes ?? randomBytes;
  const store = createAtomicJsonStore({
    filePath: options.storePath,
    schema: OAuthRefreshGrantStoreDocumentSchema,
    empty: createEmptyOAuthRefreshGrantStoreDocument
  });

  return {
    async issue(input) {
      const at = now();
      const grantId = input.grantId ?? uuid();
      const familyId = uuid();
      const scopes = uniqueScopes(input.scopes);
      const absoluteExpiresAt = new Date(
        at.getTime() + options.absoluteTtlSeconds * 1_000
      ).toISOString();
      const refreshToken = makeRefreshToken(familyId, 0, bytes);
      const record = OAuthRefreshGrantRecordSchema.parse({
        schemaVersion: 1,
        grantId,
        familyId,
        subject: input.subject,
        clientId: input.clientId,
        resource: input.resource,
        scopes,
        oauthAttemptRef: input.oauthAttemptRef,
        currentGeneration: 0,
        currentTokenHash: hashToken(refreshToken),
        createdAt: at.toISOString(),
        lastUsedAt: at.toISOString(),
        idleExpiresAt: boundedIdleExpiry(at, options.idleTtlSeconds, absoluteExpiresAt),
        absoluteExpiresAt,
        revokedAt: null,
        revokeReason: null
      });

      await store.update((document) => {
        const retained = document.grants.filter(
          (grant) => Date.parse(grant.absoluteExpiresAt) > at.getTime()
        );
        if (retained.length >= MAX_OAUTH_REFRESH_GRANTS) {
          throw new Error('OAUTH_REFRESH_STORE_CAPACITY_EXCEEDED');
        }
        return {
          ...document,
          storeRevision: document.storeRevision + 1,
          grants: [...retained, record]
        };
      });

      return {
        grantId,
        refreshToken,
        oauthAttemptRef: record.oauthAttemptRef,
        scopes: [...record.scopes],
        absoluteExpiresAt
      };
    },

    async rotate(input) {
      const parsed = parseRefreshToken(input.refreshToken);
      const at = now();
      let rotated: Awaited<ReturnType<OAuthRefreshGrantService['rotate']>> | null = null;
      let deferredError: Error | null = null;

      await store.update((document) => {
        const index = document.grants.findIndex((grant) => grant.familyId === parsed.familyId);
        if (index < 0) throw new Error('OAUTH_REFRESH_GRANT_NOT_FOUND');
        const current = document.grants[index]!;

        if (current.revokedAt !== null) {
          throw new Error('OAUTH_REFRESH_GRANT_REVOKED');
        }
        if (input.clientId !== undefined && input.clientId !== current.clientId) {
          throw new Error('OAUTH_REFRESH_CLIENT_MISMATCH');
        }
        if (input.resource !== undefined && input.resource !== current.resource) {
          throw new Error('OAUTH_REFRESH_RESOURCE_MISMATCH');
        }

        const expired = Date.parse(current.absoluteExpiresAt) <= at.getTime()
          || Date.parse(current.idleExpiresAt) <= at.getTime();
        if (expired) {
          const grants = [...document.grants];
          grants[index] = {
            ...current,
            revokedAt: at.toISOString(),
            revokeReason: 'expired'
          };
          deferredError = new Error('OAUTH_REFRESH_GRANT_EXPIRED');
          return {
            ...document,
            storeRevision: document.storeRevision + 1,
            grants
          };
        }

        if (parsed.generation < current.currentGeneration) {
          const grants = [...document.grants];
          grants[index] = {
            ...current,
            revokedAt: at.toISOString(),
            revokeReason: 'replay_detected'
          };
          deferredError = new Error('OAUTH_REFRESH_TOKEN_REPLAY');
          return {
            ...document,
            storeRevision: document.storeRevision + 1,
            grants
          };
        }

        if (
          parsed.generation !== current.currentGeneration
          || !hashMatches(input.refreshToken, current.currentTokenHash)
        ) {
          throw new Error('OAUTH_REFRESH_TOKEN_INVALID');
        }

        const generation = current.currentGeneration + 1;
        const refreshToken = makeRefreshToken(current.familyId, generation, bytes);
        const next: OAuthRefreshGrantRecord = {
          ...current,
          currentGeneration: generation,
          currentTokenHash: hashToken(refreshToken),
          lastUsedAt: at.toISOString(),
          idleExpiresAt: boundedIdleExpiry(
            at,
            options.idleTtlSeconds,
            current.absoluteExpiresAt
          )
        };
        const grants = [...document.grants];
        grants[index] = next;
        rotated = {
          grantId: current.grantId,
          refreshToken,
          subject: current.subject,
          clientId: current.clientId,
          resource: current.resource,
          scopes: [...current.scopes],
          oauthAttemptRef: current.oauthAttemptRef,
          absoluteExpiresAt: current.absoluteExpiresAt
        };
        return {
          ...document,
          storeRevision: document.storeRevision + 1,
          grants
        };
      });

      if (deferredError) throw deferredError;
      if (!rotated) throw new Error('OAUTH_REFRESH_ROTATION_FAILED');
      return rotated;
    }
  };
}

let sharedService: OAuthRefreshGrantService | null = null;

export function getDefaultOAuthRefreshGrantService(): OAuthRefreshGrantService {
  sharedService ??= createOAuthRefreshGrantService({
    storePath: DEFAULT_OAUTH_REFRESH_GRANT_STORE_PATH,
    idleTtlSeconds: env.MCP_OAUTH_REFRESH_IDLE_TTL_SECONDS,
    absoluteTtlSeconds: env.MCP_OAUTH_REFRESH_MAX_TTL_SECONDS
  });
  return sharedService;
}
