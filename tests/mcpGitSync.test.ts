import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { buildMcpGitSyncCommand } from '../src/tools/mcpGitSync.js';

const READ_ONLY_REMOTE = 'git@github.com-mcp-patricked-ro:Patricked-code/MCP.git';
const LEGACY_WRITE_REMOTE = 'git@github.com-mcp-patricked-rw:Patricked-code/MCP.git';
const DISABLED_PUSH_REMOTE = 'disabled://mcp-s1-read-only';

function runSyncPreflight(fetchRemote: string, pushRemote: string) {
  const workspace = mkdtempSync(join(tmpdir(), 'mcp-git-sync-'));
  const repository = join(workspace, 'repository');
  const fakeBin = join(workspace, 'fake-bin');
  const gitEnvironment = {
    ...process.env,
    GIT_AUTHOR_EMAIL: 'test@example.invalid',
    GIT_AUTHOR_NAME: 'MCP sync test',
    GIT_COMMITTER_EMAIL: 'test@example.invalid',
    GIT_COMMITTER_NAME: 'MCP sync test'
  };

  try {
    mkdirSync(repository);
    assert.equal(spawnSync('git', ['init', '-b', 'main'], { cwd: repository, env: gitEnvironment }).status, 0);
    writeFileSync(join(repository, 'README.md'), 'test repository\n');
    assert.equal(spawnSync('git', ['add', 'README.md'], { cwd: repository, env: gitEnvironment }).status, 0);
    assert.equal(spawnSync('git', ['commit', '-m', 'initial'], { cwd: repository, env: gitEnvironment }).status, 0);
    assert.equal(spawnSync('git', ['remote', 'add', 'origin', fetchRemote], { cwd: repository, env: gitEnvironment }).status, 0);
    assert.equal(
      spawnSync('git', ['remote', 'set-url', '--push', 'origin', pushRemote], {
        cwd: repository,
        env: gitEnvironment
      }).status,
      0
    );

    const realGit = spawnSync('sh', ['-c', 'command -v git'], {
      encoding: 'utf8',
      env: gitEnvironment
    }).stdout.trim();
    assert.ok(realGit);

    mkdirSync(fakeBin);
    const gitWrapper = join(fakeBin, 'git');
    writeFileSync(
      gitWrapper,
      `#!/bin/sh\nfor argument in "$@"; do\n  if [ "$argument" = "fetch" ]; then\n    exit 79\n  fi\ndone\nexec '${realGit}' "$@"\n`
    );
    chmodSync(gitWrapper, 0o755);

    const command = buildMcpGitSyncCommand().replace(
      "cd '/opt/apps/wealthtech-mcp-ssh-bridge'",
      `cd '${repository}'`
    );

    return spawnSync('bash', ['-c', command], {
      encoding: 'utf8',
      env: {
        ...gitEnvironment,
        PATH: `${fakeBin}:${process.env.PATH ?? ''}`
      }
    });
  } finally {
    rmSync(workspace, { force: true, recursive: true });
  }
}

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

test('MCP Git sync requires the read-only identity and a disabled push URL', () => {
  const legacyWriteIdentity = runSyncPreflight(LEGACY_WRITE_REMOTE, DISABLED_PUSH_REMOTE);
  assert.equal(legacyWriteIdentity.status, 32);
  assert.match(legacyWriteIdentity.stdout, /remote origin inattendu/);

  const activePushPath = runSyncPreflight(READ_ONLY_REMOTE, READ_ONLY_REMOTE);
  assert.equal(activePushPath.status, 33);
  assert.match(activePushPath.stdout, /push origin non neutralisé/);

  const readOnlyIdentity = runSyncPreflight(READ_ONLY_REMOTE, DISABLED_PUSH_REMOTE);
  assert.equal(readOnlyIdentity.status, 79);
  assert.doesNotMatch(readOnlyIdentity.stdout, /remote origin inattendu|push origin non neutralisé/);
});
