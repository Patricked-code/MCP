import { createPrivateKey, sign } from 'node:crypto';

/**
 * Reuses an existing GitHub App installation; no new App, PAT migration, or
 * persistent access token. Host wiring supplies the protected private key.
 *
 * The installation must already be authorized on the target account. GitHub
 * enforces the repository and permission requested when minting the token.
 */
export type GithubAppInstallation = Readonly<{
  appId: string;
  installationId: number;
  accountLogin: string;
}>;
export type GithubAppTokenInput = Readonly<{
  installation: GithubAppInstallation;
  repository: string;
  contentsPermission: 'read' | 'write';
}>;
export type GithubAppTokenResult = Readonly<{
  token: string;
  expiresAt: string;
  repository: string;
  installationId: number;
}>;
export type GithubAppTokenDeps = Readonly<{
  readPrivateKey: () => Promise<string>;
  fetchImpl: typeof fetch;
  now: () => Date;
}>;

const ACCOUNT = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/;
const REPO = /^[A-Za-z0-9_.-]{1,100}$/;

function targetRepository(input: GithubAppTokenInput): string {
  const { installation, repository, contentsPermission } = input;
  const names = repository.split('/');
  if (names.length !== 2
    || !ACCOUNT.test(names[0]!)
    || !REPO.test(names[1]!)
    || names[1] === '.' || names[1] === '..'
    || !ACCOUNT.test(installation.accountLogin)
    || names[0]!.toLowerCase() !== installation.accountLogin.toLowerCase()
    || !/^[0-9]{1,20}$/.test(installation.appId)
    || !Number.isSafeInteger(installation.installationId)
    || installation.installationId <= 0
    || (contentsPermission !== 'read' && contentsPermission !== 'write')) {
    throw new Error('GITHUB_APP_TARGET_INVALID');
  }
  return names[1]!;
}

function appJwt(appId: string, key: string, now: Date): string {
  const seconds = Math.floor(now.getTime() / 1000);
  if (!Number.isSafeInteger(seconds) || seconds <= 0) {
    throw new Error('GITHUB_APP_CLOCK_INVALID');
  }
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    iat: seconds - 60, exp: seconds + 540, iss: appId
  })).toString('base64url');
  const input = header + '.' + payload;
  try {
    const privateKey = createPrivateKey(key);
    const signature = sign('RSA-SHA256', Buffer.from(input), privateKey).toString('base64url');
    return input + '.' + signature;
  } catch {
    // Neither the invalid PEM nor library errors containing it are logged.
    throw new Error('GITHUB_APP_SIGNING_UNAVAILABLE');
  }
}

export async function mintGithubAppRepoToken(
  input: GithubAppTokenInput,
  deps: GithubAppTokenDeps
): Promise<GithubAppTokenResult> {
  const repoName = targetRepository(input);
  const now = deps.now();
  let privateKey: string;
  try {
    privateKey = await deps.readPrivateKey();
  } catch {
    throw new Error('GITHUB_APP_SIGNING_UNAVAILABLE');
  }
  const jwt = appJwt(input.installation.appId, privateKey, now);
  // The GitHub API restricts this token to one explicitly authorized repo.
  let response: Response;
  try {
    response = await deps.fetchImpl(
      'https://api.github.com/app/installations/' + input.installation.installationId + '/access_tokens',
      {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + jwt,
          Accept: 'application/vnd.github+json',
          'Content-Type': 'application/json',
          'X-GitHub-Api-Version': '2022-11-28'
        },
        body: JSON.stringify({
          repositories: [repoName],
          permissions: { contents: input.contentsPermission }
        }),
        signal: AbortSignal.timeout(15000)
      }
    );
  } catch {
    throw new Error('GITHUB_APP_INSTALLATION_TOKEN_UNAVAILABLE');
  }
  if (response.status !== 201) {
    throw new Error('GITHUB_APP_INSTALLATION_TOKEN_REFUSED');
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new Error('GITHUB_APP_INSTALLATION_TOKEN_INVALID');
  }
  if (!payload || typeof payload !== 'object') {
    throw new Error('GITHUB_APP_INSTALLATION_TOKEN_INVALID');
  }
  const grant = payload as Record<string, unknown>;
  const exp = typeof grant.expires_at === 'string' ? Date.parse(grant.expires_at) : NaN;
  if (typeof grant.token !== 'string'
    || grant.token.length < 1
    || grant.token.length > 4096
    || !Number.isFinite(exp)
    || exp <= now.getTime() + 60_000
    || exp > now.getTime() + 2 * 60 * 60 * 1000) {
    throw new Error('GITHUB_APP_INSTALLATION_TOKEN_INVALID');
  }
  // Never write this short-lived token to an on-disk registry.
  return {
    token: grant.token,
    expiresAt: new Date(exp).toISOString(),
    repository: input.repository,
    installationId: input.installation.installationId
  };
}
