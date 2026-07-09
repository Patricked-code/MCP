# MIGRATION.md

## Rôle
Plan de migration MCP et projets intégrés.

## Règles
- Inventaire avant migration.
- Sauvegarde avant action risquée.
- Aucun secret dans Git.
- Mapping serveur obligatoire.
- Rollback documenté.
- SUIVI.md mis à jour avant et après.

## Projets à rattacher progressivement
brvmchain, wealthtech, evote, evaluations, stablecoin, et tout repo ajouté ensuite.

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
