import type { LiveStateEngine } from '../liveState/engine.js';
import type { LiveStateSnapshot } from '../liveState/types.js';
import type { GovernedLockService } from '../operationalMemory/lockService.js';
import {
  NOOP_OPERATIONAL_AUDIT,
  type OperationalAudit
} from '../operationalMemory/operationalAudit.js';
import type {
  GovernedSessionService,
  SessionRequest
} from '../operationalMemory/sessionService.js';
import type {
  GithubOperationalContext,
  GovernedOperationalContext,
  PublicGovernedLock,
  PublicGovernedSession
} from './types.js';
import type { CurrentStateInventory, CurrentStateService } from '../currentState/service.js';

export type GovernedContextInput = {
  governedSessionId: string | null;
  workBranch: string | null;
  request: SessionRequest;
};

type ContextServiceOptions = {
  liveState: Pick<LiveStateEngine, 'getCurrent'> & {
    reconcileNow(): Promise<LiveStateSnapshot | null>;
  };
  github: {
    getCurrent(workBranch: string | null): Promise<GithubOperationalContext>;
    collect?(workBranch: string | null): Promise<GithubOperationalContext>;
    reconcileExplicit(workBranch: string | null): Promise<GithubOperationalContext>;
  };
  sessions: Pick<GovernedSessionService, 'getVisibleSession'>;
  locks: Pick<GovernedLockService, 'listActiveLocks'>;
  gateMode: 'off' | 'shadow';
  existingWriteToolsEnabled: boolean;
  now?: () => Date;
  audit?: OperationalAudit;
  currentState?: Pick<CurrentStateService, 'getInventory'>;
};

export type GovernedOperationalContextService = {
  getCurrent(input: GovernedContextInput): Promise<GovernedOperationalContext>;
  reconcileExplicit(input: GovernedContextInput): Promise<GovernedOperationalContext>;
};

function fallbackGithub(at: string, workBranch: string | null): GithubOperationalContext {
  const unavailable = {
    freshness: 'UNAVAILABLE' as const,
    observedAt: at,
    provenance: 'memory_cache' as const
  };
  return {
    status: 'UNAVAILABLE',
    observedAt: at,
    mainHead: null,
    workBranch,
    workBranchHead: null,
    pullRequest: null,
    checks: {
      status: 'unavailable',
      conclusion: null,
      total: 0,
      failed: 0,
      headSha: null,
      exactHead: null,
      required: [],
      requiredSatisfied: null
    },
    reviews: { approvals: 0, changesRequested: 0, unresolvedThreads: null },
    ruleset: {
      name: null,
      enforcement: null,
      requiresPullRequest: null,
      requiredStatusChecks: [],
      requiresConversationResolution: null
    },
    ownership: { pullRequestAuthor: null },
    activity: { lastActivityAt: null },
    cache: {
      status: 'MISS',
      observedAt: at,
      provenance: 'memory_cache'
    },
    evidence: {
      main: unavailable,
      pullRequest: unavailable,
      checks: unavailable,
      reviews: unavailable,
      ruleset: unavailable
    },
    error: 'github_context_unavailable'
  };
}

function nextAction(
  liveState: LiveStateSnapshot | null,
  session: PublicGovernedSession | null,
  bootstrapStatus: GovernedOperationalContext['bootstrap']['status'],
  currentTask: CurrentStateInventory['currentTask'],
  firstExecutableTask: CurrentStateInventory['firstExecutableTask'],
  github: GithubOperationalContext,
  foreignLock: boolean
): string | null {
  if (liveState?.nextAction) return liveState.nextAction;
  if (!session) return 'mcp_open_governed_session';
  if (bootstrapStatus !== 'CURRENT') return 'mcp_acknowledge_governed_context';
  if (currentTask) return currentTask.nextAction ?? 'mcp_transition_governed_task';
  if (firstExecutableTask) return 'mcp_claim_next_governed_task';
  if (foreignLock) return 'wait_for_governed_lock';
  if (github.checks.failed > 0 || github.checks.conclusion === 'failure') {
    return 'resolve_github_checks';
  }
  if (
    github.reviews.changesRequested > 0
    || (github.reviews.unresolvedThreads ?? 0) > 0
  ) return 'address_github_review';
  if (['queued', 'in_progress'].includes(github.checks.status)) {
    return 'wait_for_github_checks';
  }
  return session.lastCheckpoint?.nextAction ?? null;
}

export function createGovernedOperationalContextService(
  options: ContextServiceOptions
): GovernedOperationalContextService {
  const now = options.now ?? (() => new Date());
  const audit = options.audit ?? NOOP_OPERATIONAL_AUDIT;

  async function safeRead<T>(work: () => T | Promise<T>, fallback: T): Promise<T> {
    try {
      return await work();
    } catch {
      return fallback;
    }
  }

  async function compose(
    input: GovernedContextInput,
    explicit: boolean
  ): Promise<GovernedOperationalContext> {
    const at = now().toISOString();
    const liveState = await safeRead(
      () => explicit ? options.liveState.reconcileNow() : options.liveState.getCurrent(),
      null
    );
    const session = input.governedSessionId
      ? await safeRead(
          () => options.sessions.getVisibleSession(input.governedSessionId!, input.request),
          null
        )
      : null;
    const workBranch = session?.workBranch ?? input.workBranch;
    const github = await safeRead(
      () => explicit
        ? options.github.reconcileExplicit(workBranch)
        : options.github.getCurrent(workBranch),
      fallbackGithub(at, workBranch)
    );
    const activeLocks = await safeRead(
      () => options.locks.listActiveLocks('Patricked-code/MCP'),
      [] as PublicGovernedLock[]
    );
    const currentState = options.currentState
      ? await safeRead(() => options.currentState!.getInventory(), null)
      : null;
    const bootstrapStatus: GovernedOperationalContext['bootstrap']['status'] = !session?.bootstrapReceipt
      ? 'MISSING'
      : session.bootstrapReceipt.status !== 'ACKNOWLEDGED'
        ? 'STALE'
        : Date.parse(session.bootstrapReceipt.expiresAt) <= Date.parse(at)
          ? 'EXPIRED'
          : session.bootstrapReceipt.stateVersion === liveState?.stateVersion
            ? 'CURRENT'
            : 'STALE';
    const currentTask = currentState?.currentTask ?? null;
    const firstExecutableTask = currentState?.firstExecutableTask ?? null;
    const foreignLock = activeLocks.some((lock) => lock.ownerGovernedSessionId !== session?.governedSessionId);
    const blockers = [
      ...(liveState?.contradictions ?? []),
      ...(session?.blockers ?? []),
      ...(github.error ? [github.error] : []),
      ...(foreignLock ? ['governed_lock_conflict'] : [])
    ];
    const context: GovernedOperationalContext = {
      schemaVersion: 1,
      generatedAt: at,
      freshness: !liveState || liveState.freshness.global !== 'CURRENT'
        ? 'DEGRADED'
        : github.status === 'UNAVAILABLE'
          ? 'DEGRADED'
          : 'CURRENT',
      repository: 'Patricked-code/MCP',
      governedBranch: 'main',
      liveState,
      github,
      session,
      bootstrap: {
        required: true,
        status: bootstrapStatus,
        receipt: session?.bootstrapReceipt ?? null,
        limitations: session?.bootstrapReceipt?.limitations ?? []
      },
      currentState: {
        catalogueDigest: currentState?.catalogue.catalogueDigest ?? null,
        inventoryDigest: currentState?.inventoryDigest ?? null,
        governanceDigest: liveState?.currentState?.governanceDigest ?? null,
        auditBaselineValid: currentState?.auditBaseline.valid ?? null
      },
      workQueue: {
        storeRevision: currentState?.taskRegistry.storeRevision ?? null,
        total: currentState?.taskRegistry.total ?? 0,
        byStatus: currentState?.taskRegistry.byStatus ?? {}
      },
      currentTask,
      firstExecutableTask,
      activeLocks,
      lastCheckpoint: session?.lastCheckpoint ?? null,
      blockers,
      nextAction: nextAction(
        liveState,
        session,
        bootstrapStatus,
        currentTask,
        firstExecutableTask,
        github,
        foreignLock
      ),
      gate: {
        mode: options.gateMode,
        existingWriteToolsEnabled: options.existingWriteToolsEnabled,
        decision: options.gateMode === 'off'
          ? 'read_only'
          : !session
            ? 'session_unbound'
            : bootstrapStatus !== 'CURRENT'
              ? 'context_unacknowledged'
              : foreignLock
                ? 'lock_conflict'
                : 'shadow_observed'
      },
      proof: {
        identityAssurance: session?.identityAssurance ?? null,
        runtimeRealtimeAvailable: liveState?.sources.runtime.status === 'CURRENT',
        limitations: [
          ...(github.status === 'UNAVAILABLE' ? ['github_operational_context_unavailable'] : []),
          ...(bootstrapStatus !== 'CURRENT' ? ['bootstrap_not_current'] : [])
        ]
      }
    };
    await audit.recordContextEvent(
      explicit ? 'context.reconciled' : 'context.loaded',
      {
        governedSessionId: session?.governedSessionId ?? input.governedSessionId,
        stateVersion: liveState?.stateVersion ?? null,
        freshness: context.freshness,
        githubStatus: github.status,
        bootstrapStatus,
        taskId: currentTask?.taskId ?? firstExecutableTask?.taskId ?? null,
        blockerCount: blockers.length
      }
    ).catch(() => undefined);
    return context;
  }

  return {
    getCurrent: (input) => compose(input, false),
    reconcileExplicit: (input) => compose(input, true)
  };
}
