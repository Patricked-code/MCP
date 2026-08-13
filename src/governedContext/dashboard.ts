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
  const task = context.session?.taskScope
    ?? liveState?.documentation.activeTask
    ?? null;
  const pullRequest = context.github.pullRequest;
  const locks = context.activeLocks.length === 0
    ? '<li>Aucun lock actif.</li>'
    : context.activeLocks.map((lock) => (
      `<li><code>${display(lock.lockId)}</code> — ${display(lock.scope)} — expiration ${display(lock.expiresAt)}</li>`
    )).join('');
  const blockers = context.blockers.length === 0
    ? '<li>Aucun blocker déclaré.</li>'
    : context.blockers.map((blocker) => `<li>${display(blocker)}</li>`).join('');

  return `<section aria-labelledby="governed-context-heading">
  <h2 id="governed-context-heading">MCP Governed Session Continuity</h2>
  <p>Vue générée : <strong>${display(context.generatedAt)}</strong></p>
  <p>Fraîcheur composée : <strong>${display(context.freshness)}</strong></p>
  <p>Live State stateVersion : <strong>${display(liveState?.stateVersion)}</strong></p>
  <p>Live State freshness : <strong>${display(liveState?.freshness)}</strong></p>
  <p>Alignement global : <strong>${display(liveState?.alignment.global)}</strong></p>
  <p>Task : <strong>${display(task)}</strong></p>
  <p>Next action : <strong>${display(context.nextAction)}</strong></p>
  <p>Sessions actives compatibles : <strong>${activeSessionCount}</strong></p>
  <p>WRITE gate : <strong>${display(context.gate.mode)}</strong> — décision ${display(context.gate.decision)}</p>

  <h3>Locks actifs (${context.activeLocks.length})</h3>
  <ul>${locks}</ul>

  <h3>GitHub</h3>
  <p>${pullRequest ? `PR #${pullRequest.number} — ${display(pullRequest.state)}${pullRequest.draft ? ' — draft' : ''}` : 'Aucune PR associée.'}</p>
  <p>Checks : <strong>${display(context.github.checks.status)}</strong> / ${display(context.github.checks.conclusion)} — ${context.github.checks.failed} échec(s) sur ${context.github.checks.total}</p>
  <p>Approbations : <strong>${context.github.reviews.approvals}</strong> — changements demandés ${context.github.reviews.changesRequested} — fils non résolus ${display(context.github.reviews.unresolvedThreads)}</p>

  <h3>Blockers</h3>
  <ul>${blockers}</ul>
</section>`;
}
