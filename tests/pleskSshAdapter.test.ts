import assert from 'node:assert/strict';
import test from 'node:test';
import { observePleskSubdomain, createPleskSubdomainOnServer, type PleskPolicy, type PleskRemotePort } from '../src/provisioning/pleskSshAdapter.js';
import type { PleskSubdomainInput } from '../src/provisioning/pleskSite.js';

const target: PleskSubdomainInput = {
  serverId: 's2', parentDomain: 'chainsolutions.fr', label: 'tdd-safe', documentRoot: '/tdd-safe',
  evidence: { parentExists: null, targetExists: null, documentRootExists: null, subscriptionAuthorized: null, documentRootSafe: null, targetOwnedByProvisioner: null }
};
const allowed: PleskPolicy = { enabled: true, allowedParents: { s2: ['chainsolutions.fr'] } };

function fake(options: { existing?: boolean; absentMessage?: string; status?: number } = {}) {
  const commands: string[] = [];
  const writes: string[] = [];
  let created = false;
  const io: PleskRemotePort = {
    readonly: async (_server, command) => {
      commands.push(command);
      if (command.startsWith('plesk bin subscription --info')) return { code: 0, stdout: 'Subscription: chainsolutions.fr' };
      if (command.startsWith('plesk bin subdomain --info')) {
        return (options.existing || created)
          ? { code: 0, stdout: 'Subdomain information' }
          : { code: 1, stdout: '', stderr: options.absentMessage ?? 'Error: Specified subdomain does not exist' };
      }
      if (command.startsWith('test -d')) return { code: 0, stdout: '' };
      if (command.startsWith('test -L')) return { code: 1, stdout: '' };
      if (command.startsWith('test -e')) return (options.existing || created) ? { code: 0, stdout: '' } : { code: 1, stdout: '' };
      throw new Error('unexpected command: ' + command);
    },
    guarded: async (_server, command) => {
      writes.push(command);
      created = options.status === undefined || options.status === 0;
      return { code: options.status ?? 0, stdout: '' };
    }
  };
  return { io, commands, writes };
}

test('Plesk SSH RED: observes an allowed subscription, missing subdomain and safe document root', async () => {
  const f = fake();
  const evidence = await observePleskSubdomain(target, allowed, f.io);
  assert.equal(evidence.parentExists, true);
  assert.equal(evidence.targetExists, false);
  assert.equal(evidence.documentRootExists, false);
  assert.equal(evidence.documentRootSafe, true);
  assert.equal(evidence.subscriptionAuthorized, true);
  assert.equal(f.writes.length, 0);
});

test('Plesk SSH RED: unconfigured parent causes no network or write', async () => {
  const f = fake();
  const result = await createPleskSubdomainOnServer(target, {enabled: true, allowedParents: {s2: []}}, true, f.io);
  assert.equal(result.status, 'BLOCKED');
  assert.equal(f.commands.length, 0);
  assert.equal(f.writes.length, 0);
});

test('Plesk SSH RED: unknown Plesk info failure blocks without guessing target is absent', async () => {
  const f = fake({absentMessage:'database unavailable'});
  const result = await createPleskSubdomainOnServer(target, allowed, true, f.io);
  assert.equal(result.status, 'BLOCKED');
  assert.equal(f.writes.length, 0);
});

test('Plesk SSH RED: explicitly admitted site executes one command and verifies new site', async () => {
  const f = fake();
  const result = await createPleskSubdomainOnServer(target, allowed, true, f.io);
  assert.equal(result.status, 'CREATED');
  assert.equal(f.writes.length, 1);
  assert.equal(f.writes[0], "plesk bin subdomain --create 'tdd-safe' -domain 'chainsolutions.fr' -www-root '/tdd-safe'");
});

test('Plesk SSH RED: existing site and disabled writes never overwrite', async () => {
  const existing = fake({existing:true});
  assert.equal((await createPleskSubdomainOnServer(target, allowed, true, existing.io)).status, 'BLOCKED');
  assert.equal(existing.writes.length,0);
  const disabled=fake();
  assert.equal((await createPleskSubdomainOnServer(target, {...allowed,enabled:false}, true, disabled.io)).status,'BLOCKED');
  assert.equal(disabled.commands.length,0);
  assert.equal(disabled.writes.length,0);
});

test('Plesk SSH RED: failed CLI creation cannot be attested as success', async () => {
  const f = fake({status:21});
  assert.equal((await createPleskSubdomainOnServer(target, allowed, true, f.io)).status,'FAILED');
  assert.equal(f.writes.length, 1);
});

test('Plesk SSH RED: reject nested or mismatched roots without inspecting unknown ancestors', async () => {
  for (const documentRoot of ['/nested/tdd-safe', '/another-site']) {
    const f = fake();
    const result = await createPleskSubdomainOnServer(
      { ...target, documentRoot }, allowed, true, f.io
    );
    assert.equal(result.status, 'BLOCKED');
    assert.equal(f.commands.length, 0);
    assert.equal(f.writes.length, 0);
  }
});
