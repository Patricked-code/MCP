import assert from 'node:assert/strict';
import test from 'node:test';
process.env.MCP_AUTH_TOKEN ??= 'mcp-unit-test-value-20260805-abcdef';
process.env.S1_HOST ??= '127.0.0.1';
process.env.S1_KEY_PATH ??= '/tmp/mcp-unit-test-s1-key';
process.env.S2_HOST ??= '127.0.0.1';
process.env.S2_KEY_PATH ??= '/tmp/mcp-unit-test-s2-key';
const { parseAllowedPleskParents } = await import('../src/tools/pleskProvisioning.js');

test('Plesk policy RED: empty config does not allow any parent', () => {
  assert.deepEqual(parseAllowedPleskParents(''), {s1:[],s2:[]});
});

test('Plesk policy RED: explicit domain entries are assigned to the correct server', () => {
  assert.deepEqual(parseAllowedPleskParents('s1:wealthtechinnovations.com,s2:chainsolutions.fr'), {
    s1:['wealthtechinnovations.com'],s2:['chainsolutions.fr']
  });
});

test('Plesk policy RED: malformed or arbitrary directives fail closed', () => {
  for(const s of ['all','*:chainsolutions.fr','s3:chainsolutions.fr','s2:chainsolutions.fr;rm','s2:localhost','s2:chainsolutions.fr,s2:chainsolutions.fr','s1:foo..com']) {
    assert.throws(()=>parseAllowedPleskParents(s), /PLESK_ALLOWED_PARENTS_INVALID/);
  }
});
