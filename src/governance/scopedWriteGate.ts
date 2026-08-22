import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';
import type { ServerNotification, ServerRequest } from '@modelcontextprotocol/sdk/types.js';

import { logger } from '../logger.js';
import { liveStateEngine } from '../liveState/engine.js';
import { operationalMemoryConfig } from '../operationalMemory/config.js';
import { getDefaultOperationalEventJournal } from '../operationalMemory/eventJournal.js';
import {
  getGovernedContextToolDependencies
} from '../tools/governedContext.js';
import {
  sessionRequestFromToolExtra,
  type GovernedSessionToolExtra
} from '../tools/governedSessions.js';

type HandlerExtra = RequestHandlerExtra<ServerRequest, ServerNotification>;
type Callback = (...args: any[]) => any;

export type ShadowWriteDecision = {
  mode: 'off' | 'shadow';
  toolName: string;
  governedSessionId: string | null;
  currentStateVersion: number | null;
  acknowledgedStateVersion: number | null;
  activeLockConflicts: number;
  verdict:
    | 'off'
    | 'session_unbound'
    | 'context_unacknowledged'
    | 'state_version_stale'
    | 'lock_conflict'
    | 'bootstrap_receipt_missing'
    | 'bootstrap_receipt_stale'
    | 'task_unclaimed'
    | 'audit_baseline_invalid'
    | 'shadow_ready';
  bootstrapReceiptStatus?: 'MISSING' | 'CURRENT' | 'STALE' | 'EXPIRED' | null;
  currentTaskStatus?: string | null;
  auditBaselineValid?: boolean | null;
};

export type ShadowWriteOutcome = 'succeeded' | 'failed' | 'cancelled';

export type ScopedWriteGateDependencies = {
  mode: 'off' | 'shadow';
  evaluate(extra: HandlerExtra): Promise<ShadowWriteDecision>;
  record(decision: ShadowWriteDecision, outcome: ShadowWriteOutcome): Promise<void>;
  requestReconcile(): void;
};

export type ShadowWriteDecisionInput = Omit<ShadowWriteDecision, 'verdict'> & {
  currentFreshness: 'CURRENT' | 'STALE' | null;
};

export function deriveShadowWriteDecision(
  input: ShadowWriteDecisionInput
): ShadowWriteDecision {
  let verdict: ShadowWriteDecision['verdict'];
  if (input.mode === 'off') verdict = 'off';
  else if (!input.governedSessionId) verdict = 'session_unbound';
  else if (input.currentStateVersion === null || input.currentFreshness !== 'CURRENT') {
    verdict = 'state_version_stale';
  } else if (input.acknowledgedStateVersion === null) verdict = 'context_unacknowledged';
  else if (input.acknowledgedStateVersion !== input.currentStateVersion) {
    verdict = 'state_version_stale';
  } else if (input.activeLockConflicts > 0) verdict = 'lock_conflict';
  else if (input.bootstrapReceiptStatus !== undefined && input.bootstrapReceiptStatus !== 'CURRENT') {
    verdict = input.bootstrapReceiptStatus === 'MISSING' || input.bootstrapReceiptStatus === null
      ? 'bootstrap_receipt_missing'
      : 'bootstrap_receipt_stale';
  } else if (Object.prototype.hasOwnProperty.call(input, 'currentTaskStatus') && !input.currentTaskStatus) {
    verdict = 'task_unclaimed';
  } else if (input.auditBaselineValid === false) verdict = 'audit_baseline_invalid';
  else verdict = 'shadow_ready';
  const { currentFreshness: _currentFreshness, ...decision } = input;
  return { ...decision, verdict };
}

function callbackExtra(args: unknown[]): HandlerExtra {
  return (args.length >= 2 ? args[1] : args[0]) as HandlerExtra;
}

function preserveArity(callback: Callback, invoke: (thisArg: unknown, args: unknown[]) => Promise<unknown>): Callback {
  if (callback.length === 0) {
    return async function(this: unknown) {
      return invoke(this, [...arguments]);
    };
  }
  if (callback.length === 1) {
    return async function(this: unknown, first: unknown) {
      return invoke(this, [...arguments]);
    };
  }
  if (callback.length === 2) {
    return async function(this: unknown, first: unknown, second: unknown) {
      return invoke(this, [...arguments]);
    };
  }
  return async function(this: unknown, first: unknown, second: unknown, third: unknown) {
    return invoke(this, [...arguments]);
  };
}

function shadowFailure(toolName: string): void {
  logger.warn({ toolName, reasonCode: 'shadow_observation_failed' },
    'Observation WRITE shadow impossible; issue historique conservée');
}

function wrapCallback(
  toolName: string,
  callback: Callback,
  dependencies: ScopedWriteGateDependencies
): Callback {
  async function observe(args: unknown[], outcome: ShadowWriteOutcome): Promise<void> {
    try {
      const evaluated = await dependencies.evaluate(callbackExtra(args));
      const decision: ShadowWriteDecision = {
        ...evaluated,
        mode: dependencies.mode,
        toolName
      };
      await dependencies.record(decision, outcome);
    } catch {
      shadowFailure(toolName);
    }
  }

  return preserveArity(callback, async (thisArg, args) => {
    let result: unknown;
    try {
      result = await Reflect.apply(callback, thisArg, args);
    } catch (error) {
      void observe(args, error instanceof Error && error.name === 'AbortError'
        ? 'cancelled'
        : 'failed');
      throw error;
    }
    void observe(args, 'succeeded');
    try {
      dependencies.requestReconcile();
    } catch {
      shadowFailure(toolName);
    }
    return result;
  });
}

export function decorateScopedWriteServer(
  server: McpServer,
  dependencies: ScopedWriteGateDependencies
): McpServer {
  if (dependencies.mode === 'off') return server;

  return new Proxy(server, {
    get(target, property) {
      const value = Reflect.get(target, property, target);
      if (
        (property === 'tool' || property === 'registerTool')
        && typeof value === 'function'
      ) {
        return (...registrationArgs: unknown[]) => {
          const callback = registrationArgs.at(-1);
          if (typeof callback !== 'function') {
            return Reflect.apply(value, target, registrationArgs);
          }
          const toolName = typeof registrationArgs[0] === 'string'
            ? registrationArgs[0]
            : 'unknown_scoped_write_tool';
          const decoratedArgs = [
            ...registrationArgs.slice(0, -1),
            wrapCallback(toolName, callback as Callback, dependencies)
          ];
          return Reflect.apply(value, target, decoratedArgs);
        };
      }
      return typeof value === 'function' ? value.bind(target) : value;
    }
  });
}

let defaultDependencies: ScopedWriteGateDependencies | null = null;

export function getDefaultScopedWriteGateDependencies(): ScopedWriteGateDependencies {
  if (defaultDependencies) return defaultDependencies;
  if (!operationalMemoryConfig.enabled) {
    defaultDependencies = {
      mode: 'off',
      async evaluate() {
        return deriveShadowWriteDecision({
          mode: 'off',
          toolName: 'governed_sessions_disabled',
          governedSessionId: null,
          currentStateVersion: null,
          currentFreshness: null,
          acknowledgedStateVersion: null,
          activeLockConflicts: 0
        });
      },
      async record() {},
      requestReconcile() {}
    };
    return defaultDependencies;
  }
  const contextDependencies = getGovernedContextToolDependencies();
  const journal = getDefaultOperationalEventJournal({
    filePath: operationalMemoryConfig.eventJournalPath,
    maxBytes: operationalMemoryConfig.eventMaxBytes,
    archives: operationalMemoryConfig.eventArchives
  });
  defaultDependencies = {
    mode: operationalMemoryConfig.writeGateMode,
    async evaluate(extra) {
      const toolExtra = extra as GovernedSessionToolExtra;
      const request = sessionRequestFromToolExtra(toolExtra);
      const governedSessionId = contextDependencies.sessions.lookupGovernedSessionId(
        toolExtra.sessionId
      );
      const context = await contextDependencies.context.getCurrent({
        governedSessionId,
        workBranch: null,
        request
      });
      const activeLockConflicts = context.activeLocks.filter((lock) => (
        lock.status === 'ACTIVE'
        && lock.governedSessionId !== governedSessionId
      )).length;
      return deriveShadowWriteDecision({
        mode: operationalMemoryConfig.writeGateMode,
        toolName: 'pending_registration_name',
        governedSessionId,
        currentStateVersion: context.liveState?.stateVersion ?? null,
        currentFreshness: context.liveState?.freshness ?? null,
        acknowledgedStateVersion: context.session?.lastAcknowledgedStateVersion ?? null,
        activeLockConflicts,
        bootstrapReceiptStatus: context.bootstrap.status,
        currentTaskStatus: context.currentTask?.status ?? null,
        auditBaselineValid: context.currentState.auditBaselineValid
      });
    },
    async record(decision, outcome) {
      await journal.append({
        type: 'scoped_write.shadow',
        governedSessionId: decision.governedSessionId,
        metadata: {
          toolName: decision.toolName,
          decision: `${decision.verdict}:${outcome}`,
          stateVersion: decision.currentStateVersion,
          lockConflict: decision.activeLockConflicts > 0
        }
      });
    },
    requestReconcile() {
      void liveStateEngine.reconcileNow().catch(() => undefined);
    }
  };
  return defaultDependencies;
}
