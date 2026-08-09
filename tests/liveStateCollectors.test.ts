import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  buildDocumentationLiveStateCommand,
  buildS1LiveStateCommand,
  parseDocumentationObservation,
  parseKeyValueOutput,
  parseRuntimeObservation,
  parseS1Observation,
  resolveLiveStateGithubApiBase
} from '../src/liveState/collect.js';
import { assertReadOnlyCommand } from '../src/ssh/safety.js';
import { buildMcpRestartCommand } from '../src/tools/mcpRuntimeDeploy.js';

const SHA = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

test('la commande S1 Live State ne contient que des lectures Git bornées', () => {
  const command = buildS1LiveStateCommand();
  assert.doesNotThrow(() => assertReadOnlyCommand(command));
  assert.match(command, /git branch --show-current/);
  assert.match(command, /git rev-parse HEAD/);
  assert.match(command, /git rev-parse origin\/main/);
  assert.match(command, /git status --porcelain --untracked-files=all/);
  assert.match(command, /git remote get-url origin/);
  assert.match(command, /git remote get-url --push origin/);

  for (const forbidden of [
    'git pull', 'git push', 'git reset', 'git clean', 'git checkout',
    'git switch', 'git rebase', 'git stash', 'git merge', 'docker compose up'
  ]) {
    assert.doesNotMatch(command, new RegExp(forbidden));
  }
});

test('le parseur S1 normalise branche, SHA, propreté et remotes', () => {
  const output = [
    'branch=main',
    `head=${SHA}`,
    `origin_main=${SHA}`,
    'working_tree_clean=true',
    'diff_empty=true',
    'fetch_remote=git@github.com-mcp-patricked-ro:Patricked-code/MCP.git',
    'push_remote=disabled://mcp-s1-read-only'
  ].join('\n');

  assert.deepEqual(parseS1Observation(output), {
    status: 'CURRENT',
    path: '/opt/apps/wealthtech-mcp-ssh-bridge',
    branch: 'main',
    head: SHA,
    originMain: SHA,
    workingTreeClean: true,
    diffEmpty: true,
    fetchRemote: 'git@github.com-mcp-patricked-ro:Patricked-code/MCP.git',
    pushRemote: 'disabled://mcp-s1-read-only'
  });
});

test('le parseur runtime ne retient que les champs bornés nécessaires', () => {
  const output = [
    'container_name=/wealthtech_mcp_ssh_bridge',
    'container_status=running',
    'container_health=healthy',
    'container_image_id=sha256:image',
    `container_label.org.opencontainers.image.revision=${SHA}`,
    'container_label.secret=SHOULD_NOT_BE_READ'
  ].join('\n');

  const runtime = parseRuntimeObservation(output);
  assert.equal(runtime.container, 'wealthtech_mcp_ssh_bridge');
  assert.equal(runtime.containerStatus, 'running');
  assert.equal(runtime.health, 'healthy');
  assert.equal(runtime.imageId, 'sha256:image');
  assert.equal(runtime.revision, SHA);
  assert.equal(JSON.stringify(runtime).includes('SHOULD_NOT_BE_READ'), false);
});

test('la collecte documentaire reste bornée aux signaux de reprise', () => {
  const command = buildDocumentationLiveStateCommand();
  assert.doesNotThrow(() => assertReadOnlyCommand(command));
  assert.match(command, /TASKS\.md/);
  assert.match(command, /PRODUCTION_STATE\.json/);
  assert.match(command, /SUIVI\.md/);
  assert.doesNotMatch(command, /cat .*\.env|keys\/|secrets\//);

  const observation = parseDocumentationObservation([
    'active_task=TASK-20260809-001 — EN COURS',
    `declared_github_sha=${SHA}`,
    `declared_s1_sha=${SHA}`
  ].join('\n'), SHA, SHA);

  assert.equal(observation.status, 'CURRENT');
  assert.equal(observation.activeTask, 'TASK-20260809-001');
  assert.equal(observation.drift, false);
});

test('un SHA documentaire différent est signalé comme drift', () => {
  const observation = parseDocumentationObservation([
    'active_task=TASK-20260809-001 — EN COURS',
    'declared_github_sha=bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    'declared_s1_sha=bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'
  ].join('\n'), SHA, SHA);

  assert.equal(observation.drift, true);
});

test('parseKeyValueOutput ignore les lignes sans clé bornée', () => {
  assert.deepEqual(parseKeyValueOutput('a=1\ntexte libre\nb=2=3\n'), { a: '1', b: '2=3' });
});

test('GitHub API base exige HTTPS et une allowlist explicite', () => {
  assert.equal(
    resolveLiveStateGithubApiBase('https://api.github.com', 'api.github.com'),
    'https://api.github.com'
  );
  assert.throws(
    () => resolveLiveStateGithubApiBase('http://api.github.com', 'api.github.com'),
    /HTTPS/
  );
  assert.throws(
    () => resolveLiveStateGithubApiBase('https://evil.example', 'api.github.com'),
    /non autorisé/
  );
  assert.throws(
    () => resolveLiveStateGithubApiBase('https://user:pass@api.github.com', 'api.github.com'),
    /identifiant/
  );
  assert.throws(
    () => resolveLiveStateGithubApiBase('https://api.github.com?x=1', 'api.github.com'),
    /query string/
  );
});

test('le déploiement Docker transmet le HEAD S1 comme révision OCI', async () => {
  const command = buildMcpRestartCommand();
  assert.match(command, /MCP_GIT_REVISION="\$\(git rev-parse HEAD\)"/);
  assert.match(command, /docker compose up -d --build/);

  const dockerfile = await readFile('Dockerfile', 'utf8');
  const compose = await readFile('docker-compose.yml', 'utf8');
  assert.match(dockerfile, /ARG GIT_REVISION=unknown/);
  assert.match(dockerfile, /org\.opencontainers\.image\.revision="\$\{GIT_REVISION\}"/);
  assert.match(dockerfile, /org\.opencontainers\.image\.source="https:\/\/github\.com\/Patricked-code\/MCP"/);
  assert.match(compose, /GIT_REVISION: \$\{MCP_GIT_REVISION:-unknown\}/);
});
