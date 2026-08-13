import { randomUUID } from 'node:crypto';

import type { AtomicJsonStore } from './atomicStore.js';
import {
  NOOP_OPERATIONAL_AUDIT,
  type OperationalAudit
} from './operationalAudit.js';
import type { SessionRequest } from './sessionService.js';
import type { TransportBindings } from './transportBindings.js';
import type {
  GovernedLockRecord,
  GovernedSessionRecord,
  LockStoreDocument,
  SessionStoreDocument
} from './types.js';

export type LockScopeInput =
  | { type: 'repository'; key: 'Patricked-code/MCP' }
  | { type: 'task'; key: string }
  | { type: 'resource'; key: string };

export type AcquireLockInput = {
  governedSessionId: string;
  expectedSessionRevision: number;
  scope: LockScopeInput;
  ttlSeconds?: number;
  reason: string;
};

export type ReleaseLockInput = {
  governedSessionId: string;
  lockId: string;
  expectedLockRevision: number;
};

export type GovernedLockService = {
  acquireLock(input: AcquireLockInput, request: SessionRequest): Promise<GovernedLockRecord>;
  releaseLock(input: ReleaseLockInput, request: SessionRequest): Promise<GovernedLockRecord>;
  renewLocksForHeartbeat(
    governedSessionId: string,
    now: Date
  ): Promise<GovernedLockRecord[]>;
  expireLocks(now?: Date): Promise<number>;
  reconcileSessionLockIds(): Promise<number>;
  listActiveLocks(): Promise<GovernedLockRecord[]>;
};

type GovernedLockServiceOptions = {
  store: AtomicJsonStore<LockStoreDocument>;
  sessionStore: AtomicJsonStore<SessionStoreDocument>;
  bindings: TransportBindings;
  defaultTtlSeconds: number;
  maxTtlSeconds: number;
  now?: () => Date;
  audit?: OperationalAudit;
};

function fail(code: string): never {
  throw new Error(code);
}

function normalizeScope(scope: LockScopeInput): string {
  if (scope.type === 'repository') {
    if (scope.key !== 'Patricked-code/MCP') fail('LOCK_SCOPE_INVALID');
    return 'repository:Patricked-code/MCP';
  }
  if (scope.type === 'task') {
    if (!/^TASK-[0-9]{8}-[0-9]{3,}$/.test(scope.key)) fail('LOCK_SCOPE_INVALID');
    return `task:${scope.key}`;
  }
  if (
    scope.key.length < 1
    || scope.key.length > 160
    || scope.key.startsWith('/')
    || scope.key.includes('..')
    || !/^[A-Za-z0-9./:_-]+$/.test(scope.key)
  ) fail('LOCK_SCOPE_INVALID');
  return `resource:${scope.key}`;
}

function canAccess(
  session: GovernedSessionRecord,
  request: SessionRequest,
  bindings: TransportBindings
): boolean {
  return bindings.lookup(request.transportSessionId) === session.governedSessionId
    || (
      request.identity.assurance === 'oauth_subject'
      && request.identity.principalId !== null
      && request.identity.principalId === session.ownerPrincipalId
    );
}

export function createGovernedLockService(
  options: GovernedLockServiceOptions
): GovernedLockService {
  const currentTime = options.now ?? (() => new Date());
  const audit = options.audit ?? NOOP_OPERATIONAL_AUDIT;

  async function requireSession(
    governedSessionId: string,
    request: SessionRequest,
    expectedSessionRevision?: number
  ): Promise<GovernedSessionRecord> {
    const session = (await options.sessionStore.read()).sessions.find(
      (candidate) => candidate.governedSessionId === governedSessionId
    );
    if (!session) fail('SESSION_NOT_FOUND');
    if (!canAccess(session, request, options.bindings)) fail('SESSION_NOT_BOUND');
    if (['CLOSED', 'EXPIRED'].includes(session.status)) fail(`SESSION_${session.status}`);
    if (
      expectedSessionRevision !== undefined
      && session.sessionRevision !== expectedSessionRevision
    ) fail('SESSION_REVISION_MISMATCH');
    return session;
  }

  async function compensateLock(lockId: string): Promise<void> {
    await options.store.update((document) => ({
      ...document,
      storeRevision: document.storeRevision + 1,
      locks: document.locks.map((lock) => lock.lockId === lockId
        ? { ...lock, status: 'RELEASED' as const, lockRevision: lock.lockRevision + 1 }
        : lock)
    }));
  }

  return {
    async acquireLock(input, request) {
      const scope = normalizeScope(input.scope);
      const ttlSeconds = input.ttlSeconds ?? options.defaultTtlSeconds;
      if (
        !Number.isInteger(ttlSeconds)
        || ttlSeconds < 30
        || ttlSeconds > options.maxTtlSeconds
      ) fail('LOCK_TTL_INVALID');
      if (!input.reason.trim() || input.reason.length > 240) fail('LOCK_REASON_INVALID');
      await requireSession(
        input.governedSessionId,
        request,
        input.expectedSessionRevision
      );

      const at = currentTime();
      const lock: GovernedLockRecord = {
        schemaVersion: 1,
        lockId: randomUUID(),
        scope,
        governedSessionId: input.governedSessionId,
        acquiredAt: at.toISOString(),
        expiresAt: new Date(at.getTime() + ttlSeconds * 1_000).toISOString(),
        renewedAt: at.toISOString(),
        reason: input.reason,
        status: 'ACTIVE',
        lockRevision: 1
      };

      let conflictingLockId: string | null = null;
      try {
        await options.store.update((document) => {
          const conflict = document.locks.find((candidate) => (
            candidate.scope === scope
            && candidate.status === 'ACTIVE'
            && Date.parse(candidate.expiresAt) > at.getTime()
            && candidate.governedSessionId !== input.governedSessionId
          ));
          if (conflict) {
            conflictingLockId = conflict.lockId;
            fail(`LOCK_CONFLICT:${conflict.governedSessionId}`);
          }
          return {
            ...document,
            storeRevision: document.storeRevision + 1,
            locks: [...document.locks, lock]
          };
        });
      } catch (error) {
        if (conflictingLockId) {
          await audit.record({
            type: 'lock.conflicted',
            governedSessionId: input.governedSessionId,
            scope,
            conflictingLockId
          });
        }
        throw error;
      }

      try {
        await options.sessionStore.update((document) => {
          const index = document.sessions.findIndex(
            (session) => session.governedSessionId === input.governedSessionId
          );
          const session = index >= 0 ? document.sessions[index] : undefined;
          if (!session) fail('SESSION_NOT_FOUND');
          if (session.sessionRevision !== input.expectedSessionRevision) {
            fail('SESSION_REVISION_MISMATCH');
          }
          const sessions = [...document.sessions];
          sessions[index] = {
            ...session,
            lockIds: [...new Set([...session.lockIds, lock.lockId])],
            sessionRevision: session.sessionRevision + 1
          };
          return { ...document, storeRevision: document.storeRevision + 1, sessions };
        });
      } catch (error) {
        await compensateLock(lock.lockId);
        throw error;
      }
      await audit.record({ type: 'lock.acquired', lock });
      return lock;
    },

    async releaseLock(input, request) {
      await requireSession(input.governedSessionId, request);
      let released: GovernedLockRecord | null = null;
      let changed = false;
      await options.store.update((document) => {
        const index = document.locks.findIndex((lock) => lock.lockId === input.lockId);
        const current = index >= 0 ? document.locks[index] : undefined;
        if (!current) fail('LOCK_NOT_FOUND');
        if (current.governedSessionId !== input.governedSessionId) fail('LOCK_NOT_OWNED');
        if (current.status !== 'ACTIVE') {
          released = current;
          return document;
        }
        if (current.lockRevision !== input.expectedLockRevision) fail('LOCK_REVISION_MISMATCH');
        released = { ...current, status: 'RELEASED', lockRevision: current.lockRevision + 1 };
        changed = true;
        const locks = [...document.locks];
        locks[index] = released;
        return { ...document, storeRevision: document.storeRevision + 1, locks };
      });
      if (!released) fail('LOCK_RELEASE_FAILED');
      if (!changed) return released;

      await options.sessionStore.update((document) => ({
        ...document,
        storeRevision: document.storeRevision + 1,
        sessions: document.sessions.map((session) => session.governedSessionId === input.governedSessionId
          ? {
              ...session,
              lockIds: session.lockIds.filter((lockId) => lockId !== input.lockId),
              sessionRevision: session.sessionRevision + 1
            }
          : session)
      }));
      await audit.record({ type: 'lock.released', lock: released });
      return released;
    },

    async renewLocksForHeartbeat(governedSessionId, at) {
      const renewed: GovernedLockRecord[] = [];
      await options.store.update((document) => {
        const locks = document.locks.map((lock) => {
          if (
            lock.governedSessionId !== governedSessionId
            || lock.status !== 'ACTIVE'
            || Date.parse(lock.expiresAt) <= at.getTime()
          ) return lock;
          const originalTtlMs = Math.min(
            options.maxTtlSeconds * 1_000,
            Math.max(30_000, Date.parse(lock.expiresAt) - Date.parse(lock.renewedAt))
          );
          const next = {
            ...lock,
            renewedAt: at.toISOString(),
            expiresAt: new Date(at.getTime() + originalTtlMs).toISOString(),
            lockRevision: lock.lockRevision + 1
          };
          renewed.push(next);
          return next;
        });
        if (renewed.length === 0) return document;
        return { ...document, storeRevision: document.storeRevision + 1, locks };
      });
      for (const lock of renewed) {
        await audit.record({ type: 'lock.renewed', lock });
      }
      return renewed;
    },

    async expireLocks(at = currentTime()) {
      const expired: GovernedLockRecord[] = [];
      await options.store.update((document) => {
        const locks = document.locks.map((lock) => {
          if (lock.status !== 'ACTIVE' || Date.parse(lock.expiresAt) > at.getTime()) return lock;
          const next = { ...lock, status: 'EXPIRED' as const, lockRevision: lock.lockRevision + 1 };
          expired.push(next);
          return next;
        });
        if (expired.length === 0) return document;
        return { ...document, storeRevision: document.storeRevision + 1, locks };
      });
      if (expired.length > 0) {
        const expiredSet = new Set(expired.map((lock) => lock.lockId));
        await options.sessionStore.update((document) => ({
          ...document,
          storeRevision: document.storeRevision + 1,
          sessions: document.sessions.map((session) => {
            const lockIds = session.lockIds.filter((lockId) => !expiredSet.has(lockId));
            return lockIds.length === session.lockIds.length
              ? session
              : { ...session, lockIds, sessionRevision: session.sessionRevision + 1 };
          })
        }));
      }
      for (const lock of expired) {
        await audit.record({ type: 'lock.expired', lock });
      }
      return expired.length;
    },

    async reconcileSessionLockIds() {
      const at = currentTime().getTime();
      const locks = (await options.store.read()).locks.filter((lock) => (
        lock.status === 'ACTIVE' && Date.parse(lock.expiresAt) > at
      ));
      const desiredBySession = new Map<string, string[]>();
      for (const lock of locks) {
        const desired = desiredBySession.get(lock.governedSessionId) ?? [];
        desired.push(lock.lockId);
        desiredBySession.set(lock.governedSessionId, desired);
      }
      const before = await options.sessionStore.read();
      const needsRepair = before.sessions.some((session) => {
        const desired = desiredBySession.get(session.governedSessionId) ?? [];
        return session.lockIds.length !== desired.length
          || session.lockIds.some((lockId, index) => lockId !== desired[index]);
      });
      if (!needsRepair) return 0;

      let repaired = 0;
      await options.sessionStore.update((document) => {
        const sessions = document.sessions.map((session) => {
          const desired = desiredBySession.get(session.governedSessionId) ?? [];
          const aligned = session.lockIds.length === desired.length
            && session.lockIds.every((lockId, index) => lockId === desired[index]);
          if (aligned) return session;
          repaired += 1;
          return {
            ...session,
            lockIds: [...desired],
            sessionRevision: session.sessionRevision + 1
          };
        });
        return repaired === 0
          ? document
          : { ...document, storeRevision: document.storeRevision + 1, sessions };
      });
      return repaired;
    },

    async listActiveLocks() {
      const at = currentTime().getTime();
      return (await options.store.read()).locks.filter((lock) => (
        lock.status === 'ACTIVE' && Date.parse(lock.expiresAt) > at
      ));
    }
  };
}
