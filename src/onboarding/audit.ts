import type { GitRegistry, RegistryAuditEvent } from '../github/registry.js';
import type { OnboardingAuditEvent } from './types.js';

function nowIso(): string {
  return new Date().toISOString();
}

function auditId(): string {
  return `audit_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export function createOnboardingAuditEvent(input: Partial<OnboardingAuditEvent> & {
  action: string;
  result?: OnboardingAuditEvent['result'];
}): OnboardingAuditEvent {
  return {
    id: input.id ?? auditId(),
    at: input.at ?? nowIso(),
    actorId: input.actorId ?? 'unknown',
    actorName: input.actorName ?? 'unknown',
    actorType: input.actorType ?? 'unknown',
    githubLogin: input.githubLogin ?? null,
    githubOrg: input.githubOrg ?? null,
    repo: input.repo ?? null,
    action: input.action,
    result: input.result ?? 'success',
    warnings: input.warnings ?? [],
    errors: input.errors ?? [],
    metadata: input.metadata ?? {}
  };
}

export function appendOnboardingAuditEvent(registry: GitRegistry, event: OnboardingAuditEvent): GitRegistry {
  const registryEvent: RegistryAuditEvent = {
    id: event.id,
    at: event.at,
    type: event.action,
    actor: `${event.actorName} (${event.actorType})`,
    message: `${event.action}: ${event.result}`,
    metadata: {
      githubLogin: event.githubLogin,
      githubOrg: event.githubOrg,
      repo: event.repo,
      warnings: event.warnings,
      errors: event.errors,
      ...event.metadata
    }
  };

  return {
    ...registry,
    auditEvents: [...registry.auditEvents, registryEvent].slice(-500)
  };
}
