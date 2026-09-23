import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const workflow = await readFile(
  new URL('../.github/workflows/mcp-readonly-evidence.yml', import.meta.url),
  'utf8'
);
const policy = JSON.parse(await readFile(
  new URL('../.mcp/github-first-operational-policy.json', import.meta.url),
  'utf8'
));

test('GitHub issue can trigger the bounded read-only evidence fallback', () => {
  assert.match(workflow, /issues:\s*[\s\S]*?opened/);
  assert.match(workflow, /MCP_READONLY_EVIDENCE_REQUEST/);
  assert.match(workflow, /collaborators\/\$\{REQUEST_ACTOR\}\/permission/);
  assert.match(workflow, /admin\|maintain\|write/);
  assert.match(workflow, /fallback_environment_name=mcp-/);
  assert.equal(
    policy.executionModes.GITHUB_ACTION_READONLY_EVIDENCE.issueTitle,
    'MCP_READONLY_EVIDENCE_REQUEST'
  );
});


test('GitHub OIDC is the primary read-only evidence transport', () => {
  assert.match(workflow, /collect_oidc:/);
  assert.match(workflow, /id-token:\s*write/);
  assert.match(
    workflow,
    /https:\/\/mcp\.wealthtechinnovations\.com\/evidence\/github\/readonly/
  );
  assert.match(workflow, /\/evidence\/github\/readonly/);
  assert.match(workflow, /transport:\s*'github_oidc_mcp_readonly'/);
  assert.match(workflow, /collect_ssh_fallback:/);
  assert.match(
    workflow,
    /needs\.collect_oidc\.result == 'failure'/
  );
});

test('fallback request schema is closed and contains no command field', () => {
  assert.match(workflow, /\['probe','requestId','schemaVersion','target'\]/);
  assert.match(workflow, /mcp_git_status/);
  assert.match(workflow, /stablecoin_frontend_git_status/);
  assert.match(workflow, /stablecoin_backend_git_status/);
  assert.match(workflow, /stablecoin_backend_inventory/);
  assert.match(workflow, /stablecoin_backend_runtime_ownership/);
  assert.match(workflow, /stablecoin_runtime_status/);
  assert.doesNotMatch(workflow, /['"]command['"]\s*:/);
  assert.doesNotMatch(workflow, /DISPATCH_COMMAND|REQUEST_COMMAND|ISSUE_COMMAND/);
});

test('SSH transport is strict-host-key and protected-environment based', () => {
  assert.match(workflow, /MCP_READONLY_SSH_HOST/);
  assert.match(workflow, /MCP_READONLY_SSH_PRIVATE_KEY/);
  assert.match(workflow, /MCP_READONLY_SSH_KNOWN_HOSTS/);
  assert.match(workflow, /BatchMode=yes/);
  assert.match(workflow, /IdentitiesOnly=yes/);
  assert.match(workflow, /StrictHostKeyChecking=yes/);
  assert.match(workflow, /UserKnownHostsFile=/);
});

test('OIDC failures expose only bounded allowlisted diagnostic fields', () => {
  assert.match(workflow, /read_policy_rejected/);
  assert.match(workflow, /read_transport_failed/);
  assert.match(workflow, /remote_exit_nonzero/);
  assert.match(workflow, /Read-only evidence endpoint failed:/);
  assert.match(workflow, /body\.reasonCode/);
  assert.match(workflow, /body\.exitCode/);
  assert.doesNotMatch(workflow, /process\.stderr\.write\([^\n]*RESPONSE/);
  assert.doesNotMatch(workflow, /printf[^\n]*\$RESPONSE/);
});

test('read-only evidence workflow contains no server mutation primitives', () => {
  const forbidden = [
    /\bgit\s+pull\b/i,
    /\bgit\s+merge\b/i,
    /\bgit\s+rebase\b/i,
    /\bgit\s+reset\b/i,
    /\bgit\s+checkout\b/i,
    /\bgit\s+switch\b/i,
    /\bgit\s+commit\b/i,
    /\bgit\s+push\b/i,
    /\bscp\b/i,
    /\brsync\b/i,
    /\beval\b/i,
    /\bsystemctl\b/i,
    /\bdocker\s+compose\b/i,
    /\bdocker\s+restart\b/i,
    /\brm\s+-rf\b/i,
    /\bsed\s+-i\b/i,
    /\btouch\b/i
  ];
  for (const pattern of forbidden) {
    assert.doesNotMatch(workflow, pattern);
  }
});

test('evidence result is artifact-backed and explicitly non-mutating', () => {
  assert.match(workflow, /actions\/upload-artifact@v4/);
  assert.match(workflow, /outputSha256/);
  assert.match(workflow, /mutationAllowed:\s*false/);
  assert.match(workflow, /mutationAllowed=false/);
  assert.equal(
    policy.bootstrap.runtimeMcpIsBootstrapPrerequisite,
    false
  );
  assert.equal(
    policy.executionModes.GITHUB_ACTION_READONLY_EVIDENCE.mutationAllowed,
    false
  );
});
