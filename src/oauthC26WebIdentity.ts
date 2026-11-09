import { createHmac, timingSafeEqual } from 'node:crypto';
import { lstatSync, readFileSync } from 'node:fs';

/**
 * Additive, OAuth-only operator identity for C26. This credential never grants
 * access to /mcp Bearer or the administrator's web dashboard.
 *
 * The value is provisioned locally under the existing /app/secrets mount and
 * must NOT be committed, logged, passed through a GitHub action or sent in chat.
 */
export const C26_OAUTH_SUBJECT = 'wealthtech-mcp-c26-agent';
export const C26_OAUTH_LOGIN_SECRET_PATH = '/app/secrets/mcp-c26-oauth-login-token';
export const C26_OAUTH_COOKIE_NAME = 'mcp_c26_oauth_session';

function readConfiguredSecret(): string | null {
  try {
    const info = lstatSync(C26_OAUTH_LOGIN_SECRET_PATH);
    // Deny shared-readable credentials and non-regular special devices.
    if (!info.isFile() || (info.mode & 0o077) !== 0) return null;
    const value = readFileSync(C26_OAUTH_LOGIN_SECRET_PATH, 'utf8').trim();
    // Reusing the shared administrative Bearer is never a C26 identity.
    if (value === process.env.MCP_AUTH_TOKEN) return null;
    return /^[A-Za-z0-9_-]{43,256}$/.test(value) ? value : null;
  } catch {
    // An unprovisioned or unreadable secret DISABLES C26, not OAuth admin.
    return null;
  }
}

function equalsConstantTime(input: string, expected: string): boolean {
  const candidate = Buffer.from(input, 'utf8');
  const known = Buffer.from(expected, 'utf8');
  return candidate.length === known.length && timingSafeEqual(candidate, known);
}

function signature(secret: string, expiresAt: number): string {
  return createHmac('sha256', secret)
    .update('wealthtech-mcp:c26:oauth-cookie:v1\n' + String(expiresAt))
    .digest('hex');
}

function cookieValue(cookieHeader: string | undefined): string | null {
  if (!cookieHeader) return null;
  for (const entry of cookieHeader.split(';')) {
    const at = entry.indexOf('=');
    if (at < 1 || entry.slice(0, at).trim() !== C26_OAUTH_COOKIE_NAME) continue;
    try {
      return decodeURIComponent(entry.slice(at + 1).trim());
    } catch {
      return null;
    }
  }
  return null;
}

export function verifyC26OAuthLoginToken(
  input: string,
  readSecret: () => string | null = readConfiguredSecret
): boolean {
  const secret = readSecret();
  return typeof secret === 'string' && /^[A-Za-z0-9_-]{43,256}$/.test(secret)
    && equalsConstantTime(input, secret);
}

/**
 * Single-read login exchange: the credential that was verified signs the same
 * cookie even during an operator-controlled secret rotation. Null means disabled
 * or invalid; no response contains the credential or its checksum.
 */
export function issueC26OAuthCookieFromLogin(
  input: string,
  options: { maxAgeSeconds: number; secure: boolean; now?: number; readSecret?: () => string | null }
): string | null {
  const secret = (options.readSecret ?? readConfiguredSecret)();
  if (!secret || secret === process.env.MCP_AUTH_TOKEN
    || !/^[A-Za-z0-9_-]{43,256}$/.test(secret) || !equalsConstantTime(input, secret)) return null;
  return issueC26OAuthCookie({ ...options, readSecret: () => secret });
}

/**
 * This cookie has Path=/oauth; it is not an administrative web-session cookie.
 * It can only be minted after a verified dedicated C26 login token.
 */
export function issueC26OAuthCookie(options: {
  maxAgeSeconds: number;
  secure: boolean;
  now?: number;
  readSecret?: () => string | null;
}): string {
  const secret = (options.readSecret ?? readConfiguredSecret)();
  if (secret === null || !/^[A-Za-z0-9_-]{43,256}$/.test(secret)) {
    throw new Error('C26_OAUTH_IDENTITY_NOT_PROVISIONED');
  }
  if (!Number.isSafeInteger(options.maxAgeSeconds)
    || options.maxAgeSeconds < 60 || options.maxAgeSeconds > 86_400) {
    throw new Error('C26_OAUTH_SESSION_TTL_INVALID');
  }
  const expiresAt = (options.now ?? Date.now()) + options.maxAgeSeconds * 1000;
  const value = `v1.${expiresAt}.${signature(secret, expiresAt)}`;
  return `${C26_OAUTH_COOKIE_NAME}=${encodeURIComponent(value)}; HttpOnly; SameSite=Lax; Path=/oauth; Max-Age=${options.maxAgeSeconds}${options.secure ? '; Secure' : ''}`;
}

export function c26SubjectFromCookie(
  header: string | undefined,
  options: { now?: number; readSecret?: () => string | null } = {}
): string | null {
  const secret = (options.readSecret ?? readConfiguredSecret)();
  if (secret === null || !/^[A-Za-z0-9_-]{43,256}$/.test(secret)) return null;
  const value = cookieValue(header);
  if (!value) return null;
  const chunks = value.split('.');
  if (chunks.length !== 3 || chunks[0] !== 'v1') return null;
  const expiresAt = Number(chunks[1]);
  const now = options.now ?? Date.now();
  if (!Number.isSafeInteger(expiresAt) || expiresAt <= now
    || expiresAt > now + 86_400_000
    || !/^[0-9a-f]{64}$/.test(chunks[2] ?? '')) return null;
  return equalsConstantTime(chunks[2]!, signature(secret, expiresAt))
    ? C26_OAUTH_SUBJECT : null;
}

export function clearC26OAuthCookie(secure: boolean): string {
  return `${C26_OAUTH_COOKIE_NAME}=; HttpOnly; SameSite=Lax; Path=/oauth; Max-Age=0${secure ? '; Secure' : ''}`;
}
