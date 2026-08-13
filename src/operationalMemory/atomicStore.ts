import { randomUUID } from 'node:crypto';
import { chmod, mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
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
      await rename(temporary, options.filePath);
      await chmod(options.filePath, 0o600);
      return parsed.data;
    } catch (error) {
      await rm(temporary, { force: true }).catch(() => undefined);
      throw error;
    }
  }

  return {
    read: readValidated,
    update(mutator) {
      const operation = updateQueue.then(async () => {
        const current = await readValidated();
        return writeValidated(await mutator(current));
      });
      updateQueue = operation.then(() => undefined, () => undefined);
      return operation;
    }
  };
}
