import assert from 'node:assert/strict';
import test from 'node:test';
import { buildUniversalCapabilityDiscovery } from '../src/provisioning/universalCapabilityDiscovery.js';
import { UNIVERSAL_ADMIN_CAPABILITIES } from '../src/provisioning/universalAdminCapabilityCatalog.js';

const existing = ['ping', 'get_project_context', 'mcp_get_current_state_inventory', 'github_create_branch'];

test('RED: additive discovery keeps EVERY prior registered MCP tool and all 165 targets separate', () => {
  const result = buildUniversalCapabilityDiscovery({existingToolNames:existing,offset:0,limit:200});
  assert.equal(result.schemaVersion,1);
  assert.equal(result.disposition,'READ_ONLY_CAPABILITY_DISCOVERY');
  assert.deepEqual(result.existingRegisteredToolNames,existing);
  assert.equal(result.counts.registeredTools,existing.length);
  assert.equal(result.counts.additionalTargetCapabilities,UNIVERSAL_ADMIN_CAPABILITIES.length);
  assert.equal(result.capabilities.length,165);
  assert.equal(result.nextOffset,null);
  assert.equal(result.runtimeWriteAuthorized,false);
  assert.equal(result.privilegesGrantedByDiscovery,false);
  assert.equal(result.operationsExecuted,false);
  assert.ok(result.capabilities.every(c=>c.exposure==='TARGET_ONLY_NOT_REGISTERED_TOOL'));
});

test('RED: filter by plane and page without changing registered tools', () => {
  const github=buildUniversalCapabilityDiscovery({existingToolNames:existing,plane:'github',offset:0,limit:10});
  assert.equal(github.counts.additionalTargetCapabilities,165);
  assert.equal(github.counts.filteredTargets,52);
  assert.equal(github.capabilities.length,10);
  assert.equal(github.nextOffset,10);
  const next=buildUniversalCapabilityDiscovery({existingToolNames:existing,plane:'github',offset:10,limit:100});
  assert.equal(next.capabilities.length,42);
  assert.equal(next.nextOffset,null);
  assert.deepEqual(next.existingRegisteredToolNames,existing);
});

test('RED: duplicate existing tools, invalid plane, offset or limit fail closed', () => {
  for (const input of [
    {existingToolNames:['ping','ping'],offset:0,limit:10},
    {existingToolNames:existing,plane:'unknown' as never,offset:0,limit:10},
    {existingToolNames:existing,offset:-1,limit:10},
    {existingToolNames:existing,offset:0,limit:0},
    {existingToolNames:existing,offset:0,limit:1000}
  ]) assert.throws(()=>buildUniversalCapabilityDiscovery(input),/CAPABILITY_DISCOVERY_/);
});

test('RED: no metadata implies an active GitHub/Plesk/Linux admin, even if its target is listed', () => {
  const result=buildUniversalCapabilityDiscovery({existingToolNames:existing,offset:0,limit:200});
  for (const id of ['github.enterprise.policies.manage','plesk.subscription.create','server.sudo.policy.manage']) {
    const capability=result.capabilities.find(c=>c.id===id);
    assert.ok(capability,id);
    assert.equal(capability?.executionReady,false);
    assert.equal(capability?.runtimeWriteAuthorized,false);
    assert.equal(capability?.requiresEffectiveDelegation,true);
  }
});

test('RED: method of work is part of the capability contract, not a replacement', () => {
  const result=buildUniversalCapabilityDiscovery({existingToolNames:existing,offset:0,limit:200});
  assert.deepEqual(result.method.principles.map(p=>p.id),
    ['GITHUB_FIRST','NO_REGRESSION','INDEPENDENT_SLICES','RED_GREEN_REGRESSION']);
  assert.ok(result.method.principles.every(p=>p.mandatory===true));
  assert.equal(result.method.canonicalParentIssue,349);
  assert.equal(result.method.canonicalPullRequest,355);
  assert.equal(result.method.deployBeforeCi,false);
});
