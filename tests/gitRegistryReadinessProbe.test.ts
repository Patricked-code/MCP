import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { once } from 'node:events';
import { readFile } from 'node:fs/promises';
import type { AddressInfo } from 'node:net';
import express from 'express';
import test from 'node:test';

import { createGithubReadonlyEvidenceRouter } from '../src/evidence/githubReadonlyRoutes.js';
import { projectGitRegistryReadinessEvidence } from '../src/evidence/gitRegistryReadinessProbe.js';
import type { GitRegistryProjectEvidence } from '../src/github/registry.js';

const SHA = 'e'.repeat(40);
const PROBE = 'mcp_git_registry_readiness';

function evidence(overrides: Partial<GitRegistryProjectEvidence> = {}): GitRegistryProjectEvidence {
  return {
    available: true,
    sourceSchemaVersion: 1,
    digest: 'a'.repeat(64),
    candidateDigest: 'b'.repeat(64),
    mappings: [
      {
        mappingId: 'mcp-s1-production',
        repositoryId: 'github:Example-Owner/private-repo',
        projectId: 'project-secret-name',
        projectUid: 'uid-1',
        componentRole: 'application'
      },
      {
        mappingId: 'other-s2-production',
        repositoryId: 'github:Example-Owner/other',
        projectId: 'project-other',
        projectUid: null,
        componentRole: null
      }
    ],
    projects: [{
      projectId: 'project-secret-name',
      projectUid: 'uid-1',
      name: 'Confidential Project Name',
      kind: 'internal',
      repositoryComponents: [{
        repositoryId: 'github:Example-Owner/private-repo',
        mappingId: 'mcp-s1-production',
        role: 'application'
      }]
    }],
    activationReadiness: [
      {
        mappingId: 'mcp-s1-production',
        status: 'BLOCKED',
        reasonCodes: ['MAPPING_PATH_UNVERIFIED', 'REPOSITORY_CREDENTIAL_UNVERIFIED']
      },
      { mappingId: 'other-s2-production', status: 'READY', reasonCodes: [] }
    ],
    ...overrides
  };
}

test('registry readiness projection keeps reason codes and digests but no names, paths or repository identifiers', () => {
  const output = projectGitRegistryReadinessEvidence(evidence());
  const body = JSON.parse(output);

  assert.equal(body.schemaVersion, 1);
  assert.equal(body.authority, 'GitRegistry V2');
  assert.equal(body.mutationAllowed, false);
  assert.equal(body.available, true);
  assert.equal(body.sourceSchemaVersion, 1);
  assert.equal(body.registryDigest, 'a'.repeat(64));
  assert.equal(body.candidateDigest, 'b'.repeat(64));
  assert.deepEqual(body.counts, { mappings: 2, projects: 1, ready: 1, blocked: 1 });
  assert.equal(body.truncated, false);
  assert.deepEqual(body.reasonCodeTotals, {
    MAPPING_PATH_UNVERIFIED: 1,
    REPOSITORY_CREDENTIAL_UNVERIFIED: 1
  });
  assert.deepEqual(body.mappings[0], {
    mappingId: 'mcp-s1-production',
    repositoryIdDigest: createHash('sha256')
      .update('github:example-owner/private-repo')
      .digest('hex'),
    status: 'BLOCKED',
    reasonCodes: ['MAPPING_PATH_UNVERIFIED', 'REPOSITORY_CREDENTIAL_UNVERIFIED']
  });

  for (const leaked of [
    'Example-Owner',
    'private-repo',
    'project-secret-name',
    'Confidential Project Name',
    'uid-1'
  ]) {
    assert.equal(output.includes(leaked), false, leaked);
  }
});

test('unsafe mapping identifiers are replaced by a digest and unavailable registries fail closed', () => {
  const unsafe = evidence({
    activationReadiness: [{
      mappingId: '/opt/apps/secret path',
      status: 'BLOCKED',
      reasonCodes: ['MAPPING_STATUS_NOT_VALIDATED']
    }]
  });
  const body = JSON.parse(projectGitRegistryReadinessEvidence(unsafe));
  assert.equal(body.mappings[0].mappingId, null);
  assert.match(body.mappings[0].mappingIdDigest, /^[0-9a-f]{64}$/);
  assert.equal(JSON.stringify(body).includes('/opt/apps'), false);
  assert.equal(body.mappings[0].repositoryIdDigest, null);

  const unavailable = JSON.parse(projectGitRegistryReadinessEvidence(evidence({
    available: false,
    sourceSchemaVersion: null,
    digest: null,
    candidateDigest: null,
    mappings: [],
    projects: [],
    activationReadiness: []
  })));
  assert.equal(unavailable.available, false);
  assert.equal(unavailable.reasonCode, 'GIT_REGISTRY_UNAVAILABLE');
  assert.deepEqual(unavailable.mappings, []);
});

test('registry readiness projection is bounded and reports truncation', () => {
  const many = Array.from({ length: 250 }, (_, index) => ({
    mappingId: `mapping-${index}`,
    status: 'BLOCKED' as const,
    reasonCodes: ['MAPPING_REMOTE_UNVERIFIED' as const]
  }));
  const output = projectGitRegistryReadinessEvidence(evidence({ activationReadiness: many }));
  const body = JSON.parse(output);
  assert.equal(body.truncated, true);
  assert.equal(body.mappings.length, 200);
  assert.equal(body.counts.blocked, 250);
  assert.ok(Buffer.byteLength(output, 'utf8') <= 32_768);
});

async function withServer(
  dependencies: Parameters<typeof createGithubReadonlyEvidenceRouter>[0],
  fn: (baseUrl: string) => Promise<void>
): Promise<void> {
  const app = express();
  app.use(createGithubReadonlyEvidenceRouter(dependencies));
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address() as AddressInfo;
  try {
    await fn(`http://127.0.0.1:${address.port}`);
  } finally {
    server.close();
    await once(server, 'close');
  }
}

function request(baseUrl: string, target: 's1' | 's2') {
  return fetch(`${baseUrl}/evidence/github/readonly`, {
    method: 'POST',
    headers: { authorization: 'Bearer valid-oidc', 'content-type': 'application/json' },
    body: JSON.stringify({ sha: SHA, target, probe: PROBE, requestId: `registry-${target}-001` })
  });
}

test('registry readiness probe is S1-only, OIDC-gated and never uses the SSH command runner', async () => {
  let shellReads = 0;
  let registryReads = 0;
  const dependencies = {
    verifyOidc: async (token: string, sha: string) => {
      if (token !== 'valid-oidc' || sha !== SHA) throw new Error('oidc_invalid');
      return { sha, event_name: 'workflow_dispatch', run_id: '1' };
    },
    runRead: async () => {
      shellReads += 1;
      return { code: 0, stdout: 'unexpected', stderr: '' };
    },
    runRegistryRead: async () => {
      registryReads += 1;
      return projectGitRegistryReadinessEvidence(evidence());
    }
  };

  await withServer(dependencies, async (baseUrl) => {
    const response = await request(baseUrl, 's1');
    assert.equal(response.status, 200);
    const body = await response.json() as Record<string, unknown>;
    assert.equal(body.probe, PROBE);
    assert.equal(body.mutationAllowed, false);
    assert.match(String(body.output), /"authority":"GitRegistry V2"/);

    assert.equal((await request(baseUrl, 's2')).status, 400);
  });

  await withServer({ ...dependencies, runRegistryRead: undefined }, async (baseUrl) => {
    const response = await request(baseUrl, 's1');
    assert.equal(response.status, 502);
    assert.deepEqual(await response.json(), {
      error: 'readonly_evidence_collection_failed',
      reasonCode: 'read_transport_failed'
    });
  });

  assert.equal(shellReads, 0);
  assert.equal(registryReads, 1);
});

test('workflow, policy and server wire the registry readiness probe without an SSH path', async () => {
  const workflow = await readFile('.github/workflows/mcp-readonly-evidence.yml', 'utf8');
  const policy = JSON.parse(await readFile('.mcp/github-first-operational-policy.json', 'utf8'));
  const server = await readFile('src/server.ts', 'utf8');
  const mode = policy.executionModes.GITHUB_ACTION_READONLY_EVIDENCE;

  assert.match(workflow, /- mcp_git_registry_readiness\n/);
  assert.match(workflow, /'mcp_governed_locks','mcp_git_registry_readiness'\]\.includes\(request\.probe\)/);
  assert.match(workflow, /\['mcp_governed_tasks','mcp_governed_sessions','mcp_governed_locks','mcp_git_registry_readiness'\]\.includes\(request\.probe\) && request\.target !== 's1'/);
  assert.match(workflow, /mcp_governed_tasks\|mcp_governed_sessions\|mcp_governed_locks\|mcp_git_registry_readiness\)/);
  assert.doesNotMatch(workflow, /mcp-git-registry\.json/);

  assert.deepEqual(mode.registryEvidenceProbes, [PROBE]);
  assert.equal(mode.registryEvidenceOutputPolicy.repositoryIdentifiersAllowed, false);
  assert.equal(mode.registryEvidenceOutputPolicy.serverPathsAllowed, false);
  assert.equal(mode.registryEvidenceOutputPolicy.credentialReferencesAllowed, false);
  assert.equal(mode.registryEvidenceOutputPolicy.sshFallback, 'FAIL_CLOSED_OIDC_ENDPOINT_REQUIRED');

  assert.match(server, /runRegistryRead/);
  assert.match(server, /projectGitRegistryReadinessEvidence\(await readGitRegistryProjectEvidence\(\)\)/);
});
