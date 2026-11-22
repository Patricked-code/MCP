/**
 * RG-011/019/023/027/034/054 — read-only, mission-scoped continuity view.
 *
 * Compose only caller-attested snapshots from the EXISTING GitHub/document,
 * GitRegistry and Governed Task Queue authorities. No IO, memory store,
 * ProjectRecord admission, task claim, permissions or implicit aliases.
 *
 * This is NOT an MCP tool/transport or a live readback. A transport adapter
 * must first authenticate, authorize each source and load fresh snapshots.
 */
import type { MissionIdentityCrosswalk } from './missionIdentityCrosswalk.js';
import type { FederatedProjection, FederatedProjectedEntity } from './projection.js';

export type ContinuityVerification =
  'VERIFIED' | 'DECLARED' | 'UNVERIFIED' | 'STALE' | 'CONFLICT' | 'INACCESSIBLE';

export type ContinuityEvidence = Readonly<{
  authority: string;
  reference: string;
  observedAt: string;
  sourceCommitSha: string | null;
  verification: ContinuityVerification;
}>;

export type ContinuityDocument = Readonly<{
  ownerContinuityId: string;
  documentType: string;
  path: string;
  inherited: boolean;
  evidence: ContinuityEvidence;
}>;

export type ContinuityEventKind =
  'MANDATE' | 'INTENTION' | 'DECISION' | 'ARCHITECTURE' | 'CHECKPOINT'
  | 'TASK_TRANSITION' | 'PULL_REQUEST' | 'CI' | 'REVIEW' | 'MERGE'
  | 'DEPLOY' | 'RUNTIME_ATTESTATION' | 'PRIORITY_CHANGE' | 'CORRECTION';

export type ContinuityEvent = Readonly<{
  eventId: string;
  ownerContinuityId: string;
  kind: ContinuityEventKind;
  occurredAt: string;
  description: string;
  predecessorId: string | null;
  evidence: ContinuityEvidence;
}>;

export type ContinuityWorkPackage = Readonly<{
  workPackageId: string;
  ownerContinuityId: string;
  status: 'PLANNED' | 'IN_PROGRESS' | 'BLOCKED' | 'DONE' | 'SUPERSEDED';
  dependsOn: readonly string[];
  evidence: ContinuityEvidence;
}>;

export type ContinuityTaskBinding = Readonly<{
  /** Exact key from the existing FederatedProjection, never a guessed Task ID. */
  federatedTaskKey: string;
  ownerContinuityId: string;
  evidence: ContinuityEvidence;
}>;

export type ContinuityAction = Readonly<{
  actionId: string;
  ownerContinuityId: string;
  workPackageId: string;
  description: string;
  priority: number;
  mode: 'READ_ONLY' | 'GOVERNED_WRITE';
  evidence: ContinuityEvidence;
}>;

export type MissionContinuityReadInput = Readonly<{
  continuityId: string;
  parentContinuityId: string | null;
  projectUid: string | null;
  repositoryId: string;
  ownerScope: string;
  observedAt: string;
  sourceCommitSha: string;
  identityCrosswalk: MissionIdentityCrosswalk | null;
  federation: FederatedProjection | null;
  documents: readonly ContinuityDocument[];
  timeline: readonly ContinuityEvent[];
  workPackages: readonly ContinuityWorkPackage[];
  taskBindings: readonly ContinuityTaskBinding[];
  candidateActions: readonly ContinuityAction[];
  /** Server-provided page offset; no pagination state stored by this function. */
  historyOffset?: number;
  historyPageSize?: number;
}>;

export type MissionContinuityReadProjection = Readonly<{
  schemaVersion: 1;
  projectionKind: 'MISSION_CONTINUITY_READ_ONLY';
  continuityId: string;
  parentContinuityId: string | null;
  projectUid: string | null;
  projectId: string | null;
  repositoryId: string;
  ownerScope: string;
  authorityReferences: readonly string[];
  documentationIndex: readonly ContinuityDocument[];
  historicalDecisions: readonly ContinuityEvent[];
  intentions: readonly ContinuityEvent[];
  workPackages: readonly ContinuityWorkPackage[];
  realTaskIds: readonly string[];
  dependencies: readonly Readonly<{ workPackageId: string; dependsOn: string }>[];
  pullRequests: readonly ContinuityEvent[];
  checkpoints: readonly ContinuityEvent[];
  historicalTimeline: readonly ContinuityEvent[];
  historyNextOffset: number | null;
  latestVerifiedCheckpoint: ContinuityEvent | null;
  liveState: null;
  sourceCommitSha: string;
  observedAt: string;
  verificationStatus: 'VERIFIED' | 'UNVERIFIED' | 'CONFLICT';
  conflicts: readonly string[];
  blockers: readonly string[];
  nextActionCurrent: Readonly<{
    actionId: string;
    workPackageId: string;
    description: string;
    mode: 'READ_ONLY' | 'GOVERNED_WRITE';
    readiness: 'READ_ONLY_READY' | 'ADMISSION_REQUIRED';
  }> | null;
  nextActionDependencies: readonly string[];
  admissionRequirements: readonly string[];
  resumeReadiness: 'BLOCKED' | 'CONTEXT_ONLY' | 'READ_ONLY_READY' | 'ADMISSION_REQUIRED';
  evidenceReferences: readonly string[];
  authorizationInferred: false;
  mutationPerformed: false;
}>;

const MAX_SOURCE_ITEMS = 5000;
const NON_EXECUTABLE_WORK = new Set(['DONE', 'SUPERSEDED', 'BLOCKED']);
const TERMINAL_TASKS = new Set(['DONE', 'CANCELLED', 'SUPERSEDED']);
const sha40 = /^[0-9a-f]{40}$/i;

function validDate(value: string, latest: string): boolean {
  const number = Date.parse(value);
  return typeof value === 'string' && Number.isFinite(number)
    && value.endsWith('Z') && number <= Date.parse(latest);
}

function validEvidence(e: ContinuityEvidence, observedAt: string): boolean {
  return Boolean(e && typeof e.reference === 'string' && e.reference.trim()
    && typeof e.authority === 'string' && e.authority.trim()
    && validDate(e.observedAt, observedAt)
    && (!e.sourceCommitSha || sha40.test(e.sourceCommitSha))
    && (e.verification !== 'VERIFIED' || Boolean(e.sourceCommitSha)));
}

function fingerprint(value: unknown): string {
  return JSON.stringify(value);
}

function compareEvents(a: ContinuityEvent, b: ContinuityEvent): number {
  return Date.parse(a.occurredAt) - Date.parse(b.occurredAt) || a.eventId.localeCompare(b.eventId);
}

/** Evidence-only; never assumes that the caller's declarations grant authority. */
export function buildMissionContinuityReadProjection(
  input: MissionContinuityReadInput
): MissionContinuityReadProjection {
  if (!input.continuityId.trim() || input.ownerScope !== input.continuityId
    || !input.repositoryId.trim() || !sha40.test(input.sourceCommitSha)
    || !validDate(input.observedAt, input.observedAt)) {
    throw new Error('MISSION_CONTINUITY_INPUT_INVALID');
  }
  const pageSize = input.historyPageSize ?? 50;
  const offset = input.historyOffset ?? 0;
  if (!Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > 100
    || !Number.isSafeInteger(offset) || offset < 0) {
    throw new Error('MISSION_CONTINUITY_PAGE_INVALID');
  }
  const collections = [
    input.documents, input.timeline, input.workPackages,
    input.taskBindings, input.candidateActions
  ];
  if (collections.some(x => x.length > MAX_SOURCE_ITEMS)) {
    throw new Error('MISSION_CONTINUITY_SOURCE_LIMIT');
  }

  const conflicts = new Set<string>();
  const blockers = new Set<string>();
  const sourceReferences = new Set<string>();
  const observedAuthorities = new Set<string>();
  const accepted = <T extends {ownerContinuityId: string; evidence: ContinuityEvidence}>(
    records: readonly T[], label: string
  ): T[] => {
    const result: T[] = [];
    for (const item of records) {
      // Parent, child and sibling data must not be copied into the local scope.
      if (item.ownerContinuityId !== input.continuityId) {
        blockers.add('FOREIGN_' + label + '_EXCLUDED');
        continue;
      }
      if (!validEvidence(item.evidence, input.observedAt)) {
        blockers.add(label + '_EVIDENCE_UNVERIFIED');
        continue;
      }
      sourceReferences.add(item.evidence.reference);
      observedAuthorities.add(item.evidence.authority);
      if (item.evidence.verification !== 'VERIFIED') {
        blockers.add(label + '_' + item.evidence.verification);
      }
      result.push(item);
    }
    return result;
  };

  const documents = accepted(input.documents, 'DOCUMENT').sort(
    (a, b) => a.documentType.localeCompare(b.documentType) || a.path.localeCompare(b.path)
  );
  if (documents.length === 0) blockers.add('DOCUMENT_AUTHORITIES_MISSING');
  const docByType = new Map<string, ContinuityDocument>();
  for (const doc of documents) {
    const old = docByType.get(doc.documentType);
    if (old && (old.path !== doc.path
      || old.evidence.sourceCommitSha !== doc.evidence.sourceCommitSha)) {
      conflicts.add('DOCUMENT_AUTHORITY_CONFLICT:' + doc.documentType);
    }
    docByType.set(doc.documentType, doc);
  }

  const events = accepted(input.timeline, 'EVENT').sort(compareEvents);
  const byEvent = new Map<string, ContinuityEvent>();
  const timeline: ContinuityEvent[] = [];
  for (const ev of events) {
    if (!ev.eventId.trim() || !validDate(ev.occurredAt, input.observedAt)) {
      blockers.add('EVENT_TIME_OR_ID_UNVERIFIED');
      continue;
    }
    const earlier = byEvent.get(ev.eventId);
    if (earlier) {
      if (fingerprint(earlier) !== fingerprint(ev)) {
        conflicts.add('EVENT_ID_CONFLICT:' + ev.eventId);
      }
      continue; // idempotent replay of identical evidence
    }
    byEvent.set(ev.eventId, ev);
    timeline.push(ev);
  }
  for (const ev of timeline) {
    if (ev.predecessorId && !byEvent.has(ev.predecessorId)) {
      blockers.add('HISTORICAL_PREDECESSOR_MISSING:' + ev.eventId);
    }
    if (ev.predecessorId === ev.eventId) {
      conflicts.add('HISTORICAL_CYCLE:' + ev.eventId);
    }
  }
  const visited = new Set<string>();
  for (const ev of timeline) {
    const chain = new Set<string>();
    let at: ContinuityEvent | undefined = ev;
    while (at && !visited.has(at.eventId)) {
      if (chain.has(at.eventId)) {
        conflicts.add('HISTORICAL_CYCLE:' + ev.eventId);
        break;
      }
      chain.add(at.eventId);
      at = at.predecessorId ? byEvent.get(at.predecessorId) : undefined;
    }
    for (const id of chain) visited.add(id);
  }

  const work = accepted(input.workPackages, 'WORK_PACKAGE').sort(
    (a, b) => a.workPackageId.localeCompare(b.workPackageId)
  );
  const byWork = new Map<string, ContinuityWorkPackage>();
  for (const item of work) {
    const old = byWork.get(item.workPackageId);
    if (old && fingerprint(old) !== fingerprint(item)) {
      conflicts.add('WORK_PACKAGE_CONFLICT:' + item.workPackageId);
    }
    byWork.set(item.workPackageId, item);
  }
  const dependencies: Array<{workPackageId: string; dependsOn: string}> = [];
  for (const item of byWork.values()) {
    for (const dep of item.dependsOn) {
      dependencies.push({workPackageId: item.workPackageId, dependsOn: dep});
      if (!byWork.has(dep)) blockers.add('DEPENDENCY_NOT_IN_SCOPE:' + dep);
    }
  }
  dependencies.sort((a, b) => a.workPackageId.localeCompare(b.workPackageId)
    || a.dependsOn.localeCompare(b.dependsOn));

  const bindings = accepted(input.taskBindings, 'TASK_BINDING');
  const taskIds = new Set<string>();
  for (const binding of bindings) {
    if (binding.evidence.verification !== 'VERIFIED') continue;
    const entity: FederatedProjectedEntity | undefined = input.federation?.entities.find(
      x => x.key === binding.federatedTaskKey && x.identity.kind === 'TASK'
        && x.identity.authority === 'GOVERNED_TASK_QUEUE'
    );
    if (!entity || entity.evidence.verification !== 'VERIFIED' || !entity.evidence.evidenceRef
      || !validDate(entity.evidence.observedAt, input.observedAt)
      || entity.identity.authorityScope !== input.repositoryId.replace(/^github:/, '')) {
      blockers.add('TASK_QUEUE_BINDING_UNVERIFIED');
      continue;
    }
    if (!TERMINAL_TASKS.has(entity.taskStatus ?? '') && !entity.taskStatus) {
      blockers.add('TASK_STATUS_UNKNOWN');
      continue;
    }
    taskIds.add(entity.identity.sourceId);
    sourceReferences.add(entity.evidence.evidenceRef);
    observedAuthorities.add('GOVERNED_TASK_QUEUE');
  }

  const actions = accepted(input.candidateActions, 'ACTION').sort(
    (a, b) => a.priority - b.priority || a.actionId.localeCompare(b.actionId)
  );
  let nextAction: MissionContinuityReadProjection['nextActionCurrent'] = null;
  let actionDependencies: string[] = [];
  for (const action of actions) {
    if (action.evidence.verification !== 'VERIFIED') continue;
    const wp = byWork.get(action.workPackageId);
    if (!wp || NON_EXECUTABLE_WORK.has(wp.status)) continue;
    const outstanding = wp.dependsOn.filter(dep => !byWork.has(dep)
      || byWork.get(dep)!.status !== 'DONE');
    if (outstanding.length) {
      blockers.add('ACTION_DEPENDENCIES_UNMET:' + action.actionId);
      continue;
    }
    nextAction = {
      actionId: action.actionId,
      workPackageId: action.workPackageId,
      description: action.description,
      mode: action.mode,
      readiness: action.mode === 'READ_ONLY' ? 'READ_ONLY_READY' : 'ADMISSION_REQUIRED'
    };
    actionDependencies = [...wp.dependsOn];
    break;
  }

  const crosswalk = input.identityCrosswalk;
  const identityConflict = crosswalk?.status === 'CONFLICT';
  const crosswalkEvidenceUsable = Boolean(crosswalk
    && validDate(crosswalk.observedAt, input.observedAt)
    && crosswalk.sourceCommitSha === input.sourceCommitSha
    && crosswalk.evidenceRefs.length > 0);
  if (identityConflict) conflicts.add('PROJECT_IDENTITY_CONFLICT');
  if (!crosswalkEvidenceUsable || !crosswalk || crosswalk.status !== 'CONSISTENT'
    || crosswalk.continuityId !== input.continuityId
    || crosswalk.documentaryProjectUid !== input.projectUid
    || crosswalk.repositoryId !== input.repositoryId) {
    blockers.add('PROJECT_BINDING_NOT_ATTESTED');
  }
  if (crosswalkEvidenceUsable && crosswalk) {
    observedAuthorities.add('GIT_REGISTRY');
    for (const ref of crosswalk.evidenceRefs) sourceReferences.add(ref);
  }
  const projectId = crosswalkEvidenceUsable && crosswalk?.status === 'CONSISTENT'
    && crosswalk.continuityId === input.continuityId
    && crosswalk.documentaryProjectUid === input.projectUid
    && crosswalk.repositoryId === input.repositoryId
    ? crosswalk.matchedProjectId : null;

  const checkpoints = timeline.filter(e => e.kind === 'CHECKPOINT');
  const latestVerifiedCheckpoint = [...checkpoints].reverse().find(
    e => e.evidence.verification === 'VERIFIED' && Boolean(e.evidence.sourceCommitSha)
  ) ?? null;
  if (!latestVerifiedCheckpoint) blockers.add('VERIFIED_CHECKPOINT_MISSING');
  const hasConflict = conflicts.size > 0;
  if (hasConflict) nextAction = null;
  const admissionRequirements = nextAction?.mode === 'GOVERNED_WRITE'
    ? ['PROJECT_BINDING_VERIFIED', 'REAL_TASK_ADMISSION', 'GOVERNED_SESSION', 'OWNER_AUTHORITY', 'LOCK_CHECK', 'CI_REVIEW_DEPLOY_GATES']
    : [];
  // Without an authenticated live-state / CUG readback, global verification
  // can NEVER be certified by this pure projection, even with a matching ID.
  const verificationStatus = hasConflict ? 'CONFLICT' : 'UNVERIFIED';
  const resumeReadiness = hasConflict ? 'BLOCKED'
    : nextAction?.mode === 'READ_ONLY' ? 'READ_ONLY_READY'
    : nextAction?.mode === 'GOVERNED_WRITE' ? (projectId ? 'ADMISSION_REQUIRED' : 'BLOCKED')
    : 'CONTEXT_ONLY';

  return Object.freeze({
    schemaVersion: 1 as const,
    projectionKind: 'MISSION_CONTINUITY_READ_ONLY' as const,
    continuityId: input.continuityId,
    parentContinuityId: input.parentContinuityId,
    projectUid: input.projectUid,
    projectId,
    repositoryId: input.repositoryId,
    ownerScope: input.ownerScope,
    authorityReferences: Object.freeze([...observedAuthorities].sort()),
    documentationIndex: Object.freeze(documents),
    historicalDecisions: Object.freeze(timeline.filter(e => e.kind === 'DECISION')),
    intentions: Object.freeze(timeline.filter(e => e.kind === 'INTENTION')),
    workPackages: Object.freeze([...byWork.values()]),
    realTaskIds: Object.freeze([...taskIds].sort()),
    dependencies: Object.freeze(dependencies),
    pullRequests: Object.freeze(timeline.filter(e => e.kind === 'PULL_REQUEST')),
    checkpoints: Object.freeze(checkpoints),
    historicalTimeline: Object.freeze(timeline.slice(offset, offset + pageSize)),
    historyNextOffset: offset + pageSize < timeline.length ? offset + pageSize : null,
    latestVerifiedCheckpoint,
    liveState: null as null, // live readback must be supplied by an authorized adapter
    sourceCommitSha: input.sourceCommitSha,
    observedAt: input.observedAt,
    verificationStatus,
    conflicts: Object.freeze([...conflicts].sort()),
    blockers: Object.freeze([...blockers].sort()),
    nextActionCurrent: nextAction,
    nextActionDependencies: Object.freeze(actionDependencies),
    admissionRequirements: Object.freeze(admissionRequirements),
    resumeReadiness,
    evidenceReferences: Object.freeze([...sourceReferences].sort()),
    authorizationInferred: false as const,
    mutationPerformed: false as const
  });
}
