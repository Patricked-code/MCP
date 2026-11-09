import assert from 'node:assert/strict';
import test from 'node:test';
import { executePleskSubdomain, type PleskCreateDependencies } from '../src/provisioning/pleskExecute.js';
import type { PleskSubdomainInput } from '../src/provisioning/pleskSite.js';

const input: PleskSubdomainInput = {
  serverId: 's2', parentDomain: 'chainsolutions.fr', label: 'demo-tdd',
  documentRoot: '/demo-tdd',
  evidence: {
    parentExists: true, targetExists: false, documentRootExists: false,
    subscriptionAuthorized: true, documentRootSafe: true, targetOwnedByProvisioner: false
  }
};
const approval = { allowWrite: true, consent: 'CREATE_SUBDOMAIN' as const };

test('Plesk EXEC RED: no write without explicit allowWrite and exact consent', async () => {
  let calls = 0;
  const deps: PleskCreateDependencies = {
    observe: async () => input.evidence,
    create: async () => { calls++; return { exitCode: 0 }; },
    verify: async () => true
  };
  for (const permission of [
    { allowWrite: false, consent: 'CREATE_SUBDOMAIN' as const },
    { allowWrite: true, consent: null }
  ]) {
    assert.equal((await executePleskSubdomain(input, permission, deps)).status, 'BLOCKED');
  }
  assert.equal(calls, 0);
});

test('Plesk EXEC RED: fresh preflight plus explicit consent permit one bounded command', async () => {
  const calls: Array<{ server: string; argv: readonly string[] }> = [];
  const deps: PleskCreateDependencies = {
    observe: async () => input.evidence,
    create: async (server, argv) => { calls.push({server, argv}); return { exitCode: 0 }; },
    verify: async () => true
  };
  const result = await executePleskSubdomain(input, approval, deps);
  assert.equal(result.status, 'CREATED');
  assert.deepEqual(calls, [{
    server: 's2',
    argv: ['plesk', 'bin', 'subdomain', '--create', 'demo-tdd', '-domain', 'chainsolutions.fr', '-www-root', '/demo-tdd']
  }]);
});

test('Plesk EXEC RED: never write if fresh preflight finds a collision', async () => {
  let wrote = false;
  const result = await executePleskSubdomain(input, approval, {
    observe: async () => ({...input.evidence, targetExists: true, targetOwnedByProvisioner: false}),
    create: async () => {wrote = true; return {exitCode:0}},
    verify: async () => true
  });
  assert.equal(result.status, 'BLOCKED');
  assert.equal(wrote, false);
});

test('Plesk EXEC RED: an existing owned site is NO_OP and never re-created', async () => {
  let wrote = false;
  const result = await executePleskSubdomain(input, approval, {
    observe: async () => ({...input.evidence, targetExists: true, targetOwnedByProvisioner: true}),
    create: async () => {wrote = true; return {exitCode:0}},
    verify: async () => true
  });
  assert.equal(result.status, 'NO_OP');
  assert.equal(wrote, false);
});

test('Plesk EXEC RED: command failure and missing post-write proof do not claim success', async () => {
  const failure = await executePleskSubdomain(input, approval, {
    observe: async () => input.evidence,
    create: async () => ({exitCode:23}),
    verify: async () => true
  });
  assert.equal(failure.status, 'FAILED');
  const unverified = await executePleskSubdomain(input, approval, {
    observe: async () => input.evidence,
    create: async () => ({exitCode:0}),
    verify: async () => false
  });
  assert.equal(unverified.status, 'UNVERIFIED');
});
