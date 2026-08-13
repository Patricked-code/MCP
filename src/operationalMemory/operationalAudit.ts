import type { GovernedOperationalContext } from '../governedContext/types.js';
import type {
  OperationalEventJournal,
  OperationalEventMetadata,
  OperationalEventType
} from './eventJournal.js';
import type {
  GovernedCheckpoint,
  GovernedLockRecord,
  GovernedSessionPublicRecord
} from './types.js';

type SessionAuditType =
  | 'session.opened'
  | 'session.resumed'
  | 'session.heartbeat'
  | 'session.paused'
  | 'session.expired'
  | 'session.closed';

type SessionReasonCode = 'paused_by_owner' | 'idle_ttl' | 'closed_by_owner';
type TransportReasonCode = 'transport_closed' | 'transport_replaced' | 'session_closed' | 'session_expired';
type BindingResult = 'opened' | 'resumed';

export type OperationalAuditInput =
  | {
      type: SessionAuditType;
      session: GovernedSessionPublicRecord;
      reasonCode?: SessionReasonCode;
    }
  | {
      type: 'transport.bound';
      session: GovernedSessionPublicRecord;
      bindingResult: BindingResult;
    }
  | {
      type: 'transport.unbound';
      governedSessionId: string;
      fingerprint: string;
      sessionRevision: number;
      reasonCode: TransportReasonCode;
    }
  | {
      type: 'context.read';
      context: GovernedOperationalContext;
    }
  | {
      type: 'context.acknowledged';
      session: GovernedSessionPublicRecord;
      stateVersion: number;
    }
  | {
      type: 'checkpoint.created';
      checkpoint: GovernedCheckpoint;
    }
  | {
      type: 'lock.acquired' | 'lock.renewed' | 'lock.released' | 'lock.expired';
      lock: GovernedLockRecord;
    }
  | {
      type: 'lock.conflicted';
      governedSessionId: string;
      scope: string;
      conflictingLockId: string;
    }
  | {
      type: 'reconcile.requested';
      governedSessionId: string | null;
      stateVersion: number | null;
    }
  | {
      type: 'reconcile.completed';
      governedSessionId: string | null;
      context: GovernedOperationalContext;
      previousStateVersion: number | null;
    };

export type OperationalAudit = {
  record(input: OperationalAuditInput): Promise<void>;
};

export const NOOP_OPERATIONAL_AUDIT: OperationalAudit = Object.freeze({
  async record() {}
});

function auditText(value: string, maxLength = 200): string {
  return value
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

function fingerprint(value: string): string {
  return /^[a-f0-9]{64}$/.test(value) ? value : 'invalid_fingerprint';
}

function metadataForAuditEvent(input: OperationalAuditInput): {
  governedSessionId: string | null;
  metadata: OperationalEventMetadata;
} {
  switch (input.type) {
    case 'session.opened':
      return {
        governedSessionId: input.session.governedSessionId,
        metadata: {
          repository: input.session.repository,
          taskScope: auditText(input.session.taskScope),
          status: input.session.status,
          agentIdentity: auditText(input.session.agentIdentity),
          identityAssurance: input.session.identityAssurance
        }
      };
    case 'session.resumed':
      return {
        governedSessionId: input.session.governedSessionId,
        metadata: {
          repository: input.session.repository,
          taskScope: auditText(input.session.taskScope),
          status: input.session.status,
          identityAssurance: input.session.identityAssurance,
          sessionRevision: input.session.sessionRevision
        }
      };
    case 'session.heartbeat':
      return {
        governedSessionId: input.session.governedSessionId,
        metadata: {
          status: input.session.status,
          sessionRevision: input.session.sessionRevision,
          lockCount: input.session.lockIds.length
        }
      };
    case 'session.paused':
    case 'session.expired':
    case 'session.closed':
      return {
        governedSessionId: input.session.governedSessionId,
        metadata: {
          status: input.session.status,
          sessionRevision: input.session.sessionRevision,
          reasonCode: input.reasonCode ?? 'lifecycle_transition'
        }
      };
    case 'transport.bound':
      return {
        governedSessionId: input.session.governedSessionId,
        metadata: {
          fingerprint: fingerprint(input.session.currentTransport?.fingerprint ?? ''),
          bindingResult: input.bindingResult,
          sessionRevision: input.session.sessionRevision
        }
      };
    case 'transport.unbound':
      return {
        governedSessionId: input.governedSessionId,
        metadata: {
          fingerprint: fingerprint(input.fingerprint),
          reasonCode: input.reasonCode,
          sessionRevision: input.sessionRevision
        }
      };
    case 'context.read':
      return {
        governedSessionId: input.context.session?.governedSessionId ?? null,
        metadata: {
          stateVersion: input.context.liveState?.stateVersion ?? null,
          freshness: input.context.freshness,
          globalAlignment: input.context.liveState?.alignment.global ?? null
        }
      };
    case 'context.acknowledged':
      return {
        governedSessionId: input.session.governedSessionId,
        metadata: {
          stateVersion: input.stateVersion,
          sessionRevision: input.session.sessionRevision
        }
      };
    case 'checkpoint.created':
      return {
        governedSessionId: input.checkpoint.governedSessionId,
        metadata: {
          checkpointId: input.checkpoint.checkpointId,
          resultCode: auditText(input.checkpoint.resultCode, 80),
          sessionRevision: input.checkpoint.sessionRevision,
          eventCount: input.checkpoint.eventIds.length
        }
      };
    case 'lock.acquired':
    case 'lock.renewed':
    case 'lock.released':
    case 'lock.expired':
      return {
        governedSessionId: input.lock.governedSessionId,
        metadata: input.type === 'lock.acquired' || input.type === 'lock.renewed'
          ? {
              lockId: input.lock.lockId,
              scope: auditText(input.lock.scope),
              expiresAt: input.lock.expiresAt,
              lockRevision: input.lock.lockRevision
            }
          : {
              lockId: input.lock.lockId,
              scope: auditText(input.lock.scope),
              lockRevision: input.lock.lockRevision
            }
      };
    case 'lock.conflicted':
      return {
        governedSessionId: input.governedSessionId,
        metadata: {
          scope: auditText(input.scope),
          conflictingLockId: input.conflictingLockId,
          reasonCode: 'active_lock_conflict'
        }
      };
    case 'reconcile.requested':
      return {
        governedSessionId: input.governedSessionId,
        metadata: { reasonCode: 'explicit_context_reconcile', stateVersion: input.stateVersion }
      };
    case 'reconcile.completed':
      return {
        governedSessionId: input.governedSessionId,
        metadata: {
          resultCode: input.context.freshness === 'DEGRADED' ? 'DEGRADED' : 'COMPLETED',
          previousStateVersion: input.previousStateVersion,
          stateVersion: input.context.liveState?.stateVersion ?? null,
          globalAlignment: input.context.liveState?.alignment.global ?? null
        }
      };
  }
}

export function createOperationalAudit(
  journal: OperationalEventJournal,
  onError?: (eventType: OperationalEventType) => void
): OperationalAudit {
  return {
    async record(input) {
      const event = metadataForAuditEvent(input);
      try {
        await journal.append({ type: input.type, ...event });
      } catch {
        try { onError?.(input.type); } catch { /* audit failure remains isolated */ }
      }
    }
  };
}
