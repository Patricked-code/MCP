# MCP_MASTER_REFERENCE.md — Brouillon public-safe

Statut : brouillon de consolidation, ne remplace pas les sources.
Date : 2026-07-11
Branche de préparation : `mcp/hardening-readonly-ci-state-20260711`

## Rôle

Ce document consolide l'état public-safe du projet MCP `Patricked-code/MCP`. Il cite les fichiers sources, conserve les divergences et marque les informations non confirmées comme `À vérifier`.

## Sources lues ou référencées

- `README.md`, `CLAUDE.md`, `GPT.md`, `CODEX.md`, `AGENTS.md`.
- `SUIVI.md`, `TASKS.md`, `CHANGELOG.md`, `DECISIONS_LOG.md`, `PRODUCTION_STATE.json`.
- `.mcp/manifest.json`, `.mcp/permissions.json`, `.mcp/agents.json`, `.mcp/server-map.json`, `.mcp/branch-governance.json`, `.mcp/function-cartography.json`, `.mcp/identity-policy.json`, `.mcp/onboarding.json`.
- `MCP_ANTI_DISPERSION_GOVERNANCE.md`, `MCP_FUNCTIONS_AND_TOOLS_MANUAL.md`, `MCP_FUNCTIONAL_CARTOGRAPHY.md`, `MCP_CONNECTION_IDENTITY_MODEL.md`, `MCP_INTELLIGENT_USAGE_MODE.md`.
- `docs/GITHUB_AUTO_DISCOVERY.md`, `docs/MCP_GITHUB_GUARDIAN.md`, `docs/OAUTH_CHATGPT_CLAUDE_GITHUB.md`, `docs/MCP_WRITE_TOOLS.md`.
- `Migration/README.md`, `Migration/02_PLAN_MIGRATION_ET_SECURITE.md`.
- `memory/INDEX_MEMOIRE_WEALTHTECH_20260701.md`, `memory/REGISTRE_COMPLET_CORPUS_LOCAL_DOCUMENTS_DOWNLOADS_20260702.md`.

## État vérifié public-safe

- GitHub officiel : `https://github.com/Patricked-code/MCP`.
- Branche stable : `main`.
- Commit courant vérifié : `f92f621fa495d5728df5fb5befcc3265ff3a1302`.
- Serveur exécuté : `/opt/apps/wealthtech-mcp-ssh-bridge` sur S1.
- Conteneur : `wealthtech_mcp_ssh_bridge`, exposé localement sur `127.0.0.1:8787`.
- Domaine MCP : `https://mcp.wealthtechinnovations.com`.
- `/health` public : `200 OK`.
- `/mcp` sans token : `401 Unauthorized`.
- OAuth minimal : actif via endpoints `.well-known` et `/oauth/*`.

## Gouvernance

Les règles convergent sur les points suivants : pas de push direct sur `main`, branche `mcp/*` pour changement structurant, PR draft, double vérification GitHub + serveur, pas de secret dans Git, pas d'action production sans inventaire privé, backup, rollback et validation opérateur.

## Contradictions et divergences conservées

- `docs/OAUTH_CHATGPT_CLAUDE_GITHUB.md` contenait un état historique indiquant OAuth non implémenté ; l'état vérifié 2026-07-11 montre OAuth minimal actif.
- `docs/GITHUB_AUTO_DISCOVERY.md` contenait une procédure historique `git push origin main` ; elle est obsolète depuis la gouvernance anti-dispersion.
- `SUIVI.md` et `PRODUCTION_STATE.json` citaient encore des commits historiques (`4619588`, `fbc7c97`, `4ae1124`) comme derniers repères ; l'état courant vérifié est `f92f621`.
- `.mcp/branch-governance.json` indique encore une branche de travail historique. À vérifier avant une mise à jour `.mcp`, hors de cette passe limitée si validation humaine requise.
- L'audit GitHub a vu 7 PR ouvertes, alors que certains messages de reprise parlaient de 6 PR.

## Commit direct `main` à tracer

Le commit `f92f621 fix(oauth): accept Claude and ChatGPT MCP resource aliases` contient aussi `MCP_DURABLE_ACCOUNT_MANAGEMENT.md` et `src/tools/durableAccounts.ts`. Il semble être arrivé sur `main` sans PR visible pendant l'audit courant. Cette exception ne doit pas être répétée.

## PR, issues et blockers

- PR #10 reste à traiter après cette passe : elle devra être rebasée ou reconstruite sur `main@f92f621` en conservant durableAccounts.
- Issue #2 reste ouverte : autorisation/visibilité GitHub/Codex/MCP pour `chainsolutions-wealthtech`.
- Issue #3 reste ouverte : inventaire privé, backup, rollback et validation opérateur avant action production.

## Phase 2 autorisée

- Corriger le faux positif read-only `cp`.
- Ajouter les tests dédiés.
- Ajouter CI minimale.
- Actualiser uniquement l'état documentaire public-safe.
- Ne pas modifier `main`, ne pas merger PR #10, ne pas fermer #2/#3, ne pas supprimer de branche, ne pas redémarrer, ne pas déployer.

## À vérifier

- Protection GitHub réelle de `main` après ajout CI.
- Stratégie de rebase ou reconstruction de PR #10 après cette PR.
- Mise à jour éventuelle de `.mcp/branch-governance.json` si validation humaine l'autorise.
- Réduction de l'exposition publique de champs comme `writeToolsEnabled` et `githubOrg` sur `/health`, si jugée nécessaire.
