import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { runReadOnlyCommand } from '../ssh/client.js';
import { asText } from './format.js';

// Fixed, reviewable legacy project scope. NOT a deletion allowlist.
// Plesk ownership and actual running-process references remain separate facts.
export const FUNDS_SUBSCRIPTION_ROOT = '/var/www/vhosts/chainsolutions.fr';
export const FUNDS_LEGACY_APP = FUNDS_SUBSCRIPTION_ROOT + '/Funds.chainsolutions.fr/front_end_opcvm';
export const FUNDS_LEGACY_CACHE = FUNDS_LEGACY_APP + '/.next/cache';

export type FundsCachePreflight = {
  schemaVersion: 1;
  server: 's2';
  operation: 'FUNDS_LEGACY_CACHE_PREFLIGHT';
  status: 'UNVERIFIED' | 'BLOCKED_SYMLINK_OR_ESCAPE' | 'CACHE_ABSENT' | 'INSPECTED_NEEDS_RUNTIME_PROOF';
  deletionAllowed: false;
  quarantineAllowed: false;
  writesPerformed: false;
  selectedPath: string;
  candidateSizeBytes: number | null; // du allocated bytes, NOT guaranteed reclaimable disk space
  packageManifestPresent: boolean | null;
  nextBuildIdPresent: boolean | null;
  evidence: 'FIXED_PATH_READ_ONLY_FILESYSTEM';
  blockers: string[];
};

function blocked(status: FundsCachePreflight['status'], blockers: string[], size: number | null = null,
  manifest: boolean | null = null, build: boolean | null = null): FundsCachePreflight {
  return {
    schemaVersion: 1,
    server: 's2',
    operation: 'FUNDS_LEGACY_CACHE_PREFLIGHT',
    status,
    deletionAllowed: false,
    quarantineAllowed: false,
    writesPerformed: false,
    selectedPath: FUNDS_LEGACY_CACHE,
    candidateSizeBytes: size,
    packageManifestPresent: manifest,
    nextBuildIdPresent: build,
    evidence: 'FIXED_PATH_READ_ONLY_FILESYSTEM',
    blockers
  };
}

/**
 * Bounded fixed-layout observation. A cache's age, size or existence never
 * proves that it is unused. Malformed or incomplete evidence fails closed.
 */
export function parseFundsCachePreflight(stdout: string, code: number | null): FundsCachePreflight {
  if (code !== 0 || typeof stdout !== 'string' || stdout.length > 8_192 ||
      stdout.includes('...[sortie plafonnée par le MCP]')) {
    return blocked('UNVERIFIED', ['PROBE_FAILED_OR_TRUNCATED']);
  }
  const expected = ['base_real', 'app_real', 'cache_real', 'app_present',
    'cache_present', 'any_symlink', 'cache_bytes', 'manifest_present', 'build_id_present'];
  const lines = stdout.trimEnd().split(/\r?\n/);
  const values = new Map<string, string>();
  for (const line of lines) {
    const index = line.indexOf('=');
    if (index <= 0) return blocked('UNVERIFIED', ['MALFORMED_OBSERVATION']);
    const key = line.slice(0, index);
    if (!expected.includes(key) || values.has(key)) {
      return blocked('UNVERIFIED', ['UNEXPECTED_OR_DUPLICATE_OBSERVATION']);
    }
    values.set(key, line.slice(index + 1));
  }
  if (values.size !== expected.length) return blocked('UNVERIFIED', ['INCOMPLETE_OBSERVATION']);
  for (const key of ['app_present', 'cache_present', 'any_symlink', 'manifest_present', 'build_id_present']) {
    if (!['true', 'false'].includes(values.get(key) ?? '')) {
      return blocked('UNVERIFIED', ['INVALID_BOOLEAN_OBSERVATION']);
    }
  }
  const sizeField = values.get('cache_bytes') ?? '';
  if (!/^(0|[1-9][0-9]*)$/.test(sizeField)) {
    return blocked('UNVERIFIED', ['INVALID_SIZE_OBSERVATION']);
  }
  const bytes = Number(sizeField);
  if (!Number.isSafeInteger(bytes)) {
    return blocked('UNVERIFIED', ['INVALID_SIZE_OBSERVATION']);
  }
  const manifest = values.get('manifest_present') === 'true';
  const build = values.get('build_id_present') === 'true';
  if (values.get('any_symlink') === 'true' ||
      values.get('base_real') !== FUNDS_SUBSCRIPTION_ROOT ||
      (values.get('app_present') === 'true' && values.get('app_real') !== FUNDS_LEGACY_APP) ||
      (values.get('cache_present') === 'true' && values.get('cache_real') !== FUNDS_LEGACY_CACHE)) {
    return blocked('BLOCKED_SYMLINK_OR_ESCAPE',
      ['SYMLINK_OR_NONCANONICAL_FIXED_PATH', 'PLESK_RUNTIME_MAPPING_NOT_VERIFIED'], null, manifest, build);
  }
  if (values.get('app_present') === 'false') {
    return blocked('UNVERIFIED', ['EXPECTED_APPLICATION_DIRECTORY_NOT_FOUND']);
  }
  if (values.get('cache_present') === 'false') {
    if (values.get('cache_real') !== '' || bytes !== 0) {
      return blocked('UNVERIFIED', ['CACHE_ABSENCE_CONTRADICTION']);
    }
    return blocked('CACHE_ABSENT', ['NO_CACHE_TO_CLEAN', 'PLESK_RUNTIME_MAPPING_NOT_VERIFIED'],
      0, manifest, build);
  }
  return blocked('INSPECTED_NEEDS_RUNTIME_PROOF', [
    'PLESK_RUNTIME_MAPPING_NOT_VERIFIED',
    'PROCESS_OPEN_FILES_NOT_ATTESTED',
    'BACKUP_AND_RESTORE_TEST_NOT_ATTESTED',
    'ALLOCATED_DISK_BYTES_NOT_PROVEN_RECLAIMABLE',
    'OWNER_EXACT_TARGET_CONSENT_NOT_ATTESTED',
    'GOVERNED_SESSION_CLAIM_LOCKS_NOT_ATTESTED'
  ], bytes, manifest, build);
}

// No caller input, no free shell, no dynamic paths or mutating commands.
// Symlink checks cover each fixed component before inspecting the cache.
// Directory metadata and allocated disk blocks only; no file contents or secrets.
export const FUNDS_CACHE_PREFLIGHT_COMMAND = String.raw`set -eu
BASE='/var/www/vhosts/chainsolutions.fr'
APP="$BASE/Funds.chainsolutions.fr/front_end_opcvm"
CACHE="$APP/.next/cache"
SYMLINK=false
for P in /var/www /var/www/vhosts "$BASE" "$BASE/Funds.chainsolutions.fr" "$APP" "$APP/.next" "$CACHE"; do
  if test -L "$P"; then SYMLINK=true; fi
done
APP_PRESENT=false
CACHE_PRESENT=false
MANIFEST_PRESENT=false
BUILD_PRESENT=false
if test -d "$APP"; then APP_PRESENT=true; fi
if test -d "$CACHE"; then CACHE_PRESENT=true; fi
if test -f "$APP/package.json"; then MANIFEST_PRESENT=true; fi
if test -f "$APP/.next/BUILD_ID"; then BUILD_PRESENT=true; fi
printf 'base_real=%s\n' "$(realpath -e -- "$BASE" 2>/dev/null || true)"
printf 'app_real=%s\n' "$(realpath -e -- "$APP" 2>/dev/null || true)"
printf 'cache_real=%s\n' "$(realpath -e -- "$CACHE" 2>/dev/null || true)"
printf 'app_present=%s\n' "$APP_PRESENT"
printf 'cache_present=%s\n' "$CACHE_PRESENT"
printf 'any_symlink=%s\n' "$SYMLINK"
if test "$SYMLINK" = false && test "$CACHE_PRESENT" = true; then
  if DU_OUTPUT="$(du -sB1 -- "$CACHE" 2>/dev/null)"; then
    printf 'cache_bytes=%s\n' "${DU_OUTPUT%%[!0-9]*}"
  else
    exit 27
  fi
else
  printf 'cache_bytes=0\n'
fi
printf 'manifest_present=%s\n' "$MANIFEST_PRESENT"
printf 'build_id_present=%s\n' "$BUILD_PRESENT"`;

export function registerFundsCacheReadOnlyPreflight(server: McpServer): void {
  server.tool(
    'cleanup_cache_preflight_funds_s2',
    'Inspecte en lecture seule le cache de build historique Funds sur S2, sans purge ni quarantaine.',
    {},
    async () => {
      try {
        const observation = await runReadOnlyCommand('s2', FUNDS_CACHE_PREFLIGHT_COMMAND, 90_000, 16_384);
        return asText(JSON.stringify(parseFundsCachePreflight(observation.stdout, observation.code), null, 2));
      } catch {
        return asText(JSON.stringify(blocked('UNVERIFIED', ['READ_ONLY_OBSERVATION_UNAVAILABLE'])));
      }
    }
  );
}
