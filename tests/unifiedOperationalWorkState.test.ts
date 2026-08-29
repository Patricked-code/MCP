import assert from 'node:assert/strict';
import test from 'node:test';

import {
  deriveCapabilityReality,
  deriveGovernanceDecision,
  deriveTaskReality
} from '../src/governance/operationalDecision.js';

const OBSERVED_AT = '2026-08-29T02:00:00.000Z';

test('registered tool remains callability UNKNOWN without transport/client attestation', () => {
  const reality = deriveCapabilityReality({
    toolName: 'mcp_transition_governed_task',
    registered: true,
    authorized: { status: 'TRUE' },
    governanceSafe: true,
    observedAt: OBSERVED_AT,
    provenance: ['runtime_catalogue']
  });

  assert.equal(reality.registered, true);
  assert.deepEqual(reality.callability, { status: 'UNKNOWN', source: 'SERVER' });
  assert.equal(reality.authorized.status, 'TRUE');
  assert.equal(reality.safeNow, false);
  assert.ok(reality.reasonCodes.includes('CALLABILITY_UNATTESTED'));
  assert.deepEqual(reality.provenance, ['runtime_catalogue']);
});

test('client/transport attestation can prove a registered tool is not callable', () => {
  const reality = deriveCapabilityReality({
    toolName: 'mcp_claim_next_governed_task',
    registered: true,
    callability: { status: 'NOT_CALLABLE', source: 'CLIENT_ATTESTATION' },
    authorized: { status: 'TRUE' },
    governanceSafe: true,
    observedAt: OBSERVED_AT,
    provenance: ['runtime_catalogue', 'chatgpt_connector_snapshot']
  });

  assert.equal(reality.callability.status, 'NOT_CALLABLE');
  assert.equal(reality.safeNow, false);
  assert.ok(reality.reasonCodes.includes('CLIENT_OR_TRANSPORT_ACTION_NOT_EXPOSED'));
});

test('task reality reports declared state behind verified operational evidence', () => {
  const reality = deriveTaskReality({
    declaredStatus: 'READY',
    evidence: {
      githubWorkStateAvailable: true,
      pullRequestMerged: true,
      ciExactHeadSuccess: true,
      deploymentExactShaSuccess: true,
      runtimeAligned: true,
      documentationAligned: true
    },
    observedAt: OBSERVED_AT
  });

  assert.equal(reality.observedPhase, 'VERIFIED');
  assert.equal(reality.drift, 'TASK_STATE_BEHIND_REALITY');
  assert.deepEqual(reality.recommendedLifecyclePath, [
    'READY', 'CLAIMED', 'IN_PROGRESS', 'REVIEW', 'MERGE_READY', 'DEPLOYING', 'VERIFYING', 'DONE'
  ]);
});

test('task reality reports declared state ahead when completion evidence is incomplete', () => {
  const reality = deriveTaskReality({
    declaredStatus: 'DONE',
    evidence: {
      githubWorkStateAvailable: true,
      pullRequestMerged: false,
      ciExactHeadSuccess: false,
      deploymentExactShaSuccess: false,
      runtimeAligned: true,
      documentationAligned: true
    },
    observedAt: OBSERVED_AT
  });

  assert.equal(reality.drift, 'TASK_STATE_AHEAD_OF_REALITY');
  assert.notEqual(reality.observedPhase, 'VERIFIED');
});

test('governance decision fails closed only when the operation requires unavailable GitHub evidence', () => {
  const capability = deriveCapabilityReality({
    toolName: 'github.merge',
    registered: true,
    callability: { status: 'CALLABLE', source: 'CLIENT_ATTESTATION' },
    authorized: { status: 'TRUE' },
    governanceSafe: true,
    observedAt: OBSERVED_AT,
    provenance: ['client_attestation']
  });

  const mergeDecision = deriveGovernanceDecision({
    operation: 'github.merge',
    capabilityReality: capability,
    sessionPresent: true,
    bootstrapCurrent: true,
    lockConflicts: 0,
    githubWorkStateAvailable: false,
    requiresGithubWorkState: true,
    requiredEvidence: ['github_work_state'],
    observedAt: OBSERVED_AT
  });
  assert.equal(mergeDecision.mayMutate, false);
  assert.ok(mergeDecision.reasonCodes.includes('GITHUB_WORK_STATE_UNAVAILABLE'));

  const independentDecision = deriveGovernanceDecision({
    operation: 'runtime.read_attestation',
    capabilityReality: capability,
    sessionPresent: true,
    bootstrapCurrent: true,
    lockConflicts: 0,
    githubWorkStateAvailable: false,
    requiresGithubWorkState: false,
    requiredEvidence: [],
    observedAt: OBSERVED_AT
  });
  assert.equal(independentDecision.mayMutate, true);
  assert.equal(independentDecision.reasonCodes.includes('GITHUB_WORK_STATE_UNAVAILABLE'), false);
});

test('GitHub work state exposes exact-head, required checks, ownership, activity, freshness and cache provenance', async () => {
  process.env.MCP_AUTH_TOKEN ??= 'mcp-unit-test-value-20260805-abcdef';
  process.env.S1_HOST ??= '127.0.0.1';
  process.env.S1_KEY_PATH ??= '/tmp/mcp-unit-test-s1-key';
  process.env.S2_HOST ??= '127.0.0.1';
  process.env.S2_KEY_PATH ??= '/tmp/mcp-unit-test-s2-key';
  const { createGithubOperationalContextCollector } = await import('../src/governedContext/github.js');
  const sha = 'a'.repeat(40);
  const branch = 'mcp/unified-operational-work-state-20260829';
  const json = (value: unknown) => new Response(JSON.stringify(value), {
    status: 200,
    headers: { 'content-type': 'application/json' }
  });
  const fetchImpl: typeof fetch = async (input) => {
    const url = String(input);
    if (url.endsWith('/commits/main')) return json({ sha });
    if (url.includes('/pulls?')) return json([{
      number: 55,
      state: 'open',
      draft: true,
      merged_at: null,
      base: { ref: 'main' },
      head: { ref: branch, sha },
      user: { login: 'task-owner' },
      updated_at: '2026-08-29T02:00:00Z'
    }]);
    if (url.includes('/check-runs?')) return json({
      head_sha: sha,
      total_count: 3,
      check_runs: [
        { name: 'validate', status: 'completed', conclusion: 'success' },
        { name: 'security', status: 'completed', conclusion: 'success' },
        { name: 'optional', status: 'in_progress', conclusion: null }
      ]
    });
    if (url.includes('/reviews?')) return json([]);
    if (url.endsWith('/graphql')) return json({
      data: { repository: { pullRequest: { reviewThreads: { nodes: [] } } } }
    });
    if (url.includes('/rulesets?')) return json([{ id: 42, name: 'main-protection', enforcement: 'active' }]);
    if (url.endsWith('/rulesets/42')) return json({
      id: 42,
      name: 'main-protection',
      enforcement: 'active',
      rules: [
        { type: 'pull_request' },
        {
          type: 'required_status_checks',
          parameters: { required_status_checks: [{ context: 'validate' }, { context: 'security' }] }
        },
        { type: 'required_conversation_resolution' }
      ]
    });
    return new Response(JSON.stringify({ message: 'unexpected' }), { status: 500 });
  };
  const collector = createGithubOperationalContextCollector({
    fetchImpl,
    readToken: async () => 'bounded-test-token',
    apiBase: 'https://api.github.test',
    allowedHosts: 'api.github.test',
    now: () => new Date(OBSERVED_AT),
    cacheTtlMs: 15_000
  });

  const refreshed = await collector.collect(branch);
  assert.equal(refreshed.workBranchHead, sha);
  assert.deepEqual(refreshed.ownership, { pullRequestAuthor: 'task-owner' });
  assert.deepEqual(refreshed.activity, { lastActivityAt: OBSERVED_AT });
  assert.equal(refreshed.checks.headSha, sha);
  assert.equal(refreshed.checks.exactHead, true);
  assert.equal(refreshed.checks.requiredSatisfied, true);
  assert.deepEqual(refreshed.checks.required, [
    { context: 'validate', status: 'completed', conclusion: 'success' },
    { context: 'security', status: 'completed', conclusion: 'success' }
  ]);
  assert.equal(refreshed.cache.status, 'REFRESHED');
  assert.equal(refreshed.cache.provenance, 'github_api');
  assert.equal(refreshed.evidence.main.freshness, 'CURRENT');
  assert.equal(refreshed.evidence.checks.freshness, 'CURRENT');
  assert.equal(refreshed.evidence.checks.provenance, 'github_api');

  const cached = await collector.collect(branch);
  assert.equal(cached.cache.status, 'HIT');
  assert.equal(cached.cache.provenance, 'memory_cache');
  assert.equal(cached.workBranchHead, sha);

  const current = await collector.getCurrent(branch);
  assert.equal(current.cache.status, 'HIT');

  const forced = await collector.reconcileExplicit(branch);
  assert.equal(forced.cache.status, 'REFRESHED');
});

test('GitHub cache miss remains explicit and bounded', async () => {
  process.env.MCP_AUTH_TOKEN ??= 'mcp-unit-test-value-20260805-abcdef';
  process.env.S1_HOST ??= '127.0.0.1';
  process.env.S1_KEY_PATH ??= '/tmp/mcp-unit-test-s1-key';
  process.env.S2_HOST ??= '127.0.0.1';
  process.env.S2_KEY_PATH ??= '/tmp/mcp-unit-test-s2-key';
  const { createGithubOperationalContextCollector } = await import('../src/governedContext/github.js');
  const collector = createGithubOperationalContextCollector({
    fetchImpl: async () => { throw new Error('must not fetch'); },
    readToken: async () => 'must-not-be-read',
    apiBase: 'https://api.github.test',
    allowedHosts: 'api.github.test',
    now: () => new Date(OBSERVED_AT)
  });
  const miss = await collector.getCurrent('mcp/uncached-work');
  assert.equal(miss.status, 'UNAVAILABLE');
  assert.equal(miss.error, 'github_cache_miss');
  assert.equal(miss.cache.status, 'MISS');
  assert.equal(miss.cache.provenance, 'memory_cache');
  assert.equal(miss.evidence.pullRequest.freshness, 'UNAVAILABLE');
});
