# DECISIONS_LOG.md

## Role
Journal des decisions structurantes du MCP.

## 2026-07-09 - Documentation racine et logique parent/enfant
Contexte : le MCP doit etre repris par ChatGPT, Claude Code, Codex, le MCP et un humain sans perte de contexte.
Decision : creer les fichiers Markdown racine manquants et utiliser docs/projects/<projet>/ pour la memoire enfant de chaque projet.
Raison : eviter le codage a l'aveugle, les regressions, les oublis et la confusion entre serveur, depot, branche, domaine et agent.
Limite : aucune autorisation de secret, suppression, deploiement ou modification applicative sans audit separe.

## 2026-07-13 — Branche isolée et modèle non spéculatif

Contexte : le checkout local actif appartenait à une autre branche de conversation, alors que S1 et GitHub `main` étaient alignés sur `f92f621`.

Décision : créer `mcp/documentation-bootstrap-20260713` depuis `origin/main` dans un worktree isolé. Ne pas modifier le checkout existant, `main`, S1 ou le code applicatif.

Décision : créer un seul modèle complet dans `docs/projects/_template/` au lieu de dossiers réels pour `brvmchain`, `wealthtech`, `evote`, `evaluations` et `stablecoin`. Ces noms restent des candidats historiques jusqu’à un audit repo/serveur.

Décision : ne pas modifier les JSON `.mcp` pendant cette passe ; ils sont présents et valides syntaxiquement, et une extension non testée du schéma pourrait casser un consommateur.

Validation requise : revue humaine avant commit, push, PR, merge ou synchronisation serveur.

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
