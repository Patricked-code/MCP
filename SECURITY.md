# SECURITY.md

## Role
Politique de securite generale du MCP.

## Regles absolues
- Aucun secret, token, mot de passe, cle privee, fichier .env ou credential ne doit etre ecrit dans Git.
- Toute action serveur sensible exige inventaire, justification et trace dans SUIVI.md.
- Les droits agents doivent etre verifies dans AGENTS.md, MCP_AGENT_RULES.md et .mcp/permissions.json.
- Aucun deploiement, suppression, migration ou modification de production sans procedure dediee.

## A verifier
Fichiers sensibles, tokens MCP, tokens GitHub, cles SSH, variables d'environnement, journaux d'audit et acces serveurs.

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
