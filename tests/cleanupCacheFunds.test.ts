import assert from 'node:assert/strict';
import test from 'node:test';

// Isolated test placeholders; no production key, SSH, or server interaction.
process.env.MCP_AUTH_TOKEN ??= 'ci-placeholder-only-not-a-real-credential';
process.env.S1_HOST ??= '127.0.0.1';
process.env.S2_HOST ??= '127.0.0.1';
process.env.S1_KEY_PATH ??= '/tmp/unused-cache-preflight-test-s1';
process.env.S2_KEY_PATH ??= '/tmp/unused-cache-preflight-test-s2';

const {
  parseFundsCachePreflight, FUNDS_CACHE_PREFLIGHT_COMMAND, FUNDS_LEGACY_CACHE
} = await import('../src/tools/cleanupCacheFunds.js');

function observation(overrides: Record<string, string> = {}) {
  const fields: Record<string, string> = {
    base_real: '/var/www/vhosts/chainsolutions.fr',
    app_real: '/var/www/vhosts/chainsolutions.fr/Funds.chainsolutions.fr/front_end_opcvm',
    cache_real: '/var/www/vhosts/chainsolutions.fr/Funds.chainsolutions.fr/front_end_opcvm/.next/cache',
    app_present: 'true',
    cache_present: 'true',
    any_symlink: 'false',
    cache_bytes: '393154093',
    manifest_present: 'true',
    build_id_present: 'false',
    ...overrides
  };
  return Object.entries(fields).map(([k, v]) => k + '=' + v).join('\n') + '\n';
}

test('valid observation still denies cleanup', () => {
  const result = parseFundsCachePreflight(observation(), 0);
  assert.equal(result.status, 'INSPECTED_NEEDS_RUNTIME_PROOF');
  assert.equal(result.candidateSizeBytes, 393154093);
  assert.equal(result.selectedPath, FUNDS_LEGACY_CACHE);
  assert.equal(result.deletionAllowed, false);
  assert.equal(result.quarantineAllowed, false);
  assert.equal(result.writesPerformed, false);
});

test('symlink escape is blocked, no matter the measured size', () => {
  const result = parseFundsCachePreflight(observation({ cache_real: '/etc', any_symlink: 'true' }), 0);
  assert.equal(result.status, 'BLOCKED_SYMLINK_OR_ESCAPE');
  assert.equal(result.candidateSizeBytes, null);
});

test('absent cache is not a cleanup operation', () => {
  const result = parseFundsCachePreflight(observation({
    cache_real: '', cache_present: 'false', cache_bytes: '0'
  }), 0);
  assert.equal(result.status, 'CACHE_ABSENT');
  assert.equal(result.deletionAllowed, false);
});

test('malformed, duplicated or failed observations fail closed', () => {
  for (const [payload, exit] of [
    [observation() + 'cache_bytes=1\n', 0],
    [observation({ cache_bytes: '-5' }), 0],
    [observation({ any_symlink: 'maybe' }), 0],
    [observation(), 1],
    [observation().replace('cache_real=', 'cache_path='), 0],
    [observation() + '...[sortie plafonnée par le MCP]', 0]
  ] as const) {
    const result = parseFundsCachePreflight(payload, exit);
    assert.equal(result.status, 'UNVERIFIED');
    assert.equal(result.deletionAllowed, false);
  }
});

test('fixed probe has no write, purge, restart or arbitrary path input', () => {
  assert.ok(FUNDS_CACHE_PREFLIGHT_COMMAND.includes("BASE='/var/www/vhosts/chainsolutions.fr'"));
  assert.ok(FUNDS_CACHE_PREFLIGHT_COMMAND.includes('du -sb'));
  assert.ok(!/\brm\b|\bmv\b|\btruncate\b|\bsystemctl\b|\btee\b/.test(FUNDS_CACHE_PREFLIGHT_COMMAND));
});
