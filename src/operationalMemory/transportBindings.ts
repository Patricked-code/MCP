import { createHash } from 'node:crypto';

import type { SanitizedTransportMetadata } from './types.js';

export type TransportBindings = {
  metadata(
    transportSessionId: string,
    now: Date
  ): SanitizedTransportMetadata;
  bind(
    transportSessionId: string,
    governedSessionId: string,
    now: Date,
    sessionRevision: number
  ): SanitizedTransportMetadata;
  lookup(transportSessionId: string | undefined): string | null;
  updateGovernedSessionRevision(governedSessionId: string, sessionRevision: number): void;
  unbindSnapshot(transportSessionId: string): UnboundTransportBinding | null;
  unbind(transportSessionId: string): string | null;
  unbindGovernedSession(governedSessionId: string): number;
};

export type UnboundTransportBinding = {
  governedSessionId: string;
  fingerprint: string;
  sessionRevision: number;
};

type TransportBinding = UnboundTransportBinding;

function fingerprintTransport(transportSessionId: string): string {
  return createHash('sha256')
    .update('mcp-transport-v1\0', 'utf8')
    .update(transportSessionId, 'utf8')
    .digest('hex');
}

export function createTransportBindings(): TransportBindings {
  const bindings = new Map<string, TransportBinding>();

  function metadata(
    transportSessionId: string,
    now: Date
  ): SanitizedTransportMetadata {
    if (!transportSessionId) throw new Error('TRANSPORT_SESSION_ID_REQUIRED');
    const at = now.toISOString();
    return {
      fingerprint: fingerprintTransport(transportSessionId),
      boundAt: at,
      lastSeenAt: at
    };
  }

  function unbindSnapshot(transportSessionId: string): UnboundTransportBinding | null {
    const binding = bindings.get(transportSessionId) ?? null;
    bindings.delete(transportSessionId);
    return binding ? { ...binding } : null;
  }

  return {
    metadata,
    bind(transportSessionId, governedSessionId, now, sessionRevision) {
      const sanitized = metadata(transportSessionId, now);
      bindings.set(transportSessionId, {
        governedSessionId,
        fingerprint: sanitized.fingerprint,
        sessionRevision
      });
      return sanitized;
    },
    lookup(transportSessionId) {
      if (!transportSessionId) return null;
      return bindings.get(transportSessionId)?.governedSessionId ?? null;
    },
    updateGovernedSessionRevision(governedSessionId, sessionRevision) {
      for (const binding of bindings.values()) {
        if (binding.governedSessionId === governedSessionId) {
          binding.sessionRevision = sessionRevision;
        }
      }
    },
    unbindSnapshot,
    unbind(transportSessionId) {
      return unbindSnapshot(transportSessionId)?.governedSessionId ?? null;
    },
    unbindGovernedSession(governedSessionId) {
      let removed = 0;
      for (const [transportSessionId, binding] of bindings) {
        if (binding.governedSessionId === governedSessionId) {
          bindings.delete(transportSessionId);
          removed += 1;
        }
      }
      return removed;
    }
  };
}
