import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('TB-W3-PRW-02: github_update_pull_request_metadata tool', async (t) => {

  await t.test('tool is registered in githubLifecycle write tools', async () => {
    const src = await readFile('src/tools/githubLifecycle.ts', 'utf8');
    assert.ok(
      src.includes('github_update_pull_request_metadata'),
      'github_update_pull_request_metadata tool must be registered'
    );
  });

  await t.test('tool requires expectedHeadSha for exact-head reobservation', async () => {
    const src = await readFile('src/tools/githubLifecycle.ts', 'utf8');
    const toolStart = src.indexOf('github_update_pull_request_metadata');
    assert.ok(toolStart > -1, 'tool must exist');
    const toolSection = src.slice(toolStart, toolStart + 1000);
    assert.ok(toolSection.includes('expectedHeadSha'), 'must require expectedHeadSha');
  });

  await t.test('tool accepts safe metadata fields: title, body, labels', async () => {
    const src = await readFile('src/tools/githubLifecycle.ts', 'utf8');
    const toolStart = src.indexOf('github_update_pull_request_metadata');
    assert.ok(toolStart > -1, 'tool must exist');
    const toolSection = src.slice(toolStart, toolStart + 1000);
    assert.ok(toolSection.includes('title'), 'must accept title');
    assert.ok(toolSection.includes('body'), 'must accept body');
  });

  await t.test('tool does NOT expose dangerous lifecycle mutations (state, base)', async () => {
    const src = await readFile('src/tools/githubLifecycle.ts', 'utf8');
    const toolStart = src.indexOf('github_update_pull_request_metadata');
    assert.ok(toolStart > -1, 'tool must exist');
    const toolSection = src.slice(toolStart, toolStart + 1500);
    assert.ok(!toolSection.includes("'state'") && !toolSection.includes('"state"'),
      'must NOT expose state mutation (close/open)');
    assert.ok(!toolSection.includes("'base'") || toolSection.includes('baseSha') === false,
      'must NOT expose base branch change');
  });

  await t.test('tool calls requireWrite for governance gate', async () => {
    const src = await readFile('src/tools/githubLifecycle.ts', 'utf8');
    const toolStart = src.indexOf('github_update_pull_request_metadata');
    assert.ok(toolStart > -1, 'tool must exist');
    const toolSection = src.slice(toolStart, toolStart + 1500);
    assert.ok(toolSection.includes('requireWrite'), 'must call requireWrite');
  });

  await t.test('tool validates head SHA before updating', async () => {
    const src = await readFile('src/tools/githubLifecycle.ts', 'utf8');
    const toolStart = src.indexOf('github_update_pull_request_metadata');
    assert.ok(toolStart > -1, 'tool must exist');
    const toolSection = src.slice(toolStart, toolStart + 1500);
    assert.ok(
      toolSection.includes('assertExpectedPrHead') || toolSection.includes('GITHUB_PR_HEAD_STALE'),
      'must validate head SHA'
    );
  });

  await t.test('tool uses PATCH on pulls endpoint', async () => {
    const src = await readFile('src/tools/githubLifecycle.ts', 'utf8');
    const toolStart = src.indexOf('github_update_pull_request_metadata');
    assert.ok(toolStart > -1, 'tool must exist');
    const toolSection = src.slice(toolStart, toolStart + 1500);
    assert.ok(toolSection.includes('PATCH'), 'must use PATCH method');
    assert.ok(toolSection.includes('/pulls/'), 'must target pulls endpoint');
  });
});
