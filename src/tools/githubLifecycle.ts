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
const NodeIdSchema = z.string().min(1).max(240).regex(/^[A-Za-z0-9_:\-]+$/);
const MessageSchema = z.string().min(1).max(10_000);
const BodySchema = z.string().max(65_000);
const PathSchema = z.string().min(1).max(500);
const Base64Schema = z.string().min(1).max(2_000_000);

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

function assertOrg(organization: string, configuredOrg: string): string {
  const org = organization.trim();
  if (!org || org !== configuredOrg.trim()) {
    throw new Error('GITHUB_CONTROL_ORG_NOT_ALLOWED');
  }
  return org;
}

function safeRef(value: string): string {
  const ref = value.trim();
  if (
    !ref
    || ref.includes('..')
    || ref.startsWith('/')
    || ref.endsWith('/')
    || ref.includes('//')
  ) {
    throw new Error('GITHUB_CONTROL_REF_INVALID');
  }
  return ref;
}

function safePath(value: string): string {
  const path = value.trim();
  if (
    !path
    || path.startsWith('/')
    || path.endsWith('/')
    || path.includes('..')
    || path.includes('//')
    || !/^[A-Za-z0-9._/@+\-\/ ]+$/.test(path)
  ) {
    throw new Error('GITHUB_CONTROL_PATH_INVALID');
  }
  return path;
}

function repoEndpoint(org: string, repo: string): string {
  return `/repos/${encodeURIComponent(org)}/${encodeURIComponent(repo)}`;
}

async function expect(
  deps: GithubLifecycleDependencies,
  endpoint: string,
  options: GitHubJsonRequestOptions = {},
  allowedStatuses: number[] = [200, 201]
): Promise<unknown> {
  const response = await deps.request(endpoint, options);
  if (!response.ok || !allowedStatuses.includes(response.status ?? -1)) {
    throw new Error(`GITHUB_CONTROL_REQUEST_FAILED:${response.status ?? 'NETWORK'}`);
  }
  return response.json;
}

async function requireWrite(
  deps: GithubLifecycleDependencies,
  extra: GovernanceExtra
): Promise<void> {
  assertScopedWriteToolsEnabled(deps.writeEnabled?.() ?? false);
  if (!deps.evaluateGovernance) {
    throw new Error('GITHUB_CONTROL_GOVERNANCE_BLOCKED:unavailable');
  }
  const decision = await deps.evaluateGovernance(extra);
  if (
    decision.mode !== 'shadow'
    || decision.verdict !== 'shadow_ready'
    || decision.wouldBlock
  ) {
    throw new Error(`GITHUB_CONTROL_GOVERNANCE_BLOCKED:${decision.verdict}`);
  }
}

function respond(value: unknown) {
  return asText(JSON.stringify(value, null, 2));
}

function pullRequestProjection(raw: unknown) {
  const root = object(raw);
  const head = object(root?.head);
  const base = object(root?.base);
  return {
    number: number(root?.number),
    nodeId: string(root?.node_id),
    draft: boolean(root?.draft),
    merged: boolean(root?.merged),
    mergeable: boolean(root?.mergeable),
    mergeableState: string(root?.mergeable_state),
    headRef: string(head?.ref),
    headSha: string(head?.sha),
    baseRef: string(base?.ref),
    baseSha: string(base?.sha),
    htmlUrl: string(root?.html_url)
  };
}

async function readBranchSha(
  deps: GithubLifecycleDependencies,
  org: string,
  repo: string,
  branch: string
): Promise<string> {
  const raw = object(await expect(
    deps,
    `${repoEndpoint(org, repo)}/branches/${encodeURIComponent(branch)}`
  ));
  const sha = string(object(raw?.commit)?.sha)?.toLowerCase() ?? null;
  if (!sha || !/^[0-9a-f]{40}$/.test(sha)) {
    throw new Error('GITHUB_BRANCH_SHA_INVALID');
  }
  return sha;
}

async function readPullRequest(
  deps: GithubLifecycleDependencies,
  org: string,
  repo: string,
  pullRequestNumber: number
) {
  return pullRequestProjection(await expect(
    deps,
    `${repoEndpoint(org, repo)}/pulls/${pullRequestNumber}`
  ));
}

function assertExpectedPrHead(
  projection: ReturnType<typeof pullRequestProjection>,
  expectedHeadSha: string
): string {
  const expected = expectedHeadSha.toLowerCase();
  const observed = projection.headSha?.toLowerCase() ?? null;
  if (!observed || observed !== expected) throw new Error('GITHUB_PR_HEAD_STALE');
  return expected;
}

async function graphql(
  deps: GithubLifecycleDependencies,
  query: string,
  variables: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const raw = object(await expect(deps, '/graphql', {
    method: 'POST',
    jsonBody: { query, variables }
  }));
  if (!raw) throw new Error('GITHUB_GRAPHQL_RESPONSE_INVALID');
  const errors = array(raw.errors);
  if (errors.length > 0) throw new Error('GITHUB_GRAPHQL_FAILED');
  const data = object(raw.data);
  if (!data) throw new Error('GITHUB_GRAPHQL_RESPONSE_INVALID');
  return data;
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

  const baseCommit = object(await expect(
    deps,
    `${repoEndpoint(input.org, input.repo)}/git/commits/${expectedHead}`
  ));
  const baseTreeSha = string(object(baseCommit?.tree)?.sha)?.toLowerCase() ?? null;
  if (!baseTreeSha || !/^[0-9a-f]{40}$/.test(baseTreeSha)) {
    throw new Error('GITHUB_BASE_TREE_INVALID');
  }

  const baseTree = object(await expect(
    deps,
    `${repoEndpoint(input.org, input.repo)}/git/trees/${baseTreeSha}?recursive=1`
  ));
  if (boolean(baseTree?.truncated) === true) {
    throw new Error('GITHUB_BASE_TREE_TRUNCATED');
  }

  const existingEntries = new Map<string, { mode: string | null; type: string | null }>();
  for (const rawEntry of array(baseTree?.tree)) {
    const entry = object(rawEntry);
    const path = string(entry?.path);
    if (!path) continue;
    existingEntries.set(path, {
      mode: string(entry?.mode),
      type: string(entry?.type)
    });
  }

  type ReplaceableBlobMode = '100644' | '100755' | '120000';
  const replaceableBlobModes = new Set<ReplaceableBlobMode>(['100644', '100755', '120000']);
  const treeEntries: Array<{
    path: string;
    mode: ReplaceableBlobMode;
    type: 'blob';
    sha: string;
  }> = [];

  for (const file of input.files) {
    const path = safePath(file.path);
    const existing = existingEntries.get(path);
    let mode: ReplaceableBlobMode = '100644';
    if (existing) {
      if (
        existing.type !== 'blob'
        || !existing.mode
        || !replaceableBlobModes.has(existing.mode as ReplaceableBlobMode)
      ) {
        throw new Error('GITHUB_EXISTING_PATH_NOT_REPLACEABLE_BLOB');
      }
      mode = existing.mode as ReplaceableBlobMode;
    }

    const blob = object(await expect(
      deps,
      `${repoEndpoint(input.org, input.repo)}/git/blobs`,
      {
        method: 'POST',
        jsonBody: { content: file.contentBase64, encoding: 'base64' }
      }
    ));
    const blobSha = string(blob?.sha)?.toLowerCase() ?? null;
    if (!blobSha || !/^[0-9a-f]{40}$/.test(blobSha)) {
      throw new Error('GITHUB_BLOB_SHA_INVALID');
    }
    treeEntries.push({ path, mode, type: 'blob', sha: blobSha });
  }

  const tree = object(await expect(
    deps,
    `${repoEndpoint(input.org, input.repo)}/git/trees`,
    {
      method: 'POST',
      jsonBody: { base_tree: baseTreeSha, tree: treeEntries }
    }
  ));
  const treeSha = string(tree?.sha)?.toLowerCase() ?? null;
  if (!treeSha || !/^[0-9a-f]{40}$/.test(treeSha)) {
    throw new Error('GITHUB_TREE_SHA_INVALID');
  }

  const commit = object(await expect(
    deps,
    `${repoEndpoint(input.org, input.repo)}/git/commits`,
    {
      method: 'POST',
      jsonBody: {
        message: input.message,
        tree: treeSha,
        parents: [expectedHead]
      }
    }
  ));
  const commitSha = string(commit?.sha)?.toLowerCase() ?? null;
  if (!commitSha || !/^[0-9a-f]{40}$/.test(commitSha)) {
    throw new Error('GITHUB_COMMIT_SHA_INVALID');
  }

  await expect(
    deps,
    `${repoEndpoint(input.org, input.repo)}/git/refs/heads/${encodeURIComponent(branch)}`,
    { method: 'PATCH', jsonBody: { sha: commitSha, force: false } }
  );

  return {
    branch,
    previousHeadSha: expectedHead,
    commitSha,
    files: treeEntries.map((entry) => entry.path)
  };
}

export function registerGithubLifecycleReadTools(
  server: McpServer,
  dependencies: GithubLifecycleDependencies = readDefaults()
): void {
  server.tool(
    'github_get_review_threads',
    'Retourne en lecture les review threads bornés d’une pull request sans payload GraphQL brut.',
    {
      organization: OrganizationSchema,
      repository: RepositorySchema,
      pullRequestNumber: PullRequestSchema
    },
    async ({ organization, repository, pullRequestNumber }) => {
      const org = assertOrg(organization, dependencies.configuredOrg);
      const data = await graphql(
        dependencies,
        'query($owner:String!,$repo:String!,$number:Int!){repository(owner:$owner,name:$repo){pullRequest(number:$number){reviewThreads(first:100){nodes{id isResolved comments(first:100){nodes{id databaseId author{login} path line createdAt}}}}}}}',
        { owner: org, repo: repository, number: pullRequestNumber }
      );
      const threads = array(
        object(object(object(data.repository)?.pullRequest)?.reviewThreads)?.nodes
      ).slice(0, 100).map((entry) => {
        const thread = object(entry);
        return {
          id: string(thread?.id),
          isResolved: boolean(thread?.isResolved),
          comments: array(object(thread?.comments)?.nodes).slice(0, 100).map((comment) => {
            const item = object(comment);
            return {
              id: string(item?.id),
              databaseId: number(item?.databaseId),
              author: string(object(item?.author)?.login),
              path: string(item?.path),
              line: number(item?.line),
              createdAt: string(item?.createdAt)
            };
          })
        };
      });
      return respond({ pullRequestNumber, threads });
    }
  );
}

export function registerGithubLifecycleWriteTools(
  server: McpServer,
  dependencies: GithubLifecycleDependencies = writeDefaults()
): void {
  server.tool(
    'github_create_branch',
    'Crée une branche GitHub gouvernée depuis un SHA exact.',
    {
      organization: OrganizationSchema,
      repository: RepositorySchema,
      branch: RefSchema,
      baseSha: ShaSchema
    },
    async ({ organization, repository, branch, baseSha }, extra) => {
      await requireWrite(dependencies, extra as GovernanceExtra);
      const org = assertOrg(organization, dependencies.configuredOrg);
      const safeBranch = safeRef(branch);
      const raw = object(await expect(
        dependencies,
        `${repoEndpoint(org, repository)}/git/refs`,
        {
          method: 'POST',
          jsonBody: {
            ref: `refs/heads/${safeBranch}`,
            sha: baseSha.toLowerCase()
          }
        }
      ));
      return respond({
        branch: safeBranch,
        sha: string(object(raw?.object)?.sha),
        ref: string(raw?.ref)
      });
    }
  );

  server.tool(
    'github_create_commit',
    'Crée un commit multi-fichiers et avance la branche en non-force uniquement depuis le head exact attendu.',
    {
      organization: OrganizationSchema,
      repository: RepositorySchema,
      branch: RefSchema,
      expectedHeadSha: ShaSchema,
      message: MessageSchema,
      files: z.array(z.object({
        path: PathSchema,
        contentBase64: Base64Schema
      }).strict()).min(1).max(100)
    },
    async ({ organization, repository, branch, expectedHeadSha, message, files }, extra) => {
      await requireWrite(dependencies, extra as GovernanceExtra);
      const org = assertOrg(organization, dependencies.configuredOrg);
      return respond(await createCommitInternal(dependencies, {
        org,
        repo: repository,
        branch,
        expectedHeadSha,
        message,
        files
      }));
    }
  );

  server.tool(
    'github_create_or_update_file',
    'Crée ou met à jour un fichier via un commit gouverné lié au head exact.',
    {
      organization: OrganizationSchema,
      repository: RepositorySchema,
      branch: RefSchema,
      expectedHeadSha: ShaSchema,
      message: MessageSchema,
      path: PathSchema,
      contentBase64: Base64Schema
    },
    async ({
      organization, repository, branch, expectedHeadSha, message, path, contentBase64
    }, extra) => {
      await requireWrite(dependencies, extra as GovernanceExtra);
      const org = assertOrg(organization, dependencies.configuredOrg);
      return respond(await createCommitInternal(dependencies, {
        org,
        repo: repository,
        branch,
        expectedHeadSha,
        message,
        files: [{ path, contentBase64 }]
      }));
    }
  );

  server.tool(
    'github_create_pull_request',
    'Crée une pull request gouvernée après relecture du SHA exact de sa branche head.',
    {
      organization: OrganizationSchema,
      repository: RepositorySchema,
      title: z.string().min(1).max(256),
      head: RefSchema,
      targetBase: RefSchema,
      expectedHeadSha: ShaSchema,
      body: BodySchema.default(''),
      draft: z.boolean().default(true)
    },
    async ({
      organization, repository, title, head, targetBase, expectedHeadSha, body, draft
    }, extra) => {
      await requireWrite(dependencies, extra as GovernanceExtra);
      const org = assertOrg(organization, dependencies.configuredOrg);
      const safeHead = safeRef(head);
      const safeBase = safeRef(targetBase);
      if (safeHead === safeBase) throw new Error('GITHUB_PR_HEAD_BASE_EQUAL');
      const observedHead = await readBranchSha(dependencies, org, repository, safeHead);
      if (observedHead !== expectedHeadSha.toLowerCase()) {
        throw new Error('GITHUB_PR_HEAD_STALE');
      }
      const raw = await expect(
        dependencies,
        `${repoEndpoint(org, repository)}/pulls`,
        {
          method: 'POST',
          jsonBody: { title, head: safeHead, base: safeBase, body, draft }
        }
      );
      return respond(pullRequestProjection(raw));
    }
  );

  server.tool(
    'github_mark_pr_ready',
    'Marque une pull request Draft comme ready uniquement si son head exact correspond encore à l’attendu.',
    {
      organization: OrganizationSchema,
      repository: RepositorySchema,
      pullRequestNumber: PullRequestSchema,
      expectedHeadSha: ShaSchema
    },
    async ({ organization, repository, pullRequestNumber, expectedHeadSha }, extra) => {
      await requireWrite(dependencies, extra as GovernanceExtra);
      const org = assertOrg(organization, dependencies.configuredOrg);
      const projection = await readPullRequest(
        dependencies, org, repository, pullRequestNumber
      );
      const expected = assertExpectedPrHead(projection, expectedHeadSha);
      if (projection.draft === false) {
        return respond({
          pullRequestNumber,
          headSha: expected,
          draft: false,
          alreadyReady: true
        });
      }
      const nodeId = projection.nodeId;
      if (!nodeId) throw new Error('GITHUB_PR_NODE_ID_MISSING');
      const data = await graphql(
        dependencies,
        'mutation($id:ID!){markPullRequestReadyForReview(input:{pullRequestId:$id}){pullRequest{number isDraft}}}',
        { id: nodeId }
      );
      const out = object(object(data.markPullRequestReadyForReview)?.pullRequest);
      return respond({
        pullRequestNumber: number(out?.number) ?? pullRequestNumber,
        headSha: expected,
        draft: boolean(out?.isDraft)
      });
    }
  );

  server.tool(
    'github_reply_review_thread',
    'Répond à un review thread précis après validation du head exact de la pull request.',
    {
      organization: OrganizationSchema,
      repository: RepositorySchema,
      pullRequestNumber: PullRequestSchema,
      expectedHeadSha: ShaSchema,
      threadId: NodeIdSchema,
      body: z.string().min(1).max(10_000)
    },
    async ({
      organization, repository, pullRequestNumber, expectedHeadSha, threadId, body
    }, extra) => {
      await requireWrite(dependencies, extra as GovernanceExtra);
      const org = assertOrg(organization, dependencies.configuredOrg);
      const projection = await readPullRequest(
        dependencies, org, repository, pullRequestNumber
      );
      const expected = assertExpectedPrHead(projection, expectedHeadSha);
      const data = await graphql(
        dependencies,
        'mutation($thread:ID!,$body:String!){addPullRequestReviewThreadReply(input:{pullRequestReviewThreadId:$thread,body:$body}){comment{id databaseId}}}',
        { thread: threadId, body }
      );
      const comment = object(object(data.addPullRequestReviewThreadReply)?.comment);
      return respond({
        pullRequestNumber,
        headSha: expected,
        threadId,
        commentId: string(comment?.id),
        databaseId: number(comment?.databaseId)
      });
    }
  );

  server.tool(
    'github_resolve_review_thread',
    'Résout un review thread précis après validation du head exact de la pull request.',
    {
      organization: OrganizationSchema,
      repository: RepositorySchema,
      pullRequestNumber: PullRequestSchema,
      expectedHeadSha: ShaSchema,
      threadId: NodeIdSchema
    },
    async ({
      organization, repository, pullRequestNumber, expectedHeadSha, threadId
    }, extra) => {
      await requireWrite(dependencies, extra as GovernanceExtra);
      const org = assertOrg(organization, dependencies.configuredOrg);
      const projection = await readPullRequest(
        dependencies, org, repository, pullRequestNumber
      );
      const expected = assertExpectedPrHead(projection, expectedHeadSha);
      const data = await graphql(
        dependencies,
        'mutation($thread:ID!){resolveReviewThread(input:{threadId:$thread}){thread{id isResolved}}}',
        { thread: threadId }
      );
      const thread = object(object(data.resolveReviewThread)?.thread);
      return respond({
        pullRequestNumber,
        headSha: expected,
        threadId: string(thread?.id) ?? threadId,
        isResolved: boolean(thread?.isResolved)
      });
    }
  );

  server.tool(
    'github_merge_pull_request',
    'Fusionne une pull request uniquement au head exact attendu, non Draft et avec check-runs observés verts.',
    {
      organization: OrganizationSchema,
      repository: RepositorySchema,
      pullRequestNumber: PullRequestSchema,
      expectedHeadSha: ShaSchema,
      mergeMethod: z.enum(['merge', 'squash', 'rebase'])
    },
    async ({
      organization, repository, pullRequestNumber, expectedHeadSha, mergeMethod
    }, extra) => {
      await requireWrite(dependencies, extra as GovernanceExtra);
      const org = assertOrg(organization, dependencies.configuredOrg);
      const projection = await readPullRequest(
        dependencies, org, repository, pullRequestNumber
      );
      const expected = assertExpectedPrHead(projection, expectedHeadSha);
      if (projection.draft) throw new Error('GITHUB_PR_DRAFT');
      if (projection.merged) throw new Error('GITHUB_PR_ALREADY_MERGED');
      if (projection.mergeable === false) throw new Error('GITHUB_PR_NOT_MERGEABLE');

      const checksRaw = object(await expect(
        dependencies,
        `${repoEndpoint(org, repository)}/commits/${expected}/check-runs?per_page=100`
      ));
      const checks = array(checksRaw?.check_runs);
      if (checks.length === 0) throw new Error('GITHUB_PR_CHECKS_UNAVAILABLE');
      const notGreen = checks.filter((entry) => {
        const check = object(entry);
        return (
          string(check?.status) !== 'completed'
          || !['success', 'neutral', 'skipped'].includes(string(check?.conclusion) ?? '')
        );
      });
      if (notGreen.length > 0) throw new Error('GITHUB_PR_CHECKS_NOT_GREEN');

      const merged = object(await expect(
        dependencies,
        `${repoEndpoint(org, repository)}/pulls/${pullRequestNumber}/merge`,
        {
          method: 'PUT',
          jsonBody: { sha: expected, merge_method: mergeMethod }
        }
      ));
      return respond({
        merged: boolean(merged?.merged),
        message: string(merged?.message),
        sha: string(merged?.sha),
        expectedHeadSha: expected
      });
    }
  );
}
