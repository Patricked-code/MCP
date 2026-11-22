import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { GitHubJsonResponse, GitHubJsonRequestOptions } from '../src/github/connection.js';
process.env.MCP_AUTH_TOKEN ??= 'unit-test-only-not-a-runtime-token';
process.env.S1_HOST ??= '127.0.0.1';
process.env.S1_KEY_PATH ??= '/tmp/workers-discovery-test-s1-unused';
process.env.S2_HOST ??= '127.0.0.1';
process.env.S2_KEY_PATH ??= '/tmp/workers-discovery-test-s2-unused';

const {
  discoverProjects, inventoryProjects, inspectProject, reconcileProjects,
  DISCOVER_QUERIES, INSPECT_QUERIES
} = await import('../src/tools/githubProjectsDiscovery.js');

const projects = [
  {id: 'PVT_1', number: 1, title: 'First', url: 'https://github.com/users/Patricked-code/projects/1',
    public: false, closed: false},
  {id: 'PVT_4', number: 4, title: 'WORKERS', url: 'https://github.com/users/Patricked-code/projects/4',
    public: false, closed: false}
];
const response = (data: unknown, errors?: unknown): GitHubJsonResponse => ({
  ok: true, status: 200, json: errors ? {errors, data} : {data},
  tokenExpiresAt: null, oauthScopes: []
});
function discoveryPage(nodes: typeof projects, count: number, more: boolean, cursor: string | null) {
  return {viewer: {login: 'Patricked-code'}, user: {login: 'Patricked-code',
    projectsV2: {totalCount: count, pageInfo: {hasNextPage: more, endCursor: cursor}, nodes}}};
}
function mockPage(nodes: typeof projects, count = nodes.length, more = false, cursor: string | null = null) {
  return async (endpoint: string, opts?: GitHubJsonRequestOptions) => {
    assert.equal(endpoint, '/graphql');
    assert.equal(opts?.method, 'POST');
    const body = opts?.jsonBody as {query: string; variables: {owner: string; first: number; after: string|null}};
    assert.equal(body.query, DISCOVER_QUERIES.user);
    assert.equal(body.variables.owner, 'Patricked-code');
    assert.ok(body.variables.first >= 1 && body.variables.first <= 100);
    return response(discoveryPage(nodes, count, more, cursor));
  };
}

test('discovery is page-limited, read-only and preserves private visibility', async () => {
  const actual = await discoverProjects('Patricked-code', 50, null, mockPage(projects));
  assert.equal(actual.status, 'SUCCESS_READ_ONLY');
  assert.equal(actual.noMutation, true);
  assert.equal(actual.totalCount, 2);
  assert.equal(actual.projects?.[1].number, 4);
  assert.equal(actual.projects?.[1].public, false);
  assert.equal(actual.hasNextPage, false);
});

test('organization discovery uses organization.projectsV2, never user.projectsV2', async () => {
  const actual = await discoverProjects('chainsolutions-wealthtech', 25, null, async (_endpoint, opts) => {
    const body = opts?.jsonBody as {query:string;variables:{owner:string}};
    assert.equal(body.query, DISCOVER_QUERIES.organization);
    assert.equal(body.variables.owner, 'chainsolutions-wealthtech');
    return response({viewer: {login:'Patricked-code'},
      organization: {login:'chainsolutions-wealthtech',
        projectsV2:{totalCount:1, pageInfo:{hasNextPage:false,endCursor:null}, nodes:[
          {id:'PVT_ORG',number:3,title:'ORG PROJECT',
            url:'https://github.com/orgs/chainsolutions-wealthtech/projects/3',
            public:true,closed:false}
        ]}}});
  });
  assert.equal(actual.status, 'SUCCESS_READ_ONLY');
  assert.equal(actual.projects?.[0].number, 3);
});

test('inventory follows cursors and certifies completeness only on final page', async () => {
  let calls = 0;
  const actual = await inventoryProjects('Patricked-code', 5, async (_e, o) => {
    const body = o?.jsonBody as {query:string;variables:{after:string|null}};
    assert.equal(body.query, DISCOVER_QUERIES.user);
    const n = calls++;
    assert.equal(body.variables.after, n === 0 ? null : 'cursor_1');
    return n === 0 ? response(discoveryPage([projects[0]], 2, true, 'cursor_1'))
      : response(discoveryPage([projects[1]], 2, false, null));
  });
  assert.equal(calls, 2);
  assert.equal(actual.status,'SUCCESS_READ_ONLY');
  assert.equal(actual.complete,true);
  assert.equal(actual.discovered,2);
});

test('inventory with limited pages is PARTIAL, never claims complete', async () => {
  const actual = await inventoryProjects('Patricked-code',1,mockPage([projects[0]],2,true,'after_1'));
  assert.equal(actual.status,'PARTIAL');
  assert.equal(actual.complete,false);
  assert.equal(actual.nextCursor,'after_1');
});

test('duplicate identities or stalled cursors abort with bounded error', async () => {
  let n=0;
  const result = await inventoryProjects('Patricked-code',3,async ()=>{
    n++;
    return response(discoveryPage([projects[0]],2,true,n === 1 ? 'first' : 'first'));
  });
  assert.equal(result.status,'UNVERIFIED');
  assert.equal(result.reasonCode,'PAGINATION_DRIFT');
});

test('inspect reads dynamic selected project with no visibility mutation', async () => {
  const result = await inspectProject('Patricked-code',4,async (_endpoint,opts)=>{
    const body = opts?.jsonBody as {query:string;variables:{number:number}};
    assert.equal(body.query,INSPECT_QUERIES.user);
    assert.equal(body.variables.number,4);
    return response({viewer:{login:'Patricked-code'},user:{login:'Patricked-code',
      projectV2:{...projects[1],viewerCanUpdate:false,
        fields:{pageInfo:{hasNextPage:false},nodes:[{id:'fld',name:'Memoire_ID'}]},
        views:{pageInfo:{hasNextPage:false},nodes:[{id:'view',name:'Memoire',layout:'TABLE_LAYOUT'}]},
        items:{totalCount:2}}}});
  });
  assert.equal(result.status,'SUCCESS_READ_ONLY');
  assert.equal(result.project?.public,false);
  assert.equal(result.fields?.[0]?.name,'Memoire_ID');
  assert.equal(result.viewerCanUpdate,false);
  assert.equal(result.noMutation,true);
});

test('reconcile is a preview and never persists a second registry', async () => {
  const result=await reconcileProjects('Patricked-code',5,mockPage(projects));
  assert.equal(result.status,'SUCCESS_READ_ONLY');
  assert.equal(result.knownWorkersProject4?.number,4);
  assert.equal(result.registrationApplied,false);
  assert.equal(result.requiresExistingGitRegistryJoin,true);
  assert.equal(result.requiresApproval,true);
});

test('unavailable owner, invalid URL and GraphQL error fail closed', async () => {
  const owner=await discoverProjects('Patricked-code',50,null,async()=>response({
    viewer:{login:'Patricked-code'},user:null
  }));
  assert.equal(owner.status,'UNVERIFIED');
  const invalid=await discoverProjects('Patricked-code',50,null,mockPage([{...projects[0],url:'https://example.com/1'}]));
  assert.equal(invalid.status,'UNVERIFIED');
  const graphql=await discoverProjects('Patricked-code',50,null,async()=>response(null,[{message:'ghp_NOT_FOR_LOGS'}]));
  assert.equal(graphql.status,'UNVERIFIED');
  assert.doesNotMatch(JSON.stringify(graphql),/ghp_NOT_FOR_LOGS/);
});

test('static queries are read-only, named, and never interpolate caller input', () => {
  for (const query of [...Object.values(DISCOVER_QUERIES),...Object.values(INSPECT_QUERIES)]) {
    assert.match(query,/^query WorkersProjects/);
    assert.doesNotMatch(query,/\bmutation\b/i);
    assert.match(query,/\$owner/);
  }
});
