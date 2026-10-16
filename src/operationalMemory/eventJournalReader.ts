/**
 * BUS-03 candidate: bounded read-side projection of the EXISTING Operational Event Journal.
 * The reader grants NO access: consumers must prove a Governed Session + repository scope.
 * NO tools/routes are registered here; it never writes or claims an execution authority.
 */
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

export async function readSessionJournalPage(
  _options: JournalReplayOptions
): Promise<JournalReplayResult> {
  throw new Error('BUS_JOURNAL_REPLAY_NOT_IMPLEMENTED');
}

export async function readSessionEventsSince(
  _options: Omit<JournalReplayOptions, 'afterEventId'>,
  _boundary: 'LAST_CHECKPOINT'
): Promise<SessionCheckpointWindow> {
  throw new Error('BUS_JOURNAL_REPLAY_NOT_IMPLEMENTED');
}
