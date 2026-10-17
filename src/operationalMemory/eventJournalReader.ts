/**
 * Bounded, read-only replay of the EXISTING Operational Event Journal JSONL.
 *
 * SECURITY BOUNDARY: this low-level module does NOT authorize sessions/topics.
 * Callers MUST revalidate OAuth, Governed Session, repository and recipient
 * before using any result. It is NOT a registered MCP tool, transport, bus,
 * new journal, cursor store, Task Queue, claim or session authority.
 *
 * Guarantees here are limited to one consistent snapshot of retained segments.
 * NO distributed/multi-writer ordering, crash fsync, external delivery or ACK
 * semantics are claimed. Missing anchors and incomplete windows fail closed.
 */
import { constants } from 'node:fs';
import { lstat, open } from 'node:fs/promises';
import { isAbsolute } from 'node:path';
import { isOperationalEventType, type OperationalEvent } from './eventJournal.js';

export type JournalReplayOptions = {
  filePath: string;
  archives: number;
  governedSessionId: string;
  afterEventId?: string;
  maxEvents?: number;
  maxSegmentBytes?: number;
};

export type JournalReplayResult = {
  status: 'OK' | 'CURSOR_UNAVAILABLE';
  eventIds: string[];
  nextCursor: string | null;
  hasMore: boolean;
  complete: boolean;
};

export type SessionCheckpointWindow = {
  eventIds: string[];
  complete: boolean;
  reason: 'OK' | 'CURSOR_UNAVAILABLE';
};

type SnapshotFile = {
  path: string;
  size: number;
  dev: number;
  ino: number;
  mtimeMs: number;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
// Align with src/config/env.ts: default journal segment 10 MiB, max 50 MiB.
// A single line may exceed maxBytes after rotation on an empty file.
const DEFAULT_SEGMENT_BYTES = 10_485_760 + 32 * 1024;
const MAX_SEGMENT_BYTES = 52_428_800 + 32 * 1024;
// This first bounded reader deliberately refuses larger cumulative snapshots;
// streaming pagination is required before certifying larger retention windows.
const MAX_TOTAL_BYTES = 96 * 1024 * 1024;
const DEFAULT_PAGE_SIZE = 64;
const MAX_LINE_BYTES = 32 * 1024;
const MAX_META_KEYS = 16;

function isMissing(error: unknown): boolean {
  return error instanceof Error && 'code' in error
    && (error as NodeJS.ErrnoException).code === 'ENOENT';
}
function invalid(reason: string): never {
  throw new Error(reason);
}
function validUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID.test(value);
}
function assertInput(input: JournalReplayOptions): { maxEvents: number; maxSegmentBytes: number } {
  if (!isAbsolute(input.filePath)
    || !Number.isInteger(input.archives) || input.archives < 1 || input.archives > 10
    || !validUuid(input.governedSessionId)) {
    invalid('BUS_REPLAY_INVALID_SCOPE');
  }
  if (input.afterEventId !== undefined && !validUuid(input.afterEventId)) {
    invalid('BUS_REPLAY_INVALID_CURSOR');
  }
  const maxEvents = input.maxEvents ?? DEFAULT_PAGE_SIZE;
  const maxSegmentBytes = input.maxSegmentBytes ?? DEFAULT_SEGMENT_BYTES;
  if (!Number.isInteger(maxEvents) || maxEvents < 1 || maxEvents > DEFAULT_PAGE_SIZE
    || !Number.isInteger(maxSegmentBytes) || maxSegmentBytes < 1
    || maxSegmentBytes > MAX_SEGMENT_BYTES) {
    invalid('BUS_REPLAY_INVALID_LIMIT');
  }
  return { maxEvents, maxSegmentBytes };
}

function checkFile(st: Awaited<ReturnType<typeof lstat>>, maxSegmentBytes: number): void {
  if (st.isSymbolicLink()) invalid('BUS_JOURNAL_SYMLINK');
  if (!st.isFile()) invalid('BUS_UNSAFE_JOURNAL_FILE');
  if ((Number(st.mode) & 0o077) !== 0) invalid('BUS_UNSAFE_JOURNAL_PERMISSIONS');
  if (st.size > maxSegmentBytes) invalid('BUS_JOURNAL_READ_LIMIT_EXCEEDED');
}

async function inspect(filePath: string, maxSegmentBytes: number): Promise<SnapshotFile | null> {
  try {
    const st = await lstat(filePath);
    checkFile(st, maxSegmentBytes);
    return { path: filePath, size: st.size, dev: st.dev, ino: st.ino, mtimeMs: st.mtimeMs };
  } catch (error) {
    if (isMissing(error)) return null;
    throw error;
  }
}

function sameSnapshot(left: SnapshotFile | null, right: SnapshotFile | null): boolean {
  return left === null ? right === null
    : right !== null && left.size === right.size && left.dev === right.dev
      && left.ino === right.ino && left.mtimeMs === right.mtimeMs;
}

function isEvent(value: unknown): value is OperationalEvent {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const x = value as Record<string, unknown>;
  if (Object.keys(x).sort().join(',') !== [
    'eventId', 'governedSessionId', 'metadata', 'occurredAt',
    'processSequence', 'schemaVersion', 'type'
  ].sort().join(',')) return false;
  if (x.schemaVersion !== 1 || !validUuid(x.eventId)
    || (x.governedSessionId !== null && !validUuid(x.governedSessionId))
    || !isOperationalEventType(x.type)
    || !Number.isInteger(x.processSequence) || (x.processSequence as number) < 1
    || typeof x.occurredAt !== 'string' || !Number.isFinite(Date.parse(x.occurredAt))) return false;
  if (typeof x.metadata !== 'object' || x.metadata === null || Array.isArray(x.metadata)) return false;
  const metadata = Object.entries(x.metadata);
  if (metadata.length > MAX_META_KEYS) return false;
  return metadata.every(([name, val]) => /^[a-zA-Z][a-zA-Z0-9]{0,79}$/.test(name)
    && (val === null
      || (typeof val === 'string' && val.length <= 512)
      || typeof val === 'boolean'
      || (typeof val === 'number' && Number.isFinite(val))));
}

async function readStableFile(
  snapshot: SnapshotFile,
  maxSegmentBytes: number
): Promise<OperationalEvent[]> {
  const handle = await open(snapshot.path, constants.O_RDONLY | constants.O_NOFOLLOW);
  let text: string;
  try {
    const before = await handle.stat();
    checkFile(before, maxSegmentBytes);
    if (!sameSnapshot(snapshot, {
      path: snapshot.path, size: before.size, dev: before.dev,
      ino: before.ino, mtimeMs: before.mtimeMs
    })) invalid('BUS_JOURNAL_CHANGED_DURING_READ');
    // Read at most the inspected bytes plus one: concurrent growth cannot
    // allocate beyond this bound before we detect an inconsistent snapshot.
    const bytes = Buffer.alloc(snapshot.size + 1);
    let read = 0;
    while (read < bytes.length) {
      const { bytesRead } = await handle.read(bytes, read, bytes.length - read, read);
      if (bytesRead === 0) break;
      read += bytesRead;
    }
    if (read !== snapshot.size) invalid('BUS_JOURNAL_CHANGED_DURING_READ');
    text = bytes.subarray(0, read).toString('utf8');
    const after = await handle.stat();
    if (after.size !== before.size || after.mtimeMs !== before.mtimeMs) {
      invalid('BUS_JOURNAL_CHANGED_DURING_READ');
    }
  } finally {
    await handle.close();
  }

  if (text.length === 0) return [];
  if (!text.endsWith('\n')) invalid('BUS_JOURNAL_CORRUPT_TRUNCATED_LINE');
  const lines = text.slice(0, -1).split('\n');
  const records: OperationalEvent[] = [];
  for (const line of lines) {
    if (Buffer.byteLength(line, 'utf8') > MAX_LINE_BYTES) invalid('BUS_JOURNAL_READ_LIMIT_EXCEEDED');
    let parsed: unknown;
    try { parsed = JSON.parse(line); }
    catch { invalid('BUS_JOURNAL_CORRUPT_JSONL'); }
    if (!isEvent(parsed)) invalid('BUS_JOURNAL_CORRUPT_SCHEMA');
    records.push(parsed);
  }
  return records;
}

async function retainedEvents(options: JournalReplayOptions): Promise<OperationalEvent[]> {
  const { maxSegmentBytes } = assertInput(options);
  const paths = [...Array(options.archives)].map((_, k) =>
    options.filePath + '.' + String(options.archives - k)
  ).concat(options.filePath);
  const initial = await Promise.all(paths.map(p => inspect(p, maxSegmentBytes)));
  // A vanished active file during rotation is not a complete retained history.
  if (!initial.at(-1) && initial.some(Boolean)) invalid('BUS_JOURNAL_SEGMENT_GAP');
  let totalBytes = 0;
  const entries: OperationalEvent[] = [];
  const eventIds = new Set<string>();
  const archiveIndices = initial.slice(0, -1).map((e, i) =>
    e ? options.archives - i : null
  ).filter((x): x is number => x !== null);
  if (archiveIndices.length > 0
    && Array.from({ length: Math.max(...archiveIndices) },
      (_, i) => i + 1).some(i => !archiveIndices.includes(i))) {
    invalid('BUS_JOURNAL_SEGMENT_GAP');
  }

  for (const file of initial) {
    if (!file) continue;
    totalBytes += file.size;
    if (totalBytes > MAX_TOTAL_BYTES) invalid('BUS_JOURNAL_READ_LIMIT_EXCEEDED');
    for (const event of await readStableFile(file, maxSegmentBytes)) {
      if (eventIds.has(event.eventId)) invalid('BUS_JOURNAL_CORRUPT_DUPLICATE_EVENT');
      eventIds.add(event.eventId);
      entries.push(event);
    }
  }
  const final = await Promise.all(paths.map(p => inspect(p, maxSegmentBytes)));
  if (initial.some((snapshot, i) => !sameSnapshot(snapshot, final[i] ?? null))) {
    invalid('BUS_JOURNAL_CHANGED_DURING_READ');
  }
  return entries;
}

function missingCursor(): JournalReplayResult {
  return {
    status: 'CURSOR_UNAVAILABLE', eventIds: [], nextCursor: null,
    hasMore: false, complete: false
  };
}

function pageFromEvents(
  events: OperationalEvent[], session: string, anchorId: string, maxEvents: number
): JournalReplayResult {
  const position = events.findIndex(event => event.eventId === anchorId
    && event.governedSessionId === session);
  if (position < 0) return missingCursor();
  const filtered = events.slice(position + 1).filter(e => e.governedSessionId === session);
  const eventIds = filtered.slice(0, maxEvents).map(e => e.eventId);
  const hasMore = filtered.length > maxEvents;
  return {
    status: 'OK',
    eventIds,
    nextCursor: eventIds.at(-1) ?? anchorId,
    hasMore,
    complete: !hasMore
  };
}

/** No unanchored replay: missing/expired/cross-session cursors fail closed. */
export async function readSessionJournalPage(
  options: JournalReplayOptions
): Promise<JournalReplayResult> {
  const { maxEvents } = assertInput(options);
  if (!options.afterEventId) invalid('BUS_REPLAY_CURSOR_REQUIRED');
  const events = await retainedEvents(options);
  return pageFromEvents(events, options.governedSessionId, options.afterEventId, maxEvents);
}

/**
 * R44 adapter, internal only. The consumer MUST supply the eventIds from the
 * last checkpoint PERSISTED in the existing Governed Session store. A physical
 * checkpoint.created journal marker is NOT the boundary: its append happens
 * after checkpoint persistence, allowing intervening events.
 *
 * Conservative policy: empty/incomplete/purged snapshot evidence returns
 * CURSOR_UNAVAILABLE. In particular an empty persisted checkpoint window
 * requires a stronger durable boundary to be added before completion can be
 * proven, not an unsafe guess from the physical marker.
 *
 * This function neither registers a tool nor changes the canonical session,
 * journal or Task Queue. A caller must independently authorize session scope.
 */
export async function readSessionEventsSince(
  options: Omit<JournalReplayOptions, 'afterEventId'>,
  boundary: 'LAST_CHECKPOINT',
  persistedCheckpointEventIds?: readonly string[]
): Promise<SessionCheckpointWindow> {
  assertInput(options);
  if (boundary !== 'LAST_CHECKPOINT') invalid('BUS_REPLAY_INVALID_BOUNDARY');
  const unavailable: SessionCheckpointWindow = {
    eventIds: [], complete: false, reason: 'CURSOR_UNAVAILABLE'
  };
  if (!persistedCheckpointEventIds || !Array.isArray(persistedCheckpointEventIds)
    || persistedCheckpointEventIds.length === 0
    || persistedCheckpointEventIds.length > DEFAULT_PAGE_SIZE
    || persistedCheckpointEventIds.some(id => !validUuid(id))
    || new Set(persistedCheckpointEventIds).size !== persistedCheckpointEventIds.length) {
    return unavailable;
  }

  const events = await retainedEvents(options);
  const positions: number[] = [];
  for (const id of persistedCheckpointEventIds) {
    const index = events.findIndex(e => e.eventId === id
      && e.governedSessionId === options.governedSessionId);
    if (index < 0 || (positions.length > 0 && index <= positions[positions.length - 1]!)) {
      return unavailable;
    }
    positions.push(index);
  }
  const lastCoveredIndex = positions.at(-1)!;
  const outstanding = events.slice(lastCoveredIndex + 1).filter(e =>
    e.governedSessionId === options.governedSessionId
      && e.type !== 'checkpoint.created'
  );
  if (outstanding.some(e => e.type === 'session.closed')
    || outstanding.length > DEFAULT_PAGE_SIZE) {
    return unavailable;
  }
  return {
    eventIds: outstanding.map(e => e.eventId),
    complete: true,
    reason: 'OK'
  };
}
