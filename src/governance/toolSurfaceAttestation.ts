import type { ClientToolSurfaceAttestation } from '../operationalMemory/types.js';

const MAX_LISTED_TOOLS = 50;

export type ClientToolSurfaceStatus = 'ATTESTED' | 'EXPIRED' | 'UNKNOWN';

/**
 * G3 residual: compares the server-exposed surface (Current State tool catalog,
 * the only server authority) with the client-observed surface (a bounded,
 * session-bound client attestation). Read-only projection: the server catalogue
 * never proves what a client can call, and a client attestation never
 * authorizes anything.
 */
export type ToolSurfaceProjection = {
  schemaVersion: 1;
  authoritative: false;
  server: {
    authority: 'current_state_tool_catalog';
    catalogueDigest: string | null;
    toolCount: number;
  };
  client: {
    status: ClientToolSurfaceStatus;
    attestationId: string | null;
    surface: string | null;
    observedAt: string | null;
    expiresAt: string | null;
    capabilityCount: number;
    reasonCodes: string[];
  };
  comparison: {
    attestedServerToolCount: number;
    callableServerToolCount: number;
    notCallableServerTools: string[];
    attestedOutsideServerCatalogueCount: number;
  } | null;
  clientAttestationAuthorizes: false;
  serverCatalogueProvesClientSurface: false;
};

export function clientToolSurfaceStatus(
  attestation: ClientToolSurfaceAttestation | null | undefined,
  now: string
): ClientToolSurfaceStatus {
  if (!attestation) return 'UNKNOWN';
  const nowMs = Date.parse(now);
  const observedMs = Date.parse(attestation.observedAt);
  const expiresMs = Date.parse(attestation.expiresAt);
  if (!Number.isFinite(nowMs) || !Number.isFinite(observedMs) || !Number.isFinite(expiresMs)) {
    return 'UNKNOWN';
  }
  return observedMs <= nowMs && nowMs < expiresMs ? 'ATTESTED' : 'EXPIRED';
}

/**
 * Client-attested callability for one tool, or null when the attestation does
 * not mention it. A non-current attestation only ever yields UNKNOWN.
 */
export function attestedCallability(
  attestation: ClientToolSurfaceAttestation | null | undefined,
  toolName: string,
  now: string
): { status: 'CALLABLE' | 'NOT_CALLABLE' | 'UNKNOWN'; stale: boolean } | null {
  const capability = attestation?.capabilities.find((entry) => entry.name === toolName);
  if (!capability) return null;
  return clientToolSurfaceStatus(attestation, now) === 'ATTESTED'
    ? { status: capability.callability, stale: false }
    : { status: 'UNKNOWN', stale: true };
}

export function deriveToolSurfaceProjection(input: {
  catalogueTools: ReadonlyArray<{ name: string }>;
  catalogueDigest: string | null;
  attestation: ClientToolSurfaceAttestation | null | undefined;
  now: string;
}): ToolSurfaceProjection {
  const status = clientToolSurfaceStatus(input.attestation, input.now);
  const attestation = status === 'UNKNOWN' ? null : input.attestation ?? null;
  const serverNames = new Set(input.catalogueTools.map((tool) => tool.name));

  let comparison: ToolSurfaceProjection['comparison'] = null;
  if (status === 'ATTESTED' && attestation) {
    const onServer = attestation.capabilities.filter((entry) => serverNames.has(entry.name));
    comparison = {
      attestedServerToolCount: onServer.length,
      callableServerToolCount: onServer.filter((entry) => entry.callability === 'CALLABLE').length,
      notCallableServerTools: onServer
        .filter((entry) => entry.callability === 'NOT_CALLABLE')
        .map((entry) => entry.name)
        .sort()
        .slice(0, MAX_LISTED_TOOLS),
      attestedOutsideServerCatalogueCount: attestation.capabilities.length - onServer.length
    };
  }

  return {
    schemaVersion: 1,
    authoritative: false,
    server: {
      authority: 'current_state_tool_catalog',
      catalogueDigest: input.catalogueDigest,
      toolCount: serverNames.size
    },
    client: {
      status,
      attestationId: attestation?.attestationId ?? null,
      surface: attestation?.surface ?? null,
      observedAt: attestation?.observedAt ?? null,
      expiresAt: attestation?.expiresAt ?? null,
      capabilityCount: attestation?.capabilities.length ?? 0,
      reasonCodes: status === 'ATTESTED'
        ? []
        : [status === 'EXPIRED'
          ? 'CLIENT_TOOL_SURFACE_ATTESTATION_EXPIRED'
          : 'CLIENT_TOOL_SURFACE_UNATTESTED']
    },
    comparison,
    clientAttestationAuthorizes: false,
    serverCatalogueProvesClientSurface: false
  };
}
