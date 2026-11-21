import test from 'node:test';
import assert from 'node:assert/strict';
import { makeCugRegisterRecord, CUG_PILOT_REPOSITORY_ID } from '../src/cug/discoveryRegister.js';
import { assessCugEventIntent } from '../src/cug/federatedEventIntent.js';

const clock = '2026-11-21T19:00:00Z';
const receipt = makeCugRegisterRecord({
  deliveryId: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
  event: 'repository', action: 'edited', installationId: 173915815,
  repositoryId: CUG_PILOT_REPOSITORY_ID, receivedAt: clock,
  payloadDigest: 'a'.repeat(64)
}, {
  id: CUG_PILOT_REPOSITORY_ID, name: 'universal-agent-engineering-system',
  html_url: 'https://github.com/chainsolutions-wealthtech/universal-agent-engineering-system',
  owner: { id: 299685687, login: 'chainsolutions-wealthtech' }
});
const github = {
  source: 'GITHUB_API_CUG_INSTALLATION' as const,
  verifiedAt: clock,
  installationId: receipt.installationId,
  githubRepositoryId: receipt.repositoryId,
  fullName: 'chainsolutions-wealthtech/universal-agent-engineering-system',
  installationCoverage: 'VERIFIED' as const,
  evidenceRef: 'inventory:verified-1'
};
const project = {
  status: 'VERIFIED' as const,
  projectId: 'UAES-01', mappingId: 'MAPPING-UAES-01',
  githubRepositoryId: receipt.repositoryId,
  repository: github.fullName, evidenceRef: 'registry:verified-binding-1'
};
const assess = (overrides: Partial<Parameters<typeof assessCugEventIntent>[0]> = {}) =>
  assessCugEventIntent({ receipt, github, project, now: clock, ...overrides });

test('admissible observation is only a stable candidate, with no task/permission', () => {
  const a=assess(), b=assess();
  assert.equal(a.status, 'CANDIDATE');
  assert.equal(a.intentKey,b.intentKey);
  assert.match(a.intentKey ?? '', /^cug:receipt:[0-9a-f]{64}$/);
  assert.equal(a.executionAuthorized,false);
  assert.equal(a.admissionPerformed,false);
  assert.equal(a.taskCreated,false);
  assert.equal(a.projectId,'UAES-01');
  assert.equal(a.provenance.length,3);
});

test('no GitHub installation proof, wrong repository and stale proof are pending not admitted', () => {
  assert.equal(assess({ github:null }).status, 'PENDING_GITHUB_VERIFICATION');
  assert.equal(assess({ github:{ ...github, githubRepositoryId:9999 } }).status,
    'PENDING_GITHUB_VERIFICATION');
  assert.equal(assess({ github:{ ...github, verifiedAt:'2026-11-21T18:00:00Z' } }).status,
    'PENDING_GITHUB_VERIFICATION');
  assert.equal(assess({ github:{ ...github, installationCoverage:'UNVERIFIED' } }).status,
    'PENDING_GITHUB_VERIFICATION');
});

test('unknown project and ambiguous or mismatched IDs never create candidate', () => {
  assert.equal(assess({ project:null }).status,'PENDING_PROJECT_BINDING');
  assert.equal(assess({ project:{ ...project,status:'AMBIGUOUS' } }).status,'CONFLICT');
  assert.equal(assess({ project:{ ...project, mappingId:null } }).status,'CONFLICT');
  assert.equal(assess({ project:{ ...project, githubRepositoryId:1 } }).status,'CONFLICT');
});

test('unsupported events are ignored rather than creating a flood of tasks', () => {
  const other=makeCugRegisterRecord({
    deliveryId:'bbbbbbbb-cccc-4ddd-8eee-ffffffffffff',
    event:'installation', action:'created',installationId:receipt.installationId,
    repositoryId:receipt.repositoryId,receivedAt:clock,payloadDigest:'b'.repeat(64)
  },null);
  assert.equal(assess({receipt:other}).status,'IGNORED');
  const opened=makeCugRegisterRecord({
    deliveryId:'bbbbbbbb-cccc-4ddd-8eee-ffffffffffff',
    event:'repository',action:'deleted',installationId:receipt.installationId,
    repositoryId:receipt.repositoryId,receivedAt:clock,payloadDigest:'b'.repeat(64)
  },null);
  assert.equal(assess({receipt:opened}).status,'IGNORED');
});
