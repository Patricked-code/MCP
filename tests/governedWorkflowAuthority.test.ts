import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { createGovernedContractSubstrate } from '../src/governedWorkflow/contractSubstrate.js';

async function substrate() {
  const contracts = JSON.parse(await readFile('.mcp/gwc-contracts.json', 'utf8'));
  const graph = JSON.parse(await readFile('.mcp/gwc-workflow-graph.json', 'utf8'));
  return createGovernedContractSubstrate({
    contractsProjection: contracts,
    graphProjection: graph,
    expectedSchemaVersion: 1,
    expectedContractRegistryDigest: contracts.registryDigest,
    expectedGraphRegistryDigest: graph.registryDigest
  });
}

function currentGithub(overrides: Record<string, unknown> = {}) {
  return {
    status: 'CURRENT',
    observedAt: '2026-09-19T08:15:00.000Z',
    mainHead: 'a'.repeat(40),
    workBranch: 'claude/example',
    workBranchHead: 'b'.repeat(40),
    pullRequest: {
      number: 95,
      state: 'open',
      draft: false,
      merged: false,
      base: 'main',
      head: 'claude/example',
      headSha: 'b'.repeat(40),
      author: 'agent',
      updatedAt: '2026-09-19T08:15:00.000Z'
    },
    checks: {
      status: 'completed',
      conclusion: 'success',
      total: 1,
      failed: 0,
      headSha: 'b'.repeat(40),
      exactHead: true,
      required: [],
      requiredSatisfied: true
    },
    reviews: {
      approvals: 0,
      changesRequested: 0,
      unresolvedThreads: 0,
      headSha: 'b'.repeat(40),
      exactHead: true
    },
    ruleset: {
      name: null,
      enforcement: null,
      requiresPullRequest: null,
      requiredStatusChecks: [],
      requiresConversationResolution: null
    },
    ownership: { pullRequestAuthor: 'agent' },
    activity: { lastActivityAt: '2026-09-19T08:15:00.000Z' },
    cache: {
      status: 'REFRESHED',
      observedAt: '2026-09-19T08:15:00.000Z',
      provenance: 'github_api'
    },
    evidence: {
      main: { freshness: 'CURRENT', observedAt: '2026-09-19T08:15:00.000Z', provenance: 'github_api' },
      pullRequest: { freshness: 'CURRENT', observedAt: '2026-09-19T08:15:00.000Z', provenance: 'github_api' },
      checks: { freshness: 'CURRENT', observedAt: '2026-09-19T08:15:00.000Z', provenance: 'github_api' },
      reviews: { freshness: 'CURRENT', observedAt: '2026-09-19T08:15:00.000Z', provenance: 'github_api' },
      ruleset: { freshness: 'CURRENT', observedAt: '2026-09-19T08:15:00.000Z', provenance: 'github_api' }
    },
    reasonCodes: [],
    uncertainties: [],
    error: null,
    ...overrides
  } as any;
}

test('GWC-11 RED: GW-21 emits bounded authority-document evidence from existing digests', async () => {
  const { observeGw21AuthorityDocuments } = await import('../src/governedWorkflow/authority/index.js');
  const result = observeGw21AuthorityDocuments({
    repository: 'Patricked-code/MCP',
    projectId: 'mcp',
    observedAt: '2026-09-19T08:15:00.000Z',
    inventory: {
      status: 'CURRENT',
      ok: true,
      digest: '1'.repeat(64),
      trackedCount: 214
    },
    declaration: {
      digest: '2'.repeat(64),
      canonicalDocumentPaths: ['SUIVI.md', 'TASKS.md'],
      canonicalStateKeys: ['repository', 'branch']
    },
    cartography: {
      digest: '3'.repeat(64),
      registeredToolCount: 123
    }
  }, await substrate());

  assert.equal(result.contract.stepId, 'GW-21');
  assert.equal(result.status, 'SUCCESS');
  assert.equal(result.freshness, 'CURRENT');
  assert.equal(result.authorizationInferred, false);
  assert.equal(result.mutationPerformed, false);
  assert.match(result.evidenceRefs[0]?.digest ?? '', /^[0-9a-f]{64}$/);
  assert.equal(JSON.stringify(result).includes('SUIVI.md'), true);
});

test('GWC-11 GW-21 fails closed on drift and stale authority evidence', async () => {
  const { observeGw21AuthorityDocuments } = await import('../src/governedWorkflow/authority/index.js');
  const base = {
    repository: 'Patricked-code/MCP',
    projectId: 'mcp',
    observedAt: '2026-09-19T08:15:00.000Z',
    declaration: {
      digest: '2'.repeat(64),
      canonicalDocumentPaths: ['SUIVI.md'],
      canonicalStateKeys: ['repository']
    },
    cartography: {
      digest: '3'.repeat(64),
      registeredToolCount: 123
    }
  };

  const drift = observeGw21AuthorityDocuments({
    ...base,
    inventory: { status: 'CURRENT', ok: false, digest: '1'.repeat(64), trackedCount: 214 }
  }, await substrate());
  const stale = observeGw21AuthorityDocuments({
    ...base,
    inventory: { status: 'STALE', ok: true, digest: '1'.repeat(64), trackedCount: 214 }
  }, await substrate());

  assert.equal(drift.status, 'BLOCKED');
  assert.deepEqual(drift.reasonCodes, ['AUTHORITY_DOCUMENT_INVENTORY_DRIFT']);
  assert.equal(stale.status, 'STALE');
  assert.deepEqual(stale.reasonCodes, ['AUTHORITY_DOCUMENT_EVIDENCE_STALE']);
});

test('GWC-11 RED: GW-22 finds only an owner present in existing inventories', async () => {
  const { resolveGw22IntegrationSlot } = await import('../src/governedWorkflow/authority/index.js');
  const result = resolveGw22IntegrationSlot({
    repository: 'Patricked-code/MCP',
    observedAt: '2026-09-19T08:15:00.000Z',
    inventoryStatus: 'CURRENT',
    inventoryDigest: '4'.repeat(64),
    proposal: { kind: 'MODULE', key: 'src/operationalMemory/taskQueue.ts' },
    inventory: {
      modules: ['src/operationalMemory/taskQueue.ts', 'src/liveState/engine.ts'],
      markdown: ['SUIVI.md'],
      tools: [{ name: 'mcp_claim_next_governed_task', surface: 'operational-write' }]
    }
  }, await substrate());

  assert.equal(result.contract.stepId, 'GW-22');
  assert.equal(result.status, 'FOUND');
  assert.equal(result.slot?.ownerKind, 'MODULE');
  assert.equal(result.slot?.ownerKey, 'src/operationalMemory/taskQueue.ts');
  assert.equal(result.slot?.invented, false);
  assert.equal(result.mutationPerformed, false);
});

test('GWC-11 GW-22 returns NONE instead of inventing an integration slot', async () => {
  const { resolveGw22IntegrationSlot } = await import('../src/governedWorkflow/authority/index.js');
  const result = resolveGw22IntegrationSlot({
    repository: 'Patricked-code/MCP',
    observedAt: '2026-09-19T08:15:00.000Z',
    inventoryStatus: 'CURRENT',
    inventoryDigest: '4'.repeat(64),
    proposal: { kind: 'MODULE', key: 'src/does-not-exist/newAuthority.ts' },
    inventory: {
      modules: ['src/operationalMemory/taskQueue.ts'],
      markdown: ['SUIVI.md'],
      tools: []
    }
  }, await substrate());

  assert.equal(result.status, 'NONE');
  assert.equal(result.slot, null);
  assert.deepEqual(result.reasonCodes, ['INTEGRATION_SLOT_NOT_FOUND']);
});

test('GWC-11 RED: GW-23 binds exact current branch SHA to the current step', async () => {
  const { observeGw23ExactGithubBaseline } = await import('../src/governedWorkflow/authority/index.js');
  const result = observeGw23ExactGithubBaseline({
    repository: 'Patricked-code/MCP',
    workBranch: 'claude/example',
    stepStartedAt: '2026-09-19T08:14:59.000Z',
    github: currentGithub()
  }, await substrate());

  assert.equal(result.contract.stepId, 'GW-23');
  assert.equal(result.status, 'SUCCESS');
  assert.equal(result.baseline?.headSha, 'b'.repeat(40));
  assert.equal(result.baseline?.branch, 'claude/example');
  assert.equal(result.evidenceRefs[0]?.binding.headSha, 'b'.repeat(40));
});

test('GWC-11 GW-23 rejects a baseline observed before this step started', async () => {
  const { observeGw23ExactGithubBaseline } = await import('../src/governedWorkflow/authority/index.js');
  const result = observeGw23ExactGithubBaseline({
    repository: 'Patricked-code/MCP',
    workBranch: 'claude/example',
    stepStartedAt: '2026-09-19T08:16:00.000Z',
    github: currentGithub()
  }, await substrate());

  assert.equal(result.status, 'STALE');
  assert.equal(result.baseline, null);
  assert.deepEqual(result.reasonCodes, ['GITHUB_BASELINE_PRE_STEP']);
});

test('GWC-11 GW-23 rejects exact-head contradictions rather than choosing a SHA', async () => {
  const { observeGw23ExactGithubBaseline } = await import('../src/governedWorkflow/authority/index.js');
  const github = currentGithub({
    checks: {
      status: 'completed',
      conclusion: 'success',
      total: 1,
      failed: 0,
      headSha: 'c'.repeat(40),
      exactHead: false,
      required: [],
      requiredSatisfied: true
    }
  });
  const result = observeGw23ExactGithubBaseline({
    repository: 'Patricked-code/MCP',
    workBranch: 'claude/example',
    stepStartedAt: '2026-09-19T08:14:59.000Z',
    github
  }, await substrate());

  assert.equal(result.status, 'CONFLICT');
  assert.equal(result.baseline, null);
  assert.deepEqual(result.reasonCodes, ['GITHUB_BASELINE_HEAD_MISMATCH']);
});


test('GWC-11 self-review: GW-22 rejects stale inventory instead of resolving an owner', async () => {
  const { resolveGw22IntegrationSlot } = await import('../src/governedWorkflow/authority/index.js');
  const result = resolveGw22IntegrationSlot({
    repository: 'Patricked-code/MCP',
    observedAt: '2026-09-19T08:15:00.000Z',
    inventoryStatus: 'STALE',
    inventoryDigest: '4'.repeat(64),
    proposal: { kind: 'MODULE', key: 'src/operationalMemory/taskQueue.ts' },
    inventory: {
      modules: ['src/operationalMemory/taskQueue.ts'],
      markdown: ['SUIVI.md'],
      tools: []
    }
  } as any, await substrate());

  assert.equal(result.status, 'STALE');
  assert.equal(result.slot, null);
  assert.deepEqual(result.reasonCodes, ['INTEGRATION_SLOT_INVENTORY_STALE']);
  assert.equal(result.freshness, 'STALE');
});

test('GWC-11 self-review: GW-23 rejects stale exact-head sub-evidence', async () => {
  const { observeGw23ExactGithubBaseline } = await import('../src/governedWorkflow/authority/index.js');
  const base = currentGithub();
  const github = currentGithub({
    evidence: {
      ...base.evidence,
      pullRequest: {
        ...base.evidence.pullRequest,
        freshness: 'STALE'
      },
      checks: {
        ...base.evidence.checks,
        freshness: 'STALE'
      }
    }
  });
  const result = observeGw23ExactGithubBaseline({
    repository: 'Patricked-code/MCP',
    workBranch: 'claude/example',
    stepStartedAt: '2026-09-19T08:14:59.000Z',
    github
  }, await substrate());

  assert.equal(result.status, 'STALE');
  assert.equal(result.baseline, null);
  assert.deepEqual(result.reasonCodes, ['GITHUB_BASELINE_EVIDENCE_STALE']);
});
