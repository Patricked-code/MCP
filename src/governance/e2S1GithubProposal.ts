/**
 * E2-only GitHub PR proposal for S1 modifications absent from approved main.
 * This connector never pushes from S1, never edits main, never merges or deploys.
 * All GitHub mutations use the separately configured GitHub credential; S1's
 * deploy key remains fetch-only. Every actual file is read from a bounded,
 * secret-screened read-only SSH snapshot and checked against exact Git blobs.
 */
import {createHash} from 'node:crypto';
import {runReadOnlyCommand} from '../ssh/client.js';
import {githubJsonRequestWithServerCredential} from '../github/connection.js';
import type {LiveStateSnapshot} from '../liveState/types.js';

const REPO='/repos/Patricked-code/MCP';
const SHA=/^[0-9a-f]{40}$/;
const PATH=/^[A-Za-z0-9_.@+\/-]{1,220}$/;
const BLOCKED=/(^|\/)(?:\.git|\.mcp_backups|node_modules|dist|build|coverage|keys|secrets|\.env(?:\.|$))|(?:\.pem|\.p8|\.key|\.crt|\.p12|\.sql|\.dump)$/i;
const FETCH='git@github.com-mcp-patricked-ro:Patricked-code/MCP.git';
const PUSH='disabled://mcp-s1-read-only';
const MAX=64_000;
const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
export type E2LocalFile=Readonly<{
 path:string;mode:'100644'|'100755';baseBlob:string;localBlob:string;
 sizeBytes:number;contentBase64:string;secretScan:'CLEAR';
}>;
export type E2LocalSnapshot=Readonly<{head:string;origin:string;files:readonly E2LocalFile[]}>;
export type E2GithubResponse=Readonly<{ok:boolean;status:number|null;json:unknown}>;
export type E2ProposalPorts=Readonly<{
 readS1:()=>Promise<E2LocalSnapshot>;
 github:(endpoint:string,options?:{method?:'GET'|'POST'|'PATCH';jsonBody?:unknown})=>Promise<E2GithubResponse>;
}>;
export type E2ProposalResult=Readonly<{
 status:'PROPOSAL_OPENED'|'EXISTING_PROPOSAL';
 url:string;sha:string;branch:string;created:boolean;
}>;
const obj=(x:unknown):Record<string,unknown>|null=>
 x&&typeof x==='object'&&!Array.isArray(x)?x as Record<string,unknown>:null;
const str=(x:unknown):string|null=>typeof x==='string'?x:null;
async function expect(port:E2ProposalPorts['github'],endpoint:string,
 options?:{method?:'GET'|'POST'|'PATCH';jsonBody?:unknown},
 statuses:number[]=[200,201]):Promise<Record<string,unknown>>{
 const r=await port(endpoint,options);
 if(!r.ok||!statuses.includes(r.status??-1)||!obj(r.json))
  throw new Error('E2_GITHUB_PROPOSAL_API_NOT_AUTHORIZED');
 return obj(r.json)!;
}
function safeFile(file:E2LocalFile):boolean{
 if(!PATH.test(file.path)||file.path.startsWith('/')||file.path.includes('..')
   ||file.path.includes('//')||BLOCKED.test(file.path)
   ||!['100644','100755'].includes(file.mode)
   ||!SHA.test(file.baseBlob)||!SHA.test(file.localBlob)
   ||file.secretScan!=='CLEAR'||file.sizeBytes<0||file.sizeBytes>MAX
   ||file.contentBase64.length>90_000||!file.contentBase64.match(/^[A-Za-z0-9+/]*={0,2}$/))
   return false;
 const content=Buffer.from(file.contentBase64,'base64');
 if(content.toString('base64')!==file.contentBase64)return false;
 if(content.length!==file.sizeBytes)return false;
 const gitBlob=createHash('sha1').update('blob '+content.length+'\0').update(content).digest('hex');
 return gitBlob===file.localBlob;
}
function validate(s:LiveStateSnapshot,x:E2LocalSnapshot):void{
 if(s.repository!=='Patricked-code/MCP'||s.freshness!=='CURRENT'
  ||s.github.status!=='CURRENT'||s.s1.status!=='CURRENT'
  ||s.github.branch!=='main'||s.s1.branch!=='main'
  ||s.s1.fetchRemote!==FETCH||s.s1.pushRemote!==PUSH
  ||!SHA.test(s.github.head??'')||!SHA.test(s.s1.head??'')
  ||!SHA.test(s.s1.originMain??'')||s.s1.head!==s.s1.originMain
  ||x.head!==s.s1.head||x.origin!==s.s1.originMain
  ||s.s1.workingTreeClean!==false||s.s1.diffEmpty!==false
  ||x.files.length<1||x.files.length>20)
  throw new Error('E2_LOCAL_SNAPSHOT_NOT_GOVERNED');
 const seen=new Set<string>();
 for(const f of x.files){
  if(!safeFile(f)||seen.has(f.path))
   throw new Error('E2_S1_UNSAFE_OR_UNVERIFIED_FILE');
  seen.add(f.path);
 }
}
// Fixed, read-only S1 JS. No dynamic user paths or shell expansion. Refuses
// staged/untracked/deleted/renamed files, protected locations, secrets and
// non-textual data before returning any file contents to the MCP runtime.
const S1_READ_SCRIPT=String.raw`
const fs=require("node:fs"),cp=require("node:child_process"),crypto=require("node:crypto");
const root="/opt/apps/wealthtech-mcp-ssh-bridge";
process.chdir(root);
const realRoot=fs.realpathSync(root);
const git=(args)=>{const x=cp.spawnSync("git",args,{encoding:"utf8",maxBuffer:800000,timeout:18000});
 if(x.status!==0)throw Error("E2_GIT_READ_FAILURE");return x.stdout.trim()};
const ref=(s)=>git(["rev-parse",s]);
const SHA=/^[a-f0-9]{40}$/;
const PATH=/^[A-Za-z0-9_.@+\/-]{1,220}$/;
const deny=/(^|\/)(?:\.git|\.mcp_backups|node_modules|dist|build|coverage|keys|secrets|\.env(?:\.|$))|(?:\.pem|\.p8|\.key|\.crt|\.p12|\.sql|\.dump)$/i;
const secret=/(?:-----BEGIN\s|github_pat_|gh[pousr]_[A-Za-z0-9]{15}|sk-proj-|(?:api[_-]?key|access[_-]?token|refresh[_-]?token|password|secret|private[_-]?key)\s*[:=]\s*["\x27][^"\x27]{8,})/i;
const fail=(reason)=>{process.stdout.write(JSON.stringify({ok:false,code:reason}));process.exit(1)};
try{
 if(git(["branch","--show-current"])!=="main"
   ||git(["remote","get-url","origin"])!=="git@github.com-mcp-patricked-ro:Patricked-code/MCP.git"
   ||git(["remote","get-url","--push","origin"])!=="disabled://mcp-s1-read-only")
    fail("E2_S1_REPOSITORY_IDENTITY_CHANGED");
 const head=ref("HEAD"),origin=ref("origin/main");
 if(!SHA.test(head)||!SHA.test(origin)||head!==origin)fail("E2_S1_GIT_BASE_INVALID");
 const staged=cp.spawnSync("git",["diff","--cached","--quiet"]);
 if(staged.status!==0)fail("E2_STAGED_CHANGES");
 if(git(["ls-files","--others","--exclude-standard"]).length)
   fail("E2_UNTRACKED_FILES");
 const list=git(["diff","--name-only"]).split("\n").filter(Boolean);
 const mod=git(["diff","--name-only","--diff-filter=M"]).split("\n").filter(Boolean);
 if(list.length<1||list.length>20||JSON.stringify(list)!==JSON.stringify(mod))
    fail("E2_UNSUPPORTED_CHANGE_KIND");
 const files=[];let sum=0;
 for(const path of list){
  if(!PATH.test(path)||path.startsWith("/")||path.includes("..")
     ||path.includes("//")||deny.test(path))fail("E2_UNSAFE_PATH");
  const parts=path.split("/");
  for(let i=1;i<parts.length;i++){
   const parent=fs.lstatSync(parts.slice(0,i).join("/"));
   if(parent.isSymbolicLink()||!parent.isDirectory())fail("E2_SYMLINK_PARENT");
  }
  const resolved=fs.realpathSync(path);
  if(!resolved.startsWith(realRoot+"/"))fail("E2_PATH_OUTSIDE_REPOSITORY");
  const st=fs.lstatSync(path);
  if(!st.isFile()||st.isSymbolicLink()||st.size>64000)fail("E2_UNSAFE_FILE");
  const content=fs.readFileSync(path),plain=content.toString("utf8");
  if(Buffer.from(plain,"utf8").compare(content)!==0
    ||plain.includes("\0")||secret.test(plain))fail("E2_SENSITIVE_OR_NON_TEXT_FILE");
  sum+=content.length;if(sum>120000)fail("E2_TOO_MUCH_CONTENT");
  const ls=git(["ls-files","-s","--",path]);
  const row=/^(100644|100755) ([a-f0-9]{40}) 0\t/.exec(ls);
  if(!row)fail("E2_MODE_UNVERIFIED");
  const blob=crypto.createHash("sha1").update("blob "+content.length+"\0")
    .update(content).digest("hex");
  files.push({path,mode:row[1],baseBlob:row[2],localBlob:blob,
   sizeBytes:content.length,contentBase64:content.toString("base64"),secretScan:"CLEAR"});
 }
 process.stdout.write(JSON.stringify({ok:true,head,origin,files}));
}catch{fail("E2_S1_READ_ONLY_SNAPSHOT_FAILED")}
`;
export async function readE2S1ProposalSnapshot():Promise<E2LocalSnapshot>{
 const escaped=S1_READ_SCRIPT.replace(/'/g, "'\\''");
 const result=await runReadOnlyCommand('s1',"node -e '"+escaped+"'",60_000,200_000);
 if(result.code!==0||result.stdout.length>190000)
  throw new Error('E2_S1_SNAPSHOT_READ_BLOCKED');
 let raw:unknown;try{raw=JSON.parse(result.stdout)}catch{
  throw new Error('E2_S1_SNAPSHOT_NOT_JSON');
 }
 const data=obj(raw);
 if(data?.ok!==true||!Array.isArray(data.files)
  ||!SHA.test(str(data.head)??'')||!SHA.test(str(data.origin)??''))
  throw new Error('E2_S1_SNAPSHOT_INVALID');
 return {head:data.head as string,origin:data.origin as string,
  files:data.files as E2LocalFile[]};
}
export const defaultE2ProposalPorts:E2ProposalPorts={
 readS1:readE2S1ProposalSnapshot,
 github:(endpoint,opts)=>githubJsonRequestWithServerCredential(endpoint,opts)
};
async function readBlob(port:E2ProposalPorts['github'],path:string,commit:string):Promise<string>{
 const data=await expect(port,REPO+'/contents/'+path+'?ref='+commit);
 if(data.type!=='file'||!SHA.test(str(data.sha)??''))
  throw new Error('E2_APPROVED_CONTENT_BLOB_UNAVAILABLE');
 return data.sha as string;
}
export async function proposeE2S1GithubReview(
 snapshot:LiveStateSnapshot,
 ports:E2ProposalPorts=defaultE2ProposalPorts
):Promise<E2ProposalResult>{
 const initial=await ports.readS1();validate(snapshot,initial);
 const main=snapshot.github.head!,base=initial.head;
 const live=await expect(ports.github,REPO+'/branches/main');
 if(str(obj(live.commit)?.sha)!==main)throw new Error('E2_MAIN_MOVED');
 const comparison=await expect(ports.github,REPO+'/compare/'+base+'...'+main);
 if(!['ahead','identical'].includes(str(comparison.status)??'')
  ||comparison.behind_by!==0)
  throw new Error('E2_GIT_ANCESTRY_UNVERIFIED');
 for(const file of initial.files){
  const baseBlob=await readBlob(ports.github,file.path,base);
  const mainBlob=await readBlob(ports.github,file.path,main);
  if(file.baseBlob!==baseBlob||mainBlob!==baseBlob)
   throw new Error('E2_S1_MAIN_FILE_COLLISION');
 }
 // Reobserve the entire bounded snapshot before creating any GitHub object.
 const current=await ports.readS1();
 validate(snapshot,current);
 if(JSON.stringify(current)!==JSON.stringify(initial))
  throw new Error('E2_LOCAL_SNAPSHOT_MOVED');
 const stamp=hash(JSON.stringify(initial.files.map(f=>[f.path,f.localBlob])));
 const branch='mcp/e2-s1-proposal-'+base.slice(0,12)+'-'+stamp.slice(0,12);
 const refPath=REPO+'/git/ref/heads/'+branch;
 const existing=await ports.github(refPath);
 if(existing.ok){
  // An already created branch is never overwritten or force-pushed.
  const refs=obj(existing.json);
  const sha=str(obj(refs?.object)?.sha);
  if(!SHA.test(sha??''))throw new Error('E2_EXISTING_BRANCH_INVALID');
  const pulls=await ports.github(REPO+'/pulls?state=open&head=Patricked-code:'+branch);
  if(!pulls.ok||!Array.isArray(pulls.json))throw new Error('E2_EXISTING_PR_UNVERIFIED');
  const pr=pulls.json.find(x=>obj(x)&&str(obj(x)?.head&&obj(obj(x)?.head)?.sha)===sha);
  const row=obj(pr);
  const url=str(row?.html_url);
  if(!url||!/^https:\/\/github\.com\/Patricked-code\/MCP\/pull\/\d+$/.test(url))
   throw new Error('E2_BRANCH_EXISTS_WITHOUT_VERIFIED_PR');
  for(const file of initial.files){
   if(await readBlob(ports.github,file.path,sha!)!==file.localBlob)
    throw new Error('E2_EXISTING_PROPOSAL_CONTENT_DIFFERS');
  }
  return {status:'EXISTING_PROPOSAL',url,sha:sha!,branch,created:false};
 }
 if(existing.status!==404)throw new Error('E2_GITHUB_BRANCH_LOOKUP_FAILED');
 const commit=await expect(ports.github,REPO+'/git/commits/'+main);
 const tree=str(obj(commit.tree)?.sha);
 if(!SHA.test(tree??''))throw new Error('E2_GITHUB_MAIN_TREE_UNAVAILABLE');
 const ref=await expect(ports.github,REPO+'/git/refs',{method:'POST',
  jsonBody:{ref:'refs/heads/'+branch,sha:main}},[201]);
 if(str(obj(ref.object)?.sha)!==main)
  throw new Error('E2_GITHUB_BRANCH_CREATION_UNVERIFIED');
 const blobs:Array<{path:string;mode:string;type:'blob';sha:string}>=[];
 for(const file of initial.files){
  const raw=await expect(ports.github,REPO+'/git/blobs',{method:'POST',
    jsonBody:{content:file.contentBase64,encoding:'base64'}},[201]);
  if(str(raw.sha)!==file.localBlob)
   throw new Error('E2_GITHUB_BLOB_NOT_IDENTICAL');
  blobs.push({path:file.path,mode:file.mode,type:'blob',sha:file.localBlob});
 }
 const newTree=await expect(ports.github,REPO+'/git/trees',{method:'POST',
  jsonBody:{base_tree:tree,tree:blobs}},[201]);
 if(!SHA.test(str(newTree.sha)??''))throw new Error('E2_PROPOSAL_TREE_INVALID');
 const proposed=await expect(ports.github,REPO+'/git/commits',{method:'POST',
  jsonBody:{message:'fix(e2): propose S1 changes for governed review',
    tree:newTree.sha,parents:[main]}},[201]);
 const proposalSha=str(proposed.sha);
 if(!SHA.test(proposalSha??''))throw new Error('E2_GITHUB_PROPOSAL_COMMIT_INVALID');
 await expect(ports.github,REPO+'/git/refs/heads/'+branch,{method:'PATCH',
  jsonBody:{sha:proposalSha,force:false}},[200]);
 const verifiedRef=await expect(ports.github,refPath);
 if(str(obj(verifiedRef.object)?.sha)!==proposalSha)
  throw new Error('E2_GITHUB_BRANCH_HEAD_NOT_ATTESTED');
 const pr=await expect(ports.github,REPO+'/pulls',{method:'POST',jsonBody:{
  title:'fix(e2): review unpublished S1 MCP changes',
  head:branch,base:'main',draft:true,
  body:'E2 EXTERNAL_GOVERNED_RECOVERY — corrective S1-to-GitHub proposal only.\\n'
    +'Base GitHub main: '+main+'\\nS1 checkout: '+base
    +'\\nTracked files: '+initial.files.map(f=>f.path).join(', ')
    +'\\nNo direct main push, no automatic approval, merge or deployment.\\n'
    +'Requires CI, independent security review and Governed Deploy MCP.'
 }},[201]);
 const url=str(pr.html_url);
 if(!/^https:\/\/github\.com\/Patricked-code\/MCP\/pull\/\d+$/.test(url??'')
  ||str(obj(pr.head)?.sha)!==proposalSha)
  throw new Error('E2_GITHUB_PROPOSAL_PR_UNVERIFIED');
 return {status:'PROPOSAL_OPENED',url:url!,sha:proposalSha!,branch,created:true};
}
