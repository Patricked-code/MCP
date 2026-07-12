# TASKS.md

## Role
Plan operationnel executable du MCP.

## Taches immediates
- TASK-20260712-001 — EN ATTENTE : effectuer une nouvelle revue complète de la PR #11 et de sa CI. C'est la seule prochaine action.

## Taches futures separees
- TASK-FUTURE-NODE — PLANIFIEE, NON EXECUTEE : préparer la migration du runtime Node dans une PR dédiée.
- TASK-FUTURE-ACTIONS — PLANIFIEE, NON EXECUTEE : moderniser et épingler les GitHub Actions dans une PR dédiée.

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

- TASK-20260711-001 — TERMINEE SUR BRANCHE, NON FUSIONNEE : corriger `src/ssh/safety.ts` pour détecter `cp` comme commande shell et via les wrappers inventoriés.
  - Précondition : partir de `main@f92f621` sur `mcp/hardening-readonly-ci-state-20260711`.
  - Tests : `npm run test:readonly-safety`, `npm run typecheck`, `npm run build`.
- TASK-20260711-002 — TERMINEE SUR BRANCHE, NON FUSIONNEE : ajouter une CI GitHub Actions minimale.
  - Commandes : typecheck, build, docs check, secret scan, test read-only safety et contrôle effectif base/head. Aucun test GitHub fictif n'est exécuté dans cette PR.
- TASK-20260711-003 — TERMINEE SUR BRANCHE, NON FUSIONNEE : mettre à jour l'état public-safe après le commit direct `f92f621`.
  - Fichiers canoniques : `SUIVI.md`, `TASKS.md`, `CHANGELOG.md`, `DECISIONS_LOG.md`, `PRODUCTION_STATE.json`.
  - `MCP_MASTER_REFERENCE.md` a été retiré pour éviter une source concurrente.
- TASK-20260711-004 — TERMINEE : préparer une PR draft vers `main`, sans merge, sans rebase PR #10, sans fermeture #2/#3.
