#!/usr/bin/env node
// Historical evidence and bounded impact inspector. Read-only; no live authority.
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(root, '../../..');
const read = p => readFileSync(join(root, p), 'utf8');
const json = p => JSON.parse(read(p));
const fail = m => { throw new Error('ARCHITECTURE_EVIDENCE: ' + m); };
const index = json('index.json'), ev = json(index.files.sourceEvidenceBatch01);
const comp = json(index.files.crossbranchSample), multi = index.multiBranchInventory;
const mainFiles = read(index.files.mainFiles).trim().split('\n').map(JSON.parse);
const known = new Map(mainFiles.map(f => [f.path, f.blobSha]));
if (mainFiles.length !== 844 || ev.mainCommitSha !== index.mainSha ||
    comp.mainBaseline !== index.mainSha || comp.snapshotId !== multi.snapshotId ||
    ev.relations.length !== 6 || ev.declarations.length !== 10 ||
    ev.inspectedPaths.length !== 10 || comp.comparisons.length !== 10)
  fail('snapshot or evidence scope mismatch');
const hashBlob = data => createHash('sha1')
  .update(Buffer.concat([Buffer.from('blob ' + data.length + '\0'), data]))
  .digest('hex');
const inspected = new Map();
for (const file of ev.inspectedPaths) {
  if (known.get(file.path) !== file.blobSha || inspected.has(file.path))
    fail('blob identity mismatch ' + file.path);
  const data = readFileSync(resolve(repoRoot, file.path));
  if (hashBlob(data) !== file.blobSha)
    fail('local worktree differs from historical source ' + file.path);
  inspected.set(file.path, data.toString('utf8').split('\n'));
}
for (const relation of ev.relations) {
  if (relation.status !== 'VERIFIED_SOURCE_REFERENCE' ||
      !inspected.has(relation.from) || !inspected.has(relation.to) ||
      relation.evidence.blobSha !== known.get(relation.from) ||
      relation.targetBlobSha !== known.get(relation.to) ||
      relation.evidence.path !== relation.from ||
      relation.evidence.commitSha !== index.mainSha)
    fail('relation identity ' + relation.id);
  const text = inspected.get(relation.from)[relation.evidence.line - 1];
  if (!text || text.trim() !== relation.evidence.excerpt)
    fail('relation source line ' + relation.id);
}
for (const declaration of ev.declarations) {
  if (declaration.status !== 'SOURCE_TEXT_VERIFIED' ||
      known.get(declaration.path) !== declaration.blobSha ||
      !inspected.get(declaration.path)?.[declaration.line - 1] ||
      inspected.get(declaration.path)[declaration.line - 1].trim() !== declaration.excerpt)
    fail('declaration source line ' + declaration.id);
}
const frozen = json(multi.branchHeads), manifest = json(multi.manifest);
if (frozen.branchRefs.length !== 190 || manifest.batches.length !== 19 ||
    manifest.snapshotId !== comp.snapshotId) fail('frozen branches/manifest');
const expected = new Map(comp.comparisons.map(x => [x.path, x]));
const metrics = new Map([...expected].map(([path, item]) => [
  path, { mainBlobSha: item.mainBlobSha, present: 0, identical: 0, variants: new Set() }
]));
for (const [path, row] of expected) if (known.get(path) !== row.mainBlobSha)
  fail('baseline mismatch ' + path);
const observed = new Set();
for (const batch of manifest.batches) {
  const lines = read(join(multi.root, batch.filename)).trim().split('\n').map(JSON.parse);
  if (lines.length !== batch.branchCount) fail('incomplete batch ' + batch.id);
  for (const ref of lines) {
    if (observed.has(ref.branch) || !ref.complete || ref.truncated) fail('duplicate/incomplete tree ' + ref.branch);
    observed.add(ref.branch);
    const selected = new Map(ref.files.filter(x => expected.has(x[0])).map(x => [x[0], x[1]]));
    if (ref.branch === 'main') {
      if (ref.headSha !== index.mainSha) fail('main drift');
      for (const [path, row] of expected) if (selected.get(path) !== row.mainBlobSha)
        fail('main blob changed ' + path);
    }
    for (const [path, sha] of selected) {
      const m = metrics.get(path);
      m.present++;
      m.variants.add(sha);
      if (sha === m.mainBlobSha) m.identical++;
    }
  }
}
if (observed.size !== 190 || comp.branchesScanned !== 190 || comp.batchesScanned !== 19)
  fail('branch coverage');
for (const [path, row] of expected) {
  const m = metrics.get(path);
  if (m.present !== row.branchesPresent || 190 - m.present !== row.branchesAbsent ||
      m.identical !== row.identicalToMain || m.variants.size !== row.distinctBlobShas)
    fail('cross-branch calculation ' + path);
}
const result = {
  ok: true,
  baselineMain: index.mainSha,
  frozenBranches: observed.size,
  comparisonPaths: expected.size,
  inspectedSourcePaths: inspected.size,
  sourceBackedRelations: ev.relations.length,
  sourceDeclarations: ev.declarations.length,
  scope: 'BOUNDED_HISTORICAL_ANALYSIS_NOT_RUNTIME_ATTESTATION'
};
const args = process.argv.slice(2);
if (args[0] === '--impact') {
  if (!args[1] || args.length !== 2) fail('usage: --impact <repository-relative-path>');
  const selected = args[1];
  if (!known.has(selected)) fail('path not found in frozen main baseline');
  let frontier = [selected], seen = new Set([selected]), dependents = [];
  for (let depth = 1; depth <= 3 && frontier.length; depth++) {
    const next = [];
    for (const edge of ev.relations) {
      if (!frontier.includes(edge.to) || seen.has(edge.from)) continue;
      seen.add(edge.from);
      dependents.push({ path: edge.from, depth, relation: edge.predicate,
        sourceLine: edge.evidence.line, sourceBlobSha: edge.evidence.blobSha,
        evidenceStatus: edge.status });
      next.push(edge.from);
    }
    frontier = next;
  }
  result.impactCandidate = {
    changedFile: selected,
    analyzedInSample: inspected.has(selected),
    dependents,
    branchSample: expected.get(selected) ?? null,
    disclaimer: 'Partial reverse references only; an empty result does not establish zero impact.'
  };
} else if (args.length) fail('usage: [--impact <repository-relative-path>]');
console.log(JSON.stringify(result, null, 2));
