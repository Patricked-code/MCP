import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync,mkdirSync,readFileSync,writeFileSync,readdirSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import test from 'node:test';
import {buildMcpReconcileS1ToMainCommand} from '../src/tools/mcpReconcileS1ToMain.js';
const a='a'.repeat(40),b='b'.repeat(40);
const E2='EXTERNAL_GOVERNED_RECOVERY' as const;
test('general named E2 tool builds valid Bash for a bounded multi-file preflight',()=>{
 const cmd=buildMcpReconcileS1ToMainCommand(a,b,E2,true);
 const syntax=spawnSync('bash',['-n'],{input:cmd,encoding:'utf8'});
 assert.equal(syntax.status,0,syntax.stderr);
 assert.match(cmd,/mapfile -d '' -t FILES/);
 assert.match(cmd,/git diff --name-only -z/);
 assert.match(cmd,/git hash-object/);
 assert.match(cmd,/FETCH_HEAD:\$FILE/);
 assert.match(cmd,/cmp -s/);
 assert.match(cmd,/mktemp -d/);
 assert.match(cmd,/git update-ref refs\/heads\/main/);
 assert.match(cmd,/git add --/);
 assert.match(cmd,/DEPLOY_RUNTIME_ATTESTATION_REQUIRED/);
 for(const bad of [/git reset\b/,/git clean\b/,/git checkout\b/,/git stash\b/,/git push\b/,/\brm\s+/]){
  assert.doesNotMatch(cmd,bad);
 }
});
test('bad or same SHA blocks command generation',()=>{
 assert.throws(()=>buildMcpReconcileS1ToMainCommand('not-a-sha',b,E2,true),/E2_SHA_INPUT_INVALID/);
 assert.throws(()=>buildMcpReconcileS1ToMainCommand(a,a,E2,true),/E2_SHA_INPUT_INVALID/);
});

const gitEnv={...process.env,GIT_AUTHOR_NAME:'E2 test',
 GIT_AUTHOR_EMAIL:'e2@example.invalid',GIT_COMMITTER_NAME:'E2 test',
 GIT_COMMITTER_EMAIL:'e2@example.invalid'};
function git(cwd:string,...args:string[]):string{
 const r=spawnSync('git',args,{cwd,env:gitEnv,encoding:'utf8'});
 assert.equal(r.status,0,r.stderr+' '+args.join(' '));
 return r.stdout.trim();
}
function fixture(){
 const home=mkdtempSync(join(tmpdir(),'e2-bidirectional-'));
 const server=join(home,'server'),origin=join(home,'origin.git'),publisher=join(home,'publisher');
 mkdirSync(server);git(server,'init','-b','main');
 mkdirSync(join(server,'data'));mkdirSync(join(server,'docs'));
 writeFileSync(join(server,'.gitignore'),'.mcp_backups/\n');
 writeFileSync(join(server,'data/config.json'),'{"x":0}\n');
 writeFileSync(join(server,'docs/notes.md'),'old\n');
 git(server,'add','.');git(server,'commit','-m','baseline');
 const old=git(server,'rev-parse','HEAD');
 git(home,'clone','--bare',server,origin);
 git(server,'remote','add','origin',origin);
 git(server,'remote','set-url','--push','origin','disabled://mcp-s1-read-only');
 git(home,'clone',origin,publisher);
 writeFileSync(join(publisher,'data/config.json'),'{"x":1}\n');
 writeFileSync(join(publisher,'docs/notes.md'),'new\n');
 git(publisher,'add','.');git(publisher,'commit','-m','approved main');
 const main=git(publisher,'rev-parse','HEAD');git(publisher,'push','origin','main');
 const lock=join(home,'deploy.lock');
 const script=buildMcpReconcileS1ToMainCommand(old,main,E2,true)
  .replace("cd '/opt/apps/wealthtech-mcp-ssh-bridge'",'cd '+JSON.stringify(server))
  .replace('exec 9>/opt/apps/wealthtech-mcp-deploy/deploy.lock','exec 9>'+JSON.stringify(lock))
  .replace("git@github.com-mcp-patricked-ro:Patricked-code/MCP.git",origin);
 const execute=()=>spawnSync('bash',['-c',script],{cwd:server,env:gitEnv,encoding:'utf8'});
 return {home,server,old,main,execute};
}
test('general E2 reconciliation preserves TWO local files already approved in main',()=>{
 const f=fixture();
 try{
  writeFileSync(join(f.server,'data/config.json'),'{"x":1}\n');
  writeFileSync(join(f.server,'docs/notes.md'),'new\n');
  const before=[readFileSync(join(f.server,'data/config.json')),
   readFileSync(join(f.server,'docs/notes.md'))];
  const r=f.execute();
  assert.equal(r.status,0,r.stdout+'\n'+r.stderr);
  assert.match(r.stdout,/E2_GIT_CONVERGED=YES/);
  assert.match(r.stdout,/FILE_COUNT=2/);
  assert.equal(git(f.server,'rev-parse','HEAD'),f.main);
  assert.equal(git(f.server,'status','--porcelain'),'');
  assert.deepEqual(readFileSync(join(f.server,'data/config.json')),before[0]);
  assert.deepEqual(readFileSync(join(f.server,'docs/notes.md')),before[1]);
  const backups=readdirSync(join(f.server,'.mcp_backups'));
  assert.equal(backups.length,1);
  assert.deepEqual(readFileSync(join(f.server,'.mcp_backups',backups[0]!,'data/config.json')),before[0]);
  assert.deepEqual(readFileSync(join(f.server,'.mcp_backups',backups[0]!,'docs/notes.md')),before[1]);
 }finally{rmSync(f.home,{recursive:true,force:true})}
});
test('unapproved local content fails closed with Git HEAD and local data unchanged',()=>{
 const f=fixture();
 try{
  writeFileSync(join(f.server,'data/config.json'),'{"x":999}\n');
  writeFileSync(join(f.server,'docs/notes.md'),'new\n');
  const r=f.execute();
  assert.equal(r.status,85,r.stdout+'\n'+r.stderr);
  assert.equal(git(f.server,'rev-parse','HEAD'),f.old);
  assert.equal(readFileSync(join(f.server,'data/config.json'),'utf8'),'{"x":999}\n');
 }finally{rmSync(f.home,{recursive:true,force:true})}
});
test('unexpected untracked file blocks generalized synchronization without removing it',()=>{
 const f=fixture();
 try{
  writeFileSync(join(f.server,'data/config.json'),'{"x":1}\n');
  writeFileSync(join(f.server,'docs/notes.md'),'new\n');
  writeFileSync(join(f.server,'unexpected.txt'),'keep\n');
  const r=f.execute();
  assert.equal(r.status,76,r.stdout+'\n'+r.stderr);
  assert.equal(git(f.server,'rev-parse','HEAD'),f.old);
  assert.equal(readFileSync(join(f.server,'unexpected.txt'),'utf8'),'keep\n');
 }finally{rmSync(f.home,{recursive:true,force:true})}
});

test('scoped command refuses any nonexplicit E2 entry independently of write flag',()=>{
 assert.throws(()=>buildMcpReconcileS1ToMainCommand(a,b,E2,false),
   /E2_EXPLICIT_SELECTION_REQUIRED/);
 assert.throws(()=>buildMcpReconcileS1ToMainCommand(a,b,'E1' as any,true),
   /E2_EXPLICIT_SELECTION_REQUIRED/);
});
