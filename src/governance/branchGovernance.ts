import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { z } from 'zod';

/**
 * D1 (TB-W3-D1-01): the versioned MCP branch governance policy
 * (`.mcp/branch-governance.json`) as a read-only governance authority. Only the
 * fields governance inheritance consumes are validated; dynamic state stays
 * with its own authorities (Task Queue, sessions, GitHub, Live State).
 */
export const BRANCH_GOVERNANCE_FILE = '.mcp/branch-governance.json';
const MAX_POLICY_BYTES = 64 * 1024;

const BranchGovernancePolicySchema = z.object({
  updatedAt: z.string().datetime({ offset: true }),
  main: z.object({ directPushAllowed: z.boolean() }).passthrough(),
  allowedPrefixes: z.array(z.string().trim().min(1).max(100)).min(1).max(20),
  pullRequestRequired: z.boolean(),
  draftPrByDefault: z.boolean(),
  dirtyCountRule: z.string().trim().min(1).max(200)
}).passthrough();

export type BranchGovernancePolicy = Readonly<{
  updatedAt: string;
  mainDirectPushAllowed: boolean;
  allowedPrefixes: readonly string[];
  pullRequestRequired: boolean;
  draftPrByDefault: boolean;
  dirtyCountRule: string;
}>;

export type BranchGovernanceReasonCode =
  | 'GOVERNANCE_POLICY_UNAVAILABLE'
  | 'GOVERNANCE_POLICY_INVALID'
  | 'GOVERNANCE_POLICY_UNREADABLE';

export type BranchGovernanceEvidence = Readonly<{
  status: 'CURRENT' | 'UNAVAILABLE';
  policy: BranchGovernancePolicy | null;
  reference: string | null;
  reasonCode: BranchGovernanceReasonCode | null;
}>;

export function unavailableBranchGovernance(reasonCode: BranchGovernanceReasonCode): BranchGovernanceEvidence {
  return Object.freeze({ status: 'UNAVAILABLE' as const, policy: null, reference: null, reasonCode });
}

/** Missing evidence is UNAVAILABLE; malformed evidence is INVALID. Never a default policy. */
export function parseBranchGovernancePolicy(value: unknown): BranchGovernanceEvidence {
  if (value === null || value === undefined) return unavailableBranchGovernance('GOVERNANCE_POLICY_UNAVAILABLE');
  const parsed = BranchGovernancePolicySchema.safeParse(value);
  if (!parsed.success) return unavailableBranchGovernance('GOVERNANCE_POLICY_INVALID');
  const policy = parsed.data;
  return Object.freeze({
    status: 'CURRENT' as const,
    policy: Object.freeze({
      updatedAt: policy.updatedAt,
      mainDirectPushAllowed: policy.main.directPushAllowed,
      allowedPrefixes: Object.freeze([...policy.allowedPrefixes]),
      pullRequestRequired: policy.pullRequestRequired,
      draftPrByDefault: policy.draftPrByDefault,
      dirtyCountRule: policy.dirtyCountRule
    }),
    reference: `${BRANCH_GOVERNANCE_FILE}@${policy.updatedAt}`,
    reasonCode: null
  });
}

function branchGovernancePath(): string {
  return process.env.MCP_BRANCH_GOVERNANCE_FILE || path.join(process.cwd(), BRANCH_GOVERNANCE_FILE);
}

/** Missing file: null. Unreadable, oversized or malformed: throws. */
export async function readBranchGovernancePolicy(filePath = branchGovernancePath()): Promise<unknown | null> {
  let raw: string;
  try {
    raw = await readFile(filePath, 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code === 'ENOENT') return null;
    throw error;
  }
  if (Buffer.byteLength(raw, 'utf8') > MAX_POLICY_BYTES) throw new Error('BRANCH_GOVERNANCE_TOO_LARGE');
  return JSON.parse(raw) as unknown;
}
