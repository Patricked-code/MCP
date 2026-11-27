/**
 * Mission WT-MCP-REGISTRY-RESOLUTION-20261121-01 — CUG event candidate.
 *
 * Pure assessment only: no task creation, GitRegistry mutation, session,
 * claim or permission. An admitted candidate still requires the EXISTING
 * mcp_reconcile_agent_intent bootstrap/session/TargetScope checks.
 */
import { createHash } from 'node:crypto';
import type { CugRegisterRecord } from './discoveryRegister.js';

export type CugVerifiedRepository = Readonly<{
  source: 'GITHUB_API_CUG_INSTALLATION';
  verifiedAt: string;
  installationId: number;
  githubRepositoryId: number;
  fullName: string;
  installationCoverage: 'VERIFIED' | 'UNVERIFIED';
  evidenceRef: string;
}>;

export type CugResolvedProject = Readonly<{
  status: 'VERIFIED' | 'NONE' | 'AMBIGUOUS' | 'CONFLICT' | 'UNVERIFIED';
  projectId: string | null;
  mappingId: string | null;
  githubRepositoryId: number | null;
  repository: string | null;
  evidenceRef: string | null;
}>;

export type CugIntentAssessment = Readonly<{
  status: 'CANDIDATE' | 'PENDING_GITHUB_VERIFICATION' | 'PENDING_PROJECT_BINDING' | 'CONFLICT' | 'IGNORED';
  deliveryId: string;
  intentKey: string | null;
  projectId: string | null;
  repository: string | null;
  mappingId: string | null;
  provenance: readonly string[];
  reasons: readonly string[];
  executionAuthorized: false;
  admissionPerformed: false;
  taskCreated: false;
}>;

const SHA = /^[0-9a-f]{64}$/;
const FULL_NAME = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const MAX_OBSERVATION_AGE_MS = 5 * 60_000;
function result(receipt: CugRegisterRecord, status: CugIntentAssessment['status'],
  reasons: string[], provenance: string[], details?: {
    intentKey: string; projectId: string; repository: string; mappingId: string
  }): CugIntentAssessment {
  return Object.freeze({
    status, deliveryId: receipt.deliveryId,
    intentKey: details?.intentKey ?? null, projectId: details?.projectId ?? null,
    repository: details?.repository ?? null, mappingId: details?.mappingId ?? null,
    reasons: Object.freeze(reasons), provenance: Object.freeze(provenance),
    executionAuthorized: false, admissionPerformed: false, taskCreated: false
  });
}

/** Only a verified GitHub/installation observation and exact existing project binding can yield a candidate. */
export function assessCugEventIntent(input: Readonly<{
  receipt: CugRegisterRecord;
  github: CugVerifiedRepository | null;
  project: CugResolvedProject | null;
  now: string;
}>): CugIntentAssessment {
  const { receipt, github, project } = input;
  const provenance = ['cug-receipt:' + receipt.deliveryId];
  const now = Date.parse(input.now);
  if (!Number.isFinite(now)) throw Error('CUG_INTENT_CLOCK_INVALID');
  if (receipt.version !== 2 || receipt.event !== 'repository') {
    return result(receipt, 'IGNORED', ['CUG_EVENT_NOT_PROJECT_ACTION'], provenance);
  }
  if (!['created', 'edited', 'renamed', 'transferred'].includes(receipt.action)) {
    return result(receipt, 'IGNORED', ['CUG_EVENT_ACTION_UNSUPPORTED'], provenance);
  }
  if (!github || !Number.isFinite(Date.parse(github.verifiedAt))
    || Date.parse(github.verifiedAt) > now
    || now - Date.parse(github.verifiedAt) > MAX_OBSERVATION_AGE_MS
    || github.installationCoverage !== 'VERIFIED'
    || github.installationId !== receipt.installationId
    || github.githubRepositoryId !== receipt.repositoryId
    || !FULL_NAME.test(github.fullName)
    || !github.evidenceRef) {
    return result(receipt, 'PENDING_GITHUB_VERIFICATION',
      ['CUG_FRESH_INSTALLATION_REPOSITORY_EVIDENCE_REQUIRED'], provenance);
  }
  provenance.push('github-api:' + github.evidenceRef);
  if (!project || project.status === 'NONE' || project.status === 'UNVERIFIED') {
    return result(receipt, 'PENDING_PROJECT_BINDING',
      ['CUG_CANONICAL_PROJECT_BINDING_UNVERIFIED'], provenance);
  }
  if (project.status === 'CONFLICT' || project.status === 'AMBIGUOUS') {
    return result(receipt, 'CONFLICT', ['CUG_PROJECT_BINDING_CONFLICT'], provenance);
  }
  if (!project.projectId || !project.mappingId || !project.evidenceRef
    || project.githubRepositoryId !== github.githubRepositoryId
    || project.repository?.toLowerCase() !== github.fullName.toLowerCase()) {
    return result(receipt, 'CONFLICT', ['CUG_PROJECT_BINDING_IDENTITY_MISMATCH'], provenance);
  }
  provenance.push('gitregistry:' + project.evidenceRef);
  if (!SHA.test(receipt.payloadDigest)) {
    return result(receipt, 'CONFLICT', ['CUG_RECEIPT_DIGEST_INVALID'], provenance);
  }
  // Domain-separated stable key; replay cannot generate a second intent.
  // This is only an intent suggestion, never a task or permission.
  const digest = createHash('sha256').update(JSON.stringify([
    'cug-intent-v1', receipt.deliveryId, receipt.payloadDigest, receipt.installationId,
    receipt.repositoryId, receipt.event, receipt.action, project.projectId, project.mappingId
  ])).digest('hex');
  const key = 'cug:receipt:' + digest;
  return result(receipt, 'CANDIDATE', ['CUG_GOVERNED_TASK_ADMISSION_REQUIRED'], provenance, {
    intentKey: key, projectId: project.projectId,
    repository: github.fullName, mappingId: project.mappingId
  });
}
