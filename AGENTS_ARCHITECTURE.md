# AGENTS_ARCHITECTURE.md

## Role
Architecture detaillee des agents IA et MCP.

## Agents
- ChatGPT : supervision, structuration, documentation.
- Claude Code : execution code encadree.
- Codex : branche, tests, PR.
- Agent audit : lecture seule.
- Agent serveur : actions controlees via MCP.
- Agent documentation : suivi, changelog, decisions.

## Regle
Chaque agent doit avoir role, droits, limites, fichiers a lire, fichiers a mettre a jour et boucle de travail.

## Flux d’autorité

L’humain approuve les changements sensibles. Les agents lisent d’abord les fichiers de mémoire et la couche `.mcp`. L’agent d’audit produit des preuves en lecture seule. Un agent d’édition peut préparer une branche et une PR. L’agent serveur n’exécute qu’un outil nommé, borné et journalisé. Aucun rôle n’hérite automatiquement du droit de déployer.

## Contrat d’un agent

Chaque entrée doit définir : identité, rôle, projets et serveurs autorisés, niveaux lecture/écriture/déploiement, préconditions, outils, chemins interdits, approbateur, audit et révocation.

## Cohérence machine

`AGENTS.md` décrit le registre humainement lisible. `.mcp/agents.json` déclare les capacités de base. `.mcp/permissions.json` impose les règles transversales. Toute divergence bloque l’écriture et doit être consignée dans `DECISIONS_LOG.md`.

## Historique

- 2026-07-13 : ajout du flux d’autorité et du contrat d’agent.
