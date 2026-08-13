import { readFile } from 'node:fs/promises';

import { env } from '../config/env.js';
import { resolveGithubApiBase } from '../github/authorizationDiagnostics.js';
import type { GithubOperationalContext } from './types.js';

const REPOSITORY = 'Patricked-code/MCP';
const OWNER = 'Patricked-code';
const REPO = 'MCP';
const TOKEN_FILE = '/app/secrets/github_token';
const MAX_RESPONSE_BYTES = 1_000_000;
const SHA_PATTERN = /^[0-9a-f]{40}$/i;

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

function emptyContext(
  observedAt: string,
  workBranch: string | null,
  status: GithubOperationalContext['status'],
  error: string
): GithubOperationalContext {
  return {
    status,
    observedAt,
    mainHead: null,
    workBranch,
    pullRequest: null,
    checks: { status: 'unavailable', conclusion: null, total: 0, failed: 0 },
    reviews: { approvals: 0, changesRequested: 0, unresolvedThreads: null },
    ruleset: {
      name: null,
      enforcement: null,
      requiresPullRequest: null,
      requiredStatusChecks: [],
      requiresConversationResolution: null
    },
    error
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
    updatedAt
  };
}

function parseChecks(value: unknown): GithubOperationalContext['checks'] | null {
  const root = object(value);
  if (!root || !Array.isArray(root.check_runs)) return null;
  const runs = root.check_runs.slice(0, 100).map(object).filter(Boolean);
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
  return {
    status,
    conclusion: failed > 0
      ? 'failure'
      : status === 'completed' && total > 0 ? 'success' : null,
    total,
    failed
  };
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
    if (review?.state === 'DISMISSED') return;
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
      latestByReviewer.set(reviewerKey, {
        state: review?.state,
        submittedAt: submittedAtMs,
        index
      });
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

function parseRulesetDetail(
  value: unknown,
  summary: RulesetSummary
): GithubOperationalContext['ruleset'] | null {
  const ruleset = object(value);
  if (!ruleset || !Array.isArray(ruleset.rules)) return null;
  const rules = ruleset.rules.slice(0, 100).map(object).filter(Boolean);
  if (rules.length !== Math.min(ruleset.rules.length, 100)) return null;
  const statusRule = rules?.find((rule) => rule?.type === 'required_status_checks');
  const parameters = object(statusRule?.parameters);
  const rawChecks = Array.isArray(parameters?.required_status_checks)
    ? parameters.required_status_checks.slice(0, 50)
    : [];
  const requiredStatusChecks = rawChecks
    .map((entry) => string(object(entry)?.context, 100))
    .filter((entry): entry is string => entry !== null);
  return {
    name: string(ruleset.name, 120) ?? summary.name,
    enforcement: string(ruleset.enforcement, 40) ?? summary.enforcement,
    requiresPullRequest: rules.some((rule) => rule?.type === 'pull_request'),
    requiredStatusChecks,
    requiresConversationResolution: rules.some(
      (rule) => rule?.type === 'required_conversation_resolution'
    )
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
        else if (pullsResult.json.length > 0) {
          pullRequest = pullsResult.json.slice(0, 10)
            .map(parsePullRequest)
            .find((candidate) => candidate?.head === normalizedBranch) ?? null;
          if (!pullRequest) errors.push('github_pulls_malformed');
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
      if (!rulesResult.ok) {
        errors.push(rulesResult.error ?? 'github_rulesets_unavailable');
      } else {
        const summaries = parseRulesetSummaries(rulesResult.json);
        if (!summaries) {
          errors.push('github_rulesets_malformed');
        } else if (summaries.length === 0) {
          ruleset = {
            name: null,
            enforcement: null,
            requiresPullRequest: false,
            requiredStatusChecks: [],
            requiresConversationResolution: false
          };
        } else {
          const selected = summaries.find((candidate) => candidate.enforcement === 'active')
            ?? summaries[0]!;
          const detailResult = await request(
            `/repos/${REPOSITORY}/rulesets/${selected.id}`,
            'ruleset_detail'
          );
          if (detailResult.ok) {
            ruleset = parseRulesetDetail(detailResult.json, selected);
          }
          if (!ruleset) {
            errors.push(detailResult.error ?? 'github_ruleset_detail_malformed');
            ruleset = {
              name: selected.name,
              enforcement: selected.enforcement,
              requiresPullRequest: null,
              requiredStatusChecks: [],
              requiresConversationResolution: null
            };
          }
        }
      }
      if (controller.signal.aborted) {
        return emptyContext(observedAt, normalizedBranch, 'UNAVAILABLE', 'github_timeout');
      }

      let checks: GithubOperationalContext['checks'] = {
        status: 'unavailable', conclusion: null, total: 0, failed: 0
      };
      let reviews: GithubOperationalContext['reviews'] = {
        approvals: 0, changesRequested: 0, unresolvedThreads: null
      };
      if (pullRequest) {
        const parsedChecks = checksResult.ok ? parseChecks(checksResult.json) : null;
        if (parsedChecks) checks = parsedChecks;
        else errors.push(checksResult.error ?? 'github_checks_malformed');
        const parsedReviews = reviewsResult.ok ? parseReviews(reviewsResult.json) : null;
        if (parsedReviews) reviews = { ...reviews, ...parsedReviews };
        else errors.push(reviewsResult.error ?? 'github_reviews_malformed');
        const unresolvedThreads = threadsResult.ok
          ? parseUnresolvedThreads(threadsResult.json)
          : null;
        if (unresolvedThreads !== null) reviews.unresolvedThreads = unresolvedThreads;
        else errors.push(threadsResult.error ?? 'github_threads_malformed');
      }

      const error = errorSummary(errors);
      return {
        status: error ? 'DEGRADED' : 'CURRENT',
        observedAt,
        mainHead,
        workBranch: normalizedBranch,
        pullRequest,
        checks,
        reviews,
        ruleset: ruleset ?? emptyContext(observedAt, normalizedBranch, 'DEGRADED', 'x').ruleset,
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
      if (cached && cached.expiresAt > at) return cached.value;
    }
    const work = collectWork(workBranch).then((value) => {
      cache.set(key, { expiresAt: now().getTime() + cacheTtlMs, value });
      return value;
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
      if (cached && cached.expiresAt > now().getTime()) return cached.value;
      const normalizedBranch = normalizeBranch(workBranch);
      return workBranch !== null && !normalizedBranch
        ? emptyContext(now().toISOString(), null, 'DEGRADED', 'github_work_branch_invalid')
        : emptyContext(now().toISOString(), normalizedBranch, 'UNAVAILABLE', 'github_cache_miss');
    },
    collect: (workBranch) => run(workBranch, false),
    reconcileExplicit: (workBranch) => run(workBranch, true)
  };
}
