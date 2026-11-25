import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { GitHubJsonResponse, GitHubJsonRequestOptions } from '../src/github/connection.js';

// No network, no production secret, no actual GitHub mutation.
process.env.MCP_AUTH_TOKEN ??= 'unit-test-only-not-a-runtime-token';
process.env.S1_HOST ??= '127.0.0.1';
process.env.S1_KEY_PATH ??= '/tmp/workers-project4-test-s1-unused';
process.env.S2_HOST ??= '127.0.0.1';
process.env.S2_KEY_PATH ??= '/tmp/workers-project4-test-s2-unused';

const {
  inspectProjectStructure,
  runProjectWorkflowReadOnly,
  WORKERS_STRUCTURE_QUERY,
  WORKERS_WORKFLOW_CONTRACTS,
  PUBLIC_MEMORY_PROJECTION
} = await import('../src/tools/githubProjectWorkflows.js');

const access = {
  viewer: { login: 'Patricked-code' },
  user: { projectV2: {
    id: 'PVT_4_REAL_AT_RUNTIME', number: 4, title: 'WORKERS',
    url: 'https://github.com/users/Patricked-code/projects/4',
    public: true, viewerCanUpdate: true
  } }
};
const structure = {
  viewer: { login: 'Patricked-code' },
  user: { projectV2: {
    id: 'PVT_4_REAL_AT_RUNTIME', number: 4, title: 'WORKERS',
    url: 'https://github.com/users/Patricked-code/projects/4', public: true,
    fields: { pageInfo: { hasNextPage: false }, nodes: [
      { id: 'field-title', name: 'Title' },
      { id: 'field-memory', name: 'Memoire_ID' }
    ] },
    views: { pageInfo: { hasNextPage: false }, nodes: [
      { id: 'view-memory', name: 'Memoire', layout: 'TABLE_LAYOUT' }
    ] },
    items: { totalCount: 2 }
  } }
};
const response = (data: unknown, status=200): GitHubJsonResponse => ({
  ok: status===200, status, json: { data }, tokenExpiresAt: null, oauthScopes: []
});
function fakeRequest(
  opts: { access?: typeof access; structure?: typeof structure; count?: { n: number } } = {}
) {
  return async (endpoint: string, options?: GitHubJsonRequestOptions): Promise<GitHubJsonResponse> => {
    assert.equal(endpoint, '/graphql');
    assert.equal(options?.method, 'POST'); // POST is permitted for GraphQL query, NOT a mutation
    const body = options?.jsonBody as { query: string; variables: { owner: string; number: number } };
    assert.deepEqual(body.variables, { owner: 'Patricked-code', number: 4 });
    assert.match(body.query, /^query\s/);
    assert.doesNotMatch(body.query, /\bmutation\b/i);
    if (opts.count) opts.count.n++;
    return response(body.query.includes('WorkersProject4Structure') ? (opts.structure ?? structure) : (opts.access ?? access));
  };
}

test('workflows are explicitly classified; write flows never misreported as available', () => {
  assert.equal(WORKERS_WORKFLOW_CONTRACTS.length, 8);
  assert.equal(WORKERS_WORKFLOW_CONTRACTS.filter(x => x.status === 'READ_ONLY_AVAILABLE').length, 4);
  assert.ok(WORKERS_WORKFLOW_CONTRACTS.some(x => x.id === 'CANONICAL_MEMORY_INGEST' && x.status === 'BLOCKED_SOURCE_ACQUISITION'));
  assert.ok(WORKERS_WORKFLOW_CONTRACTS.some(x => x.id === 'PROJECT_BOOTSTRAP_APPLY' && x.status === 'BLOCKED_WRITE_ADAPTER'));
});

test('inventory uses exact personal-project target and no mutation', async () => {
  const result = await inspectProjectStructure(fakeRequest());
  assert.equal(result.status, 'READ_ACCESS_VERIFIED');
  assert.equal(result.projectNodeId, 'PVT_4_REAL_AT_RUNTIME');
  assert.equal(result.itemsTotalCount, 2);
  assert.deepEqual(result.fields?.map(x=>x.name), ['Title', 'Memoire_ID']);
  assert.deepEqual(result.views?.map(x=>x.name), ['Memoire']);
  assert.equal(result.noMutation, true);
});

test('private Project structure is readable but never published or mutated', async () => {
  const res = await runProjectWorkflowReadOnly('CANONICAL_MEMORY_PREVIEW', fakeRequest({
    access: {
      ...access,
      user: {projectV2: {...access.user.projectV2, public: false}}
    },
    structure: {
      ...structure,
      user: {projectV2: {...structure.user.projectV2, public: false}}
    }
  }));
  assert.equal(res.status, 'SUCCESS_READ_ONLY');
  assert.equal(res.access?.public, false);
  assert.equal(res.inventory?.public, false);
  assert.equal(res.proposal?.requiresApproval, true);
  assert.equal(res.noMutation, true);
});

test('workflow ACCESS_PREFLIGHT is one bounded API read', async () => {
  const count={n:0};
  const result=await runProjectWorkflowReadOnly('ACCESS_PREFLIGHT', fakeRequest({count}));
  assert.equal(result.status,'SUCCESS_READ_ONLY');
  assert.deepEqual(result.steps,['access_preflight']);
  assert.equal(count.n,1);
});

test('workflow PROJECT_INVENTORY composes identity and inventory', async () => {
  const count={n:0};
  const result=await runProjectWorkflowReadOnly('PROJECT_INVENTORY', fakeRequest({count}));
  assert.equal(result.status,'SUCCESS_READ_ONLY');
  assert.equal(result.inventory?.itemsTotalCount,2);
  assert.equal(count.n,2);
});

test('workflow CANONICAL_MEMORY_PREVIEW generates a non-mutating delta', async () => {
  const result=await runProjectWorkflowReadOnly('CANONICAL_MEMORY_PREVIEW', fakeRequest());
  assert.equal(result.status,'SUCCESS_READ_ONLY');
  assert.deepEqual(result.proposal?.missingFields,
    PUBLIC_MEMORY_PROJECTION.fields.filter(x=>x!=='Memoire_ID'));
  assert.deepEqual(result.proposal?.missingViews,
    PUBLIC_MEMORY_PROJECTION.views.filter(x=>x!=='Memoire'));
  assert.equal(result.proposal?.requiresApproval,true);
  assert.equal(result.proposal?.noMutation,true);
});

test('workflow PROJECT_RECONCILE_PREVIEW does not create a second task store', async () => {
  const result=await runProjectWorkflowReadOnly('PROJECT_RECONCILE_PREVIEW', fakeRequest());
  assert.equal(result.status,'SUCCESS_READ_ONLY');
  assert.ok(result.steps.includes('public_projection_diff'));
  assert.equal('taskStore' in result,false);
});

test('owner mismatch fails closed on project inventory', async () => {
  const res=await inspectProjectStructure(fakeRequest({ structure: {
    ...structure, viewer: { login: 'unrelated' }
  } }));
  assert.equal(res.status,'BLOCKED');
  assert.equal(res.reasonCode,'GITHUB_PRINCIPAL_MISMATCH');
});

test('project identity mismatch fails closed', async () => {
  const res=await inspectProjectStructure(fakeRequest({ structure: {
    ...structure, user: {projectV2: {...structure.user.projectV2,number:3}}
  } }));
  assert.equal(res.status,'BLOCKED');
  assert.equal(res.reasonCode,'PROJECT_UNAVAILABLE_OR_IDENTITY_MISMATCH');
});

test('pagination does not masquerade as complete inventory', async () => {
  const res=await inspectProjectStructure(fakeRequest({structure:{
    ...structure,
    user:{projectV2:{...structure.user.projectV2,
      fields:{...structure.user.projectV2.fields,pageInfo:{hasNextPage:true}}
    }}
  }}));
  assert.equal(res.status,'PARTIAL');
  const run=await runProjectWorkflowReadOnly('CANONICAL_MEMORY_PREVIEW',fakeRequest({structure:{
    ...structure,
    user:{projectV2:{...structure.user.projectV2,fields:{...structure.user.projectV2.fields,pageInfo:{hasNextPage:true}}}}
  }}));
  assert.equal(run.status,'BLOCKED');
  assert.equal(run.proposal,undefined);
});

test('GraphQL errors never leak API response details', async () => {
  const result=await inspectProjectStructure(async () => ({
    ...response(null),
    json: {errors:[{message:'ghp_DO_NOT_LEAK'}],data:null}
  }));
  assert.equal(result.status,'UNVERIFIED');
  assert.doesNotMatch(JSON.stringify(result),/ghp_DO_NOT_LEAK/);
});

test('GraphQL query is read-only and bounded', () => {
  assert.match(WORKERS_STRUCTURE_QUERY,/^query /);
  assert.doesNotMatch(WORKERS_STRUCTURE_QUERY,/\bmutation\b/i);
  assert.match(WORKERS_STRUCTURE_QUERY,/fields\(first: 50\)/);
  assert.match(WORKERS_STRUCTURE_QUERY,/views\(first: 50\)/);
});

test('workflow stops before inventory if account access fails',async ()=>{
  const count={n:0};
  const res=await runProjectWorkflowReadOnly('PROJECT_INVENTORY',fakeRequest({
    access:{ ...access, viewer:{login:'wrong'} },count
  }));
  assert.equal(res.status,'BLOCKED');
  assert.equal(count.n,1);
  assert.equal(res.inventory,undefined);
});

test('GraphQL result with errors is always unverified',async ()=>{
  const r=await inspectProjectStructure(async ()=>({...response(null),json:{errors:[{message:'denied'}]}}));
  assert.equal(r.status,'UNVERIFIED');
});
