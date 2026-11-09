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
export const ACTIVE_OBSERVED_WINDOW_MS = 5 * 60_000;
export const RECENTLY_OBSERVED_WINDOW_MS = 60 * 60_000;

type AuthLike = {
  clientId?: string;
  expiresAt?: number;
  extra?: Record<string, unknown>;
} | undefined;

export type ClientPresenceState =
  | 'ACTIVE_OBSERVED'
  | 'RECENTLY_OBSERVED'
  | 'STALE'
  | 'UNKNOWN'
  | 'AUTH_EXPIRED'
  | 'REVOKED';

export type SyntheticProbeKind = 'health_probe' | 'shared_credential_mcp_request';

/**
 * G2 two-clock presence. The client clock only moves on OAuth-authenticated MCP
 * traffic; the synthetic clock only moves on health probes and shared-credential
 * automation. A read-only projection: never an authority, never a liveness or
 * ownership signal, and STALE never means disconnected.
 */
export type ClientPresence = {
  schemaVersion: 1;
  authoritative: false;
  state: ClientPresenceState;
  lastClientObservedAt: string | null;
  lastSyntheticProbeAt: string | null;
  lastSyntheticProbeKind: SyntheticProbeKind | null;
  clientClock: 'oauth_authenticated_mcp_request';
  syntheticClock: 'health_probe_or_shared_credential';
  syntheticProbeProvesClientPresence: false;
  staleMeansDisconnected: false;
  reasonCodes: string[];
};

export type SyntheticProbeClock = {
  record(kind: SyntheticProbeKind): void;
  last(): { at: string; kind: SyntheticProbeKind } | null;
};

export function createSyntheticProbeClock(options: { now?: () => Date } = {}): SyntheticProbeClock {
  const now = options.now ?? (() => new Date());
  let last: { at: string; kind: SyntheticProbeKind } | null = null;
  return {
    record(kind) {
      last = { at: now().toISOString(), kind };
    },
    last: () => last
  };
}

export function deriveClientPresenceState(input: {
  lastClientObservedAt: string | null;
  authExpiresAt: string | null;
  now: number;
}): { state: ClientPresenceState; reasonCodes: string[] } {
  const reasonCodes = ['REVOCATION_EVIDENCE_UNAVAILABLE'];
  const observed = input.lastClientObservedAt ? Date.parse(input.lastClientObservedAt) : Number.NaN;
  if (!Number.isFinite(observed) || observed > input.now) {
    return { state: 'UNKNOWN', reasonCodes: ['CLIENT_NEVER_OBSERVED', ...reasonCodes] };
  }
  const expires = input.authExpiresAt ? Date.parse(input.authExpiresAt) : Number.NaN;
  if (Number.isFinite(expires) && expires <= input.now) {
    return { state: 'AUTH_EXPIRED', reasonCodes: ['LAST_OBSERVED_TOKEN_EXPIRED', ...reasonCodes] };
  }
  const age = input.now - observed;
  if (age <= ACTIVE_OBSERVED_WINDOW_MS) return { state: 'ACTIVE_OBSERVED', reasonCodes };
  if (age <= RECENTLY_OBSERVED_WINDOW_MS) return { state: 'RECENTLY_OBSERVED', reasonCodes };
  return { state: 'STALE', reasonCodes: ['STALE_IS_NOT_DISCONNECTED', ...reasonCodes] };
}

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
  presenceFor(principalId: string | null): ClientPresence;
};

function principalDigest(principalId: string): string {
  return createHash('sha256').update(principalId).digest('hex');
}

export function createClientObservationRecorder(options: {
  journal: Pick<OperationalEventJournal, 'append'>;
  now?: () => Date;
  maxTrackedPrincipals?: number;
  syntheticClock?: SyntheticProbeClock;
}): ClientObservationRecorder {
  const now = options.now ?? (() => new Date());
  const maxTracked = options.maxTrackedPrincipals ?? DEFAULT_MAX_TRACKED_PRINCIPALS;
  const syntheticClock = options.syntheticClock ?? createSyntheticProbeClock({ now });
  const lastObserved = new Map<string, { at: number; authExpiresAt: number | null }>();
  const lastJournaled = new Map<string, number>();

  function remember(digest: string, at: number, authExpiresAt: number | null): void {
    lastObserved.delete(digest);
    lastObserved.set(digest, { at, authExpiresAt });
    while (lastObserved.size > maxTracked) {
      const oldest = lastObserved.keys().next().value as string;
      lastObserved.delete(oldest);
      lastJournaled.delete(oldest);
    }
  }

  function presence(entry: { at: number; authExpiresAt: number | null } | null, extraReasons: string[]): ClientPresence {
    const lastClientObservedAt = entry ? new Date(entry.at).toISOString() : null;
    const derived = deriveClientPresenceState({
      lastClientObservedAt,
      authExpiresAt: entry?.authExpiresAt ? new Date(entry.authExpiresAt).toISOString() : null,
      now: now().getTime()
    });
    const synthetic = syntheticClock.last();
    return {
      schemaVersion: 1,
      authoritative: false,
      state: derived.state,
      lastClientObservedAt,
      lastSyntheticProbeAt: synthetic?.at ?? null,
      lastSyntheticProbeKind: synthetic?.kind ?? null,
      clientClock: 'oauth_authenticated_mcp_request',
      syntheticClock: 'health_probe_or_shared_credential',
      syntheticProbeProvesClientPresence: false,
      staleMeansDisconnected: false,
      reasonCodes: [...extraReasons, ...derived.reasonCodes]
    };
  }

  return {
    async observe(auth) {
      const classification = classifyClientObservation(auth);
      if (classification.kind !== 'REAL_CLIENT_OBSERVATION') {
        if (classification.reasonCode === 'SHARED_CREDENTIAL_IS_NOT_CLIENT_PRESENCE') {
          syntheticClock.record('shared_credential_mcp_request');
        }
        return { status: 'IGNORED' };
      }

      const at = now().getTime();
      const digest = principalDigest(classification.principalId);
      const expiresAt = typeof auth?.expiresAt === 'number' && Number.isFinite(auth.expiresAt)
        ? auth.expiresAt * 1_000
        : null;
      remember(digest, at, expiresAt);

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
      const entry = lastObserved.get(principalDigest(principalId));
      return entry === undefined ? null : new Date(entry.at).toISOString();
    },

    presenceFor(principalId) {
      if (principalId === null || !principalId.startsWith('oauth:')) {
        return presence(null, ['NO_OAUTH_PRINCIPAL']);
      }
      return presence(lastObserved.get(principalDigest(principalId)) ?? null, []);
    }
  };
}

let defaultSyntheticProbeClock: SyntheticProbeClock | null = null;
let defaultClientObservationRecorder: ClientObservationRecorder | null = null;

export function getDefaultSyntheticProbeClock(): SyntheticProbeClock {
  defaultSyntheticProbeClock ??= createSyntheticProbeClock();
  return defaultSyntheticProbeClock;
}

export function getDefaultClientObservationRecorder(
  journal: Pick<OperationalEventJournal, 'append'>
): ClientObservationRecorder {
  defaultClientObservationRecorder ??= createClientObservationRecorder({
    journal,
    syntheticClock: getDefaultSyntheticProbeClock()
  });
  return defaultClientObservationRecorder;
}
