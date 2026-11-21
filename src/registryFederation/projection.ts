/**
 * Registry Resolution mission (WT-MCP-REGISTRY-RESOLUTION-20261121-01).
 *
 * Pure, bounded projection across existing authorities. It does NOT fetch,
 * persist, promote, admit, claim, lock or execute anything. In particular,
 * GitRegistry, Operational Memory and CUG receipts keep their own authority.
 */
export const FEDERATED_ENTITY_KINDS = [
  'PROJECT', 'SUBPROJECT', 'REPOSITORY', 'WORKSTREAM', 'CONTINUITY',
  'TASK', 'SESSION', 'BLUEPRINT', 'PULL_REQUEST', 'CHECKPOINT',
  'COMPONENT', 'DOCUMENT'
] as const;

export type FederatedEntityKind = typeof FEDERATED_ENTITY_KINDS[number];
export type FederatedVerification =
  | 'VERIFIED' | 'DECLARED' | 'UNVERIFIED' | 'STALE' | 'AMBIGUOUS' | 'CONFLICT';
export type FederatedLinkType =
  | 'BELONGS_TO' | 'MAPS_TO' | 'CONTAINS' | 'DEPENDS_ON'
  | 'SUPERSEDED_BY' | 'HAS_CHECKPOINT' | 'TRACKED_BY';
export type FederatedTaskState =
  | 'DISCOVERED' | 'READY' | 'CLAIMED' | 'IN_PROGRESS' | 'REVIEW'
  | 'MERGE_READY' | 'DEPLOYING' | 'VERIFYING' | 'BLOCKED'
  | 'CONFLICT' | 'DONE' | 'CANCELLED' | 'SUPERSEDED';

export type FederatedIdentity = Readonly<{
  kind: FederatedEntityKind;
  /** Source authority, e.g. GIT_REGISTRY or GOVERNED_TASK_QUEUE. */
  authority: string;
  /** Required to keep identical task IDs in different repositories distinct. */
  authorityScope: string;
  /** Historical ID, NEVER rewritten or inferred from title/name. */
  sourceId: string;
}>;

export type FederatedEvidence = Readonly<{
  observedAt: string;
  verification: FederatedVerification;
  /** A stable citation/receipt id at the owning authority, not a credential. */
  evidenceRef: string | null;
  sourceVersion: string | null;
}>;

export type FederatedIdentifierClaim = Readonly<{
  namespace: string;
  value: string;
  evidence: FederatedEvidence;
}>;

export type FederatedEntityInput = Readonly<{
  identity: FederatedIdentity;
  evidence: FederatedEvidence;
  /** Non-authoritative, optional display value only. */
  label?: string | null;
  /** Only valid for TASK. An historical SUPERSEDED remains terminal. */
  taskStatus?: FederatedTaskState | null;
  /** Source-declared alternate IDs (e.g. projectUid), never automatic aliases. */
  identifiers?: readonly FederatedIdentifierClaim[];
}>;

export type FederatedLinkInput = Readonly<{
  fromKey: string;
  toKey: string;
  relation: FederatedLinkType;
  authority: string;
  evidence: FederatedEvidence;
}>;

export type FederatedProjectedEntity = Readonly<{
  key: string;
  identity: FederatedIdentity;
  evidence: FederatedEvidence;
  label: string | null;
  taskStatus: FederatedTaskState | null;
  /** All conflicting task-state claims are retained for historical inspection. */
  taskStatusClaims: readonly FederatedTaskState[];
  identifiers: readonly FederatedIdentifierClaim[];
  reasons: readonly string[];
}>;

export type FederatedProjectedLink = Readonly<{
  fromKey: string;
  toKey: string;
  relation: FederatedLinkType;
  authority: string;
  evidence: FederatedEvidence;
  verification: FederatedVerification;
  reasons: readonly string[];
}>;

export type FederatedProjection = Readonly<{
  schemaVersion: 1;
  observedAt: string;
  entities: readonly FederatedProjectedEntity[];
  links: readonly FederatedProjectedLink[];
  completeness: 'PARTIAL';
  authorizationInferred: false;
  mutationPerformed: false;
}>;

const ENTITY_LIMIT = 5000;
const LINK_LIMIT = 10000;
const VALID_STATES = new Set<FederatedVerification>([
  'VERIFIED', 'DECLARED', 'UNVERIFIED', 'STALE', 'AMBIGUOUS', 'CONFLICT'
]);
const VALID_KINDS: ReadonlySet<string> = new Set(FEDERATED_ENTITY_KINDS);
const VALID_LINKS: ReadonlySet<string> = new Set([
  'BELONGS_TO', 'MAPS_TO', 'CONTAINS', 'DEPENDS_ON',
  'SUPERSEDED_BY', 'HAS_CHECKPOINT', 'TRACKED_BY'
]);
const VALID_TASK_STATES: ReadonlySet<string> = new Set([
  'DISCOVERED', 'READY', 'CLAIMED', 'IN_PROGRESS', 'REVIEW',
  'MERGE_READY', 'DEPLOYING', 'VERIFYING', 'BLOCKED',
  'CONFLICT', 'DONE', 'CANCELLED', 'SUPERSEDED'
]);

function bounded(value: string, field: string): string {
  if (typeof value !== 'string' || !value.trim() || value.length > 240
    || /[\u0000-\u001f\u007f]/.test(value)) throw new Error('FEDERATION_INVALID_' + field);
  return value;
}

function time(value: string, asOf?: number): number {
  const millis = typeof value === 'string' ? Date.parse(value) : NaN;
  if (!Number.isFinite(millis) || !value.endsWith('Z') || (asOf !== undefined && millis > asOf)) {
    throw new Error('FEDERATION_INVALID_OBSERVED_AT');
  }
  return millis;
}

/** Identity keys are scoped, reversible and never depend on a display name. */
export function federatedIdentityKey(identity: FederatedIdentity): string {
  if (!VALID_KINDS.has(identity.kind)) throw new Error('FEDERATION_INVALID_KIND');
  return [identity.kind,
    bounded(identity.authority, 'AUTHORITY'),
    bounded(identity.authorityScope, 'SCOPE'),
    bounded(identity.sourceId, 'SOURCE_ID')
  ].map(encodeURIComponent).join('|');
}

function evidence(input: FederatedEvidence, asOf: number): FederatedEvidence {
  time(input.observedAt, asOf);
  if (!VALID_STATES.has(input.verification)) throw new Error('FEDERATION_INVALID_VERIFICATION');
  if (input.evidenceRef !== null) bounded(input.evidenceRef, 'EVIDENCE');
  if (input.sourceVersion !== null) bounded(input.sourceVersion, 'VERSION');
  return Object.freeze({ ...input });
}

function withoutProof(e: FederatedEvidence): boolean {
  return e.verification === 'VERIFIED' && (!e.evidenceRef || !e.sourceVersion);
}
function declassify(e: FederatedEvidence): FederatedEvidence {
  return withoutProof(e) ? Object.freeze({ ...e, verification: 'UNVERIFIED' as const }) : e;
}

function sorted<T>(values: Iterable<T>, key: (value: T) => string): T[] {
  return [...values].sort((a, b) => key(a).localeCompare(key(b), 'en'));
}

/**
 * Merge in memory only. Conflicting claims from the same authority fail closed.
 * It does not assume that every GitHub repository is an admitted project.
 */
export function buildFederatedRegistryProjection(input: Readonly<{
  observedAt: string;
  entities: readonly FederatedEntityInput[];
  links: readonly FederatedLinkInput[];
}>): FederatedProjection {
  const asOf = time(input.observedAt);
  if (input.entities.length > ENTITY_LIMIT || input.links.length > LINK_LIMIT) {
    throw new Error('FEDERATION_LIMIT_EXCEEDED');
  }
  const entities = new Map<string, FederatedProjectedEntity>();
  for (const source of input.entities) {
    const key = federatedIdentityKey(source.identity);
    const stamp = declassify(evidence(source.evidence, asOf));
    const taskStatus = source.taskStatus ?? null;
    if (taskStatus !== null && (source.identity.kind !== 'TASK' || !VALID_TASK_STATES.has(taskStatus))) {
      throw new Error('FEDERATION_INVALID_TASK_STATUS');
    }
    const label = source.label == null ? null : bounded(source.label, 'LABEL');
    if ((source.identifiers?.length ?? 0) > 20) throw Error('FEDERATION_IDENTIFIER_LIMIT');
    const identifiers = (source.identifiers ?? []).map((value) => Object.freeze({
      namespace: bounded(value.namespace, 'IDENTIFIER_NAMESPACE'),
      value: bounded(value.value, 'IDENTIFIER_VALUE'),
      evidence: declassify(evidence(value.evidence, asOf))
    }));
    const candidate: FederatedProjectedEntity = Object.freeze({
      key,
      identity: Object.freeze({ ...source.identity }),
      evidence: stamp,
      label,
      taskStatus,
      taskStatusClaims: Object.freeze(taskStatus === null ? [] : [taskStatus]),
      identifiers: Object.freeze(identifiers),
      reasons: Object.freeze(withoutProof(source.evidence) ? ['FEDERATION_PROOF_MISSING'] : [])
    });
    const prior = entities.get(key);
    if (!prior) {
      entities.set(key, candidate);
      continue;
    }
    if (prior.evidence.observedAt === stamp.observedAt
      && prior.evidence.verification === stamp.verification
      && prior.evidence.evidenceRef === stamp.evidenceRef
      && prior.evidence.sourceVersion === stamp.sourceVersion
      && prior.label === label && prior.taskStatus === taskStatus
      && JSON.stringify(prior.identifiers) === JSON.stringify(identifiers)) continue;
    // A conflict never silently hides a historical terminal status, even
    // when a stale READY observation happened to be processed first.
    const taskStatusClaims = Object.freeze(
      [...new Set([...prior.taskStatusClaims, ...candidate.taskStatusClaims])]
        .sort() as FederatedTaskState[]);
    const terminal: FederatedTaskState | null =
      taskStatusClaims.includes('SUPERSEDED') ? 'SUPERSEDED'
      : taskStatusClaims.includes('CANCELLED') ? 'CANCELLED'
      : taskStatusClaims.includes('DONE') ? 'DONE' : null;
    // Preserve ALL identity evidence in a conflict, including incompatible
    // PROJECT_UID values. Stable sorting prevents a registry mapping order
    // from controlling which contradictory claim a consumer can inspect.
    const claims = new Map<string, FederatedIdentifierClaim>();
    for (const claim of [...prior.identifiers, ...candidate.identifiers]) {
      const claimKey = JSON.stringify([claim.namespace, claim.value,
        claim.evidence.observedAt, claim.evidence.verification,
        claim.evidence.evidenceRef, claim.evidence.sourceVersion]);
      claims.set(claimKey, claim);
    }
    if (claims.size > 20) throw new Error('FEDERATION_IDENTIFIER_LIMIT');
    const conflictingIdentifiers = Object.freeze(
      [...claims.entries()].sort(([left], [right]) => left.localeCompare(right, 'en'))
        .map(([, claim]) => claim));
    entities.set(key, Object.freeze({
      ...prior,
      taskStatus: terminal ?? (taskStatusClaims.length === 1 ? taskStatusClaims[0]! : null),
      taskStatusClaims,
      identifiers: conflictingIdentifiers,
      evidence: Object.freeze({ ...prior.evidence, verification: 'CONFLICT' as const }),
      reasons: Object.freeze(['FEDERATION_SOURCE_CONFLICT'])
    }));
  }

  const links = new Map<string, FederatedProjectedLink>();
  for (const source of input.links) {
    if (!VALID_LINKS.has(source.relation)) throw new Error('FEDERATION_INVALID_RELATION');
    const authority = bounded(source.authority, 'LINK_AUTHORITY');
    // An identity key contains four bounded components and can exceed 240 chars.
    const linkKey = (key: string) => {
      if (typeof key !== 'string' || !key.length || key.length > 1400
        || /[\u0000-\u001f\u007f]/.test(key)) throw Error('FEDERATION_INVALID_LINK_KEY');
      return key;
    };
    const fromKey = linkKey(source.fromKey);
    const toKey = linkKey(source.toKey);
    const stamp = declassify(evidence(source.evidence, asOf));
    const from = entities.get(fromKey);
    const to = entities.get(toKey);
    const reasons: string[] = [];
    if (!from || !to) reasons.push('FEDERATION_ENDPOINT_UNRESOLVED');
    else if (from.evidence.verification !== 'VERIFIED' || to.evidence.verification !== 'VERIFIED') {
      reasons.push('FEDERATION_ENDPOINT_UNVERIFIED');
    }
    if (withoutProof(source.evidence)) reasons.push('FEDERATION_PROOF_MISSING');
    const verification: FederatedVerification = reasons.length > 0 && stamp.verification === 'VERIFIED'
      ? 'UNVERIFIED' : stamp.verification;
    const entry: FederatedProjectedLink = Object.freeze({
      fromKey, toKey, relation: source.relation, authority,
      evidence: stamp,
      verification,
      reasons: Object.freeze(reasons)
    });
    // An identical event is idempotent; conflicting versions are not silently overwritten.
    const key = JSON.stringify([fromKey, toKey, source.relation, authority]);
    const prior = links.get(key);
    if (!prior) links.set(key, entry);
    else if (JSON.stringify(prior) !== JSON.stringify(entry)) {
      links.set(key, Object.freeze({
        ...prior,
        verification: 'CONFLICT',
        reasons: Object.freeze(['FEDERATION_LINK_CONFLICT'])
      }));
    }
  }

  return Object.freeze({
    schemaVersion: 1,
    observedAt: input.observedAt,
    entities: Object.freeze(sorted(entities.values(), (x) => x.key)),
    links: Object.freeze(sorted(links.values(),
      (x) => JSON.stringify([x.fromKey, x.relation, x.toKey]))),
    completeness: 'PARTIAL',
    authorizationInferred: false,
    mutationPerformed: false
  });
}
