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

## 2026-07-11 -- Phase 2 hardening read-only / CI / state docs

Contexte : l'audit Phase 1 a confirmé `main@f92f621`, 7 PR ouvertes, issues #2/#3 ouvertes, absence de workflow GitHub Actions et un faux positif read-only autour de `cp`.

Décision : ouvrir une branche unique `mcp/hardening-readonly-ci-state-20260711` depuis `main@f92f621` pour corriger les garde-fous read-only, ajouter la CI minimale et actualiser l'état documentaire public-safe avant toute reprise de PR #10.

Décision complémentaire : le commit direct `f92f621` est documenté comme exception historique à tracer, car il inclut OAuth resource aliases et durable accounts. Les futurs changements doivent suivre branche `mcp/*`, PR draft, validations et revue humaine.

Limites : ne pas merger ou rebaser PR #10 dans cette branche ; ne pas fermer #2/#3 ; ne pas supprimer de branche ; ne pas déclencher restart, déploiement, migration ou cleanup ; ne pas publier d'inventaire privé S1/S2.
