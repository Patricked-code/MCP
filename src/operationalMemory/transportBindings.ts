import { createHash } from 'node:crypto';

import type { SanitizedTransportMetadata } from './types.js';

export type TransportBindings = {
  bind(
    transportSessionId: string,
    governedSessionId: string,
    now: Date
  ): SanitizedTransportMetadata;
  lookup(transportSessionId: string | undefined): string | null;
  unbind(transportSessionId: string): string | null;
};

function fingerprintTransport(transportSessionId: string): string {
  return createHash('sha256')
    .update('mcp-transport-v1\0', 'utf8')
    .update(transportSessionId, 'utf8')
    .digest('hex');
}

export function createTransportBindings(): TransportBindings {
  const bindings = new Map<string, string>();

  return {
    bind(transportSessionId, governedSessionId, now) {
      if (!transportSessionId) throw new Error('TRANSPORT_SESSION_ID_REQUIRED');
      bindings.set(transportSessionId, governedSessionId);
      const at = now.toISOString();
      return {
        fingerprint: fingerprintTransport(transportSessionId),
        boundAt: at,
        lastSeenAt: at
      };
    },
    lookup(transportSessionId) {
      if (!transportSessionId) return null;
      return bindings.get(transportSessionId) ?? null;
    },
    unbind(transportSessionId) {
      const governedSessionId = bindings.get(transportSessionId) ?? null;
      bindings.delete(transportSessionId);
      return governedSessionId;
    }
  };
}
