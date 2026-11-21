/**
 * P2 / RG-005, RG-006, RG-011, RG-021, RG-023:
 * Mission-to-project identity crosswalk, composed from EXISTING GitRegistry
 * and GW-06 project-resolution evidence. This is a read-only assessment,
 * never a ProjectRecord, mapping migration, grant, task or session.
 *
 * A documentation UID is not an active GitRegistry project identity by itself.
 * In particular, a V1-derived mapping and a GW-06 "RESOLVED" result without
 * a matching ProjectRecord never certify the mission's operational binding.
 */
import type { GitRegistryProjectEvidence } from '../github/registry.js';
import type { GithubProjectResolution } from '../github/projectResolution.js';

export type MissionIdentityDocument = Readonly<{
  continuityId: string;
  projectUid: string;
  repositoryId: string;
  sourceCommitSha: string;
  evidenceRef: string;
}>;

export type MissionIdentityCrosswalkInput = Readonly<{
  observedAt: string;
  document: MissionIdentityDocument;
  registry: Pick<GitRegistryProjectEvidence,
    'available' | 'sourceSchemaVersion' | 'digest' | 'candidateDigest' | 'projects'>;
  projectResolution: Pick<GithubProjectResolution,
    'status' | 'freshness' | 'repositoryId' | 'selectedMapping' | 'selectedProject'
      | 'registryDigest' | 'candidateDigest'>;
}>;

export type MissionIdentityCrosswalk = Readonly<{
  status: 'CONSISTENT' | 'UNVERIFIED' | 'CONFLICT';
  observedAt: string;
  continuityId: string;
  documentaryProjectUid: string;
  repositoryId: string;
  matchedProjectId: string | null;
  sourceCommitSha: string | null;
  evidenceRefs: readonly string[];
  reasonCodes: readonly string[];
  /** This projection cannot grant any GitRegistry, CUG, Task or E2 permission. */
  authorizationInferred: false;
  mutationPerformed: false;
}>;

const same = (left: string, right: string): boolean =>
  left.trim().toLowerCase() === right.trim().toLowerCase();

/**
 * A GitHub blob reference is provenance only when owner/repo, commit and
 * document path are consistent with the supplied mission declaration.
 * Content verification is performed by the owning GitHub reader, not here.
 * An arbitrary URL or abbreviated SHA cannot attest a document.
 */
function matchesDocumentRevision(document: MissionIdentityDocument): boolean {
  const repository = /^github:([^/\s]+)\/([^/\s]+)$/i.exec(document.repositoryId);
  if (!repository || !/^[0-9a-f]{40}$/i.test(document.sourceCommitSha)) return false;
  let url: URL;
  try {
    url = new URL(document.evidenceRef);
  } catch {
    return false;
  }
  if (url.protocol !== 'https:' || url.hostname !== 'github.com'
    || url.port !== '' || url.username || url.password || url.search || url.hash) return false;
  const segments = url.pathname.split('/').filter(Boolean);
  return segments.length >= 5
    && same(segments[0]!, repository[1]!)
    && same(segments[1]!, repository[2]!)
    && segments[2] === 'blob'
    && same(segments[3]!, document.sourceCommitSha)
    && segments.slice(4).every(part => part !== '.' && part !== '..' && !/%/.test(part));
}

export function assessMissionIdentityCrosswalk(
  input: MissionIdentityCrosswalkInput
): MissionIdentityCrosswalk {
  const { document, registry, projectResolution: resolution } = input;
  const reasons: string[] = [];
  const conflict = new Set<string>();
  const add = (code: string, isConflict = false): void => {
    if (!reasons.includes(code)) reasons.push(code);
    if (isConflict) conflict.add(code);
  };

  if (!document.continuityId.trim() || !document.projectUid.trim()
    || !document.repositoryId.trim() || !input.observedAt.trim()) {
    add('MISSION_IDENTITY_INPUT_MISSING');
  }
  const documentShaValid = /^[0-9a-f]{40}$/i.test(document.sourceCommitSha);
  if (!documentShaValid || !matchesDocumentRevision(document)) {
    add('MISSION_DOCUMENT_PROVENANCE_UNVERIFIED');
  }
  if (!registry.available || !registry.digest || !registry.candidateDigest) {
    add('GITREGISTRY_EVIDENCE_UNAVAILABLE');
  }
  if (registry.sourceSchemaVersion !== 2) {
    add('GITREGISTRY_V1_CANDIDATE_NOT_ACTIVE');
  }
  if (resolution.status === 'AMBIGUOUS') {
    add('GITHUB_PROJECT_MAPPING_AMBIGUOUS', true);
  } else if (resolution.status !== 'RESOLVED' || resolution.freshness !== 'CURRENT') {
    add('GITHUB_PROJECT_RESOLUTION_UNVERIFIED');
  }

  if (resolution.repositoryId && document.repositoryId
    && !same(resolution.repositoryId, document.repositoryId)) {
    add('MISSION_REPOSITORY_ID_MISMATCH', true);
  }
  if (registry.digest && resolution.registryDigest
    && registry.digest !== resolution.registryDigest) {
    add('GITREGISTRY_SNAPSHOT_CONFLICT', true);
  }
  if (registry.candidateDigest && resolution.candidateDigest
    && registry.candidateDigest !== resolution.candidateDigest) {
    add('GITREGISTRY_CANDIDATE_CONFLICT', true);
  }
  if (!resolution.registryDigest || !resolution.candidateDigest) {
    add('PROJECT_RESOLUTION_PROVENANCE_UNVERIFIED');
  }

  const mapping = resolution.selectedMapping;
  if (!mapping) {
    add('PROJECT_MAPPING_NOT_SELECTED');
  } else if (!same(mapping.repositoryId, document.repositoryId)) {
    add('PROJECT_MAPPING_REPOSITORY_MISMATCH', true);
  }
  if (mapping && mapping.activationReadiness !== 'READY') {
    add('PROJECT_MAPPING_NOT_READY');
  }
  if (mapping?.governance?.candidateFromV1) {
    add('PROJECT_MAPPING_DERIVED_FROM_V1');
  }

  const matches = mapping
    ? registry.projects.filter((project) => project.projectId === mapping.projectId)
    : [];
  if (mapping && matches.length === 0) {
    add('PROJECT_RECORD_MISSING');
  }
  if (matches.length > 1) {
    add('PROJECT_RECORD_AMBIGUOUS', true);
  }
  const record = matches.length === 1 ? matches[0]! : null;
  if (record) {
    if (record.projectUid !== document.projectUid) {
      add('DOCUMENTARY_PROJECT_UID_CONFLICT', true);
    }
    if (mapping?.projectUid !== record.projectUid) {
      add(mapping?.projectUid == null
        ? 'PROJECT_MAPPING_UID_UNVERIFIED' : 'PROJECT_MAPPING_UID_CONFLICT',
      mapping?.projectUid != null);
    }
    if (!mapping || !record.repositoryComponents.some((component) =>
      same(component.repositoryId, mapping.repositoryId)
      && component.mappingId === mapping.mappingId)) {
      add('PROJECT_COMPONENT_BINDING_UNVERIFIED');
    }
    if (!resolution.selectedProject
      || resolution.selectedProject.projectId !== record.projectId
      || resolution.selectedProject.projectUid !== record.projectUid
      || resolution.selectedProject.name !== record.name) {
      add('PROJECT_RESOLVER_RECORD_MISMATCH', true);
    }
  }

  const status = conflict.size ? 'CONFLICT' : reasons.length ? 'UNVERIFIED' : 'CONSISTENT';
  const evidenceRefs = [documentShaValid ? document.evidenceRef.trim() : '', registry.digest
    ? 'gitregistry:sha256:' + registry.digest : '',
    mapping ? 'gitregistry:mapping:' + mapping.mappingId : '']
    .filter((value) => value.length > 0);
  return Object.freeze({
    status,
    observedAt: input.observedAt,
    continuityId: document.continuityId,
    documentaryProjectUid: document.projectUid,
    repositoryId: document.repositoryId,
    matchedProjectId: status === 'CONSISTENT' ? (record?.projectId ?? null) : null,
    sourceCommitSha: documentShaValid ? document.sourceCommitSha : null,
    evidenceRefs: Object.freeze(evidenceRefs),
    reasonCodes: Object.freeze(reasons),
    authorizationInferred: false,
    mutationPerformed: false
  });
}
