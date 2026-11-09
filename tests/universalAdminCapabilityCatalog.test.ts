import assert from 'node:assert/strict';
import test from 'node:test';
import {
  UNIVERSAL_ADMIN_CAPABILITIES,
  UNIVERSAL_ADMIN_CAPABILITY_COUNT,
  findUniversalAdminCapability,
  assessDelegatedAdminCapability
} from '../src/provisioning/universalAdminCapabilityCatalog.js';

const now = '2026-10-28T04:40:00.000Z';
function proof(source: 'GITHUB_API'|'PLESK_API'|'SERVER_ATTESTATION'|'GOVERNED_RUNTIME', permission: string, scope: string) {
  return { source, principalId: 'authenticated-admin-delegation', scope, observedAt: now,
    availablePermissionHints: [permission], resourceAccessible: true };
}
test('universal capability matrix covers all four planes with unique, bounded IDs', () => {
  assert.ok(UNIVERSAL_ADMIN_CAPABILITY_COUNT >= 150);
  assert.equal(UNIVERSAL_ADMIN_CAPABILITIES.length, UNIVERSAL_ADMIN_CAPABILITY_COUNT);
  assert.equal(new Set(UNIVERSAL_ADMIN_CAPABILITIES.map(c=>c.id)).size, UNIVERSAL_ADMIN_CAPABILITY_COUNT);
  assert.deepEqual([...new Set(UNIVERSAL_ADMIN_CAPABILITIES.map(c=>c.plane))].sort(),
    ['github','intelligence','plesk','server']);
  assert.ok(UNIVERSAL_ADMIN_CAPABILITIES.every(c=>c.id.startsWith(c.plane+'.')
    && c.permissionHint.length > 0 && ['low','medium','high','critical'].includes(c.risk)));
});

test('catalogue includes owner/admin-like GitHub, Plesk, Linux and autonomous planning goals', () => {
  for (const id of [
    'github.repository.create', 'github.repository.delete', 'github.organization.members.manage',
    'github.enterprise.policies.manage', 'github.actions.secrets.manage',
    'plesk.subscription.create', 'plesk.domain.create', 'plesk.host.subpath.provision',
    'plesk.database.restore','plesk.tls.certificate.manage','plesk.mail.box.manage',
    'server.system.patch','server.network.firewall.manage','server.docker.container.manage',
    'server.database.restore','server.application.rollback',
    'intelligence.continuity.resume','intelligence.plan.compose','intelligence.agent.coordinate'
  ]) assert.ok(findUniversalAdminCapability(id), id);
});

test('fresh and exact-scope GitHub admin permission is only observed, never admitted', () => {
  const id = 'github.repository.delete';
  const scope = 'github:chainsolutions-wealthtech/Regulatory';
  const r = assessDelegatedAdminCapability({ id, expectedScope: scope, observedAt: now,
    evidence: proof('GITHUB_API','administration:write',scope) });
  assert.equal(r.status, 'PERMISSION_OBSERVED_NOT_ADMITTED');
  assert.equal(r.runtimeWriteAuthorized, false);
  assert.equal(r.operationExecuted, false);
});

test('never borrow GitHub permissions for Plesk or Unix root', () => {
  for (const [id, scope, permission] of [
    ['plesk.subscription.create','plesk:s1:wealthtechinnovations.com','plesk:admin'],
    ['server.users.manage','server:s1','server:privileged']
  ]) {
    const r = assessDelegatedAdminCapability({ id, expectedScope: scope, observedAt: now,
      evidence: proof('GITHUB_API',permission,scope) });
    assert.equal(r.status, 'BLOCKED');
    assert.ok(r.reasonCodes.includes('AUTHORITY_SOURCE_MISMATCH'));
    assert.equal(r.runtimeWriteAuthorized, false);
  }
});

test('Plesk and server trusted sources may be observed only on exact target scope', () => {
  const cases = [
    ['plesk.domain.create','PLESK_API','plesk:admin','plesk:s1:wealthtechinnovations.com'],
    ['server.system.patch','SERVER_ATTESTATION','server:privileged','server:s2']
  ] as const;
  for(const [id,source,permission,scope] of cases) {
    const r = assessDelegatedAdminCapability({ id, expectedScope: scope, observedAt: now,
      evidence: proof(source, permission,scope) });
    assert.equal(r.status, 'PERMISSION_OBSERVED_NOT_ADMITTED');
    assert.equal(r.operationExecuted,false);
  }
});

test('fail closed on missing evidence, stale observation, mismatched scope, permission or nonexistent ID', () => {
  const id = 'github.repository.create';
  const scope = 'github:Patricked-code/MCP';
  const cases = [
    { evidence: null, reason:'EVIDENCE_MISSING' },
    { evidence: proof('GITHUB_API','contents:write',scope), reason:'DELEGATED_PERMISSION_MISSING' },
    { evidence: proof('GITHUB_API','administration:write','github:other/repo'), reason:'SCOPE_NOT_ATTESTED' },
    { evidence: {...proof('GITHUB_API','administration:write',scope),observedAt:'2026-10-28T01:00:00.000Z'}, reason:'EVIDENCE_STALE' },
    { evidence: {...proof('GITHUB_API','administration:write',scope),resourceAccessible:false}, reason:'SCOPE_NOT_ATTESTED' }
  ];
  for(const c of cases) {
    const r=assessDelegatedAdminCapability({id,expectedScope:scope,observedAt:now,evidence:c.evidence});
    assert.equal(r.status,'BLOCKED');
    assert.ok(r.reasonCodes.includes(c.reason),JSON.stringify(r.reasonCodes));
  }
  assert.ok(assessDelegatedAdminCapability({id:'server.unknown.operation', expectedScope:scope,
    observedAt:now,evidence:proof('GITHUB_API','contents:write',scope)}).reasonCodes.includes('CAPABILITY_UNKNOWN'));
});
