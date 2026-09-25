import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { env } from '../config/env.js';
import {
  githubJsonRequestWithServerCredential,
  type GitHubJsonRequestOptions,
  type GitHubJsonResponse
} from '../github/connection.js';
import {
  aggregateRulesets,
  applyRequiredChecks,
  parseChecks,
  parseRulesetDetail,
  parseRulesetSummaries,
  type ParsedRuleset
} from '../governedContext/github.js';
import { asText } from './format.js';

const OrganizationSchema = z.string().min(1).max(120).regex(/^[A-Za-z0-9_.-]+$/);
const RepositorySchema = z.string().min(1).max(100).regex(/^[A-Za-z0-9_.-]+$/);
const RefSchema = z.string().min(1).max(240).regex(/^[A-Za-z0-9._\/-]+$/);
const PullRequestSchema = z.number().int().min(1);
const CommitReadLimitSchema = z.number().int().min(1).max(300).optional();
const TreeReadLimitSchema = z.number().int().min(1).max(1000).optional();

export type GithubControlPlaneReadDependencies = {
  configuredOrg: string;
  request(endpoint: string, options?: GitHubJsonRequestOptions): Promise<GitHubJsonResponse>;
};

function defaults(): GithubControlPlaneReadDependencies {
  return {
    configuredOrg: env.GITHUB_ORG,
    request: githubJsonRequestWithServerCredential
  };
}

function assertOrg(organization: string, configuredOrg: string): string {
  const org = organization.trim();
  if (!org || org !== configuredOrg.trim()) throw new Error('GITHUB_CONTROL_ORG_NOT_ALLOWED');
  return org;
}

function assertSafeRef(value: string): string {
  const ref = value.trim();
  if (!ref || ref.includes('..') || ref.startsWith('/') || ref.endsWith('/') || ref.includes('//')) {
    throw new Error('GITHUB_CONTROL_REF_INVALID');
  }
  return ref;
}

function endpointRepo(org: string, repo: string): string {
  return `/repos/${encodeURIComponent(org)}/${encodeURIComponent(repo)}`;
}

function object(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function array(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function string(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function number(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function boolean(value: unknown): boolean | null {
  return typeof value === 'boolean' ? value : null;
}

function actor(value: unknown): string | null {
  return string(object(value)?.login);
}

async function get(
  deps: GithubControlPlaneReadDependencies,
  endpoint: string
): Promise<unknown> {
  const response = await deps.request(endpoint);
  if (!response.ok) throw new Error(`GITHUB_CONTROL_READ_FAILED:${response.status ?? 'NETWORK'}`);
  return response.json;
}

function repositoryState(raw: unknown) {
  const r = object(raw);
  if (!r) throw new Error('GITHUB_CONTROL_RESPONSE_INVALID');
  return {
    id: number(r.id),
    name: string(r.name),
    fullName: string(r.full_name),
    private: boolean(r.private),
    archived: boolean(r.archived),
    disabled: boolean(r.disabled),
    defaultBranch: string(r.default_branch),
    visibility: string(r.visibility),
    pushedAt: string(r.pushed_at),
    updatedAt: string(r.updated_at),
    owner: actor(r.owner),
    htmlUrl: string(r.html_url)
  };
}

function branchState(raw: unknown) {
  const r = object(raw);
  const commit = object(r?.commit);
  return {
    name: string(r?.name),
    protected: boolean(r?.protected),
    commitSha: string(commit?.sha)
  };
}

function commitState(raw: unknown) {
  const r = object(raw);
  const commit = object(r?.commit);
  const author = object(commit?.author);
  const committer = object(commit?.committer);
  return {
    sha: string(r?.sha),
    htmlUrl: string(r?.html_url),
    message: string(commit?.message),
    authoredAt: string(author?.date),
    committedAt: string(committer?.date),
    author: actor(r?.author),
    committer: actor(r?.committer),
    parents: array(r?.parents).map((entry) => string(object(entry)?.sha)).filter(Boolean)
  };
}

function pullRequestState(raw: unknown) {
  const r = object(raw);
  const head = object(r?.head);
  const base = object(r?.base);
  return {
    number: number(r?.number),
    state: string(r?.state),
    draft: boolean(r?.draft),
    title: string(r?.title),
    user: actor(r?.user),
    headRef: string(head?.ref),
    headSha: string(head?.sha),
    baseRef: string(base?.ref),
    baseSha: string(base?.sha),
    mergeable: boolean(r?.mergeable),
    mergeableState: string(r?.mergeable_state),
    merged: boolean(r?.merged),
    htmlUrl: string(r?.html_url),
    updatedAt: string(r?.updated_at)
  };
}

function compareState(raw: unknown) {
  const r = object(raw);
  return {
    status: string(r?.status),
    aheadBy: number(r?.ahead_by),
    behindBy: number(r?.behind_by),
    totalCommits: number(r?.total_commits),
    mergeBaseSha: string(object(r?.merge_base_commit)?.sha),
    commits: array(r?.commits).slice(0, 100).map((entry) => ({
      sha: string(object(entry)?.sha),
      htmlUrl: string(object(entry)?.html_url)
    })),
    files: array(r?.files).slice(0, 300).map((entry) => {
      const f = object(entry);
      return {
        filename: string(f?.filename),
        status: string(f?.status),
        additions: number(f?.additions),
        deletions: number(f?.deletions),
        changes: number(f?.changes)
      };
    })
  };
}

function listProjection(raw: unknown, projector: (entry: unknown) => unknown): unknown[] {
  return array(raw).slice(0, 300).map(projector);
}

function respond(value: unknown) {
  return asText(JSON.stringify(value, null, 2));
}

export function registerGithubControlPlaneReadTools(
  server: McpServer,
  dependencies: GithubControlPlaneReadDependencies = defaults()
): void {
  const repoSchema = { organization: OrganizationSchema, repository: RepositorySchema };

  server.tool('github_get_repository_state', 'Lecture bornée de l’état d’un repository GitHub configuré.', repoSchema, async ({ organization, repository }) => {
    const org = assertOrg(organization, dependencies.configuredOrg);
    return respond(repositoryState(await get(dependencies, endpointRepo(org, repository))));
  });

  server.tool('github_get_branch_state', 'Lecture bornée de l’état d’une branche GitHub et de son SHA exact.', {
    ...repoSchema,
    branch: RefSchema
  }, async ({ organization, repository, branch }) => {
    const org = assertOrg(organization, dependencies.configuredOrg);
    const safeBranch = assertSafeRef(branch);
    return respond(branchState(await get(dependencies, `${endpointRepo(org, repository)}/branches/${encodeURIComponent(safeBranch)}`)));
  });

  server.tool('github_get_commit_state', 'Lecture bornée d’un commit GitHub.', {
    ...repoSchema,
    ref: RefSchema
  }, async ({ organization, repository, ref }) => {
    const org = assertOrg(organization, dependencies.configuredOrg);
    const safeRef = assertSafeRef(ref);
    return respond(commitState(await get(dependencies, `${endpointRepo(org, repository)}/commits/${encodeURIComponent(safeRef)}`)));
  });

  server.tool('github_compare_refs', 'Compare en lecture deux références GitHub et retourne les écarts sans patch brut.', {
    ...repoSchema,
    base: RefSchema,
    head: RefSchema
  }, async ({ organization, repository, base, head }) => {
    const org = assertOrg(organization, dependencies.configuredOrg);
    const safeBase = assertSafeRef(base);
    const safeHead = assertSafeRef(head);
    return respond(compareState(await get(dependencies, `${endpointRepo(org, repository)}/compare/${encodeURIComponent(safeBase)}...${encodeURIComponent(safeHead)}`)));
  });

  server.tool('github_get_pull_request_state', 'Lecture bornée de l’état d’une pull request GitHub.', {
    ...repoSchema,
    pullRequestNumber: PullRequestSchema
  }, async ({ organization, repository, pullRequestNumber }) => {
    const org = assertOrg(organization, dependencies.configuredOrg);
    return respond(pullRequestState(await get(dependencies, `${endpointRepo(org, repository)}/pulls/${pullRequestNumber}`)));
  });

  server.tool('github_get_pull_request_reviews', 'Retourne en lecture les reviews d’une pull request sans corps libre.', {
    ...repoSchema,
    pullRequestNumber: PullRequestSchema
  }, async ({ organization, repository, pullRequestNumber }) => {
    const org = assertOrg(organization, dependencies.configuredOrg);
    const raw = await get(dependencies, `${endpointRepo(org, repository)}/pulls/${pullRequestNumber}/reviews?per_page=100`);
    return respond(listProjection(raw, (entry) => {
      const r = object(entry);
      return {
        id: number(r?.id),
        user: actor(r?.user),
        state: string(r?.state),
        commitId: string(r?.commit_id),
        submittedAt: string(r?.submitted_at)
      };
    }));
  });

  server.tool('github_get_commit_checks', 'Retourne en lecture les check-runs bornés d’un commit.', {
    ...repoSchema,
    ref: RefSchema
  }, async ({ organization, repository, ref }) => {
    const org = assertOrg(organization, dependencies.configuredOrg);
    const safeRef = assertSafeRef(ref);
    const raw = object(await get(dependencies, `${endpointRepo(org, repository)}/commits/${encodeURIComponent(safeRef)}/check-runs?per_page=100`));
    const checks = array(raw?.check_runs).slice(0, 200).map((entry) => {
      const c = object(entry);
      return {
        id: number(c?.id),
        name: string(c?.name),
        status: string(c?.status),
        conclusion: string(c?.conclusion),
        detailsUrl: string(c?.details_url),
        startedAt: string(c?.started_at),
        completedAt: string(c?.completed_at)
      };
    });
    return respond({ totalCount: number(raw?.total_count), checks });
  });

  server.tool('github_get_commits', 'Retourne un historique de commits borné avec pagination interne explicite.', {
    ...repoSchema,
    ref: RefSchema.optional(),
    limit: CommitReadLimitSchema
  }, async ({ organization, repository, ref, limit }) => {
    const org = assertOrg(organization, dependencies.configuredOrg);
    const safeRef = ref ? assertSafeRef(ref) : null;
    const requestedLimit = limit ?? 100;
    const commits: ReturnType<typeof commitState>[] = [];
    let page = 1;
    let pagesFetched = 0;
    let truncated = false;

    while (commits.length < requestedLimit && page <= 3) {
      const params = new URLSearchParams({
        per_page: '100',
        page: String(page)
      });
      if (safeRef) params.set('sha', safeRef);
      const raw = await get(
        dependencies,
        `${endpointRepo(org, repository)}/commits?${params.toString()}`
      );
      if (!Array.isArray(raw)) throw new Error('GITHUB_CONTROL_RESPONSE_INVALID');
      pagesFetched += 1;
      const projected = raw.map(commitState);
      const remaining = requestedLimit - commits.length;
      commits.push(...projected.slice(0, remaining));

      if (projected.length > remaining) {
        truncated = true;
        break;
      }
      if (raw.length < 100) {
        truncated = false;
        break;
      }
      if (commits.length >= requestedLimit) {
        truncated = true;
        break;
      }
      page += 1;
    }

    return respond({
      ref: safeRef,
      limit: requestedLimit,
      pagesFetched,
      returnedCount: commits.length,
      truncated,
      commits
    });
  });

  server.tool('github_get_tree', 'Retourne un arbre GitHub borné sans développer le contenu des blobs.', {
    ...repoSchema,
    ref: RefSchema,
    recursive: z.boolean().optional(),
    limit: TreeReadLimitSchema
  }, async ({ organization, repository, ref, recursive, limit }) => {
    const org = assertOrg(organization, dependencies.configuredOrg);
    const safeRef = assertSafeRef(ref);
    const requestedLimit = limit ?? 300;
    const commitRaw = object(await get(
      dependencies,
      `${endpointRepo(org, repository)}/commits/${encodeURIComponent(safeRef)}`
    ));
    const commitSha = string(commitRaw?.sha);
    const commitObject = object(commitRaw?.commit);
    const treeObject = object(commitObject?.tree);
    const treeSha = string(treeObject?.sha);
    if (!commitSha || !treeSha) throw new Error('GITHUB_CONTROL_RESPONSE_INVALID');

    const isRecursive = recursive === true;
    const treeRaw = object(await get(
      dependencies,
      `${endpointRepo(org, repository)}/git/trees/${encodeURIComponent(treeSha)}${isRecursive ? '?recursive=1' : ''}`
    ));
    if (!treeRaw || !Array.isArray(treeRaw.tree)) {
      throw new Error('GITHUB_CONTROL_RESPONSE_INVALID');
    }
    const rawEntries = treeRaw.tree;
    const upstreamTruncated = treeRaw.truncated === true;
    const localTruncated = rawEntries.length > requestedLimit;
    const entries = rawEntries.slice(0, requestedLimit).map((entry) => {
      const item = object(entry);
      return {
        path: string(item?.path),
        mode: string(item?.mode),
        type: string(item?.type),
        sha: string(item?.sha),
        size: number(item?.size)
      };
    });

    return respond({
      ref: safeRef,
      commitSha,
      treeSha,
      recursive: isRecursive,
      limit: requestedLimit,
      returnedCount: entries.length,
      upstreamTruncated,
      localTruncated,
      truncated: upstreamTruncated || localTruncated,
      entries
    });
  });

  server.tool('github_get_required_checks', 'Résout les required checks actifs pour une branche et les lie à son HEAD exact.', {
    ...repoSchema,
    branch: RefSchema
  }, async ({ organization, repository, branch }) => {
    const org = assertOrg(organization, dependencies.configuredOrg);
    const safeBranch = assertSafeRef(branch);
    const repoEndpoint = endpointRepo(org, repository);

    const repositoryRaw = object(await get(dependencies, repoEndpoint));
    const defaultBranch = string(repositoryRaw?.default_branch);
    if (!defaultBranch) throw new Error('GITHUB_CONTROL_RESPONSE_INVALID');

    const branchRaw = branchState(await get(
      dependencies,
      `${repoEndpoint}/branches/${encodeURIComponent(safeBranch)}`
    ));
    const headSha = branchRaw.commitSha;
    if (!headSha) throw new Error('GITHUB_CONTROL_RESPONSE_INVALID');

    const summaries = parseRulesetSummaries(await get(
      dependencies,
      `${repoEndpoint}/rulesets?includes_parents=true&per_page=100`
    ));
    if (!summaries) throw new Error('GITHUB_CONTROL_RESPONSE_INVALID');
    const activeSummaries = summaries.filter((summary) => summary.enforcement === 'active');
    const parsedRulesets: ParsedRuleset[] = [];
    for (const summary of activeSummaries) {
      const detail = await get(dependencies, `${repoEndpoint}/rulesets/${summary.id}`);
      const parsed = parseRulesetDetail(
        detail,
        summary,
        `refs/heads/${safeBranch}`,
        `refs/heads/${defaultBranch}`
      );
      if (!parsed) throw new Error('GITHUB_CONTROL_RESPONSE_INVALID');
      parsedRulesets.push(parsed);
    }
    const ruleset = aggregateRulesets(parsedRulesets);

    const parsedChecks = parseChecks(await get(
      dependencies,
      `${repoEndpoint}/commits/${encodeURIComponent(headSha)}/check-runs?per_page=100`
    ), headSha);
    if (!parsedChecks) throw new Error('GITHUB_CONTROL_RESPONSE_INVALID');
    const checks = applyRequiredChecks(
      parsedChecks.summary,
      parsedChecks.runs,
      ruleset.requiredStatusChecks
    );

    return respond({
      branch: safeBranch,
      headSha,
      defaultBranch,
      ruleset,
      checks
    });
  });

  server.tool('github_get_workflow_runs', 'Retourne en lecture les exécutions GitHub Actions d’un repository, filtrables par SHA.', {
    ...repoSchema,
    headSha: z.string().length(40).regex(/^[0-9a-fA-F]{40}$/).optional()
  }, async ({ organization, repository, headSha }) => {
    const org = assertOrg(organization, dependencies.configuredOrg);
    const suffix = headSha ? `?per_page=100&head_sha=${headSha.toLowerCase()}` : '?per_page=100';
    const raw = object(await get(dependencies, `${endpointRepo(org, repository)}/actions/runs${suffix}`));
    const runs = array(raw?.workflow_runs).slice(0, 200).map((entry) => {
      const w = object(entry);
      return {
        id: number(w?.id),
        name: string(w?.name),
        event: string(w?.event),
        status: string(w?.status),
        conclusion: string(w?.conclusion),
        headBranch: string(w?.head_branch),
        headSha: string(w?.head_sha),
        runNumber: number(w?.run_number),
        htmlUrl: string(w?.html_url),
        createdAt: string(w?.created_at),
        updatedAt: string(w?.updated_at)
      };
    });
    return respond({ totalCount: number(raw?.total_count), runs });
  });

  server.tool('github_get_rulesets', 'Retourne en lecture les rulesets du repository sans mutation.', repoSchema, async ({ organization, repository }) => {
    const org = assertOrg(organization, dependencies.configuredOrg);
    const raw = await get(dependencies, `${endpointRepo(org, repository)}/rulesets?includes_parents=true&per_page=100`);
    return respond(listProjection(raw, (entry) => {
      const r = object(entry);
      return {
        id: number(r?.id),
        name: string(r?.name),
        target: string(r?.target),
        sourceType: string(r?.source_type),
        source: string(r?.source),
        enforcement: string(r?.enforcement),
        createdAt: string(r?.created_at),
        updatedAt: string(r?.updated_at)
      };
    }));
  });

  server.tool('github_get_webhooks', 'Retourne en lecture les webhooks du repository sans config secrète.', repoSchema, async ({ organization, repository }) => {
    const org = assertOrg(organization, dependencies.configuredOrg);
    const raw = await get(dependencies, `${endpointRepo(org, repository)}/hooks?per_page=100`);
    return respond(listProjection(raw, (entry) => {
      const h = object(entry);
      return {
        id: number(h?.id),
        type: string(h?.type),
        name: string(h?.name),
        active: boolean(h?.active),
        events: array(h?.events).filter((event) => typeof event === 'string'),
        updatedAt: string(h?.updated_at)
      };
    }));
  });

  server.tool('github_get_releases', 'Retourne en lecture les releases du repository sans assets binaires.', repoSchema, async ({ organization, repository }) => {
    const org = assertOrg(organization, dependencies.configuredOrg);
    const raw = await get(dependencies, `${endpointRepo(org, repository)}/releases?per_page=100`);
    return respond(listProjection(raw, (entry) => {
      const r = object(entry);
      return {
        id: number(r?.id),
        tagName: string(r?.tag_name),
        targetCommitish: string(r?.target_commitish),
        name: string(r?.name),
        draft: boolean(r?.draft),
        prerelease: boolean(r?.prerelease),
        publishedAt: string(r?.published_at),
        htmlUrl: string(r?.html_url)
      };
    }));
  });

  server.tool('github_get_deployments', 'Retourne en lecture les deployments du repository.', repoSchema, async ({ organization, repository }) => {
    const org = assertOrg(organization, dependencies.configuredOrg);
    const raw = await get(dependencies, `${endpointRepo(org, repository)}/deployments?per_page=100`);
    return respond(listProjection(raw, (entry) => {
      const d = object(entry);
      return {
        id: number(d?.id),
        sha: string(d?.sha),
        ref: string(d?.ref),
        environment: string(d?.environment),
        transientEnvironment: boolean(d?.transient_environment),
        productionEnvironment: boolean(d?.production_environment),
        createdAt: string(d?.created_at),
        updatedAt: string(d?.updated_at)
      };
    }));
  });
}
