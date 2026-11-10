import assert from 'node:assert/strict';
import test from 'node:test';
// Test-only placeholders: no SSH connection or production credentials are used.
process.env.MCP_AUTH_TOKEN ??= 'ci-placeholder-only-not-a-real-credential';
process.env.S1_HOST ??= '127.0.0.1';
process.env.S2_HOST ??= '127.0.0.1';
process.env.S1_KEY_PATH ??= '/tmp/unused-cleanup-test-s1';
process.env.S2_KEY_PATH ??= '/tmp/unused-cleanup-test-s2';
const { buildServerCleanupPlan } = await import('../src/tools/cleanupPlan.js');

test('S1: a listed domain is not treated as approved for cleanup', () => {
  const plan = buildServerCleanupPlan('s1', [
    'wealthtechinnovations.com', 'niakara.com', 'sadiaaf.wealthtechinnovations.com'
  ], 'disk sample');
  assert.equal(plan.deletionAllowed, false);
  assert.ok(plan.protectedDomains.includes('niakara.com'));
  assert.ok(!plan.domainCandidates.some(c => c.domain === 'niakara.com'));
  assert.equal(plan.domainCandidates[0]?.disposition, 'DISCOVER_ONLY_NOT_AUTHORIZED');
});

test('S2: historical targets require fresh evidence, even if basename is observed', () => {
  const plan = buildServerCleanupPlan('s2', [
    'opcvm.chainsolutions.fr', 'stablecoin.chainsolutions.fr',
    'brvm.chainsolutions.fr', 'api.pccet.wealthtechinnovations.ci'
  ], 'disk sample');
  assert.equal(plan.deletionAllowed, false);
  assert.equal(plan.quarantineAllowed, false);
  assert.ok(plan.protectedDomains.includes('stablecoin.chainsolutions.fr'));
  assert.ok(!plan.domainCandidates.some(c => c.domain === 'stablecoin.chainsolutions.fr'));
  assert.equal(plan.domainCandidates.find(c => c.domain === 'opcvm.chainsolutions.fr')?.disposition,
    'REVIEW_ONLY_NOT_AUTHORIZED');
  assert.ok(plan.domainCandidates.find(c => c.domain === 'api.pccet.wealthtechinnovations.ci')?.seenAsDirectoryBasename);
  assert.equal(plan.stablecoinS2OriginalsMustRemain, true);
});

test('Backup references are not proof of backup presence or authorization to delete', () => {
  const plan = buildServerCleanupPlan('s2', [], '');
  assert.equal(plan.backupReferencesToReview.length, 8);
  assert.ok(plan.backupReferencesToReview.every(b => b.backupPresenceVerified === false));
  assert.equal(plan.domainCandidates.find(c => c.domain === 'opcvm.chainsolutions.fr')?.seenAsDirectoryBasename, false);
  assert.ok(plan.requiredBeforeAnyDestructiveOperation.includes('BACKUP_MANIFEST_AND_RESTORE_TEST'));
});

test('Untrusted directory labels cannot become shell commands or cleanup authorization', () => {
  const plan = buildServerCleanupPlan('s1', [
    '../../', ';touch /tmp/unsafe', '.env', 'node_modules', 'unexpected.com'
  ], '');
  assert.deepEqual(plan.domainCandidates.map(c => c.domain), ['unexpected.com']);
  assert.equal(plan.writesPerformed, false);
  assert.equal(plan.deletionAllowed, false);
});
