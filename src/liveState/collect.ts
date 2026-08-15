import { readFile } from 'node:fs/promises';

import type {
  DocumentationLiveObservation,
  GithubLiveObservation,
  LiveStateObservations,
  RuntimeLiveObservation,
  S1LiveObservation
} from './types.js';

const REPOSITORY = 'Patricked-code/MCP';
const BRANCH = 'main';
const MCP_ROOT = '/opt/apps/wealthtech-mcp-ssh-bridge';
const MCP_CONTAINER = 'wealthtech_mcp_ssh_bridge';
const TOKEN_FILE = '/app/secrets/github_token';
const DEFAULT_GITHUB_API_BASE = 'https://api.github.com';
const DEFAULT_GITHUB_ALLOWED_HOSTS = 'api.github.com';
const DEFAULT_GITHUB_TIMEOUT_MS = 15_000;
const SHA_PATTERN = /^[0-9a-f]{40}$/i;

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'"'"'`)}'`;
}

export function parseKeyValueOutput(output: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const line of output.split(/\r?\n/)) {
    const index = line.indexOf('=');
    if (index <= 0) continue;
    const key = line.slice(0, index).trim();
    if (!/^[a-zA-Z0-9_.-]+$/.test(key)) continue;
    result[key] = line.slice(index + 1).trim();
  }
  return result;
}

function booleanValue(value: string | undefined): boolean | null {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return null;
}

function shaOrNull(value: string | undefined): string | null {
  return value && SHA_PATTERN.test(value) ? value.toLowerCase() : null;
}

export function resolveLiveStateGithubApiBase(
  configuredBase: string,
  allowedHostsValue: string
): string {
  const parsed = new URL(configuredBase);
  const allowedHosts = new Set(
    allowedHostsValue
      .split(',')
      .map((host) => host.trim().toLowerCase())
      .filter(Boolean)
  );

  if (parsed.protocol !== 'https:') {
    throw new Error('GitHub API base doit utiliser HTTPS.');
  }
  if (parsed.username || parsed.password) {
    throw new Error('GitHub API base ne doit contenir aucun identifiant.');
  }
  if (parsed.search || parsed.hash) {
    throw new Error('GitHub API base ne doit contenir ni query string ni fragment.');
  }
  if (!allowedHosts.has(parsed.hostname.toLowerCase())) {
    throw new Error('Hôte GitHub API non autorisé.');
  }

  return parsed.toString().replace(/\/$/, '');
}

function githubRequestTimeoutMs(): number {
  const parsed = Number.parseInt(process.env.GITHUB_REQUEST_TIMEOUT_MS || '', 10);
  if (!Number.isFinite(parsed) || parsed < 1_000 || parsed > 30_000) {
    return DEFAULT_GITHUB_TIMEOUT_MS;
  }
  return parsed;
}

export function buildS1LiveStateCommand(): string {
  return `set -euo pipefail
cd ${shellQuote(MCP_ROOT)}
printf 'branch=%s\\n' "$(git branch --show-current)"
printf 'head=%s\\n' "$(git rev-parse HEAD)"
printf 'origin_main=%s\\n' "$(git rev-parse origin/main 2>/dev/null || true)"
if [ -z "$(git status --porcelain --untracked-files=all)" ]; then printf 'working_tree_clean=true\\n'; else printf 'working_tree_clean=false\\n'; fi
if git diff --quiet && git diff --cached --quiet; then printf 'diff_empty=true\\n'; else printf 'diff_empty=false\\n'; fi
printf 'fetch_remote=%s\\n' "$(git remote get-url origin 2>/dev/null || true)"
printf 'push_remote=%s\\n' "$(git remote get-url --push origin 2>/dev/null || true)"`;
}

export function parseS1Observation(output: string): S1LiveObservation {
  const values = parseKeyValueOutput(output);
  return {
    status: 'CURRENT',
    path: MCP_ROOT,
    branch: values.branch || null,
    head: shaOrNull(values.head),
    originMain: shaOrNull(values.origin_main),
    workingTreeClean: booleanValue(values.working_tree_clean),
    diffEmpty: booleanValue(values.diff_empty),
    fetchRemote: values.fetch_remote || null,
    pushRemote: values.push_remote || null
  };
}

export function parseRuntimeObservation(output: string): RuntimeLiveObservation {
  const values = parseKeyValueOutput(output);
  const containerName = (values.container_name || MCP_CONTAINER).replace(/^\//, '');
  const revision = shaOrNull(values['container_label.org.opencontainers.image.revision'])
    ?? shaOrNull(values['image_label.org.opencontainers.image.revision']);

  return {
    status: 'CURRENT',
    container: containerName,
    containerStatus: values.container_status || null,
    health: values.container_health || null,
    imageId: values.container_image_id || values.image_id || null,
    revision
  };
}

export function buildDocumentationLiveStateCommand(): string {
  return `set -euo pipefail
cd ${shellQuote(MCP_ROOT)}
ACTIVE_TASK="$(grep -E 'TASK-[0-9]{8}-[0-9]+.*EN COURS' TASKS.md 2>/dev/null | head -1 | sed 's/^[[:space:]-]*//' || true)"
printf 'active_task=%s\\n' "$ACTIVE_TASK"
DECLARED_GITHUB_SHA="$(grep -Eo '[0-9a-f]{40}' SUIVI.md 2>/dev/null | head -1 || true)"
if [ -z "$DECLARED_GITHUB_SHA" ]; then DECLARED_GITHUB_SHA="$(grep -E '"githubCommitFull"' PRODUCTION_STATE.json 2>/dev/null | grep -Eo '[0-9a-f]{40}' | head -1 || true)"; fi
printf 'declared_github_sha=%s\\n' "$DECLARED_GITHUB_SHA"
DECLARED_S1_SHA="$(grep -E 'S1 HEAD|serverCommitFull' SUIVI.md PRODUCTION_STATE.json 2>/dev/null | grep -Eo '[0-9a-f]{40}' | head -1 || true)"
printf 'declared_s1_sha=%s\\n' "$DECLARED_S1_SHA"
DOCUMENTATION_DESCENDANT_SCOPE='unknown'
if [ -n "$DECLARED_GITHUB_SHA" ] && [ "$DECLARED_GITHUB_SHA" = "$(git rev-parse HEAD)" ]; then
  DOCUMENTATION_DESCENDANT_SCOPE='exact'
elif [ -n "$DECLARED_GITHUB_SHA" ] && git merge-base --is-ancestor "$DECLARED_GITHUB_SHA" HEAD 2>/dev/null; then
  NON_DOCUMENTATION_PATH="$(git diff --name-only "$DECLARED_GITHUB_SHA" HEAD | grep -Ev '.*\\.md$|^PRODUCTION_STATE\\.json$|^docs/governance/markdown-inventory\\.json$' | head -1 || true)"
  if [ -z "$NON_DOCUMENTATION_PATH" ]; then
    DOCUMENTATION_DESCENDANT_SCOPE='docs_only'
  else
    DOCUMENTATION_DESCENDANT_SCOPE='contains_runtime_changes'
  fi
fi
printf 'documentation_descendant_scope=%s\\n' "$DOCUMENTATION_DESCENDANT_SCOPE"
if grep -q '"serverStateFreshness": "requires_revalidation"' PRODUCTION_STATE.json 2>/dev/null || grep -q '"runtimeStateFreshness": "requires_revalidation"' PRODUCTION_STATE.json 2>/dev/null; then
  printf 'documentation_requires_revalidation=true\\n'
else
  printf 'documentation_requires_revalidation=false\\n'
fi`;
}

export function parseDocumentationObservation(
  output: string,
  observedGithubSha: string | null,
  observedS1Sha: string | null
): DocumentationLiveObservation {
  const values = parseKeyValueOutput(output);
  const declaredGithubSha = shaOrNull(values.declared_github_sha);
  const declaredS1Sha = shaOrNull(values.declared_s1_sha);
  const activeMatch = values.active_task?.match(/TASK-[0-9]{8}-[0-9]+/);
  const explicitGithubMismatch = Boolean(
    declaredGithubSha
    && observedGithubSha
    && declaredGithubSha !== observedGithubSha
    && values.documentation_descendant_scope !== 'docs_only'
  );
  const explicitS1Mismatch = Boolean(
    declaredS1Sha
    && observedS1Sha
    && declaredS1Sha !== observedS1Sha
    && !(
      values.documentation_descendant_scope === 'docs_only'
      && declaredS1Sha === declaredGithubSha
    )
  );
  const drift = values.documentation_requires_revalidation === 'true'
    || explicitGithubMismatch
    || explicitS1Mismatch;

  return {
    status: 'CURRENT',
    activeTask: activeMatch?.[0] || null,
    declaredGithubSha,
    declaredS1Sha,
    drift
  };
}

async function readGithubToken(): Promise<string | null> {
  const file = process.env.GITHUB_TOKEN_FILE || TOKEN_FILE;
  try {
    return (await readFile(file, 'utf8')).trim() || null;
  } catch {
    return null;
  }
}

export async function collectGithubObservation(): Promise<GithubLiveObservation> {
  let base: string;
  try {
    base = resolveLiveStateGithubApiBase(
      process.env.GITHUB_API_BASE || DEFAULT_GITHUB_API_BASE,
      process.env.GITHUB_API_ALLOWED_HOSTS || DEFAULT_GITHUB_ALLOWED_HOSTS
    );
  } catch {
    return { status: 'UNAVAILABLE', branch: BRANCH, head: null, error: 'github_api_base_not_allowed' };
  }

  const token = await readGithubToken();
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'wealthtech-mcp-live-state'
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), githubRequestTimeoutMs());

  try {
    const response = await fetch(`${base}/repos/${REPOSITORY}/commits/${encodeURIComponent(BRANCH)}`, {
      method: 'GET',
      redirect: 'error',
      signal: controller.signal,
      headers
    });
    if (!response.ok) {
      return { status: 'UNAVAILABLE', branch: BRANCH, head: null, error: `github_http_${response.status}` };
    }
    const body = await response.json() as { sha?: unknown };
    const head = typeof body.sha === 'string' ? shaOrNull(body.sha) : null;
    return head
      ? { status: 'CURRENT', branch: BRANCH, head }
      : { status: 'UNAVAILABLE', branch: BRANCH, head: null, error: 'github_sha_missing' };
  } catch {
    return { status: 'UNAVAILABLE', branch: BRANCH, head: null, error: 'github_unavailable' };
  } finally {
    clearTimeout(timeout);
  }
}

async function runS1ReadOnly(command: string) {
  const { runReadOnlyCommand } = await import('../ssh/client.js');
  return runReadOnlyCommand('s1', command);
}

export async function collectS1Observation(): Promise<S1LiveObservation> {
  try {
    const result = await runS1ReadOnly(buildS1LiveStateCommand());
    if (result.code !== 0) {
      return {
        status: 'UNAVAILABLE', path: MCP_ROOT, branch: null, head: null, originMain: null,
        workingTreeClean: null, diffEmpty: null, fetchRemote: null, pushRemote: null,
        error: `s1_exit_${result.code}`
      };
    }
    return parseS1Observation(result.stdout);
  } catch {
    return {
      status: 'UNAVAILABLE', path: MCP_ROOT, branch: null, head: null, originMain: null,
      workingTreeClean: null, diffEmpty: null, fetchRemote: null, pushRemote: null,
      error: 's1_unavailable'
    };
  }
}

export async function collectRuntimeObservation(): Promise<RuntimeLiveObservation> {
  try {
    const { buildMcpRuntimeImageAttestationCommand } = await import('../tools/runtimeAttestation.js');
    const result = await runS1ReadOnly(buildMcpRuntimeImageAttestationCommand());
    if (result.code !== 0) {
      return {
        status: 'UNAVAILABLE', container: MCP_CONTAINER, containerStatus: null,
        health: null, imageId: null, revision: null, error: `runtime_exit_${result.code}`
      };
    }
    return parseRuntimeObservation(result.stdout);
  } catch {
    return {
      status: 'UNAVAILABLE', container: MCP_CONTAINER, containerStatus: null,
      health: null, imageId: null, revision: null,
      error: 'runtime_unavailable'
    };
  }
}

export async function collectDocumentationObservation(
  observedGithubSha: string | null,
  observedS1Sha: string | null
): Promise<DocumentationLiveObservation> {
  try {
    const result = await runS1ReadOnly(buildDocumentationLiveStateCommand());
    if (result.code !== 0) {
      return {
        status: 'UNAVAILABLE', activeTask: null, declaredGithubSha: null,
        declaredS1Sha: null, drift: false, error: `documentation_exit_${result.code}`
      };
    }
    return parseDocumentationObservation(result.stdout, observedGithubSha, observedS1Sha);
  } catch {
    return {
      status: 'UNAVAILABLE', activeTask: null, declaredGithubSha: null,
      declaredS1Sha: null, drift: false, error: 'documentation_unavailable'
    };
  }
}

export async function collectLiveStateObservations(): Promise<LiveStateObservations> {
  const [github, s1, runtime] = await Promise.all([
    collectGithubObservation(),
    collectS1Observation(),
    collectRuntimeObservation()
  ]);
  const documentation = await collectDocumentationObservation(github.head, s1.head);
  return { repository: REPOSITORY, github, s1, runtime, documentation };
}
