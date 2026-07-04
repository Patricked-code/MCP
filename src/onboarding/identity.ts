import type { GitRegistry } from '../github/registry.js';
import type { ActorIdentity, ActorType } from './types.js';

type IdentityInput = {
  actorName?: string;
  source?: string;
  mcpTokenId?: string;
  userAgent?: string;
};

function nowIso(): string {
  return new Date().toISOString();
}

function normalizeIdPart(value: string): string {
  const normalized = value.trim().toLowerCase().replace(/[^a-z0-9_.:-]+/g, '-').replace(/^-+|-+$/g, '');
  return normalized || 'unknown';
}

function inferActorType(input: IdentityInput): ActorType {
  const haystack = `${input.actorName ?? ''} ${input.source ?? ''} ${input.userAgent ?? ''}`.toLowerCase();

  if (haystack.includes('chatgpt')) return 'chatgpt';
  if (haystack.includes('claude')) return 'claude';
  if (haystack.includes('codex')) return 'codex';
  if (haystack.includes('deploy')) return 'deployment_agent';
  if (haystack.includes('audit')) return 'audit_agent';
  if (haystack.includes('readonly') || haystack.includes('read-only')) return 'readonly_agent';
  if (haystack.includes('server')) return 'server_agent';
  if (haystack.includes('service') || haystack.includes('automation')) return 'automation_service';
  if (haystack.includes('owner') || haystack.includes('proprietaire')) return 'human_owner';
  if (haystack.includes('admin')) return 'human_admin';
  if (input.source?.startsWith('mcp-web')) return 'human_admin';

  return 'unknown';
}

function actorDisplayName(actorType: ActorType, fallback: string | undefined): string {
  if (fallback && fallback.trim()) return fallback.trim();

  const names: Record<ActorType, string> = {
    human_owner: 'Proprietaire humain',
    human_admin: 'Administrateur humain',
    chatgpt: 'ChatGPT',
    claude: 'Claude',
    codex: 'Codex',
    server_agent: 'Agent serveur',
    readonly_agent: 'Agent lecture seule',
    audit_agent: 'Agent audit',
    deployment_agent: 'Agent deploiement',
    automation_service: 'Service automatique MCP',
    unknown: 'Acteur inconnu'
  };
  return names[actorType];
}

export function identifyActor(input: IdentityInput, registry: GitRegistry, at = nowIso()): ActorIdentity {
  const actorType = inferActorType(input);
  const actorName = actorDisplayName(actorType, input.actorName);
  const source = input.source?.trim() || 'mcp-web';
  const mcpTokenId = input.mcpTokenId?.trim() || 'mcp-session';
  const actorId = `${actorType}:${normalizeIdPart(actorName)}:${normalizeIdPart(mcpTokenId)}`;

  const previousEvent = registry.auditEvents
    .slice()
    .reverse()
    .find((event) => event.actor === actorId || event.actor === actorName);

  const isKnown = Boolean(previousEvent);
  const aiOrService = actorType !== 'human_owner' && actorType !== 'human_admin';

  return {
    actorId,
    actorName,
    actorType,
    source,
    mcpTokenId,
    isKnown,
    firstConnection: !isKnown,
    createdAt: previousEvent?.at ?? at,
    lastSeenAt: at,
    requiresHumanApproval: !isKnown || aiOrService
  };
}
