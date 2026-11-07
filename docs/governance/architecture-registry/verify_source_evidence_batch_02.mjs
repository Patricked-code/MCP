#!/usr/bin/env node
// Verify exact source Git blobs, role declarations and relation line anchors; no writes.
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {join,dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=dirname(fileURLToPath(import.meta.url)),repoRoot=resolve(root,'../../..');
const json=p=>JSON.parse(readFileSync(join(root,p),'utf8')),idx=json('index.json'),batch=json(idx.files.sourceEvidenceBatch02);
const fail=m=>{throw new Error('BATCH02_EVIDENCE: '+m)};
if(batch.mainCommitSha!==idx.mainSha||batch.snapshotId!==idx.snapshotId||batch.files.length!==9||batch.relations.length!==6)fail('snapshot/scope');
const cache=new Map(),hash=b=>createHash('sha1').update(Buffer.concat([Buffer.from('blob '+b.length+'\0'),b])).digest('hex');
function verify(path,sha){if(cache.has(path)){if(cache.get(path).sha!==sha)fail('SHA mismatch '+path);return cache.get(path).lines;}
const content=readFileSync(resolve(repoRoot,path));if(hash(content)!==sha)fail('blob mismatch '+path);
const lines=content.toString('utf8').split('\n');cache.set(path,{lines,sha});return lines;}
function check(path,sha,e){const lines=verify(path,sha);if(!e||e.line<=0||lines[e.line-1]?.trim()!==e.excerpt)fail('evidence line '+path);}
for(const f of batch.files){if(f.status!=='VERIFIED_DECLARED_SOURCE_ROLE'||f.wholeFileSemanticallyReviewed!==false)fail('role '+f.path);check(f.path,f.blobSha,f.evidence);}
for(const edge of batch.relations){if(edge.status!=='VERIFIED_SOURCE_REFERENCE')fail('edge status');check(edge.from,edge.sourceBlobSha,edge.evidence);verify(edge.to,edge.targetBlobSha);}
console.log(JSON.stringify({verified:true,sourceFiles:9,relations:6,scope:'DECLARATION_ONLY'}));