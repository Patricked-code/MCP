import { createHash } from 'node:crypto';
import type { Stage } from './maintenancePlan.js';

/**
 * Read-only parser for the current PRC17A Docker receipts. It validates the
 * receipt bytes and scope, not the physical archive or a caller's authority.
 * The trusted adapter must obtain bytes and expected digests from the private
 * canonical evidence store, and independently re-read the archive and Docker.
 */
export interface DockerReceiptScope {
  mission: string;
  checkpoint: string;
  planDigest: string;
  imageCount: number;
  tagCount: number;
}
export interface DockerReceiptInput {
  receipt: string;
  expectedReceiptDigest: string;
  observedPlanDigest: string;
  scope: DockerReceiptScope;
  kind: 'OFFSITE' | 'RESTORE';
}
export type DockerReceiptResult =
  | { status: 'UNVERIFIED'; reason: string; effectAuthorized: false }
  | { status: 'STRUCTURE_VERIFIED'; stage: Extract<Stage,
      'OFFSITE_VERIFIED' | 'RESTORE_VERIFIED'>;
      receiptDigest: string; planDigest: string; archiveDigest: string;
      rawArchiveBytes: number; encryptedArchiveBytes: number; recordedAtMs: number;
      effectAuthorized: false };
const sha = /^[a-f0-9]{64}$/;
const id = /^[A-Za-z0-9_-]{1,120}$/;
const positive = (v: number) => Number.isSafeInteger(v) && v > 0;
const hash = (v: string) => createHash('sha256').update(v, 'utf8').digest('hex');
const maxReceiptBytes = 16_384;
const flags = [
  'FREEBOX_ARCHIVE_VERIFIEE', 'AUCUNE_ARCHIVE_SOURCE_SUPPRIMEE',
  'IMAGES_TEST_S2_CONSERVEES', 'CONTENEURS_NON_LANCES',
  'SUPPRESSION_S1_NON_EXECUTEE', 'PRC17A_DOCKER_ARCHIVE_RESTAUREE'
] as const;
const fields = [
  'MISSION', 'CHECKPOINT', 'UTC', 'REMOTE_PATH', 'GPG_SHA256',
  'GPG_BYTES', 'TAR_SHA256', 'TAR_BYTES',
  'IMAGES_RESTAUREES_ET_IDENTIQUES', 'TAGS_RESTAURES_ET_IDENTIQUES', 'PLAN_SHA256'
] as const;

export function parseDockerReceipt(input: DockerReceiptInput): DockerReceiptResult {
  const fail = (reason: string): DockerReceiptResult =>
    ({status:'UNVERIFIED', reason, effectAuthorized:false});
  const { receipt, scope, kind } = input;
  if (typeof receipt !== 'string' || Buffer.byteLength(receipt,'utf8') > maxReceiptBytes ||
      !receipt.endsWith('\n') || receipt.includes('\r') ||
      !sha.test(input.expectedReceiptDigest) || !sha.test(scope.planDigest) ||
      input.observedPlanDigest !== scope.planDigest ||
      !id.test(scope.mission) || !id.test(scope.checkpoint) ||
      !positive(scope.imageCount) || !positive(scope.tagCount) ||
      (kind !== 'OFFSITE' && kind !== 'RESTORE')) return fail('INVALID_SCOPE_OR_INPUT');
  const actual = hash(receipt);
  if (actual !== input.expectedReceiptDigest) return fail('RECEIPT_DIGEST_MISMATCH');
  const values = new Map<string,string>();
  const markers = new Set<string>();
  for (const line of receipt.slice(0,-1).split('\n')) {
    if (line.length > 1024 || /[\x00-\x1f\x7f]/.test(line)) return fail('INVALID_LINE');
    if ((flags as readonly string[]).includes(line)) {
      if (markers.has(line)) return fail('DUPLICATE_MARKER');
      markers.add(line);
      continue;
    }
    const idx = line.indexOf('=');
    const key = line.slice(0,idx);
    const value = line.slice(idx+1);
    if (idx < 1 || !(fields as readonly string[]).includes(key) ||
        !value || values.has(key)) return fail('UNKNOWN_OR_DUPLICATE_FIELD');
    values.set(key,value);
  }
  if (values.get('MISSION') !== scope.mission ||
      values.get('CHECKPOINT') !== scope.checkpoint ||
      !markers.has('FREEBOX_ARCHIVE_VERIFIEE') ||
      !markers.has('AUCUNE_ARCHIVE_SOURCE_SUPPRIMEE')) return fail('BASE_PROOF_MISSING');
  const archiveDigest = values.get('GPG_SHA256') ?? '';
  const tarDigest = values.get('TAR_SHA256') ?? '';
  const rawText = values.get('TAR_BYTES') ?? '';
  const encryptedText = values.get('GPG_BYTES') ?? '';
  const rawArchiveBytes = Number(rawText);
  const encryptedArchiveBytes = Number(encryptedText);
  const utc = values.get('UTC') ?? '';
  const recordedAtMs = Date.parse(utc);
  const remotePath = values.get('REMOTE_PATH') ?? '';
  if (!sha.test(archiveDigest) || !sha.test(tarDigest) ||
      !/^[1-9][0-9]*$/.test(rawText) || !/^[1-9][0-9]*$/.test(encryptedText) ||
      !positive(rawArchiveBytes) || !positive(encryptedArchiveBytes) ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(utc) ||
      !Number.isFinite(recordedAtMs) ||
      new Date(recordedAtMs).toISOString() !== utc.replace('Z','.000Z') ||
      !remotePath || remotePath.split('/').some(v=>!v||v==='.'||v==='..') ||
      !remotePath.endsWith('-'+archiveDigest.slice(0,16)+'.tar.gz.gpg'))
    return fail('INVALID_ARCHIVE_METADATA');
  if (kind === 'OFFSITE') {
    if (values.size !== 8 || markers.size !== 2) return fail('OFFSITE_RECEIPT_SCOPE_MISMATCH');
  } else {
    if (values.size !== 11 || markers.size !== flags.length ||
        values.get('PLAN_SHA256') !== scope.planDigest ||
        values.get('IMAGES_RESTAUREES_ET_IDENTIQUES') !== String(scope.imageCount) ||
        values.get('TAGS_RESTAURES_ET_IDENTIQUES') !== String(scope.tagCount))
      return fail('EXACT_RESTORE_PROOF_MISSING');
  }
  return {
    status:'STRUCTURE_VERIFIED', stage:kind==='OFFSITE'?'OFFSITE_VERIFIED':'RESTORE_VERIFIED',
    receiptDigest:actual, planDigest:scope.planDigest, archiveDigest,
    rawArchiveBytes, encryptedArchiveBytes, recordedAtMs, effectAuthorized:false
  };
}

/** A start marker wins over a prior restore receipt. A result file alone
 * cannot certify a partial destructive operation after lost transport. */
export function projectRetentionStage(input: {
  startMarkerPresent: boolean;
  verifiedCompletionReceipt: boolean;
  restoreReceiptPresent: boolean;
  offsiteReceiptPresent: boolean;
  partialTransitPresent: boolean;
}): Stage {
  if (input.verifiedCompletionReceipt) {
    return input.startMarkerPresent && input.restoreReceiptPresent
      ? 'RETENTION_VERIFIED' : 'PARTIAL';
  }
  if (input.startMarkerPresent) return 'RETENTION_STARTED';
  if (input.restoreReceiptPresent) return input.offsiteReceiptPresent ? 'RESTORE_VERIFIED' : 'PARTIAL';
  if (input.offsiteReceiptPresent) return 'OFFSITE_VERIFIED';
  return input.partialTransitPresent ? 'PARTIAL' : 'EMPTY';
}
