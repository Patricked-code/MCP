# MCP Repo Inventory

## Organisation cible

`chainsolutions-wealthtech`

## Repos initiaux

- `chainsolutions-wealthtech/MCP`
- `chainsolutions-wealthtech/api`
- `chainsolutions-wealthtech/Front`
- `chainsolutions-wealthtech/Stablecoin`
- `chainsolutions-wealthtech/Investbourse`
- `chainsolutions-wealthtech/civitech-commune-saas`
- `chainsolutions-wealthtech/.github`

## Sources connues

- `Patricked-code`
- `Wealthtechinnovations`

## Prochaine étape

Chaque repo doit recevoir un dossier `.mcp/` avec manifest, permissions, agents, mapping serveur et onboarding.

## Dépôt MCP vérifié au 2026-07-13

| Champ | État |
|---|---|
| Owner/repo | `Patricked-code/MCP` |
| Visibilité | publique |
| Branche par défaut | `main` |
| Remote S1 | dépôt `Patricked-code/MCP` via SSH |
| État S1 | propre, aligné avec `origin/main` au début de l’audit |
| README | présent |
| Documentation racine obligatoire | 48/49 avant cette passe |
| `.mcp/` requis | 5/5 présents |
| Règles agents | présentes |
| Mapping serveur | présent |
| `docs/projects/` | absent avant cette passe |
| Stack | Node.js 20, TypeScript, Express, SDK MCP, Docker Compose |
| Contrôles versionnés | typecheck, build, secrets, documentation |

## Écart documentaire initial

`WEALTHTECH_CODEX_MASTER_INSTRUCTIONS.md` était le seul fichier obligatoire absent. `SUIVI.md` possédait un point de reprise mais pas tous les champs prescrits. Plusieurs documents techniques existaient sous forme très courte. La structure enfant n’existait pas.

## Repos historiques à confirmer

Les repos listés dans « Repos initiaux » sont des cibles historiques. Leur existence, owner actuel, branche, serveur et état MCP doivent être réaudités avant de les déclarer intégrés. La liste ne vaut pas autorisation d’accès ou de migration.

## Commandes de contrôle

Utiliser les scripts versionnés : `npm run typecheck`, `npm run build`, `npm run lint:secrets` et `npm run docs:check`, plus validation JSON et `git diff --check` pour une passe documentaire.

## Maintenance

Mettre à jour ce fichier après changement de branche par défaut, stack, contrôles, couche `.mcp`, projet intégré ou résultat d’audit. Relier chaque entrée réelle à `docs/projects/<slug>/MCP_REPO_INVENTORY.md`.

## Historique

- 2026-07-13 : ajout de l’inventaire vérifié et classement des repos historiques.
