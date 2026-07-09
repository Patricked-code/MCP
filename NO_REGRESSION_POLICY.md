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
