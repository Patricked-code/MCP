# MONITORING.md — Observabilité

<!-- MCP-DOC-AUTHORITY-MIRROR-20261124 -->
> **Statut documentaire au 24 novembre 2026 — référence de conception initiale, pas un état opérationnel vérifié.** Les informations ci-dessous sont conservées pour leur provenance ; elles ne certifient ni la situation actuelle des outils ni les travaux encore à faire. Pour les références actives concernant **observabilité**, commencer par [le document racine](../MONITORING.md), [les autorités documentaires](../SOURCE_OF_TRUTH.md) et les preuves GitHub/CI. Pour tout état S1/runtime, réobserver le Live State MCP. Ne pas réinterpréter les sections historiques ci-dessous comme des attestations nouvelles.
<!-- /MCP-DOC-AUTHORITY-MIRROR-20261124 -->

## Objectif

Suivre l’état du MCP et des opérations read-only réalisées sur S1/S2.

## À surveiller

- disponibilité `/health` ;
- erreurs MCP ;
- erreurs SSH ;
- latence des outils ;
- refus d’authentification ;
- volume des logs ;
- espace disque serveur ;
- disponibilité des domaines protégés.

## Journalisation

Les logs doivent masquer les secrets et indiquer le serveur cible, l’outil appelé et le résultat.
