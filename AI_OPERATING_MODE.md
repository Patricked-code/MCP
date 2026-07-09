# AI_OPERATING_MODE.md

## Role
Mode operatoire des IA dans le MCP.

## Collaboration
ChatGPT structure, explique et supervise.
Claude Code execute le code lorsque le contexte est clair.
Codex travaille par branche, tests et PR.
Le MCP orchestre l'acces serveur et les actions controlees.

## Boucle
Lire, inventorier, analyser les risques, agir prudemment, tester, documenter, mettre a jour SUIVI.md.

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
