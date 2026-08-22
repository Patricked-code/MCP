import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { lstat, readFile, realpath } from 'node:fs/promises';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const MAX_TRACKED_FILES = 5_000;
const MAX_FILE_BYTES = 2_000_000;
const MAX_TOTAL_BYTES = 25_000_000;
const MAX_OUTPUT_BYTES = 1_000_000;
const EXPECTED_GOVERNANCE_FILES = [
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
const SENSITIVE_PATH = /(^|\/)(?:\.env(?:\.|$)|secrets?|credentials?)(?:\/|$)/i;

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, canonicalize(entry)])
    );
  }
  return value;
}

function digest(value) {
  return createHash('sha256')
    .update(JSON.stringify(canonicalize(value)))
    .digest('hex');
}

function normalizeRepositoryPath(path) {
  return path.replaceAll('\\', '/').replace(/^\.\//, '');
}

function isInside(root, candidate) {
  const scope = relative(root, candidate);
  return scope === '' || (!scope.startsWith(`..${sep}`) && scope !== '..' && !isAbsolute(scope));
}

async function git(root, args) {
  const { stdout } = await execFileAsync('git', ['-C', root, ...args], {
    encoding: 'utf8',
    maxBuffer: 2_000_000
  });
  return stdout.trim();
}

function parseImports(source) {
  const imports = new Set();
  const pattern = /(?:from\s*|import\s*\(|require\s*\()\s*['"](\.[^'"]+)['"]/g;
  for (const match of source.matchAll(pattern)) {
    if (match[1]) imports.add(match[1]);
  }
  return [...imports].sort();
}

function parseRoutes(path, source) {
  const routes = [];
  const pattern = /\b(?:app|router)\.(get|post|put|patch|delete)\(\s*['"]([^'"]+)['"]/gi;
  for (const match of source.matchAll(pattern)) {
    if (!match[1] || !match[2]) continue;
    routes.push({ file: path, method: match[1].toUpperCase(), path: match[2] });
  }
  return routes;
}

async function readTrackedFiles(root, paths, contradictions) {
  const contents = new Map();
  const sourceRecords = [];
  let totalBytes = 0;

  for (const path of paths) {
    if (SENSITIVE_PATH.test(path)) {
      contradictions.push(`sensitive_tracked_path:${path}`);
      sourceRecords.push({ path, redacted: true });
      continue;
    }
    const candidate = resolve(root, path);
    if (!isInside(root, candidate)) {
      contradictions.push(`tracked_path_outside_repository:${path}`);
      continue;
    }
    const metadata = await lstat(candidate);
    if (metadata.isSymbolicLink()) {
      const target = await realpath(candidate).catch(() => null);
      contradictions.push(target && !isInside(root, target)
        ? `tracked_symlink_outside_repository:${path}`
        : `tracked_symlink_refused:${path}`);
      continue;
    }
    if (!metadata.isFile()) continue;
    if (metadata.size > MAX_FILE_BYTES) {
      contradictions.push(`tracked_file_too_large:${path}`);
      continue;
    }
    totalBytes += metadata.size;
    if (totalBytes > MAX_TOTAL_BYTES) throw new Error('CURRENT_STATE_EVIDENCE_INPUT_TOO_LARGE');
    const content = await readFile(candidate);
    contents.set(path, content.toString('utf8'));
    sourceRecords.push({
      path,
      sha256: createHash('sha256').update(content).digest('hex')
    });
  }
  return { contents, sourceRecords };
}

function parseTaskRegistry(content, contradictions) {
  if (content === undefined) {
    return { path: '.mcp/task-registry.json', present: false, registryVersion: null, digest: null };
  }
  try {
    const parsed = JSON.parse(content);
    const registryVersion = Number.isInteger(parsed?.registryVersion)
      ? parsed.registryVersion
      : null;
    if (registryVersion === null) contradictions.push('task_registry_version_invalid');
    return {
      path: '.mcp/task-registry.json',
      present: true,
      registryVersion,
      digest: digest(parsed)
    };
  } catch {
    contradictions.push('task_registry_json_invalid');
    return { path: '.mcp/task-registry.json', present: true, registryVersion: null, digest: null };
  }
}

export async function collectCurrentStateEvidence({ repositoryRoot = process.cwd() } = {}) {
  const root = await realpath(resolve(repositoryRoot));
  const repositoryHead = await git(root, ['rev-parse', 'HEAD']);
  if (!/^[0-9a-f]{40}$/.test(repositoryHead)) throw new Error('CURRENT_STATE_EVIDENCE_HEAD_INVALID');
  const rawPaths = await git(root, ['ls-files', '-z']);
  const paths = rawPaths
    .split('\0')
    .map(normalizeRepositoryPath)
    .filter(Boolean)
    .sort();
  if (paths.length > MAX_TRACKED_FILES) throw new Error('CURRENT_STATE_EVIDENCE_FILE_LIMIT');

  const contradictions = [];
  const { contents, sourceRecords } = await readTrackedFiles(root, paths, contradictions);
  const modules = paths
    .filter((path) => /^src\/.*\.ts$/.test(path) && contents.has(path))
    .map((path) => ({ path, imports: parseImports(contents.get(path)) }));
  const routes = modules
    .flatMap(({ path }) => parseRoutes(path, contents.get(path)))
    .sort((left, right) => (
      left.file.localeCompare(right.file)
      || left.method.localeCompare(right.method)
      || left.path.localeCompare(right.path)
    ));
  const architectureCore = { modules, routes };
  const documentationFiles = paths.filter((path) => path.endsWith('.md'));
  const audits = documentationFiles.filter((path) => (
    path.startsWith('docs/audits/') || path.startsWith('docs/history/')
  ));
  const governanceFiles = EXPECTED_GOVERNANCE_FILES.map((path) => {
    const content = contents.get(path);
    if (content === undefined) contradictions.push(`missing_governance_file:${path}`);
    return {
      path,
      present: content !== undefined,
      digest: content === undefined ? null : digest(content)
    };
  });
  const tests = paths.filter((path) => /^tests\/.*\.test\.ts$/.test(path));
  const taskRegistry = parseTaskRegistry(contents.get('.mcp/task-registry.json'), contradictions);
  const evidence = {
    schemaVersion: 1,
    repositoryHead,
    architecture: {
      ...architectureCore,
      digest: digest(architectureCore)
    },
    documentation: {
      files: documentationFiles,
      digest: digest(documentationFiles.map((path) => ({ path, content: contents.get(path) ?? null })))
    },
    audits,
    governance: {
      files: governanceFiles,
      digest: digest(governanceFiles)
    },
    taskRegistry,
    testSuiteDigest: digest(tests.map((path) => ({ path, content: contents.get(path) ?? null }))),
    sourceDigest: digest(sourceRecords),
    contradictions: [...new Set(contradictions)].sort()
  };
  if (Buffer.byteLength(JSON.stringify(evidence)) > MAX_OUTPUT_BYTES) {
    throw new Error('CURRENT_STATE_EVIDENCE_OUTPUT_TOO_LARGE');
  }
  return evidence;
}

function cliRoot(arguments_) {
  const index = arguments_.indexOf('--root');
  if (index === -1) return process.cwd();
  const value = arguments_[index + 1];
  if (!value || value.startsWith('--')) throw new Error('CURRENT_STATE_EVIDENCE_ROOT_REQUIRED');
  return value;
}

const isCli = process.argv[1]
  && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isCli) {
  try {
    const evidence = await collectCurrentStateEvidence({ repositoryRoot: cliRoot(process.argv.slice(2)) });
    process.stdout.write(`${JSON.stringify(evidence)}\n`);
  } catch (error) {
    const code = error instanceof Error && /^[A-Z0-9_]+$/.test(error.message)
      ? error.message
      : 'CURRENT_STATE_EVIDENCE_FAILED';
    process.stderr.write(`${code}\n`);
    process.exitCode = 1;
  }
}
