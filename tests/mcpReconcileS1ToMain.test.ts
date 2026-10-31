import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import test from 'node:test';
import {buildMcpReconcileS1ToMainCommand} from '../src/tools/mcpReconcileS1ToMain.js';
const a='a'.repeat(40),b='b'.repeat(40);
test('general named E2 tool builds valid Bash for a bounded multi-file preflight',()=>{
 const cmd=buildMcpReconcileS1ToMainCommand(a,b);
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
 assert.throws(()=>buildMcpReconcileS1ToMainCommand('not-a-sha',b),/E2_SHA_INPUT_INVALID/);
 assert.throws(()=>buildMcpReconcileS1ToMainCommand(a,a),/E2_SHA_INPUT_INVALID/);
});
