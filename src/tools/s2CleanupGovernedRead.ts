import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { runReadOnlyCommand } from '../ssh/client.js';
import { asText } from './format.js';
import { getGovernedSessionToolDependencies, sessionRequestFromToolExtra } from './governedSessions.js';

/** Historical REVIEW paths, never an allowlist for deletion. */
export const S2_LEGACY_TARGETS = {
  "wti_pccet_api": "/var/www/vhosts/wealthtechinnovations.ci/api.pccet.wealthtechinnovations.ci",
  "wti_api": "/var/www/vhosts/wealthtechinnovations.ci/api.wealthtechinnovations.ci",
  "wti_evote": "/var/www/vhosts/wealthtechinnovations.ci/evote.wealthtechinnovations.ci",
  "wti_pccet": "/var/www/vhosts/wealthtechinnovations.ci/pccet.wealthtechinnovations.ci",
  "wti_apex": "/var/www/vhosts/wealthtechinnovations.ci",
  "opcvm_legacy": "/var/www/vhosts/chainsolutions.fr/opcvm.chainsolutions.fr"
} as const;
export type S2LegacyTarget = keyof typeof S2_LEGACY_TARGETS;
const TargetSchema = z.enum(["wti_pccet_api","wti_api","wti_evote","wti_pccet","wti_apex","opcvm_legacy"]);
const json = (value: unknown) => asText(JSON.stringify(value, null, 2));

/** Fixed, non-mutating probe: no caller-provided shell expression or file contents. */
export function buildS2LegacyProbeCommand(target: S2LegacyTarget): string {
  const fixedPath = S2_LEGACY_TARGETS[target];
  return `set -eu
TARGET='${fixedPath}'
printf 'target=%s\\n' "$TARGET"
if test -L "$TARGET"; then printf 'status=SYMLINK_BLOCKED\\n'; exit 0; fi
if ! test -d "$TARGET"; then printf 'status=ABSENT\\n'; exit 0; fi
REAL="$(realpath -e -- "$TARGET")"
if test "$REAL" != "$TARGET"; then printf 'status=NONCANONICAL_BLOCKED\\n'; exit 0; fi
printf 'status=PRESENT_NEEDS_DEPENDENCY_PROOF\\n'
printf 'realpath=%s\\n' "$REAL"
printf 'allocated_bytes='
du -sB1 -- "$TARGET" | cut -f1
printf 'top_level_metadata_begin\\n'
find "$TARGET" -mindepth 1 -maxdepth 1 -printf '%y %s %f\\n' | sort | head -60
printf 'top_level_metadata_end\\n'`;
}

export function cleanupS2DisposalPolicy() {
  return {
    schemaVersion: 1, server: 's2', status: 'ADVISORY_ONLY',
    writesPerformed: false, deletionAllowed: false,
    categories: [
      { category: 'REBUILDABLE_BUILD_CACHE', backupOptional: true,
        requirements: ['FIXED_PATH', 'NO_SYMLINK', 'REBUILD_VERIFIED', 'NO_ACTIVE_PROCESS_DEPENDENCY',
          'EXACT_OWNER_APPROVAL', 'GOVERNED_SESSION_AND_LOCK', 'SCOPED_EXECUTOR', 'POST_HEALTHCHECK'] },
      { category: 'SOURCE_CODE', backupOptional: false,
        requirements: ['REMOTE_GIT_SHA_ATTESTED', 'WORKTREE_PRESERVED', 'RESTORE_CHECK'] },
      { category: 'DATABASE_UPLOADS', backupOptional: false,
        requirements: ['INDEPENDENT_BACKUP', 'RESTORE_TEST', 'DATA_DEPENDENCY_CHECK'] },
      { category: 'PLESK_BACKUP_INCREMENTAL', backupOptional: false,
        requirements: ['BACKUP_CHAIN_CHECK', 'RETENTION_POLICY', 'RESTORABLE_ALTERNATIVE'] },
      { category: 'SECRETS_CONFIG', backupOptional: false,
        requirements: ['ENCRYPTED_SECRET_STORE', 'RECOVERY_PLAN', 'NEVER_GITHUB'] }
    ],
    limits: ['Historical vhosts are not by definition rebuildable caches.',
      'The protected S2 subscription chainsolutions.fr and original Stablecoin deployments remain protected.',
      'Backup may be optional for an attestably rebuildable cache; deletion permission is NEVER inferred.']
  };
}
export function cleanupS2GitPolicy() {
  return {
    schemaVersion: 1, status: 'PLAN_ONLY', repositoryCreated: false,
    copyPerformed: false, privateRepositoryRequired: true,
    acceptable: ['inspected code source', 'non-secret project documentation', 'versioned deployment metadata'],
    prohibited: ['credentials or .env', 'SSH keys', 'database dumps', 'personal uploads',
      'Plesk backups', 'build caches and node_modules'],
    workflow: ['check existing canonical Git repository first', 'select owner/organization and verify repo-create permission',
      'create private repository only via authorized GitHub identity',
      'review exclusions before any commit', 'push to governed branch',
      'attest exact commit SHA and read/restore source'],
    notes: 'GitHub source-code hosting is not a replacement for encrypted restorable server backups.'
  };
}
export function credentialRotationPlan() {
  return {
    schemaVersion: 1, status: 'TARGET_ACCOUNT_REQUIRED',
    changed: false, acceptsRawPassword: false,
    targets: [
      { system: 'S2_PLESK', kind: 'password', method: 'provider-native authorized password rotation' },
      { system: 'S2_SSH', kind: 'key or password', method: 'staged key replacement, proof, then old key revocation' },
      { system: 'MCP_OAUTH', kind: 'OAuth secret/token', method: 'client-aware revoke and re-authorize flow' },
      { system: 'GITHUB_APP', kind: 'private key or installation token', method: 'rotate GitHub App key in protected secret store' }
    ],
    blockers: ['exact account not specified', 'must not put passwords in MCP arguments or GitHub files',
      'rotation requires authorized provider scope, rollback and continuity verification']
  };
}

export function registerS2CleanupGovernedReadTools(server: McpServer): void {
  server.tool('cleanup_legacy_target_preflight_s2',
    'Mesure un des six anciens répertoires S2 en lecture seule, sans suppression.',
    { target: TargetSchema },
    async ({ target }) => {
      try {
        const r = await runReadOnlyCommand('s2', buildS2LegacyProbeCommand(target), 90_000, 20_000);
        const observed = r.code === 0 && !r.stdout.includes('...[sortie plafonnée par le MCP]');
        return json({ target, server: 's2', path: S2_LEGACY_TARGETS[target],
          status: observed ? 'OBSERVED_UNVERIFIED_USAGE' : 'READ_FAILED_OR_TRUNCATED',
          output: observed ? r.stdout : null, writesPerformed: false, deletionAllowed: false,
          pending: ['PLESK_OWNERSHIP', 'RUNTIME_DEPENDENCIES', 'RESTORATION', 'GOVERNED_TARGET_PERMISSION'] });
      } catch {
        return json({ target, server: 's2', status: 'SSH_PROBE_UNAVAILABLE',
          writesPerformed: false, deletionAllowed: false });
      }
    });
  server.tool('mcp_transport_rebinding_preflight',
    'Observe la session liée au transport MCP courant sans changer ni fermer de session.',
    {}, async (_input, extra) => {
      try {
        const request = sessionRequestFromToolExtra(extra);
        const sessions = getGovernedSessionToolDependencies().sessions;
        const boundId = sessions.lookupGovernedSessionId(request.transportSessionId);
        const owned = boundId ? await sessions.getVisibleSession(boundId, request) : null;
        return json({ status: boundId ? 'ALREADY_BOUND' : 'UNBOUND',
          ownedSession: owned ? { id: owned.governedSessionId, status: owned.status,
            repository: owned.repository } : null,
          switched: false, writesPerformed: false,
          nextAction: boundId ? 'Establish a fresh MCP transport; verify OAuth identity and recheck the binding; never take over Regulatory.'
            : 'Open a governed session with an independently validated project scope.' });
      } catch {
        return json({ status: 'AUTH_OR_TRANSPORT_UNVERIFIED', switched: false, writesPerformed: false });
      }
    });
  server.tool('mcp_credential_rotation_preflight',
    'Prépare le changement du mot de passe Plesk/SSH ou la rotation OAuth/GitHub App sans recueillir de secret.',
    {}, async () => json(credentialRotationPlan()));
  server.tool('cleanup_disposal_policy_s2',
    'Classe les contenus S2; sauvegarde facultative uniquement pour cache reconstruisible prouvé.',
    {}, async () => json(cleanupS2DisposalPolicy()));
  server.tool('cleanup_github_backup_policy_s2',
    'Prépare un dépôt GitHub privé pour le code S2 sans sauvegarder de secrets ni créer de dépôt.',
    {}, async () => json(cleanupS2GitPolicy()));
}
