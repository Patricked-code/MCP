import type { Express, Request, Response } from 'express';
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { env } from './config/env.js';
import { logger } from './logger.js';

const DEFAULT_ISSUER = 'https://mcp.wealthtechinnovations.com';
const ACCESS_TOKEN_TTL_SECONDS = Math.max(
  300,
  Number.parseInt(process.env.MCP_OAUTH_ACCESS_TOKEN_TTL_SECONDS || '3600', 10)
);
const AUTHORIZATION_CODE_TTL_MS = Math.max(
  60,
  Number.parseInt(process.env.MCP_OAUTH_CODE_TTL_SECONDS || '300', 10)
) * 1000;

const AUTHORIZATION_CONSENT_TTL_MS = 10 * 60 * 1000;
const WEB_CONSENT_TTL_MS = 10 * 60 * 1000;

const SUPPORTED_SCOPES = ['mcp:read', 'mcp:write'] as const;

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
};

export type VerifiedOauthIdentity = {
  subject: string;
  clientId: string;
  scopes: string[];
  expiresAt: number;
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
    grant_types_supported: ['authorization_code'],
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

  return {
    subject: payload.sub,
    clientId: payload.client_id,
    scopes,
    expiresAt: payload.exp
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

type AuthorizationConsentRequest = {
  responseType: string;
  clientId: string;
  redirectUri: string;
  state: string | undefined;
  scope: string;
  resource: string;
  codeChallenge: string;
  codeChallengeMethod: string;
};

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function consentTicketSignature(request: AuthorizationConsentRequest, expiresAt: number): string {
  return hmac(`wealthtech-mcp-oauth-consent:v1\n${JSON.stringify([
    expiresAt,
    request.responseType,
    request.clientId,
    request.redirectUri,
    request.state ?? '',
    request.scope,
    request.resource,
    request.codeChallenge,
    request.codeChallengeMethod
  ])}`);
}

function issueConsentTicket(request: AuthorizationConsentRequest): string {
  const expiresAt = Date.now() + AUTHORIZATION_CONSENT_TTL_MS;
  return `${expiresAt}.${consentTicketSignature(request, expiresAt)}`;
}

function verifyConsentTicket(request: AuthorizationConsentRequest, ticket: string | undefined): boolean {
  const [expiresRaw, signature, extra] = (ticket ?? '').split('.');
  const expiresAt = Number(expiresRaw);

  if (extra !== undefined || !signature || !Number.isSafeInteger(expiresAt) || expiresAt <= Date.now()) {
    return false;
  }

  return safeEqualString(signature, consentTicketSignature(request, expiresAt));
}

function webConsentSignature(purpose: string, binding: string, expiresAt: number): string {
  return hmac(`wealthtech-mcp-web-consent:v1\n${JSON.stringify([expiresAt, purpose, binding])}`);
}

/**
 * E3 (TB-W3-E3-01): a signed, expiring consent ticket for a web mutation,
 * domain-separated from the OAuth consent and bound to its purpose and to the
 * web session that rendered the consent.
 */
export function issueWebConsentTicket(purpose: string, binding: string, now = Date.now()): string {
  const expiresAt = now + WEB_CONSENT_TTL_MS;
  return `${expiresAt}.${webConsentSignature(purpose, binding, expiresAt)}`;
}

export function verifyWebConsentTicket(purpose: string, ticket: unknown, binding: string, now = Date.now()): boolean {
  if (typeof ticket !== 'string') return false;
  const [expiresRaw, signature, extra] = ticket.split('.');
  const expiresAt = Number(expiresRaw);
  if (
    extra !== undefined
    || !signature
    || !Number.isSafeInteger(expiresAt)
    || expiresAt <= now
    || expiresAt > now + WEB_CONSENT_TTL_MS
  ) {
    return false;
  }
  return safeEqualString(signature, webConsentSignature(purpose, binding, expiresAt));
}

export function isSameOriginSubmission(req: Request): boolean {
  const fetchSite = req.header('sec-fetch-site');
  if (fetchSite !== undefined && fetchSite !== 'same-origin') {
    return false;
  }

  const origin = req.header('origin');
  return origin === undefined || origin === new URL(oauthIssuer()).origin;
}

function renderAuthorizationConsent(res: Response, request: AuthorizationConsentRequest): void {
  const redirectOrigin = new URL(request.redirectUri).origin;
  const hidden = (name: string, value: string) => (
    `<input type="hidden" name="${name}" value="${escapeHtml(value)}">`
  );

  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader(
    'Content-Security-Policy',
    `default-src 'none'; style-src 'unsafe-inline'; form-action 'self' ${redirectOrigin}; frame-ancestors 'none'; base-uri 'none'`
  );
  res.status(200).type('html').send(`<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Autoriser une connexion MCP</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #f5f6f8; color: #1f2933; margin: 0; padding: 24px 16px; }
    main { max-width: 520px; margin: 40px auto; background: #fff; border: 1px solid #d9dee5; border-radius: 10px; padding: 24px; }
    h1 { font-size: 20px; margin: 0 0 16px; }
    dl { margin: 0 0 16px; }
    dt { font-size: 12px; color: #52606d; margin-top: 12px; }
    dd { margin: 4px 0 0; font-family: ui-monospace, monospace; word-break: break-all; }
    p { font-size: 14px; line-height: 1.5; }
    .actions { display: flex; gap: 12px; margin-top: 20px; }
    button { flex: 1; padding: 10px; border-radius: 6px; border: 1px solid #9aa5b1; background: #fff; font-size: 15px; cursor: pointer; }
    button[value="approve"] { background: #1f6feb; border-color: #1f6feb; color: #fff; }
  </style>
</head>
<body>
  <main>
    <h1>Autoriser une connexion MCP</h1>
    <p>Une application demande un accès au serveur MCP WealthTech avec votre session opérateur.</p>
    <dl>
      <dt>Redirection vers</dt>
      <dd>${escapeHtml(redirectOrigin)}</dd>
      <dt>Client</dt>
      <dd>${escapeHtml(request.clientId)}</dd>
      <dt>Accès demandé</dt>
      <dd>${escapeHtml(request.scope)}</dd>
    </dl>
    <p>N'autorisez que si vous venez de lancer cette connexion depuis cette application.</p>
    <form method="post" action="/oauth/authorize">
      ${hidden('response_type', request.responseType)}
      ${hidden('client_id', request.clientId)}
      ${hidden('redirect_uri', request.redirectUri)}
      ${request.state === undefined ? '' : hidden('state', request.state)}
      ${hidden('scope', request.scope)}
      ${hidden('resource', request.resource)}
      ${hidden('code_challenge', request.codeChallenge)}
      ${hidden('code_challenge_method', request.codeChallengeMethod)}
      ${hidden('consent_ticket', issueConsentTicket(request))}
      <div class="actions">
        <button type="submit" name="decision" value="deny">Refuser</button>
        <button type="submit" name="decision" value="approve">Autoriser</button>
      </div>
    </form>
  </main>
</body>
</html>`);
}

function denyAuthorization(res: Response, request: AuthorizationConsentRequest): void {
  const redirectTarget = new URL(request.redirectUri);
  redirectTarget.searchParams.set('error', 'access_denied');

  if (request.state) {
    redirectTarget.searchParams.set('state', request.state);
  }

  redirectTarget.searchParams.set('iss', oauthIssuer());

  logger.info({ clientId: request.clientId, reasonCode: 'oauth_consent_denied' }, 'Autorisation OAuth MCP refusée');
  res.redirect(302, redirectTarget.toString());
}

function handleAuthorizeDecision(req: Request, res: Response, isAuthenticated: (req: Request) => boolean): void {
  if (!isAuthenticated(req)) {
    sendOAuthError(res, 401, 'access_denied', 'Une session opérateur est requise pour autoriser une connexion.');
    return;
  }

  if (!isSameOriginSubmission(req)) {
    sendOAuthError(res, 403, 'access_denied', "La décision d'autorisation doit provenir de la page de consentement.");
    return;
  }

  const decision = getSingleBodyParam(req, 'decision');
  if (decision === 'approve') {
    handleAuthorize(req, res, isAuthenticated, getSingleBodyParam, 'APPROVED');
    return;
  }

  if (decision === 'deny') {
    handleAuthorize(req, res, isAuthenticated, getSingleBodyParam, 'DENIED');
    return;
  }

  sendOAuthError(res, 400, 'invalid_request', 'decision doit valoir approve ou deny.');
}

function handleAuthorize(
  req: Request,
  res: Response,
  isAuthenticated: (req: Request) => boolean,
  readParam: (req: Request, name: string) => string | undefined = getSingleQueryParam,
  consent: 'REQUIRED' | 'APPROVED' | 'DENIED' = 'REQUIRED'
): void {
  if (!isAuthenticated(req)) {
    redirectToLogin(req, res);
    return;
  }

  const responseType = readParam(req, 'response_type');
  const clientId = readParam(req, 'client_id');
  const redirectUri = readParam(req, 'redirect_uri');
  const state = readParam(req, 'state');
  const scope = normalizeScopeString(readParam(req, 'scope'));
  const resource = normalizeResourceAlias(readParam(req, 'resource') || oauthIssuer());
  const codeChallenge = readParam(req, 'code_challenge');
  const codeChallengeMethod = readParam(req, 'code_challenge_method');

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

  const consentRequest: AuthorizationConsentRequest = {
    responseType,
    clientId,
    redirectUri,
    state,
    scope,
    resource,
    codeChallenge,
    codeChallengeMethod
  };

  if (consent === 'REQUIRED') {
    renderAuthorizationConsent(res, consentRequest);
    return;
  }

  if (!verifyConsentTicket(consentRequest, readParam(req, 'consent_ticket'))) {
    sendOAuthError(res, 400, 'invalid_request', 'Consentement absent, expiré ou ne correspondant pas à la demande.');
    return;
  }

  if (consent === 'DENIED') {
    denyAuthorization(res, consentRequest);
    return;
  }

  const code = issueAuthorizationCode({
    clientId,
    redirectUri,
    scope,
    resource,
    codeChallenge,
    codeChallengeMethod: 'S256',
    expiresAt: Date.now() + AUTHORIZATION_CODE_TTL_MS,
    subject: 'wealthtech-mcp-admin'
  });

  const redirectTarget = new URL(redirectUri);
  redirectTarget.searchParams.set('code', code);

  if (state) {
    redirectTarget.searchParams.set('state', state);
  }

  redirectTarget.searchParams.set('iss', oauthIssuer());

  logger.info({ clientId, scope, resource }, 'Code OAuth MCP généré');
  res.redirect(302, redirectTarget.toString());
}

function handleToken(req: Request, res: Response): void {
  pruneExpiredAuthorizationCodes();

  const grantType = getSingleBodyParam(req, 'grant_type');
  const code = getSingleBodyParam(req, 'code');
  const redirectUri = getSingleBodyParam(req, 'redirect_uri');
  const clientId = getSingleBodyParam(req, 'client_id');
  const codeVerifier = getSingleBodyParam(req, 'code_verifier');
  const resource = normalizeResourceAlias(getSingleBodyParam(req, 'resource') || oauthIssuer());

  if (grantType !== 'authorization_code') {
    sendOAuthError(res, 400, 'unsupported_grant_type', 'Seul grant_type=authorization_code est supporté.');
    return;
  }

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

  const nowSeconds = Math.floor(Date.now() / 1000);
  const accessToken = signAccessToken({
    typ: 'wealthtech-mcp-oauth',
    iss: oauthIssuer(),
    aud: oauthIssuer(),
    resource: oauthIssuer(),
    sub: record.subject,
    client_id: clientId,
    scope: record.scope,
    iat: nowSeconds,
    exp: nowSeconds + ACCESS_TOKEN_TTL_SECONDS,
    jti: base64Url(randomBytes(16))
  });

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

  app.post('/oauth/authorize', (req, res) => {
    handleAuthorizeDecision(req, res, options.isAuthenticated);
  });

  app.post('/oauth/token', (req, res) => {
    handleToken(req, res);
  });
}
