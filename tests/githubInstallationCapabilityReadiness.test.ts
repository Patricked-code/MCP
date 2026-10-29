import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assessGithubInstallationCapability,
  type GithubCapabilityRequest,
  type GithubInstallationObservation
} from '../src/github/installationCapabilityReadiness.js';

const now = '2026-10-28T04:30:00.000Z';
const repository = 'chainsolutions-wealthtech/Regulatory';
const verified: GithubInstallationObservation = {
  source: 'GITHUB_API',
  installationId: 173915815,
  accountLogin: 'chainsolutions-wealthtech',
  repositorySelection: 'all',
  repositoryIncluded: null,
  repositoryAccessible: true,
  permissions: { contents: 'write', pull_requests: 'write', actions: 'write', administration: 'read' },
  observedAt: '2026-10-28T04:29:30.000Z'
};
const request = (operation: GithubCapabilityRequest['operation'], repo = repository): GithubCapabilityRequest =>
  ({ repository: repo, operation, now });

test('RED: recent installation and verified contents:write provide observed repo read/write coverage, NOT admission', () => {
  for (const operation of ['repository.read', 'repository.write'] as const) {
    const r = assessGithubInstallationCapability(request(operation), verified);
    assert.equal(r.status, 'PERMISSION_OBSERVED');
    assert.deepEqual(r.reasonCodes, []);
    assert.equal(r.runtimeWriteAuthorized, false);
  }
});

test('RED: every operation requires its own GitHub App permission', () => {
  for (const [operation, permission] of [
    ['pull_request.create', 'pull_requests:write'],
    ['pull_request.merge', 'contents:write'],
    ['actions.dispatch', 'actions:write']
  ] as const) {
    const r = assessGithubInstallationCapability(request(operation), verified);
    assert.equal(r.status, 'PERMISSION_OBSERVED');
    assert.deepEqual(r.requiredPermissions, [permission]);
  }
  const admin = assessGithubInstallationCapability(request('repository.admin'), verified);
  assert.equal(admin.status, 'BLOCKED');
  assert.ok(admin.reasonCodes.includes('PERMISSION_MISSING'));
});

test('RED: insufficient permission must not be elevated or inherited from another permission', () => {
  const readOnly = { ...verified, permissions: { contents: 'read' as const, pull_requests: 'read' as const } };
  assert.equal(assessGithubInstallationCapability(request('repository.read'), readOnly).status, 'PERMISSION_OBSERVED');
  assert.ok(assessGithubInstallationCapability(request('repository.write'), readOnly).reasonCodes.includes('PERMISSION_MISSING'));
  assert.ok(assessGithubInstallationCapability(request('pull_request.create'), readOnly).reasonCodes.includes('PERMISSION_MISSING'));
  assert.ok(assessGithubInstallationCapability(request('actions.dispatch'), readOnly).reasonCodes.includes('PERMISSION_MISSING'));
});

test('RED: selected repositories need explicit inclusion, all repositories still require verified visibility', () => {
  const selected = { ...verified, repositorySelection: 'selected' as const };
  assert.ok(assessGithubInstallationCapability(request('repository.read'), selected).reasonCodes.includes('REPOSITORY_NOT_ATTESTED'));
  assert.equal(assessGithubInstallationCapability(request('repository.read'), { ...selected, repositoryIncluded: true }).status, 'PERMISSION_OBSERVED');
  assert.ok(assessGithubInstallationCapability(request('repository.read'), { ...verified, repositoryAccessible: false }).reasonCodes.includes('REPOSITORY_NOT_ATTESTED'));
});

test('RED: refuse cross-account installation, unknown installation and stale/future evidence', () => {
  assert.ok(assessGithubInstallationCapability(request('repository.read','Patricked-code/MCP'), verified).reasonCodes.includes('ACCOUNT_MISMATCH'));
  assert.ok(assessGithubInstallationCapability(request('repository.read'), { ...verified, source: 'UNVERIFIED' }).reasonCodes.includes('UNVERIFIED_INSTALLATION'));
  assert.ok(assessGithubInstallationCapability(request('repository.read'), { ...verified, installationId: 0 }).reasonCodes.includes('UNVERIFIED_INSTALLATION'));
  assert.ok(assessGithubInstallationCapability(request('repository.read'), { ...verified, observedAt: '2026-10-28T03:00:00.000Z' }).reasonCodes.includes('STALE_OBSERVATION'));
  assert.ok(assessGithubInstallationCapability(request('repository.read'), { ...verified, observedAt: '2026-10-28T05:00:00.000Z' }).reasonCodes.includes('STALE_OBSERVATION'));
  assert.ok(assessGithubInstallationCapability(request('repository.read'), null).reasonCodes.includes('MISSING_OBSERVATION'));
});

test('RED: malformed repository, unknown operation and forged permission never yield coverage', () => {
  for (const repo of ['../MCP', 'chainsolutions-wealthtech/', 'chainsolutions-wealthtech/Regulatory/other','chainsolutions-wealthtech/Regulatory;id']) {
    assert.ok(assessGithubInstallationCapability(request('repository.read', repo), verified).reasonCodes.includes('INVALID_TARGET'));
  }
  assert.equal(assessGithubInstallationCapability(request('unknown' as GithubCapabilityRequest['operation']), verified).status, 'BLOCKED');
  assert.equal(assessGithubInstallationCapability(request('repository.admin'), { ...verified, permissions: {administration:'admin' as never} }).status, 'BLOCKED');
});


test('FINDING-02: selected GitHub installation evidence cannot be reused for another repo on same account',()=>{
  const selected={...verified,repositorySelection:'selected' as const,
    repositoryIncluded:true,repository:'chainsolutions-wealthtech/Regulatory'};
  assert.equal(assessGithubInstallationCapability(request('repository.read'),selected).status,'PERMISSION_OBSERVED');
  const forged=assessGithubInstallationCapability(request('repository.write','chainsolutions-wealthtech/Other'),selected);
  assert.equal(forged.status,'BLOCKED');
  assert.ok(forged.reasonCodes.includes('REPOSITORY_NOT_ATTESTED'));
  assert.equal(assessGithubInstallationCapability(request('repository.read'),{...selected,repository:''}).status,'BLOCKED');
});
