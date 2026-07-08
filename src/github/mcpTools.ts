import { mkdir, readFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { env } from '../config/env.js';
import { getGithubConnectionStatus } from './connection.js';
import { readGitRegistry, writeGitRegistry } from './registry.js';

const DEFAULT_TOKEN_FILE = '/app/secrets/github_token';
const REQUIRED_GOVERNANCE_FILES = [
  '.mcp/manifest.json',
  '.mcp/permissions.json',
  '.mcp/agents.json',
  '.mcp/server-map.json',
  '.mcp/onboarding.json',
  'MCP_PROJECT.md',
  'MCP_AGENT_RULES.md',
  'MCP_REPO_INVENTORY.md',
  'MCP_SERVER_MAPPING.md'
];
const MAX_FILES_PER_COMMIT = 20;
const MAX_FILE_CONTENT_BYTES = 200_000;

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH';
type JsonObject = Record<string, unknown>;

type GitHubApiResult = {
  ok: boolean;
  status: number;
  json: unknown;
  text: string;
};

export type GitHubCommitFile = {
  path: string;
  content: string;
};

export class GitHubToolError extends Error {
  readonly code: string;
  readonly httpStatus: number | null;

  constructor(code: string, message: string, httpStatus: number | null = null) {
    super(message);
    this.name = 'GitHubToolError';
    this.code = code;
    this.httpStatus = httpStatus;
  }
}

function tokenFilePath(): string {
  return env.GITHUB_TOKEN_FILE || DEFAULT_TOKEN_FILE;
}

function githubApiBase(): string {
  return env.GITHUB_API_BASE.replace(/\/$/, '');
}

function configuredOrg(): string {
  return env.GITHUB_ORG || 'chainsolutions-wealthtech';
}

function asRecord(value: unknown): JsonObject {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonObject : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function stringValue(record: JsonObject, key: string, fallback = ''): string {
  const value = record[key];
  return typeof value === 'string' ? value : fallback;
}

function nullableStringValue(record: JsonObject, key: string): string | null {
  const value = record[key];
  return typeof value === 'string' ? value : null;
}

function numberValue(record: JsonObject, key: string): number | null {
  const value = record[key];
  return typeof value === 'number' ? value : null;
}

function booleanValue(record: JsonObject, key: string): boolean {
  const value = record[key];
  return typeof value === 'boolean' ? value : false;
}

function nestedRecord(record: JsonObject, key: string): JsonObject {
  return asRecord(record[key]);
}

function safeTruncatedText(value: string): string {
  const normalized = value.replace(/[\r\n\t]+/g, ' ').trim();
  return normalized.length > 280 ? `${normalized.slice(0, 280)}…` : normalized;
}

function assertRepoPart(value: string, label: string): string {
  const normalized = value.trim();
  if (!/^[A-Za-z0-9_.-]+$/.test(normalized)) {
    throw new GitHubToolError('invalid_github_identifier', `${label} GitHub invalide`);
  }
  return normalized;
}

export function assertMcpBranchName(branch: string): string {
  const normalized = branch.trim();
  if (!/^mcp\/[A-Za-z0-9._/-]+$/.test(normalized) || normalized.includes('..') || normalized.includes('\\')) {
    throw new GitHubToolError('branch_must_be_mcp_scoped', 'Les écritures GitHub MCP sont limitées aux branches mcp/*');
  }
  if (normalized === 'mcp/' || normalized.endsWith('/')) {
    throw new GitHubToolError('invalid_mcp_branch', 'Branche mcp/* invalide');
  }
  return normalized;
}

function assertBaseBranchName(branch: string): string {
  const normalized = branch.trim();
  if (!/^[A-Za-z0-9._/-]+$/.test(normalized) || normalized.includes('..') || normalized.includes('\\') || normalized.length === 0) {
    throw new GitHubToolError('invalid_base_branch', 'Branche de base invalide');
  }
  return normalized;
}

export function assertSafeCommitFiles(files: GitHubCommitFile[]): GitHubCommitFile[] {
  if (files.length === 0 || files.length > MAX_FILES_PER_COMMIT) {
    throw new GitHubToolError('invalid_file_count', `Le commit contrôlé doit contenir entre 1 et ${MAX_FILES_PER_COMMIT} fichiers`);
  }

  return files.map((file) => {
    const path = file.path.trim();
    const contentBytes = Buffer.byteLength(file.content, 'utf8');
    const basename = path.split('/').pop() ?? '';

    if (!path || path.startsWith('/') || path.includes('..') || path.includes('\\') || path.split('/').some((part) => part.length === 0)) {
      throw new GitHubToolError('unsafe_file_path', `Chemin de fichier interdit: ${path || '(vide)'}`);
    }

    if (/^\.env($|\.)/i.test(basename) || /\.(pem|key|p12|pfx)$/i.test(basename) || /(^|\/)(id_rsa|id_ed25519|authorized_keys)$/i.test(path)) {
      throw new GitHubToolError('secret_like_file_blocked', `Fichier sensible interdit dans un commit MCP: ${path}`);
    }

    if (contentBytes > MAX_FILE_CONTENT_BYTES) {
      throw new GitHubToolError('file_too_large', `Fichier trop volumineux pour commit contrôlé: ${path}`);
    }

    return { path, content: file.content };
  });
}

export function redactGitHubToolMetadata(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => redactGitHubToolMetadata(entry));
  }
  if (!value || typeof value !== 'object') {
    return typeof value === 'string' && /gh[pousr]_[A-Za-z0-9_]+|BEGIN (RSA|OPENSSH|PRIVATE) KEY/i.test(value)
      ? '[redacted]'
      : value;
  }

  const output: JsonObject = {};
  for (const [key, entry] of Object.entries(value as JsonObject)) {
    if (/token|secret|password|private|authorization|cookie|\.env|key/i.test(key)) {
      output[key] = '[redacted]';
    } else {
      output[key] = redactGitHubToolMetadata(entry);
    }
  }
  return output;
}

export function publicSafeError(error: unknown): JsonObject {
  if (error instanceof GitHubToolError) {
    return {
      ok: false,
      error: error.code,
      message: error.message,
      httpStatus: error.httpStatus
    };
  }

  return {
    ok: false,
    error: 'github_tool_failed',
    message: error instanceof Error ? safeTruncatedText(error.message) : 'Erreur GitHub MCP inconnue'
  };
}

async function readGithubToken(): Promise<string> {
  try {
    const token = (await readFile(tokenFilePath(), 'utf8')).trim();
    if (token) {
      return token;
    }
  } catch {
    // handled below
  }
  throw new GitHubToolError('github_token_missing', 'Aucun token GitHub n est visible par le conteneur MCP.');
}

async function githubRequest(endpoint: string, options: { method?: HttpMethod; body?: unknown } = {}): Promise<GitHubApiResult> {
  const token = await readGithubToken();
  const url = endpoint.startsWith('http') ? endpoint : `${githubApiBase()}${endpoint}`;
  const response = await fetch(url, {
    method: options.method ?? 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'wealthtech-mcp-github-tools',
      ...(options.body === undefined ? {} : { 'Content-Type': 'application/json' })
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body)
  });

  const text = await response.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  return { ok: response.ok, status: response.status, json, text };
}

function requireOk(response: GitHubApiResult, code: string): unknown {
  if (response.ok) {
    return response.json;
  }
  throw new GitHubToolError(code, `GitHub API HTTP ${response.status}: ${safeTruncatedText(response.text)}`, response.status);
}

async function auditGithubOperation(action: string, result: 'ok' | 'warning' | 'blocked' | 'error', metadata: JsonObject): Promise<void> {
  const registry = await readGitRegistry();
  const at = new Date().toISOString();
  await mkdir(dirname(process.env.MCP_GIT_REGISTRY_FILE || '/app/data/mcp-git-registry.json'), { recursive: true, mode: 0o700 });
  registry.auditEvents.push({
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    at,
    type: `github.tool.${action}`,
    actor: 'mcp-tool:github',
    message: `GitHub MCP tool ${action}: ${result}`,
    metadata: redactGitHubToolMetadata({ result, ...metadata }) as JsonObject
  });
  await writeGitRegistry(registry);
}

function repoSummary(raw: unknown): JsonObject {
  const repo = asRecord(raw);
  const owner = nestedRecord(repo, 'owner');
  const permissions = nestedRecord(repo, 'permissions');
  return {
    id: numberValue(repo, 'id'),
    name: stringValue(repo, 'name'),
    fullName: stringValue(repo, 'full_name'),
    owner: stringValue(owner, 'login'),
    private: booleanValue(repo, 'private'),
    visibility: stringValue(repo, 'visibility', booleanValue(repo, 'private') ? 'private' : 'public'),
    defaultBranch: stringValue(repo, 'default_branch'),
    archived: booleanValue(repo, 'archived'),
    disabled: booleanValue(repo, 'disabled'),
    permissions: {
      pull: booleanValue(permissions, 'pull'),
      push: booleanValue(permissions, 'push'),
      admin: booleanValue(permissions, 'admin'),
      maintain: booleanValue(permissions, 'maintain'),
      triage: booleanValue(permissions, 'triage')
    }
  };
}

function prSummary(raw: unknown): JsonObject {
  const pr = asRecord(raw);
  const head = nestedRecord(pr, 'head');
  const base = nestedRecord(pr, 'base');
  const user = nestedRecord(pr, 'user');
  return {
    number: numberValue(pr, 'number'),
    title: stringValue(pr, 'title'),
    state: stringValue(pr, 'state'),
    draft: booleanValue(pr, 'draft'),
    head: stringValue(head, 'ref'),
    base: stringValue(base, 'ref'),
    user: stringValue(user, 'login'),
    url: stringValue(pr, 'html_url'),
    updatedAt: stringValue(pr, 'updated_at')
  };
}

function workflowRunSummary(raw: unknown): JsonObject {
  const run = asRecord(raw);
  const headRepository = nestedRecord(run, 'head_repository');
  return {
    id: numberValue(run, 'id'),
    name: nullableStringValue(run, 'name'),
    event: stringValue(run, 'event'),
    status: nullableStringValue(run, 'status'),
    conclusion: nullableStringValue(run, 'conclusion'),
    branch: stringValue(run, 'head_branch'),
    commit: stringValue(run, 'head_sha'),
    repository: stringValue(headRepository, 'full_name'),
    url: stringValue(run, 'html_url'),
    updatedAt: stringValue(run, 'updated_at')
  };
}

async function listRepoGovernanceFiles(owner: string, repo: string, branch: string): Promise<{ presentFiles: string[]; missingFiles: string[] }> {
  const presentFiles: string[] = [];
  const missingFiles: string[] = [];

  for (const path of REQUIRED_GOVERNANCE_FILES) {
    const response = await githubRequest(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${path}?ref=${encodeURIComponent(branch)}`);
    if (response.ok) {
      presentFiles.push(path);
    } else if (response.status === 404) {
      missingFiles.push(path);
    } else {
      missingFiles.push(path);
    }
  }

  return { presentFiles, missingFiles };
}

async function getRepoRecord(owner: string, repo: string): Promise<JsonObject> {
  const response = await githubRequest(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`);
  return asRecord(requireOk(response, 'github_repo_status_failed'));
}

async function getRefSha(owner: string, repo: string, branch: string): Promise<string> {
  const response = await githubRequest(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/ref/heads/${encodeURIComponent(branch)}`);
  const ref = asRecord(requireOk(response, 'github_ref_read_failed'));
  const object = nestedRecord(ref, 'object');
  const sha = stringValue(object, 'sha');
  if (!sha) {
    throw new GitHubToolError('github_ref_sha_missing', 'SHA de branche introuvable.');
  }
  return sha;
}

async function getCommitTreeSha(owner: string, repo: string, commitSha: string): Promise<string> {
  const response = await githubRequest(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/commits/${encodeURIComponent(commitSha)}`);
  const commit = asRecord(requireOk(response, 'github_commit_read_failed'));
  const tree = nestedRecord(commit, 'tree');
  const treeSha = stringValue(tree, 'sha');
  if (!treeSha) {
    throw new GitHubToolError('github_tree_sha_missing', 'SHA tree introuvable.');
  }
  return treeSha;
}

export async function githubStatusTool(): Promise<JsonObject> {
  const status = await getGithubConnectionStatus();
  await auditGithubOperation('github_status', status.connected ? 'ok' : 'warning', {
    connected: status.connected,
    org: status.org,
    login: status.login,
    reposVisible: status.reposVisible,
    orgAccessible: status.orgAccessible
  });
  return { ok: true, status };
}

export async function githubListOrgsTool(): Promise<JsonObject> {
  const response = await githubRequest('/user/orgs?per_page=100');
  const orgs = asArray(requireOk(response, 'github_list_orgs_failed')).map((org) => {
    const record = asRecord(org);
    return {
      login: stringValue(record, 'login'),
      id: numberValue(record, 'id'),
      url: stringValue(record, 'html_url')
    };
  });
  const targetOrg = configuredOrg();
  const targetCheck = await githubRequest(`/orgs/${encodeURIComponent(targetOrg)}`);
  await auditGithubOperation('github_list_orgs', targetCheck.ok ? 'ok' : 'warning', {
    orgCount: orgs.length,
    targetOrg,
    targetOrgAccessible: targetCheck.ok
  });
  return { ok: true, targetOrg, targetOrgAccessible: targetCheck.ok, orgs };
}

export async function githubListReposTool(ownerInput?: string): Promise<JsonObject> {
  const owner = ownerInput ? assertRepoPart(ownerInput, 'owner') : configuredOrg();
  const endpoint = owner
    ? `/orgs/${encodeURIComponent(owner)}/repos?per_page=100&type=all&sort=updated`
    : '/user/repos?per_page=100&affiliation=owner,collaborator,organization_member&sort=updated';
  const response = await githubRequest(endpoint);
  const repos = asArray(requireOk(response, 'github_list_repos_failed')).map(repoSummary);
  await auditGithubOperation('github_list_repos', 'ok', { owner, reposVisible: repos.length });
  return { ok: true, owner, repos };
}

export async function githubRepoStatusTool(ownerInput: string, repoInput: string): Promise<JsonObject> {
  const owner = assertRepoPart(ownerInput, 'owner');
  const repo = assertRepoPart(repoInput, 'repo');
  const record = await getRepoRecord(owner, repo);
  const summary = repoSummary(record);
  const defaultBranch = stringValue(record, 'default_branch', 'main');
  const governance = await listRepoGovernanceFiles(owner, repo, defaultBranch);
  await auditGithubOperation('github_repo_status', 'ok', {
    repository: `${owner}/${repo}`,
    defaultBranch,
    missingGovernanceFiles: governance.missingFiles
  });
  return { ok: true, repo: summary, governance };
}

export async function githubListPrsTool(ownerInput: string, repoInput: string, state = 'open', limit = 20): Promise<JsonObject> {
  const owner = assertRepoPart(ownerInput, 'owner');
  const repo = assertRepoPart(repoInput, 'repo');
  const safeState = ['open', 'closed', 'all'].includes(state) ? state : 'open';
  const perPage = Math.min(Math.max(Number.isFinite(limit) ? Math.trunc(limit) : 20, 1), 100);
  const response = await githubRequest(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls?state=${safeState}&per_page=${perPage}`);
  const pullRequests = asArray(requireOk(response, 'github_list_prs_failed')).map(prSummary);
  await auditGithubOperation('github_list_prs', 'ok', { repository: `${owner}/${repo}`, state: safeState, count: pullRequests.length });
  return { ok: true, repository: `${owner}/${repo}`, state: safeState, pullRequests };
}

export async function githubListActionsTool(ownerInput: string, repoInput: string, limit = 20): Promise<JsonObject> {
  const owner = assertRepoPart(ownerInput, 'owner');
  const repo = assertRepoPart(repoInput, 'repo');
  const perPage = Math.min(Math.max(Number.isFinite(limit) ? Math.trunc(limit) : 20, 1), 100);
  const response = await githubRequest(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/actions/runs?per_page=${perPage}`);
  const data = asRecord(requireOk(response, 'github_list_actions_failed'));
  const runs = asArray(data.workflow_runs).map(workflowRunSummary);
  await auditGithubOperation('github_list_actions', 'ok', { repository: `${owner}/${repo}`, count: runs.length });
  return { ok: true, repository: `${owner}/${repo}`, workflowRuns: runs };
}

export async function githubAuditPermissionsTool(ownerInput: string, repoInput: string): Promise<JsonObject> {
  const owner = assertRepoPart(ownerInput, 'owner');
  const repo = assertRepoPart(repoInput, 'repo');
  const status = await getGithubConnectionStatus();
  const record = await getRepoRecord(owner, repo);
  const summary = repoSummary(record);
  const permissions = asRecord(summary.permissions);
  const defaultBranch = stringValue(record, 'default_branch', 'main');
  const branchProtection = await githubRequest(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/branches/${encodeURIComponent(defaultBranch)}/protection`);
  await auditGithubOperation('github_audit_permissions', 'ok', {
    repository: `${owner}/${repo}`,
    defaultBranch,
    canPush: permissions.push === true,
    canAdmin: permissions.admin === true,
    branchProtectionReadable: branchProtection.ok
  });
  return {
    ok: true,
    repository: `${owner}/${repo}`,
    status: {
      connected: status.connected,
      login: status.login,
      org: status.org,
      orgAccessible: status.orgAccessible,
      reposVisible: status.reposVisible,
      canWriteReposHint: status.canWriteReposHint,
      canAdminOrgHint: status.canAdminOrgHint
    },
    repo: summary,
    branchProtection: {
      defaultBranch,
      readable: branchProtection.ok,
      httpStatus: branchProtection.status,
      note: branchProtection.ok ? 'Protection branch lisible.' : 'Protection non lisible, absente ou droits insuffisants.'
    },
    policy: {
      directMainWritesAllowed: false,
      controlledBranchPattern: 'mcp/*',
      pullRequestRequired: true,
      productionActionAllowed: false
    }
  };
}

export async function githubCreateBranchTool(input: { owner: string; repo: string; branch: string; baseBranch?: string }): Promise<JsonObject> {
  const owner = assertRepoPart(input.owner, 'owner');
  const repo = assertRepoPart(input.repo, 'repo');
  const branch = assertMcpBranchName(input.branch);
  const baseBranch = input.baseBranch ? assertBaseBranchName(input.baseBranch) : stringValue(await getRepoRecord(owner, repo), 'default_branch', 'main');
  const baseSha = await getRefSha(owner, repo, baseBranch);
  const create = await githubRequest(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/refs`, {
    method: 'POST',
    body: {
      ref: `refs/heads/${branch}`,
      sha: baseSha
    }
  });
  const result = requireOk(create, 'github_create_branch_failed');
  await auditGithubOperation('github_create_branch', 'ok', { repository: `${owner}/${repo}`, branch, baseBranch });
  return { ok: true, repository: `${owner}/${repo}`, branch, baseBranch, result: asRecord(result) };
}

export async function githubCommitFilesOnBranchTool(input: { owner: string; repo: string; branch: string; message: string; files: GitHubCommitFile[] }): Promise<JsonObject> {
  const owner = assertRepoPart(input.owner, 'owner');
  const repo = assertRepoPart(input.repo, 'repo');
  const branch = assertMcpBranchName(input.branch);
  const message = input.message.trim();
  if (message.length < 8 || message.length > 240) {
    throw new GitHubToolError('invalid_commit_message', 'Message de commit invalide ou trop court.');
  }
  const files = assertSafeCommitFiles(input.files);
  const parentSha = await getRefSha(owner, repo, branch);
  const baseTreeSha = await getCommitTreeSha(owner, repo, parentSha);
  const treeEntries = [] as Array<{ path: string; mode: '100644'; type: 'blob'; sha: string }>;

  for (const file of files) {
    const blob = await githubRequest(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/blobs`, {
      method: 'POST',
      body: {
        content: file.content,
        encoding: 'utf-8'
      }
    });
    const blobRecord = asRecord(requireOk(blob, 'github_blob_create_failed'));
    const sha = stringValue(blobRecord, 'sha');
    if (!sha) {
      throw new GitHubToolError('github_blob_sha_missing', `Blob SHA introuvable pour ${file.path}`);
    }
    treeEntries.push({ path: file.path, mode: '100644', type: 'blob', sha });
  }

  const tree = await githubRequest(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/trees`, {
    method: 'POST',
    body: {
      base_tree: baseTreeSha,
      tree: treeEntries
    }
  });
  const treeRecord = asRecord(requireOk(tree, 'github_tree_create_failed'));
  const treeSha = stringValue(treeRecord, 'sha');
  if (!treeSha) {
    throw new GitHubToolError('github_new_tree_sha_missing', 'SHA du nouveau tree introuvable.');
  }

  const commit = await githubRequest(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/commits`, {
    method: 'POST',
    body: {
      message,
      tree: treeSha,
      parents: [parentSha]
    }
  });
  const commitRecord = asRecord(requireOk(commit, 'github_commit_create_failed'));
  const commitSha = stringValue(commitRecord, 'sha');
  if (!commitSha) {
    throw new GitHubToolError('github_commit_sha_missing', 'SHA du nouveau commit introuvable.');
  }

  await requireOk(await githubRequest(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/refs/heads/${encodeURIComponent(branch)}`, {
    method: 'PATCH',
    body: {
      sha: commitSha,
      force: false
    }
  }), 'github_ref_update_failed');

  await auditGithubOperation('github_commit_files_on_branch', 'ok', {
    repository: `${owner}/${repo}`,
    branch,
    filePaths: files.map((file) => file.path),
    fileCount: files.length,
    commitSha
  });
  return { ok: true, repository: `${owner}/${repo}`, branch, commitSha, filePaths: files.map((file) => file.path) };
}

export async function githubOpenPrTool(input: { owner: string; repo: string; headBranch: string; baseBranch: string; title: string; body?: string; draft?: boolean }): Promise<JsonObject> {
  const owner = assertRepoPart(input.owner, 'owner');
  const repo = assertRepoPart(input.repo, 'repo');
  const headBranch = assertMcpBranchName(input.headBranch);
  const baseBranch = assertBaseBranchName(input.baseBranch);
  const title = input.title.trim();
  if (title.length < 8 || title.length > 180) {
    throw new GitHubToolError('invalid_pr_title', 'Titre de pull request invalide ou trop court.');
  }
  const response = await githubRequest(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls`, {
    method: 'POST',
    body: {
      title,
      body: input.body ?? '',
      head: headBranch,
      base: baseBranch,
      draft: input.draft ?? true,
      maintainer_can_modify: true
    }
  });
  const pr = asRecord(requireOk(response, 'github_open_pr_failed'));
  await auditGithubOperation('github_open_pr', 'ok', {
    repository: `${owner}/${repo}`,
    headBranch,
    baseBranch,
    number: numberValue(pr, 'number'),
    url: stringValue(pr, 'html_url')
  });
  return { ok: true, repository: `${owner}/${repo}`, pullRequest: prSummary(pr) };
}
