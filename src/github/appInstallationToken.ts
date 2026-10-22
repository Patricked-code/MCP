/** Additive GitHub App installation-token provider; no PAT migration. */
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
export type GithubAppTokenResult = Readonly<{ token: string; expiresAt: string; repository: string; installationId: number }>;
export type GithubAppTokenDeps = Readonly<{
  readPrivateKey: () => Promise<string>;
  fetchImpl: typeof fetch;
  now: () => Date;
}>;
export async function mintGithubAppRepoToken(_input: GithubAppTokenInput, _deps: GithubAppTokenDeps): Promise<GithubAppTokenResult> {
  throw new Error('GITHUB_APP_TOKEN_NOT_IMPLEMENTED');
}
