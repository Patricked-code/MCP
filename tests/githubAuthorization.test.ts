import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildGithubAuthorizationRemediations,
  classifyGithubAuthorizationFailure
} from '../src/github/authorizationDiagnostics.js';

test('GitHub authorization diagnostic classifies successful responses', () => {
  assert.equal(classifyGithubAuthorizationFailure(200, null, 'repository'), 'none');
  assert.equal(classifyGithubAuthorizationFailure(201, null, 'pull_request'), 'none');
});

test('GitHub authorization diagnostic distinguishes authentication failures', () => {
  assert.equal(
    classifyGithubAuthorizationFailure(401, 'Bad credentials', 'authenticated_user'),
    'token_expired_or_revoked'
  );
  assert.equal(
    classifyGithubAuthorizationFailure(401, 'Requires authentication', 'authenticated_user'),
    'authentication_failed'
  );
});

test('GitHub authorization diagnostic distinguishes repository and PR visibility failures', () => {
  assert.equal(
    classifyGithubAuthorizationFailure(404, 'Not Found', 'repository'),
    'repository_not_visible_or_not_selected'
  );
  assert.equal(
    classifyGithubAuthorizationFailure(403, 'Resource not accessible by integration', 'pull_request_list'),
    'pull_request_permission_missing'
  );
  assert.equal(
    classifyGithubAuthorizationFailure(404, 'Not Found', 'pull_request'),
    'pull_request_permission_missing'
  );
});

test('GitHub authorization diagnostic recognizes rate limit and SSO failures', () => {
  assert.equal(
    classifyGithubAuthorizationFailure(403, 'API rate limit exceeded', 'repository'),
    'rate_limited'
  );
  assert.equal(
    classifyGithubAuthorizationFailure(403, 'Resource protected by organization SAML enforcement', 'repository'),
    'sso_authorization_required'
  );
});

test('GitHub authorization remediation remains least-privilege and repository-scoped', () => {
  const steps = buildGithubAuthorizationRemediations(
    'pull_request_permission_missing',
    'Patricked-code',
    'MCP'
  );

  assert.ok(steps.some((step) => step.includes('Pull requests: Read')));
  assert.ok(steps.some((step) => step.includes('Patricked-code/MCP')));
  assert.ok(steps.every((step) => !/token\s*[:=]/i.test(step)));
});
