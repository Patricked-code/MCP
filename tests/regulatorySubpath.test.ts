import assert from 'node:assert/strict';
import test from 'node:test';
import {
  planRegulatoryS1Subpath,REGULATORY_S1_TARGET,
  type RegulatorySubpathEvidence,type RegulatorySubpathRequest
} from '../src/provisioning/regulatorySubpath.js';
const request:RegulatorySubpathRequest={
  ...REGULATORY_S1_TARGET,
  revision:'846f5f2e8cfd89231ea3104a2872290fc7146973'
};
function verified():RegulatorySubpathEvidence {
  return {
    githubRevisionOnMain:true,
    githubReadableByMcp:true,
    registryMappingVerified:true,
    subscriptionAndVhostOwnedOnS1:true,
    governedParentRealpathVerified:true,
    applicationDirectoryAbsent:true,
    ingressPathUnclaimed:true,
    nextBasePathAndAssetsVerified:true,
    deploymentAndRollbackPlanVerified:true
  };
}
test('Regulatory RED: exact S1 repo SHA mapping and HTTPS subpath are eligible only for governed consent',()=>{
 const x=planRegulatoryS1Subpath(request,verified());
 assert.deepEqual(x,{state:'READY_FOR_GOVERNED_CONSENT',reason:'ALL_PREFLIGHT_EVIDENCE_VERIFIED',target:REGULATORY_S1_TARGET,revision:request.revision,mutationPerformed:false,authorizationInferred:false});
});
test('Regulatory RED: cannot substitute domain, host, path, checkout, repository or branch',()=>{
 const alters:Partial<RegulatorySubpathRequest>[]=[
  {serverId:'S2'},{repositoryId:'Patricked-code/MCP'},{officialBranch:'dev'},
  {domain:'mcp.wealthtechinnovations.com'},{httpPath:'/mcp'},
  {httpPath:'/regulatory/admin'},{httpPath:'/regulatory/../mcp'},
  {serverPath:'/opt/apps/wealthtech-mcp-ssh-bridge'},
  {serverPath:'/var/www/vhosts/wealthtechinnovations.com/httpdocs'},
  {applicationSubdirectory:'../../secrets'},{revision:'HEAD'}
 ];
 for(const values of alters){
  const x=planRegulatoryS1Subpath({...request,...values},verified());
  assert.equal(x.state,'BLOCKED',JSON.stringify(values));
  assert.equal(x.mutationPerformed,false);
 }
});
test('Regulatory RED: missing or unknown evidence fails closed without inferring absence',()=>{
 for(const key of Object.keys(verified()) as Array<keyof RegulatorySubpathEvidence>){
  for(const value of [null,false] as const){
    const x=planRegulatoryS1Subpath(request,{...verified(),[key]:value});
    assert.equal(x.state,'BLOCKED',key+'='+value);
    assert.equal(x.mutationPerformed,false);
  }
 }
});
test('Regulatory RED: source SHA is immutable 40-hex, not a branch label',()=>{
 for(const revision of ['', 'main','f'.repeat(39),'z'.repeat(40),'f'.repeat(41)]){
   assert.equal(planRegulatoryS1Subpath({...request,revision},verified()).state,'BLOCKED');
 }
});
test('Regulatory RED: a Next.js app without /regulatory basePath is never deployment-ready',()=>{
 const evidence={...verified(),nextBasePathAndAssetsVerified:false};
 const x=planRegulatoryS1Subpath(request,evidence);
 assert.equal(x.state,'BLOCKED');
 assert.equal(x.reason,'NEXT_BASEPATH_UNVERIFIED');
});
