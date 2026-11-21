import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assessMissionIdentityCrosswalk,
  type MissionIdentityCrosswalkInput
} from '../src/registryFederation/missionIdentityCrosswalk.js';

const SHA = 'ee6bc30ff911b3e5dfb2e3e76caa2e9ca1700024';
const repo = 'github:Patricked-code/MCP';
const uid = 'WT-PROJECT-MCP-001';
const mappingId = 'mcp-s1-production';

function fixture(): MissionIdentityCrosswalkInput {
  return {
    observedAt: '2026-11-21T23:37:28.778Z',
    document: {
      continuityId: 'WT-MCP-REGISTRY-RESOLUTION-20261121-01',
      projectUid: uid,
      repositoryId: repo,
      sourceCommitSha: SHA,
      evidenceRef: 'https://github.com/Patricked-code/MCP/blob/' + SHA + '/docs/mission.md'
    },
    registry: {
      available: true,
      sourceSchemaVersion: 2,
      digest: 'raw-registry-snapshot',
      candidateDigest: 'candidate-v2',
      projects: [{
        projectId: 'mcp_bridge', projectUid: uid, name: 'MCP',
        kind: 'software', globalCheckpointRepositoryId: repo,
        centralGovernanceRepositoryId: repo,
        repositoryComponents: [{ repositoryId: repo, mappingId, role: 'core' }]
      }]
    },
    projectResolution: {
      status: 'RESOLVED',
      freshness: 'CURRENT',
      repositoryId: repo,
      registryDigest: 'raw-registry-snapshot',
      candidateDigest: 'candidate-v2',
      selectedMapping: {
        mappingId, repositoryId: repo, projectId: 'mcp_bridge',
        projectUid: uid, componentRole: 'core',
        activationReadiness: 'READY', activationReasonCodes: []
      },
      selectedProject: {
        projectId: 'mcp_bridge', projectUid: uid, name: 'MCP',
        kind: 'software'
      }
    }
  };
}

test('consistent documentary/project binding remains read-only and non-authoritative', () => {
  const result = assessMissionIdentityCrosswalk(fixture());
  assert.equal(result.status, 'CONSISTENT');
  assert.equal(result.matchedProjectId, 'mcp_bridge');
  assert.equal(result.documentaryProjectUid, uid);
  assert.equal(result.authorizationInferred, false);
  assert.equal(result.mutationPerformed, false);
  assert.deepEqual(result.reasonCodes, []);
});

test('historical V1 migration, no ProjectRecord and unready mapping are never promoted', () => {
  const base = fixture();
  const input: MissionIdentityCrosswalkInput = {
    ...base,
    registry: { ...base.registry, sourceSchemaVersion: 1, projects: [] },
    projectResolution: {
      ...base.projectResolution,
      selectedProject: { projectId: 'mcp_bridge', projectUid: null, name: null, kind: null },
      selectedMapping: {
        ...base.projectResolution.selectedMapping!,
        projectUid: null, activationReadiness: 'BLOCKED',
        governance: {
          officialBranch: 'main', allowedBranchPrefixes: [],
          directMainPush: false, status: 'migration_pending',
          capabilities: {
            inventory: true, readFiles: true, searchCode: true, readLogs: false,
            gitStatus: true, writeFiles: false, createBranch: false, commit: false,
            pushBranch: false, build: false, deploy: false, rollback: false,
            quarantine: false, purge: false
          },
          backupRequired: true, rollbackMethod: null, candidateFromV1: true
        }
      }
    }
  };
  const result = assessMissionIdentityCrosswalk(input);
  assert.equal(result.status, 'UNVERIFIED');
  assert.ok(result.reasonCodes.includes('PROJECT_RECORD_MISSING'));
  assert.ok(result.reasonCodes.includes('GITREGISTRY_V1_CANDIDATE_NOT_ACTIVE'));
  assert.ok(result.reasonCodes.includes('PROJECT_MAPPING_NOT_READY'));
  assert.equal(result.authorizationInferred, false);
});

test('documentary UID conflicts with a ProjectRecord instead of silently binding an alias', () => {
  const base = fixture();
  const result = assessMissionIdentityCrosswalk({
    ...base,
    document: { ...base.document, projectUid: 'OTHER-PROJECT-001' }
  });
  assert.equal(result.status, 'CONFLICT');
  assert.ok(result.reasonCodes.includes('DOCUMENTARY_PROJECT_UID_CONFLICT'));
});

test('wrong repository identity refuses the mapping, including plausible aliases', () => {
  const base = fixture();
  const result = assessMissionIdentityCrosswalk({
    ...base,
    document: { ...base.document, repositoryId: 'github:chainsolutions-wealthtech/MCP' }
  });
  assert.equal(result.status, 'CONFLICT');
  assert.ok(result.reasonCodes.includes('MISSION_REPOSITORY_ID_MISMATCH'));
  assert.ok(result.reasonCodes.includes('PROJECT_MAPPING_REPOSITORY_MISMATCH'));
});

test('stale or ambiguous project resolution never becomes a project grant', () => {
  const base = fixture();
  const status = assessMissionIdentityCrosswalk({
    ...base,
    projectResolution: {
      ...base.projectResolution, status: 'AMBIGUOUS', selectedMapping: null
    }
  });
  assert.equal(status.status, 'CONFLICT');
  assert.ok(status.reasonCodes.includes('GITHUB_PROJECT_MAPPING_AMBIGUOUS'));
});

test('candidate digest mismatch blocks evidence from different registry snapshots', () => {
  const base = fixture();
  const status = assessMissionIdentityCrosswalk({
    ...base,
    projectResolution: { ...base.projectResolution, candidateDigest: 'other-v2' }
  });
  assert.equal(status.status, 'CONFLICT');
  assert.ok(status.reasonCodes.includes('GITREGISTRY_CANDIDATE_CONFLICT'));
});

test('document not sourced to a commit cannot be counted as verified', () => {
  const base = fixture();
  const status = assessMissionIdentityCrosswalk({
    ...base,
    document: { ...base.document, sourceCommitSha: 'branch-main', evidenceRef: '' }
  });
  assert.equal(status.status, 'UNVERIFIED');
  assert.ok(status.reasonCodes.includes('MISSION_DOCUMENT_PROVENANCE_UNVERIFIED'));
  assert.equal(status.sourceCommitSha, null);
});

test('missing project component or mapping UID remains unverified', () => {
  const base = fixture();
  const status = assessMissionIdentityCrosswalk({
    ...base,
    projectResolution: {
      ...base.projectResolution,
      selectedMapping: { ...base.projectResolution.selectedMapping!, projectUid: null }
    },
    registry: {
      ...base.registry,
      projects: base.registry.projects.map(p => ({ ...p, repositoryComponents: [] }))
    }
  });
  assert.equal(status.status, 'UNVERIFIED');
  assert.ok(status.reasonCodes.includes('PROJECT_MAPPING_UID_UNVERIFIED'));
  assert.ok(status.reasonCodes.includes('PROJECT_COMPONENT_BINDING_UNVERIFIED'));
});

test('deterministic replay does not write, mutate, create tasks or vary reasons', () => {
  const input = fixture();
  const before = JSON.stringify(input);
  const one = assessMissionIdentityCrosswalk(input);
  const two = assessMissionIdentityCrosswalk(input);
  assert.deepEqual(one, two);
  assert.equal(JSON.stringify(input), before);
  assert.ok(Object.isFrozen(one));
  assert.ok(Object.isFrozen(one.reasonCodes));
});
