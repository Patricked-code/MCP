import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { parseDockerReceipt, projectRetentionStage, type DockerReceiptInput }
  from '../src/infrastructureLifecycle/backupReceipt.js';

const plan = 'a'.repeat(64), cipher = 'b'.repeat(64), tar = 'c'.repeat(64);
const scope = {mission:'test-mission', checkpoint:'test-docker', planDigest:plan,
  imageCount:79, tagCount:160};
const offsite = [
  'MISSION=test-mission','CHECKPOINT=test-docker','UTC=2026-01-15T04:00:00Z',
  'REMOTE_PATH=backup/docker/fixture-'+cipher.slice(0,16)+'.tar.gz.gpg',
  'GPG_SHA256='+cipher,'GPG_BYTES=123','TAR_SHA256='+tar,'TAR_BYTES=456',
  'FREEBOX_ARCHIVE_VERIFIEE','AUCUNE_ARCHIVE_SOURCE_SUPPRIMEE'
].join('\n')+'\n';
const restored = offsite+[
  'IMAGES_RESTAUREES_ET_IDENTIQUES=79','TAGS_RESTAURES_ET_IDENTIQUES=160',
  'PLAN_SHA256='+plan,'IMAGES_TEST_S2_CONSERVEES','CONTENEURS_NON_LANCES',
  'SUPPRESSION_S1_NON_EXECUTEE','PRC17A_DOCKER_ARCHIVE_RESTAUREE'
].join('\n')+'\n';
function input(receipt=restored,kind:DockerReceiptInput['kind']='RESTORE'): DockerReceiptInput {
  return {receipt,kind,scope,observedPlanDigest:plan,
    expectedReceiptDigest:createHash('sha256').update(receipt).digest('hex')};
}
test('offsite receipt never proves restore',()=>{
  const r=parseDockerReceipt(input(offsite,'OFFSITE'));
  assert.equal(r.status,'STRUCTURE_VERIFIED');
  if(r.status==='STRUCTURE_VERIFIED') assert.equal(r.stage,'OFFSITE_VERIFIED');
  assert.equal(parseDockerReceipt(input(offsite)).status,'UNVERIFIED');
});
test('exact restore receipt parsed without authority or remote path exposure',()=>{
  const r=parseDockerReceipt(input());
  assert.equal(r.status,'STRUCTURE_VERIFIED');
  if(r.status==='STRUCTURE_VERIFIED'){
    assert.equal(r.stage,'RESTORE_VERIFIED');assert.equal(r.rawArchiveBytes,456);
    assert.equal(r.encryptedArchiveBytes,123);assert.equal(r.archiveDigest,cipher);
  }
  assert.equal(r.effectAuthorized,false);
  assert.equal('remotePath' in r,false);
});
test('incorrect receipt digest or observed plan rejected',()=>{
  assert.equal(parseDockerReceipt({...input(),expectedReceiptDigest:tar}).status,'UNVERIFIED');
  assert.equal(parseDockerReceipt({...input(),observedPlanDigest:tar}).status,'UNVERIFIED');
});
test('duplicate, malformed or foreign fields and incorrect markers rejected',()=>{
  for(const receipt of [
    restored+'MISSION=test-mission\n',
    restored+'FREEBOX_ARCHIVE_VERIFIEE\n',
    restored+'UNKNOWN=1\n',
    restored.replace('test-docker','test-plesk'),
    restored.replace('=79','=78'),
    restored.replace('=160','=159'),
    restored.replace('PLAN_SHA256='+plan,'PLAN_SHA256='+tar),
    restored.replace('CONTENEURS_NON_LANCES\n',''),
    restored.replace('GPG_BYTES=123','GPG_BYTES=-1'),
    restored.replace('TAR_BYTES=456','TAR_BYTES=99999999999999999999'),
    restored.replace('2026-01-15','2026-02-31'),
    restored.replace('backup/docker/','backup/../'),
    restored.replace(cipher.slice(0,16),'d'.repeat(16)),
    restored.slice(0,-1),
    restored.replaceAll('\n','\r\n')
  ]) assert.equal(parseDockerReceipt(input(receipt)).status,'UNVERIFIED');
});
test('restore receipt cannot masquerade as offsite-only',()=>{
  assert.equal(parseDockerReceipt(input(restored,'OFFSITE')).status,'UNVERIFIED');
});
test('previous retention start prevents another removal',()=>{
  const base={startMarkerPresent:false,verifiedCompletionReceipt:false,
    restoreReceiptPresent:false,offsiteReceiptPresent:false,partialTransitPresent:false};
  assert.equal(projectRetentionStage(base),'EMPTY');
  assert.equal(projectRetentionStage({...base,partialTransitPresent:true}),'PARTIAL');
  assert.equal(projectRetentionStage({...base,offsiteReceiptPresent:true}),'OFFSITE_VERIFIED');
  assert.equal(projectRetentionStage({...base,restoreReceiptPresent:true}),'PARTIAL');
  const ready={...base,restoreReceiptPresent:true,offsiteReceiptPresent:true};
  assert.equal(projectRetentionStage(ready),'RESTORE_VERIFIED');
  assert.equal(projectRetentionStage({...ready,startMarkerPresent:true}),'RETENTION_STARTED');
  assert.equal(projectRetentionStage({...ready,verifiedCompletionReceipt:true}),'PARTIAL');
  assert.equal(projectRetentionStage({...ready,startMarkerPresent:true,verifiedCompletionReceipt:true,offsiteReceiptPresent:false}),'PARTIAL');
  assert.equal(projectRetentionStage({...ready,startMarkerPresent:true,verifiedCompletionReceipt:true}),'RETENTION_VERIFIED');
});
