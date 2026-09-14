import assert from 'node:assert/strict';
import test from 'node:test';

import {
  deriveCapabilityReality,
  projectRegisteredCapabilityRealities
} from '../src/governance/operationalDecision.js';
import { GovernedSessionRecordSchema } from '../src/operationalMemory/types.js';

const NOW = '2026-09-15T00:00:00.000Z';
const SESSION_ID = '11111111-1111-4111-8111-111111111111';

function historicalSession() {
  return {
    schemaVersion: 1,
    governedSessionId: SESSION_ID,
    repository: 'Patricked-code/MCP',
    taskScope: 'TASK-20260914-002',
    workBranch: 'mcp/g3-client-tool-surface-attestation-20260914',
    agentIdentity: 'chatgpt',
    ownerPrincipalId: 'oauth:wealthtech-mcp-admin',
    identityAssurance: 'oauth_subject',
    resumeSecretHash: 'a'.repeat(64),
    status: 'ACTIVE',
    createdAt: NOW,
    resumedAt: null,
    lastHeartbeatAt: NOW,
    pausedAt: null,
    expiredAt: null,
    closedAt: null,
    currentTransport: null,
    lastAcknowledgedStateVersion: 221,
    bootstrapReceipt: null,
    connectionContext: null,
    sessionRevision: 1,
    lastCheckpoint: null,
    blockers: [],
    nextAction: null,
    lockIds: [],
    resumePolicy: 'stable_principal_or_resume_secret'
  };
}

function safeAttestation() {
  return {
    schemaVersion: 1,
    attestationId: '22222222-2222-4222-8222-222222222222',
    governedSessionId: SESSION_ID,
    connectionContextId: null,
    surface: 'github_native_client',
    observedAt: NOW,
    expiresAt: '2026-09-15T00:05:00.000Z',
    capabilities: [{
      name: 'github.repository.write',
      callability: 'CALLABLE',
      source: 'CLIENT_ATTESTATION',
      provider: 'github',
      repositoryScope: 'Patricked-code/MCP'
    }],
    provenance: ['client_attestation']
  };
}

test('G3 RED: governed session accepts a bounded current client tool surface attestation', () => {
  const parsed = GovernedSessionRecordSchema.safeParse({
    ...historicalSession(),
    clientToolSurfaceAttestation: safeAttestation()
  });

  assert.equal(
    parsed.success,
    true,
    'missing G3 integration slot: GovernedSession rejects clientToolSurfaceAttestation'
  );
});

test('G3 contract: absence of client attestation remains UNKNOWN and fail-closed', () => {
  const parsed = GovernedSessionRecordSchema.safeParse(historicalSession());
  assert.equal(parsed.success, true);

  const reality = deriveCapabilityReality({
    toolName: 'github.repository.write',
    registered: true,
    governanceSafe: true,
    observedAt: NOW
  });

  assert.equal(reality.callability.status, 'UNKNOWN');
  assert.equal(reality.authorized.status, 'UNKNOWN');
  assert.equal(reality.safeNow, false);
});

test('G3 contract: stale client evidence projects UNKNOWN/fail-closed rather than authorization', () => {
  const reality = deriveCapabilityReality({
    toolName: 'github.repository.write',
    registered: true,
    callability: { status: 'UNKNOWN', source: 'CLIENT_ATTESTATION' },
    governanceSafe: true,
    observedAt: NOW,
    provenance: ['client_attestation:stale']
  });

  assert.equal(reality.callability.status, 'UNKNOWN');
  assert.equal(reality.authorized.status, 'UNKNOWN');
  assert.equal(reality.safeNow, false);
  assert.ok(reality.reasonCodes.includes('CALLABILITY_UNATTESTED'));
  assert.ok(reality.reasonCodes.includes('AUTHORIZATION_UNATTESTED'));
});

test('G3 contract: CLIENT_ATTESTATION alone never implies AUTHORIZED or safeNow', () => {
  const reality = deriveCapabilityReality({
    toolName: 'github.repository.write',
    registered: true,
    callability: { status: 'CALLABLE', source: 'CLIENT_ATTESTATION' },
    governanceSafe: true,
    observedAt: NOW,
    provenance: ['client_attestation']
  });

  assert.equal(reality.authorized.status, 'UNKNOWN');
  assert.equal(reality.safeNow, false);
  assert.ok(reality.requiredEvidence.includes('authorization_attestation'));
});

test('G3 contract: provenance remains bounded by de-duplication in CapabilityReality', () => {
  const reality = deriveCapabilityReality({
    toolName: 'github.repository.write',
    registered: true,
    callability: { status: 'CALLABLE', source: 'CLIENT_ATTESTATION' },
    governanceSafe: true,
    observedAt: NOW,
    provenance: ['client_attestation', 'client_attestation']
  });

  assert.deepEqual(reality.provenance, ['client_attestation']);
});

test('G3 contract: secret-like attestation payload is not accepted by the current governed session boundary', () => {
  const parsed = GovernedSessionRecordSchema.safeParse({
    ...historicalSession(),
    clientToolSurfaceAttestation: {
      ...safeAttestation(),
      secret: 'ghp_example_should_never_persist'
    }
  });

  assert.equal(parsed.success, false);
});

test('G3 contract: historical governed session records remain compatible', () => {
  const parsed = GovernedSessionRecordSchema.safeParse(historicalSession());
  assert.equal(parsed.success, true);
});

test('G3 contract: historical CapabilityReality defaults remain unchanged', () => {
  const reality = deriveCapabilityReality({
    toolName: 'mcp_ping',
    registered: true,
    governanceSafe: true,
    observedAt: NOW
  });

  assert.equal(reality.callability.status, 'UNKNOWN');
  assert.equal(reality.callability.source, 'SERVER');
  assert.equal(reality.authorized.status, 'UNKNOWN');
  assert.equal(reality.safeNow, false);
});

test('G3 contract: runtime catalogue projection semantics remain unchanged', () => {
  const [reality] = projectRegisteredCapabilityRealities(
    [{ name: 'mcp_ping' }],
    NOW
  );

  assert.ok(reality);
  assert.equal(reality.toolName, 'mcp_ping');
  assert.equal(reality.registered, true);
  assert.equal(reality.callability.status, 'UNKNOWN');
  assert.equal(reality.callability.source, 'SERVER');
  assert.equal(reality.authorized.status, 'UNKNOWN');
  assert.equal(reality.safeNow, false);
  assert.deepEqual(reality.provenance, ['runtime_catalogue']);
});
