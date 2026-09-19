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
import { parseRecoveryAnchor } from '../../src/governedWorkflow/executionEngine.js';
import { resolveDomain } from '../../src/governedWorkflow/resolvers/domain.js';
import { resolveRuntime } from '../../src/governedWorkflow/resolvers/runtime.js';
import { evaluateGw68TerminalVerification } from '../../src/governedWorkflow/terminal/index.js';
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
  evidence: Readonly<Record<string, unknown>>;
}>;

export type UniversalAcceptanceReport = Readonly<{
  stepId: 'GW-73';
  status: 'ACCEPTED' | 'FAILED' | 'UNVERIFIED';
  scenarios: readonly UniversalAcceptanceScenario[];
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

const FORBIDDEN_GOVERNED_LITERALS = [
  'Patricked-code/MCP',
  'Patricked-code/Stablecoin',
  'stablecoin.chainsolutions.fr',
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

async function scanGovernedHardcodes() {
  const files = await governedSourceFiles();
  const violations: Array<{ path: string; literal: string }> = [];
  for (const file of files) {
    const source = await readFile(file, 'utf8');
    for (const literal of FORBIDDEN_GOVERNED_LITERALS) {
      if (source.includes(literal)) violations.push({ path: file, literal });
    }
  }
  return Object.freeze({
    files: Object.freeze(files),
    violations: Object.freeze(violations)
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

function recoveryScenario(): UniversalAcceptanceScenario {
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
  } as any, {
    resolve(stepId: string) {
      return stepId === 'GW-68' ? { stepId: 'GW-68', contractVersion: 1 } : null;
    },
    contractRegistryDigest: 'f'.repeat(64),
    graphRegistryDigest: 'd'.repeat(64)
  } as any);

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
    recoveryScenario(),
    await antiHardcodeScenario(scan)
  ];

  const forced = options.forceScenarioFailure;
  const adjusted = scenarios.map((scenario) => (
    forced === scenario.scenarioId
      ? Object.freeze({ ...scenario, status: 'FAIL' as const })
      : scenario
  ));
  const status: UniversalAcceptanceReport['status'] = adjusted.length === 0
    ? 'UNVERIFIED'
    : adjusted.every((scenario) => scenario.status === 'PASS')
      ? 'ACCEPTED'
      : 'FAILED';

  return Object.freeze({
    stepId: 'GW-73',
    status,
    scenarios: Object.freeze(adjusted),
    authorizationInferred: false as const,
    mutationPerformed: false as const
  });
}
