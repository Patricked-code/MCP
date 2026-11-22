import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildMissionContinuityReadProjection,
  type MissionContinuityReadInput,
  type ContinuityEvidence
} from '../src/registryFederation/missionContinuityReadProjection.js';
import {
  buildFederatedRegistryProjection, federatedIdentityKey
} from '../src/registryFederation/projection.js';

const SHA = '7f0ae4d35daec8d85a430b5280abd16eda6a42c8';
const ID = 'WT-MCP-REGISTRY-RESOLUTION-20261121-01';
const CHILD = 'WT-MCP-AUTONOMY-24X7-20261121-01';
const observedAt = '2026-11-22T02:00:00.000Z';

const evidence = (reference: string, verification: ContinuityEvidence['verification'] = 'VERIFIED'): ContinuityEvidence => ({
  authority: 'GITHUB', reference, observedAt,
  sourceCommitSha: SHA, verification
});

function fixture(id = ID): MissionContinuityReadInput {
  return {
    continuityId: id,
    parentContinuityId: id === CHILD ? ID : null,
    projectUid: 'WT-PROJECT-MCP-001',
    repositoryId: 'github:Patricked-code/MCP',
    ownerScope: id,
    observedAt,
    sourceCommitSha: SHA,
    identityCrosswalk: null, // V1 cannot be promoted from documentary UID.
    federation: null,
    documents: [{
      ownerContinuityId: id, documentType: 'MISSION',
      path: 'docs/projects/WT-PROJECT-MCP-001/chantiers/' + id + '/' + id + '__MISSION.md',
      inherited: false, evidence: evidence('github:blob:' + id + ':MISSION')
    }],
    timeline: [
      {
        eventId: 'E01', ownerContinuityId: id, kind: 'MANDATE',
        occurredAt: '2026-11-21T20:34:00.000Z',
        description: 'Original R01-R07, RG-001..056', predecessorId: null,
        evidence: evidence('https://github.com/Patricked-code/MCP/pull/430#issuecomment-7068870350')
      },
      {
        eventId: 'E02', ownerContinuityId: id, kind: 'CHECKPOINT',
        occurredAt: '2026-11-22T00:07:00.000Z',
        description: 'G1 attestation for P2 lot, not mission certification',
        predecessorId: 'E01', evidence: evidence('https://github.com/Patricked-code/MCP/pull/430#issuecomment-7071333389')
      }
    ],
    workPackages: [
      {workPackageId: 'REG-WP-01', ownerContinuityId: id, status: 'DONE', dependsOn: [], evidence: evidence('git:REG-WP-01')},
      {workPackageId: 'REG-WP-02', ownerContinuityId: id, status: 'IN_PROGRESS', dependsOn: ['REG-WP-01'], evidence: evidence('git:REG-WP-02')}
    ],
    taskBindings: [],
    candidateActions: [{
      actionId: 'P2-GITREGISTRY-READ', ownerContinuityId: id,
      workPackageId: 'REG-WP-02', description: 'Verify GitRegistry and CUG coverage in read-only mode',
      priority: 1, mode: 'READ_ONLY',
      evidence: evidence('github:checkpoint:p2')
    }]
  };
}

test('cold read projection restores historical checkpoint, work and safe P2 next step without ProjectRecord alias', () => {
  const result = buildMissionContinuityReadProjection(fixture());
  assert.equal(result.continuityId, ID);
  assert.equal(result.schemaVersion, 1);
  assert.equal(result.projectId, null);
  assert.equal(result.verificationStatus, 'UNVERIFIED');
  assert.ok(result.blockers.includes('PROJECT_BINDING_NOT_ATTESTED'));
  assert.deepEqual(result.historicalTimeline.map(x => x.eventId), ['E01', 'E02']);
  assert.equal(result.latestVerifiedCheckpoint?.eventId, 'E02');
  assert.equal(result.nextActionCurrent?.readiness, 'READ_ONLY_READY');
  assert.equal(result.resumeReadiness, 'READ_ONLY_READY');
  assert.equal(result.authorizationInferred, false);
  assert.equal(result.mutationPerformed, false);
  assert.equal(result.liveState, null);
});

test('a child mission has its own NEXT_ACTION and excludes parent records, never inherits tasks implicitly', () => {
  const base = fixture(CHILD);
  const input: MissionContinuityReadInput = {
    ...base,
    documents: [...base.documents, ...fixture(ID).documents],
    timeline: [...base.timeline, ...fixture(ID).timeline],
    candidateActions: [...base.candidateActions, ...fixture(ID).candidateActions]
  };
  const result = buildMissionContinuityReadProjection(input);
  assert.equal(result.parentContinuityId, ID);
  assert.equal(result.documentationIndex.length, 1);
  assert.equal(result.historicalTimeline.length, 2);
  assert.equal(result.nextActionCurrent?.ownerContinuityId, undefined);
  assert.ok(result.blockers.includes('FOREIGN_DOCUMENT_EXCLUDED'));
  assert.ok(result.blockers.includes('FOREIGN_EVENT_EXCLUDED'));
  assert.ok(result.blockers.includes('FOREIGN_ACTION_EXCLUDED'));
});

test('different owners cannot swap their task identities across scopes', () => {
  const taskKey = federatedIdentityKey({
    kind: 'TASK', authority: 'GOVERNED_TASK_QUEUE',
    authorityScope: 'Patricked-code/MCP', sourceId: 'TASK-20261122-101'
  });
  const projection = buildFederatedRegistryProjection({
    observedAt,
    entities: [{
      identity: {
        kind: 'TASK', authority: 'GOVERNED_TASK_QUEUE',
        authorityScope: 'Patricked-code/MCP', sourceId: 'TASK-20261122-101'
      },
      evidence: {
        observedAt, verification: 'VERIFIED',
        evidenceRef: 'governed-task-queue:TASK-20261122-101', sourceVersion: 'queue-rev:244'
      },
      taskStatus: 'DONE'
    }],
    links: []
  });
  const base = fixture();
  const result = buildMissionContinuityReadProjection({
    ...base, federation: projection,
    taskBindings: [{
      ownerContinuityId: ID, federatedTaskKey: taskKey,
      evidence: evidence('mission:task:binding')
    }, {
      ownerContinuityId: CHILD, federatedTaskKey: taskKey,
      evidence: evidence('mission:wrong-owner')
    }]
  });
  assert.deepEqual(result.realTaskIds, ['TASK-20261122-101']);
  assert.ok(result.blockers.includes('FOREIGN_TASK_BINDING_EXCLUDED'));
  const noQueue = buildMissionContinuityReadProjection({
    ...base, taskBindings: [{ownerContinuityId: ID, federatedTaskKey: taskKey, evidence: evidence('binding')}]
  });
  assert.deepEqual(noQueue.realTaskIds, []);
  assert.ok(noQueue.blockers.includes('TASK_QUEUE_BINDING_UNVERIFIED'));
});

test('conflicting documents and events stop a proposed action without losing history', () => {
  const base = fixture();
  const result = buildMissionContinuityReadProjection({
    ...base,
    documents: [
      ...base.documents,
      {...base.documents[0]!, path: 'different-authority.md'}
    ],
    timeline: [
      ...base.timeline,
      {...base.timeline[0]!, description: 'Contradictory origin'}
    ]
  });
  assert.equal(result.verificationStatus, 'CONFLICT');
  assert.equal(result.resumeReadiness, 'BLOCKED');
  assert.equal(result.nextActionCurrent, null);
  assert.ok(result.conflicts.includes('DOCUMENT_AUTHORITY_CONFLICT:MISSION'));
  assert.ok(result.conflicts.includes('EVENT_ID_CONFLICT:E01'));
  assert.equal(result.historicalTimeline.length, 2);
});

test('historical checkpoints preserve successors and classify broken predecessor evidence', () => {
  const base = fixture();
  const orphan = {...base.timeline[1]!, predecessorId: 'NOT_PRESENT'};
  const result = buildMissionContinuityReadProjection({...base, timeline: [base.timeline[0]!, orphan]});
  assert.ok(result.blockers.includes('HISTORICAL_PREDECESSOR_MISSING:E02'));
  assert.equal(result.latestVerifiedCheckpoint?.eventId, 'E02');
  assert.equal(result.verificationStatus, 'UNVERIFIED');
});

test('a write proposal always requires existing Task Queue gates and never creates a Task', () => {
  const base = fixture();
  const result = buildMissionContinuityReadProjection({
    ...base,
    candidateActions: [{...base.candidateActions[0]!, mode: 'GOVERNED_WRITE'}]
  });
  assert.equal(result.resumeReadiness, 'ADMISSION_REQUIRED');
  assert.equal(result.nextActionCurrent?.readiness, 'ADMISSION_REQUIRED');
  assert.ok(result.admissionRequirements.includes('REAL_TASK_ADMISSION'));
  assert.equal(result.realTaskIds.length, 0);
  assert.equal(result.authorizationInferred, false);
});

test('priority respects dependencies, never treats a blocked or SUPERSEDED package as executable', () => {
  const base = fixture();
  const result = buildMissionContinuityReadProjection({
    ...base,
    workPackages: base.workPackages.map(x => x.workPackageId === 'REG-WP-01'
      ? {...x, status: 'IN_PROGRESS'} : x),
  });
  assert.equal(result.nextActionCurrent, null);
  assert.ok(result.blockers.includes('ACTION_DEPENDENCIES_UNMET:P2-GITREGISTRY-READ'));
});

test('history paginates deterministically and repeated input yields identical read-only result', () => {
  const base = fixture();
  const before = JSON.stringify(base);
  const first = buildMissionContinuityReadProjection({...base, historyPageSize: 1});
  const second = buildMissionContinuityReadProjection({...base, historyPageSize: 1, historyOffset: 1});
  assert.deepEqual(first.historicalTimeline.map(x => x.eventId), ['E01']);
  assert.equal(first.historyNextOffset, 1);
  assert.deepEqual(second.historicalTimeline.map(x => x.eventId), ['E02']);
  assert.equal(second.historyNextOffset, null);
  assert.deepEqual(first, buildMissionContinuityReadProjection({...base, historyPageSize: 1}));
  assert.equal(JSON.stringify(base), before);
});

test('invalid cursor, SHA and undocumented mission are rejected; this is not a public entry tool', () => {
  const base = fixture();
  assert.throws(() => buildMissionContinuityReadProjection({...base, historyPageSize: 101}),
    /MISSION_CONTINUITY_PAGE_INVALID/);
  assert.throws(() => buildMissionContinuityReadProjection({...base, sourceCommitSha: 'main'}),
    /MISSION_CONTINUITY_INPUT_INVALID/);
  assert.throws(() => buildMissionContinuityReadProjection({...base, continuityId: ''}),
    /MISSION_CONTINUITY_INPUT_INVALID/);
});
