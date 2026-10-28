import type { GovernedOperationalContext } from '../governedContext/types.js';
import type {
  OperationalEventJournal,
  OperationalEventMetadata,
  OperationalEventType
} from './eventJournal.js';
import type {
  BootstrapReceipt,
  GovernedCheckpoint,
  GovernedLockRecord,
  GovernedSessionPublicRecord,
  GovernedTaskRecord
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
type BindingResult = 'opened' | 'attached' | 'resumed';

export type OperationalAuditInput =
  | {
      type: SessionAuditType;
      session: GovernedSessionPublicRecord;
      reasonCode?: SessionReasonCode;
    }
  | {
      type: 'client.tool_surface_attested';
      session: GovernedSessionPublicRecord;
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
      type: 'bootstrap.acknowledged';
      session: GovernedSessionPublicRecord;
      receipt: BootstrapReceipt;
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
    }
  | {
      type: 'intent.reconciled';
      governedSessionId: string;
      taskId: string | null;
      classification: 'CONTINUATION' | 'NEW_TASK' | 'DUPLICATE' | 'CONFLICT' | 'BLOCKED' | 'OUT_OF_SCOPE';
      reasonCode: string;
      storeRevision: number;
    }
  | {
      type: 'task.discovered' | 'task.claimed' | 'task.blocked' | 'task.completed';
      governedSessionId: string;
      task: GovernedTaskRecord;
      storeRevision: number;
      reasonCode?: string;
    }
  | {
      type: 'task.transitioned';
      governedSessionId: string;
      task: GovernedTaskRecord;
      previousStatus: string;
      storeRevision: number;
    };

/**
 * The range a checkpoint taken now must cover. `eventIds` is the bounded projection it can link
 * (the last 64 unlinked events). `lastEventId` is the newest event recorded for the session: the
 * replay anchor, kept once every event is linked. `firstEventId` starts the range at the oldest
 * unlinked event, or is null when there is none. The range may span events that earlier
 * checkpoints already linked, but it never leaves out an unlinked one; `eventCount` counts every
 * event the window recorded from `firstEventId` through `lastEventId`.
 */
export type CheckpointCoverage = {
  eventIds: string[];
  firstEventId: string | null;
  lastEventId: string | null;
  eventCount: number;
};

export type OperationalAudit = {
  record(input: OperationalAuditInput): Promise<void>;
  checkpointEventIds?(governedSessionId: string): string[];
  checkpointCoverage?(governedSessionId: string): CheckpointCoverage;
};

function emptyCoverage(): CheckpointCoverage {
  return { eventIds: [], firstEventId: null, lastEventId: null, eventCount: 0 };
}

export const NOOP_OPERATIONAL_AUDIT: OperationalAudit = Object.freeze({
  async record() {},
  checkpointEventIds() { return []; },
  checkpointCoverage: emptyCoverage
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
    case 'client.tool_surface_attested':
      return {
        governedSessionId: input.session.governedSessionId,
        metadata: {
          attestationId: input.session.clientToolSurfaceAttestation?.attestationId ?? null,
          surface: input.session.clientToolSurfaceAttestation?.surface ?? null,
          capabilityCount: input.session.clientToolSurfaceAttestation?.capabilities.length ?? 0,
          sessionRevision: input.session.sessionRevision
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
    case 'bootstrap.acknowledged':
      return {
        governedSessionId: input.session.governedSessionId,
        metadata: {
          bootstrapReceiptId: input.receipt.bootstrapReceiptId,
          stateVersion: input.receipt.stateVersion,
          sessionRevision: input.session.sessionRevision,
          catalogueDigest: input.receipt.catalogueDigest,
          governanceDigest: input.receipt.governanceDigest,
          taskRegistryDigest: input.receipt.taskRegistryDigest,
          limitationCount: input.receipt.limitations.length
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
    case 'intent.reconciled':
      return {
        governedSessionId: input.governedSessionId,
        metadata: {
          taskId: input.taskId,
          classification: input.classification,
          reasonCode: auditText(input.reasonCode, 80),
          storeRevision: input.storeRevision
        }
      };
    case 'task.discovered':
    case 'task.claimed':
    case 'task.blocked':
    case 'task.completed':
      return {
        governedSessionId: input.governedSessionId,
        metadata: {
          taskId: input.task.taskId,
          status: input.task.status,
          taskRevision: input.task.taskRevision,
          storeRevision: input.storeRevision,
          ...(input.type === 'task.blocked' ? { reasonCode: auditText(input.reasonCode ?? 'task_blocked', 80) } : {})
        }
      };
    case 'task.transitioned':
      return {
        governedSessionId: input.governedSessionId,
        metadata: {
          taskId: input.task.taskId,
          previousStatus: input.previousStatus,
          status: input.task.status,
          taskRevision: input.task.taskRevision,
          storeRevision: input.storeRevision
        }
      };
  }
}

type PendingEvent = { eventId: string; ordinal: number };

type PendingWindow = {
  // The last 64 events no checkpoint has linked, in journal order: what a checkpoint can link.
  events: PendingEvent[];
  // The last 64 unlinked events that left that projection, in journal order: a checkpoint whose
  // snapshot was taken before they left can still link them.
  dropped: PendingEvent[];
  // The range start: the oldest unlinked event while `dropped` or `events` still holds it, else a
  // conservative start that may precede events already linked. Null once every event is linked.
  first: PendingEvent | null;
  // The newest event recorded for the session; ordinals count the session's events.
  last: PendingEvent;
};

export function createOperationalAudit(
  journal: OperationalEventJournal,
  onError?: (eventType: OperationalEventType) => void
): OperationalAudit {
  const pendingWindows = new Map<string, PendingWindow>();

  return {
    checkpointEventIds(governedSessionId) {
      return (pendingWindows.get(governedSessionId)?.events ?? []).map((pending) => pending.eventId);
    },

    checkpointCoverage(governedSessionId) {
      const window = pendingWindows.get(governedSessionId);
      if (!window) return emptyCoverage();
      return {
        eventIds: window.events.map((pending) => pending.eventId),
        firstEventId: window.first?.eventId ?? null,
        lastEventId: window.last.eventId,
        eventCount: window.first ? window.last.ordinal - window.first.ordinal + 1 : 0
      };
    },

    async record(input) {
      const event = metadataForAuditEvent(input);
      try {
        const appended = await journal.append({ type: input.type, ...event });
        if (appended.governedSessionId) {
          if (input.type === 'checkpoint.created') {
            // Release only what the checkpoint references: an event appended while it was being
            // created is not in its snapshot and stays pending for the next checkpoint.
            const window = pendingWindows.get(appended.governedSessionId);
            if (window) {
              const covered = new Set(input.checkpoint.eventIds);
              const events = window.events.filter((pending) => !covered.has(pending.eventId));
              const dropped = window.dropped.filter((pending) => !covered.has(pending.eventId));
              // While the start is still held, every unlinked event since it is held too, so the
              // oldest one left is the exact new start. Once it is not, this checkpoint may have
              // linked events no longer held, and the start stays where it is.
              const start = window.first;
              const startHeld = start !== null
                && (window.dropped[0] ?? window.events[0])?.eventId === start.eventId;
              const first = startHeld && covered.has(start.eventId)
                ? dropped[0] ?? events[0] ?? null
                : start;
              // The window outlives a full release: its last event stays the replay anchor.
              pendingWindows.set(appended.governedSessionId, { events, dropped, first, last: window.last });
            }
          } else if (
            input.type === 'session.closed'
            || (input.type === 'transport.unbound' && input.reasonCode === 'session_closed')
          ) {
            // A closed session never creates another checkpoint, so its window could never be
            // released: drop it, and do not reopen one for the unbind that follows the close.
            pendingWindows.delete(appended.governedSessionId);
          } else {
            const window = pendingWindows.get(appended.governedSessionId);
            const pending = { eventId: appended.eventId, ordinal: (window?.last.ordinal ?? 0) + 1 };
            const events = [...(window?.events ?? []), pending];
            pendingWindows.set(appended.governedSessionId, {
              events: events.slice(-64),
              dropped: [...(window?.dropped ?? []), ...events.slice(0, -64)].slice(-64),
              first: window?.first ?? pending,
              last: pending
            });
          }
        }
      } catch {
        // The store closed the session whether or not the journal recorded it: its window can
        // never be released by a checkpoint either way.
        if (input.type === 'session.closed' && event.governedSessionId) {
          pendingWindows.delete(event.governedSessionId);
        }
        try { onError?.(input.type); } catch { /* audit failure remains isolated */ }
      }
    }
  };
}
