import test from 'node:test';
import assert from 'node:assert/strict';
import { planRegistryReview, reviewMarker } from '../scripts/registry-auto-review.mjs';

const sha = 'a'.repeat(40);
const repository = 'Patricked-code/MCP';
function fixture() {
  return {
    event: { workflow_run: {
      name: 'MCP CI', event: 'pull_request', status: 'completed',
      conclusion: 'success', head_sha: sha,
      head_repository: { full_name: repository },
      pull_requests: [{ number: 431 }]
    }},
    pr: {
      number: 431, state: 'open', draft: false,
      head: { sha, ref: 'mcp/registry-federation-projection-20261121',
        repo: { full_name: repository } },
      base: { ref: 'main' }
    },
    comments: [],
    repository
  };
}

test('successful exact-head scoped CI can only request independent review', () => {
  const result = planRegistryReview(fixture());
  assert.deepEqual(result, { status: 'READY', number: 431, headSha: sha, marker: reviewMarker(sha) });
  assert.ok(result.marker.includes(sha));
});

test('skip replay previously requested by GitHub Actions bot', () => {
  const f = fixture();
  f.comments = [{ user: { login: 'github-actions[bot]' }, body: '@codex review\n' + reviewMarker(sha) }];
  assert.deepEqual(planRegistryReview(f), { status: 'SKIP', reason: 'ALREADY_REQUESTED' });
});

test('different SHA is a distinct review request, stale HEAD is denied', () => {
  const f = fixture();
  f.comments = [{ user: { login: 'github-actions[bot]' },
    body: reviewMarker('b'.repeat(40)) }];
  assert.equal(planRegistryReview(f).status, 'READY');
  f.pr.head.sha = 'b'.repeat(40);
  assert.deepEqual(planRegistryReview(f), { status: 'SKIP', reason: 'STALE_OR_UNADMITTED_PR' });
});

test('forks and untrusted repositories never post reviews', () => {
  const a = fixture(); a.event.workflow_run.head_repository.full_name = 'fork/MCP';
  assert.equal(planRegistryReview(a).status, 'SKIP');
  const b = fixture(); b.pr.head.repo.full_name = 'fork/MCP';
  assert.equal(planRegistryReview(b).status, 'SKIP');
  const c = fixture(); c.repository = 'OtherOrg/MCP';
  assert.equal(planRegistryReview(c).status, 'SKIP');
});

test('draft PRs and unrelated branches or bases cannot be reviewed by this dispatcher', () => {
  const a = fixture(); a.pr.draft = true;
  assert.equal(planRegistryReview(a).status, 'SKIP');
  const b = fixture(); b.pr.head.ref = 'feature/other';
  assert.equal(planRegistryReview(b).status, 'SKIP');
  const c = fixture(); c.pr.base.ref = 'unsafe/branch';
  assert.equal(planRegistryReview(c).status, 'SKIP');
});

test('different source workflow, failure or multiple PRs are fail-closed', () => {
  const a = fixture(); a.event.workflow_run.name = 'Other CI';
  assert.equal(planRegistryReview(a).status, 'SKIP');
  const b = fixture(); b.event.workflow_run.conclusion = 'failure';
  assert.equal(planRegistryReview(b).status, 'SKIP');
  const c = fixture(); c.event.workflow_run.pull_requests.push({ number: 432 });
  assert.equal(planRegistryReview(c).status, 'SKIP');
});

test('missing comments cannot produce a request and foreign impersonation cannot dedupe', () => {
  const a = fixture(); a.comments = null;
  assert.deepEqual(planRegistryReview(a), { status: 'BLOCKED', reason: 'COMMENTS_UNAVAILABLE' });
  const b = fixture(); b.comments = [{ user: { login: 'an-unknown-user' }, body: reviewMarker(sha) }];
  assert.equal(planRegistryReview(b).status, 'READY');
});

test('invalid SHA never becomes a marker', () => {
  assert.throws(() => reviewMarker('not-a-commit'), /REGISTRY_REVIEW_SHA_INVALID/);
  const a = fixture(); a.event.workflow_run.head_sha = 'not-a-commit';
  assert.equal(planRegistryReview(a).status, 'SKIP');
});
