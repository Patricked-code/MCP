import assert from 'node:assert/strict';
import test from 'node:test';
import { evaluateDockerMaintenance, minimumDockerRestoreFreeBytes,
  DockerBackupBounds, type Observation, type Evidence, type Stage
} from '../src/infrastructureLifecycle/maintenancePlan.js';

const now = Date.parse('2026-01-15T04:00:00Z');
const plan = 'a'.repeat(64);
const GIB = 1024 ** 3;
const fresh = <T>(value: T): Evidence<T> => ({ observedAtMs: now, value });
function base(stage: Stage = 'EMPTY'): Observation {
  return {
    nowMs: now, maxAgeMs: 60_000, stage: fresh(stage),
    producers: fresh('CLEAR'), deployment: fresh('CLEAR'),
    conflicts: fresh('CLEAR'), sourceHealthy: fresh(true),
    destinationHealthy: fresh(true), relayFreeBytes: fresh(36 * GIB),
    destinationFreeBytes: fresh(100 * GIB), rawArchiveBytes: fresh(6 * GIB),
    offsiteVerified: fresh(true), restoredExactReferences: fresh(true),
    protectedReferencesClear: fresh(true), policyAdmitted: fresh(true),
    planDigest: plan, receiptPlanDigest: stage === 'EMPTY' ? null : plan
  };
}
test('initial candidate never grants execution', () => {
  const d = evaluateDockerMaintenance(base());
  assert.equal(d.nextStep, 'BACKUP_CANDIDATE');
  assert.equal(d.effectAuthorized, false);
  assert.equal(d.writesPerformed, false);
});
test('existing verified archive resumes at restore, not backup', () => {
  assert.equal(evaluateDockerMaintenance(base('OFFSITE_VERIFIED')).nextStep,
    'RESTORE_CANDIDATE');
});
test('exact restore and current guards yield only retention candidate', () => {
  const d = evaluateDockerMaintenance(base('RESTORE_VERIFIED'));
  assert.equal(d.nextStep, 'RETENTION_CANDIDATE');
  assert.equal(d.effectAuthorized, false);
});
test('terminal retention is certified, not replayed', () => {
  assert.equal(evaluateDockerMaintenance(base('RETENTION_VERIFIED')).nextStep,
    'CERTIFY_CANDIDATE');
});
for (const stage of ['PARTIAL', 'RETENTION_STARTED'] as const) {
  test('prior ambiguous effect requires reconciliation: ' + stage, () => {
    assert.equal(evaluateDockerMaintenance(base(stage)).nextStep, 'RECONCILE');
  });
}
test('different plan digest cannot reuse receipt', () => {
  assert.equal(evaluateDockerMaintenance({
    ...base('RESTORE_VERIFIED'), receiptPlanDigest: 'b'.repeat(64)
  }).nextStep, 'RECONCILE');
});
test('unexpected receipt on empty stage cannot start a second export', () => {
  assert.equal(evaluateDockerMaintenance({...base(), receiptPlanDigest: plan})
    .nextStep, 'RECONCILE');
});
for (const hour of [22,23,0,1]) {
  test('protected UTC hour ' + hour, () => {
    const t = Date.UTC(2026,0,15,hour);
    const o = base();
    const d = evaluateDockerMaintenance({...o, nowMs:t, stage:{observedAtMs:t,value:'EMPTY'}});
    assert.equal(d.nextStep, 'WAIT');
    assert.deepEqual(d.reasons, ['PROTECTED_BACKUP_WINDOW']);
  });
}
test('active or unknown producers, deployments, conflicts stop', () => {
  for (const key of ['producers','deployment','conflicts'] as const) {
    for (const value of ['BUSY','UNKNOWN'] as const) {
      assert.equal(evaluateDockerMaintenance({...base(),[key]:fresh(value)}).nextStep,'WAIT');
    }
  }
});
test('unhealthy destination or unadmitted policy stops', () => {
  for (const key of ['sourceHealthy','destinationHealthy','policyAdmitted'] as const) {
    assert.equal(evaluateDockerMaintenance({...base(),[key]:fresh(false)}).nextStep,'WAIT');
  }
});
test('stale and future observations fail closed', () => {
  for (const observedAtMs of [now-60_001,now+1]) {
    assert.equal(evaluateDockerMaintenance({...base(),relayFreeBytes:{observedAtMs,value:36*GIB}}).nextStep,'WAIT');
  }
});
test('invalid capacity and below threshold fail closed', () => {
  for (const value of [-1,NaN,Infinity,31*GIB]) {
    assert.equal(evaluateDockerMaintenance({...base(),relayFreeBytes:fresh(value)}).nextStep,'WAIT');
  }
  assert.equal(evaluateDockerMaintenance({...base(),destinationFreeBytes:fresh(24_999_999_999)}).nextStep,'WAIT');
});
test('restore space calculation matches current script formula', () => {
  const required = minimumDockerRestoreFreeBytes(6*GIB);
  assert.equal(required, 24*GIB+512*1024**2);
  assert.equal(minimumDockerRestoreFreeBytes(0), null);
  assert.equal(minimumDockerRestoreFreeBytes(DockerBackupBounds.rawArchiveLimitBytes+1), null);
  assert.equal(evaluateDockerMaintenance({...base('OFFSITE_VERIFIED'),relayFreeBytes:fresh(required!-1)}).nextStep,'WAIT');
  assert.equal(evaluateDockerMaintenance({...base('OFFSITE_VERIFIED'),relayFreeBytes:fresh(required!)}).nextStep,'RESTORE_CANDIDATE');
});
test('invalid or unknown restore size does not re-export', () => {
  for (const value of [null,fresh(0),fresh(10*GIB)]) {
    assert.equal(evaluateDockerMaintenance({...base('OFFSITE_VERIFIED'),rawArchiveBytes:value}).nextStep,'WAIT');
  }
});
test('retention cannot follow a missing offsite reread, restore or reference evidence', () => {
  for (const key of ['offsiteVerified','restoredExactReferences','protectedReferencesClear'] as const) {
    assert.equal(evaluateDockerMaintenance({...base('RESTORE_VERIFIED'),[key]:fresh(false)}).nextStep,'WAIT');
  }
});
test('invalid plan or unrecognized stage never becomes a candidate', () => {
  assert.equal(evaluateDockerMaintenance({...base(),planDigest:'not-a-digest'}).nextStep,'WAIT');
  assert.equal(evaluateDockerMaintenance({...base(),stage:fresh('UNKNOWN' as Stage)}).nextStep,'WAIT');
});
