import {
  resolveGithubIdentity,
  type GithubIdentityResolution,
  type GithubIdentityResolutionInput
} from '../../github/identityResolution.js';
import {
  resolveGithubRepository,
  type GithubRepositoryResolution,
  type GithubRepositoryResolutionInput
} from '../../github/repositoryResolution.js';
import {
  resolveGithubProject,
  type GithubProjectResolution,
  type GithubProjectResolutionInput
} from '../../github/projectResolution.js';
import type {
  GovernedContractSubstrate,
  GovernedStepId
} from '../contractSubstrate.js';

type ResolverPayload = {
  status: string;
  observedAt: string;
  freshness: string;
  provenance: string[];
  reasonCodes: string[];
};

export type GithubResolverContractResult<T extends ResolverPayload> = Readonly<{
  contract: Readonly<{
    stepId: GovernedStepId;
    contractVersion: number;
  }>;
  status: T['status'];
  observedAt: string;
  freshness: T['freshness'];
  provenance: readonly string[];
  reasonCodes: readonly string[];
  payload: T;
  authorizationInferred: false;
}>;

function projectResolverResult<T extends ResolverPayload>(
  stepId: GovernedStepId,
  payload: T,
  substrate: GovernedContractSubstrate
): GithubResolverContractResult<T> {
  const contract = substrate.resolve(stepId);
  if (!contract) {
    throw new Error(`GWC_RESOLVER_CONTRACT_MISSING:${stepId}`);
  }
  return Object.freeze({
    contract: Object.freeze({
      stepId: contract.stepId,
      contractVersion: contract.contractVersion
    }),
    status: payload.status,
    observedAt: payload.observedAt,
    freshness: payload.freshness,
    provenance: Object.freeze([...payload.provenance]),
    reasonCodes: Object.freeze([...payload.reasonCodes]),
    payload,
    authorizationInferred: false as const
  });
}

export function resolveGw04GithubIdentity(
  input: GithubIdentityResolutionInput,
  substrate: GovernedContractSubstrate
): GithubResolverContractResult<GithubIdentityResolution> {
  return projectResolverResult('GW-04', resolveGithubIdentity(input), substrate);
}

export function resolveGw05Repository(
  input: GithubRepositoryResolutionInput,
  substrate: GovernedContractSubstrate
): GithubResolverContractResult<GithubRepositoryResolution> {
  return projectResolverResult('GW-05', resolveGithubRepository(input), substrate);
}

export function resolveGw06Project(
  input: GithubProjectResolutionInput,
  substrate: GovernedContractSubstrate
): GithubResolverContractResult<GithubProjectResolution> {
  return projectResolverResult('GW-06', resolveGithubProject(input), substrate);
}
