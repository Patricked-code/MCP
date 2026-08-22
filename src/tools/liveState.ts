import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { liveStateEngine, type LiveStateEngine } from '../liveState/engine.js';
import type { LiveStateSnapshot } from '../liveState/types.js';
import { asText } from './format.js';

export function getLiveStateSummary(snapshot: LiveStateSnapshot | null): Record<string, unknown> {
  if (!snapshot) {
    return {
      available: false,
      stateVersion: null,
      freshness: 'UNAVAILABLE',
      globalAlignment: 'UNAVAILABLE',
      activeTask: null,
      nextAction: 'mcp_reconcile_live_state'
    };
  }

  return {
    available: true,
    stateVersion: snapshot.stateVersion,
    freshness: snapshot.freshness,
    ageSeconds: snapshot.ageSeconds,
    globalAlignment: snapshot.alignment.global,
    activeTask: snapshot.documentation.activeTask,
    capabilities: {
      status: snapshot.capabilities?.status ?? 'UNAVAILABLE',
      catalogueDigest: snapshot.capabilities?.catalogueDigest ?? null,
      registeredToolCount: snapshot.capabilities?.registeredToolCount ?? 0,
      readOnlyToolCount: snapshot.capabilities?.readOnlyToolCount ?? 0,
      writeToolCount: snapshot.capabilities?.writeToolCount ?? 0,
      resourceCount: snapshot.capabilities?.resourceCount ?? 0
    },
    governance: {
      status: snapshot.governance?.status ?? 'UNAVAILABLE',
      governanceDigest: snapshot.governance?.governanceDigest ?? null,
      taskRegistryVersion: snapshot.governance?.taskRegistryVersion ?? null
    },
    auditBaseline: {
      status: snapshot.auditBaseline?.status ?? 'UNAVAILABLE',
      testSuiteDigest: snapshot.auditBaseline?.testSuiteDigest ?? null,
      sourceDigest: snapshot.auditBaseline?.sourceDigest ?? null
    },
    nextAction: snapshot.nextAction
  };
}

export async function getCurrentLiveStateSummary(): Promise<Record<string, unknown>> {
  return getLiveStateSummary(await liveStateEngine.getCurrent());
}

export function registerLiveStateReadOnlyTools(
  server: McpServer,
  engine: Pick<LiveStateEngine, 'getCurrent' | 'reconcileNow'> = liveStateEngine
): void {
  server.tool(
    'mcp_get_live_state',
    'Retourne le dernier état opérationnel partagé GitHub/S1/runtime/documentation avec fraîcheur, alignement et prochaine action. Lecture uniquement.',
    {},
    async () => asText(JSON.stringify(await engine.getCurrent(), null, 2))
  );

  server.tool(
    'mcp_reconcile_live_state',
    'Force une nouvelle observation read-only GitHub/S1/runtime/documentation, persiste l’état normalisé et retourne le résultat.',
    {},
    async () => asText(JSON.stringify(await engine.reconcileNow(), null, 2))
  );
}
