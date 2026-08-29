import type { GovernedOperationalContext } from './types.js';

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function display(value: unknown, fallback = 'non disponible'): string {
  return escapeHtml(value ?? fallback);
}

export type GovernedObservabilityProjection = {
  capabilities: {
    total: number;
    callable: number;
    notCallable: number;
    unknown: number;
    authorizationFalse: number;
    authorizationUnknown: number;
    safeNowFalse: number;
  };
  taskRealityDrift: string | null;
  mayMutate: boolean | null;
  githubReasonCodes: string[];
  githubUncertainties: string[];
  governanceReasonCodes: string[];
  shadowMode: 'off' | 'shadow';
  shadowDecision: GovernedOperationalContext['gate']['decision'];
};

function boundedUnique(values: string[], limit = 20): string[] {
  return [...new Set(values)].slice(0, limit);
}

export function deriveGovernedObservability(
  context: GovernedOperationalContext
): GovernedObservabilityProjection {
  const capabilities = (context.capabilityReality ?? []).slice(0, 500);
  return {
    capabilities: {
      total: capabilities.length,
      callable: capabilities.filter((entry) => entry.callability.status === 'CALLABLE').length,
      notCallable: capabilities.filter((entry) => entry.callability.status === 'NOT_CALLABLE').length,
      unknown: capabilities.filter((entry) => entry.callability.status === 'UNKNOWN').length,
      authorizationFalse: capabilities.filter((entry) => entry.authorized.status === 'FALSE').length,
      authorizationUnknown: capabilities.filter((entry) => entry.authorized.status === 'UNKNOWN').length,
      safeNowFalse: capabilities.filter((entry) => entry.safeNow === false).length
    },
    taskRealityDrift: context.taskReality?.drift ?? null,
    mayMutate: context.governanceDecision?.mayMutate ?? null,
    githubReasonCodes: boundedUnique(context.github.reasonCodes ?? []),
    githubUncertainties: boundedUnique(context.github.uncertainties ?? []),
    governanceReasonCodes: boundedUnique(context.governanceDecision?.reasonCodes ?? []),
    shadowMode: context.gate.mode,
    shadowDecision: context.gate.decision
  };
}

export async function loadGovernedDashboardContext<T>(
  enabled: boolean,
  load: () => Promise<T>
): Promise<T | null> {
  return enabled ? load() : null;
}

export function renderGovernedContextDashboardDisabledSection(): string {
  return `<section aria-labelledby="governed-context-heading">
  <h2 id="governed-context-heading">MCP Governed Session Continuity</h2>
  <p>Mémoire opérationnelle gouvernée : <strong>désactivée</strong></p>
</section>`;
}

export function renderGovernedContextDashboardSection(
  context: GovernedOperationalContext,
  activeSessionCount = context.session && ['OPEN', 'ACTIVE', 'PAUSED'].includes(context.session.status)
    ? 1
    : 0
): string {
  const liveState = context.liveState;
  const task = context.currentTask?.taskId
    ?? context.session?.taskScope
    ?? liveState?.documentation.activeTask
    ?? null;
  const pullRequest = context.github.pullRequest;
  const observability = deriveGovernedObservability(context);
  const locks = context.activeLocks.length === 0
    ? '<li>Aucun lock actif.</li>'
    : context.activeLocks.slice(0, 100).map((lock) => (
      `<li><code>${display(lock.lockId)}</code> — ${display(lock.scope)} — expiration ${display(lock.expiresAt)}</li>`
    )).join('');
  const blockers = context.blockers.length === 0
    ? '<li>Aucun blocker déclaré.</li>'
    : context.blockers.slice(0, 40).map((blocker) => `<li>${display(blocker)}</li>`).join('');
  const queueStatuses = Object.entries(context.workQueue.byStatus).slice(0, 20);
  const queue = queueStatuses.length === 0
    ? '<li>Queue vide.</li>'
    : queueStatuses.map(([status, count]) => `<li>${display(status)} : ${display(count)}</li>`).join('');
  const bootstrapLimitations = context.bootstrap.limitations.length === 0
    ? '<li>Aucune limitation du receipt.</li>'
    : context.bootstrap.limitations.slice(0, 20).map((limitation) => `<li>${display(limitation)}</li>`).join('');
  const githubReasons = observability.githubReasonCodes.length === 0
    ? '<li>Aucun reasonCode GitHub.</li>'
    : observability.githubReasonCodes.map((reason) => `<li>${display(reason)}</li>`).join('');
  const githubUncertainties = observability.githubUncertainties.length === 0
    ? '<li>Aucune incertitude GitHub.</li>'
    : observability.githubUncertainties.map((reason) => `<li>${display(reason)}</li>`).join('');
  const governanceReasons = observability.governanceReasonCodes.length === 0
    ? '<li>Aucun reasonCode de gouvernance.</li>'
    : observability.governanceReasonCodes.map((reason) => `<li>${display(reason)}</li>`).join('');

  return `<section aria-labelledby="governed-context-heading">
  <h2 id="governed-context-heading">MCP Governed Session Continuity</h2>
  <p>Vue générée : <strong>${display(context.generatedAt)}</strong></p>
  <p>Fraîcheur composée : <strong>${display(context.freshness)}</strong></p>
  <p>Live State stateVersion : <strong>${display(liveState?.stateVersion)}</strong></p>
  <p>Live State freshness : <strong>${display(liveState?.freshness)}</strong></p>
  <p>Alignement global : <strong>${display(liveState?.alignment.global)}</strong></p>
  <p>Task : <strong>${display(task)}</strong></p>
  <p>Next action : <strong>${display(context.nextAction)}</strong></p>
  <p>Sessions actives globales : <strong>${activeSessionCount}</strong></p>
  <p>WRITE gate : <strong>${display(context.gate.mode)}</strong> — décision ${display(context.gate.decision)}</p>

  <h3>Bootstrap et Current State</h3>
  <p>Bootstrap : <strong>${display(context.bootstrap.status)}</strong> — receipt ${display(context.bootstrap.receipt?.bootstrapReceiptId)}</p>
  <p>Catalogue digest : <code>${display(context.currentState.catalogueDigest)}</code></p>
  <p>Inventory digest : <code>${display(context.currentState.inventoryDigest)}</code></p>
  <p>Governance digest : <code>${display(context.currentState.governanceDigest)}</code></p>
  <p>Audit baseline valide : <strong>${display(context.currentState.auditBaselineValid)}</strong></p>
  <ul>${bootstrapLimitations}</ul>

  <h3>Queue (${display(context.workQueue.total)})</h3>
  <p>Store revision : <strong>${display(context.workQueue.storeRevision)}</strong></p>
  <p>Tâche courante : <strong>${display(context.currentTask?.taskId)}</strong> — ${display(context.currentTask?.status)}</p>
  <p>Première exécutable : <strong>${display(context.firstExecutableTask?.taskId)}</strong></p>
  <ul>${queue}</ul>

  <h3>Locks actifs (${context.activeLocks.length})</h3>
  <ul>${locks}</ul>

  <h3>GitHub</h3>
  <p>${pullRequest ? `PR #${pullRequest.number} — ${display(pullRequest.state)}${pullRequest.draft ? ' — draft' : ''}` : 'Aucune PR associée.'}</p>
  <p>Checks : <strong>${display(context.github.checks.status)}</strong> / ${display(context.github.checks.conclusion)} — ${context.github.checks.failed} échec(s) sur ${context.github.checks.total}</p>
  <p>Approbations : <strong>${context.github.reviews.approvals}</strong> — changements demandés ${context.github.reviews.changesRequested} — fils non résolus ${display(context.github.reviews.unresolvedThreads)}</p>

  <h3>Capability Reality</h3>
  <p>Total : <strong>${observability.capabilities.total}</strong> — CALLABLE <strong>${observability.capabilities.callable}</strong> — NOT_CALLABLE <strong>${observability.capabilities.notCallable}</strong> — UNKNOWN <strong>${observability.capabilities.unknown}</strong></p>
  <p>Authorization FALSE : <strong>${observability.capabilities.authorizationFalse}</strong> — UNKNOWN : <strong>${observability.capabilities.authorizationUnknown}</strong> — safeNow=false : <strong>${observability.capabilities.safeNowFalse}</strong></p>
  <p>Task Reality drift : <strong>${display(observability.taskRealityDrift)}</strong></p>
  <p>mayMutate : <strong>${display(observability.mayMutate)}</strong></p>
  <p>Shadow : <strong>${display(observability.shadowMode)}</strong> — ${display(observability.shadowDecision)}</p>
  <h4>GitHub reasonCodes</h4>
  <ul>${githubReasons}</ul>
  <h4>GitHub uncertainties</h4>
  <ul>${githubUncertainties}</ul>
  <h4>Governance reasonCodes</h4>
  <ul>${governanceReasons}</ul>

  <h3>Blockers</h3>
  <ul>${blockers}</ul>
</section>`;
}
