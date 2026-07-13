# PROJECT_SCOPE.md

## Role
Perimetre du MCP.

## Inclus
- Depot Patricked-code/MCP.
- Serveur /opt/apps/wealthtech-mcp-ssh-bridge.
- Documentation racine, docs/, memory/ et .mcp/.
- Gouvernance agents, GitHub, serveur et projets integres.

## Exclus sans validation
Secrets, suppressions, deploiements, migrations de production, modifications applicatives non auditees.

## Soumis à validation explicite

Changement d’agent ou permission, nouvel outil d’écriture, mapping serveur, intégration d’un repo, action sur domaine protégé, données, déploiement, restart, rollback et merge.

## Frontières

La documentation globale décrit la gouvernance du MCP. Les faits propres à un projet appartiennent à `docs/projects/<slug>/`. Les fichiers `memory/` restent historiques et ne remplacent pas l’état actuel vérifié.

## Critère d’acceptation

Une action reste dans le périmètre si son dépôt, sa branche, ses fichiers, son serveur, ses outils, ses permissions et ses tests sont explicitement identifiés.

## Historique

- 2026-07-13 : ajout des validations et frontières de documentation.
