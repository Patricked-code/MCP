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
