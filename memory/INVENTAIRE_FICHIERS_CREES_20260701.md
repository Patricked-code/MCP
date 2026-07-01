# INVENTAIRE_FICHIERS_CREES_20260701.md

Date UTC : 2026-07-01
Perimetre : `/root/wealthtech_project_memory/memory/`
But : analyser les fichiers crees/synchronises aujourd'hui et les classer par usage.

## Resume

La synchronisation automatique a installe la memoire MCP dans le dossier cible serveur.

Etat detecte :

- Dossier cible : `/root/wealthtech_project_memory/memory/`
- Derniere sync connue : `20260701-044501`
- Commit MCP synchronise : `a89153315f1dcf5484051176e386bf7c0ba51139`
- Rapport de changements : `/root/wealthtech_project_memory/logs/mcp-memory-changes-20260701-044501.md`
- Changement detecte dans le dernier rapport : non.

## Fichiers de conversation et memoire narrative

- `WEALTHTECH_CONVERSATION_COMPILED.md`
- `CONVERSATION_COMPILED_INDEX_2026-07-01.md`
- `CONVERSATION_PART_01_MCP_SERVERS_MIGRATION_2026-07-01.md`
- `CONVERSATION_PART_02_ECOSYSTEM_LOOP_ENGINEERING_2026-07-01.md`
- `CONVERSATION_PART_03_EWARI_KOREE_STABLECOIN_2026-07-01.md`
- `2026-05-05-stablecoin-ewari-conversation-memory.md`
- `CONVERSATION_20260701_LOOP_ENGINEERING.md`

## Fichiers de reprise et suivi

- `README.md`
- `SUIVI.md`
- `SUIVI_MEMORY.md`
- `CODEX_AUTO_ANALYSIS_REQUEST.md`
- `CODEX_AUTO_ANALYSIS_RESPONSE_20260701.md`
- `LOOPBACK_WEALTHTECH_CURRENT.md`

## Fichiers de methode et loop engineering

- `GPT.md`
- `LOOP_ENGINEERING_WEALTHTECH_20260701.md`
- `RUNBOOK_GLOBAL_REVIEW_S1_S2_2026-07-01.md`
- `AUDIT_GLOBAL_S1_S2_MCP_PROMPT.md`

## Fichiers Stablecoin

- `CODEX_HANDOFF_STABLECOIN_EWARI.md`
- `PROMPT_AUDIT_6BI_B.md`

## Fichiers OPCVM / FundAfrica

- `WEALTHTECH_PROJECT_MEMORY.md`
- `PROMPT_AUDIT_OPCVM_SANS_REGRESSION.md`

## Fichiers installation/synchronisation

- `MCP_INSTALLATION_AND_SERVER_SYNC_2026-07-01.md`
- `INSTALL_MCP_WEALTHTECH_MEMORY.md`
- `INSTALLATION_MCP_WEALTHTECH.md`
- `INSTALL_ON_WEALTHTECH_SERVER.md`
- `manifest.json`

## Classement par priorite

Priorite P0 :

- `CODEX_AUTO_ANALYSIS_REQUEST.md`
- `SUIVI_MEMORY.md`
- `LOOPBACK_WEALTHTECH_CURRENT.md`
- `INDEX_MEMOIRE_WEALTHTECH_20260701.md`

Priorite P1 :

- `WEALTHTECH_CONVERSATION_COMPILED.md`
- `WEALTHTECH_PROJECT_MEMORY.md`
- `2026-05-05-stablecoin-ewari-conversation-memory.md`
- `CODEX_HANDOFF_STABLECOIN_EWARI.md`
- `PROMPT_AUDIT_6BI_B.md`

Priorite P2 :

- `AUDIT_GLOBAL_S1_S2_MCP_PROMPT.md`
- `PROMPT_AUDIT_OPCVM_SANS_REGRESSION.md`
- fichiers d'installation et runbooks.

## Risques

- La synchro automatique peut ecraser les fichiers du dossier cible si les nouveaux fichiers ne sont pas aussi presents dans la source MCP.
- Les operations dangereuses restent interdites sans validation explicite.
- Le lien ChatGPT partage n'a pas encore ete importe en contenu complet.
- Les informations d'acces ou secrets ne doivent pas etre ajoutees a ces fichiers.

## Decision

Les nouveaux fichiers de cette boucle doivent etre copies a la fois dans :

- `/root/wealthtech_project_memory/memory/`
- `/opt/apps/wealthtech-mcp-ssh-bridge/memory/`

Le commit/push GitHub reste a valider explicitement si l'on veut rendre ces ajouts persistants dans `Patricked-code/MCP`.
