import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { access, readFile } from 'node:fs/promises';
import test from 'node:test';

import { canonicalJson as currentToolCatalogCanonicalJson } from '../src/currentState/toolCatalog.js';
import { canonicalRegistryHash } from '../src/github/registryV2.js';

const SHARED_AUTHORITY = 'src/canonicalJson.ts';

const RUNTIME_CANONICAL_CONSUMERS = [
  'src/currentState/toolCatalog.ts',
  'src/github/registryV2.ts',
  'src/operationalMemory/taskQueue.ts',
  'src/governedWorkflow/contractSubstrate.ts',
  'src/governedWorkflow/adapters/session.ts',
  'src/governedWorkflow/adapters/task.ts',
  'src/governedWorkflow/authority/index.ts',
  'src/governedWorkflow/deploy/index.ts',
  'src/governedWorkflow/development/index.ts',
  'src/governedWorkflow/executionEngine.ts',
  'src/governedWorkflow/intentCapture.ts',
  'src/governedWorkflow/review/index.ts',
  'src/governedWorkflow/terminal/index.ts'
] as const;

test('AF-21 uses one runtime canonical JSON authority for governed digests', async () => {
  await access(SHARED_AUTHORITY);
  const shared = await readFile(SHARED_AUTHORITY, 'utf8');
  assert.match(shared, /export function canonicalJson\s*\(/);

  for (const path of RUNTIME_CANONICAL_CONSUMERS) {
    const source = await readFile(path, 'utf8');
    assert.doesNotMatch(
      source,
      /function canonical(?:ize)?\s*\(/,
      `${path} must not define a competing canonical JSON implementation`
    );
    assert.match(
      source,
      /canonicalJson/,
      `${path} must consume the shared canonical JSON authority`
    );
  }
});

test('AF-21 preserves existing canonical digest semantics for JSON-safe values', () => {
  const fixture = {
    z: 1,
    a: {
      y: [3, { b: true, a: null }],
      x: 'value'
    },
    omitted: undefined
  };
  const expectedCanonical = '{"a":{"x":"value","y":[3,{"a":null,"b":true}]},"z":1}';
  assert.equal(currentToolCatalogCanonicalJson(fixture), expectedCanonical);
  assert.equal(
    canonicalRegistryHash(fixture),
    createHash('sha256').update(expectedCanonical).digest('hex')
  );
});
