import assert from 'node:assert/strict';
import test from 'node:test';
import { parseDockerReferenceInventory,collectDockerReferences } from '../src/infrastructureLifecycle/dockerInventory.js';
const a='sha256:'+'a'.repeat(64),b='sha256:'+'b'.repeat(64);
test('Docker tag aliases are counted without inventing reclaimable bytes or permission',()=>{
  const result=parseDockerReferenceInventory([a+'\trepo\tcurrent',a+'\trepo\told',a+'\trepo\told',b+'\t<none>\t<none>'].join('\n'),1);
  assert.deepEqual(result,{status:'OBSERVED',observedAtMs:1,uniqueImageIds:2,taggedReferences:2,
    imagesWithMultipleTags:1,additionalTagReferences:1,untaggedImageIds:1,
    physicalReclaimableBytes:null,deletionAllowed:false,writesPerformed:false});
});
test('Docker inventory rejects ambiguous references, truncated output and malformed IDs',()=>{
  for(const value of [a+'\tr\tt\n'+b+'\tr\tt','short\tr\tt','...[sortie plafonnée par le MCP]',a+'\tr\t<none>'])
    assert.equal(parseDockerReferenceInventory(value,1).status,'UNVERIFIED');
});
test('Docker read uses bounded fixed command, refuses transport failures',async()=>{
  const result=await collectDockerReferences('s1',async(host,command,timeout,max)=>{
    assert.equal(host,'s1');assert.match(command,/^docker image ls --all --no-trunc --format /);
    assert.equal(timeout,15000);assert.equal(max,100000);
    return {stdout:a+'\tr\tt\n',stderr:'',code:0};
  },()=>1);
  assert.equal(result.status,'OBSERVED');
  assert.equal((await collectDockerReferences('s1',async()=>({stdout:'',stderr:'unavailable',code:1}),()=>1)).status,'UNVERIFIED');
});
