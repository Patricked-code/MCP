import { z } from 'zod';

import { ConnectionContextSchema } from './connectionContext.js';

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

export const BootstrapReceiptSchema = z.object({
  schemaVersion: z.literal(1),
  bootstrapReceiptId: GovernedIdSchema,
  governedSessionId: GovernedIdSchema,
  agentIdentity: z.string().trim().min(1).max(200),
  repository: z.literal('Patricked-code/MCP'),
  governedBranch: BranchSchema.nullable(),
  stateVersion: z.number().int().nonnegative(),
  githubHead: ShaSchema.nullable(),
  runtimeRevision: ShaSchema.nullable(),
  catalogueDigest: z.string().regex(/^[0-9a-f]{64}$/).nullable(),
  governanceDigest: z.string().regex(/^[0-9a-f]{64}$/).nullable(),
  taskRegistryDigest: z.string().regex(/^[0-9a-f]{64}$/).nullable(),
  createdAt: TimestampSchema,
  expiresAt: TimestampSchema,
  status: z.literal('ACKNOWLEDGED'),
  limitations: z.array(z.string().regex(/^[A-Z0-9_.:-]{2,80}$/)).max(20)
}).strict();
export type BootstrapReceipt = z.infer<typeof BootstrapReceiptSchema>;

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
  bootstrapReceipt: BootstrapReceiptSchema.nullable().optional(),
  connectionContext: ConnectionContextSchema.nullable().optional(),
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

export const GovernedTaskStatusSchema = z.enum([
  'DISCOVERED', 'READY', 'CLAIMED', 'IN_PROGRESS', 'REVIEW', 'MERGE_READY',
  'DEPLOYING', 'VERIFYING', 'DONE', 'BLOCKED', 'CONFLICT', 'CANCELLED', 'SUPERSEDED'
]);
export type GovernedTaskStatus = z.infer<typeof GovernedTaskStatusSchema>;

export const GovernedTaskRecordSchema = z.object({
  schemaVersion: z.literal(1),
  taskId: z.string().regex(/^TASK-[0-9]{8}-[0-9]{3,}$/),
  repository: z.literal('Patricked-code/MCP'),
  intentKey: z.string().trim().min(3).max(160).regex(/^[a-z0-9][a-z0-9:._/-]+$/),
  title: z.string().trim().min(1).max(160),
  summary: z.string().trim().min(1).max(500),
  priority: z.number().int().min(0).max(100),
  sequence: z.number().int().nonnegative(),
  status: GovernedTaskStatusSchema,
  dependencies: z.array(z.string().regex(/^TASK-[0-9]{8}-[0-9]{3,}$/)).max(64),
  resourceScopes: z.array(z.string().trim().min(3).max(256)).max(64),
  ownerGovernedSessionId: GovernedIdSchema.nullable(),
  workBranch: BranchSchema.nullable(),
  pullRequestNumber: z.number().int().positive().max(2_147_483_647).nullable(),
  observedHeadSha: ShaSchema.nullable(),
  runtimeRevision: ShaSchema.nullable(),
  blockers: z.array(BlockerSchema).max(20),
  nextAction: z.string().trim().min(1).max(500).nullable(),
  source: z.object({
    kind: z.enum(['seed', 'agent']),
    requestDigest: z.string().regex(/^[0-9a-f]{64}$/)
  }).strict(),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
  taskRevision: z.number().int().nonnegative()
}).strict();
export type GovernedTaskRecord = z.infer<typeof GovernedTaskRecordSchema>;

export const MAX_GOVERNED_TASK_RECORDS = 5_000;

export const TaskStoreDocumentSchema = z.object({
  schemaVersion: z.literal(1),
  storeRevision: z.number().int().nonnegative(),
  seedRegistryVersion: z.number().int().nonnegative(),
  nextSequence: z.number().int().nonnegative(),
  tasks: z.array(GovernedTaskRecordSchema).max(MAX_GOVERNED_TASK_RECORDS)
}).strict();
export type TaskStoreDocument = z.infer<typeof TaskStoreDocumentSchema>;

export function createEmptyTaskStoreDocument(): TaskStoreDocument {
  return { schemaVersion: 1, storeRevision: 0, seedRegistryVersion: 0, nextSequence: 1, tasks: [] };
}
