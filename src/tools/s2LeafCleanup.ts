import { createHash } from 'node:crypto';
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { env } from '../config/env.js';
import { runReadOnlyCommand, runGuardedCommand } from '../ssh/client.js';
import { assertScopedWriteToolsEnabled, assertWriteFlag } from '../ssh/writeSafety.js';
import { getGovernedSessionToolDependencies, sessionRequestFromToolExtra } from './governedSessions.js';
import { liveStateEngine } from '../liveState/engine.js';
import { asText } from './format.js';
import { getGovernedTaskToolDependencies } from './governedTasks.js';
import { PROGRAM_REPOSITORY } from '../governance/programBlueprintMaterialization.js';
import type { BootstrapReceipt, GovernedTaskRecord } from '../operationalMemory/types.js';

/** Five explicit leaf paths for inspection, never a deletion allowlist. The shared parent is excluded. */
export const S2_LEAF_TARGETS = {
  "pccet_api": {
    "domain": "api.pccet.wealthtechinnovations.ci",
    "path": "/var/www/vhosts/wealthtechinnovations.ci/api.pccet.wealthtechinnovations.ci"
  },
  "wti_api": {
    "domain": "api.wealthtechinnovations.ci",
    "path": "/var/www/vhosts/wealthtechinnovations.ci/api.wealthtechinnovations.ci"
  },
  "evote": {
    "domain": "evote.wealthtechinnovations.ci",
    "path": "/var/www/vhosts/wealthtechinnovations.ci/evote.wealthtechinnovations.ci"
  },
  "pccet": {
    "domain": "pccet.wealthtechinnovations.ci",
    "path": "/var/www/vhosts/wealthtechinnovations.ci/pccet.wealthtechinnovations.ci"
  },
  "opcvm": {
    "domain": "opcvm.chainsolutions.fr",
    "path": "/var/www/vhosts/chainsolutions.fr/opcvm.chainsolutions.fr"
  }
} as const;
export type S2LeafKey = keyof typeof S2_LEAF_TARGETS;
const TargetSchema = z.enum(["pccet_api","wti_api","evote","pccet","opcvm"]);
const PROBE_LINES: readonly string[] = [
  "set -euo pipefail",
  "TARGET='__TARGET__'",
  "DOMAIN='__DOMAIN__'",
  "test \"$(id -u)\" = 0 || exit 40",
  "test -d \"$TARGET\" && test ! -L \"$TARGET\" || exit 41",
  "for P in /var /var/www /var/www/vhosts \"$(dirname \"$TARGET\")\" \"$TARGET\"; do test ! -L \"$P\" || exit 42; done",
  "test \"$(realpath -e -- \"$TARGET\")\" = \"$TARGET\" || exit 43",
  "test -z \"$(find \"$TARGET\" -type l -print -quit)\" || exit 44",
  "command -v plesk >/dev/null || exit 45",
  "DOMAINS=\"$(plesk bin domain --list 2>/dev/null)\" || exit 46",
  "if printf '%s\\n' \"$DOMAINS\" | grep -Fxq -- \"$DOMAIN\"; then exit 47; fi",
  "test -d /etc/nginx/plesk.conf.d || exit 48",
  "test -d /etc/apache2/plesk.conf.d || exit 49",
  "set +e",
  "grep -RFq -- \"$TARGET\" /etc/nginx/plesk.conf.d /etc/apache2/plesk.conf.d",
  "CONFIG_SCAN_RC=$?",
  "set -e",
  "test \"$CONFIG_SCAN_RC\" = 1 || exit 50",
  "command -v lsof >/dev/null || exit 51",
  "set +e",
  "timeout 30 lsof +D \"$TARGET\" >/dev/null 2>&1",
  "LSOF_RC=$?",
  "set -e",
  "test \"$LSOF_RC\" = 1 || exit 52",
  "BYTES=\"$(du -sB1 -- \"$TARGET\" | cut -f1)\"",
  "case \"$BYTES\" in ''|*[!0-9]*) exit 53;; esac",
  "META_HASH=\"$(find \"$TARGET\" -printf '%P|%y|%s|%T@|%i\\n' | LC_ALL=C sort | sha256sum | cut -d ' ' -f1)\"",
  "CONTENT_HASH=\"$(find \"$TARGET\" -type f -exec sha256sum -- {} + | LC_ALL=C sort | sha256sum | cut -d ' ' -f1)\"",
  "FINGERPRINT=\"$(printf '%s\\n%s\\n' \"$META_HASH\" \"$CONTENT_HASH\" | sha256sum | cut -d ' ' -f1)\"",
  "test \"$(printf '%s' \"$FINGERPRINT\" | wc -c)\" = 64 || exit 54",
  "printf 'target=__KEY__\\n'",
  "printf 'bytes=%s\\n' \"$BYTES\"",
  "printf 'fingerprint=%s\\n' \"$FINGERPRINT\"",
  "printf 'dependencies=PLESK_UNBOUND_NO_OPEN_HANDLES\\n'"
];
const EXEC_LINES: readonly string[] = [
  "test \"$FINGERPRINT\" = '__EXPECTED__' || exit 60",
  "umask 077",
  "QBASE='/var/backups/wealthtech-mcp/s2-cleanup-quarantine'",
  "QROOT=\"$QBASE/__KEY__\"",
  "DEST=\"$QROOT/__OP_ID__\"",
  "test ! -e \"$DEST\" && test ! -L \"$DEST\" || exit 61",
  "mkdir -p -m 0700 -- \"$QROOT\"",
  "for P in /var/backups /var/backups/wealthtech-mcp \"$QBASE\" \"$QROOT\"; do",
  "  test -d \"$P\" && test ! -L \"$P\" || exit 68",
  "  test \"$(realpath -e -- \"$P\")\" = \"$P\" || exit 69",
  "  test \"$(stat -c '%u' -- \"$P\")\" = 0 || exit 70",
  "done",
  "test \"$(stat -c '%a' -- \"$QBASE\")\" = 700 || exit 71",
  "test \"$(stat -c '%a' -- \"$QROOT\")\" = 700 || exit 72",
  "test \"$(stat -c '%d' \"$TARGET\")\" = \"$(stat -c '%d' \"$QROOT\")\" || exit 62",
  "RECEIPT=\"$QROOT/__OP_ID__.receipt\"",
  "test ! -e \"$RECEIPT\" && test ! -e \"$RECEIPT.pending\" || exit 63",
  "printf 'state=PENDING\\ntarget=__KEY__\\noriginal=%s\\nfingerprint=%s\\n' \"$TARGET\" \"$FINGERPRINT\" > \"$RECEIPT.pending\"",
  "mv -T -- \"$TARGET\" \"$DEST\"",
  "test ! -e \"$TARGET\" && test ! -L \"$TARGET\" && test -d \"$DEST\" || exit 64",
  "printf 'state=QUARANTINED\\ntarget=__KEY__\\noriginal=%s\\nquarantine=%s\\nfingerprint=%s\\nbytes=%s\\n' \"$TARGET\" \"$DEST\" \"$FINGERPRINT\" \"$BYTES\" > \"$RECEIPT.tmp\"",
  "mv -T -- \"$RECEIPT.tmp\" \"$RECEIPT\"",
  "rm -f -- \"$RECEIPT.pending\"",
  "test -s \"$RECEIPT\" || exit 65",
  "printf 'status=QUARANTINED\\nreceipt=%s\\n' \"$RECEIPT\""
];
const asJson = (value: unknown) => asText(JSON.stringify(value, null, 2));

export function buildS2LeafProbe(key: S2LeafKey): string {
  const target = S2_LEAF_TARGETS[key];
  return PROBE_LINES.join('\n').replaceAll('__TARGET__', target.path)
    .replaceAll('__DOMAIN__', target.domain).replaceAll('__KEY__', key);
}
export function buildS2LeafQuarantine(key: S2LeafKey, fingerprint: string, operationId: string): string {
  const probe = buildS2LeafProbe(key);
  const tail = EXEC_LINES.join('\n').replaceAll('__EXPECTED__', fingerprint)
    .replaceAll('__KEY__', key).replaceAll('__OP_ID__', operationId);
  return ['set -euo pipefail', 'exec 9>/run/lock/wealthtech-mcp-s2-cleanup.lock',
    'flock -n 9 || exit 59', probe, tail].join('\n');
}
export type S2LeafInspection = {
  server: 's2'; target: S2LeafKey; path: string; domain: string;
  status: 'BLOCKED' | 'OPERATOR_APPROVAL_REQUIRED';
  fingerprint: string | null; allocatedBytes: number | null;
  blockers: string[]; writesPerformed: false; deletionAllowed: false;
};
export function parseS2LeafInspection(key: S2LeafKey, output: string, exitCode: number | null): S2LeafInspection {
  const target = S2_LEAF_TARGETS[key];
  const blocked = (reason: string): S2LeafInspection => ({
    server: 's2', target: key, path: target.path, domain: target.domain,
    status: 'BLOCKED', fingerprint: null, allocatedBytes: null,
    blockers: [reason], writesPerformed: false, deletionAllowed: false
  });
  if (exitCode !== 0 || output.length > 2048 || output.includes('...[sortie plafonnée par le MCP]'))
    return blocked('SSH_PROBE_FAILED_OR_TRUNCATED');
  const lines = output.trimEnd().split(/\r?\n/);
  if (lines.length !== 4) return blocked('INCOMPLETE_PROBE');
  const values = new Map<string, string>();
  for (const line of lines) {
    const index = line.indexOf('=');
    if (index < 1) return blocked('MALFORMED_PROBE');
    const name = line.slice(0, index);
    if (values.has(name)) return blocked('DUPLICATE_PROBE_VALUE');
    values.set(name, line.slice(index + 1));
  }
  if (values.size !== 4 || values.get('target') !== key ||
      values.get('dependencies') !== 'PLESK_UNBOUND_NO_OPEN_HANDLES') {
    return blocked('INVALID_TARGET_OR_DEPENDENCIES');
  }
  const rawSize = values.get('bytes') ?? '';
  const fp = values.get('fingerprint') ?? '';
  if (!/^(0|[1-9][0-9]*)$/.test(rawSize) || !/^[a-f0-9]{64}$/.test(fp)) {
    return blocked('MALFORMED_SIZE_OR_FINGERPRINT');
  }
  const bytes = Number(rawSize);
  if (!Number.isSafeInteger(bytes)) return blocked('INVALID_SIZE');
  return { server:'s2', target:key, path:target.path, domain:target.domain,
    status:'OPERATOR_APPROVAL_REQUIRED', fingerprint:fp, allocatedBytes:bytes,
    blockers:['TRUSTED_OPERATOR_FINGERPRINT_APPROVAL_REQUIRED','GOVERNED_SESSION_AND_LOCK_REQUIRED',
      'EXACT_DOMAIN_CONFIRMATION_REQUIRED','RESTORE_AND_POSTCHECK_REQUIRED'],
    writesPerformed:false, deletionAllowed:false };
}
export function assertS2OperatorApproval(
  key: S2LeafKey, fingerprint: string,
  config: Record<string,string|undefined> = process.env
): void {
  if (config.MCP_S2_CLEANUP_EXECUTION_ENABLED !== 'true') throw new Error('S2_CLEANUP_DISABLED');
  const raw = config.MCP_S2_CLEANUP_APPROVED_FINGERPRINTS;
  if (!raw || raw.length > 4096) throw new Error('S2_CLEANUP_APPROVAL_MISSING');
  let approved: unknown;
  try { approved = JSON.parse(raw); } catch { throw new Error('S2_CLEANUP_APPROVAL_INVALID'); }
  if (!approved || typeof approved !== 'object' || Array.isArray(approved))
    throw new Error('S2_CLEANUP_APPROVAL_INVALID');
  if ((approved as Record<string,unknown>)[key] !== fingerprint)
    throw new Error('S2_CLEANUP_APPROVAL_FINGERPRINT_MISMATCH');
}
async function inspect(key: S2LeafKey): Promise<S2LeafInspection> {
  try {
    const result = await runReadOnlyCommand('s2', buildS2LeafProbe(key), 120_000, 4096);
    return parseS2LeafInspection(key, result.stdout, result.code);
  } catch {
    return parseS2LeafInspection(key, '', null);
  }
}
type TaskAdmissionProof = Pick<GovernedTaskRecord,
  'taskId' | 'repository' | 'status' | 'ownerGovernedSessionId' | 'resourceScopes' | 'dependencies'>;

/** No authorization may be inferred from a session ACK alone. */
export function assertS2BootstrapCurrent(
  receipt: Pick<BootstrapReceipt, 'governedSessionId' | 'repository' | 'status' | 'stateVersion' | 'expiresAt'> | null | undefined,
  sessionId: string, repository: string, currentStateVersion: number, now = Date.now()
): void {
  if (!receipt || receipt.status !== 'ACKNOWLEDGED' ||
      receipt.governedSessionId !== sessionId || receipt.repository !== repository ||
      receipt.stateVersion !== currentStateVersion ||
      !Number.isFinite(Date.parse(receipt.expiresAt)) ||
      Date.parse(receipt.expiresAt) <= now) {
    throw new Error('S2_CLEANUP_BOOTSTRAP_NOT_CURRENT');
  }
}

/** A single actively owned, in-progress task must claim the exact cleanup resource. */
export function assertS2OwnedCleanupTask(
  key: S2LeafKey, sessionId: string, repository: string, tasks: readonly TaskAdmissionProof[]
): void {
  const resource = 'resource:s2-cleanup/' + key;
  const matches = tasks.filter(task => task.ownerGovernedSessionId === sessionId &&
    task.resourceScopes.includes(resource));
  const claimed = matches[0];
  if (matches.length !== 1 || !claimed || claimed.status !== 'IN_PROGRESS' ||
      claimed.repository !== repository) {
    throw new Error('S2_CLEANUP_CLAIMED_TASK_MISSING');
  }
  const statuses = new Map(tasks.map(task => [task.taskId, task.status]));
  if (claimed.dependencies.some(id => statuses.get(id) !== 'DONE')) {
    throw new Error('S2_CLEANUP_TASK_DEPENDENCY_INCOMPLETE');
  }
  if (tasks.some(task => task.taskId !== claimed.taskId &&
      task.resourceScopes.includes(resource) &&
      ['CLAIMED', 'IN_PROGRESS', 'REVIEW', 'MERGE_READY', 'DEPLOYING', 'VERIFYING'].includes(task.status))) {
    throw new Error('S2_CLEANUP_TASK_SCOPE_CONFLICT');
  }
}

async function assertGovernedS2Session(
  key: S2LeafKey, governedSessionId: string, revision: number, extra: {
    sessionId?: string; authInfo?: any
  }
): Promise<void> {
  const request = sessionRequestFromToolExtra(extra);
  const deps = getGovernedSessionToolDependencies();
  if (request.identity.assurance !== 'oauth_subject' || !request.identity.principalId)
    throw new Error('S2_CLEANUP_OAUTH_REQUIRED');
  if (deps.sessions.lookupGovernedSessionId(request.transportSessionId) !== governedSessionId)
    throw new Error('S2_CLEANUP_TRANSPORT_MISMATCH');
  const session = await deps.sessions.getVisibleSession(governedSessionId, request);
  if (!session || session.ownerPrincipalId !== request.identity.principalId ||
      session.status !== 'ACTIVE' || session.repository !== PROGRAM_REPOSITORY ||
      session.targetScope !== undefined || session.taskScope !== 'S2_LEGACY_CLEANUP') {
    throw new Error('S2_CLEANUP_SESSION_SCOPE_INVALID');
  }
  if (session.sessionRevision !== revision) throw new Error('S2_CLEANUP_SESSION_STALE');
  if (session.lastAcknowledgedStateVersion === null)
    throw new Error('S2_CLEANUP_CONTEXT_UNACKNOWLEDGED');
  const locks = await deps.locks.listActiveLocks();
  if (!locks.some(lock => lock.status === 'ACTIVE' && lock.governedSessionId === governedSessionId &&
      session.lockIds.includes(lock.lockId) && lock.scope === 'resource:s2-cleanup/' + key &&
      Date.parse(lock.expiresAt) > Date.now()))
    throw new Error('S2_CLEANUP_LOCK_MISSING');
  const state = await liveStateEngine.getCurrent();
  if (!state || state.alignment?.global !== 'FULLY_ALIGNED' ||
      state.stateVersion !== session.lastAcknowledgedStateVersion)
    throw new Error('S2_CLEANUP_LIVE_STATE_NOT_ALIGNED');
  assertS2BootstrapCurrent(session.bootstrapReceipt, governedSessionId, session.repository, state.stateVersion);
  const tasks = getGovernedTaskToolDependencies();
  await tasks.ready();
  const taskStore = await tasks.queue.listVisibleTasks();
  assertS2OwnedCleanupTask(key, governedSessionId, session.repository, taskStore.tasks);
}
export function registerS2LeafCleanupReadTools(server: McpServer): void {
  server.tool('cleanup_s2_leaf_preflight',
    'Inspection S2 d une cible fixe : Plesk, fichiers ouverts, symlinks, empreinte. Aucune écriture.',
    { target: TargetSchema }, async ({ target }) => asJson(await inspect(target)));
}
export function registerS2LeafCleanupWriteTools(server: McpServer): void {
  server.tool('cleanup_s2_leaf_quarantine',
    'Déplace réversiblement une cible enfant S2, uniquement après admission gouvernée et autorisation opérateur.',
    { target: TargetSchema, confirm_domain: z.string().min(3).max(255),
      confirm_phrase: z.literal('QUARANTINE EXACT S2 TARGET'),
      expected_fingerprint: z.string().regex(/^[a-f0-9]{64}$/),
      governed_session_id: z.string().uuid(),
      expected_session_revision: z.number().int().nonnegative(),
      allow_write: z.boolean().default(false) },
    async ({ target, confirm_domain, expected_fingerprint, governed_session_id,
      expected_session_revision, allow_write }, extra) => {
      assertScopedWriteToolsEnabled(env.ENABLE_WRITE_TOOLS);
      assertWriteFlag(allow_write, 'cleanup_s2_leaf_quarantine');
      if (confirm_domain !== S2_LEAF_TARGETS[target].domain)
        throw new Error('S2_CLEANUP_TARGET_CONFIRMATION_MISMATCH');
      assertS2OperatorApproval(target, expected_fingerprint);
      await assertGovernedS2Session(target, governed_session_id, expected_session_revision, extra);
      const before = await inspect(target);
      if (before.status !== 'OPERATOR_APPROVAL_REQUIRED' ||
          before.fingerprint !== expected_fingerprint)
        throw new Error('S2_CLEANUP_PREFLIGHT_STALE');
      const opId = String(Date.now()) + '-' +
        createHash('sha256').update(governed_session_id).digest('hex').slice(0, 12);
      const result = await runGuardedCommand('s2',
        buildS2LeafQuarantine(target, expected_fingerprint, opId),
        { intent: 'cleanup_s2_leaf_quarantine:' + target, timeoutMs: 120_000, maxOutputBytes: 4096 });
      if (result.code !== 0 || !result.stdout.includes('status=QUARANTINED\n') ||
          result.stdout.includes('...[sortie plafonnée par le MCP]'))
        throw new Error('S2_CLEANUP_QUARANTINE_RESULT_UNVERIFIED');
      const source = S2_LEAF_TARGETS[target].path;
      const post = await runReadOnlyCommand('s2',
        'test ! -e ' + "'" + source + "'" + ' && test ! -L ' + "'" + source + "'", 15_000, 1024);
      if (post.code !== 0) throw new Error('S2_CLEANUP_POSTCONDITION_FAILED');
      return asJson({ status:'QUARANTINED', target, operationId:opId, server:'s2',
        source, receipt:'/var/backups/wealthtech-mcp/s2-cleanup-quarantine/' + target + '/' + opId + '.receipt',
        observedFingerprint:expected_fingerprint, bytesRelocated:before.allocatedBytes,
        deletionPerformed:false, reclaimedDiskBytes:0, postcondition:'SOURCE_ABSENT' });
    });
}
