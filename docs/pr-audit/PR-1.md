# PR #1 — lecture issue-aware

Ce fichier ne remplace pas l’audit détaillé de la PR #1 dans la PR #8.

Il complète l’analyse avec les blockers #2 et #3.

## Décision

PR #1 ne doit pas être mergée en bloc.

## Pourquoi

- PR #1 est volumineuse et historique.
- Elle contient des éléments utiles de migration, onboarding, gates et operator actions.
- Elle dépend de #2 pour l’accès organisation GitHub/Codex/MCP.
- Elle dépend de #3 pour les actions serveur, inventaire privé et approbation opérateur.

## À faire avant toute reprise de PR #1

- Extraire les éléments en sous-PR thématiques.
- Ne reprendre aucun fichier `.mcp` qui écrase la gouvernance de PR #6.
- Ne reprendre aucun inventaire privé dans Git.
- Ne déclencher aucune action production.
