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
    now: Date
  ): SanitizedTransportMetadata;
  lookup(transportSessionId: string | undefined): string | null;
  unbind(transportSessionId: string): string | null;
  unbindGovernedSession(governedSessionId: string): number;
};

function fingerprintTransport(transportSessionId: string): string {
  return createHash('sha256')
    .update('mcp-transport-v1\0', 'utf8')
    .update(transportSessionId, 'utf8')
    .digest('hex');
}

export function createTransportBindings(): TransportBindings {
  const bindings = new Map<string, string>();

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

  return {
    metadata,
    bind(transportSessionId, governedSessionId, now) {
      bindings.set(transportSessionId, governedSessionId);
      return metadata(transportSessionId, now);
    },
    lookup(transportSessionId) {
      if (!transportSessionId) return null;
      return bindings.get(transportSessionId) ?? null;
    },
    unbind(transportSessionId) {
      const governedSessionId = bindings.get(transportSessionId) ?? null;
      bindings.delete(transportSessionId);
      return governedSessionId;
    },
    unbindGovernedSession(governedSessionId) {
      let removed = 0;
      for (const [transportSessionId, boundGovernedSessionId] of bindings) {
        if (boundGovernedSessionId === governedSessionId) {
          bindings.delete(transportSessionId);
          removed += 1;
        }
      }
      return removed;
    }
  };
}
