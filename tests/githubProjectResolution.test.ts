import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveGithubProject } from '../src/github/projectResolution.js';

const observedAt = '2026-09-15T03:30:00.000Z';

function repository(overrides: Record<string, unknown> = {}) {
  return {
    status: 'RESOLVED',
    observedAt,
    requestedRepositoryContext: 'Wealthtechinnovations/api_opcv',
    selectionSource: 'connection_context',
    selectedAccountContext: { owner: 'Wealthtechinnovations', type: 'organization' },
    selectedRepository: {
      repositoryId: 'github:Wealthtechinnovations/api_opcv',
      githubRepositoryId: 123,
      owner: 'Wealthtechinnovations',
      ownerType: 'organization',
      name: 'api_opcv',
      fullName: 'Wealthtechinnovations/api_opcv',
      defaultBranch: 'claude/code-review-improvements-ikvuj',
      visibility: 'private',
      archived: false,
      fork: false
    },
    candidates: [],
    candidateCount: 1,
    freshness: 'CURRENT',
    provenance: ['github_identity', 'connection_context', 'github_api:get_repository'],
    reasonCodes: [],
    uncertainties: [],
    registryDigest: 'registry-digest',
    ...overrides
  };
}

function registry(overrides: Record<string, unknown> = {}) {
  return {
    available: true,
    sourceSchemaVersion: 1,
    digest: 'registry-digest',
    candidateDigest: 'candidate-digest',
    mappings: [{
      mappingId: 'github:Wealthtechinnovations/api_opcv:s2:africafunds_api',
      repositoryId: 'github:Wealthtechinnovations/api_opcv',
      projectId: 'chainsolutions.africafunds',
      projectUid: 'CS-AFRICAFUNDS-001',
      componentRole: 'API'
    }],
    projects: [{
      projectId: 'chainsolutions.africafunds',
      projectUid: 'CS-AFRICAFUNDS-001',
      name: 'AfricaFunds',
      kind: 'MULTI_REPOSITORY_APPLICATION',
      repositoryComponents: [{
        repositoryId: 'github:Wealthtechinnovations/api_opcv',
        mappingId: 'github:Wealthtechinnovations/api_opcv:s2:africafunds_api',
        role: 'API'
      }]
    }],
    activationReadiness: [{
      mappingId: 'github:Wealthtechinnovations/api_opcv:s2:africafunds_api',
      status: 'BLOCKED',
      reasonCodes: ['REPOSITORY_CREDENTIAL_UNVERIFIED']
    }],
    ...overrides
  };
}

test('C2 résout repositoryId → mappingId → projectId sans confondre activation readiness et identité', () => {
  const result = resolveGithubProject({
    repository: repository() as any,
    registry: registry() as any,
    observedAt
  });

  assert.equal(result.status, 'RESOLVED');
  assert.equal(result.selectedMapping?.mappingId, 'github:Wealthtechinnovations/api_opcv:s2:africafunds_api');
  assert.equal(result.selectedProject?.projectId, 'chainsolutions.africafunds');
  assert.equal(result.selectedProject?.projectUid, 'CS-AFRICAFUNDS-001');
  assert.equal(result.selectedMapping?.activationReadiness, 'BLOCKED');
  assert.deepEqual(result.selectedMapping?.activationReasonCodes, ['REPOSITORY_CREDENTIAL_UNVERIFIED']);
  assert.deepEqual(result.reasonCodes, []);
});

test('C2 retourne NONE quand le repository résolu ne possède aucun mapping', () => {
  const result = resolveGithubProject({
    repository: repository() as any,
    registry: registry({ mappings: [], activationReadiness: [] }) as any,
    observedAt
  });
  assert.equal(result.status, 'NONE');
  assert.equal(result.selectedMapping, null);
  assert.deepEqual(result.reasonCodes, ['GITHUB_PROJECT_MAPPING_NOT_FOUND']);
});

test('C2 retourne AMBIGUOUS quand plusieurs mappingId correspondent au même repositoryId', () => {
  const first = (registry() as any).mappings[0];
  const second = {
    ...first,
    mappingId: 'github:Wealthtechinnovations/api_opcv:s2:other',
    projectId: 'chainsolutions.other',
    projectUid: 'CS-OTHER-001',
    componentRole: 'API'
  };
  const result = resolveGithubProject({
    repository: repository() as any,
    registry: registry({
      mappings: [first, second],
      projects: [],
      activationReadiness: []
    }) as any,
    observedAt
  });
  assert.equal(result.status, 'AMBIGUOUS');
  assert.equal(result.candidateCount, 2);
  assert.deepEqual(result.reasonCodes, ['GITHUB_PROJECT_MAPPING_AMBIGUOUS']);
});

test('C2 propage un repository AMBIGUOUS sans inventer de projectId', () => {
  const result = resolveGithubProject({
    repository: repository({
      status: 'AMBIGUOUS',
      selectedRepository: null,
      freshness: 'UNKNOWN'
    }) as any,
    registry: registry() as any,
    observedAt
  });
  assert.equal(result.status, 'AMBIGUOUS');
  assert.equal(result.selectedProject, null);
  assert.deepEqual(result.reasonCodes, ['GITHUB_PROJECT_REPOSITORY_AMBIGUOUS']);
});

test('C2 reste UNVERIFIED si B2 n est pas une preuve RESOLVED CURRENT', () => {
  const result = resolveGithubProject({
    repository: repository({
      status: 'UNVERIFIED',
      selectedRepository: null,
      freshness: 'UNKNOWN'
    }) as any,
    registry: registry() as any,
    observedAt
  });
  assert.equal(result.status, 'UNVERIFIED');
  assert.deepEqual(result.reasonCodes, ['GITHUB_PROJECT_REPOSITORY_UNVERIFIED']);
});

test('C2 reste UNVERIFIED si une fiche projet présente contredit le mapping', () => {
  const inconsistent = (registry() as any).projects[0];
  const result = resolveGithubProject({
    repository: repository() as any,
    registry: registry({
      projects: [{
        ...inconsistent,
        repositoryComponents: []
      }]
    }) as any,
    observedAt
  });
  assert.equal(result.status, 'UNVERIFIED');
  assert.deepEqual(result.reasonCodes, ['GITHUB_PROJECT_REFERENCE_UNVERIFIED']);
});

test('C2 préserve le cas historique MCP en résolvant projectId depuis le mapping même sans fiche projects', () => {
  const result = resolveGithubProject({
    repository: repository({
      requestedRepositoryContext: 'Patricked-code/MCP',
      selectedAccountContext: { owner: 'Patricked-code', type: 'user' },
      selectedRepository: {
        repositoryId: 'github:Patricked-code/MCP',
        githubRepositoryId: 1285534440,
        owner: 'Patricked-code',
        ownerType: 'user',
        name: 'MCP',
        fullName: 'Patricked-code/MCP',
        defaultBranch: 'main',
        visibility: 'public',
        archived: false,
        fork: false
      }
    }) as any,
    registry: registry({
      mappings: [{
        mappingId: 'mcp-s1-production',
        repositoryId: 'github:Patricked-code/MCP',
        projectId: 'mcp_bridge',
        projectUid: null,
        componentRole: null
      }],
      projects: [],
      activationReadiness: [{
        mappingId: 'mcp-s1-production',
        status: 'BLOCKED',
        reasonCodes: ['MAPPING_PATH_UNVERIFIED']
      }]
    }) as any,
    observedAt
  });
  assert.equal(result.status, 'RESOLVED');
  assert.equal(result.selectedMapping?.mappingId, 'mcp-s1-production');
  assert.equal(result.selectedProject?.projectId, 'mcp_bridge');
  assert.equal(result.selectedProject?.projectUid, null);
  assert.equal(result.selectedProject?.name, null);
  assert.equal(result.selectedProject?.kind, null);
  assert.equal(result.selectedMapping?.activationReadiness, 'BLOCKED');
});

test('C2 ne projette aucune permission, credential ou capacité de déploiement', () => {
  const serialized = JSON.stringify(resolveGithubProject({
    repository: repository() as any,
    registry: registry() as any,
    observedAt
  }));
  for (const forbidden of ['permissions', 'grants', 'credentialRef', 'serverPath', 'mayWrite', 'mayDeploy', 'deployEnabled']) {
    assert.equal(serialized.includes(forbidden), false);
  }
});
