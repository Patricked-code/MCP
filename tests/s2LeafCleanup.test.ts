import assert from 'node:assert/strict';
import test from 'node:test';
process.env.MCP_AUTH_TOKEN ??= 'mcp-test-only-credential-20261110-no-secret';
process.env.S1_HOST ??= '127.0.0.1';
process.env.S2_HOST ??= '127.0.0.1';
process.env.S1_KEY_PATH ??= '/tmp/unused-s1';
process.env.S2_KEY_PATH ??= '/tmp/unused-s2';
const { S2_LEAF_TARGETS, buildS2LeafProbe, buildS2LeafQuarantine,
  parseS2LeafInspection, assertS2OperatorApproval } =
  await import('../src/tools/s2LeafCleanup.js');

test('five exact leaf targets, parent and protected resources excluded', () => {
  assert.equal(Object.keys(S2_LEAF_TARGETS).length, 5);
  for (const [key, cfg] of Object.entries(S2_LEAF_TARGETS)) {
    assert.notEqual(cfg.path, '/var/www/vhosts/wealthtechinnovations.ci');
    assert.ok(cfg.path.startsWith('/var/www/vhosts/'));
    assert.doesNotMatch(cfg.path, /stablecoin|africafunds|brvm/i);
    const probe = buildS2LeafProbe(key as keyof typeof S2_LEAF_TARGETS);
    assert.ok(probe.includes("TARGET='" + cfg.path + "'"));
    assert.ok(probe.includes('plesk bin domain --list'));
    assert.ok(probe.includes('lsof +D'));
    assert.doesNotMatch(probe, /\b(?:rm|mv|truncate|shutdown)\s/);
  }
});
test('failed or malformed evidence always blocks and never deletes', () => {
  const ok = 'target=evote\nbytes=100\nfingerprint=' + 'b'.repeat(64) +
    '\ndependencies=PLESK_UNBOUND_NO_OPEN_HANDLES\n';
  const r = parseS2LeafInspection('evote',ok,0);
  assert.equal(r.status,'OPERATOR_APPROVAL_REQUIRED');
  assert.equal(r.deletionAllowed,false);
  for (const [payload,code] of [[ok,47],[ok+'bytes=1\n',0],
    [ok.replace('target=evote','target=pccet'),0],
    [ok.replace('bytes=100','bytes=-1'),0]] as const) {
    assert.equal(parseS2LeafInspection('evote',payload,code).status,'BLOCKED');
  }
});
test('operator env approval defaults to disabled and is exact fingerprint-bound', () => {
  const key = 'evote', fp = 'c'.repeat(64);
  assert.throws(() => assertS2OperatorApproval(key,fp,{}),/S2_CLEANUP_DISABLED/);
  assert.throws(() => assertS2OperatorApproval(key,fp,
    { MCP_S2_CLEANUP_EXECUTION_ENABLED:'true' }),/APPROVAL_MISSING/);
  assert.throws(() => assertS2OperatorApproval(key,fp,
    { MCP_S2_CLEANUP_EXECUTION_ENABLED:'true',
      MCP_S2_CLEANUP_APPROVED_FINGERPRINTS:'{"evote":"'+'d'.repeat(64)+'"}' }),/APPROVAL_FINGERPRINT_MISMATCH/);
  assert.doesNotThrow(() => assertS2OperatorApproval(key,fp,
    { MCP_S2_CLEANUP_EXECUTION_ENABLED:'true',
      MCP_S2_CLEANUP_APPROVED_FINGERPRINTS:'{"evote":"' + fp + '"}' }));
});
test('quarantine is same-device and reversible with receipt, not recursive deletion', () => {
  const cmd = buildS2LeafQuarantine('pccet','a'.repeat(64),'test-20261110');
  assert.ok(cmd.includes('flock -n 9'));
  assert.ok(cmd.includes("test \"$FINGERPRINT\" ="));
  assert.ok(cmd.includes('mv -T -- \"$TARGET\" \"$DEST\"'));
  assert.ok(cmd.includes('state=QUARANTINED'));
  assert.ok(cmd.includes("stat -c '%d'"));
  assert.doesNotMatch(cmd, /\brm -rf\b|\bdocker\s+stop\b/);
});
