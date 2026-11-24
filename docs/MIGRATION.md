# MIGRATION.md — Migrations S2 vers S1

<!-- MCP-DOC-AUTHORITY-MIRROR-20261124 -->
> **Statut documentaire au 24 novembre 2026 — référence de conception initiale, pas un état opérationnel vérifié.** Les informations ci-dessous sont conservées pour leur provenance ; elles ne certifient ni la situation actuelle des outils ni les travaux encore à faire. Pour les références actives concernant **migrations**, commencer par [le document racine](../MIGRATION.md), [les autorités documentaires](../SOURCE_OF_TRUTH.md) et les preuves GitHub/CI. Pour tout état S1/runtime, réobserver le Live State MCP. Ne pas réinterpréter les sections historiques ci-dessous comme des attestations nouvelles.
<!-- /MCP-DOC-AUTHORITY-MIRROR-20261124 -->

## Rôle du MCP

Le MCP doit d’abord inventorier et documenter. Les migrations réelles ne seront ajoutées qu’après validation du mode lecture seule.

## Migrations prévues

- WealthTech : de `wealthtech.chainsolutions.fr` vers `V2.wealthtechinnovations.com`.
- EVOTE : de `evote.chainsolutions.fr` vers `evote.wealthtechinnovations.com`.
- API EVOTE : de `api.evote.chainsolutions.fr` vers `api.evote.wealthtechinnovations.com`.
- Formation : de `itic4fima.chainsolutions.fr` vers `evaluations.wealthtechinnovations.com`.
- API Formation : de `api.itic4fima.chainsolutions.fr` vers `api.evaluations.wealthtechinnovations.com`.
- Stablecoin : copie de `stablecoin.chainsolutions.fr` vers `stablecoin.wealthtechinnovations.com`.
- API Stablecoin : copie de `api.stablecoin.chainsolutions.fr` vers `api.stablecoin.wealthtechinnovations.com`.

## Règle stablecoin

Les applications stablecoin sur S2 ne doivent jamais être supprimées.

## Boucle migration

1. Inventaire.
2. Sauvegarde GitHub.
3. Simulation.
4. Déploiement destination.
5. Tests.
6. Documentation.
7. Nettoyage source uniquement si explicitement autorisé, jamais pour stablecoin.
