import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('TB-W3-PRW-01: github_request_pull_request_review tool', async (t) => {

  await t.test('tool is registered in githubLifecycle write tools', async () => {
    const src = await readFile('src/tools/githubLifecycle.ts', 'utf8');
    assert.ok(
      src.includes('github_request_pull_request_review'),
      'github_request_pull_request_review tool must be registered'
    );
  });

  await t.test('tool requires expectedHeadSha for exact-head reobservation', async () => {
    const src = await readFile('src/tools/githubLifecycle.ts', 'utf8');
    const toolStart = src.indexOf('github_request_pull_request_review');
    assert.ok(toolStart > -1, 'tool must exist');
    const toolSection = src.slice(toolStart, toolStart + 800);
    assert.ok(
      toolSection.includes('expectedHeadSha'),
      'tool must require expectedHeadSha parameter for exact-head reobservation'
    );
  });

  await t.test('tool requires explicit reviewer targets', async () => {
    const src = await readFile('src/tools/githubLifecycle.ts', 'utf8');
    const toolStart = src.indexOf('github_request_pull_request_review');
    assert.ok(toolStart > -1, 'tool must exist');
    const toolSection = src.slice(toolStart, toolStart + 800);
    assert.ok(
      toolSection.includes('reviewers'),
      'tool must accept explicit reviewer targets'
    );
  });

  await t.test('tool calls requireWrite for governance gate', async () => {
    const src = await readFile('src/tools/githubLifecycle.ts', 'utf8');
    const toolStart = src.indexOf('github_request_pull_request_review');
    assert.ok(toolStart > -1, 'tool must exist');
    const toolSection = src.slice(toolStart, toolStart + 1200);
    assert.ok(
      toolSection.includes('requireWrite'),
      'tool must call requireWrite for scoped write gate'
    );
  });

  await t.test('tool validates head SHA before requesting review', async () => {
    const src = await readFile('src/tools/githubLifecycle.ts', 'utf8');
    const toolStart = src.indexOf('github_request_pull_request_review');
    assert.ok(toolStart > -1, 'tool must exist');
    const toolSection = src.slice(toolStart, toolStart + 1200);
    assert.ok(
      toolSection.includes('assertExpectedPrHead') || toolSection.includes('GITHUB_PR_HEAD_STALE'),
      'tool must validate head SHA matches before requesting review'
    );
  });

  await t.test('tool uses REST API for review request', async () => {
    const src = await readFile('src/tools/githubLifecycle.ts', 'utf8');
    const toolStart = src.indexOf('github_request_pull_request_review');
    assert.ok(toolStart > -1, 'tool must exist');
    const toolSection = src.slice(toolStart, toolStart + 1500);
    assert.ok(
      toolSection.includes('/requested_reviewers'),
      'tool must use the /requested_reviewers REST endpoint'
    );
  });
});
