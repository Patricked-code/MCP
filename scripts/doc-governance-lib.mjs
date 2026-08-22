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
  if (path.startsWith('memory/')) return 'memory';
  if (path.startsWith('wealthtech_project_memory/')) return 'runtime-mirror-tracked';
  if (path.startsWith('tests/fixtures/current-state-evidence-repo/')) return 'documentation';
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

export function validateMarkdownBaseline(expectedEntries, actualPaths) {
  const entries = Array.isArray(expectedEntries) ? expectedEntries : [];
  const expectedPaths = entries
    .map((entry) => entry?.path)
    .filter((path) => typeof path === 'string');
  const inventory = compareMarkdownInventory(expectedPaths, actualPaths);
  const categoryDrift = entries
    .filter((entry) => entry && typeof entry.path === 'string')
    .map((entry) => ({
      path: entry.path,
      expected: entry.category ?? null,
      actual: classifyMarkdownPath(entry.path)
    }))
    .filter((entry) => entry.expected !== entry.actual)
    .sort((a, b) => a.path.localeCompare(b.path));

  return {
    ...inventory,
    categoryDrift,
    ok: inventory.ok && categoryDrift.length === 0
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

export function validateRequiredCanonicalStates(requiredPaths, documents) {
  const byPath = new Map(documents.map((document) => [document.path, document]));
  const missing = requiredPaths.filter((path) => !byPath.has(path)).sort();
  const withoutState = requiredPaths
    .filter((path) => byPath.has(path) && !byPath.get(path)?.state)
    .sort();
  const presentWithState = requiredPaths
    .filter((path) => byPath.get(path)?.state)
    .map((path) => byPath.get(path));
  const semantic = presentWithState.length > 0
    ? validateCanonicalStates(presentWithState)
    : { ok: false, conflicts: [] };

  return {
    ok: missing.length === 0 && withoutState.length === 0 && semantic.ok,
    missing,
    withoutState,
    conflicts: semantic.conflicts
  };
}

export function validateProductionState(state, canonicalState) {
  const issues = [];
  const structuralMappings = [
    ['repository', 'repository'],
    ['serverPath', 's1Root'],
    ['branch', 'branch'],
    ['container', 'container']
  ];

  for (const [stateKey, canonicalKey] of structuralMappings) {
    const expected = canonicalState?.[canonicalKey] ?? null;
    const actual = state?.[stateKey] ?? null;
    if (actual !== expected) {
      issues.push({
        path: stateKey,
        expected,
        actual,
        reason: 'canonical_structure_mismatch'
      });
    }
  }

  const githubSha = state?.githubState?.currentMainCommit ?? state?.githubCommitFull ?? null;
  const mergeSha = state?.githubState?.governedAutodeployV1MergeCommit ?? null;
  const s1Sha = state?.serverGitState?.lastDirectlyVerifiedCommitFull ?? null;
  const runtimeSha = state?.runtimeState?.currentRuntimeRevision ?? null;
  const autodeployStates = new Set([
    'merged_not_deployed',
    'bootstrap_succeeded_manual_validation_pending',
    'manual_validation_succeeded',
    'automatic_enabled_attestation_pending',
    'fully_attested'
  ]);
  const bootstrapStates = new Set([
    'blocked_connector_catalog',
    'pending_sync',
    'bootstrapped_manual_validation_pending',
    'manual_validation_succeeded',
    'automatic_enabled_attestation_pending',
    'fully_attested'
  ]);

  if (state?.githubState?.pullRequest39Merged !== true) {
    issues.push({
      path: 'githubState.pullRequest39Merged',
      expected: true,
      actual: state?.githubState?.pullRequest39Merged ?? null,
      reason: 'governed_autodeploy_merge_unrecorded'
    });
  }

  if (typeof mergeSha !== 'string' || !/^[a-f0-9]{40}$/.test(mergeSha)) {
    issues.push({
      path: 'githubState.governedAutodeployV1MergeCommit',
      expected: '40_char_lowercase_sha',
      actual: mergeSha,
      reason: 'merged_pr_without_merge_sha'
    });
  }

  if (typeof state?.serverGitState?.connectorSyncToolCallable !== 'boolean') {
    issues.push({
      path: 'serverGitState.connectorSyncToolCallable',
      expected: 'boolean',
      actual: state?.serverGitState?.connectorSyncToolCallable ?? null,
      reason: 'connector_catalog_state_missing'
    });
  }

  if (!autodeployStates.has(state?.deploymentState?.governedAutodeployV1)) {
    issues.push({
      path: 'deploymentState.governedAutodeployV1',
      expected: 'governed_autodeploy_state',
      actual: state?.deploymentState?.governedAutodeployV1 ?? null,
      reason: 'governed_autodeploy_state_missing'
    });
  }

  if (!bootstrapStates.has(state?.deploymentState?.bootstrapStatus)) {
    issues.push({
      path: 'deploymentState.bootstrapStatus',
      expected: 'governed_bootstrap_state',
      actual: state?.deploymentState?.bootstrapStatus ?? null,
      reason: 'governed_bootstrap_state_missing'
    });
  }

  if (state?.githubState?.pullRequest39Merged === true) {
    if (String(state?.deploymentState?.governedAutodeployV1 ?? '').includes('not_merged')) {
      issues.push({
        path: 'deploymentState.governedAutodeployV1',
        expected: 'merged_state',
        actual: state.deploymentState.governedAutodeployV1,
        reason: 'merged_pr_marked_not_merged'
      });
    }
  }

  if (
    state?.serverGitState?.connectorSyncToolCallable === false
    && state?.deploymentState?.bootstrapStatus !== 'blocked_connector_catalog'
  ) {
    issues.push({
      path: 'deploymentState.bootstrapStatus',
      expected: 'blocked_connector_catalog',
      actual: state?.deploymentState?.bootstrapStatus ?? null,
      reason: 'sync_tool_not_callable'
    });
  }

  if (
    typeof githubSha === 'string'
    && typeof s1Sha === 'string'
    && githubSha !== s1Sha
    && state?.serverGitState?.currentAlignmentAttested === true
  ) {
    issues.push({
      path: 'serverGitState.currentAlignmentAttested',
      expected: false,
      actual: true,
      reason: 'github_s1_sha_mismatch'
    });
  }

  if (
    state?.runtimeState?.status === 'FULLY_ALIGNED'
    && (
      typeof runtimeSha !== 'string'
      || runtimeSha !== githubSha
      || runtimeSha !== s1Sha
    )
  ) {
    issues.push({
      path: 'runtimeState.status',
      expected: 'not_fully_aligned',
      actual: state.runtimeState.status,
      reason: 'runtime_revision_not_attested'
    });
  }

  return { ok: issues.length === 0, issues };
}

export const canonicalStateKeys = Object.freeze([...CANONICAL_KEYS]);
export const canonicalRootDocuments = Object.freeze([...CANONICAL_ROOT_DOCUMENTS]);
