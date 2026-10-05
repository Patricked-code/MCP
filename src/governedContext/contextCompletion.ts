import { projectMappingCandidates } from '../github/projectResolution.js';
import type { GitRegistryProjectEvidence } from '../github/registry.js';
import type {
  MissingContext,
  MissingContextItemId,
  MissingContextStatus
} from './missingContext.js';

/**
 * E2 (TB-W3-E2-01): the context completion wizard on the existing surfaces.
 * The E1 gap of a session becomes one step for the agent: call the named tool
 * without a question, ask the operator for that gap only (with a link to the
 * existing web surface, on the configured public MCP origin), propose a
 * governed change to the versioned or server authority, reconcile, or report
 * it unobservable. Everything else is never asked. The web surfaces cannot
 * see a session (the web login carries no principal), so each one re-derives
 * the input it owns and asks only when it is genuinely missing. Pure: nothing
 * is written, authorized or fetched here.
 */
export type ContextCompletionAction =
  | 'NONE'
  | 'CALL_TOOL'
  | 'ASK_OPERATOR'
  | 'PROPOSE_GOVERNED_CHANGE'
  | 'RECONCILE'
  | 'UNAVAILABLE';
type CompletionTool = 'mcp_open_governed_session' | 'mcp_reconcile_governed_context';
type CompletionAuthority = '.mcp/identity-policy.json' | 'data/github-accounts.json';

export type ContextCompletionStep = Readonly<{
  action: ContextCompletionAction;
  item: MissingContextItemId | null;
  /** What the operator provides: a value or a choice among known candidates. */
  ask: 'INPUT' | 'CHOICE' | null;
  tool: CompletionTool | null;
  /** Absolute link to the existing web surface that requests the gap. */
  url: string | null;
  /** Versioned policy or server data completed by a governed change, never by a form. */
  authority: CompletionAuthority | null;
  reasonCodes: readonly string[];
}>;

export type ContextCompletion = Readonly<{
  status: MissingContextStatus;
  observedAt: string;
  step: ContextCompletionStep;
  /** Inputs never asked now: known context and inputs waiting for the gap. */
  doNotAsk: readonly MissingContextItemId[];
  authorizationInferred: false;
  mutationPerformed: false;
}>;

export type ContextCompletionOptions = {
  /** The configured public MCP origin (the OAuth issuer); links are omitted without it. */
  baseUrl: string | null | undefined;
  /** The session repository, carried to /git so it shows that mapping. */
  repository: string | null | undefined;
};

const TOOLS: ReadonlySet<string> = new Set(['mcp_open_governed_session', 'mcp_reconcile_governed_context']);
const AUTHORITIES: ReadonlySet<string> = new Set(['.mcp/identity-policy.json', 'data/github-accounts.json']);
const PUBLIC_ORIGIN = /^https:\/\/[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*(?::\d{1,5})?$/i;
const LOCAL_ORIGIN = /^http:\/\/(?:localhost|127\.0\.0\.1)(?::\d{1,5})?$/;
const REPOSITORY_PATTERN = /^[A-Za-z0-9][A-Za-z0-9-]{0,38}\/(?!\.{1,2}$)[A-Za-z0-9._-]{1,100}$/;
const MAX_RETURN_PATH = 512;
const MAX_CANDIDATES = 20;

function origin(baseUrl: string | null | undefined): string | null {
  const value = typeof baseUrl === 'string' ? baseUrl.trim().replace(/\/+$/, '') : '';
  return PUBLIC_ORIGIN.test(value) || LOCAL_ORIGIN.test(value) ? value : null;
}

function repositoryOf(value: unknown): string | null {
  return typeof value === 'string' && REPOSITORY_PATTERN.test(value) ? value : null;
}

function surfaceUrl(surface: '/github' | '/git', options: ContextCompletionOptions): string | null {
  const base = origin(options.baseUrl);
  if (!base) return null;
  const repository = surface === '/git' ? repositoryOf(options.repository) : null;
  return repository ? `${base}${surface}?repository=${encodeURIComponent(repository)}` : `${base}${surface}`;
}

function nextStep(missing: MissingContext, options: ContextCompletionOptions): Omit<ContextCompletionStep, 'reasonCodes'> {
  const none = { item: null, ask: null, tool: null, url: null, authority: null };
  const next = missing.next;
  if (!next) return { action: 'NONE', ...none };
  const base = { ...none, item: next.item };
  const surface = next.surface;
  switch (next.completion) {
    case 'AUTOMATIC':
      return { ...base, action: 'CALL_TOOL', tool: surface && TOOLS.has(surface) ? surface as CompletionTool : null };
    case 'OPERATOR_INPUT':
    case 'OPERATOR_CHOICE': {
      const ask = next.completion === 'OPERATOR_INPUT' ? 'INPUT' as const : 'CHOICE' as const;
      if (surface && AUTHORITIES.has(surface)) {
        return { ...base, action: 'PROPOSE_GOVERNED_CHANGE', ask, authority: surface as CompletionAuthority };
      }
      if (surface === '/github' || surface === '/git') {
        return { ...base, action: 'ASK_OPERATOR', ask, url: surfaceUrl(surface, options) };
      }
      // The repository is the operator's answer to the session tool; OAuth is
      // started by the client connector, so no page is linked for it.
      return { ...base, action: 'ASK_OPERATOR', ask, tool: surface === 'mcp_open_governed_session' ? surface : null };
    }
    case 'RECONCILIATION':
      return { ...base, action: 'RECONCILE' };
    default:
      return { ...base, action: 'UNAVAILABLE' };
  }
}

export function deriveContextCompletion(
  missing: MissingContext,
  options: ContextCompletionOptions
): ContextCompletion {
  const step = nextStep(missing, options);
  return Object.freeze({
    status: missing.status,
    observedAt: missing.observedAt,
    step: Object.freeze({ ...step, reasonCodes: Object.freeze([...(missing.next?.reasonCodes ?? [])]) }),
    doNotAsk: Object.freeze(
      missing.items.filter((entry) => entry.item !== missing.next?.item).map((entry) => entry.item)
    ),
    authorizationInferred: false as const,
    mutationPerformed: false as const
  });
}

export type RepositoryMappingCompletion = Readonly<{
  state: 'NOT_REQUESTED' | 'RESOLVED' | 'MISSING' | 'AMBIGUOUS' | 'UNOBSERVED';
  ask: boolean;
  repository: string | null;
  repositoryId: string | null;
  candidates: readonly Readonly<{ mappingId: string; projectId: string }>[];
  reasonCode: string;
}>;

/**
 * /git: the GitRegistry mapping of the repository a completion link names,
 * with the project resolution's own matching rule. A known mapping is shown,
 * never asked; an absent one is asked; several are a choice.
 */
export function deriveRepositoryMappingCompletion(
  requested: unknown,
  evidence: Pick<GitRegistryProjectEvidence, 'available' | 'mappings'>
): RepositoryMappingCompletion {
  const repository = repositoryOf(requested);
  const result = (
    state: RepositoryMappingCompletion['state'],
    reasonCode: string,
    candidates: RepositoryMappingCompletion['candidates'] = []
  ): RepositoryMappingCompletion => Object.freeze({
    state,
    ask: state === 'MISSING' || state === 'AMBIGUOUS',
    repository,
    repositoryId: repository ? `github:${repository}` : null,
    candidates: Object.freeze(candidates.map((entry) => Object.freeze({ ...entry }))),
    reasonCode
  });
  if (!repository) return result('NOT_REQUESTED', 'COMPLETION_REPOSITORY_NOT_REQUESTED');
  if (!evidence.available) return result('UNOBSERVED', 'COMPLETION_REGISTRY_UNAVAILABLE');
  const candidates = projectMappingCandidates(evidence, `github:${repository}`)
    .slice(0, MAX_CANDIDATES)
    .map((mapping) => ({ mappingId: mapping.mappingId, projectId: mapping.projectId }));
  if (candidates.length === 0) return result('MISSING', 'COMPLETION_MAPPING_MISSING');
  if (candidates.length > 1) return result('AMBIGUOUS', 'COMPLETION_MAPPING_AMBIGUOUS', candidates);
  return result('RESOLVED', 'COMPLETION_MAPPING_PRESENT', candidates);
}

/** /login: the guided return stays on a same-origin path of the MCP surfaces. */
export function safeWebReturnPath(value: unknown, fallback = '/dashboard'): string {
  if (typeof value !== 'string' || value.length > MAX_RETURN_PATH) return fallback;
  if (!value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return fallback;
  return /[\u0000-\u001f\u007f]/.test(value) ? fallback : value;
}
