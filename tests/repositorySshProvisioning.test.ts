import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  buildRepositorySshCaBootstrapCommand,
  repositorySshForceCommand,
  validateRepositorySshPublicKey
} from '../src/ssh/repositoryAccess.js';
import {
  repositorySshOidcPolicyFor
} from '../src/deploy/githubOidc.js';

const SERVER = new URL('../src/server.ts', import.meta.url);
const GATEWAY = new URL('../scripts/governed-repository-ssh-gateway.sh', import.meta.url);
const BOOTSTRAP_WORKFLOW = new URL('../.github/workflows/repository-ssh-ca-bootstrap.yml', import.meta.url);

test('repository SSH public keys accept only bounded ed25519 material', () => {
  const valid = 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIG7mYl9jN0VXQm9uZGVkS2V5Rm9yVGVzdA governed-repo:Patricked-code/Gouvern';
  assert.equal(validateRepositorySshPublicKey(valid), valid);
  assert.throws(() => validateRepositorySshPublicKey('ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQ test'));
  assert.throws(() => validateRepositorySshPublicKey('ssh-ed25519 bad;rm -rf /'));
  assert.throws(() => validateRepositorySshPublicKey(''));
});

test('repository SSH certificate force-command is fixed, repo-bound and shell-free', () => {
  const command = repositorySshForceCommand('Patricked-code/Gouvern');
  assert.equal(
    command,
    '/bin/bash /opt/apps/wealthtech-mcp-ssh-bridge/scripts/governed-repository-ssh-gateway.sh Patricked-code/Gouvern'
  );
  assert.throws(() => repositorySshForceCommand('Patricked-code/Gouvern;id'));
  assert.throws(() => repositorySshForceCommand('../Gouvern'));
});

test('CA bootstrap is explicit, fixed-path and never exposes the CA private key', () => {
  const command = buildRepositorySshCaBootstrapCommand();
  assert.match(command, /ssh-keygen -t ed25519/);
  assert.match(command, /wealthtech-governed-repo-ssh-ca/);
  assert.match(command, /TrustedUserCAKeys/);
  assert.match(command, /sshd -t/);
  assert.match(command, /systemctl reload ssh/);
  assert.match(command, /ssh-keygen -lf/);
  assert.doesNotMatch(command, /cat .*governed_repo_ssh_ca(\s|$)/);
  assert.doesNotMatch(command, /BEGIN OPENSSH PRIVATE KEY/);
});

test('OIDC certificate policy is dynamically bound to the governed repository workflow', () => {
  const policy = repositorySshOidcPolicyFor('Patricked-code/Gouvern');
  assert.equal(policy.audience, 'https://mcp.wealthtechinnovations.com/access/github/repository-ssh');
  assert.equal(policy.repository, 'Patricked-code/Gouvern');
  assert.equal(policy.ref, 'refs/heads/main');
  assert.equal(
    policy.workflowRef,
    'Patricked-code/Gouvern/.github/workflows/governed-local-entry.yml@refs/heads/main'
  );
  assert.deepEqual(policy.allowedEvents, ['issue_comment', 'workflow_dispatch']);
  assert.throws(() => repositorySshOidcPolicyFor('evil-owner/Gouvern'));
});

test('forced SSH gateway exposes only closed read-only discovery commands', async () => {
  const source = await readFile(GATEWAY, 'utf8');
  for (const command of [
    'ping',
    'project-context',
    'list-domains-s1',
    'list-domains-s2',
    'docker-status-s1',
    'docker-status-s2',
    'write-tools-context'
  ]) {
    assert.match(source, new RegExp(command.replaceAll('-', '\\-')));
  }
  assert.match(source, /SSH_ORIGINAL_COMMAND/);
  assert.match(source, /repositoryGatewayCli/);
  assert.match(source, /docker exec wealthtech_mcp_ssh_bridge/);
  assert.doesNotMatch(source, /\beval\b|\bexec\s+\$SSH_ORIGINAL_COMMAND|bash\s+-c\s+["']?\$SSH_ORIGINAL_COMMAND/);
});

test('server registers the repository SSH certificate broker before general web JSON parsing', async () => {
  const source = await readFile(SERVER, 'utf8');
  const broker = source.indexOf('createGithubRepositorySshAccessRouter');
  const json = source.indexOf("app.use(express.json({ limit: '2mb' }))");
  assert.ok(broker >= 0, 'repository SSH broker missing');
  assert.ok(json >= 0, 'global JSON parser missing');
  assert.ok(broker < json, 'SSH broker must be isolated before general web routes');
  assert.match(source, /verifyGithubRepositorySshOidcToken/);
  assert.match(source, /signRepositorySshCertificate/);
});


test('CA bootstrap workflow is manual, exact-main, OIDC-only and contains no SSH secret', async () => {
  const source = await readFile(BOOTSTRAP_WORKFLOW, 'utf8');
  assert.match(source, /workflow_dispatch:/);
  assert.match(source, /id-token:\s*write/);
  assert.match(source, /contents:\s*read/);
  assert.match(source, /github\.ref == 'refs\/heads\/main'/);
  assert.match(source, /access\/github\/repository-ssh\/ca\/bootstrap/);
  assert.match(source, /ACTIONS_ID_TOKEN_REQUEST_URL/);
  assert.match(source, /GITHUB_SHA/);
  assert.doesNotMatch(source, /secrets\.|PRIVATE_KEY|sshpass|scp\s|rsync\s/i);
});
