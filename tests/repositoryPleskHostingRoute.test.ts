import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveRepositoryPleskHostingRoute } from '../src/provisioning/repositoryPleskHostingRoute.js';
import type { GitRegistryProjectEvidence } from '../src/github/registry.js';
const repo='github:chainsolutions-wealthtech/Regulatory';
const unavailable:GitRegistryProjectEvidence={
 available:false,sourceSchemaVersion:null,digest:null,candidateDigest:null,
 mappings:[],projects:[],activationReadiness:[],serverBindings:[]
};
const known:GitRegistryProjectEvidence={
 ...unavailable,available:true,sourceSchemaVersion:2,digest:'abc',
};
const mapped:GitRegistryProjectEvidence={
 ...known,
 mappings:[{mappingId:'reg-s1',repositoryId:repo,projectId:'regulatory',
  projectUid:'regulatory',componentRole:'frontend'}],
 activationReadiness:[{mappingId:'reg-s1',status:'READY',reasonCodes:[]}],
 serverBindings:[{mappingId:'reg-s1',repositoryId:repo,projectId:'regulatory',
  projectUid:'regulatory',componentRole:'frontend',serverId:'s1',
  serverPath:'/var/www/vhosts/wealthtechinnovations.com/regulatory',
  realPath:'/var/www/vhosts/wealthtechinnovations.com/regulatory',
  realPathVerified:true,environment:'production'}]
};
test('B3j RED: one verified repo/server binding is reused without new Plesk creation',()=>{
 const r=resolveRepositoryPleskHostingRoute(repo,mapped);
 assert.equal(r.status,'REUSE_VERIFIED_SERVER_BINDING');
 assert.equal(r.serverId,'s1');
 assert.equal(r.serverPath,'/var/www/vhosts/wealthtechinnovations.com/regulatory');
 assert.equal(r.mutationAuthorized,false);
});
test('B3j RED: complete registry without repo mapping initiates Plesk discovery, not a write',()=>{
 const r=resolveRepositoryPleskHostingRoute(repo,known);
 assert.equal(r.status,'NEEDS_PLESK_DISCOVERY');
 assert.equal(r.mutationAuthorized,false);
 assert.equal(r.operationExecuted,false);
});
test('B3j RED: unavailable registry is unknown, never proof of absent hosting',()=>{
 const r=resolveRepositoryPleskHostingRoute(repo,unavailable);
 assert.equal(r.status,'BLOCKED');
 assert.equal(r.reason,'REGISTRY_NOT_ATTESTED');
});
test('B3j RED: a mapping with unverifiable physical path blocks duplicated provisioning',()=>{
 const r=resolveRepositoryPleskHostingRoute(repo,{
  ...mapped,serverBindings:[{...mapped.serverBindings![0]!,realPathVerified:false}]
 });
 assert.equal(r.status,'BLOCKED');
 assert.equal(r.reason,'EXISTING_BINDING_UNVERIFIED');
});
test('B3j RED: multiple candidate bindings or immature schema fail closed',()=>{
 assert.equal(resolveRepositoryPleskHostingRoute(repo,{
  ...mapped,serverBindings:[mapped.serverBindings![0]!,{...mapped.serverBindings![0]!,serverId:'s2'}]
 }).status,'BLOCKED');
 assert.equal(resolveRepositoryPleskHostingRoute(repo,{
  ...known,sourceSchemaVersion:1
 }).status,'BLOCKED');
});
