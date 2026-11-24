# ARCHITECTURE.md — Architecture du MCP WealthTech

<!-- MCP-DOC-AUTHORITY-MIRROR-20261124 -->
> **Statut documentaire au 24 novembre 2026 — référence de conception initiale, pas un état opérationnel vérifié.** Les informations ci-dessous sont conservées pour leur provenance ; elles ne certifient ni la situation actuelle des outils ni les travaux encore à faire. Pour les références actives concernant **architecture du MCP**, commencer par [le document racine](../ARCHITECTURE.md), [les autorités documentaires](../SOURCE_OF_TRUTH.md) et les preuves GitHub/CI. Pour tout état S1/runtime, réobserver le Live State MCP. Ne pas réinterpréter les sections historiques ci-dessous comme des attestations nouvelles.
<!-- /MCP-DOC-AUTHORITY-MIRROR-20261124 -->

## Vue d’ensemble

Le MCP `wealthtech_ssh_bridge` agit comme passerelle contrôlée entre ChatGPT/Codex et les serveurs S1/S2.

Flux logique : ChatGPT appelle une URL MCP HTTPS, le service MCP valide l’accès, puis exécute uniquement les outils autorisés vers S1 ou S2.

## Principes

- Exposer des outils nommés, pas un shell libre.
- Journaliser chaque action.
- Valider les entrées.
- Démarrer en lecture seule.
- Protéger les domaines critiques.

## Modules techniques

- `src/config` : environnement et serveurs.
- `src/auth` : authentification bearer token.
- `src/ssh` : client SSH et garde-fous.
- `src/tools` : outils MCP.
- `src/server.ts` : serveur MCP HTTP.

## Évolution cible

Après validation du mode read-only, ajouter des outils de documentation, de dry-run migration, puis seulement des outils sensibles avec confirmation explicite.
