import type { GithubIdentityResolution } from '../github/identityResolution.js';
import type { ProjectReality, ProjectRealityLayer, ProjectRealityLayerId } from '../github/projectReality.js';
import { isOauthConnectionContext } from '../operationalMemory/connectionContext.js';
import type { GovernedOperationalContext, PublicGovernedSession } from './types.js';

/**
 * E1 (TB-W3-E1-01): the mandatory inputs still missing after automatic
 * governed resolution, read from the evidence the governed context already
 * composed: the session connection context (A2), the GitHub identity (B1) and
 * the project reality layers (GW-05..07). Inputs are evaluated in dependency
 * order and only the first unresolved one is surfaced: known context stays
 * RESOLVED and is never asked again, and downstream inputs wait for it. Each
 * gap names its kind and the existing authority that completes it. Runtime,
 * ingress and domain are observations whose proven absence is accepted, never
 * inputs. Pure and read-only: no question is asked, nothing is authorized and
 * only reason codes travel, never a principal, login or identifier.
 */
export const MISSING_CONTEXT_ITEMS = [
  'OAUTH_IDENTITY',
  'GITHUB_IDENTITY',
  'REPOSITORY',
  'PROJECT_MAPPING',
  'SERVER_BINDING'
] as const;
export type MissingContextItemId = typeof MISSING_CONTEXT_ITEMS[number];
export type MissingContextState =
  | 'RESOLVED'
  | 'MISSING'
  | 'AMBIGUOUS'
  | 'CONFLICT'
  | 'UNOBSERVED'
  | 'BLOCKED_UPSTREAM';
export type MissingContextCompletion =
  | 'NONE'
  | 'AUTOMATIC'
  | 'OPERATOR_INPUT'
  | 'OPERATOR_CHOICE'
  | 'RECONCILIATION'
  | 'UNAVAILABLE'
  | 'AFTER_UPSTREAM';
/** Existing surfaces and authorities only: no new route, store or form. */
export type MissingContextSurface =
  | 'mcp_open_governed_session'
  | 'mcp_reconcile_governed_context'
  | '/oauth/authorize'
  | '/github'
  | '/git'
  | '.mcp/identity-policy.json'
  | 'data/github-accounts.json';
export type MissingContextStatus =
  | 'COMPLETE'
  | 'AUTOMATIC'
  | 'INPUT_REQUIRED'
  | 'RECONCILIATION_REQUIRED'
  | 'UNOBSERVABLE';

export type MissingContextItem = Readonly<{
  item: MissingContextItemId;
  state: MissingContextState;
  completion: MissingContextCompletion;
  /** The existing authority completing the input; null when resolved or none can. */
  surface: MissingContextSurface | null;
  reasonCodes: readonly string[];
}>;

export type MissingContext = Readonly<{
  status: MissingContextStatus;
  observedAt: string;
  items: readonly MissingContextItem[];
  /** The first unresolved input, the only one surfaced; null when complete. */
  next: MissingContextItem | null;
  authorizationInferred: false;
  mutationPerformed: false;
}>;

export type MissingContextSource = {
  generatedAt: string;
  repository: GovernedOperationalContext['repository'];
  session: PublicGovernedSession | null;
  github: {
    error: string | null;
    identity?: GithubIdentityResolution | null;
  };
  projectReality?: ProjectReality | null;
};

type Gap = Omit<MissingContextItem, 'item' | 'reasonCodes'>;
type LayerItemId = Exclude<MissingContextItemId, 'OAUTH_IDENTITY' | 'GITHUB_IDENTITY'>;

const CODE_PATTERN = /^[A-Z][A-Z0-9_]{1,79}$/;
const MAX_REASON_CODES = 10;
const TARGET_REPOSITORY_NOT_OBSERVED = 'github_target_repository_not_observed';

const RESOLVED: Gap = { state: 'RESOLVED', completion: 'NONE', surface: null };
const BLOCKED: Gap = { state: 'BLOCKED_UPSTREAM', completion: 'AFTER_UPSTREAM', surface: null };
const RECONCILE: Gap = { state: 'CONFLICT', completion: 'RECONCILIATION', surface: null };
const REOBSERVE: Gap = { state: 'UNOBSERVED', completion: 'AUTOMATIC', surface: 'mcp_reconcile_governed_context' };
const input = (surface: MissingContextSurface | null): Gap => ({ state: 'MISSING', completion: 'OPERATOR_INPUT', surface });
const choice = (surface: MissingContextSurface | null): Gap => ({ state: 'AMBIGUOUS', completion: 'OPERATOR_CHOICE', surface });

/**
 * GitHub identity gaps, by the authority that owns them: the versioned binding
 * policy, the configured durable connections and the GitHub credential and
 * account surface. Any other unverified identity is re-observed.
 */
const IDENTITY_GAPS: ReadonlyMap<string, Gap> = new Map([
  ['GITHUB_IDENTITY_PRINCIPAL_MISMATCH', RECONCILE],
  ['GITHUB_IDENTITY_POLICY_INVALID', RECONCILE],
  ['GITHUB_IDENTITY_BINDING_NOT_FOUND', input('.mcp/identity-policy.json')],
  ['GITHUB_IDENTITY_BINDING_AMBIGUOUS', choice('.mcp/identity-policy.json')],
  ['GITHUB_IDENTITY_CONNECTION_NOT_FOUND', input('data/github-accounts.json')],
  ['GITHUB_IDENTITY_CONNECTION_AMBIGUOUS', choice('data/github-accounts.json')],
  ['GITHUB_IDENTITY_AUTHENTICATION_CONTEXT_UNAVAILABLE', input('data/github-accounts.json')],
  ['GITHUB_IDENTITY_AUTH_MISSING', input('/github')],
  ['GITHUB_IDENTITY_AUTH_INVALID', input('/github')],
  ['GITHUB_IDENTITY_ACCOUNT_CONTEXT_UNVERIFIED', input('/github')]
]);

/**
 * Unverified layer evidence that re-observation cannot restore: access to the
 * repository comes with the GitHub credential, the requested repository with
 * the governed session, and authorities that disagree are reconciled.
 */
const LAYER_GAPS: ReadonlyMap<string, Gap> = new Map([
  ['GITHUB_REPOSITORY_NOT_FOUND_OR_INVISIBLE', input('/github')],
  ['GITHUB_REPOSITORY_PERMISSION_DENIED', input('/github')],
  ['GITHUB_REPOSITORY_AUTH_MISSING', input('/github')],
  ['GITHUB_REPOSITORY_AUTH_INVALID', input('/github')],
  ['GITHUB_REPOSITORY_CONTEXT_INVALID', input('mcp_open_governed_session')],
  ['SERVER_ID_UNVERIFIED', RECONCILE],
  ['SERVER_PROJECT_MAPPING_MISMATCH', RECONCILE],
  ['SERVER_CANONICAL_ID_SET_INVALID', RECONCILE]
]);

/** The authority completing a missing or ambiguous layer (GitRegistry owns the mappings). */
const LAYER_SURFACE: Readonly<Record<LayerItemId, MissingContextSurface>> = {
  REPOSITORY: 'mcp_open_governed_session',
  PROJECT_MAPPING: '/git',
  SERVER_BINDING: '/git'
};
const LAYER_OF: Readonly<Record<LayerItemId, ProjectRealityLayerId>> = {
  REPOSITORY: 'REPOSITORY',
  PROJECT_MAPPING: 'PROJECT',
  SERVER_BINDING: 'SERVER'
};

const STATUS_OF: Readonly<Partial<Record<MissingContextCompletion, MissingContextStatus>>> = {
  AUTOMATIC: 'AUTOMATIC',
  OPERATOR_INPUT: 'INPUT_REQUIRED',
  OPERATOR_CHOICE: 'INPUT_REQUIRED',
  RECONCILIATION: 'RECONCILIATION_REQUIRED',
  UNAVAILABLE: 'UNOBSERVABLE'
};

const RANK: Readonly<Record<MissingContextState, number>> = {
  CONFLICT: 0,
  MISSING: 1,
  AMBIGUOUS: 1,
  UNOBSERVED: 2,
  RESOLVED: 3,
  BLOCKED_UPSTREAM: 3
};

type Evaluation = { gap: Gap; reasonCodes: readonly string[] };

function codes(values: readonly string[] | null | undefined, fallback: string): readonly string[] {
  const valid = [...new Set((values ?? []).filter((value) => CODE_PATTERN.test(value)))].slice(0, MAX_REASON_CODES);
  return valid.length > 0 ? valid : [fallback];
}

/** The most blocking gap any of the codes names: reconciliation, then input, then none. */
function named(table: ReadonlyMap<string, Gap>, reasonCodes: readonly string[]): Gap | null {
  return reasonCodes
    .map((code) => table.get(code))
    .filter((gap): gap is Gap => Boolean(gap))
    .sort((left, right) => RANK[left.state] - RANK[right.state])[0] ?? null;
}

function oauthIdentity(session: PublicGovernedSession | null): Evaluation {
  if (!session) {
    return {
      gap: { state: 'UNOBSERVED', completion: 'AUTOMATIC', surface: 'mcp_open_governed_session' },
      reasonCodes: ['MISSING_CONTEXT_SESSION_UNBOUND']
    };
  }
  // The GitHub identity scope's own predicate: resolved exactly when it carries a principal.
  if (isOauthConnectionContext(session.connectionContext)) return { gap: RESOLVED, reasonCodes: [] };
  // A non-OAuth client cannot be completed by the agent: the client connects through OAuth.
  if (session.identityAssurance !== 'oauth_subject') {
    return { gap: input('/oauth/authorize'), reasonCodes: ['MISSING_CONTEXT_OAUTH_IDENTITY_REQUIRED'] };
  }
  return {
    gap: { state: 'UNOBSERVED', completion: 'AUTOMATIC', surface: 'mcp_open_governed_session' },
    reasonCodes: ['MISSING_CONTEXT_CONNECTION_CONTEXT_UNBOUND']
  };
}

function githubIdentity(source: MissingContextSource): Evaluation {
  // The GitHub observer covers the MCP governance repository only (B3.2):
  // re-observation cannot reach another target repository.
  if (source.github.error === TARGET_REPOSITORY_NOT_OBSERVED) {
    return {
      gap: { state: 'UNOBSERVED', completion: 'UNAVAILABLE', surface: null },
      reasonCodes: ['MISSING_CONTEXT_TARGET_REPOSITORY_NOT_OBSERVED']
    };
  }
  const identity = source.github.identity;
  if (!identity) return { gap: REOBSERVE, reasonCodes: ['MISSING_CONTEXT_GITHUB_IDENTITY_UNAVAILABLE'] };
  if (identity.status === 'RESOLVED' && identity.freshness === 'CURRENT') return { gap: RESOLVED, reasonCodes: [] };
  // A resolution that is no longer current is stale evidence, said with the resolver's own code.
  const reasonCodes = codes(
    identity.reasonCodes,
    identity.status === 'RESOLVED' ? 'GITHUB_IDENTITY_EVIDENCE_STALE' : 'MISSING_CONTEXT_GITHUB_IDENTITY_UNVERIFIED'
  );
  const gap = named(IDENTITY_GAPS, reasonCodes)
    ?? (identity.status === 'NONE' ? input(null) : identity.status === 'AMBIGUOUS' ? choice(null) : REOBSERVE);
  return { gap, reasonCodes };
}

function repositoryKey(value: string | null | undefined): string | null {
  return value ? value.trim().replace(/^github:/i, '').toLowerCase() : null;
}

function layerItem(source: MissingContextSource, item: LayerItemId): Evaluation {
  const reality = source.projectReality;
  const layer: ProjectRealityLayer | undefined = reality?.layers.find((entry) => entry.layer === LAYER_OF[item]);
  if (!reality || !layer) return { gap: REOBSERVE, reasonCodes: ['MISSING_CONTEXT_PROJECT_REALITY_UNAVAILABLE'] };
  if (layer.state === 'VERIFIED') {
    // The reality of another repository never speaks for the session repository.
    if (item === 'REPOSITORY' && repositoryKey(reality.repositoryId) !== repositoryKey(source.repository)) {
      return { gap: RECONCILE, reasonCodes: ['MISSING_CONTEXT_REPOSITORY_BINDING_MISMATCH'] };
    }
    return { gap: RESOLVED, reasonCodes: [] };
  }
  const reasonCodes = codes(layer.reasonCodes, `MISSING_CONTEXT_${LAYER_OF[item]}_UNVERIFIED`);
  if (layer.state === 'CONFLICT') return { gap: RECONCILE, reasonCodes };
  const gap = named(LAYER_GAPS, reasonCodes)
    ?? (layer.state === 'AMBIGUOUS'
      ? choice(LAYER_SURFACE[item])
      : layer.state === 'NONE'
        ? input(LAYER_SURFACE[item])
        : REOBSERVE);
  return { gap, reasonCodes };
}

function freeze(item: MissingContextItemId, evaluation: Evaluation): MissingContextItem {
  return Object.freeze({
    item,
    state: evaluation.gap.state,
    completion: evaluation.gap.completion,
    surface: evaluation.gap.surface,
    reasonCodes: Object.freeze([...evaluation.reasonCodes])
  });
}

export function deriveMissingContext(source: MissingContextSource): MissingContext {
  const evaluate: Record<MissingContextItemId, () => Evaluation> = {
    OAUTH_IDENTITY: () => oauthIdentity(source.session),
    GITHUB_IDENTITY: () => githubIdentity(source),
    REPOSITORY: () => layerItem(source, 'REPOSITORY'),
    PROJECT_MAPPING: () => layerItem(source, 'PROJECT_MAPPING'),
    SERVER_BINDING: () => layerItem(source, 'SERVER_BINDING')
  };
  const items: MissingContextItem[] = [];
  let next: MissingContextItem | null = null;
  for (const id of MISSING_CONTEXT_ITEMS) {
    // An input never resolves past one it depends on: downstream waits, unasked.
    const entry: MissingContextItem = next
      ? freeze(id, { gap: BLOCKED, reasonCodes: ['MISSING_CONTEXT_UPSTREAM_UNRESOLVED'] })
      : freeze(id, evaluate[id]());
    if (!next && entry.state !== 'RESOLVED') next = entry;
    items.push(entry);
  }
  return Object.freeze({
    status: next ? STATUS_OF[next.completion] ?? 'AUTOMATIC' : 'COMPLETE',
    observedAt: source.generatedAt,
    items: Object.freeze(items),
    next,
    authorizationInferred: false as const,
    mutationPerformed: false as const
  });
}
