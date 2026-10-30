import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import {
  extendProjectContextWithUniversalCapabilities
} from '../src/provisioning/universalCapabilityDiscovery.js';
import { UNIVERSAL_ADMIN_CAPABILITIES } from '../src/provisioning/universalAdminCapabilityCatalog.js';

test('legacy project-context values are preserved and no source object is mutated', () => {
  const servers = Object.freeze({s1: 'server-1', s2: 'server-2'});
  const legacy = Object.freeze({
    name: 'wealthtech_ssh_bridge', mode: 'read-only-first',
    servers, customExistingProperty:'kept'
  });
  const before = JSON.stringify(legacy);
  const oldTools = ['ping','get_project_context','github_create_branch'];
  const extended = extendProjectContextWithUniversalCapabilities(legacy,oldTools);
  assert.deepEqual(Object.fromEntries(Object.entries(extended)
    .filter(([key])=>key!=='universalCapabilities')),legacy);
  assert.equal(JSON.stringify(legacy),before);
  assert.equal(extended.servers,servers);
  assert.equal(extended.universalCapabilities.capabilities.length,165);
  assert.equal(extended.universalCapabilities.counts.registeredTools,3);
  assert.deepEqual(extended.universalCapabilities.existingRegisteredToolNames,oldTools);
  assert.equal(extended.universalCapabilities.runtimeWriteAuthorized,false);
  assert.equal(extended.universalCapabilities.privilegesGrantedByDiscovery,false);
});

test('existing context key collision is refused, never overwritten silently',()=>{
  assert.throws(()=>extendProjectContextWithUniversalCapabilities(
    {universalCapabilities:'historical-contract'},['ping']
  ),/CAPABILITY_DISCOVERY_CONTEXT_COLLISION/);
});

test('all new targets remain separate from existing executable tool registrations',()=>{
  const extended = extendProjectContextWithUniversalCapabilities(
    {name:'wealthtech_ssh_bridge',mode:'read-only-first',servers:{}},
    ['ping','get_project_context']);
  assert.equal(extended.universalCapabilities.capabilities.length,
    UNIVERSAL_ADMIN_CAPABILITIES.length);
  assert.ok(extended.universalCapabilities.capabilities.every(c=>c.executionReady===false
    && c.runtimeWriteAuthorized===false));
  assert.ok(extended.universalCapabilities.existingRegisteredToolNames.includes('ping'));
});

test('current read-only tool registration reuses existing get_project_context, without adding fake registrations',()=>{
  const text = readFileSync('src/tools/readOnly.ts','utf8');
  assert.match(text,/server\.tool\('get_project_context'/);
  assert.match(text,/extendProjectContextWithUniversalCapabilities\(/);
  assert.ok(text.includes('getCurrentToolCatalog().tools'));
  assert.ok(text.includes('probeExistingAdminReadCapabilities()'));
  assert.doesNotMatch(text,/server\.tool\('github_admin_root'/);
});

test('canonical work instructions persist all four mandatory principles and acceptance checks',()=>{
  const plan = JSON.parse(readFileSync('docs/governance/universal-capabilities-bifurcation-20261028.json','utf8'));
  assert.equal(plan.workingMethodology.parentIssue,349);
  assert.equal(plan.workingMethodology.pullRequest,355);
  assert.equal(plan.exposureSlice.totalTargets,165);
  assert.deepEqual(plan.workingMethodology.principles.map((p:{id:string})=>p.id),[
    'GITHUB_FIRST','NO_REGRESSION','INDEPENDENT_SLICES','RED_GREEN_REGRESSION'
  ]);
  for(const p of plan.workingMethodology.principles) {
    assert.ok(p.acceptance.length>=3);
    assert.ok(p.rule.length>25);
  }
  assert.equal(plan.workingMethodology.exposurePolicy.capabilitiesAreNotRegisteredTools,undefined);
  assert.equal(plan.exposureSlice.capabilitiesAreNotRegisteredTools,true);
});

test('GD-U-02: genuine registered handlers are shown as registered but never as privileged',()=>{
  const result=extendProjectContextWithUniversalCapabilities(
    {name:'wealthtech_ssh_bridge',mode:'read-only-first',servers:{}},
    ['github_get_repository_state','github_create_branch','plesk_subdomain_preview_s1s2','ping'],
    [
      {name:'github_get_repository_state',surface:'read'},
      {name:'github_create_branch',surface:'scoped-write'},
      {name:'plesk_subdomain_preview_s1s2',surface:'read'},
      {name:'ping',surface:'read'}
    ]
  );
  const list=result.universalCapabilities.capabilities;
  const repo=list.find(c=>c.id==='github.repository.inspect');
  const branch=list.find(c=>c.id==='github.branch.create');
  const plesk=list.find(c=>c.id==='plesk.subdomain.create');
  const deletion=list.find(c=>c.id==='github.repository.delete');
  assert.equal(repo?.exposure,'REGISTERED_READ_ONLY');
  assert.equal(repo?.registeredToolName,'github_get_repository_state');
  assert.equal(branch?.exposure,'REGISTERED_GOVERNED_WRITE');
  assert.equal(branch?.registeredToolName,'github_create_branch');
  assert.equal(plesk?.exposure,'REGISTERED_PREFLIGHT_ONLY');
  assert.equal(deletion?.exposure,'TARGET_ONLY_NOT_REGISTERED_TOOL');
  assert.equal(deletion?.registeredToolName,null);
  assert.equal(repo?.runtimeHandlerRegistered,true);
  assert.equal(branch?.runtimeWriteAuthorized,false);
  assert.equal(branch?.executionReady,false);
  assert.equal(result.universalCapabilities.executableBindings.anyAdminRightGranted,false);
});

test('read-only project context exposes two work entries but only one engineering lifecycle',()=>{
  const source = readFileSync('src/tools/readOnly.ts','utf8');
  assert.match(source,/entryModel: 'ONE_COMMON_ENGINEERING_LIFECYCLE_TWO_WORK_INTAKES'/);
  assert.match(source,/thisEntry: 'EXTERNAL_GOVERNED_RECOVERY'/);
  assert.match(source,/otherEntry: 'INITIAL_GOVERNED_ENTRY'/);
  assert.match(source,/sameEngineeringValidationAndDeployPipeline: true/);
  assert.match(source,/noTaskQueueAssignmentCreatedBySelection: true/);
  assert.match(source,/requiresInternalTaskClaimForGithubOnlyOperations: false/);
  assert.doesNotMatch(source,/registerTool\('mcp_preview_external_governed_recovery'/);
});
