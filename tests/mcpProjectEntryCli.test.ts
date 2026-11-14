import assert from 'node:assert/strict';
import test from 'node:test';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(new URL('../scripts/mcp-project-entry.mjs', import.meta.url));

test('GitHub-side entry resolves the exact UID and deep documentation view without accessing runtime', () => {
  const out = JSON.parse(execFileSync(process.execPath, [script, 'WT-PROJECT-MCP-001', 'FOUNDATIONS'], { encoding: 'utf8' }));
  assert.equal(out.status, 'DOCUMENTARY_CANDIDATE');
  assert.equal(out.projectUid, 'WT-PROJECT-MCP-001');
  assert.equal(out.view, 'FOUNDATIONS');
  assert.match(out.entryDocument, /09-foundations\/FOUNDING_DOCUMENTS.md$/);
  assert.equal(out.runtimeObserved, false);
  assert.equal(out.effectivePermissionInferred, false);
  assert.equal(out.mutationPerformed, false);
  assert.ok(out.relatedRegistries.some((x: { id: string }) => x.id === 'GIT_REGISTRY'));
});

test('unknown project UID cannot silently resolve into the MCP project', () => {
  const out = spawnSync(process.execPath, [script, 'OTHER-PROJECT', 'FULL'], { encoding: 'utf8' });
  assert.equal(out.status, 2);
  const msg = JSON.parse(out.stderr.trim());
  assert.equal(msg.reasonCode, 'UNKNOWN_PROJECT_ID_OR_VIEW');
});
