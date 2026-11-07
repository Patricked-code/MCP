#!/usr/bin/env node
// Frozen structural validation only: no runtime, branch mutation, or semantic guesses.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const root=dirname(fileURLToPath(import.meta.url));
const read=p=>readFileSync(join(root,p),'utf8');
const json=p=>JSON.parse(read(p));
const index=json('index.json'),sum=json(index.files.mainDirectorySummary),main=json(index.files.mainSummary);
const dirs=read(index.files.mainDirectories).trim().split('\n').map(JSON.parse);
const files=read(index.files.mainFiles).trim().split('\n').map(JSON.parse);
const fail=s=>{throw new Error('DIRECTORY_CHECK: '+s)};
if(sum.snapshotId!==index.snapshotId||sum.commitSha!==index.mainSha||sum.rootTreeSha!==main.treeObjectSha||sum.gitTreeTruncated!==false)fail('baseline');
if(dirs.length!==145||files.length!==844||sum.totalEntries!==989)fail('counts');
const known=new Set(dirs.map(x=>x.path));
if(known.size!==145)fail('duplicate tree paths');
for(const d of dirs){
 const parent=d.path.includes('/')?d.path.slice(0,d.path.lastIndexOf('/')):null;
 const prefix=d.path+'/';
 if(d.snapshotId!==index.snapshotId||d.commitSha!==index.mainSha||d.branch!=='main'||d.parentPath!==parent||d.depth!==d.path.split('/').length||d.gitMode!=='040000'||!(/^[a-f0-9]{40}$/).test(d.treeSha)||(parent&&!known.has(parent)))fail('tree identity '+d.path);
 const counts=[
  files.filter(x=>x.path.startsWith(prefix)&&!x.path.slice(prefix.length).includes('/')).length,
  dirs.filter(x=>x.path.startsWith(prefix)&&!x.path.slice(prefix.length).includes('/')).length,
  files.filter(x=>x.path.startsWith(prefix)).length,
  dirs.filter(x=>x.path.startsWith(prefix)).length
 ];
 if(JSON.stringify(counts)!==JSON.stringify([d.directFiles,d.directDirectories,d.descendantFiles,d.descendantDirectories]))fail('children '+d.path);
}
if(files.some(f=>f.path.includes('/')&&!known.has(f.path.slice(0,f.path.lastIndexOf('/')))))fail('orphan blob');
if(dirs.filter(d=>d.parentPath===null).reduce((n,d)=>n+d.descendantFiles,files.filter(x=>!x.path.includes('/')).length)!==844)fail('root coverage');
console.log(JSON.stringify({ok:true,directories:145,files:844,entries:989,meaning:'PHYSICAL_ONLY'}));
