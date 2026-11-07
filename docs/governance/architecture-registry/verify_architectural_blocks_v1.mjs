import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const read = (p) => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'));
const lines = (p) => fs.readFileSync(path.join(root, p), 'utf8').trim().split(/\r?\n/).map((s) => JSON.parse(s));
const manifest = read('catalog/architectural-classification-manifest-v1.json');
const blocks = read('catalog/architectural-blocks-v1.json');
const gwc = read('catalog/architectural-gwc-contract-map-v1.json');
const program = read('catalog/architectural-program-blueprint-map-v1.json');
const main = lines('snapshots/2026-11-07/main-files.jsonl');
const technical = lines('snapshots/2026-11-07/main-technical-classification.jsonl');
const assigned = manifest.filesParts.flatMap(lines);
assert.equal(main.length, 844);
assert.equal(technical.length, 844);
assert.equal(assigned.length, 844);
assert.equal(blocks.blocks.length, manifest.blocks);
assert.equal(gwc.contracts.length, manifest.gwcContracts);
assert.equal(program.blueprints.length, manifest.taskBlueprints);
const fileSha = new Map(main.map((file) => [file.path, file.blobSha]));
const technicalSha = new Map(technical.map((file) => [file.path, file.blobSha]));
const ids = new Set(blocks.blocks.map((block) => block.id));
assert.equal(fileSha.size, 844);
assert.equal(new Set(assigned.map((file) => file.path)).size, 844);
for (const row of assigned) {
  assert.equal(fileSha.get(row.path), row.blobSha);
  assert.equal(technicalSha.get(row.path), row.blobSha);
  assert.equal(row.wholeFileSemanticsReviewed, false);
  assert.equal(row.runtimeEvidence, 'NOT_OBSERVED');
  for (const id of [...row.confirmedAnchorInCatalog, ...row.pathDiscoveryHints]) {
    assert(ids.has(id), 'Unknown architectural block ID: ' + id);
  }
}
for (const block of blocks.blocks) for (const source of block.sourceAnchors) {
  assert.equal(fileSha.get(source.path), source.blobSha);
}
for (const edge of blocks.relations) {
  assert(ids.has(edge.from));
  assert(ids.has(edge.to));
}
assert.equal(gwc.graph.edgeCount, 91);
assert.equal(gwc.contracts.filter((x) => x.id === 'GW-73').length, 1);
assert.equal(program.workItems, 41);
console.log(JSON.stringify({ status: 'PASS', files: assigned.length,
  blocks: blocks.blocks.length, relations: blocks.relations.length,
  gwcContracts: gwc.contracts.length, programBlueprints: program.blueprints.length }));
