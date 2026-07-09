# MCP Server Mapping

## S1

- IP : `212.227.212.33`
- MCP : `/opt/apps/wealthtech-mcp-ssh-bridge`
- Domaine MCP : `https://mcp.wealthtechinnovations.com`

## S2

- IP : `217.160.249.254`

## Règle

Toute migration doit passer par inventaire, sauvegarde ou GitHub, branche dédiée, déploiement contrôlé, vérification HTTP/API/logs et documentation.

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
