import { randomUUID } from 'node:crypto';
import { constants } from 'node:fs';
import { chmod, lstat, mkdir, open, rename, rm, stat } from 'node:fs/promises';
import { dirname } from 'node:path';

export type OperationalEventType =
  | 'session.opened'
  | 'session.resumed'
  | 'session.heartbeat'
  | 'session.paused'
  | 'session.expired'
  | 'session.closed'
  | 'transport.bound'
  | 'transport.unbound'
  | 'context.read'
  | 'context.acknowledged'
  | 'checkpoint.created'
  | 'lock.acquired'
  | 'lock.renewed'
  | 'lock.conflicted'
  | 'lock.released'
  | 'lock.expired'
  | 'scoped_write.shadow'
  | 'reconcile.requested'
  | 'reconcile.completed'
  | 'blocker.detected';

export type OperationalEventMetadataValue = string | number | boolean | null;
export type OperationalEventMetadata = Record<string, OperationalEventMetadataValue>;

export type OperationalEvent = {
  schemaVersion: 1;
  eventId: string;
  processSequence: number;
  occurredAt: string;
  type: OperationalEventType;
  governedSessionId: string | null;
  metadata: OperationalEventMetadata;
};

type OperationalEventInput = Omit<
  OperationalEvent,
  'schemaVersion' | 'eventId' | 'processSequence' | 'occurredAt'
>;

export type OperationalEventJournal = {
  append(input: OperationalEventInput): Promise<OperationalEvent>;
};

type OperationalEventJournalOptions = {
  filePath: string;
  maxBytes: number;
  archives: number;
  now?: () => Date;
};

const FORBIDDEN_METADATA_KEYS = new Set([
  'token',
  'authorization',
  'prompt',
  'arguments',
  'output',
  'content',
  'mcpsessionid',
  'transportsessionid'
]);

const ALLOWED_METADATA_KEYS: Record<OperationalEventType, ReadonlySet<string>> = {
  'session.opened': new Set(['repository', 'taskScope', 'status', 'agentIdentity', 'identityAssurance']),
  'session.resumed': new Set(['repository', 'taskScope', 'status', 'identityAssurance', 'sessionRevision']),
  'session.heartbeat': new Set(['status', 'sessionRevision', 'lockCount']),
  'session.paused': new Set(['status', 'sessionRevision', 'reasonCode']),
  'session.expired': new Set(['status', 'sessionRevision', 'reasonCode']),
  'session.closed': new Set(['status', 'sessionRevision', 'reasonCode']),
  'transport.bound': new Set(['fingerprint', 'bindingResult', 'sessionRevision']),
  'transport.unbound': new Set(['fingerprint', 'reasonCode', 'sessionRevision']),
  'context.read': new Set(['stateVersion', 'freshness', 'globalAlignment']),
  'context.acknowledged': new Set(['stateVersion', 'sessionRevision']),
  'checkpoint.created': new Set(['checkpointId', 'resultCode', 'sessionRevision', 'eventCount']),
  'lock.acquired': new Set(['lockId', 'scope', 'expiresAt', 'lockRevision']),
  'lock.renewed': new Set(['lockId', 'scope', 'expiresAt', 'lockRevision']),
  'lock.conflicted': new Set(['scope', 'conflictingLockId', 'reasonCode']),
  'lock.released': new Set(['lockId', 'scope', 'lockRevision']),
  'lock.expired': new Set(['lockId', 'scope', 'lockRevision']),
  'scoped_write.shadow': new Set(['toolName', 'decision', 'stateVersion', 'sessionRevision', 'lockConflict']),
  'reconcile.requested': new Set(['reasonCode', 'stateVersion']),
  'reconcile.completed': new Set(['resultCode', 'previousStateVersion', 'stateVersion', 'globalAlignment']),
  'blocker.detected': new Set(['blockerCode', 'scope', 'stateVersion', 'sessionRevision'])
};

function validateMetadata(type: OperationalEventType, metadata: OperationalEventMetadata): void {
  const entries = Object.entries(metadata);
  if (entries.length > 16) {
    throw new Error('OPERATIONAL_EVENT_METADATA_FORBIDDEN');
  }

  const allowed = ALLOWED_METADATA_KEYS[type];
  for (const [key, value] of entries) {
    if (FORBIDDEN_METADATA_KEYS.has(key.toLowerCase()) || !allowed.has(key)) {
      throw new Error('OPERATIONAL_EVENT_METADATA_FORBIDDEN');
    }
    if (typeof value === 'string' && value.length > 512) {
      throw new Error('OPERATIONAL_EVENT_METADATA_FORBIDDEN');
    }
    if (typeof value === 'number' && !Number.isFinite(value)) {
      throw new Error('OPERATIONAL_EVENT_METADATA_FORBIDDEN');
    }
    if (!['string', 'number', 'boolean'].includes(typeof value) && value !== null) {
      throw new Error('OPERATIONAL_EVENT_METADATA_FORBIDDEN');
    }
  }
}

function isMissing(error: unknown): boolean {
  return error instanceof Error
    && 'code' in error
    && (error as NodeJS.ErrnoException).code === 'ENOENT';
}

async function assertNotSymlink(path: string): Promise<void> {
  try {
    if ((await lstat(path)).isSymbolicLink()) {
      throw new Error('OPERATIONAL_EVENT_SYMLINK');
    }
  } catch (error) {
    if (!isMissing(error)) throw error;
  }
}

export function createOperationalEventJournal(
  options: OperationalEventJournalOptions
): OperationalEventJournal {
  if (!Number.isInteger(options.maxBytes) || options.maxBytes <= 0) {
    throw new Error('OPERATIONAL_EVENT_MAX_BYTES_INVALID');
  }
  if (!Number.isInteger(options.archives) || options.archives < 1 || options.archives > 10) {
    throw new Error('OPERATIONAL_EVENT_ARCHIVES_INVALID');
  }

  let appendQueue: Promise<void> = Promise.resolve();
  let processSequence = 0;
  const now = options.now ?? (() => new Date());

  async function rotateIfNeeded(incomingBytes: number): Promise<void> {
    let currentBytes = 0;
    try {
      currentBytes = (await stat(options.filePath)).size;
    } catch (error) {
      if (!isMissing(error)) throw error;
    }
    if (currentBytes === 0 || currentBytes + incomingBytes <= options.maxBytes) {
      return;
    }

    for (let index = options.archives; index >= 1; index -= 1) {
      await assertNotSymlink(`${options.filePath}.${index}`);
    }
    await rm(`${options.filePath}.${options.archives}`, { force: true });
    for (let index = options.archives - 1; index >= 1; index -= 1) {
      try {
        await rename(`${options.filePath}.${index}`, `${options.filePath}.${index + 1}`);
      } catch (error) {
        if (!isMissing(error)) throw error;
      }
    }
    await rename(options.filePath, `${options.filePath}.1`);
  }

  async function appendOne(input: OperationalEventInput): Promise<OperationalEvent> {
    validateMetadata(input.type, input.metadata);
    await mkdir(dirname(options.filePath), { recursive: true, mode: 0o700 });
    await chmod(dirname(options.filePath), 0o700);
    await assertNotSymlink(options.filePath);

    const event: OperationalEvent = {
      schemaVersion: 1,
      eventId: randomUUID(),
      processSequence: processSequence + 1,
      occurredAt: now().toISOString(),
      type: input.type,
      governedSessionId: input.governedSessionId,
      metadata: { ...input.metadata }
    };
    const line = `${JSON.stringify(event)}\n`;
    await rotateIfNeeded(Buffer.byteLength(line));
    await assertNotSymlink(options.filePath);

    const handle = await open(
      options.filePath,
      constants.O_APPEND | constants.O_CREAT | constants.O_WRONLY | constants.O_NOFOLLOW,
      0o600
    );
    try {
      await handle.writeFile(line, 'utf8');
    } finally {
      await handle.close();
    }
    await chmod(options.filePath, 0o600);
    processSequence = event.processSequence;
    return event;
  }

  return {
    append(input) {
      const operation = appendQueue.then(() => appendOne(input));
      appendQueue = operation.then(() => undefined, () => undefined);
      return operation;
    }
  };
}
