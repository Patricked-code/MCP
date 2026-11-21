/**
 * WT-MCP-REGISTRY-RESOLUTION-20261121-01 / RG-036..039.
 * Bounded read-only GitHub Insights observer for ONE server-verified repository.
 *
 * The caller MUST bind the supplied scope to actual GitRegistry/ProjectReality
 * authority and to an already-permitted server-side GitHub credential.
 * This component never authenticates, expands token permissions, writes GitHub,
 * creates a project/task, or treats a security 403/404 as a disabled feature.
 */
import { createHash } from 'node:crypto';
import { githubJsonRequestWithServerCredential, type GitHubJsonRequestOptions, type GitHubJsonResponse } from '../github/connection.js';

export const GITHUB_INSIGHT_SOURCES = [
  'REPOSITORY', 'SBOM', 'DEPENDABOT_ALERTS', 'CODE_SCANNING_ALERTS',
  'SECRET_SCANNING_ALERTS', 'WORKFLOWS', 'RULESETS', 'FORKS', 'TRAFFIC'
] as const;
export type GithubInsightSource = typeof GITHUB_INSIGHT_SOURCES[number];
export type GithubInsightAccess = 'OBSERVED' | 'PARTIAL' | 'ACCESS_DENIED'
  | 'NOT_FOUND_OR_UNAVAILABLE' | 'RATE_LIMITED' | 'ERROR' | 'NOT_CHECKED';
export type GithubInsightsReadPort = (path: string) =>
  Promise<Readonly<{ status: number | null; data: unknown }>>;

export type GithubVerifiedInsightScope = Readonly<{
  /** From an already verified project/repository binding; never browser input. */
  repository: string;
  githubNumericId: number;
  projectId: string;
  mappingId: string;
  verifiedAt: string;
  evidenceRef: string;
  authority: 'GIT_REGISTRY_VERIFIED_BINDING';
}>;

export type GithubInsightObservation = Readonly<{
  source: GithubInsightSource;
  status: GithubInsightAccess;
  observedAt: string;
  endpoint: string;
  /** Number visible in the first bounded API page, NOT an exhaustive total. */
  observedItems: number | null;
  complete: boolean;
  reason: string | null;
}>;

export type GithubInsightsSnapshot = Readonly<{
  schemaVersion: 1;
  repository: string;
  githubNumericId: number;
  projectId: string;
  mappingId: string;
  authorityEvidenceRef: string;
  observedAt: string;
  status: 'PARTIAL' | 'SOURCE_VERIFIED' | 'BLOCKED';
  observations: readonly GithubInsightObservation[];
  digest: string;
  coverageClaims: false;
  executionAuthorized: false;
  mutationPerformed: false;
}>;

const MAX_AGE_MS = 5 * 60_000;
const MAX_ITEMS = 100;
const REPO = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const REF = /^[A-Za-z0-9_.:/#-]{3,240}$/;
const VALID = /^(?:[A-Za-z0-9_.-]{1,120})$/;

function validScope(scope: GithubVerifiedInsightScope, observedAt: string): void {
  const names = scope.repository?.split('/') ?? [];
  const current = Date.parse(observedAt), verified = Date.parse(scope.verifiedAt);
  if (scope.authority !== 'GIT_REGISTRY_VERIFIED_BINDING'
    || typeof scope.repository !== 'string' || !REPO.test(scope.repository)
    || names.length !== 2 || !names.every(v => VALID.test(v) && v !== '.' && v !== '..')
    || !Number.isSafeInteger(scope.githubNumericId) || scope.githubNumericId <= 0
    || typeof scope.projectId !== 'string' || !REF.test(scope.projectId)
    || typeof scope.mappingId !== 'string' || !REF.test(scope.mappingId)
    || typeof scope.evidenceRef !== 'string' || !REF.test(scope.evidenceRef)
    || !Number.isFinite(verified) || !Number.isFinite(current)
    || !observedAt.endsWith('Z') || !scope.verifiedAt.endsWith('Z')
    || current < verified || current - verified > MAX_AGE_MS) {
    throw new Error('GITHUB_INSIGHTS_VERIFIED_SCOPE_REQUIRED');
  }
}

const paths = (repo: string): Readonly<Record<GithubInsightSource, string>> => {
  const root = '/repos/' + repo;
  return {
    REPOSITORY: root,
    SBOM: root + '/dependency-graph/sbom',
    DEPENDABOT_ALERTS: root + '/dependabot/alerts?state=open&per_page=100',
    CODE_SCANNING_ALERTS: root + '/code-scanning/alerts?state=open&per_page=100',
    SECRET_SCANNING_ALERTS: root + '/secret-scanning/alerts?state=open&per_page=100',
    WORKFLOWS: root + '/actions/workflows?per_page=100',
    RULESETS: root + '/rulesets?per_page=100',
    FORKS: root + '/forks?per_page=100',
    TRAFFIC: root + '/traffic/views'
  };
};
function object(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown> : null;
}
function summary(source: GithubInsightSource, path: string, observedAt: string,
  response: { status: number | null; data: unknown }): GithubInsightObservation {
  const code = response.status;
  if (code !== 200) {
    const status: GithubInsightAccess = code === 403 || code === 401 ? 'ACCESS_DENIED'
      : code === 404 ? 'NOT_FOUND_OR_UNAVAILABLE'
      : code === 429 ? 'RATE_LIMITED' : 'ERROR';
    return Object.freeze({
      source, status, observedAt, endpoint: path, observedItems: null,
      complete: false,
      reason: code === null ? 'GITHUB_API_UNAVAILABLE' : 'GITHUB_API_HTTP_' + code
    });
  }

  const value = response.data;
  let list: unknown[] | null = null;
  if (source === 'SBOM') {
    const sbom = object(value)?.sbom;
    list = Array.isArray(object(sbom)?.packages) ? object(sbom)!.packages as unknown[] : null;
  } else if (source === 'WORKFLOWS') {
    list = Array.isArray(object(value)?.workflows) ? object(value)!.workflows as unknown[] : null;
  } else if (['DEPENDABOT_ALERTS','CODE_SCANNING_ALERTS',
    'SECRET_SCANNING_ALERTS','RULESETS','FORKS'].includes(source)) {
    list = Array.isArray(value) ? value : null;
  } else if (source === 'TRAFFIC') {
    // No visitor identifiers/locations are forwarded.
    list = Array.isArray(object(value)?.views) ? object(value)!.views as unknown[] : null;
  }
  if (source !== 'REPOSITORY' && list === null) {
    return Object.freeze({
      source, status: 'ERROR', observedAt, endpoint: path, observedItems: null,
      complete: false, reason: 'GITHUB_INSIGHTS_RESPONSE_SCHEMA_UNVERIFIED'
    });
  }
  const count = source === 'REPOSITORY' ? null : list?.length ?? null;
  // API first page alone cannot establish exhaustive coverage for a 100-row result.
  const truncated = source !== 'SBOM' && source !== 'TRAFFIC'
    && typeof count === 'number' && count >= MAX_ITEMS;
  return Object.freeze({
    source, status: truncated ? 'PARTIAL' : 'OBSERVED',
    observedAt, endpoint: path, observedItems: count,
    complete: !truncated,
    reason: truncated ? 'GITHUB_INSIGHTS_PAGINATION_REQUIRED' : null
  });
}

function digest(snapshot: Omit<GithubInsightsSnapshot, 'digest'>): string {
  return createHash('sha256').update(JSON.stringify(snapshot)).digest('hex');
}
function finish(snapshot: Omit<GithubInsightsSnapshot, 'digest'>): GithubInsightsSnapshot {
  return Object.freeze({ ...snapshot, digest: digest(snapshot) });
}

/**
 * Read only from one source repository, after independently verifying that
 * GitHub metadata confirms the expected immutable numeric ID and full name.
 * Never elevate an HTTP 403 or 404 to an assertion that a feature is disabled.
 */
export async function observeAuthorizedGithubInsights(input: Readonly<{
  scope: GithubVerifiedInsightScope;
  observedAt: string;
  read: GithubInsightsReadPort;
}>): Promise<GithubInsightsSnapshot> {
  validScope(input.scope, input.observedAt);
  const { scope, observedAt } = input;
  const routes = paths(scope.repository);
  const observations: GithubInsightObservation[] = [];
  const read = async (source: GithubInsightSource) => {
    const path = routes[source];
    let response: { status: number | null; data: unknown };
    try { response = await input.read(path); }
    catch { response = { status: null, data: null }; }
    return { response, observation: summary(source, path, observedAt, response) };
  };
  const first = await read('REPOSITORY');
  observations.push(first.observation);
  const metadata = object(first.response.data);
  const verified = first.response.status === 200
    && metadata?.id === scope.githubNumericId
    && typeof metadata.full_name === 'string'
    && metadata.full_name.toLowerCase() === scope.repository.toLowerCase();
  if (!verified) {
    return finish({
      schemaVersion: 1, repository: scope.repository, githubNumericId: scope.githubNumericId,
      projectId: scope.projectId, mappingId: scope.mappingId,
      authorityEvidenceRef: scope.evidenceRef, observedAt,
      status: 'BLOCKED', observations: Object.freeze(observations),
      coverageClaims: false, executionAuthorized: false, mutationPerformed: false
    });
  }
  // Bounded exact endpoint list, no generic discovery / breadth-first repo crawl.
  for (const source of GITHUB_INSIGHT_SOURCES.slice(1)) {
    const value = await read(source);
    observations.push(value.observation);
  }
  return finish({
    schemaVersion: 1, repository: scope.repository, githubNumericId: scope.githubNumericId,
    projectId: scope.projectId, mappingId: scope.mappingId,
    authorityEvidenceRef: scope.evidenceRef, observedAt,
    status: observations.some(o => o.status !== 'OBSERVED') ? 'PARTIAL' : 'SOURCE_VERIFIED',
    observations: Object.freeze(observations),
    coverageClaims: false, executionAuthorized: false, mutationPerformed: false
  });
}

/**
 * Optional read-only implementation of the injected port using MCP's existing
 * server credential. The caller must resolve and prove its GitRegistry/CUG
 * project binding before supplying a verified scope. This adapter cannot
 * establish that authority and must never be used on raw browser input.
 *
 * The API is deliberately a bounded nine-endpoint GET-only observer, NOT
 * a credential-permission escalator or an installation-wide crawler.
 */
export type GithubInsightsCredentialRequest = (
  endpoint: string, options: GitHubJsonRequestOptions
) => Promise<Pick<GitHubJsonResponse, 'status' | 'json'>>;

export async function observeAuthorizedGithubInsightsWithServerCredential(input: Readonly<{
  scope: GithubVerifiedInsightScope;
  observedAt: string;
  /** Test seam. Production uses the existing server-side token, never UI input. */
  request?: GithubInsightsCredentialRequest;
}>): Promise<GithubInsightsSnapshot> {
  validScope(input.scope, input.observedAt);
  const allow = new Set(Object.values(paths(input.scope.repository)));
  const request = input.request ?? githubJsonRequestWithServerCredential;
  return observeAuthorizedGithubInsights({
    scope: input.scope, observedAt: input.observedAt,
    read: async (path) => {
      if (!allow.has(path)) throw Error('GITHUB_INSIGHTS_ENDPOINT_OUT_OF_SCOPE');
      const response = await request(path, { method: 'GET', timeoutMs: 8_000 });
      return { status: response.status, data: response.json };
    }
  });
}
