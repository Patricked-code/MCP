import assert from 'node:assert/strict';
import test from 'node:test';
import { executeRegulatoryPleskAdmission, isRegulatoryAdmissionValid, type RegulatoryAdmission } from '../src/provisioning/regulatoryAdmission.js';
import type { PleskSubdomainInput } from '../src/provisioning/pleskSite.js';
import type { PleskRemotePort } from '../src/provisioning/pleskSshAdapter.js';

const target: PleskSubdomainInput = {
  serverId: 's1', parentDomain: 'wealthtechinnovations.com',
  label: 'regulatory', documentRoot: '/regulatory',
  evidence: { parentExists: null, targetExists: null, documentRootExists: null,
    subscriptionAuthorized: null, documentRootSafe: null, targetOwnedByProvisioner: null }
};
const valid: RegulatoryAdmission = {
  repository: 'chainsolutions-wealthtech/Regulatory',
  commitSha: 'a'.repeat(40), taskId: 'TASK-EXISTING', sessionId: 'SESSION-EXISTING',
  taskClaimedBySession: true, sessionActive: true, scopeAuthorized: true,
  locksHeld: true, revisionsFresh: true, explicitConsent: true
};

test('Regulatory admission refuses absent or invalid runtime evidence without SSH calls', async () => {
  let calls = 0;
  const io: PleskRemotePort = {
    readonly: async () => { calls++; throw new Error('unexpected read'); },
    guarded: async () => { calls++; throw new Error('unexpected write'); }
  };
  const policy = { enabled: true, allowedParents: { s1: ['wealthtechinnovations.com'] } };
  const invalid: Array<RegulatoryAdmission | null> = [
    null, ...(['taskClaimedBySession', 'sessionActive', 'scopeAuthorized', 'locksHeld',
      'revisionsFresh', 'explicitConsent'] as const).map((field) => ({ ...valid, [field]: false })),
    { ...valid, commitSha: 'bad' }, { ...valid, taskId: '' }, { ...valid, sessionId: '' }
  ];
  for (const admission of invalid) {
    const result = await executeRegulatoryPleskAdmission(target, admission, policy, io);
    assert.equal(result.status, 'BLOCKED');
  }
  assert.equal(calls, 0);
});

test('Regulatory admission rejects sibling domains, alternate server and roots', () => {
  assert.equal(isRegulatoryAdmissionValid(target, valid), false);
  for (const changed of [
    { ...target, serverId: 's2' as const },
    { ...target, label: 'other' },
    { ...target, parentDomain: 'chainsolutions.fr' },
    { ...target, documentRoot: '/other' }
  ]) assert.equal(isRegulatoryAdmissionValid(changed, valid), false);
});

test('Regulatory admission still respects server-side Plesk policy', async () => {
  let calls = 0;
  const io: PleskRemotePort = {
    readonly: async () => { calls++; throw new Error('unexpected read'); },
    guarded: async () => { calls++; throw new Error('unexpected write'); }
  };
  const result = await executeRegulatoryPleskAdmission(target, valid,
    { enabled: false, allowedParents: { s1: ['wealthtechinnovations.com'] } }, io);
  assert.equal(result.status, 'BLOCKED');
  assert.equal(calls, 0);
});


test('forged positive flags never grant Regulatory SSH access', async () => {
  let calls = 0;
  const io: PleskRemotePort = {
    readonly: async () => { calls++; throw new Error('unexpected read'); },
    guarded: async () => { calls++; throw new Error('unexpected write'); }
  };
  const result = await executeRegulatoryPleskAdmission(target, valid,
    { enabled: true, allowedParents: { s1: ['wealthtechinnovations.com'] } }, io);
  assert.equal(result.status, 'BLOCKED');
  assert.equal(calls, 0);
});
