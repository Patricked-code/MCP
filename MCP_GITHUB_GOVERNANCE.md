# MCP_GITHUB_GOVERNANCE.md

## Rôle
Gouvernance GitHub via MCP.

## Règles
- Dépôt attendu : Patricked-code/MCP.
- Branche officielle : main.
- Préférer branche dédiée et PR pour changements importants.
- Ne jamais force-push.
- Ne jamais mélanger code applicatif non revu et documentation.
- Documenter changements dans CHANGELOG.md.

## À vérifier
Protection de branche, PR ouvertes, droits GitHub, remotes, statut sync serveur/GitHub.

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
