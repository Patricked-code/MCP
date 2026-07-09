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

---

<!-- MCP-SAFE-BOOTSTRAP:NO-REGRESSION -->

## Gouvernance permanente MCP — sans régression

GitHub est la source versionnée.

Le serveur MCP est la source exécutée.

Les deux doivent toujours être vérifiés ensemble.

Règles permanentes :

- conserver l’existant ;
- compléter sans écraser ;
- créer uniquement les fichiers manquants ;
- ne jamais écrire de secret, token, mot de passe, clé privée ou variable sensible ;
- travailler sans régression ;
- chercher l’amélioration continue ;
- documenter toute modification dans `SUIVI.md` ;
- inscrire `À vérifier` lorsque l’information n’est pas confirmée.

Références :

- dépôt : `Patricked-code/MCP` ;
- branche officielle : `main` ;
- serveur : `/opt/apps/wealthtech-mcp-ssh-bridge` ;
- domaine : `https://mcp.wealthtechinnovations.com`.

Ajout vérifié le 2026-07-09T18:47:20Z.
