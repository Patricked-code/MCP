import assert from 'node:assert/strict';
import test from 'node:test';
import type { Request } from 'express';
import { createPleskGovernedWebExecutionBridge } from '../src/provisioning/pleskGovernedWebExecutionBridge.js';
import type { PleskSubdomainInput } from '../src/provisioning/pleskSite.js';

const target: PleskSubdomainInput = {
  serverId: 's1', parentDomain: 'example.com', label: 'recovery', documentRoot: '/recovery',
  evidence: { parentExists: null, targetExists: null, documentRootExists: null,
    subscriptionAuthorized: null, documentRootSafe: null, targetOwnedByProvisioner: null }
};
const context = (req: Request) => ({
  req, pairingProof: 'mcp-transport-proof', consentTicket: 'signed-e3', binding: 'server-bound'
});

test('external governed recovery: concurrent E3 consumption has exactly one winner and one execution', async () => {
  let consumeCount = 0;
  let executeCount = 0;
  let release!: () => void;
  const wait = new Promise<void>(resolve => { release = resolve; });
  const bridge = createPleskGovernedWebExecutionBridge({
    prepare: async () => ({ trusted: true }),
    consume: async () => { consumeCount++; await wait; return true; },
    execute: async () => { executeCount++; return { status: 'CREATED' as const, reason: 'POST_CREATE_ATTESTED' }; }
  });
  const req = {} as Request;
  assert.equal(await bridge.authorizeRuntimeWrite(target, context(req)), true);
  const first = bridge.consumeGovernedConsent(req, target, { ticket: 'signed-e3', binding: 'server-bound' });
  const second = bridge.consumeGovernedConsent(req, target, { ticket: 'signed-e3', binding: 'server-bound' });
  release();
  const outcomes = await Promise.all([first, second]);
  assert.deepEqual(outcomes.sort(), [false, true]);
  assert.equal(consumeCount, 1);
  const results = await Promise.all([
    bridge.executeGovernedCreate(req, target),
    bridge.executeGovernedCreate(req, target)
  ]);
  assert.deepEqual(results.map(x => x.status).sort(), ['BLOCKED', 'CREATED']);
  assert.equal(executeCount, 1);
});

test('external governed recovery: mismatched binding and target never reach executor', async () => {
  let executed = 0;
  const bridge = createPleskGovernedWebExecutionBridge({
    prepare: async () => ({ trusted: true }),
    consume: async () => true,
    execute: async () => { executed++; return { status: 'CREATED' as const, reason: 'POST_CREATE_ATTESTED' }; }
  });
  const req = {} as Request;
  assert.equal(await bridge.authorizeRuntimeWrite(target, context(req)), true);
  assert.equal(await bridge.consumeGovernedConsent(req, target, {
    ticket: 'signed-e3', binding: 'different-binding'
  }), false);
  assert.equal((await bridge.executeGovernedCreate(req, target)).status, 'BLOCKED');
  assert.equal(executed, 0);
});
