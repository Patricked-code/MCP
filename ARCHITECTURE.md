# ARCHITECTURE.md

## Rôle
Architecture technique globale du MCP WealthTech.

## Architecture connue
- Dépôt attendu : Patricked-code/MCP.
- Chemin serveur : /opt/apps/wealthtech-mcp-ssh-bridge.
- Serveur : S1.
- Couche MCP : .mcp/manifest.json, permissions.json, agents.json, server-map.json, onboarding.json.
- Documentation longue existante : docs/ et memory/.

## À vérifier
Modules TypeScript, routes MCP, outils read-only, outils write-scoped, Docker, reverse proxy, logs, build et stratégie de redémarrage.

## Règle
Toute modification d’architecture doit être documentée dans SUIVI.md, DECISIONS_LOG.md et CHANGELOG.md.
