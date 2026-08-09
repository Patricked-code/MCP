import { randomUUID } from 'node:crypto';
import { chmod, mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';

import type { LiveStateSnapshot } from './types.js';

const DEFAULT_LIVE_STATE_FILE = '/app/data/mcp-live-state.json';

export function liveStateFilePath(): string {
  return process.env.MCP_LIVE_STATE_FILE || DEFAULT_LIVE_STATE_FILE;
}

export async function readLiveState(): Promise<LiveStateSnapshot | null> {
  try {
    const parsed = JSON.parse(await readFile(liveStateFilePath(), 'utf8')) as unknown;
    if (!parsed || typeof parsed !== 'object') return null;
    if ((parsed as { schemaVersion?: unknown }).schemaVersion !== 1) return null;
    return parsed as LiveStateSnapshot;
  } catch {
    return null;
  }
}

export async function writeLiveState(snapshot: LiveStateSnapshot): Promise<void> {
  const file = liveStateFilePath();
  const directory = dirname(file);
  const temporary = join(
    directory,
    `.${basename(file)}.${process.pid}.${randomUUID()}.tmp`
  );

  await mkdir(directory, { recursive: true, mode: 0o700 });

  try {
    await writeFile(temporary, `${JSON.stringify(snapshot, null, 2)}\n`, {
      encoding: 'utf8',
      mode: 0o600
    });
    await chmod(temporary, 0o600);
    await rename(temporary, file);
    await chmod(file, 0o600);
  } catch (error) {
    await rm(temporary, { force: true }).catch(() => undefined);
    throw error;
  }
}
