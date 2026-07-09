# SOURCE_OF_TRUTH.md

## Role
Registre des sources de verite du MCP.

## Ordre de priorite
1. Etat reel serveur et Git.
2. Fichiers .mcp/*.json pour la couche MCP.
3. SUIVI.md pour le point de reprise.
4. MCP_REPO_INVENTORY.md pour le depot.
5. MCP_SERVER_MAPPING.md pour le mapping serveur.
6. docs/ et memory/ pour historique et contexte.

## Regle
En cas de contradiction, documenter le conflit dans DECISIONS_LOG.md avant action.

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
