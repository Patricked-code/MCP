import { createGithubAppJwt, type GithubAppTokenDeps } from '../github/appInstallationToken.js';
import { CUG_APP_ID } from './admission.js';
import { asRecord } from './discoveryRegister.js';

const EXPECTED_OWNERS = [
  { owner: 'Patricked-code', ownerId: 270385782, endpoint: 'users' },
  { owner: 'chainsolutions-wealthtech', ownerId: 299685687, endpoint: 'orgs' },
  { owner: 'Wealthtechinnovations', ownerId: 94637590, endpoint: 'users' }
] as const;
const PAGE_SIZE = 100;
const MAX_PAGES = 20;
const MAX_BYTES = 4 * 1024 * 1024;
type Owner = (typeof EXPECTED_OWNERS)[number];
type Failure = 'INSTALLATION_UNVERIFIED' | 'INSTALLATION_SUSPENDED' | 'GRANT_UNVERIFIED' | 'REPOSITORIES_UNVERIFIED';
type Row = Readonly<{
  owner: Owner['owner']; ownerId: number;
} & (
  { status: 'UNVERIFIED'; reason: Failure }
  | { status: 'VERIFIED'; installationId: number; mode: 'all' | 'selected'; repositoryCount: number; repositoryIds: number[] }
)>;

function positiveId(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}

async function call(
  fetchImpl: typeof fetch, path: string, credential: string, status: number, body?: object
): Promise<Record<string, unknown> | undefined> {
  const res = await fetchImpl('https://api.github.com' + path, {
    method: body ? 'POST' : 'GET',
    headers: {
      Authorization: 'Bearer ' + credential,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(body ? { 'Content-Type': 'application/json' } : {})
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    redirect: 'error',
    signal: AbortSignal.timeout(15000)
  });
  if (res.status !== status || !res.body) {
    await res.body?.cancel().catch(() => {});
    return undefined;
  }
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const next = await reader.read();
      if (next.done) break;
      size += next.value.byteLength;
      if (size > MAX_BYTES) throw Error('CUG_COVERAGE_RESPONSE_LIMIT');
      chunks.push(next.value);
    }
    return asRecord(JSON.parse(Buffer.concat(chunks, size).toString('utf8')));
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}

function matchesOwner(value: unknown, owner: Owner): boolean {
  const account = asRecord(value);
  return account?.id === owner.ownerId
    && typeof account.login === 'string'
    && account.login.toLowerCase() === owner.owner.toLowerCase();
}

async function inventory(d: GithubAppTokenDeps, owner: Owner, jwt: string, started: Date): Promise<Row> {
  const identity = { owner: owner.owner, ownerId: owner.ownerId };
  let failure: Failure = 'INSTALLATION_UNVERIFIED';
  const unknown = (): Row => ({ ...identity, status: 'UNVERIFIED', reason: failure });
  try {
    const installation = await call(d.fetchImpl, '/' + owner.endpoint + '/' + owner.owner + '/installation', jwt, 200);
    if (!installation || installation.app_id !== Number(CUG_APP_ID) || !positiveId(installation.id)
      || !matchesOwner(installation.account, owner)
      || (installation.repository_selection !== 'all' && installation.repository_selection !== 'selected')) return unknown();
    if (installation.suspended_at !== null) {
      if (typeof installation.suspended_at === 'string') failure = 'INSTALLATION_SUSPENDED';
      return unknown();
    }
    failure = 'GRANT_UNVERIFIED';
    const grant = await call(d.fetchImpl, '/app/installations/' + installation.id + '/access_tokens', jwt, 201,
      { permissions: { metadata: 'read' } });
    const permissions = asRecord(grant?.permissions);
    const expiresAt = typeof grant?.expires_at === 'string' ? Date.parse(grant.expires_at) : NaN;
    if (!grant || typeof grant.token !== 'string' || !/^[A-Za-z0-9._-]{1,4096}$/.test(grant.token)
      || permissions?.metadata !== 'read' || Object.keys(permissions).length !== 1
      || !Number.isFinite(expiresAt) || expiresAt <= d.now().getTime() || expiresAt > started.getTime() + 2 * 60 * 60 * 1000) return unknown();

    failure = 'REPOSITORIES_UNVERIFIED';
    const ids = new Set<number>();
    let total: number | undefined;
    for (let page = 1; page <= MAX_PAGES; page++) {
      const response = await call(d.fetchImpl,
        '/installation/repositories?per_page=' + PAGE_SIZE + '&page=' + page, grant.token, 200);
      const count = response?.total_count;
      if (typeof count !== 'number' || !Number.isSafeInteger(count) || count < 0 || count > PAGE_SIZE * MAX_PAGES
        || (total !== undefined && total !== count) || !Array.isArray(response?.repositories)
        || response.repositories.length !== Math.min(PAGE_SIZE, count - ids.size)) return unknown();
      total = count;
      for (const item of response.repositories) {
        const repo = asRecord(item);
        if (!repo || !positiveId(repo.id) || !matchesOwner(repo.owner, owner) || ids.has(repo.id)) return unknown();
        ids.add(repo.id);
      }
      if (ids.size === total) {
        return { ...identity, status: 'VERIFIED', installationId: installation.id,
          mode: installation.repository_selection, repositoryCount: total, repositoryIds: [...ids].sort((a, b) => a - b) };
      }
    }
  } catch {
    // This operator report must never relay an upstream response, header or credential.
  }
  return unknown();
}

/** Explicit operator census, metadata-only. No runtime wiring, writes or provisioning. */
export async function collectCugCoverage(d: GithubAppTokenDeps) {
  const started = d.now();
  let jwt: string;
  try {
    jwt = createGithubAppJwt(CUG_APP_ID, await d.readPrivateKey(), started);
  } catch {
    throw new Error('CUG_COVERAGE_SIGNING_UNAVAILABLE');
  }
  const owners: Row[] = [];
  for (const owner of EXPECTED_OWNERS) owners.push(await inventory(d, owner, jwt, started));
  return { schemaVersion: 1, appId: Number(CUG_APP_ID), observedAt: started.toISOString(),
    complete: owners.every(row => row.status === 'VERIFIED'), owners };
}
