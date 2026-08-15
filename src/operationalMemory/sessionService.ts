import { randomUUID } from 'node:crypto';

import type { AtomicJsonStore } from './atomicStore.js';
import {
  NOOP_OPERATIONAL_AUDIT,
  type OperationalAudit
} from './operationalAudit.js';
import { createResumeSecret, hashResumeSecret, verifyResumeSecret } from './resumeProof.js';
import type { TransportBindings } from './transportBindings.js';
import {
  MAX_GOVERNED_SESSION_RECORDS,
  type GovernedCheckpoint,
  type GovernedSessionPublicRecord,
  type GovernedSessionRecord,
  type IdentityAssurance,
  type SessionStoreDocument
} from './types.js';

export type RequestIdentity = {
  principalId: string | null;
  clientId: string | null;
  assurance: 'oauth_subject' | 'shared_credential' | 'declared_only';
};

export type SessionRequest = {
  transportSessionId: string;
  identity: RequestIdentity;
};

export type OpenSessionInput = {
  repository: 'Patricked-code/MCP';
  taskScope: string;
  workBranch: string | null;
  agentIdentity: string;
  blockers: string[];
  nextAction: string | null;
};

export type OpenSessionResult = {
  session: GovernedSessionPublicRecord;
  resumeSecret: string;
};

export type ResumeSessionInput = {
  governedSessionId: string;
  resumeSecret?: string;
  repository: 'Patricked-code/MCP';
  taskScope: string;
  expectedSessionRevision: number;
};

export type GovernedSessionService = {
  openSession(input: OpenSessionInput, request: SessionRequest): Promise<OpenSessionResult>;
  resumeSession(
    input: ResumeSessionInput,
    request: SessionRequest
  ): Promise<GovernedSessionPublicRecord>;
  heartbeat(input: SessionRevisionInput, request: SessionRequest): Promise<GovernedSessionPublicRecord>;
  acknowledgeContext(
    input: SessionRevisionInput & { expectedStateVersion: number },
    request: SessionRequest
  ): Promise<GovernedSessionPublicRecord>;
  createCheckpoint(input: CreateCheckpointInput, request: SessionRequest): Promise<GovernedCheckpoint>;
  pauseSession(input: SessionRevisionInput, request: SessionRequest): Promise<GovernedSessionPublicRecord>;
  closeSession(input: SessionRevisionInput, request: SessionRequest): Promise<GovernedSessionPublicRecord>;
  listVisibleSessions(request: SessionRequest): Promise<GovernedSessionPublicRecord[]>;
  getVisibleSession(
    governedSessionId: string,
    request: SessionRequest
  ): Promise<GovernedSessionPublicRecord | null>;
  countActiveSessions(): Promise<number>;
  expireIdleSessions(): Promise<number>;
  lookupGovernedSessionId(transportSessionId: string | undefined): string | null;
  unbindTransport(transportSessionId: string): string | null;
};

export type SessionRevisionInput = {
  governedSessionId: string;
  expectedSessionRevision: number;
};

export type CreateCheckpointInput = SessionRevisionInput & {
  expectedStateVersion: number;
  completedAction: string;
  resultCode: string;
  pullRequestNumber: number | null;
  observedHeadSha: string | null;
  blockers: string[];
  nextAction: string | null;
};

type GovernedSessionServiceOptions = {
  store: AtomicJsonStore<SessionStoreDocument>;
  bindings: TransportBindings;
  idleTtlSeconds: number;
  resumeGraceSeconds: number;
  now?: () => Date;
  getLiveState?: () => Promise<{ stateVersion: number }>;
  renewLocksForHeartbeat?: (
    governedSessionId: string,
    at: Date
  ) => Promise<unknown>;
  releaseLocksForSession?: (governedSessionId: string) => Promise<unknown>;
  audit?: OperationalAudit;
};

function publicSession(session: GovernedSessionRecord): GovernedSessionPublicRecord {
  const { resumeSecretHash: _resumeSecretHash, ...visible } = session;
  return visible;
}

function fail(code: string): never {
  throw new Error(code);
}

function sessionTerminalTime(session: GovernedSessionRecord): number {
  const terminalAt = session.status === 'CLOSED' ? session.closedAt : session.expiredAt;
  return Date.parse(terminalAt ?? session.createdAt);
}

function retainSessionsForAppend(
  sessions: GovernedSessionRecord[]
): GovernedSessionRecord[] {
  const requiredSlots = sessions.length + 1 - MAX_GOVERNED_SESSION_RECORDS;
  if (requiredSlots <= 0) return sessions;

  const removable = sessions.filter((session) => (
    session.status === 'CLOSED' || session.status === 'EXPIRED'
  )).sort((left, right) => (
    sessionTerminalTime(left) - sessionTerminalTime(right)
    || left.governedSessionId.localeCompare(right.governedSessionId)
  ));
  if (removable.length < requiredSlots) fail('SESSION_STORE_CAPACITY_EXCEEDED');

  const removedIds = new Set(
    removable.slice(0, requiredSlots).map((session) => session.governedSessionId)
  );
  return sessions.filter((session) => !removedIds.has(session.governedSessionId));
}

export function createGovernedSessionService(
  options: GovernedSessionServiceOptions
): GovernedSessionService {
  const now = options.now ?? (() => new Date());
  const getLiveState = options.getLiveState ?? (async () => ({ stateVersion: 0 }));
  const audit = options.audit ?? NOOP_OPERATIONAL_AUDIT;

  function assertTransportAvailable(
    transportSessionId: string,
    governedSessionId?: string
  ): void {
    const current = options.bindings.lookup(transportSessionId);
    if (current && current !== governedSessionId) fail('TRANSPORT_BINDING_CONFLICT');
  }

  function canAccess(session: GovernedSessionRecord, request: SessionRequest): boolean {
    return options.bindings.lookup(request.transportSessionId) === session.governedSessionId
      || (
        request.identity.assurance === 'oauth_subject'
        && request.identity.principalId !== null
        && request.identity.principalId === session.ownerPrincipalId
      );
  }

  function assertMutable(
    session: GovernedSessionRecord,
    input: SessionRevisionInput,
    request: SessionRequest
  ): void {
    if (!canAccess(session, request)) fail('SESSION_NOT_BOUND');
    if (session.status === 'CLOSED') fail('SESSION_CLOSED');
    if (session.status === 'EXPIRED') fail('SESSION_EXPIRED');
    if (session.sessionRevision !== input.expectedSessionRevision) {
      fail('SESSION_REVISION_MISMATCH');
    }
  }

  async function mutateSession(
    input: SessionRevisionInput,
    request: SessionRequest,
    mutator: (session: GovernedSessionRecord, at: Date) => GovernedSessionRecord
  ): Promise<GovernedSessionPublicRecord> {
    let changed: GovernedSessionRecord | null = null;
    const at = now();
    await options.store.update((document) => {
      const index = document.sessions.findIndex(
        (session) => session.governedSessionId === input.governedSessionId
      );
      const current = index >= 0 ? document.sessions[index] : undefined;
      if (!current) fail('SESSION_NOT_FOUND');
      assertMutable(current, input, request);
      changed = mutator(current, at);
      const sessions = [...document.sessions];
      sessions[index] = changed;
      return { ...document, storeRevision: document.storeRevision + 1, sessions };
    });
    const persisted = changed as GovernedSessionRecord | null;
    if (!persisted) fail('SESSION_UPDATE_FAILED');
    options.bindings.updateGovernedSessionRevision(
      input.governedSessionId,
      persisted.sessionRevision
    );
    return publicSession(persisted);
  }

  return {
    async openSession(input, request) {
      assertTransportAvailable(request.transportSessionId);
      const resumeSecret = createResumeSecret();
      const resumeSecretHash = await hashResumeSecret(resumeSecret);
      const governedSessionId = randomUUID();
      const openedAt = now();
      const currentTransport = options.bindings.bind(
        request.transportSessionId,
        governedSessionId,
        openedAt,
        1
      );
      const assurance: IdentityAssurance = request.identity.assurance;
      const record: GovernedSessionRecord = {
        schemaVersion: 1,
        governedSessionId,
        repository: input.repository,
        taskScope: input.taskScope,
        workBranch: input.workBranch,
        agentIdentity: input.agentIdentity,
        ownerPrincipalId: assurance === 'oauth_subject' ? request.identity.principalId : null,
        identityAssurance: assurance,
        resumeSecretHash,
        status: 'OPEN',
        createdAt: openedAt.toISOString(),
        resumedAt: null,
        lastHeartbeatAt: openedAt.toISOString(),
        pausedAt: null,
        expiredAt: null,
        closedAt: null,
        currentTransport,
        lastAcknowledgedStateVersion: null,
        sessionRevision: 1,
        lastCheckpoint: null,
        blockers: [...input.blockers],
        nextAction: input.nextAction,
        lockIds: [],
        resumePolicy: 'stable_principal_or_resume_secret'
      };

      try {
        await options.store.update((document) => ({
          ...document,
          storeRevision: document.storeRevision + 1,
          sessions: [...retainSessionsForAppend(document.sessions), record]
        }));
      } catch (error) {
        options.bindings.unbind(request.transportSessionId);
        throw error;
      }
      await audit.record({ type: 'session.opened', session: publicSession(record) });
      await audit.record({
        type: 'transport.bound',
        session: publicSession(record),
        bindingResult: 'opened'
      });
      return { session: publicSession(record), resumeSecret };
    },

    async resumeSession(input, request) {
      assertTransportAvailable(request.transportSessionId, input.governedSessionId);
      const resumedAt = now();
      let resumed: GovernedSessionRecord | null = null;
      let previousTransportFingerprint: string | null = null;

      await options.store.update(async (document) => {
        const index = document.sessions.findIndex(
          (session) => session.governedSessionId === input.governedSessionId
        );
        if (index < 0) fail('SESSION_NOT_FOUND');
        const current = document.sessions[index];
        if (!current) fail('SESSION_NOT_FOUND');
        previousTransportFingerprint = current.currentTransport?.fingerprint ?? null;
        if (current.status === 'CLOSED') fail('SESSION_CLOSED');
        if (current.status === 'EXPIRED') {
          const expiredAt = current.expiredAt ? Date.parse(current.expiredAt) : Number.NaN;
          if (
            !Number.isFinite(expiredAt)
            || resumedAt.getTime() - expiredAt > options.resumeGraceSeconds * 1_000
          ) fail('SESSION_EXPIRED');
        }
        if (current.repository !== input.repository || current.taskScope !== input.taskScope) {
          fail('SESSION_SCOPE_MISMATCH');
        }
        if (current.sessionRevision !== input.expectedSessionRevision) {
          fail('SESSION_REVISION_MISMATCH');
        }

        const oauthOwnerMatches = request.identity.assurance === 'oauth_subject'
          && request.identity.principalId !== null
          && request.identity.principalId === current.ownerPrincipalId;
        const resumeSecretMatches = input.resumeSecret
          ? await verifyResumeSecret(input.resumeSecret, current.resumeSecretHash)
          : false;
        if (!oauthOwnerMatches && !resumeSecretMatches) {
          fail('SESSION_RESUME_PROOF_REQUIRED');
        }

        const currentTransport = options.bindings.metadata(
          request.transportSessionId,
          resumedAt
        );
        resumed = {
          ...current,
          status: 'ACTIVE',
          resumedAt: resumedAt.toISOString(),
          lastHeartbeatAt: resumedAt.toISOString(),
          currentTransport,
          pausedAt: null,
          expiredAt: null,
          identityAssurance: oauthOwnerMatches ? 'oauth_subject' : 'resume_secret',
          sessionRevision: current.sessionRevision + 1
        };
        const sessions = [...document.sessions];
        sessions[index] = resumed;
        return {
          ...document,
          storeRevision: document.storeRevision + 1,
          sessions
        };
      });

      if (!resumed) fail('SESSION_RESUME_FAILED');
      const visible = publicSession(resumed);
      options.bindings.unbindGovernedSession(input.governedSessionId);
      options.bindings.bind(
        request.transportSessionId,
        input.governedSessionId,
        resumedAt,
        visible.sessionRevision
      );
      if (previousTransportFingerprint) {
        await audit.record({
          type: 'transport.unbound',
          governedSessionId: visible.governedSessionId,
          fingerprint: previousTransportFingerprint,
          sessionRevision: visible.sessionRevision,
          reasonCode: 'transport_replaced'
        });
      }
      await audit.record({ type: 'session.resumed', session: visible });
      await audit.record({ type: 'transport.bound', session: visible, bindingResult: 'resumed' });
      return visible;
    },

    async heartbeat(input, request) {
      const heartbeatAt = now();
      const updated = await mutateSession(input, request, (session) => ({
        ...session,
        status: 'ACTIVE',
        lastHeartbeatAt: heartbeatAt.toISOString(),
        currentTransport: session.currentTransport
          ? { ...session.currentTransport, lastSeenAt: heartbeatAt.toISOString() }
          : null,
        sessionRevision: session.sessionRevision + 1
      }));
      await options.renewLocksForHeartbeat?.(input.governedSessionId, heartbeatAt);
      await audit.record({ type: 'session.heartbeat', session: updated });
      return updated;
    },

    async acknowledgeContext(input, request) {
      const liveState = await getLiveState();
      if (liveState.stateVersion !== input.expectedStateVersion) {
        fail('LIVE_STATE_VERSION_MISMATCH');
      }
      const acknowledged = await mutateSession(input, request, (session) => ({
        ...session,
        lastAcknowledgedStateVersion: input.expectedStateVersion,
        sessionRevision: session.sessionRevision + 1
      }));
      await audit.record({
        type: 'context.acknowledged',
        session: acknowledged,
        stateVersion: input.expectedStateVersion
      });
      return acknowledged;
    },

    async createCheckpoint(input, request) {
      const liveState = await getLiveState();
      if (liveState.stateVersion !== input.expectedStateVersion) {
        fail('LIVE_STATE_VERSION_MISMATCH');
      }
      let checkpoint: GovernedCheckpoint | null = null;
      await mutateSession(input, request, (session, at) => {
        if (session.lastAcknowledgedStateVersion !== input.expectedStateVersion) {
          fail('CONTEXT_NOT_ACKNOWLEDGED');
        }
        checkpoint = {
          checkpointId: randomUUID(),
          governedSessionId: session.governedSessionId,
          createdAt: at.toISOString(),
          taskScope: session.taskScope,
          workBranch: session.workBranch,
          pullRequestNumber: input.pullRequestNumber,
          observedHeadSha: input.observedHeadSha,
          acknowledgedStateVersion: input.expectedStateVersion,
          completedAction: input.completedAction,
          resultCode: input.resultCode,
          blockers: [...input.blockers],
          nextAction: input.nextAction,
          eventIds: [],
          sessionRevision: session.sessionRevision + 1
        };
        return {
          ...session,
          lastCheckpoint: checkpoint,
          blockers: [...input.blockers],
          nextAction: input.nextAction,
          sessionRevision: session.sessionRevision + 1
        };
      });
      if (!checkpoint) fail('CHECKPOINT_CREATE_FAILED');
      await audit.record({ type: 'checkpoint.created', checkpoint });
      return checkpoint;
    },

    async pauseSession(input, request) {
      const paused = await mutateSession(input, request, (session, at) => ({
        ...session,
        status: 'PAUSED',
        pausedAt: at.toISOString(),
        sessionRevision: session.sessionRevision + 1
      }));
      await audit.record({ type: 'session.paused', session: paused, reasonCode: 'paused_by_owner' });
      return paused;
    },

    async closeSession(input, request) {
      const existing = (await options.store.read()).sessions.find(
        (session) => session.governedSessionId === input.governedSessionId
      );
      if (!existing) fail('SESSION_NOT_FOUND');
      if (!canAccess(existing, request)) fail('SESSION_NOT_BOUND');
      if (existing.status === 'CLOSED') return publicSession(existing);
      assertMutable(existing, input, request);
      await options.releaseLocksForSession?.(input.governedSessionId);
      const previousTransportFingerprint = existing.currentTransport?.fingerprint ?? null;
      const closed = await mutateSession(input, request, (session, at) => ({
        ...session,
        status: 'CLOSED',
        closedAt: at.toISOString(),
        currentTransport: null,
        lockIds: [],
        sessionRevision: session.sessionRevision + 1
      }));
      options.bindings.unbindGovernedSession(input.governedSessionId);
      await audit.record({ type: 'session.closed', session: closed, reasonCode: 'closed_by_owner' });
      if (previousTransportFingerprint) {
        await audit.record({
          type: 'transport.unbound',
          governedSessionId: closed.governedSessionId,
          fingerprint: previousTransportFingerprint,
          sessionRevision: closed.sessionRevision,
          reasonCode: 'session_closed'
        });
      }
      return closed;
    },

    async listVisibleSessions(request) {
      const document = await options.store.read();
      return document.sessions.filter((session) => canAccess(session, request)).map(publicSession);
    },

    async getVisibleSession(governedSessionId, request) {
      const session = (await options.store.read()).sessions.find(
        (candidate) => candidate.governedSessionId === governedSessionId
      );
      return session && canAccess(session, request) ? publicSession(session) : null;
    },

    async countActiveSessions() {
      return (await options.store.read()).sessions.filter((session) => (
        ['OPEN', 'ACTIVE', 'PAUSED'].includes(session.status)
      )).length;
    },

    async expireIdleSessions() {
      const at = now();
      const expired: Array<{
        session: GovernedSessionPublicRecord;
        previousTransportFingerprint: string | null;
      }> = [];
      await options.store.update((document) => {
        const sessions = document.sessions.map((session) => {
          if (
            !['OPEN', 'ACTIVE', 'PAUSED'].includes(session.status)
            || at.getTime() - Date.parse(session.lastHeartbeatAt) <= options.idleTtlSeconds * 1_000
          ) return session;
          const next = {
            ...session,
            status: 'EXPIRED' as const,
            expiredAt: at.toISOString(),
            currentTransport: null,
            sessionRevision: session.sessionRevision + 1
          };
          expired.push({
            session: publicSession(next),
            previousTransportFingerprint: session.currentTransport?.fingerprint ?? null
          });
          return next;
        });
        if (expired.length === 0) return document;
        return { ...document, storeRevision: document.storeRevision + 1, sessions };
      });
      for (const entry of expired) {
        options.bindings.unbindGovernedSession(entry.session.governedSessionId);
        await audit.record({
          type: 'session.expired',
          session: entry.session,
          reasonCode: 'idle_ttl'
        });
        if (entry.previousTransportFingerprint) {
          await audit.record({
            type: 'transport.unbound',
            governedSessionId: entry.session.governedSessionId,
            fingerprint: entry.previousTransportFingerprint,
            sessionRevision: entry.session.sessionRevision,
            reasonCode: 'session_expired'
          });
        }
      }
      return expired.length;
    },

    lookupGovernedSessionId(transportSessionId) {
      return options.bindings.lookup(transportSessionId);
    },

    unbindTransport(transportSessionId) {
      const binding = options.bindings.unbindSnapshot(transportSessionId);
      if (binding) {
        void audit.record({
          type: 'transport.unbound',
          governedSessionId: binding.governedSessionId,
          fingerprint: binding.fingerprint,
          sessionRevision: binding.sessionRevision,
          reasonCode: 'transport_closed'
        });
      }
      return binding?.governedSessionId ?? null;
    }
  };
}
