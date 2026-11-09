import { randomUUID } from 'node:crypto';
import { chmod, mkdir, open, readFile, rename, rm, rmdir, writeFile } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';
import { basename, dirname, join } from 'node:path';

import type { z } from 'zod';

export type AtomicJsonStore<T> = {
  read(): Promise<T>;
  update(mutator: (current: T) => T | Promise<T>): Promise<T>;
};

type AtomicJsonStoreOptions<T> = {
  filePath: string;
  schema: z.ZodType<T>;
  empty: () => T;
  /** Opt-in exclusive lock, shared by all processes using the same POSIX directory. */
  interprocessLock?: boolean;
  /** Bounded wait; a crashed owner leaves the lock in place and blocks safely. */
  lockTimeoutMs?: number;
  /** fsync the temporary value and directory before reporting commit success. */
  durableWrites?: boolean;
};

export class OperationalStoreCorruptedError extends Error {
  readonly code = 'OPERATIONAL_STORE_CORRUPTED';

  constructor(cause: unknown) {
    super('OPERATIONAL_STORE_CORRUPTED', { cause });
    this.name = 'OperationalStoreCorruptedError';
  }
}

function isMissingFile(error: unknown): boolean {
  return error instanceof Error
    && 'code' in error
    && (error as NodeJS.ErrnoException).code === 'ENOENT';
}

export function createAtomicJsonStore<T>(
  options: AtomicJsonStoreOptions<T>
): AtomicJsonStore<T> {
  let updateQueue: Promise<void> = Promise.resolve();
  const lockTimeoutMs = options.lockTimeoutMs ?? 5000;
  if (options.interprocessLock && (
    !Number.isSafeInteger(lockTimeoutMs) || lockTimeoutMs < 1 || lockTimeoutMs > 60000
  )) throw new Error('OPERATIONAL_STORE_LOCK_TIMEOUT_INVALID');

  /**
   * This is strictly I/O exclusion for one JSON file, NOT a Governed Lock or
   * an authorization principal. mkdir is atomic on the shared local filesystem.
   * Never auto-expire or steal an existing lock: a crashed writer may have
   * committed the replacement before dying, and unsafe lease reclamation
   * could authorize a second refresh-token consumption. A stale lock therefore
   * fails closed until an operator verifies no writer remains.
   */
  async function withInterprocessLock<R>(operation: () => Promise<R>): Promise<R> {
    if (!options.interprocessLock) return operation();
    const directory = dirname(options.filePath);
    await mkdir(directory, { recursive: true, mode: 0o700 });
    const lockPath = `${options.filePath}.transaction-lock`;
    const started = Date.now();
    for (;;) {
      try {
        await mkdir(lockPath, { mode: 0o700 });
        break;
      } catch (error) {
        if (!(error instanceof Error)
          || !('code' in error)
          || (error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
        if (Date.now() - started >= lockTimeoutMs) {
          throw new Error('OPERATIONAL_STORE_LOCK_TIMEOUT');
        }
        await delay(25);
      }
    }
    try {
      return await operation();
    } finally {
      // rmdir removes only an empty directory and never recursively deletes
      // another holder's files. A failure is surfaced, not silently ignored.
      await rmdir(lockPath);
    }
  }

  async function fsyncPath(path: string): Promise<void> {
    const handle = await open(path, 'r');
    try {
      await handle.sync();
    } finally {
      await handle.close();
    }
  }

  async function readValidated(): Promise<T> {
    let raw: string;
    try {
      raw = await readFile(options.filePath, 'utf8');
    } catch (error) {
      if (isMissingFile(error)) {
        return options.schema.parse(options.empty());
      }
      throw error;
    }

    try {
      const parsed = JSON.parse(raw) as unknown;
      const result = options.schema.safeParse(parsed);
      if (!result.success) {
        throw result.error;
      }
      return result.data;
    } catch (error) {
      throw new OperationalStoreCorruptedError(error);
    }
  }

  async function writeValidated(value: T): Promise<T> {
    const parsed = options.schema.safeParse(value);
    if (!parsed.success) {
      throw new Error('OPERATIONAL_STORE_INVALID_UPDATE', { cause: parsed.error });
    }

    const directory = dirname(options.filePath);
    const temporary = join(
      directory,
      `.${basename(options.filePath)}.${process.pid}.${randomUUID()}.tmp`
    );
    await mkdir(directory, { recursive: true, mode: 0o700 });

    try {
      await writeFile(temporary, `${JSON.stringify(parsed.data, null, 2)}\n`, {
        encoding: 'utf8',
        flag: 'wx',
        mode: 0o600
      });
      await chmod(temporary, 0o600);
      // The new state must be durable before any refresh token is returned.
      if (options.durableWrites) await fsyncPath(temporary);
      await rename(temporary, options.filePath);
      await chmod(options.filePath, 0o600);
      if (options.durableWrites) await fsyncPath(directory);
      return parsed.data;
    } catch (error) {
      await rm(temporary, { force: true }).catch(() => undefined);
      throw error;
    }
  }

  return {
    read: readValidated,
    update(mutator) {
      const operation = updateQueue.then(() => withInterprocessLock(async () => {
        const current = await readValidated();
        return writeValidated(await mutator(current));
      }));
      updateQueue = operation.then(() => undefined, () => undefined);
      return operation;
    }
  };
}
