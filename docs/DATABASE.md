# DATABASE.md — Données et bases

<!-- MCP-DOC-AUTHORITY-MIRROR-20261124 -->
> **Statut documentaire au 24 novembre 2026 — référence de conception initiale, pas un état opérationnel vérifié.** Les informations ci-dessous sont conservées pour leur provenance ; elles ne certifient ni la situation actuelle des outils ni les travaux encore à faire. Pour les références actives concernant **bases de données**, commencer par [le document racine](../DATABASE.md), [les autorités documentaires](../SOURCE_OF_TRUTH.md) et les preuves GitHub/CI. Pour tout état S1/runtime, réobserver le Live State MCP. Ne pas réinterpréter les sections historiques ci-dessous comme des attestations nouvelles.
<!-- /MCP-DOC-AUTHORITY-MIRROR-20261124 -->

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
