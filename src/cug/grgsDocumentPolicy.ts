/** GRGS/CUG document policy v1: read-only classification, never changes repository files.
 * Candidate policy STD-GITHUB-DOC-GOV-001; activation requires independent validation.
 */
export const GRGS_POLICY_ID = 'STD-GITHUB-DOC-GOV-001' as const;
export const GRGS_POLICY_VERSION = 1 as const;
const conventional = new Set(['README.md', 'AGENTS.md', 'CLAUDE.md', 'CONTINUITY.md', 'CONTRIBUTING.md', 'CHANGELOG.md', 'LICENSE.md', 'SECURITY.md', 'CODE_OF_CONDUCT.md']);
const entityId = /^[A-Z][A-Z0-9]*(?:-[A-Z0-9]+)*$/;
const documentType = /^[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)*$/;
const named = /^([A-Z][A-Z0-9]*(?:-[A-Z0-9]+)*)__([A-Z][A-Z0-9]*(?:_[A-Z0-9]+)*)\.md$/;
export type GrgsDocumentAssessment = Readonly<{
  policyId: typeof GRGS_POLICY_ID;
  policyVersion: typeof GRGS_POLICY_VERSION;
  path: string;
  classification: 'CONVENTIONAL_EXCEPTION' | 'SCOPED_DOCUMENT' | 'LEGACY_REVIEW' | 'OUT_OF_SCOPE' | 'INVALID_PATH';
  entityId: string | null;
  documentType: string | null;
  requiresReview: boolean;
  automaticMutation: false;
}>;
/** Conservative lexical classification only. Does not assert authority or actual ownership. */
export function assessGrgsDocumentPath(path: string): GrgsDocumentAssessment {
  const base = { policyId: GRGS_POLICY_ID, policyVersion: GRGS_POLICY_VERSION, path, entityId: null, documentType: null, automaticMutation: false as const };
  if (!path || path.length > 4096 || path.startsWith('/') || path.includes('\\') ||
      path.split('/').some(segment => !segment || segment === '.' || segment === '..' || /[\u0000-\u001f\u007f]/.test(segment))) {
    return { ...base, classification: 'INVALID_PATH', requiresReview: true };
  }
  const filename = path.split('/').at(-1)!;
  if (!filename.toLowerCase().endsWith('.md')) return { ...base, classification: 'OUT_OF_SCOPE', requiresReview: false };
  if (conventional.has(filename) || filename === '00_GSCC_ENTRY.md' || filename === '00_DIRECT_OWNER_ENTRY.md' || filename === '00_START_HERE.md') {
    return { ...base, classification: 'CONVENTIONAL_EXCEPTION', requiresReview: false };
  }
  const match = named.exec(filename);
  if (match && entityId.test(match[1]) && documentType.test(match[2])) {
    return { ...base, classification: 'SCOPED_DOCUMENT', entityId: match[1], documentType: match[2], requiresReview: false };
  }
  return { ...base, classification: 'LEGACY_REVIEW', requiresReview: true };
}
