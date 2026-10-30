import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';
import {UNIVERSAL_ADMIN_CAPABILITIES} from '../src/provisioning/universalAdminCapabilityCatalog.js';

type Row=Readonly<{
 ordinal:number;capabilityId:string;plane:string;classification:string;
 explicitBinding:null|Readonly<{toolName:string;toolRegistered:boolean;surfaceMatches:boolean}>;
 providerPermissionAttested:boolean;runtimeWriteAdmissionAttested:boolean;
 realOperationAttested:boolean;testsIndividuallyAttested:boolean;
}>;
const source=new URL('../docs/governance/gd-u-e2/capability-evidence-current-20261030.json',import.meta.url);
const load=async()=>JSON.parse(await readFile(source,'utf8')) as {
 continuityId:string;workEntry:string;sourceMainSha:string;
 totals:{catalogueTargetCount:number;runtimeAllToolCount:number;explicitBindingCount:number;
 liveRegisteredExplicitBindings:number;unboundTargetCount:number};
 items:Row[];
};
test('GD-U E2: dated matrix covers every catalogue target exactly once, no missing or fabricated ID',async()=>{
 const a=await load();
 assert.equal(a.continuityId,'GD-U-CONT-20261030-ROOT-01');
 assert.equal(a.workEntry,'EXTERNAL_GOVERNED_RECOVERY');
 assert.match(a.sourceMainSha,/^[a-f0-9]{40}$/);
 assert.equal(a.items.length,165);
 assert.equal(a.totals.catalogueTargetCount,UNIVERSAL_ADMIN_CAPABILITIES.length);
 assert.deepEqual(a.items.map(x=>x.capabilityId),UNIVERSAL_ADMIN_CAPABILITIES.map(x=>x.id));
 assert.deepEqual(a.items.map(x=>x.plane),UNIVERSAL_ADMIN_CAPABILITIES.map(x=>x.plane));
 assert.deepEqual(a.items.map(x=>x.ordinal),Array.from({length:165},(_,i)=>i+1));
 assert.equal(new Set(a.items.map(x=>x.capabilityId)).size,165);
});
test('GD-U E2: evidence count is internally consistent, runtime registration is not permission',async()=>{
 const a=await load();
 assert.equal(a.items.filter(x=>x.explicitBinding!==null).length,a.totals.explicitBindingCount);
 assert.equal(a.items.filter(x=>x.explicitBinding===null).length,a.totals.unboundTargetCount);
 assert.equal(a.items.filter(x=>x.explicitBinding?.toolRegistered&&x.explicitBinding.surfaceMatches).length,
  a.totals.liveRegisteredExplicitBindings);
 assert.equal(a.totals.runtimeAllToolCount,139);
 assert.ok(a.items.every(x=>x.providerPermissionAttested===false
   &&x.runtimeWriteAdmissionAttested===false
   &&x.realOperationAttested===false
   &&x.testsIndividuallyAttested===false));
 const preview=a.items.find(x=>x.capabilityId==='plesk.subdomain.create');
 assert.ok(preview?.explicitBinding?.toolRegistered);
 assert.equal(preview?.classification,'EXPLICIT_BINDING_REGISTERED');
 assert.ok(a.items.every(x=>x.classification==='NO_EXPLICIT_BINDING'
  ||x.classification==='EXPLICIT_BINDING_REGISTERED'));
});
