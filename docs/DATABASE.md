# DATABASE.md — Données et bases

## État actuel

Le MCP ne gère pas encore directement les bases de données. Il doit d’abord inventorier les bases via des outils read-only futurs.

## Objectif futur

Préparer l’écosystème WealthTech unifié autour de :

- MySQL pour les données transactionnelles ;
- ClickHouse pour les logs, analytics, historiques lourds et reporting ;
- Redis pour cache et files de jobs.

## Règles

- Ne jamais supprimer une base sans inventaire et sauvegarde.
- Ne jamais exporter de dump sensible vers GitHub.
- Documenter toute base liée à S1 ou S2.
