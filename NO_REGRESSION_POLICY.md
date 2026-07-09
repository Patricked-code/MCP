# NO_REGRESSION_POLICY.md

## Role
Politique anti-regression du MCP.

## Regles
- Ne pas casser une route, un outil, un endpoint ou un service existant.
- Ne pas modifier le code applicatif pendant une passe documentaire.
- Tester avant et apres toute modification technique.
- Conserver un rollback possible.
- Documenter tout risque dans SUIVI.md et CODE_REVIEW.md.

## Controle minimum
Git status, diff, typecheck si code modifie, build si necessaire, logs MCP, verification Docker si deploiement.

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
