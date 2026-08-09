const CANONICAL_ROOT_DOCUMENTS = new Set([
  'SUIVI.md',
  'TASKS.md',
  'TODO.md',
  'DECISIONS_LOG.md',
  'CHANGELOG.md',
  'DEPLOYMENT_PRODUCTION.md',
  'MCP_ANTI_DISPERSION_GOVERNANCE.md'
]);

const CANONICAL_KEYS = [
  'repository',
  'branch',
  's1Root',
  'fetchRemote',
  'pushRemote',
  'container'
];

export function classifyMarkdownPath(path) {
  if (typeof path !== 'string' || !path.endsWith('.md') || path.startsWith('/') || path.includes('..')) {
    return null;
  }

  if (CANONICAL_ROOT_DOCUMENTS.has(path)) return 'canonical';
  if (path.startsWith('docs/history/')) return 'history';
  if (path.startsWith('docs/superpowers/plans/')) return 'engineering-plan';
  if (path.startsWith('docs/superpowers/specs/')) return 'engineering-spec';
  if (path.startsWith('Migration/')) return 'migration-history';
  if (path.startsWith('docs/')) return 'documentation';
  if (!path.includes('/')) return 'root-documentation';
  return null;
}

export function compareMarkdownInventory(expectedPaths, actualPaths) {
  const expected = [...new Set(expectedPaths)].sort();
  const actual = [...new Set(actualPaths)].sort();
  const expectedSet = new Set(expected);
  const actualSet = new Set(actual);

  const missing = expected.filter((path) => !actualSet.has(path));
  const added = actual.filter((path) => !expectedSet.has(path));
  const unclassified = actual.filter((path) => classifyMarkdownPath(path) === null);

  return {
    ok: missing.length === 0 && added.length === 0 && unclassified.length === 0,
    missing,
    added,
    unclassified
  };
}

export function extractCanonicalState(markdown) {
  if (typeof markdown !== 'string') return null;
  const match = markdown.match(/```canonical-state\s*\n([\s\S]*?)\n```/);
  if (!match) return null;
  if (match[1].length > 8192) throw new Error('canonical_state_too_large');

  const parsed = JSON.parse(match[1]);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('canonical_state_must_be_object');
  }

  return parsed;
}

export function validateCanonicalStates(documents) {
  const conflicts = [];
  const reference = documents.find((document) => document?.state)?.state ?? null;

  if (!reference) {
    return { ok: false, conflicts: [{ path: '<all>', key: '$state', expected: 'present', actual: 'missing' }] };
  }

  for (const document of documents) {
    if (!document?.state) {
      conflicts.push({ path: document?.path ?? '<unknown>', key: '$state', expected: 'present', actual: 'missing' });
      continue;
    }

    for (const key of CANONICAL_KEYS) {
      const expected = reference[key] ?? null;
      const actual = document.state[key] ?? null;
      if (actual !== expected) {
        conflicts.push({ path: document.path, key, expected, actual });
      }
    }
  }

  return { ok: conflicts.length === 0, conflicts };
}

export const canonicalStateKeys = Object.freeze([...CANONICAL_KEYS]);
export const canonicalRootDocuments = Object.freeze([...CANONICAL_ROOT_DOCUMENTS]);
