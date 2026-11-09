import type { ProjectRealityLayer, ProjectRealityLayerId } from '../github/projectReality.js';
import type { BootstrapProjectReferences } from '../operationalMemory/types.js';
import type { GovernedOperationalContext } from './types.js';

/**
 * D3 (TB-W3-D3-01, GW-12): the repository, project and mapping references a
 * bootstrap receipt may carry, read from the project reality composed for the
 * session repository. Only a VERIFIED layer becomes a reference, and only when
 * every layer above it did: an unverified binding is never promoted. The mapping
 * is the one D1 bound to the proven project. Pure and read-only.
 */
const PROVENANCE_PATTERN = /^[a-z0-9][a-z0-9_.:-]{0,79}$/;
const MAX_PROVENANCE = 10;

type ReferenceContext = Pick<GovernedOperationalContext, 'generatedAt' | 'repository'>
  & Partial<Pick<GovernedOperationalContext, 'projectReality' | 'governanceInheritance'>>;

function repositoryKey(value: string | null | undefined): string | null {
  return value ? value.trim().replace(/^github:/i, '').toLowerCase() : null;
}

function verifiedLayer(layers: readonly ProjectRealityLayer[], layerId: ProjectRealityLayerId): ProjectRealityLayer | null {
  const layer = layers.find((entry) => entry.layer === layerId);
  return layer?.state === 'VERIFIED' ? layer : null;
}

function reference(id: string, layer: ProjectRealityLayer): NonNullable<BootstrapProjectReferences['repository']> {
  return {
    id,
    observedAt: layer.observedAt,
    provenance: layer.provenance.filter((entry) => PROVENANCE_PATTERN.test(entry)).slice(0, MAX_PROVENANCE)
  };
}

export function deriveBootstrapProjectReferences(context: ReferenceContext): BootstrapProjectReferences {
  const observedAt = context.generatedAt;
  const reality = context.projectReality;
  if (!reality) {
    return {
      observedAt,
      repository: null,
      project: null,
      mapping: null,
      reasonCodes: ['RECEIPT_PROJECT_REALITY_UNAVAILABLE']
    };
  }
  const repositoryLayer = verifiedLayer(reality.layers, 'REPOSITORY');
  const sameRepository = repositoryKey(reality.repositoryId) === repositoryKey(context.repository);
  // The project reality of another repository never speaks for the session repository.
  if (!repositoryLayer || !reality.repositoryId || !sameRepository) {
    return {
      observedAt,
      repository: null,
      project: null,
      mapping: null,
      reasonCodes: [
        repositoryLayer && reality.repositoryId ? 'RECEIPT_REPOSITORY_BINDING_MISMATCH' : 'RECEIPT_REPOSITORY_UNVERIFIED'
      ]
    };
  }
  const repository = reference(reality.repositoryId, repositoryLayer);
  const projectLayer = verifiedLayer(reality.layers, 'PROJECT');
  if (!projectLayer || !reality.projectId) {
    return { observedAt, repository, project: null, mapping: null, reasonCodes: ['RECEIPT_PROJECT_UNVERIFIED'] };
  }
  const project = reference(reality.projectId, projectLayer);
  const scope = context.governanceInheritance?.scope ?? null;
  const mapping = scope
    && scope.projectId === reality.projectId
    && repositoryKey(scope.repositoryId) === repositoryKey(reality.repositoryId)
    ? { mappingId: scope.mappingId, componentRole: scope.componentRole }
    : null;
  return {
    observedAt,
    repository,
    project,
    mapping,
    reasonCodes: mapping ? [] : ['RECEIPT_MAPPING_UNVERIFIED']
  };
}
