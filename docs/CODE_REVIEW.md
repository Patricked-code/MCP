# CODE_REVIEW.md — Revue du code

## État initial

Le dépôt vient d’être initialisé. Aucune revue runtime n’a encore été exécutée sur une machine Node.js.

## Points à vérifier

- Compatibilité exacte avec la version installée de `@modelcontextprotocol/sdk`.
- Signature de `server.tool`.
- Signature de `StreamableHTTPServerTransport`.
- Gestion des sessions HTTP MCP.
- Robustesse du client SSH.
- Qualité du filtrage read-only.
- Journalisation sans fuite de secrets.

## Risques connus

- Un garde-fou par filtrage de chaînes ne suffit pas pour des outils sensibles ; les futures actions sensibles devront être implémentées comme outils spécialisés, jamais comme shell libre.
- Les clés SSH doivent être dédiées et stockées hors Git.
- Le MCP doit rester accessible uniquement en HTTPS et avec token.

## Décision actuelle

Valider d’abord le mode lecture seule avant d’ajouter toute action de migration ou de nettoyage actif.
