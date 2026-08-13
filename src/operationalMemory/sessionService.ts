import { randomUUID } from 'node:crypto';

import type { AtomicJsonStore } from './atomicStore.js';
import { createResumeSecret, hashResumeSecret, verifyResumeSecret } from './resumeProof.js';
import type { TransportBindings } from './transportBindings.js';
import type {
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
  lookupGovernedSessionId(transportSessionId: string | undefined): string | null;
};

type GovernedSessionServiceOptions = {
  store: AtomicJsonStore<SessionStoreDocument>;
  bindings: TransportBindings;
  idleTtlSeconds: number;
  resumeGraceSeconds: number;
  now?: () => Date;
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

  function assertTransportAvailable(
    transportSessionId: string,
    governedSessionId?: string
  ): void {
    const current = options.bindings.lookup(transportSessionId);
    if (current && current !== governedSessionId) fail('TRANSPORT_BINDING_CONFLICT');
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

    lookupGovernedSessionId(transportSessionId) {
      return options.bindings.lookup(transportSessionId);
    }
  };
}
