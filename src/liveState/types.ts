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

export type LiveStateObservations = {
  repository: string;
  github: GithubLiveObservation;
  s1: S1LiveObservation;
  runtime: RuntimeLiveObservation;
  documentation: DocumentationLiveObservation;
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
