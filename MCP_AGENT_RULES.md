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
