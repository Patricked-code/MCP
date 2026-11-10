import assert from 'node:assert/strict';
import test from 'node:test';
process.env.MCP_AUTH_TOKEN ??= 'test-only-not-production';
process.env.S1_HOST ??= '127.0.0.1';
process.env.S2_HOST ??= '127.0.0.1';
process.env.S1_KEY_PATH ??= '/tmp/unused-s2-plan-s1';
process.env.S2_KEY_PATH ??= '/tmp/unused-s2-plan-s2';
const { S2_LEGACY_TARGETS, buildS2LegacyProbeCommand,
  cleanupS2DisposalPolicy, cleanupS2GitPolicy, credentialRotationPlan } =
  await import('../src/tools/s2CleanupGovernedRead.js');

test('six historical path probes are fixed and read-only', () => {
  assert.equal(Object.keys(S2_LEGACY_TARGETS).length, 6);
  assert.equal(S2_LEGACY_TARGETS.wti_apex, '/var/www/vhosts/wealthtechinnovations.ci');
  for (const name of Object.keys(S2_LEGACY_TARGETS) as Array<keyof typeof S2_LEGACY_TARGETS>) {
    const command = buildS2LegacyProbeCommand(name);
    assert.ok(command.includes("TARGET='" + S2_LEGACY_TARGETS[name] + "'"));
    assert.ok(command.includes('realpath -e'));
    assert.ok(command.includes('du -sB1'));
    assert.doesNotMatch(command, /\brm\s|\bmv\s|\btruncate\s|\bsystemctl\s|\bdocker\s+rm/);
  }
});
test('only rebuildable caches may omit a backup, never automatic deletion', () => {
  const policy = cleanupS2DisposalPolicy();
  assert.equal(policy.deletionAllowed, false);
  assert.equal(policy.writesPerformed, false);
  assert.deepEqual(policy.categories.filter(x => x.backupOptional).map(x => x.category),
    ['REBUILDABLE_BUILD_CACHE']);
  assert.ok(policy.categories[0].requirements.includes('REBUILD_VERIFIED'));
});
test('GitHub plan is private and rejects database dumps and secrets', () => {
  const policy = cleanupS2GitPolicy();
  assert.equal(policy.repositoryCreated, false);
  assert.equal(policy.privateRepositoryRequired, true);
  assert.ok(policy.prohibited.includes('database dumps'));
  assert.ok(policy.prohibited.includes('SSH keys'));
});
test('credential preflight never accepts raw passwords or writes secrets', () => {
  const policy = credentialRotationPlan();
  assert.equal(policy.changed, false);
  assert.equal(policy.acceptsRawPassword, false);
  assert.equal(policy.targets.length, 4);
});
