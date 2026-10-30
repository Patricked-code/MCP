import assert from 'node:assert/strict';
import test from 'node:test';
import { assessPleskFoundationCompletion } from '../src/provisioning/pleskFoundationCompletionGate.js';
import type { PleskFoundationEvidence } from '../src/provisioning/pleskFoundationCompletionGate.js';
const at = '2026-10-30T10:00:00.000Z';
const ready: PleskFoundationEvidence = {
 serverId:'s1', observedAt:at, parentSubscriptionVerified:true,
 canonicalRootVerified:true,gitRepositoryBindingVerified:true,
 githubInstallationPermissionVerified:true,deploymentPipelineVerified:true,
 dnsVerified:true,tlsVerified:true,healthCheckVerified:true,
 backupVerified:true,rollbackVerified:true
};
test('all evidence yields admission candidate, never runtime write',()=>{
 const r=assessPleskFoundationCompletion(ready,'s1',at);
 assert.equal(r.status,'READY_FOR_GOVERNED_ADMISSION');
 assert.equal(r.runtimeWriteAuthorized,false);
 assert.equal(r.operationExecuted,false);
});
test('wrong server, absent and stale evidence fail closed',()=>{
 assert.equal(assessPleskFoundationCompletion(ready,'s2',at).status,'BLOCKED');
 assert.equal(assessPleskFoundationCompletion(null,'s1',at).status,'BLOCKED');
 assert.deepEqual(assessPleskFoundationCompletion(ready,'s1','2026-10-30T10:06:00.000Z').missing,['EVIDENCE_STALE']);
 assert.deepEqual(assessPleskFoundationCompletion({...ready,observedAt:'2026-10-30T10:01:00.000Z'},'s1',at).missing,['EVIDENCE_STALE']);
});
test('missing GitHub, DNS, rollback and health block admission',()=>{
 const r=assessPleskFoundationCompletion({...ready,githubInstallationPermissionVerified:false,
  dnsVerified:false,rollbackVerified:false,healthCheckVerified:false},'s1',at);
 assert.equal(r.status,'BLOCKED');
 assert.deepEqual(r.missing,['githubInstallationPermissionVerified','dnsVerified','healthCheckVerified','rollbackVerified']);
});
