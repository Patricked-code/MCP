# MCP_SECURITY_MODEL.md

## Accès SSH des repositories gouvernés

Le modèle cible interdit une clé root persistante par repository.

Chaîne autorisée :

`GitHub Actions → OIDC exact repo/ref/workflow → MCP HTTPS → signature de clé publique → certificat SSH <= 10 min → S1 force-command read-only`.

Invariants :
- la clé privée client reste uniquement sur le runner GitHub éphémère ;
- la CA privée reste uniquement sur S1, dans le volume `keys` non versionné ;
- le certificat ne permet ni PTY, ni agent/X11/port forwarding ;
- le `force-command` est dérivé du repository validé et ne contient aucun shell arbitraire ;
- le gateway n'accepte que les commandes de découverte allowlistées ;
- `StrictHostKeyChecking=yes` utilise la clé hôte S1 publique renvoyée par le MCP authentifié ;
- le bootstrap CA exige OIDC MCP exact + `ENABLE_WRITE_TOOLS` + déclenchement manuel ;
- toute écriture métier/serveur reste hors du certificat SSH et passe par les outils MCP scoped-write.

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
