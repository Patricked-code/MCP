# MCP_AUDIT_LOG_POLICY.md

## Rôle
Politique d’audit log MCP.

## À journaliser
- Connexions agents.
- Actions d’écriture.
- Changements Git.
- Échecs sécurité.
- Déploiements.
- Restarts.
- Scans secrets.
- Décisions humaines.

## Règle
Les logs ne doivent jamais exposer de secret. Les valeurs sensibles doivent être masquées.
