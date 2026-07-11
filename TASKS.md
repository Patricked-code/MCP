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

---

## 2026-07-09 — Tâches complémentaires blockers #2 #3

- [ ] Relire `docs/pr-audit/ISSUE-2.md`.
- [ ] Relire `docs/pr-audit/ISSUE-3.md`.
- [ ] Relire `docs/pr-audit/BLOCKERS-2-3.md`.
- [ ] Vérifier que #2 reste ouvert jusqu’à validation runtime MCP de la visibilité `chainsolutions-wealthtech`.
- [ ] Vérifier que #3 reste ouvert jusqu’à preuve privée hors Git : inventaire, backup, rollback, approbation opérateur.
- [ ] Préparer `mcp/github-tools-after-governance` depuis `main`.
- [ ] Reprendre uniquement les outils GitHub MCP contrôlés de PR #4.
- [ ] Ne pas reprendre les fichiers `.mcp` historiques de PR #1/#4 s’ils écrasent la gouvernance de PR #6.
- [ ] Ne pas déclencher d’action production tant que #3 est ouvert.
