import { createHash } from 'node:crypto';
import { z } from 'zod';

import type {
  GovernedContractSubstrate,
  GovernedStepId
} from '../contractSubstrate.js';

const IdSchema = z.string().trim().min(1).max(200);
const TextSchema = z.string().trim().min(1).max(500);
const PathSchema = z.string().trim().min(1).max(500);
const RepositorySchema = z.string().trim().min(3).max(300)
  .regex(/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/);
const ShaSchema = z.string().regex(/^[0-9a-f]{40}$/);
const DigestSchema = z.string().regex(/^[0-9a-f]{64}$/);
const ReasonCodeSchema = z.string().trim().min(1).max(120).regex(/^[A-Z0-9_:-]+$/);

const ValidationScriptSchema = z.object({
  id: IdSchema,
  script: IdSchema
}).strict();

const DedicatedTestSchema = z.object({
  path: PathSchema,
  script: IdSchema
}).strict();

const ProjectValidationProfileSchema = z.object({
  schemaVersion: z.literal(1),
  profileId: IdSchema,
  projectId: IdSchema,
  repository: RepositorySchema,
  ci: z.object({
    workflow: IdSchema,
    job: IdSchema
  }).strict(),
  validationScripts: z.array(ValidationScriptSchema).min(1).max(32),
  workflowNativeChecks: z.array(IdSchema).max(32),
  testDiscovery: z.object({
    root: PathSchema,
    suffix: z.string().trim().min(1).max(40),
    runnerScript: IdSchema,
    dedicated: z.array(DedicatedTestSchema).max(64)
  }).strict()
}).strict();

export type ProjectValidationProfile = Readonly<{
  schemaVersion: 1;
  profileId: string;
  projectId: string;
  repository: string;
  ci: Readonly<{
    workflow: string;
    job: string;
  }>;
  validationScripts: readonly Readonly<{
    id: string;
    script: string;
  }>[];
  workflowNativeChecks: readonly string[];
  testDiscovery: Readonly<{
    root: string;
    suffix: string;
    runnerScript: string;
    dedicated: readonly Readonly<{
      path: string;
      script: string;
    }>[];
  }>;
}>;

const ExpectedFailureSignatureSchema = z.object({
  signatureId: IdSchema,
  failedSteps: z.array(TextSchema).min(1).max(20),
  requiredReasonCodes: z.array(ReasonCodeSchema).min(1).max(40),
  requiredTestNames: z.array(TextSchema).max(40)
}).strict();

export type ExpectedFailureSignature = Readonly<z.infer<typeof ExpectedFailureSignatureSchema>>;

const CiObservationSchema = z.object({
  runId: z.number().int().positive(),
  observedAt: z.string().datetime({ offset: true }),
  workflow: IdSchema,
  job: IdSchema,
  profileId: IdSchema,
  profileDigest: DigestSchema,
  headSha: ShaSchema,
  status: z.enum(['queued', 'in_progress', 'completed']),
  conclusion: z.enum([
    'success',
    'failure',
    'cancelled',
    'neutral',
    'skipped',
    'timed_out',
    'action_required',
    'startup_failure'
  ]),
  failedSteps: z.array(TextSchema).max(40),
  failureSignals: z.array(z.object({
    reasonCode: ReasonCodeSchema,
    testName: TextSchema.nullable().optional()
  }).strict()).max(100)
}).strict();

export type DevelopmentCiObservation = Readonly<z.infer<typeof CiObservationSchema>>;

const DeclarationSchema = z.object({
  declaredAt: z.string().datetime({ offset: true }),
  summary: TextSchema,
  changeDigest: DigestSchema
}).strict();

const FindingSchema = z.object({
  findingId: IdSchema,
  category: z.enum(['CODE', 'TEST', 'DOCUMENTATION', 'SECURITY', 'OTHER']),
  summary: TextSchema
}).strict();

export type DevelopmentContractBinding = Readonly<{
  stepId: GovernedStepId;
  contractVersion: number;
  contractRegistryDigest: string;
  graphRegistryDigest: string;
}>;

export type DevelopmentEffectPlan = Readonly<{
  effectId: string;
  toolName: 'github_create_branch' | 'github_create_commit';
  repository: string;
  branch: string;
  expectedHeadSha: string;
  replayClass: 'IDEMPOTENT_MUTATION';
  authorizationRequired: true;
  postconditions: readonly string[];
  recoveryAnchor: string;
}>;

type Status = 'READY' | 'SUCCESS' | 'NONE' | 'BLOCKED' | 'UNVERIFIED' | 'CONFLICT';

export type DevelopmentResult<TPayload> = Readonly<{
  contract: DevelopmentContractBinding;
  status: Status;
  reasonCodes: readonly string[];
  payload: TPayload;
  effectPlan: DevelopmentEffectPlan | null;
  authorizationInferred: false;
  mutationPerformed: false;
}>;

type CiPayload = Readonly<{
  runId: number;
  headSha: string;
  profileId: string;
  profileDigest: string;
  matchedFailureSignature: boolean | null;
  signatureId: string | null;
  nextStepId: GovernedStepId | null;
}>;

export type DevelopmentCiProof = DevelopmentResult<CiPayload>;

export type SelfReviewResult = DevelopmentResult<Readonly<{
  headSha: string;
  findings: readonly z.infer<typeof FindingSchema>[];
  nextStepId: 'GW-30' | 'GW-32';
  skipReason: 'SKIPPABLE_IF_FINDINGS_EMPTY' | null;
  evidenceModel: readonly ['AGENT_DECLARED', 'CI_OBSERVED'];
}>>;

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>)
      .filter(([, entry]) => entry !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => `${JSON.stringify(key)}:${canonical(entry)}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

function digest(value: unknown): string {
  return createHash('sha256').update(canonical(value)).digest('hex');
}

function uniqueSorted(values: readonly string[]): string[] {
  return [...new Set(values)].sort();
}

function sameSet(left: readonly string[], right: readonly string[]): boolean {
  const a = uniqueSorted(left);
  const b = uniqueSorted(right);
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

function contract(
  stepId: 'GW-24' | 'GW-25' | 'GW-26' | 'GW-27' | 'GW-28'
    | 'GW-29' | 'GW-30' | 'GW-31' | 'GW-32' | 'GW-33',
  substrate: GovernedContractSubstrate
): DevelopmentContractBinding {
  const resolved = substrate.resolve(stepId);
  if (!resolved) throw new Error(`GWC_DEVELOPMENT_CONTRACT_MISSING:${stepId}`);
  return Object.freeze({
    stepId: resolved.stepId,
    contractVersion: resolved.contractVersion,
    contractRegistryDigest: substrate.contractRegistryDigest,
    graphRegistryDigest: substrate.graphRegistryDigest
  });
}

function result<TPayload>(input: {
  stepId: Parameters<typeof contract>[0];
  substrate: GovernedContractSubstrate;
  status: Status;
  reasonCodes?: readonly string[];
  payload: TPayload;
  effectPlan?: DevelopmentEffectPlan | null;
}): DevelopmentResult<TPayload> {
  return Object.freeze({
    contract: contract(input.stepId, input.substrate),
    status: input.status,
    reasonCodes: Object.freeze([...(input.reasonCodes ?? [])]),
    payload: input.payload,
    effectPlan: input.effectPlan ?? null,
    authorizationInferred: false as const,
    mutationPerformed: false as const
  });
}

function freezeProfile(parsed: z.infer<typeof ProjectValidationProfileSchema>): ProjectValidationProfile {
  return Object.freeze({
    ...parsed,
    ci: Object.freeze({ ...parsed.ci }),
    validationScripts: Object.freeze(parsed.validationScripts.map((entry) => Object.freeze({ ...entry }))),
    workflowNativeChecks: Object.freeze([...parsed.workflowNativeChecks]),
    testDiscovery: Object.freeze({
      ...parsed.testDiscovery,
      dedicated: Object.freeze(parsed.testDiscovery.dedicated.map((entry) => Object.freeze({ ...entry })))
    })
  });
}

export function parseProjectValidationProfile(rawInput: unknown): ProjectValidationProfile {
  const parsed = ProjectValidationProfileSchema.parse(rawInput);
  if (new Set(parsed.validationScripts.map(({ id }) => id)).size !== parsed.validationScripts.length) {
    throw new Error('VALIDATION_PROFILE_DUPLICATE_STEP_ID');
  }
  if (new Set(parsed.validationScripts.map(({ script }) => script)).size !== parsed.validationScripts.length) {
    throw new Error('VALIDATION_PROFILE_DUPLICATE_SCRIPT');
  }
  const scripts = new Set(parsed.validationScripts.map(({ script }) => script));
  if (!scripts.has(parsed.testDiscovery.runnerScript)) {
    throw new Error('VALIDATION_PROFILE_RUNNER_NOT_DECLARED');
  }
  for (const dedicated of parsed.testDiscovery.dedicated) {
    if (!scripts.has(dedicated.script)) throw new Error('VALIDATION_PROFILE_DEDICATED_SCRIPT_UNDECLARED');
  }
  if (new Set(parsed.testDiscovery.dedicated.map(({ path }) => path)).size !== parsed.testDiscovery.dedicated.length) {
    throw new Error('VALIDATION_PROFILE_DUPLICATE_DEDICATED_TEST');
  }
  return freezeProfile(parsed);
}

export function validationProfileDigest(profile: ProjectValidationProfile): string {
  return digest(profile);
}

export function classifyValidationTestCoverage(
  profileInput: ProjectValidationProfile,
  discoveredTests: readonly string[]
): Readonly<{
  runnerTests: readonly string[];
  dedicatedTests: readonly string[];
  uncoveredTests: readonly string[];
}> {
  const profile = parseProjectValidationProfile(profileInput);
  const discovered = uniqueSorted(discoveredTests.map((entry) => PathSchema.parse(entry)));
  const dedicated = new Set(profile.testDiscovery.dedicated.map(({ path }) => path));
  const runnerTests: string[] = [];
  const dedicatedTests: string[] = [];
  const uncoveredTests: string[] = [];
  const prefix = `${profile.testDiscovery.root.replace(/\/$/, '')}/`;

  for (const file of discovered) {
    if (!file.endsWith(profile.testDiscovery.suffix) || !file.startsWith(prefix)) {
      uncoveredTests.push(file);
    } else if (dedicated.has(file)) {
      dedicatedTests.push(file);
    } else {
      runnerTests.push(file);
    }
  }
  for (const file of dedicated) {
    if (!discovered.includes(file)) uncoveredTests.push(file);
  }

  return Object.freeze({
    runnerTests: Object.freeze(uniqueSorted(runnerTests)),
    dedicatedTests: Object.freeze(uniqueSorted(dedicatedTests)),
    uncoveredTests: Object.freeze(uniqueSorted(uncoveredTests))
  });
}

function ciIdentityReasons(
  expectedHeadSha: string,
  profile: ProjectValidationProfile,
  ci: DevelopmentCiObservation
): string[] {
  if (
    ci.profileId !== profile.profileId
    || ci.profileDigest !== validationProfileDigest(profile)
    || ci.workflow !== profile.ci.workflow
    || ci.job !== profile.ci.job
  ) return ['CI_PROFILE_MISMATCH'];
  if (ci.headSha !== expectedHeadSha) return ['CI_HEAD_MISMATCH'];
  if (ci.status !== 'completed') return ['CI_NOT_COMPLETE'];
  return [];
}

function ciPayload(
  ci: DevelopmentCiObservation,
  matchedFailureSignature: boolean | null,
  signatureId: string | null,
  nextStepId: GovernedStepId | null
): CiPayload {
  return Object.freeze({
    runId: ci.runId,
    headSha: ci.headSha,
    profileId: ci.profileId,
    profileDigest: ci.profileDigest,
    matchedFailureSignature,
    signatureId,
    nextStepId
  });
}

function observeRed(
  stepId: 'GW-26' | 'GW-30',
  input: {
    expectedHeadSha: string;
    profile: ProjectValidationProfile;
    expectedFailure: ExpectedFailureSignature;
    ci: DevelopmentCiObservation;
  },
  substrate: GovernedContractSubstrate,
  nextStepId: 'GW-27' | 'GW-31'
): DevelopmentCiProof {
  const expectedHeadSha = ShaSchema.parse(input.expectedHeadSha);
  const profile = parseProjectValidationProfile(input.profile);
  const expected = ExpectedFailureSignatureSchema.parse(input.expectedFailure);
  const ci = CiObservationSchema.parse(input.ci);
  const identityReasons = ciIdentityReasons(expectedHeadSha, profile, ci);
  if (identityReasons.length > 0) {
    return result({
      stepId, substrate,
      status: identityReasons[0] === 'CI_NOT_COMPLETE' ? 'UNVERIFIED' : 'CONFLICT',
      reasonCodes: identityReasons,
      payload: ciPayload(ci, false, expected.signatureId, null)
    });
  }
  if (ci.conclusion !== 'failure') {
    return result({
      stepId, substrate, status: 'UNVERIFIED',
      reasonCodes: ['RED_NOT_OBSERVED'],
      payload: ciPayload(ci, false, expected.signatureId, null)
    });
  }
  const observedReasonCodes = uniqueSorted(ci.failureSignals.map(({ reasonCode }) => reasonCode));
  const observedTests = uniqueSorted(ci.failureSignals.flatMap(({ testName }) => testName ? [testName] : []));
  const signatureMatches =
    sameSet(ci.failedSteps, expected.failedSteps)
    && expected.requiredReasonCodes.every((code) => observedReasonCodes.includes(code))
    && expected.requiredTestNames.every((name) => observedTests.includes(name));
  if (!signatureMatches) {
    return result({
      stepId, substrate, status: 'UNVERIFIED',
      reasonCodes: ['RED_FAILURE_SIGNATURE_MISMATCH'],
      payload: ciPayload(ci, false, expected.signatureId, null)
    });
  }
  return result({
    stepId, substrate, status: 'SUCCESS',
    payload: ciPayload(ci, true, expected.signatureId, nextStepId)
  });
}

function observeGreen(
  stepId: 'GW-28' | 'GW-32',
  input: {
    expectedHeadSha: string;
    profile: ProjectValidationProfile;
    ci: DevelopmentCiObservation;
  },
  substrate: GovernedContractSubstrate,
  nextStepId: 'GW-29' | 'GW-33'
): DevelopmentCiProof {
  const expectedHeadSha = ShaSchema.parse(input.expectedHeadSha);
  const profile = parseProjectValidationProfile(input.profile);
  const ci = CiObservationSchema.parse(input.ci);
  const identityReasons = ciIdentityReasons(expectedHeadSha, profile, ci);
  if (identityReasons.length > 0) {
    return result({
      stepId, substrate,
      status: identityReasons[0] === 'CI_NOT_COMPLETE' ? 'UNVERIFIED' : 'CONFLICT',
      reasonCodes: identityReasons,
      payload: ciPayload(ci, null, null, null)
    });
  }
  if (ci.conclusion !== 'success' || ci.failedSteps.length > 0) {
    return result({
      stepId, substrate, status: 'UNVERIFIED',
      reasonCodes: ['GREEN_CI_NOT_PROVEN'],
      payload: ciPayload(ci, null, null, null)
    });
  }
  return result({
    stepId, substrate, status: 'SUCCESS',
    payload: ciPayload(ci, null, null, nextStepId)
  });
}

function effectPlan(input: {
  stepId: 'GW-24' | 'GW-25' | 'GW-27' | 'GW-31' | 'GW-33';
  toolName: DevelopmentEffectPlan['toolName'];
  repository: string;
  branch: string;
  expectedHeadSha: string;
  declaration: z.infer<typeof DeclarationSchema>;
}): DevelopmentEffectPlan {
  const repository = RepositorySchema.parse(input.repository);
  const branch = PathSchema.parse(input.branch);
  const expectedHeadSha = ShaSchema.parse(input.expectedHeadSha);
  const declaration = DeclarationSchema.parse(input.declaration);
  const semantic = {
    stepId: input.stepId,
    toolName: input.toolName,
    repository,
    branch,
    expectedHeadSha,
    changeDigest: declaration.changeDigest
  };
  return Object.freeze({
    effectId: `development:${input.stepId.toLowerCase()}:${digest(semantic).slice(0, 24)}`,
    toolName: input.toolName,
    repository,
    branch,
    expectedHeadSha,
    replayClass: 'IDEMPOTENT_MUTATION' as const,
    authorizationRequired: true as const,
    postconditions: Object.freeze([
      'EXACT_HEAD_REOBSERVED',
      'MUTATION_VERIFIED_BY_OWNING_AUTHORITY'
    ]),
    recoveryAnchor: `github:${repository}:${branch}:${expectedHeadSha}`
  });
}

export function planGw24BranchCreation(
  rawInput: {
    repository: string;
    branch: string;
    baseSha: string;
    branchPolicyAllowed: boolean;
    declaration: z.input<typeof DeclarationSchema>;
  },
  substrate: GovernedContractSubstrate
) {
  const declaration = DeclarationSchema.parse(rawInput.declaration);
  if (!rawInput.branchPolicyAllowed) {
    return result({
      stepId: 'GW-24', substrate, status: 'BLOCKED',
      reasonCodes: ['BRANCH_POLICY_BLOCKED'],
      payload: Object.freeze({ nextStepId: null, evidenceModel: Object.freeze(['AGENT_DECLARED'] as const) })
    });
  }
  const plan = effectPlan({
    stepId: 'GW-24',
    toolName: 'github_create_branch',
    repository: rawInput.repository,
    branch: rawInput.branch,
    expectedHeadSha: rawInput.baseSha,
    declaration
  });
  return result({
    stepId: 'GW-24', substrate, status: 'READY',
    payload: Object.freeze({ nextStepId: 'GW-25' as const, evidenceModel: Object.freeze(['AGENT_DECLARED'] as const) }),
    effectPlan: plan
  });
}

export function planGw25RedAuthoring(
  rawInput: {
    repository: string;
    branch: string;
    expectedHeadSha: string;
    branchReady: boolean;
    expectedFailure: ExpectedFailureSignature;
    declaration: z.input<typeof DeclarationSchema>;
  },
  substrate: GovernedContractSubstrate
) {
  const declaration = DeclarationSchema.parse(rawInput.declaration);
  const expectedFailure = ExpectedFailureSignatureSchema.parse(rawInput.expectedFailure);
  if (!rawInput.branchReady) {
    return result({
      stepId: 'GW-25', substrate, status: 'BLOCKED',
      reasonCodes: ['BRANCH_NOT_READY'],
      payload: Object.freeze({
        expectedFailureDigest: digest(expectedFailure),
        nextStepId: null,
        evidenceModel: Object.freeze(['AGENT_DECLARED'] as const)
      })
    });
  }
  return result({
    stepId: 'GW-25', substrate, status: 'READY',
    payload: Object.freeze({
      expectedFailureDigest: digest(expectedFailure),
      nextStepId: 'GW-26' as const,
      evidenceModel: Object.freeze(['AGENT_DECLARED'] as const)
    }),
    effectPlan: effectPlan({
      stepId: 'GW-25',
      toolName: 'github_create_commit',
      repository: rawInput.repository,
      branch: rawInput.branch,
      expectedHeadSha: rawInput.expectedHeadSha,
      declaration
    })
  });
}

export function observeGw26TddRed(
  input: {
    expectedHeadSha: string;
    profile: ProjectValidationProfile;
    expectedFailure: ExpectedFailureSignature;
    ci: DevelopmentCiObservation;
  },
  substrate: GovernedContractSubstrate
): DevelopmentCiProof {
  return observeRed('GW-26', input, substrate, 'GW-27');
}

export function planGw27GreenImplementation(
  rawInput: {
    repository: string;
    branch: string;
    expectedHeadSha: string;
    redProof: DevelopmentCiProof;
    declaration: z.input<typeof DeclarationSchema>;
  },
  substrate: GovernedContractSubstrate
) {
  const declaration = DeclarationSchema.parse(rawInput.declaration);
  const valid = rawInput.redProof.contract.stepId === 'GW-26'
    && rawInput.redProof.status === 'SUCCESS'
    && rawInput.redProof.payload.headSha === rawInput.expectedHeadSha
    && rawInput.redProof.payload.matchedFailureSignature === true;
  if (!valid) {
    return result({
      stepId: 'GW-27', substrate, status: 'BLOCKED',
      reasonCodes: ['VALID_RED_PROOF_REQUIRED'],
      payload: Object.freeze({ nextStepId: null, evidenceModel: Object.freeze(['AGENT_DECLARED', 'CI_OBSERVED'] as const) })
    });
  }
  return result({
    stepId: 'GW-27', substrate, status: 'READY',
    payload: Object.freeze({ nextStepId: 'GW-28' as const, evidenceModel: Object.freeze(['AGENT_DECLARED', 'CI_OBSERVED'] as const) }),
    effectPlan: effectPlan({
      stepId: 'GW-27',
      toolName: 'github_create_commit',
      repository: rawInput.repository,
      branch: rawInput.branch,
      expectedHeadSha: rawInput.expectedHeadSha,
      declaration
    })
  });
}

export function observeGw28GreenCi(
  input: {
    expectedHeadSha: string;
    profile: ProjectValidationProfile;
    ci: DevelopmentCiObservation;
  },
  substrate: GovernedContractSubstrate
): DevelopmentCiProof {
  return observeGreen('GW-28', input, substrate, 'GW-29');
}

export function evaluateGw29SelfReview(
  rawInput: {
    headSha: string;
    greenProof: DevelopmentCiProof;
    declaredAt: string;
    findings: readonly z.input<typeof FindingSchema>[];
  },
  substrate: GovernedContractSubstrate
): SelfReviewResult {
  const headSha = ShaSchema.parse(rawInput.headSha);
  z.string().datetime({ offset: true }).parse(rawInput.declaredAt);
  const findings = Object.freeze(rawInput.findings.map((entry) => Object.freeze(FindingSchema.parse(entry))));
  const validGreen = rawInput.greenProof.contract.stepId === 'GW-28'
    && rawInput.greenProof.status === 'SUCCESS'
    && rawInput.greenProof.payload.headSha === headSha;
  if (!validGreen) {
    return result({
      stepId: 'GW-29', substrate, status: 'BLOCKED',
      reasonCodes: ['GREEN_CI_PROOF_REQUIRED'],
      payload: Object.freeze({
        headSha,
        findings,
        nextStepId: 'GW-32' as const,
        skipReason: 'SKIPPABLE_IF_FINDINGS_EMPTY' as const,
        evidenceModel: Object.freeze(['AGENT_DECLARED', 'CI_OBSERVED'] as const)
      })
    });
  }
  const hasFindings = findings.length > 0;
  return result({
    stepId: 'GW-29', substrate, status: 'SUCCESS',
    payload: Object.freeze({
      headSha,
      findings,
      nextStepId: hasFindings ? 'GW-30' as const : 'GW-32' as const,
      skipReason: hasFindings ? null : 'SKIPPABLE_IF_FINDINGS_EMPTY' as const,
      evidenceModel: Object.freeze(['AGENT_DECLARED', 'CI_OBSERVED'] as const)
    })
  }) as SelfReviewResult;
}

export function observeGw30RegressionRed(
  input: {
    selfReview: SelfReviewResult;
    expectedHeadSha: string;
    profile: ProjectValidationProfile;
    expectedFailure: ExpectedFailureSignature;
    ci: DevelopmentCiObservation;
  },
  substrate: GovernedContractSubstrate
): DevelopmentCiProof {
  if (
    input.selfReview.contract.stepId !== 'GW-29'
    || input.selfReview.status !== 'SUCCESS'
  ) {
    const ci = CiObservationSchema.parse(input.ci);
    return result({
      stepId: 'GW-30', substrate, status: 'BLOCKED',
      reasonCodes: ['SELF_REVIEW_PROOF_REQUIRED'],
      payload: ciPayload(ci, false, null, null)
    });
  }
  if (input.selfReview.payload.headSha !== input.expectedHeadSha) {
    const ci = CiObservationSchema.parse(input.ci);
    return result({
      stepId: 'GW-30', substrate, status: 'BLOCKED',
      reasonCodes: ['SELF_REVIEW_HEAD_MISMATCH'],
      payload: ciPayload(ci, false, null, null)
    });
  }
  if (input.selfReview.payload.findings.length === 0) {
    const ci = CiObservationSchema.parse(input.ci);
    return result({
      stepId: 'GW-30', substrate, status: 'NONE',
      reasonCodes: ['SKIPPABLE_IF_FINDINGS_EMPTY'],
      payload: ciPayload(ci, null, null, 'GW-32')
    });
  }
  return observeRed('GW-30', input, substrate, 'GW-31');
}

export function planGw31RegressionGreen(
  rawInput: {
    repository: string;
    branch: string;
    expectedHeadSha: string;
    regressionRed: DevelopmentCiProof;
    declaration: z.input<typeof DeclarationSchema>;
  },
  substrate: GovernedContractSubstrate
) {
  const declaration = DeclarationSchema.parse(rawInput.declaration);
  const valid = rawInput.regressionRed.contract.stepId === 'GW-30'
    && rawInput.regressionRed.status === 'SUCCESS'
    && rawInput.regressionRed.payload.headSha === rawInput.expectedHeadSha
    && rawInput.regressionRed.payload.matchedFailureSignature === true;
  if (!valid) {
    return result({
      stepId: 'GW-31', substrate, status: 'BLOCKED',
      reasonCodes: ['REGRESSION_RED_PROOF_REQUIRED'],
      payload: Object.freeze({ nextStepId: null, evidenceModel: Object.freeze(['AGENT_DECLARED', 'CI_OBSERVED'] as const) })
    });
  }
  return result({
    stepId: 'GW-31', substrate, status: 'READY',
    payload: Object.freeze({ nextStepId: 'GW-32' as const, evidenceModel: Object.freeze(['AGENT_DECLARED', 'CI_OBSERVED'] as const) }),
    effectPlan: effectPlan({
      stepId: 'GW-31',
      toolName: 'github_create_commit',
      repository: rawInput.repository,
      branch: rawInput.branch,
      expectedHeadSha: rawInput.expectedHeadSha,
      declaration
    })
  });
}

export function observeGw32FullRegression(
  input: {
    expectedHeadSha: string;
    profile: ProjectValidationProfile;
    ci: DevelopmentCiObservation;
  },
  substrate: GovernedContractSubstrate
): DevelopmentCiProof {
  return observeGreen('GW-32', input, substrate, 'GW-33');
}

export function planGw33Documentation(
  rawInput: {
    repository: string;
    branch: string;
    expectedHeadSha: string;
    fullRegressionProof: DevelopmentCiProof;
    documentationRequired: boolean;
    declaration: z.input<typeof DeclarationSchema>;
  },
  substrate: GovernedContractSubstrate
) {
  const declaration = DeclarationSchema.parse(rawInput.declaration);
  const valid = rawInput.fullRegressionProof.contract.stepId === 'GW-32'
    && rawInput.fullRegressionProof.status === 'SUCCESS'
    && rawInput.fullRegressionProof.payload.headSha === rawInput.expectedHeadSha;
  if (!valid) {
    return result({
      stepId: 'GW-33', substrate, status: 'BLOCKED',
      reasonCodes: ['FULL_REGRESSION_PROOF_REQUIRED'],
      payload: Object.freeze({ terminal: false as const, nextStepId: null, evidenceModel: Object.freeze(['AGENT_DECLARED', 'CI_OBSERVED'] as const) })
    });
  }
  if (!rawInput.documentationRequired) {
    return result({
      stepId: 'GW-33', substrate, status: 'NONE',
      reasonCodes: ['DOCUMENTATION_NOT_REQUIRED'],
      payload: Object.freeze({ terminal: false as const, nextStepId: 'GW-34' as const, evidenceModel: Object.freeze(['AGENT_DECLARED', 'CI_OBSERVED'] as const) })
    });
  }
  return result({
    stepId: 'GW-33', substrate, status: 'READY',
    payload: Object.freeze({ terminal: false as const, nextStepId: 'GW-34' as const, evidenceModel: Object.freeze(['AGENT_DECLARED', 'CI_OBSERVED'] as const) }),
    effectPlan: effectPlan({
      stepId: 'GW-33',
      toolName: 'github_create_commit',
      repository: rawInput.repository,
      branch: rawInput.branch,
      expectedHeadSha: rawInput.expectedHeadSha,
      declaration
    })
  });
}
