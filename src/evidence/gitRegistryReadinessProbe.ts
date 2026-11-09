import { createHash } from 'node:crypto';

import type { GitRegistryProjectEvidence } from '../github/registry.js';

const MAX_MAPPINGS = 200;
const SAFE_MAPPING_ID = /^[A-Za-z0-9._:-]{1,120}$/;

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

/**
 * Bounded, publication-safe projection of GitRegistry V2 activation readiness
 * for the GitHub OIDC read-only evidence fallback. It exposes mapping ids,
 * readiness reason codes and digests only: no repository names, project names,
 * server paths, domains or credential references leave the server.
 */
export function projectGitRegistryReadinessEvidence(evidence: GitRegistryProjectEvidence): string {
  if (!evidence.available) {
    return JSON.stringify({
      schemaVersion: 1,
      authority: 'GitRegistry V2',
      mutationAllowed: false,
      available: false,
      reasonCode: 'GIT_REGISTRY_UNAVAILABLE',
      mappings: []
    });
  }

  const repositoryByMapping = new Map(
    evidence.mappings.map((mapping) => [mapping.mappingId, mapping.repositoryId])
  );
  const reasonCodeTotals: Record<string, number> = {};
  for (const entry of evidence.activationReadiness) {
    for (const reasonCode of entry.reasonCodes) {
      reasonCodeTotals[reasonCode] = (reasonCodeTotals[reasonCode] ?? 0) + 1;
    }
  }
  const mappings = evidence.activationReadiness.slice(0, MAX_MAPPINGS).map((entry) => {
    const repositoryId = repositoryByMapping.get(entry.mappingId);
    const repositoryIdDigest = repositoryId ? sha256(repositoryId.toLowerCase()) : null;
    const reasonCodes = [...entry.reasonCodes];
    return SAFE_MAPPING_ID.test(entry.mappingId)
      ? { mappingId: entry.mappingId, repositoryIdDigest, status: entry.status, reasonCodes }
      : {
          mappingId: null,
          mappingIdDigest: sha256(entry.mappingId),
          repositoryIdDigest,
          status: entry.status,
          reasonCodes
        };
  });

  return JSON.stringify({
    schemaVersion: 1,
    authority: 'GitRegistry V2',
    mutationAllowed: false,
    available: true,
    sourceSchemaVersion: evidence.sourceSchemaVersion,
    registryDigest: evidence.digest,
    candidateDigest: evidence.candidateDigest,
    counts: {
      mappings: evidence.mappings.length,
      projects: evidence.projects.length,
      ready: evidence.activationReadiness.filter((entry) => entry.status === 'READY').length,
      blocked: evidence.activationReadiness.filter((entry) => entry.status === 'BLOCKED').length
    },
    truncated: evidence.activationReadiness.length > MAX_MAPPINGS,
    reasonCodeTotals,
    mappings
  });
}
