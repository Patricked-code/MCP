# MCP_ONBOARDING_ENGINE.md

## Rôle
Décrire le moteur d’onboarding MCP pour intégrer un dépôt, un agent, un compte ou un serveur.

## Procédure
1. Identifier owner/repo.
2. Vérifier branche officielle.
3. Vérifier README, SUIVI, .mcp et fichiers MCP.
4. Vérifier droits GitHub et agents.
5. Vérifier mapping serveur.
6. Créer une branche ou PR si nécessaire.
7. Documenter l’onboarding dans SUIVI.md.

## Règle
Aucun onboarding ne doit créer de secret dans Git ni donner de droits implicites.

## États d’onboarding

`non_audite` → `inventorie` → `documentation_preparee` → `permissions_validees` → `pr_ouverte` → `integre` → `serveur_verifie`.

Un état ne progresse qu’avec une preuve datée. Une divergence ramène le projet à l’état approprié et bloque les écritures.

## Inventaire complet

Identifier projet, owner/repo, branche officielle et actives, serveur, chemin, domaine, stack, déploiement, données, variables attendues sans valeurs, crons, logs, tests, Markdown, `.mcp`, agents, permissions, risques et point de reprise.

## Sorties obligatoires

- dossier `docs/projects/<slug>/` consolidé ;
- entrées dans `MCP_REPO_INVENTORY.md`, `MCP_SERVER_MAPPING.md` et `MCP_SERVER_REGISTRY.md` ;
- couche `.mcp` valide ou plan de création ;
- tâche, décision si nécessaire, rapport et point de reprise ;
- branche contrôlée et PR si un changement est requis.

## Gestion des conflits

Ne pas choisir arbitrairement entre GitHub, serveur et historique. Consigner le conflit, établir la source actuelle, demander une validation humaine si l’écart touche production, sécurité ou droits.

## Historique

- 2026-07-13 : ajout des états, preuves et sorties d’onboarding.
