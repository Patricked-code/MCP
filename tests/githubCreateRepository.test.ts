import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('TB-W3-ADMIN-01: github_create_repository governed write tool', async (t) => {

  await t.test('tool is registered in githubLifecycle write tools', async () => {
    const src = await readFile('src/tools/githubLifecycle.ts', 'utf8');
    assert.ok(
      src.includes('github_create_repository'),
      'github_create_repository tool must be registered'
    );
  });

  await t.test('tool enforces private-only visibility', async () => {
    const src = await readFile('src/tools/githubLifecycle.ts', 'utf8');
    const toolStart = src.indexOf("'github_create_repository'");
    assert.ok(toolStart > -1, 'tool must exist');
    const toolSection = src.slice(toolStart, toolStart + 1500);
    assert.ok(
      toolSection.includes('private') && toolSection.includes('true'),
      'must enforce private visibility'
    );
  });

  await t.test('tool is org-bounded', async () => {
    const src = await readFile('src/tools/githubLifecycle.ts', 'utf8');
    const toolStart = src.indexOf("'github_create_repository'");
    assert.ok(toolStart > -1);
    const toolSection = src.slice(toolStart, toolStart + 1500);
    assert.ok(toolSection.includes('assertOrg'), 'must use assertOrg for org-bounding');
    assert.ok(toolSection.includes('/orgs/'), 'must create under org endpoint');
  });

  await t.test('tool calls requireWrite for governance gate', async () => {
    const src = await readFile('src/tools/githubLifecycle.ts', 'utf8');
    const toolStart = src.indexOf("'github_create_repository'");
    assert.ok(toolStart > -1);
    const toolSection = src.slice(toolStart, toolStart + 1500);
    assert.ok(toolSection.includes('requireWrite'), 'must call requireWrite');
  });

  await t.test('tool does NOT expose public, webhook, team, secret, deploy key or ruleset parameters', async () => {
    const src = await readFile('src/tools/githubLifecycle.ts', 'utf8');
    const toolStart = src.indexOf("'github_create_repository'");
    assert.ok(toolStart > -1);
    const descEnd = src.indexOf('{', src.indexOf('{', toolStart) + 1);
    const toolSection = src.slice(descEnd, descEnd + 2000);
    for (const forbidden of ['webhook', 'team_id', 'deploy_key', 'ruleset', 'secret']) {
      assert.ok(!toolSection.includes(forbidden), `must NOT expose ${forbidden} parameter`);
    }
  });

  await t.test('tool handles idempotent creation (existing repo is not an overwrite)', async () => {
    const src = await readFile('src/tools/githubLifecycle.ts', 'utf8');
    const toolStart = src.indexOf("'github_create_repository'");
    assert.ok(toolStart > -1);
    const toolSection = src.slice(toolStart, toolStart + 2000);
    assert.ok(
      toolSection.includes('already_exists') || toolSection.includes('ALREADY_EXISTS') || toolSection.includes('422'),
      'must handle already-existing repo idempotently'
    );
  });
});
