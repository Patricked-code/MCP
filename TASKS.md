# TASKS.md

## Role
Plan operationnel executable du MCP.

## Taches immediates
- TASK-20260709-001 : finaliser les fichiers Markdown racine manquants.
- TASK-20260709-002 : comparer racine, docs/ et memory/ sans ecrasement.
- TASK-20260709-003 : preparer docs/projects/<projet>/ pour les projets integres.
- TASK-20260709-004 : auditer les fichiers .mcp/*.json.
- TASK-20260709-005 : produire un rapport final et commit documentaire.

## Regle
Une tache executable doit indiquer objectif, fichiers concernes, risques, preconditions, tests et resultat attendu.


---

## Règle permanente — double présence, non-régression et amélioration continue

GitHub est la source versionnée.

Le serveur MCP est la source exécutée.

Les deux doivent toujours être vérifiés ensemble avant et après toute intervention.

Aucune IA ne doit supposer que GitHub et le serveur sont synchronisés sans vérification.

Toute intervention humaine, IA ou automatisée doit respecter :

- non-régression obligatoire ;
- amélioration continue obligatoire ;
- aucune suppression destructive sans sauvegarde, justification et validation ;
- aucun secret dans GitHub ;
- vérification GitHub + serveur avant modification ;
- documentation dans `SUIVI.md` après modification ;
- vérification service, logs et endpoints après déploiement.

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

- TASK-20260711-001 : corriger `src/ssh/safety.ts` pour détecter `cp` uniquement comme commande shell autonome.
  - Précondition : partir de `main@f92f621` sur `mcp/hardening-readonly-ci-state-20260711`.
  - Tests : `npm run test:readonly-safety`, `npm run typecheck`, `npm run build`.
- TASK-20260711-002 : ajouter une CI GitHub Actions minimale.
  - Commandes attendues : typecheck, build, docs check, secret scan si présent, test GitHub MCP si présent, test read-only safety, `git diff --check`.
- TASK-20260711-003 : mettre à jour l'état public-safe après le commit direct `f92f621`.
  - Fichiers : `SUIVI.md`, `TASKS.md`, `CHANGELOG.md`, `DECISIONS_LOG.md`, `PRODUCTION_STATE.json`, `MCP_MASTER_REFERENCE.md` brouillon si créé.
- TASK-20260711-004 : préparer une PR draft vers `main`, sans merge, sans rebase PR #10, sans fermeture #2/#3.
