import assert from 'node:assert/strict';
import test from 'node:test';

import { applyFreshness, reconcileLiveState } from '../src/liveState/reconcile.js';
import type { LiveStateObservations, LiveStateSnapshot } from '../src/liveState/types.js';

const NOW = new Date('2026-08-09T12:00:00.000Z');

function observations(): LiveStateObservations {
  return {
    repository: 'Patricked-code/MCP',
    github: {
      status: 'CURRENT',
      branch: 'main',
      head: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
    },
    s1: {
      status: 'CURRENT',
      path: '/opt/apps/wealthtech-mcp-ssh-bridge',
      branch: 'main',
      head: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      originMain: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      workingTreeClean: true,
      diffEmpty: true,
      fetchRemote: 'git@github.com-mcp-patricked-ro:Patricked-code/MCP.git',
      pushRemote: 'disabled://mcp-s1-read-only'
    },
    runtime: {
      status: 'CURRENT',
      container: 'wealthtech_mcp_ssh_bridge',
      containerStatus: 'running',
      health: 'healthy',
      imageId: 'sha256:image',
      revision: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
    },
    documentation: {
      status: 'CURRENT',
      activeTask: null,
      declaredGithubSha: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      declaredS1Sha: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      drift: false
    }
  };
}

test('GitHub, S1 et runtime égaux produisent FULLY_ALIGNED', () => {
  const state = reconcileLiveState(observations(), null, NOW);
  assert.equal(state.alignment.githubVsS1, 'ALIGNED');
  assert.equal(state.alignment.runtime, 'ALIGNED');
  assert.equal(state.alignment.documentation, 'ALIGNED');
  assert.equal(state.alignment.global, 'FULLY_ALIGNED');
  assert.equal(state.stateVersion, 1);
});

test('un runtime running mais health starting ne peut pas être FULLY_ALIGNED', () => {
  const input = observations();
  input.runtime.health = 'starting';
  const state = reconcileLiveState(input, null, NOW);
  assert.equal(state.alignment.githubVsS1, 'ALIGNED');
  assert.equal(state.alignment.runtime, 'ALIGNED');
  assert.equal(state.alignment.global, 'PARTIALLY_ALIGNED');
  assert.equal(state.nextAction, 'wait_for_runtime_health');
});

test('un nouveau main GitHub non présent sur S1 produit DEPLOYMENT_PENDING', () => {
  const input = observations();
  input.github.head = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
  const state = reconcileLiveState(input, null, NOW);
  assert.equal(state.alignment.githubVsS1, 'DRIFTED');
  assert.equal(state.alignment.global, 'DEPLOYMENT_PENDING');
});

test('GitHub et S1 alignés mais runtime ancien produit RUNTIME_DEPLOYMENT_PENDING', () => {
  const input = observations();
  input.runtime.revision = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
  const state = reconcileLiveState(input, null, NOW);
  assert.equal(state.alignment.runtime, 'DRIFTED');
  assert.equal(state.alignment.global, 'RUNTIME_DEPLOYMENT_PENDING');
});

test('une révision runtime absente reste explicitement UNVERIFIED', () => {
  const input = observations();
  input.runtime.revision = null;
  const state = reconcileLiveState(input, null, NOW);
  assert.equal(state.alignment.runtime, 'RUNTIME_UNVERIFIED');
  assert.notEqual(state.alignment.global, 'FULLY_ALIGNED');
});

test('un working tree S1 sale impose RECONCILIATION_REQUIRED', () => {
  const input = observations();
  input.s1.workingTreeClean = false;
  const state = reconcileLiveState(input, null, NOW);
  assert.equal(state.alignment.global, 'RECONCILIATION_REQUIRED');
  assert.ok(state.contradictions.includes('S1_WORKTREE_DIRTY'));
});

test('un désaccord documentaire produit DOCUMENTATION_DRIFT', () => {
  const input = observations();
  input.documentation.drift = true;
  input.documentation.declaredGithubSha = 'cccccccccccccccccccccccccccccccccccccccc';
  const state = reconcileLiveState(input, null, NOW);
  assert.equal(state.alignment.documentation, 'DOCUMENTATION_DRIFT');
  assert.equal(state.alignment.global, 'RECONCILIATION_REQUIRED');
  assert.ok(state.contradictions.includes('DOCUMENTATION_DRIFT'));
  assert.equal(state.nextAction, 'reconcile_canonical_documentation');
});

test('une source obligatoire indisponible dégrade le verdict', () => {
  const input = observations();
  input.github = { status: 'UNAVAILABLE', branch: 'main', head: null, error: 'github unavailable' };
  const state = reconcileLiveState(input, null, NOW);
  assert.equal(state.alignment.global, 'DEGRADED');
  assert.notEqual(state.alignment.global, 'FULLY_ALIGNED');
});

test('stateVersion ne change pas si seules les dates de collecte changent', () => {
  const first = reconcileLiveState(observations(), null, NOW);
  const second = reconcileLiveState(observations(), first, new Date('2026-08-09T12:00:30.000Z'));
  assert.equal(first.stateVersion, 1);
  assert.equal(second.stateVersion, 1);
  assert.notEqual(first.lastReconciledAt, second.lastReconciledAt);
});

test('stateVersion augmente lorsqu’un état significatif change', () => {
  const first = reconcileLiveState(observations(), null, NOW);
  const changed = observations();
  changed.runtime.health = 'unhealthy';
  const second = reconcileLiveState(changed, first, new Date('2026-08-09T12:00:10.000Z'));
  assert.equal(second.stateVersion, 2);
});

test('stateVersion augmente quand un digest current-state change mais pas pour une projection identique', () => {
  const firstInput = observations();
  firstInput.capabilities = {
    status: 'CURRENT',
    catalogueDigest: 'a'.repeat(64),
    registeredToolCount: 92,
    readOnlyToolCount: 80,
    writeToolCount: 12,
    resourceCount: 1,
    tools: [],
    resources: [],
    contradictions: []
  };
  const first = reconcileLiveState(firstInput, null, NOW);
  const same = reconcileLiveState(firstInput, first, new Date('2026-08-09T12:00:10.000Z'));
  const changedInput = structuredClone(firstInput);
  changedInput.capabilities.catalogueDigest = 'b'.repeat(64);
  const changed = reconcileLiveState(changedInput, same, new Date('2026-08-09T12:00:20.000Z'));

  assert.equal(same.stateVersion, 1);
  assert.equal(changed.stateVersion, 2);
});

test('applyFreshness marque STALE après maxAgeSeconds', () => {
  const state = reconcileLiveState(observations(), null, NOW);
  const fresh = applyFreshness(state, new Date('2026-08-09T12:00:30.000Z'));
  const stale = applyFreshness(state, new Date('2026-08-09T12:01:01.000Z'));
  assert.equal(fresh.freshness, 'CURRENT');
  assert.equal(stale.freshness, 'STALE');
  assert.equal(stale.ageSeconds, 61);
});

void (null as unknown as LiveStateSnapshot);
