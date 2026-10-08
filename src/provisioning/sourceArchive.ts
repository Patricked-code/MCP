import { createHash } from 'node:crypto';
import { mkdir, open, unlink } from 'node:fs/promises';
import { dirname } from 'node:path';

/**
 * F.2 (TB-W3-F-03): the source of a provisioned runtime is the GitHub tarball
 * of the mapped repository at the exact revision. The API answers with one
 * redirect to a signed codeload URL (or, on GitHub Enterprise Server, to the
 * configured API host): the credential goes to the API only, never to the
 * archive URL, any other redirect target is refused, and the archive
 * is bounded and digested while it is written. Free of configuration: the
 * caller supplies the credential and the API base.
 */
const REPOSITORY_ID_PATTERN = /^github:([A-Za-z0-9][A-Za-z0-9-]{0,38})\/([A-Za-z0-9._-]{1,100})$/;
const SHA_PATTERN = /^[0-9a-f]{40}$/;
const ARCHIVE_HOSTS = new Set(['codeload.github.com']);
const DEFAULT_TIMEOUT_MS = 120_000;

export type ArchiveDownloadResult =
  | Readonly<{ ok: true; sha256: string; bytes: number }>
  | Readonly<{ ok: false; reasonCode: string }>;

export type ArchiveDownloadInput = {
  token: string;
  apiBase: string;
  repositoryId: string;
  revision: string;
  destination: string;
  maxBytes: number;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
};

function failure(reasonCode: string): ArchiveDownloadResult {
  return Object.freeze({ ok: false as const, reasonCode });
}

export async function downloadGithubArchive(input: ArchiveDownloadInput): Promise<ArchiveDownloadResult> {
  const repository = REPOSITORY_ID_PATTERN.exec(input.repositoryId);
  if (!repository || !SHA_PATTERN.test(input.revision) || !input.token) return failure('ARCHIVE_REQUEST_INVALID');
  let api: URL;
  try {
    api = new URL(input.apiBase);
  } catch {
    return failure('ARCHIVE_REQUEST_INVALID');
  }
  if (api.protocol !== 'https:') return failure('ARCHIVE_REQUEST_INVALID');
  const fetchImpl = input.fetchImpl ?? fetch;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), input.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  const headers = { 'User-Agent': 'wealthtech-mcp-guardian' };
  try {
    // The configured base keeps its path, such as /api/v3 on GitHub Enterprise Server.
    const base = `${api.origin}${api.pathname.replace(/\/+$/, '')}`;
    const endpoint = `${base}/repos/${repository[1]}/${repository[2]}/tarball/${input.revision}`;
    const redirect = await fetchImpl(endpoint, {
      method: 'GET',
      redirect: 'manual',
      signal: controller.signal,
      headers: {
        ...headers,
        Authorization: `Bearer ${input.token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28'
      }
    });
    if (redirect.status !== 302) return failure('ARCHIVE_REDIRECT_MISSING');
    let location: URL;
    try {
      location = new URL(redirect.headers.get('location') ?? '');
    } catch {
      return failure('ARCHIVE_REDIRECT_INVALID');
    }
    if (location.protocol !== 'https:' || !(ARCHIVE_HOSTS.has(location.hostname) || location.hostname === api.hostname)) {
      return failure('ARCHIVE_REDIRECT_REFUSED');
    }

    // The signed URL carries its own authorization: the credential is never forwarded.
    const archive = await fetchImpl(location.toString(), { method: 'GET', redirect: 'error', signal: controller.signal, headers });
    if (archive.status !== 200 || !archive.body) return failure('ARCHIVE_UNAVAILABLE');
    const declared = Number(archive.headers.get('content-length') ?? '0');
    if (declared > input.maxBytes) return failure('ARCHIVE_TOO_LARGE');

    await mkdir(dirname(input.destination), { recursive: true });
    const file = await open(input.destination, 'wx', 0o644);
    const hash = createHash('sha256');
    let bytes = 0;
    let complete = false;
    try {
      for await (const chunk of archive.body as unknown as AsyncIterable<Uint8Array>) {
        bytes += chunk.byteLength;
        if (bytes > input.maxBytes) return failure('ARCHIVE_TOO_LARGE');
        hash.update(chunk);
        await file.write(chunk);
      }
      complete = true;
    } finally {
      await file.close();
      // Only a partial archive of this download is removed: nothing else is touched.
      if (!complete) await unlink(input.destination).catch(() => undefined);
    }
    return Object.freeze({ ok: true as const, sha256: hash.digest('hex'), bytes });
  } catch {
    return failure('ARCHIVE_UNAVAILABLE');
  } finally {
    clearTimeout(timer);
  }
}
