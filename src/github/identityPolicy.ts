import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

import { z } from 'zod';

const BOUNDED_POLICY_BYTES = 64 * 1024;
const TimestampSchema = z.string().datetime({ offset: true });
const BoundedStringSchema = z.string().trim().min(1).max(500);
const GithubLoginSchema = z.string().trim().min(1).max(120).regex(/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/);
const RepositorySchema = z.string().trim().min(3).max(241)
  .regex(/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/);

const S1GithubDeploymentIdentitySchema = z.object({
  id: z.string().trim().min(1).max(120),
  type: z.string().trim().min(1).max(120),
  repository: RepositorySchema,
  fetchAlias: z.string().trim().min(1).max(255),
  contentsRead: z.boolean(),
  contentsWrite: z.boolean(),
  pushUrl: z.string().trim().min(1).max(255),
  privateKeyReadableByMcp: z.boolean()
}).strict();

const IdentityPolicyBaseShape = {
  updatedAt: TimestampSchema,
  goal: BoundedStringSchema,
  currentSignals: z.array(BoundedStringSchema).min(1).max(100),
  limits: z.array(BoundedStringSchema).max(100),
  s1GithubDeploymentIdentity: S1GithubDeploymentIdentitySchema,
  requiredSuiviFields: z.array(z.string().trim().min(1).max(120)).min(1).max(100)
};

export const GithubIdentityPolicyV1Schema = z.object({
  schemaVersion: z.literal(1),
  ...IdentityPolicyBaseShape
}).strict();

export const GithubPrincipalBindingSchema = z.object({
  bindingId: z.string().trim().min(3).max(200).regex(/^[A-Za-z0-9._-]+$/),
  oauthPrincipalId: z.string().trim().min(7).max(256).startsWith('oauth:'),
  provider: z.literal('github'),
  connectionSelector: z.object({
    owner: GithubLoginSchema,
    type: z.enum(['user', 'organization'])
  }).strict(),
  expectedAuthenticatedLogin: GithubLoginSchema,
  context: z.object({ repository: RepositorySchema.optional() }).strict().optional(),
  effect: z.literal('IDENTITY_ONLY'),
  enabled: z.boolean()
}).strict();

export const GithubIdentityPolicyV2Schema = z.object({
  schemaVersion: z.literal(2),
  ...IdentityPolicyBaseShape,
  githubPrincipalBindings: z.array(GithubPrincipalBindingSchema).max(200)
}).strict();

export const GithubRepositoryRoutingBindingSchema = z.object({
  routingBindingId: z.string().trim().min(3).max(200).regex(/^[A-Za-z0-9._-]+$/),
  oauthPrincipalId: z.string().trim().min(7).max(256).startsWith('oauth:'),
  provider: z.literal('github'),
  repositoryOwner: GithubLoginSchema,
  connectionSelector: z.object({
    owner: GithubLoginSchema,
    type: z.enum(['user', 'organization', 'organization_or_user'])
  }).strict(),
  effect: z.literal('ROUTING_ONLY'),
  enabled: z.boolean()
}).strict();

export const GithubIdentityPolicyV3Schema = z.object({
  schemaVersion: z.literal(3),
  ...IdentityPolicyBaseShape,
  githubPrincipalBindings: z.array(GithubPrincipalBindingSchema).max(200),
  githubRepositoryRoutingBindings: z.array(GithubRepositoryRoutingBindingSchema).max(200)
}).strict();

export type GithubIdentityPolicyV1 = z.infer<typeof GithubIdentityPolicyV1Schema>;
export type GithubIdentityPolicyV2 = z.infer<typeof GithubIdentityPolicyV2Schema>;
export type GithubIdentityPolicyV3 = z.infer<typeof GithubIdentityPolicyV3Schema>;
export type GithubIdentityPolicy = GithubIdentityPolicyV1 | GithubIdentityPolicyV2 | GithubIdentityPolicyV3;
export type GithubPrincipalBinding = z.infer<typeof GithubPrincipalBindingSchema>;
export type GithubRepositoryRoutingBinding = z.infer<typeof GithubRepositoryRoutingBindingSchema>;

export type GithubIdentityPolicyParseResult =
  | { ok: true; policy: GithubIdentityPolicy }
  | { ok: false; reasonCode: 'GITHUB_IDENTITY_POLICY_INVALID' };

export type LoadedGithubIdentityPolicy = {
  parse: GithubIdentityPolicyParseResult;
  digest: string | null;
};

export function parseGithubIdentityPolicy(value: unknown): GithubIdentityPolicyParseResult {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { ok: false, reasonCode: 'GITHUB_IDENTITY_POLICY_INVALID' };
  }
  const version = (value as { schemaVersion?: unknown }).schemaVersion;
  const parsed = version === 1
    ? GithubIdentityPolicyV1Schema.safeParse(value)
    : version === 2
      ? GithubIdentityPolicyV2Schema.safeParse(value)
      : version === 3
        ? GithubIdentityPolicyV3Schema.safeParse(value)
        : null;
  return parsed?.success
    ? { ok: true, policy: parsed.data }
    : { ok: false, reasonCode: 'GITHUB_IDENTITY_POLICY_INVALID' };
}

export async function loadGithubIdentityPolicy(
  filePath = process.env.MCP_IDENTITY_POLICY_FILE || '/app/.mcp/identity-policy.json'
): Promise<LoadedGithubIdentityPolicy> {
  try {
    const raw = await readFile(filePath, 'utf8');
    if (Buffer.byteLength(raw, 'utf8') > BOUNDED_POLICY_BYTES) {
      return { parse: { ok: false, reasonCode: 'GITHUB_IDENTITY_POLICY_INVALID' }, digest: null };
    }
    const digest = createHash('sha256').update(raw, 'utf8').digest('hex');
    let value: unknown;
    try {
      value = JSON.parse(raw);
    } catch {
      return { parse: { ok: false, reasonCode: 'GITHUB_IDENTITY_POLICY_INVALID' }, digest };
    }
    return { parse: parseGithubIdentityPolicy(value), digest };
  } catch {
    return { parse: { ok: false, reasonCode: 'GITHUB_IDENTITY_POLICY_INVALID' }, digest: null };
  }
}
