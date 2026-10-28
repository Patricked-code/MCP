import assert from 'node:assert/strict';
import test from 'node:test';
import { planPleskSubdomain, type PleskSubdomainInput } from '../src/provisioning/pleskSite.js';

const valid: PleskSubdomainInput = {
  serverId: 's2',
  parentDomain: 'chainsolutions.fr',
  label: 'demo-tdd',
  documentRoot: '/demo-tdd',
  evidence: {
    parentExists: true,
    targetExists: false,
    documentRootExists: false,
    subscriptionAuthorized: true,
    documentRootSafe: true,
    targetOwnedByProvisioner: false
  }
};

test('Plesk RED: valid new subdomain returns bounded READY operation on S2', () => {
  const plan = planPleskSubdomain(valid);
  assert.equal(plan.decision, 'READY');
  assert.equal(plan.fqdn, 'demo-tdd.chainsolutions.fr');
  assert.deepEqual(plan.argv, [
    'plesk', 'bin', 'subdomain', '--create', 'demo-tdd',
    '-domain', 'chainsolutions.fr', '-www-root', '/demo-tdd'
  ]);
});

test('Plesk RED: valid new subdomain also works on S1', () => {
  assert.equal(planPleskSubdomain({
    ...valid,
    serverId: 's1',
    parentDomain: 'wealthtechinnovations.com'
  }).decision, 'READY');
});

test('Plesk RED: existing owned target is idempotent NO_OP, never overwritten', () => {
  const plan = planPleskSubdomain({
    ...valid,
    evidence: { ...valid.evidence, targetExists: true, targetOwnedByProvisioner: true }
  });
  assert.equal(plan.decision, 'NO_OP');
  assert.deepEqual(plan.argv, []);
});

test('Plesk RED: existing unrelated target and unverified ownership block', () => {
  for (const owned of [false, null]) {
    assert.equal(planPleskSubdomain({
      ...valid, evidence: { ...valid.evidence, targetExists: true, targetOwnedByProvisioner: owned }
    }).decision, 'BLOCKED');
  }
});

test('Plesk RED: missing permissions, unknown observations and unsafe roots fail closed', () => {
  for (const modification of [
    { subscriptionAuthorized: false },
    { subscriptionAuthorized: null },
    { parentExists: null },
    { documentRootSafe: false },
    { documentRootSafe: null },
    { documentRootExists: true },
    { targetExists: null }
  ]) {
    const plan = planPleskSubdomain({
      ...valid, evidence: { ...valid.evidence, ...modification }
    });
    assert.equal(plan.decision, 'BLOCKED');
    assert.deepEqual(plan.argv, []);
  }
});

test('Plesk RED: reject malicious labels, parent domain and document root', () => {
  for (const modification of [
    { label: '../escape' },
    { label: 'test;id' },
    { label: '*' },
    { parentDomain: 'chainsolutions.fr;id' },
    { parentDomain: 'localhost' },
    { documentRoot: '/../system' },
    { documentRoot: '/safe/../escape' },
    { documentRoot: '/safe;id' }
  ]) {
    const plan = planPleskSubdomain({ ...valid, ...modification });
    assert.equal(plan.decision, 'BLOCKED');
    assert.deepEqual(plan.argv, []);
  }
});
