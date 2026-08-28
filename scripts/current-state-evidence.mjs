#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { realpathSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const MAX_TRACKED_FILES = 5_000;
const MAX_FILE_BYTES = 1_000_000;
const MAX_TOTAL_BYTES = 25_000_000;
const MAX_OUTPUT_BYTES = 1_000_000;
const REQUIRED_GOVERNANCE_FILES = [
  '.mcp/agents.json',
  '.mcp/autodeploy-policy.json',
  '.mcp/branch-governance.json',
  '.mcp/function-cartography.json',
  '.mcp/identity-policy.json',
  '.mcp/manifest.json',
  '.mcp/onboarding.json',
  '.mcp/permissions.json',
  '.mcp/server-map.json',
  '.mcp/task-registry.json'
];
const SENSITIVE_PATH = /(^|\/)(?:\.env(?:\.|$)|secrets?|credentials?)(?:\/|$)/iu;

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value)
      .filter(([, entry]) => entry !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => [key, canonical(entry)]));
  }
  return value;
}

function digest(value) {
  return createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
}

function isInside(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}

export function collectCurrentStateEvidence({ repositoryRoot = process.cwd() } = {}) {
  const root = realpathSync(path.resolve(repositoryRoot));
  const contradictions = [];
  const contradictionKeys = new Set();
  const contents = new Map();
  let totalBytes = 0;

  function contradiction(code, relativePath) {
    const key = `${code}:${relativePath ?? ''}`;
    if (contradictionKeys.has(key)) return;
    contradictionKeys.add(key);
    contradictions.push({ code, ...(relativePath ? { path: relativePath } : {}) });
  }

  function git(args) {
    return execFileSync('git', ['-C', root, ...args], {
      encoding: 'utf8',
      maxBuffer: 8 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'pipe']
    }).trim();
  }

  function gitRaw(args, maxBuffer = 8 * 1024 * 1024) {
    return execFileSync('git', ['-C', root, ...args], {
      encoding: 'utf8',
      maxBuffer,
      stdio: ['ignore', 'pipe', 'pipe']
    });
  }

  const evidenceHead = git(['rev-parse', 'HEAD']);
  if (!/^[0-9a-f]{40}$/u.test(evidenceHead)) throw new Error('CURRENT_STATE_EVIDENCE_HEAD_INVALID');
  const generatedAt = git(['show', '-s', '--format=%cI', 'HEAD']);
  const treeEntries = new Map();
  for (const rawEntry of gitRaw(['ls-tree', '-r', '-z', '--long', evidenceHead]).split('\0').filter(Boolean)) {
    const separator = rawEntry.indexOf('\t');
    if (separator < 0) throw new Error('CURRENT_STATE_EVIDENCE_TREE_INVALID');
    const [mode, type, objectId, sizeValue] = rawEntry.slice(0, separator).trim().split(/\s+/u);
    const relativePath = rawEntry.slice(separator + 1);
    if (
      !/^[0-9]{6}$/u.test(mode ?? '')
      || !/^[0-9a-f]{40}$/u.test(objectId ?? '')
      || !relativePath
    ) throw new Error('CURRENT_STATE_EVIDENCE_TREE_INVALID');
    treeEntries.set(relativePath, {
      mode,
      type,
      objectId,
      size: sizeValue === '-' ? null : Number(sizeValue)
    });
  }
  const tracked = [...treeEntries.keys()].sort();
  if (tracked.length > MAX_TRACKED_FILES) throw new Error('CURRENT_STATE_EVIDENCE_FILE_LIMIT');
  const trackedSet = new Set(tracked);

  for (const relativePath of tracked) {
    if (SENSITIVE_PATH.test(relativePath)) contradiction('SENSITIVE_TRACKED_PATH', relativePath);
  }

  function safeTrackedFile(relativePath) {
    if (!trackedSet.has(relativePath)) return null;
    if (contents.has(relativePath)) return contents.get(relativePath);
    if (SENSITIVE_PATH.test(relativePath)) return null;
    const absolutePath = path.resolve(root, relativePath);
    if (!isInside(root, absolutePath)) {
      contradiction('TRACKED_PATH_ESCAPES_ROOT', relativePath);
      return null;
    }
    const entry = treeEntries.get(relativePath);
    if (!entry) return null;
    if (entry.mode === '120000') {
      const target = gitRaw(['cat-file', 'blob', entry.objectId], MAX_FILE_BYTES);
      const resolvedTarget = path.resolve(path.dirname(absolutePath), target);
      contradiction(!isInside(root, resolvedTarget)
        ? 'TRACKED_SYMLINK_OUTSIDE_ROOT'
        : 'TRACKED_SYMLINK_REFUSED', relativePath);
      return null;
    }
    if (entry.type !== 'blob' || !['100644', '100755'].includes(entry.mode)) {
      contradiction('TRACKED_PATH_NOT_FILE', relativePath);
      return null;
    }
    if (entry.size === null || !Number.isSafeInteger(entry.size)) {
      contradiction('TRACKED_PATH_UNREADABLE', relativePath);
      return null;
    }
    if (entry.size > MAX_FILE_BYTES) {
      contradiction('TRACKED_FILE_TOO_LARGE', relativePath);
      return null;
    }
    totalBytes += entry.size;
    if (totalBytes > MAX_TOTAL_BYTES) throw new Error('CURRENT_STATE_EVIDENCE_INPUT_TOO_LARGE');
    const content = gitRaw(['cat-file', 'blob', entry.objectId], MAX_FILE_BYTES + 1_024);
    contents.set(relativePath, content);
    return content;
  }

  function resolveImport(from, request) {
    const raw = path.posix.normalize(path.posix.join(path.posix.dirname(from), request));
    const candidates = [
      raw,
      raw.replace(/\.js$/u, '.ts'),
      raw.replace(/\.js$/u, '.tsx'),
      `${raw}.ts`,
      `${raw}.tsx`,
      `${raw}/index.ts`,
      `${raw}/index.tsx`
    ];
    return candidates.find((candidate) => trackedSet.has(candidate)) ?? null;
  }

  const modules = tracked
    .filter((file) => /^src\/.*\.tsx?$/u.test(file))
    .filter((file) => safeTrackedFile(file) !== null);
  const imports = [];
  const routes = [];
  for (const module of modules) {
    const content = safeTrackedFile(module);
    if (content === null) continue;
    const importPattern = /(?:import|export)\s+(?:[\s\S]*?\s+from\s+)?['"](\.[^'"]+)['"]/gu;
    for (const match of content.matchAll(importPattern)) {
      const target = resolveImport(module, match[1]);
      if (target) imports.push({ from: module, to: target });
    }
    const routePattern = /\b(?:app|router)\.(get|post|put|patch|delete|options|head|use)\(\s*['"]([^'"]+)['"]/giu;
    for (const match of content.matchAll(routePattern)) {
      routes.push({ method: match[1].toUpperCase(), path: match[2], source: module });
    }
  }
  imports.sort((left, right) => left.from.localeCompare(right.from) || left.to.localeCompare(right.to));
  routes.sort((left, right) => left.path.localeCompare(right.path)
    || left.method.localeCompare(right.method)
    || left.source.localeCompare(right.source));

  const markdown = tracked.filter((file) => file.toLowerCase().endsWith('.md'));
  const audits = markdown.filter((file) => file.startsWith('docs/audits/'));
  const history = markdown.filter((file) => file.startsWith('docs/history/'));
  const documentation = {
    markdown,
    categories: {
      root: markdown.filter((file) => !file.includes('/')).length,
      audits: audits.length,
      history: history.length,
      governance: markdown.filter((file) => file.startsWith('docs/governance/')).length,
      memory: markdown.filter((file) => file.startsWith('memory/') || file.startsWith('wealthtech_project_memory/')).length,
      other: markdown.filter((file) => file.includes('/')
        && !file.startsWith('docs/audits/')
        && !file.startsWith('docs/history/')
        && !file.startsWith('docs/governance/')
        && !file.startsWith('memory/')
        && !file.startsWith('wealthtech_project_memory/')).length
    }
  };
  documentation.digest = digest(markdown.map((file) => ({ path: file, content: safeTrackedFile(file) })));

  const governanceFiles = REQUIRED_GOVERNANCE_FILES.map((file) => {
    const content = safeTrackedFile(file);
    if (content === null) {
      contradiction('REQUIRED_GOVERNANCE_FILE_MISSING', file);
      return { path: file, status: 'MISSING', digest: null };
    }
    return { path: file, status: 'PRESENT', digest: digest(content) };
  });

  let taskRegistry = null;
  const taskRegistryContent = safeTrackedFile('.mcp/task-registry.json');
  if (taskRegistryContent !== null) {
    try {
      const parsed = JSON.parse(taskRegistryContent);
      taskRegistry = {
        registryVersion: Number.isInteger(parsed.registryVersion) ? parsed.registryVersion : null,
        taskCount: Array.isArray(parsed.tasks) ? parsed.tasks.length : null,
        digest: digest(parsed)
      };
      if (taskRegistry.registryVersion === null || taskRegistry.taskCount === null) {
        contradiction('TASK_REGISTRY_SCHEMA_INVALID', '.mcp/task-registry.json');
      }
    } catch {
      contradiction('TASK_REGISTRY_INVALID_JSON', '.mcp/task-registry.json');
    }
  }

  const branchGovernanceContent = safeTrackedFile('.mcp/branch-governance.json');
  if (branchGovernanceContent !== null) {
    try {
      const parsed = JSON.parse(branchGovernanceContent);
      for (const field of [
        'currentBranchForThisWork',
        'activeGovernedPullRequest',
        'lastCompletedGovernedPullRequest',
        'nextGovernedBranch'
      ]) {
        if (parsed[field] !== null && parsed[field] !== undefined) {
          contradiction('STATIC_GOVERNANCE_DYNAMIC_VALUE', `.mcp/branch-governance.json#${field}`);
        }
      }
    } catch {
      contradiction('BRANCH_GOVERNANCE_INVALID_JSON', '.mcp/branch-governance.json');
    }
  }

  const governance = { files: governanceFiles, taskRegistry };
  governance.digest = digest(governance);
  const architecture = { modules, imports, routes };
  architecture.digest = digest(architecture);
  const testFiles = tracked.filter((file) => /^tests\/.*\.(?:test|spec)\.tsx?$/u.test(file));
  const testSuiteDigest = digest(testFiles.map((file) => ({
    path: file,
    digest: digest(safeTrackedFile(file) ?? '')
  })));

  const stableProof = {
    schemaVersion: 1,
    evidenceHead,
    generatedAt,
    architecture,
    documentation,
    audits,
    history,
    governance,
    testSuiteDigest,
    contradictions: contradictions.sort((left, right) => (
      left.code.localeCompare(right.code) || (left.path ?? '').localeCompare(right.path ?? '')
    ))
  };
  const evidence = { ...stableProof, sourceDigest: digest(stableProof) };
  if (Buffer.byteLength(JSON.stringify(evidence)) > MAX_OUTPUT_BYTES) {
    throw new Error('CURRENT_STATE_EVIDENCE_OUTPUT_TOO_LARGE');
  }
  return evidence;
}

function argument(name, fallback) {
  const index = process.argv.indexOf(name);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

const isCli = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  try {
    process.stdout.write(`${JSON.stringify(collectCurrentStateEvidence({
      repositoryRoot: argument('--root', process.cwd())
    }))}\n`);
  } catch (error) {
    const code = error instanceof Error && /^[A-Z0-9_]+$/u.test(error.message)
      ? error.message
      : 'CURRENT_STATE_EVIDENCE_FAILED';
    process.stderr.write(`${code}\n`);
    process.exitCode = 1;
  }
}
