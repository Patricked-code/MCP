import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CANONICAL_REPOSITORY,
  classifyEvent,
  decideReceipt,
  isIntakeSubmitterPermission,
  programIntakeStatus,
  receiptMarker,
  renderReceipt
} from '../scripts/mcp-auto-intake-discovery.mjs';

const repo = CANONICAL_REPOSITORY;
const actor = 'ProjectOwner';
const issue = {
  id: 12345, number: 400, title: '[PROGRAM INTAKE] Etendre le MCP',
  body: '1. Diagnostic\n2. Tests\nsecret-as-instructions-untrusted',
  state: 'open', user: { login: actor }
};
const event = { action: 'opened', issue, sender: { login: actor } };
const sampleProgram = { programIntakes: [{ id: 'INTAKE-313', issue: 313, status: 'CONVERGED_CURRENT_MAIN' }] };

test('owner-created program issue detected; full body hashed but not republished', () => {
  const candidate = classifyEvent(event, 'issues', repo, actor);
  assert.equal(candidate.issueNumber, 400);
  assert.equal(candidate.sourceKey, 'issue-12345');
  const result = decideReceipt({ candidate, permission: 'admin', program: sampleProgram });
  assert.equal(result.action, 'UPSERT_RECEIPT');
  assert.equal(result.intake.status, 'DISCOVERED_PENDING_GOVERNED_CONVERGENCE');
  assert.match(result.body, /AUTO_INTAKE_DISCOVERY_V1:issue-12345/);
  assert.match(result.body, /NEXT_ACTION/);
  assert.ok(!result.body.includes('secret-as-instructions-untrusted'));
  assert.ok(!result.body.includes('1. Diagnostic'));
  assert.match(result.body, /Ni Task runtime/);
});

test('admin/maintain/write can submit a discovery candidate, with no runtime grant', () => {
  assert.equal(isIntakeSubmitterPermission('admin'), true);
  assert.equal(isIntakeSubmitterPermission('maintain'), true);
  assert.equal(isIntakeSubmitterPermission('write'), true);
  for (const level of ['triage', 'read', 'none', '', null]) {
    assert.equal(isIntakeSubmitterPermission(level), false);
    const candidate = classifyEvent(event, 'issues', repo, actor);
    assert.deepEqual(decideReceipt({ candidate, permission: level, program: sampleProgram }),
      { action: 'IGNORE', reason: 'NOT_GITHUB_SUBMITTER_AUTHORIZED' });
  }
});

test('recognizes existing #313 without creating tasks or fake DONE', () => {
  const prior = classifyEvent(
    { ...event, issue: { ...issue, id: 31313, number: 313 } },
    'issues', repo, actor
  );
  const result = decideReceipt({ candidate: prior, permission: 'maintain', program: sampleProgram });
  assert.equal(result.intake.status, 'EXISTING_BACKLOG_RECORD_REOBSERVE');
  assert.match(result.body, /INTAKE-313/);
  assert.doesNotMatch(result.body, /Task runtime créée/i);
});

test('only authorized owner comments in existing supervision issues qualify', () => {
  const make = (number, text) => ({
    action: 'created', issue: { ...issue, number, title: 'Different issue' },
    sender: { login: actor },
    comment: { id: 8080, body: text, user: { login: actor } }
  });
  const ok = classifyEvent(make(235, '[PROGRAM MANDATE] Traitement inter-agent\nSuite'), 'issue_comment', repo, actor);
  assert.equal(ok.sourceKey, 'comment-8080');
  assert.match(ok.sourceUrl, /issuecomment-8080/);
  assert.equal(classifyEvent(make(101, '[PROGRAM MANDATE] Test'), 'issue_comment', repo, actor), null);
  assert.equal(classifyEvent(make(313, 'Bonjour'), 'issue_comment', repo, actor), null);
  assert.equal(classifyEvent(make(313, '[PROGRAM INTAKE] Mission'), 'issues', repo, actor), null);
});

test('fail closed on forged identities, cross repo, closed, and unrelated GitHub events', () => {
  assert.equal(classifyEvent(event, 'issues', 'someone/other', actor), null);
  assert.equal(classifyEvent({ ...event, sender: { login: 'Other' } }, 'issues', repo, actor), null);
  assert.equal(classifyEvent({ ...event, issue: { ...issue, state: 'closed' } }, 'issues', repo, actor), null);
  assert.equal(classifyEvent({ ...event, action: 'deleted' }, 'issues', repo, actor), null);
  assert.equal(classifyEvent({ ...event, issue: { ...issue, title: 'Please code now' } }, 'issues', repo, actor), null);
  assert.equal(classifyEvent({ ...event, issue: { ...issue, id: -1 } }, 'issues', repo, actor), null);
  assert.equal(classifyEvent(event, 'pull_request', repo, actor), null);
  assert.equal(classifyEvent({
    action: 'created', sender: { login: actor }, issue,
    comment: { id: 22, body: '[PROGRAM MANDATE] X', user: { login: 'Other' } }
  }, 'issue_comment', repo, actor), null);
});

test('edits/reopens keep same receipt identity; content edits alter digest', () => {
  const opened = classifyEvent(event, 'issues', repo, actor);
  const edited = classifyEvent({ ...event, action: 'edited', issue: { ...issue, body: issue.body + '\nNew rule' } }, 'issues', repo, actor);
  const reopened = classifyEvent({ ...event, action: 'reopened' }, 'issues', repo, actor);
  assert.equal(receiptMarker(opened), receiptMarker(edited));
  assert.equal(receiptMarker(opened), receiptMarker(reopened));
  assert.notEqual(opened.digest, edited.digest);
  assert.equal(opened.digest, reopened.digest);
  assert.equal(renderReceipt(opened, programIntakeStatus(sampleProgram, opened)),
    renderReceipt(reopened, programIntakeStatus(sampleProgram, reopened)).replace('- **Événement GitHub :** reopened', '- **Événement GitHub :** opened'));
});

test('large body, malformed author, and invalid backlog fail safely', () => {
  assert.equal(classifyEvent({ ...event, issue: { ...issue, body: 'A'.repeat(128*1024+1) } }, 'issues', repo, actor), null);
  assert.equal(classifyEvent(event, 'issues', repo, 'bad/name'), null);
  assert.throws(() => programIntakeStatus({}, { issueNumber: 400 }), /INVALID_CANONICAL_PROGRAM_BACKLOG/);
});

test('no dynamic authorization or task claiming occurs from a receipt', () => {
  const candidate = classifyEvent(event, 'issues', repo, actor);
  const result = decideReceipt({ candidate, permission: 'admin', program: sampleProgram });
  assert.match(result.body, /Session|session/);
  assert.match(result.body, /claim/);
  assert.match(result.body, /déploiement/);
  assert.match(result.body, /ni.*bus live/i);
});
