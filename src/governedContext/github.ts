import { readFile } from 'node:fs/promises';

import { env } from '../config/env.js';
import { resolveGithubApiBase } from '../github/authorizationDiagnostics.js';
import type {
  GithubEvidenceFreshness,
  GithubEvidenceObservation,
  GithubOperationalContext,
  GithubOperationalUncertainty,
  GithubReasonCode
} from './types.js';

const REPOSITORY = 'Patricked-code/MCP';
const OWNER = 'Patricked-code';
const REPO = 'MCP';
const TOKEN_FILE = '/app/secrets/github_token';
const MAX_RESPONSE_BYTES = 1_000_000;
const SHA_PATTERN = /^[0-9a-f]{40}$/i;
const MAIN_REF = 'refs/heads/main';

type GithubCollectorOptions = {
  fetchImpl?: typeof fetch;
  readToken?: () => Promise<string | null>;
  apiBase?: string;
  allowedHosts?: string;
  now?: () => Date;
  timeoutMs?: number;
  cacheTtlMs?: number;
};

export type GithubOperationalContextCollector = {
  getCurrent(workBranch: string | null): Promise<GithubOperationalContext>;
  collect(workBranch: string | null): Promise<GithubOperationalContext>;
  reconcileExplicit(workBranch: string | null): Promise<GithubOperationalContext>;
};

type RequestResult = {
  ok: boolean;
  status: number | null;
  json: unknown;
  error: string | null;
};

type CacheEntry = {
  expiresAt: number;
  value: GithubOperationalContext;
};

type ParsedChecks = {
  summary: GithubOperationalContext['checks'];
  runs: Array<{ context: string; status: string; conclusion: string | null }>;
};

function evidence(
  observedAt: string,
  freshness: GithubEvidenceFreshness,
  provenance: 'github_api' | 'memory_cache' = 'github_api'
) {
  return { freshness, observedAt, provenance } as const;
}

function boundedUnique<T extends string>(values: T[], limit = 20): T[] {
  return [...new Set(values)].slice(0, limit);
}

function githubReasoning(input: {
  error: string | null;
  checks: GithubOperationalContext['checks'];
  reviews: GithubOperationalContext['reviews'];
}): {
  reasonCodes: GithubReasonCode[];
  uncertainties: GithubOperationalUncertainty[];
} {
  const reasonCodes: GithubReasonCode[] = [];
  const uncertainties: GithubOperationalUncertainty[] = [];
  const error = input.error ?? '';

  if (error.includes('github_cache_miss')) reasonCodes.push('GITHUB_CACHE_MISS');
  if (error.includes('github_surface_not_exposed')) reasonCodes.push('GITHUB_SURFACE_NOT_EXPOSED');
  if (error.includes('github_token_missing')) reasonCodes.push('GITHUB_AUTH_MISSING');
  if (error.includes('_http_401')) reasonCodes.push('GITHUB_AUTH_INVALID');
  if (error.includes('_http_403')) reasonCodes.push('GITHUB_PERMISSION_DENIED');
  if (error.includes('_http_404')) {
    reasonCodes.push('GITHUB_NOT_FOUND_OR_INVISIBLE');
    uncertainties.push('GITHUB_VISIBILITY_UNCERTAIN');
  }
  if (error.includes('github_timeout')) reasonCodes.push('GITHUB_TIMEOUT');
  if (error.includes('github_stale')) reasonCodes.push('GITHUB_STALE');

  if (input.checks.exactHead === false) {
    reasonCodes.push('GITHUB_HEAD_MISMATCH');
  }
  const requiredPending = input.checks.required.some((item) => item.status !== 'completed');
  if (requiredPending) {
    reasonCodes.push('GITHUB_REQUIRED_CHECKS_PENDING');
  }
  const requiredFailed = input.checks.required.some((item) => (
    item.status === 'completed'
    && !['success', 'neutral', 'skipped'].includes(item.conclusion ?? '')
  ));
  if (requiredFailed) {
    reasonCodes.push('GITHUB_REQUIRED_CHECKS_FAILED');
  }
  if (
    input.reviews.changesRequested > 0
    || (input.reviews.unresolvedThreads ?? 0) > 0
  ) {
    reasonCodes.push('GITHUB_REVIEW_BLOCKING');
  }

  if (error && reasonCodes.length === 0) {
    reasonCodes.push('GITHUB_WORK_STATE_UNAVAILABLE');
  }
  return {
    reasonCodes: boundedUnique(reasonCodes),
    uncertainties: boundedUnique(uncertainties)
  };
}

function emptyChecks(): GithubOperationalContext['checks'] {
  return {
    status: 'unavailable',
    conclusion: null,
    total: 0,
    failed: 0,
    headSha: null,
    exactHead: null,
    required: [],
    requiredSatisfied: null
  };
}

function emptyReviews(): GithubOperationalContext['reviews'] {
  return { approvals: 0, changesRequested: 0, unresolvedThreads: null };
}

function emptyContext(
  observedAt: string,
  workBranch: string | null,
  status: GithubOperationalContext['status'],
  error: string,
  cacheStatus: GithubOperationalContext['cache']['status'] = 'REFRESHED',
  cacheProvenance: GithubOperationalContext['cache']['provenance'] = 'github_api'
): GithubOperationalContext {
  const checks = emptyChecks();
  const reviews = emptyReviews();
  const reasoning = githubReasoning({ error, checks, reviews });
  return {
    status,
    observedAt,
    mainHead: null,
    workBranch,
    workBranchHead: null,
    pullRequest: null,
    checks,
    reviews,
    ruleset: {
      name: null,
      enforcement: null,
      requiresPullRequest: null,
      requiredStatusChecks: [],
      requiresConversationResolution: null
    },
    ownership: { pullRequestAuthor: null },
    activity: { lastActivityAt: null },
    cache: { status: cacheStatus, observedAt, provenance: cacheProvenance },
    evidence: {
      main: evidence(observedAt, 'UNAVAILABLE', cacheProvenance),
      pullRequest: evidence(observedAt, 'UNAVAILABLE', cacheProvenance),
      checks: evidence(observedAt, 'UNAVAILABLE', cacheProvenance),
      reviews: evidence(observedAt, 'UNAVAILABLE', cacheProvenance),
      ruleset: evidence(observedAt, 'UNAVAILABLE', cacheProvenance)
    },
    ...reasoning,
    error
  };
}

function withCache(
  value: GithubOperationalContext,
  status: 'HIT' | 'REFRESHED',
  observedAt: string
): GithubOperationalContext {
  return {
    ...value,
    cache: {
      status,
      observedAt,
      provenance: status === 'HIT' ? 'memory_cache' : 'github_api'
    }
  };
}

function staleEvidence(
  value: GithubEvidenceObservation,
  observedAt: string
): GithubEvidenceObservation {
  return {
    freshness: value.freshness === 'CURRENT' ? 'STALE' : value.freshness,
    observedAt,
    provenance: 'memory_cache'
  };
}

function withStaleCache(
  value: GithubOperationalContext,
  observedAt: string
): GithubOperationalContext {
  return {
    ...value,
    status: value.status === 'UNAVAILABLE' ? 'UNAVAILABLE' : 'DEGRADED',
    observedAt,
    cache: { status: 'HIT', observedAt, provenance: 'memory_cache' },
    evidence: {
      main: staleEvidence(value.evidence.main, observedAt),
      pullRequest: staleEvidence(value.evidence.pullRequest, observedAt),
      checks: staleEvidence(value.evidence.checks, observedAt),
      reviews: staleEvidence(value.evidence.reviews, observedAt),
      ruleset: staleEvidence(value.evidence.ruleset, observedAt)
    },
    reasonCodes: boundedUnique([...value.reasonCodes, 'GITHUB_STALE']),
    uncertainties: [...value.uncertainties]
  };
}

function normalizeBranch(value: string | null): string | null {
  if (value === null) return null;
  const branch = value.trim();
  return branch.length >= 1
    && branch.length <= 255
    && !branch.startsWith('/')
    && !branch.includes('..')
    && /^[A-Za-z0-9._/-]+$/.test(branch)
    ? branch
    : null;
}

function sha(value: unknown): string | null {
  return typeof value === 'string' && SHA_PATTERN.test(value)
    ? value.toLowerCase()
    : null;
}

function object(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function string(value: unknown, max = 255): string | null {
  return typeof value === 'string' && value.length >= 1 && value.length <= max
    ? value
    : null;
}

function timestamp(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > 64) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null;
}

function parsePullRequest(value: unknown): GithubOperationalContext['pullRequest'] {
  const pull = object(value);
  const base = object(pull?.base);
  const head = object(pull?.head);
  const user = object(pull?.user);
  const number = pull?.number;
  const state = pull?.state;
  const baseRef = string(base?.ref);
  const headRef = string(head?.ref);
  const headSha = sha(head?.sha);
  const updatedAt = timestamp(pull?.updated_at);
  if (
    typeof number !== 'number'
    || !Number.isInteger(number)
    || number < 1
    || number > 2_147_483_647
    || (state !== 'open' && state !== 'closed')
    || !baseRef
    || !headRef
    || !headSha
    || !updatedAt
  ) return null;
  return {
    number,
    state,
    draft: pull?.draft === true,
    merged: pull?.merged === true || typeof pull?.merged_at === 'string',
    base: baseRef,
    head: headRef,
    headSha,
    author: string(user?.login, 100),
    updatedAt
  };
}

function parseChecks(value: unknown, expectedHeadSha: string): ParsedChecks | null {
  const root = object(value);
  if (!root || !Array.isArray(root.check_runs)) return null;
  const rawRuns = root.check_runs.slice(0, 100);
  const runs = rawRuns.map(object).filter(Boolean);
  if (runs.length !== Math.min(root.check_runs.length, 100)) return null;
  const totalCandidate = root.total_count;
  const total = typeof totalCandidate === 'number' && Number.isInteger(totalCandidate)
    ? Math.max(0, Math.min(totalCandidate, 100))
    : runs.length;
  const failed = runs.filter((run) => {
    const conclusion = run?.conclusion;
    return typeof conclusion === 'string'
      && !['success', 'neutral', 'skipped'].includes(conclusion);
  }).length;
  const statuses = runs.map((run) => run?.status);
  const status = statuses.includes('in_progress')
    ? 'in_progress'
    : statuses.includes('queued')
      ? 'queued'
      : 'completed';
  const runHeadShas = runs.map((run) => sha(run?.head_sha));
  const allRunsHaveHeadSha = runs.length > 0 && runHeadShas.every((value) => value !== null);
  const uniqueRunHeadShas = boundedUnique(
    runHeadShas.filter((value): value is string => value !== null)
  );
  const headSha = allRunsHaveHeadSha && uniqueRunHeadShas.length === 1
    ? uniqueRunHeadShas[0]!
    : null;
  const exactHead = runs.length === 0
    ? null
    : allRunsHaveHeadSha
      ? uniqueRunHeadShas.length === 1 && headSha === expectedHeadSha
      : null;
  const runSummaries = runs.flatMap((run) => {
    const context = string(run?.name, 100);
    const runStatus = string(run?.status, 40);
    if (!context || !runStatus) return [];
    return [{
      context,
      status: runStatus,
      conclusion: string(run?.conclusion, 40)
    }];
  });
  return {
    summary: {
      status,
      conclusion: failed > 0
        ? 'failure'
        : status === 'completed' && total > 0 ? 'success' : null,
      total,
      failed,
      headSha,
      exactHead,
      required: [],
      requiredSatisfied: null
    },
    runs: runSummaries
  };
}

function applyRequiredChecks(
  checks: GithubOperationalContext['checks'],
  runs: ParsedChecks['runs'],
  requiredContexts: string[]
): GithubOperationalContext['checks'] {
  const required = requiredContexts.map((context) => {
    const run = runs.find((candidate) => candidate.context === context);
    return run ?? { context, status: 'missing', conclusion: null };
  });
  const requiredSatisfied = requiredContexts.length === 0
    ? true
    : required.every((item) => item.status === 'completed'
      && ['success', 'neutral', 'skipped'].includes(item.conclusion ?? ''));
  return { ...checks, required, requiredSatisfied };
}

function parseReviews(value: unknown): Pick<
GithubOperationalContext['reviews'], 'approvals' | 'changesRequested'
> | null {
  if (!Array.isArray(value)) return null;
  const reviews = value.slice(0, 100).map(object).filter(Boolean);
  if (reviews.length !== Math.min(value.length, 100)) return null;
  const latestByReviewer = new Map<string, {
    state: unknown;
    submittedAt: number;
    index: number;
  }>();
  reviews.forEach((review, index) => {
    const state = review?.state;
    if (!['APPROVED', 'CHANGES_REQUESTED', 'DISMISSED'].includes(String(state))) return;
    const user = object(review?.user);
    const userId = user?.id;
    const login = string(user?.login, 100)?.toLowerCase();
    const reviewId = review?.id;
    const reviewerKey = typeof userId === 'number' && Number.isSafeInteger(userId) && userId > 0
      ? `id:${userId}`
      : login
        ? `login:${login}`
        : typeof reviewId === 'number' && Number.isSafeInteger(reviewId) && reviewId > 0
          ? `review:${reviewId}`
          : `bounded-index:${index}`;
    const submittedAt = timestamp(review?.submitted_at);
    const submittedAtMs = submittedAt ? Date.parse(submittedAt) : Number.NEGATIVE_INFINITY;
    const current = latestByReviewer.get(reviewerKey);
    if (
      !current
      || submittedAtMs > current.submittedAt
      || (submittedAtMs === current.submittedAt && index > current.index)
    ) {
      latestByReviewer.set(reviewerKey, { state, submittedAt: submittedAtMs, index });
    }
  });
  const currentReviews = [...latestByReviewer.values()];
  return {
    approvals: currentReviews.filter((review) => review.state === 'APPROVED').length,
    changesRequested: currentReviews.filter(
      (review) => review.state === 'CHANGES_REQUESTED'
    ).length
  };
}

function parseUnresolvedThreads(value: unknown): number | null {
  const root = object(value);
  const data = object(root?.data);
  const repository = object(data?.repository);
  const pullRequest = object(repository?.pullRequest);
  const reviewThreads = object(pullRequest?.reviewThreads);
  if (!Array.isArray(reviewThreads?.nodes)) return null;
  const nodes = reviewThreads.nodes.slice(0, 50).map(object).filter(Boolean);
  if (nodes.length !== Math.min(reviewThreads.nodes.length, 50)) return null;
  return nodes.filter((thread) => thread?.isResolved === false).length;
}

type RulesetSummary = {
  id: number;
  name: string | null;
  enforcement: string | null;
};

type ParsedRuleset = {
  ruleset: GithubOperationalContext['ruleset'];
  appliesToMain: boolean;
};

function parseRulesetSummaries(value: unknown): RulesetSummary[] | null {
  if (!Array.isArray(value)) return null;
  const values = value.slice(0, 20).map(object).filter(Boolean);
  if (values.length !== Math.min(value.length, 20)) return null;
  const summaries = values.map((candidate) => {
    const id = candidate?.id;
    if (
      typeof id !== 'number'
      || !Number.isInteger(id)
      || id < 1
      || id > Number.MAX_SAFE_INTEGER
    ) return null;
    return {
      id,
      name: string(candidate?.name, 120),
      enforcement: string(candidate?.enforcement, 40)
    };
  });
  return summaries.every((summary) => summary !== null)
    ? summaries as RulesetSummary[]
    : null;
}

function globToRegExp(pattern: string): RegExp | null {
  if (pattern.length < 1 || pattern.length > 255) return null;
  let source = '^';
  for (let index = 0; index < pattern.length; index += 1) {
    const current = pattern[index]!;
    const next = pattern[index + 1];
    if (current === '*' && next === '*') {
      source += '.*';
      index += 1;
    } else if (current === '*') {
      source += '[^/]*';
    } else if (current === '?') {
      source += '[^/]';
    } else {
      source += current.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
  }
  source += '$';
  try {
    return new RegExp(source);
  } catch {
    return null;
  }
}

function refPatternMatches(pattern: string, ref: string): boolean | null {
  if (pattern === '~ALL') return true;
  if (pattern === '~DEFAULT_BRANCH') return ref === MAIN_REF;
  const regexp = globToRegExp(pattern);
  return regexp ? regexp.test(ref) : null;
}

function parseRefPatterns(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const patterns = value.slice(0, 50).map((entry) => string(entry, 255));
  return patterns.every((entry) => entry !== null) ? patterns as string[] : null;
}

function rulesetAppliesToMain(value: unknown): boolean | null {
  const ruleset = object(value);
  if (!ruleset) return null;
  const conditions = object(ruleset.conditions);
  if (!conditions || !Object.prototype.hasOwnProperty.call(conditions, 'ref_name')) return true;
  const refName = object(conditions.ref_name);
  if (!refName) return null;
  const includes = parseRefPatterns(refName.include);
  const excludes = parseRefPatterns(refName.exclude);
  if (!includes || !excludes) return null;
  for (const pattern of excludes) {
    const matches = refPatternMatches(pattern, MAIN_REF);
    if (matches === null) return null;
    if (matches) return false;
  }
  if (includes.length === 0) return true;
  let matched = false;
  for (const pattern of includes) {
    const matches = refPatternMatches(pattern, MAIN_REF);
    if (matches === null) return null;
    if (matches) matched = true;
  }
  return matched;
}

function parseRulesetDetail(
  value: unknown,
  summary: RulesetSummary
): ParsedRuleset | null {
  const ruleset = object(value);
  if (!ruleset || !Array.isArray(ruleset.rules)) return null;
  const rules = ruleset.rules.slice(0, 100).map(object).filter(Boolean);
  if (rules.length !== Math.min(ruleset.rules.length, 100)) return null;
  const requiredStatusChecks = boundedUnique(rules.flatMap((rule) => {
    if (rule?.type !== 'required_status_checks') return [];
    const parameters = object(rule.parameters);
    const rawChecks = Array.isArray(parameters?.required_status_checks)
      ? parameters.required_status_checks.slice(0, 50)
      : [];
    return rawChecks
      .map((entry) => string(object(entry)?.context, 100))
      .filter((entry): entry is string => entry !== null);
  }), 50);
  const pullRequestRules = rules.filter((rule) => rule?.type === 'pull_request');
  const approvalCounts = pullRequestRules.flatMap((rule) => {
    const candidate = object(rule?.parameters)?.required_approving_review_count;
    return typeof candidate === 'number'
      && Number.isInteger(candidate)
      && candidate >= 0
      && candidate <= 100
      ? [candidate]
      : [];
  });
  const requiredApprovingReviewCount = approvalCounts.length > 0
    ? Math.max(...approvalCounts)
    : null;
  const appliesToMain = rulesetAppliesToMain(value);
  if (appliesToMain === null) return null;
  return {
    appliesToMain,
    ruleset: {
      name: string(ruleset.name, 120) ?? summary.name,
      enforcement: string(ruleset.enforcement, 40) ?? summary.enforcement,
      requiresPullRequest: pullRequestRules.length > 0,
      requiredStatusChecks,
      requiresConversationResolution: rules.some(
        (rule) => rule?.type === 'required_conversation_resolution'
      ) || pullRequestRules.some(
        (rule) => object(rule?.parameters)?.required_review_thread_resolution === true
      ),
      ...(requiredApprovingReviewCount !== null ? { requiredApprovingReviewCount } : {})
    }
  };
}

function aggregateRulesets(
  values: ParsedRuleset[]
): GithubOperationalContext['ruleset'] {
  const applicable = values.filter((value) => value.appliesToMain);
  if (applicable.length === 0) {
    return {
      name: null,
      enforcement: 'active',
      requiresPullRequest: false,
      requiredStatusChecks: [],
      requiresConversationResolution: false
    };
  }
  const names = boundedUnique(
    applicable.flatMap((value) => value.ruleset.name ? [value.ruleset.name] : []),
    20
  );
  const approvalCounts = applicable.flatMap((value) => (
    typeof value.ruleset.requiredApprovingReviewCount === 'number'
      ? [value.ruleset.requiredApprovingReviewCount]
      : []
  ));
  const requiredApprovingReviewCount = approvalCounts.length > 0
    ? Math.max(...approvalCounts)
    : null;
  return {
    name: names.length > 0 ? names.join(',').slice(0, 120) : null,
    enforcement: 'active',
    requiresPullRequest: applicable.some((value) => value.ruleset.requiresPullRequest === true),
    requiredStatusChecks: boundedUnique(
      applicable.flatMap((value) => value.ruleset.requiredStatusChecks),
      50
    ),
    requiresConversationResolution: applicable.some(
      (value) => value.ruleset.requiresConversationResolution === true
    ),
    ...(requiredApprovingReviewCount !== null ? { requiredApprovingReviewCount } : {})
  };
}

async function defaultReadToken(): Promise<string | null> {
  try {
    return (await readFile(env.GITHUB_TOKEN_FILE || TOKEN_FILE, 'utf8')).trim() || null;
  } catch {
    return null;
  }
}

function errorSummary(errors: string[]): string | null {
  const unique = [...new Set(errors)];
  return unique.length > 0 ? unique.join('|').slice(0, 240) : null;
}

export function createGithubOperationalContextCollector(
  options: GithubCollectorOptions = {}
): GithubOperationalContextCollector {
  const fetchImpl = options.fetchImpl ?? fetch;
  const readToken = options.readToken ?? defaultReadToken;
  const now = options.now ?? (() => new Date());
  const timeoutMs = Math.max(1, Math.min(options.timeoutMs ?? env.GITHUB_REQUEST_TIMEOUT_MS, 15_000));
  const cacheTtlMs = Math.max(1, Math.min(options.cacheTtlMs ?? 15_000, 15_000));
  const cache = new Map<string, CacheEntry>();
  const inFlight = new Map<string, Promise<GithubOperationalContext>>();

  async function collectWork(workBranch: string | null): Promise<GithubOperationalContext> {
    const observedAt = now().toISOString();
    const normalizedBranch = normalizeBranch(workBranch);
    if (workBranch !== null && !normalizedBranch) {
      return emptyContext(observedAt, null, 'DEGRADED', 'github_work_branch_invalid');
    }

    let apiBase: string;
    try {
      apiBase = resolveGithubApiBase(
        options.apiBase ?? env.GITHUB_API_BASE,
        options.allowedHosts ?? env.GITHUB_API_ALLOWED_HOSTS
      );
    } catch {
      return emptyContext(observedAt, normalizedBranch, 'UNAVAILABLE', 'github_api_base_not_allowed');
    }
    const token = await readToken().catch(() => null);
    if (!token) {
      return emptyContext(observedAt, normalizedBranch, 'UNAVAILABLE', 'github_token_missing');
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const errors: string[] = [];
    const headers = {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'wealthtech-mcp-governed-context'
    };

    async function request(
      endpoint: string,
      label: string,
      init: RequestInit = {}
    ): Promise<RequestResult> {
      if (controller.signal.aborted) {
        return { ok: false, status: null, json: null, error: 'github_timeout' };
      }
      try {
        const response = await fetchImpl(`${apiBase}${endpoint}`, {
          ...init,
          redirect: 'error',
          signal: controller.signal,
          headers: { ...headers, ...init.headers }
        });
        const declaredLength = Number(response.headers.get('content-length') ?? '0');
        if (declaredLength > MAX_RESPONSE_BYTES) {
          return { ok: false, status: response.status, json: null, error: `github_${label}_body_too_large` };
        }
        const text = await response.text();
        if (text.length > MAX_RESPONSE_BYTES) {
          return { ok: false, status: response.status, json: null, error: `github_${label}_body_too_large` };
        }
        let json: unknown = null;
        try {
          json = text ? JSON.parse(text) : null;
        } catch {
          return { ok: false, status: response.status, json: null, error: `github_${label}_malformed` };
        }
        return response.ok
          ? { ok: true, status: response.status, json, error: null }
          : {
              ok: false,
              status: response.status,
              json: null,
              error: `github_${label}_http_${response.status}`
            };
      } catch {
        return controller.signal.aborted
          ? { ok: false, status: null, json: null, error: 'github_timeout' }
          : { ok: false, status: null, json: null, error: `github_${label}_unavailable` };
      }
    }

    try {
      const commitResult = await request(`/repos/${REPOSITORY}/commits/main`, 'main');
      if (commitResult.error === 'github_timeout') {
        return emptyContext(observedAt, normalizedBranch, 'UNAVAILABLE', 'github_timeout');
      }
      const mainHead = commitResult.ok ? sha(object(commitResult.json)?.sha) : null;
      if (!commitResult.ok) errors.push(commitResult.error ?? 'github_main_unavailable');
      else if (!mainHead) errors.push('github_main_malformed');

      let pullRequest: GithubOperationalContext['pullRequest'] = null;
      let pullRequestFreshness: GithubEvidenceFreshness = normalizedBranch ? 'UNAVAILABLE' : 'NOT_APPLICABLE';
      if (normalizedBranch) {
        const params = new URLSearchParams({
          state: 'all',
          head: `${OWNER}:${normalizedBranch}`,
          base: 'main',
          per_page: '10'
        });
        const pullsResult = await request(`/repos/${REPOSITORY}/pulls?${params}`, 'pulls');
        if (!pullsResult.ok) errors.push(pullsResult.error ?? 'github_pulls_unavailable');
        else if (!Array.isArray(pullsResult.json)) errors.push('github_pulls_malformed');
        else {
          pullRequestFreshness = 'CURRENT';
          if (pullsResult.json.length > 0) {
            pullRequest = pullsResult.json.slice(0, 10)
              .map(parsePullRequest)
              .find((candidate) => candidate?.head === normalizedBranch) ?? null;
            if (!pullRequest) {
              errors.push('github_pulls_malformed');
              pullRequestFreshness = 'UNAVAILABLE';
            }
          }
        }
      }

      let workBranchHead = pullRequest?.headSha ?? null;
      if (normalizedBranch && !pullRequest) {
        const branchResult = await request(
          `/repos/${REPOSITORY}/commits/${encodeURIComponent(normalizedBranch)}`,
          'work_branch'
        );
        if (!branchResult.ok) {
          errors.push(branchResult.error ?? 'github_work_branch_unavailable');
        } else {
          workBranchHead = sha(object(branchResult.json)?.sha);
          if (!workBranchHead) errors.push('github_work_branch_malformed');
        }
      }

      const rulesPromise = request(`/repos/${REPOSITORY}/rulesets?per_page=20`, 'rulesets');
      const checksPromise = pullRequest
        ? request(`/repos/${REPOSITORY}/commits/${pullRequest.headSha}/check-runs?per_page=100`, 'checks')
        : Promise.resolve<RequestResult>({ ok: true, status: 200, json: null, error: null });
      const reviewsPromise = pullRequest
        ? request(`/repos/${REPOSITORY}/pulls/${pullRequest.number}/reviews?per_page=100`, 'reviews')
        : Promise.resolve<RequestResult>({ ok: true, status: 200, json: null, error: null });
      const threadsPromise = pullRequest
        ? request('/graphql', 'threads', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              query: 'query($owner:String!,$repo:String!,$number:Int!){repository(owner:$owner,name:$repo){pullRequest(number:$number){reviewThreads(first:50){nodes{isResolved}}}}}',
              variables: { owner: OWNER, repo: REPO, number: pullRequest.number }
            })
          })
        : Promise.resolve<RequestResult>({ ok: true, status: 200, json: null, error: null });
      const [rulesResult, checksResult, reviewsResult, threadsResult] = await Promise.all([
        rulesPromise,
        checksPromise,
        reviewsPromise,
        threadsPromise
      ]);
      if (controller.signal.aborted) {
        return emptyContext(observedAt, normalizedBranch, 'UNAVAILABLE', 'github_timeout');
      }

      let ruleset: GithubOperationalContext['ruleset'] | null = null;
      let rulesFreshness: GithubEvidenceFreshness = 'UNAVAILABLE';
      if (!rulesResult.ok) {
        errors.push(rulesResult.error ?? 'github_rulesets_unavailable');
      } else {
        const summaries = parseRulesetSummaries(rulesResult.json);
        if (!summaries) {
          errors.push('github_rulesets_malformed');
        } else {
          const activeSummaries = summaries.filter((candidate) => candidate.enforcement === 'active');
          if (activeSummaries.length === 0) {
            rulesFreshness = 'CURRENT';
            ruleset = {
              name: null,
              enforcement: null,
              requiresPullRequest: false,
              requiredStatusChecks: [],
              requiresConversationResolution: false
            };
          } else {
            const detailResults = await Promise.all(activeSummaries.map(async (summary) => ({
              summary,
              result: await request(
                `/repos/${REPOSITORY}/rulesets/${summary.id}`,
                `ruleset_detail_${summary.id}`
              )
            })));
            const parsedRulesets: ParsedRuleset[] = [];
            let rulesetsComplete = true;
            for (const { summary, result } of detailResults) {
              const parsed = result.ok ? parseRulesetDetail(result.json, summary) : null;
              if (!parsed) {
                rulesetsComplete = false;
                errors.push(result.error ?? `github_ruleset_detail_${summary.id}_malformed`);
              } else {
                parsedRulesets.push(parsed);
              }
            }
            if (rulesetsComplete) {
              ruleset = aggregateRulesets(parsedRulesets);
              rulesFreshness = 'CURRENT';
            }
          }
        }
      }
      if (controller.signal.aborted) {
        return emptyContext(observedAt, normalizedBranch, 'UNAVAILABLE', 'github_timeout');
      }

      let checks: GithubOperationalContext['checks'] = emptyChecks();
      let checksFreshness: GithubEvidenceFreshness = pullRequest ? 'UNAVAILABLE' : 'NOT_APPLICABLE';
      let reviews: GithubOperationalContext['reviews'] = emptyReviews();
      let reviewsFreshness: GithubEvidenceFreshness = pullRequest ? 'UNAVAILABLE' : 'NOT_APPLICABLE';
      if (pullRequest) {
        const parsedChecks = checksResult.ok ? parseChecks(checksResult.json, pullRequest.headSha) : null;
        if (parsedChecks) {
          checks = applyRequiredChecks(
            parsedChecks.summary,
            parsedChecks.runs,
            ruleset?.requiredStatusChecks ?? []
          );
          checksFreshness = 'CURRENT';
        } else errors.push(checksResult.error ?? 'github_checks_malformed');
        const parsedReviews = reviewsResult.ok ? parseReviews(reviewsResult.json) : null;
        if (parsedReviews) reviews = { ...reviews, ...parsedReviews };
        else errors.push(reviewsResult.error ?? 'github_reviews_malformed');
        const unresolvedThreads = threadsResult.ok
          ? parseUnresolvedThreads(threadsResult.json)
          : null;
        if (parsedReviews && unresolvedThreads !== null) {
          reviews.unresolvedThreads = unresolvedThreads;
          reviewsFreshness = 'CURRENT';
        } else if (unresolvedThreads === null) {
          errors.push(threadsResult.error ?? 'github_threads_malformed');
        }
      }

      const error = errorSummary(errors);
      const reasoning = githubReasoning({ error, checks, reviews });
      const approvalBlocked = reviewsFreshness === 'CURRENT'
        && typeof ruleset?.requiredApprovingReviewCount === 'number'
        && reviews.approvals < ruleset.requiredApprovingReviewCount;
      const reasonCodes = approvalBlocked
        ? boundedUnique([...reasoning.reasonCodes, 'GITHUB_REVIEW_BLOCKING'])
        : reasoning.reasonCodes;
      return {
        status: error ? 'DEGRADED' : 'CURRENT',
        observedAt,
        mainHead,
        workBranch: normalizedBranch,
        workBranchHead,
        pullRequest,
        checks,
        reviews,
        ruleset: ruleset ?? emptyContext(observedAt, normalizedBranch, 'DEGRADED', 'x').ruleset,
        ownership: { pullRequestAuthor: pullRequest?.author ?? null },
        activity: { lastActivityAt: pullRequest?.updatedAt ?? null },
        cache: { status: 'REFRESHED', observedAt, provenance: 'github_api' },
        evidence: {
          main: evidence(observedAt, mainHead ? 'CURRENT' : 'UNAVAILABLE'),
          pullRequest: evidence(observedAt, pullRequestFreshness),
          checks: evidence(observedAt, checksFreshness),
          reviews: evidence(observedAt, reviewsFreshness),
          ruleset: evidence(observedAt, rulesFreshness)
        },
        ...reasoning,
        reasonCodes,
        error
      };
    } finally {
      clearTimeout(timer);
    }
  }

  async function run(workBranch: string | null, force: boolean): Promise<GithubOperationalContext> {
    const key = workBranch ?? '(none)';
    const at = now().getTime();
    const current = inFlight.get(key);
    if (current) return current;
    if (!force) {
      const cached = cache.get(key);
      if (cached && cached.expiresAt > at) {
        return withCache(cached.value, 'HIT', now().toISOString());
      }
    }
    const work = collectWork(workBranch).then((value) => {
      const refreshed = withCache(value, 'REFRESHED', value.observedAt);
      cache.set(key, { expiresAt: now().getTime() + cacheTtlMs, value: refreshed });
      return refreshed;
    }).finally(() => {
      if (inFlight.get(key) === work) inFlight.delete(key);
    });
    inFlight.set(key, work);
    return work;
  }

  return {
    getCurrent: async (workBranch) => {
      const key = workBranch ?? '(none)';
      const cached = cache.get(key);
      const observedAt = now().toISOString();
      if (cached) {
        return cached.expiresAt > now().getTime()
          ? withCache(cached.value, 'HIT', observedAt)
          : withStaleCache(cached.value, observedAt);
      }
      const normalizedBranch = normalizeBranch(workBranch);
      return workBranch !== null && !normalizedBranch
        ? emptyContext(observedAt, null, 'DEGRADED', 'github_work_branch_invalid', 'MISS', 'memory_cache')
        : emptyContext(observedAt, normalizedBranch, 'UNAVAILABLE', 'github_cache_miss', 'MISS', 'memory_cache');
    },
    collect: (workBranch) => run(workBranch, false),
    reconcileExplicit: (workBranch) => run(workBranch, true)
  };
}
