import assert from 'node:assert/strict';
import test from 'node:test';
import {
  GitHubToolError,
  assertMcpBranchName,
  assertSafeCommitFiles,
  publicSafeError,
  redactGitHubToolMetadata
} from '../src/github/mcpTools.js';

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

test('GitHub MCP audit metadata redacts token and private key signals', () => {
  const redacted = redactGitHubToolMetadata({
    token: 'ghp_should_not_survive',
    nested: {
      privateKey: 'BEGIN PRIVATE KEY',
      safe: 'kept'
    }
  }) as Record<string, unknown>;

  assert.equal(redacted.token, '[redacted]');
  assert.deepEqual(redacted.nested, { privateKey: '[redacted]', safe: 'kept' });
});

test('GitHub MCP public error format does not expose stack traces', () => {
  const error = publicSafeError(new GitHubToolError('branch_must_be_mcp_scoped', 'Only mcp branches are allowed'));
  assert.equal(error.ok, false);
  assert.equal(error.error, 'branch_must_be_mcp_scoped');
  assert.equal(Object.hasOwn(error, 'stack'), false);
});
