import { canonicalJson } from '../canonicalJson.js';
import { createHash } from 'node:crypto';
import { z } from 'zod';

export const RAW_INTENT_MAX_BYTES = 16_384;

export const IntentSourceSchema = z.enum(['chatgpt', 'claude', 'other']);
export type IntentSource = z.infer<typeof IntentSourceSchema>;

export type IntentCaptureReasonCode =
  | 'RAW_INTENT_EMPTY'
  | 'RAW_INTENT_TOO_LARGE'
  | 'SOURCE_UNSUPPORTED'
  | 'RECEIVED_AT_INVALID';

export type IntentCaptureResult = Readonly<{
  status: 'INTENT_CAPTURED' | 'INTENT_INCOMPLETE' | 'INTENT_REJECTED';
  reasonCode: IntentCaptureReasonCode | null;
  normalizedIntent: string | null;
  source: IntentSource | null;
  receivedAt: string | null;
  rawIntentBytes: number | null;
  intentDigest: string | null;
  authorizationInferred: false;
}>;

const ReceivedAtSchema = z.string().datetime({ offset: true });

function object(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function result(input: Omit<IntentCaptureResult, 'authorizationInferred'>): IntentCaptureResult {
  return Object.freeze({
    ...input,
    authorizationInferred: false as const
  });
}

function normalizeIntent(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

function intentDigest(input: {
  normalizedIntent: string;
  source: IntentSource;
  receivedAt: string;
}): string {
  return createHash('sha256').update(canonicalJson(input)).digest('hex');
}

export function captureIntent(rawInput: unknown): IntentCaptureResult {
  const input = object(rawInput);
  if (!input) {
    return result({
      status: 'INTENT_REJECTED',
      reasonCode: 'RAW_INTENT_EMPTY',
      normalizedIntent: null,
      source: null,
      receivedAt: null,
      rawIntentBytes: null,
      intentDigest: null
    });
  }

  const sourceParsed = IntentSourceSchema.safeParse(input.source);
  if (!sourceParsed.success) {
    return result({
      status: 'INTENT_REJECTED',
      reasonCode: 'SOURCE_UNSUPPORTED',
      normalizedIntent: null,
      source: null,
      receivedAt: typeof input.receivedAt === 'string' ? input.receivedAt : null,
      rawIntentBytes: typeof input.rawIntent === 'string'
        ? Buffer.byteLength(input.rawIntent, 'utf8')
        : null,
      intentDigest: null
    });
  }
  const source = sourceParsed.data;

  const receivedAtParsed = ReceivedAtSchema.safeParse(input.receivedAt);
  if (!receivedAtParsed.success) {
    return result({
      status: 'INTENT_REJECTED',
      reasonCode: 'RECEIVED_AT_INVALID',
      normalizedIntent: null,
      source,
      receivedAt: null,
      rawIntentBytes: typeof input.rawIntent === 'string'
        ? Buffer.byteLength(input.rawIntent, 'utf8')
        : null,
      intentDigest: null
    });
  }
  const receivedAt = receivedAtParsed.data;

  if (typeof input.rawIntent !== 'string') {
    return result({
      status: 'INTENT_INCOMPLETE',
      reasonCode: 'RAW_INTENT_EMPTY',
      normalizedIntent: null,
      source,
      receivedAt,
      rawIntentBytes: null,
      intentDigest: null
    });
  }

  const rawIntentBytes = Buffer.byteLength(input.rawIntent, 'utf8');
  if (rawIntentBytes > RAW_INTENT_MAX_BYTES) {
    return result({
      status: 'INTENT_REJECTED',
      reasonCode: 'RAW_INTENT_TOO_LARGE',
      normalizedIntent: null,
      source,
      receivedAt,
      rawIntentBytes,
      intentDigest: null
    });
  }

  const normalizedIntent = normalizeIntent(input.rawIntent);
  if (!normalizedIntent) {
    return result({
      status: 'INTENT_INCOMPLETE',
      reasonCode: 'RAW_INTENT_EMPTY',
      normalizedIntent: null,
      source,
      receivedAt,
      rawIntentBytes,
      intentDigest: null
    });
  }

  return result({
    status: 'INTENT_CAPTURED',
    reasonCode: null,
    normalizedIntent,
    source,
    receivedAt,
    rawIntentBytes,
    intentDigest: intentDigest({ normalizedIntent, source, receivedAt })
  });
}
