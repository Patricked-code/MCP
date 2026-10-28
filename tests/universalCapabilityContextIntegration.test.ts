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
  assert.match(text,/getCurrentToolCatalog\(\)\.tools\.map/);
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
