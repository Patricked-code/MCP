import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';

const {
  deriveProvisioningCapabilities,
  toolCatalogueFromCartography,
  validateProvisioningContracts
} = await import('../src/governance/provisioningContracts.js');

const POLICY_PATH = '.mcp/provisioning-contracts.json';
const ROUTE_PATTERN = /\b(?:app|router)\.(post|put|patch|delete)\(\s*'([^']+)'/g;

async function sourceFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return Promise.resolve(entry.name.endsWith('.ts') ? [path] : []);
  }));
  return nested.flat();
}

/** The mutating HTTP routes the source registers, as `METHOD /path`. */
async function mutatingRoutes(): Promise<string[]> {
  const routes = new Set<string>();
  for (const file of await sourceFiles('src')) {
    for (const match of (await readFile(file, 'utf8')).matchAll(ROUTE_PATTERN)) {
      routes.add(`${match[1].toUpperCase()} ${match[2]}`);
    }
  }
  return [...routes].sort();
}

async function catalogue() {
  const cartography = JSON.parse(await readFile('.mcp/function-cartography.json', 'utf8'));
  const program = JSON.parse(await readFile('docs/governance/program-backlog-convergence.json', 'utf8'));
  const workflows = (await readdir('.github/workflows')).filter((name) => /\.ya?ml$/.test(name)).sort();
  return {
    tools: toolCatalogueFromCartography(cartography),
    mutatingRoutes: await mutatingRoutes(),
    workflows,
    blueprints: program.taskBlueprints.map((entry: any) => ({ id: entry.id, state: entry.readiness.state }))
  };
}

async function policy(): Promise<any> {
  return JSON.parse(await readFile(POLICY_PATH, 'utf8'));
}

function classOf(current: any, name: string): string | undefined {
  return current.primitives.find((entry: any) => entry.name === name)?.class;
}

function contract(current: any, resourceType: string): any {
  return current.contracts.find((entry: any) => entry.resourceType === resourceType);
}

function step(current: any, resourceType: string, id: string): any {
  return contract(current, resourceType).steps.find((entry: any) => entry.id === id);
}

test('the provisioning policy classifies every registered write primitive, mutating route and workflow', async () => {
  const current = await policy();
  const result = validateProvisioningContracts(current, await catalogue());
  assert.deepEqual(result.findings, []);
  assert.equal(result.ok, true);
  assert.ok(Object.isFrozen(result) && Object.isFrozen(result.findings));

  // A contract projection: it grants nothing, creates no task and adds no primitive.
  assert.equal(current.blueprintId, 'TB-W3-F-01');
  assert.deepEqual(current.authority, {
    kind: 'DERIVED_CONTRACT_PROJECTION',
    grantsPermission: false,
    createsRuntimeTasks: false,
    addsPrimitive: false,
    replacesExistingAuthorities: false
  });

  // Write-capable means a write surface or an `allow_write` flag, even on the read surface.
  const tools = toolCatalogueFromCartography(JSON.parse(await readFile('.mcp/function-cartography.json', 'utf8')));
  const writeCapable = new Set(tools.filter((tool: any) => tool.writeCapable).map((tool: any) => tool.name));
  for (const name of ['github_create_branch', 'nigeria_deploy_s2', 'rollback_sadiaaf_s1', 'mcp_transition_governed_task']) {
    assert.ok(writeCapable.has(name), name);
  }
  assert.equal(writeCapable.has('github_get_repository_state'), false);

  const expected: Record<string, string> = {
    github_create_branch: 'COMPOSABLE',
    github_merge_pull_request: 'COMPOSABLE',
    github_get_repository_state: 'OBSERVE',
    exec_repo_script_s2: 'PROJECT_BOUND',
    nigeria_bootstrap_s2: 'PROJECT_BOUND',
    patch_mcp_code_file_s1: 'SELF_MANAGEMENT',
    legacy_vhost_purge_s1: 'DESTRUCTIVE',
    sadiaaf_quarantine_contents_s1: 'DESTRUCTIVE',
    mcp_materialize_program_blueprint: 'NOT_PROVISIONING',
    'POST /git/connect': 'NOT_PROVISIONING',
    'POST /deploy/github/s1/start': 'SELF_MANAGEMENT',
    'POST /evidence/github/readonly': 'OBSERVE',
    'POST /provisioning/project-runtime': 'COMPOSABLE',
    'mcp-deploy.yml': 'SELF_MANAGEMENT',
    'mcp-readonly-evidence.yml': 'OBSERVE'
  };
  for (const [name, primitiveClass] of Object.entries(expected)) {
    assert.equal(classOf(current, name), primitiveClass, name);
  }
});

test('each resource contract requires an exact target, proven absence, explicit consent and idempotence', async () => {
  const current = await policy();
  assert.deepEqual(
    current.contracts.map((entry: any) => entry.resourceType),
    ['REPOSITORY', 'PROJECT_RUNTIME', 'DOMAIN_BINDING']
  );
  // F reuses the E3 consent; a write flag, an agent instruction or a completion step is never consent.
  assert.match(current.consent.mechanism, /E3/);
  for (const never of ['ALLOW_WRITE_FLAG', 'ENABLE_WRITE_TOOLS', 'AGENT_INSTRUCTION', 'COMPLETION_STEP', 'LINK', 'PREVIOUS_CONSENT']) {
    assert.ok(current.consent.neverConsent.includes(never), never);
  }
  const purposes = current.contracts.map((entry: any) => entry.consent.purpose);
  assert.equal(new Set(purposes).size, purposes.length);

  // Missing evidence never proves absence: each resolver's uncertainty stays uncertainty.
  const neverAbsent: Record<string, string> = {
    REPOSITORY: 'GITHUB_REPOSITORY_NOT_FOUND_OR_INVISIBLE',
    PROJECT_RUNTIME: 'RUNTIME_OBSERVATION_MISSING',
    DOMAIN_BINDING: 'DOMAIN_OBSERVATION_UNAVAILABLE'
  };
  for (const entry of current.contracts) {
    assert.ok(entry.exactTarget.length > 0, entry.resourceType);
    assert.ok(entry.absenceProof.neverAbsentWhen.includes(neverAbsent[entry.resourceType]), entry.resourceType);
    assert.deepEqual(
      { matching: entry.existingResource.matching, conflicting: entry.existingResource.conflicting },
      { matching: 'NO_OP', conflicting: 'BLOCKED' }
    );
    assert.equal(entry.steps[0].action, 'OBSERVE', entry.resourceType);
    for (const item of entry.steps.filter((candidate: any) => candidate.action === 'ACTIVATE')) {
      assert.equal(item.consent, 'OWN', `${entry.resourceType}/${item.id}`);
    }
  }

  // Repositories: private, organization-bounded, without implicit team, webhook or secret setup.
  const repository = contract(current, 'REPOSITORY');
  assert.equal(repository.rollback.mode, 'NO_AUTOMATIC_DESTRUCTIVE_ROLLBACK');
  for (const side of ['team access', 'webhooks', 'secrets']) {
    assert.ok(repository.neverImplicit.includes(side), side);
  }
  // Runtimes and domain bindings carry a health check and a non-destructive rollback.
  for (const resourceType of ['PROJECT_RUNTIME', 'DOMAIN_BINDING']) {
    const actions = contract(current, resourceType).steps.map((entry: any) => entry.action);
    assert.ok(actions.includes('HEALTH') && actions.includes('ROLLBACK'), resourceType);
    assert.equal(contract(current, resourceType).rollback.mode, 'RESTORE_BACKUP');
  }
  assert.ok(contract(current, 'DOMAIN_BINDING').neverImplicit.includes('protected applications of .mcp/server-map.json'));
});

test('gaps are carried by open program blueprints; F.2 makes the project runtime provisionable', async () => {
  const current = await policy();
  const capabilities = deriveProvisioningCapabilities(current);
  assert.ok(Object.isFrozen(capabilities));
  const byType = Object.fromEntries(capabilities.map((entry: any) => [entry.resourceType, entry]));
  for (const entry of capabilities as any[]) {
    assert.equal(entry.state, entry.resourceType === 'PROJECT_RUNTIME' ? 'PROVISIONABLE' : 'BLOCKED_BY_GAPS', entry.resourceType);
    assert.equal(entry.authorizationInferred, false);
    assert.equal(entry.mutationPerformed, false);
    assert.ok(Object.isFrozen(entry));
  }
  const carriers = (resourceType: string, id: string) => (
    byType[resourceType].gaps.find((gap: any) => gap.step === id)?.carriedBy
  );
  assert.deepEqual(carriers('REPOSITORY', 'create-repository'), ['TB-W3-ADMIN-01', 'TB-W3-F-02']);
  assert.deepEqual(carriers('DOMAIN_BINDING', 'bind-domain'), ['TB-W3-F-04']);
  // The consented route composes every mutating step of the runtime contract, and only of that contract.
  const runtime = contract(current, 'PROJECT_RUNTIME');
  assert.deepEqual(byType.PROJECT_RUNTIME.gaps, []);
  assert.deepEqual(byType.PROJECT_RUNTIME.composableSteps, runtime.steps.map((entry: any) => entry.id));
  for (const id of ['backup', 'create-runtime', 'activate', 'rollback']) {
    assert.deepEqual(step(current, 'PROJECT_RUNTIME', id).primitives, ['POST /provisioning/project-runtime'], id);
  }
  const route = current.primitives.find((entry: any) => entry.name === 'POST /provisioning/project-runtime');
  assert.deepEqual([route.kind, route.class, route.resourceTypes], ['HTTP_ROUTE', 'COMPOSABLE', ['PROJECT_RUNTIME']]);
  for (const guard of [/E3/, /ENABLE_WRITE_TOOLS/, /targetProjectIds/, /official branch the mapping names/, /immediately before every host write/]) {
    assert.ok(route.guards.some((entry: string) => guard.test(entry)), String(guard));
  }
  assert.deepEqual(carriers('DOMAIN_BINDING', 'observe-binding'), ['TB-W3-F-04', 'TB-W4-I1-01']);
  // What exists is reused: governed pull requests initialize content and bind a server target.
  assert.ok(byType.REPOSITORY.composableSteps.includes('initialize-content'));
  assert.ok(byType.PROJECT_RUNTIME.composableSteps.includes('bind-target'));
  assert.deepEqual(step(current, 'PROJECT_RUNTIME', 'bind-target').consent, 'GOVERNED_PULL_REQUEST');
  // A gap names what to generalize before anything new is added.
  assert.match(step(current, 'REPOSITORY', 'record-mapping').gap.reuse, /syncGithubReposToRegistry/);
  assert.match(step(current, 'PROJECT_RUNTIME', 'rollback').note, /Governed Deploy/);
});

test('the validator fails closed on drift, improvisation and implicit side effects', async () => {
  const base = await catalogue();
  const findings = (mutate: (current: any) => void, change: (current: any) => void = () => undefined) => {
    const current = structuredClone(base) as any;
    change(current);
    return policy().then((raw) => {
      mutate(raw);
      return validateProvisioningContracts(raw, current).findings.map((entry: any) => entry.code);
    });
  };
  const none = () => undefined;

  // The inventory follows the registered surface: no write primitive escapes it, none is stale.
  assert.ok((await findings(none, (current) => {
    current.tools.push({ name: 'github_create_repository', writeCapable: true });
  })).includes('WRITE_PRIMITIVE_UNCLASSIFIED'));
  assert.ok((await findings(none, (current) => {
    current.tools = current.tools.filter((tool: any) => tool.name !== 'github_create_branch');
  })).includes('PRIMITIVE_UNREGISTERED'));
  assert.ok((await findings(none, (current) => {
    current.mutatingRoutes.push('POST /provision/repository');
  })).includes('MUTATING_ROUTE_UNCLASSIFIED'));
  assert.ok((await findings(none, (current) => {
    current.workflows.push('provision.yml');
  })).includes('WORKFLOW_UNCLASSIFIED'));

  const replaceGap = (resourceType: string, id: string, primitives: string[]) => (raw: any) => {
    const target = contract(raw, resourceType).steps.find((entry: any) => entry.id === id);
    delete target.gap;
    target.primitives = primitives;
  };
  // No improvised primitive: project-bound, destructive or script runners never compose a step.
  assert.ok((await findings(replaceGap('PROJECT_RUNTIME', 'create-runtime', ['exec_repo_script_s2'])))
    .includes('STEP_PRIMITIVE_NOT_COMPOSABLE'));
  assert.ok((await findings(replaceGap('DOMAIN_BINDING', 'rollback', ['legacy_vhost_purge_s1'])))
    .includes('STEP_PRIMITIVE_NOT_COMPOSABLE'));
  assert.ok((await findings(replaceGap('REPOSITORY', 'create-repository', ['github_create_repository'])))
    .includes('STEP_PRIMITIVE_UNKNOWN'));

  // Consent is explicit, and activation carries its own.
  assert.ok((await findings((raw) => {
    step(raw, 'DOMAIN_BINDING', 'activate').consent = 'CONTRACT';
  })).includes('ACTIVATION_IMPLICIT'));
  assert.ok((await findings((raw) => {
    step(raw, 'REPOSITORY', 'create-repository').consent = 'NONE';
  })).includes('CONSENT_MISSING'));

  // A gap is carried by an open blueprint, never dropped or attributed to a finished one.
  assert.ok((await findings((raw) => {
    step(raw, 'DOMAIN_BINDING', 'bind-domain').gap.carriedBy = ['TB-W3-E3-01'];
  })).includes('GAP_CARRIER_DONE'));
  assert.ok((await findings((raw) => {
    step(raw, 'DOMAIN_BINDING', 'bind-domain').gap.carriedBy = ['TB-W9-UNKNOWN-01'];
  })).includes('GAP_CARRIER_UNKNOWN'));

  // Absence is observed first, observation never mutates, runtimes keep health and rollback.
  assert.ok((await findings((raw) => {
    contract(raw, 'REPOSITORY').steps.reverse();
  })).includes('ABSENCE_NOT_OBSERVED_FIRST'));
  assert.ok((await findings((raw) => {
    step(raw, 'REPOSITORY', 'observe-existing').mutates = true;
  })).includes('OBSERVE_MUTATES'));
  assert.ok((await findings((raw) => {
    const runtime = contract(raw, 'PROJECT_RUNTIME');
    runtime.steps = runtime.steps.filter((entry: any) => entry.action !== 'HEALTH');
  })).includes('HEALTH_MISSING'));
  assert.ok((await findings((raw) => {
    raw.invariants = raw.invariants.filter((entry: string) => entry !== 'NO_IMPLICIT_ACTIVATION');
  })).includes('INVARIANT_MISSING'));

  // The projection never grants permission and never adopts or overwrites an existing resource.
  assert.deepEqual(await findings((raw) => { raw.authority.grantsPermission = true; }), ['POLICY_INVALID']);
  assert.deepEqual(await findings((raw) => {
    contract(raw, 'REPOSITORY').existingResource.conflicting = 'ADOPT';
  }), ['POLICY_INVALID']);
});
