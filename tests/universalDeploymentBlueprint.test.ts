import assert from 'node:assert/strict';
import test from 'node:test';
import { buildUniversalDeploymentBlueprint } from '../src/provisioning/universalDeploymentBlueprint.js';
import {
  findUniversalAdminCapability, type DelegatedCapabilityEvidence
} from '../src/provisioning/universalAdminCapabilityCatalog.js';
import type { UniversalAutonomyAdviceInput } from '../src/provisioning/universalAutonomyAdvice.js';

const at = '2026-10-28T04:40:00.000Z';
const sha = '48a529889517aa1c11974802d23acc3f35e0f187';
const repository='chainsolutions-wealthtech/Regulatory';
const autonomy = ():UniversalAutonomyAdviceInput=>({
  at,
  candidate: {
    candidateSessionId:'chatgpt',agentIdentity:'ChatGPT',activeClaims:[],
    workItems:[{
      workItemId:'GD-U-02',intentKeys:['deployment'],title:'Review deploy',
      status:'READY',priority:70,sequence:1,dependencies:[],
      collisionDomains:['project:regulatory','s1:wealthtechinnovations']
    }]
  },
  github:{
    request:{repository,operation:'repository.read',now:at},
    observation:{
      source:'GITHUB_API',installationId:123,
      accountLogin:'chainsolutions-wealthtech',repositorySelection:'all',
      repositoryIncluded:null,repositoryAccessible:true,
      permissions:{contents:'read'},observedAt:at
    }
  },
  exactHeads:{githubMain:sha,serverCheckout:sha,runtimeRevision:sha},
  target:{mode:'NO_INFRA_CHANGE'}
});
const base=()=>({
  sourceRepository:repository,mcpRepository:'Patricked-code/MCP',sourceSha:sha,serverId:'s1' as const,
  domain:'wealthtechinnovations.com',mode:'DEDICATED_DOMAIN' as const,path:null,at,
  existingAutonomy:autonomy(),
  evidenceByCapability:{} as Record<string,DelegatedCapabilityEvidence|null>
});
const allPermissions=():Record<string,DelegatedCapabilityEvidence|null>=>{
  const ids=[
    'github.repository.inspect','github.git.compare','github.actions.dispatch',
    'server.filesystem.write','plesk.domain.create','plesk.tls.certificate.manage',
    'server.application.build','server.application.deploy','server.application.health',
    'intelligence.evidence.attest','server.application.rollback'
  ];
  return Object.fromEntries(ids.map(id=>{
    const c=findUniversalAdminCapability(id)!;
    const source=c.plane==='github'?'GITHUB_API'
      :c.plane==='server'?'SERVER_ATTESTATION'
      :c.plane==='plesk'?'PLESK_API':'GOVERNED_RUNTIME';
    const scope=c.plane==='github'?'github:'+repository
      :c.plane==='plesk'?'plesk:s1:wealthtechinnovations.com'
      :c.plane==='server'?'server:s1':'runtime:Patricked-code/MCP';
    return [id,{source,principalId:'delegated-identity',scope,observedAt:at,
      resourceAccessible:true,availablePermissionHints:[c.permissionHint]}];
  })) as Record<string,DelegatedCapabilityEvidence|null>;
};

test('universal deploy plan remains HOLD when no cross-plane delegated evidence exists',()=>{
  const p=buildUniversalDeploymentBlueprint(base());
  assert.equal(p.disposition,'HOLD');
  assert.ok(p.reasonCodes.includes('CAPABILITY_EVIDENCE_INCOMPLETE'));
  assert.equal(p.steps.length,11);
  assert.ok(p.steps.every(s=>s.status==='BLOCKED'));
  assert.equal(p.operationExecuted,false);
  assert.equal(p.runtimeWriteAuthorized,false);
});

test('complete delegated evidence is a proposal to EXISTING governance, never auto-execution',()=>{
  const p=buildUniversalDeploymentBlueprint({...base(),evidenceByCapability:allPermissions()});
  assert.equal(p.disposition,'PROPOSE_FOR_EXISTING_ADMISSION');
  assert.equal(p.reasonCodes.length,0);
  assert.equal(p.steps.length,11);
  assert.deepEqual(p.steps.map(s=>s.stepId),Array.from({length:11},(_,i)=>'GD-STEP-'+String(i+1).padStart(2,'0')));
  assert.equal(p.steps[0]?.dependsOn.length,0);
  for(let i=1;i<p.steps.length;i++) assert.deepEqual(p.steps[i]?.dependsOn,[p.steps[i-1]?.stepId]);
  assert.ok(p.steps.every(s=>s.status==='PERMISSION_OBSERVED_NOT_ADMITTED'));
  assert.equal(p.runtimeWriteAuthorized,false);
  assert.equal(p.operationExecuted,false);
});

test('subpath on existing vhost is never remapped silently into subdomain',()=>{
  const input=base();
  const p=buildUniversalDeploymentBlueprint({
    ...input,mode:'EXISTING_HOST_SUBPATH',path:'/regulatory',evidenceByCapability:allPermissions(),
    existingAutonomy:{...input.existingAutonomy,target:{
      mode:'EXISTING_HOST_SUBPATH',host:'wealthtechinnovations.com',path:'/regulatory'
    }}
  });
  assert.equal(p.disposition,'HOLD');
  assert.equal(p.target,'wealthtechinnovations.com/regulatory');
  assert.equal(p.steps[4]?.capabilityId,'plesk.host.subpath.provision');
  assert.ok(p.reasonCodes.includes('SUBPATH_ADAPTER_NOT_ATTESTED'));
  assert.ok(!p.steps.some(s=>s.capabilityId==='plesk.subdomain.create'));
});

test('subdomain target selects Plesk subdomain adapter and retains independent admission',()=>{
  const input=base();
  const plan=buildUniversalDeploymentBlueprint({
    ...input,mode:'SUBDOMAIN',path:null,
    domain:'wealthtechinnovations.com',
    existingAutonomy:{...input.existingAutonomy,target:{
      mode:'SUBDOMAIN',evidenceSource:'LIVE_PLESK_AND_FILESYSTEM',observedAt:at,
      input:{serverId:'s1',parentDomain:'wealthtechinnovations.com',label:'demo',
        documentRoot:'/demo',evidence:{
          parentExists:true,targetExists:false,documentRootExists:false,
          subscriptionAuthorized:true,documentRootSafe:true,targetOwnedByProvisioner:false
        }}
    }}
  });
  assert.equal(plan.steps[4]?.capabilityId,'plesk.subdomain.create');
  assert.equal(plan.disposition,'HOLD');
  assert.ok(plan.reasonCodes.includes('CAPABILITY_EVIDENCE_INCOMPLETE'));
});

test('source SHA and invalid subpath fail closed before attempting any planning',()=>{
  for(const input of [
    {...base(),sourceSha:'not-a-sha'},
    {...base(),domain:'evil.example;sh'},
    {...base(),mode:'EXISTING_HOST_SUBPATH' as const,path:'/../escape'}
  ]){
    const p=buildUniversalDeploymentBlueprint(input);
    assert.equal(p.disposition,'HOLD');
    assert.equal(p.steps.length,0);
    assert.equal(p.operationExecuted,false);
  }
});

test('cross-plane witness missing one critical Plesk permission blocks the entire blueprint',()=>{
  const e=allPermissions();
  e['plesk.tls.certificate.manage']=null;
  const p=buildUniversalDeploymentBlueprint({...base(),evidenceByCapability:e});
  assert.equal(p.disposition,'HOLD');
  assert.equal(p.steps.find(s=>s.capabilityId==='plesk.tls.certificate.manage')?.status,'BLOCKED');
});
