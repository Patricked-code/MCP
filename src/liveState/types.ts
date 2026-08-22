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

export type CurrentStateCapabilityObservation = {
  status: LiveStateSourceStatus;
  catalogueVersion: 1;
  catalogueDigest: string | null;
  registeredToolCount: number;
  readOnlyToolCount: number;
  writeToolCount: number;
  resourceCount: number;
  tools: unknown[];
  resources: unknown[];
  generatedAt: string;
  contradictions: string[];
  error?: string | null;
};

export type CurrentStateEvidenceObservation = {
  status: LiveStateSourceStatus;
  evidenceHead: string | null;
  generatedAt: string | null;
  sourceDigest: string | null;
  architecture: {
    modules: string[];
    imports: Array<{ from: string; to: string }>;
    routes: Array<{ method: string; path: string; source: string }>;
    digest: string | null;
  };
  documentation: {
    markdown: string[];
    categories: Record<string, number>;
    digest: string | null;
  };
  audits: string[];
  history: string[];
  governance: {
    files: Array<{ path: string; status: string; digest: string | null }>;
    taskRegistry: { registryVersion: number | null; taskCount: number | null; digest: string } | null;
    digest: string | null;
  };
  testSuiteDigest: string | null;
  contradictions: Array<{ code: string; path?: string }>;
  error?: string | null;
};

export type CurrentStateGovernanceObservation = {
  status: LiveStateSourceStatus;
  digest: string | null;
  files: CurrentStateEvidenceObservation['governance']['files'];
  taskRegistry: CurrentStateEvidenceObservation['governance']['taskRegistry'];
  contradictions: string[];
  error?: string | null;
};

export type CurrentStateAuditBaselineObservation = {
  status: LiveStateSourceStatus;
  evidenceHead: string | null;
  runtimeRevision: string | null;
  testSuiteDigest: string | null;
  sourceDigest: string | null;
  catalogueDigest: string | null;
  governanceDigest: string | null;
  valid: boolean;
  invalidReasons: string[];
  error?: string | null;
};

export type LiveStateObservations = {
  repository: string;
  github: GithubLiveObservation;
  s1: S1LiveObservation;
  runtime: RuntimeLiveObservation;
  documentation: DocumentationLiveObservation;
  capabilities?: CurrentStateCapabilityObservation;
  governance?: CurrentStateGovernanceObservation;
  auditBaseline?: CurrentStateAuditBaselineObservation;
  inventory?: CurrentStateEvidenceObservation;
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
