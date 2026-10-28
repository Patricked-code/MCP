import assert from 'node:assert/strict';
import test from 'node:test';
import { composeUniversalAutonomyAdvice } from '../src/provisioning/universalAutonomyAdvice.js';
import type { CandidateDispatchInput } from '../src/governedContext/candidateContinuity.js';
import type { GithubInstallationObservation } from '../src/github/installationCapabilityReadiness.js';
import type { PleskSubdomainInput } from '../src/provisioning/pleskSite.js';

const sha = '48a529889517aa1c11974802d23acc3f35e0f187';
const now = '2026-10-28T04:30:00.000Z';
const candidate: CandidateDispatchInput = {
  candidateSessionId: 'session-chatgpt',
  agentIdentity: 'ChatGPT',
  activeClaims: [],
  workItems: [
    { workItemId: 'discover', intentKeys: ['github'], title: 'Discover permissions', status: 'DONE',
      priority: 100, sequence: 1, dependencies: [], collisionDomains: ['github:read'] },
    { workItemId: 'deploy', intentKeys: ['deploy'], title: 'Propose deploy', status: 'READY',
      priority: 80, sequence: 2, dependencies: ['discover'], collisionDomains: ['project:demo', 's1:demo'] }
  ]
};
const githubObservation: GithubInstallationObservation = {
  source: 'GITHUB_API',
  installationId: 173915815,
  accountLogin: 'chainsolutions-wealthtech',
  repositorySelection: 'all',
  repositoryIncluded: null,
  repositoryAccessible: true,
  permissions: { contents: 'write' },
  observedAt: '2026-10-28T04:29:30.000Z'
};
const subdomain: PleskSubdomainInput = {
  serverId: 's1', parentDomain: 'wealthtechinnovations.com',
  label: 'pilot', documentRoot: '/pilot',
  evidence: {
    parentExists: true, targetExists: false,
    documentRootExists: false, subscriptionAuthorized: true,
    documentRootSafe: true, targetOwnedByProvisioner: false
  }
};
const base = () => ({
  at: now,
  candidate,
  github: {
    request: { repository: 'chainsolutions-wealthtech/Regulatory', operation: 'repository.write' as const, now },
    observation: githubObservation
  },
  exactHeads: { githubMain: sha, serverCheckout: sha, runtimeRevision: sha },
  target: { mode: 'NO_INFRA_CHANGE' as const }
});

test('RED autonomy: propose eligible candidate from existing dispatcher, never claim or write', () => {
  const input = base();
  const before = JSON.stringify(input);
  const advice = composeUniversalAutonomyAdvice(input);
  assert.equal(advice.disposition, 'PROPOSE');
  assert.equal(advice.candidateStatus, 'ASSIGN');
  assert.equal(advice.candidateWorkItemId, 'deploy');
  assert.deepEqual(advice.reasonCodes, []);
  assert.equal(advice.runtimeWriteAuthorized, false);
  assert.equal(advice.claimCreated, false);
  assert.equal(advice.executed, false);
  assert.deepEqual(advice.requiredAuthorities, ['EXISTING_GOVERNED_TASK_SESSION_CLAIM_LOCKS', 'E3_EXACT_CONSENT', 'GITHUB_BRANCH_RULES_AND_CI']);
  assert.equal(JSON.stringify(input), before);
});

test('RED autonomy: own candidate claim can be proposed for continuation without runtime ownership inference', () => {
  const input = base();
  input.candidate.activeClaims.push({
    candidateSessionId: 'session-chatgpt', agentIdentity: 'ChatGPT', workItemId: 'deploy',
    collisionDomains: ['project:demo','s1:demo'], status: 'ACTIVE'
  });
  const advice = composeUniversalAutonomyAdvice(input);
  assert.equal(advice.disposition, 'PROPOSE');
  assert.equal(advice.candidateStatus, 'CONTINUE');
  assert.equal(advice.runtimeWriteAuthorized, false);
});

test('RED autonomy: foreign claim collision and unresolved dependency cannot be bypassed', () => {
  const input = base();
  input.candidate.activeClaims.push({
    candidateSessionId: 'session-other', agentIdentity: 'Claude', workItemId: 'another',
    collisionDomains: ['s1:demo'], status: 'ACTIVE'
  });
  const advice = composeUniversalAutonomyAdvice(input);
  assert.equal(advice.disposition, 'HOLD');
  assert.equal(advice.candidateStatus, 'WAIT');
  assert.ok(advice.reasonCodes.includes('CANDIDATE_WORK_NOT_ELIGIBLE'));
});

test('RED autonomy: unknown or outdated permission observation blocks autonomy', () => {
  for (const obs of [null, {...githubObservation, observedAt: '2026-10-27T04:00:00.000Z'},
    {...githubObservation, permissions: { contents: 'read' as const }}]) {
    const input = base();
    input.github.observation = obs;
    const advice = composeUniversalAutonomyAdvice(input);
    assert.equal(advice.disposition, 'HOLD');
    assert.ok(advice.reasonCodes.includes('GITHUB_PERMISSION_NOT_ATTESTED'));
  }
});

test('RED autonomy: SHA drift/missing evidence blocks every proposed write sequence', () => {
  for (const heads of [
    { githubMain: sha, serverCheckout: 'f'.repeat(40), runtimeRevision: sha },
    { githubMain: sha, serverCheckout: sha, runtimeRevision: null },
    { githubMain: 'invalid', serverCheckout: sha, runtimeRevision: sha }
  ]) {
    const advice = composeUniversalAutonomyAdvice({...base(), exactHeads: heads});
    assert.equal(advice.disposition, 'HOLD');
    assert.ok(advice.reasonCodes.includes('EXACT_HEAD_NOT_ALIGNED'));
    assert.equal(advice.executed, false);
  }
});

test('RED autonomy: Plesk subdomain strategy reuses existing planner, needs explicit live evidence origin', () => {
  const input = {...base(), target: {
    mode: 'SUBDOMAIN' as const, input: subdomain,
    evidenceSource: 'LIVE_PLESK_AND_FILESYSTEM' as const, observedAt: now
  }};
  const advice = composeUniversalAutonomyAdvice(input);
  assert.equal(advice.disposition, 'PROPOSE');
  assert.equal(advice.pleskDecision, 'READY');
  assert.equal(advice.runtimeWriteAuthorized, false);
  assert.ok(advice.requiredAuthorities.includes('PLESK_RUNTIME_ADMISSION'));
});

test('RED autonomy: Plesk unknown, forged or stale preflight fails closed', () => {
  for (const change of [
    { evidenceSource: 'UNVERIFIED' as const, observedAt: now, input: subdomain },
    { evidenceSource: 'LIVE_PLESK_AND_FILESYSTEM' as const, observedAt: '2026-10-27T04:00:00.000Z', input: subdomain },
    { evidenceSource: 'LIVE_PLESK_AND_FILESYSTEM' as const, observedAt: now,
      input: {...subdomain, evidence: {...subdomain.evidence, subscriptionAuthorized: null }} }
  ]) {
    const advice = composeUniversalAutonomyAdvice({...base(), target: {mode:'SUBDOMAIN' as const, ...change}});
    assert.equal(advice.disposition, 'HOLD');
    assert.ok(advice.reasonCodes.includes('PLESK_PREFLIGHT_NOT_ATTESTED'));
  }
});

test('RED autonomy: Regulatory existing-host subpath must not fall back to subdomain', () => {
  const advice = composeUniversalAutonomyAdvice({...base(), target: {
    mode: 'EXISTING_HOST_SUBPATH' as const, host: 'wealthtechinnovations.com', path: '/regulatory'
  }});
  assert.equal(advice.disposition, 'HOLD');
  assert.equal(advice.pleskDecision, null);
  assert.ok(advice.reasonCodes.includes('SUBPATH_ADAPTER_NOT_ATTESTED'));
});

test('RED autonomy: candidate completion never implies whole program production attestation', () => {
  const input = base();
  input.candidate.workItems[1]!.status = 'DONE';
  const advice = composeUniversalAutonomyAdvice(input);
  assert.equal(advice.disposition, 'COMPLETE_CANDIDATE_SET');
  assert.equal(advice.runtimeWriteAuthorized, false);
  assert.equal(advice.executed, false);
});

test('RED autonomy: no alternative escalation path; no tasks or claims can be created here', () => {
  const input = base();
  input.candidate.workItems[1]!.dependencies = ['missing'];
  const advice = composeUniversalAutonomyAdvice(input);
  assert.equal(advice.disposition, 'HOLD');
  assert.ok(advice.nextSafeActions.includes('REOBSERVE_EXISTING_AUTHORITIES'));
  assert.equal(advice.claimCreated, false);
  assert.equal(advice.executed, false);
});
