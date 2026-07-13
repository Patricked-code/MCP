# MCP_AGENT_RULES.md — Modèle projet

## 1. Rôle du fichier
Définir les droits et limites des agents sur ce projet.

## 2. Objectif
Interdire toute permission implicite.

## 3. Périmètre
Agents, repos, branches, serveurs et outils du projet.

## 4. Source de vérité
`.mcp/agents.json`, `.mcp/permissions.json` et validation humaine ; parent : `/MCP_AGENT_RULES.md`.

## 5. Informations connues
Aucun agent IA ne déploie ou ne lit un secret par défaut.

## 6. Informations à vérifier
Lecture, écriture, PR, déploiement, données, serveurs et approbateurs par agent.

## 7. Règles applicables
Moindre privilège, branche contrôlée, PR et traçabilité obligatoires.

## 8. Procédures
Proposer, revoir, approuver, encoder dans `.mcp/`, tester et journaliser.

## 9. Risques
Droit trop large, divergence Markdown/JSON ou agent non déclaré.

## 10. À maintenir à jour
Rôles, permissions, expirations, exceptions et validations.

## 11. Historique des mises à jour
- `<Date>` : création après revue des droits.
