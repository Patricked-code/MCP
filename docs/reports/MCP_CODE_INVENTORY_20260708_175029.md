# MCP Code Inventory

Date: 2026-07-08T17:50:29+00:00
Host: crazy-mendel
Path: /opt/apps/wealthtech-mcp-ssh-bridge

## Git status
```
## main...origin/main [ahead 2]
?? docs/reports/
?? memory/CHAINSOLUTIONS_WEALTHTECH_TARGET_ORG_20260708_044836.md
?? package-lock.json
```

## Branche
```
main
```

## Derniers commits
```
22c0107 chore: add mcp codespaces onboarding workspace
d50055f chore: configure chainsolutions wealthtech github organization registry
181a7e8 docs: document ChatGPT OAuth MCP endpoints
af05c84 feat: wire OAuth endpoints into MCP server
e9956c5 feat: add OAuth-aware MCP bearer guard
2803b9f feat: add OAuth metadata and PKCE token bridge for ChatGPT MCP
bd8fe08 docs: add sanitized WealthTech migration resource index
de089eb Fix Git UI TypeScript errors
157d113 Add protected Git settings routes and registry wiring
e2ee010 Make Git registry independent from Env schema
```

## Remote
```
origin	git@github.com-mcp-patricked-rw:Patricked-code/MCP.git (fetch)
origin	git@github.com-mcp-patricked-rw:Patricked-code/MCP.git (push)
```

## Arborescence utile du code
```
./CODESPACES.md
./data/github-accounts.json
./data/mcp-git-registry.json
./.devcontainer/devcontainer.json
./docker-compose.yml
./Dockerfile
./docs/ACCESS_MCP_CLIENTS_GITHUB.md
./docs/AGENTS_ARCHITECTURE.md
./docs/AI_SKILLS.md
./docs/ARCHITECTURE.md
./docs/BACKUP_RESTORE.md
./docs/CHANGELOG.md
./docs/CODE_REVIEW.md
./docs/DATABASE.md
./docs/DEPLOYMENT_PRODUCTION.md
./docs/DOCKER.md
./docs/GPT.md
./docs/KUBERNETES_FUTURE.md
./docs/MCP_GITHUB_GUARDIAN.md
./docs/MCP_TOOLS.md
./docs/MCP_WRITE_TOOLS.md
./docs/MIGRATION.md
./docs/migration-wealthtech-2026-07-04/README.md
./docs/MONITORING.md
./docs/OAUTH_CHATGPT_CLAUDE_GITHUB.md
./docs/README_DEV.md
./docs/reports/MCP_CODE_INVENTORY_20260708_175029.md
./docs/ROADMAP.md
./docs/SECURITY.md
./docs/SUIVI.md
./docs/SUIVI_MEMOIRE_CONVERSATION_2026-07-01.md
./docs/TASKS.md
./docs/TODO.md
./MCP_AGENT_RULES.md
./.mcp/agents.json
./.mcp/manifest.json
./.mcp/onboarding.json
./.mcp/permissions.json
./MCP_PROJECT.md
./MCP_REPO_INVENTORY.md
./.mcp/server-map.json
./MCP_SERVER_MAPPING.md
./memory/2026-05-05-stablecoin-ewari-conversation-memory.md
./memory/ACTION_REQUISE_CLOTURE_OBJECTIF_LOOP_ENGINEERING_20260703.md
./memory/AUDIT_COMPLETUDE_OBJECTIF_LOOP_ENGINEERING_20260702.md
./memory/AUDIT_FINAL_COMPLETUDE_ET_READY_COMMIT_MCP_20260702.md
./memory/AUDIT_FINAL_OBJECTIF_ACTIF_LOOP_ENGINEERING_20260703.md
./memory/AUDIT_GLOBAL_S1_S2_MCP_PROMPT.md
./memory/AUDIT_OBJECTIF_ACTIF_LOOP_ENGINEERING_PREUVE_20260702.md
./memory/CHAINSOLUTIONS_WEALTHTECH_CODESPACES_CONFIGURED_20260708_052531.md
./memory/CHAINSOLUTIONS_WEALTHTECH_GITHUB_ORG_CONFIGURED_20260708_050957.md
./memory/CHAINSOLUTIONS_WEALTHTECH_TARGET_ORG_20260708_044836.md
./memory/CLOTURE_DOCUMENTS_SAFE_NON_LUS_20260703.md
./memory/CODEX_AUTO_ANALYSIS_REQUEST.md
./memory/CODEX_AUTO_ANALYSIS_RESPONSE_20260701.md
./memory/CODEX_HANDOFF_STABLECOIN_EWARI.md
./memory/CONVERSATION_20260701_LOOP_ENGINEERING.md
./memory/CONVERSATION_COMPILED_INDEX_2026-07-01.md
./memory/CONVERSATION_COMPILED_WEALTHTECH_EWARI_MCP.md
./memory/CONVERSATION_PART_01_MCP_SERVERS_MIGRATION_2026-07-01.md
./memory/CONVERSATION_PART_02_ECOSYSTEM_LOOP_ENGINEERING_2026-07-01.md
./memory/CONVERSATION_PART_03_EWARI_KOREE_STABLECOIN_2026-07-01.md
./memory/CONVERSATIONS_POUSSEES_20260701.md
./memory/GPT.md
./memory/GUIDE_IMPORT_CONVERSATION_CHATGPT_EXTERNE_20260702.md
./memory/INDEX_MEMOIRE_WEALTHTECH_20260701.md
./memory/INSTALLATION_MCP_MEMORY.md
./memory/INSTALLATION_MCP_WEALTHTECH.md
./memory/INSTALL_MCP_WEALTHTECH_MEMORY.md
./memory/INSTALL_ON_WEALTHTECH_SERVER.md
./memory/INTEGRATION_CODEX_WORKSPACE_RECHERCHE_ELARGIE_20260702.md
./memory/INTEGRATION_CORPUS_LOCAL_DOCUMENTS_DOWNLOADS_20260702.md
./memory/INTEGRATION_DOCS_AGENTS_LOOP_ENGINEERING_20260702.md
./memory/INTEGRATION_MEMOIRE_ROOT_ONLY_20260702.md
./memory/INTEGRATION_OAUTH_CHATGPT_CLAUDE_GITHUB_MCP_20260702.md
./memory/INTEGRATION_RAPPORTS_LEGACY_ET_LOCAUX_20260702.md
./memory/INTEGRATION_SOURCES_LOCALES_SITE_CHAINSOLUTIONS_20260702.md
./memory/INTEGRATION_SOURCES_MCP_SERVEUR_SYNCHRONISATION_20260703.md
./memory/INTEGRATION_WORKSPACE_LOCAL_WEALTHTECH_20260702.md
./memory/INVENTAIRE_FICHIERS_CREES_20260701.md
./memory/LECTURE_CONSOLIDEE_SOURCES_20260702.md
./memory/LOOPBACK_WEALTHTECH_CURRENT.md
./memory/LOOP_ENGINEERING_INSTRUCTIONS_DOCX_EXTRACT_20260702.md
./memory/LOOP_ENGINEERING_WEALTHTECH_20260701.md
./memory/LOOP_ENGINEERING_WEALTHTECH_MASTER_PLAN_20260702.md
./memory/LOOP_ENGINEERING_WEALTHTECH_PLAYBOOK_COMPLET_20260702.md
./memory/manifest.json
./memory/MATRICE_TRACABILITE_SOURCES_EXIGENCES_TRACKS_20260702.md
./memory/MCP_INSTALLATION_AND_SERVER_SYNC_2026-07-01.md
./memory/MEMO_MCP_GITHUB_SERVER_ACCESS.md
./memory/MEMO_PROJECT_STABLECOIN_EWARI.md
./memory/PLAN_EXECUTION_COMPLET_WEALTHTECH_ACTUALISE_20260702.md
./memory/PREPARATION_COMMIT_PUSH_MCP_MEMOIRE_20260702.md
./memory/PROMPT_AUDIT_6BI_B.md
./memory/PROMPT_AUDIT_OPCVM_SANS_REGRESSION.md
./memory/PROMPT_AUDIT_WEALTHTECH_MCP.md
./memory/README.md
./memory/REGISTRE_COMPLET_CORPUS_LOCAL_DOCUMENTS_DOWNLOADS_20260702.md
./memory/RUNBOOK_GLOBAL_REVIEW_S1_S2_2026-07-01.md
./memory/SUIVI.md
./memory/SUIVI_MEMORY.md
./memory/VERIFICATION_TRANSCRIPT_CHATGPT_EXTERNE_20260702.md
./memory/WEALTHTECH_CONVERSATION_COMPILED.md
./memory/WEALTHTECH_PROJECT_MEMORY.md
./Migration/01_CONTEXTE_CONVERSATIONS.md
./Migration/02_PLAN_MIGRATION_ET_SECURITE.md
./Migration/03_MANIFESTE_SOURCES.md
./Migration/04_GITHUB_PUBLICATION_LOG.md
./Migration/PDF/README.md
./Migration/PDF/UPLOAD_STATUS_2026-07-04.md
./Migration/README.md
./package.json
./package-lock.json
./README.md
./src/auth.ts
./src/config/env.ts
./src/config/servers.ts
./src/github/connection.ts
./src/github/registry.ts
./src/index.ts
./src/logger.ts
./src/oauth.ts
./src/server.ts
./src/ssh/client.ts
./src/ssh/safety.ts
./src/ssh/writeSafety.ts
./src/tools/format.ts
./src/tools/readOnly.ts
./src/tools/writeScoped.ts
./tsconfig.json
./wealthtech_project_memory/memory/2026-05-05-stablecoin-ewari-conversation-memory.md
./wealthtech_project_memory/memory/AUDIT_GLOBAL_S1_S2_MCP_PROMPT.md
./wealthtech_project_memory/memory/CODEX_AUTO_ANALYSIS_REQUEST.md
./wealthtech_project_memory/memory/CODEX_AUTO_ANALYSIS_RESPONSE_20260701.md
./wealthtech_project_memory/memory/CODEX_HANDOFF_STABLECOIN_EWARI.md
./wealthtech_project_memory/memory/CONVERSATION_20260701_LOOP_ENGINEERING.md
./wealthtech_project_memory/memory/CONVERSATION_COMPILED_INDEX_2026-07-01.md
./wealthtech_project_memory/memory/CONVERSATION_COMPILED_WEALTHTECH_EWARI_MCP.md
./wealthtech_project_memory/memory/CONVERSATION_PART_01_MCP_SERVERS_MIGRATION_2026-07-01.md
./wealthtech_project_memory/memory/CONVERSATION_PART_02_ECOSYSTEM_LOOP_ENGINEERING_2026-07-01.md
./wealthtech_project_memory/memory/CONVERSATION_PART_03_EWARI_KOREE_STABLECOIN_2026-07-01.md
./wealthtech_project_memory/memory/CONVERSATIONS_POUSSEES_20260701.md
./wealthtech_project_memory/memory/GPT.md
./wealthtech_project_memory/memory/INDEX_MEMOIRE_WEALTHTECH_20260701.md
./wealthtech_project_memory/memory/INSTALLATION_MCP_MEMORY.md
./wealthtech_project_memory/memory/INSTALLATION_MCP_WEALTHTECH.md
./wealthtech_project_memory/memory/INSTALL_MCP_WEALTHTECH_MEMORY.md
./wealthtech_project_memory/memory/INSTALL_ON_WEALTHTECH_SERVER.md
./wealthtech_project_memory/memory/INVENTAIRE_FICHIERS_CREES_20260701.md
./wealthtech_project_memory/memory/LOOPBACK_WEALTHTECH_CURRENT.md
./wealthtech_project_memory/memory/LOOP_ENGINEERING_WEALTHTECH_20260701.md
./wealthtech_project_memory/memory/manifest.json
./wealthtech_project_memory/memory/MCP_INSTALLATION_AND_SERVER_SYNC_2026-07-01.md
./wealthtech_project_memory/memory/MEMO_MCP_GITHUB_SERVER_ACCESS.md
./wealthtech_project_memory/memory/MEMO_PROJECT_STABLECOIN_EWARI.md
./wealthtech_project_memory/memory/PROMPT_AUDIT_6BI_B.md
./wealthtech_project_memory/memory/PROMPT_AUDIT_OPCVM_SANS_REGRESSION.md
./wealthtech_project_memory/memory/PROMPT_AUDIT_WEALTHTECH_MCP.md
./wealthtech_project_memory/memory/README.md
./wealthtech_project_memory/memory/RUNBOOK_GLOBAL_REVIEW_S1_S2_2026-07-01.md
./wealthtech_project_memory/memory/SUIVI.md
./wealthtech_project_memory/memory/SUIVI_MEMORY.md
./wealthtech_project_memory/memory/WEALTHTECH_CONVERSATION_COMPILED.md
./wealthtech_project_memory/memory/WEALTHTECH_PROJECT_MEMORY.md
```

## package.json
```json
{
  "name": "wealthtech-mcp-ssh-bridge",
  "version": "0.1.0",
  "description": "MCP SSH Bridge sécurisé pour piloter les serveurs WealthTech S1/S2 avec des outils contrôlés, journalisés et documentés.",
  "type": "module",
  "private": false,
  "license": "UNLICENSED",
  "main": "dist/index.js",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "start": "node dist/index.js",
    "build": "tsc -p tsconfig.json",
    "typecheck": "tsc --noEmit -p tsconfig.json",
    "lint:secrets": "node scripts/check-no-secrets.mjs",
    "docs:check": "node scripts/check-docs.mjs"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "latest",
    "dotenv": "latest",
    "express": "latest",
    "pino": "latest",
    "pino-pretty": "latest",
    "ssh2": "latest",
    "zod": "latest"
  },
  "devDependencies": {
    "@types/express": "latest",
    "@types/node": "latest",
    "@types/ssh2": "latest",
    "tsx": "latest",
    "typescript": "latest"
  },
  "engines": {
    "node": ">=20.0.0"
  }
}
```

## README
# WealthTech MCP SSH Bridge

Serveur MCP Node.js/TypeScript destiné à exposer à ChatGPT/Codex des outils contrôlés pour inventorier, documenter et préparer les opérations sur les serveurs WealthTech.

## Objectif

Ce dépôt contient le MCP `wealthtech_ssh_bridge`. Il doit permettre une connexion contrôlée vers :

- S1 : `root@212.227.212.33`
- S2 : `root@217.160.249.254`

Le mode initial est volontairement **read-only first** : aucune suppression, aucun redémarrage, aucun vidage de dossier, aucune migration destructive ne doit être activée dans la première version.

## URL cible

```text
https://mcp.wealthtechinnovations.com/mcp
```

## Authentification ChatGPT / OAuth MCP

Le serveur conserve l'authentification historique :

```text
Authorization: Bearer <MCP_AUTH_TOKEN>
```

Pour être découvrable par ChatGPT Apps SDK sans exposer `MCP_AUTH_TOKEN`, le serveur expose aussi une couche OAuth minimale compatible Authorization Code + PKCE :

```text
GET  /.well-known/oauth-protected-resource
GET  /.well-known/oauth-authorization-server
GET  /oauth/authorize
POST /oauth/token
```

Principes de sécurité :

- `/mcp` reste protégé ;
- l'ancien `MCP_AUTH_TOKEN` reste accepté pour les tests administrateur et les scripts existants ;
- ChatGPT reçoit uniquement des access tokens OAuth temporaires signés côté serveur ;
- `MCP_AUTH_TOKEN` n'est jamais renvoyé dans les réponses OAuth ;
- le login web existant `/login` sert d'écran d'autorisation administrateur ;
- le serveur renvoie un header `WWW-Authenticate` sur les `401` MCP pour permettre à ChatGPT de découvrir `/.well-known/oauth-protected-resource`.

Tests publics attendus :

```bash
curl -i https://mcp.wealthtechinnovations.com/health
curl -i https://mcp.wealthtechinnovations.com/.well-known/oauth-protected-resource
curl -i https://mcp.wealthtechinnovations.com/.well-known/oauth-authorization-server
curl -i https://mcp.wealthtechinnovations.com/mcp
```

Le dernier test doit rester en `401 Unauthorized` sans token.

## Installation locale

```bash
npm install
cp .env.example .env
npm run build
npm run start
```

## Variables d’environnement

Voir `.env.example`.

Ne jamais pousser `.env`, les clés SSH, les dumps SQL, les sauvegardes ou les secrets.

## Outils MCP read-only initiaux

- `ping`
- `get_project_context`
- `check_disk_s1`
- `check_disk_s2`
- `pm2_status_s1`
- `pm2_status_s2`
- `docker_status_s1`
- `docker_status_s2`
- `list_domains_s1`
- `list_domains_s2`
- `list_large_files_s1`
- `list_large_files_s2`
- `list_backups_s1`
- `list_backups_s2`
- `curl_domain`

## Documentation obligatoire

La mémoire persistante du projet se trouve dans `docs/`.

Avant toute modification, lire :

1. `docs/GPT.md`
2. `docs/SUIVI.md`
3. `docs/ROADMAP.md`
4. `docs/TASKS.md`
5. `docs/SECURITY.md`
6. `docs/MCP_TOOLS.md`
7. `docs/AGENTS_ARCHITECTURE.md`
8. `docs/AI_SKILLS.md`

## Déploiement recommandé

- Hébergement : S1
- Dossier : `/opt/apps/wealthtech-mcp-ssh-bridge`
- Runtime initial : PM2 ou Docker Compose
- Reverse proxy : Nginx/Plesk vers `127.0.0.1:8787`
- HTTPS obligatoire
- Authentification historique : header `Authorization: Bearer <MCP_AUTH_TOKEN>`
- Authentification ChatGPT : OAuth minimal via les routes `.well-known` et `/oauth/*`

## Règle de sécurité

Le MCP ne doit pas devenir une console root libre. Il doit exposer uniquement des outils contrôlés, nommés, documentés, journalisés et validés.

## Fichiers source principaux

### ./src/auth.ts
```
import type { Request, Response, NextFunction } from 'express';
import { env } from './config/env.js';
import { oauthChallengeHeader, verifyOauthAccessToken } from './oauth.js';

function extractBearerToken(header: string): string | null {
  const prefix = 'Bearer ';

  if (!header.startsWith(prefix)) {
    return null;
  }

  const token = header.slice(prefix.length).trim();
  return token.length > 0 ? token : null;
}

export function requireBearerToken(req: Request, res: Response, next: NextFunction): void {
  const token = extractBearerToken(req.header('authorization') ?? '');

  if (token === env.MCP_AUTH_TOKEN) {
    next();
    return;
  }

  if (token !== null && verifyOauthAccessToken(token, 'mcp:read')) {
    next();
    return;
  }

  res.setHeader('WWW-Authenticate', oauthChallengeHeader('mcp:read'));
  res.status(401).json({ error: 'unauthorized' });
}
```

### ./src/config/env.ts
```
import 'dotenv/config';
import { z } from 'zod';

const EnvBooleanSchema = z.preprocess((value) => {
  if (value === undefined || value === null || value === '') {
    return false;
  }
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
  }
  return false;
}, z.boolean());

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(8787),
  MCP_AUTH_TOKEN: z.string().min(24, 'MCP_AUTH_TOKEN doit être long et aléatoire en production'),
  LOG_LEVEL: z.string().default('info'),
  S1_HOST: z.string().min(1),
  S1_PORT: z.coerce.number().int().positive().default(22),
  S1_USER: z.string().min(1).default('root'),
  S1_KEY_PATH: z.string().min(1),
  S2_HOST: z.string().min(1),
  S2_PORT: z.coerce.number().int().positive().default(22),
  S2_USER: z.string().min(1).default('root'),
  S2_KEY_PATH: z.string().min(1),
  PROTECTED_MODE: z.string().default('read_only_first'),
  ENABLE_WRITE_TOOLS: EnvBooleanSchema.default(false),
  OPCVM_DB_NAME: z.string().min(1).default('fund_opcvm'),
  GITHUB_ORG: z.string().default(''),
  GITHUB_TOKEN_FILE: z.string().default(''),
  GITHUB_API_BASE: z.string().url().default('https://api.github.com'),
  MCP_GITHUB_BOOTSTRAPPED: EnvBooleanSchema.default(false)
});

export const env = EnvSchema.parse(process.env);
```

### ./src/config/servers.ts
```
import { env } from './env.js';

export type ServerId = 's1' | 's2';

export interface ManagedServerConfig {
  id: ServerId;
  label: string;
  host: string;
  port: number;
  username: string;
  privateKeyPath: string;
  protectedDomains: string[];
}

export const managedServers: Record<ServerId, ManagedServerConfig> = {
  s1: {
    id: 's1',
    label: 'S1 - serveur principal / destination',
    host: env.S1_HOST,
    port: env.S1_PORT,
    username: env.S1_USER,
    privateKeyPath: env.S1_KEY_PATH,
    protectedDomains: [
      'niakara.com',
      'www.niakara.com',
      'api.niakara.com',
      'wealthtechinnovations.com',
      'api.wealthtechinnovations.com',
      'stablecoin.wealthtechinnovations.com',
      'api.stablecoin.wealthtechinnovations.com',
      'blockchain.wealthtechinnovations.com',
      'tokenfactory.wealthtechinnovations.com',
      'wealthtechinnovation.com',
      'berebytours.com'
    ]
  },
  s2: {
    id: 's2',
    label: 'S2 - serveur source / migration / nettoyage sélectif',
    host: env.S2_HOST,
    port: env.S2_PORT,
    username: env.S2_USER,
    privateKeyPath: env.S2_KEY_PATH,
    protectedDomains: [
      'africafunds.chainsolutions.fr',
      'api.africafunds.chainsolutions.fr',
      'api.stablecoin.chainsolutions.fr',
      'stablecoin.chainsolutions.fr',
      'brvm.chainsolutions.fr',
      'bvmac.chainsolutions.fr',
      'chainsolutions.fr',
      'Funds.chainsolutions.fr',
      'api.funds.chainsolutions.fr'
    ]
  }
};
```

### ./src/github/connection.ts
```
import { mkdir, readFile, writeFile, chmod, stat } from 'node:fs/promises';
import { dirname } from 'node:path';
import { env } from '../config/env.js';

const DEFAULT_TOKEN_FILE = '/app/secrets/github_token';

export type GitHubConnectionStatus = {
  configured: boolean;
  connected: boolean;
  org: string | null;
  login: string | null;
  tokenFile: string;
  tokenFileExists: boolean;
  tokenFileMode: string | null;
  tokenExpiresAt: string | null;
  oauthScopes: string[];
  orgAccessible: boolean;
  reposVisible: number | null;
  canReadReposHint: boolean;
  canWriteReposHint: boolean;
  canAdminOrgHint: boolean;
  warnings: string[];
  error: string | null;
};

type GitHubResponse = {
  ok: boolean;
  status: number;
  json: unknown;
  text: string;
  tokenExpiresAt: string | null;
  oauthScopes: string[];
};

function tokenFilePath(): string {
  return env.GITHUB_TOKEN_FILE || DEFAULT_TOKEN_FILE;
}

function githubApiBase(): string {
  return env.GITHUB_API_BASE || 'https://api.github.com';
}

function parseScopes(value: string | null): string[] {
  if (!value) {
    return [];
  }
  return value
    .split(',')
    .map((scope) => scope.trim())
    .filter(Boolean);
}

function hasRepoWriteScope(scopes: string[]): boolean {
  return scopes.includes('repo') || scopes.includes('public_repo') || scopes.includes('write:packages') || scopes.includes('workflow');
}

function hasAdminOrgScope(scopes: string[]): boolean {
  return scopes.includes('admin:org') || scopes.includes('write:org');
}

async function readToken(): Promise<string | null> {
  try {
    const token = await readFile(tokenFilePath(), 'utf8');
    return token.trim() || null;
  } catch {
    return null;
  }
}

async function getTokenFileMode(): Promise<string | null> {
  try {
    const info = await stat(tokenFilePath());
    return (info.mode & 0o777).toString(8);
  } catch {
    return null;
  }
}

async function githubRequest(token: string, endpoint: string): Promise<GitHubResponse> {
  const base = githubApiBase().replace(/\/$/, '');
  const url = endpoint.startsWith('http') ? endpoint : `${base}${endpoint}`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'wealthtech-mcp-guardian'
    }
  });

  const text = await response.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  return {
    ok: response.ok,
    status: response.status,
    json,
    text,
    tokenExpiresAt: response.headers.get('github-authentication-token-expiration'),
    oauthScopes: parseScopes(response.headers.get('x-oauth-scopes'))
  };
}

function getArrayLength(value: unknown): number | null {
  return Array.isArray(value) ? value.length : null;
}

function getLogin(value: unknown): string | null {
  if (value && typeof value === 'object' && 'login' in value) {
    const login = (value as { login?: unknown }).login;
    return typeof login === 'string' ? login : null;
  }
  return null;
}

export async function validateGithubToken(token: string, org: string): Promise<GitHubConnectionStatus> {
  const tokenFile = tokenFilePath();
  const warnings: string[] = [];
  const user = await githubRequest(token, '/user');
  const login = user.ok ? getLogin(user.json) : null;
  const scopes = user.oauthScopes;

  let orgAccessible = false;
  let reposVisible: number | null = null;
  let error: string | null = null;

  if (!user.ok || !login) {
    error = `GitHub user check failed with HTTP ${user.status}`;
  } else if (org) {
    const orgCheck = await githubRequest(token, `/orgs/${encodeURIComponent(org)}`);
    orgAccessible = orgCheck.ok;
    if (!orgCheck.ok) {
      error = `GitHub org check failed for ${org} with HTTP ${orgCheck.status}`;
    } else {
      const repos = await githubRequest(token, `/orgs/${encodeURIComponent(org)}/repos?per_page=100&type=all`);
      if (repos.ok) {
        reposVisible = getArrayLength(repos.json);
      } else {
        warnings.push(`Repo listing failed with HTTP ${repos.status}`);
      }
    }
  }

  if (scopes.length === 0) {
    warnings.push('OAuth scopes header absent: fine-grained token or GitHub App token likely. Write/admin rights must be tested per repository.');
  }

  const canWrite = hasRepoWriteScope(scopes);
  const canAdmin = hasAdminOrgScope(scopes);

  return {
    configured: Boolean(org),
    connected: Boolean(login && (!org || orgAccessible)),
    org: org || null,
    login,
```

### ./src/github/registry.ts
```
import { mkdir, readFile, writeFile, chmod } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { GitHubConnectionStatus } from './connection.js';

const DEFAULT_REGISTRY_FILE = '/app/data/mcp-git-registry.json';

export type GitHubAccessMode = 'read' | 'write' | 'admin' | 'org_admin';

export type GitHubAccountRegistryEntry = {
  id: string;
  login: string;
  org: string | null;
  accountType: 'user' | 'organization' | 'unknown';
  authMode: 'pat' | 'github_app' | 'oauth' | 'unknown';
  requestedMode: GitHubAccessMode;
  connectedAt: string;
  lastCheckedAt: string;
  tokenExpiresAt: string | null;
  reposVisible: number | null;
  orgAccessible: boolean;
  canReadReposHint: boolean;
  canWriteReposHint: boolean;
  canAdminOrgHint: boolean;
  enabledOnPublicMcpDomain: boolean;
  status: 'connected' | 'warning' | 'error';
  warnings: string[];
};

export type RepoMappingEntry = {
  id: string;
  githubOwner: string;
  githubRepo: string;
  projectKey: string;
  serverId: string;
  serverPath: string;
  officialBranch: string;
  allowedAccess: GitHubAccessMode;
  deployEnabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type RegistryAuditEvent = {
  id: string;
  at: string;
  type: string;
  actor: string;
  message: string;
  metadata?: Record<string, unknown>;
};

export type GitRegistry = {
  version: 1;
  updatedAt: string;
  accounts: GitHubAccountRegistryEntry[];
  repoMappings: RepoMappingEntry[];
  auditEvents: RegistryAuditEvent[];
};

function registryFilePath(): string {
  return process.env.MCP_GIT_REGISTRY_FILE || DEFAULT_REGISTRY_FILE;
}

function configuredOrg(): string {
  return process.env.GITHUB_ORG || 'chainsolutions-wealthtech';
}

function nowIso(): string {
  return new Date().toISOString();
}

function normalizeMode(value: unknown): GitHubAccessMode {
  if (value === 'write' || value === 'admin' || value === 'org_admin') {
    return value;
  }
  return 'read';
}

function emptyRegistry(): GitRegistry {
  return {
    version: 1,
    updatedAt: nowIso(),
    accounts: [],
    repoMappings: [],
    auditEvents: []
  };
}

function normalizeRegistry(value: unknown): GitRegistry {
  if (!value || typeof value !== 'object') {
    return emptyRegistry();
  }

  const candidate = value as Partial<GitRegistry>;
  return {
    version: 1,
    updatedAt: typeof candidate.updatedAt === 'string' ? candidate.updatedAt : nowIso(),
    accounts: Array.isArray(candidate.accounts) ? candidate.accounts : [],
    repoMappings: Array.isArray(candidate.repoMappings) ? candidate.repoMappings : [],
    auditEvents: Array.isArray(candidate.auditEvents) ? candidate.auditEvents : []
  };
}

export async function readGitRegistry(): Promise<GitRegistry> {
  try {
    const raw = await readFile(registryFilePath(), 'utf8');
    return normalizeRegistry(JSON.parse(raw));
  } catch {
    return emptyRegistry();
  }
}

export async function writeGitRegistry(registry: GitRegistry): Promise<void> {
  const file = registryFilePath();
  await mkdir(dirname(file), { recursive: true, mode: 0o700 });
  const nextRegistry: GitRegistry = {
    ...registry,
    updatedAt: nowIso(),
    auditEvents: registry.auditEvents.slice(-500)
  };
  await writeFile(file, `${JSON.stringify(nextRegistry, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
  await chmod(file, 0o600);
}

export async function recordGithubConnection(
  status: GitHubConnectionStatus,
  requestedModeInput: unknown,
  actor = 'mcp-web'
): Promise<GitRegistry> {
  const registry = await readGitRegistry();
  const requestedMode = normalizeMode(requestedModeInput);
  const login = status.login || status.org || 'unknown';
  const id = `${status.org || 'personal'}:${login}`;
  const existing = registry.accounts.find((entry) => entry.id === id);
  const at = nowIso();

  const entry: GitHubAccountRegistryEntry = {
    id,
    login,
    org: status.org,
    accountType: status.org && status.org === login ? 'organization' : 'user',
    authMode: 'pat',
    requestedMode,
    connectedAt: existing?.connectedAt || at,
    lastCheckedAt: at,
    tokenExpiresAt: status.tokenExpiresAt,
    reposVisible: status.reposVisible,
    orgAccessible: status.orgAccessible,
    canReadReposHint: status.canReadReposHint,
    canWriteReposHint: status.canWriteReposHint,
    canAdminOrgHint: status.canAdminOrgHint,
    enabledOnPublicMcpDomain: existing?.enabledOnPublicMcpDomain ?? true,
    status: status.connected && status.warnings.length === 0 ? 'connected' : status.connected ? 'warning' : 'error',
    warnings: status.warnings
  };

  registry.accounts = [entry, ...registry.accounts.filter((candidate) => candidate.id !== id)];
  registry.auditEvents.push({
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    at,
```

### ./src/index.ts
```
import { startHttpServer } from './server.js';
import { logger } from './logger.js';

startHttpServer().catch((error) => {
  logger.fatal({ error }, 'Impossible de démarrer wealthtech_ssh_bridge');
});
```

### ./src/logger.ts
```
import pino from 'pino';
import { env } from './config/env.js';

export const logger = pino({
  level: env.LOG_LEVEL,
  redact: {
    paths: ['req.headers.authorization', 'authorization', '*.privateKey', '*.password', '*.token'],
    censor: '[REDACTED]'
  },
  transport: env.NODE_ENV === 'development' ? { target: 'pino-pretty' } : undefined
});
```

### ./src/oauth.ts
```
import type { Express, Request, Response } from 'express';
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { env } from './config/env.js';
import { logger } from './logger.js';

const DEFAULT_ISSUER = 'https://mcp.wealthtechinnovations.com';
const ACCESS_TOKEN_TTL_SECONDS = Math.max(
  300,
  Number.parseInt(process.env.MCP_OAUTH_ACCESS_TOKEN_TTL_SECONDS || '3600', 10)
);
const AUTHORIZATION_CODE_TTL_MS = Math.max(
  60,
  Number.parseInt(process.env.MCP_OAUTH_CODE_TTL_SECONDS || '300', 10)
) * 1000;

const SUPPORTED_SCOPES = ['mcp:read', 'mcp:write'] as const;

type SupportedScope = typeof SUPPORTED_SCOPES[number];

type AuthorizationCodeRecord = {
  clientId: string;
  redirectUri: string;
  scope: string;
  resource: string;
  codeChallenge: string;
  codeChallengeMethod: 'S256';
  expiresAt: number;
  subject: string;
};

type OAuthTokenPayload = {
  typ: 'wealthtech-mcp-oauth';
  iss: string;
  aud: string;
  resource: string;
  sub: string;
  client_id: string;
  scope: string;
  iat: number;
  exp: number;
  jti: string;
};

type RegisterOAuthRoutesOptions = {
  isAuthenticated: (req: Request) => boolean;
};

const authorizationCodes = new Map<string, AuthorizationCodeRecord>();

function normalizeBaseUrl(value: string): string {
  return value.trim().replace(/\/+$/, '');
}

export function oauthIssuer(): string {
  return normalizeBaseUrl(process.env.MCP_WEB_BASE_URL || DEFAULT_ISSUER);
}

export function protectedResourceMetadataUrl(): string {
  return `${oauthIssuer()}/.well-known/oauth-protected-resource`;
}

export function oauthChallengeHeader(scope = 'mcp:read'): string {
  return `Bearer ***MASKED***"${protectedResourceMetadataUrl()}", scope="${scope}"`;
}

function oauthSecret(): string {
  return env.MCP_AUTH_TOKEN;
}

function base64Url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString('base64')
    .replaceAll('=', '')
    .replaceAll('+', '-')
    .replaceAll('/', '_');
}

function base64UrlJson(value: unknown): string {
  return base64Url(JSON.stringify(value));
}

function base64UrlToBuffer(value: string): Buffer {
  const normalized = value.replaceAll('-', '+').replaceAll('_', '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  return Buffer.from(padded, 'base64');
}

function hmac(input: string): string {
  return base64Url(createHmac('sha256', oauthSecret()).update(input).digest());
}

function safeEqualString(actual: string, expected: string): boolean {
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);

  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
}

function getSingleQueryParam(req: Request, name: string): string | undefined {
  const value = req.query[name];

  if (typeof value === 'string') {
    return value;
  }

  if (Array.isArray(value) && typeof value[0] === 'string') {
    return value[0];
  }

  return undefined;
}

function getSingleBodyParam(req: Request, name: string): string | undefined {
  const body = req.body as Record<string, unknown> | undefined;
  const value = body?.[name];

  if (typeof value === 'string') {
    return value;
  }

  if (Array.isArray(value) && typeof value[0] === 'string') {
    return value[0];
  }

  return undefined;
}

function isHttpsOrLocalUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' || parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
  } catch {
    return false;
  }
}

function normalizeScopeString(rawScope: string | undefined): string {
  const requested = (rawScope || 'mcp:read')
    .split(/\s+/)
    .map((scope) => scope.trim())
    .filter((scope): scope is SupportedScope => SUPPORTED_SCOPES.includes(scope as SupportedScope));

  const scopes = new Set<SupportedScope>(requested.length > 0 ? requested : ['mcp:read']);

  if (scopes.has('mcp:write')) {
    scopes.add('mcp:read');
  }

  return [...scopes].join(' ');
}

function buildAuthorizationServerMetadata() {
  const issuer = oauthIssuer();

  return {
    issuer,
    authorization_endpoint: `${issuer}/oauth/authorize`,
    token_endpoint: `${issuer}/oauth/token`,
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code'],
```

### ./src/server.ts
```
import express from 'express';
import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import { env } from './config/env.js';
import { requireBearerToken } from './auth.js';
import { registerOauthRoutes } from './oauth.js';
import { logger } from './logger.js';
import { registerReadOnlyTools } from './tools/readOnly.js';
import { registerScopedWriteTools } from './tools/writeScoped.js';
import { getGithubConnectionStatus, renderGithubConnectionPage, saveGithubToken, validateGithubToken } from './github/connection.js';
import { readGitRegistry, recordGithubConnection, renderGitSettingsPage } from './github/registry.js';

const WEB_SESSION_COOKIE = 'mcp_web_session';
const WEB_SESSION_MAX_AGE_SECONDS = Math.max(1, Number.parseInt(process.env.MCP_SESSION_TTL_HOURS || '8', 10)) * 60 * 60;

function mcpAuthSecret(): string {
  const value = env.MCP_AUTH_TOKEN;
  if (!value) throw new Error('MCP auth token is missing');
  return value;
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function signSession(expiresAt: number): string {
  return createHmac('sha256', mcpAuthSecret()).update(String(expiresAt)).digest('hex');
}

function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!cookieHeader) return cookies;

  for (const part of cookieHeader.split(';')) {
    const [rawKey, ...rawValue] = part.trim().split('=');
    if (!rawKey || rawValue.length === 0) continue;
    cookies[rawKey] = decodeURIComponent(rawValue.join('='));
  }

  return cookies;
}

function isValidWebSession(cookieValue: string | undefined): boolean {
  if (!cookieValue) return false;

  const [expiresRaw, signature] = cookieValue.split('.');
  const expiresAt = Number(expiresRaw);

  if (!Number.isFinite(expiresAt) || !signature || expiresAt < Date.now() || !/^[a-f0-9]{64}$/i.test(signature)) {
    return false;
  }

  const expectedBuffer = Buffer.from(signSession(expiresAt), 'hex');
  const actualBuffer = Buffer.from(signature, 'hex');

  return expectedBuffer.length === actualBuffer.length && timingSafeEqual(expectedBuffer, actualBuffer);
}

function tokenMatches(input: string): boolean {
  const expected = Buffer.from(mcpAuthSecret());
  const actual = Buffer.from(input);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function secureCookieAttribute(): string {
  const baseUrl = process.env.MCP_WEB_BASE_URL || '';
  return env.NODE_ENV === 'production' || baseUrl.startsWith('https://') ? '; Secure' : '';
}

function createWebSessionCookie(): string {
  const expiresAt = Date.now() + WEB_SESSION_MAX_AGE_SECONDS * 1000;
  const value = `${expiresAt}.${signSession(expiresAt)}`;
  return `${WEB_SESSION_COOKIE}=${encodeURIComponent(value)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${WEB_SESSION_MAX_AGE_SECONDS}${secureCookieAttribute()}`;
}

function clearWebSessionCookie(): string {
  return `${WEB_SESSION_COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${secureCookieAttribute()}`;
}

function isWebAuthenticated(req: express.Request): boolean {
  const authorization = req.header('authorization') ?? '';

  if (authorization.startsWith('Bearer ') && authorization.slice('Bearer '.length) === mcpAuthSecret()) {
    return true;
  }

  return isValidWebSession(parseCookies(req.header('cookie'))[WEB_SESSION_COOKIE]);
}

function requireWebLogin(req: express.Request, res: express.Response, next: express.NextFunction): void {
  if (isWebAuthenticated(req)) {
    next();
    return;
  }

  if (req.accepts('html')) {
    res.redirect(`/login?next=${encodeURIComponent(req.originalUrl || '/dashboard')}`);
    return;
  }

  res.status(401).json({ error: 'mcp_web_login_required' });
}

function renderLoginPage(error?: string, next = '/dashboard'): string {
  const safeError = error ? `<p style="color:#b91c1c;font-weight:700">${escapeHtml(error)}</p>` : '';

  return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Connexion MCP WealthTech</title>
</head>
<body style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;background:#f9fafb;margin:0;color:#111827">
  <main style="max-width:540px;margin:10vh auto;background:#fff;border:1px solid #e5e7eb;border-radius:16px;padding:28px">
    <h1>Connexion MCP WealthTech</h1>
    <p>Entre le token MCP pour accéder au tableau de bord.</p>
    ${safeError}
    <form method="post" action="/login">
      <input type="hidden" name="next" value="${escapeHtml(next)}" />
      <label style="display:block;margin:14px 0 6px;font-weight:700">Token MCP</label>
      <input name="token" type="password" autocomplete="current-password" required autofocus style="width:100%;padding:12px;box-sizing:border-box" />
      <button type="submit" style="margin-top:16px;width:100%;padding:12px">Accéder</button>
    </form>
  </main>
</body>
</html>`;
}

function normalizeAccountParam(value: string): string {
  return value.trim().replace(/^@/, '').replace(/[^A-Za-z0-9_.-]/g, '');
}

function nav(): string {
  return `<p>
    <a href="/dashboard">Dashboard</a> ·
    <a href="/git">Paramétrage Git</a> ·
    <a href="/github">GitHub</a> ·
    <a href="/github/status">Statut JSON</a> ·
    <a href="/github/Patricked-code">Patricked-code</a> ·
    <a href="/github/chainsolutions-wealthtech">chainsolutions-wealthtech</a> ·
    <a href="/logout">Déconnexion</a>
  </p>`;
}

async function renderDashboardPage(): Promise<string> {
  const status = await getGithubConnectionStatus();
  const registry = await readGitRegistry();
  const connected = status.connected ? 'connecté' : 'non connecté';

  return `<!doctype html>
<html lang="fr">
<head>
```

### ./src/ssh/client.ts
```
import { Client } from 'ssh2';
import { readFileSync } from 'node:fs';
import { managedServers, type ServerId } from '../config/servers.js';
import { logger } from '../logger.js';
import { assertReadOnlyCommand } from './safety.js';
import { assertNoCatastrophicCommand } from './writeSafety.js';

export interface CommandResult {
  server: ServerId;
  command: string;
  stdout: string;
  stderr: string;
  code: number | null;
}

export interface GuardedCommandOptions {
  timeoutMs?: number;
  maxOutputBytes?: number;
  intent?: string;
}

function appendLimited(current: string, data: Buffer, maxOutputBytes: number): string {
  if (Buffer.byteLength(current, 'utf8') >= maxOutputBytes) {
    return current;
  }
  const next = current + data.toString('utf8');
  if (Buffer.byteLength(next, 'utf8') <= maxOutputBytes) {
    return next;
  }
  return `${next.slice(0, maxOutputBytes)}\n...[sortie plafonnée par le MCP]`;
}

async function runCommand(serverId: ServerId, command: string, options: GuardedCommandOptions = {}): Promise<CommandResult> {
  const server = managedServers[serverId];
  const timeoutMs = options.timeoutMs ?? 30_000;
  const maxOutputBytes = options.maxOutputBytes ?? 200_000;
  logger.info({ serverId, command, intent: options.intent ?? 'unspecified', timeoutMs }, 'Exécution SSH demandée');

  return new Promise((resolve, reject) => {
    const conn = new Client();
    let stdout = '';
    let stderr = '';
    let settled = false;

    const timeout = setTimeout(() => {
      if (settled) {
        return;
      }
      settled = true;
      conn.end();
      reject(new Error(`Timeout SSH après ${timeoutMs} ms`));
    }, timeoutMs);

    const fail = (error: Error) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timeout);
      conn.end();
      reject(error);
    };

    conn
      .on('ready', () => {
        conn.exec(command, (err, stream) => {
          if (err) {
            fail(err);
            return;
          }

          stream
            .on('close', (code: number | null) => {
              if (settled) {
                return;
              }
              settled = true;
              clearTimeout(timeout);
              conn.end();
              resolve({ server: serverId, command, stdout, stderr, code });
            })
            .on('data', (data: Buffer) => {
              stdout = appendLimited(stdout, data, maxOutputBytes);
            });

          stream.stderr.on('data', (data: Buffer) => {
            stderr = appendLimited(stderr, data, maxOutputBytes);
          });
        });
      })
      .on('error', fail)
      .connect({
        host: server.host,
        port: server.port,
        username: server.username,
        privateKey: readFileSync(server.privateKeyPath)
      });
  });
}

export async function runReadOnlyCommand(serverId: ServerId, command: string): Promise<CommandResult> {
  assertReadOnlyCommand(command);
  return runCommand(serverId, command, { intent: 'read_only', timeoutMs: 30_000, maxOutputBytes: 200_000 });
}

export async function runGuardedCommand(serverId: ServerId, command: string, options: GuardedCommandOptions = {}): Promise<CommandResult> {
  assertNoCatastrophicCommand(command);
  return runCommand(serverId, command, options);
}
```

### ./src/ssh/safety.ts
```
export const blockedCommandFragments = [
  'rm -rf /',
  'rm -rf /*',
  'mkfs',
  'dd if=',
  ':(){',
  'shutdown',
  'reboot',
  'halt',
  'poweroff',
  'chmod -R 777 /',
  'chown -R',
  '>/dev/sda',
  'wipefs'
];

export function assertReadOnlyCommand(command: string): void {
  const normalized = command.trim().toLowerCase();
  for (const fragment of blockedCommandFragments) {
    if (normalized.includes(fragment.toLowerCase())) {
      throw new Error(`Commande bloquée par la politique de sécurité: ${fragment}`);
    }
  }

  const writeLike = [' rm ', ' rm\t', 'mv ', 'cp ', 'truncate ', 'sed -i', 'tee ', 'echo ', 'cat >', 'mysql ', 'psql ', 'systemctl restart', 'pm2 restart', 'pm2 stop', 'docker compose down', 'docker stop'];
  for (const fragment of writeLike) {
    if (` ${normalized}`.includes(fragment)) {
      throw new Error(`Commande non read-only bloquée: ${fragment.trim()}`);
    }
  }
}
```

### ./src/ssh/writeSafety.ts
```
const catastrophicCommandPatterns = [
  /\brm\s+-[^\n;&|]*[rf][^\n;&|]*\s+\/(?:\s|$)/i,
  /\bmkfs\b/i,
  /\bdd\s+if=/i,
  /\bshutdown\b/i,
  /\breboot\b/i,
  /\bhalt\b/i,
  /\bpoweroff\b/i,
  /\bwipefs\b/i,
  /\bdocker\s+volume\s+(rm|prune)\b/i,
  /\bdocker\s+(compose|system)\b[^\n]*(--volumes|-v)\b/i,
  /\bdrop\s+(database|table)\b/i,
  /\btruncate\s+table\b/i,
  /\bdelete\s+from\b/i,
  /\bgrant\s+all\b/i,
  /\brevoke\s+all\b/i,
  /\balter\s+user\b/i
];

const forbiddenSqlKeywords = /\b(insert|update|delete|drop|truncate|alter|grant|revoke|create|replace|merge|call|execute|load|outfile|infile)\b/i;
const forbiddenSqlSyntax = /(;|--|\/\*|\*\/|#)/;

const forbiddenArgCharacters = /[;&|`$()<>]/;
const forbiddenArgWords = /\b(rm|mv|scp|ssh|sudo|su|curl|wget|bash|sh|python|perl|nc|mkfs|dd)\b/i;

const allowedScriptArgPatterns = [
  /^--since=\d{4}-\d{2}-\d{2}$/,
  /^--until=\d{4}-\d{2}-\d{2}$/,
  /^--seuil=\d+(?:\.\d+)?$/,
  /^--indice=[A-Z]+$/,
  /^--pays=[A-Za-zÀ-ÿ '\-]+$/,
  /^--fond=\d+$/,
  /^--execute$/,
  /^--dry-run$/,
  /^(backup|state|rollback)$/,
  /^\d+$/
];

export function assertNoCatastrophicCommand(command: string): void {
  for (const pattern of catastrophicCommandPatterns) {
    if (pattern.test(command)) {
      throw new Error('Commande bloquée par la politique de sécurité MCP.');
    }
  }
}

export function assertScopedWriteToolsEnabled(enabled: boolean): void {
  if (!enabled) {
    throw new Error('Outils d’écriture désactivés. Activer ENABLE_WRITE_TOOLS=true côté serveur après validation explicite.');
  }
}

export function assertWriteFlag(allowWrite: boolean, operation: string): void {
  if (!allowWrite) {
    throw new Error(`Écriture refusée pour ${operation}. Relancer l’outil avec allow_write=true après validation explicite.`);
  }
}

export function assertSelectOnlyQuery(query: string): void {
  const trimmed = query.trim();
  if (!/^select\s/i.test(trimmed)) {
    throw new Error('SQL refusé: seules les requêtes SELECT sont autorisées.');
  }
  if (forbiddenSqlSyntax.test(trimmed)) {
    throw new Error('SQL refusé: séparateurs, commentaires et requêtes multiples interdits.');
  }
  if (forbiddenSqlKeywords.test(trimmed)) {
    throw new Error('SQL refusé: mot-clé d’écriture ou d’administration détecté.');
  }
}

export function assertSafeScriptArgs(args: string[]): void {
  for (const arg of args) {
    if (arg.length === 0 || arg.length > 120) {
      throw new Error(`Argument refusé: longueur invalide (${arg}).`);
    }
    if (forbiddenArgCharacters.test(arg) || forbiddenArgWords.test(arg)) {
      throw new Error(`Argument refusé: caractère ou mot dangereux détecté (${arg}).`);
    }
    if (!allowedScriptArgPatterns.some((pattern) => pattern.test(arg))) {
      throw new Error(`Argument refusé par la liste blanche: ${arg}`);
    }
  }
}

export function scriptArgsRequireWriteApproval(args: string[]): boolean {
  return args.some((arg) => arg === '--execute' || arg === 'rollback' || arg === 'backup');
}
```

### ./src/tools/format.ts
```
import type { CommandResult } from '../ssh/client.js';

export function asText(content: string) {
  return { content: [{ type: 'text' as const, text: content }] };
}

export function commandResultToText(result: CommandResult): string {
  const output = result.stdout || '(vide)';
  const errors = result.stderr || '(vide)';
  return `Serveur: ${result.server}\nCommande: ${result.command}\nCode: ${result.code ?? 'unknown'}\n\nSortie standard:\n${output}\n\nSortie erreur:\n${errors}`;
}
```

### ./src/tools/readOnly.ts
```
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { managedServers, type ServerId } from '../config/servers.js';
import { runReadOnlyCommand } from '../ssh/client.js';
import { asText, commandResultToText } from './format.js';

async function run(serverId: ServerId, command: string) {
  const result = await runReadOnlyCommand(serverId, command);
  return asText(commandResultToText(result));
}

export function registerReadOnlyTools(server: McpServer): void {
  server.tool('ping', 'Vérifie que le MCP WealthTech SSH Bridge répond.', {}, async () => asText('wealthtech_ssh_bridge_ok'));

  server.tool('get_project_context', 'Retourne le contexte projet, les serveurs et les domaines protégés.', {}, async () => asText(JSON.stringify({
    name: 'wealthtech_ssh_bridge',
    mode: 'read-only-first',
    servers: managedServers
  }, null, 2)));

  server.tool('check_disk_s1', 'Affiche df -h sur S1.', {}, async () => run('s1', 'df -h'));
  server.tool('check_disk_s2', 'Affiche df -h sur S2.', {}, async () => run('s2', 'df -h'));

  server.tool('pm2_status_s1', 'Affiche pm2 list sur S1.', {}, async () => run('s1', 'pm2 list'));
  server.tool('pm2_status_s2', 'Affiche pm2 list sur S2.', {}, async () => run('s2', 'pm2 list'));

  server.tool('docker_status_s1', 'Liste les conteneurs Docker actifs sur S1.', {}, async () => run('s1', 'docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"'));
  server.tool('docker_status_s2', 'Liste les conteneurs Docker actifs sur S2.', {}, async () => run('s2', 'docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"'));

  server.tool('list_domains_s1', 'Inventaire read-only des domaines Plesk/vhosts S1.', {}, async () => run('s1', 'find /var/www/vhosts -maxdepth 2 -type d -printf "%TY-%Tm-%Td %TH:%TM %p\\n" 2>/dev/null | sort | head -300'));
  server.tool('list_domains_s2', 'Inventaire read-only des domaines Plesk/vhosts S2.', {}, async () => run('s2', 'find /var/www/vhosts -maxdepth 2 -type d -printf "%TY-%Tm-%Td %TH:%TM %p\\n" 2>/dev/null | sort | head -300'));

  server.tool('list_large_files_s1', 'Liste les fichiers volumineux sur S1 sans suppression.', {}, async () => run('s1', 'find /var/www/vhosts /var/lib/psa/dumps -type f -size +100M -printf "%s %TY-%Tm-%Td %p\\n" 2>/dev/null | sort -nr | head -200'));
  server.tool('list_large_files_s2', 'Liste les fichiers volumineux sur S2 sans suppression.', {}, async () => run('s2', 'find /var/www/vhosts /var/lib/psa/dumps -type f -size +100M -printf "%s %TY-%Tm-%Td %p\\n" 2>/dev/null | sort -nr | head -200'));

  server.tool('list_backups_s1', 'Liste les sauvegardes potentielles sur S1 sans suppression.', {}, async () => run('s1', 'find /var/lib/psa/dumps /var/www/vhosts -type f \( -name "*.zip" -o -name "*.tar" -o -name "*.tar.gz" -o -name "*.tgz" -o -name "*.gz" -o -name "*.bak" -o -name "*.old" -o -name "*.sql" -o -name "*.dump" \) -printf "%s %TY-%Tm-%Td %p\\n" 2>/dev/null | sort -nr | head -200'));
  server.tool('list_backups_s2', 'Liste les sauvegardes potentielles sur S2 sans suppression.', {}, async () => run('s2', 'find /var/lib/psa/dumps /var/www/vhosts -type f \( -name "*.zip" -o -name "*.tar" -o -name "*.tar.gz" -o -name "*.tgz" -o -name "*.gz" -o -name "*.bak" -o -name "*.old" -o -name "*.sql" -o -name "*.dump" \) -printf "%s %TY-%Tm-%Td %p\\n" 2>/dev/null | sort -nr | head -200'));

  server.tool('curl_domain', 'Exécute un curl -I HTTPS sur un domaine fourni depuis S1.', { domain: z.string().min(3).max(255).regex(/^[a-zA-Z0-9.-]+$/) }, async ({ domain }) => run('s1', `curl -I --max-time 15 https://${domain}`));
}
```

### ./src/tools/writeScoped.ts
```
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { env } from '../config/env.js';
import { runGuardedCommand } from '../ssh/client.js';
import { asText, commandResultToText } from './format.js';
import {
  assertScopedWriteToolsEnabled,
  assertSelectOnlyQuery,
  assertSafeScriptArgs,
  assertWriteFlag,
  scriptArgsRequireWriteApproval
} from '../ssh/writeSafety.js';

const ProjectKeySchema = z.enum(['api_opcv', 'front_end_opcvm', 'brvmchainsolution']);
type ProjectKey = z.infer<typeof ProjectKeySchema>;

const AllowedScriptSchema = z.string()
  .regex(/^scripts\/[A-Za-z0-9_./-]+\.(js|ts)$/, 'Script autorisé uniquement sous scripts/ avec extension .js ou .ts')
  .refine((value) => !value.includes('..') && !value.startsWith('/'), 'Script path interdit hors dépôt');

type AllowedScript = z.infer<typeof AllowedScriptSchema>;

const projects: Record<ProjectKey, { label: string; path: string; note: string }> = {
  api_opcv: {
    label: 'API OPCVM / FundAfrica',
    path: '/var/www/vhosts/chainsolutions.fr/africafunds.chainsolutions.fr/api',
    note: 'Backend OPCVM autorisé pour diagnostics, scripts whitelistés et mise à jour Git contrôlée.'
  },
  front_end_opcvm: {
    label: 'Frontend OPCVM / FundAfrica',
    path: '/var/www/vhosts/chainsolutions.fr/africafunds.chainsolutions.fr/frontend',
    note: 'Frontend OPCVM autorisé pour statut Git, pull contrôlé et build contrôlé.'
  },
  brvmchainsolution: {
    label: 'BRVM Chain Solution',
    path: '/opt/apps/brvmchain/BRVMCHAINSOLUTION',
    note: 'Projet BRVM autorisé pour statut Git, pull contrôlé et déploiement Docker Compose contrôlé.'
  }
};


function inferScriptProject(script: AllowedScript): ProjectKey {
  if (
    script.includes('repair-ost') ||
    script.includes('align-dividend-years') ||
    script.includes('repair-dividends')
  ) {
    return 'brvmchainsolution';
  }

  return 'api_opcv';
}


const scriptsRequiringWriteApproval = new Set<AllowedScript>([
  'scripts/scraper/fix_index_tail.js',
  'scripts/scraper/propagate_indref_range.js',
  'scripts/scraper/scrape_indices_daily.js',
  'scripts/recalc/recalc_eur_usd_daily_rate.js',
  'scripts/repair-ost.ts',
  'scripts/align-dividend-years.ts',
  'scripts/repair-dividends.ts'
]);

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'"'"'`)}'`;
}

function projectFor(project: ProjectKey) {
  return projects[project];
}

function formatProjectCatalog(): string {
  return Object.entries(projects)
    .map(([key, value]) => `${key}: ${value.label}\n  path: ${value.path}\n  note: ${value.note}`)
    .join('\n\n');
}

async function runS2(command: string, intent: string, timeoutMs = 30_000) {
  const result = await runGuardedCommand('s2', command, {
    intent,
    timeoutMs,
    maxOutputBytes: 200_000
  });
  return asText(commandResultToText(result));
}

function buildGitStatusCommand(project: ProjectKey): string {
  const config = projectFor(project);
  return `set -euo pipefail
cd ${shellQuote(config.path)}
printf 'Projet: ${config.label}\nChemin: ${config.path}\n\n'
test -d .git
git status -sb
echo
echo 'Branche courante:'
git branch --show-current
echo
echo 'Dernier commit:'
git log -1 --oneline
echo
echo 'Remote:'
git remote -v`;
}

function buildGitPullCommand(project: ProjectKey): string {
  const config = projectFor(project);
  return `set -euo pipefail
cd ${shellQuote(config.path)}
mkdir -p .mcp_logs
LOG_FILE=".mcp_logs/mcp-autonomy-$(date +%Y%m%d).log"
exec > >(tee -a "$LOG_FILE") 2>&1

echo "════════════════════════════════════════"
echo "MCP AUTONOMY — GIT UPDATE"
echo "Projet: ${config.label}"
echo "Chemin: ${config.path}"
echo "Date: $(date -Is)"
echo "════════════════════════════════════════"

test -d .git
git status -sb

CURRENT_BRANCH="$(git branch --show-current)"
echo "Branche courante: $CURRENT_BRANCH"

case "$CURRENT_BRANCH" in
  claude/*|main|master|server|production)
    echo "Branche autorisée: $CURRENT_BRANCH"
    ;;
  *)
    echo "ERREUR: branche non autorisée pour autonomie MCP: $CURRENT_BRANCH"
    exit 13
    ;;
esac

STASH_CREATED=0
if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "Changements suivis détectés: stash automatique avant rebase."
  git stash push -m "mcp-autostash-${config.label}-$(date +%Y%m%d_%H%M%S)"
  STASH_CREATED=1
else
  echo "Aucun changement suivi local à stasher."
fi

git fetch origin --prune
git pull --rebase origin "$CURRENT_BRANCH"

if [ "$STASH_CREATED" = "1" ]; then
  echo "Restauration du stash MCP."
  git stash pop || {
    echo "ERREUR: conflit pendant stash pop. Intervention nécessaire."
    git status -sb
    exit 14
  }
fi

echo
echo "Nouveau dernier commit:"
git log -1 --oneline
```
