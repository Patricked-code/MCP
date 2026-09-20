import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

import {
  acknowledgeCandidateRecoveryRunner,
  assessCandidateLiveness,
  discoverCandidateIntakeSources,
  dispatchCandidateWork,
  planCandidateRecoveryRunner,
  superviseCandidateRecovery
} from '../../src/governedContext/candidateContinuity.js';
import {
  deriveCapabilityReality,
  deriveGovernanceDecision
} from '../../src/governance/operationalDecision.js';
import {
  planMinimalLockSet,
  wrapGw14ExistingTaskLookup,
  wrapGw18TaskClaim,
  wrapGw19MinimalLockAcquisition,
  wrapGw20TaskInProgress
} from '../../src/governedWorkflow/adapters/task.js';
import {
  wrapGw16SessionOpenOrResume,
  wrapGw17ContextAcknowledgement
} from '../../src/governedWorkflow/adapters/session.js';
import { createGovernedContractSubstrate } from '../../src/governedWorkflow/contractSubstrate.js';
import {
  observeGw28GreenCi,
  parseProjectValidationProfile,
  planGw24BranchCreation,
  validationProfileDigest
} from '../../src/governedWorkflow/development/index.js';
import {
  evaluateGw54ReceiptFreshness,
  observeGw44MainMergeCommit,
  observeGw45MainCi,
  observeGw46GovernedAutodeploy
} from '../../src/governedWorkflow/deploy/index.js';
import { parseRecoveryAnchor } from '../../src/governedWorkflow/executionEngine.js';
import {
  composeGovernanceInheritance,
  deriveEffectiveCapabilitySet
} from '../../src/governedWorkflow/governance/effectiveCapabilities.js';
import { captureIntent } from '../../src/governedWorkflow/intentCapture.js';
import {
  resolveGw04GithubIdentity,
  resolveGw05Repository,
  resolveGw06Project
} from '../../src/governedWorkflow/resolvers/githubResolvers.js';
import { resolveDomain } from '../../src/governedWorkflow/resolvers/domain.js';
import { resolveRuntime } from '../../src/governedWorkflow/resolvers/runtime.js';
import { resolveServer } from '../../src/governedWorkflow/resolvers/server.js';
import {
  composeGw41PremergeProof,
  observeGw35ExactDiffReview,
  planGw34DraftPr,
  planGw38PrReady,
  planGw43ExactHeadMerge
} from '../../src/governedWorkflow/review/index.js';
import {
  evaluateGw58DocumentationDrift,
  evaluateGw68TerminalVerification,
  planGw69TaskDone
} from '../../src/governedWorkflow/terminal/index.js';
import { normalizeLockScope } from '../../src/operationalMemory/lockService.js';
import {
  createTargetScope,
  deriveTargetContext,
  describeRecordTargetScope
} from '../../src/operationalMemory/targetScope.js';

import {
  MULTI_COMPONENT_FIXTURE,
  NOW,
  RECOVERY_FIXTURE,
  SHA_A,
  SHA_B,
  STABLECOIN_FIXTURE
} from './fixtures.js';

type AcceptanceScenarioStatus = 'PASS' | 'FAIL';

export type UniversalAcceptanceScenario = Readonly<{
  scenarioId: string;
  contractsExercised: readonly string[];
  status: AcceptanceScenarioStatus;
  reasonCode?: string;
  evidence: Readonly<Record<string, unknown>>;
}>;

export type UniversalAcceptanceReport = Readonly<{
  stepId: 'GW-73';
  status: 'ACCEPTED' | 'FAILED' | 'UNVERIFIED';
  scenarios: readonly UniversalAcceptanceScenario[];
  failedContracts: readonly string[];
  authorizationInferred: false;
  mutationPerformed: false;
}>;

type RunOptions = Readonly<{
  forceScenarioFailure?: string;
}>;

const ACCEPTANCE_ROOT = 'tests/governedWorkflowUniversalAcceptance';
const GOVERNED_SOURCE_ROOTS = [
  'src/governedWorkflow',
  'src/operationalMemory/targetScope.ts'
] as const;

const PHASE_F_FORBIDDEN_HARD_DEPENDENCIES = [
  'Patricked-code/MCP',
  'Stablecoin',
  'AfricaFunds',
  'FIXED_SERVER',
  'FIXED_BRANCH',
  'FIXED_DOMAIN'
] as const;

const FORBIDDEN_GOVERNED_LITERALS = [
  'Patricked-code/MCP',
  'Patricked-code/Stablecoin',
  'Stablecoin',
  'AfricaFunds',
  'stablecoin.chainsolutions.fr',
  'africafunds.chainsolutions.fr',
  'chainsolutions.fr',
  '/opt/apps/wealthtech-mcp-ssh-bridge',
  "'s1'",
  '"s1"',
  "'s2'",
  '"s2"'
] as const;

async function walkTs(relativePath: string): Promise<string[]> {
  const statEntries = await readdir(relativePath, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of statEntries) {
    const child = path.posix.join(relativePath, entry.name);
    if (entry.isDirectory()) files.push(...await walkTs(child));
    else if (entry.isFile() && child.endsWith('.ts')) files.push(child);
  }
  return files;
}

async function governedSourceFiles(): Promise<string[]> {
  const files: string[] = [];
  for (const root of GOVERNED_SOURCE_ROOTS) {
    if (root.endsWith('.ts')) files.push(root);
    else files.push(...await walkTs(root));
  }
  return [...new Set(files)].sort();
}

export function detectTargetHardcodesInSource(
  source: string
): readonly Readonly<{ literal: string }>[] {
  return Object.freeze(
    FORBIDDEN_GOVERNED_LITERALS
      .filter((literal) => source.includes(literal))
      .map((literal) => Object.freeze({ literal }))
  );
}

async function scanGovernedHardcodes() {
  const files = await governedSourceFiles();
  const violations: Array<{ path: string; literal: string }> = [];
  for (const file of files) {
    const source = await readFile(file, 'utf8');
    for (const violation of detectTargetHardcodesInSource(source)) {
      violations.push({ path: file, literal: violation.literal });
    }
  }
  return Object.freeze({
    files: Object.freeze(files),
    violations: Object.freeze(violations)
  });
}

async function canonicalContractSubstrate() {
  const [contractsText, graphText] = await Promise.all([
    readFile('.mcp/gwc-contracts.json', 'utf8'),
    readFile('.mcp/gwc-workflow-graph.json', 'utf8')
  ]);
  const contracts = JSON.parse(contractsText);
  const graph = JSON.parse(graphText);
  return createGovernedContractSubstrate({
    contractsProjection: contracts,
    graphProjection: graph,
    expectedSchemaVersion: 1,
    expectedContractRegistryDigest: contracts.registryDigest,
    expectedGraphRegistryDigest: graph.registryDigest
  });
}

async function contractPositionScenario(): Promise<UniversalAcceptanceScenario> {
  const [contracts, graph] = await Promise.all([
    readFile('.mcp/gwc-contracts.json', 'utf8').then(JSON.parse),
    readFile('.mcp/gwc-workflow-graph.json', 'utf8').then(JSON.parse)
  ]);
  const contract = contracts.contracts?.find((entry: any) => entry.stepId === 'GW-73') ?? null;
  const outside = graph.outOfRuntimeGraph?.find((entry: any) => entry.stepId === 'GW-73') ?? null;
  const pass = Boolean(
    contract
    && contract.canonicalName === 'UNIVERSAL_ACCEPTANCE'
    && contract.runtimeGraphMember === false
    && outside
  );
  return Object.freeze({
    scenarioId: 'gw73-contract-position',
    contractsExercised: Object.freeze(['GW-73']),
    status: pass ? 'PASS' : 'FAIL',
    evidence: Object.freeze({
      runtimeGraphMember: contract?.runtimeGraphMember ?? null,
      outOfRuntimeGraphRecorded: Boolean(outside),
      canonicalOutput: contract?.canonicalOutput ?? null
    })
  });
}

function mcpHistoricalScenario(
  hardcodeViolations: readonly { path: string; literal: string }[]
): UniversalAcceptanceScenario {
  const target = describeRecordTargetScope(undefined, 'Patricked-code/MCP');
  const workflowBranchingOnMcpLiteral = hardcodeViolations.some(
    (entry) => entry.literal === 'Patricked-code/MCP'
  );
  return Object.freeze({
    scenarioId: 'mcp-historical-single-repository',
    contractsExercised: Object.freeze(['GW-01', 'GW-04', 'GW-05', 'GW-06', 'GW-73']),
    status: (
      target.mode === 'LEGACY_SINGLE_REPOSITORY'
      && target.repository === 'Patricked-code/MCP'
      && !workflowBranchingOnMcpLiteral
    ) ? 'PASS' : 'FAIL',
    evidence: Object.freeze({
      targetMode: target.mode,
      repository: target.mode === 'LEGACY_SINGLE_REPOSITORY' ? target.repository : null,
      workflowBranchingOnMcpLiteral
    })
  });
}

function stablecoinScenario(): UniversalAcceptanceScenario {
  const fixture = STABLECOIN_FIXTURE;
  const targetContext = deriveTargetContext({
    project: fixture.project as any,
    observations: [fixture.observation] as any,
    observedAt: NOW
  });

  const runtime = resolveRuntime({
    server: {
      status: 'RESOLVED',
      observedAt: NOW,
      selectedServer: { serverId: fixture.runtime.serverId },
      freshness: 'CURRENT'
    },
    components: [{
      componentId: fixture.runtime.componentId,
      repositoryId: fixture.runtime.repositoryId,
      componentRole: fixture.runtime.componentRole
    }],
    observations: [{
      status: 'CURRENT',
      observedAt: NOW,
      freshness: 'CURRENT',
      ...fixture.runtime
    }],
    declarations: [{
      serverId: fixture.runtime.serverId,
      componentId: fixture.runtime.componentId,
      repositoryId: fixture.runtime.repositoryId,
      runtimeKind: fixture.runtime.runtimeKind,
      runtimeId: fixture.runtime.runtimeId
    }],
    runtimeHint: null,
    observedAt: NOW
  });

  const domain = resolveDomain({
    project: {
      status: 'RESOLVED',
      observedAt: NOW,
      repositoryId: fixture.runtime.repositoryId,
      selectedMapping: {
        mappingId: fixture.runtime.componentId,
        repositoryId: fixture.runtime.repositoryId,
        projectId: fixture.project.projectId,
        projectUid: fixture.project.projectUid,
        componentRole: 'FRONTEND'
      },
      selectedProject: {
        projectId: fixture.project.projectId,
        projectUid: fixture.project.projectUid,
        name: 'Stablecoin / E-WARI',
        kind: 'SINGLE_REPOSITORY_APPLICATION_WITH_EXTERNAL_API_RUNTIME'
      },
      candidates: [{ mappingId: fixture.runtime.componentId, projectId: fixture.project.projectId }],
      candidateCount: 1,
      freshness: 'CURRENT',
      provenance: ['fixture:pr86'],
      reasonCodes: [],
      registryDigest: 'b'.repeat(64),
      candidateDigest: 'c'.repeat(64)
    } as any,
    server: {
      status: 'RESOLVED',
      observedAt: NOW,
      projectId: fixture.project.projectId,
      selectedServer: { serverId: fixture.runtime.serverId },
      candidates: [],
      candidateCount: 1,
      freshness: 'CURRENT',
      provenance: ['fixture:pr86'],
      reasonCodes: [],
      registryDigest: 'b'.repeat(64),
      candidateDigest: 'c'.repeat(64),
      projectMappingId: fixture.runtime.componentId,
      canonicalServerIds: [fixture.runtime.serverId],
      authorizationInferred: false,
      mutationPerformed: false,
      sshMutationPerformed: false
    } as any,
    registry: {
      available: true,
      freshness: 'CURRENT',
      digest: 'b'.repeat(64),
      candidateDigest: 'c'.repeat(64),
      projects: [{
        projectId: fixture.project.projectId,
        publicDomain: fixture.publicDomain,
        publicApi: fixture.publicApi,
        historicalVhosts: []
      }],
      mappings: [{
        mappingId: fixture.runtime.componentId,
        repositoryId: fixture.runtime.repositoryId,
        projectId: fixture.project.projectId,
        componentRole: 'FRONTEND',
        serverId: fixture.runtime.serverId,
        domain: fixture.publicDomain,
        domainVerified: true
      }]
    },
    observation: {
      available: true,
      freshness: 'CURRENT',
      observedAt: NOW,
      serverId: fixture.runtime.serverId,
      domains: [
        {
          domain: fixture.publicDomain,
          verified: true,
          evidenceRef: 'fixture:pr86:frontend-domain'
        },
        {
          domain: new URL(fixture.publicApi).hostname,
          verified: true,
          evidenceRef: 'fixture:pr86:api-domain'
        }
      ]
    },
    observedAt: NOW
  });

  const pass = (
    targetContext.status === 'RESOLVED'
    && runtime.status === 'RESOLVED'
    && runtime.bindings.length === 1
    && runtime.bindings[0]?.runtimeKind === 'PASSENGER'
    && runtime.bindings[0]?.serverId === 'S2'
    && domain.status === 'RESOLVED'
    && fixture.backendRepository === null
    && fixture.backendState === 'LIVE_DISCOVERY_REQUIRED'
  );

  return Object.freeze({
    scenarioId: 'stablecoin-real-candidate',
    contractsExercised: Object.freeze(['GW-06', 'GW-07', 'GW-08', 'GW-09', 'GW-73']),
    status: pass ? 'PASS' : 'FAIL',
    evidence: Object.freeze({
      sourcePullRequest: fixture.provenance.pullRequestNumber,
      sourceHeadSha: fixture.provenance.candidateHeadSha,
      projectUid: targetContext.projectUid,
      runtimeKind: runtime.bindings[0]?.runtimeKind ?? null,
      serverId: runtime.bindings[0]?.serverId ?? null,
      domainStatus: domain.status,
      backendRepository: fixture.backendRepository,
      backendState: fixture.backendState,
      mcpSpecificBranchUsed: false
    })
  });
}

function multiComponentScenario(): UniversalAcceptanceScenario {
  const fixture = MULTI_COMPONENT_FIXTURE;
  const context = deriveTargetContext({
    project: fixture.project as any,
    observations: fixture.observations as any,
    observedAt: NOW
  });
  const frontendScope = createTargetScope(context, ['example-web']);
  const apiScope = createTargetScope(context, ['example-api']);
  const frontendLock = normalizeLockScope({
    type: 'component',
    targetId: frontendScope.targetId,
    mappingId: frontendScope.components[0]!.mappingId
  });
  const apiLock = normalizeLockScope({
    type: 'component',
    targetId: apiScope.targetId,
    mappingId: apiScope.components[0]!.mappingId
  });
  const githubHeads = context.components.map((entry) => entry.githubHead);
  const runtimeRevisions = context.components.map((entry) => entry.runtimeRevision);
  const pass = (
    context.status === 'RESOLVED'
    && new Set(githubHeads).size === context.components.length
    && new Set(runtimeRevisions).size === context.components.length
    && frontendLock !== apiLock
    && !Object.prototype.hasOwnProperty.call(context, 'projectSha')
  );
  return Object.freeze({
    scenarioId: 'synthetic-multi-component',
    contractsExercised: Object.freeze(['GW-06', 'GW-10', 'GW-11', 'GW-12', 'GW-13', 'GW-73']),
    status: pass ? 'PASS' : 'FAIL',
    evidence: Object.freeze({
      targetStatus: context.status,
      projectShaPresent: Object.prototype.hasOwnProperty.call(context, 'projectSha'),
      independentShas: new Set([...githubHeads, ...runtimeRevisions]).size === 4,
      independentLocks: frontendLock !== apiLock,
      frontendLock,
      apiLock
    })
  });
}

function partialComponentScenario(): UniversalAcceptanceScenario {
  const fixture = MULTI_COMPONENT_FIXTURE;
  const context = deriveTargetContext({
    project: fixture.project as any,
    observations: [fixture.observations[0]] as any,
    observedAt: NOW
  });
  const web = context.components.find((entry) => entry.mappingId === 'example-web');
  const api = context.components.find((entry) => entry.mappingId === 'example-api');
  const pass = (
    context.status === 'PARTIAL'
    && web?.freshness === 'CURRENT'
    && api?.freshness === 'UNVERIFIED'
  );
  return Object.freeze({
    scenarioId: 'partial-component-isolation',
    contractsExercised: Object.freeze(['GW-10', 'GW-73']),
    status: pass ? 'PASS' : 'FAIL',
    evidence: Object.freeze({
      targetStatus: context.status,
      resolvedSiblingFreshness: web?.freshness ?? null,
      unresolvedComponentFreshness: api?.freshness ?? null
    })
  });
}

async function recoveryScenario(): Promise<UniversalAcceptanceScenario> {
  const fixture = RECOVERY_FIXTURE;
  const stale = assessCandidateLiveness({
    candidateSessionId: fixture.candidateSessionId,
    agentIdentity: fixture.agentIdentity,
    observedHeadSha: fixture.headSha,
    heartbeatObservedAt: fixture.heartbeatObservedAt,
    observedAt: fixture.observedAt,
    freshForSeconds: 120
  });
  const missing = assessCandidateLiveness({
    candidateSessionId: fixture.candidateSessionId,
    agentIdentity: fixture.agentIdentity,
    observedHeadSha: fixture.headSha,
    heartbeatObservedAt: null,
    observedAt: fixture.observedAt,
    freshForSeconds: 120
  });
  const claim = {
    candidateSessionId: fixture.candidateSessionId,
    agentIdentity: fixture.agentIdentity,
    workItemId: fixture.workItemId,
    collisionDomains: ['path:tests/governedWorkflowUniversalAcceptance'],
    status: 'ACTIVE' as const
  };
  const supervised = superviseCandidateRecovery({
    expectedHeadSha: fixture.headSha,
    currentHeadSha: fixture.headSha,
    workItemId: fixture.workItemId,
    expectedCandidateSessionId: fixture.candidateSessionId,
    activeClaim: claim,
    checkpoint: { status: 'SUCCESS', headSha: fixture.headSha },
    liveness: stale
  });
  const dispatch = dispatchCandidateWork({
    candidateSessionId: fixture.candidateSessionId,
    agentIdentity: fixture.agentIdentity,
    workItems: [{
      workItemId: fixture.workItemId,
      intentKeys: ['gwc17'],
      title: 'Universal acceptance',
      status: 'IN_PROGRESS',
      priority: 1,
      sequence: 1,
      dependencies: [],
      collisionDomains: ['path:tests/governedWorkflowUniversalAcceptance']
    }],
    activeClaims: [claim]
  });
  const candidateSession = {
    candidateSessionId: fixture.candidateSessionId,
    agentIdentity: fixture.agentIdentity,
    provider: 'other' as const,
    providerConversationRef: null,
    providerConversationRefProvenance: 'UNAVAILABLE' as const,
    githubActor: null,
    githubConnectionRef: 'fixture-github-connection',
    connectionInstanceRef: 'fixture-connection-instance',
    repository: 'Patricked-code/MCP' as const,
    branch: 'claude/ecstatic-edison-v1dyt1' as const,
    startingHeadSha: fixture.headSha,
    lastObservedHeadSha: fixture.headSha,
    createdAt: '2026-09-19T13:00:00.000Z',
    lastSeenAt: '2026-09-19T13:20:00.000Z',
    status: 'ACTIVE' as const
  };
  const runnerInput = {
    recoveryDecision: supervised.decision,
    candidateSession,
    expectedHeadSha: fixture.headSha,
    capability: {
      provider: 'other' as const,
      verifiedSessionResumeSupported: false,
      replacementExecutorSupported: true
    }
  };
  const runnerA = planCandidateRecoveryRunner(runnerInput);
  const runnerB = planCandidateRecoveryRunner(runnerInput);
  const acknowledged = acknowledgeCandidateRecoveryRunner(runnerA, {
    planId: runnerA.planId,
    candidateSessionId: fixture.candidateSessionId,
    observedHeadSha: fixture.headSha,
    acknowledgedAt: NOW
  });
  const staleEnvelope = acknowledgeCandidateRecoveryRunner(runnerA, {
    planId: runnerA.planId,
    candidateSessionId: fixture.candidateSessionId,
    observedHeadSha: SHA_B,
    acknowledgedAt: NOW
  });
  const intake = discoverCandidateIntakeSources({
    registeredIntakes: [{
      intakeId: 'NEW_INFORMATION_INTAKE-003',
      sequence: 3,
      status: 'RECEIVED',
      sourceType: 'chatgpt',
      sourceId: 'github-pr95-comment-5738570504',
      sourceDigest: 'a'.repeat(64),
      observedAt: '2026-09-19T02:56:49.000Z'
    }],
    discoveredSources: [
      {
        sourceType: 'chatgpt',
        sourceId: 'github-pr95-comment-5738570504',
        sourceDigest: 'a'.repeat(64),
        observedAt: '2026-09-19T02:56:49.000Z'
      },
      {
        sourceType: 'claude',
        sourceId: 'github-pr95-comment-new',
        sourceDigest: 'b'.repeat(64),
        observedAt: '2026-09-19T13:00:00.000Z'
      },
      {
        sourceType: 'other',
        sourceId: 'duplicate-by-digest',
        sourceDigest: 'b'.repeat(64),
        observedAt: '2026-09-19T13:01:00.000Z'
      }
    ]
  });

  const recoveryAnchor = parseRecoveryAnchor({
    anchorId: 'fixture-anchor-before-mutation',
    stepId: 'GW-40',
    observedPostcondition: {
      authority: 'Governed Lock Service',
      kind: 'OBSERVATION',
      reference: 'fixture:lock-observed',
      observedAt: NOW,
      freshness: 'CURRENT',
      digest: 'e'.repeat(64),
      binding: {
        repository: 'ExampleOrg/recovery',
        headSha: fixture.headSha,
        sessionId: fixture.candidateSessionId
      }
    },
    binding: {
      repository: 'ExampleOrg/recovery',
      headSha: fixture.headSha,
      sessionId: fixture.candidateSessionId
    },
    replayClassOfNextStep: 'NON_REPLAYABLE_MUTATION',
    duplicateInvocationRule: 'REOBSERVE_THEN_DECIDE'
  }, 'GW-41');

  const substrate = await canonicalContractSubstrate();
  const gw68Definition = substrate.resolve('GW-68');
  const deploymentBeforeAttestation = evaluateGw68TerminalVerification({
    taskId: 'TASK-20260919-973',
    taskStatus: 'VERIFYING',
    governedSessionId: '11111111-1111-4111-8111-111111111111',
    bootstrapReceiptId: '22222222-2222-4222-8222-222222222222',
    receiptStateVersion: 400,
    expectedHeadSha: fixture.headSha,
    expectedRuntimeRevision: fixture.headSha,
    liveState: {
      stateVersion: 400,
      freshness: 'CURRENT',
      ageSeconds: 5,
      maxAgeSeconds: 60,
      githubHead: fixture.headSha,
      s1Head: fixture.headSha,
      runtimeRevision: fixture.headSha,
      globalAlignment: 'FULLY_ALIGNED',
      documentationStatus: 'ALIGNED',
      documentationDrift: false,
      contradictions: [],
      observedAt: NOW
    },
    documentation: {
      status: 'ALIGNED',
      drift: false,
      observedAt: NOW,
      trackedHeadSha: fixture.headSha
    },
    terminalEvidence: {
      task: {
        taskId: 'TASK-20260919-973',
        taskRevision: 31,
        status: 'VERIFYING',
        ownerGovernedSessionId: '11111111-1111-4111-8111-111111111111',
        observedHeadSha: fixture.headSha,
        runtimeRevision: fixture.headSha
      },
      receipt: {
        bootstrapReceiptId: '22222222-2222-4222-8222-222222222222',
        stateVersion: 400,
        runtimeRevision: fixture.headSha
      },
      ci: {
        runId: 1500,
        headSha: fixture.headSha,
        conclusion: 'success'
      },
      deployment: {
        jobId: 'fixture-deploy-before-attestation',
        ciRunId: 1500,
        headSha: fixture.headSha,
        runtimeRevision: fixture.headSha,
        result: 'pending-attestation'
      },
      review: {
        pullRequestNumber: 197,
        headSha: fixture.headSha,
        approved: true,
        unresolvedThreads: 0
      },
      locks: {
        ownActiveLockCount: 1,
        foreignConflictingLockCount: 0
      }
    }
  } as any, substrate);

  const terminalContractRegistryBound = Boolean(
    gw68Definition
    && deploymentBeforeAttestation.contract.stepId === gw68Definition.stepId
    && deploymentBeforeAttestation.contract.contractVersion === gw68Definition.contractVersion
    && deploymentBeforeAttestation.contract.contractRegistryDigest === substrate.contractRegistryDigest
    && deploymentBeforeAttestation.contract.graphRegistryDigest === substrate.graphRegistryDigest
  );

  const serialized = JSON.stringify({
    stale,
    missing,
    supervised,
    dispatch,
    runnerA,
    acknowledged,
    staleEnvelope,
    intake,
    recoveryAnchor,
    deploymentBeforeAttestation
  });
  const pass = (
    stale.status === 'STALE'
    && stale.claimTransferAllowed === false
    && stale.authorizationGranted === false
    && missing.mayWrite === false
    && supervised.claimTransferAllowed === false
    && supervised.authorizationGranted === false
    && dispatch.status === 'CONTINUE'
    && runnerA.action === 'START_REPLACEMENT_EXECUTOR'
    && runnerA.planId === runnerB.planId
    && acknowledged.status === 'REPLACEMENT_STARTED'
    && staleEnvelope.status === 'UNVERIFIED'
    && intake.duplicateSourceIds.length === 2
    && intake.executesInstructions === false
    && recoveryAnchor.duplicateInvocationRule === 'REOBSERVE_THEN_DECIDE'
    && deploymentBeforeAttestation.status === 'BLOCKED'
    && terminalContractRegistryBound
    && !serialized.includes('rawTranscript')
    && !serialized.includes('resumeSecret')
    && !serialized.includes('authorizationHeader')
  );

  return Object.freeze({
    scenarioId: 'candidate-recovery-intake003',
    contractsExercised: Object.freeze(['GW-02', 'GW-03', 'GW-17', 'GW-18', 'GW-19', 'GW-20', 'GW-68', 'GW-73']),
    status: pass ? 'PASS' : 'FAIL',
    evidence: Object.freeze({
      staleTransfersClaim: stale.claimTransferAllowed,
      missingHeartbeatAllowsWrite: missing.mayWrite,
      runnerIsAuthority: runnerA.authorizationGranted,
      runnerAcknowledged: acknowledged.status === 'REPLACEMENT_STARTED',
      intakeDuplicateCount: intake.duplicateSourceIds.length,
      restartPlanDeterministic: runnerA.planId === runnerB.planId,
      staleEnvelopeAccepted: staleEnvelope.status !== 'UNVERIFIED',
      terminalContractRegistryBound,
      rawTranscriptPersisted: serialized.includes('rawTranscript'),
      secretPersisted: (
        serialized.includes('resumeSecret')
        || serialized.includes('authorizationHeader')
      ),
      crashWindows: Object.freeze([
        'CLAIM_BEFORE_LOCK',
        'LOCK_BEFORE_MUTATION',
        'DEPLOYMENT_BEFORE_ATTESTATION'
      ]),
      claimRecoveryDisposition: dispatch.status,
      duplicateInvocationRule: recoveryAnchor.duplicateInvocationRule,
      deploymentBeforeAttestationStatus: deploymentBeforeAttestation.status
    })
  });
}

async function antiHardcodeScenario(
  scan: Awaited<ReturnType<typeof scanGovernedHardcodes>>
): Promise<UniversalAcceptanceScenario> {
  return Object.freeze({
    scenarioId: 'anti-hardcode-governed-paths',
    contractsExercised: Object.freeze(['GW-04', 'GW-05', 'GW-06', 'GW-07', 'GW-08', 'GW-09', 'GW-10', 'GW-73']),
    status: scan.violations.length === 0 ? 'PASS' : 'FAIL',
    evidence: Object.freeze({
      scannedFileCount: scan.files.length,
      violations: scan.violations
    })
  });
}

export async function verifyAcceptanceHarnessIsolation(): Promise<Readonly<{
  harnessPath: string;
  runtimeImportsAcceptanceHarness: boolean;
  importingFiles: readonly string[];
}>> {
  const sourceFiles = await walkTs('src');
  const importingFiles: string[] = [];
  for (const file of sourceFiles) {
    const source = await readFile(file, 'utf8');
    if (
      source.includes('governedWorkflowUniversalAcceptance')
      || source.includes(ACCEPTANCE_ROOT)
    ) {
      importingFiles.push(file);
    }
  }
  return Object.freeze({
    harnessPath: `${ACCEPTANCE_ROOT}/harness.ts`,
    runtimeImportsAcceptanceHarness: importingFiles.length > 0,
    importingFiles: Object.freeze(importingFiles.sort())
  });
}

export async function runFullCandidateHappyPath() {
  const substrate = await canonicalContractSubstrate();
  const HEAD = '7'.repeat(40);
  const REPOSITORY = 'ExampleOrg/api';
  const REPOSITORY_ID = 'github:ExampleOrg/api';
  const PROJECT_ID = 'example.platform';
  const PROJECT_UID = 'EXAMPLE-001';
  const COMPONENT_ID = 'example-api';
  const SERVER_ID = 's2';
  const RUNTIME_ID = 'passenger:example-api';
  const TASK_ID = 'TASK-20260919-902';
  const SESSION_ID = '11111111-1111-4111-8111-111111111111';
  const RECEIPT_ID = '22222222-2222-4222-8222-222222222222';
  const LOCK_ID = '33333333-3333-4333-8333-333333333333';
  const CONTEXT_ID = '44444444-4444-4444-8444-444444444444';
  const PR_NUMBER = 196;
  const STATE_VERSION = 400;
  const stages: Array<{ name: string; status: 'PASS' | 'FAIL' }> = [];
  const stage = (name: string, pass: boolean) => {
    stages.push(Object.freeze({ name, status: pass ? 'PASS' as const : 'FAIL' as const }));
  };

  const intent = captureIntent({
    rawIntent: 'Implement the bounded candidate change for Example Platform.',
    source: 'other',
    receivedAt: NOW
  });
  stage('Intent', intent.status === 'INTENT_CAPTURED');

  const identityInput = {
    oauthPrincipalId: 'oauth:example-user',
    repositoryContext: REPOSITORY,
    policy: {
      schemaVersion: 2,
      updatedAt: NOW,
      goal: 'bind identity evidence',
      currentSignals: ['oauth'],
      limits: ['identity only'],
      s1GithubDeploymentIdentity: {
        id: 'TEST_READ_ONLY',
        type: 'github_deploy_key_ssh',
        repository: REPOSITORY,
        fetchAlias: 'example-read-only',
        contentsRead: true,
        contentsWrite: false,
        pushUrl: 'disabled://read-only',
        privateKeyReadableByMcp: false
      },
      requiredSuiviFields: ['date'],
      githubPrincipalBindings: [{
        bindingId: 'binding-example',
        oauthPrincipalId: 'oauth:example-user',
        provider: 'github',
        connectionSelector: { owner: 'ExampleOrg', type: 'organization' },
        expectedAuthenticatedLogin: 'example-user',
        context: { repository: REPOSITORY },
        effect: 'IDENTITY_ONLY',
        enabled: true
      }]
    },
    policyDigest: 'a'.repeat(64),
    policyValid: true,
    connections: [{
      owner: 'ExampleOrg',
      type: 'organization',
      configuredStatus: 'active',
      authenticationContextId: 'authctx-example',
      principal: {
        status: 'VERIFIED',
        observedAt: NOW,
        freshness: 'CURRENT',
        login: 'example-user',
        githubUserId: 42,
        accountType: 'user',
        reasonCode: null
      },
      accountVerified: true
    }],
    observedAt: NOW
  } as any;
  const identity = resolveGw04GithubIdentity(identityInput, substrate);
  stage('Identity', identity.status === 'RESOLVED' && identity.freshness === 'CURRENT');

  const repositoryInput = {
    identity: identity.payload,
    identityAuthenticationContextId: 'authctx-example',
    requestedRepositoryContext: REPOSITORY,
    registry: {
      available: true,
      schemaVersion: 1,
      mappings: [{ githubOwner: 'ExampleOrg', githubRepo: 'api' }],
      digest: 'registry-v1'
    },
    repositoryObservation: {
      status: 'VERIFIED',
      observedAt: NOW,
      freshness: 'CURRENT',
      requestedFullName: REPOSITORY,
      repository: {
        githubRepositoryId: 101,
        owner: 'ExampleOrg',
        ownerType: 'organization',
        name: 'api',
        fullName: REPOSITORY,
        defaultBranch: 'main',
        visibility: 'private',
        archived: false,
        fork: false
      },
      reasonCode: null
    },
    observedAt: NOW
  } as any;
  const repository = resolveGw05Repository(repositoryInput, substrate);
  stage('Repository', repository.status === 'RESOLVED'
    && repository.payload.selectedRepository?.fullName === REPOSITORY);

  const projectInput = {
    repository: repository.payload,
    registry: {
      available: true,
      sourceSchemaVersion: 1,
      digest: 'registry-v1',
      candidateDigest: 'registry-v2-candidate',
      mappings: [{
        mappingId: COMPONENT_ID,
        repositoryId: REPOSITORY_ID,
        projectId: PROJECT_ID,
        projectUid: PROJECT_UID,
        componentRole: 'API'
      }],
      projects: [{
        projectId: PROJECT_ID,
        projectUid: PROJECT_UID,
        name: 'Example Platform',
        kind: 'MULTI_REPOSITORY_APPLICATION',
        repositoryComponents: [
          { repositoryId: REPOSITORY_ID, mappingId: COMPONENT_ID, role: 'API' }
        ]
      }],
      activationReadiness: [{
        mappingId: COMPONENT_ID,
        status: 'READY',
        reasonCodes: []
      }]
    },
    observedAt: NOW
  } as any;
  const project = resolveGw06Project(projectInput, substrate);
  stage('Project', project.status === 'RESOLVED'
    && project.payload.selectedProject?.projectUid === PROJECT_UID);

  const server = resolveServer({
    project: project.payload,
    registry: {
      available: true,
      freshness: 'CURRENT',
      digest: 'b'.repeat(64),
      candidateDigest: 'c'.repeat(64),
      mappings: [{
        mappingId: COMPONENT_ID,
        repositoryId: REPOSITORY_ID,
        projectId: PROJECT_ID,
        projectUid: PROJECT_UID,
        componentRole: 'API',
        serverId: SERVER_ID,
        serverPath: '/srv/example/api',
        realPath: '/srv/example/api',
        realPathVerified: true,
        environment: 'production'
      }]
    },
    canonicalServerIds: ['s1', SERVER_ID],
    serverHint: null,
    observedAt: NOW
  } as any);
  stage('Server', server.status === 'RESOLVED'
    && server.selectedServer?.serverId === SERVER_ID);

  const runtime = resolveRuntime({
    server,
    components: [{
      componentId: COMPONENT_ID,
      repositoryId: REPOSITORY_ID,
      componentRole: 'API'
    }],
    observations: [{
      status: 'CURRENT',
      observedAt: NOW,
      freshness: 'CURRENT',
      serverId: SERVER_ID,
      componentId: COMPONENT_ID,
      repositoryId: REPOSITORY_ID,
      componentRole: 'API',
      runtimeKind: 'PASSENGER',
      runtimeId: RUNTIME_ID,
      revision: HEAD,
      evidenceRef: 'phase-f:runtime'
    }],
    declarations: [{
      serverId: SERVER_ID,
      componentId: COMPONENT_ID,
      repositoryId: REPOSITORY_ID,
      runtimeKind: 'PASSENGER',
      runtimeId: RUNTIME_ID
    }],
    runtimeHint: null,
    observedAt: NOW
  } as any);
  stage('Runtime', runtime.status === 'RESOLVED'
    && runtime.bindings[0]?.revision === HEAD);

  const domain = resolveDomain({
    project: {
      ...project.payload,
      registryDigest: 'b'.repeat(64),
      candidateDigest: 'c'.repeat(64)
    },
    server,
    registry: {
      available: true,
      freshness: 'CURRENT',
      digest: 'b'.repeat(64),
      candidateDigest: 'c'.repeat(64),
      projects: [{
        projectId: PROJECT_ID,
        publicDomain: 'api.example.com',
        publicApi: 'https://api.example.com/v1',
        historicalVhosts: []
      }],
      mappings: [{
        mappingId: COMPONENT_ID,
        repositoryId: REPOSITORY_ID,
        projectId: PROJECT_ID,
        componentRole: 'API',
        serverId: SERVER_ID,
        domain: 'api.example.com',
        domainVerified: true
      }]
    },
    observation: {
      available: true,
      freshness: 'CURRENT',
      observedAt: NOW,
      serverId: SERVER_ID,
      domains: [{
        domain: 'api.example.com',
        verified: true,
        evidenceRef: 'phase-f:domain'
      }]
    },
    observedAt: NOW
  } as any);
  stage('Domain', domain.status === 'RESOLVED');

  const TOOL = 'mcp_transition_governed_task';
  const capabilityReality = deriveCapabilityReality({
    toolName: TOOL,
    registered: true,
    callability: { status: 'CALLABLE', source: 'SERVER' },
    authorized: { status: 'TRUE' },
    governanceSafe: true,
    observedAt: NOW,
    provenance: ['phase-f-happy-path']
  });
  const governanceDecision = deriveGovernanceDecision({
    operation: TOOL,
    capabilityReality,
    sessionPresent: true,
    bootstrapCurrent: true,
    lockConflicts: 0,
    githubWorkStateAvailable: true,
    requiresGithubWorkState: false,
    ownerMatches: true,
    dependenciesSatisfied: true,
    runtimeAligned: true,
    requiresRuntimeAlignment: false,
    requiredEvidence: [],
    observedAt: NOW
  } as any);
  const governance = composeGovernanceInheritance({
    target: {
      targetId: PROJECT_UID,
      repositoryId: REPOSITORY,
      componentId: COMPONENT_ID
    },
    capabilityReality,
    governanceDecision,
    observedAt: NOW
  } as any);
  stage('Governance', governance.status === 'SUCCESS' && governance.mayExecute === true);
  const capabilities = deriveEffectiveCapabilitySet(governance);
  stage('Capability', capabilities.status === 'SUCCESS'
    && capabilities.mayExecute === true
    && capabilities.capabilities.some((entry) => entry.effective));

  const task: any = {
    schemaVersion: 1,
    taskId: TASK_ID,
    repository: REPOSITORY,
    intentKey: 'phase-f-happy-path',
    title: 'Phase F happy path',
    summary: 'Synthetic full candidate acceptance path.',
    priority: 50,
    sequence: 1,
    status: 'IN_PROGRESS',
    dependencies: [],
    resourceScopes: [`repository:${REPOSITORY}`],
    ownerGovernedSessionId: SESSION_ID,
    workBranch: 'phase-f/happy-path',
    pullRequestNumber: PR_NUMBER,
    observedHeadSha: HEAD,
    runtimeRevision: HEAD,
    blockers: [],
    nextAction: 'development',
    source: { kind: 'agent', requestDigest: 'e'.repeat(64) },
    createdAt: NOW,
    updatedAt: NOW,
    taskRevision: 10
  };
  const taskLookup = wrapGw14ExistingTaskLookup(task, substrate);
  const taskClaim = wrapGw18TaskClaim(task, substrate);
  const taskProgress = wrapGw20TaskInProgress(task, substrate);
  stage('Task', taskLookup.status === 'FOUND'
    && taskClaim.status === 'CLAIMED'
    && taskProgress.status === 'IN_PROGRESS');

  const receipt: any = {
    schemaVersion: 1,
    bootstrapReceiptId: RECEIPT_ID,
    governedSessionId: SESSION_ID,
    agentIdentity: 'acceptance-agent',
    repository: REPOSITORY,
    governedBranch: 'phase-f/happy-path',
    stateVersion: STATE_VERSION,
    githubHead: HEAD,
    runtimeRevision: HEAD,
    catalogueDigest: 'b'.repeat(64),
    governanceDigest: 'c'.repeat(64),
    taskRegistryDigest: 'd'.repeat(64),
    createdAt: NOW,
    expiresAt: '2026-09-19T23:30:00.000Z',
    status: 'ACKNOWLEDGED',
    limitations: []
  };
  const session: any = {
    schemaVersion: 1,
    governedSessionId: SESSION_ID,
    repository: REPOSITORY,
    taskScope: TASK_ID,
    workBranch: 'phase-f/happy-path',
    agentIdentity: 'acceptance-agent',
    ownerPrincipalId: 'oauth:example-user',
    identityAssurance: 'oauth_subject',
    status: 'ACTIVE',
    createdAt: NOW,
    resumedAt: NOW,
    lastHeartbeatAt: NOW,
    pausedAt: null,
    expiredAt: null,
    closedAt: null,
    currentTransport: null,
    lastAcknowledgedStateVersion: STATE_VERSION,
    bootstrapReceipt: receipt,
    connectionContext: {
      schemaVersion: 1,
      connectionContextId: CONTEXT_ID,
      governedSessionId: SESSION_ID,
      repository: REPOSITORY,
      principalId: 'oauth:example-user',
      observedClientId: 'chatgpt-client',
      identityAssurance: 'oauth_subject',
      clientClassification: 'UNRESOLVED',
      evidenceSource: 'oauth_auth_info',
      createdAt: NOW
    },
    sessionRevision: 20,
    lastCheckpoint: null,
    blockers: [],
    nextAction: 'continue',
    lockIds: [LOCK_ID],
    resumePolicy: 'stable_principal_or_resume_secret'
  };
  const sessionOpen = wrapGw16SessionOpenOrResume({ status: 'OPENED', session }, substrate);
  const sessionAck = wrapGw17ContextAcknowledgement(session, STATE_VERSION, substrate);
  stage('Session', sessionOpen.status === 'OPENED' && sessionAck.status === 'ACKNOWLEDGED');

  const lockPlan = planMinimalLockSet([{ type: 'repository', key: REPOSITORY }]);
  const grantedLock: any = {
    schemaVersion: 1,
    lockId: LOCK_ID,
    governedSessionId: SESSION_ID,
    scope: `repository:${REPOSITORY}`,
    status: 'ACTIVE',
    acquiredAt: NOW,
    renewedAt: NOW,
    expiresAt: '2026-09-19T23:30:00.000Z',
    lockRevision: 1,
    reason: 'phase-f-happy-path'
  };
  const locks = wrapGw19MinimalLockAcquisition({
    plan: lockPlan,
    grantedLocks: [grantedLock]
  }, substrate);
  stage('Locks', locks.status === 'GRANTED');

  const declaration = {
    declaredAt: NOW,
    summary: 'bounded phase f happy path change',
    changeDigest: 'f'.repeat(64)
  };
  const development = planGw24BranchCreation({
    repository: REPOSITORY,
    branch: 'phase-f/happy-path',
    baseSha: HEAD,
    branchPolicyAllowed: true,
    declaration
  }, substrate);
  stage('Development', development.status === 'READY'
    && development.effectPlan?.expectedHeadSha === HEAD
    && development.mutationPerformed === false);

  const profile = parseProjectValidationProfile({
    schemaVersion: 1,
    profileId: 'example-ci-v1',
    projectId: PROJECT_ID,
    repository: REPOSITORY,
    ci: { workflow: 'Candidate CI', job: 'validate' },
    validationScripts: [{ id: 'test', script: 'test' }],
    workflowNativeChecks: [],
    testDiscovery: {
      root: 'tests',
      suffix: '.test.ts',
      runnerScript: 'test',
      dedicated: []
    }
  });
  const ci = observeGw28GreenCi({
    expectedHeadSha: HEAD,
    profile,
    ci: {
      runId: 9002,
      observedAt: NOW,
      workflow: 'Candidate CI',
      job: 'validate',
      profileId: profile.profileId,
      profileDigest: validationProfileDigest(profile),
      headSha: HEAD,
      status: 'completed',
      conclusion: 'success',
      failedSteps: [],
      failureSignals: []
    }
  }, substrate);
  stage('CI', ci.status === 'SUCCESS' && ci.payload.headSha === HEAD);

  const reviewPlan = planGw34DraftPr({
    repository: REPOSITORY,
    sourceBranch: 'phase-f/happy-path',
    baseBranch: 'main',
    expectedHeadSha: HEAD,
    title: 'Phase F candidate happy path'
  }, substrate);
  stage('Review', reviewPlan.status === 'READY'
    && reviewPlan.effectPlan?.expectedHeadSha === HEAD);

  const githubContext: any = {
    status: 'CURRENT',
    observedAt: NOW,
    mainHead: 'c'.repeat(40),
    workBranch: 'phase-f/happy-path',
    workBranchHead: HEAD,
    pullRequest: {
      number: PR_NUMBER,
      state: 'open',
      draft: false,
      merged: false,
      base: 'main',
      head: 'phase-f/happy-path',
      headSha: HEAD,
      author: 'acceptance-agent',
      updatedAt: NOW
    },
    checks: {
      status: 'completed',
      conclusion: 'success',
      total: 1,
      failed: 0,
      headSha: HEAD,
      exactHead: true,
      required: [{ context: 'Candidate CI', status: 'completed', conclusion: 'success' }],
      requiredSatisfied: true
    },
    reviews: {
      approvals: 1,
      changesRequested: 0,
      unresolvedThreads: 0,
      headSha: HEAD,
      exactHead: true
    },
    ruleset: {
      name: 'main-protection',
      enforcement: 'active',
      requiresPullRequest: true,
      requiredStatusChecks: ['Candidate CI'],
      requiresConversationResolution: true,
      requiredApprovingReviewCount: 1
    },
    ownership: { pullRequestAuthor: 'acceptance-agent' },
    activity: { lastActivityAt: NOW },
    cache: { status: 'REFRESHED', observedAt: NOW, provenance: 'github_api' },
    evidence: {
      main: { freshness: 'CURRENT', observedAt: NOW, provenance: 'github_api' },
      pullRequest: { freshness: 'CURRENT', observedAt: NOW, provenance: 'github_api' },
      checks: { freshness: 'CURRENT', observedAt: NOW, provenance: 'github_api' },
      reviews: { freshness: 'CURRENT', observedAt: NOW, provenance: 'github_api' },
      ruleset: { freshness: 'CURRENT', observedAt: NOW, provenance: 'github_api' }
    },
    reasonCodes: [],
    uncertainties: [],
    error: null,
    repositoryResolution: {
      status: 'RESOLVED',
      observedAt: NOW,
      requestedRepositoryContext: REPOSITORY,
      selectionSource: 'connection_context',
      selectedAccountContext: { owner: 'ExampleOrg', type: 'organization' },
      selectedRepository: {
        repositoryId: REPOSITORY_ID,
        githubRepositoryId: 101,
        owner: 'ExampleOrg',
        ownerType: 'organization',
        name: 'api',
        fullName: REPOSITORY,
        defaultBranch: 'main',
        visibility: 'private',
        archived: false,
        fork: false
      },
      candidates: [],
      candidateCount: 0,
      freshness: 'CURRENT',
      provenance: ['phase-f'],
      reasonCodes: [],
      uncertainties: [],
      registryDigest: 'registry-v1'
    }
  };
  const premerge = composeGw41PremergeProof({
    expectedHeadSha: HEAD,
    github: githubContext,
    taskId: TASK_ID,
    taskRevision: 10,
    taskStatus: 'REVIEW',
    governedSessionId: SESSION_ID,
    sessionRevision: 20,
    bootstrapReceiptId: RECEIPT_ID,
    stateVersion: STATE_VERSION,
    checkpointHeadSha: HEAD
  }, substrate);
  const merge = planGw43ExactHeadMerge({
    repository: REPOSITORY,
    pullRequestNumber: PR_NUMBER,
    expectedHeadSha: HEAD,
    premergeProof: premerge
  }, substrate);
  stage('Merge', premerge.status === 'SUCCESS'
    && merge.status === 'READY'
    && merge.effectPlan?.expectedHeadSha === HEAD);

  const merged = observeGw44MainMergeCommit({
    repository: REPOSITORY,
    expectedMergeSha: HEAD,
    mainHeadSha: HEAD,
    observedAt: NOW
  }, substrate);
  const mainCi = observeGw45MainCi({
    expectedHeadSha: HEAD,
    ci: {
      runId: 1500,
      workflow: 'MCP CI',
      event: 'push',
      headSha: HEAD,
      status: 'completed',
      conclusion: 'success',
      observedAt: NOW
    }
  }, substrate);
  const deploy = observeGw46GovernedAutodeploy({
    expectedHeadSha: HEAD,
    ciProof: mainCi,
    deploy: {
      runId: 2500,
      jobId: 'candidate-deploy-2500-aaaaaaaaaaaa',
      workflow: 'MCP Governed Deploy',
      event: 'push',
      headSha: HEAD,
      status: 'completed',
      conclusion: 'success',
      observedAt: NOW
    }
  }, substrate);
  stage('Deploy', merged.status === 'SUCCESS'
    && mainCi.status === 'SUCCESS'
    && deploy.status === 'SUCCESS');

  const verify = evaluateGw68TerminalVerification({
    taskId: TASK_ID,
    taskStatus: 'VERIFYING',
    governedSessionId: SESSION_ID,
    bootstrapReceiptId: RECEIPT_ID,
    receiptStateVersion: STATE_VERSION,
    expectedHeadSha: HEAD,
    expectedRuntimeRevision: HEAD,
    liveState: {
      stateVersion: STATE_VERSION,
      freshness: 'CURRENT',
      ageSeconds: 5,
      maxAgeSeconds: 60,
      githubHead: HEAD,
      s1Head: HEAD,
      runtimeRevision: HEAD,
      globalAlignment: 'FULLY_ALIGNED',
      documentationStatus: 'ALIGNED',
      documentationDrift: false,
      contradictions: [],
      observedAt: NOW
    },
    documentation: {
      status: 'ALIGNED',
      drift: false,
      observedAt: NOW,
      trackedHeadSha: HEAD
    },
    terminalEvidence: {
      task: {
        taskId: TASK_ID,
        taskRevision: 31,
        status: 'VERIFYING',
        ownerGovernedSessionId: SESSION_ID,
        observedHeadSha: HEAD,
        runtimeRevision: HEAD
      },
      receipt: {
        bootstrapReceiptId: RECEIPT_ID,
        stateVersion: STATE_VERSION,
        runtimeRevision: HEAD
      },
      ci: {
        runId: 1500,
        headSha: HEAD,
        conclusion: 'success'
      },
      deployment: {
        jobId: 'candidate-deploy-2500-aaaaaaaaaaaa',
        ciRunId: 1500,
        headSha: HEAD,
        runtimeRevision: HEAD,
        result: 'succeeded'
      },
      review: {
        pullRequestNumber: PR_NUMBER,
        headSha: HEAD,
        approved: true,
        unresolvedThreads: 0
      },
      locks: {
        ownActiveLockCount: 1,
        foreignConflictingLockCount: 0
      }
    }
  } as any, substrate);
  stage('Verify', verify.status === 'SUCCESS'
    && verify.payload.terminalVerified === true);

  const done = planGw69TaskDone({
    taskId: TASK_ID,
    expectedTaskRevision: 31,
    governedSessionId: SESSION_ID,
    expectedSessionRevision: 22,
    expectedBootstrapReceiptId: RECEIPT_ID,
    expectedStateVersion: STATE_VERSION,
    expectedHeadSha: HEAD,
    terminalVerification: {
      status: verify.status,
      terminalVerified: verify.payload.terminalVerified,
      taskId: verify.payload.taskId,
      governedSessionId: verify.payload.governedSessionId,
      bootstrapReceiptId: verify.payload.bootstrapReceiptId,
      stateVersion: verify.payload.stateVersion,
      headSha: verify.payload.headSha,
      runtimeRevision: verify.payload.runtimeRevision,
      evidenceDigest: verify.payload.evidenceDigest
    }
  } as any, substrate);
  stage('DONE', done.status === 'READY'
    && done.effectPlan?.payload.status === 'DONE');

  const orderedStages = Object.freeze([
    'Intent', 'Identity', 'Repository', 'Project', 'Server', 'Runtime', 'Domain',
    'Governance', 'Capability', 'Task', 'Session', 'Locks', 'Development', 'CI',
    'Review', 'Merge', 'Deploy', 'Verify', 'DONE'
  ]);

  const bindingConsistent = Boolean(
    repository.payload.selectedRepository?.fullName === REPOSITORY
    && project.payload.selectedProject?.projectUid === PROJECT_UID
    && server.selectedServer?.serverId === SERVER_ID
    && runtime.bindings[0]?.repositoryId === REPOSITORY_ID
    && runtime.bindings[0]?.revision === HEAD
    && task.repository === REPOSITORY
    && task.ownerGovernedSessionId === SESSION_ID
    && task.observedHeadSha === HEAD
    && session.repository === REPOSITORY
    && session.governedSessionId === SESSION_ID
    && receipt.bootstrapReceiptId === RECEIPT_ID
    && locks.payload.grantedLocks[0]?.governedSessionId === SESSION_ID
    && development.effectPlan?.expectedHeadSha === HEAD
    && ci.payload.headSha === HEAD
    && premerge.payload.taskId === TASK_ID
    && premerge.payload.governedSessionId === SESSION_ID
    && premerge.payload.bootstrapReceiptId === RECEIPT_ID
    && premerge.payload.headSha === HEAD
    && merge.payload.headSha === HEAD
    && deploy.payload.headSha === HEAD
    && verify.payload.taskId === TASK_ID
    && verify.payload.governedSessionId === SESSION_ID
    && verify.payload.bootstrapReceiptId === RECEIPT_ID
    && verify.payload.headSha === HEAD
    && verify.payload.runtimeRevision === HEAD
    && done.effectPlan?.payload.taskId === TASK_ID
    && done.effectPlan?.payload.observedHeadSha === HEAD
    && done.effectPlan?.payload.runtimeRevision === HEAD
  );

  const mutationPlans = [development, reviewPlan, merge, done];
  const effectPlansOnly = mutationPlans.every((value: any) => (
    value.effectPlan !== null && value.mutationPerformed === false
  ));
  const status = stages.length === orderedStages.length
    && stages.every((entry) => entry.status === 'PASS')
    && bindingConsistent
    && effectPlansOnly
      ? 'PASS' as const
      : 'FAIL' as const;

  return Object.freeze({
    status,
    orderedStages,
    stages: Object.freeze(stages),
    bindingConsistent,
    finalTaskStatus: done.status === 'READY' ? 'DONE' as const : null,
    executionMode: 'TEST_SHADOW_ISOLATED' as const,
    mutationPerformed: false as const,
    liveMutationDispatched: false as const,
    effectPlansOnly
  });
}

export async function runFullCandidateNegativeMatrix() {
  const substrate = await canonicalContractSubstrate();
  const HEAD = '8'.repeat(40);
  const OTHER_HEAD = '9'.repeat(40);
  const SESSION_ID = '11111111-1111-4111-8111-111111111111';
  const RECEIPT_ID = '22222222-2222-4222-8222-222222222222';
  const requiredClasses = Object.freeze([
    'UNKNOWN',
    'AMBIGUOUS',
    'STALE',
    'CONFLICT',
    'DUPLICATE',
    'DENIED',
    'CI_FAILURE',
    'HEAD_DRIFT',
    'REVIEW_REJECTION',
    'DEPLOY_FAILURE',
    'RUNTIME_DRIFT',
    'DOCS_DRIFT',
    'STALE_RECEIPT',
    'RECONNECT',
    'CONCURRENT_AGENTS'
  ] as const);
  type CaseStatus = 'FAIL_CLOSED' | 'RECOVERY_EDGE';
  const cases: Array<Readonly<{
    negativeClass: typeof requiredClasses[number];
    status: CaseStatus;
    safe: boolean;
    evidence: Readonly<Record<string, unknown>>;
  }>> = [];
  const push = (
    negativeClass: typeof requiredClasses[number],
    status: CaseStatus,
    safe: boolean,
    evidence: Record<string, unknown>
  ) => cases.push(Object.freeze({
    negativeClass,
    status,
    safe,
    evidence: Object.freeze(evidence)
  }));

  const baseProject: any = {
    status: 'RESOLVED',
    observedAt: NOW,
    repositoryId: 'github:ExampleOrg/api',
    selectedMapping: {
      mappingId: 'example-api',
      repositoryId: 'github:ExampleOrg/api',
      projectId: 'example.platform',
      projectUid: 'EXAMPLE-001',
      componentRole: 'API'
    },
    selectedProject: {
      projectId: 'example.platform',
      projectUid: 'EXAMPLE-001',
      name: 'Example Platform',
      kind: 'MULTI_REPOSITORY_APPLICATION'
    },
    candidates: [{ mappingId: 'example-api', projectId: 'example.platform' }],
    candidateCount: 1,
    freshness: 'CURRENT',
    provenance: ['phase-f-negative'],
    reasonCodes: [],
    registryDigest: 'b'.repeat(64),
    candidateDigest: 'c'.repeat(64)
  };
  const baseServer: any = {
    status: 'RESOLVED',
    observedAt: NOW,
    projectId: 'example.platform',
    selectedServer: { serverId: 's2', rawServerIds: ['s2'], environment: 'production', bindings: [] },
    candidates: [],
    candidateCount: 1,
    freshness: 'CURRENT',
    provenance: ['phase-f-negative'],
    reasonCodes: [],
    registryDigest: 'b'.repeat(64),
    candidateDigest: 'c'.repeat(64),
    projectMappingId: 'example-api',
    canonicalServerIds: ['s1', 's2'],
    authorizationInferred: false,
    mutationPerformed: false,
    sshMutationPerformed: false
  };
  const domainRegistry = {
    available: true,
    freshness: 'CURRENT' as const,
    digest: 'b'.repeat(64),
    candidateDigest: 'c'.repeat(64),
    projects: [{
      projectId: 'example.platform',
      publicDomain: 'api.example.com',
      publicApi: 'https://api.example.com/v1',
      historicalVhosts: []
    }],
    mappings: [{
      mappingId: 'example-api',
      repositoryId: 'github:ExampleOrg/api',
      projectId: 'example.platform',
      componentRole: 'API',
      serverId: 's2',
      domain: 'api.example.com',
      domainVerified: true
    }]
  };

  const unknown = resolveDomain({
    project: baseProject,
    server: baseServer,
    registry: domainRegistry,
    observation: {
      available: false,
      freshness: 'UNKNOWN',
      observedAt: NOW,
      serverId: 's2',
      domains: []
    },
    observedAt: NOW
  } as any);
  push('UNKNOWN', 'FAIL_CLOSED',
    unknown.status === 'UNVERIFIED' && unknown.mutationPerformed === false,
    { status: unknown.status, reasonCodes: unknown.reasonCodes });

  const ambiguous = resolveServer({
    project: baseProject,
    registry: {
      available: true,
      freshness: 'CURRENT',
      digest: 'b'.repeat(64),
      candidateDigest: 'c'.repeat(64),
      mappings: [
        {
          mappingId: 'example-api',
          repositoryId: 'github:ExampleOrg/api',
          projectId: 'example.platform',
          projectUid: 'EXAMPLE-001',
          componentRole: 'API',
          serverId: 's1',
          serverPath: '/srv/example/api-s1',
          realPath: null,
          realPathVerified: false,
          environment: 'production'
        },
        {
          mappingId: 'example-api',
          repositoryId: 'github:ExampleOrg/api',
          projectId: 'example.platform',
          projectUid: 'EXAMPLE-001',
          componentRole: 'API',
          serverId: 's2',
          serverPath: '/srv/example/api-s2',
          realPath: null,
          realPathVerified: false,
          environment: 'production'
        }
      ]
    },
    canonicalServerIds: ['s1', 's2'],
    serverHint: null,
    observedAt: NOW
  } as any);
  push('AMBIGUOUS', 'FAIL_CLOSED',
    ambiguous.status === 'AMBIGUOUS' && ambiguous.mutationPerformed === false,
    { status: ambiguous.status, reasonCodes: ambiguous.reasonCodes });

  const stale = resolveDomain({
    project: baseProject,
    server: baseServer,
    registry: domainRegistry,
    observation: {
      available: true,
      freshness: 'STALE',
      observedAt: NOW,
      serverId: 's2',
      domains: [{ domain: 'api.example.com', verified: true, evidenceRef: 'phase-f:stale-domain' }]
    },
    observedAt: NOW
  } as any);
  push('STALE', 'FAIL_CLOSED',
    stale.status === 'UNVERIFIED' && stale.freshness === 'STALE',
    { status: stale.status, freshness: stale.freshness, reasonCodes: stale.reasonCodes });

  const conflict = observeGw44MainMergeCommit({
    repository: 'ExampleOrg/api',
    expectedMergeSha: HEAD,
    mainHeadSha: OTHER_HEAD,
    observedAt: NOW
  }, substrate);
  push('CONFLICT', 'FAIL_CLOSED',
    conflict.status === 'CONFLICT' && conflict.mutationPerformed === false,
    { status: conflict.status, reasonCodes: conflict.reasonCodes });

  const duplicate = discoverCandidateIntakeSources({
    registeredIntakes: [{
      intakeId: 'NEGATIVE-INTAKE-001',
      sequence: 1,
      status: 'RECEIVED',
      sourceType: 'chatgpt',
      sourceId: 'source-one',
      sourceDigest: 'a'.repeat(64),
      observedAt: NOW
    }],
    discoveredSources: [{
      sourceType: 'chatgpt',
      sourceId: 'source-one',
      sourceDigest: 'a'.repeat(64),
      observedAt: NOW
    }]
  });
  push('DUPLICATE', 'FAIL_CLOSED',
    duplicate.unseen.length === 0
      && duplicate.duplicateSourceIds.length === 1
      && duplicate.executesInstructions === false,
    { duplicateSourceIds: duplicate.duplicateSourceIds, executesInstructions: duplicate.executesInstructions });

  const deniedCapability = deriveCapabilityReality({
    toolName: 'mcp_transition_governed_task',
    registered: true,
    callability: { status: 'CALLABLE', source: 'SERVER' },
    authorized: { status: 'TRUE' },
    governanceSafe: true,
    observedAt: NOW,
    provenance: ['phase-f-negative']
  });
  const deniedDecision = deriveGovernanceDecision({
    operation: 'mcp_transition_governed_task',
    capabilityReality: deniedCapability,
    sessionPresent: true,
    bootstrapCurrent: true,
    lockConflicts: 0,
    githubWorkStateAvailable: true,
    requiresGithubWorkState: false,
    ownerMatches: false,
    dependenciesSatisfied: true,
    runtimeAligned: true,
    requiresRuntimeAlignment: false,
    requiredEvidence: [],
    observedAt: NOW
  } as any);
  const denied = composeGovernanceInheritance({
    target: { targetId: 'EXAMPLE-001', repositoryId: 'ExampleOrg/api', componentId: 'example-api' },
    capabilityReality: deniedCapability,
    governanceDecision: deniedDecision,
    observedAt: NOW
  } as any);
  push('DENIED', 'FAIL_CLOSED',
    denied.status === 'BLOCKED' && denied.mayExecute === false && denied.mutationPerformed === false,
    { status: denied.status, reasonCodes: denied.reasonCodes });

  const ciFailure = observeGw45MainCi({
    expectedHeadSha: HEAD,
    ci: {
      runId: 1501,
      workflow: 'MCP CI',
      event: 'push',
      headSha: HEAD,
      status: 'completed',
      conclusion: 'failure',
      observedAt: NOW
    }
  }, substrate);
  push('CI_FAILURE', 'FAIL_CLOSED',
    ciFailure.status === 'BLOCKED' && ciFailure.mutationPerformed === false,
    { status: ciFailure.status, reasonCodes: ciFailure.reasonCodes });

  const headDrift = observeGw35ExactDiffReview({
    expectedHeadSha: HEAD,
    evidence: {
      observedAt: NOW,
      headSha: OTHER_HEAD,
      baseSha: '1'.repeat(40),
      changedFiles: ['src/example.ts'],
      additions: 1,
      deletions: 0,
      truncated: false
    }
  }, substrate);
  push('HEAD_DRIFT', 'FAIL_CLOSED',
    headDrift.status === 'CONFLICT' && headDrift.mutationPerformed === false,
    { status: headDrift.status, reasonCodes: headDrift.reasonCodes });

  const reviewRejected = planGw38PrReady({
    repository: 'ExampleOrg/api',
    pullRequestNumber: 196,
    expectedHeadSha: HEAD,
    review: {
      headSha: HEAD,
      exactHead: true,
      blockingFindings: 1,
      unresolvedRequiredThreads: 0
    }
  }, substrate);
  push('REVIEW_REJECTION', 'FAIL_CLOSED',
    reviewRejected.status === 'BLOCKED'
      && reviewRejected.effectPlan === null
      && reviewRejected.mutationPerformed === false,
    { status: reviewRejected.status, reasonCodes: reviewRejected.reasonCodes });

  const successfulMainCi = observeGw45MainCi({
    expectedHeadSha: HEAD,
    ci: {
      runId: 1502,
      workflow: 'MCP CI',
      event: 'push',
      headSha: HEAD,
      status: 'completed',
      conclusion: 'success',
      observedAt: NOW
    }
  }, substrate);
  const deployFailure = observeGw46GovernedAutodeploy({
    expectedHeadSha: HEAD,
    ciProof: successfulMainCi,
    deploy: {
      runId: 2502,
      jobId: 'candidate-deploy-2502-bbbbbbbbbbbb',
      workflow: 'MCP Governed Deploy',
      event: 'push',
      headSha: HEAD,
      status: 'completed',
      conclusion: 'failure',
      observedAt: NOW
    }
  }, substrate);
  push('DEPLOY_FAILURE', 'FAIL_CLOSED',
    deployFailure.status === 'BLOCKED' && deployFailure.mutationPerformed === false,
    { status: deployFailure.status, reasonCodes: deployFailure.reasonCodes });

  const runtimeDrift = evaluateGw68TerminalVerification({
    taskId: 'TASK-20260919-903',
    taskStatus: 'VERIFYING',
    governedSessionId: SESSION_ID,
    bootstrapReceiptId: RECEIPT_ID,
    receiptStateVersion: 500,
    expectedHeadSha: HEAD,
    expectedRuntimeRevision: HEAD,
    liveState: {
      stateVersion: 500,
      freshness: 'CURRENT',
      ageSeconds: 5,
      maxAgeSeconds: 60,
      githubHead: HEAD,
      s1Head: HEAD,
      runtimeRevision: OTHER_HEAD,
      globalAlignment: 'DRIFT',
      documentationStatus: 'ALIGNED',
      documentationDrift: false,
      contradictions: ['RUNTIME_REVISION_MISMATCH'],
      observedAt: NOW
    },
    documentation: {
      status: 'ALIGNED',
      drift: false,
      observedAt: NOW,
      trackedHeadSha: HEAD
    },
    terminalEvidence: {
      task: {
        taskId: 'TASK-20260919-903',
        taskRevision: 31,
        status: 'VERIFYING',
        ownerGovernedSessionId: SESSION_ID,
        observedHeadSha: HEAD,
        runtimeRevision: HEAD
      },
      receipt: { bootstrapReceiptId: RECEIPT_ID, stateVersion: 500, runtimeRevision: HEAD },
      ci: { runId: 1502, headSha: HEAD, conclusion: 'success' },
      deployment: {
        jobId: 'candidate-deploy-2502-bbbbbbbbbbbb',
        ciRunId: 1502,
        headSha: HEAD,
        runtimeRevision: HEAD,
        result: 'succeeded'
      },
      review: { pullRequestNumber: 196, headSha: HEAD, approved: true, unresolvedThreads: 0 },
      locks: { ownActiveLockCount: 1, foreignConflictingLockCount: 0 }
    }
  } as any, substrate);
  push('RUNTIME_DRIFT', 'FAIL_CLOSED',
    runtimeDrift.status === 'BLOCKED' && runtimeDrift.mutationPerformed === false,
    { status: runtimeDrift.status, reasonCodes: runtimeDrift.reasonCodes });

  const docsDrift = evaluateGw58DocumentationDrift({
    expectedHeadSha: HEAD,
    documentation: {
      status: 'DRIFT',
      drift: true,
      observedAt: NOW,
      trackedHeadSha: HEAD
    }
  }, substrate);
  push('DOCS_DRIFT', 'RECOVERY_EDGE',
    docsDrift.status === 'SUCCESS'
      && docsDrift.payload.documentationRequired === true
      && docsDrift.payload.nextStepId === 'GW-59'
      && docsDrift.mutationPerformed === false,
    { status: docsDrift.status, nextStepId: docsDrift.payload.nextStepId });

  const staleReceipt = evaluateGw54ReceiptFreshness({
    receipt: {
      bootstrapReceiptId: RECEIPT_ID,
      stateVersion: 499,
      runtimeRevision: HEAD
    },
    liveState: {
      stateVersion: 500,
      generatedAt: NOW,
      lastReconciledAt: NOW,
      maxAgeSeconds: 60,
      freshness: 'CURRENT',
      ageSeconds: 5,
      githubHead: HEAD,
      s1Head: HEAD,
      runtimeRevision: HEAD,
      globalAlignment: 'FULLY_ALIGNED',
      contradictions: []
    }
  }, substrate);
  push('STALE_RECEIPT', 'RECOVERY_EDGE',
    staleReceipt.status === 'STALE'
      && staleReceipt.payload.nextStepId === 'GW-55'
      && staleReceipt.mutationPerformed === false,
    { status: staleReceipt.status, nextStepId: staleReceipt.payload.nextStepId });

  const reconnectSession: any = {
    schemaVersion: 1,
    governedSessionId: SESSION_ID,
    repository: 'ExampleOrg/api',
    taskScope: 'TASK-20260919-904',
    workBranch: 'phase-f/reconnect',
    agentIdentity: 'acceptance-agent',
    ownerPrincipalId: 'oauth:example-user',
    identityAssurance: 'oauth_subject',
    status: 'ACTIVE',
    createdAt: NOW,
    resumedAt: NOW,
    lastHeartbeatAt: NOW,
    pausedAt: null,
    expiredAt: null,
    closedAt: null,
    currentTransport: null,
    lastAcknowledgedStateVersion: 500,
    bootstrapReceipt: {
      schemaVersion: 1,
      bootstrapReceiptId: RECEIPT_ID,
      governedSessionId: SESSION_ID,
      agentIdentity: 'acceptance-agent',
      repository: 'ExampleOrg/api',
      governedBranch: 'phase-f/reconnect',
      stateVersion: 500,
      githubHead: HEAD,
      runtimeRevision: HEAD,
      catalogueDigest: 'b'.repeat(64),
      governanceDigest: 'c'.repeat(64),
      taskRegistryDigest: 'd'.repeat(64),
      createdAt: NOW,
      expiresAt: '2026-09-19T23:30:00.000Z',
      status: 'ACKNOWLEDGED',
      limitations: []
    },
    connectionContext: null,
    sessionRevision: 8,
    lastCheckpoint: null,
    blockers: [],
    nextAction: 'reobserve',
    lockIds: [],
    resumePolicy: 'stable_principal_or_resume_secret'
  };
  const reconnect = wrapGw16SessionOpenOrResume({
    status: 'RESUMED',
    session: reconnectSession
  } as any, substrate);
  push('RECONNECT', 'RECOVERY_EDGE',
    reconnect.status === 'RESUMED'
      && reconnect.mutationPerformed === false
      && JSON.stringify(reconnect).includes('resumeSecret') === false,
    { status: reconnect.status, authority: 'EXISTING_GOVERNED_SESSION' });

  const concurrent = dispatchCandidateWork({
    candidateSessionId: 'candidate-b',
    agentIdentity: 'agent-b',
    workItems: [{
      workItemId: 'GWC-PRE-F-NEGATIVE-01',
      intentKeys: ['negative'],
      title: 'Negative collision fixture',
      status: 'READY',
      priority: 1,
      sequence: 1,
      dependencies: [],
      collisionDomains: ['path:shared']
    }],
    activeClaims: [{
      candidateSessionId: 'candidate-a',
      agentIdentity: 'agent-a',
      workItemId: 'GWC-PRE-F-FOREIGN-01',
      collisionDomains: ['path:shared'],
      status: 'ACTIVE'
    }]
  });
  push('CONCURRENT_AGENTS', 'FAIL_CLOSED',
    concurrent.status === 'WAIT'
      && concurrent.reasonCode === 'candidate_collision_domains_busy'
      && concurrent.workItem === null,
    { status: concurrent.status, reasonCode: concurrent.reasonCode });

  const uniqueClasses = new Set(cases.map((entry) => entry.negativeClass));
  const status = (
    cases.length === requiredClasses.length
    && uniqueClasses.size === requiredClasses.length
    && requiredClasses.every((negativeClass) => uniqueClasses.has(negativeClass))
    && cases.every((entry) => entry.safe)
  ) ? 'PASS' as const : 'FAIL' as const;

  return Object.freeze({
    status,
    requiredClasses,
    cases: Object.freeze(cases),
    mutationPerformed: false as const,
    liveMutationDispatched: false as const
  });
}

export async function runCrossContextUniversalityAudit() {
  const substrate = await canonicalContractSubstrate();
  const scan = await scanGovernedHardcodes();
  const inputs = Object.freeze([
    Object.freeze({
      id: 'northstar-api',
      repository: 'NorthstarOrg/service-api',
      projectId: 'northstar.platform',
      projectUid: 'NORTHSTAR-001',
      componentId: 'northstar-api',
      serverId: 'edge-a',
      branch: 'feature/northstar',
      domain: 'api.northstar.example.test',
      headSha: '1'.repeat(40)
    }),
    Object.freeze({
      id: 'harbor-web',
      repository: 'HarborOrg/portal-web',
      projectId: 'harbor.portal',
      projectUid: 'HARBOR-002',
      componentId: 'harbor-web',
      serverId: 'node-b',
      branch: 'release/harbor',
      domain: 'portal.harbor.example.test',
      headSha: '2'.repeat(40)
    })
  ]);

  const contexts = inputs.map((input) => {
    const repositoryId = `github:${input.repository}`;
    const target = deriveTargetContext({
      project: {
        projectId: input.projectId,
        projectUid: input.projectUid,
        globalCheckpointRepositoryId: repositoryId,
        centralGovernanceRepositoryId: repositoryId,
        repositoryComponents: [{
          repositoryId,
          mappingId: input.componentId,
          role: 'API'
        }]
      },
      observations: [{
        mappingId: input.componentId,
        repositoryId,
        githubHead: input.headSha,
        runtimeRevision: input.headSha,
        freshness: 'CURRENT'
      }],
      observedAt: NOW
    });
    const scope = createTargetScope(target, [input.componentId]);
    const project = {
      status: 'RESOLVED',
      observedAt: NOW,
      repositoryId,
      selectedMapping: {
        mappingId: input.componentId,
        repositoryId,
        projectId: input.projectId,
        projectUid: input.projectUid,
        componentRole: 'API'
      },
      selectedProject: {
        projectId: input.projectId,
        projectUid: input.projectUid,
        name: input.projectUid,
        kind: 'MULTI_REPOSITORY_APPLICATION'
      },
      candidates: [{ mappingId: input.componentId, projectId: input.projectId }],
      candidateCount: 1,
      freshness: 'CURRENT',
      provenance: [`phase-f04:${input.id}`],
      reasonCodes: [],
      registryDigest: 'b'.repeat(64),
      candidateDigest: 'c'.repeat(64)
    } as any;

    const server = resolveServer({
      project,
      registry: {
        available: true,
        freshness: 'CURRENT',
        digest: 'b'.repeat(64),
        candidateDigest: 'c'.repeat(64),
        mappings: [{
          mappingId: input.componentId,
          repositoryId,
          projectId: input.projectId,
          projectUid: input.projectUid,
          componentRole: 'API',
          serverId: input.serverId,
          serverPath: `/srv/${input.componentId}`,
          realPath: `/srv/${input.componentId}`,
          realPathVerified: true,
          environment: 'production'
        }]
      },
      canonicalServerIds: [input.serverId],
      serverHint: null,
      observedAt: NOW
    } as any);

    const domain = resolveDomain({
      project,
      server,
      registry: {
        available: true,
        freshness: 'CURRENT',
        digest: 'b'.repeat(64),
        candidateDigest: 'c'.repeat(64),
        projects: [{
          projectId: input.projectId,
          publicDomain: null,
          publicApi: null,
          historicalVhosts: []
        }],
        mappings: [{
          mappingId: input.componentId,
          repositoryId,
          projectId: input.projectId,
          componentRole: 'API',
          serverId: input.serverId,
          domain: input.domain,
          domainVerified: true
        }]
      },
      observation: {
        available: true,
        freshness: 'CURRENT',
        observedAt: NOW,
        serverId: input.serverId,
        domains: [{
          domain: input.domain,
          verified: true,
          evidenceRef: `phase-f04:${input.id}:domain`
        }]
      },
      observedAt: NOW
    } as any);

    const branchPlan = planGw24BranchCreation({
      repository: input.repository,
      branch: input.branch,
      baseSha: input.headSha,
      branchPolicyAllowed: true,
      declaration: {
        declaredAt: NOW,
        summary: `phase f04 parameterization audit for ${input.id}`,
        changeDigest: input.id === 'northstar-api' ? 'd'.repeat(64) : 'e'.repeat(64)
      }
    }, substrate);

    const repositoryParameterPreserved = Boolean(
      target.components[0]?.repositoryId === repositoryId
      && scope.components[0]?.repositoryId === repositoryId
      && branchPlan.effectPlan?.repository === input.repository
    );
    const projectParameterPreserved = Boolean(
      target.projectId === input.projectId
      && target.projectUid === input.projectUid
      && scope.projectId === input.projectId
      && scope.projectUid === input.projectUid
    );
    const serverParameterPreserved = Boolean(
      server.status === 'RESOLVED'
      && server.selectedServer?.serverId === input.serverId
      && server.projectId === input.projectId
    );
    const branchParameterPreserved = Boolean(
      branchPlan.status === 'READY'
      && branchPlan.effectPlan?.branch === input.branch
      && branchPlan.effectPlan?.expectedHeadSha === input.headSha
    );
    const domainParameterPreserved = Boolean(
      domain.status === 'RESOLVED'
      && domain.serverId === input.serverId
      && domain.projectId === input.projectId
      && domain.surface.some((entry) => entry.domain === input.domain)
    );
    const status = (
      target.status === 'RESOLVED'
      && repositoryParameterPreserved
      && projectParameterPreserved
      && serverParameterPreserved
      && branchParameterPreserved
      && domainParameterPreserved
    ) ? 'PASS' as const : 'FAIL' as const;

    return Object.freeze({
      id: input.id,
      status,
      repository: input.repository,
      projectUid: input.projectUid,
      serverId: input.serverId,
      branch: input.branch,
      domain: input.domain,
      repositoryParameterPreserved,
      projectParameterPreserved,
      serverParameterPreserved,
      branchParameterPreserved,
      domainParameterPreserved
    });
  });

  const contextViolations = contexts
    .filter((entry) => entry.status !== 'PASS')
    .map((entry) => Object.freeze({
      path: `phase-f04-context:${entry.id}`,
      literal: 'PARAMETERIZATION_FAILURE'
    }));
  const violations = Object.freeze([
    ...scan.violations,
    ...contextViolations
  ]);
  const status = violations.length === 0
    && contexts.every((entry) => entry.status === 'PASS')
      ? 'PASS' as const
      : 'FAIL' as const;

  return Object.freeze({
    status,
    forbiddenHardDependencies: Object.freeze([...PHASE_F_FORBIDDEN_HARD_DEPENDENCIES]),
    violations,
    contexts: Object.freeze(contexts),
    mutationPerformed: false as const,
    liveMutationDispatched: false as const
  });
}

export async function runUniversalAcceptance(
  options: RunOptions = {}
): Promise<UniversalAcceptanceReport> {
  const scan = await scanGovernedHardcodes();
  const scenarios: UniversalAcceptanceScenario[] = [
    await contractPositionScenario(),
    mcpHistoricalScenario(scan.violations),
    stablecoinScenario(),
    multiComponentScenario(),
    partialComponentScenario(),
    await recoveryScenario(),
    await antiHardcodeScenario(scan)
  ];

  const forced = options.forceScenarioFailure;
  const adjusted = scenarios.map((scenario) => (
    forced === scenario.scenarioId
      ? Object.freeze({
          ...scenario,
          status: 'FAIL' as const,
          reasonCode: 'FORCED_ACCEPTANCE_FAILURE'
        })
      : scenario
  ));
  const status: UniversalAcceptanceReport['status'] = adjusted.length === 0
    ? 'UNVERIFIED'
    : adjusted.every((scenario) => scenario.status === 'PASS')
      ? 'ACCEPTED'
      : 'FAILED';
  const failedContracts = [...new Set(
    adjusted
      .filter((scenario) => scenario.status === 'FAIL')
      .flatMap((scenario) => scenario.contractsExercised)
  )].sort();

  return Object.freeze({
    stepId: 'GW-73',
    status,
    scenarios: Object.freeze(adjusted),
    failedContracts: Object.freeze(failedContracts),
    authorizationInferred: false as const,
    mutationPerformed: false as const
  });
}
