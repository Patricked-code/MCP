#!/usr/bin/env node
// Read-only, deterministic verification: filenames are not semantic classification.
import {readFileSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
const base=dirname(fileURLToPath(import.meta.url));
const get=x=>readFileSync(join(base,x),'utf8');
const idx=JSON.parse(get('index.json'));
const tax=JSON.parse(get(idx.files.technicalTaxonomy));
const sum=JSON.parse(get(idx.files.technicalSummary));
const physical=get(idx.files.mainFiles).trim().split('\n').map(JSON.parse);
const mapped=get(idx.files.technicalClassification).trim().split('\n').map(JSON.parse);
const err=x=>{throw new Error('TECH_FORMAT_VERIFY: '+x)};
if(physical.length!==844||mapped.length!==844||idx.mainFileCount!==844)err('count');
if(sum.commitSha!==idx.mainSha||sum.observationId!==idx.snapshotId)err('snapshot');
const hit=new Map(mapped.map(x=>[x.path,x]));
if(hit.size!==844)err('unique path');
const ct=new Map();
for(const f of physical){
 const fileName=f.path.split('/').at(-1);
 const t=tax.types.find(x=>x.exactName===fileName)??tax.types.find(x=>x.extension&&fileName.endsWith(x.extension));
 const r=hit.get(f.path);
 if(!t||!r||r.blobSha!==f.blobSha||r.commitSha!==idx.mainSha||r.snapshotId!==idx.snapshotId||r.branch!=='main'||r.formatType!==t.id||r.technicalFamily!==t.family||r.detectedBy!==t.detectBy||r.signatureValidation!=='NOT_PERFORMED'||r.functionalRoleStatus!=='UNREVIEWED')err(f.path);
 ct.set(t.id,(ct.get(t.id)??0)+1);
}
for(const t of tax.types)if(sum.types.find(x=>x.formatType===t.id)?.count!==(ct.get(t.id)??0))err('summary '+t.id);
if(sum.types.reduce((s,x)=>s+x.count,0)!==844||sum.unknownFilenameFormats!==0||sum.semanticRolesClassified!==0)err('summary coverage');
console.log(JSON.stringify({ok:true,commitSha:idx.mainSha,files:844,types:tax.types.length,semanticRoles:0},null,2));
