import { createPublicKey, verify as verifySignature } from 'node:crypto';

const TOKEN_MAX_BYTES = 16_384;
const JWKS_MAX_BYTES = 65_536;
const JWKS_MAX_KEYS = 32;
const JWKS_TIMEOUT_MS = 5_000;
const SHA_PATTERN = /^[0-9a-f]{40}$/;
const RUN_ID_PATTERN = /^[0-9]{1,30}$/;
const KID_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/;
const OIDC_JWKS_URL = 'https://token.actions.githubusercontent.com/.well-known/jwks';

export const GITHUB_OIDC_POLICY = Object.freeze({
  issuer: 'https://token.actions.githubusercontent.com',
  audience: 'https://mcp.wealthtechinnovations.com/deploy/github/s1',
  repository: 'Patricked-code/MCP',
  repositoryId: '1285534440',
  owner: 'Patricked-code',
  ownerId: '270385782',
  ref: 'refs/heads/main',
  workflowRef: 'Patricked-code/MCP/.github/workflows/mcp-deploy.yml@refs/heads/main',
  allowedEvents: Object.freeze(['push', 'workflow_dispatch'] as const)
});

interface GithubOidcHeader {
  alg?: unknown;
  typ?: unknown;
  kid?: unknown;
}

export interface GithubOidcClaims {
  iss?: unknown;
  aud?: unknown;
  sub?: unknown;
  exp?: unknown;
  iat?: unknown;
  nbf?: unknown;
  jti?: unknown;
  ref?: unknown;
  sha?: unknown;
  repository?: unknown;
  repository_id?: unknown;
  repository_owner?: unknown;
  repository_owner_id?: unknown;
  run_id?: unknown;
  run_number?: unknown;
  run_attempt?: unknown;
  workflow?: unknown;
  workflow_ref?: unknown;
  workflow_sha?: unknown;
  event_name?: unknown;
  [key: string]: unknown;
}

interface GithubJwk extends JsonWebKey {
  kid?: string;
  alg?: string;
  use?: string;
}

interface GithubJwks {
  keys: GithubJwk[];
}

export interface VerifyGithubOidcOptions {
  jwks?: { keys: JsonWebKey[] };
  nowEpochSeconds?: number;
}

function oidcError(code: string): Error {
  return new Error(code);
}

export function githubOidcJwksUrl(): string {
  return OIDC_JWKS_URL;
}

function decodeJsonSegment<T>(segment: string, errorCode: string): T {
  if (!segment || segment.length > TOKEN_MAX_BYTES) throw oidcError(errorCode);
  try {
    const decoded = Buffer.from(segment, 'base64url').toString('utf8');
    if (!decoded || decoded.length > TOKEN_MAX_BYTES) throw oidcError(errorCode);
    return JSON.parse(decoded) as T;
  } catch (error) {
    if (error instanceof Error && error.message === errorCode) throw error;
    throw oidcError(errorCode);
  }
}

function parseJwt(token: string): {
  header: GithubOidcHeader;
  claims: GithubOidcClaims;
  signingInput: string;
  signature: Buffer;
} {
  if (typeof token !== 'string' || Buffer.byteLength(token, 'utf8') > TOKEN_MAX_BYTES) {
    throw oidcError('oidc_token_too_large');
  }

  const parts = token.split('.');
  if (parts.length !== 3 || parts.some((part) => part.length === 0)) {
    throw oidcError('oidc_token_invalid');
  }

  const header = decodeJsonSegment<GithubOidcHeader>(parts[0], 'oidc_header_invalid');
  const claims = decodeJsonSegment<GithubOidcClaims>(parts[1], 'oidc_claims_invalid');
  let signature: Buffer;
  try {
    signature = Buffer.from(parts[2], 'base64url');
  } catch {
    throw oidcError('oidc_signature_invalid');
  }
  if (signature.length === 0 || signature.length > 1024) throw oidcError('oidc_signature_invalid');

  return {
    header,
    claims,
    signingInput: `${parts[0]}.${parts[1]}`,
    signature
  };
}

function validateHeader(header: GithubOidcHeader): string {
  if (header.alg !== 'RS256') throw oidcError('oidc_alg_invalid');
  if (header.typ !== 'JWT') throw oidcError('oidc_typ_invalid');
  if (typeof header.kid !== 'string' || !KID_PATTERN.test(header.kid)) {
    throw oidcError('oidc_kid_invalid');
  }
  return header.kid;
}

function normalizeJwks(value: unknown): GithubJwks {
  if (!value || typeof value !== 'object') throw oidcError('oidc_jwks_invalid');
  const keys = (value as { keys?: unknown }).keys;
  if (!Array.isArray(keys) || keys.length === 0 || keys.length > JWKS_MAX_KEYS) {
    throw oidcError('oidc_jwks_invalid');
  }
  return { keys: keys as GithubJwk[] };
}

async function fetchGithubJwks(): Promise<GithubJwks> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), JWKS_TIMEOUT_MS);
  try {
    const response = await fetch(OIDC_JWKS_URL, {
      method: 'GET',
      redirect: 'error',
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'wealthtech-mcp-github-oidc'
      }
    });
    if (!response.ok) throw oidcError('oidc_jwks_unavailable');
    const text = await response.text();
    if (Buffer.byteLength(text, 'utf8') > JWKS_MAX_BYTES) throw oidcError('oidc_jwks_invalid');
    try {
      return normalizeJwks(JSON.parse(text));
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('oidc_')) throw error;
      throw oidcError('oidc_jwks_invalid');
    }
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('oidc_')) throw error;
    throw oidcError('oidc_jwks_unavailable');
  } finally {
    clearTimeout(timeout);
  }
}

function selectVerificationKey(jwks: GithubJwks, kid: string): GithubJwk {
  const matches = jwks.keys.filter((key) => key?.kid === kid);
  if (matches.length !== 1) throw oidcError('oidc_kid_unknown');
  const key = matches[0];
  if (key.kty !== 'RSA') throw oidcError('oidc_key_invalid');
  if (key.alg !== undefined && key.alg !== 'RS256') throw oidcError('oidc_key_invalid');
  if (key.use !== undefined && key.use !== 'sig') throw oidcError('oidc_key_invalid');
  return key;
}

function stringClaim(claims: GithubOidcClaims, key: string, errorCode: string): string {
  const value = claims[key];
  if (typeof value !== 'string' || value.length === 0 || value.length > 512) {
    throw oidcError(errorCode);
  }
  return value;
}

function numericClaim(claims: GithubOidcClaims, key: 'exp' | 'iat' | 'nbf', errorCode: string): number {
  const value = claims[key];
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
    throw oidcError(errorCode);
  }
  return value;
}

function validateClaims(claims: GithubOidcClaims, requestedSha: string, now: number): void {
  if (stringClaim(claims, 'iss', 'oidc_issuer_invalid') !== GITHUB_OIDC_POLICY.issuer) {
    throw oidcError('oidc_issuer_invalid');
  }
  if (stringClaim(claims, 'aud', 'oidc_audience_invalid') !== GITHUB_OIDC_POLICY.audience) {
    throw oidcError('oidc_audience_invalid');
  }
  if (stringClaim(claims, 'repository', 'oidc_repository_invalid') !== GITHUB_OIDC_POLICY.repository) {
    throw oidcError('oidc_repository_invalid');
  }
  if (stringClaim(claims, 'repository_id', 'oidc_repository_id_invalid') !== GITHUB_OIDC_POLICY.repositoryId) {
    throw oidcError('oidc_repository_id_invalid');
  }
  if (stringClaim(claims, 'repository_owner', 'oidc_owner_invalid') !== GITHUB_OIDC_POLICY.owner) {
    throw oidcError('oidc_owner_invalid');
  }
  if (stringClaim(claims, 'repository_owner_id', 'oidc_owner_id_invalid') !== GITHUB_OIDC_POLICY.ownerId) {
    throw oidcError('oidc_owner_id_invalid');
  }
  if (stringClaim(claims, 'ref', 'oidc_ref_invalid') !== GITHUB_OIDC_POLICY.ref) {
    throw oidcError('oidc_ref_invalid');
  }
  if (stringClaim(claims, 'workflow_ref', 'oidc_workflow_invalid') !== GITHUB_OIDC_POLICY.workflowRef) {
    throw oidcError('oidc_workflow_invalid');
  }

  const eventName = stringClaim(claims, 'event_name', 'oidc_event_not_allowed');
  if (!GITHUB_OIDC_POLICY.allowedEvents.includes(eventName as 'push' | 'workflow_dispatch')) {
    throw oidcError('oidc_event_not_allowed');
  }

  const tokenSha = stringClaim(claims, 'sha', 'oidc_sha_mismatch').toLowerCase();
  if (!SHA_PATTERN.test(tokenSha) || tokenSha !== requestedSha) throw oidcError('oidc_sha_mismatch');

  const runId = stringClaim(claims, 'run_id', 'oidc_run_id_invalid');
  if (!RUN_ID_PATTERN.test(runId)) throw oidcError('oidc_run_id_invalid');

  const exp = numericClaim(claims, 'exp', 'oidc_exp_invalid');
  const iat = numericClaim(claims, 'iat', 'oidc_iat_invalid');
  const nbf = numericClaim(claims, 'nbf', 'oidc_nbf_invalid');
  if (exp <= now) throw oidcError('oidc_expired');
  if (nbf > now) throw oidcError('oidc_not_yet_valid');
  if (iat > now || iat > exp || nbf > exp) throw oidcError('oidc_iat_invalid');
}

export async function verifyGithubOidcToken(
  token: string,
  requestedShaInput: string,
  options: VerifyGithubOidcOptions = {}
): Promise<GithubOidcClaims> {
  const requestedSha = typeof requestedShaInput === 'string' ? requestedShaInput.toLowerCase() : '';
  if (!SHA_PATTERN.test(requestedSha)) throw oidcError('requested_sha_invalid');

  const parsed = parseJwt(token);
  const kid = validateHeader(parsed.header);
  const jwks = options.jwks ? normalizeJwks(options.jwks) : await fetchGithubJwks();
  const jwk = selectVerificationKey(jwks, kid);

  let publicKey;
  try {
    publicKey = createPublicKey({ key: jwk, format: 'jwk' });
  } catch {
    throw oidcError('oidc_key_invalid');
  }

  const signatureValid = verifySignature(
    'RSA-SHA256',
    Buffer.from(parsed.signingInput, 'utf8'),
    publicKey,
    parsed.signature
  );
  if (!signatureValid) throw oidcError('oidc_signature_invalid');

  const now = options.nowEpochSeconds ?? Math.floor(Date.now() / 1000);
  if (!Number.isSafeInteger(now) || now < 0) throw oidcError('oidc_now_invalid');
  validateClaims(parsed.claims, requestedSha, now);
  return parsed.claims;
}
