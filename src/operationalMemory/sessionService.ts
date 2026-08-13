import { randomUUID } from 'node:crypto';

import type { AtomicJsonStore } from './atomicStore.js';
import { createResumeSecret, hashResumeSecret, verifyResumeSecret } from './resumeProof.js';
import type { TransportBindings } from './transportBindings.js';
import type {
  GovernedCheckpoint,
  GovernedSessionPublicRecord,
  GovernedSessionRecord,
  IdentityAssurance,
  SessionStoreDocument
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
  expireIdleSessions(): Promise<number>;
  lookupGovernedSessionId(transportSessionId: string | undefined): string | null;
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
};

function publicSession(session: GovernedSessionRecord): GovernedSessionPublicRecord {
  const { resumeSecretHash: _resumeSecretHash, ...visible } = session;
  return visible;
}

function fail(code: string): never {
  throw new Error(code);
}

export function createGovernedSessionService(
  options: GovernedSessionServiceOptions
): GovernedSessionService {
  const now = options.now ?? (() => new Date());
  const getLiveState = options.getLiveState ?? (async () => ({ stateVersion: 0 }));

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
    if (!changed) fail('SESSION_UPDATE_FAILED');
    return publicSession(changed);
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
        openedAt
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
          sessions: [...document.sessions, record]
        }));
      } catch (error) {
        options.bindings.unbind(request.transportSessionId);
        throw error;
      }
      return { session: publicSession(record), resumeSecret };
    },

    async resumeSession(input, request) {
      assertTransportAvailable(request.transportSessionId, input.governedSessionId);
      const resumedAt = now();
      let resumed: GovernedSessionRecord | null = null;
      let boundDuringOperation = false;

      await options.store.update(async (document) => {
        const index = document.sessions.findIndex(
          (session) => session.governedSessionId === input.governedSessionId
        );
        if (index < 0) fail('SESSION_NOT_FOUND');
        const current = document.sessions[index];
        if (!current) fail('SESSION_NOT_FOUND');
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

        const currentTransport = options.bindings.bind(
          request.transportSessionId,
          current.governedSessionId,
          resumedAt
        );
        boundDuringOperation = true;
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
      }).catch((error) => {
        if (boundDuringOperation) {
          options.bindings.unbind(request.transportSessionId);
        }
        throw error;
      });

      if (!resumed) fail('SESSION_RESUME_FAILED');
      return publicSession(resumed);
    },

    async heartbeat(input, request) {
      return mutateSession(input, request, (session, at) => ({
        ...session,
        status: 'ACTIVE',
        lastHeartbeatAt: at.toISOString(),
        currentTransport: session.currentTransport
          ? { ...session.currentTransport, lastSeenAt: at.toISOString() }
          : null,
        sessionRevision: session.sessionRevision + 1
      }));
    },

    async acknowledgeContext(input, request) {
      const liveState = await getLiveState();
      if (liveState.stateVersion !== input.expectedStateVersion) {
        fail('LIVE_STATE_VERSION_MISMATCH');
      }
      return mutateSession(input, request, (session) => ({
        ...session,
        lastAcknowledgedStateVersion: input.expectedStateVersion,
        sessionRevision: session.sessionRevision + 1
      }));
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
      return checkpoint;
    },

    async pauseSession(input, request) {
      return mutateSession(input, request, (session, at) => ({
        ...session,
        status: 'PAUSED',
        pausedAt: at.toISOString(),
        sessionRevision: session.sessionRevision + 1
      }));
    },

    async closeSession(input, request) {
      const existing = (await options.store.read()).sessions.find(
        (session) => session.governedSessionId === input.governedSessionId
      );
      if (!existing) fail('SESSION_NOT_FOUND');
      if (!canAccess(existing, request)) fail('SESSION_NOT_BOUND');
      if (existing.status === 'CLOSED') return publicSession(existing);
      const closed = await mutateSession(input, request, (session, at) => ({
        ...session,
        status: 'CLOSED',
        closedAt: at.toISOString(),
        currentTransport: null,
        sessionRevision: session.sessionRevision + 1
      }));
      options.bindings.unbindGovernedSession(input.governedSessionId);
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

    async expireIdleSessions() {
      const at = now();
      const expiredIds: string[] = [];
      await options.store.update((document) => {
        const sessions = document.sessions.map((session) => {
          if (
            !['OPEN', 'ACTIVE', 'PAUSED'].includes(session.status)
            || at.getTime() - Date.parse(session.lastHeartbeatAt) <= options.idleTtlSeconds * 1_000
          ) return session;
          expiredIds.push(session.governedSessionId);
          return {
            ...session,
            status: 'EXPIRED' as const,
            expiredAt: at.toISOString(),
            currentTransport: null,
            sessionRevision: session.sessionRevision + 1
          };
        });
        if (expiredIds.length === 0) return document;
        return { ...document, storeRevision: document.storeRevision + 1, sessions };
      });
      for (const governedSessionId of expiredIds) {
        options.bindings.unbindGovernedSession(governedSessionId);
      }
      return expiredIds.length;
    },

    lookupGovernedSessionId(transportSessionId) {
      return options.bindings.lookup(transportSessionId);
    }
  };
}
