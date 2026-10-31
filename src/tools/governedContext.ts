import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { env } from '../config/env.js';
import { createGithubOperationalContextCollector } from '../governedContext/github.js';
import {
  createGovernedOperationalContextService,
  type GovernedContextInput,
  type GovernedOperationalContextService
} from '../governedContext/service.js';
import { liveStateEngine } from '../liveState/engine.js';
import { oauthIssuer } from '../oauth.js';
import type { GovernedSessionService } from '../operationalMemory/sessionService.js';
import { operationalMemoryConfig } from '../operationalMemory/config.js';
import { getDefaultClientObservationRecorder } from '../operationalMemory/clientPresence.js';
import { getDefaultOperationalEventJournal } from '../operationalMemory/eventJournal.js';
import {
  getGovernedSessionToolDependencies,
  sessionRequestFromToolExtra,
  type GovernedSessionToolExtra
} from './governedSessions.js';
import { getCurrentStateService } from './currentState.js';

export const GOVERNED_CONTEXT_RESOURCE_URI = 'mcp://wealthtech/governed-context/current';

/** Owner-selected E2 alternative; do not replace the existing E1 procedure. */
export const E2_ENTRY_INSTRUCTIONS = [
  'ENTREE E2 (EXTERNAL_GOVERNED_RECOVERY) UNIQUEMENT SUR CHOIX EXPLICITE DU PROPRIETAIRE : voie GitHub-first sans attribution de tache GWC interne pour commencer les travaux de code.',
  'E2-01 : appeler ping, mcp_reconcile_governed_context et mcp_get_current_state_inventory ; verifier le HEAD exact de main, Git S1/origin/main, revision runtime MCP, sante du conteneur, propreté locale et derive documentaire. Si une source manque, le signaler ; ne jamais inventer un etat serveur.',
  'E2-02 : recuperer les chantiers MCP et Continuity IDs existants depuis les issues, PR et checkpoints GitHub ; verifier les liens, les collisions et les lacunes historiques avant toute creation.',
  'E2-03 : APRES la reconciliation, demander au proprietaire : Continuer un chantier existant ? Oui ou non ? Si oui, lequel ? Si non, demander le nouveau mandat et rechercher les doublons avant de creer un ancrage.',
  'E2-04 : en reprise, reutiliser le meme issue/PR/Continuity ID et son NEXT_ACTION. En nouveau travail, obtenir un mandat explicite et creer le dossier uniquement apres controle des chevauchements.',
  'E2-05 : poursuivre les memes tests, CI, revue, fusion et deploiement gouvernes que E1. Une entree E2 ne confere ni ecriture GitHub/serveur, ni claim/lock, ni autorisation E3/OIDC/deploy. Conserver un checkpoint GitHub append-only et reconciler a nouveau a chaque reprise.',
  'ENTREE E1 PAR DEFAUT : appliquer les etapes numerotees 1 a 8 ci-dessous. E2 ne doit jamais etre infere automatiquement dun blocage E1.'
] as const;

export const GOVERNED_CONTEXT_INSTRUCTIONS = [
  '1. Appeler ping puis mcp_reconcile_governed_context.',
  '2. Lire mcp://wealthtech/current-state/inventory ou mcp_get_current_state_inventory.',
  '3. Reprendre une governed session compatible ou en ouvrir une; MCP-Session-Id reste temporaire.',
  '4. Acquitter le stateVersion courant afin de recevoir un Bootstrap Receipt.',
  '5. Projeter la nouvelle instruction puis appeler mcp_reconcile_agent_intent.',
  '6. Réclamer mcp_claim_next_governed_task: la première tâche exécutable précède les nouvelles.',
  '7. Respecter locks, CI, reviews, exact-SHA deploy, checkpoint et clôture.',
  '8. Le WRITE gate reste shadow et ne remplace ni ENABLE_WRITE_TOOLS ni allow_write.'
].join('\n');

export function governedContextInstructions(
  enabled: boolean,
  explicitlySelectedProfile?: 'EXTERNAL_GOVERNED_RECOVERY'
): string | undefined {
  if(!enabled)return undefined;
  return explicitlySelectedProfile==='EXTERNAL_GOVERNED_RECOVERY'
    ? E2_ENTRY_INSTRUCTIONS.join('\n')
    : GOVERNED_CONTEXT_INSTRUCTIONS;
}

type GovernedContextToolDependencies = {
  context: GovernedOperationalContextService;
  sessions: Pick<GovernedSessionService, 'lookupGovernedSessionId'>;
};

let sharedDependencies: GovernedContextToolDependencies | null = null;

export function getGovernedContextToolDependencies(): GovernedContextToolDependencies {
  if (sharedDependencies) return sharedDependencies;
  const operational = getGovernedSessionToolDependencies();
  const github = createGithubOperationalContextCollector();
  sharedDependencies = {
    context: createGovernedOperationalContextService({
      liveState: liveStateEngine,
      github,
      sessions: operational.sessions,
      locks: operational.locks,
      gateMode: operationalMemoryConfig.writeGateMode,
      existingWriteToolsEnabled: env.ENABLE_WRITE_TOOLS,
      currentState: getCurrentStateService(),
      audit: operational.audit,
      publicBaseUrl: oauthIssuer(),
      ...(operationalMemoryConfig.enabled
        ? {
            clientPresence: getDefaultClientObservationRecorder(getDefaultOperationalEventJournal({
              filePath: operationalMemoryConfig.eventJournalPath,
              maxBytes: operationalMemoryConfig.eventMaxBytes,
              archives: operationalMemoryConfig.eventArchives
            }))
          }
        : {})
    }),
    sessions: operational.sessions
  };
  return sharedDependencies;
}

function contextInput(
  extra: GovernedSessionToolExtra,
  sessions: Pick<GovernedSessionService, 'lookupGovernedSessionId'>
): GovernedContextInput {
  const request = sessionRequestFromToolExtra(extra);
  return {
    governedSessionId: sessions.lookupGovernedSessionId(extra.sessionId),
    workBranch: null,
    request
  };
}

function boundedErrorCode(error: unknown): string {
  const message = error instanceof Error ? error.message : '';
  return /^[A-Z][A-Z0-9_]{2,79}$/.test(message)
    ? message
    : 'GOVERNED_CONTEXT_UNAVAILABLE';
}

function asToolResult(value: unknown) {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(value) }]
  };
}

async function handleTool(work: () => Promise<unknown>) {
  try {
    return asToolResult(await work());
  } catch (error) {
    return {
      ...asToolResult({ ok: false, error: { code: boundedErrorCode(error) } }),
      isError: true
    };
  }
}

export function registerGovernedContextTools(
  server: McpServer,
  dependencies?: GovernedContextToolDependencies
): void {
  if (!operationalMemoryConfig.enabled) return;
  const activeDependencies = dependencies ?? getGovernedContextToolDependencies();

  server.registerResource(
    'wealthtech-governed-context-current',
    GOVERNED_CONTEXT_RESOURCE_URI,
    {
      title: 'WealthTech Governed Operational Context',
      description: 'Contexte opérationnel gouverné courant, composé depuis Live State, GitHub et la session durable.',
      mimeType: 'application/json',
      annotations: { audience: ['assistant'], priority: 1 }
    },
    async (_uri, extra) => {
      try {
        const value = await activeDependencies.context.getCurrent(
          contextInput(extra, activeDependencies.sessions)
        );
        return {
          contents: [{
            uri: GOVERNED_CONTEXT_RESOURCE_URI,
            mimeType: 'application/json',
            text: JSON.stringify(value)
          }]
        };
      } catch (error) {
        return {
          contents: [{
            uri: GOVERNED_CONTEXT_RESOURCE_URI,
            mimeType: 'application/json',
            text: JSON.stringify({ ok: false, error: { code: boundedErrorCode(error) } })
          }]
        };
      }
    }
  );

  const annotations = {
    readOnlyHint: true,
    destructiveHint: false
  } as const;
  server.registerTool(
    'mcp_get_governed_context',
    {
      title: 'Get Governed Operational Context',
      description: 'Lit le contexte gouverné courant depuis les caches et stores sans forcer de réconciliation.',
      inputSchema: {},
      annotations
    },
    async (_input, extra) => handleTool(() => activeDependencies.context.getCurrent(
      contextInput(extra, activeDependencies.sessions)
    ))
  );
  server.registerTool(
    'mcp_reconcile_governed_context',
    {
      title: 'Reconcile Governed Operational Context',
      description: 'Force une observation read-only Live State et GitHub, puis compose le contexte gouverné.',
      inputSchema: {},
      annotations
    },
    async (_input, extra) => handleTool(() => activeDependencies.context.reconcileExplicit(
      contextInput(extra, activeDependencies.sessions)
    ))
  );
}
