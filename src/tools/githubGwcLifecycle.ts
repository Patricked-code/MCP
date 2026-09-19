import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { env } from '../config/env.js';
import {
  githubJsonRequestWithServerCredential,
  type GitHubJsonRequestOptions,
  type GitHubJsonResponse
} from '../github/connection.js';
import {
  getDefaultScopedWriteGateDependencies,
  type ScopedWriteGateDependencies,
  type ShadowWriteDecision
} from '../governance/scopedWriteGate.js';
import { assertScopedWriteToolsEnabled } from '../ssh/writeSafety.js';
import { asText } from './format.js';

const OrganizationSchema = z.string().min(1).max(120).regex(/^[A-Za-z0-9_.-]+$/);
const RepositorySchema = z.string().min(1).max(100).regex(/^[A-Za-z0-9_.-]+$/);
const RefSchema = z.string().min(1).max(240).regex(/^[A-Za-z0-9._\/-]+$/);
const ShaSchema = z.string().length(40).regex(/^[0-9a-fA-F]{40}$/);
const PullRequestSchema = z.number().int().min(1);
const MessageSchema = z.string().min(1).max(5000);
const TitleSchema = z.string().min(1).max(256);
const BodySchema = z.string().max(50_000);
const RelativePathSchema = z.string().min(1).max(500);
const Base64Schema = z.string().min(1).max(2_000_000).regex(/^[A-Za-z0-9+/=\r\n]+$/);
const NodeIdSchema = z.string().min(4).max(240).regex(/^[A-Za-z0-9_+=:-]+$/);

type GovernanceExtra = Parameters<ScopedWriteGateDependencies['evaluate']>[0];

export type GithubLifecycleDependencies = {
  configuredOrg: string;
  request(endpoint: string, options?: GitHubJsonRequestOptions): Promise<GitHubJsonResponse>;
  writeEnabled?: () => boolean;
  evaluateGovernance?: (extra: GovernanceExtra) => Promise<ShadowWriteDecision>;
};

function readDefaults(): GithubLifecycleDependencies {
  return {
    configuredOrg: env.GITHUB_ORG,
    request: githubJsonRequestWithServerCredential
  };
}

function writeDefaults(): Required<GithubLifecycleDependencies> {
  const gate = getDefaultScopedWriteGateDependencies();
  return {
    configuredOrg: env.GITHUB_ORG,
    request: githubJsonRequestWithServerCredential,
    writeEnabled: () => env.ENABLE_WRITE_TOOLS,
    evaluateGovernance: (extra) => gate.evaluate(extra)
  };
}

function obj(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}
function arr(value: unknown): unknown[] { return Array.isArray(value) ? value : []; }
function str(value: unknown): string | null { return typeof value === 'string' ? value : null; }
function num(value: unknown): number | null { return typeof value === 'number' && Number.isFinite(value) ? value : null; }
function bool(value: unknown): boolean | null { return typeof value === 'boolean' ? value : null; }
function respond(value: unknown) { return asText(JSON.stringify(value, null, 2)); }

function assertOrg(organization: string, configuredOrg: string): string {
  const org = organization.trim();
  if (!org || org !== configuredOrg.trim()) throw new Error('GITHUB_CONTROL_ORG_NOT_ALLOWED');
  return org;
}
function safeRef(value: string): string {
  const ref = value.trim();
  if (!ref || ref.includes('..') || ref.startsWith('/') || ref.endsWith('/') || ref.includes('//')) {
    throw new Error('GITHUB_CONTROL_REF_INVALID');
  }
  return ref;
}
function safePath(value: string): string {
  const path = value.trim();
  if (!path || path.startsWith('/') || path.includes('..') || path.includes('//') || path.endsWith('/')) {
    throw new Error('GITHUB_CONTROL_PATH_INVALID');
  }
  if (!/^[A-Za-z0-9._/@+\-\/ ]+$/.test(path)) throw new Error('GITHUB_CONTROL_PATH_INVALID');
  return path;
}
function repoEndpoint(org: string, repo: string): string {
  return `/repos/${encodeURIComponent(org)}/${encodeURIComponent(repo)}`;
}
async function expect(
  deps: GithubLifecycleDependencies,
  endpoint: string,
  options: GitHubJsonRequestOptions = {},
  statuses: number[] = [200]
): Promise<unknown> {
  const response = await deps.request(endpoint, options);
  if (!response.ok || (response.status !== null && !statuses.includes(response.status))) {
    throw new Error(`GITHUB_CONTROL_REQUEST_FAILED:${response.status ?? 'NETWORK'}`);
  }
  return response.json;
}
async function requireWrite(deps: GithubLifecycleDependencies, extra: GovernanceExtra): Promise<void> {
  assertScopedWriteToolsEnabled(deps.writeEnabled?.() ?? false);
  if (!deps.evaluateGovernance) throw new Error('GITHUB_ADMIN_GOVERNANCE_BLOCKED:unavailable');
  const decision = await deps.evaluateGovernance(extra);
  if (decision.mode !== 'shadow' || decision.verdict !== 'shadow_ready' || decision.wouldBlock) {
    throw new Error(`GITHUB_ADMIN_GOVERNANCE_BLOCKED:${decision.verdict}`);
  }
}
function commitProjection(raw: unknown) {
  const root = obj(raw);
  const commit = obj(root?.commit);
  return {
    sha: str(root?.sha),
    message: str(commit?.message),
    htmlUrl: str(root?.html_url),
    author: str(obj(root?.author)?.login),
    committer: str(obj(root?.committer)?.login),
    parents: arr(root?.parents).map((entry) => str(obj(entry)?.sha)).filter(Boolean)
  };
}
function prProjection(raw: unknown) {
  const root = obj(raw);
  return {
    number: num(root?.number),
    nodeId: str(root?.node_id),
    state: str(root?.state),
    title: str(root?.title),
    draft: bool(root?.draft),
    merged: bool(root?.merged),
    mergeable: bool(root?.mergeable),
    mergeableState: str(root?.mergeable_state),
    headRef: str(obj(root?.head)?.ref),
    headSha: str(obj(root?.head)?.sha),
    baseRef: str(obj(root?.base)?.ref),
    baseSha: str(obj(root?.base)?.sha),
    htmlUrl: str(root?.html_url),
    updatedAt: str(root?.updated_at)
  };
}
function graphqlData(raw: unknown): Record<string, unknown> {
  const root = obj(raw);
  if (!root || (Array.isArray(root.errors) && root.errors.length > 0)) {
    throw new Error('GITHUB_GRAPHQL_FAILED');
  }
  const data = obj(root.data);
  if (!data) throw new Error('GITHUB_GRAPHQL_RESPONSE_INVALID');
  return data;
}
async function graphql(
  deps: GithubLifecycleDependencies,
  query: string,
  variables: Record<string, unknown>
): Promise<Record<string, unknown>> {
  return graphqlData(await expect(deps, '/graphql', {
    method: 'POST',
    jsonBody: { query, variables }
  }, [200]));
}

async function readBranchSha(
  deps: GithubLifecycleDependencies,
  org: string,
  repo: string,
  branch: string
): Promise<string> {
  const raw = obj(await expect(
    deps,
    `${repoEndpoint(org, repo)}/branches/${encodeURIComponent(branch)}`
  ));
  const sha = str(obj(raw?.commit)?.sha);
  if (!sha || !/^[0-9a-f]{40}$/i.test(sha)) throw new Error('GITHUB_BRANCH_SHA_INVALID');
  return sha.toLowerCase();
}

async function createCommitInternal(
  deps: GithubLifecycleDependencies,
  input: {
    org: string;
    repo: string;
    branch: string;
    expectedHeadSha: string;
    message: string;
    files: Array<{ path: string; contentBase64: string }>;
  }
) {
  const branch = safeRef(input.branch);
  const expectedHead = input.expectedHeadSha.toLowerCase();
  const observedHead = await readBranchSha(deps, input.org, input.repo, branch);
  if (observedHead !== expectedHead) throw new Error('GITHUB_BRANCH_HEAD_STALE');

  const baseCommit = obj(await expect(
    deps,
    `${repoEndpoint(input.org, input.repo)}/git/commits/${expectedHead}`
  ));
  const baseTreeSha = str(obj(baseCommit?.tree)?.sha);
  if (!baseTreeSha || !/^[0-9a-f]{40}$/i.test(baseTreeSha)) {
    throw new Error('GITHUB_BASE_TREE_INVALID');
  }

  const treeEntries: Array<Record<string, unknown>> = [];
  for (const file of input.files) {
    const path = safePath(file.path);
    const blob = obj(await expect(
      deps,
      `${repoEndpoint(input.org, input.repo)}/git/blobs`,
      { method: 'POST', jsonBody: { content: file.contentBase64, encoding: 'base64' } },
      [201]
    ));
    const blobSha = str(blob?.sha);
    if (!blobSha || !/^[0-9a-f]{40}$/i.test(blobSha)) throw new Error('GITHUB_BLOB_SHA_INVALID');
    treeEntries.push({ path, mode: '100644', type: 'blob', sha: blobSha });
  }

  const tree = obj(await expect(
    deps,
    `${repoEndpoint(input.org, input.repo)}/git/trees`,
    { method: 'POST', jsonBody: { base_tree: baseTreeSha, tree: treeEntries } },
    [201]
  ));
  const treeSha = str(tree?.sha);
  if (!treeSha || !/^[0-9a-f]{40}$/i.test(treeSha)) throw new Error('GITHUB_TREE_SHA_INVALID');

  const commit = obj(await expect(
    deps,
    `${repoEndpoint(input.org, input.repo)}/git/commits`,
    { method: 'POST', jsonBody: { message: input.message, tree: treeSha, parents: [expectedHead] } },
    [201]
  ));
  const commitSha = str(commit?.sha);
  if (!commitSha || !/^[0-9a-f]{40}$/i.test(commitSha)) throw new Error('GITHUB_COMMIT_SHA_INVALID');

  await expect(
    deps,
    `${repoEndpoint(input.org, input.repo)}/git/refs/heads/${encodeURIComponent(branch)}`,
    { method: 'PATCH', jsonBody: { sha: commitSha, force: false } },
    [200]
  );

  return { branch, previousHeadSha: expectedHead, commitSha: commitSha.toLowerCase(), files: treeEntries.map((entry) => entry.path) };
}

export function registerGithubGwcLifecycleReadTools(
  server: McpServer,
  dependencies: GithubLifecycleDependencies = readDefaults()
): void {
  const base = { organization: OrganizationSchema, repository: RepositorySchema };

  server.tool('github_get_review_threads', 'Retourne en lecture les review threads d’une pull request sans exposer de payload GraphQL brut.', {
    ...base,
    pullRequestNumber: PullRequestSchema
  }, async ({ organization, repository, pullRequestNumber }) => {
    const org = assertOrg(organization, dependencies.configuredOrg);
    const data = await graphql(dependencies,
      'query($owner:String!,$repo:String!,$number:Int!){repository(owner:$owner,name:$repo){pullRequest(number:$number){reviewThreads(first:100){nodes{id isResolved comments(first:100){nodes{id databaseId author{login} path line createdAt}}}}}}}',
      { owner: org, repo: repository, number: pullRequestNumber }
    );
    const threads = arr(obj(obj(obj(data.repository)?.pullRequest)?.reviewThreads)?.nodes).map((entry) => {
      const thread = obj(entry);
      return {
        id: str(thread?.id),
        isResolved: bool(thread?.isResolved),
        comments: arr(obj(thread?.comments)?.nodes).map((comment) => {
          const c = obj(comment);
          return {
            id: str(c?.id),
            databaseId: num(c?.databaseId),
            author: str(obj(c?.author)?.login),
            path: str(c?.path),
            line: num(c?.line),
            createdAt: str(c?.createdAt)
          };
        })
      };
    });
    return respond({ pullRequestNumber, threads });
  });

}

export function registerGithubGwcLifecycleWriteTools(
  server: McpServer,
  dependencies: GithubLifecycleDependencies = writeDefaults()
): void {
  const base = { organization: OrganizationSchema, repository: RepositorySchema };

  server.tool('github_create_branch', 'Crée une branche GitHub gouvernée depuis un SHA exact.', {
    ...base,
    branch: RefSchema,
    baseSha: ShaSchema
  }, async ({ organization, repository, branch, baseSha }, extra) => {
    await requireWrite(dependencies, extra);
    const org = assertOrg(organization, dependencies.configuredOrg);
    const safeBranch = safeRef(branch);
    const raw = obj(await expect(dependencies, `${repoEndpoint(org, repository)}/git/refs`, {
      method: 'POST',
      jsonBody: { ref: `refs/heads/${safeBranch}`, sha: baseSha.toLowerCase() }
    }, [201]));
    return respond({ branch: safeBranch, sha: str(obj(raw?.object)?.sha), ref: str(raw?.ref) });
  });


  server.tool('github_create_commit', 'Crée un commit GitHub gouverné multi-fichiers et avance la branche uniquement en non-force depuis le head exact.', {
    ...base,
    branch: RefSchema,
    expectedHeadSha: ShaSchema,
    message: MessageSchema,
    files: z.array(z.object({ path: RelativePathSchema, contentBase64: Base64Schema })).min(1).max(20)
  }, async ({ organization, repository, branch, expectedHeadSha, message, files }, extra) => {
    await requireWrite(dependencies, extra);
    const org = assertOrg(organization, dependencies.configuredOrg);
    return respond(await createCommitInternal(dependencies, {
      org,
      repo: repository,
      branch,
      expectedHeadSha,
      message,
      files
    }));
  });


  server.tool('github_create_or_update_file', 'Crée ou met à jour un fichier via un commit gouverné lié au head exact.', {
    ...base,
    branch: RefSchema,
    expectedHeadSha: ShaSchema,
    message: MessageSchema,
    path: RelativePathSchema,
    contentBase64: Base64Schema
  }, async ({ organization, repository, branch, expectedHeadSha, message, path, contentBase64 }, extra) => {
    await requireWrite(dependencies, extra);
    const org = assertOrg(organization, dependencies.configuredOrg);
    return respond(await createCommitInternal(dependencies, {
      org, repo: repository, branch, expectedHeadSha, message,
      files: [{ path, contentBase64 }]
    }));
  });


  server.tool('github_create_pull_request', 'Crée une pull request gouvernée entre deux branches explicites du même repository.', {
    ...base,
    title: TitleSchema,
    head: RefSchema,
    targetBase: RefSchema,
    body: BodySchema.default(''),
    draft: z.boolean().default(true)
  }, async ({ organization, repository, title, head, targetBase, body, draft }, extra) => {
    await requireWrite(dependencies, extra);
    const org = assertOrg(organization, dependencies.configuredOrg);
    const safeHead = safeRef(head);
    const safeBase = safeRef(targetBase);
    if (safeHead === safeBase) throw new Error('GITHUB_PR_HEAD_BASE_EQUAL');
    const raw = await expect(dependencies, `${repoEndpoint(org, repository)}/pulls`, {
      method: 'POST',
      jsonBody: { title, head: safeHead, base: safeBase, body, draft }
    }, [201]);
    return respond(prProjection(raw));
  });


  server.tool('github_mark_pr_ready', 'Marque une pull request Draft comme ready via une mutation GraphQL bornée.', {
    ...base,
    pullRequestNumber: PullRequestSchema
  }, async ({ organization, repository, pullRequestNumber }, extra) => {
    await requireWrite(dependencies, extra);
    const org = assertOrg(organization, dependencies.configuredOrg);
    const pr = obj(await expect(dependencies, `${repoEndpoint(org, repository)}/pulls/${pullRequestNumber}`));
    const nodeId = str(pr?.node_id);
    if (!nodeId) throw new Error('GITHUB_PR_NODE_ID_MISSING');
    const data = await graphql(dependencies,
      'mutation($id:ID!){markPullRequestReadyForReview(input:{pullRequestId:$id}){pullRequest{number isDraft}}}',
      { id: nodeId }
    );
    const out = obj(obj(data.markPullRequestReadyForReview)?.pullRequest);
    return respond({ number: num(out?.number), draft: bool(out?.isDraft) });
  });


  server.tool('github_reply_review_thread', 'Répond à un review thread GitHub précis via son node ID.', {
    ...base,
    threadId: NodeIdSchema,
    body: z.string().min(1).max(20_000)
  }, async ({ organization, threadId, body }, extra) => {
    await requireWrite(dependencies, extra);
    assertOrg(organization, dependencies.configuredOrg);
    const data = await graphql(dependencies,
      'mutation($thread:ID!,$body:String!){addPullRequestReviewThreadReply(input:{pullRequestReviewThreadId:$thread,body:$body}){comment{id databaseId}}}',
      { thread: threadId, body }
    );
    const comment = obj(obj(data.addPullRequestReviewThreadReply)?.comment);
    return respond({ id: str(comment?.id), databaseId: num(comment?.databaseId) });
  });


  server.tool('github_resolve_review_thread', 'Résout un review thread GitHub précis via son node ID.', {
    ...base,
    threadId: NodeIdSchema
  }, async ({ organization, threadId }, extra) => {
    await requireWrite(dependencies, extra);
    assertOrg(organization, dependencies.configuredOrg);
    const data = await graphql(dependencies,
      'mutation($thread:ID!){resolveReviewThread(input:{threadId:$thread}){thread{id isResolved}}}',
      { thread: threadId }
    );
    const thread = obj(obj(data.resolveReviewThread)?.thread);
    return respond({ id: str(thread?.id), resolved: bool(thread?.isResolved) });
  });


  server.tool('github_merge_pull_request', 'Fusionne une pull request uniquement au head exact attendu, non Draft, mergeable et avec checks observés verts.', {
    ...base,
    pullRequestNumber: PullRequestSchema,
    expectedHeadSha: ShaSchema,
    mergeMethod: z.enum(['merge','squash','rebase'])
  }, async ({ organization, repository, pullRequestNumber, expectedHeadSha, mergeMethod }, extra) => {
    await requireWrite(dependencies, extra);
    const org = assertOrg(organization, dependencies.configuredOrg);
    const rawPr = await expect(dependencies, `${repoEndpoint(org, repository)}/pulls/${pullRequestNumber}`);
    const projection = prProjection(rawPr);
    if (projection.headSha?.toLowerCase() !== expectedHeadSha.toLowerCase()) throw new Error('GITHUB_PR_HEAD_STALE');
    if (projection.draft) throw new Error('GITHUB_PR_DRAFT');
    if (projection.merged) throw new Error('GITHUB_PR_ALREADY_MERGED');
    if (projection.mergeable === false) throw new Error('GITHUB_PR_NOT_MERGEABLE');

    const checksRaw = obj(await expect(dependencies, `${repoEndpoint(org, repository)}/commits/${expectedHeadSha.toLowerCase()}/check-runs?per_page=100`));
    const checks = arr(checksRaw?.check_runs);
    const accepted = new Set(['success','neutral','skipped']);
    const notGreen = checks.filter((entry) => {
      const check = obj(entry);
      return str(check?.status) !== 'completed' || !accepted.has(str(check?.conclusion) ?? '');
    });
    if (notGreen.length > 0) throw new Error('GITHUB_PR_CHECKS_NOT_GREEN');

    const merged = obj(await expect(dependencies, `${repoEndpoint(org, repository)}/pulls/${pullRequestNumber}/merge`, {
      method: 'PUT',
      jsonBody: { sha: expectedHeadSha.toLowerCase(), merge_method: mergeMethod }
    }, [200, 201]));
    return respond({ merged: bool(merged?.merged), message: str(merged?.message), sha: str(merged?.sha), expectedHeadSha: expectedHeadSha.toLowerCase() });
  });
}
