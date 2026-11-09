import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { createCurrentStateService, type CurrentStateService } from '../currentState/service.js';
import type { ProgramNextWorkSource } from '../governance/nextWorkProjection.js';
import { loadProgramProjection, loadReadinessLibrary } from '../governance/programBlueprintMaterialization.js';
import { liveStateEngine } from '../liveState/engine.js';
import { sessionRequestFromToolExtra, getGovernedSessionToolDependencies, type GovernedSessionToolExtra } from './governedSessions.js';
import { getGovernedTaskToolDependencies } from './governedTasks.js';

export const CURRENT_STATE_RESOURCE_URI = 'mcp://wealthtech/current-state/inventory';

let sharedService: CurrentStateService | null = null;
let deployedProgram: Promise<ProgramNextWorkSource> | null = null;

/**
 * DISPATCH-03: the program projection and readiness library ship with the
 * deployed revision, so one successful load serves the process; a failed load
 * is retried on the next read and the inventory reports it as unavailable.
 */
export function loadDeployedProgramSource(): Promise<ProgramNextWorkSource | null> {
  const pending = deployedProgram ??= Promise.all([loadProgramProjection(), loadReadinessLibrary()])
    .then(([snapshot, library]) => ({ ...snapshot, library }));
  return pending.catch(() => {
    if (deployedProgram === pending) deployedProgram = null;
    return null;
  });
}

export function getCurrentStateService(): CurrentStateService {
  if (sharedService) return sharedService;
  const taskDependencies = getGovernedTaskToolDependencies();
  const operational = getGovernedSessionToolDependencies();
  sharedService = createCurrentStateService({
    liveState: liveStateEngine,
    tasks: taskDependencies.queue,
    sessions: operational.sessions,
    locks: operational.locks,
    program: loadDeployedProgramSource
  });
  return sharedService;
}

function errorCode(error: unknown): string {
  const message = error instanceof Error ? error.message : '';
  return /^[A-Z][A-Z0-9_]{2,79}$/.test(message) ? message : 'CURRENT_STATE_INVENTORY_UNAVAILABLE';
}

export function registerCurrentStateTools(server: McpServer, service: CurrentStateService = getCurrentStateService()): void {
  const inventory = (extra: GovernedSessionToolExtra) => service.getInventory(sessionRequestFromToolExtra(extra));
  server.registerResource(
    'wealthtech-current-state-inventory',
    CURRENT_STATE_RESOURCE_URI,
    {
      title: 'WealthTech Current-State Inventory',
      description: 'Cartographie dérivée et bornée des capacités, architectures, audits, sessions et tâches courantes.',
      mimeType: 'application/json',
      annotations: { audience: ['assistant'], priority: 1 }
    },
    async (_uri, extra) => {
      try {
        return { contents: [{ uri: CURRENT_STATE_RESOURCE_URI, mimeType: 'application/json', text: JSON.stringify(await inventory(extra)) }] };
      } catch (error) {
        return { contents: [{ uri: CURRENT_STATE_RESOURCE_URI, mimeType: 'application/json', text: JSON.stringify({ ok: false, error: { code: errorCode(error) } }) }] };
      }
    }
  );
  server.registerTool('mcp_get_current_state_inventory', {
    title: 'Get Current-State Inventory',
    description: 'Retourne la dernière cartographie dérivée, la baseline d’audit, les sessions et la file de travail.',
    inputSchema: {},
    annotations: { readOnlyHint: true, destructiveHint: false }
  }, async (_input, extra) => {
    try {
      return { content: [{ type: 'text' as const, text: JSON.stringify(await inventory(extra)) }] };
    } catch (error) {
      return { isError: true, content: [{ type: 'text' as const, text: JSON.stringify({ ok: false, error: { code: errorCode(error) } }) }] };
    }
  });
}
