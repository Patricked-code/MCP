import assert from 'node:assert/strict';
import test from 'node:test';
import {spawnSync} from 'node:child_process';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync,chmodSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
process.env.MCP_AUTH_TOKEN ??= 'e2-s1-secret-reader-test-token';
process.env.S1_HOST ??= '127.0.0.1';
process.env.S1_KEY_PATH ??= '/tmp/e2-reader-s1-test-key';
process.env.S2_HOST ??= '127.0.0.1';
process.env.S2_KEY_PATH ??= '/tmp/e2-reader-s2-test-key';
const {S1_READ_SCRIPT}=await import('../src/governance/e2S1GithubProposal.js');

test('the actual bounded S1 reader rejects quoted JSON credentials',()=>{
 const dir=mkdtempSync(join(tmpdir(),'e2-reader-'));
 const env={...process.env,GIT_AUTHOR_NAME:'E2 Test',GIT_AUTHOR_EMAIL:'e2@example.invalid',
  GIT_COMMITTER_NAME:'E2 Test',GIT_COMMITTER_EMAIL:'e2@example.invalid'};
 const git=(...args:string[])=>{
  const r=spawnSync('git',args,{cwd:dir,env,encoding:'utf8'});
  assert.equal(r.status,0,r.stderr);return r.stdout.trim();
 };
 try{
  git('init','-b','main');
  mkdirSync(join(dir,'data'));
  const path=join(dir,'data','registry.json');
  writeFileSync(path,'{"service":"example"}\n');
  git('add','.');git('commit','-m','baseline');
  git('remote','add','origin','git@github.com-mcp-patricked-ro:Patricked-code/MCP.git');
  git('remote','set-url','--push','origin','disabled://mcp-s1-read-only');
  git('update-ref','refs/remotes/origin/main',git('rev-parse','HEAD'));
  writeFileSync(path,'{"password":"example-sensitive-value"}\n');
  const script=S1_READ_SCRIPT.replace('/opt/apps/wealthtech-mcp-ssh-bridge',dir);
  const r=spawnSync('node',['-e',script],{cwd:dir,env,encoding:'utf8'});
  assert.equal(r.status,1,r.stderr);
  assert.equal(JSON.parse(r.stdout).code,'E2_SENSITIVE_OR_NON_TEXT_FILE');
 }finally{rmSync(dir,{recursive:true,force:true});}
});

test('real S1 reader rejects worktree executable-bit modifications before PR creation',()=>{
 const dir=mkdtempSync(join(tmpdir(),'e2-reader-mode-'));
 const env={...process.env,GIT_AUTHOR_NAME:'E2 Test',GIT_AUTHOR_EMAIL:'e2@example.invalid',
  GIT_COMMITTER_NAME:'E2 Test',GIT_COMMITTER_EMAIL:'e2@example.invalid'};
 const git=(...args:string[])=>{
  const r=spawnSync('git',args,{cwd:dir,env,encoding:'utf8'});
  assert.equal(r.status,0,r.stderr);return r.stdout.trim();
 };
 try{
  git('init','-b','main');
  mkdirSync(join(dir,'data'));
  const file=join(dir,'data','config.json');
  writeFileSync(file,'{"mode":"old"}\n');
  git('add','.');git('commit','-m','baseline');
  git('remote','add','origin','git@github.com-mcp-patricked-ro:Patricked-code/MCP.git');
  git('remote','set-url','--push','origin','disabled://mcp-s1-read-only');
  git('update-ref','refs/remotes/origin/main',git('rev-parse','HEAD'));
  writeFileSync(file,'{"mode":"new"}\n');
  chmodSync(file,0o755);
  const script=S1_READ_SCRIPT.replace('/opt/apps/wealthtech-mcp-ssh-bridge',dir);
  const result=spawnSync('node',['-e',script],{cwd:dir,env,encoding:'utf8'});
  assert.equal(result.status,1,result.stderr);
  assert.equal(JSON.parse(result.stdout).code,'E2_WORKTREE_MODE_CHANGED');
 }finally{rmSync(dir,{recursive:true,force:true});}
});
