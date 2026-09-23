import { z } from 'zod';

const BoundedId = z.string().trim().min(1).max(200);
const GitSha = z.string().regex(/^[0-9a-f]{40}$/);
const Timestamp = z.string().datetime({ offset: true });

export const AgentCoordinationObservationSchema = z.object({
  agentIdentity: BoundedId,
  provider: z.enum(['chatgpt', 'claude', 'codex', 'other']),
  session: z.object({
    sessionId: BoundedId,
    status: z.enum(['OPEN', 'ACTIVE', 'PAUSED', 'EXPIRED', 'CLOSED']),
    lastSeenAt: Timestamp.nullable()
  }).strict(),
  task: z.object({
    taskId: BoundedId,
    status: BoundedId
  }).strict().nullable(),
  claim: z.object({
    claimId: BoundedId,
    status: z.enum(['ACTIVE', 'RELEASED']),
    collisionDomains: z.array(BoundedId).max(100)
  }).strict().nullable(),
  heartbeat: z.object({
    lastSeenAt: Timestamp,
    freshnessWindowSeconds: z.number().int().positive().max(86_400)
  }).strict().nullable(),
  git: z.object({
    repository: BoundedId,
    branch: BoundedId,
    headSha: GitSha
  }).strict(),
  checkpoint: z.object({
    currentStep: BoundedId.nullable(),
    nextAction: z.string().trim().min(1).max(2_000).nullable(),
    blockers: z.array(BoundedId).max(100)
  }).strict().nullable(),
  locks: z.array(z.object({
    lockId: BoundedId,
    collisionDomain: BoundedId
  }).strict()).max(100),
  observedAt: Timestamp
}).strict();

export type AgentCoordinationObservation = z.infer<typeof AgentCoordinationObservationSchema>;
export type AgentLiveness = 'FRESH' | 'STALE' | 'UNKNOWN';

export type AgentCoordinationSnapshot = {
  schemaVersion: 1;
  authoritative: false;
  projectionKind: 'READ_ONLY_AGENT_COORDINATION';
  agentIdentity: string;
  provider: AgentCoordinationObservation['provider'];
  sessionId: string;
  sessionStatus: AgentCoordinationObservation['session']['status'];
  taskId: string | null;
  taskStatus: string | null;
  claimId: string | null;
  claimStatus: 'ACTIVE' | 'RELEASED' | 'NONE';
  collisionDomains: string[];
  liveness: AgentLiveness;
  heartbeatLastSeenAt: string | null;
  releaseAllowedByLiveness: false;
  transferAllowedByLiveness: false;
  repository: string;
  branch: string;
  headSha: string;
  currentStep: string | null;
  nextAction: string | null;
  blockers: string[];
  lockIds: string[];
  observedAt: string;
  authorities: string[];
  reasonCodes: string[];
};

function deriveLiveness(input: AgentCoordinationObservation): AgentLiveness {
  if (!input.heartbeat) return 'UNKNOWN';
  const observed = Date.parse(input.observedAt);
  const heartbeat = Date.parse(input.heartbeat.lastSeenAt);
  if (!Number.isFinite(observed) || !Number.isFinite(heartbeat) || heartbeat > observed) return 'UNKNOWN';
  return observed - heartbeat <= input.heartbeat.freshnessWindowSeconds * 1_000 ? 'FRESH' : 'STALE';
}

export function buildAgentCoordinationSnapshot(
  rawInput: AgentCoordinationObservation
): AgentCoordinationSnapshot {
  const input = AgentCoordinationObservationSchema.parse(rawInput);
  const liveness = deriveLiveness(input);
  const claimStatus = input.claim?.status ?? 'NONE';

  const reasonCodes = [
    'READ_ONLY_PROJECTION_NOT_AUTHORITY',
    liveness === 'FRESH' ? 'HEARTBEAT_FRESH' : liveness === 'STALE' ? 'HEARTBEAT_STALE' : 'HEARTBEAT_UNKNOWN'
  ];
  if (claimStatus === 'ACTIVE' && liveness !== 'FRESH') {
    reasonCodes.push('LIVENESS_NEVER_RELEASES_OR_TRANSFERS_CLAIM');
  }

  return {
    schemaVersion: 1,
    authoritative: false,
    projectionKind: 'READ_ONLY_AGENT_COORDINATION',
    agentIdentity: input.agentIdentity,
    provider: input.provider,
    sessionId: input.session.sessionId,
    sessionStatus: input.session.status,
    taskId: input.task?.taskId ?? null,
    taskStatus: input.task?.status ?? null,
    claimId: input.claim?.claimId ?? null,
    claimStatus,
    collisionDomains: [...new Set(input.claim?.collisionDomains ?? [])].sort(),
    liveness,
    heartbeatLastSeenAt: input.heartbeat?.lastSeenAt ?? null,
    releaseAllowedByLiveness: false,
    transferAllowedByLiveness: false,
    repository: input.git.repository,
    branch: input.git.branch,
    headSha: input.git.headSha,
    currentStep: input.checkpoint?.currentStep ?? null,
    nextAction: input.checkpoint?.nextAction ?? null,
    blockers: [...new Set(input.checkpoint?.blockers ?? [])].sort(),
    lockIds: [...new Set(input.locks.map((lock) => lock.lockId))].sort(),
    observedAt: input.observedAt,
    authorities: [
      'Governed Session',
      'Governed Task Queue',
      'Claim',
      'Lock Service',
      'GitHub'
    ],
    reasonCodes
  };
}
