import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

import { resolveGithubFirstOperationalBootstrap } from '../src/governedContext/githubFirstOperationalContinuity.js';

const HEAD = '030ae3ab3444b5f9e30212bf9b8db0dee7815119';

function base() {
  return {
    githubConnected: true,
    repository: 'Patricked-code/MCP',
    observedHeadSha: HEAD,
    needs: {
      repositoryRead: true,
      repositoryWrite: false,
      serverReadEvidence: false,
      serverWrite: false,
      operationalMemoryMutation: false,
      runtimeToolInvocation: false
    },
    fallback: {
      readonlyEvidenceWorkflowAvailable: false,
      readonlyEvidenceEnvironmentConfigured: false
    }
  };
}

test('GitHub connection is sufficient for repository-only continuation', () => {
  const result = resolveGithubFirstOperationalBootstrap(base());
  assert.equal(result.mode, 'GITHUB_ONLY');
  assert.equal(result.githubBootstrapAllowed, true);
  assert.equal(result.runtimeMcpRequiredNow, false);
  assert.equal(result.explicitBridgeExposureRequiredNow, false);
});

test('GitHub read-only evidence fallback avoids bridge exposure when configured', () => {
  const input = base();
  input.needs.serverReadEvidence = true;
  input.fallback.readonlyEvidenceWorkflowAvailable = true;
  input.fallback.readonlyEvidenceEnvironmentConfigured = true;

  const result = resolveGithubFirstOperationalBootstrap(input);
  assert.equal(result.mode, 'GITHUB_ACTION_READONLY_EVIDENCE');
  assert.equal(result.runtimeMcpRequiredNow, false);
  assert.equal(result.explicitBridgeExposureRequiredNow, false);
  assert.equal(result.readonlyEvidenceFallbackSelected, true);
});

test('server write never becomes authorized by the read-only fallback', () => {
  const input = base();
  input.needs.serverReadEvidence = true;
  input.needs.serverWrite = true;
  input.fallback.readonlyEvidenceWorkflowAvailable = true;
  input.fallback.readonlyEvidenceEnvironmentConfigured = true;

  const result = resolveGithubFirstOperationalBootstrap(input);
  assert.equal(result.mode, 'RUNTIME_REQUIRED');
  assert.equal(result.runtimeMcpRequiredNow, true);
  assert.equal(result.readonlyEvidenceFallbackSelected, false);
});

test('operational memory mutations remain runtime-authority operations', () => {
  const input = base();
  input.needs.operationalMemoryMutation = true;

  const result = resolveGithubFirstOperationalBootstrap(input);
  assert.equal(result.mode, 'RUNTIME_REQUIRED');
  assert.equal(result.runtimeMcpRequiredNow, true);
});

test('missing read-only fallback escalates only the unresolved server evidence', () => {
  const input = base();
  input.needs.serverReadEvidence = true;

  const result = resolveGithubFirstOperationalBootstrap(input);
  assert.equal(result.mode, 'RUNTIME_REQUIRED');
  assert.equal(result.reasonCode, 'readonly_server_evidence_fallback_unavailable');
  assert.match(result.nextAction, /Continue all GitHub-safe work first/);
});

test('GitHub itself remains the only bootstrap prerequisite', () => {
  const input = base();
  input.githubConnected = false;

  const result = resolveGithubFirstOperationalBootstrap(input);
  assert.equal(result.mode, 'BLOCKED_GITHUB_CONNECTION_REQUIRED');
  assert.equal(result.githubBootstrapAllowed, false);
  assert.equal(result.runtimeMcpRequiredNow, false);
  assert.equal(result.explicitBridgeExposureRequiredNow, false);
});


test('machine policy preserves the GitHub client surface before bridge escalation', () => {
  const policy = JSON.parse(
    readFileSync('.mcp/github-first-operational-policy.json', 'utf8')
  ) as {
    bootstrap?: { bridgeExposureDefault?: boolean };
    clientSurfacePreservation?: {
      githubSurfacePreferred?: boolean;
      bridgeExposureDefault?: boolean;
      bridgeExposureMayEvictGithubSurface?: boolean;
      noSurfaceThrashing?: boolean;
      staleClientSchemaRule?: string;
    };
    invariants?: string[];
  };

  assert.equal(policy.bootstrap?.bridgeExposureDefault, false);
  assert.equal(policy.clientSurfacePreservation?.githubSurfacePreferred, true);
  assert.equal(policy.clientSurfacePreservation?.bridgeExposureDefault, false);
  assert.equal(policy.clientSurfacePreservation?.bridgeExposureMayEvictGithubSurface, true);
  assert.equal(policy.clientSurfacePreservation?.noSurfaceThrashing, true);
  assert.match(
    policy.clientSurfacePreservation?.staleClientSchemaRule ?? '',
    /not sufficient reason to request bridge exposure/i
  );
  assert.ok(
    policy.invariants?.includes(
      'DO_NOT_REQUEST_BRIDGE_FOR_CLIENT_SCHEMA_STALENESS_WHEN_GITHUB_FALLBACK_EXISTS'
    )
  );
  assert.ok(
    policy.invariants?.includes('NO_CLIENT_SURFACE_THRASHING')
  );
});
