import { randomUUID } from 'node:crypto';

import type { AtomicJsonStore } from './atomicStore.js';
import {
  NOOP_OPERATIONAL_AUDIT,
  type OperationalAudit
} from './operationalAudit.js';
import type { SessionRequest } from './sessionService.js';
import type { TransportBindings } from './transportBindings.js';
import {
  MAX_GOVERNED_LOCK_RECORDS,
  type GovernedLockRecord,
  type GovernedSessionRecord,
  type LockStoreDocument,
  type SessionStoreDocument
} from './types.js';

export type LockScopeInput =
  | { type: 'repository'; key: string }
  | { type: 'task'; key: string }
  | { type: 'resource'; key: string };

export type AcquireLockInput = {
  governedSessionId: string;
  expectedSessionRevision: number;
  scope: LockScopeInput;
  ttlSeconds?: number;
  reason: string;
};

export type AcquireLocksAtomicallyInput = {
  governedSessionId: string;
  expectedSessionRevision: number;
  scopes: LockScopeInput[];
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
  acquireLocksAtomically(
    input: AcquireLocksAtomicallyInput,
    request: SessionRequest
  ): Promise<GovernedLockRecord[]>;
  releaseLock(input: ReleaseLockInput, request: SessionRequest): Promise<GovernedLockRecord>;
  releaseLocksForSession(governedSessionId: string): Promise<GovernedLockRecord[]>;
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

export function normalizeLockScope(scope: LockScopeInput): string {
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

function lockInactiveTime(lock: GovernedLockRecord): number {
  return Date.parse(lock.renewedAt || lock.acquiredAt);
}

function retainLocksForAppend(
  locks: GovernedLockRecord[],
  at: Date
): { locks: GovernedLockRecord[]; expiredDuringRetention: GovernedLockRecord[] } {
  const requiredSlots = locks.length + 1 - MAX_GOVERNED_LOCK_RECORDS;
  if (requiredSlots <= 0) return { locks, expiredDuringRetention: [] };

  const removable = locks.filter((lock) => (
    lock.status !== 'ACTIVE' || Date.parse(lock.expiresAt) <= at.getTime()
  )).sort((left, right) => (
    (left.status === 'ACTIVE' ? Date.parse(left.expiresAt) : lockInactiveTime(left))
    - (right.status === 'ACTIVE' ? Date.parse(right.expiresAt) : lockInactiveTime(right))
    || left.lockId.localeCompare(right.lockId)
  ));
  if (removable.length < requiredSlots) fail('LOCK_STORE_CAPACITY_EXCEEDED');

  const removed = removable.slice(0, requiredSlots);
  const removedIds = new Set(removed.map((candidate) => candidate.lockId));
  return {
    locks: locks.filter((candidate) => !removedIds.has(candidate.lockId)),
    expiredDuringRetention: removed
      .filter((candidate) => candidate.status === 'ACTIVE')
      .map((candidate) => ({
        ...candidate,
        status: 'EXPIRED' as const,
        lockRevision: candidate.lockRevision + 1
      }))
  };
}

function retainLocksForBatchAppend(
  locks: GovernedLockRecord[],
  at: Date,
  appendCount: number
): { locks: GovernedLockRecord[]; expiredDuringRetention: GovernedLockRecord[] } {
  const requiredSlots = locks.length + appendCount - MAX_GOVERNED_LOCK_RECORDS;
  if (requiredSlots <= 0) return { locks, expiredDuringRetention: [] };

  const removable = locks.filter((lock) => (
    lock.status !== 'ACTIVE' || Date.parse(lock.expiresAt) <= at.getTime()
  )).sort((left, right) => (
    (left.status === 'ACTIVE' ? Date.parse(left.expiresAt) : lockInactiveTime(left))
    - (right.status === 'ACTIVE' ? Date.parse(right.expiresAt) : lockInactiveTime(right))
    || left.lockId.localeCompare(right.lockId)
  ));
  if (removable.length < requiredSlots) fail('LOCK_STORE_CAPACITY_EXCEEDED');

  const removed = removable.slice(0, requiredSlots);
  const removedIds = new Set(removed.map((candidate) => candidate.lockId));
  return {
    locks: locks.filter((candidate) => !removedIds.has(candidate.lockId)),
    expiredDuringRetention: removed
      .filter((candidate) => candidate.status === 'ACTIVE')
      .map((candidate) => ({
        ...candidate,
        status: 'EXPIRED' as const,
        lockRevision: candidate.lockRevision + 1
      }))
  };
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
      const scope = normalizeLockScope(input.scope);
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
      let expiredDuringRetention: GovernedLockRecord[] = [];
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
          const retained = retainLocksForAppend(document.locks, at);
          expiredDuringRetention = retained.expiredDuringRetention;
          return {
            ...document,
            storeRevision: document.storeRevision + 1,
            locks: [...retained.locks, lock]
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
          const expiredIds = new Set(
            expiredDuringRetention.map((expired) => expired.lockId)
          );
          const sessions = document.sessions.map((candidate, candidateIndex) => {
            const retainedLockIds = candidate.lockIds.filter(
              (lockId) => !expiredIds.has(lockId)
            );
            if (candidateIndex === index) {
              return {
                ...candidate,
                lockIds: [...new Set([...retainedLockIds, lock.lockId])],
                sessionRevision: candidate.sessionRevision + 1
              };
            }
            return retainedLockIds.length === candidate.lockIds.length
              ? candidate
              : {
                  ...candidate,
                  lockIds: retainedLockIds,
                  sessionRevision: candidate.sessionRevision + 1
                };
          });
          return { ...document, storeRevision: document.storeRevision + 1, sessions };
        });
      } catch (error) {
        await compensateLock(lock.lockId);
        throw error;
      }
      for (const expired of expiredDuringRetention) {
        await audit.record({ type: 'lock.expired', lock: expired });
      }
      await audit.record({ type: 'lock.acquired', lock });
      return lock;
    },

    async acquireLocksAtomically(input, request) {
      if (!Array.isArray(input.scopes) || input.scopes.length < 1 || input.scopes.length > 64) {
        fail('LOCK_SCOPE_SET_INVALID');
      }
      const normalizedScopes = [...new Set(input.scopes.map(normalizeLockScope))].sort();
      if (normalizedScopes.length < 1 || normalizedScopes.length > 64) {
        fail('LOCK_SCOPE_SET_INVALID');
      }
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
      let granted: GovernedLockRecord[] = [];
      let created: GovernedLockRecord[] = [];
      let expiredDuringRetention: GovernedLockRecord[] = [];
      let conflictingLock: GovernedLockRecord | null = null;

      try {
        await options.store.update((document) => {
          const activeByScope = new Map(
            document.locks
              .filter((lock) => (
                lock.status === 'ACTIVE' && Date.parse(lock.expiresAt) > at.getTime()
              ))
              .map((lock) => [lock.scope, lock] as const)
          );

          for (const scope of normalizedScopes) {
            const existing = activeByScope.get(scope);
            if (existing && existing.governedSessionId !== input.governedSessionId) {
              conflictingLock = existing;
              fail(`LOCK_CONFLICT:${existing.governedSessionId}`);
            }
          }

          const existingOwned = normalizedScopes
            .map((scope) => activeByScope.get(scope))
            .filter((lock): lock is GovernedLockRecord => (
              Boolean(lock) && lock!.governedSessionId === input.governedSessionId
            ));
          const ownedScopes = new Set(existingOwned.map((lock) => lock.scope));
          const missingScopes = normalizedScopes.filter((scope) => !ownedScopes.has(scope));
          created = missingScopes.map((scope) => ({
            schemaVersion: 1,
            lockId: randomUUID(),
            scope,
            governedSessionId: input.governedSessionId,
            acquiredAt: at.toISOString(),
            expiresAt: new Date(at.getTime() + ttlSeconds * 1_000).toISOString(),
            renewedAt: at.toISOString(),
            reason: input.reason,
            status: 'ACTIVE' as const,
            lockRevision: 1
          }));

          const retained = retainLocksForBatchAppend(document.locks, at, created.length);
          expiredDuringRetention = retained.expiredDuringRetention;
          const byScope = new Map<string, GovernedLockRecord>([
            ...existingOwned.map((lock) => [lock.scope, lock] as const),
            ...created.map((lock) => [lock.scope, lock] as const)
          ]);
          granted = normalizedScopes.map((scope) => {
            const lock = byScope.get(scope);
            if (!lock) fail('LOCK_ATOMIC_PLAN_MISMATCH');
            return lock;
          });

          if (created.length === 0 && expiredDuringRetention.length === 0) return document;
          return {
            ...document,
            storeRevision: document.storeRevision + 1,
            locks: [...retained.locks, ...created]
          };
        });
      } catch (error) {
        const conflict = conflictingLock as GovernedLockRecord | null;
        if (conflict) {
          await audit.record({
            type: 'lock.conflicted',
            governedSessionId: input.governedSessionId,
            scope: conflict.scope,
            conflictingLockId: conflict.lockId
          });
        }
        throw error;
      }

      const createdIds = new Set(created.map((lock) => lock.lockId));
      const expiredIds = new Set(expiredDuringRetention.map((lock) => lock.lockId));
      const needsSessionUpdate = createdIds.size > 0 || expiredIds.size > 0;
      if (needsSessionUpdate) {
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
            const sessions = document.sessions.map((candidate, candidateIndex) => {
              const retainedLockIds = candidate.lockIds.filter(
                (lockId) => !expiredIds.has(lockId)
              );
              if (candidateIndex !== index) {
                return retainedLockIds.length === candidate.lockIds.length
                  ? candidate
                  : {
                      ...candidate,
                      lockIds: retainedLockIds,
                      sessionRevision: candidate.sessionRevision + 1
                    };
              }
              const nextIds = [
                ...new Set([
                  ...retainedLockIds,
                  ...granted.map((lock) => lock.lockId)
                ])
              ];
              return {
                ...candidate,
                lockIds: nextIds,
                sessionRevision: candidate.sessionRevision + 1
              };
            });
            return {
              ...document,
              storeRevision: document.storeRevision + 1,
              sessions
            };
          });
        } catch (error) {
          if (createdIds.size > 0) {
            await options.store.update((document) => ({
              ...document,
              storeRevision: document.storeRevision + 1,
              locks: document.locks.map((lock) => (
                createdIds.has(lock.lockId) && lock.status === 'ACTIVE'
                  ? {
                      ...lock,
                      status: 'RELEASED' as const,
                      lockRevision: lock.lockRevision + 1
                    }
                  : lock
              ))
            }));
          }
          throw error;
        }
      }

      for (const expired of expiredDuringRetention) {
        await audit.record({ type: 'lock.expired', lock: expired });
      }
      for (const lock of created) {
        await audit.record({ type: 'lock.acquired', lock });
      }
      return granted;
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

    async releaseLocksForSession(governedSessionId) {
      const released: GovernedLockRecord[] = [];
      await options.store.update((document) => {
        const locks = document.locks.map((lock) => {
          if (
            lock.governedSessionId !== governedSessionId
            || lock.status !== 'ACTIVE'
          ) return lock;
          const next = {
            ...lock,
            status: 'RELEASED' as const,
            lockRevision: lock.lockRevision + 1
          };
          released.push(next);
          return next;
        });
        if (released.length === 0) return document;
        return { ...document, storeRevision: document.storeRevision + 1, locks };
      });
      for (const lock of released) {
        await audit.record({ type: 'lock.released', lock });
      }
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
