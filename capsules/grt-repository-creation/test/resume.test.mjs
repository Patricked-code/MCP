import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { resumeRepositoryCreation } from '../src/resume.mjs';

const fixture = JSON.parse(readFileSync(new URL('./grt-fixture.json', import.meta.url), 'utf8'));
const projectId = fixture.before.project_continuity_id;
const sha = 'a'.repeat(40);
const terminal = {
  ...fixture.local, status: 'LOCAL_HANDOFF_READY', phase: 'HANDOFF',
  handoff: { status: 'LOCAL_HANDOFF_READY', repository: fixture.local.repository,
    baseline_commit_sha: 'b'.repeat(40), project_continuity: fixture.local.project_continuity },
};
const central = state => ({ state, evidence: { repository: 'chainsolutions-wealthtech/Governed-Repository-Template', issue: 99, observedAt: '2026-11-14T01:00:00Z' } });
const local = (state = fixture.local, overrides = {}) => ({ state, evidence: { repository: 'Patricked-code/fixture', repositoryId: '123456', issue: 9, observedAt: '2026-11-14T01:01:00Z', ...overrides } });
const get = (centralState, localState = null, grant = true, expected = true) => {
  const calls = [];
  const ports = {
    authorize: async () => grant === true ? { projectId, centralIssue: 99 } : grant,
    readCentral: async () => { calls.push('central'); return central(centralState); },
    readLocal: async () => { calls.push('local'); return localState; },
  };
  return { calls, result: resumeRepositoryCreation({ projectId: expected ? projectId : 'other', principalRef: 'verified-actor-ref' }, ports) };
};

test('the authentic central GRT state wins before handoff and supplies only the approved projection', async () => {
  const x = get(fixture.before, local());
  const r = await x.result;
  assert.equal(r.status, 'READY');
  assert.equal(r.checkpoint.authority, 'GRT_CENTRAL');
  assert.deepEqual(r.checkpoint.next, { kind: 'ACTION_REQUEST', id: 'PREP-001' });
  assert.equal(r.architecture.status, 'NOT_ATTESTED');
  assert.deepEqual(x.calls, ['central']);
  assert.doesNotMatch(JSON.stringify(r), /secret-canary|answers|instructions/);
});

test('reads the first local entry only after the central handoff is correlated by both IDs', async () => {
  const r = await get(fixture.after, local()).result;
  assert.equal(r.status, 'READY');
  assert.equal(r.checkpoint.authority, 'GRT_LOCAL');
  assert.equal(r.checkpoint.next.id, 'Q_AGENT');
  assert.equal(r.repository.id, '123456');
  assert.equal(r.projectId, projectId);
  assert.equal(r.centralRequestId, 'GR-000099');
  assert.equal(r.checkpoint.requestId, 'LOCAL-000009');
});

test('unauthorized and malformed identities do not read central or local states', async () => {
  for (const x of [get(fixture.after, local(), null), get(fixture.after, local(), { projectId: 'other', centralIssue: 99 }), get(fixture.after, local(), true, false), get(fixture.after, local(), { projectId, centralIssue: 100 })]) {
    assert.deepEqual(await x.result, { status: 'UNAVAILABLE' });
    assert.deepEqual(x.calls, []);
  }
});

test('missing local state is a point of observation, not authority to rerun creation', async () => {
  const r = await get(fixture.after).result;
  assert.equal(r.status, 'WAITING_LOCAL');
  assert.equal(r.checkpoint.next, null);
  assert.equal(r.reason, 'LOCAL_ENTRY_NOT_OBSERVED');
});

test('wrong GitHub repository ID, scope or continuity fails closed without leaking details', async () => {
  for (const candidate of [local({ ...fixture.local, expected_head_sha: 'c'.repeat(40) }), local(fixture.local, { repositoryId: '654321' }), local(fixture.local, { repository: 'Other/fixture' }), local({ ...fixture.local, project_continuity: { ...fixture.local.project_continuity, source_request_id: 'GR-000098' } })]) {
    assert.deepEqual(await get(fixture.after, candidate).result, { status: 'BLOCKED', reason: 'INCONSISTENT_EVIDENCE' });
  }
});

test('held central states do not consult or dispatch the local entry', async () => {
  const x = get({ ...fixture.after, status: 'HOLD_FOR_REVIEW', next_request: null }, local());
  const r = await x.result;
  assert.equal(r.status, 'HELD');
  assert.equal(r.checkpoint.next, null);
  assert.deepEqual(x.calls, ['central']);
});

test('terminal or held local states never claim an executable next step', async () => {
  for (const [status, output] of [['LOCAL_HANDOFF_READY', 'HANDOFF'], ['HOLD_FOR_REVIEW', 'HELD']]) {
    const r = await get(fixture.after, local({ ...(status === 'LOCAL_HANDOFF_READY' ? terminal : fixture.local), status, next_request: status === 'LOCAL_HANDOFF_READY' ? { id: 'LOCAL_HANDOFF_READY', kind: 'HANDOFF', handoff: terminal.handoff } : null })).result;
    assert.equal(r.status, output);
    assert.equal(r.checkpoint.next, null);
  }
});

test('an invalid branch never selects a local state', async () => {
  for (const target_branch of ['../main', 'bad branch', 'refs/heads/main', '-test']) {
    const x = get({ ...fixture.after, handoff: { ...fixture.after.handoff, target_branch } }, local());
    assert.equal((await x.result).status, 'BLOCKED');
    assert.deepEqual(x.calls, ['central']);
  }
});

test('a status alone cannot prove terminal handoff', async () => {
  for (const state of [
    { ...fixture.local, status: 'LOCAL_HANDOFF_READY' },
    { ...terminal, handoff: { ...terminal.handoff, baseline_commit_sha: null } },
    { ...terminal, handoff: { ...terminal.handoff, project_continuity: { ...fixture.local.project_continuity, github_repository: 'Other/fixture' } } },
  ]) assert.deepEqual(await get(fixture.after, local(state)).result, { status: 'BLOCKED', reason: 'INCONSISTENT_EVIDENCE' });
});

test('a handoff with no verified branch or exact SHA cannot select local state', async () => {
  const x = get({ ...fixture.after, handoff: { ...fixture.after.handoff, expected_head_sha: null } }, local());
  assert.deepEqual(await x.result, { status: 'BLOCKED', reason: 'INCONSISTENT_EVIDENCE' });
  assert.deepEqual(x.calls, ['central']);
});

test('separate valid arrivals return the same checkpoint without creating any event or write', async () => {
  const x = get(fixture.after, local());
  const y = get(fixture.after, local());
  assert.deepEqual(await x.result, await y.result);
  assert.deepEqual(x.calls, ['central', 'local']);
  assert.deepEqual(y.calls, x.calls);
});

test('later local next request comes from GRT, not a capsule transition table', async () => {
  const r = await get(fixture.after, local({ ...fixture.local, revision: 5, expected_head_sha: sha, phase: 'Q_ARCH', next_request: { id: 'Q_ARCH', kind: 'QUESTION', text: 'secret-canary' } })).result;
  assert.deepEqual(r.checkpoint.next, { kind: 'QUESTION', id: 'Q_ARCH' });
  assert.equal(r.checkpoint.revision, 5);
  assert.doesNotMatch(JSON.stringify(r), /secret-canary/);
});

test('validates the local GRT states for approval, credentials and discovery retry without exposing their payload', async () => {
  const variants = [
    ['WAITING_FOR_DISCOVERY_APPROVAL', 'MCP_DISCOVERY_APPROVAL', 'PLAN_APPROVAL', 'Q_MCP_DISCOVERY_APPROVAL'],
    ['MCP_CREDENTIAL_REQUIRED', 'MCP_CREDENTIAL_GATE', 'CREDENTIAL_GATE', 'MCP_CREDENTIAL_GATE'],
    ['MCP_DISCOVERY_FAILED_RETRYABLE', 'MCP_DISCOVERY', 'MCP_DISCOVERY', 'MCP_DISCOVERY'],
    ['WAITING_FOR_SETUP_APPROVAL', 'SETUP_APPROVAL', 'PLAN_APPROVAL', 'Q_SETUP_APPROVAL'],
  ];
  for (const [status, phase, kind, id] of variants) {
    const r = await get(fixture.after, local({ ...fixture.local, status, phase, next_request: { id, kind, requirements: 'secret-canary' } })).result;
    assert.deepEqual(r.checkpoint.next, { kind, id });
    assert.doesNotMatch(JSON.stringify(r), /secret-canary/);
  }
});

test('reports architecture baseline evidence only from a receipt correlated to this local entry', async () => {
  const record = local(terminal);
  const receipt = {
    schema_version: '1.0.0', repository: 'Patricked-code/fixture', request_id: 'LOCAL-000009',
    baseline_subject_head: sha, completed_at: '2026-11-14T01:02:00Z',
    project_continuity: fixture.local.project_continuity,
  };
  assert.deepEqual((await get(fixture.after, { ...record, baselineReceipt: receipt }).result).architecture,
    { status: 'BASELINE_ATTESTED', subjectHead: sha, completedAt: receipt.completed_at });
  const wrongProjection = { ...receipt, project_continuity: { ...receipt.project_continuity, github_repository: 'Other/fixture' } };
  assert.deepEqual((await get(fixture.after, { ...record, baselineReceipt: wrongProjection }).result).architecture, { status: 'NOT_ATTESTED' });
  assert.deepEqual((await get(fixture.after, { ...record, baselineReceipt: { ...receipt, request_id: 'LOCAL-000010' } }).result).architecture,
    { status: 'NOT_ATTESTED' });
});

test('does not disclose connector exception text or convert it into authority', async () => {
  const r = await resumeRepositoryCreation({ projectId, principalRef: 'actor' }, {
    authorize: async () => ({ projectId, centralIssue: 99 }),
    readCentral: async () => { throw new Error('secret-canary'); },
  });
  assert.deepEqual(r, { status: 'BLOCKED', reason: 'SOURCE_UNAVAILABLE' });
});

test('a central question status never projects an action request',async()=>{
  const state={...fixture.before,status:'WAITING_FOR_ANSWER',phase:'Q_ARCH',
    next_request:{kind:'ACTION_REQUEST',id:'Q_ARCH'}};
  assert.deepEqual(await get(state).result,{status:'BLOCKED',reason:'INCONSISTENT_EVIDENCE'});
});

test('a local question status never projects a baseline write action',async()=>{
  const state={...fixture.local,status:'WAITING_FOR_ANSWER',phase:'Q_AGENT',
    next_request:{kind:'APPLY_BASELINE',id:'Q_AGENT'}};
  assert.deepEqual(await get(fixture.after,local(state)).result,{status:'BLOCKED',reason:'INCONSISTENT_EVIDENCE'});
});
