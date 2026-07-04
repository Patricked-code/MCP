import { randomUUID } from 'node:crypto';
import type { GitHubConnectionStatus } from '../github/connection.js';
import type { GitRegistry, RegistryAuditEvent } from '../github/registry.js';
import type { ActorIdentity, AuditTrace, RightsReport } from './types.js';

function sanitizeMetadata(value: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
  if (!value) return undefined;
  const sanitized: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (/token|secret|password|private/i.test(key)) {
      sanitized[key] = '[redacted]';
    } else {
      sanitized[key] = entry;
    }
  }
  return sanitized;
}

export function createAuditTrace(input: {
  actor: ActorIdentity;
  rights: RightsReport;
  status: GitHubConnectionStatus;
  action: string;
  result: AuditTrace['result'];
  serverLinked: boolean;
  metadata?: Record<string, unknown>;
}, at = new Date().toISOString()): AuditTrace {
  return {
    id: randomUUID(),
    at,
    actor: input.actor.actorName,
    actorType: input.actor.actorType,
    mcpTokenId: input.actor.mcpTokenId,
    action: input.action,
    result: input.result,
    githubLogin: input.status.login,
    githubOrg: input.status.org,
    rights: {
      read: input.rights.canReadRepos,
      write: input.rights.canWriteBranch,
      admin: input.rights.isRepoAdmin,
      orgAdmin: input.rights.isOrgAdmin
    },
    reposVisible: input.status.reposVisible,
    reposWritable: input.rights.canWriteBranch && input.status.reposVisible !== null ? input.status.reposVisible : null,
    serverLinked: input.serverLinked,
    firstConnection: input.actor.firstConnection,
    warnings: input.rights.warnings,
    errors: input.rights.errors,
    metadata: sanitizeMetadata(input.metadata)
  };
}

export function auditTraceToRegistryEvent(trace: AuditTrace): RegistryAuditEvent {
  return {
    id: trace.id,
    at: trace.at,
    type: `onboarding.${trace.action}`,
    actor: trace.actor,
    message: `Onboarding ${trace.action}: ${trace.result}`,
    metadata: {
      actorType: trace.actorType,
      githubLogin: trace.githubLogin,
      githubOrg: trace.githubOrg,
      rights: trace.rights,
      reposVisible: trace.reposVisible,
      reposWritable: trace.reposWritable,
      serverLinked: trace.serverLinked,
      firstConnection: trace.firstConnection,
      warnings: trace.warnings,
      errors: trace.errors,
      metadata: trace.metadata
    }
  };
}

export function listOnboardingAudit(registry: GitRegistry, limit = 50): AuditTrace[] {
  return registry.auditEvents
    .filter((event) => event.type.startsWith('onboarding.'))
    .slice(-limit)
    .reverse()
    .map((event) => {
      const metadata = event.metadata ?? {};
      const rights = metadata.rights && typeof metadata.rights === 'object'
        ? metadata.rights as AuditTrace['rights']
        : { read: false, write: false, admin: false, orgAdmin: false };
      return {
        id: event.id,
        at: event.at,
        actor: event.actor,
        actorType: String(metadata.actorType ?? 'unknown') as AuditTrace['actorType'],
        mcpTokenId: 'mcp-session',
        action: event.type.replace(/^onboarding\./, ''),
        result: String(event.message).endsWith('error') ? 'error' : 'ok',
        githubLogin: typeof metadata.githubLogin === 'string' ? metadata.githubLogin : null,
        githubOrg: typeof metadata.githubOrg === 'string' ? metadata.githubOrg : null,
        rights,
        reposVisible: typeof metadata.reposVisible === 'number' ? metadata.reposVisible : null,
        reposWritable: typeof metadata.reposWritable === 'number' ? metadata.reposWritable : null,
        serverLinked: Boolean(metadata.serverLinked),
        firstConnection: Boolean(metadata.firstConnection),
        warnings: Array.isArray(metadata.warnings) ? metadata.warnings.map(String) : [],
        errors: Array.isArray(metadata.errors) ? metadata.errors.map(String) : [],
        metadata: typeof metadata.metadata === 'object' && metadata.metadata ? metadata.metadata as Record<string, unknown> : undefined
      };
    });
}
