# MCP_PERMISSIONS_MODEL.md

## Rôle
Modèle de permissions MCP.

## Niveaux
- read_only
- documentation_write
- scoped_code_write
- deploy_controlled
- admin_human_only

## Règles
Les permissions doivent être explicites, minimales, traçables et révocables. Toute permission dangereuse demande validation humaine.

## Matrice des niveaux

| Niveau | Capacité | Validation humaine |
|---|---|---|
| `read_only` | inventaire et diagnostic masqué | non, sauf données restreintes |
| `documentation_write` | Markdown autorisé sur branche contrôlée | revue PR |
| `scoped_code_write` | code explicitement borné et testé | revue PR obligatoire |
| `deploy_controlled` | action de déploiement nommée | approbation avant exécution |
| `admin_human_only` | secrets, droits, opérations destructives | exécution humaine habilitée |

## Résolution des conflits

Appliquer la permission la plus restrictive entre demande, rôle, fichier Markdown, JSON `.mcp`, outil et état serveur. Toute exception est temporaire, datée, approuvée, journalisée et révocable.

## Revue

Réviser à chaque nouvel agent, outil, projet, serveur ou incident, puis tester un cas autorisé et un cas refusé.

## Historique

- 2026-07-13 : ajout de la matrice et de la règle de conflit.
