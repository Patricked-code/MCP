# AGENTS_ARCHITECTURE.md

## Role
Architecture detaillee des agents IA et MCP.

## Agents
- ChatGPT : supervision, structuration, documentation.
- Claude Code : execution code encadree.
- Codex : branche, tests, PR.
- Agent audit : lecture seule.
- Agent serveur : actions controlees via MCP.
- Agent documentation : suivi, changelog, decisions.

## Regle
Chaque agent doit avoir role, droits, limites, fichiers a lire, fichiers a mettre a jour et boucle de travail.

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
