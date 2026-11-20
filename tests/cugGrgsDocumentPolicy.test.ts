import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { assessGrgsDocumentPath, GRGS_POLICY_ID } from '../src/cug/grgsDocumentPolicy.js';

test('GRGS preserves canonical tooling filenames', () => {
  for (const path of ['README.md', 'docs/AGENTS.md', 'CLAUDE.md', 'CONTINUITY.md', '00_GSCC_ENTRY.md', '00_DIRECT_OWNER_ENTRY.md']) {
    const result = assessGrgsDocumentPath(path);
    assert.equal(result.classification, 'CONVENTIONAL_EXCEPTION');
    assert.equal(result.automaticMutation, false);
  }
});
test('GRGS identifies scoped document without granting authority', () => {
  const result = assessGrgsDocumentPath('docs/CSWT-MCP-CONT-PROJET-001__SUIVI.md');
  assert.equal(result.policyId, GRGS_POLICY_ID);
  assert.equal(result.classification, 'SCOPED_DOCUMENT');
  assert.equal(result.entityId, 'CSWT-MCP-CONT-PROJET-001');
  assert.equal(result.documentType, 'SUIVI');
  assert.equal(result.automaticMutation, false);
});
test('GRGS reports legacy and unsafe paths without mutation', () => {
  assert.equal(assessGrgsDocumentPath('docs/SUIVI.md').classification, 'LEGACY_REVIEW');
  assert.equal(assessGrgsDocumentPath('../secrets.md').classification, 'INVALID_PATH');
  assert.equal(assessGrgsDocumentPath('/root/README.md').classification, 'INVALID_PATH');
  assert.equal(assessGrgsDocumentPath('src/index.ts').classification, 'OUT_OF_SCOPE');
});
