/** GD-U-CONT-20261030-ROOT-01: additive read-only completion gate for PR #350. */
import type { PleskServerId } from './pleskSite.js';

export type PleskFoundationEvidence = Readonly<{
  serverId: PleskServerId;
  observedAt: string;
  parentSubscriptionVerified: boolean;
  canonicalRootVerified: boolean;
  gitRepositoryBindingVerified: boolean;
  githubInstallationPermissionVerified: boolean;
  deploymentPipelineVerified: boolean;
  dnsVerified: boolean;
  tlsVerified: boolean;
  healthCheckVerified: boolean;
  backupVerified: boolean;
  rollbackVerified: boolean;
}>;
export type PleskFoundationAssessment = Readonly<{
  status: 'READY_FOR_GOVERNED_ADMISSION' | 'BLOCKED';
  missing: readonly string[];
  runtimeWriteAuthorized: false;
  operationExecuted: false;
}>;
/** Never equate this read-only assessment with an E3 consent or a write grant. */
export function assessPleskFoundationCompletion(
  evidence: PleskFoundationEvidence | null,
  expectedServer: PleskServerId,
  now: string,
  maxAgeMs = 5 * 60_000
): PleskFoundationAssessment {
  const blocked = (missing: string[]): PleskFoundationAssessment => ({
    status: 'BLOCKED', missing, runtimeWriteAuthorized: false, operationExecuted: false
  });
  if (expectedServer !== 's1' && expectedServer !== 's2') return blocked(['SERVER_INVALID']);
  if (!evidence || evidence.serverId !== expectedServer) return blocked(['EVIDENCE_MISSING_OR_WRONG_SERVER']);
  const observed = Date.parse(evidence.observedAt);
  const current = Date.parse(now);
  if (!Number.isFinite(observed) || !Number.isFinite(current)
    || !Number.isFinite(maxAgeMs) || maxAgeMs < 0
    || observed > current || current - observed > maxAgeMs) return blocked(['EVIDENCE_STALE']);
  const checks = [
    'parentSubscriptionVerified', 'canonicalRootVerified',
    'gitRepositoryBindingVerified', 'githubInstallationPermissionVerified',
    'deploymentPipelineVerified', 'dnsVerified', 'tlsVerified',
    'healthCheckVerified', 'backupVerified', 'rollbackVerified'
  ] as const;
  const missing = checks.filter(key => evidence[key] !== true);
  return missing.length ? blocked([...missing]) : {
    status: 'READY_FOR_GOVERNED_ADMISSION', missing: [],
    runtimeWriteAuthorized: false, operationExecuted: false
  };
}
