import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

import { buildMcpGitSyncCommand } from '../src/tools/mcpGitSync.js';

test('MCP Git sync command is valid shell and stays fast-forward only', () => {
  const command = buildMcpGitSyncCommand();
  const syntax = spawnSync('bash', ['-n'], {
    input: command,
    encoding: 'utf8'
  });

  assert.equal(syntax.status, 0, syntax.stderr);
  assert.match(command, /EXPECTED_BRANCH='main'/);
  assert.match(command, /git status --porcelain --untracked-files=all/);
  assert.match(command, /git -c core\.hooksPath=\/dev\/null fetch --no-tags origin main/);
  assert.match(command, /git merge-base --is-ancestor/);
  assert.match(command, /git -c core\.hooksPath=\/dev\/null merge --ff-only/);
  assert.match(command, /Patricked-code\/MCP/);

  for (const forbidden of ['git reset', 'git clean', 'git checkout', 'git switch', 'git rebase', 'git stash', 'git push']) {
    assert.doesNotMatch(command, new RegExp(forbidden));
  }
});

test('MCP Git sync command refuses wrong branch, remote, dirty state and divergence', () => {
  const command = buildMcpGitSyncCommand();

  assert.match(command, /branche courante/);
  assert.match(command, /remote origin inattendu/);
  assert.match(command, /modifications ou fichiers non suivis/);
  assert.match(command, /historique local non fast-forward/);
  assert.match(command, /commit local final ne correspond pas/);
  assert.match(command, /n'est plus propre après fast-forward/);
});
