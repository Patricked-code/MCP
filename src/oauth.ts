import type { Express, Request, Response } from 'express';
import { createHash, createHmac, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { env } from './config/env.js';
import { logger } from './logger.js';
import { getDefaultOAuthRefreshGrantService } from './oauthRefreshTokens.js';

const DEFAULT_ISSUER = 'https://mcp.wealthtechinnovations.com';
const ACCESS_TOKEN_TTL_SECONDS = Math.max(
  300,
  Number.parseInt(process.env.MCP_OAUTH_ACCESS_TOKEN_TTL_SECONDS || '3600', 10)
);
const AUTHORIZATION_CODE_TTL_MS = Math.max(
  60,
  Number.parseInt(process.env.MCP_OAUTH_CODE_TTL_SECONDS || '300', 10)
) * 1000;

const SUPPORTED_SCOPES = ['mcp:read', 'mcp:write', 'offline_access'] as const;

type SupportedScope = typeof SUPPORTED_SCOPES[number];

type AuthorizationCodeRecord = {
  clientId: string;
  redirectUri: string;
  scope: string;
  resource: string;
  codeChallenge: string;
  codeChallengeMethod: 'S256';
  expiresAt: number;
  subject: string;
  oauthAttemptRef: string;
};

type OAuthTokenPayload = {
  typ: 'wealthtech-mcp-oauth';
  iss: string;
  aud: string;
  resource: string;
  sub: string;
  client_id: string;
  scope: string;
  iat: number;
  exp: number;
  jti: string;
  oauth_attempt_ref?: string;
  grant_id?: string;
};

export type VerifiedOauthIdentity = {
  subject: string;
  clientId: string;
  scopes: string[];
  expiresAt: number;
  oauthAttemptRef?: string;
  oauthGrantId?: string;
};

type RegisterOAuthRoutesOptions = {
  isAuthenticated: (req: Request) => boolean;
};

const authorizationCodes = new Map<string, AuthorizationCodeRecord>();

function normalizeBaseUrl(value: string): string {
  return value.trim().replace(/\/+$/, '');
}

export function oauthIssuer(): string {
  return normalizeBaseUrl(process.env.MCP_WEB_BASE_URL || DEFAULT_ISSUER);
}

function normalizeResourceAlias(value: string): string {
  const normalized = normalizeBaseUrl(value);
  const issuer = oauthIssuer();

  if (normalized === issuer || normalized === `${issuer}/mcp`) {
    return issuer;
  }

  return normalized;
}

function isValidOAuthResource(value: string): boolean {
  return normalizeResourceAlias(value) === oauthIssuer();
}

export function protectedResourceMetadataUrl(): string {
  return `${oauthIssuer()}/.well-known/oauth-protected-resource`;
}

export function oauthChallengeHeader(scope = 'mcp:read'): string {
  return `Bearer resource_metadata="${protectedResourceMetadataUrl()}", scope="${scope}"`;
}

function oauthSecret(): string {
  return env.MCP_AUTH_TOKEN;
}

function base64Url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString('base64')
    .replaceAll('=', '')
    .replaceAll('+', '-')
    .replaceAll('/', '_');
}

function base64UrlJson(value: unknown): string {
  return base64Url(JSON.stringify(value));
}

function base64UrlToBuffer(value: string): Buffer {
  const normalized = value.replaceAll('-', '+').replaceAll('_', '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  return Buffer.from(padded, 'base64');
}

function hmac(input: string): string {
  return base64Url(createHmac('sha256', oauthSecret()).update(input).digest());
}

function safeEqualString(actual: string, expected: string): boolean {
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);

  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
}

function getSingleQueryParam(req: Request, name: string): string | undefined {
  const value = req.query[name];

  if (typeof value === 'string') {
    return value;
  }

  if (Array.isArray(value) && typeof value[0] === 'string') {
    return value[0];
  }

  return undefined;
}

function getSingleBodyParam(req: Request, name: string): string | undefined {
  const body = req.body as Record<string, unknown> | undefined;
  const value = body?.[name];

  if (typeof value === 'string') {
    return value;
  }

  if (Array.isArray(value) && typeof value[0] === 'string') {
    return value[0];
  }

  return undefined;
}

function isHttpsOrLocalUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' || parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
  } catch {
    return false;
  }
}

function normalizeScopeString(rawScope: string | undefined): string {
  const requested = (rawScope || 'mcp:read')
    .split(/\s+/)
    .map((scope) => scope.trim())
    .filter((scope): scope is SupportedScope => SUPPORTED_SCOPES.includes(scope as SupportedScope));

  const scopes = new Set<SupportedScope>(requested.length > 0 ? requested : ['mcp:read']);

  if (scopes.has('mcp:write')) {
    scopes.add('mcp:read');
  }

  return [...scopes].join(' ');
}

function buildAuthorizationServerMetadata() {
  const issuer = oauthIssuer();

  return {
    issuer,
    authorization_endpoint: `${issuer}/oauth/authorize`,
    token_endpoint: `${issuer}/oauth/token`,
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    code_challenge_methods_supported: ['S256'],
    token_endpoint_auth_methods_supported: ['none'],
    scopes_supported: SUPPORTED_SCOPES,
    client_id_metadata_document_supported: true
  };
}

function buildProtectedResourceMetadata() {
  const issuer = oauthIssuer();

  return {
    resource: issuer,
    authorization_servers: [issuer],
    scopes_supported: SUPPORTED_SCOPES,
    bearer_methods_supported: ['header'],
    resource_documentation: `${issuer}/dashboard`
  };
}

function pruneExpiredAuthorizationCodes(): void {
  const now = Date.now();

  for (const [code, record] of authorizationCodes) {
    if (record.expiresAt <= now) {
      authorizationCodes.delete(code);
    }
  }
}

function issueAuthorizationCode(record: AuthorizationCodeRecord): string {
  pruneExpiredAuthorizationCodes();

  const code = base64Url(randomBytes(32));
  authorizationCodes.set(code, record);

  return code;
}

function signAccessToken(payload: OAuthTokenPayload): string {
  const header = base64UrlJson({ alg: 'HS256', typ: 'JWT' });
  const body = base64UrlJson(payload);
  const signingInput = `${header}.${body}`;
  const signature = hmac(signingInput);

  return `${signingInput}.${signature}`;
}

function parseAccessToken(token: string): OAuthTokenPayload | null {
  const [header, body, signature] = token.split('.');

  if (!header || !body || !signature) {
    return null;
  }

  const signingInput = `${header}.${body}`;
  const expectedSignature = hmac(signingInput);

  if (!safeEqualString(signature, expectedSignature)) {
    return null;
  }

  try {
    const payload = JSON.parse(base64UrlToBuffer(body).toString('utf8')) as Partial<OAuthTokenPayload>;

    if (
      payload.typ !== 'wealthtech-mcp-oauth' ||
      typeof payload.iss !== 'string' ||
      typeof payload.aud !== 'string' ||
      typeof payload.resource !== 'string' ||
      typeof payload.sub !== 'string' ||
      typeof payload.client_id !== 'string' ||
      typeof payload.scope !== 'string' ||
      typeof payload.iat !== 'number' ||
      typeof payload.exp !== 'number' ||
      typeof payload.jti !== 'string'
    ) {
      return null;
    }

    return payload as OAuthTokenPayload;
  } catch {
    return null;
  }
}

export function inspectOauthAccessToken(
  token: string,
  requiredScope?: string
): VerifiedOauthIdentity | null {
  const payload = parseAccessToken(token);
  const issuer = oauthIssuer();
  const nowSeconds = Math.floor(Date.now() / 1000);

  if (!payload) {
    return null;
  }

  if (payload.iss !== issuer || payload.aud !== issuer || normalizeResourceAlias(payload.resource) !== issuer) {
    return null;
  }

  if (payload.exp <= nowSeconds || payload.iat > nowSeconds + 60) {
    return null;
  }

  const scopes = [...new Set(payload.scope.split(/\s+/).filter(Boolean))];
  if (requiredScope !== undefined && !scopes.includes(requiredScope)) {
    return null;
  }

  if (
    payload.oauth_attempt_ref !== undefined
    && !/^oa_[A-Za-z0-9_-]{22,64}$/.test(payload.oauth_attempt_ref)
  ) {
    return null;
  }
  if (
    payload.grant_id !== undefined
    && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(payload.grant_id)
  ) {
    return null;
  }

  return {
    subject: payload.sub,
    clientId: payload.client_id,
    scopes,
    expiresAt: payload.exp,
    ...(payload.oauth_attempt_ref ? { oauthAttemptRef: payload.oauth_attempt_ref } : {}),
    ...(payload.grant_id ? { oauthGrantId: payload.grant_id } : {})
  };
}

export function verifyOauthAccessToken(token: string, requiredScope = 'mcp:read'): boolean {
  return inspectOauthAccessToken(token, requiredScope) !== null;
}

function sendOAuthError(res: Response, status: number, error: string, description: string): void {
  res.status(status).json({
    error,
    error_description: description
  });
}

function redirectToLogin(req: Request, res: Response): void {
  res.redirect(`/login?next=${encodeURIComponent(req.originalUrl || '/oauth/authorize')}`);
}

function handleAuthorize(req: Request, res: Response, isAuthenticated: (req: Request) => boolean): void {
  if (!isAuthenticated(req)) {
    redirectToLogin(req, res);
    return;
  }

  const responseType = getSingleQueryParam(req, 'response_type');
  const clientId = getSingleQueryParam(req, 'client_id');
  const redirectUri = getSingleQueryParam(req, 'redirect_uri');
  const state = getSingleQueryParam(req, 'state');
  const scope = normalizeScopeString(getSingleQueryParam(req, 'scope'));
  const resource = normalizeResourceAlias(getSingleQueryParam(req, 'resource') || oauthIssuer());
  const codeChallenge = getSingleQueryParam(req, 'code_challenge');
  const codeChallengeMethod = getSingleQueryParam(req, 'code_challenge_method');

  if (responseType !== 'code') {
    sendOAuthError(res, 400, 'unsupported_response_type', 'Seul response_type=code est supporté.');
    return;
  }

  if (!clientId || !redirectUri || !codeChallenge) {
    sendOAuthError(res, 400, 'invalid_request', 'client_id, redirect_uri et code_challenge sont obligatoires.');
    return;
  }

  if (!isHttpsOrLocalUrl(redirectUri)) {
    sendOAuthError(res, 400, 'invalid_request', 'redirect_uri doit être une URL HTTPS ou locale.');
    return;
  }

  if (codeChallengeMethod !== 'S256') {
    sendOAuthError(res, 400, 'invalid_request', 'code_challenge_method=S256 est obligatoire.');
    return;
  }

  if (!isValidOAuthResource(resource)) {
    sendOAuthError(res, 400, 'invalid_target', 'Le paramètre resource ne correspond pas au serveur MCP WealthTech.');
    return;
  }

  const oauthAttemptRef = `oa_${base64Url(randomBytes(16))}`;
  const code = issueAuthorizationCode({
    clientId,
    redirectUri,
    scope,
    resource,
    codeChallenge,
    codeChallengeMethod: 'S256',
    expiresAt: Date.now() + AUTHORIZATION_CODE_TTL_MS,
    subject: 'wealthtech-mcp-admin',
    oauthAttemptRef
  });

  const redirectTarget = new URL(redirectUri);
  redirectTarget.searchParams.set('code', code);

  if (state) {
    redirectTarget.searchParams.set('state', state);
  }

  redirectTarget.searchParams.set('iss', oauthIssuer());

  logger.info({ clientId, scope, resource, oauthAttemptRef }, 'Code OAuth MCP généré');
  res.redirect(302, redirectTarget.toString());
}

function issueAccessToken(input: {
  subject: string;
  clientId: string;
  scope: string;
  oauthAttemptRef: string;
  oauthGrantId: string;
}): string {
  const nowSeconds = Math.floor(Date.now() / 1000);
  return signAccessToken({
    typ: 'wealthtech-mcp-oauth',
    iss: oauthIssuer(),
    aud: oauthIssuer(),
    resource: oauthIssuer(),
    sub: input.subject,
    client_id: input.clientId,
    scope: input.scope,
    iat: nowSeconds,
    exp: nowSeconds + ACCESS_TOKEN_TTL_SECONDS,
    jti: base64Url(randomBytes(16)),
    oauth_attempt_ref: input.oauthAttemptRef,
    grant_id: input.oauthGrantId
  });
}

async function handleToken(req: Request, res: Response): Promise<void> {
  pruneExpiredAuthorizationCodes();

  const grantType = getSingleBodyParam(req, 'grant_type');
  const refreshService = getDefaultOAuthRefreshGrantService();

  if (grantType === 'refresh_token') {
    const refreshToken = getSingleBodyParam(req, 'refresh_token');
    const clientId = getSingleBodyParam(req, 'client_id');
    const resource = normalizeResourceAlias(getSingleBodyParam(req, 'resource') || oauthIssuer());

    if (!refreshToken) {
      sendOAuthError(res, 400, 'invalid_request', 'refresh_token est obligatoire.');
      return;
    }
    if (!isValidOAuthResource(resource)) {
      sendOAuthError(res, 400, 'invalid_target', 'Le paramètre resource ne correspond pas au serveur MCP WealthTech.');
      return;
    }

    try {
      const rotated = await refreshService.rotate({
        refreshToken,
        ...(clientId ? { clientId } : {}),
        resource
      });
      const accessToken = issueAccessToken({
        subject: rotated.subject,
        clientId: rotated.clientId,
        scope: rotated.scopes.join(' '),
        oauthAttemptRef: rotated.oauthAttemptRef,
        oauthGrantId: rotated.grantId
      });

      res.json({
        access_token: accessToken,
        refresh_token: rotated.refreshToken,
        token_type: 'Bearer',
        expires_in: ACCESS_TOKEN_TTL_SECONDS,
        scope: rotated.scopes.join(' ')
      });
      return;
    } catch (error) {
      const code = error instanceof Error ? error.message : 'OAUTH_REFRESH_FAILED';
      logger.warn({ reasonCode: code }, 'Refresh OAuth MCP refusé');
      sendOAuthError(res, 400, 'invalid_grant', 'Refresh token absent, expiré, révoqué ou rejoué.');
      return;
    }
  }

  if (grantType !== 'authorization_code') {
    sendOAuthError(res, 400, 'unsupported_grant_type', 'grant_type doit être authorization_code ou refresh_token.');
    return;
  }

  const code = getSingleBodyParam(req, 'code');
  const redirectUri = getSingleBodyParam(req, 'redirect_uri');
  const clientId = getSingleBodyParam(req, 'client_id');
  const codeVerifier = getSingleBodyParam(req, 'code_verifier');
  const resource = normalizeResourceAlias(getSingleBodyParam(req, 'resource') || oauthIssuer());

  if (!code || !redirectUri || !clientId || !codeVerifier) {
    sendOAuthError(res, 400, 'invalid_request', 'code, redirect_uri, client_id et code_verifier sont obligatoires.');
    return;
  }

  const record = authorizationCodes.get(code);
  authorizationCodes.delete(code);

  if (!record || record.expiresAt <= Date.now()) {
    sendOAuthError(res, 400, 'invalid_grant', 'Code OAuth absent, expiré ou déjà utilisé.');
    return;
  }

  if (record.redirectUri !== redirectUri || record.clientId !== clientId || record.resource !== resource) {
    sendOAuthError(res, 400, 'invalid_grant', 'Les paramètres OAuth ne correspondent pas au code émis.');
    return;
  }

  const expectedChallenge = base64Url(createHash('sha256').update(codeVerifier).digest());

  if (!safeEqualString(expectedChallenge, record.codeChallenge)) {
    sendOAuthError(res, 400, 'invalid_grant', 'Vérification PKCE échouée.');
    return;
  }

  const oauthGrantId = randomUUID();
  const accessToken = issueAccessToken({
    subject: record.subject,
    clientId,
    scope: record.scope,
    oauthAttemptRef: record.oauthAttemptRef,
    oauthGrantId
  });

  if (record.scope.split(/\s+/).includes('offline_access')) {
    const refresh = await refreshService.issue({
      subject: record.subject,
      clientId,
      resource,
      scopes: record.scope.split(/\s+/).filter(Boolean),
      oauthAttemptRef: record.oauthAttemptRef,
      grantId: oauthGrantId
    });
    res.json({
      access_token: accessToken,
      refresh_token: refresh.refreshToken,
      token_type: 'Bearer',
      expires_in: ACCESS_TOKEN_TTL_SECONDS,
      scope: record.scope
    });
    return;
  }

  res.json({
    access_token: accessToken,
    token_type: 'Bearer',
    expires_in: ACCESS_TOKEN_TTL_SECONDS,
    scope: record.scope
  });
}

export function registerOauthRoutes(app: Express, options: RegisterOAuthRoutesOptions): void {
  app.get('/.well-known/oauth-protected-resource', (_req, res) => {
    res.json(buildProtectedResourceMetadata());
  });

  app.get('/.well-known/oauth-authorization-server', (_req, res) => {
    res.json(buildAuthorizationServerMetadata());
  });

  app.get('/oauth/authorize', (req, res) => {
    handleAuthorize(req, res, options.isAuthenticated);
  });

  app.post('/oauth/token', async (req, res) => {
    try {
      await handleToken(req, res);
    } catch (error) {
      logger.error({ error }, 'Erreur token OAuth MCP');
      if (!res.headersSent) {
        sendOAuthError(res, 500, 'server_error', 'Le serveur OAuth n’a pas pu traiter la requête.');
      }
    }
  });
}
