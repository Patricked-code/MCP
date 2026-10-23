/**
 * A target-bounded subpath ingress plan for the existing PROJECT_RUNTIME
 * pipeline. Planning cannot grant a session, create a directory, change
 * Apache/Nginx, download a repository or execute Docker.
 */
export const REGULATORY_S1_TARGET = Object.freeze({
  serverId: 'S1',
  repositoryId: 'chainsolutions-wealthtech/Regulatory',
  officialBranch: 'main',
  domain: 'wealthtechinnovations.com',
  httpPath: '/regulatory',
  serverPath: '/opt/apps/regulatory',
  applicationSubdirectory: 'apps/web',
  runtime: 'nextjs'
} as const);

export type RegulatorySubpathEvidence = Readonly<{
  githubRevisionOnMain: boolean | null;
  githubReadableByMcp: boolean | null;
  registryMappingVerified: boolean | null;
  subscriptionAndVhostOwnedOnS1: boolean | null;
  governedParentRealpathVerified: boolean | null;
  applicationDirectoryAbsent: boolean | null;
  ingressPathUnclaimed: boolean | null;
  nextBasePathAndAssetsVerified: boolean | null;
  deploymentAndRollbackPlanVerified: boolean | null;
}>;

export type RegulatorySubpathRequest = Readonly<{
  serverId: string;
  repositoryId: string;
  officialBranch: string;
  domain: string;
  httpPath: string;
  serverPath: string;
  applicationSubdirectory: string;
  revision: string;
}>;
export type RegulatorySubpathDecision = Readonly<{
  state:'BLOCKED' | 'READY_FOR_GOVERNED_CONSENT';
  reason:string;
  target:typeof REGULATORY_S1_TARGET|null;
  revision:string|null;
  mutationPerformed:false;
  authorizationInferred:false;
}>;

/** Pure RED stub, replaced only after CI demonstrates the test failures. */
export function planRegulatoryS1Subpath(
  _request:RegulatorySubpathRequest,
  _evidence:RegulatorySubpathEvidence
):RegulatorySubpathDecision {
  return {state:'BLOCKED',reason:'NOT_IMPLEMENTED',target:null,revision:null,mutationPerformed:false,authorizationInferred:false};
}
