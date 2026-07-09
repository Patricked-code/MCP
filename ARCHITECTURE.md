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


---

## Règle permanente — double présence, non-régression et amélioration continue

GitHub est la source versionnée.

Le serveur MCP est la source exécutée.

Les deux doivent toujours être vérifiés ensemble avant et après toute intervention.

Aucune IA ne doit supposer que GitHub et le serveur sont synchronisés sans vérification.

Toute intervention humaine, IA ou automatisée doit respecter :

- non-régression obligatoire ;
- amélioration continue obligatoire ;
- aucune suppression destructive sans sauvegarde, justification et validation ;
- aucun secret dans GitHub ;
- vérification GitHub + serveur avant modification ;
- documentation dans `SUIVI.md` après modification ;
- vérification service, logs et endpoints après déploiement.
