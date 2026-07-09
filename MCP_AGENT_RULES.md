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

<!-- MCP-GOVERNANCE-MANUAL-REFERENCE -->

## Référence MCP anti-dispersion et manuel complet

Cette documentation renvoie aux fichiers de gouvernance ajoutés :

- MCP_ANTI_DISPERSION_GOVERNANCE.md
- MCP_FUNCTIONS_AND_TOOLS_MANUAL.md
- MCP_FUNCTIONAL_CARTOGRAPHY.md
- MCP_CONNECTION_IDENTITY_MODEL.md
- MCP_INTELLIGENT_USAGE_MODE.md
- .mcp/branch-governance.json
- .mcp/function-cartography.json
- .mcp/identity-policy.json

Règles permanentes :

- pas de travail isolé ;
- pas de push direct sur main ;
- branches MCP sous mcp/* ;
- PR draft obligatoire pour changement significatif ;
- double vérification GitHub vers serveur ;
- documentation dans SUIVI.md ;
- DirtyCount à zéro avant pull, merge, deploy, migration ou nettoyage ;
- non-régression obligatoire.

Mise à jour : 2026-07-09T20:08:09Z
