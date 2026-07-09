# MCP Agent Rules

## Agents connus

- ChatGPT : supervision, architecture, documentation, orchestration.
- Claude : développement, correction, analyse de code.
- Codex : édition technique, branches, tests, PR.
- Agent serveur : diagnostic S1/S2.
- Agent audit : vérification sécurité et non-régression.
- Agent déploiement : actions contrôlées uniquement.

## Règles obligatoires

- Aucun agent ne pousse directement sur `main` sauf validation explicite.
- Les agents travaillent sur branches dédiées : `chatgpt/`, `claude/`, `codex/`, `agent/`, `mcp/`.
- Les secrets ne doivent jamais être lus, affichés ou committés.
- Les actions serveur destructives sont interdites sans inventaire et validation.

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
