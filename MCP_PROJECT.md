# MCP Project — ChainSolutions WealthTech

Ce dépôt contient le serveur MCP WealthTech.

Il sert de pont entre ChatGPT, Claude, Codex, GitHub, S1, S2 et les agents d’audit, migration, documentation et déploiement.

## Organisation GitHub cible

`chainsolutions-wealthtech`

## Objectif prioritaire

Mettre en place le `MCP Onboarding Engine`.

Le moteur doit identifier l’acteur connecté, vérifier les droits GitHub, enregistrer les comptes, inventorier les repos, créer les fichiers `.mcp/`, préparer des branches de configuration, ouvrir des Pull Requests et documenter les mappings serveur.

## Identité vérifiée au 2026-07-13

| Champ | Valeur vérifiée |
|---|---|
| Projet | WealthTech MCP SSH Bridge |
| Dépôt versionné | `Patricked-code/MCP` |
| Branche officielle | `main` |
| Serveur exécuté | S1 |
| Chemin serveur | `/opt/apps/wealthtech-mcp-ssh-bridge` |
| Mode | `read-only-first` |
| Runtime versionné | Node.js 20, TypeScript, Docker Compose |
| Statut d’onboarding du dépôt MCP | initialisé, à compléter documentairement |
| Niveau de risque | élevé pour production/serveur ; modéré pour documentation seule |

GitHub `main` et le checkout S1 ont été vérifiés propres et alignés sur le même commit avant cette branche documentaire.

## Agents autorisés

ChatGPT, Claude et Codex peuvent lire, préparer des branches contrôlées et ouvrir des PR avec approbation humaine. Aucun de ces agents ne peut déployer par défaut. Les capacités exactes sont définies dans `.mcp/agents.json` et les interdictions dans `.mcp/permissions.json`.

## État de l’onboarding

- couche `.mcp` présente et syntaxiquement vérifiable ;
- documentation racine : 48 fichiers obligatoires présents sur 49 avant cette passe ;
- structure enfant `docs/projects/` absente avant cette passe ;
- inventaire des projets de l’organisation : partiel, à vérifier repo par repo ;
- droits réels, protections de branche et mappings des autres projets : à vérifier.

## Critère de fin

L’onboarding global n’est terminé que lorsque le dépôt, le serveur, les permissions, les agents, les registres, les tests et le point de reprise concordent, et qu’une revue humaine valide les écarts restants.

## Historique

- 2026-07-13 : ajout de l’identité et de l’état d’onboarding vérifiés.
