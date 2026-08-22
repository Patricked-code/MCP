export type LiveStateSourceStatus = 'CURRENT' | 'STALE' | 'UNAVAILABLE';
export type LiveStateFreshness = 'CURRENT' | 'STALE';
export type LiveStatePairAlignment = 'ALIGNED' | 'DRIFTED' | 'UNVERIFIED';
export type LiveStateRuntimeAlignment = 'ALIGNED' | 'DRIFTED' | 'RUNTIME_UNVERIFIED';
export type LiveStateDocumentationAlignment = 'ALIGNED' | 'DOCUMENTATION_DRIFT';
export type LiveStateGlobalStatus =
  | 'FULLY_ALIGNED'
  | 'PARTIALLY_ALIGNED'
  | 'DEPLOYMENT_PENDING'
  | 'RUNTIME_DEPLOYMENT_PENDING'
  | 'RECONCILIATION_REQUIRED'
  | 'DEGRADED';

export type GithubLiveObservation = {
  status: LiveStateSourceStatus;
  branch: string;
  head: string | null;
  error?: string | null;
};

export type S1LiveObservation = {
  status: LiveStateSourceStatus;
  path: string;
  branch: string | null;
  head: string | null;
  originMain: string | null;
  workingTreeClean: boolean | null;
  diffEmpty: boolean | null;
  fetchRemote: string | null;
  pushRemote: string | null;
  error?: string | null;
};

export type RuntimeLiveObservation = {
  status: LiveStateSourceStatus;
  container: string;
  containerStatus: string | null;
  health: string | null;
  imageId: string | null;
  revision: string | null;
  error?: string | null;
};

export type DocumentationLiveObservation = {
  status: LiveStateSourceStatus;
  activeTask: string | null;
  declaredGithubSha: string | null;
  declaredS1Sha: string | null;
  drift: boolean;
  error?: string | null;
};

export type CurrentStateArchitecture = {
  modules: Array<{ path: string; imports: string[] }>;
  routes: Array<{ file: string; method: string; path: string }>;
  digest: string;
};

export type CurrentStateDocumentation = {
  files: string[];
  digest: string;
};

export type CurrentStateGovernanceFile = {
  path: string;
  present: boolean;
  digest: string | null;
};

export type CurrentStateEvidence = {
  schemaVersion: 1;
  repositoryHead: string;
  architecture: CurrentStateArchitecture;
  documentation: CurrentStateDocumentation;
  audits: string[];
  governance: { files: CurrentStateGovernanceFile[]; digest: string };
  taskRegistry: {
    path: string;
    present: boolean;
    registryVersion: number | null;
    digest: string | null;
  };
  testSuiteDigest: string;
  sourceDigest: string;
  contradictions: string[];
};

export type CapabilitiesLiveObservation = {
  status: LiveStateSourceStatus;
  catalogueDigest: string | null;
  registeredToolCount: number;
  readOnlyToolCount: number;
  writeToolCount: number;
  resourceCount: number;
  tools: CurrentToolContract[];
  resources: CurrentResourceContract[];
  contradictions: string[];
};

export type GovernanceLiveObservation = {
  status: LiveStateSourceStatus;
  repositoryHead: string | null;
  governanceDigest: string | null;
  files: CurrentStateGovernanceFile[];
  taskRegistryVersion: number | null;
  contradictions: string[];
};

export type AuditBaselineLiveObservation = {
  status: LiveStateSourceStatus;
  repositoryHead: string | null;
  testSuiteDigest: string | null;
  sourceDigest: string | null;
  contradictions: string[];
};

export type InventoryLiveObservation = {
  status: LiveStateSourceStatus;
  repositoryHead: string | null;
  architecture: CurrentStateArchitecture | null;
  documentation: CurrentStateDocumentation | null;
  audits: string[];
  contradictions: string[];
};

export type LiveStateObservations = {
  repository: string;
  github: GithubLiveObservation;
  s1: S1LiveObservation;
  runtime: RuntimeLiveObservation;
  documentation: DocumentationLiveObservation;
  capabilities?: CapabilitiesLiveObservation;
  governance?: GovernanceLiveObservation;
  auditBaseline?: AuditBaselineLiveObservation;
  inventory?: InventoryLiveObservation;
};

export type LiveStateAlignment = {
  githubVsS1: LiveStatePairAlignment;
  runtime: LiveStateRuntimeAlignment;
  documentation: LiveStateDocumentationAlignment;
  global: LiveStateGlobalStatus;
};

export type LiveStateSnapshot = LiveStateObservations & {
  schemaVersion: 1;
  stateVersion: number;
  generatedAt: string;
  lastReconciledAt: string;
  maxAgeSeconds: 60;
  freshness: LiveStateFreshness;
  ageSeconds: number;
  alignment: LiveStateAlignment;
  contradictions: string[];
  nextAction: string | null;
};
import type {
  CurrentResourceContract,
  CurrentToolContract
} from '../currentState/toolCatalog.js';
