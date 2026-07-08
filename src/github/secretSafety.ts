import { GitHubToolError } from './errors.js';

const SECRET_CONTENT_PATTERNS: Array<{ code: string; pattern: RegExp; label: string }> = [
  {
    code: 'github_token_signal_detected',
    pattern: /\bgh[pousr]_[A-Za-z0-9_]{12,}\b/,
    label: 'GitHub classic token signal'
  },
  {
    code: 'github_fine_grained_token_signal_detected',
    pattern: /\bgithub_pat_[A-Za-z0-9_]{12,}\b/,
    label: 'GitHub fine-grained token signal'
  },
  {
    code: 'private_key_block_detected',
    pattern: /-----BEGIN (?:RSA |OPENSSH |EC |DSA |)?PRIVATE KEY-----/i,
    label: 'private key block'
  },
  {
    code: 'bearer_token_signal_detected',
    pattern: /\bAuthorization\s*:\s*Bearer\s+[A-Za-z0-9._~+/-]{16,}/i,
    label: 'Authorization bearer token signal'
  },
  {
    code: 'env_secret_assignment_detected',
    pattern: /(^|\n)\s*(?:TOKEN|SECRET|PASSWORD|PRIVATE_KEY|API_KEY|ACCESS_KEY|CLIENT_SECRET|JWT_SECRET|SESSION_SECRET)\s*=\s*[^\s#]+/i,
    label: '.env-style secret assignment'
  }
];

const SENSITIVE_FILE_PATTERNS: RegExp[] = [
  /^\.env($|\.)/i,
  /^\.npmrc$/i,
  /^\.pypirc$/i,
  /^\.netrc$/i,
  /^credentials\.json$/i,
  /^service-account\.json$/i,
  /\.(pem|key|p12|pfx)$/i,
  /(^|\/)(id_rsa|id_ed25519|id_ecdsa|id_dsa|authorized_keys)$/i,
  /(^|\/)\.ssh\/config$/i
];

export type PublicSafeTextKind = 'commit_message' | 'pull_request_title' | 'pull_request_body' | 'file_content' | 'audit_metadata';

export function detectSecretLikeContent(value: string): { code: string; label: string } | null {
  for (const entry of SECRET_CONTENT_PATTERNS) {
    if (entry.pattern.test(value)) {
      return { code: entry.code, label: entry.label };
    }
  }
  return null;
}

export function assertNoSecretLikeContent(value: string, kind: PublicSafeTextKind, context: string): string {
  const detection = detectSecretLikeContent(value);
  if (detection) {
    throw new GitHubToolError(
      detection.code,
      `Contenu sensible interdit dans ${kind}: ${context} (${detection.label})`
    );
  }
  return value;
}

export function assertPublicSafeUserText(value: string, kind: PublicSafeTextKind, context: string): string {
  return assertNoSecretLikeContent(value.trim(), kind, context);
}

export function assertSafeCommitMessage(value: string): string {
  const message = assertPublicSafeUserText(value, 'commit_message', 'message de commit');
  if (message.length < 8 || message.length > 240) {
    throw new GitHubToolError('invalid_commit_message', 'Message de commit invalide ou trop court.');
  }
  return message;
}

export function assertSafePullRequestTitle(value: string): string {
  const title = assertPublicSafeUserText(value, 'pull_request_title', 'titre de pull request');
  if (title.length < 8 || title.length > 180) {
    throw new GitHubToolError('invalid_pr_title', 'Titre de pull request invalide ou trop court.');
  }
  return title;
}

export function assertSafePullRequestBody(value: string | undefined): string {
  return assertPublicSafeUserText(value ?? '', 'pull_request_body', 'corps de pull request');
}

export function isSensitiveGitHubPath(path: string): boolean {
  const basename = path.split('/').pop() ?? '';
  return SENSITIVE_FILE_PATTERNS.some((pattern) => pattern.test(basename) || pattern.test(path));
}

export function assertPublicSafeFileContent(path: string, content: string): string {
  return assertNoSecretLikeContent(content, 'file_content', path);
}
