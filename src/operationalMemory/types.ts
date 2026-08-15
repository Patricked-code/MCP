import { z } from 'zod';

const TimestampSchema = z.string().datetime({ offset: true });
const GovernedIdSchema = z.string().uuid();
const ShaSchema = z.string().regex(/^[0-9a-f]{40}$/);
const BlockerSchema = z.string().trim().min(1).max(240);
const BranchSchema = z.string().trim().min(1).max(255);

export const GovernedSessionStatusSchema = z.enum([
  'OPEN',
  'ACTIVE',
  'PAUSED',
  'EXPIRED',
  'CLOSED'
]);
export type GovernedSessionStatus = z.infer<typeof GovernedSessionStatusSchema>;

export const IdentityAssuranceSchema = z.enum([
  'oauth_subject',
  'resume_secret',
  'shared_credential',
  'declared_only'
]);
export type IdentityAssurance = z.infer<typeof IdentityAssuranceSchema>;

export const SanitizedTransportMetadataSchema = z.object({
  fingerprint: z.string().regex(/^[0-9a-f]{64}$/),
  boundAt: TimestampSchema,
  lastSeenAt: TimestampSchema
}).strict();
export type SanitizedTransportMetadata = z.infer<typeof SanitizedTransportMetadataSchema>;

export const GovernedCheckpointSchema = z.object({
  checkpointId: GovernedIdSchema,
  governedSessionId: GovernedIdSchema,
  createdAt: TimestampSchema,
  taskScope: z.string().trim().min(1).max(200),
  workBranch: BranchSchema.nullable(),
  pullRequestNumber: z.number().int().positive().max(2_147_483_647).nullable(),
  observedHeadSha: ShaSchema.nullable(),
  acknowledgedStateVersion: z.number().int().nonnegative(),
  completedAction: z.string().trim().min(1).max(240),
  resultCode: z.string().trim().min(1).max(80).regex(/^[A-Z0-9_.:-]+$/),
  blockers: z.array(BlockerSchema).max(20),
  nextAction: z.string().trim().min(1).max(500).nullable(),
  eventIds: z.array(GovernedIdSchema).max(64),
  sessionRevision: z.number().int().nonnegative()
}).strict();
export type GovernedCheckpoint = z.infer<typeof GovernedCheckpointSchema>;

export const GovernedSessionRecordSchema = z.object({
  schemaVersion: z.literal(1),
  governedSessionId: GovernedIdSchema,
  repository: z.literal('Patricked-code/MCP'),
  taskScope: z.string().trim().min(1).max(200),
  workBranch: BranchSchema.nullable(),
  agentIdentity: z.string().trim().min(1).max(200),
  ownerPrincipalId: z.string().trim().min(1).max(256).nullable(),
  identityAssurance: IdentityAssuranceSchema,
  resumeSecretHash: z.string().min(64).max(512),
  status: GovernedSessionStatusSchema,
  createdAt: TimestampSchema,
  resumedAt: TimestampSchema.nullable(),
  lastHeartbeatAt: TimestampSchema,
  pausedAt: TimestampSchema.nullable(),
  expiredAt: TimestampSchema.nullable(),
  closedAt: TimestampSchema.nullable(),
  currentTransport: SanitizedTransportMetadataSchema.nullable(),
  lastAcknowledgedStateVersion: z.number().int().nonnegative().nullable(),
  sessionRevision: z.number().int().nonnegative(),
  lastCheckpoint: GovernedCheckpointSchema.nullable(),
  blockers: z.array(BlockerSchema).max(20),
  nextAction: z.string().trim().min(1).max(500).nullable(),
  lockIds: z.array(GovernedIdSchema).max(64),
  resumePolicy: z.literal('stable_principal_or_resume_secret')
}).strict();
export type GovernedSessionRecord = z.infer<typeof GovernedSessionRecordSchema>;
export type GovernedSessionPublicRecord = Omit<GovernedSessionRecord, 'resumeSecretHash'>;

export const MAX_GOVERNED_SESSION_RECORDS = 1_000;

export const SessionStoreDocumentSchema = z.object({
  schemaVersion: z.literal(1),
  storeRevision: z.number().int().nonnegative(),
  sessions: z.array(GovernedSessionRecordSchema).max(MAX_GOVERNED_SESSION_RECORDS)
}).strict();
export type SessionStoreDocument = z.infer<typeof SessionStoreDocumentSchema>;

export const GovernedLockStatusSchema = z.enum(['ACTIVE', 'RELEASED', 'EXPIRED']);
export type GovernedLockStatus = z.infer<typeof GovernedLockStatusSchema>;

export const GovernedLockRecordSchema = z.object({
  schemaVersion: z.literal(1),
  lockId: GovernedIdSchema,
  scope: z.string().trim().min(3).max(256),
  governedSessionId: GovernedIdSchema,
  acquiredAt: TimestampSchema,
  expiresAt: TimestampSchema,
  renewedAt: TimestampSchema,
  reason: z.string().trim().min(1).max(240),
  status: GovernedLockStatusSchema,
  lockRevision: z.number().int().nonnegative()
}).strict();
export type GovernedLockRecord = z.infer<typeof GovernedLockRecordSchema>;

export const MAX_GOVERNED_LOCK_RECORDS = 2_000;

export const LockStoreDocumentSchema = z.object({
  schemaVersion: z.literal(1),
  storeRevision: z.number().int().nonnegative(),
  locks: z.array(GovernedLockRecordSchema).max(MAX_GOVERNED_LOCK_RECORDS)
}).strict();
export type LockStoreDocument = z.infer<typeof LockStoreDocumentSchema>;

export function createEmptySessionStoreDocument(): SessionStoreDocument {
  return { schemaVersion: 1, storeRevision: 0, sessions: [] };
}

export function createEmptyLockStoreDocument(): LockStoreDocument {
  return { schemaVersion: 1, storeRevision: 0, locks: [] };
}
