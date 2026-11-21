#!/usr/bin/env node
/**
 * Rebuild/check the derived documentary relational matrix (PR #373).
 * Source authorities: canonical-tree.json + continuity-contract.json +
 * conversation-event-log.json. This script never creates MCP runtime authority.
 *
 * node docs/governance/conversation-continuity/build-relational-matrix.mjs --check
 * node docs/governance/conversation-continuity/build-relational-matrix.mjs --write
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
const dir = path.dirname(fileURLToPath(import.meta.url));
const read = (name) => fs.readFileSync(path.join(dir,name),"utf8");
const parse = (name) => JSON.parse(read(name));
const [tree,contract,journal] = ["canonical-tree.json","continuity-contract.json","conversation-event-log.json"].map(parse);
const root = tree.rootId;
const insist = (v,msg) => { if(!v)throw new Error("MATRIX_INTEGRITY: "+msg); };
insist(root===contract.rootId && root===journal.rootId,"root identity mismatch");
insist(tree.nodes.length>=63,"loss of base nodes");
const nodeMap=new Map(tree.nodes.map(n=>[n.id,n]));
const pathMap=new Map(tree.nodes.map(n=>[n.path,n]));
insist(nodeMap.size===tree.nodes.length && pathMap.size===tree.nodes.length,"duplicate IDs/paths");
const top=tree.nodes.filter(n=>n.parentId===root);
insist(top.length===8,"exactly eight primary chapters required");
const synthetic={id:root,path:"",title:"Livre canonique vivant — discipline MCP",parentId:null,children:top.map(n=>n.id),crossReferences:[],kind:"root",status:"documentary-root",source:"owner-established"};
const all=new Map([[root,synthetic],...nodeMap]),anc=new Map(),desc=new Map([...all.keys()].map(id=>[id,[]]));
function getAnc(id){
  if(anc.has(id))return anc.get(id);
  let cur=all.get(id),list=[],seen=new Set([id]);
  insist(Boolean(cur),"unknown node "+id);
  while(cur.parentId){
    const a=cur.parentId;
    insist(!seen.has(a) && all.has(a),"cycle or missing parent "+id);
    list.push(a);seen.add(a);cur=all.get(a);
  }
  anc.set(id,list);return list;
}
for(const id of all.keys())getAnc(id);
for(const id of all.keys())for(const a of getAnc(id))desc.get(a).push(id);
const nodeRows=[],relations=[],closure=[];
function visit(id,chapter){
  const n=all.get(id),par=n.parentId,chapterId=id===root?null:par===root?id:chapter;
  const order=par?all.get(par).children.indexOf(id)+1:0;
  insist(!par || order>0,"missing child back-link: "+id);
  const ancestors=getAnc(id);
  nodeRows.push({id,path:n.path,title:n.title,depth:ancestors.length,chapterId,parentId:par,
    siblingOrder:order,kind:n.kind,status:n.status,provenance:n.source??null,
    ancestorIds:[...ancestors].reverse(),childIds:n.children.slice(),directChildCount:n.children.length,
    descendantCount:desc.get(id).length,crossReferenceIds:n.crossReferences.slice(),
    nextDiscussionAction:n.nextDiscussionAction??null,operationalAuthority:false});
  for(const child of n.children)visit(child,chapterId);
}
visit(root,null);
insist(nodeRows.length===tree.nodes.length+1,"unreachable/duplicate nodes");
for(const n of nodeRows){
  closure.push({ancestorId:n.id,descendantId:n.id,distance:0,relation:"SELF"});
  for(let i=0;i<getAnc(n.id).length;i++)
    closure.push({ancestorId:getAnc(n.id)[i],descendantId:n.id,distance:i+1,relation:"ANCESTOR"});
  if(n.parentId)relations.push({id:root+"/REL/PARENT/"+n.path,type:"PARENT_OF",fromId:n.parentId,
    toId:n.id,structural:true,source:"canonical-tree.json"});
  for(const to of n.crossReferenceIds){
    insist(nodeMap.has(to),"unknown cross reference");
    relations.push({id:root+"/REL/CROSS/"+n.path+"/"+nodeMap.get(to).path,type:"CROSS_REFERENCE",
      fromId:n.id,toId:to,structural:false,source:"canonical-tree.json"});
  }
}
const eventLinks=[];
for(const ev of journal.events){
  insist(all.has(ev.primaryNodeId),"event primary missing "+ev.eventId);
  eventLinks.push({eventId:ev.eventId,nodeId:ev.primaryNodeId,role:"PRIMARY"});
  for(const id of ev.relatedNodeIds??[]){
    insist(all.has(id),"event related missing "+ev.eventId);
    eventLinks.push({eventId:ev.eventId,nodeId:id,role:"RELATED"});
  }
}
const externalReferences=[],externalNodeLinks=[];
for(let i=0;i<(tree.existingAuthoritativeReferences??[]).length;i++){
  const x=tree.existingAuthoritativeReferences[i],id=root+"/EXTERNAL/"+String(i+1).padStart(3,"0");
  externalReferences.push({id,name:x.name,url:x.url,classification:x.relationship});
  for(const p of x.relatedPaths){
    const n=pathMap.get(p);insist(Boolean(n),"external path missing "+p);
    externalNodeLinks.push({nodeId:n.id,externalRefId:id,relation:"DOCUMENTARY_POINTER_ONLY"});
  }
}
const counts={rootRecords:1,chapterRecords:top.length,existingNodeRecords:tree.nodes.length,
  allNodeRecords:nodeRows.length,structuralEdges:relations.filter(x=>x.structural).length,
  crossReferenceEdges:relations.filter(x=>!x.structural).length,ancestorClosureRows:closure.length,
  eventNodeLinks:eventLinks.length,externalReferenceRecords:externalReferences.length,
  externalNodeLinks:externalNodeLinks.length,maxDepth:Math.max(...nodeRows.map(n=>n.depth))};
insist(counts.structuralEdges===tree.nodes.length,"missing parent edges");
insist(desc.get(root).length===tree.nodes.length,"root ancestry invalid");
const sha = name => {const b=Buffer.from(read(name),"utf8");return crypto.createHash("sha1")
  .update(Buffer.concat([Buffer.from("blob "+b.length+"\u0000"),b])).digest("hex");};
const matrix={schemaVersion:1,artifactType:"DERIVED_EVOLVING_CONVERSATION_RELATIONAL_MATRIX",
  matrixId:root+"/MATRIX/RELATIONAL/1",rootId:root,
  status:"DOCUMENTARY_DERIVED_PROJECTION_NOT_RUNTIME_AUTHORITY",
  generationDate:tree.versionLog.at(-1)?.date??null,
  source:{canonicalTree:"canonical-tree.json",canonicalTreeBlobSha:sha("canonical-tree.json"),
    continuityContract:"continuity-contract.json",continuityContractBlobSha:sha("continuity-contract.json"),
    conversationEventLog:"conversation-event-log.json",conversationEventLogBlobSha:sha("conversation-event-log.json"),
    treeVersion:tree.versionLog.at(-1)?.version??null,eventCount:journal.events.length},
  counts,tables:{nodes:nodeRows,relations,ancestryClosure:closure,
    conversationEvents:journal.events.map(ev=>({eventId:ev.eventId,sequence:ev.sequence,kind:ev.kind,
      status:ev.status,source:ev.source,nextDiscussionAction:ev.nextDiscussionAction??null})),
    eventNodeLinks:eventLinks,externalReferences,externalNodeLinks},
  indexes:{byPath:Object.fromEntries(nodeRows.map(n=>[n.path||"ROOT",n.id])),
    byId:Object.fromEntries(nodeRows.map(n=>[n.id,n.path||"ROOT"]))},
  constraints:{idsPersistAcrossEdits:true,pathsImmutableOnceAssigned:true,onePrimaryParent:true,
    allowUnlimitedDepth:true,derivedNeverOverridesSource:true,operationalAuthority:false,
    newChildrenOnlyWhenDiscussed:true,rebuildOnEveryAuthorizedTreeUpdate:true,
    provenanceUserClaimsNotOperationalFacts:true,publicRepoTechnicalSummariesOnly:true},
  nextAction:"Rebuild derived projections on each authorized source change; validate all existing IDs and links before marking current."};
function csv(rows,keys){
  const enc=v=>{const s=v==null?"":Array.isArray(v)?v.join("|"):String(v);
    return /[",\n\r]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s;};
  return [keys.join(","),...rows.map(row=>keys.map(k=>enc(row[k])).join(","))].join("\n")+"\n";
}
const outputs={
  "continuity-relational-matrix.json":JSON.stringify(matrix,null,2)+"\n",
  "continuity-node-matrix.csv":csv(nodeRows,["id","path","title","depth","chapterId","parentId",
    "siblingOrder","status","kind","provenance","directChildCount","descendantCount",
    "ancestorIds","childIds","crossReferenceIds"]),
  "continuity-relation-matrix.csv":csv(relations,["id","type","fromId","toId","structural","source"])
};
const mode=process.argv[2];
insist(mode==="--check"||mode==="--write","usage: --check | --write");
for(const [name,content] of Object.entries(outputs)){
  const p=path.join(dir,name);
  if(mode==="--write")fs.writeFileSync(p,content,"utf8");
  else insist(fs.existsSync(p)&&fs.readFileSync(p,"utf8")===content,"derived projection drift: "+name);
}
process.stdout.write(JSON.stringify({status:"OK",mode,rootId:root,counts},null,2)+"\n");
