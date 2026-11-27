/**
 * Pure planning contract for native backup/restore/retention. Issue #492.
 * No I/O, SSH, command construction, task creation or permission grant.
 * Observations must be resolved from existing trusted runtime authorities by
 * the future adapter, never accepted as authorization from a client.
 */
export type Evidence<T> = Readonly<{ observedAtMs: number; value: T }>;
export type Stage = 'EMPTY' | 'PARTIAL' | 'OFFSITE_VERIFIED' |
  'RESTORE_VERIFIED' | 'RETENTION_STARTED' | 'RETENTION_VERIFIED';
export type Probe = 'CLEAR' | 'BUSY' | 'UNKNOWN';
export type Step = 'WAIT' | 'RECONCILE' | 'BACKUP_CANDIDATE' |
  'RESTORE_CANDIDATE' | 'RETENTION_CANDIDATE' | 'CERTIFY_CANDIDATE';
export type Observation = Readonly<{
  nowMs: number;
  maxAgeMs: number;
  stage: Evidence<Stage>;
  producers: Evidence<Probe>;
  deployment: Evidence<Probe>;
  conflicts: Evidence<Probe>;
  sourceHealthy: Evidence<boolean>;
  destinationHealthy: Evidence<boolean>;
  relayFreeBytes: Evidence<number>;
  destinationFreeBytes: Evidence<number>;
  rawArchiveBytes: Evidence<number> | null;
  offsiteVerified: Evidence<boolean>;
  restoredExactReferences: Evidence<boolean>;
  protectedReferencesClear: Evidence<boolean>;
  policyAdmitted: Evidence<boolean>;
  planDigest: string;
  receiptPlanDigest: string | null;
}>;
export type Decision = Readonly<{
  schemaVersion: 1;
  nextStep: Step;
  reasons: readonly string[];
  planDigest: string;
  effectAuthorized: false;
  writesPerformed: false;
}>;

const GIB = 1024 ** 3;
const MIB = 1024 ** 2;
const digest = /^[a-f0-9]{64}$/;
const stages: readonly Stage[] = [
  'EMPTY', 'PARTIAL', 'OFFSITE_VERIFIED', 'RESTORE_VERIFIED',
  'RETENTION_STARTED', 'RETENTION_VERIFIED'
];
const bytes = (n: number) => Number.isSafeInteger(n) && n >= 0;

/** Initial bounds mirror the existing PRC17A Docker guard; not a new policy. */
export const DockerBackupBounds = Object.freeze({
  initialRelayBytes: 32 * GIB,
  initialDestinationBytes: 25_000_000_000,
  rawArchiveLimitBytes: 9 * GIB,
  restoreReserveBytes: 12 * GIB,
  restoreOverheadBytes: 512 * MIB
});

/** Actual available bytes must be measured again immediately before load. */
export function minimumDockerRestoreFreeBytes(rawBytes: number): number | null {
  if (!bytes(rawBytes) || rawBytes === 0 ||
      rawBytes > DockerBackupBounds.rawArchiveLimitBytes) return null;
  return DockerBackupBounds.restoreReserveBytes + 2 * rawBytes +
    DockerBackupBounds.restoreOverheadBytes;
}

/**
 * This projection is intentionally incapable of granting authority.
 * Freshness, digest match and phase are necessary, never sufficient for effect.
 * The executor must re-observe under the existing locks/lease/fencing,
 * validate exact policy/receipt and re-run all script-local guards.
 */
export function evaluateDockerMaintenance(o: Observation): Decision {
  const result = (nextStep: Step, ...reasons: string[]): Decision => ({
    schemaVersion: 1, nextStep, reasons, planDigest: o.planDigest,
    effectAuthorized: false, writesPerformed: false
  });
  if (!Number.isSafeInteger(o.nowMs) || o.nowMs < 0 ||
      o.nowMs > 8.64e15 || !Number.isSafeInteger(o.maxAgeMs) ||
      o.maxAgeMs < 1 || o.maxAgeMs > 15 * 60_000 ||
      !digest.test(o.planDigest)) return result('WAIT', 'INVALID_CONTEXT');

  const fresh = <T>(e: Evidence<T> | null): e is Evidence<T> =>
    e !== null && typeof e === 'object' &&
    Number.isSafeInteger(e.observedAtMs) &&
    e.observedAtMs <= o.nowMs && e.observedAtMs >= o.nowMs - o.maxAgeMs;
  if (!fresh(o.stage) || !stages.includes(o.stage.value)) {
    return result('WAIT', 'STAGE_UNVERIFIED');
  }
  // Existing or partially applied effects must never be replayed blindly.
  if (o.stage.value === 'PARTIAL' || o.stage.value === 'RETENTION_STARTED') {
    return result('RECONCILE', 'PRIOR_EFFECT_REQUIRES_RECONCILIATION');
  }
  if (o.stage.value !== 'EMPTY' && o.receiptPlanDigest !== o.planDigest) {
    return result('RECONCILE', 'RECEIPT_PLAN_MISMATCH');
  }
  if (o.stage.value === 'EMPTY' && o.receiptPlanDigest !== null) {
    return result('RECONCILE', 'UNEXPECTED_PRIOR_RECEIPT');
  }

  const hour = new Date(o.nowMs).getUTCHours();
  if ([22, 23, 0, 1].includes(hour)) {
    return result('WAIT', 'PROTECTED_BACKUP_WINDOW');
  }
  if (![o.producers, o.deployment, o.conflicts].every(
    e => fresh(e) && e.value === 'CLEAR')) {
    return result('WAIT', 'PRODUCER_DEPLOYMENT_OR_CONFLICT_UNVERIFIED');
  }
  if (![o.sourceHealthy, o.destinationHealthy].every(
    e => fresh(e) && e.value === true)) {
    return result('WAIT', 'HEALTH_UNVERIFIED');
  }
  if (!fresh(o.policyAdmitted) || o.policyAdmitted.value !== true) {
    return result('WAIT', 'POLICY_ADMISSION_UNVERIFIED');
  }

  if (o.stage.value === 'RETENTION_VERIFIED') {
    return result('CERTIFY_CANDIDATE', 'MEASURE_ACTUAL_EFFECTS');
  }
  if (!fresh(o.relayFreeBytes) || !bytes(o.relayFreeBytes.value) ||
      !fresh(o.destinationFreeBytes) || !bytes(o.destinationFreeBytes.value)) {
    return result('WAIT', 'CAPACITY_UNVERIFIED');
  }
  if (o.stage.value === 'EMPTY') {
    if (o.relayFreeBytes.value < DockerBackupBounds.initialRelayBytes ||
        o.destinationFreeBytes.value < DockerBackupBounds.initialDestinationBytes) {
      return result('WAIT', 'INITIAL_CAPACITY_INSUFFICIENT');
    }
    return result('BACKUP_CANDIDATE', 'PRECONDITIONS_OBSERVED');
  }
  if (!fresh(o.offsiteVerified) || o.offsiteVerified.value !== true) {
    return result('WAIT', 'OFFSITE_READBACK_UNVERIFIED');
  }
  if (o.stage.value === 'OFFSITE_VERIFIED') {
    const required = fresh(o.rawArchiveBytes)
      ? minimumDockerRestoreFreeBytes(o.rawArchiveBytes.value) : null;
    if (required === null || o.relayFreeBytes.value < required) {
      return result('WAIT', 'RESTORE_CAPACITY_INSUFFICIENT_OR_UNKNOWN');
    }
    return result('RESTORE_CANDIDATE', 'RESTORE_EXISTING_ARCHIVE_NO_REEXPORT');
  }
  if (!fresh(o.restoredExactReferences) || o.restoredExactReferences.value !== true) {
    return result('WAIT', 'RESTORE_REFERENCES_UNVERIFIED');
  }
  if (!fresh(o.protectedReferencesClear) || o.protectedReferencesClear.value !== true) {
    return result('WAIT', 'PROTECTED_REFERENCES_UNVERIFIED');
  }
  return result('RETENTION_CANDIDATE', 'REVALIDATE_UNDER_CANONICAL_LOCKS');
}
