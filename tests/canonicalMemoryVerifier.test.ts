import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

function sha256(value: string): string {
  return createHash('sha256').update(Buffer.from(value, 'utf8')).digest('hex');
}

async function makeBundle(): Promise<{ directory: string; sourceText: string }> {
  const directory = await mkdtemp(join(tmpdir(), 'mcp-canonical-memory-'));
  const sourcesDirectory = join(directory, 'sources');
  await mkdir(sourcesDirectory);

  const sourceText = 'checkpoint: GWC-0 ready\n';
  await writeFile(join(sourcesDirectory, 'checkpoint.md'), sourceText, 'utf8');

  const bundle = {
    schema_version: '0.1.0',
    bundle_kind: 'imported_memory',
    bundle_id: 'bnd_gwc_resume',
    scope: 'project:patricked-code/mcp',
    sources: [
      {
        source_id: 'src_checkpoint',
        path: 'sources/checkpoint.md',
        media_type: 'text/markdown',
        bytes: Buffer.byteLength(sourceText),
        sha256: sha256(sourceText)
      }
    ],
    claims: [
      {
        claim_id: 'clm_checkpoint_old',
        key: 'gwc.checkpoint',
        claim_type: 'fact',
        value: 'GWC-0 queued',
        source_refs: ['src_checkpoint'],
        approval_eligible: false
      },
      {
        claim_id: 'clm_checkpoint_current',
        key: 'gwc.checkpoint',
        claim_type: 'historical_authority',
        value: 'GWC-0 ready',
        source_refs: ['src_checkpoint'],
        approval_eligible: false
      }
    ],
    supersessions: [
      {
        edge_id: 'sup_checkpoint',
        superseded_claim_id: 'clm_checkpoint_old',
        superseding_claim_id: 'clm_checkpoint_current',
        reason: 'newer governed checkpoint'
      }
    ]
  };

  await writeFile(join(directory, 'bundle.json'), `${JSON.stringify(bundle, null, 2)}\n`, 'utf8');
  return { directory, sourceText };
}

test('un bundle canonique valide est vérifié et projette uniquement la tête courante non éligible à une approbation live', async () => {
  const modulePath = '../src/operationalMemory/canonicalMemoryVerifier.js';
  const verifier = await import(modulePath).catch(() => null);
  assert.ok(verifier && typeof verifier.verifyCanonicalMemoryBundle === 'function', 'Canonical Memory Verifier absent');

  const { directory } = await makeBundle();
  try {
    const result = await verifier.verifyCanonicalMemoryBundle(directory);
    assert.equal(result.status, 'VERIFIED');
    assert.deepEqual(result.counts, {
      sources: 1,
      claims: 2,
      supersessions: 1,
      current_heads: 1
    });
    assert.deepEqual(result.projection, [
      {
        key: 'gwc.checkpoint',
        claim_id: 'clm_checkpoint_current',
        claim_type: 'historical_authority',
        value: 'GWC-0 ready',
        source_refs: ['src_checkpoint'],
        approval_eligible: false
      }
    ]);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
