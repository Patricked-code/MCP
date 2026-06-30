# ARCHITECTURE.md — Architecture du MCP WealthTech

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
