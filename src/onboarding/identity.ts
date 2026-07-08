import type { OnboardingActor, OnboardingActorType, OnboardingRole } from './types.js';

function nowIso(): string {
  return new Date().toISOString();
}

function normalizeActorType(value: unknown): OnboardingActorType {
  const raw = String(value ?? '').trim().toLowerCase();
  if (raw.includes('chatgpt')) return 'chatgpt';
  if (raw.includes('configcloud') || raw.includes('config')) return 'configcloud';
  if (raw.includes('claude')) return 'claude';
  if (raw.includes('codex')) return 'codex';
  if (raw.includes('audit')) return 'audit_agent';
  if (raw.includes('deploy')) return 'deployment_agent';
  if (raw.includes('server') || raw.includes('serveur')) return 'server_agent';
  if (raw.includes('readonly') || raw.includes('lecture')) return 'readonly_agent';
  if (raw.includes('admin')) return 'human_admin';
  if (raw.includes('owner') || raw.includes('proprietaire') || raw.includes('propriétaire')) return 'human_owner';
  if (raw.includes('service') || raw.includes('cron') || raw.includes('auto')) return 'service';
  return 'unknown';
}

function roleForActor(actorType: OnboardingActorType): OnboardingRole {
  switch (actorType) {
    case 'human_owner':
      return 'superadmin';
    case 'human_admin':
      return 'project_manager_controlled_write';
    case 'chatgpt':
      return 'architect_supervisor';
    case 'configcloud':
      return 'repo_connector';
    case 'claude':
      return 'documentation_agent';
    case 'codex':
      return 'technical_executor';
    case 'audit_agent':
      return 'audit';
    case 'readonly_agent':
      return 'readonly';
    case 'deployment_agent':
    case 'server_agent':
      return 'technical_executor';
    default:
      return 'readonly';
  }
}

function displayName(actorType: OnboardingActorType): string {
  switch (actorType) {
    case 'chatgpt':
      return 'ChatGPT';
    case 'configcloud':
      return 'ConfigCloud';
    case 'claude':
      return 'Claude';
    case 'codex':
      return 'Codex';
    case 'human_owner':
      return 'Propriétaire humain';
    case 'human_admin':
      return 'Admin humain';
    case 'server_agent':
      return 'Agent serveur';
    case 'readonly_agent':
      return 'Agent lecture seule';
    case 'deployment_agent':
      return 'Agent déploiement';
    case 'audit_agent':
      return 'Agent audit';
    case 'service':
      return 'Service automatique';
    default:
      return 'Acteur inconnu';
  }
}

export function identifyActor(input: {
  actor?: unknown;
  source?: OnboardingActor['source'];
  knownActorIds?: string[];
  mcpTokenId?: string | null;
}): OnboardingActor {
  const actorType = normalizeActorType(input.actor);
  const actorName = displayName(actorType);
  const actorId = `mcp_actor_${actorType}`;
  const known = Boolean(input.knownActorIds?.includes(actorId));
  const at = nowIso();

  return {
    actorId,
    actorName,
    actorType,
    role: roleForActor(actorType),
    source: input.source ?? 'unknown',
    mcpTokenId: input.mcpTokenId ?? null,
    isKnown: known,
    firstConnection: !known,
    createdAt: at,
    lastSeenAt: at,
    requiresHumanApproval: actorType !== 'human_owner'
  };
}
