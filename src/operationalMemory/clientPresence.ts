import { createHash } from 'node:crypto';

import type { OperationalEventJournal } from './eventJournal.js';

/**
 * G1 Client Presence: records bounded evidence that a real client reached the
 * MCP endpoint. Only OAuth-authenticated MCP requests qualify. The shared
 * credential (automation, deploy attestation) and unauthenticated health probes
 * are never client presence, and agent heartbeats are a separate clock owned by
 * the Governed Session. Nothing here infers a client class, conversation or
 * workspace: the principal is journaled as a digest only.
 */
export const CLIENT_OBSERVATION_THROTTLE_MS = 60_000;
const DEFAULT_MAX_TRACKED_PRINCIPALS = 1_000;

type AuthLike = {
  clientId?: string;
  extra?: Record<string, unknown>;
} | undefined;

export type ClientObservationClassification =
  | { kind: 'REAL_CLIENT_OBSERVATION'; principalId: string }
  | {
      kind: 'NOT_CLIENT_PRESENCE';
      reasonCode:
        | 'UNAUTHENTICATED'
        | 'SHARED_CREDENTIAL_IS_NOT_CLIENT_PRESENCE'
        | 'PRINCIPAL_NOT_OAUTH_SUBJECT';
    };

export function classifyClientObservation(auth: AuthLike): ClientObservationClassification {
  if (!auth) return { kind: 'NOT_CLIENT_PRESENCE', reasonCode: 'UNAUTHENTICATED' };
  const assurance = auth.extra?.identityAssurance;
  if (assurance === 'shared_credential') {
    return { kind: 'NOT_CLIENT_PRESENCE', reasonCode: 'SHARED_CREDENTIAL_IS_NOT_CLIENT_PRESENCE' };
  }
  const principalId = auth.extra?.governedPrincipalId;
  if (
    assurance !== 'oauth_subject'
    || typeof principalId !== 'string'
    || !principalId.startsWith('oauth:')
    || principalId.length > 256
  ) {
    return { kind: 'NOT_CLIENT_PRESENCE', reasonCode: 'PRINCIPAL_NOT_OAUTH_SUBJECT' };
  }
  return { kind: 'REAL_CLIENT_OBSERVATION', principalId };
}

export type ClientObservationResult = {
  status: 'RECORDED' | 'THROTTLED' | 'IGNORED' | 'JOURNAL_FAILED';
};

export type ClientObservationRecorder = {
  observe(auth: AuthLike): Promise<ClientObservationResult>;
  lastClientObservedAt(principalId: string): string | null;
};

function principalDigest(principalId: string): string {
  return createHash('sha256').update(principalId).digest('hex');
}

export function createClientObservationRecorder(options: {
  journal: Pick<OperationalEventJournal, 'append'>;
  now?: () => Date;
  maxTrackedPrincipals?: number;
}): ClientObservationRecorder {
  const now = options.now ?? (() => new Date());
  const maxTracked = options.maxTrackedPrincipals ?? DEFAULT_MAX_TRACKED_PRINCIPALS;
  const lastObserved = new Map<string, number>();
  const lastJournaled = new Map<string, number>();

  function remember(digest: string, at: number): void {
    lastObserved.delete(digest);
    lastObserved.set(digest, at);
    while (lastObserved.size > maxTracked) {
      const oldest = lastObserved.keys().next().value as string;
      lastObserved.delete(oldest);
      lastJournaled.delete(oldest);
    }
  }

  return {
    async observe(auth) {
      const classification = classifyClientObservation(auth);
      if (classification.kind !== 'REAL_CLIENT_OBSERVATION') return { status: 'IGNORED' };

      const at = now().getTime();
      const digest = principalDigest(classification.principalId);
      remember(digest, at);

      const previous = lastJournaled.get(digest);
      if (previous !== undefined && at - previous < CLIENT_OBSERVATION_THROTTLE_MS) {
        return { status: 'THROTTLED' };
      }
      lastJournaled.set(digest, at);
      try {
        await options.journal.append({
          type: 'client.observed',
          governedSessionId: null,
          metadata: {
            source: 'oauth_authenticated_mcp_request',
            identityAssurance: 'oauth_subject',
            principalDigest: digest,
            throttleWindowSeconds: CLIENT_OBSERVATION_THROTTLE_MS / 1_000
          }
        });
        return { status: 'RECORDED' };
      } catch {
        return { status: 'JOURNAL_FAILED' };
      }
    },

    lastClientObservedAt(principalId) {
      const at = lastObserved.get(principalDigest(principalId));
      return at === undefined ? null : new Date(at).toISOString();
    }
  };
}
