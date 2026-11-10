import assert from 'node:assert/strict';
import test from 'node:test';
process.env.MCP_AUTH_TOKEN ??= 'mcp-test-only-credential-20261110-no-secret';
process.env.S1_HOST ??= '127.0.0.1';
process.env.S2_HOST ??= '127.0.0.1';
process.env.S1_KEY_PATH ??= '/tmp/unused-s1';
process.env.S2_KEY_PATH ??= '/tmp/unused-s2';
const { S2_LEAF_TARGETS, buildS2LeafProbe, buildS2LeafQuarantine,
  parseS2LeafInspection, assertS2OperatorApproval,
  assertS2BootstrapCurrent, assertS2OwnedCleanupTask,
  assertS2FreshAlignedState, assertS2LeaseWindow } =
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
  const cmd = buildS2LeafQuarantine('pccet','a'.repeat(64),'test-20261110',Date.now()+300_000);
  assert.ok(cmd.includes('flock -n 9'));
  assert.ok(cmd.includes("test \"$FINGERPRINT\" ="));
  assert.ok(cmd.includes('mv -T -- \"$TARGET\" \"$DEST\"'));
  assert.ok(cmd.includes('state=QUARANTINED'));
  assert.ok(cmd.includes("stat -c '%d'"));
  assert.doesNotMatch(cmd, /\brm -rf\b|\bdocker\s+stop\b/);
});

test('configuration errors cannot be mistaken for a Plesk no-match', () => {
  const probe = buildS2LeafProbe('pccet');
  assert.match(probe, /CONFIG_SCAN_RC=\$\?/);
  assert.match(probe, /test "\$CONFIG_SCAN_RC" = 1 \|\| exit 50/);
  assert.doesNotMatch(probe, /if grep -RFq/);
});
test('fingerprint incorporates regular-file contents as well as metadata', () => {
  const probe = buildS2LeafProbe('evote');
  assert.match(probe, /CONTENT_HASH=/);
  assert.match(probe, /-type f -exec sha256sum -- \{\} \+/);
  assert.match(probe, /META_HASH=/);
  assert.match(probe, /"\$META_HASH" "\$CONTENT_HASH"/);
});
test('quarantine must be a root-owned private mode-0700 directory', () => {
  const cmd = buildS2LeafQuarantine('evote','a'.repeat(64),'test-fixed',Date.now()+300_000);
  assert.match(cmd, /umask 077/);
  assert.match(cmd, /mkdir -p -m 0700/);
  assert.match(cmd, /stat -c '%u'/);
  assert.match(cmd, /stat -c '%a'/);
  assert.match(cmd, /\$QBASE.*700/);
  assert.match(cmd, /\$QROOT.*700/);
});
test('bootstrap receipt is required, owned, current and not expired', () => {
  const good = { governedSessionId:'owner-session', repository:'repo/test',
    status:'ACKNOWLEDGED', stateVersion:42, expiresAt:'2099-01-01T00:00:00.000Z' };
  assert.doesNotThrow(() => assertS2BootstrapCurrent(good,'owner-session','repo/test',42));
  for(const invalid of [null,{...good,governedSessionId:'foreign'},
    {...good,stateVersion:41},{...good,expiresAt:'2020-01-01T00:00:00.000Z'}]){
    assert.throws(() => assertS2BootstrapCurrent(invalid,'owner-session','repo/test',42),
      /S2_CLEANUP_BOOTSTRAP_NOT_CURRENT/);
  }
});
test('cleanup needs exact owned IN_PROGRESS task with complete dependencies', () => {
  const base = {taskId:'TASK-20261110-101', ownerGovernedSessionId:'owner-session',
    repository:'repo/test',status:'IN_PROGRESS',
    resourceScopes:['resource:s2-cleanup/evote'],dependencies:[] };
  assert.doesNotThrow(() => assertS2OwnedCleanupTask('evote','owner-session','repo/test',[base]));
  for(const invalid of [[],[{...base,status:'READY'}],
      [{...base,ownerGovernedSessionId:'other'}],
      [{...base,resourceScopes:['resource:s2-cleanup/pccet']}],
      [{...base,repository:'other/repo'}]]){
    assert.throws(() => assertS2OwnedCleanupTask('evote','owner-session','repo/test',invalid),
      /S2_CLEANUP_CLAIMED_TASK_MISSING/);
  }
  assert.throws(() => assertS2OwnedCleanupTask('evote','owner-session','repo/test',
      [{...base,dependencies:['TASK-20261110-100']}]),/S2_CLEANUP_TASK_DEPENDENCY_INCOMPLETE/);
  assert.throws(() => assertS2OwnedCleanupTask('evote','owner-session','repo/test',
      [base,{...base,taskId:'TASK-20261110-102',ownerGovernedSessionId:'other'}]),
      /S2_CLEANUP_TASK_SCOPE_CONFLICT/);
});

test('Plesk domain list is checked without SIGPIPE/pipefail false absence', () => {
  const probe = buildS2LeafProbe('evote');
  assert.match(probe, /grep -Fx -- "\$DOMAIN" <<< "\$DOMAINS" >\/dev\/null/);
  assert.match(probe, /test "\$DOMAIN_MATCH_RC" = 1 \|\| exit 47/);
  assert.doesNotMatch(probe, /\|\s*grep -Fxq/);
});
test('aligned but stale Live State is never sufficient for quarantine', () => {
  assert.doesNotThrow(() => assertS2FreshAlignedState(
    { alignment: { global:'FULLY_ALIGNED' }, freshness:'CURRENT', stateVersion:17 },17));
  for (const state of [null,
    { alignment: { global:'FULLY_ALIGNED' }, freshness:'STALE', stateVersion:17 },
    { alignment: { global:'DIVERGENCE' }, freshness:'CURRENT', stateVersion:17 },
    { alignment: { global:'FULLY_ALIGNED' }, freshness:'CURRENT', stateVersion:16 }
  ]) {
    assert.throws(() => assertS2FreshAlignedState(state,17), /S2_CLEANUP_LIVE_STATE_NOT_ALIGNED/);
  }
});
test('remote move is gated by remaining lease before and after long preflight', () => {
  const at = Date.now();
  assert.doesNotThrow(() => assertS2LeaseWindow(at+200_000,at));
  assert.throws(() => assertS2LeaseWindow(at+129_000,at), /S2_CLEANUP_LOCK_LEASE_TOO_SHORT/);
  const cmd = buildS2LeafQuarantine('pccet','a'.repeat(64),'lease-test',at+300_000);
  assert.match(cmd, /SERVER_NOW="\$\(date \+%s\)"/);
  assert.match(cmd, /SERVER_CLOCK="\$\(date \+%s\)"/);
  assert.match(cmd, /test "\$SERVER_NOW" -lt/);
  assert.match(cmd, /mv -T -- "\$TARGET" "\$DEST"/);
  assert.ok(cmd.indexOf('SERVER_NOW=') < cmd.indexOf('mv -T --'));
});
