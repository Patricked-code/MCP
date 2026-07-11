# DECISIONS_LOG.md

## Role
Journal des decisions structurantes du MCP.

## 2026-07-09 - Documentation racine et logique parent/enfant
Contexte : le MCP doit etre repris par ChatGPT, Claude Code, Codex, le MCP et un humain sans perte de contexte.
Decision : creer les fichiers Markdown racine manquants et utiliser docs/projects/<projet>/ pour la memoire enfant de chaque projet.
Raison : eviter le codage a l'aveugle, les regressions, les oublis et la confusion entre serveur, depot, branche, domaine et agent.
Limite : aucune autorisation de secret, suppression, deploiement ou modification applicative sans audit separe.

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

---

## 2026-07-09 — Décision : intégrer les blockers #2 et #3 dans l’audit PR

### Contexte

Les issues #2 et #3 sont mentionnées par PR #1 et contiennent des blockers structurants qui conditionnent l’intégration de PR #1, PR #4 et PR #5.

### Décision

Créer une synthèse complémentaire dans `mcp/pr-unification-audit-summary-issues` sans merger, fermer ou résoudre #2/#3.

### Raison

#2 bloque la visibilité GitHub/Codex/MCP sur `chainsolutions-wealthtech`.

#3 bloque les actions production/migration tant que l’inventaire privé et l’approbation opérateur ne sont pas disponibles hors Git.

### Impact

- PR #1 ne doit pas être mergée en bloc.
- PR #4 doit être reconstruite depuis `main` comme prochaine branche technique.
- PR #5 doit attendre l’intégration propre des outils GitHub et intégrer les contraintes public-safe.

### Prochaine branche recommandée

`mcp/github-tools-after-governance`

### Limites

Aucun secret, token, `.env`, clé privée, inventaire privé, dump ou fichier `*.merge-tree.txt` ne doit être ajouté.
