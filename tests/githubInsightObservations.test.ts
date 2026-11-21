import test from 'node:test';
import assert from 'node:assert/strict';
import {
  observeAuthorizedGithubInsights, GITHUB_INSIGHT_SOURCES,
  type GithubVerifiedInsightScope, type GithubInsightsReadPort
} from '../src/registryFederation/githubInsightObservations.js';

const now='2026-11-21T20:00:00Z';
const scope: GithubVerifiedInsightScope = {
  authority:'GIT_REGISTRY_VERIFIED_BINDING',
  repository:'ExampleOrg/ExampleRepo',
  githubNumericId:12345,
  projectId:'PROJECT-001',
  mappingId:'MAP-001',
  verifiedAt:now,
  evidenceRef:'gitregistry:verified:12345'
};
const responses: Readonly<Record<string,unknown>> = {
  REPOSITORY: {id:12345,full_name:'ExampleOrg/ExampleRepo',fork:false},
  SBOM: {sbom:{spdxVersion:'SPDX-2.3',packages:[{SPDXID:'SPDXRef-Package'}]}},
  DEPENDABOT_ALERTS:[],CODE_SCANNING_ALERTS:[],SECRET_SCANNING_ALERTS:[],
  WORKFLOWS:{workflows:[],total_count:0},RULESETS:[],FORKS:[],
  TRAFFIC:{views:[],count:0,uniques:0}
};
const prefix='/repos/ExampleOrg/ExampleRepo';
function source(path:string):string {
  if(path===prefix)return 'REPOSITORY';
  if(path.includes('/dependency-graph/sbom'))return 'SBOM';
  if(path.includes('/dependabot/alerts'))return 'DEPENDABOT_ALERTS';
  if(path.includes('/code-scanning/alerts'))return 'CODE_SCANNING_ALERTS';
  if(path.includes('/secret-scanning/alerts'))return 'SECRET_SCANNING_ALERTS';
  if(path.includes('/actions/workflows'))return 'WORKFLOWS';
  if(path.includes('/rulesets'))return 'RULESETS';
  if(path.includes('/forks'))return 'FORKS';
  if(path.includes('/traffic/views'))return 'TRAFFIC';
  return 'UNEXPECTED';
}
test('exact scoped repository produces a bounded, reproducible read-only snapshot',async()=>{
  const paths:string[]=[];
  const read:GithubInsightsReadPort=async(path)=>{paths.push(path);return {status:200,data:responses[source(path)]};};
  const a=await observeAuthorizedGithubInsights({scope,observedAt:now,read});
  const b=await observeAuthorizedGithubInsights({scope,observedAt:now,read});
  assert.equal(paths.length,GITHUB_INSIGHT_SOURCES.length*2);
  assert.equal(a.status,'SOURCE_VERIFIED');
  assert.equal(a.digest,b.digest);
  assert.equal(a.observations.length,GITHUB_INSIGHT_SOURCES.length);
  assert.equal(a.observations.find(x=>x.source==='SBOM')?.observedItems,1);
  assert.equal(a.mutationPerformed,false);
  assert.equal(a.executionAuthorized,false);
  assert.equal(a.coverageClaims,false);
  assert.ok(a.observations.every(x=>x.endpoint.startsWith(prefix)));
});
test('403/404 cannot be declared DISABLED or silently hide missing coverage',async()=>{
  const read:GithubInsightsReadPort=async path=>{
    const key=source(path);
    return key==='DEPENDABOT_ALERTS'?{status:403,data:{message:'not authorized'}}
      :key==='CODE_SCANNING_ALERTS'?{status:404,data:null}
      :{status:200,data:responses[key]};
  };
  const a=await observeAuthorizedGithubInsights({scope,observedAt:now,read});
  assert.equal(a.status,'PARTIAL');
  assert.equal(a.observations.find(x=>x.source==='DEPENDABOT_ALERTS')?.status,'ACCESS_DENIED');
  assert.equal(a.observations.find(x=>x.source==='CODE_SCANNING_ALERTS')?.status,'NOT_FOUND_OR_UNAVAILABLE');
  assert.ok(a.observations.every(x=>x.status!=='NOT_CHECKED'));
});
test('a wrong GitHub numeric ID fails closed before scanning any security endpoints',async()=>{
  const paths:string[]=[];
  const read:GithubInsightsReadPort=async path=>{
    paths.push(path);return {status:200,data:{...responses.REPOSITORY as object,id:22222}};
  };
  const a=await observeAuthorizedGithubInsights({scope,observedAt:now,read});
  assert.equal(a.status,'BLOCKED');
  assert.deepEqual(paths,[prefix]);
  assert.equal(a.observations.length,1);
});
test('stale or malformed project identity prevents all reads',async()=>{
  let calls=0;
  const read:GithubInsightsReadPort=async()=>{calls++;return {status:200,data:{}};};
  await assert.rejects(
    observeAuthorizedGithubInsights({scope:{...scope,verifiedAt:'2026-11-21T19:00:00Z'},observedAt:now,read}),
    /GITHUB_INSIGHTS_VERIFIED_SCOPE_REQUIRED/
  );
  await assert.rejects(
    observeAuthorizedGithubInsights({scope:{...scope,repository:'ExampleOrg/Other/Repo'},observedAt:now,read}),
    /GITHUB_INSIGHTS_VERIFIED_SCOPE_REQUIRED/
  );
  await assert.rejects(
    observeAuthorizedGithubInsights({scope:{...scope,repository:'ExampleOrg/..'},observedAt:now,read}),
    /GITHUB_INSIGHTS_VERIFIED_SCOPE_REQUIRED/
  );
  assert.equal(calls,0);
});
test('untrusted API exceptions do not crash observation or leak provider error',async()=>{
  const read:GithubInsightsReadPort=async path=>{
    if(path.includes('/rulesets'))throw new Error('SECRET_AUTHORIZATION_VALUE');
    return {status:200,data:responses[source(path)]};
  };
  const a=await observeAuthorizedGithubInsights({scope,observedAt:now,read});
  assert.equal(a.status,'PARTIAL');
  const one=a.observations.find(x=>x.source==='RULESETS');
  assert.equal(one?.status,'ERROR');
  assert.equal(one?.reason,'GITHUB_API_UNAVAILABLE');
  assert.doesNotMatch(JSON.stringify(a),/SECRET_AUTHORIZATION_VALUE/);
});
test('100-row API first page is PARTIAL and cannot assert complete coverage',async()=>{
  const read:GithubInsightsReadPort=async path=>{
    if(path.includes('/forks'))return {status:200,data:Array(100).fill({id:1})};
    return {status:200,data:responses[source(path)]};
  };
  const a=await observeAuthorizedGithubInsights({scope,observedAt:now,read});
  const forks=a.observations.find(x=>x.source==='FORKS');
  assert.equal(forks?.status,'PARTIAL');
  assert.equal(forks?.complete,false);
  assert.equal(forks?.observedItems,100);
  assert.equal(a.status,'PARTIAL');
});
