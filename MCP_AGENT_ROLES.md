# MCP_AGENT_ROLES.md

## Rôle
Définir les profils d’agents MCP.

## Profils
- ChatGPT : supervision et structuration.
- Claude Code : exécution code si contexte validé.
- Codex : branche, tests, PR.
- Agent audit : lecture seule.
- Agent serveur : actions contrôlées.
- Agent documentation : suivi et traçabilité.

## Règle
Chaque agent doit avoir rôle, droits, limites, projets autorisés, serveurs autorisés et validation humaine si nécessaire.

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
