import { z } from 'zod';

const BoundedId = z.string().trim().min(1).max(300);
const RepositoryTargetSchema = z.string().trim().min(3).max(300).regex(/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/);
const RepositoryIdSchema = z.string().trim().min(3).max(300).regex(/^github:[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/);
const ShaSchema = z.string().regex(/^[0-9a-f]{40}$/);
const ReasonCodeSchema = z.string().trim().min(2).max(80).regex(/^[A-Z0-9_.:-]+$/);

export { RepositoryTargetSchema };

export const TargetScopeComponentSchema = z.object({
  mappingId: BoundedId,
  repositoryId: RepositoryIdSchema,
  role: z.string().trim().min(1).max(100)
}).strict();

export const TargetScopeSchema = z.object({
  schemaVersion: z.literal(1),
  targetId: BoundedId,
  projectId: BoundedId,
  projectUid: BoundedId.nullable(),
  components: z.array(TargetScopeComponentSchema).min(1).max(20)
}).strict().superRefine((scope, context) => {
  const mappings = scope.components.map((component) => component.mappingId);
  if (new Set(mappings).size !== mappings.length) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['components'],
      message: 'target scope mappingIds must be unique'
    });
  }
  const repositories = scope.components.map((component) => component.repositoryId.toLowerCase());
  if (new Set(repositories).size !== repositories.length) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['components'],
      message: 'target scope repositoryIds must be unique'
    });
  }
});
export type TargetScope = z.infer<typeof TargetScopeSchema>;

export const TargetContextComponentSchema = TargetScopeComponentSchema.extend({
  githubHead: ShaSchema.nullable(),
  runtimeRevision: ShaSchema.nullable(),
  freshness: z.enum(['CURRENT', 'STALE', 'UNVERIFIED']),
  reasonCodes: z.array(ReasonCodeSchema).max(20)
}).strict();

export const TargetContextSchema = z.object({
  schemaVersion: z.literal(1),
  status: z.enum(['RESOLVED', 'PARTIAL', 'UNVERIFIED']),
  targetId: BoundedId,
  projectId: BoundedId,
  projectUid: BoundedId.nullable(),
  globalCheckpointRepositoryId: RepositoryIdSchema,
  centralGovernanceRepositoryId: RepositoryIdSchema,
  observedAt: z.string().datetime({ offset: true }),
  components: z.array(TargetContextComponentSchema).min(1).max(20)
}).strict().superRefine((target, context) => {
  const mappings = target.components.map((component) => component.mappingId);
  if (new Set(mappings).size !== mappings.length) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['components'],
      message: 'target context mappingIds must be unique'
    });
  }
});
export type TargetContext = z.infer<typeof TargetContextSchema>;

const ProjectComponentSchema = z.object({
  repositoryId: RepositoryIdSchema,
  mappingId: BoundedId,
  role: z.string().trim().min(1).max(100)
}).strict();

const TargetProjectSchema = z.object({
  projectId: BoundedId,
  projectUid: BoundedId.nullable(),
  globalCheckpointRepositoryId: RepositoryIdSchema,
  centralGovernanceRepositoryId: RepositoryIdSchema,
  repositoryComponents: z.array(ProjectComponentSchema).min(1).max(20)
}).strict();

const ComponentObservationSchema = z.object({
  mappingId: BoundedId,
  repositoryId: RepositoryIdSchema,
  githubHead: ShaSchema.nullable(),
  runtimeRevision: ShaSchema.nullable(),
  freshness: z.enum(['CURRENT', 'STALE', 'UNVERIFIED'])
}).strict();

export const TargetContextInputSchema = z.object({
  project: TargetProjectSchema,
  observations: z.array(ComponentObservationSchema).max(100),
  observedAt: z.string().datetime({ offset: true })
}).strict();
export type TargetContextInput = z.infer<typeof TargetContextInputSchema>;

function uniqueSorted(values: readonly string[]): string[] {
  return [...new Set(values)].sort();
}

function repositoryTarget(repositoryId: string): string {
  return repositoryId.replace(/^github:/i, '');
}

function componentObservation(
  projectComponent: z.infer<typeof ProjectComponentSchema>,
  observations: z.infer<typeof ComponentObservationSchema>[]
): z.infer<typeof TargetContextComponentSchema> {
  const byMapping = observations.filter((entry) => entry.mappingId === projectComponent.mappingId);
  if (byMapping.length === 0) {
    return {
      ...projectComponent,
      githubHead: null,
      runtimeRevision: null,
      freshness: 'UNVERIFIED',
      reasonCodes: ['COMPONENT_OBSERVATION_MISSING']
    };
  }
  const exact = byMapping.filter(
    (entry) => entry.repositoryId.toLowerCase() === projectComponent.repositoryId.toLowerCase()
  );
  if (exact.length !== 1) {
    return {
      ...projectComponent,
      githubHead: null,
      runtimeRevision: null,
      freshness: 'UNVERIFIED',
      reasonCodes: [
        exact.length > 1
          ? 'COMPONENT_OBSERVATION_AMBIGUOUS'
          : 'COMPONENT_REPOSITORY_MISMATCH'
      ]
    };
  }
  const observation = exact[0]!;
  return {
    ...projectComponent,
    githubHead: observation.githubHead,
    runtimeRevision: observation.runtimeRevision,
    freshness: observation.freshness,
    reasonCodes: observation.freshness === 'CURRENT'
      ? []
      : [observation.freshness === 'STALE'
        ? 'COMPONENT_EVIDENCE_STALE'
        : 'COMPONENT_EVIDENCE_UNVERIFIED']
  };
}

export function deriveTargetContext(rawInput: TargetContextInput): TargetContext {
  const input = TargetContextInputSchema.parse(rawInput);
  const components = input.project.repositoryComponents
    .map((component) => componentObservation(component, input.observations))
    .sort((left, right) => left.mappingId.localeCompare(right.mappingId));
  const currentCount = components.filter((component) => component.freshness === 'CURRENT').length;
  const status: TargetContext['status'] = currentCount === components.length
    ? 'RESOLVED'
    : currentCount > 0
      ? 'PARTIAL'
      : 'UNVERIFIED';

  return TargetContextSchema.parse({
    schemaVersion: 1,
    status,
    targetId: input.project.projectUid ?? input.project.projectId,
    projectId: input.project.projectId,
    projectUid: input.project.projectUid,
    globalCheckpointRepositoryId: input.project.globalCheckpointRepositoryId,
    centralGovernanceRepositoryId: input.project.centralGovernanceRepositoryId,
    observedAt: input.observedAt,
    components
  });
}

export function createTargetScope(
  rawContext: TargetContext,
  mappingIds: readonly string[]
): TargetScope {
  const context = TargetContextSchema.parse(rawContext);
  const wanted = uniqueSorted(mappingIds);
  if (wanted.length < 1 || wanted.length > 20) {
    throw new Error('TARGET_SCOPE_COMPONENT_SET_INVALID');
  }
  const byMapping = new Map(context.components.map((component) => [component.mappingId, component]));
  const components = wanted.map((mappingId) => {
    const component = byMapping.get(mappingId);
    if (!component) throw new Error('TARGET_SCOPE_COMPONENT_UNKNOWN');
    return {
      mappingId: component.mappingId,
      repositoryId: component.repositoryId,
      role: component.role
    };
  });
  return TargetScopeSchema.parse({
    schemaVersion: 1,
    targetId: context.targetId,
    projectId: context.projectId,
    projectUid: context.projectUid,
    components
  });
}

export function projectTargetContext(
  rawContext: TargetContext,
  rawScope: TargetScope
): TargetContext {
  const context = TargetContextSchema.parse(rawContext);
  const scope = TargetScopeSchema.parse(rawScope);
  if (
    scope.targetId !== context.targetId
    || scope.projectId !== context.projectId
    || scope.projectUid !== context.projectUid
  ) {
    throw new Error('TARGET_SCOPE_CONTEXT_MISMATCH');
  }
  const wanted = new Set(scope.components.map((component) => component.mappingId));
  const components = context.components.filter((component) => wanted.has(component.mappingId));
  if (components.length !== scope.components.length) {
    throw new Error('TARGET_SCOPE_COMPONENT_UNKNOWN');
  }
  for (const scoped of scope.components) {
    const component = components.find((entry) => entry.mappingId === scoped.mappingId);
    if (
      !component
      || component.repositoryId !== scoped.repositoryId
      || component.role !== scoped.role
    ) {
      throw new Error('TARGET_SCOPE_COMPONENT_MISMATCH');
    }
  }
  const currentCount = components.filter((component) => component.freshness === 'CURRENT').length;
  const status: TargetContext['status'] = currentCount === components.length
    ? 'RESOLVED'
    : currentCount > 0
      ? 'PARTIAL'
      : 'UNVERIFIED';
  return TargetContextSchema.parse({
    ...context,
    status,
    components
  });
}

export function targetScopeContainsRepository(
  rawScope: TargetScope,
  repository: string
): boolean {
  const scope = TargetScopeSchema.parse(rawScope);
  const normalized = RepositoryTargetSchema.parse(repository).toLowerCase();
  return scope.components.some(
    (component) => repositoryTarget(component.repositoryId).toLowerCase() === normalized
  );
}

export function targetScopeEquals(
  left: TargetScope | undefined,
  right: TargetScope | undefined
): boolean {
  if (!left && !right) return true;
  if (!left || !right) return false;
  const a = TargetScopeSchema.parse(left);
  const b = TargetScopeSchema.parse(right);
  return JSON.stringify(a) === JSON.stringify(b);
}

export function describeRecordTargetScope(
  rawScope: TargetScope | undefined,
  legacyRepository: string
):
  | { mode: 'LEGACY_SINGLE_REPOSITORY'; repository: string }
  | { mode: 'EXPLICIT'; scope: TargetScope } {
  if (!rawScope) {
    return {
      mode: 'LEGACY_SINGLE_REPOSITORY',
      repository: RepositoryTargetSchema.parse(legacyRepository)
    };
  }
  return { mode: 'EXPLICIT', scope: TargetScopeSchema.parse(rawScope) };
}
