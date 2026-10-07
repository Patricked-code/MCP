import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import express from 'express';

import { assertReadOnlyCommand } from '../src/ssh/safety.js';

const {
  ACTIVATION_CONSENT,
  CREATION_CONSENT,
  PROVISIONING_CONSENT_PURPOSE,
  decideProvisioningConsent,
  provisioningConsentBinding,
  renderProvisioningConsentFields
} = await import('../src/provisioning/consent.js');
const { admitProvisioningRevision } = await import('../src/provisioning/revisionAdmission.js');
const { createProjectRuntimeProvisioningRouter } = await import('../src/provisioning/routes.js');
const {
  PROVISIONING_MAX_ARCHIVE_BYTES,
  createProjectRuntimeExecutionDependencies,
  writeProvisioningJobFile
} = await import('../src/provisioning/wiring.js');
const { provisioningMarker } = await import('../src/provisioning/runtimeExecutor.js');
const {
  parseProvisionedRuntimeInventory,
  planProjectRuntimeProvisioning,
  provisionedComposeProject
} = await import('../src/provisioning/projectRuntime.js');

const REVISION = 'a'.repeat(40);
const HEAD = 'b'.repeat(40);
const OBSERVED_AT = '2026-10-07T15:00:00.000Z';
const TARGET = Object.freeze({
  mappingId: 'github:Patricked-code/Portal:s1:portal_api',
  repositoryId: 'github:Patricked-code/Portal',
  serverPath: '/opt/apps/portal-api',
  composeProject: provisionedComposeProject('portal', 'github:Patricked-code/Portal:s1:portal_api', 'github:Patricked-code/Portal')
});
const REQUEST = Object.freeze({ serverId: 'S1', projectId: 'portal', mappingId: TARGET.mappingId, revision: REVISION });
/** The resolved target the consent page names, and the one the consent is bound to. */
const RESOLVED = Object.freeze({ repositoryId: TARGET.repositoryId, serverPath: TARGET.serverPath, composeProject: TARGET.composeProject });
const ABSENT = 'docker=ok\ncomponent.0.path=absent\ncomponent.0.containers=\n';

function registry(): any {
  return {
    available: true, sourceSchemaVersion: 2, digest: null, candidateDigest: null,
    mappings: [{ mappingId: TARGET.mappingId, repositoryId: TARGET.repositoryId, projectId: 'portal', projectUid: 'uid', componentRole: 'api' }],
    projects: [{
      projectId: 'portal', projectUid: 'uid', name: 'Portal', kind: 'application',
      globalCheckpointRepositoryId: TARGET.repositoryId, centralGovernanceRepositoryId: TARGET.repositoryId,
      repositoryComponents: [{ repositoryId: TARGET.repositoryId, mappingId: TARGET.mappingId, role: 'api' }]
    }],
    activationReadiness: [{ mappingId: TARGET.mappingId, status: 'READY', reasonCodes: [] }],
    serverBindings: [{
      mappingId: TARGET.mappingId, repositoryId: TARGET.repositoryId, projectId: 'portal', projectUid: 'uid',
      componentRole: 'api', serverId: 's1', serverPath: TARGET.serverPath, realPath: null, realPathVerified: false,
      environment: 'production'
    }],
    governanceEvidence: {
      mappings: [{
        mappingId: TARGET.mappingId, repositoryId: TARGET.repositoryId, projectId: 'portal',
        officialBranch: 'main', allowedBranchPrefixes: ['claude/'], directMainPush: false, status: 'active',
        capabilities: { deploy: true }, backupRequired: true, rollbackMethod: 'restore_previous_release'
      }]
    }
  };
}

function plan(consent: Record<string, boolean> = {}, inventory = ABSENT): any {
  return planProjectRuntimeProvisioning({
    request: REQUEST,
    serverTarget: { status: 'CONFIGURED', projectIds: ['portal'] },
    registry: registry(),
    inventory: parseProvisionedRuntimeInventory(inventory, [TARGET], OBSERVED_AT),
    consent: { creation: false, activation: false, ...consent }
  });
}

/** The inventory of a runtime created earlier by provisioning: present, marked, not running. */
function createdInventory(): string {
  const marker = provisioningMarker({
    jobId: 'prov-20261006T050000Z-00000000', target: plan().target, composeFile: 'compose.yaml', createdAt: OBSERVED_AT,
    treeDigest: 'e'.repeat(64), services: ['api']
  });
  return `docker=ok\ncomponent.0.path=present\ncomponent.0.containers=\ncomponent.0.marker=${Buffer.from(JSON.stringify(marker)).toString('base64')}\n`;
}

async function policyContract(): Promise<any> {
  const policy = JSON.parse(await readFile('.mcp/provisioning-contracts.json', 'utf8'));
  return policy.contracts.find((entry: any) => entry.resourceType === 'PROJECT_RUNTIME');
}

test('the provisioning consent is explicit, same-origin and bound to the session and the exact target', async () => {
  const contract = await policyContract();
  assert.equal(PROVISIONING_CONSENT_PURPOSE, contract.consent.purpose);
  assert.equal(CREATION_CONSENT, contract.consent.value);
  assert.equal(ACTIVATION_CONSENT, contract.steps.find((step: any) => step.id === 'activate').consentValue);

  const decide = (input: Record<string, unknown>) => decideProvisioningConsent({
    sameOrigin: true, ticketValid: true, creationConsent: undefined, activationConsent: undefined, ...input
  }) as any;
  const granted = decide({ creationConsent: CREATION_CONSENT });
  assert.deepEqual({ ...granted }, { allowed: true, creation: true, activation: false, reasonCode: 'CONSENT_GRANTED' });
  assert.ok(Object.isFrozen(granted));
  assert.deepEqual({ ...decide({ activationConsent: ACTIVATION_CONSENT }) }, {
    allowed: true, creation: false, activation: true, reasonCode: 'CONSENT_GRANTED'
  });
  // Nothing is consented across origins, without a valid ticket or without an explicit value.
  const refused: Array<[Record<string, unknown>, string]> = [
    [{ sameOrigin: false, creationConsent: CREATION_CONSENT }, 'CONSENT_CROSS_ORIGIN'],
    [{ ticketValid: false, creationConsent: CREATION_CONSENT }, 'CONSENT_TICKET_INVALID'],
    [{}, 'CONSENT_MISSING'],
    [{ creationConsent: 'on', activationConsent: CREATION_CONSENT }, 'CONSENT_MISSING'],
    [{ creationConsent: true, activationConsent: 'true' }, 'CONSENT_MISSING']
  ];
  for (const [input, reasonCode] of refused) {
    assert.deepEqual({ ...decide(input) }, { allowed: false, creation: false, activation: false, reasonCode }, reasonCode);
  }

  // A ticket names its session, the request and the resolved target: it never consents to another one.
  const binding = provisioningConsentBinding('session-1', REQUEST, RESOLVED);
  for (const other of [
    provisioningConsentBinding('session-2', REQUEST, RESOLVED),
    provisioningConsentBinding('session-1', { ...REQUEST, revision: HEAD }, RESOLVED),
    provisioningConsentBinding('session-1', { ...REQUEST, mappingId: 'github:Patricked-code/Portal:s1:other' }, RESOLVED),
    provisioningConsentBinding('session-1', { ...REQUEST, projectId: 'other' }, RESOLVED),
    provisioningConsentBinding('session-1', REQUEST, { ...RESOLVED, repositoryId: 'github:Patricked-code/Other' }),
    provisioningConsentBinding('session-1', REQUEST, { ...RESOLVED, serverPath: '/opt/apps/portal-old' }),
    provisioningConsentBinding('session-1', REQUEST, { ...RESOLVED, composeProject: 'mcp-portal-000000000000' })
  ]) {
    assert.notEqual(other, binding);
  }

  // The creation consent names the resource and its authorities; the activation consent stays separate.
  const creation = plan();
  assert.equal(creation.decision, 'CONSENT_REQUIRED');
  const fields = renderProvisioningConsentFields({ ticket: 't"<', plan: creation });
  assert.match(fields, new RegExp(`name="consent_creation" value="${CREATION_CONSENT}" required`));
  assert.match(fields, new RegExp(`name="consent_activation" value="${ACTIVATION_CONSENT}"(?! required)`));
  assert.doesNotMatch(fields, /checked/);
  for (const named of [TARGET.repositoryId, REVISION, TARGET.serverPath, creation.target.composeProject, 'S1', 'GitRegistry', '.mcp/server-map.json']) {
    assert.ok(fields.includes(named), named);
  }
  assert.ok(fields.includes('value="t&quot;&lt;"'));
  // A created runtime asks only for its own activation consent.
  const activation = plan({}, createdInventory());
  assert.deepEqual(activation.reasonCodes, ['RUNTIME_CREATED_NOT_ACTIVATED', 'ACTIVATION_CONSENT_REQUIRED']);
  const activationFields = renderProvisioningConsentFields({ ticket: 't', plan: activation });
  assert.doesNotMatch(activationFields, /consent_creation/);
  assert.match(activationFields, new RegExp(`name="consent_activation" value="${ACTIVATION_CONSENT}" required`));
  // A plan that asks for no consent renders none.
  assert.equal(renderProvisioningConsentFields({ ticket: 't', plan: plan({ creation: true }) }), '');
});

function github(overrides: Record<string, unknown> = {}) {
  const base = '/repos/Patricked-code/Portal';
  const responses: Record<string, unknown> = {
    [base]: { ok: true, status: 200, json: { default_branch: 'main' } },
    [`${base}/branches/main`]: { ok: true, status: 200, json: { commit: { sha: HEAD } } },
    [`${base}/compare/${REVISION}...${HEAD}`]: { ok: true, status: 200, json: { status: 'ahead' } },
    [`${base}/commits/${REVISION}/check-runs?per_page=100`]: {
      ok: true, status: 200, json: { total_count: 2, check_runs: [{ status: 'completed', conclusion: 'success' }, { status: 'completed', conclusion: 'skipped' }] }
    },
    [`${base}/commits/${REVISION}/status`]: { ok: true, status: 200, json: { state: 'pending', total_count: 0, statuses: [] } },
    [`${base}/commits/${HEAD}/check-runs?per_page=100`]: {
      ok: true, status: 200, json: { total_count: 1, check_runs: [{ status: 'completed', conclusion: 'success' }] }
    },
    [`${base}/commits/${HEAD}/status`]: { ok: true, status: 200, json: { state: 'success', total_count: 1, statuses: [{}] } },
    ...overrides
  };
  const calls: string[] = [];
  return {
    calls,
    base,
    request: async (endpoint: string) => {
      calls.push(endpoint);
      return (responses[endpoint] ?? { ok: false, status: 404, json: null }) as any;
    }
  };
}

test('a revision is admitted only from the default branch history with a non-failing CI gate', async () => {
  const admit = async (overrides: Record<string, unknown> = {}, input: Record<string, string> = {}) => {
    const fake = github(overrides);
    const result = await admitProvisioningRevision({ repositoryId: TARGET.repositoryId, revision: REVISION, ...input }, fake.request) as any;
    return { result, calls: fake.calls };
  };
  const { result: admitted, calls } = await admit();
  assert.deepEqual(
    { admitted: admitted.admitted, kind: admitted.kind, reasonCode: admitted.reasonCode, defaultBranch: admitted.defaultBranch, defaultBranchHead: admitted.defaultBranchHead },
    { admitted: true, kind: 'CI_GATE', reasonCode: 'REVISION_ADMITTED', defaultBranch: 'main', defaultBranchHead: HEAD }
  );
  assert.ok(Object.isFrozen(admitted));
  assert.ok(calls.every((endpoint) => endpoint.startsWith('/repos/Patricked-code/Portal')));

  const base = '/repos/Patricked-code/Portal';
  const compare = `${base}/compare/${REVISION}...${HEAD}`;
  const checks = `${base}/commits/${REVISION}/check-runs?per_page=100`;
  const statuses = `${base}/commits/${REVISION}/status`;
  const cases: Array<[Record<string, unknown>, string]> = [
    // Only the reviewed history of the default branch is admitted.
    [{ [compare]: { ok: true, status: 200, json: { status: 'diverged' } } }, 'REVISION_NOT_ON_DEFAULT_BRANCH'],
    [{ [compare]: { ok: true, status: 200, json: { status: 'behind' } } }, 'REVISION_NOT_ON_DEFAULT_BRANCH'],
    [{ [compare]: { ok: false, status: 404, json: null } }, 'REVISION_NOT_ON_DEFAULT_BRANCH'],
    // A failing or unfinished CI gate is never admitted, from check runs or commit statuses.
    [{ [checks]: { ok: true, status: 200, json: { total_count: 1, check_runs: [{ status: 'completed', conclusion: 'failure' }] } } }, 'REVISION_CI_FAILED'],
    [{ [checks]: { ok: true, status: 200, json: { total_count: 1, check_runs: [{ status: 'completed', conclusion: 'timed_out' }] } } }, 'REVISION_CI_FAILED'],
    [{ [statuses]: { ok: true, status: 200, json: { state: 'failure', total_count: 1, statuses: [{}] } } }, 'REVISION_CI_FAILED'],
    [{ [checks]: { ok: true, status: 200, json: { total_count: 1, check_runs: [{ status: 'in_progress', conclusion: null }] } } }, 'REVISION_CI_PENDING'],
    [{ [statuses]: { ok: true, status: 200, json: { state: 'pending', total_count: 1, statuses: [{}] } } }, 'REVISION_CI_PENDING'],
    // A gate that cannot be read in full proves nothing.
    [{ [checks]: { ok: true, status: 200, json: { total_count: 150, check_runs: Array.from({ length: 100 }, () => ({ status: 'completed', conclusion: 'success' })) } } }, 'REVISION_CI_UNVERIFIABLE'],
    [{ [checks]: { ok: false, status: null, json: null } }, 'REVISION_ADMISSION_UNAVAILABLE'],
    [{ [base]: { ok: false, status: null, json: null } }, 'REVISION_ADMISSION_UNAVAILABLE'],
    [{ [base]: { ok: true, status: 200, json: { default_branch: '../x' } } }, 'REVISION_ADMISSION_UNAVAILABLE']
  ];
  for (const [overrides, reasonCode] of cases) {
    const { result } = await admit(overrides);
    assert.deepEqual([result.admitted, result.kind, result.reasonCode], [false, null, reasonCode], `${reasonCode}: ${JSON.stringify(overrides)}`);
  }

  // Without any CI on a reviewed revision, the explicit consent is the manual admission, as for the Governed Deploy.
  const { result: manual } = await admit({
    [checks]: { ok: true, status: 200, json: { total_count: 0, check_runs: [] } }
  });
  assert.deepEqual([manual.admitted, manual.kind], [true, 'MANUAL_CONSENT']);
  // The default branch head itself needs no comparison.
  const { result: head, calls: headCalls } = await admit({}, { revision: HEAD });
  assert.equal(head.reasonCode, 'REVISION_ADMITTED');
  assert.equal(headCalls.some((endpoint) => endpoint.includes('/compare/')), false);
  // A default branch with a slash is one encoded path parameter, as the other GitHub branch readers send it.
  const { result: slashed, calls: slashedCalls } = await admit({
    '/repos/Patricked-code/Portal': { ok: true, status: 200, json: { default_branch: 'release/1.0' } },
    '/repos/Patricked-code/Portal/branches/release%2F1.0': { ok: true, status: 200, json: { commit: { sha: HEAD } } }
  });
  assert.deepEqual([slashed.admitted, slashed.defaultBranch], [true, 'release/1.0']);
  assert.ok(slashedCalls.includes('/repos/Patricked-code/Portal/branches/release%2F1.0'));
  // An invalid repository or revision is never requested.
  for (const input of [{ revision: 'main' }, { repositoryId: 'github:Patricked-code/Portal;x' }]) {
    const { result, calls: none } = await admit({}, input);
    assert.deepEqual([result.admitted, result.reasonCode, none.length], [false, 'REVISION_ADMISSION_UNAVAILABLE', 0]);
  }
});

function execution(result = 'SUCCEEDED', reasonCodes: string[] = []): any {
  return Object.freeze({
    result,
    jobId: result === 'REFUSED' ? null : 'prov-20261007T150000Z-0a1b2c3d',
    mode: 'CREATE',
    target: plan({ creation: true }).target,
    reasonCodes: Object.freeze(reasonCodes),
    findings: Object.freeze([]),
    rollback: result === 'ROLLED_BACK' ? 'SUCCEEDED' : 'NOT_NEEDED',
    authorizationInferred: false
  });
}

async function withSurface(
  overrides: Record<string, unknown>,
  fn: (baseUrl: string, seen: { previews: any[]; executions: any[] }) => Promise<void>
) {
  const seen = { previews: [] as any[], executions: [] as any[] };
  const dependencies = {
    requireLogin: (req: express.Request, res: express.Response, next: express.NextFunction) => {
      if (req.header('x-test-login') === 'yes') next();
      else res.status(401).json({ error: 'mcp_web_login_required' });
    },
    consentSession: (req: express.Request) => req.header('x-test-session') ?? '',
    isSameOrigin: (req: express.Request) => req.header('origin') === undefined,
    issueTicket: (purpose: string, binding: string) => `ticket:${purpose}:${Buffer.from(binding).toString('base64url')}`,
    verifyTicket: (purpose: string, ticket: unknown, binding: string) => ticket === `ticket:${purpose}:${Buffer.from(binding).toString('base64url')}`,
    listTargets: async () => [{ projectId: 'portal', ...TARGET }],
    preview: async (request: unknown) => {
      seen.previews.push(request);
      return plan();
    },
    execute: async (input: unknown) => {
      seen.executions.push(input);
      return execution();
    },
    responseWaitMs: 2_000,
    ...overrides
  };
  const app = express();
  app.use(express.urlencoded({ extended: false }));
  app.use(createProjectRuntimeProvisioningRouter(dependencies as any));
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address() as AddressInfo;
  try {
    await fn(`http://127.0.0.1:${address.port}`, seen);
  } finally {
    server.close();
    await once(server, 'close');
  }
}

const LOGGED_IN = { 'x-test-login': 'yes', 'x-test-session': 'session-1' };

function ticketFor(session: string, request: Record<string, string>, resolved: Record<string, string> = RESOLVED): string {
  return `ticket:${PROVISIONING_CONSENT_PURPOSE}:${Buffer.from(provisioningConsentBinding(session, request as any, resolved as any)).toString('base64url')}`;
}

async function submit(baseUrl: string, fields: Record<string, string>, headers: Record<string, string> = {}) {
  return fetch(`${baseUrl}/provisioning/project-runtime`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', ...LOGGED_IN, ...headers },
    body: new URLSearchParams(fields).toString(),
    redirect: 'manual'
  });
}

const FIELDS = Object.freeze({
  projectId: 'portal',
  mappingId: TARGET.mappingId,
  revision: REVISION,
  repositoryId: RESOLVED.repositoryId,
  serverPath: RESOLVED.serverPath,
  composeProject: RESOLVED.composeProject,
  consent_ticket: ticketFor('session-1', REQUEST),
  consent_creation: CREATION_CONSENT
});

test('the provisioning page requires the web login and observes nothing before a target is named', async () => {
  await withSurface({}, async (baseUrl, seen) => {
    assert.equal((await fetch(`${baseUrl}/provisioning/project-runtime`)).status, 401);
    const form = await fetch(`${baseUrl}/provisioning/project-runtime`, { headers: LOGGED_IN });
    assert.equal(form.status, 200);
    assert.equal(form.headers.get('cache-control'), 'no-store');
    assert.equal(form.headers.get('x-frame-options'), 'DENY');
    assert.match(form.headers.get('content-security-policy') ?? '', /frame-ancestors 'none'/);
    const page = await form.text();
    // The configured components are listed, each awaiting an exact revision.
    assert.ok(page.includes(TARGET.mappingId) && page.includes(TARGET.serverPath));
    assert.match(page, /name="revision"[^>]*pattern="\[0-9a-f\]\{40\}"/);
    assert.deepEqual(seen.previews, []);
  });
  // Without a configured target, the page says which reviewed configuration is missing.
  await withSurface({ listTargets: async () => [] }, async (baseUrl, seen) => {
    const page = await (await fetch(`${baseUrl}/provisioning/project-runtime`, { headers: LOGGED_IN })).text();
    assert.match(page, /targetProjectIds/);
    assert.deepEqual(seen.previews, []);
  });
  // Unreadable targets are unknown, never reported as an absence of target.
  await withSurface({ listTargets: async () => { throw new Error('PROVISIONING_TARGETS_UNKNOWN'); } }, async (baseUrl) => {
    const page = await (await fetch(`${baseUrl}/provisioning/project-runtime`, { headers: LOGGED_IN })).text();
    assert.match(page, /UNKNOWN/);
    assert.doesNotMatch(page, /Aucune cible/);
  });
});

test('the plan page renders the exact target and asks for the explicit consent, without executing', async () => {
  await withSurface({}, async (baseUrl, seen) => {
    const query = new URLSearchParams({ projectId: 'portal', mappingId: TARGET.mappingId, revision: REVISION });
    const response = await fetch(`${baseUrl}/provisioning/project-runtime?${query}`, { headers: LOGGED_IN });
    assert.equal(response.status, 200);
    const page = await response.text();
    assert.deepEqual(seen.previews, [REQUEST]);
    assert.deepEqual(seen.executions, []);
    assert.match(page, /CONSENT_REQUIRED/);
    assert.match(page, /method="post" action="\/provisioning\/project-runtime"/);
    assert.ok(page.includes(`value="${ticketFor('session-1', REQUEST)}"`));
    assert.match(page, new RegExp(`name="consent_creation" value="${CREATION_CONSENT}"`));
    // The form carries the resolved target the consent names, bound by the ticket.
    for (const [name, value] of Object.entries(RESOLVED)) assert.ok(page.includes(`name="${name}" value="${value}"`), name);
  });
  // A blocked or matching runtime offers no consent at all.
  for (const [decided, code] of [
    [plan({}, 'docker=unavailable\ncomponent.0.path=absent\ncomponent.0.containers=\n'), 'RUNTIME_ABSENCE_UNPROVEN'],
    [plan({}, 'docker=ok\ncomponent.0.path=present\ncomponent.0.containers=\n'), 'TARGET_PATH_PRESENT']
  ] as const) {
    await withSurface({ preview: async () => decided }, async (baseUrl) => {
      const query = new URLSearchParams({ projectId: 'portal', mappingId: TARGET.mappingId, revision: REVISION });
      const page = await (await fetch(`${baseUrl}/provisioning/project-runtime?${query}`, { headers: LOGGED_IN })).text();
      assert.ok(page.includes(code), code);
      assert.doesNotMatch(page, /consent_ticket/);
    });
  }
});

test('a submission executes only with a same-origin, ticketed, explicit consent for that exact target', async () => {
  await withSurface({}, async (baseUrl, seen) => {
    const refusals: Array<[Record<string, string>, Record<string, string>, string]> = [
      [FIELDS, { origin: 'https://evil.example' }, 'CONSENT_CROSS_ORIGIN'],
      [{ ...FIELDS, consent_ticket: 'forged' }, {}, 'CONSENT_TICKET_INVALID'],
      [{ ...FIELDS, consent_ticket: ticketFor('session-1', { ...REQUEST, revision: HEAD }) }, {}, 'CONSENT_TICKET_INVALID'],
      [FIELDS, { 'x-test-session': 'session-2' }, 'CONSENT_TICKET_INVALID'],
      // A target edited in the form is not the target the ticket was rendered for.
      [{ ...FIELDS, serverPath: '/opt/apps/elsewhere' }, {}, 'CONSENT_TICKET_INVALID'],
      [Object.fromEntries(Object.entries(FIELDS).filter(([name]) => name !== 'composeProject')), {}, 'CONSENT_TICKET_INVALID'],
      [{ ...FIELDS, consent_creation: 'on' }, {}, 'CONSENT_MISSING']
    ];
    for (const [fields, headers, reasonCode] of refusals) {
      const response = await submit(baseUrl, fields, headers);
      assert.equal(response.status, 403, reasonCode);
      assert.ok((await response.text()).includes(reasonCode), reasonCode);
    }
    assert.deepEqual(seen.executions, []);

    // The consent decided server-side is the only consent the executor receives.
    const granted = await submit(baseUrl, { ...FIELDS, consent: 'all', activation: 'true' });
    assert.equal(granted.status, 200);
    const page = await granted.text();
    assert.match(page, /SUCCEEDED/);
    assert.ok(page.includes('prov-20261007T150000Z-0a1b2c3d'));
    assert.deepEqual(seen.executions, [{ request: REQUEST, consent: { creation: true, activation: false }, expectedTarget: RESOLVED }]);
  });
  // A job whose attestation could not be written is never reported as an ordinary, attested success.
  await withSurface({ execute: async () => execution('SUCCEEDED', ['ATTESTATION_UNWRITTEN']) }, async (baseUrl) => {
    const response = await submit(baseUrl, FIELDS);
    assert.equal(response.status, 500);
    const page = await response.text();
    assert.match(page, /ATTESTATION_UNWRITTEN/);
    assert.match(page, /non écrite/);
    assert.doesNotMatch(page, /attesté dans/);
  });
  // Refusals and failures keep their meaning in the answer.
  for (const [outcome, status] of [[execution('REFUSED', ['REVISION_CI_FAILED']), 409], [execution('ROLLED_BACK', ['HEALTH_CHECK_FAILED']), 502]] as const) {
    await withSurface({ execute: async () => outcome }, async (baseUrl) => {
      const response = await submit(baseUrl, FIELDS);
      assert.equal(response.status, status);
      assert.ok((await response.text()).includes(outcome.reasonCodes[0]!));
    });
  }
});

test('a long provisioning answers that it runs on, admits no second job and reports its outcome', async () => {
  let release: () => void = () => undefined;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  let calls = 0;
  await withSurface({
    responseWaitMs: 20,
    execute: async () => {
      calls += 1;
      await gate;
      return execution();
    }
  }, async (baseUrl) => {
    const started = await submit(baseUrl, FIELDS);
    assert.equal(started.status, 202);
    assert.match(await started.text(), /\/provisioning\/project-runtime\/status/);
    const second = await submit(baseUrl, FIELDS);
    assert.equal(second.status, 409);
    assert.equal(calls, 1);
    assert.match(await (await fetch(`${baseUrl}/provisioning/project-runtime/status`, { headers: LOGGED_IN })).text(), /RUNNING/);
    release();
    await new Promise((resolve) => setTimeout(resolve, 20));
    const status = await (await fetch(`${baseUrl}/provisioning/project-runtime/status`, { headers: LOGGED_IN })).text();
    assert.match(status, /SUCCEEDED/);
    assert.ok(status.includes('prov-20261007T150000Z-0a1b2c3d'));
    assert.equal((await fetch(`${baseUrl}/provisioning/project-runtime/status`)).status, 401);
  });
});

test('the production wiring observes read-only, writes through the guarded channel and attests inside the data volume', async () => {
  const reads: string[] = [];
  const writes: Array<{ command: string; options: unknown }> = [];
  const downloads: unknown[] = [];
  const io = {
    writeEnabled: () => true,
    readServerMap: async () => ({ servers: { S1: { targetProjectIds: ['portal'] } } }),
    readRegistry: async () => registry(),
    runReadOnly: async (command: string) => {
      assertReadOnlyCommand(command);
      reads.push(command);
      return { code: 0, stdout: ABSENT };
    },
    runGuarded: async (command: string, options: unknown) => {
      writes.push({ command, options });
      return { code: 0, stdout: 'result=staged\n', stderr: '' };
    },
    downloadArchive: async (input: unknown) => {
      downloads.push(input);
      return { ok: true, sha256: 'f'.repeat(64), bytes: 1 };
    },
    githubRequest: async () => ({ ok: false, status: null, json: null }),
    readCoordination: async () => ({ complete: true, locks: [], tasks: [] })
  };
  const deps = createProjectRuntimeExecutionDependencies(io as any) as any;
  assert.equal(deps.writeEnabled(), true);
  assert.deepEqual(await deps.readServerTarget(), { status: 'CONFIGURED', projectIds: ['portal'] });
  assert.deepEqual(await deps.listTargets(), [{ projectId: 'portal', ...TARGET }]);

  // The inventory is read-only and a failed read is unavailable, never an absence.
  const inventory = await deps.observe([TARGET]);
  assert.deepEqual([inventory.status, inventory.components[0].pathPresent, reads.length], ['CURRENT', false, 1]);
  const failing = createProjectRuntimeExecutionDependencies({ ...io, runReadOnly: async () => { throw new Error('ssh'); } } as any) as any;
  assert.equal((await failing.observe([TARGET])).status, 'UNAVAILABLE');
  const unreadable = createProjectRuntimeExecutionDependencies({ ...io, readServerMap: async () => { throw new Error('io'); } } as any) as any;
  assert.deepEqual(await unreadable.readServerTarget(), { status: 'INVALID', reasonCode: 'TARGET_PROJECT_CONFIGURATION_UNREADABLE' });
  const noRegistry = createProjectRuntimeExecutionDependencies({ ...io, readRegistry: async () => { throw new Error('io'); } } as any) as any;
  assert.equal((await noRegistry.readRegistry()).available, false);
  // An unreadable configuration or registry leaves the targets unknown; only a missing configuration means none.
  await assert.rejects(unreadable.listTargets());
  await assert.rejects(noRegistry.listTargets());
  const unconfigured = createProjectRuntimeExecutionDependencies({ ...io, readServerMap: async () => null } as any) as any;
  assert.deepEqual(await unconfigured.listTargets(), []);

  // The preview observes and plans with no consent; it never writes.
  const preview = await deps.preview(REQUEST);
  assert.equal(preview.decision, 'CONSENT_REQUIRED');
  assert.equal(writes.length, 0);

  // Writes go through the guarded channel, named by phase and bounded.
  await deps.runWrite('# mcp-provisioning:stage\nset -u', { phase: 'stage', timeoutMs: 300_000, maxOutputBytes: 400_000 });
  assert.deepEqual(writes[0]!.options, { intent: 'provision-project-runtime:stage', timeoutMs: 300_000, maxOutputBytes: 400_000 });
  // A command the safety policy refuses never reaches the host and fails with a named reason.
  const blocked = await deps.runWrite('docker volume rm data', { phase: 'rollback', timeoutMs: 1_000, maxOutputBytes: 1_000 });
  assert.match(blocked.stdout, /reason=command_policy/);
  assert.equal(writes.length, 1);

  // The source is the bounded archive of the exact revision; admission reads GitHub and fails closed.
  await deps.fetchSource({ repositoryId: TARGET.repositoryId, revision: REVISION, destination: '/app/data/provisioning/prov-x/source.tar.gz' });
  assert.deepEqual(downloads, [{
    repositoryId: TARGET.repositoryId, revision: REVISION, destination: '/app/data/provisioning/prov-x/source.tar.gz', maxBytes: PROVISIONING_MAX_ARCHIVE_BYTES
  }]);
  const admission = await deps.admitRevision({ repositoryId: TARGET.repositoryId, revision: REVISION });
  assert.deepEqual([admission.admitted, admission.reasonCode], [false, 'REVISION_ADMISSION_UNAVAILABLE']);
  assert.match(deps.randomHex(), /^[0-9a-f]{8}$/);
  // The coordination authorities are read through the given I/O, never cached.
  assert.deepEqual(await deps.readCoordination(), { complete: true, locks: [], tasks: [] });

  // Job files stay inside the data volume and are never overwritten.
  const root = await mkdtemp(join(tmpdir(), 'mcp-f03-jobs-'));
  try {
    const path = join(root, 'prov-20261007T150000Z-0a1b2c3d', 'attestation.json');
    await writeProvisioningJobFile(path, '{"ok":true}\n', root);
    assert.equal(await readFile(path, 'utf8'), '{"ok":true}\n');
    await assert.rejects(writeProvisioningJobFile(path, '{}\n', root));
    await assert.rejects(writeProvisioningJobFile(join(root, '..', 'escape.json'), '{}\n', root));
    await assert.rejects(writeProvisioningJobFile('/etc/mcp-escape.json', '{}\n', root));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('the server mounts the consented surface behind the web login, with the write switch and the guarded S1 channel', async () => {
  const server = await readFile('src/server.ts', 'utf8');
  const mount = server.indexOf('createProjectRuntimeProvisioningRouter(');
  assert.ok(mount > 0);
  // Mounted after the body parsers, so the consent fields are read.
  assert.ok(mount > server.indexOf('express.urlencoded('));
  const block = server.slice(mount, server.indexOf('}));', mount));
  for (const wired of [
    'requireLogin: requireWebLogin',
    'consentSession: webConsentBinding',
    'isSameOrigin: isSameOriginSubmission',
    'issueTicket: issueWebConsentTicket',
    'verifyTicket: verifyWebConsentTicket'
  ]) {
    assert.ok(block.includes(wired), wired);
  }
  const wiring = server.slice(server.indexOf('createProjectRuntimeExecutionDependencies('));
  const io = wiring.slice(0, wiring.indexOf('});'));
  assert.match(io, /writeEnabled: \(\) => env\.ENABLE_WRITE_TOOLS/);
  assert.match(io, /runGuardedCommand\('s1'/);
  assert.match(io, /runReadOnlyCommand\('s1'/);
  assert.match(io, /downloadGithubArchiveWithServerCredential/);
  assert.match(io, /githubJsonRequestWithServerCredential/);
  // The Governed Task Queue and Lock Service are re-read before any write; disabled, provisioning has no coordination.
  assert.match(io, /readCoordination:/);
  assert.match(io, /listVisibleTasks\(\)/);
  assert.match(io, /listActiveLocks\(\)/);
  assert.match(io, /operationalMemoryConfig\.enabled/);
  // The dashboard links the surface.
  assert.match(server, /href="\/provisioning\/project-runtime"/);
});
