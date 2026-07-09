# MCP_REPO_BOOTSTRAP.md

## Rôle
Procédure pour rendre un dépôt compatible MCP.

## Étapes
1. Vérifier owner/repo et branche.
2. Créer ou compléter README.md et SUIVI.md.
3. Créer .mcp/manifest.json, permissions.json, agents.json, server-map.json, onboarding.json si absents.
4. Créer MCP_PROJECT.md, MCP_AGENT_RULES.md, MCP_REPO_INVENTORY.md, MCP_SERVER_MAPPING.md.
5. Créer une branche dédiée.
6. Tester.
7. Ouvrir une PR.
8. Mettre à jour les registres MCP.

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
