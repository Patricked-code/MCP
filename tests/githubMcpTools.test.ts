import assert from 'node:assert/strict';
import test from 'node:test';
import {
  GitHubToolError,
  assertMcpBranchName,
  assertSafeCommitFiles,
  publicSafeError,
  redactGitHubToolMetadata
} from '../src/github/mcpTools.js';
import {
  assertNoSecretLikeContent,
  assertPublicSafeFileContent,
  assertSafeCommitMessage,
  assertSafePullRequestBody,
  assertSafePullRequestTitle,
  detectSecretLikeContent,
  isSensitiveGitHubPath
} from '../src/github/secretSafety.js';

function mustDetectSecret(value: string): { code: string; label: string } {
  const detection = detectSecretLikeContent(value);
  assert.notEqual(detection, null);
  return detection as { code: string; label: string };
}

test('GitHub MCP write helpers allow only mcp scoped branches', () => {
  assert.equal(assertMcpBranchName('mcp/onboarding-setup'), 'mcp/onboarding-setup');
  assert.equal(assertMcpBranchName('mcp/github-tools-implementation'), 'mcp/github-tools-implementation');

  assert.throws(() => assertMcpBranchName('main'), /mcp\/*/);
  assert.throws(() => assertMcpBranchName('master'), /mcp\/*/);
  assert.throws(() => assertMcpBranchName('feature/test'), /mcp\/*/);
  assert.throws(() => assertMcpBranchName('mcp/../main'), /mcp\/*|invalide/);
});

test('GitHub MCP commit helper rejects secret-like files and unsafe paths', () => {
  assert.deepEqual(assertSafeCommitFiles([
    { path: '.mcp/manifest.json', content: '{"ok":true}\n' },
    { path: 'MCP_PROJECT.md', content: '# Project\n' }
  ]).map((file) => file.path), ['.mcp/manifest.json', 'MCP_PROJECT.md']);

  assert.throws(() => assertSafeCommitFiles([{ path: '.env', content: 'TOKEN=value' }]), /sensible|interdit/);
  assert.throws(() => assertSafeCommitFiles([{ path: 'secrets/private.pem', content: 'BEGIN PRIVATE KEY' }]), /sensible|interdit/);
  assert.throws(() => assertSafeCommitFiles([{ path: '../outside.md', content: 'bad' }]), /Chemin|interdit/);
});

test('GitHub MCP commit helper rejects secret-like content before API writes', () => {
  assert.throws(
    () => assertSafeCommitFiles([{ path: 'docs/public.md', content: 'github_pat_1234567890abcdef' }]),
    /GitHub fine-grained token/
  );
  assert.throws(
    () => assertSafeCommitFiles([{ path: 'docs/public.md', content: '-----BEGIN OPENSSH PRIVATE KEY-----' }]),
    /private key/
  );
  assert.throws(
    () => assertSafeCommitFiles([{ path: 'docs/public.md', content: 'TOKEN=abc123456789' }]),
    /.env-style secret assignment/
  );
});

test('GitHub MCP secret safety detects token and key content', () => {
  assert.equal(detectSecretLikeContent('safe public documentation'), null);
  assert.equal(mustDetectSecret('token github_pat_1234567890abcdef').code, 'github_fine_grained_token_signal_detected');
  assert.equal(mustDetectSecret('-----BEGIN OPENSSH PRIVATE KEY-----').code, 'private_key_block_detected');
  assert.equal(mustDetectSecret('TOKEN=abc123456789').code, 'env_secret_assignment_detected');

  assert.throws(
    () => assertNoSecretLikeContent('Authorization: Bearer abcdefghijklmnopqrstuvwxyz', 'pull_request_body', 'body'),
    /Contenu sensible interdit/
  );
});

test('GitHub MCP secret safety rejects sensitive filenames and public text leaks', () => {
  assert.equal(isSensitiveGitHubPath('.npmrc'), true);
  assert.equal(isSensitiveGitHubPath('secrets/credentials.json'), true);
  assert.equal(isSensitiveGitHubPath('.ssh/config'), true);
  assert.equal(isSensitiveGitHubPath('docs/public.md'), false);

  assert.equal(assertSafeCommitMessage('docs: add public MCP notes'), 'docs: add public MCP notes');
  assert.equal(assertSafePullRequestTitle('Add controlled GitHub MCP tools'), 'Add controlled GitHub MCP tools');
  assert.equal(assertSafePullRequestBody('Public-safe PR body'), 'Public-safe PR body');
  assert.equal(assertPublicSafeFileContent('docs/public.md', '# Public\n'), '# Public\n');

  assert.throws(() => assertSafeCommitMessage('docs: leak ghp_1234567890abcdef'), /GitHub classic token/);
  assert.throws(() => assertSafePullRequestTitle('Leak github_pat_1234567890abcdef'), /GitHub fine-grained token/);
  assert.throws(() => assertSafePullRequestBody('-----BEGIN PRIVATE KEY-----'), /private key/);
  assert.throws(() => assertPublicSafeFileContent('docs/public.md', 'PASSWORD=secret-value'), /.env-style secret assignment/);
});

test('GitHub MCP audit metadata redacts token and private key signals', () => {
  const redacted = redactGitHubToolMetadata({
    token: 'ghp_should_not_survive',
    nested: {
      privateKey: 'BEGIN PRIVATE KEY',
      safe: 'kept'
    },
    visible: 'github_pat_1234567890abcdef'
  }) as Record<string, unknown>;

  assert.equal(redacted.token, '[redacted]');
  assert.deepEqual(redacted.nested, { privateKey: '[redacted]', safe: 'kept' });
  assert.equal(redacted.visible, '[redacted]');
});

test('GitHub MCP public error format does not expose stack traces', () => {
  const error = publicSafeError(new GitHubToolError('branch_must_be_mcp_scoped', 'Only mcp branches are allowed'));
  assert.equal(error.ok, false);
  assert.equal(error.error, 'branch_must_be_mcp_scoped');
  assert.equal(Object.hasOwn(error, 'stack'), false);
});
