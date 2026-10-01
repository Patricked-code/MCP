import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import {
  deriveCapabilityReality,
  projectRegisteredCapabilityRealities
} from '../src/governance/operationalDecision.js';
import { deriveToolSurfaceProjection } from '../src/governance/toolSurfaceAttestation.js';
import { createAtomicJsonStore } from '../src/operationalMemory/atomicStore.js';
import { createOperationalEventJournal } from '../src/operationalMemory/eventJournal.js';
import type { GovernedLockService } from '../src/operationalMemory/lockService.js';
import {
  createGovernedSessionService,
  type GovernedSessionService,
  type RequestIdentity
} from '../src/operationalMemory/sessionService.js';
import { createTransportBindings } from '../src/operationalMemory/transportBindings.js';
import {
  SessionStoreDocumentSchema,
  createEmptySessionStoreDocument,
  type ClientToolSurfaceAttestation
} from '../src/operationalMemory/types.js';

process.env.MCP_AUTH_TOKEN ??= 'mcp-unit-test-value-20260805-abcdef';
process.env.S1_HOST ??= '127.0.0.1';
process.env.S1_KEY_PATH ??= '/tmp/mcp-unit-test-s1-key';
process.env.S2_HOST ??= '127.0.0.1';
process.env.S2_KEY_PATH ??= '/tmp/mcp-unit-test-s2-key';

const { registerGovernedSessionTools } = await import('../src/tools/governedSessions.js');

const SESSION_ID = '11111111-1111-4111-8111-111111111111';
const OBSERVED_AT = '2026-10-01T20:00:00.000Z';
const WITHIN = '2026-10-01T20:02:00.000Z';
const AFTER = '2026-10-01T20:05:00.000Z';

function attestation(): ClientToolSurfaceAttestation {
  return {
    schemaVersion: 1,
    attestationId: '22222222-2222-4222-8222-222222222222',
    governedSessionId: SESSION_ID,
    connectionContextId: null,
    surface: 'chatgpt_connector',
    observedAt: OBSERVED_AT,
    expiresAt: '2026-10-01T20:05:00.000Z',
    capabilities: [
      { name: 'mcp_alpha', callability: 'CALLABLE', source: 'CLIENT_ATTESTATION', provider: 'wealthtech_mcp', repositoryScope: 'Patricked-code/MCP' },
      { name: 'mcp_beta', callability: 'NOT_CALLABLE', source: 'CLIENT_ATTESTATION', provider: 'wealthtech_mcp', repositoryScope: 'Patricked-code/MCP' },
      { name: 'github.repository.write', callability: 'CALLABLE', source: 'CLIENT_ATTESTATION', provider: 'github', repositoryScope: 'Patricked-code/MCP' }
    ],
    provenance: ['client_attestation']
  };
}

const CATALOGUE = [{ name: 'mcp_alpha' }, { name: 'mcp_beta' }, { name: 'mcp_gamma' }];

test('without a client attestation the client surface stays UNKNOWN and is never inferred from the server catalogue', () => {
  const projection = deriveToolSurfaceProjection({
    catalogueTools: CATALOGUE,
    catalogueDigest: 'b'.repeat(64),
    attestation: null,
    now: WITHIN
  });

  assert.equal(projection.authoritative, false);
  assert.deepEqual(projection.server, {
    authority: 'current_state_tool_catalog',
    catalogueDigest: 'b'.repeat(64),
    toolCount: 3
  });
  assert.equal(projection.client.status, 'UNKNOWN');
  assert.deepEqual(projection.client.reasonCodes, ['CLIENT_TOOL_SURFACE_UNATTESTED']);
  assert.equal(projection.comparison, null);
  assert.equal(projection.clientAttestationAuthorizes, false);
  assert.equal(projection.serverCatalogueProvesClientSurface, false);
});

test('a current attestation is compared with the server catalogue without authorizing anything', () => {
  const projection = deriveToolSurfaceProjection({
    catalogueTools: CATALOGUE,
    catalogueDigest: 'b'.repeat(64),
    attestation: attestation(),
    now: WITHIN
  });

  assert.equal(projection.client.status, 'ATTESTED');
  assert.equal(projection.client.attestationId, '22222222-2222-4222-8222-222222222222');
  assert.equal(projection.client.surface, 'chatgpt_connector');
  assert.equal(projection.client.capabilityCount, 3);
  assert.deepEqual(projection.comparison, {
    attestedServerToolCount: 2,
    callableServerToolCount: 1,
    notCallableServerTools: ['mcp_beta'],
    attestedOutsideServerCatalogueCount: 1
  });
  assert.equal(projection.clientAttestationAuthorizes, false);
});

test('an expired attestation projects EXPIRED and is never reused as current evidence', () => {
  const projection = deriveToolSurfaceProjection({
    catalogueTools: CATALOGUE,
    catalogueDigest: null,
    attestation: attestation(),
    now: AFTER
  });

  assert.equal(projection.client.status, 'EXPIRED');
  assert.deepEqual(projection.client.reasonCodes, ['CLIENT_TOOL_SURFACE_ATTESTATION_EXPIRED']);
  assert.equal(projection.comparison, null);
});

test('capability reality takes callability from a current attestation but never authorization', () => {
  const realities = new Map(
    projectRegisteredCapabilityRealities(CATALOGUE, WITHIN, attestation())
      .map((entry) => [entry.toolName, entry])
  );

  const alpha = realities.get('mcp_alpha')!;
  assert.deepEqual(alpha.callability, { status: 'CALLABLE', source: 'CLIENT_ATTESTATION' });
  assert.equal(alpha.authorized.status, 'UNKNOWN');
  assert.equal(alpha.safeNow, false);
  assert.deepEqual(alpha.provenance, ['runtime_catalogue', 'client_attestation']);

  const beta = realities.get('mcp_beta')!;
  assert.equal(beta.callability.status, 'NOT_CALLABLE');
  assert.ok(beta.reasonCodes.includes('CLIENT_OR_TRANSPORT_ACTION_NOT_EXPOSED'));

  assert.deepEqual(realities.get('mcp_gamma'), deriveCapabilityReality({
    toolName: 'mcp_gamma',
    registered: true,
    governanceSafe: true,
    observedAt: WITHIN,
    provenance: ['runtime_catalogue']
  }));
});

test('a stale attestation projects UNKNOWN callability and stays backward compatible when absent', () => {
  const stale = projectRegisteredCapabilityRealities(CATALOGUE, AFTER, attestation())
    .find((entry) => entry.toolName === 'mcp_alpha')!;
  assert.deepEqual(stale.callability, { status: 'UNKNOWN', source: 'CLIENT_ATTESTATION' });
  assert.ok(stale.provenance.includes('client_attestation:stale'));
  assert.ok(stale.reasonCodes.includes('CALLABILITY_UNATTESTED'));

  assert.deepEqual(
    projectRegisteredCapabilityRealities(CATALOGUE, WITHIN, null),
    projectRegisteredCapabilityRealities(CATALOGUE, WITHIN)
  );
});

const OAUTH_IDENTITY: RequestIdentity = {
  principalId: 'oauth:user:123',
  clientId: 'chatgpt-client',
  assurance: 'oauth_subject'
};

async function sessionFixture(now: () => Date) {
  const directory = await mkdtemp(join(tmpdir(), 'mcp-tool-surface-'));
  const audits: string[] = [];
  const store = createAtomicJsonStore({
    filePath: join(directory, 'sessions.json'),
    schema: SessionStoreDocumentSchema,
    empty: createEmptySessionStoreDocument
  });
  const service = createGovernedSessionService({
    store,
    bindings: createTransportBindings(),
    idleTtlSeconds: 86_400,
    resumeGraceSeconds: 604_800,
    now,
    getLiveState: async () => ({ stateVersion: 9 }),
    audit: { async record(input: { type: string }) { audits.push(input.type); } }
  });
  const opened = await service.openSession({
    repository: 'Patricked-code/MCP',
    taskScope: 'TB-W4-G3-01',
    workBranch: null,
    agentIdentity: 'claude-code',
    blockers: [],
    nextAction: null
  }, { transportSessionId: 'transport-g3', identity: OAUTH_IDENTITY });
  return { directory, service, opened, audits };
}

const ATTEST_CAPABILITIES = [{
  name: 'mcp_get_current_state_inventory',
  callability: 'CALLABLE' as const,
  provider: 'wealthtech_mcp',
  repositoryScope: 'Patricked-code/MCP' as const
}];

test('the session service records a bounded attestation stamped with server time', async () => {
  const at = new Date('2026-10-01T21:00:00.000Z');
  const { directory, service, opened, audits } = await sessionFixture(() => at);
  try {
    const request = { transportSessionId: 'transport-g3', identity: OAUTH_IDENTITY };
    const updated = await service.attestClientToolSurface({
      governedSessionId: opened.session.governedSessionId,
      expectedSessionRevision: opened.session.sessionRevision,
      surface: 'chatgpt_connector',
      capabilities: ATTEST_CAPABILITIES,
      provenance: ['tools_list'],
      validitySeconds: 900
    }, request);

    const recorded = updated.clientToolSurfaceAttestation!;
    assert.equal(recorded.governedSessionId, opened.session.governedSessionId);
    assert.equal(recorded.connectionContextId, opened.session.connectionContext?.connectionContextId ?? null);
    assert.equal(recorded.observedAt, '2026-10-01T21:00:00.000Z');
    assert.equal(recorded.expiresAt, '2026-10-01T21:05:00.000Z');
    assert.equal(recorded.capabilities[0]?.source, 'CLIENT_ATTESTATION');
    assert.deepEqual(recorded.provenance, ['client_attestation', 'tools_list']);
    assert.equal(updated.sessionRevision, opened.session.sessionRevision + 1);
    assert.ok(audits.includes('client.tool_surface_attested'));

    await assert.rejects(service.attestClientToolSurface({
      governedSessionId: opened.session.governedSessionId,
      expectedSessionRevision: opened.session.sessionRevision,
      surface: 'chatgpt_connector',
      capabilities: ATTEST_CAPABILITIES
    }, request), /SESSION_REVISION_MISMATCH/);

    await assert.rejects(service.attestClientToolSurface({
      governedSessionId: opened.session.governedSessionId,
      expectedSessionRevision: updated.sessionRevision,
      surface: 'chatgpt_connector',
      capabilities: [{ ...ATTEST_CAPABILITIES[0]!, repositoryScope: 'Other/Repository' as 'Patricked-code/MCP' }]
    }, request), /CLIENT_TOOL_SURFACE_ATTESTATION_INVALID/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('the operational journal accepts the attestation event only with bounded metadata', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'mcp-tool-surface-journal-'));
  try {
    const filePath = join(directory, 'events.jsonl');
    const journal = createOperationalEventJournal({ filePath, maxBytes: 1_000_000, archives: 1 });
    await journal.append({
      type: 'client.tool_surface_attested',
      governedSessionId: SESSION_ID,
      metadata: {
        attestationId: '22222222-2222-4222-8222-222222222222',
        surface: 'chatgpt_connector',
        capabilityCount: 3,
        sessionRevision: 4
      }
    });
    await assert.rejects(journal.append({
      type: 'client.tool_surface_attested',
      governedSessionId: SESSION_ID,
      metadata: { capabilities: 'mcp_alpha' }
    }), /OPERATIONAL_EVENT_METADATA_FORBIDDEN/);
    assert.match(await readFile(filePath, 'utf8'), /"type":"client.tool_surface_attested"/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('the attestation tool takes no client-supplied timestamps and delegates to the session service', async () => {
  const shapes = new Map<string, Record<string, unknown>>();
  const handlers = new Map<string, (input: unknown, extra: unknown) => Promise<{ content: Array<{ text: string }> }>>();
  const server = {
    tool(name: string, ...args: unknown[]) {
      shapes.set(name, (args.length >= 3 ? args[1] : {}) as Record<string, unknown>);
      handlers.set(name, args.at(-1) as never);
      return undefined;
    }
  } as unknown as McpServer;
  let observed: unknown = null;
  const sessions = {
    async attestClientToolSurface(input: unknown) {
      observed = input;
      return { governedSessionId: SESSION_ID };
    }
  } as unknown as GovernedSessionService;
  registerGovernedSessionTools(server, { sessions, locks: {} as GovernedLockService });

  const shape = shapes.get('mcp_attest_client_tool_surface');
  assert.ok(shape, 'mcp_attest_client_tool_surface must be registered');
  for (const forbidden of ['observedAt', 'expiresAt', 'attestationId', 'connectionContextId', 'source']) {
    assert.equal(forbidden in shape, false, forbidden);
  }

  const result = await handlers.get('mcp_attest_client_tool_surface')!({
    governedSessionId: SESSION_ID,
    expectedSessionRevision: 3,
    surface: 'chatgpt_connector',
    capabilities: ATTEST_CAPABILITIES
  }, {
    sessionId: 'transport-raw-A',
    authInfo: {
      token: 'must-never-be-returned',
      clientId: 'chatgpt-client',
      scopes: ['mcp:read'],
      extra: { governedPrincipalId: 'oauth:user:123', identityAssurance: 'oauth_subject' }
    }
  });
  assert.equal(JSON.parse(result.content[0]!.text).ok, true);
  assert.deepEqual((observed as { surface: string }).surface, 'chatgpt_connector');
  assert.equal(JSON.stringify(result).includes('must-never-be-returned'), false);
});
