import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveExecutableUniversalBindings } from '../src/provisioning/universalExecutableBindings.js';

const tools=[
  {name:'github_get_repository_state',surface:'read'},
  {name:'github_compare_refs',surface:'read'},
  {name:'github_create_branch',surface:'scoped-write'},
  {name:'github_create_commit',surface:'scoped-write'},
  {name:'github_create_pull_request',surface:'scoped-write'},
  {name:'github_merge_pull_request',surface:'scoped-write'},
  {name:'github_get_workflow_runs',surface:'read'},
  {name:'plesk_subdomain_preview_s1s2',surface:'read'},
  {name:'check_disk_s1',surface:'read'},
  {name:'check_disk_s2',surface:'read'},
  {name:'docker_status_s1',surface:'read'},
  {name:'list_domains_s1',surface:'read'},
  {name:'mcp_get_current_state_inventory',surface:'read'}
] as const;

test('RED: actual named handlers mark only verified registered functions as implemented',()=>{
  const result=resolveExecutableUniversalBindings(tools);
  assert.equal(result.kind,'RUNTIME_REGISTERED_EXECUTORS');
  assert.ok(result.bindings.length>=12);
  assert.equal(result.bindings.find(x=>x.id==='github.branch.create')?.toolName,'github_create_branch');
  assert.equal(result.bindings.find(x=>x.id==='plesk.subdomain.create')?.executionMode,'PREFLIGHT_ONLY');
  assert.equal(result.bindings.find(x=>x.id==='server.inventory.read')?.executionMode,'READ_ONLY');
  assert.equal(result.bindings.find(x=>x.id==='github.repository.delete'),undefined);
  assert.equal(result.runtimeWriteAuthorized,false);
  assert.equal(result.anyAdminRightGranted,false);
});

test('RED: write handlers are live but gated, not pre-authorized',()=>{
  const result=resolveExecutableUniversalBindings(tools);
  const write=result.bindings.find(x=>x.id==='github.git.commit');
  assert.equal(write?.executionMode,'GOVERNED_WRITE');
  assert.equal(write?.runtimeRegistered,true);
  assert.equal(write?.permissionAttested,false);
  assert.equal(write?.authorizedNow,false);
});

test('RED: absent tools are never reported operational or executable',()=>{
  const result=resolveExecutableUniversalBindings(tools.slice(0,1));
  assert.equal(result.bindings.length,1);
  assert.equal(result.bindings[0]?.id,'github.repository.inspect');
});

test('RED: tools with unexpected surface or duplicate names are rejected',()=>{
  assert.throws(()=>resolveExecutableUniversalBindings([
    {name:'github_create_branch',surface:'read'}
  ]),/EXECUTABLE_BINDING_SURFACE_MISMATCH/);
  assert.throws(()=>resolveExecutableUniversalBindings([
    {name:'github_create_branch',surface:'scoped-write'},
    {name:'github_create_branch',surface:'scoped-write'}
  ]),/EXECUTABLE_BINDING_DUPLICATE/);
});

test('RED: all mapped functions must already exist in the 165 capability catalogue',()=>{
  const result=resolveExecutableUniversalBindings(tools);
  assert.equal(result.catalogueTotal,165);
  assert.equal(new Set(result.bindings.map(x=>x.id)).size,result.bindings.length);
});
