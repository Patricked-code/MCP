import type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import { deriveBootstrapProjectReferences } from '../governedContext/receiptReferences.js';
import { liveStateEngine } from '../liveState/engine.js';
import { createAtomicJsonStore } from '../operationalMemory/atomicStore.js';
import { operationalMemoryConfig } from '../operationalMemory/config.js';
import {
  createOperationalAudit,
  type OperationalAudit
} from '../operationalMemory/operationalAudit.js';
import { getDefaultOperationalEventJournal } from '../operationalMemory/eventJournal.js';
import {
  createGovernedLockService,
  type GovernedLockService
} from '../operationalMemory/lockService.js';
import {
  createGovernedSessionService,
  type GovernedSessionService,
  type RequestIdentity,
  type SessionRequest
} from '../operationalMemory/sessionService.js';
import { createTransportBindings } from '../operationalMemory/transportBindings.js';
import {
  RepositoryTargetSchema,
  targetScopeContainsRepository
} from '../operationalMemory/targetScope.js';
import {
  createTaskLifecycleCoordinator,
  type TaskLifecycleCoordinator
} from '../operationalMemory/taskLifecycleCoordinator.js';
import {
  ClientToolSurfaceCapabilitySchema,
  LockStoreDocumentSchema,
  SessionStoreDocumentSchema,
  createEmptyLockStoreDocument,
  createEmptySessionStoreDocument
} from '../operationalMemory/types.js';

export type GovernedSessionToolDependencies = {
  sessions: GovernedSessionService;
  locks: GovernedLockService;
  audit?: OperationalAudit;
  taskLifecycle?: TaskLifecycleCoordinator;
};

export type GovernedSessionToolExtra = {
  sessionId?: string;
  authInfo?: AuthInfo;
};

const GovernedSessionIdSchema = z.string().uuid();
const ExpectedSessionRevisionSchema = z.number().int().nonnegative();
const NullableBranchSchema = z.string().trim().min(1).max(255).nullable().default(null);
const BlockersSchema = z.array(z.string().trim().min(1).max(240)).max(20).default([]);
const NullableNextActionSchema = z.string().trim().min(1).max(500).nullable().default(null);
const HISTORICAL_REPOSITORY = 'Patricked-code/MCP';
const MappingIdSchema = z.string().trim().min(1).max(300);
// B3.2: the agent only names registered mapping ids; the server builds the TargetScope.
const TargetMappingIdsSchema = z.array(MappingIdSchema).min(1).max(20).optional();

/** Without a server-built TargetScope a repository keeps its historical MCP-only meaning. */
function assertHistoricalRepository(repository: string, scoped: boolean): void {
  if (!scoped && repository !== HISTORICAL_REPOSITORY) fail('REPOSITORY_OUT_OF_SCOPE');
}

let sharedDependencies: GovernedSessionToolDependencies | null = null;

export function getGovernedSessionToolDependencies(): GovernedSessionToolDependencies {
  if (sharedDependencies) return sharedDependencies;

  const bindings = createTransportBindings();
  const journal = getDefaultOperationalEventJournal({
    filePath: operationalMemoryConfig.eventJournalPath,
    maxBytes: operationalMemoryConfig.eventMaxBytes,
    archives: operationalMemoryConfig.eventArchives
  });
  const audit = createOperationalAudit(journal);
  const taskLifecycle = createTaskLifecycleCoordinator();
  const sessionStore = createAtomicJsonStore({
    filePath: operationalMemoryConfig.sessionStorePath,
    schema: SessionStoreDocumentSchema,
    empty: createEmptySessionStoreDocument
  });
  const lockStore = createAtomicJsonStore({
    filePath: operationalMemoryConfig.lockStorePath,
    schema: LockStoreDocumentSchema,
    empty: createEmptyLockStoreDocument
  });
  let locks: GovernedLockService;
  const sessions = createGovernedSessionService({
    store: sessionStore,
    bindings,
    idleTtlSeconds: operationalMemoryConfig.sessionIdleTtlSeconds,
    resumeGraceSeconds: operationalMemoryConfig.sessionResumeGraceSeconds,
    getLiveState: async () => {
      const state = await liveStateEngine.getCurrent();
      return state ?? { stateVersion: 0 };
    },
    audit,
    renewLocksForHeartbeat: (governedSessionId, at) => (
      locks.renewLocksForHeartbeat(governedSessionId, at)
    ),
    releaseLocksForSession: (governedSessionId) => (
      locks.releaseLocksForSession(governedSessionId)
    ),
    taskLifecycleCoordinator: taskLifecycle,
    // D3: the receipt references come from the governed context of the same
    // session. Loaded lazily: the context tools compose this module.
    observeProjectReferences: async (governedSessionId, request) => {
      const { getGovernedContextToolDependencies } = await import('./governedContext.js');
      const context = await getGovernedContextToolDependencies().context.getCurrent({
        governedSessionId,
        workBranch: null,
        request
      });
      return deriveBootstrapProjectReferences(context);
    }
  });
  locks = createGovernedLockService({
    store: lockStore,
    sessionStore,
    bindings,
    defaultTtlSeconds: operationalMemoryConfig.lockDefaultTtlSeconds,
    maxTtlSeconds: operationalMemoryConfig.lockMaxTtlSeconds,
    audit
  });
  sharedDependencies = { sessions, locks, audit, taskLifecycle };
  return sharedDependencies;
}

function fail(code: string): never {
  throw new Error(code);
}

function requestIdentity(authInfo: AuthInfo | undefined): RequestIdentity {
  const assurance = authInfo?.extra?.identityAssurance;
  const principalId = authInfo?.extra?.governedPrincipalId;
  if (
    assurance === 'oauth_subject'
    && typeof principalId === 'string'
    && principalId.startsWith('oauth:')
  ) {
    return {
      principalId,
      clientId: authInfo?.clientId ?? null,
      assurance
    };
  }
  if (assurance === 'shared_credential' && principalId === null) {
    return {
      principalId: null,
      clientId: authInfo?.clientId ?? null,
      assurance
    };
  }
  fail('AUTH_IDENTITY_REQUIRED');
}

export function sessionRequestFromToolExtra(extra: GovernedSessionToolExtra): SessionRequest {
  if (!extra.sessionId) fail('TRANSPORT_SESSION_REQUIRED');
  return {
    transportSessionId: extra.sessionId,
    identity: requestIdentity(extra.authInfo)
  };
}

function boundedErrorCode(error: unknown): string {
  const message = error instanceof Error ? error.message : '';
  return /^[A-Z][A-Z0-9_]{2,79}(?::[0-9a-f-]{36})?$/.test(message)
    ? message
    : 'GOVERNED_SESSION_OPERATION_FAILED';
}

function response(result: unknown) {
  return {
    content: [{
      type: 'text' as const,
      text: JSON.stringify({ ok: true, result })
    }]
  };
}

function errorResponse(error: unknown) {
  return {
    isError: true,
    content: [{
      type: 'text' as const,
      text: JSON.stringify({
        ok: false,
        error: { code: boundedErrorCode(error) }
      })
    }]
  };
}

async function handled(work: () => Promise<unknown>) {
  try {
    return response(await work());
  } catch (error) {
    return errorResponse(error);
  }
}

export function registerGovernedSessionTools(
  server: McpServer,
  dependencies?: GovernedSessionToolDependencies
): void {
  if (!operationalMemoryConfig.enabled) return;
  const activeDependencies = dependencies ?? getGovernedSessionToolDependencies();

  server.tool(
    'mcp_open_governed_session',
    'Ouvre une governed session durable, distincte de la session de transport MCP. targetMappingIds (optionnel) cible des composants du projet configuré ; sans eux, seul Patricked-code/MCP est accepté.',
    {
      repository: RepositoryTargetSchema,
      targetMappingIds: TargetMappingIdsSchema,
      taskScope: z.string().trim().min(1).max(200),
      workBranch: NullableBranchSchema,
      agentIdentity: z.string().trim().min(1).max(200),
      blockers: BlockersSchema,
      nextAction: NullableNextActionSchema
    },
    async (input, extra) => handled(async () => {
      assertHistoricalRepository(input.repository, input.targetMappingIds !== undefined);
      return activeDependencies.sessions.openSession(input, sessionRequestFromToolExtra(extra));
    })
  );

  server.tool(
    'mcp_resume_governed_session',
    'Reprend une governed session légitime sur le transport MCP courant. Une session ciblée se reprend avec les mêmes targetMappingIds.',
    {
      governedSessionId: GovernedSessionIdSchema,
      resumeSecret: z.string().min(32).max(256).optional(),
      repository: RepositoryTargetSchema,
      targetMappingIds: TargetMappingIdsSchema,
      taskScope: z.string().trim().min(1).max(200),
      expectedSessionRevision: ExpectedSessionRevisionSchema
    },
    async (input, extra) => handled(async () => {
      assertHistoricalRepository(input.repository, input.targetMappingIds !== undefined);
      return activeDependencies.sessions.resumeSession(input, sessionRequestFromToolExtra(extra));
    })
  );

  server.tool(
    'mcp_governed_session_heartbeat',
    'Renouvelle la présence et les locks actifs d’une governed session.',
    {
      governedSessionId: GovernedSessionIdSchema,
      expectedSessionRevision: ExpectedSessionRevisionSchema
    },
    async (input, extra) => handled(() => activeDependencies.sessions.heartbeat(
      input,
      sessionRequestFromToolExtra(extra)
    ))
  );

  server.tool(
    'mcp_acknowledge_governed_context',
    'Acquitte explicitement une version observée du contexte opérationnel.',
    {
      governedSessionId: GovernedSessionIdSchema,
      expectedSessionRevision: ExpectedSessionRevisionSchema,
      expectedStateVersion: z.number().int().nonnegative()
    },
    async (input, extra) => handled(() => activeDependencies.sessions.acknowledgeContext(
      input,
      sessionRequestFromToolExtra(extra)
    ))
  );

  server.tool(
    'mcp_create_governed_checkpoint',
    'Crée un checkpoint borné après acquittement du contexte opérationnel.',
    {
      governedSessionId: GovernedSessionIdSchema,
      expectedSessionRevision: ExpectedSessionRevisionSchema,
      expectedStateVersion: z.number().int().nonnegative(),
      completedAction: z.string().trim().min(1).max(240),
      resultCode: z.string().trim().min(1).max(80).regex(/^[A-Z0-9_.:-]+$/),
      pullRequestNumber: z.number().int().positive().max(2_147_483_647).nullable().default(null),
      observedHeadSha: z.string().regex(/^[0-9a-f]{40}$/).nullable().default(null),
      blockers: BlockersSchema,
      nextAction: NullableNextActionSchema
    },
    async (input, extra) => handled(() => activeDependencies.sessions.createCheckpoint(
      input,
      sessionRequestFromToolExtra(extra)
    ))
  );

  const registerRevisionTool = (
    name: 'mcp_pause_governed_session' | 'mcp_close_governed_session',
    description: string,
    operation: GovernedSessionService['pauseSession'] | GovernedSessionService['closeSession']
  ) => {
    server.tool(name, description, {
      governedSessionId: GovernedSessionIdSchema,
      expectedSessionRevision: ExpectedSessionRevisionSchema
    }, async (input, extra) => handled(() => operation(
      input,
      sessionRequestFromToolExtra(extra)
    )));
  };

  registerRevisionTool(
    'mcp_pause_governed_session',
    'Met une governed session en pause sans supprimer sa mémoire.',
    activeDependencies.sessions.pauseSession
  );
  registerRevisionTool(
    'mcp_close_governed_session',
    'Ferme idempotemment une governed session.',
    activeDependencies.sessions.closeSession
  );

  server.tool(
    'mcp_list_governed_sessions',
    'Liste uniquement les governed sessions visibles par l’identité courante.',
    {},
    async (_input, extra) => handled(() => activeDependencies.sessions.listVisibleSessions(
      sessionRequestFromToolExtra(extra)
    ))
  );

  server.tool(
    'mcp_get_governed_session',
    'Retourne une governed session visible sans secret ni identifiant de transport brut.',
    { governedSessionId: GovernedSessionIdSchema },
    async (input, extra) => handled(() => activeDependencies.sessions.getVisibleSession(
      input.governedSessionId,
      sessionRequestFromToolExtra(extra)
    ))
  );

  server.tool(
    'mcp_acquire_governed_lock',
    'Acquiert un lock temporaire borné appartenant à la governed session. Les scopes component et les dépôts hors Patricked-code/MCP dérivent du TargetScope construit par le serveur pour la session.',
    {
      governedSessionId: GovernedSessionIdSchema,
      expectedSessionRevision: ExpectedSessionRevisionSchema,
      scope: z.discriminatedUnion('type', [
        z.object({
          type: z.literal('repository'),
          key: RepositoryTargetSchema
        }).strict(),
        z.object({
          type: z.literal('component'),
          mappingId: MappingIdSchema
        }).strict(),
        z.object({
          type: z.literal('task'),
          key: z.string().regex(/^TASK-[0-9]{8}-[0-9]{3,}$/)
        }).strict(),
        z.object({
          type: z.literal('resource'),
          key: z.string().min(1).max(160).regex(/^[A-Za-z0-9./:_-]+$/)
        }).strict()
      ]),
      ttlSeconds: z.number().int().min(30).max(1_800).optional(),
      reason: z.string().trim().min(1).max(240)
    },
    async (input, extra) => handled(async () => {
      const request = sessionRequestFromToolExtra(extra);
      // B3.2: component and repository scopes derive from the session's own
      // server-built TargetScope, never from the agent.
      // An invisible session still reaches the lock service, which keeps its
      // historical SESSION_NOT_FOUND / SESSION_NOT_BOUND answers.
      const session = await activeDependencies.sessions.getVisibleSession(input.governedSessionId, request);
      const targetScope = session?.targetScope;
      let scope: Parameters<GovernedLockService['acquireLock']>[0]['scope'];
      if (input.scope.type === 'component') {
        if (!session) fail('SESSION_NOT_BOUND');
        if (!targetScope) fail('LOCK_COMPONENT_SCOPE_UNBOUND');
        scope = { type: 'component', targetId: targetScope.targetId, mappingId: input.scope.mappingId };
      } else {
        if (input.scope.type === 'repository') {
          assertHistoricalRepository(input.scope.key, Boolean(targetScope));
          if (targetScope && !targetScopeContainsRepository(targetScope, input.scope.key)) {
            fail('LOCK_REPOSITORY_OUT_OF_TARGET_SCOPE');
          }
        }
        scope = input.scope;
      }
      return activeDependencies.locks.acquireLock({
        governedSessionId: input.governedSessionId,
        expectedSessionRevision: input.expectedSessionRevision,
        scope,
        ...(targetScope ? { targetScope } : {}),
        ...(input.ttlSeconds === undefined ? {} : { ttlSeconds: input.ttlSeconds }),
        reason: input.reason
      }, request);
    })
  );

  server.tool(
    'mcp_release_governed_lock',
    'Libère idempotemment un lock appartenant à la governed session.',
    {
      governedSessionId: GovernedSessionIdSchema,
      lockId: z.string().uuid(),
      expectedLockRevision: z.number().int().nonnegative()
    },
    async (input, extra) => handled(() => activeDependencies.locks.releaseLock(
      input,
      sessionRequestFromToolExtra(extra)
    ))
  );

  server.tool(
    'mcp_attest_client_tool_surface',
    'Enregistre une attestation bornée (≤ 5 min, horodatée par le serveur) de la surface d’outils observée par le client. Elle informe la callabilité, ne vaut jamais autorisation.',
    {
      governedSessionId: GovernedSessionIdSchema,
      expectedSessionRevision: ExpectedSessionRevisionSchema,
      surface: z.string().trim().min(1).max(80).regex(/^[a-z0-9][a-z0-9._:-]*$/),
      capabilities: z.array(ClientToolSurfaceCapabilitySchema.omit({ source: true })).min(1).max(256),
      provenance: z.array(
        z.string().trim().min(1).max(80).regex(/^[a-z0-9][a-z0-9._:-]*$/)
      ).max(19).default([]),
      validitySeconds: z.number().int().min(1).max(300).default(300)
    },
    async (input, extra) => handled(() => activeDependencies.sessions.attestClientToolSurface(
      input,
      sessionRequestFromToolExtra(extra)
    ))
  );
}
