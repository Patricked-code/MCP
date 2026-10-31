import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync,mkdirSync,readFileSync,writeFileSync,existsSync,readdirSync,rmSync,chmodSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import test from 'node:test';
import {buildMcpS1ExactContentReconcileCommand}
  from '../src/tools/mcpS1ExactContentReconcile.js';

const OLD_JSON='{"version":1,"accounts":[{"owner":"Wealthtechinnovations","type":"organization_or_user"}]}\n';
const NEW_JSON='{"version":1,"accounts":[{"owner":"Wealthtechinnovations","type":"user"}]}\n';
const GIT_ENV={...process.env,
 GIT_AUTHOR_NAME:'MCP E2 test',GIT_AUTHOR_EMAIL:'mcp-e2@example.invalid',
 GIT_COMMITTER_NAME:'MCP E2 test',GIT_COMMITTER_EMAIL:'mcp-e2@example.invalid'};
function git(cwd:string,...args:string[]):string{
 const r=spawnSync('git',args,{cwd,env:GIT_ENV,encoding:'utf8'});
 assert.equal(r.status,0,'git '+args.join(' ')+': '+r.stderr);
 return r.stdout.trim();
}
function fixture(){
 const home=mkdtempSync(join(tmpdir(),'mcp-e2-s1-reconcile-'));
 const server=join(home,'server');
 const origin=join(home,'origin.git');
 const publisher=join(home,'publisher');
 mkdirSync(server);git(server,'init','-b','main');
 mkdirSync(join(server,'data'));
 writeFileSync(join(server,'.gitignore'),'.mcp_backups/\n');
 writeFileSync(join(server,'data/github-accounts.json'),OLD_JSON);
 git(server,'add','.');
 git(server,'commit','-m','baseline');
 const old=git(server,'rev-parse','HEAD');
 git(home,'clone','--bare',server,origin);
 git(server,'remote','add','origin',origin);
 git(server,'remote','set-url','--push','origin','disabled://mcp-s1-read-only');
 git(home,'clone',origin,publisher);
 return {home,server,origin,publisher,old};
}
function publish(f:ReturnType<typeof fixture>,extraFile=false,modeChange=false){
 writeFileSync(join(f.publisher,'data/github-accounts.json'),NEW_JSON);
 if(modeChange)chmodSync(join(f.publisher,'data/github-accounts.json'),0o755);
 if(extraFile)writeFileSync(join(f.publisher,'new.txt'),'extra unrelated change\n');
 git(f.publisher,'add','.');
 git(f.publisher,'commit','-m','approve account registry change');
 const main=git(f.publisher,'rev-parse','HEAD');
 git(f.publisher,'push','origin','main');
 return main;
}
function execute(f:ReturnType<typeof fixture>,main:string){
 const command=buildMcpS1ExactContentReconcileCommand(f.old,main)
   .replace("cd '/opt/apps/wealthtech-mcp-ssh-bridge'",'cd '+JSON.stringify(f.server))
   .replace("EXPECTED_FETCH_REMOTE='git@github.com-mcp-patricked-ro:Patricked-code/MCP.git'",
     'EXPECTED_FETCH_REMOTE='+JSON.stringify(f.origin));
 return spawnSync('bash',['-c',command],{encoding:'utf8',env:GIT_ENV});
}
test('reconciles approved exact-content S1 modification WITHOUT changing file bytes',()=>{
 const f=fixture();
 try{
  const main=publish(f);
  writeFileSync(join(f.server,'data/github-accounts.json'),NEW_JSON);
  const before=readFileSync(join(f.server,'data/github-accounts.json'));
  const r=execute(f,main);
  assert.equal(r.status,0,r.stdout+'\n'+r.stderr);
  assert.match(r.stdout,/E2_S1_GIT_RECONCILED=YES/);
  assert.equal(git(f.server,'rev-parse','HEAD'),main);
  assert.equal(git(f.server,'status','--porcelain','--untracked-files=all'),'');
  assert.deepEqual(readFileSync(join(f.server,'data/github-accounts.json')),before);
  const dir=join(f.server,'.mcp_backups');
  const backups=readdirSync(dir);
  assert.equal(backups.length,1);
  assert.deepEqual(readFileSync(join(dir,backups[0]!,'github-accounts.json')),before);
 }finally{rmSync(f.home,{recursive:true,force:true})}
});
test('refuses unmatched S1 file content and leaves HEAD unchanged',()=>{
 const f=fixture();
 try{
  const main=publish(f);
  writeFileSync(join(f.server,'data/github-accounts.json'),'{}\n');
  const r=execute(f,main);
  assert.equal(r.status,81,r.stdout+'\n'+r.stderr);
  assert.match(r.stdout,/E2_LOCAL_CONTENT_DIFFERS_FROM_APPROVED_MAIN/);
  assert.equal(git(f.server,'rev-parse','HEAD'),f.old);
  assert.equal(readFileSync(join(f.server,'data/github-accounts.json'),'utf8'),'{}\n');
 }finally{rmSync(f.home,{recursive:true,force:true})}
});
test('refuses unrelated untracked change; never cleans or removes it',()=>{
 const f=fixture();
 try{
  const main=publish(f);
  writeFileSync(join(f.server,'data/github-accounts.json'),NEW_JSON);
  writeFileSync(join(f.server,'unrelated.txt'),'must remain\n');
  const r=execute(f,main);
  assert.equal(r.status,76,r.stdout+'\n'+r.stderr);
  assert.equal(git(f.server,'rev-parse','HEAD'),f.old);
  assert.equal(readFileSync(join(f.server,'unrelated.txt'),'utf8'),'must remain\n');
 }finally{rmSync(f.home,{recursive:true,force:true})}
});
test('refuses approved main with unrelated repository changes',()=>{
 const f=fixture();
 try{
  const main=publish(f,true);
  writeFileSync(join(f.server,'data/github-accounts.json'),NEW_JSON);
  const r=execute(f,main);
  assert.equal(r.status,80,r.stdout+'\n'+r.stderr);
  assert.equal(git(f.server,'rev-parse','HEAD'),f.old);
  assert.equal(readFileSync(join(f.server,'data/github-accounts.json'),'utf8'),NEW_JSON);
 }finally{rmSync(f.home,{recursive:true,force:true})}
});
test('approved executable-bit drift blocks registry HEAD mutation',()=>{
 const f=fixture();
 try{
  const main=publish(f,false,true);
  writeFileSync(join(f.server,'data/github-accounts.json'),NEW_JSON);
  const r=execute(f,main);
  assert.equal(r.status,87,r.stdout+'\n'+r.stderr);
  assert.match(r.stdout,/E2_REGISTRY_MODE_NOT_APPROVED/);
  assert.equal(git(f.server,'rev-parse','HEAD'),f.old);
  assert.equal(git(f.server,'diff','--cached','--name-only'),'');
  assert.equal(readFileSync(join(f.server,'data/github-accounts.json'),'utf8'),NEW_JSON);
 }finally{rmSync(f.home,{recursive:true,force:true})}
});
test('rejects stale HEAD, invalid SHA, and forbids destructive operations',()=>{
 const a='a'.repeat(40),b='b'.repeat(40);
 assert.throws(()=>buildMcpS1ExactContentReconcileCommand('bad',b),
   /E2_EXACT_SHA_RECONCILIATION_INPUT_INVALID/);
 assert.throws(()=>buildMcpS1ExactContentReconcileCommand(a,a),
   /E2_EXACT_SHA_RECONCILIATION_INPUT_INVALID/);
 const script=buildMcpS1ExactContentReconcileCommand(a,b);
 assert.equal(spawnSync('bash',['-n'],{input:script,encoding:'utf8'}).status,0);
 for(const bad of [/git reset\b/,/git clean\b/,/git checkout\b/,
 /git stash\b/,/git push\b/,/\brm\s/,/\bmv\s/]){
  assert.doesNotMatch(script,bad);
 }
});
