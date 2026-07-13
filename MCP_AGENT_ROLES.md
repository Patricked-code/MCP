# MCP_AGENT_ROLES.md

## Rôle
Définir les profils d’agents MCP.

## Profils
- ChatGPT : supervision et structuration.
- Claude Code : exécution code si contexte validé.
- Codex : branche, tests, PR.
- Agent audit : lecture seule.
- Agent serveur : actions contrôlées.
- Agent documentation : suivi et traçabilité.

## Règle
Chaque agent doit avoir rôle, droits, limites, projets autorisés, serveurs autorisés et validation humaine si nécessaire.

## Attributs obligatoires d’un rôle

Identité, finalité, projets, serveurs, outils, lecture, écriture, PR, déploiement, données, chemins interdits, approbateur, durée, audit et révocation.

## Séparation des responsabilités

L’agent qui propose une action sensible ne l’auto-approuve pas. L’audit reste en lecture seule. Le déploiement est distinct de l’édition. La gestion des secrets reste humaine ou confiée à un système dédié hors Git.

## Référence machine

Les capacités actuelles de ChatGPT, Claude et Codex sont dans `.mcp/agents.json`. Les rôles supplémentaires décrits ici ne sont pas actifs tant qu’ils ne sont pas déclarés et approuvés.

## Historique

- 2026-07-13 : ajout des attributs et séparation des responsabilités.
