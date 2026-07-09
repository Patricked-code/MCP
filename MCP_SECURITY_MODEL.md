# MCP_SECURITY_MODEL.md

## Rôle
Modèle de sécurité propre au MCP.

## Règles
- Tokens hors Git.
- Secrets masqués dans logs.
- Écriture contrôlée seulement.
- Pas de push force.
- Pas de déploiement sans rôle.
- Pas de suppression sans inventaire.
- Actions sensibles journalisées.

## À vérifier
Stockage réel des tokens, audit logs, RBAC, expiration des accès et séparation lecture/écriture/admin.
