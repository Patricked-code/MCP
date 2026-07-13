# MCP_REPO_BOOTSTRAP.md

## Rôle
Procédure pour rendre un dépôt compatible MCP.

## Étapes
1. Vérifier owner/repo et branche.
2. Créer ou compléter README.md et SUIVI.md.
3. Créer .mcp/manifest.json, permissions.json, agents.json, server-map.json, onboarding.json si absents.
4. Créer MCP_PROJECT.md, MCP_AGENT_RULES.md, MCP_REPO_INVENTORY.md, MCP_SERVER_MAPPING.md.
5. Créer une branche dédiée.
6. Tester.
7. Ouvrir une PR.
8. Mettre à jour les registres MCP.

## Checklist de sortie

- owner/repo, branche et remote vérifiés ;
- documentation existante lue et conservée ;
- `SUIVI.md` avec point de reprise complet ;
- `.mcp/manifest.json`, `permissions.json`, `agents.json`, `server-map.json` et `onboarding.json` valides ;
- dossier `docs/projects/<slug>/` consolidé ;
- trois registres globaux mis à jour ;
- aucun secret ou chemin interdit ajouté ;
- tests et validation JSON réussis ;
- branche contrôlée, commit factuel et PR draft ;
- merge et déploiement laissés à une validation distincte.

## Stratégie de fusion

Ne jamais recopier aveuglément le modèle. Comparer chaque fichier existant, conserver l’historique utile, marquer l’obsolète à confirmer et ouvrir une décision pour toute contradiction sensible.

## Échec ou reprise

Si une preuve manque, garder l’état `à vérifier`, inscrire le blocage dans `SUIVI.md` et ne pas attribuer de droit ni de mapping implicite.

## Historique

- 2026-07-13 : ajout de la checklist de sortie et de la stratégie de fusion.
