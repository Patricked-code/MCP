import assert from 'node:assert/strict';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { loadCanonicalMcpProjectEntry } from '../src/projectIdentity/canonicalProjectEntry.js';

const SOURCE = fileURLToPath(new URL('../.mcp/canonical-project-entry.json', import.meta.url));

test('MCP_SELF entry resolves founding documents and a bounded workflow without grants', async () => {
  const result = await loadCanonicalMcpProjectEntry(SOURCE);
  assert.equal(result.status, 'DOCUMENTARY_CANDIDATE');
  assert.equal(result.loadedFromBundledManifest, true);
  assert.equal(result.effectivePermissionInferred, false);
  assert.equal(result.mutationPerformed, false);
  assert.ok(result.identity);
  if (!result.identity) return;
  assert.equal(result.identity.projectUid, 'WT-PROJECT-MCP-001');
  assert.equal(result.identity.repository, 'Patricked-code/MCP');
  assert.equal(result.identity.projectKind, 'MCP_SELF');
  assert.equal(result.identity.serverId, 's1');
  assert.equal(result.identity.originalDocumentOrder[0], 'GPT.md');
  assert.equal(result.identity.originalDocumentOrder[1], 'SUIVI.md');
  assert.equal(result.identity.originalDocumentOrder.length, 17);
  assert.equal(result.identity.requiredAdditionalHistoricalDocuments.length, 3);
  assert.equal(result.identity.entryWorkflow.at(-1), 'STOP_FOR_OWNER_WORK_CHOICE');
  assert.equal(result.identity.authorizationGranted, false);
  assert.equal(result.identity.runtimeBindingVerified, false);
  assert.equal(result.identity.sessionOrTaskCreated, false);
  assert.equal(result.identity.liveStateAttested, false);
  assert.ok(result.identity.registryReferences.some(x => x.id === 'GIT_REGISTRY'));
  assert.ok(result.identity.discoveryTools.includes('github_account_inventory'));
  assert.ok(result.identity.operationCatalog.every(x => x.granted === false));
  assert.equal(JSON.stringify(result).includes('privateKey'), false);
});

test('MCP_SELF manifest missing from image fails closed with no invented mapping', async () => {
  const result = await loadCanonicalMcpProjectEntry('/tmp/nonexistent-canonical-project-entry.json');
  assert.deepEqual(result, {
    status: 'UNAVAILABLE',
    reasonCode: 'CANONICAL_ENTRY_UNAVAILABLE',
    loadedFromBundledManifest: false,
    mutationPerformed: false,
    effectivePermissionInferred: false,
    identity: null
  });
});
