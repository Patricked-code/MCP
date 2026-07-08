# MCP Code Inventory Safe

Date: 2026-07-08T17:56:27+00:00
Host: crazy-mendel
Path: /opt/apps/wealthtech-mcp-ssh-bridge

## Git status
```
## main...origin/main [ahead 2]
?? docs/reports/
?? memory/CHAINSOLUTIONS_WEALTHTECH_TARGET_ORG_20260708_044836.md
?? package-lock.json
```

## Branch
```
main
```

## Last commits
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

## Project stack
```
v14.21.3
6.14.18
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

## Useful source tree
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
./docs/reports/MCP_CODE_INVENTORY_SAFE_20260708_175627.md
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

## Source files to inspect first

- src/server.ts
- src/tools/readOnly.ts
- src/tools/writeScoped.ts
- src/config/servers.ts
- src/ssh/safety.ts
- src/ssh/writeSafety.ts
- src/github/connection.ts
- src/github/registry.ts

## Next MCP evolution target

Add a controlled self-management project named mcp_bridge with read, patch, diff, test, build and deploy tools.
