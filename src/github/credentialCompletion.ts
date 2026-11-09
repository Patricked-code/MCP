import type { GitHubConnectionStatus } from './connection.js';

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

/**
 * E2 (TB-W3-E2-01): the guided completion of the GitHub credential owned by
 * the /github and /git surfaces. Pure and free of configuration, so the
 * registry renderer shares it without loading the runtime environment.
 */
export type GithubCredentialCompletion = Readonly<{
  state: 'RESOLVED' | 'MISSING' | 'UNOBSERVED';
  ask: boolean;
  reasonCode:
    | 'COMPLETION_GITHUB_CREDENTIAL_CONNECTED'
    | 'COMPLETION_GITHUB_CREDENTIAL_MISSING'
    | 'COMPLETION_GITHUB_CREDENTIAL_INVALID'
    | 'COMPLETION_GITHUB_ACCOUNT_UNVERIFIED'
    | 'COMPLETION_GITHUB_UNOBSERVED';
}>;

/**
 * The credential is requested only when it is missing, refused by GitHub or
 * blind to the configured organization; a valid one is restored, never asked
 * again, and an observation GitHub could not answer asks for nothing.
 */
export function deriveGithubCredentialCompletion(status: GitHubConnectionStatus): GithubCredentialCompletion {
  const completion = (
    state: GithubCredentialCompletion['state'],
    reasonCode: GithubCredentialCompletion['reasonCode']
  ): GithubCredentialCompletion => Object.freeze({ state, ask: state === 'MISSING', reasonCode });
  if (!status.tokenFileExists) return completion('MISSING', 'COMPLETION_GITHUB_CREDENTIAL_MISSING');
  if (status.connected) return completion('RESOLVED', 'COMPLETION_GITHUB_CREDENTIAL_CONNECTED');
  if (status.userCheckStatus === 401) return completion('MISSING', 'COMPLETION_GITHUB_CREDENTIAL_INVALID');
  if (status.login && (status.orgCheckStatus === 403 || status.orgCheckStatus === 404)) {
    return completion('MISSING', 'COMPLETION_GITHUB_ACCOUNT_UNVERIFIED');
  }
  return completion('UNOBSERVED', 'COMPLETION_GITHUB_UNOBSERVED');
}

/** The guided completion card of the GitHub credential, shared by /github and /git. */
export function renderGithubCredentialCompletion(status: GitHubConnectionStatus): string {
  const completion = deriveGithubCredentialCompletion(status);
  const org = escapeHtml(status.org || 'non définie');
  const message = {
    COMPLETION_GITHUB_CREDENTIAL_CONNECTED: `<strong>Rien à fournir</strong> : l’identifiant GitHub du conteneur est connecté et valide pour ${org}. Ce contexte est restauré ; le remplacer reste facultatif.`,
    COMPLETION_GITHUB_CREDENTIAL_MISSING: '<strong>À fournir</strong> : un token GitHub. Aucun identifiant n’est visible par le conteneur MCP.',
    COMPLETION_GITHUB_CREDENTIAL_INVALID: '<strong>À fournir</strong> : un nouveau token GitHub. GitHub refuse l’identifiant actuel.',
    COMPLETION_GITHUB_ACCOUNT_UNVERIFIED: `<strong>À fournir</strong> : un token qui accède à l’organisation ${org}.`,
    COMPLETION_GITHUB_UNOBSERVED: '<strong>Observation GitHub indisponible</strong> : rien n’est demandé. Recharger la page plus tard.'
  }[completion.reasonCode];
  return `<section class="card" aria-labelledby="github-completion-heading">
    <h2 id="github-completion-heading">Complétion guidée</h2>
    <p>${message}</p>
    <p><code>${completion.reasonCode}</code></p>
  </section>`;
}

/** The credential form, requested only when the credential is missing; otherwise optional. */
export function renderGithubCredentialRequest(
  status: GitHubConnectionStatus,
  titles: { request: string; optional: string },
  form: string
): string {
  return deriveGithubCredentialCompletion(status).ask
    ? `<section class="card" id="github-credential-request">
    <h2>${titles.request}</h2>
    ${form}
  </section>`
    : `<details class="card">
    <summary>${titles.optional}</summary>
    ${form}
  </details>`;
}
