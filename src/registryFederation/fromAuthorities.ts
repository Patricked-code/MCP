/**
 * Evidence-only adapters over GitRegistry and the existing Governed Task Queue.
 * No second store, network request, mutation, admission or permission inference.
 * Project mappings are DECLARED until repository/project reality proves them.
 */
import type { GitRegistryV1, GitRegistryV2 } from '../github/registryV2.js';
import type { GovernedTaskRecord } from '../operationalMemory/types.js';
import {
  buildFederatedRegistryProjection, federatedIdentityKey,
  type FederatedEntityInput, type FederatedIdentity,
  type FederatedLinkInput, type FederatedProjection, type FederatedVerification
} from './projection.js';

type QueuedTask = Pick<GovernedTaskRecord,
  'taskId' | 'repository' | 'status' | 'title' | 'updatedAt' | 'targetScope' | 'dependencies'>;

export type FederatedAuthoritySnapshots = Readonly<{
  observedAt: string;
  registry: GitRegistryV1 | GitRegistryV2;
  queue: Readonly<{ storeRevision: number; tasks: readonly QueuedTask[] }> | null;
}>;

// Namespace of the existing registry authority, not a hard-coded repository target.
const SCOPE = 'MCP_GIT_REGISTRY';
const PROJECT_AUTHORITY = 'GIT_REGISTRY';
const TASK_AUTHORITY = 'GOVERNED_TASK_QUEUE';

const projectId = (id: string): FederatedIdentity => ({
  kind: 'PROJECT', authority: PROJECT_AUTHORITY, authorityScope: SCOPE, sourceId: id
});
const repoId = (id: string): FederatedIdentity => ({
  kind: 'REPOSITORY', authority: PROJECT_AUTHORITY, authorityScope: SCOPE, sourceId: id
});
const taskId = (repository: string, id: string): FederatedIdentity => ({
  kind: 'TASK', authority: TASK_AUTHORITY, authorityScope: repository, sourceId: id
});

/**
 * Do not use the GitRegistry timestamp as a live verification timestamp.
 * The observedAt is when its immutable snapshot was actually read.
 */
export function projectExistingMcpAuthorities(input: FederatedAuthoritySnapshots): FederatedProjection {
  if (!Number.isSafeInteger(input.queue?.storeRevision ?? 0)
    || (input.queue?.storeRevision ?? 0) < 0) throw Error('FEDERATION_QUEUE_REVISION_INVALID');
  const entities: FederatedEntityInput[] = [];
  const links: FederatedLinkInput[] = [];
  const seenProjects = new Map<string, {
    label: string | null; uid: string | null; uids: Set<string>; index: number
  }>();
  const seenRepos = new Set<string>();
  const schema = 'schemaVersion' in input.registry && input.registry.schemaVersion === 2 ? 2 : 1;
  const registryVersion = 'gitregistry-v' + schema + ':' + input.registry.updatedAt;
  const evidence = (scope: string, id: string, verification: FederatedVerification = 'DECLARED') => ({
    observedAt: input.observedAt, verification,
    sourceVersion: registryVersion,
    evidenceRef: 'gitregistry:' + scope + ':' + id
  });
  const addProject = (id: string, label: string | null, uid: string | null = null) => {
    const previous = seenProjects.get(id);
    const claims = (value: string | null) => value ? [{
      namespace: 'PROJECT_UID', value,
      evidence: evidence('project_uid', value)
    }] : [];
    if (previous) {
      if (uid && previous.uid && uid !== previous.uid) {
        // Conflicting claims retain both identifiers, independently of the
        // order of legacy mappings. The projection will mark this as CONFLICT.
        previous.uids.add(uid);
        entities.push({
          identity: projectId(id), label: previous.label,
          evidence: evidence('project', id), identifiers: claims(uid)
        });
      } else if ((uid && !previous.uid) || (label && !previous.label)) {
        // A later verified identity declaration may fill an absent UID/label;
        // absence is not a conflicting identity claim.
        const existing = entities[previous.index]!;
        if (uid && !previous.uid) {
          previous.uid = uid;
          previous.uids.add(uid);
        }
        if (label && !previous.label) previous.label = label;
        entities[previous.index] = {
          ...existing,
          label: previous.label,
          identifiers: claims(previous.uid)
        };
      }
      return;
    }
    seenProjects.set(id, { label, uid, uids: new Set(uid ? [uid] : []), index: entities.length });
    entities.push({
      identity: projectId(id), label,
      evidence: evidence('project', id), identifiers: claims(uid)
    });
  };
  const addRepository = (id: string) => {
    if (seenRepos.has(id)) return;
    seenRepos.add(id);
    entities.push({
      identity: repoId(id),
      evidence: evidence('repository', id, 'DECLARED')
    });
  };
  const addMapping = (project: string, repository: string, mapping: string) => {
    links.push({
      fromKey: federatedIdentityKey(projectId(project)),
      toKey: federatedIdentityKey(repoId(repository)),
      relation: 'MAPS_TO',
      authority: PROJECT_AUTHORITY,
      evidence: evidence('mapping', mapping)
    });
  };

  if (schema === 2) {
    const registry = input.registry as GitRegistryV2;
    for (const project of registry.projects ?? []) addProject(project.projectId, project.name, project.projectUid);
    for (const repository of registry.repositories) addRepository(repository.repositoryId);
    for (const mapping of registry.mappings) {
      // A projectId in a mapping is a declaration, not proof that the project exists.
      addProject(mapping.projectId, null, mapping.projectUid ?? null);
      addMapping(mapping.projectId, mapping.repositoryId, mapping.mappingId);
    }
  } else {
    const registry = input.registry as GitRegistryV1;
    for (const project of registry.projects ?? []) addProject(project.projectId, project.name, project.projectUid);
    for (const mapping of registry.repoMappings) {
      const rid = 'github:' + mapping.githubOwner + '/' + mapping.githubRepo;
      addRepository(rid);
      // projectKey alone is NEVER promoted into a project ID.
      if (mapping.projectId) {
        addProject(mapping.projectId, null, mapping.projectUid ?? null);
        addMapping(mapping.projectId, rid, mapping.id);
      }
    }
  }

  if (input.queue) {
    const revision = 'queue-rev:' + input.queue.storeRevision;
    // Runtime admission resolves dependencies by Task ID across the full
    // queue, not just the dependent task's repository. Missing or ambiguous
    // IDs must remain unresolved, never mapped to an arbitrary repository.
    const byTaskId = new Map<string, QueuedTask[]>();
    for (const candidate of input.queue.tasks) {
      const existing = byTaskId.get(candidate.taskId) ?? [];
      existing.push(candidate);
      byTaskId.set(candidate.taskId, existing);
    }
    for (const task of input.queue.tasks) {
      const tid = taskId(task.repository, task.taskId);
      const stamp = {
        observedAt: input.observedAt,
        verification: 'VERIFIED' as const,
        evidenceRef: 'governed-task-queue:' + task.repository + ':' + task.taskId,
        sourceVersion: revision
      };
      entities.push({ identity: tid, evidence: stamp, label: task.title, taskStatus: task.status });
      // A TargetScope is a declaration; verified Project Reality is a separate gate.
      const scope = task.targetScope;
      if (scope && seenProjects.has(scope.projectId)) {
        const claimedUids = seenProjects.get(scope.projectId)!.uids;
        const uidMismatch = claimedUids.size > 1
          || (scope.projectUid !== null && claimedUids.size > 0 && !claimedUids.has(scope.projectUid));
        links.push({
          fromKey: federatedIdentityKey(tid),
          toKey: federatedIdentityKey(projectId(scope.projectId)),
          relation: 'BELONGS_TO',
          authority: TASK_AUTHORITY,
          evidence: { ...stamp, verification: uidMismatch ? 'CONFLICT' : 'DECLARED' }
        });
      }
      for (const dep of task.dependencies) {
        const matches = byTaskId.get(dep) ?? [];
        const referencedRepository = matches.length === 1 ? matches[0]!.repository
          : matches.length === 0 ? task.repository : 'UNRESOLVED_TASK_SCOPE';
        links.push({
          fromKey: federatedIdentityKey(tid),
          toKey: federatedIdentityKey(taskId(referencedRepository, dep)),
          relation: 'DEPENDS_ON',
          authority: TASK_AUTHORITY,
          evidence: { ...stamp, verification: matches.length > 1 ? 'AMBIGUOUS' : 'DECLARED' }
        });
      }
    }
  }
  return buildFederatedRegistryProjection({ observedAt: input.observedAt, entities, links });
}
