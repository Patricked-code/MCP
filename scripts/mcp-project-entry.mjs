#!/usr/bin/env node
/**
 * GitHub-side read-only MCP project navigation.
 * Does not contact the server, access secrets, or grant permissions.
 * Usage: node scripts/mcp-project-entry.mjs WT-PROJECT-MCP-001 [VIEW]
 */
import { readFile } from 'node:fs/promises';

const PROJECT_UID = 'WT-PROJECT-MCP-001';
const manifestFile = new URL('../.mcp/canonical-project-entry.json', import.meta.url);
const views = Object.freeze({
  FULL: 'docs/governance/canonical-project/README.md',
  FOUNDATIONS: 'docs/governance/canonical-project/09-foundations/FOUNDING_DOCUMENTS.md',
  READING_ORDER: 'docs/governance/canonical-project/09-foundations/ORIGINAL_READING_ORDER.md',
  LOOP: 'docs/governance/canonical-project/09-foundations/LOOP_ENGINEERING_METHOD.md',
  WORKFLOW: 'docs/governance/canonical-project/10-orchestration/PROJECT_SELF_WORKFLOW.md',
  AUTHORIZATIONS: 'docs/governance/canonical-project/10-orchestration/AUTHORIZATION_CONTRACT.md',
  REGISTRIES: 'docs/governance/canonical-project/01-authorities/REGISTRY_OF_REGISTRIES.md',
  CAPABILITIES: 'docs/governance/canonical-project/11-persistence/CAPABILITY_INVENTORY.md',
  PERSISTENCE: 'docs/governance/canonical-project/11-persistence/S1_GITHUB_INDEXATION.md',
  CONTINUITIES: 'docs/governance/canonical-project/12-continuity/DEEP_CONTINUITY_AND_HANDOFF.md',
  HISTORY: 'docs/governance/canonical-project/06-history/HISTORY.md',
  NEXT: 'docs/governance/canonical-project/08-assurance/CONTINUITY_HANDOFF.md'
});
const id = process.argv[2] ?? '';
const view = (process.argv[3] ?? 'FULL').trim().toUpperCase();
if (id !== PROJECT_UID || !Object.hasOwn(views, view)) {
  process.stderr.write(JSON.stringify({ status: 'BLOCKED', reasonCode: 'UNKNOWN_PROJECT_ID_OR_VIEW', expectedId: PROJECT_UID, availableViews: Object.keys(views) }) + '\n');
  process.exitCode = 2;
} else {
  try {
    const input = JSON.parse(await readFile(manifestFile, 'utf8'));
    if (
      input.projectUid !== PROJECT_UID ||
      input.repository !== 'Patricked-code/MCP' ||
      input.projectKind !== 'MCP_SELF' ||
      input.authorizationGranted !== false ||
      input.runtimeBindingVerified !== false ||
      input.sessionOrTaskCreated !== false
    ) throw new Error('MANIFEST_INVALID');
    process.stdout.write(JSON.stringify({
      schemaVersion: 1,
      status: 'DOCUMENTARY_CANDIDATE',
      projectUid: PROJECT_UID,
      view,
      entryDocument: views[view],
      repository: input.repository,
      historicalSource: input.historicalSource,
      entryWorkflow: input.entryWorkflow,
      relatedRegistries: input.registryReferences.map(({ id, path, authority, classification }) => ({ id, path, authority, classification })),
      availableViews: Object.keys(views),
      runtimeObserved: false,
      effectivePermissionInferred: false,
      mutationPerformed: false,
      nextGate: 'READ_DOCS_AND_VERIFY_AUTHORITIES'
    }, null, 2) + '\n');
  } catch {
    process.stderr.write(JSON.stringify({ status: 'UNAVAILABLE', reasonCode: 'CANONICAL_ENTRY_UNAVAILABLE', mutationPerformed: false }) + '\n');
    process.exitCode = 1;
  }
}
