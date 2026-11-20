import { createHash, randomUUID } from 'node:crypto';
import { constants } from 'node:fs';
import { link, lstat, mkdir, open, readdir, unlink } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { z } from 'zod';
import { mintGithubAppRepoToken, type GithubAppTokenDeps } from '../github/appInstallationToken.js';
import type { GitRegistryEvidence } from '../github/registry.js';
import { CUG_APP_ID } from './admission.js';
import { asRecord, CUG_PILOT_REPOSITORY_ID } from './discoveryRegister.js';

const OWNER = 'chainsolutions-wealthtech';
const REPOSITORY = 'universal-agent-engineering-system';
const OWNER_ID = 299685687;
const API = 'https://api.github.com';
const POSITIVE_ID = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);
const targetSchema = z.object({
  installationId: POSITIVE_ID,
  githubRepositoryId: POSITIVE_ID,
  githubOwnerId: POSITIVE_ID,
  ownerLogin: z.string().regex(/^[A-Za-z0-9][A-Za-z0-9-]{0,38}$/),
  name: z.string().regex(/^[A-Za-z0-9_.-]{1,100}$/).refine(name => name !== '.' && name !== '..')
}).strict();

export type CugInventoryTarget = Readonly<z.infer<typeof targetSchema>>;

/** Parse only the bounded operator syntax, before any credential is requested. */
export function parseCugInventoryTargetArgs(args: readonly string[]): CugInventoryTarget | null {
  const [installation, repository, owner, fullName] = args;
  if (args.length !== 4 || ![installation, repository, owner].every(id => /^[1-9][0-9]{0,15}$/.test(id ?? ''))) {
    return null;
  }
  const names = fullName?.split('/');
  if (names?.length !== 2) return null;
  const parsed = targetSchema.safeParse({ installationId: Number(installation),
    githubRepositoryId: Number(repository), githubOwnerId: Number(owner), ownerLogin: names[0], name: names[1] });
  return parsed.success ? parsed.data : null;
}


function repositorySchema(target: CugInventoryTarget, fullName: string) {
  return z.object({
    id: z.literal(target.githubRepositoryId),
    full_name: z.literal(fullName),
    name: z.literal(target.name),
    html_url: z.literal('https://github.com/' + fullName),
    owner: z.object({ id: z.literal(target.githubOwnerId), login: z.literal(target.ownerLogin) }),
    default_branch: z.string().min(1).max(255).regex(/^[^\u0000-\u001f\u007f]+$/),
    visibility: z.enum(['public', 'private', 'internal']),
    archived: z.boolean(),
    fork: z.boolean()
  });
}

type Dependencies = GithubAppTokenDeps & { readRegistryEvidence: () => Promise<GitRegistryEvidence> };
type Status = 'GIT_REGISTRY_UNAVAILABLE' | 'NO_NAME_MATCH' | 'NAME_MATCH_REQUIRES_BINDING_PROOF'
  | 'MULTIPLE_NAME_MATCHES_REQUIRES_RECONCILIATION';

async function boundedJson(response: Response, limit: number): Promise<unknown> {
  if (!response.body) throw Error('CUG_PILOT_GITHUB_BODY_UNAVAILABLE');
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > limit) throw Error('CUG_PILOT_GITHUB_BODY_LIMIT');
      chunks.push(value);
    }
  } catch (error) {
    await reader.cancel().catch(() => {});
    throw error;
  } finally {
    reader.releaseLock();
  }
  return JSON.parse(Buffer.concat(chunks, size).toString('utf8')) as unknown;
}

/** One trusted operator target, never a name or identity asserted by a webhook. */
export async function collectCugScopedInventory(input: CugInventoryTarget, deps: Dependencies) {
  const target = targetSchema.parse(input);
  const { installationId, ownerLogin, name } = target;
  const fullName = ownerLogin + '/' + name;
  const fetchGitHub: typeof fetch = async (input, options) => {
    const url = new URL(String(input));
    if (url.origin !== API || url.username || url.password) throw Error('CUG_PILOT_GITHUB_HOST_INVALID');
    return deps.fetchImpl(url.toString(), { ...options, redirect: 'error' });
  };
  const grant = await mintGithubAppRepoToken({
    installation: { appId: CUG_APP_ID, installationId, accountLogin: ownerLogin },
    repository: fullName,
    contentsPermission: 'read'
  }, { ...deps, fetchImpl: async (input, options) => {
    const response = await fetchGitHub(input, options);
    if (response.status !== 201) {
      await response.body?.cancel().catch(() => {});
      return new Response(null, { status: response.status });
    }
    const parsed = await boundedJson(response, 64 * 1024);
    return Response.json(parsed, { status: 201 });
  } });
  const get = async (path: string) => {
    const response = await fetchGitHub(API + path, {
      method: 'GET',
      headers: {
        Authorization: 'Bearer ' + grant.token,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28'
      },
      signal: AbortSignal.timeout(15_000)
    });
    if (response.status !== 200) {
      await response.body?.cancel().catch(() => {});
      throw Error('CUG_PILOT_GITHUB_READ_UNAVAILABLE');
    }
    return boundedJson(response, 256 * 1024);
  };
  // A public repository GET alone does not attest installation coverage.
  const membership = asRecord(await get('/installation/repositories?per_page=2'));
  const repos = membership?.repositories;
  const covered = Array.isArray(repos) && repos.length === 1 ? asRecord(repos[0]) : undefined;
  if (membership?.total_count !== 1 || covered?.id !== target.githubRepositoryId
    || covered?.full_name !== fullName) throw Error('CUG_PILOT_INSTALLATION_NOT_ATTESTED');
  const repository = repositorySchema(target, fullName).parse(await get('/repos/' + fullName));
  const observedAt = deps.now().toISOString();
  const registry = await deps.readRegistryEvidence();
  const matchCount = registry.available
    ? registry.mappings.filter((item) => (item.githubOwner + '/' + item.githubRepo).toLowerCase() === fullName.toLowerCase()).length
    : null;
  const status: Status = matchCount === null ? 'GIT_REGISTRY_UNAVAILABLE'
    : matchCount === 0 ? 'NO_NAME_MATCH'
      : matchCount === 1 ? 'NAME_MATCH_REQUIRES_BINDING_PROOF' : 'MULTIPLE_NAME_MATCHES_REQUIRES_RECONCILIATION';
  return {
    schemaVersion: 1 as const,
    source: 'GITHUB_API_CUG_INSTALLATION' as const,
    observedAt,
    repository: {
      githubRepositoryId: repository.id, githubOwnerId: repository.owner.id, ownerLogin: repository.owner.login,
      name: repository.name, htmlUrl: repository.html_url, defaultBranch: repository.default_branch,
      visibility: repository.visibility, archived: repository.archived, fork: repository.fork
    },
    apps: {
      coverage: 'PARTIAL' as const,
      confirmed: [{ name: 'CUG', appId: Number(CUG_APP_ID), installationId }],
      otherApps: 'UNVERIFIED' as const
    },
    registryCandidate: {
      status, observedRegistryDigest: registry.available ? registry.digest : null, matchCount,
      serverBinding: 'NOT_VERIFIED' as const, provisioningAuthorized: false as const
    }
  };
}

export function collectCugPilotInventory(installationId: number, deps: Dependencies) {
  return collectCugScopedInventory({ installationId, githubRepositoryId: CUG_PILOT_REPOSITORY_ID,
    githubOwnerId: OWNER_ID, ownerLogin: OWNER, name: REPOSITORY }, deps);
}

export type CugPilotInventory = Awaited<ReturnType<typeof collectCugPilotInventory>>;

/** Immutable private snapshots, keyed by the whole projected evidence. */
export async function persistCugPilotInventory(directory: string, inventory: CugPilotInventory): Promise<string> {
  await mkdir(directory, { mode: 0o700 }).catch((error: NodeJS.ErrnoException) => {
    if (error.code !== 'EEXIST') throw error;
  });
  const metadata = await lstat(directory);
  if (!metadata.isDirectory() || (metadata.mode & 0o777) !== 0o700) throw Error('CUG_PILOT_STORE_UNAVAILABLE');
  const serialized = JSON.stringify(inventory) + '\n';
  const id = createHash('sha256').update(serialized).digest('hex');
  const path = join(directory, id + '.json');
  const staging = join(directory, '.' + randomUUID() + '.pending');
  const dir = await open(directory, constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW);
  try {
    // Manual pilot only. The continuous consumer will need a retention policy.
    if ((await readdir(directory)).length >= 1000) throw Error('CUG_PILOT_STORE_FULL');
    const file = await open(staging, 'wx', 0o600);
    try {
      try { await file.writeFile(serialized, 'utf8'); await file.sync(); } finally { await file.close(); }
      try { await link(staging, path); } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
        const existing = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
        try {
          const stat = await existing.stat();
          if (!stat.isFile() || (stat.mode & 0o777) !== 0o600 || stat.size !== Buffer.byteLength(serialized)
            || await existing.readFile('utf8') !== serialized) throw Error('CUG_PILOT_STORE_CONFLICT');
        } finally { await existing.close(); }
      }
      await dir.sync();
      const parent = await open(dirname(directory), constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW);
      try { await parent.sync(); } finally { await parent.close(); }
      return id;
    } finally { await unlink(staging).catch(() => {}); }
  } finally { await dir.close(); }
}
