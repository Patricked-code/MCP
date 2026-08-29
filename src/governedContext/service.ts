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
    cache: { status: 'MISS', observedAt: at, provenance: 'memory_cache' },
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
    const generatedAt = now().toISOString();
    const limitations: string[] = [];
    if (explicit) {
      await audit.record({
        type: 'reconcile.requested',
        governedSessionId: input.governedSessionId,
        stateVersion: null
      });
    }
    const liveState = await safeRead(
      () => explicit
        ? options.liveState.reconcileNow()
        : options.liveState.getCurrent(),
      null
    );
    if (!liveState) limitations.push('live_state_unavailable');
    else if (liveState.freshness === 'STALE') limitations.push('live_state_stale');

    let session: PublicGovernedSession | null = null;
    if (input.governedSessionId) {
      session = await safeRead(
        () => options.sessions.getVisibleSession(
          input.governedSessionId!,
          input.request
        ),
        null
      );
    }
    if (!session) limitations.push('session_unbound');

    const currentState = options.currentState
      ? await safeRead(() => options.currentState!.getInventory(input.request), null)
      : null;
    if (options.currentState && !currentState) limitations.push('current_state_inventory_unavailable');

    const receipt = session?.bootstrapReceipt ?? null;
    let bootstrapStatus: GovernedOperationalContext['bootstrap']['status'] = 'MISSING';
    if (receipt) {
      if (Date.parse(receipt.expiresAt) <= now().getTime()) bootstrapStatus = 'EXPIRED';
      else if (!liveState || receipt.stateVersion !== liveState.stateVersion
        || session?.lastAcknowledgedStateVersion !== liveState.stateVersion) bootstrapStatus = 'STALE';
      else bootstrapStatus = 'CURRENT';
    }
    if (bootstrapStatus !== 'CURRENT') limitations.push(`bootstrap_${bootstrapStatus.toLowerCase()}`);

    const rawLocks = await safeRead(
      () => options.locks.listActiveLocks(),
      null
    );
    if (!rawLocks) limitations.push('locks_unavailable');
    const activeLocks: PublicGovernedLock[] = (rawLocks ?? []).slice(0, 100);
    const workBranch = session?.workBranch ?? input.workBranch;
    const github = await safeRead(
      () => explicit
        ? options.github.reconcileExplicit(workBranch)
        : options.github.getCurrent(workBranch),
      fallbackGithub(generatedAt, workBranch)
    );
    if (github.status !== 'CURRENT') {
      limitations.push(github.error ?? 'github_context_degraded');
    }

    const foreignLock = activeLocks.some((lock) => (
      lock.status === 'ACTIVE'
      && lock.governedSessionId !== session?.governedSessionId
    ));
    const freshness: GovernedOperationalContext['freshness'] = (
      !liveState || github.status !== 'CURRENT' || liveState.alignment.global === 'DEGRADED'
    ) ? 'DEGRADED' : liveState.freshness === 'STALE' ? 'STALE' : 'CURRENT';
    const decision: GovernedOperationalContext['gate']['decision'] = options.gateMode === 'off'
      ? 'read_only'
      : !session
        ? 'session_unbound'
        : liveState && session.lastAcknowledgedStateVersion !== liveState.stateVersion
          ? 'context_unacknowledged'
          : foreignLock
            ? 'lock_conflict'
            : 'shadow_observed';
    const blockers = [...new Set([
      ...(liveState?.contradictions ?? []),
      ...(session?.blockers ?? [])
    ])].slice(0, 40);
    const runtimeRealtimeAvailable = Boolean(
      liveState?.runtime.status === 'CURRENT'
      && liveState.runtime.containerStatus === 'running'
      && liveState.runtime.health === 'healthy'
    );
    if (!runtimeRealtimeAvailable) limitations.push('runtime_realtime_unavailable');

    const context: GovernedOperationalContext = {
      schemaVersion: 1,
      generatedAt,
      freshness,
      repository: 'Patricked-code/MCP',
      governedBranch: 'main',
      liveState,
      github,
      session,
      bootstrap: {
        required: true,
        status: bootstrapStatus,
        receipt,
        limitations: receipt?.limitations ?? []
      },
      currentState: {
        catalogueDigest: currentState?.source.catalogueDigest ?? liveState?.capabilities?.catalogueDigest ?? null,
        inventoryDigest: currentState?.source.inventoryDigest ?? liveState?.inventory?.sourceDigest ?? null,
        governanceDigest: currentState?.governance?.digest ?? liveState?.governance?.digest ?? null,
        auditBaselineValid: currentState?.auditBaseline?.valid ?? liveState?.auditBaseline?.valid ?? null
      },
      workQueue: {
        storeRevision: currentState?.workQueue.storeRevision ?? null,
        total: currentState?.workQueue.tasks.length ?? 0,
        byStatus: Object.fromEntries(Object.entries(
          (currentState?.workQueue.tasks ?? []).reduce<Record<string, number>>((counts, task) => {
            counts[task.status] = (counts[task.status] ?? 0) + 1;
            return counts;
          }, {})
        ).sort(([left], [right]) => left.localeCompare(right)))
      },
      currentTask: currentState?.currentTask ?? null,
      firstExecutableTask: currentState?.firstExecutableTask ?? null,
      activeLocks,
      lastCheckpoint: session?.lastCheckpoint ?? null,
      blockers,
      nextAction: nextAction(
        liveState, session, bootstrapStatus,
        currentState?.currentTask ?? null,
        currentState?.firstExecutableTask ?? null,
        github, foreignLock
      ),
      gate: {
        mode: options.gateMode,
        existingWriteToolsEnabled: options.existingWriteToolsEnabled,
        decision
      },
      proof: {
        identityAssurance: session?.identityAssurance ?? null,
        runtimeRealtimeAvailable,
        limitations: [...new Set(limitations)].slice(0, 20)
      }
    };
    await audit.record({ type: 'context.read', context });
    if (explicit) {
      await audit.record({
        type: 'reconcile.completed',
        governedSessionId: input.governedSessionId,
        context,
        previousStateVersion: null
      });
    }
    return context;
  }

  return {
    getCurrent: (input) => compose(input, false),
    reconcileExplicit: (input) => compose(input, true)
  };
}
