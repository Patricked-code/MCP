#!/usr/bin/env node
// Read-only exact deduplication of Git tree SHAs for the 190-branch frozen snapshot.
import {readFileSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=dirname(fileURLToPath(import.meta.url));
const read=path=>readFileSync(join(root,path),'utf8');
const json=path=>JSON.parse(read(path));
const summary=json('snapshots/2026-11-07/all-branches-v1/tree-object-shas/summary.json');
const frozen=json('snapshots/2026-11-07/all-branches-v1/frozen-branch-heads.json');
const original=json('snapshots/2026-11-07/all-branches-v1/summary.json');
const fail=msg=>{throw new Error('TREE_SHA_RECONCILIATION_FAILED: '+msg)};
const expected=new Map(frozen.branchRefs.map(r=>[r.branch,r.headSha]));
if(expected.size!==190||original.branches!==190)fail('Branch baseline');
const roots=new Set(),subtrees=new Set(),all=new Set(),seenBranches=new Set();
let subtreeOccurrences=0;
for(let i=0;i<19;i++){
 const path='snapshots/2026-11-07/all-branches-v1/tree-object-shas/batch-'+String(i).padStart(2,'0')+'.jsonl';
 const lines=read(path).trim().split('\n').map(JSON.parse);
 if(lines.length!==10)fail('Batch length '+i);
 for(let j=0;j<10;j++){
  const item=lines[j],record=frozen.branchRefs[i*10+j];
  if(item.branch!==record.branch||item.headSha!==record.headSha||seenBranches.has(item.branch))fail('Branch identity '+item.branch);
  seenBranches.add(item.branch);
  if(!/^[0-9a-f]{40}$/.test(item.rootTreeSha))fail('Root SHA '+item.branch);
  roots.add(item.rootTreeSha);all.add(item.rootTreeSha);
  const paths=new Set();
  for(const [p,sha] of item.subtrees){
   if(paths.has(p)||!p||!p.includes('/')&&!p.length||!/^[0-9a-f]{40}$/.test(sha))fail('Tree SHA/path '+item.branch);
   paths.add(p);
   subtrees.add(sha);all.add(sha);subtreeOccurrences++;
  }
 }
}
const overlap=[...roots].filter(sha=>subtrees.has(sha)).length;
const stats={branches:seenBranches.size,rootTreeOccurrences:seenBranches.size,subtreeOccurrences,totalTreeOccurrences:seenBranches.size+subtreeOccurrences,uniqueRootTreeObjects:roots.size,uniqueSubtreeTreeObjects:subtrees.size,rootSubtreeShaIntersection:overlap,uniqueTreeObjects:all.size,repeatedTreeObjectOccurrences:seenBranches.size+subtreeOccurrences-all.size};
for(const [k,v] of Object.entries(stats))if(v!==summary[k])fail('Recorded aggregate '+k+': '+v+' vs '+summary[k]);
if(subtreeOccurrences!==original.foldersAcrossBranches)fail('Original directory count');
console.log(JSON.stringify({verified:true,snapshotId:summary.snapshotId,...stats},null,2));
