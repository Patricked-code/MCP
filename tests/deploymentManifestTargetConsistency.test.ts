import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assessDeploymentManifestTarget,
  type UniversalDeploymentTarget
} from '../src/provisioning/deploymentManifestTargetConsistency.js';

const target:UniversalDeploymentTarget={
  repository:'chainsolutions-wealthtech/Regulatory',
  branch:'main',server:'s1',host:'wealthtechinnovations.com',
  urlPath:'/regulatory',applicationBasePath:'/regulatory'
};
const manifest={
  schemaVersion:1,kind:'mcp-governed-deployment-target',
  status:'REQUESTED_NOT_PROVISIONED',
  source:{repository:target.repository,branch:target.branch},
  destination:{server:'s1',host:target.host,urlPath:'/regulatory',
    url:'https://wealthtechinnovations.com/regulatory'},
  application:{basePath:'/regulatory',basePathMode:'subpath-on-existing-vhost'},
  safety:{allowAutomaticProvisioning:false,
    requireServerSideAllowlist:true,requireFreshPreflight:true,
    requireGovernedClaimAndLock:true,requireExactCommitSha:true,
    requireHealthAndRollback:true,forbidSecretsInRepository:true,
    forbidOtherVhostChanges:true}
};

test('GD-U E2: exact declarative path is only a preflight, never runtime authority',()=>{
 const result=assessDeploymentManifestTarget(target,manifest);
 assert.equal(result.status,'TARGET_MATCHED_NOT_ADMITTED');
 assert.equal(result.reason,'EXACT_DECLARATIVE_TARGET_MATCH');
 assert.equal(result.runtimeWriteAuthorized,false);
 assert.equal(result.operationExecuted,false);
 assert.equal(result.manifestMutated,false);
});
test('GD-U E2: actual Regulatory dedicated-subdomain manifest is incompatible with /regulatory',()=>{
 const dedicated={...manifest,
   destination:{server:'s1',host:'regulatory.wealthtechinnovations.com',
      urlPath:'/',url:'https://regulatory.wealthtechinnovations.com/',
      subdomain:{label:'regulatory'}},
   application:{basePath:'/',basePathMode:'root-on-dedicated-subdomain'}
 };
 const r=assessDeploymentManifestTarget(target,dedicated);
 assert.equal(r.status,'BLOCKED');
 assert.equal(r.reason,'HOST_MISMATCH');
});
test('GD-U E2: host, path, source branch and repository crossovers are independently blocked',()=>{
 const trials:[unknown,string][]=[
  [{...manifest,source:{...manifest.source,repository:'other/Repo'}},'SOURCE_REPOSITORY_MISMATCH'],
  [{...manifest,source:{...manifest.source,branch:'develop'}},'SOURCE_BRANCH_MISMATCH'],
  [{...manifest,destination:{...manifest.destination,server:'s2'}},'SERVER_MISMATCH'],
  [{...manifest,destination:{...manifest.destination,urlPath:'/other'}},'URL_PATH_MISMATCH'],
  [{...manifest,application:{...manifest.application,basePath:'/'}},'APPLICATION_BASEPATH_MISMATCH'],
  [{...manifest,destination:{...manifest.destination,url:'https://evil.example/regulatory'}},'DESTINATION_URL_MISMATCH'],
  [{...manifest,destination:{...manifest.destination,url:'http://wealthtechinnovations.com/regulatory'}},'DESTINATION_URL_MISMATCH'],
  [{...manifest,destination:{...manifest.destination,subdomain:{label:'regulatory'}}},'DEPLOYMENT_MODE_MISMATCH'],
  [{...manifest,safety:{...manifest.safety,allowAutomaticProvisioning:true}},'AUTO_PROVISIONING_NOT_DISABLED']
 ];
 for(const [m,reason] of trials){
  const result=assessDeploymentManifestTarget(target,m);
  assert.equal(result.status,'BLOCKED',reason);
  assert.equal(result.reason,reason);
  assert.equal(result.runtimeWriteAuthorized,false);
 }
});
test('GD-U E2: invalid target or absent manifest always fail closed',()=>{
 for(const m of [null,undefined,{},[]]){
  assert.equal(assessDeploymentManifestTarget(target,m).status,'BLOCKED');
 }
 for(const urlPath of ['/../regulatory','//regulatory','/%2e%2e','/regulatory/']){
  assert.equal(assessDeploymentManifestTarget({...target,urlPath},manifest).reason,'TARGET_INVALID');
 }
 for(const host of ['http://wealthtechinnovations.com','LOCALHOST','*.example.com']){
  assert.equal(assessDeploymentManifestTarget({...target,host},manifest).reason,'TARGET_INVALID');
 }
});

test('GD-U E2: weakening any existing manifest safety requirement fails closed',()=>{
 const safetyKeys=[
  'requireServerSideAllowlist','requireFreshPreflight',
  'requireGovernedClaimAndLock','requireExactCommitSha',
  'requireHealthAndRollback','forbidSecretsInRepository',
  'forbidOtherVhostChanges'
 ] as const;
 for(const field of safetyKeys){
  const s= {...manifest.safety,[field]:false};
  const result=assessDeploymentManifestTarget(target,{...manifest,safety:s});
  assert.equal(result.status,'BLOCKED',field);
  assert.equal(result.reason,'DECLARED_SECURITY_GATES_INCOMPLETE',field);
 }
});

test('GD-U E2: same generic contract also accepts a separate root-domain application model',()=>{
 const other:UniversalDeploymentTarget={
  repository:'example/demo-service',branch:'main',server:'s2',
  host:'demo.example.com',urlPath:'/',applicationBasePath:'/'
 };
 const otherManifest={
  ...manifest,source:{repository:other.repository,branch:other.branch},
  destination:{server:'s2',host:'demo.example.com',urlPath:'/',
    url:'https://demo.example.com/',
    subdomain:{label:'demo'}},
  application:{basePath:'/',basePathMode:'root-on-dedicated-subdomain'}
 };
 const result=assessDeploymentManifestTarget(other,otherManifest);
 assert.equal(result.status,'TARGET_MATCHED_NOT_ADMITTED');
 assert.equal(result.runtimeWriteAuthorized,false);
 assert.equal(result.operationExecuted,false);
 assert.equal(assessDeploymentManifestTarget(target,otherManifest).status,'BLOCKED');
});
