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

export const BootstrapReceiptSchema = z.object({
  bootstrapReceiptId: GovernedIdSchema,
  governedSessionId: GovernedIdSchema,
  repository: z.literal('Patricked-code/MCP'),
  agentIdentity: z.string().trim().min(1).max(200),
  governedBranch: BranchSchema.nullable(),
  stateVersion: z.number().int().nonnegative(),
  githubHead: ShaSchema.nullable(),
  runtimeRevision: ShaSchema.nullable(),
  catalogueDigest: z.string().regex(/^[0-9a-f]{64}$/).nullable(),
  governanceDigest: z.string().regex(/^[0-9a-f]{64}$/).nullable(),
  taskRegistryVersion: z.number().int().nonnegative().nullable(),
  createdAt: TimestampSchema,
  expiresAt: TimestampSchema,
  status: z.literal('ACKNOWLEDGED'),
  limitations: z.array(z.string().trim().min(1).max(120)).max(20)
}).strict();
export type BootstrapReceipt = z.infer<typeof BootstrapReceiptSchema>;

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
  bootstrapReceipt: BootstrapReceiptSchema.optional(),
  blockers: z.array(BlockerSchema).max(20),
  nextAction: z.string().trim().min(1).max(500).nullable(),
  lockIds: z.array(GovernedIdSchema).max(64),
  resumePolicy: z.literal('stable_principal_or_resume_secret')
}).strict();
export type GovernedSessionRecord = z.infer<typeof GovernedSessionRecordSchema>;
export type GovernedSessionPublicRecord = Omit<GovernedSessionRecord, 'resumeSecretHash'>;

export const GovernedTaskStatusSchema = z.enum([
  'DISCOVERED',
  'READY',
  'CLAIMED',
  'IN_PROGRESS',
  'REVIEW',
  'MERGE_READY',
  'DEPLOYING',
  'VERIFYING',
  'DONE',
  'BLOCKED',
  'CONFLICT',
  'CANCELLED',
  'SUPERSEDED'
]);
export type GovernedTaskStatus = z.infer<typeof GovernedTaskStatusSchema>;

const GovernedTaskIdSchema = z.string().regex(/^TASK-[0-9]{8}-[0-9]{3,}$/);
const IntentKeySchema = z.string().trim().min(3).max(160).regex(/^[a-z0-9][a-z0-9._:-]*$/);
const ResourceScopeSchema = z.string().trim().min(3).max(256).regex(/^[A-Za-z0-9./:_-]+$/);
const TaskPrioritySchema = z.number().int().min(0).max(100);

export const GovernedTaskSeedSchema = z.object({
  taskId: GovernedTaskIdSchema,
  intentKey: IntentKeySchema,
  title: z.string().trim().min(1).max(160),
  summary: z.string().trim().min(1).max(500),
  priority: TaskPrioritySchema,
  sequence: z.number().int().positive(),
  status: GovernedTaskStatusSchema,
  dependencies: z.array(GovernedTaskIdSchema).max(50),
  resourceScopes: z.array(ResourceScopeSchema).max(100),
  nextAction: z.string().trim().min(1).max(500).nullable()
}).strict();
export type GovernedTaskSeed = z.infer<typeof GovernedTaskSeedSchema>;

export const GovernedTaskSeedDocumentSchema = z.object({
  schemaVersion: z.literal(1),
  registryVersion: z.number().int().positive(),
  tasks: z.array(GovernedTaskSeedSchema).max(5_000)
}).strict();
export type GovernedTaskSeedDocument = z.infer<typeof GovernedTaskSeedDocumentSchema>;

export const GovernedTaskRecordSchema = GovernedTaskSeedSchema.extend({
  schemaVersion: z.literal(1),
  governedSessionId: GovernedIdSchema.nullable(),
  workBranch: BranchSchema.nullable(),
  pullRequestNumber: z.number().int().positive().max(2_147_483_647).nullable(),
  ciHeadSha: ShaSchema.nullable(),
  mergeSha: ShaSchema.nullable(),
  runtimeRevision: ShaSchema.nullable(),
  blockers: z.array(BlockerSchema).max(20),
  requestDigest: z.string().regex(/^[0-9a-f]{64}$/),
  provenance: z.enum(['versioned_seed', 'runtime_intent']),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
  taskRevision: z.number().int().nonnegative()
}).strict();
export type GovernedTaskRecord = z.infer<typeof GovernedTaskRecordSchema>;

export const MAX_GOVERNED_TASK_RECORDS = 5_000;

export const GovernedTaskStoreDocumentSchema = z.object({
  schemaVersion: z.literal(1),
  storeRevision: z.number().int().nonnegative(),
  seededRegistryVersion: z.number().int().nonnegative(),
  tasks: z.array(GovernedTaskRecordSchema).max(MAX_GOVERNED_TASK_RECORDS)
}).strict();
export type GovernedTaskStoreDocument = z.infer<typeof GovernedTaskStoreDocumentSchema>;

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

export function createEmptyGovernedTaskStoreDocument(): GovernedTaskStoreDocument {
  return { schemaVersion: 1, storeRevision: 0, seededRegistryVersion: 0, tasks: [] };
}
