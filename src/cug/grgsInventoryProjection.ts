import { createHash } from 'node:crypto';
import { assessGrgsDocumentPath, GRGS_POLICY_ID, GRGS_POLICY_VERSION } from './grgsDocumentPolicy.js';

/** Read-only GRGS projection for an already verified CUG installation inventory.
 * Never grants access, changes GitRegistry, or writes to repositories.
 */
export type GrgsInventoryInput = Readonly<{
  installationId: number;
  repositoryId: number;
  repositoryFullName: string;
  observedCommit: string;
  paths: readonly string[];
}>;

export function projectGrgsInventory(input: GrgsInventoryInput) {
  if (!Number.isSafeInteger(input.installationId) || input.installationId <= 0 ||
      !Number.isSafeInteger(input.repositoryId) || input.repositoryId <= 0 ||
      !/^[A-Za-z0-9-]+\/[A-Za-z0-9_.-]+$/.test(input.repositoryFullName) ||
      !/^[0-9a-f]{40}$/.test(input.observedCommit) || input.paths.length > 10_000) {
    throw Error('GRGS_INVENTORY_INPUT_INVALID');
  }
  const unique = new Set<string>();
  for (const path of input.paths) {
    if (typeof path !== 'string' || unique.has(path)) throw Error('GRGS_INVENTORY_DUPLICATE_OR_INVALID');
    unique.add(path);
  }
  const documents = [...unique].sort().map(assessGrgsDocumentPath);
  if (documents.some(row => row.classification === 'INVALID_PATH')) throw Error('GRGS_INVENTORY_INVALID_PATH');
  const evidence = {
    policyId: GRGS_POLICY_ID,
    policyVersion: GRGS_POLICY_VERSION,
    installationId: input.installationId,
    repositoryId: input.repositoryId,
    repositoryFullName: input.repositoryFullName,
    observedCommit: input.observedCommit,
    documents
  };
  return {
    ...evidence,
    evidenceDigest: createHash('sha256').update(JSON.stringify(evidence)).digest('hex'),
    automaticMutation: false as const,
    registryMutation: false as const,
    deploymentAuthorized: false as const
  };
}
