#!/usr/bin/env node
// A deterministic verification of the full multibranch Git tree snapshot.
// This does not inspect runtime, GitHub live, semantic roles, or binary signatures.
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = dirname(fileURLToPath(import.meta.url));
const read = p => readFileSync(join(root, p), 'utf8');
const json = p => JSON.parse(read(p));
const index = json('index.json'), multi = index.multiBranchInventory, snap = multi.snapshotId;
const frozen = json(multi.branchHeads), manifest = json(multi.manifest);
const sum = json(multi.summary), tax1 = json(index.files.technicalTaxonomy), tax2 = json(multi.taxonomyV2);
const fail = msg => {throw new Error('MULTIBRANCH_INVENTORY: '+msg);};
if(manifest.status !== 'COMPLETE' || manifest.expectedBranches !== 190 ||
  frozen.branchRefs.length !== 190 || sum.branches !== 190 ||
  manifest.snapshotId !== snap || frozen.snapshotId !== snap || sum.snapshotId !== snap)fail('snapshot or completeness');
const detect = (path,tax) => {
 const name = path.split('/').at(-1);
 return tax.types.find(t=>t.exactName && t.exactName===name) ??
        tax.types.find(t=>t.extension && name.endsWith(t.extension));
};
const legacyUnregistered = path => {
 const name=path.split('/').at(-1);return 'UNREGISTERED:'+(name.includes('.')?name.slice(name.lastIndexOf('.')):'(no-extension)');
};
const totals=new Map(),seenBranches=new Set();let count=0,dirs=0;
const mainPaths = new Map();
for(const batch of manifest.batches){
 const file = join(multi.root,batch.filename);
 const data = read(file).trim().split('\n').map(JSON.parse);
 const expected=frozen.branchRefs.slice(batch.from,batch.toExclusive);
 if(data.length!==expected.length||data.length!==batch.branchCount||batch.status!=='VALIDATED')fail('batch '+batch.id);
 for(let j=0;j<data.length;j++){
  const b=data[j],e=expected[j];if(b.branch!==e.branch||b.headSha!==e.headSha||b.truncated||!b.complete||seenBranches.has(b.branch))fail('ref '+b.branch);
  seenBranches.add(b.branch);
  const paths=new Set(),raw=new Map(),normalized=new Map();
  for(const t of b.files){
   if(t.length!==5||paths.has(t[0])||!(/^[a-f0-9]{40}$/).test(t[1]))fail('blob row '+b.branch);
   paths.add(t[0]);const old=detect(t[0],tax1),fresh=detect(t[0],tax2);
   if(!fresh || t[4]!== (old?.id ?? legacyUnregistered(t[0])))fail('classification '+t[0]);
   raw.set(t[4],(raw.get(t[4])??0)+1);normalized.set(fresh.id,(normalized.get(fresh.id)??0)+1);
   totals.set(fresh.id,(totals.get(fresh.id)??0)+1);
   if(b.branch==='main')mainPaths.set(t[0],t[1]);
  }
  if(b.files.length!==b.fileCount || b.directoryCount < 0)fail('counts '+b.branch);
  for(const [k,v] of raw)if(b.formatCounts[k]!==v)fail('raw count '+b.branch);
  const s=sum.branchStats.find(x=>x.branch===b.branch);
  if(!s||s.headSha!==b.headSha||s.files!==b.fileCount||s.folders!==b.directoryCount)fail('branch summary '+b.branch);
  for(const [k,v] of normalized)if(s.formatCounts[k]!==v)fail('normalization '+b.branch);
  count+=b.fileCount;dirs+=b.directoryCount;
 }
}
const baseline=read(index.files.mainFiles).trim().split('\n').map(JSON.parse);
if(mainPaths.size!==baseline.length||baseline.some(f=>mainPaths.get(f.path)!==f.blobSha))fail('main baseline drift');
if(seenBranches.size!==190||count!==96689||count!==sum.filesAcrossBranches||dirs!==sum.foldersAcrossBranches)fail('aggregates');
for(const [k,v] of totals)if(sum.formatCounts[k]!==v)fail('global type '+k);
if([...totals.values()].reduce((x,y)=>x+y,0)!==count)fail('type coverage');
console.log(JSON.stringify({ok:true,branches:190,fileMemberships:count,technicalTypes:tax2.types.length,semanticRolesValidated:0},null,2));
