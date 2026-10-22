import express from 'express';
import type { Router } from 'express';
import type { GithubOidcClaims } from '../deploy/githubOidc.js';
import type { GovernedSessionService, SessionRequest } from '../operationalMemory/sessionService.js';
import type { GovernedTaskQueue } from '../operationalMemory/taskQueue.js';
import type { TaskLifecycleCoordinator } from '../operationalMemory/taskLifecycleCoordinator.js';
import type { GovernedSessionPublicRecord } from '../operationalMemory/types.js';

const SHA = /^[0-9a-f]{40}$/;
const TASK_ID = /^TASK-[0-9]{8}-[0-9]{3,}$/;
const MAX_BEARER = 16_384;
const CLAIM_SCOPE = 'TASK-20260929-001';
export const GOVERNED_TASK_CLAIM_PATH = '/governance/github/task-claim';

export interface GovernedTaskClaimRouteDependencies {
  verifyOidc: (token: string, sha: string) => Promise<GithubOidcClaims>;
  sessions: Pick<GovernedSessionService, 'listVisibleSessions'>;
  queue: Pick<GovernedTaskQueue, 'listVisibleTasks' | 'claimTaskById'>;
  lifecycle: TaskLifecycleCoordinator;
  ready: () => Promise<unknown>;
  currentState: () => Promise<{ stateVersion: number } | null>;
  writeEnabled: () => boolean;
  /** Resolve a preexisting oauth principal from server-controlled authorization state, not claims supplied by the caller. */
  resolveAuthorizedPrincipal: (claims: GithubOidcClaims) => Promise<string | null>;
  now?: () => Date;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function parseBody(body: unknown): { sha: string; taskId: string } | null {
  if (!isRecord(body) || Object.keys(body).sort().join(',') !== 'sha,taskId') return null;
  if (typeof body.sha !== 'string' || !SHA.test(body.sha)) return null;
  if (typeof body.taskId !== 'string' || !TASK_ID.test(body.taskId)) return null;
  return { sha: body.sha, taskId: body.taskId };
}

function bearer(header: unknown): string | null {
  if (typeof header !== 'string' || !header.startsWith('Bearer ')) return null;
  const token = header.slice(7);
  return token && !token.includes(' ') && Buffer.byteLength(token, 'utf8') <= MAX_BEARER
    ? token : null;
}

function sessionEligible(session: GovernedSessionPublicRecord, now: Date): boolean {
  const receipt = session.bootstrapReceipt;
  return session.status === 'ACTIVE'
    && session.identityAssurance === 'oauth_subject'
    && session.repository === 'Patricked-code/MCP'
    && receipt?.status === 'ACKNOWLEDGED'
    && receipt.governedSessionId === session.governedSessionId
    && receipt.agentIdentity === session.agentIdentity
    && receipt.repository === session.repository
    && Date.parse(receipt.expiresAt) > now.getTime()
    && !session.blockers.length;
}

/**
 * Fail-closed OIDC admission. Never accept a session ID, principal, TargetScope,
 * bootstrap receipt, task revision or lock hint from the HTTP caller.
 */
export function createGithubGovernedTaskClaimRouter(deps: GovernedTaskClaimRouteDependencies): Router {
  const router = express.Router();
  router.post(GOVERNED_TASK_CLAIM_PATH, express.json({ limit: '2kb' }), async (req, res) => {
    const input = parseBody(req.body);
    const token = bearer(req.headers.authorization);
    if (!input || !token || input.taskId !== CLAIM_SCOPE) {
      res.status(400).json({ error: 'governed_claim_request_invalid' });
      return;
    }
    if (!deps.writeEnabled()) {
      res.status(503).json({ error: 'governed_claim_write_disabled' });
      return;
    }

    let claims: GithubOidcClaims;
    try {
      claims = await deps.verifyOidc(token, input.sha);
    } catch {
      res.status(401).json({ error: 'governed_claim_oidc_rejected' });
      return;
    }

    try {
      const principalId = await deps.resolveAuthorizedPrincipal(claims);
      if (!principalId || !principalId.startsWith('oauth:')) {
        res.status(403).json({ error: 'governed_claim_principal_unbound' });
        return;
      }
      // Session request identity is derived only from a trusted server mapping.
      const request: SessionRequest = {
        transportSessionId: 'github-oidc:task-claim:unbound',
        identity: { principalId, assurance: 'oauth_subject', clientId: null }
      };
      const result = await deps.lifecycle.run(async () => {
        await deps.ready();
        const now = deps.now?.() ?? new Date();
        const sessions = (await deps.sessions.listVisibleSessions(request)).filter(s => sessionEligible(s, now));
        if (sessions.length !== 1) throw new Error('SESSION_AUTHORITY_AMBIGUOUS_OR_MISSING');
        const session = sessions[0]!;
        const live = await deps.currentState();
        if (!live || session.bootstrapReceipt?.stateVersion !== live.stateVersion) {
          throw new Error('BOOTSTRAP_RECEIPT_STALE');
        }
        if (session.bootstrapReceipt?.githubHead !== null
          && session.bootstrapReceipt?.githubHead !== input.sha) {
          throw new Error('BOOTSTRAP_HEAD_MISMATCH');
        }
        const document = await deps.queue.listVisibleTasks();
        const task = document.tasks.find(t => t.taskId === input.taskId);
        if (!task || task.repository !== session.repository) throw new Error('TASK_NOT_FOUND');
        if (task.ownerGovernedSessionId && task.ownerGovernedSessionId !== session.governedSessionId) {
          throw new Error('TASK_OWNED_BY_OTHER_SESSION');
        }
        if (session.taskScope !== task.intentKey && session.taskScope !== task.taskId) {
          throw new Error('SESSION_TASK_SCOPE_MISMATCH');
        }
        const claimed = await deps.queue.claimTaskById(
          session.governedSessionId, task.taskId, task.taskRevision, document.storeRevision,
          { sessionTargetScope: session.targetScope ?? null }
        );
        return { taskId: claimed.taskId, status: claimed.status, taskRevision: claimed.taskRevision };
      });
      res.status(200).json({ schemaVersion: 1, ok: true, ...result });
    } catch {
      // Uniform bounded response prevents disclosure of ownership and session data.
      res.status(409).json({ error: 'governed_claim_not_admitted' });
    }
  });
  return router;
}
