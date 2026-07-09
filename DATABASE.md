# DATABASE.md

## Rôle
Documentation des bases de données liées au MCP et aux projets intégrés.

## Règles
- Aucune migration SQL sans sauvegarde et validation.
- SQL autorisé uniquement en lecture lorsque l’outil MCP l’impose.
- Ne jamais écrire de credentials DB dans Git.
- Documenter tables, schémas, migrations, sauvegardes et risques.

## À vérifier
Bases réellement utilisées par le MCP, bases des projets intégrés, scripts de migration, dumps, restauration et politiques de rétention.

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
